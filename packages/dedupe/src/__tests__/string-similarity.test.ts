/**
 * Tests for string similarity utilities
 */

import {
  jaroSimilarity,
  jaroWinklerSimilarity,
  editDistance,
  editSimilarity
} from '../utils/string-similarity';

describe('String Similarity', () => {
  describe('jaroSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(jaroSimilarity('hello', 'hello')).toBe(1.0);
      expect(jaroSimilarity('', '')).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', () => {
      expect(jaroSimilarity('abc', 'xyz')).toBe(0);
      expect(jaroSimilarity('hello', '')).toBe(0);
      expect(jaroSimilarity('', 'world')).toBe(0);
    });

    it('should calculate similarity for similar strings', () => {
      const similarity = jaroSimilarity('hello', 'hallo');
      expect(similarity).toBeGreaterThan(0.8);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should handle transpositions correctly', () => {
      const similarity = jaroSimilarity('martha', 'marhta');
      expect(similarity).toBeCloseTo(0.944, 2);
    });
  });

  describe('jaroWinklerSimilarity', () => {
    it('should return same as Jaro for strings with similarity < 0.7', () => {
      const str1 = 'abc';
      const str2 = 'xyz';
      const jaro = jaroSimilarity(str1, str2);
      const jaroWinkler = jaroWinklerSimilarity(str1, str2);
      
      expect(jaro).toBeLessThan(0.7);
      expect(jaroWinkler).toBe(jaro);
    });

    it('should boost similarity for strings with common prefix', () => {
      const str1 = 'hello world';
      const str2 = 'hello earth';
      const jaro = jaroSimilarity(str1, str2);
      const jaroWinkler = jaroWinklerSimilarity(str1, str2);
      
      expect(jaroWinkler).toBeGreaterThan(jaro);
    });

    it('should limit prefix boost to 4 characters', () => {
      const similarity1 = jaroWinklerSimilarity('prefix123', 'prefixABC');
      const similarity2 = jaroWinklerSimilarity('prefix123456', 'prefixABCDEF');
      
      // Should be the same boost regardless of longer prefix
      expect(Math.abs(similarity1 - similarity2)).toBeLessThan(0.25);
    });

    it('should use custom prefix scale', () => {
      const str1 = 'hello world';
      const str2 = 'hello earth';
      
      const defaultScale = jaroWinklerSimilarity(str1, str2);
      const customScale = jaroWinklerSimilarity(str1, str2, 0.2);
      
      expect(customScale).toBeGreaterThan(defaultScale);
    });
  });

  describe('editDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(editDistance('hello', 'hello')).toBe(0);
      expect(editDistance('', '')).toBe(0);
    });

    it('should return length for completely different strings', () => {
      expect(editDistance('abc', 'xyz')).toBe(3);
      expect(editDistance('hello', '')).toBe(5);
      expect(editDistance('', 'world')).toBe(5);
    });

    it('should calculate edit distance correctly', () => {
      expect(editDistance('kitten', 'sitting')).toBe(3);
      expect(editDistance('saturday', 'sunday')).toBe(3);
    });

    it('should handle single character changes', () => {
      expect(editDistance('cat', 'bat')).toBe(1);
      expect(editDistance('cat', 'cats')).toBe(1);
      expect(editDistance('cat', 'at')).toBe(1);
    });
  });

  describe('editSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(editSimilarity('hello', 'hello')).toBe(1.0);
      expect(editSimilarity('', '')).toBe(1.0);
    });

    it('should return 0.0 for completely different strings of same length', () => {
      expect(editSimilarity('abc', 'xyz')).toBe(0.0);
    });

    it('should calculate normalized similarity', () => {
      const similarity = editSimilarity('kitten', 'sitting');
      expect(similarity).toBeCloseTo(0.571, 2); // 1 - (3/7)
    });

    it('should handle empty strings', () => {
      expect(editSimilarity('hello', '')).toBeCloseTo(0.0);
      expect(editSimilarity('', 'world')).toBeCloseTo(0.0);
    });
  });

  describe('performance', () => {
    it('should handle long strings efficiently', () => {
      const str1 = 'a'.repeat(1000);
      const str2 = 'b'.repeat(1000);
      
      const start = Date.now();
      jaroWinklerSimilarity(str1, str2);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});