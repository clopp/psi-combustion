// Comparar investigaciones: barra flotante con la selección y <dialog> con la tabla (ref. 1246-1280).
// Lee y escribe estado.comparar (ids). Celdas iguales en todas las columnas: morado suave.
import { estado } from "../../../estado.js";
import { t } from "../../../i18n/index.js";
import { alCambiar } from "../../observar.js";
import { esc, nombreFicha, textoRango } from "../../textos.js";

const etq = (x) => (t(`etiqueta.${x}`) === `etiqueta.${x}` ? x : t(`etiqueta.${x}`));

const FILAS = [
  ["ficha.tipo", (i) => (i.tierra ? t("ficha.tipo_tierra") : t("comparar.micro"))],
  ["ficha.familia", (i) => t(`familia.${i.familia}`)],
  ["comparar.categoria", (i) => [...i.categorias].map((c) => t(`categoria.${c}`)).sort().join(", ")],
  ["ficha.materiales", (i) => i.materiales.join(", ")],
  ["ficha.oxigeno", (i) => (i.o2 ? textoRango(i.o2, "%") : "")],
  ["ficha.presion", (i) => (i.p ? textoRango(i.p, "kPa") : "")],
  ["ficha.flujo", (i) => (i.flujo ? textoRango(i.flujo, "cm/s") : "")],
  ["comparar.config", (i) => i.config.map(etq).join(", ")],
  ["ficha.diluyentes", (i) => i.diluyentes.join(", ")],
  ["ficha.funcion", (i) => i.funciones.map(etq).join(", ")],
  ["comparar.calidad", (i) => (i.verificado ? t("calidad.verificada") : i.metodo)],
];

export function montar(raiz) {
  raiz.innerHTML = `
  <div class="barra-comparar" role="region" hidden>
    <span class="texto-comparar" aria-live="polite"></span>
    <button type="button" class="limpiar" data-accion="limpiar"></button>
    <button type="button" data-accion="abrir"></button>
  </div>
  <dialog class="dialogo-comparar" aria-labelledby="titulo-comparar">
    <div class="dialogo-cab">
      <h3 id="titulo-comparar"></h3>
      <button type="button" class="boton-sec" data-accion="cerrar"></button>
    </div>
    <div class="tabla-envoltura"></div>
  </dialog>`;
  const barra = raiz.querySelector(".barra-comparar");
  const dialogo = raiz.querySelector("dialog");
  const abrir = barra.querySelector('[data-accion="abrir"]');

  barra.querySelector('[data-accion="limpiar"]').addEventListener("click", () => estado.actualizar({ comparar: [] }));
  abrir.addEventListener("click", () => {
    pintarTabla(estado.obtener());
    dialogo.showModal();
  });
  dialogo.querySelector('[data-accion="cerrar"]').addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });

  function pintarTabla(s) {
    const invs = s.comparar.map((id) => s.fichas.find((f) => f.id === id)).filter(Boolean);
    const sinDato = t("ficha.sin_dato");
    let h = `<table class="comparacion"><thead><tr><th scope="col">${esc(t("comparar.campo"))}</th>${invs.map((i) => `<th scope="col">${esc(nombreFicha(i))}</th>`).join("")}</tr></thead><tbody>`;
    for (const [clave, fn] of FILAS) {
      const vals = invs.map((i) => fn(i) || sinDato);
      const iguales = vals.every((v) => v === vals[0]) && vals[0] !== sinDato;
      h += `<tr><th scope="row">${esc(t(clave))}</th>${vals.map((v) => `<td class="${iguales ? "igual" : ""}">${esc(v)}</td>`).join("")}</tr>`;
    }
    h += `</tbody></table><p class="ayuda nota-tabla">${esc(t("comparar.iguales"))}</p>`;
    dialogo.querySelector(".tabla-envoltura").innerHTML = h;
  }

  alCambiar(["comparar", "idioma", "fichas"], (s) => {
    // Quita ids que ya no existen (p. ej. tras cargar otro archivo).
    const validos = s.comparar.filter((id) => s.fichas.some((f) => f.id === id));
    if (validos.length !== s.comparar.length) { estado.actualizar({ comparar: validos }); return; }
    const n = s.comparar.length;
    barra.hidden = n === 0;
    barra.setAttribute("aria-label", t("comparar.barra"));
    barra.querySelector(".texto-comparar").textContent = n === 1 ? t("comparar.una") : t("comparar.n", { n });
    barra.querySelector('[data-accion="limpiar"]').textContent = t("comparar.limpiar");
    abrir.textContent = t("comparar.abrir");
    abrir.disabled = n < 2;
    abrir.title = n < 2 ? t("comparar.minimo") : "";
    dialogo.querySelector("#titulo-comparar").textContent = t("comparar.titulo");
    dialogo.querySelector('[data-accion="cerrar"]').textContent = t("comparar.cerrar");
    if (dialogo.open) pintarTabla(s);
  });
}
