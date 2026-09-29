(function initTide() {
  const tideCanvas = document.getElementById('tideCanvas');
  const gl = tideCanvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) return;

  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0., 1.); }
  `;

  const FRAG_TIDE = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec4 u_rip[24];   // x, y (0..1, y hacia arriba), inicio, fuerza

    // Cáusticas: la red de luz que se ve en el fondo de una alberca.
    // (técnica de "tileable water caustic", Dave Hoskins)
    float caustica(vec2 uv, float t) {
      vec2 p = mod(uv * 6.28318, 6.28318) - 250.;
      vec2 i = p;
      float c = 1., inten = .005;
      for (int n = 0; n < 5; n++) {
        float tt = t * (1. - (3.5 / float(n + 1)));
        i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        c += 1. / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
      }
      c /= 5.;
      c = 1.17 - pow(c, 1.4);
      return pow(abs(c), 8.);
    }

    // Altura del agua y su pendiente (h, dh/dx, dh/dy): oleaje suave
    // más los anillos que dejan el pez, el cursor y los clics.
    vec3 agua(vec2 p, float aspect) {
      vec3 r = vec3(0.);
      vec2 d1 = normalize(vec2(1., .35)), d2 = normalize(vec2(-.4, 1.));
      float a1 = dot(p, d1) * 9. + u_time * .7, a2 = dot(p, d2) * 13. - u_time * .9;
      r.x += sin(a1) * .012 + sin(a2) * .008;
      r.yz += d1 * cos(a1) * .012 * 9. + d2 * cos(a2) * .008 * 13.;
      for (int i = 0; i < 24; i++) {
        vec4 s = u_rip[i];
        float edad = u_time - s.z;
        if (s.w <= 0. || edad < 0. || edad > 5.) continue;
        vec2 dv = p - vec2(s.x * aspect, s.y);
        float d = length(dv) + 1e-4;
        float x = d - edad * .23;
        float env = s.w * exp(-edad * 1.05) * exp(-x * x * 90.) / (1. + d * 3.);
        float k = 60.;
        float wv = sin(x * k);
        r.x += env * wv;
        r.yz += env * (k * cos(x * k) - 180. * x * wv) * dv / d;
      }
      return r;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      float aspect = u_res.x / u_res.y;
      vec2 p = vec2(uv.x * aspect, uv.y);
      vec3 w = agua(p, aspect);
      vec2 n = w.yz;

      // profundidad: más oscuro abajo, un poco más claro arriba
      vec3 hondo = vec3(.008, .03, .06), bajo = vec3(.02, .13, .19);
      vec3 col = mix(hondo, bajo, smoothstep(0., 1.2, uv.y + sin(p.x * 2. + u_time * .1) * .08));

      // las cáusticas se deforman con las olas (refracción)
      vec2 q = p + n * .018;
      float c = caustica(q * .85, u_time * .32);
      float tono = .5 + .5 * sin(u_time * .07 + p.x * 1.3 + p.y * .7);
      vec3 luz = mix(vec3(.25, .85, .8), vec3(.62, .45, 1.), tono);   // turquesa que se va a lila
      col += luz * c * .42;

      // brillo en las crestas de los anillos
      vec3 N = normalize(vec3(-n * 1.4, 1.));
      vec3 L = normalize(vec3(-.35, .55, .75));
      float brillo = pow(max(dot(reflect(-L, N), vec3(0., 0., 1.)), 0.), 28.);
      col += brillo * .55 * vec3(.8, 1., 1.);
      col += w.x * .35 * luz;

      // viñeta
      vec2 v = uv - .5;
      col *= 1. - dot(v, v) * .9;
      gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const v = compile(gl.VERTEX_SHADER, VERT);
  const f = compile(gl.FRAGMENT_SHADER, FRAG_TIDE);
  if (!v || !f) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'a_pos');

  function resize() {
    const w = tideCanvas.clientWidth  || window.innerWidth;
    const h = tideCanvas.clientHeight || window.innerHeight;
    const dpr = Math.min(devicePixelRatio, 1.5);
    tideCanvas.width  = Math.round(w * dpr);
    tideCanvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, tideCanvas.width, tideCanvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  let uTime = 0, lastTime = 0;
  // 24 ondas a la vez en un búfer circular: el pez, el cursor y los clics las van soltando
  const ONDAS = new Float32Array(24 * 4);
  let sigOnda = 0;
  function onda(x, y, fuerza) {
    const k = sigOnda * 4;
    ONDAS[k] = x / window.innerWidth;
    ONDAS[k + 1] = 1 - y / window.innerHeight;
    ONDAS[k + 2] = uTime;
    ONDAS[k + 3] = fuerza;
    sigOnda = (sigOnda + 1) % 24;
  }
  window.__agua = { onda: onda };

  let ultX = -1, ultY = -1, ultT = 0;
  window.addEventListener('pointermove', e => {
    const d = Math.hypot(e.clientX - ultX, e.clientY - ultY);
    if (d > 45 && uTime - ultT > 0.09) {
      onda(e.clientX, e.clientY, 0.18);
      ultX = e.clientX; ultY = e.clientY; ultT = uTime;
    }
  }, { passive: true });
  window.addEventListener('pointerdown', e => {
    // una gota grande y dos réplicas
    onda(e.clientX, e.clientY, 0.9);
    setTimeout(() => onda(e.clientX, e.clientY, 0.45), 140);
    setTimeout(() => onda(e.clientX, e.clientY, 0.25), 320);
  }, { passive: true });

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uT = gl.getUniformLocation(prog, 'u_time');
  const uRip = gl.getUniformLocation(prog, 'u_rip');

  function render(ts) {
    requestAnimationFrame(render);
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    uTime += dt;

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(uRes, tideCanvas.width, tideCanvas.height);
    gl.uniform1f(uT, uTime);
    gl.uniform4fv(uRip, ONDAS);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(t => { lastTime = t; requestAnimationFrame(render); });
})();
