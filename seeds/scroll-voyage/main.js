/**
 * ═══════════════════════════════════════════════════════════
 * SCROLL VOYAGE · 滚动远航
 * 滚动即下潜：深度 HUD、流体背景色相流转、SVG 航线绘制、
 * 弹簧潜艇光球、逐字揭示、粒子海洋雪与冲击气泡
 * ═══════════════════════════════════════════════════════════
 */
(() => {
  'use strict';

  // === DOM Elements ===
  const body = document.body;
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  const hudDepth = document.getElementById('hud-depth');
  const hudBiome = document.getElementById('hud-biome');
  const hudPressure = document.getElementById('hud-pressure');
  const hudVelocityFill = document.getElementById('hud-velocity-fill');
  const tubeLiquid = document.getElementById('tube-liquid');
  const tubeGlow = document.getElementById('tube-glow');
  const railProgress = document.getElementById('rail-progress');
  const railStops = [...document.querySelectorAll('.rail-stop')];
  const svg = document.getElementById('voyage-svg');
  const pathTrack = document.getElementById('path-track');
  const pathDraw = document.getElementById('path-draw');
  const traveler = document.getElementById('traveler');
  const statTemp = document.getElementById('stat-temp');
  const statPress = document.getElementById('stat-press');
  const statDepth = document.getElementById('stat-depth');
  const statHull = document.getElementById('stat-hull');
  const hullFill = document.getElementById('hull-fill');
  const resurfaceBtn = document.getElementById('resurface-btn');
  const zones = [...document.querySelectorAll('.zone[data-zone]')];
  const parallaxEls = [...document.querySelectorAll('.parallax')];

  // === 状态 ===
  const state = {
    scrollY: 0,
    smoothY: 0,          // 弹簧平滑后的滚动值
    velocity: 0,         // 滚动速度（px/frame）
    progress: 0,         // 0~1 页面进度
    depth: 0,            // 当前深度（米）
    w: 0, h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ═══════════ 1. 逐字揭示 ═══════════
  document.querySelectorAll('.char-reveal').forEach((el) => {
    const text = el.dataset.text || el.textContent;
    el.textContent = '';
    [...text].forEach((c, i) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = c === ' ' ? '\u00A0' : c;
      span.style.transitionDelay = `${i * 32}ms`;
      el.appendChild(span);
    });
  });

  // ═══════════ 2. 入场观察器 ═══════════
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.glass-card, .char-reveal, .float-frag').forEach((el) => {
    revealObserver.observe(el);
  });

  // ═══════════ 3. SVG 航线路径 ═══════════
  function buildVoyagePath() {
    const docH = document.documentElement.scrollHeight - innerHeight;
    const w = innerWidth, h = innerHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    // 正弦波下潜曲线：随整页文档高度螺旋下降，映射到视口内循环
    const steps = 48;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = w * 0.5 + Math.sin(t * Math.PI * 6) * w * 0.3;
      const y = t * h;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    pathTrack.setAttribute('d', d);
    pathDraw.setAttribute('d', d);
    const len = pathDraw.getTotalLength();
    pathDraw.style.strokeDasharray = len;
    pathDraw.style.strokeDashoffset = len;
    state.pathLen = len;
  }

  function updateVoyagePath() {
    if (!state.pathLen) return;
    const offset = state.pathLen * (1 - state.progress);
    pathDraw.style.strokeDashoffset = offset;
    const pt = pathDraw.getPointAtLength(state.pathLen * state.progress);
    traveler.setAttribute('transform', `translate(${pt.x},${pt.y})`);
  }

  // ═══════════ 4. 深度映射 ═══════════
  // 每个 zone 声明 depth: [start, end]（米）；归途 zone 反向回 0
  function computeDepth(progress) {
    const docZones = zones.filter((z) => {
      const [s, e] = JSON.parse(z.dataset.zone).depth;
      return e > s; // 归途除外
    });
    const total = docZones.length;
    const zoneProgress = progress * total;
    const idx = clamp(Math.floor(zoneProgress), 0, total - 1);
    const local = zoneProgress - idx;
    const meta = JSON.parse(docZones[idx].dataset.zone);
    const depth = Math.round(lerp(meta.depth[0], meta.depth[1], local));
    const biome = meta.biome;
    // 归途段（最后 15%）强制上浮
    if (progress > 0.86) {
      const asc = (progress - 0.86) / 0.14;
      return { depth: Math.round(lerp(depth, 0, asc)), biome: '归途 · ASCENT' };
    }
    return { depth, biome };
  }

  function updateHUD() {
    hudDepth.textContent = state.depth.toLocaleString();
    hudBiome.textContent = state.biome;
    hudPressure.textContent = (1 + state.depth / 10).toFixed(1) + ' ATM';
    const v = clamp(Math.abs(state.velocity) / 40, 0, 1);
    hudVelocityFill.style.width = (v * 100).toFixed(0) + '%';
    tubeLiquid.style.transform = `scaleY(${state.progress.toFixed(3)})`;
    tubeGlow.style.setProperty('--glow-y', `${(state.progress * 244).toFixed(1)}px`);
    tubeGlow.style.opacity = state.progress > 0.99 ? 0 : 1;
  }

  // ═══════════ 5. 航段导航 ═══════════
  railStops.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      target && target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  function updateRail() {
    let activeIdx = 0;
    zones.forEach((z, i) => {
      if (z.getBoundingClientRect().top < innerHeight * 0.5) activeIdx = i;
    });
    railStops.forEach((s, i) => s.classList.toggle('active', i === activeIdx));
  }

  // ═══════════ 6. 3D 倾斜卡片 ═══════════
  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
    });
  });

  // ═══════════ 7. 热泉遥测微扰动 ═══════════
  setInterval(() => {
    if (statTemp.getBoundingClientRect().top > innerHeight) return;
    statTemp.textContent = (378 + Math.random() * 9).toFixed(0) + '°C';
    statPress.textContent = (1100 + Math.random() * 10).toFixed(0) + ' ATM';
    const hull = (98.4 + Math.random() * 1.4);
    statHull.textContent = hull.toFixed(1) + '%';
    hullFill.style.width = hull + '%';
  }, 1800);

  // ═══════════ 8. 粒子海洋雪 ═══════════
  let particles = [];
  function resizeCanvas() {
    state.w = innerWidth; state.h = innerHeight;
    canvas.width = state.w * state.dpr;
    canvas.height = state.h * state.dpr;
    canvas.style.width = state.w + 'px';
    canvas.style.height = state.h + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const count = Math.floor((state.w * state.h) / 16000);
    particles = Array.from({ length: count }, () => spawnParticle(true));
  }

  function spawnParticle(scattered) {
    return {
      x: Math.random() * state.w,
      y: scattered ? Math.random() * state.h : state.h + 10,
      r: 0.5 + Math.random() * 1.8,
      vy: 0.15 + Math.random() * 0.5,     // 海雪自然下沉
      drift: Math.random() * Math.PI * 2,
      driftSpeed: 0.002 + Math.random() * 0.01,
      alpha: 0.15 + Math.random() * 0.45,
      bubble: false
    };
  }

  let bubbles = [];
  function emitBubbles(x, y, n) {
    for (let i = 0; i < n; i++) {
      bubbles.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 30,
        r: 1 + Math.random() * 3.5,
        vy: 1.5 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 0.8,
        life: 1
      });
    }
  }

  function accentColor() {
    return getComputedStyle(body).getPropertyValue('--accent').trim() || '#5fd4ff';
  }

  function renderParticles(t) {
    ctx.clearRect(0, 0, state.w, state.h);
    const accent = accentColor();
    const scrollPush = clamp(state.velocity * 0.6, -8, 8); // 下潜 → 海雪相对上移

    for (const p of particles) {
      p.drift += p.driftSpeed;
      p.y += p.vy - scrollPush;
      p.x += Math.sin(p.drift) * 0.3;
      if (p.y > state.h + 12) { p.y = -10; p.x = Math.random() * state.w; }
      if (p.y < -14) { p.y = state.h + 10; p.x = Math.random() * state.w; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,235,255,${p.alpha * 0.5})`;
      ctx.fill();
    }

    // 气泡（滚动越快，生成越多）
    if (Math.abs(state.velocity) > 9 && Math.random() < 0.5) {
      emitBubbles(state.w * (0.3 + Math.random() * 0.4), state.h * (0.4 + Math.random() * 0.5), 2);
    }
    bubbles = bubbles.filter((b) => b.life > 0 && b.y > -20);
    for (const b of bubbles) {
      b.y -= b.vy;
      b.x += b.vx + Math.sin(t / 300 + b.y / 30) * 0.4;
      b.life -= 0.008;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = clamp(b.life, 0, 1) * 0.7;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ═══════════ 9. 深渊之眼凝视 ═══════════
  const abyssEye = document.querySelector('.abyss-eye');
  const pupil = abyssEye && abyssEye.querySelector('.pupil');
  if (abyssEye && pupil) {
    abyssEye.addEventListener('mousemove', (e) => {
      const r = abyssEye.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      pupil.style.translate = `${dx * 26}px ${dy * 26}px`;
    });
    abyssEye.addEventListener('mouseleave', () => {
      pupil.style.translate = '0px 0px';
      pupil.style.transition = 'translate 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => { pupil.style.transition = ''; }, 1250);
    });
  }

  // ═══════════ 10. 配色切换 ═══════════
  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      body.dataset.theme = dot.dataset.theme;
      emitBubbles(state.w / 2, state.h / 2, 26); // 换色冲击气泡
    });
  });

  // ═══════════ 11. 归途按钮 ═══════════
  resurfaceBtn.addEventListener('click', () => {
    emitBubbles(state.w / 2, state.h * 0.7, 60);
    const start = scrollY;
    const t0 = performance.now();
    const dur = 2200;
    const ease = (x) => 1 - Math.pow(1 - x, 4); // 出水减速缓动
    (function ascend(now) {
      const t = clamp((now - t0) / dur, 0, 1);
      scrollTo(0, start * (1 - ease(t)));
      if (t < 1) requestAnimationFrame(ascend);
    })(t0);
  });

  // ═══════════ 12. 主循环 ═══════════
  function tick(t) {
    state.scrollY = scrollY;
    const prev = state.smoothY;
    state.smoothY = lerp(state.smoothY, state.scrollY, 0.075);
    state.velocity = state.smoothY - prev;

    const docH = document.documentElement.scrollHeight - innerHeight;
    state.progress = clamp(state.smoothY / Math.max(docH, 1), 0, 1);
    railProgress.style.height = (state.progress * 100).toFixed(1) + '%';

    const { depth, biome } = computeDepth(state.progress);
    state.depth = depth; state.biome = biome;

    updateHUD();
    updateVoyagePath();
    updateRail();

    // 视差层
    for (const el of parallaxEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) continue;
      const depth = parseFloat(el.dataset.depth || 0.3);
      const mid = r.top + r.height / 2 - innerHeight / 2;
      el.style.translate = `0 ${(mid * -depth * 0.12).toFixed(1)}px`;
    }

    // 遥测深度联动
    if (statDepth) statDepth.textContent = depth.toLocaleString() + ' M';

    renderParticles(t);
    requestAnimationFrame(tick);
  }

  // === 初始化 ===
  addEventListener('resize', () => { resizeCanvas(); buildVoyagePath(); }, { passive: true });
  resizeCanvas();
  buildVoyagePath();
  requestAnimationFrame(tick);
})();
