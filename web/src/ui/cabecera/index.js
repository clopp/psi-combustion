// Cabecera (≤84 px): logo, nombre, título | contador de origen | idioma arriba y "Cargar fichas" abajo.
import { estado } from "../../estado.js";
import { t, cambiarIdioma, IDIOMAS } from "../../i18n/index.js";
import { cargarArchivo } from "../../datos/cargador.js";
import { traducir } from "../traducir.js";
import { montarOrigen } from "./origen.js";
import logoWebp from "../../assets/logo-96.webp";
import logoPng from "../../assets/logo-96.png";

// Logo raster (webp con respaldo png). Vite lo importa desde src y singlefile lo incrusta como data URI.
// alt="" porque el nombre BLUE FLAME va al lado.
const LOGO = `
<picture class="logo">
  <source srcset="${logoWebp}" type="image/webp" />
  <img src="${logoPng}" alt="" width="44" height="44" decoding="async" />
</picture>`;

export function montar(contenedor) {
  contenedor.innerHTML = `
  <header class="cabecera">
    <div class="contenedor cabecera-interior">
      <div class="marca">${LOGO}<span class="marca-nombre" data-i18n="app.nombre"></span></div>
      <div class="titular">
        <h1 data-i18n="app.titulo"></h1>
        <p data-i18n="app.descripcion"></p>
      </div>
      <div class="acciones-cabecera">
        <div data-zona="origen"></div>
        <div class="columna-cabecera">
          <div class="selector-idioma" role="group" data-i18n-attr="aria-label:idioma.etiqueta">
            ${IDIOMAS.map((id) => `
            <button type="button" data-idioma="${id}" lang="${id}" data-i18n-attr="title:idioma.${id}_nombre">
              <span aria-hidden="true" data-i18n="idioma.${id}"></span><span class="oculto" data-i18n="idioma.${id}_nombre"></span>
            </button>`).join("")}
          </div>
          <div class="carga-fichas">
            <button type="button" class="boton-sec" data-accion="cargar" data-i18n="carga.boton" data-i18n-attr="title:carga.ayuda"></button>
            <input type="file" accept=".json,application/json" hidden data-i18n-attr="aria-label:carga.ayuda" />
            <div class="error-carga" role="alert" hidden><span></span>
              <button type="button" class="cerrar-aviso" data-accion="cerrar-aviso" data-i18n-attr="aria-label:carga.cerrar_aviso;title:carga.cerrar_aviso">×</button></div>
          </div>
        </div>
      </div>
    </div>
  </header>`;

  const raiz = contenedor.querySelector(".cabecera");
  const dibujarOrigen = montarOrigen(raiz.querySelector('[data-zona="origen"]'));
  const entrada = raiz.querySelector('input[type="file"]');
  const error = raiz.querySelector(".error-carga");

  raiz.querySelectorAll("[data-idioma]").forEach((b) =>
    b.addEventListener("click", () => cambiarIdioma(b.dataset.idioma))
  );
  raiz.querySelector('[data-accion="cargar"]').addEventListener("click", () => entrada.click());
  entrada.addEventListener("change", async () => {
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    try {
      await cargarArchivo(archivo);
    } catch (e) {
      estado.actualizar({ avisoCarga: e?.clave || "carga.error" });
    }
    entrada.value = "";
  });

  raiz.querySelector('[data-accion="cerrar-aviso"]').addEventListener("click", () => estado.actualizar({ avisoCarga: null }));

  function dibujarDinamico(s) {
    error.hidden = !s.avisoCarga;
    error.querySelector("span").textContent = s.avisoCarga ? t(s.avisoCarga) : "";
    raiz.querySelectorAll("[data-idioma]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.idioma === s.idioma))
    );
    dibujarOrigen(s);
  }

  traducir(raiz);
  dibujarDinamico(estado.obtener());
  estado.suscribir((s, a) => {
    if (s.idioma !== a.idioma || s.fichas !== a.fichas || s.fuente !== a.fuente || s.avisoCarga !== a.avisoCarga) dibujarDinamico(s);
  });
}
