'use client';

import dynamic from 'next/dynamic';
import { GigGridSkeleton } from './ui/Skeleton';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '../hooks/useSettings';

// Component to handle default city redirect
function DefaultCityRedirect() {
  const router = useRouter();
  const { settings, isLoaded } = useSettings();
  
  useEffect(() => {
    if (isLoaded && settings.defaultCity) {
      router.replace(`/${settings.defaultCity}`);
    }
  }, [isLoaded, settings.defaultCity, router]);
  
  return null;
}

// Dynamically import SearchPage with no SSR to avoid hydration issues
const SearchPage = dynamic(() => import('./pages/SearchPage').then(mod => ({ default: mod.SearchPage })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Discover Live Music
              </h1>
              <p className="mt-2 text-gray-600">
                Find gigs, concerts, and festivals near you
              </p>
            </div>
            <div className="mt-4 max-w-2xl mx-auto w-full sm:mx-0">
              <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-32">
              <div className="card p-6 space-y-4">
                <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
                <div className="space-y-3">
                  <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
                  <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
                  <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3">
            <GigGridSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
});

// Wrapper component to handle default city redirect
function SearchPageWithRedirect() {
  return (
    <>
      <DefaultCityRedirect />
      <SearchPage />
    </>
  );
}

export default SearchPageWithRedirect;