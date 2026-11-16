// Constantes de referencia (portadas de plantilla_v1.html).
// Los textos visibles viven en i18n: cada elemento usa su id como parte de la clave.

export const ENTORNOS = [
  { id: "estacion", o2: 21, p: 101.3, gravedad: "micro", flujo: "suave", nota: false },
  { id: "base_lunar", o2: 30, p: 70.3, gravedad: "lunar", flujo: "suave", nota: false },
  { id: "rover", o2: 30, p: 70.3, gravedad: "lunar", flujo: "suave", nota: false },
  { id: "traje", o2: 100, p: 29.6, gravedad: "micro", flujo: "quieto", nota: false },
  { id: "tierra", o2: 21, p: 101.3, gravedad: "terrestre", flujo: "quieto", nota: false },
  // Atmósfera marciana aún no definida: se usan los valores de la base lunar (clave entorno.marte_nota).
  { id: "marte", o2: 30, p: 70.3, gravedad: "marciana", flujo: "suave", nota: true },
];
// Texto: t(`entorno.${id}`), y si nota: t(`entorno.${id}_nota`)

export const MATERIALES = [
  { id: "tela", fase: "solido" },
  { id: "plastico", fase: "solido" },
  { id: "espuma", fase: "solido" },
  { id: "liquido", fase: "liquido" },
  { id: "gas", fase: "gas" },
];
// Texto: t(`material.${id}`)

export const GRAVEDADES = [{ id: "micro" }, { id: "lunar" }, { id: "marciana" }, { id: "terrestre" }];
// Texto: t(`gravedad.${id}`)

export const FLUJOS = [
  { id: "quieto", min: 0, max: 2 },
  { id: "suave", min: 2, max: 20 },
  { id: "fuerte", min: 20, max: 100 },
];
// Texto: t(`flujo.${id}`)

export const INTERESES = [{ id: "prevencion" }, { id: "deteccion" }, { id: "supresion" }];
// Texto: t(`interes.${id}`)

// Ids que aparecen en las fichas; texto: t(`etiqueta.${id}`)
export const ETIQUETAS = [
  "prevencion", "deteccion", "supresion", "fundamental",
  "opuesto", "concurrente", "coflujo", "contraflujo", "quiescente", "esferico",
  "nave_espacial", "estacion_espacial", "base_lunar", "base_marciana", "rover_presurizado", "tierra",
  "solido", "liquido", "gas",
];

export const PESOS_INICIALES = { oxigeno: 30, presion: 20, material: 25, gravedad: 10, flujo: 10, interes: 5 };
// Texto: t(`componente.${id}`)
export const COMPONENTES = Object.keys(PESOS_INICIALES);

// Palabras del texto de PSI que indican la categoría del material
export const CATEGORIA_POR_PALABRA = [
  ["tela", ["cotton", "fiberglass", "nomex", "sibal", "fabric", "cloth", "textile", "tela"]],
  ["plastico", ["pmma", "acrylic", "ultem", "delrin", "polyethylene", "kapton", "silicone", "plastic", "polymer", "polycarbonate", "plástico", "plastico"]],
  ["espuma", ["foam", "espuma"]],
  ["liquido", ["heptane", "decane", "dodecane", "ethanol", "methanol", "isooctane", "octane", "hexane", "alcohol", "gota", "droplet", "liquid"]],
  ["gas", ["propane", "ethylene", "methane", "hydrogen", "dimethyl ether", "butane", "gaseous", "quemador", "burner"]],
  ["cera", ["candle", "wax"]],
];
export const FASE_DE_CATEGORIA = { tela: "solido", plastico: "solido", espuma: "solido", cera: "solido", liquido: "liquido", gas: "gas" };
// Texto: t(`categoria.${id}`)

// Familias de hardware; texto: t(`familia.${id}`)
export const FAMILIAS = ["acme", "gotas_mdca", "conducto_msg", "saffire", "humo", "tierra", "otro"];

export const A_KPA = { psi: 6.894757, kPa: 1, atm: 101.325 };

// Fuentes científicas de las reglas de favorabilidad (plantilla_v1.html, 1510-1521); texto: t(`fuentes.${id}`)
export const FUENTES_FUEGO = [
  { id: "bass2_limites", url: "https://ttu-ir.tdl.org/items/1922ad9f-ef4c-4f52-96a4-980c23debe5e" },
  { id: "bass_algodon", url: "https://ntrs.nasa.gov/api/citations/20130012832/downloads/20130012832.pdf" },
  { id: "bass_espesor", url: "https://ntrs.nasa.gov/api/citations/20140011099/downloads/20140011099.pdf" },
  { id: "blog_iss", url: "https://blogs.nasa.gov/ISS_Science_Blog/?p=327" },
  { id: "sofie", url: "https://engineering.berkeley.edu/news/2024/12/nasa-funded-project-offers-new-insights-into-fire-behavior-in-space/" },
  { id: "atmosfera_82", url: "https://asma.kglmeridian.com/downloadpdf/view/journals/amhp/89/9/article-p792.pdf" },
  { id: "eclss", url: "https://ntrs.nasa.gov/citations/20260003925" },
  { id: "fm2", url: "https://ntrs.nasa.gov/citations/20240015307" },
  { id: "transbordador", url: "https://ntrs.nasa.gov/citations/20240003211" },
];

export const URL_PSI = "https://psi.nasa.gov/physci/repo/search?q=&data_source=psi&data_type=investigation";
export const urlBusquedaPSI = (texto) => `https://psi.nasa.gov/physci/repo/search?q=${encodeURIComponent(texto)}`;
