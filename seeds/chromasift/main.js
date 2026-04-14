/**
 * ChromaSift — Color Particle Sifting System
 * Maintainer: EDEN
 */

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────
  const state = {
    hueStart: 0,
    hueEnd: 180,
    saturation: 75,
    lightness: 55,
    stops: 2,
    flowSpeed: 4,
    gradientAngle: 135,
    locked: false,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    particles: [],
    animationId: null,
    time: 0,
    savedGradients: [],
    dragTrail: []
  };

  // ─── DOM refs ─────────────────────────────────────────────────
  const canvas = document.getElementById('gradientCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');

  const elHueStart      = document.getElementById('hueStart');
  const elHueEnd        = document.getElementById('hueEnd');
  const elHueStartVal   = document.getElementById('hueStartVal');
  const elHueEndVal     = document.getElementById('hueEndVal');
  const elSaturation    = document.getElementById('saturation');
  const elSaturationVal = document.getElementById('saturationVal');
  const elLightness     = document.getElementById('lightness');
  const elLightnessVal  = document.getElementById('lightnessVal');
  const elFlowSpeed     = document.getElementById('flowSpeed');
  const elFlowSpeedVal  = document.getElementById('flowSpeedVal');
  const elGradientAngle = document.getElementById('gradientAngle');
  const elAngleVal      = document.getElementById('gradientAngleVal');
  const elStopBtns      = document.querySelectorAll('.stop-btn');
  const elRandomizeBtn  = document.getElementById('randomizeBtn');
  const elLockBtn       = document.getElementById('lockBtn');
  const elTogglePanel   = document.getElementById('togglePanel');
  const elControlPanel  = document.getElementById('controlPanel');
  const elColorBar      = document.getElementById('colorBar');
  const elColorPreview  = document.getElementById('colorPreview');
  const elHslDisplay    = document.getElementById('hslDisplay');
  const elHexDisplay    = document.getElementById('hexDisplay');
  const elShowSavedBtn  = document.getElementById('showSavedBtn');
  const elSavedPanel    = document.getElementById('savedPanel');
  const elSavedList     = document.getElementById('savedList');
  const elCloseSaved    = document.getElementById('closeSaved');
  const elCodeModal     = document.getElementById('codeModal');
  const elCodeOutput    = document.getElementById('codeOutput');
  const elCloseModal    = document.getElementById('closeModal');
  const elCopyBtn       = document.getElementById('copyBtn');
  const elToast         = document.getElementById('toast');
  const elToastMsg      = document.getElementById('toastMsg');

  // ─── Canvas Setup ─────────────────────────────────────────────
  function resizeCanvas() {
    canvas.width  = window.innerWidth  * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);
    initParticles();
  }

  // ─── Particle System ──────────────────────────────────────────
  const PARTICLE_COUNT = 180;

  function initParticles() {
    state.particles = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      state.particles.push(createParticle(Math.random() * w, Math.random() * h));
    }
  }

  function createParticle(x, y) {
    const hue  = lerp(state.hueStart, state.hueEnd, Math.random());
    const sat  = state.saturation + rand(-8, 8);
    const lig  = state.lightness  + rand(-10, 10);
    return {
      x, y,
      baseX: x, baseY: y,
      hue, sat, lig,
      size: rand(2, 5),
      vx: 0, vy: 0,
      phase: Math.random() * Math.PI * 2,
      drift: rand(-0.3, 0.3),
      trail: []
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function hslToHex(h, s, l) {
    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }

  // ─── Particle Update ──────────────────────────────────────────
  function updateParticles() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const speed = state.flowSpeed * 0.4;

    state.particles.forEach(p => {
      // Brownian-ish drift
      p.phase += 0.012;
      const wave = Math.sin(p.phase) * speed * 0.6;
      p.vx += Math.cos(p.phase * 0.7) * 0.08 + wave * 0.05 + p.drift * 0.1;
      p.vy += Math.sin(p.phase * 0.5) * 0.06 + 0.04;

      // Gentle attraction toward base position
      p.vx += (p.baseX - p.x) * 0.002;
      p.vy += (p.baseY - p.y) * 0.002;

      // Drag
      p.vx *= 0.92;
      p.vy *= 0.92;

      // Trail
      if (p.trail.length > 6) p.trail.shift();
      p.trail.push({ x: p.x, y: p.y, hue: p.hue, sat: p.sat, lig: p.lig });

      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges softly
      if (p.x < -20)  { p.x = w + 20; p.baseX = p.x; }
      if (p.x > w + 20){ p.x = -20;   p.baseX = p.x; }
      if (p.y < -20)  { p.y = h + 20; p.baseY = p.y; }
      if (p.y > h + 20){ p.y = -20;   p.baseY = p.y; }

      // Recalculate color from current HSL bounds (sift effect)
      p.hue = lerp(state.hueStart, state.hueEnd, (Math.sin(p.phase * 0.3) + 1) / 2);
      p.sat = Math.max(20, Math.min(100, state.saturation + rand(-5, 5)));
      p.lig = Math.max(15, Math.min(85, state.lightness  + rand(-6, 6)));
    });
  }

  // ─── Render ────────────────────────────────────────────────────
  function render() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    state.time += 0.016 * state.flowSpeed;

    // Draw gradient mesh background
    drawGradientMesh(w, h);

    // Draw drag trail
    drawDragTrail();

    // Draw particles
    state.particles.forEach(p => {
      // Trail
      p.trail.forEach((t, i) => {
        const alpha = (i / p.trail.length) * 0.3;
        const [r, g, b] = hslToRgb(t.hue, t.sat, t.lig);
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.size * 0.6 * (i / p.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });

      // Particle body
      const [r, g, b] = hslToRgb(p.hue, p.sat, p.lig);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
      glow.addColorStop(0.4, `rgba(${r},${g},${b},0.3)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
      ctx.fill();
    });

    updateParticles();
    state.animationId = requestAnimationFrame(render);
  }

  function drawGradientMesh(w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const angle = state.gradientAngle * Math.PI / 180;
    const stops = state.stops;
    const colors = [];

    for (let i = 0; i < stops; i++) {
      const t = i / (stops - 1);
      const hue = lerp(state.hueStart, state.hueEnd, t);
      const sat = state.saturation;
      const lig = state.lightness;
      colors.push({ hue, sat, lig, t });
    }

    // Build gradient
    const rad = Math.max(w, h) * 1.4;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);

    colors.forEach((c, i) => {
      const [r, g, b] = hslToRgb(c.hue, c.sat, c.lig);
      grad.addColorStop(c.t, `rgba(${r},${g},${b},0.7)`);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Flowing wave overlay
    const waveCount = 3;
    for (let wi = 0; wi < waveCount; wi++) {
      const waveAngle = angle + (wi - 1) * 0.4;
      const ox = Math.cos(waveAngle) * w * 0.3 * Math.sin(state.time * 0.5 + wi);
      const oy = Math.sin(waveAngle) * h * 0.3 * Math.sin(state.time * 0.5 + wi);
      const wg = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad * 0.7);
      const wHue = lerp(state.hueStart, state.hueEnd, (wi + 1) / (waveCount + 1));
      const [wr, wg_, wb] = hslToRgb(wHue, state.saturation - 10, state.lightness + 15);
      wg.addColorStop(0, `rgba(${wr},${wg_},${wb},0.12)`);
      wg.addColorStop(1, `rgba(${wr},${wg_},${wb},0)`);
      ctx.fillStyle = wg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ─── Drag Trail ───────────────────────────────────────────────
  function drawDragTrail() {
    state.dragTrail.forEach((pt, i) => {
      const alpha = (i / state.dragTrail.length) * 0.5;
      const [r, g, b] = hslToRgb(pt.hue, pt.sat, pt.lig);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
    });
    // Fade trail
    if (state.dragTrail.length > 0) {
      state.dragTrail = state.dragTrail.filter(pt => {
        pt.size *= 0.92;
        pt.alpha = (pt.alpha || 1) * 0.92;
        return pt.alpha > 0.05;
      });
    }
  }

  // ─── Mouse / Touch Interaction ─────────────────────────────────
  function onPointerDown(e) {
    if (state.locked) return;
    state.isDragging = true;
    const pt = getEventPos(e);
    state.lastX = pt.x;
    state.lastY = pt.y;
    addDragPoint(pt.x, pt.y);
  }

  function onPointerMove(e) {
    if (!state.isDragging || state.locked) return;
    const pt = getEventPos(e);
    const dx = pt.x - state.lastX;
    const dy = pt.y - state.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / 8));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const ix = state.lastX + dx * t;
      const iy = state.lastY + dy * t;
      addDragPoint(ix, iy, 5 - t * 3);
    }
    state.lastX = pt.x;
    state.lastY = pt.y;

    // Update color preview from dragged position
    updateColorAtPoint(pt.x, pt.y);
  }

  function onPointerUp() {
    state.isDragging = false;
  }

  function addDragPoint(x, y, size = 5) {
    const hue = lerp(state.hueStart, state.hueEnd, Math.random());
    const sat = state.saturation;
    const lig = state.lightness;
    state.dragTrail.push({ x, y, hue, sat, lig, size, alpha: 1 });
    if (state.dragTrail.length > 40) state.dragTrail.shift();
  }

  function getEventPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function updateColorAtPoint(x, y) {
    // Sample a nearby particle's color
    let nearest = null;
    let minDist = Infinity;
    state.particles.forEach(p => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < minDist) { minDist = d; nearest = p; }
    });
    if (nearest) {
      const hex = hslToHex(nearest.hue, nearest.sat, nearest.lig);
      elColorPreview.style.background = `hsl(${nearest.hue}, ${nearest.sat}%, ${nearest.lig}%)`;
      elHslDisplay.textContent = `hsl(${Math.round(nearest.hue)}, ${Math.round(nearest.sat)}%, ${Math.round(nearest.lig)}%)`;
      elHexDisplay.textContent = hex;
    }
  }

  // ─── Wheel — adjust lightness ─────────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2 : 2;
    state.lightness = Math.max(15, Math.min(85, state.lightness + delta));
    elLightness.value = state.lightness;
    elLightnessVal.textContent = state.lightness + '%';
    // Update overlay gradient to reflect lightness change
    updateOverlayLightness();
  }

  function updateOverlayLightness() {
    const lig = state.lightness;
    overlay.style.background = `
      radial-gradient(ellipse 120% 80% at 20% 10%, hsla(${state.hueStart}, ${state.saturation}%, ${lig}%, 0.2) 0%, transparent 60%),
      radial-gradient(ellipse 80% 120% at 80% 90%, hsla(${lerp(state.hueStart, state.hueEnd, 0.7)}, ${state.saturation}%, ${lig}%, 0.15) 0%, transparent 60%),
      radial-gradient(ellipse 60% 60% at 50% 50%, hsla(${lerp(state.hueStart, state.hueEnd, 0.5)}, ${state.saturation}%, ${lig + 10}%, 0.08) 0%, transparent 70%)
    `;
  }

  // ─── Controls ─────────────────────────────────────────────────
  function bindControls() {
    elHueStart.addEventListener('input', () => {
      state.hueStart = +elHueStart.value;
      elHueStartVal.textContent = state.hueStart + '°';
      if (state.hueStart > state.hueEnd) {
        state.hueEnd = state.hueStart;
        elHueEnd.value = state.hueEnd;
        elHueEndVal.textContent = state.hueEnd + '°';
      }
      updateSliderTrack();
    });

    elHueEnd.addEventListener('input', () => {
      state.hueEnd = +elHueEnd.value;
      elHueEndVal.textContent = state.hueEnd + '°';
      if (state.hueEnd < state.hueStart) {
        state.hueStart = state.hueEnd;
        elHueStart.value = state.hueStart;
        elHueStartVal.textContent = state.hueStart + '°';
      }
      updateSliderTrack();
    });

    elSaturation.addEventListener('input', () => {
      state.saturation = +elSaturation.value;
      elSaturationVal.textContent = state.saturation + '%';
      updateSliderTrack();
    });

    elLightness.addEventListener('input', () => {
      state.lightness = +elLightness.value;
      elLightnessVal.textContent = state.lightness + '%';
      updateOverlayLightness();
    });

    elFlowSpeed.addEventListener('input', () => {
      state.flowSpeed = +elFlowSpeed.value;
      elFlowSpeedVal.textContent = state.flowSpeed;
    });

    elGradientAngle.addEventListener('input', () => {
      state.gradientAngle = +elGradientAngle.value;
      elAngleVal.textContent = state.gradientAngle + '°';
    });

    elStopBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elStopBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.stops = +btn.dataset.stops;
      });
    });

    elRandomizeBtn.addEventListener('click', randomize);
    elLockBtn.addEventListener('click', toggleLock);
    elTogglePanel.addEventListener('click', () => {
      elControlPanel.classList.toggle('collapsed');
    });

    elColorBar.addEventListener('click', openCodeModal);

    elShowSavedBtn.addEventListener('click', () => {
      elSavedPanel.classList.toggle('hidden');
      elShowSavedBtn.classList.toggle('hidden', !elSavedPanel.classList.contains('hidden'));
    });

    elCloseSaved.addEventListener('click', () => {
      elSavedPanel.classList.add('hidden');
      elShowSavedBtn.classList.remove('hidden');
    });

    elCloseModal.addEventListener('click', () => {
      elCodeModal.classList.add('hidden');
    });

    elCodeModal.querySelector('.modal-backdrop').addEventListener('click', () => {
      elCodeModal.classList.add('hidden');
    });

    elCopyBtn.addEventListener('click', copyCode);

    // Save gradient on double-click of color bar
    elColorBar.addEventListener('dblclick', saveGradient);
  }

  function updateSliderTrack() {
    // Hue sliders have a gradient track set via CSS, no JS update needed
  }

  function randomize() {
    state.hueStart = Math.floor(Math.random() * 360);
    let end = state.hueStart + Math.floor(Math.random() * 180) + 30;
    if (end > 360) end -= 360;
    state.hueEnd = end;

    state.saturation = Math.floor(Math.random() * 60) + 30;
    state.lightness  = Math.floor(Math.random() * 50) + 25;
    state.stops      = Math.floor(Math.random() * 4) + 2;
    state.flowSpeed  = Math.floor(Math.random() * 8) + 2;
    state.gradientAngle = Math.floor(Math.random() * 360);

    // Update DOM
    elHueStart.value = state.hueStart;
    elHueEnd.value   = state.hueEnd;
    elHueStartVal.textContent = state.hueStart + '°';
    elHueEndVal.textContent   = state.hueEnd + '°';

    elSaturation.value = state.saturation;
    elSaturationVal.textContent = state.saturation + '%';

    elLightness.value = state.lightness;
    elLightnessVal.textContent = state.lightness + '%';

    elFlowSpeed.value = state.flowSpeed;
    elFlowSpeedVal.textContent = state.flowSpeed;

    elGradientAngle.value = state.gradientAngle;
    elAngleVal.textContent = state.gradientAngle + '°';

    elStopBtns.forEach(b => {
      b.classList.toggle('active', +b.dataset.stops === state.stops);
    });

    updateOverlayLightness();
    showToast('Colors randomized ✦');
  }

  function toggleLock() {
    state.locked = !state.locked;
    const btn = elLockBtn;
    if (state.locked) {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Unlock`;
      btn.classList.add('primary');
      btn.classList.remove('secondary');
      showToast('Canvas locked');
    } else {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Lock`;
      btn.classList.remove('primary');
      btn.classList.add('secondary');
      showToast('Canvas unlocked');
    }
  }

  // ─── Code Export ─────────────────────────────────────────────
  function openCodeModal() {
    const code = generateGradientCSS();
    elCodeOutput.textContent = code;
    elCodeModal.classList.remove('hidden');
  }

  function generateGradientCSS() {
    const angle = state.gradientAngle;
    const stops = state.stops;
    const colors = [];
    for (let i = 0; i < stops; i++) {
      const t = i / (stops - 1);
      const hue = lerp(state.hueStart, state.hueEnd, t);
      const hex = hslToHex(hue, state.saturation, state.lightness);
      colors.push(`${hex} ${Math.round(t * 100)}%`);
    }
    const gradientStr = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    return `.gradient-bg {\n  background: ${gradientStr};\n  background-attachment: fixed;\n}\n\n/* HSL version */\n.gradient-bg-hsl {\n  background: linear-gradient(\n    ${angle}deg,\n    ${colors.map((_, i) => {
      const t = i / (stops - 1);
      const hue = lerp(state.hueStart, state.hueEnd, t);
      return `hsl(${Math.round(hue)}, ${state.saturation}%, ${state.lightness}%)`;
    }).join(',\n    ')}\n  );\n  background-attachment: fixed;\n}`;
  }

  function copyCode() {
    const code = elCodeOutput.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        showToast('Code copied to clipboard ✓');
      }).catch(() => {
        fallbackCopy(code);
      });
    } else {
      fallbackCopy(code);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Code copied to clipboard ✓');
  }

  // ─── Save Gradients ────────────────────────────────────────────
  function saveGradient() {
    const gradient = {
      hueStart: state.hueStart,
      hueEnd: state.hueEnd,
      saturation: state.saturation,
      lightness: state.lightness,
      stops: state.stops,
      gradientAngle: state.gradientAngle,
      timestamp: Date.now()
    };
    state.savedGradients.push(gradient);
    if (state.savedGradients.length > 12) state.savedGradients.shift();
    renderSavedList();
    showToast('Gradient saved ✦');
  }

  function renderSavedList() {
    if (state.savedGradients.length === 0) {
      elSavedList.innerHTML = '<div class="saved-empty">No saved gradients yet.<br>Double-click the color bar to save.</div>';
      return;
    }
    elSavedList.innerHTML = state.savedGradients.map((g, i) => {
      const colors = [];
      for (let j = 0; j < g.stops; j++) {
        const t = j / (g.stops - 1);
        const hue = lerp(g.hueStart, g.hueEnd, t);
        colors.push(hslToHex(hue, g.saturation, g.lightness));
      }
      const gradientStr = `linear-gradient(${g.gradientAngle}deg, ${colors.join(', ')})`;
      const firstHex = colors[0];
      return `<div class="saved-item" data-index="${i}">
        <div class="saved-swatch" style="background: ${gradientStr}"></div>
        <div class="saved-info">
          <span class="mono">${firstHex}</span>
        </div>
        <button class="saved-delete" data-index="${i}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
    }).join('');

    elSavedList.querySelectorAll('.saved-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.saved-delete')) return;
        loadGradient(+item.dataset.index);
      });
    });

    elSavedList.querySelectorAll('.saved-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteGradient(+btn.dataset.index);
      });
    });
  }

  function loadGradient(index) {
    const g = state.savedGradients[index];
    if (!g) return;
    state.hueStart = g.hueStart;
    state.hueEnd = g.hueEnd;
    state.saturation = g.saturation;
    state.lightness = g.lightness;
    state.stops = g.stops;
    state.gradientAngle = g.gradientAngle;

    elHueStart.value = state.hueStart;
    elHueEnd.value = state.hueEnd;
    elHueStartVal.textContent = state.hueStart + '°';
    elHueEndVal.textContent = state.hueEnd + '°';
    elSaturation.value = state.saturation;
    elSaturationVal.textContent = state.saturation + '%';
    elLightness.value = state.lightness;
    elLightnessVal.textContent = state.lightness + '%';
    elFlowSpeed.value = state.flowSpeed;
    elFlowSpeedVal.textContent = state.flowSpeed;
    elGradientAngle.value = state.gradientAngle;
    elAngleVal.textContent = state.gradientAngle + '°';
    elStopBtns.forEach(b => b.classList.toggle('active', +b.dataset.stops === state.stops));
    updateOverlayLightness();
    showToast('Gradient loaded ✓');
  }

  function deleteGradient(index) {
    state.savedGradients.splice(index, 1);
    renderSavedList();
    showToast('Gradient removed');
  }

  // ─── Toast ────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    elToastMsg.textContent = msg;
    elToast.classList.remove('hidden');
    elToast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elToast.classList.remove('visible');
      setTimeout(() => elToast.classList.add('hidden'), 400);
    }, 2200);
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init() {
    resizeCanvas();
    bindControls();

    // Pointer events
    canvas.addEventListener('mousedown',  onPointerDown);
    canvas.addEventListener('mousemove',  onPointerMove);
    canvas.addEventListener('mouseup',    onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    canvas.addEventListener('touchmove',  onPointerMove, { passive: true });
    canvas.addEventListener('touchend',   onPointerUp);

    // Wheel
    window.addEventListener('wheel', onWheel, { passive: false });

    // Resize
    window.addEventListener('resize', () => {
      resizeCanvas();
    });

    // Start render loop
    render();

    // Initial overlay
    updateOverlayLightness();

    // Keyboard shortcut: R = randomize, L = lock, C = copy code
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'r' || e.key === 'R') randomize();
      if (e.key === 'l' || e.key === 'L') toggleLock();
      if (e.key === 'c' || e.key === 'C') openCodeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
