/*
  vida.js — la página está viva.

  Dos partes:
  1. Componentes vivos: botones con resorte magnético (ley de Hooke),
     tarjetas que respiran, se inclinan hacia el cursor y se aplastan
     cuando algo les cae encima.
  2. Criaturas: una jirafa y una rana con física propia. Caminan y saltan
     solas, se suben a las tarjetas, se montan una en la otra, persiguen
     moscas, se pueden agarrar y aventar. Se mandan a dormir con el botón
     "zzz" (o doble clic) si estorban; la decisión se recuerda.

  Todo sale de un solo requestAnimationFrame. Con prefers-reduced-motion
  no se anima nada y las criaturas se quedan dormidas.
*/
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INK = "#141414";
  var G = 2300;               // gravedad px/s²
  var LS = "narbigcito.criaturas";

  /* ================= estilos ================= */

  var css = [
    ".vivo{transition-property:color,background-color,border-color,box-shadow,opacity,transform,filter!important}",
    ".bicho svg *{pointer-events:visiblePainted}",
    ".bicho{pointer-events:none;position:fixed;left:0;top:0;z-index:70;touch-action:none;user-select:none;-webkit-user-select:none;will-change:transform}",
    ".bicho .cuerpo{transform-origin:50% 100%}",
    ".bicho svg{display:block;overflow:visible;filter:url(#vida-hervor)}",
    ".bicho.dormido{opacity:.6}",
    ".bicho.dormido svg *{pointer-events:none}",
    ".bicho .bur{position:absolute;bottom:100%;left:50%;transform:translate(-50%,4px);white-space:nowrap;",
    "background:#FFFDF5;color:" + INK + ";border:2px solid " + INK + ";box-shadow:3px 3px 0 " + INK + ";",
    "font:700 12px 'Space Grotesk',sans-serif;padding:4px 9px;opacity:0;transition:opacity .15s,transform .15s;pointer-events:none}",
    ".bicho .bur.on{opacity:1;transform:translate(-50%,-4px)}",
    ".zeta{position:fixed;z-index:71;pointer-events:none;font:700 14px 'Syne Mono',monospace;color:#FFFDF5;",
    "text-shadow:2px 2px 0 " + INK + "}",
    ".mosca{position:fixed;left:0;top:0;z-index:69;width:14px;height:10px;pointer-events:none}",
    "#vida-zzz{position:fixed;right:12px;top:64px;z-index:80;font:11px 'Syne Mono',monospace;letter-spacing:.04em;",
    "background:#FFFDF5;color:" + INK + ";border:2px solid " + INK + ";box-shadow:3px 3px 0 " + INK + ";padding:5px 10px;",
    "cursor:pointer;opacity:.75;transition:opacity .15s,box-shadow .1s,translate .1s}",
    "#vida-zzz:hover{opacity:1}",
    "#vida-zzz:active{box-shadow:0 0 0 " + INK + ";translate:3px 3px}",
    "@media (hover:none){#vida-zzz{cursor:auto}}",
    "@media (max-width:700px){#vida-zzz{top:auto;bottom:10px;right:10px;font-size:10px;padding:4px 8px}}",
    "@media print{.bicho,.mosca,#vida-zzz,.zeta,.obj-vida{display:none}}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // Filtro de "línea hervida": el contorno tiembla a saltitos como dibujo a mano.
  var defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  defs.setAttribute("width", "0"); defs.setAttribute("height", "0");
  defs.style.position = "absolute";
  defs.innerHTML = '<filter id="vida-hervor"><feTurbulence id="vida-turb" type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1"/>' +
    '<feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>';
  document.body.appendChild(defs);
  var turb = defs.querySelector("#vida-turb");

  /* ================= cursor ================= */

  var M = { x: -999, y: -999, t: 0, vx: 0 };
  window.addEventListener("pointermove", function (e) {
    M.vx = e.clientX - M.x;
    M.x = e.clientX; M.y = e.clientY; M.t = performance.now();
  }, { passive: true });

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ================= 1. componentes vivos ================= */

  var vivos = [];
  function registrar(sel, tipo) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el._vivo) return;
      var v = { el: el, tipo: tipo, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, s: 1, vs: 0,
                fase: Math.random() * 6.28, visible: false };
      el._vivo = v;
      el.classList.add("vivo");
      vivos.push(v);
      io.observe(el);
    });
  }
  // margen amplio: si un golpe saca una tarjeta de la pantalla, el resorte
  // tiene que seguir corriendo para regresarla a su lugar
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (e) { if (e.target._vivo) e.target._vivo.visible = e.isIntersecting; });
  }, { rootMargin: "200px 0px" });

  var SEL_MAG = ".btn, .nav-pill, .link-item, .lang-btn, .conv-close-btn";
  var SEL_CARD = ".bcard, .app-card, .status-box, .conv-thumb, .evento, .milk-btn, .arena-block, .substack-post";
  function escanear() { registrar(SEL_MAG, "mag"); registrar(SEL_CARD, "card"); }
  escanear();
  // are.na, eventos y conversaciones se pintan después: volver a mirar.
  new MutationObserver(function () { escanear(); }).observe(document.body, { childList: true, subtree: true });

  // Golpe externo (una criatura aterriza, muerde, lame): el componente reacciona.
  function sacudir(el, fuerza, giro) {
    var v = el && el._vivo;
    if (!v) return;
    v.vs -= fuerza * 0.06;
    v.vy += fuerza * 2.2;
    v.vr += (giro || 0);
  }

  function pasoVivos(dt, t) {
    var k = Math.min(2, dt / 16.67);
    for (var i = 0; i < vivos.length; i++) {
      var v = vivos[i];
      if (!v.visible || !v.el.isConnected) continue;
      var r = v.el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = M.x - cx, dy = M.y - cy;
      var tx = 0, ty = 0, tr = 0;

      if (v.tipo === "mag") {
        var rad = Math.max(70, r.width * 0.9);
        var d = Math.hypot(dx, dy);
        if (d < rad) { var f = 1 - d / rad; tx = dx * 0.32 * f; ty = dy * 0.32 * f; tr = dx * 0.04 * f; }
      } else {
        // respira: cada tarjeta a su ritmo
        tr = Math.sin(t * 0.45 + v.fase) * 0.35;
        ty = Math.sin(t * 0.7 + v.fase) * 1.2;
        var dentro = M.x > r.left - 20 && M.x < r.right + 20 && M.y > r.top - 20 && M.y < r.bottom + 20;
        if (dentro) {
          tr += clamp(dx / r.width, -0.6, 0.6) * 2.4;
          ty -= 4;
        }
      }
      // resorte (Hooke) con fricción
      v.vx = (v.vx + (tx - v.x) * 0.14 * k) * Math.pow(0.8, k);
      v.vy = (v.vy + (ty - v.y) * 0.14 * k) * Math.pow(0.8, k);
      v.vr = (v.vr + (tr - v.r) * 0.1 * k) * Math.pow(0.82, k);
      v.vs = (v.vs + (1 - v.s) * 0.18 * k) * Math.pow(0.78, k);
      v.x += v.vx * k; v.y += v.vy * k; v.r += v.vr * k; v.s += v.vs * k;
      v.el.style.translate = v.x.toFixed(2) + "px " + v.y.toFixed(2) + "px";
      v.el.style.rotate = v.r.toFixed(3) + "deg";
      v.el.style.scale = "1 " + v.s.toFixed(4);
    }
  }

  /* ================= 2. criaturas ================= */

  var jirafaSVG =
    '<svg viewBox="0 0 110 140" width="100%" height="100%">' +
    '<g class="cuerpo">' +
    '<path class="cola" d="M24 80 Q10 86 12 100" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle class="cola-p" cx="12" cy="102" r="4" fill="#8A4A14" stroke="' + INK + '" stroke-width="2"/>' +
    // patas: cada una rota desde la cadera
    '<g class="pata p1"><rect x="28" y="88" width="8" height="50" rx="3" fill="#FFB84D" stroke="' + INK + '" stroke-width="3"/><rect x="27" y="132" width="10" height="7" fill="#8A4A14" stroke="' + INK + '" stroke-width="2"/></g>' +
    '<g class="pata p2"><rect x="38" y="88" width="8" height="50" rx="3" fill="#F2A33A" stroke="' + INK + '" stroke-width="3"/><rect x="37" y="132" width="10" height="7" fill="#8A4A14" stroke="' + INK + '" stroke-width="2"/></g>' +
    '<g class="pata p3"><rect x="62" y="88" width="8" height="50" rx="3" fill="#F2A33A" stroke="' + INK + '" stroke-width="3"/><rect x="61" y="132" width="10" height="7" fill="#8A4A14" stroke="' + INK + '" stroke-width="2"/></g>' +
    '<g class="pata p4"><rect x="72" y="88" width="8" height="50" rx="3" fill="#FFB84D" stroke="' + INK + '" stroke-width="3"/><rect x="71" y="132" width="10" height="7" fill="#8A4A14" stroke="' + INK + '" stroke-width="2"/></g>' +
    '<ellipse cx="52" cy="84" rx="32" ry="17" fill="#FFB84D" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M34 78 q7-6 13 1 q-5 8-13 4z M52 88 q8-5 13 2 q-6 7-13 3z M66 76 q6-3 9 3 q-4 5-9 2z" fill="#C8651B"/>' +
    '<g class="cuello">' +
    '<path d="M66 84 L72 28 L86 28 L84 86 Z" fill="#FFB84D" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M72 48 q6-4 9 2 q-4 6-9 3z M74 66 q6-3 8 3 q-4 5-8 2z" fill="#C8651B"/>' +
    '<g class="cabeza">' +
    '<line x1="78" y1="12" x2="76" y2="2" stroke="' + INK + '" stroke-width="3"/><circle cx="76" cy="1" r="4" fill="#8A4A14" stroke="' + INK + '" stroke-width="2"/>' +
    '<line x1="87" y1="12" x2="89" y2="2" stroke="' + INK + '" stroke-width="3"/><circle cx="89" cy="1" r="4" fill="#8A4A14" stroke="' + INK + '" stroke-width="2"/>' +
    '<path class="oreja" d="M72 16 Q60 10 63 20 Q68 24 74 21 Z" fill="#FFB84D" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="85" cy="20" rx="15" ry="12" fill="#FFB84D" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="97" cy="25" rx="10" ry="8" fill="#FFD9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="100" cy="23" r="1.6" fill="' + INK + '"/>' +
    '<path class="boca" d="M92 29 Q97 32 102 28" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="84" cy="17" rx="5.5" ry="6" fill="#fff" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle class="pupila" cx="85" cy="18" r="2.8" fill="' + INK + '"/>' +
    '<rect class="parpado" x="78" y="10.5" width="12" height="0" fill="#FFB84D"/>' +
    '<ellipse cx="80" cy="26" rx="3.5" ry="2" fill="#FF6B6B" opacity=".6"/>' +
    '</g></g></g></svg>';

  var ranaSVG =
    '<svg viewBox="0 0 120 100" width="100%" height="100%">' +
    '<g class="cuerpo">' +
    '<ellipse class="pt pt1" cx="22" cy="88" rx="18" ry="9" fill="#5DBB63" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse class="pt pt2" cx="98" cy="88" rx="18" ry="9" fill="#5DBB63" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 82 Q14 40 60 38 Q106 40 102 82 Q60 98 18 82 Z" fill="#88D498" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse class="garganta" cx="60" cy="76" rx="20" ry="10" fill="#E8F7C8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="46" cy="56" r="2.5" fill="#5DBB63"/><circle cx="74" cy="52" r="3" fill="#5DBB63"/><circle cx="62" cy="48" r="2" fill="#5DBB63"/>' +
    '<path class="boca" d="M40 62 Q60 72 80 62" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="38" cy="36" r="15" fill="#88D498" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="82" cy="36" r="15" fill="#88D498" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="38" cy="35" r="9" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="82" cy="35" r="9" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle class="pupila" cx="38" cy="36" r="4.5" fill="' + INK + '"/>' +
    '<circle class="pupila" cx="82" cy="36" r="4.5" fill="' + INK + '"/>' +
    '<rect class="parpado" x="26" y="24" width="68" height="0" fill="#88D498"/>' +
    '<ellipse cx="28" cy="60" rx="5" ry="3" fill="#FF6B6B" opacity=".5"/><ellipse cx="92" cy="60" rx="5" ry="3" fill="#FF6B6B" opacity=".5"/>' +
    '<path d="M40 90 q-6 6 -12 6 M40 90 q-2 7 -6 9 M80 90 q6 6 12 6 M80 90 q2 7 6 9" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '</g></svg>';

  // La lengua vive fuera del SVG para poder estirarse por toda la pantalla.
  var lengua = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lengua.setAttribute("style", "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:69;overflow:visible");
  lengua.innerHTML = '<line x1="0" y1="0" x2="0" y2="0" stroke="#FF6B6B" stroke-width="5" stroke-linecap="round" style="display:none"/>' +
    '<circle r="5" fill="#FF6B6B" style="display:none"/>';
  document.body.appendChild(lengua);
  var lenguaL = lengua.querySelector("line"), lenguaP = lengua.querySelector("circle");

  function crearBicho(nombre, svg, w, h, extra) {
    var el = document.createElement("div");
    el.className = "bicho";
    el.style.width = w + "px"; el.style.height = h + "px";
    el.innerHTML = '<div class="bur"></div>' + svg;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    var b = {
      nombre: nombre, el: el, w: w, h: h, x: 0, y: 0, vx: 0, vy: 0,
      modo: "aire", dir: 1, sup: null, piso: false,
      decidir: rnd(1, 3), accion: null, sq: 1, vsq: 0, rot: 0,
      gaze: { x: 0, y: 0 }, parp: 0, sigParp: rnd(1.5, 4), fase: 0, animo: 0,
      pupilas: el.querySelectorAll(".pupila"), parpado: el.querySelector(".parpado"),
      cuerpo: el.querySelector(".cuerpo"), bur: el.querySelector(".bur")
    };
    for (var k in extra) b[k] = extra[k];
    b.pupBase = Array.prototype.map.call(b.pupilas, function (p) { return [+p.getAttribute("cx"), +p.getAttribute("cy")]; });
    b.lidH = +b.parpado.getAttribute("height") || 0;
    return b;
  }

  var ancho = window.innerWidth;
  var escala = ancho < 640 ? 0.72 : 1;
  var J = crearBicho("jirafa", jirafaSVG, Math.round(92 * escala), Math.round(117 * escala), {
    patas: null, cuello: null, cabeza: null, cola: null, lidMax: 13, reach: 2.2, vel: 38 * escala
  });
  J.patas = J.el.querySelectorAll(".pata");
  J.cuello = J.el.querySelector(".cuello");
  J.cabeza = J.el.querySelector(".cabeza");
  J.cola = J.el.querySelector(".cola");
  J.boca = J.el.querySelector(".boca");
  var R = crearBicho("rana", ranaSVG, Math.round(66 * escala), Math.round(55 * escala), {
    lidMax: 24, reach: 3.6, garganta: null, lenguaT: 0, lenguaObj: null
  });
  R.garganta = R.el.querySelector(".garganta");
  var bichos = [J, R];

  J.x = ancho - J.w - 170; J.y = window.innerHeight - J.h; J.modo = "suelo"; J.piso = true;
  R.x = 40; R.y = window.innerHeight - R.h; R.modo = "suelo"; R.piso = true;

  function decir(b, txt, ms) {
    b.bur.textContent = txt;
    b.bur.classList.add("on");
    clearTimeout(b.bur._t);
    b.bur._t = setTimeout(function () { b.bur.classList.remove("on"); }, ms || 1600);
  }

  /* ---- superficies: el suelo, las tarjetas, y la otra criatura ---- */

  var SEL_SUP = ".bcard, .app-card, .status-box, .conv-thumb, .wall-wrap, .evento, .sec-title, .eventos-list, .arena-block, .substack-post, .mesa-vida, .red";
  var cacheSup = [], cacheT = 0;
  function superficies(now) {
    if (now - cacheT < 250) return cacheSup;
    cacheT = now;
    var H = window.innerHeight, out = [];
    document.querySelectorAll(SEL_SUP).forEach(function (el) {
      var r = el.getBoundingClientRect();
      var esMesa = el.classList.contains("mesa-vida");
      if (r.width < 70 || r.top < 70 || (!esMesa && r.top > H - 40) || r.bottom < 0) return;
      out.push({ el: el, top: r.top, left: r.left, right: r.right });
    });
    cacheSup = out;
    return out;
  }
  function borde(sup) {
    if (sup.bicho) {
      var o = sup.bicho;
      // el lomo de la jirafa
      return { top: o.y + o.h * 0.5, left: o.x + o.w * 0.18, right: o.x + o.w * 0.62 };
    }
    var r = sup.el.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right };
  }

  /* ---- arrastrar y aventar ---- */

  var agarrado = null, hist = [];
  bichos.forEach(function (b) {
    b.el.addEventListener("pointerdown", function (e) {
      if (dormidas) return;
      e.preventDefault();
      agarrado = b; b.modo = "agarrado"; b.sup = null; b.piso = false;
      b.offX = e.clientX - b.x; b.offY = e.clientY - b.y;
      hist = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      b.el.setPointerCapture(e.pointerId);
      decir(b, b === J ? pick(["¡bájame!", "¡uy, qué alto!", "tengo vértigo"]) : pick(["¡croac!?", "¡suéltame!", "wiii"]), 1200);
      b.animo = 1;
    });
    b.el.addEventListener("pointermove", function (e) {
      if (agarrado !== b) return;
      hist.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (hist.length > 6) hist.shift();
    });
    function soltar(e) {
      if (agarrado !== b) return;
      agarrado = null;
      var a = hist[0], z = hist[hist.length - 1], dt = Math.max(16, z.t - a.t) / 1000;
      b.vx = clamp((z.x - a.x) / dt, -1600, 1600);
      b.vy = clamp((z.y - a.y) / dt, -1600, 1600);
      b.modo = "aire";
      if (Math.hypot(b.vx, b.vy) < 60) decir(b, b === J ? "gracias" : "croac", 900);
    }
    b.el.addEventListener("pointerup", soltar);
    b.el.addEventListener("pointercancel", soltar);
    b.el.addEventListener("dblclick", function () { dormir(true); });
  });

  /* ---- dormir ---- */

  var dormidas = false;
  var btn = document.createElement("button");
  btn.id = "vida-zzz"; btn.type = "button";
  document.body.appendChild(btn);
  function pintarBtn() { btn.textContent = dormidas ? "despertar a los bichos" : "zzz · mandar a dormir"; }
  function dormir(si) {
    dormidas = si;
    try { localStorage.setItem(LS, si ? "dormidas" : "despiertas"); } catch (e) {}
    bichos.forEach(function (b) {
      b.el.classList.toggle("dormido", si);
      if (si) {
        b.sup = null; b.modo = "aire";
        b.metaX = b === R ? 8 : ancho - b.w - 150;   // se van a su rincón
        decir(b, "buenas noches", 1000);
      } else {
        b.modo = "aire"; b.vy = -500; b.animo = 1;
        decir(b, b === J ? "¡ya desperté!" : "¡croac!", 1200);
      }
    });
    pintarBtn();
  }
  btn.addEventListener("click", function () { dormir(!dormidas); });
  var guardado = null;
  try { guardado = localStorage.getItem(LS); } catch (e) {}
  dormidas = reduce || guardado === "dormidas";
  bichos.forEach(function (b) { b.el.classList.toggle("dormido", dormidas); });
  pintarBtn();

  /* ---- la mosca ---- */

  var mosca = null, sigMosca = rnd(10, 18);
  function soltarMosca() {
    var el = document.createElement("div");
    el.className = "mosca";
    el.innerHTML = '<svg viewBox="0 0 14 10" width="14" height="10"><ellipse cx="7" cy="6" rx="4" ry="3" fill="' + INK + '"/>' +
      '<ellipse class="ala" cx="5" cy="2.5" rx="3" ry="2" fill="#fff" stroke="' + INK + '" stroke-width="1" opacity=".85"/>' +
      '<ellipse class="ala" cx="9" cy="2.5" rx="3" ry="2" fill="#fff" stroke="' + INK + '" stroke-width="1" opacity=".85"/></svg>';
    document.body.appendChild(el);
    mosca = { el: el, x: Math.random() < 0.5 ? -20 : ancho + 20, y: rnd(120, window.innerHeight - 160), vx: 0, vy: 0, t: rnd(0, 9) };
  }

  /* ---- zetas al dormir ---- */

  var zetas = [], sigZ = 0;
  function echarZ(b) {
    var z = document.createElement("div");
    z.className = "zeta"; z.textContent = "z";
    document.body.appendChild(z);
    zetas.push({ el: z, x: b.x + b.w * (b === J ? 0.8 : 0.5), y: b.y + 4, v: 0 });
  }

  /* ---- cerebro de cada criatura ---- */

  function decidirRana(b, sups) {
    var r = Math.random();
    // montarse en la jirafa, si anda cerca
    if (r < 0.14 && J.modo !== "agarrado" && Math.abs((J.x + J.w / 2) - (b.x + b.w / 2)) < 320 && J.sup === null && J.piso) {
      var lomo = borde({ bicho: J });
      saltarA(b, (lomo.left + lomo.right) / 2 - b.w / 2, lomo.top, { bicho: J });
      decir(b, "¡arre!", 1000);
      return;
    }
    if (r < 0.5 && sups.length) {
      var pieR = b.y + b.h;
      var alcanzables = sups.filter(function (s) { return s.top > pieR - 300 && s.top < pieR + 400; });
      if (!alcanzables.length) { b.accion = "sentada"; return; }
      var s = pick(alcanzables), bb = borde(s);
      var tx = clamp(rnd(bb.left, bb.right - b.w), 0, ancho - b.w);
      if (Math.abs(tx - b.x) < 520) { saltarA(b, tx, bb.top, s); return; }
    }
    if (r < 0.8) {
      var dx = pick([-1, 1]) * rnd(60, 180);
      var lim = b.sup ? borde(b.sup) : { left: 0, right: ancho };
      var nx = clamp(b.x + dx, 0, ancho - b.w);
      // si se sale de la tarjeta, cae al suelo: está bien, es rana
      saltarA(b, nx, (nx < lim.left - b.w / 2 || nx > lim.right - b.w / 2) ? window.innerHeight : b.y + b.h, null);
      return;
    }
    b.accion = "sentada";
  }

  function saltarA(b, tx, pieY, sup) {
    var dx = tx - b.x, dy = (pieY - b.h) - b.y;
    // Si el destino está más alto, apunta 40 px por encima y alarga el salto:
    // así llega ya de bajada y el aterrizaje sobre la tarjeta no falla por
    // redondeos de la integración cuadro a cuadro.
    if (dy < -10) dy -= 40;
    var T = Math.max(0.55, Math.sqrt(2 * Math.max(0, -dy) / G) * 1.25);
    b.vx = dx / T;
    b.vy = (dy - 0.5 * G * T * T) / T;
    b.dir = dx >= 0 ? 1 : -1;
    b.sq = 0.8;                       // se agacha antes de saltar
    b.modo = "aire"; b.sup = null; b.piso = false;
    b.meta = sup;
  }

  function decidirJirafa(b) {
    var r = Math.random();
    if (r < 0.55) { b.accion = "caminar"; b.dir = pick([-1, 1]); b.duracion = rnd(2.5, 6); }
    else if (r < 0.75 && b.sup && !b.sup.bicho) { b.accion = "mordisquear"; b.duracion = 1.6; decir(b, "ñam", 900); }
    else { b.accion = "quieta"; b.duracion = rnd(1.5, 3.5); }
  }

  /* ---- física ---- */

  function aterrizar(b, top, sup) {
    b.y = top - b.h; b.vy = 0; b.vx = 0;
    b.modo = sup ? "encima" : "suelo";
    b.sup = sup; b.piso = !sup;
    b.vsq -= 0.09;                        // se aplasta al caer
    if (sup && sup.el) sacudir(sup.el, b === J ? 7 : 4, (Math.random() - 0.5) * 1.2);
    if (sup && sup.el && escena && sup.el === escena.el) escena.vsq -= 0.12;
    if (sup && sup.bicho) { sup.bicho.vsq -= 0.05; decir(sup.bicho, "oye…", 900); }
    b.decidir = rnd(0.8, 2.4);
  }

  function pasoFisica(b, dt, now) {
    var H = window.innerHeight;
    if (b.modo === "agarrado") {
      var tx = M.x - b.offX, ty = M.y - b.offY;
      b.vx = (tx - b.x) / Math.max(dt, 0.001);
      b.x += (tx - b.x) * 0.5; b.y += (ty - b.y) * 0.5;
      b.rot += (clamp(-b.vx * 0.02, -25, 25) - b.rot) * 0.2;   // cuelga y se balancea
      return;
    }
    b.rot *= 0.85;

    if (b.modo === "aire") {
      var prevPie = b.y + b.h;
      b.vy += G * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > ancho - b.w) { b.x = ancho - b.w; b.vx = -Math.abs(b.vx) * 0.5; }
      if (b.y < -b.h * 0.5 && b.vy < 0) { b.vy *= 0.5; }
      var pie = b.y + b.h, cx = b.x + b.w / 2;
      if (b.vy > 0 && !dormidas) {
        var cands = superficies(now).slice();
        var otro = b === R ? J : null;
        if (otro && otro.modo !== "agarrado") cands.push({ bicho: otro });
        for (var i = 0; i < cands.length; i++) {
          var bb = borde(cands[i]);
          if (cx > bb.left + 6 && cx < bb.right - 6 && prevPie <= bb.top + 2 && pie >= bb.top) {
            aterrizar(b, bb.top, cands[i]);
            return;
          }
        }
      }
      if (pie >= H) { aterrizar(b, H, null); }
      return;
    }

    // en el suelo o encima de algo
    if (b.sup) {
      var bd = borde(b.sup);
      var visible = b.sup.bicho || (bd.top > 50 && bd.top < H - 10);
      if (!visible || b.x + b.w / 2 < bd.left - 4 || b.x + b.w / 2 > bd.right + 4) {
        b.modo = "aire"; b.sup = null; b.vy = 0;
        if (b === J) decir(b, "¡aaah!", 900);
        return;
      }
      b.y = bd.top - b.h;
      if (b.sup.bicho) b.x += (b.sup.bicho.x + b.sup.bicho.w * 0.4 - b.w / 2 - b.x) * 0.25;
    } else {
      b.y = H - b.h;
    }
  }

  /* ---- animación de cada criatura ---- */

  function mirar(b, obj) {
    var r = b.el.getBoundingClientRect();
    var ox = r.left + r.width * (b === J ? 0.8 : 0.5), oy = r.top + r.height * 0.2;
    var tx, ty;
    if (obj) { var dx = obj.x - ox, dy = obj.y - oy, d = Math.hypot(dx, dy) || 1; tx = dx / d * b.reach; ty = dy / d * b.reach; }
    else { var t = performance.now() / 1000; tx = Math.sin(t * 0.8 + b.w) * b.reach; ty = Math.cos(t * 0.6) * b.reach * 0.5; }
    if (b.dir < 0) tx = -tx;         // el SVG está volteado
    b.gaze.x += (tx - b.gaze.x) * 0.12; b.gaze.y += (ty - b.gaze.y) * 0.12;
    for (var i = 0; i < b.pupilas.length; i++) {
      b.pupilas[i].setAttribute("cx", (b.pupBase[i][0] + b.gaze.x).toFixed(2));
      b.pupilas[i].setAttribute("cy", (b.pupBase[i][1] + b.gaze.y).toFixed(2));
    }
  }

  function parpadear(b, dt) {
    if (dormidas || b.siesta) { b.parpado.setAttribute("height", b.lidMax); return; }
    b.sigParp -= dt;
    if (b.sigParp <= 0) { b.parp = 1; b.sigParp = Math.random() < 0.2 ? 0.2 : rnd(1.8, 5.5); }
    if (b.parp > 0) { b.parp -= dt / 0.16; b.parpado.setAttribute("height", (Math.max(0, Math.sin(Math.max(0, b.parp) * Math.PI)) * b.lidMax).toFixed(2)); }
    else b.parpado.setAttribute("height", 0);
  }

  function dibujar(b, t) {
    b.vsq = (b.vsq + (1 - b.sq) * 0.25) * 0.72;
    b.sq += b.vsq;
    var sx = 1 / Math.sqrt(Math.max(0.5, b.sq));
    var resp = dormidas ? Math.sin(t * 1.2) * 0.025 : Math.sin(t * 2.2 + b.w) * 0.012;
    b.cuerpo.setAttribute("transform",
      "translate(" + (b.dir < 0 ? b.w * 0 : 0) + " 0)");
    b.el.style.transform = "translate(" + b.x.toFixed(1) + "px," + b.y.toFixed(1) + "px) rotate(" + b.rot.toFixed(2) + "deg)";
    var svg = b.el.querySelector("svg");
    svg.style.transform = "scale(" + (b.dir * sx).toFixed(3) + "," + (b.sq + resp).toFixed(3) + ")";
    svg.style.transformOrigin = "50% 100%";
  }


  /* =================================================================
     3. escenas de amigos
     De vez en cuando la jirafa y la rana dejan lo que hacen y pasan un
     rato juntas: una mesa cae del cielo y se toman algo, o aparece una
     pelota y se la pasan. Mientras dura la escena el resto sigue igual:
     la mesa y la pelota son objetos con física que golpean tarjetas, y
     si agarras a una de las dos la escena se rompe.
     ================================================================= */

  var escena = null, sigEscena = rnd(22, 38);
  var ESC_INK = 'stroke="' + INK + '" stroke-width="3"';

  function objFijo(html, w, h) {
    var el = document.createElement("div");
    el.className = "obj-vida";
    el.style.cssText = "position:fixed;left:0;top:0;width:" + w + "px;height:" + h + "px;z-index:68;pointer-events:none;will-change:transform";
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }
  function poner(el, x, y, r) {
    el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)" + (r ? " rotate(" + r.toFixed(1) + "deg)" : "");
  }
  function boca(b) {
    // punto de la boca en pantalla, respetando hacia dónde mira
    var fx = b === J ? 97 / 110 : 0.5, fy = b === J ? 30 / 140 : 0.66;
    return { x: b.x + (b.dir > 0 ? fx : 1 - fx) * b.w, y: b.y + fy * b.h };
  }
  function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

  // La jirafa camina hasta x; devuelve true cuando llegó.
  function jirafaVaA(x, dt) {
    var dx = x - J.x;
    if (Math.abs(dx) < 3) { J._camina = false; return true; }
    J.dir = dx > 0 ? 1 : -1;
    J.x += J.dir * Math.min(Math.abs(dx), J.vel * 2.2 * dt);
    J._camina = true;
    return false;
  }
  // La rana va a saltos (máximo 200 px por salto) hasta x sobre la superficie sup.
  function ranaVaA(x, pieY, sup) {
    if (R.modo === "aire") return false;
    if (sup && R.sup && (sup.el ? R.sup.el === sup.el : R.sup.bicho === sup.bicho)) return true;
    var dx = x - R.x;
    if (!sup && Math.abs(dx) < 8 && !R.sup) return true;
    if (Math.abs(dx) > 200) saltarA(R, R.x + Math.sign(dx) * 200, R.sup ? borde(R.sup).top : window.innerHeight, null);
    else saltarA(R, x, pieY, sup);
    return false;
  }

  var PLATICAS = [
    [[J, "¿cómo va tu semana?"], [R, "de tarjeta en tarjeta"], [J, "igual que siempre, pues"], [R, "croac"]],
    [[J, "¿qué es eso morado?"], [R, "jarabe de uva, creo"], [J, "mmm, ok"], [R, "no le digas a nadie"]],
    [[R, "¿alguna vez te han roto un muro?"], [J, "once veces"], [R, "yo lo vi"], [J, "no me lo recuerdes"]],
    [[J, "a veces pienso que somos puro código"], [R, "¿y qué más da?"], [J, "tienes razón"], [R, "salud por eso"]],
    [[R, "la mosca de hace rato estaba buenísima"], [J, "no quiero saber"], [R, "crujiente"], [J, "¡que no!"]],
    [[J, "¿tú crees que alguien nos ve?"], [R, "el del cursor, siempre"], [J, "hola, del cursor"], [R, "croac"]]
  ];
  function platicaDelSubstack() {
    var f = window.__substackPosts;
    if (!f || !f.length) return null;
    var p = pick(f.slice(0, 4));
    return [[R, "¿leíste lo nuevo del substack?"], [J, "¿«" + p.title + "»?"], [R, "ese mero"], [J, "me dejó pensando"]];
  }

  var MESA_SVG =
    '<svg viewBox="0 0 130 56" width="100%" height="100%" style="overflow:visible;filter:url(#vida-hervor)">' +
    '<rect x="14" y="14" width="9" height="42" fill="#8A4A14" ' + ESC_INK + '/>' +
    '<rect x="107" y="14" width="9" height="42" fill="#8A4A14" ' + ESC_INK + '/>' +
    '<rect x="4" y="4" width="122" height="14" fill="#E07A2E" ' + ESC_INK + '/>' +
    '<line x1="12" y1="10" x2="60" y2="10" stroke="#FFB067" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  var TARRO_SVG =
    '<svg viewBox="0 0 26 34" width="100%" height="100%" style="overflow:visible">' +
    '<path d="M20 12 q8 0 8 8 q0 7 -8 7" fill="none" ' + ESC_INK + '/>' +
    '<rect x="3" y="8" width="18" height="24" fill="#FFD23F" ' + ESC_INK + '/>' +
    '<path d="M1 9 q3-8 8-5 q3-5 8-1 q6-2 6 6 z" fill="#FFFDF5" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="9" cy="20" r="1.6" fill="#FFF3B0"/><circle cx="14" cy="26" r="1.2" fill="#FFF3B0"/>' +
    '</svg>';
  var VASO_SVG =
    '<svg viewBox="0 0 24 34" width="100%" height="100%" style="overflow:visible">' +
    '<line x1="15" y1="4" x2="19" y2="-8" stroke="#FF6B6B" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M2 6 L22 6 L19 33 L5 33 Z" fill="#FFFDF5" ' + ESC_INK + ' stroke-linejoin="round"/>' +
    '<path d="M3 11 L21 11" stroke="' + INK + '" stroke-width="1.5"/>' +
    '<ellipse cx="12" cy="7" rx="9" ry="2.5" fill="#9B4DFF" stroke="' + INK + '" stroke-width="2"/>' +
    '</svg>';
  var PELOTA_SVG =
    '<svg viewBox="0 0 30 30" width="100%" height="100%" style="overflow:visible">' +
    '<circle cx="15" cy="15" r="13" fill="#FFFDF5" ' + ESC_INK + '/>' +
    '<path d="M2 15 Q15 7 28 15" fill="none" stroke="#FF6B6B" stroke-width="4"/>' +
    '<path d="M15 2 Q9 15 15 28" fill="none" stroke="#B8A9FA" stroke-width="4"/>' +
    '</svg>';

  /* ---- la mesa ---- */

  function iniciarMesa() {
    var H = window.innerHeight;
    var w = ancho < 640 ? 104 : 130, h = Math.round(w * 56 / 130);
    var el = objFijo(MESA_SVG, w, h);
    el.classList.add("mesa-vida");
    var cx = (J.x + R.x + R.w) / 2;
    var x = clamp(cx - w / 2, J.w + 20, ancho - w - R.w - 30);
    var e = { tipo: "mesa", fase: "cae", t: 0, w: w, h: h, x: x, y: -h - 20, vy: 0, rebotes: 0, el: el, sq: 1, vsq: 0 };
    el.style.transformOrigin = "50% 100%";
    e.tarro = objFijo(TARRO_SVG, 20, 26); e.tarro.style.opacity = 0;
    e.vaso = objFijo(VASO_SVG, 18, 26); e.vaso.style.opacity = 0;
    e.sorboJ = 0; e.sorboR = 0; e.sigSorbo = 1.2;
    e.charla = (Math.random() < 0.35 && platicaDelSubstack()) || pick(PLATICAS);
    e.linea = 0; e.sigLinea = 0.6;
    poner(el, x, e.y);
    decir(J, pick(["¿y esa mesa?", "¡mira!", "¿otra vez?"]), 1300);
    setTimeout(function () { decir(R, pick(["¡una mesa!", "¡hora feliz!", "croac croac"]), 1300); }, 500);
    return e;
  }

  function pasoMesa(e, dt) {
    var H = window.innerHeight;
    e.t += dt;
    var pisoY = H - e.h;

    if (e.fase === "cae") {
      e.vy += G * dt; e.y += e.vy * dt;
      if (e.y >= pisoY) {
        e.y = pisoY;
        if (e.rebotes < 2 && Math.abs(e.vy) > 200) { e.vy = -e.vy * 0.35; e.rebotes++; e.vsq -= 0.15; }
        else { e.vy = 0; e.fase = "van"; e.t = 0; }
        // la caída sacude lo que haya cerca
        vivos.forEach(function (v) { if (v.visible && v.tipo === "card" && Math.random() < 0.5) sacudir(v.el, 2, rnd(-1, 1)); });
      }
      poner(e.el, e.x, e.y);
      return;
    }
    e.vsq = (e.vsq + (1 - e.sq) * 0.25) * 0.72; e.sq += e.vsq;
    e.el.style.transform = "translate(" + e.x.toFixed(1) + "px," + e.y.toFixed(1) + "px) scale(" + (2 - e.sq).toFixed(3) + "," + e.sq.toFixed(3) + ")";
    var top = e.y + e.h * 0.07;
    var supMesa = { el: e.el };

    if (e.fase === "van") {
      var jOk = jirafaVaA(e.x - J.w * 0.62, dt);
      var rOk = ranaVaA(e.x + e.w - R.w - 4, top, supMesa);
      if ((jOk && rOk) || e.t > 14) {
        J._camina = false; J.dir = 1; R.dir = -1;
        e.fase = "sirven"; e.t = 0;
      }
      return;
    }

    // posiciones base de las bebidas sobre la mesa
    var baseT = { x: e.x + 8, y: top - 26 };
    var baseV = { x: e.x + e.w - R.w - 20, y: top - 26 };
    if (e.fase === "sirven") {
      var k = clamp(e.t / 0.5, 0, 1);
      e.tarro.style.opacity = e.vaso.style.opacity = k;
      poner(e.tarro, baseT.x, baseT.y - (1 - k) * 60);
      poner(e.vaso, baseV.x, baseV.y - (1 - k) * 60);
      if (e.t > 0.9) { e.fase = "salud"; e.t = 0; }
      return;
    }
    if (e.fase === "salud") {
      var m = { x: e.x + e.w / 2 - 10, y: top - 58 };
      var s = ease(clamp(e.t < 0.6 ? e.t / 0.6 : (1.3 - e.t) / 0.5, 0, 1));
      poner(e.tarro, baseT.x + (m.x - 8 - baseT.x) * s, baseT.y + (m.y - baseT.y) * s, s * 20);
      poner(e.vaso, baseV.x + (m.x + 8 - baseV.x) * s, baseV.y + (m.y - baseV.y) * s, -s * 20);
      if (e.t > 0.55 && !e.chocaron) {
        e.chocaron = true;
        decir(J, "¡salud!", 1000); decir(R, "¡salud!", 1000);
        J.animo = 1; R.animo = 1; R.vsq -= 0.08; J.vsq -= 0.05;
        e.vsq -= 0.06;
      }
      if (e.t > 1.4) { e.fase = "platica"; e.t = 0; }
      return;
    }
    if (e.fase === "platica" || e.fase === "adios") {
      // sorbos
      e.sigSorbo -= dt;
      if (e.sigSorbo <= 0 && e.fase === "platica") {
        if (Math.random() < 0.5) e.sorboJ = 1; else e.sorboR = 1;
        e.sigSorbo = rnd(1.6, 3.2);
      }
      function sorbo(obj, base, b, key, rotSign) {
        var v = e[key];
        if (v > 0) e[key] = Math.max(0, v - dt / 1.1);
        var s = ease(Math.sin(Math.max(0, e[key]) * Math.PI));
        var mo = boca(b);
        var tx = mo.x - (b === J ? 4 : 9), ty = mo.y - 16;
        poner(obj, base.x + (tx - base.x) * s, base.y + (ty - base.y) * s, rotSign * s * 35);
      }
      sorbo(e.tarro, baseT, J, "sorboJ", -1);
      sorbo(e.vaso, baseV, R, "sorboR", 1);

      if (e.fase === "platica") {
        e.sigLinea -= dt;
        if (e.sigLinea <= 0) {
          if (e.linea < e.charla.length) {
            var l = e.charla[e.linea++];
            decir(l[0], l[1], 2100);
            l[0].animo = 1;
            e.sigLinea = 2.4;
          } else {
            e.fase = "adios"; e.t = 0;
            decir(J, pick(["bueno, a lo mío", "hay que seguir", "me voy a pasear"]), 1500);
            setTimeout(function () { decir(R, pick(["croac, gracias", "otro día", "yo invito la próxima"]), 1500); }, 600);
          }
        }
      } else if (e.t > 1.6) {
        e.fase = "fin"; e.t = 0;
      }
      return;
    }
    if (e.fase === "fin") {
      var o = 1 - clamp(e.t / 0.5, 0, 1);
      e.tarro.style.opacity = e.vaso.style.opacity = o;
      if (e.t > 0.5) {
        if (R.sup && R.sup.el === e.el) { R.modo = "aire"; R.sup = null; R.vy = -700; R.vx = 120; }
        e.y += 900 * dt;             // la mesa se hunde en el piso
        e.el.style.opacity = clamp(1 - (e.t - 0.5) / 0.6, 0, 1);
      }
      if (e.t > 1.2) terminarEscena();
    }
  }

  /* ---- la pelota ---- */

  function iniciarPelota() {
    var d = ancho < 640 ? 24 : 30;
    var el = objFijo(PELOTA_SVG, d, d);
    el.style.pointerEvents = "auto";
    el.style.cursor = "pointer";
    el.style.touchAction = "none";
    var e = { tipo: "pelota", t: 0, d: d, x: clamp((J.x + R.x) / 2, 40, ancho - 60), y: -40, vx: rnd(-80, 80), vy: 0,
              rot: 0, toques: 0, cdJ: 0, cdR: 0, el: el, fin: false };
    // tú también puedes patearla
    el.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      e.vy = -1100; e.vx = (e.x < ancho / 2 ? 1 : -1) * rnd(250, 450);
      decir(pick([J, R]), pick(["¡buena!", "¡eso!", "¡juega con nosotras!"]), 1100);
    });
    decir(R, pick(["¡pelota!", "¿jugamos?", "¡mía!"]), 1200);
    return e;
  }

  function pasoPelota(e, dt, now) {
    var H = window.innerHeight, r = e.d / 2;
    e.t += dt;
    e.cdJ -= dt; e.cdR -= dt;
    var prevY = e.y + e.d;
    e.vy += G * 0.55 * dt;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.rot += e.vx * dt / r * 57.3;
    if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx) * 0.8; }
    if (e.x > ancho - e.d) {
      if (e.fin) { terminarEscena(); return; }
      e.x = ancho - e.d; e.vx = -Math.abs(e.vx) * 0.8;
    }
    // rebota en las tarjetas y las sacude
    if (e.vy > 0) {
      var sups = superficies(now);
      for (var i = 0; i < sups.length; i++) {
        var bb = borde(sups[i]), cx = e.x + r;
        if (cx > bb.left && cx < bb.right && prevY <= bb.top + 2 && e.y + e.d >= bb.top) {
          e.y = bb.top - e.d; e.vy = -Math.abs(e.vy) * 0.62; e.vx *= 0.9;
          sacudir(sups[i].el, 3, e.vx * 0.004);
          break;
        }
      }
    }
    if (e.y + e.d >= H) {
      e.y = H - e.d;
      e.vy = Math.abs(e.vy) > 120 ? -Math.abs(e.vy) * 0.7 : 0;
      e.vx *= Math.pow(0.35, dt);
    }
    poner(e.el, e.x, e.y, e.rot);
    if (e.fin) { e.vx = Math.max(e.vx, 260); return; }

    var bx = e.x + r, by = e.y + r;
    // la jirafa la sigue por el piso
    if (J.modo !== "aire" && !J.sup) jirafaVaA(clamp(bx - J.w * (bx > J.x + J.w / 2 ? 0.2 : 0.8), 0, ancho - J.w), dt);
    else J._camina = false;
    // la rana brinca hacia ella
    if (R.modo !== "aire" && Math.abs(bx - (R.x + R.w / 2)) > 30 && Math.random() < 0.05)
      saltarA(R, clamp(bx - R.w / 2 + rnd(-30, 30), 0, ancho - R.w), R.sup ? borde(R.sup).top : H, R.sup);

    function toque(b, key, frases) {
      if (e[key] > 0) return;
      var pad = 6;
      if (bx > b.x - pad && bx < b.x + b.w + pad && by > b.y - pad && by < b.y + b.h + pad) {
        var otra = b === J ? R : J;
        var hacia = (otra.x + otra.w / 2) > bx ? 1 : -1;
        var dist = Math.abs(otra.x - b.x);
        e.vx = hacia * clamp(dist * 0.9, 220, 520);
        e.vy = -rnd(850, 1100);
        e[key] = 0.5;
        e.toques++;
        b.vsq -= 0.07; b.animo = 1;
        if (Math.random() < 0.55) decir(b, pick(frases), 900);
      }
    }
    toque(J, "cdJ", ["¡tuya!", "¡de cabeza!", "¡ahí va!"]);
    toque(R, "cdR", ["¡pásala!", "¡gol!", "¡croac!"]);

    if (e.t > 32 || e.toques >= 12) {
      e.fin = true;
      decir(R, pick(["¡otra!", "¡se fue!"]), 1300);
      setTimeout(function () { decir(J, pick(["mañana seguimos", "ya me cansé"]), 1300); }, 700);
    }
  }


  /* ---- utilidades compartidas por las escenas nuevas ---- */

  // Recorre una plática línea por línea; devuelve true cuando se acabó.
  function correrCharla(e, dt, pausa) {
    e.sigLinea -= dt;
    if (e.sigLinea > 0) return false;
    if (e.linea >= e.charla.length) return true;
    var l = e.charla[e.linea++];
    decir(l[0], l[1], 2100);
    l[0].animo = 1;
    e.sigLinea = pausa || 2.4;
    return false;
  }
  function esDeNoche() { var h = new Date().getHours(); return h >= 22 || h < 5; }

  /* ---- la fogata (solo de noche, según el reloj de quien visita) ---- */

  var FOGATA_SVG =
    '<svg viewBox="0 0 70 70" width="100%" height="100%" style="overflow:visible">' +
    '<g class="llamas" style="transform-origin:35px 58px">' +
    '<path d="M35 6 C48 24 56 34 52 48 C49 58 21 58 18 48 C14 34 24 26 35 6 Z" fill="#FF6B6B" ' + ESC_INK + '/>' +
    '<path d="M35 22 C43 32 47 40 44 49 C42 55 28 55 26 49 C23 40 29 33 35 22 Z" fill="#FFD23F" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M35 36 C39 42 40 46 38 51 C36 54 34 54 32 51 C30 46 32 42 35 36 Z" fill="#FFFDF5"/>' +
    '</g>' +
    '<rect x="8" y="54" width="54" height="10" rx="3" fill="#8A4A14" ' + ESC_INK + ' transform="rotate(-12 35 59)"/>' +
    '<rect x="8" y="54" width="54" height="10" rx="3" fill="#A0591C" ' + ESC_INK + ' transform="rotate(12 35 59)"/>' +
    '</svg>';

  var FOGATA_CHARLAS = [
    [[R, "¿ya viste qué hora es?"], [J, "hora de fogata"], [R, "cuéntame una de miedo"], [J, "había una vez un muro que nadie rompía…"], [R, "¡aaah!"], [J, "y luego llegó alguien con un martillo"]],
    [[J, "a esta hora la página está más tranquila"], [R, "casi no hay cursores"], [J, "¿será que ya todos duermen?"], [R, "menos el que nos está viendo"], [J, "ve a dormir, eh"]],
    [[R, "¿tú crees que las estrellas son píxeles?"], [J, "todo es píxeles"], [R, "entonces somos primas de las estrellas"], [J, "qué bonito lo dijiste"]]
  ];

  function iniciarFogata() {
    var H = window.innerHeight, d = ancho < 640 ? 48 : 62;
    var x = clamp((J.x + R.x + R.w) / 2 - d / 2, J.w + 30, ancho - d - R.w - 40);
    var glow = objFijo("", 260, 260);
    glow.style.background = "radial-gradient(circle, rgba(255,160,60,.35) 0%, rgba(255,107,107,.12) 40%, transparent 70%)";
    glow.style.zIndex = 67;
    var el = objFijo(FOGATA_SVG, d, d);
    var e = { tipo: "fogata", fase: "prende", t: 0, x: x, d: d, el: el, glow: glow, chispas: [], sigChispa: 0,
              llamas: el.querySelector(".llamas"), charla: pick(FOGATA_CHARLAS), linea: 0, sigLinea: 0.8, vida: 0 };
    poner(el, x, H - d); poner(glow, x + d / 2 - 130, H - d / 2 - 150);
    decir(J, "¿prendemos una fogata?", 1400);
    return e;
  }
  function pasoFogata(e, dt, t) {
    var H = window.innerHeight;
    e.t += dt;
    // la lumbre nace, vive y se apaga
    if (e.fase === "prende") e.vida = Math.min(1, e.vida + dt / 1.2);
    if (e.fase === "apaga") e.vida = Math.max(0, e.vida - dt / 1.5);
    var f = 0.85 + Math.sin(t * 17) * 0.06 + Math.sin(t * 7.3) * 0.08;
    e.llamas.style.transform = "scale(" + (e.vida * (0.95 + Math.sin(t * 11) * 0.05)).toFixed(3) + "," + (e.vida * f).toFixed(3) + ")";
    e.glow.style.opacity = (e.vida * (0.8 + Math.sin(t * 9) * 0.2)).toFixed(2);
    // chispas
    e.sigChispa -= dt;
    if (e.vida > 0.3 && e.sigChispa <= 0) {
      var c = document.createElement("div");
      c.className = "obj-vida";
      c.style.cssText = "position:fixed;left:0;top:0;width:4px;height:4px;background:#FFD23F;z-index:69;pointer-events:none";
      document.body.appendChild(c);
      e.chispas.push({ el: c, x: e.x + e.d / 2 + rnd(-8, 8), y: H - e.d * 0.8, v: rnd(40, 90), t: 0, s: rnd(0, 6) });
      e.sigChispa = rnd(0.12, 0.35);
    }
    for (var i = e.chispas.length - 1; i >= 0; i--) {
      var s = e.chispas[i]; s.t += dt;
      s.y -= s.v * dt; s.x += Math.sin(s.t * 5 + s.s) * 0.6;
      poner(s.el, s.x, s.y);
      s.el.style.opacity = Math.max(0, 1 - s.t / 1.4);
      if (s.t > 1.4) { s.el.remove(); e.chispas.splice(i, 1); }
    }
    var jOk = jirafaVaA(e.x - J.w * 0.95, dt);
    var rOk = ranaVaA(e.x + e.d + 10, H, null);
    if (jOk) J.dir = 1;
    if (rOk && R.modo !== "aire") R.dir = -1;
    if (e.fase === "prende" && e.t > 1.5 && jOk && rOk) { e.fase = "platica"; e.t = 0; }
    if (e.fase === "prende" && e.t > 15) { e.fase = "platica"; e.t = 0; }
    if (e.fase === "platica" && correrCharla(e, dt, 2.6)) {
      e.fase = "apaga"; e.t = 0;
      decir(R, "ya me dio sueño", 1400);
      setTimeout(function () { decir(J, "buenas noches, fueguito", 1400); }, 700);
    }
    if (e.fase === "apaga" && e.t > 2.2) terminarEscena();
  }

  /* ---- leer una tarjeta juntas ---- */

  function extracto(el) {
    var txt = (el.innerText || "").replace(/\s+/g, " ").trim();
    if (!txt) return null;
    return txt.length > 34 ? txt.slice(0, 33).trim() + "…" : txt;
  }
  function iniciarLeer() {
    var H = window.innerHeight, cand = [];
    document.querySelectorAll(".arena-block, .substack-post, .bcard, .evento").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > 160 && r.top < H - 90 && r.width > 90 && r.left > 0 && r.right < ancho && extracto(el)) cand.push(el);
    });
    if (!cand.length) return null;
    var el = pick(cand);
    var cita = extracto(el);
    var e = { tipo: "leer", fase: "van", t: 0, tarjeta: el,
      charla: pick([
        [[R, "¡a ver, a ver!"], [R, "aquí dice: «" + cita + "»"], [J, "profundo"], [R, "o no entendí"], [J, "yo tampoco"]],
        [[J, "¿qué dice ahí arriba?"], [R, "«" + cita + "»"], [J, "¿y eso qué significa?"], [R, "que hay que leer más"], [J, "ay, no"]],
        [[R, "esta me gusta"], [J, "¿por?"], [R, "«" + cita + "»"], [J, "ok, sí está buena"]]
      ]), linea: 0, sigLinea: 0.4 };
    decir(R, pick(["¡mira esto!", "ven, lee conmigo"]), 1300);
    return e;
  }
  function pasoLeer(e, dt) {
    var H = window.innerHeight;
    e.t += dt;
    var r = e.tarjeta.getBoundingClientRect();
    // si scrollearon y la tarjeta se fue, se acaba la lectura
    if (r.top < 60 || r.top > H - 40) { decir(J, "¿a dónde se fue?", 1200); terminarEscena(); return; }
    var sup = { el: e.tarjeta };
    var enTarjeta = R.sup && R.sup.el && (R.sup.el === e.tarjeta || (R.sup.el.contains(e.tarjeta) && Math.abs(borde(R.sup).top - r.top) < 6));
    if (!enTarjeta && R.modo !== "aire") {
      var tx = clamp(r.left + r.width * 0.5 - R.w / 2, r.left, r.right - R.w);
      ranaVaA(tx, r.top, sup);
    }
    // la jirafa se acerca por abajo y estira el cuello para mirar
    jirafaVaA(clamp(r.left + r.width * 0.5 - J.w * 0.85, 0, ancho - J.w - 150), dt);
    if (e.fase === "van" && (enTarjeta || e.t > 8)) { e.fase = "platica"; e.t = 0; }
    if (e.fase === "platica") {
      if (Math.random() < 0.015) sacudir(e.tarjeta, 1.5, rnd(-1, 1));
      if (correrCharla(e, dt, 2.3)) { e.fase = "fin"; e.t = 0; }
    }
    if (e.fase === "fin" && e.t > 1.2) terminarEscena();
  }

  /* ---- carrera de una orilla a otra ---- */

  function iniciarCarrera() {
    var e = { tipo: "carrera", fase: "salida", t: 0, cuenta: 0, meta: ancho - 20,
              velJ: rnd(250, 340), ganador: null };
    decir(R, pick(["¿echamos una carrera?", "¡a que te gano!"]), 1400);
    setTimeout(function () { decir(J, "va", 1000); }, 700);
    return e;
  }
  function pasoCarrera(e, dt) {
    var H = window.innerHeight;
    e.t += dt;
    if (e.fase === "salida") {
      var jOk = jirafaVaA(14, dt);
      var rOk = ranaVaA(14 + J.w + 12, H, null);
      if ((jOk && rOk && R.modo !== "aire") || e.t > 14) { J.dir = 1; R.dir = 1; e.fase = "cuenta"; e.t = 0; }
      return;
    }
    if (e.fase === "cuenta") {
      var pasos = ["3", "2", "1", "¡ya!"];
      var n = Math.floor(e.t / 0.8);
      if (n > e.cuenta - 1 && e.cuenta < pasos.length) { decir(J, pasos[e.cuenta], 700); decir(R, pasos[e.cuenta], 700); e.cuenta++; }
      if (e.t > 3.2) { e.fase = "corre"; e.t = 0; }
      return;
    }
    if (e.fase === "corre") {
      // la jirafa trota, la rana brinca lo más largo que puede
      J.dir = 1; J._camina = true;
      J.x += e.velJ * dt;
      if (R.modo !== "aire") saltarA(R, Math.min(R.x + rnd(150, 190), ancho - R.w), H, null);
      var llegoJ = J.x + J.w >= e.meta, llegoR = R.x + R.w >= e.meta - 2;
      if (llegoJ || llegoR) {
        J.x = Math.min(J.x, ancho - J.w - 2); J._camina = false;
        e.ganador = llegoJ ? J : R;
        var perdio = e.ganador === J ? R : J;
        decir(e.ganador, pick(["¡gané!", "¡primera!", "¡ja!"]), 1500);
        setTimeout(function () { decir(perdio, pick(["revancha", "hiciste trampa", "te dejé ganar"]), 1500); }, 800);
        e.fase = "fin"; e.t = 0;
      }
      return;
    }
    if (e.fase === "fin") {
      J.x = Math.min(J.x, ancho - J.w - 2);
      if (e.t > 2.4) terminarEscena();
    }
  }

  /* ---- siesta juntas ---- */

  function iniciarSiesta() {
    var e = { tipo: "siesta", fase: "junta", t: 0, sigZ: 0.5 };
    decir(J, pick(["ando cansada", "¿una siestita?"]), 1400);
    setTimeout(function () { decir(R, "me apunto", 1000); }, 700);
    return e;
  }
  function pasoSiesta(e, dt) {
    var H = window.innerHeight;
    e.t += dt;
    if (e.fase === "junta") {
      J._camina = false;
      var enLomo = R.sup && R.sup.bicho === J;
      if (!enLomo && R.modo !== "aire") {
        var lomo = borde({ bicho: J });
        if (Math.abs((R.x + R.w / 2) - (lomo.left + lomo.right) / 2) > 200) ranaVaA((lomo.left + lomo.right) / 2 - R.w / 2, H, null);
        else saltarA(R, (lomo.left + lomo.right) / 2 - R.w / 2, lomo.top, { bicho: J });
      }
      if (enLomo || e.t > 10) { e.fase = "duerme"; e.t = 0; J.siesta = true; R.siesta = true; }
      return;
    }
    if (e.fase === "duerme") {
      e.sigZ -= dt;
      if (e.sigZ <= 0) { echarZ(pick(bichos)); e.sigZ = 1.3; }
      // el cursor muy cerca las despierta
      var cerca = Math.hypot(M.x - (J.x + J.w / 2), M.y - (J.y + J.h / 2)) < 70 && performance.now() - M.t < 300;
      if (e.t > 14 || cerca) {
        J.siesta = false; R.siesta = false;
        e.fase = "despierta"; e.t = 0;
        if (cerca) decir(J, "¡¿qué?! ¿quién?", 1300);
        decir(R, "¡croac!", 1000);
        if (R.sup && R.sup.bicho === J) { R.modo = "aire"; R.sup = null; R.vy = -800; R.vx = rnd(-160, 160); }
        J.vsq -= 0.12;
      }
      return;
    }
    if (e.fase === "despierta" && e.t > 1.8) terminarEscena();
  }

  /* ---- control ---- */

  function iniciarEscena(tipo) {
    if (escena || dormidas || agarrado) return false;
    if (!tipo) {
      // de noche la fogata es la favorita; de día nunca aparece
      var bolsa = ["mesa", "mesa", "pelota", "pelota", "leer", "carrera", "siesta"];
      if (esDeNoche()) bolsa.push("fogata", "fogata", "fogata");
      tipo = pick(bolsa);
    }
    if (mosca) { mosca.el.remove(); mosca = null; }
    J.accion = null; J._camina = false;
    var hacer = { mesa: iniciarMesa, pelota: iniciarPelota, fogata: iniciarFogata, leer: iniciarLeer, carrera: iniciarCarrera, siesta: iniciarSiesta };
    escena = (hacer[tipo] || iniciarMesa)();
    if (!escena) escena = iniciarPelota();   // no hubo tarjeta a la vista para leer
    return true;
  }
  function terminarEscena(razon) {
    if (!escena) return;
    var e = escena;
    ["el", "tarro", "vaso", "glow"].forEach(function (k) { if (e[k]) e[k].remove(); });
    if (e.chispas) e.chispas.forEach(function (c) { c.el.remove(); });
    J.siesta = false; R.siesta = false;
    if (R.sup && R.sup.el === e.el) { R.modo = "aire"; R.sup = null; }
    escena = null;
    J._camina = false; J.accion = null; J.duracion = 0;
    R.decidir = rnd(0.5, 1.5);
    cacheT = 0;
    sigEscena = rnd(45, 90);
    if (razon === "agarre") {
      var otra = agarrado === J ? R : J;
      decir(otra, pick(["¡oye, estábamos platicando!", "¿a dónde te la llevas?", "¡regrésala!"]), 1500);
    }
  }
  function pasoEscenas(dt, now) {
    if (!escena) {
      if (dormidas || agarrado) return;
      sigEscena -= dt;
      var enPiso = J.piso && J.modo === "suelo" && R.modo !== "aire" && R.modo !== "agarrado";
      if (sigEscena <= 0) {
        if (enPiso) iniciarEscena();
        else sigEscena = 3;
      }
      return;
    }
    if (dormidas) { terminarEscena(); return; }
    if (agarrado && escena.tipo !== "pelota") { terminarEscena("agarre"); return; }
    var tt = now / 1000;
    switch (escena.tipo) {
      case "mesa": pasoMesa(escena, dt); break;
      case "pelota": pasoPelota(escena, dt, now); break;
      case "fogata": pasoFogata(escena, dt, tt); break;
      case "leer": pasoLeer(escena, dt); break;
      case "carrera": pasoCarrera(escena, dt); break;
      case "siesta": pasoSiesta(escena, dt); break;
    }
  }

  // para probar desde la consola: __vida.escena("mesa" | "pelota" | "fogata" | "leer" | "carrera" | "siesta")
  window.__vida = { escena: iniciarEscena, terminar: terminarEscena, estado: function () { return escena && (escena.tipo + ":" + (escena.fase || "")); },
    debug: function () {
      var r = function (n) { return Math.round(n); };
      var o = { J: [r(J.x), r(J.y), J.modo, J.dir], R: [r(R.x), r(R.y), R.modo, R.sup ? (R.sup.el ? R.sup.el.className : "bicho") : null] };
      if (escena && escena.el) { var b = escena.el.getBoundingClientRect(); o.obj = [r(b.left), r(b.top), r(b.width), r(b.height)]; }
      if (escena && escena.toques !== undefined) o.toques = escena.toques;
      return JSON.stringify(o);
    } };

  /* ---- loop ---- */

  var prev = performance.now(), sigHervor = 0;
  function tick(now) {
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    var t = now / 1000;
    ancho = window.innerWidth;

    // la línea hierve a saltitos (12 veces por segundo)
    sigHervor -= dt;
    if (sigHervor <= 0) { turb.setAttribute("seed", Math.floor(Math.random() * 60)); sigHervor = 1 / 8; }

    pasoVivos(dt * 1000, t);
    var sups = superficies(now);
    var cursorVivo = now - M.t < 3500;
    pasoEscenas(dt, now);

    /* ----- rana ----- */
    pasoFisica(R, dt, now);
    if (!escena && !dormidas && R.modo !== "agarrado" && R.modo !== "aire") {
      R.decidir -= dt;
      // la mosca manda: si hay mosca, la caza
      var presa = null;
      if (mosca) presa = { x: mosca.x, y: mosca.y, mosca: true };
      else if (cursorVivo) presa = { x: M.x, y: M.y };
      if (presa && R.lenguaT <= 0) {
        var bx = R.x + R.w / 2, by = R.y + R.h * 0.55;
        var dist = Math.hypot(presa.x - bx, presa.y - by);
        R.dir = presa.x >= bx ? 1 : -1;
        if (dist < 190 && (presa.mosca || Math.random() < 0.012)) { R.lenguaT = 1; R.lenguaObj = presa; }
        else if (presa.mosca && R.decidir <= 0 && dist > 190) {
          saltarA(R, clamp(presa.x - R.w / 2 + rnd(-40, 40), 0, ancho - R.w), R.sup ? borde(R.sup).top : window.innerHeight, R.sup);
          R.decidir = rnd(0.6, 1.2);
        }
      }
      // si no hay nada que cazar, a veces le lame un botón al pasar
      if (!presa && R.lenguaT <= 0 && Math.random() < 0.004) {
        var cerca = null;
        vivos.forEach(function (v) {
          if (!v.visible || v.tipo !== "mag") return;
          var r = v.el.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - R.x - R.w / 2, r.top + r.height / 2 - R.y);
          if (d < 200) cerca = { x: r.left + r.width / 2, y: r.top + r.height / 2, el: v.el };
        });
        if (cerca) { R.lenguaT = 1; R.lenguaObj = cerca; }
      }
      if (R.decidir <= 0 && R.lenguaT <= 0) { decidirRana(R, sups); R.decidir = rnd(1.5, 4.5); }
    }
    if (dormidas && R.modo !== "aire" && Math.abs(R.x - (R.metaX || 8)) > 4) R.x += ((R.metaX || 8) - R.x) * 0.04;

    // lengua
    if (R.lenguaT > 0) {
      R.lenguaT -= dt / 0.32;
      var k = Math.sin(Math.max(0, R.lenguaT) * Math.PI);
      var x0 = R.x + R.w / 2, y0 = R.y + R.h * 0.62;
      var obj = R.lenguaObj;
      var x1 = x0 + (obj.x - x0) * k, y1 = y0 + (obj.y - y0) * k;
      lenguaL.setAttribute("x1", x0); lenguaL.setAttribute("y1", y0);
      lenguaL.setAttribute("x2", x1); lenguaL.setAttribute("y2", y1);
      lenguaP.setAttribute("cx", x1); lenguaP.setAttribute("cy", y1);
      lenguaL.style.display = lenguaP.style.display = "";
      if (k > 0.95 && !obj.hecho) {
        obj.hecho = true;
        if (obj.mosca && mosca) { mosca.el.remove(); mosca = null; sigMosca = rnd(14, 26); decir(R, pick(["¡ñam!", "rica", "¡gracias!"]), 1100); R.animo = 1; }
        else if (obj.el) { sacudir(obj.el, 5, 3); }
        else decir(R, pick(["casi te atrapo", "¿eres mosca?", "croac"]), 1100);
      }
    } else { lenguaL.style.display = lenguaP.style.display = "none"; }

    // garganta que se infla
    var g = 1 + Math.sin(t * (dormidas ? 1.3 : 2.6)) * 0.13;
    R.garganta.setAttribute("transform", "translate(60 76) scale(" + g.toFixed(3) + " " + (g * 1.1).toFixed(3) + ") translate(-60 -76)");
    mirar(R, mosca ? { x: mosca.x, y: mosca.y } : (cursorVivo ? M : null));
    parpadear(R, dt);
    dibujar(R, t);

    /* ----- jirafa ----- */
    pasoFisica(J, dt, now);
    var camina = false;
    if (!escena && !dormidas && J.modo !== "agarrado" && J.modo !== "aire") {
      J.decidir -= dt;
      if (!J.accion || J.duracion <= 0) { decidirJirafa(J); }
      J.duracion -= dt;
      if (J.accion === "caminar") {
        var lim = J.sup ? borde(J.sup) : { left: 0, right: ancho - 150 };
        var nx = J.x + J.dir * J.vel * dt;
        var centro = nx + J.w / 2;
        if (centro < lim.left + 10 || centro > lim.right - 10) {
          if (J.sup && Math.random() < 0.3) { J.x = nx; }          // a veces se cae, por despistada
          else J.dir *= -1;
        } else {
          J.x = nx;
          camina = true;
          if (J.sup && J.sup.el && Math.random() < 0.02) sacudir(J.sup.el, 1.2, 0);   // pisa fuerte
        }
      }
      if (J.accion === "mordisquear" && J.sup && J.sup.el && Math.random() < 0.08) sacudir(J.sup.el, 1.5, rnd(-1.5, 1.5));
    }
    if (escena && J._camina) camina = true;
    if (dormidas && J.modo !== "aire" && Math.abs(J.x - J.metaX) > 4) { J.dir = J.metaX > J.x ? 1 : -1; J.x += (J.metaX - J.x) * 0.03; camina = true; }

    // patas: pasos alternados
    J.fase += dt * (camina ? 7 : 0);
    var paso = camina ? Math.sin(J.fase) * 14 : 0;
    var p = J.patas;
    p[0].setAttribute("transform", "rotate(" + (paso).toFixed(1) + " 32 90)");
    p[1].setAttribute("transform", "rotate(" + (-paso).toFixed(1) + " 42 90)");
    p[2].setAttribute("transform", "rotate(" + (-paso).toFixed(1) + " 66 90)");
    p[3].setAttribute("transform", "rotate(" + (paso).toFixed(1) + " 76 90)");
    // cuello: se balancea, se estira hacia el cursor, baja para mordisquear, cuelga dormido
    var cuelloRot = Math.sin(t * 0.9) * 3 + (camina ? Math.sin(J.fase * 2) * 2 : 0);
    if (J.accion === "mordisquear" && !dormidas) cuelloRot = 38 + Math.sin(t * 14) * 4;
    if (escena && escena.tipo === "mesa" && escena.fase !== "cae" && escena.fase !== "van") cuelloRot = 6 + Math.sin(t * 1.4) * 2;
    if (escena && escena.tipo === "leer" && escena.fase === "platica") cuelloRot = -12 + Math.sin(t * 1.1) * 2;
    if (J.siesta) cuelloRot = 50 + Math.sin(t * 1.2) * 2;
    if (dormidas) cuelloRot = 55;
    if (!dormidas && cursorVivo && J.accion !== "mordisquear") {
      var jr = J.el.getBoundingClientRect();
      var ddx = (M.x - (jr.left + jr.width * 0.75)) * J.dir;
      cuelloRot += clamp(ddx * 0.03, -10, 12);
    }
    J.cuello.setAttribute("transform", "rotate(" + cuelloRot.toFixed(2) + " 74 84)");
    J.cabeza.setAttribute("transform", "rotate(" + (Math.sin(t * 1.3) * 4 - (dormidas || J.siesta ? 20 : 0)).toFixed(2) + " 85 22)");
    J.cola.setAttribute("d", "M24 80 Q" + (10 + Math.sin(t * 3) * 5).toFixed(1) + " 86 " + (12 + Math.sin(t * 3 + 1) * 4).toFixed(1) + " 100");
    J.boca.setAttribute("d", J.animo > 0.2 ? "M91 28 Q97 34 103 27" : "M92 29 Q97 32 102 28");
    J.animo *= 0.97; R.animo *= 0.97;
    mirar(J, mosca ? { x: mosca.x, y: mosca.y } : (cursorVivo ? M : null));
    parpadear(J, dt);
    dibujar(J, t);

    /* ----- mosca ----- */
    if (!dormidas) {
      if (!mosca) { if (!escena) { sigMosca -= dt; if (sigMosca <= 0) soltarMosca(); } }
      else {
        mosca.t += dt;
        var ax = Math.sin(mosca.t * 1.7) * 220 + Math.sin(mosca.t * 5.3) * 90;
        var ay = Math.cos(mosca.t * 1.3) * 160 + Math.cos(mosca.t * 6.1) * 70;
        // huye un poquito del cursor
        var mdx = mosca.x - M.x, mdy = mosca.y - M.y, md = Math.hypot(mdx, mdy);
        if (md < 90) { ax += mdx / md * 900; ay += mdy / md * 900; }
        // y baja poco a poco hacia la rana, para que el cuento termine
        ax += (R.x + R.w / 2 - mosca.x) * 0.6; ay += (R.y - 90 - mosca.y) * 0.6;
        mosca.vx = (mosca.vx + ax * dt) * 0.96; mosca.vy = (mosca.vy + ay * dt) * 0.96;
        mosca.x += mosca.vx * dt; mosca.y += mosca.vy * dt;
        mosca.y = clamp(mosca.y, 60, window.innerHeight - 20);
        mosca.el.style.transform = "translate(" + mosca.x.toFixed(1) + "px," + mosca.y.toFixed(1) + "px)";
        var alas = mosca.el.querySelectorAll(".ala");
        alas[0].setAttribute("ry", 1 + Math.abs(Math.sin(t * 60)) * 1.5);
        alas[1].setAttribute("ry", 1 + Math.abs(Math.cos(t * 60)) * 1.5);
      }
    } else if (mosca) { mosca.el.remove(); mosca = null; }

    /* ----- zetas ----- */
    if (dormidas) { sigZ -= dt; if (sigZ <= 0) { echarZ(pick(bichos)); sigZ = 1.4; } }
    for (var i = zetas.length - 1; i >= 0; i--) {
      var z = zetas[i]; z.v += dt;
      z.y -= 22 * dt; z.x += Math.sin(z.v * 3) * 0.4;
      z.el.style.transform = "translate(" + z.x + "px," + z.y + "px) scale(" + (0.7 + z.v * 0.4) + ")";
      z.el.style.opacity = Math.max(0, 1 - z.v / 2.2);
      if (z.v > 2.2) { z.el.remove(); zetas.splice(i, 1); }
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", function () {
    ancho = window.innerWidth;
    bichos.forEach(function (b) { b.x = clamp(b.x, 0, ancho - b.w); if (!b.sup) b.modo = "aire"; });
  });

  if (reduce) {
    // sin movimiento: quedan dormidas, quietas, pero presentes
    bichos.forEach(function (b) { b.y = window.innerHeight - b.h; parpadear(b, 0); dibujar(b, 0); });
    J.cuello.setAttribute("transform", "rotate(55 74 84)");
    btn.style.display = "none";
  } else {
    requestAnimationFrame(tick);
  }
})();
