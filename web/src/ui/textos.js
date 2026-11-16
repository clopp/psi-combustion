// Utilidades de texto compartidas por la UI (escape HTML, presión, condiciones, rangos).
import { t, fmt } from "../i18n/index.js";
import { convertirPresion } from "../dominio/escenario.js";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const DECIMALES_UNIDAD = { psi: 1, kPa: 1, atm: 2 };

export function textoPresion(kpa, unidad) {
  return `${fmt(convertirPresion(kpa, "kPa", unidad), DECIMALES_UNIDAD[unidad])} ${unidad}`;
}

// Material incluyendo "ignifugo" (solo lo usan las palancas).
export const nombreMaterial = (id) => t(`material.${id}`);

// "Tela, 21 % O₂, 14,7 psi, microgravedad, ventilación suave"
export function condicionesCorto(e, unidad = e.unidad || "psi") {
  return t("exp.condiciones_corto", {
    material: nombreMaterial(e.material),
    o2: fmt(e.o2),
    presion: textoPresion(e.p, unidad),
    gravedad: t(`gravedad_frase.${e.gravedad}`),
    flujo: t(`flujo_frase.${e.flujo}`),
  });
}

// Rango { min, max } con unidad, o "Sin dato".
export function textoRango(r, u) {
  if (!r) return t("ficha.sin_dato");
  return r.min === r.max ? t("ficha.valor", { v: fmt(r.min), u }) : t("ficha.rango", { min: fmt(r.min), max: fmt(r.max), u });
}

// Total de favorabilidad con signo: +3,3 · −1,5 · 0
export const signo = (d) => (d > 0.005 ? "+" : d < -0.005 ? "−" : "") + fmt(Math.abs(d), 1);

// Nombre visible de una ficha (sigla o "id (estudio en tierra)").
export const nombreFicha = (f) => (f.sigla ? f.sigla : f.tierra ? t("ficha.estudio_tierra", { id: f.id }) : f.id);
