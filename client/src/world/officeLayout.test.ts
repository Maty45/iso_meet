import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Office } from '@iso-meet/shared';
import { describe, expect, it } from 'vitest';
import { assetsCatalog } from '../assets/catalog.js';
import { isFlipped, meetingSpot, officeProps, themeFor } from './officeLayout.js';

const offices: Office[] = JSON.parse(
  readFileSync(resolve(process.cwd(), '../config/offices.json'), 'utf-8'),
).offices;

// El interior útil: las paredes ocupan su propia celda (minX..minX+1 y maxX..maxX+1).
const interior = (b: Office['bounds']) => ({
  minX: b.minX + 1,
  maxX: b.maxX,
  minZ: b.minZ + 1,
  maxZ: b.maxZ,
});
// Margen contra la pared: alcanza para que no se incruste el mueble más ancho.
// Lo colgado (pizarrón, cuadro, lámpara) va pegado a la pared a propósito.
const MARGIN = 0.55;
const MARGIN_HUNG = 0.15;
const isHung = (p: { dy: number }) => p.dy >= 0.85;

const props = (o: Office) => officeProps(themeFor(o.id), isFlipped(o.bounds));

describe('muebles de cada sala', () => {
  it('todos los props existen en el catálogo', () => {
    const types = new Set(offices.flatMap((o) => props(o).map((p) => p.type)));
    const missing = [...types].filter((t) => !assetsCatalog[t]);
    expect(missing).toEqual([]);
  });

  it('ningún mueble queda metido en la pared', () => {
    const outside: string[] = [];
    for (const o of offices) {
      const c = meetingSpot(o.bounds);
      const w = interior(o.bounds);
      for (const p of props(o)) {
        const x = c.x + p.dx;
        const z = c.z + p.dz;
        const m = isHung(p) ? MARGIN_HUNG : MARGIN;
        const fits =
          x > w.minX + m && x < w.maxX - m && z > w.minZ + m && z < w.maxZ - m;
        if (!fits) outside.push(`${o.id}:${p.type} (${x},${z})`);
      }
    }
    expect(outside).toEqual([]);
  });

  it('no tapa el vano de la puerta', () => {
    // La puerta ocupa 2 bloques centrados en el muro que da al pasillo.
    const blocked: string[] = [];
    for (const o of offices) {
      const c = meetingSpot(o.bounds);
      const doorZ = isFlipped(o.bounds) ? o.bounds.minZ : o.bounds.maxZ;
      for (const p of props(o)) {
        const x = c.x + p.dx;
        const z = c.z + p.dz;
        if (Math.abs(z - doorZ) < 1.5 && Math.abs(x - c.x) < 1.5) {
          blocked.push(`${o.id}:${p.type}`);
        }
      }
    }
    expect(blocked).toEqual([]);
  });

  it('la mesa de reuniones (zona de la tecla E) es el centro de la sala', () => {
    for (const o of offices) {
      const c = meetingSpot(o.bounds);
      const table = props(o).find(
        (p) => p.type === 'table' || p.type === 'meeting_table',
      );
      expect(table, `${o.id} sin mesa central`).toBeDefined();
      expect(table?.dx).toBeCloseTo(0);
      expect(table?.dz).toBeCloseTo(0);
      const w = interior(o.bounds);
      expect(c).toEqual({ x: (w.minX + w.maxX) / 2, z: (w.minZ + w.maxZ) / 2 });
    }
  });
});
