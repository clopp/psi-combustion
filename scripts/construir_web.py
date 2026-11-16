"""
Genera web/index.html a partir de web/plantilla.html, embebiendo unas fichas
como respaldo. Así la página funciona también como archivo único (por ejemplo,
para publicarla en GitHub Pages o entregarla con el proyecto).

Prioridad: fichas_curadas.json > fichas_caracterizadas_ia.json > _reglas.json
Uso (en Docker): docker compose run --rm psi construir-web
"""
import datetime
import json
import os

DATOS = os.environ.get("DATOS_DIR", "datos")
SALIDA = os.path.join(DATOS, "salida")
WEB = os.environ.get("WEB_DIR", os.path.join(os.path.dirname(__file__), "..", "web"))
CAMPOS = ["id_psi", "sigla", "titulo", "plataforma", "tipo_proyecto", "subarea", "hardware",
          "fecha_inicio", "fecha_fin", "objetivos", "combustible", "oxigeno_pct", "presion_kpa",
          "flujo_cm_s", "configuracion_flujo", "diluyentes", "funcion_seguridad",
          "entornos_relevantes", "variables_estudiadas", "mediciones", "hallazgos_clave", "trazabilidad"]


def main():
    for nombre in ("fichas_curadas.json", "fichas_caracterizadas_ia.json", "fichas_caracterizadas_reglas.json"):
        ruta = os.path.join(SALIDA, nombre)
        if os.path.exists(ruta):
            break
    else:
        raise SystemExit("No hay fichas en datos/salida/. Ejecuta antes 'caracterizar' o 'caracterizar-reglas'.")
    with open(ruta, encoding="utf-8") as f:
        fichas = [{k: fi.get(k) for k in CAMPOS} for fi in json.load(f)]

    with open(os.path.join(WEB, "plantilla.html"), encoding="utf-8") as f:
        html = f.read()
    datos = json.dumps(fichas, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = html.replace("/*__DATOS__*/[]", datos)
    html = html.replace("/*__FECHA__*/", f"{nombre}, {datetime.date.today():%d/%m/%Y}")
    destino = os.path.join(WEB, "index.html")
    with open(destino, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"{destino} generado con {len(fichas)} fichas de {nombre}")


if __name__ == "__main__":
    main()
