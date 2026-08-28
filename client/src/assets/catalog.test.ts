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
