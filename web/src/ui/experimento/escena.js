// Llamas ISS vs escenario en vivo + franja morada (frase, nivel y "Ver experimentos").
import { estado } from "../../estado.js";
import { t, fmt, minuscula } from "../../i18n/index.js";
import { factoresFuego, REF_ISS } from "../../dominio/favorabilidad.js";
import { crearLlama } from "../componentes/llama/index.js";
import { traducir } from "../traducir.js";
import { alCambiarEnCuadro, condicionesCorto, fraseEscenario, irACobertura } from "./comun.js";

const signo = (d) => (d > 0 ? "+" : d < 0 ? "−" : "") + fmt(Math.abs(d), 1);

export function montar(raiz) {
  raiz.innerHTML = `
  <section class="bloque bloque-escena">
    <div class="llamas-par">
      <figure class="llama-tarjeta">
        <div class="escena-llama"><svg data-llama="iss" role="img" data-i18n-attr="aria-label:exp.llama_iss_aria"></svg></div>
        <figcaption><span class="llama-nombre" data-i18n="exp.llama_iss"></span><span class="llama-cond" data-cond="iss"></span></figcaption>
      </figure>
      <figure class="llama-tarjeta tuya">
        <div class="escena-llama"><svg data-llama="tuya" role="img"></svg></div>
        <figcaption><span class="llama-nombre" data-i18n="exp.llama_escenario"></span><span class="llama-cond" data-cond="tuya"></span></figcaption>
      </figure>
    </div>
    <div class="franja-examinar">
      <div class="franja-texto">
        <p class="frase-previa"><span data-i18n="exp.vas_a_examinar"></span> <b data-frase></b></p>
        <p class="fuego-previo" aria-live="polite"><span data-i18n="exp.favorabilidad"></span> <b data-nivel></b> <small data-vivo></small></p>
      </div>
      <button type="button" class="boton boton-examinar" data-i18n="exp.ver_experimentos"></button>
    </div>
  </section>`;

  const iss = crearLlama(raiz.querySelector('[data-llama="iss"]'), "llama-iss");
  const svgTuya = raiz.querySelector('[data-llama="tuya"]');
  const tuya = crearLlama(svgTuya, "llama-tuya");
  iss.actualizar(REF_ISS, 0);

  raiz.querySelector(".boton-examinar").addEventListener("click", () => {
    estado.actualizar({ examinado: structuredClone(estado.obtener().escenario) });
    irACobertura();
  });

  alCambiarEnCuadro(["escenario", "idioma"], (s, a) => {
    if (!a || s.idioma !== a.idioma) traducir(raiz);
    const e = s.escenario;
    const R = factoresFuego(e);
    const nivel = t(`fuego.nivel.${R.nivel.id}`);
    if (!a || s.escenario !== a.escenario) tuya.actualizar(e, a ? 250 : 0);
    raiz.querySelector('[data-cond="iss"]').textContent = condicionesCorto(REF_ISS, e.unidad);
    raiz.querySelector('[data-cond="tuya"]').textContent = condicionesCorto(e);
    raiz.querySelector("[data-frase]").textContent = fraseEscenario(e);
    const b = raiz.querySelector("[data-nivel]");
    b.textContent = minuscula(nivel);
    b.className = `n-${R.nivel.id}`;
    b.title = R.vivo ? t("fuego.vivo", { total: signo(R.total) }) : "";
    raiz.querySelector("[data-vivo]").textContent = R.vivo ? "" : `(${t("fuego.no_vivo")})`;
    svgTuya.setAttribute("aria-label", t("exp.llama_escenario_aria", { nivel }));
  });
}
