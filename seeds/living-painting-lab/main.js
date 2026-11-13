/* ============================================================
   Living Painting Lab · 活体绘画实验室
   画下的笔触成为活的颜料粒子，在噪声流场中呼吸与漂移。
   ============================================================ */

(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('paint-canvas');
  const frame = document.getElementById('canvas-frame');
  const ctx = canvas.getContext('2d');
  const emptyHint = document.getElementById('empty-hint');
  const hudMode = document.getElementById('hud-mode');
  const hudFlow = document.getElementById('hud-flow');
  const blobCounter = document.getElementById('blob-counter');
  const themeRow = document.getElementById('theme-row');
  const modeGrid = document.getElementById('mode-grid');
  const sliderLife = document.getElementById('slider-life');
  const sliderBrush = document.getElementById('slider-brush');
  const sliderTrail = document.getElementById('slider-trail');
  const valLife = document.getElementById('val-life');
  const valBrush = document.getElementById('val-brush');
  const valTrail = document.getElementById('val-trail');
  const checkDrift = document.getElementById('check-drift');
  const btnPulse = document.getElementById('btn-pulse');
  const btnClear = document.getElementById('btn-clear');
  const btnSeed = document.getElementById('btn-seed');
  const btnExport = document.getElementById('btn-export');

  // === State ===
  const state = {
    mode: 'flow',          // flow | swirl | pulse | freeze
    life: 0.6,             // 生命强度（流场速度）
    brush: 14,             // 笔触粒径
    trail: 0.86,           // 拖尾余韵（越大尾越长）
    drift: true,           // 颜料自走漂移
    theme: 'aurora',
    painting: false,
    W: 0, H: 0,
    time: 0
  };

  const pigments = [];     // 活体颜料粒子
  const waves = [];        // 点击冲击波
  const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, down: false };
  const MAX_PIGMENTS = 2600;

  const THEMES = {
    aurora: ['#6ff0c0', '#4aa8ff', '#a5ffe9', '#3d8f7a', '#8fe3ff', '#c8ffe0'],
    ember:  ['#ffb45a', '#ff5e7e', '#ffd9a0', '#e0703a', '#ff8fa0', '#ffe0c0'],
    abyss:  ['#8fa4ff', '#5ce1e6', '#c0caff', '#3a4a9f', '#7fd8ff', '#e0e6ff'],
    orchid: ['#e29aff', '#8f7bff', '#ffd0ff', '#a05fd0', '#b79aff', '#f0e0ff']
  };

  // === Simplex-ish Noise (轻量伪 Perlin，够快够美) ===
  const noise = (function () {
    const perm = new Uint8Array(512);
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let seedVal = 1337;
    const rand = () => (seedVal = (seedVal * 16807) % 2147483647) / 2147483647;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y) => {
      const g = h & 3;
      const u = g < 2 ? x : y;
      const v = g < 2 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
    };
    return function (x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = perm[X] + Y, b = perm[X + 1] + Y;
      return lerp(
        lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
        lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u),
        v
      ) * 0.5;
    };
  })();

  // === Canvas Resize ===
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = frame.getBoundingClientRect();
    state.W = rect.width;
    state.H = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.globalCompositeOperation = 'source-over';
  }
  window.addEventListener('resize', resize);

  // === Pigment Factory ===
  function spawnPigment(x, y, opts) {
    if (pigments.length >= MAX_PIGMENTS) pigments.shift();
    const palette = THEMES[state.theme];
    pigments.push({
      x, y,
      vx: (opts && opts.vx) || 0,
      vy: (opts && opts.vy) || 0,
      r: (opts && opts.r) || state.brush * (0.5 + Math.random() * 0.9),
      hue: palette[Math.floor(Math.random() * palette.length)],
      phase: Math.random() * Math.PI * 2,   // 呼吸相位
      breath: 0.75 + Math.random() * 0.5,   // 呼吸幅度
      alpha: 0.35 + Math.random() * 0.3,
      born: state.time,
      life: -1                              // -1 = 永生
    });
    if (emptyHint && !emptyHint.classList.contains('hidden')) {
      emptyHint.classList.add('hidden');
    }
  }

  // === Brush Stroke ===
  function strokeTo(x, y) {
    const dx = x - pointer.px, dy = y - pointer.py;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / (state.brush * 0.35)));
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      const bx = pointer.px + dx * t;
      const by = pointer.py + dy * t;
      const count = 2;
      for (let k = 0; k < count; k++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * state.brush * 0.8;
        spawnPigment(bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad, {
          vx: dx * 0.02 + (Math.random() - 0.5),
          vy: dy * 0.02 + (Math.random() - 0.5)
        });
      }
    }
  }

  // === Shockwave ===
  function shockwave(x, y) {
    waves.push({ x, y, r: 4, max: Math.max(state.W, state.H) * 0.55, alpha: 0.6 });
    for (const pg of pigments) {
      const dx = pg.x - x, dy = pg.y - y;
      const d = Math.hypot(dx, dy) || 1;
      const force = 26 * Math.exp(-d / 220);
      pg.vx += (dx / d) * force;
      pg.vy += (dy / d) * force;
    }
  }

  // === Random Seed Painting ===
  function seedPainting() {
    const palette = THEMES[state.theme];
    const n = 380;
    const cx = state.W * (0.3 + Math.random() * 0.4);
    const cy = state.H * (0.3 + Math.random() * 0.4);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.pow(Math.random(), 1.6) * Math.min(state.W, state.H) * 0.42;
      spawnPigment(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.8, {
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        r: state.brush * (0.4 + Math.random() * 1.4)
      });
    }
    shockwave(cx, cy);
    toast('随机播种 · ' + n + ' pigment cells');
    void palette;
  }

  // === Physics Update ===
  function updatePigments(dt) {
    const t = state.time;
    const speed = state.life * 60 * dt;
    const cursorForce = 90 * dt;
    let alive = 0;

    for (let i = pigments.length - 1; i >= 0; i--) {
      const pg = pigments[i];
      alive++;

      if (state.mode !== 'freeze' && (state.drift || state.painting)) {
        const s = 0.0022;
        if (state.mode === 'flow') {
          const a = noise(pg.x * s, pg.y * s + t * 0.12) * Math.PI * 2.4;
          pg.vx += Math.cos(a) * speed * 0.14;
          pg.vy += Math.sin(a) * speed * 0.14;
        } else if (state.mode === 'swirl') {
          const dx = pg.x - state.W / 2, dy = pg.y - state.H / 2;
          const d = Math.hypot(dx, dy) || 1;
          const tang = 0.16 * speed;
          const pull = 0.012 * speed;
          pg.vx += (-dy / d) * tang - (dx / d) * pull;
          pg.vy += (dx / d) * tang - (dy / d) * pull;
        } else if (state.mode === 'pulse') {
          const pulse = Math.sin(t * 2.2 + pg.phase) * speed * 0.09;
          const a = noise(pg.x * s, pg.y * s) * Math.PI * 2;
          pg.vx += Math.cos(a) * pulse;
          pg.vy += Math.sin(a) * pulse;
        }
      }

      // 光标力场（光标移动越快，推力越强）
      const pdx = pg.x - pointer.x, pdy = pg.y - pointer.y;
      const pd = Math.hypot(pdx, pdy);
      if (pd < 130 && pd > 0.01) {
        const pv = Math.hypot(pointer.vx, pointer.vy);
        const f = (0.6 + Math.min(pv * 0.05, 2.2)) * cursorForce * (1 - pd / 130);
        pg.vx += (pdx / pd) * f;
        pg.vy += (pdy / pd) * f;
      }

      // 阻尼 + 位移
      const damp = Math.pow(0.965, dt * 60);
      pg.vx *= damp;
      pg.vy *= damp;
      pg.x += pg.vx * dt * 60 * 0.55;
      pg.y += pg.vy * dt * 60 * 0.55;

      // 边界柔性环绕
      if (pg.x < -30) pg.x = state.W + 30;
      if (pg.x > state.W + 30) pg.x = -30;
      if (pg.y < -30) pg.y = state.H + 30;
      if (pg.y > state.H + 30) pg.y = -30;
    }

    // 计数 HUD
    blobCounter.textContent = String(alive).padStart(4, '0') + ' pigments';
  }

  // === Render ===
  function render() {
    // 拖尾余韵：用半透明擦除代替 clearRect
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (1 - state.trail) * 0.9 + ')';
    ctx.fillRect(0, 0, state.W, state.H);
    // 抵消暗化：screen 混合绘制发光颜料
    ctx.globalCompositeOperation = 'screen';

    const t = state.time;
    for (const pg of pigments) {
      const breathe = 1 + Math.sin(t * 1.6 + pg.phase) * 0.18 * pg.breath;
      const r = pg.r * breathe;
      const grad = ctx.createRadialGradient(pg.x, pg.y, 0, pg.x, pg.y, r);
      grad.addColorStop(0, hexA(pg.hue, pg.alpha));
      grad.addColorStop(0.55, hexA(pg.hue, pg.alpha * 0.45));
      grad.addColorStop(1, hexA(pg.hue, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pg.x, pg.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 冲击波环
    ctx.globalCompositeOperation = 'screen';
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.r += (w.max - w.r) * 0.045 + 1.6;
      w.alpha *= 0.965;
      if (w.alpha < 0.01) { waves.splice(i, 1); continue; }
      ctx.strokeStyle = hexA(accentColor(), w.alpha);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function accentColor() {
    return THEMES[state.theme][0];
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // === Main Loop ===
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    state.time += dt;
    pointer.vx = pointer.x - pointer.px;
    pointer.vy = pointer.y - pointer.py;
    updatePigments(dt);
    render();
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    requestAnimationFrame(loop);
  }

  // === Pointer Events ===
  function localPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const p = localPos(e);
    pointer.x = p.x; pointer.y = p.y; pointer.px = p.x; pointer.py = p.y;
    if (e.detail === 1 && !e.shiftKey) {
      state.painting = true;
      strokeTo(p.x + 0.01, p.y + 0.01);
      pointer.px = p.x; pointer.py = p.y;
    }
    shockwave(p.x, p.y);
  });
  frame.addEventListener('pointermove', (e) => {
    const p = localPos(e);
    pointer.x = p.x; pointer.y = p.y;
    if (state.painting) strokeTo(p.x, p.y), pointer.px = p.x, pointer.py = p.y;
  });
  window.addEventListener('pointerup', () => { state.painting = false; });
  frame.addEventListener('pointerleave', () => {
    pointer.x = -9999; pointer.y = -9999; state.painting = false;
  });

  // === Console Interactions ===
  themeRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.theme-chip');
    if (!chip) return;
    themeRow.querySelectorAll('.theme-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.theme = chip.dataset.theme;
    document.body.dataset.theme = state.theme;
    toast('氛围切换 · ' + chip.title);
  });

  modeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    modeGrid.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    hudMode.textContent = 'MODE // ' + state.mode.toUpperCase();
    updateHudFlow();
  });

  function updateHudFlow() {
    hudFlow.textContent = 'FLOW ' + state.life.toFixed(2) + ' · DRIFT ' + (state.drift ? 'ON' : 'OFF');
  }

  sliderLife.addEventListener('input', () => {
    state.life = sliderLife.value / 100;
    valLife.textContent = state.life.toFixed(2);
    updateHudFlow();
  });
  sliderBrush.addEventListener('input', () => {
    state.brush = +sliderBrush.value;
    valBrush.textContent = state.brush;
  });
  sliderTrail.addEventListener('input', () => {
    state.trail = sliderTrail.value / 100;
    valTrail.textContent = state.trail.toFixed(2);
  });
  checkDrift.addEventListener('change', () => {
    state.drift = checkDrift.checked;
    updateHudFlow();
  });

  btnPulse.addEventListener('click', () => {
    shockwave(state.W / 2, state.H / 2);
    toast('全场脉冲 · SHOCKWAVE');
  });
  btnClear.addEventListener('click', () => {
    pigments.length = 0;
    waves.length = 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, state.W, state.H);
    emptyHint.classList.remove('hidden');
    toast('画布已清空');
  });
  btnSeed.addEventListener('click', seedPainting);
  btnExport.addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext('2d');
    octx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-deep').trim() || '#050d12';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.download = 'living-painting-' + Date.now() + '.png';
    a.href = out.toDataURL('image/png');
    a.click();
    toast('已导出 PNG');
  });

  // === Toast ===
  let toastTimer = null;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // === Keyboard Shortcuts ===
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const map = { '1': 'flow', '2': 'swirl', '3': 'pulse', '4': 'freeze' };
    if (map[e.key]) modeGrid.querySelector('[data-mode="' + map[e.key] + '"]').click();
    if (e.key === 'c' || e.key === 'C') btnClear.click();
    if (e.key === ' ') { e.preventDefault(); btnPulse.click(); }
  });

  // === Boot ===
  resize();
  seedPainting();
  updateHudFlow();
  requestAnimationFrame(loop);
})();
