import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';

interface SortControlsProps {
  sortBy: 'date' | 'name' | 'venue';
  sortOrder: 'asc' | 'desc';
  onToggleSort: (sortBy: 'date' | 'name' | 'venue') => void;
  className?: string;
}

export function SortControls({ sortBy, sortOrder, onToggleSort, className = "" }: SortControlsProps) {
  const SortButton = ({ 
    value, 
    children, 
    active 
  }: { 
    value: 'date' | 'name' | 'venue'; 
    children: React.ReactNode; 
    active: boolean; 
  }) => (
    <button
      type="button"
      onClick={() => onToggleSort(value)}
      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
        active
          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
      {active && (
        sortOrder === 'asc' ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )
      )}
    </button>
  );

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm text-gray-600 mr-2">Sort by:</span>
      
      <SortButton value="date" active={sortBy === 'date'}>
        Date
      </SortButton>
      
      <SortButton value="name" active={sortBy === 'name'}>
        Event
      </SortButton>
      
      <SortButton value="venue" active={sortBy === 'venue'}>
        Venue
      </SortButton>
    </div>
  );
}

// Compact version for mobile
export function CompactSortControls({ sortBy, sortOrder, onToggleSort, className = "" }: SortControlsProps) {
  const getSortLabel = () => {
    const labels = { date: 'Date', name: 'Event', venue: 'Venue' };
    const orderLabel = sortOrder === 'asc' ? '↑' : '↓';
    return `${labels[sortBy]} ${orderLabel}`;
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={`${sortBy}-${sortOrder}`}
        onChange={(e) => {
          const [newSortBy, newSortOrder] = e.target.value.split('-') as ['date' | 'name' | 'venue', 'asc' | 'desc'];
          if (newSortBy !== sortBy) {
            onToggleSort(newSortBy);
          } else if (newSortOrder !== sortOrder) {
            onToggleSort(sortBy);
          }
        }}
        className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
      >
        <option value="date-asc">Date (Earliest First)</option>
        <option value="date-desc">Date (Latest First)</option>
        <option value="name-asc">Event (A-Z)</option>
        <option value="name-desc">Event (Z-A)</option>
        <option value="venue-asc">Venue (A-Z)</option>
        <option value="venue-desc">Venue (Z-A)</option>
      </select>
    </div>
  );
}