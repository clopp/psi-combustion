# Verificación manual (E5, 2026-11-15)

Método: Chromium headless controlado por CDP sobre `npm run preview` y sobre `dist/index.html` (file://).
Se midió desborde horizontal, textos cortados, orden de foco y errores de consola.
`[x]` verificado · `[ ]` pendiente de revisión humana.

## Pantallas (sin desbordes ni textos cortados)
- [x] 1366 × 768: Experimento, Cobertura, Alcance y Mapa en es, en, pt y zh; sin scroll de página.
- [x] 1920 × 1080: las 4 pestañas en pt y zh.
- [x] 768 × 1024: las 4 pestañas en pt y zh (scroll normal, cabecera y pestañas fijas).
- [x] 390 × 844: las 4 pestañas en es, en, pt y zh. Corregido: la columna central ensanchaba la página
      (407 px) y "BLUE FLAME" se cortaba; ahora la cabecera usa dos filas en ≤ 520 px.
- [x] 1600 × 1000: las 5 capturas de `capturas.md`.
- [x] Modo oscuro a 1366 × 768: Experimento y Cobertura.
- [ ] Revisión visual en Safari y Firefox reales.

## Idiomas
- [x] Selector con `aria-pressed`; cambia `<html lang>`, título y meta descripción.
- [x] Selector con inglés primero (EN · ES · 中文 · PT). Primera visita: inglés; luego se recuerda en `localStorage` (con try/catch).
- [x] `?lang=pt` tiene prioridad sobre lo guardado.
- [x] Números con coma decimal en es y pt (`10,2 psi`), punto en en y zh (`10.2 psi`); hora y fechas con `Intl`.
- [x] Chino con Noto Sans SC solo en `:lang(zh)`.
- [x] Textos de PSI marcados «Texto original de PSI (inglés)» y con `lang="en"`.
- [ ] Revisión de estilo por hablantes nativos de chino y portugués.

## Enlaces con escenario
- [x] `?entorno=rover&examinar=1&lang=pt` abre Cobertura del rover presurizado en portugués (servido y file://).
- [x] `#alcance` o `#mapa` con `examinar=1` respetan la pestaña pedida.
- [x] El botón "Copiar enlace a este escenario" muestra un aviso accesible (`role="status"`); en headless
      el portapapeles está bloqueado y aparece el aviso de error traducido.
- [ ] Copiar el enlace en un navegador real y abrirlo en otra pestaña.

## Teclado y accesibilidad
- [x] Recorrido con Tab en Experimento (45 pasos) y Cobertura (40 pasos): orden lógico cabecera → pestañas
      → panel → columnas izquierda, centro, derecha; todos los elementos con foco visible.
- [x] Pestañas y grupos de recomendaciones con flechas, Inicio y Fin (ARIA tabs).
- [x] `aria-live`: nivel de favorabilidad, resumen al examinar, aviso de copia, nota de entorno, comparar.
- [x] `prefers-reduced-motion`: llamas, termómetro, barras de factores, mapa y logo sin animación.
- [x] Contraste AA (texto normal ≥ 4,5:1) en claro y oscuro para tinta, tenue, morado, verde y texto sobre magenta.
      Excepción: `--llama` (#D1117A, color obligatorio) sobre `--fondo` o `--llama-suave` da 4,46:1
      (AA solo para texto grande o negrita). Sobre `--superficie` da 5,16:1.
- [ ] Revisar si hay texto pequeño magenta sobre fondo rosado o gris de página.
- [ ] Prueba con lector de pantalla (NVDA / VoiceOver).

## Datos y errores
- [x] `dist/index.html` con doble clic: carga las 24 fichas embebidas, sin errores en consola.
- [x] Servido: carga `datos/fichas_caracterizadas_reglas.json`, sin errores en consola.
- [x] Sin servidor de fichas → respaldo embebido + aviso traducido (prueba automática).
- [x] JSON inválido, sin `id_psi` o formato desconocido → aviso traducido; las fichas anteriores se conservan (pruebas).
