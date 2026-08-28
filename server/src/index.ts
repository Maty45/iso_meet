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
  CORRIDOR_Z,
  NETWORK,
  WORLD_SIZE,
  buildWorldBlocks,
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

// mundo estatico — la geometria la genera shared/buildWorldBlocks (misma que usa el cliente offline)
function buildWorldConfig(): WorldConfig {
  const { blocks } = buildWorldBlocks(offices);
  return {
    size: { width: WORLD_SIZE.width, depth: WORLD_SIZE.depth, height: WORLD_SIZE.height },
    blocks,
    offices,
    spawnPoints: [{ x: WORLD_SIZE.width / 2, y: 1, z: (CORRIDOR_Z.min + CORRIDOR_Z.max) / 2 }],
  };
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
