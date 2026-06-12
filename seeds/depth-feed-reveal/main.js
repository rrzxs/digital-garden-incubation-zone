(function () {
  'use strict';

  // === DOM Elements ===

  var scene = document.getElementById('depth-scene');
  var depthFill = document.getElementById('depth-fill');
  var depthMarker = document.getElementById('depth-marker');
  var depthLabel = document.getElementById('depth-label');
  var particleCanvas = document.getElementById('particle-canvas');
  var cursorGlow = document.getElementById('cursor-glow');
  var toast = document.getElementById('toast');
  var btnReset = document.getElementById('btn-reset');

  var ctx = particleCanvas.getContext('2d');

  var modeButtons = document.querySelectorAll('.ctrl-btn[data-mode]');
  var themeDots = document.querySelectorAll('.theme-dot[data-theme]');
  var feedCards = document.querySelectorAll('.feed-card');

  // === State ===

  var state = {
    mode: 'scroll',
    theme: 'abyss',
    mouseX: 0,
    mouseY: 0,
    sceneMouseX: 0,
    sceneMouseY: 0,
    scrollProgress: 0,
    particles: [],
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    animFrame: null,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  // === Simplex Noise (Compact) ===

  var SimplexNoise = (function () {
    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var grad3 = [
      [1,1],[-1,1],[1,-1],[-1,-1],
      [1,0],[-1,0],[0,1],[0,-1]
    ];
    var perm = new Uint8Array(512);
    var permMod8 = new Uint8Array(512);

    function seed(s) {
      var p = new Uint8Array(256);
      for (var i = 0; i < 256; i++) p[i] = i;
      for (var i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        var j = s % (i + 1);
        var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
      }
      for (var i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        permMod8[i] = perm[i] % 8;
      }
    }

    function noise2D(x, y) {
      var s = (x + y) * F2;
      var i = Math.floor(x + s);
      var j = Math.floor(y + s);
      var t = (i + j) * G2;
      var X0 = i - t;
      var Y0 = j - t;
      var x0 = x - X0;
      var y0 = y - Y0;
      var i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; }
      else { i1 = 0; j1 = 1; }
      var x1 = x0 - i1 + G2;
      var y1 = y0 - j1 + G2;
      var x2 = x0 - 1 + 2 * G2;
      var y2 = y0 - 1 + 2 * G2;
      var ii = i & 255;
      var jj = j & 255;
      var n0 = 0, n1 = 0, n2 = 0;
      var t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) {
        var gi0 = permMod8[ii + perm[jj]];
        t0 *= t0;
        n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
      }
      var t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) {
        var gi1 = permMod8[ii + i1 + perm[jj + j1]];
        t1 *= t1;
        n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
      }
      var t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) {
        var gi2 = permMod8[ii + 1 + perm[jj + 1]];
        t2 *= t2;
        n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
      }
      return 70 * (n0 + n1 + n2);
    }

    seed(42);
    return { noise2D: noise2D, seed: seed };
  })();

  // === Theme Definitions ===

  var THEMES = {
    abyss: {
      accent: [14, 165, 233],
      accent2: [56, 189, 248],
      particle: [14, 165, 233]
    },
    aurora: {
      accent: [46, 204, 113],
      accent2: [85, 239, 196],
      particle: [46, 204, 113]
    },
    ember: {
      accent: [230, 126, 34],
      accent2: [243, 156, 18],
      particle: [230, 126, 34]
    },
    nebula: {
      accent: [155, 89, 182],
      accent2: [195, 155, 211],
      particle: [155, 89, 182]
    }
  };

  // === Particle System ===

  function createParticle() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: 0,
      vy: 0,
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.3 + 0.05,
      life: Math.random() * 600 + 200,
      maxLife: 0,
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000
    };
  }

  function initParticles() {
    state.particles = [];
    var count = Math.min(Math.floor(window.innerWidth * 0.06), 50);
    for (var i = 0; i < count; i++) {
      var p = createParticle();
      p.maxLife = p.life;
      state.particles.push(p);
    }
  }

  function updateParticles() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var time = Date.now() * 0.0003;
    var theme = THEMES[state.theme];

    for (var i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      p.life--;
      if (p.life <= 0) {
        state.particles[i] = createParticle();
        state.particles[i].maxLife = state.particles[i].life;
        continue;
      }

      var noiseVal = SimplexNoise.noise2D(
        p.noiseOffsetX + time,
        p.noiseOffsetY + time
      );
      var angle = noiseVal * Math.PI * 2;
      p.vx += Math.cos(angle) * 0.02;
      p.vy += Math.sin(angle) * 0.02 - 0.01;

      var dx = state.mouseX - p.x;
      var dy = state.mouseY - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200 && dist > 0) {
        var force = (200 - dist) / 200 * 0.15;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }
  }

  function drawParticles() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    var theme = THEMES[state.theme];
    var c = theme.particle;

    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var lifeRatio = p.life / p.maxLife;
      var alpha = p.alpha * lifeRatio;
      var x = p.x * state.dpr;
      var y = p.y * state.dpr;
      var size = p.size * state.dpr;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
      ctx.fill();

      if (size > 1.5) {
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha * 0.15) + ')';
        ctx.fill();
      }
    }
  }

  // === Canvas Resize ===

  function resizeCanvas() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    particleCanvas.width = w * state.dpr;
    particleCanvas.height = h * state.dpr;
    particleCanvas.style.width = w + 'px';
    particleCanvas.style.height = h + 'px';
  }

  // === Reveal System ===

  function revealCard(card) {
    if (card.classList.contains('revealed')) return;
    card.classList.add('revealed');

    var tag = card.querySelector('.feed-tag');
    if (tag) {
      var text = tag.textContent;
      scrambleReveal(tag, text);
    }
  }

  function hideCard(card) {
    card.classList.remove('revealed');
  }

  function scrambleReveal(el, target) {
    var chars = '◇◆●○□■△▽⬡⬢◈⟐≋⊙⊕⊗';
    var len = target.length;
    var iterations = 0;
    var maxIterations = 12;

    function step() {
      if (iterations >= maxIterations) {
        el.textContent = target;
        return;
      }
      var result = '';
      for (var i = 0; i < len; i++) {
        if (i < (iterations / maxIterations) * len) {
          result += target[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      el.textContent = result;
      iterations++;
      requestAnimationFrame(step);
    }

    step();
  }

  // === Scroll-based Reveal ===

  function updateScrollReveal() {
    if (!scene) return;
    var scrollTop = scene.scrollTop;
    var scrollHeight = scene.scrollHeight - scene.clientHeight;
    state.scrollProgress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    updateDepthIndicator(state.scrollProgress);

    var cards = feedCards;
    var sceneRect = scene.getBoundingClientRect();
    var revealThreshold = sceneRect.bottom * 0.85;

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var rect = card.getBoundingClientRect();

      if (state.mode === 'scroll') {
        if (rect.top < revealThreshold && rect.bottom > sceneRect.top) {
          revealCard(card);
        }
      }
    }
  }

  // === Depth Indicator ===

  function updateDepthIndicator(progress) {
    var pct = Math.min(Math.max(progress, 0), 1) * 100;
    depthFill.style.height = pct + '%';
    depthMarker.style.top = pct + '%';

    var depth = (progress * 5).toFixed(1);
    depthLabel.textContent = depth + 'm';
  }

  // === Hover Reveal ===

  function handleHoverReveal(e) {
    if (state.mode !== 'hover') return;
    var target = e.target.closest('.feed-card');
    if (target) {
      revealCard(target);
    }
  }

  // === Click Reveal ===

  function handleClickReveal(e) {
    if (state.mode !== 'click') return;
    var target = e.target.closest('.feed-card');
    if (target && !target.classList.contains('revealed')) {
      revealCard(target);
      spawnRipple(e.clientX, e.clientY, target);
    }
  }

  // === Ripple Effect ===

  function spawnRipple(x, y, container) {
    var rect = container.getBoundingClientRect();
    var ring = document.createElement('div');
    ring.className = 'ripple-ring';
    ring.style.left = (x - rect.left) + 'px';
    ring.style.top = (y - rect.top) + 'px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.appendChild(ring);
    setTimeout(function () {
      if (ring.parentNode) ring.parentNode.removeChild(ring);
    }, 900);
  }

  // === Cursor Glow ===

  function updateCursorGlow(x, y) {
    cursorGlow.style.left = x + 'px';
    cursorGlow.style.top = y + 'px';
  }

  // === Toast ===

  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2200);
  }

  // === Mode Switch ===

  function setMode(mode) {
    state.mode = mode;
    modeButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    showToast('切换至' + (mode === 'scroll' ? '滚动揭示' : mode === 'hover' ? '悬停揭示' : '点击揭示') + '模式');
  }

  // === Theme Switch ===

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    themeDots.forEach(function (dot) {
      dot.classList.toggle('active', dot.dataset.theme === theme);
    });
  }

  // === Reset ===

  function resetDepth() {
    feedCards.forEach(function (card) {
      hideCard(card);
    });
    scene.scrollTo({ top: 0, behavior: 'smooth' });
    updateDepthIndicator(0);
    showToast('深度已重置');
  }

  // === Parallax Depth Effect ===

  function applyParallax() {
    var layers = document.querySelectorAll('.depth-layer');
    var progress = state.scrollProgress;

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var depth = parseInt(layer.dataset.depth, 10);
      var offset = (progress - depth * 0.15) * 20;
      var scale = 1 + (1 - Math.min(progress * 2, 1)) * depth * 0.01;
      var blur = Math.max(0, (1 - progress) * depth * 0.5);

      if (!state.reducedMotion) {
        layer.style.transform = 'translateY(' + offset + 'px) scale(' + scale + ')';
      }
    }
  }

  // === Animation Loop ===

  function loop() {
    if (!state.reducedMotion) {
      updateParticles();
      drawParticles();
    }
    applyParallax();
    state.animFrame = requestAnimationFrame(loop);
  }

  // === Event Bindings ===

  function bindEvents() {
    scene.addEventListener('scroll', updateScrollReveal, { passive: true });

    scene.addEventListener('mousemove', function (e) {
      var rect = scene.getBoundingClientRect();
      state.sceneMouseX = e.clientX - rect.left;
      state.sceneMouseY = e.clientY - rect.top;
      handleHoverReveal(e);
    });

    scene.addEventListener('click', handleClickReveal);

    document.addEventListener('mousemove', function (e) {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
      updateCursorGlow(e.clientX, e.clientY);
      cursorGlow.classList.add('visible');
    });

    document.addEventListener('mouseleave', function () {
      cursorGlow.classList.remove('visible');
    });

    modeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.dataset.mode);
      });
    });

    themeDots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        setTheme(dot.dataset.theme);
      });
    });

    btnReset.addEventListener('click', resetDepth);

    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        resizeCanvas();
        initParticles();
        updateScrollReveal();
      }, 150);
    });

    window.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) {
        state.mouseX = e.touches[0].clientX;
        state.mouseY = e.touches[0].clientY;
      }
    }, { passive: true });
  }

  // === Init ===

  function init() {
    resizeCanvas();
    initParticles();
    bindEvents();

    if (!state.reducedMotion) {
      state.particles.forEach(function (p) { p.maxLife = p.life; });
    }

    setTimeout(function () {
      updateScrollReveal();
      showToast('向下滚动，探索深度信息流');
    }, 400);

    loop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
