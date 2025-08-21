/**
 * Application Configuration
 * Central configuration for all app settings, constants, and defaults
 * 
 * This file implements DRY principles by centralizing all configuration
 * values that were previously scattered throughout the codebase.
 */

export const APP_CONFIG = {
  /** Pagination settings */
  pagination: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    FIRST_PAGE: 1,
  },

  /** Date filter configuration */
  dateFilters: {
    DEFAULT_FILTER: 'all' as const,
    SUPPORTED_FILTERS: ['all', 'today', 'tomorrow', 'this-week', 'this-month'] as const,
    TIMEOUT_MS: 30000,
  },

  /** API configuration */
  api: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    CACHE_TTL: 300000, // 5 minutes
    LOADING_TIMEOUT: 60000, // 60 seconds max loading time
  },

  /** UI configuration */
  ui: {
    ANIMATIONS: {
      TRANSITION_DURATION: 150,
      DEBOUNCE_DELAY: 500,
      SEARCH_DEBOUNCE: 500,
    },
    BREAKPOINTS: {
      mobile: 768,
      tablet: 1024,
      desktop: 1280,
    },
    LOADING_STATES: {
      SKELETON_ROWS: 6,
      MINIMUM_LOADING_TIME: 150,
    }
  },

  /** Search & Filter defaults */
  search: {
    MIN_QUERY_LENGTH: 3,
    MAX_QUERY_LENGTH: 100,
    PLACEHOLDER_TEXTS: {
      search: 'Search for artists, venues, or events...',
      city: 'e.g., London, Manchester',
      tags: 'e.g., Rock, Jazz, Electronic',
      venue: 'e.g., O2 Arena, Royal Albert Hall',
    }
  },

  /** Error messages */
  messages: {
    ERRORS: {
      NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
      TIMEOUT_ERROR: 'Request timed out. Please try refreshing the page.',
      GENERIC_ERROR: 'An unexpected error occurred',
      NO_RESULTS: 'No gigs found matching your criteria',
      LOADING_FAILED: 'Failed to load gigs',
    },
    SUCCESS: {
      DATA_LOADED: 'Gigs loaded successfully',
      FILTERS_APPLIED: 'Filters applied',
    },
    INFO: {
      LOADING: 'Loading...',
      SEARCHING: 'Searching...',
      FILTERING: 'Applying filters...',
    }
  },

  /** Feature flags */
  features: {
    PWA_ENABLED: process.env.NODE_ENV === 'production',
    DEBUG_MODE: process.env.NODE_ENV === 'development',
    ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
  }
} as const;

/** Type definitions derived from configuration */
export type DateFilterOption = typeof APP_CONFIG.dateFilters.SUPPORTED_FILTERS[number];
export type BreakpointKey = keyof typeof APP_CONFIG.ui.BREAKPOINTS;
export type ErrorMessageKey = keyof typeof APP_CONFIG.messages.ERRORS;

/** Environment-specific configuration */
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // API URLs
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  
  // External services
  mongoUrl: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/gigateer',
  
  // Feature toggles
  enablePWA: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ANALYTICS_ID ? true : false,
} as const;