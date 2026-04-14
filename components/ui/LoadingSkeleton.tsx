import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className = '', 
  width = '100%', 
  height = '1rem',
  borderRadius = '0.375rem'
}) => {
  return (
    <div 
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius 
      }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-4">
      <div className="flex space-x-4 mb-6">
        {[...Array(cols)].map((_, i) => (
          <LoadingSkeleton key={i} height={40} width={`${100/cols}%`} />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          {[...Array(cols)].map((_, j) => (
            <LoadingSkeleton key={j} height={20} />
          ))}
        </div>
      ))}
    </div>
  );
};

export const ModuleSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-100 h-28 rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>

      {/* Search/Filter Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-32" />

      {/* Tab Skeleton */}
      <div className="flex space-x-8 border-b border-slate-200 px-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 w-28 bg-slate-50 rounded-t-xl" />
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="space-y-5">
          <div className="h-10 bg-slate-100 rounded-lg w-full mb-8" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-50 rounded-lg w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};
