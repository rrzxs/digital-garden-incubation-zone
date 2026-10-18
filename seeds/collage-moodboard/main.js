/* ============================================================
   Collage Moodboard — 交互逻辑
   弹簧-阻尼碎片物理 + 脉冲冲击波 + 粒子流场 + 乱码揭示
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const stage = document.getElementById('stage');
  const hint = document.getElementById('stageHint');
  const toast = document.getElementById('toast');
  const fieldCanvas = document.getElementById('fieldCanvas');
  const fctx = fieldCanvas.getContext('2d');
  const teleCount = document.getElementById('teleCount');
  const telePinned = document.getElementById('telePinned');
  const telePulses = document.getElementById('telePulses');
  const teleTheme = document.getElementById('teleTheme');

  // === State ===
  const frags = [];
  let fragUid = 0;
  let zTop = 10;
  let pulseCount = 0;
  let toastTimer = null;

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const THEME_NAMES = { aurora: 'AURORA', dusk: 'DUSK', mono: 'MONO', tropic: 'TROPIC' };

  // === Simplex-ish Noise (轻量伪噪声，用于流场) ===
  const noiseSeed = Math.random() * 1000;
  function noise2(x, y, t) {
    return (
      Math.sin(x * 1.7 + t * 0.6 + noiseSeed) * 0.5 +
      Math.sin(y * 2.3 - t * 0.4) * 0.3 +
      Math.sin((x + y) * 1.1 + t * 0.9) * 0.2
    );
  }

  // === Toast ===
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
  }

  // === Telemetry ===
  function updateTelemetry() {
    teleCount.textContent = String(frags.length).padStart(2, '0');
    telePinned.textContent = String(frags.filter(f => f.pinned).length).padStart(2, '0');
    telePulses.textContent = String(pulseCount).padStart(3, '0');
    teleTheme.textContent = THEME_NAMES[document.body.dataset.theme] || '—';
  }

  // ============================================================
  // 碎片物理 —— 位置 + 速度 + 弹簧目标，帧循环积分
  // ============================================================
  class Frag {
    constructor(el) {
      this.el = el;
      this.x = 0; this.y = 0;
      this.vx = 0; this.vy = 0;
      this.rot = rand(-6, 6);
      this.rotV = 0;
      this.tx = null; this.ty = null; // 弹簧目标（洗牌/入场用）
      this.grabbed = false;
      this.pinned = false;
      this.w = 200; this.h = 120;
    }

    measure() {
      const r = this.el.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
    }

    step(dt) {
      if (this.grabbed) return;
      // 弹簧回归（洗牌动画）优先
      if (this.tx !== null) {
        const k = 0.045, damp = 0.86;
        this.vx += (this.tx - this.x) * k;
        this.vy += (this.ty - this.y) * k;
        this.vx *= damp; this.vy *= damp;
        if (Math.abs(this.tx - this.x) < 0.5 && Math.abs(this.vy) < 0.5 && Math.abs(this.vx) < 0.5) {
          this.tx = null; this.ty = null;
        }
      } else {
        // 自由惯性 + 摩擦
        const friction = 0.94;
        this.vx *= friction; this.vy *= friction;
        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vy) < 0.01) this.vy = 0;
      }

      this.x += this.vx;
      this.y += this.vy;

      // 边界弹性碰撞
      const margin = 8;
      if (this.x < margin) { this.x = margin; this.vx = Math.abs(this.vx) * 0.65; }
      if (this.x > W() - this.w - margin) { this.x = W() - this.w - margin; this.vx = -Math.abs(this.vx) * 0.65; }
      if (this.y < margin + 70) { this.y = margin + 70; this.vy = Math.abs(this.vy) * 0.65; }
      if (this.y > H() - this.h - margin) { this.y = H() - this.h - margin; this.vy = -Math.abs(this.vy) * 0.65; }

      // 速度驱动的姿态倾斜
      const targetRot = clamp(this.vx * 0.5, -14, 14) + (this.tx === null ? this.baseRot || 0 : 0);
      this.rotV += (targetRot - this.rot) * 0.12;
      this.rotV *= 0.8;
      this.rot += this.rotV;

      this.render();
    }

    render() {
      const scale = this.grabbed ? 1.06 : 1;
      this.el.style.transform =
        `translate3d(${this.x}px, ${this.y}px, 0) rotate(${this.rot}deg) scale(${scale})`;
    }

    bringToFront() {
      this.el.style.zIndex = ++zTop;
    }

    remove() {
      this.el.classList.add('is-dying');
      setTimeout(() => this.el.remove(), 400);
      const i = frags.indexOf(this);
      if (i > -1) frags.splice(i, 1);
      updateTelemetry();
    }
  }

  // ============================================================
  // 碎片创建
  // ============================================================
  function buildFragShell(type) {
    const el = document.createElement('div');
    el.className = `frag frag-${type}`;
    el.innerHTML = '<div class="frag-glare"></div>';
    stage.appendChild(el);
    return el;
  }

  function attachActions(frag) {
    const bar = document.createElement('div');
    bar.className = 'frag-actions';
    const pin = document.createElement('button');
    pin.className = 'frag-act'; pin.textContent = '📌'; pin.title = '钉住/解钉';
    pin.style.fontSize = '10px';
    const del = document.createElement('button');
    del.className = 'frag-act'; del.textContent = '✕'; del.title = '删除';
    bar.append(pin, del);
    frag.el.appendChild(bar);

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      frag.pinned = !frag.pinned;
      pin.classList.toggle('pin-on', frag.pinned);
      frag.el.classList.toggle('is-pinned', frag.pinned);
      showToast(frag.pinned ? '碎片已钉住' : '碎片已解钉');
      updateTelemetry();
    });
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      frag.remove();
      showToast('碎片已移除');
    });
    return frag;
  }

  const NOTE_SEEDS = [
    '深夜的霓虹像熔化的糖', '保持好奇，保持笨拙', 'Mood: 半透明的心跳',
    '把焦虑折成纸飞机', '灵感是易碎品，轻拿轻放', '慢一点，光会追上你'
  ];

  function addNote(text, atX, atY) {
    const el = buildFragShell('note');
    const ta = document.createElement('textarea');
    ta.placeholder = '写下此刻的念头…';
    ta.value = text || NOTE_SEEDS[Math.floor(Math.random() * NOTE_SEEDS.length)];
    el.appendChild(ta);
    spawnFrag(el, atX, atY);
    setTimeout(() => ta.focus(), 100);
  }

  function randomHex() {
    const h = Math.floor(rand(0, 360));
    const s = Math.floor(rand(55, 90));
    const l = Math.floor(rand(45, 70));
    const css = `hsl(${h}, ${s}%, ${l}%)`;
    // 转 HEX 用于展示
    const tmp = document.createElement('div');
    tmp.style.color = css;
    document.body.appendChild(tmp);
    const m = getComputedStyle(tmp).color.match(/\d+/g).map(Number);
    tmp.remove();
    return {
      css,
      hex: '#' + m.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    };
  }

  function addColor(atX, atY) {
    const el = buildFragShell('color');
    const { css, hex } = randomHex();
    const sw = document.createElement('div');
    sw.className = 'frag-swatch';
    sw.style.background = `linear-gradient(135deg, ${css}, ${css}99)`;
    const meta = document.createElement('div');
    meta.className = 'frag-color-meta';
    meta.innerHTML = `<span class="frag-hex">${hex}</span>`;
    const cp = document.createElement('button');
    cp.className = 'frag-copy'; cp.textContent = 'COPY';
    cp.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard?.writeText(hex).then(() => showToast(`已复制 ${hex}`)).catch(() => showToast(hex));
    });
    meta.appendChild(cp);
    el.append(sw, meta);
    spawnFrag(el, atX, atY);
  }

  function addImage(atX, atY) {
    const el = buildFragShell('image');
    const art = document.createElement('div');
    art.className = 'frag-art';
    const a = randomHex().css, b = randomHex().css, c = randomHex().css;
    const style = Math.floor(rand(0, 3));
    if (style === 0) {
      art.style.background = `radial-gradient(circle at 30% 30%, ${a}, transparent 60%), radial-gradient(circle at 75% 70%, ${b}, transparent 55%), ${c}`;
    } else if (style === 1) {
      art.style.background = `conic-gradient(from ${Math.floor(rand(0, 360))}deg, ${a}, ${b}, ${c}, ${a})`;
    } else {
      art.style.background = `linear-gradient(${Math.floor(rand(0, 360))}deg, ${a}, ${b} 55%, ${c})`;
    }
    art.innerHTML = '<div class="frag-art-label">FRAG.' + String(fragUid + 1).padStart(3, '0') + '</div>';
    el.appendChild(art);
    spawnFrag(el, atX, atY);
  }

  function spawnFrag(el, atX, atY) {
    const frag = attachActions(new Frag(el));
    frag.baseRot = rand(-7, 7);
    frag.x = atX !== undefined ? atX : rand(W() * 0.2, W() * 0.7);
    frag.y = atY !== undefined ? atY : rand(H() * 0.2, H() * 0.65);
    frag.el.style.zIndex = ++zTop;
    frags.push(frag);
    requestAnimationFrame(() => frag.measure());
    bindDrag(frag);
    hideHint();
    updateTelemetry();
    fragUid++;
  }

  function hideHint() {
    if (frags.length > 0) hint.classList.add('is-hidden');
  }

  // ============================================================
  // 拖拽 + 抛掷物理
  // ============================================================
  function bindDrag(frag) {
    let lastX = 0, lastY = 0, lastT = 0;
    let movedFar = false;

    frag.el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.frag-act') || e.target.closest('.frag-copy')) return;
      if (e.target.tagName === 'TEXTAREA' && !frag.pinned) {
        // 便签内编辑：按住编辑区顶部把手才拖拽 —— 简化：textarea 交给编辑，仅在 pinned 时可拖
        return;
      }
      e.preventDefault();
      frag.grabbed = true;
      frag.tx = null;
      movedFar = false;
      frag.el.classList.add('is-grabbed');
      frag.bringToFront();
      lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
      frag.measure();
      frag.el.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        frag.vx = (ev.clientX - lastX) / dt * 16;
        frag.vy = (ev.clientY - lastY) / dt * 16;
        if (Math.abs(ev.clientX - lastX) + Math.abs(ev.clientY - lastY) > 4) movedFar = true;
        frag.x += ev.clientX - lastX;
        frag.y += ev.clientY - lastY;
        lastX = ev.clientX; lastY = ev.clientY; lastT = now;
        frag.render();
      };

      const onUp = () => {
        frag.grabbed = false;
        frag.el.classList.remove('is-grabbed');
        frag.el.removeEventListener('pointermove', onMove);
        frag.el.removeEventListener('pointerup', onUp);
        frag.el.removeEventListener('pointercancel', onUp);
      };

      frag.el.addEventListener('pointermove', onMove);
      frag.el.addEventListener('pointerup', onUp);
      frag.el.addEventListener('pointercancel', onUp);
    });

    // 双击置顶 + 脉冲小惊喜
    frag.el.addEventListener('dblclick', () => {
      frag.bringToFront();
      frag.rotV += rand(-6, 6);
      spawnRing(frag.x + frag.w / 2, frag.y + frag.h / 2, 180);
    });
  }

  // ============================================================
  // 点击脉冲冲击波 —— 推开邻近碎片
  // ============================================================
  function spawnRing(x, y, radius = 320) {
    const ring = document.createElement('div');
    ring.className = 'pulse-ring';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 900);

    frags.forEach(f => {
      if (f.grabbed || f.pinned) return;
      const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      const dx = cx - x, dy = cy - y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const force = (1 - dist / radius) * 26;
        f.vx += (dx / (dist || 1)) * force;
        f.vy += (dy / (dist || 1)) * force;
        f.rotV += rand(-4, 4);
      }
    });
    pulseCount++;
    updateTelemetry();
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.target === stage || e.target === hint) {
      spawnRing(e.clientX, e.clientY);
    }
  });

  // ============================================================
  // 光泽追踪
  // ============================================================
  document.addEventListener('pointermove', (e) => {
    const glare = e.target.closest?.('.frag')?.querySelector('.frag-glare');
    if (!glare) return;
    const r = glare.getBoundingClientRect();
    glare.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
    glare.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
  });

  // ============================================================
  // 工具栏
  // ============================================================
  document.getElementById('addNoteBtn').addEventListener('click', () => addNote());
  document.getElementById('addColorBtn').addEventListener('click', () => addColor());
  document.getElementById('addImageBtn').addEventListener('click', () => addImage());

  document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (!frags.length) return showToast('画布为空，先添加碎片吧');
    const cols = Math.ceil(Math.sqrt(frags.length));
    frags.forEach((f, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      f.tx = clamp(80 + col * (f.w + 36) + rand(-20, 20), 20, W() - f.w - 20);
      f.ty = clamp(110 + row * (f.h + 36) + rand(-16, 16), 90, H() - f.h - 20);
      f.rotV += rand(-3, 3);
    });
    showToast('碎片洗牌重组中…');
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!frags.length) return showToast('画布已经空了');
    [...frags].forEach((f, i) => setTimeout(() => f.remove(), i * 60));
    hint.classList.remove('is-hidden');
    showToast('画布已清空');
  });

  // === 主题切换 ===
  document.getElementById('themeGroup').addEventListener('click', (e) => {
    const dot = e.target.closest('.theme-dot');
    if (!dot) return;
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('is-active'));
    dot.classList.add('is-active');
    document.body.dataset.theme = dot.dataset.theme;
    updateTelemetry();
    showToast(`氛围切换 · ${THEME_NAMES[dot.dataset.theme]}`);
  });

  // ============================================================
  // 乱码揭示标题
  // ============================================================
  function scrambleReveal(el, finalText, duration = 1400) {
    const glyphs = '▮▯◧◨◩◧◆◇◐◑⬡⌁⌬◈';
    const start = performance.now();
    (function tick() {
      const p = clamp((performance.now() - start) / duration, 0, 1);
      const reveal = Math.floor(p * finalText.length);
      let out = finalText.slice(0, reveal);
      for (let i = reveal; i < finalText.length; i++) {
        out += finalText[i] === ' ' ? ' ' : glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
    })();
  }
  scrambleReveal(document.getElementById('brandTitle'), 'COLLAGE MOODBOARD');

  // ============================================================
  // 环境粒子流场
  // ============================================================
  let particles = [];
  function initParticles() {
    particles = Array.from({ length: 70 }, () => ({
      x: rand(0, W()), y: rand(0, H()),
      ox: rand(0, W()), oy: rand(0, H()),
      life: rand(0.3, 1)
    }));
  }

  function resize() {
    fieldCanvas.width = W();
    fieldCanvas.height = H();
    initParticles();
  }
  window.addEventListener('resize', resize);
  resize();

  function themeColors() {
    const s = getComputedStyle(document.body);
    return [s.getPropertyValue('--c1'), s.getPropertyValue('--c4'), s.getPropertyValue('--c3')].map(c => c.trim());
  }

  let flowT = 0;
  function drawField(dt) {
    flowT += dt * 0.00035;
    fctx.clearRect(0, 0, W(), H());
    const colors = themeColors();
    fctx.lineWidth = 1;
    particles.forEach((p, i) => {
      const ang = noise2(p.ox * 0.002, p.oy * 0.002, flowT) * Math.PI * 1.6;
      p.x += Math.cos(ang) * 0.4;
      p.y += Math.sin(ang) * 0.4;
      p.life -= 0.002;
      if (p.x < -20 || p.x > W() + 20 || p.y < -20 || p.y > H() + 20 || p.life <= 0) {
        p.x = rand(0, W()); p.y = rand(0, H());
        p.ox = p.x; p.oy = p.y;
        p.life = rand(0.3, 1);
      }
      fctx.globalAlpha = 0.28 * p.life;
      fctx.strokeStyle = colors[i % colors.length];
      fctx.beginPath();
      fctx.moveTo(p.x, p.y);
      fctx.lineTo(p.x - Math.cos(ang) * 14, p.y - Math.sin(ang) * 14);
      fctx.stroke();
    });
    fctx.globalAlpha = 1;
  }

  // ============================================================
  // 主循环
  // ============================================================
  let lastFrame = performance.now();
  function loop(now) {
    const dt = now - lastFrame;
    lastFrame = now;
    frags.forEach(f => f.step(dt));
    drawField(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // === 初始碎片布置 ===
  setTimeout(() => {
    addImage(W() * 0.16, H() * 0.22);
    addColor(W() * 0.5, H() * 0.3);
    addNote(null, W() * 0.62, H() * 0.5);
    addImage(W() * 0.3, H() * 0.55);
    addColor(W() * 0.7, H() * 0.2);
  }, 400);

  updateTelemetry();
})();
