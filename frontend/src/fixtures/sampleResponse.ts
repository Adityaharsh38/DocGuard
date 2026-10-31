import { AnalysisResponse } from '../types';

/**
 * Official Sample Response Fixture from Section 16 of DocGuard Integration Guide
 * For UI development, visual verification, and standalone demo when live backend is offline.
 */
export const SAMPLE_ANALYSIS_RESPONSE: AnalysisResponse = {
  status: 'completed',
  summary: {
    total_findings: 2,
    high: 1,
    medium: 1,
    low: 0,
  },
  findings: [
    {
      id: 'demo-001',
      type: 'api_reference',
      severity: 'high',
      docs_file: 'README.md',
      docs_line: 24,
      documented_value: 'createUser(name, email)',
      actual_value: "createUser(name, email, role='user')",
      code_file: 'src/users.py',
      code_line: 10,
      explanation: 'Demo only: the documented signature omits a parameter.',
      suggestion: 'Demo only: document the role parameter and its default.',
      confidence: 0.95,
    },
    {
      id: 'demo-002',
      type: 'configuration_default',
      severity: 'medium',
      docs_file: 'docs/configuration.md',
      docs_line: 12,
      documented_value: 'timeout = 10',
      actual_value: 'timeout = 30',
      code_file: 'app/config.py',
      code_line: 8,
      explanation: 'Demo only: the documented default differs from code.',
      suggestion: 'Demo only: update the documented default to 30.',
      confidence: 0.88,
    },
  ],
};

export const SAMPLE_ZERO_FINDINGS_RESPONSE: AnalysisResponse = {
  status: 'completed',
  summary: {
    total_findings: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
  findings: [],
};
