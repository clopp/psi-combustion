// Punto de partida: entornos de referencia + Personalizado, en tarjetas verticales.
import { estado } from "../../estado.js";
import { t, fmt } from "../../i18n/index.js";
import { ENTORNOS } from "../../datos/referencias.js";
import { aplicarEntorno, PERSONALIZADO } from "../../dominio/escenario.js";
import { traducir } from "../traducir.js";
import { alCambiar, textoPresion } from "./comun.js";

const OPCIONES = [...ENTORNOS, { id: PERSONALIZADO }];

export function montar(raiz) {
  raiz.innerHTML = `
  <section class="bloque bloque-entornos" aria-labelledby="titulo-entornos">
    <h2 id="titulo-entornos" data-i18n="exp.punto_partida"></h2>
    <div class="entornos" role="group" aria-labelledby="titulo-entornos">
      ${OPCIONES.map((en) => `
      <button type="button" class="entorno" data-entorno="${en.id}">
        <b data-i18n="${en.id === PERSONALIZADO ? "exp.personalizado" : `entorno.${en.id}`}"></b>
        <span class="entorno-valores"></span>
      </button>`).join("")}
    </div>
    <p class="nota-entorno" aria-live="polite"></p>
  </section>`;

  raiz.querySelectorAll("[data-entorno]").forEach((b) =>
    b.addEventListener("click", () => {
      const s = estado.obtener();
      estado.actualizar({ escenario: aplicarEntorno(s.escenario, b.dataset.entorno) });
    })
  );

  alCambiar(["escenario", "idioma"], (s, a) => {
    if (!a || s.idioma !== a.idioma) traducir(raiz);
    const e = s.escenario;
    raiz.querySelectorAll("[data-entorno]").forEach((b) => {
      const id = b.dataset.entorno;
      const en = ENTORNOS.find((x) => x.id === id);
      b.setAttribute("aria-pressed", String(e.entorno === id));
      b.querySelector(".entorno-valores").textContent = en
        ? t("exp.entorno_valores", { o2: fmt(en.o2), presion: textoPresion(en.p, e.unidad) })
        : t("exp.personalizado_desc");
    });
    const actual = ENTORNOS.find((x) => x.id === e.entorno);
    const nota = raiz.querySelector(".nota-entorno");
    nota.hidden = !actual?.nota;
    nota.textContent = actual?.nota ? t(`entorno.${actual.id}_nota`) : "";
  });
}
