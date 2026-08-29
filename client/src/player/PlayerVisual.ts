import type { AnimationState } from '@iso-meet/shared';
import { DEFAULT_SKIN } from '@iso-meet/shared';
import * as THREE from 'three';
import { assetManager } from '../assets/AssetManager.js';
import { Animator } from './Animator.js';
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
  /** Id del personaje (ver SKINS). La sortea el server; si falta, cae al de siempre. */
  skin?: string;
}

// Separa STATE (posición/rotación de red) de VISUAL (modelo 3D + nametag)
// Permite cambiar el modelo sin tocar networking.
export class PlayerVisual {
  group = new THREE.Group();
  private modelGroup: THREE.Group | null = null;
  private nametag: THREE.Sprite | null = null;
  private animator: Animator | null = null;
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
    this.loadModel(opts.skin ?? DEFAULT_SKIN);
  }

  private async loadModel(skin: string) {
    try {
      const glb = await assetManager.load(skin);
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
        this.animator = new Animator(glb, clips, CLIP_FOR, this.current);
      }
    } catch (e) {
      console.warn(`[PlayerVisual] fallo cargando la skin ${skin}, queda el placeholder`, e);
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
    this.current = state;
    this.animator?.play(state, FADE);
  }

  /** @param opts.speed velocidad horizontal real, para que el ciclo de pasos no patine */
  update(delta: number, opts: { moving: boolean; onGround: boolean; speed?: number }) {
    if (this.animator) {
      this.animator.update(delta, opts.speed ?? 0);
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
    this.animator?.stop();
  }

  // Para debug: fuerza color
  setColor(color: number) {
    this.baseColor = color;
  }
}

