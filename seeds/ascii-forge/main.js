/* ============================================================
   ASCII Forge · 字符锻造炉
   把图像锻造为字符矩阵：光标加热 · 点击淬火 · 多字符集 · 导出
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('asciiCanvas');
  const ctx = canvas.getContext('2d');
  const wrap = document.getElementById('canvasWrap');
  const hintEl = document.getElementById('stageHint');
  const toastEl = document.getElementById('toast');
  const stockGrid = document.getElementById('stockGrid');
  const charsetList = document.getElementById('charsetList');
  const paletteDots = document.getElementById('paletteDots');
  const metaSource = document.getElementById('metaSource');
  const metaGrid = document.getElementById('metaGrid');
  const metaChars = document.getElementById('metaChars');

  // === 主题（氛围配色） ===
  const THEMES = [
    { id: 'ember', label: '余烬', swatch: '#ff7a4d' },
    { id: 'verdant', label: '翠林', swatch: '#4ce6a5' },
    { id: 'abyss', label: '深渊', swatch: '#5aa2ff' },
    { id: 'orchid', label: '兰曦', swatch: '#ff6fb5' }
  ];

  // === 字符集（由暗到亮） ===
  const CHARSETS = [
    { id: 'standard', label: 'STANDARD', chars: ' .:-=+*#%@' },
    { id: 'blocks', label: 'BLOCKS', chars: ' \u00b0\u2591\u2592\u2593\u2588' },
    { id: 'minimal', label: 'MINIMAL', chars: ' .oO@' },
    { id: 'binary', label: 'BINARY', chars: ' 01' },
    { id: 'dots', label: 'DOTS', chars: ' ,.;!?*&%$#@' },
    { id: 'runes', label: 'RUNES', chars: ' \u00b7\u2022\u25e6\u25aa\u25a0\u25c6\u2726\u2727' }
  ];

  // === 状态 ===
  const state = {
    theme: 'ember',
    charset: CHARSETS[0].chars,
    res: 110,
    contrast: 1.0,
    bright: 0.0,
    glow: 0.8,
    invert: false,
    colorMode: false,
    sourceName: 'ORB-01',
    img: null,          // HTMLCanvasElement（归一化后的源图）
    grid: [],           // [{ch, lum, r, g, b}]
    cols: 0,
    rows: 0,
    cellW: 0,
    cellH: 0,
    fontPx: 0,
    mouse: { x: -1e4, y: -1e4 },
    ripples: []         // 淬火涟漪 {x, y, t0}
  };

  // ============================================================
  // 程序化坯料（Stock）——离屏 canvas 生成演示图
  // ============================================================
  const STOCKS = [
    { id: 'ORB-01', label: 'ORB', gen: genOrb },
    { id: 'WAVE-02', label: 'WAVE', gen: genWaves },
    { id: 'TORUS-3', label: 'TORUS', gen: genTorus },
    { id: 'HEART-4', label: 'HEART', gen: genHeart },
    { id: 'FORGE-5', label: 'TEXT', gen: genText },
    { id: 'NOISE-6', label: 'NOISE', gen: genNoise }
  ];

  function makeStock(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function genOrb(w, h) {
    const c = makeStock(w, h), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.48, R = Math.min(w, h) * 0.4;
    const grad = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#c0c8e8');
    grad.addColorStop(0.8, '#3a3f66');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    return c;
  }

  function genWaves(w, h) {
    const c = makeStock(w, h), g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w * 8, v = y / h * 8;
        const s = Math.sin(u * 1.4 + Math.sin(v * 0.8)) + Math.sin(v * 2.1 + Math.cos(u * 0.6) * 1.5);
        const t = Math.sin(u * 0.9) * Math.cos(v * 1.3);
        const l = Math.max(0, Math.min(1, (s + t + 2) / 4));
        const i = (y * w + x) * 4;
        const val = l * 255;
        d[i] = val * 0.75; d[i + 1] = val * 0.85; d[i + 2] = val; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function genTorus(w, h) {
    const c = makeStock(w, h), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3, r = R * 0.42;
    for (let a = 0; a < 360; a += 0.4) {
      for (let b = 0; b < 360; b += 2.4) {
        const ra = a * Math.PI / 180, rb = b * Math.PI / 180;
        const x = (R + r * Math.cos(rb)) * Math.cos(ra);
        const y = (R + r * Math.cos(rb)) * Math.sin(ra) * 0.85;
        const z = r * Math.sin(rb);
        const l = Math.max(0.05, 0.55 + z / r * 0.45);
        g.fillStyle = 'rgba(' + Math.round(160 * l + 60) + ',' + Math.round(170 * l + 40) + ',' + Math.round(255 * l) + ',' + (0.25 + l * 0.5) + ')';
        g.fillRect(cx + x, cy + y, 2.2, 2.2);
      }
    }
    return c;
  }

  function genHeart(w, h) {
    const c = makeStock(w, h), g = c.getContext('2d');
    g.fillStyle = '#050505'; g.fillRect(0, 0, w, h);
    g.translate(w / 2, h * 0.56);
    g.scale(w / 42, w / 42);
    const grad = g.createLinearGradient(0, -16, 0, 16);
    grad.addColorStop(0, '#ffd9e8'); grad.addColorStop(0.5, '#ff5e8a'); grad.addColorStop(1, '#5a0f2e');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 14);
    g.bezierCurveTo(-20, 0, -14, -16, 0, -7);
    g.bezierCurveTo(14, -16, 20, 0, 0, 14);
    g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0);
    return c;
  }

  function genText(w, h) {
    const c = makeStock(w, h), g = c.getContext('2d');
    g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = '900 ' + (h * 0.34) + 'px Outfit, Inter, sans-serif';
    g.fillText('FORGE', w / 2, h * 0.34);
    g.font = '300 ' + (h * 0.1) + 'px Inter, sans-serif';
    g.fillStyle = '#9aa3c0';
    g.fillText('ascii \u00b7 forge \u00b7 ascii \u00b7 forge', w / 2, h * 0.62);
    return c;
  }

  function genNoise(w, h) {
    const c = makeStock(w, h), g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const field = new Float32Array(w * h);
    for (let i = 0; i < field.length; i++) field[i] = rnd();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, wsum = 0;
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            const xx = Math.min(w - 1, Math.max(0, x + ox));
            const yy = Math.min(h - 1, Math.max(0, y + oy));
            const wt = 1 / (1 + Math.abs(ox) + Math.abs(oy));
            sum += field[yy * w + xx] * wt; wsum += wt;
          }
        }
        const l = (sum / wsum) ** 1.4;
        const i = (y * w + x) * 4;
        d[i] = l * 255 * 0.9; d[i + 1] = l * 255 * 0.95; d[i + 2] = l * 255; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ============================================================
  // ASCII 渲染引擎
  // ============================================================
  function normalizeImage(source) {
    const maxW = 640;
    const ratio = source.height / source.width;
    const w = Math.min(maxW, source.width);
    const h = Math.round(w * ratio);
    const c = makeStock(w, h);
    c.getContext('2d').drawImage(source, 0, 0, w, h);
    return c;
  }

  function buildGrid() {
    if (!state.img) return;
    const src = state.img;
    const cols = state.res;
    const rows = Math.max(2, Math.round(cols * (src.height / src.width) * 0.55)); // 0.55 = 字符纵横比校正
    const g = src.getContext('2d');
    const data = g.getImageData(0, 0, src.width, src.height).data;
    const sw = src.width, sh = src.height;
    const chars = state.charset.length ? state.charset : CHARSETS[0].chars;
    const grid = new Array(cols * rows);

    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        // 采样 2×2 子块均值
        let r = 0, gg = 0, b = 0, n = 0;
        for (let sy = 0; sy < 2; sy++) {
          for (let sx = 0; sx < 2; sx++) {
            const px = Math.min(sw - 1, Math.floor((rx * 2 + sx + 0.5) / (cols * 2) * sw));
            const py = Math.min(sh - 1, Math.floor((ry * 2 + sy + 0.5) / (rows * 2) * sh));
            const i = (py * sw + px) * 4;
            r += data[i]; gg += data[i + 1]; b += data[i + 2]; n++;
          }
        }
        r /= n; gg /= n; b /= n;
        let lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
        // 对比度 + 亮度
        lum = (lum - 0.5) * state.contrast + 0.5 + state.bright;
        if (state.invert) lum = 1 - lum;
        lum = Math.max(0, Math.min(1, lum));
        const idx = Math.min(chars.length - 1, Math.floor(lum * chars.length));
        grid[ry * cols + rx] = { ch: chars[idx], lum, r: r / 255, g: gg / 255, b: b / 255 };
      }
    }
    state.grid = grid;
    state.cols = cols;
    state.rows = rows;
    updateMeta();
    layoutCanvas();
    renderBase();
  }

  function layoutCanvas() {
    const rect = wrap.getBoundingClientRect();
    const availW = rect.width - 8;
    state.cellW = Math.max(4, Math.floor(availW / state.cols));
    state.cellH = Math.round(state.cellW * 1.0); // 方格绘制，字符偏扁已由采样补偿
    state.fontPx = Math.max(6, Math.round(state.cellW * 1.35));
    canvas.width = state.cellW * state.cols;
    canvas.height = state.cellH * state.rows;
    canvas.style.width = state.cols * state.cellW + 'px';
  }

  function themeRGB(lumBoost) {
    // 由主题 accent 派生画布文字色
    const styles = getComputedStyle(document.body);
    const accent = styles.getPropertyValue('--accent').trim();
    return accentToRgb(accent, lumBoost);
  }

  function accentToRgb(str) {
    const el = document.createElement('div');
    el.style.color = str;
    document.body.appendChild(el);
    const cs = getComputedStyle(el).color;
    document.body.removeChild(el);
    const m = cs.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255];
  }

  function renderBase() {
    const { grid, cols, rows, cellW, cellH, fontPx } = state;
    const mono = themeRGB();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontPx + "px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y * cols + x];
        if (!cell || cell.ch === ' ') continue;
        const lum = cell.lum;
        if (state.colorMode) {
          ctx.fillStyle = 'rgb(' + Math.round(cell.r * 255) + ',' + Math.round(cell.g * 255) + ',' + Math.round(cell.b * 255) + ')';
        } else {
          const a = 0.22 + lum * 0.78;
          ctx.fillStyle = 'rgba(' + mono[0] + ',' + mono[1] + ',' + mono[2] + ',' + a.toFixed(3) + ')';
        }
        ctx.fillText(cell.ch, x * cellW + cellW / 2, y * cellH + cellH / 2);
      }
    }
  }

  // === 热度叠加层（光标加热 + 淬火涟漪） ===
  let heatCells = []; // 上帧被加热的单元格，用于还原

  function clearHeat() {
    if (!heatCells.length) return;
    const { cellW, cellH, fontPx } = state;
    ctx.font = fontPx + "px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mono = themeRGB();
    for (const c of heatCells) {
      const cell = state.grid[c.y * state.cols + c.x];
      if (!cell) continue;
      ctx.clearRect(c.x * cellW, c.y * cellH, cellW, cellH);
      if (cell.ch !== ' ') {
        if (state.colorMode) {
          ctx.fillStyle = 'rgb(' + Math.round(cell.r * 255) + ',' + Math.round(cell.g * 255) + ',' + Math.round(cell.b * 255) + ')';
        } else {
          const a = 0.22 + cell.lum * 0.78;
          ctx.fillStyle = 'rgba(' + mono[0] + ',' + mono[1] + ',' + mono[2] + ',' + a.toFixed(3) + ')';
        }
        ctx.fillText(cell.ch, c.x * cellW + cellW / 2, c.y * cellH + cellH / 2);
      }
    }
    heatCells = [];
  }

  function heatFrame(now) {
    if (!state.grid.length) { requestAnimationFrame(heatFrame); return; }
    clearHeat();
    const { cols, rows, cellW, cellH, fontPx, glow } = state;
    const heatSet = new Set();
    const radius = 5.5; // 热圈半径（格）

    // 光标加热
    const m = state.mouse;
    if (m.x >= 0) {
      const gx = m.x / cellW, gy = m.y / cellH;
      for (let y = Math.max(0, Math.floor(gy - radius)); y <= Math.min(rows - 1, Math.ceil(gy + radius)); y++) {
        for (let x = Math.max(0, Math.floor(gx - radius)); x <= Math.min(cols - 1, Math.ceil(gx + radius)); x++) {
          const d = Math.hypot(x - gx, y - gy);
          if (d < radius) heatSet.add(y * cols + x);
        }
      }
    }

    // 淬火涟漪（扩散环带）
    state.ripples = state.ripples.filter((rp) => now - rp.t0 < 1400);
    for (const rp of state.ripples) {
      const t = (now - rp.t0) / 1400;
      const ring = t * 26;
      const gx = rp.x / cellW, gy = rp.y / cellH;
      const r0 = Math.max(1, ring - 2.4), r1 = ring + 2.4;
      for (let y = Math.max(0, Math.floor(gy - r1)); y <= Math.min(rows - 1, Math.ceil(gy + r1)); y++) {
        for (let x = Math.max(0, Math.floor(gx - r1)); x <= Math.min(cols - 1, Math.ceil(gx + r1)); x++) {
          const d = Math.hypot(x - gx, y - gy);
          if (d >= r0 && d <= r1) heatSet.add(y * cols + x);
        }
      }
    }

    if (!heatSet.size) { requestAnimationFrame(heatFrame); return; }

    // 绘制加热单元格（白热 + 呼吸）
    ctx.font = fontPx + "px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mono = themeRGB();
    const mx = m.x / cellW, my = m.y / cellH;
    for (const key of heatSet) {
      const x = key % cols, y = Math.floor(key / cols);
      const cell = state.grid[key];
      if (!cell) continue;
      let boost = 0;
      if (m.x >= 0) {
        const d = Math.hypot(x - mx, y - my);
        if (d < radius) boost = Math.max(boost, (1 - d / radius) * glow);
      }
      for (const rp of state.ripples) {
        const t = (now - rp.t0) / 1400;
        const d = Math.hypot(x - rp.x / cellW, y - rp.y / cellH);
        const ring = t * 26;
        if (Math.abs(d - ring) < 2.4) boost = Math.max(boost, (1 - t) * glow * 1.2);
      }
      if (boost <= 0.01) continue;
      heatCells.push({ x, y });
      ctx.clearRect(x * cellW, y * cellH, cellW, cellH);
      if (cell.ch !== ' ') {
        if (state.colorMode) {
          ctx.fillStyle = 'rgb(' + Math.round(Math.min(255, cell.r * 255 + boost * 160)) + ',' +
            Math.round(Math.min(255, cell.g * 255 + boost * 140)) + ',' +
            Math.round(Math.min(255, cell.b * 255 + boost * 120)) + ')';
        } else {
          const a = Math.min(1, 0.22 + cell.lum * 0.78 + boost * 0.9);
          ctx.fillStyle = 'rgba(' + Math.min(255, mono[0] + boost * 150) + ',' +
            Math.min(255, mono[1] + boost * 150) + ',' +
            Math.min(255, mono[2] + boost * 150) + ',' + a.toFixed(3) + ')';
        }
        ctx.shadowColor = 'rgba(255,240,220,0.8)';
        ctx.shadowBlur = boost * 14;
        ctx.fillText(cell.ch, x * cellW + cellW / 2, y * cellH + cellH / 2);
        ctx.shadowBlur = 0;
      }
    }
    requestAnimationFrame(heatFrame);
  }
  requestAnimationFrame(heatFrame);

  function updateMeta() {
    metaSource.textContent = state.sourceName;
    metaGrid.textContent = state.cols + ' \u00d7 ' + state.rows;
    let n = 0;
    for (const c of state.grid) if (c && c.ch !== ' ') n++;
    metaChars.textContent = n.toLocaleString() + ' chars';
  }

  // ============================================================
  // 交互 · 光标 / 淬火 / 上传
  // ============================================================
  wrap.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    state.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    if (state.mouse.x < 0 || state.mouse.y < 0 || state.mouse.x > canvas.width || state.mouse.y > canvas.height) {
      state.mouse.x = -1e4;
    }
  });
  wrap.addEventListener('pointerleave', () => { state.mouse.x = -1e4; });
  wrap.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    state.ripples.push({
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
      t0: performance.now()
    });
    if (state.ripples.length > 6) state.ripples.shift();
  });

  // 光标辉光跟随
  const cursorGlow = document.querySelector('.cursor-glow');
  let cgx = 0, cgy = 0, cgtx = 0, cgty = 0;
  window.addEventListener('pointermove', (e) => { cgtx = e.clientX; cgty = e.clientY; });
  (function glowLoop() {
    cgx += (cgtx - cgx) * 0.09;
    cgy += (cgty - cgy) * 0.09;
    cursorGlow.style.left = cgx + 'px';
    cursorGlow.style.top = cgy + 'px';
    requestAnimationFrame(glowLoop);
  })();

  // 拖拽 / 粘贴上传
  const uploadZone = document.querySelector('.upload-zone');
  ['dragenter', 'dragover'].forEach((ev) =>
    document.addEventListener(ev, (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    document.addEventListener(ev, (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); }));
  document.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadFile(f);
  });
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const it of items) {
      if (it.type.startsWith('image/')) { loadFile(it.getAsFile()); break; }
    }
  });
  document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
    e.target.value = '';
  });

  function loadFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSource(normalizeImage(img), file.name.toUpperCase().slice(0, 14));
      URL.revokeObjectURL(url);
      showToast('已上炉 · ' + file.name);
    };
    img.src = url;
  }

  function setSource(srcCanvas, name) {
    state.img = srcCanvas;
    state.sourceName = name || 'CUSTOM';
    hintEl.classList.add('hidden');
    buildGrid();
  }

  // ============================================================
  // 导出
  // ============================================================
  function buildText() {
    const lines = [];
    for (let y = 0; y < state.rows; y++) {
      let line = '';
      for (let x = 0; x < state.cols; x++) {
        const c = state.grid[y * state.cols + x];
        line += c ? c.ch : ' ';
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    return lines.join('\n');
  }

  document.getElementById('btnCopy').addEventListener('click', async () => {
    if (!state.grid.length) return;
    try {
      await navigator.clipboard.writeText(buildText());
      showToast('字符矩阵已复制 \u2713');
    } catch (_) {
      showToast('复制失败，请用导出 .txt');
    }
  });

  function download(href, name) {
    const a = document.createElement('a');
    a.href = href; a.download = name;
    a.click();
  }

  document.getElementById('btnTxt').addEventListener('click', () => {
    if (!state.grid.length) return;
    const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' });
    download(URL.createObjectURL(blob), 'ascii-forge.txt');
    showToast('.txt 已导出 \u2713');
  });

  document.getElementById('btnPng').addEventListener('click', () => {
    if (!state.grid.length) return;
    renderBase(); // 导出干净帧
    download(canvas.toDataURL('image/png'), 'ascii-forge.png');
    showToast('.png 已导出 \u2713');
  });

  // === Toast ===
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ============================================================
  // 控件绑定
  // ============================================================
  // 坯料卡
  STOCKS.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'stock-card';
    card.dataset.id = s.id;
    const thumb = makeStock(120, 120);
    s.gen(120, 120);
    thumb.getContext('2d').drawImage(s.gen(120, 120), 0, 0, 120, 120);
    card.appendChild(thumb);
    const label = document.createElement('span');
    label.textContent = s.label;
    card.appendChild(label);
    card.addEventListener('click', () => {
      document.querySelectorAll('.stock-card').forEach((el) => el.classList.remove('active'));
      card.classList.add('active');
      setSource(s.gen(640, 420), s.id);
    });
    stockGrid.appendChild(card);
  });

  // 字符集
  CHARSETS.forEach((cs, i) => {
    const chip = document.createElement('button');
    chip.className = 'charset-chip' + (i === 0 ? ' active' : '');
    chip.textContent = cs.label;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.charset-chip').forEach((el) => el.classList.remove('active'));
      chip.classList.add('active');
      state.charset = cs.chars;
      buildGrid();
    });
    charsetList.appendChild(chip);
  });
  document.getElementById('customCharset').addEventListener('input', (e) => {
    const v = e.target.value;
    if (v.trim().length >= 2) {
      state.charset = v;
      document.querySelectorAll('.charset-chip').forEach((el) => el.classList.remove('active'));
      buildGrid();
    }
  });

  // 滑块
  function bindRange(id, valId, key, fmt) {
    const el = document.getElementById(id);
    const out = document.getElementById(valId);
    const upd = () => {
      state[key] = parseFloat(el.value);
      out.textContent = fmt(state[key]);
      const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
      el.style.setProperty('--fill', pct + '%');
    };
    el.addEventListener('input', () => { upd(); buildGrid(); });
    upd();
  }
  bindRange('rangeRes', 'valRes', 'res', (v) => Math.round(v));
  bindRange('rangeContrast', 'valContrast', 'contrast', (v) => v.toFixed(2));
  bindRange('rangeBright', 'valBright', 'bright', (v) => (v >= 0 ? '+' : '') + v.toFixed(2));
  bindRange('rangeGlow', 'valGlow', 'glow', (v) => v.toFixed(2));

  // 开关
  function bindToggle(id, key, cb) {
    const el = document.getElementById(id);
    el.addEventListener('click', () => {
      const on = el.getAttribute('aria-pressed') !== 'true';
      el.setAttribute('aria-pressed', on);
      state[key] = on;
      if (cb) cb();
    });
  }
  bindToggle('toggleInvert', 'invert', buildGrid);
  bindToggle('toggleColor', 'colorMode', renderBase);

  // 配色
  THEMES.forEach((t) => {
    const dot = document.createElement('button');
    dot.className = 'p-dot' + (t.id === state.theme ? ' active' : '');
    dot.style.background = t.swatch;
    dot.style.color = t.swatch;
    dot.title = t.label;
    dot.addEventListener('click', () => {
      document.body.dataset.theme = t.id;
      state.theme = t.id;
      document.querySelectorAll('.p-dot').forEach((el) => el.classList.remove('active'));
      dot.classList.add('active');
      renderBase();
    });
    paletteDots.appendChild(dot);
  });

  // 随机锻造
  document.getElementById('btnRandom').addEventListener('click', () => {
    const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const cs = CHARSETS[Math.floor(Math.random() * CHARSETS.length)];
    document.querySelectorAll('.charset-chip').forEach((el, i) =>
      el.classList.toggle('active', CHARSETS[i] === cs));
    document.querySelectorAll('.stock-card').forEach((el) =>
      el.classList.toggle('active', el.dataset.id === stock.id));
    state.charset = cs.chars;
    state.contrast = 0.7 + Math.random() * 1.3;
    state.bright = (Math.random() - 0.5) * 0.4;
    syncSliders();
    setSource(stock.gen(640, 420), stock.id);
    showToast('随机锻造 \u2192 ' + stock.id + ' \u00b7 ' + cs.label);
  });

  function syncSliders() {
    const c = document.getElementById('rangeContrast');
    const b = document.getElementById('rangeBright');
    c.value = state.contrast; b.value = state.bright;
    document.getElementById('valContrast').textContent = state.contrast.toFixed(2);
    document.getElementById('valBright').textContent = (state.bright >= 0 ? '+' : '') + state.bright.toFixed(2);
    [c, b].forEach((el) => el.style.setProperty('--fill',
      ((el.value - el.min) / (el.max - el.min)) * 100 + '%'));
  }

  // 窗口尺寸变化 → 重排
  let rsTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(rsTimer);
    rsTimer = setTimeout(() => { layoutCanvas(); renderBase(); }, 180);
  });

  // === 初始化：默认上料 ORB ===
  setSource(genOrb(640, 420), 'ORB-01');
  document.querySelector('.stock-card').classList.add('active');
})();
