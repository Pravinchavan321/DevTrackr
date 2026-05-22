import React from 'react';
import { Bars3Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import useUiStore from '../../store/uiStore';
import useAuth from '../../hooks/useAuth';
import useGithub from '../../hooks/useGithub';
import RepoSelector from '../dashboard/RepoSelector';
import SyncButton from '../dashboard/SyncButton';

export default function Topbar() {
  const { toggleSidebar } = useUiStore();
  const { user, logout } = useAuth();
  const { isConnected } = useGithub();

  return (
    <header className="bg-gray-900/60 backdrop-blur-md border-b border-gray-800/80 sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between">
      {/* Mobile Drawer Trigger & Repo Selection */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors focus:outline-none"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        {/* Global Repository Controls */}
        {isConnected && (
          <div className="flex items-center space-x-3">
            <RepoSelector />
            <SyncButton />
          </div>
        )}
      </div>

      {/* User Session Info */}
      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-sm font-semibold text-gray-100">{user?.name || 'Developer'}</span>
          <span className="text-xs text-gray-400">{user?.email}</span>
        </div>

        {/* Avatar Placeholder */}
        <div className="h-9 w-9 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm shadow-sm select-none">
          {(user?.name || 'D').substring(0, 1).toUpperCase()}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-gray-800"></div>

        {/* Logout Trigger */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-1.5 rounded-lg text-gray-450 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 focus:outline-none"
        >
          <ArrowRightOnRectangleIcon className="h-5.5 w-5.5" />
        </button>
      </div>
    </header>
  );
}
