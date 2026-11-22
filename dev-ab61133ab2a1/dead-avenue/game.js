// Dead Avenue — top-down zombie shooter prototype (EazyD Studio). Three.js r170.
import * as THREE from 'three';
import { EffectComposer } from './lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './lib/addons/postprocessing/OutputPass.js';
import { CARD, LINES, drawCards, lineCount } from './cards.js?v=2';

// ---------------------------------------------------------------- helpers
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };

// ---------------------------------------------------------------- constants
const Z_START = 14, Z_END = -262, ROAD = 7, CURB = 12.5;
const MISSION_TIME = 15 * 60;
const GEAR_SPOTS = [[-9.5, -38], [4.5, -84], [-3, -128], [10, -170], [-8.5, -213]];
const EVAC = { x: 0, z: -244 };
const WEAPONS = {
  pistol:  { name: 'PULSE PISTOL', short: 'PULSE', dmg: 38, rate: 0.24, mag: 12, reserve: Infinity, pellets: 1, spread: 0.025, reload: 1.0, shake: 0.12, knock: 0.15, col: 0x9ff4ff, rune3: 'Pulses pierce +1 Hollow' },
  smg:     { name: 'COMET SMG', short: 'COMET', dmg: 21, rate: 0.075, mag: 32, reserve: 96, pellets: 1, spread: 0.075, reload: 1.4, shake: 0.07, knock: 0.07, col: 0xffb347, rune3: 'Comet rounds ignite Hollows' },
  shotgun: { name: 'NOVA SHOTGUN', short: 'NOVA', dmg: 24, rate: 0.85, mag: 6, reserve: 18, pellets: 8, spread: 0.2, reload: 1.8, shake: 0.4, knock: 0.45, col: 0xff5ad0, rune3: '+3 plasma pellets' },
  rail:    { name: 'RAIL LANCE', short: 'RAIL', dmg: 150, rate: 1.0, mag: 4, reserve: 12, pellets: 1, spread: 0.004, reload: 1.9, shake: 0.5, knock: 0.6, col: 0xe8ffff, rail: true, rune3: 'Kills burst into mini novas' },
};
const ORDER = ['pistol', 'smg', 'shotgun', 'rail'];
const RUNES = [0, 30, 90];   // weapon kills needed for rune I, II, III
const runeLvl = w => (P.wkills[w] >= RUNES[2] ? 3 : P.wkills[w] >= RUNES[1] ? 2 : 1);

// ---------------------------------------------------------------- renderer / scene
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x160c2c, 0.014);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), IS_TOUCH ? 0.5 : 0.6, 0.35, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 58 : 40;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight(0x5a4aa0, 0x0a0c18, 0.85));
const moon = new THREE.DirectionalLight(0xa9b8ff, 0.5);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 90 });
moon.shadow.bias = -0.0008;
scene.add(moon, moon.target);

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function speckle(g, w, h, n, cols, smin, smax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = pick(cols); g.globalAlpha = rand(0.05, 0.4);
    const s = rand(smin, smax); g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  g.globalAlpha = 1;
}
const roadTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 4000, ['#1a1b1f', '#33363d', '#3d4047', '#141518'], 1, 4);
  for (let i = 0; i < 8; i++) { g.fillStyle = pick(['#1c1e22', '#2e3137']); g.globalAlpha = 0.55; g.fillRect(rand(0, w), rand(0, h), rand(20, 70), rand(20, 90)); }
  g.globalAlpha = 1; g.strokeStyle = '#111215'; g.lineWidth = 1.3;
  for (let i = 0; i < 12; i++) { let x = rand(0, w), y = rand(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += rand(-14, 14); y += rand(-14, 14); g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = '#d9d5c3'; g.globalAlpha = 0.8;
  g.fillRect(w / 2 - 6, 0, 3, h); g.fillRect(w / 2 + 3, 0, 3, h);
  g.fillRect(9, 0, 3, h); g.fillRect(w - 12, 0, 3, h);
  g.globalAlpha = 0.55; for (let y = 0; y < h; y += 64) { g.fillRect(w * 0.25 - 1, y, 3, 30); g.fillRect(w * 0.75 - 1, y, 3, 30); }
  g.globalAlpha = 1;
}, { repeat: true });
const walkTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4b4e54'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 2500, ['#3a3d42', '#5b5e64', '#2f3135'], 1, 3);
  g.strokeStyle = '#2b2d31'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
}, { repeat: true });
const roofTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#23252b'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 1200, ['#1a1b1f', '#2f3239', '#3a3c42'], 1, 5);
}, { repeat: true });
function facadeTex(wall) {
  const lit = [];
  const map = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 1500, ['#000', '#fff', '#222'], 1, 3);
    for (let fy = 0; fy < 4; fy++) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, fy * 64 + 60, w, 4);
      for (let bx = 0; bx < 4; bx++) {
        const on = Math.random() < 0.22; lit.push(on);
        g.fillStyle = on ? '#6a5a3a' : '#0d1016'; g.fillRect(bx * 64 + 18, fy * 64 + 14, 28, 34);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(bx * 64 + 16, fy * 64 + 48, 32, 4);
      }
    }
  }, { repeat: true });
  const em = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    let i = 0;
    for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++) {
      if (lit[i++]) { g.fillStyle = pick(['#ffb45a', '#ffd38a', '#9fc8ff', '#ff9a6a']); g.fillRect(bx * 64 + 18, fy * 64 + 14, 28, 34); }
    }
  }, { repeat: true });
  return { map, em };
}
const FACADES = ['#5a3a30', '#4a4540', '#3a4048', '#5c4a3a', '#403238', '#4d4d52'].map(facadeTex);
const glowTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const bloodTexs = [0, 1, 2].map(() => canvasTex(128, 128, (g, w, h) => {
  const col = () => `rgba(${randi(70, 110)},${randi(0, 10)},${randi(24, 44)},${rand(0.75, 0.95)})`;
  for (let i = 0; i < 9; i++) { g.fillStyle = col(); g.beginPath(); g.arc(64 + rand(-22, 22), 64 + rand(-22, 22), rand(10, 28), 0, TAU); g.fill(); }
  for (let i = 0; i < 26; i++) { const a = rand(0, TAU), r = rand(30, 60); g.fillStyle = col(); g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, rand(1.5, 5), 0, TAU); g.fill(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(80,220,255,${rand(0.4, 0.9)})`; g.fillRect(64 + rand(-30, 30), 64 + rand(-30, 30), 2, 2); }
}));
const emblemTex = canvasTex(128, 128, (g, w, h) => {
  g.translate(64, 64);
  g.strokeStyle = '#ffb347'; g.lineWidth = 7; g.beginPath(); g.ellipse(0, 6, 58, 17, -0.25, 0, TAU); g.stroke();
  const gr = g.createRadialGradient(-10, -12, 4, 0, 0, 40); gr.addColorStop(0, '#9ff4ff'); gr.addColorStop(1, '#147a9a');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 38, 0, TAU); g.fill();
  g.strokeStyle = '#ffb347'; g.lineWidth = 7; g.beginPath(); g.ellipse(0, 6, 58, 17, -0.25, -0.1, Math.PI + 0.1); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 38px Bahnschrift, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ED', 0, 2);
});
function neonTex(text, color) {
  return canvasTex(512, 128, (g, w, h) => {
    g.font = 'bold 72px Bahnschrift, Arial Narrow, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 26; g.fillStyle = color;
    g.fillText(text, w / 2, h / 2); g.shadowBlur = 10; g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.55; g.fillText(text, w / 2, h / 2);
    // holo frame + scanlines
    g.globalAlpha = 0.5; g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.45;
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1.5);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  });
}
// cosmic sky (equirectangular): synthwave horizon, aurora, stars, ringed planet (ED colours)
const skyTex = canvasTex(2048, 1024, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#04020c'); gr.addColorStop(0.25, '#120a32'); gr.addColorStop(0.4, '#341452');
  gr.addColorStop(0.47, '#9a2f72'); gr.addColorStop(0.498, '#ff8f5a'); gr.addColorStop(0.505, '#3a1430'); gr.addColorStop(1, '#06040a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const y = Math.pow(Math.random(), 1.6) * h * 0.47, a = rand(0.2, 1) * (1 - y / (h * 0.5));
    g.fillStyle = Math.random() < 0.15 ? `rgba(255,190,120,${a})` : Math.random() < 0.3 ? `rgba(120,230,255,${a})` : `rgba(255,255,255,${a})`;
    const s = Math.random() < 0.04 ? 2.4 : rand(0.7, 1.5); g.fillRect(rand(0, w), y, s, s);
  }
  g.globalCompositeOperation = 'lighter';
  for (const [col, base, amp, f, ph] of [['60,255,200', 0.22, 28, 0.004, 0], ['80,200,255', 0.27, 22, 0.006, 2], ['200,90,255', 0.18, 18, 0.003, 4]]) {
    for (let x = 0; x < w; x += 2) {
      const y = h * base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph) * amp * 0.3;
      const k = 0.5 + 0.5 * Math.sin(x * 0.0021 + ph * 1.7);
      for (let j = 0; j < 6; j++) { g.fillStyle = `rgba(${col},${0.045 * k * (1 - j / 6)})`; g.fillRect(x, y + j * 9, 2, 10); }
    }
  }
  // planet with ring, straight ahead (-z => u = 0.25), ~32 degrees up
  const px = w * 0.25, py = h * 0.32, r = 104, sx = 1.18;
  const halo = g.createRadialGradient(px, py, r * 0.8, px, py, r * 2.4);
  halo.addColorStop(0, 'rgba(80,220,255,0.35)'); halo.addColorStop(1, 'rgba(80,220,255,0)');
  g.fillStyle = halo; g.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);
  g.globalCompositeOperation = 'source-over';
  const ring = (back) => {
    g.save(); g.translate(px, py); g.rotate(-0.32); g.scale(sx, 1);
    g.beginPath(); g.ellipse(0, 0, r * 1.9, r * 0.42, 0, back ? Math.PI : 0, back ? TAU : Math.PI);
    g.lineWidth = 14; g.strokeStyle = 'rgba(255,170,80,0.85)'; g.stroke();
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,230,170,0.9)'; g.stroke();
    g.restore();
  };
  ring(true);
  g.save(); g.translate(px, py); g.scale(sx, 1);
  const body = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  body.addColorStop(0, '#9ff4ff'); body.addColorStop(0.45, '#2bb5d8'); body.addColorStop(1, '#0b2a52');
  g.fillStyle = body; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.globalAlpha = 0.25; g.fillStyle = '#063048';
  for (let i = 0; i < 5; i++) { g.fillRect(-r, -r * 0.6 + i * r * 0.3, r * 2, r * 0.09); }
  g.globalAlpha = 1;
  const shade = g.createLinearGradient(-r, -r, r, r); shade.addColorStop(0.45, 'rgba(4,2,20,0)'); shade.addColorStop(1, 'rgba(4,2,20,0.85)');
  g.fillStyle = shade; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.restore();
  ring(false);
  // orange sparkle like the ED logo
  const star = (x, y, s) => { g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.25, y - s * 0.25); g.lineTo(x + s, y); g.lineTo(x + s * 0.25, y + s * 0.25); g.lineTo(x, y + s); g.lineTo(x - s * 0.25, y + s * 0.25); g.lineTo(x - s, y); g.lineTo(x - s * 0.25, y - s * 0.25); g.fill(); };
  star(px + r * 1.9, py - r * 1.1, 22); star(px + r * 2.3, py - r * 0.75, 9); star(px - r * 2.2, py + r * 0.6, 7);
  // small moon on the other side
  g.fillStyle = '#d9c9ff'; g.beginPath(); g.arc(w * 0.62, h * 0.2, 26, 0, TAU); g.fill();
  // city skyline all around the horizon
  for (let x = 0; x < w;) {
    const bw = rand(14, 44), bh = rand(8, 70) * (Math.random() < 0.1 ? 1.8 : 1);
    g.fillStyle = '#0b0614'; g.fillRect(x, h * 0.5 - bh, bw, bh + 2);
    for (let k = 0; k < bh / 6; k++) if (Math.random() < 0.35) { g.fillStyle = pick(['#ffb347', '#3fd0ff', '#ff5ad0', '#fff2c0']); g.globalAlpha = rand(0.3, 0.9); g.fillRect(x + rand(2, bw - 4), h * 0.5 - rand(4, bh), 2, 2); g.globalAlpha = 1; }
    x += bw + rand(0, 6);
  }
});
skyTex.mapping = THREE.EquirectangularReflectionMapping;
scene.background = skyTex;
scene.environment = skyTex;
scene.environmentIntensity = 0.5;
// puddle roughness for the wet road (dark = smooth = reflective)
const puddleTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = rand(0, w), y = rand(0, h), r = rand(18, 60);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#202020'); gr.addColorStop(0.7, '#404040'); gr.addColorStop(1, 'rgba(216,216,216,0)');
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, rand(1.2, 2.4)); g.translate(-x, -y); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  }
}, { repeat: true, srgb: false });

// ---------------------------------------------------------------- world data
const obstacles = [];               // axis-aligned boxes {x0,x1,z0,z1}
const lightSpots = [];              // candidates for the dynamic light pool
const fires = [];
function addBox(cx, cz, w, d, rot = 0) {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
  const o = { x0: cx - hw, x1: cx + hw, z0: cz - hd, z1: cz + hd };
  obstacles.push(o); return o;
}
function blocked(x, z, m = 0.6) {
  if (x < -CURB + m || x > CURB - m || z > Z_START - 2 || z < Z_END + 3) return true;
  for (const o of obstacles) if (x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m) return true;
  return false;
}
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...o });
const addGlow = (color, size, x, y, z, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); scene.add(s); return s;
};
const poolMat = c => new THREE.MeshBasicMaterial({ map: glowTex, color: c, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
function addPool(color, size, x, z, opacity = 0.3) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), poolMat(color));
  m.material.opacity = opacity; m.rotation.x = -Math.PI / 2; m.scale.set(size, size, 1); m.position.set(x, 0.05, z); scene.add(m); return m;
}

// ---------------------------------------------------------------- build the avenue
function buildStreet() {
  const L = Z_START - Z_END + 40, midZ = (Z_START + Z_END) / 2 - 10;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD * 2, L), mat(0xffffff, { map: roadTex, roughness: 1, roughnessMap: puddleTex, metalness: 0.15, envMapIntensity: 2.2 }));
  roadTex.repeat.set(1, L / 28); puddleTex.repeat.set(1, L / 41);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, midZ); road.receiveShadow = true; scene.add(road);
  for (const side of [-1, 1]) {
    const t = walkTex.clone(); t.needsUpdate = true; t.repeat.set(1, L / 5);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(CURB - ROAD + 0.2, L), mat(0xffffff, { map: t }));
    walk.rotation.x = -Math.PI / 2; walk.position.set(side * (ROAD + (CURB - ROAD) / 2), 0.06, midZ); walk.receiveShadow = true; scene.add(walk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, L), mat(0x77797e));
    curb.position.set(side * ROAD, 0.07, midZ); curb.receiveShadow = true; scene.add(curb);
  }
  // buildings
  for (const side of [-1, 1]) {
    let z = Z_START + 14;
    while (z > Z_END - 20) {
      const len = rand(10, 20), h = rand(9, 22), depth = 12;
      const f = pick(FACADES);
      const map = f.map.clone(), em = f.em.clone(); map.needsUpdate = em.needsUpdate = true;
      map.repeat.set(len / 16, h / 14); em.repeat.copy(map.repeat);
      const wall = mat(0xffffff, { map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 1.4 });
      const rt = roofTex.clone(); rt.needsUpdate = true; rt.repeat.set(depth / 6, len / 6);
      const roof = mat(0xffffff, { map: rt });
      const b = new THREE.Mesh(new THREE.BoxGeometry(depth, h, len), [wall, wall, roof, roof, wall, wall]);
      b.position.set(side * (CURB + depth / 2), h / 2, z - len / 2); b.castShadow = b.receiveShadow = true; scene.add(b);
      // storefront glow + neon blade sign
      if (Math.random() < 0.7) {
        const shopCol = pick([0xffb347, 0x3fd0ff, 0xff5ad0, 0x38ffc8, 0xc46bff, 0x3fd0ff]);
        const shop = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.7, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(shopCol).multiplyScalar(0.16) }));
        shop.position.set(side * (CURB - 0.02), 1.5, z - len / 2); shop.rotation.y = -side * Math.PI / 2; scene.add(shop);
        addPool(shopCol, 7, side * (CURB - 2.2), z - len / 2, 0.22);
        if (Math.random() < 0.75) {
          const [txt, col] = pick(SIGNS);
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: neonTex(txt, col), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
          sign.position.set(side * (CURB - 1.9), rand(3.6, 5.5), z - rand(1.5, len - 1.5)); scene.add(sign);
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.05, 0.08), mat(0x111111));
          bracket.position.copy(sign.position); bracket.position.z -= 0.06; scene.add(bracket);
          const sg = addGlow(col, 7, sign.position.x, sign.position.y, sign.position.z - 0.1, 0.35);
          holoSigns.push({ sign, sg, t: rand(0, 100), glitch: Math.random() < 0.35 });
          lightSpots.push({ pos: new THREE.Vector3(sign.position.x, sign.position.y - 1, sign.position.z + 1.5), color: new THREE.Color(col), intensity: 45, dist: 12 });
        }
      }
      z -= len + (Math.random() < 0.18 ? rand(3, 5) : 0);
    }
  }
  // street lamps + power lines
  const poleMat = mat(0x2a2c30, { metalness: 0.6, roughness: 0.5 });
  const tops = { '-1': [], '1': [] };
  let k = 0;
  for (let z = Z_START - 6; z > Z_END; z -= 13, k++) {
    const side = k % 2 ? 1 : -1, x = side * 9.3;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 7.4, 8), poleMat);
    pole.position.set(x, 3.7, z); pole.castShadow = true; scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.12), poleMat);
    arm.position.set(x - side * 1.15, 7.2, z); scene.add(arm);
    const gold = k % 3 === 0, lc = gold ? 0xffc27a : 0x9fe8ff;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: gold ? 0xffe2b0 : 0xd8f8ff }));
    head.position.set(x - side * 2.3, 7.1, z); scene.add(head);
    const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: gold ? 0xffb347 : 0x3fd0ff }));
    ringL.rotation.x = Math.PI / 2; ringL.position.set(x - side * 2.3, 6.95, z); scene.add(ringL);
    addGlow(lc, 2.2, x - side * 2.3, 6.9, z, 0.5);
    addPool(lc, 14, x - side * 2.3, z, gold ? 0.42 : 0.34);
    lightSpots.push({ pos: new THREE.Vector3(x - side * 2.3, 6.6, z), color: new THREE.Color(gold ? 0xffc98a : 0xbfefff), intensity: 140, dist: 20, lamp: true });
    addBox(x, z, 0.35, 0.35);
    tops[side].push(new THREE.Vector3(x, 7.3, z));
  }
  const wireMat = new THREE.LineBasicMaterial({ color: 0x07080a });
  const pts = [];
  for (const s of ['-1', '1']) for (let i = 0; i < tops[s].length - 1; i++) pts.push(tops[s][i], tops[s][i + 1]);
  for (let i = 0; i < tops['-1'].length; i++) if (tops['1'][i] && i % 2 === 0) pts.push(tops['-1'][i], tops['1'][i]);
  const sag = [];
  for (let i = 0; i < pts.length; i += 2) {
    const a = pts[i], b = pts[i + 1];
    for (let j = 0; j < 8; j++) {
      const t0 = j / 8, t1 = (j + 1) / 8;
      const p0 = a.clone().lerp(b, t0); p0.y -= Math.sin(t0 * Math.PI) * 0.9;
      const p1 = a.clone().lerp(b, t1); p1.y -= Math.sin(t1 * Math.PI) * 0.9;
      sag.push(p0, p1, p0.clone().setY(p0.y + 0.25), p1.clone().setY(p1.y + 0.25));
    }
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(sag), wireMat));
}
const SIGNS = [['STARDUST BAR', '#3fd0ff'], ['ORBIT CAFE', '#ffb347'], ['NOVA ARCADE', '#c46bff'], ['COMET NOODLES', '#ff5ad0'], ['ZERO-G GYM', '#3fd0ff'], ['LUNA MOTEL', '#ff5ad0'],
  ['CYBER CLINIC', '#38ffc8'], ['RING DINER', '#ffb347'], ['VOID TATTOO', '#c46bff'], ['24/7 FUEL', '#38ffc8'], ['HOLO PAWN', '#ffb347'], ['AURORA HOTEL', '#3fd0ff'], ['ED RECORDS', '#ffb347'], ['SYNTH LOUNGE', '#ff5ad0']];
const holoSigns = [];

function makeCar(x, z, rot, { van = false, burning = false, color } = {}) {
  const g = new THREE.Group();
  const body = mat(color ?? pick([0x8a9aa6, 0x6c7a70, 0x9a8f7a, 0x5a6470, 0x7a4a40, 0xb8b8b0, 0x40506a]), { roughness: 0.45, metalness: 0.4 });
  const glass = mat(0x0b0f16, { roughness: 0.15, metalness: 0.6 });
  const W = van ? 2.15 : 1.85, Lh = van ? 5.2 : 4.4;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(W, van ? 1.0 : 0.75, Lh), body); lower.position.y = van ? 0.85 : 0.6;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, van ? 1.15 : 0.62, van ? Lh * 0.78 : 2.2), [body, body, body, body, glass, glass]);
  cab.position.set(0, van ? 1.9 : 1.28, van ? -0.45 : -0.15);
  g.add(lower, cab);
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12); wg.rotateZ(Math.PI / 2);
  const wm = mat(0x101010);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(wg, wm); w.position.set(sx * W / 2, 0.36, sz * Lh * 0.32); g.add(w); }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0x5a0508 })); tail.position.set(0, van ? 1.0 : 0.75, Lh / 2 + 0.01); g.add(tail);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  addBox(x, z, W, Lh, rot);
  if (burning) addFire(x + Math.sin(rot) * Lh * 0.3, van ? 2.2 : 1.2, z + Math.cos(rot) * Lh * 0.3, 1.3);
  return g;
}
function addFire(x, y, z, s = 1) {
  const outer = addGlow(0xff5a1a, 4.5 * s, x, y + 0.6 * s, z, 0.7);
  const inner = addGlow(0xffc040, 2.2 * s, x, y + 0.4 * s, z, 0.9);
  const flames = [];
  for (let i = 0; i < 5; i++) flames.push(addGlow(0xff8a2a, 1.2 * s, x + rand(-0.4, 0.4) * s, y + rand(0, 1) * s, z + rand(-0.4, 0.4) * s, 0.8));
  const pool = addPool(0xff6a2a, 9 * s, x, z, 0.28);
  const spot = { pos: new THREE.Vector3(x, y + 1.2, z), color: new THREE.Color(0xff7a30), intensity: 90 * s, dist: 16, flicker: true };
  lightSpots.push(spot);
  fires.push({ outer, inner, flames, pool, spot, x, y, z, s, t: rand(0, 10) });
}

function buildProps() {
  // hero van near the start, like the reference shot
  makeCar(-3.6, -14, 0.28, { van: true, color: 0xb9c2b0 });
  makeHoverCar(5.4, -6, -0.08, { glow: 0x3fd0ff });
  makeCar(-5.8, -44, 0.05, { burning: true });
  for (const [x, z, s] of CRATERS) buildCrater(x, z, s);
  const keepClear = [[0, 0, 7], [EVAC.x, EVAC.z, 7], ...GEAR_SPOTS.map(([x, z]) => [x, z, 3]), ...CRATERS.map(([x, z]) => [x, z, 5])];
  const clear = (x, z, r = 3.5) => keepClear.every(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) > cr + r);
  for (let z = -40; z > Z_END + 22; z -= rand(8, 14)) {
    if (Math.random() < 0.25) continue;
    const parked = Math.random() < 0.55;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = parked ? side * 5.5 : rand(-4.2, 4.2);
    const rot = parked ? rand(-0.08, 0.08) + (Math.random() < 0.5 ? 0 : Math.PI) : rand(-0.9, 0.9);
    if (!clear(x, z)) continue;
    if (Math.random() < 0.4) makeHoverCar(x, z, rot);
    else makeCar(x, z, rot, { van: Math.random() < 0.15, burning: Math.random() < 0.18 });
  }
  // burning barrels + trees + barriers
  const barrelMat = mat(0x5a3a22, { metalness: 0.5, roughness: 0.6 });
  for (let i = 0; i < 16; i++) {
    const side = Math.random() < 0.5 ? -1 : 1, x = side * rand(8, 11.5), z = rand(Z_END + 10, Z_START - 10);
    if (blocked(x, z, 0.6) || !clear(x, z, 2)) continue;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.95, 12), barrelMat); b.position.set(x, 0.48, z); b.castShadow = true; scene.add(b);
    addBox(x, z, 0.7, 0.7);
    if (Math.random() < 0.6) addFire(x, 1.0, z, 0.6);
  }
  const trunkMat = mat(0x2a2018), leafMat = mat(0x3a1e22, { roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const side = Math.random() < 0.5 ? -1 : 1, x = side * rand(10.3, 11.4), z = rand(Z_END + 10, Z_START - 8);
    if (blocked(x, z, 1.2)) continue;
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 4, 6), trunkMat); tr.position.y = 2; t.add(tr);
    for (let j = 0; j < 6; j++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.6, 1.1), 0), leafMat); l.position.set(rand(-1, 1), rand(3.5, 5), rand(-1, 1)); t.add(l); }
    t.traverse(o => { if (o.isMesh) o.castShadow = true; }); t.position.set(x, 0, z); scene.add(t);
    addBox(x, z, 0.4, 0.4);
  }
  const stripe = canvasTex(64, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d8d8d8' : '#c8301e'; g.fillRect(i * 8, 0, 8, 16); } });
  const barMat = mat(0xffffff, { map: stripe });
  for (let i = 0; i < 22; i++) {
    const x = rand(-11.5, 11.5), z = rand(Z_END + 8, Z_START - 12);
    if (blocked(x, z, 0.8) || !clear(x, z, 2)) continue;
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.05), barMat); board.position.y = 0.85; g.add(board);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.5), mat(0xcfcfcf)); leg.position.set(s * 0.6, 0.5, 0); leg.rotation.x = 0.25; g.add(leg); }
    g.position.set(x, 0, z); g.rotation.y = rand(-0.6, 0.6); if (Math.random() < 0.3) { g.rotation.z = Math.PI / 2; g.position.y = 0.05; }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
  }
  // end barricades
  for (const zEnd of [Z_START - 1, Z_END + 2]) {
    for (let x = -12; x <= 12; x += 2.2) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2, rand(1, 1.6), 1), mat(pick([0x3a3d44, 0x55473a, 0x2d3036])));
      b.position.set(x, 0.6, zEnd + rand(-0.4, 0.4)); b.rotation.y = rand(-0.3, 0.3); b.castShadow = true; scene.add(b);
    }
  }
  // instanced debris
  const dummy = new THREE.Object3D();
  function scatter(geom, material, count, place) {
    const im = new THREE.InstancedMesh(geom, material, count);
    for (let i = 0; i < count; i++) { place(dummy); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
    im.receiveShadow = true; scene.add(im); return im;
  }
  const spot = () => {
    const r = Math.random();
    if (r < 0.55) { const s = Math.random() < 0.5 ? -1 : 1; return [s * rand(7.3, 12.2), rand(Z_END, Z_START)]; }
    const s = Math.random() < 0.5 ? -1 : 1; return [s * (ROAD - Math.abs(rand(-3.5, 3.5)) * Math.random()), rand(Z_END, Z_START)];
  };
  scatter(new THREE.BoxGeometry(0.7, 0.04, 0.5), mat(0x8a6a48), 420, d => { const [x, z] = spot(); d.position.set(x, 0.09, z); d.rotation.set(rand(-0.1, 0.1), rand(0, TAU), rand(-0.1, 0.1)); d.scale.setScalar(rand(0.6, 1.4)); });
  scatter(new THREE.PlaneGeometry(0.3, 0.4).rotateX(-Math.PI / 2), mat(0xc9c4b4, { side: THREE.DoubleSide }), 500, d => { const [x, z] = spot(); d.position.set(x, 0.08, z); d.rotation.set(0, rand(0, TAU), 0); d.scale.setScalar(rand(0.6, 1.3)); });
  scatter(new THREE.DodecahedronGeometry(0.22, 0), mat(0x5c5a56), 380, d => { const [x, z] = spot(); d.position.set(x, 0.06, z); d.rotation.set(rand(0, 3), rand(0, 3), 0); d.scale.set(rand(0.5, 1.6), rand(0.3, 0.8), rand(0.5, 1.6)); });
  scatter(new THREE.SphereGeometry(0.4, 7, 5), mat(0x0d0e10, { roughness: 0.3 }), 70, d => { const s = Math.random() < 0.5 ? -1 : 1; d.position.set(s * rand(11, 12.3), 0.25, rand(Z_END, Z_START)); d.scale.set(rand(0.8, 1.3), rand(0.6, 0.9), rand(0.8, 1.2)); });
  scatter(new THREE.ConeGeometry(0.18, 0.55, 8), mat(0xff6a1a, { roughness: 0.6 }), 40, d => { const [x, z] = spot(); d.position.set(x, 0.28, z); d.rotation.set(0, 0, Math.random() < 0.4 ? Math.PI / 2 : 0); if (d.rotation.z) d.position.y = 0.18; });
}

// ---------------------------------------------------------------- cosmic world dressing
const hovers = [], skyCars = [], crystals = [], streaks = [];
const CRATERS = [[2.5, -32, 1.15], [-2, -150, 1]];
function makeHoverCar(x, z, rot, { color, glow } = {}) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const body = mat(color ?? pick([0x1d2233, 0x2a2140, 0x3a3f4f, 0xd8dde6, 0x16303a]), { roughness: 0.3, metalness: 0.7 });
  const glass = mat(0x061018, { roughness: 0.1, metalness: 0.8, emissive: 0x0a2230 });
  const gc = glow ?? pick([0x3fd0ff, 0xff5ad0, 0xffb347, 0x38ffc8]);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 4.6), body); hull.position.y = 0.35;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 1.1), body); nose.position.set(0, 0.3, 2.6); nose.rotation.x = 0.25;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 2.0), glass); canopy.position.set(0, 0.75, -0.2);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.05, 4.65), new THREE.MeshBasicMaterial({ color: gc })); strip.position.y = 0.18;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2a55 })); tail.position.set(0, 0.45, -2.31);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xd8f8ff })); head.position.set(0, 0.38, 3.12);
  inner.add(hull, nose, canopy, strip, tail, head);
  inner.traverse(o => { if (o.isMesh && o.material !== strip.material) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  const under = addPool(gc, 6.5, x, z, 0.5);
  addBox(x, z, 1.9, 5, rot);
  lightSpots.push({ pos: new THREE.Vector3(x, 0.6, z), color: new THREE.Color(gc), intensity: 18, dist: 7 });
  hovers.push({ inner, under, t: rand(0, 10) });
  return g;
}
const crystalMat = new THREE.MeshStandardMaterial({ color: 0x0a2a3a, emissive: 0x3fd0ff, emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.3, flatShading: true });
const scorchTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(10,6,16,0.95)'); gr.addColorStop(0.6, 'rgba(20,10,30,0.7)'); gr.addColorStop(1, 'rgba(20,10,30,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const a = rand(0, TAU), r = rand(10, 56); g.fillStyle = `rgba(63,208,255,${rand(0.2, 0.7)})`; g.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 2); }
});
function buildCrater(x, z, s) {
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: scorchTex, transparent: true, depthWrite: false, emissive: 0xffffff, emissiveMap: scorchTex, emissiveIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -1 }));
  sc.scale.set(11 * s, 1, 11 * s); sc.position.set(x, 0.065, z); sc.receiveShadow = true; scene.add(sc);
  const rock = mat(0x2a2630, { roughness: 0.9 });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + rand(-0.1, 0.1), r = rand(2.6, 3.4) * s;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.4, 0.8) * s, 0), rock);
    m.position.set(x + Math.cos(a) * r, rand(0, 0.25), z + Math.sin(a) * r); m.rotation.set(rand(0, 3), rand(0, 3), 0); m.scale.y = rand(0.4, 0.8);
    m.castShadow = m.receiveShadow = true; scene.add(m);
  }
  const cl = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(rand(0.35, 0.6) * s, 0), crystalMat);
    c.scale.y = rand(2.2, 3.6); c.position.set(rand(-0.7, 0.7) * s, c.scale.y * 0.35 * s, rand(-0.7, 0.7) * s);
    c.rotation.set(rand(-0.5, 0.5), rand(0, 3), rand(-0.5, 0.5)); c.castShadow = true; cl.add(c);
  }
  cl.position.set(x, 0, z); scene.add(cl);
  const glow = addGlow(0x3fd0ff, 6 * s, x, 1.6, z, 0.3);
  addPool(0x3fd0ff, 12 * s, x, z, 0.4);
  const spot = { pos: new THREE.Vector3(x, 2.5, z), color: new THREE.Color(0x5fe0ff), intensity: 70 * s, dist: 16, flicker: true };
  lightSpots.push(spot);
  addBox(x, z, 2.2 * s, 2.2 * s);
  crystals.push({ x, z, s, glow, cl, t: rand(0, 10) });
}
const trailTex = canvasTex(256, 32, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.85, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.fillRect(0, h * 0.3, w, h * 0.4);
});
function buildSkyTraffic() {
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const dir = i % 2 ? 1 : -1;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 3.2), mat(pick([0x1d2233, 0x2a2140, 0x16303a]), { roughness: 0.3, metalness: 0.7 }));
    g.add(hull);
    const front = addGlow(0xd8f8ff, 1.6, 0, 0, 0, 0.9); scene.remove(front); front.position.set(0, 0, 1.7); g.add(front);
    const back = addGlow(dir > 0 ? 0xff5ad0 : 0xff2a55, 1.4, 0, 0, 0, 0.9); scene.remove(back); back.position.set(0, 0, -1.7); g.add(back);
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.5).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: trailTex, color: dir > 0 ? 0xff5ad0 : 0x3fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    trail.position.z = -6.2; g.add(trail);
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(g);
    skyCars.push({ g, dir, x: dir > 0 ? rand(8.5, 11) : -rand(8.5, 11), y: rand(8.5, 10.5), z: rand(-60, 30), speed: rand(16, 30) });
  }
}
function spawnStreak(focus) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: trailTex, color: pick([0xffb347, 0x9ff4ff, 0xffffff]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  const a = rand(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI);
  m.rotation.y = -a;
  const sx = Math.cos(a), sz = Math.sin(a);
  m.position.set(focus.x - sx * 30, 22, focus.z - 8 + rand(-10, 6) - sz * 30);
  scene.add(m);
  streaks.push({ m, vx: sx * 60, vz: sz * 60, t: 0 });
}
// ambient stardust + additive sparks (kills, crystals)
const DN = 260;
const dGeo = new THREE.BufferGeometry(), dPos = new Float32Array(DN * 3), dCol = new Float32Array(DN * 3), dSeed = new Float32Array(DN);
for (let i = 0; i < DN; i++) {
  dPos[i * 3] = rand(-22, 22); dPos[i * 3 + 1] = rand(0.3, 9); dPos[i * 3 + 2] = rand(-30, 20); dSeed[i] = rand(0, 100);
  const c = Math.random() < 0.6 ? [0.25, 0.8, 1] : [1, 0.7, 0.3]; const k = rand(0.4, 1);
  dCol[i * 3] = c[0] * k; dCol[i * 3 + 1] = c[1] * k; dCol[i * 3 + 2] = c[2] * k;
}
dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3)); dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
dust.frustumCulled = false; scene.add(dust);
const SN = 500;
const sGeo = new THREE.BufferGeometry(), sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3), sBase = new Float32Array(SN * 3), sVel = new Float32Array(SN * 3), sLife = new Float32Array(SN), sMax = new Float32Array(SN);
for (let i = 0; i < SN; i++) sPos[i * 3 + 1] = -50;
sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
sparks.frustumCulled = false; scene.add(sparks);
let sI = 0;
function stardust(x, y, z, n, up = 2.5, spread = 2) {
  for (let k = 0; k < n; k++) {
    const i = sI++ % SN;
    sPos[i * 3] = x + rand(-0.3, 0.3); sPos[i * 3 + 1] = y + rand(-0.3, 0.3); sPos[i * 3 + 2] = z + rand(-0.3, 0.3);
    sVel[i * 3] = rand(-spread, spread); sVel[i * 3 + 1] = rand(0.5, up); sVel[i * 3 + 2] = rand(-spread, spread);
    const c = Math.random() < 0.65 ? [0.3, 0.85, 1] : [1, 0.72, 0.3];
    sBase[i * 3] = c[0]; sBase[i * 3 + 1] = c[1]; sBase[i * 3 + 2] = c[2];
    sLife[i] = sMax[i] = rand(0.6, 1.4);
  }
}
let streakT = 3;
function updateCosmic(dt, focus) {
  for (let i = 0; i < DN; i++) {
    let x = dPos[i * 3], y = dPos[i * 3 + 1], z = dPos[i * 3 + 2];
    y += dt * 0.25; x += Math.sin(G.t * 0.5 + dSeed[i]) * dt * 0.3;
    if (y > 9) y = 0.3;
    if (x - focus.x > 22) x -= 44; else if (x - focus.x < -22) x += 44;
    if (z - focus.z > 20) z -= 50; else if (z - focus.z < -30) z += 50;
    dPos[i * 3] = x; dPos[i * 3 + 1] = y; dPos[i * 3 + 2] = z;
  }
  dGeo.attributes.position.needsUpdate = true;
  for (let i = 0; i < SN; i++) {
    if (sLife[i] <= 0) continue;
    sLife[i] -= dt;
    sVel[i * 3] *= 0.97; sVel[i * 3 + 2] *= 0.97; sVel[i * 3 + 1] = sVel[i * 3 + 1] * 0.98 + dt * 0.4;
    sPos[i * 3] += sVel[i * 3] * dt; sPos[i * 3 + 1] += sVel[i * 3 + 1] * dt; sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
    const k = Math.max(0, sLife[i] / sMax[i]) * (0.7 + 0.3 * Math.sin(G.t * 20 + i));
    sCol[i * 3] = sBase[i * 3] * k; sCol[i * 3 + 1] = sBase[i * 3 + 1] * k; sCol[i * 3 + 2] = sBase[i * 3 + 2] * k;
    if (sLife[i] <= 0) sPos[i * 3 + 1] = -50;
  }
  sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
  for (const h of hovers) { h.t += dt; h.inner.position.y = 0.55 + Math.sin(h.t * 1.6) * 0.08; h.inner.rotation.z = Math.sin(h.t * 0.9) * 0.03; h.under.material.opacity = 0.42 + Math.sin(h.t * 1.6) * 0.08; }
  for (const c of skyCars) {
    c.z += c.dir * -c.speed * dt;
    if (c.dir > 0 && c.z < focus.z - 70) c.z = focus.z + 40; if (c.dir < 0 && c.z > focus.z + 40) c.z = focus.z - 70;
    c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.dir > 0 ? Math.PI : 0;
  }
  for (const c of crystals) {
    c.t += dt; c.glow.material.opacity = 0.26 + Math.sin(c.t * 2.2) * 0.08;
    if (Math.random() < dt * 6 && Math.abs(c.z - focus.z) < 40) stardust(c.x + rand(-1, 1), 0.5, c.z + rand(-1, 1), 1, 1.6, 0.4);
  }
  for (const hs of holoSigns) {
    hs.t += dt;
    let o = 0.92 + Math.sin(hs.t * 3) * 0.05;
    if (hs.glitch && Math.sin(hs.t * 0.7) > 0.93) o = Math.random() < 0.5 ? 0.15 : 1;
    hs.sign.material.opacity = o; hs.sg.material.opacity = 0.3 * o;
  }
  streakT -= dt; if (streakT <= 0) { streakT = rand(3, 7); spawnStreak(focus); }
  for (let i = streaks.length - 1; i >= 0; i--) {
    const s = streaks[i]; s.t += dt;
    s.m.position.x += s.vx * dt; s.m.position.z += s.vz * dt;
    s.m.material.opacity = Math.min(1, s.t * 4) * Math.max(0, 1 - s.t);
    if (s.t > 1) { scene.remove(s.m); s.m.material.dispose(); streaks.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- dynamic light pool
const POOL = 9;
const pool = [];
for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(l); pool.push(l); }
function updateLights(focus, t) {
  const sorted = lightSpots.map(s => [s, (s.pos.x - focus.x) ** 2 + (s.pos.z - focus.z) ** 2]).sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < POOL; i++) {
    const l = pool[i], e = sorted[i];
    if (!e) { l.intensity = 0; continue; }
    const s = e[0];
    l.position.copy(s.pos); l.color.copy(s.color); l.distance = s.dist;
    let k = s.intensity;
    if (s.flicker) k *= 0.75 + Math.sin(t * 13 + s.pos.x) * 0.12 + Math.sin(t * 31 + s.pos.z) * 0.1;
    if (s.off) k = 0;
    l.intensity = k;
  }
}

// ---------------------------------------------------------------- characters
const HG = {
  leg: new THREE.BoxGeometry(0.18, 0.82, 0.2).translate(0, -0.41, 0),
  torso: new THREE.BoxGeometry(0.5, 0.68, 0.28).translate(0, 0.34, 0),
  arm: new THREE.BoxGeometry(0.13, 0.64, 0.14).translate(0, -0.32, 0),
  head: new THREE.BoxGeometry(0.26, 0.3, 0.27).translate(0, 0.15, 0),
};
function makeHumanoid({ skin, shirt, pants, scale = 1 }) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mSkin = mat(skin), mShirt = mat(shirt), mPants = mat(pants);
  const hips = new THREE.Group(); hips.position.y = 0.84; body.add(hips);
  const legL = new THREE.Mesh(HG.leg, mPants), legR = new THREE.Mesh(HG.leg, mPants);
  legL.position.x = -0.13; legR.position.x = 0.13; hips.add(legL, legR);
  const torso = new THREE.Group(); hips.add(torso);
  torso.add(new THREE.Mesh(HG.torso, mShirt));
  const armL = new THREE.Mesh(HG.arm, mShirt), armR = new THREE.Mesh(HG.arm, mShirt);
  armL.position.set(-0.33, 0.62, 0); armR.position.set(0.33, 0.62, 0); torso.add(armL, armR);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mSkin);
  hand.position.y = -0.66; armL.add(hand); const hand2 = hand.clone(); armR.add(hand2);
  const head = new THREE.Mesh(HG.head, mSkin); head.position.y = 0.7; torso.add(head);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.scale.setScalar(scale);
  return { root, body, hips, torso, legL, legR, armL, armR, head, mats: [mSkin, mShirt, mPants] };
}
function disposeHumanoid(h) { scene.remove(h.root); h.mats.forEach(m => m.dispose()); }

// player
const P = {};
const pm = makeHumanoid({ skin: 0xc89f7d, shirt: 0x1b1d2a, pants: 0x121318 });
const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.55), mat(0x15161a, { metalness: 0.7, roughness: 0.4 }));
gun.position.set(0.1, 0.6, 0.62); pm.torso.add(gun);
const gunStrip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.4), new THREE.MeshBasicMaterial({ color: 0x3fd0ff })); gunStrip.position.set(0.1, 0.68, 0.6); pm.torso.add(gunStrip);
const hair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.31), mat(0x14151c)); hair.position.y = 0.3; pm.head.add(hair);
const streakHair = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.32), mat(0x1aa6a6, { emissive: 0x0a4a4a })); streakHair.position.set(0.09, 0.31, 0); pm.head.add(streakHair);
const emblem = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.38), new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true }));
emblem.position.set(0, 0.42, -0.146); emblem.rotation.y = Math.PI; pm.torso.add(emblem);
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff9a2a, emissiveIntensity: 0.8, metalness: 0.8, roughness: 0.3 });
for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.2), goldMat); sh.position.set(sx * 0.33, 0.69, 0); pm.torso.add(sh); }
const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0x5fe8ff, fog: false }));
marker.scale.y = 1.5; marker.position.y = 2.5; pm.root.add(marker);
scene.add(pm.root);
const flashlight = new THREE.SpotLight(0xe8f6ff, 160, 24, 0.5, 0.55, 1.6);
flashlight.position.set(0, 1.5, 0.2); pm.root.add(flashlight);
flashlight.target.position.set(0, 0, 9); pm.root.add(flashlight.target);
const muzzleLight = new THREE.PointLight(0x7fe0ff, 0, 9, 2); scene.add(muzzleLight);
const muzzleFlash = addGlow(0x9ff4ff, 1.4, 0, -10, 0, 1);

// ---------------------------------------------------------------- zombies
const ZSKIN = [0x7d8a6a, 0x8c8f7a, 0x6f7d6b, 0x9a8f80, 0x7a7f86], ZSHIRT = [0x3b4a5a, 0x5a3b3b, 0x4a4a3a, 0x2f3a2f, 0x6b5a4a, 0x8a8a8a, 0x6a2f3a], ZPANTS = [0x2a2f3a, 0x3a3328, 0x1f2328, 0x3a3a40];
const zombies = [], corpses = [];
function spawnZombie(x, z, type = 'walker', chase = true) {
  const brute = type === 'brute', runner = type === 'runner';
  const h = makeHumanoid({ skin: pick(ZSKIN), shirt: runner ? 0x7a1a20 : pick(ZSHIRT), pants: pick(ZPANTS), scale: brute ? 1.35 : rand(0.92, 1.05) });
  h.root.position.set(x, 0, z); scene.add(h.root);
  addHollowDetails(h, type);
  const zb = {
    h, x, z, type, r: brute ? 0.55 : 0.38,
    hp: brute ? 420 : runner ? 70 : 100,
    speed: brute ? 1.35 : runner ? rand(3.6, 4.2) : rand(1.1, 2.0),
    dmg: brute ? 28 : runner ? 8 : 12, atkRate: brute ? 1.3 : 0.9,
    state: chase ? 'chase' : 'idle', aggro: rand(12, 17),
    ph: rand(0, TAU), atkT: 0.5, flash: 0, wanderA: rand(0, TAU), wanderT: 0,
    stuckT: 0, side: 1, sideT: 0, attacking: false, groanT: rand(2, 8), face: rand(0, TAU),
  };
  zombies.push(zb); return zb;
}
const eyeGeo = new THREE.BoxGeometry(0.06, 0.035, 0.02), crackGeo = new THREE.BoxGeometry(0.04, 0.3, 0.02);
const hollowGlow = new THREE.MeshBasicMaterial({ color: 0x5fe8ff }), streakGlow = new THREE.MeshBasicMaterial({ color: 0xff5ad0 });
function addHollowDetails(h, type) {
  const m = type === 'runner' ? streakGlow : hollowGlow;
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(eyeGeo, m); e.position.set(sx * 0.065, 0.17, 0.14); h.head.add(e); }
  const torso = h.torso.children[0];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(crackGeo, m); const back = Math.random() < 0.5;
    c.position.set(rand(-0.18, 0.18), rand(0.2, 0.5), back ? -0.145 : 0.145); c.rotation.z = rand(-0.8, 0.8); c.scale.y = rand(0.5, 1.2); torso.add(c);
  }
  if (type === 'brute') {
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), crystalMat); c.scale.y = rand(2, 3.5);
      c.position.set(rand(-0.2, 0.2), rand(0.35, 0.75), -0.2); c.rotation.x = -0.6; h.torso.add(c);
    }
  }
}
function alive() { return zombies.length; }
function removeZombie(zb) { const i = zombies.indexOf(zb); if (i >= 0) zombies.splice(i, 1); }

// ---------------------------------------------------------------- pickups
const pickups = [];
const gearMat = mat(0x9fb6c8, { metalness: 0.8, roughness: 0.3, emissive: 0x2aa8ff, emissiveIntensity: 0.7 });
function gearMesh() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 20), gearMat));
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, t = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.14), gearMat); t.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0); t.rotation.z = a; g.add(t); }
  return g;
}
const beamGeo = new THREE.CylinderGeometry(0.45, 0.45, 9, 16, 1, true);
function addPickup(type, x, z, extra = {}) {
  let mesh, glowCol;
  const g = new THREE.Group();
  if (type === 'gear') { mesh = gearMesh(); glowCol = 0x3fd0ff; }
  else if (type === 'weapon') {
    mesh = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.6), mat(0x3a4a2a, { emissive: 0x223311 }));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 0.62), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    mesh.add(crate, strip); glowCol = 0xffd23f;
  } else if (type === 'ammo') { mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.3), mat(0x9a8a2a, { emissive: 0x443a00 })); glowCol = 0xffd23f; }
  else if (type === 'nade') { mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat(0x1a0d2a, { emissive: 0xb36bff, emissiveIntensity: 1.2 })); const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 20), new THREE.MeshBasicMaterial({ color: 0xc46bff })); r.rotation.x = 1.2; mesh.add(r); glowCol = 0xb36bff; }
  else { mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.32), mat(0xeeeeee, { emissive: 0x330000 })); const c = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xff2020 })); mesh.add(c); glowCol = 0xff4040; }
  mesh.position.y = type === 'weapon' ? 0.35 : 0.9; g.add(mesh);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), poolMat(glowCol)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.scale.setScalar(type === 'gear' ? 3.5 : 1.8); ring.material.opacity = 0.5; g.add(ring);
  let beam = null;
  if (type === 'gear' || type === 'weapon') {
    beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: glowCol, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 4.5; g.add(beam);
  }
  g.position.set(x, 0, z); scene.add(g);
  const p = { type, x, z, g, mesh, taken: false, ...extra };
  if (type === 'gear') { p.spot = { pos: new THREE.Vector3(x, 2, z), color: new THREE.Color(glowCol), intensity: 35, dist: 9 }; lightSpots.push(p.spot); }
  pickups.push(p); return p;
}
function setTaken(p, v) { p.taken = v; p.g.visible = !v; if (p.spot) p.spot.off = v; }

// evac
const evac = { van: null, ring: null, flare: null, spot: null };
function buildEvac() {
  evac.van = makeCar(EVAC.x + 2.5, EVAC.z - 3, Math.PI / 2, { van: true, color: 0x2c3a2c });
  evac.ring = addPool(0x3dff8a, 8, EVAC.x, EVAC.z, 0.0);
  evac.flare = addGlow(0x3dff8a, 2.5, EVAC.x - 1.5, 0.4, EVAC.z + 1, 0);
  evac.spot = { pos: new THREE.Vector3(EVAC.x, 2, EVAC.z), color: new THREE.Color(0x3dff8a), intensity: 80, dist: 16, off: true, flicker: true };
  lightSpots.push(evac.spot);
}

// ---------------------------------------------------------------- effects
const decals = [];
const decalGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const decalMats = bloodTexs.map(t => new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.25, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 }));
let decalN = 0;
function addDecal(x, z, size) {
  let d;
  if (decals.length < 260) { d = new THREE.Mesh(decalGeo, pick(decalMats)); d.receiveShadow = true; scene.add(d); decals.push(d); }
  else d = decals[decalN % decals.length];
  decalN++;
  d.position.set(x, 0.07 + (decalN % 40) * 0.0004, z); d.rotation.y = rand(0, TAU); d.scale.set(size * rand(0.8, 1.2), 1, size * rand(0.8, 1.2));
}
// particles
const PN = 500;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true }));
parts.frustumCulled = false; scene.add(parts);
let pI = 0;
for (let i = 0; i < PN; i++) pPos[i * 3 + 1] = -50;
function burst(x, y, z, dx, dz, n, col, spd = 4) {
  for (let k = 0; k < n; k++) {
    const i = pI++ % PN;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 3] = dx * spd * rand(0.3, 1.2) + rand(-1.5, 1.5); pVel[i * 3 + 1] = rand(0.5, 3.5); pVel[i * 3 + 2] = dz * spd * rand(0.3, 1.2) + rand(-1.5, 1.5);
    pCol[i * 3] = col[0] * rand(0.7, 1); pCol[i * 3 + 1] = col[1]; pCol[i * 3 + 2] = col[2];
    pLife[i] = rand(0.3, 0.7);
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PN; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    pVel[i * 3 + 1] -= 14 * dt;
    pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    if (pPos[i * 3 + 1] < 0.08) { pPos[i * 3 + 1] = 0.08; pVel[i * 3] *= 0.3; pVel[i * 3 + 2] *= 0.3; pVel[i * 3 + 1] = 0; }
    if (pLife[i] <= 0) pPos[i * 3 + 1] = -50;
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
}
// tracers
const tracers = [];
for (let i = 0; i < 24; i++) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x9ff4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  l.frustumCulled = false; scene.add(l); tracers.push({ l, t: 0 });
}
let trI = 0;
function tracer(x0, z0, x1, z1, col = 0x9ff4ff, life = 0.06) {
  const tr = tracers[trI++ % tracers.length];
  const a = tr.l.geometry.attributes.position;
  a.setXYZ(0, x0, 1.3, z0); a.setXYZ(1, x1, 1.2, z1); a.needsUpdate = true;
  tr.t = life; tr.max = life; tr.l.material.opacity = 0.9; tr.l.material.color.setHex(col);
}
const beams = [];
const beamMat = new THREE.MeshBasicMaterial({ color: 0xe8ffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
function railBeam(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, len), beamMat.clone());
  const halo = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, len), beamMat.clone()); halo.material.color.setHex(0x3fd0ff); halo.material.opacity = 0.35;
  g.add(core, halo); g.position.set((x0 + x1) / 2, 1.25, (z0 + z1) / 2); g.rotation.y = Math.atan2(x1 - x0, z1 - z0);
  scene.add(g); beams.push({ g, t: 0.3 });
  for (let k = 0; k < len; k += 1.5) stardust(x0 + (x1 - x0) * k / len, 1.25, z0 + (z1 - z0) * k / len, 1, 1, 0.6);
}
function updateBeams(dt) {
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i]; b.t -= dt;
    const k = Math.max(0, b.t / 0.3);
    b.g.children[0].material.opacity = k; b.g.children[1].material.opacity = k * 0.35; b.g.scale.x = b.g.scale.y = 0.4 + k * 0.6;
    if (b.t <= 0) { scene.remove(b.g); b.g.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); beams.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- audio (synthesised)
const Sfx = {
  ctx: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.out = this.ctx.createGain(); this.out.gain.value = 0.55; this.out.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 1.5; this.nb = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      // ambient wind + drone
      const src = this.ctx.createBufferSource(); src.buffer = this.nb; src.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.6;
      const g = this.ctx.createGain(); g.gain.value = 0.05; src.connect(bp).connect(g).connect(this.out); src.start();
      const o = this.ctx.createOscillator(); o.frequency.value = 49; const og = this.ctx.createGain(); og.gain.value = 0.035; o.connect(og).connect(this.out); o.start();
    } catch (e) { this.ctx = null; }
  },
  noise(dur, freq, vol, type = 'lowpass', q = 0.8) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.nb; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone(f0, f1, dur, vol, type = 'sine') {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  shot(w) {
    if (w === 'shotgun') { this.noise(0.4, 1400, 0.7); this.tone(420, 60, 0.3, 0.35, 'sawtooth'); this.tone(90, 40, 0.25, 0.4, 'sine'); }
    else if (w === 'smg') { this.noise(0.07, 3200, 0.35); this.tone(1200, 300, 0.06, 0.18, 'square'); }
    else if (w === 'rail') { this.tone(200, 2400, 0.12, 0.25, 'sawtooth'); this.noise(0.5, 4000, 0.5, 'highpass'); this.tone(80, 30, 0.6, 0.6, 'sine'); }
    else { this.noise(0.14, 2200, 0.45); this.tone(900, 180, 0.1, 0.3, 'square'); }
  },
  nadeThrow() { this.tone(300, 700, 0.2, 0.12, 'triangle'); },
  hum() { this.tone(60, 40, 1.5, 0.35, 'sawtooth'); this.tone(120, 30, 1.5, 0.2, 'sine'); },
  groan(vol = 0.12) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, dur = rand(0.7, 1.3);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(70, 110), t); o.frequency.linearRampToValueAtTime(rand(50, 80), t + dur);
    const lfo = c.createOscillator(); lfo.frequency.value = rand(5, 9); const lg = c.createGain(); lg.gain.value = 8; lfo.connect(lg).connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(vol, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f).connect(g).connect(this.out); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  },
  hit() { this.noise(0.08, 500, 0.35, 'lowpass'); },
  hurt() { this.tone(220, 90, 0.2, 0.3, 'sawtooth'); this.noise(0.15, 300, 0.4); },
  pickup() { this.tone(660, 990, 0.12, 0.2, 'square'); setTimeout(() => this.tone(990, 1480, 0.15, 0.18, 'square'), 90); },
  click() { this.tone(1200, 800, 0.04, 0.12, 'square'); },
  reload() { this.tone(400, 300, 0.05, 0.15, 'square'); setTimeout(() => this.tone(500, 700, 0.05, 0.15, 'square'), 250); },
  level() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.18, 0.18, 'triangle'), i * 90)); },
  boom(big) { this.noise(big ? 0.9 : 0.6, 380, big ? 1 : 0.7); this.tone(big ? 90 : 120, 30, 0.5, 0.5, 'sine'); },
  zap() { this.tone(1800, 600, 0.08, 0.1, 'square'); },
  mote() { if (this.moteT > (this.ctx?.currentTime ?? 0)) return; this.moteT = (this.ctx?.currentTime ?? 0) + 0.04; this.tone(rand(1500, 2100), 2400, 0.05, 0.04, 'sine'); },
  ready() { this.tone(440, 880, 0.3, 0.2, 'triangle'); setTimeout(() => this.tone(660, 1320, 0.35, 0.18, 'triangle'), 120); },
  dash() { this.noise(0.22, 2400, 0.35, 'bandpass', 1.5); this.tone(900, 2400, 0.14, 0.12, 'sine'); },
  roar() {
    if (!this.ctx) return;
    this.tone(160, 38, 1.4, 0.8, 'sawtooth'); this.tone(80, 30, 1.6, 0.7, 'sine'); this.noise(1.2, 600, 0.9);
    [261.6, 329.6, 392, 523.2].forEach((f, i) => setTimeout(() => this.tone(f, f, 1.2, 0.12, 'sawtooth'), 120 + i * 30));
  },
  card() { this.tone(880, 1320, 0.12, 0.15, 'triangle'); setTimeout(() => this.tone(1320, 1760, 0.2, 0.12, 'triangle'), 80); },
  constellation() { [659, 880, 1046, 1318, 1760].forEach((f, i) => setTimeout(() => this.tone(f, f * 1.01, 0.4, 0.12, 'sine'), i * 120)); },
};

// ---------------------------------------------------------------- input
const keys = {};
const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
const touch = { on: false, move: null, aim: null };
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (G.state === 'play') {
    if (e.code === 'KeyR') startReload();
    if (e.code === 'Digit1') switchTo('pistol'); if (e.code === 'Digit2') switchTo('smg'); if (e.code === 'Digit3') switchTo('shotgun'); if (e.code === 'Digit4') switchTo('rail');
    if (e.code === 'KeyG') throwNade();
    if (e.code === 'KeyQ') cycleWeapon(1);
    if (e.code === 'Space') { e.preventDefault(); starDash(); }
    if (e.code === 'KeyF') lionRoar();
  }
  if (G.state === 'cards') {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (i !== undefined) chooseCard(i);
    if (e.code === 'KeyR') rerollCards();
  }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; if (G.state === 'play') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pause(); });
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; Sfx.init(); });
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('wheel', e => { if (G.state === 'play') cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
canvas.addEventListener('contextmenu', e => e.preventDefault());
const stickL = $('stickL'), stickR = $('stickR');
function setStick(el, s) {
  if (!s) { el.classList.remove('on'); return; }
  el.classList.add('on'); el.style.left = s.sx + 'px'; el.style.top = s.sy + 'px';
  const dx = clamp(s.x - s.sx, -50, 50), dy = clamp(s.y - s.sy, -50, 50);
  el.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
}
canvas.addEventListener('touchstart', e => {
  e.preventDefault(); Sfx.init();
  if (!touch.on) { touch.on = true; document.body.classList.add('touch'); $('sticks').classList.remove('hidden'); }
  for (const t of e.changedTouches) {
    const s = { id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY };
    if (t.clientX < innerWidth / 2 && !touch.move) touch.move = s; else if (!touch.aim) touch.aim = s;
  }
  setStick(stickL, touch.move); setStick(stickR, touch.aim);
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) for (const s of [touch.move, touch.aim]) if (s && s.id === t.identifier) { s.x = t.clientX; s.y = t.clientY; }
  setStick(stickL, touch.move); setStick(stickR, touch.aim);
}, { passive: false });
const endTouch = e => {
  for (const t of e.changedTouches) {
    if (touch.move && touch.move.id === t.identifier) touch.move = null;
    if (touch.aim && touch.aim.id === t.identifier) touch.aim = null;
  }
  setStick(stickL, touch.move); setStick(stickR, touch.aim);
};
canvas.addEventListener('touchend', endTouch); canvas.addEventListener('touchcancel', endTouch);
$('weapon').addEventListener('click', () => { if (G.state === 'play') cycleWeapon(1); });
$('pauseBtn').addEventListener('click', () => { if (G.state === 'play') pause(); });
for (const [id, fn] of [['abDash', () => starDash()], ['abRoar', () => lionRoar()], ['abNade', () => throwNade()]]) {
  $(id).addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  $(id).addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
}
const cross = $('cross');

// ---------------------------------------------------------------- game state
const G = { state: 'title', time: MISSION_TIME, gears: 0, kills: 0, spawnT: 4, shake: 0, hurt: 0, cp: null, t: 0, popupT: 0, deadT: 0,
  pendingCards: 0, slowT: 0, rerolls: 1, novaKills: 0, blasts: [], shockCd: 0, hand: [], roar: 0, roarSlow: 0, flash: 0 };
const ROAR_NEED = 160;
function resetPlayer() {
  Object.assign(P, { x: 0, z: 2, hp: 100, maxHp: 100, stamina: 100, lvl: 1, xp: 0, aim: Math.PI, owned: ['pistol'], cur: 'pistol',
    ammo: { pistol: { mag: 12, reserve: Infinity }, smg: { mag: 0, reserve: 0 }, shotgun: { mag: 0, reserve: 0 }, rail: { mag: 0, reserve: 0 } },
    wkills: { pistol: 0, smg: 0, shotgun: 0, rail: 0 }, nades: 2, aimX: 0, aimZ: -10,
    fireT: 0, reloadT: 0, walk: 0, dead: false, perks: {}, bonus: [], secondUsed: false, invT: 0, dashT: 0, dashCharges: 1, dashCd: 0, dashDir: [0, -1] });
  pm.body.rotation.set(0, 0, 0); pm.body.position.y = 0;
}
const xpNeed = () => 120 + (P.lvl - 1) * 70;
// ---------------------------------------------------------------- star card stats
const pk = id => P.perks[id] || 0;
const hasBonus = line => P.bonus.includes(line);
const stat = {
  dmg: () => (1 + 0.15 * pk('hollow')) * (1 + 0.2 * (runeLvl(P.cur) - 1)),
  rate: w => w.rate / ((1 + 0.12 * pk('trigger')) * (1 + 0.15 * (runeLvl(P.cur) - 1))),
  reload: w => w.reload * Math.pow(0.75, pk('hands')),
  mag: w => Math.round(w.mag * (1 + 0.3 * pk('pockets'))),
  speed: () => 1 + 0.1 * pk('fleet'),
  pellets: (key, w) => w.pellets + (key === 'shotgun' ? 3 * pk('buckshot') + (runeLvl('shotgun') >= 3 ? 3 : 0) : 0),
  crit: () => 0.1 * pk('headhunt'),
  taken: () => (hasBonus('aegis') ? 0.8 : 1),
  pickR: () => 1.4,
  magnet: () => (hasBonus('polaris') ? 6.4 : 3.2),
  roarGain: () => (hasBonus('leo') ? 2 : 1),
  drop: () => Math.pow(1.5, pk('scavenger')),
};
function saveCheckpoint() {
  P.secondUsed = false;
  G.cp = structuredClone({ x: P.x, z: P.z, hp: Math.max(P.hp, P.maxHp * 0.6), maxHp: P.maxHp, lvl: P.lvl, xp: P.xp, owned: P.owned, cur: P.cur, ammo: P.ammo, gears: G.gears, time: G.time, kills: G.kills,
    perks: P.perks, bonus: P.bonus, rerolls: G.rerolls, novaKills: G.novaKills, roar: G.roar, wkills: P.wkills, nades: P.nades });
  G.cpTaken = pickups.map(p => p.taken);
}
function loadCheckpoint() {
  const c = structuredClone(G.cp);
  Object.assign(P, { x: c.x, z: c.z, hp: c.hp, maxHp: c.maxHp, lvl: c.lvl, xp: c.xp, owned: c.owned, cur: c.cur, ammo: c.ammo, stamina: 100, fireT: 0, reloadT: 0, dead: false,
    perks: c.perks, bonus: c.bonus, secondUsed: false, invT: 1, dashT: 0, dashCharges: maxDash(), dashCd: 0 });
  G.roar = c.roar || 0; P.wkills = c.wkills; P.nades = c.nades; clearNades();
  clearMotes();
  G.gears = c.gears; G.time = c.time; G.kills = c.kills; G.rerolls = c.rerolls; G.novaKills = c.novaKills; G.pendingCards = 0; G.slowT = 0;
  for (let i = pickups.length - 1; i >= 0; i--) {
    if (i >= G.cpTaken.length) { scene.remove(pickups[i].g); pickups.splice(i, 1); }
    else setTaken(pickups[i], G.cpTaken[i]);
  }
  while (zombies.length) { const z = zombies.pop(); disposeHumanoid(z.h); }
  pm.body.rotation.set(0, 0, 0); pm.body.position.y = 0;
  G.spawnT = 3; G.hurt = 0;
  updateEvac();
}

// ---------------------------------------------------------------- weapons
function switchTo(w) { if (!P.owned.includes(w) || P.cur === w) return; P.cur = w; P.reloadT = 0; P.fireT = 0.2; Sfx.click(); }
function cycleWeapon(d) { const i = P.owned.indexOf(P.cur); switchTo(P.owned[(i + d + P.owned.length) % P.owned.length]); }
function startReload() {
  const w = WEAPONS[P.cur], a = P.ammo[P.cur];
  if (P.reloadT > 0 || a.mag >= stat.mag(w) || a.reserve <= 0) return;
  P.reloadT = stat.reload(w); Sfx.reload();
}
function finishReload() {
  const w = WEAPONS[P.cur], a = P.ammo[P.cur];
  const n = Math.min(stat.mag(w) - a.mag, a.reserve); a.mag += n; a.reserve -= n;
}
function rayAABB(ox, oz, dx, dz, o) {
  let tmin = -Infinity, tmax = Infinity;
  if (Math.abs(dx) < 1e-9) { if (ox < o.x0 || ox > o.x1) return Infinity; } else { let a = (o.x0 - ox) / dx, b = (o.x1 - ox) / dx; if (a > b) [a, b] = [b, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
  if (Math.abs(dz) < 1e-9) { if (oz < o.z0 || oz > o.z1) return Infinity; } else { let a = (o.z0 - oz) / dz, b = (o.z1 - oz) / dz; if (a > b) [a, b] = [b, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
  if (tmax < tmin || tmin <= 0) return Infinity;
  return tmin;
}
function rayCircle(ox, oz, dx, dz, cx, cz, r) {
  const fx = ox - cx, fz = oz - cz, b = fx * dx + fz * dz, c = fx * fx + fz * fz - r * r, disc = b * b - c;
  if (disc < 0) return Infinity;
  const s = Math.sqrt(disc); let t = -b - s; if (t < 0) t = -b + s;
  return t >= 0 ? t : Infinity;
}
function shoot() {
  const w = WEAPONS[P.cur], a = P.ammo[P.cur];
  a.mag--; P.fireT = stat.rate(w);
  const sx = Math.sin(P.aim), sz = Math.cos(P.aim);
  const mx = P.x + sx * 0.9 + Math.cos(P.aim) * 0.1, mz = P.z + sz * 0.9 - Math.sin(P.aim) * 0.1;
  const rl = runeLvl(P.cur);
  const pellets = stat.pellets(P.cur, w), dm = stat.dmg(), maxHits = w.rail ? 99 : 1 + pk('pierce') + (P.cur === 'pistol' && rl >= 3 ? 1 : 0);
  for (let k = 0; k < pellets; k++) {
    const ang = P.aim + rand(-w.spread, w.spread), dx = Math.sin(ang), dz = Math.cos(ang);
    let wall = 42, wallHit = false;
    for (const o of obstacles) { const t = rayAABB(P.x, P.z, dx, dz, o); if (t < wall) { wall = t; wallHit = true; } }
    const hits = [];
    for (const zb of zombies) { if (zb.dead) continue; const t = rayCircle(P.x, P.z, dx, dz, zb.x, zb.z, zb.r + 0.05); if (t < wall) hits.push([t, zb]); }
    hits.sort((a, b) => a[0] - b[0]);
    const n = Math.min(hits.length, maxHits);
    const end = n === maxHits ? hits[n - 1][0] : wall;
    if (w.rail) railBeam(mx, mz, P.x + dx * end, P.z + dz * end);
    else tracer(mx, mz, P.x + dx * end, P.z + dz * end, w.col, P.cur === 'smg' ? 0.1 : 0.06);
    for (let i = 0; i < n; i++) {
      const [t, zb] = hits[i];
      let d = w.dmg * dm * (t > 18 && !w.rail ? 0.7 : 1) * (i && !w.rail ? 0.8 : 1);
      zb.lastHit = P.cur;
      const crit = Math.random() < stat.crit();
      if (crit) { d *= 3; stardust(zb.x, 1.6, zb.z, 8, 3, 1); popText('CRIT', zb.x, zb.z, '#ffb347'); }
      if (pk('incend') || (P.cur === 'smg' && rl >= 3)) zb.burn = 3;
      if (P.cur === 'rail' && rl >= 3) zb.railMark = true;
      damageZombie(zb, d, dx, dz, w.knock);
    }
    if (n < maxHits && wallHit) burst(P.x + dx * wall, 1.1, P.z + dz * wall, -dx, -dz, 4, [1, 0.8, 0.4], 2);
  }
  muzzleLight.position.set(mx, 1.4, mz); muzzleLight.intensity = 60;
  muzzleFlash.position.set(mx, 1.3, mz); muzzleFlash.material.opacity = 1; muzzleFlash.scale.setScalar(P.cur === 'shotgun' || w.rail ? 2.2 : 1.4);
  muzzleFlash.material.color.setHex(w.col); muzzleLight.color.setHex(w.col);
  G.shake = Math.max(G.shake, w.shake);
  Sfx.shot(P.cur);
  for (const zb of zombies) if (zb.state === 'idle' && Math.hypot(zb.x - P.x, zb.z - P.z) < 26) zb.state = 'chase';
  if (a.mag === 0) startReload();
}
function damageZombie(zb, dmg, dx, dz, knock, quiet = false) {
  if (zb.dead) return;
  if (quiet) { zb.hp -= dmg; if (zb.hp <= 0) killZombie(zb, dx || rand(-1, 1), dz || rand(-1, 1)); return; }
  zb.hp -= dmg; zb.flash = 0.08; zb.state = 'chase';
  zb.x += dx * knock * (zb.type === 'brute' ? 0.3 : 1); zb.z += dz * knock * (zb.type === 'brute' ? 0.3 : 1);
  burst(zb.x, 1.25, zb.z, dx, dz, 6, [0.45, 0.02, 0.16]);
  stardust(zb.x, 1.2, zb.z, 2, 1.5, 1.2);
  if (Math.random() < 0.35) addDecal(zb.x + dx * rand(0.4, 1.5), zb.z + dz * rand(0.4, 1.5), rand(0.5, 1.0));
  Sfx.hit();
  if (zb.hp <= 0) killZombie(zb, dx, dz);
}
function killZombie(zb, dx, dz) {
  removeZombie(zb);
  zb.dead = true; zb.deadT = 0;
  zb.h.root.rotation.y = Math.atan2(-dx, -dz);
  zb.h.root.position.x += dx * 0.4; zb.h.root.position.z += dz * 0.4;
  zb.h.mats.forEach(m => m.emissive.setHex(0));
  corpses.push(zb);
  if (corpses.length > 45) disposeHumanoid(corpses.shift().h);
  setTimeout(() => addDecal(zb.h.root.position.x + dx * 0.6, zb.h.root.position.z + dz * 0.6, rand(1.8, 2.6)), 350);
  burst(zb.x, 1.0, zb.z, dx, dz, 10, [0.4, 0.02, 0.16], 5);
  stardust(zb.x, 1.0, zb.z, zb.type === 'brute' ? 40 : 16);
  G.kills++;
  const wk = zb.lastHit;
  if (wk && P.wkills[wk] !== undefined) {
    const before = runeLvl(wk); P.wkills[wk]++;
    const after = runeLvl(wk);
    if (after > before) { popup(`${WEAPONS[wk].name} · RUNE ${'I'.repeat(after)}`, '#ffb347'); Sfx.ready(); stardust(P.x, 1.4, P.z, 30, 3, 2); if (after === 3) setTimeout(() => popup(WEAPONS[wk].rune3.toUpperCase(), '#ffb347'), 1200); }
  }
  if (zb.railMark) G.blasts.push({ x: zb.x, z: zb.z, r: 2.2, dmg: 50, col: 0x3fd0ff, t: 0.05 });
  if (Math.random() < (zb.type === 'brute' ? 0.5 : 0.03)) addPickup('nade', zb.x + rand(-0.5, 0.5), zb.z + rand(-0.5, 0.5));
  if (pk('vampire')) P.hp = Math.min(P.maxHp, P.hp + 2 * pk('vampire'));
  if (pk('adrenal')) P.stamina = Math.min(100, P.stamina + 10 * pk('adrenal'));
  if (pk('volatile') && Math.random() < 0.15 * pk('volatile')) G.blasts.push({ x: zb.x, z: zb.z, r: 3.2, dmg: 70, col: 0xff5ad0, t: 0.12 });
  if (hasBonus('nova') && ++G.novaKills % 10 === 0) G.blasts.push({ x: zb.x, z: zb.z, r: 4.5, dmg: 110, col: 0xffb347, t: 0.12, big: true });
  dropMotes(zb.x, zb.z, zb.type === 'brute' ? 12 : zb.type === 'runner' ? 6 : 5, zb.type === 'brute' ? 5 : 3, 2);
  const r = Math.random(), dm = stat.drop();
  if (P.owned.length > 1 && r < 0.14 * dm) addPickup('ammo', zb.x, zb.z);
  else if (r > 1 - 0.05 * dm || (zb.type === 'brute' && r > 0.5)) addPickup('med', zb.x, zb.z);
}
function gainXp(n) {
  P.xp += n;
  while (P.xp >= xpNeed()) {
    P.xp -= xpNeed(); P.lvl++; P.hp = P.maxHp;
    G.pendingCards++; G.slowT = Math.max(G.slowT, 0.55);
    popup(`LEVEL UP · LV.${P.lvl}`, '#ffb347'); Sfx.level(); stardust(P.x, 1.2, P.z, 40, 4, 2.5);
  }
}
function hurtPlayer(dmg) {
  if (P.dead || P.invT > 0) return;
  P.hp -= dmg * stat.taken(); G.hurt = 1; G.shake = Math.max(G.shake, 0.35); Sfx.hurt();
  burst(P.x, 1.2, P.z, rand(-1, 1), rand(-1, 1), 6, [0.6, 0.02, 0.03]);
  if (Math.random() < 0.5) addDecal(P.x + rand(-0.5, 0.5), P.z + rand(-0.5, 0.5), rand(0.4, 0.8));
  if (pk('shock') && G.shockCd <= 0) { G.shockCd = 8; shockwave(4.5, 25); }
  if (P.hp <= 0 && pk('second') && !P.secondUsed) {
    P.secondUsed = true; P.hp = Math.round(P.maxHp * 0.3); P.invT = 1.5; shockwave(5, 40);
    popup('SECOND WIND', '#38ffc8'); Sfx.level(); return;
  }
  if (P.hp <= 0) { P.hp = 0; die('YOU DIED', 'The avenue claimed another one.'); }
}
// ---------------------------------------------------------------- stardust XP motes (magnet)
const MN = 400;
const mGeo = new THREE.BufferGeometry(), mPos = new Float32Array(MN * 3), mCol = new Float32Array(MN * 3);
for (let i = 0; i < MN; i++) mPos[i * 3 + 1] = -50;
mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3)); mGeo.setAttribute('color', new THREE.BufferAttribute(mCol, 3));
const moteTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
const moteMesh = new THREE.Points(mGeo, new THREE.PointsMaterial({ size: 0.42, map: moteTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
moteMesh.frustumCulled = false; scene.add(moteMesh);
const motes = [];
function dropMotes(x, z, n, val, spread) {
  for (let i = 0; i < n; i++) {
    if (motes.length >= MN) { gainMote(motes.shift().val); }
    const a = rand(0, TAU), sp = rand(1.5, 4) * spread / 2;
    const gold = Math.random() < 0.35;
    motes.push({ x, y: 1, z, vx: Math.cos(a) * sp, vy: rand(3, 6), vz: Math.sin(a) * sp, val, life: 28, pull: false, ph: rand(0, TAU), c: gold ? [1, 0.72, 0.3] : [0.35, 0.88, 1] });
  }
}
function gainMote(val) {
  gainXp(val);
  if (G.roar < ROAR_NEED) { G.roar = Math.min(ROAR_NEED, G.roar + val * stat.roarGain()); if (G.roar >= ROAR_NEED) { popup('LION ROAR READY · F', '#ffb347'); Sfx.ready(); } }
}
function clearMotes() { motes.length = 0; }
function updateMotes(dt) {
  const mr = stat.magnet();
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.life -= dt;
    const dx = P.x - m.x, dz = P.z - m.z, d = Math.hypot(dx, dz);
    if (!m.pull && d < mr && !P.dead) m.pull = true;
    if (m.pull) {
      const sp = 9 + (mr - Math.min(d, mr)) * 4;
      m.vx = lerp(m.vx, dx / (d || 1) * sp, Math.min(1, dt * 8)); m.vz = lerp(m.vz, dz / (d || 1) * sp, Math.min(1, dt * 8));
      m.vy = lerp(m.vy, (1.1 - m.y) * 6, Math.min(1, dt * 8));
      if (d < 0.55) { gainMote(m.val); motes.splice(i, 1); Sfx.mote(); continue; }
    } else {
      m.vy -= 14 * dt; m.vx *= Math.pow(0.15, dt); m.vz *= Math.pow(0.15, dt);
      if (m.y < 0.45) { m.y = 0.45; m.vy = Math.abs(m.vy) * 0.3; }
    }
    m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
    if (m.life <= 0) motes.splice(i, 1);
  }
  for (let i = 0; i < MN; i++) {
    const m = motes[i];
    if (!m) { mPos[i * 3 + 1] = -50; continue; }
    const tw = 0.75 + 0.25 * Math.sin(G.t * 8 + m.ph), fade = Math.min(1, m.life / 3);
    mPos[i * 3] = m.x; mPos[i * 3 + 1] = m.y + (m.pull ? 0 : Math.sin(G.t * 3 + m.ph) * 0.08); mPos[i * 3 + 2] = m.z;
    mCol[i * 3] = m.c[0] * tw * fade; mCol[i * 3 + 1] = m.c[1] * tw * fade; mCol[i * 3 + 2] = m.c[2] * tw * fade;
  }
  mGeo.attributes.position.needsUpdate = true; mGeo.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------- Gravity Grenade
const nades = [];
const swirlTex = canvasTex(256, 256, (g) => {
  g.translate(128, 128);
  for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 90; i++) {
    const t = i / 90, a = arm * Math.PI / 2 + t * 5, r = t * 120;
    g.fillStyle = `rgba(${180 + t * 60},${90 + t * 60},255,${(1 - t) * 0.6})`;
    g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 6 * (1 - t) + 2, 0, TAU); g.fill();
  }
});
const nadeGeo = new THREE.SphereGeometry(0.18, 12, 8), nadeMat = mat(0x1a0d2a, { emissive: 0xb36bff, emissiveIntensity: 1.4 });
const coreMat = new THREE.MeshBasicMaterial({ color: 0x050008 });
function throwNade() {
  if (G.state !== 'play' || P.dead || P.nades <= 0) return;
  P.nades--; Sfx.nadeThrow();
  let tx = P.aimX, tz = P.aimZ;
  if (touch.on || Math.hypot(tx - P.x, tz - P.z) < 1) { tx = P.x + Math.sin(P.aim) * 9; tz = P.z + Math.cos(P.aim) * 9; }
  let dx = tx - P.x, dz = tz - P.z; const d = Math.hypot(dx, dz) || 1;
  if (d > 14) { tx = P.x + dx / d * 14; tz = P.z + dz / d * 14; }
  const T = 0.6, y0 = 1.4;
  const m = new THREE.Mesh(nadeGeo, nadeMat); m.position.set(P.x, y0, P.z); scene.add(m);
  nades.push({ m, x: P.x, y: y0, z: P.z, vx: (tx - P.x) / T, vz: (tz - P.z) / T, vy: (-y0 + 10 * T * T) / T, phase: 'fly', t: 0 });
}
function clearNades() { for (const n of nades) { scene.remove(n.m); if (n.fx) scene.remove(n.fx); } nades.length = 0; }
function updateNades(dt) {
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i];
    if (n.phase === 'fly') {
      n.vy -= 20 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;
      n.m.position.set(n.x, n.y, n.z); n.m.rotation.x += dt * 10;
      if (Math.random() < 0.5) stardust(n.x, n.y, n.z, 1, 0.3, 0.2);
      if (n.y <= 0.25) {
        n.phase = 'pull'; n.t = 1.6; n.y = 0.6; Sfx.hum();
        const fx = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: swirlTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        disc.scale.setScalar(12); disc.position.y = 0.12; fx.add(disc);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), coreMat); core.position.y = 0.9; fx.add(core);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xc46bff })); halo.position.y = 0.9; halo.rotation.x = Math.PI / 2; fx.add(halo);
        fx.position.set(n.x, 0, n.z); scene.add(fx); n.fx = fx; n.disc = disc; n.core = core; n.halo = halo;
        scene.remove(n.m);
        n.spot = { pos: new THREE.Vector3(n.x, 2, n.z), color: new THREE.Color(0xb36bff), intensity: 90, dist: 12, flicker: true };
        lightSpots.push(n.spot);
      }
    } else {
      n.t -= dt;
      const k = 1 - n.t / 1.6;
      n.disc.rotation.y -= dt * 4; n.disc.material.opacity = 0.5 + k * 0.5;
      n.core.scale.setScalar(0.6 + k * 0.9); n.halo.scale.setScalar(0.8 + Math.sin(G.t * 20) * 0.08 + k * 0.6); n.halo.rotation.z += dt * 6;
      for (let j = 0; j < 3; j++) { const a = rand(0, TAU), r = rand(3, 6.5); stardust(n.x + Math.cos(a) * r, rand(0.3, 1.5), n.z + Math.sin(a) * r, 1, 0.2, 0); }
      for (const zb of [...zombies]) {
        const dx = n.x - zb.x, dz = n.z - zb.z, d = Math.hypot(dx, dz);
        if (d < 6.5 && d > 0.3) {
          const sp = (zb.type === 'brute' ? 2 : 5) * (1.2 - d / 6.5) + 1;
          zb.x += dx / d * sp * dt; zb.z += dz / d * sp * dt; resolveCircle(zb, zb.r); zb.state = 'chase';
          damageZombie(zb, 28 * dt * stat.dmg(), 0, 0, 0, true);
        }
      }
      if (n.t <= 0) {
        scene.remove(n.fx); n.fx.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== coreMat) o.material.dispose(); });
        const si = lightSpots.indexOf(n.spot); if (si >= 0) lightSpots.splice(si, 1);
        novaBlast({ x: n.x, z: n.z, r: 4.2, dmg: 130, col: 0xb36bff, big: true });
        nades.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------- Star Dash
const DASH_CD = 3;
const maxDash = () => (hasBonus('comet') ? 2 : 1);
const ghosts = [];
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x5fe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
const ghostGeo = new THREE.CapsuleGeometry(0.3, 1.1, 4, 8);
let ghostT = 0;
function ghostFx() {
  ghostT -= 1; if (ghostT > 0) return; ghostT = 2;
  const m = new THREE.Mesh(ghostGeo, ghostMat.clone()); m.position.set(P.x, 0.9, P.z); scene.add(m); ghosts.push({ m, t: 0.3 });
}
function starDash() {
  if (G.state !== 'play' || P.dead || P.dashT > 0 || P.dashCharges <= 0) return;
  P.dashCharges--; if (P.dashCd <= 0) P.dashCd = DASH_CD;
  P.dashDir = P.lastMove || [Math.sin(P.aim), Math.cos(P.aim)];
  P.dashT = 0.16; P.invT = Math.max(P.invT, 0.3);
  ringFx(P.x, P.z, 1.6, 0x3fd0ff); Sfx.dash(); stardust(P.x, 1, P.z, 14, 2, 2);
}

// ---------------------------------------------------------------- Lion Roar
const lionTex = canvasTex(512, 512, (g, w, h) => {
  g.translate(256, 256);
  const col = 'rgba(255,190,90,1)';
  g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 28; i++) { // sun rays / mane
    const a = i / 28 * TAU, r0 = 120, r1 = i % 2 ? 200 : 245;
    g.beginPath(); g.moveTo(Math.cos(a - 0.07) * r0, Math.sin(a - 0.07) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a + 0.07) * r0, Math.sin(a + 0.07) * r0); g.fill();
  }
  g.lineWidth = 9; g.beginPath(); g.arc(0, 8, 112, 0, TAU); g.stroke();
  g.lineWidth = 8;
  g.beginPath(); g.moveTo(-70, -95); g.lineTo(-88, -128); g.lineTo(-45, -108); g.stroke(); // ears
  g.beginPath(); g.moveTo(70, -95); g.lineTo(88, -128); g.lineTo(45, -108); g.stroke();
  g.beginPath(); g.moveTo(-62, -22); g.lineTo(-22, -10); g.moveTo(62, -22); g.lineTo(22, -10); g.stroke(); // brows/eyes
  g.beginPath(); g.ellipse(-40, -6, 14, 6, 0.25, 0, TAU); g.ellipse(40, -6, 14, 6, -0.25, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-18, 10); g.lineTo(0, 50); g.lineTo(18, 10); g.stroke(); // nose bridge
  g.beginPath(); g.moveTo(-22, 52); g.lineTo(22, 52); g.lineTo(0, 66); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(0, 66); g.lineTo(0, 78); g.moveTo(-36, 92); g.quadraticCurveTo(0, 74, 36, 92); g.stroke(); // mouth
  g.lineWidth = 4; for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(sx * 30, 64 + k * 8); g.lineTo(sx * 74, 56 + k * 14); g.stroke(); }
});
const lionMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lionTex, color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
lionMesh.position.y = 0.4; scene.add(lionMesh);
const lionGlow = addGlow(0xffb347, 1, 0, -20, 0, 0);
const roarLight = new THREE.PointLight(0xffb347, 0, 30, 1.5); scene.add(roarLight);
let roarT = 1;
function lionRoar() {
  if (G.state !== 'play' || P.dead || G.roar < ROAR_NEED) return;
  G.roar = 0; G.roarSlow = 0.7; roarT = 0; G.flash = 1; P.invT = Math.max(P.invT, 1);
  lionMesh.position.x = P.x; lionMesh.position.z = P.z; lionGlow.position.set(P.x, 2, P.z);
  roarLight.position.set(P.x, 3, P.z); roarLight.intensity = 400;
  ringFx(P.x, P.z, 10, 0xffb347); setTimeout(() => ringFx(P.x, P.z, 7, 0xffe0a0), 90);
  stardust(P.x, 1, P.z, 140, 6, 8); G.shake = 0.8; Sfx.roar();
  for (const zb of [...zombies]) {
    const dx = zb.x - P.x, dz = zb.z - P.z, d = Math.hypot(dx, dz) || 1;
    if (d < 10) {
      const push = (10 - d) * 0.45;
      zb.x += dx / d * push; zb.z += dz / d * push; resolveCircle(zb, zb.r);
      zb.state = 'chase';
      damageZombie(zb, 160 * stat.dmg(), dx / d, dz / d, 0.5);
    }
  }
}
function updateRoarFx(dt) {
  if (roarT < 1) {
    roarT = Math.min(1, roarT + dt / 1.1);
    const e = 1 - Math.pow(1 - roarT, 3);
    lionMesh.scale.setScalar(3 + e * 15); lionMesh.material.opacity = roarT < 0.15 ? roarT / 0.15 : (1 - roarT) * 1.1;
    lionGlow.scale.setScalar(4 + e * 18); lionGlow.material.opacity = (1 - roarT) * 0.35;
  } else { lionMesh.material.opacity = 0; lionGlow.material.opacity = 0; }
  roarLight.intensity *= Math.pow(0.02, dt);
  G.flash = Math.max(0, G.flash - dt * 2.5); $('flash').style.opacity = G.flash * 0.55;
  for (let i = ghosts.length - 1; i >= 0; i--) { const gh = ghosts[i]; gh.t -= dt; gh.m.material.opacity = Math.max(0, gh.t / 0.3) * 0.5; if (gh.t <= 0) { scene.remove(gh.m); gh.m.material.dispose(); ghosts.splice(i, 1); } }
  goldMat.emissiveIntensity = 0.8 + Math.min(1, G.roar / ROAR_NEED) * (G.roar >= ROAR_NEED ? 1.6 + Math.sin(G.t * 6) * 0.8 : 0.6);
}

// ---------------------------------------------------------------- card effects: blasts, shockwave, burn, drones
const rings = [];
for (let i = 0; i < 8; i++) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.y = 0.3; scene.add(m); rings.push({ m, t: 1, r: 1 });
}
let ringI = 0;
function ringFx(x, z, r, col) { const g = rings[ringI++ % rings.length]; g.m.position.x = x; g.m.position.z = z; g.m.material.color.setHex(col); g.t = 0; g.r = r; }
function updateRings(dt) {
  for (const g of rings) {
    if (g.t >= 1) { g.m.material.opacity = 0; continue; }
    g.t = Math.min(1, g.t + dt * 2.2);
    const e = 1 - Math.pow(1 - g.t, 3);
    g.m.scale.setScalar(0.2 + e * g.r); g.m.material.opacity = (1 - g.t) * 0.9;
  }
  blastLight.intensity *= Math.pow(0.002, dt);
}
const blastLight = new THREE.PointLight(0xff5ad0, 0, 14, 2); scene.add(blastLight);
function novaBlast(b) {
  ringFx(b.x, b.z, b.r, b.col); stardust(b.x, 0.8, b.z, b.big ? 60 : 35, 4, 4);
  blastLight.position.set(b.x, 2, b.z); blastLight.color.setHex(b.col); blastLight.intensity = b.big ? 160 : 100;
  G.shake = Math.max(G.shake, b.big ? 0.45 : 0.25); Sfx.boom(b.big);
  for (const zb of [...zombies]) {
    const dx = zb.x - b.x, dz = zb.z - b.z, d = Math.hypot(dx, dz);
    if (d < b.r + zb.r) damageZombie(zb, b.dmg * stat.dmg(), dx / (d || 1), dz / (d || 1), 1.2);
  }
}
function updateBlasts(dt) {
  for (let i = G.blasts.length - 1; i >= 0; i--) {
    const b = G.blasts[i]; b.t -= dt;
    if (b.t <= 0) { G.blasts.splice(i, 1); novaBlast(b); }
  }
}
function shockwave(r, dmg) {
  ringFx(P.x, P.z, r, 0x38ffc8); stardust(P.x, 0.8, P.z, 30, 3, 5); G.shake = Math.max(G.shake, 0.3); Sfx.boom(false);
  for (const zb of [...zombies]) {
    const dx = zb.x - P.x, dz = zb.z - P.z, d = Math.hypot(dx, dz) || 1;
    if (d < r) { zb.x += dx / d * 2.5; zb.z += dz / d * 2.5; resolveCircle(zb, zb.r); damageZombie(zb, dmg, dx / d, dz / d, 0); }
  }
}
const drones = [];
const droneMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb347, emissiveIntensity: 1.4, metalness: 0.8, roughness: 0.3 });
function updateDrones(dt) {
  while (drones.length < pk('turret')) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), droneMat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: 0x3fd0ff })); ring.rotation.x = Math.PI / 2.5; g.add(ring);
    scene.add(g); drones.push({ g, t: 0.5 + drones.length * 0.7, a: drones.length * Math.PI });
  }
  while (drones.length > pk('turret')) scene.remove(drones.pop().g);
  for (const d of drones) {
    d.a += dt * 1.6;
    const x = P.x + Math.cos(d.a) * 1.3, z = P.z + Math.sin(d.a) * 1.3;
    d.g.position.set(x, 2.1 + Math.sin(G.t * 3 + d.a) * 0.1, z); d.g.rotation.y += dt * 3;
    d.t -= dt; if (d.t > 0 || P.dead) continue;
    let best = 14, tgt = null;
    for (const zb of zombies) { const dd = Math.hypot(zb.x - x, zb.z - z); if (dd < best && zb.state === 'chase') { best = dd; tgt = zb; } }
    if (!tgt) { d.t = 0.2; continue; }
    const dx = (tgt.x - x) / best, dz = (tgt.z - z) / best;
    let blockedShot = false; for (const o of obstacles) if (rayAABB(x, z, dx, dz, o) < best) { blockedShot = true; break; }
    if (blockedShot) { d.t = 0.2; continue; }
    d.t = 1.5; tracer(x, z, tgt.x, tgt.z); Sfx.zap();
    damageZombie(tgt, 30 * stat.dmg(), dx, dz, 0.1);
  }
}
function popText(text, x, z, color) {
  const v = new THREE.Vector3(x, 2, z).project(camera);
  const el = document.createElement('div'); el.className = 'ptext'; el.textContent = text; el.style.color = color;
  el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 700);
}

// ---------------------------------------------------------------- flow
function popup(text, color = '#fff') {
  const el = $('popup'); el.textContent = text; el.style.color = color; el.style.opacity = 1; G.popupT = 2.2;
}
function show(id) { for (const s of ['title', 'pause', 'dead', 'win', 'cards']) $(s).classList.toggle('hidden', s !== id); }
// ---------------------------------------------------------------- star cards UI
const LINE_STARS = {
  leo: [[10, 40], [30, 18], [55, 22], [72, 44], [52, 60]],
  comet: [[12, 58], [34, 44], [54, 32], [76, 14]],
  aegis: [[42, 8], [70, 26], [62, 60], [22, 60], [14, 26]],
  polaris: [[42, 6], [42, 34], [16, 46], [68, 46], [42, 66]],
  nova: [[42, 36], [42, 6], [72, 36], [42, 66], [12, 36]],
};
function starSvg(line, w = 84, h = 72, lit = 99) {
  const pts = LINE_STARS[line], col = LINES[line].color;
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  const dots = pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i < lit ? 3.6 : 2.4}" fill="${i < lit ? col : 'rgba(255,255,255,.35)'}"/>`).join('');
  return `<svg viewBox="0 0 84 72" width="${w}" height="${h}"><path d="${path}" fill="none" stroke="${col}" stroke-width="1.4" stroke-opacity=".55"/>${dots}</svg>`;
}
function linesHtml() {
  return Object.entries(LINES).map(([k, L]) => {
    const n = Math.min(3, lineCount(P.perks, k)), on = hasBonus(k);
    return `<div class="lineTag${on ? ' on' : ''}" style="--lc:${L.color}"><b>${L.name}</b><span>${'●'.repeat(n)}${'○'.repeat(3 - n)}</span></div>`;
  }).join('');
}
function openCards() {
  G.hand = drawCards(P.perks, P.owned);
  if (!G.hand.length) { G.pendingCards = 0; P.hp = P.maxHp; return; }
  G.state = 'cards'; mouse.down = false;
  renderCards(); show('cards'); Sfx.card();
}
function renderCards() {
  $('cardsTitle').textContent = `LEVEL ${P.lvl} · CHOOSE A STAR CARD`;
  $('hand').innerHTML = G.hand.map((c, i) => {
    const have = pk(c.id), L = LINES[c.line];
    const pips = Array.from({ length: c.max }, (_, j) => j < have ? '●' : j === have ? '<i>●</i>' : '○').join('');
    return `<button class="card r-${c.rarity}" data-i="${i}" style="--lc:${L.color};--d:${i * 0.08}s">
      <span class="ckey">${i + 1}</span><span class="crar">${c.rarity.toUpperCase()}</span>
      <div class="cicon">${starSvg(c.line)}</div>
      <div class="cline">${L.name}</div>
      <h3>${c.name}</h3><p>${c.text}</p>
      <div class="pips">${pips}</div>
    </button>`;
  }).join('');
  $('hand').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => chooseCard(+b.dataset.i)));
  $('lines').innerHTML = linesHtml();
  $('rerollBtn').textContent = `Reroll (${G.rerolls})`;
  $('rerollBtn').disabled = G.rerolls <= 0;
}
function rerollCards() {
  if (G.state !== 'cards' || G.rerolls <= 0) return;
  G.rerolls--; G.hand = drawCards(P.perks, P.owned); renderCards(); Sfx.click();
}
function chooseCard(i) {
  if (G.state !== 'cards' || !G.hand[i]) return;
  const c = G.hand[i];
  P.perks[c.id] = pk(c.id) + 1;
  if (c.id === 'skin') { P.maxHp += 25; P.hp += 25; }
  G.pendingCards--; P.invT = 1;
  show(null); G.state = 'play';
  const line = c.line;
  if (lineCount(P.perks, line) >= 3 && !hasBonus(line)) { P.bonus.push(line); showConstellation(line); }
  else { Sfx.card(); popup(c.name.toUpperCase(), LINES[c.line].color); }
  if (G.pendingCards > 0) G.slowT = 0.25;
}
function showConstellation(line) {
  const L = LINES[line], el = $('constel');
  el.style.setProperty('--lc', L.color);
  el.innerHTML = `${starSvg(line, 220, 188)}<h2>${L.name} · ${L.bonus}</h2><p>${L.bonusText}</p>`;
  el.classList.remove('hidden', 'play'); void el.offsetWidth; el.classList.add('play');
  Sfx.constellation(); stardust(P.x, 1.5, P.z, 60, 5, 3);
  clearTimeout(G.constelT); G.constelT = setTimeout(() => el.classList.add('hidden'), 2600);
}
$('rerollBtn').addEventListener('click', rerollCards);
function start() {
  Sfx.init(); if (G.state === 'title') G.blend = 1; G.state = 'play'; show(null); $('hud').classList.remove('hidden');
  popup('FIND 5 GENERATOR PARTS', '#3fd0ff');
}
function pause() { G.state = 'pause'; show('pause'); mouse.down = false; }
function resume() { G.state = 'play'; show(null); }
function die(title, sub) {
  P.dead = true; G.state = 'dying'; G.deadT = 0; mouse.down = false;
  $('deadTitle').textContent = title; $('deadSub').textContent = sub;
}
function win() {
  G.state = 'win'; show('win'); mouse.down = false;
  const t = Math.floor(MISSION_TIME - G.time);
  $('winStats').innerHTML = `${G.kills} kills · LV.${P.lvl} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} mission time`;
}
function restart() { try { location.hash = 'go'; } catch (e) {} location.reload(); }
document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
  Sfx.init(); const a = b.dataset.act;
  if (a === 'resume') resume();
  if (a === 'retry') { loadCheckpoint(); resume(); popup('CHECKPOINT', '#3fd0ff'); }
  if (a === 'restart') restart();
}));
$('startBtn').addEventListener('click', start);
function updateEvac() {
  const on = G.gears >= 5;
  evac.ring.material.opacity = on ? 0.6 : 0; evac.flare.material.opacity = on ? 1 : 0; evac.spot.off = !on;
}

// ---------------------------------------------------------------- update
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2), hitPt = new THREE.Vector3();
function resolveCircle(p, r) {
  for (const o of obstacles) {
    if (p.x < o.x0 - r || p.x > o.x1 + r || p.z < o.z0 - r || p.z > o.z1 + r) continue;
    const cx = clamp(p.x, o.x0, o.x1), cz = clamp(p.z, o.z0, o.z1);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    else {
      const l = p.x - o.x0, rr = o.x1 - p.x, t = p.z - o.z0, b = o.z1 - p.z, m = Math.min(l, rr, t, b);
      if (m === l) p.x = o.x0 - r; else if (m === rr) p.x = o.x1 + r; else if (m === t) p.z = o.z0 - r; else p.z = o.z1 + r;
    }
  }
  p.x = clamp(p.x, -CURB + r, CURB - r); p.z = clamp(p.z, Z_END + 3, Z_START - 2);
}
function animLegs(h, ph, amt) {
  h.legL.rotation.x = Math.sin(ph) * 0.6 * amt; h.legR.rotation.x = -Math.sin(ph) * 0.6 * amt;
}
function updatePlayer(dt) {
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (touch.move) { mx += clamp((touch.move.x - touch.move.sx) / 50, -1, 1); mz += clamp((touch.move.y - touch.move.sy) / 50, -1, 1); }
  let len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; len = 1; }
  const sprint = (keys.ShiftLeft || keys.ShiftRight || (touch.move && Math.hypot(touch.move.x - touch.move.sx, touch.move.y - touch.move.sy) > 70)) && P.stamina > 1 && len > 0.2;
  const spd = (sprint ? 7.2 : 4.6) * stat.speed();
  P.stamina = sprint ? Math.max(0, P.stamina - dt * 30 * Math.pow(0.7, pk('adrenal'))) : Math.min(100, P.stamina + dt * 16);
  P.lastMove = len > 0.2 ? [mx / len, mz / len] : null;
  if (P.dashT > 0) {
    const step = Math.min(P.dashT, dt); P.dashT -= dt;
    P.x += P.dashDir[0] * 34 * step; P.z += P.dashDir[1] * 34 * step; resolveCircle(P, 0.4);
    stardust(P.x, rand(0.5, 1.6), P.z, 4, 0.8, 0.6);
    ghostFx();
  } else { P.x += mx * spd * dt; P.z += mz * spd * dt; resolveCircle(P, 0.4); }
  if (P.dashCharges < maxDash()) { P.dashCd -= dt; if (P.dashCd <= 0) { P.dashCharges++; P.dashCd = P.dashCharges < maxDash() ? DASH_CD : 0; } }
  // aim
  let firing = false;
  if (touch.on) {
    if (touch.aim) {
      const dx = touch.aim.x - touch.aim.sx, dy = touch.aim.y - touch.aim.sy;
      if (Math.hypot(dx, dy) > 14) { P.aim = Math.atan2(dx, dy); firing = true; }
    } else if (len > 0.2) P.aim = angLerp(P.aim, Math.atan2(mx, mz), 0.2);
  } else {
    ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(aimPlane, hitPt)) { P.aim = Math.atan2(hitPt.x - P.x, hitPt.z - P.z); P.aimX = hitPt.x; P.aimZ = hitPt.z; }
    firing = mouse.down;
  }
  pm.root.position.set(P.x, 0, P.z); pm.root.rotation.y = P.aim;
  P.walk += len * spd * dt * 1.6;
  animLegs(pm, P.walk, len);
  pm.armR.rotation.x = -1.5; pm.armL.rotation.x = -1.35; pm.armL.rotation.z = 0.35;
  const recoil = Math.max(0, P.fireT / WEAPONS[P.cur].rate - 0.5);
  pm.torso.rotation.x = -recoil * 0.15;
  if (P.reloadT > 0) { pm.armL.rotation.x = -0.6; pm.torso.rotation.x = 0.1; }
  marker.position.y = 2.5 + Math.sin(G.t * 4) * 0.08; marker.rotation.y += 0.05;
  pm.body.visible = P.invT <= 0 || Math.sin(G.t * 40) > -0.3;
  // shooting
  P.fireT -= dt;
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; finishReload(); } }
  if (firing && P.fireT <= 0 && P.reloadT <= 0) {
    if (P.ammo[P.cur].mag > 0) shoot();
    else if (P.ammo[P.cur].reserve > 0) startReload();
    else { Sfx.click(); P.fireT = 0.3; if (P.cur !== 'pistol') switchTo('pistol'); }
  }
}
function updateZombies(dt) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const zb = zombies[i];
    if (!zb || zb.dead) continue; // a shockwave/blast during this loop can remove several
    if (zb.burn > 0) {
      zb.burn -= dt; zb.burnTick = (zb.burnTick || 0) - dt;
      if (Math.random() < dt * 14) stardust(zb.x, rand(0.6, 1.6), zb.z, 1, 1.5, 0.3);
      if (zb.burnTick <= 0) { zb.burnTick = 0.5; damageZombie(zb, 6 * stat.dmg(), 0, 0, 0, true); if (zb.dead) continue; }
    }
    const dx = P.x - zb.x, dz = P.z - zb.z, d = Math.hypot(dx, dz) || 1e-3;
    if (zb.z - P.z > 40 || (zb.state === 'chase' && d > 75)) { removeZombie(zb); disposeHumanoid(zb.h); continue; }
    let vx = 0, vz = 0;
    if (zb.state === 'idle') {
      zb.wanderT -= dt; if (zb.wanderT <= 0) { zb.wanderA = rand(0, TAU); zb.wanderT = rand(2, 5); }
      vx = Math.sin(zb.wanderA) * 0.35; vz = Math.cos(zb.wanderA) * 0.35;
      if (d < zb.aggro) { zb.state = 'chase'; if (d < 22) Sfx.groan(0.1); }
    } else if (!P.dead) {
      vx = dx / d * zb.speed; vz = dz / d * zb.speed;
      if (zb.sideT > 0) { zb.sideT -= dt; vx += -dz / d * zb.side * zb.speed; vz += dx / d * zb.side * zb.speed; }
    }
    for (const o of zombies) {
      if (o === zb) continue;
      const ex = zb.x - o.x, ez = zb.z - o.z, e2 = ex * ex + ez * ez, rr = zb.r + o.r;
      if (e2 < rr * rr && e2 > 1e-6) { const e = Math.sqrt(e2), push = (rr - e) * 4; vx += ex / e * push; vz += ez / e * push; }
    }
    const reach = zb.r + 0.75;
    zb.attacking = zb.state === 'chase' && !P.dead && d < reach;
    if (zb.attacking) {
      vx *= 0.1; vz *= 0.1;
      zb.atkT -= dt;
      if (zb.atkT <= 0) { zb.atkT = zb.atkRate; hurtPlayer(zb.dmg); }
    } else zb.atkT = Math.min(zb.atkT + dt, 0.45);
    const px = zb.x, pz = zb.z;
    zb.x += vx * dt; zb.z += vz * dt; resolveCircle(zb, zb.r);
    const moved = Math.hypot(zb.x - px, zb.z - pz), want = Math.hypot(vx, vz) * dt;
    if (zb.state === 'chase' && !zb.attacking && want > 0.001 && moved < want * 0.35) {
      zb.stuckT += dt; if (zb.stuckT > 0.35) { zb.side = Math.random() < 0.5 ? -1 : 1; zb.sideT = 1.1; zb.stuckT = 0; }
    } else zb.stuckT = Math.max(0, zb.stuckT - dt);
    // visuals
    const h = zb.h;
    const targetFace = zb.attacking || zb.state === 'chase' ? Math.atan2(dx, dz) : Math.atan2(vx, vz);
    zb.face = angLerp(zb.face, targetFace, Math.min(1, dt * 6));
    h.root.position.set(zb.x, 0, zb.z); h.root.rotation.y = zb.face;
    const spdNow = moved / Math.max(dt, 1e-4);
    zb.ph += dt * (1.5 + spdNow * 2.2);
    animLegs(h, zb.ph, Math.min(1, spdNow / 1.5 + 0.2));
    h.hips.position.y = 0.84 + Math.abs(Math.sin(zb.ph)) * 0.04;
    h.torso.rotation.x = zb.type === 'runner' ? 0.45 : 0.22;
    h.torso.rotation.z = Math.sin(zb.ph * 0.5) * 0.1;
    h.head.rotation.z = Math.sin(zb.ph * 0.5 + 1) * 0.25;
    if (zb.attacking) { const s = Math.sin(G.t * 12); h.armL.rotation.x = -1.7 + s * 0.6; h.armR.rotation.x = -1.7 - s * 0.6; }
    else { h.armL.rotation.x = -1.35 + Math.sin(zb.ph) * 0.15; h.armR.rotation.x = -1.25 - Math.sin(zb.ph) * 0.15; }
    h.armL.rotation.z = -0.1; h.armR.rotation.z = 0.1;
    if (zb.flash > 0) zb.flash -= dt;
    const em = zb.flash > 0 ? 0x661010 : zb.burn > 0 ? (Math.sin(G.t * 30 + i) > 0 ? 0x7a3a00 : 0x3a1800) : 0;
    if (em !== zb.em) { zb.em = em; h.mats.forEach(m => m.emissive.setHex(em)); }
    zb.groanT -= dt; if (zb.groanT <= 0) { zb.groanT = rand(4, 10); if (d < 20) Sfx.groan(0.11 * (1 - d / 22)); }
  }
  for (const c of corpses) {
    if (c.deadT >= 1) continue;
    c.deadT += dt / 0.45; const t = Math.min(1, c.deadT);
    c.h.body.rotation.x = -Math.PI / 2 * (t * t); c.h.body.position.y = 0.14 * t;
  }
}
function maxAlive() { return Math.min(34, 12 + G.gears * 4); }
function pickType() {
  const r = Math.random();
  if (G.gears >= 4 && r < 0.1) return 'brute';
  if (G.gears >= 2 && r < 0.3) return 'runner';
  if (G.gears >= 1 && r < 0.12) return 'runner';
  return 'walker';
}
function spawnGroup(n, ahead = 0.75) {
  for (let tries = 0; tries < 12; tries++) {
    const cz = Math.random() < ahead ? P.z - rand(26, 40) : P.z + rand(20, 27);
    const cx = rand(-11, 11);
    if (cz > Z_START - 3 || cz < Z_END + 4 || blocked(cx, cz, 0.8)) continue;
    for (let i = 0; i < n; i++) {
      const x = cx + rand(-2.5, 2.5), z = cz + rand(-2.5, 2.5);
      if (!blocked(x, z, 0.5)) spawnZombie(x, z, pickType(), true);
    }
    return;
  }
}
function updateSpawner(dt) {
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = Math.max(1.6, 4.4 - G.gears * 0.55) * rand(0.8, 1.2);
    if (alive() < maxAlive()) spawnGroup(randi(2, 3 + (G.gears >> 1)));
  }
}
function updatePickups(dt) {
  for (const p of pickups) {
    if (p.taken) continue;
    p.mesh.rotation.y += dt * 2; if (p.type === 'gear') p.mesh.position.y = 1 + Math.sin(G.t * 3) * 0.15;
    if (Math.hypot(P.x - p.x, P.z - p.z) > stat.pickR()) continue;
    if (p.type === 'gear') {
      setTaken(p, true); G.gears++; Sfx.pickup();
      if (pk('bandit')) { G.time += 30 * pk('bandit'); popText('+30s', P.x, P.z, '#c46bff'); }
      if (G.gears >= 5) { popup('ALL PARTS · REACH THE EVAC VAN', '#3dff8a'); updateEvac(); }
      else popup(`PART ${G.gears}/5 · CHECKPOINT`, '#3fd0ff');
      spawnGroup(3 + G.gears, 0.6); spawnGroup(2 + G.gears, 0.4);
      saveCheckpoint();
    } else if (p.type === 'weapon') {
      setTaken(p, true); Sfx.pickup();
      if (!P.owned.includes(p.weapon)) P.owned.push(p.weapon);
      P.owned.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      const w = WEAPONS[p.weapon]; P.ammo[p.weapon].mag = stat.mag(w); P.ammo[p.weapon].reserve += w.reserve;
      P.cur = p.weapon; P.reloadT = 0;
      popup(`${w.name} ACQUIRED`, '#ffd23f');
    } else if (p.type === 'ammo') {
      setTaken(p, true); Sfx.click();
      if (P.owned.includes('smg')) P.ammo.smg.reserve += 32;
      if (P.owned.includes('shotgun')) P.ammo.shotgun.reserve += 6;
      if (P.owned.includes('rail')) P.ammo.rail.reserve += 2;
      popup('+AMMO', '#ffd23f');
    } else if (p.type === 'nade' && P.nades < 5) {
      setTaken(p, true); Sfx.pickup(); P.nades++; popup('+GRAVITY GRENADE', '#c46bff');
    } else if (p.type === 'med' && P.hp < P.maxHp) {
      setTaken(p, true); Sfx.pickup(); P.hp = Math.min(P.maxHp, P.hp + 35); popup('+35 HP', '#ff6060');
    }
  }
  if (G.gears >= 5 && Math.hypot(P.x - EVAC.x, P.z - EVAC.z) < 3.5) win();
}
function updateFx(dt) {
  updateParticles(dt);
  for (const tr of tracers) if (tr.t > 0) { tr.t -= dt; tr.l.material.opacity = Math.max(0, tr.t / (tr.max || 0.06)) * 0.9; }
  muzzleLight.intensity *= Math.pow(0.0005, dt); muzzleFlash.material.opacity *= Math.pow(0.00001, dt);
  for (const f of fires) {
    f.t += dt;
    const k = 0.8 + Math.sin(f.t * 11) * 0.1 + Math.sin(f.t * 27) * 0.08;
    f.outer.scale.setScalar(4.5 * f.s * k); f.inner.scale.setScalar(2.2 * f.s * (1.6 - k * 0.6));
    f.flames.forEach((fl, i) => { const ph = (f.t * 1.4 + i / f.flames.length) % 1; fl.position.y = f.y + ph * 1.8 * f.s; fl.material.opacity = (1 - ph) * 0.8; fl.scale.setScalar((1.3 - ph * 0.8) * f.s); });
    f.pool.material.opacity = 0.22 * k;
  }
  if (G.gears >= 5) { evac.flare.scale.setScalar(2.5 + Math.sin(G.t * 9) * 0.5); evac.ring.scale.setScalar(8 + Math.sin(G.t * 3) * 0.8); }
  G.hurt = Math.max(0, G.hurt - dt * 2.5); $('hurt').style.opacity = Math.max(G.hurt, P.hp < P.maxHp * 0.3 ? 0.35 + Math.sin(G.t * 5) * 0.15 : 0);
  if (G.popupT > 0) { G.popupT -= dt; if (G.popupT < 0.6) $('popup').style.opacity = Math.max(0, G.popupT / 0.6); }
}
const camPos = new THREE.Vector3(0, 24, 15), camLook = new THREE.Vector3();
function updateCamera(dt, snap = false) {
  const lead = touch.on ? 1.5 : 3;
  const tx = P.x * 0.75 + Math.sin(P.aim) * lead, tz = P.z + Math.cos(P.aim) * lead - 2;
  const k = snap ? 1 : 1 - Math.pow(0.02, dt);
  const portrait = camera.aspect < 0.8;
  camLook.x = lerp(camLook.x, tx, k); camLook.z = lerp(camLook.z, tz, k); camLook.y = 0;
  camPos.set(camLook.x, portrait ? 27 : 30, camLook.z + (portrait ? 11 : 19));
  // cinematic title shot: low in the street, looking up at the ringed planet
  titlePos.set(Math.sin(G.t * 0.12) * 2.2, 2.6 + Math.sin(G.t * 0.2) * 0.3, P.z + 7);
  titleLook.set(Math.sin(G.t * 0.1) * 1.5, portrait ? 11 : 9.5, P.z - 40);
  if (G.state === 'title') { camera.position.copy(titlePos); camera.lookAt(titleLook); return moonFollow(); }
  if (G.blend > 0) {
    G.blend = Math.max(0, G.blend - dt / 1.6);
    const b = G.blend * G.blend * (3 - 2 * G.blend);
    camera.position.lerpVectors(camPos, titlePos, b); tmpLook.lerpVectors(camLook, titleLook, b);
    camera.lookAt(tmpLook); return moonFollow();
  }
  camera.position.copy(camPos);
  if (G.shake > 0) { camera.position.x += rand(-1, 1) * G.shake; camera.position.z += rand(-1, 1) * G.shake; G.shake = Math.max(0, G.shake - dt * 1.8); }
  camera.lookAt(camLook);
  moonFollow();
}
const titlePos = new THREE.Vector3(), titleLook = new THREE.Vector3(), tmpLook = new THREE.Vector3();
function moonFollow() {
  moon.position.set(P.x - 14, 30, P.z + 8); moon.target.position.set(P.x, 0, P.z - 6);
}
let hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHUD() {
  const dashFrac = P.dashCharges >= maxDash() ? 1 : P.dashCharges > 0 ? 1 : 1 - P.dashCd / DASH_CD;
  $('dashFill').style.height = (dashFrac * 100) + '%';
  $('abDash').classList.toggle('ready', P.dashCharges > 0);
  setText('dashPips', maxDash() > 1 ? '●'.repeat(P.dashCharges) + '○'.repeat(maxDash() - P.dashCharges) : '');
  $('roarFill').style.height = Math.min(100, G.roar / ROAR_NEED * 100) + '%';
  $('abRoar').classList.toggle('ready', G.roar >= ROAR_NEED);
  $('hpFill').style.width = (P.hp / P.maxHp * 100) + '%';
  $('stFill').style.width = P.stamina + '%';
  $('xpFill').style.width = (P.xp / xpNeed() * 100) + '%';
  setText('lvl', `LV.${P.lvl}`);
  const lh = linesHtml(); if (hudCache.lines !== lh) { hudCache.lines = lh; $('hudLines').innerHTML = lh; }
  const s = Math.ceil(G.time); setText('timer', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  $('timer').classList.toggle('low', G.time < 60);
  setText('obj', G.gears >= 5 ? 'Reach the evac van' : 'Find the generator parts');
  setText('gearTxt', `${G.gears}/5`); $('gears').classList.toggle('full', G.gears >= 5);
  const w = WEAPONS[P.cur], a = P.ammo[P.cur];
  setText('wname', P.reloadT > 0 ? 'RELOADING' : w.name);
  const rl = runeLvl(P.cur), nextK = RUNES[rl] ?? null;
  const runes = `<b>${'ᚱ'.repeat(rl)}</b>${'ᚱ'.repeat(3 - rl)}`;
  if (hudCache.runes !== runes) { hudCache.runes = runes; $('runes').innerHTML = runes; }
  $('runeFill').style.width = (nextK === null ? 100 : ((P.wkills[P.cur] - RUNES[rl - 1]) / (nextK - RUNES[rl - 1]) * 100)) + '%';
  setText('nadeCount', String(P.nades)); $('abNade').classList.toggle('ready', P.nades > 0);
  setText('ammo', `${a.mag} / ${a.reserve === Infinity ? '∞' : a.reserve}`);
  $('ammo').classList.toggle('empty', a.mag === 0);
  const slots = ORDER.map((k, i) => P.owned.includes(k) ? `<span class="${k === P.cur ? 'on' : ''}">${i + 1} ${WEAPONS[k].short}</span>` : '').join('');
  if (hudCache.slots !== slots) { hudCache.slots = slots; $('slots').innerHTML = slots; }
  setText('kills', `${G.kills} KILLS`);
  // crosshair + objective arrow
  cross.style.display = !touch.on && G.state === 'play' ? 'block' : 'none';
  cross.style.left = mouse.x + 'px'; cross.style.top = mouse.y + 'px';
  let tgt = null, best = Infinity;
  if (G.gears >= 5) tgt = EVAC;
  else for (const p of pickups) if (p.type === 'gear' && !p.taken) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < best) { best = d; tgt = p; } }
  const arrow = $('arrow');
  if (tgt) {
    const v = new THREE.Vector3(tgt.x, 1, tgt.z).project(camera);
    const on = v.z < 1 && Math.abs(v.x) < 0.88 && Math.abs(v.y) < 0.8;
    if (on) arrow.style.display = 'none';
    else {
      let ax = v.x, ay = v.y; if (v.z > 1) { ax = -ax; ay = -ay; }
      const m = Math.max(Math.abs(ax) / 0.85, Math.abs(ay) / 0.72, 1e-3); ax /= m; ay /= m;
      arrow.style.display = 'block';
      arrow.style.left = ((ax + 1) / 2 * innerWidth) + 'px'; arrow.style.top = ((1 - ay) / 2 * innerHeight) + 'px';
      arrow.firstElementChild.style.transform = `rotate(${Math.atan2(ax, ay)}rad)`;
      setText('arrowTxt', `${Math.round(Math.hypot(tgt.x - P.x, tgt.z - P.z))} m`);
    }
  } else arrow.style.display = 'none';
}

// ---------------------------------------------------------------- init + loop
buildStreet(); buildProps(); buildEvac(); buildSkyTraffic();
GEAR_SPOTS.forEach(([x, z]) => { const p = addPickup('gear', x, z); });
addPickup('weapon', 9.5, -58, { weapon: 'smg' });
addPickup('weapon', -10, -150, { weapon: 'shotgun' });
addPickup('weapon', 9, -198, { weapon: 'rail' });
addPickup('nade', -9, -70); addPickup('nade', 8.5, -160);
addPickup('med', 9, -105); addPickup('med', -9.5, -190);
resetPlayer();
for (let i = 0; i < 26; i++) {
  const z = rand(-22, Z_END + 15), x = rand(-11, 11);
  if (!blocked(x, z, 0.6)) spawnZombie(x, z, 'walker', false);
}
saveCheckpoint();
updateCamera(0, true);
if (location.hash === '#go') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} start(); }

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  tick(Math.min(clock.getDelta(), 0.05));
}
function tick(dt) {
  G.t += dt;
  if (G.state === 'play' && G.roarSlow > 0) { G.roarSlow -= dt; dt *= 0.3; }
  if (G.state === 'play') {
    if (G.slowT > 0) { G.slowT -= dt; dt *= 0.25; if (G.slowT <= 0 && G.pendingCards > 0) openCards(); }
    else if (G.pendingCards > 0) openCards();
  }
  if (G.state === 'play') {
    G.time -= dt;
    if (G.time <= 0) { G.time = 0; die('TIME UP', 'The power never came back.'); }
    P.invT = Math.max(0, P.invT - dt); G.shockCd = Math.max(0, G.shockCd - dt);
    updatePlayer(dt); updateZombies(dt); updateSpawner(dt); updatePickups(dt); updateDrones(dt); updateBlasts(dt); updateMotes(dt); updateNades(dt); updateBeams(dt);
  } else if (G.state === 'dying') {
    G.deadT += dt; const t = Math.min(1, G.deadT / 0.6);
    pm.body.rotation.x = -Math.PI / 2 * t * t; pm.body.position.y = 0.14 * t;
    updateZombies(dt);
    if (G.deadT > 1.4) { G.state = 'dead'; show('dead'); }
  } else if (G.state === 'title') {
    P.aim += dt * 0.3; pm.root.rotation.y = P.aim;
  }
  if (G.state !== 'pause' && G.state !== 'cards') { updateFx(dt); updateCosmic(dt, camLook); updateRings(dt); updateRoarFx(dt); }
  updateCamera(dt);
  updateLights(camLook, G.t);
  if (G.state !== 'title') updateHUD();
  composer.render();
}
frame();
// debug/test hook: step the simulation without requestAnimationFrame
window.__game = { G, P, zombies, pickups, corpses, spawnZombie, keys, mouse, gainXp, chooseCard, rerollCards, CARD, motes, starDash, lionRoar, ROAR_NEED, throwNade, nades, runeLvl, WEAPONS, obstacles, aimAt(x, z) { const v = new THREE.Vector3(x, 1.2, z).project(camera); mouse.x = (v.x + 1) / 2 * innerWidth; mouse.y = (1 - v.y) / 2 * innerHeight; }, step(n = 60, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt); } };
