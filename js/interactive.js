/* EazyD Studio — interactive-v1: starfield, card flips, easter eggs, sound */
(function () {
  "use strict";
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var W = 0, H = 0, mobile = innerWidth < 700;

  /* ---------- Sound (WebAudio, default off) ---------- */
  var Snd = (function () {
    var ctx = null, master = null, pad = null, on = false;
    try { on = localStorage.getItem("ed-sound") === "on"; } catch (e) {}
    function init() {
      if (ctx) return true;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); return true;
    }
    function startPad() {
      if (pad || !ctx) return;
      var g = ctx.createGain(); g.gain.value = 0.05;
      var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700; f.Q.value = 0.7;
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      var oscs = [110, 164.81, 220.5, 329.2].map(function (hz, i) { var o = ctx.createOscillator(); o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = hz; o.detune.value = (i - 1.5) * 6; o.connect(f); o.start(); return o; });
      f.connect(g); g.connect(master); pad = { g: g, oscs: oscs, lfo: lfo };
    }
    function set(v) {
      on = v; try { localStorage.setItem("ed-sound", v ? "on" : "off"); } catch (e) {}
      if (v) { if (!init()) return; ctx.resume(); startPad(); master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.4); }
      else if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    }
    function blip(freq, dur, type) {
      if (!on || !ctx) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(freq || 660, t); o.frequency.exponentialRampToValueAtTime((freq || 660) * 1.5, t + (dur || .12));
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || .12));
      o.connect(g); g.connect(master); o.start(t); o.stop(t + (dur || .12) + 0.05);
    }
    function whoosh() {
      if (!on || !ctx) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(900, t + 1.6);
      var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 2.1);
    }
    return { get on() { return on; }, set: set, blip: blip, whoosh: whoosh };
  })();

  var btn = document.getElementById("sound-toggle");
  function syncBtn() { if (!btn) return; btn.setAttribute("aria-pressed", Snd.on ? "true" : "false"); btn.querySelector(".sound-toggle__label").textContent = Snd.on ? "Sound on" : "Sound off"; }
  if (btn) {
    syncBtn();
    btn.addEventListener("click", function () { Snd.set(!Snd.on); syncBtn(); Snd.blip(880, .1); });
    /* remembered ON: audio needs a user gesture, so arm on first interaction */
    if (Snd.on) { var arm = function () { Snd.set(true); removeEventListener("pointerdown", arm); removeEventListener("keydown", arm); }; addEventListener("pointerdown", arm); addEventListener("keydown", arm); }
  }

  /* ---------- Interactive starfield (2D canvas, 30fps) ---------- */
  var cv = document.createElement("canvas"); cv.className = "starfield-fx"; cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);
  var g = cv.getContext("2d"), stars = [], fx = [], warpT = 0, mx = 0, my = 0, pmx = 0, pmy = 0, running = false, last = 0, raf = 0;
  var COLORS = ["#ffffff", "#cfe0ff", "#3ee6ff", "#ffc98f", "#9fc2ff"];
  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight; cv.style.width = W + "px"; cv.style.height = H + "px";
    var n = mobile ? 90 : 200; stars = [];
    for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: .2 + Math.random() * .8, c: COLORS[(Math.random() * COLORS.length) | 0], tw: Math.random() * 6.28 });
    if (!running) draw(performance.now());
  }
  function draw(now) {
    var t = now / 1000; g.clearRect(0, 0, W, H);
    pmx += (mx - pmx) * .08; pmy += (my - pmy) * .08;
    var warp = warpT > now ? Math.min(1, (warpT - now) / 600, (now - (warpT - 2600)) / 400) : 0;
    var cx = W / 2, cy = H / 2;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], ox = pmx * 28 * s.z, oy = pmy * 28 * s.z;
      var x = s.x + ox, y = s.y + oy, a = RM ? .7 : .45 + .45 * Math.sin(t * 1.6 + s.tw);
      if (warp > 0) {
        var dx = x - cx, dy = y - cy, k = 1 + warp * 0.09 * s.z;
        s.x = cx + (s.x - cx) * k; s.y = cy + (s.y - cy) * k;
        if (s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) { s.x = cx + (Math.random() - .5) * 60; s.y = cy + (Math.random() - .5) * 60; }
        g.strokeStyle = s.c; g.globalAlpha = .9; g.lineWidth = s.z * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - dx * warp * .25 * s.z, y - dy * warp * .25 * s.z); g.stroke();
      } else { g.globalAlpha = a; g.fillStyle = s.c; g.fillRect(x, y, s.z * 1.8, s.z * 1.8); }
    }
    for (var j = fx.length - 1; j >= 0; j--) {
      var p = fx[j]; p.life -= 1 / 30; if (p.life <= 0) { fx.splice(j, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += p.gr; p.vx *= .97; p.vy *= .97;
      g.globalAlpha = Math.min(1, p.life / p.max * 1.4); g.fillStyle = p.c;
      if (p.trail) { g.strokeStyle = p.c; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 6, p.y - p.vy * 6); g.stroke(); }
      else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); }
    }
    g.globalAlpha = 1;
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / 30 - 1) return; last = now; draw(now);
    if (!fx.length && warpT < now && Math.abs(mx - pmx) < .002 && Math.abs(my - pmy) < .002 && document.hidden) stop();
  }
  function start() { if (running || RM) return; running = true; last = 0; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  addEventListener("resize", function () { mobile = innerWidth < 700; resize(); });
  resize(); start();
  addEventListener("pointermove", function (e) { mx = e.clientX / W - .5; my = e.clientY / H - .5; }, { passive: true });
  if (window.DeviceOrientationEvent && !FINE) addEventListener("deviceorientation", function (e) { if (e.gamma == null) return; mx = Math.max(-.5, Math.min(.5, e.gamma / 60)); my = Math.max(-.5, Math.min(.5, (e.beta - 40) / 80)); }, { passive: true });

  function burst(x, y) {
    if (RM) return;
    var shoot = Math.random() < .35;
    if (shoot) { fx.push({ x: x, y: y, vx: (Math.random() < .5 ? -1 : 1) * (9 + Math.random() * 4), vy: 3 + Math.random() * 2, gr: 0, life: 1, max: 1, c: "#bff6ff", trail: true }); }
    var n = mobile ? 14 : 22;
    for (var i = 0; i < n; i++) { var an = Math.random() * 6.283, sp = 1.5 + Math.random() * 4; fx.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, gr: .06, r: 1 + Math.random() * 2, life: .6 + Math.random() * .6, max: 1.2, c: i % 3 ? "#ff8c1a" : (i % 2 ? "#ffd2a3" : "#3ee6ff") }); }
    Snd.blip(shoot ? 520 : 760, shoot ? .25 : .08, "triangle"); start();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("a, button, input, video, .card, .holo-stage, [role=button], label, summary")) return;
    burst(e.clientX, e.clientY);
  });

  /* ---------- Card flips ---------- */
  var BLURB = {
    "Forest Village": "Top-down village tileset: houses, props and ambience. Godot-ready import.",
    "Retro JRPG UI Theme": "Menus, panels and controls themed for retro JRPG flows in Godot 4.",
    "Slice & Swatch": "Modular 9-slice pieces and color swatches for fast in-engine prototyping.",
    "VRChat assets on Jinxxy": "PhysBone shoulder pets, masks and headphones. Free and premium versions."
  };
  document.querySelectorAll("#packs .card").forEach(function (card, i) {
    var title = card.querySelector(".card__title"), link = card.querySelector(".card__link"); if (!title || !link) return;
    var inner = document.createElement("div"); inner.className = "card__inner";
    var front = document.createElement("div"); front.className = "card__face card__face--front";
    while (card.firstChild) front.appendChild(card.firstChild);
    var back = document.createElement("div"); back.className = "card__face card__face--back"; back.id = "card-back-" + i; back.setAttribute("aria-hidden", "true");
    var h = document.createElement("p"); h.className = "card__back-title"; h.textContent = title.textContent;
    var p = document.createElement("p"); p.className = "card__text"; p.textContent = BLURB[title.textContent.trim()] || card.querySelector(".card__text").textContent;
    var a = link.cloneNode(true); a.tabIndex = -1;
    back.appendChild(h); back.appendChild(p); back.appendChild(a);
    var b = document.createElement("button"); b.type = "button"; b.className = "card__flip"; b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", back.id);
    b.innerHTML = '<span aria-hidden="true">⟲</span> <span class="vh">Show details for </span><span class="card__flip-label">Details</span><span class="vh"> ' + title.textContent + "</span>";
    inner.appendChild(front); inner.appendChild(back); card.appendChild(inner); card.appendChild(b); card.classList.add("flippable");
    function flip(v) {
      var on = v == null ? !card.classList.contains("flipped") : v;
      card.classList.toggle("flipped", on); b.setAttribute("aria-expanded", on ? "true" : "false"); b.querySelector(".card__flip-label").textContent = on ? "Back" : "Details";
      back.setAttribute("aria-hidden", on ? "false" : "true"); front.setAttribute("aria-hidden", on ? "true" : "false");
      a.tabIndex = on ? 0 : -1; front.querySelectorAll("a").forEach(function (x) { if (!x.classList.contains("card__media")) x.tabIndex = on ? -1 : 0; });
      Snd.blip(on ? 620 : 480, .09);
    }
    b.addEventListener("click", function (e) { e.stopPropagation(); flip(); });
    card.addEventListener("click", function (e) { if (e.target.closest("a, button")) return; flip(); });
  });

  /* ---------- Easter eggs: Konami + 5 taps on nav logo ---------- */
  var toast = document.getElementById("egg-toast");
  function hyperdrive() {
    if (toast) { toast.hidden = false; toast.classList.remove("show"); void toast.offsetWidth; toast.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { toast.classList.remove("show"); toast.hidden = true; }, 5200); }
    document.documentElement.classList.add("warping"); setTimeout(function () { document.documentElement.classList.remove("warping"); }, 2600);
    if (RM) return;
    warpT = performance.now() + 2600; Snd.whoosh(); start();
  }
  window.addEventListener("ed:hyperdrive", hyperdrive);
  var K = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], ki = 0;
  addEventListener("keydown", function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; ki = k === K[ki] ? ki + 1 : (k === K[0] ? 1 : 0); if (ki === K.length) { ki = 0; hyperdrive(); } });
  var brand = document.querySelector(".brand"), taps = 0, tapT = 0;
  if (brand) brand.addEventListener("click", function (e) { var n = Date.now(); taps = n - tapT < 700 ? taps + 1 : 1; tapT = n; if (taps >= 5) { taps = 0; e.preventDefault(); hyperdrive(); } });
})();
