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
  activeUserId: null,

  setRepos: (repos) => set({ repos }),
  
  setSelectedRepo: (selectedRepo) =>
    set((state) => {
      const activeUserId = state.activeUserId;
      if (activeUserId) {
        const key = `devtrackr_selected_repo_name_${activeUserId}`;
        if (selectedRepo) {
          localStorage.setItem(key, selectedRepo.fullName);
        } else {
          localStorage.removeItem(key);
        }
      }
      return { selectedRepo };
    }),
  
  setSyncing: (isSyncing) => set({ isSyncing }),
  
  setRateLimitWarning: (rateLimitWarning) => set({ rateLimitWarning }),

  setConnectionStatus: ({ isConnected, githubUsername = '' }) =>
    set({ isConnected, githubUsername }),

  setStatusLoading: (statusLoading) => set({ statusLoading }),

  setReposLoading: (reposLoading) => set({ reposLoading }),

  setActiveUserId: (activeUserId) => set({ activeUserId }),
  
  clearRepos: () =>
    set((state) => {
      const activeUserId = state.activeUserId;
      if (activeUserId) {
        localStorage.removeItem(`devtrackr_selected_repo_name_${activeUserId}`);
      }
      return {
        repos: [],
        selectedRepo: null,
        isSyncing: false,
        rateLimitWarning: false,
        isConnected: false,
        githubUsername: ''
      };
    })
}));

export default useRepoStore;
