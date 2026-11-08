/**
 * registro-anonimo: qué abrió la gente y hasta dónde leyó, sin saber quién es.
 *
 * Sale del registro de la propuesta para Ester (propuesta-ester/js/registro.js, 13 oct 2026)
 * y lo vuelve configurable: cada sitio declara su propia lista cerrada de eventos.
 *
 * Por qué es anónimo por construcción y no por promesa: lo que no sale del navegador no se
 * puede guardar. De cada evento salen cinco cosas y nada más:
 *   w  el sitio (de una lista que conoce el receptor),
 *   n  el nombre del evento (de la lista cerrada del sitio),
 *   d  un dato de esa misma lista (nunca texto que escriba la persona),
 *   s  una visita: 12 hexadecimales al azar que viven en una variable y mueren al recargar,
 *   i  el número de orden del evento dentro de la visita.
 * El receptor (nginx, ver nginx.js) agrega la hora y el país de Cloudflare. No hay cookies,
 * ni localStorage, ni sessionStorage, ni IP, ni navegador, ni referer: la petición sale con
 * `credentials: 'omit'` y `referrerPolicy: 'no-referrer'`, y el formato del log no tiene esos campos.
 *
 * Por qué un GET a un archivo y no un servidor: nginx ya escribe una línea por petición. Con
 * una ruta propia y un formato propio, el log es la base de datos y no hay proceso nuevo que
 * mantener en la Pi. La lectura la hace `lector/visitas.py` desde la laptop.
 *
 * Por qué nunca truena: el sitio vale más que el dato. `manda` va en try/catch y la promesa
 * de fetch se traga sus errores. Un evento mal escrito en la app no sale y devuelve false.
 *
 * Cómo se lee la profundidad: un dato con la forma `texto.N` (por ejemplo `capa-4.50`) es un
 * avance. Solo sale cuando N sube para ese texto, así el log no repite «50» cada vez que
 * alguien sube y baja. `combina()` arma esos datos para la lista cerrada.
 *
 * Lo que toca el DOM (`alLeer`, `alVer`, `alCopiar`, `alEnlace`, `alSalir`) recibe sus
 * dependencias por parámetro y se prueba en Node con objetos falsos.
 *
 * @module registro-anonimo
 */

/** Versión de la pieza. */
export const VERSION = '0.1.0';

/** Ruta por omisión del receptor, relativa a `base`. */
export const RUTA = 'e.txt';

/** Etiquetas de los tramos de duración. Van en la lista cerrada del evento `sale`. */
export const TRAMOS = ['0-30s', '30s-2m', '2-5m', '5-15m', '15-30m', 'mas-30m'];

/** Cortes de los tramos, en segundos. */
const CORTES = [30, 120, 300, 900, 1800];

/** Forma de un nombre de evento o de sitio. */
const NOMBRE = /^[a-z][a-z0-9-]{0,15}$/;

/** Forma de un dato: minúsculas, números, guion y punto, hasta 32 caracteres. */
const DATO = /^[a-z0-9.-]{1,32}$/;

/** Un avance: `texto.N`. */
const AVANCE = /^(.+)\.(\d{1,3})$/;

/** Tope de eventos por visita: el orden `i` tiene hasta 4 cifras en el receptor. */
const TOPE = 400;

/**
 * Duración en tramos gruesos. El segundo exacto no le dice nada a Gibrán y sí dice algo de
 * la persona.
 *
 *     tramo(12)    // '0-30s'
 *     tramo(200)   // '2-5m'
 *     tramo(4000)  // 'mas-30m'
 *
 * @param {number} segundos
 * @returns {string} uno de `TRAMOS`
 */
export function tramo(segundos){
  const i = CORTES.findIndex(c => segundos < c);
  return TRAMOS[i === -1 ? CORTES.length : i];
}

/**
 * Arma los datos de avance de varios textos para la lista cerrada.
 *
 *     combina(['capa-4', 'capa-3'], [50, 100])
 *     // ['capa-4.50', 'capa-4.100', 'capa-3.50', 'capa-3.100']
 *
 * @param {string[]} textos
 * @param {number[]} [hitos]
 * @returns {string[]}
 */
export function combina(textos, hitos = [25, 50, 75, 100]){
  return textos.flatMap(t => hitos.map(h => `${t}.${h}`));
}

/**
 * Revisa la lista cerrada de un sitio. Truena en desarrollo si algo no tiene la forma que el
 * receptor acepta: es mejor enterarse al escribir la lista que ver el log vacío un mes después.
 *
 *     revisaEventos({entra: ['3d'], puerta: null})   // la misma lista
 *     revisaEventos({Entra: null})                    // Error: evento «Entra» con nombre inválido
 *
 * @param {Record<string, string[]|null>} eventos
 * @returns {Record<string, string[]|null>}
 */
export function revisaEventos(eventos){
  if (!eventos || typeof eventos !== 'object') throw new Error('falta la lista de eventos');
  for (const [nombre, datos] of Object.entries(eventos)){
    if (!NOMBRE.test(nombre)) throw new Error(`evento «${nombre}» con nombre inválido`);
    if (datos === null) continue;
    if (!Array.isArray(datos) || datos.length === 0) throw new Error(`evento «${nombre}»: los datos van en una lista o null`);
    const malo = datos.find(d => typeof d !== 'string' || !DATO.test(d));
    if (malo !== undefined) throw new Error(`evento «${nombre}»: dato «${malo}» inválido`);
  }
  return eventos;
}

/**
 * La aduana: ¿se puede mandar este evento con este dato? Todo pasa por aquí.
 *
 *     const ev = {paso: ['1', '2'], recuerdo: null};
 *     valida(ev, 'paso', 2)              // '2'
 *     valida(ev, 'recuerdo')             // ''
 *     valida(ev, 'recuerdo', 'mi línea') // null (el texto no sale)
 *     valida(ev, 'ip', '1.2.3.4')        // null
 *
 * @param {Record<string, string[]|null>} eventos
 * @param {string} nombre
 * @param {unknown} [dato]
 * @returns {string|null} el dato normalizado ('' si no lleva), o null si no pasa
 */
export function valida(eventos, nombre, dato){
  if (!Object.hasOwn(eventos, nombre)) return null;
  const permitidos = eventos[nombre];
  if (permitidos === null) return dato == null ? '' : null;
  const d = String(dato ?? '');
  return permitidos.includes(d) ? d : null;
}

/**
 * Identificador de visita: 12 hexadecimales al azar, solo en memoria.
 * @param {{getRandomValues?: Function}} [cripto]
 * @returns {string}
 */
export function nuevaVisita(cripto = globalThis.crypto){
  const b = new Uint8Array(6);
  if (cripto?.getRandomValues) cripto.getRandomValues(b);
  else for (let i = 0; i < 6; i++) b[i] = Math.floor(Math.random() * 256);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * ¿La URL pide no registrar? Con `?registro=0` no sale nada: sirve para que Gibrán revise
 * su propio sitio sin ensuciar los números.
 *
 *     apagadoPorUrl('?lang=es&registro=0')  // true
 *     apagadoPorUrl('?registro=01')         // false
 *
 * @param {string} busqueda `location.search`
 * @returns {boolean}
 */
export function apagadoPorUrl(busqueda){
  return /[?&]registro=0(&|$)/.test(busqueda || '');
}

/**
 * Crea el registro de una página.
 *
 * Además de la aduana, recuerda lo que ya mandó en la visita: cada pareja evento:dato sale
 * una vez (abrir la capa 4 dos veces no es noticia), salvo los eventos de `repetibles`; un
 * avance `texto.N` solo sale si N sube, y un evento de `sube` solo si su número sube.
 *
 * `base` es la raíz del receptor; por omisión, la del documento (`document.baseURI`). Si no se
 * puede armar la URL, el evento cuenta pero no sale.
 *
 * `base` puede estar en otro origen (narbigcito.com vive en GitHub Pages y el receptor en la
 * Pi). Por eso la petición va en modo `no-cors`: no lee la respuesta, solo la manda.
 *
 * @param {{eventos: Record<string, string[]|null>, sitio: string, base?: string|URL, ruta?: string,
 *   fetch?: Function, ahora?: () => number, visita?: string, activo?: boolean,
 *   repetibles?: string[], sube?: string[], tope?: number}} op
 * @returns {{evento: (nombre: string, dato?: unknown) => boolean, url: (nombre: string, dato?: unknown) => string|null,
 *   duracion: () => string, visita: string, sitio: string, eventos: Record<string, string[]|null>, readonly orden: number}}
 */
export function creaRegistro({eventos, sitio, base = globalThis.document?.baseURI, ruta = RUTA, fetch: f = globalThis.fetch,
  ahora = () => Date.now(), visita = nuevaVisita(), activo = true,
  repetibles = ['sale'], sube = [], tope = TOPE}){
  revisaEventos(eventos);
  if (!NOMBRE.test(sitio ?? '')) throw new Error(`sitio «${sitio}» inválido`);
  const inicio = ahora();
  const ya = new Set();
  const maximos = new Map();
  const otraVez = new Set(repetibles);
  const conNumero = new Set(sube);
  let orden = 0;

  function url(nombre, dato){
    const d = valida(eventos, nombre, dato);
    if (d === null) return null;
    let u;
    try { u = new URL(ruta, base); } catch { return null; }
    u.searchParams.set('w', sitio);
    u.searchParams.set('n', nombre);
    u.searchParams.set('d', d);
    u.searchParams.set('s', visita);
    u.searchParams.set('i', String(orden));
    return u.toString();
  }

  function manda(u){
    try {
      const p = f?.(u, {method: 'GET', keepalive: true, credentials: 'omit', cache: 'no-store',
        referrerPolicy: 'no-referrer', mode: 'no-cors'});
      p?.catch?.(() => {});
    } catch { /* fetch ausente o bloqueado: el sitio sigue */ }
  }

  function subio(clave, n){
    if (n <= (maximos.get(clave) ?? -1)) return false;
    maximos.set(clave, n);
    return true;
  }

  function evento(nombre, dato){
    const d = valida(eventos, nombre, dato);
    if (d === null || orden >= tope) return false;
    const avance = AVANCE.exec(d);
    if (avance){ if (!subio(`${nombre}:${avance[1]}`, +avance[2])) return false; }
    else if (conNumero.has(nombre)){ if (!subio(nombre, +d)) return false; }
    else if (!otraVez.has(nombre)){
      const clave = `${nombre}:${d}`;
      if (ya.has(clave)) return false;
      ya.add(clave);
    }
    const u = url(nombre, dato);
    orden++;
    if (activo && u) manda(u);
    return true;
  }

  const duracion = () => tramo((ahora() - inicio) / 1000);
  return {evento, url, duracion, visita, sitio, eventos, get orden(){ return orden; }};
}

/**
 * Distancia de `el` a la parte de arriba de `cont`, en píxeles del DOM sin transformar.
 * @param {{offsetTop: number, offsetParent: any}} el
 * @param {any} cont el contenedor que se desplaza (null = la página)
 * @returns {number}
 */
export function arriba(el, cont){
  let y = 0;
  for (let e = el; e && e !== cont; e = e.offsetParent) y += e.offsetTop;
  return y;
}

/**
 * Avisa cuando la persona baja hasta cierto porcentaje de un texto.
 *
 * Por qué offsets y no getBoundingClientRect ni IntersectionObserver: en la propuesta de Ester
 * la carta se abría con un `transform: scale()` que empezaba casi en cero, y medida con
 * rectángulos cabía entera y daba «fin» sin que nadie la leyera. offsetTop y scrollTop viven
 * en el DOM sin transformar: valen igual en 3D, en el teléfono y en la ruta plana.
 *
 * El hito 100 usa la marca `fin` si se da (la firma de una carta), y si no, el final del texto.
 * Solo mide al desplazarse: un texto corto que cabe entero al cargar no cuenta como leído
 * hasta que la persona mueva la página, porque verlo no es leerlo.
 *
 * @param {any} contenedor lo que se desplaza (`window` o un elemento)
 * @param {any} texto el bloque que se lee
 * @param {(hito: number) => void} fn
 * @param {{hitos?: number[], fin?: any, ventana?: any}} [op] `ventana` es `window` (para probar)
 * @returns {() => void} para dejar de escuchar
 */
export function alLeer(contenedor, texto, fn, {hitos = [25, 50, 75, 100], fin = null, ventana = globalThis.window} = {}){
  const faltan = [...hitos].sort((a, b) => a - b);
  const pagina = contenedor === ventana, cont = pagina ? null : contenedor;
  const revisa = () => {
    try {
      const alto = pagina ? ventana.innerHeight : contenedor.clientHeight;
      if (!alto || !texto.offsetHeight) return;
      const visto = (pagina ? ventana.scrollY : contenedor.scrollTop) + alto;
      while (faltan.length){
        const h = faltan[0];
        const meta = h === 100 && fin
          ? arriba(fin, cont) + fin.offsetHeight
          : arriba(texto, cont) + texto.offsetHeight * h / 100;
        if (meta > visto) break;
        faltan.shift();
        fn(h);
      }
      if (!faltan.length) quita();
    } catch { /* una medida rara no tumba nada */ }
  };
  const quita = () => contenedor.removeEventListener('scroll', revisa);
  contenedor.addEventListener('scroll', revisa, {passive: true});
  return quita;
}

/**
 * Avisa una vez por elemento cuando entra a la vista (secciones de una página normal, sin
 * transformaciones). Sin IntersectionObserver no avisa nada.
 *
 * @param {Iterable<any>} elementos
 * @param {(el: any) => void} fn
 * @param {{IO?: any, umbral?: number}} [op]
 * @returns {() => void} para dejar de observar
 */
export function alVer(elementos, fn, {IO = globalThis.IntersectionObserver, umbral = 0.4} = {}){
  if (typeof IO !== 'function') return () => {};
  const obs = new IO(entradas => {
    for (const e of entradas){
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      fn(e.target);
    }
  }, {threshold: umbral});
  for (const el of elementos) obs.observe(el);
  return () => obs.disconnect();
}

/**
 * Avisa qué se copió, sin el texto: busca el ancestro con `atributo` de donde empieza la
 * selección y pasa su valor. Para botones de «copiar», la app llama a `evento` directo.
 *
 * @param {any} doc `document`
 * @param {(valor: string) => void} fn
 * @param {{atributo?: string}} [op]
 * @returns {() => void}
 */
export function alCopiar(doc, fn, {atributo = 'data-copia'} = {}){
  const oye = () => {
    try {
      let n = doc.getSelection?.()?.anchorNode;
      if (n && n.nodeType !== 1) n = n.parentElement;
      const el = n?.closest?.(`[${atributo}]`);
      if (el) fn(el.getAttribute(atributo));
    } catch { /* nada */ }
  };
  doc.addEventListener('copy', oye);
  return () => doc.removeEventListener('copy', oye);
}

/**
 * Avisa a qué enlace o botón marcado se le hizo clic. Por omisión lee `data-enlace`;
 * `clasifica` permite deducirlo del elemento (por ejemplo, la posición de un post de Substack).
 *
 * @param {any} raiz donde se escucha (`document` o una sección)
 * @param {(valor: string) => void} fn
 * @param {{selector?: string, clasifica?: (el: any) => string|null}} [op]
 * @returns {() => void}
 */
export function alEnlace(raiz, fn, {selector = '[data-enlace]', clasifica = el => el.getAttribute('data-enlace')} = {}){
  const oye = ev => {
    try {
      const el = ev.target?.closest?.(selector);
      const v = el ? clasifica(el) : null;
      if (v) fn(v);
    } catch { /* nada */ }
  };
  raiz.addEventListener('click', oye, true);
  return () => raiz.removeEventListener('click', oye, true);
}

/**
 * Manda `sale` con la duración en tramos cada vez que la pestaña se esconde (en el celular es
 * el último momento seguro) y al salir. Solo manda si el tramo cambió; el lector se queda
 * con el último.
 *
 * @param {ReturnType<typeof creaRegistro>} r
 * @param {{evento?: string, ventana?: any, doc?: any}} [op]
 * @returns {() => void}
 */
export function alSalir(r, {evento = 'sale', ventana = globalThis.window, doc = globalThis.document} = {}){
  let ultimo = null;
  const sale = () => {
    const d = r.duracion();
    if (d === ultimo) return;
    ultimo = d;
    r.evento(evento, d);
  };
  const oculta = () => { if (doc.visibilityState === 'hidden') sale(); };
  doc.addEventListener('visibilitychange', oculta);
  ventana.addEventListener('pagehide', sale);
  return () => {
    doc.removeEventListener('visibilitychange', oculta);
    ventana.removeEventListener('pagehide', sale);
  };
}
