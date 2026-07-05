/* ==========================================================================
   Unit Convert 3D · 三维单位转换器
   交互逻辑 · 转换引擎 · 3D 翻牌 · 粒子流场 · 历史记录
   Maintainer · EDEN
   ========================================================================== */
(function () {
  'use strict';

  /* === 单位数据模型 ============================================ */
  // 每个类别含一组单位；base 为基准换算系数（乘以 base 得到该类别基准单位）
  // 温度为特殊函数转换（toBase/fromBase）
  var CATEGORIES = [
    {
      id: 'length', name: '长度', glyph: 'L', label: 'Length',
      units: [
        { id: 'nm',  name: '纳米',   glyph: 'nm', base: 1e-9 },
        { id: 'um',  name: '微米',   glyph: 'μm', base: 1e-6 },
        { id: 'mm',  name: '毫米',   glyph: 'mm', base: 1e-3 },
        { id: 'cm',  name: '厘米',   glyph: 'cm', base: 1e-2 },
        { id: 'm',   name: '米',     glyph: 'm',  base: 1 },
        { id: 'km',  name: '千米',   glyph: 'km', base: 1000 },
        { id: 'in',  name: '英寸',   glyph: 'in', base: 0.0254 },
        { id: 'ft',  name: '英尺',   glyph: 'ft', base: 0.3048 },
        { id: 'mi',  name: '英里',   glyph: 'mi', base: 1609.344 }
      ]
    },
    {
      id: 'mass', name: '质量', glyph: 'M', label: 'Mass',
      units: [
        { id: 'mg',  name: '毫克',   glyph: 'mg', base: 1e-6 },
        { id: 'g',   name: '克',     glyph: 'g',  base: 1e-3 },
        { id: 'kg',  name: '千克',   glyph: 'kg', base: 1 },
        { id: 't',   name: '吨',     glyph: 't',  base: 1000 },
        { id: 'oz',  name: '盎司',   glyph: 'oz', base: 0.0283495 },
        { id: 'lb',  name: '磅',     glyph: 'lb', base: 0.453592 },
        { id: 'jin', name: '市斤',   glyph: '斤', base: 0.5 }
      ]
    },
    {
      id: 'temp', name: '温度', glyph: 'T', label: 'Temperature', special: true,
      units: [
        { id: 'C', name: '摄氏度',   glyph: '°C' },
        { id: 'F', name: '华氏度',   glyph: '°F' },
        { id: 'K', name: '开尔文',   glyph: 'K'  },
        { id: 'R', name: '兰氏度',   glyph: '°R' }
      ]
    },
    {
      id: 'time', name: '时间', glyph: 't', label: 'Time',
      units: [
        { id: 'ms',  name: '毫秒',   glyph: 'ms', base: 0.001 },
        { id: 's',   name: '秒',     glyph: 's',  base: 1 },
        { id: 'min', name: '分钟',   glyph: 'min',base: 60 },
        { id: 'h',   name: '小时',   glyph: 'h',  base: 3600 },
        { id: 'd',   name: '天',     glyph: 'd',  base: 86400 },
        { id: 'wk',  name: '周',     glyph: 'wk', base: 604800 },
        { id: 'yr',  name: '年',     glyph: 'yr', base: 31557600 }
      ]
    },
    {
      id: 'data', name: '数据', glyph: 'D', label: 'Digital',
      units: [
        { id: 'b',   name: '比特',   glyph: 'b',   base: 0.125 },
        { id: 'B',   name: '字节',   glyph: 'B',   base: 1 },
        { id: 'KB',  name: '千字节', glyph: 'KB',  base: 1024 },
        { id: 'MB',  name: '兆字节', glyph: 'MB',  base: 1048576 },
        { id: 'GB',  name: '吉字节', glyph: 'GB',  base: 1073741824 },
        { id: 'TB',  name: '太字节', glyph: 'TB',  base: 1099511627776 },
        { id: 'PB',  name: '拍字节', glyph: 'PB',  base: 1125899906842624 }
      ]
    },
    {
      id: 'speed', name: '速度', glyph: 'V', label: 'Speed',
      units: [
        { id: 'mps',  name: '米每秒',   glyph: 'm/s',  base: 1 },
        { id: 'kmh',  name: '千米每时', glyph: 'km/h', base: 0.277778 },
        { id: 'mph',  name: '英里每时', glyph: 'mph',  base: 0.44704 },
        { id: 'kn',   name: '节',       glyph: 'kn',   base: 0.514444 },
        { id: 'fts',  name: '英尺每秒', glyph: 'ft/s', base: 0.3048 },
        { id: 'mach', name: '马赫',     glyph: 'Ma',   base: 343 }
      ]
    }
  ];

  // 常用速换预设（跨类别展示典型换算）
  var PRESETS = [
    { cat: 'length', from: 'km', to: 'mi', val: 1,   label: '1 km → mi' },
    { cat: 'length', from: 'ft', to: 'cm', val: 1,   label: '1 ft → cm' },
    { cat: 'mass',   from: 'lb', to: 'kg', val: 1,   label: '1 lb → kg' },
    { cat: 'temp',   from: 'C',  to: 'F',  val: 25,  label: '25 °C → °F' },
    { cat: 'time',   from: 'd',  to: 's',  val: 1,   label: '1 day → s' },
    { cat: 'data',   from: 'GB', to: 'MB', val: 1,   label: '1 GB → MB' },
    { cat: 'speed',  from: 'kmh',to: 'mph',val: 100, label: '100 km/h → mph' }
  ];

  /* === DOM 引用 ================================================ */
  var body = document.body;
  var railTrack = document.getElementById('rail-track');
  var fromCard = document.getElementById('from-card');
  var toCard = document.getElementById('to-card');
  var fromInner = document.getElementById('from-inner');
  var toInner = document.getElementById('to-inner');
  var fromPick = document.getElementById('from-pick');
  var toPick = document.getElementById('to-pick');
  var fromGlyph = document.getElementById('from-glyph');
  var toGlyph = document.getElementById('to-glyph');
  var fromName = document.getElementById('from-name');
  var toName = document.getElementById('to-name');
  var fromValue = document.getElementById('from-value');
  var toValue = document.getElementById('to-value');
  var fromBadge = document.getElementById('from-unit-badge');
  var toBadge = document.getElementById('to-unit-badge');
  var fromList = document.getElementById('from-list');
  var toList = document.getElementById('to-list');
  var swapBtn = document.getElementById('swap-btn');
  var resultNum = document.getElementById('result-num');
  var resultUnit = document.getElementById('result-unit');
  var coreFormula = document.getElementById('core-formula');
  var presetRow = document.getElementById('preset-row');
  var historyList = document.getElementById('history-list');
  var historyClear = document.getElementById('history-clear');
  var hudCat = document.getElementById('hud-cat');
  var hudCount = document.getElementById('hud-count');
  var hudHistory = document.getElementById('hud-history');
  var rippleLayer = document.getElementById('ripple-layer');
  var cursorGlow = document.querySelector('.cursor-glow');
  var canvas = document.getElementById('particle-canvas');

  /* === 应用状态 ================================================ */
  var state = {
    catIndex: 0,
    fromUnitId: null,
    toUnitId: null,
    history: [],
    whichFlipped: null // 'from' | 'to' | null
  };

  /* === 工具函数 ================================================ */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function getCategory() { return CATEGORIES[state.catIndex]; }

  function findUnit(cat, id) {
    for (var i = 0; i < cat.units.length; i++) {
      if (cat.units[i].id === id) return cat.units[i];
    }
    return cat.units[0];
  }

  function formatNumber(n) {
    if (!isFinite(n)) return '∞';
    var abs = Math.abs(n);
    if (abs === 0) return '0';
    if (abs >= 1e15 || abs < 1e-6) return n.toExponential(4);
    var digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    var fixed = parseFloat(n.toFixed(digits)).toString();
    // 千分位（仅在整数部分）
    var parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  /* === 转换引擎 ================================================ */
  // 温度互转：先转到摄氏度作为中间量
  function tempToC(val, unit) {
    if (unit.id === 'C') return val;
    if (unit.id === 'F') return (val - 32) * 5 / 9;
    if (unit.id === 'K') return val - 273.15;
    if (unit.id === 'R') return (val - 491.67) * 5 / 9;
    return val;
  }
  function tempFromC(c, unit) {
    if (unit.id === 'C') return c;
    if (unit.id === 'F') return c * 9 / 5 + 32;
    if (unit.id === 'K') return c + 273.15;
    if (unit.id === 'R') return (c + 273.15) * 9 / 5;
    return c;
  }

  function convert(val, fromU, toU) {
    var cat = getCategory();
    if (cat.special) {
      var c = tempToC(val, fromU);
      return tempFromC(c, toU);
    }
    var baseVal = val * fromU.base;
    return baseVal / toU.base;
  }

  /* === 渲染：类别轨道 ========================================== */
  function buildRail() {
    railTrack.innerHTML = '';
    CATEGORIES.forEach(function (cat, i) {
      var chip = document.createElement('button');
      chip.className = 'cat-chip' + (i === state.catIndex ? ' active' : '');
      chip.innerHTML = '<span class="cat-glyph">' + cat.glyph + '</span><span>' + cat.name + '</span>';
      chip.addEventListener('click', function () { selectCategory(i); });
      railTrack.appendChild(chip);
    });
  }

  function selectCategory(i) {
    state.catIndex = i;
    var cat = getCategory();
    state.fromUnitId = cat.units[0].id;
    // 默认目标取第二个单位（若存在），使初始即有换算差异
    state.toUnitId = cat.units.length > 1 ? cat.units[1].id : cat.units[0].id;
    if (cat.id === 'length') { state.fromUnitId = 'm'; state.toUnitId = 'ft'; }
    if (cat.id === 'mass')   { state.fromUnitId = 'kg'; state.toUnitId = 'lb'; }
    if (cat.id === 'temp')   { state.fromUnitId = 'C';  state.toUnitId = 'F'; }
    if (cat.id === 'time')   { state.fromUnitId = 'h';  state.toUnitId = 's'; }
    if (cat.id === 'data')   { state.fromUnitId = 'GB'; state.toUnitId = 'MB'; }
    if (cat.id === 'speed')  { state.fromUnitId = 'kmh';state.toUnitId = 'mph'; }
    updateRailActive();
    renderUnitLists();
    syncPickerLabels();
    compute();
    spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
  }

  function updateRailActive() {
    var chips = railTrack.querySelectorAll('.cat-chip');
    chips.forEach(function (chip, i) {
      chip.classList.toggle('active', i === state.catIndex);
    });
    var activeChip = chips[state.catIndex];
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    hudCat.textContent = getCategory().name;
    hudCount.textContent = getCategory().units.length;
  }

  /* === 渲染：单位选择列表 ====================================== */
  function renderUnitLists() {
    var cat = getCategory();
    fromList.innerHTML = '';
    toList.innerHTML = '';
    cat.units.forEach(function (u) {
      fromList.appendChild(buildUnitOpt(u, 'from'));
      toList.appendChild(buildUnitOpt(u, 'to'));
    });
  }

  function buildUnitOpt(u, side) {
    var btn = document.createElement('button');
    btn.className = 'unit-opt';
    var selectedId = side === 'from' ? state.fromUnitId : state.toUnitId;
    if (u.id === selectedId) btn.classList.add('selected');
    var factorText = '';
    var cat = getCategory();
    if (!cat.special) {
      var base = u.base;
      factorText = base >= 1 ? base.toString() : base.toExponential(2);
    }
    btn.innerHTML =
      '<span class="unit-opt-glyph">' + u.glyph + '</span>' +
      '<span class="unit-opt-name">' + u.name + '</span>' +
      (factorText ? '<span class="unit-opt-factor">×' + factorText + '</span>' : '');
    btn.addEventListener('click', function () {
      if (side === 'from') state.fromUnitId = u.id;
      else state.toUnitId = u.id;
      renderUnitLists();
      syncPickerLabels();
      compute();
      flipCard(side, false);
      spawnRipple(btn);
    });
    return btn;
  }

  function syncPickerLabels() {
    var cat = getCategory();
    var fromU = findUnit(cat, state.fromUnitId);
    var toU = findUnit(cat, state.toUnitId);
    fromGlyph.textContent = fromU.glyph;
    fromName.textContent = fromU.name;
    fromBadge.textContent = fromU.glyph;
    toGlyph.textContent = toU.glyph;
    toName.textContent = toU.name;
    toBadge.textContent = toU.glyph;
    // 列表选中态
    fromList.querySelectorAll('.unit-opt').forEach(function (el, i) {
      el.classList.toggle('selected', cat.units[i].id === state.fromUnitId);
    });
    toList.querySelectorAll('.unit-opt').forEach(function (el, i) {
      el.classList.toggle('selected', cat.units[i].id === state.toUnitId);
    });
  }

  /* === 3D 翻牌交互 ============================================ */
  function flipCard(side, open) {
    if (side === 'from') {
      fromCard.classList.toggle('flipped', open);
    } else {
      toCard.classList.toggle('flipped', open);
    }
    state.whichFlipped = open ? side : null;
  }

  function bindFlipCards() {
    fromPick.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !fromCard.classList.contains('flipped');
      flipCard('to', false); // 关另一侧
      flipCard('from', willOpen);
    });
    toPick.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !toCard.classList.contains('flipped');
      flipCard('from', false);
      flipCard('to', willOpen);
    });
    // 点击外部收起
    document.addEventListener('click', function (e) {
      if (!fromCard.contains(e.target) && !toCard.contains(e.target)) {
        flipCard('from', false);
        flipCard('to', false);
      }
    });
  }

  /* === 计算与结果显示 ========================================== */
  function compute() {
    var cat = getCategory();
    var fromU = findUnit(cat, state.fromUnitId);
    var toU = findUnit(cat, state.toUnitId);
    var val = parseFloat(fromValue.value);
    if (isNaN(val)) val = 0;
    var result = convert(val, fromU, toU);
    animateNumber(resultNum, result);
    toValue.textContent = formatNumber(result);
    resultUnit.textContent = toU.glyph;
    // 公式提示
    var ratioText;
    if (cat.special) {
      ratioText = val + ' ' + fromU.glyph + ' = ' + formatNumber(result) + ' ' + toU.glyph;
    } else {
      var oneResult = convert(1, fromU, toU);
      ratioText = '1 ' + fromU.glyph + ' = ' + formatNumber(oneResult) + ' ' + toU.glyph;
    }
    coreFormula.textContent = ratioText;
  }

  // 数字滚动动画
  function animateNumber(el, target) {
    el.classList.remove('pulse');
    void el.offsetWidth; // 重启动画
    el.classList.add('pulse');
    var start = parseFloat(el.textContent.replace(/,/g, '')) || 0;
    if (!isFinite(start)) start = 0;
    var duration = 480;
    var t0 = performance.now();
    function step(now) {
      var p = clamp((now - t0) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - p, 4); // ease-out-quart
      var cur = start + (target - start) * eased;
      el.textContent = formatNumber(cur);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = formatNumber(target);
    }
    requestAnimationFrame(step);
  }

  /* === 交换源/目标 ============================================ */
  function swap() {
    var tmp = state.fromUnitId;
    state.fromUnitId = state.toUnitId;
    state.toUnitId = tmp;
    // 同时把当前结果作为新的输入值（更直觉）
    var cur = parseFloat(toValue.textContent.replace(/,/g, ''));
    if (isFinite(cur)) fromValue.value = parseFloat(cur.toFixed(6));
    renderUnitLists();
    syncPickerLabels();
    compute();
    spawnRipple(swapBtn);
  }

  /* === 预设速选 =============================================== */
  function buildPresets() {
    presetRow.innerHTML = '';
    PRESETS.forEach(function (p) {
      var btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = p.label;
      btn.addEventListener('click', function () {
        // 定位类别
        var idx = -1;
        CATEGORIES.forEach(function (c, i) { if (c.id === p.cat) idx = i; });
        if (idx === -1) return;
        state.catIndex = idx;
        state.fromUnitId = p.from;
        state.toUnitId = p.to;
        fromValue.value = p.val;
        updateRailActive();
        renderUnitLists();
        syncPickerLabels();
        compute();
        pushHistory();
        spawnRipple(btn);
      });
      presetRow.appendChild(btn);
    });
  }

  /* === 历史记录 =============================================== */
  function pushHistory() {
    var cat = getCategory();
    var fromU = findUnit(cat, state.fromUnitId);
    var toU = findUnit(cat, state.toUnitId);
    var val = parseFloat(fromValue.value);
    if (isNaN(val)) return;
    var result = convert(val, fromU, toU);
    var now = new Date();
    var time = String(now.getHours()).padStart(2, '0') + ':' +
               String(now.getMinutes()).padStart(2, '0') + ':' +
               String(now.getSeconds()).padStart(2, '0');
    state.history.unshift({
      from: formatNumber(val) + ' ' + fromU.glyph,
      to: formatNumber(result) + ' ' + toU.glyph,
      cat: cat.name,
      time: time
    });
    if (state.history.length > 12) state.history.length = 12;
    renderHistory();
  }

  function renderHistory() {
    hudHistory.textContent = state.history.length;
    if (state.history.length === 0) {
      historyList.innerHTML = '<li class="history-empty">暂无记录 · 开始你的第一次转换</li>';
      return;
    }
    historyList.innerHTML = '';
    state.history.forEach(function (h) {
      var li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML =
        '<span class="history-from">' + h.from + '</span>' +
        '<span class="history-arrow">→</span>' +
        '<span class="history-to">' + h.to + '</span>' +
        '<span class="history-time">' + h.time + '</span>';
      historyList.appendChild(li);
    });
  }

  function bindHistoryClear() {
    historyClear.addEventListener('click', function () {
      state.history = [];
      renderHistory();
      spawnRipple(historyClear);
    });
  }

  /* === 涟漪效果 =============================================== */
  function spawnRipple(targetOrX, y) {
    var x, top;
    if (typeof targetOrX === 'number') {
      x = targetOrX; top = y;
    } else if (targetOrX && targetOrX.getBoundingClientRect) {
      var r = targetOrX.getBoundingClientRect();
      x = r.left + r.width / 2;
      top = r.top + r.height / 2;
    } else {
      x = window.innerWidth / 2; top = window.innerHeight / 2;
    }
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    var size = 24;
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (x - size / 2) + 'px';
    ripple.style.top = (top - size / 2) + 'px';
    rippleLayer.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 900);
  }

  /* === 类别轨道箭头 =========================================== */
  function bindRailArrows() {
    document.querySelectorAll('.rail-arrow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = parseInt(btn.dataset.dir, 10);
        var next = (state.catIndex + dir + CATEGORIES.length) % CATEGORIES.length;
        selectCategory(next);
        spawnRipple(btn);
      });
    });
  }

  /* === 配色切换 =============================================== */
  function bindPalette() {
    var dots = document.querySelectorAll('.palette-dot');
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var p = dot.dataset.palette;
        body.dataset.palette = p;
        dots.forEach(function (d) { d.classList.toggle('active', d === dot); });
        spawnRipple(dot);
      });
    });
    // 初始激活
    var current = body.dataset.palette || 'aurora';
    dots.forEach(function (d) { d.classList.toggle('active', d.dataset.palette === current); });
  }

  /* === 光标光晕 =============================================== */
  function bindCursorGlow() {
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
    });
    function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      cursorGlow.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* === 入场动画 =============================================== */
  function bindReveal() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('active');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* === 粒子流场 =============================================== */
  var ctx, particles = [], dpr = 1;
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }
  function initParticles() {
    particles = [];
    var count = Math.floor(clamp(window.innerWidth / 14, 36, 72));
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.4 + 0.1
      });
    }
  }
  function getAccent() {
    var c = getComputedStyle(body).getPropertyValue('--accent').trim();
    return c || '#7cf2e6';
  }
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function drawParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var rgb = hexToRgb(getAccent());
    var t = performance.now() * 0.0002;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      // 流场扰动
      var wave = Math.sin(p.x * 0.004 + t) * 0.5 + Math.cos(p.y * 0.004 + t) * 0.5;
      p.vx += wave * 0.004;
      p.vy += Math.cos(p.x * 0.003 + t) * 0.004;
      p.vx = clamp(p.vx, -0.5, 0.5);
      p.vy = clamp(p.vy, -0.5, 0.5);
      p.x += p.vx;
      p.y += p.vy;
      // 环绕
      if (p.x < -10) p.x = window.innerWidth + 10;
      if (p.x > window.innerWidth + 10) p.x = -10;
      if (p.y < -10) p.y = window.innerHeight + 10;
      if (p.y > window.innerHeight + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + p.a + ')';
      ctx.fill();
    }
    // 连线（近距离）
    for (var a = 0; a < particles.length; a++) {
      for (var b = a + 1; b < particles.length; b++) {
        var dx = particles[a].x - particles[b].x;
        var dy = particles[a].y - particles[b].y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          var alpha = (1 - d2 / 14000) * 0.12;
          ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(drawParticles);
  }
  function bindCanvasResize() {
    var debounced;
    window.addEventListener('resize', function () {
      clearTimeout(debounced);
      debounced = setTimeout(function () {
        resizeCanvas();
        initParticles();
      }, 180);
    });
  }

  /* === 键盘支持 =============================================== */
  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.target === fromValue) return;
      if (e.key === 'ArrowLeft') {
        var prev = (state.catIndex - 1 + CATEGORIES.length) % CATEGORIES.length;
        selectCategory(prev);
      } else if (e.key === 'ArrowRight') {
        var next = (state.catIndex + 1) % CATEGORIES.length;
        selectCategory(next);
      } else if (e.key === 's' || e.key === 'S') {
        swap();
      } else if (e.key === 'Escape') {
        flipCard('from', false);
        flipCard('to', false);
      }
    });
  }

  /* === 输入防抖记录 =========================================== */
  var recordTimer;
  function bindInputRecord() {
    fromValue.addEventListener('input', compute);
    fromValue.addEventListener('change', function () {
      compute();
      clearTimeout(recordTimer);
      recordTimer = setTimeout(pushHistory, 600);
    });
  }

  /* === 初始化 ================================================= */
  function init() {
    resizeCanvas();
    initParticles();
    drawParticles();
    buildRail();
    buildPresets();
    bindPalette();
    bindFlipCards();
    bindRailArrows();
    bindCursorGlow();
    bindCanvasResize();
    bindKeyboard();
    bindInputRecord();
    bindHistoryClear();
    bindReveal();
    // 初始类别（长度）
    selectCategory(0);
    renderHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
