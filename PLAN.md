# PLAN TÉCNICO — Plataforma de reuniones virtuales isométrica estilo Minecraft

> MVP: "Minecraft isométrico + oficina virtual + Google Meet"

## 1. Resumen Ejecutivo

Construir MVP con Three.js (OrthographicCamera isométrica) + Socket.IO. Desarrollo en 7 fases incrementales, cada una funcional. Reutiliza selectivamente `souramoo/party` (patrón rooms, AABB) pero reemplaza: FPS→isométrico, mundo infinito→mapa 30×60 estático, WebRTC→Google Meet nueva pestaña, y simplifica bloques/edición.

## 2. Análisis de `party` (souramoo/party)

| Aspecto | Hallazgo | Decisión |
|---------|----------|----------|
| Arquitectura | Express + Socket.IO v2 + Three.js ES modules sin build. Server relay 3D. | Reutilizar patrón rooms. Reemplazar webpack→Vite, v2→v4 |
| Mundo 3D | Chunk streaming infinito, procedural noise, greedy meshing, persist JSON | Eliminar streaming/procedural/meshing complejo. Crear mapa estático 30×60 |
| Jugador | Física Minecraft completa (AABB, sprint/sneak/vuelo/nado, raycast) | Reutilizar AABB + WASD relativo yaw. Simplificar solo caminar/saltar |
| Avatar | Cuboide + video WebRTC PeerJS | Reutilizar geometría voxel simple. Eliminar WebRTC. Añadir color+nametag |
| Multiplayer | Socket.IO v2 rooms, broadcast 20Hz, interpolación cliente | Actualizar v4, reutilizar rooms/broadcast, simplificar sin filtro distancia |
| Video/Audio | PeerJS mesh + PannerNode | Eliminar. Reemplazar con window.open(meetUrl) |
| Cámara | Perspective FPS + pointer lock | Reemplazar totalmente por OrthographicCamera isométrica |
| Dependencias | three 0.169, socket.io 2.3 (EOL), peerjs 1.2, webpack 4 (Node≤16) | Stack moderno: three latest, socket.io 4, Vite, TS, Node20+ |
| Seguridad | sanitize básico, sin rate limit, CORS abierto | Añadir rate limit, validación estricta, CSP, CORS restrictivo |
| Escalabilidad | single-process, 40p/room, 250k edits | MVP single-process OK. Futuro Redis adapter |

**Conclusión: No hacer fork.** Proyecto nuevo reutilizando solo patrones rooms/broadcast/AABB.

## 3. Arquitectura Propuesta

```
Browser (Cliente)
  Three.js (OrthoCam) + UI + Socket.IO Client
         └─ Game Loop (Input, Physics, Sync)
                    │
              Socket.IO (WS + polling fallback)
                    ▼
Server (Node.js)
  Express (Static+Health) + Socket.IO v4 + Room Manager (Players, Offices)
                    └─ Persistence: config/offices.json
```

Frontend → Cloudflare Pages/Netlify. Backend → Render/Railway/Fly.io.

## 4. Stack Definitivo

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Frontend | TS + Vite | Build rápido, HMR, ES modules |
| 3D | Three.js r160+ | OrthographicCamera nativa |
| Estado UI | Vanilla TS (sin React) | Mínimo, sin overhead |
| Realtime | Socket.IO Client v4 | Auto-reconnect, rooms |
| Backend | Node 20+ + Express 4 + Socket.IO 4 | Mínimo probado |
| Validación | Zod | Schemas TS-first |
| Lint | Biome | Unificado rápido |
| Test | Vitest + Playwright | Moderno |

NO incluir: React Three Fiber, Redux, WebRTC, DB, webpack.

## 5. Estructura

```
iso-meet/
├── package.json (workspaces)
├── config/offices.json
├── shared/src/types/{player,office,world,messages}
├── client/src/{rendering,world,player,multiplayer,offices,ui}
├── server/src/{rooms,players,networking,offices}
└── scripts/
```

Ver PLAN detalle original en instrucciones.txt (1229 líneas) para árbol completo.

## 6. Modelo de Datos

```ts
Player { id, name, color, position:Vec3, rotation, animationState, currentOfficeId, inMeeting }
Office { id, name, bounds:Bounds, meetingUrl, spawnPoint }
Bounds { minX,maxX,minY,maxY,minZ,maxZ }
Vec3 { x,y,z }
WorldConfig { size:{width,depth,height}, blocks:BlockData[], offices:Office[], spawnPoints }
```

## 7. Comunicación Cliente-Servidor

| Evento | Dir | Payload |
|--------|-----|---------|
| player:join | C→S | {name} |
| player:joined | S→C | {player, players[], world, offices[]} |
| player:move | C→S | {position, rotation, animationState} 20Hz |
| player:moved | S→C | {playerId, position, rotation, animationState} broadcast 20Hz |
| player:officeEnter/Leave | C→S | {officeId} |
| player:left / error | S→C | {playerId} / {code,message} |

Throttle 50ms, interpolación cliente lerp 100ms buffer, validación servidor.

## 8. Cámara Isométrica

OrthographicCamera frustum 30, rot -45°Y, -35.264°X, offset (40,40,40), follow lerp 0.1, zoom 0.5-2.0, clamp a mapBounds, resize aspect.

Ver detalles completos en documento original sección #Cámara.

## 9. Movimiento WASD→Isométrico

Input → vectores forward/right relativos a cameraYaw=-45°, normalizar, aplicar a velocidad con accel 16 onGround. W=arriba pantalla (-Z isométrico), etc.

## 10. Colisiones

AABB voxel grid con substeps 1/120s, check Y→X→Z, half 0.3, height 1.8, gravity 32, jump 8.94. Port simplificado de party/player.js.

## 11. Oficinas

Def en config/offices.json, detección cliente via isInside(bounds) cada frame, emite officeEnter/Exit, server valida posición dentro bounds.

## 12. Google Meet

Iframe bloqueado (X-Frame-Options SAMEORIGIN, CSP frame-ancestors self). Meet Add-ons no sirve para embed arbitrario. Solución: window.open(url,'_blank','noopener,noreferrer') con fallback <a> click. Indicador "En reunión" en avatar.

## 13. Multiplayer Sync

Broadcast 20Hz alternado, validación speed≤MAX*1.5 + bounds, interpolación lerp con delay 100ms + buffer 500ms, rate limit 30msg/s por socket.

## 14. Seguridad MVP

Zod validación, rate limiter token bucket, sanitizeName max16 alfanum, meetUrl https://meet.google.com/, XSS textContent, CSP frame-ancestors none, CORS origin ENV, Helmet.

## 15. Deployment Gratuito

Frontend Cloudflare Pages (500 builds/mes, HTTPS auto). Backend Render Free (750h/mes, spin down 15min, WS OK) o Railway $5/mes siempre on. Vars: VITE_SERVER_URL, FRONTEND_URL, PORT. WSS auto.

## 16. Plan Implementación (7 Fases)

Fase0 Setup monorepo → Fase1 Mundo iso → Fase2 Jugador → Fase3 Oficinas → Fase4 Meet → Fase5 Multiplayer → Fase6 Pulido → Fase7 Deploy

Tareas detalladas con objetivo/archivos/dependencias/verificación en instrucciones.txt. Cada fase funcional incremental.

---
Generado: 2026-08-27. Basado en análisis real de github.com/souramoo/party + instrucciones.txt
