import React from 'react';
import { GigsList, GigsGrid } from './GigsList';
import { GigsListInfinite, GigsGridInfinite } from './GigsListInfinite';
import { DateDivider } from '../ui/DateDivider';
import { EventGroup } from '../../utils/eventSorting';

interface GigsGroupedListProps {
  eventGroups: EventGroup[];
  view: 'list' | 'grid';
  useInfiniteScrollMode: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  totalCount?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export function GigsGroupedList({
  eventGroups,
  view,
  useInfiniteScrollMode,
  hasNextPage,
  fetchNextPage,
  totalCount,
  loading = false,
  emptyMessage
}: GigsGroupedListProps) {
  // Debug log to see what view is being passed
  console.log('GigsGroupedList received view:', view);
  // If no groups, show empty state
  if (eventGroups.length === 0) {
    const EmptyComponent = useInfiniteScrollMode 
      ? (view === 'grid' ? GigsGridInfinite : GigsListInfinite)
      : (view === 'grid' ? GigsGrid : GigsList);

    return (
      <EmptyComponent
        gigs={[]}
        loading={loading}
        variant={view === 'list' ? 'list' : 'default'}
        showCount={false}
        emptyMessage={emptyMessage}
        {...(useInfiniteScrollMode && {
          hasMore: hasNextPage,
          fetchMore: fetchNextPage,
          totalCount
        })}
      />
    );
  }

  // If only one group and it's not 'happening', render normally without divider
  if (eventGroups.length === 1 && eventGroups[0].type !== 'happening') {
    const allGigs = eventGroups[0].events;
    
    if (useInfiniteScrollMode) {
      const Component = view === 'grid' ? GigsGridInfinite : GigsListInfinite;
      return (
        <Component
          gigs={allGigs}
          loading={loading}
          variant={view === 'list' ? 'list' : 'default'}
          showCount={false}
          hasMore={hasNextPage}
          fetchMore={fetchNextPage}
          totalCount={totalCount}
          emptyMessage={emptyMessage}
        />
      );
    } else {
      const Component = view === 'grid' ? GigsGrid : GigsList;
      return (
        <Component
          gigs={allGigs}
          loading={loading}
          variant={view === 'list' ? 'list' : 'default'}
          showCount={false}
          emptyMessage={emptyMessage}
        />
      );
    }
  }

  // For list view, render as a simple linear list without date grouping
  if (view === 'list') {
    // Flatten all events into a single array, preserving "happening now" order
    const allEvents = eventGroups.flatMap(group => group.events);
    
    // Add "Happening now" divider at the top if there are happening events
    const hasHappeningEvents = eventGroups.some(group => group.type === 'happening');
    
    return (
      <div className="space-y-0">
        {hasHappeningEvents && (
          <DateDivider date="Happening now" className="text-red-600 font-semibold" />
        )}
        
        {/* Render as simple list */}
        {useInfiniteScrollMode ? (
          <GigsListInfinite
            gigs={allEvents}
            loading={false}
            variant="list"
            showCount={false}
            hasMore={hasNextPage}
            fetchMore={fetchNextPage}
            totalCount={totalCount}
            emptyMessage={emptyMessage}
          />
        ) : (
          <GigsList
            gigs={allEvents}
            loading={false}
            variant="list"
            showCount={false}
            emptyMessage={emptyMessage}
          />
        )}
      </div>
    );
  }

  // For grid view, render grouped events with date dividers
  return (
    <div className="space-y-0">
      {eventGroups.map((group, groupIndex) => {
        const isLastGroup = groupIndex === eventGroups.length - 1;
        
        return (
          <div key={group.type}>
            {/* Show divider for 'happening' events */}
            {group.type === 'happening' && (
              <DateDivider date="Happening now" className="text-red-600 font-semibold" />
            )}
            
            {/* Render events in the group */}
            {useInfiniteScrollMode ? (
              <GigsGridInfinite
                gigs={group.events}
                loading={false}
                showCount={false}
                hasMore={isLastGroup ? hasNextPage : false}
                fetchMore={isLastGroup ? fetchNextPage : undefined}
                totalCount={isLastGroup ? totalCount : undefined}
                emptyMessage={emptyMessage}
              />
            ) : (
              <GigsGrid
                gigs={group.events}
                loading={false}
                showCount={false}
                emptyMessage={emptyMessage}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}