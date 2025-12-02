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
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
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
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3">
        <LoadingSpinner size="md" />
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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
          className={`h-4 bg-muted rounded animate-pulse ${
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
          color: 'text-primary',
          bgColor: 'bg-primary/10'
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
          color: 'text-muted-foreground',
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
          <h3 className="mt-4 text-lg font-medium text-foreground">{text}</h3>
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
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const LoadingStates = {
  // Lightweight tab loading state
  TabContent: () => (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  ),

  // Simple card loading
  Card: () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  ),

  // Table loading state
  Table: () => (
    <div className="animate-pulse space-y-2">
      <div className="h-10 bg-gray-200 rounded"></div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 bg-gray-100 rounded"></div>
      ))}
    </div>
  ),

  // Simple spinner
  Spinner: () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  )
};

export default {
  LoadingSpinner,
  LoadingCard,
  LoadingSkeleton,
  StatusIndicator,
  LoadingOverlay,
  ProgressBar,
  LoadingStates
};
