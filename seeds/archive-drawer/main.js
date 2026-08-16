/* ============================================================
   Archive Drawer · 记忆档案抽屉
   Vanilla JS · 零依赖
   ============================================================ */
(function archiveDrawerApp(globalScope) {
  'use strict';

  // === DOM Elements ===
  const cabinetEl = document.getElementById('cabinet');
  const statChipEl = document.getElementById('stat-chip');
  const statusTextEl = document.getElementById('status-text');
  const searchInputEl = document.getElementById('search-input');
  const shuffleBtnEl = document.getElementById('shuffle-btn');
  const themeBtnEl = document.getElementById('theme-btn');
  const themeLabelEl = document.getElementById('theme-label');
  const clockEl = document.getElementById('clock');
  const dustFieldEl = document.getElementById('dust-field');
  const overlayEl = document.getElementById('overlay');
  const modalCloseEl = document.getElementById('modal-close');

  // === Archive Data ===
  const ARCHIVE_DRAWERS = [
    {
      label: '2026 · 近期归档',
      code: 'SEASON.04 · ACTIVE',
      entries: [
        { id: 'ARC-101', title: '流体加载实验', date: '2026.04.12', hue: 258, tags: ['Canvas', 'Sim'], excerpt: '简化流体场中的粒子在加载进度里逐渐苏醒，鼠标扰动如同投入水面的石子，涟漪会记住每一次触碰。' },
        { id: 'ARC-102', title: '回声打字机', date: '2026.03.28', hue: 190, tags: ['Sound', 'Input'], excerpt: '每个字符落下时产生视觉回声与延迟音效，写作因此变成一场小型的、私人的演出。' },
        { id: 'ARC-103', title: 'ASCII 信号摄像机', date: '2026.03.02', hue: 122, tags: ['Signal', 'ASCII'], excerpt: '等离子、隧道与干涉波场被实时转译为字符矩阵，快门按下即得到一张 .txt 信号底片。' },
        { id: 'ARC-104', title: '安全消费雷达', date: '2026.02.14', hue: 350, tags: ['Finance', 'SVG'], excerpt: '六维预算健康度实时扫描，溢出预警以旋转扫描动画呈现，像一台为钱包设计的声呐。' },
        { id: 'ARC-105', title: '调频花园', date: '2026.01.19', hue: 285, tags: ['Wellness', 'AI'], excerpt: '先点选情绪，再写下一句话，花园便会同步呼吸节律、场景光影与环境音，进行一次温柔调频。' },
        { id: 'ARC-106', title: '字符雨屏保', date: '2026.01.03', hue: 150, tags: ['Matrix', 'Code'], excerpt: '落下的不是假名，而是真实的代码片段；语言可自定义，雨声由解析器决定。' }
      ]
    },
    {
      label: '2025 · 深水区',
      code: 'SEASON.03 · ARCHIVED',
      entries: [
        { id: 'ARC-087', title: '磁力光标', date: '2025.11.11', hue: 210, tags: ['Physics', 'Cursor'], excerpt: '光标周围的一切被磁力吸引或排斥，UI 第一次表现出对使用者的好奇心。' },
        { id: 'ARC-084', title: '故障着色器', date: '2025.09.30', hue: 300, tags: ['WebGL', 'Glitch'], excerpt: '把色彩通道撕开再错位拼接，每一帧损坏都是一次不可复制的即兴创作。' },
        { id: 'ARC-081', title: '雾中世界', date: '2025.08.08', hue: 205, tags: ['Atmosphere', '3D'], excerpt: '体积雾吞没了地平线，行走其中的唯一导航是远处若隐若现的光源。' },
        { id: 'ARC-079', title: '抖动实验室', date: '2025.06.21', hue: 38, tags: ['Retro', 'Dither'], excerpt: '拜耳矩阵与误差扩散的对照实验，八种抖动算法把渐变世界压回 1bit。' },
        { id: 'ARC-075', title: '象形字段', date: '2025.04.02', hue: 95, tags: ['Type', 'Field'], excerpt: '数千个字符组成势场，鼠标划过时字形如铁屑般排列重组，短暂拼出语义。' }
      ]
    },
    {
      label: '2024 · 溯源层',
      code: 'SEASON.02 · ARCHIVED',
      entries: [
        { id: 'ARC-052', title: 'Aura 灵韵', date: '2024.12.24', hue: 270, tags: ['Breath', 'Glass'], excerpt: '流体网格渐变与微晶玻璃态构成的呼吸冥想空间，是这个花园最早的美学宣言。' },
        { id: 'ARC-048', title: '赛博光影画板', date: '2024.10.15', hue: 320, tags: ['CSS3', 'Paint'], excerpt: '纯 CSS 变量驱动的赛博朋克画板，光影全部来自 border 与 gradient 的错觉。' },
        { id: 'ARC-045', title: '封面实验室', date: '2024.08.30', hue: 355, tags: ['Editor', 'Export'], excerpt: '策略驱动的封面生成器，多模板与主题系统让排版决策快得像呼吸。' },
        { id: 'ARC-041', title: 'OpenClaw 原型', date: '2024.07.07', hue: 12, tags: ['React', 'LLM'], excerpt: '多角色 AI 对话客户端的第一次心跳，Prompt 注入测试从这里开始。' },
        { id: 'ARC-038', title: '4-7-8 呼吸法', date: '2024.05.20', hue: 175, tags: ['Wellness', 'Timer'], excerpt: '吸气四秒、屏息七秒、呼气八秒——最古老算法的一次现代封装。' }
      ]
    },
    {
      label: 'SIGNAL · 未归类信号',
      code: 'UNSORTED · 3 ITEMS',
      entries: [
        { id: 'SIG-12', title: '未命名的律动', date: '????.??.??', hue: 230, tags: ['Easing', 'Draft'], excerpt: '一段没有归宿的缓动曲线，超调量经过七次手调，仍在等待被未来的界面收养。' },
        { id: 'SIG-09', title: '深夜色板', date: '????.??.??', hue: 262, tags: ['Color', 'Night'], excerpt: '凌晨三点调出的三组色相，饱和度低到只在暗处成立，见光即蒸发。' },
        { id: 'SIG-04', title: '光标尘埃', date: '????.??.??', hue: 188, tags: ['Particle', 'Trail'], excerpt: '被废弃的粒子轨迹，仍然在某个未合并的分支里安静漂浮。' }
      ]
    },
    {
      label: 'SKETCH · 灵感草稿',
      code: 'SKETCHBOOK · FRAGILE',
      entries: [
        { id: 'DRF-21', title: '折纸时间线', date: '2026.05.30', hue: 46, tags: ['Timeline', 'Fold'], excerpt: '把年份折成纸鹤的形状，展开时事件沿折痕弹出，脆但好看。' },
        { id: 'DRF-17', title: '声音指纹', date: '2026.05.11', hue: 140, tags: ['Audio', 'Identity'], excerpt: '用一段哼唱生成专属的环形指纹，同一首歌不会开出相同的花。' },
        { id: 'DRF-03', title: '液态玻璃按钮', date: '2026.04.25', hue: 218, tags: ['Material', 'UI'], excerpt: '折射率会跟随按压深度变化的按钮材质，松手时像水滴一样回弹。' }
      ]
    }
  ];

  // === State ===
  const state = {
    openDrawerId: null,
    activeQuery: '',
    themeIndex: 0,
    lastFocusedElement: null
  };

  const THEMES = [
    { id: 'nebula', label: 'NEBULA' },
    { id: 'ember', label: 'EMBER' },
    { id: 'mint', label: 'MINT' }
  ];

  const EASE_TEXT = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const STATUS_IDLE = '记忆在此归档 · 拉开抽屉取回光';

  // === Utilities ===
  function createEl(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent != null) el.textContent = textContent;
    return el;
  }

  function padTwo(value) {
    return String(value).padStart(2, '0');
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // === Dust Field (环境浮尘) ===
  function initDustField() {
    const COUNT = 26;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i += 1) {
      const particle = createEl('div', 'dust-particle');
      const size = 1 + Math.random() * 2.6;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.setProperty('--dust-drift', `${(Math.random() - 0.5) * 14}vw`);
      particle.style.setProperty('--dust-opacity', `${0.16 + Math.random() * 0.4}`);
      particle.style.animationDuration = `${16 + Math.random() * 22}s`;
      particle.style.animationDelay = `${-Math.random() * 30}s`;
      fragment.appendChild(particle);
    }
    dustFieldEl.appendChild(fragment);
  }

  // === Cabinet Rendering ===
  function renderCabinet() {
    const fragment = document.createDocumentFragment();
    ARCHIVE_DRAWERS.forEach((drawer, drawerIndex) => {
      const drawerEl = createEl('div', 'drawer');
      drawerEl.dataset.drawerId = String(drawerIndex);
      drawerEl.dataset.searchIndex = buildSearchIndex(drawer).toLowerCase();

      const frontEl = createEl('button', 'drawer-front');
      frontEl.type = 'button';
      frontEl.setAttribute('aria-expanded', 'false');
      frontEl.setAttribute('aria-controls', `tray-${drawerIndex}`);
      frontEl.dataset.action = 'toggle';

      frontEl.appendChild(createEl('span', 'drawer-index', padTwo(drawerIndex + 1)));

      const labelEl = createEl('div', 'drawer-label');
      labelEl.appendChild(createEl('div', 'drawer-title', drawer.label));
      labelEl.appendChild(createEl('div', 'drawer-meta', `${drawer.code} · ${drawer.entries.length} ITEMS`));
      frontEl.appendChild(labelEl);

      frontEl.appendChild(createEl('span', 'drawer-handle'));
      frontEl.insertAdjacentHTML('beforeend',
        '<svg class="drawer-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>');
      drawerEl.appendChild(frontEl);

      const trayEl = createEl('div', 'drawer-tray');
      trayEl.id = `tray-${drawerIndex}`;
      const trayInnerEl = createEl('div', 'drawer-tray-inner');
      const railEl = createEl('div', 'card-rail');

      drawer.entries.forEach((entry, entryIndex) => {
        railEl.appendChild(buildArchiveCard(entry, drawerIndex, entryIndex));
      });

      trayInnerEl.appendChild(railEl);
      trayInnerEl.appendChild(createEl('div', 'tray-empty', '// NO MATCHING RECORDS'));
      trayEl.appendChild(trayInnerEl);
      drawerEl.appendChild(trayEl);

      fragment.appendChild(drawerEl);
    });
    cabinetEl.appendChild(fragment);

    const total = ARCHIVE_DRAWERS.reduce((sum, drawer) => sum + drawer.entries.length, 0);
    statChipEl.textContent = `ARCHIVED · ${padTwo(total)}`;
  }

  function buildArchiveCard(entry, drawerIndex, entryIndex) {
    const cardEl = createEl('article', 'archive-card');
    cardEl.tabIndex = 0;
    cardEl.dataset.drawerIndex = String(drawerIndex);
    cardEl.dataset.entryIndex = String(entryIndex);
    cardEl.style.setProperty('--i', String(entryIndex));
    cardEl.style.setProperty('--hue', String(entry.hue));

    const topEl = createEl('div', 'card-top');
    topEl.appendChild(createEl('span', 'card-id', entry.id));
    topEl.appendChild(createEl('span', 'card-date', entry.date));
    cardEl.appendChild(topEl);

    cardEl.appendChild(createEl('h3', 'card-title', entry.title));
    cardEl.appendChild(createEl('p', 'card-excerpt', entry.excerpt));

    const tagsEl = createEl('div', 'card-tags');
    entry.tags.forEach((tag) => {
      tagsEl.appendChild(createEl('span', 'card-tag', tag.toUpperCase()));
    });
    cardEl.appendChild(tagsEl);
    cardEl.appendChild(createEl('span', 'card-hue'));
    return cardEl;
  }

  function buildSearchIndex(drawer) {
    return [
      drawer.label,
      drawer.code,
      ...drawer.entries.flatMap((entry) => [entry.id, entry.title, entry.date, entry.tags.join(' '), entry.excerpt])
    ].join(' ');
  }

  // === Drawer Accordion ===
  function toggleDrawer(drawerEl, forceOpen) {
    if (!drawerEl) return;
    const shouldOpen = forceOpen != null ? forceOpen : !drawerEl.classList.contains('open');
    const fronts = cabinetEl.querySelectorAll('.drawer-front');

    fronts.forEach((front) => front.setAttribute('aria-expanded', 'false'));
    cabinetEl.querySelectorAll('.drawer.open').forEach((openEl) => {
      openEl.classList.remove('open');
      retireCards(openEl);
    });

    if (shouldOpen) {
      drawerEl.classList.add('open');
      drawerEl.querySelector('.drawer-front').setAttribute('aria-expanded', 'true');
      emitPulse(drawerEl);
      deployCards(drawerEl);
      state.openDrawerId = drawerEl.dataset.drawerId;
      const drawerData = ARCHIVE_DRAWERS[Number(drawerEl.dataset.drawerId)];
      statusTextEl.textContent = `已取回 · ${drawerData.label} / ${drawerData.entries.length} 件`;
    } else {
      state.openDrawerId = null;
      statusTextEl.textContent = STATUS_IDLE;
    }
  }

  // 开合时的冲击波
  function emitPulse(drawerEl) {
    const pulse = createEl('span', 'drawer-pulse');
    drawerEl.appendChild(pulse);
    pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
  }

  // === Card Stagger Entrance ===
  function deployCards(drawerEl) {
    const cards = drawerEl.querySelectorAll('.archive-card');
    cards.forEach((card, index) => {
      card.style.transitionDelay = `${index * 55}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));
    });
  }

  function retireCards(drawerEl) {
    drawerEl.querySelectorAll('.archive-card').forEach((card) => {
      card.classList.remove('in', 'tilt');
      card.style.transitionDelay = '0ms';
    });
  }

  // === Pointer Sheen (指针光泽追踪) ===
  function initPointerSheen() {
    document.addEventListener('pointermove', (event) => {
      const target = event.target.closest('.sheen');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      target.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }, { passive: true });
  }

  // === Card Tilt (3D 倾斜跟随) ===
  function initCardTilt() {
    cabinetEl.addEventListener('pointermove', (event) => {
      const card = event.target.closest('.archive-card');
      if (!card || !card.classList.contains('in')) return;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--ry', `${px * 9}deg`);
      card.style.setProperty('--rx', `${py * -9}deg`);
      card.classList.add('tilt');
    }, { passive: true });

    cabinetEl.addEventListener('pointerout', (event) => {
      const card = event.target.closest('.archive-card');
      if (!card) return;
      if (event.relatedTarget && card.contains(event.relatedTarget)) return;
      card.classList.remove('tilt');
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    }, { passive: true });
  }

  // === Magnetic Handle (磁吸拉手) ===
  function initMagneticHandles() {
    cabinetEl.addEventListener('pointermove', (event) => {
      const front = event.target.closest('.drawer-front');
      if (!front) return;
      const handle = front.querySelector('.drawer-handle');
      const rect = front.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width - 0.5, -0.5), 0.5);
      const peek = front.closest('.drawer').classList.contains('open') ? 3 : 7;
      handle.style.setProperty('--pull', `${ratio * peek * 2}px`);
    }, { passive: true });

    cabinetEl.addEventListener('pointerout', (event) => {
      const front = event.target.closest('.drawer-front');
      if (!front) return;
      if (event.relatedTarget && front.contains(event.relatedTarget)) return;
      const handle = front.querySelector('.drawer-handle');
      if (handle) handle.style.setProperty('--pull', '0px');
    }, { passive: true });
  }

  // === Search Filter (检索过滤) ===
  function applySearchFilter() {
    const query = state.activeQuery.trim().toLowerCase();
    const drawers = cabinetEl.querySelectorAll('.drawer');

    drawers.forEach((drawerEl) => {
      const matches = !query || drawerEl.dataset.searchIndex.includes(query);
      drawerEl.classList.toggle('muted', !matches);

      const rail = drawerEl.querySelector('.card-rail');
      let visibleCount = 0;
      rail.querySelectorAll('.archive-card').forEach((card) => {
        const drawerData = ARCHIVE_DRAWERS[Number(card.dataset.drawerIndex)];
        const entry = drawerData.entries[Number(card.dataset.entryIndex)];
        const haystack = `${entry.id} ${entry.title} ${entry.date} ${entry.tags.join(' ')} ${entry.excerpt}`.toLowerCase();
        const visible = !query || haystack.includes(query);
        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount += 1;
      });

      const emptyNote = drawerEl.querySelector('.tray-empty');
      if (emptyNote) emptyNote.style.display = visibleCount === 0 ? '' : 'none';
    });

    statusTextEl.textContent = query
      ? `检索中 · "${state.activeQuery.trim()}"`
      : STATUS_IDLE;
  }

  searchInputEl.addEventListener('input', () => {
    state.activeQuery = searchInputEl.value;
    applySearchFilter();
  });

  searchInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      searchInputEl.value = '';
      state.activeQuery = '';
      applySearchFilter();
      searchInputEl.blur();
    }
  });

  // === Detail Modal ===
  function openModal(card) {
    const drawerData = ARCHIVE_DRAWERS[Number(card.dataset.drawerIndex)];
    const entry = drawerData.entries[Number(card.dataset.entryIndex)];

    state.lastFocusedElement = document.activeElement;

    document.getElementById('modal-watermark').textContent = String(entry.id).replace(/\D/g, '');
    document.getElementById('modal-id').textContent = entry.id;
    document.getElementById('modal-date').textContent = entry.date;
    document.getElementById('modal-title').textContent = entry.title;
    document.getElementById('modal-excerpt').textContent = entry.excerpt;
    document.getElementById('modal-source').textContent = `DRAWER · ${drawerData.label.toUpperCase()}`;
    document.querySelector('.modal').style.setProperty('--hue', String(entry.hue));

    const tagsEl = document.getElementById('modal-tags');
    tagsEl.innerHTML = '';
    entry.tags.forEach((tag) => {
      tagsEl.appendChild(createEl('span', 'card-tag', tag.toUpperCase()));
    });

    overlayEl.classList.add('show');
    document.body.style.overflow = 'hidden';
    modalCloseEl.focus();
  }

  function closeModal() {
    overlayEl.classList.remove('show');
    document.body.style.overflow = '';
    if (state.lastFocusedElement && document.contains(state.lastFocusedElement)) {
      state.lastFocusedElement.focus();
    }
    state.lastFocusedElement = null;
  }

  modalCloseEl.addEventListener('click', closeModal);
  overlayEl.addEventListener('pointerdown', (event) => {
    if (event.target === overlayEl) closeModal();
  });

  // === Theme System ===
  function applyTheme(index) {
    const theme = THEMES[index % THEMES.length];
    state.themeIndex = index % THEMES.length;
    document.body.dataset.theme = theme.id;
    themeLabelEl.textContent = theme.label;
  }

  themeBtnEl.addEventListener('click', () => {
    applyTheme(state.themeIndex + 1);
    themeBtnEl.classList.remove('spinning');
    requestAnimationFrame(() => requestAnimationFrame(() => themeBtnEl.classList.add('spinning')));
  });

  // === Shuffle Retrieval (随机调档) ===
  shuffleBtnEl.addEventListener('click', () => {
    const drawerIndex = Math.floor(Math.random() * ARCHIVE_DRAWERS.length);
    const drawerData = ARCHIVE_DRAWERS[drawerIndex];
    const entryIndex = Math.floor(Math.random() * drawerData.entries.length);

    const drawerEl = cabinetEl.querySelector(`[data-drawer-id="${drawerIndex}"]`);
    toggleDrawer(drawerEl, true);
    drawerEl.querySelector('.drawer-front').scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.setTimeout(() => {
      const card = drawerEl.querySelector(`[data-entry-index="${entryIndex}"]`);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      card.classList.remove('flash');
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('flash')));
      card.addEventListener('animationend', () => card.classList.remove('flash'), { once: true });
    }, 420);
  });

  // === Cabinet Event Delegation ===
  cabinetEl.addEventListener('click', (event) => {
    const front = event.target.closest('[data-action="toggle"]');
    if (front) {
      toggleDrawer(front.closest('.drawer'));
      return;
    }
    const card = event.target.closest('.archive-card');
    if (card && card.classList.contains('in')) {
      openModal(card);
    }
  });

  cabinetEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.archive-card');
    if (card && card.classList.contains('in')) {
      event.preventDefault();
      openModal(card);
    }
  });

  // === Keyboard Navigation ===
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (overlayEl.classList.contains('show')) {
        closeModal();
        return;
      }
      if (state.openDrawerId != null) {
        const drawerEl = cabinetEl.querySelector(`[data-drawer-id="${state.openDrawerId}"]`);
        toggleDrawer(drawerEl, false);
        if (drawerEl) drawerEl.querySelector('.drawer-front').focus();
      }
      return;
    }

    if (overlayEl.classList.contains('show')) return;
    if (event.target === searchInputEl) return;

    const fronts = Array.from(cabinetEl.querySelectorAll('.drawer-front'));
    const currentIndex = fronts.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + delta + fronts.length) % fronts.length;
      fronts[nextIndex].focus();
    }
  });

  // === Live Clock ===
  function tickClock() {
    const now = new Date();
    clockEl.textContent = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}:${padTwo(now.getSeconds())}`;
  }

  // === Smooth Entrance on Load ===
  function entranceSequence() {
    const fronts = cabinetEl.querySelectorAll('.drawer-front');
    fronts.forEach((front, index) => {
      front.style.opacity = '0';
      front.style.transform = 'translateY(26px)';
      front.style.transition = `opacity 0.9s ${EASE_TEXT} ${index * 90}ms, transform 0.9s ${EASE_TEXT} ${index * 90}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        front.style.opacity = '1';
        front.style.transform = 'translateY(0)';
      }));
      window.setTimeout(() => {
        front.style.removeProperty('opacity');
        front.style.removeProperty('transform');
        front.style.removeProperty('transition');
      }, 1400 + index * 90);
    });
  }

  // === Init ===
  function init() {
    renderCabinet();
    initDustField();
    initPointerSheen();
    initCardTilt();
    initMagneticHandles();
    applyTheme(0);
    entranceSequence();
    tickClock();
    window.setInterval(tickClock, 1000);
  }

  init();
})(typeof window !== 'undefined' ? window : globalThis);
