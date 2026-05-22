import { useCallback } from 'react';
import useAuthStore from '../store/authStore';
import * as authApi from '../api/auth.api';

export default function useAuth() {
  const { user, accessToken, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      // First try to refresh access token silently
      const refreshData = await authApi.refresh();
      if (refreshData && refreshData.success) {
        const { accessToken: newAccessToken, user: userData } = refreshData.data;
        setAuth(userData, newAccessToken);
      } else {
        clearAuth();
      }
    } catch (error) {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [setAuth, clearAuth, setLoading]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const response = await authApi.login(credentials);
      if (response && response.success) {
        const { user: userData, accessToken: token } = response.data;
        setAuth(userData, token);
        return { success: true };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const response = await authApi.register(userData);
      if (response && response.success) {
        const { user: newUserData, accessToken: token } = response.data;
        setAuth(newUserData, token);
        return { success: true };
      }
      return { success: false, message: response.message || 'Registration failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      const errors = error.response?.data?.errors || [];
      return { success: false, message, errors };
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch (error) {
      // Even if network call fails, we clear state locally
    } finally {
      clearAuth();
      setLoading(false);
    }
  }, [clearAuth, setLoading]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    loadUser,
    login,
    register,
    logout
  };
}
