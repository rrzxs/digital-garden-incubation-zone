(function () {
  'use strict';

  var PI2 = Math.PI * 2;
  var DEG = Math.PI / 180;
  var EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

  var THEMES = ['default', 'aurora', 'ember', 'frost'];
  var currentThemeIdx = 0;

  var MODES = {
    intensity: { label: 'INTENSITY', unit: '%', min: 0, max: 100, color: null },
    frequency: { label: 'FREQUENCY', unit: 'Hz', min: 20, max: 20000, color: null },
    temperature: { label: 'TEMPERATURE', unit: '°C', min: -40, max: 200, color: null },
    velocity: { label: 'VELOCITY', unit: 'm/s', min: 0, max: 340, color: null }
  };

  var currentMode = 'intensity';
  var dialAngle = -Math.PI / 2;
  var targetAngle = -Math.PI / 2;
  var dialValue = 0;
  var targetValue = 0;
  var normalizedValue = 0;
  var isDragging = false;
  var isHovering = false;
  var dragStartAngle = 0;
  var dragStartValue = 0;

  var ripples = [];
  var flowParticles = [];
  var tickPulses = [];

  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var bgCanvas, bgCtx;
  var dialCanvas, dialCtx;
  var dialContainer;
  var dialValueEl, dialUnitEl, dialLabelEl, dialAura;
  var modeLabelEl, statusTextEl, statusModeEl;
  var rippleLayer;

  var bgBlobs = [];
  var bgTime = 0;

  function init() {
    bgCanvas = document.getElementById('bg-canvas');
    bgCtx = bgCanvas.getContext('2d');
    dialCanvas = document.getElementById('dial-canvas');
    dialCtx = dialCanvas.getContext('2d');
    dialContainer = document.querySelector('.dial-container');
    dialValueEl = document.getElementById('dial-value');
    dialUnitEl = document.getElementById('dial-unit');
    dialLabelEl = document.getElementById('dial-label');
    dialAura = document.getElementById('dial-aura');
    modeLabelEl = document.getElementById('mode-label');
    statusTextEl = document.getElementById('status-text');
    statusModeEl = document.getElementById('status-mode');
    rippleLayer = document.getElementById('ripple-layer');

    resizeCanvases();
    initBgBlobs();
    initFlowParticles();
    bindEvents();
    updateModeDisplay();
    requestAnimationFrame(loop);
  }

  function resizeCanvases() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    bgCanvas.width = w * dpr;
    bgCanvas.height = h * dpr;
    bgCanvas.style.width = w + 'px';
    bgCanvas.style.height = h + 'px';
    bgCtx.scale(dpr, dpr);

    var rect = dialContainer.getBoundingClientRect();
    dialCanvas.width = rect.width * dpr;
    dialCanvas.height = rect.height * dpr;
    dialCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initBgBlobs() {
    bgBlobs = [];
    for (var i = 0; i < 5; i++) {
      bgBlobs.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 200 + Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        hueOffset: i * 60,
        phase: Math.random() * PI2
      });
    }
  }

  function initFlowParticles() {
    flowParticles = [];
    for (var i = 0; i < 60; i++) {
      flowParticles.push(createFlowParticle());
    }
  }

  function createFlowParticle() {
    var angle = Math.random() * PI2;
    var dist = 80 + Math.random() * 140;
    return {
      angle: angle,
      dist: dist,
      targetDist: dist,
      speed: 0.003 + Math.random() * 0.008,
      size: 1 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.4,
      life: Math.random()
    };
  }

  function bindEvents() {
    window.addEventListener('resize', function () {
      resizeCanvases();
    });

    dialCanvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    dialCanvas.addEventListener('pointerenter', function () {
      isHovering = true;
      dialAura.classList.add('visible');
    });
    dialCanvas.addEventListener('pointerleave', function () {
      isHovering = false;
      if (!isDragging) dialAura.classList.remove('visible');
    });

    document.querySelectorAll('.mode-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchMode(tab.getAttribute('data-mode'));
      });
    });

    document.getElementById('theme-btn').addEventListener('click', cycleTheme);

    document.getElementById('btn-reset').addEventListener('click', resetDial);
    document.getElementById('btn-ripple').addEventListener('click', emitPulse);

    dialCanvas.addEventListener('dblclick', function () {
      emitPulse();
    });
  }

  function onPointerDown(e) {
    isDragging = true;
    dialCanvas.setPointerCapture(e.pointerId);
    var center = getDialCenter();
    var dx = e.clientX - center.x;
    var dy = e.clientY - center.y;
    dragStartAngle = Math.atan2(dy, dx);
    dragStartValue = normalizedValue;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    var center = getDialCenter();
    var dx = e.clientX - center.x;
    var dy = e.clientY - center.y;
    var currentAngle = Math.atan2(dy, dx);
    var delta = currentAngle - dragStartAngle;

    if (delta > Math.PI) delta -= PI2;
    if (delta < -Math.PI) delta += PI2;

    var sensitivity = 1.5;
    var newNorm = dragStartValue + delta / PI2 * sensitivity;
    newNorm = Math.max(0, Math.min(1, newNorm));

    setNormalizedValue(newNorm);
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    if (!isHovering) dialAura.classList.remove('visible');

    var rounded = Math.round(normalizedValue * 100);
    setNormalizedValue(rounded / 100);
    spawnTickPulse(normalizedValue);
    bumpValue();
  }

  function getDialCenter() {
    var rect = dialContainer.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function setNormalizedValue(v) {
    normalizedValue = v;
    var mode = MODES[currentMode];
    targetValue = mode.min + v * (mode.max - mode.min);

    if (currentMode === 'frequency') {
      var expVal = Math.pow(10, Math.log10(mode.min) + v * (Math.log10(mode.max) - Math.log10(mode.min)));
      targetValue = Math.round(expVal);
    } else {
      targetValue = Math.round(mode.min + v * (mode.max - mode.min));
    }

    targetAngle = -Math.PI / 2 + v * PI2 * 1.5;
    dialValueEl.textContent = targetValue;

    var auraScale = 0.5 + v * 0.8;
    dialAura.style.transform = 'scale(' + auraScale + ')';
  }

  function bumpValue() {
    dialValueEl.classList.add('bump');
    setTimeout(function () {
      dialValueEl.classList.remove('bump');
    }, 200);
  }

  function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-mode') === mode);
    });
    setNormalizedValue(normalizedValue);
    updateModeDisplay();
    statusTextEl.textContent = 'Mode: ' + mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function updateModeDisplay() {
    var mode = MODES[currentMode];
    dialUnitEl.textContent = mode.unit;
    dialLabelEl.textContent = mode.label;
    modeLabelEl.textContent = mode.label + ' — Drag to set';
    statusModeEl.textContent = mode.label + ' Mode';
  }

  function resetDial() {
    setNormalizedValue(0);
    dialValueEl.textContent = '0';
    statusTextEl.textContent = 'Reset';
    emitPulse();
  }

  function cycleTheme() {
    currentThemeIdx = (currentThemeIdx + 1) % THEMES.length;
    var theme = THEMES[currentThemeIdx];
    if (theme === 'default') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
    statusTextEl.textContent = 'Theme: ' + theme;
  }

  function emitPulse() {
    var rect = dialContainer.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    for (var i = 0; i < 3; i++) {
      (function (delay) {
        setTimeout(function () {
          var ring = document.createElement('div');
          ring.className = 'ripple-ring';
          var size = 100 + normalizedValue * 200;
          ring.style.width = size + 'px';
          ring.style.height = size + 'px';
          ring.style.left = (cx - size / 2) + 'px';
          ring.style.top = (cy - size / 2) + 'px';
          rippleLayer.appendChild(ring);
          setTimeout(function () {
            ring.remove();
          }, 1200);
        }, delay);
      })(i * 150);
    }

    for (var j = 0; j < 12; j++) {
      spawnParticle(cx, cy);
    }
  }

  function spawnParticle(cx, cy) {
    var p = document.createElement('div');
    p.className = 'particle';
    var angle = Math.random() * PI2;
    var dist = 60 + Math.random() * 140;
    p.style.setProperty('--px', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--py', Math.sin(angle) * dist + 'px');
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    rippleLayer.appendChild(p);
    setTimeout(function () {
      p.remove();
    }, 800);
  }

  function spawnTickPulse(norm) {
    tickPulses.push({
      norm: norm,
      birth: performance.now(),
      life: 600
    });
  }

  function loop(time) {
    bgTime = time * 0.001;
    var dt = 1 / 60;

    dialAngle += (targetAngle - dialAngle) * 0.12;
    dialValue += (targetValue - dialValue) * 0.15;

    updateBgBlobs(dt);
    drawBg();
    drawDial(time);
    updateFlowParticles(dt);
    updateTickPulses(time);

    requestAnimationFrame(loop);
  }

  function updateBgBlobs(dt) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    for (var i = 0; i < bgBlobs.length; i++) {
      var b = bgBlobs[i];
      b.x += b.vx + Math.sin(bgTime * 0.5 + b.phase) * 0.2;
      b.y += b.vy + Math.cos(bgTime * 0.4 + b.phase) * 0.2;
      if (b.x < -b.r) b.x = w + b.r;
      if (b.x > w + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = h + b.r;
      if (b.y > h + b.r) b.y = -b.r;
    }
  }

  function drawBg() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    bgCtx.clearRect(0, 0, w, h);

    var style = getComputedStyle(document.body);
    var accentH = parseFloat(style.getPropertyValue('--accent-h')) || 220;

    for (var i = 0; i < bgBlobs.length; i++) {
      var b = bgBlobs[i];
      var hue = accentH + b.hueOffset * 0.3 + Math.sin(bgTime + b.phase) * 15;
      var r = Math.max(1, b.r + Math.sin(bgTime * 0.7 + b.phase) * 40);
      var grad = bgCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      grad.addColorStop(0, 'hsla(' + hue + ', 70%, 30%, 0.15)');
      grad.addColorStop(0.5, 'hsla(' + hue + ', 60%, 20%, 0.06)');
      grad.addColorStop(1, 'transparent');
      bgCtx.fillStyle = grad;
      bgCtx.fillRect(0, 0, w, h);
    }
  }

  function drawDial(time) {
    var rect = dialContainer.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    var cx = w / 2;
    var cy = h / 2;
    var outerR = Math.min(cx, cy) - 20;
    outerR = Math.max(10, outerR);

    dialCtx.clearRect(0, 0, w, h);

    drawOuterRing(cx, cy, outerR, time);
    drawTickMarks(cx, cy, outerR, time);
    drawActiveArc(cx, cy, outerR);
    drawFlowParticlesOnCanvas(cx, cy, outerR, time);
    drawCenterDot(cx, cy);
    drawHandle(cx, cy, outerR);
    drawTickPulsesOnCanvas(cx, cy, outerR, time);
  }

  function drawOuterRing(cx, cy, r, time) {
    var segments = 180;
    for (var i = 0; i < segments; i++) {
      var a1 = (i / segments) * PI2 - Math.PI / 2;
      var a2 = ((i + 1) / segments) * PI2 - Math.PI / 2;
      var pulse = Math.sin(time * 0.002 + i * 0.05) * 0.03;
      var alpha = 0.06 + pulse;

      dialCtx.beginPath();
      dialCtx.arc(cx, cy, r, a1, a2);
      dialCtx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
      dialCtx.lineWidth = 2;
      dialCtx.stroke();
    }
  }

  function drawTickMarks(cx, cy, r, time) {
    var totalTicks = 60;
    var startA = -Math.PI / 2;

    for (var i = 0; i < totalTicks; i++) {
      var norm = i / totalTicks;
      var a = startA + norm * PI2 * 1.5;
      if (a > PI2 + startA) continue;

      var isMajor = i % 10 === 0;
      var isMid = i % 5 === 0;
      var len = isMajor ? 14 : (isMid ? 9 : 5);
      var lw = isMajor ? 1.5 : 0.8;

      var innerR = r - len;
      var outerR2 = r;

      var x1 = cx + Math.cos(a) * innerR;
      var y1 = cy + Math.sin(a) * innerR;
      var x2 = cx + Math.cos(a) * outerR2;
      var y2 = cy + Math.sin(a) * outerR2;

      var isActive = norm <= normalizedValue;
      var alpha = isActive ? (0.5 + Math.sin(time * 0.003 + norm * 5) * 0.2) : 0.12;

      dialCtx.beginPath();
      dialCtx.moveTo(x1, y1);
      dialCtx.lineTo(x2, y2);

      if (isActive) {
        var style = getComputedStyle(document.body);
        var accentColor = style.getPropertyValue('--accent').trim();
        dialCtx.strokeStyle = accentColor;
        dialCtx.globalAlpha = alpha;
      } else {
        dialCtx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
        dialCtx.globalAlpha = 1;
      }

      dialCtx.lineWidth = lw;
      dialCtx.stroke();
      dialCtx.globalAlpha = 1;

      if (isMajor) {
        var labelR = r - len - 12;
        var lx = cx + Math.cos(a) * labelR;
        var ly = cy + Math.sin(a) * labelR;
        var val = Math.round(norm * 100);

        dialCtx.font = '10px "Share Tech Mono", monospace';
        dialCtx.fillStyle = isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';
        dialCtx.textAlign = 'center';
        dialCtx.textBaseline = 'middle';
        dialCtx.fillText(val, lx, ly);
      }
    }
  }

  function drawActiveArc(cx, cy, r) {
    if (normalizedValue <= 0.001) return;

    var startA = -Math.PI / 2;
    var endA = startA + normalizedValue * PI2 * 1.5;
    var style = getComputedStyle(document.body);
    var accentColor = style.getPropertyValue('--accent').trim();
    var accentGlow = style.getPropertyValue('--accent-glow').trim();

    dialCtx.beginPath();
    dialCtx.arc(cx, cy, r + 4, startA, endA);
    dialCtx.strokeStyle = accentColor;
    dialCtx.lineWidth = 3;
    dialCtx.lineCap = 'round';
    dialCtx.globalAlpha = 0.7;
    dialCtx.stroke();
    dialCtx.globalAlpha = 1;

    dialCtx.beginPath();
    dialCtx.arc(cx, cy, r + 4, startA, endA);
    dialCtx.strokeStyle = accentGlow;
    dialCtx.lineWidth = 10;
    dialCtx.lineCap = 'round';
    dialCtx.globalAlpha = 0.3;
    dialCtx.stroke();
    dialCtx.globalAlpha = 1;

    for (var i = 0; i < 8; i++) {
      var glowA = endA - i * 0.03;
      dialCtx.beginPath();
      dialCtx.arc(cx, cy, r + 4, glowA - 0.01, glowA + 0.01);
      dialCtx.strokeStyle = accentColor;
      dialCtx.lineWidth = 3 + i * 0.5;
      dialCtx.globalAlpha = 0.3 - i * 0.035;
      dialCtx.stroke();
      dialCtx.globalAlpha = 1;
    }
  }

  function drawHandle(cx, cy, r) {
    var a = -Math.PI / 2 + normalizedValue * PI2 * 1.5;
    var hx = cx + Math.cos(a) * (r + 4);
    var hy = cy + Math.sin(a) * (r + 4);
    var style = getComputedStyle(document.body);
    var accentColor = style.getPropertyValue('--accent').trim();

    dialCtx.beginPath();
    dialCtx.arc(hx, hy, isDragging ? 10 : (isHovering ? 8 : 6), 0, PI2);
    dialCtx.fillStyle = accentColor;
    dialCtx.shadowColor = accentColor;
    dialCtx.shadowBlur = 20;
    dialCtx.fill();
    dialCtx.shadowBlur = 0;

    dialCtx.beginPath();
    dialCtx.arc(hx, hy, 3, 0, PI2);
    dialCtx.fillStyle = 'rgba(255,255,255,0.9)';
    dialCtx.fill();
  }

  function drawCenterDot(cx, cy) {
    var pulse = Math.sin(bgTime * 2) * 0.15 + 0.5;
    dialCtx.beginPath();
    dialCtx.arc(cx, cy, 3, 0, PI2);
    dialCtx.fillStyle = 'rgba(255,255,255,' + pulse + ')';
    dialCtx.fill();
  }

  function updateFlowParticles(dt) {
    for (var i = 0; i < flowParticles.length; i++) {
      var p = flowParticles[i];
      p.angle += p.speed * (0.5 + normalizedValue * 2);
      p.life += dt * 0.3;
      if (p.life > 1) {
        flowParticles[i] = createFlowParticle();
      }

      var targetD = 80 + normalizedValue * 140;
      p.dist += (targetD - p.dist) * 0.02;
    }
  }

  function drawFlowParticlesOnCanvas(cx, cy, outerR, time) {
    for (var i = 0; i < flowParticles.length; i++) {
      var p = flowParticles[i];
      var px = cx + Math.cos(p.angle) * p.dist;
      var py = cy + Math.sin(p.angle) * p.dist;
      var alpha = p.opacity * (0.3 + normalizedValue * 0.7);

      var style = getComputedStyle(document.body);
      var accentColor = style.getPropertyValue('--accent').trim();

      dialCtx.beginPath();
      dialCtx.arc(px, py, p.size * (0.5 + normalizedValue * 0.5), 0, PI2);
      dialCtx.fillStyle = accentColor;
      dialCtx.globalAlpha = alpha;
      dialCtx.fill();
      dialCtx.globalAlpha = 1;
    }
  }

  function updateTickPulses(time) {
    tickPulses = tickPulses.filter(function (tp) {
      return time - tp.birth < tp.life;
    });
  }

  function drawTickPulsesOnCanvas(cx, cy, outerR, time) {
    var style = getComputedStyle(document.body);
    var accentColor = style.getPropertyValue('--accent').trim();

    for (var i = 0; i < tickPulses.length; i++) {
      var tp = tickPulses[i];
      var age = (time - tp.birth) / tp.life;
      var a = -Math.PI / 2 + tp.norm * PI2 * 1.5;
      var px = cx + Math.cos(a) * (outerR + 4);
      var py = cy + Math.sin(a) * (outerR + 4);

      var ringR = age * 30;
      var alpha = (1 - age) * 0.4;

      dialCtx.beginPath();
      dialCtx.arc(px, py, Math.max(1, ringR), 0, PI2);
      dialCtx.strokeStyle = accentColor;
      dialCtx.lineWidth = 1.5;
      dialCtx.globalAlpha = alpha;
      dialCtx.stroke();
      dialCtx.globalAlpha = 1;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
