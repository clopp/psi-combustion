import { describe, it, expect } from "vitest";
import { normalizar } from "../src/datos/normalizar.js";
import { ENTORNOS } from "../src/datos/referencias.js";
import {
  VISTAS, escalaO2, escalaPresion, clasificarParaMapa, masCercanaEnMapa, agruparEntornos, separarEtiquetas, marcasEjes,
} from "../src/dominio/mapa.js";
import { calcularCompletitud, detectarVacios } from "../src/dominio/vacios.js";

const ficha = (id, extra = {}) => normalizar({ id_psi: id, sigla: id, tipo_proyecto: "Microgravity Investigation", ...extra });
const lunar = ENTORNOS.find((e) => e.id === "base_lunar");

describe("mapa: escalas", () => {
  it("O2 lineal: extremos en 0 y ancho", () => {
    expect(escalaO2(0, 600)).toBe(0);
    expect(escalaO2(100, 600)).toBe(600);
    expect(escalaO2(50, 600)).toBe(300);
  });
  it("presión logarítmica 10-5000: 10 abajo, 5000 arriba, recorta fuera de rango", () => {
    expect(escalaPresion(10, 400)).toBeCloseTo(400);
    expect(escalaPresion(5000, 400)).toBeCloseTo(0);
    expect(escalaPresion(1, 400)).toBeCloseTo(400);
    expect(escalaPresion(1e5, 400)).toBeCloseTo(0);
    const medio = Math.sqrt(10 * 5000);
    expect(escalaPresion(medio, 400)).toBeCloseTo(200);
  });
  it("VISTAS recorta: la zona habitable lleva 10-45 % y 15-200 kPa a los bordes", () => {
    const h = VISTAS.habitable;
    expect(escalaO2(10, 500, h.o2)).toBe(0);
    expect(escalaO2(45, 500, h.o2)).toBe(500);
    expect(escalaO2(100, 500, h.o2)).toBe(500);
    expect(escalaO2(0, 500, h.o2)).toBe(0);
    expect(escalaPresion(15, 300, h.kpa)).toBeCloseTo(300);
    expect(escalaPresion(200, 300, h.kpa)).toBeCloseTo(0);
    expect(escalaPresion(5000, 300, h.kpa)).toBeCloseTo(0);
    expect(VISTAS.todo).toEqual({ o2: [0, 100], kpa: [10, 5000] });
    const m = marcasEjes(h);
    expect(Math.min(...m.o2)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...m.kpa)).toBeLessThanOrEqual(200);
  });
});

describe("mapa: clasificación", () => {
  const fichas = [
    ficha("RANGO", { oxigeno_pct: { min: 21, max: 40 }, presion_kpa: { min: 50, max: 101 } }),
    ficha("PUNTO", { oxigeno_pct: { min: 21, max: 21 }, presion_kpa: { min: 101.3, max: 101.3 } }),
    ficha("SOLO_O2", { oxigeno_pct: { min: 21, max: 21 } }),
    ficha("SOLO_P", { presion_kpa: { min: 100, max: 2000 } }),
    ficha("NADA"),
  ];
  it("separa rangos, puntos, bandas y sin datos", () => {
    const c = clasificarParaMapa(fichas);
    expect(c.rangos.map((x) => [x.id, x.punto])).toEqual([["RANGO", false], ["PUNTO", true]]);
    expect(c.bandasO2.map((x) => x.id)).toEqual(["SOLO_O2"]);
    expect(c.bandasPresion.map((x) => x.id)).toEqual(["SOLO_P"]);
    expect(c.sinDatos).toEqual(["NADA"]);
  });
  it("la más cercana a la base lunar (30 %, 70,3 kPa)", () => {
    const sint = [
      ficha("LEJOS", { oxigeno_pct: { min: 80, max: 100 }, presion_kpa: { min: 20, max: 30 } }),
      ficha("CERCA", { oxigeno_pct: { min: 25, max: 28 }, presion_kpa: { min: 60, max: 80 } }),
      ficha("TIERRA", { oxigeno_pct: { min: 21, max: 21 }, presion_kpa: { min: 101.3, max: 101.3 } }),
      ficha("BANDA", { oxigeno_pct: { min: 30, max: 30 } }),
    ];
    const r = masCercanaEnMapa(sint, lunar);
    expect(r.id).toBe("CERCA");
    expect(r.distancia).toBeCloseTo(0.02);
    expect(masCercanaEnMapa([ficha("CUBRE", { oxigeno_pct: { min: 21, max: 40 }, presion_kpa: { min: 50, max: 101 } })], lunar).distancia).toBe(0);
    expect(masCercanaEnMapa([sint[3]], lunar).id).toBe("BANDA");
    expect(masCercanaEnMapa([ficha("NADA")], lunar)).toBeNull();
  });
  it("agrupa entornos que coinciden y omite los de valores supuestos (Marte)", () => {
    const g = agruparEntornos(ENTORNOS);
    expect(g.some((x) => x.ids.includes("marte"))).toBe(false);
    expect(g.find((x) => x.ids.includes("base_lunar")).ids).toEqual(["base_lunar", "rover"]);
    expect(g.find((x) => x.ids.includes("estacion")).ids).toEqual(["estacion", "tierra"]);
  });
  it("separa etiquetas encimadas en vertical", () => {
    const e = [
      { id: "A", x: 100, y: 50, ancho: 60, alto: 14 },
      { id: "B", x: 110, y: 52, ancho: 60, alto: 14 },
      { id: "C", x: 400, y: 50, ancho: 60, alto: 14 },
    ];
    const r = separarEtiquetas(e, { minY: 0, maxY: 300 });
    expect(Math.abs(r[0].y - r[1].y)).toBeGreaterThanOrEqual(14);
    expect(r[2].y).toBe(50);
    expect(r.map((x) => x.id)).toEqual(["A", "B", "C"]);
  });
});

describe("completitud", () => {
  it("no depende del escenario e incluye las verificadas", () => {
    const f = [
      ficha("A", { oxigeno_pct: { min: 21, max: 21 }, trazabilidad: { verificado_por_humano: true } }),
      ficha("B"),
    ];
    const c = calcularCompletitud(f);
    expect(c.map((x) => x.campo)).toEqual(["oxigeno", "presion", "material", "flujo", "verificadas"]);
    expect(c.find((x) => x.campo === "verificadas")).toEqual({ campo: "verificadas", con: 1, total: 2, sin: ["B"] });
    expect(detectarVacios(f, { ...lunar, material: "tela" }).completitud).toEqual(c);
  });
});
