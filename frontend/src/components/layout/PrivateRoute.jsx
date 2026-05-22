import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import SkeletonLoader from '../common/SkeletonLoader';
import useAuth from '../../hooks/useAuth';

export default function PrivateRoute() {
  const { isAuthenticated, isLoading, loadUser } = useAuth();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (!isAuthenticated) {
        await loadUser();
      }
      setChecked(true);
    };
    initAuth();
  }, [isAuthenticated, loadUser]);

  if (isLoading || !checked) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        <p className="text-gray-400 animate-pulse">Checking authentication state...</p>
        <div className="w-full max-w-md pt-4">
          <SkeletonLoader count={3} />
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}
