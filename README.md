# IsoMeet — Oficina virtual isométrica

**Minecraft isométrico + oficina virtual + Google Meet** · MVP funcional.

Vista isométrica fija (OrthographicCamera), mundo voxel 48×40 con pasillo central, 5 salas, avatares animados, multiplayer Socket.IO y Google Meet por sala.

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
- [x] Mundo 48×40 bloques + paredes + 5 salas con puerta al pasillo central
- [x] Avatar animado (idle/walk/sprint) + WASD isométrico + colisiones AABB + salto con coyote time
- [x] 5 salas con Meet URL configurable (`config/offices.json`)
- [x] Detección entrada/salida + panel de sala + **E** en la mesa para abrir el Meet
- [x] Minimapa con las salas y los jugadores
- [x] Multiplayer 20Hz + interpolación + nombres + colores
- [x] Google Meet `window.open` (no iframe, por CSP/X-Frame-Options)
- [x] Funciona offline (modo demo sin servidor)

## Controles

`WASD` moverse · `Shift` correr · `Espacio` saltar · `E` entrar a la reunión (parado en la mesa) · rueda para zoom

## Configurar oficinas

Agregar una sala es agregar una entrada a `config/offices.json`: las paredes, la puerta al
pasillo, el color, el cartel, la luz y los muebles salen solos de sus `bounds`.
Las salas van arriba (`maxZ < 15`) o abajo (`minZ > 23`) del pasillo central.

```json
{ "id":"office-1","name":"Sala Dev","bounds":{...},"meetingUrl":"https://meet.google.com/...","spawnPoint":{...} }
```
`meetingUrl` debe ser `https://meet.google.com/...` (validado).

## Deployment gratuito

- **Frontend** → Cloudflare Pages / Netlify / Vercel: `npm run build -w client` → `client/dist`
- **Backend** → Render Free (750h/mes, cold start ~60s) o Railway $5/mes (siempre on): `npm run build -w server` → `server/dist` + `PORT` + `FRONTEND_URL`

Ver `PLAN.md` §15 para detalles y limitaciones WebSocket.

## Assets

Modelos 3D del [Furniture Kit de Kenney](https://kenney.nl/assets/furniture-kit) (CC0).
Están en `client/public/models/` — `kenney/LICENSE.txt` tiene la licencia.
Para sumar un mueble: copiar el `.glb` ahí y agregar una línea en
`client/src/assets/catalog.ts`; el test `catalog.test.ts` verifica que el archivo exista.

## Stack

Vite + TypeScript + Three.js + Socket.IO v4 + Express + Zod + Biome

## Roadmap

V2 chat/emojis/skins, V3 WebRTC propio, V4 auth/DB, V5 multi-mundo.
