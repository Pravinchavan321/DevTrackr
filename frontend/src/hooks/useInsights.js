import { useState, useCallback } from 'react';
import * as aiApi from '../api/ai.api';

export default function useInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async (repoId) => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.getInsights(repoId);
      if (response && response.success) {
        setInsights(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch AI insights');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    insights,
    error,
    fetchInsights
  };
}
