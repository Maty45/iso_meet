import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDefaultWorldConfig } from './world.js';

// El modo offline lleva su propia copia de las salas (no puede leer config/offices.json,
// que vive fuera del rootDir del cliente). Si esa copia se desincroniza, jugar sin server
// muestra un mapa distinto al real — esto lo detecta.
describe('mundo offline', () => {
  it('tiene las mismas salas que config/offices.json', () => {
    const real = JSON.parse(
      readFileSync(resolve(process.cwd(), '../config/offices.json'), 'utf-8'),
    ).offices;
    const offline = createDefaultWorldConfig().offices;
    const shape = (o: { id: string; name: string; bounds: unknown }) => ({
      id: o.id,
      name: o.name,
      bounds: o.bounds,
    });
    expect(offline.map(shape)).toEqual(real.map(shape));
  });
});
