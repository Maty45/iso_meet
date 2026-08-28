import type { BlockType } from '@iso-meet/shared';

export const BLOCK_COLORS: Record<BlockType, number> = {
  grass: 0xe4e2dd, // piso base del edificio (no es pasto, es el solado del pasillo)
  stone: 0x9e9e9e,
  wood: 0x8d6e63,
  glass: 0xadd8e6,
  wool: 0xf5f5f5,
  air: 0x000000,
  // Paredes: gris claro apagado como la referencia, con un tinte distinto por sala.
  wall_pink: 0xd8c4ce,
  wall_purple: 0xc7c4dc,
  wall_teal: 0xb9d1ce,
  wall_sand: 0xdcd3c1,
  wall_sage: 0xc6d3c1,
  wall_front: 0xd6dae0, // muro que mira a la cámara: se dibuja translúcido
  trim: 0x4a4f57, // marcos de puerta y ventana
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
  wall_teal: true,
  wall_sand: true,
  wall_sage: true,
  wall_front: true, // translúcido pero sólido: no se atraviesa
  trim: true,
  desk: true,
  monitor: false,
  plant: false,
  shelf: true,
};

export function isSolid(type: BlockType): boolean {
  return BLOCK_SOLID[type];
}
