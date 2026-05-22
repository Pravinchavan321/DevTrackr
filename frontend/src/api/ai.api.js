import api from './axios';

export const generateSprintSummary = async (repoId, body = {}, options = {}) => {
  const response = await api.post(`/ai/repos/${repoId}/summarize`, body, { params: options });
  return response.data;
};

export const generateBottlenecks = async (repoId, options = {}) => {
  const response = await api.post(`/ai/repos/${repoId}/bottlenecks`, {}, { params: options });
  return response.data;
};

export const generateContributorAnalysis = async (repoId, options = {}) => {
  const response = await api.post(`/ai/repos/${repoId}/contributors`, {}, { params: options });
  return response.data;
};

export const generateRecommendations = async (repoId, options = {}) => {
  const response = await api.post(`/ai/repos/${repoId}/recommendations`, {}, { params: options });
  return response.data;
};

export const getInsights = async (repoId) => {
  const response = await api.get(`/ai/repos/${repoId}/insights`);
  return response.data;
};
