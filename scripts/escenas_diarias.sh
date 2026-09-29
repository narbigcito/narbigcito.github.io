#!/usr/bin/env bash
# Genera escenas nuevas y las publica. Lo corre el timer escenas-web (una vez al día).
# Trabaja en un worktree aparte de master, para no chocar con lo que Gibrán tenga
# a medias en el repo principal. Solo toca assets/feeds/escenas.json.
set -euo pipefail
REPO="$HOME/Documentos/Proyects/narbigcito.github.io"
WT="$HOME/.local/share/escenas-web"
[ -d "$WT/.git" ] || [ -f "$WT/.git" ] || git -C "$REPO" worktree add -f "$WT" master
cd "$WT"
git fetch -q origin master
git checkout -q master 2>/dev/null || true
git reset -q --hard origin/master
python3 scripts/generar_escenas.py .
git add assets/feeds/escenas.json
if git diff --cached --quiet; then echo "sin cambios"; exit 0; fi
git -c user.name=narbigcito -c user.email=narbigcito@users.noreply.github.com \
  commit -qm "escenas: nuevas pláticas de la jirafa y la rana ($(date +%F))"
git push -q origin HEAD:master
echo "publicado $(git rev-parse --short HEAD)"
