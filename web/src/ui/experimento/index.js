// Experimento: punto de partida | atmósfera, llamas, franja y recomendaciones | condiciones.
import * as entornos from "./entornos.js";
import * as atmosfera from "./atmosfera.js";
import * as escena from "./escena.js";
import * as recomendaciones from "./recomendaciones.js";
import * as condiciones from "./condiciones.js";

export function montar(contenedor) {
  contenedor.innerHTML = `
  <div class="rejilla rejilla-experimento rejilla-ajustada">
    <div class="col-izq columna" data-zona="entornos"></div>
    <div class="col-centro columna columna-centro">
      <div data-zona="atmosfera"></div>
      <div data-zona="escena"></div>
      <div data-zona="recomendaciones" class="zona-crece"></div>
    </div>
    <div class="col-der columna" data-zona="condiciones"></div>
  </div>`;
  const zona = (id) => contenedor.querySelector(`[data-zona="${id}"]`);
  entornos.montar(zona("entornos"));
  atmosfera.montar(zona("atmosfera"));
  escena.montar(zona("escena"));
  recomendaciones.montar(zona("recomendaciones"));
  condiciones.montar(zona("condiciones"));
}
