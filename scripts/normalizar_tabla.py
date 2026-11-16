"""
Paso 2: convertir tablas de ensayos de PSI (Excel o CSV) en fichas de ensayo.

Flujo: leer la tabla -> renombrar columnas -> convertir unidades ->
normalizar textos -> validar -> guardar.

Las tablas van en datos/tablas/ y la configuración en datos/config_tablas.json.
No hace falta editar este archivo para añadir investigaciones.

Modos:
  normalizar_tabla.py                      normaliza según config_tablas.json
  normalizar_tabla.py --ver-columnas X     muestra columnas y primeras filas de X
  normalizar_tabla.py --demo               prueba con una tabla inventada
"""
import json
import os
import sys

import pandas as pd

DATOS = os.environ.get("DATOS_DIR", "datos")
TABLAS = os.path.join(DATOS, "tablas")
SALIDA = os.path.join(DATOS, "salida")
CONFIG_PATH = os.path.join(DATOS, "config_tablas.json")

# --- Conversión de unidades: todo se lleva a kPa, % de O2 y cm/s ----------
A_KPA = {"kpa": 1.0, "psi": 6.894757, "atm": 101.325, "torr": 0.133322, "bar": 100.0}
A_CM_S = {"cm/s": 1.0, "mm/s": 0.1, "m/s": 100.0}

# --- Vocabulario común ----------------------------------------------------
SINONIMOS_MATERIAL = {
    "acrylic": "PMMA", "plexiglas": "PMMA", "pmma": "PMMA",
    "n-heptane": "heptano", "heptane": "heptano",
    "methanol": "metanol", "ethanol": "etanol",
}

CONFIG_DEMO = {
    "EJEMPLO": {
        "archivo": "ejemplo_matriz_ensayos.csv",
        "filas_a_saltar": 0,
        "hoja": None,
        "columnas": {
            "Test ID": "id_ensayo",
            "Fuel": "material",
            "O2 (%)": "oxigeno_pct",
            "Pressure": "presion",
            "Flow velocity": "flujo",
            "Extinguished": "se_extinguio",
        },
        "unidades": {"presion": "psi", "flujo": "mm/s"},
        "constantes": {"fase": "solido", "geometria": "varilla"},
    }
}


def leer(cfg):
    ruta = os.path.join(TABLAS, cfg["archivo"])
    if not os.path.exists(ruta):
        raise FileNotFoundError(f"No existe {ruta}. Copia el archivo a datos/tablas/.")
    if ruta.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(ruta, sheet_name=cfg.get("hoja") or 0,
                             skiprows=cfg.get("filas_a_saltar", 0))
    return pd.read_csv(ruta, skiprows=cfg.get("filas_a_saltar", 0))


def ver_columnas(archivo, filas_a_saltar=0):
    """Ayuda para escribir la configuración: muestra cómo es la tabla."""
    df = leer({"archivo": archivo, "filas_a_saltar": filas_a_saltar})
    print(f"Archivo: {archivo}  ({len(df)} filas)\n")
    print("Columnas encontradas:")
    for c in df.columns:
        print(f"  - {str(c).strip()!r}")
    print("\nPrimeras filas:")
    print(df.head().to_string(index=False))


def normalizar(sigla, cfg):
    df = leer(cfg)
    df.columns = df.columns.astype(str).str.strip()
    faltan = set(cfg["columnas"]) - set(df.columns)
    if faltan:
        raise ValueError(f"{sigla}: no encuentro las columnas {faltan}. "
                         f"Columnas del archivo: {list(df.columns)}")

    df = df[list(cfg["columnas"])].rename(columns=cfg["columnas"])

    u = cfg.get("unidades", {})
    if "presion" in df:
        df["presion_kpa"] = pd.to_numeric(df.pop("presion"), errors="coerce") * A_KPA[u.get("presion", "kpa").lower()]
    if "flujo" in df:
        df["flujo_cm_s"] = pd.to_numeric(df.pop("flujo"), errors="coerce") * A_CM_S[u.get("flujo", "cm/s").lower()]
    if "oxigeno_pct" in df:
        df["oxigeno_pct"] = pd.to_numeric(df["oxigeno_pct"], errors="coerce")

    if "material" in df:
        df["material"] = (df["material"].astype(str).str.strip().str.lower()
                          .map(lambda m: SINONIMOS_MATERIAL.get(m, m)))
    if "se_extinguio" in df:
        df["se_extinguio"] = (df["se_extinguio"].astype(str).str.strip().str.lower()
                              .isin(["yes", "y", "true", "1", "si", "sí"]))

    for campo, valor in cfg.get("constantes", {}).items():
        df[campo] = valor

    df["investigacion"] = sigla
    df["fuente"] = cfg["archivo"]
    df["metodo_extraccion"] = "tabla (pandas)"
    return validar(df, sigla)


def validar(df, sigla):
    """Marca valores imposibles o vacíos en vez de borrarlos en silencio."""
    problemas = pd.Series("", index=df.index)
    if "oxigeno_pct" in df:
        problemas[~df["oxigeno_pct"].between(0, 100)] += "O2 fuera de 0-100; "
    if "presion_kpa" in df:
        problemas[~df["presion_kpa"].between(0, 200)] += "presión sospechosa; "
    df["advertencias"] = problemas.str.strip()
    n = (df["advertencias"] != "").sum()
    print(f"{sigla}: {len(df)} ensayos, {n} con advertencias para revisar")
    return df


def ejecutar(config):
    os.makedirs(SALIDA, exist_ok=True)
    tablas, errores = [], []
    for sigla, cfg in config.items():
        if sigla.startswith("_"):          # claves de comentario
            continue
        try:
            tablas.append(normalizar(sigla, cfg))
        except Exception as e:             # una tabla mala no detiene las demás
            errores.append(f"{sigla}: {e}")
    if errores:
        print("\nErrores:")
        for e in errores:
            print("  ", e)
    if not tablas:
        print("No se normalizó ninguna tabla.")
        return
    ensayos = pd.concat(tablas, ignore_index=True)
    ensayos.to_json(os.path.join(SALIDA, "fichas_ensayo.json"),
                    orient="records", force_ascii=False, indent=2)
    ensayos.to_csv(os.path.join(SALIDA, "fichas_ensayo.csv"), index=False)
    print(f"\n{len(ensayos)} ensayos guardados en {SALIDA}/fichas_ensayo.json y .csv")


def demo():
    os.makedirs(TABLAS, exist_ok=True)
    # Tabla INVENTADA solo para probar. No son datos de PSI.
    pd.DataFrame({
        "Test ID ": ["T01", "T02", "T03"],
        "Fuel": ["Acrylic", "PMMA", "Plexiglas"],
        "O2 (%)": [21, 17.5, 140],          # 140 es un error a propósito
        "Pressure": [14.7, 10.2, 14.7],
        "Flow velocity": [200, 50, 10],
        "Extinguished": ["No", "Yes", "yes"],
    }).to_csv(os.path.join(TABLAS, "ejemplo_matriz_ensayos.csv"), index=False)
    ejecutar(CONFIG_DEMO)


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--demo":
        demo()
    elif args and args[0] == "--ver-columnas":
        if len(args) < 2:
            sys.exit("Indica el archivo: columnas <archivo> [filas_a_saltar]")
        ver_columnas(args[1], int(args[2]) if len(args) > 2 else 0)
    else:
        if not os.path.exists(CONFIG_PATH):
            sys.exit(f"No existe {CONFIG_PATH}. Usa config_tablas.ejemplo.json como base.")
        with open(CONFIG_PATH, encoding="utf-8") as f:
            ejecutar(json.load(f))
