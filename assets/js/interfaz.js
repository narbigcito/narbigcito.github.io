const cursor = document.getElementById('cursor');
const laser = document.getElementById('laserCursor');
const isTouchDevice = window.matchMedia('(hover: none)').matches;


const navColors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];
const pills = document.querySelectorAll('.nav-pill');
pills.forEach((pill, i) => {
  const baseColor = navColors[i % navColors.length];
  
  pill.style.borderColor = baseColor.replace('var(', '').replace(')', '') ? baseColor : baseColor;

  pill.addEventListener('mouseenter', () => {
    const color = navColors[Math.floor(Math.random() * navColors.length)];
    pill.style.color = color;
    pill.style.borderColor = color;
    
    const r = (Math.random() * 14 - 7).toFixed(1);
    const tx = (Math.random() * 10 - 5).toFixed(1);
    const ty = (Math.random() * 8 - 4).toFixed(1);
    pill.style.transform = `rotate(${r}deg) translate(${tx}px, ${ty}px)`;
  });

  pill.addEventListener('mouseleave', () => {
    pill.style.color = '';
    pill.style.borderColor = 'rgba(255,255,255,0.08)';
    pill.style.transform = '';
  });
});
if (!isTouchDevice) {
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    laser.style.left = e.clientX + 'px';
    laser.style.top = e.clientY + 'px';
  });
  document.querySelectorAll('a,button,.bcard,.conv-thumb,.app-card,.milk-btn').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('big'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
  });
}


const bcardLaser = document.getElementById('bcard-laser');
if (!isTouchDevice) {
  bcardLaser.addEventListener('mouseenter', () => {
    laser.classList.add('on');
    cursor.style.opacity = '0';
  });
  bcardLaser.addEventListener('mouseleave', () => {
    laser.classList.remove('on');
    cursor.style.opacity = '1';
  });
}


const bgColors = ['#0a0a0a','#0a0809','#09080e','#070a09','#0a0908','#08090e'];
let lastBg = 0;
window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  const idx = Math.min(Math.floor(pct * bgColors.length), bgColors.length - 1);
  if (idx !== lastBg) { document.documentElement.style.background = bgColors[idx]; lastBg = idx; }
});


const logoSecret = document.getElementById('logoSecret');
let logoTimer;
document.getElementById('logoBtn').addEventListener('click', () => {
  logoSecret.style.display = 'block';
  clearTimeout(logoTimer);
  logoTimer = setTimeout(() => logoSecret.style.display = 'none', 3000);
});
