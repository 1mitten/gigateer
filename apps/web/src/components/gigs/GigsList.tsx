'use client';

import React, { useMemo } from 'react';
import { Gig } from '@gigateer/contracts';
import { GigCard, GigCardCompact } from './GigCard';
import { GigCardSkeleton } from '../ui/LoadingSkeleton';

interface GigsListProps {
  gigs: Gig[];
  loading?: boolean;
  variant?: 'default' | 'compact';
  showCount?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function GigsList({ 
  gigs, 
  loading = false,
  variant = 'default',
  showCount = true,
  emptyMessage = "No gigs found matching your criteria.",
  className = ""
}: GigsListProps) {
  const GigComponent = variant === 'compact' ? GigCardCompact : GigCard;

  // Loading skeleton
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <GigCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (gigs.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Gigs Found
        </h3>
        
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          {emptyMessage}
        </p>
        
        <div className="space-y-2 text-sm text-gray-500">
          <p>Try adjusting your filters or search terms:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check your date range</li>
            <li>Try different cities or venues</li>
            <li>Broaden your genre selection</li>
            <li>Use more general search terms</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Results count */}
      {showCount && (
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Found <span className="font-medium">{gigs.length}</span> 
            {gigs.length === 1 ? ' gig' : ' gigs'}
          </p>
        </div>
      )}

      {/* Gigs list */}
      <div className={variant === 'compact' ? 'space-y-2' : 'space-y-4'}>
        {gigs.map((gig, index) => (
          <GigComponent
            key={gig.id}
            gig={gig}
            priority={index < 3} // Prioritize first 3 items for loading
          />
        ))}
      </div>
    </div>
  );
}

// Virtualized version for very large lists
export function VirtualizedGigsList({ gigs, ...props }: GigsListProps) {
  // For now, we'll use regular list unless we need true virtualization
  // In the future, this could use react-window or react-virtualized
  // for better performance with thousands of items
  
  return <GigsList gigs={gigs} {...props} />;
}

// Grid version for different layout
export function GigsGrid({ gigs, loading, className = "", ...props }: GigsListProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <GigCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (gigs.length === 0) {
    return (
      <div className="col-span-full">
        <GigsList gigs={[]} loading={false} {...props} />
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {gigs.map((gig, index) => (
        <GigCard
          key={gig.id}
          gig={gig}
          priority={index < 6} // Prioritize first 6 items
        />
      ))}
    </div>
  );
}