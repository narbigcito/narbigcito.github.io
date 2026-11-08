# Registro anónimo de narbigcito.com

Con esto Gibrán puede ver qué hace la gente al entrar: hasta qué sección llega, hasta dónde lee, qué texto de Substack abre, qué proyecto o conversación le interesa y por dónde se va. No sabe quién es nadie. Usa la pieza `piezas/js/registro-anonimo` (ficha en `Cerebro/Ritsuko/Catálogo/registro-anonimo.md`).

## Partes

| Dónde | Archivo | Qué hace |
|---|---|---|
| Sitio | `assets/js/registro/registro-anonimo.js` | Copia idéntica de la pieza. GitHub Pages no sigue symlinks que salen del repo, así que se copia y `pruebas/registro.test.js` compara su sha256 con `piezas/` |
| Sitio | `assets/js/registro/eventos.js` | La lista cerrada de eventos, y nada fuera de ella |
| Sitio | `assets/js/registro/clasifica.js` | Decide qué evento es cada clic, con un solo listener en `document` |
| Sitio | `assets/js/registro/sitio.js` | Conecta todo. Es un módulo que carga al final y no cambia ningún script clásico |
| Sitio | `muro.js`, `huevos.js` | Una línea en cada uno: `window.__registro?.evento(…)` |
| Pi | `deploy/registro/registro.conf` | El nginx del receptor. Lo **genera** `armar.sh` con la misma lista y no se edita a mano |
| Pi | `deploy/registro/logrotate.conf` | Guarda dos años de log, porque el de nginx lo borra a los 14 días |
| Laptop | `deploy/registro/numeros.sh` + `etiquetas.json` | Lee el log por ssh y escribe `~/narbigcito.html` |

## Qué se anota

`entra` (idioma), `seccion` (de las ocho), `lee` (`pagina.25…100`, `creo.25…100`), `substack` (`post-1…post-5` por posición, porque el feed cambia), `arena`, `mas`, `proyecto`, `conversacion`, `red` (Conectar), `eventos`, `muro`, `huevo`, `idioma` y `sale` (cuánto se quedó, en tramos).

Lo que **no** se anota: la IP, el navegador, cookies, el Referer, texto escrito por la persona ni títulos. Cada visita es un número al azar que se pierde al cerrar la pestaña. El país lo pone Cloudflare. El pie del sitio lo avisa en una línea.

`?registro=0` en la URL lo apaga.

## Si cambias la lista

1. Edita `assets/js/registro/eventos.js` (y `clasifica.js` si es un clic nuevo).
2. `deploy/registro/armar.sh`, que reescribe `registro.conf`. `armar.sh --revisa` falla si no está al día, y la prueba unitaria lo llama.
3. Corre las pruebas, que tienen que salir en verde:
   ```sh
   node --test pruebas/registro.test.js
   ~/.hermes/hermes-agent/venv/bin/python pruebas/navegador.py $TMPDIR/registro
   ```
4. **Antes del merge**, Furbex publica el `registro.conf` nuevo en la Pi. Si el sitio sale primero, la Pi tira los eventos nuevos sin avisar.

## Leer los números

```sh
deploy/registro/numeros.sh      # resumen en la terminal y la vista en file://$HOME/narbigcito.html
```
