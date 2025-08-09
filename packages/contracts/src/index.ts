// Export schemas and types
export { GigSchema, type Gig } from "./gig";

// Export scraper interfaces
export type {
  ScraperPlugin,
  ScraperPluginMeta,
  ScraperRunStats,
  IngestorConfig,
} from "./scraper";

// Export utility functions
export {
  createSlug,
  generateGigId,
  generateGigHash,
  validateGig,
  safeValidateGig,
} from "./utils";

// Export aliases for backward compatibility
export {
  generateGigId as createGigId,
  generateGigHash as createGigHash,
} from "./utils";