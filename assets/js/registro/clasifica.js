/**
 * Qué evento es un clic en narbigcito.com. Funciones puras, sin `document` ni `window`,
 * para que se prueben con `node --test` (pruebas/registro.test.js).
 *
 * Por qué un solo clasificador y no un listener por botón: los scripts del sitio son
 * clásicos y pintan sus elementos cuando quieren (feeds.js pinta Substack y Are.na cuando
 * llega el JSON). Un solo `click` en `document`, en fase de captura, ve todos esos elementos
 * sin tocar el código que los crea. Así ninguno de los demás archivos cambia de forma.
 *
 * Un clic se vuelve `evento:dato` o `null`. `null` quiere decir que ese clic no se anota.
 * Lo que devuelve tiene que estar en eventos.js; si no está, el registro lo tira igual.
 */
import {POSTS} from './eventos.js';

/** Dónde escucha el receptor (nginx en la Pi, detrás del túnel de Cloudflare). */
export const BASE = 'https://analytics.narbigcito.com/';

/** Lo que el clasificador quiere ver: el elemento más cercano al clic que coincida. */
export const SELECTOR = 'a[href], button, .app-card';

/** Tarjeta de proyecto (id en index.html) → dato de `proyecto`. */
export const PROYECTOS = {cardLogos: 'logos', cardMagi: 'magi', cardWhelle: 'whelle', cardRana: 'rana'};

/** Dominio → dato de `red`. Se compara el dominio completo o un subdominio suyo. */
export const REDES = [
  ['calendar.app.google', 'agenda'],
  ['instagram.com', 'instagram'],
  ['substack.com', 'substack'],
  ['github.com', 'github'],
  ['linkedin.com', 'linkedin'],
  ['are.na', 'arena']
];

/**
 * A qué red lleva un enlace. Un dominio que no está en `REDES` es `otro`, y un href que no es
 * URL es `null`: así un enlace nuevo en «Conectar» se cuenta aunque nadie actualice la lista.
 *
 *     red('https://www.instagram.com/elnarbigcito/')  // 'instagram'
 *     red('https://narbigcito.substack.com')          // 'substack'
 *     red('https://ejemplo.org')                      // 'otro'
 *     red('no es url')                                // null
 *
 * @param {string} href
 * @returns {string|null}
 */
export function red(href){
  let host;
  try { host = new URL(href).hostname; } catch { return null; }
  const par = REDES.find(([d]) => host === d || host.endsWith('.' + d));
  return par ? par[1] : 'otro';
}

/**
 * Lugar (desde 1) de `el` en `lista`, o `null` si no está.
 *
 *     posicion('b', ['a', 'b'])   // 2
 *     posicion('z', ['a'])        // null
 *
 * @param {unknown} el
 * @param {Iterable<unknown>} lista
 * @returns {number|null}
 */
export function posicion(el, lista){
  const i = [...lista].indexOf(el);
  return i < 0 ? null : i + 1;
}

/**
 * Parte `evento:dato` en sus dos piezas. El dato puede faltar.
 *
 *     divide('proyecto:magi')   // ['proyecto', 'magi']
 *     divide('muro')            // ['muro', undefined]
 *
 * @param {string} v
 * @returns {[string, string|undefined]}
 */
export function divide(v){
  const i = v.indexOf(':');
  return i < 0 ? [v, undefined] : [v.slice(0, i), v.slice(i + 1)];
}

/**
 * Raíz del receptor. En el sitio publicado siempre es `BASE`. Solo en `localhost` se acepta
 * `?receptor=URL`, para probar contra un nginx local sin tocar el código; en el sitio real
 * ese parámetro se ignora y nadie puede mandar los eventos de otra persona a otro lado.
 *
 *     baseDe({hostname: 'narbigcito.com', search: '?receptor=http://x/'})   // BASE
 *     baseDe({hostname: 'localhost', search: '?receptor=http://x/'})        // 'http://x/'
 *     baseDe({hostname: '127.0.0.1', search: ''})                           // BASE
 *
 * @param {{hostname: string, search: string}} loc `location`
 * @returns {string}
 */
export function baseDe(loc){
  const local = loc.hostname === 'localhost' || loc.hostname === '127.0.0.1';
  const pedida = new URLSearchParams(loc.search).get('receptor');
  return local && pedida ? pedida : BASE;
}

/**
 * Qué evento es el clic sobre `el`. `idioma` es el que tiene la página en ese momento: el
 * clic se ve en captura, antes de que i18n.js cambie el idioma, así que el destino es el otro.
 *
 * Las tarjetas de proyecto van primero porque son `div` con cosas adentro; los enlaces
 * genéricos van al final, cuando ya se descartó todo lo que tiene nombre propio.
 *
 * @param {{closest: (sel: string) => any}} el lo que encontró `SELECTOR`
 * @param {string} [idioma] `document.documentElement.lang`
 * @returns {string|null} `evento:dato`
 */
export function clasifica(el, idioma = 'es'){
  const tarjeta = el.closest('.app-card');
  if (tarjeta) return PROYECTOS[tarjeta.id] ? `proyecto:${PROYECTOS[tarjeta.id]}` : null;
  if (el.closest('#milkBtn')) return 'huevo:leche';
  if (el.closest('#langBtn')) return `idioma:${idioma === 'en' ? 'es' : 'en'}`;
  const post = el.closest('.substack-post');
  if (post){
    const n = posicion(post, post.closest('#substackWrap')?.querySelectorAll('.substack-post') ?? []);
    return n && n <= POSTS ? `substack:post-${n}` : null;
  }
  if (el.closest('.arena-block')) return 'arena:bloque';
  if (el.closest('#convMoreBtn')) return 'conversacion:archivo';
  const conv = el.closest('.conv-thumb');
  if (conv){
    const propias = [...(conv.closest('#convGrid')?.querySelectorAll('.conv-thumb') ?? [])].filter(b => b.id !== 'convMoreBtn');
    const n = posicion(conv, propias);
    return n ? `conversacion:conv-${n}` : null;
  }
  const a = el.closest('a[href]');
  if (!a) return null;
  if (a.closest('#conectar')){
    const r = red(a.getAttribute('href'));
    return r ? `red:${r}` : null;
  }
  if (a.closest('#eventosList')) return 'eventos:abre';
  if (a.closest('#substack')) return 'mas:substack';
  if (a.closest('#arena')) return 'mas:arena';
  return null;
}
