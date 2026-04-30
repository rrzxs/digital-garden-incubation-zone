(function () {
  'use strict';

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var TAU = Math.PI * 2;
  var EPS = 0.0001;

  var PALETTES = {
    aurora: ['#00ffc8', '#0affdb', '#7b61ff', '#00d4aa'],
    ember: ['#ff6b35', '#ff2e63', '#ffc857', '#ff8a5c'],
    ocean: ['#0077b6', '#00b4d8', '#90e0ef', '#48cae4'],
    void: ['#c77dff', '#9d4edd', '#e0aaff', '#7b2cbf']
  };

  var GRADIENT_COLORS = {
    aurora: ['#0a2e2e', '#1a0a3e', '#001a2e'],
    ember: ['#2e0a0a', '#3e1a0a', '#2e1500'],
    ocean: ['#001a2e', '#0a1e3e', '#001020'],
    void: ['#1a0a2e', '#200a3e', '#10002e']
  };

  // === State ===
  var state = {
    mode: 'swarm',
    palette: 'aurora',
    agentCount: 80,
    cohesion: 0.5,
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    mousePressed: false,
    syncRate: 0,
    time: 0,
    pulseActive: false,
    pulseTime: 0,
    pulseOrigin: null,
    agents: [],
    trails: []
  };

  // === DOM ===
  var crowdCanvas, crowdCtx;
  var fluidCanvas, fluidCtx;
  var syncRateEl, agentCountEl, syncWave, cursorField;
  var agentSlider, agentSliderVal, cohesionSlider, cohesionVal;

  // === Init ===
  function init() {
    crowdCanvas = document.getElementById('crowd-canvas');
    crowdCtx = crowdCanvas.getContext('2d');
    fluidCanvas = document.getElementById('fluid-bg');
    fluidCtx = fluidCanvas.getContext('2d');

    syncRateEl = document.getElementById('sync-rate');
    agentCountEl = document.getElementById('agent-count');
    syncWave = document.getElementById('sync-wave');
    cursorField = document.getElementById('cursor-field');

    agentSlider = document.getElementById('agent-slider');
    agentSliderVal = document.getElementById('agent-slider-val');
    cohesionSlider = document.getElementById('cohesion-slider');
    cohesionVal = document.getElementById('cohesion-val');

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    createAgents(state.agentCount);
    bindEvents();
    createCursorRing();
    requestAnimationFrame(loop);
  }

  function resizeCanvases() {
    var area = document.querySelector('.canvas-area');
    var dpr = window.devicePixelRatio || 1;

    crowdCanvas.width = area.clientWidth * dpr;
    crowdCanvas.height = area.clientHeight * dpr;
    crowdCanvas.style.width = area.clientWidth + 'px';
    crowdCanvas.style.height = area.clientHeight + 'px';
    crowdCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fluidCanvas.width = window.innerWidth * dpr;
    fluidCanvas.height = window.innerHeight * dpr;
    fluidCanvas.style.width = window.innerWidth + 'px';
    fluidCanvas.style.height = window.innerHeight + 'px';
    fluidCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // === Agent ===
  function createAgent(x, y) {
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      ax: 0,
      ay: 0,
      phase: Math.random() * TAU,
      size: 2.5 + Math.random() * 2,
      colorIndex: Math.floor(Math.random() * 4),
      trail: [],
      syncLevel: 0
    };
  }

  function createAgents(count) {
    var area = document.querySelector('.canvas-area');
    var w = area.clientWidth;
    var h = area.clientHeight;
    state.agents = [];
    for (var i = 0; i < count; i++) {
      state.agents.push(createAgent(
        w * 0.2 + Math.random() * w * 0.6,
        h * 0.2 + Math.random() * h * 0.6
      ));
    }
  }

  // === Events ===
  function bindEvents() {
    var area = document.querySelector('.canvas-area');

    area.addEventListener('mousemove', function (e) {
      var rect = area.getBoundingClientRect();
      state.mouseX = e.clientX - rect.left;
      state.mouseY = e.clientY - rect.top;
      state.mouseActive = true;
      updateCursorRing(e.clientX, e.clientY);
    });

    area.addEventListener('mouseleave', function () {
      state.mouseActive = false;
    });

    area.addEventListener('mousedown', function (e) {
      state.mousePressed = true;
      triggerSyncPulse(state.mouseX, state.mouseY);
    });

    area.addEventListener('mouseup', function () {
      state.mousePressed = false;
    });

    area.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var t = e.touches[0];
      var rect = area.getBoundingClientRect();
      state.mouseX = t.clientX - rect.left;
      state.mouseY = t.clientY - rect.top;
      state.mouseActive = true;
      state.mousePressed = true;
      triggerSyncPulse(state.mouseX, state.mouseY);
    }, { passive: false });

    area.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var t = e.touches[0];
      var rect = area.getBoundingClientRect();
      state.mouseX = t.clientX - rect.left;
      state.mouseY = t.clientY - rect.top;
    }, { passive: false });

    area.addEventListener('touchend', function () {
      state.mouseActive = false;
      state.mousePressed = false;
    });

    document.getElementById('mode-group').addEventListener('click', function (e) {
      var btn = e.target.closest('.ctrl-btn');
      if (!btn) return;
      this.querySelectorAll('.ctrl-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
    });

    document.getElementById('palette-group').addEventListener('click', function (e) {
      var btn = e.target.closest('.ctrl-btn');
      if (!btn) return;
      this.querySelectorAll('.ctrl-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.palette = btn.dataset.palette;
      document.body.setAttribute('data-palette', state.palette);
    });

    document.getElementById('pulse-btn').addEventListener('click', function () {
      var area2 = document.querySelector('.canvas-area');
      triggerSyncPulse(area2.clientWidth / 2, area2.clientHeight / 2);
    });

    agentSlider.addEventListener('input', function () {
      var val = parseInt(this.value);
      agentSliderVal.textContent = val;
      agentCountEl.textContent = val;
      state.agentCount = val;
      createAgents(val);
    });

    cohesionSlider.addEventListener('input', function () {
      var val = parseInt(this.value) / 100;
      cohesionVal.textContent = val.toFixed(2);
      state.cohesion = val;
    });
  }

  function createCursorRing() {
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    cursorField.appendChild(ring);
  }

  function updateCursorRing(clientX, clientY) {
    var area = document.querySelector('.canvas-area');
    var rect = area.getBoundingClientRect();
    var ring = cursorField.querySelector('.cursor-ring');
    if (!ring) return;
    ring.style.left = (clientX - rect.left) + 'px';
    ring.style.top = (clientY - rect.top) + 'px';
    ring.classList.toggle('pressing', state.mousePressed);
  }

  function triggerSyncPulse(x, y) {
    state.pulseActive = true;
    state.pulseTime = state.time;
    state.pulseOrigin = { x: x, y: y };

    syncWave.classList.remove('active');
    void syncWave.offsetWidth;
    syncWave.classList.add('active');

    setTimeout(function () {
      syncWave.classList.remove('active');
    }, 1300);
  }

  // === Physics ===
  function updateAgents(dt) {
    var area = document.querySelector('.canvas-area');
    var w = area.clientWidth;
    var h = area.clientHeight;
    var agents = state.agents;
    var n = agents.length;

    var cohesionStrength = state.cohesion;
    var separationDist = 28;
    var neighborDist = 100;

    for (var i = 0; i < n; i++) {
      var a = agents[i];
      a.ax = 0;
      a.ay = 0;

      var sumX = 0, sumY = 0, sumVx = 0, sumVy = 0;
      var sepX = 0, sepY = 0;
      var neighbors = 0;

      for (var j = 0; j < n; j++) {
        if (i === j) continue;
        var b = agents[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy) + EPS;

        if (dist < neighborDist) {
          sumX += b.x;
          sumY += b.y;
          sumVx += b.vx;
          sumVy += b.vy;
          neighbors++;

          if (dist < separationDist) {
            sepX -= dx / dist;
            sepY -= dy / dist;
          }
        }
      }

      if (neighbors > 0) {
        var avgX = sumX / neighbors;
        var avgY = sumY / neighbors;
        a.ax += (avgX - a.x) * 0.003 * cohesionStrength;
        a.ay += (avgY - a.y) * 0.003 * cohesionStrength;

        var avgVx = sumVx / neighbors;
        var avgVy = sumVy / neighbors;
        a.ax += (avgVx - a.vx) * 0.05 * cohesionStrength;
        a.ay += (avgVy - a.vy) * 0.05 * cohesionStrength;
      }

      a.ax += sepX * 0.15;
      a.ay += sepY * 0.15;

      if (state.mouseActive) {
        var mdx = state.mouseX - a.x;
        var mdy = state.mouseY - a.y;
        var mDist = Math.sqrt(mdx * mdx + mdy * mdy) + EPS;
        var mRadius = 200;

        if (mDist < mRadius) {
          var mForce = (1 - mDist / mRadius) * 0.8;
          if (state.mousePressed) {
            a.ax += (mdx / mDist) * mForce * 1.5;
            a.ay += (mdy / mDist) * mForce * 1.5;
          } else {
            a.ax -= (mdx / mDist) * mForce * 0.3;
            a.ay -= (mdy / mDist) * mForce * 0.3;
          }
        }
      }

      applyModeForce(a, i, n, w, h, dt);

      if (state.pulseActive && state.pulseOrigin) {
        var elapsed = state.time - state.pulseTime;
        if (elapsed < 2.0) {
          var pdx = a.x - state.pulseOrigin.x;
          var pdy = a.y - state.pulseOrigin.y;
          var pDist = Math.sqrt(pdx * pdx + pdy * pdy) + EPS;
          var waveRadius = elapsed * 600;
          var waveDelta = Math.abs(pDist - waveRadius);
          if (waveDelta < 80) {
            var intensity = (1 - waveDelta / 80) * (1 - elapsed / 2.0);
            a.ax += (pdx / pDist) * intensity * 8;
            a.ay += (pdy / pDist) * intensity * 8;
            a.syncLevel = Math.min(1, a.syncLevel + intensity * 0.3);
          }
        } else {
          state.pulseActive = false;
        }
      }

      a.vx += a.ax;
      a.vy += a.ay;

      var speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy) + EPS;
      var maxSpeed = 4;
      if (speed > maxSpeed) {
        a.vx = (a.vx / speed) * maxSpeed;
        a.vy = (a.vy / speed) * maxSpeed;
      }

      a.vx *= 0.98;
      a.vy *= 0.98;

      a.x += a.vx;
      a.y += a.vy;

      var margin = 20;
      if (a.x < margin) { a.x = margin; a.vx *= -0.5; }
      if (a.x > w - margin) { a.x = w - margin; a.vx *= -0.5; }
      if (a.y < margin) { a.y = margin; a.vy *= -0.5; }
      if (a.y > h - margin) { a.y = h - margin; a.vy *= -0.5; }

      a.syncLevel *= 0.97;

      a.trail.push({ x: a.x, y: a.y });
      if (a.trail.length > 12) a.trail.shift();
    }

    computeSyncRate();
  }

  function applyModeForce(a, index, total, w, h, dt) {
    var cx = w / 2;
    var cy = h / 2;
    var t = state.time;

    switch (state.mode) {
      case 'swarm':
        var wx = Math.sin(t * 0.5 + index * 0.02) * 0.03;
        var wy = Math.cos(t * 0.7 + index * 0.03) * 0.03;
        a.ax += wx;
        a.ay += wy;
        break;

      case 'orbit': {
        var dx = a.x - cx;
        var dy = a.y - cy;
        var dist = Math.sqrt(dx * dx + dy * dy) + EPS;
        var targetR = Math.min(w, h) * 0.3;
        var radial = (targetR - dist) * 0.01;
        a.ax += (dx / dist) * radial;
        a.ay += (dy / dist) * radial;
        a.ax += (-dy / dist) * 1.5;
        a.ay += (dx / dist) * 1.5;
        break;
      }

      case 'fountain': {
        var fx = a.x - cx;
        var fy = a.y - cy;
        var fDist = Math.sqrt(fx * fx + fy * fy) + EPS;
        var gravity = 0.08;
        a.ay += gravity;
        if (a.y > h * 0.85) {
          a.vy = -(3 + Math.random() * 4);
          a.vx = (Math.random() - 0.5) * 3;
        }
        a.ax += Math.sin(t * 2 + index) * 0.04;
        break;
      }

      case 'breath': {
        var phase = t * 0.8 + index * (TAU / total);
        var breathScale = 0.5 + 0.5 * Math.sin(phase);
        var bx = a.x - cx;
        var by = a.y - cy;
        var bDist = Math.sqrt(bx * bx + by * by) + EPS;
        var targetDist = breathScale * Math.min(w, h) * 0.35;
        var bForce = (targetDist - bDist) * 0.02;
        a.ax += (bx / bDist) * bForce;
        a.ay += (by / bDist) * bForce;
        break;
      }
    }
  }

  function computeSyncRate() {
    var agents = state.agents;
    var n = agents.length;
    if (n < 2) { state.syncRate = 0; return; }

    var avgVx = 0, avgVy = 0;
    for (var i = 0; i < n; i++) {
      avgVx += agents[i].vx;
      avgVy += agents[i].vy;
    }
    avgVx /= n;
    avgVy /= n;

    var alignment = 0;
    for (var i = 0; i < n; i++) {
      var dot = agents[i].vx * avgVx + agents[i].vy * avgVy;
      var magA = Math.sqrt(agents[i].vx * agents[i].vx + agents[i].vy * agents[i].vy) + EPS;
      var magB = Math.sqrt(avgVx * avgVx + avgVy * avgVy) + EPS;
      alignment += dot / (magA * magB);
    }
    alignment /= n;

    var syncPct = Math.max(0, Math.min(1, (alignment + 1) / 2));
    state.syncRate += (syncPct - state.syncRate) * 0.08;
  }

  // === Rendering ===
  function renderCrowd() {
    var area = document.querySelector('.canvas-area');
    var w = area.clientWidth;
    var h = area.clientHeight;
    var ctx = crowdCtx;

    ctx.clearRect(0, 0, w, h);

    var colors = PALETTES[state.palette];
    var agents = state.agents;

    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];
      var color = colors[a.colorIndex % colors.length];

      if (a.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(a.trail[0].x, a.trail[0].y);
        for (var t = 1; t < a.trail.length; t++) {
          ctx.lineTo(a.trail[t].x, a.trail[t].y);
        }
        ctx.strokeStyle = hexToRgba(color, 0.15);
        ctx.lineWidth = a.size * 0.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      var glowSize = a.size * (2 + a.syncLevel * 4);
      var grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, Math.max(EPS, glowSize));
      grad.addColorStop(0, hexToRgba(color, 0.4 + a.syncLevel * 0.4));
      grad.addColorStop(0.5, hexToRgba(color, 0.1));
      grad.addColorStop(1, hexToRgba(color, 0));
      ctx.beginPath();
      ctx.arc(a.x, a.y, Math.max(EPS, glowSize), 0, TAU);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(a.x, a.y, Math.max(EPS, a.size), 0, TAU);
      ctx.fillStyle = hexToRgba(color, 0.85 + a.syncLevel * 0.15);
      ctx.fill();
    }

    if (state.mouseActive) {
      var mGrad = ctx.createRadialGradient(state.mouseX, state.mouseY, 0, state.mouseX, state.mouseY, 150);
      mGrad.addColorStop(0, hexToRgba(colors[0], state.mousePressed ? 0.08 : 0.03));
      mGrad.addColorStop(1, hexToRgba(colors[0], 0));
      ctx.beginPath();
      ctx.arc(state.mouseX, state.mouseY, 150, 0, TAU);
      ctx.fillStyle = mGrad;
      ctx.fill();
    }

    drawConnectionLines(ctx, agents, colors);
  }

  function drawConnectionLines(ctx, agents, colors) {
    var maxDist = 60;
    ctx.lineWidth = 0.5;

    for (var i = 0; i < agents.length; i++) {
      for (var j = i + 1; j < agents.length; j++) {
        var dx = agents[j].x - agents[i].x;
        var dy = agents[j].y - agents[i].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          var alpha = (1 - dist / maxDist) * 0.12;
          ctx.beginPath();
          ctx.moveTo(agents[i].x, agents[i].y);
          ctx.lineTo(agents[j].x, agents[j].y);
          ctx.strokeStyle = hexToRgba(colors[0], alpha);
          ctx.stroke();
        }
      }
    }
  }

  function renderFluidBg() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var ctx = fluidCtx;
    var t = state.time;

    ctx.fillStyle = GRADIENT_COLORS[state.palette][0] || '#080810';
    ctx.fillRect(0, 0, w, h);

    var orbs = [
      {
        x: w * 0.3 + Math.sin(t * 0.2) * w * 0.15,
        y: h * 0.4 + Math.cos(t * 0.3) * h * 0.15,
        r: Math.max(EPS, w * 0.35),
        color: PALETTES[state.palette][0]
      },
      {
        x: w * 0.7 + Math.cos(t * 0.25) * w * 0.1,
        y: h * 0.6 + Math.sin(t * 0.35) * h * 0.1,
        r: Math.max(EPS, w * 0.3),
        color: PALETTES[state.palette][2]
      },
      {
        x: w * 0.5 + Math.sin(t * 0.15) * w * 0.2,
        y: h * 0.3 + Math.cos(t * 0.2) * h * 0.2,
        r: Math.max(EPS, w * 0.25),
        color: PALETTES[state.palette][1]
      }
    ];

    ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < orbs.length; i++) {
      var orb = orbs[i];
      var grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
      grad.addColorStop(0, hexToRgba(orb.color, 0.12));
      grad.addColorStop(0.5, hexToRgba(orb.color, 0.04));
      grad.addColorStop(1, hexToRgba(orb.color, 0));
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r, 0, TAU);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function updateUI() {
    syncRateEl.textContent = Math.round(state.syncRate * 100) + '%';
  }

  // === Loop ===
  var lastTime = 0;

  function loop(timestamp) {
    var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    state.time += dt;

    updateAgents(dt);
    renderFluidBg();
    renderCrowd();
    updateUI();

    requestAnimationFrame(loop);
  }

  // === Helpers ===
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
