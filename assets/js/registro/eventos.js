/**
 * Lista cerrada de eventos de narbigcito.com (pieza registro-anonimo 0.1.0).
 *
 * Cada evento contesta una pregunta de Gibrán: «qué hace la gente al entrar, si les
 * interesan los textos». La misma lista arma la aduana de nginx en la Pi
 * (deploy/registro/receptor.js), así que lo que no esté aquí no se anota en ningún lado.
 * Si agregas un evento o un dato, vuelve a generar el nginx (deploy/registro/armar.sh) y
 * pídele a Furbex que lo publique antes del merge; si no, la Pi tira el evento nuevo.
 *
 * Nada lleva texto libre ni títulos: los posts de Substack van por posición (post-1 es el más
 * nuevo, el sitio pinta cinco) porque el feed cambia y la lista tiene que ser cerrada. Las
 * conversaciones van por su lugar en `CONVERSATIONS` de conversaciones.js.
 */
import {TRAMOS, combina} from './registro-anonimo.js';

/** Las secciones de la página, con el id que tienen en index.html. */
export const SECCIONES = ['eventos', 'quien', 'arena', 'substack', 'creo', 'apps', 'convs', 'conectar'];

/** Los textos que se miden por avance de lectura: la página entera y «Lo que creo». */
export const TEXTOS = ['pagina', 'creo'];

/** Cuántos posts de Substack pinta feeds.js (el destacado y cuatro más). */
export const POSTS = 5;

export default {
  entra: ['es', 'en'],                                          // abrió la página, en qué idioma
  seccion: SECCIONES,                                           // llegó a ver la sección
  lee: combina(TEXTOS),                                         // pagina.25 … creo.100
  substack: Array.from({length: POSTS}, (_, i) => `post-${i + 1}`), // abrió un texto de Substack
  arena: ['bloque'],                                            // abrió un bloque de Are.na
  proyecto: ['logos', 'magi', 'whelle', 'rana'],                // abrió el modal de un proyecto
  conversacion: ['conv-1', 'conv-2', 'conv-3', 'archivo'],      // abrió una conversación con Claude
  red: ['agenda', 'instagram', 'substack', 'github', 'linkedin', 'arena', 'otro'], // salió por Conectar
  mas: ['substack', 'arena'],                                   // «leer todo en substack», «ver todo en are.na»
  eventos: ['abre'],                                            // abrió el enlace de un evento de la agenda
  muro: ['roto'],                                               // llegó a los 17 golpes
  huevo: ['leche', 'konami'],                                   // encontró un huevo
  idioma: ['es', 'en'],                                         // cambió de idioma (a cuál)
  sale: TRAMOS                                                  // cuánto llevaba al irse
};
