// Resultados del escenario examinado: lista ordenada, vacíos y contadores de pestañas.
import { evaluarTodas, contarNiveles, PESOS_INICIALES } from "./relevancia.js";
import { detectarVacios } from "./vacios.js";

export function calcularResultados(fichas, examinado, pesos = PESOS_INICIALES) {
  if (!examinado) return null;
  const lista = evaluarTodas(fichas, examinado, pesos);
  const vacios = detectarVacios(fichas, examinado);
  const niveles = contarNiveles(lista);
  return { lista, vacios, niveles, contadores: { cobertura: niveles.alta + niveles.media, alcance: vacios.total } };
}

// ¿Cambió el escenario desde que se examinó? (compara las variables que usa el cálculo)
const CLAVES = ["o2", "p", "material", "gravedad", "flujo", "intereses"];
export function escenarioCambio(a, b) {
  if (!a || !b) return false;
  return CLAVES.some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}
