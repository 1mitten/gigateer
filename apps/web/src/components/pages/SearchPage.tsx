'use client';

import React, { useState } from 'react';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { useGigsApi } from '../../hooks/useGigsApi';
import { useGigsInfiniteQuery } from '../../hooks/useGigsInfiniteQuery';
import { useViewPreference } from '../../hooks/useViewPreference';
import { useToast } from '../ui/Toast';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ContentTransition } from '../ui/LoadingWrapper';
import { SearchInput } from '../search/SearchInput';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterChipsBar } from '../filters/FilterChip';
import { GigsList, GigsGrid } from '../gigs/GigsList';
import { GigsListInfinite, GigsGridInfinite } from '../gigs/GigsListInfinite';
import { ViewToggle } from '../ui/ViewToggle';
import { Pagination } from '../ui/Pagination';
import { SortControls, CompactSortControls } from '../ui/SortControls';
// import { InstallButton } from '../pwa-install-prompt';
// import { useOnlineStatus } from '../offline-detector';

export function SearchPage() {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [useInfiniteScrollMode, setUseInfiniteScrollMode] = useState(true);
  const { addToast } = useToast();
  const isOnline = true; // useOnlineStatus();
  const { view, setView, isLoaded } = useViewPreference();
  
  // Search and filter state - MUST be called before any conditional returns
  const {
    filters,
    updateFilters,
    updatePage,
    resetFilters,
    removeFilter,
    activeFilters,
    hasActiveFilters,
    apiParams,
  } = useSearchFilters();

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
  const handleToggleSort = (newSortBy: 'date' | 'name' | 'venue') => {
    if (newSortBy === filters.sortBy) {
      // Toggle sort order
      updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      // Change sort field and reset to ascending
      updateFilters({ sortBy: newSortBy, sortOrder: 'asc' });
    }
  };

  // Handle date filter changes
  const handleDateFilterChange = (dateFilter: string) => {
    updateFilters({ dateFilter: dateFilter as any });
  };
  
  // USE APPROPRIATE DATA SOURCE BASED ON MODE
  const gigs = useInfiniteScrollMode ? infiniteGigs : clientGigs;
  const loading = useInfiniteScrollMode ? infiniteLoading : clientLoading;  
  const error = useInfiniteScrollMode ? infiniteError : clientError;
  
  console.log('RENDER: gigs.length =', gigs.length, 'loading =', loading, 'hasMounted =', hasMounted, 'infiniteMode =', useInfiniteScrollMode);
  
  // Show skeleton until hydrated and data loaded
  // For infinite scroll mode, rely on React Query loading state
  // For pagination mode, wait for hydration + client fetch
  const isLoading = useInfiniteScrollMode ? 
    Boolean(loading) : 
    (Boolean(loading) || !hasMounted);


  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col space-y-4">
              {/* Title */}
              <div className="text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      Discover Live Music
                    </h1>
                    <p className="mt-2 text-gray-600">
                      Find gigs, concerts, and festivals near you
                      {!isOnline && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Offline Mode
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end">
                    {/* <InstallButton className="btn-secondary text-sm" /> */}
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div className="max-w-2xl mx-auto w-full sm:mx-0">
                <SearchInput
                  value={filters.q}
                  onChange={(q) => updateFilters({ q })}
                  placeholder="Search for artists, venues, or events..."
                />
              </div>

              {/* Active filters */}
              {hasActiveFilters && (
                <FilterChipsBar
                  filters={activeFilters}
                  onRemoveFilter={removeFilter}
                  onClearAll={resetFilters}
                  className="justify-center sm:justify-start"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-32">
              <FilterPanel
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Mobile filter button and sort controls */}
            <div className="flex flex-col gap-4 mb-6 lg:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <FilterPanel
                  filters={filters}
                  onChange={updateFilters}
                  onReset={resetFilters}
                  isMobile
                  isOpen={isMobileFiltersOpen}
                  onToggle={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                />
                
                <CompactSortControls
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onToggleSort={handleToggleSort}
                  dateFilter={filters.dateFilter}
                  onDateFilterChange={handleDateFilterChange}
                  className="sm:w-48"
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
                  <div className="flex items-center space-x-2">
                    <ViewToggle
                      currentView={view}
                      onViewChange={setView}
                    />
                    <button
                      onClick={() => setUseInfiniteScrollMode(!useInfiniteScrollMode)}
                      className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      title={useInfiniteScrollMode ? 'Switch to pagination' : 'Switch to infinite scroll'}
                    >
                      {useInfiniteScrollMode ? 'INF' : 'PAGE'}
                    </button>
                  </div>
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
                    : error
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

            {/* Results with skeleton loading to prevent layout shifts */}
            <ErrorBoundary>
              {loading ? (
                // Show skeleton during loading to prevent layout shift
                view === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="card p-6 space-y-4">
                        <div className="animate-pulse bg-gray-200 h-6 w-3/4 rounded"></div>
                        <div className="animate-pulse bg-gray-200 h-5 w-1/2 rounded"></div>
                        <div className="flex justify-between items-center">
                          <div className="animate-pulse bg-gray-200 h-4 w-1/3 rounded"></div>
                          <div className="animate-pulse bg-gray-200 h-4 w-1/4 rounded"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
                          <div className="animate-pulse bg-gray-200 h-4 w-2/3 rounded"></div>
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
                            <div className="animate-pulse bg-gray-200 h-6 w-2/3 rounded"></div>
                            <div className="animate-pulse bg-gray-200 h-5 w-1/2 rounded"></div>
                          </div>
                          <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                        </div>
                        <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <ContentTransition transitionKey={`${view}-data`}>
                  {useInfiniteScrollMode ? (
                    // Infinite scroll versions
                    view === 'grid' ? (
                      <GigsGridInfinite
                        gigs={gigs}
                        loading={false}
                        showCount={false}
                        hasMore={hasNextPage}
                        fetchMore={fetchNextPage}
                        totalCount={totalCount}
                        emptyMessage={hasActiveFilters ? 
                          "No gigs match your current filters. Try adjusting your search criteria." : 
                          "No gigs available at the moment. Check back later!"
                        }
                      />
                    ) : (
                      <GigsListInfinite
                        gigs={gigs}
                        loading={false}
                        variant="list"
                        showCount={false}
                        hasMore={hasNextPage}
                        fetchMore={fetchNextPage}
                        totalCount={totalCount}
                        emptyMessage={hasActiveFilters ? 
                          "No gigs match your current filters. Try adjusting your search criteria." : 
                          "No gigs available at the moment. Check back later!"
                        }
                      />
                    )
                  ) : (
                    // Traditional pagination versions
                    view === 'grid' ? (
                      <GigsGrid
                        gigs={gigs}
                        loading={false}
                        showCount={false}
                        emptyMessage={hasActiveFilters ? 
                          "No gigs match your current filters. Try adjusting your search criteria." : 
                          "No gigs available at the moment. Check back later!"
                        }
                      />
                    ) : (
                      <GigsList
                        gigs={gigs}
                        loading={false}
                        variant="list"
                        showCount={false}
                        emptyMessage={hasActiveFilters ? 
                          "No gigs match your current filters. Try adjusting your search criteria." : 
                          "No gigs available at the moment. Check back later!"
                        }
                      />
                    )
                  )}
                </ContentTransition>
              )}
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

