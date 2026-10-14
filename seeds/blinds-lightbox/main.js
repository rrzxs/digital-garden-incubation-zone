/* ============================================================
   Blinds Lightbox — 百叶窗灯箱
   Images revealed/hidden through spring-staggered venetian slats
   ============================================================ */
(() => {
  'use strict';

  // === Config ===
  const THEMES = ['aurora', 'ember', 'jade', 'violet'];
  const SLAT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const SLAT_DURATION = 900; // ms, must match CSS .slat transition

  const IMAGES = [
    { title: 'Aurora Field',      seed: 'blinds-aurora' },
    { title: 'Ember Dunes',       seed: 'blinds-ember' },
    { title: 'Jade Coastline',    seed: 'blinds-jade' },
    { title: 'Violet Canopy',     seed: 'blinds-violet' },
    { title: 'Nocturne Harbor',   seed: 'blinds-nocturne' },
    { title: 'Solar Orchard',     seed: 'blinds-solar' },
  ];
  const imageUrl = (seed) => `https://picsum.photos/seed/${seed}/1200/800.jpg`;

  // === DOM Elements ===
  const stage = document.getElementById('stage');
  const slatsEl = document.getElementById('slats');
  const leaksEl = document.getElementById('leaks');
  const dustCanvas = document.getElementById('dust-canvas');
  const railEl = document.getElementById('rail');
  const captionIndex = document.getElementById('caption-index');
  const captionTitle = document.getElementById('caption-title');
  const navPrev = document.getElementById('nav-prev');
  const navNext = document.getElementById('nav-next');
  const hudAperture = document.getElementById('hud-aperture');
  const hudSlats = document.getElementById('hud-slats');
  const hudStagger = document.getElementById('hud-stagger');
  const modeLabel = document.getElementById('mode-label');
  const themeBtn = document.getElementById('theme-btn');
  const apertureRange = document.getElementById('aperture-range');
  const apertureValue = document.getElementById('aperture-value');
  const slatsRange = document.getElementById('slats-range');
  const slatsValue = document.getElementById('slats-value');
  const staggerSeg = document.getElementById('stagger-seg');
  const breatheBtn = document.getElementById('breathe-btn');
  const shutterBtn = document.getElementById('shutter-btn');

  // === State ===
  const state = {
    index: 0,
    aperture: 1,          // 0..1 open ratio
    slatCount: 14,
    stagger: 'cascade',   // cascade | wave | random
    breathe: false,
    shuttered: false,     // fully closed via shutter/space
    transitioning: false,
    themeIdx: 0,
  };

  // === Utilities ===
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pad2 = (n) => String(n + 1).padStart(2, '0');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** stagger delay (ms) for slat i of n, by mode */
  function staggerDelay(i, n) {
    const step = 55;
    if (state.stagger === 'cascade') return i * step;
    if (state.stagger === 'wave') return Math.sin((i / (n - 1)) * Math.PI * 2 - Math.PI / 2) * step * n * 0.25 + (n * step * 0.25);
    return Math.random() * step * n * 0.8;
  }

  // === Slats Engine ===
  function buildSlats() {
    const img = IMAGES[state.index];
    const url = imageUrl(img.seed);
    slatsEl.innerHTML = '';
    leaksEl.innerHTML = '';
    const stageH = stage.clientHeight || 500;
    for (let i = 0; i < state.slatCount; i++) {
      const slat = document.createElement('div');
      slat.className = 'slat';
      // slice the image: each slat's background covers the whole stage,
      // clipped by its own box via background-size 100% stageH-equivalent
      slat.style.backgroundImage = `url(${url})`;
      slat.style.backgroundSize = `100% ${stageH}px`;
      slat.style.backgroundPosition = `center ${-(i * stageH / state.slatCount)}px`;
      slatsEl.appendChild(slat);

      const leak = document.createElement('div');
      leak.className = 'leak';
      leak.style.top = `calc(${((i + 1) / state.slatCount) * 100}% - 1px)`;
      leaksEl.appendChild(leak);
    }
    applyAperture(true);
  }

  function applyAperture(instant = false) {
    const slats = slatsEl.children;
    const leaks = leaksEl.children;
    const open = state.shuttered ? 0 : state.aperture;
    for (let i = 0; i < slats.length; i++) {
      const s = slats[i];
      if (instant) s.style.transition = 'none';
      const closed = open < 0.14;
      s.classList.toggle('closed', closed);
      if (!closed) s.style.transform = `scaleY(${clamp(open, 0.08, 1)})`;
      s.style.transitionDelay = instant ? '0ms' : `${staggerDelay(i, slats.length)}ms`;
      if (instant) requestAnimationFrame(() => { s.style.transition = ''; });
      const leak = leaks[i];
      if (leak) leak.classList.toggle('lit', !closed && open < 0.85);
    }
    hudAperture.textContent = `${Math.round(open * 100)}%`;
  }

  /** close → swap image → reopen, with non-linear blinds cascade */
  async function transitionTo(nextIndex, direction = 1) {
    if (state.transitioning || nextIndex === state.index) return;
    state.transitioning = true;
    modeLabel.textContent = direction > 0 ? 'slats cascade close → next frame' : 'slats cascade close → prev frame';

    state.shuttered = true;
    applyAperture();
    await sleep(SLAT_DURATION + state.slatCount * 55 * 0.8 + 80);

    state.index = (nextIndex + IMAGES.length) % IMAGES.length;
    state.shuttered = false;
    syncUI();
    buildSlats();
    // force reopen cascade from fully-closed
    for (const s of slatsEl.children) s.classList.add('closed');
    requestAnimationFrame(() => applyAperture());
    await sleep(SLAT_DURATION + 300);

    modeLabel.textContent = 'images breathe through venetian slats';
    state.transitioning = false;
  }

  // === Dust Particles (Tyndall-ish motes drifting in light) ===
  const dust = [];
  function initDust() {
    const ctx = dustCanvas.getContext('2d');
    const resize = () => {
      dustCanvas.width = stage.clientWidth;
      dustCanvas.height = stage.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 46; i++) {
      dust.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0004,
        vy: -0.0002 - Math.random() * 0.0004,
        r: 0.6 + Math.random() * 1.8,
        tw: Math.random() * Math.PI * 2,
      });
    }
    const accent = () => getComputedStyle(document.body).getPropertyValue('--accent').trim();
    let t = 0;
    (function loop() {
      t += 0.016;
      ctx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);
      const col = accent();
      const lit = (state.shuttered ? 0 : state.aperture) > 0.2;
      for (const p of dust) {
        p.x += p.vx + Math.sin(t + p.tw) * 0.0003;
        p.y += p.vy;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
        const alpha = lit ? (0.25 + 0.55 * Math.abs(Math.sin(t * 0.8 + p.tw))) : 0.05;
        ctx.beginPath();
        ctx.arc(p.x * dustCanvas.width, p.y * dustCanvas.height, p.r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = col;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    })();
  }

  // === Breathing Mode ===
  let breatheRAF = null;
  function startBreathe() {
    const t0 = performance.now();
    const cycle = (now) => {
      if (!state.breathe) return;
      const t = (now - t0) / 6000; // 6s slow breath
      state.aperture = 0.5 + 0.5 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
      apertureRange.value = Math.round(state.aperture * 100);
      apertureValue.textContent = `${Math.round(state.aperture * 100)}%`;
      applyAperture(true); // smooth per-frame, no stagger
      breatheRAF = requestAnimationFrame(cycle);
    };
    breatheRAF = requestAnimationFrame(cycle);
  }
  function stopBreathe() {
    if (breatheRAF) cancelAnimationFrame(breatheRAF);
    breatheRAF = null;
  }

  // === UI Sync ===
  function syncUI() {
    captionIndex.textContent = `${pad2(state.index)} / ${pad2(IMAGES.length - 1)}`;
    captionTitle.textContent = IMAGES[state.index].title;
    hudSlats.textContent = String(state.slatCount);
    hudStagger.textContent =
      state.stagger === 'cascade' ? 'CASCADE ↓' :
      state.stagger === 'wave' ? 'WAVE ∿' : 'RANDOM ✦';
    [...railEl.children].forEach((el, i) => el.classList.toggle('active', i === state.index));
  }

  // === Thumbnails ===
  function buildRail() {
    IMAGES.forEach((img, i) => {
      const thumb = document.createElement('button');
      thumb.className = 'thumb';
      thumb.setAttribute('aria-label', img.title);
      thumb.style.backgroundImage = `url(${imageUrl(img.seed)})`;
      thumb.addEventListener('click', () => transitionTo(i, i > state.index ? 1 : -1));
      railEl.appendChild(thumb);
    });
  }

  // === Events ===
  apertureRange.addEventListener('input', () => {
    if (state.breathe) toggleBreathe(false);
    state.aperture = apertureRange.value / 100;
    state.shuttered = false;
    apertureValue.textContent = `${apertureRange.value}%`;
    applyAperture();
  });

  slatsRange.addEventListener('input', () => {
    state.slatCount = +slatsRange.value;
    slatsValue.textContent = slatsRange.value;
    buildSlats();
    syncUI();
  });

  staggerSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.stagger = btn.dataset.mode;
    [...staggerSeg.children].forEach((b) => b.classList.toggle('active', b === btn));
    applyAperture(); // re-flow delays
    syncUI();
  });

  function toggleBreathe(force) {
    state.breathe = typeof force === 'boolean' ? force : !state.breathe;
    breatheBtn.setAttribute('aria-pressed', String(state.breathe));
    breatheBtn.querySelector('.toggle-text').textContent = state.breathe ? 'ON' : 'OFF';
    if (state.breathe) startBreathe(); else stopBreathe();
  }
  breatheBtn.addEventListener('click', () => toggleBreathe());

  shutterBtn.addEventListener('click', () => {
    state.shuttered = !state.shuttered;
    applyAperture();
  });

  navPrev.addEventListener('click', () => transitionTo(state.index - 1, -1));
  navNext.addEventListener('click', () => transitionTo(state.index + 1, 1));

  themeBtn.addEventListener('click', () => {
    state.themeIdx = (state.themeIdx + 1) % THEMES.length;
    document.body.dataset.theme = THEMES[state.themeIdx];
  });

  // Drag on stage = aperture control (non-linear scrub)
  let dragging = false, dragY = 0, dragStartAperture = 1;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.nav-btn')) return;
    dragging = true;
    dragY = e.clientY;
    dragStartAperture = state.shuttered ? 0 : state.aperture;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = (e.clientY - dragY) / (stage.clientHeight * 0.9); // drag down = open
    const open = clamp(dragStartAperture + dy, 0, 1);
    if (state.breathe) toggleBreathe(false);
    state.aperture = open;
    state.shuttered = false;
    apertureRange.value = Math.round(open * 100);
    apertureValue.textContent = `${Math.round(open * 100)}%`;
    applyAperture(true); // direct scrub: no stagger, pure follow
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') transitionTo(state.index + 1, 1);
    else if (e.key === 'ArrowLeft') transitionTo(state.index - 1, -1);
    else if (e.key === ' ') { e.preventDefault(); state.shuttered = !state.shuttered; applyAperture(); }
    else if (e.key.toLowerCase() === 't') themeBtn.click();
    else if (e.key.toLowerCase() === 'b') toggleBreathe();
  });

  // Rebuild slats geometry on resize (background slices depend on stage height)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildSlats, 220);
  });

  // === Boot ===
  function boot() {
    // preload first images to avoid blank slats
    let loaded = 0;
    IMAGES.forEach((img) => {
      const im = new Image();
      im.onload = im.onerror = () => { loaded++; };
      im.src = imageUrl(img.seed);
    });
    buildRail();
    buildSlats();
    syncUI();
    initDust();
    // gentle entrance: start shuttered, bloom open
    state.shuttered = true;
    applyAperture(true);
    setTimeout(() => { state.shuttered = false; applyAperture(); }, 350);
    // silence unused warning for loaded counter
    void loaded;
  }
  boot();
})();
