/**
 * Pruebas del registro anónimo de narbigcito.com. Sin dependencias:
 *
 *   node --test --experimental-test-coverage --test-coverage-include='assets/js/registro/clasifica.js' \
 *     --test-coverage-include='assets/js/registro/eventos.js' --test-coverage-lines=100 \
 *     --test-coverage-branches=100 --test-coverage-functions=100 pruebas/registro.test.js
 *
 * El DOM es de mentira (`nodo`): clasifica.js solo usa `closest`, `querySelectorAll`, `id` y
 * `getAttribute`, y con eso basta para recorrer todos sus caminos. Que el sitio de verdad lo
 * conecte bien lo prueba pruebas/navegador.py en Chromium contra nginx.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {revisaEventos, valida} from '../assets/js/registro/registro-anonimo.js';
import eventos, {SECCIONES, TEXTOS, POSTS} from '../assets/js/registro/eventos.js';
import {clasifica, red, posicion, divide, baseDe, BASE, PROYECTOS, REDES} from '../assets/js/registro/clasifica.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const piezas = process.env.PIEZAS ?? join(process.env.HOME, 'Documentos/Proyects/piezas');

/** Un nodo de mentira: `#id`, `.clase` y `a[href]` son todos los selectores que hacen falta. */
function nodo({id = '', clases = [], tag = 'div', href = null} = {}, ...hijos){
  const n = {id, tag, href, clases: new Set(clases), padre: null, hijos,
    getAttribute: k => (k === 'href' ? href : null),
    coincide(sel){
      if (sel.startsWith('#')) return id === sel.slice(1);
      if (sel.startsWith('.')) return n.clases.has(sel.slice(1));
      return sel === 'a[href]' && tag === 'a' && href !== null;
    },
    closest(sel){
      for (let e = n; e; e = e.padre) if (e.coincide(sel)) return e;
      return null;
    },
    querySelectorAll(sel){
      const out = [];
      const baja = e => { for (const h of e.hijos){ if (h.coincide(sel)) out.push(h); baja(h); } };
      baja(n);
      return out;
    }};
  for (const h of hijos) h.padre = n;
  return n;
}

test('la lista de eventos es válida y cerrada', () => {
  assert.equal(revisaEventos(eventos), eventos);
  assert.deepEqual(eventos.seccion, SECCIONES);
  assert.equal(eventos.substack.length, POSTS);
  for (const t of TEXTOS) for (const h of [25, 50, 75, 100]) assert.equal(valida(eventos, 'lee', `${t}.${h}`), `${t}.${h}`);
  assert.equal(valida(eventos, 'substack', 'post-6'), null);
  assert.deepEqual(Object.values(PROYECTOS), eventos.proyecto);
});

test('las secciones existen en index.html con su etiqueta', () => {
  const html = readFileSync(join(raiz, 'index.html'), 'utf8');
  for (const s of SECCIONES) assert.match(html, new RegExp(`<section[^>]*id="${s}"[\\s\\S]*?class="sec-label"`), s);
  assert.doesNotMatch(html, /analytics\.narbigcito\.com\/script\.js/, 'el Umami muerto ya no se carga');
  assert.match(html, /<script type="module" src="assets\/js\/registro\/sitio\.js"><\/script>/);
  for (const id of Object.keys(PROYECTOS)) assert.match(html, new RegExp(`id="${id}"`), id);
});

test('red: dominio y subdominio, otro y basura', () => {
  assert.equal(red('https://calendar.app.google/x'), 'agenda');
  assert.equal(red('https://www.instagram.com/elnarbigcito/'), 'instagram');
  assert.equal(red('https://narbigcito.substack.com'), 'substack');
  assert.equal(red('https://www.are.na/el-narbigcito/'), 'arena');
  assert.equal(red('https://noesare.na'), 'otro');
  assert.equal(red('https://ejemplo.org'), 'otro');
  assert.equal(red('no es url'), null);
  for (const [, v] of REDES) assert.ok(eventos.red.includes(v), `red:${v} está en eventos.js`);
  assert.ok(eventos.red.includes('otro'));
});

test('posicion, divide y baseDe', () => {
  assert.equal(posicion('b', ['a', 'b']), 2);
  assert.equal(posicion('z', ['a']), null);
  assert.deepEqual(divide('proyecto:magi'), ['proyecto', 'magi']);
  assert.deepEqual(divide('muro'), ['muro', undefined]);
  assert.equal(baseDe({hostname: 'narbigcito.com', search: '?receptor=http://x/'}), BASE);
  assert.equal(baseDe({hostname: 'localhost', search: '?receptor=http://x/'}), 'http://x/');
  assert.equal(baseDe({hostname: '127.0.0.1', search: ''}), BASE);
});

test('clasifica: tarjetas, huevos, idioma', () => {
  const titulo = nodo();
  const magi = nodo({id: 'cardMagi', clases: ['app-card']}, titulo);
  const rara = nodo({id: 'cardNueva', clases: ['app-card']});
  assert.equal(clasifica(titulo), 'proyecto:magi');
  assert.equal(clasifica(rara), null);
  assert.equal(clasifica(nodo({id: 'milkBtn', tag: 'button'})), 'huevo:leche');
  const lang = nodo({id: 'langBtn', tag: 'button'});
  assert.equal(clasifica(lang), 'idioma:en');
  assert.equal(clasifica(lang, 'en'), 'idioma:es');
  assert.ok(magi);
});

test('clasifica: Substack por posición, Are.na y «ver todo»', () => {
  const posts = Array.from({length: 6}, (_, i) => nodo({clases: ['substack-post'], tag: 'a', href: `https://s/${i}`}));
  const mas = nodo({tag: 'a', href: 'https://narbigcito.substack.com'});
  nodo({id: 'substack'}, nodo({id: 'substackWrap'}, ...posts), mas);
  assert.equal(clasifica(posts[0]), 'substack:post-1');
  assert.equal(clasifica(posts[4]), 'substack:post-5');
  assert.equal(clasifica(posts[5]), null, 'el sexto no está en la lista');
  assert.equal(clasifica(nodo({clases: ['substack-post'], tag: 'a', href: 'https://s'})), null, 'suelto, sin su lista');
  assert.equal(clasifica(mas), 'mas:substack');
  const bloque = nodo({clases: ['arena-block'], tag: 'a', href: 'https://are.na/block/1'});
  const todo = nodo({tag: 'a', href: 'https://www.are.na/el-narbigcito'});
  nodo({id: 'arena'}, bloque, todo);
  assert.equal(clasifica(bloque), 'arena:bloque');
  assert.equal(clasifica(todo), 'mas:arena');
});

test('clasifica: conversaciones y el archivo', () => {
  const convs = [1, 2, 3].map(() => nodo({clases: ['conv-thumb'], tag: 'button'}));
  const archivo = nodo({id: 'convMoreBtn', clases: ['conv-thumb', 'conv-thumb-external'], tag: 'a', href: 'https://claude-mock.narbigcito.com'});
  nodo({id: 'convGrid'}, ...convs, archivo);
  assert.equal(clasifica(convs[0]), 'conversacion:conv-1');
  assert.equal(clasifica(convs[2]), 'conversacion:conv-3');
  assert.equal(clasifica(archivo), 'conversacion:archivo');
  assert.equal(clasifica(nodo({clases: ['conv-thumb'], tag: 'button'})), null, 'suelta, sin su grilla');
});

test('clasifica: Conectar, agenda de eventos y lo que no se anota', () => {
  const ig = nodo({tag: 'a', href: 'https://www.instagram.com/elnarbigcito/'});
  const raro = nodo({tag: 'a', href: 'https://ejemplo.org'});
  const roto = nodo({tag: 'a', href: '::'});
  nodo({id: 'conectar'}, ig, raro, roto);
  assert.equal(clasifica(ig), 'red:instagram');
  assert.equal(clasifica(raro), 'red:otro');
  assert.equal(clasifica(roto), null);
  const ev = nodo({tag: 'a', href: 'https://lu.ma/x'});
  nodo({id: 'eventosList'}, ev);
  assert.equal(clasifica(ev), 'eventos:abre');
  assert.equal(clasifica(nodo({tag: 'a', href: '#top'})), null, 'enlace interno');
  assert.equal(clasifica(nodo({tag: 'button', id: 'popupClose'})), null, 'botón sin nombre propio');
  for (const v of ['red:instagram', 'red:otro', 'eventos:abre', 'mas:arena', 'huevo:leche']){
    const [n, d] = divide(v);
    assert.equal(valida(eventos, n, d), d, v);
  }
});

test('la copia de la pieza es idéntica a piezas/', {skip: !existsSync(piezas) && 'sin piezas/ en esta máquina'}, () => {
  const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
  assert.equal(sha(join(raiz, 'assets/js/registro/registro-anonimo.js')),
    sha(join(piezas, 'js/registro-anonimo/registro-anonimo.js')));
});

test('registro.conf corresponde a eventos.js', {skip: !existsSync(piezas) && 'sin piezas/ en esta máquina'}, () => {
  execFileSync(join(raiz, 'deploy/registro/armar.sh'), ['--revisa'], {env: {...process.env, PIEZAS: piezas}, stdio: 'pipe'});
});
