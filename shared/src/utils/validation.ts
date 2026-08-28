import { z } from 'zod';

export const vec3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

export const playerNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .regex(/^[a-zA-Z0-9 _-]+$/, 'Solo alfanumérico, espacio, _ y -');

export const joinSchema = z.object({ name: playerNameSchema });

export const moveSchema = z.object({
  position: vec3Schema,
  rotation: z.number().finite(),
  animationState: z.enum(['idle', 'walk', 'jump']),
});

export const officeIdSchema = z.object({ officeId: z.string().min(1).max(64) });

export function sanitizeName(name: string): string {
  return (
    name
      .trim()
      .slice(0, 16)
      .replace(/[^a-zA-Z0-9 _-]/g, '') || 'guest'
  );
}

export function isValidMeetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'meet.google.com';
  } catch {
    return false;
  }
}
