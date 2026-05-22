import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../common/ErrorBoundary';
import useGithub from '../../hooks/useGithub';

export default function AppLayout() {
  const { checkConnectionStatus } = useGithub();

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

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
