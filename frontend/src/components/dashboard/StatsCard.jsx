import React from 'react';

export default function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  loading = false,
  description
}) {
  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse flex items-center justify-between">
        <div className="space-y-2.5 w-2/3">
          <div className="h-3 bg-gray-850 rounded w-1/2"></div>
          <div className="h-6 bg-gray-850 rounded w-2/3"></div>
          <div className="h-3 bg-gray-850 rounded w-5/6"></div>
        </div>
        <div className="h-10 w-10 bg-gray-850 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-850 hover:border-gray-800/80 rounded-xl p-5 flex items-center justify-between transition-all duration-200 group">
      <div className="space-y-1 min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight leading-none">
            {value}
          </span>
          {trend && (
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                trend.type === 'positive'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-850 group-hover:bg-indigo-600/10 text-gray-400 group-hover:text-indigo-400 border border-gray-800 group-hover:border-indigo-500/10 transition-all duration-200">
          <Icon className="h-5.5 w-5.5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
