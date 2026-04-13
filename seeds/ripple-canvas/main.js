(function () {
  'use strict';

  var EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

  var PALETTES = {
    abyss: {
      water: [[10, 30, 60], [15, 70, 120], [14, 165, 233]],
      ripple: [14, 165, 233],
      particle: [56, 189, 248],
      glow: 'rgba(14, 165, 233, 0.3)',
      blobs: ['#0c4a6e', '#1e1b4b', '#164e63', '#312e81'],
      accent: '#0ea5e9',
      accentGlow: 'rgba(14, 165, 233, 0.3)'
    },
    aurora: {
      water: [[10, 35, 30], [20, 80, 70], [100, 255, 218]],
      ripple: [100, 255, 218],
      particle: [52, 211, 153],
      glow: 'rgba(100, 255, 218, 0.3)',
      blobs: ['#0f2027', '#2c5364', '#134e4a', '#064e3b'],
      accent: '#64ffda',
      accentGlow: 'rgba(100, 255, 218, 0.3)'
    },
    ember: {
      water: [[40, 15, 8], [100, 40, 15], [249, 115, 22]],
      ripple: [249, 115, 22],
      particle: [251, 146, 60],
      glow: 'rgba(249, 115, 22, 0.3)',
      blobs: ['#431407', '#7c2d12', '#1c1917', '#451a03'],
      accent: '#f97316',
      accentGlow: 'rgba(249, 115, 22, 0.3)'
    },
    violet: {
      water: [[25, 12, 45], [60, 30, 100], [167, 139, 250]],
      ripple: [167, 139, 250],
      particle: [196, 181, 253],
      glow: 'rgba(167, 139, 250, 0.3)',
      blobs: ['#2e1065', '#4a1a6b', '#1e1b4b', '#312e81'],
      accent: '#a78bfa',
      accentGlow: 'rgba(167, 139, 250, 0.3)'
    }
  };

  var state = {
    width: 0,
    height: 0,
    halfW: 0,
    halfH: 0,
    rippleCurrent: null,
    ripplePrevious: null,
    background: null,
    strength: 256,
    damping: 0.97,
    refraction: 8,
    palette: 'abyss',
    mode: 'physics',
    isDrawing: false,
    mouseDown: false,
    lastRippleX: -1,
    lastRippleY: -1,
    mouseX: 0,
    mouseY: 0,
    particles: [],
    maxParticles: 120,
    rippleCount: 0,
    hasInteracted: false,
    lastTime: 0,
    frameCount: 0,
    fpsAccum: 0,
    fps: 60
  };

  var rippleCanvas, rippleCtx, particleCanvas, particleCtx;
  var wrapper, overlay, cursorGlow;
  var statFps, statRipples, statParticles;

  function init() {
    rippleCanvas = document.getElementById('rippleCanvas');
    particleCanvas = document.getElementById('particleCanvas');
    rippleCtx = rippleCanvas.getContext('2d');
    particleCtx = particleCanvas.getContext('2d');
    wrapper = document.getElementById('canvasWrapper');
    overlay = document.getElementById('canvasOverlay');
    cursorGlow = document.getElementById('cursor-glow');
    statFps = document.getElementById('statFps');
    statRipples = document.getElementById('statRipples');
    statParticles = document.getElementById('statParticles');

    resizeCanvas();
    buildBackground();
    initParticles();
    bindEvents();
    bindControls();
    requestAnimationFrame(loop);
  }

  function resizeCanvas() {
    var rect = wrapper.getBoundingClientRect();
    var w = Math.floor(rect.width);
    var h = Math.floor(rect.height);
    rippleCanvas.width = w;
    rippleCanvas.height = h;
    particleCanvas.width = w;
    particleCanvas.height = h;
    state.width = w;
    state.height = h;
    state.halfW = Math.floor(w / 2);
    state.halfH = Math.floor(h / 2);

    var size = w * h;
    state.rippleCurrent = new Float32Array(size);
    state.ripplePrevious = new Float32Array(size);
    state.background = new Uint8ClampedArray(size * 4);
    buildBackground();
    initParticles();
  }

  function buildBackground() {
    var w = state.width;
    var h = state.height;
    var pal = PALETTES[state.palette];
    var data = state.background;
    var c1 = pal.water[0];
    var c2 = pal.water[1];
    var c3 = pal.water[2];

    for (var y = 0; y < h; y++) {
      var ny = y / h;
      for (var x = 0; x < w; x++) {
        var nx = x / w;
        var idx = (y * w + x) * 4;

        var wave1 = Math.sin(nx * 6.0 + ny * 4.0) * 0.08;
        var wave2 = Math.sin(nx * 3.0 - ny * 5.0 + 1.5) * 0.06;
        var wave3 = Math.sin(nx * 8.0 + ny * 2.0 + 3.0) * 0.04;
        var blend = Math.max(0, Math.min(1, ny * 0.8 + wave1 + wave2 + wave3));

        var r, g, b;
        if (blend < 0.5) {
          var t = blend * 2;
          r = c1[0] + (c2[0] - c1[0]) * t;
          g = c1[1] + (c2[1] - c1[1]) * t;
          b = c1[2] + (c2[2] - c1[2]) * t;
        } else {
          var t2 = (blend - 0.5) * 2;
          r = c2[0] + (c3[0] - c2[0]) * t2;
          g = c2[1] + (c3[1] - c2[1]) * t2;
          b = c2[2] + (c3[2] - c2[2]) * t2;
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
  }

  function dropRipple(cx, cy, radius, strength) {
    var w = state.width;
    var h = state.height;
    var cur = state.rippleCurrent;
    var r = Math.max(2, Math.floor(radius));
    var s = strength || state.strength;
    state.rippleCount++;

    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < r) {
          var px = Math.floor(cx) + dx;
          var py = Math.floor(cy) + dy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            var falloff = Math.cos((dist / r) * Math.PI * 0.5);
            cur[py * w + px] += s * falloff * falloff;
          }
        }
      }
    }
  }

  function propagateRipples() {
    var w = state.width;
    var h = state.height;
    var cur = state.rippleCurrent;
    var prev = state.ripplePrevious;
    var damp = state.damping;

    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = y * w + x;
        prev[i] = ((
          cur[i - 1] +
          cur[i + 1] +
          cur[i - w] +
          cur[i + w]
        ) * 0.5 - prev[i]) * damp;
      }
    }

    var tmp = state.ripplePrevious;
    state.ripplePrevious = state.rippleCurrent;
    state.rippleCurrent = tmp;
  }

  function renderRipples() {
    var w = state.width;
    var h = state.height;
    var ref = state.refraction;
    var prev = state.ripplePrevious;
    var bgData = state.background;

    var imageData = rippleCtx.createImageData(w, h);
    var pixels = imageData.data;

    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = y * w + x;
        var xOffset = Math.floor((prev[i - 1] - prev[i + 1]) * ref);
        var yOffset = Math.floor((prev[i - w] - prev[i + w]) * ref);

        var sx = x + xOffset;
        var sy = y + yOffset;

        if (sx < 0) sx = 0;
        if (sx >= w) sx = w - 1;
        if (sy < 0) sy = 0;
        if (sy >= h) sy = h - 1;

        var srcIdx = (sy * w + sx) * 4;
        var dstIdx = i * 4;

        var highlight = Math.min(60, Math.abs(prev[i]) * 0.15);

        pixels[dstIdx] = Math.min(255, bgData[srcIdx] + highlight);
        pixels[dstIdx + 1] = Math.min(255, bgData[srcIdx + 1] + highlight);
        pixels[dstIdx + 2] = Math.min(255, bgData[srcIdx + 2] + highlight);
        pixels[dstIdx + 3] = 255;
      }
    }

    rippleCtx.putImageData(imageData, 0, 0);
  }

  function initParticles() {
    state.particles = [];
    var w = state.width;
    var h = state.height;
    for (var i = 0; i < state.maxParticles; i++) {
      state.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1 + Math.random() * 2.5,
        alpha: 0.1 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
        trail: []
      });
    }
  }

  function updateParticles(dt) {
    var w = state.width;
    var h = state.height;
    var prev = state.ripplePrevious;
    var particles = state.particles;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.phase += p.speed * 0.02 * dt;

      var px = Math.floor(p.x);
      var py = Math.floor(p.y);
      if (px > 1 && px < w - 1 && py > 1 && py < h - 1) {
        var idx = py * w + px;
        var gradX = (prev[idx + 1] - prev[idx - 1]) * 0.02;
        var gradY = (prev[idx + w] - prev[idx - w]) * 0.02;

        if (state.mode === 'physics') {
          p.vx += gradX * dt;
          p.vy += gradY * dt;
        } else {
          p.vx += (Math.random() - 0.5) * 0.1 * dt;
          p.vy += (Math.random() - 0.5) * 0.1 * dt;
        }
      }

      p.vx *= 0.98;
      p.vy *= 0.98;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
      if (p.x >= w) { p.x = w - 1; p.vx *= -0.5; }
      if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
      if (p.y >= h) { p.y = h - 1; p.vy *= -0.5; }

      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.pop();
    }
  }

  function renderParticles() {
    var ctx = particleCtx;
    var pal = PALETTES[state.palette];
    var particles = state.particles;
    var col = pal.particle;

    ctx.clearRect(0, 0, state.width, state.height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var breathe = 0.5 + 0.5 * Math.sin(p.phase);
      var a = p.alpha * (0.4 + breathe * 0.6);

      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (var t = 1; t < p.trail.length; t++) {
          ctx.lineTo(p.trail[t].x, p.trail[t].y);
        }
        ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * 0.3) + ')';
        ctx.lineWidth = p.radius * 0.6;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (0.8 + breathe * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a + ')';
      ctx.fill();

      if (p.radius > 2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
        grad.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * 0.2) + ')');
        grad.addColorStop(1, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    var mx = state.mouseX;
    var my = state.mouseY;
    if (mx > 0 && my > 0) {
      var connectionDist = 120;
      for (var j = 0; j < particles.length; j++) {
        var pp = particles[j];
        var dx = pp.x - mx;
        var dy = pp.y - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDist) {
          var lineAlpha = (1 - dist / connectionDist) * 0.12;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(pp.x, pp.y);
          ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + lineAlpha + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function loop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    var rawDt = (timestamp - state.lastTime) / 16.667;
    var dt = Math.min(rawDt, 3);
    state.lastTime = timestamp;

    state.fpsAccum += rawDt;
    state.frameCount++;
    if (state.fpsAccum >= 60) {
      state.fps = Math.round(state.frameCount / (state.fpsAccum / 60));
      state.frameCount = 0;
      state.fpsAccum = 0;
      statFps.textContent = state.fps;
      statRipples.textContent = state.rippleCount;
      statParticles.textContent = state.particles.length;
    }

    if (state.mode === 'draw' && state.mouseDown && state.isDrawing) {
      dropRipple(state.mouseX, state.mouseY, 4, state.strength * 0.6);
    }

    propagateRipples();
    renderRipples();
    updateParticles(dt);
    renderParticles();

    requestAnimationFrame(loop);
  }

  function hideOverlay() {
    if (!state.hasInteracted) {
      state.hasInteracted = true;
      overlay.classList.add('hidden');
    }
  }

  function getCanvasPos(e) {
    var rect = rippleCanvas.getBoundingClientRect();
    var clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * (state.width / rect.width),
      y: (clientY - rect.top) * (state.height / rect.height)
    };
  }

  function bindEvents() {
    rippleCanvas.addEventListener('mousedown', function (e) {
      e.preventDefault();
      state.mouseDown = true;
      var pos = getCanvasPos(e);
      state.mouseX = pos.x;
      state.mouseY = pos.y;
      hideOverlay();

      if (state.mode === 'physics') {
        dropRipple(pos.x, pos.y, 12, state.strength);
        state.lastRippleX = pos.x;
        state.lastRippleY = pos.y;
      } else {
        state.isDrawing = true;
        dropRipple(pos.x, pos.y, 6, state.strength * 0.8);
      }
    });

    window.addEventListener('mousemove', function (e) {
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top = e.clientY + 'px';

      var rect = rippleCanvas.getBoundingClientRect();
      state.mouseX = (e.clientX - rect.left) * (state.width / rect.width);
      state.mouseY = (e.clientY - rect.top) * (state.height / rect.height);

      if (state.mouseDown && state.mode === 'physics') {
        var dx = state.mouseX - state.lastRippleX;
        var dy = state.mouseY - state.lastRippleY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 20) {
          dropRipple(state.mouseX, state.mouseY, 8, state.strength * 0.5);
          state.lastRippleX = state.mouseX;
          state.lastRippleY = state.mouseY;
        }
      }
    });

    window.addEventListener('mouseup', function () {
      state.mouseDown = false;
      state.isDrawing = false;
    });

    rippleCanvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      state.mouseDown = true;
      var pos = getCanvasPos(e);
      state.mouseX = pos.x;
      state.mouseY = pos.y;
      hideOverlay();

      if (state.mode === 'physics') {
        dropRipple(pos.x, pos.y, 12, state.strength);
        state.lastRippleX = pos.x;
        state.lastRippleY = pos.y;
      } else {
        state.isDrawing = true;
        dropRipple(pos.x, pos.y, 6, state.strength * 0.8);
      }
    }, { passive: false });

    rippleCanvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var pos = getCanvasPos(e);
      state.mouseX = pos.x;
      state.mouseY = pos.y;

      if (state.mode === 'physics') {
        var dx = pos.x - state.lastRippleX;
        var dy = pos.y - state.lastRippleY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 20) {
          dropRipple(pos.x, pos.y, 8, state.strength * 0.5);
          state.lastRippleX = pos.x;
          state.lastRippleY = pos.y;
        }
      }
    }, { passive: false });

    rippleCanvas.addEventListener('touchend', function () {
      state.mouseDown = false;
      state.isDrawing = false;
    });

    document.addEventListener('mouseenter', function () {
      cursorGlow.classList.add('visible');
    });

    document.addEventListener('mouseleave', function () {
      cursorGlow.classList.remove('visible');
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 200);
    });
  }

  function setPalette(name) {
    state.palette = name;
    var pal = PALETTES[name];

    document.documentElement.style.setProperty('--accent', pal.accent);
    document.documentElement.style.setProperty('--accent-glow', pal.accentGlow);

    var blobs = document.querySelectorAll('.blob');
    for (var i = 0; i < blobs.length && i < pal.blobs.length; i++) {
      var blobColors = pal.blobs[i];
      blobs[i].style.background = 'radial-gradient(circle, ' + blobColors + ' 0%, transparent 70%)';
    }

    buildBackground();

    var btns = document.querySelectorAll('.palette-btn');
    btns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.palette === name);
    });
  }

  function setMode(mode) {
    state.mode = mode;
    var labels = document.querySelectorAll('.mode-label');
    labels.forEach(function (lbl) {
      lbl.classList.toggle('active', lbl.dataset.mode === mode);
    });
  }

  function bindControls() {
    document.getElementById('sliderStrength').addEventListener('input', function (e) {
      state.strength = parseInt(e.target.value, 10);
    });

    document.getElementById('sliderDamping').addEventListener('input', function (e) {
      state.damping = parseInt(e.target.value, 10) / 100;
    });

    document.getElementById('sliderRefraction').addEventListener('input', function (e) {
      state.refraction = parseInt(e.target.value, 10);
    });

    document.querySelectorAll('.palette-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPalette(btn.dataset.palette);
      });
    });

    document.getElementById('modeToggle').addEventListener('click', function () {
      setMode(state.mode === 'physics' ? 'draw' : 'physics');
    });

    document.getElementById('modeToggle').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setMode(state.mode === 'physics' ? 'draw' : 'physics');
      }
    });

    document.getElementById('btnClear').addEventListener('click', function () {
      var size = state.width * state.height;
      state.rippleCurrent = new Float32Array(size);
      state.ripplePrevious = new Float32Array(size);
      state.rippleCount = 0;
      initParticles();
    });

    document.getElementById('btnFullscreen').addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
