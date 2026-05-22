import { Octokit } from '@octokit/rest';
import User from '../models/User.model.js';
import Repository from '../models/Repository.model.js';
import Commit from '../models/Commit.model.js';
import PullRequest from '../models/PullRequest.model.js';
import Issue from '../models/Issue.model.js';
import { decrypt } from '../utils/encryptionHelper.js';
import * as mapper from '../utils/githubDataMapper.js';
import logger from '../config/logger.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validates the repository full name format (owner/repo).
 * @param {string} repoFullName
 * @returns {object} { owner, repo }
 */
const validateRepoFullName = (repoFullName) => {
  if (typeof repoFullName !== 'string') {
    throw new AppError('Invalid repository full name', 400);
  }

  const trimmed = repoFullName.trim();
  const parts = trimmed.split('/');

  if (parts.length !== 2) {
    throw new AppError('Invalid repository full name', 400);
  }

  const [owner, repo] = parts.map((p) => p.trim());

  if (!owner || !repo) {
    throw new AppError('Invalid repository full name', 400);
  }

  return { owner, repo };
};

/**
 * Syncs repository metadata, commits, pull requests, and issues from GitHub.
 * @param {string} userId - ID of the logged-in user
 * @param {string} repoFullName - Fully qualified repo name (owner/repo)
 * @returns {Promise<object>} Sync summary
 */
export const syncRepository = async (userId, repoFullName) => {
  // 1. Validate repoFullName
  const { owner, repo } = validateRepoFullName(repoFullName);

  // 2. Fetch user and retrieve encrypted access token
  const user = await User.findById(userId).select('+githubAccessToken');
  if (!user || !user.githubConnected || !user.githubAccessToken) {
    throw new AppError('Please connect GitHub first', 403);
  }

  // 3. Decrypt GitHub access token
  let decryptedToken;
  try {
    decryptedToken = decrypt(user.githubAccessToken);
  } catch (error) {
    logger.error('Failed to decrypt user GitHub access token', { userId, error: error.message });
    throw new AppError('Failed to decrypt GitHub credentials. Please reconnect GitHub.', 500);
  }

  // 4. Create Octokit client instance
  const octokit = new Octokit({ auth: decryptedToken });

  let rateLimitRemaining = null;

  // Helper to extract rate limit headers
  const updateRateLimit = (response) => {
    if (response?.headers && response.headers['x-ratelimit-remaining']) {
      const remaining = Number(response.headers['x-ratelimit-remaining']);
      if (!isNaN(remaining)) {
        if (rateLimitRemaining === null || remaining < rateLimitRemaining) {
          rateLimitRemaining = remaining;
        }
      }
    }
  };

  // 5. Fetch repository metadata
  let githubRepo;
  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    githubRepo = response.data;
    updateRateLimit(response);
  } catch (error) {
    logger.error('GitHub API error fetching repo metadata', { owner, repo, error: error.message });
    if (error.status === 404) {
      throw new AppError('GitHub repository not found', 404);
    }
    if (error.status === 401 || error.status === 403) {
      throw new AppError('GitHub API authentication failure', error.status);
    }
    throw new AppError(`GitHub API Error: ${error.message}`, error.status || 500);
  }

  // 6. Capture original lastSyncedAt date for incremental sync
  const existingRepo = await Repository.findOne({ userId, githubRepoId: githubRepo.id });
  const sinceDate = existingRepo?.lastSyncedAt ? existingRepo.lastSyncedAt.toISOString() : null;

  // 7. Upsert repository details
  const mappedRepo = mapper.mapRepository(githubRepo, userId);
  const repository = await Repository.findOneAndUpdate(
    { userId, githubRepoId: githubRepo.id },
    { ...mappedRepo, userId },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // 8. Fetch and save commits (incremental sync if sinceDate is set)
  let commitsSyncedCount = 0;
  try {
    const listCommitsParams = {
      owner,
      repo,
      per_page: 30
    };
    if (sinceDate) {
      listCommitsParams.since = sinceDate;
    }

    const commitsResponse = await octokit.rest.repos.listCommits(listCommitsParams);
    updateRateLimit(commitsResponse);

    const rawCommits = commitsResponse.data || [];
    const commitOps = [];

    for (const rawCommit of rawCommits) {
      let commitDetails = null;

      // Fetch stats for each commit with graceful try-catch fallback
      try {
        const detailsResponse = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: rawCommit.sha
        });
        commitDetails = detailsResponse.data;
        updateRateLimit(detailsResponse);
      } catch (error) {
        logger.warn('Failed to fetch commit stats details', {
          sha: rawCommit.sha,
          error: error.message
        });
        // Continue syncing with fallback basic commit info
      }

      const mappedCommit = mapper.mapCommit(rawCommit, repository._id, commitDetails);
      commitOps.push({
        updateOne: {
          filter: { repoId: repository._id, sha: mappedCommit.sha },
          update: { $set: mappedCommit },
          upsert: true
        }
      });
    }

    if (commitOps.length > 0) {
      const bulkWriteResult = await Commit.bulkWrite(commitOps);
      commitsSyncedCount = bulkWriteResult.upsertedCount + bulkWriteResult.modifiedCount;
    }
  } catch (error) {
    logger.error('Error syncing commits from GitHub', { owner, repo, error: error.message });
    throw new AppError(`Commits sync error: ${error.message}`, error.status || 500);
  }

  // 9. Fetch and save pull requests
  let prsSyncedCount = 0;
  try {
    const pullsResponse = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'all',
      per_page: 30
    });
    updateRateLimit(pullsResponse);

    const rawPRs = pullsResponse.data || [];
    const prOps = [];

    for (const rawPR of rawPRs) {
      const mappedPR = mapper.mapPullRequest(rawPR, repository._id);
      prOps.push({
        updateOne: {
          filter: { repoId: repository._id, number: mappedPR.number },
          update: { $set: mappedPR },
          upsert: true
        }
      });
    }

    if (prOps.length > 0) {
      const bulkWriteResult = await PullRequest.bulkWrite(prOps);
      prsSyncedCount = bulkWriteResult.upsertedCount + bulkWriteResult.modifiedCount;
    }
  } catch (error) {
    logger.error('Error syncing pull requests from GitHub', { owner, repo, error: error.message });
    throw new AppError(`Pull requests sync error: ${error.message}`, error.status || 500);
  }

  // 10. Fetch and save issues (excluding Pull Requests)
  let issuesSyncedCount = 0;
  try {
    const issuesResponse = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 30
    });
    updateRateLimit(issuesResponse);

    const rawIssues = issuesResponse.data || [];
    const issueOps = [];

    for (const rawIssue of rawIssues) {
      // Exclude Pull Requests from the Issue table
      if (rawIssue.pull_request) {
        continue;
      }

      const mappedIssue = mapper.mapIssue(rawIssue, repository._id);
      issueOps.push({
        updateOne: {
          filter: { repoId: repository._id, number: mappedIssue.number },
          update: { $set: mappedIssue },
          upsert: true
        }
      });
    }

    if (issueOps.length > 0) {
      const bulkWriteResult = await Issue.bulkWrite(issueOps);
      issuesSyncedCount = bulkWriteResult.upsertedCount + bulkWriteResult.modifiedCount;
    }
  } catch (error) {
    logger.error('Error syncing issues from GitHub', { owner, repo, error: error.message });
    throw new AppError(`Issues sync error: ${error.message}`, error.status || 500);
  }

  // 11. Update Repository lastSyncedAt after complete successful sync
  repository.lastSyncedAt = new Date();
  await repository.save();

  // 12. Determine rate limit warning
  let warning = null;
  if (rateLimitRemaining !== null && rateLimitRemaining < 100) {
    warning = `GitHub API rate limit is low. Remaining requests: ${rateLimitRemaining}`;
  }

  return {
    repository: {
      id: repository._id,
      githubRepoId: repository.githubRepoId,
      name: repository.name,
      fullName: repository.fullName,
      lastSyncedAt: repository.lastSyncedAt
    },
    summary: {
      commitsSynced: commitsSyncedCount,
      pullRequestsSynced: prsSyncedCount,
      issuesSynced: issuesSyncedCount
    },
    warning
  };
};
