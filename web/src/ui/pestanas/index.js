// Pestañas con roles ARIA, flechas, Inicio/Fin y hash (#experimento #cobertura #alcance #mapa).
import { estado } from "../../estado.js";
import { t } from "../../i18n/index.js";
import { traducir } from "../traducir.js";

export const PESTANAS = ["experimento", "cobertura", "alcance", "mapa"];
const CON_CONTADOR = new Set(["cobertura", "alcance"]);

const desdeHash = () => {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  return PESTANAS.includes(id) ? id : null;
};

export function montar(contenedor) {
  contenedor.innerHTML = `
  <nav class="barra-pestanas">
    <div class="contenedor">
      <div class="pestanas" role="tablist" data-i18n-attr="aria-label:pestanas.etiqueta">
        ${PESTANAS.map((id) => `
        <button type="button" class="pestana" role="tab" id="tab-${id}" aria-controls="panel-${id}" data-pestana="${id}">
          <span class="pestana-nombre">
            <span data-i18n="pestana.${id}"></span>
            ${CON_CONTADOR.has(id) ? `<span class="contador" data-contador="${id}" hidden></span>` : ""}
          </span>
          <span class="pestana-desc" data-i18n="pestana.${id}_desc"></span>
        </button>`).join("")}
      </div>
    </div>
  </nav>`;

  const lista = contenedor.querySelector('[role="tablist"]');
  const botones = [...lista.querySelectorAll('[role="tab"]')];

  function seleccionar(id, { foco = false } = {}) {
    if (!PESTANAS.includes(id)) return;
    if (estado.obtener().pestana !== id) estado.actualizar({ pestana: id });
    if (desdeHash() !== id) history.replaceState(null, "", "#" + id);
    if (foco) botones[PESTANAS.indexOf(id)].focus();
  }

  botones.forEach((b) => b.addEventListener("click", () => seleccionar(b.dataset.pestana)));

  lista.addEventListener("keydown", (e) => {
    const i = PESTANAS.indexOf(estado.obtener().pestana);
    const destino = {
      ArrowRight: (i + 1) % PESTANAS.length,
      ArrowLeft: (i - 1 + PESTANAS.length) % PESTANAS.length,
      Home: 0,
      End: PESTANAS.length - 1,
    }[e.key];
    if (destino == null) return;
    e.preventDefault();
    seleccionar(PESTANAS[destino], { foco: true });
  });

  window.addEventListener("hashchange", () => {
    const id = desdeHash();
    if (id) seleccionar(id);
  });

  function dibujar(s) {
    botones.forEach((b) => {
      const activa = b.dataset.pestana === s.pestana;
      b.setAttribute("aria-selected", String(activa));
      b.tabIndex = activa ? 0 : -1;
    });
    // Contadores: los llenan E3/E4 en resultados.contadores = { cobertura, alcance }
    lista.querySelectorAll("[data-contador]").forEach((c) => {
      const n = s.resultados?.contadores?.[c.dataset.contador];
      c.hidden = n == null;
      c.textContent = n ?? "";
      if (n != null) c.setAttribute("aria-label", t("pestana.contador", { n }));
    });
  }

  traducir(contenedor);
  const inicial = desdeHash();
  if (inicial) estado.actualizar({ pestana: inicial });
  dibujar(estado.obtener());
  estado.suscribir((s, a) => {
    if (s.pestana !== a.pestana || s.resultados !== a.resultados || s.idioma !== a.idioma) dibujar(s);
  });
}
