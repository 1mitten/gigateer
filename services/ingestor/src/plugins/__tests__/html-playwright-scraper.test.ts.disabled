import { HTMLPlaywrightScraper } from "../html-playwright-scraper";
import { validateGig } from "@gigateer/contracts";

// Mock the scraper dependencies to avoid browser automation in tests
jest.mock("@gigateer/scraper", () => ({
  ...jest.requireActual("@gigateer/scraper"),
  createStealthBrowser: jest.fn(),
  checkRobotsTxt: jest.fn(),
  HTMLParser: jest.fn(),
}));

import { 
  createStealthBrowser, 
  checkRobotsTxt, 
  HTMLParser 
} from "@gigateer/scraper";

const mockCreateStealthBrowser = createStealthBrowser as jest.MockedFunction<typeof createStealthBrowser>;
const mockCheckRobotsTxt = checkRobotsTxt as jest.MockedFunction<typeof checkRobotsTxt>;
const mockHTMLParser = HTMLParser as jest.MockedClass<typeof HTMLParser>;

describe("HTMLPlaywrightScraper", () => {
  let scraper: HTMLPlaywrightScraper;
  let mockBrowser: any;
  let mockPage: any;
  let mockParser: any;

  beforeEach(() => {
    scraper = new HTMLPlaywrightScraper(
      "https://example.com",
      "test-scraper",
      ["https://example.com/events"],
      {
        title: [".event-title"],
        date: [".event-date"],
        venue: [".venue"],
      }
    );

    mockPage = {
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue("<html><body>Mock HTML</body></html>"),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      createPage: jest.fn().mockResolvedValue(mockPage),
      navigateWithRetry: jest.fn().mockResolvedValue(undefined),
      simulateHumanScrolling: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockParser = {
      extractStructuredEventData: jest.fn().mockReturnValue([]),
      extractEventData: jest.fn().mockReturnValue({}),
    };

    mockCreateStealthBrowser.mockReturnValue(mockBrowser);
    mockCheckRobotsTxt.mockResolvedValue(true);
    mockHTMLParser.mockImplementation(() => mockParser);

    jest.clearAllMocks();
  });

  describe("metadata", () => {
    test("should have correct metadata", () => {
      expect(scraper.upstreamMeta.name).toBe("test-scraper");
      expect(scraper.upstreamMeta.rateLimitPerMin).toBe(6);
      expect(scraper.upstreamMeta.defaultSchedule).toBe("0 */6 * * *");
    });
  });

  describe("fetchRaw", () => {
    test("should scrape pages and return event data", async () => {
      const mockStructuredEvents = [
        {
          title: "Jazz Night at Blue Note",
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Blue Note NYC",
          address: "131 W 3rd St, New York, NY",
          price: "25.00 USD",
          artists: ["John Doe Trio"],
          genres: ["Jazz"],
          eventUrl: "https://example.com/events/jazz-night",
          imageUrls: ["https://example.com/poster.jpg"]
        }
      ];

      mockParser.extractStructuredEventData.mockReturnValue(mockStructuredEvents);

      const result = await scraper.fetchRaw();

      expect(result).toEqual(mockStructuredEvents);
      expect(mockCheckRobotsTxt).toHaveBeenCalledWith("https://example.com", "/", "Gigateer");
      expect(mockBrowser.createPage).toHaveBeenCalled();
      expect(mockBrowser.navigateWithRetry).toHaveBeenCalledWith(
        mockPage, 
        "https://example.com/events", 
        "test-scraper"
      );
      expect(mockParser.extractStructuredEventData).toHaveBeenCalled();
    });

    test("should fall back to custom extraction if no structured data", async () => {
      const mockCustomEvent = {
        title: "Custom Extracted Event",
        dateStart: "2024-03-15T20:00:00Z",
        venue: "Test Venue",
      };

      mockParser.extractStructuredEventData.mockReturnValue([]);
      mockParser.extractEventData.mockReturnValue(mockCustomEvent);

      const result = await scraper.fetchRaw();

      expect(result).toEqual([mockCustomEvent]);
      expect(mockParser.extractEventData).toHaveBeenCalled();
    });

    test("should respect robots.txt", async () => {
      mockCheckRobotsTxt.mockResolvedValue(false);

      await expect(scraper.fetchRaw()).rejects.toThrow("Robots.txt disallows crawling");
      expect(mockBrowser.createPage).not.toHaveBeenCalled();
    });

    test("should handle scraping errors gracefully", async () => {
      mockBrowser.navigateWithRetry.mockRejectedValue(new Error("Navigation failed"));

      const result = await scraper.fetchRaw();

      expect(result).toEqual([]);
      // Should continue with cleanup
      expect(mockPage.close).toHaveBeenCalled();
    });

    test("should handle multiple URLs", async () => {
      const scraperWithMultipleUrls = new HTMLPlaywrightScraper(
        "https://example.com",
        "multi-url-scraper",
        ["https://example.com/events", "https://example.com/calendar"]
      );

      const mockEvent = { title: "Event", dateStart: "2024-03-15T20:00:00Z" };
      mockParser.extractEventData.mockReturnValue(mockEvent);
      
      const result = await scraperWithMultipleUrls.fetchRaw();

      expect(mockBrowser.createPage).toHaveBeenCalledTimes(2);
      expect(mockBrowser.navigateWithRetry).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockEvent, mockEvent]);
    });
  });

  describe("normalize", () => {
    test("should normalize HTML event data to valid gigs", async () => {
      const rawData = [
        {
          title: "Jazz Night at Blue Note",
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Blue Note NYC",
          address: "131 W 3rd St, New York, NY",
          price: "$25-35",
          artists: ["John Doe Trio", "Jane Smith"],
          genres: ["Jazz"],
          eventUrl: "https://example.com/events/jazz-night",
          ticketsUrl: "https://example.com/tickets/123",
          imageUrls: ["https://example.com/poster.jpg"]
        }
      ];

      const result = await scraper.normalize(rawData);

      expect(result).toHaveLength(1);

      const gig = result[0];
      expect(gig.title).toBe("Jazz Night at Blue Note");
      expect(gig.source).toBe("test-scraper");
      expect(gig.dateStart).toBe("2024-03-15T20:00:00Z");
      expect(gig.venue.name).toBe("Blue Note NYC");
      expect(gig.venue.address).toBe("131 W 3rd St, New York, NY");
      expect(gig.venue.city).toBe("New York");
      expect(gig.venue.country).toBe("NY");
      expect(gig.artists).toEqual(["John Doe Trio", "Jane Smith"]);
      expect(gig.genre).toContain("Jazz");
      expect(gig.price?.min).toBe(25);
      expect(gig.price?.max).toBe(35);
      expect(gig.eventUrl).toBe("https://example.com/events/jazz-night");
      expect(gig.ticketsUrl).toBe("https://example.com/tickets/123");
      expect(gig.images).toEqual(["https://example.com/poster.jpg"]);

      // Validate that it's a proper Gig object
      expect(() => validateGig(gig)).not.toThrow();
    });

    test("should skip events without title", async () => {
      const rawData = [
        {
          // Missing title
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Blue Note NYC",
        },
        {
          title: "Valid Event",
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Test Venue",
        }
      ];

      const result = await scraper.normalize(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid Event");
    });

    test("should skip events without dateStart", async () => {
      const rawData = [
        {
          title: "Event Without Date",
          venue: "Blue Note NYC",
        },
        {
          title: "Valid Event",
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Test Venue",
        }
      ];

      const result = await scraper.normalize(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid Event");
    });

    test("should extract venue from title if venue field is empty", async () => {
      const rawData = [
        {
          title: "Jazz Night @ Blue Note NYC",
          dateStart: "2024-03-15T20:00:00Z",
        }
      ];

      const result = await scraper.normalize(rawData);

      expect(result[0].venue.name).toBe("Blue Note NYC");
    });

    test("should handle normalization errors gracefully", async () => {
      const rawData = [
        {
          title: "Valid Event",
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Valid Venue",
        },
        {
          // This should cause validation to fail
          title: null,
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Test Venue",
        }
      ];

      const result = await scraper.normalize(rawData);

      // Should still process the valid event
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid Event");
    });
  });

  describe("cleanup", () => {
    test("should close browser on cleanup", async () => {
      // First call fetchRaw to initialize browser
      await scraper.fetchRaw();
      
      await scraper.cleanup();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test("should handle cleanup when browser is null", async () => {
      // Don't call fetchRaw, so browser remains null
      await expect(scraper.cleanup()).resolves.not.toThrow();
    });
  });

  describe("venue normalization", () => {
    test("should parse address for city and country", async () => {
      const rawData = [
        {
          title: "Event",
          dateStart: "2024-03-15T20:00:00Z",
          venue: "Blue Note",
          address: "131 W 3rd St, New York, NY, United States",
        }
      ];

      const result = await scraper.normalize(rawData);

      expect(result[0].venue.name).toBe("Blue Note");
      expect(result[0].venue.address).toBe("131 W 3rd St, New York, NY, United States");
      expect(result[0].venue.city).toBe("NY");
      expect(result[0].venue.country).toBe("United States");
    });

    test("should fallback to TBD for missing venue", async () => {
      const rawData = [
        {
          title: "Event",
          dateStart: "2024-03-15T20:00:00Z",
        }
      ];

      const result = await scraper.normalize(rawData);

      expect(result[0].venue.name).toBe("TBD");
    });
  });
});