// Escenarios completos: favorabilidad, vacíos, evaluación de las 24 fichas y URL de ida y vuelta.
import { describe, it, expect } from "vitest";
import respaldo from "../src/datos/fichas_respaldo.json";
import { normalizar } from "../src/datos/normalizar.js";
import { ESTADO_INICIAL } from "../src/estado.js";
import { leerEscenarioUrl, escribirEscenarioUrl } from "../src/datos/url.js";
import { factoresFuego } from "../src/dominio/favorabilidad.js";
import { evaluarTodas } from "../src/dominio/relevancia.js";
import { detectarVacios } from "../src/dominio/vacios.js";
import { aplicarEntorno, cambiarEscenario, convertirPresion } from "../src/dominio/escenario.js";

const fichas = respaldo.fichas.map(normalizar);
const base = ESTADO_INICIAL.escenario;

const ESCENARIOS = [
  { nombre: "ISS", e: aplicarEntorno(base, "estacion"), nivel: "similar", vivo: true, vacios: 2 },
  { nombre: "base lunar", e: aplicarEntorno(base, "base_lunar"), nivel: "mayor", vivo: true, vacios: 3 },
  { nombre: "Tierra con 16 % de O2", e: cambiarEscenario(aplicarEntorno(base, "tierra"), { o2: 16 }), nivel: "menor", vivo: false, vacios: 2 },
  {
    nombre: "34 % de O2 a 8,2 psi (lunar)",
    e: cambiarEscenario(aplicarEntorno(base, "base_lunar"), { o2: 34, p: convertirPresion(8.2, "psi"), unidad: "psi" }),
    nivel: "mucho", vivo: true, vacios: 3,
  },
];

describe("escenarios completos", () => {
  it("el respaldo trae 24 fichas", () => expect(fichas).toHaveLength(24));

  for (const c of ESCENARIOS) {
    describe(c.nombre, () => {
      it(`favorabilidad: ${c.nivel}`, () => {
        const f = factoresFuego(c.e);
        expect(f.nivel.id).toBe(c.nivel);
        expect(f.vivo).toBe(c.vivo);
      });

      it(`${c.vacios} vacíos de información`, () => {
        expect(detectarVacios(fichas, c.e).total).toBe(c.vacios);
      });

      it("evaluarTodas devuelve las 24 ordenadas de mayor a menor", () => {
        const lista = evaluarTodas(fichas, c.e);
        expect(lista).toHaveLength(24);
        for (let i = 1; i < lista.length; i++) expect(lista[i - 1].orden).toBeGreaterThanOrEqual(lista[i].orden);
      });

      it("la URL de ida y vuelta conserva el escenario", () => {
        const q = escribirEscenarioUrl(c.e, { idioma: "pt", examinar: true });
        const r = leerEscenarioUrl(q, base);
        expect(r.idioma).toBe("pt");
        expect(r.examinar).toBe(true);
        const { p, ...resto } = r.escenario;
        const { p: p0, ...resto0 } = c.e;
        expect(resto).toEqual(resto0);
        expect(p).toBeCloseTo(p0, 2);
        expect(factoresFuego(r.escenario).total).toBeCloseTo(factoresFuego(c.e).total, 6);
      });
    });
  }
});
