import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as aiApi from '../api/ai.api';
import * as exportApi from '../api/export.api';

const INSIGHTS_CACHE_TTL_MS = 5 * 60 * 1000;
const emptyInsights = () => ({
  sprint_summary: null,
  bottleneck: null,
  contributor_analysis: null,
  recommendations: null
});
const insightsCache = new Map();
const insightsInflight = new Map();

const mapInsightDocs = (insightsArray = []) => {
  const mapped = emptyInsights();

  insightsArray.forEach((item) => {
    if (item && item.type && mapped[item.type] === null) {
      // Keep the latest one per type, which sort generatedAt: -1 handles.
      mapped[item.type] = item;
    } else if (item && item.type) {
      mapped[item.type] = item;
    }
  });

  return mapped;
};

const getCachedInsights = (repoId) => {
  const cached = insightsCache.get(repoId);
  if (!cached) return null;

  if (Date.now() - cached.updatedAt > INSIGHTS_CACHE_TTL_MS) {
    insightsCache.delete(repoId);
    return null;
  }

  return cached.data;
};

const setInsightsCache = (repoId, data) => {
  insightsCache.set(repoId, {
    data,
    updatedAt: Date.now()
  });
};

const updateInsightCacheDoc = (repoId, type, doc) => {
  const current = getCachedInsights(repoId) || emptyInsights();
  const next = {
    ...current,
    [type]: doc
  };
  setInsightsCache(repoId, next);
  return next;
};

export default function useInsights() {
  const [loading, setLoading] = useState(false);
  const [cachedInsights, setCachedInsights] = useState(emptyInsights);
  const [error, setError] = useState(null);
  
  const [generating, setGenerating] = useState({
    sprint_summary: false,
    bottleneck: false,
    contributor_analysis: false,
    recommendations: false
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchInsights = useCallback(async (repoId) => {
    if (!repoId) return;
    const cached = getCachedInsights(repoId);
    if (cached) {
      setCachedInsights(cached);
      setError(null);
      return cached;
    }

    setLoading(true);
    setError(null);
    try {
      const request = insightsInflight.get(repoId) || aiApi.getInsights(repoId);
      insightsInflight.set(repoId, request);
      const response = await request;
      if (response && response.success) {
        const mapped = mapInsightDocs(response.data || []);
        setInsightsCache(repoId, mapped);
        setCachedInsights(mapped);
        return mapped;
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to fetch AI insights';
      setError(errMsg);
    } finally {
      insightsInflight.delete(repoId);
      setLoading(false);
    }
  }, []);

  const generateSprintSummary = useCallback(async (repoId, body = {}, options = {}) => {
    if (!repoId) return null;
    
    setGenerating(prev => ({ ...prev, sprint_summary: true }));
    setError(null);
    
    try {
      const response = await aiApi.generateSprintSummary(repoId, body, options);
      if (response && response.success) {
        const doc = response.data;
        const next = updateInsightCacheDoc(repoId, 'sprint_summary', doc);
        setCachedInsights(next);
        toast.success(options.force ? 'Sprint summary regenerated!' : 'Sprint summary generated!');
        return doc;
      }
      throw new Error(response?.message || 'Failed to generate sprint summary');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to generate sprint summary';
      setError(errMsg);
      toast.error(errMsg);
      return null;
    } finally {
      setGenerating(prev => ({ ...prev, sprint_summary: false }));
    }
  }, []);

  const generateBottlenecks = useCallback(async (repoId, options = {}) => {
    if (!repoId) return null;
    
    setGenerating(prev => ({ ...prev, bottleneck: true }));
    setError(null);
    
    try {
      const response = await aiApi.generateBottlenecks(repoId, options);
      if (response && response.success) {
        const doc = response.data;
        const next = updateInsightCacheDoc(repoId, 'bottleneck', doc);
        setCachedInsights(next);
        toast.success(options.force ? 'Bottleneck analysis regenerated!' : 'Bottleneck analysis generated!');
        return doc;
      }
      throw new Error(response?.message || 'Failed to detect bottlenecks');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to detect bottlenecks';
      setError(errMsg);
      toast.error(errMsg);
      return null;
    } finally {
      setGenerating(prev => ({ ...prev, bottleneck: false }));
    }
  }, []);

  const generateContributorAnalysis = useCallback(async (repoId, options = {}) => {
    if (!repoId) return null;
    
    setGenerating(prev => ({ ...prev, contributor_analysis: true }));
    setError(null);
    
    try {
      const response = await aiApi.generateContributorAnalysis(repoId, options);
      if (response && response.success) {
        const doc = response.data;
        const next = updateInsightCacheDoc(repoId, 'contributor_analysis', doc);
        setCachedInsights(next);
        toast.success(options.force ? 'Contributor analysis regenerated!' : 'Contributor analysis generated!');
        return doc;
      }
      throw new Error(response?.message || 'Failed to generate contributor analysis');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to generate contributor analysis';
      setError(errMsg);
      toast.error(errMsg);
      return null;
    } finally {
      setGenerating(prev => ({ ...prev, contributor_analysis: false }));
    }
  }, []);

  const generateRecommendations = useCallback(async (repoId, options = {}) => {
    if (!repoId) return null;
    
    setGenerating(prev => ({ ...prev, recommendations: true }));
    setError(null);
    
    try {
      const response = await aiApi.generateRecommendations(repoId, options);
      if (response && response.success) {
        const doc = response.data;
        const next = updateInsightCacheDoc(repoId, 'recommendations', doc);
        setCachedInsights(next);
        toast.success(options.force ? 'Recommendations regenerated!' : 'Recommendations generated!');
        return doc;
      }
      throw new Error(response?.message || 'Failed to generate recommendations');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to generate recommendations';
      setError(errMsg);
      toast.error(errMsg);
      return null;
    } finally {
      setGenerating(prev => ({ ...prev, recommendations: false }));
    }
  }, []);

  const downloadPdfReport = useCallback(async (repoId, repoName) => {
    if (!repoId) return false;
    
    const toastId = toast.loading('Generating and downloading PDF report...');
    try {
      const blob = await exportApi.downloadPdfReport(repoId);
      
      // Setup browser anchor to trigger clean dynamic download
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      const safeRepoName = (repoName || 'repository').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      link.setAttribute('download', `devtrackr-report-${safeRepoName}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up DOM and revoke temporary Object URL context
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF Report downloaded successfully!', { id: toastId });
      return true;
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to download PDF report. Make sure at least some AI insights are generated.', { id: toastId });
      return false;
    }
  }, []);

  return {
    loading,
    cachedInsights,
    error,
    generating,
    fetchInsights,
    generateSprintSummary,
    generateBottlenecks,
    generateContributorAnalysis,
    generateRecommendations,
    downloadPdfReport,
    clearError
  };
}
