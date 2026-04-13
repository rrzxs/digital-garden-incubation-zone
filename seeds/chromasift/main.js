/**
 * ChromaSift - 色彩筛分器
 * 沉浸式渐变配色灵感探索器
 * 
 * 核心：色彩粒子系统 + 筛分物理 + 交互采样
 */

(function () {
  'use strict';

  // ============================================================
  // 配置与状态
  // ============================================================

  const CONFIG = {
    particleCount: 120,
    baseSize: 10,
    baseForce: 0.5,
    easing: 0.08,
    friction: 0.92,
    mouseRadius: 160,
    siftDuration: 1800,
    shuffleDuration: 600,
  };

  const PALETTES = {
    spectrum: null, // 动态生成
    aurora: ['#00d4ff', '#a855f7', '#00ff88', '#ff6b6b', '#ffd93d'],
    ember: ['#f97316', '#ef4444', '#fbbf24', '#dc2626', '#f59e0b'],
    ocean: ['#0ea5e9', '#6366f1', '#0d9488', '#06b6d4', '#8b5cf6'],
  };

  const STATE = {
    particles: [],
    palette: [],
    currentPalette: 'spectrum',
    sortMode: 'hue', // hue | saturation | lightness
    isSifting: false,
    isShuffling: false,
    mouseX: -1000,
    mouseY: -1000,
    siftTarget: null,
    siftProgress: 0,
  };

  // ============================================================
  // 色彩工具函数
  // ============================================================

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ] : [0, 0, 0];
  }

  function isValidColor(hex) {
    return /^#[0-9a-f]{6}$/i.test(hex);
  }

  function generateSpectrumColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const h = Math.round((i / count) * 360);
      const s = 70 + Math.random() * 25;
      const l = 45 + Math.random() * 20;
      const [r, g, b] = hslToRgb(h, s, l);
      colors.push({ h, s, l, hex: rgbToHex(r, g, b), r, g, b });
    }
    return colors;
  }

  function mixPalette(baseColors) {
    const mixed = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const base = baseColors[i % baseColors.length];
      const hVar = (Math.random() - 0.5) * 15;
      const sVar = (Math.random() - 0.5) * 20;
      const lVar = (Math.random() - 0.5) * 15;
      const h = ((base.h + hVar) % 360 + 360) % 360;
      const s = Math.max(30, Math.min(100, base.s + sVar));
      const l = Math.max(20, Math.min(80, base.l + lVar));
      const [r, g, b] = hslToRgb(h, s, l);
      mixed.push({ h, s, l, hex: rgbToHex(r, g, b), r, g, b });
    }
    return mixed;
  }

  // ============================================================
  // 粒子类
  // ============================================================

  class Particle {
    constructor(x, y, color, size) {
      this.x = x;
      this.y = y;
      this.originX = x;
      this.originY = y;
      this.vx = 0;
      this.vy = 0;
      this.targetX = x;
      this.targetY = y;
      this.color = color;
      this.size = size;
      this.baseSize = size;
      this.alpha = 0.85;
      this.sorted = false;
      this.siftStartX = 0;
      this.siftStartY = 0;
      this.siftTargetX = 0;
      this.siftTargetY = 0;
      this.siftStart = 0;
    }

    update(delta, width, height, mouseX, mouseY) {
      // 鼠标排斥力
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRadius && dist > 0) {
        const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
        this.vx += (dx / dist) * force * 3;
        this.vy += (dy / dist) * force * 3;
      }

      // 目标吸附（筛分或打散）
      if (!this.sorted) {
        this.vx += (this.targetX - this.x) * CONFIG.easing;
        this.vy += (this.targetY - this.y) * CONFIG.easing;
      } else {
        // 筛分动画
        const t = Math.min(1, (Date.now() - this.siftStart) / CONFIG.siftDuration);
        const ease = 1 - Math.pow(1 - t, 4);
        this.x = this.siftStartX + (this.siftTargetX - this.siftStartX) * ease;
        this.y = this.siftStartY + (this.siftTargetY - this.siftStartY) * ease;
      }

      // 摩擦力
      this.vx *= CONFIG.friction;
      this.vy *= CONFIG.friction;

      // 应用速度
      this.x += this.vx;
      this.y += this.vy;

      // 边界
      if (this.x < 0) { this.x = 0; this.vx *= -0.5; }
      if (this.x > width) { this.x = width; this.vx *= -0.5; }
      if (this.y < 0) { this.y = 0; this.vy *= -0.5; }
      if (this.y > height) { this.y = height; this.vy *= -0.5; }

      // 尺寸脉动
      this.size = this.baseSize + Math.sin(Date.now() * 0.003 + this.x * 0.01) * 1.5;
    }

    draw(ctx) {
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size * 1.5
      );
      gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`);
      gradient.addColorStop(0.4, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 内核
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============================================================
  // Canvas & 渲染
  // ============================================================

  let canvas, ctx, width, height;
  let animationId;
  let lastTime = 0;

  function initCanvas() {
    canvas = document.getElementById('sift-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  function initParticles() {
    STATE.particles = [];
    const baseColors = PALETTES[STATE.currentPalette] || generateSpectrumColors(5);
    const palette = STATE.currentPalette === 'spectrum'
      ? generateSpectrumColors(CONFIG.particleCount)
      : mixPalette(baseColors);

    const cols = Math.ceil(Math.sqrt(CONFIG.particleCount * (width / height)));
    const rows = Math.ceil(CONFIG.particleCount / cols);
    const cellW = width / cols;
    const cellH = height / rows;
    const marginX = cellW * 0.15;
    const marginY = cellH * 0.15;

    for (let i = 0; i < CONFIG.particleCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW + cellW / 2 + (Math.random() - 0.5) * marginX;
      const y = row * cellH + cellH / 2 + (Math.random() - 0.5) * marginY;
      const color = palette[i % palette.length];
      const size = CONFIG.baseSize + (Math.random() - 0.5) * 3;
      const p = new Particle(x, y, color, size);
      p.targetX = x;
      p.targetY = y;
      p.originX = x;
      p.originY = y;
      STATE.particles.push(p);
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, width, height);
  }

  function render(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    clearCanvas();

    for (const p of STATE.particles) {
      p.update(delta, width, height, STATE.mouseX, STATE.mouseY);
      p.draw(ctx);
    }

    animationId = requestAnimationFrame(render);
  }

  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    lastTime = performance.now();
    animationId = requestAnimationFrame(render);
  }

  // ============================================================
  // 筛分逻辑
  // ============================================================

  function getSortKey(p, mode) {
    if (mode === 'hue') return p.color.h;
    if (mode === 'saturation') return p.color.s;
    if (mode === 'lightness') return p.color.l;
    return 0;
  }

  function sift() {
    if (STATE.isSifting || STATE.particles.length === 0) return;
    STATE.isSifting = true;

    const mode = STATE.sortMode;
    const particles = [...STATE.particles];

    // 按目标属性排序
    particles.sort((a, b) => getSortKey(a, mode) - getSortKey(b, mode));

    // 网格排列
    const cols = Math.ceil(Math.sqrt(particles.length * (width / height)));
    const rows = Math.ceil(particles.length / cols);
    const cellW = width / cols;
    const cellH = height / rows;

    particles.forEach((p, i) => {
      p.sorted = true;
      p.siftStartX = p.x;
      p.siftStartY = p.y;
      p.siftStart = Date.now();
      const col = i % cols;
      const row = Math.floor(i / cols);
      p.siftTargetX = col * cellW + cellW / 2;
      p.siftTargetY = row * cellH + cellH / 2;
    });

    // 动画结束后重置为可交互状态
    setTimeout(() => {
      particles.forEach((p) => {
        p.sorted = false;
        p.targetX = p.siftTargetX;
        p.targetY = p.siftTargetY;
        p.originX = p.siftTargetX;
        p.originY = p.siftTargetY;
      });
      STATE.isSifting = false;
    }, CONFIG.siftDuration + 200);
  }

  function shuffle() {
    if (STATE.isShuffling || STATE.particles.length === 0) return;
    STATE.isShuffling = true;

    const particles = STATE.particles;
    particles.forEach((p) => {
      p.sorted = false;
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 200;
      p.targetX = p.originX + Math.cos(angle) * radius;
      p.targetY = p.originY + Math.sin(angle) * radius;
    });

    setTimeout(() => {
      particles.forEach((p) => {
        p.targetX = p.originX;
        p.targetY = p.originY;
      });
      setTimeout(() => {
        STATE.isShuffling = false;
      }, CONFIG.shuffleDuration * 2);
    }, CONFIG.shuffleDuration);
  }

  // ============================================================
  // 调色板
  // ============================================================

  function addToPalette(color) {
    if (STATE.palette.length >= 12) {
      STATE.palette.shift();
    }
    STATE.palette.push(color);
    renderPalette();
    showToast(`已采集 ${color.hex}`, color.hex);
  }

  function renderPalette() {
    const container = document.getElementById('palette-slots');
    const countEl = document.getElementById('palette-count');
    countEl.textContent = STATE.palette.length;
    container.innerHTML = '';

    STATE.palette.forEach((color, i) => {
      const slot = document.createElement('div');
      slot.className = 'palette-slot';
      slot.style.background = color.hex;
      slot.title = `${color.hex}\nHSL(${color.h}, ${color.s}%, ${color.l}%)`;
      slot.addEventListener('click', () => {
        navigator.clipboard.writeText(color.hex).catch(() => {});
        showToast(`已复制 ${color.hex}`, color.hex);
      });
      container.appendChild(slot);
    });
  }

  function clearPalette() {
    STATE.palette = [];
    renderPalette();
  }

  // ============================================================
  // 工具提示
  // ============================================================

  const tooltip = document.getElementById('color-tooltip');
  const tooltipSwatch = document.getElementById('tooltip-swatch');
  const tooltipHex = document.getElementById('tooltip-hex');
  const tooltipHsl = document.getElementById('tooltip-hsl');

  function showTooltip(x, y, color) {
    tooltipSwatch.style.background = color.hex;
    tooltipHex.textContent = color.hex;
    tooltipHsl.textContent = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    tooltip.style.opacity = '1';
    tooltip.style.left = (x + 16) + 'px';
    tooltip.style.top = (y - 12) + 'px';
  }

  function hideTooltip() {
    tooltip.style.opacity = '0';
  }

  // ============================================================
  // Toast 通知
  // ============================================================

  function showToast(message, colorHex) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-swatch" style="background:${colorHex || '#6366f1'}"></div>
      <span class="toast-msg">${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2000);
  }

  // ============================================================
  // 事件绑定
  // ============================================================

  function bindEvents() {
    const stageArea = document.getElementById('stage-area');

    // 鼠标跟踪
    document.addEventListener('mousemove', (e) => {
      STATE.mouseX = e.clientX;
      STATE.mouseY = e.clientY;
      updateCursorGlow(e.clientX, e.clientY);

      // 实时显示悬停颜色
      if (!STATE.isSifting) {
        const hit = findNearestParticle(e.clientX, e.clientY);
        if (hit) {
          showTooltip(e.clientX, e.clientY, hit.color);
        } else {
          hideTooltip();
        }
      }
    });

    document.addEventListener('mouseleave', () => {
      STATE.mouseX = -1000;
      STATE.mouseY = -1000;
      hideTooltip();
    });

    // 点击采样
    canvas.addEventListener('click', (e) => {
      if (STATE.isSifting) return;
      const hit = findNearestParticle(e.clientX, e.clientY);
      if (hit) {
        addToPalette(hit.color);
      }
    });

    // 双击打散
    canvas.addEventListener('dblclick', () => {
      shuffle();
    });

    // 控件绑定
    const densitySlider = document.getElementById('ctrl-density');
    const forceSlider = document.getElementById('ctrl-force');
    const sizeSlider = document.getElementById('ctrl-size');
    const valDensity = document.getElementById('val-density');
    const valForce = document.getElementById('val-force');
    const valSize = document.getElementById('val-size');

    densitySlider.addEventListener('input', (e) => {
      CONFIG.particleCount = parseInt(e.target.value);
      valDensity.textContent = CONFIG.particleCount;
      initParticles();
    });

    forceSlider.addEventListener('input', (e) => {
      CONFIG.baseForce = parseInt(e.target.value) / 100;
      valForce.textContent = CONFIG.baseForce.toFixed(2);
    });

    sizeSlider.addEventListener('input', (e) => {
      CONFIG.baseSize = parseInt(e.target.value);
      valSize.textContent = CONFIG.baseSize;
      STATE.particles.forEach((p) => {
        p.baseSize = CONFIG.baseSize + (Math.random() - 0.5) * 3;
      });
    });

    // 调色板切换
    document.querySelectorAll('.palette-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.currentPalette = btn.dataset.palette;
        initParticles();
      });
    });

    // 排序按钮
    document.querySelectorAll('.sort-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.sortMode = btn.dataset.sort;
      });
    });

    // 调色板清理
    document.getElementById('palette-clear').addEventListener('click', clearPalette);

    // 操作按钮
    document.getElementById('btn-shuffle').addEventListener('click', shuffle);
    document.getElementById('btn-sift').addEventListener('click', sift);
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        sift();
      } else if (e.key === 'r' || e.key === 'R') {
        shuffle();
      }
    });
  }

  // ============================================================
  // 光标辉光
  // ============================================================

  const cursorGlow = document.getElementById('cursor-glow');

  function updateCursorGlow(x, y) {
    cursorGlow.style.left = (x - 100) + 'px';
    cursorGlow.style.top = (y - 100) + 'px';
  }

  // ============================================================
  // 粒子碰撞检测
  // ============================================================

  function findNearestParticle(x, y) {
    let nearest = null;
    let minDist = Infinity;
    const hitRadius = 30;
    for (const p of STATE.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    return nearest;
  }

  // ============================================================
  // 初始化
  // ============================================================

  function init() {
    initCanvas();
    initParticles();
    bindEvents();
    startAnimation();
    renderPalette();

    // 隐藏加载提示
    const hint = document.getElementById('stage-hint');
    setTimeout(() => {
      if (hint) hint.style.opacity = '0';
    }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
