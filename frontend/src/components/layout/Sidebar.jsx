import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  CodeBracketIcon,
  ArrowsRightLeftIcon,
  ExclamationCircleIcon,
  UsersIcon,
  LightBulbIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import useUiStore from '../../store/uiStore';

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: HomeIcon },
    { name: 'Commits', to: '/commits', icon: CodeBracketIcon },
    { name: 'Pull Requests', to: '/pullrequests', icon: ArrowsRightLeftIcon },
    { name: 'Issues', to: '/issues', icon: ExclamationCircleIcon },
    { name: 'Contributors', to: '/contributors', icon: UsersIcon },
    { name: 'AI Insights', to: '/insights', icon: LightBulbIcon },
    { name: 'Settings', to: '/settings', icon: Cog6ToothIcon }
  ];

  const sidebarClasses = `fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col overflow-hidden border-r border-gray-800/80 bg-gray-900 p-5 shadow-2xl shadow-gray-950/20 transition-transform duration-300 ease-in-out md:static md:h-screen md:translate-x-0 ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  }`;

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between border-b border-gray-800 pb-5">
          <div className="flex min-w-0 items-center space-x-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30">
              <svg
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <span className="truncate text-lg font-extrabold tracking-tight text-white">DevTrackr</span>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-850 hover:text-gray-100 md:hidden"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex min-w-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                      : 'text-gray-400 hover:bg-gray-850 hover:text-gray-200'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-5 border-t border-gray-800 pt-4 text-center">
          <p className="font-mono text-xs text-gray-500">v1.0.0 - AI Foundation</p>
        </div>
      </aside>
    </>
  );
}
