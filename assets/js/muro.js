const MAX_HITS = 17;
const wall = document.getElementById('wall');
const wallText = document.getElementById('wallText');
const wallHits = document.getElementById('wallHits');
const wallPopup = document.getElementById('wallPopup');
const wallReopen = document.getElementById('wallReopen');
const cracks = [
  document.getElementById('crack1'),
  document.getElementById('crack2'),
  document.getElementById('crack3'),
  document.getElementById('crack4'),
  document.getElementById('crack5'),
];
let hits = 0;

/* Muro de ladrillos reales: cada golpe tumba los ladrillos más cercanos
   a donde pegaste, y detrás se asoma el nombre. */
const wallBg = wall.querySelector('.wall-bg');
const TONOS = ['#B9502A', '#A8431F', '#C65D33', '#9E3D1C', '#B34A25', '#C96A3E'];
let ultimoGolpe = null;
function construirMuro() {
  if (!wallBg) return;
  wallBg.innerHTML = '';
  const w = wall.clientWidth || 800, h = wall.clientHeight || 340;
  const n = Math.max(4, Math.round(w / 112)), filas = Math.max(5, Math.round(h / 46));
  wallBg.style.setProperty('--cols', n * 2);
  wallBg.style.gridTemplateRows = 'repeat(' + filas + ', 1fr)';
  for (let f = 0; f < filas; f++) {
    const piezas = f % 2 ? [1].concat(Array(n - 1).fill(2), [1]) : Array(n).fill(2);
    piezas.forEach(sp => {
      const b = document.createElement('span');
      b.className = 'ladrillo';
      b.style.gridColumn = 'span ' + sp;
      b.style.setProperty('--lc', Math.random() < 0.035 ? 'var(--c1)' : TONOS[Math.floor(Math.random() * TONOS.length)]);
      wallBg.appendChild(b);
    });
  }
}
wall.addEventListener('pointerdown', e => {
  const r = wall.getBoundingClientRect();
  ultimoGolpe = { x: e.clientX - r.left, y: e.clientY - r.top };
});
function tumbarLadrillos() {
  if (!wallBg) return;
  const todos = wallBg.children.length;
  const enPie = Array.from(wallBg.querySelectorAll('.ladrillo:not(.caido)'));
  if (!enPie.length) return;
  const meta = hits >= MAX_HITS ? todos : Math.round(todos * 0.5 * hits / MAX_HITS);
  const cuantos = Math.max(1, meta - (todos - enPie.length));
  const wr = wall.getBoundingClientRect();
  const g = ultimoGolpe || { x: wr.width * (0.2 + Math.random() * 0.6), y: wr.height * 0.5 };
  ultimoGolpe = null;
  const dist = el => {
    const r = el.getBoundingClientRect();
    return Math.hypot(r.left - wr.left + r.width / 2 - g.x, r.top - wr.top + r.height / 2 - g.y) + Math.random() * 30;
  };
  enPie.map(el => [dist(el), el]).sort((a, b) => a[0] - b[0]).slice(0, cuantos).forEach(([, b], i) => {
    b.classList.add('caido');
    const dx = (Math.random() - 0.5) * 180, rot = (Math.random() - 0.5) * 160;
    b.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + (dx * 0.3) + 'px,-16px) rotate(' + (rot * 0.2) + 'deg)', opacity: 1, offset: 0.18 },
      { transform: 'translate(' + dx + 'px,' + (wr.height + 140) + 'px) rotate(' + rot + 'deg)', opacity: 0 }
    ], { duration: 850 + Math.random() * 350, delay: Math.min(i, 30) * 22, easing: 'cubic-bezier(.45,0,.85,.4)', fill: 'forwards' });
  });
  wallText.classList.toggle('rasgado', hits >= 11);
}
construirMuro();
let muroResize = null;
window.addEventListener('resize', () => {
  clearTimeout(muroResize);
  muroResize = setTimeout(() => { if (hits === 0) construirMuro(); }, 200);
});

if (!isTouchDevice) {
  wall.addEventListener('mouseenter', () => { cursor.classList.add('hammer'); });
  wall.addEventListener('mouseleave', () => { cursor.classList.remove('hammer'); });
}

function updateCracks() {
  
  const currentCrack = Math.min(Math.floor((hits - 1) * 5 / MAX_HITS), 4);
  for (let i = 0; i <= currentCrack; i++) {
    const crackStart = Math.floor(i * MAX_HITS / 5);
    const crackEnd = Math.floor((i + 1) * MAX_HITS / 5);
    const t = Math.min((hits - crackStart) / Math.max(crackEnd - crackStart, 1), 1);
    const op = Math.min(0.3 + t * 0.7, 1);
    const sw = 1.5 + t * 2.5;
    cracks[i].style.stroke = `rgba(255,60,172,${op})`;
    cracks[i].style.strokeWidth = sw.toString();
  }
}


function handleWallHit() {
  if (hits >= MAX_HITS) return;
  hits++;

  
  wall.classList.add('shaking');
  setTimeout(() => wall.classList.remove('shaking'), 140);

  updateCracks();
  tumbarLadrillos();
  if (window.__sonido) {
    window.__sonido.tocar('golpe', hits);
    if (hits > 3) window.__sonido.tocar('ladrillo');
    if (hits === MAX_HITS) window.__sonido.tocar('derrumbe');
  }

  
  const pCount = 4 + Math.floor(hits * 0.8);
  for (let i = 0; i < pCount; i++) {
    const p = document.createElement('div');
    p.className = 'wall-particle';
    p.style.left = (15 + Math.random() * 70) + '%';
    p.style.top = (10 + Math.random() * 80) + '%';
    p.style.setProperty('--tx', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--ty', (Math.random() * 160 + 20) + 'px');
    p.style.setProperty('--tr', (Math.random() * 720 - 360) + 'deg');
    wall.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }

  
  wallHits.textContent = hits < MAX_HITS ? T('hit_msgs')[hits - 1] : '';

  
  if (hits === MAX_HITS) {
    wallText.textContent = 'crack';
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'wall-particle';
      p.style.left = (Math.random() * 100) + '%';
      p.style.top = (Math.random() * 100) + '%';
      p.style.width = (6 + Math.random() * 18) + 'px';
      p.style.height = (4 + Math.random() * 12) + 'px';
      p.style.setProperty('--tx', (Math.random() * 360 - 180) + 'px');
      p.style.setProperty('--ty', (Math.random() * 280 + 60) + 'px');
      p.style.setProperty('--tr', (Math.random() * 1080 - 540) + 'deg');
      wall.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
    setTimeout(() => {
      wall.style.display = 'none';
      cursor.classList.remove('hammer');
      wallReopen.style.display = 'inline-block';
      wallPopup.classList.add('show');
    }, 600);
  }
}

wall.addEventListener('click', handleWallHit);
wall.addEventListener('touchend', (e) => { e.preventDefault(); handleWallHit(); }, {passive: false});


document.getElementById('popupClose').addEventListener('click', () => wallPopup.classList.remove('show'));
wallPopup.addEventListener('click', e => { if (e.target === wallPopup) wallPopup.classList.remove('show'); });


wallReopen.addEventListener('click', () => {
  hits = 0;
  cracks.forEach(c => { c.style.stroke = 'rgba(255,60,172,0)'; c.style.strokeWidth = '2'; });
  wallHits.textContent = '';
  wallText.innerHTML = T('wall_text');
  wall.style.display = 'flex';
  wallReopen.style.display = 'none';
  wallText.classList.remove('rasgado');
  construirMuro();
  
  wall.querySelectorAll('.wall-particle').forEach(p => p.remove());
});


const reactions = {
  0: ['🔥 todo.','💥 sí, literal todo.','🌍 el mundo entero.'],
  1: ['💚 juntos.','🤝 red o nada.','🌐 exacto.'],
  2: ['⚡ estructura.','🧩 no es la gente.','💣 el sistema.'],
  3: ['🌀 desarmando.','📡 señal recibida.','🔐 lenguaje libre.'],
  4: ['🪐 girando.','🐛 metamorfosis.','⏳ un día a la vez.']
};
let counterVal = Math.floor(Math.random() * 400) + 200;
document.getElementById('counter').textContent = counterVal;

document.querySelectorAll('.bcard').forEach(card => {
  card.addEventListener('click', () => {
    const idx = parseInt(card.dataset.idx);
    const pool = reactions[idx] || ['✓'];
    const msg = pool[Math.floor(Math.random() * pool.length)];
    const el = card.querySelector('.bcard-reaction');
    el.textContent = msg;
    card.classList.add('reacted');
    if (idx === 1) { counterVal++; document.getElementById('counter').textContent = counterVal; }
    setTimeout(() => card.classList.remove('reacted'), 1100);
  });
});
