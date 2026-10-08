/**
 * ═══════════════════════════════════════════════════════════
 * Swatch Drift · 色卡漂移
 * 弹簧-阻尼物理 + 噪声洋流场 + 光标力场 + 涟漪冲击波
 * 免构建 · Vanilla JS
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ═══════════ 常量与调色板数据 ═══════════

  const SWATCH_W = 118;
  const DAMPING = 0.92;          // 速度衰减（水感阻尼）
  const BOUNCE = 0.72;           // 边界弹性回弹
  const CURSOR_FORCE = 5200;     // 光标斥力系数
  const WAVE_FORCE = 9000;       // 冲击波冲量系数

  const PALETTES = {
    dusk: [
      { name: '暮云玫瑰', hex: '#F2A6C0' }, { name: '霞映砂', hex: '#E8A87C' },
      { name: '雾紫丁香', hex: '#B79CED' }, { name: '天青暮', hex: '#7D9CC0' },
      { name: '残阳金', hex: '#EDC79B' }, { name: '夜鸢尾', hex: '#5D5A8F' },
      { name: '灰粉陶', hex: '#D8A7B1' }, { name: '薄暮蓝', hex: '#637792' }
    ],
    abyss: [
      { name: '深海磷光', hex: '#4FE3C1' }, { name: '潮汐青', hex: '#2EA8A0' },
      { name: '涌流蓝', hex: '#1F6F9C' },  { name: '深渊蓝黑', hex: '#16324F' },
      { name: '水母紫', hex: '#7B6CD9' },  { name: '珊瑚橙', hex: '#F27649' },
      { name: '海沫绿', hex: '#A8E6CF' },  { name: '静海灰蓝', hex: '#5C7A8A' }
    ],
    grove: [
      { name: '苔原绿', hex: '#7FA653' },  { name: '蕨叶深绿', hex: '#3E5F3A' },
      { name: '新芽黄绿', hex: '#C6DE89' }, { name: '树皮褐', hex: '#8A6B4F' },
      { name: '晨雾青灰', hex: '#9DB5A7' }, { name: '野莓红', hex: '#C15363' },
      { name: '蜜露杏', hex: '#EFB98A' },  { name: '夜林墨绿', hex: '#24402E' }
    ],
    ember: [
      { name: '熔金橙', hex: '#F2932F' },  { name: '炉火红', hex: '#E04A2F' },
      { name: '炭黑烬', hex: '#2B2422' },  { name: '赤陶土', hex: '#C96F4A' },
      { name: '沙金', hex: '#EDB95E' },    { name: '烟熏紫', hex: '#6E4B6E' },
      { name: '余烬粉', hex: '#F2A69B' },  { name: '暗铜', hex: '#8C5B3F' }
    ]
  };

  // ═══════════ DOM Elements ═══════════

  const zone = document.getElementById('drift-zone');
  const canvas = document.getElementById('flow-canvas');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('zone-hint');
  const hudCount = document.getElementById('hud-count');
  const hudMode = document.getElementById('hud-mode');
  const hudFlow = document.getElementById('hud-flow');
  const focusCard = document.getElementById('focus-card');
  const focusChip = document.getElementById('focus-chip');
  const focusName = document.getElementById('focus-name');
  const focusHex = document.getElementById('focus-hex');
  const copyBtn = document.getElementById('copy-btn');
  const toast = document.getElementById('toast');
  const flowSlider = document.getElementById('flow-slider');
  const flowValue = document.getElementById('flow-value');

  // ═══════════ 状态 ═══════════

  const state = {
    mode: 'calm',            // calm | tempest | orbit
    palette: 'dusk',
    flowStrength: 1.0,
    time: 0,
    cursor: { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0 },
    waves: [],               // 涟漪冲击波 { x, y, t, power }
    particles: [],           // 背景流场粒子
    swatches: [],
    selected: null,
    hintFaded: false
  };

  // ═══════════ 工具函数 ═══════════

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /** 分层正弦伪噪声 —— 轻量、平滑、够用 */
  function flowNoise(x, y, t) {
    return Math.sin(x * 0.0016 + t * 0.35) * 0.5 +
           Math.sin(y * 0.0021 - t * 0.27) * 0.35 +
           Math.sin((x + y) * 0.0009 + t * 0.18) * 0.4;
  }

  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  // ═══════════ 色卡实体 ═══════════

  function createSwatch(def, i) {
    const el = document.createElement('div');
    el.className = 'swatch';
    el.style.setProperty('--sw-color', def.hex);
    el.style.setProperty('--sw-glow', def.hex + '55');
    el.style.animationDelay = (i * 45) + 'ms';
    el.innerHTML =
      '<div class="swatch-chip"></div>' +
      '<div class="swatch-foot">' +
      '<span class="swatch-name">' + def.name + '</span>' +
      '<span class="swatch-hex mono">' + def.hex + '</span>' +
      '</div>';

    const rect = zone.getBoundingClientRect();
    const sw = {
      def, el,
      x: rand(20, Math.max(40, rect.width - SWATCH_W - 20)),
      y: rand(20, Math.max(40, rect.height - 140)),
      vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5),
      rot: 0, w: SWATCH_W, h: 0,
      dragging: false
    };
    sw.h = 116;

    // ── 拖拽 / 抛掷（指针事件统一处理触摸） ──
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sw.dragging = true;
      sw.dragOffX = e.clientX - sw.x;
      sw.dragOffY = e.clientY - sw.y;
      sw.vx = 0; sw.vy = 0;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      fadeHint();
    });
    el.addEventListener('pointermove', (e) => {
      if (!sw.dragging) return;
      const nx = e.clientX - sw.dragOffX;
      const ny = e.clientY - sw.dragOffY;
      sw.vx = nx - sw.x;      // 记录速度供抛掷
      sw.vy = ny - sw.y;
      sw.x = nx; sw.y = ny;
    });
    const endDrag = () => {
      if (!sw.dragging) return;
      sw.dragging = false;
      el.classList.remove('dragging');
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    // ── 双击聚焦取色 ──
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      selectSwatch(sw);
      spawnWave(sw.x + sw.w / 2, sw.y + sw.h / 2, 1.4);
    });

    zone.appendChild(el);
    return sw;
  }

  function selectSwatch(sw) {
    state.swatches.forEach((s) => s.el.classList.remove('selected'));
    sw.el.classList.add('selected');
    state.selected = sw;

    const { h, s } = hexToHsl(sw.def.hex);
    const root = document.documentElement;
    root.style.setProperty('--theme-h', Math.round(h));
    root.style.setProperty('--theme-s', Math.max(45, Math.round(s)) + '%');
    root.style.setProperty('--accent', sw.def.hex);
    root.style.setProperty('--accent-soft', sw.def.hex + '29');

    focusChip.style.setProperty('--focus-color', sw.def.hex);
    focusName.textContent = sw.def.name;
    focusHex.textContent = sw.def.hex;
    focusCard.classList.add('show');
  }

  // ═══════════ 冲击波与流场粒子 ═══════════

  function spawnWave(x, y, power) {
    state.waves.push({ x, y, t: 0, power: power || 1 });
  }

  function initParticles() {
    state.particles = [];
    const rect = zone.getBoundingClientRect();
    const n = Math.floor((rect.width * rect.height) / 14000);
    for (let i = 0; i < clamp(n, 30, 90); i++) {
      state.particles.push({
        x: rand(0, rect.width), y: rand(0, rect.height),
        px: 0, py: 0, life: rand(0, 1), speed: rand(0.4, 1.2)
      });
    }
  }

  // ═══════════ 物理主循环 ═══════════

  function stepSwatches(dt) {
    const rect = zone.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const t = state.time;
    const cx = W / 2, cy = H / 2;
    const cursor = state.cursor;

    for (const sw of state.swatches) {
      if (sw.dragging) continue;

      if (state.mode === 'orbit') {
        // 环汐：绕中心公转 + 洋流微扰
        const ox = sw.x + sw.w / 2 - cx;
        const oy = sw.y + sw.h / 2 - cy;
        const r = Math.sqrt(ox * ox + oy * oy) || 1;
        const k = 0.55 * state.flowStrength;
        sw.vx += (-oy / r) * k + (-ox / r) * (k * 0.18 * flowNoise(sw.x, sw.y, t));
        sw.vy += ( ox / r) * k + (-oy / r) * (k * 0.18 * flowNoise(sw.x, sw.y, t));
      } else {
        // 风平 / 湍流：噪声洋流场漂移
        const strength = state.mode === 'tempest'
          ? 0.34 * state.flowStrength
          : 0.085 * state.flowStrength;
        const n = flowNoise(sw.x, sw.y, t);
        const n2 = flowNoise(sw.x + 500, sw.y - 300, t * 1.3);
        sw.vx += Math.cos(n * Math.PI + n2 * 2.2) * strength;
        sw.vy += Math.sin(n * Math.PI - n2 * 1.8) * strength;
        if (state.mode === 'tempest') {
          sw.vx += Math.sin(t * 2.1 + sw.y * 0.01) * 0.12;
          sw.vy += Math.cos(t * 1.7 + sw.x * 0.012) * 0.12;
        }
      }

      // 光标斥力场（快移光标推力更强）
      const dx = (sw.x + sw.w / 2) - cursor.x;
      const dy = (sw.y + sw.h / 2) - cursor.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 26000 && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = CURSOR_FORCE / d2 * (1 + Math.hypot(cursor.vx, cursor.vy) * 0.02);
        sw.vx += (dx / d) * f;
        sw.vy += (dy / d) * f;
      }

      // 涟漪冲击波冲量
      for (const wv of state.waves) {
        const wx = (sw.x + sw.w / 2) - wv.x;
        const wy = (sw.y + sw.h / 2) - wv.y;
        const wd = Math.sqrt(wx * wx + wy * wy) || 1;
        const ring = wv.t * 340;
        const band = Math.abs(wd - ring);
        if (band < 70) {
          const falloff = (1 - band / 70) * (1 - wv.t / 1.1);
          const f = WAVE_FORCE * falloff * wv.power / wd;
          sw.vx += wx * f * 0.0016;
          sw.vy += wy * f * 0.0016;
        }
      }

      // 阻尼 + 积分
      sw.vx *= DAMPING;
      sw.vy *= DAMPING;
      const vmax = 18;
      sw.vx = clamp(sw.vx, -vmax, vmax);
      sw.vy = clamp(sw.vy, -vmax, vmax);
      sw.x += sw.vx * dt;
      sw.y += sw.vy * dt;

      // 弹性边界
      if (sw.x < 0) { sw.x = 0; sw.vx = Math.abs(sw.vx) * BOUNCE; }
      if (sw.y < 0) { sw.y = 0; sw.vy = Math.abs(sw.vy) * BOUNCE; }
      if (sw.x + sw.w > W) { sw.x = W - sw.w; sw.vx = -Math.abs(sw.vx) * BOUNCE; }
      if (sw.y + sw.h > H) { sw.y = H - sw.h; sw.vy = -Math.abs(sw.vy) * BOUNCE; }

      // 速度歪斜：漂得越快，身姿越斜（微晶玻璃的流体感）
      const targetRot = clamp(sw.vx * 0.7, -7, 7);
      sw.rot += (targetRot - sw.rot) * 0.08;

      sw.el.style.setProperty('--sw-transform',
        'translate3d(' + sw.x.toFixed(1) + 'px,' + sw.y.toFixed(1) + 'px,0)');
      sw.el.style.transform =
        'translate3d(' + sw.x.toFixed(1) + 'px,' + sw.y.toFixed(1) + 'px,0) rotate(' +
        sw.rot.toFixed(2) + 'deg)';
    }
  }

  function renderCanvas() {
    const rect = zone.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#b79ced';

    // ── 流场粒子（细流拖尾） ──
    ctx.lineWidth = 1;
    for (const p of state.particles) {
      const n = flowNoise(p.x, p.y, state.time);
      p.px = p.x; p.py = p.y;
      p.x += Math.cos(n * Math.PI) * p.speed * state.flowStrength;
      p.y += Math.sin(n * Math.PI) * p.speed * state.flowStrength;
      p.life -= 0.004;
      if (p.x < 0 || p.x > rect.width || p.y < 0 || p.y > rect.height || p.life < 0) {
        p.x = rand(0, rect.width); p.y = rand(0, rect.height); p.life = 1;
        p.px = p.x; p.py = p.y;
      }
      ctx.strokeStyle = accent + Math.round(clamp(p.life, 0, 1) * 60).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // ── 涟漪冲击波环 ──
    for (const wv of state.waves) {
      const r = wv.t * 340;
      const alpha = clamp(1 - wv.t / 1.1, 0, 1);
      ctx.strokeStyle = accent + Math.round(alpha * 200).toString(16).padStart(2, '0');
      ctx.lineWidth = 2.2 * alpha + 0.4;
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff' + Math.round(alpha * 70).toString(16).padStart(2, '0');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    }
    state.waves = state.waves.filter((w) => w.t < 1.1);
    for (const w of state.waves) w.t += 0.016;
  }

  function updateHud() {
    const energy = state.swatches.reduce(
      (acc, s) => acc + Math.hypot(s.vx, s.vy), 0) / state.swatches.length;
    hudFlow.textContent = (energy / 10).toFixed(2);
  }

  let last = performance.now();
  function loop(now) {
    const dt = clamp((now - last) / 16.67, 0.2, 2.5);
    last = now;
    state.time += 0.016 * dt;
    stepSwatches(dt);
    renderCanvas();
    updateHud();
    requestAnimationFrame(loop);
  }

  // ═══════════ 交互绑定 ═══════════

  function fadeHint() {
    if (state.hintFaded) return;
    state.hintFaded = true;
    hint.classList.add('faded');
  }

  zone.addEventListener('pointermove', (e) => {
    const r = zone.getBoundingClientRect();
    const c = state.cursor;
    c.px = c.x; c.py = c.y;
    c.x = e.clientX - r.left;
    c.y = e.clientY - r.top;
    c.vx = c.x - c.px;
    c.vy = c.y - c.py;
  });
  zone.addEventListener('pointerleave', () => {
    state.cursor.x = -9999; state.cursor.y = -9999;
  });

  // 点击空白 → 涟漪冲击波
  zone.addEventListener('pointerdown', (e) => {
    const r = zone.getBoundingClientRect();
    spawnWave(e.clientX - r.left, e.clientY - r.top, 1);
    fadeHint();
  });

  // ═══════════ 控制台 ═══════════

  function bindSeg(id, attr, fn) {
    const seg = document.getElementById(id);
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      seg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      fn(btn.dataset[attr]);
    });
  }

  bindSeg('mode-seg', 'mode', (m) => {
    state.mode = m;
    hudMode.textContent = m.toUpperCase();
    if (m === 'orbit') {
      // 进入环汐：给所有色卡一个切向初速
      const r = zone.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      state.swatches.forEach((sw) => {
        const dx = sw.x - cx, dy = sw.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        sw.vx += (-dy / d) * 6;
        sw.vy += (dx / d) * 6;
      });
    }
    spawnWave(r0().width / 2, r0().height / 2, 1.2);
  });

  bindSeg('palette-seg', 'palette', (p) => {
    state.palette = p;
    rebuildSwatches();
  });

  function r0() { return zone.getBoundingClientRect(); }

  flowSlider.addEventListener('input', () => {
    state.flowStrength = parseFloat(flowSlider.value);
    flowValue.textContent = state.flowStrength.toFixed(1) + '×';
    const pct = (flowSlider.value - flowSlider.min) / (flowSlider.max - flowSlider.min) * 100;
    flowSlider.style.setProperty('--fill', pct + '%');
  });
  flowSlider.style.setProperty('--fill', '32%');

  document.getElementById('shuffle-btn').addEventListener('click', () => {
    rebuildSwatches();
    showToast('RESHUFFLED · 洋流重排');
  });

  document.getElementById('burst-btn').addEventListener('click', () => {
    const r = r0();
    spawnWave(r.width / 2, r.height / 2, 2.4);
    state.swatches.forEach((sw) => {
      const dx = sw.x + sw.w / 2 - r.width / 2;
      const dy = sw.y + sw.h / 2 - r.height / 2;
      const d = Math.hypot(dx, dy) || 1;
      sw.vx += (dx / d) * rand(6, 13);
      sw.vy += (dy / d) * rand(6, 13);
    });
    fadeHint();
  });

  copyBtn.addEventListener('click', () => {
    if (!state.selected) return;
    const hex = state.selected.def.hex;
    const done = () => showToast('COPIED · ' + hex);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hex).then(done, done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = hex;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* noop */ }
      ta.remove();
      done();
    }
  });

  // ═══════════ 初始化 ═══════════

  function rebuildSwatches() {
    state.swatches.forEach((s) => s.el.remove());
    state.swatches = PALETTES[state.palette].map((def, i) => createSwatch(def, i));
    hudCount.textContent = String(state.swatches.length).padStart(2, '0');
    focusCard.classList.remove('show');
    state.selected = null;
    initParticles();
  }

  function handleResize() {
    const r = r0();
    canvas.width = r.width;
    canvas.height = r.height;
    initParticles();
  }

  window.addEventListener('resize', handleResize);

  handleResize();
  rebuildSwatches();
  // 首屏自动聚焦第一张色卡，确立主题基调
  selectSwatch(state.swatches[0]);
  requestAnimationFrame(loop);
})();
