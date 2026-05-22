import React from 'react';
import useGithub from '../hooks/useGithub';
import EmptyState from '../components/common/EmptyState';

export default function InsightsPage() {
  const { selectedRepo } = useGithub();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Developer Insights</h1>
          <p className="text-sm text-gray-400">Gemini-driven sprint summaries, bottleneck detections, and priorities.</p>
        </div>
      </div>

      {!selectedRepo ? (
        <EmptyState
          title="No repository selected"
          description="Please select a repository in the top bar or connect your GitHub account in settings to generate AI developer insights."
        />
      ) : (
        <div className="bg-gray-900 border border-gray-850 rounded-xl p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-200">AI Insights Board Coming Soon</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            High-fidelity AI sprint summaries, pipeline analysis panels, and actionable developer recommendations for <strong className="text-indigo-400">{selectedRepo.fullName}</strong> will be implemented in Session 9.
          </p>
        </div>
      )}
    </div>
  );
}
