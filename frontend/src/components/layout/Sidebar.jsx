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
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: HomeIcon },
    { name: 'Commits', to: '/commits', icon: CodeBracketIcon },
    { name: 'Pull Requests', to: '/pullrequests', icon: ArrowsRightLeftIcon },
    { name: 'Issues', to: '/issues', icon: ExclamationCircleIcon },
    { name: 'Contributors', to: '/contributors', icon: UsersIcon },
    { name: 'AI Insights', to: '/insights', icon: LightBulbIcon },
    { name: 'Settings', to: '/settings', icon: Cog6ToothIcon }
  ];

  const sidebarClasses = `fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col overflow-hidden border-r border-gray-700/50 bg-gray-900/60 backdrop-blur-md p-5 shadow-[inset_-1px_0_20px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-in-out md:static md:h-screen md:translate-x-0 ${
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
            <span className="brand-orb-3d" aria-hidden="true">
              <span className="brand-orb-glow"></span>
              <span className="brand-orb-core"></span>
              <span className="brand-orb-ring brand-orb-ring-a"></span>
              <span className="brand-orb-ring brand-orb-ring-b"></span>
            </span>
            <span className="truncate text-xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">DevTrackr</span>
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
                  `group flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-600/20 text-violet-300 border-l-2 border-violet-500 shadow-[inset_2px_0_8px_rgba(139,92,246,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60 border-l-2 border-transparent'
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
