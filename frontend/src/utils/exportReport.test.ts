import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvField,
  formatFindingsAsCsv,
  formatReportAsJson,
  getExportFilename,
} from './exportReport';
import { Finding, AnalysisResponse } from '../types';

test('escapeCsvField handles simple strings and special characters', () => {
  assert.equal(escapeCsvField('hello'), '"hello"');
  assert.equal(escapeCsvField('hello, world'), '"hello, world"');
  assert.equal(escapeCsvField('said "yes"'), '"said ""yes"""');
  assert.equal(escapeCsvField(null), '""');
  assert.equal(escapeCsvField(undefined), '""');
  assert.equal(escapeCsvField(42), '"42"');
});

test('formatReportAsJson produces valid JSON with metadata', () => {
  const dummyReport: AnalysisResponse = {
    status: 'completed',
    summary: { total_findings: 1, high: 1, medium: 0, low: 0 },
    findings: [],
  };
  const jsonStr = formatReportAsJson(dummyReport, 'https://github.com/test/repo', 42);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.status, 'completed');
  assert.equal(parsed.metadata.repo_url, 'https://github.com/test/repo');
  assert.equal(parsed.metadata.pr_number, 42);
  assert.ok(parsed.metadata.generated_at);
});

test('formatFindingsAsCsv generates valid CSV header and rows', () => {
  const findings: Finding[] = [
    {
      id: 'finding-001',
      type: 'api_reference',
      severity: 'high',
      docs_file: 'README.md',
      docs_line: 24,
      documented_value: 'createUser(name, email)',
      actual_value: "createUser(name, email, role='user')",
      code_file: 'src/users.py',
      code_line: 10,
      explanation: 'The function now accepts an additional role parameter.',
      suggestion: 'Update the documentation to include the role parameter.',
      confidence: 0.95,
    },
  ];

  const csv = formatFindingsAsCsv(findings, 'https://github.com/test/repo', 42);
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('Finding ID'));
  assert.ok(lines[0].includes('Suggested Correction'));
  assert.ok(lines[1].includes('"finding-001"'));
  assert.ok(lines[1].includes('"createUser(name, email)"'));
  assert.ok(lines[1].includes('95%'));
});

test('getExportFilename formats clean filenames', () => {
  assert.equal(
    getExportFilename('https://github.com/fastapi/fastapi', 42, 'json'),
    'docguard-audit-fastapi_fastapi-pr42.json'
  );
  assert.equal(
    getExportFilename('https://github.com/fastapi/fastapi', 42, 'csv'),
    'docguard-audit-fastapi_fastapi-pr42.csv'
  );
});
