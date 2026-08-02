import assert from 'node:assert';
import { test } from 'node:test';
import {
  calculateLeadScore,
  leadCaptureSchema
} from '../src/lib/businessLogic.js';

test('Lead Score Calculation - Baseline', () => {
  const score = calculateLeadScore({});
  assert.strictEqual(score, 50, 'Base score should be 50');
});

test('Lead Score Calculation - Max Score', () => {
  const score = calculateLeadScore({
    budget: '10k+',
    timing: 'asap',
    phone: '12345678',
    website: 'https://example.com'
  });
  // 50 + 20 + 15 + 10 + 5 = 100
  assert.strictEqual(score, 100, 'Score should be 100');
});

test('Lead Score Calculation - Capped at 100', () => {
  const score = calculateLeadScore({
    budget: '10k+',
    timing: 'asap',
    phone: '12345678',
    website: 'https://example.com' // Wait, if I add more criteria in future, it should cap
  });
  assert.ok(score <= 100, 'Score should not exceed 100');
});

test('Validation - Honeypot triggers failure', () => {
  const result = leadCaptureSchema.safeParse({
    name: 'Bot',
    email: 'bot@example.com',
    service: 'Website',
    consent: true,
    _honey: 'im-a-bot' // Spam!
  });
  assert.strictEqual(result.success, false);
});

test('Validation - Valid Submission Passes', () => {
  const result = leadCaptureSchema.safeParse({
    name: 'Real User',
    company: 'Real Company Sdn Bhd',
    email: 'real@example.com',
    phone: '+60123456789',
    country: 'Malaysia',
    service: 'Launch Website',
    budget: 'RM3,000 - RM6,000',
    timing: 'Within 1 month',
    consent: true,
    _honey: '' // Clean
  });
  assert.strictEqual(result.success, true);
});

test('Validation - Optional company and country may be blank', () => {
  const result = leadCaptureSchema.safeParse({
    name: 'Real User',
    company: '',
    email: 'real@example.com',
    phone: '+60123456789',
    country: '',
    website: '',
    service: 'Launch Website',
    budget: 'RM3,000 - RM6,000',
    timing: 'Within 1 month',
    consent: true,
    _honey: ''
  });
  assert.strictEqual(result.success, true);
});
