import React from 'react';
import useGithub from '../hooks/useGithub';
import EmptyState from '../components/common/EmptyState';

export default function CommitsPage() {
  const { selectedRepo } = useGithub();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Commit Analytics</h1>
          <p className="text-sm text-gray-400">Detailed repository commit logs and trends over time.</p>
        </div>
      </div>

      {!selectedRepo ? (
        <EmptyState
          title="No repository selected"
          description="Please select a repository in the top bar or connect your GitHub account in settings to view commit history."
        />
      ) : (
        <div className="bg-gray-900 border border-gray-850 rounded-xl p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Commit Analytics Coming Soon</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Deep-dive charts showing daily commit activity, line graphs of contributions, and commit lists for <strong className="text-indigo-400">{selectedRepo.fullName}</strong> will be implemented in Session 8.
          </p>
        </div>
      )}
    </div>
  );
}
