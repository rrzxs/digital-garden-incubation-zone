/* ============================================================
   Mood Orb · 情绪光球
   一个会呼吸的情绪生命体 —— Simplex 噪声形变 + 弹簧物理 + 粒子光环
   ============================================================ */

(function () {
  'use strict';

  // === Simplex Noise (2D, 紧凑实现) ===
  const SimplexNoise = (function () {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const grad = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
    function makeNoise(seed) {
      const p = new Uint8Array(256);
      let s = seed >>> 0;
      for (let i = 0; i < 256; i++) p[i] = i;
      // Fisher-Yates with LCG
      for (let i = 255; i > 0; i--) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const j = s % (i + 1);
        const t = p[i]; p[i] = p[j]; p[j] = t;
      }
      const perm = new Uint8Array(512);
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

      return function noise2(xin, yin) {
        const n0 = 0, n1 = 0, n2 = 0;
        let i0 = Math.floor(xin + F2 * (xin + yin));
        let j0 = Math.floor(yin + F2 * (xin + yin));
        const t = (i0 + j0) * G2;
        const x0 = xin - (i0 - t);
        const y0 = yin - (j0 - t);
        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        const ii = i0 & 255, jj = j0 & 255;
        let acc = 0, t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 > 0) { t0 *= t0; const g = grad[perm[ii + perm[jj]] & 7]; acc += t0 * t0 * (g[0] * x0 + g[1] * y0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 > 0) { t1 *= t1; const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]; acc += t1 * t1 * (g[0] * x1 + g[1] * y1); }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 > 0) { t2 *= t2; const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]; acc += t2 * t2 * (g[0] * x2 + g[1] * y2); }
        return 70 * acc;
      };
    }
    return { create: makeNoise };
  })();

  const noise = SimplexNoise.create(20871);

  // === 情绪配置模型 ===
  const MOODS = {
    serene: {
      label: 'SERENE', bpm: 6, noiseFreq: 0.9, wobble: 0.10, hueShift: 0,
      colors: ['#8fd3ff', '#5aa7ff', '#cfe9ff'],
      whispers: ['呼吸之间，万物皆有节律', '平静不是没有波澜，而是与波澜共处', '此刻，只需存在']
    },
    joy: {
      label: 'JOY', bpm: 13, noiseFreq: 1.6, wobble: 0.16, hueShift: 20,
      colors: ['#ffd76e', '#ff9d5c', '#fff2b8'],
      whispers: ['光正在你体内旋转', '喜悦是无需理由的绽放', '让能量自由地冒泡']
    },
    melancholy: {
      label: 'MELANCHOLY', bpm: 5, noiseFreq: 0.6, wobble: 0.07, hueShift: -15,
      colors: ['#6e8dff', '#4a5fc4', '#9db4ff'],
      whispers: ['雨落在意识的湖面', '忧郁也是一种深度的凝视', '潮水退去时，贝壳在发光']
    },
    focus: {
      label: 'FOCUS', bpm: 8, noiseFreq: 0.5, wobble: 0.05, hueShift: 0,
      colors: ['#7affd8', '#2ecfa0', '#d4fff1'],
      whispers: ['万念归一，如锥画沙', '注意力于此，世界便在此', '深深的窄，胜过浅浅的宽']
    },
    anxious: {
      label: 'ANXIOUS', bpm: 22, noiseFreq: 3.2, wobble: 0.22, hueShift: 40,
      colors: ['#ff6e8f', '#ff3d6e', '#ffc4cf'],
      whispers: ['风暴的中心其实是安静的', '紧张是能量在寻找出口', '敲击脉冲，把焦虑释放出去']
    },
    wonder: {
      label: 'WONDER', bpm: 9, noiseFreq: 1.2, wobble: 0.18, hueShift: 60,
      colors: ['#c48fff', '#7a5cff', '#e8d9ff'],
      whispers: ['你由星尘构成，这并非比喻', '宇宙在透过你的眼睛看自己', '惊奇是智慧的开端']
    }
  };

  // === DOM Elements ===
  const orbCanvas = document.getElementById('orb-canvas');
  const particleCanvas = document.getElementById('particle-canvas');
  const orbCtx = orbCanvas.getContext('2d');
  const pctx = particleCanvas.getContext('2d');
  const cursorGlow = document.getElementById('cursor-glow');
  const whisperText = document.getElementById('whisper-text');
  const teleMood = document.getElementById('tele-mood');
  const teleBpm = document.getElementById('tele-bpm');
  const teleCoherence = document.getElementById('tele-coherence');
  const stage = document.getElementById('stage');
  const moodCards = Array.from(document.querySelectorAll('.mood-card'));
  const themeBtns = Array.from(document.querySelectorAll('.theme-btn'));

  // === 状态 ===
  const state = {
    mood: 'serene',
    moodBlend: { ...MOODS.serene },
    time: 0,
    pulse: 0,
    coherence: 98.2,
    pointer: { x: innerWidth / 2, y: innerHeight / 2, active: false }
  };

  // 光球物理（弹簧-阻尼）
  const orb = {
    x: 0, y: 0, vx: 0, vy: 0,
    homeX: 0, homeY: 0,
    radius: 0,
    dragging: false,
    dragOffsetX: 0, dragOffsetY: 0
  };

  // === 画布尺寸 ===
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    for (const c of [orbCanvas, particleCanvas]) {
      c.width = W * DPR;
      c.height = H * DPR;
      c.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const rect = stage.getBoundingClientRect();
    orb.homeX = rect.left + rect.width / 2;
    orb.homeY = rect.top + rect.height / 2;
    orb.radius = Math.min(rect.width, rect.height) * 0.26;
    orb.x = orb.x || orb.homeX;
    orb.y = orb.y || orb.homeY;
  }
  window.addEventListener('resize', resize);
  resize();

  // === 粒子系统 ===
  const AURA_COUNT = 90;
  const FIELD_COUNT = 70;
  const auraParticles = [];
  const fieldParticles = [];
  const bursts = [];

  function initParticles() {
    auraParticles.length = 0;
    fieldParticles.length = 0;
    for (let i = 0; i < AURA_COUNT; i++) {
      auraParticles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.7 + Math.random() * 0.9,
        speed: (Math.random() * 0.4 + 0.15) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2.2 + 0.6,
        phase: Math.random() * Math.PI * 2
      });
    }
    for (let i = 0; i < FIELD_COUNT; i++) {
      fieldParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        size: Math.random() * 1.6 + 0.4,
        drift: Math.random() * Math.PI * 2
      });
    }
  }
  initParticles();

  function spawnBurst(x, y, count, strength) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = strength * (0.6 + Math.random() * 0.8);
      bursts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.012 + Math.random() * 0.015,
        size: Math.random() * 3 + 1.2
      });
    }
  }

  // === 脉冲冲击波环 ===
  const ripples = [];
  function firePulse(x, y) {
    ripples.push({ x, y, r: 0, life: 1 });
    state.pulse = 1;
    spawnBurst(x, y, 46, 9);
  }

  // === 情绪混合（平滑过渡） ===
  function blendMood(target, dt) {
    const b = state.moodBlend;
    const k = 1 - Math.pow(0.001, dt); // 非线性趋近
    for (const key of ['bpm', 'noiseFreq', 'wobble', 'hueShift']) {
      b[key] += (target[key] - b[key]) * k;
    }
    for (let i = 0; i < 3; i++) {
      b.colors[i] = lerpColor(b.colors[i], target.colors[i], k);
    }
  }

  function lerpColor(a, b, t) {
    const pa = hexToRgb(a), pb = hexToRgb(b);
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hexToRgb(hex) {
    const cache = hexToRgb._cache || (hexToRgb._cache = {});
    if (cache[hex]) return cache[hex];
    const n = parseInt(hex.slice(1), 16);
    return (cache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function rgbaStr(rgbStr, alpha) {
    const m = rgbStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
    return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  }

  // === 乱码揭示 ===
  const GLYPHS = '◍◌○◉◎●◍✦✧∙·∘×+◇◆⌁∿';
  let scrambleTimer = null;
  function revealWhisper(text) {
    clearInterval(scrambleTimer);
    let frame = 0;
    const total = Math.max(14, text.length * 2.2);
    scrambleTimer = setInterval(() => {
      frame++;
      const progress = frame / total;
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const charProgress = progress * text.length * 1.4 - i;
        if (charProgress >= 1) out += text[i];
        else if (charProgress > 0 && text[i] !== ' ') out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        else out += text[i] === ' ' ? ' ' : '·';
      }
      whisperText.textContent = out;
      if (frame >= total) {
        whisperText.textContent = text;
        clearInterval(scrambleTimer);
      }
    }, 34);
  }

  // === 情绪切换 ===
  let whisperIndex = 0;
  function setMood(key) {
    state.mood = key;
    const cfg = MOODS[key];
    whisperIndex = Math.floor(Math.random() * cfg.whispers.length);
    revealWhisper(cfg.whispers[whisperIndex]);
    teleMood.textContent = cfg.label;
    spawnBurst(orb.x, orb.y, 24, 5);
  }

  moodCards.forEach((card) => {
    card.addEventListener('click', () => {
      moodCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      setMood(card.dataset.mood);
    });
  });

  // === 主题切换 ===
  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      themeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.documentElement.dataset.theme = btn.dataset.theme;
    });
  });

  // === 光标 ===
  window.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
  });

  // === 光球交互（拖拽 / 点击脉冲） ===
  let pressStart = null;
  orbCanvas.addEventListener('pointerdown', (e) => {
    const dx = e.clientX - orb.x, dy = e.clientY - orb.y;
    const dist = Math.hypot(dx, dy);
    if (dist < orb.radius * 1.35) {
      orb.dragging = true;
      orb.dragOffsetX = dx;
      orb.dragOffsetY = dy;
      pressStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      orbCanvas.setPointerCapture(e.pointerId);
    }
  });
  orbCanvas.addEventListener('pointermove', (e) => {
    if (orb.dragging) {
      orb.x = e.clientX - orb.dragOffsetX;
      orb.y = e.clientY - orb.dragOffsetY;
    }
  });
  orbCanvas.addEventListener('pointerup', (e) => {
    if (!orb.dragging || !pressStart) { orb.dragging = false; return; }
    const moved = Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y);
    const elapsed = performance.now() - pressStart.t;
    orb.dragging = false;
    if (moved < 8 && elapsed < 400) firePulse(orb.x, orb.y);
  });

  // 双击切换低语
  window.addEventListener('dblclick', () => {
    const cfg = MOODS[state.mood];
    whisperIndex = (whisperIndex + 1) % cfg.whispers.length;
    revealWhisper(cfg.whispers[whisperIndex]);
  });

  // === 主循环 ===
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    state.time += dt;
    state.pulse = Math.max(0, state.pulse - dt * 2.4);

    blendMood(MOODS[state.mood], dt);

    // 光球弹簧物理（归位）
    if (!orb.dragging) {
      const k = 42, damping = 6.5;
      const ax = (orb.homeX - orb.x) * k - orb.vx * damping;
      const ay = (orb.homeY - orb.y) * k - orb.vy * damping;
      orb.vx += ax * dt;
      orb.vy += ay * dt;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
    }

    // 呼吸节律
    const cfg = state.moodBlend;
    const breathPeriod = 60 / cfg.bpm;
    const breathPhase = (state.time % breathPeriod) / breathPeriod;
    const breath = 0.5 - 0.5 * Math.cos(breathPhase * Math.PI * 2);

    renderOrb(cfg, breath, dt);
    renderParticles(cfg, breath, dt);
    updateTelemetry(cfg, breath);

    requestAnimationFrame(loop);
  }

  // === 光球渲染（噪声形变 + 速度挤压） ===
  function renderOrb(cfg, breath, dt) {
    orbCtx.clearRect(0, 0, W, H);

    const speed = Math.hypot(orb.vx, orb.vy);
    const stretch = Math.min(speed * 0.014, 0.35);
    const angle = Math.atan2(orb.vy, orb.vx);

    const baseR = orb.radius * (0.92 + breath * 0.1 + state.pulse * 0.14);
    const pts = 96;
    const time = state.time;

    orbCtx.save();
    orbCtx.translate(orb.x, orb.y);
    orbCtx.rotate(angle);
    orbCtx.scale(1 + stretch, 1 - stretch * 0.65);
    orbCtx.rotate(-angle);

    // 形变轮廓
    orbCtx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const n = noise(
        Math.cos(a) * cfg.noiseFreq + time * 0.35,
        Math.sin(a) * cfg.noiseFreq + time * 0.28
      );
      const r = baseR * (1 + n * cfg.wobble);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) orbCtx.moveTo(x, y);
      else orbCtx.lineTo(x, y);
    }
    orbCtx.closePath();

    // 主体渐变
    const grad = orbCtx.createRadialGradient(
      -baseR * 0.28, -baseR * 0.3, baseR * 0.06, 0, 0, baseR * 1.05
    );
    grad.addColorStop(0, rgbaStr(cfg.colors[2], 0.98));
    grad.addColorStop(0.42, rgbaStr(cfg.colors[0], 0.92));
    grad.addColorStop(1, rgbaStr(cfg.colors[1], 0.88));
    orbCtx.fillStyle = grad;
    orbCtx.shadowColor = rgbaStr(cfg.colors[0], 0.85);
    orbCtx.shadowBlur = 60 + breath * 40 + state.pulse * 60;
    orbCtx.fill();
    orbCtx.shadowBlur = 0;

    // 内层流纹（第二层噪声）
    orbCtx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const n = noise(
        Math.cos(a) * cfg.noiseFreq * 1.8 - time * 0.5,
        Math.sin(a) * cfg.noiseFreq * 1.8 + time * 0.42
      );
      const r = baseR * 0.62 * (1 + n * cfg.wobble * 1.3);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) orbCtx.moveTo(x, y);
      else orbCtx.lineTo(x, y);
    }
    orbCtx.closePath();
    orbCtx.fillStyle = rgbaStr(cfg.colors[2], 0.14 + breath * 0.08);
    orbCtx.fill();

    // 高光
    const hi = orbCtx.createRadialGradient(
      -baseR * 0.34, -baseR * 0.38, 0, -baseR * 0.34, -baseR * 0.38, baseR * 0.5
    );
    hi.addColorStop(0, 'rgba(255,255,255,0.55)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    orbCtx.beginPath();
    orbCtx.arc(-baseR * 0.34, -baseR * 0.38, baseR * 0.5, 0, Math.PI * 2);
    orbCtx.fillStyle = hi;
    orbCtx.fill();

    orbCtx.restore();

    // 冲击波环
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += (orb.radius * 2.6 - rp.r) * dt * 5.5;
      rp.life -= dt * 1.1;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      orbCtx.beginPath();
      orbCtx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      orbCtx.strokeStyle = rgbaStr(cfg.colors[2], rp.life * 0.55);
      orbCtx.lineWidth = 2.5 * rp.life + 0.5;
      orbCtx.stroke();
    }
  }

  // === 粒子渲染（光环 + 环境流场 + 迸射） ===
  function renderParticles(cfg, breath, dt) {
    pctx.clearRect(0, 0, W, H);

    // 光环粒子
    for (const p of auraParticles) {
      p.angle += p.speed * dt * (0.5 + cfg.bpm * 0.03);
      const wob = noise(Math.cos(p.angle) * 1.4 + state.time * 0.2, p.phase);
      const dist = orb.radius * p.dist * (1 + wob * 0.12 + breath * 0.06);
      const x = orb.x + Math.cos(p.angle) * dist;
      const y = orb.y + Math.sin(p.angle) * dist * 0.96;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(p.phase + state.time * 1.6));
      pctx.beginPath();
      pctx.arc(x, y, p.size, 0, Math.PI * 2);
      pctx.fillStyle = rgbaStr(cfg.colors[tw > 0.7 ? 2 : 0], 0.28 + tw * 0.45);
      pctx.fill();
    }

    // 环境流场粒子
    for (const p of fieldParticles) {
      const fx = noise(p.x * 0.0016, p.y * 0.0016 + state.time * 0.05);
      const fy = noise(p.x * 0.0016 + 40, p.y * 0.0016 - state.time * 0.05);
      p.x += fx * dt * 26;
      p.y += fy * dt * 26 - dt * 6;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      pctx.fillStyle = 'rgba(255,255,255,0.16)';
      pctx.fill();
    }

    // 迸射粒子
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x += b.vx * dt * 60 * 0.16;
      b.y += b.vy * dt * 60 * 0.16;
      b.vx *= 0.965;
      b.vy *= 0.965;
      b.life -= b.decay;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      pctx.beginPath();
      pctx.arc(b.x, b.y, b.size * b.life + 0.3, 0, Math.PI * 2);
      pctx.fillStyle = rgbaStr(cfg.colors[2], b.life * 0.85);
      pctx.fill();
    }
  }

  // === 遥测 ===
  let teleAccum = 0;
  function updateTelemetry(cfg, breath) {
    teleAccum += 1;
    if (teleAccum % 12 !== 0) return;
    teleBpm.textContent = String(Math.round(cfg.bpm)).padStart(2, '0');
    const jitter = noise(state.time * 0.6, 7.3) * 1.4;
    const coh = Math.max(72, Math.min(99.9, 97.5 - cfg.wobble * 20 + breath * 2 + jitter));
    state.coherence += (coh - state.coherence) * 0.2;
    teleCoherence.textContent = state.coherence.toFixed(1) + '%';
  }

  // === 启动 ===
  revealWhisper(MOODS.serene.whispers[0]);
  requestAnimationFrame(loop);
})();
