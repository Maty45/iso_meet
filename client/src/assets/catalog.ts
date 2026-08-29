import { SKINS } from '@iso-meet/shared';
import type { AssetDef, AssetsCatalog } from './types.js';

// Escala comun de todo el mobiliario. Subirla agranda los muebles contra el personaje
// (que mide 1.8): 2.6 da el look robusto de la referencia sin apretar las salas de 16x16.
export const FURNITURE_SCALE = 2.6;

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
    scale: FURNITURE_SCALE,
    yOffset: 0,
    collidable: true,
    label: 'Office Chair',
  },
  desk: {
    url: '/models/furniture/desk.glb',
    scale: FURNITURE_SCALE,
    yOffset: 0,
    collidable: true,
    label: 'Desk',
  },
  plant: {
    url: '/models/decoration/plant.glb',
    scale: FURNITURE_SCALE,
    yOffset: 0,
    collidable: false,
    label: 'Potted Plant',
  },

  // --- Pack completo (Kenney cm → 0.012, evita FBX UVNode) ---
  table: { url: '/models/furniture/table.glb', scale: FURNITURE_SCALE, yOffset: 0, collidable: true, label: 'Table' },
  sofa: { url: '/models/furniture/sofa.glb', scale: FURNITURE_SCALE, yOffset: 0, collidable: true, label: 'Sofa' },
  bookshelf: { url: '/models/furniture/bookshelf.glb', scale: FURNITURE_SCALE, yOffset: 0, collidable: true, label: 'Bookshelf' },
  bed: { url: '/models/furniture/bed.fbx', scale: 0.01, yOffset: 0, collidable: true, label: 'Bed' },

  monitor: { url: '/models/electronics/monitor.glb', scale: FURNITURE_SCALE, yOffset: 0.82, collidable: false, label: 'Monitor' },
  computer: { url: '/models/electronics/computer.glb', scale: FURNITURE_SCALE, yOffset: 0.82, collidable: false, label: 'PC' },
  laptop: { url: '/models/electronics/laptop.glb', scale: FURNITURE_SCALE, yOffset: 0.82, collidable: false, label: 'Laptop' },
  keyboard: { url: '/models/electronics/keyboard.glb', scale: FURNITURE_SCALE, yOffset: 0.82, collidable: false, label: 'Keyboard' },

  lamp: { url: '/models/decoration/lamp.glb', scale: FURNITURE_SCALE, yOffset: 1.6, collidable: false, label: 'Hanging Lamp' },
  trashcan: { url: '/models/decoration/trashcan.glb', scale: FURNITURE_SCALE, yOffset: 0, collidable: false, label: 'Trashcan' },
  picture: { url: '/models/decoration/picture.glb', scale: FURNITURE_SCALE, yOffset: 1.4, collidable: false, label: 'Picture Frame' },
  carpet: { url: '/models/decoration/carpet.glb', scale: FURNITURE_SCALE, yOffset: 0.01, collidable: false, label: 'Carpet' },

  whiteboard: { url: '/models/office/whiteboard.glb', scale: FURNITURE_SCALE, yOffset: 0.9, collidable: false, label: 'Whiteboard' },
  meeting_table: { url: '/models/office/meeting-table.glb', scale: FURNITURE_SCALE, yOffset: 0, collidable: true, label: 'Meeting Table' },
  cabinet: { url: '/models/office/cabinet.glb', scale: FURNITURE_SCALE, yOffset: 0, collidable: true, label: 'Cabinet' },
  door: { url: '/models/office/door.fbx', scale: 0.01, yOffset: 0, collidable: true, label: 'Door' },

  // --- Kenney Furniture Kit 2.0 (CC0) — /models/kenney, ver LICENSE.txt ---
  // Mismo kit que los modelos de arriba, así que comparten la escala 2.0.
  desk_office: k('furniture/desk', FURNITURE_SCALE, true, 'Escritorio'),
  desk_corner: k('kenney/deskCorner', FURNITURE_SCALE, true, 'Escritorio en L'),
  chair_office: k('kenney/chairDesk', FURNITURE_SCALE, true, 'Silla de oficina'),
  chair_cushion: k('kenney/chairCushion', FURNITURE_SCALE, true, 'Silla acolchada'),
  chair_modern: k('kenney/chairModernCushion', FURNITURE_SCALE, true, 'Silla moderna'),
  mouse: k('kenney/computerMouse', FURNITURE_SCALE, false, 'Mouse'),
  credenza: k('kenney/bookcaseClosedWide', FURNITURE_SCALE, true, 'Credenza'),
  cabinet_tall: k('kenney/bookcaseClosed', FURNITURE_SCALE, true, 'Armario'),
  shelf_low: k('kenney/bookcaseOpenLow', FURNITURE_SCALE, true, 'Estante bajo'),
  books: k('kenney/books', FURNITURE_SCALE, false, 'Libros'),
  rug_round: k('kenney/rugRound', FURNITURE_SCALE, false, 'Alfombra redonda'),
  rug_square: k('kenney/rugSquare', FURNITURE_SCALE, false, 'Alfombra cuadrada'),
  plant_big: k('kenney/pottedPlant', FURNITURE_SCALE, false, 'Planta grande'),
  plant_1: k('kenney/plantSmall1', FURNITURE_SCALE, false, 'Planta chica'),
  plant_2: k('kenney/plantSmall2', FURNITURE_SCALE, false, 'Planta chica'),
  plant_3: k('kenney/plantSmall3', FURNITURE_SCALE, false, 'Suculenta'),
  lamp_ceiling: k('kenney/lampSquareCeiling', FURNITURE_SCALE, false, 'Lámpara de techo'),
  lamp_floor: k('kenney/lampRoundFloor', FURNITURE_SCALE, false, 'Lámpara de pie'),
  lamp_wall: k('kenney/lampWall', FURNITURE_SCALE, false, 'Aplique'),
  box: k('kenney/cardboardBoxOpen', FURNITURE_SCALE, false, 'Caja'),
  coat_rack: k('kenney/coatRackStanding', FURNITURE_SCALE, false, 'Perchero'),
  side_table: k('kenney/sideTable', FURNITURE_SCALE, true, 'Mesa auxiliar'),
  table_round: k('kenney/tableRound', FURNITURE_SCALE, true, 'Mesa redonda'),
  table_coffee: k('kenney/tableCoffee', FURNITURE_SCALE, true, 'Mesa ratona'),
  tv: k('kenney/televisionModern', FURNITURE_SCALE, false, 'TV'),
  tv_retro: k('kenney/televisionVintage', FURNITURE_SCALE, false, 'TV retro'),
  speaker: k('kenney/speaker', FURNITURE_SCALE, false, 'Parlante'),
  sofa_long: k('kenney/loungeSofaLong', FURNITURE_SCALE, true, 'Sofá largo'),
  sofa_design: k('kenney/loungeDesignSofa', FURNITURE_SCALE, true, 'Sofá de diseño'),
  armchair: k('kenney/loungeChair', FURNITURE_SCALE, true, 'Sillón'),
  pillow: k('kenney/pillow', FURNITURE_SCALE, false, 'Almohadón'),
  pillow_long: k('kenney/pillowBlue', FURNITURE_SCALE, false, 'Almohadón largo'),
  stool: k('kenney/stoolBar', FURNITURE_SCALE, true, 'Banqueta'),
  radio: k('kenney/radio', FURNITURE_SCALE, false, 'Radio'),
  bear: k('kenney/bear', FURNITURE_SCALE, false, 'Oso'),
  coffee_machine: k('kenney/kitchenCoffeeMachine', FURNITURE_SCALE, false, 'Cafetera'),
  fridge: k('kenney/kitchenFridgeSmall', FURNITURE_SCALE, true, 'Heladera'),

  // --- PILOTO Poly Haven (CC0, PBR fotorrealista) — solo en el Lounge ---
  // Vienen en escala metrica real; x1.3 los empareja con el mobiliario Kenney, que esta
  // agrandado respecto del personaje. Si el contraste de estilos no convence, se borra
  // la carpeta /models/polyhaven y estas 4 lineas.
  ph_armchair: { url: '/models/polyhaven/ArmChair_01_1k.gltf', scale: 1.3, yOffset: 0, collidable: true, label: 'Sillon PH' },
  ph_coffee_table: { url: '/models/polyhaven/CoffeeTable_01_1k.gltf', scale: 1.3, yOffset: 0, collidable: true, label: 'Mesa ratona PH' },
  ph_sofa: { url: '/models/polyhaven/Sofa_01_1k.gltf', scale: 1.3, yOffset: 0, collidable: true, label: 'Sofa PH' },
  ph_shelf: { url: '/models/polyhaven/Shelf_01_1k.gltf', scale: 1.3, yOffset: 0, collidable: true, label: 'Estanteria PH' },

  // Personajes: una entrada por skin, derivada de SKINS. Todas comparten rig y los 27 clips,
  // así que cambiar de skin no toca nada de la animación.
  ...Object.fromEntries(SKINS.map((skin) => [skin, k(`characters/${skin}`, 1.0, false, skin)])),
};

// Helper para cambiar solo el archivo sin tocar código:
// assetsCatalog.chair.url = "/models/furniture/office-chair.glb"
