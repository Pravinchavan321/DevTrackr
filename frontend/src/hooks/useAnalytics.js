import { useState, useCallback } from 'react';
import * as analyticsApi from '../api/analytics.api';

const CACHE_TTL_MS = 5 * 60 * 1000;
const analyticsCache = new Map();
const inflightRequests = new Map();

const stableParamsKey = (params = {}) =>
  Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join('|');

const cacheKey = (type, repoId, params = {}) => `${type}:${repoId}:${stableParamsKey(params)}`;

const getCachedData = (key) => {
  const cached = analyticsCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.updatedAt > CACHE_TTL_MS) {
    analyticsCache.delete(key);
    return null;
  }

  return cached.data;
};

const fetchCachedAnalytics = async (key, requestFn) => {
  const cached = getCachedData(key);
  if (cached !== null) {
    return cached;
  }

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const request = requestFn()
    .then((response) => {
      if (response && response.success) {
        analyticsCache.set(key, {
          data: response.data,
          updatedAt: Date.now()
        });
        return response.data;
      }

      throw new Error(response?.message || 'Failed to fetch analytics data');
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, request);
  return request;
};

export const invalidateAnalyticsCache = (repoId = null) => {
  if (!repoId) {
    analyticsCache.clear();
    inflightRequests.clear();
    return;
  }

  for (const key of analyticsCache.keys()) {
    if (key.includes(`:${repoId}:`)) {
      analyticsCache.delete(key);
    }
  }

  for (const key of inflightRequests.keys()) {
    if (key.includes(`:${repoId}:`)) {
      inflightRequests.delete(key);
    }
  }
};

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
    const key = cacheKey('velocity', repoId);
    try {
      const data = await fetchCachedAnalytics(key, () => analyticsApi.getVelocity(repoId));
      setVelocity(data);
      return data;
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
    const key = cacheKey('commitChart', repoId, params);
    try {
      const data = await fetchCachedAnalytics(key, () => analyticsApi.getCommitChart(repoId, params));
      setCommitChart(data);
      return data;
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
    const key = cacheKey('commits', repoId, params);
    try {
      const data = await fetchCachedAnalytics(key, () => analyticsApi.getCommits(repoId, params));
      setCommits(data);
      return data;
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
    const key = cacheKey('contributors', repoId);
    try {
      const data = await fetchCachedAnalytics(key, () => analyticsApi.getContributors(repoId));
      setContributors(data);
      return data;
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
    const key = cacheKey('pullRequests', repoId, params);
    try {
      const data = await fetchCachedAnalytics(key, () => analyticsApi.getPullRequests(repoId, params));
      setPullRequests(data);
      return data;
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
    const key = cacheKey('issues', repoId, params);
    try {
      const data = await fetchCachedAnalytics(key, () => analyticsApi.getIssues(repoId, params));
      setIssues(data);
      return data;
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
