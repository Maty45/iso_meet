import type { Office } from './office.js';
import type { Player, PlayerState } from './player.js';
import type { WorldConfig } from './world.js';

export interface ClientToServerEvents {
  'player:join': (data: { name: string }) => void;
  'player:move': (data: {
    position: { x: number; y: number; z: number };
    rotation: number;
    animationState: Player['animationState'];
  }) => void;
  'player:officeEnter': (data: { officeId: string }) => void;
  'player:officeLeave': (data: { officeId: string }) => void;
}

export interface ServerToClientEvents {
  'player:joined': (data: {
    player: Player;
    players: Player[];
    world: WorldConfig;
    offices: Office[];
  }) => void;
  'player:joinedOther': (data: { player: Player }) => void;
  'player:left': (data: { playerId: string }) => void;
  'player:moved': (data: {
    playerId: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    animationState: Player['animationState'];
  }) => void;
  'player:officeEntered': (data: {
    playerId: string;
    officeId: string;
  }) => void;
  'player:officeExited': (data: { playerId: string; officeId: string }) => void;
  error: (data: { code: string; message: string }) => void;
}

export type InterServerEvents = {};
export interface SocketData {
  playerId: string;
  playerName: string;
}
