'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useSettings } from '../../hooks/useSettings';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, isLoaded } = useSettings();

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 -ml-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Settings
                </h1>
                <p className="mt-2 text-gray-600">
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
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Event Display
            </h2>
            
            <div className="space-y-4">
              {/* Show Happening Events Toggle */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="show-happening-events"
                    name="show-happening-events"
                    type="checkbox"
                    checked={settings.showHappeningEvents}
                    onChange={(e) => updateSetting('showHappeningEvents', e.target.checked)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="show-happening-events" className="font-medium text-gray-700">
                    Show Happening Events
                  </label>
                  <p className="text-gray-500">
                    Display events that are currently happening at the top of the list with a "Happening now" section.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Future Settings Section Placeholder */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Notifications
            </h2>
            <p className="text-gray-500 text-sm">
              Notification settings coming soon...
            </p>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Data & Privacy
            </h2>
            <p className="text-gray-500 text-sm">
              Privacy and data management settings coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}