/**
 * Conecta el registro anónimo a narbigcito.com. Es módulo y carga al final, después de los
 * scripts clásicos: no exporta nada ni cambia a nadie, solo escucha el DOM.
 *
 * Qué anota (la lista completa está en eventos.js):
 *   - al entrar, el idioma; al irse, cuánto se quedó (en tramos, nunca el segundo exacto);
 *   - hasta qué sección llegó: cuenta cuando la etiqueta de la sección (`// LO QUE CREO`) se
 *     ve casi entera, porque varias secciones miden más que la pantalla y nunca se verían
 *     al 40 %. Quién soy no tiene título, pero todas tienen etiqueta;
 *   - hasta dónde bajó en la página y en «Lo que creo» (25, 50, 75 y 100 %);
 *   - qué abrió y por dónde se fue: lo decide clasifica.js con un solo clic en captura.
 * El muro roto y el Konami los avisan muro.js y huevos.js con `window.__registro?.evento`.
 *
 * Lo que no hace: cookies, localStorage, IP, texto escrito o títulos. `?registro=0` en la URL
 * lo apaga entero, para que Gibrán revise su sitio sin ensuciar los números.
 */
import {creaRegistro, apagadoPorUrl, alSalir, alLeer, alVer, alEnlace} from './registro-anonimo.js';
import eventos, {SECCIONES} from './eventos.js';
import {baseDe, clasifica, divide, SELECTOR} from './clasifica.js';

const r = creaRegistro({eventos, sitio: 'narbigcito', base: baseDe(location),
  activo: !apagadoPorUrl(location.search), repetibles: ['sale', 'idioma']});
window.__registro = r;

r.evento('entra', document.documentElement.lang);
alSalir(r);

const titulos = SECCIONES.map(id => document.querySelector(`#${id} .sec-label`)).filter(Boolean);
alVer(titulos, el => r.evento('seccion', el.closest('section').id), {umbral: 0.8});

alLeer(window, document.body, h => r.evento('lee', `pagina.${h}`));
const creo = document.getElementById('creo');
if (creo) alLeer(window, creo, h => r.evento('lee', `creo.${h}`));

alEnlace(document, v => r.evento(...divide(v)),
  {selector: SELECTOR, clasifica: el => clasifica(el, document.documentElement.lang)});
