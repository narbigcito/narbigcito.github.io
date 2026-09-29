# AGENTS.md — narbigcito.github.io

Web personal de Gibrán Moreno. Sitio estático en GitHub Pages, sin build ni dependencias.

## Estructura

- `index.html` — solo el marcado y el `<head>` (metas y etiquetas `og:` para la vista previa al compartir).
- `assets/css/sitio.css` — todo el CSS del sitio.
- `assets/js/` — un archivo por pieza, cargados en orden al final de `index.html`:
  - `i18n.js` (traducciones, `T()`, `applyLang()`; va primero porque los demás lo usan)
  - `interfaz.js` (cursor, nav, logo), `muro.js` (17 golpes), `huevos.js` (leche, Konami)
  - `conversaciones.js`, `modales.js` (proyectos), `feeds.js` (eventos, are.na, Substack)
  - `letras.js`, `marea.js` (fondo WebGL con el shader en `#tideCanvas`)
  - con `defer`: `sonido.js`, `pez.js`, `redes.js`, `vida.js` (jirafa, rana, bote)
- `assets/feeds/*.json` — los actualiza la Raspberry Pi (`scripts/actualizar_feeds.py`).
- `assets/og.jpg` — imagen de vista previa de 1200×630. Si cambia el hero, hay que regenerarla.

Los scripts son clásicos (sin `type="module"`) y comparten el ámbito global a propósito: `muro.js` usa `T()` de `i18n.js`, etc. Si algún día se pasan a módulos, hay que exportar esas funciones.

Secciones: Hero → Quién soy (muro) → Lo que creo → Proyectos → Conversaciones → Conectar → Footer.
Colores: `--c1` (rosa) a `--c6` (verde). Fuentes: VT323, Space Grotesk, Syne/Syne Mono.

## Publicación

GitHub Pages publica la rama `master`. Una rama por cambio y un tag `antes-de-<rama>` en master antes del merge, para poder revertir.

## Convenciones

- UI en español neutro/mexicano (tú, nunca vos).
- Los comportamientos existentes de las criaturas no se cambian; solo se agregan nuevos.
- No tocar sin preguntar el fondo WebGL morado ni el 🥛 del huevo de la leche.
