import React, { useState, useEffect, useCallback } from 'react';
import useRepoStore from '../store/repoStore';
import useAnalytics from '../hooks/useAnalytics';
import EmptyState from '../components/common/EmptyState';
import SkeletonLoader from '../components/common/SkeletonLoader';
import Button from '../components/common/Button';
import ContributorRadarChart from '../components/charts/ContributorRadarChart';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { formatDate } from '../utils/dateHelpers';
import { ArrowPathIcon, UserIcon } from '@heroicons/react/24/outline';
import SyncButton from '../components/dashboard/SyncButton';

export default function ContributorsPage() {
  const selectedRepo = useRepoStore((state) => state.selectedRepo);
  const {
    contributors,
    fetchContributors
  } = useAnalytics();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadContributorsData = useCallback(async (repoId) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      await fetchContributors(repoId);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch contributors data.');
    } finally {
      setLoading(false);
    }
  }, [fetchContributors]);

  useEffect(() => {
    if (selectedRepo && selectedRepo._id) {
      loadContributorsData(selectedRepo._id);
    }
  }, [selectedRepo, loadContributorsData]);

  if (!selectedRepo) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Repository Contributors</h1>
          <p className="text-sm text-gray-400">Detailed contributors lists, commits, additions, and deletions.</p>
        </div>
        <EmptyState
          title="No Repository Selected"
          description="Please select a repository in the top bar or connect your GitHub account in settings to view contributor logs."
        />
      </div>
    );
  }

  if (selectedRepo && !selectedRepo._id) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Repository Contributors</h1>
          <p className="text-sm text-gray-400">Detailed contributors lists, commits, additions, and deletions.</p>
        </div>
        <EmptyState
          title="Sync Required"
          description="To view contributor profiles, Radar charts, additions, and deletions, we first need to import this repository's data from GitHub."
          action={
            <div className="flex justify-center">
              <SyncButton />
            </div>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Repository Contributors</h1>
          <p className="text-sm text-gray-400">Detailed contributors lists, commits, additions, and deletions.</p>
        </div>
        <EmptyState
          title="Failed to Load Data"
          description={error}
          action={
            <Button variant="primary" onClick={() => loadContributorsData(selectedRepo._id)} className="space-x-2">
              <ArrowPathIcon className="h-4 w-4" />
              <span>Retry Load</span>
            </Button>
          }
        />
      </div>
    );
  }

  const list = contributors || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Repository Contributors</h1>
          <p className="text-sm text-gray-400">Detailed contributors lists, commits, additions, and deletions for <span className="text-indigo-400 font-semibold">{selectedRepo.name}</span></p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[380px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse lg:col-span-1"></div>
          <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 h-[380px] animate-pulse lg:col-span-2"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Radar Chart Preview */}
          <div className="lg:col-span-1">
            <ErrorBoundary>
              <ContributorRadarChart contributors={list} title="Top Contributors Axes" />
            </ErrorBoundary>
          </div>

          {/* Right Contributors Table list */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-850 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-150">Contributor Profiles</h3>
              <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700/50 px-2 py-0.5 rounded-md font-mono">
                Active: {list.length} Authors
              </span>
            </div>

            {list.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">No active contributors found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-950/20 border-b border-gray-800 text-[10px] uppercase font-bold tracking-wider text-gray-400 select-none">
                      <th className="py-3.5 px-5">Contributor</th>
                      <th className="py-3.5 px-5 text-right">Total Commits</th>
                      <th className="py-3.5 px-5 text-right">Additions</th>
                      <th className="py-3.5 px-5 text-right">Deletions</th>
                      <th className="py-3.5 px-5 text-right">Files Changed</th>
                      <th className="py-3.5 px-5">Last Commit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850 text-xs text-gray-300">
                    {list.map((c, idx) => (
                      <tr key={c.login || idx} className="hover:bg-gray-850/30 transition-all duration-150">
                        <td className="py-3.5 px-5 flex items-center space-x-3">
                          {c.avatarUrl ? (
                            <img
                              className="h-8 w-8 rounded-full border border-gray-800"
                              src={c.avatarUrl}
                              alt={c.login || 'Avatar'}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full border border-gray-800 bg-gray-850 flex items-center justify-center text-gray-500">
                              <UserIcon className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-150">{c.name || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-500">@{c.login || 'username'}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-indigo-400 font-semibold">
                          {c.totalCommits || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-emerald-400">
                          +{c.additions || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-rose-400">
                          -{c.deletions || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-gray-400">
                          {c.filesChanged || 0}
                        </td>
                        <td className="py-3.5 px-5 text-gray-400 font-medium">
                          {c.lastCommitAt ? formatDate(c.lastCommitAt) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
