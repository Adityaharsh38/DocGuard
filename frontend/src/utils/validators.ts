/**
 * Input validators and formatters for DocGuard
 * Pure functions decoupled for fast unit testing
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates repository URL.
 * Accepts standard public GitHub repository URLs such as:
 * https://github.com/owner/repository
 * https://github.com/owner/repository/
 */
export function validateRepoUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { isValid: false, error: 'Repository URL is required.' };
  }

  const trimmed = url.trim();

  // Basic GitHub repo URL pattern: https://github.com/:owner/:repo
  const githubRepoRegex = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\/|\.git)?$/;
  const match = trimmed.match(githubRepoRegex);

  if (!match) {
    return {
      isValid: false,
      error: 'Must be a valid GitHub repository URL (e.g. https://github.com/owner/repository).',
    };
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, '');

  if (!owner || !repo) {
    return { isValid: false, error: 'Repository URL must include both owner and repository name.' };
  }

  return { isValid: true };
}

/**
 * Validates PR number: must be a positive integer (>= 1).
 */
export function validatePrNumber(prNumber: number | string): ValidationResult {
  if (prNumber === undefined || prNumber === null || prNumber === '') {
    return { isValid: false, error: 'PR number is required.' };
  }

  const num = typeof prNumber === 'number' ? prNumber : Number(prNumber);

  if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return {
      isValid: false,
      error: 'PR number must be a positive whole integer (e.g. 42).',
    };
  }

  return { isValid: true };
}

/**
 * Formats confidence value according to Section 6 of guide:
 * "Show confidence as, for example, 95% only when the value is numeric and between 0 and 1.
 * Do not label confidence as accuracy."
 */
export function formatConfidence(confidence: unknown): string | null {
  if (typeof confidence !== 'number' || isNaN(confidence) || confidence < 0 || confidence > 1) {
    return null;
  }
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Formats line number display:
 * Shows line number if known; shows "line unavailable" if null or undefined.
 */
export function formatLineNumber(line: number | null | undefined): string {
  if (line === null || line === undefined || isNaN(line)) {
    return 'line unavailable';
  }
  return `L${line}`;
}

/**
 * Normalizes severity to high, medium, low, or returns original string for unknown
 */
export function normalizeSeverity(severity: string | undefined): 'high' | 'medium' | 'low' | 'unknown' {
  if (!severity) return 'unknown';
  const lower = severity.toLowerCase().trim();
  if (lower === 'high') return 'high';
  if (lower === 'medium') return 'medium';
  if (lower === 'low') return 'low';
  return 'unknown';
}
