import api from './axios';

export const getCommits = async (repoId, params = {}) => {
  const response = await api.get(`/analytics/repos/${repoId}/commits`, { params });
  return response.data;
};

export const getCommitChart = async (repoId, params = {}) => {
  const response = await api.get(`/analytics/repos/${repoId}/commits/chart`, { params });
  return response.data;
};

export const getContributors = async (repoId) => {
  const response = await api.get(`/analytics/repos/${repoId}/contributors`);
  return response.data;
};

export const getPullRequests = async (repoId, params = {}) => {
  const response = await api.get(`/analytics/repos/${repoId}/pullrequests`, { params });
  return response.data;
};

export const getIssues = async (repoId, params = {}) => {
  const response = await api.get(`/analytics/repos/${repoId}/issues`, { params });
  return response.data;
};

export const getVelocity = async (repoId) => {
  const response = await api.get(`/analytics/repos/${repoId}/velocity`);
  return response.data;
};
