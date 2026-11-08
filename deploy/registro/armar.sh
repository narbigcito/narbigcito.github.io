#!/usr/bin/env bash
# Arma deploy/registro/registro.conf: el server de nginx que recibe el registro anónimo de
# narbigcito.com en la Pi. Los maps, el log_format y la location salen de la pieza
# registro-anonimo (armar-nginx.js) con la lista de eventos del sitio; aquí solo se envuelven
# en su server. Vuelve a correrlo cada vez que cambie assets/js/registro/eventos.js.
#
#   deploy/registro/armar.sh            # escribe registro.conf
#   deploy/registro/armar.sh --revisa   # sale con 1 si registro.conf no está al día
#
# Por qué estos valores:
# - 127.0.0.1:3001 y analytics.narbigcito.com: es la regla que ya existe en el túnel de
#   Cloudflare (la dejó Umami, apagado por gastar 101 % de CPU). No hay que tocar el túnel.
# - Sin limit_req: la location que genera la pieza responde con `return 204`, y return corre
#   antes que limit_req, así que un límite aquí no se aplicaría nunca (pasó en el buzón de
#   semilla). Cada línea del log pesa unos 80 bytes y logrotate la corta a 14 días.
# - Detrás del túnel todas las peticiones llegan de 127.0.0.1: nginx no ve la IP de nadie.
# - Todo lo que no sea /e.txt da 404 y no se anota; error_log a /dev/null.
set -euo pipefail
aqui="$(cd "$(dirname "$0")" && pwd)"
piezas="${PIEZAS:-$HOME/Documentos/Proyects/piezas}"
armar="$piezas/js/registro-anonimo/armar-nginx.js"
destino="$aqui/registro.conf"

http="$(node "$armar" "$aqui/receptor.js" http)"
location="$(node "$armar" "$aqui/receptor.js" location | sed 's/^/    /')"

nuevo="$(cat <<EOF
# narbigcito.com: receptor del registro anónimo (pieza registro-anonimo).
# GENERADO por deploy/registro/armar.sh en narbigcito.github.io; no editar a mano.
# Va en /etc/nginx/sites-available/registro con su symlink en sites-enabled.
# Log: /var/log/nginx/registro/narbigcito-eventos.log (hora país sitio visita orden evento dato;
# sin IP). Su rotación es deploy/registro/logrotate.conf (dos años), no la de nginx (14 días).

$http
server {
    listen 127.0.0.1:3001;
    server_name analytics.narbigcito.com;
    access_log off;
    error_log /dev/null crit;

$location
    location / {
        return 404;
    }
}
EOF
)"

if [[ "${1:-}" == "--revisa" ]]; then
  if [[ -f "$destino" ]] && diff -q <(printf '%s\n' "$nuevo") "$destino" >/dev/null; then
    echo "registro.conf al día"
  else
    echo "registro.conf no corresponde a eventos.js: corre deploy/registro/armar.sh" >&2
    exit 1
  fi
else
  printf '%s\n' "$nuevo" > "$destino"
  echo "escrito $destino ($(grep -c '" 1;$' "$destino") parejas)"
fi
