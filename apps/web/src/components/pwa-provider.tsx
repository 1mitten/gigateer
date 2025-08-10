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
    // PWA is disabled during debugging - skip initialization
    console.log('PWA initialization skipped (disabled for debugging)');
    setIsInitialized(true);
  }, []);

  // Track page views for PWA analytics - disabled during debugging
  // useEffect(() => {
  //   if (isInitialized) {
  //     trackPWAEvent('page_view', {
  //       path: window.location.pathname,
  //       timestamp: Date.now(),
  //     });
  //   }
  // }, [isInitialized]);

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