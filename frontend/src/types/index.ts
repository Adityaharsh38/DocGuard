/**
 * DocGuard API & Domain Types
 * Based on DocGuard Integration Contract v1 (Team OdeX)
 */

export interface HealthResponse {
  status: 'ok' | string;
  service: string;
}

export interface ModelStatusResponse {
  available: boolean;
  provider?: string;
  model?: string;
  message?: string;
}

export interface AnalyzeRequest {
  repo_url: string;
  pr_number: number;
}

export type FindingSeverity = 'high' | 'medium' | 'low' | string;

export interface Finding {
  id: string;
  type: string;
  severity: FindingSeverity;
  docs_file: string;
  docs_line: number | null;
  documented_value: string;
  actual_value: string;
  code_file: string;
  code_line: number | null;
  explanation: string;
  suggestion: string;
  confidence?: number;
}

export interface AnalysisSummaryData {
  total_findings: number;
  high: number;
  medium: number;
  low: number;
}

export interface AnalysisResponse {
  status: 'completed' | string;
  summary: AnalysisSummaryData;
  findings: Finding[];
}

export type ConnectionState = 'idle' | 'checking' | 'online' | 'offline';
export type ModelConnectionState = 'idle' | 'checking' | 'available' | 'unavailable' | 'unknown';
