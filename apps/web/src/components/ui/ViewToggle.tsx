'use client';

import React from 'react';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';

export type ViewType = 'grid' | 'list';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

export function ViewToggle({ currentView, onViewChange, className = '' }: ViewToggleProps) {
  return (
    <div className={`inline-flex rounded-lg border border-gray-200 bg-white p-1 ${className}`}>
      <button
        type="button"
        onClick={() => onViewChange('grid')}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentView === 'grid'
            ? 'bg-[#640D5F] text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <Squares2X2Icon className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      
      <button
        type="button"
        onClick={() => onViewChange('list')}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentView === 'list'
            ? 'bg-[#640D5F] text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        aria-label="List view"
        title="List view"
      >
        <ListBulletIcon className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}