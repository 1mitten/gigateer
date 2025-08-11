'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, value, onRemove, className = "" }: FilterChipProps) {
  return (
    <span className={`inline-flex items-center gap-x-1 rounded-md bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 ring-1 ring-inset ring-primary-700/10 ${className}`}>
      <span className="text-xs text-primary-600">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-primary-600/20 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label={`Remove ${label} filter`}
      >
        <XMarkIcon className="h-3.5 w-3.5 stroke-primary-600/50 group-hover:stroke-primary-600/75" />
      </button>
    </span>
  );
}

interface FilterChipsBarProps {
  filters: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterChipsBar({ filters, onRemoveFilter, onClearAll, className = "" }: FilterChipsBarProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Active filters:</span>
      
      {filters.map(filter => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          value={filter.value}
          onRemove={() => onRemoveFilter(filter.key)}
        />
      ))}
      
      {filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm px-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}