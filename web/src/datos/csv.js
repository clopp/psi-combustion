// CSV de resultados (portado de plantilla_v1.html, 1282-1306). Cabeceras e ids técnicos, sin frases.
import { COMPONENTES } from "./referencias.js";

const celda = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CABECERA_CSV = [
  "posicion", "id_psi", "nombre", "relevancia", "cobertura_datos", ...COMPONENTES.map((k) => "cercania_" + k),
  "tipo", "familia_hardware", "materiales", "categorias", "o2_min_pct", "o2_max_pct", "presion_min_kpa", "presion_max_kpa",
  "flujo_min_cm_s", "flujo_max_cm_s", "funcion_seguridad", "metodo_extraccion", "verificado_por_humano",
  "escenario_o2_pct", "escenario_presion_kpa", "escenario_material", "escenario_gravedad", "escenario_flujo",
];

export function construirCSV(lista, e) {
  const filas = lista.map((r, i) => {
    const inv = r.inv;
    return [i + 1, inv.id, inv.nombre, r.orden.toFixed(3), r.cobertura.toFixed(2),
      ...COMPONENTES.map((k) => (r.comp[k] == null ? "" : r.comp[k].toFixed(3))),
      inv.tierra ? "tierra" : "microgravedad", inv.familia, inv.materiales.join("; "), [...inv.categorias].join("; "),
      inv.o2?.min, inv.o2?.max, inv.p?.min, inv.p?.max, inv.flujo?.min, inv.flujo?.max,
      inv.funciones.join("; "), inv.metodo, inv.verificado, e.o2, Number(e.p).toFixed(2), e.material, e.gravedad, e.flujo,
    ].map(celda).join(",");
  });
  return "﻿" + [CABECERA_CSV.join(","), ...filas].join("\n");
}

export const nombreCSV = (e) => `relevancia_${e.entorno || "personalizado"}_${e.o2}O2_${Math.round(e.p)}kPa.csv`;
