import type { BlockData, BlockType, WorldConfig } from '@iso-meet/shared';
import { CORRIDOR_Z, WORLD_SIZE, buildWorldBlocks } from '@iso-meet/shared';
import * as THREE from 'three';
import { BLOCK_COLORS } from './blocks.js';
import { isSolid } from './blocks.js';
import { createWorldObjectSync } from '../entities/WorldObject.js';
import { assetsCatalog } from '../assets/catalog.js';
import { interiorHalf, isFlipped, meetingSpot, officeProps, themeFor } from './officeLayout.js';
import { createNametag } from '../player/avatar.js';

/** Cota superior del bloque de piso: todo mueble se apoya acá. */
const FLOOR_Y = 1;

export class World {
  config: WorldConfig;
  scene: THREE.Scene;
  blocks = new Map<string, BlockType>(); // "x,y,z" -> type
  group = new THREE.Group();
  /** officeId -> mesa de reuniones (zona donde se abre el Meet con E) */
  meetingSpots = new Map<string, THREE.Vector3>();
  private blockMeshes = new Map<string, THREE.Mesh>();
  private instancedMeshes: THREE.InstancedMesh[] = [];

  constructor(config: WorldConfig, scene: THREE.Scene) {
    this.config = config;
    this.scene = scene;
    for (const b of config.blocks) {
      this.blocks.set(`${b.x},${b.y},${b.z}`, b.type);
    }
    this.buildMeshes();
    scene.add(this.group);
  }

  private buildMeshes() {
    // FASE 8: InstancedMesh por tipo para bloques (suelo+paredes) — 1 draw call por tipo en vez de 4000
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const getMat = (type: BlockType) => {
      const key = type;
      if (matCache.has(key)) return matCache.get(key)!;
      // wall_front = muro que mira a la cámara: translúcido para ver adentro de la sala.
      const opacity =
        type === 'glass' ? 0.3 : type === 'wall_front' ? 0.22 : type === 'plant' ? 0.9 : 1;
      const m = new THREE.MeshStandardMaterial({
        color: BLOCK_COLORS[type],
        roughness: type === 'glass' ? 0.15 : 0.85,
        metalness: 0.02,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity > 0.5,
      });
      matCache.set(key, m);
      return m;
    };

    // Agrupa bloques por tipo para instanciar
    const byType = new Map<BlockType, BlockData[]>();
    for (const b of this.config.blocks) {
      if (!byType.has(b.type)) byType.set(b.type, []);
      byType.get(b.type)!.push(b);
    }
    // Suelo base también instanciado
    const groundBlocks: BlockData[] = [];
    for (let x = 0; x < this.config.size.width; x++) {
      for (let z = 0; z < this.config.size.depth; z++) {
        const key = `${x},0,${z}`;
        if (!this.blocks.has(key)) {
          groundBlocks.push({ x, y: 0, z, type: 'grass' });
          this.blocks.set(key, 'grass');
        }
      }
    }
    if (groundBlocks.length) {
      if (!byType.has('grass')) byType.set('grass', []);
      byType.get('grass')!.push(...groundBlocks);
    }

    // Crea un InstancedMesh por tipo
    this.instancedMeshes = [];
    const dummy = new THREE.Object3D();
    for (const [type, list] of byType) {
      const mat = getMat(type);
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      inst.castShadow = type !== 'glass' && type !== 'wall_front';
      inst.receiveShadow = true;
      let idx = 0;
      for (const b of list) {
        dummy.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
        dummy.updateMatrix();
        inst.setMatrixAt(idx++, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      // frustum culling por instancia (Three lo hace)
      this.group.add(inst);
      this.instancedMeshes.push(inst);
    }

    this.addFloor();
    this.addWallTrim();

    this.addDetailedFurniture();
    this.addDoorSigns();
  }

  /** Piso de baldosas blancas para todo el edificio (una sola textura, un solo plano). */
  private addFloor() {
    const { width, depth } = this.config.size;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({
        map: tileTexture(width, depth),
        roughness: 0.55,
        metalness: 0.02,
      }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(width / 2, 1.02, depth / 2);
    plane.receiveShadow = true;
    this.group.add(plane);
  }

  /** Zócalo y cornisa blancos por sala: es lo que saca el aspecto de caja de bloques. */
  private addWallTrim() {
    if (!this.config.offices?.length) return;
    const mat = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.6 });
    for (const office of this.config.offices) {
      const { minX, maxX, minZ, maxZ } = office.bounds;
      // interior útil: las paredes ocupan su propia celda
      const x0 = minX + 1;
      const z0 = minZ + 1;
      const w = maxX - x0;
      const d = maxZ - z0;
      const strip = (sw: number, sh: number, sd: number, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), mat);
        m.position.set(x, y, z);
        m.receiveShadow = true;
        this.group.add(m);
      };
      for (const [y, h] of [[1.09, 0.18], [3.88, 0.24]] as const) {
        strip(w, h, 0.1, x0 + w / 2, y, z0 + 0.02); // norte
        strip(w, h, 0.1, x0 + w / 2, y, maxZ - 0.02); // sur
        strip(0.1, h, d, x0 + 0.02, y, z0 + d / 2); // oeste
        strip(0.1, h, d, maxX - 0.02, y, z0 + d / 2); // este
      }
    }
  }

  private addDetailedFurniture() {
    if (!this.config.offices?.length) return;
    // Híbrido: intenta GLB vía AssetManager, fallback a caja detallada (todo pasa por el catálogo)
    const addHybrid = (
      type: string,
      x: number,
      y: number,
      z: number,
      rotY = 0,
      scale?: number,
      tint?: Record<string, number>,
    ) => {
      const placeholder = createWorldObjectSync(
        { type, position: [x, y, z], rotationY: rotY, scale },
        (glb) => {
          this.group.remove(placeholder);
          glb.position.set(x, y, z);
          glb.rotation.y = rotY;
          if (scale !== undefined) glb.scale.multiplyScalar(scale);
          if (tint) applyTint(glb, tint);
          this.group.add(glb);
        },
      );
      this.group.add(placeholder);
      // Colision: marca la celda del prop en el grid (buildMeshes ya corrio, no se renderiza nada nuevo).
      // ponytail: 1 celda por mueble alcanza; si un sofa/mesa larga se atraviesa, marcar el AABB del GLB.
      if (assetsCatalog[type]?.collidable) {
        this.blocks.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, 'desk');
      }
      return placeholder;
    };

    // Muebles por sala: posiciones relativas al centro (ver officeLayout.ts).
    // Agregar una sala en config/offices.json alcanza para que se amueble sola.
    const { wallTypeOf } = buildWorldBlocks(this.config.offices);
    for (const office of this.config.offices) {
      const c = meetingSpot(office.bounds);
      // El acento de la sala sale de su color de pared: alfombras y tapizados lo toman.
      const accent = accentOf(BLOCK_COLORS[wallTypeOf[office.id] ?? 'wall_pink']);
      this.meetingSpots.set(office.id, new THREE.Vector3(c.x, FLOOR_Y, c.z));
      const flip = isFlipped(office.bounds);
      const half = interiorHalf(office.bounds);
      for (const p of officeProps(themeFor(office.id), flip, accent, half)) {
        addHybrid(
          p.type,
          c.x + p.dx,
          FLOOR_Y + p.dy,
          c.z + p.dz,
          p.rotY ?? 0,
          p.scale,
          p.tint,
        );
      }
    }
    // decoración del pasillo central
    const cz = (CORRIDOR_Z.min + CORRIDOR_Z.max) / 2;
    addHybrid('plant', WORLD_SIZE.width / 2 - 1, FLOOR_Y, cz);
    addHybrid('plant', WORLD_SIZE.width / 2 + 1, FLOOR_Y, cz, 0, 0.7);
  }

  /** Cartel con el nombre de la sala sobre el vano de la puerta, mirando al pasillo. */
  private addDoorSigns() {
    if (!this.config.offices?.length) return;
    const { doors } = buildWorldBlocks(this.config.offices);
    for (const door of doors) {
      const office = this.config.offices.find((o) => o.id === door.officeId);
      if (!office) continue;
      const sign = createNametag(office.name, {
        width: 512,
        fontSize: 44,
        background: 'rgba(35,30,45,0.88)',
      });
      // a diferencia del nametag de jugador, el cartel no debe verse a través de las paredes
      sign.material.depthTest = true;
      sign.scale.set(4.4, 1.1, 1);
      // el vano son las celdas door.x-1 y door.x -> su centro geométrico es door.x
      sign.position.set(door.x, 4.3, door.z + 0.5 + door.facing * 0.6);
      this.group.add(sign);
    }
  }

  isSolidAt(x: number, y: number, z: number): boolean {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    const t = this.blocks.get(key);
    if (!t) return false;
    return isSolid(t);
  }

  dispose() {
    this.scene.remove(this.group);
    const mats = new Set<THREE.Material>();
    const geos = new Set<THREE.BufferGeometry>();
    for (const inst of this.instancedMeshes) {
      geos.add(inst.geometry as THREE.BufferGeometry);
      if (Array.isArray(inst.material)) (inst.material as THREE.Material[]).forEach((m) => mats.add(m));
      else mats.add(inst.material as THREE.Material);
      inst.dispose();
    }
    for (const g of geos) g.dispose();
    this.instancedMeshes = [];
    for (const m of this.blockMeshes.values()) {
      if (!mats.has(m.material as THREE.Material)) mats.add(m.material as THREE.Material);
    }
    for (const mat of mats) (mat as THREE.Material).dispose();
    this.blockMeshes.clear();
  }
}

export function createDefaultWorldConfig(): WorldConfig {
  // Fallback si el server no responde (dev offline). Mismas salas y misma geometría
  // que el mundo autoritativo: si esto divergiera, jugar offline mostraría otro mapa.
  const offices: WorldConfig['offices'] = OFFLINE_OFFICES.map((o) => ({
    ...o,
    meetingUrl: '',
    spawnPoint: { x: (o.bounds.minX + o.bounds.maxX) / 2, y: 1, z: (o.bounds.minZ + o.bounds.maxZ) / 2 },
  }));
  const { blocks } = buildWorldBlocks(offices);
  return {
    size: { width: WORLD_SIZE.width, depth: WORLD_SIZE.depth, height: WORLD_SIZE.height },
    blocks,
    offices,
    spawnPoints: [{ x: WORLD_SIZE.width / 2, y: 1, z: (CORRIDOR_Z.min + CORRIDOR_Z.max) / 2 }],
  };
}

// Espejo de config/offices.json para el modo offline (el server es la fuente real).
const OFFLINE_OFFICES = [
  { id: 'office-1', name: 'Sala de Desarrollo', bounds: { minX: 2, maxX: 18, minY: 0, maxY: 6, minZ: 2, maxZ: 18 } },
  { id: 'office-2', name: 'Sala de Diseño', bounds: { minX: 21, maxX: 37, minY: 0, maxY: 6, minZ: 2, maxZ: 18 } },
  { id: 'office-3', name: 'Sala de Reuniones', bounds: { minX: 40, maxX: 56, minY: 0, maxY: 6, minZ: 2, maxZ: 18 } },
  { id: 'office-4', name: 'Sala de Juegos', bounds: { minX: 2, maxX: 18, minY: 0, maxY: 6, minZ: 28, maxZ: 44 } },
  { id: 'office-5', name: 'Lounge', bounds: { minX: 21, maxX: 37, minY: 0, maxY: 6, minZ: 28, maxZ: 44 } },
];

/**
 * Baldosas blancas con junta gris: un canvas de una baldosa repetido por unidad de mundo.
 * Evita bajar una textura y da el piso de la referencia.
 */
function tileTexture(repeatX: number, repeatZ: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#d3d7dd';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatZ);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Recolorea materiales del GLB por nombre. AssetManager clona los materiales por
 * instancia, así que teñir uno no afecta a los demás muebles del mismo modelo. */
function applyTint(group: THREE.Group, tint: Record<string, number>) {
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const hex = tint[m?.name ?? ''];
      if (hex !== undefined) (m as THREE.MeshStandardMaterial).color?.setHex(hex);
    }
  });
}

/** Sube la saturación del color de pared: la pared es apagada, el textil no. */
function accentOf(wallColor: number): number {
  const c = new THREE.Color(wallColor);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * 2.4), Math.max(0.42, hsl.l - 0.22));
  return c.getHex();
}
