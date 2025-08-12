/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GigsListInfinite, GigsGridInfinite } from '../gigs/GigsListInfinite';
import type { Gig } from '@gigateer/contracts';

// Mock the infinite scroll wrapper to avoid IntersectionObserver issues in tests
vi.mock('../ui/InfiniteScrollWrapper', () => ({
  InfiniteScrollWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="infinite-scroll-wrapper">{children}</div>,
  InfiniteScrollGridWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="infinite-scroll-grid-wrapper">{children}</div>
}));

describe('GigsListInfinite', () => {
  // Mock data based on the actual Fleece Bristol events that were causing date grouping issues
  const mockGigs: Gig[] = [
    {
      id: 'the-fleece-thumpasaurus-2025-08-12t060000000z-bristol',
      source: 'bristol-fleece',
      sourceId: 'bristol-fleece-0',
      title: 'Thumpasaurus',
      artists: ['Thumpasaurus'],
      dateStart: '2025-08-12T06:00:00.000Z', // Tuesday Aug 12, 07:00 BST
      venue: {
        name: 'The Fleece',
        address: '12 St Thomas Street',
        city: 'Bristol',
        country: 'UK'
      },
      status: 'scheduled',
      updatedAt: '2025-08-12T19:31:08.338Z',
      eventUrl: 'https://thefleece.co.uk/whats-on/gigs/thumpasaurus/'
    },
    {
      id: 'test-gaws-bludud-losing-dogs-2025-08-13t190000000z-bristol',
      source: 'bristol-fleece',
      sourceId: 'bristol-fleece-test',
      title: 'Gaws + Bludud + Losing Dogs',
      artists: ['Gaws', 'Bludud', 'Losing Dogs'],
      dateStart: '2025-08-13T19:00:00.000Z', // Wednesday Aug 13, 20:00 BST
      venue: {
        name: 'The Fleece',
        address: '12 St Thomas Street',
        city: 'Bristol',
        country: 'UK'
      },
      status: 'scheduled',
      updatedAt: '2025-08-12T19:31:08.340Z',
      eventUrl: 'https://thefleece.co.uk/whats-on/gigs/gaws-bludud-losing-dogs/'
    },
    {
      id: 'the-fleece-the-cosmin-project-support-2025-08-14t180000000z-bristol',
      source: 'bristol-fleece',
      sourceId: 'bristol-fleece-1',
      title: 'The Cosmin Project & Support',
      artists: ['The Cosmin Project & Support'],
      dateStart: '2025-08-14T18:00:00.000Z', // Thursday Aug 14, 19:00 BST
      venue: {
        name: 'The Fleece',
        address: '12 St Thomas Street',
        city: 'Bristol',
        country: 'UK'
      },
      status: 'scheduled',
      updatedAt: '2025-08-12T19:31:08.339Z',
      eventUrl: 'https://thefleece.co.uk/whats-on/local/the-cosmin-project-support/'
    }
  ];

  describe('Date Grouping Display', () => {
    it('should display events under correct date dividers in grid view', () => {
      render(
        <GigsGridInfinite 
          gigs={mockGigs}
        />
      );

      // Check that all three date dividers are present
      expect(screen.getByText('Tue 12th August 2025')).toBeInTheDocument();
      expect(screen.getByText('Wed 13th August 2025')).toBeInTheDocument();
      expect(screen.getByText('Thu 14th August 2025')).toBeInTheDocument();

      // Check that Thumpasaurus appears under Tuesday 12th August
      const tue12Section = screen.getByText('Tue 12th August 2025').closest('[data-testid="date-group"]');
      expect(tue12Section).toBeInTheDocument();
      if (tue12Section) {
        expect(within(tue12Section).getByText('Thumpasaurus')).toBeInTheDocument();
        expect(within(tue12Section).queryByText('Gaws + Bludud + Losing Dogs')).not.toBeInTheDocument();
        expect(within(tue12Section).queryByText('The Cosmin Project & Support')).not.toBeInTheDocument();
      }

      // Check that Gaws + Bludud + Losing Dogs appears under Wednesday 13th August
      const wed13Section = screen.getByText('Wed 13th August 2025').closest('[data-testid="date-group"]');
      expect(wed13Section).toBeInTheDocument();
      if (wed13Section) {
        expect(within(wed13Section).getByText('Gaws + Bludud + Losing Dogs')).toBeInTheDocument();
        expect(within(wed13Section).queryByText('Thumpasaurus')).not.toBeInTheDocument();
        expect(within(wed13Section).queryByText('The Cosmin Project & Support')).not.toBeInTheDocument();
      }

      // Check that The Cosmin Project & Support appears under Thursday 14th August
      const thu14Section = screen.getByText('Thu 14th August 2025').closest('[data-testid="date-group"]');
      expect(thu14Section).toBeInTheDocument();
      if (thu14Section) {
        expect(within(thu14Section).getByText('The Cosmin Project & Support')).toBeInTheDocument();
        expect(within(thu14Section).queryByText('Thumpasaurus')).not.toBeInTheDocument();
        expect(within(thu14Section).queryByText('Gaws + Bludud + Losing Dogs')).not.toBeInTheDocument();
      }
    });

    it('should not display duplicate events across multiple date sections', () => {
      // Create test data with potential duplicates (same ID but different sourceId/dates)
      const gigsWithDuplicates: Gig[] = [
        ...mockGigs,
        {
          ...mockGigs[2], // Duplicate of Cosmin Project
          sourceId: 'bristol-fleece-1-duplicate',
          dateStart: '2025-08-14T11:00:00.000Z', // Different time but same date
          updatedAt: '2025-08-12T19:30:00.000Z' // Older timestamp
        }
      ];

      render(
        <GigsGridInfinite 
          gigs={gigsWithDuplicates}
        />
      );

      // Should only display one instance of "The Cosmin Project & Support"
      const cosminElements = screen.getAllByText('The Cosmin Project & Support');
      expect(cosminElements).toHaveLength(1);

      // Should still have all three date sections
      expect(screen.getByText('Tue 12th August 2025')).toBeInTheDocument();
      expect(screen.getByText('Wed 13th August 2025')).toBeInTheDocument(); 
      expect(screen.getByText('Thu 14th August 2025')).toBeInTheDocument();
    });

    it('should preserve API sort order when preserveOrder is true', () => {
      // Provide gigs in specific order
      const orderedGigs = [mockGigs[2], mockGigs[0], mockGigs[1]]; // Thu, Tue, Wed

      render(
        <GigsGridInfinite 
          gigs={orderedGigs}
        />
      );

      // Get all date dividers in DOM order
      const dateDividers = screen.getAllByTestId('date-divider');
      
      // Should preserve the order of appearance since preserveOrder=true
      expect(dateDividers[0]).toHaveTextContent('Thu 14th August 2025'); // First appearance
      expect(dateDividers[1]).toHaveTextContent('Tue 12th August 2025'); // Second appearance  
      expect(dateDividers[2]).toHaveTextContent('Wed 13th August 2025'); // Third appearance
    });

    it('should handle events with timezone edge cases correctly', () => {
      // Test events that might cross midnight due to timezone conversion
      const timezoneEdgeCases: Gig[] = [
        {
          ...mockGigs[0],
          id: 'late-night-event',
          title: 'Late Night Event',
          dateStart: '2025-08-12T23:30:00.000Z', // 23:30 UTC = 00:30 BST (next day)
        },
        {
          ...mockGigs[0], 
          id: 'early-morning-event',
          title: 'Early Morning Event',
          dateStart: '2025-08-13T01:00:00.000Z', // 01:00 UTC = 02:00 BST (same day as above)
        }
      ];

      render(
        <GigsGridInfinite 
          gigs={timezoneEdgeCases}
        />
      );

      // Both events should appear under the same local date (Aug 13th)
      const aug13Section = screen.getByText('Wed 13th August 2025').closest('[data-testid="date-group"]');
      expect(aug13Section).toBeInTheDocument();
      
      if (aug13Section) {
        expect(within(aug13Section).getByText('Late Night Event')).toBeInTheDocument();
        expect(within(aug13Section).getByText('Early Morning Event')).toBeInTheDocument();
      }
    });

    it('should display event information correctly', () => {
      render(
        <GigsGridInfinite 
          gigs={mockGigs}
        />
      );

      // All events should display their titles
      expect(screen.getByText('Thumpasaurus')).toBeInTheDocument();
      expect(screen.getByText('Gaws + Bludud + Losing Dogs')).toBeInTheDocument();
      expect(screen.getByText('The Cosmin Project & Support')).toBeInTheDocument();

      // Should show Bristol as location
      const cityElements = screen.getAllByText(/Bristol/);
      expect(cityElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle loading state correctly', () => {
      render(
        <GigsListInfinite 
          gigs={[]}
          loading={true}
          variant="default"
        />
      );

      // Should show results count of 0 when loading with no gigs
      expect(screen.getByText((content, node) => {
        const hasText = (node) => node.textContent === 'Showing 0 gigs';
        const nodeHasText = hasText(node);
        const childrenDontHaveText = Array.from(node?.children || []).every(
          (child) => !hasText(child)
        );
        return nodeHasText && childrenDontHaveText;
      })).toBeInTheDocument();
    });

    it('should display empty message when no gigs are provided', () => {
      render(
        <GigsListInfinite 
          gigs={[]}
          loading={false}
          variant="default"
          emptyMessage="No events found"
        />
      );

      expect(screen.getByText('No events found')).toBeInTheDocument();
    });
  });

  describe('Event Details Display', () => {
    it('should display correct event titles', () => {
      render(
        <GigsListInfinite 
          gigs={mockGigs}
          variant="default"
        />
      );

      expect(screen.getByText('Thumpasaurus')).toBeInTheDocument();
      expect(screen.getByText('Gaws + Bludud + Losing Dogs')).toBeInTheDocument();
      expect(screen.getByText('The Cosmin Project & Support')).toBeInTheDocument();
    });

    it('should display event links correctly', () => {
      render(
        <GigsListInfinite 
          gigs={mockGigs}
          variant="default"
        />
      );

      // Check that event titles are linked
      const thumpasaurusLink = screen.getByRole('link', { name: /Thumpasaurus/i });
      expect(thumpasaurusLink).toHaveAttribute('href', expect.stringContaining('thumpasaurus'));

      const cosminLink = screen.getByRole('link', { name: /The Cosmin Project/i });
      expect(cosminLink).toHaveAttribute('href', expect.stringContaining('cosmin-project'));
    });

    it('should display artist information correctly', () => {
      render(
        <GigsListInfinite 
          gigs={mockGigs}
          variant="default"
        />
      );

      // Should display single artist for Thumpasaurus
      expect(screen.getByText('Thumpasaurus')).toBeInTheDocument();

      // Should display multiple artists for Gaws event
      const gawsCard = screen.getByText('Gaws + Bludud + Losing Dogs').closest('[data-testid="gig-card"]');
      expect(gawsCard).toBeInTheDocument();
    });
  });

  describe('Different Variants', () => {
    it('should render compact variant correctly', () => {
      render(
        <GigsListInfinite 
          gigs={mockGigs}
          variant="compact"
        />
      );

      // Should display all event titles (without date grouping)
      expect(screen.getAllByText('Thumpasaurus').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Gaws + Bludud + Losing Dogs').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('The Cosmin Project & Support').length).toBeGreaterThanOrEqual(1);
      
      // Should show count
      expect(screen.getByText((content, node) => {
        const hasText = (node) => node.textContent === 'Showing 3 gigs';
        const nodeHasText = hasText(node);
        const childrenDontHaveText = Array.from(node?.children || []).every(
          (child) => !hasText(child)
        );
        return nodeHasText && childrenDontHaveText;
      })).toBeInTheDocument();
    });

    it('should render list variant correctly', () => {
      render(
        <GigsListInfinite 
          gigs={mockGigs}
          variant="list"
        />
      );

      // Should display all event titles (without date grouping)
      expect(screen.getAllByText('Thumpasaurus').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Gaws + Bludud + Losing Dogs').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('The Cosmin Project & Support').length).toBeGreaterThanOrEqual(1);
      
      // Should show count
      expect(screen.getByText((content, node) => {
        const hasText = (node) => node.textContent === 'Showing 3 gigs';
        const nodeHasText = hasText(node);
        const childrenDontHaveText = Array.from(node?.children || []).every(
          (child) => !hasText(child)
        );
        return nodeHasText && childrenDontHaveText;
      })).toBeInTheDocument();
    });
  });
});