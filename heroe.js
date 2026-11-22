'use strict';

// Héroe pintado por capas (heroe-datos.js, de las hojas 15 a 18): cuerpo con la armadura puesta, peinado o casco
// encima y el pelo y la piel recoloreados como en el retrato. Se arma en canvas una vez por combinación.
let heroAtlas;
const heroAtlasReady = new Promise(resolve => {
  heroAtlas = new Image();
  heroAtlas.onload = resolve;
  heroAtlas.onerror = resolve;
  heroAtlas.src = heroLayers.atlas;
});
const heroCache = new Map();
let heroSkinReference;
function heroLayer(name) {
  const { w, h, cols, index } = heroLayers;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const i = index[name];
  if (i !== undefined) canvas.getContext('2d').drawImage(heroAtlas, i % cols * w, Math.floor(i / cols) * h, w, h, 0, 0, w, h);
  return canvas;
}
// Color de piel de la hoja (mediana de la cara del cuerpo base), para llevarlo al tono elegido.
function heroSkinBase() {
  if (heroSkinReference) return heroSkinReference;
  const d = heroLayer('f-cuerpo0').getContext('2d').getImageData(95, 25, 40, 40).data;
  const list = [];
  for (let i = 0; i < d.length; i += 4) {
    const [h, s, v] = rgbToHsv(d[i], d[i + 1], d[i + 2]);
    if (d[i + 3] > 200 && h >= 8 && h <= 40 && s > .2 && v > .45) list.push([d[i], d[i + 1], d[i + 2]]);
  }
  list.sort((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]);
  heroSkinReference = list[list.length >> 1] || [230, 170, 130];
  return heroSkinReference;
}
function composeHero(view, face, bodyTier, helmTier) {
  const { w, h, anchors } = heroLayers;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const context = out.getContext('2d');
  const bodyName = 'cuerpo' + (bodyTier >= 0 ? bodyTier + 1 : 0);
  context.drawImage(heroLayer(view + '-' + bodyName), 0, 0);
  // Piel: cara y manos del cuerpo llevadas al tono elegido.
  const tone = skinTones[face.skin], ref = heroSkinBase();
  const gain = [tone[0] / ref[0], tone[1] / ref[1], tone[2] / ref[2]];
  const image = context.getImageData(0, 0, w, h);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const [hu, s, v] = rgbToHsv(px[i], px[i + 1], px[i + 2]);
    if (hu < 8 || hu > 40 || s < .18 || s > .72 || v < .3) continue;
    // Las armaduras de bronce y dragón tienen dorados parecidos a la piel: solo cuenta la cabeza y las manos de la túnica.
    const row = Math.floor((i >> 2) / w);
    if (row > 70 && (bodyTier >= 0 || row < 150 || row > 210)) continue;
    for (let c = 0; c < 3; c++) px[i + c] = Math.min(255, px[i + c] * gain[c]);
  }
  context.putImageData(image, 0, 0);
  // Peinado (o casco), ajustado al tamaño de la cabeza de este cuerpo.
  const top = helmTier >= 0 ? 'casco' + (helmTier + 1) : 'pelo' + face.hair;
  const head = anchors[view].head, fit = anchors[view][bodyName] || head;
  const k = fit[2] / head[2];
  const layer = heroLayer(view + '-' + top);
  if (helmTier < 0) recolorHeroHair(layer, face);
  context.drawImage(layer, fit[0] - head[0] * k, fit[1] - head[1] * k, w * k, h * k);
  return out.toDataURL('image/webp', .92);
}
function recolorHeroHair(canvas, face) {
  const palette = hairPalettes[face.hairColor];
  if (!face.hairColor || !palette) return;
  const context = canvas.getContext('2d');
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const ramp = [[0, palette[0].map(v => v * .4)], [.2, palette[0]], [.5, palette[1]], [1, palette[2]]];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const [hu, s] = rgbToHsv(px[i], px[i + 1], px[i + 2]);
    if ((hu < 8 || hu > 340) && s > .5 && face.hair === 15) continue;   // el mechón rojo se queda rojo
    const l = Math.min(1, (px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11) / 255 / .45);
    let j = 1;
    while (j < ramp.length - 1 && l > ramp[j][0]) j++;
    const [l0, c0] = ramp[j - 1], [l1, c1] = ramp[j];
    const t = Math.max(0, Math.min(1, (l - l0) / (l1 - l0)));
    for (let c = 0; c < 3; c++) px[i + c] = c0[c] + (c1[c] - c0[c]) * t;
  }
  context.putImageData(image, 0, 0);
}
// Imagen del héroe (o null mientras carga), recordada por combinación.
function heroImageUrl(view, appearance, equipped) {
  if (!heroAtlas.complete || !heroAtlas.naturalWidth) return null;
  const face = cleanFace(appearance);
  const bodyTier = metalTier(equipped.body), helmTier = metalTier(equipped.head);
  const key = [view, faceKey(face), bodyTier, helmTier].join('|');
  if (!heroCache.has(key)) {
    if (heroCache.size >= 24) heroCache.delete(heroCache.keys().next().value);
    heroCache.set(key, composeHero(view, face, bodyTier, helmTier));
  }
  return heroCache.get(key);
}
// Lo que tiene en la mano según lo que está haciendo (íconos pintados de art/objetos.webp).
function heroHeldItem(kind, equipped) {
  switch (kind) {
    case 'chop': return equipped.axe;
    case 'mine': return equipped.pick;
    case 'fight-ranged': return equipped.bow;
    case 'fight-magic': case 'rune': return equipped.staff;
    case 'cook': return { tool: 2 };
    case 'fish': return { tool: 1 };
    case 'smith': return { tool: 0 };
    case 'pray': return { tool: 14 };
    case 'fletch': return { tool: 3 };
    default: return equipped.weapon;
  }
}
const heroAura = ['', '', '', '', 'aura-mithril', 'aura-adamantita', 'aura-runico', 'aura-dragon'];
function paintedHeroArt(kind) {
  const front = heroImageUrl('f', game.appearance, game.equipped), back = heroImageUrl('b', game.appearance, game.equipped);
  if (!front || !back) return null;
  const held = heroHeldItem(kind, game.equipped);
  const shield = game.equipped.shield && kind.startsWith('fight-melee') ? itemSprite(game.equipped.shield) : '';
  const aura = heroAura[metalTier(game.equipped.body)] || '';
  return '<div class="ph' + (aura ? ' ' + aura : '') + '"><span class="ph-aura"></span><span class="hero-body">' +
    '<img class="ph-img ph-front" src="' + front + '" alt="" draggable="false"><img class="ph-img ph-back" src="' + back + '" alt="" draggable="false">' +
    (shield ? '<span class="ph-shield">' + shield + '</span>' : '') +
    (held ? '<span class="hero-work-arm ph-held' + (held.tool !== undefined ? ' ph-tool-' + held.tool : '') + '">' + (held.tool !== undefined ?
      // Herramientas de oficio pintadas (art/herramientas.webp, de la hoja 19).
      '<i class="ph-tool" style="background-position:' + (held.tool * 100 / 14).toFixed(3) + '% 0"></i>' : itemSprite(held)) + '</span>' : '') + '</span></div>';
}
heroAtlasReady.then(() => { if (typeof requestSceneFrame === 'function') { sceneHeroKey = ''; requestSceneFrame(); } });
