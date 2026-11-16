# PSI Combustión: extracción y caracterización de investigaciones

Contenedor Docker que toma la información publicada en NASA PSI y la organiza
en fichas estandarizadas con la caracterización de cada investigación de
combustión: combustible, geometría, oxígeno, presión, flujo, diluyentes,
mediciones, función de seguridad y entornos relevantes.

## Cómo funciona

    PSI (web) ──metadatos──► fichas_investigacion.json  (24 investigaciones)
                                       │
                     ┌─────────────────┴─────────────────┐
              caracterizar                      caracterizar-reglas
                 (IA)                               (sin IA)
                     ▼                                    ▼
      fichas_caracterizadas_ia.json      fichas_caracterizadas_reglas.json
      revision_caracterizacion_ia.csv    revision_caracterizacion_reglas.csv
                     └─────────────────┬─────────────────┘
                                   comparar
                                       ▼
                     comparacion/comparacion.json  ──► para el dashboard
                     comparacion/comparacion_detalle.csv
                     comparacion/comparacion_resumen.csv

1. **metadatos**: descarga de PSI título, plataforma, hardware, palabras
   clave, publicaciones y los textos de objetivos, método e hipótesis.
2. **caracterizar**: lee esos textos y rellena los campos de caracterización.
   Cada valor trae la frase original que lo respalda, y el script comprueba
   que esa frase exista de verdad en el texto de PSI. Si no existe, lo marca
   en `advertencias`.

## Requisitos

- Docker Desktop (Windows o Mac) o Docker Engine con Compose 2.24 o superior.
- Para el modo IA: una clave de la API de Claude (console.anthropic.com).
  Sin clave pueden usar el modo sin IA.

## Uso paso a paso

Abre una terminal dentro de la carpeta `psi-combustion`.

**1. Configurar la clave (solo modo IA)**

Copia `.env.ejemplo` como `.env` y escribe tu clave en `ANTHROPIC_API_KEY`.

**2. Construir la imagen** (primera vez o si cambias los scripts)

    docker compose build

**3. Descargar las fichas de PSI**

    docker compose run --rm psi metadatos

**4. Caracterizar**

Con IA:

    docker compose run --rm psi caracterizar

Sin IA (gratis, menos completo):

    docker compose run --rm psi caracterizar-reglas

Para probar primero con pocas investigaciones, pon en `.env` la línea
`SOLO=PSI-69,PSI-26` y quítala después.

Las respuestas de la IA se guardan en `datos/salida/cache_ia/`. Si vuelves a
ejecutar, no se paga de nuevo por las ya procesadas. Para repetir una,
borra su archivo de esa carpeta.

**5. Revisar**

Abre `datos/salida/revision_caracterizacion_ia.csv` (o `_reglas.csv`) en Excel. Revisa primero las
filas con advertencias. Cuando un miembro del equipo verifique una ficha,
cambien `verificado_por_humano` a `true` en el JSON.

**6. Comparar IA contra reglas**

Después de ejecutar ambos modos:

    docker compose run --rm psi comparar

Para cada investigación y cada campo (material, oxígeno, presión, flujo,
diluyentes, etc.) clasifica el resultado en: `coinciden`, `difieren`,
`solo_ia`, `solo_reglas` o `ninguno`. Las listas se comparan sin importar
mayúsculas ni sinónimos (CO2 = carbon dioxide) y los números con 2 % de
tolerancia. `ninguno` suele indicar que el texto de PSI no trae ese dato.

**Todo de una vez:** `docker compose run --rm psi todo`
(metadatos, ambos modos y comparación).

**7. Abrir el evaluador de escenarios**

    docker compose run --rm --service-ports psi web

Abre http://localhost:8080 en el navegador. La página lee sola las últimas
fichas de `datos/salida/`, en este orden: `fichas_curadas.json` (si el
equipo crea una versión revisada a mano), `fichas_caracterizadas_ia.json` y
`fichas_caracterizadas_reglas.json`. El `--service-ports` es necesario para
que el puerto 8080 quede abierto. Para detenerlo, Ctrl+C.

Como la carpeta `web/` está compartida con el contenedor, si editan
`web/plantilla.html` basta con recargar el navegador (la página que se sirve
es `web/index.html`; regenérenla con el comando siguiente).

**8. Generar la versión independiente**

    docker compose run --rm psi construir-web

Crea `web/index.html` con las fichas embebidas. Ese único archivo funciona
sin servidor: se puede abrir con doble clic, publicar en GitHub Pages o
entregar con el proyecto. También tiene un botón "Cargar fichas" para usar
cualquier archivo de fichas.

## Cómo funciona el evaluador (sin IA)

- **Entrada:** el usuario elige un entorno (estación, base lunar, rover,
  traje, Tierra, Marte o personalizado) y ajusta oxígeno, presión, material,
  gravedad, flujo de aire e interés.
- **Relevancia:** cada investigación recibe una cercanía de 0 a 1 por
  variable. El puntaje es el promedio ponderado de las variables con datos;
  las que no tienen datos no cuentan y se informa la cobertura. Los pesos se
  pueden cambiar en "Cómo se calcula la relevancia".
- **Vacíos:** se revisa si alguna investigación cubre cada variable y cada
  combinación (por ejemplo, tela con 30 % de oxígeno).
- **Mapa:** oxígeno contra presión, con rangos de cada investigación,
  entornos de referencia y el escenario del usuario.
- **Comparación y exportación:** tabla lado a lado y descarga en CSV.

Los valores de la base lunar y del traje vienen del enunciado del reto. La
atmósfera marciana no está definida; se usan los valores lunares como supuesto
y la página lo indica.

## Archivos de salida

| Archivo | Modo | Para qué |
|---|---|---|
| `fichas_investigacion.json` | — | Metadatos originales de PSI |
| `fichas_caracterizadas_ia.json` | IA | Fichas completas para el dashboard |
| `fichas_caracterizadas_reglas.json` | Reglas | Fichas completas para el dashboard |
| `revision_caracterizacion_ia.csv` | IA | Revisión humana en Excel |
| `revision_caracterizacion_reglas.csv` | Reglas | Revisión humana en Excel |
| `comparacion/comparacion.json` | Ambos | Vista de comparación en el dashboard |
| `comparacion/comparacion_detalle.csv` | Ambos | Una fila por investigación y campo |
| `comparacion/comparacion_resumen.csv` | Ambos | Porcentajes por campo |
| `cache_ia/` | IA | Respuestas guardadas para no pagar dos veces |

Además, cada ficha guarda su modo en `trazabilidad.metodo_caracterizacion`.

## Opcional: tablas de ensayos

Si descargan tablas de ensayos de PSI (requiere iniciar sesión), cópienlas en
`datos/tablas/` y usen:

    docker compose run --rm psi columnas nombre_del_archivo.xlsx
    docker compose run --rm psi normalizar

La configuración de las tablas va en `datos/config_tablas.json`
(ver `datos/config_tablas.ejemplo.json`). `demo` prueba con datos inventados.

## Sin docker compose

    docker build -t psi-combustion .
    docker run --rm --env-file .env -v "$(pwd)/datos:/datos" psi-combustion metadatos

En Windows PowerShell cambia `$(pwd)` por `${PWD}`.

## Limitaciones conocidas

- La caracterización sale de los textos públicos de PSI, que son resúmenes.
  Los valores exactos de cada ensayo están en los archivos de datos, que
  requieren cuenta.
- Algunos metadatos de PSI tienen errores (por ejemplo, SAFFIRE-I y -III
  aparecen con plataforma ISS, pero se hicieron en naves Cygnus).
- El servicio JSON de PSI (`/geode-py/ws/repo/search`) no está documentado
  oficialmente y podría cambiar.
- La IA puede equivocarse: la verificación de frases reduce el riesgo, pero
  no reemplaza la revisión humana.
