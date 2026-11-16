"""
Arma la carpeta _site/ que se publica:

    _site/
      index.html        <- landing (desde landing/)
      assets/           <- imágenes de la landing
      dashboard/        <- dashboard (desde web/)
      diapositivas/     <- presentación (archivos .html de la raíz del proyecto)

Uso (Windows, macOS o Linux):
    python construir_sitio.py            # solo arma _site/
    python construir_sitio.py --servir   # arma _site/ y lo abre en http://localhost:8000

La landing enlaza al dashboard con la ruta relativa "dashboard/", así que
funciona igual en local, en GitHub Pages o en cualquier hosting estático.
"""
import http.server
import re
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
DIAPOSITIVAS = SALIDA / "diapositivas"
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
    hay_dashboard = (origen_dashboard / "index.html").exists()

    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    shutil.copytree(LANDING, SALIDA, ignore=IGNORAR)
    if hay_dashboard:
        shutil.copytree(origen_dashboard, SALIDA / "dashboard", ignore=IGNORAR)
    copiar_diapositivas()
    (SALIDA / ".nojekyll").touch()  # evita que GitHub Pages ignore carpetas que empiezan por "_"

    print("Sitio listo en _site/")
    print("  /           -> landing")
    if hay_dashboard:
        print(f"  /dashboard/ -> {origen_dashboard.relative_to(RAIZ)}/")
    else:
        # Se publica igual la landing y las diapositivas; el botón del dashboard dará 404 hasta resolverlo
        print(f"  AVISO: no hay index.html en {origen_dashboard.relative_to(RAIZ)}/; el dashboard NO se publicó.")
        encontrados = [p.relative_to(RAIZ) for p in DASHBOARD.rglob("index.html") if "node_modules" not in p.parts]
        if encontrados:
            print("         index.html encontrados dentro de web/: " + ", ".join(map(str, encontrados[:5])))


def copiar_diapositivas() -> None:
    """Copia los .html de la raíz del proyecto a _site/diapositivas/.
    Si hay uno solo, también queda como index.html para abrirlo en /diapositivas/."""
    archivos = sorted(RAIZ.glob("*.html"))
    if not archivos:
        return
    DIAPOSITIVAS.mkdir(parents=True, exist_ok=True)
    for archivo in archivos:
        shutil.copy2(archivo, DIAPOSITIVAS / archivo.name)
        avisar_recursos_locales(archivo)
    if len(archivos) == 1 and archivos[0].name != "index.html":
        shutil.copy2(archivos[0], DIAPOSITIVAS / "index.html")
    print("  /diapositivas/ -> " + ", ".join(a.name for a in archivos))


def avisar_recursos_locales(archivo: Path) -> None:
    """Avisa si la presentación usa imágenes o archivos locales que no se copian."""
    texto = archivo.read_text(encoding="utf-8", errors="ignore")
    rutas = re.findall(r'(?:src|href)\s*=\s*["\']([^"\'#]+)["\']', texto)
    locales = sorted({r for r in rutas if not r.startswith(("http:", "https:", "data:", "mailto:", "//"))})
    if locales:
        print(f"  Aviso: {archivo.name} usa archivos locales que no se copian: " + ", ".join(locales[:8]))
        print("         Incrústalos en el HTML o dime cuáles son para copiarlos también.")


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
