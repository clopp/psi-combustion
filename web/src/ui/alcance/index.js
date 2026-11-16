// Alcance: vacíos de información del escenario examinado (combinaciones sin estudiar y condiciones
// sin datos, de resultados.vacios) y completitud de las fichas (no depende del escenario).
import { estado } from "../../estado.js";
import { t, fmt, minuscula } from "../../i18n/index.js";
import { calcularCompletitud } from "../../dominio/vacios.js";
import { alCambiar } from "../observar.js";
import { traducir } from "../traducir.js";
import { irAInvestigacion, chipInvHTML } from "../navegar.js";
import { esc, nombreFicha, textoPresion, textoRango } from "../textos.js";

export function montar(contenedor) {
  contenedor.innerHTML = `
  <div class="rejilla rejilla-alcance rejilla-ajustada">
    <div class="columna col-vacios">
      <section class="bloque bloque-vacios" aria-labelledby="titulo-vacios">
        <div class="vacios-cab">
          <h2 id="titulo-vacios" data-i18n="alc.titulo"></h2>
          <p class="ayuda" data-i18n="alc.ayuda"></p>
        </div>
        <p class="vacios-resumen" data-zona="resumen"></p>
        <div class="alcance-vacio" data-zona="vacia">
          <h3 data-i18n="alc.sin_examinar_titulo"></h3>
          <p class="ayuda" data-i18n="alc.sin_examinar_texto"></p>
          <p><a class="boton" href="#experimento" data-i18n="cob.ir_experimento"></a></p>
        </div>
        <div data-zona="vacios"></div>
      </section>
    </div>
    <div class="columna col-completitud">
      <section class="bloque bloque-completitud" aria-labelledby="titulo-completitud">
        <h2 id="titulo-completitud" data-i18n="alc.completitud"></h2>
        <p class="ayuda" data-zona="completitud-ayuda"></p>
        <div class="calidad" data-zona="completitud"></div>
      </section>
    </div>
  </div>`;
  const zona = (id) => contenedor.querySelector(`[data-zona="${id}"]`);

  contenedor.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-inv]");
    if (b) irAInvestigacion(b.dataset.inv, "cobertura");
  });

  alCambiar(["resultados", "fichas", "idioma"], (s, a) => {
    if (!a || s.idioma !== a.idioma) traducir(contenedor);
    const porId = new Map(s.fichas.map((f) => [f.id, f]));
    const chip = (id) => {
      const f = porId.get(id);
      const nombre = f ? nombreFicha(f) : id;
      return chipInvHTML(esc(id), esc(nombre), esc(t("alc.ir_inv", { sigla: nombre })));
    };
    const chips = (ids) => (ids.length ? ids.map(chip).join("") : `<span class="chip chip-vacio">${esc(t("alc.ninguna"))}</span>`);

    const v = s.resultados?.vacios;
    zona("vacia").hidden = !!v;
    zona("resumen").hidden = !v;
    zona("vacios").innerHTML = v ? vaciosHTML(v, s.examinado, porId, chip, chips) : "";
    if (v) {
      const nc = v.combinaciones.length, nd = v.condiciones.length + (v.gravedad ? 1 : 0);
      zona("resumen").textContent = [
        nc === 1 ? t("alc.una_combinacion") : t("alc.n_combinaciones", { n: nc }),
        nd === 1 ? t("alc.una_condicion") : t("alc.n_condiciones", { n: nd }),
      ].join(", ");
    }

    // Completitud: la de resultados si hay examen; si no, calculada directamente de las fichas.
    const comp = v?.completitud ?? calcularCompletitud(s.fichas);
    zona("completitud-ayuda").textContent = t("alc.completitud_ayuda", { n: s.fichas.length });
    zona("completitud").innerHTML = comp.map((c) => {
      const verif = c.campo === "verificadas";
      const pct = c.total ? (c.con / c.total) * 100 : 0;
      const cifra = t("alc.n_de", { con: c.con, total: c.total });
      return `<div class="calidad-fila${verif ? " verif" : ""}">
        <span class="nombre">${esc(t(`alc.campo.${c.campo}`))}</span>
        <div class="calidad-barra" role="img" aria-label="${esc(cifra)}"><span style="width:${pct.toFixed(0)}%"></span></div>
        <span class="cifra">${esc(cifra)}</span>
        ${c.sin.length ? `<details><summary>${esc(t(verif ? "alc.ver_sin_verificar" : "alc.ver_sin", { n: c.sin.length }))}</summary>
          <div class="chips">${c.sin.map(chip).join("")}</div></details>` : ""}
      </div>`;
    }).join("");
  });
}

function vaciosHTML(v, e, porId, chip, chips) {
  if (v.total === 0) return `<p class="ok-cobertura">${esc(t("alc.sin_vacios"))}</p>`;
  const material = t(`material.${e.material}`);
  const presion = (p) => textoPresion(p, "kPa");
  const lado = { material: () => t("alc.lado.material", { material: minuscula(material) }) };
  let h = "";

  if (v.combinaciones.length) {
    h += `<section class="grupo-vacios" aria-labelledby="alc-comb">
      <h3 id="alc-comb">${esc(t("alc.combinaciones"))} <span class="contador">${v.combinaciones.length}</span></h3>
      <div class="tarjetas-vacio">${v.combinaciones.map((c) => {
        const o2 = fmt(c.vars.o2), p = c.vars.p != null ? presion(c.vars.p) : "";
        const ladoB = c.id === "material_oxigeno" ? t("alc.lado.oxigeno", { o2 }) : t("alc.lado.presion", { p });
        return `<article class="vacio-tarjeta">
          <h4>${esc(t(`alc.comb.${c.id}`, { material, o2, p }))}</h4>
          <div class="lados">
            <div><p class="lado-titulo">${esc(lado.material())}</p><div class="chips">${chips(c.a)}</div></div>
            <div><p class="lado-titulo">${esc(ladoB)}</p><div class="chips">${chips(c.b)}</div></div>
          </div>
          <p class="sin-cruce">${esc(t("alc.sin_cruce"))}</p>
        </article>`;
      }).join("")}</div>
    </section>`;
  }

  const condiciones = v.condiciones.map((c) => {
    let titulo, texto, cercana = "";
    if (c.id === "material") {
      titulo = t("alc.cond.material", { material: minuscula(t(`categoria.${c.vars.material}`)) });
      texto = t("alc.cond.material_texto");
    } else {
      const unidad = c.id === "oxigeno" ? "%" : "kPa";
      titulo = c.id === "oxigeno" ? t("alc.cond.oxigeno", { o2: fmt(c.vars.o2) }) : t("alc.cond.presion", { p: presion(c.vars.p) });
      texto = t(c.cercana ? `alc.cond.${c.id}_texto` : `alc.cond.${c.id}_sin`);
      if (c.cercana) {
        const f = porId.get(c.cercana.id);
        const sigla = f ? nombreFicha(f) : c.cercana.id;
        cercana = `<button type="button" class="chip chip-inv" data-inv="${esc(c.cercana.id)}" title="${esc(t("alc.ir_inv", { sigla }))}">${esc(t("alc.mas_cercana", { sigla, rango: textoRango(c.cercana, unidad) }))}</button>`;
      }
    }
    return `<article class="vacio-tarjeta"><h4>${esc(titulo)}</h4><p>${esc(texto)}</p>${cercana ? `<div class="chips">${cercana}</div>` : ""}</article>`;
  });
  if (v.gravedad)
    condiciones.push(`<article class="vacio-tarjeta"><h4>${esc(t(`alc.grav.${v.gravedad.id}`))}</h4><p>${esc(t("alc.grav.texto"))}</p></article>`);
  if (condiciones.length) {
    h += `<section class="grupo-vacios" aria-labelledby="alc-cond">
      <h3 id="alc-cond">${esc(t("alc.condiciones"))} <span class="contador">${condiciones.length}</span></h3>
      <div class="tarjetas-vacio una">${condiciones.join("")}</div>
    </section>`;
  }
  return h;
}
