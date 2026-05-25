import api from './axios';

export const getGithubStatus = async () => {
  const response = await api.get('/github/status');
  return response.data;
};

export const connectGithub = async () => {
  const response = await api.get('/github/connect?json=true');
  return response.data; // Will contain data.url
};

export const disconnectGithub = async () => {
  const response = await api.delete('/github/disconnect');
  return response.data;
};

export const getRepos = async () => {
  const response = await api.get('/github/repos');
  return response.data;
};

export const getRepositoryActivityStatus = async (repoId) => {
  const response = await api.get(`/github/repos/${repoId}/activity-status`);
  return response.data;
};

export const syncRepo = async (repoFullName) => {
  const encodedName = encodeURIComponent(repoFullName);
  const response = await api.post(`/github/repos/${encodedName}/sync`);
  return response.data;
};
