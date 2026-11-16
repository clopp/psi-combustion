// Mapa de condiciones: SVG grande (O2 vs presión log) + panel lateral con leyenda, vista, filtros,
// la más cercana a tu escenario y las investigaciones sin datos. "Ver como tabla" alterna una tabla.
// Clic o Enter en una investigación -> resaltada + #cobertura. Si se llega con `resaltada`, esa pulsa 2 veces.
import { estado } from "../../estado.js";
import { t, fmt } from "../../i18n/index.js";
import { ENTORNOS } from "../../datos/referencias.js";
import { nivelDe } from "../../dominio/relevancia.js";
import { VISTAS, clasificarParaMapa, masCercanaEnMapa, agruparEntornos } from "../../dominio/mapa.js";
import { mapaSVG, tooltipHTML } from "../componentes/mapa/index.js";
import { alCambiar } from "../observar.js";
import { traducir } from "../traducir.js";
import { irAInvestigacion, chipInvHTML } from "../navegar.js";
import { esc, nombreFicha } from "../textos.js";

const ENTORNOS_MAPA = agruparEntornos(ENTORNOS);
const ESCRITORIO = typeof matchMedia === "function" ? matchMedia("(min-width: 1200px) and (min-height: 680px)") : { matches: false };
const ANCHO_MIN = 640;

const ICONOS = {
  rango: `<rect class="ley-rango" x="1" y="3" width="16" height="10" rx="2"/>`,
  punto: `<circle class="ley-rango" cx="9" cy="8" r="5"/>`,
  banda: `<rect class="ley-banda" x="1" y="3" width="16" height="10" rx="2"/>`,
  destacada: `<rect class="ley-destacada" x="1" y="3" width="16" height="10" rx="2"/>`,
  entorno: `<path class="ley-ref" d="M9 2 L15 8 L9 14 L3 8 Z"/>`,
  escenario: `<circle class="ley-esfera" cx="9" cy="8" r="7"/><circle class="ley-nucleo" cx="9" cy="8" r="3"/>`,
};

export function montar(contenedor) {
  contenedor.innerHTML = `
  <div class="rejilla rejilla-mapa rejilla-ajustada">
    <div class="columna col-grafico">
      <section class="bloque bloque-mapa" aria-labelledby="titulo-mapa">
        <div class="mapa-cab">
          <div><h2 id="titulo-mapa" data-i18n="mapa.encabezado"></h2><p class="ayuda" data-i18n="mapa.ayuda"></p></div>
          <button type="button" class="boton-sec boton-chico" data-accion="tabla" aria-pressed="false" aria-controls="mapa-tabla"></button>
        </div>
        <div class="mapa-lienzo" data-zona="lienzo">
          <svg class="mapa" role="img" aria-labelledby="mapa-desc" focusable="false"></svg>
          <p id="mapa-desc" class="oculto"></p>
          <div class="mapa-tooltip" role="tooltip" id="mapa-tooltip" hidden></div>
        </div>
        <div class="tabla-envoltura mapa-tabla" id="mapa-tabla" data-zona="tabla" hidden></div>
      </section>
    </div>
    <div class="columna col-lateral">
      <section class="bloque bloque-lateral-mapa" aria-labelledby="titulo-leyenda">
        <h2 id="titulo-leyenda" data-i18n="mapa.leyenda"></h2>
        <ul class="leyenda-mapa">
          ${Object.entries({ rango: "mapa.ley_rango", punto: "mapa.ley_punto", banda: "mapa.ley_banda", destacada: "mapa.ley_destacada", entorno: "mapa.ley_entorno", escenario: "mapa.ley_escenario" })
            .map(([k, c]) => `<li><svg viewBox="0 0 18 16" width="18" height="16" aria-hidden="true">${ICONOS[k]}</svg><span data-i18n="${c}"></span></li>`).join("")}
        </ul>
        <div class="grupo-lateral">
          <h3 id="titulo-vista" data-i18n="mapa.vista"></h3>
          <div class="segmentado" role="group" aria-labelledby="titulo-vista">
            ${Object.keys(VISTAS).map((v) => `<button type="button" data-vista="${v}" data-i18n="mapa.vista.${v}"></button>`).join("")}
          </div>
        </div>
        <fieldset class="grupo-lateral filtros-mapa">
          <legend data-i18n="mapa.filtros"></legend>
          <label><input type="checkbox" data-filtro="tierra"> <span data-i18n="mapa.filtro_tierra"></span></label>
          <label><input type="checkbox" data-filtro="relevantes"> <span data-i18n="mapa.filtro_relevantes"></span></label>
          <p class="ayuda" data-zona="nota-filtro" data-i18n="mapa.filtro_relevantes_nota"></p>
        </fieldset>
        <div class="grupo-lateral">
          <h3 data-i18n="mapa.mas_cercana"></h3>
          <div class="chips" data-zona="cercana"></div>
        </div>
        <div class="grupo-lateral">
          <h3 data-i18n="mapa.sin_datos"></h3>
          <p class="ayuda" data-zona="sin-datos-ayuda"></p>
          <div class="chips" data-zona="sin-datos"></div>
        </div>
      </section>
    </div>
  </div>`;

  const zona = (id) => contenedor.querySelector(`[data-zona="${id}"]`);
  const lienzo = zona("lienzo");
  const svg = lienzo.querySelector("svg");
  const tip = lienzo.querySelector(".mapa-tooltip");
  const botonTabla = contenedor.querySelector('[data-accion="tabla"]');
  let verTabla = false;
  let ctx = null; // { porId, puntajes } del último dibujo
  let pulsoPendiente = null; // id que debe pulsar en el próximo dibujo visible

  const escenarioDe = (s) => s.examinado || s.escenario;

  function puntajesDe(s) {
    const m = new Map();
    (s.resultados?.lista || []).forEach((r, i) => m.set(r.inv.id, { orden: r.orden, nivel: nivelDe(r.orden).id, top: i < 5 }));
    return m;
  }
  function visiblesDe(s, puntajes) {
    const { tierra, relevantes } = s.filtrosMapa;
    return s.fichas.filter((f) => (tierra || !f.tierra) && !(relevantes && s.resultados && puntajes.get(f.id)?.nivel === "baja"));
  }

  function dibujarMapa(s) {
    const puntajes = puntajesDe(s);
    const visibles = visiblesDe(s, puntajes);
    ctx = { porId: new Map(s.fichas.map((f) => [f.id, f])), puntajes };
    const e = escenarioDe(s);
    const c = clasificarParaMapa(s.fichas);
    contenedor.querySelector("#mapa-desc").textContent = t("mapa.descripcion", {
      n: s.fichas.length, r: c.rangos.length, b: c.bandasO2.length + c.bandasPresion.length, s: c.sinDatos.length,
      o2: fmt(e.o2), p: fmt(e.p),
    });
    if (verTabla) { zona("tabla").innerHTML = tablaHTML(s, visibles, puntajes); return; }

    const ancho = Math.max(ANCHO_MIN, lienzo.clientWidth);
    if (!lienzo.clientWidth) return; // panel oculto: se dibuja al mostrarse (ResizeObserver)
    const alto = ESCRITORIO.matches ? Math.max(320, lienzo.clientHeight) : Math.round(Math.min(560, Math.max(380, ancho * 0.62)));
    svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    svg.setAttribute("width", ancho);
    svg.setAttribute("height", alto);
    svg.innerHTML = mapaSVG({
      ancho, alto, vista: VISTAS[s.vistaMapa] || VISTAS.habitable, visibles, puntajes, entornos: ENTORNOS_MAPA,
      escenario: e, etiquetaEscenario: t(s.examinado ? "mapa.escenario_examinado" : "mapa.escenario_actual"),
    });
    ocultarTip();
    if (pulsoPendiente) aplicarPulso();
  }

  function dibujarLateral(s) {
    contenedor.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === s.vistaMapa)));
    contenedor.querySelectorAll("[data-filtro]").forEach((c) => { c.checked = !!s.filtrosMapa[c.dataset.filtro]; });
    const rel = contenedor.querySelector('[data-filtro="relevantes"]');
    rel.disabled = !s.resultados;
    zona("nota-filtro").hidden = !!s.resultados;
    botonTabla.textContent = t(verTabla ? "mapa.ver_mapa" : "mapa.ver_tabla");
    botonTabla.setAttribute("aria-pressed", String(verTabla));

    const porId = new Map(s.fichas.map((f) => [f.id, f]));
    const chip = (id) => {
      const nombre = porId.has(id) ? nombreFicha(porId.get(id)) : id;
      return chipInvHTML(esc(id), esc(nombre), esc(t("alc.ir_inv", { sigla: nombre })));
    };
    const cercana = masCercanaEnMapa(s.fichas, escenarioDe(s));
    zona("cercana").innerHTML = cercana ? chip(cercana.id) : `<span class="ayuda">${esc(t("mapa.ninguna"))}</span>`;
    const sin = clasificarParaMapa(s.fichas).sinDatos;
    zona("sin-datos-ayuda").textContent = t("mapa.sin_datos_ayuda", { n: sin.length });
    zona("sin-datos").innerHTML = sin.map(chip).join("");
  }

  // Pulso de la investigación resaltada al llegar desde otra pestaña. Si el panel aún está oculto,
  // el pulso se aplica en el primer dibujo visible (ResizeObserver).
  function pulsarResaltada(s) {
    pulsoPendiente = s.resaltada;
    estado.actualizar({ resaltada: null });
    if (verTabla) { pulsoPendiente = null; return; }
    if (lienzo.clientWidth) aplicarPulso();
  }
  function aplicarPulso() {
    const g = svg.querySelector(`[data-inv="${CSS.escape(pulsoPendiente)}"]`);
    pulsoPendiente = null;
    if (!g) return;
    g.classList.add("pulso");
    g.addEventListener("animationend", (ev) => { if (ev.animationName === "pulso-mapa") g.classList.remove("pulso"); });
    g.focus({ preventScroll: true });
  }

  // Tooltip (cursor o foco)
  function mostrarTip(g, px, py) {
    const f = ctx?.porId.get(g.dataset.inv);
    if (!f) return;
    tip.innerHTML = tooltipHTML(f, ctx.puntajes.get(f.id));
    tip.hidden = false;
    const caja = lienzo.getBoundingClientRect();
    const izq = px - caja.left + lienzo.scrollLeft + 14;
    const arr = py - caja.top + lienzo.scrollTop + 14;
    tip.style.left = Math.min(izq, lienzo.scrollLeft + lienzo.clientWidth - tip.offsetWidth - 6) + "px";
    tip.style.top = Math.min(arr, lienzo.scrollTop + lienzo.clientHeight - tip.offsetHeight - 6) + "px";
  }
  function ocultarTip() { tip.hidden = true; }

  svg.addEventListener("pointermove", (ev) => {
    const g = ev.target.closest(".inv");
    g ? mostrarTip(g, ev.clientX, ev.clientY) : ocultarTip();
  });
  svg.addEventListener("pointerleave", ocultarTip);
  svg.addEventListener("focusin", (ev) => {
    const g = ev.target.closest(".inv");
    if (!g) return;
    const r = g.getBoundingClientRect();
    mostrarTip(g, Math.min(r.right, r.left + 40), r.top + Math.min(r.height, 30));
  });
  svg.addEventListener("focusout", ocultarTip);
  svg.addEventListener("keydown", (ev) => {
    const g = ev.target.closest(".inv");
    if (g && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); irAInvestigacion(g.dataset.inv, "cobertura"); }
    if (ev.key === "Escape") ocultarTip();
  });

  contenedor.addEventListener("click", (ev) => {
    const inv = ev.target.closest("[data-inv]");
    if (inv) { irAInvestigacion(inv.dataset.inv, "cobertura"); return; }
    const vista = ev.target.closest("[data-vista]");
    if (vista) { estado.actualizar({ vistaMapa: vista.dataset.vista }); return; }
    if (ev.target.closest('[data-accion="tabla"]')) {
      verTabla = !verTabla;
      lienzo.hidden = verTabla;
      zona("tabla").hidden = !verTabla;
      const s = estado.obtener();
      dibujarLateral(s);
      dibujarMapa(s);
    }
  });
  contenedor.addEventListener("change", (ev) => {
    const c = ev.target.closest("[data-filtro]");
    if (c) estado.actualizar({ filtrosMapa: { ...estado.obtener().filtrosMapa, [c.dataset.filtro]: c.checked } });
  });

  if (typeof ResizeObserver === "function") {
    let ultimo = "";
    new ResizeObserver(() => {
      if (!lienzo.clientWidth) { ultimo = ""; return; }
      const clave = `${lienzo.clientWidth}x${lienzo.clientHeight}`;
      if (clave === ultimo) return;
      ultimo = clave;
      dibujarMapa(estado.obtener());
    }).observe(lienzo);
  }

  alCambiar(["fichas", "resultados", "examinado", "escenario", "vistaMapa", "filtrosMapa", "idioma", "pestana", "resaltada"], (s, a) => {
    if (!a || s.idioma !== a.idioma) traducir(contenedor);
    const redibujar = !a || ["fichas", "resultados", "examinado", "vistaMapa", "filtrosMapa", "idioma"].some((k) => s[k] !== a[k])
      || (!s.examinado && s.escenario !== a.escenario) || (s.pestana === "mapa" && a.pestana !== "mapa");
    if (redibujar) { dibujarLateral(s); dibujarMapa(s); }
    if (s.pestana === "mapa" && s.resaltada) pulsarResaltada(s);
  });
}

function tablaHTML(s, visibles, puntajes) {
  const rango = (r, d = 1) => (!r ? esc(t("ficha.sin_dato")) : r.min === r.max ? fmt(r.min, d) : `${fmt(r.min, d)} – ${fmt(r.max, d)}`);
  const filas = [...visibles].sort((a, b) => (puntajes.get(b.id)?.orden ?? -1) - (puntajes.get(a.id)?.orden ?? -1));
  return `<table class="tabla-mapa">
    <caption class="oculto">${esc(t("mapa.encabezado"))}</caption>
    <thead><tr><th scope="col">${esc(t("mapa.tabla.inv"))}</th><th scope="col">${esc(t("mapa.tabla.o2"))}</th>
      <th scope="col">${esc(t("mapa.tabla.p"))}</th><th scope="col">${esc(t("mapa.tabla.relevancia"))}</th></tr></thead>
    <tbody>${filas.map((f) => {
      const pr = puntajes.get(f.id);
      const nombre = nombreFicha(f);
      return `<tr${pr?.top ? ' class="destacada"' : ""}>
        <th scope="row"><button type="button" class="enlace" data-inv="${esc(f.id)}" title="${esc(t("alc.ir_inv", { sigla: nombre }))}">${esc(nombre)}</button></th>
        <td>${rango(f.o2)}</td><td>${rango(f.p)}</td>
        <td>${pr ? `${fmt(pr.orden * 100, 0)} · ${esc(t(`nivel.${pr.nivel}`))}` : esc(t("mapa.sin_examen"))}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}
