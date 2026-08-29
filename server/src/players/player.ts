import type {
  AnimationState,
  Player as PlayerType,
  Vec3,
} from '@iso-meet/shared';

export class Player implements PlayerType {
  id: string;
  name: string;
  color: number;
  skin: string;
  position: Vec3;
  rotation: number;
  animationState: AnimationState = 'idle';
  currentOfficeId: string | null = null;
  inMeeting = false;
  lastUpdate = Date.now();
  // rate limiting
  lastMoveAt = 0;
  moveCountSec = 0;
  moveWindowStart = Date.now();

  constructor(id: string, name: string, color: number, skin: string, pos: Vec3) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.skin = skin;
    this.position = { ...pos };
    this.rotation = 0;
  }
}
