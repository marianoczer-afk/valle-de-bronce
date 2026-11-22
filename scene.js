'use strict';

// Escena del mapa: el personaje camina, trabaja y pelea donde está la actividad.
// Todo acá es visual. Las reglas del juego viven en game.js.

const valleyArt = 'art/valle/';
const windPatches = [
  ['pinos-bosque', 414, 116, 140, 206, 'leaves'],
  ['pinos-hogar', 490, 311, 160, 143, 'leaves'],
  ['arbustos-mercado', 16, 350, 110, 139, 'leaves'],
  ['pino-muelle', 372, 575, 87, 137, 'leaves'],
  ['pinos-orilla', 1007, 561, 171, 111, 'leaves'],
  ['matorral-cantera', 987, 14, 130, 98, 'leaves'],
  ['net-muelle', 378, 701, 66, 83, 'canvas'],
  ['banderas-hogar', 534, 442, 87, 55, 'canvas'],
  ['banderas-forja', 914, 408, 69, 60, 'canvas'],
  ['toldos-mercado-lado', 236, 417, 182, 91, 'canvas'],
  ['pendon-izquierda', 620, 155, 35, 67, 'canvas'],
  ['hojas-oeste', 67, 49, 180, 158, 'leaves'],
  ['hojas-cantera', 1439, 346, 143, 207, 'leaves'],
  ['hojas-hogar', 756, 577, 125, 110, 'leaves'],
  ['hojas-santuario', 442, 593, 113, 123, 'leaves'],
  ['pastos-muelle', 438, 795, 112, 95, 'leaves'],
  ['copa-bosque', 266, 4, 177, 172, 'leaves'],
  ['copa-senda', 905, 286, 141, 147, 'leaves'],
  ['toldo-cantera', 1155, 180, 143, 69, 'canvas'],
  ['toldo-mercado', 150, 449, 143, 65, 'canvas'],
  ['vela-muelle', 87, 718, 79, 111, 'canvas'],
  ['toldo-hogar', 840, 454, 143, 64, 'canvas'],
  ['pendon-campo', 870, 145, 39, 75, 'canvas'],
  ['hierbas-orilla', 1332, 632, 103, 91, 'leaves'],
  ['agua-muelle', 0, 840, 680, 135, 'water', -1.9],
  ['agua-centro', 650, 827, 524, 152, 'water', -4],
  ['agua-forja', 1091, 668, 494, 235, 'water', -.5],
];
function renderValleyAmbience() {
  const style = (x, y, w, h) => 'left:' + x / 15.85 + '%;top:' + y / 9.92 + '%;width:' + w / 15.85 + '%;height:' + h / 9.92 + '%';
  const overlays = windPatches.map(([name, x, y, w, h, kind, delay = 0]) => {
    const water = kind === 'water';
    const file = valleyArt + name + (water ? '.png' : '-aire.webp');
    // loading=lazy: con el mapa vivo estas capas están ocultas y el navegador ni las descarga.
    const layer = phase => '<img alt="" draggable="false" loading="lazy" class="valley-motion ' + kind +
      '" src="' + file + '" style="' + style(x, y, w, h) + ';--phase:' + phase + 's">';
    return water ? layer(delay) + layer(delay - 2.6) : layer(0);
  });
  const fires = [[910, 522, 29, 35, 0], [1327, 493, 40, 38, -.31], [658, 738, 24, 24, -.55]];
  byId('map-ambience').innerHTML = overlays.join('') + fires.map(([x, y, w, h, delay]) =>
    '<span class="valley-fire" style="' + style(x, y, w, h) + ';--phase:' + delay + 's">' +
    '<i class="fire-light"></i><img alt="" src="' + valleyArt + 'llama.png"><i class="fire-ember"></i></span>').join('') +
    '<div class="valley-chimney" style="' + style(823, 317, 52, 41) + '">' +
    ('<img alt="" src="' + valleyArt + 'humo-chimenea.png">').repeat(2) + '</div>';
}

// ─── Arte de los personajes del mapa ─────────────────────────────────────────
// Vector pintado: color base, sombra cálida, luz desde arriba a la izquierda y contorno marrón oscuro,
// para que el personaje y los rivales convivan con el mapa ilustrado. Solo se animan transform y opacity.
const warmInk = '#2a1a11';
const toneCache = new Map();
// Mezcla un color hacia una sombra cálida (negativo) o una luz de vela (positivo).
function sceneTone(hex, amount) {
  const key = hex + amount;
  let value = toneCache.get(key);
  if (value) return value;
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const target = amount < 0 ? [38, 22, 20] : [255, 238, 200];
  const k = Math.abs(amount);
  value = '#' + rgb.map((v, i) => Math.round(v + (target[i] - v) * k).toString(16).padStart(2, '0')).join('');
  toneCache.set(key, value);
  return value;
}
const fillPath = (d, fill, extra = '') => '<path d="' + d + '" fill="' + fill + '"' + extra + '/>';
const strokePath = (d, color, width = 1, extra = '') => '<path d="' + d + '" fill="none" stroke="' + color +
  '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"' + extra + '/>';
const inkPath = (d, width = 1.3) => strokePath(d, warmInk, width);
// Una forma pintada: base, sombra y luz dentro de la silueta, y el contorno por encima de todo.
function form(d, base, shade, light, width = 1.3) {
  return fillPath(d, base) + (shade ? fillPath(shade, sceneTone(base, -.36)) : '') +
    (light ? fillPath(light, sceneTone(base, .32)) : '') + inkPath(d, width);
}
const dot = (x, y, r, fill, extra = '') => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"' + extra + '/>';
// Brillo de ojo: halo suave y núcleo, se lee aun a 30 px.
const glowEye = (x, y, r, color) => dot(x, y, r * 2.1, color, ' opacity=".25"') + dot(x, y, r, color) + dot(x - r * .3, y - r * .3, r * .38, '#fff8e0');
// Tramo del metal de una pieza (bronce 0 … dragón 7) a partir del nombre; −1 si no es de metal.
const metalNames = metals.map((metal, tier) => [metal.name, tier]).concat([['runita', 6], ['dracónit', 7]])
  .sort((a, b) => b[0].length - a[0].length);
const metalTier = item => {
  if (!item) return -1;
  const name = item.toLowerCase().replace('rúnic', 'rúnico');
  return metalNames.find(([metal]) => name.includes(metal))?.[1] ?? -1;
};
const trimGold = '#e0b450';
const capeColors = {
  attack: '#8c2a2a', strength: '#3f6e3a', defence: '#3b5a9a', hitpoints: '#a8353a', ranged: '#55732c', prayer: '#d9cfb1',
  magic: '#36479e', runecraft: '#c97b2a', fletching: '#2f6b6b', slayer: '#34302e', mining: '#55697a', smithing: '#7f6033',
  fishing: '#467ea0', cooking: '#66305f', woodcutting: '#617f33',
};

// Herramientas dibujadas en su propio marco: el puño en (0, 0) y el mango hacia +y.
// La mano las coloca girando el marco; el brazo entero gira desde el hombro en cada animación.
const heldTools = {
  sword: (color, tier) => fillPath('M-1.5 2.2 L-1.5 16.5 L0 20 L1.5 16.5 L1.5 2.2Z', color) +
    fillPath('M.2 2.6 L1.5 2.6 L1.5 16.5 L.2 19Z', sceneTone(color, -.3)) + strokePath('M-.5 3.5 V16', sceneTone(color, .55), .55) +
    inkPath('M-1.5 2.2 L-1.5 16.5 L0 20 L1.5 16.5 L1.5 2.2Z', 1) +
    form('M-4.4 .8 H4.4 L4 2.6 H-4Z', tier >= 3 ? trimGold : '#8a6a3c', '', '', 1) +
    form('M-1 -3.6 H1 V.8 H-1Z', '#5a3a24', '', '', .9) + dot(0, -4.2, 1.3, tier >= 3 ? trimGold : '#a88c5c', ' stroke="' + warmInk + '" stroke-width=".8"'),
  pick: color => form('M-1 -3 H1 L1 16 H-1Z', '#9a6a3c', 'M.1 -3 H1 V16 H.1Z', '', 1) +
    form('M-11 18.6 Q-5 12.6 0 12.6 Q5 12.6 10 16.6 Q5 15.6 0 16 Q-5 16 -11 18.6Z', color, 'M-11 18.6 Q-5 16 0 16 Q5 15.6 10 16.6 Q5 15 0 15 Q-5 15 -11 18.6Z', 'M-8 15.6 Q-4 13.4 0 13.4 Q-4 14.6 -8 15.6Z', 1) +
    form('M-2 11.6 H2 V17 H-2Z', sceneTone(color, -.2), '', '', .9),
  axe: color => form('M-1 -3 H1 L1 17 H-1Z', '#9a6a3c', 'M.1 -3 H1 V17 H.1Z', '', 1) +
    form('M-1 11 L-6.6 8.4 Q-10.4 13.6 -7 19.6 L-1 16.6Z', color, 'M-1 14.4 L-8.6 17.4 Q-8 18.8 -7 19.6 L-1 16.6Z', 'M-2.4 10.8 L-6.2 9.4 Q-7.6 11.4 -7.6 13Z', 1) +
    strokePath('M-7 9 Q-10 13.8 -7.2 19', sceneTone(color, .6), .6) + form('M1 12 L3.4 12.8 V15.2 L1 16Z', sceneTone(color, -.15), '', '', .9),
  hammer: color => form('M-1 -3 H1 L1 13 H-1Z', '#9a6a3c', 'M.1 -3 H1 V13 H.1Z', '', 1) +
    form('M-4.6 11.6 H4.6 V17.4 H-4.6Z', color, 'M-4.6 15.6 H4.6 V17.4 H-4.6Z', 'M-4 12.2 H3.6 V13.2 H-4Z', 1),
  ladle: () => form('M-.9 -2 H.9 L.9 15 H-.9Z', '#a87a48', '', '', .9) + form('M-3.4 15.6 Q0 13.4 3.4 15.6 Q3 19.4 0 19.8 Q-3 19.4 -3.4 15.6Z', '#7d5a3a', '', '', .9),
  knife: () => form('M-.8 -1.6 H.8 V3 H-.8Z', '#6a4a2c', '', '', .8) + form('M-1 3 H1 L.4 10.6 L-1 9Z', '#d8d4c8', '', '', .8),
  rod: () => strokePath('M0 3 L0 -33', warmInk, 2.4) + strokePath('M0 3 L0 -33', '#b58650', 1.2) +
    form('M-1.2 -1 H1.2 V3.4 H-1.2Z', '#4a3020', '', '', .8) + dot(0, -6, 1.6, '#8a8780', ' stroke="' + warmInk + '" stroke-width=".7"') +
    strokePath('M0 -33 Q14 -22 23 10', '#efe3c2', .55, ' opacity=".7"'),
  bow: color => strokePath('M-1.4 -15 Q8.4 0 -1.4 15', warmInk, 3.6) + strokePath('M-1.4 -15 Q8.4 0 -1.4 15', color, 2) +
    strokePath('M-1.4 -15 Q8.4 0 -1.4 15', sceneTone(color, .45), .6, ' transform="translate(-.6 0)"') +
    strokePath('M-1.4 -15 L-7 0 L-1.4 15', '#efe6cf', .55) +
    '<g class="hero-arrow">' + strokePath('M-7 0 H11', warmInk, 1.9) + strokePath('M-7 0 H11', '#c49a5a', .9) +
    fillPath('M10 -1.8 L14.6 0 L10 1.8Z', '#cfd3d6', ' stroke="' + warmInk + '" stroke-width=".7"') +
    fillPath('M-7.4 -1.8 L-4.4 0 L-7.4 1.8 L-6 0Z', '#efe6cf') + '</g>',
  staff: color => strokePath('M0 -22 L0 14', warmInk, 3) + strokePath('M0 -22 L0 14', '#7a5632', 1.6) +
    strokePath('M-.4 -20 L-.4 12', '#a8814f', .5) + inkPath('M-2.4 -21.6 Q0 -18 2.4 -21.6', 1) +
    '<g class="hero-orb">' + dot(0, -24.6, 5.2, color, ' opacity=".28"') + dot(0, -24.6, 3, color, ' stroke="' + warmInk + '" stroke-width=".9"') +
    dot(-.9, -25.6, 1, '#fffbe8') + '</g>',
};
// Herramienta, color y giro dentro de la mano para cada actividad.
function heroTool(kind, equipped) {
  const colorOf = (slot, fallback) => equipped[slot] ? iconSpec(equipped[slot])[1] : fallback;
  const tierOfSlot = slot => metalTier(equipped[slot]);
  switch (kind) {
    case 'chop': return ['axe', colorOf('axe', '#a7a59d'), -24];
    case 'mine': return ['pick', colorOf('pick', '#a7a59d'), -24];
    case 'smith': return ['hammer', '#77736c', -24];
    case 'cook': return ['ladle', '', -24];
    case 'fletch': return ['knife', '', -40];
    case 'fish': return ['rod', '', 90];
    case 'fight-ranged': return ['bow', colorOf('bow', '#a9743f'), 82];
    case 'fight-magic': case 'rune': return ['staff', colorOf('staff', '#b9a8f0'), 48];
    case 'pray': return;
    default: return equipped.weapon ? ['sword', colorOf('weapon'), kind === 'fight-melee' ? -24 : -24, tierOfSlot('weapon')] : undefined;
  }
}
// `look` describe a cualquier figura humana (el héroe, el Capitán, el Caballero negro).
function knightFigure(look) {
  const { skin, hairStyle, hairColor, beard, goatee, body, legs, head, shield, hands, cape, tool, tabard } = look;
  const ink = warmInk;
  const cloth = '#6b4a2d';
  const torsoColor = body ? body.color : cloth;
  const sleeve = body ? sceneTone(body.color, -.08) : '#7c3b2c';
  const legColor = legs ? legs.color : '#4b3d30';
  const bootColor = legs ? sceneTone(legs.color, -.3) : '#3d2a1c';
  const handColor = hands ? hands.color : body && body.tier >= 2 ? sceneTone(body.color, -.12) : skin;
  const trim = tier => tier >= 3 ? trimGold : '';
  let art = '';
  if (cape) {
    art += '<g class="hero-cape">' + form('M26.4 28.4 L38 28.4 L34.6 44 L31.6 64.4 Q23 66 14.6 61.6 Q18.6 47 22.4 35Z', cape,
      'M30 33 L35.8 33 L34.6 44 L31.6 64.4 Q27.4 65.2 24.4 64.8 Q29 48 30 33Z', 'M21.4 39 Q23 33 25.8 30 Q22.6 44 18.4 56 Q19 47 21.4 39Z') +
      strokePath('M15.6 60.4 Q23 64.4 31.2 63', trimGold, 1.3) + '</g>';
  }
  // Piernas: se dibujan en grupos para que el paso las gire desde la cadera.
  const leg = (cls, x, shadeAmount) => {
    const base = sceneTone(legColor, shadeAmount);
    const boot = sceneTone(bootColor, shadeAmount);
    let g = '<g class="' + cls + '">' +
      form('M' + (x - .2) + ' 49 H' + (x + 6) + ' L' + (x + 5.4) + ' 59 L' + (x + 5) + ' 67.6 H' + (x + .2) + ' L' + x + ' 59Z', base,
        'M' + (x + 3.8) + ' 49.6 H' + (x + 6) + ' L' + (x + 5.4) + ' 59 L' + (x + 5) + ' 67.2 H' + (x + 3.4) + ' L' + (x + 3.6) + ' 59Z',
        'M' + (x + .6) + ' 50 H' + (x + 2) + ' L' + (x + 1.8) + ' 58 H' + (x + .8) + 'Z');
    if (legs && legs.tier >= 0) g += form('M' + (x + .4) + ' 57 Q' + (x + 3) + ' 55 ' + (x + 5.6) + ' 57 Q' + (x + 5.2) + ' 61 ' + (x + 3) + ' 61.4 Q' + (x + .8) + ' 61 ' + (x + .4) + ' 57Z', sceneTone(base, .12), '', '', 1);
    g += form('M' + (x - .4) + ' 66.6 H' + (x + 5.6) + ' L' + (x + 6.6) + ' 69.4 L' + (x + 8.4) + ' 70.2 Q' + (x + 8.8) + ' 72.2 ' + (x + 7) + ' 72.2 H' + (x - .6) + 'Z',
      boot, 'M' + (x - .6) + ' 70.6 H' + (x + 8.6) + ' Q' + (x + 8.6) + ' 72.2 ' + (x + 7) + ' 72.2 H' + (x - .6) + 'Z', '', 1.1);
    return g + '</g>';
  };
  art += leg('hero-leg-a', 25, -.16) + leg('hero-leg-b', 33.6, 0);
  art += '<g class="hero-body">';
  // Brazo de atrás: con escudo va delante del torso (se lee mejor); sin escudo, detrás.
  const rearArm = '<g class="hero-rear-arm">' +
    form('M22 29.8 Q26.4 28.6 27 32 L26.6 38.6 L25.4 43.8 L21.8 43.8 L22.2 38.6 L21.4 33Z', sceneTone(sleeve, -.12), 'M24.6 31 Q26.6 31 27 32 L26.6 38.6 L25.4 43.8 L24 43.8Z', '') +
    dot(23.6, 45.1, 2.2, sceneTone(handColor, -.1), ' stroke="' + ink + '" stroke-width="1.1"') + (shield ? shieldArt(shield) : '') + '</g>';
  if (!shield) art += rearArm;
  // Torso, faldón y cinturón.
  art += form('M22.8 46.6 H41.4 L43 53.4 Q32 55 21.4 53.4Z', body ? sceneTone(torsoColor, -.1) : '#5a3d25',
    'M35 47.4 H41.4 L43 53.4 Q39 54.2 35.8 54.3Z', 'M23.6 47.6 H27 L25.8 53.6 Q23.6 53.5 22.4 53.3Z');
  if (body && body.tier >= 0) art += strokePath('M27.6 48 L27 53.8 M32.4 48 V54.6 M37 48 L37.6 54.2', sceneTone(torsoColor, -.45), .7);
  art += form('M23.4 29.4 Q32 25.4 41.6 29.4 L41.2 40 Q40.4 44 41.4 48.6 H22.8 Q23.8 44 23 40Z', torsoColor,
    'M36.5 28 Q40 28.6 41.6 29.4 L41.2 40 Q40.4 44 41.4 48.6 H37.4 Q38.6 40 36.5 28Z',
    'M24.8 30.6 Q28.4 28.2 31.6 27.8 Q29 33 28.6 40 L24.6 40.6 Q24.8 35 24.8 30.6Z');
  if (tabard) art += form('M28.4 30.4 H37.2 L37.6 52 L33 55.4 L28 52Z', tabard, 'M34.4 30.4 H37.2 L37.6 52 L33 55.4 L34 51Z', '', 1.1) +
    strokePath('M30.4 37 H35.4 M32.9 34 V42', trimGold, 1.1);
  else if (body && body.tier >= 0) {
    const t = body.tier;
    const dark = sceneTone(torsoColor, -.45);
    art += strokePath('M33 30 Q33.8 38 33 45', dark, .8);
    if (t <= 1) art += strokePath('M24.6 35.8 Q32 38 40.8 35.8 M24.2 40.4 Q32 42.6 40.6 40.4', dark, .7, ' opacity=".8"');
    else art += strokePath('M25.6 32 Q30 36 32.6 30.6', sceneTone(torsoColor, .55), .9);
    if (t === 7) art += strokePath('M26 36l2 1.8 2-1.8 2 1.8 2-1.8 2 1.8 2-1.8M26 40l2 1.8 2-1.8 2 1.8 2-1.8 2 1.8 2-1.8', dark, .7);
    if (trim(t)) art += strokePath('M25.2 30.2 Q32 27.2 40.2 30.2', trim(t), 1.2) + strokePath('M23.2 44.8 H41.3', trim(t), .8);
    if (t === 6) art += fillPath('M33 33.6 l1.2 2.4 2.6.4 -1.9 1.8 .5 2.6 -2.4-1.2 -2.4 1.2 .5-2.6 -1.9-1.8 2.6-.4z', trimGold, ' stroke="' + ink + '" stroke-width=".6"');
  }
  art += form('M22.7 45 H41.6 L41.7 47.8 H22.6Z', '#4a3020', '', '', 1.1) +
    form('M33.4 44.9 H36.6 V47.9 H33.4Z', '#d9b24a', '', '', .8);
  if (!body) art += form('M25.4 28.4 Q32 31.8 39.8 28.4 L40 31.2 Q32 34.8 25.2 31.2Z', '#8c3a2e', 'M33 31.6 Q37 31 40 29.8 L40 31.2 Q36 33 33 33.2Z', '', 1.1);
  if (shield) art += rearArm;
  art += knightHead(look);
  // Brazo de trabajo: herramienta en la mano, el brazo entero gira desde el hombro.
  art += '<g class="hero-work-arm"' + (look.armAngle ? ' transform="rotate(' + look.armAngle + ' 39.5 30.5)"' : '') + '>' +
    form('M37.2 29.6 Q41.8 28.6 42.6 32 L43.2 38.5 L44.2 43.6 L40.6 44.4 L39.6 39 L37.6 33Z', sleeve,
      'M41 30.6 Q42.4 31 42.6 32 L43.2 38.5 L44.2 43.6 L42.4 44 Z', 'M38 31 Q39.6 30 40.6 30.4 L40.2 37 L39.2 36Z');
  if (hands || body && body.tier >= 2) art += form('M39.8 39.8 L43.6 39.2 L44.3 43.6 L40.6 44.4Z', handColor, '', '', 1);
  if (tool) {
    const [name, color, angle, tier] = tool;
    art += '<g class="hero-held hero-held-' + name + '" transform="translate(42.4 45.2) rotate(' + angle + ')">' + heldTools[name](color, tier) + '</g>';
  }
  art += dot(42.4, 45.2, 2.3, handColor, ' stroke="' + ink + '" stroke-width="1.1"');
  if (body && body.tier >= 1) {
    const t = body.tier;
    const pad = t >= 7 ? 'M35.4 29.8 L37 25.6 L39.4 28 L41.6 24.6 L43 28.6 L45.6 28 Q45.6 33.6 41.6 34.4 Q37.6 34.2 35.4 31.6Z' :
      t >= 4 ? 'M35.6 29.6 Q40.4 24.6 45.4 29.2 Q45.8 34 41.8 34.6 Q37.6 34.4 35.6 31.6Z' :
      'M36.2 29.6 Q40.5 26.2 44.4 29.8 Q44.6 33.4 41.6 34 Q38 33.8 36.2 31.4Z';
    art += form(pad, torsoColor, 'M41.6 29 Q44 29 45 30 Q45.4 33.6 41.8 34.4Z', 'M37 29.4 Q39.4 27.4 41.4 27.6 Q39 29 37.6 31Z', 1.1);
    if (trim(t)) art += strokePath('M36.6 31.6 Q40.4 34.6 44.6 31.4', trim(t), .9);
  }
  art += '</g>';
  return art + '</g>';
}
function shieldArt({ color, tier }) {
  const kite = tier >= 2;
  const d = kite ? 'M13.4 32.4 Q21 29.8 28.6 32.4 L28.2 40 Q26.2 48.4 21 53.4 Q15.8 48.4 13.8 40Z' :
    'M14 33.4 Q21 30.8 28 33.4 L27.6 41 Q26 47.6 21 50.2 Q16 47.6 14.4 41Z';
  const shade = kite ? 'M21 31 Q25 31 28.6 32.4 L28.2 40 Q26.2 48.4 21 53.4Z' : 'M21 31.8 Q25 32 28 33.4 L27.6 41 Q26 47.6 21 50.2Z';
  let art = form(d, color, shade, kite ? 'M15 33.6 Q18 32.4 20 32.2 L19.6 40 L15.4 39.6Z' : 'M15.4 34.4 Q18 33.2 20 33 L19.6 40 L15.8 39.8Z', 1.3);
  if (tier >= 3) art += strokePath(kite ? 'M15.4 33.8 Q21 31.8 26.6 33.8 L26.2 40 Q24.6 46.8 21 50.8 Q17.4 46.8 15.8 40Z' :
    'M15.8 34.6 Q21 32.6 26.2 34.6 L25.8 41 Q24.4 46 21 48.2 Q17.6 46 16.2 41Z', trimGold, .9);
  if (tier >= 2) art += fillPath('M21 36.6 l1.5 3 3.2.4 -2.3 2.2 .6 3.2 -3-1.5 -3 1.5 .6-3.2 -2.3-2.2 3.2-.4z', tier >= 3 ? trimGold : sceneTone(color, .5),
    ' stroke="' + warmInk + '" stroke-width=".7"');
  else art += dot(21, 40.4, 2, sceneTone(color, .35), ' stroke="' + warmInk + '" stroke-width=".9"');
  return art;
}
function knightHead(look) {
  const { skin, hairStyle, hairColor, beard, goatee, head } = look;
  const ink = warmInk;
  const fullHelm = head && head.tier >= 2 && head.tier <= 6;
  let art = form('M29.4 24.4 H35 V29.4 H29.4Z', sceneTone(skin, -.22), '', '', 1);
  if (fullHelm && !look.faceless && hairStyle === 2) art += form('M23.4 18 Q22 26 24 30 Q27 30.6 29.4 29 L29 20Z', hairColor, '', '', 1.1);
  if (!fullHelm && hairStyle === 2) art += form('M23 26.4 Q20.4 14 24 9 Q29 5 35 6 Q41 8 40.6 13 L30 17 L30.4 27.6 Q26 28.6 23 26.4Z', hairColor,
    'M23 26.4 Q22 22 22.4 18 Q25 22 30.2 23 L30.4 27.6 Q26 28.6 23 26.4Z', '', 1.1);
  // Cara de tres cuartos mirando a la derecha, con nariz marcada para que se lea el sentido.
  art += form('M24 15.4 Q24 7 32 7 Q39.6 7 40.6 13.6 L42 17.8 L40.4 19.2 L40.2 22 Q38.4 26.2 33 26.2 Q27 26.2 25 22Z', skin,
    'M25 21.4 Q28.4 25.8 33.2 26 Q38 25.8 40 22.2 Q36 24.4 31.4 23.6 Q27.4 23 25 21.4Z',
    'M27.4 11 Q31 8.6 36 9.6 Q31.4 10.6 28.8 13Z');
  art += dot(36, 20.4, 1.7, '#d0705a', ' opacity=".28"') +
    '<ellipse cx="29.4" cy="18.4" rx="1.5" ry="2.1" fill="' + sceneTone(skin, -.25) + '" stroke="' + ink + '" stroke-width=".8"/>' +
    '<ellipse cx="37.6" cy="16.6" rx=".95" ry="1.35" fill="#1e1410"/>' + strokePath('M35.6 14.2 L39 13.6', sceneTone(hairColor, .1), .9) +
    strokePath('M37.4 22.4 H39.6', sceneTone(skin, -.5), .7);
  if (!head || !fullHelm) {
    const hair = [
      'M23.6 17 Q22.6 7 31 6 Q39 5.4 40.6 12 Q36 9.6 33 10.6 Q30 11.2 29 14 L28.6 19 L26 21.6Z',
      'M24 16 Q23.6 7.4 31.6 6.4 Q39.6 6.4 40.2 12.4 Q35 11 31 11.6 L29 16Z',
      'M23.4 18 Q22.6 7 31 6 Q39.4 5.6 40.6 12.4 Q36 10.2 32.4 11.2 L30 16.6 L29.4 21Z',
      '',
      'M23.6 17 Q22.6 7 31 6 Q39 5.4 40.6 12 Q36 9.6 33 10.6 Q30 11.2 29 14 L28.6 19 L26 21.6Z',
    ][hairStyle] || '';
    if (hair && !head) art += form(hair, hairColor, 'M23.6 17 Q23.4 12 26 9.4 Q26 14 28.6 19 L26 21.6Z', 'M27 8.4 Q31 6.4 35.6 7.2 Q31 8 28.2 10Z', 1.1);
    else if (hair) art += form('M23.8 17 Q23.4 14 24.4 13 H29.4 L28.8 19 L26 21.4Z', hairColor, '', '', 1);
    if (hairStyle === 3 && !head) art += fillPath('M24.6 14 Q25 8 31.4 7.2 Q37.6 7 39.6 11', 'none', ' stroke="' + sceneTone(skin, -.3) + '" stroke-width="1.2" opacity=".6"');
    if (hairStyle === 4 && !head) art += strokePath('M26.4 10.4 Q30.4 7.2 35.4 7.4', '#b9aca0', 1.4);
  }
  if (beard && !(head && head.tier >= 2 && head.tier <= 6)) art += form(beard === 2 ? 'M30 21.4 Q33 26 38.6 22.4 L40.4 19.4 L41.2 23.6 Q39.4 28.6 34 28.6 Q29.6 28 28.6 23.4Z' :
    'M31 22.6 Q34 25.6 38.8 22.6 L40.4 19.6 L40.8 23.4 Q39 27 34.2 27.2 Q30.8 26.8 30 24Z', hairColor, '', '', 1);
  else if (goatee && !(head && head.tier >= 2 && head.tier <= 6)) art += form('M37 22.8 Q38.8 27.4 40.2 22.8Z', hairColor, '', '', .9);
  if (head) {
    const { color, tier } = head;
    if (fullHelm) {
      // Yelmo cerrado: visera, remaches y adorno según el tramo.
      art += form('M23 18.4 Q22.4 6 32 5.6 Q41.6 5.6 42.2 15 L42.4 23 Q38.4 27.4 32 27.4 Q25.4 27 23.4 22.4Z', color,
        'M23.2 19 Q24.4 25 32 27 Q38.6 27 42.4 23 L42.4 21 Q37 24.8 31 24.4 Q25.6 23.4 23.2 19Z', 'M25.4 13 Q26.4 7.6 32.4 7 Q27.6 9.4 26.8 15.2Z');
      art += form('M33.6 14.6 H42.2 V17.6 H33.8Z', '#1b1512', '', '', .8) + strokePath('M35.4 20.2 h.1M37.6 20.2h.1M39.8 20.2h.1', sceneTone(color, -.5), 1.1);
      if (tier >= 3) art += strokePath('M23.4 19.6 Q32 22.6 42.2 19', trimGold, .9) + strokePath('M32 5.8 V14.4', trimGold, .9);
      if (tier === 4) art += '<g class="hero-plume">' + form('M30 6.6 Q24 1 17 4.6 Q21 5 23 8.6 Q26 6.4 30 8.4Z', '#dfe9f2', '', '', 1) + '</g>';
      if (tier === 5) art += form('M27 7.4 L23.4 1.2 L30.6 6Z', sceneTone(color, .35), '', '', 1) + form('M35 6.4 L38.4 .6 L39.4 7.8Z', sceneTone(color, .35), '', '', 1);
      if (tier === 6) art += '<g class="hero-plume">' + form('M31 6.4 Q26 -1 16.6 3.4 Q20.8 4 22.4 7.6 Q25.6 5 31 8.6Z', '#b8322a',
        'M22.4 7.6 Q25.6 5 31 8.6 L31 7.4 Q26 4.4 22 6.4Z', '', 1) + '</g>';
    } else {
      // Yelmo abierto (bronce, hierro) y el yelmo medio de dragón con su cresta.
      art += form('M23.6 16.4 Q23 5.8 32 5.4 Q40.6 5.4 41.4 13.6 L41.6 15 Q34 12.8 30 14 L29 17.2 Z', color,
        'M23.6 16.4 Q23.6 13 25 11.4 Q26 14.4 29 17.2Z', 'M26 10.8 Q28 7.4 32.6 7 Q28.6 8.8 27.6 12Z');
      art += form('M38.6 13.2 H40.8 V20.4 H38.8Z', sceneTone(color, -.15), '', '', .9);
      if (tier === 1) art += form('M29.6 14.2 H32.6 V21.4 Q31 22.4 29.8 21.6Z', sceneTone(color, -.1), '', '', .9);
      if (tier === 7) art += form('M24.6 9.6 L22 2.4 L27.2 6.2 L28.4 -.2 L31.8 5.4 L34.6 1.6 L35.4 6.6Z', sceneTone(color, -.2), '', 'M27.2 6.2 L28.4 -.2 L29.4 5Z', 1);
      if (tier === 7) art += strokePath('M24 14.6 Q32 11.4 41.4 13.6', trimGold, .9);
    }
  }
  return art;
}
// ─── Héroe estilo anime ─────────────────────────────────────────────────────
// Diseño del dueño (Referencias/heroe-anime-prototipo.png): pelo azul noche en puntas con un mechón rojo,
// ojos ámbar, túnica oscura de cuello alto con ribete dorado, capa azul forrada en celeste con broche de hoja,
// mangas blancas arremangadas, guantes sin dedos y correas de cuero. Lienzo 64 × 96, piso en y = 92.
// Sombreado cel de dos tonos más un brillo; el contorno es el mismo marrón oscuro del resto de la escena.
const animeTunic = '#2b2733';
const animeLeather = '#6b4127';
const animeCape = '#2d3d8f';
const animeLining = '#62b6d6';
function animeLeg(cls, x, darker, look) {
  const pants = sceneTone(look.legs ? look.legs.color : '#2c2833', darker);
  const boot = sceneTone('#4a3122', darker);
  let g = '<g class="' + cls + '">' +
    form('M' + (x - .4) + ' 53 H' + (x + 6) + ' L' + (x + 5.4) + ' 71 L' + (x + 4.8) + ' 85 H' + (x + .4) + ' L' + (x + .2) + ' 71Z', pants,
      'M' + (x + 3.8) + ' 54 H' + (x + 6) + ' L' + (x + 5.4) + ' 71 L' + (x + 4.8) + ' 84.6 H' + (x + 3.2) + ' L' + (x + 3.6) + ' 71Z', '');
  if (!look.legs) g += strokePath('M' + (x + 5.2) + ' 55 L' + (x + 4.6) + ' 82', '#b98c46', .6, ' opacity=".9"');
  else {
    g += form('M' + (x + .2) + ' 64 Q' + (x + 3) + ' 62 ' + (x + 5.8) + ' 64 Q' + (x + 5.4) + ' 69.4 ' + (x + 3) + ' 70 Q' + (x + .6) + ' 69.4 ' + (x + .2) + ' 64Z',
      sceneTone(look.legs.color, .1), '', 'M' + (x + 1) + ' 64.4 Q' + (x + 2.6) + ' 63.2 ' + (x + 4) + ' 63.4 Q' + (x + 2) + ' 65 ' + (x + 1.6) + ' 66.6Z', 1);
    g += form('M' + (x + .4) + ' 71 H' + (x + 5.4) + ' L' + (x + 4.8) + ' 82 H' + (x + .6) + 'Z', look.legs.color,
      'M' + (x + 3.4) + ' 71 H' + (x + 5.4) + ' L' + (x + 4.8) + ' 82 H' + (x + 3) + 'Z', '', 1);
  }
  g += form('M' + (x - .2) + ' 80.6 H' + (x + 5.4) + ' L' + (x + 6) + ' 87.4 L' + (x + 8.6) + ' 88.6 Q' + (x + 9.2) + ' 91.8 ' + (x + 7) + ' 91.8 H' + (x - .6) + 'Z',
    boot, 'M' + (x - .6) + ' 89.8 H' + (x + 9) + ' Q' + (x + 9) + ' 91.8 ' + (x + 7) + ' 91.8 H' + (x - .6) + 'Z', '', 1.1) +
    strokePath('M' + (x - .1) + ' 82.2 H' + (x + 5.5), sceneTone(boot, .3), .9);
  return g + '</g>';
}
function animeArm(cls, x, look, rear) {
  // Brazo: manga oscura, puño blanco arremangado, antebrazo, guante sin dedos y mano. Gira desde el hombro.
  const k = rear ? -.14 : 0;
  const sleeve = sceneTone(look.body ? look.body.color : animeTunic, k);
  const glove = sceneTone(look.hands ? look.hands.color : '#2a2420', k);
  const skin = sceneTone(look.skin, k);
  const d = rear ? -2.4 : 0;
  return form('M' + (x - 2.2) + ' 29.6 Q' + (x + 2.4) + ' 28.6 ' + (x + 3.2) + ' 32 L' + (x + 3.4) + ' 39.6 L' + (x - 1.2) + ' 40 L' + (x - 2) + ' 33Z', sleeve,
      'M' + (x + 1.2) + ' 30.4 Q' + (x + 2.8) + ' 30.8 ' + (x + 3.2) + ' 32 L' + (x + 3.4) + ' 39.6 L' + (x + 1.6) + ' 39.8Z', '') +
    form('M' + (x - 1.6) + ' 38.6 H' + (x + 3.8) + ' L' + (x + 4) + ' 42.8 H' + (x - 1) + 'Z', sceneTone('#ece4d6', k),
      'M' + (x - 1.2) + ' 41.4 H' + (x + 4) + ' V42.8 H' + (x - 1) + 'Z', '', 1) +
    form('M' + (x - .6) + ' 42.6 H' + (x + 3.6) + ' L' + (x + 4) + ' 48.6 H' + x + 'Z', skin, 'M' + (x + 2) + ' 42.8 H' + (x + 3.6) + ' L' + (x + 4) + ' 48.6 H' + (x + 2.6) + 'Z', '', 1) +
    form('M' + (x - .2) + ' 47 H' + (x + 4.2) + ' L' + (x + 4.4) + ' 50.6 H' + x + 'Z', glove, '', '', 1) +
    (d ? '' : '');
}
function animeHead(look) {
  const ink = warmInk;
  const skin = look.skin;
  const hair = look.hairColor;
  const streak = look.streak;
  const helm = look.head;
  let art = '';
  // Pelo de atrás: la silueta en puntas que se lee de lejos.
  // Cada opción de pelo es una silueta propia: puntas (la del diseño), corto, melena, rapado y puntas con mechón gris.
  const style = look.hairStyle || 0;
  const back = [
    'M27 22 L19 21 L23.6 17.4 L15 14 L23 11.4 L17.6 5 L25.6 6.6 L24 -.4 L30.4 3.6 L33.6 -2 L36.6 3.6 L43 .4 L41.8 6.6 L47.4 7.4 L42.6 11 L43.4 13.4 Q39 8 33 8.6 Q28 9 27.6 14Z',
    'M27 20 L22 19 L24.6 16 L20 13.6 L24.6 11 L22 6.6 L27 7.4 L27.6 3 L31.6 5.4 L34 2.4 L36.4 5.4 L40.6 4 L40.6 8 L43.6 9.6 L42.6 12 Q39 8 33 8.6 Q28 9 27.6 14Z',
    'M28 27 L20 31 L22.4 25 L15 23 L21 18.6 L15 12 L23 10.6 L19 4.6 L26 5.4 L26 -.4 L31.6 3.6 L34.6 -1 L37 4 L43 2 L42 7 L46.4 8.6 L42.6 11.6 L43 13.4 Q39 8 33 8.6 Q28 9 27.6 14Z',
    'M27.4 18 Q25.6 7 33 6.2 Q40.6 6 41.6 11.6 Q38 9 33 9.4 Q28.6 10 28 14Z',
  ][style === 4 ? 0 : style] || '';
  const backShade = style === 3 ? '' : 'M27 22 L19 21 L23.6 17.4 L15 14 L23 11.4 L27.6 14Z';
  if (!look.bald) art += '<g class="hero-hair">' + form(back, hair, style === 0 || style === 4 ? backShade : '', style === 3 ? '' : 'M25.6 6.6 L24 -.4 L30.4 3.6 L33.6 -2 L34 3 Q29 3.4 26.6 7Z', 1.2) +
    (streak && style !== 3 ? fillPath('M15 14 L23 11.4 L24.6 13.4Z', streak) : '') + '</g>';
  art += form('M30.2 21 H35 L35.4 28 H29.6Z', sceneTone(skin, -.24), '', '', 1);
  art += '<ellipse cx="29.4" cy="16" rx="1.6" ry="2.3" fill="' + sceneTone(skin, -.2) + '" stroke="' + ink + '" stroke-width=".9"/>';
  // Cara de tres cuartos con mentón fino.
  art += form('M26.6 12 Q27 6.6 33 6.4 Q39.6 6.6 40.6 12.6 L40.8 15.6 L41.8 17.4 L40.6 18.2 Q40 21.4 37.2 23.4 Q35.2 24.6 33.4 24.2 Q30 23.4 28.2 20.4 Q26.6 17 26.6 12Z', skin,
    'M27 14 Q27.4 18.6 29.4 21.2 Q31 22.6 31.6 21.6 Q29.4 19 29 14Z', 'M34 8.6 Q38 8.4 39.6 11.6 Q36.4 10 34.4 10.6Z', 1.2);
  art += fillPath('M27 12.4 Q31 11.2 34 12.8 Q37 11.6 40.6 12.8 L40.7 14 Q37 13 34 14.4 Q30.6 13 27.2 14.2Z', sceneTone(skin, -.26), ' opacity=".85"');
  // Ojo grande ámbar con brillo, pestaña gruesa y ceja.
  art += fillPath('M34.8 14.8 Q37.4 13.2 40 14.4 L39.6 17.8 Q37.2 18.4 35.2 17.2Z', '#fbf3e6') +
    '<ellipse cx="37.9" cy="16" rx="1.5" ry="2" fill="' + look.eye + '"/>' +
    fillPath('M36.4 14.6 Q37.9 13.8 39.4 14.6 L39.4 15.6 Q37.9 14.9 36.4 15.6Z', sceneTone(look.eye, -.5)) +
    dot(38.1, 16.3, .7, '#1a0e08') + dot(37.4, 15.3, .48, '#fff') +
    strokePath('M34.4 14.7 Q37.4 12.4 40.4 13.8', ink, 1.35) + strokePath('M34.4 11.4 Q37.4 10.2 40.4 11.6', sceneTone(hair, -.2), 1.05) +
    strokePath(['M37.4 21.2 Q38.4 21.7 39.4 21', 'M37.4 21.3 H39.4', 'M37.2 20.8 Q38.4 22.2 39.6 20.6'][look.mouth || 0], '#7a3a2c', .7) + strokePath('M40.8 15.6 L41.8 17.4 L40.6 18.2', sceneTone(skin, -.4), .6);
  if (look.beard === 2) art += form('M30.6 20.6 Q33 24.6 36 24.4 Q39.4 23.6 40.4 19.4 Q41 24 39.4 26.6 Q37.4 29.6 35.4 29.4 Q32.6 28.6 31 25 Q30.2 23 30.6 20.6Z', hair, '', '', .9);
  else if (look.beard) art += fillPath('M31.6 20.8 Q33.6 24.4 36.6 24.2 Q39.6 23.4 40 19.6 Q39.8 23.6 37.4 24.6 Q34.6 25.4 32.6 23.6Z', sceneTone(hair, .1), ' opacity=".75"');
  if (look.mustache || look.beard === 2) art += fillPath('M36.4 20.6 Q38.2 19.8 39.8 20.6 Q38.4 20.6 37.6 21.2 Q37 20.6 36.4 20.8Z', hair);
  // Flequillo en puntas sobre la frente, con el mechón rojo adelante.
  if (look.goatee) art += form(look.goatee === 2 ? 'M35 23.6 L36 27.4 L37 25.6 L38 27.4 L39 23Z' : 'M35.4 23.6 Q37 26.8 38.6 23.2Z', hair, '', '', .8);
  if (look.scar) art += strokePath(look.scar === 1 ? 'M39.6 10.6 L37.4 15' : 'M33 18.4 L36 21', '#f0b8a0', .8);
  if (look.bald) return art + fillPath('M30 8.4 Q33 6.8 36.6 7.6 Q33.6 8 31 9.6Z', '#fff', ' opacity=".35"') + helmArt(look);
  if (style === 3) return art + strokePath('M29.6 8.6 Q33 6.8 37.4 7.6', sceneTone(hair, .55), .6, ' opacity=".6"') + helmArt(look);
  art += '<g class="hero-bangs">' + form(style === 1 ? 'M26.6 13.4 Q26 6 33 5.6 Q41 5.6 43 11.4 L44 13 L41.4 12.2 L40.4 13.4 L39 11.6 L37.4 12.8 L36.4 11 L34.4 12.4 L33.6 10.6 L30.6 12.4 L30 10.6 L27.4 14Z' :
    'M26.6 13.4 Q26 6 33 5.4 Q41.4 5.2 43.4 11.6 L45.6 14.2 L41.8 12.8 L41.2 14.6 L39.4 12.2 L37.4 13.8 L36.4 11.4 L34 13.6 L33.4 11 L30.4 13.4 L30 10.6 L27.4 15.4Z', hair,
    'M43.4 11.6 L45.6 14.2 L41.8 12.8 L41.2 14.6 L39.4 12.2 Q41 11 43.4 11.6Z', 'M29 8.6 Q32 6.6 36.4 6.8 Q32.4 7.8 30.2 9.6Z', 1.2) +
    (streak ? form('M36.4 11.4 L37.4 13.8 L39.4 12.2 Q38.6 9 35.4 8.2 Q36.6 9.8 36.4 11.4Z', streak, '', '', .8) : '') +
    strokePath('M29.6 8.6 Q33 6.8 37.4 7.6', sceneTone(hair, .55), .7, ' opacity=".8"') + '</g>';
  return art + helmArt(look);
}
function helmArt(look) {
  const helm = look.head;
  let art = '';
  if (helm) {
    const { color, tier } = helm;
    // Yelmo abierto: deja ver la cara; el adorno crece con el tramo.
    art += form('M26.2 12.6 Q25.6 4.4 33 4 Q41 4.2 42 11.4 L42 12.6 Q37.6 10.6 33 11 Q29 11.2 26.2 12.6Z', color,
      'M36 4.6 Q41 5.6 42 11.4 L42 12.6 Q39.6 11.4 37.4 11Z', 'M28 9.4 Q29 5.6 33 5.2 Q29.6 7 29.4 10.2Z', 1.2) +
      form('M26.4 12.4 L29.6 11.6 L30.4 20 Q28.4 20.4 27.2 18.6Z', sceneTone(color, -.12), '', '', 1);
    if (tier >= 1) art += form('M40.4 10.6 H42.2 V17 H40.6Z', sceneTone(color, -.15), '', '', .9);
    if (tier >= 3) art += strokePath('M26.6 12.2 Q33 9.8 41.8 11.8', trimGold, .9) + strokePath('M33 4.2 V10.6', trimGold, .8);
    if (tier === 4) art += '<g class="hero-plume">' + form('M30 5 Q22 -1 15 3.4 Q20 3.6 22 7.2 Q25.6 4.6 30 7Z', '#e2ecf4', '', '', 1) + '</g>';
    if (tier === 5) art += form('M28 6 L23.6 -.6 L31 4.6Z', sceneTone(color, .35), '', '', 1) + form('M36.4 4.6 L39.6 -1.4 L40.6 6.4Z', sceneTone(color, .35), '', '', 1);
    if (tier === 6) art += '<g class="hero-plume">' + form('M31 4.8 Q25.4 -2.6 15.6 2 Q20 2.6 21.8 6.4 Q25.4 3.6 31 7Z', '#b8322a', '', '', 1) + '</g>';
    if (tier === 7) art += form('M27 7 L24 .4 L29.4 4.2 L30.8 -2 L33.8 3.6 L37 -.6 L37.4 4.6Z', sceneTone(color, -.2), '', 'M29.4 4.2 L30.8 -2 L31.6 3Z', 1);
  }
  return art;
}
function animeFigure(look) {
  const ink = warmInk;
  const cape = look.cape || animeCape;
  const lining = look.cape ? sceneTone(look.cape, .45) : animeLining;
  const tunic = animeTunic;
  let art = '';
  // Capa de atrás: cae hasta las rodillas y se abre hacia atrás; el forro celeste asoma en el borde.
  art += '<g class="hero-cape">' + form('M25.6 28 L38.4 28.6 L35.6 48 L34 79 Q23 82.6 11 77.4 Q16 58 21 38Z', cape,
    'M30.4 33 L36.2 33 L35.6 48 L34 79 Q29.6 80.4 25.4 80.6 Q30 58 30.4 33Z', 'M19.6 44 Q21.4 36 24.6 31 Q20.4 50 15 70 Q16.4 56 19.6 44Z') +
    fillPath('M11 77.4 Q16 58 21 38 L22.8 39.4 Q18.4 58 14.4 77.6Z', lining) +
    strokePath('M11.6 77.6 Q22.6 82 33.6 79', trimGold, 1.2) + fillPath('M18 70 L20.6 66 L21.6 70.6 L19.6 72Z', trimGold, ' opacity=".9"') + '</g>';
  art += animeLeg('hero-leg-a', 25, -.18, look) + animeLeg('hero-leg-b', 33.4, 0, look);
  art += '<g class="hero-body">';
  const rearArm = '<g class="hero-rear-arm">' + animeArm('', 24.2, look, true) +
    dot(24.4, 51.8, 2.2, sceneTone('#2a2420', -.1), ' stroke="' + ink + '" stroke-width="1.1"') +
    (look.shield ? '<g transform="translate(.8 7)">' + shieldArt(look.shield) + '</g>' : '') + '</g>';
  if (!look.shield) art += rearArm;
  // Faldón de la túnica con ribete, torso de cuello alto, correa cruzada, cinturón con hebilla y bolso.
  art += form('M22.6 50.6 H41.6 L43.6 58.6 Q32 60.4 20.6 58.6Z', sceneTone(tunic, .04), 'M35 51 H41.6 L43.6 58.6 Q39 59.6 36 59.6Z', '', 1.2) +
    strokePath('M21.2 57.8 Q32 59.4 43 57.8', trimGold, .8);
  const body = look.body;
  art += form('M23.6 29.6 Q32 26.4 41.4 29.6 L41 44 Q40.4 49 41.6 53 H22.6 Q23.6 49 23 44Z', tunic,
    'M36.4 28.4 Q40 28.8 41.4 29.6 L41 44 Q40.4 49 41.6 53 H37.6 Q39 42 36.4 28.4Z', 'M25 31 Q28.4 28.8 31 28.6 Q29 34 28.6 42 L24.8 42.6Z') +
    strokePath('M32.4 29 V44', trimGold, .7) + strokePath('M30.6 31 L34.2 31.8 M30.6 33.6 L34.2 34.4 M30.6 36.2 L34.2 37', '#d9cdb8', .45, ' opacity=".7"');
  if (body && body.tier >= 0) {
    const t = body.tier;
    art += form('M24.8 31.4 Q32 28.6 40.4 31.4 L40 44.6 Q32 47 24.6 44.6Z', body.color,
      'M35.6 30 Q38.6 30.4 40.4 31.4 L40 44.6 Q37.6 45.6 35.6 46 Q37.6 38 35.6 30Z', 'M26.4 32.6 Q29 30.6 31.4 30.2 Q29.6 35 29.4 41 L26.2 41.6Z', 1.2);
    art += strokePath('M32.6 30 Q33.2 38 32.6 45.6', sceneTone(body.color, -.45), .7);
    if (t <= 1) art += strokePath('M25.4 36.4 Q32 38.4 40 36.4 M25.2 40.6 Q32 42.6 40 40.6', sceneTone(body.color, -.4), .6);
    if (t === 7) art += strokePath('M27 36.4l2 1.6 2-1.6 2 1.6 2-1.6 2 1.6 2-1.6M27 40.4l2 1.6 2-1.6 2 1.6 2-1.6 2 1.6 2-1.6', sceneTone(body.color, -.45), .6);
    if (t >= 3) art += strokePath('M25.4 31.6 Q32 28.8 39.8 31.6 M24.8 44.4 Q32 46.6 39.8 44.4', trimGold, .9);
    if (t === 6) art += fillPath('M32.6 34.4 l1.1 2.2 2.4.4-1.7 1.6.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.6 2.4-.4z', trimGold, ' stroke="' + ink + '" stroke-width=".5"');
  }
  art += form('M23.4 31.4 L26 29.8 L41.6 49.6 L39.2 50.8Z', animeLeather, '', '', 1) + form('M31.2 39 H34 V41.6 H31.2Z', '#c7c9c4', '', '', .6) +
    form('M22.6 49.2 H41.8 V52.6 H22.6Z', animeLeather, 'M22.6 51.4 H41.8 V52.6 H22.6Z', '', 1.1) +
    form('M33.2 48.8 H37.6 V53 H33.2Z', '#c9ccc8', '', '', .9) + fillPath('M34.4 50 H36.4 V51.8 H34.4Z', animeLeather) +
    form('M38.2 52 H44.2 V58.8 Q41.2 60.4 38.2 58.8Z', '#8a5a32', 'M41.6 52 H44.2 V58.8 Q42.8 59.6 41.6 59.8Z', '', 1.1) +
    form('M38 51.6 H44.4 L44 54.8 H38.4Z', '#9c6a3c', '', '', .9);
  // Capucha recogida en la nuca y cuello alto.
  art += form('M21.6 29.4 Q19.4 22.4 25.8 21 Q28.4 24 28.6 28.4Z', cape, 'M21.6 29.4 Q20.6 25 22.6 22.6 Q24 26 26 28.8Z', '', 1.1);
  art += '<g transform="translate(33 25) scale(1.1) translate(-33 -25)">' + animeHead(look) + '</g>';
  art += form('M27.6 24.2 L36.8 23.8 L38.4 29.6 Q32.4 31.6 26.2 29.6Z', tunic, 'M34 24 L36.8 23.8 L38.4 29.6 Q36 30.4 34.6 30.6Z', '', 1.1) +
    strokePath('M27.4 24.4 L36.8 24 L38.2 29.4', trimGold, .7);
  // Esclavina de la capa sobre los hombros, con el broche de hoja dorado.
  art += '<g class="hero-mantle">' + form('M22.6 29 Q31 25.6 37.4 28.6 Q34.6 33.6 31.6 34.4 Q26.6 35 23.6 37.6 Q20.6 34 22.6 29Z', cape,
    'M23.6 37.6 Q22 35 22.2 32 Q26 33.4 31.6 34.4 Q26.6 35 23.6 37.6Z', 'M24 30 Q28 28 32 28 Q27 29.6 24.6 32Z', 1.1) +
    strokePath('M23.8 37.4 Q27.4 34.6 31.6 34.4', lining, .9) + strokePath('M23.4 37.8 Q27.4 35.2 31.8 35', trimGold, .6) + '</g>';
  if (look.shield) art += rearArm;
  // Brazo de trabajo con la herramienta en la mano.
  art += '<g class="hero-work-arm"' + (look.armAngle ? ' transform="rotate(' + look.armAngle + ' 39.5 30.5)"' : '') + '>' + animeArm('', 39.6, look, false);
  if (look.tool) {
    const [name, color, angle, tier] = look.tool;
    art += '<g class="hero-held hero-held-' + name + '" transform="translate(41.8 52) rotate(' + angle + ')">' + heldTools[name](color, tier) + '</g>';
  }
  art += dot(41.8, 52, 2.3, look.hands ? look.hands.color : '#2a2420', ' stroke="' + ink + '" stroke-width="1.1"') +
    fillPath('M42.4 50.4 Q44.4 51 44 53 Q43 54 42 53.6Z', look.skin) + '</g>';
  // Hombrera de la capa (o de la armadura) por encima del brazo.
  const pad = body && body.tier >= 1;
  const padColor = pad ? body.color : cape;
  art += '<g class="hero-mantle">' + form(body && body.tier >= 7 ? 'M35.4 29.6 L37 25.4 L39.4 27.8 L41.6 24.4 L43 28.4 L46 28 Q46 34.4 41.6 35.2 Q37.6 35 35.4 32Z' :
    'M35.4 29.4 Q40.6 25.4 45.6 29.8 Q46.2 35 42 35.6 Q37.6 35.4 35.4 32Z', padColor,
    'M41.6 29 Q44.6 29 45.6 30.6 Q46 34.6 42 35.6Z', 'M36.6 29.4 Q39.4 27.4 41.6 27.6 Q39 29.2 37.4 31.6Z', 1.1) +
    (pad && body.tier >= 3 ? strokePath('M36 32.2 Q40.4 35.6 45.4 32.4', trimGold, .8) : '') +
    (pad ? '' : strokePath('M35.8 32.4 Q40 35.4 45.4 33', lining, .8)) +
    fillPath('M30.6 33.6 L32.6 28.4 L34.8 33.6 L32.6 32.4Z M29.4 31.4 L31.6 30.4 L31.4 32.8Z M35.8 31.4 L33.6 30.4 L33.8 32.8Z', trimGold, ' stroke="' + ink + '" stroke-width=".55"') + '</g>';
  art += '</g>';
  return art;
}
// Arma la figura del héroe con el equipo, la apariencia y la capa de 99 de la partida.
function heroEquipmentArt(kind) {
  // Héroe pintado (heroe.js) cuando sus capas ya cargaron; el vectorial queda de respaldo.
  const painted = typeof paintedHeroArt === 'function' && paintedHeroArt(kind || '');
  if (painted) return painted;
  const equipped = game.equipped;
  const face = heroLookFromFace(game.appearance);
  const piece = slot => equipped[slot] ? { color: iconSpec(equipped[slot])[1], tier: metalTier(equipped[slot]) } : undefined;
  const hasCape = game.cape && keys.includes(game.cape) && lv(game.cape) === 99;
  const look = {
    ...face, skin: sceneTone(face.skin, .08), mouth: 0,
    body: piece('body'), legs: piece('legs'), head: piece('head'), shield: piece('shield'), hands: piece('hands'),
    cape: hasCape ? capeColors[game.cape] || '' : '',
    tool: heroTool(kind || '', equipped),
  };
  return '<svg viewBox="0 0 64 96" xmlns="http://www.w3.org/2000/svg">' +
    '<ellipse class="hero-shadow" cx="31" cy="92" rx="16" ry="3.6" fill="#1d1109" opacity=".22"/>' +
    '<ellipse class="hero-shadow" cx="31.6" cy="91.8" rx="10" ry="2.3" fill="#1d1109" opacity=".38"/>' +
    (paintedHero ? paintedFigure(kind, look) : animeFigure(look)) + '</svg>';
}
// ─── Héroe pintado (diseño del dueño, Referencias/heroe-anime-prototipo.png) ───────────────────────
// Recortado en partes (art/heroe/*.webp, ver art-source/heroe-partes.py) y armado con los mismos grupos
// que el héroe vectorial, así las animaciones de caminar, trabajar y pelear siguen funcionando.
const paintedHero = false;
const heroParts = { brazo: [150, 372, 234, 441], 'brazo-sin-hacha': [194, 372, 190, 243], 'brazo-atras': [0, 437, 93, 369],
  cuerpo: [14, 33, 370, 991], 'pierna-a': [35, 760, 115, 342], 'pierna-b': [171, 760, 158, 342] };
const heroScale = 92 / 1112;
const heroU = x => +((x - 192) * heroScale + 32).toFixed(2);
const heroV = y => +(y * heroScale + 1).toFixed(2);
const heroPivot = (x, y) => ' style="transform-origin:' + heroU(x) + 'px ' + heroV(y) + 'px"';
function heroPart(name) {
  const [x, y, w, h] = heroParts[name];
  return '<image href="art/heroe/' + name + '.webp" x="' + heroU(x) + '" y="' + heroV(y) + '" width="' + +(w * heroScale).toFixed(2) +
    '" height="' + +(h * heroScale).toFixed(2) + '" preserveAspectRatio="none"/>';
}
function paintedFigure(kind, look) {
  // Con el hacha pintada en la mano mientras tala o descansa; para lo demás, la herramienta del oficio.
  const paintedAxe = !kind || kind === 'chop' || kind === 'trade';
  let art = '<g class="hero-leg-a"' + heroPivot(105, 770) + '>' + heroPart('pierna-a') + '</g>' +
    '<g class="hero-leg-b"' + heroPivot(215, 770) + '>' + heroPart('pierna-b') + '</g>';
  art += '<g class="hero-body"' + heroPivot(192, 1000) + '>';
  art += '<g class="hero-rear-arm"' + heroPivot(55, 452) + '>' + heroPart('brazo-atras') + '</g>';
  art += heroPart('cuerpo');
  art += '<g class="hero-work-arm"' + heroPivot(335, 420) + '>' + heroPart(paintedAxe ? 'brazo' : 'brazo-sin-hacha');
  if (!paintedAxe && look.tool) {
    const [name, color, angle, tier] = look.tool;
    art += '<g class="hero-held hero-held-' + name + '" transform="translate(' + heroU(222) + ' ' + heroV(585) + ') rotate(' + angle + ')">' +
      heldTools[name](color, tier) + '</g>' + heroPart('brazo-sin-hacha').replace('<image', '<image class="hero-grip" style="clip-path:inset(55% 0 0 0)"');
  }
  return art + '</g></g>';
}
// Ya no se usa en el mapa (la herramienta va en la mano), pero otras vistas pueden pedir el ícono de la actividad.
const toolShapes = { mine: 'pick', chop: 'axe', fish: 'rod', smith: 'hammer', 'fight-melee': 'sword', 'fight-ranged': 'bow', train: 'sword' };
function toolIcon(kind) {
  const shape = toolShapes[kind];
  if (!shape) {
    const carried = kind === 'fight-magic' ? game.equipped.staff : !kind && game.equipped.weapon;
    return carried ? itemIcon(carried) : '';
  }
  const slot = { pick: 'pick', axe: 'axe', sword: 'weapon', bow: 'bow' }[shape];
  const item = slot && game.equipped[slot];
  return item ? itemIcon(item) : icon(shape, '#b9c0bc');
}
function activityKind(task) {
  if (task.enemy) return 'fight-' + task.style;
  return { mining: 'mine', woodcutting: 'chop', fishing: 'fish', smithing: 'smith', cooking: 'cook',
    fletching: 'fletch', runecraft: 'rune', prayer: 'pray' }[task.skill] || (task.effect === 'prayer' ? 'pray' : 'trade');
}
// En la arena el héroe pelea en el centro del ruedo (no contra la cerca del fondo), así la cámara de combate lo encuadra entero.
const heroSpot = id => id === 'arena' ? { x: 432, y: 160 } : { x: zones[id][2], y: zones[id][3] - 32 };

const workPropImage = key => '<img alt="" class="work-prop-sprite" src="' + valleyArt + key + '.png">';
const propArt = {
  mine: color => '<img alt="" class="work-prop-sprite" src="' + valleyArt + 'roca-pintada.webp">' + '<svg class="work-prop-effect" viewBox="0 0 128 100">' +
    '<path d="m38 57 7-4 6 5-7 4zm22-9 7-4 4 5-7 4zm17 19 7-1 3 6-6 3z" fill="' + color + '" stroke="#29291e" stroke-width="1.1"/>' +
    '<path class="tool-debris" d="m40 57-9-7 11 4zm6-2 2-12 3 10zm4 2 13-3-8 7z" fill="' + color + '"/>' +
    // Grietas que avanzan con cada golpe del ciclo; al terminarlo la roca se desmorona y vuelven a cero.
    '<path class="rock-crack crack-1" d="M44 46 L49 53 L45 59 L50 66" fill="none" stroke="#17130f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path class="rock-crack crack-2" d="M49 53 L58 55 L63 51 M45 59 L38 64 M50 66 L57 71" fill="none" stroke="#17130f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path class="rock-spark" d="M40 50 l2-6 1 6 6-2-5 4 4 5-6-3-2 6-1-6-6 1 5-4z" fill="#ffe7a0"/></svg>',
  chop: (_, task) => {
    return '<span class="tree-shadow"></span><img alt="" class="tree-crown" src="' + valleyArt + 'arbol-pintado.webp">' +
      '<svg class="tree-chips" viewBox="0 0 40 28"><path d="m16 15-6-5 7 2zM18 15l2-10 2 9zm2 2 9-4-5 6zm-5 2-9 3 4-5z" fill="#d7a464"/></svg>' +
      // Hojas que se sueltan de la copa con cada hachazo.
      '<i class="tree-leaf leaf-1"></i><i class="tree-leaf leaf-2"></i><i class="tree-leaf leaf-3"></i>';
  },
  fish: () => '<svg viewBox="-20 -14 40 24"><g class="prop-ripple" fill="none" stroke="#d6f3ea" stroke-width="1.4"><ellipse rx="9" ry="3"/><ellipse rx="15" ry="5" opacity=".5"/></g>' +
    '<g class="prop-bob"><circle r="3.4" cy="-2" fill="#e5533d"/><path d="M-3.4-2a3.4 3.4 0 0 1 6.8 0z" fill="#f4eee0"/></g></svg>',
  // El yunque ya está pintado en la Herrería: solo se agregan el brillo y las chispas del golpe.
  smith: () => '<svg class="work-prop-effect" viewBox="0 0 128 100">' +
    '<path class="prop-glow" d="m39 32 15-4 12 4-14 3z" fill="#ffae58"/>' +
    '<path class="tool-debris" d="m47 28-11-8 13 6zm6-2 1-13 3 12zm4 2 16-12-8 13z" fill="#ffc16b"/></svg>',
  // Caldero en vector, con el mismo contorno y sombra cel del héroe: trípode, fuego que respira, guiso que burbujea y vapor.
  cook: () => '<svg viewBox="0 0 128 100" class="cook-pot">' + '<ellipse cx="64" cy="92" rx="42" ry="6" fill="#1d1109" opacity=".3"/>' +
    pairStroke('M28 94 L62 12 M100 94 L66 12 M64 10 V14', '#9a6236', 3) +
    fform('M36 86 L88 78 L90 84 L38 92Z', '#8a5530', 'M38 89 L89 81 L90 84 L38 92Z', '') + fform('M40 78 L92 88 L89 93 L37 83Z', '#a8683a', '', 'M42 79 L90 88 L89 89 L41 80Z') +
    '<g class="stove-flame">' + fillPath('M44 86 Q40 68 52 58 Q52 70 58 68 Q56 54 66 44 Q68 60 75 62 Q79 55 79 48 Q90 64 84 86Z', '#ff7a2a') +
    fillPath('M52 86 Q50 72 59 65 Q61 74 66 72 Q66 63 71 58 Q78 70 76 86Z', '#ffc23a') + fillPath('M59 86 Q59 77 64 72 Q69 79 69 86Z', '#fff4c0') + '</g>' +
    strokePath('M64 14 V30', '#3a3440', 1.6) + strokePath('M37 41 Q64 12 91 41', warmInk, 3.4) + strokePath('M37 41 Q64 12 91 41', '#5a5a6a', 1.6) +
    fform('M33 40 Q31 70 48 77 H80 Q97 70 95 40Z', '#3c3c4c', 'M76 41 H95 Q97 70 80 77 H70 Q88 64 76 41Z', 'M37 46 Q37 64 46 71 Q41 60 42 46Z') +
    fform('M41 76 L39 83 H47 L48 77Z M80 77 L81 83 H89 L87 76Z', '#2c2c38', '', '') +
    '<ellipse cx="64" cy="40" rx="32" ry="7.6" fill="#55556a" stroke="' + warmInk + '" stroke-width="1.7"/>' +
    '<ellipse cx="64" cy="41" rx="26" ry="5" fill="#e0883a" stroke="' + warmInk + '" stroke-width="1"/>' +
    fillPath('M44 41 Q64 37 84 41 Q64 39.4 44 41Z', '#ffc070') +
    '<g class="stew-bubbles">' + dot(54, 41, 1.8, '#ffd08a', ' class="stew-bubble"') + dot(70, 40, 1.4, '#ffd08a', ' class="stew-bubble b2"') + dot(62, 42.4, 1.2, '#ffd08a', ' class="stew-bubble b3"') + '</g>' +
    strokePath('M41 47 Q41 60 46 68', '#fff', 1.2, ' opacity=".35"') +
    '<g class="stove-steam">' + strokePath('M56 34 Q52 26 58 20 Q64 14 58 6', '#fffaf0', 2.6, ' opacity=".7"') + '</g>' +
    '<g class="stove-steam s2">' + strokePath('M72 34 Q76 26 70 20 Q66 14 72 8', '#fffaf0', 2.2, ' opacity=".6"') + '</g></svg>',
  fletch: () => '<svg viewBox="-20 -16 40 22"><ellipse cx="0" cy="3" rx="16" ry="3.5" fill="#0005"/><rect x="-15" y="-7" width="30" height="9" rx="4" fill="#8a6038"/>' +
    '<ellipse cx="15" cy="-2.5" rx="3" ry="4.5" fill="#caa26a"/><path d="M-9-7l4-6M0-7l4-6" stroke="#e7cf9f" stroke-width="1.4"/></svg>',
  train: () => '<svg viewBox="-16 -40 32 46"><ellipse cy="4" rx="13" ry="4" fill="#0005"/><path d="M-2 5V-24H2V5ZM-13-18H13V-14H-13Z" fill="#624d36"/>' +
    '<path d="M-8-22H8V-7H-8Z" fill="#b89050"/><circle cy="-28" r="6" fill="#c79f61"/></svg>',
  rune: () => '<svg viewBox="-24 -14 48 28"><g class="prop-spin" fill="none" stroke="#c9b4ff" stroke-width="1.5"><ellipse rx="20" ry="8"/>' +
    '<path d="M-12-5 12 5M-12 5 12-5" opacity=".7"/></g></svg>',
  pray: () => '<svg viewBox="-24 -14 48 28"><g class="prop-spin" fill="none" stroke="#ffe7a3" stroke-width="1.5"><ellipse rx="20" ry="8"/>' +
    '<ellipse rx="11" ry="4.4" opacity=".7"/></g></svg>',
};
// Distancias en px al lado del héroe (a escala 1); crecen con el personaje más grande.
const propOffset = { mine: [50, 5], chop: [58, 0], fish: [88, 7], smith: [47, 8], cook: [45, 8], fletch: [44, 11], train: [48, 6], rune: [0, 16], pray: [0, 16] };
// ─── Rivales ─────────────────────────────────────────────────────────────────
// Miran a la izquierda (hacia el héroe), apoyados en y = 82 de un lienzo de 96 × 88.
// Cada tramo tiene su criatura; los jefes son versiones más grandes, con corona, armadura o un material propio.
const foeGround = (cx, rx) => '<ellipse cx="' + cx + '" cy="82.6" rx="' + rx + '" ry="3.8" fill="#1d1109" opacity=".22"/>' +
  '<ellipse cx="' + cx + '" cy="82.4" rx="' + rx * .6 + '" ry="2.4" fill="#1d1109" opacity=".34"/>';
const pairStroke = (d, color, width) => strokePath(d, warmInk, width + 2) + strokePath(d, color, width);
// Estilo anime como el héroe: contorno marcado, sombra cel de dos tonos con brillo, colores vivos y ojos grandes con reflejo.
const foeInk = 1.7;
const fform = (d, base, shade, light) => form(d, base, shade, light, foeInk);
// Ojo grande: blanco, iris con sombra arriba, pupila, dos brillos y ceja enojada que baja hacia el héroe.
function foeEye(x, y, r, iris, { brow = true, glow = false, slit = false } = {}) {
  return (glow ? dot(x, y, r * 2.2, iris, ' opacity=".28"') : '') +
    '<ellipse cx="' + x + '" cy="' + y + '" rx="' + r * .86 + '" ry="' + r + '" fill="#fffaf0" stroke="' + warmInk + '" stroke-width="1.1"/>' +
    '<ellipse cx="' + (x - r * .16) + '" cy="' + (y + r * .08) + '" rx="' + r * .6 + '" ry="' + r * .78 + '" fill="' + iris + '"/>' +
    fillPath('M' + (x - r * .76) + ' ' + (y - r * .2) + ' Q' + (x - r * .16) + ' ' + (y - r * .95) + ' ' + (x + r * .44) + ' ' + (y - r * .2) +
      ' Q' + (x - r * .16) + ' ' + (y - r * .5) + ' ' + (x - r * .76) + ' ' + (y - r * .2) + 'Z', sceneTone(iris, -.55)) +
    (slit ? '<ellipse cx="' + (x - r * .16) + '" cy="' + (y + r * .1) + '" rx="' + r * .14 + '" ry="' + r * .58 + '" fill="#120a08"/>' :
      dot(x - r * .16, y + r * .12, r * .3, '#120a08')) +
    dot(x - r * .4, y - r * .3, r * .24, '#fff') + dot(x + r * .12, y + r * .4, r * .11, '#fff') +
    (brow ? strokePath('M' + (x - r * 1.05) + ' ' + (y - r * .78) + ' L' + (x + r * .95) + ' ' + (y - r * 1.5), warmInk, 1.8) : '');
}
const shine = (d, color = '#fff', op = '.55') => strokePath(d, color, 1, ' opacity="' + op + '"');
const foeDesigns = {
  rat(boss) {
    const fur = boss ? '#7e6f8e' : '#a48d7a';
    const belly = boss ? '#d9cfe6' : '#f2e2c8';
    const pink = '#f0a0a4';
    return foeGround(52, 26) + pairStroke('M70 70 Q88 76 89 62 Q90 51 80 50', pink, 2.4) +
      (boss ? fform('M48 50 Q64 42 76 56 Q76 68 64 72 Q58 60 46 56Z', '#7a2f8e', 'M64 46 Q74 50 76 56 Q76 68 64 72 Q68 58 64 46Z', '') +
        strokePath('M47 55 Q60 58 64 72', '#f4ecdc', 2.6) : '') +
      fform('M60 75 Q58 82 64 82 H71 Q72 77 67 75Z', sceneTone(pink, -.1)) +
      fform('M38 64 Q41 50 56 50 Q72 50 74 63 Q75 76 61 78 H44 Q37 75 38 64Z', fur,
        'M60 51 Q72 53 74 63 Q74 74 63 77.6 Q70 63 60 51Z', 'M42 58 Q47 52 55 51.6 Q47 55 44 61Z') +
      fillPath('M42 71 Q50 78 60 77.6 Q50 73 42 71Z', belly) +
      fform('M35.6 46 Q30 34 38 31 Q46 31 46 41 Q44 46 40 47Z', fur, '', '') + fillPath('M37 44 Q33.6 36 38.4 34 Q43 34.6 43 40.4 Q42 44 39.6 45Z', pink) +
      fform('M24 46 Q16 36 22 31 Q30 30 32 40 Q31 45 28 47Z', sceneTone(fur, -.08), '', '') + fillPath('M25 44 Q20 37.6 23.6 34 Q28.4 33.6 29.6 40 Q29 43 27.6 44.6Z', pink) +
      fform('M43 52 Q42 42 32 42 Q22 42 18.6 52 Q14 58 12.4 63 Q16 68 24 68 Q36 69 42 62Z', fur,
        'M14 64 Q20 68 26 68 Q37 68.6 42 62 Q34 66 26 65 Q19 64.4 14 64Z', 'M22 46.6 Q27 43.4 34 43.6 Q27 46 24.6 50Z') +
      fillPath('M14 63.6 Q20 66.6 28 66.4 Q22 63 17 62Z', belly) +
      dot(12.8, 62.2, 2.1, '#e07a84', ' stroke="' + warmInk + '" stroke-width="1"') + dot(12.2, 61.4, .6, '#fff') +
      form('M17.6 66 H22.4 L22 70.6 H18Z', '#fffaf0', '', '', 1) + strokePath('M20 66.2 V70.2', warmInk, .6) +
      foeEye(27, 53.4, 4.4, boss ? '#ff3b3b' : '#3a2a22', { glow: boss }) +
      strokePath('M15.6 58.6 L8 55.6 M15.2 60.4 L7 60.2 M15.6 62 L8.4 65', '#5a4a44', .6) +
      fform('M30 75.4 Q26.6 82 32 82 H38 Q39.4 78 35 75.4Z', pink) +
      (boss ? fform('M24 32 L25 21 L29.6 27 L33 18.6 L36.6 26.6 L41.4 21.6 L41 32 Q32.6 29.6 24 32Z', '#f2c14a',
        'M33 28.4 L36.6 26.6 L41.4 21.6 L41 32 Q37 30.6 33 30.4Z', 'M25.6 29 L25.8 24 L28.6 27.6Z') +
        dot(32.8, 27.4, 1.6, '#e0304f', ' stroke="' + warmInk + '" stroke-width=".7"') + dot(27, 29.6, 1, '#3b78d8') + dot(38.4, 29.4, 1, '#3b78d8') +
        strokePath('M30.6 58 L35.6 64', '#f6d0c0', 1) : '');
  },
  boar(boss) {
    const hide = boss ? '#6d5a4c' : '#a8603e';
    const mane = boss ? '#c9ced2' : '#e0823e';
    const tusk = boss ? '#dfe5e8' : '#fff4dc';
    const leg = (x, y, h) => fform('M' + x + ' ' + y + ' h7 l-.8 ' + h + ' h-5.6Z', sceneTone(hide, -.15), '', '') +
      fform('M' + (x + .2) + ' ' + (y + h - 3) + ' h6.8 l-.4 3 h-6Z', '#3a2a24', '', '');
    return foeGround(50, 31) + leg(72, 66, 16) + leg(42, 68, 14) +
      pairStroke('M81 56 q6-2 6 3 l-2 3', hide, 1.4) +
      fform('M27 59 Q29 41 53 41 Q77 40 83 56 Q85 72 70 75 H38 Q28 72 27 59Z', hide,
        'M61 42 Q79 44 83 56 Q84 70 70 75 H58 Q75 63 61 42Z', 'M33 51 Q41 44 53 43 Q43 47.6 37 55Z') +
      fform('M35 45 L39 33 L44 42 L49 30 L53 41 L58 30.6 L61.4 41.6 L67 34 L69 45 Q52 39 35 45Z', mane,
        'M58 30.6 L61.4 41.6 L67 34 L69 45 Q63 42.6 57 41.6Z', 'M39 33 L44 42 L41 41Z') +
      leg(62, 68, 14) + leg(32, 68, 14) +
      fform('M40 46 Q28 41 19 51 Q12.6 59 11 67.6 Q15 74 25 73.4 Q36 72.4 42 64Z', sceneTone(hide, .06),
        'M13 70 Q20 73.6 27 73 Q37 71 42 64 Q34 68.6 25 69.4 Q18 70 13 70Z', 'M20.6 51 Q26 44.6 35 45 Q27 48 23.6 53Z') +
      fform('M35 46 L30.6 35.6 L42 43Z', sceneTone(hide, -.15), '', '') +
      '<ellipse cx="12" cy="67.6" rx="4.2" ry="4.6" fill="#f0a0a4" stroke="' + warmInk + '" stroke-width="1.3"/>' +
      dot(10.8, 66.6, .9, '#4a2026') + dot(13.4, 68.6, .9, '#4a2026') +
      fform('M20 70 Q11.6 66 11 56 Q16.6 63 24 66Z', tusk, '', '') + shine('M14 61 Q15.6 64.6 19 66.4', '#fff', '.8') +
      (boss ? fform('M19 49 Q26 40 38 43 L35.6 55.4 Q28.4 53 21.6 56Z', '#9aa3ac', 'M30 43.6 Q35 42.6 38 43 L35.6 55.4 Q33 54 30.6 54Z', 'M22 48 Q27 43.4 32 43.4 Q27 46 24 50Z') +
        dot(24.8, 49.6, 1, '#eef2f4') + dot(31, 46.6, 1, '#eef2f4') : '') +
      foeEye(27.6, 54.6, 3.6, boss ? '#ff4a3a' : '#2a1a12', { glow: boss });
  },
  ogre() {
    // Bruto de la cantera: verde vivo, moño de pelo, mandíbula con colmillos, arnés de cuero y garrote con clavos.
    const skin = '#79b85a';
    const hair = '#3a2a5a';
    return foeGround(48, 27) +
      fform('M64 30 Q76 33 77 47 L75 61 H67 L67.4 45Z', sceneTone(skin, -.2), '', '') + dot(71, 62.4, 4.6, sceneTone(skin, -.2), ' stroke="' + warmInk + '" stroke-width="1.6"') +
      fform('M39 62 H50 L51 79 H38Z', sceneTone(skin, -.12), 'M46.6 62 H50 L51 79 H47.4Z', '') + fform('M36.6 76.6 H52 L52.6 82.6 H35.6Z', '#6a4428', '', '') +
      fform('M54 62 H65 L67 79 H54Z', skin, 'M61.6 62 H65 L67 79 H62.6Z', '') + fform('M53.4 76.6 H67.6 L68.4 82.6 H53Z', '#6a4428', '', '') +
      fform('M32 30 Q50 20 68 30 Q75 45 68 59 Q50 65 34 59 Q27 45 32 30Z', skin,
        'M59 26 Q66 28 68 30 Q75 45 68 59 Q62 62 56 62.6 Q70 46 59 26Z', 'M35.6 33 Q42 26.6 50 25.6 Q41 33 39 43 L34.6 44Z') +
      strokePath('M41 49.6 Q50 55 60 49.6', sceneTone(skin, -.45), 1.2) + strokePath('M42 36 Q47 39 50 36.4', sceneTone(skin, -.45), 1) +
      fform('M33.6 31 L37 29.6 L66 57.6 L63 59.6Z', '#8a5530', '', '') + dot(50.4, 45, 1.8, '#d9b24a', ' stroke="' + warmInk + '" stroke-width=".8"') +
      fform('M34 55.4 H67 L69.6 69 L60 66.4 L52 71 L44 66.4 L33 68.6Z', '#8a5530', 'M55 56 H67 L69.6 69 L60 66.4 L56 68Z', '') +
      strokePath('M33.8 56.8 H67.2', '#4a2e1a', 2.2) +
      // Cabeza grande con moño, ceño y colmillos.
      fform('M24 22 Q23 8.6 36 8 Q48 8.6 48 20 Q48.4 30 40 34 Q34 36 29 33 Q24 30 24 22Z', skin,
        'M41 9.6 Q48 12 48 20 Q48.4 30 40 34 Q44 25 41 9.6Z', 'M27.6 14 Q31 10 37 9.6 Q31 13 29.6 18Z') +
      fform('M30 9.6 Q31 1 39 3.6 Q44 6 42 10.6 Q36 8 30 9.6Z', hair, '', 'M32 7.4 Q34 4 38 5Z') +
      fform('M34.4 3.6 Q35 -2.4 40 -.4 Q38 2 38.4 4.4Z', hair, '', '') +
      fform('M24.4 25 Q30 28 37 27 Q36 33.4 30.6 33.6 Q25.6 32 24.4 25Z', sceneTone(skin, .1), '', '') +
      form('M26 26.6 L25 22 L28 25.6Z M33.4 26.6 L34 21.6 L35.6 26Z', '#fff6dc', '', '', 1) +
      foeEye(30.4, 18.6, 3.3, '#f2b630') + foeEye(39.4, 18.6, 2.7, '#f2b630', { brow: false }) +
      strokePath('M37 15.4 L42.6 14', warmInk, 1.6) +
      fform('M35 32 Q27 35 24.6 45 L22.6 56 L29.6 58 L33 46Z', skin, 'M32 34.6 Q29 41 29.6 58 L27.4 57.4 Q28 42 32 34.6Z', '') +
      fform('M26 61 L12 75 Q8 81.6 14 83 Q20.6 83 23.6 76.6 L32 63.4Z', '#a8743e', 'M21 70 L32 63.4 L23.6 76.6 Q20.6 83 16.6 83 Q20 77 21 70Z', 'M15 73 L23.6 65 L17.6 74.4Z') +
      dot(15.6, 75.4, 1.2, '#d8d6cf', ' stroke="' + warmInk + '" stroke-width=".6"') + dot(19.6, 72, 1.2, '#d8d6cf', ' stroke="' + warmInk + '" stroke-width=".6"') +
      dot(14.6, 79.6, 1.2, '#d8d6cf', ' stroke="' + warmInk + '" stroke-width=".6"') +
      fform('M24 56 H32 V60.4 H24Z', '#8a5530', '', '') +
      dot(27.6, 60, 4.8, skin, ' stroke="' + warmInk + '" stroke-width="1.6"') + strokePath('M25 58.6 Q27.6 57 30.4 58.6', sceneTone(skin, -.4), .9);
  },
  gargoyle() {
    const stone = '#8a96b0';
    const wing = '#5d6a8a';
    return foeGround(48, 26) +
      fform('M50 40 L70 14 L76 26 L85 18 L87 34 L94 32 L84 52 L60 54Z', wing, 'M72 36 L87 34 L94 32 L84 52 L66 53Z', 'M60 38 L70 16 L66 30Z') +
      strokePath('M60 42 L72 20 M64 48 L85 22 M70 51 L89 36', sceneTone(wing, -.45), 1) +
      pairStroke('M60 70 Q78 74 82 62 Q84 57 80 55', stone, 2.6) + fform('M77 52 L83 54 L80 59Z', stone, '', '') +
      fform('M30 56 Q30 40 46 38 Q62 38 64 54 Q64.6 70 54 74 H38 Q30 70 30 56Z', stone,
        'M54 39.4 Q63 42 64 54 Q64.4 69 54 74 H50 Q61 60 54 39.4Z', 'M34 50 Q36 42 44 40 Q38 46 37 54Z') +
      fillPath('M36 46 Q40 44 44 46 Q41 48 37 49Z M50 62 Q54 60 57 63 Q53 64 51 64Z', '#7fb069', ' opacity=".85"') +
      fform('M48 66 Q42.6 75 39.6 81.6 H55.6 L57.2 69Z', sceneTone(stone, -.1), '', '') + strokePath('M41 82 v-2 M45 82 v-2.4 M49 82 v-2', warmInk, .9) +
      fform('M28 30 L21 15 L33 26.6Z', '#e8dcc4', '', '') + fform('M38 28.4 L42.6 13 L43 31Z', '#e8dcc4', '', '') +
      fform('M23 40 Q21 28 31 26 Q42 26 43.4 35.6 Q43.6 45 35 47 Q25 47 23 40Z', stone,
        'M24 42.6 Q28 47 35 47 Q41.6 45.6 43.2 40 Q38 43.6 31 42.6 Q27 42 24 42.6Z', 'M26.6 32 Q30 28 36 28.4 Q30.6 30.6 29 35Z') +
      foeEye(29.6, 36.4, 3.2, '#ffcf3a', { glow: true, slit: true }) + foeEye(37.8, 36, 2.4, '#ffcf3a', { brow: false, slit: true }) +
      strokePath('M35.4 32.4 L40.6 30.8', warmInk, 1.6) +
      fillPath('M24.6 42.6 Q31 45.6 38 43 L37 44.6 Q31 47 25.4 44Z', '#3a1a20') + fillPath('M26.4 43.4 l1 2.4 1-2.2 1 2.4 1-2.4 1 2.2 1-2.4z', '#fff6dc') +
      fform('M34.4 49 L26.4 63.4 L24 76.6 L32.4 76.4 L34.4 64 L41 56.4Z', stone, 'M31 60 L34.4 64 L32.4 76.4 L29.6 76.4Z', '') +
      fillPath('M22.6 76.4 l1.8 3.4 1.6-3 1.8 3.2 1.6-3 1.8 3 1.4-3.6z', '#e8dcc4', ' stroke="' + warmInk + '" stroke-width=".9"');
  },
  wyvern(boss, palette = { hide: '#38b090', belly: '#f4dc84', wing: '#2a7f84', eye: '#ffcc2e' }, dragon = false) {
    const { hide, belly, wing, eye } = palette;
    return foeGround(54, 27) +
      fform('M52 42 L60 9 L71 18 L82 11 L86 28 L95 30 L80 45Z', sceneTone(wing, -.12), 'M70 34 L86 28 L95 30 L80 45 L66 42Z', '') +
      strokePath('M58 36 L64 15 M64 40 L78 19 M70 42 L89 31', sceneTone(wing, -.5), .9) +
      pairStroke('M72 64 Q88 64 91 77', hide, 3.6) + fform('M87 73 L95 75.6 L91 82.6 L87.6 79Z', sceneTone(hide, -.1), '', '') +
      fform('M64 67 L62 80.6 H70.4 L69.4 67Z', sceneTone(hide, -.15), '', '') +
      fform('M37 58 Q39 44 56 44 Q73 45.6 75 58 Q73 71 58 72 H46 Q37.6 68 37 58Z', hide,
        'M62 45 Q74 48 75 58 Q73.6 70.6 58 72 H54 Q70 62 62 45Z', 'M41 52 Q46 46 54 45.6 Q46 50 43.4 56Z') +
      fillPath('M41.6 58 Q46 71 60 70.4 Q50 68 44 58Z', belly) + strokePath('M44 63 l2.4-1.4 M48 66.4 l2-1.8 M53 68.4 l1.4-2', sceneTone(belly, -.4), .7) +
      (dragon ? fform('M40 66 L33 78 L38.4 81.6 L44 70Z', sceneTone(hide, -.08), '', '') : '') +
      fform('M45 66 L42 80.6 H50.4 L51.6 67Z', hide, '', '') + fillPath('M40.6 80.6 l1.4 1.8 1.4-1.8 1.4 1.8 1.4-1.8 1.4 1.8 1.4-1.8z', '#fff6dc') +
      fform('M44 51 Q34 41.6 32 27.6 L40.4 25.6 Q42.4 38 52 46Z', hide, 'M36.6 27 L40.4 25.6 Q42.4 38 52 46 L48 47.4 Q39 38 36.6 27Z', '') +
      strokePath('M36.6 31 Q38.4 39 45 46', belly, 2.2) +
      // Cabeza con hocico redondeado, cuernos y ojo grande.
      fform('M24 22 Q29 14 38 16 Q44 19 43.6 25 Q41.6 31.4 34 31 L21 32.6 Q15.6 32 15.6 28.4 Q17 24 24 22Z', hide,
        'M16.4 30 Q21 32.6 26 32 L34 31 Q40.4 31 42.6 27 Q36 29 30 28.6 L21 29.4Z', 'M26 19.6 Q30.6 16 36 17.4 Q31 18.6 28.6 21.6Z') +
      fform('M37 16.6 L48 9 L43 21.4Z', dragon ? '#fff2d0' : sceneTone(hide, -.25), '', '') +
      (dragon ? fform('M31.6 16.6 L35.4 6.6 L37.6 17.4Z', '#fff2d0', '', '') : '') +
      fillPath('M18.4 30.6 l1 2.4 1-2.2 1 2.4 1-2.4 1 2.2 1-2.4z', '#fff6dc') + dot(17.6, 27.4, .9, sceneTone(hide, -.5)) +
      foeEye(30, 23.6, 3.4, eye, { slit: true }) +
      (dragon ? '<g class="foe-ember">' + dot(15, 25, 2.4, '#ffd27a', ' opacity=".55"') + dot(12.4, 22, 1.6, '#ffb048', ' opacity=".45"') + '</g>' : '') +
      fform('M54 46 L59 19 L68 29 L77 21 L76 44 L62 53Z', wing, 'M68 29 L77 21 L76 44 L66 49Z', 'M56.4 42 L59 21 L61.6 27Z') +
      strokePath('M59 20 L62 50 M68 29 L66 48 M77 21 L70 46', sceneTone(wing, -.45), .9) +
      (dragon ? strokePath('M44 44.6 l2.4-3.4 .8 3.6 M50 43.6 l2.4-3.6 1 3.6 M56 43.6 l2.4-3.4 .8 3.6', '#fff2d0', 1.2) : '');
  },
  spider() {
    const body = '#6a4f9e';
    const leg = d => pairStroke(d, sceneTone(body, -.15), 2.4);
    return '<g class="foe-mist"><ellipse cx="30" cy="80" rx="24" ry="5" fill="#e8dcff" opacity=".25"/>' +
      '<ellipse cx="66" cy="78" rx="28" ry="6" fill="#e8dcff" opacity=".2"/></g>' + foeGround(50, 31) +
      leg('M60 60 L74 44 L88 70 L91 82') + leg('M62 62 L80 56 L86 82') + leg('M56 64 L64 70 L70 82') +
      fform('M44 52 Q48 33 66 33 Q87 35 89 52 Q89 69 68 70 Q50 70 44 52Z', body,
        'M70 34 Q87 37 89 52 Q88 66 70 69.6 Q85 54 70 34Z', 'M50 46 Q55 37 64 35.6 Q56 41 53 50Z') +
      fillPath('M61 41 Q66 38.6 71 41 L68.6 48 L73 54.6 Q66 59 59 54.6 L63.6 48Z', '#f08ac8', ' opacity=".9"') +
      shine('M53 42 Q58 37 65 36.4') +
      leg('M38 60 L25 43 L13 66 L9 82') + leg('M36 63 L21 55 L13 82') + leg('M42 65 L34 72 L28 82') +
      fform('M24 62 Q25 49 37 49 Q49 50 49 62 Q48 72 37 72.6 Q25 72 24 62Z', sceneTone(body, .1),
        'M37 49.4 Q48 51 49 62 Q48 71.6 37 72.6 Q45 63 37 49.4Z', 'M28 56 Q31 51 37 50.4 Q31.6 53.4 29.6 58Z') +
      form('M27.4 67 q-2 5 -.6 7 l2.8-3.6z M32 68.6 q-.6 5 1.6 6.6 l.6-4.8z', '#fff6dc', '', '', .9) +
      foeEye(30, 58.6, 2.6, '#ff3b6e', { brow: false, glow: true }) + foeEye(36.4, 57.6, 2.4, '#ff3b6e', { brow: false, glow: true }) +
      foeEye(28.2, 63, 1.5, '#ff3b6e', { brow: false }) + foeEye(33.2, 62.6, 1.5, '#ff3b6e', { brow: false }) +
      strokePath('M26.6 54.6 L33 53.6 M34.4 53.4 L40 54.4', warmInk, 1.6) +
      form('M30 49.6 L33 41 L36.6 49Z', '#ffd25a', '', '', 1.1) + dot(33.2, 46.4, 1, '#e0304f');
  },
  golem(boss, palette) {
    const { stone, core, moss, cracks } = palette;
    const rune = boss === 'rune';
    return foeGround(48, 27) +
      (rune ? fform('M56 30 L60 12 L64 28Z', '#9ef2ff', '', 'M59 17 L60 12 L61 24Z') + fform('M64 32 L73 16 L71 34Z', '#c8f8ff', '', '') +
        fform('M47 30 L48.6 16 L53 30Z', '#9ef2ff', '', '') : '') +
      fform('M70 36 L76 56 L70 59 L65 43Z', sceneTone(stone, -.2), '', '') + fform('M68.6 56 H79.4 V65 H68Z', sceneTone(stone, -.25), '', '') +
      fform('M38 63 H48.6 V80 H36.6Z', sceneTone(stone, -.1), 'M45 63 H48.6 V80 H45.6Z', '') + fform('M35 78 H50 V82.6 H34.4Z', sceneTone(stone, -.3), '', '') +
      fform('M53 63 H63.4 L65.4 80 H53Z', stone, 'M60 63 H63.4 L65.4 80 H61Z', '') + fform('M52 78 H66.4 L67 82.6 H51.6Z', sceneTone(stone, -.3), '', '') +
      fform('M30 33 L67 30 L72 50 L63 65 H37 L28 50Z', stone, 'M57 30.8 L67 30 L72 50 L63 65 H57 Q67 48 57 30.8Z', 'M32.6 35 L46 33.6 L39 46 L31.4 48Z') +
      strokePath('M37 50 L44 56 L42 62 M58 40 L62 46', cracks, 1.2, cracks.startsWith('#ff') || cracks === '#7fe8ff' || cracks === '#9ef2ff' ? ' class="foe-glow"' : '') +
      '<g class="foe-core">' + dot(49, 46.6, 7.6, core, ' opacity=".3"') + dot(49, 46.6, 4.4, core, ' stroke="' + warmInk + '" stroke-width="1.3"') +
      dot(47.8, 45.2, 1.4, '#fffbe8') + '</g>' +
      fform('M38.6 15.6 H59.4 L61.6 31 H36.6Z', sceneTone(stone, .08), 'M54.6 15.6 H59.4 L61.6 31 H55.6Z', 'M39.6 17 H45 L43 24 L39 24Z') +
      // Un solo ojo grande que brilla: lo más expresivo de un gólem.
      '<g class="foe-visor">' + dot(48.6, 23.6, 6, core, ' opacity=".3"') +
      '<ellipse cx="48.6" cy="23.6" rx="5" ry="3.4" fill="#fffaf0" stroke="' + warmInk + '" stroke-width="1.2"/>' +
      '<ellipse cx="47.6" cy="23.8" rx="2.8" ry="2.8" fill="' + core + '"/>' + dot(47.6, 23.8, 1.1, '#0f0a08') + dot(46.6, 22.8, .8, '#fff') + '</g>' +
      strokePath('M42 18.4 L55 20', warmInk, 1.8) +
      (rune ? fform('M37 16.4 L38.4 7 L42.6 13 L48.6 5 L54.6 13 L58.8 7 L60.4 16.4Z', '#58c6d4', '', 'M42.6 13 L48.6 5 L47 12Z') : '') +
      fform('M24.4 31.6 Q22 22.6 33.6 24.6 L36 38.4 Q27 40.6 24.4 31.6Z', sceneTone(stone, -.04), 'M30 36 L36 38.4 Q30 40 27 37Z', '') +
      (moss ? fillPath('M24.8 29 Q27 24 33.6 25 Q31 28 25.6 30.6Z M32.6 31.6 Q38 29 44 31.4 Q38 31.2 34 33.6Z', moss) : '') +
      fform('M25 38 L18.6 58 L27 62 L34 44Z', stone, 'M30 44 L34 44 L27 62 L24 60.6Z', '') +
      fform('M15.6 57.6 H30 V67.6 H15.6Z', sceneTone(stone, -.06), 'M25 57.6 H30 V67.6 H25Z', 'M16.6 58.6 H21.4 V61 H16.6Z');
  },
  guardian() {
    const steel = '#7f9fc8';
    const rune = '#7ff0ff';
    return foeGround(48, 23) +
      strokePath('M68 7 L72 80', warmInk, 3.4) + strokePath('M68 7 L72 80', '#8a5f38', 1.8) +
      fform('M65.6 0 L71 -2 L74.6 11.6 L68.6 14Z', '#e4eef4', '', 'M67 2 L70 .4 L70.6 8Z') +
      '<g class="foe-hover">' +
      fform('M35 29 Q50 22 65 29 L69 60 L60 75 L50 70 L40 75 L31 60Z', steel,
        'M56 26.6 Q63 28 65 29 L69 60 L60 75 L55 72 Q65 52 56 26.6Z', 'M38 32 Q44 28 50 27 Q44 37 42 50 L35.4 52Z') +
      strokePath('M44 40 l3 4 -3 4 M54 44 v8 M51 48 h6', rune, 1.3, ' class="foe-glow"') +
      fform('M62.6 31 Q71 31 70 42 L67 50 L62 47Z', sceneTone(steel, -.12), '', '') + dot(68.6, 50, 3.2, sceneTone(steel, -.2), ' stroke="' + warmInk + '" stroke-width="1.4"') +
      fform('M39 10 Q50 3 61 10 L61.6 26 Q50 30.6 38.6 26Z', sceneTone(steel, .1), 'M54 6.6 Q59 8.4 61 10 L61.6 26 Q57.6 28 54 28.6Z', 'M41.4 11 Q46 7.6 50 7 Q44.6 11.4 43.4 18Z') +
      fform('M49 3.6 Q56 -2 64 1 Q58 2 55 6Z', '#e0304f', '', '') +
      fillPath('M41.6 14.6 H56 V18 H50.8 V25 H47 V18 H41.6Z', '#101820') +
      '<g class="foe-visor">' + dot(45, 16.4, 3, rune, ' opacity=".3"') + dot(53, 16.4, 3, rune, ' opacity=".3"') +
      '<ellipse cx="45" cy="16.4" rx="2" ry="1.3" fill="' + rune + '"/><ellipse cx="53" cy="16.4" rx="2" ry="1.3" fill="' + rune + '"/></g>' +
      strokePath('M39 10.6 Q50 4.6 61 10.6', trimGold, 1.2) +
      fform('M16 29 H38.4 V62 Q27.6 72.6 16 62Z', '#9cb4cc', 'M30 29 H38.4 V62 Q34 66.6 30 68Z', 'M17.4 30.4 H22.4 V56 L17.4 55Z') +
      strokePath('M18 30.6 H36.6 V61.4 Q27.6 70.4 18 61.4Z', trimGold, 1.1) +
      strokePath('M27.6 37 L24 45 L31 45 L27.6 55 M22.6 49 H32.6', rune, 1.6, ' class="foe-glow"') + '</g>';
  },
  heart(echo) {
    const flesh = echo ? '#6a84e0' : '#e0384a';
    const glow = echo ? '#c8dcff' : '#ffd25a';
    const crystal = echo ? '#e0eaff' : '#b8fff0';
    const shard = (d, light) => form(d, crystal, '', light, 1.2);
    return foeGround(48, 27) +
      pairStroke('M34 76 Q30 80 22 82 M40 76 Q40 80 36 83 M60 76 Q64 80 72 82 M54 76 Q56 80 60 83', '#7a5232', 2.4) +
      '<g class="foe-hover">' +
      shard('M12 34 L16.6 25 L21 35 L16.6 40Z', 'M14.6 33 L16.6 28 L17.6 35Z') + shard('M80 30 L85 21 L88.6 32 L83 37Z', 'M82 29 L85 24 L85 31Z') +
      '<g class="foe-pulse">' + dot(48, 46, 31, glow, ' opacity=".14"') +
      fform('M48 30 Q40 16 28 20 Q14 26 18 44 Q24 60 48 77 Q72 60 78 44 Q82 26 68 20 Q56 16 48 30Z', flesh,
        'M60 22 Q72 20 77 32 Q80 46 70 56 Q60 66 48 77 Q66 58 68 42 Q70 30 60 22Z', 'M22 32 Q26 22 36 22 Q28 28 26 40Z') +
      shine('M24 30 Q28 24 34 23.6', '#fff', '.7') +
      strokePath('M48 32 L46 42 L51 50 L47 60 L50 70 M46 42 L38 46 M51 50 L60 47', glow, 1.8, ' class="foe-glow"') +
      fillPath('M48 44 l2.2-5 2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2z', '#fff8dc', ' class="foe-glow"') + '</g>' +
      pairStroke('M21 34 Q34 40 40 74', '#8a5c36', 2.8) + pairStroke('M75 32 Q62 44 57 74', '#8a5c36', 2.8) +
      pairStroke('M30 21 Q44 30 56 21 Q62 18 68 21', '#8a5c36', 2.4) +
      shard('M40 22 L43 11 L47 23Z', 'M42 20 L43 14 L44 21Z') + shard('M46 22 L50 4 L55 22Z', 'M48 20 L50 8 L51 21Z') + shard('M54 22 L59 12 L60 24Z', '') +
      '</g>';
  },
  knight(boss) {
    // Jefes humanos: la misma figura anime del héroe, espejada y más grande, con su propia armadura y capa.
    const black = boss === 'black';
    const color = black ? '#3a3d4a' : '#d8e0e6';
    const look = {
      skin: '#f2cfae', hairColor: black ? '#e8e4ee' : '#5a3a26', streak: '', eye: black ? '#ff3b3b' : '#3f7fc8', beard: 0,
      body: { color, tier: black ? 3 : 2 }, legs: { color, tier: black ? 3 : 2 }, head: { color, tier: black ? 3 : 2 },
      shield: black ? { color: '#2c2e38', tier: 3 } : undefined, hands: { color: sceneTone(color, -.15), tier: 2 },
      cape: black ? '#8a1f2a' : '#c0303a', tool: ['sword', black ? '#5a6070' : '#eef2f4', -24, black ? 3 : 2], armAngle: -36,
    };
    return foeGround(46, 22) + '<g transform="translate(90 3) scale(-.86 .86)">' + animeFigure(look) + '</g>';
  },
};
const foeTypes = [
  boss => foeDesigns.rat(boss), boss => foeDesigns.boar(boss),
  boss => boss ? foeDesigns.knight('steel') : foeDesigns.ogre(),
  boss => boss ? foeDesigns.knight('black') : foeDesigns.gargoyle(),
  boss => boss ? foeDesigns.spider() : foeDesigns.wyvern(false),
  boss => foeDesigns.golem(boss, boss ? { stone: '#3e3650', core: '#ff8a2a', cracks: '#ff7a24' } :
    { stone: '#c8aa7a', core: '#5ff0ff', moss: '#7fbf4a', cracks: sceneTone('#c8aa7a', -.45) }),
  boss => boss ? foeDesigns.golem('rune', { stone: '#5f86a6', core: '#7ff0ff', cracks: '#9ef2ff' }) : foeDesigns.guardian(),
  boss => boss ? foeDesigns.heart(false) : foeDesigns.wyvern(false, { hide: '#e0483a', belly: '#ffc070', wing: '#a82a34', eye: '#ffd25a' }, true),
];
const foeArtCache = new Map();
// Rivales pintados (art/rivales.webp, de Referencias/hojas/hoja-13): 0-7 comunes por tramo, 8-15 jefes.
// Van dentro del mismo <g class="foe-body"> que los vectoriales, así respiran, reciben golpes y caen igual.
const paintedFoes = typeof characterAtlas !== 'undefined';
function paintedFoe(index) {
  const { cols, rows } = characterAtlas.rivales;
  const x = index % cols, y = Math.floor(index / cols);
  return '<svg viewBox="0 0 96 88" aria-hidden="true"><g class="foe-body"><svg x="2" y="-6" width="94" height="94" style="overflow:hidden" viewBox="' +
    x * 240 + ' ' + y * 240 + ' 240 240"><image href="art/rivales.webp" width="' + cols * 240 + '" height="' + rows * 240 + '"/></svg></g></svg>';
}
function enemyArt(task) {
  const tier = Math.max(0, Math.min(7, task.battleTier ?? 0));
  const key = task.challenge ? 'eco' : tier + (task.boss !== undefined ? 'j' : '');
  let art = foeArtCache.get(key);
  if (!art && paintedFoes) {
    art = paintedFoe(task.challenge ? 15 : tier + (task.boss !== undefined ? 8 : 0));
    foeArtCache.set(key, art);
  }
  if (!art) {
    const body = task.challenge ? foeDesigns.heart(true) : foeTypes[tier](task.boss !== undefined);
    art = '<svg viewBox="0 0 96 88" aria-hidden="true"><g class="foe-body">' + body + '</g></svg>';
    foeArtCache.set(key, art);
  }
  return art;
}
// ─── Mascota ────────────────────────────────────────────────────────────────
// Criaturas chicas en vector, mirando a la derecha. Reemplazan al emoji para que combinen con el mapa.
const petBeast = (fur, { ears = 'point', tail = 'thin', snout = 3, belly, size = 1, stripe } = {}) => {
  const light = belly || sceneTone(fur, .4);
  const earPath = ears === 'long' ? 'M21 11 L19.4 2 L23 3.4 L24 10Z M24 11 L24.4 2.4 L27 4 L26 11Z' :
    ears === 'round' ? 'M20.4 10.6 Q19 6.4 22.4 7 Q24 8 23.4 10.6Z M25 10 Q25.4 6 28.4 7.4 Q28.6 9.6 27 11Z' :
    'M20.4 11 L20.6 5 L24 9.4Z M24.6 10 L27.6 5.6 L27.8 11.4Z';
  const tailPath = tail === 'bush' ? 'M9 16 Q1 14 2 6 Q6 4 8 9 Q10 13 12 15Z' :
    tail === 'curl' ? 'M9 15 Q2 15 3 9 Q4 5 7.6 7' : tail === 'stub' ? 'M9 15.6 Q6 14 6.6 12.4 Q8.6 12.4 10 14.4Z' : 'M9 16 Q3 17 2 12';
  const tailArt = tail === 'curl' || tail === 'thin' ? pairStroke(tailPath, tail === 'thin' ? sceneTone(fur, -.1) : fur, 1.6) : form(tailPath, fur, '', '', 1.1);
  return '<g transform="translate(16 26) scale(' + size + ') translate(-16 -26)">' + tailArt +
    form('M11 26 L11.6 21 H14.4 L14 26Z M20 26 L20.4 21 H23.2 L23 26Z', sceneTone(fur, -.2), '', '', 1) +
    form('M8.4 18.6 Q8.4 13 15.4 12.6 Q22 12.6 23.6 17 Q24 22.6 16.6 23.4 Q9 23.4 8.4 18.6Z', fur,
      'M10 21.4 Q13 23.4 17 23.4 Q22.4 22.8 23.6 19 Q19 21.6 10 21.4Z', 'M10.6 15.6 Q13 13.4 17 13.4 Q13 15 12 17Z', 1.1) +
    (stripe ? strokePath('M13 13.4 Q14 16 13 18 M17 13 Q18 16 17 18.4', stripe, 1) : '') +
    form(earPath, sceneTone(fur, -.1), '', '', 1) +
    form('M19 13.6 Q19.4 8.4 24.4 8.6 Q28.6 9 28.6 13 L' + (29 + snout) + ' 15 Q' + (29 + snout) + ' 17.4 26.6 17.6 Q20.4 18 19 13.6Z', fur,
      'M21 16.6 Q24 18 27 17.4 Q' + (29 + snout) + ' 17 ' + (29 + snout) + ' 15.4 Q25 16.8 21 16.6Z', 'M21 11.6 Q22.6 9.6 25 9.6 Q23 11 22.6 13Z', 1.1) +
    fillPath('M22 16.4 Q25 18.2 ' + (28 + snout) + ' 16.4 Q25 17 22 16.4Z', light) +
    dot(29 + snout, 14.8, .9, '#24160f') + dot(25.4, 12.4, .95, '#1a1210') + dot(25.1, 12.1, .32, '#fff') +
    form('M14.4 26 L14.8 21.6 H17.4 L17.2 26Z M22.6 26 L23 21.6 H25.6 L25.6 26Z', fur, '', '', 1) + '</g>';
};
const petBird = (feather, { beak = '#e0a640', breast, owl, size = 1 } = {}) => '<g class="pet-flap" transform="translate(16 26) scale(' + size + ') translate(-16 -26)">' +
  strokePath('M14 24.6 V26.4 M17.4 24.6 V26.4', '#d29a4a', 1) +
  form('M8 17 L2.4 20.6 L4 15Z', sceneTone(feather, -.2), '', '', 1) +
  form('M7 16.6 Q8 9.6 15.4 9.4 Q22.4 10 22.6 17 Q21.6 24.6 15 24.8 Q8.6 24.4 7 16.6Z', feather,
    'M9 21 Q12 24.6 15 24.8 Q21 24.4 22.4 18.6 Q17 22 9 21Z', '', 1.1) +
  fillPath('M15 14.4 Q21 14.6 21.4 18.6 Q20 23 15.6 23.4 Q17.6 19 15 14.4Z', breast || sceneTone(feather, .45)) +
  form('M9 15 Q13 12.6 17 16 Q14 21.6 9 21.4 Q7.6 18 9 15Z', sceneTone(feather, -.18), '', 'M10 15.4 Q12.6 14 14.6 15.4 Q12 16 10.6 18Z', 1) +
  (owl ? form('M11 6 L12.6 10.6 L15 9.4Z M22 6 L20 10.4 L17.6 9.4Z', sceneTone(feather, -.2), '', '', 1) +
    dot(14, 12.6, 2.4, '#f2e2b8', ' stroke="' + warmInk + '" stroke-width=".8"') + dot(19, 12.6, 2.4, '#f2e2b8', ' stroke="' + warmInk + '" stroke-width=".8"') +
    dot(14.4, 12.6, 1.1, '#1a1210') + dot(19.4, 12.6, 1.1, '#1a1210') + form('M16 13.4 L17.4 13.4 L16.7 15.6Z', beak, '', '', .7) :
    dot(19, 12.4, 1, '#1a1210') + dot(18.7, 12.1, .32, '#fff') + form('M21.6 12 L25.6 13.4 L21.8 15Z', beak, '', '', .8)) + '</g>';
const petLooks = {
  attack: () => petBird('#8a6a48', { beak: '#e3b448', breast: '#e8dcc4' }),
  strength: () => petBeast('#7a4a2e', { ears: 'round', tail: 'stub', snout: 1.4, size: 1.12 }),
  defence: () => form('M6 26 L7 22 H10 L10 26Z M19 26 L19 22 H22 L22.4 26Z', '#7c8a4c', '', '', 1) +
    form('M24 19 Q30 17 30 21 Q29.6 23.4 26 23 Z', '#8a9a58', '', '', 1) + dot(27.6, 20, .8, '#1a1210') +
    form('M4.4 22.6 Q5 12.4 15 12 Q25 12.4 25.6 22.6Z', '#6d6a4a', 'M16 12.2 Q25 13 25.6 22.6 H18 Q22 17 16 12.2Z', 'M8 18 Q10 14 15 13.4 Q11 16 10.4 19Z', 1.1) +
    strokePath('M9 18 L12 15 L18 15 L21 18 L18 22 M12 15 L10 22 M15 12.4 V15', sceneTone('#6d6a4a', -.4), .8),
  hitpoints: () => petBeast('#d6c6ac', { ears: 'long', tail: 'stub', snout: .6, belly: '#f4ece0' }),
  ranged: () => petBeast('#c8662a', { tail: 'bush', snout: 2.6, belly: '#f2e2cc' }),
  magic: () => petBird('#7d6c94', { owl: true, breast: '#cdbfe0', beak: '#e3b448', size: 1.05 }),
  prayer: () => petBird('#e8e6dc', { beak: '#d88a6a', breast: '#f8f6ef' }),
  slayer: () => petBeast('#7d7f84', { tail: 'bush', snout: 3, belly: '#d8d8d4', size: 1.1 }),
  mining: () => petBeast('#d9a640', { ears: 'round', tail: 'thin', snout: 2.4, size: .9 }),
  woodcutting: () => petBeast('#b0602e', { ears: 'point', tail: 'curl', snout: 1.4, size: .9 }),
  fishing: () => petBeast('#6e4a32', { ears: 'round', tail: 'bush', snout: 1.8, belly: '#c9a87e' }),
  smithing: () => pairStroke('M8 21 Q2 22 2 17', '#c98450', 2) + form('M7 21 Q8 16 16 16 Q25 16 26 20 Q25 24 16 24 Q8 24 7 21Z', '#c98450',
    'M9 22.6 Q14 24 18 24 Q24 23.4 26 20.6 Q18 22.6 9 22.6Z', '', 1.1) + strokePath('M10 26 L11 22 M14 26 L14.6 23 M19 26 L19.6 23 M23 26 L23 22.6', warmInk, 1.4) +
    form('M24 18 Q29 16 31 19 Q29.6 22 25 22Z', '#c98450', '', '', 1) + dot(28, 18.6, .8, '#1a1210') + strokePath('M12 17 l1 1.6 M16 16.6 l1 1.8 M20 16.8 l1 1.6', '#7a3e1e', .9),
  fletching: () => petBird('#2f2c33', { beak: '#3a3a3a', breast: '#4a4650' }),
  runecraft: () => '<g class="pet-flap">' + form('M16 18 Q8 6 4 10 Q2 17 15 19Z', '#b9a8f0', '', 'M7 10 Q10 10 13 15 Q8 13 7 10Z', 1) +
    form('M16 18 Q24 6 28 10 Q30 17 17 19Z', '#9f8ce0', '', '', 1) + form('M15 19 Q8 26 6 23 Q8 19 15 19Z', '#d7caf8', '', '', 1) +
    form('M17 19 Q24 26 26 23 Q24 19 17 19Z', '#c2b4f0', '', '', 1) + strokePath('M16 12 V23', warmInk, 1.4) + '</g>',
  cooking: () => petBeast('#d08a3a', { tail: 'curl', snout: .8, stripe: '#9a5a22', belly: '#f2dcb8' }),
};
let mapPetKey;
// Mascotas pintadas (art/mascotas.webp, de Referencias/hojas/hoja-14): una fila de 15, en el orden de `pets`.
function petArt(key, className = 'pet-paint') {
  const index = Object.keys(pets).indexOf(key);
  if (index < 0) return '';
  return '<span class="' + className + '" style="background-position:' + (index * 100 / 14).toFixed(3) + '% 0" aria-hidden="true"></span>';
}
function renderMapPet(key) {
  if (key === mapPetKey) return;
  mapPetKey = key;
  if (key && pets[key]) {
    // En el mapa camina con sus cuadros (art/mascotas-paseo.webp: 5 cuadros × 4 direcciones por mascota).
    const pet = byId('map-pet');
    // Quieta (y siempre en combate, con la cámara cerca) se ve la ilustración grande; caminando, los cuadros chicos.
    pet.innerHTML = '<span class="pet-shadow"></span><span class="pet-body"><span class="pet-walk" style="--pet-row:' +
      Object.keys(pets).indexOf(key) * 4 + '"></span>' + petArt(key, 'pet-paint pet-still') + '</span>';
    pet.walk = { key, row: 0, frame: 0, odometer: 0, idle: 0 };
    return;
  }
  const look = key && petLooks[key];
  byId('map-pet').innerHTML = look ? '<svg viewBox="0 0 32 28" aria-hidden="true"><ellipse cx="16" cy="26.4" rx="10" ry="2" fill="#1d1109" opacity=".32"/>' +
    '<g class="pet-body">' + look() + '</g></svg>' : '';
}

let sceneTaskKey = '';
let sceneHeroKey = '';
let sceneMotionKey = '';
let foeMotion;
let lastRound = -1;
let sceneEquipment = '';
let sceneXp;
function updateSceneEquipment() {
  sceneEquipment = JSON.stringify([game.equipped, game.cape, game.appearance]);
}
function setScenePosition(element, next, previous) {
  if (next.x === previous?.x && next.y === previous?.y) return false;
  if (element.id === 'hero' || element.id === 'map-pet') {
    element.style.setProperty('--actor-x', next.x / 1000);
    element.style.setProperty('--actor-y', next.y / 630);
  } else {
    element.style.left = next.x / 10 + '%';
    element.style.top = next.y / 6.3 + '%';
  }
  return true;
}
let shinyAt = 0;
let shinyUntil = 0;
let facing = 1;
let lastPosition;
let petLast;

// ─── Golpes ──────────────────────────────────────────────────────────────────
// Cada ronda: el héroe anticipa y golpea; el número aparece en el impacto y el rival responde después.
// game.js llama a sceneStrike y luego a scenePop en el mismo instante; acá se reparten en el tiempo.
let strikeImpactAt = 0;
let foeTurnAt = 0;
let popCount = 0;
const motionOk = () => !reducedMotion.matches && !document.hidden && !replaying;
const combatPace = () => Math.min(1, 1 / (typeof boostRate === 'function' ? boostRate(performance.now()) : 1));
// Punto de un elemento en coordenadas de la capa flotante (px).
function layerPoint(element, fx, fy) {
  const box = element.getBoundingClientRect();
  const floating = byId('floating');
  const layer = floating.getBoundingClientRect();
  // La capa puede estar agrandada por la cámara de combate: se pasa de píxeles de pantalla a píxeles de la capa.
  const zoom = layer.width / (floating.offsetWidth || layer.width) || 1;
  return { x: (box.left - layer.left + box.width * fx) / zoom, y: (box.top - layer.top + box.height * fy) / zoom };
}
const foeSprite = () => byId('foe').querySelector('.foe-sprite');
const fighting = () => !byId('foe').hidden && byId('hero').dataset.kind?.startsWith('fight');
function scenePop(text, x, y, className) {
  if (document.hidden) return;
  const now = performance.now();
  const onFoe = /\bpop-hit\b/.test(className) && fighting();
  const onHero = /\bpop-hurt\b/.test(className) && fighting();
  let delay = 0;
  if (onFoe) delay = Math.max(0, strikeImpactAt - now);
  if (onHero) {
    foeTurnAt = Math.max(now, strikeImpactAt) + 360 * combatPace();
    delay = foeTurnAt - now;
    setTimeout(() => foeLunge(), Math.max(0, delay - 170 * combatPace()));
  }
  const show = () => {
    if (document.hidden) return;
    const pop = document.createElement('span');
    pop.className = 'scene-pop ' + className;
    const jitter = (popCount++ % 3 - 1) * 7;
    if (onFoe || onHero) {
      // Los números del golpe salen al costado de la cabeza (detrás del héroe), nunca encima de la cara ni de la XP.
      const point = onFoe ? layerPoint(foeSprite(), .84, .4) : layerPoint(byId('hero'), -.08, .42);
      pop.style.left = point.x + jitter + 'px';
      pop.style.top = point.y + 'px';
      if (onFoe) /pop-miss/.test(className) ? foeDodge() : foeHit(/pop-max/.test(className), point);
      else heroFlinch(/pop-miss/.test(className));
    } else {
      pop.style.left = x / 10 + '%';
      pop.style.top = y / 6.3 + '%';
    }
    if (className === 'pop-item') pop.innerHTML = text;
    else pop.innerHTML = '<b>' + text.replace(/[<>&]/g, '') + '</b>';
    byId('floating').append(pop);
    setTimeout(() => pop.remove(), 1200);
  };
  if (delay > 16) setTimeout(show, delay);
  else show();
}
function animateFoe(frames, duration, easing = 'ease-out') {
  if (!motionOk() || byId('foe').hidden) return;
  foeMotion?.cancel();
  foeMotion = foeSprite().animate(frames, { duration, easing });
}
// Impacto: destello blanco, retroceso corto y temblor solo sobre el rival (nunca la pantalla).
function foeHit(max, point) {
  if (!motionOk()) return;
  const push = max ? 7 : 4;
  animateFoe([
    { transform: 'none', filter: 'brightness(1)' },
    { transform: 'translate(' + push + 'px,-1px) rotate(4deg)', filter: 'brightness(2.6) saturate(.2)', offset: .12 },
    { transform: 'translate(' + (-push * .5) + 'px,0) rotate(-2deg)', filter: 'brightness(1.2)', offset: .34 },
    { transform: 'translate(' + (push * .3) + 'px,0)', filter: 'brightness(1)', offset: .56 },
    { transform: 'none', filter: 'brightness(1)' },
  ], max ? 380 : 300);
  const spark = document.createElement('i');
  spark.className = 'scene-spark' + (max ? ' spark-max' : '');
  spark.style.left = point.x + 'px';
  spark.style.top = point.y + 'px';
  byId('floating').append(spark);
  setTimeout(() => spark.remove(), 420);
}
function foeDodge() {
  animateFoe([{ transform: 'none' }, { transform: 'translate(8px,-2px) rotate(6deg)', offset: .3 }, { transform: 'none' }], 340, 'cubic-bezier(.2,.7,.3,1)');
}
// Ataque del rival: se recoge (anticipación) y se lanza hacia el héroe.
function foeLunge() {
  animateFoe([
    { transform: 'none' },
    { transform: 'translate(4px,1px) scale(1.04,.94)', offset: .35 },
    { transform: 'translate(-12px,-1px) scale(.97,1.04)', offset: .6 },
    { transform: 'none' },
  ], 380 * combatPace(), 'ease-in-out');
}
function heroFlinch(miss) {
  if (!motionOk()) return;
  const art = byId('hero-art');
  art.animate(miss ? [{ transform: 'none' }, { transform: 'translate(-4px,0) rotate(-5deg)', offset: .35 }, { transform: 'none' }] :
    [{ transform: 'none', filter: 'none' }, { transform: 'translate(-3px,0) rotate(-6deg)', filter: 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(1.1)', offset: .2 },
      { transform: 'translate(1px,0)', filter: 'none', offset: .6 }, { transform: 'none', filter: 'none' }], { duration: 300, easing: 'ease-out' });
}
function shoot(kind, travel) {
  const hero = byId('hero');
  const from = layerPoint(hero, .86, kind === 'arrow' ? .44 : .16);
  const to = layerPoint(foeSprite(), .5, .45);
  const shot = document.createElement('i');
  shot.className = 'scene-shot shot-' + kind;
  shot.style.left = from.x + 'px';
  shot.style.top = from.y + 'px';
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (kind === 'orb') shot.style.setProperty('--orb', game.equipped.staff ? iconSpec(game.equipped.staff)[1] : '#b9a8f0');
  byId('floating').append(shot);
  shot.animate([{ transform: 'translate(0,0) rotate(' + angle + 'deg) scale(.6)', opacity: 1 },
    { transform: 'translate(' + dx * .5 + 'px,' + (dy * .5 - (kind === 'arrow' ? 6 : 2)) + 'px) rotate(' + angle + 'deg) scale(1)', opacity: 1, offset: .5 },
    { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + angle + 'deg) scale(1)', opacity: .9 }], { duration: travel, easing: 'linear' });
  setTimeout(() => shot.remove(), travel);
}
function sceneStrike(task, eating) {
  const now = performance.now();
  strikeImpactAt = now;
  if (reducedMotion.matches || replaying || document.hidden || byId('hero').dataset.kind !== activityKind(task)) return;
  const pace = combatPace();
  const arm = byId('hero-art').querySelector('.hero-work-arm');
  const body = byId('hero-art').querySelector('.hero-body');
  if (!arm) return;
  const turn = (frames, duration, easing = 'ease-in-out') => arm.animate(frames.map(([angle, offset]) =>
    ({ transform: 'rotate(' + angle + 'deg)', ...(offset === undefined ? {} : { offset }) })), { duration, easing });
  if (eating) {
    turn([[-38], [-120, .4], [-120, .7], [-38]], 520);
    return;
  }
  if (task.style === 'melee') {
    const duration = 420 * pace;
    // Anticipación lenta, tajo rápido, seguimiento y vuelta a la guardia.
    turn([[-38], [-170, .42], [-178, .5], [-8, .6], [-20, .78], [-38]], duration);
    body?.animate([{ transform: 'none' }, { transform: 'translate(-1px,0) rotate(-4deg)', offset: .45 },
      { transform: 'translate(3px,0) rotate(6deg)', offset: .62 }, { transform: 'none' }], { duration, easing: 'ease-in-out' });
    strikeImpactAt = now + duration * .6;
  } else if (task.style === 'ranged') {
    const duration = 380 * pace;
    turn([[-84], [-88, .5], [-78, .6], [-84]], duration);
    byId('hero-art').querySelector('.hero-arrow')?.animate([{ opacity: 1 }, { opacity: 1, offset: .58 }, { opacity: 0, offset: .6 }, { opacity: 0, offset: .9 }, { opacity: 1 }], duration);
    body?.animate([{ transform: 'none' }, { transform: 'translate(-1px,0)', offset: .55 }, { transform: 'translate(-2px,0) rotate(-2deg)', offset: .66 }, { transform: 'none' }], duration);
    const travel = 170 * pace;
    setTimeout(() => !byId('foe').hidden && shoot('arrow', travel), duration * .6);
    strikeImpactAt = now + duration * .6 + travel;
  } else {
    const duration = 440 * pace;
    turn([[-48], [-100, .45], [-26, .6], [-48]], duration);
    byId('hero-art').querySelector('.hero-orb')?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.7)', offset: .5 }, { transform: 'scale(.8)', offset: .62 }, { transform: 'scale(1)' }],
      { duration, easing: 'ease-in-out' });
    const travel = 220 * pace;
    setTimeout(() => !byId('foe').hidden && shoot('orb', travel), duration * .6);
    strikeImpactAt = now + duration * .6 + travel;
  }
}
// Se llama al terminar cada ciclo: muestra lo obtenido saliendo del lugar de trabajo.
function sceneCycle(task, items) {
  const spot = heroSpot(task.zone);
  const [first] = Object.keys(items);
  if (first && !task.enemy) scenePop(itemIcon(first), spot.x + 34, spot.y - 6, 'pop-item');
  if (!task.enemy) propFinish(activityKind(task));
  if (task.enemy) {
    lastRound = -1;
    const wait = Math.max(0, strikeImpactAt - performance.now());
    setTimeout(() => foeDeath(task), wait);
  }
}
// ─── Lo que se rompe al terminar cada ciclo ─────────────────────────────────
// Partículas livianas: un contenedor con pocos <b>, cada uno con su dirección en variables CSS.
function burst(x, y, kind, count, spread = 1) {
  const fx = document.createElement('i');
  fx.className = 'fx fx-' + kind;
  fx.style.left = x + 'px';
  fx.style.top = y + 'px';
  for (let n = 0; n < count; n++) {
    const angle = (n / count - .5) * Math.PI * .9 * spread - Math.PI / 2 + (Math.random() - .5) * .5;
    const speed = (16 + Math.random() * 14) * spread;
    const bit = document.createElement('b');
    bit.style.setProperty('--dx', Math.cos(angle) * speed * 1.3 + 'px');
    bit.style.setProperty('--dy', Math.sin(angle) * speed + 'px');
    bit.style.setProperty('--r', (Math.random() * 360 - 180) + 'deg');
    bit.style.animationDelay = Math.random() * 60 + 'ms';
    fx.append(bit);
  }
  byId('floating').append(fx);
  setTimeout(() => fx.remove(), 1000);
}
function propFinish(kind) {
  const prop = byId('prop');
  const art = prop.querySelector('.prop-art');
  if (prop.hidden || !art || !motionOk()) return;
  const at = (fx, fy) => layerPoint(prop, fx, fy);
  if (kind === 'chop') {
    // El árbol cae, se desvanece y vuelve a crecer; las hojas y astillas vuelan.
    art.animate([{ transform: 'none', opacity: 1 }, { transform: 'rotate(4deg)', opacity: 1, offset: .1 },
      { transform: 'rotate(22deg) translateY(4px)', opacity: 0, offset: .38 }, { transform: 'scale(.55)', opacity: 0, offset: .6 },
      { transform: 'scale(1.06,1.03)', opacity: 1, offset: .86 }, { transform: 'none', opacity: 1 }], { duration: 1200, easing: 'ease-in-out' });
    const top = at(.55, .35);
    burst(top.x, top.y, 'leaf', 7, 1.3);
    const base = at(.42, .86);
    burst(base.x, base.y, 'chip', 5, .8);
  } else if (kind === 'mine') {
    // La roca se aplasta, suelta trozos y polvo, y se recompone.
    art.animate([{ transform: 'none' }, { transform: 'scale(1.06,.9) translateY(3px)', offset: .18 }, { transform: 'translateX(-2px)', offset: .3 },
      { transform: 'scale(.98,1.03)', offset: .5 }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
    const hit = at(.4, .55);
    burst(hit.x, hit.y, 'rock', 6, 1);
    burst(hit.x, hit.y, 'spark', 6, 1.1);
    const dust = document.createElement('i');
    dust.className = 'scene-dust';
    const foot = at(.5, .85);
    dust.style.left = foot.x + 'px';
    dust.style.top = foot.y + 'px';
    byId('floating').append(dust);
    setTimeout(() => dust.remove(), 800);
  } else if (kind === 'fish') {
    prop.querySelector('.prop-bob')?.animate([{ transform: 'none' }, { transform: 'translateY(5px)', offset: .25 }, { transform: 'translateY(-3px)', offset: .55 }, { transform: 'none' }], 600);
    const water = at(.5, .5);
    burst(water.x, water.y, 'drop', 8, 1);
    burst(water.x, water.y, 'ring', 1, 0);
  } else if (kind === 'smith') {
    const anvil = at(.42, .3);
    burst(anvil.x, anvil.y, 'spark', 10, 1.4);
    burst(anvil.x, anvil.y, 'flash', 1, 0);
  } else if (kind === 'cook') {
    const pot = at(.5, .2);
    burst(pot.x, pot.y, 'steam', 4, .5);
  } else if (kind === 'fletch') {
    const log = at(.5, .5);
    burst(log.x, log.y, 'chip', 5, .7);
  } else if (kind === 'rune' || kind === 'pray') {
    const ring = at(.5, .5);
    burst(ring.x, ring.y, kind === 'rune' ? 'rune' : 'holy', 1, 0);
    burst(ring.x, ring.y, kind === 'rune' ? 'mote' : 'holymote', 6, .9);
  }
}
// Muerte del rival: destello, cae hacia atrás entre polvo y, tras una pausa, aparece el siguiente.
function foeDeath(task) {
  const foe = byId('foe');
  if (foe.hidden || !motionOk()) return;
  foe.classList.add('foe-respawn');
  clearTimeout(foe.respawnTimer);
  foe.respawnTimer = setTimeout(() => foe.classList.remove('foe-respawn'), 1300);
  animateFoe([
    { transform: 'none', opacity: 1, filter: 'brightness(1)' },
    { transform: 'translate(2px,-3px) rotate(4deg)', opacity: 1, filter: 'brightness(3) saturate(0)', offset: .08 },
    { transform: 'translate(8px,4px) rotate(24deg) scale(1,.8)', opacity: .7, filter: 'brightness(.6) saturate(.4)', offset: .32 },
    { transform: 'translate(10px,8px) rotate(30deg) scale(1,.6)', opacity: 0, filter: 'brightness(.6)', offset: .46 },
    { transform: 'translate(0,-8px) scale(.9,1.1)', opacity: 0, offset: .74 },
    { transform: 'translate(0,1px) scale(1.06,.92)', opacity: 1, filter: 'brightness(1)', offset: .9 },
    { transform: 'none', opacity: 1, filter: 'brightness(1)' },
  ], 1300, 'ease-out');
  const point = layerPoint(foeSprite(), .5, .9);
  const dust = document.createElement('i');
  dust.className = 'scene-dust';
  dust.style.left = point.x + 'px';
  dust.style.top = point.y + 'px';
  byId('floating').append(dust);
  setTimeout(() => dust.remove(), 800);
  if (task.boss !== undefined || task.challenge || task.daily !== undefined) {
    const hero = byId('hero');
    hero.classList.add('hero-cheer');
    clearTimeout(hero.cheerTimer);
    hero.cheerTimer = setTimeout(() => hero.classList.remove('hero-cheer'), 1500);
  }
}
// Marcador de combate (abajo del mapa con la cámara cerca): tu retrato y tu vida contra el rival, y la ronda.
let battleHudKey = '';
function renderBattleHud(task, state, round) {
  const maxHp = lv('hitpoints');
  const rations = (game.rations || []).reduce((sum, ration) => sum + ration.count, 0);
  const foeHp = state ? Math.max(0, state.foeHp) : task.enemy.hp, foeMax = state?.foeMax ?? task.enemy.hp;
  const enraged = round >= enrageFor(task);
  const key = [task.id, game.hp, maxHp, rations, foeHp, foeMax, round, enraged, character?.id].join('|');
  if (key === battleHudKey) return;
  const fresh = !battleHudKey.startsWith(task.id + '|');
  battleHudKey = key;
  if (fresh) {
    byId('bh-hero-face').innerHTML = faceArt(game.appearance);
    byId('bh-hero-name').textContent = character?.name || 'Tu personaje';
    byId('bh-foe-face').innerHTML = enemyArt(task);
    byId('bh-foe-name').textContent = task.enemy.name;
    byId('battle-hud').classList.toggle('bh-boss', task.boss !== undefined || Boolean(task.challenge));
  }
  byId('bh-hero-hp').style.width = 100 * Math.max(0, game.hp) / maxHp + '%';
  byId('bh-hero-hp').parentElement.classList.toggle('bh-low', game.hp <= maxHp * .3);
  byId('bh-hero-info').textContent = game.hp + ' / ' + maxHp + ' vida · ' + rations + (rations === 1 ? ' ración' : ' raciones');
  byId('bh-foe-hp').style.width = 100 * foeHp / foeMax + '%';
  byId('bh-foe-info').textContent = enraged ? '¡Enfurecido! Pega un 50 % más' : foeHp + ' / ' + foeMax + ' vida';
  byId('battle-hud').classList.toggle('bh-enraged', enraged);
  byId('bh-round').textContent = Math.max(1, round);
}
function renderScene(now) {
  const hero = byId('hero');
  const walking = Boolean(destination || keyboard.size);
  if (lastPosition && Math.abs(position.x - lastPosition.x) > .2) facing = position.x > lastPosition.x ? 1 : -1;
  const rise = lastPosition ? position.y - lastPosition.y : 0, run_ = lastPosition ? Math.abs(position.x - lastPosition.x) : 0;
  if (!lastPosition || position.x !== lastPosition.x || position.y !== lastPosition.y) lastPosition = { ...position };
  const task = run?.task;
  const paused = Boolean(run && packPaused?.activity === run);
  const working = Boolean(task && !destination && (paused ? packPaused.now : now) >= run.nextAt - run.duration);
  const kind = working ? activityKind(task) : '';
  if (kind) facing = 1;
  // De espaldas cuando sube por el mapa; de frente al bajar, al trabajar y al pelear.
  const heading = kind || !walking ? 'front' : rise < -.15 && -rise > run_ * .35 ? 'back' :
    rise > .15 ? 'front' : hero.dataset.view || 'front';
  if (hero.dataset.view !== heading) hero.dataset.view = heading;
  const boosted = boostActive(now);
  const hud = byId('boost-hud');
  hud.hidden = !boosted;
  if (boosted) {
    const clock = byId('boost-clock');
    const value = Math.ceil((boostUntil - now) / 1000) + ' s';
    if (clock.textContent !== value) clock.textContent = value;
  }
  const motionKey = [walking, facing, boosted, paused].join('|');
  if (motionKey !== sceneMotionKey) {
    sceneMotionKey = motionKey;
    hero.classList.toggle('walking', walking);
    hero.classList.toggle('boosted', boosted);
    hero.style.setProperty('--face', facing);
    byId('hero-tool').style.setProperty('--tool-face', facing);
    hero.dataset.facing = facing === 1 ? 'right' : 'left';
    byId('map-scene').classList.toggle('work-paused', paused);
  }
  const heroKey = kind + '|' + sceneEquipment;
  if (heroKey !== sceneHeroKey) {
    sceneHeroKey = heroKey;
    hero.dataset.kind = kind;
    byId('hero-art').innerHTML = heroEquipmentArt(kind);
    byId('hero-tool').textContent = '';
  }
  const taskKey = kind + '|' + (working ? task.id : '');
  if (taskKey !== sceneTaskKey) {
    sceneTaskKey = taskKey;
    const workspace = byId('workspace');
    const inForest = Boolean(working && task.zone === 'forest');
    if (workspace.classList.contains('forest-work') !== inForest) {
      workspace.classList.toggle('forest-work', inForest);
      focusMap();
    }
    const prop = byId('prop');
    const art = kind && !task?.enemy && propArt[kind];
    prop.hidden = !art;
    if (art) {
      const [dx, dy] = propOffset[kind];
      prop.dataset.kind = kind;
      prop.style.setProperty('--dx', dx + 'px');
      prop.style.setProperty('--dy', dy + 'px');
      prop.innerHTML = '<div class="prop-art">' + art(oreColors[Object.keys(task.output)[0]] || '#c9c1a0', task) + '</div>';
      setScenePosition(prop, heroSpot(task.zone));
    }
    const foe = byId('foe');
    foeMotion?.cancel();
    foe.hidden = !(working && task.enemy);
    if (!foe.hidden) {
      foe.classList.toggle('foe-big', Boolean(task.big));
      foe.querySelector('.foe-sprite').innerHTML = enemyArt(task);
      foe.querySelector('.foe-name').textContent = task.enemy.name;
      const boss = task.boss !== undefined || Boolean(task.challenge);
      foe.classList.toggle('foe-boss', boss);
      // Cada tramo un poco más imponente: la rata es chica y el dragón ocupa su lugar.
      const tier = Math.max(0, Math.min(7, task.battleTier ?? 0));
      foe.style.setProperty('--foe-size', (boss ? [.9, 1, 1, 1, 1.04, 1.06, 1.1, 1.12] : [.8, .92, 1.04, 1, 1.04, 1.04, 1.04, 1.14])[tier]);
      const bar = foe.querySelector('.foe-hp');
      if (!bar.querySelector('b')) bar.insertAdjacentHTML('afterbegin', '<b></b>');
      setScenePosition(foe, heroSpot(task.zone));
      lastRound = -1;
    }
  }
  const cycle = working && !task.enemy ? Math.max(.35, run.duration / 1000) : .6;
  if (hero.dataset.swing !== String(cycle)) {
    hero.dataset.swing = cycle;
    byId('map-scene').style.setProperty('--work-cycle', cycle + 's');
  }
  const skill = working ? (task.enemy ? task.train || (task.style === 'melee' ? 'attack' : task.style) : task.skill) : undefined;
  const xp = skill && (game.xp[skill] || 0);
  if (!sceneXp || sceneXp.skill !== skill || sceneXp.xp !== xp) {
    sceneXp = { skill, xp };
    byId('hero-xp').hidden = !skill;
    if (skill) {
      const progress = Math.floor(xpPercent(skill));
      const label = skills[skill][0] + ' · ' + lv(skill);
      const bar = byId('hero-xp');
      if (bar.dataset.label !== label) {
        bar.dataset.label = label;
        byId('hero-xp-label').innerHTML = skillIcon(skill) + '<b>' + lv(skill) + '</b>';
        bar.setAttribute('aria-label', 'Experiencia de ' + skills[skill][0]);
      }
      if (bar.dataset.percent !== String(progress)) {
        bar.dataset.percent = progress;
        bar.setAttribute('aria-valuenow', progress);
        byId('hero-xp-fill').style.width = progress + '%';
      }
    }
  }
  if (working && task.enemy) {
    // La barra del rival muestra su vida real: una derrota nunca se ve como una victoria.
    const state = run.fight;
    const round = state?.round ?? 0;
    if (round !== lastRound) {
      const foe = byId('foe');
      const left = state ? Math.max(0, state.foeHp) / state.foeMax : 1;
      foe.querySelector('.foe-hp i').style.width = 100 * left + '%';
      foe.querySelector('.foe-hp b').style.width = 100 * left + '%';
      foe.classList.toggle('foe-enraged', round >= enrageFor(task));
      lastRound = round;
    }
    renderBattleHud(task, state, round);
  }
  // La cámara sigue la pelea en curso (no el cuadro): entre un rival y el siguiente no se abre y vuelve a cerrar.
  // Si la pelea terminó de verdad (otra actividad, parar o caminar) se abre al instante; el retardo es solo entre rivales.
  if (typeof setBattleCamera === 'function') setBattleCamera(Boolean(task?.enemy && !destination && !walking &&
    Math.max(now, performance.now()) >= run.nextAt - run.duration - 1500),
    !task?.enemy || Boolean(destination && destination.id !== 'arena') || (walking && !destination));
  renderPetMotion();
  // Con el héroe en la mitad de abajo del mapa, las tarjetas de nivel suben para no taparlo.
  const low = position.y > 330;
  if (document.body.classList.contains('hero-low') !== low) document.body.classList.toggle('hero-low', low);
  renderShiny(now, working, task);
}
// La mascota mira hacia donde va y da saltitos mientras sigue al héroe.
// Cuadro de la mascota según hacia dónde se mueve: de frente, a la derecha, de espaldas o a la izquierda.
function stepPetWalk(dx, dy, dt) {
  const pet = byId('map-pet');
  const walk = pet.walk;
  const sprite = walk && pet.querySelector('.pet-walk');
  if (!sprite) return;
  const moved = Math.hypot(dx, dy);
  if (moved > .05) {
    walk.row = Math.abs(dy) > Math.abs(dx) * 1.15 ? (dy > 0 ? 0 : 2) : (dx > 0 ? 1 : 3);
    walk.odometer += moved;
    walk.frame = Math.floor(walk.odometer / 14) % 5;
    walk.idle = 0;
  } else {
    // Quieta: se sienta mirando al frente y repite despacio sus cuadros (respira, parpadea).
    walk.idle += dt;
    if (walk.idle > .35) { walk.row = 0; walk.frame = Math.floor(walk.idle / .45) % 5; }
  }
  pet.classList.toggle('pet-resting', walk.idle > .35);
  if (moved > .05) pet.dataset.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : pet.dataset.facing || 'right';
  {
  }
  const key = walk.row + '|' + walk.frame;
  if (sprite.dataset.key === key) return;
  sprite.dataset.key = key;
  const row = Object.keys(pets).indexOf(walk.key) * 4 + walk.row;
  sprite.style.backgroundPosition = (walk.frame * 25) + '% ' + (row * 100 / 59).toFixed(4) + '%';
}
function renderPetMotion() {
  const pet = byId('map-pet');
  if (pet.hidden || pet.walk) return;
  const x = Number(pet.style.getPropertyValue('--actor-x'));
  if (petLast !== undefined && Math.abs(x - petLast) > .0004) {
    pet.dataset.facing = x > petLast ? 'right' : 'left';
    pet.classList.add('pet-moving');
    clearTimeout(pet.restTimer);
    pet.restTimer = setTimeout(() => pet.classList.remove('pet-moving'), 220);
  }
  petLast = x;
}
// Destello: aparece mientras trabajás y acelera las actividades durante un tiempo limitado.
function renderShiny(now, working, task) {
  const shiny = byId('shiny');
  if (!working || document.hidden || task.effect) {
    if (!shiny.hidden) shiny.hidden = true;
    shinyAt = 0;
    return;
  }
  if (!shinyAt) shinyAt = now + 35000 + Math.random() * 40000;
  if (shiny.hidden && now >= shinyAt && !boostActive()) {
    const spot = heroSpot(task.zone);
    const angle = Math.random() * Math.PI * 2;
    shiny.style.left = Math.max(4, Math.min(96, (spot.x + Math.cos(angle) * 70) / 10)) + '%';
    shiny.style.top = Math.max(18, Math.min(92, (spot.y - 10 + Math.sin(angle) * 45) / 6.3)) + '%';
    shiny.hidden = false;
    shinyUntil = now + 12000;
  } else if (!shiny.hidden && now >= shinyUntil) {
    shiny.hidden = true;
    shinyAt = 0;
  }
}
function catchShiny() {
  const task = run?.task;
  const shiny = byId('shiny');
  if (!task || shiny.hidden || performance.now() >= shinyUntil) return;
  shiny.hidden = true;
  shinyAt = 0;
  activateActionBoost();
  const bonus = taskXp(task) * 5;
  if (task.skill && bonus) {
    grant(task.skill, bonus);
    floatXp(task, Math.round(bonus * xpBoost()));
  }
  game.shinies = (game.shinies || 0) + 1;
  notify('¡Destello! Ritmo ×2 durante 25 segundos');
  celebrate();
  save();
  render();
}
