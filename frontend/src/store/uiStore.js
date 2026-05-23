import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.localStorage.getItem('devtrackr-theme') || 'dark';
};

const useUiStore = create((set) => ({
  sidebarOpen: false,
  theme: getInitialTheme(),
  globalLoading: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (sidebarOpen) =>
    set((state) => (state.sidebarOpen === sidebarOpen ? state : { sidebarOpen })),
  
  setTheme: (theme) =>
    set((state) => (state.theme === theme ? state : { theme })),

  toggleTheme: () => set((state) => ({
    theme: state.theme === 'dark' ? 'light' : 'dark'
  })),
  
  setGlobalLoading: (globalLoading) =>
    set((state) => (state.globalLoading === globalLoading ? state : { globalLoading }))
}));

export default useUiStore;
