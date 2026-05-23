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

  setUser: (user) =>
    set((state) => (state.user === user ? state : { user })),

  setAccessToken: (accessToken) => set({
    accessToken,
    isAuthenticated: !!accessToken
  }),

  setLoading: (isLoading) =>
    set((state) => (state.isLoading === isLoading ? state : { isLoading }))
}));

export default useAuthStore;
