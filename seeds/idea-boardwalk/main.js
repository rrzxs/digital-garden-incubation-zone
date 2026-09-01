/* ============================================================
 * IDEA BOARDWALK · 创意栈道
 * 漫游物理 + 灯卡动力学 + 涟漪冲击波 + 光标光晕
 * Zero-Build Vanilla JS · Maintainer: EDEN
 * ============================================================ */

(function () {
  'use strict';

  // === 配置 ===
  const STORAGE_KEY = 'idea-boardwalk:ideas:v1';
  const THEME_KEY = 'idea-boardwalk:theme:v1';
  const CARD_W = 240;
  const CARD_GAP = 150;
  const EDGE_PAD = 260;

  const DEFAULT_IDEAS = [
    { title: '把黄昏装进玻璃罐，做成一盏可以拧亮的灯', tag: 'LIGHT' },
    { title: '给地铁站写一首只在到站瞬间完成的俳句', tag: 'POEM' },
    { title: '一个只会说"没关系"的安慰机器人', tag: 'SOFT' },
    { title: '把待办清单种进土里，浇水才会发芽', tag: 'GROW' },
    { title: '用脚步丈量城市，把路线织成围巾', tag: 'WALK' },
    { title: '让旧照片里的光影在墙上重新流动一次', tag: 'ECHO' }
  ];

  const SCRAMBLE_CHARS = '◈✦≋∮∅⟐◇⌁/****************************************';

  // === DOM Elements ===
  const stage = document.getElementById('stage');
  const track = document.getElementById('track');
  const layerSea = document.getElementById('layer-sea');
  const layerPlanks = document.getElementById('layer-planks');
  const layerReeds = document.getElementById('layer-reeds');
  const rippleLayer = document.getElementById('ripple-layer');
  const emptyHint = document.getElementById('empty-hint');
  const composer = document.getElementById('composer');
  const ideaInput = document.getElementById('idea-input');
  const hudCount = document.getElementById('hud-count');
  const hudDist = document.getElementById('hud-dist');
  const paletteSwitch = document.getElementById('palette-switch');
  const cursorHalo = document.getElementById('cursor-halo');
  const brandTitle = document.getElementById('brand-title');

  // === 状态 ===
  const state = {
    ideas: [],
    scroll: 0,          // 当前漫游位置
    target: 0,          // 目标位置（弹簧牵引）
    velocity: 0,        // 动量
    dragging: false,
    dragStartX: 0,
    dragStartScroll: 0,
    maxScroll: 0,
    pointer: { x: innerWidth / 2, y: innerHeight / 2 },
    halo: { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0 }
  };

  const cards = []; // { el, worldX, laneY, phase, bobAmp, shockY, shockV, tiltX, tiltY }

  // === 工具函数 ===
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const rand = (min, max) => min + Math.random() * (max - min);

  /** 弹簧步进：返回新位置与速度 */
  function springStep(pos, vel, target, stiffness, damping, dt) {
    const force = (target - pos) * stiffness;
    const nextVel = (vel + force * dt) * damping;
    return [pos + nextVel * dt, nextVel];
  }

  /** 简易值噪声（正弦叠加，用于浮动律动） */
  function wobble(t, seed) {
    return Math.sin(t * 0.9 + seed * 12.9) * 0.6
         + Math.sin(t * 0.43 + seed * 7.7) * 0.4;
  }

  // === 持久化 ===
  function loadIdeas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* 忽略损坏数据 */ }
    return DEFAULT_IDEAS.map((idea) => ({ ...idea, at: Date.now() }));
  }

  function saveIdeas() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ideas)); } catch (e) {}
  }

  // === 乱码揭示 ===
  function scrambleReveal(el, text, speed = 34) {
    const final = text;
    let frame = 0;
    const settleAt = new Array(final.length).fill(0).map((_, i) => 10 + i * 2.2);
    const tick = () => {
      let out = '';
      let done = true;
      for (let i = 0; i < final.length; i++) {
        if (final[i] === ' ') { out += ' '; continue; }
        if (frame >= settleAt[i]) {
          out += `<span class="scramble-char">${final[i]}</span>`;
        } else {
          done = false;
          out += `<span class="scramble-char">${SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]}</span>`;
        }
      }
      el.innerHTML = out;
      frame++;
      if (!done) setTimeout(tick, speed);
    };
    tick();
  }

  // === 布局 ===
  function layout() {
    const vw = innerWidth;
    state.maxScroll = Math.max(0, cards.length * (CARD_W + CARD_GAP) + EDGE_PAD * 2 - vw);

    const vwCenter = vw / 2;
    cards.forEach((card, i) => {
      card.worldX = EDGE_PAD + i * (CARD_W + CARD_GAP) + CARD_W / 2;
      card.laneY = (i % 2 === 0 ? -1 : 1) * rand(70, 130);
    });

    // 灯杆
    track.querySelectorAll('.pole').forEach((p) => p.remove());
    cards.forEach((card, i) => {
      const pole = document.createElement('div');
      pole.className = 'pole';
      pole.style.left = (card.worldX - 1) + 'px';
      pole.style.top = `calc(50% + ${card.laneY + (i % 2 === 0 ? 150 : -150)}px)`;
      pole.style.animationDelay = (i * 0.4) + 's';
      track.appendChild(pole);
    });

    // 月亮位置固定在海面
    const moon = layerSea.querySelector('.moon');
    if (moon) {
      moon.style.left = (vw * 0.72) + 'px';
      moon.style.top = '-70px';
    }

    state.target = clamp(state.target, 0, state.maxScroll);
    state.scroll = clamp(state.scroll, 0, state.maxScroll);
    refreshEmpty();
    refreshHud();
  }

  function refreshEmpty() {
    emptyHint.hidden = cards.length > 0;
  }

  function refreshHud() {
    hudCount.textContent = cards.length + (cards.length === 1 ? ' IDEA' : ' IDEAS');
    hudDist.textContent = Math.round(state.scroll / 12) + ' m';
  }

  // === 灯卡渲染 ===
  function createCardEl(idea, index, isNew) {
    const el = document.createElement('article');
    el.className = 'lantern' + (isNew ? ' is-new' : '');
    el.style.left = '0px';
    el.innerHTML = `
      <div class="lantern-top">
        <span class="lantern-idx">#${String(index + 1).padStart(2, '0')}</span>
        <button class="lantern-del" title="熄灭这盏灯" aria-label="删除">×</button>
      </div>
      <h3 class="lantern-title"></h3>
      <div class="lantern-meta">
        <span class="lantern-tag">${escapeHtml(idea.tag || 'SPARK')}</span>
      </div>
    `;
    // 文本安全写入 + 乱码揭示
    const titleEl = el.querySelector('.lantern-title');
    if (isNew) {
      scrambleReveal(titleEl, idea.title, 26);
    } else {
      titleEl.textContent = idea.title;
    }

    // 悬停 3D 倾斜
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const card = cards.find((c) => c.el === el);
      if (card) { card.tiltX = py * -10; card.tiltY = px * 12; }
    });
    el.addEventListener('pointerleave', () => {
      const card = cards.find((c) => c.el === el);
      if (card) { card.tiltX = 0; card.tiltY = 0; }
    });

    // 点击卡片：轻推一下
    el.addEventListener('click', (e) => {
      if (e.target.closest('.lantern-del')) return;
      const card = cards.find((c) => c.el === el);
      if (card) { card.shockV -= 320; }
    });

    // 删除
    el.querySelector('.lantern-del').addEventListener('click', (e) => {
      e.stopPropagation();
      removeIdea(el);
    });

    return el;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function addIdea(idea, isNew) {
    const index = state.ideas.length;
    state.ideas.push(idea);
    const el = createCardEl(idea, index, isNew);
    track.appendChild(el);
    cards.push({
      el,
      worldX: 0, laneY: 0,
      phase: rand(0, Math.PI * 2),
      bobAmp: rand(7, 16),
      shockY: 0, shockV: 0,
      tiltX: 0, tiltY: 0
    });
    saveIdeas();
    layout();
    return el;
  }

  function removeIdea(el) {
    const idx = cards.findIndex((c) => c.el === el);
    if (idx < 0) return;
    el.classList.add('dying');
    setTimeout(() => {
      el.remove();
      cards.splice(idx, 1);
      state.ideas.splice(idx, 1);
      // 重新编号
      cards.forEach((c, i) => {
        c.el.querySelector('.lantern-idx').textContent = '#' + String(i + 1).padStart(2, '0');
      });
      saveIdeas();
      layout();
    }, 560);
  }

  // === 漫游引擎（拖拽 + 惯性 + 弹簧归位） ===
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.lantern') || e.target.closest('.dock')) return;
    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragStartScroll = state.scroll;
    state.velocity = 0;
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    if (!state.dragging) return;
    const dx = e.clientX - state.dragStartX;
    state.target = clamp(state.dragStartScroll - dx * 1.6, 0, state.maxScroll);
    state.velocity = state.velocity * 0.7 + (-(e.movementX || 0)) * 1.2;
  });

  const endDrag = () => {
    if (!state.dragging) return;
    state.dragging = false;
    stage.classList.remove('dragging');
    state.target = clamp(state.scroll + state.velocity * 14, 0, state.maxScroll);
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    state.target = clamp(state.target + delta * 1.4, 0, state.maxScroll);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target === ideaInput) return;
    if (e.key === 'ArrowRight') state.target = clamp(state.target + 340, 0, state.maxScroll);
    if (e.key === 'ArrowLeft')  state.target = clamp(state.target - 340, 0, state.maxScroll);
  });

  // === 涟漪冲击波 ===
  stage.addEventListener('click', (e) => {
    if (e.target.closest('.lantern')) return;
    spawnRipple(e.clientX, e.clientY);
    // 冲击波推动附近灯卡
    cards.forEach((card) => {
      const screenX = card.worldX - state.scroll;
      const d = Math.hypot(screenX - e.clientX, (innerHeight / 2 + card.laneY) - e.clientY);
      const power = 520 * Math.exp(-(d * d) / (2 * 260 * 260));
      const dir = screenX > e.clientX ? 1 : -1;
      card.shockV += dir * power;
    });
  });

  function spawnRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    rippleLayer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 950);
  }

  // === 输入坞 ===
  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = ideaInput.value.trim();
    if (!title) {
      // 空输入：轻震输入坞提示
      composer.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-7px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' }
        ],
        { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      ideaInput.focus();
      return;
    }
    const tags = ['SPARK', 'LIGHT', 'NEW', 'MUSE', 'ECHO'];
    const el = addIdea({ title, tag: tags[(Math.random() * tags.length) | 0], at: Date.now() }, true);
    ideaInput.value = '';
    // 弹簧滑向新灯卡 + 点亮涟漪
    requestAnimationFrame(() => {
      const card = cards[cards.length - 1];
      state.target = clamp(card.worldX - innerWidth / 2, 0, state.maxScroll);
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        spawnRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }, 420);
    });
  });

  // === 氛围配色 ===
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && ['dusk', 'aurora', 'dawn', 'midnight'].includes(saved)) {
      document.body.dataset.theme = saved;
    }
    paletteSwitch.querySelectorAll('.palette-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === document.body.dataset.theme);
      btn.addEventListener('click', () => {
        document.body.dataset.theme = btn.dataset.theme;
        localStorage.setItem(THEME_KEY, btn.dataset.theme);
        paletteSwitch.querySelectorAll('.palette-btn').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
      });
    });
  }

  // === 主循环 ===
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastT) / 1000, 0.033);
    lastT = now;
    const t = now / 1000;

    // 漫游弹簧
    const [nextScroll, nextVel] = springStep(state.scroll, state.velocity, state.target, 46, 0.86, dt);
    state.scroll = nextScroll;
    state.velocity = nextVel;
    const prevScroll = state.scroll;

    // 轨道与视差层
    track.style.transform = `translate3d(${-state.scroll}px, 0, 0)`;
    layerSea.style.transform = `translate3d(${-state.scroll * 0.25}px, 0, 0)`;
    layerPlanks.style.transform = `translate3d(${-state.scroll * 0.85}px, 0, 0)`;
    layerReeds.style.transform = `translate3d(${-state.scroll * 1.35}px, 0, 0)`;

    // 灯卡浮动 + 冲击弹簧 + 倾斜
    cards.forEach((card, i) => {
      const bob = wobble(t, card.phase) * card.bobAmp;
      [card.shockY, card.shockV] = springStep(card.shockY, card.shockV, 0, 90, 0.88, dt);
      const y = card.laneY + bob + card.shockY;
      card.el.style.transform =
        `translate3d(${card.worldX - CARD_W / 2}px, calc(50% + ${y - 120}px), 0) ` +
        `rotate(${card.shockY * 0.012 + wobble(t, card.phase + 3) * 1.6}deg) ` +
        `rotateX(${card.tiltX}deg) rotateY(${card.tiltY}deg)`;
      card.el.style.zIndex = 5 + (i % 2);
    });

    // 光标光晕弹簧跟随
    const [hx, hvx] = springStep(state.halo.x, state.halo.vx, state.pointer.x, 30, 0.82, dt);
    const [hy, hvy] = springStep(state.halo.y, state.halo.vy, state.pointer.y, 30, 0.82, dt);
    state.halo.x = hx; state.halo.vx = hvx;
    state.halo.y = hy; state.halo.vy = hvy;
    cursorHalo.style.transform = `translate(${hx - 240}px, ${hy - 240}px)`;

    // HUD 里程（节流：位置变化时）
    if (Math.abs(prevScroll - state.scroll) > 6 || state.dragging) refreshHud();

    requestAnimationFrame(loop);
  }

  // === 启动 ===
  function boot() {
    initTheme();
    state.ideas = loadIdeas();
    state.ideas.forEach((idea) => {
      const el = createCardEl(idea, state.ideas.indexOf(idea), false);
      track.appendChild(el);
      cards.push({
        el,
        worldX: 0, laneY: 0,
        phase: rand(0, Math.PI * 2),
        bobAmp: rand(7, 16),
        shockY: 0, shockV: 0,
        tiltX: 0, tiltY: 0
      });
    });
    layout();

    // 错峰入场
    cards.forEach((card, i) => {
      card.el.style.animationDelay = (i * 0.12) + 's';
    });

    scrambleReveal(brandTitle, 'IDEA BOARDWALK', 36);
    window.addEventListener('resize', layout);
    requestAnimationFrame(loop);
  }

  boot();
})();
