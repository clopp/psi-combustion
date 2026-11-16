# Kit para desarrollar FLUE FLAM con Claude Code en VS Code

## Instalación (una vez)
1. Copia el contenido de este kit en la RAÍZ de tu repositorio `psi-combustion/`:
   - `CLAUDE.md`
   - `.claude/commands/` (e1, rev, fix, ref, estado)
   - `referencia/` (plantilla_v1.html, mockup/, datos/)
   La carpeta `.claude` empieza con punto: si no la ves, activa "mostrar archivos ocultos".
2. Abre la carpeta `psi-combustion/` en VS Code y abre el panel de Claude Code.
3. Necesitas Node.js instalado (`node -v`) para Vite.

## Uso
- `/e1` ejecuta la etapa 1. Claude Code mostrará un plan; responde `ok`.
- Mensajes cortos con prefijo: `UI: …`, `CSS: …`, `DOM: …`, `TXT: …`, `FIX: …`, `REF: …`, `?: …`.
  Ejemplo: `UI: el selector de idioma a la izquierda de Cargar fichas`.
- `/rev` revisa los cambios contra las reglas. `/estado` resume el avance.
- `/fix el contador de Cobertura no se actualiza` corrige un error puntual.

## Ahorrar tokens
- Usa `/clear` al terminar cada etapa: CLAUDE.md se vuelve a leer solo y el contexto queda limpio.
- No pegues código en el chat: nombra el archivo o la función (Claude Code los lee).
- Para portar algo de la versión anterior usa `/ref nombreFuncion`: lee solo esas líneas.
- Haz `git commit` al cerrar cada etapa, para poder volver atrás sin gastar tokens arreglando.
