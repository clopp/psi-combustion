// Columna derecha con scroll propio: investigaciones agrupadas por relevancia (alta, media, baja),
// "Ver ficha", "Comparar" y "Descargar CSV". La baja muestra 3 y un botón para ver todas.
// Si estado.resaltada existe al entrar: muestra, desplaza y resalta esa tarjeta.
import { estado } from "../../estado.js";
import { t } from "../../i18n/index.js";
import { NIVELES, nivelDe } from "../../dominio/relevancia.js";
import { construirCSV, nombreCSV } from "../../datos/csv.js";
import { tarjetaHTML } from "../componentes/tarjeta-investigacion/index.js";
import { alCambiar } from "../observar.js";
import { esc } from "../textos.js";
import { irAInvestigacion } from "../navegar.js";

const REDUCIR = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };
const BAJA_VISIBLES = 3;

export function montar(raiz) {
  raiz.innerHTML = `
  <section class="bloque bloque-lista" aria-labelledby="titulo-lista">
    <div class="barra-lista">
      <div><h2 id="titulo-lista"></h2><p class="ayuda"></p></div>
      <button class="boton-sec boton-chico" type="button" data-accion="csv"></button>
    </div>
    <div class="grupos"></div>
  </section>`;
  const grupos = raiz.querySelector(".grupos");
  const abiertas = new Set();
  let verTodas = false;
  let resaltada = null;

  function pintar(s) {
    const r = s.resultados;
    raiz.querySelector("#titulo-lista").textContent = t("cob.investigaciones");
    raiz.querySelector(".barra-lista .ayuda").textContent = t("cob.lista_ayuda");
    raiz.querySelector('[data-accion="csv"]').textContent = t("cob.csv");
    if (!r) { grupos.innerHTML = ""; return; }
    let pos = 0, h = "";
    for (const n of NIVELES) {
      const todas = r.lista.filter((x) => nivelDe(x.orden).id === n.id);
      if (!todas.length) continue;
      const inicio = pos;
      const vistas = n.id === "baja" && !verTodas ? todas.slice(0, BAJA_VISIBLES) : todas;
      const cuenta = todas.length === 1 ? t("cob.una_investigacion") : t("cob.n_investigaciones", { n: todas.length });
      h += `<section class="grupo-nivel" aria-labelledby="grupo-${n.id}">
        <div class="grupo-nivel-cab"><h3 id="grupo-${n.id}"><span class="marca-nivel n-${n.id}" aria-hidden="true"></span>${esc(t(`nivel.${n.id}_titulo`))}</h3>
          <p>${esc(t(`nivel.${n.id}_desc`))}, ${esc(cuenta)}</p></div>
        <ol class="lista" start="${inicio + 1}">${vistas.map((x, i) => tarjetaHTML(x, inicio + i + 1, {
          abierta: abiertas.has(x.id), comparando: s.comparar.includes(x.id), resaltada: resaltada === x.id,
        })).join("")}</ol>
        ${n.id === "baja" && todas.length > BAJA_VISIBLES ? `<p class="ver-todas"><button class="enlace" type="button" data-accion="ver-todas" aria-expanded="${verTodas}">${esc(verTodas ? t("cob.ver_menos") : t("cob.ver_todas", { n: todas.length }))}</button></p>` : ""}
      </section>`;
      pos += todas.length;
    }
    grupos.innerHTML = h;
  }

  raiz.addEventListener("click", (ev) => {
    const s = estado.obtener();
    const ficha = ev.target.closest("[data-ficha]");
    if (ficha) {
      const id = ficha.dataset.ficha;
      abiertas.has(id) ? abiertas.delete(id) : abiertas.add(id);
      pintar(s);
      grupos.querySelector(`[data-ficha="${CSS.escape(id)}"]`)?.focus();
      return;
    }
    const mapa = ev.target.closest("[data-ver-mapa]");
    if (mapa) { irAInvestigacion(mapa.dataset.verMapa, "mapa"); return; }
    const accion = ev.target.closest("[data-accion]")?.dataset.accion;
    if (accion === "ver-todas") {
      verTodas = !verTodas;
      pintar(s);
      grupos.querySelector('[data-accion="ver-todas"]')?.focus();
    } else if (accion === "csv" && s.resultados) {
      descargar(construirCSV(s.resultados.lista, s.examinado), nombreCSV(s.examinado));
    }
  });
  raiz.addEventListener("change", (ev) => {
    const c = ev.target.closest("[data-comparar]");
    if (!c) return;
    const ids = estado.obtener().comparar.filter((x) => x !== c.dataset.comparar);
    estado.actualizar({ comparar: c.checked ? [...ids, c.dataset.comparar] : ids });
  });

  function irAResaltada(s) {
    const id = s.resaltada;
    const r = s.resultados;
    if (!id || !r) return;
    const enBaja = r.lista.filter((x) => nivelDe(x.orden).id === "baja").findIndex((x) => x.id === id);
    if (enBaja >= BAJA_VISIBLES) verTodas = true;
    resaltada = id;
    pintar(s);
    estado.actualizar({ resaltada: null });
    requestAnimationFrame(() => {
      const item = grupos.querySelector(`[data-item="${CSS.escape(id)}"]`);
      if (!item) return;
      item.scrollIntoView({ block: "center", behavior: REDUCIR.matches ? "auto" : "smooth" });
      item.querySelector("h4")?.focus({ preventScroll: true });
    });
  }

  alCambiar(["resultados", "idioma", "comparar", "resaltada", "pestana"], (s, a) => {
    if (!a || s.resultados !== a.resultados) { abiertas.clear(); verTodas = false; resaltada = null; }
    if (s.resaltada && s.pestana === "cobertura") { irAResaltada(s); return; }
    if (!a || s.resultados !== a.resultados || s.idioma !== a.idioma) { pintar(s); return; }
    if (s.comparar !== a.comparar)
      grupos.querySelectorAll("[data-comparar]").forEach((c) => { c.checked = s.comparar.includes(c.dataset.comparar); });
  });
}

function descargar(texto, nombre) {
  const blob = new Blob([texto], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
