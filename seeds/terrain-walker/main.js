(function () {
  'use strict';

  // === SIMPLEX NOISE ===

  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var F3 = 1 / 3;
  var G3 = 1 / 6;

  var grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];

  function SimplexNoise(seed) {
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    var p = new Uint8Array(256);
    var s = seed || 42;
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var i2 = 255; i2 > 0; i2--) {
      s = (s * 16807 + 0) % 2147483647;
      var j = s % (i2 + 1);
      var tmp = p[i2];
      p[i2] = p[j];
      p[j] = tmp;
    }
    for (var k = 0; k < 512; k++) {
      this.perm[k] = p[k & 255];
      this.permMod12[k] = this.perm[k] % 12;
    }
  }

  SimplexNoise.prototype.noise2D = function (xin, yin) {
    var perm = this.perm;
    var permMod12 = this.permMod12;
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

    var n0 = 0, n1 = 0, n2 = 0;

    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      var gi0 = permMod12[ii + perm[jj]];
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      var gi1 = permMod12[ii + i1 + perm[jj + j1]];
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      var gi2 = permMod12[ii + 1 + perm[jj + 1]];
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  };

  SimplexNoise.prototype.noise3D = function (xin, yin, zin) {
    var perm = this.perm;
    var permMod12 = this.permMod12;
    var s = (xin + yin + zin) * F3;
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var k = Math.floor(zin + s);
    var t = (i + j + k) * G3;
    var X0 = i - t;
    var Y0 = j - t;
    var Z0 = k - t;
    var x0 = xin - X0;
    var y0 = yin - Y0;
    var z0 = zin - Z0;

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

    var n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      var gi0 = permMod12[ii + perm[jj + perm[kk]]];
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0 + grad3[gi0][2] * z0);
    }

    var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1 + grad3[gi1][2] * z1);
    }

    var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2 + grad3[gi2][2] * z2);
    }

    var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
      t3 *= t3;
      n3 = t3 * t3 * (grad3[gi3][0] * x3 + grad3[gi3][1] * y3 + grad3[gi3][2] * z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  };

  // === PALETTES ===

  var PALETTES = {
    midnight: {
      wire: [56, 189, 248],
      wireDim: [30, 100, 160],
      fill: [12, 30, 60],
      fillHighlight: [20, 60, 120],
      walker: [56, 189, 248],
      walkerGlow: 'rgba(56, 189, 248, 0.4)',
      particle: [100, 200, 255],
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.3)',
      blobs: ['#0c4a6e', '#1e1b4b', '#164e63', '#312e81'],
      heightStops: [
        [0, 8, 20],
        [0.2, 15, 50, 100],
        [0.5, 20, 80, 160],
        [0.8, 56, 189, 248],
        [1, 200, 230, 255]
      ]
    },
    aurora: {
      wire: [45, 212, 191],
      wireDim: [20, 120, 100],
      fill: [6, 40, 30],
      fillHighlight: [15, 80, 60],
      walker: [45, 212, 191],
      walkerGlow: 'rgba(45, 212, 191, 0.4)',
      particle: [110, 231, 183],
      accent: '#2dd4bf',
      accentGlow: 'rgba(45, 212, 191, 0.3)',
      blobs: ['#0f2027', '#2c5364', '#134e4a', '#064e3b'],
      heightStops: [
        [0, 6, 30, 25],
        [0.3, 15, 80, 60],
        [0.6, 45, 212, 191],
        [0.85, 167, 243, 208],
        [1, 220, 255, 240]
      ]
    },
    ember: {
      wire: [249, 115, 22],
      wireDim: [140, 50, 10],
      fill: [40, 12, 6],
      fillHighlight: [90, 30, 10],
      walker: [251, 146, 60],
      walkerGlow: 'rgba(251, 146, 60, 0.4)',
      particle: [253, 186, 116],
      accent: '#f97316',
      accentGlow: 'rgba(249, 115, 22, 0.3)',
      blobs: ['#431407', '#7c2d12', '#1c1917', '#451a03'],
      heightStops: [
        [0, 40, 10, 5],
        [0.25, 100, 30, 10],
        [0.5, 200, 60, 15],
        [0.75, 249, 115, 22],
        [1, 253, 224, 71]
      ]
    },
    nebula: {
      wire: [167, 139, 250],
      wireDim: [80, 50, 140],
      fill: [20, 15, 50],
      fillHighlight: [50, 30, 100],
      walker: [196, 181, 253],
      walkerGlow: 'rgba(196, 181, 253, 0.4)',
      particle: [200, 190, 255],
      accent: '#a78bfa',
      accentGlow: 'rgba(167, 139, 250, 0.3)',
      blobs: ['#2e1065', '#4a1a6b', '#1e1b4b', '#312e81'],
      heightStops: [
        [0, 20, 12, 45],
        [0.25, 50, 25, 90],
        [0.5, 100, 60, 180],
        [0.75, 167, 139, 250],
        [1, 230, 220, 255]
      ]
    }
  };

  // === STATE ===

  var GRID_SIZE = 64;
  var CELL_SIZE = 14;

  var state = {
    width: 0,
    height: 0,
    palette: 'midnight',
    mode: 'walk',
    noise: null,
    noiseSeed: 42,
    amplitude: 80,
    frequency: 0.035,
    walkSpeed: 0.5,
    time: 0,

    walker: {
      x: GRID_SIZE / 2,
      z: GRID_SIZE / 2,
      vx: 0,
      vz: 0,
      targetVx: 0,
      targetVz: 0,
      trail: [],
      maxTrail: 60,
      bobPhase: 0
    },

    camera: {
      rotX: -0.65,
      rotY: 0,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      targetRotX: -0.65,
      targetRotY: 0,
      targetZoom: 1.0,
      targetPanX: 0,
      targetPanY: 0
    },

    mouse: { x: 0, y: 0, down: false, button: 0, lastX: 0, lastY: 0 },
    keys: {},
    particles: [],
    maxParticles: 80,
    hasInteracted: false,

    lastTime: 0,
    frameCount: 0,
    fpsAccum: 0,
    fps: 60
  };

  var terrainCanvas, terrainCtx, overlayCanvas, overlayCtx;
  var wrapper, overlayEl, cursorGlow;
  var statFps, statX, statZ, statH;

  // === INIT ===

  function init() {
    terrainCanvas = document.getElementById('terrainCanvas');
    overlayCanvas = document.getElementById('overlayCanvas');
    terrainCtx = terrainCanvas.getContext('2d');
    overlayCtx = overlayCanvas.getContext('2d');
    wrapper = document.getElementById('canvasWrapper');
    overlayEl = document.getElementById('canvasOverlay');
    cursorGlow = document.getElementById('cursor-glow');
    statFps = document.getElementById('statFps');
    statX = document.getElementById('statX');
    statZ = document.getElementById('statZ');
    statH = document.getElementById('statH');

    generateNoise();
    resizeCanvas();
    initParticles();
    bindEvents();
    bindControls();
    requestAnimationFrame(loop);
  }

  function generateNoise() {
    state.noise = new SimplexNoise(state.noiseSeed);
  }

  function resizeCanvas() {
    var rect = wrapper.getBoundingClientRect();
    var w = Math.floor(rect.width);
    var h = Math.floor(rect.height);
    terrainCanvas.width = w;
    terrainCanvas.height = h;
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    state.width = w;
    state.height = h;
    initParticles();
  }

  // === TERRAIN HEIGHT ===

  function getHeight(x, z) {
    var n = state.noise;
    var freq = state.frequency;
    var amp = state.amplitude;
    var val = 0;
    val += n.noise2D(x * freq, z * freq) * amp;
    val += n.noise2D(x * freq * 2.1, z * freq * 2.1) * amp * 0.45;
    val += n.noise2D(x * freq * 4.3, z * freq * 4.3) * amp * 0.2;
    val += n.noise2D(x * freq * 8.7, z * freq * 8.7) * amp * 0.08;
    return val;
  }

  function getHeightNorm(x, z) {
    return getHeight(x, z) / state.amplitude;
  }

  // === 3D PROJECTION ===

  function project(px, py, pz) {
    var cam = state.camera;
    var cx = state.width / 2 + cam.panX;
    var cy = state.height * 0.72 + cam.panY;

    var cosY = Math.cos(cam.rotY);
    var sinY = Math.sin(cam.rotY);
    var cosX = Math.cos(cam.rotX);
    var sinX = Math.sin(cam.rotX);

    var rx = px * cosY - pz * sinY;
    var rz = px * sinY + pz * cosY;
    var ry = py;

    var ry2 = ry * cosX - rz * sinX;
    var rz2 = ry * sinX + rz * cosX;

    var perspective = 900 * cam.zoom;
    var scale = perspective / (perspective + rz2 + 500);

    return {
      x: cx + rx * scale,
      y: cy - ry2 * scale,
      scale: scale,
      depth: rz2
    };
  }

  // === PARTICLES ===

  function initParticles() {
    state.particles = [];
    for (var i = 0; i < state.maxParticles; i++) {
      state.particles.push(createParticle());
    }
  }

  function createParticle() {
    var w = state.width;
    var h = state.height;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.15 - 0.1,
      radius: 0.8 + Math.random() * 1.5,
      alpha: 0.08 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.6
    };
  }

  function updateParticles(dt) {
    var w = state.width;
    var h = state.height;
    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      p.phase += p.speed * 0.02 * dt;
      p.vx += (Math.random() - 0.5) * 0.02 * dt;
      p.vy += (Math.random() - 0.5) * 0.01 * dt - 0.003 * dt;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0) p.x += w;
      if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      if (p.y > h) p.y -= h;
    }
  }

  function renderParticles() {
    var ctx = overlayCtx;
    var pal = PALETTES[state.palette];
    var col = pal.particle;
    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var breathe = 0.5 + 0.5 * Math.sin(p.phase);
      var a = p.alpha * (0.3 + breathe * 0.7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (0.7 + breathe * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a + ')';
      ctx.fill();
    }
  }

  // === TERRAIN RENDERING ===

  function lerpColor(stops, t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i][0] && t <= stops[i + 1][0]) {
        var range = stops[i + 1][0] - stops[i][0];
        var frac = range > 0 ? (t - stops[i][0]) / range : 0;
        return [
          stops[i][1] + (stops[i + 1][1] - stops[i][1]) * frac,
          stops[i][2] + (stops[i + 1][2] - stops[i][2]) * frac,
          stops[i][3] + (stops[i + 1][3] - stops[i][3]) * frac
        ];
      }
    }
    var last = stops[stops.length - 1];
    return [last[1], last[2], last[3]];
  }

  function renderTerrain() {
    var ctx = terrainCtx;
    var w = state.width;
    var h = state.height;
    var pal = PALETTES[state.palette];
    var time = state.time;

    ctx.clearRect(0, 0, w, h);

    var gridW = GRID_SIZE;
    var gridH = GRID_SIZE;
    var halfGrid = gridW / 2;
    var cs = CELL_SIZE;

    var cols = gridW + 1;
    var rows = gridH + 1;
    var projected = new Array(rows * cols);
    var heights = new Float32Array(rows * cols);

    for (var gz = 0; gz < rows; gz++) {
      for (var gx = 0; gx < cols; gx++) {
        var wx = gx * cs - halfGrid * cs;
        var wz = gz * cs - halfGrid * cs;
        var hy = getHeight(gx, gz + time * 0.15);
        var idx = gz * cols + gx;
        heights[idx] = hy;
        projected[idx] = project(wx, hy, wz);
      }
    }

    var quads = [];
    for (var gz2 = 0; gz2 < gridH; gz2++) {
      for (var gx2 = 0; gx2 < gridW; gx2++) {
        var i00 = gz2 * cols + gx2;
        var i10 = gz2 * cols + gx2 + 1;
        var i01 = (gz2 + 1) * cols + gx2;
        var i11 = (gz2 + 1) * cols + gx2 + 1;

        var avgDepth = (projected[i00].depth + projected[i10].depth + projected[i01].depth + projected[i11].depth) * 0.25;
        var avgH = (heights[i00] + heights[i10] + heights[i01] + heights[i11]) * 0.25;
        var normH = avgH / state.amplitude;

        quads.push({
          pts: [projected[i00], projected[i10], projected[i11], projected[i01]],
          depth: avgDepth,
          normH: normH,
          gx: gx2,
          gz: gz2
        });
      }
    }

    quads.sort(function (a, b) { return b.depth - a.depth; });

    for (var qi = 0; qi < quads.length; qi++) {
      var q = quads[qi];
      var color = lerpColor(pal.heightStops, (q.normH + 1) * 0.5);

      var fogFactor = Math.max(0, Math.min(1, 1 - q.depth / 1200));
      var r = Math.floor(color[0] * fogFactor);
      var g = Math.floor(color[1] * fogFactor);
      var b = Math.floor(color[2] * fogFactor);

      ctx.beginPath();
      ctx.moveTo(q.pts[0].x, q.pts[0].y);
      ctx.lineTo(q.pts[1].x, q.pts[1].y);
      ctx.lineTo(q.pts[2].x, q.pts[2].y);
      ctx.lineTo(q.pts[3].x, q.pts[3].y);
      ctx.closePath();
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fill();

      var wc = pal.wireDim;
      var wa = 0.12 + fogFactor * 0.2;
      ctx.strokeStyle = 'rgba(' + wc[0] + ',' + wc[1] + ',' + wc[2] + ',' + wa + ')';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // === WALKER ===

  function updateWalker(dt) {
    var w = state.walker;
    var speed = state.walkSpeed;

    if (state.mode === 'walk') {
      var dx = 0, dz = 0;
      if (state.keys['ArrowUp'] || state.keys['KeyW']) dz -= 1;
      if (state.keys['ArrowDown'] || state.keys['KeyS']) dz += 1;
      if (state.keys['ArrowLeft'] || state.keys['KeyA']) dx -= 1;
      if (state.keys['ArrowRight'] || state.keys['KeyD']) dx += 1;

      var len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        dx /= len;
        dz /= len;
      }

      w.targetVx = dx * speed * 0.4;
      w.targetVz = dz * speed * 0.4;

      w.vx += (w.targetVx - w.vx) * 0.08 * dt;
      w.vz += (w.targetVz - w.vz) * 0.08 * dt;

      w.x += w.vx * dt;
      w.z += w.vz * dt;

      w.x = Math.max(0, Math.min(GRID_SIZE, w.x));
      w.z = Math.max(0, Math.min(GRID_SIZE, w.z));

      var moving = Math.abs(w.vx) > 0.01 || Math.abs(w.vz) > 0.01;
      if (moving) {
        w.bobPhase += 0.12 * dt;
      }

      if (moving && state.time % 1.5 < dt * 0.02) {
        w.trail.unshift({ x: w.x, z: w.z });
        if (w.trail.length > w.maxTrail) w.trail.pop();
      }

      state.camera.targetPanX = 0;
      state.camera.targetPanY = 0;
    }
  }

  function renderWalker() {
    var ctx = overlayCtx;
    var w = state.walker;
    var pal = PALETTES[state.palette];
    var cs = CELL_SIZE;
    var halfGrid = GRID_SIZE / 2;

    if (w.trail.length > 1) {
      ctx.beginPath();
      for (var ti = 0; ti < w.trail.length; ti++) {
        var tp = w.trail[ti];
        var twx = tp.x * cs - halfGrid * cs;
        var twz = tp.z * cs - halfGrid * cs;
        var thy = getHeight(tp.x, tp.z + state.time * 0.15);
        var tproj = project(twx, thy + 2, twz);
        if (ti === 0) ctx.moveTo(tproj.x, tproj.y);
        else ctx.lineTo(tproj.x, tproj.y);
      }
      var tc = pal.walker;
      ctx.strokeStyle = 'rgba(' + tc[0] + ',' + tc[1] + ',' + tc[2] + ',0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    var wx = w.x * cs - halfGrid * cs;
    var wz = w.z * cs - halfGrid * cs;
    var wh = getHeight(w.x, w.z + state.time * 0.15);
    var bob = Math.sin(w.bobPhase) * 3 * (Math.abs(w.vx) + Math.abs(w.vz)) * 2;
    var wproj = project(wx, wh + 8 + bob, wz);

    var grad = ctx.createRadialGradient(wproj.x, wproj.y, 0, wproj.x, wproj.y, 24 * wproj.scale);
    grad.addColorStop(0, pal.walkerGlow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(wproj.x, wproj.y, 24 * wproj.scale, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    var markerSize = 5 * wproj.scale;
    ctx.beginPath();
    ctx.arc(wproj.x, wproj.y, markerSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + pal.walker[0] + ',' + pal.walker[1] + ',' + pal.walker[2] + ',0.9)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(wproj.x, wproj.y, markerSize * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();

    var ringPhase = state.time * 1.5;
    var ringScale = 0.8 + Math.sin(ringPhase) * 0.2;
    ctx.beginPath();
    ctx.arc(wproj.x, wproj.y, markerSize * 2.5 * ringScale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(' + pal.walker[0] + ',' + pal.walker[1] + ',' + pal.walker[2] + ',' + (0.15 + Math.sin(ringPhase) * 0.1) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // === CAMERA ===

  function updateCamera(dt) {
    var cam = state.camera;
    var lerp = 0.06 * dt;
    cam.rotX += (cam.targetRotX - cam.rotX) * lerp;
    cam.rotY += (cam.targetRotY - cam.rotY) * lerp;
    cam.zoom += (cam.targetZoom - cam.zoom) * lerp;
    cam.panX += (cam.targetPanX - cam.panX) * lerp;
    cam.panY += (cam.targetPanY - cam.panY) * lerp;
  }

  // === MAIN LOOP ===

  function loop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    var rawDt = (timestamp - state.lastTime) / 16.667;
    var dt = Math.min(rawDt, 3);
    state.lastTime = timestamp;
    state.time += dt * 0.05 * state.walkSpeed;

    state.fpsAccum += rawDt;
    state.frameCount++;
    if (state.fpsAccum >= 60) {
      state.fps = Math.round(state.frameCount / (state.fpsAccum / 60));
      state.frameCount = 0;
      state.fpsAccum = 0;
      updateStats();
    }

    updateCamera(dt);
    updateWalker(dt);
    updateParticles(dt);

    renderTerrain();

    overlayCtx.clearRect(0, 0, state.width, state.height);
    renderParticles();
    renderWalker();

    requestAnimationFrame(loop);
  }

  function updateStats() {
    statFps.textContent = state.fps;
    statX.textContent = Math.round(state.walker.x);
    statZ.textContent = Math.round(state.walker.z);
    var h = getHeight(state.walker.x, state.walker.z + state.time * 0.15);
    statH.textContent = Math.round(h);
  }

  // === EVENTS ===

  function hideOverlay() {
    if (!state.hasInteracted) {
      state.hasInteracted = true;
      overlayEl.classList.add('hidden');
    }
  }

  function bindEvents() {
    wrapper.addEventListener('mousedown', function (e) {
      e.preventDefault();
      state.mouse.down = true;
      state.mouse.button = e.button;
      state.mouse.lastX = e.clientX;
      state.mouse.lastY = e.clientY;
      hideOverlay();
    });

    window.addEventListener('mousemove', function (e) {
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top = e.clientY + 'px';

      if (state.mouse.down) {
        var dx = e.clientX - state.mouse.lastX;
        var dy = e.clientY - state.mouse.lastY;

        if (state.mouse.button === 0) {
          state.camera.targetRotY += dx * 0.005;
          state.camera.targetRotX += dy * 0.005;
          state.camera.targetRotX = Math.max(-1.2, Math.min(-0.15, state.camera.targetRotX));
        }

        state.mouse.lastX = e.clientX;
        state.mouse.lastY = e.clientY;
      }
    });

    window.addEventListener('mouseup', function () {
      state.mouse.down = false;
    });

    wrapper.addEventListener('wheel', function (e) {
      e.preventDefault();
      state.camera.targetZoom -= e.deltaY * 0.0008;
      state.camera.targetZoom = Math.max(0.3, Math.min(3.0, state.camera.targetZoom));
    }, { passive: false });

    wrapper.addEventListener('touchstart', function (e) {
      e.preventDefault();
      hideOverlay();
      if (e.touches.length === 1) {
        state.mouse.down = true;
        state.mouse.button = 0;
        state.mouse.lastX = e.touches[0].clientX;
        state.mouse.lastY = e.touches[0].clientY;
      }
    }, { passive: false });

    wrapper.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (e.touches.length === 1 && state.mouse.down) {
        var dx = e.touches[0].clientX - state.mouse.lastX;
        var dy = e.touches[0].clientY - state.mouse.lastY;
        state.camera.targetRotY += dx * 0.005;
        state.camera.targetRotX += dy * 0.005;
        state.camera.targetRotX = Math.max(-1.2, Math.min(-0.15, state.camera.targetRotX));
        state.mouse.lastX = e.touches[0].clientX;
        state.mouse.lastY = e.touches[0].clientY;
      }
    }, { passive: false });

    wrapper.addEventListener('touchend', function () {
      state.mouse.down = false;
    });

    document.addEventListener('mouseenter', function () {
      cursorGlow.classList.add('visible');
    });

    document.addEventListener('mouseleave', function () {
      cursorGlow.classList.remove('visible');
    });

    window.addEventListener('keydown', function (e) {
      state.keys[e.code] = true;
      hideOverlay();
    });

    window.addEventListener('keyup', function (e) {
      state.keys[e.code] = false;
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 200);
    });
  }

  // === CONTROLS ===

  function setPalette(name) {
    state.palette = name;
    var pal = PALETTES[name];

    document.documentElement.style.setProperty('--accent', pal.accent);
    document.documentElement.style.setProperty('--accent-glow', pal.accentGlow);

    var blobs = document.querySelectorAll('.blob');
    for (var i = 0; i < blobs.length && i < pal.blobs.length; i++) {
      blobs[i].style.background = 'radial-gradient(circle, ' + pal.blobs[i] + ' 0%, transparent 70%)';
    }

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

    if (mode === 'orbit') {
      state.camera.targetRotX = -0.85;
      wrapper.style.cursor = 'grab';
    } else {
      state.camera.targetRotX = -0.65;
      wrapper.style.cursor = 'grab';
    }
  }

  function bindControls() {
    document.getElementById('sliderAmplitude').addEventListener('input', function (e) {
      state.amplitude = parseInt(e.target.value, 10);
    });

    document.getElementById('sliderFrequency').addEventListener('input', function (e) {
      state.frequency = parseInt(e.target.value, 10) / 1000;
    });

    document.getElementById('sliderSpeed').addEventListener('input', function (e) {
      state.walkSpeed = parseInt(e.target.value, 10) / 100;
    });

    document.querySelectorAll('.palette-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPalette(btn.dataset.palette);
      });
    });

    document.getElementById('modeToggle').addEventListener('click', function () {
      setMode(state.mode === 'walk' ? 'orbit' : 'walk');
    });

    document.getElementById('modeToggle').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setMode(state.mode === 'walk' ? 'orbit' : 'walk');
      }
    });

    document.getElementById('btnRegenerate').addEventListener('click', function () {
      state.noiseSeed = Math.floor(Math.random() * 999999);
      generateNoise();
      state.walker.trail = [];
    });

    document.getElementById('btnFullscreen').addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen();
      }
    });
  }

  // === BOOTSTRAP ===

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
