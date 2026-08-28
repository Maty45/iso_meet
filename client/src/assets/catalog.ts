import type { AssetsCatalog } from './types.js';

// Catálogo centralizado — cambiar el .glb/.fbx aquí no requiere tocar World/Factory
// Fuentes: Kenney Furniture Kit CC0 https://kenney.nl/assets/furniture-kit (ver /public/models/README.md)
// Kenney FBX se sirven como .fbx; AssetManager maneja GLB y FBX transparente.
// Si un path no existe, AssetManager devuelve placeholder y no rompe la escena.
export const assetsCatalog: AssetsCatalog = {
  // --- FASE 9.2: GLB perfectos (OBJ→GLB con obj2gltf, CC0) ---
  chair: {
    url: '/models/furniture/chair.glb',
    scale: 2.0,
    yOffset: 0,
    collidable: true,
    label: 'Office Chair',
  },
  desk: {
    url: '/models/furniture/desk.glb',
    scale: 2.0,
    yOffset: 0,
    collidable: true,
    label: 'Desk',
  },
  plant: {
    url: '/models/decoration/plant.glb',
    scale: 2.0,
    yOffset: 0,
    collidable: false,
    label: 'Potted Plant',
  },

  // --- Pack completo (Kenney cm → 0.012, evita FBX UVNode) ---
  table: { url: '/models/furniture/table.glb', scale: 2.0, yOffset: 0, collidable: true, label: 'Table' },
  sofa: { url: '/models/furniture/sofa.glb', scale: 2.0, yOffset: 0, collidable: true, label: 'Sofa' },
  bookshelf: { url: '/models/furniture/bookshelf.glb', scale: 2.0, yOffset: 0, collidable: true, label: 'Bookshelf' },
  bed: { url: '/models/furniture/bed.fbx', scale: 0.01, yOffset: 0, collidable: true, label: 'Bed' },

  monitor: { url: '/models/electronics/monitor.glb', scale: 2.0, yOffset: 0.82, collidable: false, label: 'Monitor' },
  computer: { url: '/models/electronics/computer.glb', scale: 2.0, yOffset: 0.82, collidable: false, label: 'PC' },
  laptop: { url: '/models/electronics/laptop.glb', scale: 2.0, yOffset: 0.82, collidable: false, label: 'Laptop' },
  keyboard: { url: '/models/electronics/keyboard.glb', scale: 2.0, yOffset: 0.82, collidable: false, label: 'Keyboard' },

  lamp: { url: '/models/decoration/lamp.glb', scale: 2.0, yOffset: 1.6, collidable: false, label: 'Hanging Lamp' },
  trashcan: { url: '/models/decoration/trashcan.glb', scale: 2.0, yOffset: 0, collidable: false, label: 'Trashcan' },
  picture: { url: '/models/decoration/picture.glb', scale: 2.0, yOffset: 1.4, collidable: false, label: 'Picture Frame' },
  carpet: { url: '/models/decoration/carpet.glb', scale: 2.0, yOffset: 0.01, collidable: false, label: 'Carpet' },

  whiteboard: { url: '/models/office/whiteboard.glb', scale: 2.0, yOffset: 0.9, collidable: false, label: 'Whiteboard' },
  meeting_table: { url: '/models/office/meeting-table.glb', scale: 2.0, yOffset: 0, collidable: true, label: 'Meeting Table' },
  cabinet: { url: '/models/office/cabinet.glb', scale: 2.0, yOffset: 0, collidable: true, label: 'Cabinet' },
  door: { url: '/models/office/door.fbx', scale: 0.01, yOffset: 0, collidable: true, label: 'Door' },

  player: { url: '/models/characters/player.glb', scale: 1.0, yOffset: 0, collidable: false, label: 'Player' },
};

// Helper para cambiar solo el archivo sin tocar código:
// assetsCatalog.chair.url = "/models/furniture/office-chair.glb"
