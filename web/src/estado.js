// Estado único de la app. La UI lee y escribe solo por aquí.

export const ESTADO_INICIAL = {
  idioma: "en",
  pestana: "experimento",
  fichas: [],
  fuente: null, // { archivo, tipo, cargadoEn, embebida }
  avisoCarga: null, // clave i18n del último error de carga
  escenario: {
    o2: 30,
    p: 70.3,
    unidad: "psi",
    material: "tela",
    gravedad: "lunar",
    flujo: "suave",
    intereses: ["prevencion"],
    entorno: "base_lunar",
  },
  examinado: null,
  resultados: null,
  resaltada: null,
  palanca: null, // id de la palanca que se está previsualizando en Cobertura
  comparar: [], // ids seleccionados para comparar
  grupoRecomendacion: "prevencion",
  vistaMapa: "habitable", // "habitable" | "todo" (dominio/mapa.js VISTAS)
  filtrosMapa: { tierra: true, relevantes: false },
};

export function crearEstado(inicial = ESTADO_INICIAL) {
  let actual = structuredClone(inicial);
  const oyentes = new Set();

  function obtener() {
    return actual;
  }

  // Si un oyente actualiza durante una notificación, el cambio se encola: cada oyente
  // recibe los cambios en orden, (s1, s0) y luego (s2, s1), una vez cada uno.
  const cola = [];
  let notificando = false;

  function actualizar(parcial) {
    const anterior = actual;
    actual = { ...actual, ...parcial };
    cola.push([actual, anterior]);
    if (notificando) return actual;
    notificando = true;
    try {
      while (cola.length) {
        const [s, a] = cola.shift();
        for (const fn of [...oyentes]) fn(s, a);
      }
    } finally {
      notificando = false;
      cola.length = 0;
    }
    return actual;
  }

  function suscribir(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }

  return { obtener, actualizar, suscribir };
}

export const estado = crearEstado();
