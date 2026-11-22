'use strict';

// ─── Ritmo general ────────────────────────────────────────────────────────────
// Ocho tramos, como los metales de OSRS. `bands` es el nivel de oficio que abre cada tramo.
// `xpScale` multiplica la XP de cada acción del tramo. La curva de niveles es la de OSRS, así que este array
// es la perilla principal del ritmo. Se calibró con revision-balance/bot5.js para que la campaña lleve
// unas 50 horas de juego activo (un año jugando 20 minutos, tres veces por semana).
const bands = [1, 10, 20, 30, 40, 55, 70, 85];
// Ojo: el tramo de un jefe se gana con la XP del tramo anterior (de 40 a 55 se sube con contenido de mithril),
// así que xpScale[t] marca el ritmo entre el jefe t y el jefe t + 1.
const xpScale = [1, 1.1, 1.25, 1.6, 4.2, 13.5, 40, 60];
// Nivel de Ataque o Defensa para equipar las piezas de cada tramo (como OSRS: el oficio fabrica, el combate equipa).
// Precio de la comida del Mercado y del servicio "Encargar cocina". Cocinar por tu cuenta es gratis y además da XP;
// el Mercado queda como salida rápida, pero cuesta lo bastante como para que pescar y cocinar se note.
const foodPrice = 3;
const cookService = 2;
const equipLevels = [1, 5, 10, 15, 25, 35, 45, 60];
const tasks = [];
const gear = Object.create(null);
const food = Object.create(null);
const tonics = Object.create(null);

function add(zone, skill, name, xp, ticks, options = {}) {
  tasks.push({
    zone, skill, name, xp: Math.round(xp), ticks, level: 1, input: {}, output: {}, gold: 0,
    group: '', requires: {}, ...options, id: tasks.length,
  });
}

// ─── Materiales por tramo ─────────────────────────────────────────────────────
const metals = [
  { name: 'bronce', mineral: { Cobre: 1, Estaño: 1 }, smeltTicks: 3 },
  { name: 'hierro', mineral: { Hierro: 1 } },
  { name: 'acero', mineral: { Hierro: 1, Carbón: 2 } },
  { name: 'acero negro', mineral: { Hierro: 1, Carbón: 3 } },
  { name: 'mithril', ore: 'Mithril', coal: 4 },
  { name: 'adamantita', ore: 'Adamantita', coal: 5 },
  { name: 'rúnico', ore: 'Runita', coal: 6 },
  { name: 'dragón', ore: 'Dracónita', coal: 8 },
];
for (const [tier, metal] of metals.entries()) metal.equip = equipLevels[tier];
const woods = ['Tronco', 'Roble', 'Sauce', 'Teca', 'Arce', 'Caoba', 'Tejo', 'Árbol mágico'];
const bows = ['Arco simple', 'Arco de roble', 'Arco de sauce', 'Arco de teca', 'Arco de arce', 'Arco de caoba', 'Arco de tejo', 'Arco mágico'];
const arrows = ['Flecha', 'Flecha de hierro', 'Flecha de acero', 'Flecha de acero negro', 'Flecha de mithril',
  'Flecha de adamantita', 'Flecha rúnica', 'Flecha de dragón'];
const fish = ['Camarón', 'Sardina', 'Trucha', 'Salmón', 'Atún', 'Langosta', 'Pez espada', 'Tiburón'];
const rawFish = ['Camarón crudo', 'Sardina cruda', 'Trucha cruda', 'Salmón crudo', 'Atún crudo', 'Langosta cruda', 'Pez espada crudo', 'Tiburón crudo'];
const cookedFish = ['Camarón cocido', 'Sardina cocida', 'Trucha cocida', 'Salmón cocido', 'Atún cocido', 'Langosta cocida', 'Pez espada cocido', 'Tiburón cocido'];
// Curación de cada comida. Ronda el 30 % de la vida esperada al llegar al jefe de ese tramo:
// la comida del tramo sostiene la pelea; la de dos tramos atrás ya no alcanza.
const fishHeal = [3, 5, 7, 9, 12, 16, 20, 24];
const stewHeal = [5, 8, 11, 14, 18, 23, 28, 33];
const herbs = ['Hierba', 'Menta', 'Salvia', 'Brezo', 'Hoja lunar', 'Hoja estelar'];
const leather = ['Cuero', 'Cuero duro', 'Cuero tachonado', 'Cuero de escamas', 'Cuero de wyvern', 'Cuero antiguo'];
const runes = ['Runa de aire', 'Runa de agua', 'Runa de tierra', 'Runa de fuego', 'Runa de caos', 'Runa lunar', 'Runa astral', 'Runa de sangre'];
const staves = ['Bastón de aire', 'Bastón de agua', 'Bastón de tierra', 'Bastón de fuego', 'Bastón de caos', 'Bastón lunar', 'Bastón astral', 'Bastón de sangre'];
const legacyCargo = ['Suministro del lago', 'Resina de río', 'Sal de las islas', 'Ámbar del canal', 'Perla de niebla', 'Cristal de marea'];
const gems = ['Topacio', 'Granate', 'Zafiro', 'Ónix', 'Esmeralda', 'Rubí', 'Diamante', 'Piedra de dragón'];
const geode = 'Geoda de veta';
const miningMilestones = [
  { level: 25, name: 'Geodas al picar minerales' },
  { level: 45, name: 'Doble probabilidad de geodas' },
];
const bones = ['Huesos', 'Huesos gruesos', 'Huesos de ogro', 'Huesos de gárgola', 'Huesos de wyvern',
  'Huesos ancestrales', 'Huesos del guardián', 'Huesos de dragón'];

const slots = {
  weapon: 'Espada', bow: 'Arco', staff: 'Bastón', head: 'Cabeza', body: 'Torso',
  legs: 'Piernas', shield: 'Escudo', hands: 'Manos', ring: 'Anillo', neck: 'Amuleto', pick: 'Pico', axe: 'Hacha',
};
const armorSlots = ['head', 'body', 'legs', 'shield', 'hands', 'ring'];
const barOf = name => name === 'rúnico' ? 'Barra de runita' : name === 'dragón' ? 'Barra de dracónita' : 'Barra de ' + name;
const tipsOf = name => name === 'rúnico' ? 'Puntas rúnicas' : 'Puntas de ' + name;
// Nombre de cada pieza respetando el género de "rúnico".
function pieceName(piece, metal) {
  if (metal !== 'rúnico') return piece + ' de ' + metal;
  return piece + ' ' + ({ Espada: 'rúnica', Grebas: 'rúnicas', Hacha: 'rúnica' }[piece] || 'rúnico');
}

function craftGear(zone, skill, name, item, slot, bonus, xp, ticks, options, useSkill = 'defence', useLevel = 1) {
  gear[item] = { slot, bonus, skill: useSkill, level: useLevel };
  add(zone, skill, name, xp, ticks, { ...options, output: { [item]: 1 } });
}

// ─── Cantera y Forja ──────────────────────────────────────────────────────────
add('mine', 'mining', 'Picar cobre', 18, 4, { group: 'Minerales', output: { Cobre: 1 } });
add('mine', 'mining', 'Picar estaño', 18, 4, { group: 'Minerales', output: { Estaño: 1 } });
add('mine', 'mining', 'Picar veta mixta', 30, 6, { group: 'Minerales', level: 5, output: { Cobre: 1, Estaño: 1 } });
add('mine', 'mining', 'Picar hierro', 24 * xpScale[1], 5, { group: 'Minerales', level: bands[1], toolTier: 1, output: { Hierro: 1 } });
add('mine', 'mining', 'Picar carbón', 26 * xpScale[2], 5, { group: 'Minerales', level: bands[2], toolTier: 2, output: { Carbón: 1 } });
add('mine', 'mining', 'Extraer esencia', 8, 3, { group: 'Esencia', output: { Esencia: 1 } });
add('mine', 'mining', 'Extraer esencia pura', 14 * xpScale[3], 4, { group: 'Esencia', level: bands[3], toolTier: 3, output: { Esencia: 3 } });
add('mine', 'mining', 'Extraer veta de esencia', 20 * xpScale[5], 6, { group: 'Esencia', level: bands[5], toolTier: 5, output: { Esencia: 8 } });

for (const [tier, metal] of metals.entries()) {
  const { name, ore, equip } = metal;
  const scale = xpScale[tier];
  const level = bands[tier];
  const group = name[0].toUpperCase() + name.slice(1);
  const bar = barOf(name);
  const mineral = metal.mineral || { [ore]: 1, Carbón: metal.coal };
  const coalPerBar = mineral.Carbón || 0;
  add('mine', 'mining', 'Buscar ' + gems[tier].toLowerCase(), 20 * scale, 22, {
    group: 'Gemas', level, toolTier: tier, output: { [gems[tier]]: 1 },
  });
  if (ore) add('mine', 'mining', 'Picar ' + ore.toLowerCase(), 30 * scale, 6, { group: 'Minerales', level, toolTier: tier, output: { [ore]: 1 } });
  // Las vetas de antracita son bolsas densas de carbón: conservan el rendimiento de dos unidades.
  const anthracite = ['Veta de antracita', 'Antracita compacta', 'Antracita profunda', 'Antracita cristalina', 'Antracita ancestral'][tier - 3];
  if (anthracite) add('mine', 'mining', anthracite, 24 * scale, 7, {
    group: 'Minerales', level, toolTier: tier, output: { Carbón: 2 }, legacyNames: [group, 'Explotar veta de carbón · ' + group],
  });
  // Fundir paga más cuanto más carbón lleva la barra, para que el mineral extra no sea tiempo perdido.
  add('forge', 'smithing', 'Fundir ' + name, (10 + 3 * coalPerBar) * scale, metal.smeltTicks || 4, {
    level, group, input: mineral, output: { [bar]: 1 },
  });
  const forged = bars => Math.round(16 * bars * scale);
  const sword = pieceName('Espada', name);
  craftGear('forge', 'smithing', 'Forjar ' + sword.toLowerCase(), sword, 'weapon', tier + 1, forged(2), 5,
    { group, level, input: { [bar]: 2 } }, 'attack', equip);
  for (const [piece, slot, bars, bonus] of [['Casco', 'head', 2, 1], ['Peto', 'body', 5, 2], ['Grebas', 'legs', 3, 1], ['Escudo', 'shield', 3, 1]]) {
    const item = pieceName(piece, name);
    craftGear('forge', 'smithing', 'Forjar ' + item.toLowerCase(), item,
      slot, tier + bonus, forged(bars), 4 + bars, { level, group, input: { [bar]: bars } }, 'defence', equip);
  }
  const ring = 'Anillo de ' + gems[tier].toLowerCase();
  craftGear('forge', 'smithing', 'Engarzar ' + ring.toLowerCase(), ring, 'ring', tier + 1, forged(2), 5,
    { group, level, input: { [bar]: 1, [gems[tier]]: 1 } }, 'defence', equip);
  for (const [piece, slot, skill] of [['Pico', 'pick', 'mining'], ['Hacha', 'axe', 'woodcutting']]) {
    const item = pieceName(piece, name);
    craftGear('forge', 'smithing', 'Forjar ' + item.toLowerCase(), item,
      slot, tier + 1, forged(2), 5, { group, level, input: { [bar]: 2 } }, skill, equip);
  }
  if (tier) add('forge', 'smithing', 'Forjar puntas · ' + group, forged(1), 4, {
    level, group, input: { [bar]: 1 }, output: { [tipsOf(name)]: 15 },
  });
}

for (const [ore, level, miningXp, smithingXp, bonus] of [
  ['Plata', 15, 34, 30, 2],
  ['Oro', 35, 70, 64, 4],
]) {
  const material = ore.toLowerCase();
  const bar = barOf(material);
  const ring = 'Anillo de ' + material;
  add('mine', 'mining', 'Picar ' + material, miningXp, 5, {
    group: 'Minerales', level, toolTier: level < bands[2] ? 2 : 4, output: { [ore]: 1 },
  });
  add('forge', 'smithing', 'Fundir ' + material, smithingXp, 4, {
    group: 'Plata y oro', level, input: { [ore]: 1 }, output: { [bar]: 1 },
  });
  craftGear('forge', 'smithing', 'Forjar ' + ring.toLowerCase(), ring, 'ring', bonus, smithingXp * 2, 5,
    { group: 'Plata y oro', level, input: { [bar]: 1 } }, 'defence', bonus === 2 ? 5 : 15);
}
add('mine', 'mining', 'Abrir geoda', 35, 3, {
  group: 'Gemas', level: 25, input: { [geode]: 1 }, output: { Topacio: 1, Granate: 1 },
});

// ─── Santuario, Mercado y mejoras ─────────────────────────────────────────────
add('shrine', 'prayer', 'Recargar plegaria', 0, 2, { group: 'Plegaria', effect: 'prayer' });
food.Tónico = 5;
add('market', null, 'Comprar plumas', 0, 2, { group: 'Provisiones', cost: 12, output: { Pluma: 5 } });
add('market', null, 'Comprar ración de camarones', 0, 5, { group: 'Provisiones', cost: 60, output: { 'Camarón cocido': 3 } });
add('market', null, 'Comprar esencia', 0, 2, { group: 'Provisiones', cost: 22, output: { Esencia: 5 } });

const projects = [
  { id: 'forge', title: 'Mejorar el taller', skill: 'smithing', level: 15, cost: { Roble: 8, 'Barra de hierro': 4 }, coins: 3500, hint: 'Acelera la fundición y la forja.' },
  { id: 'dock', title: 'Ampliar el muelle', skill: 'fishing', level: 30, cost: { Sauce: 12, 'Barra de acero': 6 }, coins: 8000, hint: 'Acelera la pesca.' },
  { id: 'camp', title: 'Construir una cocina', skill: 'cooking', level: 40, cost: { Arce: 16, 'Barra de acero': 8 }, coins: 18000, hint: 'Acelera la cocina.' },
  { id: 'tools', title: 'Comprar banco de afilado', skill: 'mining', level: 15, cost: { Roble: 4 }, coins: 2200, hint: 'Acelera Minería y Tala cuando usás una herramienta.' },
  { id: 'inn', title: 'Mejorar el hogar', skill: 'hitpoints', level: 15, cost: { Tronco: 12 }, coins: 1500, hint: 'El descanso recupera 1 de vida adicional por ciclo.' },
  { id: 'mule', title: 'Contratar mula de carga', skill: 'slayer', level: 30, cost: {}, coins: 4000, hint: 'Caminás un 25 % más rápido cuando llevás objetos en la mochila.' },
  { id: 'outpost', title: 'Levantar campamento de avanzada', skill: 'slayer', level: 55, cost: { Caoba: 20 }, coins: 40000, hint: 'El descanso recupera el doble de vida por ciclo.' },
  { id: 'banner', title: 'Bordar el estandarte del valle', skill: 'slayer', level: 70, cost: {}, coins: 150000, hint: '+10 % de XP en todas las habilidades, para siempre.' },
];
for (const project of projects) add('market', null, project.title, 0, 14, {
  group: 'Mejoras', requires: { [project.skill]: project.level }, input: project.cost, cost: project.coins, project,
});

// ─── Bosque, Muelles, Cocina y Santuario por tramo ────────────────────────────
for (const [tier, level] of bands.entries()) {
  const scale = xpScale[tier];
  const wood = woods[tier];
  const raw = rawFish[tier];
  const equip = metals[tier].equip;
  add('forest', 'woodcutting', tier ? 'Talar ' + wood.toLowerCase() : 'Talar árbol', 25 * scale, 4 + Math.floor(tier / 3), {
    group: 'Tala', level, toolTier: tier, output: { [wood]: 1 },
  });
  add('market', null, 'Comprar ' + wood.toLowerCase(), 0, 2, {
    group: 'Provisiones', tier, cost: 12 + tier * 9, output: { [wood]: 1 },
  });
  const stew = 'Estofado de ' + fish[tier].toLowerCase();
  food[stew] = stewHeal[tier];
  tonics[stew] = tier + 1;
  add('camp', 'cooking', 'Preparar ' + stew.toLowerCase(), 40 * scale, 5, {
    group: 'Cocina', level, input: { [raw]: 2, [wood]: 1 }, output: { [stew]: 1 },
  });
  add('market', null, 'Comprar ' + stew.toLowerCase(), 0, 3, {
    group: 'Provisiones', tier, cost: Math.round((60 + 35 * tier ** 2) * foodPrice), output: { [stew]: 1 },
  });
  craftGear('shrine', 'runecraft', 'Imbuir ' + staves[tier].toLowerCase(), staves[tier], 'staff', tier + 1, 32 * scale, 5,
    { group: 'Bastones', level, input: { [wood]: 1, [runes[tier]]: 5 } }, 'magic', equip);
  const arrowMaterial = tier ? { [tipsOf(metals[tier].name)]: 5, Pluma: 1 } : {};
  if (tier) add('market', null, 'Comprar puntas · ' + metals[tier].name, 0, 2, {
    group: 'Provisiones', tier, requires: { fletching: level }, cost: 12 * tier, output: { [tipsOf(metals[tier].name)]: 5 },
  });
  add('forest', 'fletching', tier ? 'Montar flechas · ' + metals[tier].name : 'Tallar flechas', 15 * scale, 3, {
    group: 'Arquería', level, input: { [wood]: 1, ...arrowMaterial }, output: { [arrows[tier]]: 10 },
  });
  craftGear('forest', 'fletching', 'Tallar ' + bows[tier].toLowerCase(), bows[tier], 'bow', tier + 1,
    Math.round(25 * scale), 4, { group: 'Arquería', level, input: { [wood]: 1 } }, 'ranged', equip);

  add('docks', 'fishing', 'Pescar ' + fish[tier].toLowerCase(), 20 * scale, 4 + Math.floor(tier / 3), {
    group: 'Pesca', level, input: tier === 2 || tier === 3 ? { Pluma: 1 } : {}, output: { [raw]: 1 },
  });
  food[cookedFish[tier]] = fishHeal[tier];
  add('camp', 'cooking', 'Cocinar ' + fish[tier].toLowerCase(), 24 * scale, 4, {
    group: 'Cocina', level, input: { [raw]: 1 }, output: { [cookedFish[tier]]: 1 },
  });
  add('camp', 'cooking', 'Preparar ración · ' + fish[tier].toLowerCase(), 32 * scale, 5, {
    group: 'Cocina', level, input: { [raw]: 1, [wood]: 1 }, output: { [cookedFish[tier]]: 2 },
  });
  if (tier) add('market', null, 'Comprar ' + cookedFish[tier].toLowerCase(), 0, 3, {
    group: 'Provisiones', tier, requires: { slayer: level }, cost: Math.round(6 * (tier + 1) ** 2 * foodPrice), output: { [cookedFish[tier]]: 1 },
  });
  add('market', null, 'Encargar cocina · ' + fish[tier].toLowerCase(), 0, 5, {
    tier,
    group: 'Provisiones', input: { [raw]: 3 }, cost: Math.round(18 * (tier + 1) ** 2 * cookService), output: { [cookedFish[tier]]: 3 },
  });
  add('shrine', 'prayer', tier ? 'Ofrendar ' + bones[tier].toLowerCase() : 'Enterrar huesos', 12 * scale, 2,
    { group: 'Plegaria', boneTier: tier, input: { [bones[tier]]: 1 } });
  add('shrine', 'runecraft', 'Tallar ' + runes[tier].toLowerCase(), 16 * scale, 3, {
    // Una esencia por tallado en todos los tramos: con más, Magia necesitaba el doble de Minería que Arco.
    group: 'Runas', level, input: { Esencia: 1 }, output: { [runes[tier]]: 3 + tier },
  });
}
add('shrine', 'prayer', 'Ofrendar en el altar', 30, 3, { group: 'Plegaria', level: 5, input: { Huesos: 2 } });

// Objetos retirados: siguen funcionando en partidas de versiones anteriores.
gear['Guantes de cuero'] = { slot: 'hands', bonus: 1, ranged: 4, skill: 'defence', level: 1 };
for (const [tier, material] of leather.entries()) {
  for (const [piece, slot] of [['Chaleco', 'body'], ['Pantalón', 'legs'], ['Brazales', 'hands']]) {
    gear[piece + ' de ' + material.toLowerCase()] = {
      slot, bonus: tier + 1, ranged: 2 + tier * 2, skill: 'defence', level: metals[tier].equip,
    };
  }
  gear['Anillo de ' + legacyCargo[tier].toLowerCase()] = {
    slot: 'ring', bonus: tier + 1, skill: 'defence', level: metals[tier].equip,
  };
  tonics[tier ? 'Poción de ' + herbs[tier].toLowerCase() : 'Brebaje protector'] = tier + 1;
}

// ─── Combate ─────────────────────────────────────────────────────────────────
// Botín raro: cada enemigo de encargo puede soltar un amuleto único y cada jefe un trofeo.
// Los amuletos suman golpe máximo en los tres estilos; los trofeos dan +5 % de XP permanente cada uno.
const amulets = ['Colmillo de rata', 'Colmillo de jabalí', 'Diente de ogro', 'Ala de gárgola', 'Garra de wyvern',
  'Núcleo de centinela', 'Sello rúnico', 'Escama de dragón'];
const trophies = ['Corona del Rey Rata', 'Colmillo de hierro pulido', 'Sable del Capitán', 'Yelmo del Caballero negro',
  'Velo de la Matriarca', 'Fragmento de obsidiana', 'Corazón del coloso', 'Latido del Valle'];
for (const [tier, item] of amulets.entries()) gear[item] = { slot: 'neck', bonus: tier + 1, skill: 'slayer', level: tier ? bands[tier] : 1 };
const amuletOdds = 150;
const trophyOdds = 20;
function dropTable(tier, boss) {
  return [boss ? { items: { [trophies[tier]]: 1 }, chance: 1 / trophyOdds, rare: true, once: true } :
    { items: { [amulets[tier]]: 1 }, chance: 1 / amuletOdds, rare: true, once: true }];
}
const foeSprites = ['🐀', '🐗', '👹', '🦇', '🐉', '🗿', '🛡', '🐲'];
const bossSprites = ['🐀', '🐗', '💀', '⚔', '🕷', '🗿', '🛡', '❤'];

// Cada enemigo tiene vida, guardia (dificultad para acertarle), ataque (puntería contra tu Defensa)
// y golpe máximo (lo reduce tu armadura). Los valores salen de revision-balance/tune-combat.js:
// con el equipo y la comida del tramo, un jefe gana cerca del 95 % de las veces y pide unas 10 comidas.
function foeStats(tier, kind) {
  const level = Math.min(85, Math.max(5, bands[tier] + 3));
  const health = Math.max(10, Math.round(level * .92 + (tier ? 2 : 5)));
  const weapon = tier + 1;
  const armor = 5 * tier + 6;
  const reach = level + 3 * weapon + 12;
  const hit = Math.round(1 + level / 4 + 1.5 * weapon);
  const shape = {
    contract: { rounds: 5, accuracy: .78, aim: .5, max: .13 },
    veteran: { rounds: 7, accuracy: .72, aim: .8, max: .2 },
    // El primer jefe es el tutorial del combate: pega poco y alcanza con camarones.
    boss: tier ? { rounds: 18, accuracy: .72, aim: 1.5, max: .34 } : { rounds: 14, accuracy: .78, aim: 1.2, max: .2 },
  }[kind];
  const guard = Math.max(0, Math.round(reach / shape.accuracy - reach - 8));
  const accuracy = reach / (reach + guard + 8);
  return {
    hp: Math.max(3, Math.round(shape.rounds * accuracy * (hit + 1) / 2)),
    guard,
    attack: Math.round(shape.aim * (level + 10)),
    maxHit: Math.max(1, Math.round(Math.max(1, shape.max * health) * (20 + armor) / 20)),
  };
}
const foes = [
  { name: 'Rata del valle', contract: 'Encargo de ratas', weak: 'melee' },
  { name: 'Jabalí', contract: 'Encargo de jabalíes', weak: 'ranged' },
  { name: 'Ogro de la cantera', contract: 'Encargo de ogros', weak: 'magic' },
  { name: 'Gárgola del puente', contract: 'Encargo de gárgolas', weak: 'melee' },
  { name: 'Wyvern del risco', contract: 'Encargo de wyverns', weak: 'ranged' },
  { name: 'Centinela antiguo', contract: 'Encargo de centinelas', weak: 'magic' },
  { name: 'Guardián rúnico', contract: 'Encargo rúnico', weak: 'melee' },
  { name: 'Dragón joven', contract: 'Encargo de dragones', weak: 'magic' },
].map((foe, tier) => ({ ...foe, ...foeStats(tier, 'contract') }));
const bosses = [
  { name: 'Rey de las ratas', weak: 'melee', threat: 'Muerde rápido, pero se cansa.' },
  { name: 'Colmillo de hierro', weak: 'ranged', threat: 'Embiste fuerte: el escudo se nota.' },
  { name: 'Capitán de acero', weak: 'magic', threat: 'Golpes pesados: llevá truchas o algo mejor.' },
  { name: 'Caballero negro', weak: 'ranged', threat: 'Armadura gruesa: un arma floja alarga la pelea.' },
  { name: 'Matriarca de la niebla', weak: 'ranged', threat: 'Pega seguido: la Defensa alta la hace fallar.' },
  { name: 'Centinela de obsidiana', weak: 'magic', threat: 'Golpes enormes: sin armadura del tramo no se sostiene.' },
  { name: 'Coloso rúnico', weak: 'melee', threat: 'Lento pero brutal: comé temprano.' },
  { name: 'Corazón del Valle', weak: 'melee', threat: 'El desafío final: cada pieza y cada comida cuentan.' },
].map((boss, tier) => ({ ...boss, ...foeStats(tier, 'boss') }));
// Desde la ronda 30 los jefes se enfurecen y pegan un 50 % más: un arma débil alarga la pelea y la vuelve peligrosa.
const enrageRound = 30;
const veteranFoes = ['Rata de las ruinas', 'Jabalí del brezal', 'Ogro de la sima', 'Gárgola agrietada',
  'Wyvern de ceniza', 'Centinela agrietado', 'Guardián del umbral', 'Dragón de ceniza'];
const styles = [
  { skill: 'attack', style: 'melee', title: 'Precisión' }, { skill: 'strength', style: 'melee', title: 'Fuerza' },
  { skill: 'defence', style: 'melee', title: 'Guardia' }, { skill: 'ranged', style: 'ranged', title: 'Arco' },
  { skill: 'magic', style: 'magic', title: 'Hechizo' }, { skill: 'defence', style: 'ranged', title: 'Guardia con arco' },
  { skill: 'defence', style: 'magic', title: 'Guardia con hechizo' },
];

const combatLabels = { melee: 'Espada', ranged: 'Arco', magic: 'Magia' };
const combatSlots = { melee: 'weapon', ranged: 'bow', magic: 'staff' };
// Referencia de protección para los visitantes diarios.
const bossProtection = bands.map((_, tier) => 5 * tier + 3);
function ammunition(style, tier) {
  if (style === 'ranged') return { [arrows[tier]]: 1 };
  if (style === 'magic') return { [runes[tier]]: 1 };
  return {};
}
// XP de combate por pelea: la habilidad elegida, Vida y Cazador de monstruos.
const contractXp = { style: 40, hitpoints: 13, slayer: 10 };
for (const [tier, level] of bands.entries()) {
  const enemy = foes[tier];
  const boss = bosses[tier];
  const scale = xpScale[tier];
  const loot = { [bones[tier]]: 1, ...(tier === 0 ? { Pluma: 1 } : {}) };
  for (const { skill, style, title } of styles) {
    const input = ammunition(style, tier);
    const preferred = skill === 'attack' || skill === 'ranged' || skill === 'magic';
    const contract = enemy.contract + ' · ' + combatLabels[style] + (preferred ? '' : ' · ' + title);
    add('arena', 'slayer', contract, contractXp.slayer * scale, 3, {
      group: 'Encargos', style, train: skill, enemy, level, input, output: loot, gold: 8 * (tier + 1), battleTier: tier,
      drops: dropTable(tier, false), sprite: foeSprites[tier], trainXp: contractXp.style * scale,
      legacyName: enemy.name + ' · ' + title,
    });
    const veteran = { ...enemy, ...foeStats(tier, 'veteran'), name: veteranFoes[tier] };
    add('arena', 'slayer', 'Rastrear ' + veteran.name.toLowerCase() + ' · ' + combatLabels[style] +
      (preferred ? '' : ' · ' + title), contractXp.slayer * 1.5 * scale, 3, {
      group: 'Encargos', style, train: skill, enemy: veteran, veteran: true, level: level + 5, input,
      output: { ...loot, [bones[tier]]: 2 }, gold: 10 * (tier + 1), battleTier: tier,
      drops: dropTable(tier, false), trainXp: contractXp.style * 1.6 * scale,
    });
    if (skill === 'defence' || skill !== 'attack' && style === 'melee') continue;
    add('arena', 'slayer', boss.name + ' · ' + title, 120 * scale, 4, {
      group: 'Jefes', style, enemy: boss, boss: tier,
      input: ammunition(style, Math.max(0, tier - 1)),
      output: { ...loot, [gems[tier]]: 1 }, gold: 40 * (tier + 1), battleTier: tier, trainXp: 160 * scale,
      drops: dropTable(tier, true), sprite: bossSprites[tier], big: true,
    });
  }
}
const masteryFoe = { ...foeStats(7, 'boss'), name: 'Eco del Corazón', weak: 'melee', threat: 'Un Corazón del Valle más rápido y más fuerte.' };
masteryFoe.hp = Math.round(masteryFoe.hp * 1.4);
masteryFoe.maxHit = Math.round(masteryFoe.maxHit * 1.15);
masteryFoe.attack = Math.round(masteryFoe.attack * 1.15);
for (const { skill, style } of styles.filter(entry => ['attack', 'ranged', 'magic'].includes(entry.skill))) {
  add('arena', 'slayer', masteryFoe.name + ' · ' + combatLabels[style], 6000, 4, {
    group: 'Maestría', style, enemy: masteryFoe, challenge: true, battleTier: 7,
    level: 85, minProtection: 41, minWeapon: 8, input: ammunition(style, 7), trainXp: 9000,
    output: { 'Insignia del Valle': 1, 'Huesos de dragón': 2 }, gold: 500, sprite: '❤', big: true,
  });
}
for (const [tier, enemy] of foes.entries()) {
  const visitor = { ...enemy, ...foeStats(tier, 'veteran'), name: 'Visitante · ' + enemy.name };
  visitor.hp = Math.round(visitor.hp * 2.2);
  for (const { skill, style } of styles.filter(entry => ['attack', 'ranged', 'magic'].includes(entry.skill))) {
    add('arena', 'slayer', visitor.name + ' · ' + combatLabels[style], 65 * xpScale[tier], 4, {
      group: 'Jefe del día', style, enemy: visitor, daily: tier, battleTier: tier, level: tier ? bands[tier] - 5 : 5,
      minProtection: bossProtection[tier], trainXp: 100 * xpScale[tier],
      minWeapon: Math.max(1, tier), input: ammunition(style, Math.max(0, tier - 1)),
      output: { [gems[tier]]: 1, [bones[tier]]: 2 }, gold: 100 * (tier + 1), sprite: foeSprites[tier], big: true,
    });
  }
}

const route = [
  { title: 'Primer equipo', material: 'Bronce', skill: 'attack', level: 5, tip: 'Miná cobre y estaño, forjá tu primer equipo y llevá camarones al Rey de las ratas.' },
  { title: 'La senda del hierro', material: 'Hierro', skill: 'smithing', level: 10, tip: 'Equipá un pico de bronce para extraer hierro. Forjá el set de hierro y llevá sardinas.' },
  { title: 'Guardia del acero', material: 'Acero', skill: 'smithing', level: 20, tip: 'El carbón y el hierro hacen acero. El Capitán pega fuerte: llevá truchas.' },
  { title: 'El caballero negro', material: 'Acero negro', skill: 'smithing', level: 30, tip: 'Tres de carbón por barra. Su armadura castiga las armas flojas: afilá tu golpe.' },
  { title: 'Dominio del mithril', material: 'Mithril', skill: 'smithing', level: 40, tip: 'La Matriarca acierta seguido: subí Defensa y llevá atún.' },
  { title: 'Forjado en adamantita', material: 'Adamantita', skill: 'smithing', level: 55, tip: 'El Centinela pega golpes enormes. Sin el set completo de adamantita no hay pelea.' },
  { title: 'El coloso rúnico', material: 'Rúnico', skill: 'smithing', level: 70, tip: 'El Coloso es lento pero brutal. Comé temprano y llevá pez espada.' },
  { title: 'Corazón del Valle', material: 'Dragón', skill: 'smithing', level: 85, tip: 'El desafío final. Equipo de dragón, tiburones y paciencia.' },
];
