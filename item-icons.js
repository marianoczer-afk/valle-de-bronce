'use strict';

// Íconos de objetos dibujados con SVG paramétrico, en una grilla de 32×32.
// Reglas del set (para que todo se lea igual a 24–32 px y quede prolijo a 64 px):
// · Luz desde arriba a la izquierda; tres tonos por material (claro, base, sombra), sin degradados.
// · Contorno oscuro cálido de 1,5 px por fuera de la silueta (trazo de 3 px detrás del relleno).
// · Armas y herramientas en diagonal a 45°, con el mango abajo a la izquierda.
// · El color dice el material o el tramo: la forma de cada familia no cambia entre bronce y dragón.
// Sin <defs> ni ids: el mismo SVG puede repetirse cientos de veces en la página sin choques.

const ART_INK = '#20160d';
const artOutline = 'stroke="' + ART_INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"';

// ─── Ayudantes de dibujo ────────────────────────────────────────────────────
const fill = (d, color, extra = '') => '<path d="' + d + '" fill="' + color + '"' + extra + '/>';
const solid = (d, color) => fill(d, color, ' ' + artOutline);
const stroke = (d, color, width = 1, opacity = 1) => '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width +
  '" stroke-linecap="round" stroke-linejoin="round"' + (opacity < 1 ? ' opacity="' + opacity + '"' : '') + '/>';
// Trazo con contorno: primero la tinta más ancha, encima el color.
const rope = (d, color, width) => stroke(d, ART_INK, width + 3) + stroke(d, color, width);
const circle = (cx, cy, r) => 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0Z';
const ellipse = (cx, cy, rx, ry) => 'M' + (cx - rx) + ' ' + cy + 'a' + rx + ' ' + ry + ' 0 1 0 ' + 2 * rx + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + -2 * rx + ' 0Z';
// Silueta unida: todos los contornos primero y los rellenos después, así las piezas se funden sin líneas internas.
const union = parts => '<g fill="' + ART_INK + '" stroke="' + ART_INK + '" stroke-width="3" stroke-linejoin="round">' +
  parts.map(([d]) => '<path d="' + d + '"/>').join('') + '</g>' + parts.map(([d, color]) => fill(d, color)).join('');
const turn = (body, degrees = 45) => '<g transform="rotate(' + degrees + ' 16 16)">' + body + '</g>';
const place = (body, x, y, scale = 1) => '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' + body + '</g>';
const sparkle = (x, y, r = 2.2, color = '#fff') => fill('M' + x + ' ' + (y - r) + 'Q' + (x + .25 * r) + ' ' + (y - .25 * r) + ' ' + (x + r) + ' ' + y +
  'Q' + (x + .25 * r) + ' ' + (y + .25 * r) + ' ' + x + ' ' + (y + r) + 'Q' + (x - .25 * r) + ' ' + (y + .25 * r) + ' ' + (x - r) + ' ' + y +
  'Q' + (x - .25 * r) + ' ' + (y - .25 * r) + ' ' + x + ' ' + (y - r) + 'Z', color);

function mixHex(a, b, amount) {
  const parse = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [parse(a), parse(b)];
  return '#' + x.map((value, i) => Math.round(value + (y[i] - value) * amount).toString(16).padStart(2, '0')).join('');
}
// Paleta de tres tonos a partir de un color base (para glifos con color libre).
const tone = hex => ({ h: mixHex(hex, '#ffffff', .42), b: hex, l: mixHex(hex, '#000000', .45) });

// ─── Paletas ───────────────────────────────────────────────────────────────
// Ocho metales, uno por tramo. Probados a 24 px uno al lado del otro: ninguno se confunde con el vecino.
const metalTones = [
  { h: '#f3b77c', b: '#c27a3e', l: '#7a4220' }, // bronce
  { h: '#bdb8b2', b: '#857f79', l: '#4f4a45' }, // hierro: gris cálido y apagado
  { h: '#f6fafc', b: '#bccad3', l: '#6c7e8b' }, // acero: claro y frío
  { h: '#7b8290', b: '#3d424c', l: '#1b1e24' }, // acero negro
  { h: '#aebcff', b: '#5a6fd6', l: '#2d3c8c' }, // mithril
  { h: '#a2e6ac', b: '#3f9e60', l: '#1f5c36' }, // adamantita
  { h: '#aaf3f6', b: '#2fb4c6', l: '#156675' }, // rúnico
  { h: '#ff9672', b: '#cf3a28', l: '#771810' }, // dragón
];
const silverTone = { h: '#ffffff', b: '#d5dee6', l: '#8193a2' };
const goldTone = { h: '#fff1a6', b: '#e3b23a', l: '#90641a' };
const woodTone = { h: '#d2a46b', b: '#93653a', l: '#583a1f' };
const leatherTone = { h: '#c49464', b: '#87592f', l: '#4b2f18' };
const stoneTone = { h: '#a39a8f', b: '#6c655d', l: '#3c3833' };
const runeStone = { h: '#d6d2c6', b: '#9c978b', l: '#5f5b53' };
const boneTone = { h: '#fffaea', b: '#e2d6b8', l: '#9a8a68' };
// Maderas: corteza y corazón. La corteza manda en la lectura; el corazón dice si es claro u oscuro.
const woodTones = [
  { bark: '#8a6440', h: '#ddb47c', b: '#c49a62', l: '#7a5531' }, // tronco común
  { bark: '#6a4a2c', h: '#d7a466', b: '#b8844a', l: '#6e4a26' }, // roble
  { bark: '#6f7240', h: '#e3dca0', b: '#c9c07a', l: '#7c7640' }, // sauce
  { bark: '#7a5a34', h: '#f0c47a', b: '#d6a352', l: '#8a6328' }, // teca
  { bark: '#8a4a24', h: '#f4b27a', b: '#de8a48', l: '#8c4c22' }, // arce
  { bark: '#4e2418', h: '#cc6f50', b: '#a2442c', l: '#5e2114' }, // caoba
  { bark: '#3a2a1e', h: '#b48862', b: '#86603e', l: '#4a3220' }, // tejo
  { bark: '#3e2f6e', h: '#d2c2ff', b: '#9c86f0', l: '#4c3a9a' }, // mágico
];
// Elementos de runas y bastones.
const elementTones = [
  { h: '#ffffff', b: '#cdeef0', l: '#6aa7b0' }, // aire
  { h: '#a6d4ff', b: '#2f86e0', l: '#164c8e' }, // agua
  { h: '#f0c88a', b: '#b8782e', l: '#5e3a10' }, // tierra
  { h: '#ffd27a', b: '#f06a1e', l: '#8e3008' }, // fuego
  { h: '#d4a2ff', b: '#8a3fd6', l: '#481c80' }, // caos
  { h: '#e6e8ff', b: '#9aa2ec', l: '#4f569c' }, // lunar
  { h: '#ffc2ef', b: '#e054c0', l: '#83226c' }, // astral
  { h: '#ff8a8a', b: '#c3162c', l: '#690a16' }, // sangre
];
const gemTones = {
  Topacio: { h: '#ffe39a', b: '#f2a52c', l: '#9a5a0c' },
  Granate: { h: '#e98a8a', b: '#8e1f2c', l: '#4a0c14' },
  Zafiro: { h: '#a8c8ff', b: '#2f63d6', l: '#16307a' },
  Ónix: { h: '#7c7f8e', b: '#2c2d34', l: '#111216' },
  Esmeralda: { h: '#a6f0b8', b: '#1fa457', l: '#0c5a2c' },
  Rubí: { h: '#ffa0b4', b: '#e8204e', l: '#82092a' },
  Diamante: { h: '#ffffff', b: '#d4f4fa', l: '#7fb6c4' },
  'Piedra de dragón': { h: '#f2a8ff', b: '#b23cd0', l: '#5e1474' },
};

// ─── Familias ──────────────────────────────────────────────────────────────
// Cada familia recibe paletas y devuelve el interior del SVG. Las armas se dibujan verticales y se giran 45°.
const artFamilies = {
  sword(m, grip = leatherTone) {
    return turn(
      solid('M16 -1.6L19.4 3.2V21H12.6V3.2Z', m.b) + fill('M16 -.4L13.9 3.6V21H16Z', m.h) + fill('M18.3 4.2V21H19.4V3.6Z', m.l) +
      solid('M8.6 21H23.4V24.2H8.6Z', m.b) + fill('M9.4 21.6H22.6V22.4H9.4Z', m.h) +
      solid('M14.6 24.2H17.4V30.2H14.6Z', grip.b) + fill('M14.6 24.2H15.6V30.2H14.6Z', grip.h) +
      solid(circle(16, 31.6, 2.2), m.b) + fill(circle(15.3, 31, .9), m.h));
  },
  saber(m) {
    return turn(
      solid('M14 -1Q20.5 8 19.6 21H13.2Q14.2 10 12.4 2Z', m.b) + fill('M13.6 .8Q15.6 10 15.1 21H13.2Q14.2 10 12.4 2Z', m.h) +
      solid('M8.2 21H23.8V24.2H8.2Z', goldTone.b) + fill('M9 21.6H23V22.4H9Z', goldTone.h) +
      solid('M14.6 24.2H17.4V30.2H14.6Z', '#3a2a22') + solid(circle(16, 31.6, 2.2), goldTone.b));
  },
  axe(m, haft = woodTone) {
    return turn(
      solid('M14.6 2.2H17.4V33H14.6Z', haft.b) + fill('M14.6 2.2H15.6V33H14.6Z', haft.h) +
      solid('M17.6 6.4L13.4 7.6Q9.6 6.6 6.6 3.2Q2 11.4 5.4 21.2Q9 16.4 13.4 16L17.6 15.6Z', m.b) +
      fill('M6.6 3.2Q2 11.4 5.4 21.2Q6.9 19.2 8.6 18Q6 11.4 8.8 5.4Z', m.h) + fill('M14.4 7.4L17.6 6.4V15.6L14.4 15.9Z', m.l) +
      solid('M17.4 7.4H20.6V14.4H17.4Z', m.l));
  },
  pick(m, haft = woodTone) {
    return turn(
      solid('M14.6 6H17.4V33H14.6Z', haft.b) + fill('M14.6 6H15.6V33H14.6Z', haft.h) +
      solid('M3.2 13.6Q7.6 4.4 16 3.8Q24.4 4.4 28.8 13.6Q23.6 9.2 16 9.2Q8.4 9.2 3.2 13.6Z', m.b) +
      fill('M3.2 13.6Q7.6 4.4 16 3.8V6Q9.6 6.4 3.2 13.6Z', m.h) + fill('M28.8 13.6Q23.6 9.2 16 9.2V7.4Q23.6 7.6 28.8 13.6Z', m.l) +
      solid('M13.6 3.2H18.4V10.2H13.6Z', m.b) + fill('M13.6 3.2H15.2V10.2H13.6Z', m.h));
  },
  hammer(m, haft = woodTone) {
    return turn(
      solid('M14.6 9H17.4V33H14.6Z', haft.b) + fill('M14.6 9H15.6V33H14.6Z', haft.h) +
      solid('M6 2.6H26V10.6H6Z', m.b) + fill('M6 2.6H26V4.6H6Z', m.h) + fill('M6 4.6H8.2V10.6H6Z', m.h) + fill('M23.6 4.6H26V10.6H23.6Z', m.l));
  },
  bow(wood, wrap) {
    return turn(
      rope('M19.6 .6Q8 6 8 16Q8 26 19.6 31.4', wood.b, 3.8) + stroke('M18.4 1.8Q9.2 6.8 8.8 13', wood.h, 1.3) +
      stroke('M19.6 .6V31.4', ART_INK, 2.6) + stroke('M19.6 .6V31.4', '#eadfc4', 1) +
      solid('M5.8 12.4H10.4V19.6H5.8Z', wrap.b) + fill('M5.8 12.4H7.4V19.6H5.8Z', wrap.h) +
      solid(circle(19.6, 1, 1.5), wrap.b) + solid(circle(19.6, 31, 1.5), wrap.b));
  },
  arrow(m, fletch = '#efe7d4') {
    return turn(
      rope('M16 6V30', woodTone.b, 2) +
      solid('M12.6 25.4L15 27.4V33.4L12.6 31.4Z', fletch) + solid('M19.4 25.4L17 27.4V33.4L19.4 31.4Z', mixHex(fletch, '#000000', .18)) +
      solid('M16 -1.4L21 8.2L16 6.4L11 8.2Z', m.b) + fill('M16 -.2L12.4 7.4L16 6.4Z', m.h));
  },
  tips(m) {
    const head = (x, y) => '<g transform="translate(' + x + ' ' + y + ') rotate(45)">' +
      solid('M-1.3 2H1.3V8.4H-1.3Z', m.l) + solid('M0 -8.4L5.4 3.4L0 1.6L-5.4 3.4Z', m.b) + fill('M0 -7L-4.2 2.6L0 1.6Z', m.h) + '</g>';
    return head(9, 13.6) + head(18.4, 9.4) + head(15.6, 21.4);
  },
  staff(orb, shaft) {
    return turn(
      rope('M16 12V33.4', shaft.b, 3) + stroke('M15.2 13V32.4', shaft.h, 1) +
      solid('M9.4 5.6Q9.4 12.6 16 13.6Q22.6 12.6 22.6 5.6L19.8 9.6Q16 11.4 12.2 9.6Z', shaft.l) +
      solid(circle(16, 5.2, 5.8), orb.b) + fill('M10.2 5.2A5.8 5.8 0 0 1 16 -.6V1.8A3.4 3.4 0 0 0 12.6 5.2Z', orb.h) +
      fill('M21.8 5.2A5.8 5.8 0 0 1 16 11V9A3.8 3.8 0 0 0 19.8 5.2Z', orb.l) + sparkle(13.6, 2.8, 1.6));
  },
  helmet(m) {
    return solid('M5.6 17Q5.6 4.4 16 4.4Q26.4 4.4 26.4 17V25.4Q26.4 28.4 23.4 28.4H8.6Q5.6 28.4 5.6 25.4Z', m.b) +
      fill('M7.4 16Q7.4 6.6 15 6.2V14.6H7.4Z', m.h) + fill('M7.4 18.6H13.4V26.6H8.6Q7.4 26.6 7.4 25.4Z', m.h) +
      fill('M22.4 8.4Q24.6 11.4 24.6 17V25.4Q24.6 26.6 23.4 26.6H22.4Z', m.l) +
      solid('M8.6 14.4H23.4V17.2H8.6Z', ART_INK) + solid('M14.8 17.2H17.2V26H14.8Z', ART_INK) +
      stroke('M16 4.6V14.4', m.l, 1.2);
  },
  greathelm(m, plume) {
    return solid('M14.4 5.6Q9.6 -1 17 .8Q24.6 2.6 27.4 9.4Q22 5 18 6Z', plume.b) + fill('M14.6 4.6Q11.6 .6 17 1.6Q21 2.6 23.4 5Q19 3.4 15.6 5Z', mixHex(plume.b, '#ffffff', .35)) + artFamilies.helmet(m) +
      fill('M5.8 24H26.2V25.4Q26.2 28.2 23.4 28.2H8.6Q5.8 28.2 5.8 25.4Z', goldTone.b) + stroke('M7 24H25', ART_INK, 1);
  },
  body(m) {
    return solid('M10 4.6L13.2 6.2H18.8L22 4.6L28.6 8.6L27 16.4L24 15.4V27.6H8V15.4L5 16.4L3.4 8.6Z', m.b) +
      fill('M10 6.4L13.4 8.2Q14.6 10.6 15.8 11V26H9.6V14Z', m.h) + fill('M22.2 9.6L24 8.6V26H22.2Z', m.l) +
      solid('M3.4 8.6L10 4.6L11.6 10.6L5.4 14.4Z', m.h) + solid('M28.6 8.6L22 4.6L20.4 10.6L26.6 14.4Z', m.l) +
      fill('M13.2 6.2Q16 10.2 18.8 6.2Z', ART_INK) + stroke('M16 11V27', ART_INK, 1, .55) + stroke('M9.4 20.6H22.6', ART_INK, 1, .55);
  },
  legs(m) {
    return solid('M7.2 3.6H24.8L27 28.4H18.6L16 13.6L13.4 28.4H5Z', m.b) +
      fill('M8.4 8.6H12.6L10.6 26.6H7Z', m.h) + fill('M22.6 8.6H24.4L25.2 26.6H23.4Z', m.l) +
      solid('M7.2 3.6H24.8V8H7.2Z', m.l) + stroke('M10.4 17.6H14M18 17.6H21.6', ART_INK, 1, .55);
  },
  shield(m) {
    return solid('M4.8 5Q16 1.6 27.2 5V14.4Q27.2 23.4 16 29.6Q4.8 23.4 4.8 14.4Z', m.l) +
      fill('M7.4 7Q16 4.6 24.6 7V14.4Q24.6 21.6 16 26.6Q7.4 21.6 7.4 14.4Z', m.b) +
      fill('M7.4 7Q11.6 5.8 16 5.6V26.6Q7.4 21.6 7.4 14.4Z', m.h) +
      stroke('M16 5.6V26.6', m.l, 1.2) + stroke('M7.6 13.6H24.4', m.l, 1.2);
  },
  gauntlet(m) {
    return solid('M8.4 27V15L7.4 10Q7.2 8 8.8 7.8Q10.4 7.8 10.6 9.6L11 13V6.4Q11 4.8 12.6 4.8Q14.2 4.8 14.2 6.4V12.2V5.4Q14.2 3.8 15.8 3.8Q17.4 3.8 17.4 5.4V12.2V6.4Q17.4 4.8 19 4.8Q20.6 4.8 20.6 6.4V14.6L23 11.6Q24.4 10.2 25.6 11.4Q26.6 12.4 25.6 13.8L21.4 20.6V27Z', m.b) +
      fill('M9.4 15.6H14.2V21H9.4Z', m.h) + fill('M11.6 6.4Q11.6 5.4 12.6 5.4V12.6H11.6Z', m.h) + fill('M14.8 5.4Q14.8 4.4 15.8 4.4V12.2H14.8Z', m.h) +
      solid('M7.6 21.6H22.2V28.6H7.6Z', m.l) + fill('M7.6 21.6H11V28.6H7.6Z', m.b) +
      stroke('M11 13.4V15.4M14.2 12.4V15.4M17.4 12.4V15.4', ART_INK, 1, .6);
  },
  ring(band, gem) {
    return solid(ellipse(16, 20.4, 10, 7.4), band.b) +
      fill(ellipse(16, 20.4, 6.2, 3.8), ART_INK) + fill('M6.4 19.6A9.6 7 0 0 1 12 13.6L12.8 16.8A6 3.8 0 0 0 9.9 19.6Z', band.h) +
      fill('M25.4 21.6A10 7.4 0 0 1 16 27.8V24.2A6.2 3.8 0 0 0 22.1 21.6Z', band.l) +
      (gem ? solid('M11.6 10.2L13.8 6.6H18.2L20.4 10.2L16 15.6Z', gem.b) + fill('M13.8 6.6L11.6 10.2H16Z', gem.h) +
        fill('M16 10.2H20.4L16 15.6Z', gem.l) + sparkle(14.2, 8.4, 1.3) : stroke('M10.4 17Q16 14.8 21.6 17', band.h, 1.1));
  },
  amulet(kind, color, cord = goldTone) {
    const pendant = {
      fang: solid('M13.2 16Q12.6 23 17 29.6Q19.4 22.6 18.8 16Z', color.b) + fill('M13.2 16Q12.8 22 16.4 28Q15.2 22 15.4 16Z', color.h),
      tusk: solid('M12.6 16Q11 25 19.6 29.6Q15.4 23.4 19.4 16Z', color.b) + fill('M12.6 16Q11.4 23 17.4 28.2Q13.8 22.8 15.2 16Z', color.h),
      tooth: solid('M11.6 16.4H20.4V24.4L18.6 29L16.6 24.6H15.4L13.4 29L11.6 24.4Z', color.b) + fill('M11.6 16.4H14.6V24.6L13.4 29L11.6 24.4Z', color.h),
      wing: solid('M16 16.4L9 18Q5 21 6 27.6L9.6 24.6L11.6 28.6L13.6 24.8L16 28.4Z', color.b) + solid('M16 16.4L23 18Q27 21 26 27.6L22.4 24.6L20.4 28.6L18.4 24.8L16 28.4Z', color.l) +
        fill('M16 16.4L9 18Q6 20.4 6.4 25L10 22Z', color.h),
      claw: solid('M12 16.6Q19.6 17 21.2 23.4Q21.6 27.4 18.6 29.8Q19.4 24.6 13.4 21.2Z', color.b) + fill('M12 16.6Q17.6 17.4 19.4 21Q16.2 19.6 13.4 21.2Z', color.h),
      orb: solid(circle(16, 23, 5.4), goldTone.b) + fill(circle(16, 23, 3.4), color.b) + fill('M12.6 23A3.4 3.4 0 0 1 16 19.6V21A2 2 0 0 0 14 23Z', color.h) + sparkle(14.6, 21.6, 1.2),
      seal: solid(circle(16, 23, 5.8), color.b) + fill('M10.2 23A5.8 5.8 0 0 1 16 17.2V19.2A3.8 3.8 0 0 0 12.2 23Z', color.h) +
        stroke('M13.4 20.6L18.6 25.4M18.6 20.6L13.4 25.4M16 19.6V26.4', color.l, 1.6),
      scale: solid('M10.6 17.4H21.4V22.4Q21.4 27 16 30Q10.6 27 10.6 22.4Z', color.b) + fill('M10.6 17.4H16V30Q10.6 27 10.6 22.4Z', color.h) +
        stroke('M12.2 21.4Q16 24.4 19.8 21.4', color.l, 1.2),
    }[kind];
    return rope('M8.6 2.4Q8.6 11 16 12.4Q23.4 11 23.4 2.4', cord.b, 1.6) +
      '<g transform="translate(16 12.4) scale(1.32) translate(-16 -16)">' + pendant + '</g>' + solid(circle(16, 12.6, 2), cord.b);
  },
  ore(c, rock = stoneTone) {
    return solid('M3.6 21.6L6.2 11.4L12.2 6L21.4 5.2L27.6 10.2L29 20.4L24 27.2L9 28Z', rock.b) +
      fill('M6.2 11.4L12.2 6L21.4 5.2L17.6 10.4L10.2 13Z', rock.h) + fill('M29 20.4L24 27.2L9 28L14 23.4L25 19.6Z', rock.l) +
      solid('M6.8 15.4L13.4 9.6L19 13.2L17.6 21.8L9.6 23.6Z', c.b) + fill('M6.8 15.4L13.4 9.6L14.8 15.4L9.6 23.6Z', c.h) +
      fill('M19 13.2L17.6 21.8L9.6 23.6L15 17.4Z', c.l) +
      solid('M18.6 6.6L24.6 7.8L25.4 13.6L20.4 15Z', c.b) + fill('M18.6 6.6L24.6 7.8L20.6 10.4Z', c.h) +
      solid('M20 18.6L25.6 17.4L24.6 23.8L19.6 23Z', c.b) + fill('M20 18.6L25.6 17.4L21.4 20.4Z', c.h);
  },
  coal() {
    const lump = (d, hi) => solid(d, '#44464e') + fill(hi, '#8b93a6');
    return lump('M3.6 22L6.4 15L12.6 13.4L16.4 18L14.6 26.6L6.8 27.6Z', 'M6.4 15L12.6 13.4L10.6 17.4L5.4 19.6Z') +
      lump('M11.6 9.6L17.4 4.6L25 6.6L27.4 13.4L22 17.6L14.6 15.6Z', 'M17.4 4.6L25 6.6L19.6 9.4L13 9.6Z') +
      lump('M15.6 21.4L21 17L28.4 19L27.4 26.6L19.6 28.4Z', 'M21 17L28.4 19L22.6 21.4L16.8 21.6Z') +
      sparkle(9.4, 16.6, 1.4, '#c9d2e6') + sparkle(20.6, 7.6, 1.4, '#c9d2e6');
  },
  bar(m) {
    return solid('M3 25L7.2 9H24.8L29 25Z', m.b) +
      fill('M7.2 9H24.8L22.8 13H9.2Z', m.h) + fill('M7.2 9L9.2 13L8.4 20.4L3 25Z', m.h) +
      fill('M24.8 9L29 25L23.6 20.4L22.8 13Z', m.l) + fill('M3 25H29L23.6 20.4H8.4Z', m.l) +
      stroke('M9.2 13H22.8L23.6 20.4H8.4Z', ART_INK, .8, .45);
  },
  gem(c) {
    return solid('M9 6.6H23L28.4 13L16 28.6L3.6 13Z', c.b) +
      fill('M9 6.6L3.6 13H12Z', c.h) + fill('M9 6.6H23L20 13H12Z', mixHex(c.h, c.b, .35)) +
      fill('M16 13H28.4L16 28.6Z', c.l) + fill('M3.6 13H12L16 28.6Z', mixHex(c.b, c.h, .25)) +
      stroke('M3.6 13H28.4M12 13L16 28.6L20 13M9 6.6L12 13M23 6.6L20 13', ART_INK, .8, .4) + sparkle(9.6, 9.4, 2.2);
  },
  gemStep(c) {
    return solid('M9 4.6H23L27.4 9V23L23 27.4H9L4.6 23V9Z', c.b) +
      fill('M9 4.6H23L20.6 9.6H11.4Z', c.h) + fill('M4.6 9L9 4.6L11.4 9.6V22.4L9 27.4L4.6 23Z', c.h) +
      fill('M27.4 9V23L23 27.4L20.6 22.4V9.6L23 4.6Z', c.l) + fill('M9 27.4H23L20.6 22.4H11.4Z', c.l) +
      stroke('M11.4 9.6H20.6V22.4H11.4Z', ART_INK, .8, .4) + sparkle(13.6, 12.6, 2.2);
  },
  gemRound(c) {
    return solid(circle(16, 16, 12), c.b) + fill('M4 16A12 12 0 0 1 16 4L16 9.4L10.4 10.4Z', c.h) +
      fill('M28 16A12 12 0 0 1 16 28V22.6L21.6 21.6Z', c.l) +
      fill('M16 9.4L21.6 10.4L22.6 16L21.6 21.6L16 22.6L10.4 21.6L9.4 16L10.4 10.4Z', mixHex(c.b, c.h, .3)) +
      stroke('M16 9.4L21.6 10.4L22.6 16L21.6 21.6L16 22.6L10.4 21.6L9.4 16L10.4 10.4Z', ART_INK, .8, .4) + sparkle(12.4, 12.6, 2.2);
  },
  cabochon(c) {
    return solid(ellipse(16, 17, 12, 10), c.b) + fill('M4.4 16Q5 8.4 14 7.2Q8.4 10 7.6 17Z', c.h) +
      fill('M28 17A12 10 0 0 1 16 27Q24 24 25.6 15.6Z', c.l) + fill(ellipse(11.6, 11.8, 2.6, 1.6), '#ffffffcc');
  },
  crystal(c) {
    return solid('M10.4 9.6L16 2.6L21.6 9.6V24L16 29.6L10.4 24Z', c.b) + fill('M10.4 9.6L16 2.6V29.6L10.4 24Z', c.h) +
      fill('M18.6 6.2L21.6 9.6V24L18.6 27Z', c.l) + stroke('M16 2.6V29.6', ART_INK, .8, .4) + sparkle(13.2, 9.4, 1.8);
  },
  shard(c) {
    return solid('M7.4 28.6L5 18.4L12.4 3.4L19 9.4L27 6.2L24 19.4L17 28.6Z', c.b) + fill('M5 18.4L12.4 3.4L14.6 15.6L7.4 28.6Z', c.h) +
      fill('M19 9.4L27 6.2L24 19.4L17 28.6L16.4 17Z', c.l) + sparkle(11.4, 9.6, 1.8);
  },
  geode() {
    return solid('M3.4 20.4L6 9.6L14 4.4L23.4 5.4L28.6 12.6L27.6 22.4L20.4 28.4H9.6Z', stoneTone.b) +
      fill('M6 9.6L14 4.4L23.4 5.4L14.6 7.4Z', stoneTone.h) +
      solid(ellipse(16.6, 16.8, 8, 7.4), '#4a2a6e') +
      fill('M9.6 16.4L12.6 11L14.6 16.6L12.2 21.4Z', '#c9a2ff') + fill('M14.6 16.6L17.6 10L20.6 15.8L17.6 21.8Z', '#a679f0') +
      fill('M20.6 15.8L23.4 13.4L24 19.4L20.8 21.4Z', '#7e52cc') + sparkle(13.2, 13.4, 1.6);
  },
  rune(glyph, c) {
    const glyphs = {
      air: 'M9.6 12.4H18.6A2.6 2.6 0 1 0 16 9.8M9.6 16.4H22.4M9.6 20.4H17.4A2.6 2.6 0 1 1 14.8 23',
      water: 'M16 8.4Q22 15.2 22 18.8A6 6 0 0 1 10 18.8Q10 15.2 16 8.4Z',
      earth: 'M8.4 22.4L13.6 12.4L17 17.8L19.4 14.4L23.6 22.4Z',
      fire: 'M16.4 7.6Q17 12 21 15.4Q23.4 18 22 21.4Q20.2 24.6 16 24.6Q11.8 24.6 10.2 21.4Q9 18 11.6 15.6Q12.6 18.4 14.4 18.8Q13.8 13 16.4 7.6Z',
      chaos: 'M17.4 7.4L10.6 17.6H15.4L13.6 25.4L21.4 14.4H16.6Z',
      moon: 'M19.4 8.6A8 8 0 1 0 19.4 23.4A6.4 6.4 0 1 1 19.4 8.6Z',
      astral: 'M16 7.2Q17.2 14.8 24.8 16Q17.2 17.2 16 24.8Q14.8 17.2 7.2 16Q14.8 14.8 16 7.2Z',
      blood: 'M16 7.6Q20.8 13.4 20.8 16.4A4.8 4.8 0 0 1 11.2 16.4Q11.2 13.4 16 7.6Z M11 20.6Q13.2 23.6 13.2 25A2.2 2.2 0 0 1 8.8 25Q8.8 23.6 11 20.6Z M21 20.6Q23.2 23.6 23.2 25A2.2 2.2 0 0 1 18.8 25Q18.8 23.6 21 20.6Z',
    };
    const stone = solid('M8 3.6H24Q28.4 3.6 28.4 8V24Q28.4 28.4 24 28.4H8Q3.6 28.4 3.6 24V8Q3.6 3.6 8 3.6Z', runeStone.b) +
      fill('M8 3.6H24Q28.4 3.6 28.4 8L26 6Q16 5.4 6 6Q4.6 14 6 26L3.6 24V8Q3.6 3.6 8 3.6Z', runeStone.h) +
      fill('M28.4 8V24Q28.4 28.4 24 28.4H8L6 26Q16 26.6 26 26Q26.6 16 26 6Z', runeStone.l);
    const d = glyphs[glyph];
    const lined = glyph === 'air';
    return stone + (lined ? stroke(d, ART_INK, 4.6) + stroke(d, c.b, 2) : solid(d, c.b));
  },
  essence() {
    const c = { h: '#ffffff', b: '#dcd8f0', l: '#8e88b4' };
    return solid('M9 4.6L22.4 3.6L28.4 11.4L26.6 24.4L17 28.6L6 25.4L3.6 13Z', c.b) +
      fill('M9 4.6L22.4 3.6L17.6 9.6L8.6 12.4L3.6 13Z', c.h) + fill('M28.4 11.4L26.6 24.4L17 28.6L19.4 17.4Z', c.l) +
      stroke('M8.6 12.4L17.6 9.6L19.4 17.4L17 28.6M8.6 12.4L6 25.4M8.6 12.4L19.4 17.4', ART_INK, .8, .35) + sparkle(12.6, 9.4, 2.2, '#ffffff');
  },
  log(w) {
    return turn(
      solid('M8 9.4H25.2A3.6 6.6 0 0 1 25.2 22.6H8Z', w.bark) + fill('M8 9.4H25.2A3.6 6.6 0 0 1 28 12H8Z', mixHex(w.bark, '#ffffff', .25)) +
      fill('M8 19.6H28.4A3.6 6.6 0 0 1 25.2 22.6H8Z', mixHex(w.bark, '#000000', .35)) +
      stroke('M12 14.4H19M15 17.6H24', mixHex(w.bark, '#000000', .45), 1) +
      solid(ellipse(8, 16, 4, 6.6), w.b) + fill('M4 16A4 6.6 0 0 1 8 9.4V11.6A2 4 0 0 0 6 16Z', w.h) +
      stroke(ellipse(8, 16, 2, 3.6), w.l, 1) + fill(ellipse(8, 16, .7, 1.2), w.l), -32);
  },
  bone(c, size = 1) {
    const knobs = [[12.6, 5], [19.4, 5], [12.6, 27], [19.4, 27]];
    const body = union([['M13.8 5H18.2V27H13.8Z', c.b], ...knobs.map(([x, y]) => [circle(x, y, 3.4), c.b])]) +
      fill('M13.8 6H15.6V26H13.8Z', c.h) + fill(circle(11.8, 4.2, 1.4), c.h) + fill(circle(11.8, 26.2, 1.4), c.h) +
      fill('M17 8H18.2V24H17Z', c.l);
    return turn(size === 1 ? body : '<g transform="translate(16 16) scale(' + size + ') translate(-16 -16)">' + body + '</g>');
  },
  feather(c = { h: '#ffffff', b: '#e9e2d2', l: '#a69c86' }) {
    return turn(
      solid('M16 .6Q22.4 8 20.8 21.4L16 26.4Q10.6 20 11.2 8.4Q12 3 16 .6Z', c.b) + fill('M16 .6Q12 3 11.2 8.4Q10.6 20 16 26.4Z', c.h) +
      fill('M18.4 8Q21 14 20.6 20.8L18.6 22.8Z', c.l) +
      rope('M16 4V32.4', '#b08a58', 1) + stroke('M11.4 13.4L13.6 14.6M20.8 16L18.6 17', ART_INK, .9, .55), 40);
  },
  potion(liquid) {
    return solid('M13 5.6H19V11.6Q25.6 13.6 25.6 20.4A9.6 9.6 0 0 1 6.4 20.4Q6.4 13.6 13 11.6Z', '#3a4448') +
      fill('M7.2 18.6H24.8A8.8 8.8 0 0 1 7.2 18.6Z', liquid.b) + fill('M7.2 18.6H12Q12 25 16 28.8A8.8 8.8 0 0 1 7.2 18.6Z', liquid.h) +
      fill('M24.8 18.6A8.8 8.8 0 0 1 18 28.6Q21.6 24.6 21.4 18.6Z', liquid.l) +
      stroke('M9.6 16.2Q10.6 13.8 13 13', '#ffffffb0', 1.4) +
      solid('M12 2H20V6.4H12Z', '#a8743c') + fill('M12 2H14.6V6.4H12Z', '#d8a464');
  },
  herb(c) {
    const leaf = (d, hi) => solid(d, c.b) + fill(hi, c.h);
    return rope('M9 29Q13 20 21 6', '#5d6b2a', 1.2) +
      leaf('M13.4 19.6Q5 19 4.6 12Q12.6 12.4 13.4 19.6Z', 'M13.4 19.6Q8 16.4 4.6 12Q9.4 13.4 13.4 19.6Z') +
      leaf('M16.6 13.2Q24.6 14.4 27.4 8.4Q19.4 6.6 16.6 13.2Z', 'M16.6 13.2Q20.4 9 27.4 8.4Q20.6 7.4 16.6 13.2Z') +
      leaf('M19.4 8.6Q14.8 2.6 18.4 -.2Q22.8 3.6 19.4 8.6Z', 'M19.4 8.6Q16.6 4.4 18.4 -.2Q18.4 4.6 19.4 8.6Z') +
      leaf('M11.6 23.4Q18.6 26.4 22.6 21.6Q15.6 18.4 11.6 23.4Z', 'M11.6 23.4Q16.6 20.4 22.6 21.6Q16 19.2 11.6 23.4Z');
  },
  hide(c) {
    return solid('M9.4 4.6Q16 7 22.6 4.6L24.4 9.6L28.6 10.6L26 15.4Q27.4 20 26 24.6L28 28.4L22.4 27.4Q16 29.6 9.6 27.4L4 28.4L6 24.6Q4.6 20 6 15.4L3.4 10.6L7.6 9.6Z', c.b) +
      fill('M9.4 4.6Q12 6 16 6.4V27.8Q12.4 28 9.6 27.4L6 24.6Q4.6 20 6 15.4L3.4 10.6L7.6 9.6Z', c.h) +
      stroke('M9.6 9.8Q16 11.4 22.4 9.8M9 24.2Q16 25.8 23 24.2', c.l, 1.1, .8);
  },
  stew(soup) {
    return stroke('M12 7.6Q10.4 5.4 12 3.2M17.4 7.6Q15.8 5.4 17.4 3.2', '#ffffffa8', 1.6) +
      solid('M3.6 15.4H28.4Q28.4 26.6 16 28.4Q3.6 26.6 3.6 15.4Z', '#8a5630') + fill('M3.6 15.4H11Q12 25 16 28.4Q3.6 26.6 3.6 15.4Z', '#b07a48') +
      fill('M28.4 15.4Q28.4 26.6 16 28.4Q24.6 24.4 24.6 15.4Z', '#4e2e16') +
      solid(ellipse(16, 15.4, 12.4, 4.2), '#6a3e1e') + fill(ellipse(16, 15.6, 10.4, 3), soup.b) +
      fill(ellipse(13, 14.6, 3.4, 1.2), soup.h) + fill(circle(19.4, 15.8, 1.6), soup.l) + fill(circle(11, 16.4, 1.1), '#e6d27a');
  },
  // Pescados de perfil con la cabeza a la izquierda. `cooked` cambia ojos por marcas de parrilla.
  fish(c, cooked, kind = 'fish') {
    const shapes = {
      fish: ['M2.6 16Q9.2 8.6 18.4 9.8Q23 10.6 25 14L29.6 9.4Q28.6 16 29.6 22.6L25 18Q23 21.4 18.4 22.2Q9.2 23.4 2.6 16Z', 'M2.6 16Q9.2 8.6 18.4 9.8Q23 10.6 25 14Q15 12.4 2.6 16Z'],
      slim: ['M2.6 16Q10 10.6 20 12Q23.4 12.8 25 14.6L29.6 11Q28.8 16 29.6 21L25 17.4Q23.4 19.2 20 20Q10 21.4 2.6 16Z', 'M2.6 16Q10 10.6 20 12Q23.4 12.8 25 14.6Q15 13.6 2.6 16Z'],
      fat: ['M2.4 16.4Q7.6 7 17.4 7.6Q23 8.4 25.2 13.6L30 8.6Q28.4 16 30 23.4L25.2 18.6Q23 24.4 17.4 24.8Q7.6 25.6 2.4 16.4Z', 'M2.4 16.4Q7.6 7 17.4 7.6Q23 8.4 25.2 13.6Q14 11 2.4 16.4Z'],
      sword: ['M-.2 14.6L8.6 14.2Q12 10.4 19.4 10.6Q23.4 11 25 14L29.6 9.4Q28.6 16 29.6 22.6L25 18Q23 21.4 18.6 21.6Q11 22 8.4 17.4L-.2 14.6Z', 'M-.2 14.6L8.6 14.2Q12 10.4 19.4 10.6Q23.4 11 25 14Q16 12.6 8.6 14.6Z'],
      shark: ['M2 17.4Q6 11.4 13 11L17.4 4.4L19.4 11.2Q23.6 12 25.6 14.6L30 7.8Q29.4 16 30 23.4L25.4 18.4Q22.4 22 15 22Q6.6 22.4 2 17.4Z', 'M2 17.4Q6 11.4 13 11L17.4 4.4L19.4 11.2Q23.6 12 25.6 14.6Q14 13 2 17.4Z'],
    };
    const [body, back] = shapes[kind];
    const marks = cooked ? stroke('M10 12.6L8 19.6M14.4 11.4L12.4 20.6M18.8 11.6L17 20.4', '#3a1c0c', 1.6, .85) :
      fill(circle(7.4, 15, 1.6), '#fff') + fill(circle(7.2, 15, .9), ART_INK) + stroke('M10.6 12.4Q12 15.6 10.6 19', c.l, 1, .8);
    const spots = kind === 'fish' && c.spots ? fill(circle(15, 13.4, .9) + circle(18.6, 14.6, .9) + circle(21.2, 13.4, .8) + circle(16.6, 17.4, .8), c.spots) : '';
    return solid(body, c.b) + fill(back, c.l) + fill('M5 17.4Q14 21.4 22.6 18.4Q14 21.2 5 17.4Z', c.h) + spots + marks;
  },
  shrimp(c, cooked) {
    return solid('M9.4 22.4L3.4 25.6L5 29.4L11.4 27.4Z', c.l) + solid('M9.4 22.4L5.4 19.4L2.6 22.6L8 26.4Z', c.b) +
      solid('M8.6 23.4Q14.6 27.4 21.4 24Q28.6 19.6 27.4 11.6Q26.4 6 21 5.4L19.6 10Q23 11 22.6 14.6Q22 19.4 16.4 20.6Q12.4 21.2 10.6 19.6Z', c.b) +
      fill('M21 5.4Q26.4 6 27.4 11.6Q27.8 15 26.4 18Q25.4 11.4 20.4 9.4Z', c.h) +
      stroke('M22.8 15.6L26.4 16.6M21.2 19.4L24 21.4M17.6 21L19.2 24.4M13.6 21.2L14.2 24.8', c.l, 1.2) +
      stroke('M21.6 7Q16.6 1.6 9.6 3.4M20.6 8.4Q14 5.4 8.6 8.4', cooked ? '#8a3014' : '#6e6e66', 1) +
      (cooked ? '' : fill(circle(22.6, 7.8, 1.3), ART_INK));
  },
  lobster(c, cooked) {
    const claw = (sx) => '<g transform="translate(16 0) scale(' + sx + ' 1) translate(-16 0)">' +
      rope('M13 14.4Q9.4 13 8.6 10', c.b, 2) +
      solid('M8.4 11Q3.4 10.6 3 5.4Q3 1.6 6.4 1.2L7.4 5.6L9.6 2.2Q12.6 4.2 11.6 8.2Q10.8 10.6 8.4 11Z', c.b) +
      fill('M8.4 11Q3.4 10.6 3 5.4Q3 1.6 6.4 1.2L6.6 6.4Q6.8 9.6 8.4 11Z', sx > 0 ? c.h : c.l) + '</g>';
    return claw(1) + claw(-1) +
      solid('M12 11.6Q16 8.6 20 11.6L20.6 21Q19 24.6 17.4 25.2L20.4 29.6H11.6L14.6 25.2Q13 24.6 11.4 21Z', c.b) +
      fill('M12 11.6Q14 10.2 16 10.2V25.2H14.6Q13 24.6 11.4 21Z', c.h) +
      stroke('M12 15.4H20M11.8 18.6H20.2M12.4 21.8H19.6', c.l, 1.1) +
      (cooked ? '' : fill(circle(14.4, 12.6, .9) + circle(17.6, 12.6, .9), ART_INK));
  },
  cup(c) {
    return rope('M8 8.6H4.6Q4.4 15.4 10 16.6M24 8.6H27.4Q27.6 15.4 22 16.6', c.b, 2) +
      solid('M7.6 4H24.4V11.6Q24.4 19 16 19.6Q7.6 19 7.6 11.6Z', c.b) + fill('M7.6 4H12.4V12Q12.4 17 15 19.4Q7.6 18.4 7.6 11.6Z', c.h) +
      fill('M21.4 4H24.4V11.6Q24.4 17.6 19.6 19Q21.4 16 21.4 11.6Z', c.l) +
      solid('M14.2 19.4H17.8V23.4H14.2Z', c.l) + solid('M9.6 23.4H22.4V28.4H9.6Z', c.b) + fill('M9.6 23.4H22.4V25H9.6Z', c.h);
  },
  star(c) {
    return solid('M16 2.6L19.6 11.6L29.2 12.2L21.8 18.4L24.2 27.8L16 22.6L7.8 27.8L10.2 18.4L2.8 12.2L12.4 11.6Z', c.b) +
      fill('M16 2.6L12.4 11.6L2.8 12.2L10.2 18.4L16 16Z', c.h) + fill('M16 16L21.8 18.4L24.2 27.8L16 22.6Z', c.l);
  },
  skull(c) {
    return solid('M5 14.4Q5 3.6 16 3.6Q27 3.6 27 14.4Q27 19.4 23.4 21.4V27.4H8.6V21.4Q5 19.4 5 14.4Z', c.b) +
      fill('M5 14.4Q5 3.6 16 3.6Q9 6 8.4 15Q8.2 19 10.4 21.4H8.6Q5 19.4 5 14.4Z', c.h) + fill('M23.4 21.4V27.4H20.6V21Q24.4 18.6 24.6 12Q27 14 27 14.4Q27 19.4 23.4 21.4Z', c.l) +
      fill(circle(11.4, 14.4, 3) + circle(20.6, 14.4, 3), ART_INK) + fill('M16 17.6L18 21.4H14Z', ART_INK) +
      stroke('M12.6 23.4V27.4M16 23.4V27.4M19.4 23.4V27.4', ART_INK, 1.4);
  },
  flame() {
    return solid('M16.6 2.4Q17.6 8.4 23 12.6Q27.2 16.4 26 21.4Q24.2 28.6 16 28.6Q7.8 28.6 6 21.4Q5 16.4 9 12.6Q10.6 17 13 17.6Q12 9.6 16.6 2.4Z', '#ee7a30') +
      fill('M16 14.4Q17 18.6 20.4 20.8Q22 23.4 20.4 25.6Q18.8 27.4 16 27.4Q13.2 27.4 11.6 25.6Q10.4 23 12.6 20.4Q14.6 18.4 16 14.4Z', '#ffd36e') +
      fill('M9 12.6Q10.6 17 13 17.6Q8.6 18.4 7.6 22.6Q6 17 9 12.6Z', '#ffad5a');
  },
  tree(c) {
    return solid('M14 21H18V29H14Z', woodTone.b) + solid('M16 2.4L26 13.4H22L27.4 21.6H4.6L10 13.4H6Z', c.b) +
      fill('M16 2.4L6 13.4H10L4.6 21.6H12L16 13.4Z', c.h) + fill('M16 2.4L26 13.4H22L27.4 21.6H21.6Q22.4 14 16 2.4Z', c.l);
  },
  swords(c = metalTones[2]) {
    const blade = flip => '<g transform="translate(16 0) scale(' + flip + ' 1) translate(-16 0)">' + turn(
      solid('M16 -.4L18.6 3.4V19.6H13.4V3.4Z', c.b) + fill('M16 .6L14.6 3.6V19.6H16Z', c.h) +
      solid('M9.6 19.6H22.4V22.4H9.6Z', goldTone.b) + solid('M14.8 22.4H17.2V28.4H14.8Z', leatherTone.b) + solid(circle(16, 29.6, 1.9), goldTone.b), 45) + '</g>';
    return blade(1) + blade(-1);
  },
  purse() {
    return solid('M11.2 9.6L8.4 3.6H23.6L20.8 9.6Q28 13.4 28 21Q28 28.4 16 28.4Q4 28.4 4 21Q4 13.4 11.2 9.6Z', leatherTone.b) +
      fill('M11.2 9.6Q4 13.4 4 21Q4 26.4 9.6 27.8Q7 19 12.6 10.4Z', leatherTone.h) + rope('M11.2 9.6H20.8', leatherTone.l, 1.4) +
      solid(circle(16, 19.6, 4), goldTone.b) + fill('M12 19.6A4 4 0 0 1 16 15.6V17.4A2.2 2.2 0 0 0 13.8 19.6Z', goldTone.h);
  },
  anchor(c) {
    const d = 'M16 9V27.4M6 17.6Q6.4 27 16 27.4Q25.6 27 26 17.6M10.6 13.4H21.4';
    return stroke(d, ART_INK, 6.6) + stroke(d, c.b, 3.4) + stroke('M15.2 10V26', c.h, 1) +
      solid('M3.6 19.4L6 15.4L8.4 19.4Z', c.b) + solid('M23.6 19.4L26 15.4L28.4 19.4Z', c.b) + solid(circle(16, 6, 3), c.b) + fill(circle(16, 6, 1.2), ART_INK);
  },
  pot() {
    const c = { h: '#9aa6aa', b: '#5c666a', l: '#2e3436' };
    return stroke('M11.4 8.6Q9.8 6.4 11.4 4.2M17.4 8.6Q15.8 6.4 17.4 4.2', '#ffffffa8', 1.6) +
      solid('M4.6 13.4H27.4V19.4Q27.4 28.4 16 28.4Q4.6 28.4 4.6 19.4Z', c.b) + fill('M4.6 13.4H10V20Q10.6 26.4 15 28.4Q4.6 27.6 4.6 19.4Z', c.h) +
      fill('M27.4 13.4V19.4Q27.4 27 20.4 28.2Q24.4 25 24.4 18.4V13.4Z', c.l) + solid('M2.6 10.6H29.4V14H2.6Z', c.h) +
      rope('M2.6 12.2H.6M29.4 12.2H31.4', c.l, 1.6);
  },
  rod() {
    return rope('M4.4 28.6L25.6 3.4', woodTone.b, 2) + stroke('M25.6 3.4Q28.6 9 27.4 19', '#eadfc4', 1) +
      solid('M25.6 19.4Q27.4 17.6 29.2 19.4L27.4 23.4Z', '#d8402e') + solid('M6 22.6H11V27.6H6Z', leatherTone.b);
  },
  lock() {
    const c = { h: '#fff1a6', b: '#c9a03a', l: '#7a5a14' };
    return rope('M10.4 14V10.6A5.6 5.6 0 0 1 21.6 10.6V14', '#a9a493', 2.6) +
      solid('M6 14H26V28H6Z', c.b) + fill('M6 14H26V16.4H6Z', c.h) + fill('M23.4 16.4H26V28H23.4Z', c.l) +
      fill(circle(16, 20, 2.2), ART_INK) + fill('M15 21H17V24.6H15Z', ART_INK);
  },
  pack(c) {
    return rope('M11 9V7.4A5 5 0 0 1 21 7.4V9', c.l, 1.8) +
      solid('M8.4 9H23.6Q27 9 27 12.4V25Q27 28.4 23.6 28.4H8.4Q5 28.4 5 25V12.4Q5 9 8.4 9Z', c.b) + fill('M8.4 9H12V28.4H8.4Q5 28.4 5 25V12.4Q5 9 8.4 9Z', c.h) +
      solid('M5 13.4H27V17.6H5Z', c.l) + solid('M13.4 15.4H18.6V20.6H13.4Z', goldTone.b);
  },
  map() {
    return solid('M3.6 7.4L11 4.6L21 7.4L28.4 4.6V24.6L21 27.4L11 24.6L3.6 27.4Z', '#dcc893') + fill('M11 4.6L21 7.4V27.4L11 24.6Z', '#c2ab72') +
      stroke('M11 4.6V24.6M21 7.4V27.4', ART_INK, 1, .6) + stroke('M6.4 20Q10 14 14.4 17Q18.6 20 24.4 11.6', '#a8432f', 1.4) + stroke('M23 9.6L25.6 12.6M25.6 9.6L23 12.6', '#a8432f', 1.4);
  },
  flag(c) {
    return rope('M7 3V29.4', woodTone.b, 1.8) + solid('M8.6 4.4H26.4L22.4 10.4L26.4 16.4H8.6Z', c.b) + fill('M8.6 4.4H26.4L25 6.4H8.6Z', c.h);
  },
  book() {
    return solid('M6 4.4H24.4Q26.6 4.4 26.6 6.6V28H8.4Q6 28 6 25.6Z', '#8a3e2a') + fill('M6 4.4H10.4V28H8.4Q6 28 6 25.6Z', '#b0583a') +
      solid('M10.4 24H26.6V28H10.4Z', '#efe6cf') + stroke('M14 10.6H22.6M14 14.6H22.6', '#e3b74a', 1.6);
  },
  clock() {
    return solid(circle(16, 16, 12.4), '#efe6cf') + fill('M3.6 16A12.4 12.4 0 0 1 16 3.6V6.4A9.6 9.6 0 0 0 6.4 16Z', '#ffffff') +
      fill('M28.4 16A12.4 12.4 0 0 1 16 28.4V25.6A9.6 9.6 0 0 0 25.6 16Z', '#b8ad92') + stroke('M16 8.6V16L21 19.4', ART_INK, 2.2);
  },
  bolt() {
    return solid('M18.6 2.4L6.6 18H15L12.6 29.6L25.4 13.4H17Z', '#f4d86a') + fill('M18.6 2.4L6.6 18H10.6L17 9Z', '#fff4b4');
  },
  target() {
    return solid(circle(16, 16, 12.4), '#efe6cf') + fill(circle(16, 16, 8.4), '#d9463b') + fill(circle(16, 16, 4.4), '#efe6cf') + fill(circle(16, 16, 1.8), '#d9463b');
  },
  chest(c = { h: '#c69060', b: '#94643a', l: '#56361c' }) {
    return solid('M4 13.4Q4 6.4 11 6.4H21Q28 6.4 28 13.4V27.4H4Z', c.b) + fill('M4 13.4Q4 6.4 11 6.4H21Q28 6.4 28 13.4Z', c.h) +
      solid('M4 13.4H28V16H4Z', c.l) + fill('M24.6 16H28V27.4H24.6Z', c.l) + solid('M13.4 12.4H18.6V19.4H13.4Z', goldTone.b) + fill(circle(16, 15.6, 1), ART_INK);
  },
  anvil(c) {
    return solid('M2.6 10.6H25.4V12.6Q25.4 17.6 20.4 18.4V22H24.6V27.4H7.4V22H11.6V18.4Q11.4 15.6 8.6 14.4Q4.6 13.4 2.6 10.6Z', c.b) +
      fill('M2.6 10.6H25.4V12.6H4.4Z', c.h) + fill('M7.4 22H11.6V27.4H7.4Z', c.h) + fill('M20.4 18.4V27.4H24.6V25H22.4V18Z', c.l) +
      solid('M25.4 10.6H29.6V13.6H25.4Z', c.l);
  },
  fist(c) {
    return solid('M9 27.4V22.6Q6.4 20.6 6.4 16.6V10.6Q6.4 7.6 9.4 7.6Q10.6 6 12.6 6.4Q14 5 16 5.6Q17.6 4.6 19.6 5.6Q21.6 5.2 22.6 7Q25.6 7.6 25.6 11V18.4Q25.6 22.6 22.6 24.4V27.4Z', c.b) +
      fill('M9 27.4V22.6Q6.4 20.6 6.4 16.6V10.6Q6.4 7.6 9.4 7.6V22.4L12 27.4Z', c.h) + fill('M22.6 7Q25.6 7.6 25.6 11V18.4Q25.6 22.6 22.6 24.4Z', c.l) +
      stroke('M12.6 6.6V12.4M16.2 5.8V12.4M19.6 5.8V12.4', ART_INK, 1.2, .7) +
      solid('M9.4 13.4H18.4Q20.6 13.4 20.6 15.6Q20.6 17.6 18.4 17.6H11.6Q9.4 17.6 9.4 15.4Z', c.b) + fill('M9.4 13.4H18.4Q20.4 13.4 20.6 15H9.4Z', c.h) +
      solid('M7.6 24H24.4V29H7.6Z', c.l);
  },
  // Glifos de interfaz.
  coin() {
    return solid(circle(16, 16, 12.4), goldTone.b) + fill('M3.6 16A12.4 12.4 0 0 1 16 3.6V6.4A9.6 9.6 0 0 0 6.4 16Z', goldTone.h) +
      fill('M28.4 16A12.4 12.4 0 0 1 16 28.4V25.6A9.6 9.6 0 0 0 25.6 16Z', goldTone.l) +
      stroke(circle(16, 16, 8), goldTone.l, 1.4) + stroke('M16 11V21M13 13.6Q16 11.4 19 13.6M13 18.4Q16 20.6 19 18.4', goldTone.l, 1.6);
  },
  heart(c) {
    return solid('M16 28Q3.6 20 3.6 11.6A6.4 6.4 0 0 1 16 8.6A6.4 6.4 0 0 1 28.4 11.6Q28.4 20 16 28Z', c.b) +
      fill('M16 28Q3.6 20 3.6 11.6A6.4 6.4 0 0 1 9.8 5.4Q6.4 8 6.4 12Q6.8 20 16 28Z', c.h) +
      fill('M28.4 11.6Q28.4 20 16 28Q25 19 25.4 12.4Q25.4 9 23 6.6A6.4 6.4 0 0 1 28.4 11.6Z', c.l) + sparkle(9.4, 10.6, 1.8);
  },
  crown(c, jewel) {
    return solid('M4 25.4L3.6 9.6L10 15.4L16 5.4L22 15.4L28.4 9.6L28 25.4Z', c.b) + fill('M3.6 9.6L10 15.4L16 5.4V22H4Z', c.h) +
      solid('M4 22H28V27.6H4Z', c.l) + solid(circle(16, 17, 2.4), jewel.b) + fill(circle(9.6, 24.8, 1.2) + circle(22.4, 24.8, 1.2), jewel.b);
  },
  medal(c) {
    return solid('M9.6 2.6H15L17.6 13H12.2Z', '#b8332a') + solid('M22.4 2.6H17L14.4 13H19.8Z', '#2e5aa8') +
      solid(circle(16, 20, 8.6), c.b) + fill('M7.4 20A8.6 8.6 0 0 1 16 11.4V13.4A6.6 6.6 0 0 0 9.4 20Z', c.h) +
      solid('M16 14.6L17.6 18.2L21.4 18.4L18.4 20.8L19.4 24.6L16 22.4L12.6 24.6L13.6 20.8L10.6 18.4L14.4 18.2Z', c.h);
  },
  veil() {
    const c = { h: '#f2ecff', b: '#b9a8e0', l: '#6c5a9a' };
    return solid('M16 2.6Q7 4 6 14Q4.6 22 2.6 28.6Q9 25.4 11.4 28.4Q14 25.6 16 28.6Q18 25.6 20.6 28.4Q23 25.4 29.4 28.6Q27.4 22 26 14Q25 4 16 2.6Z', c.b) +
      fill('M16 2.6Q7 4 6 14Q4.6 22 2.6 28.6Q9 25.4 11.4 28.4Q10 18 16 2.6Z', c.h) + fill('M26 14Q27.4 22 29.4 28.6Q23 25.4 20.6 28.4Q24 18 21.4 6Q25.2 8.6 26 14Z', c.l) +
      stroke('M16 6V20M11 11.4Q16 13.4 21 11.4M9 17.6Q16 20.6 23 17.6M16 13Q13 9.6 10 9.6M16 13Q19 9.6 22 9.6', '#ffffff', .8, .55);
  },
  crate() {
    return solid('M4.4 8.6H27.6V27.4H4.4Z', '#a8743c') + fill('M4.4 8.6H27.6V11.4H4.4Z', '#d8a464') + fill('M24.6 11.4H27.6V27.4H24.6Z', '#6e4520') +
      stroke('M4.4 15H27.6M4.4 21.2H27.6', ART_INK, 1, .6) + stroke('M7.6 11.6L24.4 26.2', '#6e4520', 2.2);
  },
  sack(c) {
    return solid('M11.6 9Q9.4 5.4 11.4 3.4H20.6Q22.6 5.4 20.4 9Q27.4 13 27.4 20.4Q27.4 28.4 16 28.4Q4.6 28.4 4.6 20.4Q4.6 13 11.6 9Z', c.b) +
      fill('M11.6 9Q4.6 13 4.6 20.4Q4.6 26 10 27.6Q7.6 20 12.6 10Z', c.h) + fill('M20.4 9Q27.4 13 27.4 20.4Q27.4 26.6 21.6 27.8Q24.6 19 20.4 9Z', c.l) +
      rope('M11.6 9H20.4', '#7a4e26', 1.2);
  },
  pearl(c) {
    return solid(circle(16, 17, 10.4), c.b) + fill('M5.6 17A10.4 10.4 0 0 1 16 6.6Q9 9.4 8.6 18Z', c.h) +
      fill('M26.4 17A10.4 10.4 0 0 1 16 27.4Q24 24 24.4 15Z', c.l) + fill(ellipse(12.6, 12.4, 2.6, 1.8), '#ffffffd0');
  },
  blob(c) {
    return solid('M8 10.4Q11.4 4 18.4 5.4Q27 7 27.4 15.6Q27.6 25.6 18 27.6Q6.4 29 4.6 20Q3.8 14.4 8 10.4Z', c.b) +
      fill('M8 10.4Q11.4 4 18.4 5.4Q10 8.6 8.2 19.6Q4.6 16 8 10.4Z', c.h) + fill('M27.4 15.6Q27.6 25.6 18 27.6Q25 22.6 24.6 13.4Z', c.l) + sparkle(12.6, 10.6, 1.8);
  },
};

// ─── Qué dibujo lleva cada objeto ──────────────────────────────────────────
// Se arma una sola vez a partir de las listas de content.js, así un objeto nuevo de un tramo existente ya sale bien.
const itemArtTable = new Map();
function buildItemArt() {
  const set = (name, family, ...args) => itemArtTable.set(name, [family, args]);
  const fishKinds = ['shrimp', 'slim', 'fish', 'fish', 'fat', 'lobster', 'sword', 'shark'];
  const rawTones = [
    { h: '#f1ece2', b: '#b9b8ae', l: '#6d6c64' }, // camarón crudo: gris translúcido
    { h: '#f2f8fb', b: '#9fb4c4', l: '#3e5a70' }, // sardina
    { h: '#f2d4c4', b: '#8ea472', l: '#4c5e3a', spots: '#3a3022' }, // trucha
    { h: '#ffd0bc', b: '#e88a6c', l: '#6a6e82' }, // salmón
    { h: '#d8e2ea', b: '#5778a6', l: '#233a5c' }, // atún
    { h: '#6e8eb0', b: '#2f4f74', l: '#16263a' }, // langosta cruda: azul oscuro
    { h: '#dfe8f0', b: '#7c97b8', l: '#2e4058' }, // pez espada
    { h: '#eef1f2', b: '#8f9aa4', l: '#48525c' }, // tiburón
  ];
  const cookedTones = [
    { h: '#ffc49e', b: '#f0794a', l: '#9a3a1c' }, // camarón cocido: naranja rosado
    { h: '#f6cf8a', b: '#c98a40', l: '#6e4218' },
    { h: '#f6cf8a', b: '#c48a4a', l: '#6e4220' },
    { h: '#ffc49a', b: '#d87a4a', l: '#7a3418' },
    { h: '#e8bc8a', b: '#a8703e', l: '#5a3416' },
    { h: '#ff9a7a', b: '#d8341e', l: '#7a140a' }, // langosta cocida: roja
    { h: '#efc890', b: '#b88448', l: '#664018' },
    { h: '#e2c294', b: '#a07848', l: '#56381a' },
  ];
  const stewTones = [
    { h: '#ffc49e', b: '#e07a4a', l: '#8a3a1c' }, { h: '#f6d49a', b: '#c99a52', l: '#6e4a20' },
    { h: '#e6d49a', b: '#a8a052', l: '#5a5420' }, { h: '#ffc49a', b: '#e0844e', l: '#8a3a1a' },
    { h: '#e8c48a', b: '#a8743e', l: '#5a3416' }, { h: '#ff9a7a', b: '#cc3a22', l: '#6e140a' },
    { h: '#f2dca6', b: '#c4a464', l: '#6e5426' }, { h: '#d8d8a6', b: '#8e9a5a', l: '#4a5226' },
  ];
  for (const [tier, metal] of metals.entries()) {
    const m = metalTones[tier];
    set(barOf(metal.name), 'bar', m);
    for (const [piece, family] of [['Espada', 'sword'], ['Casco', 'helmet'], ['Peto', 'body'], ['Grebas', 'legs'], ['Escudo', 'shield'], ['Pico', 'pick'], ['Hacha', 'axe']]) {
      set(pieceName(piece, metal.name), family, m);
    }
    set('Anillo de ' + gems[tier].toLowerCase(), 'ring', m, gemTones[gems[tier]]);
    set(tipsOf(metal.name), 'tips', m);
    set(arrows[tier], 'arrow', m);
    set(woods[tier], 'log', woodTones[tier]);
    set(bows[tier], 'bow', { h: woodTones[tier].h, b: woodTones[tier].b, l: woodTones[tier].l }, m);
    set(staves[tier], 'staff', elementTones[tier], { h: woodTones[tier].h, b: woodTones[tier].bark, l: woodTones[tier].l });
    set(runes[tier], 'rune', ['air', 'water', 'earth', 'fire', 'chaos', 'moon', 'astral', 'blood'][tier], elementTones[tier]);
    const kind = fishKinds[tier];
    const special = kind === 'shrimp' || kind === 'lobster';
    set(rawFish[tier], special ? kind : 'fish', rawTones[tier], false, ...(special ? [] : [kind]));
    set(cookedFish[tier], special ? kind : 'fish', cookedTones[tier], true, ...(special ? [] : [kind]));
    set('Estofado de ' + fish[tier].toLowerCase(), 'stew', stewTones[tier]);
    set(bones[tier], 'bone', [boneTone, boneTone, { h: '#f2e2c4', b: '#cdb48a', l: '#7e6440' }, { h: '#d4d6d8', b: '#9da2a8', l: '#585e66' },
      { h: '#e6f0d2', b: '#b4c494', l: '#62704a' }, { h: '#f0e2c0', b: '#c8ae7a', l: '#76603a' }, { h: '#e2ecf6', b: '#a8bcd2', l: '#566a84' },
      { h: '#fff0e6', b: '#e8c4b4', l: '#9a5a4a' }][tier], [.8, .92, 1, 1, 1, 1.02, 1.04, 1.1][tier]);
  }
  const ores = { Cobre: { h: '#ffc27a', b: '#ee8628', l: '#8a400c' }, Estaño: { h: '#f4f6f4', b: '#b6bcb8', l: '#6a706c' },
    Hierro: { h: '#c49482', b: '#7c4a3c', l: '#40221a' }, Plata: silverTone, Oro: goldTone,
    Mithril: metalTones[4], Adamantita: metalTones[5], Runita: metalTones[6], Dracónita: metalTones[7] };
  for (const [name, color] of Object.entries(ores)) set(name, 'ore', color);
  set('Carbón', 'coal');
  set('Barra de plata', 'bar', silverTone); set('Barra de oro', 'bar', goldTone);
  set('Anillo de plata', 'ring', silverTone); set('Anillo de oro', 'ring', goldTone);
  for (const gem of gems) set(gem, 'gem', gemTones[gem]);
  set('Esmeralda', 'gemStep', gemTones.Esmeralda); set('Granate', 'gemRound', gemTones.Granate);
  set('Ónix', 'cabochon', gemTones['Ónix']); set('Piedra de dragón', 'crystal', gemTones['Piedra de dragón']);
  set(geode, 'geode'); set('Esencia', 'essence'); set('Pluma', 'feather');
  // Botín raro: amuletos con colgante propio y trofeos de jefe con silueta única.
  const ivory = { h: '#fffbee', b: '#ecdfbf', l: '#a08a5e' };
  const amuletArt = [['fang', ivory], ['tusk', ivory], ['tooth', { h: '#f6eccc', b: '#d4c08a', l: '#86703e' }], ['wing', { h: '#c2c6c8', b: '#80868c', l: '#454a50' }],
    ['claw', { h: '#9ad6a2', b: '#3f7a52', l: '#1e4228' }], ['orb', elementTones[1]], ['seal', metalTones[6]], ['scale', metalTones[7]]];
  for (const [tier, item] of amulets.entries()) set(item, 'amulet', ...amuletArt[tier]);
  set(trophies[0], 'crown', goldTone, gemTones['Rubí']);
  set(trophies[1], 'amulet', 'tusk', metalTones[2], metalTones[1]);
  set(trophies[2], 'saber', metalTones[2]);
  set(trophies[3], 'greathelm', metalTones[3], { b: '#c3162c' });
  set(trophies[4], 'veil');
  set(trophies[5], 'shard', { h: '#8c7aa8', b: '#2e2838', l: '#120e18' });
  set(trophies[6], 'heart', { h: '#c6bcae', b: '#867c70', l: '#463e36' });
  set(trophies[7], 'heart', { h: '#ffa0a0', b: '#d8202e', l: '#6e0812' });
  set('Insignia del Valle', 'medal', goldTone);
  // Consumibles.
  set('Tónico', 'potion', { h: '#ffb0b0', b: '#d83a3a', l: '#7a1414' });
  const herbTones = [{ h: '#b8e08a', b: '#5e9a34', l: '#2c5216' }, { h: '#c2f6c6', b: '#3cc47a', l: '#14663a' }, { h: '#d4dcc4', b: '#8ea47e', l: '#4a5a40' },
    { h: '#e8b8f0', b: '#a45ac0', l: '#562a6a' }, { h: '#eef2ff', b: '#a6b4e6', l: '#4c5a92' }, { h: '#fff2a6', b: '#e6b83a', l: '#8a6414' }];
  for (const [tier, herb] of herbs.entries()) {
    set(herb, 'herb', herbTones[tier]);
    set(tier ? 'Poción de ' + herb.toLowerCase() : 'Brebaje protector', 'potion', tier ? herbTones[tier] : elementTones[1]);
  }
  // Cuero y armadura de cuero (objetos retirados, siguen en partidas viejas).
  const leatherTones = [leatherTone, { h: '#a8825a', b: '#6a4a2a', l: '#3a2614' }, { h: '#c8a070', b: '#8e6a40', l: '#4e361c' },
    { h: '#a6c49a', b: '#5e7e56', l: '#30442a' }, { h: '#9ad0b0', b: '#3e8a6a', l: '#1c4a36' }, { h: '#d8c096', b: '#a08050', l: '#5a4224' }];
  set('Guantes de cuero', 'gauntlet', leatherTone);
  for (const [tier, material] of leather.entries()) {
    const c = leatherTones[tier];
    set(material, 'hide', c);
    set('Chaleco de ' + material.toLowerCase(), 'body', c);
    set('Pantalón de ' + material.toLowerCase(), 'legs', c);
    set('Brazales de ' + material.toLowerCase(), 'gauntlet', c);
  }
  const cargo = [['crate'], ['blob', { h: '#ffe0a0', b: '#d89a2a', l: '#7a4a0c' }], ['sack', { h: '#ffffff', b: '#e2dcd0', l: '#948a78' }],
    ['blob', { h: '#ffd27a', b: '#e2862a', l: '#8a400c' }], ['pearl', { h: '#ffffff', b: '#e6e0ee', l: '#9a8eae' }], ['crystal', { h: '#c8fff6', b: '#3ec6b4', l: '#167068' }]];
  const cargoRings = [goldTone, gemTones.Topacio, silverTone, gemTones.Topacio, { h: '#ffffff', b: '#e6e0ee', l: '#9a8eae' }, cargo[5][1]];
  for (const [tier, item] of legacyCargo.entries()) {
    set(item, ...cargo[tier]);
    set('Anillo de ' + item.toLowerCase(), 'ring', goldTone, tier ? cargoRings[tier] : { h: '#f6d49a', b: '#b8844a', l: '#6e4a26' });
  }
}

// Devuelve { family, args, color, generic } para un objeto. `color` es el tono base (lo usa el héroe del mapa).
function itemSpec(item) {
  if (!itemArtTable.size) buildItemArt();
  const entry = itemArtTable.get(item);
  if (entry) {
    const [family, args] = entry;
    const color = args.find(arg => arg && arg.b)?.b || '#a9834f';
    return { family, args, color, generic: false };
  }
  // Objetos sin entrada: se adivina por el espacio de equipo o por el nombre, y si no, un cofre.
  const slot = typeof gear !== 'undefined' && gear[item]?.slot;
  const shapes = { weapon: 'sword', head: 'helmet', body: 'body', legs: 'legs', shield: 'shield', hands: 'gauntlet', pick: 'pick', axe: 'axe' };
  if (shapes[slot]) return { family: shapes[slot], args: [metalTones[1]], color: metalTones[1].b, generic: false };
  if (/^(Poción|Brebaje)/.test(item)) return { family: 'potion', args: [elementTones[1]], color: elementTones[1].b, generic: false };
  return { family: 'crate', args: [], color: '#a8743c', generic: true };
}

const itemSvgCache = new Map();
function itemSvg(item, className = '') {
  const key = item + '|' + className;
  let svg = itemSvgCache.get(key);
  if (!svg) {
    const { family, args } = itemSpec(item);
    svg = '<svg class="ico item-ico' + (className ? ' ' + className : '') + '" viewBox="0 0 32 32" aria-hidden="true">' + artFamilies[family](...args) + '</svg>';
    itemSvgCache.set(key, svg);
  }
  return svg;
}
