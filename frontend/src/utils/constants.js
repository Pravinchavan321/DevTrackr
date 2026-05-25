export const APP_NAME = 'DevTrackr';
export const APP_DESCRIPTION = 'AI-Powered Developer Productivity Dashboard';

export const API_ROUTES = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me'
  },
  GITHUB: {
    STATUS: '/github/status',
    CONNECT: '/github/connect',
    CALLBACK: '/github/callback',
    REPOS: '/github/repos',
    ACTIVITY_STATUS: (repoId) => `/github/repos/${repoId}/activity-status`,
    SYNC: (repoFullName) => `/github/repos/${encodeURIComponent(repoFullName)}/sync`,
    DISCONNECT: '/github/disconnect'
  },
  ANALYTICS: {
    COMMITS: (repoId) => `/analytics/repos/${repoId}/commits`,
    COMMIT_CHART: (repoId) => `/analytics/repos/${repoId}/commits/chart`,
    CONTRIBUTORS: (repoId) => `/analytics/repos/${repoId}/contributors`,
    PULL_REQUESTS: (repoId) => `/analytics/repos/${repoId}/pullrequests`,
    ISSUES: (repoId) => `/analytics/repos/${repoId}/issues`,
    HEALTH: (repoId) => `/analytics/repos/${repoId}/health`,
    VELOCITY: (repoId) => `/analytics/repos/${repoId}/velocity`
  },
  AI: {
    SUMMARIZE: (repoId) => `/ai/repos/${repoId}/summarize`,
    BOTTLENECKS: (repoId) => `/ai/repos/${repoId}/bottlenecks`,
    CONTRIBUTORS: (repoId) => `/ai/repos/${repoId}/contributors`,
    RECOMMENDATIONS: (repoId) => `/ai/repos/${repoId}/recommendations`,
    INSIGHTS: (repoId) => `/ai/repos/${repoId}/insights`
  },
  EXPORT: {
    PDF: (repoId) => `/export/repos/${repoId}/pdf`
  }
};

export const DEFAULT_SPRINT_DAYS = 14;
