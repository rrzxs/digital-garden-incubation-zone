/* ============================================================
   ASCII Glyph Renderer · 字符渲染台
   把任意字形拆解为 ASCII 字符矩阵：
   光标扰动 · 冲击波脉冲 · 乱码揭示 · 采样精度调节 · 导出
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('glyph-canvas');
  const ctx = canvas.getContext('2d');
  const glyphInput = document.getElementById('glyph-input');
  const presetChips = document.getElementById('preset-chips');
  const setGrid = document.getElementById('set-grid');
  const modeGrid = document.getElementById('mode-grid');
  const themeGrid = document.getElementById('theme-grid');
  const rngRes = document.getElementById('rng-res');
  const outRes = document.getElementById('out-res');
  const rngContrast = document.getElementById('rng-contrast');
  const outContrast = document.getElementById('out-contrast');
  const chkInvert = document.getElementById('chk-invert');
  const chkAutopulse = document.getElementById('chk-autopulse');
  const btnPulse = document.getElementById('btn-pulse');
  const btnCopy = document.getElementById('btn-copy');
  const panelToggle = document.getElementById('panel-toggle');
  const panel = document.getElementById('panel');
  const toastEl = document.getElementById('toast');
  const teleGrid = document.getElementById('tele-grid');
  const teleGlyph = document.getElementById('tele-glyph');
  const teleFps = document.getElementById('tele-fps');
  const scrambleEls = document.querySelectorAll('[data-scramble]');

  // === 字符梯度（由暗到亮） ===
  const CHARSETS = {
    standard: ' .:-=+*#%@',
    blocks: ' \u00b0\u2591\u2592\u2593\u2588',
    binary: ' .:01',
    runes: ' \u00b7\u2022\u25aa\u25c6\u2726\u2727\u2605'
  };

  const SCRAMBLE_POOL = '!<>-_\\/[]{}—=+*^?#$%&@';

  // === 主题色板（画布渲染用，与 CSS data-theme 同步） ===
  const THEME_PALETTE = {
    nebula: { base: [138, 128, 255], hot: [255, 255, 255], dim: [70, 66, 120] },
    ember: { base: [255, 140, 92], hot: [255, 240, 220], dim: [120, 60, 40] },
    verdant: { base: [96, 230, 175], hot: [235, 255, 245], dim: [40, 100, 80] },
    orchid: { base: [255, 130, 195], hot: [255, 240, 250], dim: [110, 50, 130] }
  };

  // === 状态 ===
  const state = {
    glyph: 'A',
    charset: CHARSETS.standard,
    res: 96,
    contrast: 1.2,
    invert: false,
    autopulse: true,
    mode: 'heat',
    theme: 'nebula',
    cols: 0,
    rows: 0,
    cellW: 0,
    cellH: 0,
    fontPx: 0,
    grid: [],          // [{lum, ox, oy, heat, dx, dy, scramble, scrambleT}]
    ripples: [],       // {x, y, t0, ox, oy}
    mouse: { x: -1e4, y: -1e4 },
    revealT0: performance.now(),
    autoT0: performance.now()
  };

  // ============================================================
  // 字形采样：把输入的字形绘制到离屏画布，采样亮度网格
  // ============================================================
  function sampleGlyph(text) {
    const off = document.createElement('canvas');
    const octx = off.getContext('2d', { willReadFrequently: true });
    const cols = state.cols;
    off.width = cols;
    off.height = state.rows;

    octx.fillStyle = '#000';
    octx.fillRect(0, 0, cols, state.rows);

    // 计算适配字体尺寸：先试画再收缩
    let fontSize = Math.min(state.rows * 0.92, cols * 1.6);
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#fff';

    const measure = () => {
      octx.font = `700 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
      const m = octx.measureText(text);
      return { w: m.width, h: fontSize };
    };

    let m = measure();
    const maxW = cols * 0.92;
    const maxH = state.rows * 0.92;
    const scale = Math.min(maxW / m.w, maxH / m.h, 1);
    fontSize = Math.max(6, Math.floor(fontSize * scale * 0.98));
    m = measure();

    octx.fillText(text, cols / 2, state.rows / 2 + m.h * 0.05);

    const data = octx.getImageData(0, 0, cols, state.rows).data;
    return data;
  }

  function rebuildGrid() {
    const text = state.glyph || 'A';
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 依据精度与视口宽推算列数（字符单元格约 9px 逻辑宽）
    const targetCols = Math.round(state.res * (vw / 1440));
    state.cols = Math.max(40, Math.min(targetCols, Math.floor(vw / 8)));
    state.cellW = vw / state.cols;
    state.cellH = state.cellW * 1.85; // 等宽字符纵横比
    state.rows = Math.max(24, Math.floor(vh / state.cellH));
    state.fontPx = Math.max(8, state.cellW * 1.25);

    const data = sampleGlyph(text);
    const grid = [];
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const idx = (y * state.cols + x) * 4;
        let lum = data[idx] / 255; // 红通道即亮度（白字黑底）
        lum = Math.min(1, Math.max(0, (lum - 0.5) * state.contrast + 0.5));
        if (state.invert) lum = 1 - lum;
        grid.push({
          lum,
          ox: (x + 0.5) * state.cellW,
          oy: (y + 0.5) * state.cellH,
          heat: 0,
          dx: 0,
          dy: 0,
          scramble: 0,
          scrambleT: Math.random() * 1000
        });
      }
    }
    state.grid = grid;
    state.revealT0 = performance.now();
    teleGrid.textContent = `${state.cols}×${state.rows}`;
    teleGlyph.textContent = text.slice(0, 6);
  }

  // ============================================================
  // 渲染循环
  // ============================================================
  let lastFrame = performance.now();
  let fpsAccum = 0;
  let fpsCount = 0;

  function pickChar(lum, heat) {
    const chars = state.charset;
    // 热度会“烧穿”到更亮的字符
    const boosted = Math.min(1, lum + heat * 0.55);
    const idx = Math.floor(boosted * (chars.length - 1) + 0.0001);
    return chars[Math.max(0, Math.min(chars.length - 1, idx))];
  }

  function mixColor(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    // FPS 遥测
    fpsAccum += dt;
    fpsCount++;
    if (fpsAccum > 0.5) {
      teleFps.textContent = Math.round(fpsCount / fpsAccum);
      fpsAccum = 0;
      fpsCount = 0;
    }

    const pal = THEME_PALETTE[state.theme];
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(6, 6, 14, 0.32)'; // 拖影残像
    ctx.fillRect(0, 0, vw, vh);

    ctx.font = `${state.fontPx}px 'Share Tech Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const revealAge = (now - state.revealT0) / 1000;
    const mouseR = 170;
    const mode = state.mode;

    // 清理过期涟漪（2.2s 生命周期）
    state.ripples = state.ripples.filter((r) => now - r.t0 < 2200);

    for (let i = 0; i < state.grid.length; i++) {
      const cell = state.grid[i];

      // --- 光标热场 ---
      const mdx = cell.ox - state.mouse.x;
      const mdy = cell.oy - state.mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      const proximity = mdist < mouseR ? 1 - mdist / mouseR : 0;
      const targetHeat = proximity * proximity;
      cell.heat += (targetHeat - cell.heat) * Math.min(1, dt * 9);

      // --- 涟漪冲击波 ---
      let rippleLift = 0;
      let ripplePush = 0;
      for (const r of state.ripples) {
        const age = (now - r.t0) / 1000;
        const radius = age * 620;
        const rdx = cell.ox - r.x;
        const rdy = cell.oy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const band = Math.abs(rdist - radius);
        if (band < 90) {
          const energy = (1 - band / 90) * Math.max(0, 1 - age / 2.2);
          rippleLift = Math.max(rippleLift, energy);
          if (rdist > 1 && mode === 'displace') {
            ripplePush = Math.max(ripplePush, energy * 26);
            cell.dx += (rdx / rdist) * ripplePush * dt * 6;
            cell.dy += (rdy / rdist) * ripplePush * dt * 6;
          }
        }
      }

      // --- 交互模式 ---
      if (mode === 'scramble' && cell.heat > 0.12) {
        cell.scrambleT += dt * (10 + cell.heat * 40);
        cell.scramble = Math.min(1, cell.heat * 1.4);
      } else if (mode === 'heat') {
        cell.scramble = Math.max(0, cell.scramble - dt * 3);
      } else if (mode === 'displace' && proximity > 0) {
        const dirX = mdist > 1 ? mdx / mdist : 0;
        const dirY = mdist > 1 ? mdy / mdist : -1;
        const push = proximity * proximity * 34;
        cell.dx += dirX * push * dt * 7;
        cell.dy += dirY * push * dt * 7;
      }

      // --- 弹簧归位（非线性回弹） ---
      const k = 42;
      const damp = 0.86;
      cell.dx += -cell.ox * 0 - (cell.dx) * 0;
      const springX = (0 - cell.dx) * k * dt - cell.dx * (1 - damp) * dt * 12;
      cell.dx += -cell.dx * Math.min(1, dt * 8.5);
      cell.dy += -cell.dy * Math.min(1, dt * 8.5);

      // --- 揭示动画：从中心向外扫开 ---
      const revealCenter = Math.hypot(cell.ox - vw / 2, cell.oy - vh / 2);
      const revealThreshold = revealAge * 900;
      let reveal = Math.min(1, Math.max(0, (revealThreshold - revealCenter) / 160));
      if (cell.lum < 0.05 && cell.heat < 0.01 && rippleLift < 0.01) continue;

      const heat = Math.min(1, cell.heat + rippleLift * 0.9);
      const lum = cell.lum * reveal;
      if (lum < 0.02 && heat < 0.02) continue;

      // --- 选字符 ---
      let ch = pickChar(lum, heat);
      if (cell.scramble > 0.05 && Math.random() < cell.scramble) {
        ch = SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0];
      }
      if (ch === ' ') continue;

      // --- 颜色：暗调 → 主题色 → 白热 ---
      const intensity = Math.min(1, lum + heat);
      let color;
      if (intensity < 0.45) {
        color = mixColor(pal.dim, pal.base, intensity / 0.45);
      } else {
        color = mixColor(pal.base, pal.hot, (intensity - 0.45) / 0.55);
      }
      const alpha = 0.28 + intensity * 0.72;

      const px = cell.ox + cell.dx;
      const py = cell.oy + cell.dy + (rippleLift * -6);

      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha.toFixed(3)})`;
      ctx.fillText(ch, px, py);

      // 白热核心额外辉光
      if (heat > 0.55) {
        ctx.save();
        ctx.shadowColor = `rgba(${pal.hot[0]},${pal.hot[1]},${pal.hot[2]},${(heat - 0.5).toFixed(2)})`;
        ctx.shadowBlur = 12;
        ctx.fillText(ch, px, py);
        ctx.restore();
      }
    }

    // --- 自动脉冲 ---
    if (state.autopulse && now - state.autoT0 > 5200) {
      state.autoT0 = now;
      spawnRipple(vw * (0.25 + Math.random() * 0.5), vh * (0.25 + Math.random() * 0.5), now);
    }

    requestAnimationFrame(frame);
  }

  function spawnRipple(x, y, now) {
    state.ripples.push({ x, y, t0: now });
    if (state.ripples.length > 6) state.ripples.shift();
  }

  // ============================================================
  // 乱码揭示（标题）
  // ============================================================
  function runScrambleReveal(el) {
    const original = el.textContent;
    const duration = 1100;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const revealCount = Math.floor(eased * original.length);
      let out = original.slice(0, revealCount);
      for (let i = revealCount; i < original.length; i++) {
        out += SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = original;
    }
    requestAnimationFrame(tick);
  }

  // ============================================================
  // Toast
  // ============================================================
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  // ============================================================
  // 导出：复制矩阵文本
  // ============================================================
  function exportText() {
    const lines = [];
    for (let y = 0; y < state.rows; y++) {
      let line = '';
      for (let x = 0; x < state.cols; x++) {
        line += pickChar(state.grid[y * state.cols + x].lum, 0);
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    return lines.join('\n');
  }

  async function copyMatrix() {
    const text = exportText();
    try {
      await navigator.clipboard.writeText(text);
      toast('MATRIX COPIED · 矩阵已复制');
    } catch (err) {
      toast('CLIPBOARD BLOCKED · 请手动复制');
    }
  }

  // ============================================================
  // 事件绑定
  // ============================================================
  function bindEvents() {
    // 光标追踪
    window.addEventListener('pointermove', (e) => {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      state.mouse.x = -1e4;
      state.mouse.y = -1e4;
    });

    // 点击冲击波
    canvas.addEventListener('pointerdown', (e) => {
      spawnRipple(e.clientX, e.clientY, performance.now());
    });

    btnPulse.addEventListener('click', () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      spawnRipple(vw / 2, vh / 2, performance.now());
      toast('PULSE FIRED · 冲击波已触发');
    });

    btnCopy.addEventListener('click', copyMatrix);

    // 字形输入
    let rebuildTimer = null;
    glyphInput.addEventListener('input', () => {
      clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(() => {
        state.glyph = glyphInput.value.trim() || 'A';
        rebuildGrid();
      }, 240);
    });

    presetChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      presetChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
      btn.classList.add('is-active');
      glyphInput.value = btn.dataset.glyph;
      state.glyph = btn.dataset.glyph;
      rebuildGrid();
    });

    // 字符梯度
    setGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.set-btn');
      if (!btn) return;
      setGrid.querySelectorAll('.set-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.charset = CHARSETS[btn.dataset.set];
    });

    // 交互模式
    modeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      modeGrid.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.mode = btn.dataset.mode;
    });

    // 主题
    themeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-btn');
      if (!btn) return;
      themeGrid.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.theme = btn.dataset.theme;
      document.body.dataset.theme = state.theme;
    });

    // 滑块
    rngRes.addEventListener('input', () => {
      state.res = Number(rngRes.value);
      outRes.textContent = state.res;
      clearTimeout(rngRes._t);
      rngRes._t = setTimeout(rebuildGrid, 160);
    });

    rngContrast.addEventListener('input', () => {
      state.contrast = Number(rngContrast.value) / 100;
      outContrast.textContent = rngContrast.value;
      rebuildGrid();
    });

    // 开关
    chkInvert.addEventListener('change', () => {
      state.invert = chkInvert.checked;
      rebuildGrid();
    });

    chkAutopulse.addEventListener('change', () => {
      state.autopulse = chkAutopulse.checked;
    });

    // 面板折叠
    panelToggle.addEventListener('click', () => {
      panel.classList.toggle('is-collapsed');
    });

    // 视口变化
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitCanvas();
        rebuildGrid();
      }, 180);
    });

    // 键盘快捷键：空格触发脉冲
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement !== glyphInput) {
        e.preventDefault();
        spawnRipple(window.innerWidth / 2, window.innerHeight / 2, performance.now());
      }
    });
  }

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(6, 6, 14, 1)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  // ============================================================
  // 启动
  // ============================================================
  function init() {
    fitCanvas();
    rebuildGrid();
    bindEvents();
    scrambleEls.forEach((el) => runScrambleReveal(el));
    // 首屏欢迎脉冲
    setTimeout(() => {
      spawnRipple(window.innerWidth / 2, window.innerHeight / 2, performance.now());
    }, 700);
    requestAnimationFrame(frame);
  }

  // 等待字体加载完成再采样，避免字形测量失真
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init).catch(init);
  } else {
    window.addEventListener('load', init);
  }
})();
