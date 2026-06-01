(function () {
  'use strict';

  // === Simplex Noise (compact) ===
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var F3 = 1 / 3;
  var G3 = 1 / 6;

  function SimplexNoise(seed) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    var p = new Uint8Array(256);
    var i;
    for (i = 0; i < 256; i++) p[i] = i;
    var s = seed || Math.random() * 65536;
    for (i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      var j = s % (i + 1);
      var tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  SimplexNoise.prototype.noise2D = function (xin, yin) {
    var perm = this.perm;
    var permMod12 = this.permMod12;
    var grad3 = this.grad3;
    var s = (xin + yin) * F2;
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var t = (i + j) * G2;
    var X0 = i - t;
    var Y0 = j - t;
    var x0 = xin - X0;
    var y0 = yin - Y0;
    var i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    var x1 = x0 - i1 + G2;
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2;
    var y2 = y0 - 1 + 2 * G2;
    var ii = i & 255;
    var jj = j & 255;
    var gi0 = permMod12[ii + perm[jj]];
    var gi1 = permMod12[ii + i1 + perm[jj + j1]];
    var gi2 = permMod12[ii + 1 + perm[jj + 1]];
    var n0, n1, n2;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  };

  SimplexNoise.prototype.noise3D = function (xin, yin, zin) {
    var perm = this.perm;
    var permMod12 = this.permMod12;
    var grad3 = this.grad3;
    var s = (xin + yin + zin) * F3;
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var k = Math.floor(zin + s);
    var t = (i + j + k) * G3;
    var x0 = xin - (i - t);
    var y0 = yin - (j - t);
    var z0 = zin - (k - t);
    var i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    var x1 = x0 - i1 + G3;
    var y1 = y0 - j1 + G3;
    var z1 = z0 - k1 + G3;
    var x2 = x0 - i2 + 2 * G3;
    var y2 = y0 - j2 + 2 * G3;
    var z2 = z0 - k2 + 2 * G3;
    var x3 = x0 - 1 + 3 * G3;
    var y3 = y0 - 1 + 3 * G3;
    var z3 = z0 - 1 + 3 * G3;
    var ii = i & 255;
    var jj = j & 255;
    var kk = k & 255;
    var gi0 = permMod12[ii + perm[jj + perm[kk]]];
    var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
    var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
    var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
    var n0, n1, n2, n3;
    var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0;
    else { t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0 + grad3[gi0][2] * z0); }
    var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0;
    else { t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1 + grad3[gi1][2] * z1); }
    var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0;
    else { t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2 + grad3[gi2][2] * z2); }
    var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0;
    else { t3 *= t3; n3 = t3 * t3 * (grad3[gi3][0] * x3 + grad3[gi3][1] * y3 + grad3[gi3][2] * z3); }
    return 32 * (n0 + n1 + n2 + n3);
  };

  // === Emotion Presets ===
  var EMOTIONS = {
    serene: {
      label: '宁静',
      stateLabel: '连绵丘陵',
      amplitude: 0.4,
      frequency: 0.6,
      octaves: 4,
      speed: 0.3,
      particleDensity: 0.3,
      particleSpeed: 0.3,
      colorBias: 0.0
    },
    joy: {
      label: '欢愉',
      stateLabel: '跳跃峰峦',
      amplitude: 0.8,
      frequency: 1.0,
      octaves: 5,
      speed: 0.7,
      particleDensity: 0.8,
      particleSpeed: 0.8,
      colorBias: 0.2
    },
    melancholy: {
      label: '忧郁',
      stateLabel: '深邃峡谷',
      amplitude: 0.6,
      frequency: 0.5,
      octaves: 3,
      speed: 0.2,
      particleDensity: 0.5,
      particleSpeed: 0.2,
      colorBias: -0.1
    },
    fury: {
      label: '愤怒',
      stateLabel: '裂变峭壁',
      amplitude: 1.0,
      frequency: 1.4,
      octaves: 6,
      speed: 1.0,
      particleDensity: 1.0,
      particleSpeed: 1.0,
      colorBias: 0.5
    },
    wonder: {
      label: '惊叹',
      stateLabel: '悬浮群岛',
      amplitude: 0.7,
      frequency: 0.8,
      octaves: 5,
      speed: 0.5,
      particleDensity: 0.7,
      particleSpeed: 0.5,
      colorBias: 0.3
    },
    fear: {
      label: '恐惧',
      stateLabel: '深渊裂隙',
      amplitude: 0.9,
      frequency: 1.2,
      octaves: 4,
      speed: 0.6,
      particleDensity: 0.6,
      particleSpeed: 0.7,
      colorBias: -0.3
    }
  };

  // === Color Palettes ===
  var PALETTES = {
    abyss: {
      low: [30, 27, 75],
      mid: [49, 46, 129],
      high: [99, 102, 241],
      peak: [165, 180, 252],
      particle: [129, 140, 248]
    },
    aurora: {
      low: [2, 44, 34],
      mid: [6, 78, 59],
      high: [20, 184, 166],
      peak: [94, 234, 212],
      particle: [45, 212, 191]
    },
    ember: {
      low: [69, 10, 10],
      mid: [153, 27, 27],
      high: [220, 38, 38],
      peak: [251, 191, 36],
      particle: [239, 68, 68]
    },
    verdant: {
      low: [5, 46, 22],
      mid: [22, 101, 52],
      high: [34, 197, 94],
      peak: [187, 247, 208],
      particle: [34, 197, 94]
    }
  };

  // === DOM Elements ===
  var terrainCanvas = document.getElementById('terrain-canvas');
  var particleCanvas = document.getElementById('particle-canvas');
  var cursorGlow = document.getElementById('cursor-glow');
  var terrainCtx = terrainCanvas.getContext('2d');
  var particleCtx = particleCanvas.getContext('2d');

  var elStatFps = document.getElementById('statFps');
  var elStatVerts = document.getElementById('statVerts');
  var elStatParticles = document.getElementById('statParticles');
  var elAltitude = document.getElementById('altitudeValue');
  var elEnergy = document.getElementById('energyValue');
  var elField = document.getElementById('fieldValue');
  var elLabelEmotion = document.getElementById('labelEmotion');
  var elLabelState = document.getElementById('labelState');

  var sliderAmplitude = document.getElementById('sliderAmplitude');
  var sliderFrequency = document.getElementById('sliderFrequency');
  var sliderSpeed = document.getElementById('sliderSpeed');
  var valAmplitude = document.getElementById('valAmplitude');
  var valFrequency = document.getElementById('valFrequency');
  var valSpeed = document.getElementById('valSpeed');

  // === State ===
  var W = window.innerWidth;
  var H = window.innerHeight;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var noise = new SimplexNoise();
  var currentEmotion = 'serene';
  var currentPalette = 'abyss';
  var interactionMode = 'explore';

  var targetParams = Object.assign({}, EMOTIONS.serene);
  var liveParams = Object.assign({}, EMOTIONS.serene);

  var mouseX = W / 2;
  var mouseY = H / 2;
  var mouseActive = false;

  var userAmplitude = 0.5;
  var userFrequency = 0.25;
  var userSpeed = 0.3;

  var time = 0;
  var pulseActive = false;
  var pulseTime = 0;
  var pulseOriginX = 0;
  var pulseOriginY = 0;

  var particles = [];
  var MAX_PARTICLES = 300;

  var fpsFrames = 0;
  var fpsLast = performance.now();
  var fpsDisplay = 60;

  // === Terrain Config ===
  var GRID_COLS = 80;
  var GRID_ROWS = 50;
  var TERRAIN_OFFSET_Y = 0.1;

  // === Canvas Resize ===
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    terrainCanvas.width = W * dpr;
    terrainCanvas.height = H * dpr;
    terrainCanvas.style.width = W + 'px';
    terrainCanvas.style.height = H + 'px';
    terrainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    particleCanvas.width = W * dpr;
    particleCanvas.height = H * dpr;
    particleCanvas.style.width = W + 'px';
    particleCanvas.style.height = H + 'px';
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // === Lerp ===
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(c1, c2, t) {
    return [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t))
    ];
  }

  // === Terrain Height ===
  function getHeight(col, row, t) {
    var freq = userFrequency * liveParams.frequency;
    var amp = userAmplitude * liveParams.amplitude;
    var spd = userSpeed * liveParams.speed;
    var oct = liveParams.octaves;

    var val = 0;
    var f = freq * 0.04;
    var a = amp;
    var nx = col * f;
    var ny = row * f;

    for (var o = 0; o < oct; o++) {
      val += a * noise.noise3D(nx + t * spd * 0.3, ny, t * spd * 0.15);
      f *= 2;
      a *= 0.5;
      nx = col * f + o * 13.7;
      ny = row * f + o * 7.3;
    }

    if (mouseActive && interactionMode === 'explore') {
      var px = (col / GRID_COLS) * W;
      var py = (row / GRID_ROWS) * H;
      var dx = px - mouseX;
      var dy = py - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var radius = 200;
      if (dist < radius) {
        var influence = 1 - dist / radius;
        influence = influence * influence;
        val += influence * amp * 0.8 * Math.sin(dist * 0.03 - t * 2);
      }
    }

    if (pulseActive) {
      var ppx = (col / GRID_COLS) * W;
      var ppy = (row / GRID_ROWS) * H;
      var pdx = ppx - pulseOriginX;
      var pdy = ppy - pulseOriginY;
      var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      var pulseRadius = (time - pulseTime) * 400;
      var pulseWidth = 120;
      var ringDist = Math.abs(pdist - pulseRadius);
      if (ringDist < pulseWidth) {
        var pulseInfluence = 1 - ringDist / pulseWidth;
        pulseInfluence = pulseInfluence * pulseInfluence;
        var decay = Math.max(0, 1 - (time - pulseTime) * 0.8);
        val += pulseInfluence * decay * amp * 1.5;
      }
      if (pulseRadius > Math.max(W, H) * 1.5) {
        pulseActive = false;
      }
    }

    return val;
  }

  // === Terrain Color ===
  function getTerrainColor(h) {
    var palette = PALETTES[currentPalette];
    h = (h + 1) * 0.5;
    h = Math.max(0, Math.min(1, h));
    var bias = liveParams.colorBias;
    h = Math.max(0, Math.min(1, h + bias * 0.2));

    if (h < 0.33) {
      return lerpColor(palette.low, palette.mid, h / 0.33);
    } else if (h < 0.66) {
      return lerpColor(palette.mid, palette.high, (h - 0.33) / 0.33);
    } else {
      return lerpColor(palette.high, palette.peak, (h - 0.66) / 0.34);
    }
  }

  // === Render Terrain ===
  function renderTerrain() {
    var colW = W / GRID_COLS;
    var rowH = H * (1 - TERRAIN_OFFSET_Y * 2) / GRID_ROWS;
    var offsetY = H * TERRAIN_OFFSET_Y;

    terrainCtx.clearRect(0, 0, W, H);

    var totalVerts = 0;
    var totalAlt = 0;
    var totalEnergy = 0;

    for (var row = 0; row < GRID_ROWS; row++) {
      terrainCtx.beginPath();

      var y0 = offsetY + row * rowH;
      var y1 = offsetY + (row + 1) * rowH;

      for (var col = 0; col <= GRID_COLS; col++) {
        var x = col * colW;

        var h0 = getHeight(col, row, time);
        var h1 = getHeight(col, row + 1, time);
        totalAlt += Math.abs(h0);
        totalEnergy += h0 * h0;

        var screenY0 = y0 + h0 * rowH * 2;
        var screenY1 = y1 + h1 * rowH * 2;

        if (col === 0) {
          terrainCtx.moveTo(x, screenY1);
        } else {
          terrainCtx.lineTo(x, screenY1);
        }
        totalVerts++;
      }

      for (var col2 = GRID_COLS; col2 >= 0; col2--) {
        var x2 = col2 * colW;
        var hBack = getHeight(col2, row, time);
        var screenYBack = y0 + hBack * rowH * 2;
        terrainCtx.lineTo(x2, screenYBack);
      }

      terrainCtx.closePath();

      var avgH = getHeight(GRID_COLS / 2, row, time);
      var color = getTerrainColor(avgH);
      var depthFade = 1 - (row / GRID_ROWS) * 0.3;

      terrainCtx.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (0.15 + depthFade * 0.6) + ')';
      terrainCtx.fill();

      if (row % 4 === 0) {
        terrainCtx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (0.08 + depthFade * 0.15) + ')';
        terrainCtx.lineWidth = 0.5;
        terrainCtx.beginPath();
        for (var col3 = 0; col3 <= GRID_COLS; col3++) {
          var x3 = col3 * colW;
          var hLine = getHeight(col3, row, time);
          var yLine = offsetY + row * rowH + hLine * rowH * 2;
          if (col3 === 0) terrainCtx.moveTo(x3, yLine);
          else terrainCtx.lineTo(x3, yLine);
        }
        terrainCtx.stroke();
      }
    }

    elStatVerts.textContent = totalVerts;
    elAltitude.textContent = (totalAlt / (GRID_COLS * GRID_ROWS)).toFixed(2);
    elEnergy.textContent = (totalEnergy / (GRID_COLS * GRID_ROWS)).toFixed(2);
  }

  // === Particle System ===
  function spawnParticle() {
    var angle = Math.random() * Math.PI * 2;
    var speed = (0.2 + Math.random() * 0.8) * liveParams.particleSpeed;
    var palette = PALETTES[currentPalette];
    var c = palette.particle;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.3,
      life: 1,
      decay: 0.002 + Math.random() * 0.005,
      size: 1.5 + Math.random() * 2.5,
      r: c[0],
      g: c[1],
      b: c[2]
    };
  }

  function updateParticles(dt) {
    var targetCount = Math.floor(MAX_PARTICLES * liveParams.particleDensity);
    while (particles.length < targetCount) {
      particles.push(spawnParticle());
    }

    var noiseInfluence = liveParams.particleSpeed * 0.5;

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];

      var nx = noise.noise2D(p.x * 0.003 + time * 0.2, p.y * 0.003) * noiseInfluence;
      var ny = noise.noise2D(p.x * 0.003, p.y * 0.003 + time * 0.2) * noiseInfluence;

      p.vx += nx * 0.05;
      p.vy += ny * 0.05;

      if (mouseActive) {
        var dx = p.x - mouseX;
        var dy = p.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 1) {
          var force = (1 - dist / 180) * 0.5;
          if (interactionMode === 'explore') {
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          } else {
            p.vx -= (dx / dist) * force * 0.3;
            p.vy -= (dy / dist) * force * 0.3;
          }
        }
      }

      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
        particles.splice(i, 1);
        continue;
      }
    }

    elStatParticles.textContent = particles.length;
  }

  function renderParticles() {
    particleCtx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var alpha = p.life * 0.6;
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      particleCtx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha + ')';
      particleCtx.fill();
    }

    if (particles.length > 1) {
      particleCtx.lineWidth = 0.4;
      for (var i2 = 0; i2 < particles.length; i2++) {
        for (var j = i2 + 1; j < Math.min(i2 + 6, particles.length); j++) {
          var a = particles[i2];
          var b = particles[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            var lineAlpha = (1 - dist / 80) * Math.min(a.life, b.life) * 0.15;
            particleCtx.beginPath();
            particleCtx.moveTo(a.x, a.y);
            particleCtx.lineTo(b.x, b.y);
            particleCtx.strokeStyle = 'rgba(' + a.r + ',' + a.g + ',' + a.b + ',' + lineAlpha + ')';
            particleCtx.stroke();
          }
        }
      }
    }
  }

  // === Update Live Params ===
  function updateLiveParams(dt) {
    var smoothing = 1 - Math.pow(0.05, dt);
    liveParams.amplitude = lerp(liveParams.amplitude, targetParams.amplitude, smoothing);
    liveParams.frequency = lerp(liveParams.frequency, targetParams.frequency, smoothing);
    liveParams.octaves = lerp(liveParams.octaves, targetParams.octaves, smoothing);
    liveParams.speed = lerp(liveParams.speed, targetParams.speed, smoothing);
    liveParams.particleDensity = lerp(liveParams.particleDensity, targetParams.particleDensity, smoothing);
    liveParams.particleSpeed = lerp(liveParams.particleSpeed, targetParams.particleSpeed, smoothing);
    liveParams.colorBias = lerp(liveParams.colorBias, targetParams.colorBias, smoothing);

    var fieldStr = (liveParams.amplitude * liveParams.frequency * liveParams.speed).toFixed(2);
    elField.textContent = fieldStr;
  }

  // === Main Loop ===
  var lastFrameTime = performance.now();

  function frame(now) {
    var dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    time += dt;

    updateLiveParams(dt);
    renderTerrain();
    updateParticles(dt);
    renderParticles();

    fpsFrames++;
    if (now - fpsLast >= 1000) {
      fpsDisplay = fpsFrames;
      fpsFrames = 0;
      fpsLast = now;
      elStatFps.textContent = fpsDisplay;
    }

    requestAnimationFrame(frame);
  }

  // === Event Handlers ===
  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseActive = true;
    cursorGlow.style.left = mouseX + 'px';
    cursorGlow.style.top = mouseY + 'px';
    if (!cursorGlow.classList.contains('visible')) {
      cursorGlow.classList.add('visible');
    }
  }

  function onMouseLeave() {
    mouseActive = false;
    cursorGlow.classList.remove('visible');
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      mouseActive = true;
    }
  }

  function onTouchEnd() {
    mouseActive = false;
  }

  function onSelectEmotion(emotionKey) {
    currentEmotion = emotionKey;
    var preset = EMOTIONS[emotionKey];
    if (!preset) return;

    targetParams = Object.assign({}, preset);

    document.querySelectorAll('.emotion-card').forEach(function (card) {
      card.classList.toggle('active', card.getAttribute('data-emotion') === emotionKey);
    });

    elLabelEmotion.textContent = preset.label;
    elLabelState.textContent = preset.stateLabel;
  }

  function onSelectPalette(paletteKey) {
    currentPalette = paletteKey;
    document.querySelectorAll('.palette-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-palette') === paletteKey);
    });
    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === paletteKey);
    });
    document.documentElement.setAttribute('data-theme', paletteKey);

    var palette = PALETTES[paletteKey];
    for (var i = 0; i < particles.length; i++) {
      particles[i].r = palette.particle[0];
      particles[i].g = palette.particle[1];
      particles[i].b = palette.particle[2];
    }
  }

  function onToggleMode(mode) {
    interactionMode = mode;
    document.querySelectorAll('.mode-label').forEach(function (label) {
      label.classList.toggle('active', label.getAttribute('data-mode') === mode);
    });
  }

  function onPulse() {
    pulseActive = true;
    pulseTime = time;
    pulseOriginX = mouseX || W / 2;
    pulseOriginY = mouseY || H / 2;
  }

  function onRegenerate() {
    noise = new SimplexNoise();
    particles.length = 0;
  }

  function onFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen();
    }
  }

  // === Bind Events ===
  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchend', onTouchEnd);

  document.querySelectorAll('.emotion-card').forEach(function (card) {
    card.addEventListener('click', function () {
      onSelectEmotion(card.getAttribute('data-emotion'));
    });
  });

  document.querySelectorAll('.palette-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      onSelectPalette(btn.getAttribute('data-palette'));
    });
  });

  document.querySelectorAll('.theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      onSelectPalette(btn.getAttribute('data-theme'));
    });
  });

  document.getElementById('interactionMode').addEventListener('click', function () {
    var next = interactionMode === 'explore' ? 'sculpt' : 'explore';
    onToggleMode(next);
  });

  document.getElementById('btnPulse').addEventListener('click', onPulse);
  document.getElementById('btnRegenerate').addEventListener('click', onRegenerate);
  document.getElementById('btnFullscreen').addEventListener('click', onFullscreen);

  sliderAmplitude.addEventListener('input', function () {
    userAmplitude = parseInt(this.value) / 100;
    valAmplitude.textContent = this.value;
  });

  sliderFrequency.addEventListener('input', function () {
    userFrequency = parseInt(this.value) / 100;
    valFrequency.textContent = this.value;
  });

  sliderSpeed.addEventListener('input', function () {
    userSpeed = parseInt(this.value) / 100;
    valSpeed.textContent = this.value;
  });

  // === Init ===
  resize();
  requestAnimationFrame(frame);

})();
