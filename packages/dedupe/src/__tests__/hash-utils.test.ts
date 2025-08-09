/**
 * Tests for hash utilities
 */

import { Gig } from '@gigateer/contracts';
import {
  createStableHash,
  createGigContentHash,
  createFuzzyMatchKey,
  createCompositeKey,
  compareHashes,
  isValidHash,
  createQuickHash
} from '../utils/hash-utils';

describe('Hash Utils', () => {
  const mockGig: Gig = {
    id: 'test-gig-1',
    source: 'test-source',
    sourceId: 'src-123',
    title: 'Test Concert',
    artists: ['Test Artist'],
    genre: ['Rock'],
    dateStart: '2024-03-15T20:00:00Z',
    dateEnd: '2024-03-15T23:00:00Z',
    timezone: 'UTC',
    venue: {
      name: 'Test Venue',
      address: '123 Test St',
      city: 'Test City',
      country: 'Test Country',
      lat: 40.7128,
      lng: -74.0060
    },
    price: {
      min: 25,
      max: 50,
      currency: 'USD'
    },
    ageRestriction: '18+',
    status: 'scheduled',
    ticketsUrl: 'https://example.com/tickets',
    eventUrl: 'https://example.com/event',
    images: ['https://example.com/image.jpg'],
    updatedAt: '2024-03-01T10:00:00Z',
    hash: 'existing-hash'
  };

  describe('createStableHash', () => {
    it('should create consistent hashes for same data', () => {
      const data = { a: 1, b: 2, c: 3 };
      const hash1 = createStableHash(data);
      const hash2 = createStableHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash1.length).toBe(64); // SHA256 hex length
    });

    it('should create same hash regardless of property order', () => {
      const data1 = { a: 1, b: 2, c: 3 };
      const data2 = { c: 3, a: 1, b: 2 };
      
      const hash1 = createStableHash(data1);
      const hash2 = createStableHash(data2);
      
      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different data', () => {
      const data1 = { a: 1, b: 2 };
      const data2 = { a: 1, b: 3 };
      
      const hash1 = createStableHash(data1);
      const hash2 = createStableHash(data2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle nested objects', () => {
      const data1 = { a: { nested: 1 }, b: 2 };
      const data2 = { b: 2, a: { nested: 1 } };
      
      const hash1 = createStableHash(data1);
      const hash2 = createStableHash(data2);
      
      expect(hash1).toBe(hash2);
    });

    it('should handle arrays consistently', () => {
      const data1 = { items: [1, 2, 3] };
      const data2 = { items: [1, 2, 3] };
      const data3 = { items: [3, 2, 1] };
      
      const hash1 = createStableHash(data1);
      const hash2 = createStableHash(data2);
      const hash3 = createStableHash(data3);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should handle null and undefined', () => {
      const hash1 = createStableHash(null);
      const hash2 = createStableHash(undefined);
      const hash3 = createStableHash({});
      
      expect(hash1).toBeTruthy();
      expect(hash2).toBeTruthy();
      expect(hash3).toBeTruthy();
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
    });

    it('should handle invalid input gracefully', () => {
      const circular: any = {};
      circular.self = circular;
      
      const hash = createStableHash(circular);
      expect(hash).toBe(''); // Should return empty string on error
    });
  });

  describe('createGigContentHash', () => {
    it('should create hash from relevant fields only', () => {
      const hash1 = createGigContentHash(mockGig);
      
      // Changing irrelevant fields shouldn't affect hash
      const modifiedGig = { ...mockGig, id: 'different-id', hash: 'different-hash' };
      const hash2 = createGigContentHash(modifiedGig);
      
      expect(hash1).toBe(hash2);
    });

    it('should create different hash when content changes', () => {
      const hash1 = createGigContentHash(mockGig);
      
      const modifiedGig = { ...mockGig, title: 'Different Title' };
      const hash2 = createGigContentHash(modifiedGig);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle partial gig data', () => {
      const partialGig = {
        title: 'Test',
        venue: { name: 'Test Venue' },
        dateStart: '2024-03-15T20:00:00Z'
      };
      
      const hash = createGigContentHash(partialGig);
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });

    it('should be stable across multiple calls', () => {
      const hash1 = createGigContentHash(mockGig);
      const hash2 = createGigContentHash(mockGig);
      const hash3 = createGigContentHash(mockGig);
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe('createFuzzyMatchKey', () => {
    it('should create consistent fuzzy keys', () => {
      const key1 = createFuzzyMatchKey(mockGig);
      const key2 = createFuzzyMatchKey(mockGig);
      
      expect(key1).toBe(key2);
    });

    it('should create similar keys for similar events', () => {
      const gig1 = { ...mockGig, title: 'Rock Concert' };
      const gig2 = { ...mockGig, title: 'ROCK CONCERT!!!' };
      
      const key1 = createFuzzyMatchKey(gig1);
      const key2 = createFuzzyMatchKey(gig2);
      
      expect(key1).toBe(key2); // Should normalize to same key
    });

    it('should handle missing venue data', () => {
      const gigWithoutVenue = {
        ...mockGig,
        venue: { name: '' }
      };
      
      const key = createFuzzyMatchKey(gigWithoutVenue);
      expect(key).toBeTruthy();
    });

    it('should handle invalid dates gracefully', () => {
      const gigWithBadDate = {
        ...mockGig,
        dateStart: 'invalid-date'
      };
      
      const key = createFuzzyMatchKey(gigWithBadDate);
      expect(key).toBeTruthy();
    });
  });

  describe('createCompositeKey', () => {
    it('should create unique keys for different gigs', () => {
      const gig1 = { ...mockGig };
      const gig2 = { ...mockGig, title: 'Different Concert' };
      
      const key1 = createCompositeKey(gig1);
      const key2 = createCompositeKey(gig2);
      
      expect(key1).not.toBe(key2);
    });

    it('should create same key for identical gigs', () => {
      const key1 = createCompositeKey(mockGig);
      const key2 = createCompositeKey({ ...mockGig });
      
      expect(key1).toBe(key2);
    });

    it('should handle missing data gracefully', () => {
      const minimalGig = {
        title: 'Test',
        venue: { name: 'Venue' },
        dateStart: '2024-03-15T20:00:00Z'
      };
      
      const key = createCompositeKey(minimalGig);
      expect(key).toBeTruthy();
      expect(key.length).toBe(64);
    });
  });

  describe('compareHashes', () => {
    it('should return true for identical hashes', () => {
      const hash = createStableHash({ test: true });
      expect(compareHashes(hash, hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = createStableHash({ test: 1 });
      const hash2 = createStableHash({ test: 2 });
      expect(compareHashes(hash1, hash2)).toBe(false);
    });

    it('should return false for empty hashes', () => {
      expect(compareHashes('', '')).toBe(false);
      expect(compareHashes('valid-hash', '')).toBe(false);
    });
  });

  describe('isValidHash', () => {
    it('should validate SHA256 hex strings', () => {
      const validHash = createStableHash({ test: true });
      expect(isValidHash(validHash)).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidHash('too-short')).toBe(false);
      expect(isValidHash('contains-invalid-chars-!')).toBe(false);
      expect(isValidHash('')).toBe(false);
      expect(isValidHash('g'.repeat(64))).toBe(false); // 'g' is not hex
    });

    it('should accept both uppercase and lowercase hex', () => {
      const hash = 'a'.repeat(64);
      const upperHash = 'A'.repeat(64);
      
      expect(isValidHash(hash)).toBe(true);
      expect(isValidHash(upperHash)).toBe(true);
    });
  });

  describe('createQuickHash', () => {
    it('should create consistent quick hashes', () => {
      const data = { test: 'value' };
      const hash1 = createQuickHash(data);
      const hash2 = createQuickHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
    });

    it('should create different hashes for different data', () => {
      const hash1 = createQuickHash({ a: 1 });
      const hash2 = createQuickHash({ a: 2 });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle strings directly', () => {
      const hash1 = createQuickHash('test');
      const hash2 = createQuickHash('test');
      const hash3 = createQuickHash('different');
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should handle errors gracefully', () => {
      const circular: any = {};
      circular.self = circular;
      
      const hash = createQuickHash(circular);
      expect(hash).toBe('0');
    });
  });

  describe('performance', () => {
    it('should handle large objects efficiently', () => {
      const largeObject = {
        data: Array(1000).fill(0).map((_, i) => ({ id: i, value: `value-${i}` }))
      };
      
      const start = Date.now();
      createStableHash(largeObject);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});