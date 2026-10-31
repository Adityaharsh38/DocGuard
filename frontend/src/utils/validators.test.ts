import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRepoUrl,
  validatePrNumber,
  formatConfidence,
  formatLineNumber,
  normalizeSeverity,
} from './validators';

test('validateRepoUrl accepts valid GitHub repository URLs', () => {
  assert.equal(validateRepoUrl('https://github.com/fastapi/fastapi').isValid, true);
  assert.equal(validateRepoUrl('http://github.com/owner/my-repo').isValid, true);
  assert.equal(validateRepoUrl('https://www.github.com/owner/repo.git').isValid, true);
  assert.equal(validateRepoUrl('https://github.com/facebook/react/').isValid, true);
});

test('validateRepoUrl rejects invalid URLs', () => {
  assert.equal(validateRepoUrl('').isValid, false);
  assert.equal(validateRepoUrl('not-a-url').isValid, false);
  assert.equal(validateRepoUrl('https://gitlab.com/owner/repo').isValid, false);
  assert.equal(validateRepoUrl('https://github.com/onlyowner').isValid, false);
});

test('validatePrNumber accepts positive integers', () => {
  assert.equal(validatePrNumber(1).isValid, true);
  assert.equal(validatePrNumber('42').isValid, true);
  assert.equal(validatePrNumber(9999).isValid, true);
});

test('validatePrNumber rejects zero, negative, floats, or empty', () => {
  assert.equal(validatePrNumber(0).isValid, false);
  assert.equal(validatePrNumber(-5).isValid, false);
  assert.equal(validatePrNumber('3.14').isValid, false);
  assert.equal(validatePrNumber('').isValid, false);
  assert.equal(validatePrNumber('abc').isValid, false);
});

test('formatConfidence formats 0 to 1 as percentage and rejects invalid values', () => {
  assert.equal(formatConfidence(0.95), '95%');
  assert.equal(formatConfidence(0.88), '88%');
  assert.equal(formatConfidence(1.0), '100%');
  assert.equal(formatConfidence(0), '0%');
  assert.equal(formatConfidence(-0.1), null);
  assert.equal(formatConfidence(1.5), null);
  assert.equal(formatConfidence(undefined), null);
  assert.equal(formatConfidence('0.95'), null);
});

test('formatLineNumber handles known numbers and nulls', () => {
  assert.equal(formatLineNumber(24), 'L24');
  assert.equal(formatLineNumber(10), 'L10');
  assert.equal(formatLineNumber(null), 'line unavailable');
  assert.equal(formatLineNumber(undefined), 'line unavailable');
});

test('normalizeSeverity maps correctly', () => {
  assert.equal(normalizeSeverity('high'), 'high');
  assert.equal(normalizeSeverity('HIGH'), 'high');
  assert.equal(normalizeSeverity('Medium'), 'medium');
  assert.equal(normalizeSeverity('low'), 'low');
  assert.equal(normalizeSeverity('critical'), 'unknown');
  assert.equal(normalizeSeverity(undefined), 'unknown');
});
