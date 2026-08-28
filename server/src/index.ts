import { createServer } from 'http';
import type {
  ClientToServerEvents,
  InterServerEvents,
  Player as PlayerType,
  ServerToClientEvents,
  SocketData,
  WorldConfig,
} from '@iso-meet/shared';
import {
  NETWORK,
  WORLD_SIZE,
  joinSchema,
  moveSchema,
  officeIdSchema,
  sanitizeName,
} from '@iso-meet/shared';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { loadOffices } from './offices/officeRegistry.js';
import { Player } from './players/player.js';
import { Room } from './rooms/room.js';

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
        frameAncestors: ["'none'"],
      },
    },
  }),
);
app.use(cors({ origin: FRONTEND_URL === '*' ? true : FRONTEND_URL }));
app.use(express.json());
app.get('/health', (_req, res) =>
  res.json({ ok: true, uptime: process.uptime() }),
);

const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: FRONTEND_URL === '*' ? true : FRONTEND_URL },
  maxHttpBufferSize: 1e6,
});

const offices = loadOffices();

// mundo estático — salas pequeñas estilo isométrico de la imagen (paredes + muebles por oficina)
function buildWorldConfig(): WorldConfig {
  const size = {
    width: WORLD_SIZE.width,
    depth: WORLD_SIZE.depth,
    height: WORLD_SIZE.height,
  };
  const blocks: WorldConfig['blocks'] = [];

  const push = (x: number, y: number, z: number, type: WorldConfig['blocks'][number]['type']) => {
    if (x >= 0 && x < size.width && z >= 0 && z < size.depth && y >= 0 && y < size.height) {
      blocks.push({ x, y, z, type });
    }
  };

  // paredes perimetrales (piedra)
  for (let x = 0; x < size.width; x++)
    for (let y = 1; y <= 3; y++) {
      push(x, y, 0, 'stone');
      push(x, y, size.depth - 1, 'stone');
    }
  for (let z = 0; z < size.depth; z++)
    for (let y = 1; y <= 3; y++) {
      push(0, y, z, 'stone');
      push(size.width - 1, y, z, 'stone');
    }

  // paredes de cada oficina (salas pequeñas con puerta al centro)
  // puerta de 2 bloques centrada en el lado que mira al centro del mapa
  const officeWallType = (id: string) => {
    if (id === 'office-1') return 'wall_pink' as const;
    if (id === 'office-2') return 'wood' as const;
    if (id === 'office-3') return 'wall_purple' as const;
    return 'shelf' as const;
  };
  for (const office of offices) {
    const { minX, maxX, minZ, maxZ } = office.bounds;
    const wall = officeWallType(office.id);
    const centerZ = (minZ + maxZ) / 2;
    const isTop = centerZ < 20;
    const doorWallZ = isTop ? maxZ : minZ;
    const windowWallZ = isTop ? minZ : maxZ;
    const doorXa = Math.floor((minX + maxX) / 2);
    const winX = minX + 2;

    for (let y = 1; y <= 3; y++) {
      // muro norte (z=minZ)
      for (let x = minX; x <= maxX; x++) {
        const isDoorGap = doorWallZ === minZ && y <= 2 && (x === doorXa || x === doorXa + 1);
        if (isDoorGap) { if (y === 3) push(x, y, minZ, wall); continue; }
        const isWindow = windowWallZ === minZ && y === 2 && (x === winX || x === winX + 1) && office.id !== 'office-4';
        if (isWindow) { push(x, y, minZ, 'glass'); continue; }
        push(x, y, minZ, wall);
      }
      // muro sur (z=maxZ)
      for (let x = minX; x <= maxX; x++) {
        const isDoorGap = doorWallZ === maxZ && y <= 2 && (x === doorXa || x === doorXa + 1);
        if (isDoorGap) { if (y === 3) push(x, y, maxZ, wall); continue; }
        const isWindow = windowWallZ === maxZ && y === 2 && (x === winX || x === winX + 1) && office.id !== 'office-4';
        if (isWindow) { push(x, y, maxZ, 'glass'); continue; }
        push(x, y, maxZ, wall);
      }
      // muros este/oeste (evita esquinas duplicadas)
      for (let z = minZ + 1; z <= maxZ - 1; z++) {
        push(minX, y, z, wall);
        push(maxX, y, z, wall);
      }
    }

    // muebles interiores — salas agrandadas 12×12, más espacio como imagen
    if (office.id === 'office-1') {
      // Sala Desarrollo — mesa central con árbol + 6 sillas + escritorios
      push(7, 1, 7, 'desk'); push(8, 1, 7, 'desk'); push(7, 1, 8, 'desk'); push(8, 1, 8, 'desk');
      push(7, 2, 7, 'plant');
      push(7, 1, 6, 'wool'); push(8, 1, 6, 'wool'); push(6, 1, 7, 'wool'); push(9, 1, 7, 'wool'); push(7, 1, 9, 'wool'); push(8, 1, 9, 'wool');
      push(4, 1, 4, 'desk'); push(4, 2, 4, 'monitor'); push(4, 1, 5, 'desk');
      push(3, 1, 3, 'shelf'); push(3, 2, 3, 'shelf'); push(12, 1, 3, 'shelf'); push(12, 2, 3, 'shelf');
      push(6, 3, 7, 'glass'); push(9, 3, 8, 'glass'); push(5, 3, 10, 'glass');
      push(12, 1, 12, 'plant');
    } else if (office.id === 'office-2') {
      // Sala Diseño — sala reuniones grande TV + sofá, ahora centrada en 24,8
      push(22, 1, 7, 'desk'); push(23, 1, 7, 'desk'); push(24, 1, 7, 'desk'); push(25, 1, 7, 'desk');
      push(22, 1, 9, 'desk'); push(23, 1, 9, 'desk'); push(24, 1, 9, 'desk');
      push(22, 1, 6, 'wool'); push(24, 1, 6, 'wool'); push(26, 1, 7, 'wool'); push(22, 1, 10, 'wool'); push(24, 1, 10, 'wool');
      push(29, 2, 7, 'monitor'); push(29, 2, 8, 'monitor'); push(29, 3, 7, 'glass');
      push(19, 1, 4, 'wool'); push(20, 1, 4, 'wool');
      push(19, 1, 3, 'shelf'); push(19, 2, 3, 'shelf'); push(19, 3, 3, 'shelf');
      push(28, 1, 12, 'plant'); push(26, 1, 3, 'plant');
    } else if (office.id === 'office-3') {
      // Sala Reuniones — pizarrón + mesas + piano
      push(4, 1, 20, 'shelf'); push(4, 2, 20, 'shelf'); push(4, 3, 20, 'shelf');
      push(7, 1, 20, 'desk'); push(8, 1, 20, 'desk'); push(7, 1, 21, 'desk');
      push(10, 1, 25, 'desk'); push(11, 1, 25, 'desk'); push(10, 1, 26, 'desk');
      push(7, 1, 19, 'wool'); push(11, 1, 26, 'wool'); push(6, 1, 22, 'wool');
      push(11, 1, 27, 'desk'); push(11, 2, 27, 'monitor');
      push(13, 1, 20, 'shelf'); push(13, 2, 20, 'shelf'); push(13, 1, 27, 'shelf'); push(13, 2, 27, 'shelf');
      push(3, 1, 28, 'plant'); push(12, 1, 28, 'plant');
    } else if (office.id === 'office-4') {
      // Sala Juegos — 2 workstations amplias + librería arco
      push(21, 1, 21, 'desk'); push(22, 1, 21, 'desk'); push(23, 1, 21, 'desk'); push(24, 1, 21, 'desk');
      push(21, 2, 21, 'monitor'); push(23, 2, 21, 'monitor');
      push(21, 1, 26, 'desk'); push(22, 1, 26, 'desk'); push(23, 1, 26, 'desk'); push(24, 1, 26, 'desk');
      push(24, 2, 26, 'monitor');
      push(21, 1, 22, 'wool'); push(23, 1, 22, 'wool'); push(21, 1, 27, 'wool'); push(23, 1, 27, 'wool');
      push(29, 1, 20, 'shelf'); push(29, 2, 20, 'shelf'); push(29, 3, 20, 'shelf');
      push(29, 1, 27, 'shelf'); push(29, 2, 27, 'shelf'); push(29, 3, 27, 'shelf');
      push(26, 1, 20, 'wood'); push(27, 2, 20, 'wood'); push(28, 3, 20, 'wood');
      push(21, 1, 28, 'plant'); push(27, 1, 22, 'plant');
    }
  }

  // decoración central — alfombra/plantas entre oficinas (estilo pasillo con escaleras)
  push(14, 1, 14, 'plant'); push(15, 1, 15, 'plant');
  push(25, 1, 14, 'plant'); push(14, 1, 25, 'plant');

  return { size, blocks, offices, spawnPoints: [{ x: 16, y: 1, z: 16 }] };
}

const worldConfig = buildWorldConfig();
const room = new Room(offices, worldConfig);

const COLORS = [
  0x4a90e2, 0xe94e77, 0x50c878, 0xffb347, 0x9b59b6, 0x1abc9c, 0xf39c12,
  0xe74c3c,
];
let colorIdx = 0;

function validatePosition(
  pos: { x: number; y: number; z: number },
  prev: { x: number; y: number; z: number } | null,
): boolean {
  if (
    !Number.isFinite(pos.x) ||
    !Number.isFinite(pos.y) ||
    !Number.isFinite(pos.z)
  )
    return false;
  if (
    pos.x < -5 ||
    pos.x > WORLD_SIZE.width + 5 ||
    pos.z < -5 ||
    pos.z > WORLD_SIZE.depth + 5 ||
    pos.y < -2 ||
    pos.y > 20
  )
    return false;
  if (prev) {
    const d = Math.hypot(pos.x - prev.x, pos.y - prev.y, pos.z - prev.z);
    // 50ms a 6u/s => ~0.3, margen 2.5 (salto/teleport inicial + jitter spawn)
    if (d > 2.5) return false;
  }
  return true;
}

io.on('connection', (socket) => {
  console.log(`[io] connected ${socket.id}`);

  socket.on('player:join', (data) => {
    if (room.players.has(socket.id)) {
      socket.emit('error', {
        code: 'ALREADY_JOINED',
        message: 'Ya estás en la sala',
      });
      return;
    }
    if (room.players.size >= NETWORK.maxPlayersPerRoom) {
      socket.emit('error', { code: 'ROOM_FULL', message: 'Sala llena' });
      return;
    }
    const parsed = joinSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('error', {
        code: 'INVALID_NAME',
        message: 'Nombre inválido (1-16 alfanumérico)',
      });
      return;
    }
    const name = sanitizeName(parsed.data.name);
    const color = COLORS[colorIdx++ % COLORS.length];
    const spawn = worldConfig.spawnPoints[0] ?? { x: 20, y: 1, z: 20 };
    const pos = {
      x: spawn.x + (Math.random() - 0.5) * 2,
      y: spawn.y,
      z: spawn.z + (Math.random() - 0.5) * 2,
    };
    const p = new Player(socket.id, name, color, pos);
    room.players.set(socket.id, p);
    (socket.data as unknown as { playerId: string }).playerId = socket.id;

    const players = Array.from(room.players.values()).map((pl) => ({
      id: pl.id,
      name: pl.name,
      color: pl.color,
      position: pl.position,
      rotation: pl.rotation,
      animationState: pl.animationState,
      currentOfficeId: pl.currentOfficeId,
      inMeeting: pl.inMeeting,
    })) as PlayerType[];

    socket.emit('player:joined', {
      player: players.find((x) => x.id === socket.id)!,
      players,
      world: worldConfig,
      offices,
    });
    socket.broadcast.emit('player:joinedOther', {
      player: players.find((x) => x.id === socket.id)!,
    });
    console.log(`[join] ${name} (${socket.id}) total=${room.players.size}`);
  });

  socket.on('player:move', (data) => {
    const p = room.players.get(socket.id);
    if (!p) return;
    // rate limit simple: max 30/s
    const now = Date.now();
    if (now - p.moveWindowStart > 1000) {
      p.moveWindowStart = now;
      p.moveCountSec = 0;
    }
    p.moveCountSec++;
    if (p.moveCountSec > 40) return;

    const parsed = moveSchema.safeParse(data);
    if (!parsed.success) return;
    const { position, rotation, animationState } = parsed.data;
    if (!validatePosition(position, p.position)) return;

    p.position = { ...position };
    p.rotation = rotation;
    p.animationState = animationState;
    p.lastUpdate = now;

    socket.broadcast.emit('player:moved', {
      playerId: socket.id,
      position,
      rotation,
      animationState,
    });
  });

  socket.on('player:officeEnter', (data) => {
    const p = room.players.get(socket.id);
    if (!p) return;
    const parsed = officeIdSchema.safeParse(data);
    if (!parsed.success) return;
    const office = offices.find((o) => o.id === parsed.data.officeId);
    if (!office) return;
    // validar que realmente está dentro (anti-cheat básico)
    if (!room.isInside(p.position, office)) return;
    p.currentOfficeId = office.id;
    io.emit('player:officeEntered', {
      playerId: socket.id,
      officeId: office.id,
    });
  });

  socket.on('player:officeLeave', (data) => {
    const p = room.players.get(socket.id);
    if (!p) return;
    const parsed = officeIdSchema.safeParse(data);
    if (!parsed.success) return;
    if (p.currentOfficeId !== parsed.data.officeId) return;
    p.currentOfficeId = null;
    io.emit('player:officeExited', {
      playerId: socket.id,
      officeId: parsed.data.officeId,
    });
  });

  socket.on('disconnect', () => {
    const p = room.players.get(socket.id);
    if (p) console.log(`[leave] ${p.name} (${socket.id})`);
    room.players.delete(socket.id);
    io.emit('player:left', { playerId: socket.id });
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT} (FRONTEND_URL=${FRONTEND_URL})`);
  console.log(
    `[server] offices=${offices.length} world=${worldConfig.size.width}x${worldConfig.size.depth}`,
  );
});
