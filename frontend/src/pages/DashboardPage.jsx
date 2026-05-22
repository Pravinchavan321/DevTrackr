import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CommandLineIcon,
  ArrowsRightLeftIcon,
  ExclamationCircleIcon,
  BoltIcon,
  ArrowRightIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import useAuth from '../hooks/useAuth';
import useGithub from '../hooks/useGithub';
import useAnalytics from '../hooks/useAnalytics';
import StatsCard from '../components/dashboard/StatsCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedRepo, isConnected, checkConnectionStatus, statusLoading } = useGithub();
  const { velocity, loading: analyticsLoading, fetchVelocity } = useAnalytics();

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  useEffect(() => {
    if (selectedRepo) {
      fetchVelocity(selectedRepo._id);
    }
  }, [selectedRepo, fetchVelocity]);

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

  // Case 3: GitHub is connected and a repository is active
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

      {/* Analytics Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          label="Total Commits"
          value={velocity?.totalCommits ?? 0}
          icon={CommandLineIcon}
          loading={analyticsLoading}
          description="Paginated commit history"
        />
        <StatsCard
          label="Merge Rate"
          value={velocity ? `${Math.round(velocity.prMergeRate ?? 0)}%` : '0%'}
          icon={ArrowsRightLeftIcon}
          loading={analyticsLoading}
          description="PR branch merges"
        />
        <StatsCard
          label="Open Issues"
          value={velocity?.openIssuesCount ?? 0}
          icon={ExclamationCircleIcon}
          loading={analyticsLoading}
          description="Actionable tasks"
        />
        <StatsCard
          label="Avg Merge Time"
          value={velocity ? `${Math.round(velocity.avgMergeTimeHours ?? 0)}h` : '0h'}
          icon={BoltIcon}
          loading={analyticsLoading}
          description="Average velocity"
        />
      </div>

      {/* Info Callout Card for Next Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Widget: Activity Feed */}
        <div className="lg:col-span-2">
          <ActivityFeed selectedRepo={selectedRepo} />
        </div>

        {/* Right Widget: Session 8 Preview Card */}
        <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Interactive Analytics
            </span>
            <h3 className="text-base font-bold text-gray-150">Recharts Visualization Board</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              In the next session, we will fully wire up detailed analytical pages for commits, pull requests, issues, and contributor graphs with animated Area, Bar, Line, Pie, and Radar charts.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-mono">Scheduled: Session 8</span>
            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
              <span>View Plans</span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
