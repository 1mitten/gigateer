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

  // If only one group, render normally without divider
  if (eventGroups.length === 1) {
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
    // Flatten all events into a single array
    const allEvents = eventGroups.flatMap(group => group.events);
    
    return (
      <div className="space-y-0">
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
  // Since we no longer use "happening" groups, just flatten all events and use date grouping
  const allEvents = eventGroups.flatMap(group => group.events);
  
  return (
    <div className="space-y-0">
      {useInfiniteScrollMode ? (
        <GigsGridInfinite
          gigs={allEvents}
          loading={false}
          showCount={false}
          hasMore={hasNextPage}
          fetchMore={fetchNextPage}
          totalCount={totalCount}
          emptyMessage={emptyMessage}
        />
      ) : (
        <GigsGrid
          gigs={allEvents}
          loading={false}
          showCount={false}
          emptyMessage={emptyMessage}
        />
      )}
    </div>
  );
}