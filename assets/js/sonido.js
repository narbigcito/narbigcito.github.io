/*
  sonido.js — ruiditos sintetizados con Web Audio.

  No hay archivos de audio: cada sonido se arma al momento con osciladores
  y ruido filtrado, así que no pesa nada ni tarda en cargar. El navegador
  solo deja sonar audio después de que la persona toca la página, y eso
  está bien: todos estos sonidos responden a algo que ella hizo.

  Uso desde otros scripts: window.__sonido.tocar("golpe").
  Se puede apagar con el botón "sonido"; la preferencia se guarda.
*/
(function () {
  "use strict";
  var LS = "narbigcito-sonido";
  var activo = true;
  try { activo = localStorage.getItem(LS) !== "no"; } catch (e) {}

  var ctx = null, maestro = null, ruidoBuf = null;
  function arrancar() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    maestro = ctx.createGain();
    maestro.gain.value = 0.7;
    // un compresor evita que varios sonidos juntos truenen
    var comp = ctx.createDynamicsCompressor();
    maestro.connect(comp); comp.connect(ctx.destination);
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = ruidoBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  window.addEventListener("pointerdown", arrancar, { passive: true });
  window.addEventListener("keydown", arrancar);

  function listo() { return activo && ctx && ctx.state === "running"; }

  // Un tono con caída exponencial; `a` es la frecuencia final si se desliza.
  function tono(f, dur, tipo, vol, a, retraso) {
    var t = ctx.currentTime + (retraso || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo || "sine";
    o.frequency.setValueAtTime(f, t);
    if (a) o.frequency.exponentialRampToValueAtTime(a, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(maestro);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // Ruido filtrado: golpes, crujidos, derrumbes.
  function ruido(dur, vol, filtro, frec, frecFin, retraso) {
    var t = ctx.currentTime + (retraso || 0);
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruidoBuf;
    f.type = filtro || "lowpass";
    f.frequency.setValueAtTime(frec || 1000, t);
    if (frecFin) f.frequency.exponentialRampToValueAtTime(frecFin, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(maestro);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function r(a, b) { return a + Math.random() * (b - a); }

  var SONIDOS = {
    golpe: function (n) {
      // más grave y más crujiente mientras más golpes lleva el muro
      var k = Math.min(1, (n || 1) / 17);
      tono(95 - k * 30, 0.2, "sine", 0.55, 40);
      ruido(0.14, 0.35, "lowpass", 900 + k * 1400);
      if (k > 0.2) ruido(0.08, 0.12 + k * 0.15, "highpass", 2500, null, 0.03);
    },
    ladrillo: function () { tono(r(160, 260), 0.09, "triangle", 0.12, 80, r(0.2, 0.5)); },
    derrumbe: function () {
      ruido(1.4, 0.55, "lowpass", 1600, 120);
      for (var i = 0; i < 6; i++) tono(r(60, 120), 0.25, "sine", 0.35, 35, i * r(0.08, 0.16));
    },
    boing: function () { tono(r(200, 240), 0.16, "sine", 0.1, r(480, 560)); },
    croac: function () {
      tono(170, 0.08, "square", 0.05, 110);
      tono(150, 0.1, "square", 0.05, 95, 0.1);
    },
    // voz tipo "bla bla" al hablar; cada criatura tiene su tono
    voz: function (quien, texto) {
      var base = quien === "jirafa" ? 440 : 250;
      var n = Math.max(1, Math.min(5, Math.round((texto || "").length / 7)));
      for (var i = 0; i < n; i++) tono(base * r(0.85, 1.25), 0.055, "triangle", 0.05, null, i * 0.075);
    },
    // Una gota en el agua: lo que se oye es la burbujita que se forma debajo,
    // un tono que SUBE muy rápido (no que baja), más un chapoteo corto y a veces
    // una o dos gotitas que rebotan después.
    plop: function () {
      var f0 = r(420, 560);
      tono(f0, 0.07, "sine", 0.16, f0 * r(2.6, 3.4));
      ruido(0.09, 0.07, "bandpass", r(1800, 2600), 700);
      if (Math.random() < 0.7) { var f1 = r(700, 950); tono(f1, 0.05, "sine", 0.06, f1 * 2.8, r(0.09, 0.16)); }
      if (Math.random() < 0.4) { var f2 = r(1000, 1300); tono(f2, 0.04, "sine", 0.035, f2 * 2.5, r(0.2, 0.3)); }
    },
    pelota: function () { tono(r(170, 210), 0.08, "sine", 0.16, 90); },
    clink: function () { tono(2300, 0.45, "sine", 0.06); tono(3170, 0.35, "sine", 0.04); },
    ñam: function () { tono(320, 0.1, "sine", 0.1, 130); },
    bote: function () {
      [410, 1130, 1790, 2600].forEach(function (f, i) { tono(f, 0.55 - i * 0.1, "sine", 0.08 / (i + 1)); });
      ruido(0.1, 0.15, "bandpass", 3000);
    },
    tapa: function () { tono(900, 0.05, "square", 0.04, 600); },
    romper: function () {
      ruido(0.3, 0.35, "lowpass", 2200, 300);
      tono(r(70, 110), 0.2, "sine", 0.35, 40);
      ruido(0.06, 0.12, "highpass", 3500, null, 0.02);
    },
    reparar: function () {
      for (var i = 0; i < 3; i++) { tono(880, 0.05, "square", 0.05, 700, i * 0.16); ruido(0.04, 0.12, "highpass", 2500, null, i * 0.16); }
      tono(1320, 0.5, "sine", 0.07, null, 0.55); tono(1760, 0.4, "sine", 0.04, null, 0.6);
    },
    mesa: function () { tono(110, 0.18, "sine", 0.3, 55); ruido(0.08, 0.15, "lowpass", 700); },
    dormir: function () { tono(520, 0.5, "sine", 0.05, 260); tono(390, 0.6, "sine", 0.04, 200, 0.25); },
    despertar: function () { tono(300, 0.25, "sine", 0.05, 620); }
  };

  var ultimo = {};
  function tocar(nombre) {
    if (!listo() || !SONIDOS[nombre]) return;
    // no más de un mismo sonido cada 40 ms (evita metralletas)
    var ahora = performance.now();
    if (ultimo[nombre] && ahora - ultimo[nombre] < 40) return;
    ultimo[nombre] = ahora;
    try { SONIDOS[nombre].apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) {}
  }

  // clic en el agua (fuera de botones y links): una gota
  window.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest("a, button, input, textarea, .wall, .bicho, .bcard, .app-card, .conv-thumb")) return;
    setTimeout(function () { tocar("plop"); }, 10);
  }, { passive: true });

  // botón para apagarlo
  var st = document.createElement("style");
  st.textContent =
    "#vida-sonido{position:fixed;right:12px;top:100px;z-index:80;font:11px 'Syne Mono',monospace;letter-spacing:.04em;" +
    "background:#141414;color:#FFFDF5;border:2px solid #FFFDF5;padding:5px 10px;cursor:pointer;opacity:.75;box-shadow:3px 3px 0 #FFFDF5}" +
    "#vida-sonido:hover{opacity:1}" +
    "@media (max-width:700px){#vida-sonido{top:9px;right:62px;z-index:210;font-size:10px;padding:5px 8px;box-shadow:2px 2px 0 #FFFDF5}}" +
    "@media print{#vida-sonido{display:none}}";
  document.head.appendChild(st);
  var btn = document.createElement("button");
  btn.id = "vida-sonido"; btn.type = "button";
  var chico = window.matchMedia("(max-width: 700px)");
  function pintar() { btn.textContent = chico.matches ? (activo ? "♪ sí" : "♪ no") : (activo ? "sonido: sí" : "sonido: no"); btn.setAttribute("aria-pressed", activo ? "true" : "false"); }
  pintar();
  btn.addEventListener("click", function () {
    activo = !activo;
    try { localStorage.setItem(LS, activo ? "si" : "no"); } catch (e) {}
    pintar();
    arrancar();
    if (activo) setTimeout(function () { tocar("despertar"); }, 30);
  });
  document.body.appendChild(btn);

  window.__sonido = { tocar: tocar, activo: function () { return activo; } };
})();
