import type { Vec3 } from './vec3.js';

export type AnimationState = 'idle' | 'walk' | 'sprint' | 'jump';

export interface Player {
  id: string;
  name: string;
  color: number;
  /** Id del modelo del personaje (ver SKINS). Lo sortea el server al entrar. */
  skin: string;
  position: Vec3;
  rotation: number;
  animationState: AnimationState;
  currentOfficeId: string | null;
  inMeeting: boolean;
}

export interface PlayerState {
  position: Vec3;
  rotation: number;
  animationState: AnimationState;
  timestamp: number;
}
