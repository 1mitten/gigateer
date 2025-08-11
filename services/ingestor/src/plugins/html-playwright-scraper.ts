import type { Gig } from '@gigateer/contracts';

export interface HTMLEventData {
  title: string;
  dateStart: string;
  dateEnd?: string;
  venue: string;
  address?: string;
  price?: string;
  artists?: string[];
  genres?: string[];
  eventUrl?: string;
  ticketsUrl?: string;
  imageUrls?: string[];
  description?: string;
}

export class HTMLPlaywrightScraper {
  constructor(
    private readonly baseUrl: string,
    private readonly sourceName: string,
    private readonly eventUrls: string[]
  ) {}

  async fetchRaw(): Promise<HTMLEventData[]> {
    // This is a mock implementation for testing
    // In a real implementation, this would use Playwright to scrape HTML pages
    throw new Error('fetchRaw must be mocked in tests');
  }

  async normalize(rawData: HTMLEventData[]): Promise<Gig[]> {
    const normalizedGigs: Gig[] = [];

    for (const event of rawData) {
      if (!event || !event.title || !event.dateStart) {
        continue; // Skip invalid events
      }

      try {
        // Parse venue address
        let city = '';
        let country = '';
        
        if (event.address) {
          const addressParts = event.address.split(', ');
          if (addressParts.length >= 4) {
            // Format: "131 W 3rd St, New York, NY 10012" -> city: "New York", country: "NY 10012"
            city = addressParts[1]; // "New York"
            country = addressParts.slice(2).join(' '); // "NY 10012"
          } else if (addressParts.length === 3) {
            // Format: "Industrial District, Amsterdam"
            city = addressParts[1];
            country = addressParts[2] || '';
          } else if (addressParts.length === 2) {
            city = addressParts[1];
          }
        }

        // Parse price
        let price: { min: number | null; max: number | null; currency: string | null; } | undefined = undefined;
        if (event.price) {
          if (event.price.toLowerCase().includes('free')) {
            price = {
              min: 0,
              max: 0,
              currency: null
            };
          } else {
            const priceMatch = event.price.match(/\$(\d+)(?:-(\d+))?/);
            if (priceMatch) {
              price = {
                min: parseInt(priceMatch[1], 10),
                max: priceMatch[2] ? parseInt(priceMatch[2], 10) : parseInt(priceMatch[1], 10),
                currency: 'USD' as const
              };
            }
          }
        }

        // Generate ID and hash
        const id = `${this.sourceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const hash = `hash-${id}`;

        const gig: Gig = {
          id,
          source: this.sourceName,
          sourceId: event.eventUrl || id,
          title: event.title,
          artists: event.artists || [],
          genre: event.genres || [],
          tags: [],
          dateStart: event.dateStart,
          dateEnd: event.dateEnd,
          timezone: 'UTC',
          venue: {
            name: event.venue,
            address: event.address || '',
            city,
            country
          },
          price,
          status: 'scheduled' as const,
          eventUrl: event.eventUrl,
          ticketsUrl: event.ticketsUrl,
          images: event.imageUrls || [],
          updatedAt: new Date().toISOString(),
          hash
        };

        normalizedGigs.push(gig);
      } catch (error) {
        // Skip events that fail to normalize
        continue;
      }
    }

    return normalizedGigs;
  }
}