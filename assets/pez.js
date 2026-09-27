/*
  pez.js — un koi nada detrás de todo.

  No habla ni obedece a nadie. Deambula con un "wander" de Reynolds
  (el rumbo cambia poco a poco, como si tuviera ganas propias), a veces
  acelera, y cada coletazo suelta una onda en el agua del fondo
  (window.__agua.onda, definida en index.html).

  El cuerpo es una cadena de puntos: la cabeza jala y cada segmento
  sigue al anterior a distancia fija. Eso basta para que el cuerpo
  ondule solo al girar. Encima se suma una ondulación lateral que
  crece hacia la cola, que es como nadan los peces de verdad.
*/
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var INK = "#141414";
  var cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none";
  document.body.appendChild(cv);
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  medir();
  window.addEventListener("resize", medir);

  // tamaño: "medio grande", proporcional a la pantalla
  var escala = Math.max(0.65, Math.min(1.25, W / 1100));
  var N = 14, SEG = 12 * escala, ANCHO = 24 * escala;
  var PERFIL = [0.62, 0.9, 1, 1, 0.95, 0.86, 0.75, 0.63, 0.5, 0.39, 0.29, 0.21, 0.15, 0.11];
  var MANCHAS = [[2, 0.2, 0.55], [4, -0.35, 0.45], [6, 0.3, 0.4], [8, -0.1, 0.35]]; // segmento, lado, radio

  var pez = {
    x: W * 0.3, y: H * 0.6, rumbo: Math.random() * 6.28, vel: 55, velMeta: 55,
    giro: 0, fase: 0, sigAcelera: 4 + Math.random() * 6, sigOnda: 0, susto: 0
  };
  var puntos = [];
  for (var i = 0; i < N; i++) puntos.push({ x: pez.x - Math.cos(pez.rumbo) * SEG * i, y: pez.y - Math.sin(pez.rumbo) * SEG * i });

  function onda(x, y, f) { if (window.__agua) window.__agua.onda(x, y, f); }

  // un clic cerca lo asusta: sale disparado en dirección contraria
  window.addEventListener("pointerdown", function (e) {
    var dx = pez.x - e.clientX, dy = pez.y - e.clientY, d = Math.hypot(dx, dy);
    if (d < 260) {
      pez.rumbo = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;
      pez.vel = 320; pez.velMeta = 60; pez.susto = 1;
    }
  }, { passive: true });

  function angDif(a, b) { var d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }

  function paso(dt, t) {
    // deambular: el giro deseado cambia despacio y al azar
    pez.giro += (Math.random() - 0.5) * 2.4 * dt;
    pez.giro *= Math.pow(0.4, dt);
    var giro = pez.giro;
    // lejos de las orillas: gira hacia el centro con más ganas mientras más cerca esté
    var m = 140, cx = W / 2, cy = H / 2;
    if (pez.x < m || pez.x > W - m || pez.y < m || pez.y > H - m) {
      var haciaCentro = Math.atan2(cy - pez.y, cx - pez.x);
      giro += angDif(haciaCentro, pez.rumbo) * 1.6;
    }
    pez.rumbo += giro * dt * 1.8;

    // de vez en cuando se le antoja acelerar
    pez.sigAcelera -= dt;
    if (pez.sigAcelera <= 0) {
      pez.velMeta = Math.random() < 0.35 ? 150 + Math.random() * 60 : 40 + Math.random() * 30;
      pez.sigAcelera = 3 + Math.random() * 7;
    }
    pez.vel += (pez.velMeta - pez.vel) * Math.min(1, dt * (pez.vel > pez.velMeta ? 1.2 : 0.8));
    pez.susto *= Math.pow(0.3, dt);

    pez.x += Math.cos(pez.rumbo) * pez.vel * escala * dt;
    pez.y += Math.sin(pez.rumbo) * pez.vel * escala * dt;
    // el coletazo va más rápido cuando nada rápido
    pez.fase += dt * (3 + pez.vel * 0.05);

    // cadena: cada punto sigue al anterior
    puntos[0].x = pez.x; puntos[0].y = pez.y;
    for (var i = 1; i < N; i++) {
      var a = puntos[i - 1], b = puntos[i];
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      b.x = a.x + dx / d * SEG; b.y = a.y + dy / d * SEG;
    }

    // ondas: más seguido y más fuertes cuando acelera
    pez.sigOnda -= dt;
    if (pez.sigOnda <= 0) {
      var cola = puntos[N - 3];
      onda(cola.x, cola.y, 0.16 + Math.min(0.35, pez.vel / 600) + pez.susto * 0.3);
      pez.sigOnda = Math.max(0.18, 0.9 - pez.vel / 300);
    }
  }

  // contorno del cuerpo con ondulación lateral creciente hacia la cola
  function contorno(t) {
    var izq = [], der = [];
    for (var i = 0; i < N; i++) {
      var a = puntos[Math.max(0, i - 1)], b = puntos[Math.min(N - 1, i + 1)];
      var ang = Math.atan2(b.y - a.y, b.x - a.x);
      var nx = -Math.sin(ang), ny = Math.cos(ang);
      var ond = Math.sin(pez.fase - i * 0.55) * (i / N) * (i / N) * 9 * escala;
      var px = puntos[i].x + nx * ond, py = puntos[i].y + ny * ond;
      var w = PERFIL[i] * ANCHO;
      izq.push([px + nx * w, py + ny * w, nx, ny, px, py]);
      der.push([px - nx * w, py - ny * w, nx, ny, px, py]);
    }
    return { izq: izq, der: der };
  }

  function curva(pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    var u = pts[pts.length - 1];
    ctx.lineTo(u[0], u[1]);
  }

  function aleta(base, largo, anchoA, angulo, color) {
    ctx.save();
    ctx.translate(base[0], base[1]);
    ctx.rotate(angulo);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(largo * 0.5, -anchoA, largo, -anchoA * 0.2);
    ctx.quadraticCurveTo(largo * 0.6, anchoA * 0.4, 0, 0);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }

  function dibujar(t) {
    ctx.clearRect(0, 0, W, H);
    var c = contorno(t);
    var cab = puntos[0], cuello = puntos[1];
    var angCab = Math.atan2(cab.y - cuello.y, cab.x - cuello.x);

    // sombra en el fondo del estanque
    ctx.save();
    ctx.translate(22 * escala, 34 * escala);
    ctx.globalAlpha = 0.28;
    ctx.beginPath(); curva(c.izq); curva(c.der.slice().reverse()); ctx.closePath();
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 0.93;
    // aletas pectorales (salen del segmento 3 y remolinean)
    var p3i = c.izq[3], p3d = c.der[3];
    var remo = Math.sin(t * 5) * 0.35;
    aleta(p3i, 22 * escala, 10 * escala, angCab + Math.PI * 0.75 + remo, "#FFB199");
    aleta(p3d, 22 * escala, -10 * escala, angCab - Math.PI * 0.75 - remo, "#FFB199");

    // cola: dos lóbulos que siguen al último segmento
    var u = puntos[N - 1], pu = puntos[N - 2];
    var angCola = Math.atan2(u.y - pu.y, u.x - pu.x) + Math.sin(pez.fase - N * 0.55) * 0.5;
    ctx.save();
    ctx.translate(u.x, u.y); ctx.rotate(angCola);
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(18 * escala, -6 * escala, 34 * escala, -20 * escala);
    ctx.quadraticCurveTo(24 * escala, 0, 34 * escala, 20 * escala);
    ctx.quadraticCurveTo(18 * escala, 6 * escala, -4, 0);
    ctx.fillStyle = "#FF8A65"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();

    // cuerpo
    ctx.beginPath(); curva(c.izq); curva(c.der.slice().reverse()); ctx.closePath();
    ctx.fillStyle = "#FF6B4A"; ctx.fill();
    // manchas crema de koi
    ctx.save(); ctx.clip();
    MANCHAS.forEach(function (mm) {
      var q = c.izq[mm[0]], w = PERFIL[mm[0]] * ANCHO;
      ctx.beginPath();
      ctx.ellipse(q[4] + q[2] * w * mm[1], q[5] + q[3] * w * mm[1], w * mm[2] * 1.4, w * mm[2], angCab, 0, 6.2832);
      ctx.fillStyle = "#FFF3E0"; ctx.fill();
    });
    ctx.restore();
    ctx.beginPath(); curva(c.izq); curva(c.der.slice().reverse()); ctx.closePath();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();

    // aleta dorsal: una línea sobre el lomo que se mece
    ctx.beginPath();
    for (var i = 2; i < 9; i++) {
      var q2 = c.izq[i], ww = Math.sin(pez.fase * 0.5 + i) * 2;
      var x = q2[4] + q2[2] * ww, y = q2[5] + q2[3] * ww;
      if (i === 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 3.5 * escala; ctx.strokeStyle = "#C8402A"; ctx.stroke();

    // ojos
    [c.izq[0], c.der[0]].forEach(function (q) {
      var ex = q[4] + (q[0] - q[4]) * 0.55 + Math.cos(angCab) * 4 * escala;
      var ey = q[5] + (q[1] - q[5]) * 0.55 + Math.sin(angCab) * 4 * escala;
      ctx.beginPath(); ctx.arc(ex, ey, 3.6 * escala, 0, 6.2832);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(ex + Math.cos(angCab) * 1.2, ey + Math.sin(angCab) * 1.2, 1.8 * escala, 0, 6.2832);
      ctx.fillStyle = INK; ctx.fill();
    });
    // bigotes de koi
    ctx.lineWidth = 1.5; ctx.strokeStyle = INK;
    [1, -1].forEach(function (lado) {
      var bx = cab.x + Math.cos(angCab) * ANCHO * 0.55, by = cab.y + Math.sin(angCab) * ANCHO * 0.55;
      var ang = angCab + lado * (0.9 + Math.sin(t * 3 + lado) * 0.15);
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.cos(ang) * 8 * escala, by + Math.sin(ang) * 8 * escala,
        bx + Math.cos(ang + lado * 0.6) * 13 * escala, by + Math.sin(ang + lado * 0.6) * 13 * escala);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  var prev = performance.now();
  function tick(now) {
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (!document.hidden) { paso(dt, now / 1000); dibujar(now / 1000); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.__pez = { estado: function () { return { x: Math.round(pez.x), y: Math.round(pez.y), vel: Math.round(pez.vel) }; } };
})();
