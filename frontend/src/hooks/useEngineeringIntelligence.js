import { useCallback, useState } from 'react';
import * as engineeringIntelligenceApi from '../api/engineeringIntelligence.api';

export default function useEngineeringIntelligence() {
  const [loading, setLoading] = useState(false);
  const [releaseReadiness, setReleaseReadiness] = useState(null);
  const [workloadHealth, setWorkloadHealth] = useState(null);
  const [sprintRetrospective, setSprintRetrospective] = useState(null);
  const [errors, setErrors] = useState({});

  const fetchEngineeringIntelligence = useCallback(async (repoId, options = {}) => {
    if (!repoId) return null;

    setLoading(true);
    setErrors({});

    const range = options.range || '7d';
    const [releaseResult, workloadResult, retrospectiveResult] = await Promise.allSettled([
      engineeringIntelligenceApi.getReleaseReadiness(repoId),
      engineeringIntelligenceApi.getWorkloadHealth(repoId),
      engineeringIntelligenceApi.getSprintRetrospective(repoId, { range })
    ]);

    const nextErrors = {};

    if (releaseResult.status === 'fulfilled' && releaseResult.value?.success) {
      setReleaseReadiness(releaseResult.value.data);
    } else {
      setReleaseReadiness(null);
      nextErrors.releaseReadiness = releaseResult.reason?.response?.data?.message
        || releaseResult.reason?.message
        || 'Release readiness is temporarily unavailable';
    }

    if (workloadResult.status === 'fulfilled' && workloadResult.value?.success) {
      setWorkloadHealth(workloadResult.value.data);
    } else {
      setWorkloadHealth(null);
      nextErrors.workloadHealth = workloadResult.reason?.response?.data?.message
        || workloadResult.reason?.message
        || 'Workload intelligence is temporarily unavailable';
    }

    if (retrospectiveResult.status === 'fulfilled' && retrospectiveResult.value?.success) {
      setSprintRetrospective(retrospectiveResult.value.data);
    } else {
      setSprintRetrospective(null);
      nextErrors.sprintRetrospective = retrospectiveResult.reason?.response?.data?.message
        || retrospectiveResult.reason?.message
        || 'Sprint retrospective is temporarily unavailable';
    }

    setErrors(nextErrors);
    setLoading(false);

    return {
      releaseReadiness: releaseResult.value?.data || null,
      workloadHealth: workloadResult.value?.data || null,
      sprintRetrospective: retrospectiveResult.value?.data || null,
      errors: nextErrors
    };
  }, []);

  return {
    loading,
    releaseReadiness,
    workloadHealth,
    sprintRetrospective,
    errors,
    fetchEngineeringIntelligence
  };
}
