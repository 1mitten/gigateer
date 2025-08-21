'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useSettings } from '../../hooks/useSettings';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, isLoaded } = useSettings();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 -ml-2 rounded-md text-white hover:text-white/80 hover:bg-white/10 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Settings
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Configure your Gigateer experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Event Display Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Event Display
            </h2>
            
            <div className="space-y-4">
              {/* Infinite Scroll Toggle */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="use-infinite-scroll"
                    name="use-infinite-scroll"
                    type="checkbox"
                    checked={settings.useInfiniteScroll}
                    onChange={(e) => updateSetting('useInfiniteScroll', e.target.checked)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="use-infinite-scroll" className="font-medium text-gray-700 dark:text-gray-300">
                    Use Infinite Scroll
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    Automatically load more events as you scroll. When disabled, use traditional page navigation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Location
            </h2>
            
            <div className="space-y-4">
              {/* Default City */}
              <div>
                <label htmlFor="default-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default City
                </label>
                <select
                  id="default-city"
                  name="default-city"
                  value={settings.defaultCity}
                  onChange={(e) => updateSetting('defaultCity', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">All Cities</option>
                  <option value="london">London</option>
                  <option value="manchester">Manchester</option>
                  <option value="birmingham">Birmingham</option>
                  <option value="bristol">Bristol</option>
                  <option value="leeds">Leeds</option>
                  <option value="liverpool">Liverpool</option>
                  <option value="glasgow">Glasgow</option>
                  <option value="edinburgh">Edinburgh</option>
                  <option value="cardiff">Cardiff</option>
                  <option value="brighton">Brighton</option>
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  Choose a default city to filter events. The app will start with this city selected.
                </p>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Appearance
            </h2>
            
            <div className="space-y-4">
              {/* Dark Mode Toggle */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="dark-mode"
                    name="dark-mode"
                    type="checkbox"
                    checked={settings.darkMode}
                    onChange={(e) => updateSetting('darkMode', e.target.checked)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="dark-mode" className="font-medium text-gray-700 dark:text-gray-300">
                    Dark Mode
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    Use a dark color scheme for better viewing in low light conditions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Future Settings Section Placeholder */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Notifications
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Notification settings coming soon...
            </p>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Data & Privacy
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Privacy and data management settings coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}