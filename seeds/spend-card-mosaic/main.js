/**
 * ═══════════════════════════════════════════════════════════
 * Spend Card Mosaic · 消费卡片马赛克
 * 沉浸式消费总览：卡片马赛克 + FLIP 详情展开 +
 * 3D 倾斜 + 数字递增 + 涟漪粒子 + 环境粒子流场
 * maintainer: EDEN
 * ═══════════════════════════════════════════════════════════
 */
(() => {
  'use strict';

  // === 数据模型 (Domain Data) ===

  const CATEGORIES = [
    { id: 'housing',   name: '居住 Housing',   icon: '⌂', hue: 210, size: 'wide', budget: 5200 },
    { id: 'dining',    name: '餐饮 Dining',    icon: '⚜', hue: 28,  size: 'std',  budget: 2200 },
    { id: 'shopping',  name: '购物 Shopping',  icon: '◈', hue: 320, size: 'std',  budget: 1800 },
    { id: 'transit',   name: '交通 Transit',   icon: '⇄', hue: 190, size: 'std',  budget: 800 },
    { id: 'coffee',    name: '咖啡 Coffee',    icon: '☕', hue: 40,  size: 'std',  budget: 500 },
    { id: 'leisure',   name: '娱乐 Leisure',   icon: '♪', hue: 265, size: 'std',  budget: 1200 },
    { id: 'subs',      name: '订阅 Subs',      icon: '⟳', hue: 155, size: 'std',  budget: 400 },
    { id: 'travel',    name: '旅行 Travel',    icon: '✈', hue: 230, size: 'std',  budget: 2000 },
    { id: 'health',    name: '健康 Health',    icon: '♥', hue: 0,   size: 'std',  budget: 600 }
  ];

  const MONTHS = [
    {
      id: '2026-07', label: 'JUL 2026',
      spends: { housing: 4800, dining: 1980, shopping: 1450, transit: 640, coffee: 388, leisure: 960, subs: 348, travel: 0, health: 220 },
      trends: {
        housing:  [12, 15, 14, 17, 16, 19, 18, 21, 20, 23, 22, 25],
        dining:   [30, 26, 34, 28, 38, 31, 42, 36, 45, 39, 48, 52],
        shopping: [18, 22, 15, 28, 20, 33, 24, 36, 27, 40, 31, 44],
        transit:  [10, 14, 12, 17, 15, 19, 14, 20, 16, 22, 18, 21],
        coffee:   [40, 44, 42, 48, 45, 52, 47, 55, 50, 58, 53, 60],
        leisure:  [20, 18, 25, 22, 30, 26, 34, 29, 38, 33, 42, 40],
        subs:     [28, 28, 29, 28, 30, 30, 31, 30, 32, 31, 33, 32],
        travel:   [0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 18],
        health:   [5, 8, 6, 10, 7, 12, 8, 14, 9, 15, 11, 16]
      }
    },
    {
      id: '2026-08', label: 'AUG 2026',
      spends: { housing: 4800, dining: 2240, shopping: 1980, transit: 720, coffee: 452, leisure: 1180, subs: 352, travel: 1580, health: 310 },
      trends: {
        housing:  [13, 16, 15, 18, 17, 20, 19, 22, 21, 24, 23, 26],
        dining:   [34, 38, 36, 42, 40, 46, 44, 50, 47, 54, 52, 58],
        shopping: [22, 26, 19, 32, 24, 37, 28, 41, 32, 45, 36, 49],
        transit:  [12, 16, 14, 19, 17, 21, 16, 22, 18, 24, 20, 23],
        coffee:   [44, 48, 46, 52, 49, 56, 51, 59, 54, 62, 57, 64],
        leisure:  [24, 22, 29, 26, 34, 30, 38, 33, 42, 37, 46, 44],
        subs:     [29, 29, 30, 29, 31, 31, 32, 31, 33, 32, 34, 33],
        travel:   [0, 0, 14, 0, 0, 0, 22, 0, 0, 16, 0, 0],
        health:   [7, 10, 8, 12, 9, 14, 10, 16, 11, 17, 13, 18]
      }
    },
    {
      id: '2026-09', label: 'SEP 2026',
      spends: { housing: 4800, dining: 2085, shopping: 1620, transit: 655, coffee: 415, leisure: 1010, subs: 348, travel: 820, health: 268 },
      trends: {
        housing:  [14, 17, 16, 19, 18, 21, 20, 23, 22, 25, 24, 27],
        dining:   [36, 34, 39, 37, 42, 38, 44, 41, 46, 43, 48, 45],
        shopping: [24, 21, 27, 23, 33, 26, 36, 30, 39, 33, 41, 35],
        transit:  [13, 12, 17, 14, 20, 16, 21, 17, 23, 19, 22, 18],
        coffee:   [46, 43, 50, 45, 54, 48, 57, 52, 60, 55, 58, 53],
        leisure:  [26, 28, 24, 31, 28, 36, 31, 40, 35, 44, 38, 42],
        subs:     [30, 29, 31, 30, 32, 31, 33, 32, 34, 33, 35, 34],
        travel:   [0, 0, 0, 18, 0, 0, 0, 0, 24, 0, 0, 0],
        health:   [8, 11, 9, 13, 10, 15, 11, 17, 12, 18, 14, 19]
      }
    }
  ];

  const BREAKDOWN = {
    housing:   [{ n: '房租 Rent' }, { n: '水电 Utility' }, { n: '物业 mgmt' }],
    dining:    [{ n: '外卖 Takeout' }, { n: '堂食 Bistro' }, { n: '生鲜 Grocery' }],
    shopping:  [{ n: '服饰 Apparel' }, { n: '数码 Gadget' }, { n: '日用 Daily' }],
    transit:   [{ n: '地铁 Metro' }, { n: '打车 Ride' }, { n: '共享 Bike' }],
    coffee:    [{ n: '拿铁 Latte' }, { n: '手冲 Pour-over' }, { n: '豆子 Beans' }],
    leisure:   [{ n: '电影 Cinema' }, { n: '演出 Live' }, { n: '游戏 Game' }],
    subs:      [{ n: '流媒体 Stream' }, { n: '云存储 Cloud' }, { n: '软件 Apps' }],
    travel:    [{ n: '机票 Flights' }, { n: '住宿 Stay' }, { n: '当地 Local' }],
    health:    [{ n: '健身 Fitness' }, { n: '药品 Pharma' }, { n: '检查 Checkup' }]
  };

  const TOTAL_BUDGET = 14800;

  // === DOM Elements ===

  const mosaicEl = document.getElementById('mosaic');
  const monthTabsEl = document.getElementById('month-tabs');
  const totalEl = document.getElementById('total-amount');
  const deltaEl = document.getElementById('total-delta');
  const ringEl = document.getElementById('budget-ring');
  const ringPercentEl = document.getElementById('ring-percent');
  const budgetAmountEl = document.getElementById('budget-amount');
  const topCategoryEl = document.getElementById('top-category');
  const dailyAvgEl = document.getElementById('daily-avg');
  const themePickerEl = document.getElementById('theme-picker');
  const overlayEl = document.getElementById('detail-overlay');
  const detailCardEl = document.getElementById('detail-card');
  const detailCloseEl = document.getElementById('detail-close');

  // === 状态 ===

  const state = { monthIndex: 2, activeCard: null };

  // === 工具函数 ===

  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function catColor(hue) {
    return `hsl(${hue} 78% 64%)`;
  }

  function monthTotal(month) {
    return Object.values(month.spends).reduce((s, v) => s + v, 0);
  }

  function prevMonth(index) {
    return index > 0 ? MONTHS[index - 1] : null;
  }

  // === 数字递增 (Count-up) ===

  function countUp(el, target, duration = 1200) {
    const from = Number(el.dataset.count || 0);
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const val = lerp(from, target, easeOutExpo(t));
      el.textContent = fmt(val);
      if (t < 1) requestAnimationFrame(tick);
      else el.dataset.count = target;
    }
    requestAnimationFrame(tick);
  }

  // === 迷你趋势线 (Sparkline SVG) ===

  function sparkPath(values, w, h, pad = 3) {
    const max = Math.max(...values, 1);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    const stepX = (w - pad * 2) / (values.length - 1);
    return values.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  function buildDetailSpark(values) {
    const svg = document.getElementById('detail-spark');
    const line = sparkPath(values, 320, 90, 6);
    svg.innerHTML =
      `<path class="area" d="${line} L314,86 L6,86 Z"></path>` +
      `<path class="line" d="${line}"></path>`;
  }

  // === 卡片渲染 ===

  function deltaOf(monthIndex, catId) {
    const prev = prevMonth(monthIndex);
    if (!prev) return 0;
    const cur = MONTHS[monthIndex].spends[catId];
    const old = prev.spends[catId];
    if (old === 0) return cur > 0 ? 100 : 0;
    return ((cur - old) / old) * 100;
  }

  function createCard(cat, i, monthIndex) {
    const spend = MONTHS[monthIndex].spends[cat.id];
    const delta = deltaOf(monthIndex, cat.id);
    const ratio = spend / cat.budget;
    const span = cat.size === 'wide' ? 3 : 2;

    const card = document.createElement('article');
    card.className = 'spend-card';
    card.dataset.id = cat.id;
    card.dataset.size = cat.size;
    card.style.setProperty('--cat', catColor(cat.hue));
    card.style.setProperty('--span', span);
    card.style.setProperty('--delay', `${0.06 * i + 0.15}s`);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${cat.name} 支出 ${fmt(spend)} 元`);

    const trend = MONTHS[monthIndex].trends[cat.id];
    const spark = sparkPath(trend, 84, 30);

    const deltaCls = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : '';
    const deltaArrow = delta > 0.5 ? '▲' : delta < -0.5 ? '▼' : '—';
    const budgetPct = Math.min(ratio * 100, 100).toFixed(0);

    card.innerHTML = `
      <div class="card-head">
        <span class="card-icon">${cat.icon}</span>
        <span class="card-delta ${deltaCls} mono">${deltaArrow} ${Math.abs(delta).toFixed(1)}%</span>
      </div>
      <div class="card-body">
        <p class="card-name">${cat.name}</p>
        <p class="card-amount"><span class="cur">¥</span>${fmt(spend)}</p>
      </div>
      <div class="card-foot">
        <div class="card-budget">
          <div class="budget-track"><div class="budget-fill ${ratio > 1 ? 'over' : ''}" data-w="${budgetPct}%"></div></div>
          <p class="budget-label">${budgetPct}% of ¥${fmt(cat.budget)}</p>
        </div>
        <svg class="card-spark" viewBox="0 0 84 30" preserveAspectRatio="none"><path d="${spark}"></path></svg>
      </div>
    `;

    attachCardInteractions(card);
    return card;
  }

  function renderMosaic(monthIndex, animate = true) {
    const prevCards = mosaicEl.querySelectorAll('.spend-card');
    if (animate && prevCards.length) {
      prevCards.forEach((c) => { c.style.opacity = '0'; c.style.translate = '0 18px'; });
    }
    mosaicEl.classList.remove('swap');
    void mosaicEl.offsetWidth; // 强制 reflow 以重启动画
    mosaicEl.classList.add('swap');
    mosaicEl.innerHTML = '';
    CATEGORIES.forEach((cat, i) => mosaicEl.appendChild(createCard(cat, i, monthIndex)));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mosaicEl.querySelectorAll('.budget-fill').forEach((f) => {
          f.style.width = f.dataset.w;
        });
      });
    });
  }

  // === 概览渲染 ===

  function renderOverview(monthIndex) {
    const month = MONTHS[monthIndex];
    const total = monthTotal(month);
    const prev = prevMonth(monthIndex);
    countUp(totalEl, total, 1300);
    budgetAmountEl.textContent = fmt(TOTAL_BUDGET);

    if (prev) {
      const prevTotal = monthTotal(prev);
      const pct = ((total - prevTotal) / prevTotal) * 100;
      const cls = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : '';
      deltaEl.className = `overview-delta ${cls}`;
      deltaEl.textContent = pct > 0.5
        ? `▲ ${pct.toFixed(1)}% 较上期增加`
        : pct < -0.5
          ? `▼ ${Math.abs(pct).toFixed(1)}% 较上期减少`
          : '— 与上期持平';
    } else {
      deltaEl.textContent = '— 首期记录';
    }

    const usage = Math.min(total / TOTAL_BUDGET, 1);
    const CIRC = 2 * Math.PI * 52;
    ringEl.style.strokeDashoffset = String(CIRC * (1 - usage));
    countUp(ringPercentEl, usage * 100, 1200);
    ringPercentEl.dataset.count = usage * 100;
    ringPercentEl.textContent = `${Math.round(usage * 100)}%`;

    const days = monthIndex === 2 ? 21 : 31; // 当月进行中
    countUp(dailyAvgEl, total / days, 1100);

    const top = CATEGORIES.reduce((a, b) => (month.spends[a.id] >= month.spends[b.id] ? a : b));
    topCategoryEl.textContent = top.name.split(' ')[0];
  }

  // === 月份切换 ===

  function renderMonthTabs() {
    monthTabsEl.innerHTML = '';
    MONTHS.forEach((m, i) => {
      const btn = document.createElement('button');
      btn.className = `month-tab mono ${i === state.monthIndex ? 'active' : ''}`;
      btn.textContent = m.label;
      btn.addEventListener('click', () => {
        if (state.monthIndex === i) return;
        state.monthIndex = i;
        monthTabsEl.querySelectorAll('.month-tab').forEach((t, ti) => t.classList.toggle('active', ti === i));
        renderMosaic(i);
        renderOverview(i);
      });
      monthTabsEl.appendChild(btn);
    });
  }

  // === 3D 倾斜 + 眩光 (Tilt & Glare) ===

  function attachCardInteractions(card) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
      card.style.setProperty('--ry', `${(px - 0.5) * 12}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });

    card.addEventListener('click', (e) => {
      spawnRipple(card, e);
      spawnParticles(e, card);
      openDetail(card.dataset.id);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail(card.dataset.id);
      }
    });
  }

  // === 点击涟漪 ===

  function spawnRipple(card, e) {
    const r = card.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.4;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - r.left - size / 2}px`;
    ripple.style.top = `${e.clientY - r.top - size / 2}px`;
    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 850);
  }

  // === 迸射粒子 ===

  function spawnParticles(e, card) {
    const color = getComputedStyle(card).getPropertyValue('--cat').trim() || '#fff';
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('span');
      p.className = 'spark-particle';
      p.style.left = `${e.clientX}px`;
      p.style.top = `${e.clientY}px`;
      p.style.background = i % 3 === 0 ? '#ffffff' : color;
      document.body.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const dist = 46 + Math.random() * 92;
      p.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0)`,
          opacity: 0
        }
      ], { duration: 620 + Math.random() * 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
        .onfinish = () => p.remove();
    }
  }

  // === FLIP 详情展开 ===

  function detailData(catId) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    const month = MONTHS[state.monthIndex];
    const spend = month.spends[catId];
    const total = monthTotal(month);
    const items = BREAKDOWN[catId].map((b, i) => ({
      ...b,
      amount: Math.round(spend * [0.5, 0.32, 0.18][i])
    }));
    return { cat, month, spend, total, items, delta: deltaOf(state.monthIndex, catId) };
  }

  function openDetail(catId) {
    const { cat, month, spend, total, items, delta } = detailData(catId);
    const srcCard = mosaicEl.querySelector(`[data-id="${catId}"]`);
    const srcRect = srcCard.getBoundingClientRect();

    detailCardEl.style.setProperty('--cat', catColor(cat.hue));
    document.getElementById('detail-icon').textContent = cat.icon;
    document.getElementById('detail-title').textContent = cat.name;
    document.getElementById('detail-sub').textContent = `${month.label} · Category Ledger`;

    const amountEl = document.getElementById('detail-amount');
    amountEl.textContent = `¥ ${fmt(spend)}`;
    document.getElementById('detail-share').textContent = `${((spend / total) * 100).toFixed(1)}%`;

    const deltaEl2 = document.getElementById('detail-delta');
    const cls = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : '';
    deltaEl2.className = `detail-delta ${cls}`;
    deltaEl2.textContent = delta > 0.5
      ? `▲ 较上期增加 ${delta.toFixed(1)}%`
      : delta < -0.5
        ? `▼ 较上期减少 ${Math.abs(delta).toFixed(1)}%`
        : '— 与上期持平';

    buildDetailSpark(month.trends[catId]);

    const maxItem = Math.max(...items.map((i) => i.amount), 1);
    document.getElementById('detail-breakdown').innerHTML = items.map((it) => `
      <div class="break-row">
        <span class="break-name">${it.n}</span>
        <div class="break-track"><div class="break-fill" style="--w: ${(it.amount / maxItem) * 100}%"></div></div>
        <span class="break-val">¥ ${fmt(it.amount)}</span>
      </div>
    `).join('');

    // FLIP: 从源卡片矩形飞至中心
    overlayEl.classList.add('open');
    overlayEl.setAttribute('aria-hidden', 'false');
    detailCardEl.style.visibility = 'visible';

    const targetRect = detailCardEl.getBoundingClientRect();
    const dx = srcRect.left + srcRect.width / 2 - (targetRect.left + targetRect.width / 2);
    const dy = srcRect.top + srcRect.height / 2 - (targetRect.top + targetRect.height / 2);
    detailCardEl.style.setProperty('--fx', `${dx}px`);
    detailCardEl.style.setProperty('--fy', `${dy}px`);
    detailCardEl.style.setProperty('--fsx', String(srcRect.width / targetRect.width));
    detailCardEl.style.setProperty('--fsy', String(srcRect.height / targetRect.height));
    detailCardEl.classList.add('flipped');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => detailCardEl.classList.remove('flipped'));
    });

    state.activeCard = srcCard;
    document.body.style.overflow = 'hidden';
    detailCloseEl.focus();
  }

  function closeDetail() {
    detailCardEl.classList.add('flipped');
    overlayEl.classList.remove('open');
    overlayEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { detailCardEl.style.visibility = 'hidden'; }, 520);
  }

  detailCloseEl.addEventListener('click', closeDetail);
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl.classList.contains('open')) closeDetail();
  });

  // === 主题切换 ===

  themePickerEl.addEventListener('click', (e) => {
    const dot = e.target.closest('.theme-dot');
    if (!dot) return;
    document.body.dataset.theme = dot.dataset.theme;
    themePickerEl.querySelectorAll('.theme-dot').forEach((d) => d.classList.toggle('active', d === dot));
  });

  // === 环境粒子流场 (Drift Field) ===

  function initDriftField() {
    const canvas = document.getElementById('drift-field');
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];

    function resize() {
      w = canvas.width = window.innerWidth * devicePixelRatio;
      h = canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    }

    function seed() {
      const count = Math.min(90, Math.floor(window.innerWidth / 16));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.4 + 0.4) * devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.22 * devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.22 * devicePixelRatio,
        a: Math.random() * 0.35 + 0.08,
        ph: Math.random() * Math.PI * 2
      }));
    }

    function accentColor() {
      const styles = getComputedStyle(document.body);
      return styles.getPropertyValue('--accent').trim() || '#5eead4';
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      const color = accentColor();
      for (const p of particles) {
        p.ph += 0.004;
        p.x += p.vx + Math.sin(p.ph) * 0.18 * devicePixelRatio;
        p.y += p.vy + Math.cos(p.ph * 0.8) * 0.14 * devicePixelRatio;
        if (p.x < -8) p.x = w + 8; if (p.x > w + 8) p.x = -8;
        if (p.y < -8) p.y = h + 8; if (p.y > h + 8) p.y = -8;
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 0.001 + p.ph * 3));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    resize();
    seed();
    window.addEventListener('resize', () => { resize(); seed(); });
    requestAnimationFrame(frame);
  }

  // === 初始化 ===

  function init() {
    themePickerEl.querySelector(`[data-theme="${document.body.dataset.theme}"]`)?.classList.add('active');
    renderMonthTabs();
    renderMosaic(state.monthIndex, false);
    renderOverview(state.monthIndex);
    initDriftField();
  }

  init();
})();
