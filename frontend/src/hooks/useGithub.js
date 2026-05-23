import { useCallback } from 'react';
import useRepoStore from '../store/repoStore';
import * as githubApi from '../api/github.api';
import { invalidateAnalyticsCache } from './useAnalytics';

export default function useGithub() {
  const {
    repos,
    selectedRepo,
    isSyncing,
    rateLimitWarning,
    isConnected,
    githubUsername,
    statusLoading,
    reposLoading,
    setRepos,
    setSelectedRepo,
    setSyncing,
    setRateLimitWarning,
    setConnectionStatus,
    setStatusLoading,
    setReposLoading,
    clearRepos,
    activeUserId
  } = useRepoStore();

  const checkConnectionStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const response = await githubApi.getGithubStatus();
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
      clearRepos();
    } finally {
      setStatusLoading(false);
    }
  }, [clearRepos, setConnectionStatus, setRepos, setSelectedRepo, setStatusLoading]);

  const connect = useCallback(async () => {
    try {
      const response = await githubApi.connectGithub();
      if (response && response.success && response.data?.url) {
        window.location.href = response.data.url;
        return { success: true };
      }
      return { success: false, message: 'Could not generate OAuth redirect link' };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to initiate GitHub connection';
      return { success: false, message };
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const response = await githubApi.disconnectGithub();
      if (response && response.success) {
        clearRepos();
        return { success: true };
      }
      return { success: false, message: response.message || 'Disconnect failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to disconnect GitHub';
      return { success: false, message };
    }
  }, [clearRepos]);

  const fetchRepos = useCallback(async () => {
    if (!isConnected) return;
    setReposLoading(true);
    try {
      const response = await githubApi.getRepos();
      if (response && response.success) {
        const fetchedRepos = response.data || [];
        setRepos(fetchedRepos);

        // Auto-select repo from localStorage
        if (activeUserId && fetchedRepos.length > 0) {
          const key = `devtrackr_selected_repo_name_${activeUserId}`;
          const savedRepoName = localStorage.getItem(key);
          if (savedRepoName) {
            const match = fetchedRepos.find((r) => r.fullName === savedRepoName);
            if (match) {
              setSelectedRepo(match);
            }
          }
        }
      }
    } catch (error) {
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  }, [isConnected, setRepos, setSelectedRepo, activeUserId]);

  const syncRepository = useCallback(async () => {
    if (!selectedRepo) return { success: false, message: 'No repository selected' };
    setSyncing(true);
    setRateLimitWarning(false);
    try {
      const response = await githubApi.syncRepo(selectedRepo.fullName);
      const syncedRepo = response.data?.repository;
      
      // Check for rate limit warning from backend
      // Backend should set x-ratelimit-remaining or rateLimitWarning if near limit
      if (response.data?.rateLimitWarning || response.data?.warning) {
        setRateLimitWarning(true);
      }

      if (syncedRepo) {
        const normalizedRepo = {
          ...selectedRepo,
          ...syncedRepo,
          _id: syncedRepo.id || syncedRepo._id
        };

        invalidateAnalyticsCache();
        setSelectedRepo(normalizedRepo);
        setRepos(
          repos.map((repo) =>
            repo.fullName === normalizedRepo.fullName ? normalizedRepo : repo
          )
        );
      }
      
      setSyncing(false);
      return { success: true, message: response.message || 'Repository sync complete!' };
    } catch (error) {
      setSyncing(false);
      const message = error.response?.data?.message || 'Sync failed. Please try again.';
      return { success: false, message };
    }
  }, [repos, selectedRepo, setRepos, setSelectedRepo, setSyncing, setRateLimitWarning]);

  return {
    repos,
    selectedRepo,
    isSyncing,
    rateLimitWarning,
    isConnected,
    githubUsername,
    statusLoading,
    reposLoading,
    checkConnectionStatus,
    connect,
    disconnect,
    fetchRepos,
    setSelectedRepo,
    syncRepository
  };
}
