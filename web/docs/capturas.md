# Capturas para la landing

Tamaño: **1600 × 1000** px, modo claro, español. Las imágenes ya generadas están en `docs/capturas/`.

Para reproducirlas: `npm run build && npm run preview` y abre cada enlace con la ventana del navegador a
1600 × 1000 (DevTools → modo dispositivo → tamaño personalizado). Si publicas la app, cambia
`http://localhost:4173/` por la URL pública; los parámetros son los mismos.

| # | Pantalla | Archivo | Enlace exacto |
|---|---|---|---|
| 1 | Experimento (base lunar) | `capturas/01-experimento.png` | `http://localhost:4173/?entorno=base_lunar&lang=es#experimento` |
| 2 | Cobertura con rover lunar | `capturas/02-cobertura-rover-lunar.png` | `http://localhost:4173/?entorno=rover&examinar=1&lang=es#cobertura` |
| 3 | Alcance (rover lunar) | `capturas/03-alcance.png` | `http://localhost:4173/?entorno=rover&examinar=1&lang=es#alcance` |
| 4 | Mapa de condiciones (rover lunar) | `capturas/04-mapa.png` | `http://localhost:4173/?entorno=rover&examinar=1&lang=es#mapa` |
| 5 | Cobertura: espuma a 34 % de O₂ y 8,2 psi | `capturas/05-cobertura-34-o2-8-2-psi.png` | `http://localhost:4173/?entorno=base_lunar&o2=34&p=8.2&u=psi&material=espuma&examinar=1&lang=es#cobertura` |

Variantes en otros idiomas: cambia `lang=es` por `lang=en`, `lang=pt` o `lang=zh`.
