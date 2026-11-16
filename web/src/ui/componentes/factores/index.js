// Barras divergentes de los 5 factores del fuego: magenta favorece (derecha), morado dificulta (izquierda).
// API: crearFactores(el) -> { actualizar(factores, escalonar) }
//   escalonar = true: crecen desde cero una tras otra, de la más influyente a la menos (110 ms).
import { t, formatearVars } from "../../../i18n/index.js";
import { esc, signo } from "../../textos.js";

const REDUCIR = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };
const PASO_MS = 110;
const ESPERA_MS = 250;

export function crearFactores(el) {
  el.classList.add("factores");
  let construido = false;

  function construir(factores) {
    el.innerHTML = `
      <div class="factores-escala" aria-hidden="true"><span></span>
        <div><span data-escala="menos"></span><span data-escala="mas"></span></div></div>
      ${factores.map((x) => `
      <div class="factor" data-factor="${x.id}">
        <span class="factor-nombre"></span>
        <div class="factor-barra" role="img"><span></span></div>
        <p class="factor-detalle"></p>
      </div>`).join("")}`;
    construido = true;
  }

  return {
    actualizar(factores, escalonar = false) {
      if (!construido) construir(factores);
      el.querySelector('[data-escala="menos"]').textContent = t("cob.menos_favorable");
      el.querySelector('[data-escala="mas"]').textContent = t("cob.mas_favorable");
      const orden = [...factores].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map((x) => x.id);
      const animar = escalonar && !REDUCIR.matches;

      for (const x of factores) {
        const fila = el.querySelector(`[data-factor="${x.id}"]`);
        const nombre = t(`fuego.nombre.${x.id}`);
        fila.querySelector(".factor-nombre").textContent = nombre;
        fila.querySelector(".factor-detalle").innerHTML =
          `${esc(t(`fuego.${x.id}.${x.variante}`, formatearVars(x.vars)))} <span class="fuente" title="${esc(t("cob.fuente", { fuente: x.fuente.join(", ") }))}">${esc(x.fuente.join(", "))}</span>`;
        const efecto = x.delta > 0 ? "cob.efecto_sube" : x.delta < 0 ? "cob.efecto_baja" : "cob.efecto_nulo";
        const contenedor = fila.querySelector(".factor-barra");
        contenedor.setAttribute("aria-label", t("cob.factor_aria", { nombre, efecto: `${t(efecto)}${x.delta ? ` (${signo(x.delta)})` : ""}` }));

        const barra = contenedor.querySelector("span");
        const w = Math.min(50, (Math.abs(x.delta) / 4) * 50);
        const aplicar = () => {
          barra.className = x.delta > 0 ? "sube" : x.delta < 0 ? "baja" : "";
          barra.style.width = w + "%";
          barra.style.left = (x.delta < 0 ? 50 - w : 50) + "%";
        };
        barra.style.transitionDelay = animar ? ESPERA_MS + orden.indexOf(x.id) * PASO_MS + "ms" : "0ms";
        if (animar) {
          barra.style.transition = "none";
          barra.style.width = "0%";
          barra.style.left = "50%";
          void barra.offsetWidth; // fija el punto de partida antes de animar
          barra.style.transition = "";
          requestAnimationFrame(aplicar);
        } else aplicar();
      }
    },
  };
}
