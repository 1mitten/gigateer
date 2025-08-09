'use client';

import { useState, useEffect } from 'react';
import { pwaTester, PWATestResult, type PWATestSuite } from '../lib/pwa-tests';
import { getCacheStats, clearAllCaches } from '../lib/pwa-utils';
import { usePagePerformance } from '../hooks/use-performance';

export function PWADashboard() {
  const [testResults, setTestResults] = useState<PWATestSuite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const performance = usePagePerformance();

  const runTests = async () => {
    setIsLoading(true);
    try {
      const results = await pwaTester.runFullTest();
      setTestResults(results);
    } catch (error) {
      console.error('PWA tests failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const clearCaches = async () => {
    try {
      await clearAllCaches();
      await loadCacheStats();
      alert('All caches cleared successfully');
    } catch (error) {
      console.error('Failed to clear caches:', error);
      alert('Failed to clear caches');
    }
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTestIcon = (passed: boolean) => {
    if (passed) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const TestSection = ({ title, tests }: { title: string; tests: PWATestResult[] }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {tests.map((test, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getTestIcon(test.passed)}
              <div>
                <p className="text-sm font-medium text-gray-900">{test.test}</p>
                <p className="text-xs text-gray-500">{test.message}</p>
                {test.recommendation && (
                  <p className="text-xs text-blue-600 mt-1">💡 {test.recommendation}</p>
                )}
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(test.score)}`}>
              {test.score}pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PWA Dashboard</h1>
        <p className="text-gray-600">Monitor and test your Progressive Web App features</p>
      </div>

      {/* Overall Score */}
      {testResults && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-2xl font-bold ${getScoreColor(testResults.overallScore)}`}>
            {testResults.overallScore}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Overall PWA Score</h2>
          <p className="text-gray-600 mt-2">
            {testResults.overallScore >= 80 
              ? 'Excellent PWA implementation!' 
              : testResults.overallScore >= 60 
                ? 'Good PWA with room for improvement' 
                : 'PWA needs significant improvements'}
          </p>
        </div>
      )}

      {/* Test Controls */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={runTests}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Running Tests...
            </>
          ) : (
            'Run PWA Tests'
          )}
        </button>

        <button
          onClick={loadCacheStats}
          className="btn-secondary"
        >
          Refresh Cache Stats
        </button>

        <button
          onClick={clearCaches}
          className="btn-secondary"
        >
          Clear All Caches
        </button>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {performance.metrics.fcp ? `${Math.round(performance.metrics.fcp)}ms` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">First Contentful Paint</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {performance.metrics.lcp ? `${Math.round(performance.metrics.lcp)}ms` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Largest Contentful Paint</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {performance.metrics.cls ? performance.metrics.cls.toFixed(3) : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Cumulative Layout Shift</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {performance.performanceScore}
            </div>
            <div className="text-sm text-gray-600">Performance Score</div>
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cache Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(cacheStats).map(([cacheName, itemCount]) => (
              <div key={cacheName} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{itemCount as number}</div>
                <div className="text-sm text-gray-600">{cacheName}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="space-y-6">
          <TestSection title="Manifest Tests" tests={testResults.manifestTests} />
          <TestSection title="Service Worker Tests" tests={testResults.serviceWorkerTests} />
          <TestSection title="Performance Tests" tests={testResults.performanceTests} />
          <TestSection title="Offline Tests" tests={testResults.offlineTests} />
          <TestSection title="Installability Tests" tests={testResults.installabilityTests} />
        </div>
      )}

      {/* Recommendations */}
      {testResults && testResults.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-4">Recommendations</h2>
          <ul className="space-y-2">
            {testResults.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start text-yellow-700">
                <span className="text-yellow-500 mr-2">•</span>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Performance Recommendations */}
      {performance.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Performance Recommendations</h2>
          <ul className="space-y-2">
            {performance.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start text-blue-700">
                <span className="text-blue-500 mr-2">•</span>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}