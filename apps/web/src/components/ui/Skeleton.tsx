'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'rounded';
}

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  variant = 'rectangular' 
}: SkeletonProps) {
  const baseStyles = 'animate-fade-in bg-gray-200';
  
  const variantStyles = {
    text: 'rounded',
    rectangular: '',
    rounded: 'rounded-md'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    />
  );
}

// Gig Card Skeleton
export function GigCardSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      {/* Title */}
      <Skeleton height={24} className="w-3/4" />
      
      {/* Artist */}
      <Skeleton height={20} className="w-1/2" />
      
      {/* Date and venue */}
      <div className="flex justify-between items-center">
        <Skeleton height={16} className="w-1/3" />
        <Skeleton height={16} className="w-1/4" />
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Skeleton height={16} className="w-full" />
        <Skeleton height={16} className="w-2/3" />
      </div>
      
      {/* Tags */}
      <div className="flex gap-2">
        <Skeleton height={24} className="w-16 rounded-full" />
        <Skeleton height={24} className="w-20 rounded-full" />
        <Skeleton height={24} className="w-12 rounded-full" />
      </div>
    </div>
  );
}

// Gig List Skeleton
export function GigListSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <GigCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Gig Grid Skeleton  
export function GigGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <GigCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Date Group Skeleton
export function GigsByDateSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-4">
          {/* Date header */}
          <div className="flex items-center gap-4">
            <Skeleton height={32} className="w-32" />
            <Skeleton height={1} className="flex-1" />
          </div>
          
          {/* Gigs in this date group */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 2 }).map((_, gigIndex) => (
              <GigCardSkeleton key={gigIndex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact skeleton for smaller components
export function CompactSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          <Skeleton height={40} width={40} variant="rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} className="w-3/4" />
            <Skeleton height={14} className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}