/* ============================================================
   Motion Feel Cards · 触感卡片
   六种触感微交互：果冻 / 磁力 / 丝绸 / 弹簧 / 液态 / 颗粒
   弹簧-阻尼物理 + 流场粒子 + 冲击波 + 微晶玻璃态
   ============================================================ */
(() => {
  'use strict';

  // === Config & Data ========================================

  const FEELS = [
    { id: 'jelly',  glyph: '◍', zh: '果冻', en: 'Jelly',  desc: '按压即回弹，柔软的非线性形变记忆。' },
    { id: 'magnet', glyph: '◎', zh: '磁力', en: 'Magnet', desc: '光标即磁场，牵引光球靠近又恋恋不舍。' },
    { id: 'silk',   glyph: '≋', zh: '丝绸', en: 'Silk',   desc: '拨动丝弦，波动沿绸面以阻尼传播。' },
    { id: 'spring', glyph: '⟐', zh: '弹簧', en: 'Spring', desc: '拖拽拉伸释放，欠阻尼振荡归于原点。' },
    { id: 'liquid', glyph: '◌', zh: '液态', en: 'Liquid', desc: '光标搅动液滴，表面张力永不定形。' },
    { id: 'grain',  glyph: '▦', zh: '颗粒', en: 'Grain',  desc: '扬起一捧砂砾，让重力替你收尾。' }
  ];

  const state = {
    tiltMax: 10,          // 最大倾斜角（度）
    stiffness: 170,       // 全局弹簧刚度
    damping: 16,          // 全局阻尼
    cursor: { x: innerWidth / 2, y: innerHeight / 2, px: 0, py: 0, speed: 0 },
    waves: 0,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  // === Utilities ============================================

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const cssVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();

  /** 经典弹簧步进：返回 [pos, vel] */
  function springStep(pos, vel, target, k, d, dt) {
    const f = -k * (pos - target) - d * vel;
    const nv = vel + f * dt;
    return [pos + nv * dt, nv];
  }

  /** 主题色缓存（主题切换时刷新，避免每帧读取 computedStyle） */
  const palette = { c1: '#7ef2c9', c2: '#6aa6ff', c3: '#c89aff', ink: '#eaf4ff' };
  function refreshPalette() {
    palette.c1 = cssVar('--c1') || palette.c1;
    palette.c2 = cssVar('--c2') || palette.c2;
    palette.c3 = cssVar('--c3') || palette.c3;
    palette.ink = cssVar('--ink') || palette.ink;
  }
  refreshPalette();

  // === DOM Elements =========================================

  const grid = document.getElementById('grid');
  const ambientCanvas = document.getElementById('ambient-canvas');
  const ambientCtx = ambientCanvas.getContext('2d');
  const hudSpeed = document.getElementById('hud-speed');
  const hudFps = document.getElementById('hud-fps');
  const hudWaves = document.getElementById('hud-waves');

  // === 乱码揭示 (Scramble Reveal) ===========================

  function scrambleReveal(el, finalText, speed = 34) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz*#%&<>=+';
    let frame = 0;
    const total = finalText.length + 10;
    const tick = setInterval(() => {
      frame++;
      const settled = Math.floor((frame / total) * finalText.length * 1.4);
      let out = '';
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') { out += ' '; continue; }
        out += i < settled ? finalText[i] : chars[(Math.random() * chars.length) | 0];
      }
      el.textContent = out;
      if (frame >= total) {
        el.textContent = finalText;
        clearInterval(tick);
      }
    }, speed);
  }

  // === 卡片工厂 =============================================

  const cards = []; // 每张卡的物理状态

  function buildCard(feel, index) {
    const el = document.createElement('article');
    el.className = 'feel-card';
    el.dataset.feel = feel.id;
    el.innerHTML = `
      <div class="card-tilt">
        <div class="card-sheen"></div>
        <div class="card-header">
          <span class="feel-glyph">${feel.glyph}</span>
          <span class="feel-index">0${index + 1} / FEEL</span>
        </div>
        <h3 class="feel-name">${feel.zh} <em>${feel.en}</em></h3>
        <p class="feel-desc">${feel.desc}</p>
        <div class="feel-stage"></div>
        <div class="card-footer">
          <span>K ${state.stiffness} / D ${state.damping}</span>
          <span class="foot-hint" data-hint>HOVER</span>
        </div>
      </div>`;
    grid.appendChild(el);

    const card = {
      feel, el,
      stage: el.querySelector('.feel-stage'),
      tilt: el.querySelector('.card-tilt'),
      hint: el.querySelector('[data-hint]'),
      // 倾斜目标与当前值
      rx: 0, ry: 0, trx: 0, try_: 0,
      // 冲击波推挤偏移（弹簧回零）
      ox: 0, oy: 0, ovx: 0, ovy: 0,
      behavior: null
    };
    card.behavior = createBehavior(card);
    bindTilt(card);
    cards.push(card);
    return card;
  }

  // === 3D 倾斜 + 光泽追踪 ===================================

  function bindTilt(card) {
    card.el.addEventListener('pointermove', (e) => {
      const r = card.el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      card.try_ = (nx - 0.5) * 2 * state.tiltMax;
      card.trx = -(ny - 0.5) * 2 * state.tiltMax;
      card.tilt.style.setProperty('--mx', `${nx * 100}%`);
      card.tilt.style.setProperty('--my', `${ny * 100}%`);
      state.cursor.x = e.clientX;
      state.cursor.y = e.clientY;
    });
    card.el.addEventListener('pointerleave', () => {
      card.trx = 0; card.try_ = 0;
    });
  }

  // === 各触感行为模块 =======================================

  function createBehavior(card) {
    switch (card.feel.id) {
      case 'jelly':  return jellyBehavior(card);
      case 'magnet': return magnetBehavior(card);
      case 'silk':   return silkBehavior(card);
      case 'spring': return springBehavior(card);
      case 'liquid': return liquidBehavior(card);
      case 'grain':  return grainBehavior(card);
    }
  }

  // --- 果冻：按压缩放弹簧 ---
  function jellyBehavior(card) {
    const body = document.createElement('div');
    body.className = 'jelly-body';
    card.stage.appendChild(body);

    let sx = 1, svx = 0, sy = 1, svy = 0;
    card.stage.addEventListener('pointerdown', () => {
      svx -= 9; svy -= 7;                 // 按压冲量
      card.hint.textContent = 'SQUISH';
      setTimeout(() => (card.hint.textContent = 'HOVER'), 900);
    });

    return {
      update(dt) {
        [sx, svx] = springStep(sx, svx, 1, state.stiffness * 1.4, state.damping, dt);
        [sy, svy] = springStep(sy, svy, 1, state.stiffness * 1.4, state.damping, dt);
        body.style.transform =
          `scale(${clamp(sx, 0.4, 1.7)}, ${clamp(sy, 0.4, 1.7)})`;
      }
    };
  }

  // --- 磁力：光球被光标吸引 ---
  function magnetBehavior(card) {
    const ring = document.createElement('div');
    ring.className = 'mag-ring';
    const orb = document.createElement('div');
    orb.className = 'mag-orb';
    card.stage.append(ring, orb);

    let x = 0, y = 0, vx = 0, vy = 0;
    let hover = false;
    card.stage.addEventListener('pointerenter', () => (hover = true));
    card.stage.addEventListener('pointerleave', () => (hover = false));
    card.stage.addEventListener('pointermove', (e) => {
      const r = card.stage.getBoundingClientRect();
      state.cursor.x = e.clientX; state.cursor.y = e.clientY;
      card._local = { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2, r };
    });

    return {
      update(dt) {
        // 悬停时吸向光标，否则回中心；距离越近磁场越弱（柔和贴附）
        let tx = 0, ty = 0;
        if (hover && card._local) {
          const R = Math.min(card._local.r.width, card._local.r.height) * 0.5;
          const d = dist(0, 0, card._local.x, card._local.y);
          const pull = 1 - clamp(d / R, 0, 1) * 0.55; // 近处略有"让位"
          tx = card._local.x * pull; ty = card._local.y * pull;
        }
        [x, vx] = springStep(x, vx, tx, state.stiffness, state.damping + 4, dt);
        [y, vy] = springStep(y, vy, ty, state.stiffness, state.damping + 4, dt);
        orb.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
  }

  // --- 丝绸：正弦弦丝，光标拨动幅度 ---
  function silkBehavior(card) {
    const cv = document.createElement('canvas');
    card.stage.appendChild(cv);
    const ctx = cv.getContext('2d');

    const STRINGS = 5;
    let w = 0, h = 0;
    let energy = 0, target = 0;
    let phase = Math.random() * 10;

    function resize() {
      const r = card.stage.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(card.stage);

    card.stage.addEventListener('pointermove', (e) => {
      const r = card.stage.getBoundingClientRect();
      target = clamp((e.clientX - r.left) / r.width, 0, 1);
      energy = Math.min(energy + 0.12, 1.6);
    });
    card.stage.addEventListener('pointerleave', () => { target = 0.5; });

    return {
      update(dt, t) {
        energy = lerp(energy, 0.25, 1 - Math.exp(-2.2 * dt));
        phase += dt * (1.6 + energy * 3);
        ctx.clearRect(0, 0, w, h);
        for (let s = 0; s < STRINGS; s++) {
          const yBase = h * (0.22 + (s / (STRINGS - 1)) * 0.56);
          const amp = (5 + energy * 26) * (1 - Math.abs(s / (STRINGS - 1) - 0.5) * 0.7);
          ctx.beginPath();
          for (let x = 0; x <= w; x += 4) {
            const n = x / w;
            const envelope = Math.exp(-Math.pow((n - target) * 3.2, 2)); // 光标处振幅最大
            const y = yBase + Math.sin(n * 9 + phase + s * 0.9) * amp * (0.35 + envelope);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, palette.c1 + '55');
          grad.addColorStop(target, palette.c3);
          grad.addColorStop(1, palette.c2 + '55');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
    };
  }

  // --- 弹簧：可拖拽 puck ---
  function springBehavior(card) {
    const line = document.createElement('div');
    line.className = 'spring-line';
    const puck = document.createElement('div');
    puck.className = 'spring-puck';
    card.stage.append(line, puck);

    let x = 0, y = 0, vx = 0, vy = 0;
    let dragging = false;

    function localPos(e) {
      const r = card.stage.getBoundingClientRect();
      return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2,
               bound: Math.min(r.width, r.height) * 0.5 - 20 };
    }
    puck.addEventListener('pointerdown', (e) => {
      dragging = true;
      puck.setPointerCapture(e.pointerId);
      card.hint.textContent = 'STRETCH';
    });
    puck.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const p = localPos(e);
      const d = dist(0, 0, p.x, p.y);
      const s = d > p.bound ? p.bound / d : 1;
      x = p.x * s; y = p.y * s; vx = 0; vy = 0;
    });
    puck.addEventListener('pointerup', () => {
      dragging = false;
      card.hint.textContent = 'RELEASE';
      setTimeout(() => (card.hint.textContent = 'HOVER'), 900);
    });

    return {
      update(dt) {
        if (!dragging) {
          [x, vx] = springStep(x, vx, 0, state.stiffness, state.damping - 3, dt);
          [y, vy] = springStep(y, vy, 0, state.stiffness, state.damping - 3, dt);
        }
        puck.style.transform = `translate(${x}px, ${y}px)`;
        const ang = Math.atan2(y, x);
        const len = dist(0, 0, x, y);
        line.style.transform = `rotate(${ang}rad) scaleX(${len / 60})`;
        line.style.opacity = len > 6 ? 1 : 0;
      }
    };
  }

  // --- 液态：不定形液滴 + 光标斥力 ---
  function liquidBehavior(card) {
    const blob = document.createElement('div');
    blob.className = 'liquid-blob';
    card.stage.appendChild(blob);

    let x = 0, y = 0, vx = 0, vy = 0;
    let seed = Math.random() * 100;

    card.stage.addEventListener('pointermove', (e) => {
      const r = card.stage.getBoundingClientRect();
      const lx = e.clientX - r.left - r.width / 2;
      const ly = e.clientY - r.top - r.height / 2;
      const d = dist(0, 0, lx, ly) || 1;
      // 光标斥力冲量
      if (d < 80) {
        const f = (1 - d / 80) * 260;
        vx += (lx / d) * f * 0.016;
        vy += (ly / d) * f * 0.016;
        card.hint.textContent = 'STIR';
        setTimeout(() => (card.hint.textContent = 'HOVER'), 800);
      }
    });

    return {
      update(dt, t) {
        [x, vx] = springStep(x, vx, 0, state.stiffness * 0.7, state.damping - 4, dt);
        [y, vy] = springStep(y, vy, 0, state.stiffness * 0.7, state.damping - 4, dt);
        // 边界软约束
        const bx = 90, by = 45;
        if (Math.abs(x) > bx) vx -= Math.sign(x) * state.stiffness * 0.4 * dt * (Math.abs(x) - bx);
        if (Math.abs(y) > by) vy -= Math.sign(y) * state.stiffness * 0.4 * dt * (Math.abs(y) - by);
        blob.style.transform = `translate(${x}px, ${y}px)`;
        // 呼吸式不定形 border-radius
        const s = (t + seed) * 0.0011;
        const r1 = 38 + Math.sin(s * 2.1) * 16;
        const r2 = 46 + Math.cos(s * 1.7) * 14;
        const r3 = 40 + Math.sin(s * 2.7 + 2) * 15;
        const r4 = 44 + Math.cos(s * 2.3 + 1) * 13;
        blob.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}% / ${r2}% ${r3}% ${r4}% ${r1}%`;
      }
    };
  }

  // --- 颗粒：砂砾物理（重力 + 光标推力 + 堆积） ---
  function grainBehavior(card) {
    const cv = document.createElement('canvas');
    card.stage.appendChild(cv);
    const ctx = cv.getContext('2d');

    let w = 0, h = 0;
    const N = 130;
    const grains = [];
    function resize() {
      const r = card.stage.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(card.stage);

    for (let i = 0; i < N; i++) {
      grains.push({
        x: Math.random(), y: Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.3, vy: 0,
        s: 1 + Math.random() * 2.2, huePick: Math.random()
      });
    }

    let stir = { x: -999, y: -999 };
    card.stage.addEventListener('pointermove', (e) => {
      const r = card.stage.getBoundingClientRect();
      stir.x = (e.clientX - r.left) / r.width;
      stir.y = (e.clientY - r.top) / r.height;
    });
    card.stage.addEventListener('pointerleave', () => { stir.x = -999; stir.y = -999; });
    card.stage.addEventListener('pointerdown', () => {
      grains.forEach((g) => {
        g.vy -= 0.25 + Math.random() * 0.45;   // 向上扬起
        g.vx += (Math.random() - 0.5) * 0.35;
      });
      card.hint.textContent = 'TOSS';
      setTimeout(() => (card.hint.textContent = 'HOVER'), 900);
    });

    return {
      update(dt) {
        ctx.clearRect(0, 0, w, h);
        const step = clamp(dt, 0.001, 0.033);
        for (const g of grains) {
          g.vy += 1.35 * step; // 重力（归一化坐标）
          // 光标推力
          const dx = g.x - stir.x, dy = g.y - stir.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 0.06) {
            const d = Math.sqrt(d2) || 0.001;
            const f = (0.06 - d2) / 0.06 * 2.6 * step;
            g.vx += (dx / d) * f; g.vy += (dy / d) * f;
          }
          g.x += g.vx * step; g.y += g.vy * step;
          g.vx *= 0.995;
          // 地面堆积 + 轻微滚动衰减
          if (g.y > 0.96) { g.y = 0.96; g.vy *= -0.24; g.vx *= 0.86; }
          if (g.x < 0.02) { g.x = 0.02; g.vx *= -0.5; }
          if (g.x > 0.98) { g.x = 0.98; g.vx *= -0.5; }

          const color = g.huePick > 0.5 ? palette.c1 : palette.c3;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(g.x * w, g.y * h, g.s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  // === 冲击波：涟漪环 + 卡片推挤 ============================

  function shockwave(px, py) {
    state.waves++;
    hudWaves.textContent = String(state.waves).padStart(2, '0');
    const ring = document.createElement('div');
    ring.className = 'shockwave';
    ring.style.left = `${px}px`;
    ring.style.top = `${py}px`;
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());

    // 对每张卡片施加径向速度冲量
    for (const card of cards) {
      const r = card.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = dist(px, py, cx, cy);
      if (d > 420) continue;
      const power = (1 - d / 420) * 900;
      const ang = Math.atan2(cy - py, cx - px);
      card.ovx += Math.cos(ang) * power;
      card.ovy += Math.sin(ang) * power;
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.console') || e.target.closest('.feel-stage')) return;
    shockwave(e.clientX, e.clientY);
  });

  // === 环境粒子流场 =========================================

  const AMBIENT_N = 70;
  const ambient = [];
  function initAmbient() {
    ambient.length = 0;
    for (let i = 0; i < AMBIENT_N; i++) {
      ambient.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: 0, vy: 0,
        s: 0.6 + Math.random() * 1.6,
        hue: Math.random(),
        seed: Math.random() * 100
      });
    }
  }
  initAmbient();

  function resizeAmbient() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ambientCanvas.width = innerWidth * dpr;
    ambientCanvas.height = innerHeight * dpr;
    ambientCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeAmbient();
  addEventListener('resize', () => { resizeAmbient(); initAmbient(); });

  /** 廉价流场：三角函数叠层模拟噪声流向 */
  function flowAt(x, y, t) {
    const a = Math.sin(x * 0.0016 + t * 0.00021) + Math.cos(y * 0.0021 - t * 0.00017);
    const b = Math.sin((x + y) * 0.0009 + t * 0.00013);
    return a * 0.8 + b * 0.6;
  }

  function updateAmbient(dt, t) {
    const ctx = ambientCtx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ambient) {
      const a = flowAt(p.x, p.y, t) * Math.PI;
      p.vx = lerp(p.vx, Math.cos(a) * 22, 0.04);
      p.vy = lerp(p.vy, Math.sin(a) * 22 + Math.sin(p.seed + t * 0.001) * 6, 0.04);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -20) p.x = innerWidth + 20;
      if (p.x > innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = innerHeight + 20;
      if (p.y > innerHeight + 20) p.y = -20;

      const alpha = 0.14 + Math.sin(p.seed + t * 0.0016) * 0.1;
      ctx.fillStyle = (p.hue > 0.5 ? palette.c1 : palette.c2);
      ctx.globalAlpha = Math.max(alpha, 0.03);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // === 控制台 ===============================================

  const themeDots = document.getElementById('theme-dots');
  themeDots.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      themeDots.querySelectorAll('.theme-dot').forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
      document.body.dataset.theme = dot.dataset.theme;
      setTimeout(refreshPalette, 60); // 等待 CSS 变量过渡生效后刷新缓存
    });
  });
  themeDots.querySelector('[data-theme="aurora"]').classList.add('active');

  const tiltSlider = document.getElementById('tilt-slider');
  const tiltVal = document.getElementById('tilt-val');
  tiltSlider.addEventListener('input', () => {
    state.tiltMax = +tiltSlider.value;
    tiltVal.textContent = tiltSlider.value;
  });

  const springSlider = document.getElementById('spring-slider');
  const springVal = document.getElementById('spring-val');
  springSlider.addEventListener('input', () => {
    state.stiffness = +springSlider.value;
    springVal.textContent = springSlider.value;
    cards.forEach((c) => {
      c.el.querySelector('.card-footer span').textContent =
        `K ${state.stiffness} / D ${state.damping}`;
    });
  });

  document.getElementById('btn-pulse').addEventListener('click', (e) => {
    shockwave(innerWidth / 2, innerHeight / 2);
    e.stopPropagation();
  });

  document.getElementById('btn-shuffle').addEventListener('click', (e) => {
    e.stopPropagation();
    const order = cards.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((c) => {
      // 退场 → 乱序重挂 → 错峰入场
      c.el.classList.remove('entered');
      setTimeout(() => {
        grid.appendChild(c.el);
        scrambleReveal(c.el.querySelector('.feel-name'), c.feel.zh, 26);
        requestAnimationFrame(() => requestAnimationFrame(() => c.el.classList.add('entered')));
      }, 480 + Math.random() * 120);
    });
  });

  // === 主循环 ===============================================

  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fpsTimer = 0;

  function loop(now) {
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;

    // 光标速度（指数平滑）
    const cx = state.cursor.x, cy = state.cursor.y;
    const inst = dist(state.cursor.px, state.cursor.py, cx, cy) / Math.max(dt, 0.001);
    state.cursor.speed = lerp(state.cursor.speed, inst, 0.08);
    state.cursor.px = cx; state.cursor.py = cy;

    // 卡片：倾斜插值 + 冲击波偏移弹簧
    for (const card of cards) {
      card.rx = lerp(card.rx, card.trx, 1 - Math.exp(-10 * dt));
      card.ry = lerp(card.ry, card.try_, 1 - Math.exp(-10 * dt));
      [card.ox, card.ovx] = springStep(card.ox, card.ovx, 0, state.stiffness, state.damping, dt);
      [card.oy, card.ovy] = springStep(card.oy, card.ovy, 0, state.stiffness, state.damping, dt);
      card.el.style.transform =
        `translate(${card.ox.toFixed(2)}px, ${card.oy.toFixed(2)}px) ` +
        `rotateX(${card.rx.toFixed(2)}deg) rotateY(${card.ry.toFixed(2)}deg)`;
      if (card.behavior) card.behavior.update(dt, now);
    }

    updateAmbient(dt, now);

    // HUD
    fpsAcc += 1 / dt; fpsCount++; fpsTimer += dt;
    if (fpsTimer > 0.5) {
      hudFps.textContent = Math.round(fpsAcc / fpsCount);
      hudSpeed.textContent = (state.cursor.speed / 100).toFixed(2);
      fpsAcc = 0; fpsCount = 0; fpsTimer = 0;
    }

    requestAnimationFrame(loop);
  }

  // === 启动 =================================================

  FEELS.forEach((feel, i) => buildCard(feel, i));

  // 错峰入场
  cards.forEach((card, i) => {
    setTimeout(() => card.el.classList.add('entered'), 180 + i * 110);
  });
  setTimeout(() => {
    cards.forEach((card, i) => {
      const nameEl = card.el.querySelector('.feel-name');
      const full = `${card.feel.zh} ${card.feel.en}`;
      scrambleReveal(nameEl, full, 28 + i * 4);
    });
  }, 320);

  scrambleReveal(document.getElementById('hero-title'), 'Motion Feel Cards', 36);

  requestAnimationFrame(loop);
})();
