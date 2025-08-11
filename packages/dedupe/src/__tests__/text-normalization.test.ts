/**
 * Tests for text normalization utilities
 */

import {
  normalizeText,
  normalizeVenueName,
  normalizeTitle,
  normalizeCity,
  extractMainArtist,
  createSearchableText
} from '../utils/text-normalization';

describe('Text Normalization', () => {
  describe('normalizeText', () => {
    it('should handle empty and null inputs', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText(null as any)).toBe('');
      expect(normalizeText(undefined as any)).toBe('');
    });

    it('should convert to lowercase', () => {
      expect(normalizeText('Hello WORLD')).toBe('hello world');
    });

    it('should remove punctuation and special characters', () => {
      expect(normalizeText('Hello, World!')).toBe('hello world');
      expect(normalizeText('Rock & Roll')).toBe('rock roll'); // & is removed
      expect(normalizeText('Band-Name')).toBe('bandname');
      expect(normalizeText('The "Best" Show')).toBe('best');
    });

    it('should normalize whitespace', () => {
      expect(normalizeText('  hello   world  ')).toBe('hello world');
      expect(normalizeText('hello\t\nworld')).toBe('hello world');
    });

    it('should standardize common abbreviations', () => {
      expect(normalizeText('and')).toBe('&');
      expect(normalizeText('the band')).toBe('band');
      expect(normalizeText('st mary')).toBe('street mary');
      expect(normalizeText('live concert')).toBe('');
      expect(normalizeText('live show')).toBe('');
    });
  });

  describe('normalizeVenueName', () => {
    it('should remove venue type suffixes', () => {
      expect(normalizeVenueName('Madison Square Garden Arena')).toBe('madison square garden');
      expect(normalizeVenueName('The Blue Note Club')).toBe('blue note');
      expect(normalizeVenueName('Apollo Theatre')).toBe('apollo');
      expect(normalizeVenueName('Sports Bar & Venue')).toBe('sports');
    });

    it('should handle complex venue names', () => {
      expect(normalizeVenueName('The O2 Arena')).toBe('o2');
      expect(normalizeVenueName('Royal Albert Hall')).toBe('royal albert');
    });
  });

  describe('normalizeTitle', () => {
    it('should remove common event words', () => {
      expect(normalizeTitle('Band presents: Live Concert')).toBe('band');
      expect(normalizeTitle('Artist feat. Guest')).toBe('artist guest');
      expect(normalizeTitle('Band + Support')).toBe('band support');
      expect(normalizeTitle('Artist World Tour')).toBe('artist');
    });

    it('should handle featuring variations', () => {
      expect(normalizeTitle('Artist featuring Guest')).toBe('artist guest');
      expect(normalizeTitle('Artist feat Guest')).toBe('artist guest');
      expect(normalizeTitle('Artist ft. Guest')).toBe('artist guest');
      expect(normalizeTitle('Artist with Guest')).toBe('artist guest');
    });
  });

  describe('normalizeCity', () => {
    it('should remove city suffixes', () => {
      expect(normalizeCity('New York City')).toBe('new york');
      expect(normalizeCity('London Town')).toBe('london');
      expect(normalizeCity('Kings County')).toBe('kings');
    });

    it('should handle various city formats', () => {
      expect(normalizeCity('Los Angeles')).toBe('los angeles');
      expect(normalizeCity('San Francisco')).toBe('san francisco');
    });
  });

  describe('extractMainArtist', () => {
    it('should extract main artist from title with separators', () => {
      expect(extractMainArtist('Band + Support Act')).toBe('band');
      expect(extractMainArtist('Artist & Guest')).toBe('artist');
      expect(extractMainArtist('Band and Support')).toBe('band');
      expect(extractMainArtist('Artist feat Guest')).toBe('artist');
      expect(extractMainArtist('Band featuring Support')).toBe('band');
      expect(extractMainArtist('Artist with Guest')).toBe('artist');
      expect(extractMainArtist('Band vs Other Band')).toBe('band');
    });

    it('should return normalized title if no separators found', () => {
      expect(extractMainArtist('Single Artist')).toBe('single artist');
      expect(extractMainArtist('Band Name')).toBe('band name');
    });

    it('should handle empty input', () => {
      expect(extractMainArtist('')).toBe('');
      expect(extractMainArtist(null as any)).toBe('');
    });
  });

  describe('createSearchableText', () => {
    it('should remove stop words', () => {
      const input = 'the band and the artist';
      const result = createSearchableText(input);
      expect(result).toBe('band & artist');
    });

    it('should filter out common stop words', () => {
      const input = 'a great band with an amazing show';
      const result = createSearchableText(input);
      expect(result).toBe('great band amazing');
    });

    it('should preserve meaningful words', () => {
      const input = 'rock music festival';
      const result = createSearchableText(input);
      expect(result).toBe('rock music festival');
    });

    it('should handle empty input', () => {
      expect(createSearchableText('')).toBe('');
      expect(createSearchableText('the and a')).toBe('&');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in venue names', () => {
      expect(normalizeVenueName("O'Malley's Pub")).toBe('omalleys');
      expect(normalizeVenueName('Café del Mar')).toBe('café del mar');
    });

    it('should handle numbers in text', () => {
      expect(normalizeText('Studio 54 Club')).toBe('studio 54 club');
      expect(normalizeTitle('Album Release Party 2024')).toBe('release party 2024');
    });

    it('should handle very long strings', () => {
      const longTitle = 'A Very Long Concert Title With Many Words And Featuring Multiple Artists Plus Support Acts'.repeat(10);
      const result = normalizeTitle(longTitle);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(longTitle.length);
    });
  });
});