import React from 'react';

/**
 * ContributorAnalysisCard displays insights on team health, activity levels, and project dependency skews.
 * Inputs from parsedData shape:
 * {
 *   activeContributors: number,
 *   inactiveContributors: Array<string>,
 *   busContributors: Array<string>,
 *   teamHealthScore: number (1-10),
 *   insights: Array<string>
 * }
 */
export default function ContributorAnalysisCard({ parsedData }) {
  const getHealthStyles = (score) => {
    if (score >= 8) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5';
    if (score >= 5) return 'text-amber-500 border-amber-500/30 bg-amber-500/5';
    return 'text-red-500 border-red-500/30 bg-red-500/5';
  };

  if (!parsedData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-xs">No cached contributor health analysis found for this repository.</p>
        <p className="text-[10px] text-gray-400 mt-1">Use the Generate action above to inspect commit counts, heatmaps, and churn alerts.</p>
      </div>
    );
  }

  if (parsedData._aiError) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-2 text-center">
        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <h4 className="text-sm font-semibold text-gray-200">AI Service Unavailable</h4>
        <p className="text-xs text-gray-400 leading-relaxed">{parsedData._aiErrorMessage || 'Gemini AI is temporarily unavailable. Please check your API key configuration and try again.'}</p>
      </div>
    );
  }

  const {
    activeContributors = 0,
    inactiveContributors = [],
    busContributors = [],
    teamHealthScore = 5,
    insights = []
  } = parsedData;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Team Health Score */}
        <div className="ai-insight-surface flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-950/20">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Collaboration Score</span>
            <p className="text-sm font-semibold text-gray-200">
              {teamHealthScore >= 8 ? 'Excellent Health' : teamHealthScore >= 5 ? 'Steady Operations' : 'High Delivery Churn'}
            </p>
          </div>
          <div className={`flex items-center justify-center h-10 w-10 rounded-full border text-center font-bold text-base shrink-0 ${getHealthStyles(teamHealthScore)}`}>
            {teamHealthScore}
          </div>
        </div>

        {/* Active Contributors Metric */}
        <div className="ai-insight-surface flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-950/20">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Active Contributors</span>
            <p className="text-sm font-bold text-indigo-400">{activeContributors} Active</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Skews Grid: Inactive Contributors & Bus Contributors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bus Factor / Redundancy Redundancies */}
        <div className="ai-list-panel bg-gray-950/20 border border-gray-800/80 rounded-xl p-4.5 space-y-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5"></span>
              Bus Factor Risk
            </span>
            <p className="text-[10px] text-gray-400">Contributors whose absence would halt or delay core features.</p>
          </div>

          {busContributors.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {busContributors.map((user, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20"
                >
                  @{user}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No critical bus factor dependencies identified. Good knowledge spread!</p>
          )}
        </div>

        {/* Churn Alert / Inactive Members */}
        <div className="ai-list-panel bg-gray-950/20 border border-gray-800/80 rounded-xl p-4.5 space-y-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5"></span>
              Inactive Alert (&gt;14d)
            </span>
            <p className="text-[10px] text-gray-400">Team members with zero active commits in the last two weeks.</p>
          </div>

          {inactiveContributors.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {inactiveContributors.map((user, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20"
                >
                  @{user}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">All team members have contributed recently. Great engagement!</p>
          )}
        </div>
      </div>

      {/* General Team Insights */}
      {insights.length > 0 && (
        <div className="space-y-3 pt-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Team Health Diagnostics</span>
          <ul className="space-y-2.5">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start text-xs text-gray-300 font-normal leading-relaxed">
                <span className="text-indigo-400 mr-2 shrink-0">&gt;</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
