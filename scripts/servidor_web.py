"""
Sirve el evaluador de escenarios en http://localhost:8080

- La página sale de la carpeta web/.
- Las rutas datos/... se leen de datos/salida/, así la página usa siempre las
  últimas fichas generadas (curadas > IA > reglas), sin reconstruir nada.
"""
import functools
import http.server
import os

DATOS = os.environ.get("DATOS_DIR", "datos")
SALIDA = os.path.abspath(os.path.join(DATOS, "salida"))
WEB = os.path.abspath(os.environ.get("WEB_DIR", os.path.join(os.path.dirname(__file__), "..", "web")))
PUERTO = int(os.environ.get("PUERTO", "8080"))


class Manejador(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        ruta = path.split("?", 1)[0].split("#", 1)[0]
        if ruta.startswith("/datos/"):
            nombre = os.path.basename(ruta)            # evita salir de la carpeta
            return os.path.join(SALIDA, nombre)
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    manejador = functools.partial(Manejador, directory=WEB)
    print(f"Evaluador disponible en http://localhost:{PUERTO}  (Ctrl+C para detener)")
    print(f"Fichas leídas de {SALIDA}")
    http.server.ThreadingHTTPServer(("0.0.0.0", PUERTO), manejador).serve_forever()
