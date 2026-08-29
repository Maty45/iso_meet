import * as THREE from 'three';

/**
 * Mezclador de animaciones del personaje: una acción por estado, con fundido entre ellas.
 *
 * Vive separado de PlayerVisual porque PlayerVisual necesita `document` (el nametag es un
 * canvas) y eso dejaba sin poder probar justo la parte que falla en silencio.
 */
export class Animator {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private currentState: string;

  /**
   * @param clipFor estado -> nombre del clip dentro del GLB
   * @param initial estado con el que arranca
   */
  constructor(
    root: THREE.Object3D,
    clips: THREE.AnimationClip[],
    clipFor: Record<string, string>,
    initial: string,
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    this.currentState = initial;
    for (const [state, clipName] of Object.entries(clipFor)) {
      const clip = THREE.AnimationClip.findByName(clips, clipName);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      action.play();
      // Las inactivas arrancan en 0 para no sumar pose; play() las deja listas para el fundido.
      action.setEffectiveWeight(state === initial ? 1 : 0);
      this.actions.set(state, action);
    }
  }

  get state(): string {
    return this.currentState;
  }

  get ready(): boolean {
    return this.actions.size > 0;
  }

  /** Peso efectivo de un estado. Para diagnóstico y tests. */
  weightOf(state: string): number {
    return this.actions.get(state)?.getEffectiveWeight() ?? 0;
  }

  /** Velocidad de reproducción del estado. Para diagnóstico y tests. */
  timeScaleOf(state: string): number {
    return this.actions.get(state)?.getEffectiveTimeScale() ?? 0;
  }

  /** Cruza al estado dado. No-op si ya está en él o si no hay clip para ese estado. */
  play(state: string, fade = 0.15) {
    if (state === this.currentState) return;
    const next = this.actions.get(state);
    if (!next) return;
    const prev = this.actions.get(this.currentState);
    this.currentState = state;

    next.enabled = true;
    next.setEffectiveTimeScale(1);
    // CLAVE: la acción que entra necesita peso 1 ANTES del fundido. three multiplica el
    // interpolante del fade por action.weight (AnimationAction._updateWeight hace
    // `weight *= interpolantValue`), así que si entra con peso 0 se queda en 0 para siempre
    // y el personaje nunca sale de 'idle'. Es lo que hacía que se deslizara.
    next.setEffectiveWeight(1);
    next.time = 0;
    if (prev && prev !== next) prev.crossFadeTo(next, fade, false);
  }

  /**
   * Avanza el mixer. `speed` es la velocidad horizontal real en unidades/segundo: el ciclo de
   * pasos se acelera con ella para que los pies no patinen.
   */
  update(dt: number, speed = 0) {
    const action = this.actions.get(this.currentState);
    if (action) {
      const scale = speed > 0.1 ? clamp(speed / STRIDE_SPEED, 0.6, 2.2) : 1;
      action.setEffectiveTimeScale(scale);
    }
    this.mixer.update(dt);
  }

  stop() {
    this.mixer.stopAllAction();
  }
}

/**
 * Velocidad a la que el ciclo de caminata del modelo se ve natural a timeScale 1.
 * El clip `walk` dura 0.667 s y avanza dos pasos, así que a ~2.2 u/s la zancada da ~0.73 u.
 * ponytail: es una calibración a ojo — si los pies patinan o pedalean, este es el número a mover.
 */
const STRIDE_SPEED = 2.2;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
