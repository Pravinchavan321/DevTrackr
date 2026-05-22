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

  const { recommendations = [], nextBestAction } = parsedData;

  return (
    <div className="space-y-6">
      {/* Strategic Focus - Next Best Action Callout */}
      {nextBestAction && (
        <div className="bg-gradient-to-r from-indigo-900/30 to-indigo-950/20 border border-indigo-500/30 p-5 rounded-xl space-y-2 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-indigo-500/10 scale-150">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="space-y-0.5 relative z-10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Team Critical Path Action</span>
            <h4 className="text-sm font-bold text-gray-100">Immediate Recommended Focus</h4>
          </div>
          <p className="text-xs text-indigo-100/90 leading-relaxed font-normal relative z-10">{nextBestAction}</p>
        </div>
      )}

      {/* Action Items List */}
      <div className="space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Prioritized Action Items</span>
        
        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4.5 bg-gray-950/20 border border-gray-800/80 rounded-xl transition-colors hover:border-gray-700/50">
                {/* Numeric Index Bullet */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-800 text-xs font-semibold text-gray-400 border border-gray-700/50">
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
                      <span className="font-semibold text-indigo-400 mr-1">Steps:</span>
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
