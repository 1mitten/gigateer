'use client';

import React, { useState } from 'react';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { useGigsApi, useGigSort } from '../../hooks/useGigsApi';
import { useViewPreference } from '../../hooks/useViewPreference';
import { useToast } from '../ui/Toast';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ContentTransition } from '../ui/LoadingWrapper';
import { SearchInput } from '../search/SearchInput';
import { FilterPanel } from '../filters/FilterPanel';
import { FilterChipsBar } from '../filters/FilterChip';
import { GigsList, GigsGrid } from '../gigs/GigsList';
import { ViewToggle } from '../ui/ViewToggle';
import { Pagination } from '../ui/Pagination';
import { SortControls, CompactSortControls } from '../ui/SortControls';
import { InstallButton } from '../pwa-install-prompt';
import { useOnlineStatus } from '../offline-detector';

export function SearchPage() {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const { view, setView, isLoaded } = useViewPreference();
  
  // Search and filter state
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

  // API data
  const { data: gigs, pagination, loading, error, refetch } = useGigsApi(apiParams);
  
  // Sorting
  const { sortBy, sortOrder, sortGigs, toggleSort } = useGigSort();
  
  // Sort gigs on client side (API returns by date asc by default)
  const sortedGigs = React.useMemo(() => {
    return sortGigs(gigs);
  }, [gigs, sortGigs]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      addToast({
        type: 'error',
        title: 'Failed to load gigs',
        message: error,
      });
    }
  }, [error, addToast]);

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
                    <InstallButton className="btn-secondary text-sm" />
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
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onToggleSort={toggleSort}
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
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onToggleSort={toggleSort}
                />
              </div>

              <div className="flex items-center space-x-4">
                {pagination && (
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} gigs
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
                    : error
                  }
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={refetch}
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
              <ContentTransition transitionKey={view}>
                {view === 'grid' ? (
                  <GigsGrid
                    gigs={sortedGigs}
                    loading={loading}
                    showCount={false}
                    emptyMessage={hasActiveFilters ? 
                      "No gigs match your current filters. Try adjusting your search criteria." : 
                      "No gigs available at the moment. Check back later!"
                    }
                  />
                ) : (
                  <GigsList
                    gigs={sortedGigs}
                    loading={loading}
                    variant="list"
                    showCount={false}
                    emptyMessage={hasActiveFilters ? 
                      "No gigs match your current filters. Try adjusting your search criteria." : 
                      "No gigs available at the moment. Check back later!"
                    }
                  />
                )}
              </ContentTransition>
            </ErrorBoundary>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && !loading && (
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