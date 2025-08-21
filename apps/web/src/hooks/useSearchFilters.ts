'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import { DateFilterOption, getDateRangeForFilter, formatDateRangeForUrl, getDateFilterFromRange } from '../utils/dateFilters';
import { APP_CONFIG } from '../config/app.config';

interface FilterValues {
  city: string;
  tags: string;
  venue: string;
  dateFilter: DateFilterOption;
  dateFrom: string;
  dateTo: string;
  q: string;
  page: number;
  limit: number;
  sortBy: 'date';
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: FilterValues = {
  city: '',
  tags: '',
  venue: '',
  dateFilter: APP_CONFIG.dateFilters.DEFAULT_FILTER,
  dateFrom: '',
  dateTo: '',
  q: '',
  page: APP_CONFIG.pagination.FIRST_PAGE,
  limit: APP_CONFIG.pagination.DEFAULT_LIMIT,
  sortBy: 'date',
  sortOrder: 'asc',
};

export function useSearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterValues>(() => {
    const initialFilters = { ...DEFAULT_FILTERS };
    
    // Parse URL params
    initialFilters.city = searchParams.get('city') || '';
    initialFilters.tags = searchParams.get('tags') || '';
    initialFilters.venue = searchParams.get('venue') || '';
    
    // Handle date filter - check for dateFilter param first, then fall back to dateFrom/dateTo
    const dateFilterParam = searchParams.get('dateFilter') as DateFilterOption;
    const dateFromParam = searchParams.get('dateFrom') || '';
    const dateToParam = searchParams.get('dateTo') || '';
    
    if (dateFilterParam && APP_CONFIG.dateFilters.SUPPORTED_FILTERS.includes(dateFilterParam as any)) {
      initialFilters.dateFilter = dateFilterParam;
      const { from, to } = getDateRangeForFilter(dateFilterParam);
      initialFilters.dateFrom = from;
      initialFilters.dateTo = to;
    } else if (dateFromParam || dateToParam) {
      // If we have explicit date range, try to map it to a filter option
      const mappedFilter = getDateFilterFromRange(dateFromParam, dateToParam);
      initialFilters.dateFilter = mappedFilter;
      initialFilters.dateFrom = dateFromParam;
      initialFilters.dateTo = dateToParam;
    } else {
      // Default to all dates - keep dateFilter as 'all' and let empty dates stay empty
      const { from, to } = getDateRangeForFilter('all');
      initialFilters.dateFrom = from; // This should be empty string for 'all'
      initialFilters.dateTo = to;     // This should be empty string for 'all'
    }
    
    initialFilters.q = searchParams.get('q') || '';
    initialFilters.page = parseInt(searchParams.get('page') || '1', 10);
    initialFilters.limit = parseInt(searchParams.get('limit') || '20', 10);
    
    // Initialize sort parameters - now only date is supported
    const sortBy = searchParams.get('sortBy') as 'date' | null;
    initialFilters.sortBy = 'date'; // Always use date sorting
    
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    initialFilters.sortOrder = (sortOrder && ['asc', 'desc'].includes(sortOrder)) ? sortOrder : 'asc';
    
    // TEMP DEBUG: Log initial filters
    if (process.env.NODE_ENV === 'development') {
      console.log('[useSearchFilters] Initial filters:', initialFilters);
    }
    
    return initialFilters;
  });

  // Update URL when filters change (debounced for text inputs)
  const updateURL = useCallback((newFilters: FilterValues, immediate = false) => {
    const params = new URLSearchParams();
    
    // Add non-empty filter values to URL
    Object.entries(newFilters).forEach(([key, value]) => {
      if (key === 'page') {
        // Only add page if it's not 1
        if (value > 1) {
          params.set(key, value.toString());
        }
      } else if (key === 'limit') {
        // Only add limit if it's not the default
        if (value !== DEFAULT_FILTERS.limit) {
          params.set(key, value.toString());
        }
      } else if (key === 'dateFilter') {
        // Only add dateFilter if it's not the default
        if (value && value !== APP_CONFIG.dateFilters.DEFAULT_FILTER) {
          params.set(key, value.toString());
        }
      } else if (key === 'dateFrom' || key === 'dateTo') {
        // Skip dateFrom/dateTo in URL - they're derived from dateFilter
        // We keep them in state for API calls but not in URL
      } else if (key === 'sortBy') {
        // Only add sortBy if it's not the default
        if (value && value !== DEFAULT_FILTERS.sortBy) {
          params.set(key, value.toString());
        }
      } else if (key === 'sortOrder') {
        // Only add sortOrder if it's not the default
        if (value && value !== DEFAULT_FILTERS.sortOrder) {
          params.set(key, value.toString());
        }
      } else if (key === 'q') {
        // For search query, only add if meets minimum length or empty
        if (value && (value.toString().length >= APP_CONFIG.search.MIN_QUERY_LENGTH || value.toString().length === 0)) {
          params.set(key, value.toString());
        }
      } else if (value) {
        params.set(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    const newPath = queryString ? `${pathname}?${queryString}` : pathname;
    
    const performUpdate = () => {
      // Use replace to avoid cluttering browser history
      router.replace(newPath, { scroll: false });
    };
    
    if (immediate) {
      // Clear any pending debounced update
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      performUpdate();
    } else {
      // Debounce the update for text inputs
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(performUpdate, 500);
    }
  }, [router, pathname]);

  // Update filters and URL
  const updateFilters = useCallback((updates: Partial<FilterValues>, immediate = false) => {
    let newFilters = { ...filters, ...updates };
    
    // If dateFilter is being updated, calculate the corresponding date range
    if (updates.hasOwnProperty('dateFilter') && updates.dateFilter) {
      const { from, to } = getDateRangeForFilter(updates.dateFilter);
      newFilters.dateFrom = from;
      newFilters.dateTo = to;
    }
    
    // Reset page when changing search/filters (except when explicitly updating page)
    if (!updates.hasOwnProperty('page')) {
      newFilters.page = 1;
    }
    
    setFilters(newFilters);
    
    // Determine if this should be immediate (non-text inputs like dates, page changes, sort changes)
    const shouldBeImmediate = immediate || 
      updates.hasOwnProperty('page') || 
      updates.hasOwnProperty('dateFilter') ||
      updates.hasOwnProperty('dateFrom') || 
      updates.hasOwnProperty('dateTo') ||
      updates.hasOwnProperty('sortBy') ||
      updates.hasOwnProperty('sortOrder');
    
    updateURL(newFilters, shouldBeImmediate);
  }, [filters, updateURL]);

  // Update only page (for pagination)
  const updatePage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    const resetFilters = { ...DEFAULT_FILTERS };
    setFilters(resetFilters);
    updateURL(resetFilters);
  }, [updateURL]);

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const active = [];
    
    if (filters.city) {
      active.push({ key: 'city', label: 'City', value: filters.city });
    }
    if (filters.tags) {
      active.push({ key: 'tags', label: 'Tags', value: filters.tags });
    }
    if (filters.venue) {
      active.push({ key: 'venue', label: 'Venue', value: filters.venue });
    }
    if (filters.dateFilter && filters.dateFilter !== 'all') {
      const dateLabels: Record<DateFilterOption, string> = {
        'today': 'Today',
        'tomorrow': 'Tomorrow',
        'this-week': 'This Week',
        'this-month': 'This Month',
        'all': 'All Dates'
      };
      active.push({ key: 'dateFilter', label: 'Date', value: dateLabels[filters.dateFilter] });
    }
    if (filters.q) {
      active.push({ key: 'q', label: 'Search', value: filters.q });
    }
    
    return active;
  }, [filters]);

  // Remove specific filter
  const removeFilter = useCallback((key: string) => {
    if (key === 'dateFilter') {
      // When removing date filter, set it to 'all' (show all dates)
      updateFilters({ dateFilter: 'all' });
    } else {
      updateFilters({ [key]: '' });
    }
  }, [updateFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'page' || key === 'limit' || key === 'dateFrom' || key === 'dateTo') return false;
      if (key === 'dateFilter' && value === APP_CONFIG.dateFilters.DEFAULT_FILTER) return false;
      return Boolean(value);
    });
  }, [filters]);

  // Get API query params
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') {
        // Always include sort parameters to ensure proper API behavior
        params[key] = value.toString();
      } else if (value) {
        // For search query, only include if meets minimum length or empty
        if (key === 'q') {
          if (value.toString().length >= APP_CONFIG.search.MIN_QUERY_LENGTH || value.toString().length === 0) {
            params[key] = value.toString();
          }
        } else {
          params[key] = value.toString();
        }
      }
    });
    
    return params;
  }, [filters]);

  return {
    filters,
    updateFilters,
    updatePage,
    resetFilters,
    removeFilter,
    activeFilters,
    hasActiveFilters,
    apiParams,
  };
}