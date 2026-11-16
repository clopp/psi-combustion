import { describe, it, expect } from "vitest";
import { leerEscenarioUrl, escribirEscenarioUrl } from "../src/datos/url.js";
import { ESTADO_INICIAL } from "../src/estado.js";

const base = ESTADO_INICIAL.escenario;

describe("leerEscenarioUrl", () => {
  it("sin parámetros devuelve el escenario base", () => {
    const r = leerEscenarioUrl("", base);
    expect(r.escenario).toEqual(base);
    expect(r).toMatchObject({ idioma: null, examinar: false, hayEscenario: false });
  });

  it("entorno rover + examinar + lang=pt", () => {
    const r = leerEscenarioUrl("?entorno=rover&examinar=1&lang=pt", base);
    expect(r.escenario).toMatchObject({ entorno: "rover", o2: 30, p: 70.3, gravedad: "lunar", flujo: "suave" });
    expect(r).toMatchObject({ idioma: "pt", examinar: true, hayEscenario: true });
  });

  it("ejemplo completo con kPa", () => {
    const r = leerEscenarioUrl("?entorno=rover&o2=30&p=70.3&u=kPa&material=espuma&gravedad=lunar&flujo=suave&interes=deteccion,supresion", base);
    expect(r.escenario).toMatchObject({ entorno: "rover", o2: 30, p: 70.3, unidad: "kPa", material: "espuma", intereses: ["deteccion", "supresion"] });
  });

  it("convierte la presión desde psi y acepta coma decimal", () => {
    const r = leerEscenarioUrl("o2=34&p=8,2&u=psi", base);
    expect(r.escenario.p).toBeCloseTo(56.537, 3);
    expect(r.escenario.unidad).toBe("psi");
    expect(r.escenario.entorno).toBe("personalizado");
  });

  it("ignora valores inválidos y deja los por defecto", () => {
    const r = leerEscenarioUrl("entorno=luna&o2=150&p=-3&u=bar&material=madera&gravedad=x&flujo=&interes=nada&lang=fr&examinar=si", base);
    expect(r.escenario).toEqual(base);
    expect(r).toMatchObject({ idioma: null, examinar: false, hayEscenario: false });
    expect(leerEscenarioUrl("o2=abc&p=1e9", base).escenario).toEqual(base);
  });

  it("interes vacío deja la lista vacía (todos)", () => {
    expect(leerEscenarioUrl("interes=", base).escenario.intereses).toEqual([]);
  });
});

describe("escribirEscenarioUrl", () => {
  it("escribe la presión en la unidad del escenario y omite personalizado", () => {
    const q = new URLSearchParams(escribirEscenarioUrl({ ...base, entorno: "personalizado", p: 56.537, unidad: "psi" }));
    expect(q.has("entorno")).toBe(false);
    expect(Number(q.get("p"))).toBeCloseTo(8.2, 3);
    expect(q.get("u")).toBe("psi");
    expect(q.has("lang")).toBe(false);
    expect(q.has("examinar")).toBe(false);
  });

  it("ida y vuelta con idioma y examinar", () => {
    const q = escribirEscenarioUrl(base, { idioma: "zh", examinar: true });
    const r = leerEscenarioUrl(q, ESTADO_INICIAL.escenario);
    expect(r.escenario.material).toBe(base.material);
    expect(r.escenario.entorno).toBe(base.entorno);
    expect(r.escenario.p).toBeCloseTo(base.p, 2);
    expect(r).toMatchObject({ idioma: "zh", examinar: true });
  });
});
