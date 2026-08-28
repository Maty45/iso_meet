import { PLAYER } from '@iso-meet/shared';
import { describe, expect, it } from 'vitest';
import type { World } from '../world/world.js';
import { Physics } from './physics.js';

// Piso sólido en y=0 (su cara superior queda en y=1, que es donde apoya el jugador).
const ground = { isSolidAt: (_x: number, y: number) => y === 0 } as unknown as World;
const air = { isSolidAt: () => false } as unknown as World;

const still = { x: 0, z: 0 };
/** Deja al jugador parado y estable sobre el piso. */
function grounded(): Physics {
  const p = new Physics();
  p.update(0.05, still, false, ground);
  expect(p.onGround).toBe(true);
  return p;
}
const jumped = (p: Physics) => p.vel.y > PLAYER.jumpV * 0.9;

describe('coyote time', () => {
  it('deja saltar apenas dejaste el piso', () => {
    const p = grounded();
    p.update(0.05, still, false, air); // se acabó el piso, quedan ~0.07s de coyote
    expect(p.onGround).toBe(false);
    p.update(0.01, still, true, air);
    expect(jumped(p)).toBe(true);
  });

  it('no deja saltar pasada la ventana', () => {
    const p = grounded();
    p.update(0.05, still, false, air);
    p.update(0.1, still, false, air); // 0.15s en el aire > coyoteTime
    p.update(0.01, still, true, air);
    expect(jumped(p)).toBe(false);
    expect(p.vel.y).toBeLessThan(0); // sigue cayendo
  });
});

describe('jump buffer', () => {
  /** Avanza de a 20ms hasta que se cumple la condición (o se agota la paciencia). */
  function step(p: Physics, world: World, jump: boolean, until: (p: Physics) => boolean) {
    for (let i = 0; i < 200 && !until(p); i++) p.update(0.02, still, jump, world);
  }

  it('un salto pedido justo antes de aterrizar sale al tocar el piso', () => {
    const p = new Physics();
    p.pos.y = 3;
    // cae hasta estar a punto de tocar el piso
    step(p, ground, false, (x) => x.pos.y < 1.5);
    expect(p.onGround, 'debe pedirlo en el aire').toBe(false);
    p.update(0.02, still, true, ground); // pide el salto sin estar en piso
    // sin buffer el pedido se perdería: a partir de acá nadie vuelve a apretar
    step(p, ground, false, (x) => jumped(x));
    expect(jumped(p)).toBe(true);
  });

  it('el pedido caduca si tarda demasiado en aterrizar', () => {
    const p = new Physics();
    p.pos.y = 6;
    p.update(0.02, still, true, air); // pide el salto muy arriba
    for (let i = 0; i < 10; i++) p.update(0.02, still, false, air); // 0.2s > jumpBuffer
    step(p, ground, false, (x) => x.onGround);
    expect(p.onGround).toBe(true);
    expect(jumped(p)).toBe(false);
  });

  it('mantener espacio no encadena saltos', () => {
    const p = grounded();
    p.update(0.02, still, true, ground); // primer salto
    expect(jumped(p)).toBe(true);
    // sigue apretado todo el vuelo y el aterrizaje
    for (let i = 0; i < 40; i++) p.update(0.02, still, true, ground);
    expect(p.onGround).toBe(true);
    expect(jumped(p)).toBe(false);
  });
});

describe('sprint', () => {
  it('corre más rápido que caminando', () => {
    const walk = grounded();
    const run = grounded();
    for (let i = 0; i < 30; i++) {
      walk.update(0.02, { x: 1, z: 0 }, false, ground);
      run.update(0.02, { x: 1, z: 0, sprint: true }, false, ground);
    }
    expect(run.sprinting).toBe(true);
    expect(walk.sprinting).toBe(false);
    expect(run.vel.x).toBeGreaterThan(walk.vel.x * 1.2);
  });

  it('parado no cuenta como correr aunque tengas Shift apretado', () => {
    const p = grounded();
    p.update(0.02, { x: 0, z: 0, sprint: true }, false, ground);
    expect(p.sprinting).toBe(false);
  });
});
