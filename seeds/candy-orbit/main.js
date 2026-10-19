/* ============================================================
   Candy Orbit — 糖果星轨
   引力弹弓 + 糖果行星轨道 + 冲击波脉冲 + 糖霜粒子
   Maintainer: EDEN
   ============================================================ */

(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('orbit-canvas');
  const ctx = canvas.getContext('2d');
  const modeLabel = document.getElementById('mode-label');
  const modeTabs = document.getElementById('mode-tabs');
  const themeBtn = document.getElementById('theme-btn');
  const pulseBtn = document.getElementById('pulse-btn');
  const spawnBtn = document.getElementById('spawn-btn');
  const clearBtn = document.getElementById('clear-btn');
  const gravitySlider = document.getElementById('gravity-slider');
  const gravityValue = document.getElementById('gravity-value');
  const trailSlider = document.getElementById('trail-slider');
  const trailValue = document.getElementById('trail-value');
  const candyCount = document.getElementById('candy-count');
  const centerReadout = document.getElementById('center-readout');
  const dragHint = document.getElementById('drag-hint');
  const teleVel = document.getElementById('tele-vel');
  const teleKe = document.getElementById('tele-ke');
  const telePulse = document.getElementById('tele-pulse');
  const teleTheme = document.getElementById('tele-theme');

  // === State ===
  const state = {
    mode: 'orbit',
    gravity: 0.9,
    trailFade: 0.55,
    pulseCount: 0,
    time: 0,
    w: 0, h: 0, dpr: 1,
    star: { x: 0, y: 0, r: 26, pulse: 0 },
    candies: [],
    rings: [],
    sparkles: [],
    drag: null,
    themeIndex: 0
  };

  // === Themes (candy palettes) ===
  const THEMES = [
    { id: 'sugar',  name: 'SUGAR',  colors: ['#ff8fb1', '#ffd6a5', '#a5f3fc', '#cdb4ff', '#fca5f5'] },
    { id: 'mint',   name: 'MINT',   colors: ['#6ee7b7', '#a7f3d0', '#5eead4', '#bae6fd', '#86efac'] },
    { id: 'nebula', name: 'NEBULA', colors: ['#c084fc', '#818cf8', '#f472b6', '#7dd3fc', '#d8b4fe'] },
    { id: 'citrus', name: 'CITRUS', colors: ['#fbbf24', '#fb923c', '#f87171', '#fde68a', '#fdba74'] }
  ];

  // === Resize ===
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = rect.width;
    state.h = rect.height;
    canvas.width = state.w * state.dpr;
    canvas.height = state.h * state.dpr;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.star.x = state.w / 2;
    state.star.y = state.h / 2;
    initSparkles();
  }

  function initSparkles() {
    state.sparkles = [];
    const n = Math.floor((state.w * state.h) / 9000);
    for (let i = 0; i < n; i++) {
      state.sparkles.push({
        x: Math.random() * state.w,
        y: Math.random() * state.h,
        r: Math.random() * 1.6 + 0.4,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.02 + 0.006
      });
    }
  }

  // === Candy Factory ===
  function makeCandy(x, y, vx, vy) {
    const theme = THEMES[state.themeIndex];
    return {
      x, y, vx, vy,
      r: Math.random() * 9 + 7,
      color: theme.colors[Math.floor(Math.random() * theme.colors.length)],
      born: state.time,
      squash: 1,
      trail: []
    };
  }

  // Spawn a candy in a stable circular orbit
  function spawnOrbitCandy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.min(state.w, state.h) * (0.22 + Math.random() * 0.28);
    const x = state.star.x + Math.cos(angle) * dist;
    const y = state.star.y + Math.sin(angle) * dist;
    const speed = Math.sqrt(state.gravity * 4200 / dist) * (Math.random() > 0.5 ? 1 : -1);
    const tx = -Math.sin(angle), ty = Math.cos(angle);
    state.candies.push(makeCandy(x, y, tx * speed, ty * speed));
    updateCount();
  }

  // === Physics Step ===
  function step(dt) {
    const s = state.star;
    const g = state.gravity * 4200;
    const mode = state.mode;

    for (const c of state.candies) {
      const dx = s.x - c.x;
      const dy = s.y - c.y;
      const distSq = Math.max(dx * dx + dy * dy, 900);
      const dist = Math.sqrt(distSq);

      // gravity toward star
      let force = g / distSq;
      if (mode === 'drift') force *= 0.45;
      if (s.pulse > 0) force *= 1 + s.pulse * 2;

      c.vx += (dx / dist) * force * dt;
      c.vy += (dy / dist) * force * dt;

      // swarm: gentle mutual attraction
      if (mode === 'swarm') {
        for (const o of state.candies) {
          if (o === c) continue;
          const ox = o.x - c.x, oy = o.y - c.y;
          const odSq = Math.max(ox * ox + oy * oy, 4000);
          const od = Math.sqrt(odSq);
          const of = 5200 / odSq;
          c.vx += (ox / od) * of * dt;
          c.vy += (oy / od) * of * dt;
        }
      }

      // drift mode: mild damping
      if (mode === 'drift') {
        c.vx *= 0.9985;
        c.vy *= 0.9985;
      }

      // speed cap
      const vNow = Math.hypot(c.vx, c.vy);
      if (vNow > 620) { c.vx *= 620 / vNow; c.vy *= 620 / vNow; }

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // squash based on velocity (jelly physics)
      const targetSquash = 1 + Math.min(vNow / 900, 0.35);
      c.squash += (targetSquash - c.squash) * 0.1;

      // trail record
      c.trail.push({ x: c.x, y: c.y });
      const trailLen = Math.floor(state.trailFade * 60);
      if (c.trail.length > trailLen) c.trail.splice(0, c.trail.length - trailLen);

      // consume by star
      if (dist < s.r + c.r * 0.4) {
        c.dead = true;
        spawnRing(c.x, c.y, 60, c.color);
      }

      // soft bounds bounce
      if (c.x < -60 || c.x > state.w + 60 || c.y < -60 || c.y > state.h + 60) c.dead = true;
    }
    state.candies = state.candies.filter((c) => !c.dead);

    // rings decay
    for (const r of state.rings) r.life -= dt * 1.6;
    state.rings = state.rings.filter((r) => r.life > 0);

    // star pulse decay
    if (s.pulse > 0) s.pulse = Math.max(0, s.pulse - dt * 1.4);
  }

  function spawnRing(x, y, radius, color) {
    state.rings.push({ x, y, r: radius * 0.3, maxR: radius * 2.4, life: 1, color });
  }

  function firePulse() {
    state.star.pulse = 1;
    state.pulseCount++;
    telePulse.textContent = state.pulseCount;
    flashTele(telePulse);
    spawnRing(state.star.x, state.star.y, 90, THEMES[state.themeIndex].colors[0]);
    for (const c of state.candies) {
      const dx = c.x - state.star.x, dy = c.y - state.star.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const kick = 26000 / dist;
      c.vx += (dx / dist) * kick * 0.04;
      c.vy += (dy / dist) * kick * 0.04;
    }
  }

  // === Render ===
  function render() {
    const s = state.star;
    ctx.clearRect(0, 0, state.w, state.h);

    // sugar sparkles
    for (const sp of state.sparkles) {
      sp.tw += sp.sp;
      const a = 0.18 + Math.abs(Math.sin(sp.tw)) * 0.4;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }

    // orbit guide rings
    const guides = 4;
    for (let i = 1; i <= guides; i++) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, (Math.min(state.w, state.h) / 2.4) * (i / guides), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // pulse rings
    for (const r of state.rings) {
      const t = 1 - r.life;
      const ease = 1 - Math.pow(1 - t, 3);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r + (r.maxR - r.r) * ease, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.life * 0.55;
      ctx.lineWidth = 2.5 * r.life;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // star (candy core)
    const breathe = 1 + Math.sin(state.time * 1.6) * 0.05 + s.pulse * 0.35;
    const R = s.r * breathe;
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 4.2);
    glow.addColorStop(0, 'rgba(255,255,255,0.5)');
    glow.addColorStop(0.25, hexA(THEMES[state.themeIndex].colors[0], 0.32));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(s.x - R * 4.2, s.y - R * 4.2, R * 8.4, R * 8.4);

    ctx.beginPath();
    ctx.arc(s.x, s.y, R, 0, Math.PI * 2);
    const core = ctx.createRadialGradient(s.x - R * 0.3, s.y - R * 0.35, R * 0.1, s.x, s.y, R);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.5, THEMES[state.themeIndex].colors[1]);
    core.addColorStop(1, THEMES[state.themeIndex].colors[0]);
    ctx.fillStyle = core;
    ctx.fill();

    // candies
    for (const c of state.candies) {
      // trail
      if (c.trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(c.trail[0].x, c.trail[0].y);
        for (let i = 1; i < c.trail.length; i++) ctx.lineTo(c.trail[i].x, c.trail[i].y);
        ctx.strokeStyle = hexA(c.color, 0.32);
        ctx.lineWidth = Math.max(c.r * 0.24, 1);
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // body with squash along velocity
      const vAng = Math.atan2(c.vy, c.vx);
      const pop = Math.min((state.time - c.born) / 0.4, 1);
      const popEase = 1 - Math.pow(1 - pop, 3);
      const br = c.r * popEase;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(vAng);
      ctx.scale(c.squash, 1 / c.squash);
      ctx.beginPath();
      ctx.arc(0, 0, br, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-br * 0.35, -br * 0.4, br * 0.1, 0, 0, br);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, c.color);
      grad.addColorStop(1, shade(c.color, -28));
      ctx.fillStyle = grad;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      // sugar sprinkle highlight
      ctx.beginPath();
      ctx.arc(-br * 0.3, -br * 0.38, br * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.restore();
    }

    // drag slingshot
    if (state.drag) {
      const d = state.drag;
      ctx.beginPath();
      ctx.moveTo(d.x0, d.y0);
      ctx.lineTo(d.x1, d.y1);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // launch vector (opposite direction)
      const lx = d.x0 + (d.x0 - d.x1);
      const ly = d.y0 + (d.y0 - d.y1);
      ctx.beginPath();
      ctx.moveTo(d.x0, d.y0);
      ctx.lineTo(lx, ly);
      ctx.strokeStyle = hexA(THEMES[state.themeIndex].colors[0], 0.9);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // preview candy
      ctx.beginPath();
      ctx.arc(d.x0, d.y0, 9, 0, Math.PI * 2);
      ctx.fillStyle = THEMES[state.themeIndex].colors[2];
      ctx.shadowColor = THEMES[state.themeIndex].colors[2];
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // === Telemetry ===
  function updateTelemetry() {
    let vSum = 0, ke = 0;
    for (const c of state.candies) {
      const v = Math.hypot(c.vx, c.vy);
      vSum += v;
      ke += 0.5 * c.r * v * v;
    }
    const avg = state.candies.length ? vSum / state.candies.length : 0;
    teleVel.textContent = (avg / 100).toFixed(2);
    teleKe.textContent = (ke / 1e6).toFixed(2);
  }

  function flashTele(el) {
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 450);
  }

  function updateCount() {
    candyCount.textContent = state.candies.length;
    centerReadout.classList.remove('pop');
    void centerReadout.offsetWidth;
    centerReadout.classList.add('pop');
  }

  // === Color helpers ===
  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function shade(hex, amt) {
    const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amt));
    const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amt));
    const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amt));
    return `rgb(${r},${g},${b})`;
  }

  // === Pointer Interaction (slingshot) ===
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = getPos(e);
    state.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, t0: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    dragHint.classList.add('hidden');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!state.drag) return;
    const p = getPos(e);
    state.drag.x1 = p.x;
    state.drag.y1 = p.y;
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!state.drag) return;
    const d = state.drag;
    const dur = performance.now() - d.t0;
    const dx = d.x0 - d.x1;
    const dy = d.y0 - d.y1;
    const power = Math.min(Math.hypot(dx, dy) * 2.6, 560);

    if (dur < 180 && Math.hypot(dx, dy) < 8) {
      firePulse(); // quick tap = pulse
    } else if (Math.hypot(dx, dy) > 8) {
      const dist = Math.hypot(dx, dy) || 1;
      state.candies.push(makeCandy(d.x0, d.y0, (dx / dist) * power, (dy / dist) * power));
      updateCount();
    }
    state.drag = null;
  });

  canvas.addEventListener('pointercancel', () => { state.drag = null; });

  // === Controls ===
  const MODE_TEXT = {
    orbit: 'DRAG TO LAUNCH · TAP TO PULSE',
    drift: 'LOW GRAVITY DRIFT MODE',
    swarm: 'MUTUAL ATTRACTION SWARM'
  };

  modeTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-tab');
    if (!btn) return;
    modeTabs.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    modeLabel.textContent = MODE_TEXT[state.mode];
  });

  gravitySlider.addEventListener('input', () => {
    state.gravity = gravitySlider.value / 100;
    gravityValue.textContent = state.gravity.toFixed(2);
  });

  trailSlider.addEventListener('input', () => {
    state.trailFade = trailSlider.value / 100;
    trailValue.textContent = trailSlider.value;
  });

  themeBtn.addEventListener('click', () => {
    state.themeIndex = (state.themeIndex + 1) % THEMES.length;
    const t = THEMES[state.themeIndex];
    document.body.dataset.theme = t.id;
    teleTheme.querySelector('b').textContent = t.name;
  });

  pulseBtn.addEventListener('click', firePulse);
  spawnBtn.addEventListener('click', spawnOrbitCandy);
  clearBtn.addEventListener('click', () => {
    state.candies = [];
    updateCount();
  });

  window.addEventListener('resize', resize);

  // === Main Loop ===
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    state.time += dt;
    step(dt);
    render();
    updateTelemetry();
    requestAnimationFrame(loop);
  }

  // === Boot ===
  resize();
  document.body.dataset.theme = 'sugar';
  for (let i = 0; i < 5; i++) spawnOrbitCandy();
  updateCount();
  requestAnimationFrame(loop);
})();
