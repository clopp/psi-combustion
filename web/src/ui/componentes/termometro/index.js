// Termómetro vertical de favorabilidad (SVG): bulbo abajo, tubo con 4 tramos, marca fija "ISS"
// y mercurio que sube desde la marca ISS hasta el nivel (posicionMedidor).
// API: crearTermometro(el) -> { actualizar(total, animar) }
//   animar = true: sube desde la ISS (~900 ms, ease-out). false: transición corta desde el valor actual.
import { t } from "../../../i18n/index.js";
import { NIVELES_FUEGO, nivelPorTotal, posicionMedidor } from "../../../dominio/favorabilidad.js";

const REDUCIR = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };
const ALTO = 300;
const Y0 = 248; // 0 %
const Y100 = 20; // 100 %
const yDe = (pct) => Y0 - (pct / 100) * (Y0 - Y100);
const pctAlto = (y) => ((y / ALTO) * 100).toFixed(2) + "%";
const POS_ISS = posicionMedidor(0);

export function crearTermometro(el) {
  el.classList.add("termometro");
  el.setAttribute("role", "img");
  el.innerHTML = `
    <svg viewBox="-16 0 80 ${ALTO}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <rect class="termo-tubo" x="26" y="10" width="22" height="${Y0 + 22 - 10}" rx="11" />
      ${NIVELES_FUEGO.map((n, i) => `<rect class="termo-tramo tramo-${n.id}" x="52" y="${yDe((i + 1) * 25)}" width="6" height="${yDe(i * 25) - yDe((i + 1) * 25) - 1.5}" rx="2" />`).join("")}
      <rect class="termo-mercurio" x="31" width="12" rx="6" />
      <circle class="termo-bulbo-borde" cx="37" cy="${Y0 + 26}" r="20" />
      <circle class="termo-bulbo" cx="37" cy="${Y0 + 26}" r="15" />
      <line class="termo-iss" x1="14" x2="60" y1="${yDe(POS_ISS)}" y2="${yDe(POS_ISS)}" />
      <text class="termo-iss-texto" x="12" y="${yDe(POS_ISS) + 5}" text-anchor="end"></text>
    </svg>
    <ol class="termo-etiquetas">
      ${NIVELES_FUEGO.map((n, i) => `<li data-nivel="${n.id}" style="top:${pctAlto(yDe(i * 25 + 12.5))}"></li>`).join("")}
    </ol>`;

  const mercurio = el.querySelector(".termo-mercurio");
  let actual = null;
  let anim = 0;

  const pintar = (pct) => {
    const y = yDe(pct);
    mercurio.setAttribute("y", y.toFixed(2));
    mercurio.setAttribute("height", (Y0 + 26 - y).toFixed(2));
    actual = pct;
  };

  function mover(destino, desde, ms) {
    cancelAnimationFrame(anim);
    if (REDUCIR.matches || ms <= 0 || desde == null) { pintar(destino); return; }
    const t0 = performance.now();
    const paso = (ahora) => {
      const k = Math.min(1, (ahora - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      pintar(desde + (destino - desde) * e);
      if (k < 1) anim = requestAnimationFrame(paso);
    };
    pintar(desde);
    anim = requestAnimationFrame(paso);
  }

  return {
    actualizar(total, animar = false) {
      const nivel = nivelPorTotal(total);
      el.querySelector(".termo-iss-texto").textContent = t("cob.marca_iss");
      el.querySelectorAll(".termo-etiquetas li").forEach((li) => {
        li.textContent = t(`fuego.nivel.${li.dataset.nivel}`);
        li.classList.toggle("activo", li.dataset.nivel === nivel.id);
      });
      el.setAttribute("aria-label", t("termometro.aria", { nivel: t(`fuego.nivel.${nivel.id}`) }));
      const destino = posicionMedidor(total);
      if (animar) mover(destino, POS_ISS, 900);
      else mover(destino, actual, actual == null ? 0 : 450);
    },
  };
}
