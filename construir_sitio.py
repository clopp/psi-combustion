"""
Arma la carpeta _site/ que se publica:

    _site/
      index.html        <- landing (desde landing/)
      assets/           <- imágenes de la landing
      dashboard/        <- dashboard (desde web/)

Uso (Windows, macOS o Linux):
    python construir_sitio.py            # solo arma _site/
    python construir_sitio.py --servir   # arma _site/ y lo abre en http://localhost:8000

La landing enlaza al dashboard con la ruta relativa "dashboard/", así que
funciona igual en local, en GitHub Pages o en cualquier hosting estático.
"""
import http.server
import shutil
import socketserver
import sys
import webbrowser
from functools import partial
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
LANDING = RAIZ / "landing"
DASHBOARD = RAIZ / "web"
SALIDA = RAIZ / "_site"
PUERTO = 8000

# Nunca se publican: claves, dependencias ni archivos temporales
IGNORAR = shutil.ignore_patterns(
    ".git", ".env", "*.env", ".env.*", "node_modules", "__pycache__", "*.pyc", ".DS_Store", "Thumbs.db"
)


def carpeta_del_dashboard() -> Path:
    """Si el dashboard tiene paso de compilación (npm run build), usa dist/ o build/."""
    if (DASHBOARD / "package.json").exists():
        for nombre in ("dist", "build"):
            if (DASHBOARD / nombre / "index.html").exists():
                return DASHBOARD / nombre
        sys.exit("web/ tiene package.json pero no hay dist/ ni build/. Ejecuta primero 'npm run build' dentro de web/.")
    return DASHBOARD


def construir() -> None:
    if not (LANDING / "index.html").exists():
        sys.exit("No se encontró landing/index.html")
    origen_dashboard = carpeta_del_dashboard()
    if not (origen_dashboard / "index.html").exists():
        sys.exit(f"No se encontró index.html en {origen_dashboard.relative_to(RAIZ)}/")

    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    shutil.copytree(LANDING, SALIDA, ignore=IGNORAR)
    shutil.copytree(origen_dashboard, SALIDA / "dashboard", ignore=IGNORAR)
    (SALIDA / ".nojekyll").touch()  # evita que GitHub Pages ignore carpetas que empiezan por "_"

    print("Sitio listo en _site/")
    print("  /           -> landing")
    print(f"  /dashboard/ -> {origen_dashboard.relative_to(RAIZ)}/")


def servir() -> None:
    manejador = partial(http.server.SimpleHTTPRequestHandler, directory=str(SALIDA))
    with socketserver.TCPServer(("", PUERTO), manejador) as servidor:
        url = f"http://localhost:{PUERTO}/"
        print(f"Abriendo {url}  (Ctrl + C para detener)")
        webbrowser.open(url)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")


if __name__ == "__main__":
    construir()
    if "--servir" in sys.argv:
        servir()
