// Detección de vacíos de información sin IA (portado de plantilla_v1.html, 763-823).
// Devuelve ids y valores; la UI traduce con t(`vacio.${id}...`, vars).
export const cubreO2 = (inv, v) => !!inv.o2 && v >= inv.o2.min - 2 && v <= inv.o2.max + 2;
export const cubreP = (inv, v) => !!inv.p && v >= inv.p.min * 0.9 && v <= inv.p.max * 1.1;

// Ficha cuyo rango en `campo` queda más cerca de `valor`: { id, min, max } o null.
export function masCercana(lista, campo, valor, distancia) {
  let mejor = null;
  for (const inv of lista) {
    const r = inv[campo];
    if (!r) continue;
    const d = valor < r.min ? distancia(valor, r.min) : valor > r.max ? distancia(valor, r.max) : 0;
    if (!mejor || d < mejor.d) mejor = { d, id: inv.id, min: r.min, max: r.max };
  }
  return mejor && { id: mejor.id, min: mejor.min, max: mejor.max };
}

export const CAMPOS_COMPLETITUD = [
  ["oxigeno", (i) => !!i.o2],
  ["presion", (i) => !!i.p],
  ["material", (i) => i.categorias.size > 0],
  ["flujo", (i) => !!i.flujo],
  ["verificadas", (i) => !!i.verificado],
];

// Cuántas fichas tienen cada dato (no depende del escenario): [{ campo, con, total, sin: [ids] }]
export function calcularCompletitud(fichas) {
  return CAMPOS_COMPLETITUD.map(([campo, tiene]) => {
    const sin = fichas.filter((i) => !tiene(i)).map((i) => i.id);
    return { campo, con: fichas.length - sin.length, total: fichas.length, sin };
  });
}

export function detectarVacios(fichas, sc) {
  const ids = (l) => l.map((i) => i.id);
  const conMat = fichas.filter((i) => i.categorias.has(sc.material));
  const conO2 = fichas.filter((i) => cubreO2(i, sc.o2));
  const conP = fichas.filter((i) => cubreP(i, sc.p));
  const r = { combinaciones: [], condiciones: [], gravedad: null, completitud: calcularCompletitud(fichas), total: 0 };

  if (conO2.length === 0)
    r.condiciones.push({ id: "oxigeno", vars: { o2: sc.o2 }, cercana: masCercana(fichas, "o2", sc.o2, (a, b) => Math.abs(a - b)) });
  if (conP.length === 0)
    r.condiciones.push({ id: "presion", vars: { p: sc.p }, cercana: masCercana(fichas, "p", sc.p, (a, b) => Math.abs(Math.log(a / b))) });
  if (conMat.length === 0) {
    r.condiciones.push({ id: "material", vars: { material: sc.material }, cercana: null });
  } else {
    if (conO2.length && !conMat.some((i) => cubreO2(i, sc.o2)))
      r.combinaciones.push({ id: "material_oxigeno", vars: { material: sc.material, o2: sc.o2 }, a: ids(conMat), b: ids(conO2) });
    if (conP.length && !conMat.some((i) => cubreP(i, sc.p)))
      r.combinaciones.push({ id: "material_presion", vars: { material: sc.material, p: sc.p }, a: ids(conMat), b: ids(conP) });
  }
  if (sc.gravedad === "lunar" || sc.gravedad === "marciana") r.gravedad = { id: sc.gravedad };

  r.total = r.combinaciones.length + r.condiciones.length + (r.gravedad ? 1 : 0);
  return r;
}
