/**
 * Main exports for the Gigateer deduplication package
 */

// Core deduplication
export {
  deduplicateGigs,
  findExactDuplicates,
  validateGigsForDeduplication,
  type DeduplicationResult,
  type DeduplicationOptions,
  type DuplicateGroup
} from './deduplicator';

// Catalog generation
export {
  generateCatalog,
  updateCatalog,
  compareCatalogs,
  type Catalog,
  type SourceStats,
  type SourceInfo,
  type CatalogMetadata,
  type CatalogGenerationOptions
} from './catalog-generator';

// Trust scoring
export {
  getTrustScore,
  compareTrustScores,
  getMostTrustedGig,
  mergeTrustedData,
  createSourceMetadata,
  isTrustedForDataType,
  DEFAULT_TRUST_SCORES
} from './trust-score';

// Fuzzy matching
export {
  fuzzyMatchGigs,
  createFuzzyKey,
  groupGigsByFuzzyKeys,
  findPotentialDuplicates,
  areLikelySameEvent,
  SIMILARITY_THRESHOLDS,
  type FuzzyMatchResult
} from './utils/fuzzy-matching';

// Hash utilities
export {
  createStableHash,
  createGigContentHash,
  createFuzzyMatchKey,
  createCompositeKey,
  compareHashes,
  isValidHash,
  createQuickHash
} from './utils/hash-utils';

// String similarity
export {
  jaroSimilarity,
  jaroWinklerSimilarity,
  editDistance,
  editSimilarity
} from './utils/string-similarity';

// Text normalization
export {
  normalizeText,
  normalizeVenueName,
  normalizeTitle,
  normalizeCity,
  extractMainArtist,
  createSearchableText
} from './utils/text-normalization';

// Date utilities
export {
  parseISODate,
  isWithinTimeWindow,
  dateRangesOverlap,
  isSameDay,
  getTimeDifferenceHours,
  normalizeToStartOfDay,
  createFuzzyDateKeys,
  formatDateForDisplay
} from './utils/date-utils';

// Error handling
export {
  validateAndSanitizeGig,
  batchValidateGigs,
  DedupeError,
  DedupeErrorType,
  type GigValidationResult
} from './error-handling';