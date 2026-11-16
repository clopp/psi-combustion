"""
Paso 1: descargar los metadatos de las investigaciones de combustión de PSI.

La página https://psi.nasa.gov/physci/repo/search es una aplicación web que, por
detrás, consulta este servicio JSON público (no requiere iniciar sesión):
    https://psi.nasa.gov/geode-py/ws/repo/search
No es una API documentada oficialmente: si deja de funcionar, revisen la página.

Uso (en Docker):  docker compose run --rm psi metadatos
Salida: datos/salida/fichas_investigacion.json
"""
import json
import os
import requests

SALIDA = os.path.join(os.environ.get("DATOS_DIR", "datos"), "salida", "fichas_investigacion.json")

URL = "https://psi.nasa.gov/geode-py/ws/repo/search"
PARAMS = {
    "q": "",
    "data_source": "psi",
    "data_type": "investigation",
    "ffield": "Research Area",
    "fvalue": "Combustion Science",
    "size": 200,
}

# Traducción: nombre del campo en PSI -> nombre del campo en nuestra ficha
MAPEO_CAMPOS = {
    "Accession": "id_psi",
    "Acronym": "sigla",
    "Title": "titulo",
    "Flight Platform": "plataforma",
    "Project Type": "tipo_proyecto",
    "SubResearch Area": "subarea",
    "Keywords": "palabras_clave",
    "Investigation Start Date": "fecha_inicio",
    "Investigation End Date": "fecha_fin",
    "Objectives": "objetivos",
    "Approach": "metodo",
    "Hypothesis": "hipotesis",
    "Research Impacts/Earth Benefits": "beneficios_tierra",
    "Related Investigations": "investigaciones_relacionadas",
    "Publication Title": "publicaciones",
}


def limpiar_lista(texto):
    """PSI separa varios valores con 5 espacios; los convertimos en lista."""
    if not texto:
        return []
    return [p.strip() for p in texto.split("     ") if p.strip()]


def main():
    r = requests.get(URL, params=PARAMS, timeout=30)
    r.raise_for_status()
    resultados = r.json()["hits"]["hits"]

    fichas = []
    for item in resultados:
        fuente = item["_source"]
        ficha = {nuevo: fuente.get(orig, "") for orig, nuevo in MAPEO_CAMPOS.items()}

        # Campos que vienen como listas separadas por espacios
        for campo in ("palabras_clave", "publicaciones", "investigaciones_relacionadas"):
            ficha[campo] = limpiar_lista(ficha[campo])

        hw = fuente.get("Experiment Hardware") or {}
        ficha["hardware"] = hw.get("Name", "") if isinstance(hw, dict) else str(hw)

        # Campos que NO están en los metadatos: se completan después
        # con las tablas de datos (pandas) o con IA sobre la documentación.
        ficha.update({
            "combustible": {"fase": None, "material": None, "geometria": None},
            "oxigeno_pct": {"min": None, "max": None},
            "presion_kpa": {"min": None, "max": None},
            "flujo_cm_s": {"min": None, "max": None},
            "funcion_seguridad": [],
            "entornos_relevantes": [],
            "trazabilidad": {
                "fuente_metadatos": f"PSI {fuente.get('Accession')}",
                "verificado_por_humano": False,
            },
        })
        fichas.append(ficha)

    fichas.sort(key=lambda f: int(f["id_psi"].split("-")[1]))
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(fichas, f, ensure_ascii=False, indent=2)

    print(f"{len(fichas)} investigaciones guardadas en {SALIDA}")
    for fi in fichas:
        print(f"  {fi['id_psi']:8} {fi['sigla'] or '(sin sigla)':22} {fi['plataforma']}")


if __name__ == "__main__":
    main()
