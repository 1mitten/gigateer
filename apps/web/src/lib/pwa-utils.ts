'use client';

// PWA Utility functions for service worker management and PWA features

declare global {
  function gtag(...args: any[]): void;
  interface Window {
    gtag?: (...args: any[]) => void;
    analytics?: {
      track: (eventName: string, eventData?: any) => void;
    };
  }
}

export interface ServiceWorkerMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}

export interface CacheStats {
  [cacheName: string]: number;
}

/**
 * Register service worker with enhanced error handling and update management
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    console.log('ServiceWorker registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available, notify user
            showUpdateAvailable(registration);
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('ServiceWorker registration failed:', error);
    return null;
  }
}

/**
 * Show update available notification
 */
function showUpdateAvailable(registration: ServiceWorkerRegistration) {
  // Create a custom event that components can listen to
  const event = new CustomEvent('swUpdateAvailable', {
    detail: { registration }
  });
  window.dispatchEvent(event);
}

/**
 * Skip waiting and reload to activate new service worker
 */
export function skipWaitingAndReload(registration: ServiceWorkerRegistration) {
  const newWorker = registration.waiting;
  if (newWorker) {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    
    // Listen for the controlling service worker to change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

/**
 * Check if the app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  return !isStandalone() && 'serviceWorker' in navigator;
}

/**
 * Send message to service worker
 */
export async function sendMessageToSW(message: ServiceWorkerMessage): Promise<any> {
  if (!navigator.serviceWorker.controller) {
    throw new Error('No service worker controller available');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller!.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Get cache statistics from service worker
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    return await sendMessageToSW({ type: 'CACHE_STATS', timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {};
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    throw new Error('Cache API not supported');
  }

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

/**
 * Force refresh data from network (bypass cache)
 */
export async function forceRefreshData(url: string): Promise<Response> {
  const headers = new Headers();
  headers.append('Cache-Control', 'no-cache');
  
  return fetch(url, {
    headers,
    cache: 'no-store',
  });
}

/**
 * Check network connectivity with timeout
 */
export async function checkNetworkConnectivity(timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('/api/meta', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Listen for service worker messages
 */
export function listenForSWMessages(callback: (message: ServiceWorkerMessage) => void) {
  if (!('serviceWorker' in navigator)) return;

  const handleMessage = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}

/**
 * Show notification (if permission granted)
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission denied');
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      throw new Error('Notification permission denied');
    }
  }

  new Notification(title, {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    ...options,
  });
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  return await Notification.requestPermission();
}

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get PWA installation status
 */
export function getPWAInstallationStatus(): {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
} {
  const isStandaloneMode = isStandalone();
  const canInstallApp = canInstall();
  
  return {
    canInstall: canInstallApp,
    isInstalled: isStandaloneMode,
    isStandalone: isStandaloneMode,
  };
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources(urls: string[]): void {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Track PWA analytics events
 */
export function trackPWAEvent(eventName: string, eventData?: any): void {
  // Google Analytics tracking
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, eventData);
  }

  // Custom analytics
  if (window.analytics && typeof window.analytics.track === 'function') {
    window.analytics.track(eventName, eventData);
  }

  console.log('PWA Event:', eventName, eventData);
}

/**
 * Handle app lifecycle events
 */
export function handleAppLifecycle() {
  // Track app startup
  trackPWAEvent('pwa_startup', {
    isStandalone: isStandalone(),
    timestamp: Date.now(),
  });

  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackPWAEvent('pwa_hidden');
    } else {
      trackPWAEvent('pwa_visible');
    }
  });

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    trackPWAEvent('pwa_unload');
  });
}

// Initialize PWA utilities
export function initializePWA() {
  // Register service worker
  registerServiceWorker();

  // Handle app lifecycle
  handleAppLifecycle();

  // Listen for SW messages
  listenForSWMessages((message) => {
    console.log('Received SW message:', message);
    
    switch (message.type) {
      case 'SYNC_COMPLETE':
        trackPWAEvent('background_sync_complete', {
          timestamp: message.timestamp,
        });
        break;
      
      case 'CACHE_UPDATED':
        trackPWAEvent('cache_updated', message.payload);
        break;
    }
  });

  // Preload critical resources
  preloadCriticalResources([
    '/api/meta',
    '/api/gigs',
    '/manifest.json',
  ]);

  console.log('PWA initialized successfully');
}