# BLUE FLAME · Evaluador de escenarios de incendio

Panel web que ordena las investigaciones de combustión de **NASA PSI** (Physical Sciences Informatics)
según un escenario (oxígeno, presión, material, gravedad, flujo de aire e interés). Muestra qué tan favorable es
para un incendio frente a la **ISS**, qué investigaciones son más relevantes, los vacíos de información y un mapa
de oxígeno frente a presión.

Público: estudiantes, profesores, investigadores e ingenieros aeroespaciales. Idiomas: inglés (por defecto), español,
chino simplificado y portugués de Brasil.

Todo el cálculo se hace con reglas en el navegador (`src/dominio/`); la app no usa IA ni servidor en tiempo de uso.

## Cómo correr

Requisitos: Node 18 o posterior.

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm test           # pruebas (vitest)
npm run build      # genera dist/index.html (un solo archivo)
npm run preview    # sirve dist/ en http://localhost:4173
npm run respaldo   # actualiza las fichas embebidas desde public/datos/
```

`dist/index.html` también funciona con **doble clic** (sin servidor): usa las fichas embebidas en el propio archivo.

## Enlaces con escenario

La URL puede traer un escenario completo. Ejemplo:

```
index.html?entorno=rover&o2=30&p=70.3&u=kPa&material=tela&gravedad=lunar&flujo=suave&interes=prevencion&lang=pt&examinar=1
```

| Parámetro | Valores |
|---|---|
| `entorno` | `estacion`, `base_lunar`, `rover`, `traje`, `tierra`, `marte` |
| `o2` | 0 a 100 (%) |
| `p` y `u` | presión en la unidad `u`: `kPa`, `psi` o `atm` (10 a 200 kPa) |
| `material` | `tela`, `plastico`, `espuma`, `liquido`, `gas` |
| `gravedad` | `micro`, `lunar`, `marciana`, `terrestre` |
| `flujo` | `quieto`, `suave`, `fuerte` |
| `interes` | lista separada por comas: `prevencion,deteccion,supresion` |
| `lang` | `es`, `en`, `zh`, `pt` |
| `examinar=1` | examina el escenario y abre `#cobertura` (o la pestaña del hash, p. ej. `#mapa`) |

Los valores inválidos se ignoran. En Cobertura, el botón **Copiar enlace a este escenario** genera esta URL.

## Estructura

```
web/
  index.html              metadatos, favicon y fuentes
  public/datos/           fichas JSON que carga la app servida
  scripts/respaldo.mjs    copia las fichas de mayor prioridad a src/datos/fichas_respaldo.json
  src/
    main.js               arranque: idioma, escenario de la URL, paneles
    estado.js             estado único (obtener, actualizar, suscribir)
    datos/                referencias, normalizar, cargador (con respaldo), url, fuente, csv
    dominio/              reglas puras: favorabilidad, relevancia, vacíos, recomendaciones, mapa
    ui/                   cabecera, pestañas, experimento, cobertura, alcance, mapa, componentes
    i18n/                 es.js (original), en.js, zh.js, pt.js
    estilos/              tokens (claro/oscuro), base, layout, componentes
  tests/                  pruebas de dominio, datos, i18n, URL y escenarios completos
  docs/                   verificación manual y capturas para la landing
```

## Fuentes de datos

- Investigaciones: NASA PSI, área *Combustion Science*
  (<https://psi.nasa.gov/physci/repo/search?q=&data_source=psi&data_type=investigation>).
- Prioridad de carga: `datos/fichas_curadas.json` > `datos/fichas_caracterizadas_ia.json` >
  `datos/fichas_caracterizadas_reglas.json` > copia embebida. El usuario puede cargar su propio JSON
  con **Cargar fichas**.
- Las reglas de favorabilidad citan sus fuentes (BASS, BASS-II, SoFIE-MIST, FM2, ECLSS, etc.) dentro de la app,
  en Cobertura → *Fuentes de las reglas*.
- Los textos originales de PSI (objetivos, evidencia) se muestran en inglés, marcados como
  «Texto original de PSI (inglés)».

## Actualizar las fichas

1. Copia el nuevo JSON a `public/datos/` con uno de los nombres de la prioridad
   (una lista de fichas o `{ "fichas": [...] }`; cada ficha necesita `id_psi`).
2. `npm run respaldo` para actualizar la copia embebida.
3. `npm test` y `npm run build`.

## Publicar `dist/`

`npm run build` genera `dist/index.html` (todo en un archivo) y `dist/datos/` (copia de `public/datos/`).

**GitHub Pages**
1. `npm run build`.
2. Sube el contenido de `dist/` a la rama `gh-pages` (o a `docs/` de la rama principal) y en
   *Settings → Pages* elige esa rama y carpeta.
   Con la CLI: `npx gh-pages -d dist` (herramienta externa, opcional).
3. Como `base` es `./`, funciona también en una subruta (`usuario.github.io/blue-flame/`).

**Netlify**
- Arrastra la carpeta `dist/` a <https://app.netlify.com/drop>, o conecta el repositorio con
  *Base directory* `web`, *Build command* `npm run build` y *Publish directory* `web/dist`.
