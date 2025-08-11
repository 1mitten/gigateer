import { Gig } from '@gigateer/contracts';
import { getAllGigs, filterGigs } from './catalog';
import { getWebDatabaseService, isDatabaseEnabled } from './database';

/**
 * Get all gigs for a specific city
 */
export async function getGigsForCity(city: string): Promise<Gig[]> {
  try {
    // Use database if enabled
    if (isDatabaseEnabled()) {
      const dbService = getWebDatabaseService();
      const result = await dbService.getGigs({
        filters: { 
          city,
          showPastEvents: false // Only future events
        },
        sort: { 
          field: 'dateStart', 
          order: 1 
        }
      });
      return result.gigs;
    }
    
    // Fallback to file-based catalog
    const allGigs = await getAllGigs();
    const filteredGigs = filterGigs(allGigs, {
      city,
      showPastEvents: false
    });
    
    return filteredGigs.sort((a, b) => 
      new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
    );
  } catch (error) {
    console.error(`Error fetching gigs for city ${city}:`, error);
    throw error;
  }
}

/**
 * Get upcoming gigs for a city (within specified timeframe)
 */
export async function getUpcomingGigsForCity(
  city: string, 
  daysAhead: number = 7
): Promise<Gig[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  const allGigs = await getGigsForCity(city);
  
  return allGigs.filter(gig => {
    const gigDate = new Date(gig.dateStart);
    return gigDate >= now && gigDate <= futureDate;
  });
}