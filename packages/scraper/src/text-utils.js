/**
 * Text processing and normalization utilities
 */
/**
 * Clean and normalize text by removing extra whitespace, special characters, etc.
 */
export function normalizeText(text) {
    return text
        .trim()
        .replace(/[\r\n\t]/g, " ") // Replace line breaks and tabs with spaces
        .replace(/[^\w\s\-.,!?()@&]/g, " ") // Keep basic punctuation & ampersand, replace other special chars with space
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
}
/**
 * Extract price information from text
 * Handles formats like: "$15", "€20-30", "Free", "£25.50", "10-15 EUR"
 */
export function extractPrice(text) {
    const normalizedText = text.toLowerCase().replace(/\s+/g, " ").trim();
    // Handle "free" or "no charge"
    if (/\b(free|no charge|gratis|kostenlos)\b/.test(normalizedText)) {
        return { min: 0, max: 0, currency: null };
    }
    // Extract currency symbols and codes
    const currencyMap = {
        "$": "USD",
        "€": "EUR",
        "£": "GBP",
        "¥": "JPY",
        "₹": "INR",
    };
    // Try to find currency symbol first
    let currency = null;
    for (const [symbol, code] of Object.entries(currencyMap)) {
        if (text.includes(symbol)) {
            currency = code;
            break;
        }
    }
    // Try to find currency code (USD, EUR, etc.)
    if (!currency) {
        const currencyMatch = text.match(/\b(USD|EUR|GBP|JPY|INR|CAD|AUD|CHF|SEK|NOK|DKK)\b/i);
        if (currencyMatch) {
            currency = currencyMatch[1].toUpperCase();
        }
    }
    // Extract numbers
    const numberPattern = /\b\d+(?:[.,]\d{2})?\b/g;
    const numbers = text.match(numberPattern)?.map(n => parseFloat(n.replace(",", "."))) || [];
    if (numbers.length === 0) {
        return { min: null, max: null, currency };
    }
    if (numbers.length === 1) {
        return { min: numbers[0], max: numbers[0], currency };
    }
    // Multiple numbers - assume range
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return { min, max, currency };
}
/**
 * Extract artists from various text formats
 * Handles: "Artist A, Artist B & Artist C", "Artist A featuring Artist B", etc.
 */
export function extractArtists(text) {
    const normalized = normalizeText(text);
    // Handle complex cases with multiple types of separators
    let result = [normalized];
    // Apply separators in order of priority, processing all occurrences
    const separatorPatterns = [
        /\s+featuring\s+/i,
        /\s+feat\.?\s+/i,
        /\s+ft\.?\s+/i,
        /\s+with\s+/i,
        /,\s*(?![^()]*\))/, // Comma not inside parentheses
        /\s+&\s+/,
        /\s+and\s+/i,
        /\s*\|\s*/,
        /\s*\/\s*/,
    ];
    for (const pattern of separatorPatterns) {
        const newResult = [];
        for (const item of result) {
            if (pattern.test(item)) {
                newResult.push(...item.split(pattern));
            }
            else {
                newResult.push(item);
            }
        }
        result = newResult;
    }
    return result
        .map(artist => artist.trim())
        .filter(artist => artist.length > 0)
        .filter(artist => artist.length < 100); // Reasonable length limit
}
/**
 * Extract venue information from address-like text
 */
export function parseAddress(addressText) {
    const normalized = normalizeText(addressText);
    const parts = normalized.split(",").map(part => part.trim());
    if (parts.length === 1) {
        return { address: normalized, city: null, country: null };
    }
    // Common pattern: "Street Address, City, Country" or "Street Address, City"
    if (parts.length === 2) {
        // "Address, City" format
        return {
            address: parts[0],
            city: parts[1],
            country: null,
        };
    }
    else if (parts.length >= 3) {
        // "Address, City, Country" format
        return {
            address: parts.slice(0, -2).join(", "),
            city: parts[parts.length - 2],
            country: parts[parts.length - 1],
        };
    }
    // Fallback
    return { address: normalized, city: null, country: null };
}
/**
 * Clean venue names by removing common prefixes/suffixes
 */
export function normalizeVenueName(name) {
    return normalizeText(name)
        .replace(/^(the\s+)/i, "") // Remove "The " prefix
        .replace(/\s+(venue|hall|club|bar|pub|theater|theatre|arena|stadium)$/i, " $1") // Normalize venue type spacing
        .trim();
}
/**
 * Extract genre information from text
 * Maps common genre variations to standard genres
 */
export function extractGenres(text) {
    const normalized = text.toLowerCase();
    const genreMap = {
        // Electronic music
        "electronic": "Electronic",
        "edm": "Electronic",
        "techno": "Techno",
        "house": "House",
        "trance": "Trance",
        "dubstep": "Dubstep",
        "drum and bass": "Drum & Bass",
        "dnb": "Drum & Bass",
        // Rock genres
        "rock": "Rock",
        "indie": "Indie",
        "indie rock": "Indie Rock",
        "alternative": "Alternative",
        "punk": "Punk",
        "metal": "Metal",
        "hard rock": "Hard Rock",
        // Popular music
        "pop": "Pop",
        "hip hop": "Hip Hop",
        "hip-hop": "Hip Hop",
        "rap": "Hip Hop",
        "r&b": "R&B",
        "rnb": "R&B",
        // Jazz and blues
        "jazz": "Jazz",
        "blues": "Blues",
        "soul": "Soul",
        "funk": "Funk",
        // Folk and country
        "folk": "Folk",
        "country": "Country",
        "acoustic": "Acoustic",
        // Classical
        "classical": "Classical",
        "orchestra": "Classical",
        "symphony": "Classical",
        // World music
        "world": "World Music",
        "latin": "Latin",
        "reggae": "Reggae",
    };
    const foundGenres = new Set();
    for (const [key, standardGenre] of Object.entries(genreMap)) {
        if (normalized.includes(key)) {
            foundGenres.add(standardGenre);
        }
    }
    return Array.from(foundGenres);
}
/**
 * Calculate text similarity using Jaro-Winkler algorithm (simplified version)
 * Returns a value between 0 and 1, where 1 is identical
 */
export function textSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2)
        return 1;
    if (s1.length === 0 || s2.length === 0)
        return 0;
    // Simple implementation - for production, consider using a proper library
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0)
        return 1;
    // Count matching characters (case-insensitive)
    let matches = 0;
    const maxDistance = Math.floor(longer.length / 2) - 1;
    const shorterMatches = new Array(shorter.length).fill(false);
    const longerMatches = new Array(longer.length).fill(false);
    // Find matches
    for (let i = 0; i < shorter.length; i++) {
        const start = Math.max(0, i - maxDistance);
        const end = Math.min(i + maxDistance + 1, longer.length);
        for (let j = start; j < end; j++) {
            if (longerMatches[j] || shorter[i] !== longer[j])
                continue;
            shorterMatches[i] = true;
            longerMatches[j] = true;
            matches++;
            break;
        }
    }
    if (matches === 0)
        return 0;
    // Count transpositions
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (!shorterMatches[i])
            continue;
        while (!longerMatches[k])
            k++;
        if (shorter[i] !== longer[k])
            transpositions++;
        k++;
    }
    const jaro = (matches / shorter.length + matches / longer.length + (matches - transpositions / 2) / matches) / 3;
    // Jaro-Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(shorter.length, 4); i++) {
        if (shorter[i] === longer[i])
            prefix++;
        else
            break;
    }
    return jaro + 0.1 * prefix * (1 - jaro);
}
//# sourceMappingURL=text-utils.js.map