import { describe, it, expect } from 'vitest';
import { parseManualTime, secondsToHuman, todayStr } from './constants';

describe('parseManualTime', () => {
  it('vraća 0 za prazno', () => expect(parseManualTime('')).toBe(0));
  it('vraća 0 za undefined', () => expect(parseManualTime(undefined)).toBe(0));
  it('parsira 1:30 u 5400 sekundi', () => expect(parseManualTime('1:30')).toBe(5400));
  it('parsira 0:45 u 2700 sekundi', () => expect(parseManualTime('0:45')).toBe(2700));
  it('parsira 0:05 u 300 sekundi', () => expect(parseManualTime('0:05')).toBe(300));
  it('parsira 2:00 u 7200 sekundi', () => expect(parseManualTime('2:00')).toBe(7200));
});

describe('secondsToHuman', () => {
  it('vraća null za 0', () => expect(secondsToHuman(0)).toBeNull());
  it('vraća null za undefined/falsy', () => expect(secondsToHuman(undefined)).toBeNull());
  it('prikazuje samo minute za < 1h', () => expect(secondsToHuman(2700)).toBe('45m'));
  it('prikazuje sate i minute', () => expect(secondsToHuman(5400)).toBe('1h 30m'));
  it('prikazuje 0m za manje od minute', () => expect(secondsToHuman(30)).toBe('0m'));
});

describe('todayStr', () => {
  it('vraća string u YYYY-MM-DD formatu', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('odgovara današnjem datumu', () => {
    expect(todayStr()).toBe(new Date().toISOString().slice(0, 10));
  });
});
