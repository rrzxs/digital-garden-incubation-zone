(function () {
  'use strict';

  var PALETTES = {
    obsidian: {
      glyph: 'rgba(233, 69, 96, 0.9)',
      glyphNear: 'rgba(255, 140, 160, 1)',
      glyphFar: 'rgba(233, 69, 96, 0.2)',
      line: 'rgba(233, 69, 96, ',
      accent: '#e94560',
      accentGlow: 'rgba(233, 69, 96, 0.35)',
      accentSoft: 'rgba(233, 69, 96, 0.12)',
      blob1: '#e94560',
      blob2: '#533483',
      blob3: '#0f3460',
      blob4: '#16213e'
    },
    aurora: {
      glyph: 'rgba(0, 245, 212, 0.9)',
      glyphNear: 'rgba(130, 255, 230, 1)',
      glyphFar: 'rgba(0, 245, 212, 0.2)',
      line: 'rgba(0, 245, 212, ',
      accent: '#00f5d4',
      accentGlow: 'rgba(0, 245, 212, 0.35)',
      accentSoft: 'rgba(0, 245, 212, 0.12)',
      blob1: '#00f5d4',
      blob2: '#00bbf9',
      blob3: '#0077b6',
      blob4: '#0a1628'
    },
    ember: {
      glyph: 'rgba(255, 107, 53, 0.9)',
      glyphNear: 'rgba(255, 170, 120, 1)',
      glyphFar: 'rgba(255, 107, 53, 0.2)',
      line: 'rgba(255, 107, 53, ',
      accent: '#ff6b35',
      accentGlow: 'rgba(255, 107, 53, 0.35)',
      accentSoft: 'rgba(255, 107, 53, 0.12)',
      blob1: '#ff6b35',
      blob2: '#d62828',
      blob3: '#7b2d26',
      blob4: '#1a0a00'
    },
    nebula: {
      glyph: 'rgba(199, 125, 255, 0.9)',
      glyphNear: 'rgba(220, 170, 255, 1)',
      glyphFar: 'rgba(199, 125, 255, 0.2)',
      line: 'rgba(199, 125, 255, ',
      accent: '#c77dff',
      accentGlow: 'rgba(199, 125, 255, 0.35)',
      accentSoft: 'rgba(199, 125, 255, 0.12)',
      blob1: '#c77dff',
      blob2: '#7b2ff7',
      blob3: '#3a0ca3',
      blob4: '#0d001a'
    }
  };

  var GLYPH_SETS = [
    'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
    'α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ υ φ χ ψ ω',
    '零 壹 贰 叁 肆 伍 陆 柒 捌 玖 拾 佰 仟 万 亿 兆 京 垓',
    '⌘ ⌥ ⇧ ⎋ ⏎ ⌫ ⏏ ⎗ ⎘ ⎙ ⚡ ◈ ⟐ ⋰ ⋯ ⌁ ⏣ ☄ ◇ △'
  ];

  var state = {
    width: 0,
    height: 0,
    dpr: 1,
    mouse: { x: -9999, y: -9999, active: false },
    glyphs: [],
    mode: 'attract',
    palette: 'obsidian',
    radius: 150,
    force: 8,
    damping: 0.92,
    fps: 60,
    frameCount: 0,
    lastFpsTime: 0,
    raf: null,
    overlayDismissed: false,
    currentGlyphSet: 0
  };

  var canvas, ctx;
  var root = document.documentElement;

  function init() {
    canvas = document.getElementById('field-canvas');
    ctx = canvas.getContext('2d');

    resize();
    generateGlyphs();
    bindEvents();
    setPalette(state.palette);
    updateStats();

    state.lastFpsTime = performance.now();
    loop();
  }

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = rect.width;
    state.height = rect.height;
    canvas.width = state.width * state.dpr;
    canvas.height = state.height * state.dpr;
    canvas.style.width = state.width + 'px';
    canvas.style.height = state.height + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function generateGlyphs() {
    state.glyphs = [];
    var chars = GLYPH_SETS[state.currentGlyphSet].split(/\s+/);
    var count = Math.min(chars.length, Math.floor((state.width * state.height) / 3200));
    count = Math.max(count, 20);

    var cols = Math.ceil(Math.sqrt(count * (state.width / state.height)));
    var rows = Math.ceil(count / cols);
    var cellW = state.width / (cols + 1);
    var cellH = state.height / (rows + 1);

    var idx = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (idx >= count) break;
        var homeX = cellW * (c + 1) + (Math.random() - 0.5) * cellW * 0.4;
        var homeY = cellH * (r + 1) + (Math.random() - 0.5) * cellH * 0.4;
        state.glyphs.push({
          char: chars[idx % chars.length],
          homeX: homeX,
          homeY: homeY,
          x: homeX,
          y: homeY,
          vx: 0,
          vy: 0,
          rotation: (Math.random() - 0.5) * 0.3,
          rotationV: 0,
          scale: 1,
          targetScale: 1,
          opacity: 0.7,
          targetOpacity: 0.7,
          fontSize: 16 + Math.random() * 8
        });
        idx++;
      }
    }

    var statGlyphs = document.getElementById('stat-glyphs');
    if (statGlyphs) statGlyphs.textContent = state.glyphs.length;
  }

  function bindEvents() {
    window.addEventListener('resize', debounce(function () {
      resize();
      generateGlyphs();
    }, 200));

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
      state.mouse.active = true;
      dismissOverlay();
    });

    canvas.addEventListener('mouseleave', function () {
      state.mouse.active = false;
    });

    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      state.mouse.x = touch.clientX - rect.left;
      state.mouse.y = touch.clientY - rect.top;
      state.mouse.active = true;
      dismissOverlay();
    }, { passive: false });

    canvas.addEventListener('touchend', function () {
      state.mouse.active = false;
    });

    document.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.mode-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        var statMode = document.getElementById('stat-mode');
        if (statMode) statMode.textContent = capitalize(state.mode);
      });
    });

    document.querySelectorAll('.palette-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.palette-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        setPalette(btn.dataset.palette);
      });
    });

    var radiusSlider = document.getElementById('radius-slider');
    var radiusValue = document.getElementById('radius-value');
    radiusSlider.addEventListener('input', function () {
      state.radius = parseInt(radiusSlider.value);
      radiusValue.textContent = state.radius;
    });

    var forceSlider = document.getElementById('force-slider');
    var forceValue = document.getElementById('force-value');
    forceSlider.addEventListener('input', function () {
      state.force = parseInt(forceSlider.value);
      forceValue.textContent = state.force;
    });

    var dampingSlider = document.getElementById('damping-slider');
    var dampingValue = document.getElementById('damping-value');
    dampingSlider.addEventListener('input', function () {
      state.damping = parseInt(dampingSlider.value) / 100 * 0.2 + 0.8;
      dampingValue.textContent = dampingSlider.value;
    });

    document.getElementById('shuffle-btn').addEventListener('click', function () {
      state.currentGlyphSet = (state.currentGlyphSet + 1) % GLYPH_SETS.length;
      generateGlyphs();
    });

    document.getElementById('reset-btn').addEventListener('click', function () {
      state.glyphs.forEach(function (g) {
        g.x = g.homeX;
        g.y = g.homeY;
        g.vx = 0;
        g.vy = 0;
        g.rotation = (Math.random() - 0.5) * 0.3;
        g.rotationV = 0;
      });
    });

    document.addEventListener('mousemove', function (e) {
      var glow = document.getElementById('cursor-glow');
      if (glow) {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
      }
    });
  }

  function dismissOverlay() {
    if (!state.overlayDismissed) {
      state.overlayDismissed = true;
      var overlay = document.getElementById('stage-overlay');
      if (overlay) overlay.classList.add('hidden');
    }
  }

  function setPalette(name) {
    state.palette = name;
    var p = PALETTES[name];
    root.style.setProperty('--accent', p.accent);
    root.style.setProperty('--accent-glow', p.accentGlow);
    root.style.setProperty('--accent-soft', p.accentSoft);
    root.style.setProperty('--blob-1', p.blob1);
    root.style.setProperty('--blob-2', p.blob2);
    root.style.setProperty('--blob-3', p.blob3);
    root.style.setProperty('--blob-4', p.blob4);
  }

  function loop() {
    update();
    render();
    state.frameCount++;

    var now = performance.now();
    if (now - state.lastFpsTime >= 1000) {
      state.fps = state.frameCount;
      state.frameCount = 0;
      state.lastFpsTime = now;
      var fpsEl = document.getElementById('stat-fps');
      if (fpsEl) fpsEl.textContent = state.fps;
    }

    state.raf = requestAnimationFrame(loop);
  }

  function update() {
    var mx = state.mouse.x;
    var my = state.mouse.y;
    var active = state.mouse.active;
    var radius = state.radius;
    var force = state.force;
    var damping = state.damping;
    var mode = state.mode;
    var pal = PALETTES[state.palette];

    for (var i = 0; i < state.glyphs.length; i++) {
      var g = state.glyphs[i];

      if (active && mode !== 'freeze') {
        var dx = mx - g.x;
        var dy = my - g.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius && dist > 0.1) {
          var normX = dx / dist;
          var normY = dy / dist;
          var strength = (1 - dist / radius) * force;
          var curve = strength * strength * 0.5;

          if (mode === 'attract') {
            g.vx += normX * curve;
            g.vy += normY * curve;
          } else if (mode === 'repel') {
            g.vx -= normX * curve;
            g.vy -= normY * curve;
          } else if (mode === 'orbit') {
            g.vx += (-normY * curve * 0.8 + normX * curve * 0.1);
            g.vy += (normX * curve * 0.8 + normY * curve * 0.1);
          }

          g.rotationV += (Math.random() - 0.5) * curve * 0.02;
          g.targetScale = 1 + (1 - dist / radius) * 0.6;
          g.targetOpacity = 0.7 + (1 - dist / radius) * 0.3;
        } else {
          g.targetScale = 1;
          g.targetOpacity = 0.5;
        }
      } else {
        g.targetScale = 1;
        g.targetOpacity = 0.5;
      }

      var homeDx = g.homeX - g.x;
      var homeDy = g.homeY - g.y;
      g.vx += homeDx * 0.02;
      g.vy += homeDy * 0.02;

      g.vx *= damping;
      g.vy *= damping;
      g.rotationV *= 0.92;

      g.x += g.vx;
      g.y += g.vy;
      g.rotation += g.rotationV;

      g.scale += (g.targetScale - g.scale) * 0.12;
      g.opacity += (g.targetOpacity - g.opacity) * 0.1;

      if (g.x < 0) { g.x = 0; g.vx *= -0.5; }
      if (g.x > state.width) { g.x = state.width; g.vx *= -0.5; }
      if (g.y < 0) { g.y = 0; g.vy *= -0.5; }
      if (g.y > state.height) { g.y = state.height; g.vy *= -0.5; }
    }
  }

  function render() {
    ctx.clearRect(0, 0, state.width, state.height);

    var pal = PALETTES[state.palette];
    var mx = state.mouse.x;
    var my = state.mouse.y;
    var active = state.mouse.active;
    var radius = state.radius;

    if (active) {
      var proximityLines = [];
      for (var i = 0; i < state.glyphs.length; i++) {
        var g = state.glyphs[i];
        var dx = mx - g.x;
        var dy = my - g.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius * 1.2) {
          proximityLines.push({ glyph: g, dist: dist });
        }
      }

      proximityLines.sort(function (a, b) { return a.dist - b.dist; });
      var maxLines = Math.min(proximityLines.length, 12);
      for (var k = 0; k < maxLines; k++) {
        var entry = proximityLines[k];
        var alpha = Math.max(0, (1 - entry.dist / (radius * 1.2))) * 0.25;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(entry.glyph.x, entry.glyph.y);
        ctx.strokeStyle = pal.line + alpha + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (var a = 0; a < proximityLines.length; a++) {
        for (var b = a + 1; b < Math.min(a + 3, proximityLines.length); b++) {
          var ga = proximityLines[a].glyph;
          var gb = proximityLines[b].glyph;
          var gdx = ga.x - gb.x;
          var gdy = ga.y - gb.y;
          var gdist = Math.sqrt(gdx * gdx + gdy * gdy);
          if (gdist < radius * 0.8) {
            var lalpha = Math.max(0, (1 - gdist / (radius * 0.8))) * 0.1;
            ctx.beginPath();
            ctx.moveTo(ga.x, ga.y);
            ctx.lineTo(gb.x, gb.y);
            ctx.strokeStyle = pal.line + lalpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var j = 0; j < state.glyphs.length; j++) {
      var gl = state.glyphs[j];
      ctx.save();
      ctx.translate(gl.x, gl.y);
      ctx.rotate(gl.rotation);
      ctx.scale(gl.scale, gl.scale);

      var glDist = Math.sqrt((mx - gl.x) * (mx - gl.x) + (my - gl.y) * (my - gl.y));
      var nearFactor = active ? Math.max(0, 1 - glDist / radius) : 0;

      ctx.font = gl.fontSize + 'px "Share Tech Mono", monospace';
      ctx.globalAlpha = gl.opacity;

      if (nearFactor > 0.3) {
        ctx.shadowColor = pal.accent;
        ctx.shadowBlur = nearFactor * 16;
      }

      var r = Math.round(lerp(100, 255, nearFactor));
      var gr = Math.round(lerp(100, 255, nearFactor));
      var bv = Math.round(lerp(120, 255, nearFactor));
      ctx.fillStyle = 'rgba(' + r + ',' + gr + ',' + bv + ',' + gl.opacity + ')';

      ctx.fillText(gl.char, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (active && state.mode !== 'freeze') {
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = pal.accent;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(mx, my, radius, 0, Math.PI * 2);
      ctx.strokeStyle = pal.line + '0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function updateStats() {
    var statGlyphs = document.getElementById('stat-glyphs');
    if (statGlyphs) statGlyphs.textContent = state.glyphs.length;
    var statMode = document.getElementById('stat-mode');
    if (statMode) statMode.textContent = capitalize(state.mode);
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
