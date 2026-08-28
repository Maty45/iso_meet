import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Office } from '@iso-meet/shared';
import { describe, expect, it } from 'vitest';
import { assetsCatalog } from '../assets/catalog.js';
import { isFlipped, meetingSpot, officeProps, themeFor } from './officeLayout.js';

const offices: Office[] = JSON.parse(
  readFileSync(resolve(process.cwd(), '../config/offices.json'), 'utf-8'),
).offices;

const props = (o: Office) => officeProps(themeFor(o.id), isFlipped(o.bounds));

/** Tamano real del modelo, leido del GLB (no un numero inventado en el test). */
const sizeCache = new Map<string, [number, number, number]>();
function modelSize(type: string): [number, number, number] {
  const cached = sizeCache.get(type);
  if (cached) return cached;
  const buf = readFileSync(join(process.cwd(), 'public', assetsCatalog[type].url));
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf-8'));
  const mn = [Infinity, Infinity, Infinity];
  const mx = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes ?? []) {
    for (const prim of mesh.primitives) {
      const acc = gltf.accessors[prim.attributes.POSITION];
      for (let i = 0; i < 3; i++) {
        mn[i] = Math.min(mn[i], acc.min[i]);
        mx[i] = Math.max(mx[i], acc.max[i]);
      }
    }
  }
  const size: [number, number, number] = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  sizeCache.set(type, size);
  return size;
}

/** Medias extensiones sobre el piso, ya escaladas y rotadas. */
function footprint(type: string, propScale = 1, rotY = 0): [number, number] {
  const [w, , d] = modelSize(type);
  const s = (assetsCatalog[type].scale ?? 1) * propScale;
  const hw = (w * s) / 2;
  const hd = (d * s) / 2;
  const turns = rotY / (Math.PI / 2);
  const isQuarter = Math.abs(turns - Math.round(turns)) < 0.01;
  if (!isQuarter) {
    // rotacion libre: usa el lado mayor para los dos ejes (conservador)
    return [Math.max(hw, hd), Math.max(hw, hd)];
  }
  return Math.round(Math.abs(turns)) % 2 === 1 ? [hd, hw] : [hw, hd];
}

describe('muebles de cada sala', () => {
  it('todos los props existen en el catalogo', () => {
    const types = new Set(offices.flatMap((o) => props(o).map((p) => p.type)));
    const missing = [...types].filter((t) => !assetsCatalog[t]);
    expect(missing).toEqual([]);
  });

  it('ningun mueble atraviesa una pared', () => {
    const outside: string[] = [];
    for (const o of offices) {
      // interior util: las paredes ocupan su propia celda (minX..minX+1, maxX..maxX+1)
      const halfX = (o.bounds.maxX - (o.bounds.minX + 1)) / 2;
      const halfZ = (o.bounds.maxZ - (o.bounds.minZ + 1)) / 2;
      for (const p of props(o)) {
        const [hx, hz] = footprint(p.type, p.scale, p.rotY ?? 0);
        const reachX = Math.abs(p.dx) + hx;
        const reachZ = Math.abs(p.dz) + hz;
        // Lo colgado (cuadros, apliques, estantes, TV) va embutido en la pared a
        // proposito; lo que no puede es cruzarla y salir del otro lado. El muro
        // tiene 1 bloque de espesor.
        const slack = p.dy >= 1.4 ? 1 : 0.02;
        if (reachX > halfX + slack || reachZ > halfZ + slack) {
          outside.push(
            `${o.id}:${p.type} llega a ${reachX.toFixed(2)}/${reachZ.toFixed(2)} y el interior es ${halfX} (+${slack})`,
          );
        }
      }
    }
    expect(outside).toEqual([]);
  });

  it('no tapa el vano de la puerta', () => {
    const blocked: string[] = [];
    for (const o of offices) {
      // el vano esta centrado en el muro que da al pasillo
      const halfZ = (o.bounds.maxZ - (o.bounds.minZ + 1)) / 2;
      const doorDz = (isFlipped(o.bounds) ? -1 : 1) * halfZ;
      for (const p of props(o)) {
        if (p.dy > 1.4) continue; // lo colgado alto no estorba el paso
        const [hx, hz] = footprint(p.type, p.scale, p.rotY ?? 0);
        if (Math.abs(p.dz - doorDz) < hz + 0.8 && Math.abs(p.dx) < hx + 1.2) {
          blocked.push(`${o.id}:${p.type}`);
        }
      }
    }
    expect(blocked).toEqual([]);
  });

  it('toda sala tiene un mueble al centro (la zona de la tecla E)', () => {
    for (const o of offices) {
      const center = props(o).filter(
        (p) => Math.abs(p.dx) < 0.01 && Math.abs(p.dz) < 0.01 && p.dy < 1,
      );
      // la alfombra no cuenta: tiene que haber una mesa donde pararse
      expect(
        center.find((p) => !p.type.startsWith('rug')),
        `${o.id} sin mesa central`,
      ).toBeDefined();
      expect(meetingSpot(o.bounds)).toEqual({
        x: (o.bounds.minX + 1 + o.bounds.maxX) / 2,
        z: (o.bounds.minZ + 1 + o.bounds.maxZ) / 2,
      });
    }
  });

  it('cada sala tiene su propio tema', () => {
    const themes = offices.map((o) => themeFor(o.id));
    expect(new Set(themes).size).toBe(offices.length);
  });
});
