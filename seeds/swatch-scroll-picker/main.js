/**
 * Swatch Scroll Picker — 色卡卷轴拣选器
 * 沉浸式色卡卷轴拣选体验：非线性中心聚焦、弹簧-惯性物理、
 * 速度歪斜畸变、选中色实时驱动全局主题与流体渐变背景。
 */
(function () {
  'use strict';

  // === Config =============================================================

  const COLLECTIONS = {
    aurora: {
      label: 'Aurora Collection',
      swatches: [
        { name: 'Glacier', hex: '#9FD8E8' },
        { name: 'Signal Blue', hex: '#3D7BFF' },
        { name: 'Deep Fjord', hex: '#2E4A7D' },
        { name: 'Neon Cyan', hex: '#37E6D5' },
        { name: 'Mint Veil', hex: '#9BE8C0' },
        { name: 'Aurora Teal', hex: '#1FA89A' },
        { name: 'Pale Sky', hex: '#C7D9F2' },
        { name: 'Ultraviolet', hex: '#7B6CF6' },
        { name: 'Twilight', hex: '#4A3E8C' },
        { name: 'Arctic Dawn', hex: '#E8F2F4' },
        { name: 'Steel Mist', hex: '#6E7F94' },
        { name: 'Deep Space', hex: '#1B2138' }
      ]
    },
    ember: {
      label: 'Ember Collection',
      swatches: [
        { name: 'Molten', hex: '#FF5A2D' },
        { name: 'Ember', hex: '#E8452A' },
        { name: 'Terracotta', hex: '#C4623D' },
        { name: 'Amber Glow', hex: '#FFA94D' },
        { name: 'Honey', hex: '#F2C14E' },
        { name: 'Sunset Coral', hex: '#FF7F6B' },
        { name: 'Chili', hex: '#B33522' },
        { name: 'Rosewood', hex: '#8C3B2E' },
        { name: 'Desert Dune', hex: '#D9A47A' },
        { name: 'Smoked Ash', hex: '#6B544A' },
        { name: 'Saffron', hex: '#F49D37' },
        { name: 'Wine Dark', hex: '#5C1F2B' }
      ]
    },
    botanic: {
      label: 'Botanic Collection',
      swatches: [
        { name: 'Fern', hex: '#5B9A62' },
        { name: 'Deep Forest', hex: '#2E5636' },
        { name: 'Matcha', hex: '#A8C686' },
        { name: 'Jade Leaf', hex: '#3FA87A' },
        { name: 'Moss Stone', hex: '#70815C' },
        { name: 'Bamboo Shoot', hex: '#D4DDBA' },
        { name: 'Eucalyptus', hex: '#8FB8A8' },
        { name: 'Pine Needle', hex: '#1F4028' },
        { name: 'Olive Grove', hex: '#7D8A4E' },
        { name: 'Sage Mist', hex: '#BCC9B4' },
        { name: 'Emerald Dew', hex: '#2FBF8F' },
        { name: 'Bark', hex: '#5A4634' }
      ]
    },
    nocturne: {
      label: 'Nocturne Collection',
      swatches: [
        { name: 'Nebula', hex: '#8A7CFF' },
        { name: 'Midnight', hex: '#252A4A' },
        { name: 'Orchid Haze', hex: '#C58BD8' },
        { name: 'Plasma Pink', hex: '#F26FB1' },
        { name: 'Violet Ink', hex: '#4A3A78' },
        { name: 'Cosmic Dust', hex: '#B8AEE0' },
        { name: 'Deep Magenta', hex: '#93275E' },
        { name: 'Lavender Moon', hex: '#DCD2F0' },
        { name: 'Indigo Tide', hex: '#35418F' },
        { name: 'Asteroid', hex: '#63606E' },
        { name: 'Electric Iris', hex: '#6C5CE7' },
        { name: 'Void Bloom', hex: '#3A1F52' }
      ]
    }
  };

  const COLLECTION_ORDER = ['aurora', 'ember', 'botanic', 'nocturne'];

  // === Utilities ==========================================================

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // DOM helpers
  const $ = (id) => document.getElementById(id);

  // === DOM Elements =======================================================

  const bgCanvas = $('bg-canvas');
  const carousel = $('carousel');
  const track = $('swatch-track');
  const previewPanel = $('preview-panel');
  const previewDisc = $('preview-disc');
  const previewGlow = $('preview-glow');
  const previewName = $('preview-name');
  const previewHex = $('preview-hex');
  const toneHsl = $('tone-hsl');
  const toneRgb = $('tone-rgb');
  const collectionLabel = $('collection-label');
  const statusIndex = $('status-index');
  const statusVelocity = $('status-velocity');
  const statusMode = $('status-mode');
  const themeDot = $('theme-dot');
  const toastLayer = $('toast-layer');
  const rippleLayer = $('ripple-layer');

  // === State ==============================================================

  const state = {
    collectionKey: 'aurora',
    swatches: [],
    cards: [],
    spacing: 136,
    x: 0,            // track offset (px), 0 = first card centered
    v: 0,            // velocity (px / frame)
    targetX: 0,
    mode: 'snap',    // 'drag' | 'glide' | 'snap'
    index: 0,
    entrance: 1,     // 0 → 1 rebuild reveal progress
    accent: { h: 205, s: 90, l: 62 },  // smoothly interpolated
    accentTarget: { h: 205, s: 90, l: 62 }
  };

  // === Background (fluid mesh gradient) ===================================

  const bgCtx = bgCanvas.getContext('2d');
  let bgW = 0;
  let bgH = 0;

  const blobs = Array.from({ length: 6 }, (_, i) => ({
    baseR: 0.34,
    ox: Math.random() * Math.PI * 2,
    oy: Math.random() * Math.PI * 2,
    sx: 0.08 + Math.random() * 0.06,
    sy: 0.07 + Math.random() * 0.06,
    hueShift: [-24, 12, 38, -48, 60, 84][i],
    alpha: 0.34
  }));

  function resizeBackground() {
    bgW = bgCanvas.width = window.innerWidth;
    bgH = bgCanvas.height = window.innerHeight;
  }

  function drawBackground(time) {
    const t = time * 0.001;
    const { accent } = state;
    const ctx = bgCtx;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, bgW, bgH);

    const minDim = Math.min(bgW, bgH);
    ctx.globalCompositeOperation = 'screen';
    for (const b of blobs) {
      const cx = bgW * (0.5 + 0.42 * Math.sin(t * b.sx + b.ox));
      const cy = bgH * (0.5 + 0.42 * Math.cos(t * b.sy + b.oy));
      const r = minDim * (b.baseR + 0.1 * Math.sin(t * 0.18 + b.ox));
      const hue = (accent.h + b.hueShift + 360) % 360;
      const sat = clamp(accent.s * 0.9, 30, 95);
      const lig = clamp(accent.l * 0.62, 14, 38);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lig}%, ${b.alpha})`);
      grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // === Track Rendering ====================================================

  function buildTrack() {
    const swatches = COLLECTIONS[state.collectionKey].swatches;
    state.swatches = swatches;
    track.innerHTML = '';

    state.cards = swatches.map((sw, i) => {
      const card = document.createElement('div');
      card.className = 'swatch-card';
      card.dataset.index = i;

      const chip = document.createElement('div');
      chip.className = 'swatch-chip';
      chip.style.background = sw.hex;
      chip.style.setProperty('--swatch-glow', sw.hex + '59');

      const name = document.createElement('span');
      name.className = 'swatch-name';
      name.textContent = sw.name;

      const hex = document.createElement('span');
      hex.className = 'swatch-hex';
      hex.textContent = sw.hex.toUpperCase();

      card.appendChild(chip);
      card.appendChild(name);
      card.appendChild(hex);
      card.addEventListener('click', (ev) => {
        if (state.mode === 'drag' && Math.abs(state.v) > 0.5) return;
        if (state.index !== i) {
          goToIndex(i);
        } else {
          copyCurrentHex(ev.clientX, ev.clientY);
        }
      });
      track.appendChild(card);
      return card;
    });

    measureSpacing();
    state.index = clamp(state.index, 0, swatches.length - 1);
    state.x = -state.index * state.spacing;
    state.targetX = state.x;
    state.v = 0;
    state.mode = 'snap';
    state.entrance = 0;
  }

  function measureSpacing() {
    const cssGap = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--swatch-gap')
    ) || 20;
    const cardW = state.cards[0]?.offsetWidth || 116;
    state.spacing = cardW + cssGap;
  }

  // === Physics Loop =======================================================

  let lastFrame = performance.now();

  function tick(now) {
    const dt = clamp((now - lastFrame) / 16.67, 0.25, 2.5);
    lastFrame = now;

    if (state.entrance < 1) {
      state.entrance = clamp(state.entrance + 0.028 * dt, 0, 1);
    }

    stepPhysics(dt);
    layoutCards();
    interpAccent(dt);
    drawBackground(now);
    updateHud();

    requestAnimationFrame(tick);
  }

  function stepPhysics(dt) {
    if (state.mode === 'drag') return;

    const minX = -(state.swatches.length - 1) * state.spacing;
    const maxX = 0;

    if (state.mode === 'glide') {
      state.x += state.v * dt;
      state.v *= Math.pow(0.93, dt);
      if (Math.abs(state.v) < 0.6 * dt) {
        state.mode = 'snap';
        state.targetX = clamp(Math.round(state.x / state.spacing) * state.spacing, minX, maxX);
      }
    } else {
      // Spring-damped snap with a hint of overshoot
      state.v += (state.targetX - state.x) * 0.09 * dt;
      state.v *= Math.pow(0.8, dt);
      state.x += state.v * dt;
      if (Math.abs(state.targetX - state.x) < 0.05 && Math.abs(state.v) < 0.05) {
        state.x = state.targetX;
        state.v = 0;
      }
    }

    // Rubber-band clamp at the edges
    if (state.x > maxX) {
      state.x = maxX + (state.x - maxX) * Math.pow(0.82, dt);
      if (state.mode === 'glide') state.v *= Math.pow(0.6, dt);
    } else if (state.x < minX) {
      state.x = minX + (state.x - minX) * Math.pow(0.82, dt);
      if (state.mode === 'glide') state.v *= Math.pow(0.6, dt);
    }

    updateSelectedIndex();
  }

  function updateSelectedIndex() {
    const idx = clamp(Math.round(-state.x / state.spacing), 0, state.swatches.length - 1);
    if (idx !== state.index) {
      state.index = idx;
      onSelectionChange();
    }
  }

  // Non-linear falloff: distance from viewport center → scale / opacity / lift
  function layoutCards() {
    const W = carousel.clientWidth;
    const center = W / 2;
    const radius = state.spacing * 2.6;
    const skew = clamp(state.v * 0.55, -7, 7);
    const entrance = state.entrance;
    const stagger = 1 / state.cards.length;

    state.cards.forEach((card, i) => {
      const cardCenter = i * state.spacing + state.spacing / 2 + state.x;
      const d = cardCenter - center;
      const ad = Math.abs(d);
      const t = clamp(1 - ad / radius, 0, 1);
      const e = Math.pow(t, 1.7);
      const reveal = clamp(entrance / Math.max(stagger, 1e-4) - i * 1, 0, 1);
      const rv = Math.pow(clamp((entrance - i * stagger * 0.6) / (1 - i * stagger * 0.6 || 1), 0, 1), 1.5);

      const scale = (0.62 + 0.38 * e) * (0.4 + 0.6 * rv);
      const opacity = (0.22 + 0.78 * Math.pow(t, 1.25)) * rv;
      const lift = -e * 18;
      const rotate = clamp(-d * 0.02, -10, 10);
      const blur = (1 - t) * 2.4;
      const isActive = ad < state.spacing / 2;

      card.style.transform =
        `translateX(${cardCenter - state.spacing / 2}px) translateY(calc(-50% + ${lift}px)) ` +
        `rotate(${rotate}deg) skewX(${skew * (0.4 + 0.6 * e)}deg) scale(${scale})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : 'none';
      card.style.zIndex = String(10 + Math.round(e * 90));
      card.classList.toggle('is-active', isActive && reveal > 0.5);
    });
  }

  // === Accent Theme =======================================================

  function interpAccent(dt) {
    const { accent, accentTarget } = state;
    const k = clamp(0.08 * dt, 0, 1);
    // Hue interpolation with wrap-around
    let dh = accentTarget.h - accent.h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    accent.h = (accent.h + dh * k + 360) % 360;
    accent.s = lerp(accent.s, accentTarget.s, k);
    accent.l = lerp(accent.l, accentTarget.l, k);
    applyAccentVars();
  }

  function applyAccentVars() {
    const { h, s, l } = state.accent;
    const root = document.documentElement.style;
    root.setProperty('--accent-h', h.toFixed(1));
    root.setProperty('--accent-s', s.toFixed(1) + '%');
    root.setProperty('--accent-l', l.toFixed(1) + '%');
  }

  function onSelectionChange() {
    const sw = state.swatches[state.index];
    if (!sw) return;
    const hsl = hexToHsl(sw.hex);
    const rgb = hexToRgb(sw.hex);

    state.accentTarget = hsl;
    previewDisc.style.background = sw.hex;
    previewName.textContent = sw.name;
    previewHex.textContent = sw.hex.toUpperCase();
    toneHsl.textContent = `H ${hsl.h.toFixed(0)} · S ${hsl.s.toFixed(0)} · L ${hsl.l.toFixed(0)}`;
    toneRgb.textContent = `R ${rgb.r} · G ${rgb.g} · B ${rgb.b}`;
  }

  // === HUD ================================================================

  function updateHud() {
    statusIndex.textContent =
      String(state.index + 1).padStart(2, '0') + ' / ' + String(state.swatches.length).padStart(2, '0');
    statusVelocity.textContent = 'VEL ' + Math.abs(state.v).toFixed(1);
  }

  // === Navigation =========================================================

  function goToIndex(i, animate) {
    const n = state.swatches.length;
    const idx = ((i % n) + n) % n;
    state.targetX = -idx * state.spacing;
    if (!animate) {
      state.x = state.targetX;
      state.v = 0;
      updateSelectedIndex();
    } else {
      state.v = clamp(state.v, -30, 30);
      state.mode = 'snap';
    }
  }

  function shuffle() {
    let next;
    do {
      next = Math.floor(Math.random() * state.swatches.length);
    } while (state.swatches.length > 1 && next === state.index);
    goToIndex(next, true);
  }

  function setCollection(key) {
    if (!COLLECTIONS[key] || key === state.collectionKey) return;
    state.collectionKey = key;
    document.body.dataset.collectionTheme = key;
    collectionLabel.textContent = COLLECTIONS[key].label;
    statusMode.textContent = COLLECTIONS[key].label;
    themeDot.style.background = COLLECTIONS[key].swatches[1].hex;
    document.querySelectorAll('.mode-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.collection === key);
    });
    buildTrack();
    onSelectionChange();
  }

  // === Copy & Feedback ====================================================

  async function copyCurrentHex(x, y) {
    const sw = state.swatches[state.index];
    if (!sw) return;
    const value = sw.hex.toUpperCase();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      ta.remove();
    }
    showToast(`${value} copied`, sw.hex);
    spawnRipple(x, y, sw.hex);
    previewDisc.classList.add('copied');
    setTimeout(() => previewDisc.classList.remove('copied'), 700);
  }

  function showToast(text, color) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.setProperty('--toast-color', color);
    toast.innerHTML = '<span class="toast-dot"></span><span></span>';
    toast.lastElementChild.textContent = text;
    toastLayer.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  }

  function spawnRipple(x, y, color) {
    const ring = document.createElement('div');
    ring.className = 'ripple-ring';
    const size = 110;
    ring.style.width = size + 'px';
    ring.style.height = size + 'px';
    ring.style.left = (x - size / 2) + 'px';
    ring.style.top = (y - size / 2) + 'px';
    if (color) ring.style.setProperty('--ripple-color', color);
    rippleLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 1200);
  }

  // === Pointer / Wheel / Keyboard =========================================

  let dragPointer = null;
  let dragLastX = 0;
  let dragStartX = 0;
  let dragMoved = false;

  carousel.addEventListener('pointerdown', (ev) => {
    dragPointer = ev.pointerId;
    dragLastX = dragStartX = ev.clientX;
    dragMoved = false;
    state.mode = 'drag';
    state.v = 0;
    carousel.classList.add('dragging');
    carousel.setPointerCapture(ev.pointerId);
  });

  carousel.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== dragPointer || state.mode !== 'drag') return;
    const dx = ev.clientX - dragLastX;
    dragLastX = ev.clientX;
    if (Math.abs(ev.clientX - dragStartX) > 4) dragMoved = true;
    state.x += dx;
    state.v = state.v * 0.72 + dx * 0.28; // smoothed velocity estimate
  });

  function endDrag(ev) {
    if (ev.pointerId !== dragPointer) return;
    dragPointer = null;
    carousel.classList.remove('dragging');
    state.mode = 'glide';
    if (!dragMoved) {
      // Treat as a tap: settle back to current index
      state.v = 0;
      state.targetX = -state.index * state.spacing;
      state.mode = 'snap';
    }
  }

  carousel.addEventListener('pointerup', endDrag);
  carousel.addEventListener('pointercancel', endDrag);

  let wheelCooldown = 0;
  carousel.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const now = performance.now();
    if (now - wheelCooldown < 90) return;
    const dir = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    if (Math.abs(dir) < 2) return;
    wheelCooldown = now;
    goToIndex(state.index + (dir > 0 ? 1 : -1), true);
  }, { passive: false });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') { ev.preventDefault(); goToIndex(state.index + 1, true); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); goToIndex(state.index - 1, true); }
    else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      copyCurrentHex(window.innerWidth / 2, window.innerHeight / 2);
    }
  });

  // === UI Bindings ========================================================

  $('btn-prev').addEventListener('click', () => goToIndex(state.index - 1, true));
  $('btn-next').addEventListener('click', () => goToIndex(state.index + 1, true));
  $('btn-shuffle').addEventListener('click', shuffle);
  $('btn-copy').addEventListener('click', (ev) => {
    ev.stopPropagation();
    copyCurrentHex(ev.clientX, ev.clientY);
  });
  previewPanel.addEventListener('click', (ev) => copyCurrentHex(ev.clientX, ev.clientY));

  document.querySelectorAll('.mode-tab').forEach((btn) => {
    btn.addEventListener('click', () => setCollection(btn.dataset.collection));
  });

  $('theme-btn').addEventListener('click', () => {
    const cur = COLLECTION_ORDER.indexOf(state.collectionKey);
    setCollection(COLLECTION_ORDER[(cur + 1) % COLLECTION_ORDER.length]);
  });

  window.addEventListener('resize', () => {
    resizeBackground();
    measureSpacing();
    state.targetX = -state.index * state.spacing;
    if (state.mode === 'snap') state.x = state.targetX;
  });

  // === Boot ===============================================================

  resizeBackground();
  buildTrack();
  onSelectionChange();
  applyAccentVars();
  requestAnimationFrame(tick);
})();
