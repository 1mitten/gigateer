import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = "" }: LoadingSkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function GigCardSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="h-6 w-3/4" />
          <LoadingSkeleton className="h-4 w-1/2" />
        </div>
        <LoadingSkeleton className="h-6 w-20" />
      </div>
      
      <div className="space-y-2">
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-2/3" />
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <LoadingSkeleton className="h-4 w-24" />
        <div className="flex space-x-2">
          <LoadingSkeleton className="h-8 w-16" />
          <LoadingSkeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function GigListItemSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Title */}
        <div className="col-span-4">
          <LoadingSkeleton className="h-4 w-3/4" />
        </div>
        
        {/* Date */}
        <div className="col-span-2">
          <LoadingSkeleton className="h-4 w-20" />
        </div>
        
        {/* Time */}
        <div className="col-span-1">
          <LoadingSkeleton className="h-4 w-16" />
        </div>
        
        {/* Venue */}
        <div className="col-span-3">
          <LoadingSkeleton className="h-4 w-24" />
        </div>
        
        {/* Status badge */}
        <div className="col-span-1 flex justify-center">
          <LoadingSkeleton className="h-5 w-16" />
        </div>
        
        {/* Action buttons */}
        <div className="col-span-1 flex justify-end">
          <LoadingSkeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

export function FiltersPanelSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <LoadingSkeleton className="h-5 w-16 mb-2" />
        <LoadingSkeleton className="h-10 w-full" />
      </div>
      
      <div>
        <LoadingSkeleton className="h-5 w-12 mb-2" />
        <LoadingSkeleton className="h-10 w-full" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <LoadingSkeleton className="h-5 w-16 mb-2" />
          <LoadingSkeleton className="h-10 w-full" />
        </div>
        <div>
          <LoadingSkeleton className="h-5 w-12 mb-2" />
          <LoadingSkeleton className="h-10 w-full" />
        </div>
      </div>
      
      <div>
        <LoadingSkeleton className="h-5 w-14 mb-2" />
        <LoadingSkeleton className="h-10 w-full" />
      </div>
      
      <div>
        <LoadingSkeleton className="h-5 w-12 mb-2" />
        <LoadingSkeleton className="h-10 w-full" />
      </div>
    </div>
  );
}