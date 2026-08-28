import { CORRIDOR_Z, WORLD_SIZE } from '../constants.js';
import type { Office } from '../types/office.js';
import type { BlockData, BlockType } from '../types/world.js';

// Color de pared por sala, por índice (no por id): agregar una sala no pide tocar código.
// Tipos propios por sala: reusar 'wood'/'shelf' daba dos salas del mismo color.
export const WALL_TYPES: BlockType[] = [
  'wall_pink',
  'wall_sand',
  'wall_purple',
  'wall_sage',
  'wall_teal',
];

export interface DoorInfo {
  officeId: string;
  /** Centro del vano (2 bloques de ancho) */
  x: number;
  z: number;
  /** +1 si el pasillo está en z mayor que la puerta, -1 si está en z menor */
  facing: 1 | -1;
}

export interface WorldGeometry {
  blocks: BlockData[];
  doors: DoorInfo[];
  wallTypeOf: Record<string, BlockType>;
}

/**
 * Única fuente de verdad de la geometría del mundo: perímetro, muros de cada sala,
 * puertas que dan al pasillo central y ventanas.
 * La usan el server (world autoritativo) y el cliente (modo offline) — si divergieran,
 * el mundo offline dejaría de coincidir con el online.
 * Los muebles NO son bloques: los pone el cliente con los GLB del catálogo.
 */
export function buildWorldBlocks(offices: Office[]): WorldGeometry {
  const blocks: BlockData[] = [];
  const doors: DoorInfo[] = [];
  const wallTypeOf: Record<string, BlockType> = {};

  const push = (x: number, y: number, z: number, type: BlockType) => {
    if (
      x >= 0 &&
      x < WORLD_SIZE.width &&
      z >= 0 &&
      z < WORLD_SIZE.depth &&
      y >= 0 &&
      y < WORLD_SIZE.height
    ) {
      blocks.push({ x, y, z, type });
    }
  };

  // paredes perimetrales del mundo
  for (let x = 0; x < WORLD_SIZE.width; x++)
    for (let y = 1; y <= 3; y++) {
      push(x, y, 0, 'stone');
      push(x, y, WORLD_SIZE.depth - 1, 'stone');
    }
  for (let z = 0; z < WORLD_SIZE.depth; z++)
    for (let y = 1; y <= 3; y++) {
      push(0, y, z, 'stone');
      push(WORLD_SIZE.width - 1, y, z, 'stone');
    }

  offices.forEach((office, i) => {
    const { minX, maxX, minZ, maxZ } = office.bounds;
    const wall = WALL_TYPES[i % WALL_TYPES.length];
    wallTypeOf[office.id] = wall;

    // La puerta va en el muro que mira al pasillo central.
    const centerZ = (minZ + maxZ) / 2;
    const above = centerZ < CORRIDOR_Z.min;
    const doorWallZ = above ? maxZ : minZ;
    const doorX = Math.floor((minX + maxX) / 2); // vano en doorX y doorX+1

    doors.push({
      officeId: office.id,
      x: doorX + 1,
      z: doorWallZ,
      facing: above ? 1 : -1,
    });

    // Ventanas: solo en los muros opacos (minZ y minX). Los muros maxX/maxZ miran a la
    // cámara y van translúcidos, así se ve adentro de la sala como en una lámina isométrica.
    const zWindows = [minX + 2, maxX - 3];
    const xWindows = [minZ + 3, maxZ - 4];
    const nearDoor = (x: number) => doorWallZ === minZ && Math.abs(x - doorX) <= 2;
    const isZWindow = (x: number, y: number) =>
      y >= 2 && !nearDoor(x) && zWindows.some((w) => x === w || x === w + 1);
    const isXWindow = (z: number, y: number) =>
      y >= 2 && xWindows.some((w) => z === w || z === w + 1);

    for (let y = 1; y <= 3; y++) {
      // muros norte (minZ, opaco) y sur (maxZ, hacia la cámara)
      for (const wallZ of [minZ, maxZ]) {
        const near = wallZ === maxZ;
        for (let x = minX; x <= maxX; x++) {
          const inDoorGap =
            wallZ === doorWallZ && y <= 2 && (x === doorX || x === doorX + 1);
          if (inDoorGap) continue;
          // marco de la puerta: jambas a los costados + dintel arriba del vano
          const isJamb =
            wallZ === doorWallZ && (x === doorX - 1 || x === doorX + 2);
          const isLintel =
            wallZ === doorWallZ && y === 3 && (x === doorX || x === doorX + 1);
          if (isJamb || isLintel) {
            push(x, y, wallZ, 'trim');
            continue;
          }
          if (!near && wallZ === minZ && isZWindow(x, y)) {
            push(x, y, wallZ, 'glass');
            continue;
          }
          push(x, y, wallZ, near ? 'wall_front' : wall);
        }
      }
      // muros este/oeste (evita esquinas duplicadas)
      for (let z = minZ + 1; z <= maxZ - 1; z++) {
        push(minX, y, z, isXWindow(z, y) ? 'glass' : wall);
        push(maxX, y, z, 'wall_front');
      }
    }
  });

  return { blocks, doors, wallTypeOf };
}
