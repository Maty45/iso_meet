import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Office } from '@iso-meet/shared';

function generateMeetCode(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const part = (n: number) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
}

function isPlaceholderMeetUrl(url: string): boolean {
  if (!url) return true;
  const u = url.trim();
  return u === 'https://meet.google.com/new' || u === 'https://meet.google.com/landing?hs=122' || u === 'https://meet.google.com/' || u.endsWith('/new');
}

export function loadOffices(): Office[] {
  const candidates: string[] = [];
  // ESM: __dirname del archivo compilado
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    candidates.push(resolve(__dirname, '../../config/offices.json'));
    candidates.push(resolve(__dirname, '../../../config/offices.json'));
    candidates.push(resolve(__dirname, '../../../../config/offices.json'));
  } catch {}
  // cwd fallbacks
  candidates.push(resolve(process.cwd(), 'config/offices.json'));
  candidates.push(resolve(process.cwd(), '../config/offices.json'));
  candidates.push(resolve(process.cwd(), '../../config/offices.json'));

  for (const c of candidates) {
    try {
      const raw = readFileSync(c, 'utf-8');
      const j = JSON.parse(raw);
      const offices = (j.offices as Office[]) || [];
      // validación básica bounds
      const valid = offices.filter(
        (o) => o.bounds && typeof o.bounds.minX === 'number',
      );
      if (valid.length !== offices.length)
        console.warn(
          `[offices] ${offices.length - valid.length} oficinas con bounds inválidos ignoradas`,
        );
      // Genera códigos efímeros hasta que el server se cierre (no persiste a disco)
      const seen = new Set<string>();
      for (const office of valid) {
        // Los links reales de Meet son credenciales: quien tenga la URL entra a la reunion.
        // Van por env (MEET_URL_OFFICE_1), nunca en offices.json, que si esta trackeado.
        const fromEnv = process.env[`MEET_URL_${office.id.toUpperCase().replace(/-/g, '_')}`];
        if (fromEnv) office.meetingUrl = fromEnv;
        if (isPlaceholderMeetUrl(office.meetingUrl)) {
          let code: string;
          do { code = generateMeetCode(); } while (seen.has(code));
          seen.add(code);
          const old = office.meetingUrl;
          office.meetingUrl = `https://meet.google.com/${code}`;
          console.log(`[offices] ${office.id} (${office.name}) placeholder ${old} -> ${office.meetingUrl} (efímero, dura hasta reiniciar server)`);
        } else {
          // asegura unicidad si ya venía con código repetido
          const code = office.meetingUrl.split('/').pop() || '';
          if (seen.has(code)) {
            let newCode: string;
            do { newCode = generateMeetCode(); } while (seen.has(newCode));
            seen.add(newCode);
            office.meetingUrl = `https://meet.google.com/${newCode}`;
            console.log(`[offices] ${office.id} código duplicado, reasignado -> ${office.meetingUrl}`);
          } else if (code) seen.add(code);
        }
      }
      return valid;
    } catch {}
  }
  console.warn('[offices] config/offices.json no encontrado, usando vacío');
  return [];
}
