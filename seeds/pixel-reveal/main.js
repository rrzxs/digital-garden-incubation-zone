/**
 * ============================================================
 * Pixel Reveal — 像素揭示
 * 马赛克像素瓦片以弹簧-阻尼物理溶解 / 复原，
 * 揭示下方程序化生成的信号源画作。
 * 模式：聚光灯 / 涟漪 / 扫描 / 降雨
 * ============================================================
 */

(function () {
  'use strict';

  // === 配置与状态 ============================================

  const THEMES = {
    ocean:  { cover: [10, 22, 40],    accent: '#6fd6ff', art: ['#6fd6ff', '#3d8fd1', '#0f4c81', '#aef0ff'], bg: '#050c18' },
    aurora: { cover: [8, 24, 24],     accent: '#64f0c8', art: ['#64f0c8', '#2fa38c', '#0f7a5a', '#c8ffe9'], bg: '#05120f' },
    ember:  { cover: [26, 12, 9],     accent: '#ffb37a', art: ['#ffb37a', '#d1622f', '#8a2f1d', '#ffe3c4'], bg: '#150806' },
    nebula: { cover: [18, 11, 32],    accent: '#c9a2ff', art: ['#c9a2ff', '#8a4ec0', '#55309c', '#eadcff'], bg: '#0c0616' }
  };

  const MODE_HINTS = {
    spotlight: 'SPOTLIGHT · 移动光标溶解像素',
    ripple:    'RIPPLE · 点击画布激发冲击波级联',
    sweep:     'SWEEP · 扫描光束自动揭示',
    rain:      'RAIN · 像素如雨般消隐与重生'
  };

  const state = {
    mode: 'spotlight',
    source: 'garden',
    theme: 'ocean',
    tileSize: 20,
    brushRadius: 110,
    cols: 0,
    rows: 0,
    tiles: [],
    ripples: [],
    pointer: { x: -9999, y: -9999, active: false },
    sweep: { x: 0, dir: 1 },
    time: 0
  };

  // === DOM 元素 ==============================================

  const stage = document.getElementById('stage');
  const artCanvas = document.getElementById('art-canvas');
  const pixelCanvas = document.getElementById('pixel-canvas');
  const artCtx = artCanvas.getContext('2d');
  const pixelCtx = pixelCanvas.getContext('2d');
  const scanBeam = document.getElementById('scan-beam');
  const modeHint = document.getElementById('mode-hint');
  const toastEl = document.getElementById('toast');
  const hud = {
    revealed: document.getElementById('hud-revealed'),
    tiles: document.getElementById('hud-tiles'),
    fps: document.getElementById('hud-fps')
  };

  // === 工具函数 ==============================================

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 轻量值噪声（用于程序化作画）
  function makeNoise(seed) {
    const perm = new Uint8Array(512);
    let s = seed;
    const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const fade = (t) => t * t * (3 - 2 * t);
    return function noise(x, y) {
      const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const a = perm[xi] + yi, b = perm[xi + 1] + yi;
      const v00 = perm[a], v10 = perm[b], v01 = perm[a + 1], v11 = perm[b + 1];
      const u = fade(xf), v = fade(yf);
      return v00 + (v10 - v00) * u + (v01 - v00 + (v11 - v10 - v01 + v00) * u) * v;
    };
  }
  const noise = makeNoise(1337);

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // 标题乱码揭示
  function scrambleTitle() {
    const el = document.getElementById('main-title');
    const target = 'PIXEL REVEAL';
    const glyphs = '▚▞▛▜◤◥◈◉⊛≋⌁01';
    let frame = 0;
    const totalFrames = 42;
    const tick = () => {
      frame++;
      const progress = frame / totalFrames;
      const settled = Math.floor(progress * target.length);
      let out = '';
      for (let i = 0; i < target.length; i++) {
        if (target[i] === ' ') { out += ' '; continue; }
        out += i < settled ? target[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (frame < totalFrames) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    tick();
  }

  // === 信号源画作渲染 ========================================

  function renderArtwork(w, h) {
    const t = THEMES[state.theme];
    const ctx = artCtx;
    ctx.clearRect(0, 0, w, h);

    // 底色
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, t.art[2]);
    bgGrad.addColorStop(1, t.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (state.source === 'garden') drawGarden(ctx, w, h, t);
    else if (state.source === 'nebula') drawNebula(ctx, w, h, t);
    else if (state.source === 'glyph') drawGlyph(ctx, w, h, t);
    else drawWave(ctx, w, h, t);
  }

  function drawGarden(ctx, w, h, t) {
    // 流体网格光斑
    for (let i = 0; i < 7; i++) {
      const cx = noise(i * 3.1, 7.7) / 255 * w * 1.1 - w * 0.05;
      const cy = noise(i * 5.3, 2.9) / 255 * h * 1.1 - h * 0.05;
      const r = (0.12 + (noise(i * 1.7, 9.2) / 255) * 0.22) * Math.min(w, h);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, t.art[i % 2 === 0 ? 0 : 1] + '66');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // 花园坐标网格
    ctx.strokeStyle = t.art[3] + '22';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // 主文字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = t.art[3];
    ctx.font = `700 ${Math.round(h * 0.2)}px 'Outfit', sans-serif`;
    ctx.shadowColor = t.art[0];
    ctx.shadowBlur = 42;
    ctx.fillText('DIGITAL GARDEN', w / 2, h * 0.42);
    ctx.shadowBlur = 0;
    ctx.fillStyle = t.art[1];
    ctx.font = `400 ${Math.round(h * 0.07)}px 'Share Tech Mono', monospace`;
    ctx.fillText('every pixel conceals a seed', w / 2, h * 0.6);
    // 种子符号
    for (let i = 0; i < 14; i++) {
      const px = rand(w * 0.06, w * 0.94);
      const py = rand(h * 0.68, h * 0.92);
      const r = rand(2, 5);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = t.art[0] + 'aa';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px, py - r);
      ctx.quadraticCurveTo(px + r * 2, py - r * 3, px + r * 3, py - r * 5);
      ctx.strokeStyle = t.art[3] + '88';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawNebula(ctx, w, h, t) {
    // 星云雾
    for (let i = 0; i < 10; i++) {
      const cx = noise(i * 2.3, 4.1) / 255 * w;
      const cy = noise(i * 7.9, 1.3) / 255 * h;
      const r = (0.1 + (noise(i * 4.4, 6.6) / 255) * 0.3) * Math.min(w, h);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, t.art[i % 3] + '55');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // 星野
    for (let i = 0; i < 260; i++) {
      const px = rand(0, w), py = rand(0, h);
      const r = Math.random() < 0.08 ? rand(1.2, 2.2) : rand(0.3, 1);
      ctx.globalAlpha = rand(0.3, 1);
      ctx.fillStyle = Math.random() < 0.85 ? t.art[3] : t.art[0];
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 行星
    const px = w * 0.74, py = h * 0.66, pr = Math.min(w, h) * 0.24;
    const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
    pg.addColorStop(0, t.art[3]);
    pg.addColorStop(0.5, t.art[1]);
    pg.addColorStop(1, t.bg);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    // 星环
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.42);
    ctx.strokeStyle = t.art[0] + '99';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 1.55, pr * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // 标注
    ctx.textAlign = 'left';
    ctx.fillStyle = t.art[3];
    ctx.font = `400 ${Math.round(h * 0.05)}px 'Share Tech Mono', monospace`;
    ctx.fillText('SECTOR 07 // NEBULA', w * 0.06, h * 0.14);
  }

  function drawGlyph(ctx, w, h, t) {
    // 背景字符矩阵
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = '01◈◉≋⌁⟐⊛▦.onResume⌘';
    const gridStep = Math.round(h / 12);
    ctx.font = `${gridStep * 0.42}px 'Share Tech Mono', monospace`;
    for (let x = gridStep / 2; x < w; x += gridStep) {
      for (let y = gridStep / 2; y < h; y += gridStep) {
        const n = noise(x * 0.01, y * 0.01) / 255;
        ctx.globalAlpha = 0.08 + n * 0.3;
        ctx.fillStyle = n > 0.5 ? t.art[0] : t.art[1];
        ctx.fillText(chars[Math.floor(rand(0, chars.length))], x, y);
      }
    }
    ctx.globalAlpha = 1;
    // 主字形
    ctx.fillStyle = t.art[3];
    ctx.font = `700 ${Math.round(h * 0.34)}px 'Outfit', sans-serif`;
    ctx.shadowColor = t.art[0];
    ctx.shadowBlur = 50;
    ctx.fillText('像 素', w / 2, h * 0.44);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = t.art[0];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.66);
    ctx.lineTo(w * 0.8, h * 0.66);
    ctx.stroke();
    ctx.fillStyle = t.art[1];
    ctx.font = `400 ${Math.round(h * 0.06)}px 'Share Tech Mono', monospace`;
    ctx.fillText('P I X E L   A S   L A N G U A G E', w / 2, h * 0.75);
  }

  function drawWave(ctx, w, h, t) {
    // 层叠波场
    for (let layer = 0; layer < 6; layer++) {
      ctx.beginPath();
      const baseY = h * (0.3 + layer * 0.11);
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 6) {
        const n = noise(x * 0.004 + layer * 10, layer * 3.3) / 255;
        const y = baseY + Math.sin(x * 0.012 + layer * 1.7) * h * 0.05 + (n - 0.5) * h * 0.12;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = t.art[layer % 3] + 'bb';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // 频谱柱
    const bars = 48;
    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const n = noise(i * 0.35, 88.8) / 255;
      const bh = n * h * 0.34 + h * 0.04;
      const g = ctx.createLinearGradient(0, h - bh, 0, h);
      g.addColorStop(0, t.art[0] + 'cc');
      g.addColorStop(1, t.art[2] + '44');
      ctx.fillStyle = g;
      ctx.fillRect(i * bw + bw * 0.2, h - bh, bw * 0.6, bh);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = t.art[3];
    ctx.font = `400 ${Math.round(h * 0.05)}px 'Share Tech Mono', monospace`;
    ctx.fillText('WAVEFIELD // 48 BANDS', w * 0.95, h * 0.09);
  }

  // === 像素网格 ==============================================

  function buildGrid() {
    const w = pixelCanvas.width, h = pixelCanvas.height;
    state.cols = Math.max(1, Math.ceil(w / state.tileSize));
    state.rows = Math.max(1, Math.ceil(h / state.tileSize));
    state.tiles = new Array(state.cols * state.rows);
    for (let i = 0; i < state.tiles.length; i++) {
      state.tiles[i] = {
        a: 1,          // 当前不透明度
        v: 0,          // 弹簧速度
        t: 1,          // 目标不透明度
        hold: 0,       // 保持揭示直到该时刻
        lum: rand(-14, 14),   // 静态明度微差
        accent: Math.random() < 0.055, // 少数强调色瓦片
        delay: rand(0, 260)   // 复原错峰
      };
    }
    hud.tiles.textContent = state.tiles.length;
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    artCanvas.width = Math.round(rect.width * dpr);
    artCanvas.height = Math.round(rect.height * dpr);
    pixelCanvas.width = artCanvas.width;
    pixelCanvas.height = artCanvas.height;
    renderArtwork(artCanvas.width, artCanvas.height);
    buildGrid();
  }

  // === 交互模式 ==============================================

  function dissolveAt(px, py, radius, holdMs) {
    const now = performance.now();
    const r2 = radius * radius;
    const cx = px / state.tileSize, cy = py / state.tileSize;
    const cr = radius / state.tileSize;
    for (let gy = Math.max(0, Math.floor(cy - cr)); gy <= Math.min(state.rows - 1, Math.ceil(cy + cr)); gy++) {
      for (let gx = Math.max(0, Math.floor(cx - cr)); gx <= Math.min(state.cols - 1, Math.ceil(cx + cr)); gx++) {
        const tile = state.tiles[gy * state.cols + gx];
        if (!tile) continue;
        const dx = (gx + 0.5) * state.tileSize - px;
        const dy = (gy + 0.5) * state.tileSize - py;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          const falloff = 1 - Math.sqrt(d2 / r2) * 0.4;
          tile.t = 0;
          tile.hold = Math.max(tile.hold, now + holdMs * falloff + tile.delay * 0.4);
        }
      }
    }
  }

  function spawnRipple(px, py, strength) {
    state.ripples.push({ x: px, y: py, r: 0, speed: 560 * strength, band: state.tileSize * 3.2, max: Math.hypot(pixelCanvas.width, pixelCanvas.height), alpha: 1 });
  }

  function updateModes(dt, now) {
    const w = pixelCanvas.width, h = pixelCanvas.height;

    if (state.mode === 'spotlight' && state.pointer.active) {
      dissolveAt(state.pointer.x, state.pointer.y, state.brushRadius, 1500);
    }

    if (state.mode === 'rain') {
      const budget = Math.ceil(state.tiles.length * 0.9 * dt);
      for (let i = 0; i < budget; i++) {
        const tile = state.tiles[Math.floor(Math.random() * state.tiles.length)];
        if (tile.t === 1) {
          tile.t = 0;
          tile.hold = now + rand(1800, 4200);
        }
      }
    }

    if (state.mode === 'sweep') {
      const speed = w * 0.11;
      state.sweep.x += state.sweep.dir * speed * dt;
      if (state.sweep.x > w) { state.sweep.x = w; state.sweep.dir = -1; }
      if (state.sweep.x < 0) { state.sweep.x = 0; state.sweep.dir = 1; }
      dissolveAt(state.sweep.x, h / 2, state.tileSize * 3, 2200);
      // 拉长为垂直光束：沿光束方向多次采样
      for (let sy = 0; sy <= h; sy += state.tileSize * 2) {
        dissolveAt(state.sweep.x, sy, state.tileSize * 1.6, 2000);
      }
      const beamPct = (state.sweep.x / w) * 100;
      scanBeam.style.left = beamPct + '%';
    }

    // 涟漪波前
    for (let i = state.ripples.length - 1; i >= 0; i--) {
      const rp = state.ripples[i];
      const prev = rp.r;
      rp.r += rp.speed * dt;
      rp.alpha = clamp(1 - rp.r / rp.max, 0, 1);
      // 波前经过的瓦片消隐
      const steps = 14;
      for (let s = 0; s < steps; s++) {
        const ang = (s / steps) * Math.PI * 2 + rp.r * 0.002;
        dissolveAt(rp.x + Math.cos(ang) * rp.r, rp.y + Math.sin(ang) * rp.r, rp.band * 0.55, 2400);
      }
      if (rp.r > rp.max) state.ripples.splice(i, 1);
    }
  }

  // === 渲染循环 ==============================================

  let lastTime = performance.now();
  let fpsFrames = 0, fpsLast = performance.now();

  function loop(now) {
    const dt = clamp((now - lastTime) / 1000, 0.001, 0.05);
    lastTime = now;
    state.time += dt;

    updateModes(dt, now);

    // --- 弹簧物理与绘制 ---
    const ctx = pixelCtx;
    const t = THEMES[state.theme];
    const size = state.tileSize;
    const gap = Math.max(1, size * 0.08);
    ctx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);

    let revealedSum = 0;
    const k = 130 * dt;
    const damp = Math.pow(0.0035, dt);

    for (let gy = 0; gy < state.rows; gy++) {
      for (let gx = 0; gx < state.cols; gx++) {
        const tile = state.tiles[gy * state.cols + gx];
        if (!tile) continue;

        // 超时且无外力 → 复原
        if (tile.t === 0 && now > tile.hold) {
          const keep = state.mode === 'spotlight' && state.pointer.active &&
            Math.hypot((gx + 0.5) * size - state.pointer.x, (gy + 0.5) * size - state.pointer.y) < state.brushRadius;
          if (!keep) tile.t = 1;
        }

        // 弹簧-阻尼
        tile.v += (tile.t - tile.a) * k;
        tile.v *= damp;
        tile.a += tile.v * dt * 8;
        tile.a = clamp(tile.a, 0, 1);
        revealedSum += 1 - tile.a;

        if (tile.a < 0.01) continue;

        const lum = tile.lum;
        if (tile.accent) {
          ctx.globalAlpha = tile.a * 0.85;
          ctx.fillStyle = t.accent;
        } else {
          ctx.globalAlpha = tile.a;
          const c = t.cover;
          ctx.fillStyle = `rgb(${clamp(c[0] + lum, 0, 255)},${clamp(c[1] + lum, 0, 255)},${clamp(c[2] + lum, 0, 255)})`;
        }
        ctx.fillRect(gx * size + gap * 0.5, gy * size + gap * 0.5, size - gap, size - gap);
      }
    }
    ctx.globalAlpha = 1;

    // --- 涟漪环 ---
    for (const rp of state.ripples) {
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = t.accent;
      ctx.globalAlpha = rp.alpha * 0.5;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r * 0.82, 0, Math.PI * 2);
      ctx.globalAlpha = rp.alpha * 0.22;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // --- HUD ---
    hud.revealed.textContent = ((revealedSum / state.tiles.length) * 100).toFixed(1) + '%';
    fpsFrames++;
    if (now - fpsLast >= 1000) {
      hud.fps.textContent = fpsFrames;
      fpsFrames = 0;
      fpsLast = now;
    }

    requestAnimationFrame(loop);
  }

  // === 事件绑定 ==============================================

  function canvasPos(e) {
    const rect = pixelCanvas.getBoundingClientRect();
    const sx = pixelCanvas.width / rect.width;
    const sy = pixelCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  stage.addEventListener('pointermove', (e) => {
    const p = canvasPos(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    state.pointer.active = true;
  });
  stage.addEventListener('pointerleave', () => {
    state.pointer.active = false;
  });
  stage.addEventListener('pointerdown', (e) => {
    const p = canvasPos(e);
    const strength = state.mode === 'ripple' ? 1 : 0.55;
    spawnRipple(p.x, p.y, strength);
    if (navigator.vibrate) navigator.vibrate(8);
  });

  // 模式切换
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      document.body.dataset.mode = state.mode;
      modeHint.textContent = MODE_HINTS[state.mode];
      state.ripples.length = 0;
      toast('MODE :: ' + state.mode.toUpperCase());
    });
  });

  // 信号源切换
  document.querySelectorAll('.src-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.src-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.source = btn.dataset.source;
      renderArtwork(artCanvas.width, artCanvas.height);
      toast('SRC :: ' + btn.textContent.trim() + ' — 已重新生成');
    });
  });

  // 主题切换
  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.theme-dot').forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
      state.theme = dot.dataset.theme;
      document.body.dataset.theme = state.theme;
      renderArtwork(artCanvas.width, artCanvas.height);
      toast('TONE :: ' + dot.title);
    });
  });

  // 滑杆
  const pixelSizeInput = document.getElementById('pixel-size');
  const brushRadiusInput = document.getElementById('brush-radius');
  pixelSizeInput.addEventListener('input', () => {
    state.tileSize = parseInt(pixelSizeInput.value, 10);
    document.getElementById('pixel-size-value').textContent = state.tileSize;
    buildGrid();
  });
  brushRadiusInput.addEventListener('input', () => {
    state.brushRadius = parseInt(brushRadiusInput.value, 10) * (pixelCanvas.width / stage.clientWidth);
    document.getElementById('brush-radius-value').textContent = brushRadiusInput.value;
  });

  // 动作按钮
  document.getElementById('btn-reveal-all').addEventListener('click', () => {
    const now = performance.now();
    for (const tile of state.tiles) {
      tile.t = 0;
      tile.hold = now + 4200 + tile.delay * 3;
    }
    toast('SIGNAL UNCOVERED · 全部揭示');
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    for (const tile of state.tiles) {
      tile.t = 1;
      tile.hold = 0;
    }
    state.ripples.length = 0;
    toast('MOSAIC RESTORED · 马赛克已复原');
  });

  // 键盘快捷键：1-4 切换模式，R 复原
  window.addEventListener('keydown', (e) => {
    const map = { '1': 'spotlight', '2': 'ripple', '3': 'sweep', '4': 'rain' };
    if (map[e.key]) {
      const btn = document.querySelector(`.mode-btn[data-mode="${map[e.key]}"]`);
      if (btn) btn.click();
    } else if (e.key.toLowerCase() === 'r') {
      document.getElementById('btn-reset').click();
    }
  });

  // 窗口缩放（防抖）
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  });

  // === 启动 ==================================================

  scrambleTitle();
  resize();
  state.brushRadius = parseInt(brushRadiusInput.value, 10) * (pixelCanvas.width / stage.clientWidth);
  requestAnimationFrame(loop);

})();
