import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import AuthLayout from '../components/auth/AuthLayout';
import useAuth from '../hooks/useAuth';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const queryParams = new URLSearchParams(location.search);
  const sessionExpired = queryParams.get('expired') === 'true';

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const res = await login(formData);
    if (res.success) {
      toast.success('Successfully signed in! Welcome back.');
      navigate(from, { replace: true });
    } else {
      toast.error(res.message);
    }
  };

  const inputClass = (field) =>
    `auth-input block w-full rounded-2xl border bg-white/[0.055] px-4 py-3.5 text-sm font-medium text-white placeholder:text-gray-500 transition-all duration-200 focus:bg-white/[0.075] focus:outline-none ${
      errors[field]
        ? 'border-red-400/70 focus:border-red-300 focus:ring-4 focus:ring-red-500/10'
        : 'border-white/10 hover:border-white/20 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10'
    }`;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to keep your repositories, sprint signals, and AI insights moving."
      switchText="New to DevTrackr?"
      switchLabel="Create a new account"
      switchTo="/register"
      badge="AI insights"
      mode="login"
    >
      <form onSubmit={handleLoginSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold tracking-wide text-gray-200">
            Email Address <span className="text-red-300">*</span>
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            className={inputClass('email')}
          />
          {errors.email && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-300">
              <ExclamationCircleIcon className="h-4 w-4" />
              {errors.email}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-semibold tracking-wide text-gray-200">
            Password <span className="text-red-300">*</span>
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            className={inputClass('password')}
          />
          {errors.password && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-300">
              <ExclamationCircleIcon className="h-4 w-4" />
              {errors.password}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="auth-submit-button inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_42px_rgba(99,102,241,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_56px_rgba(34,211,238,0.22)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-cyan-300/20"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle" />
              <span>Signing in...</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
