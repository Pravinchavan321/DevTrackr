import React, { useState, useEffect, useCallback } from 'react';
import useRepoStore from '../store/repoStore';
import useAnalytics from '../hooks/useAnalytics';
import EmptyState from '../components/common/EmptyState';
import SkeletonLoader from '../components/common/SkeletonLoader';
import Button from '../components/common/Button';
import CommitBarChart from '../components/charts/CommitBarChart';
import CommitLineChart from '../components/charts/CommitLineChart';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { formatDate } from '../utils/dateHelpers';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import SyncButton from '../components/dashboard/SyncButton';

export default function CommitsPage() {
  const selectedRepo = useRepoStore((state) => state.selectedRepo);
  const {
    commits,
    commitChart,
    fetchCommits,
    fetchCommitChart
  } = useAnalytics();

  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCommitsData = useCallback(async (repoId, currPage, grpBy) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCommits(repoId, { page: currPage, limit: 10 }),
        fetchCommitChart(repoId, { groupBy: grpBy })
      ]);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch commit records.');
    } finally {
      setLoading(false);
    }
  }, [fetchCommits, fetchCommitChart]);

  useEffect(() => {
    if (selectedRepo && selectedRepo._id) {
      loadCommitsData(selectedRepo._id, page, groupBy);
    }
  }, [selectedRepo, page, groupBy, loadCommitsData]);

  // Handle repository change (reset page)
  useEffect(() => {
    setPage(1);
  }, [selectedRepo]);

  if (!selectedRepo) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Commit Analytics</h1>
          <p className="text-sm text-gray-400">Detailed repository commit logs and trends over time.</p>
        </div>
        <EmptyState
          title="No Repository Selected"
          description="Please select a repository in the top bar or connect your GitHub account in settings to view commit history."
        />
      </div>
    );
  }

  if (selectedRepo && !selectedRepo._id) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Commit Analytics</h1>
          <p className="text-sm text-gray-405">Detailed repository commit logs and trends over time.</p>
        </div>
        <EmptyState
          title="Sync Required"
          description="To view commit logs, daily frequencies, and volume trends, we first need to import this repository's data from GitHub."
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Commit Analytics</h1>
          <p className="text-sm text-gray-400">Detailed repository commit logs and trends over time.</p>
        </div>
        <EmptyState
          title="Failed to Load Data"
          description={error}
          action={
            <Button variant="primary" onClick={() => loadCommitsData(selectedRepo._id, page, groupBy)} className="space-x-2">
              <ArrowPathIcon className="h-4 w-4" />
              <span>Retry Load</span>
            </Button>
          }
        />
      </div>
    );
  }

  const commitList = commits?.commits || [];
  const totalPages = commits?.totalPages || 1;
  const totalCommits = commits?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Commit Analytics</h1>
          <p className="text-sm text-gray-400">Detailed repository commit logs and trends over time for <span className="text-indigo-400 font-semibold">{selectedRepo.name}</span></p>
        </div>

        {/* Group By Toggle */}
        <div className="flex items-center space-x-1.5 bg-gray-900 border border-gray-850 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setGroupBy('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              groupBy === 'day'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-250'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setGroupBy('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              groupBy === 'week'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-250'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[380px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
            <div className="h-[380px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
          </div>
          <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 h-[400px] animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* Charts Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary>
              <CommitBarChart data={commitChart} title="Commit Volume" />
            </ErrorBoundary>
            <ErrorBoundary>
              <CommitLineChart data={commitChart} title="Commit Activity Flow" />
            </ErrorBoundary>
          </div>

          {/* Table list */}
          <div className="bg-gray-900 border border-gray-850 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-150">Commit Log Details</h3>
              <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700/50 px-2 py-0.5 rounded-md font-mono">
                Total: {totalCommits} Commits
              </span>
            </div>

            {commitList.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">No commits recorded in this repository.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-950/20 border-b border-gray-800 text-[10px] uppercase font-bold tracking-wider text-gray-400 select-none">
                      <th className="py-3.5 px-5">Message</th>
                      <th className="py-3.5 px-5">Author</th>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5 text-right">Additions</th>
                      <th className="py-3.5 px-5 text-right">Deletions</th>
                      <th className="py-3.5 px-5 text-right">Files Changed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850 text-xs text-gray-300">
                    {commitList.map((commit) => (
                      <tr key={commit.sha} className="hover:bg-gray-850/30 transition-all duration-150">
                        <td className="py-3.5 px-5 font-medium text-gray-150 max-w-sm truncate">
                          {commit.message}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-indigo-400">
                          {commit.author?.login || commit.author?.name || 'Unknown'}
                        </td>
                        <td className="py-3.5 px-5 text-gray-400">
                          {formatDate(commit.committedAt)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-emerald-400">
                          +{commit.additions || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-rose-400">
                          -{commit.deletions || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-gray-400">
                          {commit.filesChanged || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-800 bg-gray-900 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Page <span className="font-semibold text-gray-200">{page}</span> of{' '}
                  <span className="font-semibold text-gray-200">{totalPages}</span>
                </span>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-950/20 text-gray-400 disabled:opacity-30"
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-950/20 text-gray-400 disabled:opacity-30"
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
