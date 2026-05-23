import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import AuthLayout from '../components/auth/AuthLayout';
import useAuth from '../hooks/useAuth';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    const { password } = formData;
    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      } else if (!/[A-Z]/.test(password)) {
        newErrors.password = 'Password must contain at least one uppercase letter';
      } else if (!/[a-z]/.test(password)) {
        newErrors.password = 'Password must contain at least one lowercase letter';
      } else if (!/[0-9]/.test(password)) {
        newErrors.password = 'Password must contain at least one number';
      } else if (!/[^A-Za-z0-9]/.test(password)) {
        newErrors.password = 'Password must contain at least one special character (e.g. !@#$%^&*)';
      }
    }

    if (formData.confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const { confirmPassword, ...submitData } = formData;
    const res = await register(submitData);
    if (res.success) {
      toast.success('Successfully created account! Welcome to DevTrackr.');
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(res.message || 'Registration failed');
    }
  };

  const inputClass = (field) =>
    `auth-input block w-full rounded-2xl border bg-white/[0.055] px-4 py-3.5 text-sm font-medium text-white placeholder:text-gray-500 transition-all duration-200 focus:bg-white/[0.075] focus:outline-none ${
      errors[field]
        ? 'border-red-400/70 focus:border-red-300 focus:ring-4 focus:ring-red-500/10'
        : 'border-white/10 hover:border-white/20 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10'
    }`;

  const passwordStrengthClass = (index) => {
    const length = formData.password.length;
    if (length === 0) return 'bg-white/10';
    if (length < 6) return index === 1 ? 'bg-red-400' : 'bg-white/10';
    if (length < 8) return index <= 2 ? 'bg-amber-300' : 'bg-white/10';
    if (length < 12) return index <= 3 ? 'bg-emerald-300' : 'bg-white/10';
    return 'bg-gradient-to-r from-emerald-300 to-cyan-300';
  };

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Start tracking repos, sprint progress, commits, and AI-powered delivery signals."
      switchText="Already have an account?"
      switchLabel="Sign in instead"
      switchTo="/login"
      badge="workspace setup"
      mode="register"
    >
      <form onSubmit={handleRegisterSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="register-name" className="mb-2 block text-sm font-semibold tracking-wide text-gray-200">
            Full Name <span className="text-red-300">*</span>
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            className={inputClass('name')}
          />
          {errors.name && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-300">
              <ExclamationCircleIcon className="h-4 w-4" />
              {errors.name}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="register-email" className="mb-2 block text-sm font-semibold tracking-wide text-gray-200">
            Email Address <span className="text-red-300">*</span>
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="mb-2 block text-sm font-semibold tracking-wide text-gray-200">
            Password <span className="text-red-300">*</span>
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            placeholder="Create a secure password"
            value={formData.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            className={inputClass('password')}
          />
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${passwordStrengthClass(index)}`}
              />
            ))}
          </div>
          {errors.password && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-300">
              <ExclamationCircleIcon className="h-4 w-4" />
              {errors.password}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-semibold tracking-wide text-gray-200">
            Confirm Password <span className="text-red-300">*</span>
          </label>
          <div className="relative">
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              aria-invalid={Boolean(errors.confirmPassword)}
              className={`${inputClass('confirmPassword')} pr-11`}
            />
            {formData.confirmPassword !== '' && formData.password !== '' && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                {formData.confirmPassword === formData.password ? (
                  <CheckCircleIcon className="h-5 w-5 text-emerald-300" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-300" />
                )}
              </span>
            )}
          </div>
          {errors.confirmPassword && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-300">
              <ExclamationCircleIcon className="h-4 w-4" />
              {errors.confirmPassword}
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
              <span>Creating account...</span>
            </>
          ) : (
            'Sign Up'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
