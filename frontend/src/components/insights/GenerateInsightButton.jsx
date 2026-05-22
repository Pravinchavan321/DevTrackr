import React from 'react';

/**
 * GenerateInsightButton Component
 * Renders an accessible button with interactive states and load indications.
 */
export default function GenerateInsightButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  variant = 'primary',
  className = ''
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-sm';
  
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500 focus:ring-offset-gray-950 border border-transparent disabled:bg-indigo-800/50 disabled:text-indigo-300/60',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 focus:ring-indigo-500 focus:ring-offset-gray-950 border border-gray-700 disabled:bg-gray-900 disabled:border-gray-800 disabled:text-gray-500',
    ghost: 'bg-transparent hover:bg-gray-800/80 text-gray-400 hover:text-gray-200 border border-transparent disabled:opacity-40 focus:ring-indigo-500 focus:ring-offset-gray-950'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Analyzing Repo...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
