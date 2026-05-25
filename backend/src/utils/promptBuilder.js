/**
 * Helper to sanitize commit messages from potential PII or secrets (like tokens)
 * and truncate long messages.
 */
const sanitizeCommitMessage = (msg) => {
  if (!msg) return '';
  // Simple token/secret scrub patterns
  let cleaned = msg
    .replace(/(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}/g, '[GITHUB_TOKEN]')
    .replace(/[a-zA-Z0-9_-]{24,}\.[a-zA-Z0-9_-]{6,}\.[a-zA-Z0-9_-]{27,}/g, '[JWT_TOKEN]')
    .replace(/[0-9a-fA-F]{32}/g, '[HASH]');
  
  // Truncate to a reasonable length
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 97) + '...';
  }
  return cleaned;
};

/**
 * Builds the prompt for generating Sprint Summaries.
 */
export const buildSprintSummaryPrompt = (data) => {
  const { repoName, commits = [], totalPRs = 0, openIssues = 0, closedIssues = 0, period } = data;

  const commitList = commits
    .slice(0, 15)
    .map(c => `- ${sanitizeCommitMessage(c.message)} (by ${c.author?.login || c.author?.name || 'unknown'})`)
    .join('\n');

  return `You are a software engineering productivity analyst. Analyze the following repository activity for ${repoName} over the period ${period?.from || 'start'} to ${period?.to || 'end'}.

ACTIVITY SUMMARY:
- Total Commits: ${commits.length}
- Total PRs (synced in period): ${totalPRs}
- Open Issues: ${openIssues}
- Closed Issues: ${closedIssues}

SAMPLE COMMIT MESSAGES:
${commitList || 'No commit activity.'}

You must return a raw JSON response. Do NOT wrap the JSON in markdown code blocks or any other text. Follow this exact JSON schema:
{
  "summary": "2-3 sentence executive summary of the work done in this sprint/period",
  "velocity": "high/medium/low with reasoning",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "concerns": ["concern1", "concern2"],
  "sprintScore": 8
}
Ensure sprintScore is a number from 1 to 10. Do not write anything other than the raw JSON output.`;
};

/**
 * Builds the prompt for Bottleneck Detection.
 */
export const buildBottleneckPrompt = (data) => {
  const { repoName, avgMergeTimeHours = 0, stalePRsCount = 0, staleIssuesCount = 0, workloadSkew = '' } = data;

  return `You are a DevOps efficiency and workflow expert. Analyze the following bottlenecks in the repository ${repoName}.

METRICS DETECTED:
- Average PR Merge Time: ${avgMergeTimeHours.toFixed(2)} hours
- Long-running / Stale Open PRs (>7 days): ${stalePRsCount}
- Stale Open Issues (>30 days): ${staleIssuesCount}
- Workload Skew / Top Contributor Skew: ${workloadSkew}

You must return a raw JSON response. Do NOT wrap the JSON in markdown code blocks or any other text. Follow this exact JSON schema:
{
  "bottlenecks": [
    {
      "type": "string (e.g., Code Review, Stale Issues, Workload Imbalance)",
      "severity": "high|medium|low",
      "description": "Short description of the bottleneck",
      "suggestion": "How to resolve this bottleneck"
    }
  ],
  "riskLevel": "high|medium|low",
  "topRecommendation": "Primary recommendation to speed up delivery"
}
Do not write anything other than the raw JSON output.`;
};

/**
 * Builds the prompt for Contributor Analysis.
 */
export const buildContributorAnalysisPrompt = (data) => {
  const { repoName, contributors = [] } = data;

  const contributorData = contributors
    .slice(0, 10)
    .map(c => `- ${c.login || c.name || 'Unknown'}: ${c.totalCommits} commits, +${c.additions} additions, -${c.deletions} deletions`)
    .join('\n');

  return `Analyze the following contributor activity data for the repository ${repoName} to identify collaboration and team health.

CONTRIBUTOR STATS:
${contributorData || 'No contributor data.'}

You must return a raw JSON response. Do NOT wrap the JSON in markdown code blocks or any other text. Follow this exact JSON schema:
{
  "activeContributors": 3,
  "inactiveContributors": ["list of inactive or under-contributing usernames"],
  "busContributors": ["list of usernames that handle too much of the codebase representing a bus-factor risk"],
  "teamHealthScore": 8,
  "insights": ["insight1 about team balance", "insight2 about contributions"]
}
Ensure teamHealthScore is a number from 1 to 10. Do not write anything other than the raw JSON output.`;
};

/**
 * Builds the prompt for Task Prioritization Recommendations.
 */
export const buildRecommendationsPrompt = (data) => {
  const { repoName, openIssuesCount = 0, staleIssuesCount = 0, bottleneckRisk = 'low', openPRsCount = 0 } = data;

  return `You are a project manager and tech lead. Provide high-impact recommendations and the next best actions for the team working on ${repoName}.

CURRENT STATE SUMMARY:
- Total Open Issues: ${openIssuesCount}
- Stale Open Issues: ${staleIssuesCount}
- Workload Bottleneck Risk: ${bottleneckRisk}
- Open Pull Requests: ${openPRsCount}

You must return a raw JSON response. Do NOT wrap the JSON in markdown code blocks or any other text. Follow this exact JSON schema:
{
  "recommendations": [
    {
      "priority": "high|medium|low",
      "title": "Actionable task title",
      "reason": "Why this recommendation is important",
      "action": "Immediate action step"
    }
  ],
  "nextBestAction": "A single sentence describing the most critical task to do next"
}
Do not write anything other than the raw JSON output.`;
};

export const buildReleaseReadinessPrompt = (data) => {
  const { repoName, score, status, metrics = {}, riskFactors = [], recommendations = [] } = data;

  return `Based on these repository health metrics for ${repoName}, generate 3 concise reasons and 3 practical recommendations for release readiness. Do not invent data. Use only provided metrics.

SUMMARY:
- Readiness Score: ${score}
- Status: ${status}
- Open PRs: ${metrics.openPrs ?? 0}
- Stale PRs: ${metrics.stalePrs ?? 0}
- Open Issues: ${metrics.openIssues ?? 0}
- Stale Issues: ${metrics.staleIssues ?? 0}
- Recent Commits: ${metrics.recentCommits ?? 0}
- Previous Period Commits: ${metrics.previousCommits ?? 0}
- Commit Drop Percentage: ${metrics.commitDropPercentage ?? 0}
- Contributor Imbalance: ${metrics.contributorImbalance ?? 0}
- Average PR Merge Time Hours: ${metrics.avgMergeTimeHours ?? 0}
- Failed Builds: ${metrics.failedBuilds ?? 0}
- Build Health Available: ${metrics.buildHealthAvailable ? 'yes' : 'no'}

RULE-BASED SIGNALS:
Reasons: ${riskFactors.join('; ') || 'No major release blockers detected'}
Recommendations: ${recommendations.join('; ') || 'Keep monitoring release signals'}

You must return a raw JSON response. Do NOT wrap the JSON in markdown code blocks or any other text. Follow this exact JSON schema:
{
  "riskFactors": ["reason1", "reason2", "reason3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}
Do not write anything other than the raw JSON output.`;
};

export const buildWorkloadIntelligencePrompt = (data) => {
  const { repoName, status, topRisk = '', contributors = [] } = data;

  const contributorSummary = contributors
    .slice(0, 8)
    .map((contributor) => `- ${contributor.name}: workload ${contributor.workloadShare}%, commits ${contributor.commitCount}, open PRs ${contributor.openPrCount}, assigned issues ${contributor.assignedIssueCount}, review load ${contributor.reviewLoadCount}`)
    .join('\n');

  return `Based on these contributor workload metrics for ${repoName}, generate professional suggestions to reduce workload imbalance. Avoid blaming individuals. Use only provided metrics.

WORKLOAD SUMMARY:
- Overall Status: ${status}
- Top Risk: ${topRisk || 'None'}

CONTRIBUTORS:
${contributorSummary || 'No contributor workload data available.'}

You must return a raw JSON response. Do NOT wrap the JSON in markdown code blocks or any other text. Follow this exact JSON schema:
{
  "topRisk": "professional top risk statement",
  "recommendations": ["suggestion1", "suggestion2", "suggestion3"]
}
Do not write anything other than the raw JSON output.`;
};

export const buildSprintRetrospectivePrompt = (data) => {
  const { repoName, range, metrics = {}, releaseReadiness = {}, workloadHealth = {} } = data;

  return `Generate a sprint retrospective for ${repoName} with sections: What went well, What went wrong, Risks, Action items. Use only the provided repository metrics. Be concise and practical.

PERIOD:
- Range: ${range}

REPOSITORY METRICS:
- Commits: ${metrics.commits ?? 0}
- Previous Period Commits: ${metrics.previousCommits ?? 0}
- Commit Change Percentage: ${metrics.commitChangePercentage ?? 0}
- PRs Created: ${metrics.prsCreated ?? 0}
- PRs Merged: ${metrics.prsMerged ?? 0}
- Issues Opened: ${metrics.issuesOpened ?? 0}
- Issues Closed: ${metrics.issuesClosed ?? 0}
- Stale PRs: ${metrics.stalePrs ?? 0}
- Stale Issues: ${metrics.staleIssues ?? 0}

INTELLIGENCE SIGNALS:
- Release Readiness: ${releaseReadiness.score ?? 0}% (${releaseReadiness.status || 'unknown'})
- Workload Health: ${workloadHealth.status || 'unknown'}
- Workload Top Risk: ${workloadHealth.topRisk || 'None'}

You must return a raw JSON response. Do NOT wrap the JSON in markdown code blocks or any other text. Follow this exact JSON schema:
{
  "summary": "one concise executive summary sentence",
  "whatWentWell": ["item1", "item2", "item3"],
  "whatWentWrong": ["item1", "item2", "item3"],
  "risks": ["risk1", "risk2", "risk3"],
  "actionItems": ["action1", "action2", "action3"]
}
Do not write anything other than the raw JSON output.`;
};
