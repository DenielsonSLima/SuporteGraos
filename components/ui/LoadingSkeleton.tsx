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
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className}`}
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
          <LoadingSkeleton key={i} height={40} width="20%" />
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
