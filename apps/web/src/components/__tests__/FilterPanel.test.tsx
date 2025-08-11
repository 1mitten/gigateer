import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '../filters/FilterPanel';

const mockFilters = {
  city: '',
  tags: '',
  venue: '',
  dateFilter: 'all' as const
};

const mockOnChange = vi.fn();
const mockOnReset = vi.fn();

describe('FilterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter inputs', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onChange={mockOnChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    expect(screen.getByLabelText('Venue')).toBeInTheDocument();
  });

  it('applies filters when Apply Filters button is clicked', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onChange={mockOnChange}
        onReset={mockOnReset}
      />
    );

    const cityInput = screen.getByLabelText('City');
    fireEvent.change(cityInput, { target: { value: 'New York' } });
    
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      city: 'New York'
    }));
  });

  it('shows reset button when filters are active', () => {
    const activeFilters = {
      city: 'London',
      tags: 'rock',
      venue: '',
      dateFilter: 'all' as const
    };

    render(
      <FilterPanel
        filters={activeFilters}
        onChange={mockOnChange}
        onReset={mockOnReset}
      />
    );

    const resetButton = screen.getByText('Reset Filters');
    expect(resetButton).toBeInTheDocument();
    
    fireEvent.click(resetButton);
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('displays current filter values', () => {
    const filtersWithValues = {
      city: 'London',
      tags: 'rock',
      venue: 'O2 Arena',
      dateFilter: 'all' as const
    };

    render(
      <FilterPanel
        filters={filtersWithValues}
        onChange={mockOnChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByDisplayValue('London')).toBeInTheDocument();
    expect(screen.getByDisplayValue('rock')).toBeInTheDocument();
    expect(screen.getByDisplayValue('O2 Arena')).toBeInTheDocument();
  });
});