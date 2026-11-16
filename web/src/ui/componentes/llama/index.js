// Llama ilustrativa en SVG (portada de plantilla_v1.html, 1421-1509).
// API: crearLlama(svg, prefijo) -> { actualizar(escenario, duracionMs), encender(escenario, duracionMs) }.
// Los colores salen de los tokens --fuego-* de tokens.css.
import { factoresFuego, PUNTOS_MATERIAL, limitar } from "../../../dominio/favorabilidad.js";

const REDUCIR_MOVIMIENTO = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };
const CLAVES_ANIMADAS = ["r", "elong", "inclinacion", "hollin", "opacidad", "brasa"];
const BASE = 160;

let coloresCache = null;
function colores() {
  if (coloresCache) return coloresCache;
  const css = getComputedStyle(document.documentElement);
  const c = (n) => css.getPropertyValue(`--fuego-${n}`).trim();
  coloresCache = {
    nucleo: [c("nucleo-1"), c("nucleo-2"), c("nucleo-3")],
    baseAzul: c("base-azul"), brasa: c("brasa"), ceniza: c("ceniza"),
    halo: [c("halo-frio"), c("halo-caliente")],
    ext: [[c("ext1-frio"), c("ext1-caliente")], [c("ext2-frio"), c("ext2-caliente")], [c("ext3-frio"), c("ext3-caliente")]],
  };
  return coloresCache;
}

// Efecto visual de la presión (solo la ilustración; no toca la favorabilidad).
// k = p / 101,3 kPa. k = 1 (ISS) no cambia nada; de k = 0,3 a 2 el radio va de ×0,85 a ×1,1
// y el hollín de −0,25 a +0,15, lineal en cada lado de la ISS.
const K_MIN = 0.3;
const K_MAX = 2;
export function efectoPresion(pKpa) {
  const k = limitar((Number(pKpa) || 101.3) / 101.3, K_MIN, K_MAX);
  if (k < 1) {
    const f = (1 - k) / (1 - K_MIN);
    return { escalaR: 1 - 0.15 * f, hollin: -0.25 * f };
  }
  const f = (k - 1) / (K_MAX - 1);
  return { escalaR: 1 + 0.1 * f, hollin: 0.15 * f };
}

export function paramsLlama(e) {
  const { vivo } = factoresFuego(e);
  const elong = { micro: 0, lunar: 0.35, marciana: 0.5, terrestre: 1 }[e.gravedad];
  const intensidad = limitar((e.o2 - 12) / 26, 0.18, 1.12) * (1 + (PUNTOS_MATERIAL[e.material] ?? 0) * 0.12);
  const inclinacion = e.gravedad === "micro" ? { quieto: 0, suave: 11, fuerte: 22 }[e.flujo] : { quieto: 0, suave: 4, fuerte: 9 }[e.flujo];
  const presion = efectoPresion(e.p);
  return {
    r: vivo ? (16 + 20 * intensidad) * presion.escalaR : 6,
    elong, inclinacion,
    hollin: limitar((e.o2 - 21) / 14 + elong * 0.45 + presion.hollin, 0, 1),
    opacidad: vivo ? limitar(0.5 + intensidad * 0.45, 0.5, 1) : 0,
    brasa: vivo ? 0 : 1,
    ritmo: elong > 0 ? (e.flujo === "fuerte" ? 0.9 : 1.4) : ({ quieto: 3.6, suave: 2.4, fuerte: 1.5 }[e.flujo]),
  };
}

export function rutaLlama(cx, base, r, elong) {
  const top = r * (1 + 2.1 * elong), k = 0.552 * r, cy = base - r;
  const c1y = cy - k * (1 + elong), c2x = k * (1 - 0.88 * elong);
  return `M${cx} ${base} C${cx + k} ${base} ${cx + r} ${cy + k} ${cx + r} ${cy} ` +
    `C${cx + r} ${c1y} ${cx + c2x} ${cy - top} ${cx} ${cy - top} ` +
    `C${cx - c2x} ${cy - top} ${cx - r} ${c1y} ${cx - r} ${cy} ` +
    `C${cx - r} ${cy + k} ${cx - k} ${base} ${cx} ${base} Z`;
}

export function mezclar(a, b, t) {
  const h = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function construirLlama(svg, p) {
  const C = colores();
  svg.setAttribute("viewBox", "0 0 160 200");
  svg.innerHTML = `<defs>
      <radialGradient id="${p}-g" cx="50%" cy="66%" r="62%"><stop offset="0"/><stop offset="0.55"/><stop offset="1"/></radialGradient>
      <radialGradient id="${p}-n" cx="50%" cy="72%" r="62%"><stop offset="0" stop-color="${C.nucleo[0]}"/><stop offset="0.55" stop-color="${C.nucleo[1]}"/><stop offset="1" stop-color="${C.nucleo[2]}" stop-opacity="0"/></radialGradient>
      <filter id="${p}-b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <g class="cuerpo"><g class="respira">
      <path class="halo" filter="url(#${p}-b)"/>
      <path class="exterior" fill="url(#${p}-g)"/>
      <ellipse class="base-azul" fill="${C.baseAzul}"/>
      <path class="nucleo" fill="url(#${p}-n)"/>
    </g></g>
    <g class="brasa"><circle cx="80" cy="158" r="9" fill="${C.brasa}" opacity="0.25" filter="url(#${p}-b)"/><circle cx="80" cy="158" r="3.5" fill="${C.ceniza}"/></g>`;
}

function dibujarLlama(svg, p, P) {
  const C = colores();
  const q = (s) => svg.querySelector(s);
  q(".cuerpo").setAttribute("transform", `rotate(${P.inclinacion.toFixed(2)} 80 ${BASE})`);
  q(".cuerpo").setAttribute("opacity", P.opacidad.toFixed(3));
  q(".halo").setAttribute("d", rutaLlama(80, BASE + P.r * 0.15, P.r * 1.32, P.elong));
  q(".halo").setAttribute("fill", mezclar(C.halo[0], C.halo[1], P.hollin));
  q(".halo").setAttribute("opacity", (0.38 + 0.3 * P.hollin).toFixed(2));
  q(".exterior").setAttribute("d", rutaLlama(80, BASE, P.r, P.elong));
  const stops = svg.querySelectorAll(`#${p}-g stop`);
  C.ext.forEach(([frio, caliente], i) => stops[i].setAttribute("stop-color", mezclar(frio, caliente, P.hollin)));
  stops[2].setAttribute("stop-opacity", "0.25");
  q(".nucleo").setAttribute("d", rutaLlama(80, BASE - P.r * 0.12, P.r * 0.52, P.elong));
  q(".nucleo").setAttribute("opacity", (P.hollin * 0.95).toFixed(3));
  const be = q(".base-azul");
  be.setAttribute("cx", 80); be.setAttribute("cy", BASE - P.r * 0.22);
  be.setAttribute("rx", (P.r * 0.72).toFixed(2)); be.setAttribute("ry", (P.r * 0.3).toFixed(2));
  be.setAttribute("opacity", (0.55 * P.elong).toFixed(3));
  q(".brasa").setAttribute("opacity", P.brasa.toFixed(3));
  const resp = q(".respira");
  resp.style.setProperty("--ritmo", P.ritmo + "s");
  resp.classList.toggle("parpadea", P.elong > 0.01);
}

export function crearLlama(svg, prefijo) {
  let actual = null;
  let anim = 0;
  construirLlama(svg, prefijo);

  function pintar(P) {
    dibujarLlama(svg, prefijo, P);
    actual = P;
  }

  function animarLlama(destino, duracion, desde = actual) {
    cancelAnimationFrame(anim);
    if (!desde || REDUCIR_MOVIMIENTO.matches || duracion <= 0) { pintar(destino); return; }
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / duracion), e = 1 - Math.pow(1 - k, 3);
      const P = { ...destino };
      for (const c of CLAVES_ANIMADAS) P[c] = desde[c] + (destino[c] - desde[c]) * e;
      pintar(P);
      if (k < 1) anim = requestAnimationFrame(paso);
    };
    anim = requestAnimationFrame(paso);
  }

  return {
    actualizar(escenario, duracionMs = 250) {
      animarLlama(paramsLlama(escenario), duracionMs);
    },
    // Enciende desde una brasa pequeña e invisible hasta la llama del escenario.
    encender(escenario, duracionMs = 850) {
      const P = paramsLlama(escenario);
      animarLlama(P, duracionMs, { ...P, r: 0.5, opacidad: 0, hollin: 0, brasa: 0 });
    },
  };
}
