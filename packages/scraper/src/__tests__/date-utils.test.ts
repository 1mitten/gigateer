import { 
  parseDate, 
  parseTime, 
  combineDateAndTime, 
  isFutureDate, 
  isReasonableEventDate,
  extractTimezone 
} from "../date-utils";

describe("parseDate", () => {
  test("should parse ISO 8601 dates", () => {
    const result = parseDate("2024-03-15T20:00:00Z", "test-source");
    expect(result).toBe("2024-03-15T20:00:00.000Z");
  });

  test("should parse date-only formats", () => {
    const result = parseDate("2024-03-15", "test-source");
    expect(result).toMatch(/2024-03-15T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });

  test("should parse US date formats", () => {
    const result = parseDate("03/15/2024", "test-source");
    expect(result).toMatch(/2024-03-15T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });

  test("should handle date with time", () => {
    const result = parseDate("03/15/2024 8:00 PM", "test-source");
    expect(result).toMatch(/2024-03-15T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });

  test("should throw error for invalid dates", () => {
    expect(() => parseDate("invalid-date", "test-source")).toThrow();
    expect(() => parseDate("", "test-source")).toThrow();
  });
});

describe("parseTime", () => {
  test("should parse 12-hour format with AM/PM", () => {
    expect(parseTime("8:00 PM", "test-source")).toEqual({ hour: 20, minute: 0 });
    expect(parseTime("8:30 AM", "test-source")).toEqual({ hour: 8, minute: 30 });
    expect(parseTime("12:00 PM", "test-source")).toEqual({ hour: 12, minute: 0 });
    expect(parseTime("12:00 AM", "test-source")).toEqual({ hour: 0, minute: 0 });
  });

  test("should parse 24-hour format", () => {
    expect(parseTime("20:00", "test-source")).toEqual({ hour: 20, minute: 0 });
    expect(parseTime("08:30", "test-source")).toEqual({ hour: 8, minute: 30 });
    expect(parseTime("23:59", "test-source")).toEqual({ hour: 23, minute: 59 });
  });

  test("should throw error for invalid times", () => {
    expect(() => parseTime("25:00", "test-source")).toThrow();
    expect(() => parseTime("8:60 PM", "test-source")).toThrow();
    expect(() => parseTime("invalid", "test-source")).toThrow();
  });
});

describe("combineDateAndTime", () => {
  test("should combine date and time strings", () => {
    const result = combineDateAndTime("2024-03-15", "8:00 PM", "test-source");
    expect(result).toBe("2024-03-15T20:00:00.000Z");
  });

  test("should handle date with existing time", () => {
    const result = combineDateAndTime("2024-03-15T10:00:00Z", "8:00 PM", "test-source");
    expect(result).toBe("2024-03-15T20:00:00.000Z");
  });

  test("should throw error for invalid inputs", () => {
    expect(() => combineDateAndTime("invalid-date", "8:00 PM", "test-source")).toThrow();
    expect(() => combineDateAndTime("2024-03-15", "invalid-time", "test-source")).toThrow();
  });
});

describe("isFutureDate", () => {
  test("should return true for future dates", () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isFutureDate(futureDate)).toBe(true);
  });

  test("should return false for past dates", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isFutureDate(pastDate)).toBe(false);
  });
});

describe("isReasonableEventDate", () => {
  test("should return true for recent dates", () => {
    const recentDate = new Date().toISOString();
    expect(isReasonableEventDate(recentDate)).toBe(true);
  });

  test("should return false for very old dates", () => {
    const veryOldDate = new Date("2020-01-01").toISOString();
    expect(isReasonableEventDate(veryOldDate)).toBe(false);
  });

  test("should return false for dates too far in future", () => {
    const farFutureDate = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(isReasonableEventDate(farFutureDate)).toBe(false);
  });
});

describe("extractTimezone", () => {
  test("should extract UTC timezone", () => {
    expect(extractTimezone("Event starts at 8 PM UTC")).toBe("UTC");
    expect(extractTimezone("2024-03-15 20:00 GMT+1")).toBe("GMT+1");
  });

  test("should extract US timezones", () => {
    expect(extractTimezone("Event at 8 PM EST")).toBe("EST");
    expect(extractTimezone("Doors open 7 PM PST")).toBe("PST");
  });

  test("should return undefined for no timezone", () => {
    expect(extractTimezone("Event at 8 PM")).toBeUndefined();
  });

  test("should extract generic timezone codes", () => {
    expect(extractTimezone("Event at 8 PM CET")).toBe("CET");
    expect(extractTimezone("Starts at 20:00 JST")).toBe("JST");
  });
});