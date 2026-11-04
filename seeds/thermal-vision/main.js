/* ============================================================
   Thermal Vision · 热成像视界
   热扩散场模拟 + 调色板 LUT 渲染 + 自走热体 + 遥测 HUD
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('thermal-canvas');
  const ctx = canvas.getContext('2d');
  const reticle = document.getElementById('reticle');
  const reticleTag = document.getElementById('reticle-tag');
  const pulseLayer = document.getElementById('pulse-layer');
  const hudPeak = document.getElementById('hud-peak');
  const hudMean = document.getElementById('hud-mean');
  const hudFlux = document.getElementById('hud-flux');
  const hudBarFill = document.getElementById('hud-bar-fill');
  const paletteRow = document.getElementById('palette-row');
  const btnLife = document.getElementById('btn-life');
  const btnIso = document.getElementById('btn-iso');
  const btnPurge = document.getElementById('btn-purge');
  const ctlSense = document.getElementById('ctl-sense');
  const ctlDecay = document.getElementById('ctl-decay');
  const ctlDiff = document.getElementById('ctl-diff');
  const valSense = document.getElementById('val-sense');
  const valDecay = document.getElementById('val-decay');
  const valDiff = document.getElementById('val-diff');

  // === 状态 ===
  const CELL = 4;                 // 模拟网格粒度（每格像素）
  const AMBIENT = 21.5;           // 环境温度 °C
  const MAX_DELTA = 950;          // 满热场所对应的温差
  const state = {
    mode: 'brush',                // brush | torch | freeze
    palette: 'ironbow',
    sense: 0.85,
    decay: 0.96,
    diffusion: 0.14,
    lifeOn: true,
    isoOn: false,
  };

  // === 调色板定义（关键色标 → LUT） ===
  const PALETTES = {
    ironbow: [
      [0, 0, 0], [56, 9, 107], [160, 34, 168],
      [255, 61, 46], [255, 157, 28], [255, 255, 255],
    ],
    inferno: [
      [0, 0, 0], [50, 10, 90], [183, 50, 118],
      [255, 94, 58], [255, 208, 64],
    ],
    arctic: [
      [2, 10, 30], [11, 61, 145], [41, 182, 246],
      [179, 236, 255], [255, 255, 255],
    ],
    rainbow: [
      [0, 4, 58], [34, 0, 156], [0, 194, 255],
      [28, 255, 98], [255, 230, 0], [255, 61, 0], [255, 255, 255],
    ],
  };

  function buildLUT(stops, iso) {
    const lut = new Uint8ClampedArray(256 * 3);
    const seg = stops.length - 1;
    for (let i = 0; i < 256; i++) {
      let t = i / 255;
      if (iso) t = Math.min(0.999, Math.floor(t * 8) / 7); // 等温线：8 级量化
      const p = t * seg;
      const s = Math.min(seg - 1, Math.floor(p));
      const f = p - s;
      const a = stops[s];
      const b = stops[s + 1];
      for (let c = 0; c < 3; c++) {
        lut[i * 3 + c] = a[c] + (b[c] - a[c]) * f;
      }
    }
    return lut;
  }

  const luts = {};
  function refreshLUTs() {
    Object.keys(PALETTES).forEach((key) => {
      luts[key] = {
        smooth: buildLUT(PALETTES[key], false),
        iso: buildLUT(PALETTES[key], true),
      };
    });
  }
  refreshLUTs();

  // === 模拟网格 ===
  let gridW = 0;
  let gridH = 0;
  let heat = null;
  let next = null;
  let image = null;
  let off = null;
  let offCtx = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gridW = Math.ceil(canvas.width / CELL);
    gridH = Math.ceil(canvas.height / CELL);
    heat = new Float32Array(gridW * gridH);
    next = new Float32Array(gridW * gridH);
    off = document.createElement('canvas');
    off.width = gridW;
    off.height = gridH;
    offCtx = off.getContext('2d');
    image = offCtx.createImageData(gridW, gridH);
    // 冷启动底噪，避免死黑
    for (let i = 0; i < heat.length; i++) heat[i] = Math.random() * 0.015;
  }
  window.addEventListener('resize', resize);
  resize();

  // === 自走热体（模拟生命体热信号） ===
  const lives = Array.from({ length: 5 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0022,
    vy: (Math.random() - 0.5) * 0.0022,
    power: 0.35 + Math.random() * 0.4,
    wob: Math.random() * Math.PI * 2,
  }));

  function stepLives() {
    const w = gridW;
    const h = gridH;
    for (const lf of lives) {
      lf.wob += 0.03;
      lf.x += lf.vx + Math.sin(lf.wob) * 0.0009;
      lf.y += lf.vy + Math.cos(lf.wob * 0.7) * 0.0009;
      if (lf.x < 0.04 || lf.x > 0.96) lf.vx *= -1;
      if (lf.y < 0.06 || lf.y > 0.94) lf.vy *= -1;
      lf.x = Math.min(0.97, Math.max(0.03, lf.x));
      lf.y = Math.min(0.95, Math.max(0.05, lf.y));
      deposit(Math.floor(lf.x * w), Math.floor(lf.y * h), 5, lf.power * 0.16, 0.8);
    }
  }

  // === 热量注入（软毛刷） ===
  function deposit(cx, cy, radius, amount, falloff = 1) {
    const r2 = radius * radius;
    const x0 = Math.max(0, cx - radius);
    const x1 = Math.min(gridW - 1, cx + radius);
    const y0 = Math.max(0, cy - radius);
    const y1 = Math.min(gridH - 1, cy + radius);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 > r2) continue;
        const t = 1 - Math.sqrt(d2) / radius;
        const w = Math.pow(t, falloff);
        const i = y * gridW + x;
        heat[i] = Math.min(1.6, heat[i] + amount * w);
      }
    }
  }

  function cool(cx, cy, radius, amount) {
    const x0 = Math.max(0, cx - radius);
    const x1 = Math.min(gridW - 1, cx + radius);
    const y0 = Math.max(0, cy - radius);
    const y1 = Math.min(gridH - 1, cy + radius);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 > radius * radius) continue;
        const t = 1 - Math.sqrt(d2) / radius;
        const i = y * gridW + x;
        heat[i] = Math.max(-0.35, heat[i] - amount * t); // 允许轻微过冷
      }
    }
  }

  // === 扩散 + 衰减 ===
  function simulate() {
    const w = gridW;
    const h = gridH;
    const k = state.diffusion;
    const decay = state.decay;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      const up = y > 0 ? row - w : row;
      const dn = y < h - 1 ? row + w : row;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        const l = x > 0 ? i - 1 : i;
        const r = x < w - 1 ? i + 1 : i;
        const c = heat[i];
        const lap = heat[up + x] + heat[dn + x] + heat[l] + heat[r] - 4 * c;
        let v = c + lap * k * 0.25;
        v *= decay;
        // 向环境零点回弹（过冷也回归）
        v -= v * 0.004;
        next[i] = v;
      }
    }
    const swap = heat;
    heat = next;
    next = swap;
  }

  // === 渲染 ===
  let peakSmooth = 0;
  let meanSmooth = 0;

  function render() {
    const lut = state.isoOn ? luts[state.palette].iso : luts[state.palette].smooth;
    const data = image.data;
    let peak = 0;
    let sum = 0;
    const n = heat.length;
    for (let i = 0; i < n; i++) {
      const h = heat[i];
      if (h > peak) peak = h;
      sum += h;
      let v = h * state.sense;
      if (v < 0) v = 0;
      if (v > 1) v = 1;
      const li = (v * 255) | 0;
      const p = i * 4;
      data[p] = lut[li * 3];
      data[p + 1] = lut[li * 3 + 1];
      data[p + 2] = lut[li * 3 + 2];
      data[p + 3] = 255;
    }
    offCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

    // HUD 平滑插值
    peakSmooth += (peak - peakSmooth) * 0.08;
    meanSmooth += (sum / n - meanSmooth) * 0.08;
    const flux = peakSmooth * state.sense;
    hudPeak.textContent = (AMBIENT + Math.max(0, peakSmooth) * MAX_DELTA).toFixed(1) + '°C';
    hudMean.textContent = (AMBIENT + meanSmooth * MAX_DELTA).toFixed(1) + '°C';
    hudFlux.textContent = flux.toFixed(2);
    hudBarFill.style.width = Math.min(100, flux * 100).toFixed(1) + '%';
  }

  // === 光标 / 十字准星 ===
  const pointer = { x: 0.5, y: 0.5, px: -1, py: -1, down: false, active: false, lastMove: 0 };

  function toGrid(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    return {
      gx: Math.floor(((clientX - rect.left) * dpr) / CELL),
      gy: Math.floor(((clientY - rect.top) * dpr) / CELL),
      cx: clientX,
      cy: clientY,
    };
  }

  function sampleAt(gx, gy) {
    const x = Math.min(gridW - 1, Math.max(0, gx));
    const y = Math.min(gridH - 1, Math.max(0, gy));
    return heat[y * gridW + x];
  }

  function updateReticle(clientX, clientY) {
    reticle.style.transform = `translate(${clientX}px, ${clientY}px)`;
    const { gx, gy } = toGrid(clientX, clientY);
    const t = AMBIENT + sampleAt(gx, gy) * MAX_DELTA * state.sense;
    reticleTag.textContent = t.toFixed(1) + '°C';
    reticleTag.style.color = t > 400 ? '#ffb28e' : t > 120 ? '#ffe3c2' : '#bfe6ff';
  }

  function injectAt(clientX, clientY, isPulse) {
    const { gx, gy } = toGrid(clientX, clientY);
    if (state.mode === 'freeze') {
      cool(gx, gy, 10, isPulse ? 0.9 : 0.28);
    } else if (state.mode === 'torch') {
      deposit(gx, gy, 16, isPulse ? 1.2 : 0.30, 1.4);
    } else {
      deposit(gx, gy, 8, isPulse ? 0.9 : 0.20, 1.1);
    }
  }

  window.addEventListener('pointermove', (e) => {
    pointer.active = true;
    pointer.lastMove = performance.now();
    reticle.classList.add('is-visible');
    updateReticle(e.clientX, e.clientY);
    // 依据移动速度注入热量（速度越快，热迹越亮）
    const dx = e.clientX - (pointer.px < 0 ? e.clientX : pointer.px);
    const dy = e.clientY - (pointer.py < 0 ? e.clientY : pointer.py);
    const speed = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 40);
    if (!pointer.down || state.mode !== 'freeze') {
      injectAt(e.clientX, e.clientY, false);
      if (speed > 0.05) {
        const { gx, gy } = toGrid(e.clientX, e.clientY);
        deposit(gx, gy, 4, speed * 0.10 * state.sense, 1);
      }
    } else {
      injectAt(e.clientX, e.clientY, false);
    }
    pointer.px = e.clientX;
    pointer.py = e.clientY;
  });

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.console, .brand, .hud')) return;
    pointer.down = true;
    reticle.classList.add('is-pressed');
    injectAt(e.clientX, e.clientY, true);
    spawnPulseRing(e.clientX, e.clientY, state.mode === 'freeze');
  });

  window.addEventListener('pointerup', () => {
    pointer.down = false;
    reticle.classList.remove('is-pressed');
  });

  window.addEventListener('pointerleave', () => {
    reticle.classList.remove('is-visible');
  });

  document.addEventListener('mouseleave', () => {
    reticle.classList.remove('is-visible');
  });

  // === 脉冲涟漪 DOM ===
  function spawnPulseRing(x, y, coolMode) {
    const ring = document.createElement('span');
    ring.className = 'pulse-ring' + (coolMode ? ' ring-cool' : '');
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    pulseLayer.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
  }

  // === 控制台交互 ===
  paletteRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.palette-chip');
    if (!chip) return;
    paletteRow.querySelectorAll('.palette-chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    state.palette = chip.dataset.palette;
  });

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.mode = btn.dataset.mode;
    });
  });

  ctlSense.addEventListener('input', () => {
    state.sense = parseFloat(ctlSense.value);
    valSense.textContent = state.sense.toFixed(2);
  });
  ctlDecay.addEventListener('input', () => {
    state.decay = parseFloat(ctlDecay.value);
    valDecay.textContent = state.decay.toFixed(3);
  });
  ctlDiff.addEventListener('input', () => {
    state.diffusion = parseFloat(ctlDiff.value);
    valDiff.textContent = state.diffusion.toFixed(2);
  });

  function toggleLife() {
    state.lifeOn = !state.lifeOn;
    btnLife.classList.toggle('is-on', state.lifeOn);
  }
  function toggleIso() {
    state.isoOn = !state.isoOn;
    btnIso.classList.toggle('is-on', state.isoOn);
  }
  function purge() {
    for (let i = 0; i < heat.length; i++) heat[i] = Math.random() * 0.015;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const ring = document.createElement('span');
        ring.className = 'pulse-ring ring-cool';
        ring.style.left = '50%';
        ring.style.top = '50%';
        pulseLayer.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove());
      }, i * 140);
    }
  }

  btnLife.addEventListener('click', toggleLife);
  btnIso.addEventListener('click', toggleIso);
  btnPurge.addEventListener('click', purge);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); purge(); }
    if (e.key === 'l' || e.key === 'L') toggleLife();
    if (e.key === 'i' || e.key === 'I') toggleIso();
    if (e.key === '1') paletteRow.querySelector('[data-palette="ironbow"]').click();
    if (e.key === '2') paletteRow.querySelector('[data-palette="inferno"]').click();
    if (e.key === '3') paletteRow.querySelector('[data-palette="arctic"]').click();
    if (e.key === '4') paletteRow.querySelector('[data-palette="rainbow"]').click();
  });

  // === 主循环 ===
  function loop() {
    if (state.lifeOn) stepLives();
    simulate();
    render();
    requestAnimationFrame(loop);
  }

  // 预热：初始注入几个热源，入场即有画面
  (function warmup() {
    const cx = gridW * 0.5;
    const cy = gridH * 0.5;
    deposit(Math.floor(cx), Math.floor(cy), 30, 0.7, 1.2);
    deposit(Math.floor(gridW * 0.28), Math.floor(gridH * 0.7), 22, 0.5, 1.2);
    deposit(Math.floor(gridW * 0.72), Math.floor(gridH * 0.32), 22, 0.5, 1.2);
    for (let i = 0; i < 40; i++) simulate();
  })();

  requestAnimationFrame(loop);
})();
