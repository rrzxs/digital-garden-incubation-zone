/* ============================================================
   Blinds Light Studio — 百叶窗光影工作室
   弹簧-阻尼百叶窗物理 + 时间流转光照 + 光柱尘埃粒子
   Vanilla JS · 免构建
   ============================================================ */

(function () {
  'use strict';

  // === DOM Elements ===
  const stageEl = document.getElementById('stage');
  const canvas = document.getElementById('scene-canvas');
  const ctx = canvas.getContext('2d');
  const hudTilt = document.getElementById('hud-tilt');
  const hudAperture = document.getElementById('hud-aperture');
  const hudLux = document.getElementById('hud-lux');
  const hudTime = document.getElementById('hud-time');
  const tiltSlider = document.getElementById('tilt-slider');
  const timeSlider = document.getElementById('time-slider');
  const slatsSlider = document.getElementById('slats-slider');
  const tiltReadout = document.getElementById('tilt-readout');
  const timeReadout = document.getElementById('time-readout');
  const slatsReadout = document.getElementById('slats-readout');
  const snapBtn = document.getElementById('snap-btn');
  const breatheBtn = document.getElementById('breathe-btn');
  const themeBtn = document.getElementById('theme-btn');
  const hintEl = document.getElementById('stage-hint');
  const modeLabel = document.getElementById('mode-label');

  // === State ===
  const THEMES = ['aurora', 'ember', 'moss', 'rose'];
  const SKY_STOPS = {
    aurora: [[61, 90, 254], [124, 77, 255], [0, 184, 212]],
    ember:  [[255, 109, 61], [217, 55, 110], [255, 158, 79]],
    moss:   [[27, 138, 90], [124, 181, 24], [0, 194, 168]],
    rose:   [[199, 125, 255], [255, 93, 143], [255, 214, 224]]
  };

  const state = {
    themeIdx: 0,
    tiltTarget: 15,          // 目标倾角（度）
    slatCount: 14,
    time: 12,                // 0~24 小时
    breathe: false,
    breathePhase: 0,
    snappedOpen: false,
    pointer: { x: 0.5, y: 0.5, active: false },
    drag: null
  };

  let slats = [];            // 每片窗叶的物理状态
  let dust = [];
  let W = 0, H = 0, DPR = 1;

  // === Utilities ===
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const rgba = (c, alpha) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  // 一天中的光照：太阳高度 → 亮度 / 色温
  function daylight(t) {
    // 6 点日出 · 18 点日落，正午最高
    const solar = Math.sin(((t - 6) / 12) * Math.PI);
    const energy = clamp(solar, 0, 1);
    // 晨昏偏暖，正午偏白
    const warm = 1 - energy;
    return {
      energy,
      warm,
      sunX: clamp((t - 6) / 12, -0.2, 1.2),
      night: solar <= 0
    };
  }

  // === Slats physics ===
  function rebuildSlats() {
    const prev = slats;
    slats = [];
    for (let i = 0; i < state.slatCount; i++) {
      const old = prev[i];
      slats.push({
        angle: old ? old.angle : state.tiltTarget,
        vel: old ? old.vel : 0,
        // 级联滞后：越靠下的叶片响应越慢，产生波浪传递
        lag: 0.055 + (i / state.slatCount) * 0.16,
        stiffness: 150 + rand(-14, 14),
        phase: rand(0, Math.PI * 2)
      });
    }
    if (dust.length === 0) seedDust();
  }

  function seedDust() {
    dust = [];
    for (let i = 0; i < 90; i++) {
      dust.push({
        x: rand(0, 1), y: rand(0, 1),
        r: rand(0.6, 2.2),
        vx: rand(-0.012, 0.012),
        vy: rand(-0.028, -0.006),
        tw: rand(0, Math.PI * 2),
        twSpeed: rand(0.4, 1.6)
      });
    }
  }

  function stepSlats(dt) {
    // 呼吸模式：目标角随缓慢节律摆动
    let target = state.tiltTarget;
    if (state.breathe) {
      state.breathePhase += dt * 0.45;
      const breath = Math.sin(state.breathePhase) * 0.5 + 0.5;
      target = lerp(-32, 58, easeOutExpo(breath));
    }
    if (state.snappedOpen) target = 80;

    // 指针悬浮的轻扰：靠近的叶片被「气流」轻推
    const py = state.pointer.active ? state.pointer.y : -1;

    slats.forEach((s, i) => {
      let t = target;
      if (py >= 0) {
        const pos = (i + 0.5) / slats.length;
        const prox = Math.exp(-Math.pow((pos - py) * 4.2, 2));
        t += Math.sin(performance.now() * 0.002 + s.phase) * 7 * prox;
      }
      // 弹簧-阻尼积分
      const k = s.stiffness * (1 - s.lag * 0.6);
      const damp = 2 * Math.sqrt(s.stiffness) * 0.92;
      const force = (t - s.angle) * k - s.vel * damp;
      s.vel += force * dt;
      s.angle += s.vel * dt;
    });
  }

  // 平均开度：0 关闭 · 1 全开
  function aperture() {
    const avg = slats.reduce((sum, s) => sum + Math.abs(s.angle), 0) / (slats.length || 1);
    return clamp(avg / 80, 0, 1);
  }

  // === Rendering ===
  function skyColors() {
    const name = THEMES[state.themeIdx];
    const base = SKY_STOPS[name];
    const light = daylight(state.time);
    const dim = 0.22 + light.energy * 0.78;
    return base.map((c) => c.map((v) => v * dim));
  }

  function drawSky() {
    const cols = skyColors();
    const light = daylight(state.time);
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    const solar = 0.3 + light.energy * 0.7;
    g.addColorStop(0, rgba(cols[0], solar));
    g.addColorStop(0.55, rgba(cols[1], solar * 0.85));
    g.addColorStop(1, rgba(cols[2], solar * 0.7));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 夜间星野
    if (light.night) {
      ctx.save();
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5) % 100) / 100 * W;
        const sy = ((i * 73.7) % 100) / 100 * H * 0.7;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(performance.now() * 0.001 + i));
        ctx.fillStyle = `rgba(255,255,255,${0.35 * tw})`;
        ctx.fillRect(sx, sy, 1.4, 1.4);
      }
      ctx.restore();
    }

    // 太阳光晕
    if (light.energy > 0.02) {
      const sunX = W * (0.15 + light.sunX * 0.7);
      const sunY = H * (0.75 - light.energy * 0.62);
      const r = Math.min(W, H) * (0.1 + light.energy * 0.16);
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r * 2.6);
      glow.addColorStop(0, `rgba(255,246,220,${0.5 * light.energy})`);
      glow.addColorStop(0.4, `rgba(255,220,170,${0.18 * light.energy})`);
      glow.addColorStop(1, 'rgba(255,220,170,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawShafts(apertureVal) {
    // 光柱从每片窗叶间隙投射到画面下方
    const light = daylight(state.time);
    if (light.energy < 0.03 || apertureVal < 0.04) return;
    const cols = skyColors();
    const slant = (state.pointer.x - 0.5) * 0.35 + 0.18;
    const spacing = H / (slats.length + 1);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    slats.forEach((s, i) => {
      const gap = Math.abs(s.angle) / 80;
      if (gap < 0.05) return;
      const y = spacing * (i + 1);
      const h = spacing * gap * 0.9;
      const drift = Math.sin(performance.now() * 0.0008 + s.phase) * spacing * 0.12;
      const grad = ctx.createLinearGradient(0, y, W * slant, H);
      const warm = 0.16 * light.energy * gap;
      grad.addColorStop(0, rgba(cols[2].map((v) => lerp(v, 255, 0.55)), warm));
      grad.addColorStop(1, rgba(cols[0], 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-4, y + drift);
      ctx.lineTo(W + 4, y + drift);
      ctx.lineTo(W + 4 + W * slant, H);
      ctx.lineTo(-4 + W * slant * 1.6, H);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  function drawSlats() {
    const spacing = H / (slats.length + 1);
    const cols = skyColors();
    const light = daylight(state.time);

    slats.forEach((s, i) => {
      const y = spacing * (i + 1);
      const rad = (s.angle * Math.PI) / 180;
      // 倾斜后的视觉厚度
      const depth = Math.abs(Math.cos(rad));
      const slatH = Math.max(1.5, spacing * 0.94 * depth);
      const facing = (Math.sin(rad) + 1) / 2; // 0 背光 · 1 向光

      // 受光面颜色随角度混合
      const lit = lerp(0.1, 0.5, facing * (0.35 + light.energy * 0.65));
      const edge = lerp(0.22, 0.85, facing);

      const grad = ctx.createLinearGradient(0, y - slatH / 2, 0, y + slatH / 2);
      grad.addColorStop(0, rgba(cols[2], lit * 0.9));
      grad.addColorStop(0.5, rgba([30, 34, 52], 0.88 - lit * 0.3));
      grad.addColorStop(1, rgba(cols[0], lit * 0.55));

      ctx.fillStyle = grad;
      const r = Math.min(slatH / 2, 4);
      roundRect(-4, y - slatH / 2, W + 8, slatH, r);
      ctx.fill();

      // 发光边缘线
      ctx.strokeStyle = rgba([255, 250, 235], edge * 0.28 * (0.4 + light.energy * 0.6));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y - slatH / 2 + 0.5);
      ctx.lineTo(W, y - slatH / 2 + 0.5);
      ctx.stroke();
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawDust(dt, apertureVal) {
    const light = daylight(state.time);
    if (light.energy < 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    dust.forEach((p) => {
      p.x += p.vx * dt * (0.4 + apertureVal);
      p.y += p.vy * dt;
      p.tw += p.twSpeed * dt;
      if (p.y < -0.02) { p.y = 1.02; p.x = rand(0, 1); }
      if (p.x < -0.02) p.x = 1.02;
      if (p.x > 1.02) p.x = -0.02;
      const px = p.x * W;
      const py = p.y * H;
      // 光柱内的尘埃更亮
      const inBand = Math.abs(Math.sin(py / (H / (slats.length + 1)) * Math.PI)) * apertureVal;
      const alpha = (0.08 + inBand * 0.5) * (0.5 + 0.5 * Math.sin(p.tw)) * light.energy;
      ctx.fillStyle = `rgba(255,244,214,${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // === HUD ===
  let hudTick = 0;
  function updateHUD(apertureVal) {
    if (++hudTick % 6 !== 0) return;
    const light = daylight(state.time);
    const avgAngle = slats.reduce((sum, s) => sum + s.angle, 0) / (slats.length || 1);
    hudTilt.textContent = `${avgAngle >= 0 ? '+' : ''}${avgAngle.toFixed(1)}°`;
    hudAperture.textContent = `${String(Math.round(apertureVal * 100)).padStart(2, '0')}%`;
    const lux = Math.round(12000 * light.energy * (0.15 + apertureVal * 0.85));
    hudLux.textContent = String(lux).padStart(4, '0');
    const hh = Math.floor(state.time) % 24;
    const mm = Math.floor((state.time % 1) * 60);
    hudTime.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // === Main loop ===
  let lastT = performance.now();
  function frame(now) {
    const dt = clamp((now - lastT) / 1000, 0.001, 0.05);
    lastT = now;

    stepSlats(dt);
    const ap = aperture();

    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawShafts(ap);
    drawSlats();
    drawDust(dt, ap);
    updateHUD(ap);

    requestAnimationFrame(frame);
  }

  // === Resize ===
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stageEl.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // === Interactions ===
  let hintFaded = false;
  function fadeHint() {
    if (hintFaded) return;
    hintFaded = true;
    hintEl.classList.add('faded');
  }

  stageEl.addEventListener('pointerdown', (e) => {
    const rect = stageEl.getBoundingClientRect();
    state.drag = { y: e.clientY, startTilt: state.tiltTarget, moved: false };
    state.snappedOpen = false;
    snapBtn.querySelector('.btn-text').textContent = 'SNAP OPEN';
    stageEl.classList.add('dragging');
    stageEl.setPointerCapture(e.pointerId);
    updatePointer(e, rect);
    fadeHint();
  });

  stageEl.addEventListener('pointermove', (e) => {
    const rect = stageEl.getBoundingClientRect();
    state.pointer.x = (e.clientX - rect.left) / rect.width;
    state.pointer.y = (e.clientY - rect.top) / rect.height;
    state.pointer.active = true;

    if (state.drag) {
      const dy = e.clientY - state.drag.y;
      if (Math.abs(dy) > 4) state.drag.moved = true;
      const next = clamp(state.drag.startTilt - dy * 0.35, -80, 80);
      state.tiltTarget = next;
      tiltSlider.value = next;
      tiltReadout.textContent = `${Math.round(next)}°`;
    }
  });

  stageEl.addEventListener('pointerup', () => {
    const wasClick = state.drag && !state.drag.moved;
    state.drag = null;
    stageEl.classList.remove('dragging');
    if (wasClick) toggleSnap();
  });

  stageEl.addEventListener('pointerleave', () => {
    state.pointer.active = false;
  });

  function toggleSnap() {
    state.snappedOpen = !state.snappedOpen;
    snapBtn.querySelector('.btn-text').textContent = state.snappedOpen ? 'SNAP SHUT' : 'SNAP OPEN';
    modeLabel.textContent = state.snappedOpen
      ? 'blinds wide open — light floods in'
      : 'drag the stage to tilt the slats';
    // 呼吸模式与快开互斥
    if (state.snappedOpen && state.breathe) setBreathe(false);
  }

  snapBtn.addEventListener('click', toggleSnap);

  function setBreathe(on) {
    state.breathe = on;
    breatheBtn.classList.toggle('active', on);
  }

  breatheBtn.addEventListener('click', () => {
    setBreathe(!state.breathe);
    if (state.breathe) {
      state.snappedOpen = false;
      snapBtn.querySelector('.btn-text').textContent = 'SNAP OPEN';
      modeLabel.textContent = 'breathing rhythm — light follows the lungs';
    } else {
      modeLabel.textContent = 'drag the stage to tilt the slats';
    }
  });

  tiltSlider.addEventListener('input', () => {
    state.tiltTarget = parseFloat(tiltSlider.value);
    state.snappedOpen = false;
    snapBtn.querySelector('.btn-text').textContent = 'SNAP OPEN';
    tiltReadout.textContent = `${Math.round(state.tiltTarget)}°`;
    fadeHint();
  });

  timeSlider.addEventListener('input', () => {
    state.time = parseFloat(timeSlider.value);
    timeReadout.textContent = formatTime(state.time);
    fadeHint();
  });

  slatsSlider.addEventListener('input', () => {
    state.slatCount = parseInt(slatsSlider.value, 10);
    slatsReadout.textContent = String(state.slatCount);
    rebuildSlats();
  });

  themeBtn.addEventListener('click', () => {
    state.themeIdx = (state.themeIdx + 1) % THEMES.length;
    document.body.dataset.theme = THEMES[state.themeIdx];
  });

  function formatTime(t) {
    const hh = Math.floor(t) % 24;
    const mm = Math.floor((t % 1) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // === Boot ===
  window.addEventListener('resize', resize);
  document.body.dataset.theme = THEMES[0];
  timeReadout.textContent = formatTime(state.time);
  resize();
  rebuildSlats();
  requestAnimationFrame(frame);
})();
