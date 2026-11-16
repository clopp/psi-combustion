"""
Paso 2: caracterizar cada investigación a partir del texto que publica PSI.

Toma datos/salida/fichas_investigacion.json (generado por el comando
"metadatos") y, para cada investigación, lee sus textos de objetivos, método,
hipótesis, hardware y palabras clave. De ahí extrae la caracterización:
combustible, geometría, oxígeno, presión, flujo, diluyentes, mediciones,
función de seguridad y entornos relevantes.

Dos modos:
  --ia       Usa un modelo de lenguaje (API de Claude). Requiere ANTHROPIC_API_KEY.
  --reglas   Sin IA: busca patrones con expresiones regulares. Menos completo,
             pero gratis y útil para comparar con la IA.

Cada valor extraído trae la frase del texto original que lo respalda, y el
script comprueba que esa frase exista de verdad en el texto de PSI.

Salidas en datos/salida/ (el sufijo indica el modo):
  fichas_caracterizadas_ia.json / _reglas.json       fichas completas
  revision_caracterizacion_ia.csv / _reglas.csv      tabla plana para revisar
"""
import json
import os
import re
import sys
import time

import pandas as pd
import requests

DATOS = os.environ.get("DATOS_DIR", "datos")
SALIDA = os.path.join(DATOS, "salida")
ENTRADA = os.path.join(SALIDA, "fichas_investigacion.json")
CACHE = os.path.join(SALIDA, "cache_ia")
MODELO = os.environ.get("MODELO_IA", "claude-haiku-5-5")
API_URL = "https://api.anthropic.com/v1/messages"

A_KPA = {"kpa": 1.0, "psi": 6.894757, "atm": 101.325, "torr": 0.133322,
         "bar": 100.0, "pa": 0.001}
A_CM_S = {"cm/s": 1.0, "mm/s": 0.1, "m/s": 100.0}

FUNCIONES = ["prevencion", "deteccion", "supresion", "fundamental"]
ENTORNOS = ["nave_espacial", "estacion_espacial", "base_lunar",
            "base_marciana", "rover_presurizado", "tierra"]
FASES = ["solido", "liquido", "gas", "aerosol_polvo"]
FLUJOS = ["opuesto", "concurrente", "coflujo", "contraflujo", "quiescente",
          "esferico", "otro"]

# ---------------------------------------------------------------------------
# Texto de entrada
# ---------------------------------------------------------------------------

def texto_fuente(f):
    """Junta los campos de PSI que describen el experimento."""
    partes = [
        f"TITULO: {f.get('titulo', '')}",
        f"HARDWARE: {f.get('hardware', '')}",
        f"PALABRAS CLAVE: {', '.join(f.get('palabras_clave', []))}",
        f"OBJETIVOS: {f.get('objetivos', '')}",
        f"METODO: {f.get('metodo', '')}",
        f"HIPOTESIS: {f.get('hipotesis', '')}",
        f"BENEFICIOS: {f.get('beneficios_tierra', '')}",
    ]
    return "\n\n".join(partes)


def normalizar_espacios(s):
    return re.sub(r"\s+", " ", str(s)).strip().lower()


# ---------------------------------------------------------------------------
# Modo IA
# ---------------------------------------------------------------------------

INSTRUCCIONES = """Eres un asistente que extrae datos de experimentos de combustión
en microgravedad de la NASA a partir del texto de una investigación de la base PSI.
Registra los datos llamando a la herramienta guardar_caracterizacion.

Reglas estrictas:
- Usa SOLO información del texto. Si un dato no aparece, usa null o lista vacía.
- Los campos numéricos deben ser un único número (sin unidades ni rangos dentro).
  Si el texto da un solo valor, ponlo como min y como max.
- No conviertas unidades: indica en "unidad" la unidad tal como aparece.
- El oxígeno es concentración en porcentaje (fracción molar x 100).
- Las frases de evidencia deben ser copias exactas de 5 a 30 palabras del texto.
- funcion_seguridad y entornos_relevantes son tu interpretación razonada;
  "fundamental" es para ciencia básica sin aplicación directa a seguridad.
"""

NUM_O_NULL = {"type": ["number", "null"]}
LISTA_TEXTO = {"type": "array", "items": {"type": "string"}}
TEXTO_O_NULL = {"type": ["string", "null"]}


def rango_schema(unidades=None):
    props = {"min": NUM_O_NULL, "max": NUM_O_NULL}
    if unidades:
        props["unidad"] = {"type": ["string", "null"], "enum": unidades + [None]}
    return {"type": "object", "properties": props, "required": list(props)}


# Esquema que el modelo debe respetar. Al usar una "herramienta", la API
# devuelve los datos ya como objeto JSON, sin que haya que leer texto libre.
HERRAMIENTA = {
    "name": "guardar_caracterizacion",
    "description": "Guarda la caracterización estructurada de una investigación de combustión.",
    "input_schema": {
        "type": "object",
        "properties": {
            "funcion_seguridad": {"type": "array", "items": {"type": "string", "enum": FUNCIONES}},
            "combustible": {
                "type": "object",
                "properties": {
                    "fases": {"type": "array", "items": {"type": "string", "enum": FASES}},
                    "materiales": {**LISTA_TEXTO, "description": "Nombres en inglés tal como aparecen"},
                    "geometrias": {**LISTA_TEXTO, "description": "gota, varilla, esfera, lamina, tela, quemador, cable..."},
                    "dimensiones": {**TEXTO_O_NULL, "description": "Tamaños de muestra o quemador"},
                },
                "required": ["fases", "materiales", "geometrias", "dimensiones"],
            },
            "oxigeno": rango_schema(),
            "presion": rango_schema(["kPa", "psi", "atm", "torr", "bar", "Pa"]),
            "flujo": rango_schema(["cm/s", "mm/s", "m/s"]),
            "configuracion_flujo": {"type": "array", "items": {"type": "string", "enum": FLUJOS}},
            "diluyentes": LISTA_TEXTO,
            "variables_estudiadas": LISTA_TEXTO,
            "mediciones": LISTA_TEXTO,
            "hallazgos_clave": {**TEXTO_O_NULL, "description": "1 o 2 frases en español sobre seguridad contra incendios"},
            "entornos_relevantes": {"type": "array", "items": {"type": "string", "enum": ENTORNOS}},
            "evidencia": {
                "type": "object",
                "description": "Frases copiadas literalmente del texto que respaldan cada dato",
                "properties": {k: TEXTO_O_NULL for k in
                               ("combustible", "oxigeno", "presion", "flujo", "diluyentes", "mediciones")},
            },
        },
        "required": ["funcion_seguridad", "combustible", "oxigeno", "presion", "flujo",
                     "configuracion_flujo", "diluyentes", "variables_estudiadas",
                     "mediciones", "hallazgos_clave", "entornos_relevantes", "evidencia"],
    },
}


def llamar_ia(texto):
    """Devuelve (datos, respuesta_cruda). datos es un dict ya estructurado."""
    clave = os.environ.get("ANTHROPIC_API_KEY")
    if not clave:
        sys.exit("Falta ANTHROPIC_API_KEY. Ponla en el archivo .env (ver LEEME).")
    cuerpo = {
        "model": MODELO,
        "max_tokens": 3000,
        "system": INSTRUCCIONES,
        "tools": [HERRAMIENTA],
        "tool_choice": {"type": "tool", "name": HERRAMIENTA["name"]},
        "messages": [{"role": "user", "content": texto}],
    }
    cabeceras = {
        "x-api-key": clave,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    for intento in range(3):
        r = requests.post(API_URL, headers=cabeceras, json=cuerpo, timeout=120)
        if r.status_code in (429, 500, 529):      # saturado: esperar y reintentar
            time.sleep(10 * (intento + 1))
            continue
        if r.status_code >= 400:
            raise RuntimeError(f"API {r.status_code}: {r.text[:300]}")
        crudo = r.json()
        for bloque in crudo.get("content", []):
            if bloque.get("type") == "tool_use":
                return bloque["input"], crudo
        raise ValueError(f"La respuesta no trae datos estructurados "
                         f"(stop_reason={crudo.get('stop_reason')})")
    raise RuntimeError("La API siguió saturada tras 3 intentos")


def caracterizar_ia(ficha):
    os.makedirs(os.path.join(CACHE, "crudo"), exist_ok=True)
    ruta_cache = os.path.join(CACHE, f"{ficha['id_psi']}.json")
    if os.path.exists(ruta_cache):               # no pagar dos veces lo mismo
        with open(ruta_cache, encoding="utf-8") as f:
            return json.load(f)
    datos, crudo = llamar_ia(texto_fuente(ficha))
    # La respuesta completa se guarda siempre, para poder diagnosticar
    with open(os.path.join(CACHE, "crudo", f"{ficha['id_psi']}.json"), "w", encoding="utf-8") as f:
        json.dump(crudo, f, ensure_ascii=False, indent=2)
    with open(ruta_cache, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    return datos


# ---------------------------------------------------------------------------
# Modo reglas (sin IA)
# ---------------------------------------------------------------------------

MATERIALES_CONOCIDOS = [
    "PMMA", "acrylic", "cotton", "fiberglass", "Nomex", "Ultem", "Delrin",
    "silicone", "polyethylene", "heptane", "n-heptane", "methanol", "ethanol",
    "decane", "dodecane", "propane", "ethylene", "methane", "hydrogen",
    "dimethyl ether", "isooctane", "SIBAL", "Kapton", "paper", "candle",
]
DILUYENTES_CONOCIDOS = ["CO2", "carbon dioxide", "helium", "He", "SF6",
                        "nitrogen", "N2", "argon", "xenon"]
PALABRAS_FLUJO = {
    "opuesto": r"opposed", "concurrente": r"concurrent", "coflujo": r"co-?flow",
    "contraflujo": r"counter-?flow", "quiescente": r"quiescent",
}
PALABRAS_FUNCION = {
    "supresion": r"suppress|extinguish", "deteccion": r"smoke detect|detector|aerosol",
    "prevencion": r"flammab|material selection|ignition",
}

NUM = r"(\d+(?:\.\d+)?)"


def rango(valores):
    return {"min": min(valores), "max": max(valores)} if valores else {"min": None, "max": None}


def caracterizar_reglas(ficha):
    t = texto_fuente(ficha)
    oxigeno = [float(x) for x in re.findall(NUM + r"\s*%\s*(?:O2|oxygen)", t, re.I)]
    oxigeno += [float(x) for x in re.findall(r"oxygen[^.%]{0,40}?" + NUM + r"\s*%", t, re.I)]
    oxigeno = [x for x in oxigeno if 0 < x <= 100]

    presiones = [(float(v), u.lower()) for v, u in re.findall(NUM + r"\s*(kPa|psi|atm|torr|bar)\b", t, re.I)]
    flujos = [(float(v), u.lower()) for v, u in re.findall(NUM + r"\s*(cm/s|mm/s|m/s)", t, re.I)]

    def con_unidad(lista):
        if not lista:
            return {"min": None, "max": None, "unidad": None}
        unidad = lista[0][1]
        vals = [v for v, u in lista if u == unidad]
        return {**rango(vals), "unidad": unidad}

    return {
        "funcion_seguridad": [k for k, p in PALABRAS_FUNCION.items() if re.search(p, t, re.I)],
        "combustible": {
            "fases": [], "geometrias": [], "dimensiones": None,
            "materiales": [m for m in MATERIALES_CONOCIDOS
                           if re.search(r"\b" + re.escape(m) + r"\b", t, re.I)],
        },
        "oxigeno": rango(oxigeno),
        "presion": con_unidad(presiones),
        "flujo": con_unidad(flujos),
        "configuracion_flujo": [k for k, p in PALABRAS_FLUJO.items() if re.search(p, t, re.I)],
        "diluyentes": [d for d in DILUYENTES_CONOCIDOS
                       if re.search(r"\b" + re.escape(d) + r"\b", t)],
        "variables_estudiadas": [], "mediciones": [], "hallazgos_clave": None,
        "entornos_relevantes": [], "evidencia": {},
    }


# ---------------------------------------------------------------------------
# Unir, convertir unidades y verificar
# ---------------------------------------------------------------------------

def a_numero(v):
    """Acepta 40, "40", "40 cm/s" o "0.5-1" (toma el primer número)."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r"-?\d+(?:\.\d+)?", str(v))
    return float(m.group()) if m else None


def rango_limpio(r):
    r = r or {}
    return {"min": a_numero(r.get("min")), "max": a_numero(r.get("max"))}


def convertir(rango_dato, tabla):
    unidad = (rango_dato or {}).get("unidad")
    factor = tabla.get(str(unidad).lower()) if unidad else None
    if factor is None:
        return {"min": None, "max": None}
    limpio = rango_limpio(rango_dato)
    return {k: round(v * factor, 3) if v is not None else None for k, v in limpio.items()}


def verificar_evidencia(evidencia, texto):
    """Comprueba que cada frase citada exista en el texto de PSI."""
    t = normalizar_espacios(texto)
    resultado = {}
    for campo, frase in (evidencia or {}).items():
        if not frase:
            continue
        resultado[campo] = normalizar_espacios(frase) in t
    return resultado


def advertencias(c, verif):
    avisos = []
    o = rango_limpio(c.get("oxigeno"))
    for k in ("min", "max"):
        if o.get(k) is not None and not 0 < o[k] <= 100:
            avisos.append(f"oxigeno {k} fuera de rango")
    no_halladas = [k for k, ok in verif.items() if not ok]
    if no_halladas:
        avisos.append("evidencia no encontrada en el texto: " + ", ".join(no_halladas))
    if not (c.get("combustible") or {}).get("materiales"):
        avisos.append("sin combustible identificado")
    return avisos


def fusionar(ficha, c, metodo):
    verif = verificar_evidencia(c.get("evidencia"), texto_fuente(ficha))
    comb = c.get("combustible") or {}
    ficha.update({
        "funcion_seguridad": c.get("funcion_seguridad", []),
        "combustible": {
            "fase": comb.get("fases", []),
            "material": comb.get("materiales", []),
            "geometria": comb.get("geometrias", []),
            "dimensiones": comb.get("dimensiones"),
        },
        "oxigeno_pct": rango_limpio(c.get("oxigeno")),
        "presion_kpa": convertir(c.get("presion"), A_KPA),
        "presion_original": c.get("presion"),
        "flujo_cm_s": convertir(c.get("flujo"), A_CM_S),
        "flujo_original": c.get("flujo"),
        "configuracion_flujo": c.get("configuracion_flujo", []),
        "diluyentes": c.get("diluyentes", []),
        "variables_estudiadas": c.get("variables_estudiadas", []),
        "mediciones": c.get("mediciones", []),
        "hallazgos_clave": c.get("hallazgos_clave"),
        "entornos_relevantes": c.get("entornos_relevantes", []),
    })
    ficha["trazabilidad"].update({
        "metodo_caracterizacion": metodo,
        "evidencia": c.get("evidencia", {}),
        "evidencia_verificada": verif,
        "advertencias": advertencias(c, verif),
        "verificado_por_humano": False,
    })
    return ficha


def fila_revision(f):
    lista = lambda x: "; ".join(map(str, x or []))
    tr = f["trazabilidad"]
    return {
        "id_psi": f["id_psi"], "sigla": f["sigla"], "metodo": tr["metodo_caracterizacion"],
        "funcion_seguridad": lista(f["funcion_seguridad"]),
        "fase": lista(f["combustible"]["fase"]),
        "material": lista(f["combustible"]["material"]),
        "geometria": lista(f["combustible"]["geometria"]),
        "dimensiones": f["combustible"]["dimensiones"],
        "o2_min_pct": f["oxigeno_pct"]["min"], "o2_max_pct": f["oxigeno_pct"]["max"],
        "p_min_kpa": f["presion_kpa"]["min"], "p_max_kpa": f["presion_kpa"]["max"],
        "flujo_min_cm_s": f["flujo_cm_s"]["min"], "flujo_max_cm_s": f["flujo_cm_s"]["max"],
        "configuracion_flujo": lista(f["configuracion_flujo"]),
        "diluyentes": lista(f["diluyentes"]),
        "mediciones": lista(f["mediciones"]),
        "entornos": lista(f["entornos_relevantes"]),
        "hallazgos": f["hallazgos_clave"],
        "advertencias": lista(tr["advertencias"]),
        "verificado_por_humano": tr["verificado_por_humano"],
    }


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "--ia"
    if modo not in ("--ia", "--reglas"):
        sys.exit("Usa --ia o --reglas")
    if not os.path.exists(ENTRADA):
        sys.exit(f"No existe {ENTRADA}. Ejecuta primero el comando 'metadatos'.")
    with open(ENTRADA, encoding="utf-8") as f:
        fichas = json.load(f)

    solo = os.environ.get("SOLO")          # p. ej. SOLO=PSI-69,PSI-26 para probar
    if solo:
        ids = {s.strip() for s in solo.split(",")}
        fichas = [f for f in fichas if f["id_psi"] in ids]

    resultado = []
    for i, ficha in enumerate(fichas, 1):
        etiqueta = f"[{i}/{len(fichas)}] {ficha['id_psi']} {ficha['sigla'] or ''}"
        try:
            if modo == "--ia":
                c, metodo = caracterizar_ia(ficha), f"IA ({MODELO})"
            else:
                c, metodo = caracterizar_reglas(ficha), "reglas"
            ficha = fusionar(ficha, c, metodo)
            avisos = ficha["trazabilidad"]["advertencias"]
            print(f"{etiqueta}: ok" + (f"  ⚠ {'; '.join(avisos)}" if avisos else ""))
        except Exception as e:
            print(f"{etiqueta}: ERROR {e}")
            ficha.setdefault("trazabilidad", {})["advertencias"] = [f"error: {e}"]
            ficha["trazabilidad"]["metodo_caracterizacion"] = "fallido"
        resultado.append(ficha)

    sufijo = "_ia" if modo == "--ia" else "_reglas"
    ruta_json = os.path.join(SALIDA, f"fichas_caracterizadas{sufijo}.json")
    ruta_csv = os.path.join(SALIDA, f"revision_caracterizacion{sufijo}.csv")
    with open(ruta_json, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    validas = [f for f in resultado if f["trazabilidad"].get("metodo_caracterizacion") != "fallido"]
    pd.DataFrame([fila_revision(f) for f in validas]).to_csv(ruta_csv, index=False)
    print(f"\nGuardado: {ruta_json}\n          {ruta_csv}")


if __name__ == "__main__":
    main()
