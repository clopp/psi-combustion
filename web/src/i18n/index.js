// Traducción: t("clave", { var }) con interpolación {var}.
import { estado } from "../estado.js";
import es from "./es.js";
import en from "./en.js";
import zh from "./zh.js";
import pt from "./pt.js";

// El orden define el del selector: inglés primero.
export const DICCIONARIOS = { en, es, zh, pt };
export const IDIOMA_POR_DEFECTO = "en";
export const IDIOMAS = Object.keys(DICCIONARIOS);

export function idiomaActual() {
  return estado.obtener().idioma;
}

export function interpolar(texto, vars = {}) {
  return texto.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function t(clave, vars) {
  const dic = DICCIONARIOS[idiomaActual()] || es;
  const texto = dic[clave] ?? es[clave] ?? clave;
  return vars ? interpolar(texto, vars) : texto;
}

export function cambiarIdioma(id) {
  if (!DICCIONARIOS[id] || id === idiomaActual()) return;
  estado.actualizar({ idioma: id });
}

export const LOCALES = { es: "es-CO", en: "en-US", zh: "zh-CN", pt: "pt-BR" };
// Etiqueta BCP 47 para <html lang>.
export const ETIQUETAS_LANG = { es: "es", en: "en", zh: "zh-Hans", pt: "pt-BR" };

// Prioridad: ?lang= de la URL > idioma guardado > inglés por defecto.
export function idiomaInicial({ url = null, guardado = null } = {}) {
  if (DICCIONARIOS[url]) return url;
  if (DICCIONARIOS[guardado]) return guardado;
  return IDIOMA_POR_DEFECTO;
}

// Formateadores Intl en caché por idioma y opciones.
const cacheIntl = new Map();
function formateador(Tipo, opciones) {
  const loc = LOCALES[idiomaActual()] || LOCALES.es;
  const clave = `${Tipo.name}|${loc}|${JSON.stringify(opciones)}`;
  if (!cacheIntl.has(clave)) cacheIntl.set(clave, new Tipo(loc, opciones));
  return cacheIntl.get(clave);
}

// Número con separador decimal del idioma actual (coma en es y pt). null -> "—".
export function fmt(n, d = 1) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  return formateador(Intl.NumberFormat, { maximumFractionDigits: d }).format(Number(n));
}

export const fmtHora = (fecha) => formateador(Intl.DateTimeFormat, { hour: "2-digit", minute: "2-digit" }).format(new Date(fecha));
export const fmtFecha = (fecha) => formateador(Intl.DateTimeFormat, { dateStyle: "medium" }).format(new Date(fecha));

// Formatea las vars numéricas que devuelve el dominio antes de pasarlas a t().
export function formatearVars(vars = {}, d = 1) {
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === "number" ? fmt(v, d) : v]));
}

export const minuscula = (s) => s.charAt(0).toLowerCase() + s.slice(1);
