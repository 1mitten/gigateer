'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ScrollPosition {
  x: number;
  y: number;
}

class ScrollRestorationManager {
  private positions = new Map<string, ScrollPosition>();
  
  savePosition(key: string, position: ScrollPosition) {
    this.positions.set(key, position);
  }
  
  getPosition(key: string): ScrollPosition | undefined {
    return this.positions.get(key);
  }
  
  clearPosition(key: string) {
    this.positions.delete(key);
  }
  
  clear() {
    this.positions.clear();
  }
}

const scrollManager = new ScrollRestorationManager();

export function useScrollRestoration() {
  const router = useRouter();
  const pathname = usePathname();
  const savedScrollRef = useRef<ScrollPosition | null>(null);

  // Save scroll position before navigation
  const saveScrollPosition = (path: string = pathname) => {
    if (typeof window !== 'undefined') {
      const position = {
        x: window.scrollX,
        y: window.scrollY
      };
      scrollManager.savePosition(path, position);
      savedScrollRef.current = position;
    }
  };

  // Restore scroll position
  const restoreScrollPosition = (path: string = pathname) => {
    if (typeof window !== 'undefined') {
      const position = scrollManager.getPosition(path);
      if (position) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(position.x, position.y);
        });
      }
    }
  };

  // Navigation with scroll preservation
  const navigateWithScrollSave = (href: string) => {
    saveScrollPosition();
    router.push(href);
  };

  const navigateBack = () => {
    // Check if we can go back in history
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to home page if no history
      router.push('/');
    }
  };

  return {
    saveScrollPosition,
    restoreScrollPosition,
    navigateWithScrollSave,
    navigateBack,
    scrollManager
  };
}

export { scrollManager };