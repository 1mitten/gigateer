/**
 * Error handling utilities for malformed data in deduplication process
 */

import { Gig } from '@gigateer/contracts';

/**
 * Error types for deduplication process
 */
export enum DedupeErrorType {
  INVALID_GIG_DATA = 'INVALID_GIG_DATA',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_VENUE_DATA = 'INVALID_VENUE_DATA',
  INVALID_PRICE_DATA = 'INVALID_PRICE_DATA',
  INVALID_URL_FORMAT = 'INVALID_URL_FORMAT',
  HASH_GENERATION_FAILED = 'HASH_GENERATION_FAILED',
  SIMILARITY_CALCULATION_FAILED = 'SIMILARITY_CALCULATION_FAILED',
  DATA_CORRUPTION = 'DATA_CORRUPTION'
}

/**
 * Deduplication error class
 */
export class DedupeError extends Error {
  public readonly type: DedupeErrorType;
  public readonly gigId?: string;
  public readonly source?: string;
  public readonly field?: string;
  public readonly originalError?: Error;

  constructor(
    type: DedupeErrorType,
    message: string,
    context: {
      gigId?: string;
      source?: string;
      field?: string;
      originalError?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'DedupeError';
    this.type = type;
    this.gigId = context.gigId;
    this.source = context.source;
    this.field = context.field;
    this.originalError = context.originalError;
  }
}

/**
 * Validation result for a gig
 */
export interface GigValidationResult {
  isValid: boolean;
  errors: DedupeError[];
  warnings: string[];
  sanitizedGig?: Gig;
}

/**
 * Comprehensive gig validation with error recovery
 * @param gig Gig to validate
 * @param options Validation options
 * @returns Validation result with errors and sanitized data
 */
export function validateAndSanitizeGig(
  gig: any,
  options: {
    strict?: boolean;
    autoFix?: boolean;
    allowMissingOptional?: boolean;
  } = {}
): GigValidationResult {
  const {
    strict = false,
    autoFix = true,
    allowMissingOptional = true
  } = options;

  const errors: DedupeError[] = [];
  const warnings: string[] = [];
  const sanitized: any = {};

  try {
    // Check if gig is an object
    if (!gig || typeof gig !== 'object') {
      return {
        isValid: false,
        errors: [
          new DedupeError(
            DedupeErrorType.INVALID_GIG_DATA,
            'Gig must be an object',
            { gigId: gig?.id }
          )
        ],
        warnings: []
      };
    }

    // Validate required fields
    const requiredFields = ['id', 'source', 'title', 'dateStart', 'venue', 'updatedAt', 'hash'];
    
    for (const field of requiredFields) {
      if (gig[field] === undefined || gig[field] === null || gig[field] === '') {
        if (autoFix && field !== 'id') {
          sanitized[field] = getDefaultValue(field, gig);
          warnings.push(`Auto-fixed missing ${field} field`);
        } else {
          errors.push(
            new DedupeError(
              DedupeErrorType.MISSING_REQUIRED_FIELD,
              `Missing required field: ${field}`,
              { gigId: gig.id, source: gig.source, field }
            )
          );
        }
      } else {
        sanitized[field] = gig[field];
      }
    }

    // Validate and sanitize specific fields
    sanitized.id = validateId(gig.id, errors);
    sanitized.source = validateSource(gig.source, errors);
    sanitized.title = validateTitle(gig.title, errors, autoFix);
    sanitized.artists = validateArtists(gig.artists, errors, autoFix);
    sanitized.genre = validateGenre(gig.genre, errors, autoFix);
    sanitized.dateStart = validateDate(gig.dateStart, 'dateStart', errors, autoFix);
    sanitized.dateEnd = validateDate(gig.dateEnd, 'dateEnd', errors, autoFix, true);
    sanitized.timezone = validateTimezone(gig.timezone, errors, autoFix);
    sanitized.venue = validateVenue(gig.venue, errors, autoFix);
    sanitized.price = validatePrice(gig.price, errors, autoFix, allowMissingOptional);
    sanitized.ageRestriction = validateAgeRestriction(gig.ageRestriction, errors, autoFix);
    sanitized.status = validateStatus(gig.status, errors, autoFix);
    sanitized.ticketsUrl = validateUrl(gig.ticketsUrl, 'ticketsUrl', errors, autoFix);
    sanitized.eventUrl = validateUrl(gig.eventUrl, 'eventUrl', errors, autoFix);
    sanitized.images = validateImages(gig.images, errors, autoFix);
    sanitized.updatedAt = validateDate(gig.updatedAt, 'updatedAt', errors, autoFix);
    sanitized.hash = validateHash(gig.hash, errors, autoFix);

    // Add any extra fields (for extensibility)
    for (const [key, value] of Object.entries(gig)) {
      if (!sanitized.hasOwnProperty(key)) {
        sanitized[key] = value;
      }
    }

    const isValid = errors.length === 0 || (!strict && errors.every(e => e.type !== DedupeErrorType.MISSING_REQUIRED_FIELD));

    return {
      isValid,
      errors,
      warnings,
      sanitizedGig: isValid ? sanitized as Gig : undefined
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [
        new DedupeError(
          DedupeErrorType.DATA_CORRUPTION,
          'Failed to validate gig data',
          { gigId: gig?.id, source: gig?.source, originalError: error as Error }
        )
      ],
      warnings
    };
  }
}

/**
 * Get default value for a field
 */
function getDefaultValue(field: string, gig: any): any {
  switch (field) {
    case 'source':
      return 'unknown';
    case 'title':
      return 'Untitled Event';
    case 'artists':
      return [];
    case 'genre':
      return [];
    case 'dateStart':
      return new Date().toISOString();
    case 'venue':
      return { name: 'Unknown Venue' };
    case 'updatedAt':
      return new Date().toISOString();
    case 'hash':
      return 'auto-generated-hash';
    case 'status':
      return 'scheduled';
    case 'images':
      return [];
    default:
      return null;
  }
}

/**
 * Validate ID field
 */
function validateId(id: any, errors: DedupeError[]): string {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    errors.push(
      new DedupeError(
        DedupeErrorType.MISSING_REQUIRED_FIELD,
        'ID must be a non-empty string',
        { field: 'id' }
      )
    );
    return 'invalid-id';
  }
  return id.trim();
}

/**
 * Validate source field
 */
function validateSource(source: any, errors: DedupeError[]): string {
  if (!source || typeof source !== 'string' || source.trim().length === 0) {
    errors.push(
      new DedupeError(
        DedupeErrorType.MISSING_REQUIRED_FIELD,
        'Source must be a non-empty string',
        { field: 'source' }
      )
    );
    return 'unknown';
  }
  return source.trim();
}

/**
 * Validate title field
 */
function validateTitle(title: any, errors: DedupeError[], autoFix: boolean): string {
  if (!title || typeof title !== 'string') {
    if (autoFix) {
      return 'Untitled Event';
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.MISSING_REQUIRED_FIELD,
        'Title must be a non-empty string',
        { field: 'title' }
      )
    );
    return 'Untitled Event';
  }
  return title.trim();
}

/**
 * Validate artists array
 */
function validateArtists(artists: any, errors: DedupeError[], autoFix: boolean): string[] {
  if (!Array.isArray(artists)) {
    if (autoFix) {
      return [];
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_GIG_DATA,
        'Artists must be an array',
        { field: 'artists' }
      )
    );
    return [];
  }
  
  return artists
    .filter(artist => artist && typeof artist === 'string')
    .map(artist => artist.trim())
    .filter(artist => artist.length > 0);
}

/**
 * Validate genre array
 */
function validateGenre(genre: any, errors: DedupeError[], autoFix: boolean): string[] {
  if (!Array.isArray(genre)) {
    if (autoFix) {
      return [];
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_GIG_DATA,
        'Genre must be an array',
        { field: 'genre' }
      )
    );
    return [];
  }
  
  return genre
    .filter(g => g && typeof g === 'string')
    .map(g => g.trim())
    .filter(g => g.length > 0);
}

/**
 * Validate date field
 */
function validateDate(
  date: any,
  fieldName: string,
  errors: DedupeError[],
  autoFix: boolean,
  optional: boolean = false
): string | undefined {
  if (optional && (date === undefined || date === null)) {
    return undefined;
  }

  if (!date || typeof date !== 'string') {
    if (autoFix && !optional) {
      return new Date().toISOString();
    }
    if (!optional) {
      errors.push(
        new DedupeError(
          DedupeErrorType.INVALID_DATE_FORMAT,
          `${fieldName} must be a valid ISO date string`,
          { field: fieldName }
        )
      );
    }
    return optional ? undefined : new Date().toISOString();
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    if (autoFix && !optional) {
      return new Date().toISOString();
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_DATE_FORMAT,
        `Invalid date format for ${fieldName}: ${date}`,
        { field: fieldName }
      )
    );
    return optional ? undefined : new Date().toISOString();
  }

  return parsedDate.toISOString();
}

/**
 * Validate timezone field
 */
function validateTimezone(timezone: any, errors: DedupeError[], autoFix: boolean): string | undefined {
  if (!timezone) return undefined;
  
  if (typeof timezone !== 'string') {
    if (autoFix) {
      return undefined;
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_GIG_DATA,
        'Timezone must be a string',
        { field: 'timezone' }
      )
    );
    return undefined;
  }
  
  return timezone.trim();
}

/**
 * Validate venue object
 */
function validateVenue(venue: any, errors: DedupeError[], autoFix: boolean): any {
  if (!venue || typeof venue !== 'object') {
    if (autoFix) {
      return { name: 'Unknown Venue' };
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_VENUE_DATA,
        'Venue must be an object',
        { field: 'venue' }
      )
    );
    return { name: 'Unknown Venue' };
  }

  const sanitizedVenue: any = {};

  // Validate venue name (required)
  if (!venue.name || typeof venue.name !== 'string') {
    if (autoFix) {
      sanitizedVenue.name = 'Unknown Venue';
    } else {
      errors.push(
        new DedupeError(
          DedupeErrorType.MISSING_REQUIRED_FIELD,
          'Venue name is required',
          { field: 'venue.name' }
        )
      );
      sanitizedVenue.name = 'Unknown Venue';
    }
  } else {
    sanitizedVenue.name = venue.name.trim();
  }

  // Validate optional venue fields
  if (venue.address && typeof venue.address === 'string') {
    sanitizedVenue.address = venue.address.trim();
  }
  if (venue.city && typeof venue.city === 'string') {
    sanitizedVenue.city = venue.city.trim();
  }
  if (venue.country && typeof venue.country === 'string') {
    sanitizedVenue.country = venue.country.trim();
  }
  if (venue.lat && typeof venue.lat === 'number' && !isNaN(venue.lat)) {
    sanitizedVenue.lat = venue.lat;
  }
  if (venue.lng && typeof venue.lng === 'number' && !isNaN(venue.lng)) {
    sanitizedVenue.lng = venue.lng;
  }

  return sanitizedVenue;
}

/**
 * Validate price object
 */
function validatePrice(
  price: any,
  errors: DedupeError[],
  autoFix: boolean,
  allowMissing: boolean
): any {
  if (!price) {
    return allowMissing ? undefined : undefined;
  }

  if (typeof price !== 'object') {
    if (autoFix) {
      return undefined;
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_PRICE_DATA,
        'Price must be an object',
        { field: 'price' }
      )
    );
    return undefined;
  }

  const sanitizedPrice: any = {};

  if (price.min !== undefined) {
    if (typeof price.min === 'number' && !isNaN(price.min)) {
      sanitizedPrice.min = price.min;
    } else if (price.min === null) {
      sanitizedPrice.min = null;
    }
  }

  if (price.max !== undefined) {
    if (typeof price.max === 'number' && !isNaN(price.max)) {
      sanitizedPrice.max = price.max;
    } else if (price.max === null) {
      sanitizedPrice.max = null;
    }
  }

  if (price.currency) {
    if (typeof price.currency === 'string') {
      sanitizedPrice.currency = price.currency.trim().toUpperCase();
    } else if (price.currency === null) {
      sanitizedPrice.currency = null;
    }
  }

  return Object.keys(sanitizedPrice).length > 0 ? sanitizedPrice : undefined;
}

/**
 * Validate age restriction
 */
function validateAgeRestriction(ageRestriction: any, errors: DedupeError[], autoFix: boolean): string | undefined {
  if (!ageRestriction) return undefined;
  
  if (typeof ageRestriction !== 'string') {
    if (autoFix) {
      return undefined;
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_GIG_DATA,
        'Age restriction must be a string',
        { field: 'ageRestriction' }
      )
    );
    return undefined;
  }
  
  return ageRestriction.trim();
}

/**
 * Validate status enum
 */
function validateStatus(status: any, errors: DedupeError[], autoFix: boolean): 'scheduled' | 'cancelled' | 'postponed' {
  const validStatuses = ['scheduled', 'cancelled', 'postponed'];
  
  if (!status || !validStatuses.includes(status)) {
    if (autoFix) {
      return 'scheduled';
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_GIG_DATA,
        `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`,
        { field: 'status' }
      )
    );
    return 'scheduled';
  }
  
  return status;
}

/**
 * Validate URL field
 */
function validateUrl(url: any, fieldName: string, errors: DedupeError[], autoFix: boolean): string | undefined {
  if (!url) return undefined;
  
  if (typeof url !== 'string') {
    if (autoFix) {
      return undefined;
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_URL_FORMAT,
        `${fieldName} must be a string`,
        { field: fieldName }
      )
    );
    return undefined;
  }
  
  try {
    new URL(url);
    return url.trim();
  } catch {
    if (autoFix) {
      return undefined;
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_URL_FORMAT,
        `Invalid URL format for ${fieldName}: ${url}`,
        { field: fieldName }
      )
    );
    return undefined;
  }
}

/**
 * Validate images array
 */
function validateImages(images: any, errors: DedupeError[], autoFix: boolean): string[] {
  if (!Array.isArray(images)) {
    if (autoFix) {
      return [];
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.INVALID_GIG_DATA,
        'Images must be an array',
        { field: 'images' }
      )
    );
    return [];
  }
  
  const validImages: string[] = [];
  
  for (const image of images) {
    if (typeof image === 'string') {
      try {
        new URL(image);
        validImages.push(image.trim());
      } catch {
        // Skip invalid URLs
        if (!autoFix) {
          errors.push(
            new DedupeError(
              DedupeErrorType.INVALID_URL_FORMAT,
              `Invalid image URL: ${image}`,
              { field: 'images' }
            )
          );
        }
      }
    }
  }
  
  return validImages;
}

/**
 * Validate hash field
 */
function validateHash(hash: any, errors: DedupeError[], autoFix: boolean): string {
  if (!hash || typeof hash !== 'string') {
    if (autoFix) {
      return 'auto-generated-hash';
    }
    errors.push(
      new DedupeError(
        DedupeErrorType.MISSING_REQUIRED_FIELD,
        'Hash must be a non-empty string',
        { field: 'hash' }
      )
    );
    return 'auto-generated-hash';
  }
  
  return hash.trim();
}

/**
 * Batch validate multiple gigs with error collection
 * @param gigs Array of gigs to validate
 * @param options Validation options
 * @returns Validation results for all gigs
 */
export function batchValidateGigs(
  gigs: any[],
  options: Parameters<typeof validateAndSanitizeGig>[1] = {}
): {
  valid: Gig[];
  invalid: { gig: any; result: GigValidationResult }[];
  totalErrors: number;
  totalWarnings: number;
} {
  const valid: Gig[] = [];
  const invalid: { gig: any; result: GigValidationResult }[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const gig of gigs) {
    const result = validateAndSanitizeGig(gig, options);
    
    if (result.isValid && result.sanitizedGig) {
      valid.push(result.sanitizedGig);
    } else {
      invalid.push({ gig, result });
    }
    
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  return {
    valid,
    invalid,
    totalErrors,
    totalWarnings
  };
}