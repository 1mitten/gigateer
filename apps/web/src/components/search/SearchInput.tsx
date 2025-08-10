'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Search gigs, artists, venues...",
  debounceMs = 300,
  className = "" 
}: SearchInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when external value changes
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  // Handle input changes - only update local state, don't trigger search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
  };

  // Handle search submit
  const handleSearch = () => {
    onChange(displayValue);
  };

  // Handle clear button
  const handleClear = () => {
    setDisplayValue('');
    onChange('');
    inputRef.current?.focus();
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <button
          type="button"
          onClick={handleSearch}
          className="absolute inset-y-0 left-0 pl-3 flex items-center hover:text-gray-600 focus:outline-none"
          aria-label="Search"
        >
          <MagnifyingGlassIcon 
            className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" 
          />
        </button>
        
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-500 text-gray-900 text-sm"
          aria-label="Search"
        />
        
        {displayValue && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm p-1"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}