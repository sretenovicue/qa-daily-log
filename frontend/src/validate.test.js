import { describe, it, expect } from 'vitest';
import { validateEntry, ValidationError } from './validate';

describe('validateEntry', () => {
  const valid = { category: 'manual', action: 'executed', manualTime: '' };

  it('prolazi za validan unos', () => {
    expect(validateEntry(valid)).toEqual([]);
  });

  it('greška ako nema kategorije', () => {
    const errors = validateEntry({ ...valid, category: '' });
    expect(errors).toContain('Kategorija je obavezna');
  });

  it('greška ako nema akcije', () => {
    const errors = validateEntry({ ...valid, action: '' });
    expect(errors).toContain('Akcija je obavezna');
  });

  it('prolazi za ispravno vreme 1:30', () => {
    expect(validateEntry({ ...valid, manualTime: '1:30' })).toEqual([]);
  });

  it('prolazi za ispravno vreme 0:05', () => {
    expect(validateEntry({ ...valid, manualTime: '0:05' })).toEqual([]);
  });

  it('greška za neispravan format vremena "90"', () => {
    const errors = validateEntry({ ...valid, manualTime: '90' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('greška za format "1:60" (minuti van opsega)', () => {
    const errors = validateEntry({ ...valid, manualTime: '1:60' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('prazno vreme je dozvoljeno', () => {
    expect(validateEntry({ ...valid, manualTime: '' })).toEqual([]);
  });
});

describe('ValidationError', () => {
  it('sadrži listu grešaka', () => {
    const err = new ValidationError(['Greška 1', 'Greška 2']);
    expect(err.errors).toHaveLength(2);
    expect(err.name).toBe('ValidationError');
    expect(err instanceof Error).toBe(true);
  });
});
