/* ============================================================
   Glyph Forge 字符锻造炉 — 交互逻辑
   免构建 · Vanilla JS · 单 rAF 循环
   ============================================================ */
(() => {
  'use strict';

  // === DOM Elements ===
  const body = document.body;
  const forgeCanvas = document.getElementById('forge-canvas');
  const ambientCanvas = document.getElementById('ambient-canvas');
  const fxCtx = forgeCanvas.getContext('2d');
  const abCtx = ambientCanvas.getContext('2d');
  const panel = document.getElementById('anvil-panel');
  const input = document.getElementById('ingot-input');
  const btnForge = document.getElementById('btn-forge');
  const btnQuench = document.getElementById('btn-quench-all');
  const btnReset = document.getElementById('btn-reset');
  const heatRange = document.getElementById('heat-range');
  const hudTemp = document.getElementById('hud-temp');
  const hudStrikes = document.getElementById('hud-strikes');
  const hudGlyphs = document.getElementById('hud-glyphs');
  const hint = document.getElementById('anvil-hint');
  const titleEl = document.getElementById('title-scramble');

  // === Palettes ===
  const PALETTES = {
    ember:    { c1: '#ff6b35', c2: '#f7b733', cool: '#ffd9be', deep: '#d94f2b' },
    azure:    { c1: '#4facfe', c2: '#7ee8fa', cool: '#cfeaff', deep: '#2b6cb0' },
    verdant:  { c1: '#43e97b', c2: '#a8e063', cool: '#d4ffd9', deep: '#1f8a4c' },
    amethyst: { c1: '#c471ed', c2: '#f7797d', cool: '#f0ddff', deep: '#7b2ff7' }
  };
  let palette = PALETTES.ember;

  // === State ===
  const state = {
    hammer: 'stamp',        // stamp | shatter | orbit
    heat: 0.62,
    strikes: 0,
    furnaceTemp: 1200,
    cursor: { x: -9999, y: -9999, inside: false, down: false },
    time: 0
  };

  // === Simulation Entities ===
  const glyphs = [];   // forged characters
  const embers = [];   // forge canvas sparks
  const motes = [];    // ambient background particles
  const ripples = [];  // quench rings

  // === Canvas Sizing ===
  let FW = 0, FH = 0, AW = 0, AH = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const fr = forgeCanvas.getBoundingClientRect();
    FW = fr.width; FH = fr.height;
    forgeCanvas.width = FW * DPR; forgeCanvas.height = FH * DPR;
    fxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    AW = innerWidth; AH = innerHeight;
    ambientCanvas.width = AW * DPR; ambientCanvas.height = AH * DPR;
    abCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutSlots();
    seedMotes();
  }

  // === Utility: spring-damper step ===
  function springTo(current, target, vel, stiffness, damping, dt) {
    const force = (target - current) * stiffness;
    vel += force * dt;
    vel *= Math.pow(damping, dt * 60);
    return [current + vel * dt, vel];
  }

  // === Glyph Slots (anvil line) ===
  function slotPosition(i) {
    const n = Math.max(glyphs.length, 1);
    const usable = FW - 120;
    const spacing = Math.min(84, usable / n);
    const total = spacing * n;
    const x = (FW - total) / 2 + spacing * i + spacing / 2;
    return { x, y: FH * 0.55 };
  }
  function layoutSlots() {
    glyphs.forEach((g, i) => { g.slot = slotPosition(i); });
  }

  // === Forging ===
  function forgeText(text) {
    const chars = [...text].filter(c => c.trim().length);
    if (!chars.length) return;
    const delayStep = Math.min(160, 900 / chars.length);
    chars.forEach((ch, i) => setTimeout(() => forgeChar(ch), i * delayStep));
    strikeBtnPulse();
    input.value = '';
    input.focus();
  }

  function forgeChar(ch) {
    if (glyphs.length >= 24) glyphs.shift();
    const slot = slotPosition(glyphs.length);
    glyphs.push({
      ch,
      x: slot.x + (Math.random() - 0.5) * FW * 0.5,
      y: -80,
      vx: 0, vy: 0,
      scale: 0.2, scaleV: 0,
      rot: (Math.random() - 0.5) * 1.6, rotV: 0,
      heat: 1,
      slot,
      forged: false,
      offsetTheta: Math.random() * Math.PI * 2  // orbit phase
    });
    layoutSlots();
    state.strikes++;
    state.furnaceTemp = Math.min(1600, state.furnaceTemp + 40);
    bumpHud(hudStrikes, state.strikes);
    burstEmbers(slot.x, slot.y, 26, 1);
  }

  // === Hammer Behaviors ===
  function hammerStrike(g) {
    if (state.hammer === 'stamp') {
      g.scaleV -= 9;                       // slam bounce
      g.vy += 3;
    } else if (state.hammer === 'shatter') {
      g.scale = 1.6; g.scaleV = -4;
      g.vx += (Math.random() - 0.5) * 900;
      g.vy -= 200 + Math.random() * 400;
      g.rotV += (Math.random() - 0.5) * 14;
      g.heat = Math.min(1, g.heat + 0.5);
    } else { // orbit
      g.heat = 1;
    }
  }

  // === Embers ===
  function burstEmbers(x, y, count, energy) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (40 + Math.random() * 240) * energy;
      embers.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 1, decay: 0.5 + Math.random() * 1.2,
        r: 1 + Math.random() * 2.6
      });
    }
  }

  // === Quench ===
  function quenchAt(x, y) {
    ripples.push({ x, y, r: 6, life: 1 });
    glyphs.forEach(g => {
      const d = Math.hypot(g.x - x, g.y - y);
      if (d < 220) {
        g.heat = Math.max(0, g.heat - (1 - d / 220) * 0.9);
        g.vy -= (1 - d / 220) * 120;
      }
    });
    for (let i = 0; i < 14; i++) {
      embers.push({
        x: x + (Math.random() - 0.5) * 40, y,
        vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 80,
        life: 1, decay: 0.9, r: 2 + Math.random() * 3, steam: true
      });
    }
  }

  // === Color by heat ===
  function heatColor(h) {
    if (h > 0.35) {
      return mix(palette.cool, palette.c2, (h - 0.35) / 0.65);
    }
    return palette.cool;
  }
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const pa = hexToRgb(a), pb = hexToRgb(b);
    return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
  }
  const rgbCache = {};
  function hexToRgb(h) {
    if (rgbCache[h]) return rgbCache[h];
    const v = parseInt(h.slice(1), 16);
    return (rgbCache[h] = [(v >> 16) & 255, (v >> 8) & 255, v & 255]);
  }

  // === Main Loop ===
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    state.time += dt;
    update(dt);
    drawForge();
    drawAmbient(dt);
    requestAnimationFrame(loop);
  }

  function update(dt) {
    const cursor = state.cursor;

    // furnace drift
    const target = 800 + state.heat * 800;
    state.furnaceTemp += (target - state.furnaceTemp) * Math.min(1, dt * 0.8) - dt * 4;
    hudTemp.textContent = Math.round(Math.max(state.furnaceTemp, 0));

    // glyphs physics
    glyphs.forEach(g => {
      // cursor heat field
      if (cursor.inside) {
        const dx = g.x - cursor.x, dy = g.y - cursor.y;
        const d = Math.hypot(dx, dy);
        if (d < 160 && d > 0.01) {
          g.heat = Math.min(1, g.heat + (1 - d / 160) * dt * 0.8);
          if (state.hammer === 'orbit' && g.heat > 0.5) {
            // orbital attraction while hot
            const pull = 260 * dt * (1 - d / 160);
            g.vx += (dx / d) * pull * 0.3;
            g.vy += (dy / d) * pull * 0.3;
          }
        }
      }

      let tx = g.slot.x, ty = g.slot.y;
      if (state.hammer === 'orbit' && g.heat > 0.55 && cursor.inside) {
        const orbR = 110;
        g.offsetTheta += dt * 2.4;
        tx = cursor.x + Math.cos(g.offsetTheta) * orbR;
        ty = cursor.y + Math.sin(g.offsetTheta) * orbR * 0.6;
      }

      [g.x, g.vx] = springTo(g.x, tx, g.vx, 90, 0.86, dt);
      [g.y, g.vy] = springTo(g.y, ty, g.vy, 90, 0.86, dt);
      [g.scale, g.scaleV] = springTo(g.scale, 1, g.scaleV, 120, 0.8, dt);
      [g.rot, g.rotV] = springTo(g.rot, 0, g.rotV, 60, 0.85, dt);

      if (!g.forged && Math.abs(g.y - ty) < 6 && Math.abs(g.vy) < 40) {
        g.forged = true;
        hammerStrike(g);
        burstEmbers(g.x, g.y, 14, 0.7);
      }

      // natural cooling
      g.heat = Math.max(0, g.heat - dt * 0.12);
    });

    // embers
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.vy += (e.steam ? -20 : 160) * dt;
      e.vx *= 0.98;
      e.life -= dt * e.decay;
      if (e.life <= 0) embers.splice(i, 1);
    }

    // ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 340 * dt;
      r.life -= dt * 1.6;
      if (r.life <= 0) ripples.splice(i, 1);
    }
  }

  // === Draw: Forge Canvas ===
  function drawForge() {
    fxCtx.clearRect(0, 0, FW, FH);

    // anvil glow bed
    const bedY = FH * 0.55;
    const grad = fxCtx.createLinearGradient(0, bedY - 40, 0, bedY + 90);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, hexA(palette.c1, 0.14));
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    fxCtx.fillStyle = grad;
    fxCtx.fillRect(0, bedY - 40, FW, 130);

    // anvil rule line
    fxCtx.strokeStyle = hexA(palette.c1, 0.28);
    fxCtx.lineWidth = 1;
    fxCtx.beginPath();
    fxCtx.moveTo(40, bedY);
    fxCtx.lineTo(FW - 40, bedY);
    fxCtx.stroke();

    // ripples
    ripples.forEach(r => {
      fxCtx.strokeStyle = hexA(palette.c2, r.life * 0.5);
      fxCtx.lineWidth = 2;
      fxCtx.beginPath();
      fxCtx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      fxCtx.stroke();
    });

    // glyphs
    fxCtx.textAlign = 'center';
    fxCtx.textBaseline = 'middle';
    glyphs.forEach(g => {
      const size = 46 * g.scale;
      fxCtx.save();
      fxCtx.translate(g.x, g.y);
      fxCtx.rotate(g.rot);
      fxCtx.font = `600 ${size}px Outfit, Inter, sans-serif`;

      // heat glow
      if (g.heat > 0.05) {
        fxCtx.shadowColor = hexA(g.heat > 0.6 ? palette.c2 : palette.c1, g.heat * 0.9);
        fxCtx.shadowBlur = 10 + g.heat * 34;
      }
      fxCtx.fillStyle = heatColor(g.heat);
      fxCtx.fillText(g.ch, 0, 0);
      fxCtx.restore();

      // drips while molten
      if (g.heat > 0.7 && Math.random() < 0.05) {
        embers.push({
          x: g.x + (Math.random() - 0.5) * 20, y: g.y + 16,
          vx: (Math.random() - 0.5) * 30, vy: 30,
          life: 0.8, decay: 1.6, r: 1.5
        });
      }
    });

    // embers
    embers.forEach(e => {
      fxCtx.beginPath();
      fxCtx.fillStyle = e.steam
        ? hexA(palette.cool, e.life * 0.35)
        : hexA(e.life > 0.5 ? palette.c2 : palette.c1, e.life);
      fxCtx.arc(e.x, e.y, e.r * (e.steam ? 2 : 1), 0, Math.PI * 2);
      fxCtx.fill();
    });

    hudGlyphs.textContent = glyphs.length;
  }

  function hexA(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
  }

  // === Ambient Motes (background) ===
  function seedMotes() {
    motes.length = 0;
    const n = Math.floor((AW * AH) / 22000);
    for (let i = 0; i < n; i++) {
      motes.push({
        x: Math.random() * AW, y: Math.random() * AH,
        r: 0.6 + Math.random() * 1.8,
        sp: 4 + Math.random() * 14,
        ph: Math.random() * Math.PI * 2
      });
    }
  }
  function drawAmbient(dt) {
    abCtx.clearRect(0, 0, AW, AH);
    motes.forEach(m => {
      m.y -= m.sp * dt;
      m.x += Math.sin(state.time * 0.6 + m.ph) * 0.2;
      if (m.y < -4) { m.y = AH + 4; m.x = Math.random() * AW; }
      abCtx.fillStyle = hexA(palette.c2, 0.12 + 0.1 * Math.sin(state.time * 2 + m.ph));
      abCtx.beginPath();
      abCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      abCtx.fill();
    });
  }

  // === HUD ===
  function bumpHud(el, val) {
    el.textContent = val;
    el.parentElement.classList.add('bump');
    setTimeout(() => el.parentElement.classList.remove('bump'), 320);
  }

  // === Title Scramble Reveal ===
  const SCRAMBLE = 'ΔΛΞΦΨΩ#%&@*+=';
  (function scrambleTitle() {
    const target = titleEl.dataset.text;
    let frame = 0;
    const total = 42;
    const tick = () => {
      frame++;
      const progress = frame / total;
      titleEl.textContent = [...target].map((c, i) => {
        if (c === ' ') return ' ';
        return (i / target.length < progress)
          ? c
          : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      }).join('');
      if (frame < total) requestAnimationFrame(tick);
      else titleEl.textContent = target;
    };
    requestAnimationFrame(tick);
  })();

  // === Events ===
  function panelPos(e) {
    const r = forgeCanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  panel.addEventListener('pointermove', (e) => {
    const p = panelPos(e);
    state.cursor.x = p.x; state.cursor.y = p.y; state.cursor.inside = true;
  });
  panel.addEventListener('pointerleave', () => { state.cursor.inside = false; });
  panel.addEventListener('pointerdown', (e) => {
    const p = panelPos(e);
    state.cursor.down = true;
    quenchAt(p.x, p.y);
    hint.textContent = 'QUENCHED · TEMPERED GLYPHS';
  });
  window.addEventListener('pointerup', () => { state.cursor.down = false; });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') forgeText(input.value);
  });
  btnForge.addEventListener('click', () => forgeText(input.value));
  btnQuench.addEventListener('click', () => {
    glyphs.forEach(g => { g.heat = 0; });
    ripples.push({ x: FW / 2, y: FH * 0.55, r: 10, life: 1 });
    state.furnaceTemp = 620;
    hint.textContent = 'FULL QUENCH · COLD STEEL';
  });
  btnReset.addEventListener('click', () => {
    glyphs.length = 0;
    state.strikes = 0;
    bumpHud(hudStrikes, 0);
    hint.textContent = 'TYPE TO FORGE · CLICK TO QUENCH';
  });

  // hammer mode
  document.getElementById('hammer-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hammer]');
    if (!btn) return;
    document.querySelectorAll('#hammer-group .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.hammer = btn.dataset.hammer;
    // re-strike existing glyphs with the new hammer feel
    glyphs.forEach(g => { g.forged = false; });
  });

  // palette
  document.getElementById('palette-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-palette]');
    if (!btn) return;
    document.querySelectorAll('#palette-group .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    body.dataset.palette = btn.dataset.palette;
    palette = PALETTES[btn.dataset.palette];
  });

  heatRange.addEventListener('input', () => {
    state.heat = heatRange.value / 100;
  });

  window.addEventListener('resize', resize);

  function strikeBtnPulse() {
    btnForge.classList.add('striking');
    setTimeout(() => btnForge.classList.remove('striking'), 260);
  }

  // === Boot ===
  resize();
  setTimeout(() => forgeText('GLYPH'), 700);
  requestAnimationFrame(loop);
})();
