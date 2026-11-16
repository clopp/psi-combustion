import { describe, it, expect } from "vitest";
import { factoresFuego, posicionMedidor, REF_ISS } from "../src/dominio/favorabilidad.js";
import { recomendacionesPara, palancasPara, agruparRecomendaciones } from "../src/dominio/recomendaciones.js";
import { aplicarEntorno, cambiarEscenario, convertirPresion, marcarPersonalizado } from "../src/dominio/escenario.js";
import { ESTADO_INICIAL } from "../src/estado.js";

const base = { ...ESTADO_INICIAL.escenario };
const lunar = aplicarEntorno(base, "base_lunar");
const factor = (r, id) => r.factores.find((f) => f.id === id);

describe("favorabilidad", () => {
  it("base lunar: mayor que la ISS (30 % O2 a 70,3 kPa resta 0,5 por presión)", () => {
    const r = factoresFuego(lunar);
    expect(r.vivo).toBe(true);
    expect(r.total).toBeCloseTo(2.75);
    expect(r.nivel.id).toBe("mayor");
  });

  it("ISS: similar con total 0", () => {
    const r = factoresFuego(REF_ISS);
    expect(r.total).toBe(0);
    expect(r.nivel.id).toBe("similar");
    expect(posicionMedidor(0)).toBe(37.5);
  });

  it("Tierra con 16 % de O2: la llama no se sostiene y queda en menor", () => {
    const r = factoresFuego({ ...aplicarEntorno(base, "tierra"), o2: 16 });
    expect(r.vivo).toBe(false);
    expect(r.nivel.id).toBe("menor");
  });

  it("34 % a 8,2 psi en microgravedad activa el factor de presión", () => {
    const e = { ...REF_ISS, o2: 34, p: convertirPresion(8.2, "psi") };
    const f = factor(factoresFuego(e), "presion");
    expect(f.delta).toBe(1);
    expect(f.variante).toBe("aumentada");
  });

  it("presión < 90 kPa con O2 ≤ 31,4 %: resta 0,5 (combustión más lenta)", () => {
    const f = factor(factoresFuego({ ...REF_ISS, o2: 30, p: 70.3 }), "presion");
    expect(f).toMatchObject({ delta: -0.5, variante: "reducida", vars: { umbral: 31.4 } });
    expect(factor(factoresFuego({ ...REF_ISS, o2: 31.4, p: 89.9 }), "presion").delta).toBe(-0.5);
  });

  it("presión < 90 kPa con O2 > 31,4 % mantiene +1; desde 90 kPa no aporta", () => {
    expect(factor(factoresFuego({ ...REF_ISS, o2: 31.5, p: 70.3 }), "presion").delta).toBe(1);
    expect(factor(factoresFuego({ ...REF_ISS, o2: 30, p: 90 }), "presion")).toMatchObject({ delta: 0, variante: "similar" });
  });

  it("cada factor trae id, delta, variante, vars y fuente, sin frases", () => {
    for (const f of factoresFuego(lunar).factores) {
      expect(Object.keys(f).sort()).toEqual(["delta", "fuente", "id", "variante", "vars"]);
    }
    expect(factor(factoresFuego(lunar), "oxigeno")).toMatchObject({ variante: "sube", vars: { d: 9 } });
  });
});

describe("recomendaciones", () => {
  it("lunar activa la recomendación de gravedad parcial", () => {
    const r = recomendacionesPara(lunar);
    expect(r.find((x) => x.id === "gravedad_parcial")).toMatchObject({ grupo: "prevencion", clave: true });
  });

  it("34 % en microgravedad con aire quieto: cortar la ventilación podría no bastar", () => {
    const r = recomendacionesPara({ ...REF_ISS, o2: 34, flujo: "quieto" });
    expect(r.find((x) => x.id === "cortar_no_basta")).toMatchObject({ grupo: "supresion", clave: true, investigaciones: ["BASS-II"] });
    expect(r.find((x) => x.id === "cortar_ayuda")).toBeUndefined();
  });

  it("devuelve ids y vars, y se agrupa en los 3 grupos", () => {
    const r = recomendacionesPara(lunar);
    expect(r.find((x) => x.id === "probar_oxigeno").vars).toEqual({ o2: 30 });
    const g = agruparRecomendaciones(r);
    expect(Object.keys(g)).toEqual(["prevencion", "deteccion", "supresion"]);
    expect(g.supresion.map((x) => x.id)).toEqual(["dilucion"]);
  });

  it("plástico en la ISS: prevención mantiene los materiales actuales", () => {
    const g = agruparRecomendaciones(recomendacionesPara({ ...REF_ISS, material: "plastico" }));
    expect(g.prevencion.map((x) => x.id)).toEqual(["mantener_materiales"]);
  });

  it("palancas: la de mayor efecto queda marcada como clave", () => {
    const p = palancasPara(lunar);
    expect(p.map((x) => x.id)).toEqual(["o2_265", "o2_21", "ignifugo"]);
    expect(p.filter((x) => x.clave).map((x) => x.id)).toEqual(["o2_21"]);
    // 21 % a 70,3 kPa en gravedad lunar: 0 (O2) − 0,5 (presión) + 1 (gravedad) = 0,5 -> similar
    expect(p[1].diferencia).toBeCloseTo(-2.25);
    expect(p[1].nivel.id).toBe("similar");
  });
});

describe("escenario", () => {
  it("mover el O2 marca el escenario como personalizado", () => {
    expect(lunar.entorno).toBe("base_lunar");
    expect(cambiarEscenario(lunar, { o2: 31 }).entorno).toBe("personalizado");
    expect(cambiarEscenario(lunar, { material: "gas" }).entorno).toBe("base_lunar");
    expect(marcarPersonalizado(lunar)).toBe(lunar);
  });

  it("aplicarEntorno copia O2, presión, gravedad y flujo", () => {
    expect(aplicarEntorno(lunar, "traje")).toMatchObject({ entorno: "traje", o2: 100, p: 29.6, gravedad: "micro", flujo: "quieto", material: "tela" });
  });

  it("convertirPresion entre unidades", () => {
    expect(convertirPresion(14.7, "psi")).toBeCloseTo(101.35, 1);
    expect(convertirPresion(101.325, "kPa", "atm")).toBeCloseTo(1, 6);
    expect(convertirPresion(1, "xx")).toBeNull();
  });
});
