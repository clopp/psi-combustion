// Copia las fichas de mayor prioridad de public/datos/ a src/datos/fichas_respaldo.json.
// Uso: npm run respaldo
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRIORIDAD = ["fichas_curadas.json", "fichas_caracterizadas_ia.json", "fichas_caracterizadas_reglas.json"];

for (const archivo of PRIORIDAD) {
  const ruta = join(raiz, "public", "datos", archivo);
  if (!existsSync(ruta)) continue;
  const datos = JSON.parse(readFileSync(ruta, "utf8"));
  const lista = (Array.isArray(datos) ? datos : datos?.fichas || []).filter((f) => f && f.id_psi);
  if (!lista.length) continue;
  const salida = join(raiz, "src", "datos", "fichas_respaldo.json");
  writeFileSync(salida, JSON.stringify({ origen: archivo, fichas: lista }) + "\n");
  console.log(`Respaldo: ${lista.length} fichas de ${archivo} -> src/datos/fichas_respaldo.json`);
  process.exit(0);
}
console.error("No hay fichas válidas en public/datos/.");
process.exit(1);
