import { describe, it, expect } from 'vitest';

// ── parseId (same logic as routes/entries.js) ────────────────────────
function parseId(param) {
  const id = parseInt(param, 10);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// ── task_number format regex ──────────────────────────────────────────
// Expected: QA-YYYYMMDD-NNN  e.g. QA-20240301-001
const TASK_RE = /^QA-\d{8}-\d{3}$/;

describe('parseId', () => {
  it('returns integer for valid positive string', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId('42')).toBe(42);
    expect(parseId('999')).toBe(999);
  });

  it('returns null for zero', () => {
    expect(parseId('0')).toBeNull();
    expect(parseId(0)).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(parseId('-1')).toBeNull();
    expect(parseId('-100')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parseId('abc')).toBeNull();
    expect(parseId('')).toBeNull();
    expect(parseId('1.5')).toBe(1); // parseInt truncates
  });

  it('returns null for float string that parses to 0', () => {
    expect(parseId('0.9')).toBeNull();
  });

  it('returns null for null / undefined', () => {
    expect(parseId(null)).toBeNull();
    expect(parseId(undefined)).toBeNull();
  });

  it('accepts numeric input directly', () => {
    expect(parseId(5)).toBe(5);
  });
});

describe('task_number format', () => {
  it('matches valid task numbers', () => {
    expect(TASK_RE.test('QA-20240301-001')).toBe(true);
    expect(TASK_RE.test('QA-20251231-099')).toBe(true);
    expect(TASK_RE.test('QA-20260101-999')).toBe(true);
  });

  it('rejects malformed task numbers', () => {
    expect(TASK_RE.test('QA-2024-03-01-001')).toBe(false); // wrong date format
    expect(TASK_RE.test('QA-20240301-01')).toBe(false);    // seq too short
    expect(TASK_RE.test('QA-20240301-1000')).toBe(false);  // seq too long
    expect(TASK_RE.test('qa-20240301-001')).toBe(false);   // lowercase prefix
    expect(TASK_RE.test('20240301-001')).toBe(false);      // missing prefix
    expect(TASK_RE.test('')).toBe(false);
  });
});
