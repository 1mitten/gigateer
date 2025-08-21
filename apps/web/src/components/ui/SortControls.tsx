'use client';

import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { DATE_FILTER_OPTIONS, DateFilterOption } from '../../utils/dateFilters';

interface SortControlsProps {
  sortBy: 'date';
  sortOrder: 'asc' | 'desc';
  onToggleSort: (sortBy: 'date') => void;
  dateFilter?: DateFilterOption;
  onDateFilterChange?: (dateFilter: DateFilterOption) => void;
  className?: string;
}

export function SortControls({ 
  sortBy, 
  sortOrder, 
  onToggleSort, 
  dateFilter = 'all',
  onDateFilterChange,
  className = "" 
}: SortControlsProps) {
  const SortButton = ({ 
    value, 
    children, 
    active 
  }: { 
    value: 'date'; 
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
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Sort Controls */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-800 font-medium mr-2">Sort by:</span>
        
        <SortButton value="date" active={sortBy === 'date'}>
          Date
        </SortButton>
      </div>

      {/* Date Filter */}
      {onDateFilterChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-800 font-medium">Date:</span>
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilterOption)}
            className="block px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            {DATE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// Compact version for mobile
export function CompactSortControls({ 
  sortBy, 
  sortOrder, 
  onToggleSort, 
  dateFilter = 'all',
  onDateFilterChange,
  className = "" 
}: SortControlsProps) {
  const getSortLabel = () => {
    const labels = { date: 'Date' };
    const orderLabel = sortOrder === 'asc' ? '↑' : '↓';
    return `${labels[sortBy]} ${orderLabel}`;
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      {/* Sort Selection */}
      <div className="relative flex-1 min-w-0">
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [newSortBy, newSortOrder] = e.target.value.split('-') as ['date', 'asc' | 'desc'];
            if (newSortOrder !== sortOrder) {
              onToggleSort(sortBy);
            }
          }}
          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
        >
          <option value="date-asc">Date (Earliest First)</option>
          <option value="date-desc">Date (Latest First)</option>
        </select>
      </div>

      {/* Date Filter */}
      {onDateFilterChange && (
        <div className="relative flex-1 min-w-0">
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilterOption)}
            className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            {DATE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}