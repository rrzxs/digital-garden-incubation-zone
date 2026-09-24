/**
 * Type Terrain · 字形地形
 * 沉浸式字形地形交互体验。输入文字即刻隆起为 3D 地形，
 * Simplex 噪声风化、光标力场雕刻、脉冲冲击波与粒子流场。
 */
(() => {
  'use strict';

  // === DOM Elements ===
  const terrainCanvas = document.getElementById('terrain-canvas');
  const particleCanvas = document.getElementById('particle-canvas');
  const tctx = terrainCanvas.getContext('2d');
  const pctx = particleCanvas.getContext('2d');
  const cursorGlow = document.getElementById('cursor-glow');
  const input = document.getElementById('terrain-input');
  const randomBtn = document.getElementById('random-btn');
  const pulseBtn = document.getElementById('pulse-btn');
  const quickWords = document.getElementById('quick-words');
  const themeSwitcher = document.getElementById('theme-switcher');
  const modeToggle = document.getElementById('interaction-mode');
  const renderModes = document.getElementById('render-modes');
  const ampSlider = document.getElementById('amp-slider');
  const erosionSlider = document.getElementById('erosion-slider');
  const gridSlider = document.getElementById('grid-slider');
  const ampOut = document.getElementById('amp-out');
  const erosionOut = document.getElementById('erosion-out');
  const gridOut = document.getElementById('grid-out');
  const tmVerts = document.getElementById('tm-verts');
  const tmPeak = document.getElementById('tm-peak');
  const tmYaw = document.getElementById('tm-yaw');
  const tmMode = document.getElementById('tm-mode');

  // === Simplex Noise (内置轻量实现) ===
  const SimplexNoise = (() => {
    const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    const p = new Uint8Array(256);
    let seed = 1337;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(random() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    return {
      noise2D(xin, yin) {
        let n0 = 0, n1 = 0, n2 = 0;
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s), j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const x0 = xin - (i - t), y0 = yin - (j - t);
        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        const ii = i & 255, jj = j & 255;
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) { t0 *= t0; const gi = permMod12[ii + perm[jj]]; n0 = t0 * t0 * (grad3[gi][0] * x0 + grad3[gi][1] * y0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) { t1 *= t1; const gi = permMod12[ii + i1 + perm[jj + j1]]; n1 = t1 * t1 * (grad3[gi][0] * x1 + grad3[gi][1] * y1); }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) { t2 *= t2; const gi = permMod12[ii + 1 + perm[jj + 1]]; n2 = t2 * t2 * (grad3[gi][0] * x2 + grad3[gi][1] * y2); }
        return 70 * (n0 + n1 + n2);
      }
    };
  })();
  const simplex = SimplexNoise;

  // === State ===
  const state = {
    mode: 'orbit',           // orbit | sculpt
    render: 'wire',          // wire | dots | solid
    amp: 1.0,
    erosion: 0.35,
    gridSize: 96,
    yaw: 0.6,
    pitch: 0.42,
    autoSpin: 0.0016,
    dragging: false,
    mouse: { x: 0, y: 0, tx: 0, ty: 0, active: false },
    pulses: [],
    time: 0
  };

  const themes = {
    abyss:   { lines: ['135,150,255', '80,220,240', '180,120,255'], peak: '245,200,255' },
    aurora:  { lines: ['110,240,180', '170,240,110', '80,230,200'], peak: '220,255,200' },
    ember:   { lines: ['250,140,60', '250,200,80', '240,90,80'],    peak: '255,230,160' },
    verdant: { lines: ['110,170,250', '140,150,250', '90,200,250'], peak: '200,225,255' }
  };
  let currentTheme = 'abyss';

  // === Text → Heightmap (离屏采样) ===
  const sampler = document.createElement('canvas');
  const sctx = sampler.getContext('2d', { willReadFrequently: true });

  function buildHeightmap(text, size) {
    const S = 256;
    sampler.width = S; sampler.height = S;
    sctx.clearRect(0, 0, S, S);
    sctx.fillStyle = '#fff';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    let fontSize = 200;
    sctx.font = `800 ${fontSize}px Outfit, Inter, sans-serif`;
    while (sctx.measureText(text).width > S - 24 && fontSize > 20) {
      fontSize -= 8;
      sctx.font = `800 ${fontSize}px Outfit, Inter, sans-serif`;
    }
    sctx.fillText(text, S / 2, S / 2 + fontSize * 0.04);

    const img = sctx.getImageData(0, 0, S, S).data;
    const map = new Float32Array(size * size);
    const step = S / size;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const sx = Math.min(S - 1, Math.floor(i * step + step / 2));
        const sy = Math.min(S - 1, Math.floor(j * step + step / 2));
        // 高斯式柔化采样（3x3）
        let acc = 0, wsum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = Math.max(0, Math.min(S - 1, sx + dx * step * 0.9));
            const y = Math.max(0, Math.min(S - 1, sy + dy * step * 0.9));
            const a = img[(Math.floor(y) * S + Math.floor(x)) * 4 + 3] / 255;
            const w = 1 / (1 + dx * dx + dy * dy);
            acc += a * w; wsum += w;
          }
        }
        map[j * size + i] = acc / wsum;
      }
    }
    return map;
  }

  let heightmap = buildHeightmap('TERRAIN', state.gridSize);

  // === Particles ===
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: 0, vy: 0,
    life: Math.random() * 400 + 200,
    size: Math.random() * 1.6 + 0.6
  }));

  // === Resize ===
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [terrainCanvas, particleCanvas]) {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
    }
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // === Projection ===
  function project(gx, gz, h, w, hgt) {
    const s = Math.min(w, hgt) * 0.62;
    const x = (gx - 0.5) * s;
    const z = (gz - 0.5) * s;
    const y = -h * s * 0.42;
    const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
    const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const y1 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const depth = 2.2 / (2.2 + z2 / s);
    return {
      sx: w / 2 + x1 * depth,
      sy: hgt / 2 + y1 * depth + hgt * 0.06,
      depth
    };
  }

  // === Render Terrain ===
  function renderTerrain(w, h) {
    const size = state.gridSize;
    const theme = themes[currentTheme];
    const t = state.time;

    // 高度 = 字形 × 振幅 + 噪声风化 + 脉冲
    const getHeight = (i, j) => {
      const base = heightmap[j * size + i];
      const n = simplex.noise2D(i * 0.09 + t * 0.24, j * 0.09 - t * 0.18);
      let h = base * state.amp * (0.85 + 0.15 * n);
      // 风化：字形边缘被噪声侵蚀
      if (state.erosion > 0) {
        const e = simplex.noise2D(i * 0.16 - t * 0.35, j * 0.16 + t * 0.3);
        h *= 1 - state.erosion * 0.5 * (0.5 + 0.5 * e) * (1 - base);
        h += state.erosion * 0.06 * Math.max(0, n) * (1 - base);
      }
      // 脉冲冲击波
      for (const p of state.pulses) {
        const d = Math.hypot(i / size - p.x, j / size - p.y);
        const ring = Math.abs(d - p.r);
        if (ring < 0.12) h += p.energy * (1 - ring / 0.12) * 0.5;
      }
      // 雕刻力场
      if (state.mode === 'sculpt' && state.mouse.active) {
        const gx = state.mouse.x / w, gy = state.mouse.y / h;
        const p = project(gx, gy, 0, w, h);
        const dx = (i / size) - gx, dy = (j / size) - gy;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.22) h += (1 - dist / 0.22) * 0.45 * Math.sin(t * 3 + dist * 30);
      }
      return Math.max(0, h);
    };

    // 构建投影网格
    const verts = [];
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const h = getHeight(i, j);
        verts.push({ ...project(i / (size - 1), j / (size - 1), h, w, h), h });
      }
    }

    // 遥测
    let peak = 0;
    for (const v of verts) if (v.h > peak) peak = v.h;
    tmVerts.textContent = size * size;
    tmPeak.textContent = peak.toFixed(2);
    tmYaw.textContent = ((state.yaw * 180 / Math.PI) % 360).toFixed(0) + '°';

    // 绘制
    if (state.render === 'dots') {
      for (const v of verts) {
        if (v.h <= 0.01 && Math.random() > 0.08) continue;
        const c = v.h > 0.55 ? theme.peak : theme.lines[(i2 => i2)(Math.floor(v.h * 7) % 3)];
        tctx.fillStyle = `rgba(${c},${0.25 + v.h * 0.7 * v.depth})`;
        tctx.fillRect(v.sx, v.sy, 1.4 * v.depth, 1.4 * v.depth);
      }
    } else if (state.render === 'solid') {
      // 密度模式：隔行扫描的发光横截面线
      const step = 2;
      for (let j = 0; j < size; j += step) {
        tctx.beginPath();
        let pen = false;
        for (let i = 0; i < size; i++) {
          const v = verts[j * size + i];
          if (v.h <= 0.01) { pen = false; continue; }
          if (!pen) { tctx.moveTo(v.sx, v.sy); pen = true; } else tctx.lineTo(v.sx, v.sy);
        }
        tctx.strokeStyle = `rgba(${theme.lines[1]},0.5)`;
        tctx.lineWidth = 1;
        tctx.stroke();
      }
    } else {
      // 线框模式
      const rowStep = Math.max(2, Math.floor(size / 34));
      for (let j = 0; j < size; j += rowStep) {
        tctx.beginPath();
        let pen = false;
        for (let i = 0; i < size; i++) {
          const v = verts[j * size + i];
          if (!pen) { tctx.moveTo(v.sx, v.sy); pen = true; } else tctx.lineTo(v.sx, v.sy);
        }
        tctx.strokeStyle = `rgba(${theme.lines[0]},0.32)`;
        tctx.lineWidth = 1;
        tctx.stroke();
      }
      const colStep = rowStep;
      for (let i = 0; i < size; i += colStep) {
        tctx.beginPath();
        let pen = false;
        for (let j = 0; j < size; j++) {
          const v = verts[j * size + i];
          if (!pen) { tctx.moveTo(v.sx, v.sy); pen = true; } else tctx.lineTo(v.sx, v.sy);
        }
        tctx.strokeStyle = `rgba(${theme.lines[2]},0.2)`;
        tctx.lineWidth = 1;
        tctx.stroke();
      }
      // 峰值描边（字形轮廓高光）
      tctx.beginPath();
      let pen = false;
      for (let i = 0; i < size; i++) {
        let best = null;
        for (let j = 0; j < size; j++) {
          const v = verts[j * size + i];
          if (!best || v.h > best.h) best = v;
        }
        if (best.h > 0.1) {
          if (!pen) { tctx.moveTo(best.sx, best.sy); pen = true; } else tctx.lineTo(best.sx, best.sy);
        } else pen = false;
      }
      tctx.strokeStyle = `rgba(${theme.peak},0.75)`;
      tctx.lineWidth = 1.4;
      tctx.shadowColor = `rgba(${theme.peak},0.8)`;
      tctx.shadowBlur = 8;
      tctx.stroke();
      tctx.shadowBlur = 0;
    }
  }

  // === Particles ===
  function renderParticles(w, h) {
    const theme = themes[currentTheme];
    for (const pt of particles) {
      const n = simplex.noise2D(pt.x * 3 + state.time * 0.3, pt.y * 3 - state.time * 0.25);
      pt.vx += Math.cos(n * Math.PI * 2) * 0.00012;
      pt.vy += Math.sin(n * Math.PI * 2) * 0.00012;
      // 光标力场
      if (state.mouse.active) {
        const dx = pt.x - state.mouse.x / w, dy = pt.y - state.mouse.y / h;
        const d = Math.hypot(dx, dy);
        if (d < 0.18 && d > 0.001) {
          const f = (1 - d / 0.18) * 0.0006;
          pt.vx += (dx / d) * f;
          pt.vy += (dy / d) * f;
        }
      }
      pt.vx *= 0.96; pt.vy *= 0.96;
      pt.x += pt.vx; pt.y += pt.vy;
      pt.life--;
      if (pt.life <= 0 || pt.x < -0.05 || pt.x > 1.05 || pt.y < -0.05 || pt.y > 1.05) {
        pt.x = Math.random(); pt.y = Math.random();
        pt.vx = pt.vy = 0;
        pt.life = Math.random() * 400 + 200;
      }
      const c = theme.lines[Math.floor(pt.size) % 3];
      pctx.fillStyle = `rgba(${c},${0.14 + pt.life / 1600})`;
      pctx.beginPath();
      pctx.arc(pt.x * w, pt.y * h, pt.size, 0, Math.PI * 2);
      pctx.fill();
    }
  }

  // === Main Loop ===
  function loop() {
    state.time += 0.016;
    const w = window.innerWidth, h = window.innerHeight;

    // 光标弹簧跟随
    state.mouse.x += (state.mouse.tx - state.mouse.x) * 0.08;
    state.mouse.y += (state.mouse.ty - state.mouse.y) * 0.08;
    cursorGlow.style.left = state.mouse.x + 'px';
    cursorGlow.style.top = state.mouse.y + 'px';

    // 自转
    if (!state.dragging) state.yaw += state.autoSpin;

    // 脉冲衰减
    for (const p of state.pulses) { p.r += 0.012; p.energy *= 0.955; }
    state.pulses = state.pulses.filter((p) => p.energy > 0.02);

    tctx.clearRect(0, 0, w, h);
    pctx.clearRect(0, 0, w, h);
    renderTerrain(w, h);
    renderParticles(w, h);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // === Interactions ===
  function emitPulse(clientX, clientY) {
    state.pulses.push({
      x: clientX / window.innerWidth,
      y: clientY / window.innerHeight,
      r: 0, energy: 1
    });
  }

  window.addEventListener('mousemove', (e) => {
    state.mouse.tx = e.clientX;
    state.mouse.ty = e.clientY;
    state.mouse.active = true;
  });
  window.addEventListener('mouseleave', () => { state.mouse.active = false; });

  // 画布拖拽环绕（仅 orbit 模式）
  terrainCanvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'orbit') { emitPulse(e.clientX, e.clientY); return; }
    state.dragging = true;
    state.autoSpin = 0;
    let lastX = e.clientX, lastY = e.clientY;
    const onMove = (ev) => {
      state.yaw += (ev.clientX - lastX) * 0.005;
      state.pitch = Math.max(0.08, Math.min(1.2, state.pitch + (ev.clientY - lastY) * 0.004));
      lastX = ev.clientX; lastY = ev.clientY;
    };
    const onUp = () => {
      state.dragging = false;
      state.autoSpin = 0.0016;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
  terrainCanvas.addEventListener('click', (e) => {
    if (state.mode === 'sculpt') emitPulse(e.clientX, e.clientY);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== input) {
      e.preventDefault();
      emitPulse(window.innerWidth / 2, window.innerHeight / 2);
    }
  });

  pulseBtn.addEventListener('click', () => emitPulse(window.innerWidth / 2, window.innerHeight / 2));

  // 输入 → 重建地形
  input.addEventListener('input', () => {
    const text = input.value.trim() || '·';
    heightmap = buildHeightmap(text, state.gridSize);
  });

  randomBtn.addEventListener('click', () => {
    const pool = ['TYPE', '地形', 'RELIEF', '山水', 'GLYPH', '墨', 'SIGNAL', '峰', 'TERRA', 'Aa'];
    const word = pool[Math.floor(Math.random() * pool.length)];
    input.value = word;
    heightmap = buildHeightmap(word, state.gridSize);
  });

  quickWords.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-word]');
    if (!btn) return;
    input.value = btn.dataset.word;
    heightmap = buildHeightmap(btn.dataset.word, state.gridSize);
  });

  // 滑块
  ampSlider.addEventListener('input', () => {
    state.amp = parseFloat(ampSlider.value);
    ampOut.textContent = state.amp.toFixed(2);
  });
  erosionSlider.addEventListener('input', () => {
    state.erosion = parseFloat(erosionSlider.value);
    erosionOut.textContent = state.erosion.toFixed(2);
  });
  gridSlider.addEventListener('input', () => {
    state.gridSize = parseInt(gridSlider.value, 10);
    gridOut.textContent = state.gridSize;
    heightmap = buildHeightmap(input.value.trim() || '·', state.gridSize);
  });

  // 渲染模式
  renderModes.addEventListener('click', (e) => {
    const btn = e.target.closest('.render-btn');
    if (!btn) return;
    renderModes.querySelectorAll('.render-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.render = btn.dataset.render;
  });

  // 交互模式
  modeToggle.addEventListener('click', () => {
    state.mode = state.mode === 'orbit' ? 'sculpt' : 'orbit';
    modeToggle.querySelectorAll('.mode-label').forEach((l) => {
      l.classList.toggle('active', l.dataset.mode === state.mode);
    });
    tmMode.textContent = state.mode.toUpperCase();
  });

  // 主题切换
  themeSwitcher.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    themeSwitcher.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTheme = btn.dataset.theme;
    document.documentElement.dataset.theme = currentTheme;
  });
})();
