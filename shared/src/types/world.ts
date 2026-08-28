import type { Office } from './office.js';
import type { Vec3 } from './vec3.js';

export type BlockType = 'grass' | 'stone' | 'wood' | 'glass' | 'wool' | 'air' | 'wall_pink' | 'wall_purple' | 'wall_teal' | 'trim' | 'desk' | 'monitor' | 'plant' | 'shelf';

export interface BlockData {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export interface WorldConfig {
  size: { width: number; depth: number; height: number };
  blocks: BlockData[];
  offices: Office[];
  spawnPoints: Vec3[];
}
