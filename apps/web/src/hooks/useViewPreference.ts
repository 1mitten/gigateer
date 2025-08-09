'use client';

import { useState, useEffect } from 'react';

export type ViewType = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'gigateer-view-preference';
const DEFAULT_VIEW: ViewType = 'grid';

export function useViewPreference() {
  const [view, setView] = useState<ViewType>(DEFAULT_VIEW);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load view preference from localStorage on mount
  useEffect(() => {
    try {
      const savedView = localStorage.getItem(VIEW_STORAGE_KEY);
      if (savedView && (savedView === 'grid' || savedView === 'list')) {
        setView(savedView as ViewType);
      }
    } catch (error) {
      // localStorage might not be available (SSR, private browsing, etc.)
      console.warn('Failed to load view preference from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save view preference to localStorage when it changes
  const setViewPreference = (newView: ViewType) => {
    setView(newView);
    
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, newView);
    } catch (error) {
      console.warn('Failed to save view preference to localStorage:', error);
    }
  };

  return {
    view,
    setView: setViewPreference,
    isLoaded
  };
}