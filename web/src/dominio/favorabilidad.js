// Favorabilidad para un incendio frente a la ISS (portado de plantilla_v1.html, 1350-1420).
// Reglas y fuentes científicas sin cambios. Devuelve ids y valores; la UI traduce con
// t(`fuego.${id}.${variante}`, vars) y t(`fuego.nivel.${nivel.id}`).

export const REF_ISS = { o2: 21, p: 101.3, gravedad: "micro", flujo: "suave", material: "tela" };
// Límite de oxígeno (%) por debajo del cual la llama no se sostiene.
export const LIMITE_O2 = { micro: 15, lunar: 15, marciana: 15, terrestre: 18 };
// El nivel es el primero cuyo total sea menor que max.
export const NIVELES_FUEGO = [
  { id: "menor", max: -1 },
  { id: "similar", max: 1 },
  { id: "mayor", max: 3 },
  { id: "mucho", max: Infinity },
];
export const PUNTOS_MATERIAL = { tela: 0, espuma: 0.5, plastico: -0.5, liquido: 0, gas: 0.5, ignifugo: -1.5 };
// Atmósfera de combustión aumentada: más de 31,4 % de O2 con presión reducida (< 90 kPa).
export const UMBRAL_O2_AUMENTADA = 31.4;
export const PRESION_REDUCIDA_KPA = 90;
export const DELTA_PRESION_REDUCIDA = -0.5;

export const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

const GRAVEDAD = {
  micro: { delta: 0, fuente: ["SoFIE-MIST"] },
  lunar: { delta: 1, fuente: ["FM2"] },
  marciana: { delta: 0.5, fuente: ["FM2"] },
  terrestre: { delta: -1, fuente: ["SoFIE-MIST"] },
};

export function nivelPorTotal(total) {
  return NIVELES_FUEGO.find((n) => total < n.max);
}

export function factoresFuego(e) {
  const f = [];

  const dO2 = e.o2 - 21;
  f.push({
    id: "oxigeno",
    delta: limitar(dO2 / 4, -2, 4),
    variante: dO2 > 0.05 ? "sube" : dO2 < -0.05 ? "baja" : "igual",
    vars: { d: Math.abs(dO2) },
    fuente: ["BASS-II", "SoFIE-MIST"],
  });

  // < 90 kPa: con O2 > 31,4 % es atmósfera de combustión aumentada (+1); con O2 ≤ 31,4 %
  // la combustión es más lenta que a presión normal (−0,5).
  const reducida = e.p < PRESION_REDUCIDA_KPA;
  const aumentada = e.o2 > UMBRAL_O2_AUMENTADA && reducida;
  f.push({
    id: "presion",
    delta: aumentada ? 1 : reducida ? DELTA_PRESION_REDUCIDA : 0,
    variante: aumentada ? "aumentada" : reducida ? "reducida" : "similar",
    vars: { umbral: UMBRAL_O2_AUMENTADA },
    fuente: ["NASA"],
  });

  let dF = 0;
  let vF;
  if (e.gravedad !== "micro") vF = "gravedad";
  else if (e.flujo === "quieto") {
    if (e.o2 >= 30) vF = "quieto_alto";
    else { dF = -1; vF = "quieto"; }
  } else vF = e.flujo === "suave" ? "suave" : "fuerte";
  f.push({ id: "flujo", delta: dF, variante: vF, vars: {}, fuente: ["BASS"] });

  const g = GRAVEDAD[e.gravedad];
  f.push({ id: "gravedad", delta: g.delta, variante: e.gravedad, vars: {}, fuente: g.fuente });

  f.push({
    id: "material",
    delta: PUNTOS_MATERIAL[e.material] ?? 0,
    variante: e.material,
    vars: {},
    fuente: ["BASS", "Saffire"],
  });

  const vivo = e.o2 >= LIMITE_O2[e.gravedad];
  let total = f.reduce((a, x) => a + x.delta, 0);
  if (!vivo) total = Math.min(total, -1.5);
  return { factores: f, total, vivo, nivel: nivelPorTotal(total) };
}

// Posición (0-100 %) en el medidor de 4 tramos: [-3,-1] [-1,1] [1,3] [3,5].
export function posicionMedidor(total) {
  const tramos = [[-3, -1], [-1, 1], [1, 3], [3, 5]];
  const v = limitar(total, -3, 5);
  for (let i = 0; i < 4; i++) {
    const [a, b] = tramos[i];
    if (v <= b || i === 3) return (i + (v - a) / (b - a)) * 25;
  }
  return 100;
}
