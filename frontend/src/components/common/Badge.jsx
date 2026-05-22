import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
  const baseStyle = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-150';

  const variants = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    danger: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    neutral: 'bg-gray-800/80 border-gray-700/60 text-gray-300'
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
