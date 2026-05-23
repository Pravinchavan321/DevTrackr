import React from 'react';
import SkeletonLoader from '../common/SkeletonLoader';
import Badge from '../common/Badge';

/**
 * InsightCard component wraps individual insight sections.
 * Handles loading skeletons, error states, and custom action/footer sections.
 */
export default function InsightCard({
  title,
  description,
  children,
  type,
  timestamp,
  loading = false,
  error = null,
  action = null,
  footer = null,
  isFocused = false,
  isAnyFocused = false,
  onActivate,
  onClose,
  className = ''
}) {
  const typeBgMap = {
    sprint_summary: 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)]',
    bottleneck: 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]',
    recommendations: 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]',
    contributor: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
  };
  const bgClass = type ? typeBgMap[type] || 'bg-gray-600' : '';
  const focusClass = `${isFocused ? 'is-focused' : ''} ${isAnyFocused && !isFocused ? 'is-muted-by-focus' : ''}`;

  const handleActivate = (event) => {
    const interactiveElement = event.target.closest('button, a, input, select, textarea, label');
    if (interactiveElement || isFocused || !onActivate) return;
    onActivate();
  };

  const handleKeyDown = (event) => {
    if (!onActivate || isFocused) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl h-full ${focusClass} ${className}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      role={onActivate && !isFocused ? 'button' : undefined}
      tabIndex={onActivate && !isFocused ? 0 : undefined}
    >
      <div className={`insight-panel rotating-border-card flex flex-col h-full rounded-2xl bg-gray-900/60 backdrop-blur-md border border-gray-700/50 shadow-xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2),0_4px_12px_rgba(0,0,0,0.4)] hover:border-violet-500/40 relative`}>
        {isFocused && (
          <button
            type="button"
            className="insight-focus-close"
            onClick={(event) => {
              event.stopPropagation();
              onClose?.();
            }}
            aria-label="Close focused insight"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {type && (
          <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${bgClass}`}></div>
        )}
        {/* Card Header */}
        <div className="insight-card-header flex items-start justify-between border-b border-gray-800/80 p-5 bg-transparent pl-7">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {type && (
                <div className="relative flex items-center justify-center mr-2">
                  <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full scale-150"></div>
                  <svg className="h-5 w-5 text-violet-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              )}
              <h3 className="text-base font-semibold text-gray-100 tracking-wide">{title}</h3>
            {type && <Badge variant="info">{type.replace('_', ' ')}</Badge>}
            {timestamp && <span className="text-gray-500 text-xs font-mono">{timestamp}</span>}
          </div>
          {description && (
            <p className="text-xs text-gray-400 font-normal leading-relaxed">{description}</p>
          )}
        </div>
        {action && <div className="insight-card-action ml-4 shrink-0">{action}</div>}
      </div>

      {/* Card Content Block */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="space-y-4">
            <SkeletonLoader variant="text" count={3} />
            <div className="flex items-center space-x-3 pt-2">
              <SkeletonLoader variant="text" count={1} className="w-1/3" />
              <SkeletonLoader variant="text" count={1} className="w-1/4" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-200">Analysis Failed</h4>
              <p className="text-xs text-gray-400 max-w-xs">{error}</p>
            </div>
          </div>
        ) : children ? (
          <div className="ai-insight-copy text-gray-300 leading-relaxed">
            {children}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
            <svg
              className="h-8 w-8 mb-2 opacity-40 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="text-xs font-normal">No insights generated yet.</p>
          </div>
        )}
      </div>

      {/* Card Footer */}
      {footer && (
        <div className="border-t border-gray-800/80 px-6 py-3.5 bg-gray-950/30 pl-8">
          {footer}
        </div>
      )}
      </div>
    </div>
  );
}
