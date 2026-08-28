import { WALL_TYPES } from '@iso-meet/shared';
import { describe, expect, it } from 'vitest';
import { BLOCK_COLORS, BLOCK_SOLID, isSolid } from './blocks.js';

describe('colores de bloque', () => {
  it('cada sala tiene un color de pared distinto', () => {
    // Regresion: 'wood' y 'shelf' compartian 0x8d6e63, asi que dos salas se veian igual.
    const colors = WALL_TYPES.map((t) => BLOCK_COLORS[t]);
    expect(colors.filter((c) => c === undefined)).toEqual([]);
    expect(new Set(colors).size).toBe(WALL_TYPES.length);
  });

  it('el muro que mira a la camara es translucido pero solido', () => {
    // Si dejara de ser solido se podria entrar a las salas atravesandolo.
    expect(isSolid('wall_front')).toBe(true);
    expect(BLOCK_SOLID.glass).toBe(false);
  });
});
