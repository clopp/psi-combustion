// Carga de fichas con prioridad: curadas > IA > reglas > respaldo embebido; el usuario puede cargar su archivo.
// Los errores se guardan en el estado como id de i18n (avisoCarga), nunca como frase.
import { estado as estadoGlobal } from "../estado.js";
import { normalizar } from "./normalizar.js";
import { tipoDeArchivo } from "./fuente.js";
import respaldo from "./fichas_respaldo.json";

const fuenteDe = (archivo, delUsuario, embebida = false) => ({
  archivo, tipo: tipoDeArchivo(archivo, delUsuario), cargadoEn: Date.now(), embebida,
});

export const RUTAS_FICHAS = [
  "datos/fichas_curadas.json",
  "datos/fichas_caracterizadas_ia.json",
  "datos/fichas_caracterizadas_reglas.json",
];

// Error con código de i18n: "carga.error_json", "carga.error_sin_id", "carga.error"...
export class ErrorCarga extends Error {
  constructor(clave) {
    super(clave);
    this.clave = clave;
  }
}

// Acepta una lista de fichas o un objeto { fichas: [...] }. Descarta las que no tienen id_psi.
export function extraerLista(datos) {
  const lista = Array.isArray(datos) ? datos : datos?.fichas;
  if (!Array.isArray(lista)) throw new ErrorCarga("carga.error");
  const validas = lista.filter((f) => f && typeof f === "object" && f.id_psi);
  if (!validas.length) throw new ErrorCarga("carga.error_sin_id");
  return validas;
}

// Texto -> lista de fichas válidas, o ErrorCarga.
export function leerTextoFichas(texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new ErrorCarga("carga.error_json");
  }
  return extraerLista(datos);
}

export function usarRespaldo({ estado = estadoGlobal, datos = respaldo } = {}) {
  try {
    const lista = extraerLista(datos);
    estado.actualizar({ fichas: lista.map(normalizar), fuente: fuenteDe(datos.origen || "fichas_respaldo.json", false, true) });
    return true;
  } catch {
    return false;
  }
}

export async function cargarFichasIniciales({
  estado = estadoGlobal,
  fetchFn = globalThis.fetch,
  datosRespaldo = respaldo,
  avisarFalla = globalThis.location?.protocol !== "file:",
} = {}) {
  for (const ruta of RUTAS_FICHAS) {
    try {
      if (globalThis.location?.protocol === "file:" || !fetchFn) break; // sin servidor: directo al respaldo
      const resp = await fetchFn(ruta, { cache: "no-cache" });
      if (!resp.ok) continue;
      const lista = extraerLista(await resp.json());
      estado.actualizar({ fichas: lista.map(normalizar), fuente: fuenteDe(ruta.split("/").pop(), false), avisoCarga: null });
      return "servidor";
    } catch {
      // Archivo ausente, sin red o JSON inválido: probar el siguiente.
    }
  }
  if (usarRespaldo({ estado, datos: datosRespaldo })) {
    if (avisarFalla) estado.actualizar({ avisoCarga: "carga.error_red" });
    return "respaldo";
  }
  estado.actualizar({ avisoCarga: "carga.error_total" });
  return null;
}

export async function cargarArchivo(archivo, { estado = estadoGlobal } = {}) {
  const lista = leerTextoFichas(await archivo.text());
  estado.actualizar({ fichas: lista.map(normalizar), fuente: fuenteDe(archivo.name, true), avisoCarga: null });
  return lista.length;
}
