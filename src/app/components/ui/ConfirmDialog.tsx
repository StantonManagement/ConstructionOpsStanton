'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react';

export type ConfirmDialogVariant = 'delete' | 'warning' | 'info' | 'success';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  showInput?: boolean;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

interface ConfirmDialogProps extends ConfirmDialogConfig {
  isOpen: boolean;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
  loading = false,
  showInput = false,
  inputPlaceholder = '',
  inputValue = '',
  onInputChange,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'delete':
        return {
          iconBg: 'bg-[var(--status-critical-bg)]',
          icon: <Trash2 className="w-8 h-8 text-[var(--status-critical-icon)]" />,
          buttonClass: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
          messageBg: 'bg-[var(--status-critical-bg)]',
          messageBorder: 'border-[var(--status-critical-border)]',
          messageText: 'text-[var(--status-critical-text)]',
        };
      case 'warning':
        return {
          iconBg: 'bg-[var(--status-warning-bg)]',
          icon: <AlertTriangle className="w-8 h-8 text-[var(--status-warning-icon)]" />,
          buttonClass: 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800',
          messageBg: 'bg-[var(--status-warning-bg)]',
          messageBorder: 'border-[var(--status-warning-border)]',
          messageText: 'text-[var(--status-warning-text)]',
        };
      case 'success':
        return {
          iconBg: 'bg-[var(--status-success-bg)]',
          icon: <CheckCircle2 className="w-8 h-8 text-[var(--status-success-icon)]" />,
          buttonClass: 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800',
          messageBg: 'bg-[var(--status-success-bg)]',
          messageBorder: 'border-[var(--status-success-border)]',
          messageText: 'text-[var(--status-success-text)]',
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-[var(--status-neutral-bg)]',
          icon: <Info className="w-8 h-8 text-[var(--status-neutral-icon)]" />,
          buttonClass: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
          messageBg: 'bg-[var(--status-neutral-bg)]',
          messageBorder: 'border-[var(--status-neutral-border)]',
          messageText: 'text-[var(--status-neutral-text)]',
        };
    }
  };

  const styles = getVariantStyles();

  const handleConfirm = async () => {
    if (!loading) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading && onCancel) {
      onCancel();
    }
  };

  // Prevent clicks inside modal from closing it
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[9998] p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border"
        onClick={handleModalClick}
      >
        <div className="p-8">
          {/* Header with Icon */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground">{title}</h3>
            </div>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Message */}
          <div className={`${styles.messageBg} border ${styles.messageBorder} rounded-xl p-4 mb-6`}>
            <p className={`${styles.messageText} font-medium leading-relaxed`}>{message}</p>
          </div>

          {/* Optional Input Field */}
          {showInput && (
            <div className="mb-6">
              <textarea
                value={inputValue}
                onChange={(e) => onInputChange?.(e.target.value)}
                placeholder={inputPlaceholder}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary resize-none text-foreground bg-card text-base transition-all"
                rows={3}
                disabled={loading}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-6 py-4 border-2 border-border text-muted-foreground rounded-xl hover:bg-muted disabled:opacity-50 transition-all font-semibold"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 px-6 py-4 text-white rounded-xl disabled:opacity-50 transition-all font-semibold shadow-lg ${styles.buttonClass}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

