/**
 * ═══════════════════════════════════════════════════════════
 * Archive Score Index · 档案评分索引
 * 引权综合分引擎 + FLIP 活体重排 + 乱码揭示 + 冲击波 + 粒子流场
 * maintainer: EDEN
 * ═══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  // === 常量与配置 ===
  const DIMENSIONS = [
    { key: 'value',    name: '史料价值', en: 'VALUE',    weight: 30 },
    { key: 'rarity',   name: '稀有程度', en: 'RARITY',   weight: 22 },
    { key: 'integrity',name: '完整度',   en: 'INTEGRITY',weight: 20 },
    { key: 'temporal', name: '时效活性', en: 'TEMPORAL', weight: 14 },
    { key: 'reuse',    name: '复用潜力', en: 'REUSE',    weight: 14 }
  ];
  const RING_CIRC = 2 * Math.PI * 30; // 预览环周长

  const RANDOM_TITLES = [
    '机械钟心脏图纸', '航海日志·第七卷', '萤火虫观测手记', '失落电台频谱档',
    '玻璃温室施工纪要', '候鸟迁徙信标录', '深井回声采样集', '纸质星图残页',
    '蒸汽邮局编码簿', '苔藓城市营造法', '月相葡萄酒配比', '旧城钟声频纹'
  ];

  const PRESET_ENTRIES = [
    { title: '晨雾灯塔施工日志', scores: { value: 92, rarity: 78, integrity: 88, temporal: 64, reuse: 81 } },
    { title: '地下电台频率总表', scores: { value: 85, rarity: 95, integrity: 62, temporal: 70, reuse: 58 } },
    { title: '苔藓标本采集笔记', scores: { value: 61, rarity: 55, integrity: 90, temporal: 78, reuse: 72 } },
    { title: '旧城钟楼齿轮清单', scores: { value: 74, rarity: 63, integrity: 71, temporal: 52, reuse: 88 } },
    { title: '萤火虫迁徙观测册', scores: { value: 55, rarity: 48, integrity: 66, temporal: 90, reuse: 61 } }
  ];

  // === DOM Elements ===
  const canvas = document.getElementById('particle-canvas');
  const listEl = document.getElementById('index-list');
  const emptyEl = document.getElementById('empty-state');
  const dimsEl = document.getElementById('dims-container');
  const titleInput = document.getElementById('entry-title-input');
  const previewScoreEl = document.getElementById('preview-score');
  const previewTierEl = document.getElementById('preview-tier');
  const previewRingFill = document.getElementById('preview-ring-fill');
  const meanFill = document.getElementById('mean-fill');
  const meanVal = document.getElementById('mean-val');
  const statEntries = document.getElementById('stat-entries');
  const statApex = document.getElementById('stat-apex');
  const themeDots = document.getElementById('theme-dots');

  // === State ===
  const weights = {};   // key -> weight number
  const draft = {};     // key -> score number (评级台草稿)
  const entries = [];   // { id, title, scores, prevScore, el }
  let uid = 0;

  DIMENSIONS.forEach(d => { weights[d.key] = d.weight; draft[d.key] = 60; });

  // === 工具函数 ===
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  function compositeScore(scores) {
    let sum = 0, wsum = 0;
    for (const d of DIMENSIONS) {
      sum += (scores[d.key] || 0) * (weights[d.key] || 0);
      wsum += weights[d.key] || 0;
    }
    return wsum === 0 ? 0 : sum / wsum;
  }

  function tierOf(score) {
    if (score >= 85) return { label: 'S', cls: 'tier-s' };
    if (score >= 70) return { label: 'A', cls: 'tier-a' };
    if (score >= 55) return { label: 'B', cls: 'tier-b' };
    if (score >= 40) return { label: 'C', cls: 'tier-c' };
    return { label: 'D', cls: 'tier-d' };
  }

  // === 主题系统 ===
  function setTheme(name) {
    document.body.className = 'theme-' + name;
    themeDots.querySelectorAll('.theme-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.theme === name));
    try { localStorage.setItem('asi-theme', name); } catch (e) { /* noop */ }
  }
  themeDots.addEventListener('click', (e) => {
    const dot = e.target.closest('.theme-dot');
    if (dot) setTheme(dot.dataset.theme);
  });

  // === 粒子流场背景 ===
  function initParticles() {
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const COUNT = Math.min(70, Math.floor(window.innerWidth / 22));
    for (let i = 0; i < COUNT; i++) {
      particles.push({ x: Math.random() * W, y: Math.random() * H, s: rand(0.6, 1.8), t: rand(0, 1000), v: rand(0.08, 0.3) });
    }

    function accentColor(alpha) {
      const styles = getComputedStyle(document.body);
      // 简单解析 --accent-2 (跟随主题)
      const raw = styles.getPropertyValue('--accent-2').trim() || '#4de3c8';
      const m = raw.match(/^#([0-9a-f]{6})$/i);
      if (!m) return `rgba(120,180,255,${alpha})`;
      const n = parseInt(m[1], 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      const color = accentColor(0.35);
      for (const p of particles) {
        p.t += 0.005 * p.v * 60;
        // 简易流场：正弦叠加漂移
        p.x += Math.sin(p.t * 1.3 + p.y * 0.002) * p.v * 1.4;
        p.y -= p.v * 0.5;
        if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
        if (p.x > W + 8) p.x = -8;
        if (p.x < -8) p.x = W + 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    frame();
  }

  // === 乱码揭示 ===
  const GLYPHS = '▚▞▤▦▣▢◧◨01#$%&*+=<>';
  function scrambleReveal(el, target, duration = 700) {
    const start = performance.now();
    const final = target;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const solidCount = Math.floor(eased * final.length);
      let out = final.slice(0, solidCount);
      for (let i = solidCount; i < final.length; i++) {
        out += final[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    }
    requestAnimationFrame(tick);
  }

  // === 冲击波 ===
  function shockwave(x, y) {
    const w = document.createElement('div');
    w.className = 'shockwave';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    document.body.appendChild(w);
    w.addEventListener('animationend', () => w.remove());
  }

  // === 数字滚动 ===
  function rollNumber(el, from, to, duration = 500, decimals = 0) {
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (from + (to - from) * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // === 评级台：维度滑块 ===
  function renderDims() {
    DIMENSIONS.forEach(d => {
      const row = document.createElement('div');
      row.className = 'dim-row';
      row.innerHTML = `
        <div class="dim-head">
          <span class="dim-name">${d.name}</span>
          <span class="dim-name-en mono">${d.en}</span>
        </div>
        <span class="dim-score mono" id="score-${d.key}">60</span>
        <div class="weight-ctrl">
          <button class="weight-btn" data-w="${d.key}" data-dir="-1" title="降权">−</button>
          <span class="weight-val mono" id="wv-${d.key}">${d.weight}</span>
          <button class="weight-btn" data-w="${d.key}" data-dir="1" title="加权">+</button>
        </div>
        <div class="dim-slider" id="slider-${d.key}">
          <div class="dim-track"><div class="dim-fill" id="fill-${d.key}"></div></div>
          <div class="dim-thumb" id="thumb-${d.key}"></div>
        </div>
      `;
      dimsEl.appendChild(row);
      bindSlider(d.key);
    });

    dimsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.weight-btn');
      if (!btn) return;
      const key = btn.dataset.w;
      const dir = parseInt(btn.dataset.dir, 10);
      weights[key] = clamp(weights[key] + dir * 2, 2, 50);
      document.getElementById('wv-' + key).textContent = weights[key];
      updatePreview();
      reIndex(); // 权重变化 → 全体重排
    });
  }

  function bindSlider(key) {
    const slider = document.getElementById('slider-' + key);
    const fill = document.getElementById('fill-' + key);
    const thumb = document.getElementById('thumb-' + key);
    const scoreEl = document.getElementById('score-' + key);

    function setFromEvent(clientX) {
      const rect = slider.getBoundingClientRect();
      const p = clamp((clientX - rect.left) / rect.width, 0, 1);
      const val = Math.round(p * 100);
      draft[key] = val;
      fill.style.width = p * 100 + '%';
      thumb.style.left = p * 100 + '%';
      scoreEl.textContent = val;
      updatePreview();
    }

    let dragging = false;
    slider.addEventListener('pointerdown', (e) => {
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      setFromEvent(e.clientX);
    });
    slider.addEventListener('pointermove', (e) => { if (dragging) setFromEvent(e.clientX); });
    slider.addEventListener('pointerup', () => { dragging = false; });
    slider.addEventListener('pointercancel', () => { dragging = false; });

    // 初始位置
    fill.style.width = draft[key] + '%';
    thumb.style.left = draft[key] + '%';
  }

  function updatePreview() {
    const score = compositeScore(draft);
    previewScoreEl.textContent = score.toFixed(1);
    const tier = tierOf(score);
    previewTierEl.textContent = tier.label;
    previewTierEl.style.color = `var(--${tier.cls})`;
    previewTierEl.style.boxShadow = `0 0 18px -6px var(--${tier.cls})`;
    previewRingFill.style.strokeDashoffset = RING_CIRC * (1 - score / 100);
    previewRingFill.style.stroke = `var(--${tier.cls})`;
  }

  // === 条目管理 ===
  function makeSparkSVG(scores) {
    const bw = 34, gap = 8;
    let bars = '';
    DIMENSIONS.forEach((d, i) => {
      const h = 4 + (scores[d.key] / 100) * 20;
      const x = i * (bw / DIMENSIONS.length + gap / DIMENSIONS.length);
      bars += `<rect class="spark-bar" data-dim="${d.key}" x="${x}" y="${24 - h}" width="${bw / DIMENSIONS.length - 4}" height="${h}" rx="1.5" fill="var(--accent-2)"></rect>`;
    });
    return `<svg viewBox="0 0 ${bw + 4} 24" preserveAspectRatio="none">${bars}</svg>`;
  }

  function addEntry(title, scores, opts = {}) {
    const entry = {
      id: ++uid,
      title,
      scores: { ...scores },
      prevScore: null,
      el: null
    };
    entry.composite = compositeScore(scores);
    entries.push(entry);

    const li = document.createElement('li');
    li.className = 'entry-card';
    li.dataset.id = entry.id;
    li.innerHTML = `
      <button class="entry-del" title="销毁条目">×</button>
      <div class="entry-rank mono">--</div>
      <div class="entry-main">
        <div class="entry-title-row">
          <span class="entry-title"></span>
          <span class="entry-tier-badge"></span>
        </div>
        <div class="entry-meta mono"></div>
        <div class="entry-spark">${makeSparkSVG(entry.scores)}</div>
      </div>
      <div class="entry-score-wrap">
        <span class="entry-score">--</span>
        <span class="entry-delta mono"></span>
      </div>
    `;
    entry.el = li;
    listEl.appendChild(li);
    scrambleReveal(li.querySelector('.entry-title'), title, opts.fast ? 450 : 750);
    emptyEl.classList.add('hidden');
    reIndex();
    return entry;
  }

  function removeEntry(id, btnEl) {
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return;
    const card = entries[idx].el;
    card.classList.add('leaving');
    card.addEventListener('animationend', () => {
      entries.splice(idx, 1);
      card.remove();
      if (entries.length === 0) emptyEl.classList.remove('hidden');
      reIndex();
    }, { once: true });
  }

  // === FLIP 活体重排 ===
  function reIndex() {
    // First: 记录旧位置
    const firstPos = new Map();
    entries.forEach(e => {
      if (e.el && e.el.isConnected) firstPos.set(e.el, e.el.getBoundingClientRect().top);
    });

    // 排序（综合分降序，相同则 id 小者在前）
    entries.sort((a, b) => b.composite - a.composite || a.id - b.id);

    // 重排 DOM + 更新内容
    entries.forEach((e, i) => {
      listEl.appendChild(e.el);
      const rankEl = e.el.querySelector('.entry-rank');
      const scoreEl = e.el.querySelector('.entry-score');
      const deltaEl = e.el.querySelector('.entry-delta');
      const badgeEl = e.el.querySelector('.entry-tier-badge');
      const metaEl = e.el.querySelector('.entry-meta');

      rankEl.textContent = String(i + 1).padStart(2, '0');
      e.el.classList.toggle('is-top', i === 0);
      scoreEl.textContent = e.composite.toFixed(1);

      const tier = tierOf(e.composite);
      badgeEl.textContent = tier.label;
      badgeEl.style.color = `var(--${tier.cls})`;
      badgeEl.style.boxShadow = `0 0 14px -5px var(--${tier.cls})`;

      const dimsStr = DIMENSIONS.map(d => `${d.en.slice(0, 3)} ${String(Math.round(e.scores[d.key])).padStart(2, '0')}`).join(' · ');
      metaEl.textContent = `#${String(e.id).padStart(3, '0')} · ${dimsStr}`;

      if (e.prevScore !== null && Math.abs(e.composite - e.prevScore) >= 0.05) {
        const diff = e.composite - e.prevScore;
        deltaEl.textContent = (diff > 0 ? '▲ +' : '▼ ') + diff.toFixed(1);
        deltaEl.className = 'entry-delta mono show ' + (diff > 0 ? 'up' : 'down');
        clearTimeout(e._deltaTimer);
        e._deltaTimer = setTimeout(() => deltaEl.classList.remove('show'), 2200);
      }
      e.prevScore = e.composite;

      // 微条形图实时反映（含权重 → 透明度映射）
      e.el.querySelectorAll('.spark-bar').forEach(bar => {
        const key = bar.dataset.dim;
        const h = 4 + (e.scores[key] / 100) * 20;
        bar.setAttribute('height', h.toFixed(1));
        bar.setAttribute('y', (24 - h).toFixed(1));
        bar.style.opacity = (0.3 + 0.7 * (weights[key] / 50)).toFixed(2);
      });
    });

    // 统计与均值
    statEntries.textContent = String(entries.length).padStart(2, '0');
    if (entries.length > 0) {
      statApex.textContent = entries[0].composite.toFixed(1);
      const mean = entries.reduce((s, e) => s + e.composite, 0) / entries.length;
      meanFill.style.width = mean + '%';
      meanVal.textContent = mean.toFixed(1);
    } else {
      statApex.textContent = '--';
      meanFill.style.width = '0%';
      meanVal.textContent = '--.-';
    }

    // Invert & Play
    requestAnimationFrame(() => {
      entries.forEach(e => {
        if (!firstPos.has(e.el)) return;
        const dy = firstPos.get(e.el) - e.el.getBoundingClientRect().top;
        if (Math.abs(dy) < 2) return;
        e.el.style.transform = `translateY(${dy}px)`;
        e.el.style.transition = 'none';
        requestAnimationFrame(() => {
          e.el.style.transition = '';
          e.el.classList.add('flip-move');
          e.el.style.transform = '';
          const clean = () => { e.el.classList.remove('flip-move'); e.el.removeEventListener('transitionend', clean); };
          e.el.addEventListener('transitionend', clean);
          setTimeout(clean, 850);
        });
      });
    });
  }

  // === 事件绑定 ===
  document.getElementById('btn-add').addEventListener('click', (e) => {
    const title = titleInput.value.trim() || RANDOM_TITLES[Math.floor(Math.random() * RANDOM_TITLES.length)];
    addEntry(title, { ...draft });
    titleInput.value = '';
    titleInput.focus();
    shockwave(e.clientX, e.clientY);
  });

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-add').click();
  });

  document.getElementById('btn-random').addEventListener('click', (e) => {
    const scores = {};
    DIMENSIONS.forEach(d => { scores[d.key] = Math.round(rand(20, 98)); });
    addEntry(RANDOM_TITLES[Math.floor(Math.random() * RANDOM_TITLES.length)], scores, { fast: true });
    shockwave(e.clientX, e.clientY);
  });

  document.getElementById('btn-jitter').addEventListener('click', (e) => {
    entries.forEach(entry => {
      DIMENSIONS.forEach(d => {
        entry.scores[d.key] = clamp(Math.round(entry.scores[d.key] + rand(-3, 3)), 0, 100);
      });
      entry.composite = compositeScore(entry.scores);
    });
    reIndex();
    shockwave(e.clientX, e.clientY);
  });

  listEl.addEventListener('click', (e) => {
    const card = e.target.closest('.entry-card');
    if (!card) return;
    if (e.target.closest('.entry-del')) {
      removeEntry(parseInt(card.dataset.id, 10), e.target);
      return;
    }
    // 点击条目：该条目所有维度 +2，可能引发升位
    const entry = entries.find(en => en.id === parseInt(card.dataset.id, 10));
    if (entry) {
      DIMENSIONS.forEach(d => { entry.scores[d.key] = clamp(entry.scores[d.key] + 2, 0, 100); });
      entry.composite = compositeScore(entry.scores);
      reIndex();
    }
    shockwave(e.clientX, e.clientY);
  });

  // === 启动 ===
  function init() {
    let saved = 'obsidian';
    try { saved = localStorage.getItem('asi-theme') || 'obsidian'; } catch (e) { /* noop */ }
    setTheme(saved);
    renderDims();
    updatePreview();
    initParticles();
    scrambleReveal(document.getElementById('app-title'), 'ARCHIVE SCORE INDEX', 1100);

    PRESET_ENTRIES.forEach((p, i) => {
      setTimeout(() => addEntry(p.title, p.scores, { fast: true }), 380 + i * 160);
    });
  }

  init();
})();
