'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { id, message, type, duration = 5000 } = toast;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-[var(--status-success-bg)]',
          border: 'border-[var(--status-success-border)]',
          text: 'text-[var(--status-success-text)]',
          icon: <CheckCircle2 className="w-5 h-5 text-[var(--status-success-icon)]" />,
        };
      case 'error':
        return {
          bg: 'bg-[var(--status-critical-bg)]',
          border: 'border-[var(--status-critical-border)]',
          text: 'text-[var(--status-critical-text)]',
          icon: <AlertCircle className="w-5 h-5 text-[var(--status-critical-icon)]" />,
        };
      case 'warning':
        return {
          bg: 'bg-[var(--status-warning-bg)]',
          border: 'border-[var(--status-warning-border)]',
          text: 'text-[var(--status-warning-text)]',
          icon: <AlertTriangle className="w-5 h-5 text-[var(--status-warning-icon)]" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-[var(--status-neutral-bg)]',
          border: 'border-[var(--status-neutral-border)]',
          text: 'text-[var(--status-neutral-text)]',
          icon: <Info className="w-5 h-5 text-[var(--status-neutral-icon)]" />,
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} ${styles.text}
        border-2 rounded-xl shadow-lg p-4 mb-3
        flex items-center gap-3
        min-w-[320px] max-w-[500px]
        animate-in slide-in-from-top-5 duration-300
      `}
      role="alert"
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <p className="flex-1 font-medium text-sm leading-tight">{message}</p>
      <button
        onClick={() => onClose(id)}
        className={`flex-shrink-0 ${styles.text} hover:opacity-70 transition-opacity`}
        aria-label="Close notification"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};

export default ToastComponent;

