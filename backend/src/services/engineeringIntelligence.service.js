import mongoose from 'mongoose';
import Commit from '../models/Commit.model.js';
import Issue from '../models/Issue.model.js';
import PullRequest from '../models/PullRequest.model.js';
import AIInsight from '../models/AIInsight.model.js';
import { verifyRepositoryAccess } from './analytics.service.js';
import * as geminiService from './gemini.service.js';
import logger from '../config/logger.js';
import {
  calculateCommitDropPercentage,
  calculateReleaseReadiness,
  round
} from '../utils/releaseReadiness.util.js';
import {
  calculateWorkloadHealth,
  normalizeContributorName
} from '../utils/workloadHealth.util.js';
import {
  generateRuleBasedRetrospective,
  parseRetrospectiveRange
} from '../utils/retrospectiveGenerator.util.js';

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const daysAgo = (days, from = new Date()) => {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return date;
};

// ─── Cache helpers (same pattern as insight.service.js) ─────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const getCachedEngineeringInsight = async (repoId, userId, type) => {
  return await AIInsight.findOne({
    repoId: toObjectId(repoId),
    userId: toObjectId(userId),
    type,
    expiresAt: { $gt: new Date() }
  }).lean();
};

const saveEngineeringInsight = async (repoId, userId, type, parsedData) => {
  const filter = {
    repoId: toObjectId(repoId),
    userId: toObjectId(userId),
    type
  };
  const update = {
    ...filter,
    parsedData,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    generatedAt: new Date()
  };
  return await AIInsight.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true
  }).lean();
};

const contributorIdentityExpression = {
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
};

const averageMergeTimePipeline = (repoObjectId) => ([
  {
    $match: {
      repoId: repoObjectId,
      mergedAt: { $ne: null },
      githubCreatedAt: { $ne: null }
    }
  },
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
      avgMergeTimeHours: { $avg: '$durationHours' },
      mergedCount: { $sum: 1 }
    }
  }
]);

const contributorStatsPipeline = (repoObjectId, from = null) => {
  const match = { repoId: repoObjectId };
  if (from) {
    match.committedAt = { $gte: from };
  }

  return [
    { $match: match },
    {
      $project: {
        identity: contributorIdentityExpression,
        login: '$author.login',
        name: '$author.name',
        email: '$author.email'
      }
    },
    {
      $group: {
        _id: '$identity',
        login: { $first: '$login' },
        name: { $first: '$name' },
        email: { $first: '$email' },
        commitCount: { $sum: 1 }
      }
    },
    { $sort: { commitCount: -1 } }
  ];
};

const getContributorDisplayName = (contributor) => (
  contributor?.login ||
  contributor?.name ||
  contributor?.email ||
  contributor?._id ||
  'Unknown'
);

const addContributorMetric = (contributors, identitySource, field, increment = 1) => {
  const name = normalizeContributorName(identitySource);
  if (!name || name === 'Unknown') {
    return;
  }

  if (!contributors.has(name)) {
    contributors.set(name, {
      name,
      login: typeof identitySource === 'object' ? identitySource.login || '' : name,
      commitCount: 0,
      commitSharePercentage: 0,
      openPrCount: 0,
      assignedIssueCount: 0,
      reviewLoadCount: 0
    });
  }

  const contributor = contributors.get(name);
  contributor[field] += increment;
};

const collectReleaseMetrics = async (repoId) => {
  const repoObjectId = toObjectId(repoId);
  const now = new Date();
  const sevenDaysAgo = daysAgo(7, now);
  const fourteenDaysAgo = daysAgo(14, now);
  const thirtyDaysAgo = daysAgo(30, now);

  const [
    openPrs,
    stalePrs,
    totalPrs,
    mergedPrs,
    mergedPrsLast30Days,
    openIssues,
    staleIssues,
    recentCommits,
    previousCommits,
    totalCommits,
    prMergeStats,
    contributorStats
  ] = await Promise.all([
    PullRequest.countDocuments({ repoId: repoObjectId, state: 'open' }),
    PullRequest.countDocuments({
      repoId: repoObjectId,
      state: 'open',
      githubCreatedAt: { $lt: sevenDaysAgo }
    }),
    PullRequest.countDocuments({ repoId: repoObjectId }),
    PullRequest.countDocuments({ repoId: repoObjectId, mergedAt: { $ne: null } }),
    PullRequest.countDocuments({ repoId: repoObjectId, mergedAt: { $gte: thirtyDaysAgo } }),
    Issue.countDocuments({ repoId: repoObjectId, state: 'open' }),
    Issue.countDocuments({
      repoId: repoObjectId,
      state: 'open',
      githubCreatedAt: { $lt: thirtyDaysAgo }
    }),
    Commit.countDocuments({ repoId: repoObjectId, committedAt: { $gte: sevenDaysAgo } }),
    Commit.countDocuments({
      repoId: repoObjectId,
      committedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    }),
    Commit.countDocuments({ repoId: repoObjectId }),
    PullRequest.aggregate(averageMergeTimePipeline(repoObjectId)),
    Commit.aggregate(contributorStatsPipeline(repoObjectId, thirtyDaysAgo))
  ]);

  const topContributor = contributorStats[0] || null;
  const recentContributorCommits = contributorStats.reduce((sum, contributor) => sum + contributor.commitCount, 0);
  const contributorImbalance = topContributor && recentContributorCommits > 0
    ? round((topContributor.commitCount / recentContributorCommits) * 100)
    : 0;

  const avgMergeTimeHours = prMergeStats.length ? round(prMergeStats[0].avgMergeTimeHours) : 0;
  const deploymentFrequency = round(mergedPrsLast30Days / (30 / 7));

  return {
    openPrs,
    stalePrs,
    prsOlderThan7Days: stalePrs,
    totalPrs,
    mergedPrs,
    openIssues,
    staleIssues,
    issuesOlderThan30Days: staleIssues,
    recentCommits,
    previousCommits,
    totalCommits,
    commitDropPercentage: calculateCommitDropPercentage(recentCommits, previousCommits),
    contributorImbalance,
    topContributor: topContributor ? getContributorDisplayName(topContributor) : null,
    avgMergeTimeHours,
    failedBuilds: 0,
    buildHealthAvailable: false,
    dora: {
      deploymentFrequency,
      deploymentFrequencyUnit: 'deployable changes/week',
      leadTimeForChangesHours: avgMergeTimeHours
    },
    dataAvailability: {
      buildHealth: 'Build health data not available. Connect GitHub Actions data to improve prediction.',
      reviewTiming: 'Review timing data is limited. Showing PR age and merge-time based bottlenecks.'
    }
  };
};

const applyReleaseAiNarrative = async (repoFullName, releaseReadiness) => {
  try {
    const aiResponse = await geminiService.generateReleaseReadinessNarrative({
      repoName: repoFullName,
      score: releaseReadiness.score,
      status: releaseReadiness.status,
      metrics: releaseReadiness.metrics,
      riskFactors: releaseReadiness.riskFactors,
      recommendations: releaseReadiness.recommendations
    });

    if (aiResponse._aiError) {
      return {
        ...releaseReadiness,
        aiGenerated: false,
        aiFallbackMessage: 'AI explanation is unavailable right now. Showing rule-based release intelligence.'
      };
    }

    return {
      ...releaseReadiness,
      riskFactors: aiResponse.riskFactors.length ? aiResponse.riskFactors : releaseReadiness.riskFactors,
      recommendations: aiResponse.recommendations.length ? aiResponse.recommendations : releaseReadiness.recommendations,
      aiGenerated: true
    };
  } catch (error) {
    logger.warn('Release readiness AI enhancement failed', { error: error.message });
    return {
      ...releaseReadiness,
      aiGenerated: false,
      aiFallbackMessage: 'AI explanation is unavailable right now. Showing rule-based release intelligence.'
    };
  }
};

const buildReleaseReadiness = async (repo, options = {}) => {
  const metrics = await collectReleaseMetrics(repo._id);
  const calculated = calculateReleaseReadiness(metrics);
  const releaseReadiness = {
    repoFullName: repo.fullName,
    score: calculated.score,
    status: calculated.status,
    riskFactors: calculated.riskFactors,
    recommendations: calculated.recommendations,
    metrics: {
      ...metrics,
      commitDropPercentage: calculated.metrics.commitDropPercentage
    },
    generatedAt: new Date(),
    aiGenerated: false
  };

  if (options.includeAi === false) {
    return releaseReadiness;
  }

  return applyReleaseAiNarrative(repo.fullName, releaseReadiness);
};

const collectWorkloadContributors = async (repoId) => {
  const repoObjectId = toObjectId(repoId);
  const thirtyDaysAgo = daysAgo(30);

  const [commitStats, openPrs, openIssues] = await Promise.all([
    Commit.aggregate(contributorStatsPipeline(repoObjectId, thirtyDaysAgo)),
    PullRequest.find({ repoId: repoObjectId, state: 'open' })
      .select('author reviewers number githubCreatedAt')
      .lean(),
    Issue.find({ repoId: repoObjectId, state: 'open' })
      .select('author assignees number githubCreatedAt')
      .lean()
  ]);

  const contributors = new Map();
  const totalCommitCount = commitStats.reduce((sum, contributor) => sum + contributor.commitCount, 0);

  commitStats.forEach((contributor) => {
    const name = getContributorDisplayName(contributor);
    contributors.set(name, {
      name,
      login: contributor.login || '',
      commitCount: contributor.commitCount,
      commitSharePercentage: totalCommitCount > 0
        ? round((contributor.commitCount / totalCommitCount) * 100)
        : 0,
      openPrCount: 0,
      assignedIssueCount: 0,
      reviewLoadCount: 0
    });
  });

  openPrs.forEach((pr) => {
    addContributorMetric(contributors, pr.author, 'openPrCount');
    (pr.reviewers || []).forEach((reviewer) => {
      addContributorMetric(contributors, reviewer, 'reviewLoadCount');
    });
  });

  openIssues.forEach((issue) => {
    (issue.assignees || []).forEach((assignee) => {
      addContributorMetric(contributors, assignee, 'assignedIssueCount');
    });
  });

  return {
    contributors: Array.from(contributors.values()),
    missingIssueAssigneeData: openIssues.length > 0 && !openIssues.some((issue) => issue.assignees?.length),
    missingReviewData: openPrs.length > 0 && !openPrs.some((pr) => pr.reviewers?.length)
  };
};

const applyWorkloadAiNarrative = async (repoFullName, workloadHealth) => {
  try {
    const aiResponse = await geminiService.generateWorkloadIntelligenceNarrative({
      repoName: repoFullName,
      status: workloadHealth.status,
      topRisk: workloadHealth.topRisk,
      contributors: workloadHealth.contributors
    });

    if (aiResponse._aiError) {
      return {
        ...workloadHealth,
        aiGenerated: false,
        aiFallbackMessage: 'AI workload suggestions are unavailable right now. Showing rule-based suggestions.'
      };
    }

    return {
      ...workloadHealth,
      topRisk: aiResponse.topRisk || workloadHealth.topRisk,
      recommendations: aiResponse.recommendations.length
        ? aiResponse.recommendations
        : workloadHealth.recommendations,
      aiGenerated: true
    };
  } catch (error) {
    logger.warn('Workload intelligence AI enhancement failed', { error: error.message });
    return {
      ...workloadHealth,
      aiGenerated: false,
      aiFallbackMessage: 'AI workload suggestions are unavailable right now. Showing rule-based suggestions.'
    };
  }
};

const buildWorkloadHealth = async (repo, options = {}) => {
  const workloadData = await collectWorkloadContributors(repo._id);
  const calculated = calculateWorkloadHealth(workloadData.contributors, {
    missingIssueAssigneeData: workloadData.missingIssueAssigneeData,
    missingReviewData: workloadData.missingReviewData
  });

  const workloadHealth = {
    repoFullName: repo.fullName,
    status: calculated.status,
    topRisk: calculated.topRisk,
    topContributor: calculated.topContributor,
    contributors: calculated.contributors,
    recommendations: calculated.recommendations,
    generatedAt: new Date(),
    aiGenerated: false
  };

  if (options.includeAi === false) {
    return workloadHealth;
  }

  return applyWorkloadAiNarrative(repo.fullName, workloadHealth);
};

const collectRetrospectiveMetrics = async (repoId, rangeInfo) => {
  const repoObjectId = toObjectId(repoId);
  const now = new Date();
  const from = daysAgo(rangeInfo.days, now);
  const previousFrom = daysAgo(rangeInfo.days * 2, now);

  const [
    commits,
    previousCommits,
    prsCreated,
    prsMerged,
    issuesOpened,
    issuesClosed,
    stalePrs,
    staleIssues
  ] = await Promise.all([
    Commit.countDocuments({ repoId: repoObjectId, committedAt: { $gte: from, $lte: now } }),
    Commit.countDocuments({ repoId: repoObjectId, committedAt: { $gte: previousFrom, $lt: from } }),
    PullRequest.countDocuments({ repoId: repoObjectId, githubCreatedAt: { $gte: from, $lte: now } }),
    PullRequest.countDocuments({ repoId: repoObjectId, mergedAt: { $gte: from, $lte: now } }),
    Issue.countDocuments({ repoId: repoObjectId, githubCreatedAt: { $gte: from, $lte: now } }),
    Issue.countDocuments({ repoId: repoObjectId, closedAt: { $gte: from, $lte: now } }),
    PullRequest.countDocuments({
      repoId: repoObjectId,
      state: 'open',
      githubCreatedAt: { $lt: daysAgo(7, now) }
    }),
    Issue.countDocuments({
      repoId: repoObjectId,
      state: 'open',
      githubCreatedAt: { $lt: daysAgo(30, now) }
    })
  ]);

  let commitChangePercentage = 0;
  if (previousCommits > 0) {
    commitChangePercentage = round(((commits - previousCommits) / previousCommits) * 100);
  } else if (commits > 0) {
    commitChangePercentage = 100;
  }

  return {
    commits,
    previousCommits,
    prsCreated,
    prsMerged,
    issuesOpened,
    issuesClosed,
    stalePrs,
    staleIssues,
    commitChangePercentage,
    from,
    to: now
  };
};

const applyRetrospectiveAiNarrative = async (repoFullName, retrospective, releaseReadiness, workloadHealth) => {
  try {
    const aiResponse = await geminiService.generateSprintRetrospectiveNarrative({
      repoName: repoFullName,
      range: retrospective.range,
      metrics: retrospective.metrics,
      releaseReadiness,
      workloadHealth
    });

    if (aiResponse._aiError) {
      return {
        ...retrospective,
        aiGenerated: false,
        aiFallbackMessage: 'AI retrospective is unavailable right now. Showing rule-based retrospective.'
      };
    }

    return {
      ...retrospective,
      summary: aiResponse.summary || retrospective.summary,
      whatWentWell: aiResponse.whatWentWell.length ? aiResponse.whatWentWell : retrospective.whatWentWell,
      whatWentWrong: aiResponse.whatWentWrong.length ? aiResponse.whatWentWrong : retrospective.whatWentWrong,
      risks: aiResponse.risks.length ? aiResponse.risks : retrospective.risks,
      actionItems: aiResponse.actionItems.length ? aiResponse.actionItems : retrospective.actionItems,
      aiGenerated: true
    };
  } catch (error) {
    logger.warn('Sprint retrospective AI enhancement failed', { error: error.message });
    return {
      ...retrospective,
      aiGenerated: false,
      aiFallbackMessage: 'AI retrospective is unavailable right now. Showing rule-based retrospective.'
    };
  }
};

export const getReleaseReadiness = async (repoId, userId, options = {}) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const force = options.force === true;

  // Check MongoDB cache first
  if (!force) {
    const cached = await getCachedEngineeringInsight(repoId, userId, 'release_readiness');
    if (cached) {
      logger.debug('Serving cached release readiness', { repoId });
      return { ...cached.parsedData, cached: true, generatedAt: cached.generatedAt };
    }
  }

  const data = await buildReleaseReadiness(repo);

  // Only cache if AI generation succeeded (not fallback)
  if (data.aiGenerated !== false || !data.aiFallbackMessage) {
    try {
      await saveEngineeringInsight(repoId, userId, 'release_readiness', data);
    } catch (err) {
      logger.warn('Failed to cache release readiness', { error: err.message });
    }
  }

  return data;
};

export const getWorkloadHealth = async (repoId, userId, options = {}) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const force = options.force === true;

  // Check MongoDB cache first
  if (!force) {
    const cached = await getCachedEngineeringInsight(repoId, userId, 'workload_health');
    if (cached) {
      logger.debug('Serving cached workload health', { repoId });
      return { ...cached.parsedData, cached: true, generatedAt: cached.generatedAt };
    }
  }

  const data = await buildWorkloadHealth(repo);

  // Only cache if AI generation succeeded
  if (data.aiGenerated !== false || !data.aiFallbackMessage) {
    try {
      await saveEngineeringInsight(repoId, userId, 'workload_health', data);
    } catch (err) {
      logger.warn('Failed to cache workload health', { error: err.message });
    }
  }

  return data;
};

export const getSprintRetrospective = async (repoId, userId, options = {}) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const rangeInfo = parseRetrospectiveRange(options.range);
  const force = options.force === true;

  // Check MongoDB cache first
  if (!force) {
    const cached = await getCachedEngineeringInsight(repoId, userId, 'sprint_retrospective');
    if (cached) {
      logger.debug('Serving cached sprint retrospective', { repoId });
      return { ...cached.parsedData, cached: true, generatedAt: cached.generatedAt };
    }
  }

  const [metrics, releaseReadiness, workloadHealth] = await Promise.all([
    collectRetrospectiveMetrics(repo._id, rangeInfo),
    buildReleaseReadiness(repo, { includeAi: false }),
    buildWorkloadHealth(repo, { includeAi: false })
  ]);

  const retrospective = generateRuleBasedRetrospective({
    repoFullName: repo.fullName,
    range: rangeInfo.label,
    metrics,
    releaseReadiness,
    workloadHealth
  });

  const enhancedRetrospective = await applyRetrospectiveAiNarrative(
    repo.fullName,
    retrospective,
    releaseReadiness,
    workloadHealth
  );

  const result = {
    ...enhancedRetrospective,
    metrics: {
      ...enhancedRetrospective.metrics,
      from: metrics.from,
      to: metrics.to,
      releaseReadinessScore: releaseReadiness.score,
      releaseReadinessStatus: releaseReadiness.status,
      workloadStatus: workloadHealth.status
    },
    generatedAt: new Date()
  };

  // Only cache if AI generation succeeded
  if (result.aiGenerated !== false || !result.aiFallbackMessage) {
    try {
      await saveEngineeringInsight(repoId, userId, 'sprint_retrospective', result);
    } catch (err) {
      logger.warn('Failed to cache sprint retrospective', { error: err.message });
    }
  }

  return result;
};
