'use client';

import { useEffect, useState } from 'react';
import { OfflineDetector } from './offline-detector';
import { PWAInstallPrompt } from './pwa-install-prompt';
import { initializePWA, trackPWAEvent } from '../lib/pwa-utils';
import { UpdateNotification } from './update-notification';

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only initialize PWA features in the browser
    if (typeof window !== 'undefined') {
      try {
        initializePWA();
        setIsInitialized(true);
        console.log('PWA features initialized');
      } catch (error) {
        console.error('Failed to initialize PWA features:', error);
      }
    }
  }, []);

  // Track page views for PWA analytics
  useEffect(() => {
    if (isInitialized) {
      trackPWAEvent('page_view', {
        path: window.location.pathname,
        timestamp: Date.now(),
      });
    }
  }, [isInitialized]);

  return (
    <>
      <OfflineDetector>
        {children}
      </OfflineDetector>
      
      <PWAInstallPrompt />
      <UpdateNotification />
    </>
  );
}