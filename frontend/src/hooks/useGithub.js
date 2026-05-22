import { useState, useCallback } from 'react';
import useRepoStore from '../store/repoStore';
import * as githubApi from '../api/github.api';

export default function useGithub() {
  const {
    repos,
    selectedRepo,
    isSyncing,
    rateLimitWarning,
    setRepos,
    setSelectedRepo,
    setSyncing,
    setRateLimitWarning,
    clearRepos
  } = useRepoStore();

  const [isConnected, setIsConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);

  const checkConnectionStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const response = await githubApi.getGithubStatus();
      if (response && response.success) {
        setIsConnected(response.data.connected);
        setGithubUsername(response.data.username || '');
      }
    } catch (error) {
      setIsConnected(false);
      setGithubUsername('');
    } finally {
      setStatusLoading(false);
    }
  }, []);

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
        setIsConnected(false);
        setGithubUsername('');
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
        setRepos(response.data || []);
      }
    } catch (error) {
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  }, [isConnected, setRepos]);

  const syncRepository = useCallback(async () => {
    if (!selectedRepo) return { success: false, message: 'No repository selected' };
    setSyncing(true);
    setRateLimitWarning(false);
    try {
      const response = await githubApi.syncRepo(selectedRepo.fullName);
      
      // Check for rate limit warning from backend
      // Backend should set x-ratelimit-remaining or rateLimitWarning if near limit
      if (response.data && response.data.rateLimitWarning) {
        setRateLimitWarning(true);
      }
      
      setSyncing(false);
      return { success: true, message: response.message || 'Repository sync complete!' };
    } catch (error) {
      setSyncing(false);
      const message = error.response?.data?.message || 'Sync failed. Please try again.';
      return { success: false, message };
    }
  }, [selectedRepo, setSyncing, setRateLimitWarning]);

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
