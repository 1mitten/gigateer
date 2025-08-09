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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          {/* Title and status */}
          <div className="flex items-start justify-between">
            <LoadingSkeleton className="h-5 w-3/4" />
            <LoadingSkeleton className="h-6 w-20" />
          </div>
          
          {/* Date, time, venue line */}
          <div className="flex items-center space-x-4">
            <LoadingSkeleton className="h-4 w-20" />
            <LoadingSkeleton className="h-4 w-16" />
            <LoadingSkeleton className="h-4 w-32" />
          </div>
          
          {/* Tags */}
          <div className="flex items-center space-x-2">
            <LoadingSkeleton className="h-6 w-16" />
            <LoadingSkeleton className="h-6 w-20" />
            <LoadingSkeleton className="h-6 w-18" />
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="ml-4 flex items-center space-x-2 flex-shrink-0">
          <LoadingSkeleton className="h-8 w-16" />
          <LoadingSkeleton className="h-8 w-20" />
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