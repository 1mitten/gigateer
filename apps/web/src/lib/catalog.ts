import fs from 'fs/promises';
import path from 'path';
import { Gig } from '@gigateer/contracts';

// Catalog file structure matching the data/catalog.json format
export interface CatalogFile {
  gigs: Gig[];
  sourceStats: {
    lastUpdate: string;
    totalGigs: number;
    newGigs: number;
    updatedGigs: number;
    sources: Record<string, {
      lastRun: string;
      gigCount: number;
      status: 'success' | 'error' | 'running';
      newGigs?: number;
      updatedGigs?: number;
    }>;
  };
  metadata: {
    version: string;
    generatedAt: string;
    schema: string;
  };
}

// Cache for the catalog file
let catalogCache: {
  data: CatalogFile | null;
  lastModified: number;
  expiry: number;
} = {
  data: null,
  lastModified: 0,
  expiry: 0
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const CATALOG_PATH = path.join(process.cwd(), '../../data/catalog.json');

/**
 * Get file stats safely
 */
async function getFileStats(filePath: string): Promise<{ mtime: number } | null> {
  try {
    const stats = await fs.stat(filePath);
    return { mtime: stats.mtime.getTime() };
  } catch (error) {
    return null;
  }
}

/**
 * Read and parse the catalog.json file with caching
 */
export async function getCatalog(): Promise<CatalogFile> {
  const now = Date.now();
  
  // Check if we need to refresh the cache
  const fileStats = await getFileStats(CATALOG_PATH);
  
  if (!fileStats) {
    throw new Error('Catalog file not found');
  }
  
  const shouldRefresh = 
    !catalogCache.data || 
    now > catalogCache.expiry || 
    fileStats.mtime > catalogCache.lastModified;
  
  if (!shouldRefresh) {
    return catalogCache.data!;
  }
  
  try {
    const fileContent = await fs.readFile(CATALOG_PATH, 'utf-8');
    const catalog: CatalogFile = JSON.parse(fileContent);
    
    // Validate the basic structure
    if (!catalog.gigs || !Array.isArray(catalog.gigs)) {
      throw new Error('Invalid catalog format: missing or invalid gigs array');
    }
    
    if (!catalog.sourceStats) {
      throw new Error('Invalid catalog format: missing sourceStats');
    }
    
    // Update cache
    catalogCache = {
      data: catalog,
      lastModified: fileStats.mtime,
      expiry: now + CACHE_TTL
    };
    
    return catalog;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid catalog file: JSON parsing error');
    }
    throw error;
  }
}

/**
 * Get all gigs from the catalog
 */
export async function getAllGigs(): Promise<Gig[]> {
  const catalog = await getCatalog();
  return catalog.gigs;
}

/**
 * Get a specific gig by ID
 */
export async function getGigById(id: string): Promise<Gig | null> {
  const gigs = await getAllGigs();
  return gigs.find(gig => gig.id === id) || null;
}

/**
 * Get catalog metadata and source stats
 */
export async function getCatalogMeta(): Promise<{
  totalGigs: number;
  sources: Array<{
    name: string;
    lastRun: string;
    gigCount: number;
    status: 'success' | 'error' | 'running';
  }>;
  lastUpdated: string;
  upcomingGigs: number;
  pastGigs: number;
}> {
  const catalog = await getCatalog();
  const now = new Date();
  
  let upcomingGigs = 0;
  let pastGigs = 0;
  
  // Count upcoming vs past gigs
  catalog.gigs.forEach(gig => {
    const gigDate = new Date(gig.dateStart);
    if (gigDate >= now) {
      upcomingGigs++;
    } else {
      pastGigs++;
    }
  });
  
  // Convert sources object to array
  const sources = Object.entries(catalog.sourceStats.sources).map(([name, stats]) => ({
    name,
    lastRun: stats.lastRun,
    gigCount: stats.gigCount,
    status: stats.status
  }));
  
  return {
    totalGigs: catalog.sourceStats.totalGigs,
    sources,
    lastUpdated: catalog.sourceStats.lastUpdate,
    upcomingGigs,
    pastGigs
  };
}

/**
 * Filter gigs based on query parameters
 */
export function filterGigs(
  gigs: Gig[],
  filters: {
    city?: string;
    genre?: string;
    dateFrom?: string;
    dateTo?: string;
    venue?: string;
    q?: string;
  }
): Gig[] {
  let filtered = [...gigs];
  
  // City filter (case-insensitive includes)
  if (filters.city) {
    const cityLower = filters.city.toLowerCase();
    filtered = filtered.filter(gig => 
      gig.venue.city?.toLowerCase().includes(cityLower)
    );
  }
  
  // Genre filter (case-insensitive includes)
  if (filters.genre) {
    const genreLower = filters.genre.toLowerCase();
    filtered = filtered.filter(gig =>
      gig.genre.some(g => g.toLowerCase().includes(genreLower))
    );
  }
  
  // Date range filters
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filtered = filtered.filter(gig => new Date(gig.dateStart) >= fromDate);
  }
  
  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    // If it's just a date (no time), set to end of day
    if (!filters.dateTo.includes('T')) {
      toDate.setHours(23, 59, 59, 999);
    }
    filtered = filtered.filter(gig => new Date(gig.dateStart) <= toDate);
  }
  
  // Venue filter (case-insensitive includes)
  if (filters.venue) {
    const venueLower = filters.venue.toLowerCase();
    filtered = filtered.filter(gig =>
      gig.venue.name.toLowerCase().includes(venueLower)
    );
  }
  
  // Text search in title, artists, and venue name
  if (filters.q) {
    const queryLower = filters.q.toLowerCase();
    filtered = filtered.filter(gig =>
      gig.title.toLowerCase().includes(queryLower) ||
      gig.artists.some(artist => artist.toLowerCase().includes(queryLower)) ||
      gig.venue.name.toLowerCase().includes(queryLower)
    );
  }
  
  return filtered;
}

/**
 * Paginate results
 */
export function paginateResults<T>(
  items: T[],
  page: number,
  limit: number
): {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
} {
  const total = items.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = items.slice(start, end);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages
    }
  };
}

/**
 * Clear the catalog cache (useful for testing or manual refresh)
 */
export function clearCatalogCache(): void {
  catalogCache.data = null;
  catalogCache.expiry = 0;
}