/* ============================================================
   VAULT LEDGER · 金库账本 — 交互逻辑
   模块: 状态存储 / 乱码揭示 / 数字滚动 / 粒子流场 / 磁力按钮
        3D 倾斜 / 涟漪脉冲 / 账本渲染 / 弹窗表单 / 主题切换
   ============================================================ */

(function vaultLedgerBoot(global) {
  'use strict';

  // === 常量与领域模型 ===
  const STORAGE_KEY = 'vault-ledger-entries-v1';
  const THEME_KEY = 'vault-ledger-theme';

  const CATEGORIES = [
    { id: 'food',    emoji: '🍜', label: '饮食' },
    { id: 'tech',    emoji: '⌁',  label: '数码' },
    { id: 'travel',  emoji: '✈',  label: '旅行' },
    { id: 'growth',  emoji: '❖',  label: '成长' },
    { id: 'home',    emoji: '⌂',  label: '居家' },
    { id: 'fun',     emoji: '✦',  label: '娱乐' },
    { id: 'health',  emoji: '☘',  label: '健康' },
    { id: 'salary',  emoji: '◈',  label: '薪酬' }
  ];

  const SHUFFLE_SAMPLES = [
    { type: 'income',  amount: 8800, label: '月度薪酬', cat: 'salary' },
    { type: 'income',  amount: 233,  label: '二手出让', cat: 'tech' },
    { type: 'income',  amount: 66,   label: '写作稿费', cat: 'growth' },
    { type: 'expense', amount: 42,   label: '晨间咖啡', cat: 'food' },
    { type: 'expense', amount: 128,  label: '数据订阅', cat: 'tech' },
    { type: 'expense', amount: 3600, label: '机票预付', cat: 'travel' },
    { type: 'expense', amount: 89,   label: '健身月卡', cat: 'health' },
    { type: 'expense', amount: 19.9, label: '夜宵犒赏', cat: 'food' },
    { type: 'expense', amount: 258,  label: '黑胶唱片', cat: 'fun' },
    { type: 'expense', amount: 76,   label: '绿植与陶盆', cat: 'home' }
  ];

  const SCRAMBLE_GLYPHS = '▚▞█▓▒░◇◈⌁⌬≝0123456789$¥';

  // === DOM Elements ===
  const $ = (sel) => document.querySelector(sel);
  const els = {
    body: document.body,
    title: $('#app-title'),
    balanceValue: $('#balance-value'),
    incomeValue: $('#income-value'),
    expenseValue: $('#expense-value'),
    ledgerList: $('#ledger-list'),
    ledgerEmpty: $('#ledger-empty'),
    filterRail: $('#filter-rail'),
    btnNew: $('#btn-new'),
    btnShuffle: $('#btn-shuffle'),
    btnCommit: $('#btn-commit'),
    modalVeil: $('#modal-veil'),
    modalClose: $('#modal-close'),
    typeSwitch: $('#type-switch'),
    inputAmount: $('#input-amount'),
    inputLabel: $('#input-label'),
    categoryGrid: $('#category-grid'),
    balanceCard: $('#balance-card'),
    rippleLayer: $('#ripple-layer'),
    canvas: $('#particle-canvas')
  };

  // === 应用状态 ===
  const state = {
    entries: [],
    filter: 'all',
    draftType: 'income',
    draftCat: 'food'
  };

  // === 存储层 ===
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : seedInitialEntries();
    } catch (_) {
      return seedInitialEntries();
    }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries)); } catch (_) { /* 静默降级 */ }
  }

  function seedInitialEntries() {
    const now = Date.now();
    const H = 3600e3;
    return [
      { id: uid(), type: 'income',  amount: 8800,  label: '月度薪酬',   cat: 'salary', ts: now - 30 * H },
      { id: uid(), type: 'expense', amount: 42,    label: '晨间咖啡',   cat: 'food',   ts: now - 26 * H },
      { id: uid(), type: 'expense', amount: 128,   label: '数据订阅',   cat: 'tech',   ts: now - 20 * H },
      { id: uid(), type: 'income',  amount: 233,   label: '二手出让',   cat: 'tech',   ts: now - 12 * H },
      { id: uid(), type: 'expense', amount: 258,   label: '黑胶唱片',   cat: 'fun',    ts: now - 5 * H },
      { id: uid(), type: 'expense', amount: 19.9,  label: '夜宵犒赏',   cat: 'food',   ts: now - 1 * H }
    ];
  }

  function uid() {
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // === 工具函数 ===
  function fmt(n) {
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function catOf(id) {
    return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60e3) return '刚刚';
    if (diff < 3600e3) return Math.floor(diff / 60e3) + ' 分钟前';
    if (diff < 86400e3) return Math.floor(diff / 3600e3) + ' 小时前';
    return Math.floor(diff / 86400e3) + ' 天前';
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  // === 乱码揭示 (Scramble Reveal) ===
  function scrambleReveal(el, target, duration) {
    const len = target.length;
    const start = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - start) / duration);
      const settled = Math.floor(p * len);
      let out = '';
      for (let i = 0; i < len; i += 1) {
        if (target[i] === ' ') { out += ' '; continue; }
        out += i < settled
          ? target[i]
          : SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target;
    }
    requestAnimationFrame(frame);
  }

  // === 数字滚动 (Eased Count-Up) ===
  function countUp(el, from, to, duration, formatter) {
    const start = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - start) / duration);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = formatter(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // === 汇总与渲染 ===
  function totals() {
    return state.entries.reduce((acc, e) => {
      if (e.type === 'income') acc.income += e.amount;
      else acc.expense += e.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }

  let lastBalance = 0;

  function renderStats(animateBalance) {
    const t = totals();
    const net = t.income - t.expense;
    els.incomeValue.textContent = '+¥' + fmt(t.income);
    els.expenseValue.textContent = '-¥' + fmt(t.expense);

    if (animateBalance) {
      const goingUp = net >= lastBalance;
      countUp(els.balanceValue, lastBalance, net, 900, (v) => (v < 0 ? '-¥ ' : '¥ ') + fmt(Math.abs(v)));
      els.balanceValue.classList.remove('flash-up', 'flash-down');
      // 强制 reflow 以重启动画
      void els.balanceValue.offsetWidth;
      els.balanceValue.classList.add(goingUp ? 'flash-up' : 'flash-down');
    } else {
      els.balanceValue.textContent = (net < 0 ? '-¥ ' : '¥ ') + fmt(Math.abs(net));
    }
    lastBalance = net;
  }

  function visibleEntries() {
    const sorted = state.entries.slice().sort((a, b) => b.ts - a.ts);
    return state.filter === 'all' ? sorted : sorted.filter((e) => e.cat === state.filter);
  }

  function renderFilters() {
    const counts = {};
    state.entries.forEach((e) => { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    const chips = [{ id: 'all', label: '全部', count: state.entries.length }]
      .concat(CATEGORIES.map((c) => ({ ...c, count: counts[c.id] || 0 })));
    els.filterRail.innerHTML = chips.map((c) => (
      '<button class="filter-chip' + (state.filter === c.id ? ' active' : '') +
      '" data-filter="' + c.id + '">' + c.label +
      '<span class="chip-count">' + c.count + '</span></button>'
    )).join('');
  }

  function entryNode(e, index) {
    const cat = catOf(e.cat);
    const sign = e.type === 'income' ? '+' : '-';
    const color = e.type === 'income' ? 'var(--c-income)' : 'var(--c-expense)';
    const node = document.createElement('article');
    node.className = 'entry-card ' + e.type;
    node.style.setProperty('--i', index);
    node.innerHTML =
      '<span class="entry-edge"></span>' +
      '<div class="entry-icon">' + cat.emoji + '</div>' +
      '<div class="entry-body">' +
        '<div class="entry-label">' + esc(e.label) + '</div>' +
        '<div class="entry-meta">' +
          '<span class="entry-cat">' + cat.label + '</span>' +
          '<span class="mono">' + timeAgo(e.ts) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="entry-amount mono" style="color:' + color + '">' + sign + '¥' + fmt(e.amount) + '</div>' +
      '<button class="entry-remove" data-remove="' + e.id + '" aria-label="删除">✕</button>';
    return node;
  }

  function renderLedger() {
    const list = visibleEntries();
    els.ledgerList.innerHTML = '';
    list.forEach((e, i) => els.ledgerList.appendChild(entryNode(e, i)));
    els.ledgerEmpty.classList.toggle('visible', list.length === 0);
    // 错峰入场
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        els.ledgerList.querySelectorAll('.entry-card').forEach((n) => n.classList.add('shown'));
      });
    });
  }

  function renderAll(animateBalance) {
    renderFilters();
    renderLedger();
    renderStats(animateBalance);
  }

  // === 增删操作 ===
  function addEntry(entry) {
    state.entries.push(entry);
    persist();
    renderAll(true);
    spawnRippleAt(innerWidth / 2, innerHeight / 2);
  }

  function removeEntry(id, cardEl) {
    cardEl.classList.add('leaving');
    setTimeout(() => {
      state.entries = state.entries.filter((e) => e.id !== id);
      persist();
      renderAll(true);
    }, 380);
  }

  // === 弹窗表单 ===
  function openModal() {
    els.modalVeil.classList.add('open');
    els.modalVeil.setAttribute('aria-hidden', 'false');
    setTimeout(() => els.inputAmount.focus(), 350);
  }

  function closeModal() {
    els.modalVeil.classList.remove('open');
    els.modalVeil.setAttribute('aria-hidden', 'true');
  }

  function setDraftType(type) {
    state.draftType = type;
    els.typeSwitch.dataset.active = type;
    els.typeSwitch.querySelectorAll('.type-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.type === type);
    });
  }

  function renderCategoryGrid() {
    els.categoryGrid.innerHTML = CATEGORIES.map((c) => (
      '<button class="cat-chip' + (state.draftCat === c.id ? ' active' : '') +
      '" data-cat="' + c.id + '"><span class="cat-emoji">' + c.emoji +
      '</span>' + c.label + '</button>'
    )).join('');
  }

  function commitDraft() {
    const raw = els.inputAmount.value.replace(/[^\d.]/g, '');
    const amount = parseFloat(raw);
    const label = els.inputLabel.value.trim();
    if (!amount || amount <= 0) {
      shakeEl(els.inputAmount);
      return;
    }
    if (!label) {
      shakeEl(els.inputLabel);
      return;
    }
    addEntry({
      id: uid(),
      type: state.draftType,
      amount: Math.round(amount * 100) / 100,
      label,
      cat: state.draftCat,
      ts: Date.now()
    });
    els.inputAmount.value = '';
    els.inputLabel.value = '';
    closeModal();
  }

  function shakeEl(el) {
    el.style.transition = 'transform 0.09s ease-in-out';
    let n = 0;
    const int = setInterval(() => {
      el.style.transform = 'translateX(' + (n % 2 === 0 ? -7 : 7) + 'px)';
      n += 1;
      if (n > 5) {
        clearInterval(int);
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 60);
      }
    }, 90);
    el.focus();
  }

  function shuffleEntry() {
    const pick = SHUFFLE_SAMPLES[(Math.random() * SHUFFLE_SAMPLES.length) | 0];
    addEntry({
      id: uid(),
      type: pick.type,
      amount: pick.amount,
      label: pick.label,
      cat: pick.cat,
      ts: Date.now()
    });
  }

  // === 涟漪脉冲 ===
  function spawnRippleAt(x, y, size) {
    const r = document.createElement('span');
    r.className = 'ripple';
    size = size || 90;
    r.style.width = r.style.height = size + 'px';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    els.rippleLayer.appendChild(r);
    setTimeout(() => r.remove(), 850);
  }

  // === 磁力按钮 ===
  function bindMagnetic(el, strength) {
    strength = strength || 14;
    el.addEventListener('mousemove', (ev) => {
      const rect = el.getBoundingClientRect();
      const dx = (ev.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const dy = (ev.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      el.style.transform =
        'translate(' + dx * strength + 'px,' + dy * strength + 'px)';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 700);
    });
  }

  // === 3D 倾斜卡片 ===
  function bindTilt(el, maxDeg) {
    maxDeg = maxDeg || 6;
    el.addEventListener('mousemove', (ev) => {
      const rect = el.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / rect.width - 0.5;
      const py = (ev.clientY - rect.top) / rect.height - 0.5;
      el.style.transform =
        'perspective(900px) rotateX(' + (-py * maxDeg) + 'deg) rotateY(' + (px * maxDeg) + 'deg)';
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }

  // === 粒子流场 (Simplex 风格伪流场) ===
  function startParticleField() {
    const ctx = els.canvas.getContext('2d');
    let W = 0;
    let H = 0;
    let dpr = Math.min(devicePixelRatio || 1, 2);
    const COUNT = 70;
    const particles = [];

    function resize() {
      W = innerWidth;
      H = innerHeight;
      els.canvas.width = W * dpr;
      els.canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    for (let i = 0; i < COUNT; i += 1) {
      particles.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: 0,
        vy: 0,
        r: 0.6 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2
      });
    }

    function accentRGB() {
      const styles = getComputedStyle(document.body);
      const c = styles.getPropertyValue('--c-accent').trim() || '#6ea8ff';
      const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c);
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [110, 168, 255];
    }

    let rgb = accentRGB();

    function tick(t) {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        // 伪噪声流场：时间驱动的正弦合成方向
        const ang =
          Math.sin(p.x * 0.002 + t * 0.00016 + p.phase) * 1.6 +
          Math.cos(p.y * 0.0025 - t * 0.00012) * 1.6;
        p.vx += Math.cos(ang) * 0.012;
        p.vy += Math.sin(ang) * 0.012;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;

        const tw = 0.35 + 0.3 * Math.sin(t * 0.001 + p.phase * 3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + tw.toFixed(3) + ')';
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    addEventListener('resize', resize);
    resize();
    requestAnimationFrame(tick);

    // 主题切换时刷新粒子色
    new MutationObserver(() => { rgb = accentRGB(); })
      .observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // === 主题切换 ===
  function bindThemes() {
    const dots = document.querySelectorAll('.theme-dot');
    function apply(theme) {
      document.body.dataset.theme = theme;
      dots.forEach((d) => d.classList.toggle('active', d.dataset.theme === theme));
      try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* 静默 */ }
    }
    dots.forEach((d) => d.addEventListener('click', () => {
      apply(d.dataset.theme);
      spawnRippleAt(innerWidth - 60, 40, 120);
    }));
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (_) { /* 静默 */ }
    apply(saved && ['aurora', 'ember', 'abyss', 'orchid'].includes(saved) ? saved : 'aurora');
  }

  // === 事件绑定 ===
  function bindEvents() {
    els.btnNew.addEventListener('click', openModal);
    els.modalClose.addEventListener('click', closeModal);
    els.modalVeil.addEventListener('click', (ev) => {
      if (ev.target === els.modalVeil) closeModal();
    });
    els.btnCommit.addEventListener('click', commitDraft);
    els.btnShuffle.addEventListener('click', shuffleEntry);

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeModal();
      if (ev.key === 'Enter' && els.modalVeil.classList.contains('open')) commitDraft();
    });

    els.inputAmount.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') els.inputLabel.focus();
    });

    els.typeSwitch.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.type-btn');
      if (btn) setDraftType(btn.dataset.type);
    });

    els.categoryGrid.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.cat-chip');
      if (!chip) return;
      state.draftCat = chip.dataset.cat;
      els.categoryGrid.querySelectorAll('.cat-chip').forEach((c) => {
        c.classList.toggle('active', c === chip);
      });
    });

    els.filterRail.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.filter-chip');
      if (!chip) return;
      state.filter = chip.dataset.filter;
      renderFilters();
      renderLedger();
    });

    els.ledgerList.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.entry-remove');
      if (btn) removeEntry(btn.dataset.remove, btn.closest('.entry-card'));
    });

    // 全局点击涟漪
    document.addEventListener('pointerdown', (ev) => {
      spawnRippleAt(ev.clientX, ev.clientY, 70);
    });

    // 磁力按钮 & 倾斜卡片
    document.querySelectorAll('.magnetic').forEach((el) => bindMagnetic(el));
    bindTilt(els.balanceCard, 5);
  }

  // === 启动序列 ===
  function boot() {
    state.entries = loadEntries();
    bindThemes();
    renderCategoryGrid();
    renderAll(false);
    bindEvents();
    startParticleField();

    // 标题乱码揭示
    setTimeout(() => scrambleReveal(els.title, 'VAULT LEDGER', 1400), 250);
    // 首屏余额滚动
    setTimeout(() => renderStats(true), 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
