import { describe, it, expect } from "vitest";
import es from "../src/i18n/es.js";
import en from "../src/i18n/en.js";
import zh from "../src/i18n/zh.js";
import pt from "../src/i18n/pt.js";
import { t, fmt, cambiarIdioma, idiomaActual, interpolar, idiomaInicial, IDIOMAS } from "../src/i18n/index.js";

const OTROS = { en, zh, pt };
const marcadores = (s) => (s.match(/\{\w+\}/g) || []).sort();

describe("i18n", () => {
  it("hay 4 idiomas, con inglés primero en el selector", () => expect(IDIOMAS).toEqual(["en", "es", "zh", "pt"]));

  for (const [id, dic] of Object.entries(OTROS)) {
    it(`${id} tiene exactamente las mismas claves que es`, () => {
      expect(Object.keys(dic).sort()).toEqual(Object.keys(es).sort());
    });
    it(`${id} conserva los mismos marcadores {variable} que es`, () => {
      for (const k of Object.keys(es)) expect(marcadores(dic[k] || ""), `${id}:${k}`).toEqual(marcadores(es[k]));
    });
  }

  it("ningún texto vacío ni con TODO", () => {
    for (const [id, dic] of Object.entries({ es, ...OTROS })) {
      for (const [k, v] of Object.entries(dic)) {
        expect(typeof v, `${id}:${k}`).toBe("string");
        expect(v.trim(), `${id}:${k}`).not.toBe("");
        expect(v, `${id}:${k}`).not.toMatch(/TODO/);
      }
    }
  });

  it("nombres propios sin traducir", () => {
    for (const dic of [es, en, zh, pt]) expect(dic["app.nombre"]).toBe("BLUE FLAME");
  });

  it("interpola {variables}", () => {
    expect(interpolar("{n} de {total}", { n: 3, total: 24 })).toBe("3 de 24");
    expect(interpolar("sin {x}", {})).toBe("sin {x}");
  });

  it("t traduce según el idioma del estado", () => {
    cambiarIdioma("es");
    expect(t("carga.n_investigaciones", { n: 24 })).toBe("24 investigaciones");
    cambiarIdioma("en");
    expect(idiomaActual()).toBe("en");
    expect(t("carga.n_investigaciones", { n: 24 })).toBe("24 investigations");
    expect(t("clave.inexistente")).toBe("clave.inexistente");
    cambiarIdioma("xx");
    expect(idiomaActual()).toBe("en");
    cambiarIdioma("es");
  });

  it("fmt usa coma decimal en es y pt, punto en en y zh", () => {
    const esperado = { es: "70,3", pt: "70,3", en: "70.3", zh: "70.3" };
    for (const [id, v] of Object.entries(esperado)) {
      cambiarIdioma(id);
      expect(fmt(70.3)).toBe(v);
    }
    expect(fmt(null)).toBe("—");
    cambiarIdioma("es");
  });

  it("idioma inicial: URL > guardado > inglés por defecto", () => {
    expect(idiomaInicial()).toBe("en");
    expect(idiomaInicial({ url: "zh", guardado: "es" })).toBe("zh");
    expect(idiomaInicial({ url: null, guardado: "pt" })).toBe("pt");
    expect(idiomaInicial({ url: "xx", guardado: "yy" })).toBe("en");
  });
});
