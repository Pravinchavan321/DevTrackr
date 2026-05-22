import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import LoginForm from '../components/auth/LoginForm';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';
  const queryParams = new URLSearchParams(location.search);
  const sessionExpired = queryParams.get('expired') === 'true';

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Show session expired toast once on mount if applicable
  useEffect(() => {
    if (sessionExpired) {
      toast.error('Session expired. Please sign in again.');
    }
  }, [sessionExpired]);

  const handleLoginSubmit = async (credentials) => {
    const res = await login(credentials);
    if (res.success) {
      toast.success('Successfully signed in! Welcome back.');
      navigate(from, { replace: true });
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-indigo-500 selection:text-white">
      {/* Background radial gradient */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,rgba(0,0,0,0)_60%)]"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* Header Icon & Logo */}
        <div className="flex flex-col items-center">
          <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/30 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950">
            <svg
              className="h-6.5 w-6.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </Link>
          <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
            Sign in to DevTrackr
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Or{' '}
            <Link
              to="/register"
              className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
            >
              create a new account
            </Link>
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-900 border border-gray-850/80 rounded-2xl shadow-xl py-8 px-4 sm:px-10 max-w-sm mx-auto sm:max-w-md w-full">
          <LoginForm onSubmit={handleLoginSubmit} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
