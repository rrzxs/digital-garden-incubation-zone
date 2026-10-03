/**
 * Cursor Replay Studio · 光标回放工作室
 * 录制光标手势，以彗尾 / 回声 / 缎带 / 迸射四种风格非线性回放。
 * Vanilla JS + Canvas 2D，免构建。
 */

(() => {
  'use strict';

  // === 主题配色（与 style.css 保持同步） ===

  const THEMES = {
    abyss:  { accent: '#67e8f9', accent2: '#a78bfa', accent3: '#38bdf8', warm: '#f0abfc', rec: '#fb7185' },
    aurora: { accent: '#6ee7b7', accent2: '#5eead4', accent3: '#8b5cf6', warm: '#fcd34d', rec: '#fb7185' },
    dusk:   { accent: '#fda4af', accent2: '#f0abfc', accent3: '#fdba74', warm: '#fde68a', rec: '#f43f5e' },
    ember:  { accent: '#fdba74', accent2: '#f87171', accent3: '#fbbf24', warm: '#fef08a', rec: '#ef4444' }
  };

  const EASE_OUT_QUINT = 'cubic-bezier(0.16, 1, 0.3, 1)'; // 声明使用的全局动效曲线（CSS 侧生效）
  const MAX_RECORD_MS = 30000;
  const GHOST_SPACING = 0.14; // 残影之间的时间间隔（秒）

  // === DOM Elements ===

  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const stageCanvas = $('stage-canvas');
  const ambientCanvas = $('ambient-canvas');
  const recIndicator = $('rec-indicator');
  const recTime = $('rec-time');
  const btnRecord = $('btn-record');
  const btnPlay = $('btn-play');
  const btnStop = $('btn-stop');
  const btnLoop = $('btn-loop');
  const playIco = $('play-ico');
  const playTxt = $('play-txt');
  const tlTrack = $('tl-track');
  const tlBuffer = $('tl-buffer');
  const tlProgress = $('tl-progress');
  const tlThumb = $('tl-thumb');
  const tlCurrent = $('tl-current');
  const tlTotal = $('tl-total');
  const speedRange = $('speed-range');
  const speedVal = $('speed-val');
  const ghostRange = $('ghost-range');
  const ghostVal = $('ghost-val');
  const glowRange = $('glow-range');
  const glowVal = $('glow-val');
  const hudDuration = $('hud-duration');
  const hudSamples = $('hud-samples');
  const hudClicks = $('hud-clicks');
  const hudVelocity = $('hud-velocity');
  const hudSource = $('hud-source');

  // === 画布尺寸管理（DPR 自适应） ===

  let W = 0;
  let H = 0;
  let DPR = 1;

  function resizeCanvases() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    for (const cv of [stageCanvas, ambientCanvas]) {
      cv.width = W * DPR;
      cv.height = H * DPR;
      cv.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  const sctx = stageCanvas.getContext('2d');
  const actx = ambientCanvas.getContext('2d');

  // === 状态 ===

  const state = {
    theme: 'abyss',
    trail: 'comet',
    mode: 'idle', // idle | recording | playing | paused
    recording: null, // { samples: [{t,x,y}], clicks: [{t,x,y}], duration }
    playhead: 0,
    speed: 1,
    loop: true,
    ghostCount: 3,
    glow: 0.65,
    particles: [], // 迸射粒子
    ripples: [],   // 点击涟漪
    cursor: { x: W / 2, y: H / 2, active: false }
  };

  function themeColors() { return THEMES[state.theme] || THEMES.abyss; }

  // === 环境粒子流场 ===

  const AMBIENT_COUNT = 70;
  const ambient = [];

  function seedAmbient() {
    ambient.length = 0;
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      ambient.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.6 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  seedAmbient();
  window.addEventListener('resize', seedAmbient);

  function updateAmbient(t) {
    actx.clearRect(0, 0, W, H);
    const c = themeColors();
    actx.globalCompositeOperation = 'lighter';
    for (const p of ambient) {
      p.vx += Math.sin(t * 0.00021 + p.phase) * 0.004;
      p.vy += Math.cos(t * 0.00017 + p.phase) * 0.004;
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0012 + p.phase));
      actx.globalAlpha = 0.24 * tw * state.glow;
      actx.fillStyle = c.accent;
      actx.beginPath();
      actx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      actx.fill();
    }
    actx.globalAlpha = 1;
    actx.globalCompositeOperation = 'source-over';
  }

  // === 演示手势（页面加载即自动演出） ===

  function buildDemoRecording() {
    const samples = [];
    const clicks = [];
    const duration = 12000;
    const cx = W / 2;
    const cy = H / 2;
    const rx = Math.min(W * 0.3, 380);
    const ry = Math.min(H * 0.22, 240);
    for (let t = 0; t <= duration; t += 16) {
      const p = t / duration;
      // 利萨如签名曲线：一笔连心的手势
      const x = cx + rx * Math.sin(p * Math.PI * 4 + 0.6) * (0.6 + 0.4 * Math.sin(p * Math.PI * 2));
      const y = cy + ry * Math.sin(p * Math.PI * 6) * (0.7 + 0.3 * Math.cos(p * Math.PI * 3));
      samples.push({ t: t / 1000, x, y });
    }
    clicks.push({ t: 1.6, x: 0, y: 0 }, { t: 6.2, x: 0, y: 0 }, { t: 10.4, x: 0, y: 0 });
    for (const cl of clicks) {
      const pos = positionInSamples(samples, cl.t);
      cl.x = pos.x; cl.y = pos.y;
    }
    return { samples, clicks, duration: duration / 1000, source: 'DEMO' };
  }

  // === 录制器 ===

  function startRecording() {
    stopPlayback();
    state.recording = { samples: [], clicks: [], duration: 0, source: 'LIVE', startTime: performance.now() };
    state.mode = 'recording';
    recIndicator.classList.add('visible');
    btnRecord.classList.add('active');
    setPlayUI(false);
    updateHUD();
  }

  function sampleRecording(now) {
    const rec = state.recording;
    const t = (now - rec.startTime) / 1000;
    const last = rec.samples[rec.samples.length - 1];
    if (!last || Math.hypot(state.cursor.x - last.x, state.cursor.y - last.y) > 1.5) {
      rec.samples.push({ t, x: state.cursor.x, y: state.cursor.y });
    }
    rec.duration = t;
    recTime.textContent = formatTime(t);
    // 录制中的实时轨迹
    drawLiveRecordingTrail(rec);
    if (t * 1000 >= MAX_RECORD_MS) stopRecording();
  }

  function recordClick() {
    if (state.mode !== 'recording') return;
    const rec = state.recording;
    rec.clicks.push({
      t: (performance.now() - rec.startTime) / 1000,
      x: state.cursor.x,
      y: state.cursor.y
    });
    spawnRipple(state.cursor.x, state.cursor.y, true);
  }

  function stopRecording() {
    if (state.mode !== 'recording') return;
    const rec = state.recording;
    state.mode = 'idle';
    recIndicator.classList.remove('visible');
    btnRecord.classList.remove('active');
    recTime.textContent = '00:00.0';
    updateHUD();
    updateTimeline();
    if (rec.samples.length > 4) {
      // 录制完成，自动播放一次
      startPlayback();
    }
  }

  // === 回放引擎 ===

  function positionInSamples(samples, t) {
    if (!samples.length) return { x: W / 2, y: H / 2 };
    if (t <= samples[0].t) return samples[0];
    const lastS = samples[samples.length - 1];
    if (t >= lastS.t) return lastS;
    // 二分查找
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].t <= t) lo = mid; else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    const span = b.t - a.t || 1;
    const p = (t - a.t) / span;
    // 平滑插值（easeInOut 弱化折角）
    const pe = p * p * (3 - 2 * p);
    return { x: a.x + (b.x - a.x) * pe, y: a.y + (b.y - a.y) * pe };
  }

  function startPlayback() {
    if (!state.recording || state.recording.samples.length < 2) return;
    state.mode = 'playing';
    setPlayUI(true);
  }

  function pausePlayback() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    setPlayUI(false);
  }

  function stopPlayback() {
    if (state.mode === 'playing' || state.mode === 'paused') {
      state.mode = 'idle';
      state.playhead = 0;
      state.particles.length = 0;
      state.ripples.length = 0;
      setPlayUI(false);
      updateTimeline();
    }
  }

  function setPlayUI(playing) {
    playIco.textContent = playing ? '❚❚' : '▶';
    playTxt.textContent = playing ? '暂停' : '播放';
    btnPlay.classList.toggle('active', playing);
  }

  // === 回放渲染 ===

  let lastClickFiredIndex = -1;

  function updatePlayback(dt, now) {
    const rec = state.recording;
    if (!rec) return;
    state.playhead += dt * state.speed;

    if (state.playhead >= rec.duration) {
      if (state.loop) {
        state.playhead = 0;
        lastClickFiredIndex = -1;
        state.particles.length = 0;
      } else {
        state.playhead = rec.duration;
        stopPlayback();
        return;
      }
    }

    // 触发已越过的点击事件
    rec.clicks.forEach((cl, i) => {
      if (i > lastClickFiredIndex && state.playhead >= cl.t && rec.duration - state.playhead > 0.05) {
        lastClickFiredIndex = i;
        spawnRipple(cl.x, cl.y, false);
        spawnBurst(cl.x, cl.y, 26);
      }
    });

    drawReplayFrame(now);
    updateTimeline();
    updateVelocityHUD();
  }

  function drawReplayFrame(now) {
    const rec = state.recording;
    const c = themeColors();
    const t = state.playhead;
    const head = positionInSamples(rec.samples, t);

    // --- 主轨迹绘制（按风格分发） ---
    if (state.trail === 'comet') drawCometTrail(rec, t, head, c, now);
    else if (state.trail === 'echo') drawEchoTrail(rec, t, head, c, now);
    else if (state.trail === 'ribbon') drawRibbonTrail(rec, t, head, c, now);
    else drawBurstTrail(rec, t, head, c, now);

    // --- 残影光标 ---
    for (let g = 1; g <= state.ghostCount; g++) {
      const gt = t - g * GHOST_SPACING;
      if (gt < 0) continue;
      const gp = positionInSamples(rec.samples, gt);
      drawCursorArrow(gp.x, gp.y, c.accent2, (1 - g / (state.ghostCount + 1)) * 0.45, 0.7 + 0.06 * g);
    }

    // --- 主光标 ---
    drawCursorArrow(head.x, head.y, c.accent, 1, 1.15);
    drawHalo(head.x, head.y, c.accent, now);

    updateParticles();
    updateRipples();
  }

  function drawCometTrail(rec, t, head, c, now) {
    const windowSec = 1.4;
    const pts = collectSegment(rec, t - windowSec, t);
    if (pts.length < 2) return;
    sctx.globalCompositeOperation = 'lighter';
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const p = i / pts.length;
      sctx.globalAlpha = Math.pow(p, 1.6) * state.glow;
      sctx.strokeStyle = mixHex(c.accent3, c.accent, p);
      sctx.lineWidth = 1 + p * 3.2;
      sctx.shadowColor = c.accent;
      sctx.shadowBlur = 14 * p * state.glow;
      sctx.beginPath();
      sctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      sctx.lineTo(pts[i].x, pts[i].y);
      sctx.stroke();
    }
    sctx.shadowBlur = 0;
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
    void head; void now;
  }

  function drawEchoTrail(rec, t, head, c, now) {
    const windowSec = 2.2;
    const pts = collectSegment(rec, t - windowSec, t);
    sctx.globalCompositeOperation = 'lighter';
    // 等距历史点回声
    const echoCount = 14;
    for (let e = 1; e <= echoCount; e++) {
      const et = t - (e / echoCount) * windowSec;
      if (et < 0) continue;
      const ep = positionInSamples(rec.samples, et);
      const fade = (1 - e / echoCount) * state.glow;
      const pul = 0.75 + 0.25 * Math.sin(now * 0.004 - e * 0.7);
      sctx.globalAlpha = fade * 0.8;
      sctx.fillStyle = e % 2 === 0 ? c.accent : c.accent2;
      sctx.beginPath();
      sctx.arc(ep.x, ep.y, 2.6 * pul + 0.6, 0, Math.PI * 2);
      sctx.fill();
    }
    // 细线连接
    sctx.globalAlpha = 0.28 * state.glow;
    sctx.strokeStyle = c.accent;
    sctx.lineWidth = 1;
    sctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? sctx.moveTo(p.x, p.y) : sctx.lineTo(p.x, p.y)));
    sctx.stroke();
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
    void head;
  }

  function drawRibbonTrail(rec, t, head, c, now) {
    const windowSec = 1.8;
    const pts = collectSegment(rec, t - windowSec, t);
    if (pts.length < 3) return;
    // 计算每点的速度 → 缎带宽度
    const widths = pts.map((p, i) => {
      const prev = pts[Math.max(0, i - 1)];
      const d = Math.hypot(p.x - prev.x, p.y - prev.y);
      return 2 + Math.min(d * 0.5, 16);
    });
    sctx.globalCompositeOperation = 'lighter';
    // 用逐段变宽的四边形近似缎带
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const w0 = widths[i];
      const w1 = widths[i + 1];
      const prog = i / pts.length;
      sctx.globalAlpha = Math.pow(prog, 1.3) * state.glow * 0.85;
      sctx.fillStyle = mixHex(c.accent2, c.warm, prog);
      sctx.beginPath();
      sctx.moveTo(p0.x + nx * w0, p0.y + ny * w0);
      sctx.lineTo(p0.x - nx * w0, p0.y - ny * w0);
      sctx.lineTo(p1.x - nx * w1, p1.y - ny * w1);
      sctx.lineTo(p1.x + nx * w1, p1.y + ny * w1);
      sctx.closePath();
      sctx.fill();
    }
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
    void head; void now;
  }

  function drawBurstTrail(rec, t, head, c, now) {
    // 沿路径持续喷发粒子
    if (Math.random() < 0.85) {
      const vel = sampleVelocity(rec, t);
      spawnBurst(head.x, head.y, 2 + Math.min(3, Math.floor(vel / 900)), 0.6);
    }
    // 极细引导线
    const pts = collectSegment(rec, t - 0.5, t);
    sctx.globalCompositeOperation = 'lighter';
    sctx.globalAlpha = 0.3 * state.glow;
    sctx.strokeStyle = c.accent;
    sctx.lineWidth = 1;
    sctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? sctx.moveTo(p.x, p.y) : sctx.lineTo(p.x, p.y)));
    sctx.stroke();
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
    void now;
  }

  function collectSegment(rec, t0, t1) {
    const out = [];
    if (t1 <= 0) return out;
    const start = Math.max(0, t0);
    const step = 0.02;
    for (let t = start; t <= t1; t += step) out.push(positionInSamples(rec.samples, t));
    out.push(positionInSamples(rec.samples, t1));
    return out;
  }

  function sampleVelocity(rec, t) {
    const a = positionInSamples(rec.samples, Math.max(0, t - 0.05));
    const b = positionInSamples(rec.samples, t + 0.05);
    return Math.hypot(b.x - a.x, b.y - a.y) / 0.1;
  }

  // === 光标箭头 / 光晕 / 涟漪 / 粒子 ===

  function drawCursorArrow(x, y, color, alpha, scale) {
    sctx.save();
    sctx.translate(x, y);
    sctx.scale(scale, scale);
    sctx.globalAlpha = alpha;
    sctx.shadowColor = color;
    sctx.shadowBlur = 16;
    sctx.fillStyle = color;
    sctx.strokeStyle = 'rgba(0,0,0,0.35)';
    sctx.lineWidth = 1;
    sctx.beginPath();
    sctx.moveTo(0, 0);
    sctx.lineTo(0, 18);
    sctx.lineTo(4.6, 13.6);
    sctx.lineTo(7.6, 19.6);
    sctx.lineTo(10.6, 18.1);
    sctx.lineTo(7.7, 12.2);
    sctx.lineTo(13.4, 11.8);
    sctx.closePath();
    sctx.fill();
    sctx.stroke();
    sctx.restore();
  }

  function drawHalo(x, y, color, now) {
    const r = 26 + Math.sin(now * 0.003) * 5;
    const g = sctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, 0.32 * state.glow));
    g.addColorStop(1, hexA(color, 0));
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.arc(x, y, r, 0, Math.PI * 2);
    sctx.fill();
  }

  function spawnRipple(x, y, isLive) {
    state.ripples.push({ x, y, r: 4, maxR: isLive ? 90 : 130, alpha: 0.9 });
  }

  function updateRipples() {
    const c = themeColors();
    for (let i = state.ripples.length - 1; i >= 0; i--) {
      const rp = state.ripples[i];
      rp.r += (rp.maxR - rp.r) * 0.055 + 0.8;
      rp.alpha *= 0.955;
      if (rp.alpha < 0.02) { state.ripples.splice(i, 1); continue; }
      sctx.strokeStyle = hexA(c.warm, rp.alpha);
      sctx.lineWidth = 1.6;
      sctx.shadowColor = c.warm;
      sctx.shadowBlur = 10 * rp.alpha;
      sctx.beginPath();
      sctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      sctx.stroke();
      sctx.shadowBlur = 0;
    }
  }

  function spawnBurst(x, y, count, speedMul = 1) {
    const c = themeColors();
    const palette = [c.accent, c.accent2, c.accent3, c.warm];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 2.6) * speedMul;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        r: 1 + Math.random() * 2.2,
        color: palette[(Math.random() * palette.length) | 0]
      });
    }
    if (state.particles.length > 600) state.particles.splice(0, state.particles.length - 600);
  }

  function updateParticles() {
    sctx.globalCompositeOperation = 'lighter';
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 0.012;
      p.life -= p.decay;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      sctx.globalAlpha = p.life * state.glow;
      sctx.fillStyle = p.color;
      sctx.beginPath();
      sctx.arc(p.x, p.y, p.r * p.life + 0.3, 0, Math.PI * 2);
      sctx.fill();
    }
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
  }

  // === 录制中的实时轨迹 ===

  function drawLiveRecordingTrail(rec) {
    // 轨迹由主循环每帧重绘，这里只画最近的线段
    const c = themeColors();
    const pts = rec.samples.slice(-90);
    if (pts.length < 2) return;
    sctx.globalCompositeOperation = 'lighter';
    sctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const p = i / pts.length;
      sctx.globalAlpha = p * 0.8;
      sctx.strokeStyle = c.rec;
      sctx.lineWidth = 1 + p * 2;
      sctx.shadowColor = c.rec;
      sctx.shadowBlur = 8;
      sctx.beginPath();
      sctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      sctx.lineTo(pts[i].x, pts[i].y);
      sctx.stroke();
    }
    sctx.shadowBlur = 0;
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
    drawCursorArrow(state.cursor.x, state.cursor.y, c.rec, 1, 1.1);
  }

  // === 工具函数 ===

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function mixHex(h1, h2, p) {
    const a = parseInt(h1.slice(1), 16);
    const b = parseInt(h2.slice(1), 16);
    const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * p);
    const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * p);
    const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * p);
    return `rgb(${r},${g},${bl})`;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = sec.toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  }

  // === HUD / 时间轴 ===

  function updateHUD() {
    const rec = state.recording;
    if (!rec) return;
    hudDuration.textContent = `${rec.duration.toFixed(2)}s`;
    hudSamples.textContent = rec.samples.length;
    hudClicks.textContent = rec.clicks.length;
    hudSource.textContent = rec.source;
    tlTotal.textContent = `${rec.duration.toFixed(1)}s`;
    tlBuffer.style.width = '100%';
  }

  function updateVelocityHUD() {
    if (!state.recording) return;
    const v = sampleVelocity(state.recording, state.playhead);
    hudVelocity.textContent = `${Math.round(v)} px/s`;
  }

  function updateTimeline() {
    const rec = state.recording;
    if (!rec || !rec.duration) return;
    const p = Math.min(1, state.playhead / rec.duration);
    tlProgress.style.width = `${p * 100}%`;
    tlThumb.style.left = `${p * 100}%`;
    tlCurrent.textContent = formatTime(state.playhead);
  }

  // === 交互绑定 ===

  window.addEventListener('pointermove', (e) => {
    state.cursor.x = e.clientX;
    state.cursor.y = e.clientY;
    state.cursor.active = true;
  }, { passive: true });

  stageCanvas.addEventListener('pointerdown', (e) => {
    state.cursor.x = e.clientX;
    state.cursor.y = e.clientY;
    if (state.mode === 'recording') {
      recordClick();
    } else {
      spawnRipple(e.clientX, e.clientY, true);
      spawnBurst(e.clientX, e.clientY, 12);
    }
  });

  btnRecord.addEventListener('click', () => {
    if (state.mode === 'recording') stopRecording();
    else startRecording();
  });
  btnPlay.addEventListener('click', () => {
    if (state.mode === 'playing') pausePlayback();
    else if (state.mode === 'paused') startPlayback();
    else if (state.recording) {
      state.playhead = 0;
      lastClickFiredIndex = -1;
      startPlayback();
    }
  });
  btnStop.addEventListener('click', () => {
    if (state.mode === 'recording') stopRecording();
    else stopPlayback();
  });
  btnLoop.addEventListener('click', () => {
    state.loop = !state.loop;
    btnLoop.classList.toggle('active', state.loop);
  });

  // 时间轴拖拽（非线性缓动跟随）
  let scrubbing = false;
  function scrubTo(clientX) {
    const rect = tlTrack.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (state.recording) {
      state.playhead = p * state.recording.duration;
      lastClickFiredIndex = -1;
      for (let i = 0; i < state.recording.clicks.length; i++) {
        if (state.recording.clicks[i].t <= state.playhead) lastClickFiredIndex = i;
      }
      updateTimeline();
    }
  }
  tlTrack.addEventListener('pointerdown', (e) => {
    scrubbing = true;
    tlTrack.setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
  });
  tlTrack.addEventListener('pointermove', (e) => { if (scrubbing) scrubTo(e.clientX); });
  tlTrack.addEventListener('pointerup', () => { scrubbing = false; });

  speedRange.addEventListener('input', () => {
    state.speed = parseFloat(speedRange.value);
    speedVal.textContent = `${state.speed.toFixed(2)}×`;
  });
  ghostRange.addEventListener('input', () => {
    state.ghostCount = parseInt(ghostRange.value, 10);
    ghostVal.textContent = state.ghostCount;
  });
  glowRange.addEventListener('input', () => {
    state.glow = parseFloat(glowRange.value);
    glowVal.textContent = state.glow.toFixed(2);
  });

  // 轨迹风格切换
  document.querySelectorAll('.trail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.trail-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.trail = btn.dataset.trail;
    });
  });

  // 氛围配色切换
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.theme = btn.dataset.themeValue;
      body.dataset.theme = state.theme;
    });
  });

  // 键盘快捷键
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyR') { e.preventDefault(); btnRecord.click(); }
    else if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
    else if (e.code === 'Escape') { btnStop.click(); }
  });

  // === 主循环 ===

  let lastFrame = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    updateAmbient(now);
    sctx.clearRect(0, 0, W, H);

    if (state.mode === 'recording' && state.recording) {
      sampleRecording(now);
    } else if (state.mode === 'playing') {
      updatePlayback(dt, now);
    } else if (state.mode === 'paused' || state.mode === 'idle') {
      // 静止时仍渲染当前帧 + 粒子余韵
      if (state.recording && state.mode === 'paused') drawReplayFrame(now);
      else {
        updateParticles();
        updateRipples();
      }
    }

    requestAnimationFrame(loop);
  }

  // === 启动 ===

  state.recording = buildDemoRecording();
  updateHUD();
  requestAnimationFrame(loop);
  setTimeout(() => startPlayback(), 600);

  void EASE_OUT_QUINT;
})();
