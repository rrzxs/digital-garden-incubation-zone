/* ==========================================================================
   Spin Stage · 旋转舞台
   惯性旋转物理 + 弹簧聚焦 + 粒子流场 + 冲击波脉冲
   ========================================================================== */

(function () {
  'use strict';

  // === 配置 ===
  const PERFORMERS = [
    { glyph: '◈', name: 'Prima', role: '首席 · 光棱' },
    { glyph: '≋', name: 'Flux', role: '流动 · 韵律' },
    { glyph: '✦', name: 'Nova', role: '爆发 · 星芒' },
    { glyph: '⌁', name: 'Volt', role: '电弧 · 节奏' },
    { glyph: '◍', name: 'Umbra', role: '暗影 · 深度' },
    { glyph: '❋', name: 'Frost', role: '结晶 · 冷冽' },
    { glyph: '⟐', name: 'Glyph', role: '符文 · 秩序' },
    { glyph: '☾', name: 'Luna', role: '夜幕 · 柔光' }
  ];

  const RADIUS = 250;          // 环形轨道半径 (px)
  const FRICTION = 0.985;      // 角动量衰减
  const SPRING_K = 0.045;      // 聚焦弹簧刚度
  const SPRING_D = 0.88;       // 聚焦弹簧阻尼

  // === DOM Elements ===
  const carousel = document.getElementById('carousel');
  const stageWrap = document.getElementById('stage-wrap');
  const shockLayer = document.getElementById('shock-layer');
  const canvas = document.getElementById('flow-canvas');
  const readoutIndex = document.getElementById('readout-index');
  const readoutName = document.getElementById('readout-name');
  const readoutTotal = document.getElementById('readout-total');
  const teleOmega = document.getElementById('tele-omega');
  const teleTheta = document.getElementById('tele-theta');
  const btnNudge = document.getElementById('btn-nudge');
  const btnAuto = document.getElementById('btn-auto');
  const btnPulse = document.getElementById('btn-pulse');
  const paletteRow = document.getElementById('palette-row');

  // === 状态 ===
  const state = {
    theta: 0,            // 当前旋转角 (deg)
    omega: 0,            // 角速度 (deg/frame)
    targetTheta: null,   // 弹簧目标
    dragging: false,
    lastX: 0,
    autoSpin: false,
    pulse: 0,            // 脉冲能量 (扩张轨道)
    focusIndex: 0,
    radiusScale: 1
  };

  // === 卡片构建 ===
  const cards = PERFORMERS.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <span class="glyph">${p.glyph}</span>
      <span class="card-name">${p.name}</span>
      <span class="card-role">${p.role}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      focusCard(i);
    });
    carousel.appendChild(el);
    return { el, base: (360 / PERFORMERS.length) * i };
  });

  readoutTotal.textContent = String(PERFORMERS.length).padStart(2, '0');

  // === 聚焦逻辑（弹簧对齐最近整位） ===
  function focusCard(i) {
    const step = 360 / PERFORMERS.length;
    const wanted = -i * step;
    // 选择与当前 theta 最近的等价目标角
    let delta = ((wanted - state.theta) % 360 + 540) % 360 - 180;
    state.targetTheta = state.theta + delta;
    state.omega = 0;
    state.focusIndex = i;

    const p = PERFORMERS[i];
    readoutIndex.textContent = String(i + 1).padStart(2, '0');
    readoutName.textContent = p.name.toUpperCase();
    spawnShock(
      parseFloat(getComputedStyle(stageWrap).width) / 2,
      parseFloat(getComputedStyle(stageWrap).height) / 2
    );
  }

  // === 拖拽惯性 ===
  let pointerId = null;
  stageWrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.card')) return;
    pointerId = e.pointerId;
    state.dragging = true;
    state.lastX = e.clientX;
    state.targetTheta = null;
    stageWrap.classList.add('dragging');
    stageWrap.setPointerCapture(e.pointerId);
  });
  stageWrap.addEventListener('pointermove', (e) => {
    if (!state.dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - state.lastX;
    state.lastX = e.clientX;
    state.omega = dx * 0.45 + state.omega * 0.4;
    state.theta += dx * 0.45;
  });
  const endDrag = (e) => {
    if (e.pointerId !== pointerId) return;
    state.dragging = false;
    stageWrap.classList.remove('dragging');
    pointerId = null;
  };
  stageWrap.addEventListener('pointerup', endDrag);
  stageWrap.addEventListener('pointercancel', endDrag);

  // === 舞台空白处点击 → 冲击波 ===
  stageWrap.addEventListener('click', (e) => {
    if (e.target.closest('.card')) return;
    spawnShock(e.clientX, e.clientY);
    state.pulse = Math.min(state.pulse + 1, 2);
  });

  // === 冲击波 ===
  function spawnShock(x, y) {
    const ring = document.createElement('div');
    ring.className = 'shockwave';
    const size = 320;
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    ring.style.width = size + 'px';
    ring.style.height = size + 'px';
    shockLayer.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
  }

  // === 控制台 ===
  btnNudge.addEventListener('click', () => {
    state.omega += 7 + Math.random() * 5;
    state.targetTheta = null;
  });
  btnAuto.addEventListener('click', () => {
    state.autoSpin = !state.autoSpin;
    btnAuto.classList.toggle('active', state.autoSpin);
    if (state.autoSpin) state.targetTheta = null;
  });
  btnPulse.addEventListener('click', () => {
    const r = stageWrap.getBoundingClientRect();
    spawnShock(r.width / 2, r.height / 2);
    state.pulse = 2;
  });
  paletteRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.palette-btn');
    if (!btn) return;
    paletteRow.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.body.dataset.palette = btn.dataset.palette;
    particles.forEach((p) => p.rehue());
  });

  // === 主循环：物理 + 渲染 ===
  function tick() {
    // 脉冲能量指数衰减 → 轨道呼吸扩张
    state.pulse *= 0.92;
    state.radiusScale += (1 + state.pulse * 0.14 - state.radiusScale) * 0.15;

    if (state.targetTheta !== null) {
      // 弹簧-阻尼趋向目标
      const force = (state.targetTheta - state.theta) * SPRING_K;
      state.omega = (state.omega + force) * SPRING_D;
      state.theta += state.omega;
      if (Math.abs(state.targetTheta - state.theta) < 0.02 && Math.abs(state.omega) < 0.02) {
        state.theta = state.targetTheta;
        state.omega = 0;
        state.targetTheta = null;
      }
    } else if (!state.dragging) {
      // 惯性 + 摩擦
      if (state.autoSpin && Math.abs(state.omega) < 0.6) state.omega += 0.03;
      state.omega *= FRICTION;
      if (Math.abs(state.omega) < 0.005) state.omega = 0;
      state.theta += state.omega;
    }

    // 静止吸附至最近整位
    if (!state.dragging && state.targetTheta === null && Math.abs(state.omega) < 0.05 && !state.autoSpin) {
      const step = 360 / PERFORMERS.length;
      const nearest = Math.round(state.theta / step) * step;
      state.targetTheta = nearest;
    }

    renderCards();
    renderTelemetry();
    requestAnimationFrame(tick);
  }

  function renderCards() {
    const vMin = Math.min(window.innerWidth, window.innerHeight);
    const r = Math.min(RADIUS, vMin * 0.34) * state.radiusScale;
    cards.forEach((c, i) => {
      const a = c.base + state.theta;
      const rad = (a * Math.PI) / 180;
      const cos = Math.cos(rad);               // 1 = 正对观众
      const isFocus = i === state.focusIndex && Math.abs(((a % 360) + 360) % 360 - 360) < 40
        || Math.abs(((a % 360) + 360) % 360) < 40;
      c.el.classList.toggle('is-focus', isFocus);
      const lift = isFocus ? 26 : 0;
      c.el.style.transform =
        `rotateY(${a}deg) translateZ(${r + lift}px)`;
      c.el.style.opacity = 0.35 + 0.65 * Math.max(0, cos);
      c.el.style.filter = `brightness(${0.62 + 0.5 * Math.max(0, cos)})`;
      c.el.style.zIndex = Math.round(cos * 100) + 100;
    });
    carousel.style.transform = `rotateX(-4deg)`;
  }

  function renderTelemetry() {
    teleOmega.textContent = (state.omega * 0.0172).toFixed(2);
    let deg = ((state.theta % 360) + 360) % 360;
    teleTheta.textContent = deg.toFixed(0);
  }

  // === 粒子流场 ===
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const PALETTES = {
    nebula: ['168,85,247', '59,130,246', '236,72,153'],
    aurora: ['45,212,191', '59,200,130', '125,211,252'],
    ember:  ['251,146,60', '244,63,94', '250,204,21'],
    abyss:  ['14,165,233', '99,102,241', '34,211,238']
  };

  class Particle {
    constructor() { this.reset(); this.rehue(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = 0; this.vy = 0;
      this.life = 0.4 + Math.random() * 0.6;
    }
    rehue() {
      const pal = PALETTES[document.body.dataset.palette] || PALETTES.nebula;
      this.rgb = pal[Math.floor(Math.random() * pal.length)];
    }
    step(t) {
      // 伪噪声流场: 双频正弦叠加
      const a = Math.sin(this.x * 0.0016 + t * 0.00022) * 1.6
              + Math.cos(this.y * 0.0021 - t * 0.00016) * 1.6;
      this.vx += Math.cos(a) * 0.045;
      this.vy += Math.sin(a) * 0.045 - 0.012;
      this.vx *= 0.96; this.vy *= 0.96;
      this.x += this.vx; this.y += this.vy;
      this.life -= 0.0012;
      if (this.life <= 0 || this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) {
        this.reset();
      }
    }
    draw() {
      ctx.fillStyle = `rgba(${this.rgb},${(this.life * 0.5).toFixed(3)})`;
      ctx.fillRect(this.x, this.y, 1.6, 1.6);
    }
  }
  const particles = Array.from({ length: 130 }, () => new Particle());

  let lastClear = 0;
  function flowTick(t) {
    // 拖尾: 半透明覆盖
    if (t - lastClear > 50) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(0, 0, W, H);
      lastClear = t;
    }
    ctx.globalCompositeOperation = 'lighter';
    particles.forEach((p) => { p.step(t); p.draw(); });
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(flowTick);
  }

  // === 启动 ===
  readoutName.textContent = PERFORMERS[0].name.toUpperCase();
  state.omega = 6; // 开场角动量
  requestAnimationFrame(tick);
  requestAnimationFrame(flowTick);
})();
