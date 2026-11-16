// Llama a fn cuando cambian las claves indicadas del estado (y una vez al inicio con anterior = null).
import { estado } from "../estado.js";

export function alCambiar(claves, fn) {
  fn(estado.obtener(), null);
  estado.suscribir((s, a) => {
    if (claves.some((k) => s[k] !== a[k])) fn(s, a);
  });
}

// Igual que alCambiar, pero agrupa los cambios de un mismo cuadro con requestAnimationFrame
// (p. ej. al arrastrar un deslizador): fn recibe el estado final y el anterior al primer cambio.
export function alCambiarEnCuadro(claves, fn) {
  const raf = globalThis.requestAnimationFrame;
  if (!raf) return alCambiar(claves, fn);
  let previo = null, pendiente = false;
  fn(estado.obtener(), null);
  estado.suscribir((s, a) => {
    if (!claves.some((k) => s[k] !== a[k])) return;
    if (!pendiente) previo = a;
    if (pendiente) return;
    pendiente = true;
    raf(() => {
      pendiente = false;
      fn(estado.obtener(), previo);
    });
  });
}
