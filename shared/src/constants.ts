export const WORLD_SIZE = { width: 48, depth: 40, height: 12 } as const;
// Pasillo central horizontal: separa la fila de salas de arriba de la de abajo.
// Las puertas de cada sala se abren hacia acá (ver buildWorldBlocks).
export const CORRIDOR_Z = { min: 15, max: 23 } as const;
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
  frustumSize: 30,
  minZoom: 0.5,
  maxZoom: 2.0,
} as const;
export const NETWORK = {
  sendHz: 20,
  interpDelayMs: 100,
  maxPlayersPerRoom: 20,
} as const;
