import { RSSiCalScraper } from "../rss-ical-scraper";
import { validateGig } from "@gigateer/contracts";

// Mock the FeedParser to avoid actual HTTP requests
jest.mock("@gigateer/scraper", () => ({
  ...jest.requireActual("@gigateer/scraper"),
  FeedParser: {
    fetchAndParse: jest.fn(),
  },
}));

import { FeedParser } from "@gigateer/scraper";

const mockFeedParser = FeedParser.fetchAndParse as jest.MockedFunction<typeof FeedParser.fetchAndParse>;

describe("RSSiCalScraper", () => {
  let scraper: RSSiCalScraper;
  
  beforeEach(() => {
    scraper = new RSSiCalScraper("https://example.com/feed.rss", "test-scraper");
    jest.clearAllMocks();
  });

  describe("metadata", () => {
    test("should have correct metadata", () => {
      expect(scraper.upstreamMeta.name).toBe("test-scraper");
      expect(scraper.upstreamMeta.rateLimitPerMin).toBe(10);
      expect(scraper.upstreamMeta.defaultSchedule).toBe("0 */4 * * *");
    });
  });

  describe("fetchRaw", () => {
    test("should fetch and return feed items", async () => {
      const mockFeedItems = [
        {
          title: "Jazz Night at Blue Note",
          dateStart: "2024-03-15T20:00:00Z",
          location: "Blue Note NYC, 131 W 3rd St, New York, NY",
          categories: ["Jazz", "Music"],
          link: "https://example.com/events/jazz-night",
          description: "An evening of smooth jazz featuring local artists"
        },
        {
          title: "Rock Concert @ The Forum",
          dateStart: "2024-03-16T21:00:00Z",
          location: "The Forum",
          categories: ["Rock"],
          link: "https://example.com/events/rock-concert"
        }
      ];

      mockFeedParser.mockResolvedValue(mockFeedItems);

      const result = await scraper.fetchRaw();
      
      expect(result).toEqual(mockFeedItems);
      expect(mockFeedParser).toHaveBeenCalledWith("https://example.com/feed.rss", "test-scraper");
    });

    test("should handle fetch errors", async () => {
      mockFeedParser.mockRejectedValue(new Error("Network error"));

      await expect(scraper.fetchRaw()).rejects.toThrow("Failed to fetch feed");
    });
  });

  describe("normalize", () => {
    test("should normalize feed items to valid gigs", async () => {
      const rawData = [
        {
          title: "Jazz Night at Blue Note",
          dateStart: "2024-03-15T20:00:00Z",
          location: "Blue Note NYC, 131 W 3rd St, New York, NY",
          categories: ["Jazz", "Music"],
          link: "https://example.com/events/jazz-night",
          description: "An evening of smooth jazz featuring John Doe Trio. Tickets $25-35."
        },
        {
          title: "Rock Concert @ The Forum",
          dateStart: "2024-03-16T21:00:00Z",
          location: "The Forum",
          categories: ["Rock"],
          link: "https://example.com/events/rock-concert",
          description: "Free entry rock show"
        }
      ];

      const result = await scraper.normalize(rawData);
      
      expect(result).toHaveLength(2);
      
      // First gig
      const firstGig = result[0];
      expect(firstGig.title).toBe("Jazz Night at Blue Note");
      expect(firstGig.source).toBe("test-scraper");
      expect(firstGig.dateStart).toBe("2024-03-15T20:00:00Z");
      expect(firstGig.venue.name).toBe("Blue Note NYC");
      expect(firstGig.venue.city).toBe("New York");
      expect(firstGig.venue.country).toBe("NY");
      expect(firstGig.artists).toContain("John Doe Trio");
      expect(firstGig.genre).toContain("Jazz");
      expect(firstGig.price?.min).toBe(25);
      expect(firstGig.price?.max).toBe(35);
      expect(firstGig.eventUrl).toBe("https://example.com/events/jazz-night");
      
      // Validate that it's a proper Gig object
      expect(() => validateGig(firstGig)).not.toThrow();
      
      // Second gig
      const secondGig = result[1];
      expect(secondGig.title).toBe("Rock Concert");
      expect(secondGig.venue.name).toBe("The Forum");
      expect(secondGig.genre).toContain("Rock");
      expect(secondGig.price?.min).toBe(0);
      expect(secondGig.price?.max).toBe(0);
      
      // Validate that it's a proper Gig object
      expect(() => validateGig(secondGig)).not.toThrow();
    });

    test("should skip items without required fields", async () => {
      const rawData = [
        {
          // Missing title
          dateStart: "2024-03-15T20:00:00Z",
          location: "Blue Note NYC",
        },
        {
          title: "Valid Event",
          // Missing dateStart
          location: "The Forum",
        },
        {
          title: "Valid Event",
          dateStart: "2024-03-15T20:00:00Z",
          location: "Blue Note NYC",
        }
      ];

      const result = await scraper.normalize(rawData);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid Event");
    });

    test("should extract venue from title when location is not available", async () => {
      const rawData = [
        {
          title: "Jazz Night @ Blue Note NYC",
          dateStart: "2024-03-15T20:00:00Z",
        }
      ];

      const result = await scraper.normalize(rawData);
      
      expect(result).toHaveLength(1);
      expect(result[0].venue.name).toBe("Blue Note NYC");
    });

    test("should handle normalization errors gracefully", async () => {
      const rawData = [
        {
          title: "Valid Event",
          dateStart: "2024-03-15T20:00:00Z",
          location: "Blue Note NYC",
        },
        {
          title: "Invalid Event",
          dateStart: "invalid-date",
          location: "The Forum",
        }
      ];

      const result = await scraper.normalize(rawData);
      
      // Should still process the valid event
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid Event");
    });
  });

  describe("venue extraction", () => {
    test("should parse venue from location with address", async () => {
      const rawData = [
        {
          title: "Concert",
          dateStart: "2024-03-15T20:00:00Z",
          location: "Blue Note NYC, 131 W 3rd St, New York, NY 10012",
        }
      ];

      const result = await scraper.normalize(rawData);
      
      expect(result[0].venue.name).toBe("Blue Note NYC");
      expect(result[0].venue.address).toBe("Blue Note NYC, 131 W 3rd St, New York, NY 10012");
      expect(result[0].venue.city).toBe("New York");
      expect(result[0].venue.country).toBe("NY 10012");
    });

    test("should use location as venue name if no address", async () => {
      const rawData = [
        {
          title: "Concert",
          dateStart: "2024-03-15T20:00:00Z",
          location: "Blue Note NYC",
        }
      ];

      const result = await scraper.normalize(rawData);
      
      expect(result[0].venue.name).toBe("Blue Note NYC");
      expect(result[0].venue.address).toBeUndefined();
    });

    test("should extract venue from title with @ symbol", async () => {
      const rawData = [
        {
          title: "Jazz Night @ Blue Note NYC",
          dateStart: "2024-03-15T20:00:00Z",
        }
      ];

      const result = await scraper.normalize(rawData);
      
      expect(result[0].venue.name).toBe("Blue Note NYC");
      expect(result[0].artists).toContain("Jazz Night");
    });

    test("should fallback to TBD for venue", async () => {
      const rawData = [
        {
          title: "Concert",
          dateStart: "2024-03-15T20:00:00Z",
        }
      ];

      const result = await scraper.normalize(rawData);
      
      expect(result[0].venue.name).toBe("TBD");
    });
  });
});