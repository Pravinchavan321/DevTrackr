import React from 'react';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { timeAgo } from '../../utils/dateHelpers';
import SkeletonLoader from '../common/SkeletonLoader';

export default function ActivityFeed({ commits = [], loading = false, selectedRepo }) {
  if (!selectedRepo) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-250">Recent Repository Activity</h3>
          <span className="text-xs text-gray-500 font-mono">Incremental Sync Feed</span>
        </div>
        <SkeletonLoader variant="list" count={3} />
      </div>
    );
  }

  const hasCommits = Array.isArray(commits) && commits.length > 0;

  return (
    <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-150">Recent Repository Activity</h3>
          <span className="text-xs text-gray-500 font-mono">Incremental Sync Feed</span>
        </div>

        {!hasCommits ? (
          <div className="mt-8 text-center py-8">
            <svg
              className="mx-auto h-8 w-8 text-gray-600 mb-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-gray-500 font-medium">No recent commits found</p>
          </div>
        ) : (
          <div className="mt-4 flow-root max-h-[300px] overflow-y-auto pr-1">
            <ul className="-mb-8">
              {commits.map((commit, idx) => (
                <li key={commit.sha || idx}>
                  <div className="relative pb-8">
                    {idx !== commits.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-800/60"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3.5">
                      <div>
                        <span className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-indigo-500/20 text-indigo-400 bg-indigo-500/10 shadow-sm">
                          <CodeBracketIcon className="h-4.5 w-4.5" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-1 flex justify-between space-x-4">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 truncate pr-2 font-medium">
                            {commit.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            by <span className="text-indigo-400 font-semibold">{commit.author?.login || commit.author?.name || 'Unknown'}</span>
                          </p>
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-gray-500 font-medium self-center">
                          <time>{timeAgo(commit.committedAt)}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
