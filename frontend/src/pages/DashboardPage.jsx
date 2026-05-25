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
  ArrowPathIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import useAuth from '../hooks/useAuth';
import useRepoStore from '../store/repoStore';
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
  const selectedRepo = useRepoStore((state) => state.selectedRepo);
  const isConnected = useRepoStore((state) => state.isConnected);
  const statusLoading = useRepoStore((state) => state.statusLoading);
  const repositoryActivityVersion = useRepoStore((state) => state.repositoryActivityVersion);
  
  const {
    velocity,
    healthMetrics,
    commitChart,
    commits,
    fetchVelocity,
    fetchHealthMetrics,
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
        fetchHealthMetrics(repoId),
        fetchCommitChart(repoId, { groupBy: 'day' }),
        fetchCommits(repoId, { page: 1, limit: 10 })
      ]);
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading dashboard metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchVelocity, fetchHealthMetrics, fetchCommitChart, fetchCommits]);

  useEffect(() => {
    if (selectedRepo && selectedRepo._id) {
      loadDashboardData(selectedRepo._id);
    }
  }, [selectedRepo, repositoryActivityVersion, loadDashboardData]);

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

  const healthStatus = healthMetrics?.status || 'Unknown';
  const healthColor = healthStatus === 'Critical'
    ? 'red'
    : healthStatus === 'Warning'
      ? 'amber'
      : 'emerald';
  const deploymentFrequency = healthMetrics?.dora?.deploymentFrequency;
  const leadTimeForChanges = healthMetrics?.dora?.leadTimeForChanges;

  // Case 4: GitHub is connected and a repository is active and loaded
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              Repository Dashboard: {selectedRepo.name}
            </h1>
            <p className="text-sm text-gray-400 max-w-xl">
              Analyzing productivity metrics, commit intervals, and contributor profiles.
            </p>
          </div>
          
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-md">
            <CpuChipIcon className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Analytics Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Repo Health"
          value={healthMetrics?.riskScore ?? 0}
          icon={ShieldCheckIcon}
          loading={loading}
          description={`${healthStatus} risk score`}
          style={{ animationDelay: '0ms' }}
          color={healthColor}
        />
        <StatsCard
          label="Deployment Frequency"
          value={`${deploymentFrequency?.value ?? 0}/wk`}
          icon={RocketLaunchIcon}
          loading={loading}
          description={`${deploymentFrequency?.deployableChangesLast30Days ?? 0} deployable changes in 30d`}
          style={{ animationDelay: '80ms' }}
          color="cyan"
        />
        <StatsCard
          label="Lead Time"
          value={`${Math.round(leadTimeForChanges?.value ?? 0)}h`}
          icon={ClockIcon}
          loading={loading}
          description="PR creation to merge"
          style={{ animationDelay: '160ms' }}
          color={leadTimeForChanges?.rating === 'low' ? 'amber' : 'emerald'}
        />
        <StatsCard
          label="Total Commits"
          value={velocity?.totalCommits ?? 0}
          icon={CommandLineIcon}
          loading={loading}
          description="Total commits synced"
          style={{ animationDelay: '240ms' }}
          color="violet"
        />
        <StatsCard
          label="Total PRs"
          value={velocity?.totalPRs ?? 0}
          icon={DocumentTextIcon}
          loading={loading}
          description="Pull requests synced"
          style={{ animationDelay: '320ms' }}
          color="cyan"
        />
        <StatsCard
          label="Merged PRs"
          value={velocity?.mergedPRs ?? 0}
          icon={CheckIcon}
          loading={loading}
          description="Successfully merged"
          style={{ animationDelay: '400ms' }}
          color="emerald"
        />
        <StatsCard
          label="Open Issues"
          value={velocity?.openIssues ?? 0}
          icon={ExclamationCircleIcon}
          loading={loading}
          description="Currently active"
          style={{ animationDelay: '480ms' }}
          color="amber"
        />
        <StatsCard
          label="Closed Issues"
          value={velocity?.closedIssues ?? 0}
          icon={CheckCircleIcon}
          loading={loading}
          description="Resolved / completed"
          style={{ animationDelay: '560ms' }}
          color="cyan"
        />
        <StatsCard
          label="Merge Rate"
          value={`${velocity?.prMergeRate ?? 0}%`}
          icon={ArrowsRightLeftIcon}
          loading={loading}
          description="Ratio of merged PRs"
          style={{ animationDelay: '640ms' }}
          color="emerald"
        />
        <StatsCard
          label="Avg Merge Time"
          value={`${Math.round(velocity?.avgMergeTimeHours ?? 0)}h`}
          icon={BoltIcon}
          loading={loading}
          description="Average pull request lifespan"
          style={{ animationDelay: '720ms' }}
          color="amber"
        />
        <StatsCard
          label="Commits per Day"
          value={velocity?.commitsPerDay ?? 0}
          icon={CalendarIcon}
          loading={loading}
          description="Velocity daily rate"
          style={{ animationDelay: '800ms' }}
          color="violet"
        />
      </div>

      {healthMetrics?.factors?.length > 0 && (
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-gray-200 font-semibold border-l-4 border-emerald-500 pl-3">Repository Health Signals</h2>
              <p className="text-xs text-gray-500 mt-1">Risk score inputs from stale work, delivery flow, lead time, and contributor concentration.</p>
            </div>
            <span className={`self-start sm:self-center rounded-full border px-3 py-1 text-xs font-semibold ${
              healthStatus === 'Critical'
                ? 'border-red-500/25 bg-red-500/10 text-red-300'
                : healthStatus === 'Warning'
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                  : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
            }`}>
              {healthStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {healthMetrics.factors.slice(0, 3).map((factor) => (
              <div key={factor.key} className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-200">{factor.label}</h3>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    factor.severity === 'high'
                      ? 'bg-red-500/10 text-red-300'
                      : factor.severity === 'medium'
                        ? 'bg-amber-500/10 text-amber-300'
                        : factor.severity === 'positive'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-cyan-500/10 text-cyan-300'
                  }`}>
                    {factor.value}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D Section Divider */}
      <div className="relative flex items-center justify-center py-4">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
        <div className="absolute w-2 h-2 rounded-full bg-violet-500"></div>
      </div>

      {/* Two Column Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-2xl h-full">
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 p-6 h-full transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2),0_4px_12px_rgba(0,0,0,0.4)] hover:border-violet-500/40">
            <h2 className="text-gray-200 font-semibold border-l-4 border-violet-500 pl-3 mb-4">Daily Commit Frequencies</h2>
            <ErrorBoundary>
              <CommitBarChart data={commitChart} />
            </ErrorBoundary>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl h-full">
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 p-6 h-full transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2),0_4px_12px_rgba(0,0,0,0.4)] hover:border-violet-500/40">
            <h2 className="text-gray-200 font-semibold border-l-4 border-violet-500 pl-3 mb-4">Engineering Velocity Frequencies</h2>
            <ErrorBoundary>
              <VelocityAreaChart data={commitChart} />
            </ErrorBoundary>
          </div>
        </div>
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
