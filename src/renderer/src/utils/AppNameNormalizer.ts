/**
 * Application name normalization and fuzzy matching utility
 * Handles cross-platform app name variations and provides intelligent matching
 */

export interface AppMatchResult {
  match: string | null
  score: number
  normalizedTarget: string
  normalizedCandidate: string
}

export class AppNameNormalizer {
  // Common app name variations and their canonical forms
  private static readonly APP_ALIASES = new Map<string, string>([
    // Browsers
    ['chrome', 'google chrome'],
    ['firefox', 'mozilla firefox'],
    ['safari', 'safari'],
    ['edge', 'microsoft edge'],
    ['brave', 'brave browser'],

    // Code Editors
    ['vscode', 'visual studio code'],
    ['code', 'visual studio code'],
    ['sublime', 'sublime text'],
    ['atom', 'atom'],
    ['webstorm', 'webstorm'],
    ['phpstorm', 'phpstorm'],
    ['pycharm', 'pycharm'],

    // Communication
    ['slack', 'slack'],
    ['discord', 'discord'],
    ['zoom', 'zoom'],
    ['teams', 'microsoft teams'],
    ['skype', 'skype'],

    // Development Tools
    ['terminal', 'terminal'],
    ['cmd', 'command prompt'],
    ['powershell', 'windows powershell'],
    ['git', 'git'],
    ['docker', 'docker'],

    // Media
    ['spotify', 'spotify'],
    ['vlc', 'vlc media player'],
    ['itunes', 'itunes'],
    ['youtube', 'youtube'],

    // Office
    ['word', 'microsoft word'],
    ['excel', 'microsoft excel'],
    ['powerpoint', 'microsoft powerpoint'],
    ['outlook', 'microsoft outlook'],
    ['notion', 'notion'],
    ['obsidian', 'obsidian'],

    // Social Media
    ['twitter', 'twitter'],
    ['facebook', 'facebook'],
    ['instagram', 'instagram'],
    ['tiktok', 'tiktok'],

    // Gaming
    ['steam', 'steam'],
    ['origin', 'origin'],
    ['epic', 'epic games launcher']
  ])

  /**
   * Normalize app name to a standard format
   */
  static normalizeBasic(name: string): string {
    if (!name) return ''

    return name
      .toLowerCase() // Convert to lowercase
      .replace(/\.(exe|app|dmg|msi)$/i, '') // Remove file extensions
      .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim() // Remove leading/trailing spaces
  }

  /**
   * Get canonical name from aliases
   */
  static getCanonicalName(name: string): string {
    const normalized = this.normalizeBasic(name)
    return this.APP_ALIASES.get(normalized) || normalized
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    const len1 = str1.length
    const len2 = str2.length

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    return matrix[len1][len2]
  }

  /**
   * Calculate Jaro-Winkler similarity
   */
  private static jaroWinklerSimilarity(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0 && len2 === 0) return 1
    if (len1 === 0 || len2 === 0) return 0

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1
    if (matchWindow < 0) return 0

    const str1Matches = new Array(len1).fill(false)
    const str2Matches = new Array(len2).fill(false)

    let matches = 0

    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow)
      const end = Math.min(i + matchWindow + 1, len2)

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue
        str1Matches[i] = true
        str2Matches[j] = true
        matches++
        break
      }
    }

    if (matches === 0) return 0

    // Count transpositions
    let transpositions = 0
    let k = 0

    for (let i = 0; i < len1; i++) {
      if (!str1Matches[i]) continue
      while (!str2Matches[k]) k++
      if (str1[i] !== str2[k]) transpositions++
      k++
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

    // Winkler prefix bonus
    let prefix = 0
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (str1[i] === str2[i]) prefix++
      else break
    }

    return jaro + 0.1 * prefix * (1 - jaro)
  }

  /**
   * Calculate comprehensive match score between target and candidate
   */
  static calculateMatchScore(target: string, candidate: string): number {
    if (!target || !candidate) return 0

    const normalizedTarget = this.normalizeBasic(target)
    const normalizedCandidate = this.normalizeBasic(candidate)

    // Get canonical forms
    const canonicalTarget = this.getCanonicalName(normalizedTarget)
    const canonicalCandidate = this.getCanonicalName(normalizedCandidate)

    // 1. Exact match (highest score)
    if (canonicalTarget === canonicalCandidate) return 1.0
    if (normalizedTarget === normalizedCandidate) return 0.95

    // 2. Perfect substring match
    if (canonicalCandidate.includes(canonicalTarget)) return 0.9
    if (canonicalTarget.includes(canonicalCandidate)) return 0.85
    if (normalizedCandidate.includes(normalizedTarget)) return 0.8
    if (normalizedTarget.includes(normalizedCandidate)) return 0.75

    // 3. Word-level matching
    const targetWords = canonicalTarget.split(' ').filter((w) => w.length > 0)
    const candidateWords = canonicalCandidate.split(' ').filter((w) => w.length > 0)

    if (targetWords.length > 0 && candidateWords.length > 0) {
      const wordMatches = targetWords.filter((tw) =>
        candidateWords.some((cw) => cw.includes(tw) || tw.includes(cw))
      ).length

      const wordScore = wordMatches / Math.max(targetWords.length, candidateWords.length)
      if (wordScore > 0.5) {
        return 0.6 + wordScore * 0.15 // 0.6 to 0.75 range
      }
    }

    // 4. Fuzzy string matching
    const maxLength = Math.max(canonicalTarget.length, canonicalCandidate.length)

    // Levenshtein distance based similarity
    const levenshteinDist = this.levenshteinDistance(canonicalTarget, canonicalCandidate)
    const levenshteinSimilarity = 1 - levenshteinDist / maxLength

    // Jaro-Winkler similarity
    const jaroWinklerSim = this.jaroWinklerSimilarity(canonicalTarget, canonicalCandidate)

    // Combined fuzzy score
    const fuzzyScore = levenshteinSimilarity * 0.4 + jaroWinklerSim * 0.6

    // Only return fuzzy scores above threshold
    return fuzzyScore > 0.6 ? fuzzyScore : 0
  }

  /**
   * Find best matching app from a list of candidates
   */
  static findBestMatch(target: string, candidates: string[]): AppMatchResult {
    if (!target || candidates.length === 0) {
      return {
        match: null,
        score: 0,
        normalizedTarget: this.normalizeBasic(target),
        normalizedCandidate: ''
      }
    }

    let bestMatch: string | null = null
    let bestScore = 0
    let bestNormalizedCandidate = ''

    for (const candidate of candidates) {
      const score = this.calculateMatchScore(target, candidate)
      if (score > bestScore && score > 0.6) {
        // Minimum threshold
        bestMatch = candidate
        bestScore = score
        bestNormalizedCandidate = this.normalizeBasic(candidate)
      }
    }

    return {
      match: bestMatch,
      score: bestScore,
      normalizedTarget: this.normalizeBasic(target),
      normalizedCandidate: bestNormalizedCandidate
    }
  }

  /**
   * Find all matching apps above a threshold
   */
  static findAllMatches(
    target: string,
    candidates: string[],
    threshold: number = 0.6
  ): Array<{
    app: string
    score: number
    normalizedName: string
  }> {
    if (!target || candidates.length === 0) return []

    const matches: Array<{ app: string; score: number; normalizedName: string }> = []

    for (const candidate of candidates) {
      const score = this.calculateMatchScore(target, candidate)
      if (score >= threshold) {
        matches.push({
          app: candidate,
          score,
          normalizedName: this.normalizeBasic(candidate)
        })
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score)
  }

  /**
   * Check if an app name matches any in a blocked/allowed list
   */
  static isAppInList(
    appName: string,
    appList: string[]
  ): {
    isMatch: boolean
    matchedApp: string | null
    score: number
  } {
    const result = this.findBestMatch(appName, appList)

    return {
      isMatch: result.score > 0.6,
      matchedApp: result.match,
      score: result.score
    }
  }

  /**
   * Suggest app names based on partial input
   */
  static suggestAppNames(
    partial: string,
    availableApps: string[],
    maxSuggestions: number = 5
  ): Array<{
    app: string
    score: number
  }> {
    if (!partial || partial.length < 2) return []

    const suggestions = this.findAllMatches(partial, availableApps, 0.3) // Lower threshold for suggestions
      .slice(0, maxSuggestions)
      .map((match) => ({
        app: match.app,
        score: match.score
      }))

    return suggestions
  }

  /**
   * Extract potential app names from window titles or process names
   */
  static extractAppNameFromTitle(title: string): string {
    if (!title) return ''

    // Common patterns to extract app names from titles
    const patterns = [
      // "Document - AppName"
      /^.+?\s*[-–—]\s*(.+)$/,
      // "AppName: Document"
      /^([^:]+):/,
      // "Document (AppName)"
      /\(([^)]+)\)$/,
      // "AppName - Document"
      /^([^-–—]+)\s*[-–—]/
    ]

    for (const pattern of patterns) {
      const match = title.match(pattern)
      if (match && match[1]) {
        const extracted = match[1].trim()
        if (extracted.length > 0 && extracted.length < 50) {
          // Reasonable app name length
          return this.normalizeBasic(extracted)
        }
      }
    }

    // Fallback: use the whole title if it's short enough
    return title.length <= 30 ? this.normalizeBasic(title) : ''
  }
}
