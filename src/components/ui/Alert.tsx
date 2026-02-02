import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

const variantConfig: Record<AlertVariant, { icon: React.ComponentType<{ className?: string }>, classes: string }> = {
  success: {
    icon: CheckCircle,
    classes: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    classes: 'bg-destructive/10 border-destructive/20 text-destructive',
  },
  warning: {
    icon: AlertCircle,
    classes: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    classes: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
  },
};

export function Alert({ variant = 'info', title, children, className = '', onClose }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${config.classes} ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
