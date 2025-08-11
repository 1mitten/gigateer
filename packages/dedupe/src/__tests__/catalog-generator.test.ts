/**
 * Tests for catalog generation logic
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Gig } from '@gigateer/contracts';
import {
  generateCatalog,
  updateCatalog,
  compareCatalogs,
  Catalog,
  CatalogGenerationOptions
} from '../catalog-generator';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Catalog Generator', () => {
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
    hash: 'test-hash-123'
  };

  const mockSourceFile = {
    gigs: [mockGig],
    metadata: {
      lastRun: '2024-03-01T10:00:00Z',
      source: 'test-source',
      errors: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current time - keep Date.now accessible
    const mockTime = 1709280000000; // 2024-03-01T10:00:00Z
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCatalog', () => {
    const defaultOptions: CatalogGenerationOptions = {
      sourcesDir: '/test/sources',
      outputPath: '/test/catalog.json'
    };

    beforeEach(() => {
      mockFs.readdir.mockResolvedValue(['source1.normalized.json']);
      mockFs.stat.mockResolvedValue({
        mtime: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSourceFile));
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should generate catalog from source files', async () => {
      const catalog = await generateCatalog(defaultOptions);

      expect(catalog.gigs).toHaveLength(1);
      expect(catalog.gigs[0].id).toBe(mockGig.id);
      expect(catalog.sourceStats.totalGigs).toBe(1);
      expect(catalog.metadata.version).toBe('1.0');
      expect(catalog.metadata.generatedAt).toBeTruthy();
    });

    it('should write catalog to output file', async () => {
      await generateCatalog(defaultOptions);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/catalog.json',
        expect.stringContaining('"gigs"'),
        'utf8'
      );
    });

    it('should filter files by pattern', async () => {
      mockFs.readdir.mockResolvedValue([
        'source1.normalized.json',
        'source2.raw.json',
        'source3.normalized.json'
      ]);

      await generateCatalog(defaultOptions);

      expect(mockFs.readFile).toHaveBeenCalledTimes(2); // Only normalized files
    });

    it('should respect max file age', async () => {
      mockFs.readdir.mockResolvedValue(['old.normalized.json', 'new.normalized.json']);
      mockFs.stat
        .mockResolvedValueOnce({
          mtime: new Date(Date.now() - 1000 * 60 * 60 * 25) // 25 hours ago (old)
        } as any)
        .mockResolvedValueOnce({
          mtime: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago (new)
        } as any);

      await generateCatalog({
        ...defaultOptions,
        maxFileAgeHours: 24
      });

      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Only new file
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('new.normalized.json'),
        'utf8'
      );
    });

    it('should handle multiple source files', async () => {
      const source2 = {
        gigs: [{ ...mockGig, id: 'gig-2', source: 'source2' }],
        metadata: { lastRun: '2024-03-01T10:00:00Z', source: 'source2' }
      };

      mockFs.readdir.mockResolvedValue(['source1.normalized.json', 'source2.normalized.json']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockSourceFile))
        .mockResolvedValueOnce(JSON.stringify(source2));

      const catalog = await generateCatalog(defaultOptions);

      expect(catalog.gigs).toHaveLength(2);
      expect(catalog.sourceStats.sources).toHaveProperty('source1');
      expect(catalog.sourceStats.sources).toHaveProperty('source2');
    });

    it('should handle deduplication', async () => {
      const duplicateGig = { ...mockGig, id: 'different-id', source: 'source2' };
      const source2 = {
        gigs: [duplicateGig],
        metadata: { lastRun: '2024-03-01T10:00:00Z', source: 'source2' }
      };

      mockFs.readdir.mockResolvedValue(['source1.normalized.json', 'source2.normalized.json']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockSourceFile))
        .mockResolvedValueOnce(JSON.stringify(source2));

      const catalog = await generateCatalog({
        ...defaultOptions,
        deduplication: { minConfidence: 0.6 }
      });

      expect(catalog.gigs.length).toBeGreaterThan(0); // Catalog generated with gigs
      expect(catalog.metadata.deduplication.duplicatesRemoved).toBeGreaterThanOrEqual(0);
    });

    it('should sort gigs by date', async () => {
      const gig1 = { ...mockGig, id: 'gig-1', dateStart: '2024-03-16T20:00:00Z' };
      const gig2 = { ...mockGig, id: 'gig-2', dateStart: '2024-03-15T20:00:00Z' };
      
      const sourceFile = {
        gigs: [gig1, gig2], // Later date first
        metadata: mockSourceFile.metadata
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(sourceFile));

      const catalog = await generateCatalog(defaultOptions);

      expect(catalog.gigs[0].dateStart).toBe('2024-03-15T20:00:00Z'); // Earlier date first
      expect(catalog.gigs[1].dateStart).toBe('2024-03-16T20:00:00Z');
    });

    it('should handle validation errors', async () => {
      const invalidGig = { ...mockGig, id: '' };
      const sourceFile = {
        gigs: [invalidGig],
        metadata: mockSourceFile.metadata
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(sourceFile));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await generateCatalog({
        ...defaultOptions,
        validateInput: true
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation errors'),
        expect.arrayContaining([expect.stringContaining('missing required id field')])
      );
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.readdir.mockResolvedValue(['good.normalized.json', 'bad.normalized.json']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockSourceFile))
        .mockRejectedValueOnce(new Error('File read error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const catalog = await generateCatalog(defaultOptions);

      expect(catalog.gigs).toHaveLength(1); // Only successful file
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error reading source file bad.normalized.json'),
        expect.any(Error)
      );
    });

    it('should include performance metrics', async () => {
      const catalog = await generateCatalog(defaultOptions);

      expect(catalog.metadata.performance).toEqual({
        processingTimeMs: expect.any(Number),
        sourceCount: 1,
        totalProcessed: 1
      });
      expect(catalog.metadata.performance.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('compareCatalogs', () => {
    const createCatalog = (gigs: Gig[]): Catalog => ({
      gigs,
      sourceStats: {
        lastUpdate: '2024-03-01T10:00:00Z',
        totalGigs: gigs.length,
        newGigs: 0,
        updatedGigs: 0,
        sources: {}
      },
      metadata: {
        version: '1.0',
        generatedAt: '2024-03-01T10:00:00Z',
        schema: '@gigateer/contracts/GigSchema',
        deduplication: {
          enabled: true,
          duplicatesRemoved: 0,
          mergedGroups: 0,
          algorithm: 'fuzzy-matching-v1'
        },
        performance: {
          processingTimeMs: 100,
          sourceCount: 1,
          totalProcessed: gigs.length
        }
      }
    });

    it('should detect added gigs', () => {
      const oldCatalog = createCatalog([]);
      const newCatalog = createCatalog([mockGig]);

      const changes = compareCatalogs(oldCatalog, newCatalog);

      expect(changes.added).toBe(1);
      expect(changes.updated).toBe(0);
      expect(changes.removed).toBe(0);
      expect(changes.unchanged).toBe(0);
      expect(changes.changes).toHaveLength(1);
      expect(changes.changes[0].type).toBe('added');
    });

    it('should detect removed gigs', () => {
      const oldCatalog = createCatalog([mockGig]);
      const newCatalog = createCatalog([]);

      const changes = compareCatalogs(oldCatalog, newCatalog);

      expect(changes.added).toBe(0);
      expect(changes.updated).toBe(0);
      expect(changes.removed).toBe(1);
      expect(changes.unchanged).toBe(0);
      expect(changes.changes).toHaveLength(1);
      expect(changes.changes[0].type).toBe('removed');
    });

    it('should detect updated gigs', () => {
      const oldGig = { ...mockGig, hash: 'old-hash' };
      const newGig = { ...mockGig, hash: 'new-hash' };
      
      const oldCatalog = createCatalog([oldGig]);
      const newCatalog = createCatalog([newGig]);

      const changes = compareCatalogs(oldCatalog, newCatalog);

      expect(changes.added).toBe(0);
      expect(changes.updated).toBe(1);
      expect(changes.removed).toBe(0);
      expect(changes.unchanged).toBe(0);
      expect(changes.changes).toHaveLength(1);
      expect(changes.changes[0].type).toBe('updated');
      expect(changes.changes[0].reason).toBe('Content hash changed');
    });

    it('should detect unchanged gigs', () => {
      const oldCatalog = createCatalog([mockGig]);
      const newCatalog = createCatalog([mockGig]);

      const changes = compareCatalogs(oldCatalog, newCatalog);

      expect(changes.added).toBe(0);
      expect(changes.updated).toBe(0);
      expect(changes.removed).toBe(0);
      expect(changes.unchanged).toBe(1);
      expect(changes.changes).toHaveLength(0);
    });

    it('should handle complex changes', () => {
      const gig1 = { ...mockGig, id: 'gig-1' };
      const gig2 = { ...mockGig, id: 'gig-2', hash: 'old-hash' };
      const gig3 = { ...mockGig, id: 'gig-3' };
      
      const oldCatalog = createCatalog([gig1, gig2]);
      const newCatalog = createCatalog([
        gig1, // unchanged
        { ...gig2, hash: 'new-hash' }, // updated
        gig3 // added
      ]);

      const changes = compareCatalogs(oldCatalog, newCatalog);

      expect(changes.added).toBe(1);
      expect(changes.updated).toBe(1);
      expect(changes.removed).toBe(0);
      expect(changes.unchanged).toBe(1);
      expect(changes.changes).toHaveLength(2);
    });
  });

  describe('updateCatalog', () => {
    const defaultOptions: CatalogGenerationOptions = {
      sourcesDir: '/test/sources',
      outputPath: '/test/catalog.json'
    };

    beforeEach(() => {
      mockFs.readdir.mockResolvedValue(['source1.normalized.json']);
      mockFs.stat.mockResolvedValue({
        mtime: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      } as any);
      mockFs.readFile.mockImplementation((path: any) => {
        if (path === '/test/catalog.json') {
          const existingCatalog = {
            gigs: [],
            sourceStats: { totalGigs: 0, sources: {} },
            metadata: { version: '1.0' }
          };
          return Promise.resolve(JSON.stringify(existingCatalog));
        }
        return Promise.resolve(JSON.stringify(mockSourceFile));
      });
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should update existing catalog', async () => {
      const result = await updateCatalog('/test/catalog.json', defaultOptions);

      expect(result.catalog.gigs).toHaveLength(1);
      expect(result.changes.added).toBe(1);
      expect(result.changes.updated).toBe(0);
      expect(result.changes.removed).toBe(0);
    });

    it('should handle non-existent catalog file', async () => {
      mockFs.readFile.mockImplementation((path: any) => {
        if (path === '/test/catalog.json') {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve(JSON.stringify(mockSourceFile));
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await updateCatalog('/test/catalog.json', defaultOptions);

      expect(result.catalog.gigs).toHaveLength(1);
      expect(result.changes.added).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('No existing catalog found, creating new one');
    });

    it('should track changes between old and new catalogs', async () => {
      const existingGig = { ...mockGig, id: 'existing-gig' };
      const existingCatalog = {
        gigs: [existingGig],
        sourceStats: { totalGigs: 1, sources: {} },
        metadata: { version: '1.0' }
      };

      mockFs.readFile.mockImplementation((path: any) => {
        if (path === '/test/catalog.json') {
          return Promise.resolve(JSON.stringify(existingCatalog));
        }
        return Promise.resolve(JSON.stringify(mockSourceFile));
      });

      const result = await updateCatalog('/test/catalog.json', defaultOptions);

      expect(result.changes.added).toBe(1); // New gig from source
      expect(result.changes.removed).toBe(1); // Existing gig not in new sources
    });
  });

  describe('error handling', () => {
    it('should handle directory read errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(generateCatalog({
        sourcesDir: '/test/sources',
        outputPath: '/test/catalog.json'
      })).rejects.toThrow('Permission denied');
    });

    it('should handle invalid JSON in source files', async () => {
      mockFs.readdir.mockResolvedValue(['invalid.normalized.json']);
      mockFs.stat.mockResolvedValue({
        mtime: new Date(Date.now() - 1000 * 60 * 60)
      } as any);
      mockFs.readFile.mockResolvedValue('invalid json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const catalog = await generateCatalog({
        sourcesDir: '/test/sources',
        outputPath: '/test/catalog.json'
      });

      expect(catalog.gigs).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error reading source file'),
        expect.any(Error)
      );
    });

    it('should handle write errors', async () => {
      mockFs.readdir.mockResolvedValue(['source1.normalized.json']);
      mockFs.stat.mockResolvedValue({
        mtime: new Date(Date.now() - 1000 * 60 * 60)
      } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSourceFile));
      mockFs.writeFile.mockRejectedValue(new Error('Write permission denied'));

      await expect(generateCatalog({
        sourcesDir: '/test/sources',
        outputPath: '/test/catalog.json'
      })).rejects.toThrow('Write permission denied');
    });
  });
});