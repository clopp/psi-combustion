// Operaciones puras sobre el escenario (portado de plantilla_v1.html, 886-897).
// Escenario: { o2, p (kPa), unidad, material, gravedad, flujo, intereses[], entorno }.
import { ENTORNOS, A_KPA } from "../datos/referencias.js";

export const PERSONALIZADO = "personalizado";
export const UNIDADES_PRESION = Object.keys(A_KPA);
export const RANGO_O2 = { min: 0, max: 100 };
export const RANGO_P_KPA = { min: 10, max: 200 };

// Convierte una presión entre unidades (psi, kPa, atm). Por defecto, a kPa.
export function convertirPresion(valor, desde, hacia = "kPa") {
  if (valor == null || !A_KPA[desde] || !A_KPA[hacia]) return null;
  return (valor * A_KPA[desde]) / A_KPA[hacia];
}

export function aplicarEntorno(esc, idEntorno) {
  const en = ENTORNOS.find((x) => x.id === idEntorno);
  if (!en) return { ...esc, entorno: PERSONALIZADO };
  return { ...esc, entorno: en.id, o2: en.o2, p: en.p, gravedad: en.gravedad, flujo: en.flujo };
}

// Si el escenario ya no coincide con su entorno (O2, presión, gravedad, flujo), pasa a personalizado.
export function marcarPersonalizado(esc) {
  const en = ENTORNOS.find((x) => x.id === esc.entorno);
  if (en && (en.o2 !== esc.o2 || Math.abs(en.p - esc.p) > 0.05 || en.gravedad !== esc.gravedad || en.flujo !== esc.flujo)) {
    return { ...esc, entorno: PERSONALIZADO };
  }
  return esc;
}

// Aplica un cambio parcial, acotando O2 y presión, y marca personalizado si corresponde.
export function cambiarEscenario(esc, parcial) {
  const nuevo = { ...esc, ...parcial };
  if (parcial.o2 != null) nuevo.o2 = Math.min(RANGO_O2.max, Math.max(RANGO_O2.min, parcial.o2));
  if (parcial.p != null) nuevo.p = Math.max(0.1, parcial.p);
  return marcarPersonalizado(nuevo);
}

export function alternarInteres(esc, id) {
  const s = new Set(esc.intereses);
  s.has(id) ? s.delete(id) : s.add(id);
  return { ...esc, intereses: [...s] };
}
