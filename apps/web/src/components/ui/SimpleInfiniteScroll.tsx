'use client';

import React, { ReactNode, useEffect, useCallback, useState } from 'react';
import { Gig } from '@gigateer/contracts';
import { APP_CONFIG } from '../../config/app.config';

interface SimpleInfiniteScrollProps {
  gigs: Gig[];
  hasMore: boolean;
  loading: boolean;
  fetchMore: () => void;
  totalCount: number;
  children: ReactNode;
  className?: string;
}

export function SimpleInfiniteScroll({
  gigs,
  hasMore,
  loading,
  fetchMore,
  totalCount,
  children,
  className = '',
}: SimpleInfiniteScrollProps) {
  const [isNearBottom, setIsNearBottom] = useState(false);

  const handleScroll = useCallback(() => {
    const threshold = 1000; // Trigger when 1000px from bottom
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    const nearBottom = scrollPosition >= documentHeight - threshold;
    setIsNearBottom(nearBottom);
    
    if (nearBottom && hasMore && !loading) {
      fetchMore();
    }
  }, [hasMore, loading, fetchMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Loading spinner component
  const LoadingIndicator = (
    <div className="flex justify-center items-center py-8">
      <div className="flex items-center space-x-2 text-gray-500">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm">Loading more gigs...</span>
      </div>
    </div>
  );

  // End message component - simplified to just show completion
  const EndMessage = (
    <div className="text-center py-8 border-t border-gray-100 dark:border-gray-700 mt-4">
      <div className="text-gray-500 dark:text-gray-400">
        <div className="mx-auto h-12 w-12 mb-3 text-gray-300 dark:text-gray-500">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          You've seen all {totalCount} gig{totalCount === 1 ? '' : 's'}!
        </p>
        {totalCount > APP_CONFIG.pagination.DEFAULT_LIMIT && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Try adjusting your filters to discover more events.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className={className}>
      {children}
      
      {/* Show loading indicator when fetching more */}
      {loading && hasMore && LoadingIndicator}
      
      {/* Show end message when no more items */}
      {!hasMore && gigs.length > 0 && EndMessage}
    </div>
  );
}