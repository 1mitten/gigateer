'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterValues {
  city: string;
  tags: string;
  venue: string;
  dateFrom: string;
  dateTo: string;
  q: string;
  page: number;
  limit: number;
}

const DEFAULT_FILTERS: FilterValues = {
  city: '',
  tags: '',
  venue: '',
  dateFrom: '',
  dateTo: '',
  q: '',
  page: 1,
  limit: 20,
};

export function useSearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterValues>(() => {
    const initialFilters = { ...DEFAULT_FILTERS };
    
    // Parse URL params
    initialFilters.city = searchParams.get('city') || '';
    initialFilters.tags = searchParams.get('tags') || '';
    initialFilters.venue = searchParams.get('venue') || '';
    initialFilters.dateFrom = searchParams.get('dateFrom') || '';
    initialFilters.dateTo = searchParams.get('dateTo') || '';
    initialFilters.q = searchParams.get('q') || '';
    initialFilters.page = parseInt(searchParams.get('page') || '1', 10);
    initialFilters.limit = parseInt(searchParams.get('limit') || '20', 10);
    
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
      } else if (key === 'q') {
        // For search query, only add if 3+ characters or empty
        if (value && (value.toString().length >= 3 || value.toString().length === 0)) {
          params.set(key, value.toString());
        }
      } else if (value) {
        params.set(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    const newPath = queryString ? `/?${queryString}` : '/';
    
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
  }, [router]);

  // Update filters and URL
  const updateFilters = useCallback((updates: Partial<FilterValues>, immediate = false) => {
    const newFilters = { ...filters, ...updates };
    
    // Reset page when changing search/filters (except when explicitly updating page)
    if (!updates.hasOwnProperty('page')) {
      newFilters.page = 1;
    }
    
    setFilters(newFilters);
    
    // Determine if this should be immediate (non-text inputs like dates, page changes)
    const shouldBeImmediate = immediate || 
      updates.hasOwnProperty('page') || 
      updates.hasOwnProperty('dateFrom') || 
      updates.hasOwnProperty('dateTo');
    
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
    if (filters.dateFrom) {
      active.push({ key: 'dateFrom', label: 'From', value: filters.dateFrom });
    }
    if (filters.dateTo) {
      active.push({ key: 'dateTo', label: 'Until', value: filters.dateTo });
    }
    if (filters.q) {
      active.push({ key: 'q', label: 'Search', value: filters.q });
    }
    
    return active;
  }, [filters]);

  // Remove specific filter
  const removeFilter = useCallback((key: string) => {
    updateFilters({ [key]: '' });
  }, [updateFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'page' || key === 'limit') return false;
      return Boolean(value);
    });
  }, [filters]);

  // Get API query params
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        // For search query, only include if 3+ characters or empty
        if (key === 'q') {
          if (value.toString().length >= 3 || value.toString().length === 0) {
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