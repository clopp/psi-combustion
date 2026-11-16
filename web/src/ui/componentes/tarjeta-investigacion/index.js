// Tarjeta de una investigación en la lista por relevancia (marcado; los eventos los delega la lista).
// tarjetaHTML(r, pos, { abierta, comparando, resaltada }) · fichaHTML(inv)  (ref. 1062-1101)
import { t, fmt, fmtFecha } from "../../../i18n/index.js";
import { COMPONENTES, urlBusquedaPSI } from "../../../datos/referencias.js";
import { esMetodoIA } from "../../../datos/fuente.js";
import { nivelDe } from "../../../dominio/relevancia.js";
import { esc, nombreFicha, textoRango } from "../../textos.js";

const etq = (x) => t(`etiqueta.${x}`) === `etiqueta.${x}` ? x : t(`etiqueta.${x}`);
// "MM-DD-AAAA" o "AAAA-MM-DD" de PSI -> fecha según idioma; si no se reconoce, el texto tal cual.
function fecha(txt) {
  const m = String(txt).match(/^(\d{2})-(\d{2})-(\d{4})$/) || null;
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : /^\d{4}-\d{2}-\d{2}$/.test(txt) ? new Date(`${txt}T00:00`) : null;
  return d && !Number.isNaN(d.getTime()) ? fmtFecha(d) : String(txt);
}
const original = () => ` <small class="etiqueta-original">${esc(t("ficha.texto_original"))}</small>`;
const lista = (l) => (l && l.length ? l.map(esc).join(", ") : esc(t("ficha.sin_dato")));

export function insigniaCalidad(inv) {
  if (inv.verificado) return `<span class="insignia v">${esc(t("calidad.verificada"))}</span>`;
  if (esMetodoIA(inv.metodo)) return `<span class="insignia a">${esc(t("calidad.ia"))}</span>`;
  if (inv.metodo === "reglas") return `<span class="insignia a">${esc(t("calidad.reglas"))}</span>`;
  return `<span class="insignia g">${esc(t("calidad.otro", { metodo: inv.metodo }))}</span>`;
}

function chipComp(k, v) {
  if (v === undefined) return "";
  const nombre = t(`componente.${k}`);
  if (v === null) return `<span class="comp nulo">${esc(t("tarjeta.comp_sin_dato", { nombre }))}</span>`;
  return `<span class="comp ${v >= 0.75 ? "alto" : ""}">${esc(t("tarjeta.comp", { nombre, v: fmt(v, 2) }))}</span>`;
}

export function fichaHTML(inv) {
  const evid = Object.entries(inv.evidencia || {}).filter(([, f]) => f);
  const fila = (clave, valor) => `<dt>${esc(t(clave))}</dt><dd>${valor}</dd>`;
  const cats = inv.categorias.size ? ` <small>(${[...inv.categorias].map((c) => esc(t(`categoria.${c}`))).join(", ")})</small>` : "";
  const tipo = t(inv.tierra ? "ficha.tipo_tierra" : "ficha.tipo_micro") + (inv.plataforma ? ", " + inv.plataforma : "");
  return `<div class="ficha">
    <dl>
      ${fila("ficha.tipo", esc(tipo))}
      ${fila("ficha.familia", esc(t(`familia.${inv.familia}`)) + (inv.hardware ? `<br><small lang="en">${esc(inv.hardware)}</small>` : ""))}
      ${inv.fechas.length ? fila("ficha.fechas", esc(inv.fechas.map(fecha).join(" – "))) : ""}
      ${fila("ficha.materiales", lista(inv.materiales) + cats)}
      ${fila("ficha.oxigeno", esc(textoRango(inv.o2, "%")))}
      ${fila("ficha.presion", esc(textoRango(inv.p, "kPa")))}
      ${fila("ficha.flujo", esc(textoRango(inv.flujo, "cm/s")) + (inv.config.length ? ", " + inv.config.map((x) => esc(etq(x))).join(", ") : ""))}
      ${fila("ficha.diluyentes", lista(inv.diluyentes))}
      ${fila("ficha.funcion", lista(inv.funciones.map(etq)))}
      ${inv.entornos.length ? fila("ficha.entornos", lista(inv.entornos.map(etq))) : ""}
      ${inv.mediciones.length ? fila("ficha.mediciones", lista(inv.mediciones)) : ""}
    </dl>
    ${inv.hallazgos ? `<h5>${esc(t("ficha.hallazgos"))}</h5><p lang="en">${esc(inv.hallazgos)}</p>` : ""}
    ${inv.objetivos ? `<h5>${esc(t("ficha.objetivos"))}${original()}</h5><p class="texto-psi" lang="en">${esc(inv.objetivos.slice(0, 700))}${inv.objetivos.length > 700 ? "…" : ""}</p>` : ""}
    ${evid.length ? `<h5>${esc(t("ficha.evidencia"))}${original()}</h5><ul>${evid.map(([k, f]) => `<li><b>${esc(k)}</b>: <q lang="en">${esc(f)}</q> ${inv.evidenciaOk[k] === true ? esc(t("ficha.evidencia_ok")) : inv.evidenciaOk[k] === false ? esc(t("ficha.evidencia_no")) : ""}</li>`).join("")}</ul>` : ""}
    ${inv.advertencias.length ? `<h5>${esc(t("ficha.advertencias"))}</h5><ul>${inv.advertencias.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
    <p><a href="${urlBusquedaPSI(inv.sigla || inv.id)}" target="_blank" rel="noopener">${esc(t("ficha.buscar_psi", { id: inv.id }))}</a></p>
  </div>`;
}

export function tarjetaHTML(r, pos, { abierta = false, comparando = false, resaltada = false } = {}) {
  const inv = r.inv;
  const nivel = nivelDe(r.orden).id;
  const idFicha = `ficha-${inv.id}`;
  return `<li class="item nivel-${nivel}${resaltada ? " resaltado" : ""}" id="item-${esc(inv.id)}" data-item="${esc(inv.id)}">
    <div class="item-cab">
      <span class="rango"><span class="oculto">${esc(t("tarjeta.posicion", { n: "" }))}</span>${pos}</span>
      <div class="item-cuerpo">
        <h4 tabindex="-1">${esc(nombreFicha(inv))}</h4>
        ${inv.titulo ? `<p class="titulo" lang="en">${esc(inv.titulo)}</p>` : ""}
      </div>
      <div class="puntaje">
        <b>${fmt(r.orden * 100, 0)}</b>
        <small>${esc(t("tarjeta.relevancia", { cobertura: fmt(r.cobertura * 100, 0) }))}</small>
        <div class="medidor" aria-hidden="true"><span style="width:${(r.orden * 100).toFixed(0)}%"></span></div>
      </div>
    </div>
    <div class="item-detalle">
      <div class="desglose">${COMPONENTES.map((k) => chipComp(k, r.comp[k])).join("")}</div>
      <div class="insignias">${insigniaCalidad(inv)}<span class="insignia g">${esc(t(`familia.${inv.familia}`))}</span></div>
    </div>
    <div class="item-acciones">
      <button class="enlace" type="button" data-ficha="${esc(inv.id)}" aria-expanded="${abierta}" aria-controls="${esc(idFicha)}">${esc(t(abierta ? "tarjeta.ocultar_ficha" : "tarjeta.ver_ficha"))}</button>
      <button class="enlace" type="button" data-ver-mapa="${esc(inv.id)}">${esc(t("tarjeta.ver_mapa"))}</button>
      <label class="comparar-check"><input type="checkbox" data-comparar="${esc(inv.id)}" ${comparando ? "checked" : ""}> ${esc(t("tarjeta.comparar"))}</label>
    </div>
    <div id="${esc(idFicha)}"${abierta ? "" : " hidden"}>${abierta ? fichaHTML(inv) : ""}</div>
  </li>`;
}
