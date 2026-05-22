import { useState, useCallback } from 'react';
import * as analyticsApi from '../api/analytics.api';

export default function useAnalytics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Core analytics state hooks
  const [velocity, setVelocity] = useState(null);
  const [commits, setCommits] = useState(null);
  const [commitChart, setCommitChart] = useState(null);
  const [contributors, setContributors] = useState(null);
  const [pullRequests, setPullRequests] = useState(null);
  const [issues, setIssues] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchVelocity = useCallback(async (repoId) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getVelocity(repoId);
      if (response && response.success) {
        setVelocity(response.data);
        return response.data;
      }
      throw new Error(response?.message || 'Failed to fetch velocity metrics');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch velocity metrics';
      setError(msg);
      setVelocity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommitChart = useCallback(async (repoId, params = {}) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getCommitChart(repoId, params);
      if (response && response.success) {
        setCommitChart(response.data);
        return response.data;
      }
      throw new Error(response?.message || 'Failed to fetch commit chart data');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch commit chart data';
      setError(msg);
      setCommitChart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommits = useCallback(async (repoId, params = {}) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getCommits(repoId, params);
      if (response && response.success) {
        setCommits(response.data);
        return response.data;
      }
      throw new Error(response?.message || 'Failed to fetch commits list');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch commits list';
      setError(msg);
      setCommits(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContributors = useCallback(async (repoId) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getContributors(repoId);
      if (response && response.success) {
        setContributors(response.data);
        return response.data;
      }
      throw new Error(response?.message || 'Failed to fetch contributors');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch contributors';
      setError(msg);
      setContributors(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPullRequests = useCallback(async (repoId, params = {}) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getPullRequests(repoId, params);
      if (response && response.success) {
        setPullRequests(response.data);
        return response.data;
      }
      throw new Error(response?.message || 'Failed to fetch pull requests');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch pull requests';
      setError(msg);
      setPullRequests(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIssues = useCallback(async (repoId, params = {}) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getIssues(repoId, params);
      if (response && response.success) {
        setIssues(response.data);
        return response.data;
      }
      throw new Error(response?.message || 'Failed to fetch issues');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch issues';
      setError(msg);
      setIssues(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clearError,
    velocity,
    commits,
    commitChart,
    contributors,
    pullRequests,
    issues,
    fetchVelocity,
    fetchCommitChart,
    fetchCommits,
    fetchContributors,
    fetchPullRequests,
    fetchIssues
  };
}
