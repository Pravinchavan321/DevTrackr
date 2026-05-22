import { create } from 'zustand';

const useUiStore = create((set) => ({
  sidebarOpen: false,
  theme: 'dark',
  globalLoading: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  
  setTheme: (theme) => set({ theme }),
  
  setGlobalLoading: (globalLoading) => set({ globalLoading })
}));

export default useUiStore;
