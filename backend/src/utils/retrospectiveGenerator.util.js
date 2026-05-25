const asNumber = (value) => Number(value) || 0;

export const parseRetrospectiveRange = (range = '7d') => {
  const normalized = String(range || '7d').trim().toLowerCase();
  const match = normalized.match(/^(\d+)d$/);
  const days = match ? Number.parseInt(match[1], 10) : 7;
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 90) : 7;

  return {
    days: safeDays,
    label: `${safeDays}d`
  };
};

const createDefaultSummary = (metrics, releaseReadiness, workloadHealth) => {
  const readinessStatus = releaseReadiness?.status || 'unknown';
  const workloadStatus = workloadHealth?.status || 'unknown';

  if (metrics.commits === 0 && metrics.prsMerged === 0 && metrics.issuesClosed === 0) {
    return 'Not enough recent repository activity is available to create a full sprint retrospective.';
  }

  return `The sprint produced ${metrics.commits} commit${metrics.commits === 1 ? '' : 's'}, ${metrics.prsMerged} merged PR${metrics.prsMerged === 1 ? '' : 's'}, and ${metrics.issuesClosed} closed issue${metrics.issuesClosed === 1 ? '' : 's'}. Release readiness is ${readinessStatus}, while workload health is ${workloadStatus}.`;
};

export const generateRuleBasedRetrospective = ({
  repoFullName,
  range,
  metrics = {},
  releaseReadiness = null,
  workloadHealth = null
}) => {
  const normalizedMetrics = {
    commits: asNumber(metrics.commits),
    previousCommits: asNumber(metrics.previousCommits),
    prsCreated: asNumber(metrics.prsCreated),
    prsMerged: asNumber(metrics.prsMerged),
    issuesOpened: asNumber(metrics.issuesOpened),
    issuesClosed: asNumber(metrics.issuesClosed),
    stalePrs: asNumber(metrics.stalePrs),
    staleIssues: asNumber(metrics.staleIssues),
    commitChangePercentage: asNumber(metrics.commitChangePercentage),
    releaseReadinessScore: asNumber(releaseReadiness?.score),
    workloadTopShare: asNumber(workloadHealth?.topContributor?.workloadShare)
  };

  const whatWentWell = [];
  const whatWentWrong = [];
  const risks = [];
  const actionItems = [];

  if (normalizedMetrics.commits > 0) {
    whatWentWell.push(`${normalizedMetrics.commits} commits were delivered during this period`);
  }

  if (normalizedMetrics.prsMerged > 0) {
    whatWentWell.push(`${normalizedMetrics.prsMerged} pull request${normalizedMetrics.prsMerged === 1 ? ' was' : 's were'} merged successfully`);
  }

  if (normalizedMetrics.issuesClosed > 0) {
    whatWentWell.push(`${normalizedMetrics.issuesClosed} issue${normalizedMetrics.issuesClosed === 1 ? ' was' : 's were'} closed`);
  }

  if (normalizedMetrics.commitChangePercentage > 0) {
    whatWentWell.push(`Commit activity increased by ${normalizedMetrics.commitChangePercentage}% compared to the previous period`);
  }

  if (!whatWentWell.length) {
    whatWentWell.push('No major positive delivery signals were detected from the synced data');
  }

  if (normalizedMetrics.commitChangePercentage < 0) {
    whatWentWrong.push(`Commit activity dropped by ${Math.abs(normalizedMetrics.commitChangePercentage)}% compared to the previous period`);
  }

  if (normalizedMetrics.stalePrs > 0) {
    whatWentWrong.push(`${normalizedMetrics.stalePrs} pull request${normalizedMetrics.stalePrs === 1 ? '' : 's'} became stale`);
  }

  if (normalizedMetrics.staleIssues > 0) {
    whatWentWrong.push(`${normalizedMetrics.staleIssues} open issue${normalizedMetrics.staleIssues === 1 ? '' : 's'} remained stale`);
  }

  if (!whatWentWrong.length) {
    whatWentWrong.push('No major delivery blockers were detected from the available activity');
  }

  if (releaseReadiness?.status && releaseReadiness.status !== 'Ready') {
    risks.push(`Release readiness is ${releaseReadiness.status} at ${releaseReadiness.score}%`);
  }

  if (workloadHealth?.status && workloadHealth.status !== 'Healthy') {
    risks.push(workloadHealth.topRisk);
  }

  if (normalizedMetrics.staleIssues > 0) {
    risks.push('Stale issues may delay release confidence if not triaged');
  }

  if (!risks.length) {
    risks.push('No major sprint risks were detected from synced repository activity');
  }

  actionItems.push('Assign reviewers earlier for active pull requests');

  if (normalizedMetrics.staleIssues > 0) {
    actionItems.push('Resolve or re-prioritize stale issues before the next sprint');
  }

  if (normalizedMetrics.stalePrs > 0) {
    actionItems.push('Merge, split, or close stale pull requests');
  }

  if (workloadHealth?.status && workloadHealth.status !== 'Healthy') {
    actionItems.push('Redistribute active tasks to reduce workload concentration');
  }

  if (releaseReadiness?.status && releaseReadiness.status !== 'Ready') {
    actionItems.push('Run a release readiness review before deployment');
  }

  return {
    repoFullName,
    range,
    summary: createDefaultSummary(normalizedMetrics, releaseReadiness, workloadHealth),
    whatWentWell: whatWentWell.slice(0, 5),
    whatWentWrong: whatWentWrong.slice(0, 5),
    risks: risks.slice(0, 5),
    actionItems: [...new Set(actionItems)].slice(0, 5),
    metrics: normalizedMetrics
  };
};
