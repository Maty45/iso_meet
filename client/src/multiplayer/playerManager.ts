import type { Player } from '@iso-meet/shared';
import * as THREE from 'three';
import { PlayerVisual } from '../player/PlayerVisual.js';

interface BufferedState {
  position: THREE.Vector3;
  rotation: number;
  t: number;
  anim: Player['animationState'];
}

export class RemotePlayer {
  id: string;
  visual: PlayerVisual;
  get group() { return this.visual.group; }
  buffer: BufferedState[] = [];
  anim: Player['animationState'] = 'idle';

  constructor(p: Player) {
    this.id = p.id;
    this.visual = new PlayerVisual({
      name: p.name,
      color: p.color,
      position: new THREE.Vector3(p.position.x, p.position.y, p.position.z),
      rotationY: p.rotation,
    });
    if (p.inMeeting) this.setMeeting(true);
  }

  setMeeting(v: boolean) {
    this.visual.group.scale.set(v ? 1.08 : 1, v ? 1.08 : 1, v ? 1.08 : 1);
  }

  push(state: {
    position: { x: number; y: number; z: number };
    rotation: number;
    animationState: Player['animationState'];
  }) {
    this.buffer.push({
      position: new THREE.Vector3(
        state.position.x,
        state.position.y,
        state.position.z,
      ),
      rotation: state.rotation,
      t: Date.now(),
      anim: state.animationState,
    });
    if (this.buffer.length > 20) this.buffer.shift();
  }

  update(now: number) {
    const delay = 100;
    const target = now - delay;
    if (this.buffer.length < 2) return;
    let a = this.buffer[0],
      b = this.buffer[1];
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].t <= target && this.buffer[i + 1].t >= target) {
        a = this.buffer[i];
        b = this.buffer[i + 1];
        break;
      }
      if (this.buffer[i + 1].t < target) {
        a = this.buffer[i];
        b = this.buffer[i + 1];
      }
    }
    const span = b.t - a.t || 1;
    const t = THREE.MathUtils.clamp((target - a.t) / span, 0, 1);
    const pos = new THREE.Vector3().lerpVectors(a.position, b.position, t);
    let d = b.rotation - a.rotation;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const rot = a.rotation + d * t;
    const moving = a.anim === 'walk' || b.anim === 'walk';
    this.visual.setPosition(pos);
    this.visual.setRotationY(rot);
    // bob via visual
    this.visual.update(0.016, { moving, onGround: true });
    // corrige y con bob
    if (moving) this.visual.group.position.y = pos.y + Math.sin(now * 0.01) * 0.04;
  }

  dispose(scene: THREE.Scene) {
    this.visual.dispose(scene);
  }
}

export class PlayerManager {
  scene: THREE.Scene;
  remotes = new Map<string, RemotePlayer>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  add(p: Player) {
    if (this.remotes.has(p.id)) return;
    const rp = new RemotePlayer(p);
    this.remotes.set(p.id, rp);
    this.scene.add(rp.group);
  }

  remove(id: string) {
    const rp = this.remotes.get(id);
    if (rp) {
      rp.dispose(this.scene);
      this.remotes.delete(id);
    }
  }

  moved(data: {
    playerId: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    animationState: Player['animationState'];
  }) {
    const rp = this.remotes.get(data.playerId);
    if (rp) rp.push(data);
  }

  update(now: number) {
    for (const rp of this.remotes.values()) rp.update(now);
  }

  setMeeting(playerId: string, inMeeting: boolean) {
    const rp = this.remotes.get(playerId);
    if (rp) rp.setMeeting(inMeeting);
  }

  countInOffice(
    officeId: string,
    getOfficeId: (id: string) => string | null,
  ): number {
    let n = 0;
    for (const [id] of this.remotes) if (getOfficeId(id) === officeId) n++;
    return n;
  }
}
