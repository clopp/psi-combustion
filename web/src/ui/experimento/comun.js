// Utilidades compartidas de la pestaña Experimento (solo lectura/escritura vía estado).
import { estado } from "../../estado.js";
import { t, fmt } from "../../i18n/index.js";
import { cambiarEscenario } from "../../dominio/escenario.js";
import { textoPresion } from "../textos.js";

export { esc, DECIMALES_UNIDAD, textoPresion, condicionesCorto } from "../textos.js";
export { alCambiar, alCambiarEnCuadro } from "../observar.js";

// Escenario actual con un cambio parcial (marca personalizado si corresponde).
export function cambiar(parcial) {
  estado.actualizar({ escenario: cambiarEscenario(estado.obtener().escenario, parcial) });
}

export function fraseEscenario(e) {
  return t("exp.frase", {
    material: t(`material.${e.material}`),
    o2: fmt(e.o2),
    presion: textoPresion(e.p, e.unidad),
    gravedad: t(`gravedad_frase.${e.gravedad}`),
    flujo: t(`flujo_frase.${e.flujo}`),
  });
}

// Navega a Cobertura por hash (las pestañas escuchan hashchange).
export function irACobertura() {
  location.hash = "#cobertura";
}
