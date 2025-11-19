/**
 * PWA Utilities
 * Service worker registration and PWA management
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] New Service Worker installing');

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New content available, please refresh');
            // Notify user about update
            window.dispatchEvent(new CustomEvent('app:update-available'));
          }
        });
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
      console.log('[PWA] Service Worker unregistered');
    })
    .catch((error) => {
      console.error('[PWA] Service Worker unregistration failed:', error);
    });
}

// Check if app is installed as PWA
export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check various indicators
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  
  // @ts-ignore - Safari specific
  const isIOSStandalone = window.navigator.standalone === true;

  return isStandalone || isFullscreen || isMinimalUI || isIOSStandalone;
}

// Prompt user to install PWA
export function promptInstall() {
  // This will be set by a beforeinstallprompt event listener
  // See implementation in main app component
  const installPrompt = (window as any).installPromptEvent;
  
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
      } else {
        console.log('[PWA] User dismissed install prompt');
      }
      (window as any).installPromptEvent = null;
    });
  } else {
    console.log('[PWA] Install prompt not available');
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  }

  return Notification.permission;
}

// Show local notification
export function showNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      ...options,
    });
  }
}

