(function () {
  'use strict';

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  var PALETTES = {
    aurora: { a: '#06b6d4', b: '#8b5cf6', c: '#f472b6', bg1: 'rgba(6,182,212,0.18)', bg2: 'rgba(139,92,246,0.14)' },
    ember:  { a: '#f97316', b: '#ef4444', c: '#fbbf24', bg1: 'rgba(249,115,22,0.18)', bg2: 'rgba(239,68,68,0.14)' },
    jade:   { a: '#10b981', b: '#06b6d4', c: '#34d399', bg1: 'rgba(16,185,129,0.18)', bg2: 'rgba(6,182,212,0.14)' },
    violet: { a: '#a855f7', b: '#ec4899', c: '#c084fc', bg1: 'rgba(168,85,247,0.18)', bg2: 'rgba(236,72,153,0.14)' }
  };

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var mouse = { x: -9999, y: -9999, active: false };
  var pulses = [];
  var agents = [];

  var state = {
    formation: 'flock',
    palette: 'aurora',
    agentCount: 300,
    cohesion: 0.5,
    wander: 0.4,
    trail: 0.6,
    paused: false,
    time: 0
  };

  var fpsSamples = [];
  var lastFrameTime = performance.now();

  var MAX_TRAIL = 12;

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return { r: r, g: g, b: b };
  }

  function lerpColor(c1, c2, t) {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t)
    };
  }

  function pal() {
    return PALETTES[state.palette];
  }

  function agentColor(norm) {
    var p = pal();
    var c1 = hexToRgb(p.a);
    var c2 = hexToRgb(p.b);
    var c3 = hexToRgb(p.c);
    var mid = lerpColor(c1, c2, norm);
    var final = lerpColor(mid, c3, Math.sin(norm * Math.PI) * 0.3);
    return final;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createAgent(i, total) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 1 + Math.random() * 1.5;
    var norm = i / Math.max(total - 1, 1);
    return {
      x: W * 0.2 + Math.random() * W * 0.6,
      y: H * 0.2 + Math.random() * H * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ax: 0,
      ay: 0,
      norm: norm,
      size: 2.2 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      trail: []
    };
  }

  function initAgents() {
    agents = [];
    for (var i = 0; i < state.agentCount; i++) {
      agents.push(createAgent(i, state.agentCount));
    }
  }

  function getFormationTarget(agent, index, total) {
    var cx = W / 2;
    var cy = H / 2;
    var t = state.time * 0.001;

    switch (state.formation) {
      case 'flock':
        return null;

      case 'spiral': {
        var spiralAngle = (index / total) * Math.PI * 8 + t * 0.4;
        var spiralR = 30 + (index / total) * Math.min(W, H) * 0.35;
        return { x: cx + Math.cos(spiralAngle) * spiralR, y: cy + Math.sin(spiralAngle) * spiralR };
      }

      case 'grid': {
        var cols = Math.ceil(Math.sqrt(total * (W / H)));
        var rows = Math.ceil(total / cols);
        var gx = index % cols;
        var gy = Math.floor(index / cols);
        var cellW = W * 0.6 / cols;
        var cellH = H * 0.6 / rows;
        var ox = (W - cols * cellW) / 2;
        var oy = (H - rows * cellH) / 2;
        return {
          x: ox + gx * cellW + cellW / 2 + Math.sin(t + gx * 0.5) * 8,
          y: oy + gy * cellH + cellH / 2 + Math.cos(t + gy * 0.5) * 8
        };
      }

      case 'wave': {
        var waveCols = Math.ceil(Math.sqrt(total * 2));
        var wx = (index % waveCols) / waveCols;
        var wy = Math.floor(index / waveCols) / (total / waveCols);
        return {
          x: W * 0.1 + wx * W * 0.8,
          y: cy + Math.sin(wx * Math.PI * 4 + t * 2 + agent.phase) * H * 0.25 + (wy - 0.5) * 60
        };
      }

      case 'circle': {
        var rings = 3;
        var ring = index % rings;
        var posInRing = Math.floor(index / rings);
        var ringTotal = Math.ceil(total / rings);
        var ringAngle = (posInRing / ringTotal) * Math.PI * 2 + t * (0.3 + ring * 0.15);
        var ringR = 60 + ring * (Math.min(W, H) * 0.12);
        return { x: cx + Math.cos(ringAngle) * ringR, y: cy + Math.sin(ringAngle) * ringR };
      }

      case 'scatter': {
        var seed = index * 7919 + 1;
        var rx = ((seed * 16807) % 2147483647) / 2147483647;
        var ry = ((seed * 48271) % 2147483647) / 2147483647;
        return {
          x: W * 0.08 + rx * W * 0.84 + Math.sin(t + agent.phase) * 15,
          y: H * 0.08 + ry * H * 0.84 + Math.cos(t * 0.7 + agent.phase) * 15
        };
      }

      default:
        return null;
    }
  }

  function updateAgents(dt) {
    var sepDist = 28;
    var aliDist = 80;
    var cohDist = 120;
    var maxSpeed = 4.5;
    var maxForce = 0.18;
    var cohStrength = state.cohesion * 0.004;
    var wanderStrength = state.wander * 0.01;

    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];

      var sepX = 0, sepY = 0, sepCount = 0;
      var aliVx = 0, aliVy = 0, aliCount = 0;
      var cohCx = 0, cohCy = 0, cohCount = 0;

      for (var j = 0; j < agents.length; j++) {
        if (i === j) continue;
        var b = agents[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var distSq = dx * dx + dy * dy;

        if (distSq < sepDist * sepDist && distSq > 0.1) {
          var dist = Math.sqrt(distSq);
          sepX -= dx / dist * (sepDist - dist) / sepDist;
          sepY -= dy / dist * (sepDist - dist) / sepDist;
          sepCount++;
        }

        if (distSq < aliDist * aliDist) {
          aliVx += b.vx;
          aliVy += b.vy;
          aliCount++;
        }

        if (distSq < cohDist * cohDist) {
          cohCx += b.x;
          cohCy += b.y;
          cohCount++;
        }
      }

      a.ax = 0;
      a.ay = 0;

      if (sepCount > 0) {
        a.ax += sepX / sepCount * 0.12;
        a.ay += sepY / sepCount * 0.12;
      }

      if (aliCount > 0) {
        var avgVx = aliVx / aliCount;
        var avgVy = aliVy / aliCount;
        a.ax += (avgVx - a.vx) * 0.04;
        a.ay += (avgVy - a.vy) * 0.04;
      }

      if (cohCount > 0) {
        var avgCx = cohCx / cohCount;
        var avgCy = cohCy / cohCount;
        a.ax += (avgCx - a.x) * cohStrength;
        a.ay += (avgCy - a.y) * cohStrength;
      }

      if (mouse.active) {
        var mdx = mouse.x - a.x;
        var mdy = mouse.y - a.y;
        var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 200 && mDist > 1) {
          var mForce = (200 - mDist) / 200 * 0.35;
          a.ax += (mdx / mDist) * mForce;
          a.ay += (mdy / mDist) * mForce;
        }
      }

      var target = getFormationTarget(a, i, agents.length);
      if (target) {
        var tdx = target.x - a.x;
        var tdy = target.y - a.y;
        a.ax += tdx * 0.008;
        a.ay += tdy * 0.008;
        maxSpeed = 5;
      }

      var wanderAngle = Math.sin(state.time * 0.002 + a.phase) * Math.PI;
      a.ax += Math.cos(wanderAngle) * wanderStrength;
      a.ay += Math.sin(wanderAngle) * wanderStrength;

      for (var p = pulses.length - 1; p >= 0; p--) {
        var pulse = pulses[p];
        var pdx = a.x - pulse.x;
        var pdy = a.y - pulse.y;
        var pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pDist > 0.1) {
          var ringDist = Math.abs(pDist - pulse.radius);
          if (ringDist < 50) {
            var pushForce = (1 - ringDist / 50) * pulse.strength * 3;
            a.ax += (pdx / pDist) * pushForce;
            a.ay += (pdy / pDist) * pushForce;
          }
        }
      }

      a.vx += a.ax;
      a.vy += a.ay;

      var speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
      if (speed > maxSpeed) {
        a.vx = (a.vx / speed) * maxSpeed;
        a.vy = (a.vy / speed) * maxSpeed;
      }

      a.x += a.vx;
      a.y += a.vy;

      var margin = 40;
      if (a.x < -margin) a.x = W + margin;
      if (a.x > W + margin) a.x = -margin;
      if (a.y < -margin) a.y = H + margin;
      if (a.y > H + margin) a.y = -margin;

      var trailMax = Math.floor(state.trail * MAX_TRAIL);
      a.trail.unshift({ x: a.x, y: a.y });
      while (a.trail.length > trailMax) {
        a.trail.pop();
      }
    }
  }

  function updatePulses() {
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      p.radius += 6;
      p.strength *= 0.96;
      p.life -= 0.015;
      if (p.life <= 0) {
        pulses.splice(i, 1);
      }
    }
  }

  function render() {
    var trailOpacity = state.trail * 0.08;
    ctx.fillStyle = 'rgba(5, 10, 24, ' + (1 - trailOpacity) + ')';
    ctx.fillRect(0, 0, W, H);

    var p = pal();

    for (var i = 0; i < pulses.length; i++) {
      var pulse = pulses[i];
      var pr = Math.max(0.1, pulse.radius);
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + hexToRgb(p.a).r + ',' + hexToRgb(p.a).g + ',' + hexToRgb(p.a).b + ',' + (pulse.life * 0.3) + ')';
      ctx.lineWidth = 2 + pulse.strength * 4;
      ctx.stroke();

      if (pulse.radius > 20) {
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pr * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + hexToRgb(p.b).r + ',' + hexToRgb(p.b).g + ',' + hexToRgb(p.b).b + ',' + (pulse.life * 0.15) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];
      var col = agentColor(a.norm);

      if (a.trail.length > 1 && state.trail > 0.05) {
        ctx.beginPath();
        ctx.moveTo(a.trail[0].x, a.trail[0].y);
        for (var t = 1; t < a.trail.length; t++) {
          ctx.lineTo(a.trail[t].x, a.trail[t].y);
        }
        var trailAlpha = state.trail * 0.35;
        ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + trailAlpha + ')';
        ctx.lineWidth = a.size * 0.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.85)';
      ctx.fill();

      var glow = a.size * 3;
      var grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, Math.max(0.1, glow));
      grad.addColorStop(0, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.15)');
      grad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0)');
      ctx.beginPath();
      ctx.arc(a.x, a.y, glow, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    if (mouse.active) {
      var mGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
      var mc = hexToRgb(p.a);
      mGrad.addColorStop(0, 'rgba(' + mc.r + ',' + mc.g + ',' + mc.b + ',0.06)');
      mGrad.addColorStop(1, 'rgba(' + mc.r + ',' + mc.g + ',' + mc.b + ',0)');
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 120, 0, Math.PI * 2);
      ctx.fillStyle = mGrad;
      ctx.fill();
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);

    var dt = now - lastFrameTime;
    lastFrameTime = now;

    fpsSamples.push(1000 / Math.max(dt, 1));
    if (fpsSamples.length > 30) fpsSamples.shift();

    if (state.paused) return;

    state.time += dt;

    updateAgents(dt);
    updatePulses();
    render();

    if (fpsSamples.length > 10 && Math.floor(now / 500) !== Math.floor((now - dt) / 500)) {
      var avgFps = 0;
      for (var i = 0; i < fpsSamples.length; i++) avgFps += fpsSamples[i];
      avgFps /= fpsSamples.length;
      document.getElementById('fps-val').textContent = Math.round(avgFps);
    }

    document.getElementById('agent-count-val').textContent = agents.length;
  }

  function addPulse(x, y) {
    pulses.push({
      x: x,
      y: y,
      radius: 1,
      strength: 1,
      life: 1
    });
  }

  canvas.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  canvas.addEventListener('mouseleave', function () {
    mouse.active = false;
  });

  canvas.addEventListener('click', function (e) {
    addPulse(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
    mouse.active = true;
    addPulse(touch.clientX, touch.clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    var touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
  }, { passive: false });

  canvas.addEventListener('touchend', function () {
    mouse.active = false;
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePause();
    }
    if (e.code === 'KeyR') {
      resetSim();
    }
  });

  function togglePause() {
    state.paused = !state.paused;
    document.getElementById('pause-icon').textContent = state.paused ? '▶' : '⏸';
    document.getElementById('pause-text').textContent = state.paused ? '继续' : '暂停';
  }

  function resetSim() {
    state.time = 0;
    pulses = [];
    ctx.clearRect(0, 0, W, H);
    initAgents();
    if (state.paused) togglePause();
  }

  function setFormation(f) {
    state.formation = f;
    var btns = document.querySelectorAll('.formation-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-formation') === f);
    }
  }

  function applyPalette(name) {
    state.palette = name;
    var p = PALETTES[name];
    document.documentElement.style.setProperty('--palette-a', p.a);
    document.documentElement.style.setProperty('--palette-b', p.b);

    var orbA = document.querySelector('.orb-a');
    var orbB = document.querySelector('.orb-b');
    var orbC = document.querySelector('.orb-c');
    if (orbA) orbA.style.background = 'radial-gradient(circle, ' + p.bg1 + ', transparent 65%)';
    if (orbB) orbB.style.background = 'radial-gradient(circle, ' + p.bg2 + ', transparent 65%)';
    if (orbC) {
      var cc = hexToRgb(p.c);
      orbC.style.background = 'radial-gradient(circle, rgba(' + cc.r + ',' + cc.g + ',' + cc.b + ',0.3), transparent 60%)';
    }

    var btns = document.querySelectorAll('.palette-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-palette') === name);
    }

    var dot = document.querySelector('.stat-dot:not(.fps)');
    if (dot) {
      dot.style.background = p.a;
      dot.style.boxShadow = '0 0 6px ' + p.a;
    }
  }

  function bindControls() {
    var formationBtns = document.querySelectorAll('.formation-btn');
    for (var i = 0; i < formationBtns.length; i++) {
      formationBtns[i].addEventListener('click', function () {
        setFormation(this.getAttribute('data-formation'));
      });
    }

    var paletteBtns = document.querySelectorAll('.palette-btn');
    for (var i = 0; i < paletteBtns.length; i++) {
      paletteBtns[i].addEventListener('click', function () {
        applyPalette(this.getAttribute('data-palette'));
      });
    }

    var agentSlider = document.getElementById('agent-slider');
    var agentSliderVal = document.getElementById('agent-slider-val');
    agentSlider.addEventListener('input', function () {
      var val = parseInt(this.value, 10);
      state.agentCount = val;
      agentSliderVal.textContent = val;

      if (val > agents.length) {
        for (var i = agents.length; i < val; i++) {
          agents.push(createAgent(i, val));
        }
      } else if (val < agents.length) {
        agents.length = val;
      }
      for (var i = 0; i < agents.length; i++) {
        agents[i].norm = i / Math.max(agents.length - 1, 1);
      }
    });

    var cohesionSlider = document.getElementById('cohesion-slider');
    var cohesionVal = document.getElementById('cohesion-slider-val');
    cohesionSlider.addEventListener('input', function () {
      state.cohesion = parseInt(this.value, 10) / 100;
      cohesionVal.textContent = this.value;
    });

    var wanderSlider = document.getElementById('wander-slider');
    var wanderVal = document.getElementById('wander-slider-val');
    wanderSlider.addEventListener('input', function () {
      state.wander = parseInt(this.value, 10) / 100;
      wanderVal.textContent = this.value;
    });

    var trailSlider = document.getElementById('trail-slider');
    var trailVal = document.getElementById('trail-slider-val');
    trailSlider.addEventListener('input', function () {
      state.trail = parseInt(this.value, 10) / 100;
      trailVal.textContent = this.value;
    });

    document.getElementById('btn-reset').addEventListener('click', resetSim);
    document.getElementById('btn-pause').addEventListener('click', togglePause);

    document.getElementById('panel-toggle').addEventListener('click', function () {
      document.getElementById('control-panel').classList.toggle('collapsed');
    });
  }

  function hideHintAfterDelay() {
    setTimeout(function () {
      var hint = document.getElementById('hint-bar');
      if (hint) hint.classList.add('hidden');
    }, 6000);
  }

  function init() {
    resize();
    initAgents();
    bindControls();
    applyPalette('aurora');
    hideHintAfterDelay();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', function () {
    resize();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
