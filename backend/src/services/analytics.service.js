import mongoose from 'mongoose';
import Repository from '../models/Repository.model.js';
import Commit from '../models/Commit.model.js';
import PullRequest from '../models/PullRequest.model.js';
import Issue from '../models/Issue.model.js';

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Verifies repository ownership and validates the repository ID format.
 * @param {string} repoId
 * @param {string} userId
 * @returns {Promise<object>} The repository document
 */
export const verifyRepositoryAccess = async (repoId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(repoId)) {
    throw new AppError('Invalid repository ID format', 400);
  }

  const repo = await Repository.findById(repoId).lean();
  if (!repo) {
    throw new AppError('Repository not found', 404);
  }

  if (repo.userId.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to access this repository', 403);
  }

  return repo;
};

/**
 * Parses and validates page and limit parameters.
 * @param {object} query
 * @returns {object} { page, limit }
 */
const parsePagination = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = 1;
  }
  if (isNaN(limit) || limit < 1) {
    limit = 10;
  }
  if (limit > 100) {
    limit = 100;
  }

  return { page, limit };
};

/**
 * Fetches paginated commits for a repository.
 */
export const getCommits = async (repoId, userId, query) => {
  await verifyRepositoryAccess(repoId, userId);
  const { page, limit } = parsePagination(query);

  const filter = { repoId: new mongoose.Types.ObjectId(repoId) };
  const total = await Commit.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  const commits = await Commit.find(filter)
    .sort({ committedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    commits,
    total,
    page,
    limit,
    totalPages
  };
};

/**
 * Fetches grouped commit activity for charts.
 */
export const getCommitChart = async (repoId, userId, query) => {
  await verifyRepositoryAccess(repoId, userId);

  const groupBy = query.groupBy || 'day';
  let format = '';

  if (groupBy === 'day') {
    format = '%Y-%m-%d';
  } else if (groupBy === 'week') {
    format = '%Y-W%V';
  } else {
    throw new AppError("Invalid groupBy parameter. Supported values: 'day', 'week'", 400);
  }

  const pipeline = [
    { $match: { repoId: new mongoose.Types.ObjectId(repoId) } },
    {
      $project: {
        dateStr: {
          $dateToString: {
            format: format,
            date: '$committedAt',
            timezone: 'UTC'
          }
        },
        additions: { $ifNull: ['$additions', 0] },
        deletions: { $ifNull: ['$deletions', 0] }
      }
    },
    {
      $group: {
        _id: '$dateStr',
        count: { $sum: 1 },
        additions: { $sum: '$additions' },
        deletions: { $sum: '$deletions' }
      }
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1,
        additions: 1,
        deletions: 1
      }
    },
    { $sort: { date: 1 } }
  ];

  return await Commit.aggregate(pipeline);
};

/**
 * Fetches contributor statistics based on commits.
 */
export const getContributors = async (repoId, userId) => {
  await verifyRepositoryAccess(repoId, userId);

  const pipeline = [
    { $match: { repoId: new mongoose.Types.ObjectId(repoId) } },
    {
      $project: {
        identity: {
          $cond: {
            if: { $and: [{ $ne: ['$author.login', ''] }, { $ne: ['$author.login', null] }] },
            then: '$author.login',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$author.email', ''] }, { $ne: ['$author.email', null] }] },
                then: '$author.email',
                else: { $ifNull: ['$author.name', 'Unknown'] }
              }
            }
          }
        },
        author: 1,
        additions: { $ifNull: ['$additions', 0] },
        deletions: { $ifNull: ['$deletions', 0] },
        filesChanged: { $ifNull: ['$filesChanged', 0] },
        committedAt: 1
      }
    },
    {
      $group: {
        _id: '$identity',
        login: { $first: '$author.login' },
        name: { $first: '$author.name' },
        avatarUrl: { $first: '$author.avatarUrl' },
        email: { $first: '$author.email' },
        totalCommits: { $sum: 1 },
        additions: { $sum: '$additions' },
        deletions: { $sum: '$deletions' },
        filesChanged: { $sum: '$filesChanged' },
        lastCommitAt: { $max: '$committedAt' }
      }
    },
    {
      $project: {
        _id: 0,
        login: {
          $cond: {
            if: { $and: [{ $ne: ['$login', ''] }, { $ne: ['$login', null] }] },
            then: '$login',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$email', ''] }, { $ne: ['$email', null] }] },
                then: '$email',
                else: { $ifNull: ['$name', 'Unknown'] }
              }
            }
          }
        },
        name: {
          $cond: {
            if: { $and: [{ $ne: ['$name', ''] }, { $ne: ['$name', null] }] },
            then: '$name',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$login', ''] }, { $ne: ['$login', null] }] },
                then: '$login',
                else: { $ifNull: ['$email', 'Unknown'] }
              }
            }
          }
        },
        avatarUrl: { $ifNull: ['$avatarUrl', ''] },
        totalCommits: 1,
        additions: 1,
        deletions: 1,
        filesChanged: 1,
        lastCommitAt: 1
      }
    },
    { $sort: { totalCommits: -1 } }
  ];

  return await Commit.aggregate(pipeline);
};

/**
 * Fetches paginated pull requests.
 */
export const getPullRequests = async (repoId, userId, query) => {
  await verifyRepositoryAccess(repoId, userId);
  const { page, limit } = parsePagination(query);

  const state = query.state || 'all';
  const filter = { repoId: new mongoose.Types.ObjectId(repoId) };

  if (state !== 'all') {
    if (state !== 'open' && state !== 'closed') {
      throw new AppError("Invalid state parameter. Supported values: 'open', 'closed', 'all'", 400);
    }
    filter.state = state;
  }

  const total = await PullRequest.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  const prs = await PullRequest.find(filter)
    .sort({ githubCreatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const pullRequests = prs.map((pr) => {
    let mergeTimeHours = null;
    if (pr.mergedAt && pr.githubCreatedAt) {
      const diffMs = new Date(pr.mergedAt) - new Date(pr.githubCreatedAt);
      mergeTimeHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }
    return {
      ...pr,
      mergeTimeHours
    };
  });

  return {
    pullRequests,
    total,
    page,
    limit,
    totalPages
  };
};

/**
 * Fetches paginated issues and open/closed summary.
 */
export const getIssues = async (repoId, userId, query) => {
  await verifyRepositoryAccess(repoId, userId);
  const { page, limit } = parsePagination(query);

  const state = query.state || 'all';
  const filter = { repoId: new mongoose.Types.ObjectId(repoId) };

  if (state !== 'all') {
    if (state !== 'open' && state !== 'closed') {
      throw new AppError("Invalid state parameter. Supported values: 'open', 'closed', 'all'", 400);
    }
    filter.state = state;
  }

  const [openCount, closedCount, total, issues] = await Promise.all([
    Issue.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId), state: 'open' }),
    Issue.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId), state: 'closed' }),
    Issue.countDocuments(filter),
    Issue.find(filter)
      .sort({ githubCreatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    issues,
    summary: {
      open: openCount,
      closed: closedCount
    },
    total,
    page,
    limit,
    totalPages
  };
};

/**
 * Fetches engineering velocity metrics.
 */
export const getVelocity = async (repoId, userId) => {
  await verifyRepositoryAccess(repoId, userId);

  const [totalCommits, totalPRs, mergedPRs, openIssues, closedIssues] = await Promise.all([
    Commit.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId) }),
    PullRequest.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId) }),
    PullRequest.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId), mergedAt: { $ne: null } }),
    Issue.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId), state: 'open' }),
    Issue.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId), state: 'closed' })
  ]);

  // avgMergeTimeHours = average mergedAt - GitHub created date for merged PRs
  const prStats = await PullRequest.aggregate([
    { $match: { repoId: new mongoose.Types.ObjectId(repoId), mergedAt: { $ne: null } } },
    {
      $project: {
        durationHours: {
          $divide: [
            { $subtract: ['$mergedAt', '$githubCreatedAt'] },
            1000 * 60 * 60
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$durationHours' }
      }
    }
  ]);

  const avgMergeTimeHours = prStats.length > 0 ? Math.round(prStats[0].avgDuration * 100) / 100 : 0;

  // prMergeRate = mergedPRs / totalPRs * 100
  const prMergeRate = totalPRs > 0 ? Math.round((mergedPRs / totalPRs * 100) * 100) / 100 : 0;

  // commitsPerDay = totalCommits / active days between first and last commit
  const minMaxCommits = await Commit.aggregate([
    { $match: { repoId: new mongoose.Types.ObjectId(repoId) } },
    {
      $group: {
        _id: null,
        earliest: { $min: '$committedAt' },
        latest: { $max: '$committedAt' }
      }
    }
  ]);

  let commitsPerDay = 0;
  if (minMaxCommits.length > 0 && totalCommits > 0) {
    const earliest = new Date(minMaxCommits[0].earliest);
    const latest = new Date(minMaxCommits[0].latest);
    const diffMs = latest.getTime() - earliest.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const activeDays = diffDays < 1 ? 1 : Math.ceil(diffDays);
    commitsPerDay = Math.round((totalCommits / activeDays) * 100) / 100;
  }

  return {
    avgMergeTimeHours,
    commitsPerDay,
    prMergeRate,
    totalCommits,
    totalPRs,
    mergedPRs,
    openIssues,
    closedIssues
  };
};
