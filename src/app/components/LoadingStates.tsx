import React from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

interface LoadingCardProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  title = 'Loading...',
  subtitle,
  className = ''
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3">
        <LoadingSpinner size="md" />
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded animate-pulse ${
            i === 0 ? 'w-3/4' : i === 1 ? 'w-1/2' : 'w-2/3'
          }`}
        />
      ))}
    </div>
  );
};

interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'idle';
  text: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: null,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} ${className}`}>
      {config.icon && <span className={config.color}>{config.icon}</span>}
      <span className={`text-sm font-medium ${config.color}`}>{text}</span>
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = 'Loading...',
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">{text}</h3>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we process your request...
          </p>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ProgressBarProps {
  progress: number; // 0-100
  text?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  text,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        {text && <span className="text-sm font-medium text-gray-700">{text}</span>}
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default {
  LoadingSpinner,
  LoadingCard,
  LoadingSkeleton,
  StatusIndicator,
  LoadingOverlay,
  ProgressBar
};
