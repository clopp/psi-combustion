// Arranque: estilos, montaje de cabecera, pestañas y paneles, carga de fichas e idioma.
import "./estilos/tokens.css";
import "./estilos/base.css";
import "./estilos/layout.css";
import "./estilos/componentes.css";

import { estado } from "./estado.js";
import { t, idiomaInicial, ETIQUETAS_LANG } from "./i18n/index.js";
import { leerEscenarioUrl } from "./datos/url.js";
import { traducir } from "./ui/traducir.js";
import { cargarFichasIniciales } from "./datos/cargador.js";
import { calcularResultados } from "./dominio/resultados.js";
import * as cabecera from "./ui/cabecera/index.js";
import * as pestanas from "./ui/pestanas/index.js";
import { PESTANAS } from "./ui/pestanas/index.js";
import * as experimento from "./ui/experimento/index.js";
import * as cobertura from "./ui/cobertura/index.js";
import * as alcance from "./ui/alcance/index.js";
import * as mapa from "./ui/mapa/index.js";

const PANELES = { experimento, cobertura, alcance, mapa };
const CLAVE_IDIOMA = "blue-flame-idioma";

function leerGuardado() {
  try {
    return localStorage.getItem(CLAVE_IDIOMA);
  } catch {
    return null;
  }
}
function guardarIdioma(id) {
  try {
    localStorage.setItem(CLAVE_IDIOMA, id);
  } catch {
    // Almacenamiento bloqueado (modo privado, file://): se ignora.
  }
}

// Escenario e idioma desde la URL (?entorno=rover&examinar=1&lang=pt). Se aplica antes de montar la UI.
const desdeUrl = leerEscenarioUrl(location.search, estado.obtener().escenario);
estado.actualizar({
  idioma: idiomaInicial({ url: desdeUrl.idioma, guardado: leerGuardado() }),
  ...(desdeUrl.hayEscenario ? { escenario: desdeUrl.escenario } : {}),
});
// Con examinar=1: examina y abre #cobertura, salvo que la URL ya traiga otra pestaña (#alcance, #mapa...).
if (desdeUrl.examinar) {
  const hash = location.hash.replace(/^#/, "");
  const pestana = PESTANAS.includes(hash) ? hash : "cobertura";
  estado.actualizar({ examinado: structuredClone(estado.obtener().escenario), pestana });
  if (hash !== pestana) history.replaceState(null, "", "#" + pestana);
}

const app = document.getElementById("app");
app.innerHTML = `
  <div class="barra-fija">
    <div data-zona="cabecera"></div>
    <div data-zona="pestanas"></div>
  </div>
  <main class="contenedor area-paneles">
    ${Object.keys(PANELES).map((id) => `
    <section class="panel-pestana" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" tabindex="0" hidden></section>`).join("")}
  </main>`;

cabecera.montar(app.querySelector('[data-zona="cabecera"]'));
pestanas.montar(app.querySelector('[data-zona="pestanas"]'));
for (const [id, modulo] of Object.entries(PANELES)) modulo.montar(document.getElementById(`panel-${id}`));

function aplicarIdioma(s) {
  document.documentElement.lang = ETIQUETAS_LANG[s.idioma] || s.idioma;
  document.title = `${t("app.nombre")} · ${t("app.titulo")}`;
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) {
    document.querySelector(sel)?.setAttribute("content", t("app.descripcion"));
  }
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
  traducir(document);
}

function mostrarPanel(s) {
  for (const id of Object.keys(PANELES)) document.getElementById(`panel-${id}`).hidden = id !== s.pestana;
}

aplicarIdioma(estado.obtener());
mostrarPanel(estado.obtener());
estado.suscribir((s, a) => {
  // Resultados del escenario examinado (y al cambiar las fichas). Un examen nuevo quita la palanca.
  if (s.examinado !== a.examinado || (s.examinado && s.fichas !== a.fichas)) {
    estado.actualizar({
      resultados: calcularResultados(s.fichas, s.examinado),
      ...(s.examinado !== a.examinado ? { palanca: null } : {}),
    });
  }
  if (s.idioma !== a.idioma) {
    aplicarIdioma(s);
    guardarIdioma(s.idioma);
  }
  if (s.pestana !== a.pestana) mostrarPanel(s);
});

cargarFichasIniciales();
