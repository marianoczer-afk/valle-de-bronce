'use strict';

// Glifos de interfaz (habilidades, zonas, chips) en la misma familia que los objetos de item-icons.js:
// grilla de 32, luz arriba a la izquierda, tres tonos y contorno oscuro de 1,5 px.
// `icon(forma, color)` sigue aceptando un color libre: de él salen los tres tonos.

const glyphArt = {
  sword: c => artFamilies.sword(c), saber: c => artFamilies.saber(c), axe: c => artFamilies.axe(c), pick: c => artFamilies.pick(c),
  hammer: c => artFamilies.hammer(c), anvil: c => artFamilies.anvil(c), bow: c => artFamilies.bow(woodTones[1], c), arrow: c => artFamilies.arrow(c),
  tips: c => artFamilies.tips(c), staff: c => artFamilies.staff(c, woodTone), rune: c => artFamilies.rune('astral', c),
  essence: () => artFamilies.essence(), helmet: c => artFamilies.helmet(c), body: c => artFamilies.body(c), legs: c => artFamilies.legs(c),
  shield: c => artFamilies.shield(c), fist: c => artFamilies.fist(c), gauntlet: c => artFamilies.gauntlet(c), ring: c => artFamilies.ring(goldTone, c),
  amulet: c => artFamilies.amulet('orb', c), ore: c => artFamilies.ore(c), bar: c => artFamilies.bar(c), gem: c => artFamilies.gem(c),
  geode: () => artFamilies.geode(), log: c => artFamilies.log({ bark: c.l, h: c.h, b: c.b, l: c.l }), bone: c => artFamilies.bone(c),
  feather: c => artFamilies.feather(c), fish: c => artFamilies.fish(c, false), cooked: c => artFamilies.fish(c, true), stew: c => artFamilies.stew(c),
  coin: () => artFamilies.coin(), heart: c => artFamilies.heart(c), trophy: () => artFamilies.cup(goldTone), badge: c => artFamilies.star(c),
  star: c => artFamilies.star(c), skull: c => artFamilies.skull(c), flame: () => artFamilies.flame(), tree: c => artFamilies.tree(c),
  swords: () => artFamilies.swords(), purse: () => artFamilies.purse(), anchor: c => artFamilies.anchor(c), pot: () => artFamilies.pot(),
  rod: () => artFamilies.rod(), lock: () => artFamilies.lock(), pack: c => artFamilies.pack(c), map: () => artFamilies.map(),
  flag: c => artFamilies.flag(c), book: () => artFamilies.book(), clock: () => artFamilies.clock(), bolt: () => artFamilies.bolt(),
  target: () => artFamilies.target(), chest: c => artFamilies.chest(c), crate: () => artFamilies.crate(), potion: c => artFamilies.potion(c),
};
// Íconos de interfaz (botones del HUD, cerrar, flechas): trazo de 2 px redondeado en grilla de 24, al estilo de
// Material Symbols. Van sin relleno de material y toman `currentColor`, así heredan el color del botón.
const uiShapes = {
  settings: '<path d="M9.87 5.12 10.38 2.54h3.24l.51 2.58 1.23.51 2.18-1.47 2.3 2.3-1.47 2.18.51 1.23 2.58.51v3.24l-2.58.51' +
    '-.51 1.23 1.47 2.18-2.3 2.3-2.18-1.47-1.23.51-.51 2.58h-3.24l-.51-2.58-1.23-.51-2.18 1.47-2.3-2.3 1.47-2.18-.51-1.23' +
    '-2.58-.51v-3.24l2.58-.51.51-1.23-1.47-2.18 2.3-2.3 2.18 1.47z"/><circle cx="12" cy="12" r="3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/>',
  fullscreen: '<path d="M4 9V5.5A1.5 1.5 0 015.5 4H9M15 4h3.5A1.5 1.5 0 0120 5.5V9M20 15v3.5a1.5 1.5 0 01-1.5 1.5H15M9 20H5.5A1.5 1.5 0 014 18.5V15"/>',
  'fullscreen-exit': '<path d="M9 4v3.5A1.5 1.5 0 017.5 9H4M15 4v3.5A1.5 1.5 0 0016.5 9H20M20 15h-3.5a1.5 1.5 0 00-1.5 1.5V20M4 15h3.5A1.5 1.5 0 019 16.5V20"/>',
  'expand-less': '<path d="m7 14.5 5-5 5 5"/>',
  'expand-more': '<path d="m7 9.5 5 5 5-5"/>',
  'chevron-left': '<path d="m14.5 6-6 6 6 6"/>',
  'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  // Acciones del panel: reemplazan ▶ ⚔ ➜ ✓, que no están en las fuentes embebidas.
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  'arrow-forward': '<path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  padlock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>',
};
// Nombres viejos de formas que todavía pueden llegar desde otras partes del juego.
const glyphAliases = { 'helmet-iron': 'helmet', 'helmet-steel': 'helmet', 'helmet-high': 'helmet', 'pick-iron': 'pick', 'pick-steel': 'pick',
  'pick-high': 'pick', 'axe-iron': 'axe', 'axe-steel': 'axe' };
const glyphDefaults = { chest: '#94643a', pack: '#9b6b3c', flag: '#c8402f', tree: '#4f8a43', anchor: '#cfd8dd', heart: '#d9463b', star: '#f1d36a',
  badge: '#e3b74a', skull: '#e9e2cf' };
const glyphCache = new Map();
function icon(shape, color, className = '') {
  if (uiShapes[shape]) {
    return '<svg class="ico ico-ui ' + className + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + uiShapes[shape] + '</svg>';
  }
  const name = glyphArt[shape] ? shape : glyphAliases[shape] || 'chest';
  const hex = /^#[0-9a-f]{6}$/i.test(color || '') ? color : glyphDefaults[name] || '#c9c1a0';
  const key = name + hex + className;
  let svg = glyphCache.get(key);
  if (!svg) {
    svg = '<svg class="ico ' + className + '" viewBox="0 0 32 32" aria-hidden="true">' + glyphArt[name](tone(hex)) + '</svg>';
    glyphCache.set(key, svg);
  }
  return svg;
}

const gearShapes = { weapon: 'sword', bow: 'bow', staff: 'staff', head: 'helmet', body: 'body', legs: 'legs', shield: 'shield',
  hands: 'fist', ring: 'ring', neck: 'amulet', pick: 'pick', axe: 'axe' };
const skillIcons = {
  attack: ['sword', '#c9d3da'], strength: ['fist', '#d99a5a'], defence: ['shield', '#5c7fd8'], hitpoints: ['heart', '#d9463b'],
  ranged: ['bow', '#7fae3e'], prayer: ['star', '#f1d36a'], magic: ['staff', '#5f86f0'], runecraft: ['rune', '#b48cf0'],
  fletching: ['arrow', '#c9d3da'], slayer: ['skull', '#e9e2cf'], mining: ['pick', '#c27a3e'], smithing: ['anvil', '#7d8890'],
  fishing: ['fish', '#5fa8d0'], cooking: ['pot', '#888888'], woodcutting: ['axe', '#b9c0bc'],
};
const zoneIcons = {
  forest: ['tree', '#4f8a43'], arena: ['swords'], mine: ['pick', '#b9c0bc'], market: ['purse'], camp: ['flame'],
  forge: ['anvil', '#7d8890'], shrine: ['star', '#f1dc8a'], docks: ['anchor', '#cfd8dd'],
};
const skillIcon = key => icon(...(skillIcons[key] || ['star']));
const zoneIcon = id => icon(...(zoneIcons[id] || ['map']));
// Devuelve [familia, color base] de cualquier objeto. El color base lo usa el héroe del mapa para teñir su equipo.
function iconSpec(item) {
  if (!item) return ['crate', '#9b6b3c'];
  const { family, color } = itemSpec(item);
  return [family, color];
}
// Ícono pintado (art/objetos.webp, ver art-source/objetos/armar-objetos.py); si el objeto no tiene, el SVG de siempre.
function itemSprite(item) {
  const index = typeof itemSprites !== 'undefined' ? itemSprites[item] : undefined;
  if (index === undefined) return '';
  const { cols, rows } = itemSpriteGrid;
  const x = index % cols * 100 / (cols - 1);
  const y = Math.floor(index / cols) * 100 / (rows - 1);
  return '<i class="ico item-sprite" style="background-position:' + x.toFixed(4) + '% ' + y.toFixed(4) + '%" aria-hidden="true"></i>';
}
function itemIcon(item) {
  return item ? itemSprite(item) || itemSvg(item) : icon('chest');
}
