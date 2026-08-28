import { CAMERA, WORLD_SIZE } from '@iso-meet/shared';
import * as THREE from 'three';

export class IsoCamera {
  camera: THREE.OrthographicCamera;
  target = new THREE.Vector3();
  offset = new THREE.Vector3(40, 40, 40);
  zoom = 1;
  private frustumSize = CAMERA.frustumSize;

  constructor(aspect: number) {
    const f = this.frustumSize;
    this.camera = new THREE.OrthographicCamera(
      (-f * aspect) / 2,
      (f * aspect) / 2,
      f / 2,
      -f / 2,
      0.1,
      500,
    );
    // Isométrica: 45° yaw + 35.264° pitch
    this.camera.position.set(40, 40, 40);
    this.camera.lookAt(0, 0, 0);
  }

  resize(aspect: number) {
    const f = this.frustumSize * this.zoom;
    this.camera.left = (-f * aspect) / 2;
    this.camera.right = (f * aspect) / 2;
    this.camera.top = f / 2;
    this.camera.bottom = -f / 2;
    this.camera.updateProjectionMatrix();
  }

  update(playerPos: THREE.Vector3, dt: number) {
    // lerp target hacia jugador
    this.target.lerp(playerPos, Math.min(1, dt * 6));
    const ideal = this.target.clone().add(this.offset);

    // clamp a bounds del mapa (evita mostrar vacío)
    const half = (this.frustumSize * this.zoom) / 2;
    const pad = half * 0.4;
    ideal.x = THREE.MathUtils.clamp(ideal.x, pad, WORLD_SIZE.width - pad);
    ideal.z = THREE.MathUtils.clamp(ideal.z, pad, WORLD_SIZE.depth - pad);

    this.camera.position.lerp(ideal, Math.min(1, dt * 8));
    this.camera.lookAt(this.target);
  }

  wheel(deltaY: number) {
    this.zoom = THREE.MathUtils.clamp(
      this.zoom + deltaY * 0.001,
      CAMERA.minZoom,
      CAMERA.maxZoom,
    );
    const aspect = window.innerWidth / window.innerHeight;
    this.resize(aspect);
  }
}
