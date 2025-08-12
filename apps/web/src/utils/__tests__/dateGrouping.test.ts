/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { groupGigsByDate } from '../dateGrouping';
import type { Gig } from '@gigateer/contracts';

describe('dateGrouping', () => {
  // Mock gigs data based on actual The Fleece Bristol events that were causing issues
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
      updatedAt: '2025-08-12T19:31:08.338Z'
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
      updatedAt: '2025-08-12T19:31:08.339Z'
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
      updatedAt: '2025-08-12T19:31:08.340Z'
    }
  ];

  describe('groupGigsByDate', () => {
    it('should group gigs correctly by their local date', () => {
      const result = groupGigsByDate(mockGigs);

      expect(result).toHaveLength(3);
      
      // Check August 12th group (Thumpasaurus)
      const aug12Group = result.find(group => group.date === '2025-08-12');
      expect(aug12Group).toBeDefined();
      expect(aug12Group?.gigs).toHaveLength(1);
      expect(aug12Group?.gigs[0].title).toBe('Thumpasaurus');
      expect(aug12Group?.dateFormatted).toBe('Tue 12th August 2025');

      // Check August 13th group (Gaws + Bludud + Losing Dogs)
      const aug13Group = result.find(group => group.date === '2025-08-13');
      expect(aug13Group).toBeDefined();
      expect(aug13Group?.gigs).toHaveLength(1);
      expect(aug13Group?.gigs[0].title).toBe('Gaws + Bludud + Losing Dogs');
      expect(aug13Group?.dateFormatted).toBe('Wed 13th August 2025');

      // Check August 14th group (The Cosmin Project & Support)
      const aug14Group = result.find(group => group.date === '2025-08-14');
      expect(aug14Group).toBeDefined();
      expect(aug14Group?.gigs).toHaveLength(1);
      expect(aug14Group?.gigs[0].title).toBe('The Cosmin Project & Support');
      expect(aug14Group?.dateFormatted).toBe('Thu 14th August 2025');
    });

    it('should remove duplicate gigs by ID', () => {
      // Create duplicate entries (simulating the original issue)
      const gigsWithDuplicates: Gig[] = [
        ...mockGigs,
        {
          ...mockGigs[1], // Duplicate of Cosmin Project
          sourceId: 'bristol-fleece-1-duplicate',
          updatedAt: '2025-08-12T19:30:00.000Z' // Older updatedAt
        },
        {
          ...mockGigs[1], // Another duplicate of Cosmin Project
          sourceId: 'bristol-fleece-1-duplicate-2',
          dateStart: '2025-08-14T11:00:00.000Z', // Different time but same ID
          updatedAt: '2025-08-12T19:25:00.000Z' // Even older updatedAt
        }
      ];

      const result = groupGigsByDate(gigsWithDuplicates);
      
      // Should still have only 3 groups
      expect(result).toHaveLength(3);
      
      // August 14th should only have 1 gig (the most recent version)
      const aug14Group = result.find(group => group.date === '2025-08-14');
      expect(aug14Group?.gigs).toHaveLength(1);
      expect(aug14Group?.gigs[0].dateStart).toBe('2025-08-14T18:00:00.000Z'); // Should keep the most recent version
    });

    it('should handle gigs with invalid dates', () => {
      const gigsWithInvalidDates: Gig[] = [
        ...mockGigs,
        {
          id: 'invalid-date-gig',
          source: 'test',
          sourceId: 'invalid-date',
          title: 'Invalid Date Event',
          artists: ['Test Artist'],
          dateStart: 'invalid-date-string',
          venue: { name: 'Test Venue', city: 'Test City', country: 'Test' },
          status: 'scheduled'
        }
      ];

      const result = groupGigsByDate(gigsWithInvalidDates);
      
      // Should have 4 groups (3 valid dates + 1 "date-tba")
      expect(result).toHaveLength(4);
      
      // Check that invalid date is grouped under "Date TBA"
      const tbaGroup = result.find(group => group.date === 'date-tba');
      expect(tbaGroup).toBeDefined();
      expect(tbaGroup?.dateFormatted).toBe('Date TBA');
      expect(tbaGroup?.gigs).toHaveLength(1);
      expect(tbaGroup?.gigs[0].title).toBe('Invalid Date Event');
    });

    it('should sort groups chronologically when preserveOrder is false', () => {
      // Provide gigs in random order
      const shuffledGigs = [mockGigs[2], mockGigs[0], mockGigs[1]]; // Aug 13, Aug 12, Aug 14
      
      const result = groupGigsByDate(shuffledGigs, false);
      
      // Should be sorted: Aug 12, Aug 13, Aug 14
      expect(result[0].date).toBe('2025-08-12');
      expect(result[1].date).toBe('2025-08-13');
      expect(result[2].date).toBe('2025-08-14');
    });

    it('should preserve original order when preserveOrder is true', () => {
      // Provide gigs in specific order
      const orderedGigs = [mockGigs[2], mockGigs[0], mockGigs[1]]; // Aug 13, Aug 12, Aug 14
      
      const result = groupGigsByDate(orderedGigs, true);
      
      // Should preserve the order of appearance: Aug 13, Aug 12, Aug 14
      expect(result[0].date).toBe('2025-08-13'); // First appearance
      expect(result[1].date).toBe('2025-08-12'); // Second appearance
      expect(result[2].date).toBe('2025-08-14'); // Third appearance
    });

    it('should sort gigs within each date group by time', () => {
      // Create multiple gigs for the same date with different times
      const sameeDateGigs: Gig[] = [
        {
          ...mockGigs[0],
          id: 'evening-gig',
          title: 'Evening Show',
          dateStart: '2025-08-12T20:00:00.000Z' // 21:00 BST
        },
        {
          ...mockGigs[0],
          id: 'afternoon-gig', 
          title: 'Afternoon Show',
          dateStart: '2025-08-12T13:00:00.000Z' // 14:00 BST
        },
        mockGigs[0] // 06:00 UTC = 07:00 BST (morning)
      ];

      const result = groupGigsByDate(sameeDateGigs, false);
      
      expect(result).toHaveLength(1);
      const aug12Group = result[0];
      expect(aug12Group.gigs).toHaveLength(3);
      
      // Should be sorted by time: morning, afternoon, evening
      expect(aug12Group.gigs[0].title).toBe('Thumpasaurus'); // 07:00 BST
      expect(aug12Group.gigs[1].title).toBe('Afternoon Show'); // 14:00 BST
      expect(aug12Group.gigs[2].title).toBe('Evening Show'); // 21:00 BST
    });

    it('should handle timezone conversion correctly', () => {
      // Test with UTC times that cross midnight boundaries
      const utcGigs: Gig[] = [
        {
          ...mockGigs[0],
          id: 'late-night-utc',
          title: 'Late Night UTC Event',
          dateStart: '2025-08-12T23:30:00.000Z' // 23:30 UTC = 00:30 BST next day
        },
        {
          ...mockGigs[0],
          id: 'early-morning-utc',
          title: 'Early Morning UTC Event', 
          dateStart: '2025-08-13T01:00:00.000Z' // 01:00 UTC = 02:00 BST same day
        }
      ];

      const result = groupGigsByDate(utcGigs);
      
      // Both events should be grouped under their local dates
      const aug13Group = result.find(group => group.date === '2025-08-13');
      expect(aug13Group?.gigs).toHaveLength(2);
      expect(aug13Group?.gigs.map(g => g.title)).toContain('Late Night UTC Event');
      expect(aug13Group?.gigs.map(g => g.title)).toContain('Early Morning UTC Event');
    });
  });
});