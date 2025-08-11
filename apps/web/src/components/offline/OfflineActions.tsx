'use client';

export function OfflineActions() {
  return (
    <div className="space-y-4">
      <button
        onClick={() => window.location.reload()}
        className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Try Again
      </button>
      
      <a 
        href="/"
        className="block w-full bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Browse Cached Events
      </a>
    </div>
  );
}