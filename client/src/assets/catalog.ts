import type { AssetDef, AssetsCatalog } from './types.js';

// Atajo para las entradas del kit: todas comparten escala y no necesitan yOffset.
const k = (path: string, scale: number, collidable: boolean, label: string): AssetDef => ({
  url: `/models/${path}.glb`,
  scale,
  yOffset: 0,
  collidable,
  label,
});

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

  // --- Kenney Furniture Kit 2.0 (CC0) — /models/kenney, ver LICENSE.txt ---
  // Mismo kit que los modelos de arriba, así que comparten la escala 2.0.
  desk_office: k('furniture/desk', 2.0, true, 'Escritorio'),
  desk_corner: k('kenney/deskCorner', 2.0, true, 'Escritorio en L'),
  chair_office: k('kenney/chairDesk', 2.0, true, 'Silla de oficina'),
  chair_cushion: k('kenney/chairCushion', 2.0, true, 'Silla acolchada'),
  chair_modern: k('kenney/chairModernCushion', 2.0, true, 'Silla moderna'),
  mouse: k('kenney/computerMouse', 2.0, false, 'Mouse'),
  credenza: k('kenney/bookcaseClosedWide', 2.0, true, 'Credenza'),
  cabinet_tall: k('kenney/bookcaseClosed', 2.0, true, 'Armario'),
  shelf_low: k('kenney/bookcaseOpenLow', 2.0, true, 'Estante bajo'),
  books: k('kenney/books', 2.0, false, 'Libros'),
  rug_round: k('kenney/rugRound', 2.0, false, 'Alfombra redonda'),
  rug_square: k('kenney/rugSquare', 2.0, false, 'Alfombra cuadrada'),
  plant_big: k('kenney/pottedPlant', 2.0, false, 'Planta grande'),
  plant_1: k('kenney/plantSmall1', 2.0, false, 'Planta chica'),
  plant_2: k('kenney/plantSmall2', 2.0, false, 'Planta chica'),
  plant_3: k('kenney/plantSmall3', 2.0, false, 'Suculenta'),
  lamp_ceiling: k('kenney/lampSquareCeiling', 2.0, false, 'Lámpara de techo'),
  lamp_floor: k('kenney/lampRoundFloor', 2.0, false, 'Lámpara de pie'),
  lamp_wall: k('kenney/lampWall', 2.0, false, 'Aplique'),
  box: k('kenney/cardboardBoxOpen', 2.0, false, 'Caja'),
  coat_rack: k('kenney/coatRackStanding', 2.0, false, 'Perchero'),
  side_table: k('kenney/sideTable', 2.0, true, 'Mesa auxiliar'),
  table_round: k('kenney/tableRound', 2.0, true, 'Mesa redonda'),
  table_coffee: k('kenney/tableCoffee', 2.0, true, 'Mesa ratona'),
  tv: k('kenney/televisionModern', 2.0, false, 'TV'),
  tv_retro: k('kenney/televisionVintage', 2.0, false, 'TV retro'),
  speaker: k('kenney/speaker', 2.0, false, 'Parlante'),
  sofa_long: k('kenney/loungeSofaLong', 2.0, true, 'Sofá largo'),
  sofa_design: k('kenney/loungeDesignSofa', 2.0, true, 'Sofá de diseño'),
  armchair: k('kenney/loungeChair', 2.0, true, 'Sillón'),
  pillow: k('kenney/pillow', 2.0, false, 'Almohadón'),
  pillow_long: k('kenney/pillowBlue', 2.0, false, 'Almohadón largo'),
  stool: k('kenney/stoolBar', 2.0, true, 'Banqueta'),
  radio: k('kenney/radio', 2.0, false, 'Radio'),
  bear: k('kenney/bear', 2.0, false, 'Oso'),
  coffee_machine: k('kenney/kitchenCoffeeMachine', 2.0, false, 'Cafetera'),
  fridge: k('kenney/kitchenFridgeSmall', 2.0, true, 'Heladera'),

  player: { url: '/models/characters/player.glb', scale: 1.0, yOffset: 0, collidable: false, label: 'Player' },
};

// Helper para cambiar solo el archivo sin tocar código:
// assetsCatalog.chair.url = "/models/furniture/office-chair.glb"
