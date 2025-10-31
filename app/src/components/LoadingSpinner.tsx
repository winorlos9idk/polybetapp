import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  className 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={clsx('flex justify-center items-center', className)}>
      <div 
        className={clsx(
          'loading-spinner',
          sizeClasses[size]
        )}
      />
    </div>
  );
};

export default LoadingSpinner;