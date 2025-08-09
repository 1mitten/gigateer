import Link from 'next/link';

export default function GigNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full px-4">
        <div className="card p-8 text-center">
          <div className="text-gray-300 mb-6">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Gig Not Found
          </h1>
          
          <p className="text-gray-600 mb-8">
            Sorry, we couldn't find the gig you're looking for. It may have been removed or the link might be incorrect.
          </p>
          
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full btn-primary text-center"
            >
              Browse All Gigs
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="w-full btn-secondary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}