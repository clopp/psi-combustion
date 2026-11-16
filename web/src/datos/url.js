// Escenario <-> parámetros de la URL (puro: recibe y devuelve texto/objetos, sin DOM).
// ?entorno=rover&o2=30&p=70.3&u=kPa&material=tela&gravedad=lunar&flujo=suave&interes=prevencion,deteccion&lang=pt&examinar=1
// Valores inválidos se ignoran y quedan los del escenario base.
import { ENTORNOS, MATERIALES, GRAVEDADES, FLUJOS, INTERESES, A_KPA } from "./referencias.js";
import { aplicarEntorno, marcarPersonalizado, convertirPresion, RANGO_O2, RANGO_P_KPA, PERSONALIZADO } from "../dominio/escenario.js";

const IDS = (lista) => new Set(lista.map((x) => x.id));
const MAT = IDS(MATERIALES), GRAV = IDS(GRAVEDADES), FLU = IDS(FLUJOS), INT = IDS(INTERESES);
const IDIOMAS_URL = new Set(["es", "en", "zh", "pt"]);

// "30" -> 30 ; "30,5" -> 30.5 ; "" / "abc" / null -> null
function numero(v) {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const redondear = (n, d = 3) => Number(n.toFixed(d));

/**
 * @param {string|URLSearchParams} busqueda  "?o2=30&..." o URLSearchParams
 * @param {object} base  escenario por defecto
 * @returns {{ escenario, idioma: string|null, examinar: boolean, hayEscenario: boolean }}
 */
export function leerEscenarioUrl(busqueda, base) {
  const q = busqueda instanceof URLSearchParams ? busqueda : new URLSearchParams(String(busqueda || ""));
  let e = structuredClone(base);
  let hay = false;

  const entorno = q.get("entorno");
  if (entorno && ENTORNOS.some((x) => x.id === entorno)) {
    e = aplicarEntorno(e, entorno);
    hay = true;
  }

  const o2 = numero(q.get("o2"));
  if (o2 != null && o2 >= RANGO_O2.min && o2 <= RANGO_O2.max) {
    e.o2 = o2;
    hay = true;
  }

  const u = q.get("u");
  const unidad = u && A_KPA[u] ? u : null;
  if (unidad) {
    e.unidad = unidad;
    hay = true;
  }
  const p = numero(q.get("p"));
  if (p != null) {
    const kpa = convertirPresion(p, unidad || "kPa");
    if (kpa >= RANGO_P_KPA.min && kpa <= RANGO_P_KPA.max) {
      e.p = redondear(kpa);
      hay = true;
    }
  }

  for (const [clave, validos] of [["material", MAT], ["gravedad", GRAV], ["flujo", FLU]]) {
    const v = q.get(clave);
    if (v && validos.has(v)) {
      e[clave] = v;
      hay = true;
    }
  }

  if (q.has("interes")) {
    const lista = [...new Set(String(q.get("interes")).split(",").map((s) => s.trim()).filter((s) => INT.has(s)))];
    if (lista.length || q.get("interes") === "") {
      e.intereses = lista;
      hay = true;
    }
  }

  const lang = q.get("lang");
  return {
    escenario: marcarPersonalizado(e),
    idioma: lang && IDIOMAS_URL.has(lang) ? lang : null,
    examinar: q.get("examinar") === "1",
    hayEscenario: hay,
  };
}

/**
 * Escenario -> "entorno=...&o2=...&p=...&u=...&material=...&gravedad=...&flujo=...&interes=...&lang=..&examinar=1"
 * La presión se escribe en la unidad del escenario.
 */
export function escribirEscenarioUrl(e, { idioma = null, examinar = false } = {}) {
  const q = new URLSearchParams();
  if (e.entorno && e.entorno !== PERSONALIZADO) q.set("entorno", e.entorno);
  const unidad = A_KPA[e.unidad] ? e.unidad : "kPa";
  q.set("o2", String(redondear(e.o2, 2)));
  q.set("p", String(redondear(convertirPresion(e.p, "kPa", unidad), 3)));
  q.set("u", unidad);
  q.set("material", e.material);
  q.set("gravedad", e.gravedad);
  q.set("flujo", e.flujo);
  q.set("interes", (e.intereses || []).join(","));
  if (idioma) q.set("lang", idioma);
  if (examinar) q.set("examinar", "1");
  return q.toString();
}
