/* ============================================================
   Glyph Playground 字形游乐场
   弹簧-阻尼物理驱动的字形力场 + 冲击波涟漪 + 环境粒子
   Vanilla JS · 免构建
   Maintainer: EDEN
   ============================================================ */

(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('glyph-canvas');
  const ctx = canvas.getContext('2d');
  const teleCount = document.getElementById('tele-count');
  const teleMode = document.getElementById('tele-mode');
  const teleFps = document.getElementById('tele-fps');
  const modeGrid = document.getElementById('mode-grid');
  const setGrid = document.getElementById('set-grid');
  const themeGrid = document.getElementById('theme-grid');
  const rngRadius = document.getElementById('rng-radius');
  const rngForce = document.getElementById('rng-force');
  const rngDensity = document.getElementById('rng-density');
  const outRadius = document.getElementById('out-radius');
  const outForce = document.getElementById('out-force');
  const outDensity = document.getElementById('out-density');
  const btnPulse = document.getElementById('btn-pulse');
  const panel = document.getElementById('panel');

  // === 字符集 ===
  const GLYPH_SETS = {
    latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.split(''),
    cjk: '漢字遊園地形力場聲光色影墨韻星雲深邃呼吸波動磁引'.split(''),
    symbol: '⌘∴∵∘⊚⊛⊕⊗⋇⋈∆∇◇○◐◑⌁∿⌀⌖'.split(''),
    digit: ['0', '1', '8', '42', '7', '3', '0x', '1F', 'λ', 'π', 'Σ', '∆', '⌥', '⇧']
  };

  // === 主题色 (画布渲染用，与 CSS data-theme 对应) ===
  const THEME_COLORS = {
    nebula: ['#9d86ff', '#2fb7ff', '#ff5c9d', '#eef0ff'],
    aurora: ['#2de2c8', '#58ffa3', '#1f8fff', '#eafff8'],
    ember: ['#ff8a3d', '#ff4d6d', '#ffd166', '#fff4ea'],
    abyss: ['#6f9bff', '#00b8d4', '#b388ff', '#e8f1ff']
  };

  // === 状态 ===
  const state = {
    mode: 'ripple',          // ripple | repel | vortex | shuffle
    set: 'latin',
    theme: 'nebula',
    radius: 180,
    force: 100,
    density: 64,
    mouse: { x: -9999, y: -9999, active: false },
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    w: 0, h: 0
  };

  let glyphs = [];
  let particles = [];   // 环境粒子
  let shocks = [];      // 冲击波环

  // === 工具函数 ===
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function currentColors() { return THEME_COLORS[state.theme]; }

  // === 字形生成 ===
  function buildGlyphs() {
    glyphs = [];
    const chars = GLYPH_SETS[state.set];
    const spacing = Math.max(34, Math.sqrt((state.w * state.h) / state.density) * 6);
    const cols = Math.ceil(state.w / spacing);
    const rows = Math.ceil(state.h / spacing);
    const margin = 26;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hx = margin + c * spacing + rand(-3, 3);
        const hy = margin + r * spacing + rand(-3, 3);
        if (hx > state.w - margin || hy > state.h - margin) continue;
        glyphs.push({
          char: pick(chars),
          hx, hy,                 // 归位坐标
          x: hx + rand(-40, 40),  // 初始散布入场
          y: hy + rand(-40, 40),
          vx: 0, vy: 0,
          size: rand(15, 26),
          rot: rand(-0.2, 0.2),
          targetRot: 0,
          colorIdx: (Math.random() * 3) | 0,
          phase: rand(0, Math.PI * 2),
          energy: 0               // 受力能量 0~1，驱动辉光与缩放
        });
      }
    }
    teleCount.textContent = glyphs.length;
  }

  // === 环境粒子 ===
  function buildParticles() {
    particles = [];
    const n = Math.min(70, (state.w * state.h) / 26000 | 0);
    for (let i = 0; i < n; i++) {
      particles.push({
        x: rand(0, state.w), y: rand(0, state.h),
        vx: rand(-0.16, 0.16), vy: rand(-0.16, 0.16),
        size: rand(0.6, 1.8),
        alpha: rand(0.12, 0.4)
      });
    }
  }

  // === 画布尺寸 ===
  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = state.w * state.dpr;
    canvas.height = state.h * state.dpr;
    canvas.style.width = state.w + 'px';
    canvas.style.height = state.h + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    buildGlyphs();
    buildParticles();
  }

  // === 冲击波 ===
  function spawnShock(x, y) {
    shocks.push({ x, y, r: 0, maxR: Math.max(state.w, state.h) * 0.55, life: 1 });
    // 触发瞬间对全场字形施加径向脉冲
    for (const g of glyphs) {
      const dx = g.x - x, dy = g.y - y;
      const d = Math.hypot(dx, dy) || 1;
      const kick = Math.min(26, 3400 / d);
      g.vx += (dx / d) * kick;
      g.vy += (dy / d) * kick;
      g.energy = Math.min(1, g.energy + kick / 18);
    }
    // 迸射粒子
    const colors = currentColors();
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(1.5, 6);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rand(1, 2.6),
        alpha: 0.85,
        decay: 0.012,
        color: pick(colors)
      });
    }
  }

  // === 物理更新 ===
  function updateGlyphs(t) {
    const m = state.mouse;
    const F = state.force / 100;
    for (const g of glyphs) {
      let fx = 0, fy = 0;
      let inField = false;

      if (m.active) {
        const dx = g.x - m.x;
        const dy = g.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d < state.radius && d > 0.001) {
          inField = true;
          const falloff = 1 - d / state.radius;         // 线性衰减
          const inv = 1 / d;
          if (state.mode === 'repel') {
            const f = falloff * 5.2 * F;
            fx += dx * inv * f; fy += dy * inv * f;
          } else if (state.mode === 'vortex') {
            const tangent = 6.4 * F * falloff;
            fx += -dy * inv * tangent + dx * inv * 0.6 * falloff;
            fy += dx * inv * tangent + dy * inv * 0.6 * falloff;
          } else if (state.mode === 'shuffle') {
            // 噪声扰动 + 轻微排斥，字符乱舞
            const n = Math.sin(t * 0.0016 + g.phase * 3.1) * Math.cos(t * 0.0009 + g.phase);
            const f = falloff * 4.2 * F;
            fx += (dx * inv + n * 0.9) * f;
            fy += (dy * inv + Math.cos(t * 0.0013 + g.phase * 2.3)) * f;
          } else { // ripple: 涟漪呼吸——距离映射正弦波
            const wave = Math.sin(d * 0.055 - t * 0.006);
            const f = falloff * 4.6 * F * (0.35 + 0.65 * wave);
            fx += dx * inv * f; fy += dy * inv * f;
          }
        }
      }

      g.energy += ((inField ? 1 : 0) - g.energy) * 0.08;

      // 弹簧-阻尼归位
      const springX = (g.hx - g.x) * 0.035;
      const springY = (g.hy - g.y) * 0.035;
      g.vx = (g.vx + fx + springX) * 0.88;
      g.vy = (g.vy + fy + springY) * 0.88;
      g.x += g.vx;
      g.y += g.vy;

      // 旋转与目标旋转（漩涡模式下跟随速度方向）
      const speed = Math.hypot(g.vx, g.vy);
      if (state.mode === 'vortex' && speed > 0.5) {
        g.targetRot = Math.atan2(g.vy, g.vx) + Math.PI / 2;
      } else {
        g.targetRot = Math.sin(t * 0.001 + g.phase) * 0.14 + speed * 0.012;
      }
      let dr = g.targetRot - g.rot;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      g.rot += dr * 0.1;
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.decay) {
        p.alpha -= p.decay;
        p.vx *= 0.97; p.vy *= 0.97;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      } else {
        // 环境粒子边界环绕
        if (p.x < -10) p.x = state.w + 10;
        if (p.x > state.w + 10) p.x = -10;
        if (p.y < -10) p.y = state.h + 10;
        if (p.y > state.h + 10) p.y = -10;
      }
    }
  }

  function updateShocks() {
    for (let i = shocks.length - 1; i >= 0; i--) {
      const s = shocks[i];
      s.r += (s.maxR - s.r) * 0.045 + 1.2;
      s.life -= 0.014;
      if (s.life <= 0 || s.r > s.maxR * 0.98) shocks.splice(i, 1);
    }
  }

  // === 渲染 ===
  function render(t) {
    ctx.clearRect(0, 0, state.w, state.h);
    const colors = currentColors();

    // 环境粒子
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color || colors[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 冲击波环
    for (const s of shocks) {
      ctx.globalAlpha = Math.max(0, s.life) * 0.5;
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = 1.5 + s.life * 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0, s.life) * 0.22;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 字形
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 20px "Share Tech Mono", monospace';
    for (const g of glyphs) {
      const scale = 1 + g.energy * 0.5;
      const alpha = 0.3 + g.energy * 0.7;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      ctx.scale(scale, scale);
      ctx.font = `${(g.size * 0.92) | 0}px "Share Tech Mono", "Outfit", monospace`;
      if (g.energy > 0.25) {
        ctx.shadowColor = colors[g.colorIdx];
        ctx.shadowBlur = g.energy * 22;
      }
      ctx.globalAlpha = alpha;
      // 高能量字形用主题色，静息态用低饱和前景
      ctx.fillStyle = g.energy > 0.12 ? colors[g.colorIdx] : colors[3];
      ctx.fillText(g.char, 0, 0);
      ctx.restore();
    }

    // 光标力场指示圈
    if (state.mouse.active) {
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(state.mouse.x, state.mouse.y, state.radius, t * 0.0004 % (Math.PI * 2), (t * 0.0004 % (Math.PI * 2)) + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      ctx.arc(state.mouse.x, state.mouse.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  // === 主循环 + FPS ===
  let lastFrame = performance.now();
  let fpsAccum = 0, fpsCount = 0;
  function loop(t) {
    updateGlyphs(t);
    updateParticles();
    updateShocks();
    render(t);

    fpsAccum += 1000 / Math.max(1, t - lastFrame);
    fpsCount++;
    if (fpsCount >= 30) {
      teleFps.textContent = (fpsAccum / fpsCount) | 0;
      fpsAccum = 0; fpsCount = 0;
    }
    lastFrame = t;
    requestAnimationFrame(loop);
  }

  // === 交互绑定 ===
  window.addEventListener('pointermove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouse.active = true;
  });
  window.addEventListener('pointerleave', () => { state.mouse.active = false; });
  canvas.addEventListener('pointerdown', (e) => spawnShock(e.clientX, e.clientY));
  btnPulse.addEventListener('click', () => {
    spawnShock(state.w / 2, state.h / 2);
    btnPulse.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  });

  // 模式切换
  modeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    modeGrid.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.mode = btn.dataset.mode;
    teleMode.textContent = state.mode.toUpperCase();
  });

  // 字符集切换
  setGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.set-btn');
    if (!btn) return;
    setGrid.querySelectorAll('.set-btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.set = btn.dataset.set;
    buildGlyphs();
  });

  // 主题切换
  themeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    themeGrid.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.theme = btn.dataset.theme;
    document.body.dataset.theme = state.theme;
  });

  // 滑块
  function bindRange(input, output, key, rebuild) {
    const sync = () => {
      state[key] = +input.value;
      output.textContent = input.value;
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty('--fill', pct + '%');
      if (rebuild) buildGlyphs();
    };
    input.addEventListener('input', sync);
    sync();
  }
  bindRange(rngRadius, outRadius, 'radius', false);
  bindRange(rngForce, outForce, 'force', false);
  bindRange(rngDensity, outDensity, 'density', true);

  // 面板折叠
  panel.querySelector('.panel-header').addEventListener('click', () => {
    panel.classList.toggle('is-collapsed');
  });

  // 标题乱码揭示
  function scrambleTitle() {
    const el = document.querySelector('[data-scramble]');
    const target = el.textContent;
    const pool = '!<>-_\\/[]{}—=+*^?#________';
    let frame = 0;
    const total = 34;
    const tick = () => {
      let out = '';
      for (let i = 0; i < target.length; i++) {
        const reveal = (frame / total) * target.length * 1.4;
        if (i < reveal) out += target[i];
        else out += pool[(Math.random() * pool.length) | 0];
      }
      el.textContent = out;
      frame++;
      if (frame <= total) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    tick();
  }

  // === 启动 ===
  window.addEventListener('resize', resize);
  resize();
  scrambleTitle();
  requestAnimationFrame(loop);
})();
