import mongoose from 'mongoose';
import Repository from '../models/Repository.model.js';
import Commit from '../models/Commit.model.js';
import PullRequest from '../models/PullRequest.model.js';
import Issue from '../models/Issue.model.js';
import AIInsight from '../models/AIInsight.model.js';
import * as geminiService from './gemini.service.js';
import { verifyRepositoryAccess } from './analytics.service.js';
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
 * Validates and parses from/to date query/body parameters.
 */
const parseDateRange = (fromStr, toStr) => {
  let from = null;
  let to = null;

  if (fromStr) {
    from = new Date(fromStr);
    if (isNaN(from.getTime())) {
      throw new AppError('Invalid from date format', 400);
    }
  }

  if (toStr) {
    to = new Date(toStr);
    if (isNaN(to.getTime())) {
      throw new AppError('Invalid to date format', 400);
    }
  }

  if (from && to && from > to) {
    throw new AppError('from date cannot be after to date', 400);
  }

  // Reasonable defaults: if missing, default to last 30 days
  if (!from) {
    from = new Date();
    from.setDate(from.getDate() - 30);
  }
  if (!to) {
    to = new Date();
  }

  // Set start of day for 'from' and end of day for 'to' for robust filtering
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);

  return { from, to };
};

/**
 * Checks cache for existing insight of same type and period.
 */
const getCachedInsight = async (repoId, userId, type, period = null) => {
  const query = {
    repoId: new mongoose.Types.ObjectId(repoId),
    userId: new mongoose.Types.ObjectId(userId),
    type,
    expiresAt: { $gt: new Date() }
  };

  if (period) {
    query['period.from'] = period.from;
    query['period.to'] = period.to;
  }

  return await AIInsight.findOne(query).lean();
};

/**
 * Saves a newly generated AI insight to the database.
 */
const saveInsight = async (repoId, userId, type, parsedData, period = null) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Upsert to prevent duplicate cache entries of same type/period
  const filter = {
    repoId: new mongoose.Types.ObjectId(repoId),
    userId: new mongoose.Types.ObjectId(userId),
    type
  };
  if (period) {
    filter['period.from'] = period.from;
    filter['period.to'] = period.to;
  }

  const update = {
    repoId: new mongoose.Types.ObjectId(repoId),
    userId: new mongoose.Types.ObjectId(userId),
    type,
    period: period ? { from: period.from, to: period.to } : undefined,
    parsedData,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    expiresAt,
    generatedAt: new Date()
  };

  return await AIInsight.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true
  }).lean();
};

/**
 * Generates Sprint Summary.
 */
export const generateSprintSummary = async (repoId, userId, options = {}) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const { from, to } = parseDateRange(options.from, options.to);
  const force = options.force === true || options.force === 'true';

  if (!force) {
    const cached = await getCachedInsight(repoId, userId, 'sprint_summary', { from, to });
    if (cached) {
      return {
        type: 'sprint_summary',
        cached: true,
        parsedData: cached.parsedData,
        generatedAt: cached.generatedAt
      };
    }
  }

  // Gather database metrics filtered by date range
  const [commits, totalPRs, openIssues, closedIssues] = await Promise.all([
    Commit.find({
      repoId: new mongoose.Types.ObjectId(repoId),
      committedAt: { $gte: from, $lte: to }
    }).lean(),
    PullRequest.countDocuments({
      repoId: new mongoose.Types.ObjectId(repoId),
      githubCreatedAt: { $gte: from, $lte: to }
    }),
    Issue.countDocuments({
      repoId: new mongoose.Types.ObjectId(repoId),
      state: 'open',
      githubCreatedAt: { $gte: from, $lte: to }
    }),
    Issue.countDocuments({
      repoId: new mongoose.Types.ObjectId(repoId),
      state: 'closed',
      githubCreatedAt: { $gte: from, $lte: to }
    })
  ]);

  const inputData = {
    repoName: repo.fullName,
    commits,
    totalPRs,
    openIssues,
    closedIssues,
    period: { from, to }
  };

  const parsedData = await geminiService.generateSprintSummary(inputData);
  const saved = await saveInsight(repoId, userId, 'sprint_summary', parsedData, { from, to });

  return {
    type: 'sprint_summary',
    cached: false,
    parsedData: saved.parsedData,
    generatedAt: saved.generatedAt
  };
};

/**
 * Generates Bottleneck Detection.
 */
export const generateBottleneckAnalysis = async (repoId, userId, options = {}) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const force = options.force === true || options.force === 'true';

  if (!force) {
    const cached = await getCachedInsight(repoId, userId, 'bottleneck');
    if (cached) {
      return {
        type: 'bottleneck',
        cached: true,
        parsedData: cached.parsedData,
        generatedAt: cached.generatedAt
      };
    }
  }

  // Calculate merge time and long-running open PRs / Issues
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [prStats, stalePRsCount, staleIssuesCount, totalCommits, commits] = await Promise.all([
    PullRequest.aggregate([
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
    ]),
    PullRequest.countDocuments({
      repoId: new mongoose.Types.ObjectId(repoId),
      state: 'open',
      githubCreatedAt: { $lt: sevenDaysAgo }
    }),
    Issue.countDocuments({
      repoId: new mongoose.Types.ObjectId(repoId),
      state: 'open',
      githubCreatedAt: { $lt: thirtyDaysAgo }
    }),
    Commit.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId) }),
    Commit.find({ repoId: new mongoose.Types.ObjectId(repoId) }).lean()
  ]);

  const avgMergeTimeHours = prStats.length > 0 ? prStats[0].avgDuration : 0;

  // Workload skew computation: see percentage of commits by top contributor
  let workloadSkew = 'No significant skew detected.';
  if (commits.length > 0) {
    const authorCommits = {};
    commits.forEach(c => {
      const author = c.author?.login || c.author?.name || 'unknown';
      authorCommits[author] = (authorCommits[author] || 0) + 1;
    });
    const sorted = Object.entries(authorCommits).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const topAuthor = sorted[0][0];
      const topCommits = sorted[0][1];
      const percent = Math.round((topCommits / totalCommits) * 100);
      workloadSkew = `Top contributor '${topAuthor}' handles ${percent}% of commits (${topCommits}/${totalCommits}).`;
    }
  }

  const inputData = {
    repoName: repo.fullName,
    avgMergeTimeHours,
    stalePRsCount,
    staleIssuesCount,
    workloadSkew
  };

  const parsedData = await geminiService.generateBottleneckAnalysis(inputData);
  const saved = await saveInsight(repoId, userId, 'bottleneck', parsedData);

  return {
    type: 'bottleneck',
    cached: false,
    parsedData: saved.parsedData,
    generatedAt: saved.generatedAt
  };
};

/**
 * Generates Contributor Analysis.
 */
export const generateContributorAnalysis = async (repoId, userId, options = {}) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const force = options.force === true || options.force === 'true';

  if (!force) {
    const cached = await getCachedInsight(repoId, userId, 'contributor_analysis');
    if (cached) {
      return {
        type: 'contributor_analysis',
        cached: true,
        parsedData: cached.parsedData,
        generatedAt: cached.generatedAt
      };
    }
  }

  // Group commits by contributor
  const contributors = await Commit.aggregate([
    { $match: { repoId: new mongoose.Types.ObjectId(repoId) } },
    {
      $group: {
        _id: {
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
        login: { $first: '$author.login' },
        name: { $first: '$author.name' },
        email: { $first: '$author.email' },
        totalCommits: { $sum: 1 },
        additions: { $sum: { $ifNull: ['$additions', 0] } },
        deletions: { $sum: { $ifNull: ['$deletions', 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        login: { $ifNull: ['$login', '$_id'] },
        name: { $ifNull: ['$name', '$_id'] },
        totalCommits: 1,
        additions: 1,
        deletions: 1
      }
    },
    { $sort: { totalCommits: -1 } }
  ]);

  const inputData = {
    repoName: repo.fullName,
    contributors
  };

  const parsedData = await geminiService.generateContributorAnalysis(inputData);
  const saved = await saveInsight(repoId, userId, 'contributor_analysis', parsedData);

  return {
    type: 'contributor_analysis',
    cached: false,
    parsedData: saved.parsedData,
    generatedAt: saved.generatedAt
  };
};

/**
 * Generates prioritzation recommendations.
 */
export const generateRecommendations = async (repoId, userId, options = {}) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const force = options.force === true || options.force === 'true';

  if (!force) {
    const cached = await getCachedInsight(repoId, userId, 'recommendations');
    if (cached) {
      return {
        type: 'recommendations',
        cached: true,
        parsedData: cached.parsedData,
        generatedAt: cached.generatedAt
      };
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [openIssuesCount, staleIssuesCount, openPRsCount, stalePRsCount, prStats] = await Promise.all([
    Issue.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId), state: 'open' }),
    Issue.countDocuments({
      repoId: new mongoose.Types.ObjectId(repoId),
      state: 'open',
      githubCreatedAt: { $lt: thirtyDaysAgo }
    }),
    PullRequest.countDocuments({ repoId: new mongoose.Types.ObjectId(repoId), state: 'open' }),
    PullRequest.countDocuments({
      repoId: new mongoose.Types.ObjectId(repoId),
      state: 'open',
      githubCreatedAt: { $lt: sevenDaysAgo }
    }),
    PullRequest.aggregate([
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
    ])
  ]);

  const avgMergeTimeHours = prStats.length > 0 ? prStats[0].avgDuration : 0;
  const bottleneckRisk = avgMergeTimeHours > 48 || stalePRsCount > 5 ? 'high' : (avgMergeTimeHours > 24 || stalePRsCount > 2 ? 'medium' : 'low');

  const inputData = {
    repoName: repo.fullName,
    openIssuesCount,
    staleIssuesCount,
    bottleneckRisk,
    openPRsCount
  };

  const parsedData = await geminiService.generateRecommendations(inputData);
  const saved = await saveInsight(repoId, userId, 'recommendations', parsedData);

  return {
    type: 'recommendations',
    cached: false,
    parsedData: saved.parsedData,
    generatedAt: saved.generatedAt
  };
};

/**
 * Returns all cached insights for a repository.
 */
export const getInsights = async (repoId, userId) => {
  await verifyRepositoryAccess(repoId, userId);

  return await AIInsight.find({
    repoId: new mongoose.Types.ObjectId(repoId),
    userId: new mongoose.Types.ObjectId(userId),
    expiresAt: { $gt: new Date() }
  })
    .sort({ generatedAt: -1 })
    .lean();
};
export { parseDateRange };
