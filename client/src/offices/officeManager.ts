import type { Bounds, Office, Vec3 } from '@iso-meet/shared';

export class OfficeManager {
  offices: Office[] = [];
  currentId: string | null = null;

  setOffices(offices: Office[]) {
    this.offices = offices;
  }

  isInside(pos: Vec3, b: Bounds): boolean {
    return (
      pos.x >= b.minX &&
      pos.x <= b.maxX &&
      pos.y >= b.minY &&
      pos.y <= b.maxY &&
      pos.z >= b.minZ &&
      pos.z <= b.maxZ
    );
  }

  check(pos: Vec3): { entered: Office | null; exited: Office | null } {
    let entered: Office | null = null;
    let exited: Office | null = null;
    let found: Office | null = null;
    for (const o of this.offices)
      if (this.isInside(pos, o.bounds)) {
        found = o;
        break;
      }

    if (found && this.currentId !== found.id) {
      if (this.currentId) {
        const prev = this.offices.find((o) => o.id === this.currentId) || null;
        if (prev) exited = prev;
      }
      entered = found;
      this.currentId = found.id;
    } else if (!found && this.currentId) {
      const prev = this.offices.find((o) => o.id === this.currentId) || null;
      exited = prev;
      this.currentId = null;
    }
    return { entered, exited };
  }

  getCurrent(): Office | null {
    return this.offices.find((o) => o.id === this.currentId) || null;
  }

  countInOffice(
    officeId: string,
    players: { currentOfficeId: string | null }[],
  ): number {
    return players.filter((p) => p.currentOfficeId === officeId).length;
  }
}
