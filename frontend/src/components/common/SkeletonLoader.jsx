import React from 'react';

export default function SkeletonLoader({ count = 1, variant = 'text', className = '' }) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 animate-pulse ${className}`}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gray-800"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-800 rounded w-1/3"></div>
                <div className="h-3 bg-gray-800 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-gray-800 rounded w-full"></div>
              <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            </div>
          </div>
        );
      case 'list':
        return (
          <div className={`space-y-3 animate-pulse ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800/60 rounded-lg">
                <div className="flex items-center space-x-3 w-2/3">
                  <div className="w-8 h-8 rounded-full bg-gray-800"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-800 rounded w-2/3"></div>
                    <div className="h-2.5 bg-gray-800 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="w-16 h-5 bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        );
      case 'text':
      default:
        return (
          <div className={`space-y-2 animate-pulse ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div
                key={idx}
                className="h-4 bg-gray-800 rounded"
                style={{ width: idx === count - 1 && count > 1 ? '75%' : '100%' }}
              ></div>
            ))}
          </div>
        );
    }
  };

  return renderSkeleton();
}
