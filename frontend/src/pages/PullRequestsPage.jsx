import React, { useState, useEffect, useCallback } from 'react';
import useGithub from '../hooks/useGithub';
import useAnalytics from '../hooks/useAnalytics';
import EmptyState from '../components/common/EmptyState';
import SkeletonLoader from '../components/common/SkeletonLoader';
import Button from '../components/common/Button';
import PRStatusPieChart from '../components/charts/PRStatusPieChart';
import Badge from '../components/common/Badge';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { formatDate } from '../utils/dateHelpers';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import SyncButton from '../components/dashboard/SyncButton';

export default function PullRequestsPage() {
  const { selectedRepo } = useGithub();
  const {
    pullRequests,
    fetchPullRequests
  } = useAnalytics();

  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPRsData = useCallback(async (repoId, currPage, filter) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      await fetchPullRequests(repoId, { page: currPage, limit: 10, state: filter });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pull requests.');
    } finally {
      setLoading(false);
    }
  }, [fetchPullRequests]);

  useEffect(() => {
    if (selectedRepo && selectedRepo._id) {
      loadPRsData(selectedRepo._id, page, stateFilter);
    }
  }, [selectedRepo, page, stateFilter, loadPRsData]);

  // Reset page when filter or repository changes
  useEffect(() => {
    setPage(1);
  }, [stateFilter, selectedRepo]);

  if (!selectedRepo) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Pull Requests</h1>
          <p className="text-sm text-gray-400">Detailed pull request merges, durations, and state splits.</p>
        </div>
        <EmptyState
          title="No Repository Selected"
          description="Please select a repository in the top bar or connect your GitHub account in settings to view pull request history."
        />
      </div>
    );
  }

  if (selectedRepo && !selectedRepo._id) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Pull Requests</h1>
          <p className="text-sm text-gray-400">Detailed pull request merges, durations, and state splits.</p>
        </div>
        <EmptyState
          title="Sync Required"
          description="To view pull request summaries, merge volumes, and duration details, we first need to import this repository's data from GitHub."
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Pull Requests</h1>
          <p className="text-sm text-gray-400">Detailed pull request merges, durations, and state splits.</p>
        </div>
        <EmptyState
          title="Failed to Load Data"
          description={error}
          action={
            <Button variant="primary" onClick={() => loadPRsData(selectedRepo._id, page, stateFilter)} className="space-x-2">
              <ArrowPathIcon className="h-4 w-4" />
              <span>Retry Load</span>
            </Button>
          }
        />
      </div>
    );
  }

  const prList = pullRequests?.pullRequests || [];
  const totalPages = pullRequests?.totalPages || 1;
  const totalPRs = pullRequests?.total || 0;

  const getBadgeVariant = (state) => {
    if (state === 'merged') return 'success';
    if (state === 'closed') return 'danger';
    return 'warning';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pull Requests</h1>
          <p className="text-sm text-gray-400">Detailed pull request merges, durations, and state splits for <span className="text-indigo-400 font-semibold">{selectedRepo.name}</span></p>
        </div>

        {/* State Filter */}
        <div className="flex items-center space-x-1.5 bg-gray-900 border border-gray-850 p-1 rounded-xl self-start sm:self-center">
          {['all', 'open', 'closed'].map((filterVal) => (
            <button
              key={filterVal}
              onClick={() => setStateFilter(filterVal)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide capitalize transition-all ${
                stateFilter === filterVal
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-250'
              }`}
            >
              {filterVal}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[380px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse lg:col-span-1"></div>
          <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 h-[380px] animate-pulse lg:col-span-2"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Pie Chart Preview */}
          <div className="lg:col-span-1">
            <ErrorBoundary>
              <PRStatusPieChart pullRequests={prList} title="PR Ratio Distribution" />
            </ErrorBoundary>
          </div>

          {/* Right Table list */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-850 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-150">PR History Details</h3>
                <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700/50 px-2 py-0.5 rounded-md font-mono">
                  Found: {totalPRs} PRs
                </span>
              </div>

              {prList.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">No pull requests found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-950/20 border-b border-gray-800 text-[10px] uppercase font-bold tracking-wider text-gray-400 select-none">
                        <th className="py-3.5 px-5">PR</th>
                        <th className="py-3.5 px-5">State</th>
                        <th className="py-3.5 px-5">Author</th>
                        <th className="py-3.5 px-5 text-right">Duration</th>
                        <th className="py-3.5 px-5">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850 text-xs text-gray-300">
                      {prList.map((pr) => (
                        <tr key={pr.number} className="hover:bg-gray-850/30 transition-all duration-150">
                          <td className="py-3.5 px-5 font-semibold text-gray-150 max-w-xs truncate">
                            <span className="text-gray-500 mr-1.5">#{pr.number}</span>
                            {pr.title}
                          </td>
                          <td className="py-3.5 px-5">
                            <Badge variant={getBadgeVariant(pr.state)}>
                              {pr.state}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-5 font-semibold text-indigo-400">
                            {pr.author || 'Unknown'}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono text-gray-200">
                            {pr.mergeTimeHours ? `${Math.round(pr.mergeTimeHours)}h` : 'N/A'}
                          </td>
                          <td className="py-3.5 px-5 text-gray-400">
                            {formatDate(pr.githubCreatedAt || pr.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

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
        </div>
      )}
    </div>
  );
}
