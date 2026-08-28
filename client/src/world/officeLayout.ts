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

const HALF_PI = Math.PI / 2;
const PI = Math.PI;

// Orientación: los muros opacos (con ventanas) son -Z y -X; los que miran a la cámara
// (+Z, +X) van translúcidos. Lo que va contra la pared se apoya en -Z / -X.
const BACK = 0; // apoyado en el muro -Z, mirando al interior
const LEFT = HALF_PI; // apoyado en el muro -X
const RIGHT = -HALF_PI; // apoyado en el muro +X
const FRONT = PI; // apoyado en el muro +Z

// Alturas de apoyo (alto del GLB × escala 2.0 del catálogo)
const DESK_TOP = 0.76;
const CREDENZA_TOP = 0.62;
const TABLE_TOP = 0.66;
const COFFEE_TOP = 0.46;

// Muebles blancos como en la referencia; el tono cálido queda para el escritorio central.
const WHITE = { wood: 0xf1f0ec };
const DARK_WOOD = { wood: 0x6d4c3a, woodDark: 0x49321f };
const GREY_METAL = { metal: 0xb9bec4, metalMedium: 0x424a52 };

/** Un puesto de trabajo completo: escritorio + silla + monitor + teclado + mouse. */
function workstation(dx: number, dz: number, rotY: number, accent: number): Prop[] {
  const s = Math.sin(rotY);
  const c = Math.cos(rotY);
  // desplaza "hacia adelante" del escritorio según su rotación
  const fwd = (d: number): [number, number] => [dx + s * d, dz + c * d];
  const [mx, mz] = fwd(-0.15);
  const [kx, kz] = fwd(0.3);
  const [ox, oz] = fwd(0.32);
  const [cx, cz] = fwd(1.15);
  return [
    { type: 'desk_office', dx, dy: 0, dz, rotY, tint: { ...WHITE, ...GREY_METAL } },
    { type: 'monitor', dx: mx, dy: DESK_TOP, dz: mz, rotY },
    { type: 'keyboard', dx: kx, dy: DESK_TOP, dz: kz, rotY },
    { type: 'mouse', dx: ox + 0.35 * c, dy: DESK_TOP, dz: oz - 0.35 * s, rotY },
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
function common(accent: number): Prop[] {
  return [
    { type: 'rug_square', dx: 0, dy: 0.02, dz: 0, scale: 3.2, tint: { carpet: accent, carpetDarker: shade(accent, 0.75) } },
    { type: 'lamp_ceiling', dx: 0, dy: 2.5, dz: 0 },
    { type: 'lamp_ceiling', dx: -3.0, dy: 2.5, dz: -3.0 },
    { type: 'lamp_ceiling', dx: 3.0, dy: 2.5, dz: 3.0 },
    { type: 'plant_big', dx: -4.6, dy: 0, dz: -4.6, scale: 1.3 },
    { type: 'plant_big', dx: 4.5, dy: 0, dz: 4.3, scale: 1.15 },
    { type: 'picture', dx: -5.3, dy: 1.55, dz: -1.6, rotY: LEFT, scale: 3 },
    { type: 'picture', dx: -5.3, dy: 1.5, dz: 1.4, rotY: LEFT, scale: 2.4 },
    { type: 'lamp_wall', dx: -5.25, dy: 1.9, dz: 3.6, rotY: LEFT },
    { type: 'trashcan', dx: 4.7, dy: 0, dz: -4.7, scale: 1.2 },
  ];
}

const LAYOUTS: Record<OfficeTheme, (accent: number) => Prop[]> = {
  // Desarrollo: tres puestos contra las paredes opacas + mesa compartida al centro.
  dev: (a): Prop[] => [
    ...workstation(-3.2, -4.5, BACK, a),
    ...workstation(1.2, -4.5, BACK, a),
    ...workstation(-4.5, 2.6, LEFT, a),
    { type: 'table', dx: 0, dy: 0, dz: 0, rotY: 0, tint: WHITE },
    { type: 'laptop', dx: 0.4, dy: TABLE_TOP, dz: 0.1, rotY: FRONT },
    { type: 'chair_cushion', dx: -1.5, dy: 0, dz: 1.3, rotY: -0.4, tint: { carpet: a } },
    { type: 'chair_cushion', dx: 1.5, dy: 0, dz: 1.3, rotY: 0.4, tint: { carpet: a } },
    { type: 'credenza', dx: 4.6, dy: 0, dz: 0.6, rotY: RIGHT, tint: WHITE },
    { type: 'books', dx: 4.5, dy: CREDENZA_TOP, dz: 0.1, rotY: RIGHT, scale: 2.6 },
    { type: 'plant_1', dx: 4.5, dy: CREDENZA_TOP, dz: 1.4, scale: 1.4 },
    { type: 'shelf_low', dx: 3.4, dy: 1.7, dz: -5.25, rotY: BACK, tint: WHITE },
    { type: 'cabinet_tall', dx: -5.15, dy: 0, dz: -3.4, rotY: LEFT, tint: WHITE },
    { type: 'box', dx: 2.2, dy: 0, dz: 4.4, rotY: 0.6 },
    { type: 'plant_3', dx: -2.0, dy: 0, dz: 4.7, scale: 1.6 },
  ],

  // Diseño: puestos con escritorio en L, tablero de dibujo y mucha planta.
  design: (a): Prop[] => [
    ...workstation(-3.6, -4.4, BACK, a),
    { type: 'desk_corner', dx: 3.6, dy: 0, dz: -4.0, rotY: BACK, tint: { ...WHITE, ...GREY_METAL } },
    { type: 'monitor', dx: 3.4, dy: DESK_TOP, dz: -4.4 },
    { type: 'laptop', dx: 4.4, dy: DESK_TOP, dz: -3.0, rotY: RIGHT },
    { type: 'chair_office', dx: 3.2, dy: 0, dz: -2.9, rotY: FRONT, tint: { carpet: a, metalMedium: 0x3c4248 } },
    { type: 'table', dx: 0, dy: 0, dz: 0, tint: WHITE },
    { type: 'whiteboard', dx: 0.6, dy: TABLE_TOP, dz: 0, scale: 0.7 },
    { type: 'chair_modern', dx: -1.6, dy: 0, dz: 0, rotY: LEFT, tint: { carpet: a } },
    { type: 'chair_modern', dx: 1.6, dy: 0, dz: 0, rotY: RIGHT, tint: { carpet: a } },
    { type: 'credenza', dx: -5.1, dy: 0, dz: 1.4, rotY: LEFT, tint: WHITE },
    { type: 'plant_2', dx: -5.0, dy: CREDENZA_TOP, dz: 0.7, scale: 1.5 },
    { type: 'plant_1', dx: -5.0, dy: CREDENZA_TOP, dz: 2.1, scale: 1.5 },
    { type: 'shelf_low', dx: -1.5, dy: 1.75, dz: -5.25, tint: WHITE },
    { type: 'coat_rack', dx: 4.9, dy: 0, dz: 3.6 },
    { type: 'plant_big', dx: 2.4, dy: 0, dz: 4.6, scale: 1.25 },
  ],

  // Reuniones: mesa grande con seis sillas, pizarrón y pantalla.
  meeting: (a): Prop[] => [
    { type: 'meeting_table', dx: 0, dy: 0, dz: 0, scale: 1.35, tint: WHITE },
    { type: 'laptop', dx: 0.8, dy: TABLE_TOP, dz: 0.3, rotY: FRONT },
    { type: 'chair_modern', dx: -1.5, dy: 0, dz: -1.9, tint: { carpet: a } },
    { type: 'chair_modern', dx: 1.5, dy: 0, dz: -1.9, tint: { carpet: a } },
    { type: 'chair_modern', dx: -1.5, dy: 0, dz: 1.9, rotY: FRONT, tint: { carpet: a } },
    { type: 'chair_modern', dx: 1.5, dy: 0, dz: 1.9, rotY: FRONT, tint: { carpet: a } },
    { type: 'chair_modern', dx: -3.0, dy: 0, dz: 0, rotY: LEFT, tint: { carpet: a } },
    { type: 'chair_modern', dx: 3.0, dy: 0, dz: 0, rotY: RIGHT, tint: { carpet: a } },
    { type: 'whiteboard', dx: -2.2, dy: 1.5, dz: -5.25 },
    { type: 'tv', dx: 2.6, dy: 1.6, dz: -5.25 },
    { type: 'credenza', dx: 2.6, dy: 0, dz: -5.05, tint: WHITE },
    { type: 'coffee_machine', dx: 2.0, dy: CREDENZA_TOP, dz: -5.0, scale: 1.2 },
    { type: 'speaker', dx: -5.1, dy: 0, dz: -4.4, rotY: LEFT },
    { type: 'plant_big', dx: 5.0, dy: 0, dz: -2.4, scale: 1.2 },
  ],

  // Juegos: TV grande, sillones, banquetas y una mesa redonda al centro.
  games: (a): Prop[] => [
    { type: 'table_round', dx: 0, dy: 0.27, dz: 0, scale: 1.2, tint: DARK_WOOD },
    { type: 'radio', dx: 0.3, dy: 0.27 + TABLE_TOP, dz: 0, scale: 1.4 },
    { type: 'stool', dx: -1.7, dy: 0, dz: -0.6, tint: { carpet: a } },
    { type: 'stool', dx: 1.7, dy: 0, dz: 0.6, tint: { carpet: a } },
    { type: 'stool', dx: 0, dy: 0, dz: 1.8, tint: { carpet: a } },
    { type: 'tv', dx: 0, dy: CREDENZA_TOP, dz: -5.0, scale: 1.4 },
    { type: 'credenza', dx: 0, dy: 0, dz: -5.05, tint: WHITE },
    { type: 'tv_retro', dx: -1.9, dy: CREDENZA_TOP, dz: -5.0 },
    { type: 'speaker', dx: -3.1, dy: 0, dz: -4.9 },
    { type: 'speaker', dx: 3.1, dy: 0, dz: -4.9 },
    { type: 'sofa_long', dx: 4.4, dy: 0, dz: 0.4, rotY: RIGHT, tint: { carpet: a, carpetDarker: shade(a, 0.8) } },
    { type: 'pillow', dx: 4.3, dy: 0.5, dz: -0.5, rotY: RIGHT },
    { type: 'armchair', dx: -4.4, dy: 0, dz: 1.2, rotY: LEFT, tint: { carpet: a } },
    { type: 'bear', dx: -4.6, dy: 0, dz: 3.2, rotY: 0.5, scale: 1.6 },
    { type: 'fridge', dx: 4.9, dy: 0, dz: -4.4, rotY: RIGHT },
    { type: 'shelf_low', dx: -3.4, dy: 1.7, dz: -5.25, tint: WHITE },
  ],

  // Lounge: sofás enfrentados, mesa ratona, café y plantas.
  lounge: (a): Prop[] => [
    { type: 'table_coffee', dx: 0, dy: 0, dz: 0, tint: DARK_WOOD },
    { type: 'books', dx: 0.2, dy: COFFEE_TOP, dz: 0, scale: 2.4 },
    { type: 'sofa_long', dx: 0, dy: 0, dz: -2.2, rotY: BACK, tint: { carpet: a, carpetDarker: shade(a, 0.8) } },
    { type: 'sofa_design', dx: 0, dy: 0, dz: 2.2, rotY: FRONT, tint: { carpet: shade(a, 1.15), carpetDarker: a } },
    { type: 'pillow_long', dx: -0.9, dy: 0.5, dz: -2.1, rotY: BACK },
    { type: 'pillow', dx: 0.9, dy: 0.48, dz: 2.1, rotY: FRONT },
    { type: 'armchair', dx: -3.4, dy: 0, dz: 0, rotY: LEFT, tint: { carpet: a } },
    { type: 'armchair', dx: 3.4, dy: 0, dz: 0, rotY: RIGHT, tint: { carpet: a } },
    { type: 'side_table', dx: -4.8, dy: 0, dz: -1.8, rotY: LEFT, tint: WHITE },
    { type: 'lamp_floor', dx: -4.9, dy: 0, dz: 2.4 },
    { type: 'credenza', dx: 2.6, dy: 0, dz: -5.05, tint: WHITE },
    { type: 'coffee_machine', dx: 2.0, dy: CREDENZA_TOP, dz: -5.0, scale: 1.2 },
    { type: 'plant_2', dx: 3.3, dy: CREDENZA_TOP, dz: -5.0, scale: 1.5 },
    { type: 'fridge', dx: -2.6, dy: 0, dz: -5.0, rotY: BACK },
    { type: 'shelf_low', dx: 0, dy: 1.75, dz: -5.25, tint: WHITE },
    { type: 'plant_big', dx: 4.8, dy: 0, dz: 2.6, scale: 1.3 },
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
): Prop[] {
  const props = [...common(accent), ...LAYOUTS[theme](accent)];
  if (!flip) return props;
  return props.map((p) => ({
    ...p,
    dx: -p.dx,
    dz: -p.dz,
    rotY: (p.rotY ?? 0) + PI,
  }));
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
