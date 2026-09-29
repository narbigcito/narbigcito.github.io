const milkBtn = document.getElementById('milkBtn');
const milkAfter = document.getElementById('milkAfter');
const milkLabel = document.getElementById('milkLabel');
let milkFallen = false;

function resetMilk() {
  milkFallen = false;
  milkBtn.classList.remove('fall');
  milkBtn.style.display = 'inline-block';
  milkBtn.style.opacity = '1';
  milkBtn.style.transform = '';
  milkAfter.style.display = 'none';
  milkLabel.style.display = 'inline-block';
}

milkBtn.addEventListener('click', () => {
  if (milkFallen) return;
  milkFallen = true;
  milkBtn.classList.add('fall');
  milkLabel.style.display = 'none';
  setTimeout(() => {
    milkBtn.style.display = 'none';
    milkAfter.style.display = 'inline-block';
  }, 600);
});

milkAfter.addEventListener('click', () => {
  setTimeout(resetMilk, 100);
});


const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let seqIdx = 0;
let konamiCount = 0;
document.addEventListener('keydown', e => {
  if (e.key === seq[seqIdx]) {
    seqIdx++;
    if (seqIdx === seq.length) {
      seqIdx = 0;
      konamiCount++;
      if (konamiCount === 1) document.getElementById('konamiBar').classList.add('show');
      else if (konamiCount >= 2) activateKonami2();
    }
  } else { seqIdx = 0; }
});

function activateKonami2() {
  const k2 = document.getElementById('konami2');
  k2.classList.add('show');
  const matrixEl = document.getElementById('k2matrix');
  const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01';
  let mi_interval = setInterval(() => {
    let s = '';
    for (let i = 0; i < 500; i++) s += chars[Math.floor(Math.random() * chars.length)] + (Math.random() > 0.92 ? '\n' : '');
    matrixEl.textContent = s;
  }, 90);
  const msgEl = document.getElementById('k2msg');
  let mi = 0;
  msgEl.textContent = T('konami2_msgs')[0];
  let msg_interval = setInterval(() => { mi = (mi + 1) % T('konami2_msgs').length; msgEl.textContent = T('konami2_msgs')[mi]; }, 1800);
  document.getElementById('k2close').addEventListener('click', () => {
    k2.classList.remove('show');
    clearInterval(mi_interval);
    clearInterval(msg_interval);
  }, { once: true });
}


let footerClicks = 0;
document.getElementById('footer').addEventListener('click', () => {
  footerClicks++;
  if (footerClicks === 5) {
    document.body.style.filter = 'hue-rotate(180deg)';
    setTimeout(() => { document.body.style.filter = ''; footerClicks = 0; }, 1800);
  }
});
