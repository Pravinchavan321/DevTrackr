import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CommandLineIcon,
  ArrowsRightLeftIcon,
  ExclamationCircleIcon,
  BoltIcon,
  ArrowRightIcon,
  CpuChipIcon,
  CheckCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import useAuth from '../hooks/useAuth';
import useGithub from '../hooks/useGithub';
import useAnalytics from '../hooks/useAnalytics';
import StatsCard from '../components/dashboard/StatsCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import CommitBarChart from '../components/charts/CommitBarChart';
import VelocityAreaChart from '../components/charts/VelocityAreaChart';
import ErrorBoundary from '../components/common/ErrorBoundary';
import SyncButton from '../components/dashboard/SyncButton';

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedRepo, isConnected, checkConnectionStatus, statusLoading } = useGithub();
  
  const {
    velocity,
    commitChart,
    commits,
    fetchVelocity,
    fetchCommitChart,
    fetchCommits
  } = useAnalytics();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Unified load callback
  const loadDashboardData = useCallback(async (repoId) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchVelocity(repoId),
        fetchCommitChart(repoId, { groupBy: 'day' }),
        fetchCommits(repoId, { page: 1, limit: 10 })
      ]);
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading dashboard metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchVelocity, fetchCommitChart, fetchCommits]);

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  useEffect(() => {
    if (selectedRepo && selectedRepo._id) {
      loadDashboardData(selectedRepo._id);
    }
  }, [selectedRepo, loadDashboardData]);

  if (statusLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-850 rounded w-1/4"></div>
        <div className="h-4 bg-gray-850 rounded w-1/2"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-850 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Case 1: GitHub integration is completely disconnected
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome, {user?.name}!</h1>
          <p className="text-sm text-gray-400">Get started by connecting your developer workspaces.</p>
        </div>

        <EmptyState
          title="Connect to GitHub"
          description="DevTrackr works by syncing commits, pull requests, issues, and contributor details directly from your GitHub repositories to analyze development workflows."
          action={
            <Link to="/settings">
              <Button variant="primary" className="space-x-2">
                <span>Go to Settings</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Case 2: GitHub is connected, but no repository has been selected as the active context
  if (!selectedRepo) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back, {user?.name}!</h1>
          <p className="text-sm text-gray-400">Your GitHub account is connected. Select a repository to begin analysis.</p>
        </div>

        <EmptyState
          title="No Repository Selected"
          description="Choose a repository from the selector dropdown in the top bar to initialize sync engines and view metrics dashboards."
        />
      </div>
    );
  }

  // Case 2.5: Repository is selected, but has not been synced yet (no database _id)
  if (selectedRepo && !selectedRepo._id) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Repository: {selectedRepo.name}</h1>
          <p className="text-sm text-gray-400">This repository has not been synced with DevTrackr yet.</p>
        </div>

        <EmptyState
          title="Sync Required"
          description="To view charts, commit timeline activity, and generate AI-powered engineering insights, we first need to import this repository's commits, issues, and pull requests from GitHub."
          action={
            <div className="flex justify-center">
              <SyncButton />
            </div>
          }
        />
      </div>
    );
  }

  // Case 3: Error loading repository analytics
  if (error) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Error</h1>
          <p className="text-sm text-gray-400">Failed to load analytics for {selectedRepo.name}</p>
        </div>
        <EmptyState
          title="Failed to Load Data"
          description={error}
          action={
            <Button variant="primary" onClick={() => loadDashboardData(selectedRepo._id)} className="space-x-2">
              <ArrowPathIcon className="h-4 w-4" />
              <span>Retry Load</span>
            </Button>
          }
        />
      </div>
    );
  }

  // Loading skeleton dashboard view
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-900 border border-gray-850 rounded-2xl w-full animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[380px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
          <div className="h-[380px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
        </div>
        <div className="h-[400px] bg-gray-900 border border-gray-850 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  // Case 4: GitHub is connected and a repository is active and loaded
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-indigo-950/20 to-transparent border border-indigo-500/15 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Repository Dashboard: {selectedRepo.name}
            </h1>
            <p className="text-sm text-indigo-200/70 max-w-xl">
              Analyzing productivity metrics, commit intervals, and contributor profiles.
            </p>
          </div>
          
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-md">
            <CpuChipIcon className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 8 Analytics Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          label="Total Commits"
          value={velocity?.totalCommits ?? 0}
          icon={CommandLineIcon}
          loading={loading}
          description="Total commits synced"
        />
        <StatsCard
          label="Total PRs"
          value={velocity?.totalPRs ?? 0}
          icon={DocumentTextIcon}
          loading={loading}
          description="Pull requests synced"
        />
        <StatsCard
          label="Merged PRs"
          value={velocity?.mergedPRs ?? 0}
          icon={CheckIcon}
          loading={loading}
          description="Successfully merged"
        />
        <StatsCard
          label="Open Issues"
          value={velocity?.openIssues ?? 0}
          icon={ExclamationCircleIcon}
          loading={loading}
          description="Currently active"
        />
        <StatsCard
          label="Closed Issues"
          value={velocity?.closedIssues ?? 0}
          icon={CheckCircleIcon}
          loading={loading}
          description="Resolved / completed"
        />
        <StatsCard
          label="Merge Rate"
          value={`${velocity?.prMergeRate ?? 0}%`}
          icon={ArrowsRightLeftIcon}
          loading={loading}
          description="Ratio of merged PRs"
        />
        <StatsCard
          label="Avg Merge Time"
          value={`${Math.round(velocity?.avgMergeTimeHours ?? 0)}h`}
          icon={BoltIcon}
          loading={loading}
          description="Average pull request lifespan"
        />
        <StatsCard
          label="Commits per Day"
          value={velocity?.commitsPerDay ?? 0}
          icon={CalendarIcon}
          loading={loading}
          description="Velocity daily rate"
        />
      </div>

      {/* Two Column Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          <CommitBarChart data={commitChart} title="Daily Commit Frequencies" />
        </ErrorBoundary>
        <ErrorBoundary>
          <VelocityAreaChart data={commitChart} title="Engineering Velocity Frequencies" />
        </ErrorBoundary>
      </div>

      {/* Activity Timeline Widget */}
      <div className="w-full">
        <ActivityFeed
          commits={commits?.commits || []}
          loading={loading}
          selectedRepo={selectedRepo}
        />
      </div>
    </div>
  );
}
