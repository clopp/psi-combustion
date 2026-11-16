// Contador de investigaciones cargadas + ventana (popover) con el origen de los datos.
// Abre al pasar el cursor (pointer: fine), con clic/toque o Enter; cierra con Esc, clic fuera o al salir el cursor.
import { t, fmtHora } from "../../i18n/index.js";
import { resumirFuente } from "../../datos/fuente.js";
import { URL_PSI } from "../../datos/referencias.js";
import { esc } from "../textos.js";

const PUNTERO_FINO = typeof matchMedia === "function" ? matchMedia("(hover: hover) and (pointer: fine)") : { matches: false };

export function montarOrigen(raiz) {
  raiz.innerHTML = `
  <div class="origen">
    <button type="button" class="origen-boton" aria-expanded="false" aria-controls="origen-ventana" aria-haspopup="true">
      <b class="origen-n"></b><span class="origen-texto"></span>
    </button>
    <div class="origen-ventana" id="origen-ventana" role="region" hidden></div>
  </div>`;
  const caja = raiz.querySelector(".origen");
  const boton = caja.querySelector(".origen-boton");
  const ventana = caja.querySelector(".origen-ventana");
  let abierta = false;
  let porCursor = false; // abierta por hover: un clic la deja abierta en vez de cerrarla

  function mostrar(v, cursor = false) {
    abierta = v;
    porCursor = v && cursor;
    ventana.hidden = !v;
    boton.setAttribute("aria-expanded", String(v));
  }

  boton.addEventListener("click", () => mostrar(porCursor ? true : !abierta));
  caja.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && PUNTERO_FINO.matches && !abierta) mostrar(true, true); });
  caja.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && PUNTERO_FINO.matches) mostrar(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !abierta) return;
    const habiaFoco = caja.contains(document.activeElement);
    mostrar(false);
    if (habiaFoco) boton.focus();
  });
  document.addEventListener("pointerdown", (e) => { if (abierta && !caja.contains(e.target)) mostrar(false); });
  caja.addEventListener("focusout", (e) => { if (abierta && !caja.contains(e.relatedTarget)) mostrar(false); });

  return function dibujar(s) {
    const r = resumirFuente(s.fichas, s.fuente);
    caja.querySelector(".origen-n").textContent = r.total;
    caja.querySelector(".origen-texto").textContent = t(r.total === 1 ? "origen.cargada" : "origen.cargadas");
    boton.setAttribute("aria-label", t("origen.boton_aria", { n: r.total }));
    ventana.setAttribute("aria-label", t("origen.titulo"));
    const hora = r.cargadoEn
      ? fmtHora(r.cargadoEn)
      : "";
    ventana.innerHTML = `
      <h2>${esc(t("origen.titulo"))}</h2>
      <dl>
        <div><dt>${esc(t("origen.archivo"))}</dt>
          <dd>${r.archivo
            ? `<code>${esc(r.archivo)}</code><br><span>${esc(t(`origen.tipo.${r.tipo}`))} · ${esc(r.embebida ? t("origen.embebidas") : t("origen.cargado", { hora }))}</span>`
            : esc(t("origen.sin_archivo"))}</dd></div>
        <div><dt>${esc(t("origen.caracterizacion"))}</dt>
          <dd>${esc(t("origen.conteos", { reglas: r.reglas, ia: r.ia, verificadas: r.verificadas }))}</dd></div>
        <div><dt>${esc(t("origen.origen"))}</dt>
          <dd>${esc(t("origen.psi"))}<br><span>${esc(t("origen.vuelo_tierra", { vuelo: r.vuelo, tierra: r.tierra }))}</span><br>
          <a href="${URL_PSI}" target="_blank" rel="noopener">${esc(t("origen.enlace"))}<span class="oculto"> ${esc(t("origen.nueva_ventana"))}</span></a></dd></div>
      </dl>`;
  };
}
