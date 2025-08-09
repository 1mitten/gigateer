import { RSSParser, ICalParser, JSONFeedParser, FeedParser } from "../feed-parser";

describe("RSSParser", () => {
  const mockRSSFeed = `
    <rss version="2.0">
      <channel>
        <title>Test Events Feed</title>
        <item>
          <title>Jazz Night at Blue Note</title>
          <description>An evening of smooth jazz featuring local artists</description>
          <link>https://example.com/events/jazz-night</link>
          <pubDate>2024-03-15T20:00:00Z</pubDate>
          <category>Jazz</category>
          <category>Music</category>
        </item>
        <item>
          <title>Rock Concert @ The Forum</title>
          <pubDate>2024-03-16T21:00:00Z</pubDate>
          <category>Rock</category>
        </item>
      </channel>
    </rss>
  `;

  test("should parse RSS feed correctly", () => {
    const items = RSSParser.parseXML(mockRSSFeed, "test-source");
    
    expect(items).toHaveLength(2);
    
    expect(items[0]).toMatchObject({
      title: "Jazz Night at Blue Note",
      description: "An evening of smooth jazz featuring local artists",
      link: "https://example.com/events/jazz-night",
      categories: ["Jazz", "Music"],
    });
    
    expect(items[1]).toMatchObject({
      title: "Rock Concert @ The Forum",
      categories: ["Rock"],
    });
  });

  test("should handle empty RSS feed", () => {
    const emptyFeed = `<rss><channel></channel></rss>`;
    expect(() => RSSParser.parseXML(emptyFeed, "test-source")).toThrow();
  });

  test("should handle malformed RSS", () => {
    expect(() => RSSParser.parseXML("invalid xml", "test-source")).toThrow();
  });
});

describe("ICalParser", () => {
  const mockICalFeed = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1@example.com
DTSTART:20240315T200000Z
DTEND:20240315T230000Z
SUMMARY:Jazz Night at Blue Note
DESCRIPTION:An evening of smooth jazz
LOCATION:Blue Note NYC, 131 W 3rd St, New York, NY
CATEGORIES:Jazz,Music
URL:https://example.com/events/jazz-night
END:VEVENT
BEGIN:VEVENT
UID:test-event-2@example.com
DTSTART:20240316T210000Z
SUMMARY:Rock Concert
LOCATION:The Forum
CATEGORIES:Rock
END:VEVENT
END:VCALENDAR
  `;

  test("should parse iCal feed correctly", () => {
    const items = ICalParser.parseICS(mockICalFeed, "test-source");
    
    expect(items).toHaveLength(2);
    
    expect(items[0]).toMatchObject({
      title: "Jazz Night at Blue Note",
      description: "An evening of smooth jazz",
      location: "Blue Note NYC, 131 W 3rd St, New York, NY",
      categories: ["Jazz", "Music"],
      link: "https://example.com/events/jazz-night",
    });

    expect(items[1]).toMatchObject({
      title: "Rock Concert",
      location: "The Forum",
      categories: ["Rock"],
    });
  });

  test("should handle empty iCal feed", () => {
    const emptyFeed = "BEGIN:VCALENDAR\nEND:VCALENDAR";
    const items = ICalParser.parseICS(emptyFeed, "test-source");
    expect(items).toHaveLength(0);
  });
});

describe("JSONFeedParser", () => {
  const mockJSONFeed = {
    version: "https://jsonfeed.org/version/1",
    title: "Test Events Feed",
    items: [
      {
        id: "1",
        title: "Jazz Night at Blue Note",
        content_text: "An evening of smooth jazz",
        url: "https://example.com/events/jazz-night",
        date_published: "2024-03-15T20:00:00Z",
        tags: ["Jazz", "Music"]
      },
      {
        id: "2",
        title: "Rock Concert",
        date_published: "2024-03-16T21:00:00Z",
        tags: ["Rock"]
      }
    ]
  };

  const mockGenericEventsArray = [
    {
      name: "Jazz Night",
      description: "An evening of smooth jazz",
      date_start: "2024-03-15T20:00:00Z",
      venue: "Blue Note NYC",
      categories: ["Jazz"]
    },
    {
      title: "Rock Concert",
      start_date: "2024-03-16T21:00:00Z",
      location: "The Forum"
    }
  ];

  test("should parse JSON Feed format", () => {
    const items = JSONFeedParser.parseJSON(JSON.stringify(mockJSONFeed), "test-source");
    
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Jazz Night at Blue Note",
      description: "An evening of smooth jazz",
      link: "https://example.com/events/jazz-night",
      categories: ["Jazz", "Music"],
    });
  });

  test("should parse generic events array", () => {
    const items = JSONFeedParser.parseJSON(JSON.stringify(mockGenericEventsArray), "test-source");
    
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Jazz Night",
      description: "An evening of smooth jazz",
      location: "Blue Note NYC",
      categories: ["Jazz"],
    });
  });

  test("should handle events wrapper object", () => {
    const wrappedEvents = { events: mockGenericEventsArray };
    const items = JSONFeedParser.parseJSON(JSON.stringify(wrappedEvents), "test-source");
    
    expect(items).toHaveLength(2);
  });

  test("should handle invalid JSON", () => {
    expect(() => JSONFeedParser.parseJSON("invalid json", "test-source")).toThrow();
  });
});

describe("FeedParser", () => {
  test("should detect RSS format", () => {
    const rssContent = '<rss><channel><item><title>Test</title><pubDate>2024-03-15T20:00:00Z</pubDate></item></channel></rss>';
    const items = FeedParser.parseContent(rssContent, "text/xml", "test-source");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test");
  });

  test("should detect iCal format", () => {
    const icalContent = `
BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Test Event
DTSTART:20240315T200000Z
END:VEVENT
END:VCALENDAR
    `;
    const items = FeedParser.parseContent(icalContent, "text/calendar", "test-source");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test Event");
  });

  test("should detect JSON format", () => {
    const jsonContent = JSON.stringify([{
      title: "Test Event",
      date_start: "2024-03-15T20:00:00Z"
    }]);
    const items = FeedParser.parseContent(jsonContent, "application/json", "test-source");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test Event");
  });

  test("should auto-detect format from content", () => {
    const jsonContent = '[{"title":"Test","date_start":"2024-03-15T20:00:00Z"}]';
    const items = FeedParser.parseContent(jsonContent, "", "test-source");
    expect(items).toHaveLength(1);
  });

  test("should throw error for unrecognized format", () => {
    expect(() => FeedParser.parseContent("plain text", "", "test-source")).toThrow();
  });
});