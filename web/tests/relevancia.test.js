import { describe, it, expect } from "vitest";
import { normalizar } from "../src/datos/normalizar.js";
import { cercaniaRango, componentes, evaluar, evaluarTodas, nivelDe, distO2, PESOS_INICIALES } from "../src/dominio/relevancia.js";
import { detectarVacios } from "../src/dominio/vacios.js";
import { calcularResultados, escenarioCambio } from "../src/dominio/resultados.js";
import { resumirFuente, tipoDeArchivo } from "../src/datos/fuente.js";

const ficha = (id, extra = {}) =>
  normalizar({ id_psi: id, sigla: id, tipo_proyecto: "Microgravity Investigation", ...extra });
const esc = { o2: 30, p: 70.3, material: "tela", gravedad: "micro", flujo: "suave", intereses: ["prevencion"] };

describe("relevancia", () => {
  it("O2 dentro del rango -> cercanía 1; fuera decrece; sin rango -> null", () => {
    expect(cercaniaRango(25, { min: 21, max: 30 }, distO2)).toBe(1);
    expect(cercaniaRango(35, { min: 21, max: 30 }, distO2)).toBeCloseTo(0.5);
    expect(cercaniaRango(25, null, distO2)).toBeNull();
    const c = componentes(ficha("A", { oxigeno_pct: { min: 21, max: 40 } }), esc);
    expect(c.oxigeno).toBe(1);
  });

  it("componente sin dato se excluye del puntaje y baja la cobertura", () => {
    const completa = ficha("A", {
      oxigeno_pct: { min: 21, max: 40 }, presion_kpa: { min: 50, max: 101 }, flujo_cm_s: { min: 5, max: 10 },
      combustible: { material: ["cotton fabric"] }, funcion_seguridad: ["prevencion"],
    });
    const sinO2 = ficha("B", {
      presion_kpa: { min: 50, max: 101 }, flujo_cm_s: { min: 5, max: 10 },
      combustible: { material: ["cotton fabric"] }, funcion_seguridad: ["prevencion"],
    });
    const a = evaluar(completa, esc);
    const b = evaluar(sinO2, esc);
    expect(a.cobertura).toBe(1);
    expect(b.comp.oxigeno).toBeNull();
    expect(b.cobertura).toBeLessThan(1);
    expect(b.cobertura).toBeCloseTo(1 - PESOS_INICIALES.oxigeno / 100);
    expect(b.puntaje).toBe(1);
    expect(b.orden).toBeLessThan(a.orden);
  });

  it("interés vacío no cuenta en el peso total", () => {
    const c = componentes(ficha("A"), { ...esc, intereses: [] });
    expect(c.interes).toBeUndefined();
  });

  it("umbrales de nivelDe: 70 alta, 50 media", () => {
    expect(nivelDe(0.7).id).toBe("alta");
    expect(nivelDe(0.69).id).toBe("media");
    expect(nivelDe(0.5).id).toBe("media");
    expect(nivelDe(0.49).id).toBe("baja");
    expect(nivelDe(0).id).toBe("baja");
  });

  it("evaluarTodas ordena de mayor a menor", () => {
    const l = evaluarTodas([ficha("X"), ficha("Y", { oxigeno_pct: { min: 25, max: 35 } })], esc);
    expect(l[0].id).toBe("Y");
    expect(l[0].orden).toBeGreaterThanOrEqual(l[1].orden);
  });
});

describe("vacíos", () => {
  it("combinación sin estudiar con 3 fichas sintéticas", () => {
    const fichas = [
      ficha("TELA", { combustible: { material: ["cotton"] }, oxigeno_pct: { min: 15, max: 21 }, presion_kpa: { min: 101, max: 101 } }),
      ficha("O2ALTO", { combustible: { material: ["pmma"] }, oxigeno_pct: { min: 28, max: 40 }, presion_kpa: { min: 101, max: 101 } }),
      ficha("OTRA", { combustible: { material: ["heptane"] }, oxigeno_pct: { min: 21, max: 21 } }),
    ];
    const v = detectarVacios(fichas, { ...esc, o2: 30, p: 101.3 });
    expect(v.combinaciones).toEqual([{ id: "material_oxigeno", vars: { material: "tela", o2: 30 }, a: ["TELA"], b: ["O2ALTO"] }]);
    expect(v.condiciones).toEqual([]);
    expect(v.gravedad).toBeNull();
    expect(v.total).toBe(1);
    expect(v.completitud.find((c) => c.campo === "presion")).toEqual({ campo: "presion", con: 2, total: 3, sin: ["OTRA"] });
  });

  it("condición sin datos señala la ficha más cercana", () => {
    const fichas = [ficha("A", { oxigeno_pct: { min: 15, max: 21 } }), ficha("B", { oxigeno_pct: { min: 21, max: 25 } })];
    const v = detectarVacios(fichas, { ...esc, o2: 40 });
    const c = v.condiciones.find((x) => x.id === "oxigeno");
    expect(c.vars).toEqual({ o2: 40 });
    expect(c.cercana).toEqual({ id: "B", min: 21, max: 25 });
  });

  it("gravedad lunar genera un vacío", () => {
    const v = detectarVacios([ficha("A")], { ...esc, gravedad: "lunar" });
    expect(v.gravedad).toEqual({ id: "lunar" });
    expect(v.total).toBeGreaterThanOrEqual(1);
  });
});

describe("resultados y fuente", () => {
  it("calcularResultados devuelve lista, vacíos y contadores", () => {
    const r = calcularResultados([ficha("A", { oxigeno_pct: { min: 25, max: 35 } })], esc);
    expect(r.lista).toHaveLength(1);
    expect(r.contadores.alcance).toBe(r.vacios.total);
    expect(r.contadores.cobertura).toBe(r.niveles.alta + r.niveles.media);
    expect(calcularResultados([], null)).toBeNull();
  });

  it("escenarioCambio compara solo variables del cálculo", () => {
    expect(escenarioCambio(esc, { ...esc, entorno: "x" })).toBe(false);
    expect(escenarioCambio(esc, { ...esc, o2: 21 })).toBe(true);
    expect(escenarioCambio(esc, { ...esc, intereses: [] })).toBe(true);
  });

  it("resumirFuente cuenta métodos, verificadas, vuelo y tierra", () => {
    const fichas = [
      ficha("A", { trazabilidad: { metodo_caracterizacion: "reglas" } }),
      ficha("B", { trazabilidad: { metodo_caracterizacion: "IA (modelo)", verificado_por_humano: true } }),
      ficha("C", { tipo_proyecto: "Ground Investigation", trazabilidad: { metodo_caracterizacion: "reglas" } }),
    ];
    const fuente = { archivo: "fichas_caracterizadas_reglas.json", tipo: "reglas", cargadoEn: 1 };
    expect(resumirFuente(fichas, fuente)).toEqual({
      archivo: "fichas_caracterizadas_reglas.json", tipo: "reglas", cargadoEn: 1, embebida: false,
      total: 3, reglas: 2, ia: 1, verificadas: 1, vuelo: 2, tierra: 1,
    });
    expect(resumirFuente([], null).total).toBe(0);
  });

  it("tipoDeArchivo reconoce las fuentes", () => {
    expect(tipoDeArchivo("fichas_curadas.json")).toBe("curadas");
    expect(tipoDeArchivo("fichas_caracterizadas_ia.json")).toBe("ia");
    expect(tipoDeArchivo("fichas_caracterizadas_reglas.json")).toBe("reglas");
    expect(tipoDeArchivo("fichas_caracterizadas_reglas.json", true)).toBe("usuario");
  });
});

import { construirCSV, CABECERA_CSV, nombreCSV } from "../src/datos/csv.js";
describe("csv", () => {
  it("una fila por investigación, con escape de comas", () => {
    const l = evaluarTodas([ficha("A", { titulo: "x", combustible: { material: ["cotton, fabric"] } })], esc);
    const lineas = construirCSV(l, { ...esc, entorno: "base_lunar" }).replace("﻿", "").split("\n");
    expect(lineas[0]).toBe(CABECERA_CSV.join(","));
    expect(lineas).toHaveLength(2);
    expect(lineas[1]).toContain('"cotton, fabric"');
    expect(nombreCSV({ ...esc, entorno: "base_lunar" })).toBe("relevancia_base_lunar_30O2_70kPa.csv");
  });
});
