/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GigCard } from '../gigs/GigCard';
import type { Gig } from '@gigateer/contracts';

const mockGig: Gig = {
  id: 'test-gig-1',
  title: 'Coldplay - Music of the Spheres Tour',
  artist: 'Coldplay',
  venue: 'Madison Square Garden',
  location: 'New York, NY',
  date: '2024-03-15',
  time: '19:30',
  price: '$89.50',
  url: 'https://example.com/tickets/coldplay',
  source: 'ticketmaster',
  description: 'Experience Coldplay\'s spectacular live performance',
  genres: ['rock', 'alternative'],
  tags: ['popular', 'stadium-tour'],
  sourceUpdated: '2024-01-01T12:00:00.000Z',
  lastModified: '2024-01-01T12:00:00.000Z'
};

describe('GigCard', () => {
  it('renders gig information correctly', () => {
    render(<GigCard gig={mockGig} />);
    
    expect(screen.getByText('Coldplay - Music of the Spheres Tour')).toBeInTheDocument();
    expect(screen.getByText('Coldplay')).toBeInTheDocument();
    expect(screen.getByText('Madison Square Garden')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
    expect(screen.getByText('$89.50')).toBeInTheDocument();
  });

  it('displays date and time formatted correctly', () => {
    render(<GigCard gig={mockGig} />);
    
    // Should display formatted date
    expect(screen.getByText(/Mar 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/7:30 PM/)).toBeInTheDocument();
  });

  it('shows genres as badges', () => {
    render(<GigCard gig={mockGig} />);
    
    expect(screen.getByText('rock')).toBeInTheDocument();
    expect(screen.getByText('alternative')).toBeInTheDocument();
  });

  it('renders ticket link with correct URL', () => {
    render(<GigCard gig={mockGig} />);
    
    const ticketLink = screen.getByText('Get Tickets');
    expect(ticketLink).toBeInTheDocument();
    expect(ticketLink.closest('a')).toHaveAttribute('href', mockGig.url);
    expect(ticketLink.closest('a')).toHaveAttribute('target', '_blank');
    expect(ticketLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('handles missing optional fields gracefully', () => {
    const minimalGig: Gig = {
      id: 'minimal-gig',
      title: 'Simple Concert',
      artist: 'Unknown Artist',
      venue: 'Local Venue',
      location: 'Somewhere',
      date: '2024-03-15',
      url: 'https://example.com/tickets',
      source: 'manual',
      sourceUpdated: '2024-01-01T12:00:00.000Z',
      lastModified: '2024-01-01T12:00:00.000Z'
    };

    render(<GigCard gig={minimalGig} />);
    
    expect(screen.getByText('Simple Concert')).toBeInTheDocument();
    expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    expect(screen.getByText('Local Venue')).toBeInTheDocument();
    expect(screen.queryByText('$')).not.toBeInTheDocument(); // No price
  });

  it('shows source attribution', () => {
    render(<GigCard gig={mockGig} />);
    
    expect(screen.getByText('ticketmaster')).toBeInTheDocument();
  });
});