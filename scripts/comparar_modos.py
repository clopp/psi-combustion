"""
Paso 3: comparar la caracterización con IA contra la de reglas.

Lee:
  datos/salida/fichas_caracterizadas_ia.json
  datos/salida/fichas_caracterizadas_reglas.json

Para cada investigación y cada campo, clasifica el resultado en:
  coinciden     los dos modos dan el mismo valor
  difieren      los dos dan un valor, pero distinto
  solo_ia       solo la IA encontró un valor
  solo_reglas   solo las reglas encontraron un valor
  ninguno       ninguno encontró nada (posible vacío en el texto de PSI)

Salidas en datos/salida/comparacion/:
  comparacion_detalle.csv    una fila por investigación y campo
  comparacion_resumen.csv    porcentajes por campo
  comparacion.json           todo junto, para el dashboard
"""
import json
import os
import sys

import pandas as pd

DATOS = os.environ.get("DATOS_DIR", "datos")
SALIDA = os.path.join(DATOS, "salida")
DESTINO = os.path.join(SALIDA, "comparacion")
TOLERANCIA = 0.02          # 2 % de diferencia relativa se considera igual


# Campos a comparar: nombre -> (función que saca el valor de la ficha, tipo)
def _get(ruta):
    def f(ficha):
        v = ficha
        for k in ruta:
            v = (v or {}).get(k)
        return v
    return f


CAMPOS = {
    "material":            (_get(["combustible", "material"]), "lista"),
    "funcion_seguridad":   (_get(["funcion_seguridad"]), "lista"),
    "configuracion_flujo": (_get(["configuracion_flujo"]), "lista"),
    "diluyentes":          (_get(["diluyentes"]), "lista"),
    "oxigeno_min_pct":     (_get(["oxigeno_pct", "min"]), "numero"),
    "oxigeno_max_pct":     (_get(["oxigeno_pct", "max"]), "numero"),
    "presion_min_kpa":     (_get(["presion_kpa", "min"]), "numero"),
    "presion_max_kpa":     (_get(["presion_kpa", "max"]), "numero"),
    "flujo_min_cm_s":      (_get(["flujo_cm_s", "min"]), "numero"),
    "flujo_max_cm_s":      (_get(["flujo_cm_s", "max"]), "numero"),
}

# Para comparar listas sin que "CO2" y "carbon dioxide" cuenten como distintos
EQUIVALENTES = {
    "carbon dioxide": "co2", "helium": "he", "nitrogen": "n2",
    "acrylic": "pmma", "n-heptane": "heptane",
}


def normalizar_lista(valores):
    out = set()
    for v in valores or []:
        t = str(v).strip().lower()
        out.add(EQUIVALENTES.get(t, t))
    return out


def comparar(v_ia, v_reg, tipo):
    if tipo == "lista":
        a, b = normalizar_lista(v_ia), normalizar_lista(v_reg)
        if not a and not b:
            return "ninguno", None
        if not b:
            return "solo_ia", None
        if not a:
            return "solo_reglas", None
        jaccard = len(a & b) / len(a | b)   # 1 = idénticas, 0 = nada en común
        return ("coinciden" if jaccard == 1 else "difieren"), round(jaccard, 2)

    vacio_ia, vacio_reg = v_ia is None, v_reg is None
    if vacio_ia and vacio_reg:
        return "ninguno", None
    if vacio_reg:
        return "solo_ia", None
    if vacio_ia:
        return "solo_reglas", None
    base = max(abs(v_ia), abs(v_reg), 1e-9)
    igual = abs(v_ia - v_reg) / base <= TOLERANCIA
    return ("coinciden" if igual else "difieren"), None


def texto(v):
    if isinstance(v, list):
        return "; ".join(map(str, v))
    return "" if v is None else v


def cargar(nombre):
    ruta = os.path.join(SALIDA, nombre)
    if not os.path.exists(ruta):
        sys.exit(f"No existe {ruta}. Ejecuta antes el modo correspondiente.")
    with open(ruta, encoding="utf-8") as f:
        return {fi["id_psi"]: fi for fi in json.load(f)}


def main():
    ia = cargar("fichas_caracterizadas_ia.json")
    reglas = cargar("fichas_caracterizadas_reglas.json")
    ids = sorted(set(ia) & set(reglas), key=lambda x: int(x.split("-")[1]))
    if not ids:
        sys.exit("No hay investigaciones en común entre los dos archivos.")

    filas = []
    for i in ids:
        f_ia, f_reg = ia[i], reglas[i]
        for campo, (sacar, tipo) in CAMPOS.items():
            v_ia, v_reg = sacar(f_ia), sacar(f_reg)
            estado, similitud = comparar(v_ia, v_reg, tipo)
            filas.append({
                "id_psi": i, "sigla": f_ia.get("sigla") or "", "campo": campo,
                "valor_ia": texto(v_ia), "valor_reglas": texto(v_reg),
                "estado": estado, "similitud_listas": similitud,
            })

    detalle = pd.DataFrame(filas)
    resumen = (detalle.groupby("campo")["estado"].value_counts(normalize=True)
               .mul(100).round(1).unstack(fill_value=0)
               .reindex(columns=["coinciden", "difieren", "solo_ia",
                                 "solo_reglas", "ninguno"], fill_value=0)
               .reindex(list(CAMPOS)))
    resumen.columns = [f"{c}_pct" for c in resumen.columns]

    os.makedirs(DESTINO, exist_ok=True)
    detalle.to_csv(os.path.join(DESTINO, "comparacion_detalle.csv"), index=False)
    resumen.to_csv(os.path.join(DESTINO, "comparacion_resumen.csv"))
    with open(os.path.join(DESTINO, "comparacion.json"), "w", encoding="utf-8") as f:
        json.dump({
            "investigaciones": len(ids),
            "tolerancia_numerica": TOLERANCIA,
            "resumen_por_campo": resumen.reset_index().to_dict(orient="records"),
            "detalle": detalle.where(detalle.notna(), None).to_dict(orient="records"),
        }, f, ensure_ascii=False, indent=2)

    print(f"Comparadas {len(ids)} investigaciones en {len(CAMPOS)} campos.\n")
    print(resumen.to_string())
    print(f"\nGuardado en {DESTINO}/")


if __name__ == "__main__":
    main()
