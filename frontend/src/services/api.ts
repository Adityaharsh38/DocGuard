import {
  HealthResponse,
  ModelStatusResponse,
  AnalyzeRequest,
  AnalysisResponse,
} from '../types';
import { SAMPLE_ANALYSIS_RESPONSE } from '../fixtures/sampleResponse';

const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const STORAGE_KEY_API_BASE = 'docguard_api_base_url';
const STORAGE_KEY_DEMO_MODE = 'docguard_use_demo_fixture';

// Current active API base URL (in-memory, persisted in localStorage)
let activeApiBase =
  (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_API_BASE)) ||
  DEFAULT_API_BASE;

let useDemoFixture =
  (typeof window !== 'undefined' &&
    localStorage.getItem(STORAGE_KEY_DEMO_MODE) === 'true') ||
  false;

export function getApiBaseUrl(): string {
  return activeApiBase;
}

export function setApiBaseUrl(url: string): void {
  activeApiBase = url.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_API_BASE, activeApiBase);
  }
}

export function isDemoModeEnabled(): boolean {
  return useDemoFixture;
}

export function setDemoModeEnabled(enabled: boolean): void {
  useDemoFixture = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_DEMO_MODE, enabled ? 'true' : 'false');
  }
}

/**
 * GET /health
 * Backend health check
 */
export async function getHealth(timeoutMs = 2500): Promise<HealthResponse> {
  if (useDemoFixture) {
    // Simulated mock check for demo purposes
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      status: 'ok',
      service: 'docguard-api (mock fixture mode)',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${activeApiBase}/health`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Backend health check failed (status ${response.status})`);
    }
    const data = await response.json();
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/model-status
 * Ollama/Qwen model availability check
 */
export async function getModelStatus(
  timeoutMs = 2500
): Promise<ModelStatusResponse> {
  if (useDemoFixture) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      available: true,
      provider: 'ollama',
      model: 'qwen3:4b',
      message: 'Model is ready (demo fixture)',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${activeApiBase}/api/model-status`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `Could not read model status from backend (status ${response.status})`
      );
    }
    const data = await response.json();
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /api/analyze
 * Submits repo_url and pr_number for AST + Qwen drift analysis.
 * Uses 120s timeout as recommended in Section 6.
 */
export async function analyzePullRequest(
  payload: AnalyzeRequest,
  timeoutMs = 300000
): Promise<AnalysisResponse> {
  if (useDemoFixture) {
    // Simulate real backend processing delay for demo visualization
    await new Promise((resolve) => setTimeout(resolve, 1800));
    // Check if the user entered a special PR for zero-findings test
    if (payload.pr_number === 0 || payload.repo_url.includes('clean-docs')) {
      return {
        status: 'completed',
        summary: { total_findings: 0, high: 0, medium: 0, low: 0 },
        findings: [],
      };
    }
    return SAMPLE_ANALYSIS_RESPONSE;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${activeApiBase}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        data.detail ||
        data.message ||
        (response.statusText
          ? `Analysis failed: ${response.status} ${response.statusText}`
          : 'Analysis failed');
      throw new Error(errMsg);
    }

    return data as AnalysisResponse;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Request timed out after 120 seconds. The backend analysis is taking longer than expected.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
