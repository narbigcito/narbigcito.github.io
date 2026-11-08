#!/usr/bin/env bash
# Los números de narbigcito.com: lee el log del registro anónimo en la Pi por ssh y arma la
# vista. En la terminal sale el resumen; la vista queda en ~/narbigcito.html (o en $1).
#
#   deploy/registro/numeros.sh                 # y abre file:///home/<tú>/narbigcito.html
#   deploy/registro/numeros.sh ~/otra.html
#
# Por qué en la laptop y no un panel en línea: la vista no se publica. El log vive en la Pi,
# la lectura pasa aquí y no hay ningún servidor más que cuidar.
set -euo pipefail
aqui="$(cd "$(dirname "$0")" && pwd)"
piezas="${PIEZAS:-$HOME/Documentos/Proyects/piezas}"
vista="${1:-$HOME/narbigcito.html}"
python3 "$piezas/js/registro-anonimo/lector/visitas.py" --ssh ssh.narbigcito.com \
  --log /var/log/nginx/registro/narbigcito-eventos.log \
  --etiquetas "$aqui/etiquetas.json" --html "$vista"
echo "vista: file://$vista"
