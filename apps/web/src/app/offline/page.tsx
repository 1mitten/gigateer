import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'You\'re Offline - Gigateer',
  description: 'You appear to be offline. Check your connection to browse live music events.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mb-8">
          <svg 
            className="mx-auto h-24 w-24 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M12 9.75L14.25 12m0 0l2.25-2.25M14.25 12l2.25 2.25M14.25 12L12 14.25m-2.58 4.92L7.17 21.12a.75.75 0 01-1.28-.53l0-.97c.012-.23.072-.463.18-.667L8.12 15.4a3.75 3.75 0 013.19-1.78h1.38a3.75 3.75 0 013.19 1.78l2.05 3.55c.108.204.168.437.18.667l0 .97a.75.75 0 01-1.28.53L14.42 19.17z" 
            />
          </svg>
        </div>
        
        {/* Main Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>
        
        <p className="text-gray-600 mb-8">
          It looks like you've lost your internet connection. Don't worry, you can still browse some cached events while offline.
        </p>
        
        {/* Action Buttons */}
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
        
        {/* Connection Status */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Connection Status:</span>
              <span id="connection-status" className="ml-1">Checking...</span>
            </p>
          </div>
        </div>
        
        {/* Offline Tips */}
        <div className="mt-6 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">While you're offline:</h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <svg className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Browse recently viewed events
            </li>
            <li className="flex items-start">
              <svg className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              View cached event details
            </li>
            <li className="flex items-start">
              <svg className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              New events require internet connection
            </li>
          </ul>
        </div>
      </div>
      
      {/* Connection Detection Script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            function updateConnectionStatus() {
              const statusElement = document.getElementById('connection-status');
              if (navigator.onLine) {
                statusElement.textContent = 'Connected';
                statusElement.className = 'ml-1 text-green-600';
                setTimeout(() => window.location.href = '/', 1000);
              } else {
                statusElement.textContent = 'Offline';
                statusElement.className = 'ml-1 text-red-600';
              }
            }
            
            // Update status immediately
            updateConnectionStatus();
            
            // Listen for connection changes
            window.addEventListener('online', updateConnectionStatus);
            window.addEventListener('offline', updateConnectionStatus);
            
            // Check connection every 5 seconds
            setInterval(updateConnectionStatus, 5000);
          `
        }}
      />
    </div>
  );
}