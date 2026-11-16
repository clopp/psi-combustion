// Condiciones del incendio: material, gravedad, flujo (uno) e interés (varios), como chips.
import { estado } from "../../estado.js";
import { MATERIALES, GRAVEDADES, FLUJOS, INTERESES } from "../../datos/referencias.js";
import { alternarInteres } from "../../dominio/escenario.js";
import { traducir } from "../traducir.js";
import { alCambiar, cambiar } from "./comun.js";

const GRUPOS = [
  { campo: "material", titulo: "exp.material", opciones: MATERIALES, prefijo: "material" },
  { campo: "gravedad", titulo: "exp.gravedad", opciones: GRAVEDADES, prefijo: "gravedad" },
  { campo: "flujo", titulo: "exp.flujo", opciones: FLUJOS, prefijo: "flujo" },
  { campo: "intereses", titulo: "exp.interes", opciones: INTERESES, prefijo: "interes", multiple: true },
];

export function montar(raiz) {
  raiz.innerHTML = `
  <section class="bloque bloque-condiciones">
    <h2 data-i18n="exp.condiciones"></h2>
    ${GRUPOS.map((g) => `
    <div class="grupo-opciones" role="group" aria-labelledby="titulo-${g.campo}">
      <h3 id="titulo-${g.campo}" data-i18n="${g.titulo}"></h3>
      ${g.multiple ? `<p class="ayuda" data-i18n="exp.interes_ayuda"></p>` : ""}
      <div class="opciones">
        ${g.opciones.map((o) => `<button type="button" class="opcion" data-campo="${g.campo}" data-valor="${o.id}" data-i18n="${g.prefijo}.${o.id}"></button>`).join("")}
      </div>
    </div>`).join("")}
  </section>`;

  raiz.querySelectorAll("[data-campo]").forEach((b) =>
    b.addEventListener("click", () => {
      const { campo, valor } = b.dataset;
      if (campo === "intereses") estado.actualizar({ escenario: alternarInteres(estado.obtener().escenario, valor) });
      else cambiar({ [campo]: valor });
    })
  );

  alCambiar(["escenario", "idioma"], (s, a) => {
    if (!a || s.idioma !== a.idioma) traducir(raiz);
    const e = s.escenario;
    raiz.querySelectorAll("[data-campo]").forEach((b) => {
      const { campo, valor } = b.dataset;
      const activo = campo === "intereses" ? e.intereses.includes(valor) : e[campo] === valor;
      b.setAttribute("aria-pressed", String(activo));
    });
  });
}
