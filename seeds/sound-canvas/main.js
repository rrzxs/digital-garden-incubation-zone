/* ============================================================
   Sound Canvas 声弦画布
   落笔即成曲，松手即成画：
   - 纵向定位音高（音阶量化） / 横向声像 / 笔速明暗
   - 4 种音色 × 4 种音阶 × 4 种氛围配色
   - 回放模式：扫描线扫过画作，笔迹逐点发声、绽放光尘
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('paintCanvas');
  const ctx = canvas.getContext('2d');
  const playheadEl = document.getElementById('playhead');
  const stageHint = document.getElementById('stageHint');
  const replayBadge = document.getElementById('replayBadge');
  const replayTimeEl = document.getElementById('replayTime');
  const noteCountEl = document.getElementById('noteCount');
  const durCountEl = document.getElementById('durCount');
  const timbreRow = document.getElementById('timbreRow');
  const scaleRow = document.getElementById('scaleRow');
  const themeRow = document.getElementById('themeRow');
  const replayBtn = document.getElementById('replayBtn');
  const undoBtn = document.getElementById('undoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const cursorGlow = document.getElementById('cursorGlow') ||
    document.getElementById('cursor-glow');

  // === State ===
  const state = {
    timbre: 'glass',
    scale: 'penta-major',
    theme: 'nebula',
    strokes: [],          // [{ points: [{x, y, t, w}], timbre, hue }]
    current: null,        // 进行中的笔画
    particles: [],        // 光尘粒子
    bursts: [],           // 回放绽放光晕
    replay: { active: false, t0: 0, duration: 0, fired: new Set(), keys: [] },
    pointer: { x: 0, y: 0, px: 0, py: 0, down: false, speed: 0 },
    brush: { x: 0, y: 0, has: false },
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    w: 0, h: 0,
    hueShift: 262
  };

  // === Music Theory: Scales & Pitch Mapping ===
  const SCALES = {
    'penta-major': [0, 2, 4, 7, 9],
    'penta-minor': [0, 3, 5, 7, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11]
  };
  const ROOT_HZ = 130.81; // C3

  function yToFreq(y) {
    const steps = SCALES[state.scale];
    const total = 32; // 覆盖约 5 个八度的量化格
    const grid = Math.floor((1 - y / state.h) * total);
    const clamped = Math.max(0, Math.min(total - 1, grid));
    const octave = Math.floor(clamped / steps.length);
    const degree = steps[clamped % steps.length];
    return ROOT_HZ * Math.pow(2, (octave * 12 + degree) / 12);
  }

  function yToHue(y) {
    return state.hueShift + (1 - y / state.h) * 90 - 45;
  }

  // === Audio Engine (Web Audio 合成) ===
  const AudioEngine = {
    ctx: null,
    master: null,
    delay: null,
    lastNoteAt: 0,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;

      // 轻量氛围：反馈延迟制造空间感
      this.delay = this.ctx.createDelay(1.2);
      this.delay.delayTime.value = 0.34;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.32;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.28;
      const damp = this.ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2400;

      this.delay.connect(feedback);
      feedback.connect(damp);
      damp.connect(this.delay);
      this.delay.connect(wet);
      wet.connect(this.master);
      this.master.connect(this.ctx.destination);
    },

    resume() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    note(freq, vel, pan, timbre) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // 节流：避免密集触发轰鸣
      if (now - this.lastNoteAt < 0.055) return;
      this.lastNoteAt = now;

      const t = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) panner.pan.value = Math.max(-0.8, Math.min(0.8, pan));

      const out = panner || t;
      if (panner) panner.connect(t);
      t.connect(this.master);
      t.connect(this.delay);

      const presets = {
        glass: { type: 'sine', harm: 'triangle', hGain: 0.22, att: 0.008, dec: 1.6, cutoff: 5200 },
        bell: { type: 'sine', harm: 'sine', hGain: 0.4, att: 0.002, dec: 2.4, cutoff: 6800 },
        pluck: { type: 'triangle', harm: 'sawtooth', hGain: 0.12, att: 0.004, dec: 0.55, cutoff: 3200 },
        pad: { type: 'sine', harm: 'sine', hGain: 0.3, att: 0.14, dec: 2.8, cutoff: 3000 }
      };
      const cfg = presets[timbre] || presets.glass;
      const v = Math.max(0.08, Math.min(1, vel));

      const osc = this.ctx.createOscillator();
      osc.type = cfg.type;
      osc.frequency.value = freq;
      const harm = this.ctx.createOscillator();
      harm.type = cfg.harm;
      harm.frequency.value = freq * 2.005;
      const hg = this.ctx.createGain();
      hg.gain.value = cfg.hGain;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cfg.cutoff * (0.5 + v * 0.8);

      const peak = 0.24 * v;
      t.gain.setValueAtTime(0.0001, now);
      t.gain.exponentialRampToValueAtTime(peak, now + cfg.att);
      t.gain.exponentialRampToValueAtTime(0.0001, now + cfg.att + cfg.dec);

      osc.connect(lp);
      harm.connect(hg);
      hg.connect(lp);
      lp.connect(out);

      osc.start(now);
      harm.start(now);
      osc.stop(now + cfg.att + cfg.dec + 0.1);
      harm.stop(now + cfg.att + cfg.dec + 0.1);
    }
  };

  // === Canvas: Resize & Persistent Paint Layer ===
  const paintLayer = document.createElement('canvas');
  const paintCtx = paintLayer.getContext('2d');

  function resize() {
    const rect = stage.getBoundingClientRect();
    state.w = rect.width;
    state.h = rect.height;
    canvas.width = paintLayer.width = Math.round(state.w * state.dpr);
    canvas.height = paintLayer.height = Math.round(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    paintCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    redrawPaint();
  }

  function redrawPaint() {
    paintCtx.clearRect(0, 0, state.w, state.h);
    state.strokes.forEach(drawStroke);
    if (state.current) drawStroke(state.current);
  }

  function drawStroke(stroke) {
    const pts = stroke.points;
    if (pts.length < 2) return;
    paintCtx.save();
    paintCtx.lineCap = 'round';
    paintCtx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const grad = paintCtx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, `hsla(${a.hue}, 85%, 68%, 0.85)`);
      grad.addColorStop(1, `hsla(${b.hue}, 85%, 68%, 0.85)`);
      paintCtx.strokeStyle = grad;
      paintCtx.lineWidth = b.w;
      paintCtx.shadowColor = `hsla(${b.hue}, 90%, 65%, 0.55)`;
      paintCtx.shadowBlur = 14;
      paintCtx.beginPath();
      paintCtx.moveTo(a.x, a.y);
      paintCtx.lineTo(b.x, b.y);
      paintCtx.stroke();
    }
    paintCtx.restore();
  }

  // === Particles: 光尘与回放绽放 ===
  function spawnDust(x, y, hue, n, spread) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = spread * (0.3 + Math.random());
      state.particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 0.2,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        size: 1 + Math.random() * 2.4,
        hue: hue + (Math.random() * 30 - 15)
      });
    }
  }

  function spawnBurst(x, y, hue) {
    state.bursts.push({ x, y, r: 4, hue, life: 1 });
    spawnDust(x, y, hue, 7, 2.4);
  }

  function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy = p.vy * 0.97 - 0.008;
      p.life -= p.decay;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.bursts.length - 1; i >= 0; i--) {
      const b = state.bursts[i];
      b.r += 2.2;
      b.life -= 0.035;
      if (b.life <= 0) state.bursts.splice(i, 1);
    }
  }

  function renderParticles() {
    state.particles.forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 90%, 72%, ${p.life * 0.8})`;
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    state.bursts.forEach((b) => {
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${b.hue}, 90%, 70%, ${b.life * 0.7})`;
      ctx.lineWidth = 1.4;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // === Painting: 弹性笔刷 + 实时发声 ===
  function beginStroke(x, y) {
    AudioEngine.resume();
    stopReplay();
    state.current = {
      points: [{ x, y, t: performance.now(), w: 3, hue: yToHue(y) }],
      timbre: state.timbre
    };
    hideHint();
    triggerNoteAt(x, y, 0.5);
  }

  function extendStroke(x, y, speed) {
    const s = state.current;
    if (!s) return;
    // 弹性跟随：笔刷以弹簧比例追踪指针，制造呼吸般的笔迹
    const bx = state.brush.has ? state.brush.x : x;
    const by = state.brush.has ? state.brush.y : y;
    const nx = bx + (x - bx) * 0.45;
    const ny = by + (y - by) * 0.45;
    state.brush.x = nx;
    state.brush.y = ny;
    state.brush.has = true;

    const last = s.points[s.points.length - 1];
    const dist = Math.hypot(nx - last.x, ny - last.y);
    if (dist < 4) return;

    // 笔速 → 线宽与力度：慢笔沉稳、快笔轻盈
    const vel = Math.max(0.15, Math.min(1, 2.2 - speed / 40));
    const w = 2.5 + vel * 5;
    const hue = yToHue(ny);
    s.points.push({ x: nx, y: ny, t: performance.now(), w, hue });

    // 增量绘制（性能：只画新线段）
    paintCtx.save();
    paintCtx.lineCap = 'round';
    const grad = paintCtx.createLinearGradient(last.x, last.y, nx, ny);
    grad.addColorStop(0, `hsla(${last.hue}, 85%, 68%, 0.85)`);
    grad.addColorStop(1, `hsla(${hue}, 85%, 68%, 0.85)`);
    paintCtx.strokeStyle = grad;
    paintCtx.lineWidth = w;
    paintCtx.shadowColor = `hsla(${hue}, 90%, 65%, 0.55)`;
    paintCtx.shadowBlur = 14;
    paintCtx.beginPath();
    paintCtx.moveTo(last.x, last.y);
    paintCtx.lineTo(nx, ny);
    paintCtx.stroke();
    paintCtx.restore();

    spawnDust(nx, ny, hue, 2, 1.2);
    triggerNoteAt(nx, ny, vel);
  }

  function endStroke() {
    const s = state.current;
    state.current = null;
    state.brush.has = false;
    if (s && s.points.length > 2) state.strokes.push(s);
    updateStats();
  }

  function triggerNoteAt(x, y, vel) {
    const freq = yToFreq(y);
    const pan = (x / state.w) * 2 - 1;
    AudioEngine.note(freq, vel, pan, state.timbre);
    spawnBurst(x, y, yToHue(y));
  }

  // === Replay: 扫描线回放画作 ===
  function buildReplayKeys() {
    const keys = [];
    state.strokes.forEach((s, si) => {
      s.points.forEach((p, pi) => {
        keys.push({ x: p.x, y: p.y, hue: p.hue, timbre: s.timbre, si, pi });
      });
    });
    keys.sort((a, b) => a.x - b.x);
    return keys;
  }

  function startReplay() {
    if (!state.strokes.length) { hideHint(); return; }
    AudioEngine.resume();
    hideHint();
    const keys = buildReplayKeys();
    const maxX = keys[keys.length - 1].x;
    const duration = Math.max(4, (maxX / Math.max(state.w, 1)) * 18);
    state.replay = { active: true, t0: performance.now(), duration, fired: new Set(), keys };
    playheadEl.classList.add('is-active');
    replayBadge.classList.add('is-visible');
    replayBtn.querySelector('.tool-icon').textContent = '■';
  }

  function stopReplay() {
    if (!state.replay.active) return;
    state.replay.active = false;
    playheadEl.classList.remove('is-active');
    replayBadge.classList.remove('is-visible');
    playheadEl.style.transform = 'translateX(0px)';
    replayBtn.querySelector('.tool-icon').textContent = '▶';
  }

  function tickReplay(now) {
    const r = state.replay;
    if (!r.active) return;
    const elapsed = (now - r.t0) / 1000;
    if (elapsed >= r.duration) { stopReplay(); return; }

    const progress = elapsed / r.duration;
    const playX = progress * state.w;
    playheadEl.style.transform = `translateX(${playX}px)`;
    replayTimeEl.textContent = elapsed.toFixed(1) + 's';

    // 扫描线越过笔迹点 → 触发对应音符
    const minGap = 0.09;
    const lastFiredBy = {};
    for (let i = 0; i < r.keys.length; i++) {
      const k = r.keys[i];
      const keyId = k.si + ':' + k.pi;
      if (k.x <= playX && !r.fired.has(keyId)) {
        r.fired.add(keyId);
        const lastT = lastFiredBy[k.si] || 0;
        const audioNow = AudioEngine.ctx ? AudioEngine.ctx.currentTime : 0;
        if (audioNow - lastT >= minGap) {
          lastFiredBy[k.si] = audioNow;
          const freq = yToFreq(k.y);
          const pan = (k.x / state.w) * 2 - 1;
          AudioEngine.note(freq, 0.55, pan, k.timbre);
        }
        spawnBurst(k.x, k.y, k.hue);
      }
    }
  }

  // === Stats HUD ===
  function updateStats() {
    const count = state.strokes.reduce((sum, s) => sum + s.points.length, 0);
    noteCountEl.textContent = count;
    const maxX = state.strokes.reduce((m, s) => Math.max(m, ...s.points.map((p) => p.x)), 0);
    durCountEl.textContent = (maxX / Math.max(state.w, 1) * 18).toFixed(1) + 's';
  }

  function hideHint() {
    if (state.strokes.length || state.current) stageHint.classList.add('is-hidden');
  }

  // === Render Loop ===
  function loop(now) {
    ctx.clearRect(0, 0, state.w, state.h);
    // 持久画层微微呼吸（透明度随时间轻微脉动）
    const breathe = 0.88 + Math.sin(now * 0.0009) * 0.06;
    ctx.globalAlpha = Math.min(1, breathe);
    ctx.drawImage(paintLayer, 0, 0, state.w, state.h);
    ctx.globalAlpha = 1;

    updateParticles();
    renderParticles();
    tickReplay(now);
    requestAnimationFrame(loop);
  }

  // === Pointer Events ===
  function localPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = localPos(e);
    state.pointer.down = true;
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    state.brush.has = false;
    beginStroke(p.x, p.y);
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = localPos(e);
    const dx = p.x - state.pointer.x;
    const dy = p.y - state.pointer.y;
    const speed = Math.hypot(dx, dy);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    if (state.pointer.down) extendStroke(p.x, p.y, speed);
  });

  const releasePointer = () => {
    if (!state.pointer.down) return;
    state.pointer.down = false;
    endStroke();
  };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('pointerleave', releasePointer);

  // === Cursor Glow ===
  window.addEventListener('pointermove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
  }, { passive: true });

  // === Console Interactions ===
  timbreRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-timbre]');
    if (!btn) return;
    timbreRow.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.timbre = btn.dataset.timbre;
  });

  scaleRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scale]');
    if (!btn) return;
    scaleRow.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.scale = btn.dataset.scale;
  });

  themeRow.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-theme]');
    if (!dot) return;
    themeRow.querySelectorAll('.theme-dot').forEach((d) => d.classList.remove('active'));
    dot.classList.add('active');
    state.theme = dot.dataset.theme;
    document.documentElement.dataset.theme = state.theme;
    const shifts = { nebula: 262, abyss: 190, ember: 28, aurora: 155 };
    state.hueShift = shifts[state.theme];
    redrawPaint();
  });

  replayBtn.addEventListener('click', () => {
    if (state.replay.active) stopReplay();
    else startReplay();
  });

  undoBtn.addEventListener('click', () => {
    stopReplay();
    state.strokes.pop();
    redrawPaint();
    updateStats();
    if (!state.strokes.length) stageHint.classList.remove('is-hidden');
  });

  clearBtn.addEventListener('click', () => {
    stopReplay();
    state.strokes = [];
    state.particles = [];
    state.bursts = [];
    redrawPaint();
    updateStats();
    stageHint.classList.remove('is-hidden');
  });

  // === Keyboard Shortcut: Space = 回放 ===
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      if (state.replay.active) stopReplay();
      else startReplay();
    }
  });

  // === Boot ===
  document.documentElement.dataset.theme = state.theme;
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
