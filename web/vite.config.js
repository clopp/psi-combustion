import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIME = { png: "image/png", webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon" };

// Incrusta como data URI los íconos que index.html referencia desde /src/assets/ (favicon, apple-touch-icon).
// Vite emite los recursos del <head> como archivos aparte; así dist/index.html queda en un solo archivo.
function iconosIncrustados() {
  return {
    name: "iconos-incrustados",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace(/href="\/(src\/assets\/[^"]+\.(png|webp|svg|ico))"/g, (_m, ruta, ext) => {
          const datos = readFileSync(fileURLToPath(new URL(ruta, import.meta.url)));
          return `href="data:${MIME[ext]};base64,${datos.toString("base64")}"`;
        });
      },
    },
  };
}

export default defineConfig({
  base: "./",
  // El logo de la cabecera (webp y png de 96 px) se importa desde src y se incrusta.
  build: { assetsInlineLimit: 100 * 1024 },
  plugins: [iconosIncrustados(), viteSingleFile()],
  test: { environment: "node", include: ["tests/**/*.test.js"] },
});
