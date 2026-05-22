import React, { useState } from 'react';
import { getISODateString, getDaysAgo } from '../../utils/dateHelpers';

/**
 * SprintSummaryCard displays sprint productivity summary.
 * Inputs from parsedData shape:
 * {
 *   summary: string,
 *   velocity: string,
 *   highlights: Array<string>,
 *   concerns: Array<string>,
 *   sprintScore: number (1-10)
 * }
 */
export default function SprintSummaryCard({
  parsedData,
  onGenerate,
  generating = false
}) {
  const [from, setFrom] = useState(() => getDaysAgo(14));
  const [to, setTo] = useState(() => getDaysAgo(0));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onGenerate) {
      onGenerate(from, to);
    }
  };

  const scoreColor = (score) => {
    if (score >= 8) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5';
    if (score >= 5) return 'text-amber-500 border-amber-500/30 bg-amber-500/5';
    return 'text-red-500 border-red-500/30 bg-red-500/5';
  };

  return (
    <div className="space-y-6">
      {/* Date Scoping Input Form */}
      <form onSubmit={handleSubmit} className="bg-gray-950/40 p-4 rounded-xl border border-gray-800/80 space-y-4">
        <div className="flex flex-col space-y-1.5">
          <span className="text-xs font-semibold text-gray-300">Set Sprint Scoping Range</span>
          <p className="text-[10px] text-gray-400">Determine the repository activity dates to compile into the summary.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="sprint-from" className="text-[10px] uppercase font-bold tracking-wider text-gray-400">From</label>
            <input
              id="sprint-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="sprint-to" className="text-[10px] uppercase font-bold tracking-wider text-gray-400">To</label>
            <input
              id="sprint-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={generating}
          className="w-full inline-flex items-center justify-center font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 shadow-sm"
        >
          {generating ? 'Analyzing Scope...' : 'Update Sprint Analysis'}
        </button>
      </form>

      {/* Structured Sprint Summary Display */}
      {parsedData ? (
        <div className="space-y-5">
          {/* Executive Overview Row */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-800 bg-gray-950/20">
            {/* Score Ring */}
            <div className="flex items-center space-x-3.5">
              <div className={`flex flex-col items-center justify-center h-12 w-12 rounded-full border text-center ${scoreColor(parsedData.sprintScore)}`}>
                <span className="text-lg font-bold leading-none">{parsedData.sprintScore}</span>
                <span className="text-[7px] uppercase font-semibold text-gray-400">Score</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Sprint Health Score</span>
                <p className="text-xs font-semibold text-gray-200">
                  {parsedData.sprintScore >= 8 ? 'Excellent Productivity' : parsedData.sprintScore >= 5 ? 'Steady Pace' : 'Impediments Flagged'}
                </p>
              </div>
            </div>
            
            {/* Velocity Rating */}
            <div className="text-right space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Team Velocity</span>
              <div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                  String(parsedData.velocity).toLowerCase().includes('high') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  String(parsedData.velocity).toLowerCase().includes('low') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {String(parsedData.velocity).split(' ')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Core Executive Summary */}
          {parsedData.summary && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Executive Summary</span>
              <p className="text-sm text-gray-300 leading-relaxed font-normal">{parsedData.summary}</p>
            </div>
          )}

          {/* Highlights & Concerns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highlights Block */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                Key Highlights
              </span>
              {parsedData.highlights && parsedData.highlights.length > 0 ? (
                <ul className="space-y-2">
                  {parsedData.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start text-xs text-gray-300 font-normal leading-relaxed">
                      <span className="text-emerald-500 mr-2 shrink-0">✓</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 italic">No highlights listed.</p>
              )}
            </div>

            {/* Concerns Block */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                Sprint Impediments
              </span>
              {parsedData.concerns && parsedData.concerns.length > 0 ? (
                <ul className="space-y-2">
                  {parsedData.concerns.map((concern, idx) => (
                    <li key={idx} className="flex items-start text-xs text-gray-300 font-normal leading-relaxed">
                      <span className="text-amber-500 mr-2 shrink-0">⚠</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 italic">No critical concerns identified.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 space-y-2">
          <p className="text-xs">No cached summary found for this repository.</p>
          <p className="text-[10px] text-gray-400">Configure date scope above and click Update or use Generate to compile raw commit logs.</p>
        </div>
      )}
    </div>
  );
}
