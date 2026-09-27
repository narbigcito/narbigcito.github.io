#!/usr/bin/env python3
"""
actualizar_feeds.py — baja lo último de Substack y de Are.na y lo guarda
como JSON estático dentro del sitio.

Por qué existe: Substack no manda cabeceras CORS, así que el navegador no
puede leer el feed directo desde narbigcito.github.io. La solución es
traerlo del lado del servidor (este script, en un cron de la Pi) y
publicarlo junto al sitio. Are.na sí permite CORS, pero guardamos una copia
para que la sección nunca desaparezca si su API falla o limita.

Uso:  python3 scripts/actualizar_feeds.py <raíz-del-sitio>
Solo usa la biblioteca estándar.
"""
import json, sys, urllib.request, pathlib, re, html

UA = {"User-Agent": "narbigcito.github.io feeds (+https://narbigcito.github.io)"}

def bajar(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def limpiar(t, n=180):
    t = html.unescape(re.sub(r"<[^>]+>", " ", t or ""))
    t = re.sub(r"\s+", " ", t).strip()
    return (t[: n - 1] + "…") if len(t) > n else t

def substack():
    posts = bajar("https://narbigcito.substack.com/api/v1/archive?sort=new&limit=12")
    out = []
    for p in posts:
        if p.get("audience") not in (None, "everyone", "only_free"):
            continue
        out.append({
            "title": p.get("title") or "",
            "subtitle": limpiar(p.get("subtitle") or p.get("description") or "", 160),
            "date": p.get("post_date") or "",
            "url": p.get("canonical_url") or "",
            "image": p.get("cover_image") or "",
            "likes": p.get("reaction_count") or 0,
            "words": p.get("wordcount") or 0,
        })
    return out[:6]

def arena():
    j = bajar("https://api.are.na/v3/users/el-narbigcito/contents?per=24")
    return j.get("data") or []

def escribir(ruta, datos):
    nuevo = json.dumps(datos, ensure_ascii=False, indent=1, sort_keys=True)
    if ruta.exists() and ruta.read_text(encoding="utf-8") == nuevo:
        return False
    ruta.write_text(nuevo, encoding="utf-8")
    return True

def main():
    raiz = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    d = raiz / "assets" / "feeds"
    d.mkdir(parents=True, exist_ok=True)
    cambios = []
    for nombre, f in (("substack", substack), ("arena", arena)):
        try:
            datos = f()
            if datos and escribir(d / (nombre + ".json"), datos):
                cambios.append(nombre)
        except Exception as e:  # una fuente caída no debe tumbar la otra
            print("fallo", nombre, e, file=sys.stderr)
    print("cambios:", ",".join(cambios) or "ninguno")

if __name__ == "__main__":
    main()
