// Normalización de fichas (acepta las de IA, reglas o curadas a mano). Portado de plantilla_v1.html.
import { CATEGORIA_POR_PALABRA, FASE_DE_CATEGORIA } from "./referencias.js";

export const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
};

export function rangoDe(r) {
  if (!r) return null;
  let a = num(r.min), b = num(r.max);
  if (a == null && b == null) return null;
  if (a == null) a = b;
  if (b == null) b = a;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

function familiaDe(f, tierra) {
  const hw = (f.hardware || "") + " " + (f.sigla || "");
  if (/ACME/i.test(hw)) return "acme";
  if (/MDCA|Droplet/i.test(hw) || /^(FLEX|CFI)/i.test(f.sigla || "")) return "gotas_mdca";
  if (/Glovebox|MSG/i.test(hw)) return "conducto_msg";
  if (/Cygnus|SAFFIRE/i.test(hw)) return "saffire";
  if (/Soot|SAME|P-Trak|DAFT/i.test(hw)) return "humo";
  if (tierra) return "tierra";
  return "otro";
}

export function normalizar(f) {
  const comb = f.combustible || {};
  const materiales = [].concat(comb.material || comb.materiales || []).filter(Boolean);
  const geometrias = [].concat(comb.geometria || comb.geometrias || []).filter(Boolean);
  const textoMat = (materiales.join(" ") + " " + geometrias.join(" ")).toLowerCase();
  const categorias = new Set();
  for (const [cat, palabras] of CATEGORIA_POR_PALABRA) if (palabras.some((p) => textoMat.includes(p))) categorias.add(cat);
  const fases = new Set([].concat(comb.fase || comb.fases || []).filter(Boolean).map((x) => String(x).toLowerCase()));
  categorias.forEach((c) => fases.add(FASE_DE_CATEGORIA[c]));

  const tierra = /ground/i.test(f.tipo_proyecto || "");

  let flujo = rangoDe(f.flujo_cm_s);
  const config = [].concat(f.configuracion_flujo || []);
  if (!flujo && config.includes("quiescente")) flujo = { min: 0, max: 0 };

  const tr = f.trazabilidad || {};
  return {
    id: f.id_psi, sigla: f.sigla || "", titulo: f.titulo || "",
    // Si no hay sigla, la UI añade t("ficha.estudio_tierra") usando `tierra`.
    nombre: f.sigla || f.id_psi,
    tierra, plataforma: f.plataforma || "",
    gravedad: tierra ? "1g" : "micro", familia: familiaDe(f, tierra), hardware: f.hardware || "",
    fechas: [f.fecha_inicio, f.fecha_fin].filter(Boolean),
    materiales, geometrias, categorias, fases,
    o2: rangoDe(f.oxigeno_pct), p: rangoDe(f.presion_kpa), flujo, config,
    diluyentes: [].concat(f.diluyentes || []), funciones: [].concat(f.funcion_seguridad || []),
    entornos: [].concat(f.entornos_relevantes || []), mediciones: [].concat(f.mediciones || []),
    variables: [].concat(f.variables_estudiadas || []), hallazgos: f.hallazgos_clave || "",
    objetivos: f.objetivos || "",
    metodo: tr.metodo_caracterizacion || "desconocido", verificado: !!tr.verificado_por_humano,
    advertencias: [].concat(tr.advertencias || []), evidencia: tr.evidencia || {}, evidenciaOk: tr.evidencia_verificada || {},
  };
}
