'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import { useGigDetail } from '../../../hooks/useGigsApi';
import { GigDetail } from '../../../components/gigs/GigDetail';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

interface GigPageProps {
  params: {
    id: string;
  };
}


function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full px-4">
        <div className="card p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Event
          </h1>
          
          <p className="text-gray-600 mb-6">
            {error.message || 'Something went wrong while loading this event.'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full btn-primary"
            >
              Try Again
            </button>
            
            <a
              href="/"
              className="block w-full btn-secondary text-center"
            >
              Back to Search
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GigPage({ params }: GigPageProps) {
  const { data: gig, loading, error } = useGigDetail(params.id);

  // Only show errors after loading is complete and we have no gig
  if (!loading && error) {
    if (error.includes('not found')) {
      notFound();
    }
    
    return (
      <ErrorBoundary fallback={ErrorFallback}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full px-4">
            <div className="card p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to Load Event
              </h1>
              
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              
              <a
                href="/"
                className="btn-primary"
              >
                Back to Search
              </a>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Gig not found (only check when not loading)
  if (!loading && !gig) {
    notFound();
  }

  // Show gig when ready, or blank gray screen while loading (no text at all)
  return gig ? <GigDetail gig={gig} /> : <div className="min-h-screen bg-gray-50" />;
}