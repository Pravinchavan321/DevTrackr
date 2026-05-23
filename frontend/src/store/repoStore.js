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
  
  setSyncing: (isSyncing) =>
    set((state) => (state.isSyncing === isSyncing ? state : { isSyncing })),
  
  setRateLimitWarning: (rateLimitWarning) =>
    set((state) => (state.rateLimitWarning === rateLimitWarning ? state : { rateLimitWarning })),

  setConnectionStatus: ({ isConnected, githubUsername = '' }) =>
    set((state) =>
      state.isConnected === isConnected && state.githubUsername === githubUsername
        ? state
        : { isConnected, githubUsername }
    ),

  setStatusLoading: (statusLoading) =>
    set((state) => (state.statusLoading === statusLoading ? state : { statusLoading })),

  setReposLoading: (reposLoading) =>
    set((state) => (state.reposLoading === reposLoading ? state : { reposLoading })),

  setActiveUserId: (activeUserId) =>
    set((state) => (state.activeUserId === activeUserId ? state : { activeUserId })),
  
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
