import { PLAYER, WORLD_SIZE } from '@iso-meet/shared';
import * as THREE from 'three';
import type { World } from '../world/world.js';

const EPS = 0.001;
const SUBSTEP = 1 / 120;

export interface MoveInput {
  x: number;
  z: number;
  sprint?: boolean;
}

export class Physics {
  pos = new THREE.Vector3(20, 1, 20);
  vel = new THREE.Vector3();
  onGround = false;
  sprinting = false;
  /** Tiempo restante para saltar después de dejar el piso (coyote time). */
  private coyote = 0;
  /** Tiempo restante de un salto pedido en el aire (jump buffer). */
  private buffered = 0;
  private jumpHeld = false;

  update(dt: number, move: MoveInput, jump: boolean, world: World) {
    dt = Math.min(dt, 0.1);
    // Espacio se consume por flanco: mantenerlo apretado no encadena saltos.
    if (jump && !this.jumpHeld) this.buffered = PLAYER.jumpBuffer;
    this.jumpHeld = jump;

    this.sprinting = !!move.sprint && Math.hypot(move.x, move.z) > 0.01;
    const speed = this.sprinting ? PLAYER.speedSprint : PLAYER.speedWalk;
    const accel = this.onGround ? 18 : 6;
    const targetX = move.x * speed;
    const targetZ = move.z * speed;

    let remaining = dt;
    while (remaining > 1e-6) {
      const h = Math.min(remaining, SUBSTEP);
      // accel horizontal
      const k = Math.min(1, accel * h);
      this.vel.x += (targetX - this.vel.x) * k;
      this.vel.z += (targetZ - this.vel.z) * k;

      // gravedad
      this.vel.y -= PLAYER.gravity * h;
      if (this.vel.y < -40) this.vel.y = -40;

      // salto: sale si hay uno pedido hace poco y estás en piso (o recién saliste)
      if (this.buffered > 0 && (this.onGround || this.coyote > 0)) {
        this.vel.y = PLAYER.jumpV;
        this.onGround = false;
        this.coyote = 0;
        this.buffered = 0;
      }

      this.onGround = false;
      this.moveAxis(1, this.vel.y * h, world);
      // sticky ground
      if (!this.onGround && this.vel.y <= 0 && this.hasSupport(world))
        this.onGround = true;

      this.moveAxis(0, this.vel.x * h, world);
      this.moveAxis(2, this.vel.z * h, world);

      this.coyote = this.onGround ? PLAYER.coyoteTime : Math.max(0, this.coyote - h);
      this.buffered = Math.max(0, this.buffered - h);

      remaining -= h;
    }
  }

  private moveAxis(axis: number, amount: number, world: World) {
    if (amount === 0) return;
    if (axis === 0) this.pos.x += amount;
    else if (axis === 1) this.pos.y += amount;
    else this.pos.z += amount;

    const minX = this.pos.x - PLAYER.half;
    const maxX = this.pos.x + PLAYER.half;
    const minY = this.pos.y;
    const maxY = this.pos.y + PLAYER.height;
    const minZ = this.pos.z - PLAYER.half;
    const maxZ = this.pos.z + PLAYER.half;

    const x0 = Math.floor(minX),
      x1 = Math.floor(maxX - 1e-9);
    const y0 = Math.max(0, Math.floor(minY)),
      y1 = Math.floor(maxY - 1e-9);
    const z0 = Math.floor(minZ),
      z1 = Math.floor(maxZ - 1e-9);

    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (!world.isSolidAt(x, y, z)) continue;
          if (axis === 1) {
            if (amount < 0) {
              this.pos.y = Math.max(this.pos.y, y + 1 + EPS);
              this.vel.y = 0;
              this.onGround = true;
            } else {
              this.pos.y = Math.min(this.pos.y, y - PLAYER.height - EPS);
              this.vel.y = 0;
            }
          } else if (axis === 0) {
            if (amount > 0)
              this.pos.x = Math.min(this.pos.x, x - PLAYER.half - EPS);
            else this.pos.x = Math.max(this.pos.x, x + 1 + PLAYER.half + EPS);
            this.vel.x = 0;
          } else {
            if (amount > 0)
              this.pos.z = Math.min(this.pos.z, z - PLAYER.half - EPS);
            else this.pos.z = Math.max(this.pos.z, z + 1 + PLAYER.half + EPS);
            this.vel.z = 0;
          }
        }
      }
    }

    // bounds mundo
    this.pos.x = THREE.MathUtils.clamp(
      this.pos.x,
      PLAYER.half,
      WORLD_SIZE.width - PLAYER.half,
    );
    this.pos.z = THREE.MathUtils.clamp(
      this.pos.z,
      PLAYER.half,
      WORLD_SIZE.depth - PLAYER.half,
    );
    if (this.pos.y < 0) {
      this.pos.y = 1;
      this.vel.y = 0;
    }
  }

  private hasSupport(world: World): boolean {
    const y = Math.floor(this.pos.y - 0.06);
    if (y < 0) return false;
    const x0 = Math.floor(this.pos.x - PLAYER.half),
      x1 = Math.floor(this.pos.x + PLAYER.half - 1e-9);
    const z0 = Math.floor(this.pos.z - PLAYER.half),
      z1 = Math.floor(this.pos.z + PLAYER.half - 1e-9);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) if (world.isSolidAt(x, y, z)) return true;
    return false;
  }
}
