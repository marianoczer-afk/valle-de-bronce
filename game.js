'use strict';

const zones = {
  forest: ['Bosque', '🌲', 200, 212, 'Talá madera y fabricá arcos y flechas.'],
  arena: ['Batalla', '⚔', 470, 179, 'Peleá por botín, aceptá encargos y enfrentá a los ocho jefes del valle.'],
  mine: ['Minería', '⛏', 810, 229, 'Empezá con cobre y estaño. Las vetas llegan hasta runita en Minería 85.'],
  market: ['Mercado', '⚖', 164, 397, 'Comprá provisiones o pagá con monedas y materiales para mejorar el valle.'],
  camp: ['Hogar', '🔥', 514, 411, 'Recuperá vida, cociná y organizá tu mochila en el cofre.'],
  forge: ['Herrería', '⚒', 830, 405, 'Elegí un metal para ver sus barras, armas, armaduras y herramientas.'],
  shrine: ['Hechicería', '✧', 423, 542, 'Ofrecé huesos, recargá Plegaria, creá runas e imbuí bastones.'],
  docks: ['Pesca', '⚓', 179, 531, 'Pescá desde el muelle y llevá lo que saques al Hogar para cocinar.'],
};
const markerOffsets = { mine: [-20, 10], camp: [-17, 8], forge: [-12, 10], docks: [0, 8] };

const skills = {
  attack: ['Ataque', '⚔', 'camp'], strength: ['Fuerza', '✊', 'camp'], defence: ['Defensa', '🛡', 'camp'],
  hitpoints: ['Vida', '♥', 'camp'], ranged: ['Distancia', '🏹', 'camp'], prayer: ['Plegaria', '✦', 'shrine'],
  magic: ['Magia', '✵', 'camp'], runecraft: ['Creación de runas', '💠', 'shrine'],
  fletching: ['Arquería', '➶', 'forest'], slayer: ['Cazador de monstruos', '💀', 'arena'],
  mining: ['Minería', '⛏', 'mine'], smithing: ['Herrería', '⚒', 'forge'],
  fishing: ['Pesca', '🐟', 'docks'], cooking: ['Cocina', '🍳', 'camp'],
  woodcutting: ['Tala', '🪓', 'forest'],
};

const xpAt = [0, 0];
let points = 0;
for (let level = 1; level < 99; level++) {
  points += Math.floor(level + 300 * 2 ** (level / 7));
  xpAt.push(Math.floor(points / 4));
}
const maxXp = 200_000_000;
const fmt = new Intl.NumberFormat('es-AR');
const number = value => fmt.format(value);
const levelFor = xp => xpAt.findLastIndex(threshold => xp >= threshold);
const keys = Object.keys(skills);
const pets = {
  attack: ['Halcón de hierro', '🦅'], strength: ['Oso rojizo', '🐻'], defence: ['Tortuga de piedra', '🐢'],
  hitpoints: ['Conejo del hogar', '🐇'], ranged: ['Zorro arquero', '🦊'], magic: ['Búho astral', '🦉'],
  prayer: ['Paloma del santuario', '🕊'], slayer: ['Lobo del valle', '🐺'], mining: ['Rata dorada', '🐀'],
  woodcutting: ['Ardilla del bosque', '🐿'], fishing: ['Nutria de los muelles', '🦦'],
  smithing: ['Salamandra de bronce', '🦎'], fletching: ['Cuervo emplumado', '🐦‍⬛'],
  runecraft: ['Mariposa lunar', '🦋'], cooking: ['Gato de la cocina', '🐈'],
};
const byId = id => document.getElementById(id);
const legacySaveKey = 'valle-de-bronce-v1';
const rosterKey = 'valle-de-bronce-characters-v1';
// Las partidas anteriores tenían seis tramos. Se insertaron el acero negro (3) y el dragón (7):
// los jefes vencidos se reubican y, si ya pasaste un tramo nuevo intermedio, se da por vencido.
function migrateTiers(progress) {
  if (progress.tierVersion === 8) return false;
  const map = [0, 1, 2, 4, 5, 7];
  const remap = record => Object.fromEntries(Object.entries(record || {}).map(([key, value]) => [map[key] ?? key, value]));
  const victories = remap(progress.victories);
  if (victories[4]) victories[3] ??= 1;
  if (victories[7]) victories[6] ??= 1;
  progress.victories = victories;
  progress.unclaimedBossGem = remap(progress.unclaimedBossGem);
  if (progress.daily) progress.daily.tier = map[progress.daily.tier] ?? progress.daily.tier;
  progress.tierVersion = 8;
  return true;
}
const fresh = () => ({
  tierVersion: 8,
  xp: Object.fromEntries(keys.map(key => [key, key === 'hitpoints' ? xpAt[10] : 0])),
  bag: {}, equipped: {}, bank: {}, notes: {}, rations: [], inventoryLimited: true,
  hp: 10, coins: 0, log: ['Llegaste al Valle. Seguí el objetivo del mapa para forjar tu primer equipo.'],
  victories: {}, projects: {}, prayerPoints: 1, prayerOn: false,
});
function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {}
  return null;
}
function loadRoster() {
  const roster = readStorage(rosterKey);
  if (Array.isArray(roster?.characters)) return roster;
  const progress = readStorage(legacySaveKey);
  if (progress?.xp && progress.bag && progress.equipped && Array.isArray(progress.log)) {
    return { activeId: 'legacy', characters: [{ id: 'legacy', name: 'Aventurero', progress }] };
  }
  return { activeId: null, characters: [] };
}
function findCharacter(roster, id = roster.activeId) {
  return roster.characters.find(entry => entry.id === id);
}
const initialRoster = loadRoster();
let character = findCharacter(initialRoster) || initialRoster.characters[0];
let game = character?.progress ?? fresh();
let savedProgress = JSON.stringify(game);
let zone = 'camp';
let tab = 'map';
let homeInventory = false;
const activityGroups = { camp: 'Cocina', forest: 'Tala', mine: 'Minerales', arena: 'Encargos', shrine: 'Plegaria' };
const recipeCategories = {};
let arenaStyle = 'melee';
let combatTraining = 'attack';
let inventoryFilter = 'all';
let profileView = 'inventory';
let guidedTask;
let questTarget;
let lastQuestStep;
let inspectedItem;
let bankSelection;
let inspectedNote = false;
let packPage = 0;
let focusedSkill;
const zoneGroups = Object.fromEntries(Object.keys(zones).map(id => [
  id, [...new Set(tasks.filter(task => task.zone === id).map(task => task.group))],
]));
zoneGroups.arena = ['Encargos', 'Jefes', 'Maestría', 'Jefe del día'];
zoneGroups.market.push('Equipo');
zoneGroups.camp.unshift('Banco');
const groupLabel = group => group === 'Banco' ? 'Cofre' : group;
zoneGroups.camp.push('Inventario');
const producers = new Map();
for (const task of tasks) {
  for (const item of Object.keys(task.output)) {
    if (!producers.has(item)) producers.set(item, []);
    producers.get(item).push(task);
  }
}
let position = heroSpot('camp');
let saleItem;
let marketStock = 'all';
let destination;
let arrivingZone;
let lastWalkZone = 'camp';
let run;
let session;
let activityTimer;
let noticeTimer;
let recoveryTask;
let homeHealAt;
let homeHealTimer;
let capacityTask;
let packNoticeShown = false;
let packPaused;
const lootTimers = new Map();
const levelTimers = new Map();
let keyboard = new Set();
let levelAudio;
const audioSettingsKey = 'valle-de-bronce-audio';
const audioSettings = readStorage(audioSettingsKey) ?? {};
let musicGain;
function updateMusic() {
  if (audioSettings.music !== true || document.hidden) {
    if (musicGain) musicGain.gain.setTargetAtTime(0, levelAudio.currentTime, .2);
    return;
  }
  if (!window.AudioContext) return;
  try {
    levelAudio ??= new window.AudioContext();
    if (levelAudio.state === 'suspended') levelAudio.resume().catch(() => {});
    if (!musicGain) {
      musicGain = levelAudio.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(levelAudio.destination);
      for (const [index, frequency] of [65.41, 98, 130.81, 196].entries()) {
        const voice = levelAudio.createOscillator();
        const envelope = levelAudio.createGain();
        voice.frequency.value = frequency;
        voice.type = index ? 'sine' : 'triangle';
        envelope.gain.value = .16;
        voice.connect(envelope).connect(musicGain);
        const swell = levelAudio.createOscillator();
        const depth = levelAudio.createGain();
        swell.frequency.value = .045 + index * .013;
        depth.gain.value = .095;
        swell.connect(depth).connect(envelope.gain);
        voice.start();
        swell.start();
      }
    }
    musicGain.gain.setTargetAtTime(.09, levelAudio.currentTime, .5);
  } catch {}
}
const effectsEnabled = () => audioSettings.effects ?? (game.sound !== false);
function saveAudioSettings() {
  try { localStorage.setItem(audioSettingsKey, JSON.stringify(audioSettings)); } catch {}
}
let follower;
let petTrail;
// Mascota quieta: sus cuadros de reposo siguen corriendo despacio aunque el mapa no se redibuje.
setInterval(() => { if (!destination && !keyboard.size && !document.hidden && typeof stepPetWalk === 'function') stepPetWalk(0, 0, .45); }, 450);
let boostUntil = 0;
let boostTimer;
let previousStation;
const lv = key => levelFor(game.xp[key] || 0);
const equippedSlot = name => gear[name]?.slot;
const isEquipped = name => Boolean(equippedSlot(name) && game.equipped[equippedSlot(name)] === name);
const bagCount = name => Math.max(0, (game.bag[name] || 0) - Number(isEquipped(name)));
const bankCount = name => game.bank?.[name] || 0;
const noteCount = name => game.notes?.[name] || 0;
const rationCount = name => game.rations?.find(ration => ration.item === name)?.count || 0;
const carriedStock = item => bagCount(item) + noteCount(item);
const saleStock = item => carriedStock(item) + bankCount(item) + rationCount(item);
const filteredSaleStock = item => ({ bag: carriedStock, bank: bankCount, rations: rationCount }[marketStock] || saleStock)(item);
const coinAmount = Math.round;
const saleTotal = (item, quantity) => Math.max(1, coinAmount(salePrice(item) * quantity));
const rawSalePrices = new Map([
  ['Cobre', 1], ['Estaño', 1], ['Hierro', 2], ['Carbón', 1], ['Plata', 3], ['Oro', 4],
  ['Mithril', 4], ['Adamantita', 5], ['Runita', 6], ['Esencia', .35], ['Pluma', 1], [geode, 5],
  ...woods.map((item, tier) => [item, 2 + tier]),
  ...gems.map((item, tier) => [item, 2 + tier]),
  ...bones.map((item, tier) => [item, 1 + Math.floor(tier / 2)]),
  ...amulets.map((item, tier) => [item, 20 + 10 * tier]),
]);
const salePrices = new Map();
function salePrice(item) {
  if (salePrices.has(item)) return salePrices.get(item);
  const recipes = producers.get(item) || [];
  const raw = recipes.find(task => task.skill === 'fishing');
  let price = rawSalePrices.get(item) ?? (raw ? 1 + bands.indexOf(raw.level) : undefined);
  if (price === undefined) {
    const recipesWithInputs = recipes.filter(task => !task.enemy && task.zone !== 'market' && Object.keys(task.input).length);
    const values = recipesWithInputs.map(task => {
      const materials = Object.entries(task.input).reduce((total, [name, count]) => total + salePrice(name) * count, 0);
      // El trabajo agrega hasta un 20 % al valor de los insumos. Las tandas reparten ese valor.
      const work = Math.max(1, Math.min(Math.floor(task.ticks / 4), Math.floor(materials / 5)));
      return (materials + work) / task.output[item];
    });
    price = values.length ? Math.min(...values) : gear[item] ? 3 + 2 * gear[item].bonus : 1;
  }
  for (const task of recipes.filter(task => task.zone === 'market' && task.cost)) {
    price = Math.min(price, task.cost * .6 / task.output[item]);
  }
  price = Math.max(.01, price);
  salePrices.set(item, price);
  return price;
}
const usesBankMaterials = task => task.zone === 'camp' && task.skill === 'cooking';
const isProvision = task => task.zone === 'market' && task.group === 'Provisiones' && task.cost > 0;
const ingredientStock = (task, item) => carriedStock(item) +
  (usesBankMaterials(task) ? bankCount(item) : 0);
function inputParts(task, item) {
  const required = task.input[item] ?? 0;
  const bag = Math.min(bagCount(item), required);
  const notes = Math.min(noteCount(item), required - bag);
  return { bag, notes, bank: required - bag - notes };
}
const bagLimit = 28;
const stackable = new Set([...arrows, ...runes, ...metals.map(metal => tipsOf(metal.name)), 'Pluma']);
const slotsFor = (item, count) => stackable.has(item) ? Number(count > 0) : count;
const bagSlots = () => Object.keys(game.bag).reduce((sum, item) => sum + slotsFor(item, bagCount(item)), 0) +
  Object.values(game.notes ?? {}).filter(count => count > 0).length;
const freeFor = item => stackable.has(item) && bagCount(item) ? Infinity : Math.max(0, bagLimit - bagSlots());
function fitsOutput(task, output = task.output) {
  let slotsUsed = bagSlots();
  for (const item of new Set([...Object.keys(task.input), ...Object.keys(output)])) {
    const count = bagCount(item);
    const parts = inputParts(task, item);
    const produced = food[item] && !game.rationIgnored?.[item] ? 0 : (output[item] || 0);
    slotsUsed += slotsFor(item, count - parts.bag + produced) - slotsFor(item, count);
    if (parts.notes && parts.notes === noteCount(item)) slotsUsed--;
  }
  return slotsUsed <= bagLimit;
}
function upgradeInventory() {
  if (game.inventoryLimited) return false;
  game.bank ??= {};
  game.rations ??= [];
  if (food[game.autoFood] && bagCount(game.autoFood)) {
    const item = game.autoFood;
    game.rations.push({ item, count: bagCount(item) });
    game.bag[item] -= bagCount(item);
  }
  delete game.autoFood;
  let left = bagLimit;
  for (const item of Object.keys(game.bag)) {
    const count = bagCount(item);
    const keep = stackable.has(item) && left ? count : Math.min(left, count);
    left -= slotsFor(item, keep);
    const surplus = count - keep;
    if (!surplus) continue;
    game.bag[item] -= surplus;
    game.bank[item] = (game.bank[item] || 0) + surplus;
  }
  game.inventoryLimited = true;
  return true;
}
const totalLevel = progress => keys.reduce((total, key) => total + levelFor(progress.xp[key] || 0), 0);
const prayerPoints = () => game.prayerPoints ?? lv('prayer');
const meetsEquipLevel = entry => lv(entry.skill) >= entry.level;
const bonusOf = slot => {
  const entry = gear[game.equipped[slot]];
  if (entry && (slot === 'pick' || slot === 'axe') && !meetsEquipLevel(entry)) return 0;
  return entry?.bonus || 0;
};
const protection = () => armorSlots.reduce((sum, slot) => sum + bonusOf(slot), 0);
const prayerBonus = () => game.prayerOn && prayerPoints() > 0 && lv('prayer') >= 5 ? 2 + Math.floor(lv('prayer') / 15) : 0;
const restGain = () => (1 + Math.floor(lv('hitpoints') / 30) + Number(Boolean(game.projects?.inn))) * (game.projects?.outpost ? 2 : 1);
const homeHealInterval = 600;
const tonicCharges = item => 5 + 5 * tonics[item];
const speedSkills = ['mining', 'woodcutting', 'fishing', 'smithing', 'fletching', 'runecraft', 'cooking'];
const levelBonus = (task, level = lv(task.skill)) => {
  const extra = speedSkills.includes(task.skill) ? Math.max(0, level - task.level) : 0;
  return { speed: Math.min(.30, extra * .01), double: Math.min(.15, extra * .004) };
};
const everyFive = level => Math.floor(level / 5);
const tierOf = task => bands.findLastIndex(level => level <= task.level);
const toolSlot = task => task.skill === 'mining' ? 'pick' : 'axe';
const requiredTool = task => task.toolTier ? pieceName(toolSlot(task) === 'pick' ? 'Pico' : 'Hacha', metals[task.toolTier - 1].name) : '';
const lacksTool = task => Boolean(task.toolTier && bonusOf(toolSlot(task)) < task.toolTier);
const openTier = () => bosses.findIndex((_, tier) => !game.victories?.[tier]);
const trophyCount = () => trophies.filter(item => game.finds?.[item]).length;
const xpBoost = () => 1 + trophyCount() * .05 + (game.projects?.banner ? .1 : 0);
const boostActive = (at = performance.now()) => boostUntil > at;
const boostRate = (at = performance.now()) => boostActive(at) ? 2 : 1;
const percent = chance => number(Math.round(chance * 1000) / 10) + '%';
const rarity = (level, unlock = 1) => 1 + (level - unlock) / 100;
const repeatBoss = task => task.boss !== undefined && game.victories?.[task.boss];
const trainXp = task => Math.max(1, Math.round((task.trainXp ?? 0) / (repeatBoss(task) ? 4 : 1)));
const hitpointsXp = task => Math.max(1, Math.round(trainXp(task) / 3));
const taskXp = task => task.boss !== undefined && game.victories?.[task.boss] ? Math.max(1, Math.round(task.xp / 4)) : task.xp;
const taskGold = task => task.boss !== undefined && game.victories?.[task.boss] ? Math.floor(task.gold / 5) :
  task.gold + (task.group === 'Encargos' ? everyFive(lv('slayer')) : 0);
const oreTask = task => task.skill === 'mining' && task.group === 'Minerales';
const gemChance = level => rarity(level) / 36;
const geodeChance = level => level < 25 ? 0 : rarity(level, 25) * (level >= 45 ? 2 : 1) / 1000;
function localDay() {
  const date = new Date();
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
function dailyTier() {
  const day = localDay();
  if (game.daily?.day === day) return game.daily.tier;
  const unlocked = bosses.map((_, tier) => tier).filter(tier => game.victories?.[tier]);
  return unlocked.length ? unlocked[day % unlocked.length] : 0;
}
function writeRoster(roster) {
  try {
    localStorage.setItem(rosterKey, JSON.stringify(roster));
    byId('save-status').textContent = 'Partida guardada en este navegador';
    return true;
  } catch {
    byId('save-status').textContent = 'El navegador no pudo guardar la partida';
    return false;
  }
}
let lastSaveAt = 0;
function save() {
  if (!character) return false;
  const roster = loadRoster();
  const entry = findCharacter(roster, character.id);
  // Read the latest roster so another tab's changes to other characters survive.
  if (!entry || JSON.stringify(entry.progress) !== savedProgress) {
    syncCharacters(roster);
    return false;
  }
  if (run) {
    const now = packPaused?.activity === run ? packPaused.now : performance.now();
    game.work = { task: run.task.name, at: Date.now(), remaining: Math.max(0, run.nextAt - now) };
    if (run.fight) game.work.fight = { ...run.fight, duration: run.duration };
    if (run.task.daily !== undefined) game.work.day = localDay();
    if (run.goal) game.work.goal = run.goal;
  } else {
    delete game.work;
  }
  entry.progress = game;
  if (!writeRoster(roster)) return false;
  savedProgress = JSON.stringify(game);
  lastSaveAt = performance.now();
  return true;
}
function combatLevel() {
  const base = (lv('hitpoints') + lv('defence') + Math.floor(lv('prayer') / 2)) / 4;
  return Math.floor(base + .325 * Math.max(lv('attack') + lv('strength'), Math.floor(lv('ranged') * 1.5), Math.floor(lv('magic') * 1.5)));
}
function log(message) {
  game.log.unshift(message);
  game.log.length = Math.min(game.log.length, 50);
}
function notify(message) {
  if (document.hidden) return;
  byId('notice').textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { byId('notice').textContent = ''; }, 3100);
}
function showLoot(items, rareItems) {
  if (document.hidden) return;
  const feed = byId('loot-feed');
  for (const [item, quantity] of Object.entries(items)) {
    const previous = lootTimers.get(item);
    if (previous) {
      clearTimeout(previous.timer);
      previous.element.remove();
      lootTimers.delete(item);
    }
    if (lootTimers.size >= 4) {
      const [old, entry] = lootTimers.entries().next().value;
      clearTimeout(entry.timer);
      entry.element.remove();
      lootTimers.delete(old);
    }
    const card = document.createElement('div');
    card.className = 'loot-toast';
    if (rareItems.has(item)) card.classList.add('rare-loot');
    const icon = document.createElement('span');
    icon.className = 'loot-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = itemIcon(item);
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = '+' + number(quantity) + ' ' + item;
    const count = document.createElement('small');
    count.textContent = stockText(item);
    text.append(title, count);
    card.append(icon, text);
    feed.append(card);
    const timer = setTimeout(() => {
      card.remove();
      lootTimers.delete(item);
    }, 4200);
    lootTimers.set(item, { element: card, timer });
  }
}
function xpPercent(key) {
  const level = lv(key);
  return level === 99 ? 100 : 100 * ((game.xp[key] || 0) - xpAt[level]) / (xpAt[level + 1] - xpAt[level]);
}
function prepareAudio() {
  updateMusic();
  if (!effectsEnabled() || !window.AudioContext) return;
  try {
    levelAudio ??= new window.AudioContext();
    if (levelAudio.state === 'suspended') levelAudio.resume().catch(() => {});
  } catch {}
}
function celebrate(special = false) {
  if (document.hidden) return;
  const burst = document.createElement('span');
  burst.className = 'level-burst';
  if (special) burst.classList.add('firework');
  burst.style.left = position.x / 10 + '%';
  burst.style.top = position.y / 6.3 + '%';
  burst.textContent = special ? '✦ ✧ ✷ ✧ ✦' : '✦ ✧ ✦';
  byId('floating').append(burst);
  setTimeout(() => burst.remove(), 1300);
  if (!effectsEnabled() || !levelAudio) return;
  try {
    const now = levelAudio.currentTime;
    for (const [index, pitch] of [523.25, 659.25, 783.99].entries()) {
      const note = levelAudio.createOscillator();
      const gain = levelAudio.createGain();
      const start = now + index * .065;
      note.frequency.value = pitch;
      gain.gain.setValueAtTime(.035, start);
      gain.gain.exponentialRampToValueAtTime(.001, start + .17);
      note.connect(gain).connect(levelAudio.destination);
      note.start(start);
      note.stop(start + .18);
    }
  } catch {}
}
const levelEffects = {
  attack: 'Cada nivel: más precisión con espada.',
  strength: 'Cada nivel: +0,2 de potencia con espada.',
  defence: 'Cada nivel: +0,2 de protección.',
  hitpoints: 'Cada nivel: +1 de vida máxima.',
  ranged: 'Cada nivel: más precisión y +0,2 de potencia con arco.',
  magic: 'Cada nivel: más precisión y +0,2 de potencia mágica.',
  prayer: 'Cada nivel: +1 carga. Protección desde el nivel 5.',
  slayer: 'Abre nuevos encargos. Más monedas cada 5 niveles.',
};
function unlocksFor(skill) {
  const unlocks = skill === 'mining' ? [...miningMilestones] : [];
  for (const task of tasks) {
    const level = task.skill === skill ? task.level : task.requires[skill];
    if (task.xp && level > 1) unlocks.push({ level, name: task.name, id: task.id });
    for (const item of Object.keys(task.output)) {
      const entry = gear[item];
      if (entry?.skill === skill && entry.level > 1) {
        unlocks.push({ level: entry.level, name: 'Equipar ' + item.toLowerCase(), id: task.id });
      }
    }
  }
  return unlocks.sort((a, b) => a.level - b.level);
}
function levelChanges(key, before, level) {
  const changes = [];
  if (speedSkills.includes(key)) {
    const task = run?.task;
    if (task?.skill === key) {
      const old = levelBonus(task, before);
      const bonus = levelBonus(task, level);
      if (bonus.speed > old.speed) changes.push('Velocidad +' + percent(bonus.speed - old.speed));
      if (bonus.double > old.double) changes.push('Doble producto +' + percent(bonus.double - old.double));
    }
    if (!changes.length && (!game.pets?.[key] || key === 'mining')) {
      changes.push('Mejores probabilidades de hallazgos');
    }
  } else {
    const gain = number(Math.round((level - before) * 2) / 10);
    if (['attack', 'ranged', 'magic'].includes(key)) changes.push('Más precisión');
    if (['strength', 'ranged', 'magic'].includes(key)) changes.push('Potencia +' + gain);
    if (key === 'defence') changes.push('Protección +' + gain);
    if (key === 'slayer' && everyFive(level) > everyFive(before)) changes.push('Más monedas por encargo');
    if (key === 'hitpoints') changes.push('+' + (level - before) + ' de vida máxima');
    if (key === 'prayer') changes.push('+' + (level - before) + ' cargas de Plegaria');
  }
  const unlocked = unlocksFor(key).filter(entry => entry.level > before && entry.level <= level);
  for (const entry of unlocked.slice(0, 2)) changes.push(entry.name);
  if (unlocked.length > 2) changes.push('+' + (unlocked.length - 2) + ' desbloqueos');
  if (level === 99) changes.push('Capa de maestría equipada');
  return changes;
}
function showLevel(key, level, changes, special) {
  if (document.hidden) return;
  const previous = levelTimers.get(key);
  if (previous) {
    clearTimeout(previous.timer);
    previous.card.remove();
  }
  const card = document.createElement('article');
  card.className = 'level-card';
  card.title = changes.join(' · ');
  if (special) card.classList.add('level-special');
  // Medallón con el oficio, el número grande y lo que desbloquea: un momento, no un aviso más.
  card.innerHTML = '<span class="level-medal" aria-hidden="true">' + skillIcon(key) + '</span><div class="level-text"><small>' +
    (special ? 'Hito alcanzado' : 'Nuevo nivel') + '</small><strong><span></span><b>' + level + '</b></strong><p></p></div>';
  card.querySelector('strong span').textContent = skills[key][0];
  const detail = card.querySelector('p');
  detail.textContent = changes.join(' · ');
  detail.hidden = !changes.length;
  byId('level-feed').prepend(card);
  const timer = setTimeout(() => {
    card.remove();
    levelTimers.delete(key);
  }, 4000);
  levelTimers.set(key, { card, timer });
}
function grant(key, amount) {
  if (!key) return;
  const before = lv(key);
  game.xp[key] = Math.min(maxXp, (game.xp[key] || 0) + Math.round(amount * xpBoost()));
  const level = lv(key);
  if (level > before) {
    if (key === 'hitpoints') game.hp += level - before;
    if (key === 'prayer') game.prayerPoints = (game.prayerPoints ?? before) + level - before;
    if (level === 99) game.cape = key;
    const message = skills[key][0] + ' subió al nivel ' + level + (level === 99 ? ' · Capa de maestría desbloqueada.' : '.');
    log(message);
    const special = level === 99 || before < 50 && level >= 50;
    showLevel(key, level, levelChanges(key, before, level), special);
    celebrate(special);
  }
}
function rollPet(task) {
  const skill = task.skill;
  if (!task.xp || !pets[skill] || game.pets?.[skill] || Math.random() >= rarity(lv(skill)) / 5000) return;
  game.pets ??= {};
  game.pets[skill] = true;
  game.pet ??= skill;
  log('Encontraste una mascota · ' + pets[skill][0]);
  notify('¡Mascota descubierta! ' + pets[skill][0]);
  celebrate(true);
}
const itemText = items => Object.entries(items).map(([name, quantity]) => quantity + ' × ' + name).join(', ');
function combatPlayer(task) {
  const melee = task.style === 'melee';
  const leather = task.style === 'ranged' ? armorSlots.reduce((sum, slot) => sum + (gear[game.equipped[slot]]?.ranged || 0), 0) : 0;
  return {
    accuracyLevel: lv(melee ? 'attack' : task.style),
    powerLevel: lv(melee ? 'strength' : task.style),
    defenceLevel: lv('defence'),
    weapon: bonusOf(combatSlots[task.style]),
    accuracyBonus: leather,
    neck: bonusOf('neck'),
    protection: protection(),
    prayer: prayerBonus(),
    tonic: game.tonic?.charges ? game.tonic.bonus : 0,
  };
}
const enrageFor = task => task.boss !== undefined || task.challenge ? enrageRound : Infinity;
// Perfil de la pelea con tu equipo actual y valores esperados para el HUD.
function battle(task, enraged = false) {
  const profile = combatProfile(combatPlayer(task), task.enemy, { weakness: task.style === task.enemy.weak, enraged });
  const { dealt, taken } = expectedRound(profile);
  const rounds = Math.max(1, task.enemy.hp / dealt);
  return { ...profile, rounds, damage: Math.round(taken * rounds) };
}
// Vista previa: simula 300 peleas con tu vida, tu equipo y tus raciones de ahora. Se recalcula solo si algo cambia.
const forecastCache = new Map();
function cachedForecast(key, calculate) {
  if (forecastCache.has(key)) return forecastCache.get(key);
  if (forecastCache.size >= 240) forecastCache.delete(forecastCache.keys().next().value);
  const result = calculate();
  forecastCache.set(key, result);
  return result;
}
function forecast(task, hp = game.hp) {
  const player = combatPlayer(task);
  const maxHp = lv('hitpoints');
  // Una pelea simulada dura hasta 300 rondas y solo consume una porción por ronda.
  let remaining = 300;
  const rations = [];
  for (const { item, count } of game.rations || []) {
    if (!remaining) break;
    const used = Math.min(remaining, count);
    rations.push({ heal: food[item], count: used });
    remaining -= used;
  }
  const key = JSON.stringify([task.id, hp, maxHp, player, rations]);
  return cachedForecast(key, () => forecastFight({ player, enemy: task.enemy, weakness: task.style === task.enemy.weak,
    enrageAt: enrageFor(task), hp, maxHp, rations, seed: task.id * 7919 + 13 }));
}
function taskDuration(task, includeLevel = true) {
  if (task.enemy) return (task.ticks + roundTicks * battle(task).rounds) * 600;
  const ticks = task.ticks;
  const tool = task.skill === 'mining' ? bonusOf('pick') : task.skill === 'woodcutting' ? bonusOf('axe') : 0;
  const project = task.zone === 'forge' ? 'forge' : task.zone === 'docks' ? 'dock' :
    task.skill === 'cooking' ? 'camp' : '';
  const sharpening = tool && game.projects?.tools ? .1 : 0;
  const speed = 1 + tool * .08 + sharpening + (includeLevel ? levelBonus(task).speed : 0) + (game.projects?.[project] ? .18 : 0);
  return Math.max(1, ticks / speed) * 600;
}
function equipRequirement(item) {
  const entry = gear[item];
  return entry?.level > 1 ? skills[entry.skill][0] + ' ' + entry.level : '';
}
function restriction(task) {
  if (task.daily !== undefined) {
    if (!game.victories?.[0]) return 'Derrotá primero al Rey de las ratas';
    if (game.daily?.day === localDay()) return 'Ya cobraste el desafío de hoy';
    if (task.daily !== dailyTier()) return 'Este visitante ya se fue';
  }
  if (task.boss === undefined && task.skill && lv(task.skill) < task.level) return 'Nivel ' + task.level + ' de ' + skills[task.skill][0];
  if (lacksTool(task)) return 'Equipá ' + requiredTool(task).toLowerCase() + ' o mejor';
  for (const [skill, level] of Object.entries(task.requires)) {
    if (lv(skill) < level) return 'Nivel ' + level + ' de ' + skills[skill][0];
  }
  if (task.project && game.projects?.[task.project.id]) return 'Mejora construida';
  if (task.challenge && !game.victories?.[bosses.length - 1]) return 'Derrotá al Corazón del Valle';
  if (task.minProtection && protection() < task.minProtection) return 'Equipá Protección +' + task.minProtection;
  if (task.minWeapon && bonusOf(combatSlots[task.style]) < task.minWeapon) return 'Equipá un arma del estilo ' + combatLabels[task.style];
  if (task.cost > game.coins) return 'Te faltan monedas';
  const missing = Object.fromEntries(Object.entries(task.input).map(([item, count]) =>
    [item, count - ingredientStock(task, item)])
    .filter(([, deficit]) => deficit > 0));
  if (Object.keys(missing).length) return (Object.values(missing).reduce((sum, quantity) => sum + quantity, 0) === 1 ?
    'Falta ' : 'Faltan ') + itemText(missing);
  if (task.effect === 'prayer' && prayerPoints() === lv('prayer')) return 'Plegaria completa';
  if (bagBlocks(task) && (game.spill || 0) >= spillLimit) return packLimitReason;
  return '';
}
// Con la mochila llena se sigue ganando XP sin recibir el producto, con un aviso para ir al cofre.
// El margen es de una mochila más (28 acciones): después la actividad se frena, para que no haya XP infinita sin atender.
// La Cocina es la excepción buscada: guarda la comida en las raciones y usa los ingredientes del cofre.
const spillLimit = 28;
const packLimitReason = 'Mochila llena · depositá en el Cofre del Hogar';
const bagBlocks = task => !task.enemy && !task.effect && !task.project && !isProvision(task) && !usesBankMaterials(task) &&
  Object.keys(activityOutput(task)).length > 0 && !fitsOutput(task, activityOutput(task));
function floatXp(task, xp, skill = task.skill, row = 0) {
  const badge = document.createElement('span');
  const spot = heroSpot(task.zone);
  badge.className = 'xp-float';
  badge.style.left = spot.x / 10 + '%';
  badge.style.setProperty('--xp-row', row);
  badge.style.top = spot.y / 6.3 + '%';
  badge.innerHTML = skillIcon(skill) + '<b>+' + number(xp) + '<small> XP</small></b>';
  badge.title = skills[skill][0];
  byId('floating').append(badge);
  setTimeout(() => badge.remove(), 1400);
}
function applyFood(item) {
  game.hp = Math.min(lv('hitpoints'), game.hp + food[item]);
  if (tonics[item]) game.tonic = { bonus: tonics[item], charges: tonicCharges(item) };
}
function eatRation(item) {
  const ration = item ? game.rations.find(entry => entry.item === item) : game.rations[0];
  if (!ration || game.hp >= lv('hitpoints') && !tonics[ration.item]) return false;
  applyFood(ration.item);
  if (--ration.count === 0) game.rations = game.rations.filter(entry => entry !== ration);
  log('Comiste ' + ration.item);
  return true;
}
function activityOutput(task) {
  const output = { ...task.output };
  if (task.boss !== undefined && game.victories?.[task.boss] && !game.unclaimedBossGem?.[task.boss]) delete output[gems[task.boss]];
  return output;
}
function rollOutput(task, rareItems) {
  let output = activityOutput(task);
  const double = levelBonus(task).double;
  if (double && Math.random() < double) {
    const doubled = Object.fromEntries(Object.entries(output).map(([item, quantity]) => [item, quantity * 2]));
    if (fitsOutput(task, doubled)) output = doubled;
  }
  if (oreTask(task)) {
    const level = lv('mining');
    const gem = gems[Math.min(tierOf(task), bands.findLastIndex(band => band <= level))];
    for (const [item, chance] of [[gem, gemChance(level)], [geode, geodeChance(level)]]) {
      const extra = { ...output, [item]: (output[item] || 0) + 1 };
      if (!chance || !fitsOutput(task, extra) || Math.random() >= chance) continue;
      output = extra;
      rareItems.add(item);
      log('Hallazgo raro · ' + item);
      celebrate(true);
    }
  }
  for (const drop of task.drops || []) {
    const [first] = Object.keys(drop.items);
    if (drop.once && game.finds?.[first] || Math.random() >= drop.chance) continue;
    if (trophies.includes(first)) {
      game.finds ??= {};
      game.finds[first] = true;
      log('Trofeo de jefe · ' + first + ' · +5 % de XP permanente');
      notify('¡Trofeo! ' + first + ' · +5 % de XP para siempre · está en Colección');
      celebrate(true);
      continue;
    }
    const extra = { ...output };
    for (const [item, count] of Object.entries(drop.items)) extra[item] = (extra[item] || 0) + count;
    if (!fitsOutput(task, extra)) continue;
    output = extra;
    if (drop.rare) {
      game.finds ??= {};
      game.finds[first] = true;
      rareItems.add(first);
      log('Botín raro · ' + first);
      notify('¡Botín raro! ' + first);
      celebrate(true);
    }
  }
  return output;
}
const walkPace = () => 300 * walkBoost() * (game.projects?.mule && bagSlots() ? 1.25 : 1);
const roundMs = roundTicks * 600;
const setupMs = task => task.ticks * 600;
const actionDuration = (task, round = false, at = performance.now()) =>
  (round ? roundMs : task.enemy ? setupMs(task) : taskDuration(task)) / boostRate(at);
function retimeAction(scale, at) {
  if (!run) return;
  const start = run.nextAt - run.duration;
  const pivot = Math.max(start, packPaused?.activity === run ? packPaused.now : at);
  run.duration *= scale;
  run.nextAt = pivot + Math.max(0, run.nextAt - pivot) * scale;
  scheduleActivity();
}
function activateActionBoost() {
  const now = performance.now();
  const alreadyActive = boostActive(now);
  boostUntil = now + 25000;
  if (!alreadyActive) retimeAction(.5, now);
  clearTimeout(boostTimer);
  const expires = boostUntil;
  boostTimer = setTimeout(() => {
    if (boostUntil !== expires) return;
    advanceActivity(expires);
    // Si el próximo tramo empezó después del vencimiento, ya tiene su duración normal.
    if (run && run.nextAt - run.duration < expires) retimeAction(2, expires);
    boostUntil = 0;
    render();
  }, Math.max(0, expires - performance.now()));
}
function combatDeadline(activity) {
  return activity.nextAt;
}
// Un encargo sin comida no se empieza ni se sigue con la vida al borde.
const foodReserve = () => (game.rations || []).reduce((sum, ration) => sum + ration.count * (food[ration.item] || 0), 0);
const lowForContract = task => {
  if (!task.enemy || task.boss !== undefined || task.challenge || task.daily !== undefined || game.hp >= lv('hitpoints')) return false;
  // Solo con muy poca vida de verdad: cuando un golpe máximo del rival te podría tumbar (o te queda ~5 % de la vida
  // máxima, mínimo 1). Antes se medía contra el daño de toda la pelea y el aviso salía demasiado seguido.
  const reserve = game.hp + foodReserve();
  return reserve <= Math.max(battle(task).foeMaxHit, Math.max(1, Math.round(lv('hitpoints') * .05)));
};
// Al ponerse al día después de una pausa larga no se dibujan los golpes atrasados.
let replaying = false;
function heroPop(task, text, className, dx = 0, dy = 0) {
  if (document.hidden || replaying) return;
  const spot = heroSpot(task.zone);
  scenePop(text, spot.x + dx, spot.y + dy, className);
}
// Al perder o retirarse de una pelea, el personaje deja la actividad y camina al Hogar a recuperarse.
function walkHomeAfterFight() {
  stop(false);
  zone = 'camp';
  lastWalkZone = 'camp';
  keyboard.clear();
  arrivingZone = undefined;
  walkTo('camp');
}
// Una ronda de pelea. Devuelve 'win', 'loss' u 'ongoing'.
function fightRound(activity) {
  const task = activity.task;
  const state = activity.fight ??= { round: 0, foeHp: task.enemy.hp, foeMax: task.enemy.hp, bites: 0, taken: 0, dealt: 0 };
  state.round++;
  const profile = battle(task, state.round >= enrageFor(task));
  if (state.round === enrageFor(task)) {
    heroPop(task, '¡Furia!', 'pop-rage', 52, -60);
    log(task.enemy.name + ' se enfurece');
  }
  const maxHp = lv('hitpoints');
  let ate = false;
  if (game.rations?.length && game.hp <= eatThreshold(maxHp, profile.foeMaxHit) && game.hp < maxHp) {
    ate = eatRation();
    if (ate) {
      state.bites++;
      heroPop(task, 'Comiste', 'pop-heal', 0, -57);
    }
  }
  sceneStrike(task, ate);
  if (!ate) {
    if (Math.random() < profile.accuracy) {
      const hit = 1 + Math.floor(Math.random() * profile.maxHit);
      state.foeHp -= hit;
      state.dealt += hit;
      heroPop(task, String(hit), hit === profile.maxHit ? 'pop-hit pop-max' : 'pop-hit', 52, -34);
    } else {
      heroPop(task, '0', 'pop-hit pop-miss', 52, -34);
    }
    if (state.foeHp <= 0) return 'win';
  }
  if (Math.random() < profile.foeAccuracy) {
    const hit = 1 + Math.floor(Math.random() * profile.foeMaxHit);
    state.taken += hit;
    heroPop(task, '−' + hit, hit === profile.foeMaxHit ? 'pop-hurt pop-max' : 'pop-hurt', -20, -21);
    if (game.hp <= hit) {
      consumeInputs(task, true);
      game.hp = 1;
      recoveryTask = task;
      if (task.boss !== undefined) {
        game.bossLosses ??= {};
        game.bossLosses[task.boss] = (game.bossLosses[task.boss] || 0) + 1;
      }
      log('Derrota ante ' + task.enemy.name + ' · Volviste al Hogar.');
      notify('Derrota · Volvés al Hogar para recuperarte');
      showFightResult(task, state, false);
      walkHomeAfterFight();
      if (!document.hidden) showView('map');
      return 'loss';
    }
    game.hp -= hit;
  } else {
    heroPop(task, '0', 'pop-hurt pop-miss', -20, -21);
  }
  return 'ongoing';
}
// Cartel de resultado al terminar una pelea contra un jefe, para que la victoria o la derrota no se confundan.
function showFightResult(task, state, won) {
  if (task.boss === undefined && !task.challenge && task.daily === undefined || replaying || document.hidden) return;
  const card = byId('fight-result');
  card.className = 'fight-result frame ' + (won ? 'won' : 'lost');
  card.innerHTML = '<span class="fr-art">' + enemyArt(task) + '</span><div><small>' + (won ? 'VICTORIA' : 'DERROTA') + '</small><strong>' +
    task.enemy.name + '</strong><p>' + state.round + ' rondas · ' + state.bites + (state.bites === 1 ? ' comida' : ' comidas') +
    ' · recibiste ' + state.taken + ' de daño</p>' + (won ? '' : '<p class="fr-tip">' + (task.enemy.threat ||
    'Mejorá tu armadura o llevá comida del tramo.') + '</p>') + '</div><button type="button" class="alert-close" data-dismiss="fight-result" aria-label="Cerrar" title="Cerrar">' + icon('close') + '</button>';
  card.hidden = false;
  clearTimeout(card.timer);
  card.timer = setTimeout(() => { card.hidden = true; }, 7000);
}
function complete(task, rareItems, fight) {
  if (task.effect === 'prayer') {
    game.prayerPoints = lv('prayer');
    game.prayerHalf = false;
    log('Recargaste tus puntos de Plegaria en el santuario.');
    notify('Plegaria recargada');
    stop(false);
  } else {
    const outputFits = fitsOutput(task, activityOutput(task));
    const output = outputFits ? rollOutput(task, rareItems) : {};
    if (!outputFits) {
      capacityTask = task;
      if (bagBlocks(task)) game.spill = (game.spill || 0) + 1;
    } else game.spill = 0;
    consumeInputs(task);
    for (const [item, count] of Object.entries(output)) game.bag[item] = (game.bag[item] || 0) + count;
    const gold = taskGold(task);
    game.coins = coinAmount(game.coins + gold - (task.cost || 0));
    const xp = taskXp(task);
    grant(task.skill, xp);
    if (fight) {
      if (prayerBonus()) {
        if (game.prayerHalf) game.prayerPoints = prayerPoints() - 1;
        game.prayerHalf = !game.prayerHalf;
        if (game.prayerPoints === 0) game.prayerOn = false;
      }
      if (game.tonic?.charges) game.tonic.charges--;
      grant('hitpoints', hitpointsXp(task));
      if (task.skill === 'slayer') {
        const trained = task.train || (task.style === 'melee' ? 'attack' : task.style);
        grant(trained, trainXp(task));
      }
      if (task.boss !== undefined) {
        game.victories ??= {};
        if (task.boss === 0 && !game.victories[0]) game.questCollapsed = true;
        game.unclaimedBossGem ??= {};
        if (!outputFits && activityOutput(task)[gems[task.boss]]) game.unclaimedBossGem[task.boss] = true;
        if (output[gems[task.boss]]) delete game.unclaimedBossGem[task.boss];
        if (!game.victories[task.boss]) notify('Derrotaste a ' + task.enemy.name);
        showFightResult(task, fight, true);
        game.victories[task.boss] = (game.victories[task.boss] || 0) + 1;
        // Historial del jefe: la pelea más corta (en rondas) se guarda para mostrarla en su tarjeta.
        game.bossBest ??= {};
        if (fight?.round && (!game.bossBest[task.boss] || fight.round < game.bossBest[task.boss])) game.bossBest[task.boss] = fight.round;
        stop(false);
      }
      if (task.daily !== undefined) {
        game.daily = { day: localDay(), tier: task.daily };
        notify('Jefe del día derrotado');
      }
    }
    if (task.project) {
      game.projects ??= {};
      game.projects[task.project.id] = true;
      notify(task.project.title + ' · Obra terminada');
    }
    autoEquipFood();
    log([task.name, xp ? '+' + xp + ' XP' : '', fight ? '−' + fight.taken + ' vida' + (fight.bites ? ' · ' + fight.bites + ' comidas' : '') : '',
      gold ? '+' + gold + ' monedas' : ''].filter(Boolean).join(' · '));
    rollPet(task);
    return output;
  }
  return {};
}
function stop(update = true) {
  clearTimeout(activityTimer);
  run = undefined;
  requestSceneFrame();
  if (update) renderActions();
}
function stopActivity() {
  setBattleCamera(false, true);
  const active = run;
  advanceActivity();
  if (!active || run !== active) return;
  stop();
  save();
}
function productionGoal(task, item, qty) {
  if (Object.hasOwn(task.output, item) && Number.isSafeInteger(qty) && qty > 0) return { item, qty };
}
function advanceActivity(now = performance.now(), report) {
  if (!run || packPaused?.activity === run || now < combatDeadline(run)) return false;

  const progress = game;
  const { task, goal } = run;
  const activity = run;
  const bitesBefore = run.fight?.bites ?? 0;
  const previousWins = task.boss === undefined ? 0 : game.victories?.[task.boss] || 0;
  const previousXp = { ...game.xp };
  const items = {};
  const rareItems = new Set();
  let reason = restriction(task);
  let cycles = 0;
  // Keep the original deadlines when the browser delays a background timer.
  while (run && now >= combatDeadline(run) && !reason) {
    if (task.enemy) {
      replaying = now - run.nextAt > 2 * roundMs;
      const outcome = fightRound(run);
      replaying = false;
      if (outcome === 'loss') break;
      if (outcome === 'ongoing') {
        run.duration = actionDuration(task, true, run.nextAt);
        run.nextAt += run.duration;
        continue;
      }
    }
    if (!report && session) session.elapsed += task.enemy ? setupMs(task) + run.fight.round * roundMs : run.duration;
    const output = complete(task, rareItems, run.fight);
    for (const [item, count] of Object.entries(output)) items[item] = (items[item] || 0) + count;
    cycles++;
    if (goal && stockForGoal(goal.item) >= goal.qty) {
      stop(false);
    }
    // Entre peleas de encargo: sin comida y con la vida en el umbral, el personaje se retira solo en lugar de morir.
    if (run && lowForContract(task)) {
      log('Vida baja · te retirás de ' + task.enemy.name + ' al Hogar.');
      notify('Vida baja · Volvés al Hogar a recuperarte');
      walkHomeAfterFight();
      break;
    }
    if (run) {
      reason = restriction(task);
      delete run.fight;
      run.duration = actionDuration(task, false, run.nextAt);
      run.nextAt += run.duration;
    }
  }
  if (reason) {
    stop(false);
    log(task.name + ' se detuvo · ' + reason);
    if (reason !== packLimitReason) notify(reason);
  }
  const trainedSkill = task.enemy ? task.train || (task.style === 'melee' ? 'attack' : task.style) : task.skill;
  const earnedXp = (game.xp[trainedSkill] || 0) - (previousXp[trainedSkill] || 0);
  if (report) Object.assign(report, { cycles, reason, items, stored: 0 });
  else if (session) {
    session.xp += earnedXp;
    session.items += Object.values(items).reduce((sum, count) => sum + count, 0);
  }
  // Una ronda suelta de pelea no se guarda: se guarda al terminar la pelea, al salir o cada pocos segundos.
  if (cycles || reason || !task.enemy || performance.now() - lastSaveAt > 5000) save();
  if (!report && !document.hidden && game === progress) {
    if (task.enemy && run === activity && !cycles && bitesBefore === run.fight?.bites) {
      renderHealth();
      renderRecovery();
      if (tab === 'skills' && zone === 'arena') {
        renderSupplies();
        const selected = tasks[guidedTask];
        if (selected?.enemy && selected.zone === zone) renderRecipe(selected);
      }
      return true;
    }
    const trained = [trainedSkill, task.skill, ...(task.enemy ? ['hitpoints'] : [])].filter(Boolean);
    let drop = 0;
    for (const skill of new Set(trained)) {
      const gained = (game.xp[skill] || 0) - (previousXp[skill] || 0);
      if (gained > 0) floatXp(task, gained, skill, drop++);
    }
    const gained = earnedXp;
    if (gained && run?.task === task) {
      const counter = byId('run-xp-gain');
      const gain = document.createElement('b');
      gain.id = counter.id;
      gain.textContent = '+' + number(gained) + ' XP';
      counter.replaceWith(gain);
      setTimeout(() => { gain.textContent = ''; }, 1700);
    }
    if (cycles && (task.boss === undefined || (game.victories?.[task.boss] || 0) > previousWins)) sceneCycle(task, items);
    showLoot(items, rareItems);
    render();
  }
  return true;
}
function scheduleActivity() {
  clearTimeout(activityTimer);
  syncCycleHud();
  if (!run || packPaused?.activity === run) return;
  activityTimer = setTimeout(() => {
    const now = performance.now();
    step(0, now);
    advanceActivity(now);
    updateHomeHealing(now);
    scheduleActivity();
  }, Math.max(0, combatDeadline(run) - performance.now()));
}
function start(task, goal) {
  if (task.zone === 'camp' && destination?.id === 'camp') return notify('Esperá a llegar al Hogar');
  if (isProvision(task)) return buyProvision(task, 1);
  advanceActivity();
  if (byId('pack-full-dialog').open) return;
  if (run?.task === task) return;
  if (goal && stockForGoal(goal.item) >= goal.qty) return;
  const reason = restriction(task);
  if (reason === packLimitReason) {
    capacityTask = task;
    packNoticeShown = false;
    return renderPackFull();
  }
  if (reason) return notify(reason);
  if (task.enemy) autoEquipFood();
  if (lowForContract(task)) return notify('Vida baja · descansá en el Hogar o llevá raciones');
  prepareAudio();
  byId('run-xp-gain').textContent = '';
  keyboard.clear();
  session = { elapsed: 0, xp: 0, items: 0 };
  const arrival = walkTo(task.zone);
  const duration = actionDuration(task, false, arrival);
  run = { task, duration, nextAt: arrival + duration, goal };
  rememberTask(task);
  save();
  scheduleActivity();
  render();
}
function updateStationBack() {
  const button = byId('station-back');
  button.hidden = !previousStation || !['bank', 'skills'].includes(tab) && !homeInventory;
  if (button.hidden) return;
  const { id, group, task } = previousStation;
  const label = 'Volver a ' + (task?.name ?? (id === 'camp' ? groupLabel(group || 'Banco') : zones[id][0]));
  button.innerHTML = icon('chevron-left') + '<span></span>';
  button.lastChild.textContent = label;
  button.title = label;
}
function rememberStation() {
  const selected = tasks[guidedTask];
  const task = selected?.zone === zone && tab === 'skills' ? selected : undefined;
  previousStation = { id: zone, group: task?.group ?? activityGroups[zone], task, style: arenaStyle, train: combatTraining };
}
function chooseZone(id, group, taskId, skill) {
  advanceActivity();
  const currentGroup = activityGroups[zone] ?? zoneGroups[zone][0];
  if (id !== zone || (group && group !== currentGroup)) rememberStation();
  if (group && zoneGroups[id].includes(group)) {
    activityGroups[id] = group;
  }
  if (taskId !== undefined) guidedTask = taskId;
  else if (id !== zone) {
    guidedTask = undefined;
    if (!group) restoreZoneChoice(id);
  }
  focusedSkill = skill;
  keyboard.clear();
  if (id !== zone) byId('workspace-main').scrollTop = 0;
  zone = id;
  lastWalkZone = id;
  if (id === 'camp' && activityGroups.camp !== 'Inventario' && run && run.task.zone !== 'camp') stop(false);
  if (!run && (!atHome() || id !== 'camp' || destination)) walkTo(id);
  openStation(id);
  save();
}
function openStation(id) {
  arrivingZone = undefined;
  lastWalkZone = id;
  zone = id;
  showView('map');
  render();
}
function consumeInputs(task, onlyCarried = false) {
  for (const item of Object.keys(task.input)) {
    const parts = inputParts(task, item);
    if (parts.bag) game.bag[item] -= parts.bag;
    if (parts.notes) game.notes[item] -= parts.notes;
    if (!onlyCarried && parts.bank) game.bank[item] -= parts.bank;
  }
}
function buyProvision(task, quantity) {
  if (!isProvision(task) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 9999) return;
  advanceActivity();
  if (zone !== 'market') return;
  const order = { ...task, cost: task.cost * quantity,
    output: Object.fromEntries(Object.entries(task.output).map(([item, count]) => [item, count * quantity])),
    input: Object.fromEntries(Object.entries(task.input).map(([item, count]) => [item, count * quantity])) };
  if (!Number.isSafeInteger(order.cost)) return notify('Elegí una cantidad menor');
  const reason = restriction(order);
  if (reason) return notify(reason);
  if (!fitsOutput(order)) return notify('Mochila llena · depositá objetos en el Hogar');
  consumeInputs(order);
  game.coins = coinAmount(game.coins - order.cost);
  for (const [item, count] of Object.entries(order.output)) game.bag[item] = (game.bag[item] || 0) + count;
  autoEquipFood();
  log('Compraste ' + itemText(order.output));
  notify('Compra realizada');
  save();
  render();
}
function sellItem(item, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return;
  advanceActivity();
  if (zone !== 'market') return;
  if (quantity > filteredSaleStock(item)) return notify('Ya no tenés esa cantidad para vender');
  const carried = ['all', 'bag'].includes(marketStock) ? Math.min(quantity, bagCount(item)) : 0;
  const notes = ['all', 'bag'].includes(marketStock) ? Math.min(quantity - carried, noteCount(item)) : 0;
  const stored = ['all', 'bank'].includes(marketStock) ? Math.min(quantity - carried - notes, bankCount(item)) : 0;
  const rations = quantity - carried - notes - stored;
  if (carried) game.bag[item] -= carried;
  if (notes) game.notes[item] -= notes;
  if (stored) game.bank[item] -= stored;
  if (rations) {
    const ration = game.rations.find(entry => entry.item === item);
    ration.count -= rations;
    if (!ration.count) game.rations = game.rations.filter(entry => entry !== ration);
  }
  const gold = saleTotal(item, quantity);
  game.coins = coinAmount(game.coins + gold);
  log('Vendiste ' + itemText({ [item]: quantity }) + ' por ' + number(gold) + ' monedas');
  notify('+' + number(gold) + ' monedas · ' + quantity + ' × ' + item);
  save();
  render();
}
function use(item, fromBank = false) {
  advanceActivity();
  if (gear[item]) {
    const { slot } = gear[item];
    if (!carriedStock(item) && !(fromBank && bankCount(item))) return;
    if (isEquipped(item)) return notify('Esa pieza ya está equipada');
    if (!meetsEquipLevel(gear[item])) return notify('Para equipar · ' + equipRequirement(item));
    const previous = game.equipped[slot];
    const fromBundle = !bagCount(item) && noteCount(item) > 0;
    const fromVault = !carriedStock(item);
    const freesSlot = fromBundle ? noteCount(item) === 1 : !fromVault;
    if (previous && !freeFor(previous) && !freesSlot && !atHome()) return notify('Mochila llena · guardá un objeto antes de cambiar de equipo');
    if (fromVault || fromBundle) {
      if (fromBundle) game.notes[item]--;
      else game.bank[item]--;
      game.bag[item] = (game.bag[item] || 0) + 1;
    }
    game.equipped[slot] = item;
    // Si equipás desde el cofre con la mochila llena, la pieza anterior queda guardada ahí.
    if (previous && bagSlots() > bagLimit) {
      game.bag[previous]--;
      game.bank[previous] = bankCount(previous) + 1;
      notify(previous + ' quedó en el cofre');
    }
  } else if (carriedStock(item) < 1) {
    return;
  } else if (food[item]) {
    if (game.hp >= lv('hitpoints') && !tonics[item]) return;
    (bagCount(item) ? game.bag : game.notes)[item]--;
    applyFood(item);
    notify(tonics[item] ? 'Estofado · Protección +' + tonics[item] : 'Recuperaste vida');
  } else if (tonics[item]) {
    (bagCount(item) ? game.bag : game.notes)[item]--;
    game.tonic = { bonus: tonics[item], charges: tonicCharges(item) };
    notify('Protección +' + tonics[item] + ' durante ' + game.tonic.charges + ' combates');
  }
  save();
  render();
}
function unequip(slot) {
  advanceActivity();
  if (!Object.hasOwn(slots, slot) || !game.equipped[slot]) return;
  if (freeFor(game.equipped[slot]) < 1) return notify('Mochila llena · depositá objetos en el Hogar');
  delete game.equipped[slot];
  save();
  render();
}
function loadRation(item) {
  const carried = bagCount(item);
  const bundled = noteCount(item);
  const stored = bankCount(item);
  if (!food[item] || !(carried + bundled + stored)) return false;
  game.rations ??= [];
  let ration = game.rations.find(entry => entry.item === item);
  if (!ration) {
    ration = { item, count: 0 };
    // Una comida nueva entra delante de las que curan menos: por defecto se come primero la mejor.
    const weaker = game.rations.findIndex(entry => (food[entry.item] || 0) < food[item]);
    game.rations.splice(weaker < 0 ? game.rations.length : weaker, 0, ration);
  }
  ration.count += carried + bundled + stored;
  if (carried) game.bag[item] -= carried;
  if (bundled) game.notes[item] -= bundled;
  if (stored) game.bank[item] -= stored;
  return true;
}
function autoEquipFood() {
  let moved = false;
  for (const item of Object.keys(food)) {
    if (!game.rationIgnored?.[item] && loadRation(item)) moved = true;
  }
  return moved;
}
function equipRation(item) {
  advanceActivity();
  if (!food[item] || !owned(item)) return;
  if (!loadRation(item)) return;
  delete game.rationIgnored?.[item];
  save();
  render();
}
function prioritizeRation(item) {
  advanceActivity();
  const index = game.rations.findIndex(ration => ration.item === item);
  if (index <= 0) return;
  game.rations.unshift(...game.rations.splice(index, 1));
  save();
  render();
}
function removeRation(item) {
  advanceActivity();
  const ration = game.rations.find(entry => entry.item === item);
  if (!ration) return;
  const carried = Math.min(ration.count, freeFor(item));
  const stored = ration.count - carried;
  if (stored && (!atHome() || destination)) return notify('Andá al Cofre del Hogar para guardar toda la ración');
  if (carried) game.bag[item] = (game.bag[item] || 0) + carried;
  if (stored) {
    game.bank ??= {};
    game.bank[item] = bankCount(item) + stored;
  }
  game.rations = game.rations.filter(entry => entry !== ration);
  game.rationIgnored ??= {};
  game.rationIgnored[item] = true;
  if (stored) notify('Guardaste ' + number(stored) + ' × ' + item + ' en el cofre');
  save();
  render();
}
function atHome() {
  const home = heroSpot('camp');
  return Math.hypot(position.x - home.x, position.y - home.y) <= 34;
}
function clearHomeHealing() {
  if (homeHealAt === undefined) return;
  clearTimeout(homeHealTimer);
  homeHealTimer = undefined;
  homeHealAt = undefined;
}
function updateHomeHealing(now = performance.now()) {
  if (!character || destination || keyboard.size || !atHome()) return clearHomeHealing();
  const max = lv('hitpoints');
  if (game.hp >= max) return clearHomeHealing();
  homeHealAt ??= now + homeHealInterval;
  if (now >= homeHealAt) {
    const ticks = 1 + Math.floor((now - homeHealAt) / homeHealInterval);
    homeHealAt += ticks * homeHealInterval;
    game.hp = Math.min(max, game.hp + ticks * restGain());
    if (game.hp === max) {
      clearHomeHealing();
      log('Recuperaste toda tu vida en el Hogar.');
      notify('Vida recuperada');
    }
    save();
    if (!document.hidden) render();
  }
  if (homeHealAt !== undefined && homeHealTimer === undefined) {
    homeHealTimer = setTimeout(() => {
      homeHealTimer = undefined;
      updateHomeHealing();
    }, Math.max(1, homeHealAt - performance.now()));
  }
}
function bankTransfer(item, direction, quantity, bundled = false) {
  if (tab !== 'bank' || !atHome() || destination) return notify('Esperá a llegar al Hogar');
  advanceActivity();
  const deposit = direction === 'deposit';
  game.notes ??= {};
  const count = deposit ? (bundled ? noteCount(item) : bagCount(item)) : bankCount(item);
  const amount = Math.min(count, quantity);
  if (!amount) return;
  // Las partidas guardadas conservan sus lotes en notes. Se usan igual que los demás objetos.
  const carryInBundle = deposit ? bundled : !stackable.has(item) || Boolean(noteCount(item) && !bagCount(item));
  const carried = carryInBundle ? game.notes : game.bag;
  const hasStack = carryInBundle ? noteCount(item) : bagCount(item);
  if (!deposit && !hasStack && bagSlots() >= bagLimit) return notify('Hacé un lugar en la mochila para retirar ' + item);
  const source = deposit ? carried : game.bank;
  const target = deposit ? game.bank : carried;
  source[item] -= amount;
  target[item] = (target[item] || 0) + amount;
  if (deposit && bagSlots() < bagLimit) game.spill = 0;
  save();
  render();
}
const bankPinKey = (item, notes) => (notes ? "note:" : "item:") + item;
function depositAll() {
  if (tab !== 'bank' || !atHome() || destination) return notify('Esperá a llegar al Hogar');
  advanceActivity();
  for (const item of Object.keys(game.bag)) {
    const amount = bagCount(item);
    if (!amount || game.bankPins?.[bankPinKey(item, false)]) continue;
    game.bag[item] -= amount;
    game.bank[item] = (game.bank[item] || 0) + amount;
  }
  for (const [item, amount] of Object.entries(game.notes ?? {})) {
    if (!amount || game.bankPins?.[bankPinKey(item, true)]) continue;
    game.bank[item] = bankCount(item) + amount;
    game.notes[item] = 0;
  }
  if (bagSlots() < bagLimit) game.spill = 0;
  save();
  render();
}

function sourceFor(item) {
  const options = producers.get(item) || [];
  const available = task => (!task.skill || lv(task.skill) >= task.level) && !lacksTool(task) && !Object.hasOwn(task.input, geode) &&
    Object.entries(task.requires).every(([skill, level]) => lv(skill) >= level);
  // Si hay varias formas de conseguirlo, se recomienda la de mayor nivel ya desbloqueada.
  const free = options.filter(task => !task.enemy && !task.cost && available(task)).sort((a, b) => b.level - a.level)[0];
  // Si la vía gratuita (pescar, cocinar, forjar) existe pero pide nivel, la guía manda a subirlo antes que a pagar.
  const own = options.filter(task => !task.enemy && !task.cost).sort((a, b) => a.level - b.level)[0];
  return free || own ||
    options.find(task => !task.enemy && available(task)) || options.find(task => !task.enemy) || options[0];
}
function jumpToTask(task, skill) {
  if (!task) return;
  if (task.style) arenaStyle = task.style;
  if (task.train) combatTraining = task.train;
  const filterKey = task.zone + task.group;
  if (recipeCategories[filterKey] && recipeCategories[filterKey] !== recipeCategory(task)) {
    delete recipeCategories[filterKey];
  }
  chooseZone(task.zone, task.group, task.id, skill);
}
// Con espada, la guía rota Ataque, Fuerza y Defensa: entrena la más baja (a igual nivel, en ese orden).
const meleeFocus = () => ['attack', 'strength', 'defence'].reduce((low, skill) => lv(skill) < lv(low) ? skill : low);
function trainingFor(skill) {
  const choices = tasks.filter(task => task.skill === skill && task.xp > 0);
  const contracts = tasks.filter(task => task.group === 'Encargos' && task.style === (skill === 'ranged' || skill === 'magic' ? skill :
    skill === 'attack' || skill === 'strength' ? 'melee' : arenaStyle) &&
    (skill === 'slayer' || skill === 'hitpoints' ? task.train === (arenaStyle === 'melee' ? meleeFocus() : arenaStyle) : task.train === skill));
  // Los rastreos de veteranos dan más XP, pero la guía solo los propone si con tu vida llena son fáciles.
  const contract = contracts.findLast(task => lv('slayer') >= task.level &&
    (!task.veteran || forecast(task, lv('hitpoints')).win >= .97 && foodReserve() + lv('hitpoints') >= 4 * battle(task).damage));
  if (contract) return contract;
  const open = choices.filter(task => task.level <= lv(skill) && task.boss === undefined && !lacksTool(task));
  const best = list => list.sort((a, b) => b.level - a.level || b.xp - a.xp)[0];
  // Primero lo que ya se puede hacer con lo guardado; si no, una receta cuyos insumos se consiguen directamente.
  const stocked = open.filter(task => Object.entries(task.input).every(([item, need]) => owned(item) >= need));
  const simple = open.filter(task => Object.keys(task.input).every(item => {
    const source = sourceFor(item);
    return source && !source.enemy && !Object.keys(source.input).length;
  }));
  // Entre las recetas viables gana la de mayor nivel; a igual nivel, la que ya tiene insumos.
  const viable = [...new Set([...stocked, ...simple])].sort((a, b) => b.level - a.level ||
    Number(stocked.includes(b)) - Number(stocked.includes(a)) || b.xp - a.xp)[0];
  return viable ?? best(open) ?? choices[0];
}
function rationSlots(manage = false) {
  return game.rations.map(({ item, count }) => {
    const label = item + ' · +' + food[item] + ' de vida';
    return '<span class="ration-slot"><button class="io" type="button" data-eat-ration="' + item + '" title="Comer ' +
      label + '" aria-label="Comer ' + label + '">' + itemBadge(item) + '<b>' + number(count) + '</b></button>' +
      (manage ? '<button type="button" class="ration-remove" data-remove-ration="' + item + '" aria-label="Desequipar ' +
        item + '" title="Desequipar">×</button>' : '') + '</span>';
  }).join('');
}
function renderSupplies() {
  const panel = byId('battle-supplies');
  panel.hidden = zone !== 'arena';
  if (panel.hidden) return;
  const max = lv('hitpoints');
  byId('battle-hp').textContent = game.hp + '/' + max;
  byId('battle-hp-bar').style.width = game.hp * 100 / max + '%';
  const quick = byId('quick-food');
  const focused = quick.contains(document.activeElement) ? document.activeElement : null;
  const priorities = game.rations.length > 1 ? '<select id="ration-priority" title="Qué comida se come primero">' +
    game.rations.map(ration => '<option value="' + ration.item + '">1.º ' + ration.item + ' (+' +
      food[ration.item] + ' vida)</option>').join('') + '</select>' : '';
  const first = game.rations[0];
  // Sin la línea de ayuda debajo (repetía la ración de arriba): lo de "come solo al 30 %" queda en el título de la fila.
  const markup = rationSlots() + (first ? priorities :
    '<button class="next-chip" data-zone="camp" data-group="Cocina">Sin comida · cocinar</button>');
  if (quick.dataset.markup === markup) return;
  quick.dataset.markup = markup;
  quick.innerHTML = markup;
  if (focused?.dataset.eatRation) {
    quick.querySelector('[data-eat-ration="' + CSS.escape(focused.dataset.eatRation) + '"]')?.focus({ preventScroll: true });
  } else if (focused?.id === 'ration-priority') {
    byId(focused.id)?.focus({ preventScroll: true });
  }
}
let dismissed = {};
function renderRecovery() {
  const max = lv('hitpoints');
  const blocked = Boolean(recoveryTask && game.hp <= 1);
  // El aviso de "Poca vida" sale solo cuando queda muy poco de verdad: 1 de vida en niveles bajos y hasta 5 en los altos
  // (un 5 % de la vida máxima). Si llevás raciones no aparece, porque el personaje come solo.
  const low = zone === 'arena' && game.hp <= Math.max(1, Math.round(max * .05)) && !game.rations?.some(ration => ration.count > 0);
  const tooStrong = blocked && forecast(recoveryTask, max).win < .2;
  const key = tooStrong ? 'strong' : blocked || low ? 'low' : '';
  if (dismissed.recovery && dismissed.recovery !== key) delete dismissed.recovery;
  byId('recovery').hidden = !key || dismissed.recovery === key || atHome() && !tooStrong;
  byId('recovery-title').textContent = tooStrong ? 'Este rival te supera' : 'Poca vida';
  byId('recovery-message').textContent = tooStrong ? 'Mejorá tu armadura o subí Defensa y Vida.' : 'Descansá en el Hogar o llevá comida.';
}
function renderRunHud(task) {
  const skill = task?.enemy ? task.train || (task.style === 'melee' ? 'attack' : task.style) : task?.skill;
  const active = Boolean(task && task === run?.task);
  byId('run-strip').hidden = !skill || !active;
  byId('stop').hidden = !run;
  byId('run-progress').hidden = !active;
  syncCycleHud();
  byId('run-zone').textContent = active ? 'EN CURSO' : '';
  byId('run-zone').parentElement.hidden = !active;
  byId('cycle-time').hidden = !active;
  if (!active) byId('run-xp-gain').textContent = '';
  byId('run-icon').innerHTML = skill ? skillIcon(skill) : icon('map');
  byId('run-xp').hidden = !skill;
  const counters = byId('run-session');
  counters.hidden = !active || !session?.elapsed;
  if (!skill) return;
  const level = lv(skill);
  byId('run-level').textContent = skills[skill][0] + ' · Nv. ' + level;
  byId('run-xp-left').textContent = level === 99 ? 'Nivel máximo' :
    'Faltan ' + number(xpAt[level + 1] - (game.xp[skill] || 0)) + ' XP';
  const percent = xpPercent(skill);
  byId('run-xp-bar').style.width = percent + '%';
  byId('run-xp-meter').setAttribute('aria-valuenow', Math.round(percent));
  byId('run-xp-meter').setAttribute('aria-valuetext', number(game.xp[skill]) + ' XP · ' + byId('run-xp-left').textContent);
  if (counters.hidden) return;
  const perHour = 3600000 / session.elapsed;
  const xpRate = session.xp * perHour;
  const hoursLeft = (xpAt[level + 1] - (game.xp[skill] || 0)) / xpRate;
  const minutesLeft = Math.ceil(hoursLeft * 60);
  const eta = minutesLeft >= 60 ? Math.floor(minutesLeft / 60) + ' h ' + minutesLeft % 60 + ' min' : minutesLeft + ' min';
  counters.textContent = number(Math.round(xpRate)) + ' XP/h' +
    (session.items ? ' · ' + number(Math.round(session.items * perHour)) + (oreTask(run.task) ? ' recursos/h' : ' objetos/h') : '') +
    (level < 99 && xpRate ? ' · ~' + eta + ' al Nv. ' + (level + 1) : '');
}


const oreColors = { Cobre: '#de9769', Estaño: '#b9c0bc', Hierro: '#c1a093', Carbón: '#a3aca1',
  Plata: '#d0dfe5', Oro: '#ecc46d', Mithril: '#9db9ea', Adamantita: '#8bcda1', Runita: '#84d3db' };
function itemBadge(item, skill, className = '') {
  return '<span class="slot ' + className + '" aria-hidden="true">' + (item ? itemIcon(item) : skill ? skillIcon(skill) : icon('chest')) + '</span>';
}
function recipeIcon(task, className = '') {
  if (task.enemy) return '<span class="slot slot-foe ' + className + '" aria-hidden="true">' + enemyArt(task) + '</span>';
  if (task.project) return '<span class="slot ' + className + '" aria-hidden="true">' + icon('hammer', '#d9b24a') + '</span>';
  return itemBadge(Object.keys(task.output)[0], task.skill, className);
}
function healingFor(task) {
  const item = Object.keys(task.output)[0];
  if (task.skill !== 'fishing') return food[item];
  const recipe = tasks.find(entry => entry.skill === 'cooking' && Object.hasOwn(entry.input, item) &&
    Object.keys(entry.input).length === 1);
  return recipe && food[Object.keys(recipe.output)[0]];
}
function recipeCategory(task) {
  const product = Object.keys(task.output)[0] || '';
  const slot = gear[product]?.slot;
  if (task.zone === 'forge') {
    if (slot === 'weapon') return 'Armas';
    if (slot === 'pick' || slot === 'axe') return 'Herramientas';
    if (slot === 'ring') return 'Anillos';
    if (slot) return 'Armaduras';
    return product.startsWith('Barra') ? 'Barras' : 'Puntas';
  }
  if (task.group === 'Arquería') return slot === 'bow' ? 'Arcos' : 'Flechas';
  if (task.group === 'Cocina') return tonics[product] ? 'Estofados' : task.name.startsWith('Preparar ración') ? 'Raciones' : 'Cocinar';
  return '';
}
const activityKey = task => [task.zone, task.group, task.style ?? '', task.train ?? ''].join('/');
function rememberTask(task) {
  game.lastActivities ??= {};
  game.lastActivities[activityKey(task)] = task.name;
  // Además, lo último que elegiste en cada lugar: al volver, el panel abre en esa misma actividad (con su pestaña,
  // estilo y habilidad de entrenamiento), no en la primera de la lista.
  game.lastByZone ??= {};
  game.lastByZone[task.zone] = task.name;
}
function restoreZoneChoice(id) {
  const name = game.lastByZone?.[id];
  const task = name && tasks.find(entry => entry.zone === id && matchesTaskName(entry, name));
  if (!task) return;
  if (task.group && zoneGroups[id]?.includes(task.group)) activityGroups[id] = task.group;
  if (task.style) arenaStyle = task.style;
  if (task.train) combatTraining = task.train;
  const filterKey = task.zone + task.group;
  if (recipeCategories[filterKey] && recipeCategories[filterKey] !== recipeCategory(task)) delete recipeCategories[filterKey];
  guidedTask = task.id;
}
const matchesTaskName = (task, name) => Boolean(name && (task.name === name || task.legacyName === name || task.legacyNames?.includes(name)));
function selectedRecipe(shown) {
  return shown.find(task => task.id === guidedTask) || shown.find(task => matchesTaskName(task, game.lastActivities?.[activityKey(task)])) ||
    shown.find(task => task === run?.task) ||
    shown.findLast(task => !restriction(task)) || shown.find(task => !lacksTool(task) && (!task.skill || lv(task.skill) >= task.level)) || shown[0];
}
// Reemplaza el contenido solo si cambió: evita reconstruir (y repintar) paneles idénticos en cada ronda.
function setMarkup(element, markup) {
  if (element.renderedMarkup === markup) return false;
  element.renderedMarkup = markup;
  element.innerHTML = markup;
  return true;
}
const seconds = ms => (ms / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' s';
const chip = (shape, text, title, className = '') => '<span class="chip ' + className + '" title="' + title + '">' + shape + '<b>' + text + '</b></span>';
function renderRecipe(task) {
  const detail = byId('recipe-detail');
  if (!task) {
    setMarkup(detail, '<p class="empty">Nada para hacer acá todavía.</p>');
    return;
  }
  const running = run?.task === task;
  const xp = taskXp(task);
  const gold = taskGold(task);
  const { double } = levelBonus(task);
  const timeSaved = 1 - taskDuration(task) / taskDuration(task, false);
  const reason = task.zone === 'camp' && destination?.id === 'camp' ? 'Podés cocinar al llegar al Hogar' : restriction(task);
  const fight = task.enemy && battle(task);
  const reward = Object.keys(task.output)[0];
  const equipment = gear[reward];
  const equip = equipRequirement(reward);
  const usesBank = usesBankMaterials(task);
  const chips = [chip(icon('clock'), seconds(taskDuration(task) / boostRate()), 'Tiempo por ciclo')];
  if (xp) chips.push(chip(skillIcon(task.skill), '+' + number(xp) + ' XP', 'XP de ' + skills[task.skill][0] + ' por ciclo'));
  if (task.train) chips.push(chip(skillIcon(task.train), '+' + number(trainXp(task)) + ' XP', 'XP de ' + skills[task.train][0]));
  const outlook = fight && forecast(task);
  if (fight) {
    chips.push(chip(icon('sword', '#cfd8dd'), '1–' + fight.maxHit, 'Tu golpe · acertás el ' + Math.round(fight.accuracy * 100) + ' %'),
      chip(icon('heart', '#d9463b'), '1–' + fight.foeMaxHit, 'Golpe del rival con tu armadura · acierta el ' + Math.round(fight.foeAccuracy * 100) + ' %', 'chip-bad'));
    if (outlook.bites >= .5) chips.push(chip(itemIcon(game.rations[0]?.item || cookedFish[0]), '~' + Math.round(outlook.bites), 'Comidas por pelea con tus raciones'));
  }
  if (gold) chips.push(chip(icon('coin'), '+' + number(gold), 'Monedas por ciclo'));
  if (speedSkills.includes(task.skill) && timeSaved > 0) chips.push(chip(icon('bolt'), '−' + percent(timeSaved), 'Tiempo que ahorrás por tu nivel, herramienta y mejoras', 'chip-good'));
  if (double) chips.push(chip('<i class="x2">×2</i>', percent(double), 'Probabilidad de producto doble', 'chip-good'));
  if (oreTask(task) && gemChance(lv('mining'))) chips.push(chip(icon('gem', '#f0b33c'), '1/' + number(Math.round(1 / gemChance(lv('mining')))), 'Probabilidad de encontrar una gema'));
  if (equipment) chips.push(chip(itemIcon(reward), gearDetail(equipment).replace(' en los tres estilos', ''), 'Al equiparlo' + (equip ? ' · Requiere ' + equip : '')));
  const needs = Object.entries(task.requires).map(([skill, level]) =>
    chip(skillIcon(skill), String(level), skills[skill][0] + ' ' + level, lv(skill) >= level ? 'chip-good' : 'chip-bad'));
  if (task.toolTier) {
    const tool = requiredTool(task);
    needs.push(chip(itemIcon(tool), tool + ' o mejor', 'Herramienta equipada', lacksTool(task) ? 'chip-bad' : 'chip-good'));
  }
  if (task.minProtection) {
    needs.push(chip(icon('shield', '#6f8fd8'), '+' + task.minProtection, 'Protección mínima · tenés +' + protection(),
      protection() >= task.minProtection ? 'chip-good' : 'chip-bad'));
    const weapon = bonusOf(combatSlots[task.style]);
    needs.push(chip(icon(gearShapes[combatSlots[task.style]], '#cfd8dd'), '+' + task.minWeapon, 'Arma de ' + combatLabels[task.style].toLowerCase() +
      ' mínima · tenés +' + weapon, weapon >= task.minWeapon ? 'chip-good' : 'chip-bad'));
  }
  if (task.cost) needs.push(chip(icon('coin'), number(task.cost), 'Cuesta ' + number(task.cost) + ' monedas', game.coins >= task.cost ? '' : 'chip-bad'));
  const ingredients = Object.entries(task.input).map(([name, amount]) => {
    const source = name === geode ? tasks.find(oreTask) : sourceFor(name);
    const count = ingredientStock(task, name);
    return '<button type="button" class="io' + (count < amount ? ' io-missing' : '') + '"' + (source ? ' data-jump="' + source.id + '"' : '') +
      ' title="' + name + (usesBank ? ' · ' + stockText(name) : '') + (source ? ' · se consigue en ' + zones[source.zone][0] : '') + '">' + itemBadge(name) +
      '<b>' + number(count) + '/' + number(amount) + '</b></button>';
  }).join('');
  const products = Object.entries(activityOutput(task)).map(([name, amount]) => '<span class="recipe-output"><span class="io" title="' + name + '">' +
    itemBadge(name) + '<b>×' + number(amount) + '</b></span><small>' + stockText(name).split(' · ').map(part => '<span>' + part + '</span>').join('') +
    '</small></span>').join('');
  const drops = (task.drops || []).map(drop => {
    const [name] = Object.keys(drop.items);
    const found = game.finds?.[name];
    // Qué hace el botín raro, dicho en el mismo lugar: el trofeo no va a la mochila, da XP para siempre y queda en la Colección.
    const what = trophies.includes(name) ? 'Trofeo: +5 % de XP en todo, para siempre. Se guarda en Colección.' :
      amulets.includes(name) ? 'Amuleto: ' + (gear[name] ? '+' + gear[name].bonus + ' de potencia en el cuello' : 'equipable') + '.' : '';
    return '<span class="io io-rare" title="' + name + (what ? ' · ' + what : '') + (found ? ' · ya lo tenés' : '') + '">' + itemBadge(name) + '<b>' +
      (found ? icon('check') : '1/' + number(Math.round(1 / drop.chance))) + '</b></span>';
  }).join('');
  const rareNote = (task.drops || []).map(drop => {
    const [name] = Object.keys(drop.items);
    if (!trophies.includes(name)) return '';
    return '<p class="rare-note">' + icon('trophy') + '<span><b>' + name + '</b> · ' + (game.finds?.[name] ? 'Ya es tuyo: ' : 'Trofeo (1 en ' + number(Math.round(1 / drop.chance)) + '): ') +
      '+5 % de XP en todos los oficios, para siempre. No ocupa la mochila; lo ves en Colección.' +
      (trophyCount() ? ' Tus trofeos suman <b>+' + trophyCount() * 5 + ' %</b> de XP.' : '') + '</span></p>';
  }).join('');
  const action = running ? '<button type="button" class="action-start action-stop" data-stop-task="' + task.id +
    '" aria-label="Detener ' + task.name + '">' + icon('stop') + '<span>Detener</span></button>' :
    '<button type="button" class="action-start" data-task="' + task.id + '" aria-label="Iniciar ' + task.name + '"' +
    (reason ? ' aria-disabled="true"' : '') + '>' +
    (reason ? icon('padlock') : task.enemy ? icon('swords') : icon('play')) +
    '<span>' + (task.boss !== undefined || task.challenge ? 'Enfrentar' : task.enemy ? 'Pelear' : 'Empezar') + '</span>' +
    (task.enemy ? '<small class="action-target">' + task.enemy.name + '</small>' : '') + '</button>';
  const healing = healingFor(task);
  const note = task.project?.hint ?? (healing ? (task.skill === 'fishing' ? 'Al cocinarlo, cura ' : 'Cura ') +
    '+' + healing + ' de vida por porción.' + (tonics[reward] ? ' Protección +' + tonics[reward] + '.' : '') : '');
  const threat = outlook && threatLevel(outlook.win);
  // Historial con este jefe: si ya lo venciste, cuántas veces, cuántas perdiste y tu pelea más corta.
  const wins = task.boss !== undefined ? game.victories?.[task.boss] || 0 : 0;
  const losses = task.boss !== undefined ? game.bossLosses?.[task.boss] || 0 : 0;
  const best = task.boss !== undefined ? game.bossBest?.[task.boss] : undefined;
  const record = task.boss === undefined ? '' : '<div class="boss-record' + (wins ? ' boss-record-won' : '') + '">' +
    '<span class="boss-record-badge">' + (wins ? icon('check') + 'Vencido' : 'Sin vencer') + '</span>' +
    '<span><b class="num">' + number(wins) + '</b> ' + (wins === 1 ? 'victoria' : 'victorias') + '</span>' +
    '<span><b class="num">' + number(losses) + '</b> ' + (losses === 1 ? 'derrota' : 'derrotas') + '</span>' +
    (best ? '<span>Mejor pelea <b class="num">' + best + '</b> rondas</span>' : '') +
    (wins ? '<small>Repetirlo da ¼ de la XP y ⅕ del oro.</small>' : '') + '</div>';
  const threatCard = outlook ? '<div class="threat threat-' + threat.key + '"><div class="threat-gauge" style="--win:' + Math.round(outlook.win * 100) +
    '"><b>' + Math.round(outlook.win * 100) + '<i>%</i></b><small>victoria</small></div><div class="threat-info"><strong>' + threat.label + '</strong>' +
    '<span>Vida del rival <b>' + task.enemy.hp + '</b> · pelea de ~' + Math.round(outlook.rounds) + ' rondas</span>' +
    (task.enemy.threat ? '<span class="threat-tip">' + task.enemy.threat + '</span>' : '') +
    (enrageFor(task) < Infinity ? '<span class="threat-tip">Desde la ronda ' + enrageFor(task) + ' se enfurece y pega un 50 % más.</span>' : '') +
    (game.hp < lv('hitpoints') ? '<span class="threat-tip">Calculado con tu vida actual (' + game.hp + '/' + lv('hitpoints') + ').</span>' : '') +
    '</div></div>' : '';
  // En las peleas el botón va arriba, pegado a la vida y la plegaria; los datos del rival quedan debajo.
  const fightFirst = Boolean(task.enemy);
  const lock = reason ? '<p class="rc-lock">' + icon('lock') + reason + '</p>' : '';
  setMarkup(detail, (fightFirst ? lock + action : '') + '<div class="rc-head">' + recipeIcon(task, 'slot-big') + '<div class="rc-title"><h2>' + task.name +
    '</h2><div class="chips">' + chips.join('') + '</div></div></div>' + record + threatCard +
    (needs.length ? '<div class="chips chips-needs"><small>Pide</small>' + needs.join('') + '</div>' : '') +
    (ingredients || products || drops ? '<div class="rc-io">' + (ingredients ? '<div class="rc-use"><small>Usa</small><div>' + ingredients + '</div></div><i class="rc-arrow">' + icon('arrow-forward') + '</i>' : '') +
      (products ? '<div class="rc-give"><small>Da</small><div>' + products + '</div></div>' : '') +
      (drops ? '<div class="rc-drops"><small>Raro</small><div>' + drops + '</div></div>' : '') + '</div>' : '') + rareNote +
    (note ? '<p class="rc-note">' + note + '</p>' : '') +
    (fightFirst ? '' : lock + action));
}
function renderSkillProgress(skill, task) {
  const detail = byId('detail');
  detail.hidden = !skill;
  if (!skill) return;
  const level = lv(skill);
  const xp = game.xp[skill] || 0;
  const unlock = unlocksFor(skill).find(entry => entry.level > level);
  const bonus = task?.skill === skill ? levelBonus(task) : null;
  const effect = levelEffects[skill] || 'Cada nivel: +1 % de velocidad y más chance de producto doble.' +
    (bonus ? ' Ahora: +' + percent(bonus.speed) + ' y ' + percent(bonus.double) + '.' : '');
  detail.title = effect;
  setMarkup(detail, '<div class="lvl" title="' + effect + '">' + skillIcon(skill) + '<b>' + level + '</b></div><div class="lvl-info"><div class="bar" role="progressbar" aria-label="XP hacia el próximo nivel" aria-valuenow="' +
    Math.floor(xpPercent(skill)) + '"><i style="width:' + xpPercent(skill) + '%"></i></div><small>' +
    (level === 99 ? 'Nivel máximo' : number(xpAt[level + 1] - xp) + ' XP para el ' + (level + 1)) + '</small>' +
    (unlock ? (unlock.id === undefined ? '<span class="next-chip">' : '<button type="button" class="next-chip" data-jump="' + unlock.id + '">') +
      icon('lock') + 'Nv. ' + unlock.level + ' · ' + unlock.name + (unlock.id === undefined ? '</span>' : '</button>') : '') + '</div>');
}
function renderSaleQuote() {
  if (!saleItem) return;
  const quantity = byId('sale-quantity').valueAsNumber;
  const valid = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= filteredSaleStock(saleItem);
  const button = byId('sale-submit');
  button.disabled = !valid;
  button.innerHTML = valid ? 'Vender por ' + icon('coin') + '<b class="num">' + number(saleTotal(saleItem, quantity)) + '</b>' : 'Vender';
}
function renderMarketSales() {
  const query = byId('market-search').value.trim().toLocaleLowerCase('es');
  const items = [...new Set([...Object.keys(game.bag), ...Object.keys(game.notes ?? {}), ...Object.keys(game.bank ?? {}), ...game.rations.map(ration => ration.item)])]
    .filter(item => filteredSaleStock(item) && item.toLocaleLowerCase('es').includes(query))
    .sort((a, b) => a.localeCompare(b, 'es'));
  const quantity = byId('sale-quantity');
  if (!items.includes(saleItem)) {
    saleItem = items[0];
    quantity.value = 1;
  }
  byId('sale-form').hidden = !saleItem;
  byId('sale-empty').hidden = Boolean(saleItem);
  const grid = byId('sale-items');
  const inventoryKey = JSON.stringify([saleItem, ...items.map(item => [item, filteredSaleStock(item)])]);
  if (grid.dataset.items !== inventoryKey) {
    grid.dataset.items = inventoryKey;
    grid.replaceChildren(...items.map(item => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'io';
      tile.dataset.saleItem = item;
      tile.title = item;
      tile.setAttribute('aria-label', item + ' · ' + filteredSaleStock(item));
      tile.setAttribute('aria-pressed', item === saleItem);
      tile.innerHTML = itemBadge(item) + (filteredSaleStock(item) > 1 ? '<b>' + shortCount(filteredSaleStock(item)) + '</b>' : '');
      return tile;
    }));
  }
  for (const button of byId('market-sales').querySelectorAll('[data-market-stock]')) {
    button.setAttribute('aria-pressed', button.dataset.marketStock === marketStock);
  }
  if (!saleItem) return;
  byId('sale-item-name').textContent = saleItem;
  quantity.max = filteredSaleStock(saleItem);
  if (quantity.valueAsNumber > Number(quantity.max)) quantity.value = quantity.max;
  const equip = byId('sale-equip');
  equip.hidden = !gear[saleItem];
  equip.disabled = isEquipped(saleItem) || Boolean(gear[saleItem] && lv(gear[saleItem].skill) < gear[saleItem].level);
  equip.textContent = isEquipped(saleItem) ? 'Equipado' : 'Equipar';
  byId('sale-stock').innerHTML = icon('coin') + '<b class="num">' + number(salePrice(saleItem)) + '</b> c/u · ' + stockText(saleItem);
  setMarkup(byId('sale-icon'), itemBadge(saleItem, '', 'slot-big'));
  renderSaleQuote();
}
// Mercado: total en vivo, tope de lo que se puede pagar y estado de la compra según la cantidad elegida.
function provisionLimit(task) {
  const byInputs = Object.entries(task.input).map(([item, count]) => Math.floor(ingredientStock(task, item) / count));
  return Math.max(0, Math.min(9999, task.cost ? Math.floor(game.coins / task.cost) : 9999, ...byInputs));
}
function syncProvision(form) {
  const task = tasks[Number(form.dataset.provision)];
  const input = form.elements.quantity;
  const quantity = input.valueAsNumber;
  const valid = Number.isSafeInteger(quantity) && quantity >= 1;
  const total = task.cost * (valid ? quantity : 1);
  const short = valid && (total > game.coins || quantity > provisionLimit(task));
  form.querySelector('[data-provision-total]').textContent = number(total);
  form.classList.toggle('provision-short', short && !form.classList.contains('provision-off'));
  const submit = form.querySelector('.provision-submit');
  submit.disabled = form.classList.contains('provision-off') || !valid || short;
  submit.title = short ? (total > game.coins ? 'Te faltan ' + number(total - game.coins) + ' monedas' : 'No tenés los materiales para tantas') : '';
}
function renderActions() {
  const focused = document.activeElement?.dataset;
  const [name, , , , description] = zones[zone];
  byId('zone-label').textContent = name;
  byId('zone-description').textContent = description;
  byId('panel-skills').dataset.zone = zone;
  setMarkup(byId('zone-icon'), zoneIcon(zone));
  byId('zone-icon').title = description;
  renderSupplies();
  renderRecovery();
  byId('prayer-controls').hidden = zone !== 'arena' && zone !== 'shrine';
  byId('prayer-help').hidden = zone !== 'shrine';
  const allGroups = zoneGroups[zone];
  const groups = allGroups.filter(entry => zone === 'camp' || zone === 'market' && entry === 'Equipo' || tasks.some(task => task.zone === zone && task.group === entry &&
    !(task.challenge && openTier() >= 0) && !(task.daily !== undefined && !game.victories?.[0])));
  if (!groups.includes(activityGroups[zone])) delete activityGroups[zone];
  const group = zone === 'camp' ? 'Cocina' : activityGroups[zone] ?? groups[0];
  const marketSales = zone === 'market' && group === 'Equipo';
  byId('market-sales').hidden = !marketSales;
  byId('actions').hidden = marketSales;
  if (marketSales) renderMarketSales();
  const groupMenu = byId('activity-group');
  const menuKey = zone + groups.length;
  if (groupMenu.dataset.zone !== menuKey) {
    groupMenu.innerHTML = groups.map(entry => '<button type="button" data-activity-group="' + entry + '">' + groupLabel(entry) +
      (zone === 'forge' && allGroups.indexOf(entry) < bands.length ? ' <span>' + bands[allGroups.indexOf(entry)] + '</span>' : '') + '</button>').join('');
    groupMenu.dataset.zone = menuKey;
  }
  for (const button of groupMenu.querySelectorAll('button')) button.setAttribute('aria-pressed', button.dataset.activityGroup === group);
  const inArena = zone === 'arena';
  const canChooseTraining = inArena && group === 'Encargos';
  byId('arena-combat-controls').hidden = !inArena;
  byId('combat-training-panel').hidden = !canChooseTraining;
  const styles = byId('combat-styles');
  for (const button of styles.querySelectorAll('button')) button.setAttribute('aria-pressed', button.dataset.combatStyle === arenaStyle);
  if (canChooseTraining) {
    const training = byId('combat-training');
    const variants = [...new Set(tasks.filter(task => task.group === 'Encargos' && task.style === arenaStyle).map(task => task.train))];
    if (!variants.includes(combatTraining)) combatTraining = variants[0];
    if (training.dataset.style !== arenaStyle) {
      training.innerHTML = variants.map(skill => '<button type="button" data-combat-train="' + skill +
        '" title="Entrenar ' + skills[skill][0] + '">' + skillIcon(skill) + '<strong>' + skills[skill][0] +
        '</strong><b class="training-level"></b><i class="training-bar" aria-hidden="true"><u></u></i></button>').join('');
      training.dataset.style = arenaStyle;
    }
    for (const button of training.querySelectorAll('button')) {
      const skill = button.dataset.combatTrain;
      button.setAttribute('aria-pressed', skill === combatTraining);
      button.querySelector('.training-level').textContent = lv(skill);
      // Progreso al próximo nivel de cada estilo, a la vista mientras peleás (Defensa no aparecía en ningún lado).
      const percent = lv(skill) >= 99 ? 100 : Math.floor(xpPercent(skill));
      button.querySelector('.training-bar u').style.width = percent + '%';
      button.title = skills[skill][0] + ' nivel ' + lv(skill) + (lv(skill) >= 99 ? '' : ' · ' + percent + ' % al ' + (lv(skill) + 1) +
        ' · faltan ' + number(Math.max(0, xpAt[lv(skill) + 1] - (game.xp[skill] || 0))) + ' XP');
    }
  }
  byId('activity-group-label').textContent = zone === 'forge' ? 'Metal' : 'Actividad';
  const groupTasks = tasks.filter(task => task.zone === zone && task.group === group &&
    (!inArena || task.style === arenaStyle) && (!canChooseTraining || task.train === combatTraining) &&
    (task.daily === undefined || task.daily === dailyTier()));
  const categoryMenu = byId('recipe-categories');
  const categories = [...new Set(groupTasks.map(recipeCategory).filter(Boolean))];
  categoryMenu.hidden = categories.length < 2;
  const category = recipeCategories[zone + group] ?? 'Todo';
  const categoryMarkup = ['Todo', ...categories].map(entry => '<button type="button" data-recipe-category="' + entry +
    '" aria-pressed="' + (category === entry) + '">' + entry + '</button>').join('');
  setMarkup(categoryMenu, categoryMarkup);
  const shown = (categoryMenu.hidden || category === 'Todo' ? groupTasks : groupTasks.filter(task => recipeCategory(task) === category))
    .sort((a, b) => a.level - b.level);
  const task = selectedRecipe(shown);
  if (task) guidedTask = task.id;
  const skill = focusedSkill ?? task?.skill;
  byId('zone-title').textContent = zone === 'camp' ? name : skill ? skills[skill][0] : name;
  byId('panel-skills').dataset.skill = skill ?? '';
  byId('recipe-count').textContent = shown.length + (shown.length === 1 ? ' opción' : ' opciones');
  renderSkillProgress(skill, task);
  const actionMarkup = shown.map(entry => {
    const running = run?.task === entry;
    const reason = restriction(entry);
    const xp = taskXp(entry);
    const locked = lacksTool(entry) || entry.skill && lv(entry.skill) < entry.level ||
      Object.entries(entry.requires).some(([key, level]) => lv(key) < level);
    const healing = healingFor(entry);
    const status = running ? 'En curso' : entry.skill && lv(entry.skill) < entry.level ? 'Nivel ' + entry.level : lacksTool(entry) ? requiredTool(entry) :
      locked ? 'Bloqueado' : entry.project && game.projects?.[entry.project.id] ? 'Listo' : reason.startsWith('Falta') ? 'Falta material' :
      reason.startsWith('Te faltan') ? number(entry.cost) + ' monedas' : xp ? '+' + number(xp) + ' XP' : entry.cost ? number(entry.cost) + ' monedas' : '';
    if (isProvision(entry)) {
      const unavailable = restriction(entry);
      const name = entry.name.replace(/^Comprar /, '');
      const needs = Object.keys(entry.input).length ? 'Pide ' + itemText(entry.input) : '';
      return '<form class="tile provision' + (unavailable ? ' provision-off' : '') + '" data-provision="' + entry.id + '">' + recipeIcon(entry) +
        '<div class="provision-info"><strong>' + name + '</strong><small>' + itemText(entry.output) +
        (healing ? ' · <span class="food-heal">+' + healing + ' vida c/u</span>' : '') + '</small>' +
        (unavailable ? '<small class="provision-lock">' + icon('lock') + unavailable + '</small>' : needs ? '<small class="provision-need">' + needs + '</small>' : '') +
        '</div><div class="provision-price" title="Precio por compra · total"><b class="num">' + icon('coin') + '<span data-provision-total>' + number(entry.cost) +
        '</span></b><small class="num">' + number(entry.cost) + ' c/u</small></div>' +
        '<div class="provision-buy"><div class="qty" role="group" aria-label="Cantidad"><button type="button" data-provision-step="-1" aria-label="Uno menos">−</button>' +
        '<input type="number" name="quantity" value="1" min="1" max="9999" required inputmode="numeric" aria-label="Cantidad de ' + name + '">' +
        '<button type="button" data-provision-step="1" aria-label="Uno más">+</button><button type="button" class="qty-max" data-provision-step="max" title="Lo máximo que podés pagar">Máx</button></div>' +
        '<button type="submit" class="btn btn-small provision-submit"' + (unavailable ? ' disabled' : '') + '>Comprar</button></div></form>';
    }
    const state = running ? 'running' : locked ? 'locked' : reason ? 'missing' : 'ready';
    return '<button class="tile' + (locked ? ' tile-locked' : reason ? ' tile-wait' : '') + '" type="button" data-state="' + state + '" data-inspect="' + entry.id +
      '" title="' + entry.name + (reason ? ' · ' + reason : '') + '" aria-pressed="' + (entry === task) + '"' +
      (running ? ' data-running="true"' : '') + '>' + recipeIcon(entry) + (locked ? '<i class="tile-lock">' + icon('lock') + '</i>' : '') +
      ((entry.boss !== undefined || entry.challenge) && !locked ? '<i class="tile-threat threat-dot-' + threatLevel(forecast(entry, lv('hitpoints')).win).key + '"></i>' : '') +
      (entry.boss !== undefined && game.victories?.[entry.boss] ? '<i class="tile-won" title="Vencido ' + game.victories[entry.boss] + ' ' +
        (game.victories[entry.boss] === 1 ? 'vez' : 'veces') + '">' + icon('check') + '<b>×' + game.victories[entry.boss] + '</b></i>' : '') +
      '<strong>' + entry.name.replace(/^(Picar|Forjar|Fundir|Talar|Pescar|Cocinar|Tallar|Montar|Imbuir|Engarzar|Buscar|Extraer|Comprar|Preparar|Encargo de|Encargo) /, '')
        .replace(/ · (Espada|Arco|Magia|Precisión|Hechizo).*$/, '') + '</strong><small class="tile-status">' + status + '</small>' +
      (healing ? '<small class="food-heal">+' + healing + ' vida' + (entry.skill === 'fishing' ? ' al cocinar' : '') + '</small>' : '') + '</button>';
  }).join('') || '<p class="empty">Nada para hacer acá todavía.</p>';
  const actions = byId('actions');
  if (actions.dataset.markup !== actionMarkup) {
    const quantities = new Map([...actions.querySelectorAll('[data-provision]')].map(form =>
      [form.dataset.provision, form.elements.quantity.value]));
    actions.innerHTML = actionMarkup;
    actions.dataset.markup = actionMarkup;
    for (const form of actions.querySelectorAll('[data-provision]')) {
      if (quantities.has(form.dataset.provision)) form.elements.quantity.value = quantities.get(form.dataset.provision);
    }
  }
  for (const form of actions.querySelectorAll('[data-provision]')) syncProvision(form);
  byId('recipe-detail').hidden = marketSales || isProvision(task ?? {});
  if (!byId('recipe-detail').hidden) renderRecipe(task);
  renderRunHud(marketSales || isProvision(task ?? {}) ? undefined : task);
  if (focused?.inspect !== undefined) byId('actions').querySelector('[data-inspect="' + focused.inspect + '"]')?.focus({ preventScroll: true });
  const focusedTask = focused?.task ?? focused?.stopTask;
  if (focusedTask !== undefined) {
    byId('recipe-detail').querySelector('[data-task="' + focusedTask + '"], [data-stop-task="' + focusedTask + '"]')
      ?.focus({ preventScroll: true });
  }
  if (focused?.recipeCategory) categoryMenu.querySelector('[data-recipe-category="' + focused.recipeCategory + '"]')?.focus({ preventScroll: true });
  for (const key of keys) {
    const button = byId('skill-' + key);
    button.setAttribute('aria-pressed', tab === 'skills' && key === skill);
    if (run?.task.skill === key) button.dataset.running = 'true';
    else delete button.dataset.running;
  }
  renderStationMarkers();
}
function renderStationMarkers() {
  document.querySelectorAll('.marker').forEach(marker => {
    const active = marker.dataset.zone === zone;
    marker.classList.toggle('active', active);
    marker.setAttribute('aria-pressed', active);
  });
  renderQuestHighlight();
}
function renderHealth() {
  byId('hp').textContent = game.hp + '/' + lv('hitpoints');
  byId('hp-fill').style.width = game.hp * 100 / lv('hitpoints') + '%';
}
function renderStats() {
  renderHealth();
  byId('combat').textContent = combatLevel();
  byId('coins').textContent = number(game.coins);
  byId('total').textContent = number(totalLevel(game));
  byId('pack-count').textContent = bagSlots() + '/' + bagLimit;
  byId('prayer-status').textContent = 'Plegaria ' + prayerPoints() + '/' + lv('prayer');
  byId('prayer-toggle').setAttribute('aria-pressed', Boolean(prayerBonus()));
  byId('prayer-state').textContent = lv('prayer') < 5 ? 'Protección al nivel 5' :
    prayerBonus() ? 'Activa · ' + (prayerPoints() * 2 - Number(Boolean(game.prayerHalf))) + ' peleas restantes' :
    prayerPoints() ? 'Activar protección' : 'Sin puntos';
  byId('prayer-refill').hidden = zone !== 'arena' || prayerPoints() > 0;
  byId('tonic-status').hidden = true;   // el brebaje se nota en la protección; el cartel suelto no se entendía
  byId('tonic-status').textContent = game.tonic?.charges ? 'Brebaje · ' + game.tonic.charges + ' combates' : '';
  const completed = route.filter((_, index) => game.victories?.[index]).length;
  const next = route.findIndex((_, index) => !game.victories?.[index]);
  const mastered = next < 0 && keys.every(key => lv(key) === 99);
  byId('chapter-index').textContent = next < 0 ? '✦' : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][next];
  byId('chapter-title').textContent = next >= 0 ? route[next].title : mastered ? 'Maestro del valle' : 'Campeón del valle';
  byId('chapter-count').textContent = completed + ' / ' + route.length + ' jefes';
  byId('chapter-bar').style.width = completed * 100 / route.length + '%';
  renderQuestToggle();
  renderMapObjective(next);
  const pet = game.pets?.[game.pet] && pets[game.pet];
  byId('map-pet').hidden = !pet;
  renderMapPet(pet ? game.pet : '');
  byId('map-pet').title = pet ? pet[0] : '';
  for (const key of keys) {
    const button = byId('skill-' + key);
    button.querySelector('b').textContent = lv(key);
    button.querySelector('i').style.width = xpPercent(key) + '%';
    button.title = skills[key][0] + ' · ' + number(game.xp[key] || 0) + ' XP';
  }
}
const owned = item => (game.bag[item] || 0) + bankCount(item) + noteCount(item);
const stockForGoal = item => owned(item) + rationCount(item);
const stockText = item => 'Mochila ' + number(carriedStock(item)) + ' · Cofre ' + number(bankCount(item)) +
  (food[item] ? ' · Raciones ' + number(rationCount(item)) : '');
const equippedFood = () => (game.rations || []).reduce((sum, ration) => sum + ration.count, 0);
const tutorialFoodCount = 6;
// Busca el primer paso concreto que falta para tener `qty` de un objeto: subir un nivel o hacer una actividad.
function planFor(item, qty = 1, goal = item, depth = 0) {
  const have = stockForGoal(item);
  if (have >= qty || depth > 32) return null;
  const task = sourceFor(item);
  if (!task || task.enemy) return null;
  const needs = [[task.skill, task.level], ...Object.entries(task.requires)].find(([skill, level]) => skill && lv(skill) < level);
  if (needs) return { kind: 'level', skill: needs[0], level: needs[1], goal };
  if (lacksTool(task)) {
    const tool = requiredTool(task);
    if (!owned(tool)) return planFor(tool, 1, tool, depth + 1);
    const equipment = gear[tool];
    if (lv(equipment.skill) < equipment.level) return { kind: 'level', skill: equipment.skill, level: equipment.level, goal: tool };
    return { kind: 'equip', item: tool };
  }
  const cycles = Math.ceil((qty - have) / task.output[item]);
  for (const [input, need] of Object.entries(task.input)) {
    const step = planFor(input, need * cycles, goal, depth + 1);
    if (step) return step;
  }
  return { kind: 'make', task, item, have, qty, goal };
}
function gearStep(task) {
  const item = Object.keys(task.output)[0];
  const entry = gear[item];
  if (!owned(item)) return planFor(item, 1);
  if (lv(entry.skill) < entry.level) return { kind: 'level', skill: entry.skill, level: entry.level, goal: item };
  return { kind: 'equip', item };
}
const bronzeRecipe = slot => tasks.find(task => task.zone === 'forge' && task.group === 'Bronce' &&
  gear[Object.keys(task.output)[0]]?.slot === slot);
const tutorialPick = bronzeRecipe('pick');
const tutorialKit = ['axe', 'weapon', 'shield', 'head', 'body', 'legs'].map(bronzeRecipe);
function bronzeTutorialStep() {
  const kitStarted = tutorialKit.some(task => owned(Object.keys(task.output)[0]));
  if (!bonusOf('pick') && !kitStarted) {
    return { ...gearStep(tutorialPick), stage: 'Tu primer pico',
      hint: 'Picá 2 de cobre y 2 de estaño, fundí las barras y equipá el pico para minar más rápido.' };
  }
  const pending = tutorialKit.filter(task => !bonusOf(gear[Object.keys(task.output)[0]].slot));
  if (!pending.length) return null;
  const bar = barOf('bronce');
  const bars = pending.reduce((sum, task) => sum + (owned(Object.keys(task.output)[0]) ? 0 : task.input[bar]), 0);
  const missing = pending.find(task => !owned(Object.keys(task.output)[0]));
  const step = planFor(bar, bars, 'tu equipo de bronce') ?? gearStep(missing ?? pending[0]);
  return { ...step, stage: 'Equipo de bronce',
    hint: 'Prepará el hacha, la espada, el escudo, el casco, el peto y las grebas. Cada barra se funde con 1 cobre y 1 estaño.' };
}
function foodTutorialStep() {
  const item = cookedFish[0];
  const missing = tutorialFoodCount - equippedFood();
  if (missing <= 0) return null;
  const qty = rationCount(item) + missing;
  const step = planFor(item, qty, 'llevar comida a la pelea');
  const details = { stage: 'Comida para el Rey de las ratas',
    hint: 'Pescá en el muelle y cociná en el Hogar. Cada camarón cura 3 de vida y se equipa automáticamente.' };
  if (step) return { ...step, ...details };
  return { ...details, kind: 'ration', item };
}
function bossForgePlan(tier) {
  const bar = barOf(metals[tier].name);
  const smelt = tasks.find(task => task.output[bar]);
  const slotsToForge = ['head', 'body', 'legs', 'shield', 'ring'];
  if (arenaStyle === 'melee') slotsToForge.push('weapon');
  const equipment = tier === 0 ? [tutorialPick, ...tutorialKit] : tasks.filter(task => task.zone === 'forge' && task.group !== 'Plata y oro' &&
    task.level === bands[tier] && task.input[bar] && slotsToForge.includes(gear[Object.keys(task.output)[0]]?.slot));
  const pending = equipment.filter(task => {
    const entry = gear[Object.keys(task.output)[0]];
    return bonusOf(entry.slot) < entry.bonus;
  });
  const bars = pending.reduce((sum, task) => {
    const item = Object.keys(task.output)[0];
    return sum + (owned(item) ? 0 : task.input[bar]);
  }, 0);
  const unfunded = Math.max(0, bars - owned(bar));
  const minerals = Object.entries(smelt.input).map(([item, count]) => ({
    item, have: owned(item), need: count * Math.ceil(unfunded / smelt.output[bar]),
  })).filter(entry => entry.need);
  return { bar, bars, minerals, pending };
}
function questStep(target, tier, mastery, forgePlan) {
  const tutorial = tier === 0 && !mastery;
  if (tutorial) {
    const equipment = bronzeTutorialStep();
    if (equipment) return equipment;
    const foodStep = foodTutorialStep();
    if (foodStep) return foodStep;
  }
  if (!tutorial && forgePlan.bars) {
    const materials = planFor(forgePlan.bar, forgePlan.bars, 'el equipo del jefe');
    if (materials) return materials;
  }
  if (!tutorial && forgePlan.pending.length) {
    return gearStep(forgePlan.pending.find(task => !owned(Object.keys(task.output)[0])) ?? forgePlan.pending[0]);
  }
  const slot = combatSlots[arenaStyle];
  const craftable = task => gear[Object.keys(task.output)[0]];
  // El arma del tramo (espada, arco o bastón) se pide siempre, no solo en Maestría.
  if (bonusOf(slot) < (target.minWeapon ?? tier + 1)) {
    const weapon = tasks.findLast(task => craftable(task)?.slot === slot && task.level <= bands[tier]);
    if (weapon) return gearStep(weapon);
  }
  if (protection() < target.minProtection) {
    for (const piece of ['body', 'head', 'legs', 'shield', 'ring']) {
      const armor = tasks.findLast(task => task.zone === 'forge' && craftable(task)?.slot === piece &&
        task.level <= bands[tier] && task.group !== 'Plata y oro');
      if (armor && gear[Object.keys(armor.output)[0]].bonus > bonusOf(piece)) return gearStep(armor);
    }
  }
  // Antes de cada jefe, las habilidades del estilo (y Defensa) tienen que llegar al nivel del tramo.
  // Con espada se rota Ataque, Fuerza y Defensa; con arco o magia, el estilo y Defensa.
  const recommended = tutorial ? 6 : bands[tier];
  const focus = arenaStyle === 'melee' ? meleeFocus() : lv(arenaStyle) <= lv('defence') ? arenaStyle : 'defence';
  if (lv(focus) < recommended) {
    const training = trainingFor(focus);
    const step = { kind: 'level', skill: focus, level: recommended, why: 'tramo' };
    const [ammo] = Object.keys(training.input);
    if (ammo && carriedStock(ammo) < 1) return planFor(ammo, owned(ammo) + 150 * (training.battleTier + 1), ammo) || step;
    return step;
  }
  if (!tutorial && target.boss !== undefined && forecast(target, lv('hitpoints')).win < .9) {
    // Primero el pescado que ya sabés preparar; si no alcanza, el del tramo (pescándolo o comprándolo).
    const index = Math.min(tier, bands.findLastIndex(level => level <= Math.min(lv('cooking'), lv('fishing'))));
    const reachable = cookedFish[Math.max(0, index)];
    const item = foodNeeded(target, reachable) !== null ? reachable : cookedFish[tier];
    const needed = foodNeeded(target, item);
    if (needed !== null && rationCount(item) >= needed && game.rations[0]?.item !== item &&
      forecast(target, lv('hitpoints')).win < .9) return { kind: 'priority', item };
    if (needed !== null && rationCount(item) < needed) {
      const hint = { stage: 'Prepará raciones', hint: 'Cada ' + item.toLowerCase() + ' cura ' + food[item] +
        '. Podés pescarlo y cocinarlo, o comprarlo en el Mercado.' };
      const step = planFor(item, needed, 'llevar comida a la pelea');
      if (step) return { ...step, ...hint };
      return { kind: 'ration', item };
    }
    // Si ni con comida alcanza, conviene subir la habilidad de combate más atrasada.
    const lagging = arenaStyle === 'melee' ? meleeFocus() : lv(arenaStyle) <= lv('defence') ? arenaStyle : 'defence';
    if (needed === null && lv(lagging) < 99) return { kind: 'level', skill: lagging, level: lv(lagging) + 3,
      goal: 'aguantar a ' + target.enemy.name, why: 'comida' };
  }
  const [ammo] = Object.keys(target.input);
  if (ammo && carriedStock(ammo) < 1) return planFor(ammo, owned(ammo) + 20, ammo) || { kind: 'boss' };
  return { kind: 'boss' };
}
// Cuántas porciones de una comida harían falta para ganarle a un rival con margen; null si ni así alcanza.
function foodNeeded(task, item) {
  const player = combatPlayer(task);
  const maxHp = lv('hitpoints');
  const key = JSON.stringify(['food', task.id, maxHp, player, food[item]]);
  const result = cachedForecast(key, () => forecastFight({ player, enemy: task.enemy, weakness: task.style === task.enemy.weak,
    enrageAt: enrageFor(task), hp: maxHp, maxHp, rations: [{ heal: food[item], count: 200 }], seed: 4242 }, 200));
  return result.win < .85 ? null : Math.ceil(result.bites * 1.4) + 2;
}
function renderMapObjective(next) {
  const mastery = next < 0;
  const tier = mastery ? bands.length - 1 : next;
  const target = tasks.find(task => task.style === arenaStyle && (mastery ? task.challenge : task.boss === tier));
  const slot = combatSlots[arenaStyle];
  const forgePlan = bossForgePlan(tier);
  let step = questStep(target, tier, mastery, forgePlan);
  // Si para entrenar falta un insumo, el paso pasa a ser conseguir una tanda de ese insumo.
  for (let depth = 0; step.kind === 'level' && depth < 4; depth++) {
    const training = trainingFor(step.skill);
    if (run?.task === training) break;
    const missing = Object.entries(training.input).find(([item, need]) => owned(item) < need);
    const sub = missing && planFor(missing[0], missing[1] * 40 * (tierOf(training) + 1), skills[step.skill][0] + ' ' + step.level);
    if (!sub) break;
    step = sub;
  }
  const task = step.task ?? (step.kind === 'level' ? trainingFor(step.skill) : step.kind === 'boss' ? target : undefined);
  lastQuestStep = { ...step, task, target };
  const missingInput = task && Object.entries(task.input).find(([item, amount]) =>
    ingredientStock(task, item) < amount && bankCount(item) > 0)?.[0];
  const needsBank = missingInput;
  questTarget = { task: needsBank ? undefined : task, zone: needsBank ? 'camp' : task?.zone ?? 'camp',
    item: missingInput ?? step.item, homeTab: needsBank ? 'Banco' : step.kind === 'equip' || step.kind === 'ration' || step.kind === 'priority' ? 'Inventario' : undefined };
  const text = step.kind === 'make' ? step.task.name + ' · ' + number(step.have) + '/' + number(step.qty) :
    step.kind === 'equip' ? 'Equipá ' + step.item :
    step.kind === 'ration' ? 'Equipá ' + step.item.toLowerCase() :
    step.kind === 'priority' ? 'Poné ' + step.item.toLowerCase() + ' primero en tus raciones' :
    step.kind === 'level' ? 'Subí ' + skills[step.skill][0] + ' a ' + step.level + ' · actual ' + lv(step.skill) :
    'Enfrentá a ' + target.enemy.name;
  const check = (label, value, met) => '<li class="' + (met ? 'ready' : '') + '"><span class="qc-mark" aria-hidden="true">' + (met ? icon('check') : '') +
    '</span>' + label + '<b>' + value + '</b></li>';
  const [ammo] = Object.keys(target.input);
  const styles = Object.entries(combatLabels).map(([style, label]) =>
    '<button type="button" data-route-style="' + style + '" aria-pressed="' + (style === arenaStyle) + '">' + label + '</button>').join('');
  const minerals = forgePlan.minerals.map(({ item, have, need }) =>
    '<span class="' + (have >= need ? 'ready' : '') + '" title="En mochila y cofre / necesarios">' +
    item + ' <b>' + number(have) + '/' + number(need) + '</b></span>').join('');
  const bankHint = missingInput ? 'Te falta llevar ' + missingInput.toLowerCase() + ' desde el cofre.' : '';
  const html = '<p class="quest-step"><small>Recomendación · ' + zones[task?.zone ?? questTarget.zone][0] + '</small>' + text + '</p>' +
    (minerals ? '<div class="quest-minerals" aria-label="Minerales para el equipo del jefe">' + minerals + '</div>' : '') +
    (bankHint ? '<p class="quest-hint">' + bankHint + '</p>' : '') +
    '<details class="quest-more"><summary>Preparación para ' + target.enemy.name + '</summary><ul class="quest-checks">' +
    check('Arma de ' + combatLabels[arenaStyle].toLowerCase(), '+' + bonusOf(slot), bonusOf(slot) > 0) +
    check('Protección', '+' + protection(), protection() > 0) +
    check('Raciones', number(equippedFood()), equippedFood() > 0) +
    (ammo ? check(ammo, number(carriedStock(ammo)), carriedStock(ammo) > 0) : '') +
    '</ul>' + ('<div class="chip-row goal-styles" role="group" aria-label="Estilo de combate para la guía">' + styles + '</div>') + '</details>';
  const board = byId('map-objective');
  if (board.dataset.content !== html) {
    const open = board.querySelector('details')?.open;
    const focus = board.contains(document.activeElement) ? document.activeElement.dataset : {};
    board.innerHTML = html;
    board.dataset.content = html;
    if (open) board.querySelector('details').open = true;
    if (focus.routeStyle) board.querySelector('[data-route-style="' + focus.routeStyle + '"]')?.focus({ preventScroll: true });
  }
}
function renderQuestHighlight() {
  const target = byId('map-objective').hidden ? undefined : questTarget;
  const task = target?.task;
  const taskId = task && String(task.id);
  const inZone = zone === target?.zone;
  for (const node of document.querySelectorAll('.marker, [data-inspect], [data-provision], [data-inspect-item], [data-bank-form], [data-home-tab], [data-activity-group], [data-recipe-category], #recipe-detail, [data-combat-style], [data-combat-train]')) {
    const data = node.dataset;
    const matchesItem = target?.homeTab && (data.inspectItem === target.item ||
      data.bankForm === target.item ||
      inZone && (data.homeTab === target.homeTab || data.activityGroup === target.homeTab));
    const matchesTask = task && (data.inspect === taskId || data.provision === taskId || node.id === 'recipe-detail' && inZone && guidedTask === task.id);
    const matchesFilter = task && inZone && (data.activityGroup === task.group || data.homeTab === task.group ||
      data.recipeCategory && data.recipeCategory === recipeCategory(task) || data.combatStyle && data.combatStyle === task.style ||
      data.combatTrain && data.combatTrain === task.train);
    node.classList.toggle('quest-target', Boolean(matchesItem || matchesTask || matchesFilter || node.classList.contains('marker') && data.zone === target?.zone));
  }
}
function gearDetail(entry) {
  if (armorSlots.includes(entry.slot)) return 'Protección +' + entry.bonus + (entry.ranged ? ' · Puntería +' + entry.ranged : '');
  if (entry.slot === 'pick' || entry.slot === 'axe') return 'Velocidad +' + entry.bonus * 8 + '%';
  if (entry.slot === 'neck') return 'Potencia +' + entry.bonus + ' en los tres estilos';
  return 'Potencia +' + entry.bonus;
}
function gearComparison(item) {
  const entry = gear[item];
  if (!entry) return '';
  const current = game.equipped[entry.slot];
  if (current === item) return '<small class="compare-caption">Equipado</small>';
  const worn = gear[current];
  const speed = entry.slot === 'pick' || entry.slot === 'axe';
  const stat = speed ? 'Velocidad' : armorSlots.includes(entry.slot) ? 'Protección' : 'Potencia';
  const unit = speed ? '%' : '';
  const factor = speed ? 8 : 1;
  const compare = (label, before, after, suffix = '') => {
    const diff = after - before;
    return '<span class="compare-stat"><small>' + label + '</small><b>' + before + suffix + '<i aria-hidden="true">→</i>' + after + suffix +
      '</b><strong class="' + (diff > 0 ? 'stat-up' : diff < 0 ? 'stat-down' : 'stat-same') + '">' +
      (diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= ') + diff + suffix + '</strong></span>';
  };
  return '<div class="gear-compare"><small class="compare-caption">Frente a lo equipado: <b>' + (current ?? 'ranura vacía') + '</b></small>' +
    compare(stat, (worn?.bonus ?? 0) * factor, entry.bonus * factor, unit) +
    (entry.ranged || worn?.ranged ? compare('Puntería', worn?.ranged ?? 0, entry.ranged ?? 0) : '') + '</div>';
}
// Figura de la hoja del personaje: el mismo héroe del mapa, con tu cara (pelo, piel, ojos, barba) y todo lo que tenés
// equipado (casco, peto, grebas, escudo, guantes y arma). Antes se mostraba un caballero pintado genérico por tramo.
function dollArt() {
  return heroEquipmentArt('fight-melee');
}
const slotHints = { weapon: 'sword', bow: 'bow', staff: 'staff', head: 'helmet', body: 'body', legs: 'legs', shield: 'shield',
  hands: 'fist', ring: 'ring', neck: 'amulet', pick: 'pick', axe: 'axe' };
function equipmentSlot(slot) {
  const item = game.equipped[slot];
  if (gear[item]) {
    const requirement = equipRequirement(item);
    const inactive = (slot === 'pick' || slot === 'axe') && !meetsEquipLevel(gear[item]);
    const detail = item + ' · ' + gearDetail(gear[item]) +
      (requirement ? ' · Pide ' + requirement : '') + (inactive ? ' · Herramienta inactiva' : '');
    return '<button type="button" class="io eq eq-' + slot + '" data-unequip="' + slot + '" title="' + detail +
      ' · tocá para quitar" aria-label="Quitar ' + detail + '">' + itemBadge(item) + '</button>';
  }
  return '<span class="io io-empty eq eq-' + slot + '" title="' + slots[slot] + ' · vacío"><span class="slot">' + icon(slotHints[slot], '#8d8672') + '</span></span>';
}
function itemActions(item, fromBank = false) {
  if (!item) return '<p class="empty">' + icon('pack', '#9b6b3c') + 'Tocá un objeto de la mochila para ver qué hace y compararlo con tu equipo.</p>';
  const producer = sourceFor(item);
  const equipment = gear[item];
  const requirement = equipRequirement(item);
  const effect = equipment ? gearDetail(equipment) + (requirement ? ' · pide ' + requirement : '') :
    food[item] ? '+' + food[item] + ' de vida' + (tonics[item] ? ' · protección +' + tonics[item] : '') :
    tonics[item] ? 'Protección +' + tonics[item] + ' por ' + tonicCharges(item) + ' combates' : 'Material';
  const use = tasks.find(task => Object.hasOwn(task.input, item) && !lacksTool(task));
  const safe = document.createElement('b');
  safe.textContent = item;
  return '<div class="item-strip">' + itemBadge(item, '', 'slot-big') + '<div class="item-info">' + safe.outerHTML + '<small>' + effect +
    '</small>' +
    gearComparison(item) + '<span class="item-links"><small class="item-value" title="Precio de venta de una unidad">' + icon('coin') + number(saleTotal(item, 1)) + '</small>' +
    (producer ? '<button type="button" class="next-chip" data-jump="' + producer.id + '">Sale de ' + zones[producer.zone][0] + '</button>' : '') +
    (use ? '<button type="button" class="next-chip" data-jump="' + use.id + '">Se usa en ' + zones[use.zone][0] + '</button>' : '') +
    '</span></div><div class="item-buttons">' +
    (equipment ? '<button type="button" class="btn btn-small" data-item="' + item + '"' + (fromBank ? ' data-from-bank="true"' : '') +
      (isEquipped(item) ? ' disabled' : '') + '>Equipar</button>' : '') +
    (food[item] ? '<button type="button" class="btn btn-small" data-item="' + item + '"' +
      (!tonics[item] && game.hp >= lv('hitpoints') ? ' disabled' : '') + '>Comer</button><button type="button" class="btn btn-small btn-ghost" data-equip-ration="' +
      item + '">Ración</button>' : '') + '</div></div>';
}
const homeTabs = active => '<nav class="seg home-tabs" aria-label="Hogar">' + zoneGroups.camp.map(label =>
  '<button type="button" data-home-tab="' + label + '" aria-pressed="' + (label === active) + '">' + groupLabel(label) + '</button>').join('') + '</nav>';
function packTiles() {
  const tiles = [];
  for (const [inventory, isNote] of [[game.bag, false], [game.notes ?? {}, true]]) {
    for (const item of Object.keys(inventory)) {
      const count = isNote ? noteCount(item) : bagCount(item);
      const slots = isNote ? Number(count > 0) : slotsFor(item, count);
      const label = item + (isNote ? ' (lote)' : '') + (count > 1 ? ' ×' + number(count) : '');
      const attributes = isNote ? ' data-inspect-note="' + item + '"' : ' data-inspect-item="' + item + '"';
      const pressed = tab === 'bag' ? ' aria-pressed="' + (inspectedItem === item && inspectedNote === isNote) + '"' : '';
      const tile = '<button type="button" class="io pack-tile" title="' + label + '" aria-label="' + label + '"' + attributes + pressed + '>' +
        itemBadge(item) + (count > 1 ? '<b>' + number(count) + '</b>' : '') +
        '</button>';
      if (slots) tiles.push(tile);
    }
  }
  while (tiles.length < bagLimit) tiles.push('<span class="io io-empty" aria-hidden="true"></span>');
  return tiles;
}
function renderPack() {
  const tiles = packTiles();
  const row = byId('pack-row');
  const markup = tiles.slice(packPage * 14, (packPage + 1) * 14).join('');
  if (row.dataset.markup !== markup) {
    row.innerHTML = markup;
    row.dataset.markup = markup;
  }
  byId('pack-prev').disabled = packPage === 0;
  byId('pack-next').disabled = packPage === 1;
}
// Cantidades al estilo OSRS: cortas para que nunca tapen el ícono (120 · 45K · 3M).
const shortCount = value => value < 100000 ? number(value) : value < 1e7 ? Math.floor(value / 1000) + 'K' : Math.floor(value / 1e6) + 'M';
const skillTitle = skill => skills[skill][0] + ' · nivel ' + lv(skill) + ' · ' + number(game.xp[skill] || 0) + ' XP' +
  (lv(skill) < 99 ? ' · faltan ' + number(xpAt[lv(skill) + 1] - (game.xp[skill] || 0)) + ' para el ' + (lv(skill) + 1) : ' · nivel máximo');
function renderBag() {
  const tabs = byId('bag-home-tabs');
  tabs.hidden = !homeInventory;
  if (!tabs.innerHTML) tabs.innerHTML = homeTabs('Inventario');
  byId('panel-bag').classList.toggle('at-home', homeInventory);
  const sheet = byId('character-sheet');
  const focus = sheet.contains(document.activeElement) ? document.activeElement.dataset : {};
  byId('bag-title').textContent = homeInventory ? 'Hogar' : character?.name ?? 'Personaje';
  byId('inventory-count').innerHTML = '<span title="Nivel de combate">' + icon('swords') + 'Combate <b>' + combatLevel() + '</b></span>' +
    '<span title="Suma de todos los niveles">Nivel total <b>' + number(totalLevel(game)) + '</b></span>';
  const questItem = !byId('map-objective').hidden && questTarget?.homeTab === 'Inventario' && gear[questTarget.item] &&
    bankCount(questTarget.item) ? questTarget.item : undefined;
  const carried = Object.keys(game.bag).filter(item => bagCount(item) > 0).sort((a, b) =>
    Number(Boolean(gear[b])) - Number(Boolean(gear[a])) || a.localeCompare(b, 'es'));
  if (inspectedNote ? !noteCount(inspectedItem) : !carried.includes(inspectedItem)) inspectedItem = undefined;
  const tiles = carried.map(item => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'io' + (isEquipped(item) ? ' io-worn' : '');
    tile.dataset.inspectItem = item;
    tile.title = item + ' ×' + number(bagCount(item));
    tile.setAttribute('aria-pressed', item === inspectedItem && !inspectedNote);
    tile.innerHTML = itemBadge(item) + (bagCount(item) > 1 ? '<b>' + shortCount(bagCount(item)) + '</b>' : '');
    return tile.outerHTML;
  });
  for (const item of Object.keys(game.notes ?? {}).filter(noteCount)) {
    tiles.push('<button type="button" class="io io-note" data-inspect-note="' + item + '" title="' + item + ' (lote) ×' + number(noteCount(item)) +
      '" aria-pressed="' + (inspectedNote && inspectedItem === item) + '">' + itemBadge(item) + '<b>' + shortCount(noteCount(item)) + '</b></button>');
  }
  const empty = Math.max(0, bagLimit - bagSlots());
  const style = arenaStyle === 'melee' ? 'weapon' : arenaStyle === 'ranged' ? 'bow' : 'staff';
  const maxed = keys.filter(key => lv(key) === 99).length;
  sheet.innerHTML = '<div class="cs-top"><section class="cs-block cs-gear" aria-labelledby="cs-gear-title"><h2 id="cs-gear-title">Equipo</h2>' +
    '<div class="doll"><div class="doll-preview" aria-hidden="true">' + dollArt() + '</div>' +
    ['head', 'neck', 'weapon', 'hands', 'body', 'legs', 'shield', 'ring'].map(equipmentSlot).join('') + '</div>' +
    '<div class="doll-extra" aria-label="Armas a distancia y herramientas">' + ['bow', 'staff', 'pick', 'axe'].map(equipmentSlot).join('') + '</div>' +
    '<div class="doll-bonus">' + chip(icon('shield', '#6f8fd8'), '+' + protection(), 'Protección total', 'chip-stat') +
    chip(icon(slotHints[style], '#cfd8dd'), '+' + (bonusOf(style) + bonusOf('neck')), 'Potencia del arma y el amuleto', 'chip-stat') + '</div>' +
    '<h3>Raciones<small>en orden</small></h3><div class="grid-rations" title="Se comen en este orden">' + (rationSlots(true) || '<small class="rations-empty">Sin comida equipada</small>') + '</div></section>' +
    '<section class="cs-block cs-bag" aria-labelledby="cs-bag-title"><h2 id="cs-bag-title">Mochila<span class="num">' + bagSlots() + ' / ' + bagLimit + '</span></h2><div class="grid-bag">' + tiles.join('') +
    '<span class="io io-empty"></span>'.repeat(empty) + '</div></section></div>' +
    (questItem && !carriedStock(questItem) && homeInventory ? '<section class="cs-block quest-target"><h2>En el cofre</h2>' +
      itemActions(questItem, true) + '</section>' : '') +
    '<section class="cs-block cs-item' + (inspectedItem ? '' : ' cs-item-empty') + '">' + itemActions(inspectedItem) + '</section>' +
    '<section class="cs-block cs-skills" aria-labelledby="cs-skills-title"><h2 id="cs-skills-title">Habilidades<span class="num">' + maxed + ' / ' + keys.length + ' al 99</span></h2><div class="grid-skills">' +
    keys.map(skill => '<button type="button" class="stat' + (lv(skill) === 99 ? ' stat-max' : '') + '" data-skill="' + skill + '" title="' + skillTitle(skill) +
      ' · tocá para entrenar">' + skillIcon(skill) + '<small>' + skills[skill][0].replace('Creación de runas', 'Runas').replace('Cazador de monstruos', 'Cazador') +
      '</small><b>' + lv(skill) + '</b><i class="bar"><i style="width:' + xpPercent(skill) + '%"></i></i></button>').join('') + '</div></section>';
  if (focus.inspectItem) Array.from(sheet.querySelectorAll('[data-inspect-item]')).find(button => button.dataset.inspectItem === focus.inspectItem)?.focus({ preventScroll: true });
  if (focus.unequip) sheet.querySelector('[data-unequip="' + focus.unequip + '"]')?.focus({ preventScroll: true });
  renderQuestHighlight();
}
function renderBank() {
  const content = byId("bank-content");
  const ready = atHome() && !destination;
  const slots = bagSlots();
  const state = JSON.stringify([ready, slots, bankSelection, game.bankSorted, game.bankPins, game.bag, game.notes, game.bank, game.equipped]);
  if (content.renderedBankState === state) return;
  content.renderedBankState = state;
  byId("bank-capacity").textContent = slots + " / " + bagLimit;
  byId("bank-space").value = slots;
  const makeEntries = (stock, direction, notes = false) => Object.keys(stock).map(item => ({
    item, direction, notes, count: direction === "withdraw" ? bankCount(item) : notes ? noteCount(item) : bagCount(item),
  })).filter(entry => entry.count);
  const carried = [...makeEntries(game.bag, "deposit"), ...makeEntries(game.notes ?? {}, "deposit", true)];
  const stored = makeEntries(game.bank, "withdraw");
  if (game.bankSorted) stored.sort((a, b) => a.item.localeCompare(b.item, "es"));
  const key = ({ item, direction, notes }) => direction + ":" + bankPinKey(item, notes);
  const pinnedCount = carried.filter(entry => game.bankPins?.[bankPinKey(entry.item, entry.notes)]).length;
  const selected = [...carried, ...stored].find(entry => key(entry) === bankSelection);
  const disabled = ready ? "" : " disabled";
  // Cada objeto es un casillero; el elegido abre abajo la barra para guardar o retirar por cantidad.
  const rows = entries => entries.map(entry => {
    const { item, count, direction, notes } = entry;
    const label = item + (notes ? ' (lote)' : '');
    const pinned = direction === 'deposit' && Boolean(game.bankPins?.[bankPinKey(item, notes)]);
    return '<button type="button" class="io bank-tile' + (notes ? ' io-note' : '') + (pinned ? ' bank-pinned' : '') + '" data-bank-select="' + key(entry) +
      '" data-bank-form="' + item + '" aria-pressed="' + (entry === selected) + '" aria-controls="bank-info" title="' + label + ' ×' + number(count) +
      (pinned ? ' · se conserva al guardar todo' : '') + '" aria-label="' + label + ', ' + number(count) + '">' + itemBadge(item) +
      (count > 1 || notes ? '<b>' + shortCount(count) + '</b>' : '') + (pinned ? '<i class="bank-pin-mark" aria-hidden="true">' + bankPinIcon + '</i>' : '') + '</button>';
  }).join('') || '<small class="bank-empty">Sin objetos</small>';
  let details = '<p class="bank-inspector bank-inspector-empty">Elegí un objeto para guardarlo o retirarlo.</p>';
  if (selected) {
    const { item, count, notes, direction } = selected;
    const withdraw = direction === 'withdraw';
    const label = item + (notes ? ' (lote)' : '');
    const pin = bankPinKey(item, notes);
    const pinned = Boolean(game.bankPins?.[pin]);
    const equipment = gear[item];
    const requirement = equipRequirement(item);
    const stats = equipment ? gearDetail(equipment) + (requirement ? ' · Pide ' + requirement : '') :
      food[item] ? '+' + food[item] + ' vida por porción' : 'Material';
    details = '<form class="bank-inspector bank-entry" data-transfer-item="' + item + '" data-entry="' + key(selected) + '" data-direction="' + direction +
      '" data-note="' + notes + '"><div class="bank-inspect-head">' + itemBadge(item, '', 'slot-big') +
      '<div class="bank-inspect-text"><strong>' + label + '</strong><small>' + stats + ' · <span class="num">×' + number(count) + '</span> ' +
      (withdraw ? 'guardados' : 'en la mochila') + '</small><small class="item-value" title="Venta de una unidad · de todo">' + icon('coin') + number(saleTotal(item, 1)) +
      ' c/u · ' + number(saleTotal(item, count)) + ' todo</small></div>' +
      (withdraw ? '' : '<button type="button" class="bank-control bank-pin" data-bank-pin="' + pin + '" title="Conservar al guardar todo" aria-label="Conservar ' +
        label + ' al guardar todo" aria-pressed="' + pinned + '"' + disabled + '>' + bankPinIcon + '<span>' + (pinned ? 'Conservado' : 'Conservar') + '</span></button>') +
      '</div>' + gearComparison(item) +
      '<fieldset class="bank-actions" aria-label="' + (withdraw ? 'Retirar ' : 'Guardar ') + label + '"' + disabled + '>' +
      '<div class="bank-stepper" role="group" aria-label="Ajustar cantidad">' +
      '<button type="button" class="bank-control" data-bank-amount="-1" aria-label="Bajar cantidad">−</button>' +
      '<input class="bank-control bank-quantity" type="number" inputmode="numeric" name="quantity" min="1" max="' + count +
      '" value="1" required aria-label="Cantidad de ' + label + '">' +
      '<button type="button" class="bank-control" data-bank-amount="1" aria-label="Subir cantidad">+</button></div>' +
      '<div class="bank-presets">' + [5, 10].filter(amount => amount < count).map(amount =>
        '<button type="button" class="bank-control" data-bank-amount="=' + amount + '">' + amount + '</button>').join('') +
      '<button class="bank-control" type="button" data-bank-amount="all" title="Poner la cantidad total">Todo</button></div>' +
      '<button class="bank-control bank-commit" type="submit">' + (withdraw ? 'Retirar' : 'Guardar') + '</button></fieldset></form>';
  }
  const markup = homeTabs('Banco') + '<div class="bank-toolbar"><button type="button" class="bank-control bank-store-all" data-deposit-all="true"' +
    disabled + '>' + icon('chest', '#dba158') + '<span>Guardar todo</span></button><small class="bank-hint">' +
    (ready ? 'Tocá un objeto para moverlo. Los retiros del mismo objeto ocupan un solo espacio.' : 'Disponible al llegar al Hogar') + '</small>' +
    (pinnedCount ? '<small class="bank-keep-count">' + pinnedCount + (pinnedCount === 1 ? ' conservado' : ' conservados') + '</small>' : '') +
    '</div><div class="bank-columns">' +
    '<section aria-labelledby="bank-carried-title"><div class="bank-column-head"><h2 id="bank-carried-title">Mochila</h2><span class="num">' + slots + ' / ' + bagLimit + '</span></div><div class="bank-grid">' + rows(carried) +
    '</div></section><section aria-labelledby="bank-stored-title"><div class="bank-column-head"><h2 id="bank-stored-title">Guardado</h2>' +
    '<button class="bank-control bank-sort" type="button" data-bank-sort title="Alternar orden alfabético" aria-pressed="' + Boolean(game.bankSorted) +
    '"><span aria-hidden="true">↕</span> A–Z</button></div><div class="bank-grid">' + rows(stored) + '</div></section></div>' +
    '<div id="bank-info">' + details + '</div>';
  if (content.renderedMarkup !== markup) {
    const active = document.activeElement;
    const activeForm = active?.closest(".bank-entry");
    const activeIndex = activeForm ? [...activeForm.elements].indexOf(active) : -1;
    const drafts = new Map([...content.querySelectorAll(".bank-entry")].map(form =>
      [form.dataset.entry, form.elements.quantity.value]));
    content.innerHTML = markup;
    content.renderedMarkup = markup;
    for (const form of content.querySelectorAll(".bank-entry")) {
      const input = form.elements.quantity;
      const draft = drafts.get(form.dataset.entry);
      if (draft !== undefined) input.value = draft === "" ? "" : Math.min(Number(draft), Number(input.max));
      if (form.dataset.entry === activeForm?.dataset.entry && activeIndex >= 0) {
        form.elements[activeIndex]?.focus({ preventScroll: true });
      }
    }
    if (active?.matches("[data-bank-sort]")) content.querySelector("[data-bank-sort]").focus({ preventScroll: true });
    if (active?.dataset.bankSelect) content.querySelector('[data-bank-select="' + CSS.escape(active.dataset.bankSelect) + '"]')?.focus({ preventScroll: true });
  }
  renderQuestHighlight();
}
const bankPinIcon = '<svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10-4 4m6-2L4 8l2-1 3-3V2l5 5h-2l-3 3-1 2Z"/></svg>';
byId("bank-content").addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const { bankAmount, bankSelect, bankPin, bankSort } = button.dataset;
  if (bankAmount) {
    const input = button.form.elements.quantity;
    const current = input.valueAsNumber || 1;
    input.value = bankAmount === "all" ? input.max : bankAmount.startsWith("=") ? Math.min(Number(input.max), Number(bankAmount.slice(1))) :
      Math.max(1, Math.min(Number(input.max), current + Number(bankAmount)));
  } else if (bankSelect) {
    bankSelection = bankSelection === bankSelect ? undefined : bankSelect;
    renderBank();
  } else if (bankPin && atHome() && !destination) {
    game.bankPins ??= {};
    if (game.bankPins[bankPin]) delete game.bankPins[bankPin];
    else game.bankPins[bankPin] = true;
    save();
    renderBank();
  } else if (bankSort !== undefined) {
    game.bankSorted = !game.bankSorted;
    save();
    renderBank();
  }
});
byId("bank-content").addEventListener("submit", event => {
  const form = event.target;
  if (!form.dataset.transferItem) return;
  event.preventDefault();
  const quantity = form.elements.quantity.valueAsNumber;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > Number(form.elements.quantity.max)) return;
  bankTransfer(form.dataset.transferItem, form.dataset.direction, quantity,
    form.dataset.note === "true");
});
function renderPackFull() {
  if (capacityTask && fitsOutput(capacityTask, activityOutput(capacityTask))) capacityTask = undefined;
  if (bagSlots() < bagLimit && !capacityTask) {
    packNoticeShown = false;
    return;
  }
  if (!character || packNoticeShown || tab === 'bank' || document.hidden || document.querySelector('dialog[open]')) return;
  const task = run?.task ?? capacityTask;
  const remaining = Math.max(0, spillLimit - (game.spill || 0));
  const blocks = task && bagBlocks(task);
  byId('pack-full-message').textContent = blocks ?
    (remaining ? 'Podés seguir ganando XP durante ' + remaining + ' acciones sin recoger el producto.' :
      'La actividad se detuvo. Hacé espacio para recoger más productos.') :
    'Podés hacer espacio en el Cofre del Hogar o seguir con lo que estabas haciendo.';
  const dialog = byId('pack-full-dialog');
  if (run) {
    packPaused = { activity: run, now: performance.now() };
    clearTimeout(activityTimer);
    syncCycleHud(packPaused.now);
  }
  packNoticeShown = true;
  dialog.returnValue = '';
  dialog.pendingCharacter = character.id;
  dialog.showModal();
}
byId('pack-full-dialog').addEventListener('close', event => {
  const dialog = event.target;
  if (dialog.open || !character || dialog.pendingCharacter !== character.id) return;
  dialog.pendingCharacter = undefined;
  const paused = packPaused;
  packPaused = undefined;
  if (paused?.activity === run && run) run.nextAt += performance.now() - paused.now;
  requestSceneFrame();
  if (dialog.returnValue === 'bank') {
    stop(false);
    chooseZone('camp', 'Banco');
  } else {
    save();
    scheduleActivity();
  }
});
function render() {
  updateSceneEquipment();
  requestSceneFrame();
  if (!destination && homeHealAt === undefined && game.hp < lv('hitpoints')) updateHomeHealing();
  renderStats();
  renderPack();
  renderPackFull();
  if (tab === 'skills') renderActions();
  else {
    byId('stop').hidden = !run;
    renderRecovery();
    renderStationMarkers();
  }
  if (tab === 'bag') renderBag();
  if (tab === 'bank') renderBank();
  if (tab === 'collection') renderCollection();
  if (tab === 'log') {
    // Cada línea del diario lleva una marca según de qué habla, para leerlo de un vistazo.
    const kinds = [[/^(Subiste|Alcanzaste)|nivel/i, 'level'], [/^(Derrotaste|Venciste|Caíste|Perdiste)|jefe/i, 'fight'],
      [/^(Encontraste|Hallaste)|mascota|trofeo|amuleto/i, 'find'], [/^(Compraste|Vendiste)|monedas/i, 'coin']];
    byId('log').replaceChildren(...game.log.map(message => {
      const entry = document.createElement('li');
      entry.className = 'log-' + (kinds.find(([pattern]) => pattern.test(message))?.[1] ?? 'note');
      entry.textContent = message;
      return entry;
    }));
  }
}
// Registro de colección al estilo OSRS: siluetas para lo que falta, brillo para lo encontrado y progreso por categoría.
function collectionSection(title, found, total, note, tiles, wide = false) {
  return '<section class="col-cat"><header class="col-head"><h2>' + title + '</h2><b class="num' + (found === total ? ' col-done' : '') + '">' +
    found + '<small> / ' + total + '</small></b><span class="col-bar" role="progressbar" aria-label="' + title + ' encontradas" aria-valuemin="0" aria-valuemax="' +
    total + '" aria-valuenow="' + found + '"><i style="width:' + (found * 100 / total) + '%"></i></span></header>' +
    (note ? '<p>' + note + '</p>' : '') + '<div class="col-grid' + (wide ? ' col-grid-wide' : '') + '">' + tiles + '</div></section>';
}
function renderCollection() {
  const count = keys.filter(key => game.pets?.[key]).length;
  const capes = keys.filter(key => lv(key) === 99);
  const rare = [...amulets.map((item, tier) => [item, foes[tier].name, 'Amuleto']), ...trophies.map((item, tier) => [item, bosses[tier].name, 'Trofeo'])];
  const rareFound = rare.filter(([item]) => game.finds?.[item]).length;
  byId('collection').innerHTML = '<div class="col-summary"><span class="num"><b>' + (count + rareFound + capes.length) + '</b> / ' +
    (keys.length * 2 + rare.length) + '</span><small>hallazgos del valle</small></div>' +
    collectionSection('Mascotas', count, keys.length, 'Pueden aparecer al completar una acción con XP: 1 en 5.000, mejor con más nivel.', keys.map(key => {
      const [name, art] = pets[key];
      const found = game.pets?.[key];
      const tag = found ? 'button type="button" data-pet="' + key + '" aria-pressed="' + (game.pet === key) + '"' : 'article';
      return '<' + tag + ' class="col-tile ' + (found ? 'col-found' : 'col-missing') + '" title="' + name + ' · ' + skills[key][0] +
        (found ? (game.pet === key ? ' · te acompaña, tocá para guardarla' : ' · tocá para llevarla') : ' · por descubrir') + '">' +
        '<span class="col-art" aria-hidden="true">' + petArt(key, 'pet-paint col-pet') + '</span><strong>' + (found ? name : '???') + '</strong><small>' + skills[key][0] + '</small>' +
        (found && game.pet === key ? '<em class="col-badge">Contigo</em>' : '') + '</' + tag.split(' ')[0] + '>';
    }).join('')) +
    collectionSection('Botín raro', rareFound, rare.length, 'Amuletos de los encargos (1 en ' + amuletOdds + ', suman potencia) y trofeos de jefe (1 en ' +
      trophyOdds + ', +5 % de XP para siempre).', rare.map(([item, source, kind]) => {
      const found = game.finds?.[item];
      return '<article class="col-tile ' + (found ? 'col-found' : 'col-missing') + '" title="' + (found ? item : kind + ' por descubrir') + ' · ' + source + '">' +
        '<span class="col-art" aria-hidden="true">' + itemIcon(item) + '</span><strong>' + (found ? item : '???') + '</strong><small>' + source + '</small></article>';
    }).join('')) +
    collectionSection('Capas de nivel 99', capes.length, keys.length, '', keys.map(key => {
      const done = lv(key) === 99;
      const tag = done ? 'button type="button" data-cape="' + key + '" aria-pressed="' + (game.cape === key) + '"' : 'article';
      return '<' + tag + ' class="col-tile col-cape ' + (done ? 'col-found' : 'col-missing') + '" title="Capa de ' + skills[key][0] +
        (done ? (game.cape === key ? ' · puesta' : ' · tocá para ponértela') : ' · nivel ' + lv(key) + ' de 99') + '">' +
        '<span class="col-art" aria-hidden="true">' + skillIcon(key) + '</span><strong>' + skills[key][0].replace('Creación de runas', 'Runas').replace('Cazador de monstruos', 'Cazador') +
        '</strong><small class="num">' + (done ? 'Capa' : lv(key) + ' / 99') + '</small>' + (done && game.cape === key ? '<em class="col-badge">Puesta</em>' : '') +
        '</' + tag.split(' ')[0] + '>';
    }).join(''), true);
}

function activateCharacter(entry) {
  // Personajes creados antes de los retratos pintados: reciben el retrato base (pelo de puntas, ojos ámbar).
  if (entry?.progress && entry.progress.appearance?.v !== 2) {
    entry.progress.appearance = cleanFace(entry.progress.appearance);
  }
  clearTimeout(boostTimer);
  boostUntil = 0;
  previousStation = undefined;
  stop(false);
  clearHomeHealing();
  session = undefined;
  keyboard.clear();
  clearTimeout(noticeTimer);
  byId('notice').textContent = '';
  byId('floating').replaceChildren();
  for (const entry of lootTimers.values()) clearTimeout(entry.timer);
  lootTimers.clear();
  byId('loot-feed').replaceChildren();
  for (const entry of levelTimers.values()) clearTimeout(entry.timer);
  levelTimers.clear();
  byId('level-feed').replaceChildren();
  recoveryTask = undefined;
  capacityTask = undefined;
  packNoticeShown = false;
  packPaused = undefined;
  const packDialog = byId('pack-full-dialog');
  packDialog.pendingCharacter = undefined;
  if (packDialog.open) packDialog.close();
  character = entry;
  game = entry?.progress ?? fresh();
  savedProgress = JSON.stringify(game);
  if (game.questCollapsed === undefined && game.victories?.[0]) game.questCollapsed = true;
  const wholeCoins = Number.isFinite(game.coins) ? coinAmount(game.coins) : 0;
  const roundedCoins = wholeCoins !== game.coins;
  game.coins = wholeCoins;
  const migrated = upgradeInventory() | (character ? migrateTiers(game) : false);
  const rationsLoaded = autoEquipFood();
  zone = 'camp';
  position = heroSpot('camp');
  follower = undefined; petTrail = undefined;
  destination = undefined;
  arrivingZone = undefined;
  lastWalkZone = 'camp';
  guidedTask = undefined;
  focusedSkill = undefined;
  inspectedItem = undefined;
  bankSelection = undefined;
  byId("bank-content").replaceChildren();
  delete byId("bank-content").renderedMarkup;
  delete byId("bank-content").renderedBankState;
  inspectedNote = false;
  saleItem = undefined;
  marketStock = 'all';
  byId('market-search').value = '';
  showView('map');
  byId('character-name').textContent = entry?.name ?? 'Sin personaje';
  refreshPortraits();
  if (entry && game.work) resumeWork();
  else {
    render();
    if (entry && (migrated || rationsLoaded || roundedCoins)) save();
  }
}

function resumeWork() {
  const work = game.work;
  if (!work) return;
  const task = tasks.find(entry => matchesTaskName(entry, work.task));
  if (!task || isProvision(task) || !Number.isFinite(work.at) || !Number.isFinite(work.remaining) ||
      task.daily !== undefined && work.day !== localDay()) {
    save();
    render();
    return;
  }
  const now = performance.now();
  const duration = actionDuration(task);
  zone = task.zone;
  position = heroSpot(zone);
  lastWalkZone = zone;
  activityGroups[zone] = task.group;
  guidedTask = task.id;
  showView('skills');
  if (task.style) arenaStyle = task.style;
  if (task.train) combatTraining = task.train;
  session = { elapsed: 0, xp: 0, items: 0 };
  const goal = work.goal && productionGoal(task, work.goal.item, work.goal.qty);
  // El reloj de pared nunca se aplica al progreso al reabrir.
  const fight = task.enemy && work.fight;
  run = { task, duration: fight?.duration || duration, nextAt: now + Math.max(0, work.remaining), goal };
  if (fight) run.fight = fight;
  save();
  scheduleActivity();
  render();
}

function stationView() {
  if (zone !== 'camp') return 'skills';
  if (activityGroups.camp === 'Banco') return 'bank';
  return activityGroups.camp === 'Inventario' ? 'bag' : 'skills';
}
function showView(name) {
  if (name === 'map') {
    name = stationView();
    homeInventory = name === 'bag';
  }
  if (name !== 'bag') homeInventory = false;
  if (name !== tab) byId('workspace-main').scrollTop = 0;
  tab = name;
  byId('workspace-main').dataset.screen = name;
  byId('workspace').dataset.view = name;
  if (name === 'bank') updateBankBackdrop();
  updateStationBack();
  for (const view of ['skills', 'bag', 'bank', 'collection', 'log']) byId('panel-' + view).hidden = view !== tab;
  for (const button of document.querySelectorAll('.tabs [data-tab]')) {
    button.setAttribute('aria-pressed', button.dataset.tab === 'map' ?
      name === 'skills' || name === 'bank' || homeInventory : button.dataset.tab === name && !homeInventory);
  }
}
function renderQuestToggle() {
  const button = byId('quest-toggle');
  const collapsed = game.questCollapsed ?? Boolean(game.victories?.[0]);
  byId('quest').classList.toggle('quest-collapsed', collapsed);
  const label = collapsed ? 'Mostrar misión' : 'Ocultar misión';
  button.textContent = collapsed ? '›' : '‹';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-expanded', !collapsed);
  byId('map-objective').hidden = collapsed;
}
byId('quest-toggle').addEventListener('click', () => {
  game.questCollapsed = !byId('map-objective').hidden;
  renderQuestToggle();
  save();
  renderQuestHighlight();
  if (tab === 'bag') renderBag();
});
// Cámara de combate: al empezar una pelea la vista se acerca a la arena, así el héroe y el rival se ven grandes
// sobre la tierra pintada del ruedo y no como recortes chicos encima del mapa. Al terminar, vuelve a abrirse.
let mapView;
function updateBattleCamera() {
  const scene = byId('map-scene');
  const on = document.body.classList.contains('battle-cam') && mapView;
  if (!on) {
    scene.style.setProperty('--cam-x', '0px');
    scene.style.setProperty('--cam-y', '0px');
    scene.style.setProperty('--cam-z', 1);
    return;
  }
  const { left, top, width, height, scaleX, scaleY, mapWidth, viewportHeight } = mapView;
  // El ruedo con su cerca mide unas 300 unidades de ancho: se agranda hasta ocupar casi todo el mapa visible.
  const zoom = Math.max(1.6, Math.min(2.7, .9 * mapWidth / (300 * scaleX), .9 * viewportHeight / (150 * scaleY)));
  const focusX = (position.x + 30) * scaleX, focusY = (position.y - 12) * scaleY;
  const x = Math.min(-left, Math.max(mapWidth - left - zoom * width, mapWidth / 2 - left - zoom * focusX));
  const y = Math.min(-top, Math.max(viewportHeight - top - zoom * height, viewportHeight * .54 - top - zoom * focusY));
  scene.style.setProperty('--cam-x', x.toFixed(1) + 'px');
  scene.style.setProperty('--cam-y', y.toFixed(1) + 'px');
  scene.style.setProperty('--cam-z', zoom.toFixed(3));
}
let battleCameraOff;
function setBattleCamera(on, now = false) {
  // Entre un rival y el siguiente, apagar espera medio segundo: si enseguida sigue la pelea, la cámara ni se mueve.
  if (!on && !now && document.body.classList.contains('battle-cam')) {
    battleCameraOff ??= setTimeout(() => { battleCameraOff = undefined; applyBattleCamera(false); }, 500);
    return;
  }
  clearTimeout(battleCameraOff);
  battleCameraOff = undefined;
  applyBattleCamera(on);
}
function applyBattleCamera(on) {
  if (document.body.classList.contains('battle-cam') === on) return;
  // Mientras la cámara se mueve (1,1 s) el rival acompaña el cambio de tamaño; al entrar arranca del tamaño sin zoom.
  clearTimeout(applyBattleCamera.timer);
  document.body.classList.add('cam-moving');
  // Solo arranca "de lejos" si la escena estaba realmente sin zoom (no en un apagado y encendido de un cuadro).
  document.body.classList.toggle('cam-entering', on && Number(byId('map-scene').style.getPropertyValue('--cam-z') || 1) < 1.05);
  applyBattleCamera.timer = setTimeout(() => document.body.classList.remove('cam-moving', 'cam-entering'), 1150);
  document.body.classList.toggle('battle-cam', on);
  // Con la cámara cerca se ve la ilustración en alta resolución; el mapa vivo (WebGL) descansa mientras tanto.
  if (on) mapLife.hold(1e9); else mapLife.release();
  updateBattleCamera();
}
// Encuadrá la ilustración y sus marcadores juntos, dejando margen para la XP y el muelle.
function focusMap() {
  const scene = byId('map-scene');
  const panel = byId('workspace-main');
  const world = byId('world');
  const viewportWidth = world.clientWidth;
  const viewportHeight = world.clientHeight;
  if (!viewportWidth || !viewportHeight) return;
  const compact = matchMedia('(max-width: 760px)').matches;
  const topEdge = 52;
  const bottomEdge = 570;
  const mapWidth = compact ? viewportWidth : viewportWidth - panel.offsetWidth - 8;
  const scaleX = compact ? Math.min(viewportWidth / 1000, viewportHeight / 630) :
    Math.min(viewportWidth / 1000, mapWidth / 810);
  const scaleY = compact ? scaleX :
    Math.max(viewportHeight / 630, Math.min(scaleX, viewportHeight / (bottomEdge - topEdge)));
  const width = 1000 * scaleX;
  const height = 630 * scaleY;
  const left = (mapWidth - width) / 2;
  const top = (viewportHeight - (topEdge + bottomEdge) * scaleY) / 2;
  const framedTop = height <= viewportHeight ? (viewportHeight - height) / 2 :
    Math.max(viewportHeight - height, Math.min(0, top));
  scene.style.width = width + 'px';
  scene.style.height = height + 'px';
  scene.style.setProperty('--map-width', width + 'px');
  scene.style.setProperty('--map-height', height + 'px');
  scene.style.left = left + 'px';
  scene.style.top = framedTop + 'px';
  scene.style.setProperty('--actor-scale', Math.max(.78, Math.min(1.15, scaleY)));
  mapView = { left, top: framedTop, width, height, scaleX, scaleY, mapWidth, viewportHeight };
  world.style.setProperty('--map-visible', mapWidth + 'px');
  // Al cambiar el tamaño de la ventana la cámara se reacomoda sin animación, para que el héroe no quede afuera un segundo.
  scene.classList.add('cam-instant');
  updateBattleCamera();
  scene.getBoundingClientRect();
  requestAnimationFrame(() => scene.classList.remove('cam-instant'));

  // Mantené el botón de Bosque junto a la tarjeta si tapa su posición en el mapa.
  const quest = byId('quest');
  const forestMarker = scene.querySelector('.marker[data-zone="forest"]');
  if (!forestMarker) return;
  const forestCenter = left + zones.forest[2] * scaleX;
  const markerHeight = forestMarker.offsetHeight;
  const forestTop = framedTop + zones.forest[3] * scaleY - markerHeight / 2;
  const questBottom = quest.offsetTop + quest.offsetHeight;
  const questRight = quest.offsetLeft + quest.offsetWidth;
  const overlapsQuest = quest.offsetHeight && forestTop < questBottom &&
    forestTop + markerHeight > quest.offsetTop &&
    forestCenter + forestMarker.offsetWidth / 2 > quest.offsetLeft;
  const shiftX = overlapsQuest ? Math.max(0, questRight + 8 + forestMarker.offsetWidth / 2 - forestCenter) : 0;
  forestMarker.style.setProperty('--marker-shift', shiftX + 'px');
}
// El retrato del personaje activo (HUD y hoja del personaje), armado con los rasgos que se eligieron al crearlo.
function refreshPortraits() {
  const entry = character && loadRoster().characters.find(item => item.id === character.id);
  const appearance = game?.appearance || entry?.progress?.appearance;
  byId('hud-portrait').innerHTML = appearance ? faceArt(appearance) : '<img src="art/portrait.webp" alt="">';
  // La hoja del personaje muestra el mismo retrato elegido al crearlo.
  const sheetPortrait = document.querySelector('.cs-portrait');
  if (sheetPortrait) sheetPortrait.innerHTML = byId('hud-portrait').innerHTML;
  if (byId('characters')?.open) renderCharacters();
}
function renderCharacters(roster = loadRoster()) {
  const list = byId('character-list');
  list.replaceChildren();
  byId('close-characters').hidden = !character;
  for (const entry of roster.characters) {
    const row = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'character-info';
    const name = document.createElement('strong');
    name.textContent = entry.name;
    const detail = document.createElement('small');
    const isActive = entry.id === character?.id;
    detail.textContent = 'Nivel total ' + number(totalLevel(entry.progress)) + ' · ' + number(entry.progress.coins || 0) + ' monedas';
    info.append(name, detail);
    const portrait = document.createElement('span');
    portrait.className = 'character-portrait';
    portrait.innerHTML = faceArt(entry.progress?.appearance);
    row.append(portrait, info);
    if (isActive) {
      row.classList.add('character-active');
      const badge = document.createElement('em');
      badge.className = 'character-badge';
      badge.textContent = 'En juego';
      row.append(badge);
    }

    if (!isActive) {
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'btn btn-small';
      play.textContent = 'Jugar';
      play.setAttribute('aria-label', 'Jugar con ' + entry.name);
      play.dataset.playCharacter = entry.id;
      row.append(play);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-small btn-ghost delete-character';
    remove.textContent = 'Borrar';
    remove.setAttribute('aria-label', 'Borrar a ' + entry.name);
    remove.dataset.deleteCharacter = entry.id;
    row.append(remove);
    list.append(row);
  }
}
function openCharacters() {
  keyboard.clear();
  byId('character-error').textContent = '';
  const roster = loadRoster();
  renderCharacters(roster);
  const dialog = byId('characters');
  // Con personajes ya creados, el editor de apariencia arranca plegado para que la lista entre sin desplazar.
  if (!dialog.open) dialog.querySelector('.appearance-editor').open = !roster.characters.length;
  if (!dialog.open) dialog.showModal();
  byId('new-character-name').focus({ preventScroll: true });
  dialog.scrollTop = 0;
}
function syncCharacters(roster) {
  if (character) {
    const entry = findCharacter(roster, character.id);
    if (!entry) {
      activateCharacter(findCharacter(roster) || roster.characters[0]);
      if (!character) openCharacters();
    } else if (JSON.stringify(entry.progress) !== savedProgress) {
      stop(false);
      character = entry;
      game = entry.progress;
      savedProgress = JSON.stringify(game);
      render();
    }
  }
  if (byId('characters').open) renderCharacters(roster);
}
function settleCharacter() {
  advanceActivity();
  return !character || JSON.stringify(game) === savedProgress || save();
}
function playCharacter(roster, entry) {
  roster.activeId = entry.id;
  if (!writeRoster(roster)) {
    byId('character-error').textContent = 'El navegador no pudo guardar el cambio.';
    return;
  }
  activateCharacter(entry);
  byId('character-form').reset();
  byId('characters').close();
}
function createCharacter(event) {
  event.preventDefault();
  const error = byId('character-error');
  const name = byId('new-character-name').value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 24) {
    error.textContent = 'Ingresá un nombre de 1 a 24 caracteres.';
    return;
  }
  if (!settleCharacter()) {
    error.textContent = 'El navegador no pudo guardar tu progreso.';
    return;
  }
  const roster = loadRoster();
  if (roster.characters.some(entry => entry.name.toLowerCase() === name.toLowerCase())) {
    error.textContent = 'Ya tenés un personaje con ese nombre.';
    return;
  }
  const id = globalThis.crypto?.randomUUID?.() ?? Date.now() + '-' + Math.random();
  const entry = { id, name, progress: { ...fresh(), appearance: cleanFace(newFace) } };
  roster.characters.push(entry);
  playCharacter(roster, entry);
}
function deleteCharacter(id) {
  const entry = findCharacter(loadRoster(), id);
  if (!entry || !confirm('¿Borrar a ' + entry.name + '? Se perderá todo su progreso.')) return;
  const roster = loadRoster();
  roster.characters = roster.characters.filter(candidate => candidate.id !== id);
  if (roster.activeId === id) roster.activeId = roster.characters[0]?.id ?? null;
  if (!writeRoster(roster)) {
    byId('character-error').textContent = 'El navegador no pudo borrar el personaje.';
    return;
  }
  syncCharacters(roster);
  byId('character-error').textContent = '';
  byId('new-character-name').focus();
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const directions = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0], ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0] };
const walkBoost = () => 1 + Math.floor(lv('hitpoints') / 30) * .1;
function walkTo(id) {
  const target = heroSpot(id);
  const startedAt = performance.now();
  // Va por los senderos (ruta.js) a la misma velocidad de siempre; el viaje dura lo que mide el camino.
  const route = typeof walkRoute === 'function' ? walkRoute(position, target) : [position, target];
  const distance = routeLength(route);
  const duration = reducedMotion.matches || Math.hypot(target.x - position.x, target.y - position.y) <= 12 ? 0 : distance / walkPace() * 1000;
  const arrivesAt = startedAt + duration;
  destination = { id, target, origin: position, startedAt, arrivesAt, route, distance };
  requestSceneFrame();
  return arrivesAt;
}
function step(dt, now) {
  let dx = 0;
  let dy = 0;
  for (const key of keyboard) {
    dx += directions[key][0];
    dy += directions[key][1];
  }
  if (dx || dy) {
    const distance = Math.hypot(dx, dy);
    const pace = walkPace();
    position.x = Math.max(40, Math.min(960, position.x + dx / distance * dt * pace));
    position.y = Math.max(99, Math.min(563, position.y + dy / distance * dt * pace));
    if (position.x > 620) position.y = Math.min(position.y, 590 - (position.x - 620) * .25);
    let near;
    let best = 36 ** 2;
    for (const [id, [, , x, y]] of Object.entries(zones)) {
      const distanceSquared = (position.x - x) ** 2 + (position.y - y + 32) ** 2;
      if (distanceSquared > best) continue;
      best = distanceSquared;
      near = id;
    }
    if (near !== lastWalkZone) {
      lastWalkZone = near;
      if (near) openStation(near);
    }
  } else if (destination) {
    const { target, origin, startedAt, arrivesAt } = destination;
    if (now >= arrivesAt) {
      position = target;
      destination = undefined;
      if (arrivingZone) openStation(arrivingZone);
      else if (tab === 'bank') renderBank();
      else if (tab === 'skills' && zone === 'camp') renderActions();
    } else {
      const fraction = Math.max(0, (now - startedAt) / (arrivesAt - startedAt));
      position = destination.route ? routePoint(destination.route, destination.distance * fraction) : {
        x: origin.x + (target.x - origin.x) * fraction,
        y: origin.y + (target.y - origin.y) * fraction,
      };
    }
  }
}
let lastFrame;
let sceneFrame;
let sceneTimer;
let renderedPosition;
let renderedFollower;
let cycleHud;
function syncCycleHud(now = performance.now()) {
  const activity = !document.hidden && tab === 'skills' && !byId('run-progress').hidden ? run : undefined;
  if (!activity) {
    cycleHud?.animation.cancel();
    cycleHud = undefined;
    return;
  }
  const { duration, nextAt } = activity;
  const pausedAt = packPaused?.activity === activity ? packPaused.now : undefined;
  const start = nextAt - duration;
  if (cycleHud?.activity !== activity || cycleHud.nextAt !== nextAt ||
      cycleHud.duration !== duration || cycleHud.pausedAt !== pausedAt) {
    cycleHud?.animation.cancel();
    // El navegador interpola la barra independientemente del ritmo de la escena.
    const animation = byId('task-progress').firstElementChild.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration, fill: 'both' });
    if (pausedAt === undefined) animation.startTime = start;
    else {
      animation.pause();
      animation.currentTime = Math.max(0, Math.min(duration, pausedAt - start));
    }
    cycleHud = { activity, nextAt, duration, pausedAt, animation };
  }
  const remaining = Math.max(0, Math.min(duration, nextAt - (pausedAt ?? now)));
  const time = (remaining / 1000).toFixed(1).replace('.', ',') + ' s';
  const clock = byId('cycle-time');
  if (clock.textContent !== time) clock.textContent = time;
}
function requestSceneFrame() {
  if (sceneFrame || document.hidden) return;
  clearTimeout(sceneTimer);
  sceneFrame = requestAnimationFrame(frame);
}
function frame(now) {
  sceneFrame = undefined;
  if (document.hidden) return;
  const dt = Math.min((now - (lastFrame ?? now)) / 1000, .05);
  lastFrame = now;
  if (destination || keyboard.size) {
    step(dt, now);
    updateHomeHealing(now);
  }
  const hero = byId('hero');
  if (setScenePosition(hero, position, renderedPosition)) renderedPosition = { ...position };
  const pet = byId('map-pet');
  let following = false;
  if (!pet.hidden) {
    follower ??= { x: position.x, y: position.y };
    // La mascota sigue las huellas del héroe (no corta camino por las casas): va hacia un punto del rastro ~24 detrás.
    petTrail ??= [{ ...position }];
    const lastStep = petTrail[petTrail.length - 1];
    if (Math.hypot(position.x - lastStep.x, position.y - lastStep.y) > 2) petTrail.push({ ...position });
    if (petTrail.length > 200) petTrail.splice(0, petTrail.length - 200);
    let behind = 0, aim = petTrail[petTrail.length - 1];
    for (let k = petTrail.length - 1; k > 0 && behind < 24; k--) {
      behind += Math.hypot(petTrail[k].x - petTrail[k - 1].x, petTrail[k].y - petTrail[k - 1].y);
      aim = petTrail[k - 1];
    }
    if (behind < 24) aim = petTrail[0];
    // En combate la mascota espera a la espalda del héroe, sin pisarlo.
    if (document.body.classList.contains('battle-cam')) aim = { x: position.x - 30, y: position.y + 5 };
    const distance = Math.hypot(aim.x - follower.x, aim.y - follower.y);
    following = (Math.hypot(position.x - follower.x, position.y - follower.y) > 22 || document.body.classList.contains('battle-cam')) && distance > .5;
    const before = { ...follower };
    if (following) {
      const pace = Math.min(distance, Math.max(walkPace() * 1.15, distance * 4) * dt);
      follower.x += (aim.x - follower.x) / distance * pace;
      follower.y += (aim.y - follower.y) / distance * pace;
    }
    if (typeof stepPetWalk === 'function') stepPetWalk(follower.x - before.x, follower.y - before.y, dt);
    if (setScenePosition(pet, follower, renderedFollower)) renderedFollower = { ...follower };
  }
  renderScene(now);
  syncCycleHud(now);
  if (destination || keyboard.size || following) requestSceneFrame();
  else if (run || boostActive(now)) {
    // Solo el texto y los estados discretos necesitan consultar el reloj.
    if (!run || packPaused?.activity !== run || boostActive(now)) sceneTimer = setTimeout(requestSceneFrame, 100);
  } else lastFrame = undefined;
}

byId('combat-styles').innerHTML = Object.entries(combatLabels).map(([style, label]) =>
  '<button type="button" data-combat-style="' + style + '">' + icon(gearShapes[combatSlots[style]], '#cfd8dd') + label + '</button>').join('');
for (const holder of document.querySelectorAll('[data-ico]')) holder.outerHTML = icon(...holder.dataset.ico.split(','));
byId('markers').innerHTML = Object.entries(zones).map(([id, [name, , x, y]]) => {
  const [dx, dy] = markerOffsets[id] || [0, 0];
  return '<button type="button" class="marker" data-zone="' + id + '" aria-label="' + name + '" title="' + name +
    '" style="left:' + (x + dx) / 10 + '%;top:' + (y + dy) / 6.3 + '%"><span class="marker-icon" aria-hidden="true">' + zoneIcon(id) +
    '</span><span class="marker-label">' + name + '</span></button>';
}).join('');
const skillGroups = {
  Combate: ['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'magic', 'prayer', 'slayer'],
  Recolección: ['mining', 'woodcutting', 'fishing'],
  Producción: ['smithing', 'fletching', 'runecraft', 'cooking'],
};
byId('skills').innerHTML = Object.entries(skillGroups).map(([group, members]) => '<section class="skill-group"><small>' + group +
  '</small>' + members.map(key => {
    const [name, icon] = skills[key];
    return '<button type="button" id="skill-' + key + '" class="skill" data-skill="' + key + '" aria-label="' + name +
      '"><span class="skill-icon" aria-hidden="true">' + icon + '</span><span class="skill-name">' + name +
      '</span><b></b><span class="bar"><i></i></span></button>';
  }).join('') + '</section>').join('');
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const data = button.dataset;
  if (audioSettings.music === true && (!musicGain || levelAudio.state === 'suspended')) updateMusic();
  if (data.recoverHome) stopActivity();
  if (data.zone) {
    chooseZone(data.zone, data.group);
  }
  if (data.jump !== undefined) jumpToTask(tasks[Number(data.jump)]);
  if (data.marketStock || data.saleItem) {
    if (data.marketStock) marketStock = data.marketStock;
    if (data.saleItem) saleItem = data.saleItem;
    byId('sale-quantity').value = 1;
    renderMarketSales();
  }
  if (button.id === 'station-back' && previousStation) {
    const { id, group, task, style, train } = previousStation;
    if (id === 'arena') { arenaStyle = style; combatTraining = train; }
    return chooseZone(id, group, task?.id);
  }
  if (button.id === 'shiny') catchShiny();
  if (button.id === 'stop') stopActivity();
  if (data.dismiss) {
    dismissed[data.dismiss] = data.dismiss === 'recovery' ? (byId('recovery-title').textContent === 'Poca vida' ? 'low' : 'strong') : true;
    byId(data.dismiss).hidden = true;
  }
  if (data.task !== undefined) start(tasks[Number(data.task)]);
  if (data.stopTask !== undefined && run?.task.id === Number(data.stopTask)) stopActivity();
  if (data.skill) jumpToTask(trainingFor(data.skill), data.skill);
  if (data.inspect !== undefined) {
    guidedTask = Number(data.inspect);
    rememberTask(tasks[guidedTask]);
    save();
    focusedSkill = undefined;
    renderActions();
  }
  if (data.inspectItem || data.inspectNote) {
    inspectedItem = data.inspectItem ?? data.inspectNote;
    inspectedNote = Boolean(data.inspectNote);
    if (tab !== 'bag') {
      homeInventory = false;
      showView('bag');
    }
    renderBag();
    renderPack();
  }
  if (data.item) {
    if (data.fromBank && (!atHome() || destination)) return notify('Esperá a llegar al Hogar');
    use(data.item, Boolean(data.fromBank));
  }
  if (data.unequip) unequip(data.unequip);
  if (data.equipRation) equipRation(data.equipRation);
  if (data.eatRation) {
    advanceActivity();
    if (eatRation(data.eatRation)) {
      save();
      render();
    }
  }
  if (data.removeRation) removeRation(data.removeRation);
  if (data.depositAll) depositAll();
  if (data.pet && game.pets?.[data.pet]) {
    game.pet = game.pet === data.pet ? '' : data.pet;
    follower = undefined; petTrail = undefined;
    save();
    render();
  }
  if (data.cape && keys.includes(data.cape) && lv(data.cape) === 99) {
    game.cape = game.cape === data.cape ? '' : data.cape;
    save();
    render();
  }
  if (data.homeTab) return chooseZone('camp', data.homeTab);
  if (data.activityGroup) {
    return chooseZone(zone, data.activityGroup);
  }
  if (data.recipeCategory) {
    recipeCategories[zone + (activityGroups[zone] ?? zoneGroups[zone][0])] = data.recipeCategory;
    renderActions();
  }
  if (data.combatStyle) {
    arenaStyle = data.combatStyle;
    focusedSkill = undefined;
    renderActions();
    renderStats();
  }
  if (data.combatTrain && data.combatTrain !== combatTraining) {
    combatTraining = data.combatTrain;
    const selected = tasks[guidedTask];
    if (selected?.group === 'Encargos') {
      const variant = tasks.find(task => task.group === 'Encargos' && task.style === arenaStyle &&
        task.battleTier === selected.battleTier && task.veteran === selected.veteran && task.train === combatTraining);
      guidedTask = variant?.id;
    }
    renderActions();
  }
  if (data.routeStyle) {
    arenaStyle = data.routeStyle;
    render();
  }
  if (data.bagFilter) {
    inventoryFilter = data.bagFilter;
    renderBag();
  }
  if (data.profileView) {
    profileView = data.profileView;
    if (tab === 'bag') renderBag();
  }
  if (data.tab) {
    homeInventory = false;
    arrivingZone = undefined;
    showView(data.tab);
    render();
  }
});
const workspaceScroller = byId("workspace-main");
let bankScrollFrame;
function updateBankBackdrop() {
  if (tab !== "bank" || bankScrollFrame) return;
  bankScrollFrame = requestAnimationFrame(() => {
    bankScrollFrame = undefined;
    const limit = workspaceScroller.scrollHeight - workspaceScroller.clientHeight;
    const progress = limit > 0 ? Math.min(1, Math.max(0, workspaceScroller.scrollTop / limit)) : 0;
    byId("bank-backdrop").style.setProperty("--bank-drift", -8 * progress + "%");
  });
}
workspaceScroller.addEventListener("scroll", updateBankBackdrop, { passive: true });
window.addEventListener("resize", updateBankBackdrop);
window.addEventListener('resize', focusMap);
// El encuadre del mapa solo cambia cuando cambia el tamaño del mapa, del panel o de la misión.
const mapFrame = new ResizeObserver(focusMap);
for (const id of ['quest', 'workspace-main', 'world']) mapFrame.observe(byId(id));
for (const [id, page] of [['pack-prev', 0], ['pack-next', 1]]) {
  byId(id).addEventListener('click', () => {
    packPage = page;
    renderPack();
  });
}
byId('open-settings').addEventListener('click', () => {
  byId('setting-sound').checked = effectsEnabled();
  byId('setting-music').checked = audioSettings.music === true;
  byId('setting-landscape').checked = landscapeMotion;
  byId('settings').showModal();
});
byId('settings-characters').addEventListener('click', () => {
  byId('settings').close();
  openCharacters();
});
byId('setting-sound').addEventListener('change', event => {
  audioSettings.effects = event.target.checked;
  saveAudioSettings();
  if (audioSettings.effects) prepareAudio();
});
let landscapeMotion = readStorage('valle-landscape-motion-v1') !== false;
function applyLandscapeMotion() {
  byId('world').classList.toggle('still-landscape', !landscapeMotion);
  mapLife.set(landscapeMotion && !reducedMotion.matches);
}
applyLandscapeMotion();
renderValleyAmbience();
// El shader del mapa reemplaza los recortes animados; si no hay WebGL, quedan los recortes.
mapLife.init(byId('map')).then(active => {
  byId('world').classList.toggle('living-map', active);
  applyLandscapeMotion();
});
document.addEventListener('visibilitychange', applyLandscapeMotion);
// Al desplazar el panel lateral o cualquier lista, el mapa animado se detiene un instante.
document.addEventListener('scroll', () => mapLife.hold(350), { capture: true, passive: true });
document.addEventListener('wheel', () => mapLife.hold(350), { passive: true });
byId('setting-landscape').addEventListener('change', event => {
  landscapeMotion = event.target.checked;
  applyLandscapeMotion();
  try { localStorage.setItem('valle-landscape-motion-v1', JSON.stringify(landscapeMotion)); } catch {}
});
byId('setting-music').addEventListener('change', event => {
  audioSettings.music = event.target.checked;
  saveAudioSettings();
  updateMusic();
});
document.addEventListener('change', event => {
  if (event.target.id === 'ration-picker') equipRation(event.target.value);
  if (event.target.id === 'ration-priority') prioritizeRation(event.target.value);
});
byId('actions').addEventListener('submit', event => {
  const form = event.target;
  if (form.dataset.provision === undefined) return;
  event.preventDefault();
  const coins = game.coins;
  buyProvision(tasks[Number(form.dataset.provision)], form.elements.quantity.valueAsNumber);
  // Destello breve en la fila comprada; se busca de nuevo porque el render pudo rehacerla.
  const bought = byId('actions').querySelector('[data-provision="' + form.dataset.provision + '"]');
  if (bought && game.coins < coins) {
    bought.classList.remove('provision-bought');
    void bought.offsetWidth;
    bought.classList.add('provision-bought');
  }
});
byId('actions').addEventListener('click', event => {
  const step = event.target.closest('[data-provision-step]');
  if (!step) return;
  const form = step.form;
  const input = form.elements.quantity;
  const limit = provisionLimit(tasks[Number(form.dataset.provision)]);
  const value = step.dataset.provisionStep;
  input.value = value === 'max' ? Math.max(1, limit) : Math.max(1, Math.min(9999, (input.valueAsNumber || 1) + Number(value)));
  syncProvision(form);
});
byId('actions').addEventListener('input', event => {
  const form = event.target.closest('[data-provision]');
  if (form) syncProvision(form);
});
byId('market-search').addEventListener('input', renderMarketSales);
byId('sale-equip').addEventListener('click', () => { if (saleItem) use(saleItem, true); });
byId('sale-quantity').addEventListener('input', renderSaleQuote);
for (const [id, step] of [['sale-minus', -1], ['sale-plus', 1]]) {
  byId(id).addEventListener('click', () => {
    const input = byId('sale-quantity');
    input.value = Math.max(1, Math.min(filteredSaleStock(saleItem), (input.valueAsNumber || 1) + step));
    renderSaleQuote();
  });
}
byId('sale-all').addEventListener('click', () => {
  byId('sale-quantity').value = filteredSaleStock(saleItem);
  renderSaleQuote();
});
byId('sale-form').addEventListener('submit', event => {
  event.preventDefault();
  const quantity = byId('sale-quantity').valueAsNumber;
  byId('sale-quantity').value = 1;
  sellItem(saleItem, quantity);
  renderSaleQuote();
});
byId('prayer-toggle').addEventListener('click', () => {
  advanceActivity();
  if (lv('prayer') < 5) return notify('Protección se desbloquea en Plegaria 5.');
  if (!prayerPoints()) return notify('Recargá la Plegaria en el santuario.');
  game.prayerOn = !game.prayerOn;
  save();
  render();
});
byId('open-characters').addEventListener('click', openCharacters);
byId('close-characters').addEventListener('click', () => byId('characters').close());
byId('characters').addEventListener('cancel', event => {
  if (!character) event.preventDefault();
});
byId('character-form').addEventListener('submit', createCharacter);
byId('character-list').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { playCharacter: playId, deleteCharacter: deleteId } = button.dataset;
  if (deleteId) return deleteCharacter(deleteId);
  if (!playId) return;
  if (!settleCharacter()) {
    byId('character-error').textContent = 'El navegador no pudo guardar tu progreso.';
    return;
  }
  const roster = loadRoster();
  const entry = findCharacter(roster, playId);
  if (entry) playCharacter(roster, entry);
});
byId('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notify('Probá la opción de pantalla completa de tu navegador.');
  } catch { notify('Probá abrir el juego en una pestaña del navegador y usá F11.'); }
});
document.addEventListener('fullscreenchange', () => {
  byId('fullscreen').querySelector('span').textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
});
byId('fullscreen').setAttribute('aria-label', 'Alternar pantalla completa');
function movementKey(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}
window.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || event.target?.matches?.('select, input, textarea')) return;
  if (event.key === 'Escape' && (tab === 'bag' && !homeInventory || tab === 'collection' || tab === 'log' || arrivingZone)) {
    arrivingZone = undefined;
    showView('map');
    render();
    return;
  }
  const key = movementKey(event);
  if (!Object.hasOwn(directions, key) || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  advanceActivity();
  if (run) return notify('Detené la actividad para caminar libremente');
  destination = undefined;
  arrivingZone = undefined;
  keyboard.add(key);
  requestSceneFrame();
});
window.addEventListener('keyup', event => keyboard.delete(movementKey(event)));
window.addEventListener('blur', () => keyboard.clear());
window.addEventListener('pagehide', event => {
  if (!advanceActivity(performance.now(), {})) save();
  if (event.persisted) {
    stop(false);
    clearHomeHealing();
  }
});
window.addEventListener('pageshow', event => {
  if (event.persisted) activateCharacter(findCharacter(loadRoster()));
});
window.addEventListener('storage', event => {
  if (event.key === rosterKey || event.key === null) syncCharacters(loadRoster());
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(sceneTimer);
    cancelAnimationFrame(sceneFrame);
    sceneFrame = undefined;
    lastFrame = undefined;
  } else requestSceneFrame();
  updateMusic();
  keyboard.clear();
  const now = performance.now();
  step(0, now);
  const updated = advanceActivity(now);
  scheduleActivity();
  updateHomeHealing(now);
  if (!document.hidden && !updated) render();
});
if (character?.id === 'legacy' && !readStorage(rosterKey) && writeRoster(initialRoster)) {
  try { localStorage.removeItem(legacySaveKey); } catch {}
}
activateCharacter(character);
if (!character) openCharacters();
initializeAppearance();
requestSceneFrame();
