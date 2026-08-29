import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { Animator } from './Animator.js';

// GLTFLoader toca `self` al preparar el decodificador de texturas; en node no existe.
// La textura no carga (avisa por consola) y no importa: los clips no dependen del material.
(globalThis as { self?: unknown }).self ??= globalThis;

const CLIP_FOR = { idle: 'idle', walk: 'walk', sprint: 'sprint', jump: 'static' };

let clips: THREE.AnimationClip[];
let scene: THREE.Group;

beforeAll(async () => {
  const buf = readFileSync(join(process.cwd(), 'public/models/characters/player.glb'));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>(
    (res, rej) => new GLTFLoader().parse(ab, '', res as never, rej),
  );
  clips = gltf.animations;
  scene = gltf.scene;
});

const makeAnimator = () => new Animator(scene.clone(true), clips, CLIP_FOR, 'idle');

describe('Animator', () => {
  it('el modelo trae los clips que usamos', () => {
    const names = clips.map((c) => c.name);
    for (const clip of Object.values(CLIP_FOR)) expect(names).toContain(clip);
  });

  it('al pasar a walk el personaje mueve las piernas', () => {
    // Regresion: con la accion entrante en peso 0, three multiplica el fundido por 0 y la
    // animacion nunca arranca -> el personaje se desliza en pose de idle.
    const root = scene.clone(true);
    const anim = new Animator(root, clips, CLIP_FOR, 'idle');
    const leg = root.getObjectByName('leg-left');
    expect(leg, 'el rig tiene que tener leg-left').toBeDefined();
    const before = leg!.rotation.x;

    anim.play('walk');
    for (let i = 0; i < 20; i++) anim.update(0.033, 4.3);

    expect(anim.state).toBe('walk');
    expect(anim.weightOf('walk')).toBeCloseTo(1, 2);
    expect(Math.abs(leg!.rotation.x - before)).toBeGreaterThan(0.05);
  });

  it('deja de pesar el estado del que sale', () => {
    const anim = makeAnimator();
    expect(anim.weightOf('idle')).toBeCloseTo(1, 2);
    anim.play('walk');
    for (let i = 0; i < 20; i++) anim.update(0.033, 4.3);
    expect(anim.weightOf('idle')).toBeLessThan(0.05);
  });

  it('acelera el ciclo de pasos con la velocidad', () => {
    const slow = makeAnimator();
    const fast = makeAnimator();
    slow.play('walk');
    fast.play('walk');
    slow.update(0.033, 1.5);
    fast.update(0.033, 6.6);
    // sin esto los pies patinan: el clip corre siempre igual mientras el cuerpo se traslada
    expect(fast.timeScaleOf('walk')).toBeGreaterThan(slow.timeScaleOf('walk') * 1.5);
  });

  it('no deforma el ciclo cuando esta quieto', () => {
    const anim = makeAnimator();
    anim.update(0.033, 0);
    expect(anim.timeScaleOf('idle')).toBe(1);
  });

  it('ignora estados sin clip y no rompe', () => {
    const anim = new Animator(scene.clone(true), clips, { idle: 'idle' }, 'idle');
    anim.play('walk');
    expect(anim.state).toBe('idle');
    expect(() => anim.update(0.033, 4)).not.toThrow();
  });
});
