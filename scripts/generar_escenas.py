#!/usr/bin/env python3
"""
generar_escenas.py — escribe escenas nuevas para la jirafa y la rana a partir
de los ensayos de Substack, y las guarda en assets/feeds/escenas.json.

Cómo encaja:
  1. Lee el RSS de Substack, que trae el texto completo de cada ensayo.
  2. Elige un ensayo (rota: el que lleva más tiempo sin usarse, empezando por
     los más nuevos) y se lo manda a ia-proxy (tarea web/escenas).
  3. Valida lo que regresa (forma, largo, voseo, frases de IA) y descarta lo
     que no pase. La web nunca recibe algo que no pasó por aquí.
  4. Guarda el lote junto con los de días anteriores (máximo 3 ensayos), para
     que la página tenga variedad aunque un día falle la generación.

Se corre una vez al día (cron de Hermes o systemd timer). Si algo falla, deja
escenas.json como estaba y sale con código distinto de 0.

Uso:  python3 scripts/generar_escenas.py [raíz-del-sitio] [--ensayo URL] [--seco]
Solo biblioteca estándar.
"""
import argparse, datetime as dt, html, json, pathlib, re, sys, urllib.request

FEED = "https://narbigcito.substack.com/feed"
PROXY = "http://127.0.0.1:8787/v1/tarea/escenas"
TOKEN = pathlib.Path.home() / ".config" / "ia-proxy" / "tokens" / "web"
UA = {"User-Agent": "narbigcito.github.io escenas (+https://narbigcito.github.io)"}
MAX_TEXTO = 12000       # caracteres del ensayo que se mandan (el resto se recorta)
LOTES = 3               # cuántos ensayos distintos conserva escenas.json
POR_ENSAYO = 3

# Palabras que delatan a un modelo o que no son de aquí. Si aparecen, la línea se tira.
PROHIBIDO = re.compile(
    r"\b(vos|tenés|sabés|querés|podés|contá|mirá|acá|fascinante|profund[oa]|sin duda|en definitiva|"
    r"es importante|reflexi[oó]n|nos recuerda|invita a|crucial|fundamental)\b|—|–",
    re.IGNORECASE,
)
EMOJI = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF]")


def bajar(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def texto_plano(h):
    """HTML del ensayo → texto con párrafos.

    >>> texto_plano("<p>hola <b>mundo</b></p><p>dos&nbsp;tres</p>")
    'hola mundo\\n\\ndos tres'
    """
    h = re.sub(r"(?is)<(script|style|figure|figcaption)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)</p>|<br\s*/?>|</h\d>|</li>", "\n\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", "", h)).replace("\xa0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n\s*\n+", "\n\n", t).strip()


def ensayos(rss):
    """Del RSS saca título, url, fecha y texto de cada ensayo con cuerpo real."""
    out = []
    for item in re.findall(r"(?s)<item>(.*?)</item>", rss):
        g = lambda tag: (re.search(r"(?s)<%s>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</%s>" % (tag, tag), item) or [None, ""])[1].strip()
        cuerpo = texto_plano(g("content:encoded"))
        if len(cuerpo) < 400:          # notas cortas o solo imagen: no alcanza para platicar
            continue
        out.append({"titulo": html.unescape(g("title")), "url": g("link"), "fecha": g("pubDate"),
                    "subtitulo": html.unescape(g("description")), "texto": cuerpo})
    return out


def elegir(lista, previo, forzar=None):
    """El ensayo que lleva más tiempo sin usarse; los nunca usados primero, de nuevo a viejo."""
    if forzar:
        for e in lista:
            if e["url"].rstrip("/") == forzar.rstrip("/"):
                return e
        raise SystemExit(f"no encontré {forzar} en el feed")
    usados = {l["ensayo"]["url"]: l["generado"] for l in previo.get("lotes", [])}
    for e in lista:
        if e["url"] not in usados:
            return e
    return min(lista, key=lambda e: usados.get(e["url"], ""))


def limpiar_linea(s):
    s = re.sub(r"\s+", " ", s).strip()
    return s[:1].lower() + s[1:] if s[:1].isupper() and not s[:2].isupper() else s


def validar(escenas):
    """Se queda con las escenas que cumplen todo. Regresa (buenas, motivos_de_rechazo).

    >>> ok, malos = validar([{"idea": "x", "lugar": "mesa", "pasos": [
    ...   {"quien": "jirafa", "dice": "¿y si no?"}, {"quien": "rana", "dice": "croac"},
    ...   {"quien": "jirafa", "dice": "bueno"}, {"quien": "rana", "dice": "vos sabés"}]}])
    >>> len(ok), malos
    (0, ['escena 1: línea prohibida «vos sabés»'])
    """
    buenas, malos = [], []
    for i, e in enumerate(escenas, 1):
        pasos = e.get("pasos") or []
        if e.get("lugar") not in ("mesa", "fogata", "suelo"):
            malos.append(f"escena {i}: lugar {e.get('lugar')!r}"); continue
        if not 4 <= len(pasos) <= 7:
            malos.append(f"escena {i}: {len(pasos)} pasos"); continue
        if len({p.get("quien") for p in pasos}) < 2:
            malos.append(f"escena {i}: habla una sola"); continue
        motivo = None
        for p in pasos:
            p["dice"] = limpiar_linea(p.get("dice", ""))
            if p.get("quien") not in ("jirafa", "rana") or not p["dice"]:
                motivo = "paso inválido"
            elif len(p["dice"]) > 64:
                motivo = f"línea larga «{p['dice']}»"
            elif PROHIBIDO.search(p["dice"]) or EMOJI.search(p["dice"]):
                motivo = f"línea prohibida «{p['dice']}»"
            if p.get("gesto") == "ninguno":
                p.pop("gesto")
            if motivo:
                break
        if motivo:
            malos.append(f"escena {i}: {motivo}"); continue
        buenas.append({"idea": e.get("idea", ""), "lugar": e["lugar"], "pasos": pasos})
    return buenas, malos


def pedir(ensayo):
    token = TOKEN.read_text().strip()
    datos = {"cuantas": POR_ENSAYO, "titulo": ensayo["titulo"], "subtitulo": ensayo["subtitulo"],
             "texto": ensayo["texto"][:MAX_TEXTO]}
    req = urllib.request.Request(PROXY, data=json.dumps({"datos": datos}, ensure_ascii=False).encode(),
                                 headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=420) as r:
        return json.load(r)["salida"]["escenas"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raiz", nargs="?", default=".")
    ap.add_argument("--ensayo", help="URL de un ensayo específico")
    ap.add_argument("--seco", action="store_true", help="no escribe el archivo")
    a = ap.parse_args()

    ruta = pathlib.Path(a.raiz) / "assets" / "feeds" / "escenas.json"
    previo = json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else {"lotes": []}
    lista = ensayos(bajar(FEED))
    if not lista:
        sys.exit("el feed no trajo ensayos con texto")
    ensayo = elegir(lista, previo, a.ensayo)
    print(f"ensayo: {ensayo['titulo']} ({len(ensayo['texto'])} caracteres)")

    buenas, malos = validar(pedir(ensayo))
    for m in malos:
        print("  descartada:", m)
    if not buenas:
        sys.exit("ninguna escena pasó la validación; escenas.json no cambia")

    lote = {"ensayo": {"titulo": ensayo["titulo"], "url": ensayo["url"]},
            "generado": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "escenas": buenas}
    lotes = [l for l in previo.get("lotes", []) if l["ensayo"]["url"] != ensayo["url"]]
    nuevo = {"version": 1, "lotes": ([lote] + lotes)[:LOTES]}
    for e in buenas:
        print(f"  [{e['lugar']}] " + " / ".join(f"{p['quien'][0].upper()}: {p['dice']}" for p in e["pasos"]))
    if a.seco:
        return
    ruta.write_text(json.dumps(nuevo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"guardadas {len(buenas)} escenas en {ruta}")


if __name__ == "__main__":
    main()
