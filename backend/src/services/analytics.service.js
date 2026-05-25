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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const daysBetween = (fromDate, toDate = new Date()) => {
  if (!fromDate) return null;
  const diffMs = toDate.getTime() - new Date(fromDate).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const getDeploymentFrequencyRating = (deploymentsPerWeek) => {
  if (deploymentsPerWeek >= 7) return 'elite';
  if (deploymentsPerWeek >= 1) return 'high';
  if (deploymentsPerWeek >= 0.25) return 'medium';
  return 'low';
};

const getLeadTimeRating = (leadTimeHours) => {
  if (leadTimeHours <= 24) return 'elite';
  if (leadTimeHours <= 72) return 'high';
  if (leadTimeHours <= 168) return 'medium';
  return 'low';
};

const getHealthStatus = (score) => {
  if (score >= 75) return 'Healthy';
  if (score >= 45) return 'Warning';
  return 'Critical';
};

const createRiskFactor = ({ key, label, severity, impact, value, description }) => ({
  key,
  label,
  severity,
  impact,
  value,
  description
});

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

/**
 * Returns a single industry-style repository health score and first two DORA metrics.
 * Current DORA values are derived from synced GitHub data:
 * - Deployment frequency uses merged PRs as deployable changes.
 * - Lead time for changes uses PR created -> merged duration.
 */
export const getRepositoryHealth = async (repoId, userId) => {
  await verifyRepositoryAccess(repoId, userId);

  const repoObjectId = new mongoose.Types.ObjectId(repoId);
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalCommits,
    commitsLast30Days,
    latestCommit,
    totalPRs,
    mergedPRs,
    mergedPRsLast30Days,
    openPRs,
    stalePRs,
    openIssues,
    staleIssues,
    contributorStats,
    leadTimeStats
  ] = await Promise.all([
    Commit.countDocuments({ repoId: repoObjectId }),
    Commit.countDocuments({ repoId: repoObjectId, committedAt: { $gte: thirtyDaysAgo } }),
    Commit.findOne({ repoId: repoObjectId }).sort({ committedAt: -1 }).lean(),
    PullRequest.countDocuments({ repoId: repoObjectId }),
    PullRequest.countDocuments({ repoId: repoObjectId, mergedAt: { $ne: null } }),
    PullRequest.countDocuments({ repoId: repoObjectId, mergedAt: { $gte: thirtyDaysAgo } }),
    PullRequest.countDocuments({ repoId: repoObjectId, state: 'open' }),
    PullRequest.countDocuments({
      repoId: repoObjectId,
      state: 'open',
      githubCreatedAt: { $lt: sevenDaysAgo }
    }),
    Issue.countDocuments({ repoId: repoObjectId, state: 'open' }),
    Issue.countDocuments({
      repoId: repoObjectId,
      state: 'open',
      githubCreatedAt: { $lt: thirtyDaysAgo }
    }),
    Commit.aggregate([
      { $match: { repoId: repoObjectId } },
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
          }
        }
      },
      {
        $group: {
          _id: '$identity',
          commits: { $sum: 1 }
        }
      },
      { $sort: { commits: -1 } }
    ]),
    PullRequest.aggregate([
      { $match: { repoId: repoObjectId, mergedAt: { $ne: null } } },
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
          avgLeadTimeHours: { $avg: '$durationHours' },
          minLeadTimeHours: { $min: '$durationHours' },
          maxLeadTimeHours: { $max: '$durationHours' },
          sampleSize: { $sum: 1 }
        }
      }
    ])
  ]);

  const avgLeadTimeHours = leadTimeStats.length ? round(leadTimeStats[0].avgLeadTimeHours) : 0;
  const leadTimeSampleSize = leadTimeStats.length ? leadTimeStats[0].sampleSize : 0;
  const deploymentsPerWeek = round(mergedPRsLast30Days / (30 / 7));
  const prMergeRate = totalPRs > 0 ? round((mergedPRs / totalPRs) * 100) : 0;
  const daysSinceLastCommit = latestCommit ? daysBetween(latestCommit.committedAt, now) : null;
  const topContributor = contributorStats[0] || null;
  const topContributorShare = totalCommits > 0 && topContributor
    ? round((topContributor.commits / totalCommits) * 100)
    : 0;

  const factors = [];
  let penalty = 0;

  if (totalCommits === 0) {
    penalty += 25;
    factors.push(createRiskFactor({
      key: 'no_commit_activity',
      label: 'No commit activity',
      severity: 'high',
      impact: 25,
      value: '0 commits',
      description: 'No synced commits are available, so repository delivery health is hard to validate.'
    }));
  } else if (daysSinceLastCommit > 14) {
    penalty += 15;
    factors.push(createRiskFactor({
      key: 'commit_inactivity',
      label: 'Commit inactivity',
      severity: 'high',
      impact: 15,
      value: `${daysSinceLastCommit} days`,
      description: 'The repository has not received a commit for more than two weeks.'
    }));
  } else if (daysSinceLastCommit > 7) {
    penalty += 8;
    factors.push(createRiskFactor({
      key: 'commit_slowdown',
      label: 'Commit slowdown',
      severity: 'medium',
      impact: 8,
      value: `${daysSinceLastCommit} days`,
      description: 'The latest commit is older than one week.'
    }));
  } else if (daysSinceLastCommit > 3) {
    penalty += 3;
    factors.push(createRiskFactor({
      key: 'commit_watch',
      label: 'Commit watch',
      severity: 'low',
      impact: 3,
      value: `${daysSinceLastCommit} days`,
      description: 'Commit activity is still healthy, but recent momentum is worth watching.'
    }));
  }

  if (stalePRs > 0) {
    const impact = Math.min(25, stalePRs * 8);
    penalty += impact;
    factors.push(createRiskFactor({
      key: 'stale_pull_requests',
      label: 'Stale pull requests',
      severity: stalePRs >= 3 ? 'high' : 'medium',
      impact,
      value: stalePRs,
      description: 'Open pull requests older than seven days can slow reviews and releases.'
    }));
  }

  if (staleIssues > 0) {
    const impact = Math.min(20, staleIssues * 4);
    penalty += impact;
    factors.push(createRiskFactor({
      key: 'stale_issues',
      label: 'Stale issues',
      severity: staleIssues >= 5 ? 'high' : 'medium',
      impact,
      value: staleIssues,
      description: 'Open issues older than thirty days increase planning and maintenance risk.'
    }));
  }

  if (totalPRs === 0) {
    penalty += 10;
    factors.push(createRiskFactor({
      key: 'no_deployable_changes',
      label: 'No deployable change history',
      severity: 'medium',
      impact: 10,
      value: '0 merged PRs',
      description: 'No merged pull requests are available to estimate release flow.'
    }));
  } else if (prMergeRate < 30) {
    penalty += 12;
    factors.push(createRiskFactor({
      key: 'low_merge_rate',
      label: 'Low PR merge rate',
      severity: 'high',
      impact: 12,
      value: `${prMergeRate}%`,
      description: 'A low merge rate indicates work may be piling up without reaching completion.'
    }));
  } else if (prMergeRate < 50) {
    penalty += 6;
    factors.push(createRiskFactor({
      key: 'merge_rate_watch',
      label: 'PR merge rate watch',
      severity: 'medium',
      impact: 6,
      value: `${prMergeRate}%`,
      description: 'Merged PR ratio is below the ideal range for steady delivery.'
    }));
  }

  if (leadTimeSampleSize > 0 && avgLeadTimeHours > 168) {
    penalty += 12;
    factors.push(createRiskFactor({
      key: 'slow_lead_time',
      label: 'Slow lead time',
      severity: 'high',
      impact: 12,
      value: `${avgLeadTimeHours}h`,
      description: 'Average PR lead time is above one week.'
    }));
  } else if (leadTimeSampleSize > 0 && avgLeadTimeHours > 72) {
    penalty += 8;
    factors.push(createRiskFactor({
      key: 'lead_time_watch',
      label: 'Lead time watch',
      severity: 'medium',
      impact: 8,
      value: `${avgLeadTimeHours}h`,
      description: 'Average PR lead time is above three days.'
    }));
  } else if (leadTimeSampleSize > 0 && avgLeadTimeHours > 24) {
    penalty += 4;
    factors.push(createRiskFactor({
      key: 'lead_time_slight_delay',
      label: 'Slight lead time delay',
      severity: 'low',
      impact: 4,
      value: `${avgLeadTimeHours}h`,
      description: 'Average PR lead time is above one day.'
    }));
  }

  if (totalCommits >= 3 && topContributorShare > 80) {
    penalty += 12;
    factors.push(createRiskFactor({
      key: 'contributor_imbalance',
      label: 'Contributor imbalance',
      severity: 'high',
      impact: 12,
      value: `${topContributorShare}%`,
      description: 'One contributor owns most commits, creating delivery and knowledge-sharing risk.'
    }));
  } else if (totalCommits >= 3 && topContributorShare > 65) {
    penalty += 6;
    factors.push(createRiskFactor({
      key: 'contributor_concentration',
      label: 'Contributor concentration',
      severity: 'medium',
      impact: 6,
      value: `${topContributorShare}%`,
      description: 'A large share of commits comes from one contributor.'
    }));
  }

  const score = clamp(Math.round(100 - penalty), 0, 100);
  const status = getHealthStatus(score);

  return {
    riskScore: score,
    status,
    generatedAt: now,
    windowDays: 30,
    summary: {
      totalCommits,
      commitsLast30Days,
      daysSinceLastCommit,
      totalPRs,
      openPRs,
      mergedPRs,
      prMergeRate,
      openIssues,
      stalePRs,
      staleIssues,
      topContributor: topContributor?._id || null,
      topContributorShare
    },
    dora: {
      deploymentFrequency: {
        value: deploymentsPerWeek,
        unit: 'deployable changes/week',
        deployableChangesLast30Days: mergedPRsLast30Days,
        basis: 'Merged pull requests in the last 30 days are used as deployable changes until deployment data is connected.',
        rating: getDeploymentFrequencyRating(deploymentsPerWeek)
      },
      leadTimeForChanges: {
        value: avgLeadTimeHours,
        unit: 'hours',
        valueDays: round(avgLeadTimeHours / 24),
        sampleSize: leadTimeSampleSize,
        basis: 'Average time from pull request creation to merge is used as the current lead-time proxy.',
        rating: leadTimeSampleSize > 0 ? getLeadTimeRating(avgLeadTimeHours) : 'unknown'
      }
    },
    factors: factors.length
      ? factors.sort((a, b) => b.impact - a.impact)
      : [
          createRiskFactor({
            key: 'healthy_flow',
            label: 'Healthy flow',
            severity: 'positive',
            impact: 0,
            value: 'No major risks',
            description: 'No major delivery, issue, PR, or contributor concentration risks were detected.'
          })
        ]
  };
};
