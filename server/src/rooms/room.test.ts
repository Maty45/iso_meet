import type { Office, WorldConfig } from '@iso-meet/shared';
import { describe, expect, it } from 'vitest';
import { Room } from './room.js';

const offices: Office[] = [
  {
    id: 'office-1',
    name: 'Sala Dev',
    bounds: { minX: 2, maxX: 12, minY: 0, maxY: 6, minZ: 2, maxZ: 12 },
    meetingUrl: 'https://meet.google.com/a',
    spawnPoint: { x: 7, y: 1, z: 7 },
  },
  {
    id: 'office-2',
    name: 'Sala 2',
    bounds: { minX: 16, maxX: 26, minY: 0, maxY: 6, minZ: 16, maxZ: 26 },
    meetingUrl: 'https://meet.google.com/b',
    spawnPoint: { x: 21, y: 1, z: 21 },
  },
];
const world = {
  size: { width: 40, depth: 40, height: 12 },
  blocks: [],
  offices,
  spawnPoints: [{ x: 20, y: 1, z: 20 }],
} as WorldConfig;

describe('Room', () => {
  it('isInside true/false', () => {
    const r = new Room(offices, world);
    expect(r.isInside({ x: 7, y: 1, z: 7 }, offices[0])).toBe(true);
    expect(r.isInside({ x: 0, y: 0, z: 0 }, offices[0])).toBe(false);
  });
  it('officeAt encuentra', () => {
    const r = new Room(offices, world);
    expect(r.officeAt({ x: 7, y: 1, z: 7 })?.id).toBe('office-1');
    expect(r.officeAt({ x: 0, y: 0, z: 0 })).toBeNull();
    expect(r.officeAt({ x: 20, y: 1, z: 20 })?.id).toBe('office-2');
  });
});
