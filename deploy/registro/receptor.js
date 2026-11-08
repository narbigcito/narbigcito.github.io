/**
 * Receptor del registro anónimo de narbigcito.com, en la Pi. No se edita la configuración de
 * nginx a mano: sale de este archivo y de la misma lista de eventos que usa el navegador
 * (assets/js/registro/eventos.js), así que las dos aduanas no se pueden desincronizar.
 *
 *   deploy/registro/armar.sh    # escribe deploy/registro/registro.conf
 *
 * Furbex copia registro.conf a /etc/nginx/sites-available/registro en la Pi, y logrotate.conf
 * a /etc/logrotate.d/registro-anonimo.
 *
 * Por qué el log va en su propia carpeta: el logrotate de nginx borra todo `/var/log/nginx/*.log`
 * a los 14 días, y dos semanas no dicen si a la gente le interesan los textos. El log no tiene
 * nada personal, así que se guarda dos años (rotación semanal) y no pesa: unos 80 bytes por
 * evento. Una carpeta aparte evita que el glob de nginx lo tome dos veces.
 */
import eventos from '../../assets/js/registro/eventos.js';

export default {
  receptor: 'narbigcito',
  log: '/var/log/nginx/registro/narbigcito-eventos.log',
  sitios: {narbigcito: eventos}
};
