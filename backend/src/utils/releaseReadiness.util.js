const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const asNumber = (value) => Number(value) || 0;

export const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(asNumber(value) * factor) / factor;
};

export const getReleaseReadinessStatus = (score) => {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'Moderate Risk';
  if (score >= 40) return 'High Risk';
  return 'Not Ready';
};

const addDeduction = (deductions, amount, reason, recommendation) => {
  if (amount <= 0) return;
  deductions.push({
    amount,
    reason,
    recommendation
  });
};

export const calculateCommitDropPercentage = (recentCommits, previousCommits) => {
  if (!previousCommits || recentCommits >= previousCommits) {
    return 0;
  }

  return round(((previousCommits - recentCommits) / previousCommits) * 100);
};

export const calculateReleaseReadiness = (rawMetrics = {}) => {
  const metrics = {
    openPrs: asNumber(rawMetrics.openPrs),
    stalePrs: asNumber(rawMetrics.stalePrs),
    openIssues: asNumber(rawMetrics.openIssues),
    staleIssues: asNumber(rawMetrics.staleIssues),
    failedBuilds: asNumber(rawMetrics.failedBuilds),
    recentCommits: asNumber(rawMetrics.recentCommits),
    previousCommits: asNumber(rawMetrics.previousCommits),
    avgMergeTimeHours: asNumber(rawMetrics.avgMergeTimeHours),
    contributorImbalance: asNumber(rawMetrics.contributorImbalance),
    buildHealthAvailable: Boolean(rawMetrics.buildHealthAvailable)
  };

  metrics.commitDropPercentage = rawMetrics.commitDropPercentage !== undefined
    ? asNumber(rawMetrics.commitDropPercentage)
    : calculateCommitDropPercentage(metrics.recentCommits, metrics.previousCommits);

  const deductions = [];

  addDeduction(
    deductions,
    Math.min(metrics.stalePrs * 5, 20),
    `${metrics.stalePrs} PR${metrics.stalePrs === 1 ? ' is' : 's are'} older than 7 days`,
    'Assign reviewers and merge or close stale pull requests before release'
  );

  addDeduction(
    deductions,
    Math.min(metrics.staleIssues * 3, 15),
    `${metrics.staleIssues} issue${metrics.staleIssues === 1 ? ' is' : 's are'} stale for more than 30 days`,
    'Prioritize stale issues that can block release confidence'
  );

  if (metrics.buildHealthAvailable) {
    addDeduction(
      deductions,
      Math.min(metrics.failedBuilds * 10, 20),
      `${metrics.failedBuilds} failing build${metrics.failedBuilds === 1 ? '' : 's'} detected`,
      'Review failed workflow runs before deployment'
    );
  }

  if (metrics.recentCommits === 0) {
    addDeduction(
      deductions,
      10,
      'No commits were synced in the last 7 days',
      'Confirm the release branch has received the expected final changes'
    );
  } else if (metrics.commitDropPercentage >= 30) {
    addDeduction(
      deductions,
      10,
      `Commit activity dropped by ${metrics.commitDropPercentage}% compared to the previous period`,
      'Check whether work slowed because of blockers, reviews, or unfinished release tasks'
    );
  }

  if (metrics.contributorImbalance > 60) {
    addDeduction(
      deductions,
      10,
      `One contributor owns ${metrics.contributorImbalance}% of recent commits`,
      'Spread release ownership and review responsibility across more contributors'
    );
  }

  if (metrics.openPrs > 10) {
    addDeduction(
      deductions,
      10,
      `${metrics.openPrs} pull requests are still open`,
      'Reduce open pull request count before cutting the release'
    );
  }

  if (metrics.openIssues > 20) {
    addDeduction(
      deductions,
      10,
      `${metrics.openIssues} issues are still open`,
      'Triage open issues and mark which ones are release blockers'
    );
  }

  if (metrics.avgMergeTimeHours > 168) {
    addDeduction(
      deductions,
      10,
      `Average PR merge time is ${round(metrics.avgMergeTimeHours)} hours`,
      'Split large PRs and assign reviewers earlier to shorten lead time'
    );
  } else if (metrics.avgMergeTimeHours > 72) {
    addDeduction(
      deductions,
      5,
      `Average PR merge time is above 3 days at ${round(metrics.avgMergeTimeHours)} hours`,
      'Review long-running PRs and unblock pending approvals'
    );
  }

  const totalDeduction = deductions.reduce((sum, item) => sum + item.amount, 0);
  const score = clamp(Math.round(100 - totalDeduction), 0, 100);

  const riskFactors = deductions.length
    ? deductions.map((item) => item.reason)
    : ['No major release blockers were detected from synced repository activity'];

  const recommendations = deductions.length
    ? [...new Set(deductions.map((item) => item.recommendation))].slice(0, 5)
    : [
        'Keep monitoring PR age, issue backlog, and build health before release',
        'Confirm CI/CD status manually if build data is not connected yet',
        'Run a final release checklist with owners for testing and deployment'
      ];

  return {
    score,
    status: getReleaseReadinessStatus(score),
    riskFactors,
    recommendations,
    deductions,
    metrics
  };
};
