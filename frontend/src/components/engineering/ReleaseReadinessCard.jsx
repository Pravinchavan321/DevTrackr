import React from 'react';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import Button from '../common/Button';

const statusStyles = {
  Ready: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  'Moderate Risk': 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  'High Risk': 'border-orange-500/25 bg-orange-500/10 text-orange-300',
  'Not Ready': 'border-red-500/25 bg-red-500/10 text-red-300'
};

const progressColor = (status) => {
  if (status === 'Ready') return 'from-emerald-400 to-cyan-300';
  if (status === 'Moderate Risk') return 'from-amber-300 to-cyan-300';
  if (status === 'High Risk') return 'from-orange-400 to-amber-300';
  return 'from-red-400 to-amber-300';
};

export default function ReleaseReadinessCard({ data, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5 animate-pulse">
        <div className="h-4 w-40 rounded bg-gray-800" />
        <div className="mt-6 h-9 w-24 rounded bg-gray-800" />
        <div className="mt-4 h-3 rounded bg-gray-800" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-20 rounded-xl bg-gray-800" />
          <div className="h-20 rounded-xl bg-gray-800" />
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
            <h3 className="text-sm font-semibold text-red-100">AI Release Readiness unavailable</h3>
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
        <h2 className="text-gray-200 font-semibold border-l-4 border-cyan-500 pl-3">AI Release Readiness</h2>
        <p className="mt-4 text-sm text-gray-500">Not enough repository activity is available yet.</p>
      </div>
    );
  }

  const score = Math.min(Math.max(Number(data.score) || 0, 0), 100);
  const statusClass = statusStyles[data.status] || statusStyles['Moderate Risk'];

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5 backdrop-blur-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-cyan-300" />
            <h2 className="text-gray-200 font-semibold">AI Release Readiness</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">Generated from PR age, issue health, commits, DORA-style flow, and workload concentration.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {data.status}
          </span>
          <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
            <SparklesIcon className="mr-1 h-3.5 w-3.5" />
            {data.aiGenerated ? 'AI assisted' : 'Rule fallback'}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between">
          <span className="font-mono text-4xl font-bold text-white">{score}%</span>
          <span className="text-xs text-gray-500">release confidence</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressColor(data.status)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
          <h3 className="text-sm font-semibold text-gray-200">Risk Factors</h3>
          <ul className="mt-3 space-y-2">
            {(data.riskFactors || []).slice(0, 4).map((reason) => (
              <li key={reason} className="text-xs leading-relaxed text-gray-400">{reason}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
          <h3 className="text-sm font-semibold text-gray-200">Recommended Actions</h3>
          <ul className="mt-3 space-y-2">
            {(data.recommendations || []).slice(0, 4).map((recommendation) => (
              <li key={recommendation} className="text-xs leading-relaxed text-gray-400">{recommendation}</li>
            ))}
          </ul>
        </div>
      </div>

      {data.metrics?.dataAvailability?.buildHealth && (
        <p className="mt-4 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-xs text-gray-500">
          {data.metrics.dataAvailability.buildHealth}
        </p>
      )}
    </div>
  );
}
