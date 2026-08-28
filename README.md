# IsoMeet — Oficina virtual isométrica

**Minecraft isométrico + oficina virtual + Google Meet** · MVP funcional.

Vista isométrica fija (OrthographicCamera), mundo voxel 40×40, 4 oficinas, avatares, multiplayer Socket.IO y botón que abre Google Meet en nueva pestaña.

> Plan técnico completo en [`PLAN.md`](./PLAN.md). Basado en análisis de `souramoo/party` y requisitos de `instrucciones.txt`.

## Requisitos

- Node 20+
- npm 10+

## Desarrollo local

```bash
npm install
npm run dev
# client: http://localhost:5173
# server: http://localhost:3000
# health: http://localhost:3000/health
```

O por separado:
```bash
npm run dev:client
npm run dev:server
```

Variables (opcional):
```bash
cp .env.example .env
# VITE_SERVER_URL=http://localhost:3000  (client)
# PORT=3000  FRONTEND_URL=http://localhost:5173  (server)
```

## Criterios MVP

- [x] Vista isométrica ortográfica, zoom rueda
- [x] Mundo 40×40 bloques + paredes + oficinas
- [x] Avatar voxel + WASD isométrico + colisiones AABB + salto
- [x] 4 oficinas con Meet URL configurable (`config/offices.json`)
- [x] Detección entrada/salida + panel "Entrar a reunión"
- [x] Multiplayer 20Hz + interpolación + nombres + colores
- [x] Google Meet `window.open` (no iframe, por CSP/X-Frame-Options)
- [x] Funciona offline (modo demo sin servidor)

## Configurar oficinas

Edita `config/offices.json`:
```json
{ "id":"office-1","name":"Sala Dev","bounds":{...},"meetingUrl":"https://meet.google.com/...","spawnPoint":{...} }
```
`meetingUrl` debe ser `https://meet.google.com/...` (validado).

## Deployment gratuito

- **Frontend** → Cloudflare Pages / Netlify / Vercel: `npm run build -w client` → `client/dist`
- **Backend** → Render Free (750h/mes, cold start ~60s) o Railway $5/mes (siempre on): `npm run build -w server` → `server/dist` + `PORT` + `FRONTEND_URL`

Ver `PLAN.md` §15 para detalles y limitaciones WebSocket.

## Stack

Vite + TypeScript + Three.js + Socket.IO v4 + Express + Zod + Biome

## Roadmap

V2 chat/emojis/skins, V3 WebRTC propio, V4 auth/DB, V5 multi-mundo.
