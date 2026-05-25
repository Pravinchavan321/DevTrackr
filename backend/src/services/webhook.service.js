import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Repository from '../models/Repository.model.js';
import Commit from '../models/Commit.model.js';
import PullRequest from '../models/PullRequest.model.js';
import Issue from '../models/Issue.model.js';
import AIInsight from '../models/AIInsight.model.js';
import WebhookEvent from '../models/WebhookEvent.model.js';
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

const getWebhookSecret = () => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError('GitHub webhook secret is not configured', 500);
  }
  return secret;
};

export const verifyGitHubSignature = ({ rawBody, signatureHeader }) => {
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    return false;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', getWebhookSecret())
    .update(rawBody)
    .digest('hex')}`;

  const actual = Buffer.from(signatureHeader, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
};

const normalizeRepositoryPayload = (repository) => {
  if (!repository) return null;
  return {
    id: repository.id,
    name: repository.name,
    full_name: repository.full_name,
    description: repository.description || '',
    private: repository.private || false,
    default_branch: repository.default_branch || 'main',
    language: repository.language || null,
    stargazers_count: repository.stargazers_count || 0,
    forks_count: repository.forks_count || 0,
    open_issues_count: repository.open_issues_count || 0,
    html_url: repository.html_url || ''
  };
};

const findTrackedRepositories = async (repositoryPayload) => {
  if (!repositoryPayload) return [];

  const repoGithubId = repositoryPayload.id;
  const repoFullName = repositoryPayload.full_name;

  if (repoGithubId) {
    return Repository.find({ githubRepoId: repoGithubId });
  }

  if (repoFullName) {
    return Repository.find({ fullName: repoFullName });
  }

  return [];
};

const touchTrackedRepositories = async (repositories, repositoryPayload, eventTime) => {
  const normalizedRepository = normalizeRepositoryPayload(repositoryPayload);

  await Promise.all(
    repositories.map((repo) => {
      const update = {
        lastWebhookEventAt: eventTime
      };

      if (normalizedRepository) {
        Object.assign(update, mapper.mapRepository(normalizedRepository, repo.userId));
      }

      return Repository.updateOne(
        { _id: repo._id },
        {
          $set: update,
          $inc: { webhookEventCount: 1 }
        }
      );
    })
  );
};

const invalidateInsightsForRepositories = async (repoIds) => {
  const ids = [...repoIds].filter(Boolean);
  if (!ids.length) return 0;

  const result = await AIInsight.deleteMany({
    repoId: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }
  });

  return result.deletedCount || 0;
};

const mapWebhookCommit = (commit, repoId, payload) => {
  const changedFiles = new Set([
    ...(commit.added || []),
    ...(commit.removed || []),
    ...(commit.modified || [])
  ]);

  return {
    repoId,
    sha: commit.id || commit.sha,
    message: commit.message || '',
    author: {
      name: commit.author?.name || commit.committer?.name || payload.pusher?.name || '',
      email: commit.author?.email || commit.committer?.email || payload.pusher?.email || '',
      login: commit.author?.username || commit.committer?.username || payload.sender?.login || '',
      avatarUrl: payload.sender?.avatar_url || ''
    },
    additions: 0,
    deletions: 0,
    filesChanged: changedFiles.size,
    committedAt: commit.timestamp ? new Date(commit.timestamp) : new Date(),
    url: commit.url || ''
  };
};

const processPushEvent = async (payload) => {
  const eventTime = new Date();
  const repositories = await findTrackedRepositories(payload.repository);
  const repoIds = new Set(repositories.map((repo) => repo._id.toString()));

  if (!repositories.length) {
    return {
      status: 'ignored',
      ignoredReason: 'Repository is not synced in DevTrackr yet',
      repositoriesUpdated: 0,
      commitsUpserted: 0,
      insightsInvalidated: 0
    };
  }

  await touchTrackedRepositories(repositories, payload.repository, eventTime);

  if (payload.deleted) {
    const insightsInvalidated = await invalidateInsightsForRepositories(repoIds);
    return {
      status: 'processed',
      repositoriesUpdated: repositories.length,
      commitsUpserted: 0,
      insightsInvalidated,
      note: 'Branch deletion event received'
    };
  }

  const commits = payload.commits || [];
  let commitsUpserted = 0;

  for (const repo of repositories) {
    const operations = commits
      .filter((commit) => commit.id || commit.sha)
      .map((commit) => {
        const mappedCommit = mapWebhookCommit(commit, repo._id, payload);
        return {
          updateOne: {
            filter: { repoId: repo._id, sha: mappedCommit.sha },
            update: { $set: mappedCommit },
            upsert: true
          }
        };
      });

    if (operations.length) {
      const result = await Commit.bulkWrite(operations);
      commitsUpserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }
  }

  const insightsInvalidated = await invalidateInsightsForRepositories(repoIds);

  return {
    status: 'processed',
    repositoriesUpdated: repositories.length,
    commitsUpserted,
    insightsInvalidated
  };
};

const processPullRequestEvent = async (payload, eventName) => {
  const eventTime = new Date();
  const repositories = await findTrackedRepositories(payload.repository);
  const repoIds = new Set(repositories.map((repo) => repo._id.toString()));

  if (!repositories.length) {
    return {
      status: 'ignored',
      ignoredReason: 'Repository is not synced in DevTrackr yet',
      repositoriesUpdated: 0,
      pullRequestsUpserted: 0,
      insightsInvalidated: 0
    };
  }

  await touchTrackedRepositories(repositories, payload.repository, eventTime);

  if (!payload.pull_request) {
    return {
      status: 'ignored',
      ignoredReason: 'Pull request payload is missing',
      repositoriesUpdated: repositories.length,
      pullRequestsUpserted: 0,
      insightsInvalidated: 0
    };
  }

  let pullRequestsUpserted = 0;

  for (const repo of repositories) {
    const mappedPR = mapper.mapPullRequest(payload.pull_request, repo._id);
    const update = { $set: mappedPR };

    if (eventName === 'pull_request_review' && payload.review?.user?.login) {
      update.$addToSet = {
        reviewers: {
          login: payload.review.user.login,
          avatarUrl: payload.review.user.avatar_url || '',
          state: payload.review.state || '',
          submittedAt: payload.review.submitted_at ? new Date(payload.review.submitted_at) : eventTime
        }
      };
    }

    const result = await PullRequest.updateOne(
      { repoId: repo._id, number: mappedPR.number },
      update,
      { upsert: true }
    );

    pullRequestsUpserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);
  }

  const insightsInvalidated = await invalidateInsightsForRepositories(repoIds);

  return {
    status: 'processed',
    repositoriesUpdated: repositories.length,
    pullRequestsUpserted,
    insightsInvalidated
  };
};

const processIssuesEvent = async (payload) => {
  const eventTime = new Date();
  const repositories = await findTrackedRepositories(payload.repository);
  const repoIds = new Set(repositories.map((repo) => repo._id.toString()));

  if (!repositories.length) {
    return {
      status: 'ignored',
      ignoredReason: 'Repository is not synced in DevTrackr yet',
      repositoriesUpdated: 0,
      issuesUpserted: 0,
      insightsInvalidated: 0
    };
  }

  await touchTrackedRepositories(repositories, payload.repository, eventTime);

  if (!payload.issue || payload.issue.pull_request) {
    return {
      status: 'ignored',
      ignoredReason: 'Issue payload is missing or represents a pull request',
      repositoriesUpdated: repositories.length,
      issuesUpserted: 0,
      insightsInvalidated: 0
    };
  }

  let issuesUpserted = 0;

  for (const repo of repositories) {
    const mappedIssue = mapper.mapIssue(payload.issue, repo._id);

    if (payload.action === 'deleted') {
      const result = await Issue.deleteOne({ repoId: repo._id, number: mappedIssue.number });
      issuesUpserted += result.deletedCount || 0;
      continue;
    }

    const result = await Issue.updateOne(
      { repoId: repo._id, number: mappedIssue.number },
      { $set: mappedIssue },
      { upsert: true }
    );

    issuesUpserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);
  }

  const insightsInvalidated = await invalidateInsightsForRepositories(repoIds);

  return {
    status: 'processed',
    repositoriesUpdated: repositories.length,
    issuesUpserted,
    insightsInvalidated
  };
};

const processRepositoryEvent = async (payload) => {
  const eventTime = new Date();
  const repositories = await findTrackedRepositories(payload.repository);

  if (!repositories.length) {
    return {
      status: 'ignored',
      ignoredReason: 'Repository is not synced in DevTrackr yet',
      repositoriesUpdated: 0
    };
  }

  await touchTrackedRepositories(repositories, payload.repository, eventTime);

  return {
    status: 'processed',
    repositoriesUpdated: repositories.length
  };
};

const processSupportedEvent = async (event, payload) => {
  switch (event) {
    case 'ping':
      return {
        status: 'processed',
        repositoriesUpdated: 0,
        message: 'Webhook ping received'
      };
    case 'push':
      return processPushEvent(payload);
    case 'pull_request':
    case 'pull_request_review':
      return processPullRequestEvent(payload, event);
    case 'issues':
      return processIssuesEvent(payload);
    case 'repository':
      return processRepositoryEvent(payload);
    default:
      return {
        status: 'ignored',
        ignoredReason: `Unsupported GitHub webhook event: ${event}`,
        repositoriesUpdated: 0
      };
  }
};

export const handleGitHubWebhook = async ({ event, deliveryId, payload }) => {
  if (!event) {
    throw new AppError('GitHub event header is required', 400);
  }

  if (!deliveryId) {
    throw new AppError('GitHub delivery header is required', 400);
  }

  const repoFullName = payload?.repository?.full_name || '';
  const repoGithubId = payload?.repository?.id || null;
  const action = payload?.action || '';

  const existingEvent = await WebhookEvent.findOne({ deliveryId }).lean();
  if (existingEvent) {
    return {
      duplicate: true,
      event: existingEvent.event,
      action: existingEvent.action,
      status: existingEvent.status,
      summary: existingEvent.summary,
      processedAt: existingEvent.processedAt
    };
  }

  const webhookEvent = await WebhookEvent.create({
    deliveryId,
    event,
    action,
    repoFullName,
    repoGithubId,
    status: 'processing'
  });

  try {
    const summary = await processSupportedEvent(event, payload);
    webhookEvent.status = summary.status;
    webhookEvent.summary = summary;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    logger.info('GitHub webhook processed', {
      deliveryId,
      event,
      action,
      repoFullName,
      status: summary.status
    });

    return {
      duplicate: false,
      event,
      action,
      ...summary
    };
  } catch (error) {
    webhookEvent.status = 'failed';
    webhookEvent.error = error.message;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    logger.error('GitHub webhook failed', {
      deliveryId,
      event,
      action,
      repoFullName,
      error: error.message
    });

    throw error;
  }
};

export { AppError };
