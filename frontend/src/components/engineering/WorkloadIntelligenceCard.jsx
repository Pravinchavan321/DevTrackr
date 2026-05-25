import React from 'react';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import Button from '../common/Button';

const statusStyles = {
  Healthy: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  'Medium Risk': 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  'High Risk': 'border-red-500/25 bg-red-500/10 text-red-300'
};

const barColor = (share) => {
  if (share > 60) return 'from-red-400 to-amber-300';
  if (share >= 40) return 'from-amber-300 to-cyan-300';
  return 'from-emerald-400 to-cyan-300';
};

export default function WorkloadIntelligenceCard({ data, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5 animate-pulse">
        <div className="h-4 w-56 rounded bg-gray-800" />
        <div className="mt-5 h-10 rounded bg-gray-800" />
        <div className="mt-5 space-y-3">
          <div className="h-12 rounded-xl bg-gray-800" />
          <div className="h-12 rounded-xl bg-gray-800" />
          <div className="h-12 rounded-xl bg-gray-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <div>
            <h3 className="text-sm font-semibold text-red-100">Developer workload intelligence unavailable</h3>
            <p className="mt-1 text-xs leading-relaxed text-red-200/80">{error}</p>
            {onRetry && (
              <Button variant="ghost" onClick={onRetry} className="mt-3 px-3 py-1.5 text-xs">
                <ArrowPathIcon className="mr-1.5 h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5">
        <h2 className="text-gray-200 font-semibold border-l-4 border-violet-500 pl-3">Developer Workload Intelligence</h2>
        <p className="mt-4 text-sm text-gray-500">Not enough contributor data is available yet.</p>
      </div>
    );
  }

  const statusClass = statusStyles[data.status] || statusStyles.Healthy;
  const contributors = data.contributors || [];

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5 backdrop-blur-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-violet-300" />
            <h2 className="text-gray-200 font-semibold">Developer Workload Intelligence</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">Professional workload concentration signals without blame.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {data.status}
          </span>
          <span className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
            <SparklesIcon className="mr-1 h-3.5 w-3.5" />
            {data.aiGenerated ? 'AI assisted' : 'Rule fallback'}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top signal</p>
        <p className="mt-1 text-sm font-semibold text-gray-200">{data.topRisk}</p>
      </div>

      <div className="mt-5 space-y-3">
        {contributors.length ? contributors.slice(0, 5).map((contributor) => (
          <div key={contributor.name} className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-200">{contributor.name}</p>
                <p className="text-xs text-gray-500">
                  {contributor.commitCount} commits · {contributor.openPrCount} open PRs · {contributor.assignedIssueCount} issues · {contributor.reviewLoadCount} reviews
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-white">{contributor.workloadShare}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor(contributor.workloadShare)}`}
                style={{ width: `${Math.min(contributor.workloadShare, 100)}%` }}
              />
            </div>
          </div>
        )) : (
          <p className="rounded-xl border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500">
            Sync commits, pull requests, and issues to calculate workload distribution.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/40 p-4">
        <h3 className="text-sm font-semibold text-gray-200">Suggested balancing actions</h3>
        <ul className="mt-3 space-y-2">
          {(data.recommendations || []).slice(0, 4).map((recommendation) => (
            <li key={recommendation} className="text-xs leading-relaxed text-gray-400">{recommendation}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
