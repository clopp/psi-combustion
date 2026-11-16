// Franja superior (≤120 px): escenario examinado en 6 fichas, cifra de relevantes, barra alta/media/baja,
// "Editar escenario" (#experimento) y enlace a los vacíos (#alcance).
import { t, fmt } from "../../i18n/index.js";
import { NIVELES } from "../../dominio/relevancia.js";
import { alCambiar } from "../observar.js";
import { esc, textoPresion } from "../textos.js";
import { estado } from "../../estado.js";
import { escribirEscenarioUrl } from "../../datos/url.js";

// Enlace que reproduce el escenario examinado y abre Cobertura.
function enlaceEscenario(s) {
  const base = location.href.split(/[?#]/)[0];
  return `${base}?${escribirEscenarioUrl(s.examinado, { idioma: s.idioma, examinar: true })}`;
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Respaldo para file:// o navegadores sin Clipboard API.
    const area = Object.assign(document.createElement("textarea"), { value: texto });
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;opacity:0";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export function montar(raiz) {
  raiz.innerHTML = `<section class="bloque franja-examinado" aria-labelledby="titulo-examinado"></section>
    <p class="aviso-copiado" role="status" aria-live="polite"></p>
    <p class="oculto" aria-live="polite" data-anuncio></p>`;
  const sec = raiz.firstElementChild;
  const aviso = raiz.querySelector(".aviso-copiado");
  let temporizador = null;

  sec.addEventListener("click", async (ev) => {
    if (!ev.target.closest('[data-accion="copiar-enlace"]')) return;
    const ok = await copiarTexto(enlaceEscenario(estado.obtener()));
    aviso.textContent = t(ok ? "cob.enlace_copiado" : "cob.enlace_error");
    aviso.classList.toggle("error", !ok);
    clearTimeout(temporizador);
    temporizador = setTimeout(() => (aviso.textContent = ""), 3500);
  });

  alCambiar(["resultados", "idioma"], (s) => {
    const e = s.examinado, r = s.resultados;
    if (!e || !r) return;
    const total = r.lista.length;
    const relevantes = r.niveles.alta + r.niveles.media;
    const pct = (n) => (total ? (n / total) * 100 : 0).toFixed(1);
    const subtitulo = e.entorno && e.entorno !== "personalizado" ? t(`entorno.${e.entorno}`) : t("exp.personalizado");
    const presionKpa = e.unidad === "kPa" ? "" : `<small>${esc(textoPresion(e.p, "kPa"))}</small>`;
    const intereses = e.intereses.length ? e.intereses.map((x) => t(`interes.${x}`)).join(", ") : t("cob.intereses_todos");
    const v = r.vacios.total;
    const vacios = v === 0 ? t("cob.sin_vacios") : v === 1 ? t("cob.un_vacio") : t("cob.n_vacios", { n: v });
    const celda = (clave, valor) => `<div class="variable"><dt>${esc(t(clave))}</dt><dd>${valor}</dd></div>`;

    raiz.querySelector("[data-anuncio]").textContent =
      t("cob.anuncio", { n: relevantes, total, vacios });
    sec.innerHTML = `
      <div class="franja-izq">
        <div class="franja-cab">
          <h2 id="titulo-examinado">${esc(t("cob.examinado"))}</h2>
          <span class="franja-sub">${esc(subtitulo)}</span>
          <span class="franja-acciones">
            ${v ? `<a class="enlace" href="#alcance">${esc(vacios)}</a>` : `<span class="ayuda">${esc(vacios)}</span>`}
            <a class="boton-sec boton-chico" href="#experimento">${esc(t("cob.editar"))}</a>
            <button type="button" class="boton-sec boton-chico" data-accion="copiar-enlace">${esc(t("cob.copiar_enlace"))}</button>
          </span>
        </div>
        <dl class="variables">
          ${celda("componente.material", esc(t(`material.${e.material}`)))}
          ${celda("componente.oxigeno", `${esc(fmt(e.o2))} %`)}
          ${celda("componente.presion", `${esc(textoPresion(e.p, e.unidad))}${presionKpa}`)}
          ${celda("componente.gravedad", esc(t(`gravedad.${e.gravedad}`)))}
          ${celda("componente.flujo", esc(t(`flujo.${e.flujo}`)))}
          ${celda("componente.interes", esc(intereses))}
        </dl>
      </div>
      <div class="franja-der">
        <p class="cifra-principal"><b>${relevantes}</b> <span>${esc(t("cob.de_total", { total }))}</span>
          <small>${esc(t("cob.relevantes_texto"))}</small></p>
        <div class="barra-niveles" role="img" aria-label="${esc(t("cob.niveles_aria", r.niveles))}">
          ${NIVELES.map((n) => `<span class="n-${n.id}" style="width:${pct(r.niveles[n.id])}%"></span>`).join("")}
        </div>
        <div class="leyenda-niveles" aria-hidden="true">
          ${NIVELES.map((n) => `<span><i class="n-${n.id}"></i>${esc(t(`nivel.${n.id}`))} <b>${r.niveles[n.id]}</b></span>`).join("")}
        </div>
      </div>`;
  });
}
