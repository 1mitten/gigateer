import type { Gig, ScraperPlugin } from "@gigateer/contracts";
import { createGigId, createGigHash } from "@gigateer/contracts";

/**
 * Example scraper plugin that demonstrates the interface
 * In a real implementation, this would fetch from an actual API or website
 */
const exampleVenueScraper: ScraperPlugin = {
  upstreamMeta: {
    name: "Example Venue",
    rateLimitPerMin: 30,
    defaultSchedule: "0 */3 * * *", // Every 3 hours
    description: "Example scraper demonstrating the plugin interface",
  },

  async fetchRaw(): Promise<unknown[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real scraper, this would make HTTP requests to fetch data
    // For this example, we'll return mock data
    return [
      {
        id: "event-001",
        name: "Jazz Night with John Doe Trio",
        venue: "Blue Note Café",
        address: "123 Music St, Amsterdam, Netherlands",
        date: "2024-02-15T20:00:00Z",
        price: { min: 25, max: 35, currency: "EUR" },
        artists: ["John Doe Trio"],
        genre: ["Jazz"],
        ticketsUrl: "https://example.com/tickets/001",
        eventUrl: "https://example.com/events/001",
      },
      {
        id: "event-002", 
        name: "Electronic Underground",
        venue: "Warehouse 42",
        address: "42 Industrial Ave, Amsterdam, Netherlands",
        date: "2024-02-16T22:00:00Z",
        price: { min: 15, max: 20, currency: "EUR" },
        artists: ["DJ Pulse", "Neon Dreams"],
        genre: ["Electronic", "Techno"],
        ticketsUrl: "https://example.com/tickets/002",
        eventUrl: "https://example.com/events/002",
      },
      {
        id: "event-003",
        name: "Indie Rock Showcase", 
        venue: "The Underground",
        address: "789 Alt St, Amsterdam, Netherlands",
        date: "2024-02-17T19:30:00Z",
        price: { min: 12, max: 18, currency: "EUR" },
        artists: ["The Alternatives", "Sunset Valley"],
        genre: ["Indie", "Rock"],
        ticketsUrl: "https://example.com/tickets/003",
        eventUrl: "https://example.com/events/003",
      },
    ];
  },

  async normalize(rawData: unknown[]): Promise<Gig[]> {
    const gigs: Gig[] = [];
    const now = new Date().toISOString();

    for (const raw of rawData) {
      try {
        const rawEvent = raw as any;
        
        // Extract venue information
        const [venueName, address] = rawEvent.address ? 
          [rawEvent.venue, rawEvent.address] : 
          [rawEvent.venue, ""];
          
        // Parse address for city/country
        const addressParts = address.split(", ");
        const city = addressParts[addressParts.length - 2] || "";
        const country = addressParts[addressParts.length - 1] || "";

        const gig: Partial<Gig> = {
          source: "example-venue",
          sourceId: rawEvent.id,
          title: rawEvent.name,
          artists: Array.isArray(rawEvent.artists) ? rawEvent.artists : [rawEvent.artists],
          genre: Array.isArray(rawEvent.genre) ? rawEvent.genre : [rawEvent.genre],
          dateStart: rawEvent.date,
          venue: {
            name: venueName,
            address: address || undefined,
            city: city || undefined,
            country: country || undefined,
          },
          price: rawEvent.price ? {
            min: rawEvent.price.min,
            max: rawEvent.price.max,
            currency: rawEvent.price.currency,
          } : undefined,
          status: "scheduled",
          ticketsUrl: rawEvent.ticketsUrl,
          eventUrl: rawEvent.eventUrl,
          images: [],
          updatedAt: now,
        };

        // Generate ID and hash
        gig.id = createGigId(
          gig.venue?.name || "unknown-venue",
          gig.title || "unknown-event",
          gig.dateStart || new Date().toISOString(),
          gig.venue?.city
        );
        gig.hash = createGigHash(gig);

        gigs.push(gig as Gig);
      } catch (error) {
        console.error("Failed to normalize raw event:", error, raw);
      }
    }

    return gigs;
  },
};

export default exampleVenueScraper;