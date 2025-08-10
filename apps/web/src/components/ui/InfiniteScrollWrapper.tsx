'use client';

import React, { ReactNode } from 'react';
import { SimpleInfiniteScroll } from './SimpleInfiniteScroll';
import { Gig } from '@gigateer/contracts';
import { APP_CONFIG } from '../../config/app.config';

interface InfiniteScrollWrapperProps {
  gigs: Gig[];
  hasMore: boolean;
  loading: boolean;
  fetchMore: () => void;
  totalCount: number;
  children: ReactNode;
  className?: string;
  scrollableTarget?: string;
}

export function InfiniteScrollWrapper({
  gigs,
  hasMore,
  loading,
  fetchMore,
  totalCount,
  children,
  className = '',
  scrollableTarget, // Not used in SimpleInfiniteScroll but kept for compatibility
}: InfiniteScrollWrapperProps) {
  return (
    <SimpleInfiniteScroll
      gigs={gigs}
      hasMore={hasMore}
      loading={loading}
      fetchMore={fetchMore}
      totalCount={totalCount}
      className={className}
    >
      {children}
    </SimpleInfiniteScroll>
  );
}

// Variant for grid layouts that may need different spacing
export function InfiniteScrollGridWrapper(props: InfiniteScrollWrapperProps) {
  return (
    <InfiniteScrollWrapper
      {...props}
      className={`${props.className || ''}`}
    />
  );
}

// Variant for list layouts
export function InfiniteScrollListWrapper(props: InfiniteScrollWrapperProps) {
  return (
    <InfiniteScrollWrapper
      {...props}
      className={`${props.className || ''} space-y-1`}
    />
  );
}