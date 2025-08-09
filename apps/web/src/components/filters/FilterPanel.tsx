'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FilterValues {
  city: string;
  genre: string;
  venue: string;
  dateFrom: string;
  dateTo: string;
}

interface FilterPanelProps {
  filters: FilterValues;
  onChange: (filters: Partial<FilterValues>) => void;
  onReset: () => void;
  className?: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function FilterPanel({ 
  filters, 
  onChange, 
  onReset, 
  className = "",
  isMobile = false,
  isOpen = true,
  onToggle
}: FilterPanelProps) {
  const hasActiveFilters = Object.values(filters).some(value => value);

  const handleInputChange = (key: keyof FilterValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    onChange({ [key]: e.target.value });
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
          City
        </label>
        <input
          type="text"
          id="city"
          value={filters.city}
          onChange={handleInputChange('city')}
          placeholder="e.g., London, Manchester"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
      </div>

      <div>
        <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-2">
          Genre
        </label>
        <input
          type="text"
          id="genre"
          value={filters.genre}
          onChange={handleInputChange('genre')}
          placeholder="e.g., Rock, Jazz, Electronic"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">
            From Date
          </label>
          <input
            type="date"
            id="date-from"
            value={filters.dateFrom}
            onChange={handleInputChange('dateFrom')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">
            To Date
          </label>
          <input
            type="date"
            id="date-to"
            value={filters.dateTo}
            onChange={handleInputChange('dateTo')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
          Venue
        </label>
        <input
          type="text"
          id="venue"
          value={filters.venue}
          onChange={handleInputChange('venue')}
          placeholder="e.g., O2 Arena, Royal Albert Hall"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="w-full btn-secondary text-sm"
        >
          Reset Filters
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile filter trigger button */}
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full justify-center relative"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary-600 rounded-full" />
          )}
        </button>

        {/* Mobile filter modal/drawer */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40" 
              onClick={onToggle}
            />
            
            {/* Modal */}
            <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-xl p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button
                  type="button"
                  onClick={onToggle}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <FilterContent />
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop version
  return (
    <div className={`card p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <FunnelIcon className="h-5 w-5" />
        Filters
      </h2>
      
      <FilterContent />
    </div>
  );
}