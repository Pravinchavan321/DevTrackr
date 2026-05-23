import React from 'react';
import {
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import useUiStore from '../../store/uiStore';
import useAuth from '../../hooks/useAuth';
import useGithub from '../../hooks/useGithub';
import useRepoStore from '../../store/repoStore';
import RepoSelector from '../dashboard/RepoSelector';
import SyncButton from '../dashboard/SyncButton';

export default function Topbar() {
  const { toggleSidebar, theme, toggleTheme } = useUiStore();
  const { user, logout } = useAuth();
  const { isConnected, statusLoading } = useGithub();
  const activeUserId = useRepoStore((state) => state.activeUserId);
  const userId = user?._id || user?.id || null;
  const showRepositoryControls = isConnected && !statusLoading && activeUserId === userId;
  const ThemeIcon = theme === 'dark' ? SunIcon : MoonIcon;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-700/50 bg-gray-900/60 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile Drawer Trigger & Repo Selection */}
      <div className="flex min-w-0 items-center space-x-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus:outline-none md:hidden"
          aria-label="Open sidebar"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        {/* Global Repository Controls */}
        {showRepositoryControls && (
          <div className="flex items-center space-x-3">
            <RepoSelector />
            <SyncButton />
          </div>
        )}
      </div>

      {/* User Session Info */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 bg-gray-950/40 text-gray-300 shadow-sm transition-all duration-200 hover:border-indigo-500/40 hover:bg-gray-850 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <ThemeIcon className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex flex-col text-right">
          <span className="text-sm font-semibold text-gray-100">{user?.name || 'Loading...'}</span>
          <span className="text-xs text-gray-400">{user?.email}</span>
        </div>

        {/* Avatar Placeholder */}
        <div className="h-9 w-9 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm shadow-sm select-none hover:ring-2 hover:ring-violet-500/50 transition-all">
          {(user?.name || '?').substring(0, 1).toUpperCase()}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-gray-800"></div>

        {/* Logout Trigger */}
        <button
          type="button"
          onClick={logout}
          title="Sign Out"
          className="rounded-lg p-1.5 text-gray-450 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 focus:outline-none"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
