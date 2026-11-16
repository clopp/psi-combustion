import { describe, it, expect, vi } from "vitest";
import { crearEstado, ESTADO_INICIAL, estado } from "../src/estado.js";

describe("estado", () => {
  it("arranca con la base lunar", () => {
    const s = crearEstado().obtener();
    expect(s.idioma).toBe("en");
    expect(s.pestana).toBe("experimento");
    expect(s.escenario).toMatchObject({ o2: 30, p: 70.3, unidad: "psi", entorno: "base_lunar", intereses: ["prevencion"] });
    expect(s.examinado).toBeNull();
    expect(estado.obtener().escenario.material).toBe("tela");
  });

  it("no comparte el objeto inicial entre instancias", () => {
    const a = crearEstado();
    a.obtener().escenario.o2 = 99;
    expect(ESTADO_INICIAL.escenario.o2).toBe(30);
    expect(crearEstado().obtener().escenario.o2).toBe(30);
  });

  it("actualizar mezcla el parcial y conserva el resto", () => {
    const e = crearEstado();
    const nuevo = e.actualizar({ idioma: "en" });
    expect(nuevo.idioma).toBe("en");
    expect(e.obtener().pestana).toBe("experimento");
  });

  it("suscribir avisa con estado nuevo y anterior, y se puede desuscribir", () => {
    const e = crearEstado();
    const fn = vi.fn();
    const salir = e.suscribir(fn);
    e.actualizar({ pestana: "mapa" });
    expect(fn).toHaveBeenCalledTimes(1);
    const [nuevo, anterior] = fn.mock.calls[0];
    expect(nuevo.pestana).toBe("mapa");
    expect(anterior.pestana).toBe("experimento");
    salir();
    e.actualizar({ pestana: "alcance" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("las actualizaciones anidadas se entregan en orden, una vez a cada oyente", () => {
    const e = crearEstado();
    const vistos = [];
    e.suscribir((s, a) => { if (s.examinado !== a.examinado) e.actualizar({ resultados: "r" }); });
    e.suscribir((s, a) => vistos.push([a.examinado, s.examinado, a.resultados, s.resultados]));
    e.actualizar({ examinado: "x" });
    expect(vistos).toEqual([[null, "x", null, null], ["x", "x", null, "r"]]);
  });
});
