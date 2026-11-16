import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizar, rangoDe } from "../src/datos/normalizar.js";
import { extraerLista } from "../src/datos/cargador.js";

const fichas = JSON.parse(readFileSync(new URL("../public/datos/fichas_caracterizadas_reglas.json", import.meta.url), "utf8"));
const porId = (id) => normalizar(fichas.find((f) => f.id_psi === id));

describe("rangoDe", () => {
  it("completa extremos ausentes y ordena", () => {
    expect(rangoDe({ min: null, max: 5 })).toEqual({ min: 5, max: 5 });
    expect(rangoDe({ min: 9, max: 3 })).toEqual({ min: 3, max: 9 });
    expect(rangoDe({ min: null, max: null })).toBeNull();
    expect(rangoDe(null)).toBeNull();
  });
});

describe("normalizar", () => {
  it("el JSON trae 24 fichas", () => {
    expect(extraerLista(fichas)).toHaveLength(24);
  });

  it("BASS: categorías de material desde las palabras y valores nulos", () => {
    const f = porId("PSI-26");
    expect([...f.categorias].sort()).toEqual(["plastico", "tela"]);
    expect([...f.fases]).toEqual(["solido"]);
    expect(f.o2).toBeNull();
    expect(f.p).toBeNull();
    expect(f.flujo).toEqual({ min: 40, max: 40 });
    expect(f.hallazgos).toBe("");
    expect(f.verificado).toBe(false);
    expect(f.metodo).toBe("reglas");
  });

  it("ACME BRE: rango de oxígeno y flujo 0 si es aire quieto", () => {
    const f = porId("PSI-20");
    expect(f.categorias.has("plastico")).toBe(true);
    expect(f.categorias.has("cera")).toBe(true);
    expect(f.o2).toEqual({ min: 21, max: 34 });
    expect(f.flujo).toEqual({ min: 0, max: 0 });
    expect(f.familia).toBe("acme");
  });

  it("CFI: líquido y rango de presión", () => {
    const f = porId("PSI-39");
    expect(f.categorias.has("liquido")).toBe(true);
    expect(f.fases.has("liquido")).toBe(true);
    expect(f.p).toEqual({ min: 25.331, max: 506.625 });
    expect(f.familia).toBe("gotas_mdca");
  });

  it("estudio en tierra sin sigla", () => {
    const f = porId("PSI-60");
    expect(f.tierra).toBe(true);
    expect(f.gravedad).toBe("1g");
    expect(f.nombre).toBe("PSI-60");
    expect(f.familia).toBe("tierra");
  });
});
