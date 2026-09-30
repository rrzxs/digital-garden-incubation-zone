/* ============================================================
   Emotion Orb · 情绪光球
   噪声形变光球 + 环绕粒子 + 情绪脉冲 + 思绪漂移
   ============================================================ */

(function () {
  'use strict';

  // === 情绪预设 ===
  const EMOTIONS = [
    { id: 'calm',    name: '平静', poem: '深海无波，光在其中沉眠', a: '#6ee7b7', b: '#3b82f6', c: '#8b5cf6', hue: 165, energy: 0.25 },
    { id: 'joy',     name: '喜悦', poem: '日光跳进水面，碎成一万个笑', a: '#fde047', b: '#fb923c', c: '#f472b6', hue: 45,  energy: 0.85 },
    { id: 'anger',   name: '愤怒', poem: '岩浆在壳下寻找裂缝', a: '#f87171', b: '#dc2626', c: '#7c2d12', hue: 5,   energy: 0.95 },
    { id: 'sadness', name: '忧伤', poem: '雨落在很远的屋顶上', a: '#60a5fa', b: '#3730a3', c: '#1e1b4b', hue: 225, energy: 0.15 },
    { id: 'fear',    name: '不安', poem: '雾里有心跳，忽快忽慢', a: '#a78bfa', b: '#6d28d9', c: '#18181b', hue: 265, energy: 0.55 },
    { id: 'wonder',  name: '好奇', poem: '把夜空翻过来找答案', a: '#2dd4bf', b: '#0ea5e9', c: '#6366f1', hue: 190, energy: 0.65 }
  ];

  // === DOM Elements ===
  const canvas = document.getElementById('orb-canvas');
  const ctx = canvas.getContext('2d');
  const chipsWrap = document.getElementById('emotion-chips');
  const nameEl = document.getElementById('orb-emotion-name');
  const poemEl = document.getElementById('orb-emotion-poem');
  const intensityRange = document.getElementById('intensity-range');
  const intensityValue = document.getElementById('intensity-value');
  const tempoRange = document.getElementById('tempo-range');
  const tempoValue = document.getElementById('tempo-value');
  const pulseBtn = document.getElementById('pulse-btn');
  const driftBtn = document.getElementById('drift-btn');
  const hudCoh = document.getElementById('hud-coherence');
  const hudNrg = document.getElementById('hud-energy');
  const hudFps = document.getElementById('hud-fps');

  // === 状态 ===
  const state = {
    emotion: EMOTIONS[0],
    intensity: 0.6,
    tempo: 1.0,
    drift: false,
    // 弹簧插值的当前颜色（rgb 数组），用于非线性过渡
    colA: hexToRgb(EMOTIONS[0].a),
    colB: hexToRgb(EMOTIONS[0].b),
    colC: hexToRgb(EMOTIONS[0].c),
    targetA: hexToRgb(EMOTIONS[0].a),
    targetB: hexToRgb(EMOTIONS[0].b),
    targetC: hexToRgb(EMOTIONS[0].c),
    scale: 1,
    targetScale: 1,
    mouse: { x: 0.5, y: 0.5, active: false },
    pulses: [],
    time: 0
  };

  // === 粒子系统 ===
  const PARTICLE_COUNT = 90;
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      radius: 0.4 + Math.random() * 0.85,
      speed: 0.0015 + Math.random() * 0.005,
      size: 0.6 + Math.random() * 2.2,
      wobble: Math.random() * Math.PI * 2
    });
  }

  // === 工具函数 ===
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mixRgb(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }

  function rgbStr(c, alpha) {
    return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
  }

  // 简易 value noise（伪随机平滑噪声）
  function makeNoise(seed) {
    const perms = new Float32Array(512);
    let s = seed;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < 512; i++) perms[i] = rand();
    const fade = (t) => t * t * (3 - 2 * t);
    return function noise(x) {
      const xi = Math.floor(x) & 255;
      const xf = x - Math.floor(x);
      const a = perms[xi];
      const b = perms[xi + 1];
      return a + (b - a) * fade(xf);
    };
  }

  const noiseX = makeNoise(1234);
  const noiseY = makeNoise(5678);

  // === 画布尺寸 ===
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // === 情绪切换 ===
  function applyEmotion(emo) {
    state.emotion = emo;
    state.targetA = hexToRgb(emo.a);
    state.targetB = hexToRgb(emo.b);
    state.targetC = hexToRgb(emo.c);

    const root = document.documentElement.style;
    root.setProperty('--emo-a', emo.a);
    root.setProperty('--emo-b', emo.b);
    root.setProperty('--emo-c', emo.c);
    root.setProperty('--emo-glow', `rgba(${hexToRgb(emo.a).join(',')},0.45)`);

    nameEl.textContent = emo.name;
    poemEl.textContent = emo.poem;

    // 标签轻微弹跳
    const label = nameEl.parentElement;
    label.style.transform = 'translateY(-6px) scale(1.02)';
    setTimeout(() => { label.style.transform = ''; }, 400);

    // 情绪切换自带一次脉冲
    triggerPulse(0.6);
  }

  function buildChips() {
    EMOTIONS.forEach((emo, i) => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (i === 0 ? ' is-active' : '');
      chip.textContent = emo.name;
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      chip.addEventListener('click', () => {
        chipsWrap.querySelectorAll('.chip').forEach((c) => {
          c.classList.remove('is-active');
          c.setAttribute('aria-checked', 'false');
        });
        chip.classList.add('is-active');
        chip.setAttribute('aria-checked', 'true');
        applyEmotion(emo);
      });
      chipsWrap.appendChild(chip);
    });
  }

  // === 脉冲 ===
  function triggerPulse(force) {
    state.pulses.push({
      r: 0,
      max: Math.max(W, H) * 0.7,
      force: force || 1,
      alpha: 0.8
    });
    state.targetScale = 1 + 0.22 * (force || 1);
    setTimeout(() => { state.targetScale = 1; }, 350);
  }

  pulseBtn.addEventListener('click', () => triggerPulse(1));
  driftBtn.addEventListener('click', () => {
    state.drift = !state.drift;
    driftBtn.textContent = state.drift ? '停止漂移' : '让思绪漂移';
    driftBtn.classList.toggle('btn--ghost', !state.drift);
  });

  // === 参数 ===
  intensityRange.addEventListener('input', () => {
    state.intensity = intensityRange.value / 100;
    intensityValue.textContent = intensityRange.value + '%';
  });
  tempoRange.addEventListener('input', () => {
    state.tempo = tempoRange.value / 100;
    tempoValue.textContent = state.tempo.toFixed(1) + '×';
  });

  // === 鼠标 ===
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = (e.clientX - rect.left) / W;
    state.mouse.y = (e.clientY - rect.top) / H;
    state.mouse.active = true;
  });
  canvas.parentElement.addEventListener('pointerleave', () => {
    state.mouse.active = false;
  });
  canvas.parentElement.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.pulses.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      r: 0,
      max: Math.max(W, H) * 0.5,
      force: 0.7,
      alpha: 0.7
    });
  });

  // === 渲染循环 ===
  let lastT = performance.now();
  let fpsAcc = 60;

  function frame(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    state.time += dt * state.tempo;

    fpsAcc = fpsAcc * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;

    // 非线性色彩/尺度插值（弹簧感）
    const k = 1 - Math.pow(0.001, dt * 2.2);
    state.colA = mixRgb(state.colA, state.targetA, k);
    state.colB = mixRgb(state.colB, state.targetB, k);
    state.colC = mixRgb(state.colC, state.targetC, k);
    state.scale += (state.targetScale - state.scale) * (1 - Math.pow(0.0005, dt));

    draw(dt);

    // HUD
    const coherence = (0.5 + 0.5 * Math.sin(state.time * 0.8)) * state.intensity;
    hudCoh.textContent = 'COH ' + coherence.toFixed(2);
    hudNrg.textContent = 'NRG ' + (state.emotion.energy * state.intensity).toFixed(2);
    hudFps.textContent = 'FPS ' + Math.round(fpsAcc);

    requestAnimationFrame(frame);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.26 * state.scale * (0.85 + state.intensity * 0.3);
    const t = state.time;

    // 思绪漂移：光球缓慢游移
    let ox = 0, oy = 0;
    if (state.drift) {
      ox = Math.sin(t * 0.35) * W * 0.08 + Math.sin(t * 0.13) * W * 0.05;
      oy = Math.cos(t * 0.27) * H * 0.08 + Math.cos(t * 0.11) * H * 0.04;
    }
    // 鼠标轻微吸引
    if (state.mouse.active) {
      ox += (state.mouse.x - 0.5) * W * 0.08;
      oy += (state.mouse.y - 0.5) * H * 0.08;
    }

    // --- 外层辉光 ---
    const glowR = baseR * 2.1;
    const glow = ctx.createRadialGradient(cx + ox, cy + oy, baseR * 0.3, cx + ox, cy + oy, glowR);
    glow.addColorStop(0, rgbStr(state.colA, 0.28));
    glow.addColorStop(0.5, rgbStr(state.colB, 0.12));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // --- 噪声形变球体（多层描边） ---
    const energy = state.emotion.energy;
    const layers = 5;
    for (let l = layers; l >= 1; l--) {
      const lf = l / layers;
      const col = mixRgb(state.colA, mixRgb(state.colB, state.colC, lf), lf * 0.7);
      ctx.beginPath();
      const steps = 90;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const nz = noiseX(t * 0.7 * (0.4 + energy) + theta * (2 + energy * 3) + l * 7);
        const nz2 = noiseY(t * 0.5 + theta * 3 + l * 13);
        const wob = 1 + (nz - 0.5) * 0.34 * (0.3 + energy * 0.7) * (1 + state.intensity) * lf * 0.5
                      + (nz2 - 0.5) * 0.1 * lf;
        // 呼吸
        const breathe = 1 + Math.sin(t * (0.8 + energy) + l * 0.6) * 0.05 * state.intensity;
        const r = baseR * (0.55 + lf * 0.45) * wob * breathe;
        const x = cx + ox + Math.cos(theta) * r;
        const y = cy + oy + Math.sin(theta) * r * 0.96;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = rgbStr(col, 0.1 + lf * 0.14);
      ctx.fill();
    }

    // --- 高光核心 ---
    const core = ctx.createRadialGradient(
      cx + ox - baseR * 0.2, cy + oy - baseR * 0.25, 0,
      cx + ox, cy + oy, baseR * 0.8
    );
    core.addColorStop(0, 'rgba(255,255,255,0.35)');
    core.addColorStop(0.35, rgbStr(state.colA, 0.18));
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, baseR * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // --- 环绕粒子 ---
    particles.forEach((p) => {
      p.angle += p.speed * dt * 60 * state.tempo * (0.4 + energy);
      p.wobble += dt * 2;
      const breathe = 1 + Math.sin(t * 0.9 + p.wobble) * 0.12;
      let px = cx + ox + Math.cos(p.angle) * baseR * p.radius * 1.7 * breathe;
      let py = cy + oy + Math.sin(p.angle) * baseR * p.radius * 1.7 * breathe * 0.92;
      // 鼠标力场轻微排斥
      if (state.mouse.active) {
        const mx = state.mouse.x * W, my = state.mouse.y * H;
        const dx = px - mx, dy = py - my;
        const dist = Math.hypot(dx, dy);
        if (dist < 120 && dist > 0.01) {
          const f = (1 - dist / 120) * 22;
          px += (dx / dist) * f;
          py += (dy / dist) * f;
        }
      }
      const col = mixRgb(state.colB, state.colA, (Math.sin(p.wobble) + 1) / 2);
      ctx.fillStyle = rgbStr(col, 0.25 + p.size * 0.18);
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- 脉冲环 ---
    state.pulses = state.pulses.filter((pu) => pu.alpha > 0.02);
    state.pulses.forEach((pu) => {
      pu.r += (pu.max - pu.r) * (1 - Math.pow(0.001, dt)) + 60 * dt;
      pu.alpha *= Math.pow(0.05, dt);
      const px = pu.x !== undefined ? pu.x : cx + ox;
      const py = pu.y !== undefined ? pu.y : cy + oy;
      ctx.strokeStyle = rgbStr(state.colA, pu.alpha * 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, pu.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgbStr(state.colB, pu.alpha * 0.3);
      ctx.beginPath();
      ctx.arc(px, py, pu.r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // === 启动 ===
  buildChips();
  applyEmotion(EMOTIONS[0]);
  requestAnimationFrame(frame);
})();
