// Recomendaciones y palancas (portado de plantilla_v1.html, 1533-1567).
// Cada elemento: { grupo, id, clave, vars, investigaciones[] }.
// Texto: t(`rec.${id}.titulo`), t(`rec.${id}.texto`, vars) · t(`palanca.${id}.titulo`), t(`palanca.${id}.nota`).
import { factoresFuego } from "./favorabilidad.js";

export const GRUPOS_RECOMENDACION = ["prevencion", "deteccion", "supresion"];

const rec = (grupo, id, investigaciones, clave = false, vars = {}) => ({ grupo, id, clave, vars, investigaciones });

export function recomendacionesPara(e) {
  const f = factoresFuego(e);
  const prev = [];
  if (e.o2 > 21) prev.push(rec("prevencion", "probar_oxigeno", ["BASS-II", "SAFFIRE-I", "SAFFIRE-II", "SAFFIRE-III"], true, { o2: e.o2 }));
  if (e.o2 > 31.4 && e.p < 90) prev.push(rec("prevencion", "combustion_aumentada", [], true));
  if (["tela", "espuma"].includes(e.material)) prev.push(rec("prevencion", "telas_ignifugas", ["BASS"]));
  if (e.gravedad === "lunar" || e.gravedad === "marciana") prev.push(rec("prevencion", "gravedad_parcial", [], true));
  if (!prev.length) prev.push(rec("prevencion", "mantener_materiales", ["BASS"]));

  const det = [];
  if (e.gravedad === "micro" && e.flujo !== "quieto") det.push(rec("deteccion", "llamas_pequenas", ["SAME", "SAME-R"], f.nivel.id !== "menor"));
  det.push(rec("deteccion", "calibrar_detectores", ["SAME", "SAME-R", "DAFT / DAFT-2"]));

  const sup = [rec("supresion", "dilucion", ["FLEX", "FLEX-2"])];
  if (e.gravedad === "micro" && e.o2 >= 30) sup.push(rec("supresion", "cortar_no_basta", ["BASS-II"], true));
  else if (e.gravedad === "micro") sup.push(rec("supresion", "cortar_ayuda", ["BASS"]));

  return [...prev, ...det, ...sup];
}

// Agrupa la lista: { prevencion: [...], deteccion: [...], supresion: [...] }
export function agruparRecomendaciones(lista) {
  const r = Object.fromEntries(GRUPOS_RECOMENDACION.map((g) => [g, []]));
  for (const x of lista) r[x.grupo].push(x);
  return r;
}

// Ajustes que el usuario podría probar. Añade cambio, diferencia (de total), nivel y mejor.
export function palancasPara(e) {
  const base = factoresFuego(e);
  const lista = [];
  const pal = (id, cambio) => lista.push({ grupo: "palanca", id, clave: false, vars: { ...cambio }, investigaciones: [], cambio });
  if (e.o2 > 26.5) pal("o2_265", { o2: 26.5 });
  if (e.o2 > 21) pal("o2_21", { o2: 21 });
  if (!["gas", "liquido"].includes(e.material)) pal("ignifugo", { material: "ignifugo" });
  if (e.gravedad === "micro" && e.flujo !== "quieto") pal("quieto", { flujo: "quieto" });
  if (e.gravedad === "micro" && e.flujo === "quieto") pal("suave", { flujo: "suave" });
  for (const pa of lista) {
    const r = factoresFuego({ ...e, ...pa.cambio });
    pa.diferencia = r.total - base.total;
    pa.nivel = r.nivel;
  }
  const mejor = lista.filter((x) => x.diferencia < -0.01).sort((a, b) => a.diferencia - b.diferencia)[0];
  if (mejor) mejor.clave = true;
  return lista;
}
