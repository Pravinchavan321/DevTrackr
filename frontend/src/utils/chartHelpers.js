/**
 * Transforms commit chart data to ensure safe defaults.
 * @param {Array} apiData - Raw array from GET /api/analytics/repos/:repoId/commits/chart
 * @returns {Array} Formatted array with fallback values
 */
export function formatCommitChartData(apiData) {
  if (!Array.isArray(apiData)) return [];
  return apiData.map(item => ({
    date: item.date || 'Unknown',
    count: Number(item.count || 0),
    additions: Number(item.additions || 0),
    deletions: Number(item.deletions || 0)
  }));
}

/**
 * Transforms contributor data for the Radar chart, limited to top N.
 * @param {Array} contributors - Raw array from GET /api/analytics/repos/:repoId/contributors
 * @param {number} limit - Maximum number of contributors to return
 * @returns {Array} Formatted array for Recharts Polar/Radar compatibility
 */
export function formatContributorsForRadar(contributors, limit = 5) {
  if (!Array.isArray(contributors)) return [];
  
  // Sort by commits descending and slice
  const topList = [...contributors]
    .sort((a, b) => (b.totalCommits || 0) - (a.totalCommits || 0))
    .slice(0, limit);

  return topList.map(c => ({
    name: c.login || c.name || 'Unknown',
    commits: c.totalCommits || 0,
    additions: c.additions || 0,
    deletions: c.deletions || 0,
    filesChanged: c.filesChanged || 0
  }));
}

/**
 * Calculates PR Status distribution (open vs merged vs closed).
 * @param {Array} pullRequests - Raw array of PRs or an already computed summary object
 * @returns {Array} List of segments formatted for PieChart [{ name, value, color }]
 */
export function calculatePRStatusDistribution(pullRequests) {
  if (!Array.isArray(pullRequests)) {
    // If it is an object with precomputed values
    if (pullRequests && typeof pullRequests === 'object') {
      const open = Number(pullRequests.open || 0);
      const merged = Number(pullRequests.merged || 0);
      const closed = Number(pullRequests.closed || 0);
      return [
        { name: 'Open', value: open, color: '#f59e0b' },    // Amber
        { name: 'Merged', value: merged, color: '#10b981' },  // Emerald
        { name: 'Closed', value: closed, color: '#ef4444' }   // Red
      ].filter(item => item.value > 0);
    }
    return [];
  }

  let open = 0;
  let closed = 0;
  let merged = 0;

  pullRequests.forEach(pr => {
    if (pr.state === 'merged' || pr.mergedAt) {
      merged++;
    } else if (pr.state === 'closed') {
      closed++;
    } else {
      open++;
    }
  });

  return [
    { name: 'Open', value: open, color: '#f59e0b' },    // Amber
    { name: 'Merged', value: merged, color: '#10b981' },  // Emerald
    { name: 'Closed', value: closed, color: '#ef4444' }   // Red
  ];
}

/**
 * Sleek premium palette color constants matching the dark SaaS Tailwind dashboard theme.
 */
export const CHART_COLORS = {
  primary: '#6366f1', // Indigo 500
  secondary: '#818cf8', // Indigo 400
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
  danger: '#ef4444', // Red 500
  info: '#3b82f6', // Blue 500
  grid: '#1f2937', // Gray 800
  text: '#9ca3af', // Gray 400
  cardBg: '#111827' // Gray 900
};
