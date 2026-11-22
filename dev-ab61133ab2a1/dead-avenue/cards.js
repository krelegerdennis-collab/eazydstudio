// Star cards (constellation perks): data + draw logic. No game state in here.

export const LINES = {
  leo:     { name: 'LEO',     color: '#ffb347', bonus: 'PRIDE',    bonusText: '+20% damage on every weapon' },
  comet:   { name: 'COMET',   color: '#3fd0ff', bonus: 'TAILWIND', bonusText: '+15% move speed and fire rate' },
  aegis:   { name: 'AEGIS',   color: '#38ffc8', bonus: 'BULWARK',  bonusText: 'Take 20% less damage' },
  polaris: { name: 'POLARIS', color: '#c46bff', bonus: 'NORTH STAR', bonusText: 'Pickup range ×2' },
  nova:    { name: 'NOVA',    color: '#ff5ad0', bonus: 'SUPERNOVA', bonusText: 'Every 10th kill triggers a Nova blast' },
};

export const RARITY = {
  common: { name: 'COMMON', weight: 60 },
  rare:   { name: 'RARE',   weight: 30 },
  epic:   { name: 'EPIC',   weight: 10 },
};

export const CARDS = [
  { id: 'hollow',    line: 'leo',     rarity: 'common', max: 3, name: 'Hollow Points',   text: '+15% damage' },
  { id: 'headhunt',  line: 'leo',     rarity: 'rare',   max: 2, name: 'Headhunter',      text: '+10% chance for a 3× critical hit' },
  { id: 'pierce',    line: 'leo',     rarity: 'rare',   max: 2, name: 'Piercing Rounds', text: 'Bullets pass through +1 Hollow' },
  { id: 'buckshot',  line: 'leo',     rarity: 'rare',   max: 1, name: 'Buckshot',        text: 'Shotgun fires +3 pellets', needs: 'shotgun' },
  { id: 'trigger',   line: 'comet',   rarity: 'common', max: 3, name: 'Trigger Happy',   text: '+12% fire rate' },
  { id: 'hands',     line: 'comet',   rarity: 'common', max: 2, name: 'Quick Hands',     text: 'Reload 25% faster' },
  { id: 'fleet',     line: 'comet',   rarity: 'common', max: 2, name: 'Fleet Foot',      text: '+10% move speed' },
  { id: 'adrenal',   line: 'comet',   rarity: 'common', max: 2, name: 'Adrenaline',      text: 'Kills refill stamina, sprinting costs less' },
  { id: 'skin',      line: 'aegis',   rarity: 'common', max: 3, name: 'Thick Skin',      text: '+25 max HP' },
  { id: 'vampire',   line: 'aegis',   rarity: 'rare',   max: 2, name: 'Vampire',         text: 'Heal 2 HP per kill' },
  { id: 'shock',     line: 'aegis',   rarity: 'rare',   max: 1, name: 'Shockwave',       text: 'When hit, blast nearby Hollows away (8 s cooldown)' },
  { id: 'second',    line: 'aegis',   rarity: 'epic',   max: 1, name: 'Second Wind',     text: 'Once per checkpoint, survive a lethal hit with 30% HP' },
  { id: 'pockets',   line: 'polaris', rarity: 'common', max: 2, name: 'Deep Pockets',    text: '+30% magazine size' },
  { id: 'scavenger', line: 'polaris', rarity: 'common', max: 2, name: 'Scavenger',       text: 'Ammo and medkits drop 1.5× as often' },
  { id: 'bandit',    line: 'polaris', rarity: 'rare',   max: 1, name: 'Time Bandit',     text: '+30 s on the clock per generator part' },
  { id: 'volatile',  line: 'nova',    rarity: 'epic',   max: 2, name: 'Volatile',        text: '15% of Hollows explode when they die' },
  { id: 'incend',    line: 'nova',    rarity: 'epic',   max: 1, name: 'Incendiary',      text: 'Shots set Hollows on star-fire' },
  { id: 'turret',    line: 'nova',    rarity: 'epic',   max: 2, name: 'Star Turret',     text: 'A satellite drone shoots the nearest Hollow' },
];
export const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));

// how many card stacks the player has in a line
export function lineCount(perks, line) {
  let n = 0;
  for (const c of CARDS) if (c.line === line) n += perks[c.id] || 0;
  return n;
}

// draw up to 3 different cards the player can still take; rarity rolled per slot
export function drawCards(perks, owned, rng = Math.random) {
  const avail = CARDS.filter(c => (perks[c.id] || 0) < c.max && (!c.needs || owned.includes(c.needs)));
  const hand = [];
  const total = Object.values(RARITY).reduce((a, r) => a + r.weight, 0);
  while (hand.length < 3 && hand.length < avail.length) {
    let roll = rng() * total, rarity = 'common';
    for (const [k, r] of Object.entries(RARITY)) { if (roll < r.weight) { rarity = k; break; } roll -= r.weight; }
    const left = avail.filter(c => !hand.includes(c));
    let pool = left.filter(c => c.rarity === rarity);
    if (!pool.length) pool = left;
    hand.push(pool[Math.floor(rng() * pool.length)]);
  }
  return hand;
}
