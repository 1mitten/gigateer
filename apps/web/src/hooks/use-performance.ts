'use client';

import { useEffect, useState, useCallback } from 'react';

// Extend PerformanceEntry types for better TypeScript support
interface PerformanceEntryWithProcessing extends PerformanceEntry {
  processingStart?: number;
  hadRecentInput?: boolean;
  value?: number;
}

declare global {
  function gtag(...args: any[]): void;
  interface Window {
    gtag?: (...args: any[]) => void;
    analytics?: {
      track: (eventName: string, eventData?: any) => void;
    };
  }
}

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  connectionType: string;
  memoryInfo: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
}

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    connectionType: 'unknown',
    memoryInfo: null,
  });

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
  }, []);

  useEffect(() => {
    // Get navigation timing
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      updateMetrics({ ttfb });
    }

    // Get connection info
    const connection = (navigator as any).connection;
    if (connection) {
      updateMetrics({ connectionType: connection.effectiveType || connection.type || 'unknown' });
    }

    // Get memory info
    const memory = (performance as any).memory;
    if (memory) {
      updateMetrics({
        memoryInfo: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        },
      });
    }

    // Web Vitals using PerformanceObserver
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            updateMetrics({ fcp: entry.startTime });
          }
        }
      });

      try {
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('FCP observer not supported:', error);
      }

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        updateMetrics({ lcp: lastEntry.startTime });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const perfEntry = entry as PerformanceEntryWithProcessing;
          const fid = (perfEntry.processingStart || 0) - entry.startTime;
          updateMetrics({ fid });
        }
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const perfEntry = entry as PerformanceEntryWithProcessing;
          if (!perfEntry.hadRecentInput) {
            clsScore += perfEntry.value || 0;
            updateMetrics({ cls: clsScore });
          }
        }
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }

      // Cleanup observers
      return () => {
        try {
          fcpObserver.disconnect();
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        } catch (error) {
          console.warn('Error disconnecting observers:', error);
        }
      };
    }
  }, [updateMetrics]);

  return metrics;
}

export function useResourceTiming() {
  const [resources, setResources] = useState<PerformanceResourceTiming[]>([]);

  useEffect(() => {
    const updateResources = () => {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      setResources(resourceEntries);
    };

    updateResources();

    // Update periodically
    const interval = setInterval(updateResources, 5000);

    return () => clearInterval(interval);
  }, []);

  const getResourcesByType = useCallback((type: string) => {
    return resources.filter(resource => {
      const url = new URL(resource.name);
      const extension = url.pathname.split('.').pop()?.toLowerCase();
      
      switch (type) {
        case 'script':
          return resource.initiatorType === 'script' || extension === 'js';
        case 'stylesheet':
          return resource.initiatorType === 'link' || extension === 'css';
        case 'image':
          return resource.initiatorType === 'img' || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '');
        case 'font':
          return ['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension || '');
        default:
          return false;
      }
    });
  }, [resources]);

  const getTotalSize = useCallback((type?: string) => {
    const filteredResources = type ? getResourcesByType(type) : resources;
    return filteredResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);
  }, [resources, getResourcesByType]);

  const getAverageLoadTime = useCallback((type?: string) => {
    const filteredResources = type ? getResourcesByType(type) : resources;
    if (filteredResources.length === 0) return 0;
    
    const totalTime = filteredResources.reduce((total, resource) => {
      return total + (resource.responseEnd - resource.startTime);
    }, 0);
    
    return totalTime / filteredResources.length;
  }, [resources, getResourcesByType]);

  return {
    resources,
    getResourcesByType,
    getTotalSize,
    getAverageLoadTime,
  };
}

export function usePagePerformance() {
  const metrics = usePerformanceMetrics();
  const resourceTiming = useResourceTiming();

  const getPerformanceScore = useCallback(() => {
    let score = 100;
    
    // FCP score (0-25 points)
    if (metrics.fcp !== null) {
      if (metrics.fcp > 3000) score -= 25;
      else if (metrics.fcp > 1800) score -= 15;
      else if (metrics.fcp > 1000) score -= 5;
    }

    // LCP score (0-25 points)
    if (metrics.lcp !== null) {
      if (metrics.lcp > 4000) score -= 25;
      else if (metrics.lcp > 2500) score -= 15;
      else if (metrics.lcp > 1200) score -= 5;
    }

    // FID score (0-25 points)
    if (metrics.fid !== null) {
      if (metrics.fid > 300) score -= 25;
      else if (metrics.fid > 100) score -= 15;
      else if (metrics.fid > 50) score -= 5;
    }

    // CLS score (0-25 points)
    if (metrics.cls !== null) {
      if (metrics.cls > 0.25) score -= 25;
      else if (metrics.cls > 0.1) score -= 15;
      else if (metrics.cls > 0.05) score -= 5;
    }

    return Math.max(0, score);
  }, [metrics]);

  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (metrics.fcp && metrics.fcp > 1800) {
      recommendations.push('Optimize First Contentful Paint by reducing render-blocking resources');
    }

    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Improve Largest Contentful Paint by optimizing images and critical resources');
    }

    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce First Input Delay by minimizing JavaScript execution time');
    }

    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Fix Cumulative Layout Shift by ensuring images and ads have dimensions');
    }

    if (resourceTiming.getTotalSize('image') > 1000000) {
      recommendations.push('Optimize images to reduce total image size (currently > 1MB)');
    }

    if (resourceTiming.getTotalSize('script') > 500000) {
      recommendations.push('Reduce JavaScript bundle size (currently > 500KB)');
    }

    return recommendations;
  }, [metrics, resourceTiming]);

  return {
    metrics,
    resourceTiming,
    performanceScore: getPerformanceScore(),
    recommendations: getRecommendations(),
  };
}

// Performance tracking utility
export function trackPerformance(eventName: string, data?: any) {
  // Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      event_category: 'Performance',
      ...data,
    });
  }

  // Console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${eventName}:`, data);
  }
}

// Hook for tracking component render performance
export function useRenderPerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      trackPerformance('component_render_time', {
        component: componentName,
        render_time: renderTime,
      });

      // Warn about slow renders
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`[Performance] Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}