#!/bin/sh
# Punto de entrada: elige qué tarea ejecutar según el primer argumento.
set -e
mkdir -p "$DATOS_DIR/tablas" "$DATOS_DIR/salida"

case "$1" in
  metadatos)
    python /app/scripts/descargar_metadatos_psi.py
    ;;
  demo)
    python /app/scripts/normalizar_tabla.py --demo
    ;;
  normalizar)
    python /app/scripts/normalizar_tabla.py
    ;;
  columnas)
    shift
    python /app/scripts/normalizar_tabla.py --ver-columnas "$@"
    ;;
  caracterizar)
    python /app/scripts/caracterizar_fichas.py --ia
    ;;
  caracterizar-reglas)
    python /app/scripts/caracterizar_fichas.py --reglas
    ;;
  comparar)
    python /app/scripts/comparar_modos.py
    ;;
  todo)
    python /app/scripts/descargar_metadatos_psi.py
    python /app/scripts/caracterizar_fichas.py --reglas
    python /app/scripts/caracterizar_fichas.py --ia
    python /app/scripts/comparar_modos.py
    ;;
  web)
    python /app/scripts/servidor_web.py
    ;;
  construir-web)
    python /app/scripts/construir_web.py
    ;;
  shell)
    exec /bin/sh
    ;;
  *)
    cat <<'AYUDA'
Comandos disponibles:
  metadatos             1. Descarga las fichas de investigación de PSI
  caracterizar          2. Caracteriza las fichas con IA (requiere ANTHROPIC_API_KEY)
  caracterizar-reglas   2. Caracteriza las fichas sin IA (patrones de texto)
  comparar              3. Compara los resultados de IA y de reglas
  todo                  metadatos + ambos modos + comparar
  web                   4. Abre el evaluador en http://localhost:8080
  construir-web         Genera web/index.html independiente con las fichas embebidas
  --- opcional, para tablas de ensayos descargadas a mano ---
  columnas <archivo>    Muestra las columnas de una tabla en datos/tablas/
  demo                  Prueba la normalización con una tabla inventada
  normalizar            Normaliza las tablas definidas en datos/config_tablas.json
  shell                 Abre una terminal dentro del contenedor
AYUDA
    ;;
esac
