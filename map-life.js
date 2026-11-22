'use strict';

// Vida del mapa: un shader WebGL redibuja la ilustración con viento en el follaje, telas que flamean,
// corriente y destellos en el río, humo de chimeneas, sombras de nubes y rayos de sol; los fuegos
// iluminan el piso con su parpadeo y las ventanas titilan. Los lugares que se mueven salen de
// art/valle/vida.webp y las luces de art/valle/luz.webp (los genera art-source/vida-del-mapa.py).
// Encima andan bichos y detalles sueltos: pájaros que cruzan, hojas que se vuelan y peces que saltan.
// Si el navegador no tiene WebGL, o se apagan las animaciones del paisaje, queda la ilustración quieta.

const mapLife = (() => {
  const artSize = [1585, 992];
  // Chimeneas en coordenadas de la ilustración: x, y, intensidad.
  const chimneys = [[850, 351, 1], [745, 357, .45], [1381, 371, .7]];
  const fps = 30;

  const vertexSource = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = vec2(aPos.x * .5 + .5, .5 - aPos.y * .5);
      gl_Position = vec4(aPos, 0., 1.);
    }`;

  const fragmentSource = `
    precision highp float;
    uniform sampler2D uMap;
    uniform sampler2D uLife;
    uniform sampler2D uLight;
    uniform vec2 uArt;
    uniform float uTime;
    uniform vec3 uChimney[3];
    varying vec2 vUv;

    // Hash sin sin(): mucho más barato en la GPU (Dave Hoskins).
    float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float sum = 0., amp = .5;
      for (int i = 0; i < 3; i++) { sum += amp * noise(p); p = p * 2.03 + 17.1; amp *= .5; }
      return sum / .875;
    }
    // Para lo que cambia muy despacio en el espacio (ráfagas grandes, nubes) alcanzan dos octavas.
    float fbm2(vec2 p) { return (noise(p) * .5 + noise(p * 2.03 + 17.1) * .25) / .75; }

    void main() {
      vec2 px = vUv * uArt;
      vec4 life = texture2D(uLife, vUv);
      float t = uTime;

      // Viento: ráfagas grandes que cruzan el valle de oeste a este, y cada mata con su propio vaivén.
      // Las copas se inclinan con la ráfaga y vuelven con un rebote corto, como una rama elástica.
      float gust = smoothstep(.32, .78, fbm2(px * .0035 + vec2(-t * .09, t * .025)));
      vec2 offset = vec2(0.);
      float flutter = 0.;
      if (life.r + life.b > .01) {
        float phase = noise(px * .018) * 6.283;
        float swing = sin(t * 1.7 + phase) * .55 + sin(t * 2.9 + phase * 1.7) * .25;
        flutter = noise(px * .07 + vec2(t * 1.6, -t * .9)) - .5;
        offset = life.r * vec2(.2 + 1.5 * gust * (.6 + .4 * swing) + .4 * swing + .25 * flutter,
                               .28 * swing * (.3 + gust) + .22 * flutter);
        // Telas: una onda que corre a lo largo de la tela, más fuerte con las ráfagas.
        float wave = sin(px.x * .21 + px.y * .05 - t * 5.2 + phase) + .5 * sin(px.x * .43 - t * 7.9);
        offset += life.b * vec2(.35 * wave, 1.1 * wave) * (.55 + .9 * gust);
      }

      // El humo pintado sobre las chimeneas ondula y sube un poco (se reconoce por ser claro y sin color).
      for (int i = 0; i < 3; i++) {
        vec2 rel = px - uChimney[i].xy;
        float up = -rel.y;
        if (up > 2. && up < 95. && rel.x > -20. && rel.x < 60.) {
          vec3 raw = texture2D(uMap, vUv).rgb;
          float top = max(raw.r, max(raw.g, raw.b));
          float smoky = smoothstep(.42, .66, top) * (1. - smoothstep(.1, .26, top - min(raw.r, min(raw.g, raw.b))));
          smoky *= smoothstep(2., 14., up) * (1. - smoothstep(70., 95., up));
          offset += smoky * vec2(sin(up * .09 - t * 2.1) * 2.4 + 1.2 * gust, -1.5 - 1.5 * sin(up * .05 - t * 1.4));
        }
      }

      // Río: la corriente lleva la superficie pintada río abajo, hacia el muelle. Dos copias corridas
      // se relevan a contrafase (flow map) para que avance sin estirarse; el relevo cambia por zonas.
      vec3 color;
      vec2 q = vec2(0.);
      if (life.g > .01) {
        vec2 flowDir = normalize(vec2(-1., mix(.06, .55, px.x / uArt.x)));
        vec2 across = vec2(-flowDir.y, flowDir.x);
        q = vec2(dot(px, flowDir), dot(px, across));
        float stagger = noise(px * .013);
        float p0 = fract(t * .09 + stagger), p1 = fract(t * .09 + stagger + .5);
        vec2 ripple = vec2(noise(q * vec2(.04, .1) - vec2(t * .9, 0.)), noise(q * vec2(.05, .12) + vec2(-t * .7, 31.))) - .5;
        vec2 still = offset + life.g * (ripple.x * flowDir * 1.2 + ripple.y * across * .9);
        vec2 drift = life.g * flowDir * 16.;
        color = mix(texture2D(uMap, (px - still - drift * (p0 - .5)) / uArt).rgb,
                    texture2D(uMap, (px - still - drift * (p1 - .5)) / uArt).rgb,
                    abs(p0 * 2. - 1.));
      } else {
        color = texture2D(uMap, (px - offset) / uArt).rgb;
      }

      // Las hojas claras titilan cuando pasa la ráfaga.
      float light = smoothstep(.28, .62, dot(color, vec3(.3, .55, .15)));
      color *= 1. + life.r * light * (gust * .09 + flutter * .05);

      // Destellos: reflejos alargados en el sentido de la corriente, y chispas cortas donde el sol pega.
      if (life.g > .01) {
        float glint = smoothstep(.74, .94, noise(q * vec2(.022, .09) - vec2(t * 1.1, 0.)));
        float sparkle = smoothstep(.9, .985, noise(q * vec2(.09, .2) - vec2(t * 2.3, t * .4)));
        float sunSide = .6 + .4 * smoothstep(.2, .9, px.x / uArt.x);
        color += life.g * sunSide * (glint * vec3(.09, .12, .12) + sparkle * vec3(.26, .25, .2));
      }

      // Luz: fuegos que parpadean sobre el piso, ventanas que titilan y charcos de luz que respiran.
      // La tarde cae y vuelve muy despacio (ciclo de 7 minutos) para que el valle no se vea congelado.
      vec4 lux = texture2D(uLight, vUv);
      float dusk = .5 - .5 * cos(t * .015);
      if (lux.g > .01) {
        float flame = noise(vec2(t * 7.3, px.x * .013)) * .6 + noise(vec2(t * 15.1, px.y * .017 + 4.)) * .4;
        color *= 1. + lux.g * vec3(.36, .17, .02) * (flame - .5) * 1.3;
        color += lux.g * lux.g * vec3(.07, .03, 0.) * flame;
      }
      if (lux.r > .01) {
        float candle = .82 + .18 * noise(vec2(t * 1.3, px.x * .07 + px.y * .05));
        color += lux.r * vec3(.95, .58, .22) * (.05 + .07 * dusk) * candle;
      }
      color *= 1. + lux.b * vec3(.05, .03, 0.) * (.6 + .4 * sin(t * .4));

      // Rayos de sol: bandas suaves que bajan desde arriba a la izquierda y se corren muy lento.
      vec2 sunDir = vec2(.6, .8);
      float beam = dot(px, vec2(-sunDir.y, sunDir.x));
      float along = dot(px, sunDir);
      float rays = smoothstep(.5, .9, noise(vec2(beam * .011 + t * .018, t * .04))) *
        smoothstep(.35, .8, noise(vec2(beam * .004 - t * .006, 3.)));
      rays *= exp(-along / 700.) * (1. - life.g);
      color = 1. - (1. - color) * (1. - rays * vec3(.16, .12, .06));

      // Atardecer: un poco más tibio y bajo, sin tapar los fuegos.
      color *= mix(vec3(1.), vec3(1.03, .96, .86), dusk * .55 * (1. - lux.g));

      // Sombras de nubes, muy suaves, que pasan lentas.
      float cloud = smoothstep(.52, .78, fbm2(px * .0011 + vec2(-t * .006, t * .0018)));
      color *= 1. - .11 * cloud;

      // Humo: columnas que suben, se abren y se doblan con el viento.
      for (int i = 0; i < 3; i++) {
        vec3 c = uChimney[i];
        vec2 rel = px - c.xy;
        float up = -rel.y;
        if (up > -6. && up < 240. && abs(rel.x) < 150.) {
          float h = clamp(up / 240., 0., 1.);
          float bend = pow(h, 1.35) * (70. + 35. * gust);
          float width = 4. + up * .2;
          float dx = rel.x - bend;
          float puff = fbm(vec2(dx * .045 + float(i) * 9., (rel.y + t * 26.) * .03));
          float density = exp(-dx * dx / (2. * width * width)) * smoothstep(-6., 10., up) * (1. - smoothstep(70., 240., up));
          density *= smoothstep(.28, .72, puff) * c.z;
          color = mix(color, vec3(.84, .82, .78), clamp(density * .62, 0., .62));
        }
      }
      gl_FragColor = vec4(color, 1.);
    }`;

  let heldUntil = 0;
  let canvas, gl, program, uniforms, started = 0, timer, running = false, lastFrame = 0, ready = false;
  let mapImage, mapTexture;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function texture(unit, image, filter, raw) {
    const handle = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, raw ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return handle;
  }
  const load = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  // La ilustración viene al doble de resolución. Se sube ya reducida a la medida exacta del lienzo (por mitades y un
  // último paso suave): así cada píxel de la textura cae en un píxel de pantalla y el mapa no se ve granulado.
  let mapSize = 0;
  function fitMap() {
    const target = Math.min(mapImage.naturalWidth, Math.round(cssWidth * displayRatio()));
    if (target < 16) return;   // lienzo oculto: no hay nada que ajustar
    // Rehacer la textura cuesta: solo si el tamaño cambió de verdad (más de un 8 %).
    if (mapSize && Math.abs(target - mapSize) < mapSize * .08) return;
    mapSize = target;
    let source = mapImage, width = mapImage.naturalWidth, height = mapImage.naturalHeight;
    const step = (w, h) => {
      const next = document.createElement('canvas');
      next.width = w;
      next.height = h;
      const context = next.getContext('2d');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(source, 0, 0, w, h);
      source = next;
      width = w;
      height = h;
    };
    while (width / 2 >= target) step(Math.round(width / 2), Math.round(height / 2));
    if (width !== target) step(target, Math.round(height * target / width));
    if (mapTexture) gl.deleteTexture(mapTexture);
    mapTexture = texture(0, source, gl.LINEAR);
  }
  // Tamaño del lienzo: se lee con ResizeObserver (leer clientWidth en cada cuadro fuerza un layout).
  let cssWidth = 0, cssHeight = 0, fitTimer;
  const displayRatio = () => Math.min(window.devicePixelRatio || 1, 2);
  // Calidad adaptable: si los cuadros llegan tarde de forma sostenida, se dibuja con menos píxeles.
  let quality = 1, slowFrames = 0, fastFrames = 0;
  function adapt(interval) {
    if (interval > 1000 / fps * 1.7) { slowFrames++; fastFrames = 0; } else { fastFrames++; slowFrames = Math.max(0, slowFrames - 1); }
    if (slowFrames > 20 && quality > .7) { quality = Math.max(.7, quality - .1); slowFrames = 0; }
    if (fastFrames > 600 && quality < 1) { quality = Math.min(1, quality + .1); fastFrames = 0; }
  }
  function resize() {
    const ratio = displayRatio() * quality;
    const width = Math.round(cssWidth * ratio);
    const height = Math.round(cssHeight * ratio);
    if (width && height && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    if (!width || !height) return;
    if (!mapSize) fitMap();
    else if (!fitTimer) fitTimer = setTimeout(() => { fitTimer = 0; fitMap(); }, 400);
  }
  function draw(now) {
    if (!running) return;
    timer = requestAnimationFrame(draw);
    if (now - lastFrame < 1000 / fps - 2) return;
    // Mientras se desplaza un panel, el mapa espera: la GPU queda libre para que el scroll vaya suave.
    if (now < heldUntil) { lastFrame = 0; return; }
    if (lastFrame && document.hasFocus !== undefined) adapt(now - lastFrame);
    lastFrame = now;
    resize();
    gl.uniform1f(uniforms.time, (now - started) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  async function init(art) {
    canvas = document.createElement('canvas');
    canvas.id = 'map-life';
    canvas.className = 'map-life';
    canvas.setAttribute('aria-hidden', 'true');
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return false;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      // Las imágenes llegan como datos (art/valle/vida-datos.js) para que funcione también abriendo el juego como archivo.
      const [map, life, light] = await Promise.all([load(mapLifeArt.map), load(mapLifeArt.life), load(mapLifeArt.light)]);
      mapImage = map;
      texture(1, life, gl.LINEAR, true);
      texture(2, light, gl.LINEAR, true);
    } catch (error) {
      console.warn('Mapa sin animación:', error);
      return false;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    uniforms = {
      time: gl.getUniformLocation(program, 'uTime'),
    };
    gl.uniform1i(gl.getUniformLocation(program, 'uMap'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'uLife'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'uLight'), 2);
    gl.uniform2f(gl.getUniformLocation(program, 'uArt'), ...artSize);
    gl.uniform3fv(gl.getUniformLocation(program, 'uChimney'), chimneys.flat());
    art.after(canvas);
    new ResizeObserver(([entry]) => { cssWidth = entry.contentRect.width; cssHeight = entry.contentRect.height; }).observe(canvas);
    critterLayer = document.createElement('div');
    critterLayer.className = 'map-critters';
    critterLayer.setAttribute('aria-hidden', 'true');
    canvas.after(critterLayer);
    started = performance.now() - 40000 * Math.random();
    ready = true;
    return true;
  }

  // ─── Bichos y detalles: elementos sueltos animados con la Web Animations API ───────────────────
  const leafTrees = [[110, 70], [240, 55], [330, 115], [440, 140], [180, 170], [60, 200], [520, 60], [995, 545], [620, 300]];
  const fishSpots = [[520, 905], [690, 935], [880, 915], [1080, 880], [1270, 815], [1450, 760], [330, 935], [1160, 950]];
  const place = (element, x, y) => {
    element.style.left = x / artSize[0] * 100 + '%';
    element.style.top = y / artSize[1] * 100 + '%';
  };
  let critterLayer, critterTimers = [];
  const random = (min, max) => min + Math.random() * (max - min);
  function later(fn, min, max) {
    critterTimers.push(setTimeout(() => { if (running) fn(); }, random(min, max) * 1000));
  }
  function spawn(className, html = '') {
    const element = document.createElement('i');
    element.className = 'critter ' + className;
    element.innerHTML = html;
    critterLayer.append(element);
    return element;
  }
  const done = (animation, element) => animation.finished.then(() => element.remove(), () => element.remove());

  // Escala de la capa en píxeles por unidad de la ilustración: los bichos se mueven con transform, no con left/top.
  const layerScale = () => critterLayer.clientWidth / artSize[0] || 1;

  // Bandada: aletean unas veces y planean, cada uno a su ritmo, con su sombra sobre el valle
  // (el sol viene de arriba a la izquierda, así que la sombra cae abajo a la derecha). El filo claro
  // de las alas las separa del bosque oscuro.
  function flock() {
    const fromLeft = Math.random() < .6;
    const y = random(60, 360);
    const count = 2 + Math.floor(Math.random() * 4);
    const duration = random(18, 26) * 1000;
    const scale = layerScale();
    const lift = random(-60, 20), wobble = random(10, 22);
    for (let index = 0; index < count; index++) {
      const bird = spawn('bird', '<i class="bird-shadow"></i><svg viewBox="0 0 20 8"><path d="M1 4.6Q5 .8 9.3 4.9L10 5.9 10.7 4.9Q15 .8 19 4.6"/><path class="lit" d="M2.2 3.9Q5.2 1.2 8.8 4.3M11.2 4.3Q14.8 1.2 17.8 3.9"/></svg>');
      const dx = -index * random(18, 30), dy = (index % 2 ? 1 : -1) * Math.ceil(index / 2) * random(9, 15);
      const [x0, x1] = fromLeft ? [-60 + dx, 1650 + dx] : [1650 - dx, -60 - dx];
      place(bird, 0, 0);
      bird.style.setProperty('--size', random(.8, 1.12).toFixed(2));
      bird.style.setProperty('--flap', random(1.5, 2.2).toFixed(2) + 's');
      bird.style.setProperty('--beat', -random(0, 2).toFixed(2) + 's');
      bird.lastChild.style.scale = fromLeft ? '' : '-1 1';
      const phase = random(0, 6.3);
      const path = [0, .125, .25, .375, .5, .625, .75, .875, 1].map(k => {
        const x = x0 + (x1 - x0) * k;
        const top = y + dy + Math.sin(k * Math.PI * 3 + phase) * wobble + k * lift;
        return { transform: `translate(${(x * scale).toFixed(1)}px,${(top * scale).toFixed(1)}px)` };
      });
      done(bird.animate(path, { duration, delay: index * random(120, 260), easing: 'linear', fill: 'both' }), bird);
    }
    later(flock, 35, 80);
  }
  // Hojas secas: caen meciéndose como péndulo y giran sobre sí mismas (se ven de canto a ratos).
  function leaf() {
    const [tx, ty] = leafTrees[Math.floor(Math.random() * leafTrees.length)];
    const element = spawn('leaf', '<svg viewBox="0 0 10 6"><path d="M.5 3Q4 -.5 9.5 2.6Q5.5 6.5 .5 3Z"/><path class="vein" d="M1.2 3 8.6 2.7"/></svg>');
    element.style.setProperty('--hue', random(-22, 18).toFixed(0) + 'deg');
    place(element, tx + random(-30, 30), ty + random(-20, 20));
    const scale = layerScale();
    const drift = random(50, 120) * scale, fall = random(45, 95) * scale, swing = random(10, 20) * scale;
    const turn = random(-1, 1) < 0 ? -1 : 1;
    const frames = [0, .18, .36, .54, .72, .9, 1].map((k, i) => ({
      transform: `translate(${(drift * k + (i % 2 ? swing : -swing) * Math.sin(k * Math.PI)).toFixed(1)}px,${(fall * k).toFixed(1)}px) ` +
        `rotate(${(turn * (k * 300 + (i % 2 ? 35 : -35))).toFixed(0)}deg) rotateX(${i % 2 ? 62 : -48}deg)`,
      opacity: k === 0 || k === 1 ? 0 : 1,
      offset: k,
    }));
    done(element.animate(frames, { duration: random(5, 8) * 1000, easing: 'ease-in-out' }), element);
    later(leaf, 1.8, 5);
  }
  // Un pez salta (hacia un lado o el otro) y deja dos anillos en el agua: donde sale y donde cae.
  function fish() {
    const [x, y] = fishSpots[Math.floor(Math.random() * fishSpots.length)];
    const scale = layerScale();
    const side = Math.random() < .5 ? 1 : -1;
    const reach = random(14, 22) * side * scale, height = random(10, 16) * scale;
    const jump = spawn('fish', '<svg viewBox="0 0 12 6"><path d="M1 3Q5 .2 9 3Q5 5.8 1 3ZM9 3 12 1.2 11 3 12 4.8Z"/></svg>');
    place(jump, x, y);
    jump.firstChild.style.scale = side > 0 ? '' : '-1 1';
    done(jump.animate([
      { transform: `translate(0,0) rotate(${-50 * side}deg)`, opacity: 0 },
      { opacity: 1, offset: .1 },
      { transform: `translate(${reach / 2}px,${-height}px) rotate(0deg)`, offset: .5 },
      { transform: `translate(${reach}px,0) rotate(${55 * side}deg)`, opacity: 1, offset: .9 },
      { transform: `translate(${reach}px,${2 * scale}px) rotate(${60 * side}deg)`, opacity: 0 },
    ], { duration: random(800, 1000), easing: 'ease-in-out' }), jump);
    for (const [delay, at] of [[0, 0], [820, reach / scale]]) {
      for (const [lag, size] of [[0, 1.6], [260, 1.1]]) {
        const ring = spawn('ripple');
        place(ring, x + at, y + 2);
        done(ring.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .85 }, { transform: `translate(-50%,-50%) scale(${size})`, opacity: 0 }],
          { duration: 1500, delay: delay + lag, easing: 'ease-out', fill: 'both' }), ring);
      }
    }
    later(fish, 9, 22);
  }

  function set(active) {
    if (!ready) return;
    const on = active && !document.hidden;
    canvas.hidden = !active;
    critterLayer.hidden = !active;
    if (on === running) return;
    running = on;
    lastFrame = 0;
    if (running) {
      timer = requestAnimationFrame(draw);
      later(flock, 6, 20);
      later(leaf, 1, 3);
      later(fish, 4, 10);
    } else {
      cancelAnimationFrame(timer);
      critterTimers.forEach(clearTimeout);
      critterTimers = [];
    }
  }
  // Para revisar el efecto: dibuja el instante t (en segundos) y devuelve la imagen.
  function snapshot(t) {
    if (!ready) return '';
    resize();
    gl.uniform1f(uniforms.time, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return canvas.toDataURL('image/png');
  }
  return { init, set, snapshot, hold: ms => { heldUntil = Math.max(heldUntil, performance.now() + ms); }, release: () => { heldUntil = 0; }, show: { flock, leaf, fish }, get ready() { return ready; } };
})();
