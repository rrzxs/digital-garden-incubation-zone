/* ============================================================
   BADGE FORGE · 徽章熔铸台
   Vanilla JS — 无构建、无依赖
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const $ = (id) => document.getElementById(id);
  const badgeMount = $('badge-mount');
  const badgeTilt = $('badge-tilt');
  const badgeGlare = $('badge-glare');
  const badgeStage = $('badge-stage');
  const shockwave = $('shockwave');
  const labelInput = $('label-input');
  const subInput = $('sub-input');
  const btnMint = $('btn-mint');
  const btnCopy = $('btn-copy');
  const btnDownload = $('btn-download');
  const btnClear = $('btn-clear');
  const archiveGrid = $('archive-grid');
  const archiveEmpty = $('archive-empty');
  const hudForged = $('hud-forged');
  const hudShape = $('hud-shape');
  const hudStyle = $('hud-style');
  const ambientCanvas = $('ambient-canvas');
  const burstCanvas = $('burst-canvas');
  const titleEl = $('title-scramble');
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  document.body.appendChild(toastEl);

  // === Palettes ===
  const PALETTES = {
    ember:    ['#ff9a3c', '#ff4d6d', '#ffd166', '#ffe9d6'],
    azure:    ['#4cc9f0', '#4361ee', '#8ed8f8', '#dcecff'],
    verdant:  ['#57e39a', '#0f9b6c', '#b8f2c9', '#dcffe9'],
    amethyst: ['#c77dff', '#7b2cbf', '#e0aaff', '#f1e3ff']
  };

  // === Shape paths (viewBox 0 0 200 200) ===
  const SHAPES = {
    shield:  'M100 12 L172 40 V104 C172 148 140 172 100 188 C60 172 28 148 28 104 V40 Z',
    hex:     'M100 12 L172 54 V146 L100 188 L28 146 V54 Z',
    circle:  'M100 12 A88 88 0 1 1 99.9 12 Z',
    diamond: 'M100 12 L176 100 L100 188 L24 100 Z',
    star:    'M100 10 L124 72 L190 78 L140 124 L156 190 L100 154 L44 190 L60 124 L10 78 L76 72 Z'
  };

  // === State ===
  const state = {
    label: 'PIONEER',
    sub: 'FORGED BY EDEN',
    shape: 'shield',
    style: 'glass',
    sigil: '⚡',
    palette: 'ember',
    forged: 0,
    archive: []
  };

  // === Utilities ===
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const uid = () => Math.random().toString(36).slice(2, 9);

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ============================================================
  // Badge SVG Builder — 根据状态生成完整 SVG 标记
  // ============================================================
  function buildBadgeSVG(cfg) {
    const p = PALETTES[cfg.palette];
    const [c1, c2, c3, ink] = p;
    const path = SHAPES[cfg.shape];
    const label = (cfg.label || 'BADGE').toUpperCase();
    const sub = (cfg.sub || '').toUpperCase();
    const hasSub = sub.length > 0;
    const sigilY = hasSub ? 92 : 100;
    const labelY = hasSub ? 138 : 130;
    const subY = 156;

    // 样式化填充
    let bodyFill;
    if (cfg.style === 'gradient') {
      bodyFill = 'url(#bg-grad)';
    } else if (cfg.style === 'glass') {
      bodyFill = 'url(#bg-glass)';
    } else if (cfg.style === 'outline') {
      bodyFill = 'rgba(10,10,18,0.75)';
    } else {
      bodyFill = 'url(#bg-holo)';
    }

    const strokeW = cfg.style === 'outline' ? 5 : 2;
    const sigilFill = cfg.style === 'gradient' ? '#0a0a12' : c3;
    const labelFill = cfg.style === 'gradient' ? '#0a0a12' : ink;

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${esc(label)} badge">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c3}"/>
      <stop offset="1" stop-color="${c1}"/>
    </linearGradient>
    <linearGradient id="bg-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${c2}" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="bg-holo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c3}"/>
      <stop offset="0.35" stop-color="${c1}"/>
      <stop offset="0.7" stop-color="${c2}"/>
      <stop offset="1" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="stroke-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c3}"/>
      <stop offset="1" stop-color="${c1}"/>
    </linearGradient>
    <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <path d="${path}" fill="rgba(0,0,0,0.5)" filter="feGaussianBlur" opacity="0"/>
  <path d="${path}" fill="${bodyFill}" stroke="url(#stroke-grad)" stroke-width="${strokeW}" stroke-linejoin="round"/>
  <path d="${path}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1" stroke-linejoin="round"
        transform="translate(100 100) scale(0.86) translate(-100 -100)"/>

  <text x="100" y="${sigilY}" text-anchor="middle" font-size="40"
        font-family="'Outfit','Inter',sans-serif" fill="${sigilFill}"
        filter="url(#soft-glow)">${esc(cfg.sigil)}</text>

  <text x="100" y="${labelY}" text-anchor="middle"
        font-family="'Outfit','Inter',sans-serif" font-weight="700"
        font-size="${label.length > 10 ? 15 : 19}" letter-spacing="1.5"
        fill="${labelFill}">${esc(label)}</text>
  ${hasSub ? `
  <text x="100" y="${subY}" text-anchor="middle"
        font-family="'Share Tech Mono',monospace" font-size="8.5" letter-spacing="2"
        fill="${labelFill}" opacity="0.7">${esc(sub)}</text>` : ''}
</svg>`.trim();
  }

  // ============================================================
  // Preview Render
  // ============================================================
  function renderPreview() {
    badgeMount.innerHTML = buildBadgeSVG(state);
    document.body.dataset.palette = state.palette;
    hudShape.textContent = state.shape.toUpperCase();
    hudStyle.textContent = state.style.toUpperCase();
  }

  // ============================================================
  // Tilt + Glare — 3D 倾斜跟随光标
  // ============================================================
  const tiltState = { rx: 0, ry: 0, trx: 0, try_: 0 };

  badgeStage.addEventListener('pointermove', (e) => {
    const r = badgeStage.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    tiltState.try_ = nx * 22;
    tiltState.trx = -ny * 18;
    badgeGlare.style.setProperty('--gx', `${(nx + 0.5) * 100}%`);
    badgeGlare.style.setProperty('--gy', `${(ny + 0.5) * 100}%`);
  });
  badgeStage.addEventListener('pointerleave', () => {
    tiltState.trx = 0; tiltState.try_ = 0;
  });

  function tickTilt() {
    // 弹簧-阻尼趋近目标角
    tiltState.rx += (tiltState.trx - tiltState.rx) * 0.12;
    tiltState.ry += (tiltState.try_ - tiltState.ry) * 0.12;
    const minting = badgeTilt.classList.contains('minting');
    if (!minting) {
      badgeTilt.style.transform = `rotateX(${tiltState.rx.toFixed(2)}deg) rotateY(${tiltState.ry.toFixed(2)}deg)`;
    }
    requestAnimationFrame(tickTilt);
  }

  // ============================================================
  // Ambient Particles — 环境粒子流场
  // ============================================================
  const ambCtx = ambientCanvas.getContext('2d');
  const burstCtx = burstCanvas.getContext('2d');
  let W = 0, H = 0;
  const ambientParticles = [];
  const burstParticles = [];

  function resize() {
    W = innerWidth; H = innerHeight;
    [ambientCanvas, burstCanvas].forEach((c) => { c.width = W; c.height = H; });
  }
  addEventListener('resize', resize);
  resize();

  function initAmbient() {
    ambientParticles.length = 0;
    const n = Math.min(70, Math.floor(W * H / 22000));
    for (let i = 0; i < n; i++) {
      ambientParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.35 + 0.08,
        tw: Math.random() * Math.PI * 2
      });
    }
  }
  initAmbient();
  addEventListener('resize', initAmbient);

  function paletteRGB(name) {
    const hex = PALETTES[name][0];
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function drawAmbient(t) {
    ambCtx.clearRect(0, 0, W, H);
    const [r, g, b] = paletteRGB(state.palette);
    for (const p of ambientParticles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 + p.tw);
      ambCtx.beginPath();
      ambCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ambCtx.fillStyle = `rgba(${r},${g},${b},${(p.a * twinkle).toFixed(3)})`;
      ambCtx.fill();
    }
  }

  // ============================================================
  // Burst Particles — 熔铸迸射
  // ============================================================
  function fireBurst(x, y) {
    const [r, g, b] = paletteRGB(state.palette);
    for (let i = 0; i < 46; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 7 + 2;
      burstParticles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5,
        life: 1, decay: Math.random() * 0.02 + 0.012,
        r: Math.random() * 3 + 1,
        col: Math.random() > 0.5 ? `rgba(${r},${g},${b},` : 'rgba(255,255,255,'
      });
    }
  }

  function drawBurst() {
    burstCtx.clearRect(0, 0, W, H);
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const p = burstParticles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.06;
      p.life -= p.decay;
      if (p.life <= 0) { burstParticles.splice(i, 1); continue; }
      burstCtx.beginPath();
      burstCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      burstCtx.fillStyle = p.col + p.life.toFixed(3) + ')';
      burstCtx.fill();
    }
  }

  // ============================================================
  // Main Loop
  // ============================================================
  function loop(t) {
    drawAmbient(t);
    drawBurst();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  requestAnimationFrame(tickTilt);

  // ============================================================
  // Mint — 熔铸落章
  // ============================================================
  function mint() {
    badgeTilt.classList.remove('minting');
    void badgeTilt.offsetWidth; // 重启动画
    badgeTilt.classList.add('minting');
    shockwave.classList.remove('fire');
    void shockwave.offsetWidth;
    shockwave.classList.add('fire');

    const r = badgeStage.getBoundingClientRect();
    fireBurst(r.left + r.width / 2, r.top + r.height / 2);

    state.forged += 1;
    hudForged.textContent = state.forged;

    const entry = { id: uid(), ...structuredClone({ label: state.label, sub: state.sub, shape: state.shape, style: state.style, sigil: state.sigil, palette: state.palette }) };
    state.archive.unshift(entry);
    renderArchive();
  }

  // ============================================================
  // Archive — 熔铸档案
  // ============================================================
  function renderArchive() {
    archiveEmpty.style.display = state.archive.length ? 'none' : 'block';
    archiveGrid.querySelectorAll('.archive-card').forEach((el) => el.remove());
    state.archive.forEach((entry, i) => {
      const card = document.createElement('button');
      card.className = 'archive-card';
      card.style.animationDelay = `${Math.min(i, 8) * 45}ms`;
      card.title = '点击恢复此徽章配置';
      card.innerHTML = buildBadgeSVG(entry) +
        `<span class="archive-card-label">${esc((entry.label || 'BADGE').toUpperCase())}</span>`;
      card.addEventListener('click', () => {
        Object.assign(state, { label: entry.label, sub: entry.sub, shape: entry.shape, style: entry.style, sigil: entry.sigil, palette: entry.palette });
        syncControls();
        renderPreview();
        toast('已恢复配置 · ' + (entry.label || 'BADGE').toUpperCase());
      });
      archiveGrid.appendChild(card);
    });
  }

  function syncControls() {
    labelInput.value = state.label === 'PIONEER' ? state.label : state.label;
    subInput.value = state.sub === 'FORGED BY EDEN' ? state.sub : state.sub;
    document.querySelectorAll('#shape-group .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.shape === state.shape));
    document.querySelectorAll('#style-group .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.style === state.style));
    document.querySelectorAll('#sigil-group .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.sigil === state.sigil));
    document.querySelectorAll('#palette-group .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.palette === state.palette));
  }

  // ============================================================
  // Export — 复制 / 下载
  // ============================================================
  function currentSVG() { return buildBadgeSVG(state); }

  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentSVG());
      toast('SVG 已复制到剪贴板');
    } catch {
      toast('复制失败 — 请尝试导出 .svg');
    }
  });

  btnDownload.addEventListener('click', () => {
    const blob = new Blob([currentSVG()], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `badge-forge-${(state.label || 'badge').toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已导出 .svg');
  });

  // ============================================================
  // Title Scramble — 乱码揭示
  // ============================================================
  function scrambleReveal(el, finalText, duration = 1400) {
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@$*+=';
    const start = performance.now();
    (function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * finalText.length);
      let out = '';
      for (let i = 0; i < finalText.length; i++) {
        if (i < settled || finalText[i] === ' ') out += finalText[i];
        else out += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    })(start);
  }

  // ============================================================
  // Events
  // ============================================================
  labelInput.addEventListener('input', () => { state.label = labelInput.value; renderPreview(); });
  subInput.addEventListener('input', () => { state.sub = subInput.value; renderPreview(); });

  $('shape-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-shape]');
    if (!btn) return;
    state.shape = btn.dataset.shape;
    syncControls(); renderPreview();
  });
  $('style-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-style]');
    if (!btn) return;
    state.style = btn.dataset.style;
    syncControls(); renderPreview();
  });
  $('sigil-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sigil]');
    if (!btn) return;
    state.sigil = btn.dataset.sigil;
    syncControls(); renderPreview();
  });
  $('palette-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-palette]');
    if (!btn) return;
    state.palette = btn.dataset.palette;
    syncControls(); renderPreview();
  });

  btnMint.addEventListener('click', mint);

  badgeStage.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    mint();
  });

  btnClear.addEventListener('click', () => {
    state.archive = [];
    renderArchive();
    toast('档案已清空');
  });

  // ============================================================
  // Init
  // ============================================================
  renderPreview();
  scrambleReveal(titleEl, 'BADGE FORGE');

})();
