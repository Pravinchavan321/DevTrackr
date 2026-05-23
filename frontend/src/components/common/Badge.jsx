import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
  const baseStyle = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-150';

  const variants = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    danger: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    neutral: 'bg-gray-700/60 border-gray-600/50 text-gray-300'
  };

  const hasNumbers = typeof children === 'string' ? /\d/.test(children) : typeof children === 'number';
  const monoClass = hasNumbers ? 'font-mono' : '';

  return (
    <span className={`${baseStyle} ${variants[variant]} ${monoClass} ${className}`}>
      {children}
    </span>
  );
}
