/* ==========================================================================
   Link Rolodex · 链接旋转夹
   交互逻辑：旋转夹导航 / 拖拽甩动 / 卡片翻转 / 搜索过滤 / 标签 / 本地持久化
   ========================================================================== */

(() => {
  'use strict';

  // === Constants & State ===
  const STORE_KEY = 'link-rolodex:links:v1';
  const THEME_KEY = 'link-rolodex:theme:v1';

  const DEFAULT_LINKS = [
    { title: 'Are.na', url: 'https://www.are.na', tag: 'inspiration', note: '协作式灵感拼贴板，思维的慢社交。' },
    { title: 'Awwwards', url: 'https://www.awwwards.com', tag: 'design', note: '前沿网页设计的风向标。' },
    { title: 'CSS-Tricks', url: 'https://css-tricks.com', tag: 'code', note: 'CSS 技巧的永久宝库。' },
    { title: 'CodePen', url: 'https://codepen.io', tag: 'code', note: '前端创意游乐场。' },
    { title: 'SiteInspire', url: 'https://www.siteinspire.com', tag: 'design', note: '极简主义网站陈列馆。' },
    { title: 'The Verge', url: 'https://www.theverge.com', tag: 'reading', note: '科技文化的脉冲新闻。' }
  ];

  let links = loadLinks();
  let activeIndex = 0;          // 当前聚焦卡片（在可见列表中）
  let visibleLinks = [...links]; // 过滤后的视图
  let activeTag = null;
  let searchQuery = '';
  let dragState = null;

  // === DOM Elements ===
  const $ = (sel) => document.querySelector(sel);
  const cardOrbit = $('#cardOrbit');
  const counterText = $('#counterText');
  const searchInput = $('#searchInput');
  const tagCloud = $('#tagCloud');
  const tagList = $('#tagList');
  const statsRow = $('#statsRow');
  const toastEl = $('#toast');
  const form = $('#linkForm');

  // === Persistence ===
  function loadLinks() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) { /* fallthrough */ }
    return [...DEFAULT_LINKS];
  }
  function saveLinks() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(links)); } catch (_) {}
  }

  // === Utilities ===
  const uid = () => Math.random().toString(36).slice(2, 9);
  const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return url; } };
  const initialOf = (title) => (title.trim()[0] || '?').toUpperCase();
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // === Rolodex 布局：以中轴为轮心，卡片按轮盘弧线排布 ===
  function layoutCards(animateEnter) {
    cardOrbit.innerHTML = '';
    const n = visibleLinks.length;
    if (!n) {
      counterText.textContent = '00 / 00';
      renderEmpty();
      return;
    }
    activeIndex = Math.min(activeIndex, n - 1);

    visibleLinks.forEach((link, i) => {
      const card = document.createElement('article');
      card.className = 'r-card';
      card.dataset.index = i;
      if (i === activeIndex && animateEnter) card.classList.add('entering');
      card.innerHTML = buildCardHTML(link, i, n);
      cardOrbit.appendChild(card);
      positionCard(card, i, activeIndex, n);
      bindCardEvents(card, link);
    });
    updateCounter(n);
  }

  function buildCardHTML(link, i, n) {
    const idx = String(i + 1).padStart(2, '0');
    const total = String(n).padStart(2, '0');
    return `
      <div class="card-inner">
        <div class="card-face card-front">
          <div class="card-top">
            <span class="card-index">№ ${idx} <span style="opacity:.4">/ ${total}</span></span>
            <div class="card-avatar">${escapeHtml(initialOf(link.title))}</div>
          </div>
          <div class="card-mid">
            <h3 class="card-title">${escapeHtml(link.title)}</h3>
            <p class="card-host">${escapeHtml(hostOf(link.url))}</p>
            ${link.note ? `<p class="card-note">${escapeHtml(link.note)}</p>` : ''}
          </div>
          <div class="card-bottom">
            <span class="card-tag">${escapeHtml(link.tag || 'untagged')}</span>
            <div class="card-actions">
              <button class="icon-btn act-flip" title="翻转 (F)">⟳</button>
              <button class="icon-btn act-copy" title="复制链接">⧉</button>
              <button class="icon-btn danger act-del" title="移除">✕</button>
            </div>
          </div>
        </div>
        <div class="card-face card-back">
          <span class="back-glyph">◎</span>
          <h3 class="back-title">${escapeHtml(link.title)}</h3>
          <p class="back-url">${escapeHtml(link.url)}</p>
          <button class="visit-btn act-visit">Open Link ↗</button>
        </div>
      </div>`;
  }

  // 轮盘位置：相邻卡片向后上方错位堆叠，模拟 Rolodex 弧
  function positionCard(card, i, active, n) {
    const offset = i - active;
    const abs = Math.abs(offset);
    const dir = Math.sign(offset);
    const stack = Math.min(abs, 4); // 最多显示 4 层深度
    if (abs > 4) {
      card.style.opacity = '0';
      card.style.pointerEvents = 'none';
      card.style.transform = `translate(-50%, -50%) translateY(${dir * -180}px) scale(0.7)`;
      return;
    }
    const translateY = dir * (stack * stack * 7 + stack * 10) * -1;
    const translateX = dir * stack * 14;
    const rotate = dir * stack * 3;
    const scale = 1 - stack * 0.055;
    card.style.opacity = String(1 - stack * 0.22);
    card.style.filter = stack ? `blur(${stack * 0.8}px)` : 'none';
    card.style.zIndex = String(20 - abs);
    card.style.pointerEvents = abs === 0 ? 'auto' : 'none';
    card.style.transform =
      `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`;
  }

  function renderEmpty() {
    cardOrbit.innerHTML = `
      <div class="glass" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        padding:48px 40px;text-align:center;border-radius:24px;">
        <p style="font-size:40px;margin-bottom:12px;">∅</p>
        <p style="font-family:var(--font-display);font-size:18px;">夹中空空如也</p>
        <p style="color:var(--ink-dim);font-size:13px;margin-top:8px;">在右侧面板收入第一张联系人卡片</p>
      </div>`;
    renderTags();
    renderStats();
  }

  function updateCounter(n) {
    counterText.innerHTML =
      `<span class="tick">${String(activeIndex + 1).padStart(2, '0')}</span> / ${String(n).padStart(2, '0')}`;
    renderTags();
    renderStats();
  }

  // === 导航 ===
  function go(step) {
    const n = visibleLinks.length;
    if (!n) return;
    activeIndex = (activeIndex + step + n) % n;
    relayout();
    spinGlow(step);
  }

  let spinTimer = null;
  function spinGlow(step) {
    const spine = document.querySelector('.spine');
    if (!spine) return;
    spine.style.boxShadow = '0 0 46px var(--c2), 0 0 90px var(--c2)';
    spine.style.filter = 'brightness(1.4)';
    clearTimeout(spinTimer);
    spinTimer = setTimeout(() => {
      spine.style.boxShadow = '';
      spine.style.filter = '';
    }, 380);
  }

  function relayout() {
    const n = visibleLinks.length;
    document.querySelectorAll('.r-card').forEach((card) => {
      const i = Number(card.dataset.index);
      positionCard(card, i, activeIndex, n);
    });
    updateCounter(n);
  }

  // === 卡片事件 ===
  function bindCardEvents(card, link) {
    // 光晕跟随
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });

    // 拖拽甩动
    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.icon-btn, .act-visit')) return;
      dragState = { startX: e.clientX, startY: e.clientY, moved: false, card };
      card.classList.add('is-dragging');
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener('pointermove', (e) => {
      if (!dragState || dragState.card !== card) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) dragState.moved = true;
      card.style.transform =
        `translate(-50%, -50%) translate(${dx * 0.35}px, ${dy * 0.2 - 10}px) rotate(${dx * 0.03}deg) scale(1.03)`;
      card.style.boxShadow = '0 40px 90px rgba(0,0,0,.5)';
    });
    card.addEventListener('pointerup', (e) => {
      if (!dragState || dragState.card !== card) return;
      const dx = e.clientX - dragState.startX;
      card.classList.remove('is-dragging');
      card.style.boxShadow = '';
      if (dragState.moved) {
        if (dx < -70) go(1);
        else if (dx > 70) go(-1);
        else relayout();
      }
      dragState = null;
    });

    // 双击访问
    card.addEventListener('dblclick', () => window.open(link.url, '_blank', 'noopener'));

    card.querySelector('.act-flip').addEventListener('click', () => card.classList.toggle('flipped'));
    card.querySelector('.act-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link.url); toast('链接已复制 ⧉'); }
      catch (_) { toast('复制失败'); }
    });
    card.querySelector('.act-del').addEventListener('click', () => removeLink(link.id));
    card.querySelector('.act-visit').addEventListener('click', () => window.open(link.url, '_blank', 'noopener'));
  }

  // === 增删 ===
  function addLink(data) {
    links.push({ id: uid(), ...data });
    saveLinks();
    applyFilter(data.tag === activeTag ? null : null);
    activeIndex = visibleLinks.findIndex((l) => l.id && l.title === data.title);
    if (activeIndex < 0) activeIndex = visibleLinks.length - 1;
    layoutCards(true);
    toast(`已收入 · ${data.title}`);
  }

  function removeLink(id) {
    const idx = links.findIndex((l) => l.id === id);
    if (idx > -1) {
      const [removed] = links.splice(idx, 1);
      saveLinks();
      applyFilter();
      activeIndex = Math.min(activeIndex, Math.max(visibleLinks.length - 1, 0));
      layoutCards(true);
      toast(`已移除 · ${removed.title}`);
    }
  }

  // === 过滤 ===
  function applyFilter(keepActive) {
    const q = searchQuery.trim().toLowerCase();
    visibleLinks = links.filter((l) => {
      const tagOk = !activeTag || l.tag === activeTag;
      const qOk = !q || l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q) || (l.note || '').toLowerCase().includes(q);
      return tagOk && qOk;
    });
    if (!keepActive) activeIndex = Math.min(activeIndex, Math.max(visibleLinks.length - 1, 0));
  }

  // === 标签云 & 统计 ===
  function renderTags() {
    const counts = {};
    links.forEach((l) => { const t = l.tag || 'untagged'; counts[t] = (counts[t] || 0) + 1; });
    const tags = Object.keys(counts).sort();
    tagCloud.innerHTML = tags.length
      ? tags.map((t) =>
          `<button class="tag-chip ${t === activeTag ? 'active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)} <span style="opacity:.5">${counts[t]}</span></button>`
        ).join('')
      : '<span style="color:var(--ink-dim);font-size:12px;">暂无标签</span>';
    tagCloud.querySelectorAll('.tag-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeTag = activeTag === chip.dataset.tag ? null : chip.dataset.tag;
        applyFilter(true);
        activeIndex = 0;
        layoutCards(true);
      });
    });
    tagList.innerHTML = tags.map((t) => `<option value="${escapeHtml(t)}">`).join('');
  }

  function renderStats() {
    statsRow.innerHTML = `
      <span>CARDS <b>${links.length}</b></span>
      <span>SHOWN <b>${visibleLinks.length}</b></span>
      <span>TAGS <b>${new Set(links.map((l) => l.tag || 'untagged')).size}</b></span>`;
  }

  // === 表单 ===
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#fldTitle').value.trim();
    let url = $('#fldUrl').value.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch (_) { toast('URL 格式有误'); return; }
    if (!title) return;
    addLink({
      title,
      url,
      tag: $('#fldTag').value.trim().toLowerCase() || 'untagged',
      note: $('#fldNote').value.trim()
    });
    form.reset();
    $('#fldTitle').focus();
  });

  // === 搜索 ===
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = searchInput.value;
      applyFilter(true);
      activeIndex = 0;
      layoutCards(false);
    }, 160);
  });

  // === 主题 ===
  const swatches = document.querySelectorAll('.swatch');
  function setTheme(name) {
    document.body.dataset.theme = name;
    swatches.forEach((s) => s.classList.toggle('active', s.dataset.theme === name));
    try { localStorage.setItem(THEME_KEY, name); } catch (_) {}
  }
  swatches.forEach((s) => s.addEventListener('click', () => setTheme(s.dataset.theme)));

  // === 键盘 ===
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input')) {
      if (e.key === 'Escape') { e.target.blur(); searchInput.value = ''; searchQuery = ''; applyFilter(true); activeIndex = 0; layoutCards(false); }
      return;
    }
    switch (e.key) {
      case 'ArrowRight': go(1); break;
      case 'ArrowLeft': go(-1); break;
      case 'f': case 'F': { const c = document.querySelector('.r-card[style*="pointer-events: auto"]') || document.querySelector(`.r-card[data-index="${activeIndex}"]`); if (c) c.classList.toggle('flipped'); break; }
      case 's': case 'S': shuffle(); break;
      case '/': e.preventDefault(); searchInput.focus(); break;
    }
  });

  // === 洗牌（Fisher-Yates，带入场动画） ===
  function shuffle() {
    const a = [...links];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    links = a;
    saveLinks();
    applyFilter(true);
    activeIndex = 0;
    layoutCards(true);
    toast(' Rolodex 已洗牌 ⤨');
  }

  // === Init ===
  function init() {
    links.forEach((l) => { if (!l.id) l.id = uid(); });
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) setTheme(saved);
      else swatches[0].classList.add('active');
    } catch (_) { swatches[0].classList.add('active'); }

    $('#prevBtn').addEventListener('click', () => go(-1));
    $('#nextBtn').addEventListener('click', () => go(1));
    $('#shuffleBtn').addEventListener('click', shuffle);

    applyFilter();
    activeIndex = 0;
    layoutCards(true);
  }

  init();
})();
