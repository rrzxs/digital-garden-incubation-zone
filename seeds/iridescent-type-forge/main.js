/* ═══════════════════════════════════════════════════════════
   Iridescent Type Forge · 虹彩字形锻造炉
   弹簧-阻尼物理字形 × 虹彩着色 × 力场交互 × 冲击波 × 粒子流场
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const input = document.getElementById('text-input');
  const sheenRow = document.getElementById('sheen-row');
  const forceRow = document.getElementById('force-row');
  const moodRow = document.getElementById('mood-row');
  const pulseBtn = document.getElementById('pulse-btn');
  const sliderRadius = document.getElementById('slider-radius');
  const sliderStiff = document.getElementById('slider-stiff');
  const sliderIrid = document.getElementById('slider-irid');
  const readoutRadius = document.getElementById('readout-radius');
  const readoutStiff = document.getElementById('readout-stiff');
  const readoutIrid = document.getElementById('readout-irid');
  const statGlyphs = document.getElementById('stat-glyphs');
  const statFps = document.getElementById('stat-fps');
  const statWaves = document.getElementById('stat-waves');
  const statCursor = document.getElementById('stat-cursor');
  const statusText = document.getElementById('status-text');
  const hudTitle = document.getElementById('hud-title');

  // === State ===
  const state = {
    sheen: 'holo',
    force: 'repel',
    mood: 'aurora',
    radius: 200,
    stiffness: 120,
    iridSpeed: 100,
    time: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  };

  const moods = {
    aurora:  { h1: 152, h2: 265, h3: 198, particle: [160, 220, 280] },
    ember:   { h1: 8,   h2: 38,  h3: 330, particle: [5, 30, 345] },
    abyss:   { h1: 185, h2: 210, h3: 160, particle: [170, 200, 150] },
    orchid:  { h1: 285, h2: 320, h3: 240, particle: [280, 315, 250] }
  };

  const SCRAMBLE = '!<>-_\\/[]{}—=+*^?#________';

  // === Canvas Sizing ===
  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * state.dpr;
    canvas.height = H * state.dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    layoutGlyphs();
  }

  // === Value Noise Flow Field ===
  function hashNoise(x, y, t) {
    const s = Math.sin(x * 127.1 + y * 311.7 + t * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function flowAngle(x, y, t) {
    const n1 = hashNoise(x * 0.0016, y * 0.0016, t * 0.12);
    const n2 = hashNoise(x * 0.0016 + 5.2, y * 0.0016 + 1.3, t * 0.12);
    return (n1 + n2) * Math.PI;
  }

  // === Glyph Entities (弹簧-阻尼物理) ===
  let glyphs = [];

  function makeGlyph(ch, homeX, homeY, index, total) {
    return {
      ch,
      homeX, homeY,
      x: homeX + (Math.random() - 0.5) * W * 0.6,
      y: homeY + (Math.random() - 0.5) * H * 0.6,
      vx: 0, vy: 0,
      rot: (Math.random() - 0.5) * 2,
      vr: 0,
      targetRot: 0,
      scale: 1,
      pulse: 0,
      seed: Math.random() * 1000,
      scrambleLeft: 14 + Math.floor(index * 1.6),
      revealed: false,
      index, total
    };
  }

  function layoutGlyphs() {
    const text = input.value || ' ';
    const chars = [...text];
    const fontSize = Math.min(W * 0.6 / Math.max(chars.length, 1) * 1.6, Math.min(W * 0.16, 170));
    ctx.font = `800 ${fontSize}px Outfit, sans-serif`;
    const totalWidth = chars.reduce((sum, c) => sum + ctx.measureText(c).width * 0.94, 0);
    let cursorX = (W - 320 - totalWidth) / 2 + 40; // 为右侧控制台留白
    const baseY = H / 2;

    const old = glyphs;
    glyphs = chars.map((ch, i) => {
      const w = ctx.measureText(ch).width * 0.94;
      const gx = cursorX + w / 2;
      cursorX += w;
      const prev = old[i];
      if (prev && prev.ch === ch) {
        prev.homeX = gx; prev.homeY = baseY;
        return prev;
      }
      return makeGlyph(ch, gx, baseY, i, chars.length);
    });
    statGlyphs.textContent = String(glyphs.length).padStart(2, '0');
  }

  // === Particles 流场粒子 ===
  const particles = [];
  function spawnParticles() {
    const count = Math.min(Math.floor((W * H) / 16000), 110);
    while (particles.length < count) particles.push(newParticle());
    particles.length = count;
  }
  function newParticle() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: 0, vy: 0,
      life: Math.random() * 400,
      size: 0.6 + Math.random() * 1.8,
      huePick: Math.floor(Math.random() * 3)
    };
  }

  // === Shockwaves 冲击波 ===
  const waves = [];

  // === Cursor ===
  const cursor = { x: -9999, y: -9999, px: -9999, py: -9999, speed: 0 };

  canvas.addEventListener('pointermove', (e) => {
    cursor.x = e.clientX; cursor.y = e.clientY;
  });
  canvas.addEventListener('pointerleave', () => { cursor.x = -9999; cursor.y = -9999; });
  canvas.addEventListener('pointerdown', (e) => {
    waves.push({ x: e.clientX, y: e.clientY, t: 0 });
    statusText.textContent = `SHOCKWAVE @ ${e.clientX | 0},${e.clientY | 0} — 锻造晶格受激`;
  });

  // === Physics Update ===
  function updateGlyphs(dt) {
    const k = state.stiffness / 100;
    const damp = 0.88 - k * 0.02;
    const R = state.radius;
    const cx = cursor.x, cy = cursor.y;

    for (const g of glyphs) {
      // 乱码揭示
      if (g.scrambleLeft > 0) {
        g.scrambleLeft -= dt * 9;
        g.pulse = 1;
      } else if (!g.revealed) {
        g.revealed = true;
        g.pulse = 1.4;
        g.ch = g.ch; // lock
      }

      // 弹簧-阻尼归位
      let ax = (g.homeX - g.x) * k;
      let ay = (g.homeY - g.y) * k;

      // 光标力场
      const dx = g.x - cx, dy = g.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < R && dist > 0.001) {
        const falloff = 1 - dist / R;
        const f = falloff * falloff * 26;
        if (state.force === 'repel') {
          ax += (dx / dist) * f; ay += (dy / dist) * f;
        } else if (state.force === 'attract') {
          ax -= (dx / dist) * f * 0.7; ay -= (dy / dist) * f * 0.7;
        } else { // vortex
          ax += (-dy / dist) * f + (dx / dist) * f * 0.25;
          ay += (dx / dist) * f + (dy / dist) * f * 0.25;
        }
        g.targetRot = Math.atan2(dy, dx) * 0.3 * falloff;
      } else {
        g.targetRot *= 0.95;
      }

      // 冲击波
      for (const wv of waves) {
        const wr = wv.t * 420;
        const wd = Math.hypot(g.x - wv.x, g.y - wv.y);
        const band = Math.abs(wd - wr);
        if (band < 60 && wv.t < 1.6) {
          const f = (1 - band / 60) * (1 - wv.t / 1.6) * 30;
          const d = Math.max(wd, 1);
          ax += ((g.x - wv.x) / d) * f;
          ay += ((g.y - wv.y) / d) * f;
          g.pulse = Math.max(g.pulse, f * 0.05);
        }
      }

      g.vx = (g.vx + ax * dt) * damp;
      g.vy = (g.vy + ay * dt) * damp;
      g.x += g.vx * dt * 8;
      g.y += g.vy * dt * 8;

      // 旋转与脉冲衰减
      g.vr += (g.targetRot - g.rot) * 0.18;
      g.vr *= 0.82;
      g.rot += g.vr * dt * 10;
      g.pulse *= Math.pow(0.92, dt * 60);
    }

    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].t += dt;
      if (waves[i].t > 1.8) waves.splice(i, 1);
    }
    statWaves.textContent = String(waves.length).padStart(2, '0');
  }

  // === Iridescent Renderers 虹彩着色 ===
  function glyphFontSize() {
    const chars = glyphs.length || 1;
    return Math.min((W - 380) / chars * 1.62, Math.min(W * 0.15, 165));
  }

  function drawGlyph(g, fontSize) {
    const m = moods[state.mood];
    const t = state.time * state.iridSpeed / 100;
    const ang = (g.x + g.y) * 0.012 + t * 0.7 + g.seed * 0.01;
    const grad = ctx.createLinearGradient(-fontSize * 0.6, -fontSize * 0.6, fontSize * 0.6, fontSize * 0.6);

    const displayCh = g.scrambleLeft > 0
      ? SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]
      : g.ch;

    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);
    const s = 1 + g.pulse * 0.4;
    ctx.scale(s, s);
    ctx.font = `800 ${fontSize}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const hueBase = (ang * 57.3) % 360;

    if (state.sheen === 'holo') {
      grad.addColorStop(0, `hsl(${(hueBase + m.h1) % 360}, 95%, 72%)`);
      grad.addColorStop(0.35, `hsl(${(hueBase + m.h2) % 360}, 92%, 66%)`);
      grad.addColorStop(0.7, `hsl(${(hueBase + m.h3) % 360}, 95%, 70%)`);
      grad.addColorStop(1, `hsl(${(hueBase + m.h1 + 60) % 360}, 90%, 74%)`);
      ctx.fillStyle = grad;
      ctx.fillText(displayCh, 0, 0);
      // 高光扫过
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 2 + g.seed);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(displayCh, -2, -2);
      ctx.globalAlpha = 1;
    } else if (state.sheen === 'prism') {
      ctx.globalCompositeOperation = 'lighter';
      const off = 3 + 2.5 * Math.sin(t + g.seed);
      ctx.fillStyle = 'rgba(255,60,90,0.55)';
      ctx.fillText(displayCh, -off, 0);
      ctx.fillStyle = 'rgba(60,255,160,0.55)';
      ctx.fillText(displayCh, off, 0);
      ctx.fillStyle = 'rgba(90,120,255,0.55)';
      ctx.fillText(displayCh, 0, off * 0.6);
      ctx.globalCompositeOperation = 'source-over';
    } else if (state.sheen === 'chrome') {
      const shift = 0.5 + 0.5 * Math.sin(t * 1.4 + g.seed);
      grad.addColorStop(Math.max(0, shift - 0.45), 'hsl(210, 15%, 28%)');
      grad.addColorStop(shift, 'hsl(0, 0%, 96%)');
      grad.addColorStop(Math.min(1, shift + 0.45), 'hsl(230, 20%, 22%)');
      ctx.fillStyle = grad;
      ctx.fillText(displayCh, 0, 0);
      ctx.strokeStyle = `hsla(${(hueBase + m.h2) % 360}, 90%, 70%, 0.5)`;
      ctx.lineWidth = 1;
      ctx.strokeText(displayCh, 0, 0);
    } else { // oil 油膜
      for (let i = 0; i < 6; i++) {
        const f = i / 5;
        grad.addColorStop(f, `hsla(${(hueBase + f * 220 + m.h3) % 360}, 90%, ${58 + 12 * Math.sin(t + f * 6)}%, ${0.85 - f * 0.2})`);
      }
      ctx.fillStyle = grad;
      ctx.fillText(displayCh, 0, 0);
    }

    // 冲击波时的发光残影
    if (g.pulse > 0.05) {
      ctx.globalAlpha = g.pulse * 0.3;
      ctx.shadowColor = `hsl(${(hueBase + m.h2) % 360}, 95%, 65%)`;
      ctx.shadowBlur = 24 * g.pulse;
      ctx.fillStyle = grad;
      ctx.fillText(displayCh, 0, 0);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // === Particle Update & Draw ===
  function updateParticles(dt) {
    const m = moods[state.mood];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const a = flowAngle(p.x, p.y, state.time);
      p.vx += Math.cos(a) * 8 * dt;
      p.vy += Math.sin(a) * 8 * dt;

      // 光标微扰
      const dx = p.x - cursor.x, dy = p.y - cursor.y;
      const d = Math.hypot(dx, dy);
      if (d < 150 && d > 1) {
        p.vx += (dx / d) * 40 * dt * (1 - d / 150);
        p.vy += (dy / d) * 40 * dt * (1 - d / 150);
      }

      p.vx *= 0.96; p.vy *= 0.96;
      p.x += p.vx * dt * 14;
      p.y += p.vy * dt * 14;
      p.life -= dt;

      if (p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
        Object.assign(p, newParticle());
        continue;
      }
      const alpha = Math.min(p.life / 60, 0.5);
      ctx.fillStyle = `hsla(${m.particle[p.huePick]}, 80%, 68%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // === Shockwave Rings 绘制 ===
  function drawWaves() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const m = moods[state.mood];
    for (const wv of waves) {
      const r = wv.t * 420;
      const alpha = Math.max(0, (1 - wv.t / 1.8)) * 0.5;
      const grad = ctx.createRadialGradient(wv.x, wv.y, r * 0.92, wv.x, wv.y, r);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.85, `hsla(${m.h2}, 90%, 70%, ${alpha})`);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = `hsla(${m.h1}, 90%, 72%, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // === Main Loop ===
  let lastTime = performance.now();
  let fpsAccum = 0, fpsFrames = 0;

  function loop(now) {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = Math.min(rawDt, 0.05);
    state.time += dt;

    // FPS
    fpsAccum += rawDt; fpsFrames++;
    if (fpsAccum > 0.5) {
      statFps.textContent = String(Math.round(fpsFrames / fpsAccum)).padStart(2, '0');
      fpsAccum = 0; fpsFrames = 0;
    }

    // 光标速度
    if (cursor.px > -9000) {
      const sp = Math.hypot(cursor.x - cursor.px, cursor.y - cursor.py) / Math.max(rawDt, 0.001);
      cursor.speed += (Math.min(sp, 5000) - cursor.speed) * 0.12;
      statCursor.textContent = (cursor.speed / 1000).toFixed(2);
    }
    cursor.px = cursor.x; cursor.py = cursor.y;

    ctx.clearRect(0, 0, W, H);
    updateParticles(dt);
    drawWaves();
    updateGlyphs(dt);
    const fs = glyphFontSize();
    for (const g of glyphs) drawGlyph(g, fs);

    requestAnimationFrame(loop);
  }

  // === Interactions ===
  function bindChipRow(row, attr, callback) {
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset[attr]);
    });
  }

  bindChipRow(sheenRow, 'sheen', (v) => {
    state.sheen = v;
    statusText.textContent = `SHEEN → ${v.toUpperCase()} — 虹彩着色器已切换`;
  });
  bindChipRow(forceRow, 'force', (v) => {
    state.force = v;
    statusText.textContent = `FORCE → ${v.toUpperCase()} — 力场发生器已切换`;
  });
  bindChipRow(moodRow, 'mood', (v) => {
    state.mood = v;
    document.body.dataset.mood = v;
    statusText.textContent = `MOOD → ${v.toUpperCase()} — 氛围已重调`;
  });

  input.addEventListener('input', () => {
    layoutGlyphs();
    statusText.textContent = `REFORGE — 锻造「${input.value.toUpperCase() || '…'}」`;
  });

  pulseBtn.addEventListener('click', () => {
    waves.push({ x: W / 2 - 140, y: H / 2, t: 0 });
    waves.push({ x: W / 2 - 140, y: H / 2, t: -0.15 });
    for (const g of glyphs) g.pulse = Math.max(g.pulse, 1.2);
    statusText.textContent = '⌁ FULL PULSE — 全场共振脉冲已发射';
  });

  sliderRadius.addEventListener('input', () => {
    state.radius = +sliderRadius.value;
    readoutRadius.textContent = sliderRadius.value;
  });
  sliderStiff.addEventListener('input', () => {
    state.stiffness = +sliderStiff.value;
    readoutStiff.textContent = sliderStiff.value;
  });
  sliderIrid.addEventListener('input', () => {
    state.iridSpeed = +sliderIrid.value;
    readoutIrid.textContent = sliderIrid.value;
  });

  window.addEventListener('resize', () => { resize(); spawnParticles(); });

  // === Boot Sequence 开机乱码揭示 ===
  function bootScramble() {
    const target = 'IRIDESCENT TYPE FORGE';
    let frame = 0;
    const tick = () => {
      frame++;
      hudTitle.textContent = [...target].map((c, i) =>
        frame > i * 2 + 6 ? c : SCRAMBLE[Math.floor(Math.random() * 20)]
      ).join('');
      if (frame < target.length * 2 + 10) setTimeout(tick, 42);
    };
    tick();
  }

  // === Init ===
  resize();
  spawnParticles();
  bootScramble();
  requestAnimationFrame(loop);
})();
