// Mapa SVG de condiciones: O2 (%) en X, presión (kPa, log) en Y (ref. plantilla_v1.html 936-1026).
// mapaSVG({ ancho, alto, vista, visibles, puntajes, entornos, escenario, etiquetaEscenario }) -> marcado del <svg>.
// Las coordenadas salen de dominio/mapa.js; aquí solo se arma el marcado. Los eventos los delega ui/mapa.
import { t, fmt } from "../../../i18n/index.js";
import { escalaO2, escalaPresion, clasificarParaMapa, marcasEjes, separarEtiquetas } from "../../../dominio/mapa.js";
import { esc, nombreFicha } from "../../textos.js";

export const MARGEN = { izq: 64, der: 18, arr: 14, aba: 46 };
const ALTO_ETQ = 14;
const anchoTexto = (s, px = 6.4) => s.length * px + 6;

// visibles: fichas normalizadas a dibujar · puntajes: Map id -> { orden, nivel, top } (o vacío sin examen)
export function mapaSVG({ ancho, alto, vista, visibles, puntajes, entornos, escenario, etiquetaEscenario }) {
  const W = ancho - MARGEN.izq - MARGEN.der;
  const H = alto - MARGEN.arr - MARGEN.aba;
  const x = (o2) => MARGEN.izq + escalaO2(o2, W, vista.o2);
  const y = (p) => MARGEN.arr + escalaPresion(p, H, vista.kpa);
  const marcas = marcasEjes(vista);
  const porId = new Map(visibles.map((f) => [f.id, f]));
  let h = `<defs>
    <clipPath id="mapa-recorte"><rect x="${MARGEN.izq}" y="${MARGEN.arr}" width="${W}" height="${H}"/></clipPath>
    <radialGradient id="mapa-esfera">
      <stop offset="0" style="stop-color:var(--fuego-nucleo-1)"/>
      <stop offset="0.3" style="stop-color:var(--llama);stop-opacity:0.95"/>
      <stop offset="0.6" style="stop-color:var(--llama);stop-opacity:0.45"/>
      <stop offset="1" style="stop-color:var(--llama);stop-opacity:0"/>
    </radialGradient>
  </defs>`;

  // Rejilla y ejes
  h += `<rect class="fondo-grafico" x="${MARGEN.izq}" y="${MARGEN.arr}" width="${W}" height="${H}"/>`;
  for (const o of marcas.o2)
    h += `<line class="rejilla" x1="${x(o)}" y1="${MARGEN.arr}" x2="${x(o)}" y2="${MARGEN.arr + H}"/>
      <text class="marca-eje" x="${x(o)}" y="${MARGEN.arr + H + 16}" text-anchor="middle">${fmt(o, 0)}</text>`;
  for (const p of marcas.kpa)
    h += `<line class="rejilla" x1="${MARGEN.izq}" y1="${y(p)}" x2="${MARGEN.izq + W}" y2="${y(p)}"/>
      <text class="marca-eje" x="${MARGEN.izq - 8}" y="${y(p) + 4}" text-anchor="end">${fmt(p, 0)}</text>`;
  h += `<text class="eje-titulo" x="${MARGEN.izq + W / 2}" y="${alto - 8}" text-anchor="middle">${esc(t("mapa.eje_o2"))}</text>
    <text class="eje-titulo" transform="translate(16 ${MARGEN.arr + H / 2}) rotate(-90)" text-anchor="middle">${esc(t("mapa.eje_p"))}</text>`;

  // Investigaciones: bandas (debajo), rangos y puntos (encima). Las destacadas se dibujan al final.
  const { rangos, bandasO2, bandasPresion } = clasificarParaMapa(visibles);
  const clase = (id) => {
    const pr = puntajes.get(id);
    return !pr ? "" : pr.top ? " destacada" : pr.nivel === "baja" ? " tenue" : "";
  };
  const etiquetas = [];
  const grupo = (id, forma, etq) => {
    const f = porId.get(id);
    const nombre = nombreFicha(f);
    const c = clase(id);
    if (c === " destacada") etiquetas.push({ id, texto: nombre, x: etq.x, y: etq.y, ancho: anchoTexto(nombre), alto: ALTO_ETQ, clase: "etq-inv" });
    return { orden: c === " destacada" ? 2 : c === " tenue" ? 0 : 1,
      html: `<g class="inv${c}" tabindex="0" role="button" data-inv="${esc(id)}" aria-label="${esc(nombre)}">${forma}</g>` };
  };
  const formas = [];
  const x0 = MARGEN.izq, y0 = MARGEN.arr;
  for (const b of bandasO2) {
    const a = x(b.o2.min) - 3, w = Math.max(6, x(b.o2.max) - x(b.o2.min) + 6);
    formas.push(grupo(b.id, `<rect class="banda" x="${a}" y="${y0}" width="${w}" height="${H}"/>`, { x: a + w + 4, y: y0 + 14 }));
  }
  for (const b of bandasPresion) {
    const a = y(b.p.max) - 3, hh = Math.max(6, y(b.p.min) - y(b.p.max) + 6);
    formas.push(grupo(b.id, `<rect class="banda" x="${x0}" y="${a}" width="${W}" height="${hh}"/>`, { x: x0 + 6, y: a - 4 }));
  }
  for (const r of rangos) {
    if (r.punto) {
      formas.push(grupo(r.id, `<circle class="punto" cx="${x(r.o2.min)}" cy="${y(r.p.min)}" r="6"/>`, { x: x(r.o2.min) + 9, y: y(r.p.min) - 6 }));
    } else {
      const a = x(r.o2.min), w = Math.max(8, x(r.o2.max) - a);
      const b = y(r.p.max), hh = Math.max(8, y(r.p.min) - b);
      formas.push(grupo(r.id, `<rect x="${w === 8 ? a - 4 : a}" y="${hh === 8 ? b - 4 : b}" width="${w}" height="${hh}" rx="3"/>`, { x: a + w + 6, y: b + 12 }));
    }
  }
  formas.sort((a, b) => a.orden - b.orden);
  h += `<g clip-path="url(#mapa-recorte)">${formas.map((f) => f.html).join("")}</g>`;

  // Entornos de referencia (rombos, agrupados)
  for (const g of entornos) {
    const ex = x(g.o2), ey = y(g.p);
    const nombre = g.ids.map((id) => t(`entorno.${id}`)).join(", ");
    const derecha = ex > MARGEN.izq + W * 0.75;
    const w = anchoTexto(nombre, 6.8);
    etiquetas.push({ id: "ref-" + g.ids[0], texto: nombre, x: derecha ? ex - 10 - w : ex + 10, y: ey - 8, ancho: w, alto: ALTO_ETQ, clase: "etq-ref" });
    h += `<path class="ref" d="M${ex} ${ey - 6} L${ex + 6} ${ey} L${ex} ${ey + 6} L${ex - 6} ${ey} Z"><title>${esc(nombre)}</title></path>`;
  }

  // Etiquetas sin encimarse (desplazadas en vertical)
  const lim = { minY: y0 + 11, maxY: y0 + H - 4 };
  const puestas = separarEtiquetas(etiquetas.map((e) => ({ ...e, x: Math.min(e.x, MARGEN.izq + W - e.ancho) })), lim);
  h += puestas.map((e) => `<text class="${e.clase}" x="${Math.min(e.x, MARGEN.izq + W - e.ancho)}" y="${e.y}">${esc(e.texto)}</text>`).join("");

  // Escenario: esfera magenta luminosa
  const sx = x(escenario.o2), sy = y(escenario.p);
  h += `<g class="escenario-mapa" aria-hidden="true">
    <circle class="esfera-halo" cx="${sx}" cy="${sy}" r="24" fill="url(#mapa-esfera)"/>
    <circle class="esfera-nucleo" cx="${sx}" cy="${sy}" r="4.5"/>
    <title>${esc(etiquetaEscenario)}</title>
  </g>`;
  return h;
}

// Texto del tooltip de una ficha (HTML escapado).
export function tooltipHTML(f, pr) {
  const rango = (r, u) => (!r ? t("ficha.sin_dato") : r.min === r.max ? `${fmt(r.min)} ${u}` : `${fmt(r.min)} – ${fmt(r.max)} ${u}`);
  return `<b>${esc(nombreFicha(f))}</b>
    <span>${esc(t("mapa.tip_o2", { v: rango(f.o2, "%") }))}</span>
    <span>${esc(t("mapa.tip_p", { v: rango(f.p, "kPa") }))}</span>
    ${pr ? `<span>${esc(t("mapa.tip_rel", { v: fmt(pr.orden * 100, 0), nivel: t(`nivel.${pr.nivel}`) }))}</span>` : ""}
    <small>${esc(t("mapa.tip_ir"))}</small>`;
}
