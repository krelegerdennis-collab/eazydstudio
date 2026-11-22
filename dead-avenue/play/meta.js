// Meta game: characters, armory, maps/modes and the save file. No rendering in here.

export const CHARS = {
  leo: {
    name: 'LEO', title: 'Starborn', cost: 0,
    text: 'Balanced. Lion Roar charges 25% faster.',
    hp: 100, speed: 1, roarGain: 1.25, dashCd: 3, taken: 1, nades: 2, drones: 0, nadeRegen: 0, roarR: 10,
    look: { shirt: 0x1b1d2a, pants: 0x121318, hair: 0x14151c, streak: 0x1aa6a6, accent: 0x5fe8ff },
  },
  vega: {
    name: 'VEGA', title: 'Comet Runner', cost: 300,
    text: 'Fast and fragile. +15% speed, Star Dash recharges in 1.8 s.',
    hp: 80, speed: 1.15, roarGain: 1, dashCd: 1.8, taken: 1, nades: 2, drones: 0, nadeRegen: 0, roarR: 10,
    look: { shirt: 0x40204a, pants: 0x16121c, hair: 0xd8d8e8, streak: 0xff5ad0, accent: 0xff5ad0 },
  },
  atlas: {
    name: 'ATLAS', title: 'Bulwark', cost: 500,
    text: 'Tank. 150 HP, takes 15% less damage, bigger Lion Roar. Slower.',
    hp: 150, speed: 0.9, roarGain: 1, dashCd: 3.5, taken: 0.85, nades: 2, drones: 0, nadeRegen: 0, roarR: 13,
    look: { shirt: 0x4a3a1a, pants: 0x1c1810, hair: 0x2a1a0a, streak: 0xffb347, accent: 0xffb347 },
  },
  nyx: {
    name: 'NYX', title: 'Void Engineer', cost: 800,
    text: 'Starts with a Star Turret and 4 grenades. Builds a new grenade every 40 s.',
    hp: 90, speed: 1, roarGain: 1, dashCd: 3, taken: 1, nades: 4, drones: 1, nadeRegen: 40, roarR: 10,
    look: { shirt: 0x1a1030, pants: 0x100a1c, hair: 0x3a2a6a, streak: 0xc46bff, accent: 0xc46bff },
  },
};

// armory: unlock price and what each of the 5 upgrade levels gives
export const ARMORY = {
  pistol:  { cost: 0,   up: 60 },
  smg:     { cost: 200, up: 80 },
  shotgun: { cost: 350, up: 90 },
  rail:    { cost: 600, up: 110 },
};
export const MAX_UP = 5;
export const upCost = (key, lvl) => ARMORY[key].up * (lvl + 1);
export const upDmg = lvl => 1 + 0.1 * lvl;        // +10% damage per level
export const upMag = lvl => 1 + 0.06 * lvl;       // +6% magazine per level

export const MAPS = {
  avenue: {
    name: 'NEON AVENUE', mode: 'mission', modeName: 'STARFALL', time: 12 * 60, zEnd: -262,
    text: 'Find 5 star cores along the avenue, reach the launch point and bring down the Stargazer.',
    theme: {
      fog: 0x160c2c, hemi: 0x5a4aa0,
      sky: ['#04020c', '#120a32', '#341452', '#9a2f72', '#ff8f5a', '#3a1430'],
      planet: ['#9ff4ff', '#2bb5d8', '#0b2a52'], ring: '255,170,80', halo: '80,220,255',
      aurora: ['60,255,200', '80,200,255', '200,90,255'],
      lampA: 0x9fe8ff, lampB: 0xffc27a, facades: ['#5a3a30', '#4a4540', '#3a4048', '#5c4a3a', '#403238', '#4d4d52'],
    },
  },
  docks: {
    name: 'CRIMSON DOCKS', mode: 'survival', modeName: 'SURVIVAL', time: 8 * 60, zEnd: -78,
    text: 'No way out. Hold the docks for 8 minutes while the waves keep growing.',
    theme: {
      fog: 0x2a0c14, hemi: 0xa04a4a,
      sky: ['#0c0204', '#2a0a14', '#521420', '#b0352a', '#ffb35a', '#3a1410'],
      planet: ['#ffd9a0', '#e0602b', '#52160b'], ring: '255,220,160', halo: '255,120,60',
      aurora: ['255,120,60', '255,60,90', '255,200,90'],
      lampA: 0xffb09a, lampB: 0xff7a5a, facades: ['#5a2a26', '#4a3530', '#3a3038', '#5c3a2a', '#402a2a', '#4d4042'],
    },
  },
  heights: {
    name: 'AURORA HEIGHTS', mode: 'rifts', modeName: 'RIFT HUNT', time: 10 * 60, zEnd: -176,
    text: 'Rifts are tearing the district apart. Seal 6 of them before the clock runs out.',
    theme: {
      fog: 0x0a2420, hemi: 0x4aa08a,
      sky: ['#020c0a', '#0a2a2a', '#144a48', '#2f9a7a', '#c8ff9a', '#143a2a'],
      planet: ['#e8d0ff', '#9a5ad8', '#2a0b52'], ring: '160,255,200', halo: '180,120,255',
      aurora: ['60,255,160', '120,255,220', '160,120,255'],
      lampA: 0x9fffd8, lampB: 0xd0a0ff, facades: ['#2a4a40', '#3a4540', '#30403a', '#3a4a5c', '#2a3840', '#424d4a'],
    },
  },
};

// cosmetics: looks only. `supporter: true` items unlock with a Supporter Pack code.
// The pack also gives +10% stardust and +1 card reroll per run (game.js: SUP_DUST, G.rerolls); never combat power.
export const JACKETS = {
  standard: { name: 'STANDARD', text: "Your fighter's own colours." },
  solar:    { name: 'SOLAR GOLD', text: 'Gold-trimmed lion jacket.', supporter: true, look: { shirt: 0xb8862a, pants: 0x241a08, streak: 0xffd27a, accent: 0xffc24a }, glow: 0xff9a1a },
  voidweave: { name: 'VOID WEAVE', text: 'Deep violet with a nebula glow.', supporter: true, look: { shirt: 0x2a1050, pants: 0x120a22, streak: 0xc46bff, accent: 0xc46bff }, glow: 0x7a3aff },
};
export const TRAILS = {
  none:   { name: 'NO TRAIL', text: 'Clean.' },
  comet:  { name: 'COMET TRAIL', text: 'Cyan sparks behind your steps.', cost: 400, col: [0.3, 0.85, 1] },
  solar:  { name: 'SOLAR TRAIL', text: 'Golden stardust behind your steps.', supporter: true, col: [1, 0.75, 0.3] },
  nebula: { name: 'NEBULA TRAIL', text: 'Violet and pink stardust.', supporter: true, col: [0.85, 0.45, 1] },
};
// where the Supporter Pack is sold; empty = no "get it" link shown in the hub
export const SUPPORTER_URL = 'https://eazyd667.gumroad.com/l/dead-avenue-supporter';
// SHA-256 of valid codes (uppercase, dashes and spaces removed). The codes themselves are not in the source.
const CODE_HASHES = ['783ff210cfce3181fc6a217a812c256fb6b6ec53e15dd638fffb5d2fd529827c'];
export async function checkCode(code) {
  const norm = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (norm.length < 8 || !(globalThis.crypto && crypto.subtle)) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  return CODE_HASHES.includes(hex);
}

const KEY = 'deadavenue.save.v1';
const fresh = () => ({
  dust: 0,
  chars: { leo: true },
  weapons: { pistol: { own: true, lvl: 0 }, smg: { own: false, lvl: 0 }, shotgun: { own: false, lvl: 0 }, rail: { own: false, lvl: 0 } },
  sel: { char: 'leo', map: 'avenue', secondary: null },
  best: {}, wins: {}, runs: 0, music: true,
  supporter: false, trails: { comet: false }, cos: { jacket: 'standard', trail: 'none' },
});

export function loadSave() {
  const s = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      Object.assign(s, raw);
      s.chars = { ...fresh().chars, ...(raw.chars || {}) };
      s.weapons = { ...fresh().weapons, ...(raw.weapons || {}) };
      s.sel = { ...fresh().sel, ...(raw.sel || {}) };
      s.trails = { ...fresh().trails, ...(raw.trails || {}) };
      s.cos = { ...fresh().cos, ...(raw.cos || {}) };
    }
  } catch (e) { /* private mode or blocked storage: play without saving */ }
  if (!CHARS[s.sel.char] || !s.chars[s.sel.char]) s.sel.char = 'leo';
  if (!MAPS[s.sel.map]) s.sel.map = 'avenue';
  if (s.sel.secondary && !(s.weapons[s.sel.secondary] && s.weapons[s.sel.secondary].own)) s.sel.secondary = null;
  const j = JACKETS[s.cos.jacket], t = TRAILS[s.cos.trail];
  if (!j || (j.supporter && !s.supporter)) s.cos.jacket = 'standard';
  if (!t || (t.supporter && !s.supporter) || (t.cost && !s.trails[s.cos.trail])) s.cos.trail = 'none';
  return s;
}
export function storeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
}
