export interface AssetDef {
  /** URL relativa a /public, ej. "/models/furniture/chair.glb" */
  url: string;
  /** Escala uniforme para normalizar modelos de distintas fuentes */
  scale?: number;
  /** Offset vertical para apoyar correctamente sobre suelo (evita flotar/enterrar) */
  yOffset?: number;
  /** Rotación Y inicial en radianes (para corregir orientación de fuente) */
  rotationY?: number;
  /** Si participa en colisiones grid (true = bloque sólido, false = decoración) */
  collidable?: boolean;
  /** Nombre humano para debug */
  label?: string;
}

export type AssetsCatalog = Record<string, AssetDef>;
