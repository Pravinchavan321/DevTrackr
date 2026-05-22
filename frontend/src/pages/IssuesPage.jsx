import React from 'react';
import useGithub from '../hooks/useGithub';
import EmptyState from '../components/common/EmptyState';

export default function IssuesPage() {
  const { selectedRepo } = useGithub();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Issue Tracking</h1>
          <p className="text-sm text-gray-400">Monitor issue resolution velocity, ratios, and individual task counts.</p>
        </div>
      </div>

      {!selectedRepo ? (
        <EmptyState
          title="No repository selected"
          description="Please select a repository in the top bar or connect your GitHub account in settings to view issue lists."
        />
      ) : (
        <div className="bg-gray-900 border border-gray-850 rounded-xl p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-200">Issue Tracking Coming Soon</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Dynamic lists showing open and closed issues, resolution time trends, and issue status statistics for <strong className="text-indigo-400">{selectedRepo.fullName}</strong> will be implemented in Session 8.
          </p>
        </div>
      )}
    </div>
  );
}
