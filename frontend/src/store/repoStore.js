import { create } from 'zustand';

const useRepoStore = create((set) => ({
  repos: [],
  selectedRepo: null,
  isSyncing: false,
  rateLimitWarning: false,

  setRepos: (repos) => set({ repos }),
  
  setSelectedRepo: (selectedRepo) => set({ selectedRepo }),
  
  setSyncing: (isSyncing) => set({ isSyncing }),
  
  setRateLimitWarning: (rateLimitWarning) => set({ rateLimitWarning }),
  
  clearRepos: () => set({ repos: [], selectedRepo: null, isSyncing: false, rateLimitWarning: false })
}));

export default useRepoStore;
