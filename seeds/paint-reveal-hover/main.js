(function () {
  'use strict';

  // === Configuration ===

  var CARDS_DATA = [
    {
      icon: '\u2728',
      title: 'Digital Garden',
      desc: '\u6bcf\u4e00\u9897\u79cd\u5b50\u90fd\u5b55\u80b2\u7740\u65e0\u9650\u53ef\u80fd\uff0c\u4ee3\u7801\u4e0e\u7f8e\u5b66\u5728\u6b64\u4ea4\u878d',
      badge: 'EDEN \u00b7 Garden',
      fogColor: '#1a1030',
      fogAccent: 'rgba(167,139,250,0.15)'
    },
    {
      icon: '\ud83c\udfa8',
      title: 'Creative Canvas',
      desc: '\u7528\u4ee3\u7801\u7ed8\u5236\u7684\u65e0\u9650\u753b\u5e03\uff0c\u6bcf\u4e00\u7b14\u89e6\u78b0\u90fd\u662f\u7075\u611f\u7684\u5ef6\u4f38',
      badge: 'EDEN \u00b7 Art',
      fogColor: '#0c1a2e',
      fogAccent: 'rgba(56,189,248,0.15)'
    },
    {
      icon: '\u26a1',
      title: 'Motion Physics',
      desc: '\u5f39\u7c27-\u963b\u5c3c\u7269\u7406\u9a71\u52a8\u7684\u975e\u7ebf\u6027\u52a8\u6548\uff0c\u81ea\u7136\u4e16\u754c\u7684\u6570\u5b57\u6620\u5c04',
      badge: 'EDEN \u00b7 Physics',
      fogColor: '#1a0c20',
      fogAccent: 'rgba(244,114,182,0.15)'
    },
    {
      icon: '\ud83c\udf0a',
      title: 'Flow Simulation',
      desc: 'Simplex \u566a\u58f0\u6d41\u573a\u9a71\u52a8\u7684\u7c92\u5b50\u6d41\u52a8\uff0c\u6307\u5c16\u4e0a\u7684\u6d41\u4f53\u529b\u5b66',
      badge: 'EDEN \u00b7 Simulation',
      fogColor: '#0a1a18',
      fogAccent: 'rgba(52,211,153,0.15)'
    },
    {
      icon: '\ud83d\udd04',
      title: 'Generative Art',
      desc: '\u7b97\u6cd5\u751f\u6210\u7684\u65e0\u9650\u53d8\u5f02\uff0c\u6bcf\u4e00\u6b21\u5237\u65b0\u90fd\u662f\u72ec\u4e00\u65e0\u4e8c\u7684\u4f5c\u54c1',
      badge: 'EDEN \u00b7 Generative',
      fogColor: '#18100a',
      fogAccent: 'rgba(251,146,60,0.15)'
    },
    {
      icon: '\ud83d\udc99',
      title: 'Interactive UX',
      desc: '\u6c89\u6d78\u5f0f\u5fae\u4ea4\u4e92\u8bbe\u8ba1\uff0c\u8ba9\u6bcf\u4e00\u6b21\u89e6\u6478\u90fd\u6210\u4e3a\u4e00\u6b21\u5bf9\u8bdd',
      badge: 'EDEN \u00b7 Interaction',
      fogColor: '#100a1a',
      fogAccent: 'rgba(139,92,246,0.15)'
    }
  ];

  var PAINT_PRESETS = {
    ink: {
      colors: ['#a78bfa', '#7c3aed', '#c4b5fd', '#6d28d9'],
      glow: 'rgba(167,139,250,0.5)',
      particleColor: '#a78bfa'
    },
    neon: {
      colors: ['#38bdf8', '#0ea5e9', '#7dd3fc', '#0284c7'],
      glow: 'rgba(56,189,248,0.5)',
      particleColor: '#38bdf8'
    },
    aurora: {
      colors: ['#34d399', '#10b981', '#6ee7b7', '#059669'],
      glow: 'rgba(52,211,153,0.5)',
      particleColor: '#34d399'
    },
    ember: {
      colors: ['#fb923c', '#f97316', '#fdba74', '#ea580c'],
      glow: 'rgba(251,146,60,0.5)',
      particleColor: '#fb923c'
    }
  };

  var REVEAL_THRESHOLD = 0.45;
  var BRUSH_SAMPLE_DIST = 8;

  // === DOM Elements ===

  var grid = document.getElementById('reveal-grid');
  var brushSizeSlider = document.getElementById('brush-size');
  var brushValueDisplay = document.getElementById('brush-value');
  var progressFill = document.getElementById('progress-fill');
  var progressText = document.getElementById('progress-text');
  var resetBtn = document.getElementById('reset-btn');
  var particleCanvas = document.getElementById('particle-canvas');
  var pCtx = particleCanvas.getContext('2d');

  // === State ===

  var currentPaint = 'ink';
  var brushRadius = 80;
  var mouseX = -200;
  var mouseY = -200;
  var prevMouseX = -200;
  var prevMouseY = -200;
  var isHoveringCard = false;
  var isPressing = false;
  var activeCard = null;
  var cards = [];
  var particles = [];
  var revealCount = 0;
  var cursorEl = null;

  // === Simplex Noise (lightweight) ===

  var noiseSeed = Date.now();
  function pseudoRandom(x, y) {
    var n = Math.sin(x * 12.9898 + y * 78.233 + noiseSeed * 0.01) * 43758.5453;
    return n - Math.floor(n);
  }
  function smoothNoise(x, y) {
    var ix = Math.floor(x);
    var iy = Math.floor(y);
    var fx = x - ix;
    var fy = y - iy;
    var sx = fx * fx * (3 - 2 * fx);
    var sy = fy * fy * (3 - 2 * fy);
    var n00 = pseudoRandom(ix, iy);
    var n10 = pseudoRandom(ix + 1, iy);
    var n01 = pseudoRandom(ix, iy + 1);
    var n11 = pseudoRandom(ix + 1, iy + 1);
    var nx0 = n00 * (1 - sx) + n10 * sx;
    var nx1 = n01 * (1 - sx) + n11 * sx;
    return nx0 * (1 - sy) + nx1 * sy;
  }
  function noise2D(x, y) {
    var total = 0;
    total += smoothNoise(x * 1, y * 1) * 0.5;
    total += smoothNoise(x * 2, y * 2) * 0.3;
    total += smoothNoise(x * 4, y * 4) * 0.2;
    return (total - 0.5) * 2;
  }

  // === Cursor ===

  function createCursor() {
    cursorEl = document.createElement('div');
    cursorEl.className = 'cursor-brush';
    cursorEl.innerHTML = '<div class="cursor-dot"></div>';
    document.body.appendChild(cursorEl);
  }

  function updateCursor() {
    if (!cursorEl) return;
    var size = brushRadius * 2;
    cursorEl.style.left = mouseX + 'px';
    cursorEl.style.top = mouseY + 'px';
    cursorEl.style.width = size + 'px';
    cursorEl.style.height = size + 'px';
    var preset = PAINT_PRESETS[currentPaint];
    cursorEl.style.borderColor = preset.colors[0];
    cursorEl.querySelector('.cursor-dot').style.background = preset.colors[0];
  }

  // === Card Creation ===

  function createCards() {
    grid.innerHTML = '';
    cards = [];
    revealCount = 0;

    CARDS_DATA.forEach(function (data, idx) {
      var card = document.createElement('div');
      card.className = 'reveal-card';
      card.dataset.index = idx;

      var content = document.createElement('div');
      content.className = 'card-content';
      content.innerHTML =
        '<div class="card-icon">' + data.icon + '</div>' +
        '<div class="card-title">' + data.title + '</div>' +
        '<div class="card-desc">' + data.desc + '</div>' +
        '<div class="card-badge">' + data.badge + '</div>';

      var fog = document.createElement('div');
      fog.className = 'fog-layer';
      fog.style.background = 'radial-gradient(ellipse at 30% 40%, ' + data.fogAccent + ', ' + data.fogColor + ' 70%)';

      var burst = document.createElement('div');
      burst.className = 'reveal-burst';

      var paintCanvas = document.createElement('canvas');
      paintCanvas.className = 'paint-canvas';

      card.appendChild(content);
      card.appendChild(fog);
      card.appendChild(burst);
      card.appendChild(paintCanvas);

      grid.appendChild(card);

      var cardObj = {
        el: card,
        canvas: paintCanvas,
        ctx: null,
        fog: fog,
        burst: burst,
        data: data,
        revealed: false,
        paintedPixels: 0,
        totalPixels: 0,
        width: 0,
        height: 0
      };

      cards.push(cardObj);
    });

    requestAnimationFrame(initCardCanvases);
  }

  function initCardCanvases() {
    cards.forEach(function (card) {
      var rect = card.el.getBoundingClientRect();
      var w = Math.floor(rect.width);
      var h = Math.floor(rect.height);
      card.canvas.width = w;
      card.canvas.height = h;
      card.width = w;
      card.height = h;
      card.totalPixels = w * h;
      card.ctx = card.canvas.getContext('2d', { willReadFrequently: true });
      drawFogFill(card);
    });
  }

  function drawFogFill(card) {
    var ctx = card.ctx;
    var w = card.width;
    var h = card.height;
    ctx.clearRect(0, 0, w, h);

    var preset = PAINT_PRESETS[currentPaint];
    var baseColor = card.data.fogColor;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    for (var i = 0; i < 12; i++) {
      var nx = noise2D(i * 0.7, 0.3) * 0.5 + 0.5;
      var ny = noise2D(0.3, i * 0.7) * 0.5 + 0.5;
      var cx = nx * w;
      var cy = ny * h;
      var r = Math.max(40, w * (0.2 + Math.abs(noise2D(i * 1.3, i * 0.9)) * 0.3));
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      var accentIdx = i % preset.colors.length;
      grad.addColorStop(0, hexToRgba(preset.colors[accentIdx], 0.12));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    for (var j = 0; j < 60; j++) {
      var px = Math.random() * w;
      var py = Math.random() * h;
      var pr = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(preset.colors[j % preset.colors.length], 0.08 + Math.random() * 0.06);
      ctx.fill();
    }
  }

  // === Paint Brush Logic ===

  function paintAtCard(card, localX, localY) {
    if (card.revealed) return;
    var ctx = card.ctx;
    var w = card.width;
    var h = card.height;
    if (!ctx || w === 0 || h === 0) return;

    var r = brushRadius;
    var preset = PAINT_PRESETS[currentPaint];

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    var grad = ctx.createRadialGradient(localX, localY, 0, localX, localY, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0.9)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(localX, localY, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Add paint splash particles at edge
    spawnPaintParticles(card, localX, localY, preset);
  }

  function paintLine(card, x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.floor(dist / BRUSH_SAMPLE_DIST));
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      paintAtCard(card, x0 + dx * t, y0 + dy * t);
    }
  }

  function checkReveal(card) {
    if (card.revealed) return;
    var ctx = card.ctx;
    var w = card.width;
    var h = card.height;
    if (!ctx || w === 0 || h === 0) return;

    var imageData = ctx.getImageData(0, 0, w, h);
    var data = imageData.data;
    var transparent = 0;
    var total = w * h;
    var step = 4;
    for (var i = 3; i < data.length; i += 4 * step) {
      if (data[i] < 30) transparent++;
    }
    var ratio = transparent / (total / step);

    if (ratio >= REVEAL_THRESHOLD) {
      revealCard(card);
    }
  }

  function revealCard(card) {
    card.revealed = true;
    card.el.classList.add('revealed');
    card.el.classList.add('bursting');
    card.burst.style.background = 'radial-gradient(circle, ' + PAINT_PRESETS[currentPaint].glow + ', transparent 70%)';

    setTimeout(function () {
      card.el.classList.remove('bursting');
      card.ctx.clearRect(0, 0, card.width, card.height);
    }, 700);

    revealCount++;
    updateProgress();

    if (revealCount === cards.length) {
      showToast('\u2728 \u6240\u6709\u753b\u5e03\u5df2\u63ed\u793a\uff01\u6bcf\u4e00\u5c42\u8272\u5f69\u4e0b\u90fd\u85cf\u7740\u65e0\u9650\u53ef\u80fd');
    }
  }

  // === Particles ===

  function spawnPaintParticles(card, lx, ly, preset) {
    var cardRect = card.el.getBoundingClientRect();
    var gx = cardRect.left + lx;
    var gy = cardRect.top + ly;
    for (var i = 0; i < 3; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 0.5 + Math.random() * 1.5;
      particles.push({
        x: gx,
        y: gy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: preset.colors[Math.floor(Math.random() * preset.colors.length)]
      });
    }
  }

  function updateParticles() {
    pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      pCtx.save();
      pCtx.globalAlpha = p.life * 0.8;
      pCtx.fillStyle = p.color;
      pCtx.shadowColor = p.color;
      pCtx.shadowBlur = 8;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.restore();
    }

    // Ambient floating particles
    if (Math.random() < 0.15) {
      var preset = PAINT_PRESETS[currentPaint];
      particles.push({
        x: Math.random() * particleCanvas.width,
        y: particleCanvas.height + 5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.5,
        life: 1,
        decay: 0.004 + Math.random() * 0.004,
        size: 1 + Math.random() * 2,
        color: preset.colors[Math.floor(Math.random() * preset.colors.length)]
      });
    }
  }

  // === Progress ===

  function updateProgress() {
    var pct = Math.round((revealCount / cards.length) * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = pct + '%';
  }

  // === Toast ===

  function showToast(msg) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 500);
    }, 3000);
  }

  // === Utilities ===

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // === Resize ===

  function resizeParticleCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }

  // === Event Handlers ===

  function onMouseMove(e) {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    updateCursor();

    if (cursorEl && !cursorEl.classList.contains('visible')) {
      cursorEl.classList.add('visible');
    }

    // Find which card (if any) is under cursor
    var found = null;
    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].el.getBoundingClientRect();
      if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
        found = cards[i];
        break;
      }
    }

    if (found) {
      if (activeCard !== found) {
        activeCard = found;
        isHoveringCard = true;
      }
      var r = found.el.getBoundingClientRect();
      var localX = mouseX - r.left;
      var localY = mouseY - r.top;

      if (isPressing) {
        var prevLocalX = prevMouseX - r.left;
        var prevLocalY = prevMouseY - r.top;
        paintLine(found, prevLocalX, prevLocalY, localX, localY);
      }
    } else {
      activeCard = null;
      isHoveringCard = false;
    }
  }

  function onMouseDown(e) {
    isPressing = true;
    if (cursorEl) cursorEl.classList.add('pressing');

    if (activeCard && !activeCard.revealed) {
      var r = activeCard.el.getBoundingClientRect();
      var localX = mouseX - r.left;
      var localY = mouseY - r.top;
      paintAtCard(activeCard, localX, localY);
    }
  }

  function onMouseUp() {
    isPressing = false;
    if (cursorEl) cursorEl.classList.remove('pressing');

    if (activeCard) {
      checkReveal(activeCard);
    }
  }

  function onMouseLeave() {
    isPressing = false;
    isHoveringCard = false;
    activeCard = null;
    if (cursorEl) cursorEl.classList.remove('pressing', 'visible');
  }

  // Touch support
  function onTouchStart(e) {
    var touch = e.touches[0];
    mouseX = touch.clientX;
    mouseY = touch.clientY;
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    isPressing = true;

    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].el.getBoundingClientRect();
      if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
        activeCard = cards[i];
        var r = cards[i].el.getBoundingClientRect();
        paintAtCard(cards[i], mouseX - r.left, mouseY - r.top);
        break;
      }
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    var touch = e.touches[0];
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = touch.clientX;
    mouseY = touch.clientY;

    if (activeCard && !activeCard.revealed) {
      var r = activeCard.el.getBoundingClientRect();
      var localX = mouseX - r.left;
      var localY = mouseY - r.top;
      var prevLocalX = prevMouseX - r.left;
      var prevLocalY = prevMouseY - r.top;
      paintLine(activeCard, prevLocalX, prevLocalY, localX, localY);
    }
  }

  function onTouchEnd() {
    isPressing = false;
    if (activeCard) checkReveal(activeCard);
    activeCard = null;
  }

  // === Animation Loop ===

  function loop() {
    updateParticles();
    requestAnimationFrame(loop);
  }

  // === Init ===

  function init() {
    resizeParticleCanvas();
    createCursor();
    createCards();

    brushSizeSlider.addEventListener('input', function () {
      brushRadius = parseInt(this.value, 10);
      brushValueDisplay.textContent = brushRadius + 'px';
      updateCursor();
    });

    var paintBtns = document.querySelectorAll('.paint-btn');
    paintBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        paintBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentPaint = btn.dataset.paint;
        updateCursor();
      });
    });

    resetBtn.addEventListener('click', function () {
      createCards();
      updateProgress();
      showToast('\u753b\u5e03\u5df2\u91cd\u7f6e \u2014 \u518d\u6b21\u60ac\u505c\u5e76\u6309\u4e0b\u9f20\u6807\u5f00\u59cb\u63ed\u793a');
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', function () {
      resizeParticleCanvas();
      initCardCanvases();
    });

    updateProgress();
    loop();

    setTimeout(function () {
      showToast('\u60ac\u505c\u753b\u5e03\u5e76\u6309\u4e0b\u9f20\u6807\uff0c\u8ba9\u8272\u5f69\u63ed\u793a\u9690\u85cf\u5185\u5bb9');
    }, 800);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
