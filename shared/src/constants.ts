export const WORLD_SIZE = { width: 40, depth: 40, height: 12 } as const;
export const PLAYER = {
  half: 0.3,
  height: 1.8,
  eyeStand: 1.62,
  speedWalk: 4.317,
  gravity: 32,
  jumpV: 8.94,
  maxSpeed: 6,
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
