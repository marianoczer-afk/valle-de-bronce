'use strict';

// Retrato por capas: un peinado base (hoja-8) más capas de ojos, cejas, barba, nariz y marcas (hojas 9a y 10),
// todas alineadas al píxel, y el pelo y la piel recoloreados. Se arma en un <canvas> y se guarda como imagen.
// El mismo rostro define cómo se ve el héroe del mapa (pelo, color, piel, ojos y barba).

const faceChoices = [
  ['hair', 'Peinado', ['Puntas', 'Corto', 'Rapado', 'Pelado', 'Melena', 'Coleta', 'Rodete', 'Flequillo', 'Mohicano', 'Trenzas',
    'Rulos', 'Hacia atrás', 'Salvaje', 'Hongo', 'Medio rapado', 'Mechón rojo']],
  ['hairColor', 'Color de pelo', ['Azul noche', 'Negro', 'Castaño', 'Cobrizo', 'Rubio', 'Blanco']],
  ['eyes', 'Ojos', ['Ámbar', 'Azul', 'Verde', 'Violeta']],
  ['brows', 'Cejas', ['Normales', 'Finas', 'Gruesas', 'Fruncidas']],
  ['skin', 'Piel', ['Muy clara', 'Clara', 'Trigueña', 'Canela', 'Morena', 'Tostada', 'Oscura', 'Muy oscura']],
  ['beard', 'Barba', ['Afeitado', 'De tres días', 'Corta', 'Larga', 'Bigote', 'Candado', 'Patillas', 'Trenzada']],
  ['nose', 'Nariz', ['Normal', 'Chica', 'Recta', 'Ancha', 'Aguileña']],
  ['mark', 'Marcas', ['Ninguna', 'Cicatriz en la ceja', 'Cicatriz en la mejilla', 'Pecas', 'Pintura de guerra']],
];
// Colores de pelo: sombra, medio y luz (se reparte la luminosidad del pelo pintado entre esos tres).
const hairPalettes = [[[16, 16, 26], [40, 42, 60], [92, 94, 118]], [[14, 14, 18], [44, 42, 48], [104, 100, 110]], [[34, 20, 12], [92, 56, 32], [168, 118, 74]],
  [[48, 16, 8], [150, 62, 28], [230, 140, 80]], [[118, 74, 28], [214, 160, 66], [255, 230, 148]], [[96, 96, 104], [196, 196, 204], [250, 250, 252]]];
// Color de pelo para el héroe del mapa (vector), en el mismo orden.
const hairHexes = ['#262c52', '#26262c', '#5c3820', '#963e1c', '#d6a042', '#c4c4cc'];
// Tonos de piel: los seis primeros salen de la hoja 11; los dos últimos, más oscuros, se agregan a mano.
const skinTones = [0, 2, 7, 11, 14, 15].map(index => faceLayers.skinTones[index]).concat([[112, 70, 48], [80, 52, 38]]);
const eyeHexes = ['#d9962a', '#4f86c8', '#5f9a52', '#8a5ad8'];
const beardLayers = ['', 'barba-3dias', 'barba-corta', 'barba-larga', 'bigote', 'candado', 'patillas', 'barba-trenzada'];
const noseLayers = ['', 'nariz-chica', 'nariz-recta', 'nariz-ancha', 'nariz-aguilena'];
const markLayers = ['', 'marca-ceja', 'marca-mejilla', '', 'marca-pintura'];   // las pecas se dibujan (drawFreckles)
const eyeLayers = ['', 'ojos-azul', 'ojos-verde', 'ojos-violeta'];
// Cejas dibujadas sobre el busto (coordenadas del lienzo de 256): la hoja 9a no las separaba limpio de los ojos.
// Cada forma es [ceja cercana, ceja lejana]; 'erase' tapa primero la ceja pintada con el color de la frente.
const browShapes = [null,
  { erase: true, width: 1.7, stroke: ['M126 101.5 Q146 95.5 171 103', 'M181 106 Q188 101.5 196.5 102'] },
  { fill: ['M123 101 Q145 91.5 173 100.5 L173.5 107.5 Q150 100.5 125 104.5Z', 'M178.5 108.5 Q184 100.5 197.5 98.5 L197.5 105 Q188 104 182 109Z'] },
  { erase: true, fill: ['M124 96.5 Q150 99 172.5 104.5 L171.5 109 Q148 104 124.5 100.5Z', 'M179 109.5 Q187 103.5 197.5 99.5 L197.5 104.5 Q189 106 181.5 111Z'] }];
const browErase = ['M122 99 Q140 93 160 95.5 L175 100 L175 107.5 L160 104.5 Q140 102 123 105Z', 'M177 107.5 L184 100 L198 97.5 L198 106 L186 106.5 L179 110Z'];
function drawBrows(target, style, uncovered) {
  const shape = browShapes[style];
  if (!shape) return;
  // Se dibuja aparte y se recorta con lo que el peinado deja ver: si un flequillo tapa la ceja, la sigue tapando.
  const layer = document.createElement('canvas');
  layer.width = layer.height = faceLayers.size;
  const context = layer.getContext('2d');
  if (shape.erase) {
    // Color de la frente, justo arriba de cada ceja (si ahí hay flequillo, se usa la mejilla).
    const sample = (x, y) => { const d = target.getImageData(x, y, 1, 1).data; const [h, s, v] = rgbToHsv(d[0], d[1], d[2]);
      return d[3] > 200 && h >= 8 && h <= 48 && s > .15 && v > .45 ? d : null; };
    const skin = sample(146, 91) || sample(160, 93) || sample(150, 122);
    if (skin) {
      context.save();
      context.filter = 'blur(1.4px)';
      context.fillStyle = 'rgb(' + skin[0] + ',' + skin[1] + ',' + skin[2] + ')';
      for (const path of browErase) context.fill(new Path2D(path));
      context.restore();
    }
  }
  context.save();
  context.filter = 'blur(.35px)';
  context.fillStyle = context.strokeStyle = '#22264a';
  context.lineCap = 'round';
  context.lineWidth = shape.width || 1;
  for (const path of shape.fill || []) context.fill(new Path2D(path));
  for (const path of shape.stroke || []) context.stroke(new Path2D(path));
  context.restore();
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(uncovered, 0, 0);
  target.drawImage(layer, 0, 0);
}
// Lo que el peinado deja ver de la cara: todas las bases comparten el mismo rostro, así que donde el peinado elegido
// difiere del busto pelado hay pelo encima. Las capas de cara (cejas, ojos, nariz, marcas) solo se pintan donde se ve.
const uncoveredCache = new Map();
function uncoveredMask(hair) {
  if (uncoveredCache.has(hair)) return uncoveredCache.get(hair);
  const size = faceLayers.size;
  const base = layerCanvas('pelo' + hair).getContext('2d').getImageData(0, 0, size, size).data;
  const bald = layerCanvas('pelo3').getContext('2d').getImageData(0, 0, size, size).data;
  const mask = document.createElement('canvas');
  mask.width = mask.height = size;
  const mc = mask.getContext('2d');
  const image = mc.createImageData(size, size);
  for (let i = 0; i < base.length; i += 4) {
    const diff = Math.max(Math.abs(base[i] - bald[i]), Math.abs(base[i + 1] - bald[i + 1]), Math.abs(base[i + 2] - bald[i + 2]), Math.abs(base[i + 3] - bald[i + 3]));
    image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
    image.data[i + 3] = diff < 36 ? 255 : diff < 60 ? 255 * (60 - diff) / 24 : 0;
  }
  mc.putImageData(image, 0, 0);
  uncoveredCache.set(hair, mask);
  return mask;
}
// Pecas: puntitos del color de la piel en sombra, sobre mejillas y nariz, siempre en el mismo lugar.
function drawFreckles(context, tone) {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  context.save();
  context.fillStyle = 'rgba(' + tone.map(v => Math.round(v * .62)).join(',') + ',.55)';
  for (let k = 0; k < 34; k++) {
    const onNose = k < 6;
    const x = onNose ? 164 + random() * 12 : 132 + random() * 40, y = onNose ? 110 + random() * 8 : 116 + random() * 13;
    context.beginPath();
    context.arc(x, y, .55 + random() * .55, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

const defaultFace = () => ({ v: 2, hair: 0, hairColor: 0, eyes: 0, brows: 0, skin: 3, beard: 0, nose: 0, mark: 0 });
function cleanFace(input) {
  const face = defaultFace();
  if (input?.v === 2) {
    for (const [key, , options] of faceChoices) {
      const value = Number(input[key]);
      if (Number.isInteger(value) && value >= 0 && value < options.length) face[key] = value;
    }
  } else if (Number.isInteger(input?.portrait) && input.portrait >= 0 && input.portrait < 64) {
    // Retratos de la versión anterior (4 grupos de 16): se conserva el rasgo que se había elegido.
    const k = input.portrait % 16, group = Math.floor(input.portrait / 16);
    if (group === 0) face.hair = k;
    else if (group === 1) { face.eyes = [0, 1, 2, 3][Math.floor(k / 4)]; face.brows = k % 4; }
    else if (group === 2) Object.assign(face, [{}, { beard: 1 }, { beard: 2 }, { beard: 3 }, { beard: 4 }, { beard: 5 }, { beard: 6 }, { beard: 7 },
      { nose: 1 }, { nose: 2 }, { nose: 3 }, { nose: 4 }, { mark: 1 }, { mark: 2 }, { mark: 3 }, { mark: 4 }][k]);
    else face.skin = Math.min(7, Math.floor(k / 2));
  }
  return face;
}
const faceKey = face => faceChoices.map(([key]) => face[key]).join('.');

// ─── Armado en canvas ─────────────────────────────────────────────────────────
let faceAtlas;
const faceAtlasReady = new Promise(resolve => {
  faceAtlas = new Image();
  faceAtlas.onload = resolve;
  faceAtlas.onerror = resolve;   // si el atlas no carga, se usa el retrato de respaldo
  faceAtlas.src = faceLayers.atlas;
});
const faceCache = new Map();
function layerCanvas(name) {
  const size = faceLayers.size;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const index = faceLayers.index[name];
  if (index === undefined) return canvas;
  const x = index % faceLayers.cols * size, y = Math.floor(index / faceLayers.cols) * size;
  canvas.getContext('2d').drawImage(faceAtlas, x, y, size, size, 0, 0, size, size);
  return canvas;
}
function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max / 255];
}
function composeFacePixels(face) {
  const size = faceLayers.size;
  const out = layerCanvas('pelo' + face.hair);
  const context = out.getContext('2d');
  // Capas sobre la cara (no sobre el pelo): ojos y cejas.
  const faceMask = layerCanvas('cara' + face.hair);
  const uncovered = uncoveredMask(face.hair);
  drawBrows(context, face.brows, uncovered);
  for (const name of [eyeLayers[face.eyes]].filter(Boolean)) {
    const piece = layerCanvas(name);
    const pc = piece.getContext('2d');
    pc.globalCompositeOperation = 'destination-in';
    pc.drawImage(uncovered, 0, 0);
    context.drawImage(piece, 0, 0);
  }
  // Nariz y marcas también se recortan a la cara: así no quedan motas sobre el pelo ni fuera de la cabeza.
  for (const name of [noseLayers[face.nose], markLayers[face.mark]].filter(Boolean)) {
    const piece = layerCanvas(name);
    const pc = piece.getContext('2d');
    pc.globalCompositeOperation = 'destination-in';
    pc.drawImage(uncovered, 0, 0);
    context.drawImage(piece, 0, 0);
  }
  const beard = beardLayers[face.beard] ? layerCanvas(beardLayers[face.beard]) : null;
  if (beard) {
    const bc = beard.getContext('2d');
    bc.globalCompositeOperation = 'destination-in';
    bc.drawImage(uncovered, 0, 0);   // un mechón largo que cae adelante tapa la barba
    bc.globalCompositeOperation = 'source-over';
    context.drawImage(beard, 0, 0);
  }
  // Recolor: cada píxel se clasifica (pelo, cejas, barba, piel o resto) y después se pinta.
  // El pelo es el azul noche que queda fuera de la cara; dentro de la cara solo cuentan cejas y barba.
  const image = context.getImageData(0, 0, size, size);
  const px = image.data;
  const alphaOf = canvas => canvas.getContext('2d').getImageData(0, 0, size, size).data;
  const faceAlpha = alphaOf(faceMask);
  const openAlpha = uncovered.getContext('2d').getImageData(0, 0, size, size).data;
  const beardAlpha = beard ? alphaOf(beard) : null;
  const eyeAlpha = eyeLayers[face.eyes] ? alphaOf(layerCanvas(eyeLayers[face.eyes])) : null;
  const tone = skinTones[face.skin], ref = faceLayers.skinReference;
  const skinGain = [tone[0] / ref[0], tone[1] / ref[1], tone[2] / ref[2]];
  const palette = hairPalettes[face.hairColor];
  // Rampa de color del pelo: tinta, sombra, medio y luz.
  // La tinta del contorno no baja a casi negro en los pelos claros: así el canoso o el rubio no quedan con borde sucio.
  const light = palette && palette[1][0] + palette[1][1] + palette[1][2] > 420;
  const ramp = palette && [[0, palette[0].map(v => v * (light ? .85 : .3))], [.22, palette[0]], [.55, palette[1]], [1, palette[2]]];
  const paint = (i, l, weight = 1) => {
    const o = [px[i], px[i + 1], px[i + 2]];
    let k = 1;
    while (k < ramp.length - 1 && l > ramp[k][0]) k++;
    const [l0, c0] = ramp[k - 1], [l1, c1] = ramp[k];
    const t = Math.max(0, Math.min(1, (l - l0) / (l1 - l0)));
    for (let c = 0; c < 3; c++) px[i + c] = o[c] + (c0[c] + (c1[c] - c0[c]) * t - o[c]) * weight;
  };
  const keepStreak = face.hair === 15;
  // Luminosidad promediada 3×3, para recolorear los pelos claros sin ruido.
  const smooth = new Float32Array(size * size);
  if (light) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let sum = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
      const j = (yy * size + xx) * 4;
      if (px[j + 3] < 8) continue;
      sum += (px[j] * .3 + px[j + 1] * .59 + px[j + 2] * .11) / 255; n++;
    }
    smooth[y * size + x] = n ? sum / n : 0;
  }
  // Opacidad de la barba erosionada 1 px: el borde dentado de la capa queda con el color de abajo.
  const beardCore = new Uint8Array(size * size);
  if (beardAlpha) for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    let m = 255;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.min(m, beardAlpha[((y + dy) * size + x + dx) * 4 + 3]);
    beardCore[y * size + x] = m;
  }
  // Zona de piel: los píxeles claramente de piel y 2 px alrededor (para alcanzar sus líneas), nunca la chaqueta.
  const skinZone = new Uint8Array(size * size);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const [h, s, v] = rgbToHsv(px[i], px[i + 1], px[i + 2]);
    if (h >= 8 && h <= 48 && s > .2 && s < .75 && v > .45) {
      const p = i >> 2, x = p % size, y = (p - x) / size;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < size && yy < size) skinZone[yy * size + xx] = 1;
      }
    }
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const [h, s, v] = rgbToHsv(r, g, b);
    const lum = (r * .3 + g * .59 + b * .11) / 255;
    const inFace = faceAlpha[i + 3] > 128;
    const hairZone = openAlpha[i + 3] < 128;   // donde el peinado difiere del busto pelado
    const navy = h > 200 && h < 300 && s > .16;
    const skinLike = h >= 8 && h <= 48 && s > .18 && s < .8 && v > .42;
    const inBeard = beardAlpha && beardAlpha[i + 3] > 40 && !(skinLike && v > .5) && !(h > 36 && h < 62 && s > .45 && v > .45);
    const isBrow = !hairZone && inFace && navy && v < .5 && !(eyeAlpha && eyeAlpha[i + 3] > 20);
    const isHair = inBeard || isBrow || (hairZone && (navy || (s < .16 && v < .4) || (h >= 300 && h <= 345 && s > .2) || (!keepStreak && (h < 14 || h > 340) && s > .5 && v > .3)));
    if (isHair) {
      // En el borde de la barba se mezcla según su opacidad, para que no quede un halo claro sobre la piel.
      // El pelo azul noche ya está pintado así: solo se recolorea la barba para que haga juego.
      // En los pelos claros se usa la luminosidad suavizada y con menos contraste: sin motas oscuras en la textura.
      // En barbas claras, un punto mucho más oscuro que sus vecinos toma la luminosidad del entorno.
      const lumClean = light && inBeard && lum < smooth[i >> 2] - .12 ? smooth[i >> 2] : lum;
      const base = light ? .04 + .9 * Math.min(1, (lumClean + smooth[i >> 2]) / 2 / .5) : Math.min(1, lum / .48);
      if (face.hairColor || inBeard || isBrow) paint(i, isBrow ? Math.min(.42, base) : inBeard ? (light ? Math.min(.85, Math.max(.38, base)) : Math.min(.72, lum / .45)) : base, inBeard && !isBrow ?
        // Los píxeles claros del borde de la barba son piel mezclada: se recolorean menos, así no queda un contorno recortado.
        Math.max(0, Math.min(1, (beardAlpha[i + 3] - 30) / 170)) * (lum < .3 ? 1 : 1 - Math.max(0, Math.min(1, (lum - .34) / .16))) : 1);
    } else {
      // Peso suave de "piel": sin cortes duros, así no quedan halos claros junto a ojos, orejas y mandíbula.
      const ramp01 = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
      // Las líneas cálidas (oscuras o muy saturadas) también se tiñen, así no quedan trazos naranjas sobre la piel oscura.
      // Solo se dejan afuera el blanco de los ojos (poca saturación) y los iris brillantes.
      const p = i >> 2, px0 = p % size / size, py0 = Math.floor(p / size) / size;
      const iris = s > .68 && v > .55 && px0 > .4 && px0 < .86 && py0 > .36 && py0 < .56;
      const w = iris || !skinZone[p] ? 0 : Math.min(ramp01(h, 0, 10) || (h > 340 ? 1 : 0), 1 - ramp01(h, 46, 58), ramp01(s, .08, .2));
      // Las líneas (oscuras o muy saturadas) no pueden quedar más claras que el tono de piel elegido.
      const toneLum = (tone[0] * .3 + tone[1] * .59 + tone[2] * .11) / 255;
      const gainLum = skinGain[0] * .3 + skinGain[1] * .59 + skinGain[2] * .11;
      const extra = (s > .6 || v < .4) && lum * gainLum > toneLum * .8 ? toneLum * .8 / (lum * gainLum) : 1;
      if (w > 0) for (let c = 0; c < 3; c++) px[i + c] = Math.min(255, px[i + c] * (1 + (skinGain[c] * extra - 1) * w));
    }
  }
  context.putImageData(image, 0, 0);
  if (face.mark === 3) drawFreckles(context, tone);
  return out.toDataURL('image/webp', .92);
}
// Devuelve la imagen ya armada (o null si el atlas todavía carga) y la recuerda.
function faceImageUrl(input) {
  const face = cleanFace(input);
  const key = faceKey(face);
  if (faceCache.has(key)) return faceCache.get(key);
  if (!faceAtlas.complete) return null;
  if (!faceAtlas.naturalWidth) return 'art/portrait.webp';
  const url = composeFacePixels(face);
  // Caché chico: al probar combinaciones en el creador no crece sin límite (se va la más vieja).
  if (faceCache.size >= 32) faceCache.delete(faceCache.keys().next().value);
  faceCache.set(key, url);
  return url;
}
function faceImage(input, className = 'face-paint') {
  const url = faceImageUrl(input);
  return url ? '<img class="' + className + '" src="' + url + '" alt="" draggable="false">' : '<span class="' + className + '"></span>';
}
// Lo que el rostro le cambia al héroe del mapa (dibujado en vector).
function heroLookFromFace(input) {
  const face = cleanFace(input);
  const tone = skinTones[face.skin];
  return {
    skin: '#' + tone.map(v => v.toString(16).padStart(2, '0')).join(''),
    hairColor: hairHexes[face.hairColor],
    hairStyle: [0, 1, 3, 3, 2, 2, 2, 2, 3, 2, 1, 1, 2, 1, 3, 0][face.hair],
    bald: face.hair === 3,
    streak: face.hair === 15 || face.hair === 0 ? '#c8323a' : '',
    eye: eyeHexes[face.eyes],
    beard: [0, 1, 1, 2, 0, 0, 1, 2][face.beard],
    goatee: face.beard === 5 ? 1 : 0,
    mustache: face.beard === 4,
    scar: face.mark === 1 ? 1 : face.mark === 2 ? 2 : 0,
  };
}
