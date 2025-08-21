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

  // Apply dark mode immediately on mount - default to true if no saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('gigateer-settings');
    let shouldApplyDarkMode = true; // Default to dark mode
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        shouldApplyDarkMode = parsed.darkMode !== false; // Use dark mode unless explicitly disabled
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
    
    if (shouldApplyDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
  }, []);

  return <>{children}</>;
}