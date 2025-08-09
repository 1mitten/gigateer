/**
 * Text normalization utilities for consistent fuzzy matching
 */

/**
 * Normalize text for fuzzy matching by:
 * - Converting to lowercase
 * - Removing extra whitespace
 * - Removing special characters and punctuation
 * - Standardizing common abbreviations
 * @param text Input text
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Remove common punctuation and special characters
    .replace(/[.,!?;:\-_()[\]{}"|'`~@#$%^&*+=<>\/\\]/g, '')
    // Standardize common abbreviations and words
    .replace(/\band\b/g, '&')
    .replace(/\bthe\b/g, '')
    .replace(/\bst\b/g, 'street')
    .replace(/\brd\b/g, 'road')
    .replace(/\bave\b/g, 'avenue')
    .replace(/\bdr\b/g, 'drive')
    .replace(/\blive\b/g, '')
    .replace(/\bconcert\b/g, '')
    .replace(/\bshow\b/g, '')
    .replace(/\bevent\b/g, '')
    // Remove extra spaces created by replacements
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize venue name for matching
 * @param venueName Venue name
 * @returns Normalized venue name
 */
export function normalizeVenueName(venueName: string): string {
  if (!venueName) return '';
  
  return normalizeText(venueName)
    // Remove common venue type suffixes/prefixes
    .replace(/\b(club|bar|pub|venue|hall|center|centre|theatre|theater|arena|stadium)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize event title for matching
 * @param title Event title
 * @returns Normalized title
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  
  return normalizeText(title)
    // Remove common event type words
    .replace(/\b(presents|featuring|feat|ft|with|plus|\+|vs|versus|vs\.)\b/g, ' ')
    // Remove tour/album indicators
    .replace(/\b(tour|world tour|live|album|ep|single)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize city name for matching
 * @param city City name
 * @returns Normalized city name
 */
export function normalizeCity(city: string): string {
  if (!city) return '';
  
  return normalizeText(city)
    // Remove common city suffixes
    .replace(/\b(city|town|borough|county)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract main artist from a title that may contain multiple artists
 * @param title Event title
 * @returns Main artist name
 */
export function extractMainArtist(title: string): string {
  if (!title) return '';
  
  // Split on common separators and take the first part
  const separators = [' + ', ' & ', ' and ', ' feat ', ' featuring ', ' with ', ' vs ', ' versus '];
  let mainArtist = title;
  
  for (const separator of separators) {
    const parts = title.toLowerCase().split(separator);
    if (parts.length > 1) {
      mainArtist = parts[0].trim();
      break;
    }
  }
  
  return normalizeText(mainArtist);
}

/**
 * Create a search-friendly string by removing stop words and normalizing
 * @param text Input text
 * @returns Search-friendly text
 */
export function createSearchableText(text: string): string {
  if (!text) return '';
  
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with'
  ]);
  
  return normalizeText(text)
    .split(' ')
    .filter(word => word.length > 0 && !stopWords.has(word))
    .join(' ');
}