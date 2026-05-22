import React from 'react';
import {
  CodeBracketIcon,
  ArrowsRightLeftIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const mockActivities = [
  {
    id: 1,
    type: 'commit',
    title: 'feat: add axios interceptors and token refresh queue',
    user: 'pravin-chavan',
    time: '2 hours ago',
    icon: CodeBracketIcon,
    iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  },
  {
    id: 2,
    type: 'pr',
    title: 'PR #12 Merged: implement frontend dashboard shell',
    user: 'pravin-chavan',
    time: '4 hours ago',
    icon: ArrowsRightLeftIcon,
    iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 3,
    type: 'issue',
    title: 'Issue #45 Closed: resolve oauth token expired cookie redirect',
    user: 'pravin-chavan',
    time: '1 day ago',
    icon: ExclamationCircleIcon,
    iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  }
];

export default function ActivityFeed({ selectedRepo }) {
  if (!selectedRepo) {
    return null;
  }

  return (
    <div className="bg-gray-900 border border-gray-850 rounded-xl p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-150">Recent Repository Activity</h3>
        <span className="text-xs text-gray-500 font-mono">Incremental Sync Feed</span>
      </div>

      <div className="mt-4 flow-root">
        <ul className="-mb-8">
          {mockActivities.map((activity, idx) => {
            const Icon = activity.icon;
            return (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {idx !== mockActivities.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-800"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3.5">
                    <div>
                      <span className={`flex h-8.5 w-8.5 items-center justify-center rounded-lg border shadow-sm ${activity.iconColor}`}>
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-200">
                          {activity.title}{' '}
                          <span className="text-xs text-gray-400 font-medium">
                            by {activity.user}
                          </span>
                        </p>
                      </div>
                      <div className="text-right text-xs whitespace-nowrap text-gray-500 font-medium self-center">
                        <time>{activity.time}</time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
