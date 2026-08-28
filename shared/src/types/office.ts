import type { Vec3 } from './vec3.js';

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Office {
  id: string;
  name: string;
  bounds: Bounds;
  meetingUrl: string;
  spawnPoint: Vec3;
}

export interface OfficeConfig {
  offices: Office[];
}
