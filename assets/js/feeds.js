(function initEventos() {
  const list = document.getElementById('eventosList');
  if (!list) return;


  const EVENTOS = [
    { fecha: '2026-08-08', nombre: 'Festival del Fracaso — concierto, bazar, talleres y tomatazos', tipo: 'festival', lugar: 'Tochcalli · Durango 1-B, Flores Magón, Cuernavaca, Morelos', link: 'https://www.instagram.com/p/DajDOdFywiL/' },
  ];

  const MES = {
    es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
    en: ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],
  };

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = (s === null || s === undefined) ? '' : String(s);
    return d.innerHTML;
  }

  function render() {
    list.innerHTML = '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const curYear = today.getFullYear();
    const mes = MES[currentLang] || MES.es;

    const items = EVENTOS.map(ev => {
      const parts = ev.fecha.split('-').map(Number);
      return Object.assign({}, ev, { dateObj: new Date(parts[0], parts[1] - 1, parts[2]), y: parts[0], m: parts[1], d: parts[2] });
    }).sort((a, b) => a.dateObj - b.dateObj);

    items.forEach(ev => {
      const diffDays = Math.round((ev.dateObj - today) / 86400000);
      const past = diffDays < 0;
      const soon = diffDays >= 0 && diffDays <= 7;

      const hasLink = !!ev.link;
      const row = document.createElement(hasLink ? 'a' : 'div');
      row.className = 'evento' + (past ? ' pasado' : '') + (hasLink ? ' evento-link' : '');
      if (hasLink) { row.href = ev.link; row.target = '_blank'; row.rel = 'noreferrer'; }

      const yrTag = (ev.y !== curYear) ? '<span class="evento-fecha-yr">' + ev.y + '</span>' : '';
      const tipoLabel = T('evento_tipo_' + ev.tipo);
      let badge = '';
      if (past) badge = '<span class="evento-badge pasado">' + esc(T('evento_badge_pasado')) + '</span>';
      else if (soon) badge = '<span class="evento-badge soon">' + esc(T('evento_badge_soon')) + '</span>';

      row.innerHTML =
        '<div class="evento-fecha">' + ev.d + ' ' + mes[ev.m - 1] + yrTag + '</div>' +
        '<div class="evento-main">' +
          '<div class="evento-nombre">' + esc(ev.nombre) + '</div>' +
          '<div class="evento-meta"><span class="evento-tipo">' + esc(tipoLabel) + '</span> · ' + esc(ev.lugar) + '</div>' +
          (hasLink ? '<div class="evento-flyer">' + esc(T('evento_flyer')) + '</div>' : '') +
        '</div>' +
        badge;
      list.appendChild(row);
    });
  }

  render();
  // let the language switcher re-render (month names, type labels, badges)
  window.__renderEventos = render;
})();

(function initArena() {
  const grid = document.getElementById('arenaGrid');
  const section = document.getElementById('arena');
  if (!grid || !section) return;

  const USER = 'el-narbigcito';
  const CACHE_KEY = 'narbig_arena_v1';
  const API = 'https://api.are.na/v3/users/' + USER + '/contents?per=24';
  const MAX_BLOCKS = 8;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = (s === null || s === undefined) ? '' : String(s);
    return d.innerHTML;
  }

  function imgUrl(img) {
    if (!img || typeof img !== 'object') return null;
    return (img.large && img.large.src)
      || (img.display && img.display.src)
      || (img.medium && img.medium.src)
      || (img.square && img.square.src)
      || img.src || null;
  }

  function kindLabel(type) {
    const es = { Image: 'imagen', Link: 'link', Text: 'texto', Media: 'media', Attachment: 'archivo' };
    const en = { Image: 'image', Link: 'link', Text: 'text', Media: 'media', Attachment: 'file' };
    const map = (currentLang === 'en') ? en : es;
    return map[type] || String(type || '').toLowerCase();
  }

  function render(blocks) {
    if (!Array.isArray(blocks)) return false;
    const usable = blocks.filter(b => b && b.type && b.type !== 'Channel');
    if (!usable.length) return false;

    const frag = document.createDocumentFragment();
    usable.slice(0, MAX_BLOCKS).forEach(b => {
      const href = (b.source && b.source.url) ? b.source.url : 'https://www.are.na/block/' + b.id;
      const a = document.createElement('a');
      a.className = 'arena-block';
      a.href = href;
      a.target = '_blank';
      a.rel = 'noreferrer';

      const img = imgUrl(b.image);
      let inner = '';
      if (img) {
        inner += '<img class="arena-block-img" loading="lazy" alt="' + esc(b.title || 'are.na') + '" src="' + esc(img) + '">';
      }
      inner += '<div class="arena-block-body"><div class="arena-block-kind">' + esc(kindLabel(b.type)) + '</div>';
      if (b.type === 'Text') {
        const txt = (b.content && (b.content.plain || b.content.markdown)) || b.title || '';
        inner += '<div class="arena-block-text">' + esc(txt) + '</div>';
      } else {
        const title = b.title || b.generated_title || (b.source && b.source.url) || '';
        if (title && !img) inner += '<div class="arena-block-title">' + esc(title) + '</div>';
      }
      inner += '</div>';
      a.innerHTML = inner;
      frag.appendChild(a);
    });

    grid.appendChild(frag);
    section.style.display = '';

    if (!isTouchDevice) {
      grid.querySelectorAll('.arena-block').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('big'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
      });
    }
    return true;
  }

  // one call per session: serve from cache if present
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data && data.length && render(data)) return;
    }
  } catch (e) { /* ignore */ }

  fetch(API)
    .then(r => r.ok ? r.json() : Promise.reject(new Error('arena ' + r.status)))
    .then(j => {
      const blocks = (j && j.data) || [];
      if (!blocks.length) return;
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(blocks)); } catch (e) { /* quota */ }
      render(blocks);
    })
    .catch(() => {
      // la API falló o limitó: usar la copia que el cron de la Pi deja en el repo
      fetch('assets/feeds/arena.json')
        .then(r => r.ok ? r.json() : [])
        .then(render)
        .catch(() => { /* sin copia: la sección se queda oculta */ });
    });
})();

(function initSubstack() {
  const wrap = document.getElementById('substackWrap');
  const section = document.getElementById('substack');
  if (!wrap || !section) return;
  let posts = [];

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = (s === null || s === undefined) ? '' : String(s);
    return d.innerHTML;
  }
  function fecha(iso, corta) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const loc = currentLang === 'en' ? 'en-US' : 'es-MX';
    return d.toLocaleDateString(loc, corta ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function minutos(p) { return Math.max(1, Math.round((p.words || 0) / 220)); }

  function render() {
    if (!posts.length) return;
    const [primero, ...resto] = posts;
    let html = '<a class="substack-post substack-hero" href="' + esc(primero.url) + '" target="_blank" rel="noreferrer">';
    if (primero.image) html += '<img class="substack-img" loading="lazy" alt="" src="' + esc(primero.image) + '">';
    html += '<div class="substack-body"><span class="substack-kicker">' + esc(T('substack_new')) + '</span>' +
      '<h3>' + esc(primero.title) + '</h3>' +
      (primero.subtitle ? '<p class="substack-sub">' + esc(primero.subtitle) + '</p>' : '') +
      '<div class="substack-meta">' + esc(fecha(primero.date)) + ' · ' + minutos(primero) + ' ' + esc(T('substack_min')) + '</div></div></a>';
    html += '<div class="substack-list">';
    resto.slice(0, 4).forEach(p => {
      html += '<a class="substack-post" href="' + esc(p.url) + '" target="_blank" rel="noreferrer">' +
        '<div class="substack-date">' + esc(fecha(p.date, true)) + '<br>' + new Date(p.date).getFullYear() + '</div>' +
        '<div><h4>' + esc(p.title) + '</h4>' + (p.subtitle ? '<p class="substack-sub">' + esc(p.subtitle) + '</p>' : '') + '</div></a>';
    });
    html += '</div>';
    wrap.innerHTML = html;
    section.style.display = '';
    if (!isTouchDevice) {
      wrap.querySelectorAll('.substack-post').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('big'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
      });
    }
  }
  window.__renderSubstack = render;

  // Substack no deja leer su feed desde otro dominio (CORS), así que un cron
  // en la Pi lo copia a assets/feeds/substack.json varias veces al día.
  fetch('assets/feeds/substack.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : [])
    .then(j => {
      posts = (Array.isArray(j) ? j : []).filter(p => p && p.title && p.url);
      window.__substackPosts = posts;
      render();
    })
    .catch(() => {});
})();
