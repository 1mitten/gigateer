import {
  createSlug,
  generateGigId,
  generateGigHash,
  validateGig,
  safeValidateGig,
} from "../utils";
import { type Gig } from "../gig";

describe("Utils", () => {
  const mockGig: Gig = {
    id: "test-id",
    source: "test-source",
    sourceId: "test-source-id",
    title: "Test Concert",
    artists: ["Artist One", "Artist Two"],
    genre: ["rock", "indie"],
    dateStart: "2024-01-15T20:00:00Z",
    dateEnd: "2024-01-15T23:00:00Z",
    timezone: "Europe/Amsterdam",
    venue: {
      name: "Test Venue",
      address: "123 Music Street",
      city: "Amsterdam",
      country: "Netherlands",
      lat: 52.3676,
      lng: 4.9041,
    },
    price: {
      min: 25.0,
      max: 45.0,
      currency: "EUR",
    },
    ageRestriction: "18+",
    status: "scheduled",
    ticketsUrl: "https://tickets.example.com/event/12345",
    eventUrl: "https://venue.example.com/events/test-concert",
    images: ["https://example.com/image1.jpg"],
    updatedAt: "2024-01-10T10:00:00Z",
    hash: "test-hash",
  };

  describe("createSlug", () => {
    it("should create URL-safe slugs", () => {
      expect(createSlug("Hello World")).toBe("hello-world");
      expect(createSlug("The Amazing Concert!")).toBe("the-amazing-concert");
      expect(createSlug("Rock & Roll")).toBe("rock-roll");
      expect(createSlug("Test_Event-2024")).toBe("test-event-2024");
    });

    it("should handle special characters and spaces", () => {
      expect(createSlug("Concert @ The Venue (2024)")).toBe("concert-the-venue-2024");
      expect(createSlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
      expect(createSlug("---Leading-and-trailing---")).toBe("leading-and-trailing");
    });

    it("should handle empty and whitespace strings", () => {
      expect(createSlug("")).toBe("");
      expect(createSlug("   ")).toBe("");
      expect(createSlug("---")).toBe("");
    });

    it("should preserve numbers and basic characters", () => {
      expect(createSlug("Event 2024 v1.5")).toBe("event-2024-v15");
      expect(createSlug("Band-Name_123")).toBe("band-name-123");
    });
  });

  describe("generateGigId", () => {
    it("should generate consistent IDs from venue, title, date, and city", () => {
      const id1 = generateGigId("The Venue", "Amazing Concert", "2024-01-15T20:00:00Z", "Amsterdam");
      const id2 = generateGigId("The Venue", "Amazing Concert", "2024-01-15T20:00:00Z", "Amsterdam");
      
      expect(id1).toBe(id2);
      expect(id1).toBe("the-venue-amazing-concert-2024-01-15t200000z-amsterdam");
    });

    it("should handle missing city", () => {
      const id = generateGigId("The Venue", "Concert", "2024-01-15T20:00:00Z");
      expect(id).toBe("the-venue-concert-2024-01-15t200000z");
    });

    it("should handle special characters in inputs", () => {
      const id = generateGigId("The O2 Arena", "Rock & Roll Show!", "2024-01-15T20:00:00Z", "London");
      expect(id).toBe("the-o2-arena-rock-roll-show-2024-01-15t200000z-london");
    });

    it("should create different IDs for different inputs", () => {
      const id1 = generateGigId("Venue A", "Concert", "2024-01-15T20:00:00Z", "Amsterdam");
      const id2 = generateGigId("Venue B", "Concert", "2024-01-15T20:00:00Z", "Amsterdam");
      const id3 = generateGigId("Venue A", "Different Concert", "2024-01-15T20:00:00Z", "Amsterdam");
      const id4 = generateGigId("Venue A", "Concert", "2024-01-16T20:00:00Z", "Amsterdam");
      const id5 = generateGigId("Venue A", "Concert", "2024-01-15T20:00:00Z", "Berlin");
      
      const ids = [id1, id2, id3, id4, id5];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5); // All should be different
    });
  });

  describe("generateGigHash", () => {
    it("should generate consistent hashes for identical gig data", () => {
      const hash1 = generateGigHash(mockGig);
      const hash2 = generateGigHash(mockGig);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });

    it("should generate different hashes for different gig data", () => {
      const gig1 = { ...mockGig };
      const gig2 = { ...mockGig, title: "Different Title" };
      const gig3 = { ...mockGig, artists: ["Different Artist"] };
      
      const hash1 = generateGigHash(gig1);
      const hash2 = generateGigHash(gig2);
      const hash3 = generateGigHash(gig3);
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it("should ignore fields not used for hashing", () => {
      const gig1 = { ...mockGig };
      const gig2 = { ...mockGig, id: "different-id", updatedAt: "different-time", hash: "different-hash" };
      
      const hash1 = generateGigHash(gig1);
      const hash2 = generateGigHash(gig2);
      
      expect(hash1).toBe(hash2); // Should be the same since we ignore id, updatedAt, hash
    });

    it("should handle partial gig objects", () => {
      const partialGig = {
        title: "Test Concert",
        artists: ["Artist"],
        venue: { name: "Test Venue" },
      };
      
      expect(() => generateGigHash(partialGig)).not.toThrow();
      const hash = generateGigHash(partialGig);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should create stable JSON with sorted keys", () => {
      // Create two objects with same data but different property order
      const gig1 = {
        title: "Concert",
        artists: ["Artist"],
        venue: { name: "Venue" },
      };
      
      const gig2 = {
        venue: { name: "Venue" },
        title: "Concert",
        artists: ["Artist"],
      };
      
      const hash1 = generateGigHash(gig1);
      const hash2 = generateGigHash(gig2);
      
      expect(hash1).toBe(hash2); // Order should not matter
    });
  });

  describe("validateGig", () => {
    it("should successfully validate valid gig objects", () => {
      expect(() => validateGig(mockGig)).not.toThrow();
      const result = validateGig(mockGig);
      expect(result).toEqual(mockGig);
    });

    it("should throw on invalid gig objects", () => {
      const invalidGig = { ...mockGig, id: undefined };
      expect(() => validateGig(invalidGig)).toThrow();
    });

    it("should apply default values during validation", () => {
      const gigWithoutDefaults = {
        id: "test-id",
        source: "test-source",
        title: "Test Concert",
        dateStart: "2024-01-15T20:00:00Z",
        venue: { name: "Test Venue" },
        updatedAt: "2024-01-10T10:00:00Z",
        hash: "test-hash",
      };

      const result = validateGig(gigWithoutDefaults);
      expect(result.artists).toEqual([]);
      expect(result.genre).toEqual([]);
      expect(result.images).toEqual([]);
      expect(result.status).toBe("scheduled");
    });
  });

  describe("safeValidateGig", () => {
    it("should return success for valid gig objects", () => {
      const result = safeValidateGig(mockGig);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockGig);
      }
    });

    it("should return error for invalid gig objects", () => {
      const invalidGig = { ...mockGig, id: undefined };
      const result = safeValidateGig(invalidGig);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe("string");
      }
    });

    it("should handle completely invalid data", () => {
      const result = safeValidateGig("not an object");
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Expected object");
      }
    });

    it("should handle null and undefined", () => {
      const result1 = safeValidateGig(null);
      const result2 = safeValidateGig(undefined);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });
});