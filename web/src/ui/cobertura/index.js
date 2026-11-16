// Cobertura: franja del escenario examinado + termómetro y llamas | factores | investigaciones.
// Sin examinar: estado vacío. Escenario cambiado tras examinar: aviso con "Examinar de nuevo".
import { estado } from "../../estado.js";
import { escenarioCambio } from "../../dominio/resultados.js";
import { traducir } from "../traducir.js";
import { alCambiar } from "../observar.js";
import * as franja from "./franja.js";
import * as fuego from "./fuego.js";
import * as lista from "./lista.js";
import * as comparar from "../componentes/comparar/index.js";

export function montar(contenedor) {
  contenedor.innerHTML = `
  <div class="cobertura-vacia bloque" data-zona="vacia">
    <h2 data-i18n="cob.sin_examinar_titulo"></h2>
    <p data-i18n="cob.sin_examinar_texto"></p>
    <p><a class="boton" href="#experimento" data-i18n="cob.ir_experimento"></a></p>
  </div>
  <div class="vista-ajustada vista-cobertura" data-zona="contenido">
    <div class="aviso-desactualizado" role="status" hidden>
      <span data-i18n="cob.desactualizado"></span>
      <button type="button" class="boton-sec" data-accion="reexaminar" data-i18n="cob.examinar_de_nuevo"></button>
    </div>
    <div data-zona="franja"></div>
    <div class="rejilla rejilla-cobertura rejilla-ajustada">
      <div class="col-termo columna" data-zona="termo"></div>
      <div class="col-factores columna" data-zona="factores"></div>
      <div class="col-lista columna" data-zona="lista"></div>
    </div>
  </div>
  <div data-zona="comparar"></div>`;

  const zona = (id) => contenedor.querySelector(`[data-zona="${id}"]`);
  const aviso = contenedor.querySelector(".aviso-desactualizado");
  franja.montar(zona("franja"));
  fuego.montar(zona("termo"), zona("factores"));
  lista.montar(zona("lista"));
  comparar.montar(zona("comparar"));

  aviso.querySelector('[data-accion="reexaminar"]').addEventListener("click", () =>
    estado.actualizar({ examinado: structuredClone(estado.obtener().escenario) })
  );

  alCambiar(["examinado", "escenario", "idioma"], (s, a) => {
    if (!a || s.idioma !== a.idioma) {
      traducir(zona("vacia"));
      traducir(aviso);
    }
    zona("vacia").hidden = !!s.examinado;
    zona("contenido").hidden = !s.examinado;
    aviso.hidden = !escenarioCambio(s.escenario, s.examinado);
  });
}
