import type { Office, WorldConfig } from '@iso-meet/shared';
import type { Player } from '../players/player.js';

export class Room {
  players = new Map<string, Player>();
  offices: Office[];
  worldConfig: WorldConfig;

  constructor(offices: Office[], worldConfig: WorldConfig) {
    this.offices = offices;
    this.worldConfig = worldConfig;
  }

  isInside(pos: { x: number; y: number; z: number }, o: Office): boolean {
    const b = o.bounds;
    return (
      pos.x >= b.minX &&
      pos.x <= b.maxX &&
      pos.y >= b.minY &&
      pos.y <= b.maxY &&
      pos.z >= b.minZ &&
      pos.z <= b.maxZ
    );
  }

  officeAt(pos: { x: number; y: number; z: number }): Office | null {
    for (const o of this.offices) if (this.isInside(pos, o)) return o;
    return null;
  }
}
