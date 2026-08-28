export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}

export class Input {
  state: InputState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  };
  private keys = new Set<string>();
  private interactHandlers: (() => void)[] = [];

  /** E = interactuar (abrir la reunión parado en la mesa). */
  onInteract(fn: () => void) {
    this.interactHandlers.push(fn);
  }

  constructor() {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    // Escribir el nombre en el join screen no debe mover al personaje ni abrir el Meet.
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (['w', 'arrowup'].includes(k)) this.state.forward = down;
    if (['s', 'arrowdown'].includes(k)) this.state.back = down;
    if (['a', 'arrowleft'].includes(k)) this.state.left = down;
    if (['d', 'arrowright'].includes(k)) this.state.right = down;
    if (k === ' ') this.state.jump = down;
    if (k === 'shift') this.state.sprint = down;
    if (k === 'e' && down) for (const fn of this.interactHandlers) fn();
    // evitar scroll con espacio/flechas
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (down) e.preventDefault();
    }
  }

  // Convierte input a vector mundo relativo a cámara isométrica fija (45° yaw)
  // Cámara en (+40,+40,+40) mirando al origen -> norte en pantalla = (-1,0,-1) = yaw 45°
  getMoveVector(): { x: number; z: number } {
    const yaw = Math.PI / 4;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let fx = 0,
      fz = 0;
    if (this.state.forward) {
      fx -= sin;
      fz -= cos;
    }
    if (this.state.back) {
      fx += sin;
      fz += cos;
    }
    if (this.state.left) {
      fx -= cos;
      fz += sin;
    }
    if (this.state.right) {
      fx += cos;
      fz -= sin;
    }
    const len = Math.hypot(fx, fz);
    if (len > 0) {
      fx /= len;
      fz /= len;
    }
    return { x: fx, z: fz };
  }

  dispose() {
    // no-op, listeners permanecen; si se necesita remover, guardar refs
  }
}
