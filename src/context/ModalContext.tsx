'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, Toast, ToastType } from '@/components/ui/Toast';
import ConfirmDialog, { ConfirmDialogConfig, ConfirmDialogVariant } from '@/components/ui/ConfirmDialog';

interface ShowToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ShowConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  showInput?: boolean;
  inputPlaceholder?: string;
}

interface ModalContextType {
  showToast: (options: ShowToastOptions) => void;
  showConfirm: (options: ShowConfirmOptions) => Promise<{ confirmed: boolean; inputValue?: string }>;
  closeAllToasts: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    config: ConfirmDialogConfig | null;
    loading: boolean;
    inputValue: string;
  }>({
    isOpen: false,
    config: null,
    loading: false,
    inputValue: '',
  });

  // Toast management
  const showToast = useCallback((options: ShowToastOptions) => {
    const { message, type = 'info', duration = 5000 } = options;
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const closeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Confirm dialog management
  const showConfirm = useCallback((options: ShowConfirmOptions): Promise<{ confirmed: boolean; inputValue?: string }> => {
    return new Promise((resolve) => {
      const handleConfirm = async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        
        // Small delay to show loading state
        await new Promise((r) => setTimeout(r, 100));
        
        setConfirmDialog({
          isOpen: false,
          config: null,
          loading: false,
          inputValue: '',
        });
        
        resolve({ 
          confirmed: true, 
          inputValue: confirmDialog.inputValue 
        });
      };

      const handleCancel = () => {
        setConfirmDialog({
          isOpen: false,
          config: null,
          loading: false,
          inputValue: '',
        });
        
        resolve({ confirmed: false });
      };

      const config: ConfirmDialogConfig = {
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        variant: options.variant,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
        showInput: options.showInput,
        inputPlaceholder: options.inputPlaceholder,
        inputValue: '',
        onInputChange: (value: string) => {
          setConfirmDialog((prev) => ({ ...prev, inputValue: value }));
        },
      };

      setConfirmDialog({
        isOpen: true,
        config,
        loading: false,
        inputValue: '',
      });
    });
  }, [confirmDialog.inputValue]);

  return (
    <ModalContext.Provider value={{ showToast, showConfirm, closeAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
      {confirmDialog.isOpen && confirmDialog.config && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          loading={confirmDialog.loading}
          inputValue={confirmDialog.inputValue}
          {...confirmDialog.config}
        />
      )}
    </ModalContext.Provider>
  );
};

