'use client';

export interface PWATestResult {
  test: string;
  passed: boolean;
  message: string;
  score: number;
  recommendation?: string;
}

export interface PWATestSuite {
  manifestTests: PWATestResult[];
  serviceWorkerTests: PWATestResult[];
  performanceTests: PWATestResult[];
  offlineTests: PWATestResult[];
  installabilityTests: PWATestResult[];
  overallScore: number;
  recommendations: string[];
}

export class PWATester {
  private manifest: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  async runFullTest(): Promise<PWATestSuite> {
    console.log('[PWA Test] Starting comprehensive PWA test suite...');
    
    // Load manifest
    await this.loadManifest();
    
    // Get service worker registration
    if ('serviceWorker' in navigator) {
      this.swRegistration = (await navigator.serviceWorker.getRegistration()) || null;
    }

    const manifestTests = await this.testManifest();
    const serviceWorkerTests = await this.testServiceWorker();
    const performanceTests = await this.testPerformance();
    const offlineTests = await this.testOfflineCapabilities();
    const installabilityTests = await this.testInstallability();

    const allTests = [
      ...manifestTests,
      ...serviceWorkerTests,
      ...performanceTests,
      ...offlineTests,
      ...installabilityTests,
    ];

    const overallScore = this.calculateOverallScore(allTests);
    const recommendations = this.generateRecommendations(allTests);

    const results: PWATestSuite = {
      manifestTests,
      serviceWorkerTests,
      performanceTests,
      offlineTests,
      installabilityTests,
      overallScore,
      recommendations,
    };

    console.log('[PWA Test] Test suite completed. Overall score:', overallScore);
    return results;
  }

  private async loadManifest(): Promise<void> {
    try {
      const response = await fetch('/manifest.json');
      this.manifest = await response.json();
    } catch (error) {
      console.error('[PWA Test] Failed to load manifest:', error);
    }
  }

  private async testManifest(): Promise<PWATestResult[]> {
    const tests: PWATestResult[] = [];

    // Test 1: Manifest exists
    tests.push({
      test: 'Manifest file exists',
      passed: this.manifest !== null,
      message: this.manifest ? 'Manifest file loaded successfully' : 'Manifest file not found',
      score: this.manifest ? 10 : 0,
      recommendation: this.manifest ? undefined : 'Create a manifest.json file',
    });

    if (!this.manifest) {
      return tests;
    }

    // Test 2: Required fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color'];
    const missingFields = requiredFields.filter(field => !this.manifest[field]);
    
    tests.push({
      test: 'Required manifest fields',
      passed: missingFields.length === 0,
      message: missingFields.length === 0 
        ? 'All required fields present' 
        : `Missing fields: ${missingFields.join(', ')}`,
      score: missingFields.length === 0 ? 10 : 5,
      recommendation: missingFields.length > 0 ? `Add missing fields: ${missingFields.join(', ')}` : undefined,
    });

    // Test 3: Icons
    const hasIcons = this.manifest.icons && this.manifest.icons.length > 0;
    const hasLargeIcon = hasIcons && this.manifest.icons.some((icon: any) => 
      icon.sizes && parseInt(icon.sizes.split('x')[0]) >= 512
    );
    
    tests.push({
      test: 'App icons',
      passed: hasIcons && hasLargeIcon,
      message: hasLargeIcon 
        ? 'Icons including 512x512 present' 
        : hasIcons ? 'Icons present but no 512x512 icon' : 'No icons found',
      score: hasLargeIcon ? 10 : hasIcons ? 5 : 0,
      recommendation: !hasLargeIcon ? 'Add a 512x512 icon for better install experience' : undefined,
    });

    // Test 4: Display mode
    const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui'];
    const hasValidDisplay = validDisplayModes.includes(this.manifest.display);
    
    tests.push({
      test: 'Display mode',
      passed: hasValidDisplay,
      message: hasValidDisplay 
        ? `Display mode: ${this.manifest.display}` 
        : `Invalid display mode: ${this.manifest.display}`,
      score: hasValidDisplay ? 5 : 0,
      recommendation: !hasValidDisplay ? 'Use standalone, fullscreen, or minimal-ui display mode' : undefined,
    });

    // Test 5: Theme color
    const hasValidThemeColor = this.manifest.theme_color && this.manifest.theme_color.match(/^#[0-9a-fA-F]{6}$/);
    
    tests.push({
      test: 'Theme color',
      passed: hasValidThemeColor,
      message: hasValidThemeColor 
        ? `Theme color: ${this.manifest.theme_color}` 
        : 'Invalid or missing theme color',
      score: hasValidThemeColor ? 5 : 2,
      recommendation: !hasValidThemeColor ? 'Add a valid hex theme color (e.g., #6366f1)' : undefined,
    });

    return tests;
  }

  private async testServiceWorker(): Promise<PWATestResult[]> {
    const tests: PWATestResult[] = [];

    // Test 1: Service Worker registered
    tests.push({
      test: 'Service Worker registration',
      passed: this.swRegistration !== null,
      message: this.swRegistration ? 'Service Worker registered' : 'No Service Worker found',
      score: this.swRegistration ? 15 : 0,
      recommendation: !this.swRegistration ? 'Register a Service Worker for offline functionality' : undefined,
    });

    if (!this.swRegistration) {
      return tests;
    }

    // Test 2: Service Worker active
    const isActive = this.swRegistration.active !== null;
    tests.push({
      test: 'Service Worker active',
      passed: isActive,
      message: isActive ? 'Service Worker is active' : 'Service Worker not active',
      score: isActive ? 10 : 0,
      recommendation: !isActive ? 'Ensure Service Worker activates properly' : undefined,
    });

    // Test 3: Cache API available
    const hasCacheAPI = 'caches' in window;
    tests.push({
      test: 'Cache API support',
      passed: hasCacheAPI,
      message: hasCacheAPI ? 'Cache API supported' : 'Cache API not supported',
      score: hasCacheAPI ? 5 : 0,
      recommendation: !hasCacheAPI ? 'Cache API not available in this browser' : undefined,
    });

    // Test 4: Background Sync support
    const hasBackgroundSync = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
    tests.push({
      test: 'Background Sync support',
      passed: hasBackgroundSync,
      message: hasBackgroundSync ? 'Background Sync supported' : 'Background Sync not supported',
      score: hasBackgroundSync ? 5 : 2,
      recommendation: !hasBackgroundSync ? 'Background Sync not available in this browser' : undefined,
    });

    return tests;
  }

  private async testPerformance(): Promise<PWATestResult[]> {
    const tests: PWATestResult[] = [];

    // Test 1: First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    const fcpTime = fcpEntry ? fcpEntry.startTime : null;
    
    tests.push({
      test: 'First Contentful Paint',
      passed: fcpTime !== null && fcpTime < 1800,
      message: fcpTime 
        ? `FCP: ${fcpTime.toFixed(0)}ms` 
        : 'FCP not measured',
      score: fcpTime ? (fcpTime < 1000 ? 10 : fcpTime < 1800 ? 7 : 3) : 0,
      recommendation: fcpTime && fcpTime > 1800 ? 'Optimize critical rendering path to improve FCP' : undefined,
    });

    // Test 2: HTTPS
    const isHttps = location.protocol === 'https:';
    tests.push({
      test: 'HTTPS',
      passed: isHttps,
      message: isHttps ? 'Site served over HTTPS' : 'Site not served over HTTPS',
      score: isHttps ? 10 : 0,
      recommendation: !isHttps ? 'PWAs require HTTPS in production' : undefined,
    });

    // Test 3: Resource loading
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const slowResources = resourceEntries.filter(entry => 
      entry.duration > 1000 && entry.initiatorType !== 'beacon'
    );
    
    tests.push({
      test: 'Resource loading performance',
      passed: slowResources.length === 0,
      message: slowResources.length === 0 
        ? 'All resources load quickly' 
        : `${slowResources.length} slow resources detected`,
      score: slowResources.length === 0 ? 5 : 2,
      recommendation: slowResources.length > 0 ? 'Optimize slow-loading resources' : undefined,
    });

    return tests;
  }

  private async testOfflineCapabilities(): Promise<PWATestResult[]> {
    const tests: PWATestResult[] = [];

    // Test 1: Cache entries exist
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const hasCaches = cacheNames.length > 0;
        
        tests.push({
          test: 'Offline caching',
          passed: hasCaches,
          message: hasCaches 
            ? `${cacheNames.length} cache(s) found` 
            : 'No caches found',
          score: hasCaches ? 10 : 0,
          recommendation: !hasCaches ? 'Implement caching for offline functionality' : undefined,
        });

        // Test 2: Core assets cached
        if (hasCaches) {
          let coreAssetsCached = false;
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            const hasMainPage = requests.some(req => req.url.endsWith('/') || req.url.includes('index'));
            if (hasMainPage) {
              coreAssetsCached = true;
              break;
            }
          }
          
          tests.push({
            test: 'Core assets cached',
            passed: coreAssetsCached,
            message: coreAssetsCached 
              ? 'Core assets are cached' 
              : 'Core assets not cached',
            score: coreAssetsCached ? 10 : 3,
            recommendation: !coreAssetsCached ? 'Cache core assets for offline shell' : undefined,
          });
        }
      } catch (error) {
        tests.push({
          test: 'Cache inspection',
          passed: false,
          message: 'Failed to inspect caches',
          score: 0,
        });
      }
    }

    // Test 3: Network connectivity handling
    const hasOnlineOfflineHandlers = 'onLine' in navigator;
    tests.push({
      test: 'Connectivity detection',
      passed: hasOnlineOfflineHandlers,
      message: hasOnlineOfflineHandlers 
        ? 'Online/offline detection available' 
        : 'No connectivity detection',
      score: hasOnlineOfflineHandlers ? 5 : 0,
      recommendation: !hasOnlineOfflineHandlers ? 'Implement connectivity status detection' : undefined,
    });

    return tests;
  }

  private async testInstallability(): Promise<PWATestResult[]> {
    const tests: PWATestResult[] = [];

    // Test 1: Basic installability criteria
    const hasManifest = this.manifest !== null;
    const hasServiceWorker = this.swRegistration !== null;
    const isHttps = location.protocol === 'https:';
    const basicCriteriaMet = hasManifest && hasServiceWorker && isHttps;

    tests.push({
      test: 'Basic installability criteria',
      passed: basicCriteriaMet,
      message: basicCriteriaMet 
        ? 'Meets basic install criteria' 
        : 'Missing basic install criteria',
      score: basicCriteriaMet ? 15 : 0,
      recommendation: !basicCriteriaMet ? 'Ensure manifest, service worker, and HTTPS are all present' : undefined,
    });

    // Test 2: Display mode suitable for installation
    const suitableDisplayMode = this.manifest && ['standalone', 'fullscreen'].includes(this.manifest.display);
    tests.push({
      test: 'Install-suitable display mode',
      passed: suitableDisplayMode,
      message: suitableDisplayMode 
        ? `Display mode ${this.manifest.display} suitable for install` 
        : 'Display mode not suitable for installation',
      score: suitableDisplayMode ? 5 : 2,
      recommendation: !suitableDisplayMode ? 'Use standalone or fullscreen display mode for better install experience' : undefined,
    });

    // Test 3: App name suitable for install
    const hasGoodName = this.manifest && this.manifest.name && this.manifest.name.length <= 30;
    tests.push({
      test: 'App name length',
      passed: hasGoodName,
      message: hasGoodName 
        ? `App name: "${this.manifest.name}"` 
        : 'App name missing or too long for install prompt',
      score: hasGoodName ? 5 : 2,
      recommendation: !hasGoodName ? 'Ensure app name is present and under 30 characters' : undefined,
    });

    return tests;
  }

  private calculateOverallScore(tests: PWATestResult[]): number {
    const totalPossibleScore = tests.reduce((sum, test) => sum + (test.passed ? test.score : test.score), 0);
    const earnedScore = tests.reduce((sum, test) => sum + (test.passed ? test.score : 0), 0);
    
    return totalPossibleScore > 0 ? Math.round((earnedScore / totalPossibleScore) * 100) : 0;
  }

  private generateRecommendations(tests: PWATestResult[]): string[] {
    return tests
      .filter(test => !test.passed && test.recommendation)
      .map(test => test.recommendation!)
      .filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates
  }
}

// Utility functions for testing PWA features
export async function testOfflineMode(): Promise<boolean> {
  if (!navigator.onLine) {
    console.log('[PWA Test] Already offline');
    return true;
  }

  try {
    // Try to fetch a non-existent resource to simulate offline
    const response = await fetch('/offline-test-resource-that-does-not-exist', {
      cache: 'no-store',
    });
    return false; // If this succeeds, we're not truly testing offline
  } catch (error) {
    // This should throw when offline or when resource doesn't exist
    console.log('[PWA Test] Offline simulation successful');
    return true;
  }
}

export async function testServiceWorkerCaching(): Promise<{ success: boolean; details: string }> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    return {
      success: false,
      details: 'Service Worker or Cache API not supported',
    };
  }

  try {
    const cacheNames = await caches.keys();
    if (cacheNames.length === 0) {
      return {
        success: false,
        details: 'No caches found',
      };
    }

    let totalCachedItems = 0;
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      totalCachedItems += requests.length;
    }

    return {
      success: totalCachedItems > 0,
      details: `${cacheNames.length} caches with ${totalCachedItems} total items`,
    };
  } catch (error) {
    return {
      success: false,
      details: `Cache inspection failed: ${error}`,
    };
  }
}

export async function validateManifest(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();

    // Required fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Icons validation
    if (!manifest.icons || !Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      errors.push('No icons found');
    } else {
      const hasLargeIcon = manifest.icons.some((icon: any) => 
        icon.sizes && parseInt(icon.sizes.split('x')[0]) >= 512
      );
      if (!hasLargeIcon) {
        errors.push('No icon with size >= 512x512 found');
      }
    }

    // Display mode validation
    const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
    if (!validDisplayModes.includes(manifest.display)) {
      errors.push(`Invalid display mode: ${manifest.display}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to load or parse manifest: ${error}`],
    };
  }
}

// Export the main tester instance
export const pwaTester = new PWATester();