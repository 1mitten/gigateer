import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FileManager } from '../file-manager';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('FileManager', () => {
  let tempDir: string;
  let fileManager: FileManager;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'filemanager-test-'));
    fileManager = new FileManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('directory creation', () => {
    it('should create directories if they do not exist', async () => {
      const subDir = path.join(tempDir, 'sources');
      await fileManager.ensureDirectories();

      const stats = await fs.stat(subDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not fail if directories already exist', async () => {
      // Create the directory first
      await fs.mkdir(path.join(tempDir, 'sources'), { recursive: true });
      
      // Should not throw
      await expect(fileManager.ensureDirectories()).resolves.toBeUndefined();
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      await fileManager.ensureDirectories();
    });

    it('should read and write source files', async () => {
      const sourceName = 'test-venue';
      const data = [{ id: '1', title: 'Test Event', date: '2024-01-01' }];

      await fileManager.writeSourceFile(sourceName, data);
      const readData = await fileManager.readSourceFile(sourceName);

      expect(readData).toEqual(data);
    });

    it('should return empty array for non-existent source file', async () => {
      const readData = await fileManager.readSourceFile('non-existent');
      expect(readData).toEqual([]);
    });

    it('should read and write catalog file', async () => {
      const catalog = [
        { id: 'gig1', title: 'Event 1', date: '2024-01-01' },
        { id: 'gig2', title: 'Event 2', date: '2024-01-02' }
      ];

      await fileManager.writeCatalog(catalog);
      const readCatalog = await fileManager.readCatalog();

      expect(readCatalog).toEqual(catalog);
    });

    it('should return empty array for non-existent catalog', async () => {
      const catalog = await fileManager.readCatalog();
      expect(catalog).toEqual([]);
    });
  });

  describe('source listing', () => {
    beforeEach(async () => {
      await fileManager.ensureDirectories();
    });

    it('should list available sources', async () => {
      const sources = ['venue1', 'venue2', 'venue3'];
      
      // Create source files
      for (const source of sources) {
        await fileManager.writeSourceFile(source, []);
      }

      const availableSources = await fileManager.listSources();
      expect(availableSources.sort()).toEqual(sources.sort());
    });

    it('should return empty array when no sources exist', async () => {
      const sources = await fileManager.listSources();
      expect(sources).toEqual([]);
    });
  });
});