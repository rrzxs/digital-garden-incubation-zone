/**
 * Depth Relight · 深度重光
 * 噪声高度场 → 法线推演 → 实时光源重雕
 * 免构建 Vanilla JS，无任何依赖
 */
(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const hudFps = document.getElementById('hud-fps');
  const hudLight = document.getElementById('hud-light');
  const teleSeed = document.getElementById('tele-seed');
  const telePulse = document.getElementById('tele-pulse');
  const teleVel = document.getElementById('tele-vel');
  const teleCells = document.getElementById('tele-cells');
  const modeDock = document.getElementById('mode-dock');
  const paletteRow = document.getElementById('palette-row');
  const hintEl = document.querySelector('.hint');

  // === Palettes ===
  const PALETTES = {
    aurora: { accent: '#7cf7c4', hi: [190, 255, 235], lo: [8, 28, 34], glow: '124,247,196' },
    ember: { accent: '#ffb45e', hi: [255, 232, 190], lo: [34, 14, 8], glow: '255,180,94' },
    abyss: { accent: '#5e9bff', hi: [215, 235, 255], lo: [6, 14, 34], glow: '94,155,255' },
    orchid: { accent: '#c792ff', hi: [240, 225, 255], lo: [22, 10, 36], glow: '199,146,255' }
  };

  // === State ===
  const state = {
    mode: 'diffuse',
    palette: PALETTES.aurora,
    lightHeight: 0.55,
    intensity: 1.2,
    ambient: 0.18,
    relief: 1.0,
    flow: 0.4,
    seed: (Math.random() * 65536) | 0,
    pulseCount: 0,
    time: 0,
    dragging: false
  };

  // 光源：位置 + 弹簧物理目标
  const light = { x: 0.5, y: 0.45, tx: 0.5, ty: 0.45, vx: 0, vy: 0 };
  const EASE = 0.14; // 弹簧追踪系数

  // === Simplex Noise (2D, 紧凑实现) ===
  const noise = (() => {
    const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    const p = new Uint8Array(512);
    let s = state.seed;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    return (x, y) => {
      const n0 = [Math.floor(x + (x + y) * F2), Math.floor(y + (x + y) * F2)];
      const i = n0[0], j = n0[1];
      const t = (i + j) * G2;
      const x0 = x - (i - t), y0 = y - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let total = 0;

      let tt = 0.5 - x0 * x0 - y0 * y0;
      if (tt > 0) { tt *= tt; const g = grad[p[ii + p[jj]] & 7]; total += tt * tt * (g[0] * x0 + g[1] * y0); }
      tt = 0.5 - x1 * x1 - y1 * y1;
      if (tt > 0) { tt *= tt; const g = grad[p[ii + i1 + p[jj + j1]] & 7]; total += tt * tt * (g[0] * x1 + g[1] * y1); }
      tt = 0.5 - x2 * x2 - y2 * y2;
      if (tt > 0) { tt *= tt; const g = grad[p[ii + 1 + p[jj + 1]] & 7]; total += tt * tt * (g[0] * x2 + g[1] * y2); }

      return 70 * total; // 约 [-1, 1]
    };
  })();

  // 柔化 fbm：三层叠加
  function fbm(x, y, t) {
    return noise(x, y) * 0.62 + noise(x * 2.1 + t * 0.35, y * 2.1) * 0.26 + noise(x * 4.3, y * 4.3 - t * 0.22) * 0.12;
  }

  // === Field（低分辨率场 + 离屏放大，营造柔光质感） ===
  const COLS = 168, ROWS = 105;
  const field = document.createElement('canvas');
  field.width = COLS;
  field.height = ROWS;
  const fctx = field.getContext('2d');
  const img = fctx.createImageData(COLS, ROWS);

  const heights = new Float32Array(COLS * ROWS);
  const pulses = []; // { x, y, r, t0, amp }

  function terrainScale() {
    return 2.4 / Math.max(COLS, ROWS) * 110;
  }

  function sampleHeight(cx, cy, t) {
    const sc = terrainScale() / 110 * 2.4;
    let h = fbm(cx * sc + state.seedOffset, cy * sc - state.seedOffset * 0.6, t) * 0.5 + 0.5;
    // 涟漪脉冲叠加扰动深度
    for (const pu of pulses) {
      const dx = cx - pu.x, dy = (cy - pu.y) * 1.4;
      const d = Math.sqrt(dx * dx + dy * dy);
      const wave = Math.abs(d - pu.r);
      if (wave < 14) {
        const env = Math.exp(-wave * wave * 0.02) * Math.exp(-pu.age * 1.6) * pu.amp;
        h += Math.sin((d - pu.r) * 0.7) * env;
      }
    }
    return h;
  }

  state.seedOffset = (state.seed % 1000) * 0.37;

  // === 尘埃粒子（光锥中的悬浮微粒） ===
  const motes = Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random(),
    s: 0.4 + Math.random() * 0.9,
    a: Math.random() * Math.PI * 2,
    sp: 0.02 + Math.random() * 0.05
  }));

  // === 渲染循环 ===
  let W = 0, H = 0, dpr = 1;
  let lastT = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsLast = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function render(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    state.time += dt * state.flow;

    // FPS
    fpsAcc += dt; fpsN++;
    if (now - fpsLast > 500) {
      hudFps.textContent = `FPS ${Math.round(fpsN / fpsAcc)}`;
      fpsAcc = 0; fpsN = 0; fpsLast = now;
    }

    // 光源弹簧追踪（非线性缓动）
    if (!state.dragging) {
      light.tx += light.vx * dt;
      light.ty += light.vy * dt;
      light.vx *= 0.96; light.vy *= 0.96;
    }
    light.x += (light.tx - light.x) * EASE * (dt * 60);
    light.y += (light.ty - light.y) * EASE * (dt * 60);

    // 更新涟漪
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pu = pulses[i];
      pu.age += dt;
      pu.r += dt * 26;
      if (pu.age > 2.4) pulses.splice(i, 1);
    }

    // --- 高度场与法线光照 ---
    const { palette, mode, lightHeight, intensity, ambient, relief } = state;
    const lx = light.x * COLS, ly = light.y * ROWS;
    const lz = 24 + lightHeight * 150;
    const hi = palette.hi, lo = palette.lo;
    const data = img.data;
    const sc = terrainScale() / 110 * 2.4;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const idx = y * COLS + x;
        heights[idx] = sampleHeight(x, y, state.time);
      }
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const idx = y * COLS + x;
        const hL = heights[y * COLS + Math.max(x - 1, 0)];
        const hR = heights[y * COLS + Math.min(x + 1, COLS - 1)];
        const hD = heights[Math.max(y - 1, 0) * COLS + x];
        const hU = heights[Math.min(y + 1, ROWS - 1) * COLS + x];

        // 法线（含 z 缩放 = 起伏）
        let nx = (hL - hR) * relief * 3.2;
        let ny = (hD - hU) * relief * 3.2;
        let nz = 1;
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= nl; ny /= nl; nz /= nl;

        // 光线方向
        let dx = lx - x, dy = ly - y, dz = lz - heights[idx] * relief * 26;
        const dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= dl; dy /= dl; dz /= dl;

        // 距离衰减
        const dist = Math.sqrt((lx - x) * (lx - x) + (ly - y) * (ly - y)) / COLS;
        const atten = intensity / (1 + dist * dist * 7);

        let shade;
        if (mode === 'diffuse') {
          const diff = Math.max(nx * dx + ny * dy + nz * dz, 0);
          shade = ambient + diff * atten;
        } else if (mode === 'specular') {
          // Blinn-Phong：视线 (0,0,1)
          let hx = dx, hy = dy, hz = dz + 1;
          const hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
          hx /= hl; hy /= hl; hz /= hl;
          const spec = Math.pow(Math.max(nx * hx + ny * hy + nz * hz, 0), 42);
          const diff = Math.max(nx * dx + ny * dy + nz * dz, 0) * 0.32;
          shade = ambient * 0.7 + diff * atten + spec * atten * 1.7;
        } else if (mode === 'rim') {
          const facing = 1 - Math.abs(nz);
          const diff = Math.max(nx * dx + ny * dy + nz * dz, 0);
          shade = ambient * 0.5 + Math.pow(facing, 2.2) * (0.35 + diff * 0.65) * atten * 1.35;
        } else { // xray 深度透视：高度即亮度，光照作调制
          const depth = heights[idx] * 0.5 + 0.5;
          const diff = Math.max(nx * dx + ny * dy + nz * dz, 0);
          shade = depth * (0.45 + diff * 0.75) * (0.5 + atten * 0.6);
        }

        shade = shade > 1 ? 1 : shade < 0 ? 0 : shade;
        const gamma = Math.pow(shade, 0.85);

        const o = idx * 4;
        data[o] = lo[0] + (hi[0] - lo[0]) * gamma;
        data[o + 1] = lo[1] + (hi[1] - lo[1]) * gamma;
        data[o + 2] = lo[2] + (hi[2] - lo[2]) * gamma;
        data[o + 3] = 255;
      }
    }

    fctx.putImageData(img, 0, 0);

    // --- 合成到主画布 ---
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(field, 0, 0, W, H);

    // 光源辉光
    const px = light.x * W, py = light.y * H;
    const glowR = 90 + lightHeight * 130;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
    grad.addColorStop(0, `rgba(${palette.glow},${0.5 * intensity})`);
    grad.addColorStop(0.4, `rgba(${palette.glow},0.12)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

    // 涟漪环可视化
    ctx.lineWidth = 1.2;
    for (const pu of pulses) {
      const alpha = Math.max(0, 0.5 * Math.exp(-pu.age * 1.8));
      ctx.strokeStyle = `rgba(${palette.glow},${alpha})`;
      ctx.beginPath();
      ctx.ellipse(pu.x / COLS * W, pu.y / ROWS * H, pu.r / COLS * W, pu.r / ROWS * H, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 尘埃微粒：朝光源缓慢盘旋
    for (const m of motes) {
      m.a += m.sp * dt * 2;
      const toLx = light.x - m.x, toLy = light.y - m.y;
      const dToLight = Math.sqrt(toLx * toLx + toLy * toLy) || 1;
      m.x += (toLx / dToLight * 0.018 + Math.cos(m.a) * 0.012) * dt * 3;
      m.y += (toLy / dToLight * 0.018 + Math.sin(m.a) * 0.012) * dt * 3;
      if (m.x < 0 || m.x > 1 || m.y < 0 || m.y > 1) {
        m.x = Math.random(); m.y = Math.random();
      }
      const near = Math.max(0, 1 - dToLight * 2.4);
      const alpha = near * 0.55 * intensity;
      if (alpha > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(m.x * W, m.y * H, m.s * near * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 光标本体
    ctx.globalCompositeOperation = 'source-over';
    const coreR = 5 + Math.sin(now * 0.004) * 1.2;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = `rgba(${palette.glow},0.95)`;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(px, py, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${palette.glow},0.45)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 14 + Math.sin(now * 0.003) * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // HUD
    hudLight.textContent = `L ${(light.x * 100).toFixed(0)}/${(light.y * 100).toFixed(0)}`;
    teleVel.textContent = (Math.hypot(light.tx - light.x, light.ty - light.y) * 60).toFixed(2);

    requestAnimationFrame(render);
  }

  // === 交互：拖拽光源 / 涟漪脉冲 ===
  function toFieldCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      fx: (e.clientX - rect.left) / rect.width,
      fy: (e.clientY - rect.top) / rect.height
    };
  }

  let pressTimer = null;
  let pressStart = null;

  canvas.addEventListener('pointerdown', (e) => {
    const { fx, fy } = toFieldCoords(e);
    pressStart = { fx, fy, t: performance.now() };
    // 靠近光源则拖拽，否则延迟判定为脉冲
    const near = Math.hypot(fx - light.x, fy - light.y) < 0.08;
    if (near) {
      state.dragging = true;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    } else {
      pressTimer = window.setTimeout(() => {
        state.dragging = true;
        light.tx = fx; light.ty = fy;
        canvas.setPointerCapture(e.pointerId);
      }, 160);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const { fx, fy } = toFieldCoords(e);
    if (state.dragging) {
      light.tx = Math.min(Math.max(fx, 0), 1);
      light.ty = Math.min(Math.max(fy, 0), 1);
    }
  });

  function endPointer(e) {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (pressStart && !state.dragging) {
      const { fx, fy } = toFieldCoords(e);
      spawnPulse(fx * COLS, fy * ROWS);
    }
    pressStart = null;
    state.dragging = false;
    canvas.style.cursor = 'crosshair';
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  function spawnPulse(fx, fy) {
    pulses.push({ x: fx, y: fy, r: 0, age: 0, amp: 0.9 });
    if (pulses.length > 12) pulses.shift();
    state.pulseCount++;
    telePulse.textContent = String(state.pulseCount);
  }

  // 空格：随机换地形
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      state.seed = (Math.random() * 65536) | 0;
      state.seedOffset = (state.seed % 1000) * 0.37;
      teleSeed.textContent = state.seed.toString(16).padStart(4, '0').toUpperCase();
      spawnPulse(light.x * COLS, light.y * ROWS);
    }
  });

  // === 控制面板绑定 ===
  const sliderDefs = [
    ['ctl-height', 'val-height', 'lightHeight'],
    ['ctl-intensity', 'val-intensity', 'intensity'],
    ['ctl-ambient', 'val-ambient', 'ambient'],
    ['ctl-relief', 'val-relief', 'relief'],
    ['ctl-flow', 'val-flow', 'flow']
  ];

  for (const [id, valId, key] of sliderDefs) {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    const sync = () => {
      state[key] = parseFloat(el.value);
      val.textContent = state[key].toFixed(2);
      const pct = ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1);
      el.style.setProperty('--fill', `${pct}%`);
    };
    el.addEventListener('input', sync);
    sync();
  }

  // 渲染模式
  modeDock.addEventListener('click', (e) => {
    const btn = e.target.closest('.dock-btn');
    if (!btn) return;
    modeDock.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
  });

  // 氛围配色
  paletteRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.palette-btn');
    if (!btn) return;
    paletteRow.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.palette = PALETTES[btn.dataset.palette];
    document.documentElement.style.setProperty('--accent', state.palette.accent);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${state.palette.glow},0.16)`);
  });

  // === 入场动画 ===
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('active'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // 提示淡出
  setTimeout(() => { hintEl.style.opacity = '0.55'; }, 8000);

  // === 启动 ===
  window.addEventListener('resize', resize);
  resize();
  teleSeed.textContent = state.seed.toString(16).padStart(4, '0').toUpperCase();
  teleCells.textContent = `${COLS}×${ROWS}`;
  requestAnimationFrame(render);
})();
