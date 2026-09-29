function openModal(id) {
  document.getElementById(id).classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
  document.body.style.overflow = '';
  if (id === 'modalMagi') stopMagi();
  if (id === 'modalWhelle') stopWhelle();
}
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.proj-modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal.id);
  });
});



document.getElementById('cardLogos').addEventListener('click', () => {
  const body = document.getElementById('logosBody');
  body.innerHTML = '';
  T('logos_text').forEach((t, i) => {
    const p = document.createElement('p');
    p.textContent = t;
    if (i === 3) p.className = 'logos-warn';
    if (i === T('logos_text').length - 1) p.className = 'logos-small';
    body.appendChild(p);
  });
  openModal('modalLogos');
});


let magiInterval = null;
const magiChars = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';
let magiLi = 0;

document.getElementById('cardMagi').addEventListener('click', () => {
  openModal('modalMagi');
  const rain = document.getElementById('magiRain');
  const line = document.getElementById('magiLine');
  magiLi = 0;
  line.textContent = T('magi_lines')[0];
  const magiSize = isTouchDevice ? 300 : 800;
  magiInterval = setInterval(() => {
    let s = '';
    for (let i = 0; i < magiSize; i++) {
      s += magiChars[Math.floor(Math.random() * magiChars.length)];
      if (Math.random() > 0.94) s += '\n';
    }
    rain.textContent = s;
    magiLi = (magiLi + 1) % T('magi_lines').length;
    line.textContent = T('magi_lines')[magiLi];
  }, 100);
});

function stopMagi() {
  if (magiInterval) { clearInterval(magiInterval); magiInterval = null; }
}


let whelleAnimFrame = null;

function stopWhelle() {
  if (whelleAnimFrame) { cancelAnimationFrame(whelleAnimFrame); whelleAnimFrame = null; }
}

document.getElementById('cardWhelle').addEventListener('click', () => {
  openModal('modalWhelle');
  renderWhelleCharts();
});

function randData(n, min, max) {
  return Array.from({length: n}, () => Math.floor(Math.random() * (max - min) + min));
}

function renderWhelleCharts() {
  const grid = document.getElementById('whelleGrid');
  grid.innerHTML = '';

  const wc = T('whelle_charts');
  const charts = [
    { title: wc[0], color: 'var(--c6)', data: randData(12, 2, 9) },
    { title: wc[1], color: 'var(--c2)', data: randData(12, 4, 9) },
    { title: wc[2], color: 'var(--c3)', data: randData(12, 1, 10) },
    { title: wc[3], color: 'var(--c1)', data: randData(12, 20, 95) },
  ];

  charts.forEach((ch, ci) => {
    const wrap = document.createElement('div');
    wrap.className = 'whelle-chart';

    const title = document.createElement('div');
    title.className = 'whelle-chart-title';
    title.style.color = ch.color;
    title.textContent = ch.title;
    wrap.appendChild(title);

    if (ci % 2 === 0) {
      
      const bars = document.createElement('div');
      bars.className = 'whelle-bars';
      const max = Math.max(...ch.data);
      ch.data.forEach((v, i) => {
        const bar = document.createElement('div');
        bar.className = 'whelle-bar';
        bar.style.background = ch.color;
        bar.style.height = '0%';
        bar.title = `S${i+1}: ${v}`;
        bars.appendChild(bar);
        setTimeout(() => { bar.style.transition = 'height .6s ease'; bar.style.height = (v / max * 100) + '%'; }, 80 + i * 40);
      });
      wrap.appendChild(bars);
    } else {
      
      const svgWrap = document.createElement('div');
      svgWrap.className = 'whelle-line-wrap';
      const W = 280, H = 80;
      const max = Math.max(...ch.data), min2 = Math.min(...ch.data);
      const pts = ch.data.map((v, i) => {
        const x = (i / (ch.data.length - 1)) * W;
        const y = H - ((v - min2) / (max - min2 + 0.001)) * (H - 8) - 4;
        return `${x},${y}`;
      }).join(' ');
      svgWrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="whelle-svg">
        <polyline points="${pts}" fill="none" stroke="${ch.color}" stroke-width="2" opacity="0.8"/>
        ${ch.data.map((v, i) => {
          const x = (i / (ch.data.length - 1)) * W;
          const y = H - ((v - min2) / (max - min2 + 0.001)) * (H - 8) - 4;
          return `<circle cx="${x}" cy="${y}" r="3" fill="${ch.color}" opacity="0.9"><title>S${i+1}: ${v}</title></circle>`;
        }).join('')}
      </svg>`;
      wrap.appendChild(svgWrap);
    }
    grid.appendChild(wrap);
  });
}


const ranaEssay = [
  { type: 'verse', text: 'Ayer se comieron mi pan.\n\nTodos pidieron de esos panes aburridos\nque ni siquiera sé cómo se llaman.\n\nYo no.\nYo compré un beso.' },
  { type: 'verse', text: '¿Puedo ser honesto con ustedes? Me gustaría confesarles algo — de niño besé al beso.\nNo lo disfruté.\nMis labios se llenaron de azúcar\ny no me gusta tener azúcar en los labios,\npor poético que pueda sonar.' },
  { type: 'verse', text: 'Pero el punto es que algún hijo de la verga se lo tragó.\nSe comieron mi pan.\nY ahora yo tendré que comerme el de alguien más,\ny ese alguien se comerá el de otro,\ny el otro el de otro,\ny así empieza una cadena de venganzas\nde las que ya nadie lleva la cuenta.' },
  { type: 'p', text: 'Porque así funcionan las deudas.' },
  { type: 'p', text: 'Yo debo dinero desde hace mucho tiempo. Las deudas te destruyen la vida. He pagado más de diez veces el monto original y no puedo terminar porque dejé de pagar por los intereses, y dejar de pagar incrementó los intereses, y los intereses generaron más intereses, y los intereses no paran, como con el pan.' },
  { type: 'verse', text: 'Pero hay deudas que no son de dinero.\nHay deudas de emociones.\nHay deudas de acciones.\n\nMe mentiste, entonces tengo derecho a mentirte.\nMe fuiste infiel, entonces tengo derecho a serte infiel.\nMe robaste, yo te robo.\nMe insultaste, yo te insulto.\nTe comiste mi beso, me como el tuyo.' },
  { type: 'verse', text: 'En la tumba de la abuela\nuno pone flores\ny el otro va y las quita por rencor.\n\nEn un divorcio\nuna parte está tan ocupada cobrándole a la otra\nque usa a sus propios hijos como arma.\nY después esos hijos cobran a los padres\nabandonándolos en la vejez.' },
  { type: 'verse', text: 'Imagínate que de pronto un cabrón te arroja al mundo\ny pum,\ncaes en una casa en Ecatepec,\nen una familia de bajos recursos.\nNo sabes qué pedo.\nVas creciendo.\nTe vas dando cuenta de que vales verga.\nAprendes a vergazos cómo se arregla un carro.\n\nY aún ni estás existiendo\ny ya apareces con una deuda hacia la sociedad\nporque te hicieron el favor de dejarte estar aquí.' },
  { type: 'verse', text: 'A huevo ya tienen a quién mandar por las tortillas,\na quién poner a hacer tareas no remuneradas,\na quién reclamarle por todo lo malo que pasa,\ncon quién desquitar la ira.\n\nY tú aún ni alcanzas el coso ese para abrir el refri.' },
  { type: 'p', text: 'Muchas de mis navidades de niño consistieron en ver la televisión mientras mi mamá lloraba en su cuarto.' },
  { type: 'verse', text: 'Pero tengo amigos.\nCasi ninguno tiene un hogar de origen al que pueda volver.\nLa mayoría ha tenido que huir de su familia,\nha tenido que ocultarse.\n\nEntre nosotros nos hemos dado lo que pudimos.\nHemos sido la familia que escogimos.\nPorque aquí el cariño no está condicionado.\nNo tenemos que ganárnoslo.' },
  { type: 'p', text: 'La vergüenza es el enemigo: pensar que solo merecemos acercarnos al otro cuando estamos bien, cuando tenemos dinero, cuando tenemos tiempo. Esa es una de las armas más poderosas del capitalismo: usar la vergüenza para evitar que estemos cerca.' },
  { type: 'verse', text: 'Y aun así.\nAun así.\nNi siquiera puedo dejar de comer Cheetos esta semana.' },
  { type: 'verse', text: 'Tal vez debemos aceptar que no podemos solos.\nQue necesitamos a otro monstruo\nque nos señale como los monstruos que somos,\npero que lo haga con empatía.\n\nQue nos diga:\nwey, dijiste que no ibas a comprar Cheetos\ny acabas de comprar Cheetos.\nMira, aquí tengo jícama picada.\nSi te los quieres comer, está bien,\nno te juzgaré,\npero creo en ti,\ny creo que puedes hoy escoger algo mejor para ti.' },
  { type: 'verse', text: 'Casi todos nos sentimos solos,\nhay que hacernos compañía,\nnos quedan muchas luchas.\n\nNunca hay que dejar de regar la flor.' },
];

document.getElementById('cardRana').addEventListener('click', () => {
  const body = document.getElementById('ranaBody');
  body.innerHTML = '';
  ranaEssay.forEach(block => {
    const el = document.createElement(block.type === 'verse' ? 'div' : 'p');
    if (block.type === 'verse') {
      el.className = 'rana-verse';
      el.innerHTML = block.text.replace(/\n/g, '<br>').replace(/Cheetos/g, '<span class="rana-cheeto">Cheetos</span>').replace(/jícama picada/g, '<span class="rana-jicama">jícama picada</span>');
    } else {
      el.innerHTML = block.text.replace(/Cheetos/g, '<span class="rana-cheeto">Cheetos</span>');
    }
    body.appendChild(el);
  });
  openModal('modalRana');
});

closeBtn.addEventListener('click', () => {
  viewer.classList.remove('open');
  document.querySelectorAll('.conv-thumb').forEach(b => b.classList.remove('active'));
});
