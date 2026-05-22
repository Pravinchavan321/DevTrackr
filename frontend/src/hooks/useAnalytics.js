import { useState, useCallback } from 'react';
import * as analyticsApi from '../api/analytics.api';

export default function useAnalytics() {
  const [loading, setLoading] = useState(false);
  const [velocity, setVelocity] = useState(null);
  const [error, setError] = useState(null);

  const fetchVelocity = useCallback(async (repoId) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getVelocity(repoId);
      if (response && response.success) {
        setVelocity(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch velocity metrics');
      setVelocity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    velocity,
    error,
    fetchVelocity
  };
}
