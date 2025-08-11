/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import { GigCard } from '../gigs/GigCard';
import type { Gig } from '@gigateer/contracts';

const mockGig: Gig = {
  id: 'test-gig-1',
  source: 'ticketmaster',
  sourceId: 'coldplay-msg-2024',
  title: 'Coldplay - Music of the Spheres Tour',
  artists: ['Coldplay'],
  genre: ['rock', 'alternative'],
  dateStart: '2024-03-15T19:30:00Z',
  dateEnd: '2024-03-15T22:30:00Z',
  timezone: 'America/New_York',
  venue: {
    name: 'Madison Square Garden',
    address: '4 Pennsylvania Plaza',
    city: 'New York',
    country: 'USA',
    lat: 40.7505,
    lng: -73.9934,
  },
  ageRestriction: 'All ages',
  status: 'scheduled',
  ticketsUrl: 'https://example.com/tickets/coldplay',
  eventUrl: 'https://example.com/events/coldplay',
  images: ['https://example.com/coldplay.jpg'],
  updatedAt: '2024-01-01T12:00:00Z',
  hash: 'mockgighash123',
};

describe('GigCard', () => {
  afterEach(() => {
    // Clean up DOM after each test
    cleanup();
    vi.clearAllMocks();
  });

  it('renders gig information correctly', () => {
    render(<GigCard gig={mockGig} />);
    
    expect(screen.getByText('Coldplay - Music of the Spheres Tour')).toBeInTheDocument();
    // Venue name is rendered with city - check for the combined text
    expect(screen.getByText(/Madison Square Garden.*New York/)).toBeInTheDocument();
  });

  it('displays date and time formatted correctly', () => {
    render(<GigCard gig={mockGig} />);
    
    // Should display formatted date
    expect(screen.getByText(/Mar/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('shows genres as badges', () => {
    render(<GigCard gig={mockGig} />);
    
    // Genre is stored in the genre property, which the component maps to tags display
    expect(screen.getByText('rock')).toBeInTheDocument();
    expect(screen.getByText('alternative')).toBeInTheDocument();
  });

  it('renders ticket link with correct URL', () => {
    render(<GigCard gig={mockGig} />);
    
    const ticketLink = screen.getByText('Tickets');
    expect(ticketLink).toBeInTheDocument();
    expect(ticketLink.closest('a')).toHaveAttribute('href', mockGig.ticketsUrl);
    expect(ticketLink.closest('a')).toHaveAttribute('target', '_blank');
    expect(ticketLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('handles missing optional fields gracefully', () => {
    const minimalGig: Gig = {
      id: 'minimal-gig',
      source: 'manual',
      title: 'Simple Concert',
      artists: ['Unknown Artist'],
      genre: [],
      dateStart: '2024-03-15T20:00:00Z',
      venue: {
        name: 'Local Venue',
        city: 'Somewhere',
      },
      status: 'scheduled',
      ticketsUrl: 'https://example.com/tickets',
      images: [],
      updatedAt: '2024-01-01T12:00:00Z',
      hash: 'minimalhash123',
    };

    render(<GigCard gig={minimalGig} />);
    
    expect(screen.getByText('Simple Concert')).toBeInTheDocument();
    // GigCard doesn't render artist names separately, only in compact version
    expect(screen.getByText(/Local Venue.*Somewhere/)).toBeInTheDocument();
  });

  it('shows source attribution', () => {
    render(<GigCard gig={mockGig} />);
    
    // Source link should be present since mockGig has eventUrl
    expect(screen.getByText('Source')).toBeInTheDocument();
  });
});