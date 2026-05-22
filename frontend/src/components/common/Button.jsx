import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = ''
}) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border border-transparent shadow-sm disabled:bg-indigo-800 disabled:opacity-50 focus:ring-offset-gray-950',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 disabled:bg-gray-900 disabled:opacity-50 focus:ring-offset-gray-950',
    danger: 'bg-red-600 hover:bg-red-500 text-white border border-transparent shadow-sm disabled:bg-red-800 disabled:opacity-50 focus:ring-offset-gray-950 focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-50 border border-transparent'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
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
      )}
      {children}
    </button>
  );
}
