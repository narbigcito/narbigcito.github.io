/*
  criaturas.js — una jirafa y una rana que viven en la página.

  Reglas que siguen (ver skill living-ui-widgets):
  - Nunca se quedan quietas: respiran siempre, aunque nadie las toque.
  - Parpadean cada una a su ritmo, no sincronizadas.
  - La mirada sigue al cursor con suavidad, sin saltos.
  - Reaccionan a lo que haces de verdad (click, cursor cerca), no a un timer decorativo.
  - Con prefers-reduced-motion se quedan quietas pero siguen ahí.
*/
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INK = "#141414";

  var css = [
    ".criatura{position:fixed;z-index:60;bottom:0;pointer-events:none;user-select:none}",
    ".criatura svg{display:block;overflow:visible}",
    ".criatura .hit{pointer-events:auto;cursor:pointer}",
    "#jirafa{right:18px;width:150px;transform:translateY(62%);transition:transform .7s cubic-bezier(.34,1.56,.64,1)}",
    "#jirafa.asoma{transform:translateY(8%)}",
    "#rana{left:18px;width:96px;bottom:10px}",
    ".burbuja{position:absolute;bottom:100%;white-space:nowrap;background:#FFFDF5;color:" + INK + ";",
    "border:3px solid " + INK + ";box-shadow:4px 4px 0 " + INK + ";font:700 13px 'Space Grotesk',sans-serif;",
    "padding:6px 10px;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s;pointer-events:none}",
    ".burbuja.on{opacity:1;transform:translateY(0)}",
    "#jirafa .burbuja{right:60%;margin-bottom:-40px}",
    "#rana .burbuja{left:30%;margin-bottom:6px}",
    "@media (max-width:640px){#jirafa{width:104px;right:6px}#rana{width:70px;left:6px}}",
    "@media print{.criatura{display:none}}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- SVGs ---------- */

  var jirafaSVG =
    '<svg viewBox="0 0 150 260" aria-hidden="true">' +
    '<g id="j-cuello-g">' +
    // cuello
    '<path d="M58 260 L62 110 Q66 96 80 96 Q94 96 96 110 L100 260 Z" fill="#FFB84D" stroke="' + INK + '" stroke-width="3.5"/>' +
    // manchas del cuello
    '<path d="M68 150 q8-6 14 2 q-4 10-14 6 z M78 190 q9-4 13 4 q-6 9-14 3 z M66 225 q7-5 12 3 q-5 8-12 3 z M84 125 q6-3 8 4 q-5 5-9 1 z" fill="#C8651B"/>' +
    // cabeza
    '<g id="j-cabeza">' +
    '<ellipse cx="80" cy="84" rx="34" ry="28" fill="#FFB84D" stroke="' + INK + '" stroke-width="3.5"/>' +
    // hocico
    '<ellipse cx="80" cy="100" rx="24" ry="14" fill="#FFD9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="72" cy="99" r="2.2" fill="' + INK + '"/><circle cx="88" cy="99" r="2.2" fill="' + INK + '"/>' +
    '<path id="j-boca" d="M73 107 Q80 112 87 107" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    // cuernitos
    '<line x1="68" y1="58" x2="64" y2="40" stroke="' + INK + '" stroke-width="3.5"/><circle cx="64" cy="38" r="6" fill="#C8651B" stroke="' + INK + '" stroke-width="3"/>' +
    '<line x1="92" y1="58" x2="96" y2="40" stroke="' + INK + '" stroke-width="3.5"/><circle cx="96" cy="38" r="6" fill="#C8651B" stroke="' + INK + '" stroke-width="3"/>' +
    // orejas
    '<g id="j-oreja-i"><path d="M50 72 Q30 62 34 76 Q42 84 52 80 Z" fill="#FFB84D" stroke="' + INK + '" stroke-width="3"/></g>' +
    '<g id="j-oreja-d"><path d="M110 72 Q130 62 126 76 Q118 84 108 80 Z" fill="#FFB84D" stroke="' + INK + '" stroke-width="3"/></g>' +
    // ojos
    '<g id="j-ojos">' +
    '<ellipse cx="68" cy="78" rx="8" ry="9" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="92" cy="78" rx="8" ry="9" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle class="pupila" cx="68" cy="79" r="4" fill="' + INK + '"/>' +
    '<circle class="pupila" cx="92" cy="79" r="4" fill="' + INK + '"/>' +
    '<rect class="parpado" x="58" y="68" width="44" height="0" fill="#FFB84D"/>' +
    '</g>' +
    // cachetes
    '<ellipse cx="56" cy="92" rx="5" ry="3" fill="#FF6B6B" opacity=".55"/><ellipse cx="104" cy="92" rx="5" ry="3" fill="#FF6B6B" opacity=".55"/>' +
    '</g>' +
    '</g>' +
    '<rect class="hit" x="40" y="30" width="80" height="230" fill="transparent"/>' +
    '</svg>';

  var ranaSVG =
    '<svg viewBox="0 0 120 100" aria-hidden="true">' +
    '<g id="r-cuerpo">' +
    // patas traseras
    '<ellipse cx="22" cy="84" rx="18" ry="10" fill="#5DBB63" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="98" cy="84" rx="18" ry="10" fill="#5DBB63" stroke="' + INK + '" stroke-width="3"/>' +
    // cuerpo
    '<path d="M18 80 Q14 38 60 36 Q106 38 102 80 Q60 96 18 80 Z" fill="#88D498" stroke="' + INK + '" stroke-width="3.5"/>' +
    // garganta que respira
    '<ellipse id="r-garganta" cx="60" cy="74" rx="20" ry="10" fill="#E8F7C8" stroke="' + INK + '" stroke-width="2.5"/>' +
    // lengua (oculta)
    '<line id="r-lengua" x1="60" y1="62" x2="60" y2="62" stroke="#FF6B6B" stroke-width="5" stroke-linecap="round"/>' +
    // boca
    '<path d="M40 60 Q60 70 80 60" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    // ojos saltones
    '<circle cx="38" cy="34" r="15" fill="#88D498" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="82" cy="34" r="15" fill="#88D498" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="38" cy="33" r="9" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="82" cy="33" r="9" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle class="pupila" cx="38" cy="34" r="4.5" fill="' + INK + '"/>' +
    '<circle class="pupila" cx="82" cy="34" r="4.5" fill="' + INK + '"/>' +
    '<rect class="parpado" x="26" y="22" width="68" height="0" fill="#88D498"/>' +
    // cachetes
    '<ellipse cx="28" cy="58" rx="5" ry="3" fill="#FF6B6B" opacity=".5"/><ellipse cx="92" cy="58" rx="5" ry="3" fill="#FF6B6B" opacity=".5"/>' +
    // patitas delanteras
    '<path d="M38 88 q-6 6 -12 6 M38 88 q-2 7 -6 9 M82 88 q6 6 12 6 M82 88 q2 7 6 9" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '</g>' +
    '<rect class="hit" x="10" y="16" width="100" height="84" fill="transparent"/>' +
    '</svg>';

  function crear(id, svg) {
    var el = document.createElement("div");
    el.className = "criatura";
    el.id = id;
    el.innerHTML = '<div class="burbuja"></div>' + svg;
    document.body.appendChild(el);
    return el;
  }

  var jirafa = crear("jirafa", jirafaSVG);
  var rana = crear("rana", ranaSVG);

  /* ---------- estado ---------- */

  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, t: 0 };
  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now();
  }, { passive: true });

  function hablar(el, texto, ms) {
    var b = el.querySelector(".burbuja");
    b.textContent = texto;
    b.classList.add("on");
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.classList.remove("on"); }, ms || 1800);
  }

  // Cada criatura con su temperamento: no son clones.
  var J = { el: jirafa, gaze: { x: 0, y: 0 }, blink: 0, nextBlink: 1800, mood: 0, sway: 0,
            pup: jirafa.querySelectorAll(".pupila"), lid: jirafa.querySelector(".parpado"),
            head: jirafa.querySelector("#j-cabeza"), neck: jirafa.querySelector("#j-cuello-g"),
            orejaI: jirafa.querySelector("#j-oreja-i"), orejaD: jirafa.querySelector("#j-oreja-d"),
            boca: jirafa.querySelector("#j-boca"), base: [[68, 79], [92, 79]], lidY: 68, lidH: 20, reach: 3.2 };
  var R = { el: rana, gaze: { x: 0, y: 0 }, blink: 0, nextBlink: 2600, mood: 0, jump: 0, tongue: 0,
            pup: rana.querySelectorAll(".pupila"), lid: rana.querySelector(".parpado"),
            body: rana.querySelector("#r-cuerpo"), throat: rana.querySelector("#r-garganta"),
            lengua: rana.querySelector("#r-lengua"), base: [[38, 34], [82, 34]], lidY: 22, lidH: 24, reach: 3.6,
            lastSnap: 0 };

  function mirar(c, dt) {
    var r = c.el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height * 0.3;
    var dx = mouse.x - cx, dy = mouse.y - cy;
    var d = Math.hypot(dx, dy) || 1;
    var tx = (dx / d) * c.reach, ty = (dy / d) * c.reach;
    // si el cursor lleva rato quieto, la mirada divaga sola
    if (performance.now() - mouse.t > 4000) {
      tx = Math.sin(performance.now() / 1300 + c.reach) * c.reach;
      ty = Math.cos(performance.now() / 1700) * c.reach * 0.5;
    }
    c.gaze.x += (tx - c.gaze.x) * 0.12;
    c.gaze.y += (ty - c.gaze.y) * 0.12;
    for (var i = 0; i < c.pup.length; i++) {
      c.pup[i].setAttribute("cx", c.base[i][0] + c.gaze.x);
      c.pup[i].setAttribute("cy", c.base[i][1] + c.gaze.y);
    }
    return d;
  }

  function parpadear(c, dt) {
    c.nextBlink -= dt;
    if (c.nextBlink <= 0) { c.blink = 1; c.nextBlink = 1600 + Math.random() * 3800; if (Math.random() < 0.2) c.nextBlink = 180; }
    if (c.blink > 0) {
      c.blink -= dt / 160;
      var k = Math.max(0, Math.sin(Math.max(0, c.blink) * Math.PI));
      c.lid.setAttribute("height", c.lidH * k);
    } else c.lid.setAttribute("height", 0);
  }

  /* ---------- jirafa: se asoma cuando bajas ---------- */

  var asomada = false;
  function revisarScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var debe = y > 300;
    if (debe !== asomada) {
      asomada = debe;
      jirafa.classList.toggle("asoma", debe);
      if (debe) setTimeout(function () { hablar(jirafa, "¿qué lees?", 1600); }, 700);
    }
  }
  window.addEventListener("scroll", revisarScroll, { passive: true });

  var frasesJ = ["desde aquí se ve todo", "¡hola!", "tengo el cuello cansado", "me gustan tus proyectos", "shhh, estoy leyendo"];
  jirafa.querySelector(".hit").addEventListener("click", function () {
    J.mood = 1;
    hablar(jirafa, frasesJ[Math.floor(Math.random() * frasesJ.length)]);
    if (!asomada) { jirafa.classList.add("asoma"); asomada = true; }
  });

  /* ---------- rana: respira, caza el cursor, salta ---------- */

  var frasesR = ["croac", "¿me viste?", "la sombra de la rana soy yo", "brinco y ya", "croac croac"];
  rana.querySelector(".hit").addEventListener("click", function () {
    R.jump = 1;
    R.mood = 1;
    hablar(rana, frasesR[Math.floor(Math.random() * frasesR.length)], 1400);
  });

  /* ---------- loop único, siempre vivo ---------- */

  var prev = performance.now();
  function tick(now) {
    var dt = Math.min(64, now - prev); prev = now;
    var t = now / 1000;

    // JIRAFA
    mirar(J, dt); parpadear(J, dt);
    J.mood *= 0.97;
    var sway = Math.sin(t * 0.9) * 2.5 + J.mood * Math.sin(t * 12) * 4;
    J.neck.setAttribute("transform", "rotate(" + sway.toFixed(2) + " 80 260)");
    var headTilt = Math.sin(t * 0.6 + 1) * 3 + J.gaze.x * 1.2;
    J.head.setAttribute("transform", "rotate(" + headTilt.toFixed(2) + " 80 84) translate(0 " + (Math.sin(t * 1.6) * 1.2).toFixed(2) + ")");
    var orejita = Math.sin(t * 2.2) * 4 + (Math.random() < 0.004 ? 18 : 0);
    J.orejaI.setAttribute("transform", "rotate(" + (-orejita) + " 52 76)");
    J.orejaD.setAttribute("transform", "rotate(" + (orejita * 0.8) + " 108 76)");
    J.boca.setAttribute("d", J.mood > 0.2 ? "M71 106 Q80 116 89 106" : "M73 107 Q80 112 87 107");

    // RANA
    var dist = mirar(R, dt); parpadear(R, dt);
    R.mood *= 0.96;
    var breath = 1 + Math.sin(t * 2.4) * 0.12;
    R.throat.setAttribute("transform", "translate(60 74) scale(" + breath.toFixed(3) + " " + (breath * 1.1).toFixed(3) + ") translate(-60 -74)");
    // lengua: si el cursor se acerca, intenta atraparlo (con calma entre intentos)
    if (dist < 150 && now - R.lastSnap > 2500 && R.tongue <= 0) { R.tongue = 1; R.lastSnap = now; }
    if (R.tongue > 0) {
      R.tongue -= dt / 380;
      var ext = Math.sin(Math.max(0, R.tongue) * Math.PI) * 38;
      var ang = Math.atan2(R.gaze.y, R.gaze.x);
      R.lengua.setAttribute("x2", (60 + Math.cos(ang) * ext).toFixed(1));
      R.lengua.setAttribute("y2", (62 + Math.sin(ang) * ext).toFixed(1));
    } else { R.lengua.setAttribute("x2", 60); R.lengua.setAttribute("y2", 62); }
    // salto con squash & stretch
    var jy = 0, sx = 1, sy = 1;
    if (R.jump > 0) {
      R.jump -= dt / 650;
      var p = 1 - Math.max(0, R.jump);
      if (p < 0.15) { sy = 1 - p * 1.6; sx = 1 + p * 1.2; }            // se agacha
      else if (p < 0.85) { var q = (p - 0.15) / 0.7; jy = -Math.sin(q * Math.PI) * 60; sy = 1.12; sx = 0.92; } // vuela
      else { var q2 = (p - 0.85) / 0.15; sy = 1 - Math.sin(q2 * Math.PI) * 0.18; sx = 1 + Math.sin(q2 * Math.PI) * 0.14; } // aterriza
    } else {
      sy = 1 + Math.sin(t * 2.4) * 0.015;
    }
    R.body.setAttribute("transform", "translate(0 " + jy.toFixed(1) + ") translate(60 96) scale(" + sx.toFixed(3) + " " + sy.toFixed(3) + ") translate(-60 -96)");

    if (!reduce) requestAnimationFrame(tick);
  }

  revisarScroll();
  if (reduce) { tick(performance.now()); } else { requestAnimationFrame(tick); }
})();
