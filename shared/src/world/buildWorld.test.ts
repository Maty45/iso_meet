import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CORRIDOR_Z, WORLD_SIZE } from '../constants.js';
import type { Office } from '../types/office.js';
import { buildWorldBlocks } from './buildWorld.js';

const offices: Office[] = JSON.parse(
  readFileSync(resolve(process.cwd(), '../config/offices.json'), 'utf-8'),
).offices;

const overlaps = (a: Office, b: Office) =>
  a.bounds.minX <= b.bounds.maxX &&
  b.bounds.minX <= a.bounds.maxX &&
  a.bounds.minZ <= b.bounds.maxZ &&
  b.bounds.minZ <= a.bounds.maxZ;

describe('config/offices.json', () => {
  it('tiene al menos 5 salas con id único', () => {
    expect(offices.length).toBeGreaterThanOrEqual(5);
    expect(new Set(offices.map((o) => o.id)).size).toBe(offices.length);
  });

  it('ninguna sala se solapa con otra', () => {
    const collisions = offices.flatMap((a, i) =>
      offices.slice(i + 1).filter((b) => overlaps(a, b)).map((b) => `${a.id}/${b.id}`),
    );
    expect(collisions).toEqual([]);
  });

  it('todas las salas entran en el mundo y dejan libre el pasillo', () => {
    for (const o of offices) {
      const { minX, maxX, minZ, maxZ } = o.bounds;
      expect(minX, o.id).toBeGreaterThan(0);
      expect(maxX, o.id).toBeLessThan(WORLD_SIZE.width - 1);
      expect(minZ, o.id).toBeGreaterThan(0);
      expect(maxZ, o.id).toBeLessThan(WORLD_SIZE.depth - 1);
      // no invade el pasillo central: o queda arriba, o queda abajo
      const clear = maxZ < CORRIDOR_Z.min || minZ > CORRIDOR_Z.max;
      expect(clear, `${o.id} invade el pasillo`).toBe(true);
    }
  });
});

describe('buildWorldBlocks', () => {
  const { blocks, doors, wallTypeOf } = buildWorldBlocks(offices);
  const at = (x: number, y: number, z: number) =>
    blocks.find((b) => b.x === x && b.y === y && b.z === z);

  it('da una puerta por sala, en el muro que mira al pasillo', () => {
    expect(doors.length).toBe(offices.length);
    for (const d of doors) {
      const o = offices.find((x) => x.id === d.officeId)!;
      const wallIsFacingCorridor =
        d.facing === 1 ? d.z === o.bounds.maxZ : d.z === o.bounds.minZ;
      expect(wallIsFacingCorridor, d.officeId).toBe(true);
      // el vano son 2 bloques libres a la altura del jugador
      expect(at(d.x - 1, 1, d.z), `${d.officeId} vano y=1`).toBeUndefined();
      expect(at(d.x, 1, d.z), `${d.officeId} vano y=1`).toBeUndefined();
      expect(at(d.x - 1, 2, d.z), `${d.officeId} vano y=2`).toBeUndefined();
      // y tiene dintel arriba, para que no sea un agujero en la pared
      expect(at(d.x, 3, d.z)?.type, `${d.officeId} dintel`).toBe('trim');
    }
  });

  it('cierra el muro de cada sala salvo el vano', () => {
    for (const o of offices) {
      const door = doors.find((d) => d.officeId === o.id)!;
      for (let x = o.bounds.minX; x <= o.bounds.maxX; x++) {
        const inGap = x === door.x || x === door.x - 1;
        const block = at(x, 1, door.z);
        if (inGap) expect(block, `${o.id} x=${x}`).toBeUndefined();
        else expect(block, `${o.id} x=${x}`).toBeDefined();
      }
    }
  });

  it('da un color de pared distinto a cada sala', () => {
    const used = offices.map((o) => wallTypeOf[o.id]);
    expect(new Set(used).size).toBe(offices.length);
  });
});
