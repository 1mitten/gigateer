'use client';

import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const { settings, isLoaded } = useSettings();

  useEffect(() => {
    // Only apply dark mode after settings are loaded to avoid flashing
    if (!isLoaded) return;
    
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [settings.darkMode, isLoaded]);

  // Apply dark mode immediately on mount if it was previously set
  useEffect(() => {
    const savedSettings = localStorage.getItem('gigateer-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.darkMode) {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        }
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  return <>{children}</>;
}