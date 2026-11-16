// Recomendaciones en vivo: selector segmentado Prevención | Detección | Supresión, un grupo a la vez.
import { estado } from "../../estado.js";
import { t, formatearVars } from "../../i18n/index.js";
import { recomendacionesPara, agruparRecomendaciones, GRUPOS_RECOMENDACION } from "../../dominio/recomendaciones.js";
import { traducir } from "../traducir.js";
import { alCambiarEnCuadro, esc, irACobertura } from "./comun.js";

function chip(sigla, fichas) {
  const f = fichas.find((x) => (x.sigla || "").toUpperCase() === sigla.toUpperCase());
  return f
    ? `<button type="button" class="chip chip-inv" data-inv="${esc(f.id)}" title="${esc(t("exp.inv_ver", { sigla }))}">${esc(sigla)}</button>`
    : `<span class="chip" title="${esc(t("exp.inv_sin_ficha", { sigla }))}">${esc(sigla)}</span>`;
}

export function montar(raiz) {
  raiz.innerHTML = `
  <section class="bloque bloque-reco" aria-labelledby="titulo-reco">
    <div class="reco-cab">
      <h2 id="titulo-reco" data-i18n="exp.recomendaciones"></h2>
      <div class="segmentado" role="tablist" data-i18n-attr="aria-label:exp.reco_grupos">
        ${GRUPOS_RECOMENDACION.map((g) => `
        <button type="button" role="tab" id="tab-reco-${g}" aria-controls="panel-reco" data-grupo="${g}">
          <span data-i18n="interes.${g}"></span>
          <span class="reco-n"></span>
          <span class="punto-clave" hidden><span class="oculto" data-i18n="exp.reco_tiene_clave"></span></span>
        </button>`).join("")}
      </div>
    </div>
    <p class="ayuda" data-i18n="exp.reco_ayuda"></p>
    <div class="reco-lista" id="panel-reco" role="tabpanel" tabindex="0"></div>
  </section>`;

  const tabs = [...raiz.querySelectorAll('[role="tab"]')];
  const lista = raiz.querySelector(".reco-lista");

  const elegir = (g, foco = false) => {
    estado.actualizar({ grupoRecomendacion: g });
    if (foco) raiz.querySelector(`[data-grupo="${g}"]`).focus();
  };
  tabs.forEach((b) => b.addEventListener("click", () => elegir(b.dataset.grupo)));
  raiz.querySelector('[role="tablist"]').addEventListener("keydown", (ev) => {
    const i = GRUPOS_RECOMENDACION.indexOf(estado.obtener().grupoRecomendacion);
    const n = GRUPOS_RECOMENDACION.length;
    const destino = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[ev.key];
    if (destino == null) return;
    ev.preventDefault();
    elegir(GRUPOS_RECOMENDACION[destino], true);
  });
  lista.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-inv]");
    if (!b) return;
    const s = estado.obtener();
    // Si aún no se examinó, examina el escenario actual para poder mostrar la tarjeta.
    estado.actualizar({ resaltada: b.dataset.inv, ...(s.examinado ? {} : { examinado: structuredClone(s.escenario) }) });
    irACobertura();
  });

  alCambiarEnCuadro(["escenario", "idioma", "fichas", "grupoRecomendacion"], (s, a) => {
    if (!a || s.idioma !== a.idioma) traducir(raiz);
    const grupos = agruparRecomendaciones(recomendacionesPara(s.escenario));
    const activo = s.grupoRecomendacion;
    for (const b of tabs) {
      const g = b.dataset.grupo;
      const sel = g === activo;
      b.setAttribute("aria-selected", String(sel));
      b.tabIndex = sel ? 0 : -1;
      const n = grupos[g].length;
      const cont = b.querySelector(".reco-n");
      cont.textContent = n;
      cont.title = t("exp.reco_n", { n });
      b.querySelector(".punto-clave").hidden = !grupos[g].some((x) => x.clave);
    }
    lista.setAttribute("aria-labelledby", `tab-reco-${activo}`);
    lista.innerHTML = grupos[activo].map((x) => `
      <article class="reco ${x.clave ? "clave" : ""}">
        <h3>${x.clave ? `<span class="oculto">${esc(t("exp.reco_clave"))}: </span>` : ""}${esc(t(`rec.${x.id}.titulo`))}</h3>
        <p>${esc(t(`rec.${x.id}.texto`, formatearVars(x.vars)))}</p>
        ${x.investigaciones.length ? `<div class="chips">${x.investigaciones.map((sg) => chip(sg, s.fichas)).join("")}</div>` : ""}
      </article>`).join("");
  });
}
