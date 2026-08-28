import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { assetsCatalog } from './catalog.js';
import type { AssetDef } from './types.js';

// Clone correcto de escenas GLTF con esqueletos
// three/addons/utils/SkeletonUtils es el método oficial (ver three.js docs)
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

type CachedGLTF = {
  scene: THREE.Group;
  def: AssetDef;
};

export class AssetManager {
  private gltfLoader = new GLTFLoader();
  private fbxLoader = new FBXLoader();
  private objLoader = new OBJLoader();
  private mtlLoader = new MTLLoader();
  // cache: url -> scene (una vez por URL)
  private cache = new Map<string, CachedGLTF>();
  // inflight: url -> Promise para evitar cargar 2 veces en paralelo
  private inflight = new Map<string, Promise<THREE.Group>>();

  // Para test: cuántas veces se llamó realmente a loader.load por URL
  public loadCount = new Map<string, number>();

  private placeholderMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.8 });
  private placeholderGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

  /**
   * Carga un asset por key del catálogo (ej. "chair") y devuelve un Group clonado,
   * escalado y con yOffset/rotation aplicados, listo para scene.add().
   * - Cache: misma URL se carga una vez
   * - Clone: cada instancia es un clone independiente
   * - Error: devuelve placeholder rojo y logea, no rompe app
   */
  async load(key: string): Promise<THREE.Group> {
    const def = assetsCatalog[key];
    if (!def) {
      console.warn(`[AssetManager] key "${key}" no existe en catalog.ts`);
      return this.createPlaceholder(`missing:${key}`);
    }
    return this.loadByDef(def, key);
  }

  async loadByDef(def: AssetDef, key = def.url): Promise<THREE.Group> {
    const url = def.url;

    // hit cache → clone
    const cached = this.cache.get(url);
    if (cached) {
      return this.instantiate(cached.scene, cached.def);
    }

    // inflight coalescing
    const ongoing = this.inflight.get(url);
    if (ongoing) {
      const scene = await ongoing;
      // scene ya es un clone, pero necesitamos otro clone para el caller
      // por eso cache guarda el original y clonamos aquí
      const original = this.cache.get(url);
      if (original) return this.instantiate(original.scene, original.def);
      return this.instantiate(scene, def);
    }

    const promise = this.fetchAndCache(url, def);
    this.inflight.set(url, promise);
    try {
      const cloned = await promise;
      return cloned;
    } finally {
      this.inflight.delete(url);
    }
  }

  private async fetchAndCache(url: string, def: AssetDef): Promise<THREE.Group> {
    try {
      let scene: THREE.Group;
      const lower = url.toLowerCase();
      if (lower.endsWith('.fbx')) {
        const fbx = await this.fbxLoader.loadAsync(url);
        scene = fbx as unknown as THREE.Group;
        scene.rotation.x = 0;
      } else if (lower.endsWith('.obj')) {
        // Intenta cargar MTL si existe (mismo nombre .mtl)
        const mtlUrl = url.replace(/\.obj$/i, '.mtl');
        try {
          const materials = await this.mtlLoader.loadAsync(mtlUrl);
          materials.preload();
          this.objLoader.setMaterials(materials);
        } catch {
          // sin MTL, usa material por defecto
        }
        const obj = await this.objLoader.loadAsync(url);
        scene = obj as unknown as THREE.Group;
        scene.rotation.x = 0;
      } else {
        const gltf = await this.gltfLoader.loadAsync(url);
        scene = (gltf.scene as THREE.Group) ?? new THREE.Group();
      }
      this.prepareScene(scene);
      this.cache.set(url, { scene, def });
      this.loadCount.set(url, (this.loadCount.get(url) ?? 0) + 1);
      return this.instantiate(scene, def);
    } catch (err) {
      console.error(`[AssetManager] fallo cargando ${url}:`, err);
      // no cachear error, permitir reintento
      return this.createPlaceholder(url);
    }
  }

  private instantiate(original: THREE.Group, def: AssetDef): THREE.Group {
    // Clone correcto: SkeletonUtils.clone maneja SkinnedMesh/esqueleto; fallback a clone(true)
    let cloned: THREE.Group;
    try {
      // @ts-ignore — SkeletonUtils tiene clone, pero tipos pueden variar
      cloned = (SkeletonUtils as any).clone ? (SkeletonUtils as any).clone(original) as THREE.Group : (original.clone(true) as THREE.Group);
    } catch {
      cloned = original.clone(true) as THREE.Group;
    }

    // Escala y offsets por asset (yOffset en unidades de mundo, no escalado)
    const s = def.scale ?? 1;
    cloned.scale.set(s, s, s);
    if (def.yOffset) cloned.position.y += def.yOffset;
    if (def.rotationY) cloned.rotation.y += def.rotationY;

    // Asegura sombras y que cada instancia tenga materiales clonados si se van a mutar
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // clonar material para que mutaciones por instancia no afecten cache
        if (Array.isArray(mesh.material)) {
          mesh.material = (mesh.material as THREE.Material[]).map((m) => m.clone());
        } else if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });

    cloned.userData.assetDef = def;
    cloned.userData.assetKey = def.label ?? def.url;
    return cloned;
  }

  private prepareScene(scene: THREE.Group) {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Corrección estética: evita brillo excesivo (mantener mate/cartoon)
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material as THREE.Material];
        for (const m of mats) {
          if (m && (m as any).roughness !== undefined) {
            (m as any).roughness = Math.max((m as any).roughness ?? 0.8, 0.75);
            if ((m as any).metalness !== undefined) (m as any).metalness = Math.min((m as any).metalness ?? 0, 0.1);
          }
        }
      }
    });
  }

  private createPlaceholder(id: string): THREE.Group {
    const g = new THREE.Group();
    const m = new THREE.Mesh(this.placeholderGeo, this.placeholderMat);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    // pequeño texto via canvas sprite si se quiere debug
    g.userData.isPlaceholder = true;
    g.userData.placeholderId = id;
    console.warn(`[AssetManager] usando placeholder para ${id}`);
    return g;
  }

  preload(keys: string[]): Promise<THREE.Group[]> {
    return Promise.all(keys.map((k) => this.load(k)));
  }

  hasCached(url: string): boolean {
    return this.cache.has(url);
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
    this.loadCount.clear();
  }

  // Para debug: lista de assets cacheados
  debugList(): string[] {
    return [...this.cache.keys()];
  }
}

// Singleton reutilizable
export const assetManager = new AssetManager();
