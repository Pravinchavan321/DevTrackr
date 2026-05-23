import React from 'react';

export default function SkeletonLoader({ count = 1, variant = 'text', className = '' }) {
  const renderSkeleton = () => {
    const baseSkeleton = "bg-gradient-to-br from-gray-800 via-violet-900/20 to-gray-800 bg-[length:200%_100%] animate-pulse";

    switch (variant) {
      case 'card':
        return (
          <div className={`bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 space-y-4 ${className}`}>
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full ${baseSkeleton}`}></div>
              <div className="flex-1 space-y-2">
                <div className={`h-4 rounded w-1/3 ${baseSkeleton}`}></div>
                <div className={`h-3 rounded w-1/2 ${baseSkeleton}`}></div>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className={`h-4 rounded-xl w-full ${baseSkeleton}`}></div>
              <div className={`h-4 rounded-xl w-5/6 ${baseSkeleton}`}></div>
            </div>
          </div>
        );
      case 'list':
        return (
          <div className={`space-y-3 ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800/60 rounded-xl">
                <div className="flex items-center space-x-3 w-2/3">
                  <div className={`w-8 h-8 rounded-full ${baseSkeleton}`}></div>
                  <div className="flex-1 space-y-1.5">
                    <div className={`h-3.5 rounded-xl w-2/3 ${baseSkeleton}`}></div>
                    <div className={`h-2.5 rounded-xl w-1/3 ${baseSkeleton}`}></div>
                  </div>
                </div>
                <div className={`w-16 h-5 rounded-xl ${baseSkeleton}`}></div>
              </div>
            ))}
          </div>
        );
      case 'text':
      default:
        return (
          <div className={`space-y-2 ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div
                key={idx}
                className={`h-4 rounded-xl ${baseSkeleton}`}
                style={{ width: idx === count - 1 && count > 1 ? '75%' : '100%' }}
              ></div>
            ))}
          </div>
        );
    }
  };

  return (
    <div>
      {renderSkeleton()}
    </div>
  );
}
