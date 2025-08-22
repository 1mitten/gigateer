'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CogIcon } from '@heroicons/react/24/outline';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { useGigsApi } from '../../hooks/useGigsApi';
import { useGigsInfiniteQuery } from '../../hooks/useGigsInfiniteQuery';
import { useViewPreference } from '../../hooks/useViewPreference';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../ui/Toast';
// Removed groupEventsByHappening and flattenEventGroups - no longer using event grouping
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ContentTransition } from '../ui/LoadingWrapper';
import { SearchInput } from '../search/SearchInput';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterChipsBar } from '../filters/FilterChip';
import { GigsList, GigsGrid } from '../gigs/GigsList';
import { GigsListInfinite, GigsGridInfinite } from '../gigs/GigsListInfinite';
import { GigsGroupedList } from '../gigs/GigsGroupedList';
import { ViewToggle } from '../ui/ViewToggle';
import { Pagination } from '../ui/Pagination';
import { SortControls, CompactSortControls } from '../ui/SortControls';
import { DateDivider } from '../ui/DateDivider';

interface SearchPageProps {
  city?: string;
}

export function SearchPage({ city }: SearchPageProps = {}) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const { addToast } = useToast();
  const isOnline = true;
  const { view, setView, isLoaded } = useViewPreference();
  const { settings } = useSettings();
  const [useInfiniteScrollMode, setUseInfiniteScrollMode] = useState(settings.useInfiniteScroll);
  
  // Sync with settings when they change
  React.useEffect(() => {
    setUseInfiniteScrollMode(settings.useInfiniteScroll);
  }, [settings.useInfiniteScroll]);
  
  // Search and filter state - MUST be called before any conditional returns
  const {
    filters: baseFilters,
    updateFilters,
    updatePage,
    resetFilters,
    removeFilter,
    activeFilters,
    hasActiveFilters,
    apiParams: baseApiParams,
  } = useSearchFilters();
  
  // For city pages, override the filters and apiParams to include the city
  const filters = React.useMemo(() => {
    if (city) {
      return { ...baseFilters, city };
    }
    return baseFilters;
  }, [baseFilters, city]);
  
  const apiParams = React.useMemo(() => {
    if (city) {
      return { ...baseApiParams, city };
    }
    return baseApiParams;
  }, [baseApiParams, city]);

  // API data - traditional pagination
  const { data: traditionalGigs, pagination, loading: traditionalLoading, error: traditionalError, refetch } = useGigsApi(apiParams);
  
  // Infinite scroll data using React Query
  const isQueryReady = (filters.dateFilter !== undefined);
  
  const { 
    gigs: infiniteGigs, 
    loading: infiniteLoading, 
    error: infiniteError, 
    hasNextPage, 
    fetchNextPage,
    isFetchingNextPage,
    refresh: refreshInfinite,
    totalCount,
    meta: infiniteMeta
  } = useGigsInfiniteQuery({ 
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    city: filters.city,
    tags: filters.tags,
    venue: filters.venue,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    q: filters.q,
    limit: filters.limit,
    enabled: useInfiniteScrollMode && isQueryReady
  });
  
  // CLIENT-SIDE DATA LOADING - Move all hooks here
  const [hasMounted, setHasMounted] = useState(false);
  const [clientGigs, setClientGigs] = useState<any[]>([]);
  const [clientLoading, setClientLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);


  // Hydration detection
  React.useEffect(() => {
    console.log('HYDRATION: Component mounted');
    setHasMounted(true);
  }, []);

  // Data loading after hydration (only for pagination mode)
  React.useEffect(() => {
    // Skip client fetch if using infinite scroll mode
    if (useInfiniteScrollMode) {
      console.log('CLIENT: Skipping fetch - using infinite scroll mode');
      return;
    }
    
    if (!hasMounted) {
      console.log('HYDRATION: Not mounted yet, skipping fetch');
      return;
    }
    
    console.log('CLIENT: Starting data fetch for pagination mode...');
    
    const fetchGigs = async () => {
      console.log('CLIENT: Calling API...');
      try {
        const params = new URLSearchParams();
        params.set('sortBy', filters.sortBy || 'date');
        params.set('sortOrder', filters.sortOrder || 'asc');
        params.set('limit', '20');
        params.set('client', 'hydrated-fetch');
        
        // Add city filter if provided
        if (filters.city) {
          params.set('city', filters.city);
        }
        
        const url = `/api/gigs?${params.toString()}`;
        console.log('CLIENT: URL =', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('CLIENT: Got', data.data?.length, 'gigs');
        setClientGigs(data.data || []);
        setClientLoading(false);
      } catch (error) {
        console.error('CLIENT: Failed -', error);
        setClientError('Failed to load gigs');
        setClientLoading(false);
      }
    };

    fetchGigs();
  }, [useInfiniteScrollMode, hasMounted, filters.sortBy, filters.sortOrder, filters.dateFrom, filters.dateTo]);

  // Error handling effect
  React.useEffect(() => {
    if (clientError) {
      addToast({
        type: 'error',
        title: 'Failed to load gigs',
        message: clientError,
      });
    }
  }, [clientError, addToast]);
  
  // Handle refresh callback
  const handleRefresh = React.useCallback(() => {
    if (useInfiniteScrollMode) {
      refreshInfinite();
    } else {
      refetch();
    }
  }, [useInfiniteScrollMode, refreshInfinite, refetch]);
  
  // Sort controls - now managed by filters
  const handleToggleSort = (newSortBy: 'date') => {
    // Since we only have date sorting now, just toggle the sort order
    updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  // Handle date filter changes
  const handleDateFilterChange = (dateFilter: string) => {
    updateFilters({ dateFilter: dateFilter as any });
  };
  
  // USE APPROPRIATE DATA SOURCE BASED ON MODE
  const rawGigs = useInfiniteScrollMode ? infiniteGigs : clientGigs;
  const loading = useInfiniteScrollMode ? infiniteLoading : clientLoading;  
  const error = useInfiniteScrollMode ? infiniteError : clientError;

  // SIMPLE GIGS DISPLAY - NO GROUPING
  const gigs = rawGigs || [];
  
  // Create a simple "future" event group for compatibility with GigsGroupedList
  const eventGroups = useMemo(() => {
    if (!gigs || gigs.length === 0) {
      return [];
    }
    
    return [{
      type: 'future' as const,
      events: gigs
    }];
  }, [gigs]);
  
  // Show loading state during initial page load or when actively loading with no data
  const hasData = gigs && gigs.length > 0;
  const isInitialLoad = !hasMounted;
  const isActivelyLoading = Boolean(loading);
  
  // Show loading when:
  // 1. Initial page load (not mounted yet) OR
  // 2. Actively loading data and no existing data
  const isLoading = isInitialLoad || (isActivelyLoading && !hasData);
  
  console.log('RENDER: gigs.length =', gigs.length, 'loading =', loading, 'hasData =', hasData, 'isLoading =', isLoading, 'hasMounted =', hasMounted, 'infiniteMode =', useInfiniteScrollMode);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex flex-col space-y-3">
              {/* Title and Settings - Single Row */}
              <div className="max-w-2xl mx-auto w-full">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h1 className={`text-2xl sm:text-3xl ${city ? 'font-extrabold font-public-sans' : 'font-bold'} text-gray-900 dark:text-gray-100`}>
                        {city ? (
                          <>
                            {city.charAt(0).toUpperCase() + city.slice(1)}
                            <span className="text-3xl sm:text-4xl text-primary-600 dark:text-primary-400"> ..</span>
                          </>
                        ) : 'Discover Live Music'}
                      </h1>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Find Live Music & Venues
                        {!isOnline && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Offline Mode
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex items-center">
                    {/* Settings Gear Icon */}
                    <Link 
                      href="/settings"
                      className="p-3 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
                      aria-label="Settings"
                      title="Settings"
                    >
                      <CogIcon className="h-7 w-7" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div className="max-w-2xl mx-auto w-full">
                <SearchInput
                  value={filters.q}
                  onChange={(q) => updateFilters({ q })}
                  placeholder={city ? "Search for gigs and venues..." : "Search for artists, venues, or events..."}
                />
              </div>

              {/* Active filters */}
              {hasActiveFilters && (
                <div className="max-w-2xl mx-auto w-full">
                  <FilterChipsBar
                    filters={activeFilters}
                    onRemoveFilter={removeFilter}
                    onClearAll={resetFilters}
                    className="justify-start"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={city ? "w-full" : "lg:grid lg:grid-cols-4 lg:gap-8"}>
          {/* Desktop Sidebar - Hidden for city pages */}
          {!city && (
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-32">
                <FilterPanel
                  filters={filters}
                  onChange={updateFilters}
                  onReset={resetFilters}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={city ? "w-full" : "lg:col-span-3"}>
            {/* Mobile filter button and sort controls */}
            <div className="flex flex-col gap-4 mb-6 lg:hidden">
              <div className={city ? "flex justify-end" : "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"}>
                {!city && (
                  <FilterPanel
                    filters={filters}
                    onChange={updateFilters}
                    onReset={resetFilters}
                    isMobile
                    isOpen={isMobileFiltersOpen}
                    onToggle={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                  />
                )}
                
                <CompactSortControls
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onToggleSort={handleToggleSort}
                  dateFilter={filters.dateFilter}
                  onDateFilterChange={handleDateFilterChange}
                  className="w-full"
                />
              </div>
              
              {isLoaded && (
                <div className="flex justify-center sm:justify-end">
                  <ViewToggle
                    currentView={view}
                    onViewChange={setView}
                  />
                </div>
              )}
            </div>

            {/* Desktop sort controls and results info */}
            <div className="hidden lg:flex lg:items-center lg:justify-between mb-6">
              <div className="flex items-center space-x-6">
                <SortControls
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onToggleSort={handleToggleSort}
                  dateFilter={filters.dateFilter}
                  onDateFilterChange={handleDateFilterChange}
                />
              </div>

              <div className="flex items-center space-x-4">
                {(pagination || useInfiniteScrollMode) && (
                  <div className="text-sm text-gray-600">
                    {`Showing ${gigs.length} of ${gigs.length} gigs`}
                  </div>
                )}
                
                {isLoaded && (
                  <ViewToggle
                    currentView={view}
                    onViewChange={setView}
                  />
                )}
              </div>
            </div>

            {/* Error State */}
            {error && !loading && (
              <div className="card p-6 text-center">
                <div className={`mb-4 ${!isOnline ? 'text-yellow-500' : 'text-red-500'}`}>
                  {!isOnline ? (
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  ) : (
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {!isOnline ? 'No Internet Connection' : 'Unable to Load Gigs'}
                </h3>
                
                <p className="text-gray-600 mb-4">
                  {!isOnline 
                    ? 'You\'re currently offline. Some cached events may still be available to browse.'
                    : typeof error === 'string' ? error : error?.message || 'An unexpected error occurred'
                  }
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleRefresh}
                    className="btn-primary touch-manipulation"
                    disabled={!isOnline}
                  >
                    {!isOnline ? 'Waiting for Connection...' : 'Try Again'}
                  </button>
                  
                  {!isOnline && (
                    <button
                      onClick={() => window.location.reload()}
                      className="btn-secondary touch-manipulation"
                    >
                      Check Cached Data
                    </button>
                  )}
                </div>
                
                {!isOnline && (
                  <p className="text-xs text-gray-500 mt-4">
                    💡 Tip: Install this app to get better offline features
                  </p>
                )}
              </div>
            )}

            {/* Results with smooth transitions */}
            <ErrorBoundary>
              <ContentTransition transitionKey={`${view}-${filters.sortBy}-${filters.sortOrder}-${filters.dateFilter}-${filters.dateFrom}-${filters.dateTo}`}>
                {isLoading ? (
                  // Show skeleton only for initial loading
                  view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="card p-6 space-y-4">
                          <div className="animate-fade-in bg-gray-200 h-6 w-3/4 rounded"></div>
                          <div className="animate-fade-in bg-gray-200 h-5 w-1/2 rounded"></div>
                          <div className="flex justify-between items-center">
                            <div className="animate-fade-in bg-gray-200 h-4 w-1/3 rounded"></div>
                            <div className="animate-fade-in bg-gray-200 h-4 w-1/4 rounded"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="animate-fade-in bg-gray-200 h-4 w-full rounded"></div>
                            <div className="animate-fade-in bg-gray-200 h-4 w-2/3 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="card p-6 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <div className="animate-fade-in bg-gray-200 h-6 w-2/3 rounded"></div>
                              <div className="animate-fade-in bg-gray-200 h-5 w-1/2 rounded"></div>
                            </div>
                            <div className="animate-fade-in bg-gray-200 h-4 w-20 rounded"></div>
                          </div>
                          <div className="animate-fade-in bg-gray-200 h-4 w-full rounded"></div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <GigsGroupedList
                    eventGroups={eventGroups}
                    view={view}
                    useInfiniteScrollMode={useInfiniteScrollMode}
                    hasNextPage={hasNextPage}
                    fetchNextPage={fetchNextPage}
                    totalCount={totalCount}
                    loading={loading}
                    emptyMessage={hasActiveFilters ? 
                      "No gigs match your current filters. Try adjusting your search criteria." : 
                      "No gigs available at the moment."
                    }
                  />
                )}
              </ContentTransition>
            </ErrorBoundary>

            {/* Pagination - only show in traditional pagination mode */}
            {!useInfiniteScrollMode && pagination && pagination.pages > 1 && !loading && (
              <div className="mt-8">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                  onPageChange={updatePage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}