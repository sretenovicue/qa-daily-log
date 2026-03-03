import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Email validation (same regex as routes/auth.js) ──────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

const SECRET = 'test-secret-at-least-32-chars-long!!';

function signToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '1h' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// ─────────────────────────────────────────────────────────────────────

describe('Email validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('qa.tester+1@company.org')).toBe(true);
    expect(isValidEmail('a@b.io')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@nodomain')).toBe(false);
    expect(isValidEmail('noat.domain')).toBe(false);
    expect(isValidEmail('spaces @x.com')).toBe(false);
  });
});

describe('Password validation', () => {
  it('accepts password with 8+ chars', () => {
    expect(isValidPassword('12345678')).toBe(true);
    expect(isValidPassword('verysecret!')).toBe(true);
  });

  it('rejects short passwords', () => {
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidPassword(null)).toBe(false);
    expect(isValidPassword(undefined)).toBe(false);
    expect(isValidPassword(12345678)).toBe(false);
  });
});

describe('Password hashing', () => {
  it('hash differs from plain text', async () => {
    const hash = await hashPassword('mysecret1');
    expect(hash).not.toBe('mysecret1');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('comparePassword returns true for correct password', async () => {
    const hash = await hashPassword('correct-horse');
    expect(await comparePassword('correct-horse', hash)).toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const hash = await hashPassword('correct-horse');
    expect(await comparePassword('wrong-horse', hash)).toBe(false);
  });
});

describe('JWT sign + verify round-trip', () => {
  it('verifies a freshly signed token', () => {
    const token   = signToken(42);
    const payload = verifyToken(token);
    expect(payload.userId).toBe(42);
  });

  it('throws on tampered token', () => {
    const token = signToken(1) + 'tampered';
    expect(() => verifyToken(token)).toThrow();
  });

  it('throws on expired token', async () => {
    const expired = jwt.sign({ userId: 5 }, SECRET, { expiresIn: '0ms' });
    // tiny wait to ensure expiry
    await new Promise(r => setTimeout(r, 5));
    expect(() => verifyToken(expired)).toThrow();
  });

  it('payload carries correct userId', () => {
    const token = signToken(99);
    const { userId } = verifyToken(token);
    expect(userId).toBe(99);
  });
});
