/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '../filters/FilterPanel';

const mockFilters = {
  city: '',
  genre: '',
  venue: '',
  dateFrom: '',
  dateTo: ''
};

const mockOnChange = jest.fn();
const mockOnReset = jest.fn();

describe('FilterPanel', () => {
  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnReset.mockClear();
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
    expect(screen.getByLabelText('Genre')).toBeInTheDocument();
    expect(screen.getByLabelText('Venue')).toBeInTheDocument();
    expect(screen.getByLabelText('From Date')).toBeInTheDocument();
    expect(screen.getByLabelText('To Date')).toBeInTheDocument();
  });

  it('calls onChange when input values change', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onChange={mockOnChange}
        onReset={mockOnReset}
      />
    );

    const cityInput = screen.getByLabelText('City');
    fireEvent.change(cityInput, { target: { value: 'New York' } });

    expect(mockOnChange).toHaveBeenCalledWith({ city: 'New York' });
  });

  it('shows clear button when filters are active', () => {
    const activeFilters = {
      city: 'London',
      genre: 'rock',
      venue: '',
      dateFrom: '',
      dateTo: ''
    };

    render(
      <FilterPanel
        filters={activeFilters}
        onChange={mockOnChange}
        onReset={mockOnReset}
      />
    );

    const clearButton = screen.getByText('Clear All');
    expect(clearButton).toBeInTheDocument();
    
    fireEvent.click(clearButton);
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('displays current filter values', () => {
    const filtersWithValues = {
      city: 'London',
      genre: 'rock',
      venue: 'O2 Arena',
      dateFrom: '2024-03-01',
      dateTo: '2024-03-31'
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
    expect(screen.getByDisplayValue('2024-03-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-03-31')).toBeInTheDocument();
  });
});