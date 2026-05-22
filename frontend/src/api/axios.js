import axios from 'axios';
import useAuthStore from '../store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Variables to handle refreshing queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 and refresh token silently
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and not already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // If we are already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark original request as retried
      originalRequest._retry = true;
      isRefreshing = true;

      // Avoid refreshing if the request was to refresh token or login/register itself
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/register')) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint to obtain new access token via HTTP-only cookie
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        
        if (refreshResponse.data && refreshResponse.data.success) {
          const { accessToken, user } = refreshResponse.data.data;
          
          // Update Zustand store
          useAuthStore.getState().setAuth(user, accessToken);
          
          // Process queued requests
          processQueue(null, accessToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          isRefreshing = false;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token is expired or invalid
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        isRefreshing = false;
        
        // Redirect to login (only if not on landing or login pages)
        const path = window.location.pathname;
        if (path !== '/' && path !== '/login' && path !== '/register') {
          window.location.href = '/login?expired=true';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
