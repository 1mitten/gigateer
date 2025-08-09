'use client';

import { useState, useEffect, useCallback } from 'react';
import { GigsResponse, GigDetailResponse, ErrorResponse } from '../types/api';
import { Gig } from '@gigateer/contracts';

interface UseGigsApiState {
  data: Gig[];
  pagination: GigsResponse['pagination'] | null;
  meta: GigsResponse['meta'] | null;
  loading: boolean;
  error: string | null;
}

export function useGigsApi(params: Record<string, string>) {
  const [state, setState] = useState<UseGigsApiState>({
    data: [],
    pagination: null,
    meta: null,
    loading: true,
    error: null,
  });

  const fetchGigs = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryParams = new URLSearchParams();
      
      // Add non-empty params
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          queryParams.set(key, value);
        }
      });

      const url = `/api/gigs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to fetch gigs');
      }

      const result: GigsResponse = await response.json();
      
      setState({
        data: result.data,
        pagination: result.pagination,
        meta: result.meta,
        loading: false,
        error: null,
      });
      
    } catch (error) {
      console.error('Error fetching gigs:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }));
    }
  }, [params]);

  // Fetch data when params change
  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  return {
    ...state,
    refetch: fetchGigs,
  };
}

interface UseGigDetailState {
  data: Gig | null;
  loading: boolean;
  error: string | null;
}

export function useGigDetail(id: string) {
  const [state, setState] = useState<UseGigDetailState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchGig = useCallback(async () => {
    if (!id) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/gigs/${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to fetch gig');
      }

      const result: GigDetailResponse = await response.json();
      
      setState({
        data: result.data,
        loading: false,
        error: null,
      });
      
    } catch (error) {
      console.error('Error fetching gig:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }));
    }
  }, [id]);

  useEffect(() => {
    fetchGig();
  }, [fetchGig]);

  return {
    ...state,
    refetch: fetchGig,
  };
}

// Hook for managing sort options
export function useGigSort() {
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'venue'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortGigs = useCallback((gigs: Gig[]) => {
    const sorted = [...gigs].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'venue':
          comparison = a.venue.name.localeCompare(b.venue.name);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }, [sortBy, sortOrder]);

  const toggleSort = useCallback((newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy]);

  return {
    sortBy,
    sortOrder,
    sortGigs,
    toggleSort,
  };
}