const asNumber = (value) => Number(value) || 0;

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(asNumber(value) * factor) / factor;
};

export const normalizeContributorName = (value, fallback = 'Unknown') => {
  if (!value) return fallback;

  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  return (
    value.login ||
    value.username ||
    value.name ||
    value.email ||
    value.htmlUrl ||
    fallback
  );
};

export const getWorkloadRiskStatus = (topShare) => {
  if (topShare > 60) return 'High Risk';
  if (topShare >= 40) return 'Medium Risk';
  return 'Healthy';
};

const getTopRiskMessage = (status, topContributor) => {
  if (!topContributor) {
    return 'Not enough workload data available';
  }

  if (status === 'High Risk') {
    return `${topContributor.name} is carrying ${topContributor.workloadShare}% of tracked workload`;
  }

  if (status === 'Medium Risk') {
    return `Workload is concentrated around ${topContributor.name}`;
  }

  return 'Workload distribution looks balanced from available data';
};

export const calculateWorkloadHealth = (rawContributors = [], options = {}) => {
  const contributors = rawContributors
    .map((contributor) => {
      const commitCount = asNumber(contributor.commitCount);
      const openPrCount = asNumber(contributor.openPrCount);
      const assignedIssueCount = asNumber(contributor.assignedIssueCount);
      const reviewLoadCount = asNumber(contributor.reviewLoadCount);
      const workloadScore = commitCount + (openPrCount * 2) + (assignedIssueCount * 2) + (reviewLoadCount * 2);

      return {
        name: contributor.name || contributor.login || contributor.email || 'Unknown',
        login: contributor.login || '',
        commitCount,
        commitSharePercentage: asNumber(contributor.commitSharePercentage),
        openPrCount,
        assignedIssueCount,
        reviewLoadCount,
        workloadScore
      };
    })
    .filter((contributor) => contributor.workloadScore > 0 || contributor.commitCount > 0)
    .sort((a, b) => b.workloadScore - a.workloadScore);

  const totalWorkloadScore = contributors.reduce((sum, contributor) => sum + contributor.workloadScore, 0);
  const enrichedContributors = contributors.map((contributor) => ({
    ...contributor,
    workloadShare: totalWorkloadScore > 0 ? round((contributor.workloadScore / totalWorkloadScore) * 100) : 0
  }));

  const topContributor = enrichedContributors[0] || null;
  const status = topContributor ? getWorkloadRiskStatus(topContributor.workloadShare) : 'Healthy';
  const recommendations = [];

  if (!topContributor) {
    recommendations.push('Sync commits, pull requests, and issues to build a workload profile');
  } else if (status === 'High Risk') {
    recommendations.push('Redistribute open issues or PR ownership away from the overloaded contributor');
    recommendations.push('Add another reviewer to active pull requests owned by the top contributor');
    recommendations.push('Pair on release-critical work to reduce single-person dependency risk');
  } else if (status === 'Medium Risk') {
    recommendations.push('Review task ownership before the next sprint planning session');
    recommendations.push('Share review duties across contributors to prevent workload concentration');
  } else {
    recommendations.push('Keep monitoring active work distribution during each sprint');
    recommendations.push('Rotate review ownership so workload stays balanced');
  }

  if (options.missingIssueAssigneeData) {
    recommendations.push('Issue assignment data is limited, so workload uses commits, PRs, and available assignees');
  }

  if (options.missingReviewData) {
    recommendations.push('Review timing data is limited, so PR age and reviewer assignment are used as proxies');
  }

  return {
    status,
    topRisk: getTopRiskMessage(status, topContributor),
    topContributor,
    contributors: enrichedContributors,
    totalWorkloadScore,
    recommendations: [...new Set(recommendations)].slice(0, 5)
  };
};
