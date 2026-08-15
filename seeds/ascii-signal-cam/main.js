/* ==========================================================================
   ASCII Signal Cam · 交互逻辑
   信号源采样 → 字符矩阵转译 → 信号透镜 / 脉冲冲击波 / 故障撕裂
   ========================================================================== */

(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('fieldCanvas');
  const ctx = canvas.getContext('2d');
  const rippleLayer = document.getElementById('rippleLayer');
  const flash = document.getElementById('flash');
  const video = document.getElementById('camVideo');

  const liveDot = document.getElementById('liveDot');
  const scopeTitle = document.getElementById('scopeTitle');
  const scopeSub = document.getElementById('scopeSub');
  const hudFeed = document.getElementById('hudFeed');

  const rdFps = document.getElementById('rdFps');
  const rdCells = document.getElementById('rdCells');
  const rdSignal = document.getElementById('rdSignal');

  const resSlider = document.getElementById('resSlider');
  const contrastSlider = document.getElementById('contrastSlider');
  const brightSlider = document.getElementById('brightSlider');
  const glitchSlider = document.getElementById('glitchSlider');
  const resVal = document.getElementById('resVal');
  const contrastVal = document.getElementById('contrastVal');
  const brightVal = document.getElementById('brightVal');
  const glitchVal = document.getElementById('glitchVal');

  const charsetGrid = document.getElementById('charsetGrid');
  const btnFreeze = document.getElementById('btnFreeze');
  const btnInvert = document.getElementById('btnInvert');
  const btnShot = document.getElementById('btnShot');

  const mSig = document.getElementById('mSig'); const mSigV = document.getElementById('mSigV');
  const mLuma = document.getElementById('mLuma'); const mLumaV = document.getElementById('mLumaV');
  const mNoise = document.getElementById('mNoise'); const mNoiseV = document.getElementById('mNoiseV');
  const mFps = document.getElementById('mFps'); const mFpsV = document.getElementById('mFpsV');

  const tickerTrack = document.getElementById('tickerTrack');

  // === 常量：字符集 / 故障字形 / 信号源元数据 / 主题色阶 ===
  const CHARSETS = {
    ascii: ' .:-=+*#%@',
    blocks: ' ░▒▓█',
    binary: ' .01',
    katakana: ' ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
    braille: '⠀⠁⠃⠇⠏⠟⠿⡿⣿'
  };

  const GLITCH_GLYPHS = '▚▞▓▒░#%&@$§¶◊×╬<>!?';

  const FEED_META = {
    plasma: { title: 'PLASMA FIELD', sub: 'PLASMA FIELD · SYNTHETIC FEED' },
    tunnel: { title: 'TUNNEL', sub: 'PERSPECTIVE TUNNEL · SYNTHETIC FEED' },
    wave: { title: 'INTERFERENCE', sub: 'WAVE INTERFERENCE · SYNTHETIC FEED' },
    static: { title: 'WHITE NOISE', sub: 'WHITE NOISE · SYNTHETIC FEED' },
    camera: { title: 'OPTICAL SENSOR', sub: 'LIVE CAMERA FEED · REQUESTING PERMISSION…' }
  };

  const FEED_ORDER = ['plasma', 'tunnel', 'wave', 'static', 'camera'];

  const THEME_RAMPS = {
    phosphor: ['#04180d', '#0b4a26', '#14954a', '#2ee27a', '#a4ffc8'],
    vapor: ['#1c1030', '#47236e', '#8b3fb5', '#d764e8', '#ffd2f7'],
    ember: ['#2b0e04', '#70290b', '#bb5710', '#f6991c', '#ffe9b3'],
    arctic: ['#081a30', '#12416e', '#1f74b8', '#45b8ea', '#d2f1ff']
  };

  // === 状态模型 ===
  const state = {
    feed: 'plasma',
    charset: 'ascii',
    cols: 96, rows: 0,
    cellW: 10, cellH: 17,
    viewW: 0, viewH: 0, aspect: 1.7,
    contrast: 1.15, brightness: 0.02, glitch: 0.25,
    invert: false, frozen: false,
    t: 0, fps: 60, lastFrame: 0,
    buffer: null, meanLuma: 0.5, variance: 0.04,
    mouse: { x: 0, y: 0, inside: false },
    pulses: [],
    nextGlitch: 3000, glitchUntil: 0, glitchBands: [],
    camStream: null, camReady: false, camError: false,
    startedAt: performance.now()
  };

  // 主题色阶（ramp 常规 / rampHot 透镜高亮）
  const rampColors = [];
  const hotColors = [];

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rebuildRamp() {
    const stops = THEME_RAMPS[document.body.dataset.theme] || THEME_RAMPS.phosphor;
    rampColors.length = 0;
    hotColors.length = 0;
    const N = 64;
    for (let i = 0; i < N; i++) {
      const p = (i / (N - 1)) * (stops.length - 1);
      const i0 = Math.floor(p);
      const i1 = Math.min(stops.length - 1, i0 + 1);
      const f = p - i0;
      const a = hexToRgb(stops[i0]);
      const b = hexToRgb(stops[i1]);
      const r = Math.round(a[0] + (b[0] - a[0]) * f);
      const g = Math.round(a[1] + (b[1] - a[1]) * f);
      const bl = Math.round(a[2] + (b[2] - a[2]) * f);
      rampColors.push('rgb(' + r + ',' + g + ',' + bl + ')');
      const hr = Math.round(r + (255 - r) * 0.55);
      const hg = Math.round(g + (255 - g) * 0.55);
      const hbl = Math.round(bl + (255 - bl) * 0.55);
      hotColors.push('rgb(' + hr + ',' + hg + ',' + hbl + ')');
    }
  }

  // === 1. 网格尺寸自适应 ===
  function rebuildGrid() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state.viewW = rect.width;
    state.viewH = rect.height;
    state.aspect = rect.width / rect.height;
    state.cols = +resSlider.value;
    state.cellW = rect.width / state.cols;
    state.cellH = state.cellW / 0.6;
    state.rows = Math.min(200, Math.ceil(rect.height / state.cellH));
    state.buffer = new Float32Array(state.cols * state.rows);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    rdCells.textContent = state.cols + '×' + state.rows;
  }
  window.addEventListener('resize', rebuildGrid);

  // === 2. 合成信号源（逐单元数学采样） ===
  function sampleSynthetic(t) {
    const { cols, rows, buffer, aspect } = state;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        buffer[y * cols + x] = feedValue(x, y, t, aspect);
      }
    }
  }

  function feedValue(x, y, t, aspect) {
    const u = x / state.cols;
    const v = y / state.rows;
    switch (state.feed) {
      case 'plasma': {
        const r = Math.sqrt((u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5));
        let s = Math.sin(u * 9 + t * 0.9)
              + Math.sin((u * 5 + v * 7) * 2 + t * 1.3)
              + Math.sin(v * 8 - t * 0.6)
              + Math.sin(r * 24 - t * 2);
        return (s / 4 + 1) / 2;
      }
      case 'tunnel': {
        const dx = u - 0.5;
        const dy = (v - 0.5) / aspect;
        const r = Math.sqrt(dx * dx + dy * dy);
        const a = Math.atan2(dy, dx);
        const w = Math.sin(r * 26 - t * 2.4 + Math.sin(a * 5 + t * 0.6) * 0.8);
        let val = (w + 1) / 2;
        const fade = 1.15 - r * 1.6;
        val *= fade < 0.15 ? 0.15 : fade > 1 ? 1 : fade;
        return val;
      }
      case 'wave': {
        const s1x = 0.3 + Math.sin(t * 0.5) * 0.18;
        const s1y = 0.35 + Math.cos(t * 0.4) * 0.15;
        const s2x = 0.7 + Math.cos(t * 0.35) * 0.2;
        const s2y = 0.6 + Math.sin(t * 0.55) * 0.18;
        const d1 = Math.sqrt(((u - s1x) * aspect) ** 2 + (v - s1y) ** 2);
        const d2 = Math.sqrt(((u - s2x) * aspect) ** 2 + (v - s2y) ** 2);
        const w1 = Math.sin(d1 * 34 - t * 2.8);
        const w2 = Math.sin(d2 * 34 + t * 2.2);
        return ((w1 + w2) / 4) + 0.5;
      }
      case 'static': {
        // 模拟模拟信号噪点：保留残影的随机噪声
        const i = y * state.cols + x;
        const prev = state.buffer[i] || 0;
        return prev * 0.55 + Math.random() * 0.45;
      }
      default:
        return 0;
    }
  }

  // === 3. 摄像头采样（cover 裁切 → 降采样亮度） ===
  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  function sampleCamera() {
    if (!state.camReady || !video.videoWidth) return false;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const ta = vw / vh;
    const ba = state.cols / state.rows;
    let sw = vw, sh = vh, sx = 0, sy = 0;
    if (ta > ba) { sw = vh * ba; sx = (vw - sw) / 2; }
    else { sh = vw / ba; sy = (vh - sh) / 2; }
    sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, state.cols, state.rows);
    const data = sampleCtx.getImageData(0, 0, state.cols, state.rows).data;
    const buf = state.buffer;
    for (let i = 0, p = 0; i < buf.length; i++, p += 4) {
      buf[i] = (data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) / 255;
    }
    return true;
  }

  // === 4. 后期处理（对比度 / 亮度 / 反相 + 统计） ===
  function postProcess() {
    if (!state.buffer) return;
    const buf = state.buffer;
    let sum = 0, sumSq = 0;
    for (let i = 0; i < buf.length; i++) {
      let val = (buf[i] - 0.5) * state.contrast + 0.5 + state.brightness;
      if (state.invert) val = 1 - val;
      val = val < 0 ? 0 : val > 1 ? 1 : val;
      buf[i] = val;
      sum += val;
      sumSq += val * val;
    }
    const n = buf.length || 1;
    state.meanLuma = sum / n;
    state.variance = Math.max(0, sumSq / n - state.meanLuma * state.meanLuma);
  }

  // === 5. 故障调度（随机撕裂频次由 Glitch 滑块驱动） ===
  function updateGlitch(now) {
    if (state.glitch <= 0.01) {
      state.glitchBands = [];
      return;
    }
    if (now > state.glitchUntil && now > state.nextGlitch) {
      state.glitchUntil = now + 120 + Math.random() * 260 * state.glitch;
      const bands = [];
      const count = 2 + Math.floor(Math.random() * 5 * state.glitch);
      for (let i = 0; i < count; i++) {
        bands.push({
          y: Math.floor(Math.random() * state.rows),
          h: 1 + Math.floor(Math.random() * 3),
          shift: Math.round((Math.random() * 2 - 1) * 14 * state.glitch)
        });
      }
      state.glitchBands = bands;
      const gap = (9.5 - 8.2 * state.glitch) * 1000 * (0.6 + Math.random() * 0.8);
      state.nextGlitch = state.glitchUntil + gap;
    }
    if (now > state.glitchUntil) state.glitchBands = [];
  }

  function bandShift(y) {
    for (let i = 0; i < state.glitchBands.length; i++) {
      const b = state.glitchBands[i];
      if (y >= b.y && y < b.y + b.h) return b.shift;
    }
    return 0;
  }

  function triggerGlitch(now) {
    state.nextGlitch = 0;
    updateGlitch(now);
  }

  // === 6. 脉冲冲击波（点击扰动采样坐标） ===
  let _pox = 0, _poy = 0;
  function pulseOffset(x, y, now) {
    _pox = 0; _poy = 0;
    for (let i = 0; i < state.pulses.length; i++) {
      const p = state.pulses[i];
      const age = (now - p.t0) / 1000;
      const dx = x - p.cx;
      const dy = y - p.cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const delta = d - age * 26;
      const band = 4.5;
      if (delta > -band && delta < band) {
        const amp = 7 * Math.exp(-age * 1.5) * Math.cos((delta / band) * Math.PI / 2);
        _pox += (dx / d) * amp;
        _poy += (dy / d) * amp;
      }
    }
  }

  function spawnPulse(px, py) {
    if (!state.buffer) return;
    state.pulses.push({
      cx: px / state.cellW,
      cy: py / state.cellH,
      t0: performance.now()
    });
  }

  // === 7. 主渲染循环 ===
  function render(now) {
    if (!state.buffer) {
      rebuildGrid();
      requestAnimationFrame(render);
      return;
    }

    // 采样
    if (!state.frozen) {
      if (state.feed === 'camera') {
        const ok = sampleCamera();
        if (!ok) state.buffer.fill(0.02);
      } else {
        sampleSynthetic(state.t);
      }
      postProcess();
    }

    // 清理过期脉冲
    if (state.pulses.length) {
      state.pulses = state.pulses.filter(function (p) { return now - p.t0 < 4200; });
    }

    updateGlitch(now);

    const cols = state.cols;
    const rows = state.rows;
    const buffer = state.buffer;
    const cellW = state.cellW;
    const cellH = state.cellH;
    const mouse = state.mouse;
    const chars = CHARSETS[state.charset];
    const baseFont = Math.floor(cellH * 0.98);
    const lensR = Math.max(90, cellH * 7);
    const glitchOn = state.glitchBands.length > 0;

    ctx.clearRect(0, 0, state.viewW, state.viewH);
    ctx.font = baseFont + 'px "Share Tech Mono"';

    for (let y = 0; y < rows; y++) {
      const shift = glitchOn ? bandShift(y) : 0;
      const cy = y * cellH + cellH / 2;
      for (let x = 0; x < cols; x++) {
        let sx = x + shift;
        let sy = y;
        if (state.pulses.length) {
          pulseOffset(x, y, now);
          sx += _pox;
          sy += _poy;
        }
        sx = sx < 0 ? 0 : sx >= cols ? cols - 1 : sx;
        sy = sy < 0 ? 0 : sy >= rows ? rows - 1 : sy;
        let val = buffer[(sy | 0) * cols + (sx | 0)];

        // 信号透镜：光标附近放大增亮
        let lensF = 0;
        if (mouse.inside) {
          const mdx = x * cellW + cellW / 2 - mouse.x;
          const mdy = cy - mouse.y;
          const md = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < lensR) {
            let f = 1 - md / lensR;
            lensF = f * f * (3 - 2 * f);
            val = Math.min(1, val + lensF * 0.22);
          }
        }

        let ci = (val * chars.length) | 0;
        if (ci > chars.length - 1) ci = chars.length - 1;
        let ch = chars[ci];
        if (!ch || ch === ' ') continue;

        // 故障期间随机字形替换
        if (glitchOn && Math.random() < state.glitch * 0.05) {
          ch = GLITCH_GLYPHS[(Math.random() * GLITCH_GLYPHS.length) | 0];
        }

        let ri = (val * 63) | 0;
        if (ri > 63) ri = 63;
        ctx.fillStyle = lensF > 0.05 ? hotColors[ri] : rampColors[ri];

        const cx = x * cellW + cellW / 2;
        if (lensF > 0.05) {
          const scale = 1 + lensF * 0.85;
          ctx.font = Math.round(baseFont * scale) + 'px "Share Tech Mono"';
          ctx.fillText(ch, cx, cy);
          ctx.font = baseFont + 'px "Share Tech Mono"';
        } else {
          ctx.fillText(ch, cx, cy);
        }
      }
    }

    // 摄像头等待 / 拒绝提示
    if (state.feed === 'camera' && !state.camReady) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '14px "Share Tech Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(
        state.camError ? 'NO OPTICAL SIGNAL' : 'ACQUIRING OPTICAL SIGNAL…',
        state.viewW / 2, state.viewH / 2
      );
    }

    // 透镜十字准星
    if (mouse.inside) {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, lensR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(mouse.x - 12, mouse.y); ctx.lineTo(mouse.x - 4, mouse.y);
      ctx.moveTo(mouse.x + 4, mouse.y); ctx.lineTo(mouse.x + 12, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 12); ctx.lineTo(mouse.x, mouse.y - 4);
      ctx.moveTo(mouse.x, mouse.y + 4); ctx.lineTo(mouse.x, mouse.y + 12);
      ctx.stroke();
    }

    // FPS 平滑 + 时钟
    const dt = now - state.lastFrame;
    state.lastFrame = now;
    if (dt > 0 && dt < 500) state.fps = state.fps * 0.92 + (1000 / dt) * 0.08;
    state.t += 0.033;

    const sig = signalStrength(now);
    rdFps.textContent = Math.round(state.fps);
    rdSignal.textContent = sig;

    requestAnimationFrame(render);
  }

  function signalStrength(now) {
    let s;
    if (state.feed === 'camera') {
      s = state.camReady ? 90 + Math.sin(now / 530) * 6 : 0;
    } else {
      s = 78 + Math.sin(now / 810) * 7 + Math.sin(now / 337) * 4;
    }
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  // === 8. 摄像头管理 ===
  function activateCamera() {
    if (state.camReady) return;
    if (state.camError || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      fallbackToStatic();
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 } }, audio: false })
      .then(function (stream) {
        state.camStream = stream;
        video.srcObject = stream;
        return video.play();
      })
      .then(function () {
        state.camReady = true;
        updateSub('LIVE CAMERA FEED · ' + video.videoWidth + '×' + video.videoHeight);
      })
      .catch(function () {
        state.camError = true;
        fallbackToStatic();
      });
  }

  function stopCamera() {
    if (state.camStream) {
      state.camStream.getTracks().forEach(function (t) { t.stop(); });
    }
    state.camStream = null;
    state.camReady = false;
    video.srcObject = null;
  }

  function fallbackToStatic() {
    setFeed('static');
    updateSub('CAMERA UNAVAILABLE · WHITE NOISE FALLBACK');
  }

  // === 9. 信号源切换 ===
  function setFeed(feed) {
    if (feed === state.feed && feed !== 'camera') return;
    if (state.feed === 'camera' && feed !== 'camera') stopCamera();
    state.feed = feed;

    document.querySelectorAll('.nav-chip').forEach(function (c) {
      c.classList.toggle('is-active', c.dataset.feed === feed);
    });

    const meta = FEED_META[feed];
    scopeTitle.textContent = meta.title;
    updateSub(meta.sub);
    updateHud();

    if (feed === 'camera') activateCamera();
  }

  function updateSub(base) {
    scopeSub.textContent = base + (state.frozen ? ' · FROZEN' : '');
    scopeSub.dataset.base = base;
  }

  function updateHud() {
    const meta = FEED_META[state.feed];
    hudFeed.textContent = 'FEED · ' + meta.title + (state.frozen ? ' · FROZEN' : '');
  }

  // === 10. 涟漪微交互 ===
  function spawnRipple(x, y) {
    const r = document.createElement('div');
    r.className = 'ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    rippleLayer.appendChild(r);
    setTimeout(function () { r.remove(); }, 900);
  }

  canvas.addEventListener('mousemove', function (e) {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;
    state.mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', function () {
    state.mouse.inside = false;
  });
  canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    spawnPulse(e.clientX - rect.left, e.clientY - rect.top);
    spawnRipple(e.clientX, e.clientY);
  });

  // === 11. 滑块 / 字符集 / 动作绑定 ===
  function bindSlider(slider, valEl, key, fmt, onChange) {
    slider.addEventListener('input', function () {
      state[key] = parseFloat(slider.value);
      valEl.textContent = fmt(state[key]);
      if (onChange) onChange();
    });
  }
  bindSlider(resSlider, resVal, '_cols', function (v) { return String(v); }, rebuildGrid);
  bindSlider(contrastSlider, contrastVal, 'contrast', function (v) { return v.toFixed(2); });
  bindSlider(brightSlider, brightVal, 'brightness', function (v) { return v.toFixed(2); });
  bindSlider(glitchSlider, glitchVal, 'glitch', function (v) { return v.toFixed(2); });

  charsetGrid.querySelectorAll('.charset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      charsetGrid.querySelectorAll('.charset-btn').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      state.charset = btn.dataset.charset;
    });
  });

  function toggleFreeze() {
    state.frozen = !state.frozen;
    btnFreeze.classList.toggle('is-active', state.frozen);
    liveDot.classList.toggle('is-frozen', state.frozen);
    updateSub(scopeSub.dataset.base || FEED_META[state.feed].sub);
    updateHud();
  }

  function toggleInvert() {
    state.invert = !state.invert;
    btnInvert.classList.toggle('is-active', state.invert);
  }

  function snapshot() {
    if (!state.buffer) return;
    const cols = state.cols;
    const rows = state.rows;
    const chars = CHARSETS[state.charset];
    const lines = [];
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        const v = state.buffer[y * cols + x];
        let ci = (v * chars.length) | 0;
        if (ci > chars.length - 1) ci = chars.length - 1;
        line += chars[ci] || ' ';
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ascii-signal-cam-' + Date.now() + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    flash.classList.remove('is-on');
    void flash.offsetWidth;
    flash.classList.add('is-on');
  }

  btnFreeze.addEventListener('click', toggleFreeze);
  btnInvert.addEventListener('click', toggleInvert);
  btnShot.addEventListener('click', snapshot);

  document.querySelectorAll('.nav-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setFeed(chip.dataset.feed);
      spawnRipple(window.innerWidth / 2, 60);
    });
  });

  document.querySelectorAll('.theme-dot').forEach(function (dot) {
    dot.addEventListener('click', function () {
      document.body.dataset.theme = dot.dataset.theme;
      rebuildRamp();
    });
  });

  // === 12. 键盘快捷键 ===
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key.toLowerCase()) {
      case 'f': toggleFreeze(); break;
      case 'i': toggleInvert(); break;
      case 's': snapshot(); break;
      case 'g': triggerGlitch(performance.now()); break;
      case '1': case '2': case '3': case '4': case '5':
        setFeed(FEED_ORDER[parseInt(e.key, 10) - 1]);
        break;
    }
  });

  // === 13. 信号指标动画 ===
  function updateMetrics() {
    const sig = signalStrength(performance.now());
    const luma = state.meanLuma;
    let noise = Math.min(1, state.variance * 2.2 + state.glitch * 0.3);
    const fpsN = Math.min(1, state.fps / 60);

    mSig.style.width = sig + '%';
    mSigV.textContent = sig + '%';
    mLuma.style.width = Math.round(luma * 100) + '%';
    mLumaV.textContent = luma.toFixed(2);
    mNoise.style.width = Math.round(noise * 100) + '%';
    mNoiseV.textContent = noise > 0.66 ? 'HIGH' : noise > 0.33 ? 'MED' : 'LOW';
    mFps.style.width = Math.round(fpsN * 100) + '%';
    mFpsV.textContent = Math.round(state.fps);
  }
  setInterval(updateMetrics, 1600);

  // === 14. 底部 Ticker ===
  function buildTicker() {
    const items = [
      '⟨ MODE ⟩', '<b>ASCII TRANSCODE</b>',
      '⟨ SCAN ⟩', 'PROGRESSIVE',
      '⟨ RAMP ⟩', '<b>LUMA→GLYPH</b>',
      '⟨ PROTO ⟩', 'NTSC-J',
      '⟨ LENS ⟩', 'MAG +1.85×',
      '⟨ PULSE ⟩', '<b>26 cells/s</b>',
      '⟨ BUFFER ⟩', 'FLOAT32',
      '⟨ CRT ⟩', '3px LINES',
      '⟨ EXPORT ⟩', '<b>.TXT SNAPSHOT</b>',
      '⟨ ENGINE ⟩', 'CANVAS 2D',
      '⟨ SIGNAL ⟩', '<b>STABLE</b>'
    ];
    const html = items.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    tickerTrack.innerHTML = html + html;
  }

  // === 启动 ===
  rebuildRamp();
  rebuildGrid();
  buildTicker();
  updateMetrics();
  requestAnimationFrame(render);
})();
