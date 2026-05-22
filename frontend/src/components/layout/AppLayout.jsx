import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../common/ErrorBoundary';
import useGithub from '../../hooks/useGithub';
import useAuth from '../../hooks/useAuth';
import useRepoStore from '../../store/repoStore';

export default function AppLayout() {
  const { user } = useAuth();
  const { checkConnectionStatus } = useGithub();
  const activeUserId = useRepoStore((state) => state.activeUserId);
  const clearRepos = useRepoStore((state) => state.clearRepos);
  const setActiveUserId = useRepoStore((state) => state.setActiveUserId);
  const userId = user?._id || user?.id || null;

  useEffect(() => {
    if (!userId) {
      clearRepos();
      setActiveUserId(null);
      return;
    }

    if (activeUserId !== userId) {
      clearRepos();
      setActiveUserId(userId);
      return;
    }

    checkConnectionStatus();
  }, [activeUserId, checkConnectionStatus, clearRepos, setActiveUserId, userId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 font-sans">
      {/* Responsive Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Right Content Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Global Dashboard Control Topbar */}
        <Topbar />

        {/* Scrollable Main View Area */}
        <main className="flex-1 overflow-y-auto bg-gray-950 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
