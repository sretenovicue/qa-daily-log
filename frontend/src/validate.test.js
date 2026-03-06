import { describe, it, expect } from 'vitest';
import { validateEntry, ValidationError } from './validate';

describe('validateEntry', () => {
  const valid = {
    category: 'manual',
    action: 'executed',
    status: 'done',
    description: 'Test opis',
    manualTime: '1:00',
  };

  it('prolazi za kompletan validan unos', () => {
    expect(validateEntry(valid)).toEqual([]);
  });

  it('greška ako nema kategorije', () => {
    const errors = validateEntry({ ...valid, category: '' });
    expect(errors).toContain('validation.categoryRequired');
  });

  it('greška ako nema akcije', () => {
    const errors = validateEntry({ ...valid, action: '' });
    expect(errors).toContain('validation.actionRequired');
  });

  it('greška ako nema statusa', () => {
    const errors = validateEntry({ ...valid, status: '' });
    expect(errors).toContain('validation.statusRequired');
  });

  it('greška ako nema opisa', () => {
    const errors = validateEntry({ ...valid, description: '' });
    expect(errors).toContain('validation.descriptionRequired');
  });

  it('greška ako nema trajanja', () => {
    const errors = validateEntry({ ...valid, manualTime: '' });
    expect(errors).toContain('validation.durationRequired');
  });

  it('prolazi za ispravno vreme 1:30', () => {
    expect(validateEntry({ ...valid, manualTime: '1:30' })).toEqual([]);
  });

  it('prolazi za ispravno vreme 0:05', () => {
    expect(validateEntry({ ...valid, manualTime: '0:05' })).toEqual([]);
  });

  it('greška za neispravan format vremena "90"', () => {
    const errors = validateEntry({ ...valid, manualTime: '90' });
    expect(errors).toContain('validation.durationFormat');
  });

  it('greška za format "1:60" (minuti van opsega)', () => {
    const errors = validateEntry({ ...valid, manualTime: '1:60' });
    expect(errors).toContain('validation.durationFormat');
  });

  it('vraća više grešaka za prazan unos', () => {
    const errors = validateEntry({ category: '', action: '', status: '', description: '', manualTime: '' });
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('ValidationError', () => {
  it('sadrži listu grešaka', () => {
    const err = new ValidationError(['validation.categoryRequired', 'validation.actionRequired']);
    expect(err.errors).toHaveLength(2);
    expect(err.name).toBe('ValidationError');
    expect(err instanceof Error).toBe(true);
  });
});
