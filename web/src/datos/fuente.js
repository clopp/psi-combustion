// Origen de las fichas cargadas: tipo por nombre de archivo y resumen de conteos.
export const TIPOS_FUENTE = ["curadas", "ia", "reglas", "usuario"];

export function tipoDeArchivo(nombre, delUsuario = false) {
  if (delUsuario) return "usuario";
  if (/curadas/i.test(nombre)) return "curadas";
  if (/_ia\b|_ia\./i.test(nombre)) return "ia";
  if (/reglas/i.test(nombre)) return "reglas";
  return "usuario";
}

export const esMetodoIA = (m) => /^ia/i.test(String(m || ""));

// fichas normalizadas + fuente { archivo, tipo, cargadoEn } -> conteos
export function resumirFuente(fichas, fuente) {
  const r = {
    archivo: fuente?.archivo ?? null, tipo: fuente?.tipo ?? null, cargadoEn: fuente?.cargadoEn ?? null, embebida: !!fuente?.embebida,
    total: fichas.length, reglas: 0, ia: 0, verificadas: 0, vuelo: 0, tierra: 0,
  };
  for (const f of fichas) {
    if (f.metodo === "reglas") r.reglas++;
    else if (esMetodoIA(f.metodo)) r.ia++;
    if (f.verificado) r.verificadas++;
    if (f.tierra) r.tierra++;
    else r.vuelo++;
  }
  return r;
}
