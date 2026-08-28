import { describe, expect, it } from 'vitest';
import type { Office } from './types/office.js';

function isInside(
  pos: { x: number; y: number; z: number },
  b: Office['bounds'],
): boolean {
  return (
    pos.x >= b.minX &&
    pos.x <= b.maxX &&
    pos.y >= b.minY &&
    pos.y <= b.maxY &&
    pos.z >= b.minZ &&
    pos.z <= b.maxZ
  );
}

const office: Office = {
  id: 'office-1',
  name: 'Sala Dev',
  bounds: { minX: 2, maxX: 12, minY: 0, maxY: 6, minZ: 2, maxZ: 12 },
  meetingUrl: 'https://meet.google.com/abc-defg-hij',
  spawnPoint: { x: 7, y: 1, z: 7 },
};

describe('office isInside', () => {
  it('dentro', () =>
    expect(isInside({ x: 7, y: 1, z: 7 }, office.bounds)).toBe(true));
  it('fuera X', () =>
    expect(isInside({ x: 1, y: 1, z: 7 }, office.bounds)).toBe(false));
  it('fuera Z', () =>
    expect(isInside({ x: 7, y: 1, z: 13 }, office.bounds)).toBe(false));
  it('borde inclusive', () =>
    expect(isInside({ x: 2, y: 0, z: 2 }, office.bounds)).toBe(true));
  it('borde max inclusive', () =>
    expect(isInside({ x: 12, y: 6, z: 12 }, office.bounds)).toBe(true));
  it('fuera Y', () =>
    expect(isInside({ x: 7, y: 7, z: 7 }, office.bounds)).toBe(false));
});
