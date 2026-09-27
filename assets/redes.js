/*
  redes.js — las redes sociales flotan y se van encogiendo.

  Hasta arriba están grandes, en fila, con su nombre. Mientras bajas se
  hacen chicas, se mudan a la orilla derecha como un cardumen (cada una
  con un poco de retraso) y pierden el texto. Cerca del final, cuando ya
  se ve la sección "¿Somos cómplices?", desaparecen: ahí abajo ya están
  los links de siempre.

  El movimiento no sigue al scroll en seco: cada ficha persigue su
  posición con un resorte, así que se sienten con peso.
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INK = "#141414";

  var REDES = [
    { n: "instagram", url: "https://www.instagram.com/elnarbigcito/", bg: "#FF6B9D", fg: INK,
      svg: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="17.3" cy="6.7" r="1.4" fill="currentColor"/>' },
    { n: "substack", url: "https://narbigcito.substack.com", bg: "#FF6719", fg: INK,
      svg: '<path d="M4 4h16M4 7.5h16" stroke="currentColor" stroke-width="2.4"/><path d="M4 11h16v10l-8-4.5L4 21z" fill="currentColor"/>' },
    { n: "github", url: "https://github.com/narbigcito", bg: "#FFFDF5", fg: INK,
      svg: '<path d="M5 9.5V3.5l4 3q3-1 6 0l4-3v6q2 3 0 6.5Q17 20 12 20t-7-4Q3 12.5 5 9.5z" fill="currentColor"/><circle cx="9.3" cy="12.5" r="1.3" fill="#FFFDF5"/><circle cx="14.7" cy="12.5" r="1.3" fill="#FFFDF5"/>' },
    { n: "linkedin", url: "https://www.linkedin.com/in/gibr%C3%A1n-alexis-moreno-zu%C3%B1iga/", bg: "#4F8EF7", fg: "#fff",
      svg: '<rect x="4" y="9" width="3.6" height="11" fill="currentColor"/><circle cx="5.8" cy="5.3" r="2.1" fill="currentColor"/><path d="M10.5 9h3.4v1.6q1.3-2 3.8-2 3.3 0 3.3 4.2V20h-3.6v-6.3q0-2-1.6-2-2 0-2 2.3V20h-3.3z" fill="currentColor"/>' },
    { n: "are.na", url: "https://www.are.na/el-narbigcito/", bg: "#B8A9FA", fg: INK,
      svg: '<path d="M7 5v14M2 9.5l10 5M2 14.5l10-5M17 5v14M12 9.5l10 5M12 14.5l10-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' }
  ];

  var css = [
    "#redes-vivas{position:fixed;left:0;top:0;width:0;height:0;z-index:60;pointer-events:none}",
    ".red{position:fixed;left:0;top:0;display:flex;align-items:center;gap:10px;text-decoration:none;",
    "border:3px solid " + INK + ";box-shadow:4px 4px 0 " + INK + ";pointer-events:auto;cursor:pointer;",
    "font:700 15px 'Space Grotesk',sans-serif;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;",
    "transform-origin:0 0;will-change:transform,opacity;transition:box-shadow .1s}",
    ".red svg{flex:none;width:24px;height:24px}",
    ".red .red-n{transition:opacity .2s}",
    ".red:hover{box-shadow:6px 6px 0 " + INK + "}",
    ".red:active{box-shadow:0 0 0 " + INK + "}",
    "@media print{#redes-vivas{display:none}}"
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var cont = document.createElement("nav");
  cont.id = "redes-vivas";
  cont.setAttribute("aria-label", "redes sociales");
  document.body.appendChild(cont);

  var fichas = REDES.map(function (r, i) {
    var a = document.createElement("a");
    a.className = "red";
    a.href = r.url; a.target = "_blank"; a.rel = "noreferrer";
    a.setAttribute("aria-label", r.n);
    a.style.background = r.bg; a.style.color = r.fg;
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + r.svg + '</svg><span class="red-n">' + r.n + '</span>';
    cont.appendChild(a);
    return { el: a, nombre: a.querySelector(".red-n"), i: i, x: 0, y: 0, s: 1, vx: 0, vy: 0, vs: 0, o: 1,
             incl: (Math.random() - 0.5) * 5, fase: Math.random() * 6.28, w: 0 };
  });
  // el ancho natural de cada ficha grande (con nombre), para acomodarlas en fila
  function medirAnchos() {
    fichas.forEach(function (f) { f.el.style.transform = "none"; f.w = f.el.offsetWidth; });
  }
  medirAnchos();
  document.fonts && document.fonts.ready.then(medirAnchos);

  var conectarVisible = false;
  var conectar = document.getElementById("conectar");
  if (conectar) {
    new IntersectionObserver(function (e) { conectarVisible = e[0].isIntersecting; }, { rootMargin: "0px 0px -15% 0px" })
      .observe(conectar);
  }

  function lerp(a, b, k) { return a + (b - a) * k; }
  function suave(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }

  // Dónde va cada ficha según qué tan abajo vas (p de 0 a 1).
  function destino(f, p) {
    var W = window.innerWidth, H = window.innerHeight, movil = W < 700;
    var n = fichas.length;
    // cada una se muda con un poquito de retraso: parece cardumen
    // la posición cambia pronto (entre 4% y 26% del recorrido); el tamaño baja poco a poco hasta 60%
    var k = suave((p - 0.04 - f.i * 0.012) / 0.22);
    var ks = suave(p / 0.6);
    // arriba: fila grande abajo a la izquierda (en celular, fila centrada abajo)
    var gap = 12, total = 0;
    fichas.forEach(function (o) { total += (movil ? 48 : o.w) + gap; });
    var x0, y0, s0 = 1;
    if (movil) {
      s0 = 1; var ini = (W - total + gap) / 2, acc = 0;
      for (var j = 0; j < f.i; j++) acc += 48 + gap;
      x0 = ini + acc; y0 = H - 72;
    } else {
      var acc2 = 0;
      for (var q = 0; q < f.i; q++) acc2 += fichas[q].w + gap;
      x0 = 28 + acc2; y0 = H - 84;
    }
    // abajo: columna chiquita en la orilla derecha, a media altura
    var s1 = movil ? 0.58 : 0.66, alto = 50 * (movil ? 0.8 : 0.9) + 8;
    var x1 = W - 50 * s1 - 12;
    var y1 = H * 0.5 - (n * alto) / 2 + f.i * alto;
    // a medio camino dan una curvita hacia arriba, como quien brinca
    var arco = Math.sin(k * Math.PI) * -60;
    var sMedia = movil ? 0.8 : 0.9;   // tamaño al llegar a la orilla; de ahí sigue encogiéndose
    var s = k < 1 ? lerp(s0, sMedia, k) : sMedia;
    s = Math.min(s, lerp(s0, s1, ks) + (1 - k) * 0.2);
    return { x: lerp(x0, x1, k), y: lerp(y0, y1, k) + arco, s: s, k: k };
  }

  var prev = performance.now();
  function tick(now) {
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    var t = now / 1000;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = window.scrollY / max;
    // se desvanecen entre 70% y 85% del recorrido, o en cuanto aparece "conectar"
    var oMeta = conectarVisible ? 0 : (1 - suave((p - 0.7) / 0.15)) * (1 - suave(p / 0.6) * 0.25);
    fichas.forEach(function (f) {
      var d = destino(f, p);
      if (reduce) { f.x = d.x; f.y = d.y; f.s = d.s; }
      else {
        var kk = Math.min(2, dt * 60);
        f.vx = (f.vx + (d.x - f.x) * 0.09 * kk) * Math.pow(0.78, kk);
        f.vy = (f.vy + (d.y - f.y) * 0.09 * kk) * Math.pow(0.78, kk);
        f.vs = (f.vs + (d.s - f.s) * 0.12 * kk) * Math.pow(0.75, kk);
        f.x += f.vx * kk; f.y += f.vy * kk; f.s += f.vs * kk;
      }
      f.o += (oMeta - f.o) * Math.min(1, dt * 6);
      // flotan: cada una se mece a su ritmo
      var bob = reduce ? 0 : Math.sin(t * 1.6 + f.fase) * 3;
      var rot = f.incl * (1 - d.k) + (reduce ? 0 : Math.sin(t * 1.1 + f.fase) * 1.2);
      f.el.style.transform = "translate(" + f.x.toFixed(1) + "px," + (f.y + bob).toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg) scale(" + f.s.toFixed(3) + ")";
      f.el.style.opacity = f.o.toFixed(3);
      f.el.style.pointerEvents = f.o < 0.2 ? "none" : "auto";
      f.el.tabIndex = f.o < 0.2 ? -1 : 0;
      // grande: con nombre; chica: solo el ícono
      var conNombre = d.k < 0.5 && window.innerWidth >= 700;
      f.nombre.style.opacity = conNombre ? 1 : 0;
      f.el.style.padding = conNombre ? "10px 16px 10px 12px" : "10px";
      f.el.style.width = conNombre ? f.w + "px" : "50px";
      f.el.style.height = "50px";
    });
    requestAnimationFrame(tick);
  }
  // medir con nombre antes de empezar
  fichas.forEach(function (f) { f.el.style.padding = "10px 16px 10px 12px"; f.el.style.height = "50px"; });
  medirAnchos();
  var d0 = window.scrollY;
  fichas.forEach(function (f) { var d = destino(f, 0); f.x = d.x; f.y = d.y + 40; f.s = d.s; });
  requestAnimationFrame(tick);
})();
