'use strict';

// Reglas de combate sin dependencias del DOM: las usan el juego, la vista previa de amenaza y las pruebas.
//
// Cada ronda dura `roundTicks` ciclos de juego (0,6 s cada uno):
// 1. Si tu vida está en el umbral, comés en lugar de atacar (como en OSRS, comer cuesta el turno).
// 2. Si no, atacás: acertás con `accuracy` y pegás de 1 a `maxHit`.
// 3. El enemigo ataca: acierta con `foeAccuracy` (la baja tu nivel de Defensa) y pega de 1 a `foeMaxHit`
//    (lo baja tu armadura, la Plegaria y los estofados).
// Comés cuando tu vida no aguantaría un golpe máximo o cae al 30 %, lo que pase primero.
const roundTicks = 2;
const eatShare = .3;

function combatProfile(player, enemy, { weakness = false, enraged = false } = {}) {
  const reach = player.accuracyLevel + player.weapon * 3 + (player.accuracyBonus || 0) + 12;
  const accuracy = Math.min(.95, reach / (reach + enemy.guard + 8));
  let maxHit = Math.max(1, Math.round(1 + player.powerLevel / 4 + 1.5 * player.weapon + (player.neck || 0)));
  if (weakness) maxHit = Math.round(maxHit * 1.25);
  const soak = player.protection + (player.prayer || 0) + (player.tonic || 0);
  let foeMaxHit = Math.max(1, Math.round(enemy.maxHit * 20 / (20 + soak)));
  if (enraged) foeMaxHit = Math.round(foeMaxHit * 1.5);
  const foeAccuracy = Math.min(.95, Math.max(.05, enemy.attack / (enemy.attack + player.defenceLevel + 10)));
  return { accuracy, maxHit, foeAccuracy, foeMaxHit };
}
const eatThreshold = (maxHp, foeMaxHit) => Math.max(Math.ceil(maxHp * eatShare), foeMaxHit + 1);
// Daño esperado por ronda que hacés y que recibís, sin contar las comidas.
function expectedRound(profile) {
  return {
    dealt: profile.accuracy * (profile.maxHit + 1) / 2,
    taken: profile.foeAccuracy * (profile.foeMaxHit + 1) / 2,
  };
}
// Un generador pseudoaleatorio con semilla para que la vista previa sea estable entre renders.
function seededRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const rollHit = (random, max) => 1 + Math.floor(random() * max);
// Simula una pelea completa. `rations` es una lista [{ heal, count }] en orden de consumo.
function simulateFight(setup) {
  const { player, enemy, weakness, random } = setup;
  return simulateRounds(setup, random, combatProfile(player, enemy, { weakness }),
    combatProfile(player, enemy, { weakness, enraged: true }));
}
function simulateRounds({ enemy, enrageAt = Infinity, hp, maxHp, rations, roundLimit = 300 }, random, calm, angry) {
  let rationIndex = 0;
  let remaining = rations[0]?.count ?? 0;
  let foeHp = enemy.hp;
  let life = hp;
  let bites = 0;
  let taken = 0;
  let round = 0;
  while (round < roundLimit) {
    round++;
    const profile = round >= enrageAt ? angry : calm;
    while (remaining <= 0 && rationIndex + 1 < rations.length) remaining = rations[++rationIndex].count;
    const ration = remaining > 0 ? rations[rationIndex] : undefined;
    if (ration && life <= eatThreshold(maxHp, profile.foeMaxHit) && life < maxHp) {
      life = Math.min(maxHp, life + ration.heal);
      remaining--;
      bites++;
    } else if (random() < profile.accuracy) {
      foeHp -= rollHit(random, profile.maxHit);
      if (foeHp <= 0) return { win: true, round, bites, taken, life };
    }
    if (random() < profile.foeAccuracy) {
      const hit = rollHit(random, profile.foeMaxHit);
      life -= hit;
      taken += hit;
      if (life <= 0) return { win: false, round, bites, taken, life: 0 };
    }
  }
  return { win: false, round, bites, taken, life, timeout: true };
}
// Resume muchas peleas para mostrar qué tan peligroso es un rival con tu preparación actual.
function forecastFight(setup, fights = 300) {
  const random = seededRandom(setup.seed ?? 20251114);
  const calm = combatProfile(setup.player, setup.enemy, { weakness: setup.weakness });
  const angry = combatProfile(setup.player, setup.enemy, { weakness: setup.weakness, enraged: true });
  let wins = 0;
  let rounds = 0;
  let bites = 0;
  let lost = 0;
  for (let index = 0; index < fights; index++) {
    const result = simulateRounds(setup, random, calm, angry);
    wins += Number(result.win);
    rounds += result.round;
    bites += result.bites;
    lost += result.taken;
  }
  return {
    win: wins / fights,
    rounds: rounds / fights,
    bites: bites / fights,
    taken: lost / fights,
    ...calm,
  };
}
// Etiqueta legible de la amenaza a partir de la probabilidad de ganar.
function threatLevel(win) {
  if (win >= .97) return { key: 'easy', label: 'Fácil' };
  if (win >= .85) return { key: 'fair', label: 'Parejo' };
  if (win >= .5) return { key: 'risky', label: 'Peligroso' };
  return { key: 'deadly', label: 'Mortal' };
}
if (typeof module !== 'undefined') module.exports = { roundTicks, combatProfile, eatThreshold, expectedRound, seededRandom, simulateFight, forecastFight, threatLevel };
