import { DEFAULT_SKIN, SKINS } from '@iso-meet/shared';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assetsCatalog } from './catalog.js';

// Si falta un modelo, AssetManager cae al placeholder y el mueble se ve como caja de color.
describe('assetsCatalog', () => {
  it('todas las urls existen en public/', () => {
    const missing = Object.entries(assetsCatalog)
      .filter(([, def]) => !existsSync(join(process.cwd(), 'public', def.url)))
      .map(([key, def]) => `${key} -> ${def.url}`);
    expect(missing).toEqual([]);
  });
});

describe('skins', () => {
  it('todas las del server tienen modelo en el catalogo', () => {
    // El server sortea una skin de SKINS; si alguna no estuviera, ese jugador se veria
    // como una caja gris y solo lo notariamos entrando muchas veces.
    const faltan = SKINS.filter((s) => !assetsCatalog[s]);
    expect(faltan).toEqual([]);
    expect(SKINS).toContain(DEFAULT_SKIN);
  });
});
