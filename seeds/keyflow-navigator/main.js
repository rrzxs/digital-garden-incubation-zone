(function () {
  'use strict';

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  var NAV_ITEMS = [
    { id: 'n0', icon: '\u2728', label: 'Inspiration', x: 0.12, y: 0.15 },
    { id: 'n1', icon: '\uD83C\uDFA8', label: 'Design', x: 0.30, y: 0.10 },
    { id: 'n2', icon: '\uD83D\uDE80', label: 'Launch', x: 0.52, y: 0.12 },
    { id: 'n3', icon: '\uD83D\uDD27', label: 'Build', x: 0.75, y: 0.08 },
    { id: 'n4', icon: '\uD83D\uDCA1', label: 'Ideas', x: 0.88, y: 0.18 },
    { id: 'n5', icon: '\uD83C\uDFB5', label: 'Audio', x: 0.08, y: 0.45 },
    { id: 'n6', icon: '\uD83D\uDCCA', label: 'Analytics', x: 0.28, y: 0.40 },
    { id: 'n7', icon: '\uD83C\uDFAF', label: 'Focus', x: 0.50, y: 0.42 },
    { id: 'n8', icon: '\uD83C\uDF08', label: 'Visual', x: 0.72, y: 0.38 },
    { id: 'n9', icon: '\u2699\uFE0F', label: 'Settings', x: 0.90, y: 0.48 },
    { id: 'n10', icon: '\uD83C\uDF31', label: 'Growth', x: 0.18, y: 0.72 },
    { id: 'n11', icon: '\uD83D\uDCBB', label: 'Code', x: 0.42, y: 0.70 },
    { id: 'n12', icon: '\uD83E\uDDF1', label: 'Deploy', x: 0.65, y: 0.74 },
    { id: 'n13', icon: '\uD83C\uDF10', label: 'Global', x: 0.85, y: 0.72 }
  ];

  var CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
    [5, 6], [6, 7], [7, 8], [8, 9],
    [5, 10], [6, 11], [7, 12], [8, 13],
    [10, 11], [11, 12], [12, 13],
    [0, 6], [1, 7], [2, 8], [5, 11], [7, 11], [8, 12]
  ];

  var THEMES = ['aurora', 'ember', 'ocean', 'void'];

  var state = {
    focusIndex: -1,
    mouseX: 0,
    mouseY: 0,
    keysPressed: {},
    keyCount: 0,
    comboCount: 0,
    comboTimer: null,
    flowActive: false,
    flowTimer: null,
    particles: [],
    trailKeys: [],
    nodeElements: [],
    viewportOffset: { x: 0, y: 0 },
    viewportTarget: { x: 0, y: 0 },
    linkAnimProgress: {},
    bgParticles: []
  };

  var bgCanvas = document.getElementById('bg-canvas');
  var bgCtx = bgCanvas.getContext('2d');
  var linksCanvas = document.getElementById('links-canvas');
  var linksCtx = linksCanvas.getContext('2d');
  var worldEl = document.getElementById('nodes-world');
  var viewportEl = document.getElementById('nodes-viewport');
  var cursorGlow = document.getElementById('cursor-glow');
  var cursorRing = document.getElementById('cursor-ring');
  var focusName = document.getElementById('focus-name');
  var statKeys = document.getElementById('stat-keys');
  var statCombo = document.getElementById('stat-combo');
  var statFlow = document.getElementById('stat-flow');
  var keyTrail = document.getElementById('key-trail');
  var toastContainer = document.getElementById('toast-container');

  function init() {
    resizeCanvases();
    createNodes();
    setupEventListeners();
    initBgParticles();
    requestAnimationFrame(mainLoop);
    showToast('Press arrow keys or WASD to navigate between nodes');
  }

  function resizeCanvases() {
    var dpr = window.devicePixelRatio || 1;

    bgCanvas.width = window.innerWidth * dpr;
    bgCanvas.height = window.innerHeight * dpr;
    bgCanvas.style.width = window.innerWidth + 'px';
    bgCanvas.style.height = window.innerHeight + 'px';
    bgCtx.scale(dpr, dpr);

    resizeLinksCanvas();
  }

  function resizeLinksCanvas() {
    var rect = viewportEl.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    linksCanvas.width = rect.width * dpr;
    linksCanvas.height = rect.height * dpr;
    linksCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createNodes() {
    NAV_ITEMS.forEach(function (item, idx) {
      var el = document.createElement('div');
      el.className = 'nav-node';
      el.dataset.index = idx;
      el.style.left = 'calc(' + (item.x * 100) + '% - var(--node-size) / 2)';
      el.style.top = 'calc(' + (item.y * 100) + '% - var(--node-size) / 2)';
      el.innerHTML =
        '<span class="node-icon">' + item.icon + '</span>' +
        '<span class="node-label">' + item.label + '</span>' +
        '<span class="node-key-hint">' + (idx + 1) + '</span>';

      el.addEventListener('click', function () {
        setFocus(idx);
        activateNode(idx);
      });

      worldEl.appendChild(el);
      state.nodeElements.push(el);
    });
  }

  function initBgParticles() {
    for (var i = 0; i < 80; i++) {
      state.bgParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.05
      });
    }
  }

  function setupEventListeners() {
    window.addEventListener('resize', function () {
      resizeCanvases();
    });

    document.addEventListener('mousemove', function (e) {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top = e.clientY + 'px';
      cursorRing.style.left = e.clientX + 'px';
      cursorRing.style.top = e.clientY + 'px';
      cursorGlow.classList.add('visible');
      cursorRing.classList.add('visible');
    });

    document.addEventListener('mouseleave', function () {
      cursorGlow.classList.remove('visible');
      cursorRing.classList.remove('visible');
    });

    document.addEventListener('mousedown', function () {
      cursorRing.classList.add('clicking');
    });

    document.addEventListener('mouseup', function () {
      cursorRing.classList.remove('clicking');
    });

    document.addEventListener('keydown', function (e) {
      if (state.keysPressed[e.key]) return;
      state.keysPressed[e.key] = true;
      state.keyCount++;
      statKeys.textContent = state.keyCount;
      addToTrail(e.key);
      bumpCombo();
      setFlowActive();

      var handled = true;

      switch (e.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveFocus(1, 0);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveFocus(-1, 0);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          moveFocus(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          moveFocus(0, 1);
          break;
        case ' ':
          e.preventDefault();
          emitPulse();
          break;
        case 'Enter':
          if (state.focusIndex >= 0) {
            activateNode(state.focusIndex);
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          switchTheme(THEMES[parseInt(e.key) - 1]);
          break;
        case 'Tab':
          e.preventDefault();
          cycleFocus(e.shiftKey ? -1 : 1);
          break;
        default:
          handled = false;
      }

      if (handled) e.preventDefault();
    });

    document.addEventListener('keyup', function (e) {
      state.keysPressed[e.key] = false;
    });

    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTheme(btn.dataset.theme);
      });
    });

    viewportEl.addEventListener('click', function (e) {
      if (e.target === viewportEl || e.target === worldEl) {
        emitPulseAt(e.clientX, e.clientY);
      }
    });
  }

  function getNeighbors(idx) {
    var neighbors = [];
    CONNECTIONS.forEach(function (c) {
      if (c[0] === idx) neighbors.push(c[1]);
      if (c[1] === idx) neighbors.push(c[0]);
    });
    return neighbors;
  }

  function moveFocus(dx, dy) {
    if (state.focusIndex < 0) {
      setFocus(0);
      return;
    }

    var current = NAV_ITEMS[state.focusIndex];
    var bestIdx = -1;
    var bestScore = Infinity;

    getNeighbors(state.focusIndex).forEach(function (ni) {
      var neighbor = NAV_ITEMS[ni];
      var ndx = neighbor.x - current.x;
      var ndy = neighbor.y - current.y;
      var len = Math.sqrt(ndx * ndx + ndy * ndy);
      if (len < 0.001) return;
      ndx /= len;
      ndy /= len;

      var dirLen = Math.sqrt(dx * dx + dy * dy);
      if (dirLen < 0.001) return;
      var ndx2 = dx / dirLen;
      var ndy2 = dy / dirLen;

      var dot = ndx * ndx2 + ndy * ndy2;
      if (dot > 0.3) {
        var score = -dot + len * 0.5;
        if (score < bestScore) {
          bestScore = score;
          bestIdx = ni;
        }
      }
    });

    if (bestIdx >= 0) {
      animateTraversal(state.focusIndex, bestIdx);
      setFocus(bestIdx);
    }
  }

  function cycleFocus(dir) {
    if (state.focusIndex < 0) {
      setFocus(0);
      return;
    }
    var next = (state.focusIndex + dir + NAV_ITEMS.length) % NAV_ITEMS.length;
    animateTraversal(state.focusIndex, next);
    setFocus(next);
  }

  function setFocus(idx) {
    state.nodeElements.forEach(function (el, i) {
      el.classList.toggle('focused', i === idx);
    });
    state.focusIndex = idx;
    focusName.textContent = idx >= 0 ? NAV_ITEMS[idx].label : 'None';

    if (idx >= 0) {
      var item = NAV_ITEMS[idx];
      state.viewportTarget.x = -(item.x - 0.5) * 40;
      state.viewportTarget.y = -(item.y - 0.5) * 40;
    }
  }

  function activateNode(idx) {
    var el = state.nodeElements[idx];
    el.classList.remove('activated');
    void el.offsetWidth;
    el.classList.add('activated');
    spawnParticles(idx, 12);
    showToast(NAV_ITEMS[idx].icon + ' ' + NAV_ITEMS[idx].label + ' activated');

    setTimeout(function () {
      el.classList.remove('activated');
    }, 500);
  }

  function animateTraversal(fromIdx, toIdx) {
    var key = fromIdx + '-' + toIdx;
    state.linkAnimProgress[key] = { t: 0, from: fromIdx, to: toIdx };

    spawnParticles(toIdx, 6);
  }

  function emitPulse() {
    var idx = state.focusIndex >= 0 ? state.focusIndex : 0;
    var item = NAV_ITEMS[idx];
    var rect = viewportEl.getBoundingClientRect();
    var cx = rect.left + item.x * rect.width;
    var cy = rect.top + item.y * rect.height;
    emitPulseAt(cx, cy);
  }

  function emitPulseAt(cx, cy) {
    var wave = document.createElement('div');
    wave.className = 'pulse-wave';
    wave.style.left = (cx - 10) + 'px';
    wave.style.top = (cy - 10) + 'px';
    document.body.appendChild(wave);

    var rect = viewportEl.getBoundingClientRect();
    NAV_ITEMS.forEach(function (item, idx) {
      var nx = rect.left + item.x * rect.width;
      var ny = rect.top + item.y * rect.height;
      var dist = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy));
      if (dist < 300) {
        setTimeout(function () {
          state.nodeElements[idx].classList.add('ripple-hit');
          setTimeout(function () {
            state.nodeElements[idx].classList.remove('ripple-hit');
          }, 800);
        }, dist * 1.5);
      }
    });

    setTimeout(function () {
      wave.remove();
    }, 1000);
  }

  function spawnParticles(nodeIdx, count) {
    var item = NAV_ITEMS[nodeIdx];
    var rect = viewportEl.getBoundingClientRect();
    var cx = item.x * rect.width;
    var cy = item.y * rect.height;

    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      var dist = 60 + Math.random() * 80;
      var p = document.createElement('div');
      p.className = 'flow-particle';
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.setProperty('--px', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--py', Math.sin(angle) * dist + 'px');
      viewportEl.appendChild(p);
      (function (el) {
        setTimeout(function () { el.remove(); }, 1200);
      })(p);
    }
  }

  function switchTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  function addToTrail(key) {
    var display = key;
    if (key === ' ') display = '\u2423';
    else if (key === 'ArrowLeft') display = '\u2190';
    else if (key === 'ArrowRight') display = '\u2192';
    else if (key === 'ArrowUp') display = '\u2191';
    else if (key === 'ArrowDown') display = '\u2193';
    else if (key === 'Enter') display = '\u21B5';
    else if (key.length === 1) display = key.toUpperCase();

    state.trailKeys.push(display);
    if (state.trailKeys.length > 18) state.trailKeys.shift();

    renderTrail();
  }

  function renderTrail() {
    keyTrail.innerHTML = '';
    state.trailKeys.forEach(function (k, i) {
      var el = document.createElement('span');
      el.className = 'trail-key' + (i === state.trailKeys.length - 1 ? ' active-key' : '');
      el.textContent = k;
      keyTrail.appendChild(el);
    });
    keyTrail.scrollLeft = keyTrail.scrollWidth;
  }

  function bumpCombo() {
    state.comboCount++;
    statCombo.textContent = state.comboCount;

    clearTimeout(state.comboTimer);
    state.comboTimer = setTimeout(function () {
      state.comboCount = 0;
      statCombo.textContent = '0';
    }, 1500);
  }

  function setFlowActive() {
    state.flowActive = true;
    statFlow.textContent = 'Active';
    statFlow.classList.add('flow-active');

    clearTimeout(state.flowTimer);
    state.flowTimer = setTimeout(function () {
      state.flowActive = false;
      statFlow.textContent = 'Idle';
      statFlow.classList.remove('flow-active');
    }, 2000);
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(function () {
      t.remove();
    }, 2800);
  }

  function drawBgParticles() {
    bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    var mx = state.mouseX / window.innerWidth;
    var my = state.mouseY / window.innerHeight;

    state.bgParticles.forEach(function (p) {
      p.x += p.vx + (mx - 0.5) * 0.2;
      p.y += p.vy + (my - 0.5) * 0.2;

      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
      if (p.y < 0) p.y = window.innerHeight;
      if (p.y > window.innerHeight) p.y = 0;

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = 'rgba(255, 255, 255, ' + p.alpha + ')';
      bgCtx.fill();
    });
  }

  function drawLinks() {
    var rect = viewportEl.getBoundingClientRect();
    linksCtx.clearRect(0, 0, rect.width, rect.height);

    CONNECTIONS.forEach(function (c) {
      var a = NAV_ITEMS[c[0]];
      var b = NAV_ITEMS[c[1]];
      var ax = a.x * rect.width;
      var ay = a.y * rect.height;
      var bx = b.x * rect.width;
      var by = b.y * rect.height;

      var key1 = c[0] + '-' + c[1];
      var key2 = c[1] + '-' + c[0];
      var anim = state.linkAnimProgress[key1] || state.linkAnimProgress[key2];

      var isFocusLink = false;
      if (state.focusIndex >= 0) {
        isFocusLink = c[0] === state.focusIndex || c[1] === state.focusIndex;
      }

      linksCtx.beginPath();
      linksCtx.moveTo(ax, ay);

      if (anim) {
        var midX = ax + (bx - ax) * 0.5;
        var midY = ay + (by - ay) * 0.5 - 20;
        linksCtx.quadraticCurveTo(midX, midY, bx, by);
      } else {
        linksCtx.lineTo(bx, by);
      }

      var baseAlpha = isFocusLink ? 0.25 : 0.07;
      linksCtx.strokeStyle = isFocusLink
        ? 'rgba(56, 189, 248, ' + baseAlpha + ')'
        : 'rgba(148, 163, 184, ' + baseAlpha + ')';
      linksCtx.lineWidth = isFocusLink ? 1.5 : 0.8;
      linksCtx.stroke();

      if (anim) {
        anim.t += 0.04;
        if (anim.t >= 1) {
          delete state.linkAnimProgress[key1];
          delete state.linkAnimProgress[key2];
        } else {
          var t = anim.t;
          var progressX = ax + (bx - ax) * t;
          var progressY = ay + (by - ay) * t;

          linksCtx.beginPath();
          linksCtx.arc(progressX, progressY, 3, 0, Math.PI * 2);
          linksCtx.fillStyle = 'rgba(56, 189, 248, ' + (1 - t) + ')';
          linksCtx.fill();
        }
      }
    });
  }

  function updateViewport() {
    state.viewportOffset.x += (state.viewportTarget.x - state.viewportOffset.x) * 0.08;
    state.viewportOffset.y += (state.viewportTarget.y - state.viewportOffset.y) * 0.08;

    var ox = state.viewportOffset.x;
    var oy = state.viewportOffset.y;

    state.nodeElements.forEach(function (el, i) {
      var item = NAV_ITEMS[i];
      var baseX = item.x * 100;
      var baseY = item.y * 100;
      var dx = (state.mouseX / window.innerWidth - 0.5) * 3;
      var dy = (state.mouseY / window.innerHeight - 0.5) * 3;
      var depth = (i % 3 + 1) * 0.4;

      el.style.transform =
        'translate(' + (dx * depth) + 'px, ' + (dy * depth) + 'px) ' +
        'translate(' + ox + 'px, ' + oy + 'px)';
    });
  }

  function mainLoop() {
    drawBgParticles();
    drawLinks();
    updateViewport();
    requestAnimationFrame(mainLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
