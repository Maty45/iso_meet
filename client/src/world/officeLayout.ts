import type { Bounds } from '@iso-meet/shared';
import { CORRIDOR_Z } from '@iso-meet/shared';

// Props relativos al centro de la sala: agregar una sala en config/offices.json
// alcanza para que se amueble sola, sin coordenadas absolutas a mano.
// dx/dz = offset desde el centro; dy = altura sobre el piso (el piso está en y=1).
export interface Prop {
  type: string;
  dx: number;
  dy: number;
  dz: number;
  rotY?: number;
  scale?: number;
  /** Recolorea materiales del GLB por nombre (wood, metal, carpet, plant...). */
  tint?: Record<string, number>;
}

export type OfficeTheme = 'dev' | 'design' | 'meeting' | 'games' | 'lounge';

/**
 * Contexto de la sala. Lo que va contra la pared se escribe `w(k)` en vez de un literal,
 * así la sala se re-amuebla sola si cambia de tamaño (pasó al ir de 12×12 a 16×16).
 */
export interface LayoutCtx {
  accent: number;
  half: number;
  /** w(k) = a k unidades del muro -Z/-X. Negar para el muro opuesto. */
  w: (k: number) => number;
}

const HALF_PI = Math.PI / 2;
const PI = Math.PI;

// Orientación: los muros opacos (con ventanas) son -Z y -X; los que miran a la cámara
// (+Z, +X) van translúcidos. Lo que va contra la pared se apoya en -Z / -X.
const BACK = 0; // apoyado en el muro -Z, mirando al interior
const LEFT = HALF_PI; // apoyado en el muro -X
const RIGHT = -HALF_PI; // apoyado en el muro +X
const FRONT = PI; // apoyado en el muro +Z

// Alturas de apoyo (alto del GLB × escala 2.6 del catálogo)
const DESK_TOP = 0.99;
const CREDENZA_TOP = 0.81;
const TABLE_TOP = 0.86;
const COFFEE_TOP = 0.6;

// Muebles blancos como en la referencia; el tono cálido queda para las mesas centrales.
const WHITE = { wood: 0xf1f0ec };
const DARK_WOOD = { wood: 0x6d4c3a, woodDark: 0x49321f };
const GREY_METAL = { metal: 0xb9bec4, metalMedium: 0x424a52 };

/** Un puesto de trabajo completo: escritorio + silla + monitor + teclado + mouse. */
function workstation(dx: number, dz: number, rotY: number, accent: number): Prop[] {
  const s = Math.sin(rotY);
  const c = Math.cos(rotY);
  // desplaza "hacia adelante" del escritorio según su rotación
  const fwd = (d: number): [number, number] => [dx + s * d, dz + c * d];
  const [mx, mz] = fwd(-0.2);
  const [kx, kz] = fwd(0.4);
  const [ox, oz] = fwd(0.42);
  const [cx, cz] = fwd(1.5);
  return [
    { type: 'desk_office', dx, dy: 0, dz, rotY, tint: { ...WHITE, ...GREY_METAL } },
    { type: 'monitor', dx: mx, dy: DESK_TOP, dz: mz, rotY },
    { type: 'keyboard', dx: kx, dy: DESK_TOP, dz: kz, rotY },
    { type: 'mouse', dx: ox + 0.45 * c, dy: DESK_TOP, dz: oz - 0.45 * s, rotY },
    {
      type: 'chair_office',
      dx: cx,
      dy: 0,
      dz: cz,
      rotY: rotY + PI,
      tint: { carpet: accent, metalMedium: 0x3c4248 },
    },
  ];
}

/** Lo que lleva toda sala: alfombra, luces de techo, plantas, cuadros y tacho. */
function common({ accent, w }: LayoutCtx): Prop[] {
  return [
    {
      type: 'rug_square',
      dx: 0,
      dy: 0.02,
      dz: 0,
      scale: 3.4,
      tint: { carpet: accent, carpetDarker: shade(accent, 0.75) },
    },
    { type: 'lamp_ceiling', dx: 0, dy: 2.5, dz: 0 },
    { type: 'lamp_ceiling', dx: w(3.6), dy: 2.5, dz: w(3.6) },
    { type: 'lamp_ceiling', dx: -w(3.6), dy: 2.5, dz: -w(3.6) },
    { type: 'lamp_ceiling', dx: w(3.6), dy: 2.5, dz: -w(3.6) },
    { type: 'lamp_ceiling', dx: -w(3.6), dy: 2.5, dz: w(3.6) },
    { type: 'plant_big', dx: w(1.0), dy: 0, dz: w(1.0), scale: 1.3 },
    { type: 'plant_big', dx: -w(1.0), dy: 0, dz: -w(1.0), scale: 1.15 },
    { type: 'picture', dx: w(0.25), dy: 1.7, dz: -2.2, rotY: LEFT, scale: 3.4 },
    { type: 'picture', dx: w(0.25), dy: 1.6, dz: 1.6, rotY: LEFT, scale: 2.6 },
    { type: 'lamp_wall', dx: w(0.3), dy: 2.0, dz: 4.4, rotY: LEFT },
    { type: 'trashcan', dx: -w(0.9), dy: 0, dz: w(0.9), scale: 1.2 },
  ];
}

const LAYOUTS: Record<OfficeTheme, (ctx: LayoutCtx) => Prop[]> = {
  // Desarrollo: cuatro puestos contra las paredes opacas + mesa compartida al centro.
  dev: ({ accent: a, w }): Prop[] => [
    ...workstation(-4.0, w(1.3), BACK, a),
    ...workstation(0.6, w(1.3), BACK, a),
    ...workstation(5.2, w(1.3), BACK, a),
    ...workstation(w(1.3), 3.6, LEFT, a),
    { type: 'table', dx: 0, dy: 0, dz: 0, rotY: 0, tint: WHITE },
    { type: 'laptop', dx: 0.5, dy: TABLE_TOP, dz: 0.1, rotY: FRONT },
    { type: 'chair_cushion', dx: -1.9, dy: 0, dz: 1.8, rotY: -0.4, tint: { carpet: a } },
    { type: 'chair_cushion', dx: 1.9, dy: 0, dz: 1.8, rotY: 0.4, tint: { carpet: a } },
    { type: 'credenza', dx: -w(0.6), dy: 0, dz: 0.8, rotY: RIGHT, tint: WHITE },
    { type: 'books', dx: -w(0.7), dy: CREDENZA_TOP, dz: 0.1, rotY: RIGHT, scale: 2.6 },
    { type: 'plant_1', dx: -w(0.7), dy: CREDENZA_TOP, dz: 1.7, scale: 1.4 },
    { type: 'shelf_low', dx: 4.6, dy: 1.9, dz: w(0.3), rotY: BACK, tint: WHITE },
    { type: 'shelf_low', dx: -4.6, dy: 1.9, dz: w(0.3), rotY: BACK, tint: WHITE },
    { type: 'cabinet_tall', dx: w(0.6), dy: 0, dz: -3.8, rotY: LEFT, tint: WHITE },
    { type: 'box', dx: 3.0, dy: 0, dz: -w(1.2), rotY: 0.6 },
    { type: 'box', dx: 4.2, dy: 0, dz: -w(1.9), rotY: -0.3 },
    { type: 'plant_3', dx: -2.8, dy: 0, dz: -w(1.0), scale: 1.6 },
    { type: 'coat_rack', dx: -w(1.1), dy: 0, dz: -w(2.6) },
  ],

  // Diseño: escritorio en L, un puesto lateral y mesa de revisión al centro.
  design: ({ accent: a, w }): Prop[] => [
    ...workstation(-4.6, w(1.3), BACK, a),
    {
      type: 'desk_corner',
      dx: 3.8,
      dy: 0,
      dz: w(1.6),
      rotY: BACK,
      tint: { ...WHITE, ...GREY_METAL },
    },
    { type: 'monitor', dx: 3.6, dy: DESK_TOP, dz: w(1.2), rotY: BACK },
    { type: 'laptop', dx: 5.0, dy: DESK_TOP, dz: w(2.8), rotY: RIGHT },
    {
      type: 'chair_office',
      dx: 3.4,
      dy: 0,
      dz: w(3.2),
      rotY: FRONT,
      tint: { carpet: a, metalMedium: 0x3c4248 },
    },
    ...workstation(w(1.3), -3.6, LEFT, a),
    { type: 'table', dx: 0, dy: 0, dz: 0, tint: WHITE },
    { type: 'whiteboard', dx: 0.7, dy: TABLE_TOP, dz: 0, scale: 0.8 },
    { type: 'chair_modern', dx: -2.1, dy: 0, dz: 0, rotY: LEFT, tint: { carpet: a } },
    { type: 'chair_modern', dx: 2.1, dy: 0, dz: 0, rotY: RIGHT, tint: { carpet: a } },
    { type: 'credenza', dx: -w(0.6), dy: 0, dz: 2.0, rotY: RIGHT, tint: WHITE },
    { type: 'plant_2', dx: -w(0.7), dy: CREDENZA_TOP, dz: 1.2, scale: 1.5 },
    { type: 'plant_1', dx: -w(0.7), dy: CREDENZA_TOP, dz: 2.8, scale: 1.5 },
    { type: 'shelf_low', dx: -1.6, dy: 1.95, dz: w(0.3), tint: WHITE },
    { type: 'shelf_low', dx: 1.6, dy: 1.95, dz: w(0.3), tint: WHITE },
    { type: 'coat_rack', dx: -w(1.1), dy: 0, dz: 4.6 },
    { type: 'plant_big', dx: 3.0, dy: 0, dz: -w(1.1), scale: 1.25 },
    { type: 'box', dx: -3.6, dy: 0, dz: -w(1.4), rotY: 0.4 },
  ],

  // Reuniones: mesa grande con ocho sillas, pizarrón, pantalla y rincón de café.
  meeting: ({ accent: a, w }): Prop[] => [
    { type: 'meeting_table', dx: 0, dy: 0, dz: 0, scale: 1.6, tint: WHITE },
    { type: 'laptop', dx: 1.0, dy: TABLE_TOP, dz: 0.3, rotY: FRONT },
    { type: 'chair_modern', dx: -2.2, dy: 0, dz: -2.5, tint: { carpet: a } },
    { type: 'chair_modern', dx: 0, dy: 0, dz: -2.5, tint: { carpet: a } },
    { type: 'chair_modern', dx: 2.2, dy: 0, dz: -2.5, tint: { carpet: a } },
    { type: 'chair_modern', dx: -2.2, dy: 0, dz: 2.5, rotY: FRONT, tint: { carpet: a } },
    { type: 'chair_modern', dx: 0, dy: 0, dz: 2.5, rotY: FRONT, tint: { carpet: a } },
    { type: 'chair_modern', dx: 2.2, dy: 0, dz: 2.5, rotY: FRONT, tint: { carpet: a } },
    { type: 'chair_modern', dx: -4.0, dy: 0, dz: 0, rotY: LEFT, tint: { carpet: a } },
    { type: 'chair_modern', dx: 4.0, dy: 0, dz: 0, rotY: RIGHT, tint: { carpet: a } },
    { type: 'whiteboard', dx: -3.2, dy: 1.7, dz: w(0.25) },
    { type: 'tv', dx: 3.2, dy: 1.8, dz: w(0.25) },
    { type: 'credenza', dx: 3.2, dy: 0, dz: w(0.55), tint: WHITE },
    { type: 'coffee_machine', dx: 2.4, dy: CREDENZA_TOP, dz: w(0.6), scale: 1.2 },
    { type: 'fridge', dx: 6.0, dy: 0, dz: w(0.7), rotY: BACK },
    { type: 'speaker', dx: w(0.6), dy: 0, dz: -4.8, rotY: LEFT },
    { type: 'speaker', dx: -w(0.6), dy: 0, dz: -4.8, rotY: RIGHT },
    { type: 'plant_big', dx: -w(1.1), dy: 0, dz: 3.2, scale: 1.2 },
    { type: 'side_table', dx: w(0.8), dy: 0, dz: -2.8, rotY: LEFT, tint: WHITE },
  ],

  // Juegos: TV grande, sillones, banquetas y una mesa redonda al centro.
  games: ({ accent: a, w }): Prop[] => [
    { type: 'table_round', dx: 0, dy: 0.35, dz: 0, scale: 1.3, tint: DARK_WOOD },
    { type: 'radio', dx: 0.3, dy: 0.35 + TABLE_TOP, dz: 0, scale: 1.4 },
    { type: 'stool', dx: -2.3, dy: 0, dz: -0.9, tint: { carpet: a } },
    { type: 'stool', dx: 2.3, dy: 0, dz: 0.9, tint: { carpet: a } },
    { type: 'stool', dx: 0, dy: 0, dz: 2.4, tint: { carpet: a } },
    { type: 'stool', dx: 0, dy: 0, dz: -2.4, rotY: FRONT, tint: { carpet: a } },
    { type: 'tv', dx: 0, dy: CREDENZA_TOP, dz: w(0.6), scale: 1.5 },
    { type: 'credenza', dx: 0, dy: 0, dz: w(0.55), tint: WHITE },
    { type: 'tv_retro', dx: -2.8, dy: CREDENZA_TOP, dz: w(0.6) },
    { type: 'credenza', dx: -2.8, dy: 0, dz: w(0.55), tint: WHITE },
    { type: 'speaker', dx: -5.0, dy: 0, dz: w(0.7) },
    { type: 'speaker', dx: 5.0, dy: 0, dz: w(0.7) },
    {
      type: 'sofa_long',
      dx: -w(1.25),
      dy: 0,
      dz: 0.6,
      rotY: RIGHT,
      tint: { carpet: a, carpetDarker: shade(a, 0.8) },
    },
    { type: 'pillow', dx: -w(1.35), dy: 0.65, dz: -0.6, rotY: RIGHT },
    { type: 'armchair', dx: w(0.9), dy: 0, dz: 1.8, rotY: LEFT, tint: { carpet: a } },
    { type: 'armchair', dx: w(0.9), dy: 0, dz: -1.8, rotY: LEFT, tint: { carpet: a } },
    { type: 'bear', dx: w(1.2), dy: 0, dz: 4.4, rotY: 0.5, scale: 1.6 },
    { type: 'fridge', dx: -w(1.0), dy: 0, dz: w(1.2), rotY: RIGHT },
    { type: 'shelf_low', dx: -4.6, dy: 1.9, dz: w(0.3), tint: WHITE },
    { type: 'shelf_low', dx: 4.6, dy: 1.9, dz: w(0.3), tint: WHITE },
    { type: 'cabinet_tall', dx: w(0.6), dy: 0, dz: -4.6, rotY: LEFT, tint: WHITE },
  ],

  // Lounge: sofás enfrentados, mesa ratona, café y plantas.
  // PILOTO: las piezas protagónicas son Poly Haven (PBR) y el resto sigue siendo Kenney,
  // para poder comparar los dos estilos en la misma sala. El tint por material no aplica
  // a las PH: sus materiales son texturados, no colores planos.
  lounge: ({ accent: a, w }): Prop[] => [
    { type: 'ph_coffee_table', dx: 0, dy: 0, dz: 0 },
    { type: 'books', dx: 0.2, dy: COFFEE_TOP, dz: 0, scale: 2.4 },
    { type: 'ph_sofa', dx: 0, dy: 0, dz: -2.8, rotY: BACK },
    {
      type: 'sofa_design',
      dx: 0,
      dy: 0,
      dz: 2.8,
      rotY: FRONT,
      tint: { carpet: shade(a, 1.15), carpetDarker: a },
    },
    { type: 'pillow_long', dx: -1.2, dy: 0.65, dz: -2.7, rotY: BACK },
    { type: 'pillow', dx: 1.2, dy: 0.62, dz: 2.7, rotY: FRONT },
    { type: 'ph_armchair', dx: -4.4, dy: 0, dz: 0, rotY: LEFT },
    { type: 'ph_armchair', dx: 4.4, dy: 0, dz: 0, rotY: RIGHT },
    { type: 'side_table', dx: w(0.7), dy: 0, dz: -2.4, rotY: LEFT, tint: WHITE },
    { type: 'lamp_floor', dx: w(0.8), dy: 0, dz: 3.2 },
    { type: 'lamp_floor', dx: -w(0.8), dy: 0, dz: -3.2 },
    { type: 'credenza', dx: 3.4, dy: 0, dz: w(0.55), tint: WHITE },
    { type: 'coffee_machine', dx: 2.8, dy: CREDENZA_TOP, dz: w(0.6), scale: 1.2 },
    { type: 'plant_2', dx: 4.2, dy: CREDENZA_TOP, dz: w(0.6), scale: 1.5 },
    { type: 'fridge', dx: -3.4, dy: 0, dz: w(0.7), rotY: BACK },
    { type: 'ph_shelf', dx: -6.0, dy: 0, dz: w(0.4), rotY: BACK },
    { type: 'stool', dx: -5.4, dy: 0, dz: w(1.8), tint: { carpet: a } },
    { type: 'stool', dx: -6.4, dy: 0, dz: w(1.8), tint: { carpet: a } },
    { type: 'plant_big', dx: -w(1.1), dy: 0, dz: 3.6, scale: 1.3 },
    { type: 'coat_rack', dx: w(1.1), dy: 0, dz: -4.8 },
  ],
};

// Un tema por sala; si aparece una sala nueva, cae en 'dev'.
const THEMES: Record<string, OfficeTheme> = {
  'office-1': 'dev',
  'office-2': 'design',
  'office-3': 'meeting',
  'office-4': 'games',
  'office-5': 'lounge',
};

export function themeFor(officeId: string): OfficeTheme {
  return THEMES[officeId] ?? 'dev';
}

/**
 * Props de una sala. `flip` rota el layout 180° para las salas cuya puerta está en el
 * muro minZ: así lo que va contra la pared del fondo queda siempre enfrentado a la
 * puerta y no tapándola. Es rotación, no espejo, para que las sillas sigan mirando bien.
 */
export function officeProps(
  theme: OfficeTheme,
  flip = false,
  accent = 0xc9ccd2,
  half = 7.5,
): Prop[] {
  const ctx: LayoutCtx = { accent, half, w: (k: number) => -(half - k) };
  const props = [...common(ctx), ...LAYOUTS[theme](ctx)];
  if (!flip) return props;
  return props.map((p) => ({
    ...p,
    dx: -p.dx,
    dz: -p.dz,
    rotY: (p.rotY ?? 0) + PI,
  }));
}

/** Media extensión del interior de la sala (las paredes ocupan su propia celda). */
export function interiorHalf(b: Bounds): number {
  return (b.maxX - (b.minX + 1)) / 2;
}

/**
 * Centro del interior de la sala = mesa central = zona donde se abre el Meet con E.
 * Las paredes ocupan su propia celda, así que el interior va de minX+1 a maxX:
 * usar (minX+maxX)/2 dejaría todo corrido medio bloque contra la pared norte.
 */
export function meetingSpot(b: Bounds): { x: number; z: number } {
  return { x: (b.minX + 1 + b.maxX) / 2, z: (b.minZ + 1 + b.maxZ) / 2 };
}

/** Las salas debajo del pasillo tienen la puerta en minZ: su layout va rotado. */
export function isFlipped(b: Bounds): boolean {
  return (b.minZ + b.maxZ) / 2 > CORRIDOR_Z.max;
}

/** Aclara (f>1) u oscurece (f<1) un color hex, para derivar tonos del acento. */
function shade(hex: number, f: number): number {
  const ch = (sh: number) =>
    Math.max(0, Math.min(255, Math.round(((hex >> sh) & 0xff) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
