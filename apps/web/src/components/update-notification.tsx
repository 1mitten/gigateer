'use client';

import { useState, useEffect } from 'react';
import { skipWaitingAndReload } from '../lib/pwa-utils';

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleUpdateAvailable = (event: CustomEvent) => {
      setRegistration(event.detail.registration);
      setShowUpdate(true);
    };

    window.addEventListener('swUpdateAvailable', handleUpdateAvailable as EventListener);

    return () => {
      window.removeEventListener('swUpdateAvailable', handleUpdateAvailable as EventListener);
    };
  }, []);

  const handleUpdate = () => {
    if (registration) {
      skipWaitingAndReload(registration);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 bg-primary-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md mx-auto">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-sm">
            App Update Available
          </h3>
          <p className="text-primary-100 text-sm mt-1">
            A new version of Gigateer is available with improvements and new features.
          </p>
          
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleUpdate}
              className="bg-white text-primary-600 text-sm font-medium py-1.5 px-3 rounded hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 transition-colors"
            >
              Update Now
            </button>
            
            <button
              onClick={handleDismiss}
              className="text-primary-100 hover:text-white text-sm font-medium py-1.5 px-3 rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-primary-200 hover:text-white focus:outline-none focus:text-white transition-colors"
          aria-label="Dismiss update notification"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}