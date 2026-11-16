// Puntaje de relevancia sin IA (portado de plantilla_v1.html, 709-762 y 1055-1061).
// Devuelve valores; la UI traduce con t(`componente.${k}`) y t(`nivel.${id}`).
import { MATERIALES, FLUJOS, PESOS_INICIALES } from "../datos/referencias.js";

export { PESOS_INICIALES };

// Cercanía 1 dentro del rango; decrece con la distancia al borde. null si no hay rango.
export function cercaniaRango(valor, r, fnDistancia) {
  if (!r) return null;
  if (valor >= r.min && valor <= r.max) return 1;
  const borde = valor < r.min ? r.min : r.max;
  return Math.max(0, 1 - fnDistancia(valor, borde));
}
export const distO2 = (v, b) => Math.abs(v - b) / 10;
export const distP = (v, b) => (v > 0 && b > 0 ? Math.abs(Math.log(v / b)) / Math.log(2) : 1);

// Cercanía por componente: número 0-1, null = sin dato, undefined = no cuenta.
export function componentes(inv, sc) {
  const c = {};
  c.oxigeno = cercaniaRango(sc.o2, inv.o2, distO2);
  c.presion = cercaniaRango(sc.p, inv.p, distP);

  const fase = MATERIALES.find((m) => m.id === sc.material)?.fase;
  if (inv.categorias.size === 0 && inv.fases.size === 0) c.material = null;
  else if (inv.categorias.has(sc.material)) c.material = 1;
  else if (fase && inv.fases.has(fase)) c.material = 0.5;
  else c.material = 0;

  if (sc.gravedad === "micro") c.gravedad = inv.gravedad === "micro" ? 1 : 0.3;
  else if (sc.gravedad === "terrestre") c.gravedad = inv.gravedad === "1g" ? 1 : 0.3;
  else c.gravedad = 0.6;

  const fu = FLUJOS.find((x) => x.id === sc.flujo);
  if (!inv.flujo || !fu) c.flujo = null;
  else if (inv.flujo.max >= fu.min && inv.flujo.min <= fu.max) c.flujo = 1;
  else {
    const d = inv.flujo.max < fu.min ? fu.min - inv.flujo.max : inv.flujo.min - fu.max;
    c.flujo = Math.max(0, 1 - d / 20);
  }

  const intereses = sc.intereses || [];
  if (intereses.length === 0) c.interes = undefined;
  else if (inv.funciones.length === 0) c.interes = null;
  else c.interes = inv.funciones.some((x) => intereses.includes(x)) ? 1 : 0;
  return c;
}

export function evaluar(inv, sc, pesos = PESOS_INICIALES) {
  const comp = componentes(inv, sc);
  let suma = 0, pesoDatos = 0, pesoTotal = 0;
  for (const k of Object.keys(comp)) {
    if (comp[k] === undefined) continue;
    pesoTotal += pesos[k];
    if (comp[k] === null) continue;
    suma += pesos[k] * comp[k];
    pesoDatos += pesos[k];
  }
  const puntaje = pesoDatos > 0 ? suma / pesoDatos : 0;
  const cobertura = pesoTotal > 0 ? pesoDatos / pesoTotal : 0;
  return { id: inv.id, inv, comp, puntaje, cobertura, orden: puntaje * (0.6 + 0.4 * cobertura) };
}

// Niveles de relevancia (orden 0-1): alta ≥ 0,7; media ≥ 0,5; baja el resto.
export const NIVELES = [
  { id: "alta", min: 0.7 },
  { id: "media", min: 0.5 },
  { id: "baja", min: -1 },
];
export const nivelDe = (orden) => NIVELES.find((n) => orden >= n.min);

export function evaluarTodas(fichas, escenario, pesos = PESOS_INICIALES) {
  return fichas.map((f) => evaluar(f, escenario, pesos)).sort((a, b) => b.orden - a.orden);
}

// Conteo por nivel: { alta, media, baja }.
export function contarNiveles(lista) {
  const r = Object.fromEntries(NIVELES.map((n) => [n.id, 0]));
  for (const x of lista) r[nivelDe(x.orden).id]++;
  return r;
}
