// Piezas de marcado para los esqueletos de E1 (solo claves i18n, sin texto fijo).
export const nota = (etapa) => `<p class="esqueleto-nota" data-i18n="esqueleto.${etapa}"></p>`;
export const cajas = (n, clase = "") =>
  `<div class="esqueleto-lista" aria-hidden="true">${`<div class="esqueleto-caja ${clase}"></div>`.repeat(n)}</div>`;
export const bloque = (claveTitulo, contenido, etapa, nivel = "h2") =>
  `<section class="bloque"><${nivel} data-i18n="${claveTitulo}"></${nivel}>${contenido}${etapa ? nota(etapa) : ""}</section>`;
export const bloqueInterno = (claveTitulo, contenido) =>
  `<div class="bloque-interno"><h3 data-i18n="${claveTitulo}"></h3>${contenido}</div>`;
