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
  const baseStyle = 'inline-flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0';

  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl px-4 py-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] active:translate-y-0.5',
    secondary: 'bg-gray-800/60 border border-gray-700/50 hover:border-violet-500/40 hover:bg-gray-700/60 text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200',
    danger: 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl px-4 py-2 transition-all duration-200 focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-800/60 text-gray-400 hover:text-white rounded-xl px-4 py-2 transition-all duration-200'
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
