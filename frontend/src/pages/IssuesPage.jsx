import React, { useState, useEffect, useCallback } from 'react';
import useGithub from '../hooks/useGithub';
import useAnalytics from '../hooks/useAnalytics';
import EmptyState from '../components/common/EmptyState';
import SkeletonLoader from '../components/common/SkeletonLoader';
import Button from '../components/common/Button';
import IssueHeatmap from '../components/charts/IssueHeatmap';
import StatsCard from '../components/dashboard/StatsCard';
import Badge from '../components/common/Badge';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { formatDate } from '../utils/dateHelpers';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function IssuesPage() {
  const { selectedRepo } = useGithub();
  const {
    issues,
    fetchIssues
  } = useAnalytics();

  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadIssuesData = useCallback(async (repoId, currPage, filter) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      await fetchIssues(repoId, { page: currPage, limit: 10, state: filter });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch issues.');
    } finally {
      setLoading(false);
    }
  }, [fetchIssues]);

  useEffect(() => {
    if (selectedRepo) {
      loadIssuesData(selectedRepo._id, page, stateFilter);
    }
  }, [selectedRepo, page, stateFilter, loadIssuesData]);

  // Reset page when filter or repository changes
  useEffect(() => {
    setPage(1);
  }, [stateFilter, selectedRepo]);

  if (!selectedRepo) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Issue Tracker</h1>
          <p className="text-sm text-gray-400">Detailed issues summaries, state grids, and active workflows.</p>
        </div>
        <EmptyState
          title="No Repository Selected"
          description="Please select a repository in the top bar or connect your GitHub account in settings to view issue trackers."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Issue Tracker</h1>
          <p className="text-sm text-gray-400">Detailed issues summaries, state grids, and active workflows.</p>
        </div>
        <EmptyState
          title="Failed to Load Data"
          description={error}
          action={
            <Button variant="primary" onClick={() => loadIssuesData(selectedRepo._id, page, stateFilter)} className="space-x-2">
              <ArrowPathIcon className="h-4 w-4" />
              <span>Retry Load</span>
            </Button>
          }
        />
      </div>
    );
  }

  const issueList = issues?.issues || [];
  const openCount = issues?.summary?.open ?? 0;
  const closedCount = issues?.summary?.closed ?? 0;
  const totalPages = issues?.totalPages || 1;
  const totalIssues = issues?.total || 0;

  const getBadgeVariant = (state) => {
    if (state === 'closed') return 'success';
    return 'warning';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Issue Tracker</h1>
          <p className="text-sm text-gray-400">Detailed issues summaries, state grids, and active workflows for <span className="text-indigo-400 font-semibold">{selectedRepo.name}</span></p>
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-24 bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
            <div className="h-24 bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-[380px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse lg:col-span-1"></div>
            <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 h-[380px] animate-pulse lg:col-span-2"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <StatsCard
              label="Open Issues"
              value={openCount}
              icon={ExclamationCircleIcon}
              loading={loading}
              description="Needs attention and work"
            />
            <StatsCard
              label="Closed Issues"
              value={closedCount}
              icon={CheckCircleIcon}
              loading={loading}
              description="Resolved or closed"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Heatmap Preview */}
            <div className="lg:col-span-1">
              <ErrorBoundary>
                <IssueHeatmap issues={issueList} title="Issue Volume Trends" />
              </ErrorBoundary>
            </div>

            {/* Right Table list */}
            <div className="lg:col-span-2 bg-gray-900 border border-gray-850 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-150">Issues Log Details</h3>
                  <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700/50 px-2 py-0.5 rounded-md font-mono">
                    Found: {totalIssues} Issues
                  </span>
                </div>

                {issueList.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs">No issues found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-950/20 border-b border-gray-800 text-[10px] uppercase font-bold tracking-wider text-gray-400 select-none">
                          <th className="py-3.5 px-5">Issue</th>
                          <th className="py-3.5 px-5">State</th>
                          <th className="py-3.5 px-5">Author</th>
                          <th className="py-3.5 px-5">Created At</th>
                          <th className="py-3.5 px-5">Closed At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850 text-xs text-gray-300">
                        {issueList.map((issue) => (
                          <tr key={issue.number} className="hover:bg-gray-850/30 transition-all duration-150">
                            <td className="py-3.5 px-5 font-semibold text-gray-150 max-w-xs truncate">
                              <span className="text-gray-500 mr-1.5">#{issue.number}</span>
                              {issue.title}
                            </td>
                            <td className="py-3.5 px-5">
                              <Badge variant={getBadgeVariant(issue.state)}>
                                {issue.state}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-5 font-semibold text-indigo-400">
                              {issue.author || 'Unknown'}
                            </td>
                            <td className="py-3.5 px-5 text-gray-400">
                              {formatDate(issue.githubCreatedAt || issue.createdAt)}
                            </td>
                            <td className="py-3.5 px-5 text-gray-400">
                              {issue.closedAt ? formatDate(issue.closedAt) : '--'}
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
        </>
      )}
    </div>
  );
}
