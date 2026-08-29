export const WORLD_SIZE = { width: 60, depth: 48, height: 12 } as const;
// Pasillo central horizontal: separa la fila de salas de arriba de la de abajo.
// Las puertas de cada sala se abren hacia acá (ver buildWorldBlocks).
export const CORRIDOR_Z = { min: 19, max: 27 } as const;
export const PLAYER = {
  half: 0.3,
  height: 1.8,
  eyeStand: 1.62,
  speedWalk: 4.317,
  speedSprint: 6.6,
  gravity: 32,
  jumpV: 8.94,
  maxSpeed: 8,
  coyoteTime: 0.12,
  jumpBuffer: 0.15,
} as const;
export const CAMERA = {
  frustumSize: 26,
  minZoom: 0.5,
  maxZoom: 2.0,
} as const;
export const NETWORK = {
  sendHz: 20,
  interpDelayMs: 100,
  maxPlayersPerRoom: 20,
} as const;

/**
 * Personajes disponibles (Kenney Blocky Characters, CC0). Todos comparten rig y los 27 clips,
 * así que la skin no cambia nada de la animación. El server sortea una por ingreso.
 */
export const SKINS = [
  'character-a', 'character-b', 'character-c', 'character-d', 'character-e', 'character-f',
  'character-g', 'character-h', 'character-i', 'character-j', 'character-k', 'character-l',
  'character-m', 'character-n', 'character-o', 'character-p', 'character-q', 'character-r',
] as const;
export type Skin = (typeof SKINS)[number];
export const DEFAULT_SKIN: Skin = 'character-a';

export function randomSkin(): Skin {
  return SKINS[Math.floor(Math.random() * SKINS.length)];
}
