import { describe, it, expect } from "vitest";
import { paramsLlama, efectoPresion } from "../src/ui/componentes/llama/index.js";
import { factoresFuego } from "../src/dominio/favorabilidad.js";

const base = { o2: 30, p: 101.3, material: "tela", gravedad: "lunar", flujo: "suave" };

describe("llama y presión", () => {
  it("a 101,3 kPa no cambia nada; los extremos dan ×0,85/−0,25 y ×1,1/+0,15", () => {
    expect(efectoPresion(101.3)).toEqual({ escalaR: 1, hollin: 0 });
    const baja = efectoPresion(10), alta = efectoPresion(250);
    expect(baja.escalaR).toBeCloseTo(0.85);
    expect(baja.hollin).toBeCloseTo(-0.25);
    expect(alta.escalaR).toBeCloseTo(1.1);
    expect(alta.hollin).toBeCloseTo(0.15);
  });

  it("a igual oxígeno, menos presión: llama más pequeña y con menos hollín", () => {
    const iss = paramsLlama(base), baja = paramsLlama({ ...base, p: 70.3 }), alta = paramsLlama({ ...base, p: 150 });
    expect(baja.r).toBeLessThan(iss.r);
    expect(baja.hollin).toBeLessThan(iss.hollin);
    expect(alta.r).toBeGreaterThan(iss.r);
    expect(alta.hollin).toBeGreaterThan(iss.hollin);
  });

  it("la favorabilidad no depende de este efecto", () => {
    expect(factoresFuego({ ...base, p: 95 }).total).toBe(factoresFuego({ ...base, p: 150 }).total);
  });
});
