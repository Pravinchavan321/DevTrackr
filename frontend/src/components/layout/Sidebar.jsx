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

  const sidebarClasses = `fixed inset-y-0 left-0 z-40 w-64 transform bg-gray-900 border-r border-gray-800/80 p-5 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  }`;

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <aside className={sidebarClasses}>
        {/* Logo Header */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30">
              <svg
                className="h-5.5 w-5.5 text-white"
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
            <span className="text-xl font-bold text-white tracking-tight">DevTrackr</span>
          </div>
          
          {/* Close button for mobile drawer */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-850 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-8 flex-1 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                      : 'text-gray-400 hover:bg-gray-850 hover:text-gray-200'
                  }`
                }
              >
                <Icon className="h-5.5 w-5.5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="mt-auto pt-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500 font-mono">v1.0.0 — AI Foundation</p>
        </div>
      </aside>
    </>
  );
}
