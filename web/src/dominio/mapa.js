// Mapa de condiciones: O2 (%) frente a presión (kPa, log). Funciones puras (ref. plantilla_v1.html 936-1026).
// Devuelve coordenadas, ids y valores; la UI dibuja y traduce.

export const VISTAS = {
  habitable: { o2: [10, 45], kpa: [15, 200] },
  todo: { o2: [0, 100], kpa: [10, 5000] },
};
export const VISTA_INICIAL = "habitable";

const recortar = (v, a, b) => Math.min(b, Math.max(a, v));

// O2 -> x en px (0 a ancho), recortado al rango de la vista.
export function escalaO2(valor, ancho, rango = VISTAS.todo.o2) {
  const [a, b] = rango;
  return ((recortar(valor, a, b) - a) / (b - a)) * ancho;
}

// Presión -> y en px (alto abajo, 0 arriba), logarítmica y recortada al rango de la vista.
export function escalaPresion(kpa, alto, rango = VISTAS.todo.kpa) {
  const [a, b] = rango;
  const c = recortar(kpa, a, b);
  return alto - ((Math.log10(c) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))) * alto;
}

// Marcas de los ejes dentro del rango de la vista.
const MARCAS_P = [10, 15, 20, 30, 50, 70, 100, 150, 200, 500, 1000, 2000, 5000];
export function marcasEjes(vista) {
  const [o0, o1] = vista.o2;
  const paso = o1 - o0 > 50 ? 10 : 5;
  const o2 = [];
  for (let v = Math.ceil(o0 / paso) * paso; v <= o1; v += paso) o2.push(v);
  const amplio = vista.kpa[1] / vista.kpa[0] > 50;
  const kpa = MARCAS_P.filter((p) => p >= vista.kpa[0] && p <= vista.kpa[1] && (!amplio || ![15, 30, 70, 150].includes(p)));
  return { o2, kpa };
}

// Clasifica las fichas según los datos que tienen:
// rangos (O2 y presión; punto = valor único en ambos), bandas de solo O2 o solo presión, y sin datos.
export function clasificarParaMapa(fichas) {
  const r = { rangos: [], bandasO2: [], bandasPresion: [], sinDatos: [] };
  for (const f of fichas) {
    if (f.o2 && f.p) r.rangos.push({ id: f.id, o2: f.o2, p: f.p, punto: f.o2.min === f.o2.max && f.p.min === f.p.max });
    else if (f.o2) r.bandasO2.push({ id: f.id, o2: f.o2 });
    else if (f.p) r.bandasPresion.push({ id: f.id, p: f.p });
    else r.sinDatos.push(f.id);
  }
  return r;
}

const LOG_P = Math.log10(VISTAS.todo.kpa[1] / VISTAS.todo.kpa[0]);
const fuera = (v, r, d) => (v < r.min ? d(v, r.min) : v > r.max ? d(v, r.max) : 0);
const dO2 = (a, b) => Math.abs(a - b) / 100;
const dP = (a, b) => Math.abs(Math.log10(a / b)) / LOG_P;

// Ficha con datos de O2 y presión más cercana al escenario { o2, p } (distancia normalizada en ambos ejes).
// Si ninguna tiene los dos datos, usa las bandas en su único eje. -> { id, distancia } o null
export function masCercanaEnMapa(fichas, escenario) {
  const { rangos, bandasO2, bandasPresion } = clasificarParaMapa(fichas);
  const candidatos = rangos.length
    ? rangos.map((f) => ({ id: f.id, distancia: Math.hypot(fuera(escenario.o2, f.o2, dO2), fuera(escenario.p, f.p, dP)) }))
    : [
        ...bandasO2.map((f) => ({ id: f.id, distancia: fuera(escenario.o2, f.o2, dO2) })),
        ...bandasPresion.map((f) => ({ id: f.id, distancia: fuera(escenario.p, f.p, dP) })),
      ];
  let mejor = null;
  for (const c of candidatos) if (!mejor || c.distancia < mejor.distancia) mejor = c;
  return mejor;
}

// Entornos de referencia agrupados por coordenadas (sin los de valores supuestos): [{ o2, p, ids }]
export function agruparEntornos(entornos) {
  const grupos = new Map();
  for (const e of entornos) {
    if (e.nota) continue;
    const clave = `${e.o2}|${e.p}`;
    if (!grupos.has(clave)) grupos.set(clave, { o2: e.o2, p: e.p, ids: [] });
    grupos.get(clave).ids.push(e.id);
  }
  return [...grupos.values()];
}

// Separa etiquetas { id, x, y, ancho, alto } (y = línea base): si una choca con otra ya puesta,
// la desplaza verticalmente (abajo y luego arriba) hasta que no choque, dentro de [minY, maxY].
export function separarEtiquetas(etiquetas, { minY = -Infinity, maxY = Infinity } = {}) {
  const puestas = [];
  const choca = (a, b) => a.x < b.x + b.ancho && b.x < a.x + a.ancho && Math.abs(a.y - b.y) < Math.max(a.alto, b.alto);
  for (const e of [...etiquetas].sort((a, b) => a.y - b.y)) {
    let elegida = { ...e, y: recortar(e.y, minY, maxY) };
    for (let k = 1; puestas.some((p) => choca(elegida, p)) && k < 40; k++) {
      const paso = Math.ceil(k / 2) * e.alto * (k % 2 ? 1 : -1);
      elegida = { ...e, y: recortar(e.y + paso, minY, maxY) };
    }
    puestas.push(elegida);
  }
  return etiquetas.map((e) => puestas.find((p) => p.id === e.id));
}
