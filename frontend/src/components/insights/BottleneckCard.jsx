import React from 'react';

/**
 * BottleneckCard visualizes systemic pipeline delays and workload skews.
 * Inputs from parsedData shape:
 * {
 *   bottlenecks: Array<{ type: string, severity: 'high'|'medium'|'low', description: string, suggestion: string }>,
 *   riskLevel: 'high'|'medium'|'low',
 *   topRecommendation: string
 * }
 */
export default function BottleneckCard({ parsedData }) {
  const getRiskStyles = (level) => {
    const l = String(level).toLowerCase();
    if (l === 'high') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (l === 'medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  const getSeverityBadge = (severity) => {
    const s = String(severity).toLowerCase();
    if (s === 'high') {
      return (
        <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 uppercase tracking-wide border border-red-500/20">
          High Severity
        </span>
      );
    }
    if (s === 'medium') {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wide border border-amber-500/20">
          Medium Severity
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border border-gray-700">
        Low Severity
      </span>
    );
  };

  if (!parsedData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-xs">No cached bottleneck analysis found for this repository.</p>
        <p className="text-[10px] text-gray-400 mt-1">Use the Generate action above to inspect pipeline metrics and stale logs.</p>
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

  const { bottlenecks = [], riskLevel = 'low', topRecommendation } = parsedData;

  return (
    <div className="space-y-6">
      {/* Risk Level Banner & Top Recommendation Callout */}
      <div className="grid grid-cols-1 gap-4">
        {/* Risk Level Header */}
        <div className={`flex items-center justify-between p-4 rounded-xl border ${getRiskStyles(riskLevel)}`}>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Pipeline Delivery Risk</span>
            <p className="text-sm font-bold capitalize">{riskLevel} Delivery Risk</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-950/20 border border-current/10">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Top Recommendation Box */}
        {topRecommendation && (
          <div className="bg-indigo-950/20 border border-indigo-900/60 p-4 rounded-xl space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Strategic Priority Recommendation</span>
            <p className="text-xs text-indigo-200/90 leading-relaxed font-normal">{topRecommendation}</p>
          </div>
        )}
      </div>

      {/* Bottlenecks List */}
      <div className="space-y-4">
        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Identified Delivery Bottlenecks</span>
        
        {bottlenecks.length > 0 ? (
          <div className="space-y-3.5">
            {bottlenecks.map((item, idx) => (
              <div key={idx} className="bg-gray-950/20 border border-gray-800/80 rounded-xl p-4.5 space-y-3 transition-colors hover:border-gray-700/50">
                {/* Alert Title Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{item.type || 'System alert'}</span>
                    <h4 className="text-xs font-semibold text-gray-200">{item.description}</h4>
                  </div>
                  <div className="shrink-0">{getSeverityBadge(item.severity)}</div>
                </div>

                {/* suggestion block */}
                {item.suggestion && (
                  <div className="pl-3 border-l-2 border-indigo-500/30 py-0.5 text-xs text-gray-400 leading-relaxed font-normal">
                    <span className="font-semibold text-indigo-400 mr-1">Action Idea:</span>
                    {item.suggestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-gray-800 bg-gray-950/10 rounded-xl">
            <svg className="h-6 w-6 text-emerald-500 opacity-60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-400">Zero Delivery Impediments Found</p>
            <p className="text-[10px] text-gray-500 mt-0.5">The pipeline is running efficiently without stale PRs or workflow skew warnings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
