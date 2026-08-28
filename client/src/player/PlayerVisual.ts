import type { AnimationState } from '@iso-meet/shared';
import * as THREE from 'three';
import { assetManager } from '../assets/AssetManager.js';
import { createAvatar, createNametag } from './avatar.js';

// Nombres reales de los clips dentro de player.glb (Kenney Mini Characters).
const CLIP_FOR: Record<AnimationState, string> = {
  idle: 'idle',
  walk: 'walk',
  sprint: 'sprint',
  jump: 'static',
};
const FADE = 0.15;

export interface PlayerVisualOptions {
  name: string;
  color: number;
  position: THREE.Vector3;
  rotationY?: number;
}

// Separa STATE (posición/rotación de red) de VISUAL (modelo 3D + nametag)
// Permite cambiar el modelo sin tocar networking.
export class PlayerVisual {
  group = new THREE.Group();
  private modelGroup: THREE.Group | null = null;
  private nametag: THREE.Sprite | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: AnimationState = 'idle';
  private baseColor: number;

  constructor(private opts: PlayerVisualOptions) {
    this.baseColor = opts.color;
    this.group.position.copy(opts.position);
    if (opts.rotationY !== undefined) this.group.rotation.y = opts.rotationY;

    // Placeholder caja inmediato (no bloquea)
    const placeholder = createAvatar(opts.color);
    placeholder.userData.isPlaceholder = true;
    this.modelGroup = placeholder;
    this.group.add(placeholder);

    this.nametag = createNametag(opts.name);
    this.group.add(this.nametag);

    // Carga async del GLB low-poly (Kenney Blocky Characters CC0)
    // Si no existe, mantiene placeholder
    this.loadModel(opts.name, opts.color);
  }

  private async loadModel(name: string, color: number) {
    try {
      const glb = await assetManager.load('player');
      if (glb.userData.isPlaceholder) {
        // No hay GLB — mantiene cajas
        return;
      }

      // Clon ya viene escalado/offset por AssetManager (scale 1.0)
      // Ajustes específicos para Blocky Characters: escala y altura
      // Kenney GLB mide ~1.8u de alto, centrado en origen, con pies en y≈-0.9
      // Lo normalizamos para que pies apoyen en y=0 del group
      glb.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          // No teñir el personaje — mantiene colores originales low-poly de Kenney
          // Solo asegura que el material sea clonado si se necesita
          if (Array.isArray(mesh.material)) {
            mesh.material = (mesh.material as THREE.Material[]).map((m) => m.clone());
          } else if (mesh.material) {
            mesh.material = (mesh.material as THREE.Material).clone();
          }
        }
      });

      // Kenney Blocky GLB origen en pies (y=0), no necesita offset. Si viene centrado, ajustar.
      // Test: blocky tiene pies en y≈0, así que 0 es correcto. Si flota, ajustar a 0.1
      glb.position.set(0, 0, 0);
      // Blocky mira hacia -Z por defecto en nuestro mundo (WASD norte = -Z), no rotar
      glb.rotation.y = 0;

      // Reemplaza placeholder
      if (this.modelGroup && this.modelGroup.userData.isPlaceholder) {
        this.group.remove(this.modelGroup);
      }
      this.modelGroup = glb;
      this.group.add(glb);

      // player.glb trae 27 clips (idle/walk/sprint/...). Se arma una acción por cada
      // estado que usamos y se cruzan con crossFade; sin esto el personaje se desliza.
      const clips: THREE.AnimationClip[] = glb.userData.animations ?? [];
      if (clips.length > 0) {
        this.mixer = new THREE.AnimationMixer(glb);
        for (const state of Object.keys(CLIP_FOR) as AnimationState[]) {
          const clip = THREE.AnimationClip.findByName(clips, CLIP_FOR[state]);
          if (!clip) continue;
          const action = this.mixer.clipAction(clip);
          action.play();
          action.setEffectiveWeight(state === this.current ? 1 : 0);
          this.actions.set(state, action);
        }
      }
    } catch (e) {
      console.warn('[PlayerVisual] fallo cargando player.glb, manteniendo placeholder cajas', e);
    }
  }

  setPosition(pos: THREE.Vector3) {
    this.group.position.copy(pos);
    // nametag sigue en y=2.4 relativo al group
    if (this.nametag) this.nametag.position.y = 2.4;
  }

  setRotationY(y: number) {
    this.group.rotation.y = y;
  }

  setName(name: string) {
    if (this.nametag) {
      this.group.remove(this.nametag);
      this.nametag.material.dispose();
      (this.nametag.material as THREE.SpriteMaterial).map?.dispose();
    }
    this.nametag = createNametag(name);
    this.group.add(this.nametag);
  }

  /** Cruza a la animación del estado dado. No-op si ya está en ese estado. */
  setAnimation(state: AnimationState) {
    if (state === this.current) return;
    const next = this.actions.get(state);
    const prev = this.actions.get(this.current);
    this.current = state;
    if (!next) return;
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    if (prev && prev !== next) next.crossFadeFrom(prev, FADE, false);
    else next.setEffectiveWeight(1);
  }

  update(delta: number, opts: { moving: boolean; onGround: boolean }) {
    if (this.mixer) {
      this.mixer.update(delta);
      return;
    }
    // Sin clips (fallback de cajas): bob manual para que no se deslice inerte.
    if (this.modelGroup) {
      const baseY = 0;
      if (opts.moving && opts.onGround) {
        this.modelGroup.position.y = baseY + Math.sin(performance.now() * 0.012) * 0.05;
      } else {
        this.modelGroup.position.y = THREE.MathUtils.lerp(this.modelGroup.position.y, baseY, delta * 8);
      }
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    if (this.mixer) this.mixer.stopAllAction();
  }

  // Para debug: fuerza color
  setColor(color: number) {
    this.baseColor = color;
  }
}

