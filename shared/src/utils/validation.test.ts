import { describe, expect, it } from 'vitest';
import {
  isValidMeetUrl,
  joinSchema,
  moveSchema,
  officeIdSchema,
  sanitizeName,
} from './validation.js';

describe('sanitizeName', () => {
  it('trim y slice 16', () =>
    expect(sanitizeName('  Matías 1234567890123456  ')).toBe(
      'Matas 123456789',
    ));
  it('remueve chars no permitidos', () =>
    expect(sanitizeName('a*/b')).toBe('ab'));
  it('fallback guest', () => expect(sanitizeName('***')).toBe('guest'));
  it('max 16', () => expect(sanitizeName('a'.repeat(20)).length).toBe(16));
});

describe('isValidMeetUrl', () => {
  it('valida https meet', () =>
    expect(isValidMeetUrl('https://meet.google.com/abc-defg-hij')).toBe(true));
  it('rechaza http', () =>
    expect(isValidMeetUrl('http://meet.google.com/abc')).toBe(false));
  it('rechaza otro host', () =>
    expect(isValidMeetUrl('https://evil.com/abc')).toBe(false));
  it('rechaza invalida', () => expect(isValidMeetUrl('not a url')).toBe(false));
});

describe('joinSchema', () => {
  it('acepta nombre valido', () =>
    expect(joinSchema.safeParse({ name: 'Matias' }).success).toBe(true));
  it('rechaza vacio', () =>
    expect(joinSchema.safeParse({ name: '' }).success).toBe(false));
  it('rechaza >16', () =>
    expect(joinSchema.safeParse({ name: 'a'.repeat(17) }).success).toBe(false));
  it('rechaza chars invalidos', () =>
    expect(joinSchema.safeParse({ name: 'a*b' }).success).toBe(false));
});

describe('moveSchema', () => {
  it('acepta valido', () =>
    expect(
      moveSchema.safeParse({
        position: { x: 1, y: 1, z: 1 },
        rotation: 0,
        animationState: 'walk',
      }).success,
    ).toBe(true));
  it('rechaza NaN', () =>
    expect(
      moveSchema.safeParse({
        position: { x: Number.NaN, y: 0, z: 0 },
        rotation: 0,
        animationState: 'idle',
      }).success,
    ).toBe(false));
  it('rechaza anim invalida', () =>
    expect(
      moveSchema.safeParse({
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        animationState: 'run' as any,
      }).success,
    ).toBe(false));
});

describe('officeIdSchema', () => {
  it('acepta', () =>
    expect(officeIdSchema.safeParse({ officeId: 'office-1' }).success).toBe(
      true,
    ));
  it('rechaza vacio', () =>
    expect(officeIdSchema.safeParse({ officeId: '' }).success).toBe(false));
});
