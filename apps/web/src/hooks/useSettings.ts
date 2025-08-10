'use client';

import { useState, useEffect } from 'react';

export interface GigateerSettings {
  showHappeningEvents: boolean;
  useInfiniteScroll: boolean;
  defaultCity: string;
  darkMode: boolean;
}

const DEFAULT_SETTINGS: GigateerSettings = {
  showHappeningEvents: true,
  useInfiniteScroll: true,
  defaultCity: '',
  darkMode: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<GigateerSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gigateer-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('gigateer-settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    }
  }, [settings, isLoaded]);

  const updateSetting = <K extends keyof GigateerSettings>(
    key: K,
    value: GigateerSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return {
    settings,
    updateSetting,
    isLoaded,
  };
}