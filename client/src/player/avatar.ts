import * as THREE from 'three';

export function createAvatar(color: number): THREE.Group {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x3f51b5 });
  const armMat = new THREE.MeshLambertMaterial({ color });

  // cuerpo 0.6x0.8x0.3
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), bodyMat);
  body.position.y = 1.0;
  g.add(body);

  // cabeza 0.5
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
  head.position.y = 1.65;
  g.add(head);

  // brazos
  const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
  const lArm = new THREE.Mesh(armGeo, armMat);
  lArm.position.set(-0.38, 1.0, 0);
  g.add(lArm);
  const rArm = new THREE.Mesh(armGeo, armMat);
  rArm.position.set(0.38, 1.0, 0);
  g.add(rArm);

  // piernas
  const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const lLeg = new THREE.Mesh(legGeo, legMat);
  lLeg.position.set(-0.15, 0.35, 0);
  g.add(lLeg);
  const rLeg = new THREE.Mesh(legGeo, legMat);
  rLeg.position.set(0.15, 0.35, 0);
  g.add(rLeg);

  // nametag sprite canvas
  return g;
}

export interface NametagOptions {
  width?: number;
  fontSize?: number;
  background?: string;
  maxChars?: number;
}

// Sirve para los nombres sobre los jugadores y para los carteles sobre las puertas.
export function createNametag(
  name: string,
  opts: NametagOptions = {},
): THREE.Sprite {
  const {
    width = 256,
    fontSize = 28,
    background = 'rgba(0,0,0,0.6)',
    maxChars = 24,
  } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${fontSize}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.slice(0, maxChars), canvas.width / 2, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 0.55, 1);
  sprite.position.y = 2.4;
  return sprite;
}
