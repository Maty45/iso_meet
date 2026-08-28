import type { BlockType } from '@iso-meet/shared';

export const BLOCK_COLORS: Record<BlockType, number> = {
  grass: 0x5dbb63,
  stone: 0x9e9e9e,
  wood: 0x8d6e63,
  glass: 0xadd8e6,
  wool: 0xf5f5f5,
  air: 0x000000,
  wall_pink: 0xe8a0bf,
  wall_purple: 0x9b8ec4,
  desk: 0xf5e6a3,
  monitor: 0x2c3e50,
  plant: 0x2ecc71,
  shelf: 0x8d6e63,
};

export const BLOCK_SOLID: Record<BlockType, boolean> = {
  grass: true,
  stone: true,
  wood: true,
  glass: false,
  wool: true,
  air: false,
  wall_pink: true,
  wall_purple: true,
  desk: true,
  monitor: false,
  plant: false,
  shelf: true,
};

export function isSolid(type: BlockType): boolean {
  return BLOCK_SOLID[type];
}
