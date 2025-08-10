'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DateFilterOption } from '../../utils/dateFilters';

interface FilterValues {
  city: string;
  tags: string;
  venue: string;
  dateFilter: DateFilterOption;
  dateFrom?: string;
  dateTo?: string;
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
  
  // Local state for form inputs - only applied when "Apply Filters" is clicked
  const [localValues, setLocalValues] = useState(filters);
  
  // Check if there are pending changes
  const hasChanges = JSON.stringify(localValues) !== JSON.stringify(filters);
  
  // Update local values when external filters change (but preserve user input)
  useEffect(() => {
    if (!hasChanges) {
      setLocalValues(filters);
    }
  }, [filters, hasChanges]);
  
  // Individual handlers to prevent function recreation
  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValues(prev => ({ ...prev, city: e.target.value }));
  }, []);
  
  const handleTagsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValues(prev => ({ ...prev, tags: e.target.value }));
  }, []);
  
  const handleVenueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValues(prev => ({ ...prev, venue: e.target.value }));
  }, []);
  
  // Apply filters when button is clicked
  const handleApplyFilters = useCallback(() => {
    onChange(localValues);
  }, [localValues, onChange]);
  
  // Handle Enter key press on input fields
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasChanges) {
      handleApplyFilters();
    }
  }, [hasChanges, handleApplyFilters]);
  
  
  // Reset both local and applied filters
  const handleResetFilters = useCallback(() => {
    const emptyFilters: Partial<FilterValues> = {
      city: '',
      tags: '',
      venue: ''
    };
    setLocalValues(prev => ({ ...prev, ...emptyFilters }));
    onReset();
  }, [onReset]);


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
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={localValues.city}
                    onChange={handleCityChange}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., London, Manchester"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={localValues.tags}
                    onChange={handleTagsChange}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., Rock, Jazz, Electronic"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                    Venue
                  </label>
                  <input
                    type="text"
                    id="venue"
                    value={localValues.venue}
                    onChange={handleVenueChange}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., O2 Arena, Royal Albert Hall"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>

                {/* Apply Filters Button */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    disabled={!hasChanges}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      hasChanges
                        ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Apply Filters
                  </button>
                  
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
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
      
      <div className="space-y-6">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <input
            type="text"
            id="city"
            value={localValues.city}
            onChange={handleCityChange}
            onKeyPress={handleKeyPress}
            placeholder="e.g., London, Manchester"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <input
            type="text"
            id="tags"
            value={localValues.tags}
            onChange={handleTagsChange}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Rock, Jazz, Electronic"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
            Venue
          </label>
          <input
            type="text"
            id="venue"
            value={localValues.venue}
            onChange={handleVenueChange}
            onKeyPress={handleKeyPress}
            placeholder="e.g., O2 Arena, Royal Albert Hall"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>

        {/* Apply Filters Button */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={!hasChanges}
            className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              hasChanges
                ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Apply Filters
          </button>
          
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}