import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  setAuth: (user, accessToken) => set({
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    isLoading: false
  }),

  clearAuth: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false
  }),

  setUser: (user) => set({ user }),

  setAccessToken: (accessToken) => set({
    accessToken,
    isAuthenticated: !!accessToken
  }),

  setLoading: (isLoading) => set({ isLoading })
}));

export default useAuthStore;
