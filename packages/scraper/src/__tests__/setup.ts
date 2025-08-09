// Test setup file for Jest
// This file is run before each test file

// Set up global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // Suppress expected errors/warnings in tests unless explicitly testing them
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;