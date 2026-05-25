import { useEffect } from 'react';
import useRepoStore from '../store/repoStore';
import * as githubApi from '../api/github.api';
import { invalidateAnalyticsCache } from './useAnalytics';
import { invalidateInsightsCache } from './useInsights';

const getPollIntervalMs = () => {
  const configured = Number.parseInt(import.meta.env.VITE_REPO_ACTIVITY_POLL_INTERVAL_MS || '15000', 10);
  return Number.isFinite(configured) && configured >= 5000 ? configured : 15000;
};

const buildActivityKey = (repoId, status) => [
  repoId,
  status?.lastSyncedAt || '',
  status?.lastWebhookEventAt || '',
  status?.webhookEventCount || 0,
  status?.updatedAt || ''
].join('|');

export default function useRepoActivityRefresh() {
  const selectedRepo = useRepoStore((state) => state.selectedRepo);
  const isConnected = useRepoStore((state) => state.isConnected);
  const setRepositoryActivitySnapshot = useRepoStore((state) => state.setRepositoryActivitySnapshot);
  const resetRepositoryActivitySnapshot = useRepoStore((state) => state.resetRepositoryActivitySnapshot);
  const repoId = selectedRepo?._id || null;

  useEffect(() => {
    if (!isConnected || !repoId) {
      resetRepositoryActivitySnapshot();
      return undefined;
    }

    let stopped = false;
    let timeoutId = null;
    const pollIntervalMs = getPollIntervalMs();

    const pollActivityStatus = async () => {
      try {
        const response = await githubApi.getRepositoryActivityStatus(repoId);
        if (stopped || !response?.success) return;

        const nextKey = buildActivityKey(repoId, response.data);
        const currentKey = useRepoStore.getState().repositoryActivityKey;

        if (!currentKey) {
          setRepositoryActivitySnapshot(nextKey, false);
          return;
        }

        if (currentKey !== nextKey) {
          invalidateAnalyticsCache(repoId);
          invalidateInsightsCache(repoId);
          setRepositoryActivitySnapshot(nextKey, true);
        }
      } catch (error) {
        // Keep the app quiet here; the regular page requests still own user-facing errors.
      } finally {
        if (!stopped) {
          timeoutId = window.setTimeout(pollActivityStatus, pollIntervalMs);
        }
      }
    };

    pollActivityStatus();

    return () => {
      stopped = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    isConnected,
    repoId,
    resetRepositoryActivitySnapshot,
    setRepositoryActivitySnapshot
  ]);
}
