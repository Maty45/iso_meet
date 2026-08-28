import * as THREE from 'three';

// Materiales PBR — Standard con roughness para mejor gráfico (más cercano a imagen con luz suave)
const mats = {
  woodLight: new THREE.MeshStandardMaterial({ color: 0xf5e6a3, roughness: 0.75, metalness: 0.02 }),
  woodMid: new THREE.MeshStandardMaterial({ color: 0xd8b98c, roughness: 0.7, metalness: 0.02 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8, metalness: 0.01 }),
  fabricPink: new THREE.MeshStandardMaterial({ color: 0xe8a0bf, roughness: 0.9, metalness: 0 }),
  fabricPurple: new THREE.MeshStandardMaterial({ color: 0x9b8ec4, roughness: 0.9, metalness: 0 }),
  fabricOrange: new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.85, metalness: 0 }),
  fabricBeige: new THREE.MeshStandardMaterial({ color: 0xf0d8b8, roughness: 0.9, metalness: 0 }),
  leafGreen: new THREE.MeshStandardMaterial({ color: 0x5dbb63, roughness: 0.85, metalness: 0 }),
  potTerra: new THREE.MeshStandardMaterial({ color: 0xc86a5a, roughness: 0.9, metalness: 0 }),
  monitorBlack: new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.15 }),
  screenWhite: new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.12 }),
  screenBlue: new THREE.MeshStandardMaterial({ color: 0xadd8e6, roughness: 0.5, emissive: 0xadd8e6, emissiveIntensity: 0.15 }),
  bookRed: new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.8, metalness: 0 }),
  bookBlue: new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.8, metalness: 0 }),
  bookYellow: new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.8, metalness: 0 }),
  lampShade: new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.6, emissive: 0xf39c12, emissiveIntensity: 0.22 }),
};

function box(w: number, h: number, d: number, mat: THREE.Material, pos: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function enableShadows(group: THREE.Group) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      (obj as THREE.Mesh).castShadow = true;
      (obj as THREE.Mesh).receiveShadow = true;
    }
  });
  return group;
}

// Mesa de reuniones: tapa + 4 patas (como en Minecraft pero con proporciones reales)
export function createTable(): THREE.Group {
  const g = new THREE.Group();
  // tapa 1.8 x 0.12 x 1.0
  g.add(box(1.8, 0.12, 1.0, mats.woodLight, [0, 0.76, 0]));
  // patas
  const legH = 0.7;
  const lx = 0.8, lz = 0.4;
  g.add(box(0.08, legH, 0.08, mats.woodDark, [-lx, 0.35, -lz]));
  g.add(box(0.08, legH, 0.08, mats.woodDark, [lx, 0.35, -lz]));
  g.add(box(0.08, legH, 0.08, mats.woodDark, [-lx, 0.35, lz]));
  g.add(box(0.08, legH, 0.08, mats.woodDark, [lx, 0.35, lz]));
  return g;
}

export function createSmallTable(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.0, 0.1, 0.7, mats.woodMid, [0, 0.75, 0]));
  g.add(box(0.07, 0.68, 0.07, mats.woodDark, [-0.4, 0.34, -0.25]));
  g.add(box(0.07, 0.68, 0.07, mats.woodDark, [0.4, 0.34, -0.25]));
  g.add(box(0.07, 0.68, 0.07, mats.woodDark, [-0.4, 0.34, 0.25]));
  g.add(box(0.07, 0.68, 0.07, mats.woodDark, [0.4, 0.34, 0.25]));
  return g;
}

// Sillón 2 cuerpos estilo imagen (base + respaldo + apoyabrazos + cojines)
export function createSofa(color: number = 0xe8a0bf): THREE.Group {
  const g = new THREE.Group();
  const fabric = new THREE.MeshLambertMaterial({ color });
  // base
  g.add(box(1.4, 0.4, 0.7, fabric, [0, 0.3, 0]));
  // respaldo
  g.add(box(1.4, 0.55, 0.12, fabric, [0, 0.65, -0.29]));
  // apoyabrazos
  g.add(box(0.18, 0.45, 0.7, fabric, [-0.61, 0.45, 0]));
  g.add(box(0.18, 0.45, 0.7, fabric, [0.61, 0.45, 0]));
  // cojines
  g.add(box(0.6, 0.18, 0.35, mats.fabricBeige, [-0.32, 0.55, 0.05]));
  g.add(box(0.6, 0.18, 0.35, mats.fabricBeige, [0.32, 0.55, 0.05]));
  // patas
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [-0.6, 0.08, -0.28]));
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [0.6, 0.08, -0.28]));
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [-0.6, 0.08, 0.28]));
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [0.6, 0.08, 0.28]));
  return g;
}

export function createArmchair(color: number = 0xe67e22): THREE.Group {
  const g = new THREE.Group();
  const fabric = new THREE.MeshLambertMaterial({ color });
  g.add(box(0.7, 0.35, 0.7, fabric, [0, 0.3, 0]));
  g.add(box(0.7, 0.5, 0.1, fabric, [0, 0.6, -0.3]));
  g.add(box(0.12, 0.4, 0.7, fabric, [-0.29, 0.45, 0]));
  g.add(box(0.12, 0.4, 0.7, fabric, [0.29, 0.45, 0]));
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [-0.28, 0.08, -0.28]));
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [0.28, 0.08, -0.28]));
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [-0.28, 0.08, 0.28]));
  g.add(box(0.06, 0.12, 0.06, mats.woodDark, [0.28, 0.08, 0.28]));
  return g;
}

export function createChair(color: number = 0xf0d8b8): THREE.Group {
  const g = new THREE.Group();
  const fabric = new THREE.MeshLambertMaterial({ color });
  // asiento
  g.add(box(0.55, 0.08, 0.55, fabric, [0, 0.45, 0]));
  // respaldo
  g.add(box(0.55, 0.45, 0.06, fabric, [0, 0.68, -0.24]));
  // patas
  const legH = 0.42;
  g.add(box(0.04, legH, 0.04, mats.woodDark, [-0.22, 0.22, -0.22]));
  g.add(box(0.04, legH, 0.04, mats.woodDark, [0.22, 0.22, -0.22]));
  g.add(box(0.04, legH, 0.04, mats.woodDark, [-0.22, 0.22, 0.22]));
  g.add(box(0.04, legH, 0.04, mats.woodDark, [0.22, 0.22, 0.22]));
  return g;
}

// Estantería con libros de colores
export function createBookshelf(): THREE.Group {
  const g = new THREE.Group();
  const w = 0.9, h = 1.4, d = 0.25;
  // laterales y estantes
  g.add(box(0.04, h, d, mats.woodDark, [-w/2+0.02, h/2, 0]));
  g.add(box(0.04, h, d, mats.woodDark, [w/2-0.02, h/2, 0]));
  g.add(box(w, 0.04, d, mats.woodDark, [0, 0.02, 0]));
  g.add(box(w, 0.04, d, mats.woodDark, [0, h*0.33, 0]));
  g.add(box(w, 0.04, d, mats.woodDark, [0, h*0.66, 0]));
  g.add(box(w, 0.04, d, mats.woodDark, [0, h-0.02, 0]));
  // libros (cajas finas verticales)
  const bookMats = [mats.bookRed, mats.bookBlue, mats.bookYellow, mats.woodMid];
  for (let i = 0; i < 5; i++) {
    const bm = bookMats[i % 4];
    g.add(box(0.09, 0.28, 0.18, bm, [-0.3 + i*0.15, 0.15, 0.02]));
  }
  for (let i = 0; i < 4; i++) {
    const bm = bookMats[(i+2)%4];
    g.add(box(0.1, 0.26, 0.18, bm, [-0.25 + i*0.17, 0.48, 0.02]));
  }
  return g;
}

// Planta voxel estilo Minecraft — maceta + tronco + copa en cubitos
export function createPlant(): THREE.Group {
  const g = new THREE.Group();
  // maceta
  g.add(box(0.32, 0.22, 0.32, mats.potTerra, [0, 0.14, 0]));
  // tronco
  g.add(box(0.08, 0.35, 0.08, mats.woodDark, [0, 0.42, 0]));
  // copa: cluster de cubitos 0.22
  const s = 0.22;
  const positions: [number, number, number][] = [
    [0,0.7,0],[0,0.7,0.22],[0,0.7,-0.22],[0.22,0.7,0],[-0.22,0.7,0],
    [0,0.92,0],[0.13,0.85,0.13],[-0.13,0.85,0.13],[0.13,0.85,-0.13],[-0.13,0.85,-0.13],
  ];
  for (const p of positions) {
    g.add(box(s, s, s, mats.leafGreen, [p[0], p[1], p[2]]));
  }
  return g;
}

export function createMonitor(): THREE.Group {
  const g = new THREE.Group();
  // base
  g.add(box(0.22, 0.04, 0.18, mats.monitorBlack, [0, 0.06, 0.05]));
  // pie
  g.add(box(0.05, 0.18, 0.05, mats.monitorBlack, [0, 0.16, 0.02]));
  // pantalla marco
  g.add(box(0.55, 0.35, 0.04, mats.monitorBlack, [0, 0.42, -0.02]));
  // pantalla
  g.add(box(0.5, 0.3, 0.02, mats.screenWhite, [0, 0.42, 0.01]));
  return g;
}

export function createLaptop(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.35, 0.02, 0.25, mats.screenWhite, [0, 0.02, 0.05]));
  g.add(box(0.35, 0.22, 0.02, mats.monitorBlack, [0, 0.13, -0.08]));
  g.add(box(0.32, 0.18, 0.015, mats.screenBlue, [0, 0.13, -0.07]));
  return g;
}

// Lámpara colgante como en la imagen (cable + cubo shade)
export function createHangingLamp(color: number = 0xf39c12): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  // cable
  g.add(box(0.015, 1.0, 0.015, mats.woodDark, [0, 1.0, 0]));
  // shade cubo
  g.add(box(0.28, 0.22, 0.28, mat, [0, 0.35, 0]));
  // luz interior
  g.add(box(0.2, 0.04, 0.2, new THREE.MeshLambertMaterial({ color: 0xfff59d }), [0, 0.24, 0]));
  return g;
}

export function createWhiteboard(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.2, 0.75, 0.03, mats.screenWhite, [0, 0.7, 0]));
  // marco
  g.add(box(1.24, 0.02, 0.04, mats.woodMid, [0, 1.08, 0]));
  g.add(box(1.24, 0.02, 0.04, mats.woodMid, [0, 0.32, 0]));
  // garabatos con cajitas pequeñas
  g.add(box(0.25, 0.04, 0.01, mats.bookBlue, [-0.2, 0.75, 0.02]));
  g.add(box(0.18, 0.03, 0.01, mats.bookRed, [0.15, 0.65, 0.02]));
  return g;
}
