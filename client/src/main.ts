import type { Bounds, Player } from '@iso-meet/shared';
import { WORLD_SIZE, randomSkin, sanitizeName } from '@iso-meet/shared';
import * as THREE from 'three';
import { createSocket } from './multiplayer/network.js';
import { PlayerManager } from './multiplayer/playerManager.js';
import { OfficeManager } from './offices/officeManager.js';
import { Input } from './player/input.js';
import { Physics } from './player/physics.js';
import { PlayerVisual } from './player/PlayerVisual.js';
import { IsoCamera } from './rendering/camera.js';
import { World, createDefaultWorldConfig } from './world/world.js';
import { assetManager } from './assets/AssetManager.js';
import { Minimap } from './ui/minimap.js';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const joinScreen = document.getElementById('join-screen') as HTMLDivElement;
const nameInput = document.getElementById('name-input') as HTMLInputElement;
const btnEnter = document.getElementById('btn-enter') as HTMLButtonElement;
const joinError = document.getElementById('join-error') as HTMLParagraphElement;
const officePanel = document.getElementById('office-panel') as HTMLDivElement;
const officeNameEl = document.getElementById('office-name') as HTMLElement;
const officeOccupantsEl = document.getElementById(
  'office-occupants',
) as HTMLElement;
const btnMeet = document.getElementById('btn-meet') as HTMLButtonElement;
const btnLeaveOffice = document.getElementById(
  'btn-leave-office',
) as HTMLButtonElement;
const playerCountEl = document.getElementById('player-count') as HTMLElement;
const disconnectModal = document.getElementById(
  'disconnect-modal',
) as HTMLDivElement;
const btnReconnect = document.getElementById(
  'btn-reconnect',
) as HTMLButtonElement;

// Three setup — gráficos mejorados (sombras suaves + fog + materiales Standard)
const scene = new THREE.Scene();
// Fondo gris neutro y luz difusa: la escena tiene que leerse como una lámina
// isométrica de interiores, no como un exterior con cielo.
scene.background = new THREE.Color(0xd9dde2);
scene.fog = new THREE.Fog(0xd9dde2, 55, 105);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const cameraCtrl = new IsoCamera(window.innerWidth / window.innerHeight);

// luces — hemisferio cálido + sol direccional suave + puntos cálidos por sala (estilo imagen)
scene.add(new THREE.HemisphereLight(0xffffff, 0xc8cdd4, 0.75));
scene.add(new THREE.AmbientLight(0xfdfbf7, 0.45));
const dir = new THREE.DirectionalLight(0xfff8ee, 1.0);
dir.position.set(30, 55, 18);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.near = 1;
dir.shadow.camera.far = 120;
dir.shadow.camera.left = -30;
dir.shadow.camera.right = 30;
dir.shadow.camera.top = 30;
dir.shadow.camera.bottom = -30;
dir.shadow.bias = -0.0005;
scene.add(dir);
// luces puntuales cálidas por sala — derivadas de los bounds, no de posiciones fijas:
// mover o agregar una sala en offices.json no debe dejar la luz colgada en el vacío.
let officeLights: THREE.PointLight[] = [];
function rebuildOfficeLights(offices: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } }[]) {
  for (const pl of officeLights) scene.remove(pl);
  officeLights = [];
  for (const o of offices) {
    const pl = new THREE.PointLight(0xfff3d6, 14, 13, 2);
    pl.position.set((o.bounds.minX + o.bounds.maxX) / 2, 3.2, (o.bounds.minZ + o.bounds.maxZ) / 2);
    pl.castShadow = false;
    scene.add(pl);
    officeLights.push(pl);
  }
}

// FASE 8: preload de los 5 assets más usados (no bloquea, cachea para 20 sillas = 1 fetch)
// El personaje no se precarga: la skin la decide el server al entrar.
assetManager
  .preload(['chair_office', 'desk_office', 'monitor', 'keyboard', 'plant_big', 'rug_square', 'lamp_ceiling', 'credenza'])
  .catch(() => {});

// world (se crea tras join o fallback offline)
let world: World | null = null;
let worldConfig: any = createDefaultWorldConfig();
const officeMgr = new OfficeManager();
const minimap = new Minimap(document.getElementById('minimap') as HTMLCanvasElement);

// player local — separación STATE (physics/Player) vs VISUAL (PlayerVisual GLB)
const input = new Input();
const physics = new Physics();
let localVisual: PlayerVisual | null = null;
let localPlayer: Player | null = null;
let myColor = 0x4a90e2;

// multiplayer
const socket = createSocket();
const playerMgr = new PlayerManager(scene);

let joined = false;
let lastSend = 0;

function createWorld(cfg: any) {
  if (world) {
    world.dispose();
  }
  world = new World(cfg, scene);
  officeMgr.setOffices(cfg.offices ?? []);
  rebuildOfficeLights(cfg.offices ?? []);
  minimap.setWorld(cfg);
}

createWorld(worldConfig);

// local avatar — ahora low-poly GLB con fallback a cajas
function spawnLocal(p: Player) {
  localPlayer = p;
  physics.pos.set(p.position.x, p.position.y, p.position.z);
  myColor = p.color;
  localVisual = new PlayerVisual({
    name: p.name,
    color: p.color,
    position: physics.pos.clone(),
    skin: p.skin,
  });
  scene.add(localVisual.group);
  playerCountEl.textContent = `👥 ${1 + playerMgr.remotes.size}`;
}

// La ocupacion se deriva de las posiciones que ya tenemos de cada jugador, no de un
// handshake de eventos: el server descarta 'player:officeEnter' si su ultima posicion
// conocida (20Hz) todavia esta afuera, y ese enter se perdia para siempre.
function countOccupants(office: { bounds: Bounds }): number {
  let n = officeMgr.isInside(physics.pos, office.bounds) ? 1 : 0;
  for (const rp of playerMgr.remotes.values())
    if (officeMgr.isInside(rp.group.position, office.bounds)) n++;
  return n;
}

// office UI helpers
const occupantsLabel = (n: number) => `👥 ${n} persona(s) aquí`;
function showOfficePanel(office: any, count: number) {
  officeNameEl.textContent = office.name;
  officeOccupantsEl.textContent = occupantsLabel(count);
  // @ts-ignore dataset
  btnMeet.dataset.url = office.meetingUrl;
  officePanel.classList.remove('hidden');
}
function hideOfficePanel() {
  officePanel.classList.add('hidden');
}

// Debe correr sincrónico dentro del gesto del usuario (click o keydown) o el popup blocker lo corta.
function openMeet(url: string) {
  console.log('[meet] abriendo url=', url);
  if (!url) {
    alert('No hay URL configurada para esta sala');
    return;
  }
  const win = window.open(url, '_blank', 'noopener');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    // fallback: crear <a> visible en DOM
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

btnMeet.addEventListener('click', () => openMeet((btnMeet as any).dataset.url as string));

// E parado en la mesa de reuniones abre el Meet de esa sala.
const MEET_REACH = 3.4; // la mesa central creció con las salas de 16×16
const meetPrompt = document.getElementById('meet-prompt') as HTMLDivElement;
let meetInReach: string | null = null;
input.onInteract(() => {
  if (meetInReach) openMeet(meetInReach);
});
btnLeaveOffice.addEventListener('click', hideOfficePanel);

// join flow
function doJoin() {
  const raw = nameInput.value.trim();
  const name = sanitizeName(raw || 'guest');
  if (name.length < 1 || name.length > 16) {
    joinError.textContent = 'Nombre 1-16 caracteres';
    joinError.classList.remove('hidden');
    return;
  }
  joinError.classList.add('hidden');
  const status = document.getElementById('join-status') as HTMLElement;
  status.textContent = 'Conectando...';
  socket.emit('player:join', { name });
}
btnEnter.addEventListener('click', doJoin);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doJoin();
});

// socket events
socket.on('connect', () => {
  disconnectModal.classList.add('hidden');
  const status = document.getElementById('join-status') as HTMLElement;
  if (joined) status.textContent = '';
});

socket.on('disconnect', () => {
  disconnectModal.classList.remove('hidden');
});

btnReconnect.addEventListener('click', () => socket.connect());

socket.on('player:joined' as any, (data: any) => {
  joined = true;
  joinScreen.classList.add('hidden');
  worldConfig = data.world ?? createDefaultWorldConfig();
  // offices vienen dentro de world en nuestro server
  const offices = data.offices ?? worldConfig.offices ?? [];
  worldConfig.offices = offices;
  createWorld(worldConfig);
  spawnLocal(data.player);
  for (const p of data.players as Player[]) {
    if (p.id === data.player.id) continue;
    playerMgr.add(p);
  }
  playerCountEl.textContent = `👥 ${1 + playerMgr.remotes.size}`;
});

socket.on('player:joinedOther' as any, (data: any) => {
  playerMgr.add(data.player);
  playerCountEl.textContent = `👥 ${playerMgr.remotes.size + (joined ? 1 : 0)}`;
});

socket.on('player:left' as any, ({ playerId }: any) => {
  playerMgr.remove(playerId);
  playerCountEl.textContent = `👥 ${playerMgr.remotes.size + (joined ? 1 : 0)}`;
});

socket.on('player:moved' as any, (data: any) => {
  playerMgr.moved(data);
});

socket.on('error' as any, ({ message }: any) => {
  joinError.textContent = message;
  joinError.classList.remove('hidden');
});

// loop
let last = performance.now();
let animState: Player['animationState'] = 'idle';

function tick(now: number) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (joined && world && localVisual && localPlayer) {
    const move = { ...input.getMoveVector(), sprint: input.state.sprint };
    const moving = Math.hypot(move.x, move.z) > 0.01;

    physics.update(dt, move, input.state.jump, world);
    // el estado se lee DESPUÉS del step: sprinting lo define la física, no la tecla
    animState = !physics.onGround
      ? 'jump'
      : moving
        ? physics.sprinting
          ? 'sprint'
          : 'walk'
        : 'idle';
    localVisual.setAnimation(animState);
    localVisual.setPosition(physics.pos);
    // rotación hacia dirección de movimiento (lerp visual)
    if (moving) {
      const ang = Math.atan2(move.x, move.z);
      const cur = localVisual.group.rotation.y;
      let d = ang - cur;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      localVisual.setRotationY(cur + d * 0.2);
    }
    // la velocidad real (no la tecla) maneja el ritmo del ciclo de pasos
    localVisual.update(dt, {
      moving,
      onGround: physics.onGround,
      speed: Math.hypot(physics.vel.x, physics.vel.z),
    });

    // cámara
    cameraCtrl.update(physics.pos, dt);

    // oficinas
    const { entered, exited } = officeMgr.check({
      x: physics.pos.x,
      y: physics.pos.y,
      z: physics.pos.z,
    });
    if (entered) {
      socket.emit('player:officeEnter', { officeId: entered.id });
      showOfficePanel(entered, countOccupants(entered));
    }
    if (exited) {
      socket.emit('player:officeLeave', { officeId: exited.id });
      hideOfficePanel();
    }

    // Prompt de E: dentro de la sala Y parado en la mesa de reuniones.
    const current = officeMgr.getCurrent();
    // La cuenta se refresca cada frame: antes se calculaba solo en el frame de entrada y
    // quedaba clavada si el otro entraba despues.
    if (current && !officePanel.classList.contains('hidden')) {
      const txt = occupantsLabel(countOccupants(current));
      if (officeOccupantsEl.textContent !== txt) officeOccupantsEl.textContent = txt;
    }
    const spot = current ? world.meetingSpots.get(current.id) : undefined;
    const nearTable =
      !!spot && Math.hypot(physics.pos.x - spot.x, physics.pos.z - spot.z) < MEET_REACH;
    meetInReach = nearTable && current ? current.meetingUrl : null;
    meetPrompt.classList.toggle('hidden', !meetInReach);

    minimap.draw(physics.pos, playerMgr.remotes, officeMgr.currentId);

    // network send 20Hz — rotation viene del visual (separación State/Visual)
    if (now - lastSend > 50) {
      lastSend = now;
      socket.emit('player:move', {
        position: { x: physics.pos.x, y: physics.pos.y, z: physics.pos.z },
        rotation: localVisual.group.rotation.y,
        animationState: animState,
      });
    }
  } else if (!joined) {
    // cámara fija isométrica mirando al centro del mapa — NO orbitar (confundía WASD)
    cameraCtrl.target.set(WORLD_SIZE.width / 2, 0, WORLD_SIZE.depth / 2);
    const staticPos = cameraCtrl.target.clone().add(cameraCtrl.offset);
    cameraCtrl.camera.position.copy(staticPos);
    cameraCtrl.camera.lookAt(cameraCtrl.target);
  }

  playerMgr.update(now);
  renderer.render(scene, cameraCtrl.camera);
}
tick(performance.now());

window.addEventListener('resize', () => {
  cameraCtrl.resize(window.innerWidth / window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('wheel', (e) => cameraCtrl.wheel(e.deltaY), {
  passive: true,
});

// offline fallback: si no hay server en 2s y no joined, permitir jugar offline
setTimeout(() => {
  if (!joined) {
    const status = document.getElementById('join-status') as HTMLElement;
    if (!socket.connected)
      status.textContent = 'Modo offline (sin servidor). Puedes entrar igual.';
    // permitir join offline
    const orig = doJoin;
    // monkey patch: si socket no conectado, simular join local
    btnEnter.onclick = () => {
      if (socket.connected) return orig();
      const name = sanitizeName(nameInput.value.trim() || 'guest');
      joinScreen.classList.add('hidden');
      joined = true;
      const fake: Player = {
        id: 'local',
        name,
        color: 0x4a90e2,
        skin: randomSkin(),
        position: worldConfig.spawnPoints?.[0] ?? { x: 24, y: 1, z: 19 },
        rotation: 0,
        animationState: 'idle',
        currentOfficeId: null,
        inMeeting: false,
      };
      spawnLocal(fake);
    };
  }
}, 2000);
