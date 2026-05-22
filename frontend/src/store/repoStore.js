import { create } from 'zustand';

const useRepoStore = create((set) => ({
  repos: [],
  selectedRepo: null,
  isSyncing: false,
  rateLimitWarning: false,
  isConnected: false,
  githubUsername: '',
  statusLoading: true,
  reposLoading: false,

  setRepos: (repos) => set({ repos }),
  
  setSelectedRepo: (selectedRepo) => set({ selectedRepo }),
  
  setSyncing: (isSyncing) => set({ isSyncing }),
  
  setRateLimitWarning: (rateLimitWarning) => set({ rateLimitWarning }),

  setConnectionStatus: ({ isConnected, githubUsername = '' }) =>
    set({ isConnected, githubUsername }),

  setStatusLoading: (statusLoading) => set({ statusLoading }),

  setReposLoading: (reposLoading) => set({ reposLoading }),
  
  clearRepos: () =>
    set({
      repos: [],
      selectedRepo: null,
      isSyncing: false,
      rateLimitWarning: false,
      isConnected: false,
      githubUsername: ''
    })
}));

export default useRepoStore;
