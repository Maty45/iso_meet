import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@iso-meet/shared';
import { type Socket, io } from 'socket.io-client';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): TypedSocket {
  const url = import.meta.env.VITE_SERVER_URL as string | undefined;
  const socket: TypedSocket = url
    ? io(url, { transports: ['websocket', 'polling'] })
    : io({ transports: ['websocket', 'polling'] });
  return socket;
}
