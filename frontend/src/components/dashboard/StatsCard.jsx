import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

export default function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  loading = false,
  description,
  style,
  color = 'violet'
}) {
  if (loading) {
    return (
      <div className="overflow-hidden">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div className="space-y-2.5 w-2/3">
            <div className="h-3 bg-gray-850 rounded w-1/2"></div>
            <div className="h-6 bg-gray-850 rounded w-2/3"></div>
            <div className="h-3 bg-gray-850 rounded w-5/6"></div>
          </div>
          <div className="h-10 w-10 bg-gray-850 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 flex items-center justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2),0_4px_12px_rgba(0,0,0,0.4)] hover:border-violet-500/40 group h-full">
        <div className="space-y-1 min-w-0">
          <span className="block text-sm font-semibold tracking-wider text-gray-400">
            {label}
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white tracking-tight leading-none">
              {value}
            </span>
          {trend && (
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                trend.type === 'positive'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {trend.type === 'positive' ? (
                <ArrowUpIcon className="h-3 w-3" />
              ) : (
                <ArrowDownIcon className="h-3 w-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
        {(description || trend?.label) && (
          <span className="block text-xs text-gray-500 truncate mt-1">
            {description || trend?.label}
          </span>
        )}
      </div>

        {Icon && (
          <div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
              color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400' :
              color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
              color === 'amber' ? 'bg-amber-500/10 text-amber-400' :
              color === 'red' ? 'bg-red-500/10 text-red-400' :
              'bg-violet-500/10 text-violet-400'
            }`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
