import api from './axios';

export const getReleaseReadiness = async (repoId) => {
  const response = await api.get(`/engineering-intelligence/repos/${repoId}/release-readiness`);
  return response.data;
};

export const getWorkloadHealth = async (repoId) => {
  const response = await api.get(`/engineering-intelligence/repos/${repoId}/workload-health`);
  return response.data;
};

export const getSprintRetrospective = async (repoId, params = {}) => {
  const response = await api.get(`/engineering-intelligence/repos/${repoId}/sprint-retrospective`, { params });
  return response.data;
};
