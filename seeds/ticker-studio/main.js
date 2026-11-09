/**
 * ============================================================
 * Ticker Studio 滚动字带工作室
 * 弹簧-阻尼物理驱动的动态字带 + 值噪声粒子流场 + 冲击波涟漪
 * maintainer: EDEN
 * ============================================================ */
(() => {
  'use strict';

  // === 配置与状态 ============================================

  const THEMES = {
    aurora: { c1: '#6ee7b7', c2: '#60a5fa', c3: '#c084fc', ink: '#eaf6ff' },
    neon:   { c1: '#22d3ee', c2: '#f472b6', c3: '#a78bfa', ink: '#ffeef8' },
    dusk:   { c1: '#fb923c', c2: '#f43f5e', c3: '#7c3aed', ink: '#fff3e9' },
    mono:   { c1: '#4ade80', c2: '#22c55e', c3: '#86efac', ink: '#d8ffe6' }
  };

  const state = {
    text: 'THE QUICK BROWN FOX · 敏捷的棕色狐狸',
    mode: 'flow',              // flow | wave | pulse | glitch
    theme: 'aurora',
    speed: 1,
    size: 64,
    gap: 48,
    dir: 1,                    // 1 = 向右流动
    scroll: 0,
    time: 0,
    mouse: { x: -9999, y: -9999, inStage: false },
    shockwaves: [],            // { x, y, r, life }
    scrambling: false,
    scrambleT: 0
  };

  const GLYPHS = '!<>-_\\/[]{}—=+*^?#$%&@01';

  // === DOM 元素 ==============================================

  const tickerCanvas = document.getElementById('ticker-canvas');
  const fieldCanvas = document.getElementById('field-canvas');
  const stage = document.getElementById('stage');
  const tctx = tickerCanvas.getContext('2d');
  const fctx = fieldCanvas.getContext('2d');

  const els = {
    input: document.getElementById('ticker-input'),
    launch: document.getElementById('btn-launch'),
    modeGroup: document.getElementById('mode-group'),
    themeGroup: document.getElementById('theme-group'),
    speed: document.getElementById('slider-speed'),
    size: document.getElementById('slider-size'),
    gap: document.getElementById('slider-gap'),
    valSpeed: document.getElementById('val-speed'),
    valSize: document.getElementById('val-size'),
    valGap: document.getElementById('val-gap'),
    dirBtn: document.getElementById('btn-direction'),
    scrambleBtn: document.getElementById('btn-scramble'),
    pulseBtn: document.getElementById('btn-pulse'),
    hudMode: document.getElementById('hud-mode'),
    hudFps: document.getElementById('hud-fps'),
    hudChars: document.getElementById('hud-chars'),
    title: document.getElementById('title-text')
  };

  // === 工具函数 ==============================================

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  /** 轻量值噪声（2D），用于粒子流场 */
  const noise = (() => {
    const grid = 256;
    const perm = new Uint8Array(grid * 2);
    for (let i = 0; i < grid * 2; i++) perm[i] = (Math.random() * grid) | 0;
    const fade = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
      const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const a = perm[perm[xi] + yi] / 255;
      const b = perm[perm[xi + 1] + yi] / 255;
      const c = perm[perm[xi] + yi + 1] / 255;
      const d = perm[perm[xi + 1] + yi + 1] / 255;
      const u = fade(xf), v = fade(yf);
      return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
    };
  })();

  // === 画布尺寸 ==============================================

  let W = 0, H = 0, FW = 0, FH = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = tickerCanvas.getBoundingClientRect();
    W = r.width; H = r.height;
    tickerCanvas.width = W * dpr; tickerCanvas.height = H * dpr;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    FW = window.innerWidth; FH = window.innerHeight;
    fieldCanvas.width = FW * dpr; fieldCanvas.height = FH * dpr;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measureTicker();
  }

  // === 字带引擎 ==============================================

  let glyphs = [];   // { ch, w, oy, vy, scale, vs, rot, vr, glow }
  let totalW = 0;

  function measureTicker() {
    tctx.font = `800 ${state.size}px Outfit, Inter, sans-serif`;
    totalW = 0;
    glyphs = [...state.text].map((ch) => {
      const w = tctx.measureText(ch).width;
      totalW += w;
      return {
        ch, w, x0: totalW - w,
        oy: 0, vy: 0, scale: 1, vs: 0, rot: 0, vr: 0, glow: 0
      };
    });
    totalW += state.gap;
    updateHud();
  }

  /** 弹簧-阻尼积分 */
  function spring(g, dt) {
    const STIFF = 130, DAMP = 12;
    g.vy += (-STIFF * g.oy - DAMP * g.vy) * dt;
    g.oy += g.vy * dt;
    g.vs += (-STIFF * (g.scale - 1) - DAMP * g.vs) * dt;
    g.scale += g.vs * dt;
    g.vr += (-STIFF * g.rot - DAMP * g.vr) * dt;
    g.rot += g.vr * dt;
    g.glow *= Math.pow(0.02, dt);
  }

  function stepGlyphs(dt) {
    const m = state.mouse;
    const baseline = H * 0.58;

    for (const g of glyphs) {
      // 世界 x（考虑滚动环绕，取最近镜像）
      let sx = ((g.x0 - state.scroll) % totalW + totalW) % totalW;
      if (sx > W + totalW / 2) sx -= totalW;
      const cx = sx + g.w / 2;
      const cy = baseline + g.oy;

      // 光标力场：排斥 + 微旋转
      if (m.inStage) {
        const dx = cx - m.x, dy = cy - m.y;
        const dist = Math.hypot(dx, dy);
        const R = 150;
        if (dist < R && dist > 0.01) {
          const f = (1 - dist / R) ** 2;
          g.vy += (dy / dist) * f * 900 * dt;
          g.vr += (dx / dist) * f * 6 * dt;
          g.glow = Math.max(g.glow, f);
        }
      }

      // 冲击波涟漪
      for (const s of state.shockwaves) {
        const dx = cx - s.x, dy = cy - s.y;
        const dist = Math.hypot(dx, dy);
        const band = Math.abs(dist - s.r);
        if (band < 60 && dist > 0.01) {
          const f = (1 - band / 60) * s.life;
          g.vy += (dy / dist) * f * 2200 * dt;
          g.vs += f * 8 * dt;
          g.vr += rand(-1, 1) * f * 10 * dt;
          g.glow = Math.max(g.glow, f);
        }
      }

      // 模式扰动
      if (state.mode === 'wave') {
        g.oy += Math.sin(sx * 0.018 - state.time * 3.2) * 26 * dt * 8;
        g.rot += Math.sin(sx * 0.012 - state.time * 2.4) * 0.2 * dt;
      } else if (state.mode === 'pulse') {
        const beat = Math.pow(Math.max(0, Math.sin(state.time * 3.4)), 6);
        g.vs += beat * 6 * dt;
        g.glow = Math.max(g.glow, beat * 0.6);
      }

      spring(g, dt);
    }
  }

  function drawTicker() {
    const theme = THEMES[state.theme];
    const baseline = H * 0.58;

    // 字带光晕底线
    const lineGrad = tctx.createLinearGradient(0, 0, W, 0);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.5, theme.c1);
    lineGrad.addColorStop(1, 'transparent');
    tctx.globalAlpha = 0.22;
    tctx.fillStyle = lineGrad;
    tctx.fillRect(0, baseline + state.size * 0.72, W, 1.5);
    tctx.globalAlpha = 1;

    const font = `800 ${state.size}px Outfit, Inter, sans-serif`;
    const monoFont = `${Math.max(12, state.size * 0.4)}px "Share Tech Mono", monospace`;

    for (let rep = 0; rep < Math.ceil(W / totalW) + 2; rep++) {
      for (const g of glyphs) {
        let sx = ((g.x0 - state.scroll) % totalW + totalW) % totalW + rep * totalW - totalW;
        if (sx > W + 40 || sx + g.w < -40) continue;

        const cy = baseline + g.oy;
        const sc = clamp(g.scale, 0.2, 2.4);
        const ch = state.scrambling
          ? GLYPHS[(Math.floor(rand(0, GLYPHS.length)))] || g.ch
          : g.ch;

        tctx.save();
        tctx.translate(sx + g.w / 2, cy);
        tctx.rotate(g.rot);
        tctx.scale(sc, sc);

        // 发光
        if (g.glow > 0.02) {
          tctx.shadowColor = theme.c1;
          tctx.shadowBlur = 24 * g.glow;
        }

        if (state.mode === 'glitch' && Math.random() < 0.06) {
          // RGB 色差撕裂
          const j = rand(-6, 6);
          tctx.font = font;
          tctx.globalAlpha = 0.85;
          tctx.fillStyle = theme.c2;
          tctx.fillText(ch, -g.w / 2 + j, 0);
          tctx.fillStyle = theme.c3;
          tctx.fillText(ch, -g.w / 2 - j, 0);
          tctx.fillStyle = theme.ink;
          tctx.fillText(ch, -g.w / 2, rand(-3, 3));
        } else {
          tctx.font = font;
          tctx.fillStyle = theme.ink;
          tctx.globalAlpha = 0.96;
          tctx.fillText(ch, -g.w / 2, 0);
          // 顶部高光渐染
          tctx.globalAlpha = 0.35 * clamp(g.glow + 0.25, 0, 1);
          tctx.fillStyle = theme.c1;
          tctx.fillText(ch, -g.w / 2, 0);
        }

        tctx.restore();

        // 字符下的微晶反射注记（等宽小字）
        if (g.glow > 0.25) {
          tctx.globalAlpha = clamp(g.glow * 0.7, 0, 0.7);
          tctx.font = monoFont;
          tctx.fillStyle = theme.c2;
          tctx.fillText('0x' + ((g.w * 7) & 0xff).toString(16).padStart(2, '0'), sx, cy + state.size * 0.6);
          tctx.globalAlpha = 1;
        }
      }
    }

    // 冲击波环
    for (const s of state.shockwaves) {
      tctx.beginPath();
      tctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      tctx.strokeStyle = theme.c1;
      tctx.globalAlpha = s.life * 0.8;
      tctx.lineWidth = 2.5;
      tctx.shadowColor = theme.c1;
      tctx.shadowBlur = 18;
      tctx.stroke();
      tctx.shadowBlur = 0;
      tctx.globalAlpha = 1;
    }
  }

  function stepShockwaves(dt) {
    for (const s of state.shockwaves) {
      s.r += 620 * dt;
      s.life -= dt * 1.1;
    }
    state.shockwaves = state.shockwaves.filter((s) => s.life > 0);
  }

  // === 粒子流场 ==============================================

  const particles = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: 0, vy: 0, seed: rand(0, 100)
  }));

  function stepField(dt) {
    const theme = THEMES[state.theme];
    fctx.clearRect(0, 0, FW, FH);
    const t = state.time * 0.12;
    for (const p of particles) {
      const a = noise(p.x * 2.4 + t + p.seed, p.y * 2.4 - t) * Math.PI * 2;
      p.vx = lerp(p.vx, Math.cos(a) * 0.02, 0.04);
      p.vy = lerp(p.vy, Math.sin(a) * 0.02, 0.04);
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      if (p.x < -0.02) p.x = 1.02; if (p.x > 1.02) p.x = -0.02;
      if (p.y < -0.02) p.y = 1.02; if (p.y > 1.02) p.y = -0.02;

      const px = p.x * FW, py = p.y * FH;
      fctx.beginPath();
      fctx.arc(px, py, 1.4, 0, Math.PI * 2);
      fctx.fillStyle = theme.c1;
      fctx.globalAlpha = 0.28;
      fctx.fill();

      fctx.beginPath();
      fctx.moveTo(px, py);
      fctx.lineTo(px - p.vx * 400, py - p.vy * 400);
      fctx.strokeStyle = theme.c2;
      fctx.globalAlpha = 0.1;
      fctx.lineWidth = 1;
      fctx.stroke();
    }
    fctx.globalAlpha = 1;
  }

  // === 乱码揭示 ==============================================

  function scrambleReveal(duration = 0.9) {
    state.scrambling = true;
    state.scrambleT = duration;
    const original = state.text;
    const title = els.title;
    let elapsed = 0;
    const tick = () => {
      elapsed += 0.05;
      const p = clamp(elapsed / duration, 0, 1);
      title.textContent = original.slice(0, Math.floor(p * original.length))
        .padEnd(original.length, '·');
      if (p < 1) { setTimeout(tick, 50); }
      else { title.textContent = 'TICKER STUDIO'; }
    };
    tick();
  }

  // === HUD ===================================================

  let frames = 0, fpsTimer = 0;

  function updateHud() {
    els.hudMode.textContent = 'MODE·' + state.mode.toUpperCase();
    els.hudChars.textContent = glyphs.length + ' GLYPHS';
  }

  function updateFps(dt) {
    frames++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      els.hudFps.textContent = Math.round(frames / fpsTimer) + ' FPS';
      frames = 0; fpsTimer = 0;
    }
  }

  // === 主循环 ================================================

  let last = performance.now();

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    state.time += dt;
    state.scroll += state.speed * 160 * state.dir * dt;

    if (state.scrambling) {
      state.scrambleT -= dt;
      if (state.scrambleT <= 0) state.scrambling = false;
    }

    stepShockwaves(dt);
    stepGlyphs(dt);

    tctx.clearRect(0, 0, W, H);
    drawTicker();
    stepField(dt);
    updateFps(dt);

    requestAnimationFrame(loop);
  }

  // === 交互绑定 ==============================================

  function bindEvents() {
    window.addEventListener('resize', resize);

    // 光标
    stage.addEventListener('pointermove', (e) => {
      const r = tickerCanvas.getBoundingClientRect();
      state.mouse.x = e.clientX - r.left;
      state.mouse.y = e.clientY - r.top;
      state.mouse.inStage = true;
    });
    stage.addEventListener('pointerleave', () => { state.mouse.inStage = false; });

    // 点击冲击波
    stage.addEventListener('pointerdown', (e) => {
      const r = tickerCanvas.getBoundingClientRect();
      state.shockwaves.push({
        x: e.clientX - r.left, y: e.clientY - r.top,
        r: 8, life: 1
      });
    });

    // 发射
    const launch = () => {
      const v = els.input.value.trim() || '···';
      state.text = v;
      measureTicker();
      scrambleReveal();
    };
    els.launch.addEventListener('click', launch);
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { launch(); els.input.blur(); }
    });

    // 模式
    els.modeGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg');
      if (!btn) return;
      state.mode = btn.dataset.mode;
      els.modeGroup.querySelectorAll('.seg').forEach((s) => s.classList.toggle('active', s === btn));
      updateHud();
    });

    // 主题
    els.themeGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme');
      if (!btn) return;
      state.theme = btn.dataset.theme;
      document.body.dataset.theme = state.theme;
      els.themeGroup.querySelectorAll('.seg').forEach((s) => s.classList.toggle('active', s === btn));
    });

    // 滑杆
    els.speed.addEventListener('input', () => {
      state.speed = +els.speed.value;
      els.valSpeed.textContent = state.speed.toFixed(1) + '×';
    });
    els.size.addEventListener('input', () => {
      state.size = +els.size.value;
      els.valSize.textContent = state.size;
      measureTicker();
    });
    els.gap.addEventListener('input', () => {
      state.gap = +els.gap.value;
      els.valGap.textContent = state.gap;
      measureTicker();
    });

    // 方向
    els.dirBtn.addEventListener('click', () => {
      state.dir *= -1;
      els.dirBtn.textContent = state.dir > 0 ? '→ 向右' : '← 向左';
    });

    // 乱码重构
    els.scrambleBtn.addEventListener('click', () => scrambleReveal(1.1));

    // 全场脉冲
    els.pulseBtn.addEventListener('click', () => {
      state.shockwaves.push({ x: W / 2, y: H * 0.58, r: 8, life: 1 });
      state.shockwaves.push({ x: W * 0.2, y: H * 0.58, r: 8, life: 1 });
      state.shockwaves.push({ x: W * 0.8, y: H * 0.58, r: 8, life: 1 });
    });
  }

  // === 启动 ==================================================

  function init() {
    resize();
    bindEvents();
    scrambleReveal(1.2);
    requestAnimationFrame(loop);
  }

  document.fonts?.ready.then(init) ?? init();
})();
