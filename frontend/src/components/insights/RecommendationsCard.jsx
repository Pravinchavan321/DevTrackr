import React from 'react';

/**
 * RecommendationsCard displays actionable engineering recommendations.
 * Inputs from parsedData shape:
 * {
 *   recommendations: Array<{ priority: 'high'|'medium'|'low', title: string, reason: string, action: string }>,
 *   nextBestAction: string
 * }
 */
export default function RecommendationsCard({ parsedData }) {
  const getPriorityBadge = (priority) => {
    const p = String(priority).toLowerCase();
    if (p === 'high') {
      return (
        <span className="inline-flex items-center rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20 uppercase tracking-wider">
          High
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20 uppercase tracking-wider">
          Med
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-400 border border-gray-700 uppercase tracking-wider">
        Low
      </span>
    );
  };

  if (!parsedData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-xs">No cached recommendations found for this repository.</p>
        <p className="text-[10px] text-gray-400 mt-1">Use the Generate action above to formulate prioritization recommendations.</p>
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

  const { recommendations = [], nextBestAction } = parsedData;

  return (
    <div className="space-y-6">
      {/* Strategic Focus - Next Best Action Callout */}
      {nextBestAction && (
        <div className="ai-callout-violet bg-gradient-to-r from-violet-900/30 to-violet-950/20 border border-violet-500/30 p-5 rounded-xl space-y-2 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-violet-500/10 scale-150">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="space-y-0.5 relative z-10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">Team Critical Path Action</span>
            <h4 className="text-sm font-bold text-gray-100">Immediate Recommended Focus</h4>
          </div>
          <p className="text-xs text-violet-100/90 leading-relaxed font-normal relative z-10">{nextBestAction}</p>
        </div>
      )}

      {/* Action Items List */}
      <div className="space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Prioritized Action Items</span>
        
        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((item, idx) => (
              <div key={idx} className="ai-list-panel flex gap-4 p-4.5 bg-gray-950/20 border border-gray-800/80 rounded-xl transition-colors hover:border-gray-700/50">
                {/* Numeric Index Bullet */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white shadow-md shadow-violet-500/30">
                  {idx + 1}
                </div>

                {/* Content Block */}
                <div className="flex-1 space-y-2.5">
                  {/* Title and Badge Row */}
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-xs font-semibold text-gray-200 leading-snug">{item.title}</h4>
                    <div className="shrink-0">{getPriorityBadge(item.priority)}</div>
                  </div>

                  {/* Description / Reasoning */}
                  {item.reason && (
                    <p className="text-xs text-gray-400 leading-relaxed font-normal">
                      {item.reason}
                    </p>
                  )}

                  {/* Concrete Action step */}
                  {item.action && (
                    <div className="bg-gray-950/40 p-3 rounded-lg border border-gray-900 text-xs text-gray-300 font-normal leading-relaxed">
                      <span className="font-semibold text-violet-400 mr-1">Steps:</span>
                      {item.action}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-gray-800 bg-gray-950/10 rounded-xl">
            <svg className="h-6 w-6 text-emerald-500 opacity-60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-400">All Core Milestones Addressed</p>
            <p className="text-[10px] text-gray-500 mt-0.5">No supplementary action steps or prioritizations are recommended currently.</p>
          </div>
        )}
      </div>
    </div>
  );
}
