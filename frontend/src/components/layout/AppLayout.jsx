import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../common/ErrorBoundary';
import useAuth from '../../hooks/useAuth';
import useRepoStore from '../../store/repoStore';
import * as githubApi from '../../api/github.api';
import useRepoActivityRefresh from '../../hooks/useRepoActivityRefresh';

export default function AppLayout() {
  const { user } = useAuth();
  const activeUserId = useRepoStore((state) => state.activeUserId);
  const clearRepos = useRepoStore((state) => state.clearRepos);
  const setConnectionStatus = useRepoStore((state) => state.setConnectionStatus);
  const setRepos = useRepoStore((state) => state.setRepos);
  const setSelectedRepo = useRepoStore((state) => state.setSelectedRepo);
  const setActiveUserId = useRepoStore((state) => state.setActiveUserId);
  const setStatusLoading = useRepoStore((state) => state.setStatusLoading);
  const userId = user?._id || user?.id || null;

  useRepoActivityRefresh();

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      clearRepos();
      setActiveUserId(null);
      return undefined;
    }

    if (activeUserId !== userId) {
      clearRepos();
      setActiveUserId(userId);
      return undefined;
    }

    const checkConnectionStatus = async () => {
      setStatusLoading(true);
      try {
        const response = await githubApi.getGithubStatus();
        if (cancelled) return;

        if (response && response.success) {
          const nextConnected = response.data.connected;
          const nextUsername = response.data.username || '';
          const currentUsername = useRepoStore.getState().githubUsername;

          if (!nextConnected) {
            clearRepos();
            return;
          }

          if (currentUsername && currentUsername !== nextUsername) {
            setRepos([]);
            setSelectedRepo(null);
          }

          setConnectionStatus({
            isConnected: nextConnected,
            githubUsername: nextUsername
          });
        } else {
          clearRepos();
        }
      } catch (error) {
        if (!cancelled) {
          clearRepos();
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    };

    checkConnectionStatus();

    return () => {
      cancelled = true;
    };
  }, [
    activeUserId,
    clearRepos,
    setActiveUserId,
    setConnectionStatus,
    setRepos,
    setSelectedRepo,
    setStatusLoading,
    userId
  ]);

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 font-sans relative">
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-3xl rounded-full pointer-events-none -z-0 translate-x-1/3 -translate-y-1/3"></div>
      
      {/* Responsive Left Sidebar Navigation */}
      <div className="z-10 flex h-full">
        <Sidebar />
      </div>

      {/* Main Right Content Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden z-10 relative">
        {/* Sticky Global Dashboard Control Topbar */}
        <Topbar />

        {/* Scrollable Main View Area */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
