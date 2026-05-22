import React from 'react';

export default function EmptyState({
  title,
  description,
  action,
  icon: Icon
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-900/30 p-8 text-center sm:p-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800/80 text-indigo-400 border border-gray-700/50 mb-4">
        {Icon ? (
          <Icon className="h-6 w-6" aria-hidden="true" />
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v5.25a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-200">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-400 max-w-sm">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
