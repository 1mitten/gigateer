/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { SearchPage } from '../pages/SearchPage';
import { ToastProvider } from '../ui/Toast';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
};

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (global.fetch as jest.Mock).mockClear();
  mockRouter.replace.mockClear();
  mockRouter.push.mockClear();
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('SearchPage', () => {
  it('renders the main search interface', () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        meta: { filters: {} }
      }),
    });

    renderWithProviders(<SearchPage />);
    
    expect(screen.getByText('Discover Live Music')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search for artists/i)).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('handles search input with debouncing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        meta: { filters: {} }
      }),
    });

    renderWithProviders(<SearchPage />);
    
    const searchInput = screen.getByPlaceholderText(/search for artists/i);
    
    fireEvent.change(searchInput, { target: { value: 'coldplay' } });
    
    // Should debounce the search
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('displays empty state when no gigs found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        meta: { filters: {} }
      }),
    });

    renderWithProviders(<SearchPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No Gigs Found')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<SearchPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Unable to Load Gigs')).toBeInTheDocument();
    });
  });
});