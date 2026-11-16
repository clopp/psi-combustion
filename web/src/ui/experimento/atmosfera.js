// Atmósfera: oxígeno y presión lado a lado (número + deslizador + marcas, unidad psi/kPa/atm).
import { estado } from "../../estado.js";
import { ENTORNOS } from "../../datos/referencias.js";
import { convertirPresion, UNIDADES_PRESION, RANGO_O2, RANGO_P_KPA } from "../../dominio/escenario.js";
import { traducir } from "../traducir.js";
import { alCambiar, cambiar, DECIMALES_UNIDAD } from "./comun.js";

const valorDe = (id) => ENTORNOS.find((x) => x.id === id);
const MARCAS_O2 = [
  { clave: "marca.tierra", v: valorDe("tierra").o2 },
  { clave: "marca.base_lunar", v: valorDe("base_lunar").o2, clase: "abajo" },
  { clave: "marca.traje", v: valorDe("traje").o2, clase: "fin" },
];
const MARCAS_P = [
  { clave: "marca.traje", v: valorDe("traje").p },
  { clave: "marca.base_lunar", v: valorDe("base_lunar").p },
  { clave: "marca.tierra", v: valorDe("tierra").p },
];
const posO2 = (v) => ((v - RANGO_O2.min) / (RANGO_O2.max - RANGO_O2.min)) * 100;
const posP = (v) => ((v - RANGO_P_KPA.min) / (RANGO_P_KPA.max - RANGO_P_KPA.min)) * 100;
const marcas = (lista, pos) =>
  `<div class="marcas" aria-hidden="true">${lista.map((m) =>
    `<span class="${m.clase || ""}" style="left:${pos(m.v).toFixed(2)}%" data-i18n="${m.clave}"></span>`).join("")}</div>`;
const numero = (v) => {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function montar(raiz) {
  raiz.innerHTML = `
  <section class="bloque bloque-atmosfera" aria-labelledby="titulo-atmosfera">
    <h2 id="titulo-atmosfera" data-i18n="exp.atmosfera"></h2>
    <div class="par-columnas">
      <div class="campo">
        <div class="campo-titulo">
          <label for="o2-num" data-i18n="exp.oxigeno"></label>
          <span class="valor">
            <input type="number" id="o2-num" min="${RANGO_O2.min}" max="${RANGO_O2.max}" step="0.1" inputmode="decimal" data-i18n-attr="aria-label:exp.o2_numero">
            <span aria-hidden="true">%</span>
          </span>
        </div>
        <input type="range" id="o2-rango" min="${RANGO_O2.min}" max="${RANGO_O2.max}" step="0.5" data-i18n-attr="aria-label:exp.o2_deslizador">
        ${marcas(MARCAS_O2, posO2)}
      </div>
      <div class="campo">
        <div class="campo-titulo">
          <label for="p-num" data-i18n="exp.presion"></label>
          <span class="valor">
            <input type="number" id="p-num" min="0" step="0.1" inputmode="decimal" data-i18n-attr="aria-label:exp.p_numero">
            <span class="segmentado segmentado-mini" role="group" data-i18n-attr="aria-label:exp.unidad_presion">
              ${UNIDADES_PRESION.map((u) => `<button type="button" data-unidad="${u}">${u}</button>`).join("")}
            </span>
          </span>
        </div>
        <input type="range" id="p-rango" min="${RANGO_P_KPA.min}" max="${RANGO_P_KPA.max}" step="0.1" data-i18n-attr="aria-label:exp.p_deslizador">
        ${marcas(MARCAS_P, posP)}
      </div>
    </div>
  </section>`;

  const o2Num = raiz.querySelector("#o2-num");
  const o2Rango = raiz.querySelector("#o2-rango");
  const pNum = raiz.querySelector("#p-num");
  const pRango = raiz.querySelector("#p-rango");

  o2Num.addEventListener("change", () => {
    const n = numero(o2Num.value);
    if (n != null) cambiar({ o2: n });
    else dibujar(estado.obtener());
  });
  o2Rango.addEventListener("input", () => cambiar({ o2: Number(o2Rango.value) }));
  pNum.addEventListener("change", () => {
    const n = numero(pNum.value);
    if (n != null && n > 0) cambiar({ p: convertirPresion(n, estado.obtener().escenario.unidad) });
    else dibujar(estado.obtener());
  });
  pRango.addEventListener("input", () => cambiar({ p: Number(pRango.value) }));
  raiz.querySelectorAll("[data-unidad]").forEach((b) =>
    b.addEventListener("click", () => {
      const s = estado.obtener();
      estado.actualizar({ escenario: { ...s.escenario, unidad: b.dataset.unidad } });
    })
  );

  function dibujar(s) {
    const e = s.escenario;
    const enFoco = document.activeElement;
    if (enFoco !== o2Num) o2Num.value = +e.o2.toFixed(1);
    o2Rango.value = e.o2;
    const d = DECIMALES_UNIDAD[e.unidad] + (e.unidad === "atm" ? 1 : 0);
    if (enFoco !== pNum) pNum.value = +convertirPresion(e.p, "kPa", e.unidad).toFixed(d);
    pNum.step = e.unidad === "atm" ? "0.01" : "0.1";
    pRango.value = Math.min(RANGO_P_KPA.max, Math.max(RANGO_P_KPA.min, e.p));
    raiz.querySelectorAll("[data-unidad]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.unidad === e.unidad)));
  }

  alCambiar(["escenario", "idioma"], (s, a) => {
    if (!a || s.idioma !== a.idioma) traducir(raiz);
    dibujar(s);
  });
}
