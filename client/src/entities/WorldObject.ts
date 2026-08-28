import * as THREE from 'three';
import { assetManager } from '../assets/AssetManager.js';
import { assetsCatalog } from '../assets/catalog.js';
import * as Furniture from '../world/furniture.js';

export interface WorldObjectOptions {
  type: string;
  position: [number, number, number];
  rotationY?: number; // radianes
  scale?: number;
  yOffset?: number;
}

// Fallback box -> modelo low-poly detallado si existe GLB
const fallbackMap: Record<string, () => THREE.Group> = {
  chair: () => Furniture.createChair(),
  desk: () => Furniture.createSmallTable(),
  table: () => Furniture.createTable(),
  sofa: () => Furniture.createSofa(),
  bookshelf: () => Furniture.createBookshelf(),
  plant: () => Furniture.createPlant(),
  lamp: () => Furniture.createHangingLamp(),
  monitor: () => Furniture.createMonitor(),
  computer: () => Furniture.createMonitor(),
  laptop: () => Furniture.createLaptop(),
  whiteboard: () => Furniture.createWhiteboard(),
  meeting_table: () => Furniture.createTable(),
  cabinet: () => Furniture.createBookshelf(),
  bed: () => Furniture.createTable(), // temporal
};

export async function createWorldObject(opts: WorldObjectOptions): Promise<THREE.Group> {
  const { type, position, rotationY = 0, scale, yOffset } = opts;
  const def = assetsCatalog[type];

  let group: THREE.Group | null = null;

  // Intenta GLB primero si existe en catálogo
  if (def) {
    const loaded = await assetManager.load(type);
    if (!loaded.userData.isPlaceholder) {
      group = loaded;
    } else {
      // placeholder -> fallback a caja detallada
      const fn = fallbackMap[type];
      group = fn ? fn() : createGenericPlaceholder(type);
    }
    // aplica overrides de instancia (además del scale del catálogo ya aplicado)
    if (scale !== undefined) group.scale.multiplyScalar(scale);
    if (yOffset !== undefined) group.position.y += yOffset;
  } else {
    // tipo no catalogado -> usa fallback directo
    const fn = fallbackMap[type];
    group = fn ? fn() : createGenericPlaceholder(type);
    if (scale !== undefined) group.scale.set(scale, scale, scale);
  }

  group.position.set(position[0], position[1] + (group.position.y || 0), position[2]);
  // combina rotación del catálogo + rotación de instancia
  if (rotationY) group.rotation.y += rotationY;

  group.userData.type = type;
  group.userData.isWorldObject = true;
  // colisión se mantiene en World.blocks (grid), no en mesh
  return group;
}

function createGenericPlaceholder(type: string): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.85 }),
  );
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  g.userData.isPlaceholder = true;
  g.userData.placeholderType = type;
  return g;
}

// Helper síncrono para casos donde no se quiere async (usa fallback inmediato, carga GLB en background y reemplaza)
export function createWorldObjectSync(opts: WorldObjectOptions, onLoaded?: (group: THREE.Group) => void): THREE.Group {
  const { type, position, rotationY = 0, scale } = opts;
  const fallbackFn = fallbackMap[type];
  const fallback = fallbackFn ? fallbackFn() : createGenericPlaceholder(type);
  fallback.position.set(position[0], position[1], position[2]);
  if (rotationY) fallback.rotation.y = rotationY;
  if (scale !== undefined) fallback.scale.set(scale, scale, scale);
  fallback.userData.type = type;

  // Intenta cargar GLB en background y notifica para reemplazar
  if (assetsCatalog[type]) {
    assetManager.load(type).then((glb) => {
      if (!glb.userData.isPlaceholder && onLoaded) {
        glb.position.copy(fallback.position);
        glb.rotation.y = fallback.rotation.y + (glb.rotation.y || 0);
        onLoaded(glb);
      }
    });
  }

  return fallback;
}
