import { HTMLParser } from "../html-parser";

describe("HTMLParser", () => {
  const mockEventHTML = `
    <html>
      <head>
        <meta property="og:title" content="Jazz Night at Blue Note">
        <meta property="og:description" content="An evening of smooth jazz">
        <meta property="og:url" content="https://example.com/events/jazz-night">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "Jazz Night at Blue Note",
          "description": "An evening of smooth jazz featuring local artists",
          "startDate": "2024-03-15T20:00:00Z",
          "endDate": "2024-03-15T23:00:00Z",
          "location": {
            "@type": "Place",
            "name": "Blue Note NYC",
            "address": "131 W 3rd St, New York, NY 10012"
          },
          "offers": {
            "@type": "Offer",
            "price": "25.00",
            "priceCurrency": "USD"
          },
          "performer": [
            {"@type": "Person", "name": "John Doe Trio"},
            {"@type": "Person", "name": "Jane Smith"}
          ]
        }
        </script>
      </head>
      <body>
        <h1 class="event-title">Jazz Night at Blue Note</h1>
        <div class="event-date">March 15, 2024 8:00 PM</div>
        <div class="venue">Blue Note NYC</div>
        <div class="address">131 W 3rd St, New York, NY</div>
        <div class="price">$25.00</div>
        <div class="artists">John Doe Trio, Jane Smith</div>
        <div class="genre">Jazz</div>
        <a href="/tickets/123" class="ticket-link">Buy Tickets</a>
        <img src="/images/event-poster.jpg" class="event-image" alt="Event poster">
        
        <div itemscope itemtype="https://schema.org/Event">
          <span itemprop="name">Microdata Event</span>
          <time itemprop="startDate" datetime="2024-03-16T19:00:00Z">March 16, 2024</time>
          <span itemprop="location">Test Venue</span>
        </div>
      </body>
    </html>
  `;

  let parser: HTMLParser;

  beforeEach(() => {
    parser = new HTMLParser(mockEventHTML, "test-source");
  });

  describe("Basic extraction methods", () => {
    test("should extract text from selectors", () => {
      expect(parser.extractText(".event-title")).toBe("Jazz Night at Blue Note");
      expect(parser.extractText([".nonexistent", ".event-title"])).toBe("Jazz Night at Blue Note");
      expect(parser.extractText(".nonexistent")).toBeNull();
    });

    test("should extract attributes", () => {
      expect(parser.extractAttribute("a.ticket-link", "href")).toBe("/tickets/123");
      expect(parser.extractAttribute(".nonexistent", "href")).toBeNull();
    });

    test("should extract text arrays", () => {
      const artists = parser.extractTextArray(".artists");
      expect(artists).toContain("John Doe Trio, Jane Smith");
    });

    test("should extract URLs", () => {
      const urls = parser.extractUrls("a", "https://example.com");
      expect(urls).toContain("https://example.com/tickets/123");
    });
  });

  describe("Structured data extraction", () => {
    test("should extract JSON-LD data", () => {
      const jsonLd = parser.extractJsonLd();
      expect(jsonLd).toHaveLength(1);
      expect(jsonLd[0]["@type"]).toBe("Event");
      expect(jsonLd[0].name).toBe("Jazz Night at Blue Note");
    });

    test("should extract microdata", () => {
      const microdata = parser.extractMicrodata();
      expect(microdata).toHaveLength(1);
      expect(microdata[0].name).toBe("Microdata Event");
      expect(microdata[0].location).toBe("Test Venue");
    });

    test("should extract Open Graph data", () => {
      const og = parser.extractOpenGraph();
      expect(og.title).toBe("Jazz Night at Blue Note");
      expect(og.description).toBe("An evening of smooth jazz");
      expect(og.url).toBe("https://example.com/events/jazz-night");
    });
  });

  describe("Event data extraction", () => {
    test("should extract event data with default config", () => {
      const eventData = parser.extractEventData({});
      
      expect(eventData.title).toBe("Jazz Night at Blue Note");
      expect(eventData.venue).toBe("Blue Note NYC");
      expect(eventData.address).toBe("131 W 3rd St, New York, NY");
      expect(eventData.price).toBe("25.00");
    });

    test("should extract event data with custom config", () => {
      const eventData = parser.extractEventData({
        title: [".event-title"],
        venue: [".venue"],
        price: [".price"],
        ticketsUrl: ["a.ticket-link"],
      });
      
      expect(eventData.title).toBe("Jazz Night at Blue Note");
      expect(eventData.venue).toBe("Blue Note NYC");
      expect(eventData.price).toBe("25.00");
      expect(eventData.ticketsUrl).toBe("/tickets/123");
    });

    test("should extract structured event data", () => {
      const events = parser.extractStructuredEventData();
      
      expect(events.length).toBeGreaterThan(0);
      
      // Should find JSON-LD event
      const jsonLdEvent = events.find(e => e.title === "Jazz Night at Blue Note" && e.description);
      expect(jsonLdEvent).toBeDefined();
      expect(jsonLdEvent?.venue).toBe("Blue Note NYC");
      expect(jsonLdEvent?.price).toBe("25.00 USD");
      
      // Should find microdata event
      const microdataEvent = events.find(e => e.title === "Microdata Event");
      expect(microdataEvent).toBeDefined();
      expect(microdataEvent?.venue).toBe("Test Venue");
    });
  });

  describe("Error handling", () => {
    test("should handle empty HTML", () => {
      const emptyParser = new HTMLParser("", "test-source");
      expect(emptyParser.extractText("h1")).toBeNull();
    });

    test("should handle malformed HTML gracefully", () => {
      const malformedParser = new HTMLParser("<div>unclosed div", "test-source");
      const eventData = malformedParser.extractEventData({});
      expect(eventData).toBeDefined();
    });
  });
});