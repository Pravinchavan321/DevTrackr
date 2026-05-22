import React from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import useGithub from '../../hooks/useGithub';
import { toast } from 'react-hot-toast';

export default function SyncButton() {
  const { selectedRepo, isSyncing, rateLimitWarning, syncRepository } = useGithub();

  if (!selectedRepo) {
    return null;
  }

  const handleSync = async () => {
    const myPromise = syncRepository();

    toast.promise(myPromise, {
      loading: `Syncing repository "${selectedRepo.name}"...`,
      success: (res) => {
        if (!res.success) {
          throw new Error(res.message);
        }
        return `Successfully synced ${selectedRepo.name}!`;
      },
      error: (err) => err.message || 'Sync failed. Please try again.'
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        title="Sync GitHub Data"
        className={`flex items-center space-x-1.5 bg-gray-900 border border-gray-800 hover:border-indigo-500/30 text-gray-300 hover:text-indigo-400 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
          isSyncing ? 'cursor-wait' : ''
        }`}
      >
        <ArrowPathIcon
          className={`h-4 w-4 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`}
        />
        <span className="hidden sm:inline">Sync Data</span>
      </button>

      {rateLimitWarning && (
        <div
          title="GitHub API Rate Limit Warning (< 100 requests remaining)"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse"
        >
          <ExclamationTriangleIcon className="h-4.5 w-4.5" />
        </div>
      )}
    </div>
  );
}
