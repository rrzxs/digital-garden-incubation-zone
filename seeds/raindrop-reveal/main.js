(function () {
  'use strict';

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  var THEMES = {
    ocean: {
      fog: '#0a1628',
      fogStops: ['#0a1628', '#0d1f3c', '#122a4a'],
      accent: '#4fc3f7',
      accent2: '#7c4dff',
      accent3: '#00e5ff',
      glow: 'rgba(79, 195, 247, 0.35)',
      dropColor: [79, 195, 247],
      ringColor: 'rgba(79, 195, 247, 0.3)'
    },
    aurora: {
      fog: '#071a12',
      fogStops: ['#071a12', '#0d2e1f', '#0a3325'],
      accent: '#69f0ae',
      accent2: '#448aff',
      accent3: '#00e676',
      glow: 'rgba(105, 240, 174, 0.35)',
      dropColor: [105, 240, 174],
      ringColor: 'rgba(105, 240, 174, 0.3)'
    },
    ember: {
      fog: '#1a0e08',
      fogStops: ['#1a0e08', '#2a1610', '#3a1e14'],
      accent: '#ff6e40',
      accent2: '#ffd740',
      accent3: '#ff9100',
      glow: 'rgba(255, 110, 64, 0.35)',
      dropColor: [255, 110, 64],
      ringColor: 'rgba(255, 110, 64, 0.3)'
    },
    nebula: {
      fog: '#12061a',
      fogStops: ['#12061a', '#1c0e2e', '#261040'],
      accent: '#e040fb',
      accent2: '#536dfe',
      accent3: '#d500f9',
      glow: 'rgba(224, 64, 251, 0.35)',
      dropColor: [224, 64, 251],
      ringColor: 'rgba(224, 64, 251, 0.3)'
    }
  };

  var HIDDEN_CONTENTS = [
    { title: '数字花园', body: '每一颗种子都孕育着无限可能。在这里，代码与美学交融，交互与灵感碰撞，创造属于你的数字宇宙。', badge: 'maintainer: EDEN' },
    { title: '万物生长', body: '从混沌中涌现秩序，从像素中绽放生命。数字花园是创造力的温室，每一个交互都是一次灵感的萌芽。', badge: 'seed: infinite' },
    { title: 'Pixel Dreams', body: '像素是梦的原子，代码是现实的诗句。当算法与审美共振，平凡屏幕便化为通往无限可能的窗口。', badge: 'mode: creative' },
    { title: '流体诗篇', body: '如水般流动的界面，如诗般呼吸的动效。在数字花园中，每一次触碰都激起涟漪，每一帧都值得驻足。', badge: 'flow: dynamic' },
    { title: 'Neon Genesis', body: '光与影的边界在此消融。赛博与自然不再对立，而是共同编织出一张属于未来的体验之网。', badge: 'era: neon' }
  ];

  // === DOM Elements ===
  var stage = document.getElementById('reveal-stage');
  var rainCanvas = document.getElementById('rain-canvas');
  var revealCanvas = document.getElementById('reveal-canvas');
  var hiddenLayer = document.getElementById('hidden-layer');
  var cursorDrop = document.getElementById('cursor-drop');
  var progressFill = document.getElementById('progress-fill');
  var progressText = document.getElementById('progress-text');
  var toastEl = document.getElementById('toast');
  var btnReset = document.getElementById('btn-reset');

  // === Canvas Contexts ===
  var rainCtx = rainCanvas.getContext('2d');
  var revealCtx = revealCanvas.getContext('2d');

  // === State ===
  var currentTheme = 'ocean';
  var currentMode = 'draw';
  var isDrawing = false;
  var isRevealed = false;
  var contentIndex = 0;
  var revealPercent = 0;
  var stageRect = null;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var drops = [];
  var ripples = [];
  var raindrops = [];
  var mouseX = -100;
  var mouseY = -100;
  var stageMouseX = -1;
  var stageMouseY = -1;
  var lastDrawX = -1;
  var lastDrawY = -1;

  // === Simplex Noise (compact) ===
  var perm = new Uint8Array(512);
  var grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];

  function initNoise() {
    var p = [];
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) perm[i] = p[i & 255];
  }

  function dot3(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }

  function noise3D(xin, yin, zin) {
    var F3 = 1/3, G3 = 1/6;
    var s = (xin + yin + zin) * F3;
    var i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    var t = (i + j + k) * G3;
    var X0 = i - t, Y0 = j - t, Z0 = k - t;
    var x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
    var i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    var x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
    var x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
    var x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
    var ii=i&255, jj=j&255, kk=k&255;
    var n0=0,n1=0,n2=0,n3=0;
    var t0=0.6-x0*x0-y0*y0-z0*z0;
    if(t0>=0){t0*=t0;n0=t0*t0*dot3(grad3[perm[ii+perm[jj+perm[kk]]]%12],x0,y0,z0);}
    var t1=0.6-x1*x1-y1*y1-z1*z1;
    if(t1>=0){t1*=t1;n1=t1*t1*dot3(grad3[perm[ii+i1+perm[jj+j1+perm[kk+k1]]]%12],x1,y1,z1);}
    var t2=0.6-x2*x2-y2*y2-z2*z2;
    if(t2>=0){t2*=t2;n2=t2*t2*dot3(grad3[perm[ii+i2+perm[jj+j2+perm[kk+k2]]]%12],x2,y2,z2);}
    var t3=0.6-x3*x3-y3*y3-z3*z3;
    if(t3>=0){t3*=t3;n3=t3*t3*dot3(grad3[perm[ii+1+perm[jj+1+perm[kk+1]]]%12],x3,y3,z3);}
    return 32*(n0+n1+n2+n3);
  }

  // === Canvas Setup ===
  function resizeCanvases() {
    stageRect = stage.getBoundingClientRect();
    var w = stageRect.width;
    var h = stageRect.height;

    rainCanvas.width = w * dpr;
    rainCanvas.height = h * dpr;
    rainCanvas.style.width = w + 'px';
    rainCanvas.style.height = h + 'px';
    rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    revealCanvas.width = w * dpr;
    revealCanvas.height = h * dpr;
    revealCanvas.style.width = w + 'px';
    revealCanvas.style.height = h + 'px';
    revealCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawFogLayer();
  }

  function drawFogLayer() {
    var w = stageRect.width;
    var h = stageRect.height;
    var theme = THEMES[currentTheme];
    var time = performance.now() * 0.0003;

    revealCtx.clearRect(0, 0, w, h);

    var imgData = revealCtx.createImageData(Math.ceil(w * dpr), Math.ceil(h * dpr));
    var data = imgData.data;

    for (var py = 0; py < Math.ceil(h * dpr); py++) {
      for (var px = 0; px < Math.ceil(w * dpr); px++) {
        var sx = px / dpr;
        var sy = py / dpr;

        var n1 = noise3D(sx * 0.005, sy * 0.005, time);
        var n2 = noise3D(sx * 0.012, sy * 0.012, time * 1.3) * 0.5;
        var n3 = noise3D(sx * 0.002, sy * 0.002, time * 0.7) * 0.3;
        var val = (n1 + n2 + n3 + 1) * 0.5;
        val = Math.max(0, Math.min(1, val));

        var fogR = parseInt(theme.fog.slice(1,3), 16);
        var fogG = parseInt(theme.fog.slice(3,5), 16);
        var fogB = parseInt(theme.fog.slice(5,7), 16);

        var highlight = Math.pow(val, 2) * 30;

        var idx = (py * Math.ceil(w * dpr) + px) * 4;
        data[idx] = Math.min(255, fogR + highlight);
        data[idx + 1] = Math.min(255, fogG + highlight * 0.8);
        data[idx + 2] = Math.min(255, fogB + highlight * 0.6);
        data[idx + 3] = 255;
      }
    }

    revealCtx.putImageData(imgData, 0, 0);
    isRevealed = false;
    revealPercent = 0;
    updateProgress();
    hiddenLayer.classList.remove('revealed');
  }

  // === Raindrop System ===
  function createDrop(x, y, radius) {
    var theme = THEMES[currentTheme];
    drops.push({
      x: x,
      y: y,
      radius: radius || 20,
      maxRadius: radius || 20,
      opacity: 1,
      life: 1,
      decay: 0.015 + Math.random() * 0.01,
      color: theme.dropColor
    });
  }

  function createRipple(x, y) {
    var theme = THEMES[currentTheme];
    ripples.push({
      x: x,
      y: y,
      radius: 5,
      maxRadius: 80 + Math.random() * 40,
      opacity: 0.6,
      speed: 1.5 + Math.random() * 0.5,
      color: theme.accent
    });
  }

  function createAutoRaindrop() {
    if (!stageRect) return;
    var x = Math.random() * stageRect.width;
    var y = -10;
    var speed = 2 + Math.random() * 3;
    var size = 8 + Math.random() * 12;
    var theme = THEMES[currentTheme];
    raindrops.push({
      x: x,
      y: y,
      speed: speed,
      size: size,
      opacity: 0.3 + Math.random() * 0.4,
      color: theme.dropColor,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03
    });
  }

  // === Reveal Logic ===
  function revealAt(x, y, radius) {
    if (isRevealed) return;

    revealCtx.save();
    revealCtx.globalCompositeOperation = 'destination-out';

    var gradient = revealCtx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    gradient.addColorStop(0.85, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    revealCtx.fillStyle = gradient;
    revealCtx.beginPath();
    revealCtx.arc(x, y, radius, 0, Math.PI * 2);
    revealCtx.fill();
    revealCtx.restore();

    calculateRevealPercent();
  }

  function calculateRevealPercent() {
    var w = Math.ceil(stageRect.width * dpr);
    var h = Math.ceil(stageRect.height * dpr);

    var sampleSize = 80;
    var revealed = 0;
    var total = 0;

    var imgData = revealCtx.getImageData(0, 0, w, h);
    var data = imgData.data;

    var stepX = Math.floor(w / sampleSize);
    var stepY = Math.floor(h / sampleSize);

    for (var sy = 0; sy < sampleSize; sy++) {
      for (var sx = 0; sx < sampleSize; sx++) {
        var px = Math.min(sx * stepX, w - 1);
        var py = Math.min(sy * stepY, h - 1);
        var idx = (py * w + px) * 4;
        var alpha = data[idx + 3];
        total++;
        if (alpha < 128) revealed++;
      }
    }

    revealPercent = Math.min(100, Math.round((revealed / total) * 100));
    updateProgress();

    if (revealPercent >= 70 && !isRevealed) {
      completeReveal();
    }
  }

  function updateProgress() {
    progressFill.style.width = revealPercent + '%';
    progressText.textContent = revealPercent + '%';
  }

  function completeReveal() {
    isRevealed = true;

    revealCtx.clearRect(0, 0, stageRect.width, stageRect.height);
    revealPercent = 100;
    updateProgress();
    hiddenLayer.classList.add('revealed');
    showToast('揭示完成！点击重置体验下一幅');

    spawnCelebrationDrops();
  }

  function spawnCelebrationDrops() {
    var w = stageRect.width;
    var h = stageRect.height;
    for (var i = 0; i < 30; i++) {
      (function(idx) {
        setTimeout(function() {
          createDrop(
            Math.random() * w,
            Math.random() * h,
            15 + Math.random() * 30
          );
          createRipple(
            Math.random() * w,
            Math.random() * h
          );
        }, idx * 50);
      })(i);
    }
  }

  // === Drawing ===
  function drawBetween(x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(dist / 8));
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var cx = x0 + dx * t;
      var cy = y0 + dy * t;
      revealAt(cx, cy, 22 + Math.sin(t * Math.PI) * 8);
      if (Math.random() < 0.3) {
        createDrop(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20, 6 + Math.random() * 8);
      }
    }
  }

  // === Animation Loop ===
  function animate() {
    requestAnimationFrame(animate);
    if (!stageRect) return;

    var w = stageRect.width;
    var h = stageRect.height;

    rainCtx.clearRect(0, 0, w, h);

    if (currentMode === 'rain' && !isRevealed) {
      if (Math.random() < 0.15) createAutoRaindrop();
    }

    for (var i = raindrops.length - 1; i >= 0; i--) {
      var rd = raindrops[i];
      rd.y += rd.speed;
      rd.wobble += rd.wobbleSpeed;
      rd.x += Math.sin(rd.wobble) * 0.5;

      var alpha = rd.opacity;
      rainCtx.save();
      rainCtx.globalAlpha = alpha;

      rainCtx.beginPath();
      rainCtx.ellipse(rd.x, rd.y, rd.size * 0.35, rd.size, 0, 0, Math.PI * 2);
      var grad = rainCtx.createRadialGradient(rd.x, rd.y, 0, rd.x, rd.y, rd.size);
      grad.addColorStop(0, 'rgba(' + rd.color[0] + ',' + rd.color[1] + ',' + rd.color[2] + ',0.6)');
      grad.addColorStop(1, 'rgba(' + rd.color[0] + ',' + rd.color[1] + ',' + rd.color[2] + ',0)');
      rainCtx.fillStyle = grad;
      rainCtx.fill();
      rainCtx.restore();

      if (rd.y >= h) {
        revealAt(rd.x, h - 5, rd.size * 0.8);
        createRipple(rd.x, h - 5);
        raindrops.splice(i, 1);
      }
    }

    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.life -= d.decay;
      d.opacity = d.life;
      d.radius = d.maxRadius * d.life;

      if (d.life <= 0) {
        drops.splice(i, 1);
        continue;
      }

      rainCtx.save();
      rainCtx.globalAlpha = d.opacity * 0.6;
      var grad = rainCtx.createRadialGradient(d.x, d.y, 0, d.x, d.y, Math.max(1, d.radius));
      grad.addColorStop(0, 'rgba(' + d.color[0] + ',' + d.color[1] + ',' + d.color[2] + ',0.5)');
      grad.addColorStop(0.6, 'rgba(' + d.color[0] + ',' + d.color[1] + ',' + d.color[2] + ',0.2)');
      grad.addColorStop(1, 'rgba(' + d.color[0] + ',' + d.color[1] + ',' + d.color[2] + ',0)');
      rainCtx.fillStyle = grad;
      rainCtx.beginPath();
      rainCtx.arc(d.x, d.y, Math.max(1, d.radius), 0, Math.PI * 2);
      rainCtx.fill();
      rainCtx.restore();
    }

    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      r.radius += r.speed;
      r.opacity -= 0.008;

      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        ripples.splice(i, 1);
        continue;
      }

      rainCtx.save();
      rainCtx.globalAlpha = r.opacity;
      rainCtx.strokeStyle = r.color;
      rainCtx.lineWidth = 1.5;
      rainCtx.beginPath();
      rainCtx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      rainCtx.stroke();
      rainCtx.restore();

      if (currentMode === 'ripple' && !isRevealed && r.radius < r.maxRadius * 0.6) {
        revealAt(r.x, r.y, r.radius * 0.4);
      }
    }

    if (stageMouseX >= 0 && stageMouseY >= 0 && !isRevealed) {
      rainCtx.save();
      var glowRad = 60;
      var glowGrad = rainCtx.createRadialGradient(stageMouseX, stageMouseY, 0, stageMouseX, stageMouseY, glowRad);
      var theme = THEMES[currentTheme];
      glowGrad.addColorStop(0, 'rgba(' + theme.dropColor[0] + ',' + theme.dropColor[1] + ',' + theme.dropColor[2] + ',0.08)');
      glowGrad.addColorStop(1, 'rgba(' + theme.dropColor[0] + ',' + theme.dropColor[1] + ',' + theme.dropColor[2] + ',0)');
      rainCtx.fillStyle = glowGrad;
      rainCtx.beginPath();
      rainCtx.arc(stageMouseX, stageMouseY, glowRad, 0, Math.PI * 2);
      rainCtx.fill();
      rainCtx.restore();
    }
  }

  // === Event Handling ===
  function getStagePos(e) {
    if (!stageRect) return { x: -1, y: -1 };
    var touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - stageRect.left,
      y: touch.clientY - stageRect.top
    };
  }

  function onPointerDown(e) {
    e.preventDefault();
    isDrawing = true;
    var pos = getStagePos(e);
    stageMouseX = pos.x;
    stageMouseY = pos.y;
    lastDrawX = pos.x;
    lastDrawY = pos.y;

    if (currentMode === 'draw' && !isRevealed) {
      revealAt(pos.x, pos.y, 24);
      createDrop(pos.x, pos.y, 14);
      createRipple(pos.x, pos.y);
    } else if (currentMode === 'ripple' && !isRevealed) {
      for (var i = 0; i < 5; i++) {
        (function(idx) {
          setTimeout(function() {
            var ox = pos.x + (Math.random() - 0.5) * 60;
            var oy = pos.y + (Math.random() - 0.5) * 60;
            createRipple(ox, oy);
            revealAt(ox, oy, 30);
          }, idx * 100);
        })(i);
      }
    }

    cursorDrop.classList.add('pressing');
  }

  function onPointerMove(e) {
    e.preventDefault();
    var pos = getStagePos(e);
    stageMouseX = pos.x;
    stageMouseY = pos.y;

    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouseX = clientX;
    mouseY = clientY;
    cursorDrop.style.left = clientX + 'px';
    cursorDrop.style.top = clientY + 'px';

    if (!isDrawing) return;

    if (currentMode === 'draw' && !isRevealed && lastDrawX >= 0) {
      drawBetween(lastDrawX, lastDrawY, pos.x, pos.y);
    }

    lastDrawX = pos.x;
    lastDrawY = pos.y;
  }

  function onPointerUp() {
    isDrawing = false;
    lastDrawX = -1;
    lastDrawY = -1;
    cursorDrop.classList.remove('pressing');
  }

  stage.addEventListener('mousedown', onPointerDown);
  stage.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  stage.addEventListener('touchstart', onPointerDown, { passive: false });
  stage.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  stage.addEventListener('mouseenter', function() {
    cursorDrop.classList.add('active');
  });
  stage.addEventListener('mouseleave', function() {
    cursorDrop.classList.remove('active');
    stageMouseX = -1;
    stageMouseY = -1;
  });

  // === Mode Buttons ===
  var modeBtns = document.querySelectorAll('.mode-btn');
  modeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      modeBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentMode = btn.getAttribute('data-mode');

      if (currentMode === 'rain') {
        showToast('降雨模式：雨滴自动落下揭示画面');
      } else if (currentMode === 'draw') {
        showToast('绘制模式：拖拽鼠标擦去迷雾');
      } else if (currentMode === 'ripple') {
        showToast('涟漪模式：点击产生扩散涟漪');
      }
    });
  });

  // === Theme Dots ===
  var themeDots = document.querySelectorAll('.theme-dot');
  themeDots.forEach(function(dot) {
    dot.addEventListener('click', function() {
      themeDots.forEach(function(d) { d.classList.remove('active'); });
      dot.classList.add('active');
      currentTheme = dot.getAttribute('data-theme');
      var theme = THEMES[currentTheme];

      document.documentElement.style.setProperty('--accent-1', theme.accent);
      document.documentElement.style.setProperty('--accent-2', theme.accent2);
      document.documentElement.style.setProperty('--accent-3', theme.accent3);
      document.documentElement.style.setProperty('--raindrop-glow', theme.glow);

      drawFogLayer();
      showToast('配色已切换');
    });
  });

  // === Reset ===
  btnReset.addEventListener('click', function() {
    contentIndex = (contentIndex + 1) % HIDDEN_CONTENTS.length;
    var content = HIDDEN_CONTENTS[contentIndex];

    hiddenLayer.querySelector('.hidden-title').textContent = content.title;
    hiddenLayer.querySelector('.hidden-body').textContent = content.body;
    hiddenLayer.querySelector('.hidden-badge').textContent = content.badge;

    hiddenLayer.classList.remove('revealed');
    isRevealed = false;
    revealPercent = 0;
    drops = [];
    ripples = [];
    raindrops = [];
    updateProgress();
    drawFogLayer();
    showToast('画布已重置 — 新内容已就绪');
  });

  // === Toast ===
  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove('visible');
    }, 2500);
  }

  // === Resize ===
  var resizeTimer = null;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      resizeCanvases();
    }, 150);
  });

  // === Init ===
  initNoise();
  resizeCanvases();
  animate();

  setTimeout(function() {
    showToast('点击或拖拽，让雨滴揭示隐藏的世界');
  }, 600);

})();
