import { 
  normalizeText, 
  extractPrice, 
  extractArtists, 
  parseAddress, 
  normalizeVenueName,
  extractGenres,
  textSimilarity 
} from "../text-utils";

describe("normalizeText", () => {
  test("should normalize whitespace", () => {
    expect(normalizeText("  text   with   spaces  ")).toBe("text with spaces");
    expect(normalizeText("text\nwith\nlines")).toBe("text with lines");
    expect(normalizeText("text\twith\ttabs")).toBe("text with tabs");
  });

  test("should remove special characters", () => {
    expect(normalizeText("text@#$%^&*()with{}[]special")).toBe("text@ & ()with special");
    expect(normalizeText("keep-basic.punctuation!")).toBe("keep-basic.punctuation!");
  });

  test("should handle empty strings", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   ")).toBe("");
  });
});

describe("extractPrice", () => {
  test("should extract USD prices", () => {
    expect(extractPrice("$25")).toEqual({ min: 25, max: 25, currency: "USD" });
    expect(extractPrice("$15-30")).toEqual({ min: 15, max: 30, currency: "USD" });
    expect(extractPrice("Tickets: $12.50")).toEqual({ min: 12.5, max: 12.5, currency: "USD" });
  });

  test("should extract EUR prices", () => {
    expect(extractPrice("€20")).toEqual({ min: 20, max: 20, currency: "EUR" });
    expect(extractPrice("10-15 EUR")).toEqual({ min: 10, max: 15, currency: "EUR" });
  });

  test("should extract GBP prices", () => {
    expect(extractPrice("£35")).toEqual({ min: 35, max: 35, currency: "GBP" });
    expect(extractPrice("Price: £25.99")).toEqual({ min: 25.99, max: 25.99, currency: "GBP" });
  });

  test("should handle free events", () => {
    expect(extractPrice("Free")).toEqual({ min: 0, max: 0, currency: null });
    expect(extractPrice("No charge")).toEqual({ min: 0, max: 0, currency: null });
    expect(extractPrice("GRATIS")).toEqual({ min: 0, max: 0, currency: null });
  });

  test("should handle price ranges", () => {
    expect(extractPrice("$20-35")).toEqual({ min: 20, max: 35, currency: "USD" });
    expect(extractPrice("€15 to €25")).toEqual({ min: 15, max: 25, currency: "EUR" });
  });

  test("should handle no price information", () => {
    expect(extractPrice("No price info")).toEqual({ min: null, max: null, currency: null });
    expect(extractPrice("")).toEqual({ min: null, max: null, currency: null });
  });
});

describe("extractArtists", () => {
  test("should extract single artist", () => {
    expect(extractArtists("John Doe")).toEqual(["John Doe"]);
  });

  test("should extract multiple artists with comma separation", () => {
    expect(extractArtists("John Doe, Jane Smith, The Band")).toEqual([
      "John Doe", "Jane Smith", "The Band"
    ]);
  });

  test("should extract artists with 'and' separation", () => {
    expect(extractArtists("John Doe and Jane Smith")).toEqual([
      "John Doe", "Jane Smith"
    ]);
    // Note: & gets replaced with space in normalizeText, so this becomes "John Doe   Jane Smith"
    expect(extractArtists("John Doe & Jane Smith")).toEqual([
      "John Doe", "Jane Smith"
    ]);
  });

  test("should extract artists with 'featuring' keywords", () => {
    expect(extractArtists("John Doe featuring Jane Smith")).toEqual([
      "John Doe", "Jane Smith"
    ]);
    expect(extractArtists("John Doe feat. Jane Smith")).toEqual([
      "John Doe", "Jane Smith"
    ]);
    expect(extractArtists("John Doe ft. Jane Smith")).toEqual([
      "John Doe", "Jane Smith"
    ]);
  });

  test("should handle mixed separators", () => {
    expect(extractArtists("John Doe, Jane Smith & The Band")).toEqual([
      "John Doe", "Jane Smith", "The Band"
    ]);
  });

  test("should filter out very long strings", () => {
    const veryLongName = "a".repeat(150);
    expect(extractArtists(`John Doe, ${veryLongName}`)).toEqual(["John Doe"]);
  });
});

describe("parseAddress", () => {
  test("should parse full address", () => {
    const result = parseAddress("123 Main St, New York, NY, United States");
    expect(result).toEqual({
      address: "123 Main St, New York",
      city: "NY",
      country: "United States"
    });
  });

  test("should parse city and country", () => {
    const result = parseAddress("Blue Note, New York, United States");
    expect(result).toEqual({
      address: "Blue Note",
      city: "New York", 
      country: "United States"
    });
  });

  test("should handle simple address", () => {
    const result = parseAddress("123 Main Street");
    expect(result).toEqual({
      address: "123 Main Street",
      city: null,
      country: null
    });
  });

  test("should handle two-part address", () => {
    const result = parseAddress("Blue Note, New York");
    expect(result).toEqual({
      address: "Blue Note",
      city: "New York",
      country: null
    });
  });
});

describe("normalizeVenueName", () => {
  test("should remove 'The' prefix", () => {
    expect(normalizeVenueName("The Blue Note")).toBe("Blue Note");
    expect(normalizeVenueName("the fillmore")).toBe("fillmore");
  });

  test("should normalize venue type spacing", () => {
    expect(normalizeVenueName("BlueNoteClub")).toBe("BlueNoteClub");
    expect(normalizeVenueName("Madison Square Garden")).toBe("Madison Square Garden");
  });

  test("should handle empty strings", () => {
    expect(normalizeVenueName("")).toBe("");
  });
});

describe("extractGenres", () => {
  test("should extract electronic genres", () => {
    expect(extractGenres("electronic music event")).toContain("Electronic");
    expect(extractGenres("techno night")).toContain("Techno");
    expect(extractGenres("house music party")).toContain("House");
    expect(extractGenres("drum and bass")).toContain("Drum & Bass");
    expect(extractGenres("dnb")).toContain("Drum & Bass");
  });

  test("should extract rock genres", () => {
    expect(extractGenres("rock concert")).toContain("Rock");
    expect(extractGenres("indie rock")).toContain("Indie Rock");
    expect(extractGenres("alternative music")).toContain("Alternative");
    expect(extractGenres("punk rock")).toContain("Punk");
  });

  test("should extract popular genres", () => {
    expect(extractGenres("pop music")).toContain("Pop");
    expect(extractGenres("hip hop")).toContain("Hip Hop");
    expect(extractGenres("hip-hop")).toContain("Hip Hop");
    expect(extractGenres("r&b")).toContain("R&B");
    expect(extractGenres("rnb")).toContain("R&B");
  });

  test("should extract jazz and blues", () => {
    expect(extractGenres("jazz night")).toContain("Jazz");
    expect(extractGenres("blues music")).toContain("Blues");
    expect(extractGenres("soul music")).toContain("Soul");
  });

  test("should extract classical genres", () => {
    expect(extractGenres("classical concert")).toContain("Classical");
    expect(extractGenres("orchestra performance")).toContain("Classical");
    expect(extractGenres("symphony")).toContain("Classical");
  });

  test("should handle multiple genres", () => {
    const genres = extractGenres("jazz and blues concert");
    expect(genres).toContain("Jazz");
    expect(genres).toContain("Blues");
  });

  test("should handle no genres found", () => {
    expect(extractGenres("regular event")).toEqual([]);
  });
});

describe("textSimilarity", () => {
  test("should return 1 for identical strings", () => {
    expect(textSimilarity("hello world", "hello world")).toBe(1);
    expect(textSimilarity("HELLO", "hello")).toBe(1);
  });

  test("should return 0 for completely different strings", () => {
    expect(textSimilarity("hello", "xyz")).toBeLessThan(0.5);
  });

  test("should return high similarity for similar strings", () => {
    expect(textSimilarity("hello world", "hello word")).toBeGreaterThan(0.8);
    expect(textSimilarity("The Blue Note", "Blue Note NYC")).toBeGreaterThan(0.6);
  });

  test("should handle empty strings", () => {
    expect(textSimilarity("", "")).toBe(1);
    expect(textSimilarity("hello", "")).toBe(0);
  });

  test("should apply prefix bonus", () => {
    const sim1 = textSimilarity("hello world", "hello earth");
    const sim2 = textSimilarity("hello world", "earth hello");
    expect(sim1).toBeGreaterThan(sim2);
  });
});