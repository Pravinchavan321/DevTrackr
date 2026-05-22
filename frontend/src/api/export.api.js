import api from './axios';

export const downloadPdfReport = async (repoId) => {
  const response = await api.get(`/export/repos/${repoId}/pdf`, {
    responseType: 'blob'
  });
  return response.data;
};
