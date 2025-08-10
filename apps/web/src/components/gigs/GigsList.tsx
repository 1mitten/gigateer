'use client';

import React, { useMemo } from 'react';
import { Gig } from '@gigateer/contracts';
import { GigCard, GigCardCompact } from './GigCard';
import { GigListItem } from './GigListItem';
import { GigListHeader } from './GigListHeader';
import { GigCardSkeleton, GigListItemSkeleton } from '../ui/LoadingSkeleton';
import { LoadingWrapper, AnimatedItem } from '../ui/LoadingWrapper';
import { DateDivider } from '../ui/DateDivider';
import { groupGigsByDate } from '../../utils/dateGrouping';

interface GigsListProps {
  gigs: Gig[];
  loading?: boolean;
  variant?: 'default' | 'compact' | 'list';
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
  const GigComponent = variant === 'compact' ? GigCardCompact : 
                       variant === 'list' ? GigListItem : GigCard;

  const SkeletonComponent = variant === 'list' ? GigListItemSkeleton : GigCardSkeleton;
  const spacingClass = variant === 'compact' ? 'space-y-2' : variant === 'list' ? 'space-y-1' : 'space-y-4';

  // Loading content
  const LoadingContent = (
    <div className={spacingClass}>
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  );

  // Empty state content
  const EmptyContent = (
    <div className="text-center py-12">
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
          <li>Broaden your tags selection</li>
          <li>Use more general search terms</li>
        </ul>
      </div>
    </div>
  );

  // Content with results
  const ContentWithResults = (
    <div>
      {/* Results count */}
      {showCount && (
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Found <span className="font-medium">{gigs.length}</span> 
            {gigs.length === 1 ? ' gig' : ' gigs'}
          </p>
        </div>
      )}

      {/* List header and table for list variant */}
      {variant === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <GigListHeader />
          {gigs.map((gig, index) => (
            <GigComponent
              key={gig.id}
              gig={gig}
              priority={index < 3} // Prioritize first 3 items for loading
            />
          ))}
        </div>
      ) : (
        <>
          {/* Gigs list with animations for grid/card views */}
          <div className={spacingClass}>
            {gigs.map((gig, index) => (
              <AnimatedItem key={gig.id} index={index}>
                <GigComponent
                  gig={gig}
                  priority={index < 3} // Prioritize first 3 items for loading
                />
              </AnimatedItem>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <LoadingWrapper 
      isLoading={loading} 
      loadingComponent={LoadingContent}
      className={className}
    >
      {gigs.length === 0 ? EmptyContent : ContentWithResults}
    </LoadingWrapper>
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
  const gridClassName = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`;

  // Group gigs by date for the grid view
  const groupedGigs = React.useMemo(() => {
    return groupGigsByDate(gigs);
  }, [gigs]);

  // Loading content
  const LoadingContent = (
    <div className={`${gridClassName} ${className}`}>
      {Array.from({ length: 6 }).map((_, index) => (
        <GigCardSkeleton key={index} />
      ))}
    </div>
  );

  // Empty state
  const EmptyContent = (
    <div className="col-span-full">
      <GigsList gigs={[]} loading={false} {...props} />
    </div>
  );

  // Content with results grouped by date
  const ContentWithResults = (
    <div className={className}>
      {groupedGigs.map((group, groupIndex) => {
        const startIndex = groupedGigs
          .slice(0, groupIndex)
          .reduce((acc, g) => acc + g.gigs.length, 0);

        return (
          <div key={group.date}>
            {/* Date divider */}
            <DateDivider date={group.dateFormatted} />
            
            {/* Grid of gigs for this date */}
            <div className={gridClassName}>
              {group.gigs.map((gig, gigIndex) => {
                const absoluteIndex = startIndex + gigIndex;
                return (
                  <AnimatedItem key={gig.id} index={absoluteIndex}>
                    <GigCard
                      gig={gig}
                      priority={absoluteIndex < 6} // Prioritize first 6 items overall
                    />
                  </AnimatedItem>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <LoadingWrapper 
      isLoading={loading || false} 
      loadingComponent={LoadingContent}
      className=""
    >
      {gigs.length === 0 ? EmptyContent : ContentWithResults}
    </LoadingWrapper>
  );
}