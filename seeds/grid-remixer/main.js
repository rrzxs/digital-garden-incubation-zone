/**
 * Grid Remixer · 网格混音台
 * 弹簧-阻尼晶格物理 + FLIP 混音重组 + 光标力场 + 冲击波涟漪 + 乱码揭示
 * Vanilla JS · 免构建 · EDEN
 */
(() => {
  'use strict';

  // === 配置与状态 =========================================================

  const CONFIG = {
    cols: { dense: 14, mosaic: 10, mono: 5 },
    counts: { dense: 112, mosaic: 90, mono: 30 },
    glyphs: '◈◉◎◐◍⊞▦⬡✦⟐≋⌁⚬◭⌖◍❖◈⏣isia01',
    scrambleChars: '!<>-_\\/[]{}—=+*^?#$%&@',
    springK: 0.085,
    damping: 0.86,
    maxForce: 220,
  };

  const THEMES = {
    aurora: { base: 158, span: 130 },
    ember: { base: 8, span: 60 },
    abyss: { base: 218, span: 80 },
    bloom: { base: 78, span: 110 },
  };

  const state = {
    layout: 'dense',
    force: 'repel',
    theme: 'aurora',
    intensity: 0.55,
    remixes: 0,
    pointer: { x: -9999, y: -9999, px: -9999, py: -9999, speed: 0, inside: false },
  };

  // === DOM Elements =======================================================

  const gridField = document.getElementById('grid-field');
  const stage = document.getElementById('stage');
  const remixBtn = document.getElementById('remix-btn');
  const layoutSeg = document.getElementById('layout-seg');
  const forceSeg = document.getElementById('force-seg');
  const themeSwatches = document.getElementById('theme-swatches');
  const intensityRange = document.getElementById('intensity-range');
  const teleMode = document.getElementById('tele-mode');
  const teleTiles = document.getElementById('tele-tiles');
  const teleVel = document.getElementById('tele-vel');
  const teleRemix = document.getElementById('tele-remix');
  const teleForceBar = document.getElementById('tele-force-bar');
  const titleTarget = document.getElementById('title-target');

  let tiles = [];

  // === 工具函数 ===========================================================

  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // === 瓦片场 (Tile Field) ================================================

  function createTiles() {
    gridField.innerHTML = '';
    tiles = [];
    const count = CONFIG.counts[state.layout];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'tile';
      const core = document.createElement('div');
      core.className = 'tile-core';
      core.dataset.index = i;
      el.appendChild(core);
      gridField.appendChild(el);

      const tile = {
        el, core, i,
        ox: 0, oy: 0, vx: 0, vy: 0,          // 物理偏移与速度
        glyph: randomGlyph(),
        hueOff: Math.random(),
        hover: false,
      };
      tiles.push(tile);
      paintTile(tile);
    }
    teleTiles.textContent = count;
  }

  function paintTile(tile) {
    const t = THEMES[state.theme];
    const hue = Math.round(t.base + tile.hueOff * t.span);
    tile.core.style.setProperty('--th', hue);
    tile.core.textContent = tile.glyph;
    const size = state.layout === 'mono' ? 'clamp(18px, 3vw, 34px)'
      : state.layout === 'mosaic' ? 'clamp(10px, 1.4vw, 18px)'
      : 'clamp(9px, 1vw, 14px)';
    tile.core.style.fontSize = size;
  }

  function randomGlyph() {
    return CONFIG.glyphs[randInt(0, CONFIG.glyphs.length - 1)];
  }

  // === 布局引擎 (Layout Engine + FLIP) =====================================

  function applySpans() {
    tiles.forEach((tile) => {
      tile.el.style.gridColumn = '';
      tile.el.style.gridRow = '';
      tile.el.style.display = '';
    });

    if (state.layout === 'mosaic') {
      // 随机赋予跨格，dense flow 自动回填
      tiles.forEach((tile, i) => {
        const r = Math.random();
        if (r < 0.12) {
          tile.el.style.gridColumn = 'span 2';
          tile.el.style.gridRow = 'span 2';
        } else if (r < 0.3) {
          tile.el.style.gridColumn = 'span 2';
        } else if (r < 0.42 && i % 3 === 0) {
          tile.el.style.gridRow = 'span 2';
        }
      });
    }
  }

  /**
   * FLIP 重排：记录首帧位置 → 变更布局 → 反演位移 → 弹簧缓动归零
   * 交错延迟按距震中距离扩散，形成涟漪式重组
   */
  function flipRelayout() {
    const first = new Map();
    tiles.forEach((t) => first.set(t.el, t.el.getBoundingClientRect()));

    applySpans();
    tiles.forEach(paintTile);

    const epic = tiles[randInt(0, tiles.length - 1)];
    const eRect = epic.el.getBoundingClientRect();
    const ex = eRect.left + eRect.width / 2;
    const ey = eRect.top + eRect.height / 2;
    const maxDist = Math.hypot(window.innerWidth, window.innerHeight);

    tiles.forEach((tile) => {
      const f = first.get(tile.el);
      const l = tile.el.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      const cx = l.left + l.width / 2;
      const cy = l.top + l.height / 2;
      const dist = Math.hypot(cx - ex, cy - ey);
      const delay = (dist / maxDist) * 480;
      const scale = state.layout === 'mono' ? 0.72 : 0.85;

      tile.el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.4 },
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        ],
        {
          duration: rand(620, 860),
          delay,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'backwards',
        }
      );
    });
  }

  // === Remix 混音重组 ======================================================

  function remix() {
    state.remixes++;
    teleRemix.textContent = state.remixes;
    remixBtn.classList.remove('spinning');
    void remixBtn.offsetWidth; // 重置旋转动画
    remixBtn.classList.add('spinning');

    tiles.forEach((tile) => {
      tile.glyph = randomGlyph();
      tile.hueOff = Math.random();
      tile.vx += rand(-14, 14);
      tile.vy += rand(-14, 14);
      scrambleReveal(tile);
    });

    flipRelayout();
    centerPulse();
  }

  // === 乱码揭示 (Scramble Reveal) ==========================================

  function scrambleReveal(tile, duration = 520) {
    const finalGlyph = tile.glyph;
    const start = performance.now() + rand(0, 300);
    let lastSwap = 0;

    function tick(now) {
      const t = now - start;
      if (t < 0) { requestAnimationFrame(tick); return; }
      if (t >= duration) {
        tile.core.textContent = finalGlyph;
        flashGlow(tile);
        return;
      }
      if (now - lastSwap > 46) {
        lastSwap = now;
        tile.core.textContent = CONFIG.scrambleChars[randInt(0, CONFIG.scrambleChars.length - 1)];
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function flashGlow(tile) {
    tile.core.classList.add('glowing');
    setTimeout(() => tile.core.classList.remove('glowing'), 420);
  }

  // === 力场物理 (Force Field) ==============================================

  function physicsStep() {
    const p = state.pointer;
    const radius = 190 + state.intensity * 160;
    const strength = state.intensity * CONFIG.maxForce;
    let activeCount = 0;

    for (const tile of tiles) {
      const rect = tile.core.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let fx = 0, fy = 0;

      if (p.inside) {
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < radius && dist > 1) {
          const falloff = 1 - dist / radius;
          const f = strength * falloff * falloff;
          const nx = dx / dist;
          const ny = dy / dist;

          if (state.force === 'repel') {
            fx = nx * f; fy = ny * f;
          } else if (state.force === 'attract') {
            fx = -nx * f * 0.8; fy = -ny * f * 0.8;
          } else { // vortex
            fx = -ny * f * 0.9 + nx * f * 0.15;
            fy = nx * f * 0.9 + ny * f * 0.15;
          }
          activeCount++;
        }
      }

      // 弹簧-阻尼积分（半隐式欧拉）
      tile.vx = (tile.vx + fx * 0.016) * CONFIG.damping;
      tile.vy = (tile.vy + fy * 0.016) * CONFIG.damping;
      tile.ox += tile.vx;
      tile.oy += tile.vy;
      tile.ox = clamp(tile.ox, -160, 160);
      tile.oy = clamp(tile.oy, -160, 160);

      const rot = tile.ox * 0.06;
      const sq = 1 + Math.hypot(tile.ox, tile.oy) * 0.0009;
      tile.core.style.transform = `translate(${tile.ox.toFixed(2)}px, ${tile.oy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sq.toFixed(3)})`;
    }

    return activeCount;
  }

  // === 冲击波 (Shockwave) ==================================================

  function shockwaveAt(x, y) {
    // 视觉涟漪环
    const ring = document.createElement('div');
    ring.className = 'ripple-ring';
    const size = 420;
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
    ring.style.left = `${x - size / 2}px`;
    ring.style.top = `${y - size / 2}px`;
    stage.appendChild(ring);
    setTimeout(() => ring.remove(), 950);

    // 物理脉冲：距离衰减的径向冲量
    const R = 460;
    for (const tile of tiles) {
      const rect = tile.core.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.hypot(dx, dy);
      if (dist > R || dist < 1) continue;
      const power = (1 - dist / R) * 34 * (0.5 + state.intensity);
      tile.vx += (dx / dist) * power;
      tile.vy += (dy / dist) * power;
    }
  }

  function centerPulse() {
    const rect = stage.getBoundingClientRect();
    shockwaveAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  // === 标题乱码揭示 ========================================================

  function revealTitle() {
    const finalText = 'GRID REMIXER';
    let frame = 0;
    const totalFrames = 34;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(progress * finalText.length);
      let out = '';
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') { out += ' '; continue; }
        out += i < revealCount
          ? finalText[i]
          : CONFIG.scrambleChars[randInt(0, CONFIG.scrambleChars.length - 1)];
      }
      titleTarget.textContent = out;
      if (frame >= totalFrames) {
        titleTarget.textContent = finalText;
        clearInterval(timer);
      }
    }, 42);
  }

  // === 背景粒子流场 (Flow Field) ============================================

  function initFlowField() {
    const canvas = document.getElementById('field-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let W = 0, H = 0;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      const target = Math.min(64, Math.floor((W * H) / 26000));
      particles = Array.from({ length: target }, () => ({
        x: rand(0, W), y: rand(0, H),
        vx: 0, vy: 0, size: rand(0.6, 1.8),
        hueOff: Math.random(),
      }));
    }

    function accentOf(off) {
      const t = THEMES[state.theme];
      return Math.round(t.base + off * t.span * 0.5);
    }

    // 廉价伪噪声流场：正弦叠加角度
    function flowAngle(x, y, t) {
      return (
        Math.sin(x * 0.0016 + t * 0.00021) * 1.6
        + Math.cos(y * 0.0021 - t * 0.00017) * 1.6
        + Math.sin((x + y) * 0.0009 + t * 0.0001) * 1.2
      );
    }

    function step(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const a = flowAngle(p.x, p.y, t);
        p.vx += Math.cos(a) * 0.02;
        p.vy += Math.sin(a) * 0.02;
        p.vx *= 0.965; p.vy *= 0.965;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${accentOf(p.hueOff)}, 85%, 68%, 0.35)`;
        ctx.fill();
      }
      requestAnimationFrame(step);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(step);
  }

  // === 遥测 (Telemetry) ====================================================

  let telemetryHudTimer = 0;
  function updateTelemetry(activeCount, now) {
    if (now - telemetryHudTimer < 120) return;
    telemetryHudTimer = now;
    teleVel.textContent = state.pointer.speed.toFixed(2);
    teleMode.textContent = state.force.toUpperCase();
    const load = clamp((activeCount / tiles.length) * 100, 0, 100);
    teleForceBar.style.width = `${load}%`;
  }

  // === 主循环 ==============================================================

  function loop(now) {
    // 光标速度衰减
    state.pointer.speed *= 0.9;
    const active = physicsStep();
    updateTelemetry(active, now);
    requestAnimationFrame(loop);
  }

  // === 事件绑定 ============================================================

  function bindEvents() {
    stage.addEventListener('pointermove', (e) => {
      const p = state.pointer;
      p.px = p.x; p.py = p.y;
      p.x = e.clientX; p.y = e.clientY;
      p.inside = true;
      const d = Math.hypot(p.x - p.px, p.y - p.py);
      p.speed = Math.min(60, p.speed + d * 0.4);
    });
    stage.addEventListener('pointerleave', () => {
      state.pointer.inside = false;
      state.pointer.x = -9999;
      state.pointer.y = -9999;
    });

    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tile-core')) return;
      shockwaveAt(e.clientX, e.clientY);
    });

    gridField.addEventListener('click', (e) => {
      const core = e.target.closest('.tile-core');
      if (!core) return;
      const rect = core.getBoundingClientRect();
      shockwaveAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      flashGlow(tiles[Number(core.dataset.index)]);
    });

    remixBtn.addEventListener('click', remix);

    layoutSeg.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn || btn.dataset.layout === state.layout) return;
      layoutSeg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.layout = btn.dataset.layout;
      document.body.dataset.layout = state.layout;
      const prevCount = tiles.length;
      createTiles();
      // 数量变化时做一次整体入场
      if (tiles.length !== prevCount) {
        tiles.forEach((tile, i) => {
          tile.el.animate(
            [
              { transform: 'scale(0.3)', opacity: 0 },
              { transform: 'scale(1)', opacity: 1 },
            ],
            { duration: 700, delay: i * 9, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
          );
        });
      }
    });

    forceSeg.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      forceSeg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.force = btn.dataset.force;
      teleMode.textContent = state.force.toUpperCase();
    });

    themeSwatches.addEventListener('click', (e) => {
      const btn = e.target.closest('.swatch');
      if (!btn || btn.dataset.theme === state.theme) return;
      themeSwatches.querySelectorAll('.swatch').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.theme = btn.dataset.theme;
      document.body.dataset.theme = state.theme;
      // 主题迁移：重涂所有瓦片并乱码闪现
      tiles.forEach((tile) => {
        tile.hueOff = Math.random();
        paintTile(tile);
        scrambleReveal(tile, 380);
      });
    });

    intensityRange.addEventListener('input', () => {
      state.intensity = Number(intensityRange.value) / 100;
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyR') remix();
      else if (e.code === 'Space') { e.preventDefault(); centerPulse(); }
      else if (e.code === 'Digit1') layoutSeg.querySelector('[data-layout="dense"]').click();
      else if (e.code === 'Digit2') layoutSeg.querySelector('[data-layout="mosaic"]').click();
      else if (e.code === 'Digit3') layoutSeg.querySelector('[data-layout="mono"]').click();
    });
  }

  // === 初始化 ==============================================================

  function init() {
    createTiles();
    applySpans();
    bindEvents();
    initFlowField();
    revealTitle();

    // 入场级联
    tiles.forEach((tile, i) => {
      tile.el.animate(
        [
          { transform: 'translateY(26px) scale(0.6)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ],
        { duration: 820, delay: 120 + i * 11, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
      );
      scrambleReveal(tile, 640);
    });

    setTimeout(centerPulse, 1400);
    requestAnimationFrame(loop);
  }

  init();
})();
