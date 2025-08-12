'use client';

import React from 'react';
import { Gig } from '@gigateer/contracts';
import { GigCard, GigCardCompact } from './GigCard';
import { GigListItem } from './GigListItem';
import { GigListHeader } from './GigListHeader';
import { GigCardSkeleton, GigListItemSkeleton } from '../ui/LoadingSkeleton';
import { AnimatedItem } from '../ui/LoadingWrapper';
import { DateDivider } from '../ui/DateDivider';
import { InfiniteScrollWrapper, InfiniteScrollGridWrapper } from '../ui/InfiniteScrollWrapper';
import { groupGigsByDate } from '../../utils/dateGrouping';

interface GigsListInfiniteProps {
  gigs: Gig[];
  loading?: boolean;
  variant?: 'default' | 'compact' | 'list';
  showCount?: boolean;
  emptyMessage?: string;
  className?: string;
  hasMore?: boolean;
  fetchMore?: () => void;
  totalCount?: number;
}

export function GigsListInfinite({ 
  gigs, 
  loading = false,
  variant = 'default',
  showCount = true,
  emptyMessage = "No gigs found matching your criteria.",
  className = "",
  hasMore = false,
  fetchMore = () => {},
  totalCount = 0
}: GigsListInfiniteProps) {
  // Debug log to see what variant is being passed
  console.log('GigsListInfinite received variant:', variant);
  
  const GigComponent = variant === 'compact' ? GigCardCompact : 
                       variant === 'list' ? GigListItem : GigCard;
  
  // Debug log to see which component was selected
  console.log('GigsListInfinite selected component:', GigComponent === GigListItem ? 'GigListItem' : GigComponent === GigCard ? 'GigCard' : 'GigCardCompact');

  const SkeletonComponent = variant === 'list' ? GigListItemSkeleton : GigCardSkeleton;
  const spacingClass = variant === 'compact' ? 'space-y-2' : variant === 'list' ? 'space-y-1' : 'space-y-4';

  // Empty state content
  if (gigs.length === 0 && !loading) {
    return (
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
  }

  // Content with infinite scroll
  return (
    <div className={className}>
      {/* Results count */}
      {showCount && (
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{gigs.length}</span> 
            {totalCount > 0 && ` of ${totalCount}`}
            {gigs.length === 1 ? ' gig' : ' gigs'}
          </p>
        </div>
      )}

      {/* List header and table for list variant */}
      {variant === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <GigListHeader />
          <InfiniteScrollWrapper
            gigs={gigs}
            hasMore={hasMore}
            loading={loading}
            fetchMore={fetchMore}
            totalCount={totalCount}
            className=""
          >
            {gigs.map((gig, index) => (
              <GigComponent
                key={gig.id}
                gig={gig}
                priority={index < 6} // Prioritize first 6 items for loading
              />
            ))}
          </InfiniteScrollWrapper>
        </div>
      ) : (
        <InfiniteScrollWrapper
          gigs={gigs}
          hasMore={hasMore}
          loading={loading}
          fetchMore={fetchMore}
          totalCount={totalCount}
          className={spacingClass}
        >
          {gigs.map((gig, index) => (
            <AnimatedItem key={gig.id} index={index}>
              <GigComponent
                gig={gig}
                priority={index < 6} // Prioritize first 6 items for loading
              />
            </AnimatedItem>
          ))}
        </InfiniteScrollWrapper>
      )}
    </div>
  );
}

// Grid version with infinite scroll and date grouping
export function GigsGridInfinite({ 
  gigs, 
  loading, 
  className = "", 
  hasMore = false,
  fetchMore = () => {},
  totalCount = 0,
  ...props 
}: GigsListInfiniteProps) {
  const gridClassName = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`;

  // Group gigs by date for the grid view, preserving API sort order
  const groupedGigs = React.useMemo(() => {
    return groupGigsByDate(gigs, true); // preserveOrder = true
  }, [gigs]);

  // Empty state
  if (gigs.length === 0 && !loading) {
    return (
      <div className="col-span-full">
        <GigsListInfinite gigs={[]} loading={false} {...props} />
      </div>
    );
  }

  // Content with infinite scroll and date grouping
  return (
    <InfiniteScrollGridWrapper
      gigs={gigs}
      hasMore={hasMore}
      loading={Boolean(loading)}
      fetchMore={fetchMore}
      totalCount={totalCount}
      className={className}
    >
      {groupedGigs.map((group, groupIndex) => {
        const startIndex = groupedGigs
          .slice(0, groupIndex)
          .reduce((acc, g) => acc + g.gigs.length, 0);

        return (
          <div key={group.date} data-testid="date-group">
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
    </InfiniteScrollGridWrapper>
  );
}