import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import useGithub from '../hooks/useGithub';
import Button from '../components/common/Button';

export default function SettingsPage() {
  const { user } = useAuth();
  const {
    isConnected,
    githubUsername,
    statusLoading,
    checkConnectionStatus,
    connect,
    disconnect
  } = useGithub();

  const location = useLocation();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);
  const profileName = user?.name?.trim();
  const profileEmail = user?.email?.trim();
  const profileInitial = profileName ? profileName.substring(0, 1).toUpperCase() : '?';
  const profileReady = Boolean(profileName && profileEmail);

  // Check connection status on load
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  // Handle OAuth callback URL status alerts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const githubParam = params.get('github');

    if (githubParam === 'connected') {
      toast.success('Successfully connected your GitHub account!');
      checkConnectionStatus();
      // Clear query params to prevent repeating toast on reload
      navigate('/settings', { replace: true });
    } else if (githubParam === 'error') {
      toast.error('Failed to authenticate with GitHub. Please try again.');
      navigate('/settings', { replace: true });
    }
  }, [location.search, navigate, checkConnectionStatus]);

  const handleConnect = async () => {
    setActionLoading(true);
    const res = await connect();
    if (!res.success) {
      toast.error(res.message);
      setActionLoading(false);
    }
    // If successful, connect() redirects window.location.href automatically
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your GitHub account? This will clear your repository sync lists.')) {
      setActionLoading(true);
      const res = await disconnect();
      if (res.success) {
        toast.success('Successfully disconnected GitHub account.');
      } else {
        toast.error(res.message);
      }
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl selection:bg-indigo-500 selection:text-white">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/80 p-6 shadow-lg">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-500/12 via-sky-400/8 to-transparent"></div>
        <div className="relative">
          <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
            Developer workspace
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Account Settings</h1>
          <p className="mt-1 text-sm text-gray-400">Manage your DevTrackr profile and connect the correct GitHub account for repository analytics.</p>
        </div>
      </div>

      {/* Profile Card Section */}
      <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 space-y-6 shadow-md shadow-gray-950/20">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-300 font-semibold border border-sky-400/20">
            <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-150">Profile Information</h3>
              <p className="text-xs text-gray-450">Signed-in DevTrackr account details.</p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            profileReady
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
          }`}>
            {profileReady ? 'Active session' : 'Loading profile'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[auto,1fr,1fr] md:items-end">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/25 to-sky-400/15 text-2xl font-extrabold text-indigo-200 shadow-inner">
            {profileInitial}
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Full Name
            </span>
            <div className="bg-gray-950 border border-gray-850 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-100">
              {profileName || 'Loading profile...'}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Email Address
            </span>
            <div className="bg-gray-950 border border-gray-850 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-100">
              {profileEmail || 'Loading email...'}
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Integration Card Section */}
      <div className="bg-gray-900 border border-gray-850 rounded-xl p-6 space-y-6 shadow-md shadow-gray-950/20">
        <div className="flex items-center space-x-3.5 pb-4 border-b border-gray-800">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-300 font-semibold border border-indigo-400/20">
            <svg className="h-5.5 w-5.5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-150">Workspace Integrations</h3>
            <p className="text-xs text-gray-450">Link and sync external developer accounts.</p>
          </div>
        </div>

        {statusLoading ? (
          <div className="flex items-center space-x-3 py-4">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            <p className="text-xs text-gray-400 animate-pulse">Loading GitHub integration status...</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gray-950/60 border border-gray-850/80 rounded-xl">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-200">GitHub Integration</span>
                {isConnected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-semibold bg-gray-800 border border-gray-700/60 text-gray-400">
                    Not Connected
                  </span>
                )}
              </div>
              
              <p className="text-xs text-gray-405 max-w-md leading-relaxed">
                {isConnected
                  ? `Authenticated as GitHub user: @${githubUsername}`
                  : 'Link your GitHub account to sync repositories and generate AI sprint insights.'}
              </p>
              {!isConnected && (
                <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300 max-w-md leading-relaxed">
                  GitHub now opens an account chooser. If it shows Pravin or another account, click "Use a different account" and sign in with the GitHub account for this DevTrackr user.
                </p>
              )}
            </div>

            <div>
              {isConnected ? (
                <Button
                  onClick={handleDisconnect}
                  variant="danger"
                  loading={actionLoading}
                  className="w-full sm:w-auto"
                >
                  Disconnect Account
                </Button>
              ) : (
                <Button
                  onClick={handleConnect}
                  variant="primary"
                  loading={actionLoading}
                  className="w-full sm:w-auto"
                >
                  Connect GitHub
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
