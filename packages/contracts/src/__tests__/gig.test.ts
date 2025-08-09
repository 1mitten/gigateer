import { GigSchema, type Gig } from "../gig";

describe("GigSchema", () => {
  const validGig: Gig = {
    id: "the-venue-amazing-concert-2024-01-15t20-00-00z-amsterdam",
    source: "songkick",
    sourceId: "12345",
    title: "Amazing Concert",
    artists: ["Artist One", "Artist Two"],
    genre: ["rock", "indie"],
    dateStart: "2024-01-15T20:00:00Z",
    dateEnd: "2024-01-15T23:00:00Z",
    timezone: "Europe/Amsterdam",
    venue: {
      name: "The Venue",
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
    eventUrl: "https://venue.example.com/events/amazing-concert",
    images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    updatedAt: "2024-01-10T10:00:00Z",
    hash: "abc123def456",
  };

  describe("Valid data validation", () => {
    it("should validate a complete valid gig object", () => {
      expect(() => GigSchema.parse(validGig)).not.toThrow();
      const result = GigSchema.parse(validGig);
      expect(result).toEqual(validGig);
    });

    it("should validate minimal required fields", () => {
      const minimalGig = {
        id: "minimal-gig",
        source: "test-source",
        title: "Test Event",
        dateStart: "2024-01-15T20:00:00Z",
        venue: {
          name: "Test Venue",
        },
        updatedAt: "2024-01-10T10:00:00Z",
        hash: "testhash",
      };

      expect(() => GigSchema.parse(minimalGig)).not.toThrow();
      const result = GigSchema.parse(minimalGig);
      
      // Check defaults are applied
      expect(result.artists).toEqual([]);
      expect(result.genre).toEqual([]);
      expect(result.status).toBe("scheduled");
      expect(result.images).toEqual([]);
    });

    it("should handle null price fields", () => {
      const gigWithNullPrice = {
        ...validGig,
        price: {
          min: null,
          max: null,
          currency: null,
        },
      };

      expect(() => GigSchema.parse(gigWithNullPrice)).not.toThrow();
    });

    it("should handle optional price object", () => {
      const gigWithoutPrice = {
        ...validGig,
        price: undefined,
      };

      expect(() => GigSchema.parse(gigWithoutPrice)).not.toThrow();
    });
  });

  describe("Invalid data validation", () => {
    it("should reject missing required fields", () => {
      const invalidGigs = [
        { ...validGig, id: undefined },
        { ...validGig, source: undefined },
        { ...validGig, title: undefined },
        { ...validGig, dateStart: undefined },
        { ...validGig, venue: undefined },
        { ...validGig, updatedAt: undefined },
        { ...validGig, hash: undefined },
      ];

      invalidGigs.forEach((gig) => {
        expect(() => GigSchema.parse(gig)).toThrow();
      });
    });

    it("should reject invalid data types", () => {
      const invalidGigs = [
        { ...validGig, id: 123 },
        { ...validGig, artists: "not an array" },
        { ...validGig, genre: ["valid", 123] },
        { ...validGig, venue: { name: 123 } },
        { ...validGig, price: { min: "not a number", max: 50, currency: "EUR" } },
      ];

      invalidGigs.forEach((gig) => {
        expect(() => GigSchema.parse(gig)).toThrow();
      });
    });

    it("should reject invalid status values", () => {
      const gigWithInvalidStatus = {
        ...validGig,
        status: "invalid-status",
      };

      expect(() => GigSchema.parse(gigWithInvalidStatus)).toThrow();
    });

    it("should reject invalid URLs", () => {
      const invalidUrlGigs = [
        { ...validGig, ticketsUrl: "not-a-url" },
        { ...validGig, eventUrl: "also-not-a-url" },
        { ...validGig, images: ["valid-url.jpg", "not-a-url"] },
      ];

      invalidUrlGigs.forEach((gig) => {
        expect(() => GigSchema.parse(gig)).toThrow();
      });
    });

    it("should reject invalid venue structure", () => {
      const invalidVenues = [
        { ...validGig, venue: { name: undefined } },
        { ...validGig, venue: { name: "Valid", lat: "not-a-number" } },
        { ...validGig, venue: { name: "Valid", lng: "not-a-number" } },
      ];

      invalidVenues.forEach((gig) => {
        expect(() => GigSchema.parse(gig)).toThrow();
      });
    });
  });

  describe("Default values", () => {
    it("should apply default empty arrays for artists, genre, and images", () => {
      const gigWithoutArrays = {
        id: "test-gig",
        source: "test-source",
        title: "Test Event",
        dateStart: "2024-01-15T20:00:00Z",
        venue: { name: "Test Venue" },
        updatedAt: "2024-01-10T10:00:00Z",
        hash: "testhash",
      };

      const result = GigSchema.parse(gigWithoutArrays);
      expect(result.artists).toEqual([]);
      expect(result.genre).toEqual([]);
      expect(result.images).toEqual([]);
    });

    it("should apply default 'scheduled' status", () => {
      const gigWithoutStatus = {
        id: "test-gig",
        source: "test-source",
        title: "Test Event",
        dateStart: "2024-01-15T20:00:00Z",
        venue: { name: "Test Venue" },
        updatedAt: "2024-01-10T10:00:00Z",
        hash: "testhash",
      };

      const result = GigSchema.parse(gigWithoutStatus);
      expect(result.status).toBe("scheduled");
    });
  });

  describe("Optional fields", () => {
    it("should handle optional fields being undefined", () => {
      const gigWithOptionals = {
        id: "test-gig",
        source: "test-source",
        title: "Test Event",
        dateStart: "2024-01-15T20:00:00Z",
        venue: { name: "Test Venue" },
        updatedAt: "2024-01-10T10:00:00Z",
        hash: "testhash",
        sourceId: undefined,
        dateEnd: undefined,
        timezone: undefined,
        price: undefined,
        ageRestriction: undefined,
        ticketsUrl: undefined,
        eventUrl: undefined,
      };

      expect(() => GigSchema.parse(gigWithOptionals)).not.toThrow();
    });
  });

  describe("Status enum validation", () => {
    it("should accept valid status values", () => {
      const validStatuses = ["scheduled", "cancelled", "postponed"];
      
      validStatuses.forEach((status) => {
        const gig = { ...validGig, status };
        expect(() => GigSchema.parse(gig)).not.toThrow();
      });
    });
  });
});