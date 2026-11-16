// Columnas izquierda y central de Cobertura.
// Izq.: termómetro vertical + llamas ISS y escenario + "¿Qué cambiarías?" (palancas).
// Centro: nivel de favorabilidad, 5 barras de factores, aviso orientativo y fuentes.
// Una palanca (estado.palanca) cambia la vista sin modificar el escenario examinado.
import { estado } from "../../estado.js";
import { t, minuscula } from "../../i18n/index.js";
import { factoresFuego, REF_ISS } from "../../dominio/favorabilidad.js";
import { palancasPara } from "../../dominio/recomendaciones.js";
import { FUENTES_FUEGO } from "../../datos/referencias.js";
import { crearLlama } from "../componentes/llama/index.js";
import { crearTermometro } from "../componentes/termometro/index.js";
import { crearFactores } from "../componentes/factores/index.js";
import { alCambiar } from "../observar.js";
import { esc, condicionesCorto, signo } from "../textos.js";

export function montar(izq, centro) {
  izq.innerHTML = `
  <section class="bloque bloque-termo" aria-labelledby="titulo-favorabilidad">
    <h2 id="titulo-favorabilidad"></h2>
    <div class="termo-llamas">
      <div data-termometro></div>
      <figure class="llama-tarjeta llama-vertical">
        <div class="escena-llama"><svg data-llama="iss" role="img"></svg></div>
        <figcaption><span class="llama-nombre" data-nombre="iss"></span><span class="llama-cond" data-cond="iss"></span></figcaption>
      </figure>
      <figure class="llama-tarjeta llama-vertical tuya">
        <div class="escena-llama"><svg data-llama="tuya" role="img"></svg></div>
        <figcaption><span class="llama-nombre" data-nombre="tuya"></span><span class="llama-cond" data-cond="tuya"></span></figcaption>
      </figure>
    </div>
    <div class="bloque-interno palancas-bloque">
      <h3 data-titulo="palancas"></h3>
      <p class="ayuda" data-ayuda="palancas"></p>
      <div class="vista-ajuste" role="status" hidden></div>
      <div class="palancas"></div>
    </div>
  </section>`;
  centro.innerHTML = `
  <section class="bloque bloque-factores" aria-labelledby="titulo-nivel">
    <div class="nivel-fuego" aria-live="polite"><b id="titulo-nivel"></b><span></span></div>
    <p class="ayuda" data-ayuda="factores"></p>
    <div data-factores></div>
    <p class="aviso-fuego"></p>
    <details class="fuentes"><summary></summary><ul></ul></details>
  </section>`;

  const iss = crearLlama(izq.querySelector('[data-llama="iss"]'), "cob-iss");
  const svgTuya = izq.querySelector('[data-llama="tuya"]');
  const tuya = crearLlama(svgTuya, "cob-tuya");
  const termo = crearTermometro(izq.querySelector("[data-termometro]"));
  const factores = crearFactores(centro.querySelector("[data-factores]"));
  const contPalancas = izq.querySelector(".palancas");
  const aviso = izq.querySelector(".vista-ajuste");
  iss.actualizar(REF_ISS, 0);

  contPalancas.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-palanca]");
    if (!b) return;
    const actual = estado.obtener().palanca;
    estado.actualizar({ palanca: actual === b.dataset.palanca ? null : b.dataset.palanca });
  });
  aviso.addEventListener("click", (ev) => {
    if (ev.target.closest('[data-accion="volver"]')) estado.actualizar({ palanca: null });
  });

  function textosFijos() {
    izq.querySelector("#titulo-favorabilidad").textContent = t("cob.favorabilidad");
    izq.querySelector('[data-nombre="iss"]').textContent = t("exp.llama_iss");
    izq.querySelector('[data-llama="iss"]').setAttribute("aria-label", t("exp.llama_iss_aria"));
    izq.querySelector('[data-titulo="palancas"]').textContent = t("cob.que_cambiarias");
    izq.querySelector('[data-ayuda="palancas"]').textContent = t("cob.palancas_ayuda");
    centro.querySelector('[data-ayuda="factores"]').textContent = t("cob.factores_ayuda");
    centro.querySelector(".aviso-fuego").textContent = t("cob.aviso");
    centro.querySelector(".fuentes summary").textContent = t("cob.fuentes");
    centro.querySelector(".fuentes ul").innerHTML = FUENTES_FUEGO.map((f) =>
      `<li><a href="${f.url}" target="_blank" rel="noopener">${esc(t(`fuentes.${f.id}`))}</a></li>`).join("");
  }

  // modo: "encender" (entrada tras examinar), "transicion" (palanca) o "directo"
  function pintar(s, modo) {
    const e = s.examinado;
    if (!e) return;
    const lista = palancasPara(e);
    const pa = lista.find((x) => x.id === s.palanca) || null;
    const vista = pa ? { ...e, ...pa.cambio } : e;
    const R = factoresFuego(vista);
    const nivel = t(`fuego.nivel.${R.nivel.id}`);

    izq.querySelector('[data-cond="iss"]').textContent = condicionesCorto(REF_ISS, e.unidad);
    izq.querySelector('[data-cond="tuya"]').textContent = condicionesCorto(vista);
    izq.querySelector('[data-nombre="tuya"]').textContent = t(pa ? "cob.llama_ajuste" : "exp.llama_escenario");
    svgTuya.setAttribute("aria-label", t("exp.llama_escenario_aria", { nivel }));

    const nv = centro.querySelector(".nivel-fuego");
    nv.className = `nivel-fuego n-${R.nivel.id}`;
    nv.querySelector("b").textContent = nivel;
    nv.querySelector("span").textContent = R.vivo ? t("fuego.vivo", { total: signo(R.total) }) : t("fuego.no_vivo");

    const encender = modo === "encender";
    termo.actualizar(R.total, encender);
    factores.actualizar(R.factores, encender);
    if (encender) tuya.encender(vista, 850);
    else tuya.actualizar(vista, modo === "transicion" ? 600 : 0);

    aviso.hidden = !pa;
    aviso.innerHTML = pa
      ? `<span>${esc(t("cob.vista_palanca", { palanca: t(`palanca.${pa.id}.titulo`) }))}</span>
         <button type="button" class="enlace" data-accion="volver">${esc(t("cob.volver"))}</button>`
      : "";

    contPalancas.innerHTML = lista.map((x) => {
      const nulo = Math.abs(x.diferencia) < 0.01;
      const efecto = nulo ? t("palanca.sin_cambio")
        : t("palanca.efecto", { d: signo(x.diferencia), nivel: minuscula(t(`fuego.nivel.${x.nivel.id}`)) });
      return `<button type="button" class="palanca${x.clave ? " mejor" : ""}" data-palanca="${x.id}" aria-pressed="${x.id === s.palanca}">
        <span class="palanca-texto"><b>${esc(t(`palanca.${x.id}.titulo`))}</b>
          <span class="efecto${nulo ? " nulo" : ""}">${esc(efecto)}</span></span>
        ${x.clave ? `<span class="etiqueta-efecto">${esc(t("palanca.mayor_efecto"))}</span>` : ""}
      </button>`;
    }).join("");
    // Conserva el foco en la palanca pulsada tras redibujar.
    if (document.activeElement === document.body && s.palanca) contPalancas.querySelector(`[data-palanca="${s.palanca}"]`)?.focus();
  }

  let pendiente = false;
  const visible = (s) => s.pestana === "cobertura";

  alCambiar(["examinado", "palanca", "idioma", "pestana"], (s, a) => {
    if (!a || s.idioma !== a.idioma) textosFijos();
    if (!s.examinado) return;
    if (!a) { pintar(s, "directo"); return; }
    if (s.examinado !== a.examinado) {
      if (visible(s)) requestAnimationFrame(() => pintar(estado.obtener(), "encender"));
      else { pendiente = true; pintar(s, "directo"); }
      return;
    }
    if (s.pestana !== a.pestana && visible(s) && pendiente) {
      pendiente = false;
      requestAnimationFrame(() => pintar(estado.obtener(), "encender"));
      return;
    }
    if (s.palanca !== a.palanca) pintar(s, "transicion");
    else if (s.idioma !== a.idioma) pintar(s, "directo");
  });
}
