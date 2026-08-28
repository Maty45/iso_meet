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
}

export type OfficeTheme = 'work' | 'meeting';

const HALF_PI = Math.PI / 2;
// alturas de apoyo (alto del GLB × scale del catálogo)
const DESK_TOP = 0.78;
const TABLE_TOP = 0.72;

// Toda sala tiene mesa central: es la zona donde se abre el Meet (ver meetingSpot()).
const common: Prop[] = [
  { type: 'carpet', dx: 0, dy: 0.02, dz: 0, scale: 2.5 },
  { type: 'plant', dx: -4.6, dy: 0, dz: -4.6 },
  { type: 'plant', dx: 4.6, dy: 0, dz: 4.6 },
  { type: 'lamp', dx: -2.6, dy: 2.2, dz: -2.6 },
  { type: 'lamp', dx: 2.6, dy: 2.2, dz: 2.6 },
  { type: 'lamp', dx: 0, dy: 2.2, dz: 0 },
];

const meetingLayout: Prop[] = [
  { type: 'meeting_table', dx: 0, dy: 0, dz: 0 },
  { type: 'laptop', dx: 0.6, dy: TABLE_TOP, dz: 0.2 },
  { type: 'chair', dx: -1.2, dy: 0, dz: -1.7 },
  { type: 'chair', dx: 1.2, dy: 0, dz: -1.7 },
  { type: 'chair', dx: -1.2, dy: 0, dz: 1.7, rotY: Math.PI },
  { type: 'chair', dx: 1.2, dy: 0, dz: 1.7, rotY: Math.PI },
  { type: 'chair', dx: -2.4, dy: 0, dz: 0, rotY: HALF_PI },
  { type: 'chair', dx: 2.4, dy: 0, dz: 0, rotY: -HALF_PI },
  { type: 'whiteboard', dx: 0, dy: 0.9, dz: -5.3 },
  { type: 'bookshelf', dx: -4.7, dy: 0, dz: -4.7 },
  { type: 'sofa', dx: 4.6, dy: 0, dz: -3.4, rotY: -HALF_PI },
  { type: 'trashcan', dx: -4.7, dy: 0, dz: 4.7 },
];

const workLayout: Prop[] = [
  { type: 'table', dx: 0, dy: 0, dz: 0 },
  { type: 'chair', dx: 0, dy: 0, dz: -1.7 },
  { type: 'chair', dx: 0, dy: 0, dz: 1.7, rotY: Math.PI },
  { type: 'chair', dx: -2.4, dy: 0, dz: 0, rotY: HALF_PI },
  { type: 'chair', dx: 2.4, dy: 0, dz: 0, rotY: -HALF_PI },
  // puestos de trabajo contra el muro del fondo
  { type: 'desk', dx: -3.4, dy: 0, dz: -4.6 },
  { type: 'monitor', dx: -3.4, dy: DESK_TOP, dz: -4.8 },
  { type: 'keyboard', dx: -3.4, dy: DESK_TOP, dz: -4.3 },
  { type: 'chair', dx: -3.4, dy: 0, dz: -3.4, rotY: Math.PI },
  { type: 'desk', dx: 3.4, dy: 0, dz: -4.6 },
  { type: 'computer', dx: 3.4, dy: DESK_TOP, dz: -4.8 },
  { type: 'chair', dx: 3.4, dy: 0, dz: -3.4, rotY: Math.PI },
  { type: 'desk', dx: -3.4, dy: 0, dz: 4.6, rotY: Math.PI },
  { type: 'laptop', dx: -3.4, dy: DESK_TOP, dz: 4.6, rotY: Math.PI },
  { type: 'chair', dx: -3.4, dy: 0, dz: 3.4 },
  { type: 'bookshelf', dx: 4.9, dy: 0, dz: 0, rotY: -HALF_PI },
  { type: 'cabinet', dx: 4.9, dy: 0, dz: 2.4, rotY: -HALF_PI },
  { type: 'picture', dx: -4.9, dy: 1.4, dz: 0, rotY: HALF_PI },
  { type: 'trashcan', dx: 4.6, dy: 0, dz: -4.6 },
];

// Sala 3 y 5 son de reunión; el resto, puestos de trabajo. Cambiarlo es tocar este mapa.
const THEMES: Record<string, OfficeTheme> = {
  'office-3': 'meeting',
  'office-5': 'meeting',
};

export function themeFor(officeId: string): OfficeTheme {
  return THEMES[officeId] ?? 'work';
}

/**
 * Props de una sala. `flip` rota el layout 180° para las salas cuya puerta está en el
 * muro minZ: así lo que va contra la pared del fondo (pizarrón, escritorios) queda
 * siempre enfrentado a la puerta y no tapándola. Es rotación, no espejo, para que las
 * sillas sigan mirando a la mesa.
 */
export function officeProps(theme: OfficeTheme, flip = false): Prop[] {
  const props = [...common, ...(theme === 'meeting' ? meetingLayout : workLayout)];
  if (!flip) return props;
  return props.map((p) => ({
    ...p,
    dx: -p.dx,
    dz: -p.dz,
    rotY: (p.rotY ?? 0) + Math.PI,
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
