import React, { useState, useEffect, useRef } from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import useGithub from '../../hooks/useGithub';
import { toast } from 'react-hot-toast';

export default function SyncButton() {
  const { selectedRepo, isSyncing, rateLimitWarning, syncRepository } = useGithub();
  const [showSuccess, setShowSuccess] = useState(false);
  const prevSyncingRef = useRef(isSyncing);

  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing]);

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
        className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed [transform:perspective(400px)_translateZ(4px)] shadow-3d-press hover:[transform:perspective(400px)_translateZ(8px)] hover:shadow-3d-hover active:[transform:perspective(400px)_translateZ(0px)] active:shadow-3d-active ${
          isSyncing
            ? 'bg-violet-600/80 border border-violet-500/50 text-white cursor-wait'
            : showSuccess
            ? 'bg-emerald-500/80 border border-emerald-500/50 text-white'
            : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border border-transparent'
        }`}
      >
        {showSuccess ? (
          <CheckCircleIcon className="h-5 w-5" />
        ) : (
          <div className={`preserve-3d ${isSyncing ? 'animate-spin' : ''}`}>
            <ArrowPathIcon className="h-5 w-5" />
          </div>
        )}
        <span className="hidden sm:inline">
          {isSyncing ? 'Syncing...' : showSuccess ? 'Synced!' : 'Sync Repository'}
        </span>
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
