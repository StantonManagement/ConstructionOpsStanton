import React, { useEffect } from 'react';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  modifier?: 'ctrl' | 'cmd' | 'shift' | 'alt';
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ 
  shortcuts, 
  enabled = true 
}) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const key = event.key.toLowerCase();
      const isCtrl = event.ctrlKey;
      const isCmd = event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      shortcuts.forEach(shortcut => {
        const modifierMatch = !shortcut.modifier || 
          (shortcut.modifier === 'ctrl' && isCtrl) ||
          (shortcut.modifier === 'cmd' && isCmd) ||
          (shortcut.modifier === 'shift' && isShift) ||
          (shortcut.modifier === 'alt' && isAlt);

        if (key === shortcut.key.toLowerCase() && modifierMatch) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);

  return null; // This component doesn't render anything
};

// Helper hook for common shortcuts
export const useKeyboardShortcuts = (shortcuts: Shortcut[], enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const key = event.key.toLowerCase();
      const isCtrl = event.ctrlKey;
      const isCmd = event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      shortcuts.forEach(shortcut => {
        const modifierMatch = !shortcut.modifier || 
          (shortcut.modifier === 'ctrl' && isCtrl) ||
          (shortcut.modifier === 'cmd' && isCmd) ||
          (shortcut.modifier === 'shift' && isShift) ||
          (shortcut.modifier === 'alt' && isAlt);

        if (key === shortcut.key.toLowerCase() && modifierMatch) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

export default KeyboardShortcuts;
