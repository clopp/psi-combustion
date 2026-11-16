// Aplica t() a los elementos marcados, sin recrear el DOM (conserva el foco).
//   data-i18n="clave"                    -> textContent
//   data-i18n-attr="aria-label:clave;title:otra" -> atributos
import { t } from "../i18n/index.js";

export function traducir(raiz = document) {
  for (const el of raiz.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of raiz.querySelectorAll("[data-i18n-attr]")) {
    for (const par of el.dataset.i18nAttr.split(";")) {
      const [attr, clave] = par.split(":").map((s) => s.trim());
      if (attr && clave) el.setAttribute(attr, t(clave));
    }
  }
}
