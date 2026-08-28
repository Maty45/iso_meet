import type { WorldConfig } from '@iso-meet/shared';
import { buildWorldBlocks } from '@iso-meet/shared';
import type * as THREE from 'three';
import { BLOCK_COLORS } from '../world/blocks.js';

interface Room {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const REFRESH_MS = 100; // 10Hz: el minimapa no necesita 60fps

export class Minimap {
  private ctx: CanvasRenderingContext2D | null;
  private rooms: Room[] = [];
  private size = { width: 1, depth: 1 };
  private last = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  setWorld(cfg: WorldConfig) {
    this.size = { width: cfg.size.width, depth: cfg.size.depth };
    const { wallTypeOf } = buildWorldBlocks(cfg.offices ?? []);
    this.rooms = (cfg.offices ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      x: o.bounds.minX,
      z: o.bounds.minZ,
      w: o.bounds.maxX - o.bounds.minX,
      d: o.bounds.maxZ - o.bounds.minZ,
      color: hex(BLOCK_COLORS[wallTypeOf[o.id] ?? 'wood']),
    }));
    this.last = 0;
  }

  draw(
    player: THREE.Vector3,
    remotes: Map<string, { group: THREE.Object3D }>,
    currentOfficeId: string | null,
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = performance.now();
    if (now - this.last < REFRESH_MS) return;
    this.last = now;

    const { width, height } = this.canvas;
    const s = Math.min(width / this.size.width, height / this.size.depth);
    const px = (x: number) => x * s;
    const pz = (z: number) => z * s;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(24,30,44,0.72)';
    ctx.fillRect(0, 0, width, height);

    for (const r of this.rooms) {
      const active = r.id === currentOfficeId;
      ctx.fillStyle = r.color;
      ctx.globalAlpha = active ? 0.85 : 0.45;
      ctx.fillRect(px(r.x), pz(r.z), px(r.w), pz(r.d));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeRect(px(r.x), pz(r.z), px(r.w), pz(r.d));
    }

    ctx.fillStyle = '#ffd166';
    for (const rp of remotes.values()) {
      const p = rp.group.position;
      ctx.beginPath();
      ctx.arc(px(p.x), pz(p.z), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#4a90e2';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px(player.x), pz(player.z), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
