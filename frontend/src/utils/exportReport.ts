import { AnalysisResponse, Finding } from '../types';

/**
 * Formats the full analysis response as pretty-printed JSON
 */
export function formatReportAsJson(
  report: AnalysisResponse,
  repoUrl: string,
  prNumber: number
): string {
  const exportPayload = {
    metadata: {
      generated_at: new Date().toISOString(),
      generator: 'DocGuard (Team OdeX) - Automated Documentation Drift Detection',
      repo_url: repoUrl,
      pr_number: prNumber,
    },
    ...report,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Escapes values for standard RFC 4180 CSV format
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If the field contains comma, quote, or newline, escape quotes and wrap in quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Converts findings list into a CSV string suitable for documentation audit spreadsheets
 */
export function formatFindingsAsCsv(
  findings: Finding[],
  repoUrl: string,
  prNumber: number
): string {
  const headers = [
    'Finding ID',
    'Repository',
    'PR Number',
    'Category / Type',
    'Severity',
    'Confidence',
    'Docs File',
    'Docs Line',
    'Documented Value (Outdated)',
    'Code File',
    'Code Line',
    'Actual Value (Code Fact)',
    'Explanation',
    'Suggested Correction',
  ];

  const rows = findings.map((f) => [
    escapeCsvField(f.id),
    escapeCsvField(repoUrl),
    escapeCsvField(prNumber),
    escapeCsvField(f.type),
    escapeCsvField(f.severity),
    escapeCsvField(f.confidence !== undefined ? `${Math.round(f.confidence * 100)}%` : ''),
    escapeCsvField(f.docs_file),
    escapeCsvField(f.docs_line ?? ''),
    escapeCsvField(f.documented_value),
    escapeCsvField(f.code_file),
    escapeCsvField(f.code_line ?? ''),
    escapeCsvField(f.actual_value),
    escapeCsvField(f.explanation),
    escapeCsvField(f.suggestion),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generates clean audit filename based on repo and PR number
 */
export function getExportFilename(
  repoUrl: string,
  prNumber: number,
  extension: 'json' | 'csv'
): string {
  const repoSlug = repoUrl
    .replace(/^https?:\/\/(?:www\.)?github\.com\//i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40) || 'repository';
  return `docguard-audit-${repoSlug}-pr${prNumber}.${extension}`;
}

/**
 * Browser-safe file download trigger
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
