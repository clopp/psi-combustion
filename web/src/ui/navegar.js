// Ir a una investigación en otra pestaña: guarda `resaltada` y cambia de pestaña en una sola actualización,
// para que la pestaña de origen no la consuma. Si aún no se examinó, examina el escenario actual
// (Cobertura necesita resultados para mostrar la tarjeta).
import { estado } from "../estado.js";

export function irAInvestigacion(id, pestana = "cobertura") {
  const s = estado.obtener();
  estado.actualizar({
    resaltada: id,
    pestana,
    ...(pestana === "cobertura" && !s.examinado ? { examinado: structuredClone(s.escenario) } : {}),
  });
  if (location.hash !== "#" + pestana) location.hash = "#" + pestana;
}

// Chip-botón de una investigación (los eventos los delega cada panel con [data-inv]).
export const chipInvHTML = (id, nombre, titulo) =>
  `<button type="button" class="chip chip-inv" data-inv="${id}" title="${titulo}">${nombre}</button>`;
