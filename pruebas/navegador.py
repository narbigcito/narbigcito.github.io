"""Prueba de punta a punta del registro anónimo de narbigcito.com.

Sirve el sitio desde la carpeta del repo, levanta el receptor en un contenedor
nginx:1.26-alpine (la versión de la Pi) con deploy/registro/registro.conf tal cual (solo cambia
el `listen`), recorre la página en Chromium y revisa lo que llegó al log:

- que cada evento que se provoca llegue, y solo una vez cuando no es repetible;
- que ninguna petición lleve Cookie ni Referer, y que el navegador no guarde nada nuevo;
- que nadie pida el script de Umami;
- que con ?registro=0 no salga nada;
- que nginx tire lo que no está en la lista y que el log no tenga IP.

Al final arma la vista con el lector de la pieza y la captura.

    ~/.hermes/hermes-agent/venv/bin/python pruebas/navegador.py SALIDA

Necesita docker, node y la carpeta piezas/ (PIEZAS). El contenedor se llama
narbigcito-registro-prueba y se borra al final.
"""
import http.server
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from functools import partial
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIEZAS = os.environ.get("PIEZAS", os.path.expanduser("~/Documentos/Proyects/piezas"))
PAGINA, RECEPTOR = 8471, 8472
NOMBRE = "narbigcito-registro-prueba"
LOG = "registro/narbigcito-eventos.log"


def sirve_sitio():
    """Servidor estático del repo, en un hilo."""
    class Callado(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PAGINA), partial(Callado, directory=RAIZ))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def levanta_receptor(salida):
    """registro.conf con `listen 80` en un nginx de docker. Devuelve la ruta del log."""
    conf, logs = os.path.join(salida, "conf"), os.path.join(salida, "log")
    os.makedirs(conf, exist_ok=True)
    os.makedirs(os.path.join(logs, "registro"), exist_ok=True)
    os.chmod(logs, 0o777)
    os.chmod(os.path.join(logs, "registro"), 0o777)
    with open(os.path.join(RAIZ, "deploy/registro/registro.conf")) as f:
        texto = f.read()
    texto = texto.replace("listen 127.0.0.1:3001;", "listen 80;")
    with open(os.path.join(conf, "default.conf"), "w") as f:
        f.write(texto)
    subprocess.run(["docker", "container", "rm", "-f", NOMBRE], capture_output=True)
    subprocess.run(["docker", "run", "-d", "--name", NOMBRE, "-p", f"127.0.0.1:{RECEPTOR}:80",
                    "-v", f"{conf}:/etc/nginx/conf.d:ro,Z", "-v", f"{logs}:/var/log/nginx:Z",
                    "docker.io/library/nginx:1.26-alpine"], check=True, capture_output=True)
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{RECEPTOR}/e.txt", timeout=1)
            return os.path.join(logs, LOG)
        except Exception:
            time.sleep(0.2)
    raise SystemExit("nginx no levantó: " + subprocess.run(["docker", "logs", NOMBRE], capture_output=True, text=True).stderr)


def contexto(nav):
    """Un contexto que no sale a internet: lo externo se aborta (las fuentes y Substack)."""
    ctx = nav.new_context(viewport={"width": 1200, "height": 850}, locale="es-MX")
    ctx.route("**/*", lambda ruta: ruta.continue_() if urlparse(ruta.request.url).hostname in ("127.0.0.1", "localhost")
              else ruta.abort())
    return ctx


def recorre(pw, fallas, salida):
    """La visita completa. Devuelve (peticiones al receptor, todas las URLs pedidas)."""
    nav = pw.chromium.launch()
    ctx = contexto(nav)
    pg = ctx.new_page()
    peticiones, todas, errores = [], [], []

    def anota(r):
        todas.append(r.url)
        if urlparse(r.url).port == RECEPTOR:
            peticiones.append((r.url, r.all_headers()))
    pg.on("requestfinished", anota)
    pg.on("requestfailed", lambda r: todas.append(r.url))
    pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.goto(f"http://localhost:{PAGINA}/?receptor=http://127.0.0.1:{RECEPTOR}/")
    pg.wait_for_function("window.__registro !== undefined")
    pg.wait_for_selector("#substackWrap .substack-post", state="attached", timeout=8000)
    antes = pg.evaluate("Object.keys(localStorage).sort()")
    alto = pg.evaluate("document.body.scrollHeight")
    for _ in range(0, alto + 1700, 250):
        pg.mouse.wheel(0, 250)
        pg.wait_for_timeout(60)
    pg.screenshot(path=os.path.join(salida, "pie.png"))
    if "sin cookies" not in pg.inner_text("#footer"):
        fallas.append("el aviso de privacidad no está en el pie")

    def clic(sel):
        """Clic de verdad en el DOM. Las tarjetas flotan con animaciones y nunca quedan
        «estables» para Playwright, así que se despacha el evento sobre el elemento."""
        el = pg.locator(sel).first
        el.evaluate("e => e.scrollIntoView({block: 'center'})")
        el.dispatch_event("click")
        pg.wait_for_timeout(120)
    clic("#substackWrap .substack-post >> nth=1")       # post-2
    clic("#arenaGrid .arena-block")                      # arena bloque
    clic("#arena a.link-item")                           # mas arena
    clic("#cardMagi")
    pg.keyboard.press("Escape")
    pg.evaluate("document.querySelectorAll('.proj-modal').forEach(m => m.classList.remove('open', 'show'))")
    clic("#convGrid .conv-thumb >> nth=0")               # conv-1
    clic("#convMoreBtn")                                 # archivo
    clic("#conectar a[href*=instagram]")                 # red instagram
    clic("#conectar a[href*=calendar]")                  # red agenda
    clic("#milkBtn")                                     # huevo leche
    for k in ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]:
        pg.keyboard.press(k)                             # huevo konami
    pg.locator("#wall").evaluate("e => e.scrollIntoView({block: 'center'})")
    for _ in range(17):
        pg.locator("#wall").dispatch_event("click")      # muro roto
        pg.wait_for_timeout(40)
    pg.evaluate("document.getElementById('wallPopup').classList.remove('show')")
    pg.evaluate("scrollTo(0, 0)")
    clic("#langBtn")                                     # idioma en
    clic("#langBtn")                                     # idioma es
    pg.wait_for_timeout(300)
    despues = pg.evaluate("Object.keys(localStorage).sort()")
    if [k for k in despues if k not in antes and k != "narbig_lang"]:
        fallas.append(f"quedó algo nuevo en localStorage: {despues}")
    galletas = ctx.cookies()
    if galletas:
        fallas.append(f"hay cookies: {galletas}")
    if pg.evaluate("document.cookie"):
        fallas.append("document.cookie no está vacío")
    pg.close(run_before_unload=True)
    time.sleep(0.8)
    nav.close()
    if errores:
        fallas.append(f"errores de JS en la página: {errores}")
    return peticiones, todas


def apagado(pw, fallas):
    """Con ?registro=0 no sale ninguna petición al receptor."""
    nav = pw.chromium.launch()
    pg = contexto(nav).new_page()
    mandadas = []
    pg.on("request", lambda r: mandadas.append(r.url) if urlparse(r.url).port == RECEPTOR else None)
    pg.goto(f"http://localhost:{PAGINA}/?registro=0&receptor=http://127.0.0.1:{RECEPTOR}/")
    pg.wait_for_function("window.__registro !== undefined")
    for _ in range(10):
        pg.mouse.wheel(0, 400)
        pg.wait_for_timeout(50)
    pg.locator("#milkBtn").dispatch_event("click")
    pg.close(run_before_unload=True)
    nav.close()
    if mandadas:
        fallas.append(f"con ?registro=0 salieron {len(mandadas)} peticiones")


def aduana(fallas):
    """Peticiones a mano que nginx no tiene que anotar."""
    malas = ["w=narbigcito&n=entra&d=fr&s=0123456789ab&i=0",          # dato fuera de la lista
             "w=narbigcito&n=nombre&d=gibran&s=0123456789ab&i=0",     # evento fuera de la lista
             "w=otro&n=entra&d=es&s=0123456789ab&i=0",                # sitio ajeno
             "w=narbigcito&n=entra&d=es&s=ZZZ&i=0",                   # visita mal formada
             "w=narbigcito&n=entra&d=es&s=0123456789ab&i=99999"]      # orden de más
    for q in malas:
        with urllib.request.urlopen(f"http://127.0.0.1:{RECEPTOR}/e.txt?{q}", timeout=2) as r:
            if r.status != 204:
                fallas.append(f"{q}: {r.status}")
    req = urllib.request.Request(f"http://127.0.0.1:{RECEPTOR}/e.txt?w=narbigcito&n=entra&d=en&s=fedcba987654&i=0",
                                 headers={"CF-IPCountry": "MX"})
    urllib.request.urlopen(req, timeout=2)
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{RECEPTOR}/script.js", timeout=2)
        fallas.append("/script.js no da 404")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            fallas.append(f"/script.js da {e.code}")


def main():
    salida = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "salida-registro")
    os.makedirs(salida, exist_ok=True)
    fallas = []
    srv = sirve_sitio()
    log = levanta_receptor(salida)
    try:
        with sync_playwright() as pw:
            peticiones, todas = recorre(pw, fallas, salida)
            apagado(pw, fallas)
        aduana(fallas)
        time.sleep(0.5)
        if any("analytics.narbigcito.com" in u for u in todas):
            fallas.append("alguien pidió analytics.narbigcito.com")
        for url, cab in peticiones:
            if "cookie" in cab or "referer" in cab:
                fallas.append(f"cabecera de más en {url}: {sorted(cab)}")
        with open(log) as f:
            lineas = [ln.split() for ln in f]
        pares = [(c[5], c[6] if len(c) > 6 else "") for c in lineas]
        esperados = [("entra", "es"), ("seccion", "conectar"), ("seccion", "quien"), ("lee", "pagina.100"),
                     ("lee", "creo.100"), ("substack", "post-2"), ("arena", "bloque"), ("mas", "arena"),
                     ("proyecto", "magi"), ("conversacion", "conv-1"), ("conversacion", "archivo"),
                     ("red", "instagram"), ("red", "agenda"), ("huevo", "leche"), ("huevo", "konami"),
                     ("muro", "roto"), ("idioma", "en"), ("idioma", "es")]
        for p in esperados:
            if p not in pares:
                fallas.append(f"no llegó {p}")
        vistos = [p for p in pares if p[0] not in ("sale", "idioma")]
        repetidos = {p for p in vistos if vistos.count(p) > 1 and p[0] != "lee"}
        if repetidos:
            fallas.append(f"repetidos: {repetidos}")
        if not any(p[0] == "sale" for p in pares):
            fallas.append("no llegó sale")
        for c in lineas:
            if len(c) != 7 or c[2] != "narbigcito" or "127.0.0.1" in " ".join(c) or "172." in " ".join(c):
                fallas.append(f"línea rara en el log: {c}")
        if not any(c[1] == "MX" for c in lineas):
            fallas.append("el país de CF-IPCountry no se anotó")
        if any(c[6] in ("fr", "gibran") or c[5] == "nombre" for c in lineas if len(c) > 6):
            fallas.append("la aduana dejó pasar algo")
        vista = os.path.join(salida, "vista.html")
        subprocess.run(["python3", os.path.join(PIEZAS, "js/registro-anonimo/lector/visitas.py"), log,
                        "--etiquetas", os.path.join(RAIZ, "deploy/registro/etiquetas.json"), "--html", vista],
                       check=True, capture_output=True, text=True)
        with sync_playwright() as pw:
            nav = pw.chromium.launch()
            pg = nav.new_page(viewport={"width": 1000, "height": 900}, color_scheme="dark")
            pg.goto("file://" + vista)
            pg.screenshot(path=os.path.join(salida, "vista.png"), full_page=True)
            nav.close()
        print(f"{len(lineas)} líneas en el log; {len(set(c[3] for c in lineas))} visitas")
        print("\n".join(" ".join(c) for c in lineas))
    finally:
        srv.shutdown()
        subprocess.run(["docker", "container", "rm", "-f", NOMBRE], capture_output=True)
    if fallas:
        print("FALLAS:\n- " + "\n- ".join(fallas))
        sys.exit(1)
    print("todo en orden")


if __name__ == "__main__":
    main()
