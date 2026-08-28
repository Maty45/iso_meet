import type { BlockData, BlockType, WorldConfig } from '@iso-meet/shared';
import * as THREE from 'three';
import { BLOCK_COLORS } from './blocks.js';
import { isSolid } from './blocks.js';
import * as Furniture from './furniture.js';
import { createWorldObjectSync } from '../entities/WorldObject.js';

export class World {
  config: WorldConfig;
  scene: THREE.Scene;
  blocks = new Map<string, BlockType>(); // "x,y,z" -> type
  group = new THREE.Group();
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
      const isTransparent = type === 'glass' || type === 'monitor' || type === 'plant';
      const m = new THREE.MeshStandardMaterial({
        color: BLOCK_COLORS[type],
        roughness: 0.85,
        metalness: 0.02,
        transparent: isTransparent,
        opacity: isTransparent ? (type === 'glass' ? 0.32 : 0.9) : 1,
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
      inst.castShadow = type !== 'glass';
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

    // Suelo de oficinas con colores estilo imagen (tonos pastel por sala)
    if (this.config.offices?.length) {
      const officeColors: Record<string, number> = {
        'office-1': 0xe8d5f5, // lila claro
        'office-2': 0xf5d5a0, // madera cálida
        'office-3': 0xd5c4f5, // púrpura
        'office-4': 0xc5e8c5, // verde suave
      };
      const edgeColors: Record<string, number> = {
        'office-1': 0xc8a0d8,
        'office-2': 0xc8a86a,
        'office-3': 0xa080d0,
        'office-4': 0x80b080,
      };
      for (const office of this.config.offices) {
        const { minX, maxX, minZ, maxZ } = office.bounds;
        const w = maxX - minX;
        const d = maxZ - minZ;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(w, d),
          new THREE.MeshLambertMaterial({ color: officeColors[office.id] ?? 0xfff8e1 }),
        );
        plane.rotation.x = -Math.PI / 2;
        plane.position.set(minX + w / 2, 1.02, minZ + d / 2);
        // @ts-ignore receiveShadow
        plane.receiveShadow = true;
        this.group.add(plane);

        const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.05, d));
        const edge = new THREE.LineSegments(
          edgeGeo,
          new THREE.LineBasicMaterial({ color: edgeColors[office.id] ?? 0xc8a86a }),
        );
        edge.position.set(minX + w / 2, 1.03, minZ + d / 2);
        this.group.add(edge);
      }
    }

    // Muebles detallados 3D (investigación: mejor forma es Groups con BoxGeometries compuestas)
    // En lugar de cubos 1x1, usamos geometrías compuestas con patas/tapas/respaldos para sillones, mesas, etc.
    // Esto mantiene estética voxel pero con siluetas reconocibles como en la imagen.
    this.addDetailedFurniture();
  }

  private addDetailedFurniture() {
    if (!this.config.offices?.length) return;
    const add = (group: THREE.Group, x: number, y: number, z: number, rotY = 0) => {
      group.position.set(x, y, z);
      group.rotation.y = rotY;
      this.group.add(group);
    };
    // Híbrido: intenta GLB vía AssetManager, fallback a caja detallada (Fase 5: todo pasa por catálogo)
    const addHybrid = (type: string, x: number, y: number, z: number, rotY = 0, scale?: number) => {
      const placeholder = createWorldObjectSync(
        { type, position: [x, y, z], rotationY: rotY, scale },
        (glb) => {
          this.group.remove(placeholder);
          glb.position.set(x, y, z);
          glb.rotation.y = rotY;
          if (scale !== undefined) glb.scale.multiplyScalar(scale);
          this.group.add(glb);
        },
      );
      this.group.add(placeholder);
      return placeholder;
    };

    for (const office of this.config.offices) {
      if (office.id === 'office-1') {
        // FASE 5: todo híbrido via catálogo — cambiar .glb solo en catalog.ts
        addHybrid('table', 7, 1, 6.5, 0); // mesa central 2x2
        addHybrid('plant', 7, 1.92, 6.5, 0);
        addHybrid('chair', 7, 1, 5.2, 0);
        addHybrid('chair', 7, 1, 7.8, Math.PI);
        addHybrid('chair', 5.8, 1, 6.5, Math.PI/2);
        addHybrid('chair', 8.2, 1, 6.5, -Math.PI/2);
        addHybrid('desk', 4.5, 1, 4.5, 0);
        addHybrid('monitor', 4.5, 1.82, 4.3, 0);
        addHybrid('laptop', 5.0, 1.82, 4.5, 0);
        addHybrid('bookshelf', 3.5, 1, 3.5, 0);
        addHybrid('bookshelf', 10.2, 1, 3.5, 0);
        addHybrid('lamp', 6, 3.2, 6, 0);
        addHybrid('lamp', 8, 3.2, 7, 0);
        addHybrid('lamp', 5, 3.2, 5, 0);
        addHybrid('plant', 11, 1, 11, 0);
        addHybrid('picture', 3.2, 1.4, 2.05, 0);
        addHybrid('trashcan', 12.5, 1, 5, 0);
      } else if (office.id === 'office-2') {
        addHybrid('meeting_table', 24, 1, 8, 0);
        addHybrid('desk', 24, 1, 10, 0);
        addHybrid('chair', 22, 1, 6.5, 0);
        addHybrid('chair', 24, 1, 6.5, 0);
        addHybrid('chair', 26, 1, 6.5, 0);
        addHybrid('chair', 22, 1, 10.8, Math.PI);
        addHybrid('chair', 24, 1, 10.8, Math.PI);
        addHybrid('chair', 26, 1, 8.5, -Math.PI/2);
        addHybrid('monitor', 29.5, 1, 8, -Math.PI/2);
        addHybrid('sofa', 19.5, 1, 4.2, 0);
        addHybrid('bookshelf', 19, 1, 3.5, 0);
        addHybrid('cabinet', 20.5, 1, 3.5, 0);
        addHybrid('plant', 28.5, 1, 12.2, 0);
        addHybrid('plant', 19, 1, 12.2, 0);
        addHybrid('carpet', 24, 0.02, 8, 0);
      } else if (office.id === 'office-3') {
        addHybrid('whiteboard', 4, 1, 18.5, 0);
        addHybrid('table', 8, 1, 20.5, 0);
        addHybrid('desk', 8, 1, 24.5, 0);
        addHybrid('desk', 11, 1, 26, 0);
        addHybrid('chair', 8, 1, 19.2, 0);
        addHybrid('chair', 8, 1, 25.8, Math.PI);
        addHybrid('chair', 6.2, 1, 20.5, Math.PI/2);
        addHybrid('meeting_table', 11, 1, 27.5, 0);
        addHybrid('monitor', 11, 1.82, 27.5, 0);
        addHybrid('bookshelf', 13.2, 1, 20.5, Math.PI/2);
        addHybrid('bookshelf', 13.2, 1, 26, Math.PI/2);
        addHybrid('plant', 3.2, 1, 28.2, 0);
        addHybrid('plant', 12.5, 1, 28.2, 0);
        addHybrid('lamp', 8, 3.2, 20.5, 0);
      } else if (office.id === 'office-4') {
        addHybrid('desk', 24, 1, 21.5, 0);
        addHybrid('monitor', 23, 1.82, 21.2, 0);
        addHybrid('monitor', 25, 1.82, 21.2, 0);
        addHybrid('desk', 24, 1, 26.5, 0);
        addHybrid('monitor', 24, 1.82, 26.5, Math.PI);
        addHybrid('laptop', 22.5, 1.82, 26.5, 0);
        addHybrid('keyboard', 24, 1.82, 26.5, 0);
        addHybrid('chair', 23, 1, 22.5, Math.PI);
        addHybrid('chair', 25, 1, 22.5, Math.PI);
        addHybrid('chair', 23, 1, 27.5, 0);
        addHybrid('chair', 25, 1, 27.5, 0);
        addHybrid('bookshelf', 29.2, 1, 20.5, 0);
        addHybrid('bookshelf', 29.2, 1, 26.5, 0);
        addHybrid('cabinet', 29.2, 1, 23.5, 0);
        addHybrid('plant', 22, 1, 28.5, 0);
        addHybrid('plant', 27.5, 1, 22, 0);
        addHybrid('carpet', 24, 0.02, 24, 0);
      }
    }
    // decoración central plaza (spawn 16,16)
    const centerPlant = Furniture.createPlant();
    centerPlant.scale.set(0.8, 0.8, 0.8);
    centerPlant.position.set(16, 1, 16);
    this.group.add(centerPlant);
    const centerPlant2 = Furniture.createPlant();
    centerPlant2.scale.set(0.6, 0.6, 0.6);
    centerPlant2.position.set(16, 1, 14.5);
    this.group.add(centerPlant2);
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
  // Fallback si server no envía world (dev offline)
  const size = { width: 40, depth: 40, height: 12 };
  const blocks: BlockData[] = [];
  // Paredes perimetrales
  for (let x = 0; x < size.width; x++) {
    for (let y = 1; y <= 3; y++) {
      blocks.push({ x, y, z: 0, type: 'stone' });
      blocks.push({ x, y, z: size.depth - 1, type: 'stone' });
    }
  }
  for (let z = 0; z < size.depth; z++) {
    for (let y = 1; y <= 3; y++) {
      blocks.push({ x: 0, y, z, type: 'stone' });
      blocks.push({ x: size.width - 1, y, z, type: 'stone' });
    }
  }
  // Oficinas sintéticas para offline (mismos bounds que config/offices.json) + paredes y muebles
  const offices = [
    { id: 'office-1', name: 'Sala de Desarrollo', bounds: { minX: 2, maxX: 14, minY: 0, maxY: 6, minZ: 2, maxZ: 14 }, meetingUrl: '', spawnPoint: { x: 8, y: 1, z: 8 } },
    { id: 'office-2', name: 'Sala de Diseño', bounds: { minX: 18, maxX: 30, minY: 0, maxY: 6, minZ: 2, maxZ: 14 }, meetingUrl: '', spawnPoint: { x: 24, y: 1, z: 8 } },
    { id: 'office-3', name: 'Sala de Reuniones', bounds: { minX: 2, maxX: 14, minY: 0, maxY: 6, minZ: 18, maxZ: 30 }, meetingUrl: '', spawnPoint: { x: 8, y: 1, z: 24 } },
    { id: 'office-4', name: 'Sala de Juegos', bounds: { minX: 18, maxX: 30, minY: 0, maxY: 6, minZ: 18, maxZ: 30 }, meetingUrl: '', spawnPoint: { x: 24, y: 1, z: 24 } },
  ] as WorldConfig['offices'];
  const wallType = (id: string) => (id === 'office-1' ? 'wall_pink' : id === 'office-2' ? 'wood' : id === 'office-3' ? 'wall_purple' : 'shelf') as BlockType;
  const push = (x: number, y: number, z: number, type: BlockType) => blocks.push({ x, y, z, type });
  for (const office of offices) {
    const { minX, maxX, minZ, maxZ } = office.bounds;
    const wall = wallType(office.id);
    const isTop = (minZ + maxZ) / 2 < 20;
    const doorWallZ = isTop ? maxZ : minZ;
    const windowWallZ = isTop ? minZ : maxZ;
    const doorXa = Math.floor((minX + maxX) / 2);
    const winX = minX + 2;
    for (let y = 1; y <= 3; y++) {
      for (let x = minX; x <= maxX; x++) {
        const isDoorGap = doorWallZ === minZ && y <= 2 && (x === doorXa || x === doorXa + 1);
        if (isDoorGap) { if (y === 3) push(x, y, minZ, wall); continue; }
        const isWindow = windowWallZ === minZ && y === 2 && (x === winX || x === winX + 1) && office.id !== 'office-4';
        if (isWindow) { push(x, y, minZ, 'glass'); continue; }
        push(x, y, minZ, wall);
      }
      for (let x = minX; x <= maxX; x++) {
        const isDoorGap = doorWallZ === maxZ && y <= 2 && (x === doorXa || x === doorXa + 1);
        if (isDoorGap) { if (y === 3) push(x, y, maxZ, wall); continue; }
        const isWindow = windowWallZ === maxZ && y === 2 && (x === winX || x === winX + 1) && office.id !== 'office-4';
        if (isWindow) { push(x, y, maxZ, 'glass'); continue; }
        push(x, y, maxZ, wall);
      }
      for (let z = minZ + 1; z <= maxZ - 1; z++) { push(minX, y, z, wall); push(maxX, y, z, wall); }
    }
    if (office.id === 'office-1') { push(6, 1, 6, 'desk'); push(7, 1, 6, 'desk'); push(6, 1, 7, 'desk'); push(7, 1, 7, 'desk'); push(6, 2, 6, 'plant'); push(6, 1, 5, 'wool'); push(7, 1, 5, 'wool'); push(4, 1, 4, 'desk'); push(4, 2, 4, 'monitor'); push(3, 1, 3, 'shelf'); push(3, 2, 3, 'shelf'); }
    if (office.id === 'office-2') { push(19, 1, 6, 'desk'); push(20, 1, 6, 'desk'); push(21, 1, 6, 'desk'); push(19, 1, 8, 'desk'); push(25, 2, 6, 'monitor'); push(17, 1, 4, 'wool'); push(17, 1, 3, 'shelf'); push(24, 1, 10, 'plant'); }
    if (office.id === 'office-3') { push(4, 1, 20, 'shelf'); push(6, 1, 18, 'desk'); push(7, 1, 18, 'desk'); push(9, 1, 22, 'desk'); push(9, 2, 24, 'monitor'); push(11, 1, 18, 'shelf'); }
    if (office.id === 'office-4') { push(19, 1, 19, 'desk'); push(20, 1, 19, 'desk'); push(19, 2, 19, 'monitor'); push(19, 1, 23, 'desk'); push(22, 2, 23, 'monitor'); push(25, 1, 18, 'shelf'); push(19, 1, 25, 'plant'); }
  }

  return {
    size,
    blocks,
    offices,
    spawnPoints: [{ x: 16, y: 1, z: 16 }],
  };
}
