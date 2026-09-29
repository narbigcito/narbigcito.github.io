(function initLetras() {
  const canvas = document.getElementById('letrasCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cs = getComputedStyle(document.documentElement);
  const colors = ['--c1','--c2','--c3','--c4','--c5','--c6']
    .map(v => cs.getPropertyValue(v).trim())
    .filter(Boolean);


  const fragments = [
    'creo en cambiar el mundo entero',
    'no podemos solos',
    'el lenguaje no es inocente',
    'nunca hay que dejar de regar la flor',
    'cada palabra es una decisión política',
    'aquí tengo jícama picada',
    'caos con propósito',
    'reparador de almas',
    'narbigcito was here',
    '=^._.^= ∫',
    '42',
    'const T = key => TRANSLATIONS[lang][key]',
    'requestAnimationFrame(render)',
    'gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)',
    'vec3 hsv2rgb(vec3 c)',
    'for (int i = 0; i < 8; i++)',
    'float fbm(vec2 p)',
    '<html lang="es">',
    'if (hits >= MAX_HITS) return;',
    'MAGI online',
    'melchor · gaspar · baltazar',
  ];

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, particles = [], raf = null, running = false;

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function makeParticles() {
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const count = isMobile ? 18 : 36;
    particles = [];
    for (let i = 0; i < count; i++) {
      const txt = fragments[Math.floor(Math.random() * fragments.length)];
      const size = 11 + Math.random() * 8;
      ctx.font = size + "px 'Syne Mono', monospace";
      const w = ctx.measureText(txt).width;
      particles.push({
        txt, size, w,
        x: Math.random() * Math.max(1, W - w),
        y: Math.random() * Math.max(1, H - size),
        vx: (Math.random() * 2 - 1) * 0.4 || 0.2,
        vy: (Math.random() * 2 - 1) * 0.4 || 0.2,
        color: colors[Math.floor(Math.random() * colors.length)] || '#fff',
        alpha: 0.35 + Math.random() * 0.5,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    for (const p of particles) {
      ctx.font = p.size + "px 'Syne Mono', monospace";
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillText(p.txt, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function step() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x <= 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      else if (p.x + p.w >= W) { p.x = W - p.w; p.vx = -Math.abs(p.vx); }
      if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      else if (p.y + p.size >= H) { p.y = H - p.size; p.vy = -Math.abs(p.vy); }
    }
    draw();
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  resize();
  makeParticles();
  draw();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); makeParticles(); draw(); }, 150);
  });


  if (reduced) return;


  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? start() : stop());
    }, { threshold: 0.01 });
    io.observe(canvas);
  } else {
    start();
  }
})();
