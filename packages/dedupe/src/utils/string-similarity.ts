/**
 * String similarity utilities for deduplication
 * Implements Jaro-Winkler algorithm for fuzzy string matching
 */

/**
 * Calculate Jaro similarity between two strings
 * @param s1 First string
 * @param s2 Second string
 * @returns Jaro similarity score (0-1)
 */
export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // Maximum allowed distance for matching characters
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  // Arrays to keep track of matches
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Identify matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    
    while (!s2Matches[k]) k++;
    
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  // Calculate Jaro similarity
  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * @param s1 First string
 * @param s2 Second string
 * @param prefixScale Scaling factor for common prefix (default 0.1)
 * @returns Jaro-Winkler similarity score (0-1)
 */
export function jaroWinklerSimilarity(s1: string, s2: string, prefixScale = 0.1): number {
  const jaroSim = jaroSimilarity(s1, s2);
  
  if (jaroSim < 0.7) return jaroSim;
  
  // Find common prefix up to 4 characters
  let prefixLength = 0;
  const maxPrefixLength = Math.min(4, Math.min(s1.length, s2.length));
  
  for (let i = 0; i < maxPrefixLength; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }
  
  return jaroSim + (prefixLength * prefixScale * (1 - jaroSim));
}

/**
 * Calculate simple edit distance (Levenshtein) between two strings
 * @param s1 First string
 * @param s2 Second string
 * @returns Edit distance
 */
export function editDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2[i - 1] === s1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
}

/**
 * Calculate normalized edit distance similarity (0-1)
 * @param s1 First string
 * @param s2 Second string
 * @returns Similarity score (0-1)
 */
export function editSimilarity(s1: string, s2: string): number {
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1;
  
  const distance = editDistance(s1, s2);
  return 1 - (distance / maxLength);
}