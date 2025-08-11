'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { CogIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useGigs } from '../../hooks/useGigs';
import { useViewPreference } from '../../hooks/useViewPreference';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../ui/Toast';
import { groupEventsByHappening } from '../../utils/eventSorting';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { LoadingWrapper } from '../ui/LoadingWrapper';
import { SearchInput } from '../search/SearchInput';
// import { FilterPanel } from '../filters/FilterPanel'; // TODO: Implement multi-select filter panel
import { FilterChipsBar } from '../filters/FilterChip';
import { GigsList, GigsGrid } from '../gigs/GigsList';
import { GigsGroupedList } from '../gigs/GigsGroupedList';
import { ViewToggle } from '../ui/ViewToggle';
import { SortControls, CompactSortControls } from '../ui/SortControls';
import { TimeRange } from '../../lib/cache';

interface SearchPageProps {
  city?: string;
}

interface Filters {
  searchQuery: string;
  timeRange: TimeRange;
  sortBy: 'date' | 'name' | 'venue';
  sortOrder: 'asc' | 'desc';
  genre: string[];
  venue: string[];
  priceRange?: [number, number];
}

export function SearchPageCached({ city }: SearchPageProps = {}) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const { addToast } = useToast();
  const { view, setView } = useViewPreference();
  const { settings } = useSettings();

  // Filter state
  const [filters, setFilters] = useState<Filters>({
    searchQuery: '',
    timeRange: 'week' as TimeRange,
    sortBy: 'date',
    sortOrder: 'asc',
    genre: [],
    venue: [],
    priceRange: undefined,
  });

  // Use the new caching hook
  const {
    gigs,
    loading,
    error,
    hasMore,
    totalCount,
    page,
    loadMore,
    refresh,
    cacheHit,
  } = useGigs(city || 'bristol', {
    timeRange: filters.timeRange,
    sortBy: filters.sortBy,
    filters: {
      genre: filters.genre.length > 0 ? filters.genre : undefined,
      venue: filters.venue.length > 0 ? filters.venue : undefined,
      priceRange: filters.priceRange,
    },
    limit: 50,
  });

  // Filter gigs by search query (client-side for better performance)
  const filteredGigs = useMemo(() => {
    if (!filters.searchQuery.trim()) {
      return gigs;
    }

    const query = filters.searchQuery.toLowerCase();
    return gigs.filter(gig => 
      gig.title.toLowerCase().includes(query) ||
      gig.venue.name.toLowerCase().includes(query) ||
      gig.artists?.some(artist => artist.toLowerCase().includes(query)) ||
      gig.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [gigs, filters.searchQuery]);

  // Group events if showing happening events
  const groupedGigs = useMemo(() => {
    if (settings.showHappeningEvents && filteredGigs.length > 0) {
      return groupEventsByHappening(filteredGigs, settings.showHappeningEvents);
    }
    return null;
  }, [filteredGigs, settings.showHappeningEvents]);

  // Update filter handlers
  const updateSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const updateTimeRange = (timeRange: TimeRange) => {
    setFilters(prev => ({ ...prev, timeRange }));
  };

  const handleToggleSort = (sortBy: 'date' | 'name' | 'venue') => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const updateGenreFilters = (genres: string[]) => {
    setFilters(prev => ({ ...prev, genre: genres }));
  };

  const updateVenueFilters = (venues: string[]) => {
    setFilters(prev => ({ ...prev, venue: venues }));
  };

  const updatePriceRange = (priceRange?: [number, number]) => {
    setFilters(prev => ({ ...prev, priceRange }));
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      timeRange: 'week',
      sortBy: 'date',
      sortOrder: 'asc',
      genre: [],
      venue: [],
      priceRange: undefined,
    });
  };

  // Calculate active filters for display
  const activeFilters = useMemo(() => {
    const active: { key: string; label: string; value: string }[] = [];
    
    if (filters.genre.length > 0) {
      active.push({ key: 'genre', label: 'Genre', value: filters.genre.join(', ') });
    }
    if (filters.venue.length > 0) {
      active.push({ key: 'venue', label: 'Venue', value: filters.venue.join(', ') });
    }
    if (filters.priceRange) {
      active.push({ key: 'price', label: 'Price', value: `$${filters.priceRange[0]} - $${filters.priceRange[1]}` });
    }
    if (filters.timeRange !== 'week') {
      active.push({ key: 'timeRange', label: 'Time Range', value: filters.timeRange });
    }
    if (filters.sortBy !== 'date') {
      active.push({ key: 'sortBy', label: 'Sort By', value: filters.sortBy });
    }

    return active;
  }, [filters]);

  const hasActiveFilters = activeFilters.length > 0;

  // Remove specific filter
  const removeFilter = (key: string) => {
    switch (key) {
      case 'genre':
        updateGenreFilters([]);
        break;
      case 'venue':
        updateVenueFilters([]);
        break;
      case 'price':
        updatePriceRange(undefined);
        break;
      case 'timeRange':
        updateTimeRange('week');
        break;
      case 'sortBy':
        handleToggleSort('date');
        break;
    }
  };

  // Handle scroll for infinite loading
  useEffect(() => {
    if (!settings.useInfiniteScroll) return;

    const handleScroll = () => {
      if (loading || !hasMore) return;
      
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      
      // Load more when 80% through the page
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, loadMore, settings.useInfiniteScroll]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load events
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* City title */}
              {city && (
                <h1 className="text-2xl font-extrabold font-public-sans text-gray-900 dark:text-white capitalize">
                  {city}
                </h1>
              )}
              
              {/* Cache status indicator (dev mode) */}
              {process.env.NODE_ENV === 'development' && cacheHit && (
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-4 w-4" />
                  <span className="text-xs text-gray-500">
                    Cache: {cacheHit} | Page: {page} | Total: {totalCount}
                  </span>
                </div>
              )}

              {/* Settings link */}
              <Link
                href="/settings"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <CogIcon className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Search bar */}
            <div className="mb-4">
              <SearchInput
                value={filters.searchQuery}
                onChange={updateSearchQuery}
                placeholder="Search events, venues, artists..."
              />
            </div>

            {/* Desktop controls */}
            <div className="hidden md:flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SortControls
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onToggleSort={handleToggleSort}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <ViewToggle currentView={view} onViewChange={setView} />
                <button
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Filters
                </button>
              </div>
            </div>

            {/* Mobile controls */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <CompactSortControls
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onToggleSort={handleToggleSort}
              />
              <ViewToggle currentView={view} onViewChange={setView} />
            </div>

            {/* Active filters */}
            {hasActiveFilters && (
              <div className="mt-4">
                <FilterChipsBar
                  filters={activeFilters}
                  onRemoveFilter={removeFilter}
                  onClearAll={resetFilters}
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingWrapper isLoading={loading && filteredGigs.length === 0}>
            {/* Results count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {loading && filteredGigs.length === 0 ? (
                'Loading events...'
              ) : (
                <>
                  Showing {filteredGigs.length} of {totalCount} events
                  {filters.searchQuery && ` for "${filters.searchQuery}"`}
                </>
              )}
            </div>

            {/* Gigs display */}
            {filteredGigs.length > 0 ? (
              <>
                {groupedGigs && settings.showHappeningEvents ? (
                  <GigsGroupedList
                    eventGroups={groupedGigs}
                    view={view}
                    useInfiniteScrollMode={false}
                  />
                ) : view === 'grid' ? (
                  <GigsGrid gigs={filteredGigs} />
                ) : (
                  <GigsList gigs={filteredGigs} />
                )}

                {/* Load more button for pagination mode */}
                {!settings.useInfiniteScroll && hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}

                {/* Loading indicator for infinite scroll */}
                {settings.useInfiniteScroll && loading && filteredGigs.length > 0 && (
                  <div className="mt-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  {filters.searchQuery
                    ? `No events found for "${filters.searchQuery}"`
                    : "No events available at the moment."
                  }
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-4 text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </LoadingWrapper>
        </div>

        {/* Filter panel - TODO: Implement multi-select filter panel */}
        {/* <FilterPanel
          isOpen={isMobileFiltersOpen}
          onClose={() => setIsMobileFiltersOpen(false)}
          filters={{
            genre: filters.genre,
            venue: filters.venue,
            priceRange: filters.priceRange,
          }}
          onGenreChange={updateGenreFilters}
          onVenueChange={updateVenueFilters}
          onPriceRangeChange={updatePriceRange}
          onReset={resetFilters}
          gigs={gigs} // For extracting available genres and venues
        /> */}
      </div>
    </ErrorBoundary>
  );
}