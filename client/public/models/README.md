# Models — fuentes y licencia

Coloca aquí los `.glb` low-poly. El proyecto usa `AssetManager` + `catalog.ts` — cambiar `chair.glb` por `office-chair.glb` solo requiere editar el catálogo.

## Estructura esperada
```
/models/furniture/chair.glb
/models/furniture/desk.glb
/models/furniture/table.glb
/models/furniture/sofa.glb
/models/furniture/bookshelf.glb
/models/furniture/bed.glb
/models/electronics/monitor.glb
/models/electronics/computer.glb
/models/electronics/laptop.glb
/models/electronics/keyboard.glb
/models/decoration/plant.glb
/models/decoration/lamp.glb
/models/decoration/trashcan.glb
/models/decoration/picture.glb
/models/decoration/carpet.glb
/models/office/whiteboard.glb
/models/office/meeting-table.glb
/models/office/cabinet.glb
/models/office/door.glb
/models/characters/player.glb
```

## Fuentes recomendadas (CC0 / permisivas)

1. **Kenney** — https://kenney.nl/assets — CC0 (dominio público), pack "Furniture Kit", "Office Kit", "Nature Kit"
2. **Quaternius** — https://quaternius.com — CC0, packs "Office", "Furniture", "Ultimate"
3. **Poly Pizza** — https://poly.pizza — CC0 / CC-BY según autor (verificar cada modelo)
4. **Sketchfab CC0** — filtrar por CC0

**Licencia:** Preferir CC0. Si usas CC-BY, añade atribución aquí:
- Ej: `sofa.glb` — Quaternius — CC0 — https://quaternius.com/p/ultimate-modular...

## Placeholders
Si un `.glb` no existe, `AssetManager` devuelve un cubo rojo y logea `fallo cargando /models/...` sin romper la escena. Para FASE 2-3 basta con dejar placeholders; la mezcla bloques+modelos seguirá funcionando.

## Notas de escala
Cada asset en `catalog.ts` tiene `scale` y `yOffset` para normalizar modelos de distintas fuentes sin tocar el código de posicionamiento.
