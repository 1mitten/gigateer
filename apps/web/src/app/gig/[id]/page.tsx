'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import { useGigDetail } from '../../../hooks/useGigsApi';
import { GigDetail } from '../../../components/gigs/GigDetail';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

interface GigPageProps {
  params: {
    id: string;
  };
}

function GigDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingSkeleton className="h-4 w-24 mb-6" />
          
          <div className="space-y-4">
            <LoadingSkeleton className="h-10 w-3/4" />
            <LoadingSkeleton className="h-6 w-1/2" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-3">
                <LoadingSkeleton className="h-5 w-full" />
                <LoadingSkeleton className="h-5 w-3/4" />
              </div>
              <div className="space-y-3">
                <LoadingSkeleton className="h-5 w-full" />
                <LoadingSkeleton className="h-5 w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card p-6 space-y-4">
              <LoadingSkeleton className="h-64 w-full" />
            </div>
            
            <div className="card p-6 space-y-4">
              <LoadingSkeleton className="h-6 w-24" />
              <div className="flex gap-2">
                <LoadingSkeleton className="h-8 w-16" />
                <LoadingSkeleton className="h-8 w-20" />
                <LoadingSkeleton className="h-8 w-18" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6 space-y-4">
              <LoadingSkeleton className="h-6 w-32" />
              <LoadingSkeleton className="h-5 w-24" />
              <LoadingSkeleton className="h-10 w-full" />
              <LoadingSkeleton className="h-10 w-full" />
            </div>
            
            <div className="card p-6 space-y-4">
              <LoadingSkeleton className="h-6 w-20" />
              <LoadingSkeleton className="h-5 w-full" />
              <LoadingSkeleton className="h-4 w-3/4" />
              <LoadingSkeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

  // Loading state
  if (loading) {
    return <GigDetailSkeleton />;
  }

  // Error state
  if (error) {
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

  // Gig not found
  if (!gig) {
    notFound();
  }

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <GigDetail gig={gig} />
    </ErrorBoundary>
  );
}