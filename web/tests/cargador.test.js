import { describe, it, expect } from "vitest";
import { crearEstado, ESTADO_INICIAL } from "../src/estado.js";
import { cargarFichasIniciales, leerTextoFichas, extraerLista, cargarArchivo } from "../src/datos/cargador.js";

const respuesta = (ok, cuerpo) => ({ ok, json: async () => (typeof cuerpo === "string" ? JSON.parse(cuerpo) : cuerpo) });

describe("cargador: errores sin romper la app", () => {
  it("JSON inválido -> carga.error_json", () => {
    expect(() => leerTextoFichas("{no es json")).toThrow(expect.objectContaining({ clave: "carga.error_json" }));
  });
  it("sin id_psi -> carga.error_sin_id", () => {
    expect(() => extraerLista([{ sigla: "X" }])).toThrow(expect.objectContaining({ clave: "carga.error_sin_id" }));
  });
  it("formato desconocido -> carga.error", () => {
    expect(() => extraerLista({ otra: 1 })).toThrow(expect.objectContaining({ clave: "carga.error" }));
  });

  it("si el servidor falla, usa el respaldo embebido y avisa", async () => {
    const estado = crearEstado(ESTADO_INICIAL);
    const r = await cargarFichasIniciales({ estado, fetchFn: async () => { throw new Error("red"); }, avisarFalla: true });
    expect(r).toBe("respaldo");
    expect(estado.obtener().fichas).toHaveLength(24);
    expect(estado.obtener().fuente.embebida).toBe(true);
    expect(estado.obtener().avisoCarga).toBe("carga.error_red");
  });

  it("si un archivo del servidor es inválido, prueba el siguiente", async () => {
    const estado = crearEstado(ESTADO_INICIAL);
    const fetchFn = async (ruta) => (ruta.includes("curadas") ? respuesta(true, "[1,2]") : ruta.includes("_ia") ? respuesta(false) : respuesta(true, [{ id_psi: "PSI-1" }]));
    expect(await cargarFichasIniciales({ estado, fetchFn })).toBe("servidor");
    expect(estado.obtener().fichas).toHaveLength(1);
    expect(estado.obtener().avisoCarga).toBeNull();
  });

  it("sin servidor ni respaldo válido: aviso total", async () => {
    const estado = crearEstado(ESTADO_INICIAL);
    const r = await cargarFichasIniciales({ estado, fetchFn: async () => respuesta(false), datosRespaldo: { fichas: [] } });
    expect(r).toBeNull();
    expect(estado.obtener().avisoCarga).toBe("carga.error_total");
    expect(estado.obtener().fichas).toEqual([]);
  });

  it("archivo del usuario inválido no cambia las fichas", async () => {
    const estado = crearEstado({ ...ESTADO_INICIAL, fichas: [{ id: "A" }] });
    await expect(cargarArchivo({ text: async () => "[]" }, { estado })).rejects.toMatchObject({ clave: "carga.error_sin_id" });
    expect(estado.obtener().fichas).toEqual([{ id: "A" }]);
  });
});
