/* ============================================================
   VHS Filter Lab — 磁带滤镜实验室
   Vanilla JS · 免构建 · 逐帧像素级 VHS 信号处理管线
   ============================================================ */
(function () {
  'use strict';

  // === Constants ===
  const CANVAS_W = 720;
  const CANVAS_H = 405;

  const PRESETS = {
    'sp':        { noise: 26, chroma: 34, track: 42, jitter: 18, scan: 50, sat: 118, bleed: 30 },
    'worn':      { noise: 58, chroma: 55, track: 78, jitter: 44, scan: 62, sat: 128, bleed: 62 },
    'broadcast': { noise: 8,  chroma: 12, track: 10, jitter: 5,  scan: 34, sat: 106, bleed: 10 },
    'mayhem':    { noise: 72, chroma: 92, track: 96, jitter: 66, scan: 46, sat: 150, bleed: 84 },
    'faded':     { noise: 34, chroma: 40, track: 30, jitter: 22, scan: 58, sat: 54,  bleed: 70 },
    'b/w':       { noise: 40, chroma: 20, track: 48, jitter: 26, scan: 66, sat: 0,   bleed: 24 }
  };

  const MODE_LABEL = {
    'PLAY': 'PLAY <span class="osd-arrow">▶</span>',
    'PAUSE': 'PAUSE <span class="osd-arrow">❚❚</span>',
    'REW': 'REW <span class="osd-arrow">◀◀</span>',
    'FF': 'FF <span class="osd-arrow">▶▶</span>'
  };

  // === State ===
  const state = {
    mode: 'PLAY',
    clock: 0,          // 秒，时间码
    t: 0,              // 累计动画时间
    burst: 0,          // 故障冲击强度（衰减）
    mouse: { x: 0.5, y: 0.5, energy: 0, active: false },
    params: { ...PRESETS['sp'] }
  };

  // === DOM Elements ===
  const canvas = document.getElementById('vhsCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const screenEl = document.getElementById('vhsScreen');
  const osdMode = document.getElementById('osdMode');
  const osdTimecode = document.getElementById('osdTimecode');
  const toastEl = document.getElementById('toast');
  const fileInput = document.getElementById('fileInput');

  // 离屏：源画面（磁带内容）
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = 1440;
  srcCanvas.height = 810;
  const srcCtx = srcCanvas.getContext('2d');

  // 离屏：暗角层（预渲染）
  const vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = CANVAS_W;
  vignetteCanvas.height = CANVAS_H;

  // 帧缓冲
  let frameOut = ctx.createImageData(CANVAS_W, CANVAS_H);

  // ============================================================
  // 默认磁带画面 —— 程序化生成复古演示场景
  // ============================================================
  function paintDefaultScene() {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const c = srcCtx;

    // 夜空渐变
    const sky = c.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#160c2e');
    sky.addColorStop(0.55, '#4a1259');
    sky.addColorStop(1, '#c53f6b');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h * 0.62);

    // 星星
    let seed = 42;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 130; i++) {
      const sx = rand() * w;
      const sy = rand() * h * 0.42;
      const r = rand() * 1.8 + 0.4;
      c.globalAlpha = 0.3 + rand() * 0.7;
      c.beginPath();
      c.arc(sx, sy, r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // 条纹落日
    const sunCx = w * 0.5;
    const sunCy = h * 0.46;
    const sunR = h * 0.22;
    const sunGrad = c.createLinearGradient(0, sunCy - sunR, 0, sunCy + sunR);
    sunGrad.addColorStop(0, '#ffd166');
    sunGrad.addColorStop(0.5, '#ff7a3d');
    sunGrad.addColorStop(1, '#ff2e88');
    c.save();
    c.beginPath();
    c.arc(sunCx, sunCy, sunR, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = sunGrad;
    c.fillRect(sunCx - sunR, sunCy - sunR, sunR * 2, sunR * 2);
    // 落日黑条
    c.fillStyle = '#160c2e';
    for (let i = 0; i < 7; i++) {
      const by = sunCy + sunR * 0.06 + i * (sunR * 0.16);
      c.fillRect(sunCx - sunR, by, sunR * 2, sunR * 0.055 + i * sunR * 0.028);
    }
    c.restore();

    // 远山剪影
    c.fillStyle = '#2a0f3d';
    c.beginPath();
    c.moveTo(0, h * 0.62);
    let mx = 0;
    while (mx < w) {
      const peak = h * (0.5 + rand() * 0.09);
      const width = w * (0.08 + rand() * 0.12);
      c.lineTo(mx + width * 0.5, peak);
      c.lineTo(mx + width, h * 0.62);
      mx += width;
    }
    c.closePath();
    c.fill();

    // 网格地面
    c.fillStyle = '#0d0620';
    c.fillRect(0, h * 0.62, w, h * 0.38);
    c.strokeStyle = 'rgba(56, 232, 255, 0.55)';
    c.lineWidth = 2;
    const horizon = h * 0.62;
    // 放射纵线
    for (let i = -12; i <= 12; i++) {
      c.beginPath();
      c.moveTo(w * 0.5 + i * 26, horizon);
      c.lineTo(w * 0.5 + i * w * 0.16, h);
      c.stroke();
    }
    // 横线（近密远疏）
    for (let i = 1; i <= 14; i++) {
      const ly = horizon + (h - horizon) * Math.pow(i / 14, 2.4);
      c.globalAlpha = 0.2 + (i / 14) * 0.7;
      c.beginPath();
      c.moveTo(0, ly);
      c.lineTo(w, ly);
      c.stroke();
    }
    c.globalAlpha = 1;

    // 主标题
    c.textAlign = 'center';
    c.fillStyle = '#f4f0ff';
    c.font = '700 190px "Outfit", sans-serif';
    c.shadowColor = '#38e8ff';
    c.shadowBlur = 34;
    c.fillText('VHS', w * 0.5, h * 0.32);
    c.shadowColor = '#ff2e88';
    c.shadowBlur = 22;
    c.fillText('VHS', w * 0.5 + 8, h * 0.32 + 6);
    c.shadowBlur = 0;
    c.font = '400 44px "Share Tech Mono", monospace';
    c.fillStyle = '#38e8ff';
    c.fillText('F I L T E R   L A B', w * 0.5, h * 0.4);

    // 底部小字
    c.font = '400 26px "Share Tech Mono", monospace';
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.fillText('▸ INSERT YOUR OWN TAPE — DROP AN IMAGE', w * 0.5, h * 0.93);
  }

  // 预渲染暗角
  function paintVignette() {
    const c = vignetteCanvas.getContext('2d');
    c.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const g = c.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.38,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.72
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    c.fillStyle = g;
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // 将任意图像 cover 装入磁带
  function loadTapeImage(img) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    srcCtx.fillStyle = '#000';
    srcCtx.fillRect(0, 0, w, h);
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    srcCtx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  // ============================================================
  // VHS 信号处理管线（逐帧像素运算）
  // ============================================================
  function renderFrame(dt) {
    const p = state.params;
    const burst = state.burst;
    const modeMul = state.mode === 'REW' ? 2.6 : state.mode === 'FF' ? 1.9 : 1;

    // 1. 绘制源画面到主画布
    ctx.drawImage(srcCanvas, 0, 0, CANVAS_W, CANVAS_H);
    const srcData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const s = srcData.data;
    const out = frameOut.data;

    // 磁迹噪声带中心（循环滚动）
    const bandPeriod = CANVAS_H + 140;
    const bandY = (state.t * 85 * modeMul) % bandPeriod - 70;
    // 光标波纹
    const my = state.mouse.y * CANVAS_H;
    const mEnergy = state.mouse.energy;

    const sat = p.sat / 100;
    const noiseAmt = (p.noise / 100) * 46 + burst * 55;
    const chromaShift = Math.round((p.chroma / 100) * 9 + burst * 10);
    const bleedShift = Math.round((p.bleed / 100) * 8);
    const trackAmt = (p.track / 100) * 52 * modeMul;
    const jitterAmt = (p.jitter / 100) * 5 * modeMul + burst * 14;

    const W = CANVAS_W;
    const H = CANVAS_H;

    for (let y = 0; y < H; y++) {
      // --- 行位移计算 ---
      let offset = 0;

      // 磁迹带：高斯影响 + 波动
      const dBand = y - bandY;
      const bandInf = Math.exp(-(dBand * dBand) / 320);
      if (bandInf > 0.01) {
        offset += bandInf * trackAmt * (Math.sin(y * 0.22 + state.t * 9) * 0.7 + (Math.random() - 0.5) * 0.9);
      }

      // 随机行撕裂
      if (Math.random() < 0.006 + burst * 0.1) {
        offset += (Math.random() - 0.5) * (60 + burst * 200);
      }

      // 行抖动
      offset += (Math.random() - 0.5) * jitterAmt;

      // 光标波纹（行级高斯）
      if (mEnergy > 0.01) {
        const dMy = y - my;
        const mInf = Math.exp(-(dMy * dMy) / 900);
        offset += mInf * mEnergy * 26 * Math.sin(y * 0.45 - state.t * 14);
      }

      const rowShift = offset | 0;
      const rowBase = y * W * 4;
      // 随机行亮度脉冲（磁迹带内偏亮/偏暗）
      const bandBright = bandInf * (Math.random() * 60 - 18);

      for (let x = 0; x < W; x++) {
        let sx = x + rowShift;
        if (sx < 0) sx = 0;
        else if (sx >= W) sx = W - 1;

        let sxR = sx - chromaShift;
        if (sxR < 0) sxR = 0;
        let sxB = sx + chromaShift + bleedShift;
        if (sxB >= W) sxB = W - 1;
        let sxG = sx + (bleedShift >> 1);
        if (sxG >= W) sxG = W - 1;

        const iR = (rowBase + sxR * 4) | 0;
        const iG = (rowBase + sxG * 4) | 0;
        const iB = (rowBase + sxB * 4) | 0;

        let r = s[iR];
        let g = s[iG];
        let b = s[iB];

        // 饱和度（0 = 单色监视器）
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        r = lum + (r - lum) * sat;
        g = lum + (g - lum) * sat;
        b = lum + (b - lum) * sat;

        // 噪点 + 磁迹带亮度脉冲
        const n = (Math.random() - 0.5) * noiseAmt + bandBright;
        r += n; g += n; b += n;

        const o = rowBase + x * 4;
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = 255;
      }
    }

    // 2. 写回
    ctx.putImageData(frameOut, 0, 0);

    // 3. 磁迹带内的雪花条（全宽白噪声块）
    const bandSnow = (p.track / 100) * 0.5 + burst * 0.4;
    if (Math.random() < 0.24 + burst * 0.5) {
      const sy = Math.random() * H | 0;
      const sh = 1 + Math.random() * (2 + burst * 22) | 0;
      ctx.globalAlpha = 0.35 * bandSnow;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) {
        const rx = Math.random() * W | 0;
        const rw = Math.random() * 50 | 0;
        ctx.fillRect(rx, sy, rw, sh * 0.5);
      }
      ctx.globalAlpha = 1;
    }

    // 4. 扫描线
    const scanAlpha = (p.scan / 100) * 0.32;
    if (scanAlpha > 0.005) {
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = scanAlpha;
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }
      ctx.globalAlpha = 1;
    }

    // 5. 暗角
    ctx.drawImage(vignetteCanvas, 0, 0);

    // 6. 衰减
    state.burst *= 0.93;
    if (state.burst < 0.005) state.burst = 0;
    state.mouse.energy *= 0.95;
  }

  // ============================================================
  // 主循环
  // ============================================================
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    state.t += dt;

    // 时钟推进
    if (state.mode === 'PLAY') state.clock += dt;
    else if (state.mode === 'FF') state.clock += dt * 8;
    else if (state.mode === 'REW') state.clock = Math.max(0, state.clock - dt * 8);

    renderFrame(dt);
    updateTimecode();
    requestAnimationFrame(loop);
  }

  function updateTimecode() {
    const c = state.clock | 0;
    const h = (c / 3600) | 0;
    const m = ((c % 3600) / 60) | 0;
    const s = c % 60;
    osdTimecode.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ============================================================
  // 传输控制（PLAY / PAUSE / REW / FF）
  // ============================================================
  function setMode(mode) {
    state.mode = mode;
    osdMode.innerHTML = MODE_LABEL[mode];
    document.querySelectorAll('.t-btn').forEach((b) => {
      b.classList.toggle('is-active',
        (mode === 'PLAY' && b.id === 'btnPlay') ||
        (mode === 'PAUSE' && b.id === 'btnPause') ||
        (mode === 'REW' && b.id === 'btnRew') ||
        (mode === 'FF' && b.id === 'btnFf'));
    });
    if (mode === 'REW' || mode === 'FF') state.burst = Math.max(state.burst, 0.5);
  }

  function bindTransport() {
    document.getElementById('btnPlay').addEventListener('click', () => setMode('PLAY'));
    document.getElementById('btnPause').addEventListener('click', () => setMode('PAUSE'));
    document.getElementById('btnRew').addEventListener('click', () => setMode('REW'));
    document.getElementById('btnFf').addEventListener('click', () => setMode('FF'));
    document.getElementById('btnGlitch').addEventListener('click', () => {
      state.burst = 1;
      showToast('⚡ SIGNAL LOST — 故障已注入');
    });
    document.getElementById('btnEject').addEventListener('click', () => fileInput.click());
    document.getElementById('btnSnap').addEventListener('click', exportSnapshot);
  }

  // ============================================================
  // 磁带装入（上传 / 拖拽）
  // ============================================================
  function bindTapeInput() {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) loadImageFile(file);
      fileInput.value = '';
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      screenEl.addEventListener(evt, (e) => {
        e.preventDefault();
        screenEl.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      screenEl.addEventListener(evt, (e) => {
        e.preventDefault();
        screenEl.classList.remove('is-dragover');
      });
    });
    screenEl.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) loadImageFile(file);
    });
  }

  function loadImageFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      loadTapeImage(img);
      state.burst = 0.7;
      URL.revokeObjectURL(url);
      showToast('⏏ 新磁带已装入 — ' + file.name);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('⚠ 画面解码失败');
    };
    img.src = url;
  }

  // ============================================================
  // 快照导出
  // ============================================================
  function exportSnapshot() {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_W;
    exportCanvas.height = CANVAS_H;
    const ec = exportCanvas.getContext('2d');
    ec.drawImage(canvas, 0, 0);

    // 烧录 OSD 时间码
    ec.font = '16px "Share Tech Mono", monospace';
    ec.fillStyle = '#eef2ff';
    ec.shadowColor = 'rgba(160,200,255,0.9)';
    ec.shadowBlur = 6;
    ec.textBaseline = 'top';
    ec.fillText(osdMode.textContent.replace(/[▶❚◀]/g, '').trim() + '  SP', 14, 12);
    const alignRight = ec.measureText(osdTimecode.textContent).width;
    ec.fillText(osdTimecode.textContent, CANVAS_W - alignRight - 14, CANVAS_H - 28);

    const link = document.createElement('a');
    link.download = 'vhs-filter-lab-' + Date.now() + '.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    showToast('⤓ 快照已导出 PNG');
  }

  // ============================================================
  // 屏幕交互（光标波纹 / 点击撕裂）
  // ============================================================
  function bindScreenInteraction() {
    screenEl.addEventListener('pointermove', (e) => {
      const rect = screenEl.getBoundingClientRect();
      state.mouse.x = (e.clientX - rect.left) / rect.width;
      state.mouse.y = (e.clientY - rect.top) / rect.height;
      state.mouse.energy = Math.min(1, state.mouse.energy + 0.12);
      state.mouse.active = true;
    });

    screenEl.addEventListener('pointerleave', () => {
      state.mouse.active = false;
    });

    screenEl.addEventListener('click', () => {
      state.burst = Math.min(1, state.burst + 0.55);
    });
  }

  // ============================================================
  // 预设系统
  // ============================================================
  function bindPresets() {
    document.getElementById('presetGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      applyPreset(btn.dataset.preset);
      document.querySelectorAll('.preset-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
    });
  }

  function applyPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    state.params = { ...preset };
    // 滑杆 UI 同步（带非线性过渡的数值插值）
    document.querySelectorAll('input[data-param]').forEach((input) => {
      const param = input.dataset.param;
      tweenValue(parseFloat(input.value), preset[param], 600, (v) => {
        input.value = v;
        updateValLabel(param, v);
      });
    });
    state.burst = Math.max(state.burst, 0.35);
  }

  // 数值插值（指数缓出，非线性）
  function tweenValue(from, to, duration, onFrame) {
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      onFrame(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ============================================================
  // 滑杆绑定
  // ============================================================
  function bindSliders() {
    document.querySelectorAll('input[data-param]').forEach((input) => {
      input.addEventListener('input', () => {
        const param = input.dataset.param;
        state.params[param] = parseFloat(input.value);
        updateValLabel(param, input.value);
      });
    });
  }

  function updateValLabel(param, value) {
    const label = document.querySelector(`[data-val="${param}"]`);
    if (label) label.textContent = Math.round(value);
  }

  // ============================================================
  // 主题系统
  // ============================================================
  function bindThemes() {
    document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.documentElement.dataset.theme = btn.dataset.themeBtn;
        document.querySelectorAll('.theme-dot').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
      });
    });
  }

  // ============================================================
  // Toast
  // ============================================================
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2400);
  }

  // ============================================================
  // 启动
  // ============================================================
  function init() {
    paintDefaultScene();
    paintVignette();
    document.querySelector('.theme-dot[data-theme-btn="magnet"]').classList.add('is-active');
    document.getElementById('btnPlay').classList.add('is-active');
    bindTransport();
    bindTapeInput();
    bindScreenInteraction();
    bindPresets();
    bindSliders();
    bindThemes();
    requestAnimationFrame((now) => {
      lastTime = now;
      requestAnimationFrame(loop);
    });
  }

  init();
})();
