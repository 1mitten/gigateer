import type { Gig } from '@gigateer/contracts';

export interface RSSFeedItem {
  title: string;
  dateStart: string;
  dateEnd?: string;
  location?: string;
  categories?: string[];
  link?: string;
  description?: string;
}

export class RSSiCalScraper {
  constructor(
    private readonly feedUrl: string,
    private readonly sourceName: string
  ) {}

  async fetchRaw(): Promise<RSSFeedItem[]> {
    // This is a mock implementation for testing
    // In a real implementation, this would fetch and parse RSS/iCal feeds
    throw new Error('fetchRaw must be mocked in tests');
  }

  async normalize(rawData: RSSFeedItem[]): Promise<Gig[]> {
    const normalizedGigs: Gig[] = [];

    for (const item of rawData) {
      if (!item || !item.title || !item.dateStart) {
        continue; // Skip invalid items
      }

      try {
        // Validate date first
        const dateStart = new Date(item.dateStart);
        if (isNaN(dateStart.getTime())) {
          continue; // Skip items with invalid dates
        }

        // Extract venue from title or location
        let venueName = 'TBD';
        let artists: string[] = [];
        let title = item.title;

        // Extract venue from title if it contains " @ "
        const atMatch = title.match(/^(.+?)\s@\s(.+)$/);
        if (atMatch) {
          title = atMatch[1].trim();
          venueName = atMatch[2].trim();
        }

        // Extract artists from title
        if (title.includes('featuring')) {
          const parts = title.split(/\s+featuring\s+/);
          artists.push(parts[0].trim());
          if (parts[1]) {
            // Keep the full artist name for now, let complex parsing handle it later
            artists.push(parts[1].trim().replace(/\s+featuring\s+/, ' ').replace(/\s+&\s+/, ' & '));
          }
        } else if (title.includes(' + ')) {
          artists = title.split(' + ').map(a => a.trim());
        } else if (title.includes(' & ') && !title.includes('feat')) {
          // Split on & but be careful with names like "Special Guest & Opening Act"
          const parts = title.split(' & ');
          for (const part of parts) {
            if (part.includes(' with ')) {
              // Further split "with" clauses
              const withParts = part.split(' with ');
              artists.push(...withParts.map(p => p.trim()));
            } else {
              artists.push(part.trim());
            }
          }
        } else {
          artists = [title];
        }

        // Parse location
        let city = '';
        let country = '';
        let address = '';
        
        if (item.location) {
          const locationParts = item.location.split(', ');
          if (locationParts.length >= 5) {
            // Format: "Blue Note NYC, 131 W 3rd St, New York, NY 10012, United States"
            if (venueName === 'TBD') venueName = locationParts[0];
            city = locationParts[2]; // "New York"
            country = locationParts[locationParts.length - 1]; // "United States"
            address = locationParts.slice(0, -1).join(', ');
          } else if (locationParts.length === 3) {
            // Format: "Warehouse District, Amsterdam, Netherlands"
            if (venueName === 'TBD') venueName = locationParts[0];
            city = locationParts[1];
            country = locationParts[2];
            address = item.location;
          } else if (locationParts.length === 2) {
            if (venueName === 'TBD') venueName = locationParts[0];
            city = locationParts[1];
          }
        }

        // Extract price from description
        let price: { min: number | null; max: number | null; currency: string | null; } | undefined = undefined;
        if (item.description) {
          const priceMatch = item.description.match(/\$(\d+)(?:-(\d+))?/);
          if (priceMatch) {
            price = {
              min: parseInt(priceMatch[1], 10),
              max: priceMatch[2] ? parseInt(priceMatch[2], 10) : parseInt(priceMatch[1], 10),
              currency: 'USD' as const
            };
          } else if (item.description.toLowerCase().includes('free') || 
                     item.description.toLowerCase().includes('no cover charge')) {
            price = {
              min: 0,
              max: 0,
              currency: null
            };
          }
        }

        // Generate ID and hash
        const id = `${this.sourceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const hash = `hash-${id}`;

        const gig: Gig = {
          id,
          source: this.sourceName,
          sourceId: item.link || id,
          title: title.replace(/[:!]+$/, '').trim(),
          artists: artists.filter(a => a.length > 0),
          genre: item.categories || [],
          tags: [],
          dateStart: item.dateStart,
          dateEnd: item.dateEnd,
          timezone: 'UTC',
          venue: {
            name: venueName,
            address,
            city,
            country
          },
          price,
          status: 'scheduled' as const,
          eventUrl: item.link,
          images: [],
          updatedAt: new Date().toISOString(),
          hash
        };

        normalizedGigs.push(gig);
      } catch (error) {
        // Skip items that fail to normalize
        continue;
      }
    }

    return normalizedGigs;
  }
}