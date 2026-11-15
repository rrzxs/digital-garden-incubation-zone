/* ============================================================
   TAPE ARCHIVE LEDGER · 磁带档案账本
   交互逻辑：走带机芯物理、磁带档案 CRUD、粒子流场、主题系统
   ============================================================ */
(function () {
  'use strict';

  // === 常量与工具 ===
  const STORAGE_KEY = 'tape-archive-ledger:v1';
  const EASE_DURATION = 600;
  const CATEGORIES = [
    { id: 'voice', label: '🎙 人声', },
    { id: 'music', label: '♫ 音乐' },
    { id: 'field', label: '≋ 野外' },
    { id: 'talk', label: '◈ 座谈' },
    { id: 'noise', label: '⌁ 噪声' },
    { id: 'dream', label: '☾ 梦呓' },
    { id: 'ritual', label: '✦ 仪式' },
    { id: 'archive', label: '▣ 纪实' },
  ];
  const MOODS = { warm: '暖砂', cool: '冷泉', noir: '夜', dream: '梦境' };

  const pad = (n, w) => String(n).padStart(w, '0');
  const fmtTime = (sec) => `${pad(Math.floor(sec / 60), 2)}:${pad(Math.floor(sec % 60), 2)}`;
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (sel) => document.querySelector(sel);

  // === DOM Elements ===
  const els = {
    body: document.body,
    themeDock: $('.theme-dock'),
    reelLeft: $('#reel-left'),
    reelRight: $('#reel-right'),
    coilLeft: $('#coil-left'),
    coilRight: $('#coil-right'),
    counterValue: $('#counter-value'),
    remainValue: $('#remain-value'),
    nowTitle: $('#now-title'),
    nowMeta: $('#now-meta'),
    waveform: $('#waveform'),
    btnRew: $('#btn-rew'),
    btnPlay: $('#btn-play'),
    btnFf: $('#btn-ff'),
    btnEject: $('#btn-eject'),
    statCount: $('#stat-count'),
    statDuration: $('#stat-duration'),
    statArchived: $('#stat-archived'),
    btnShuffle: $('#btn-shuffle'),
    btnNew: $('#btn-new'),
    archiveList: $('#archive-list'),
    archiveEmpty: $('#archive-empty'),
    modalVeil: $('#modal-veil'),
    modalClose: $('#modal-close'),
    inputLabel: $('#input-label'),
    inputMinutes: $('#input-minutes'),
    minutesReadout: $('#minutes-readout'),
    inputMood: $('#input-mood'),
    categoryGrid: $('#category-grid'),
    btnCancel: $('#btn-cancel'),
    btnConfirm: $('#btn-confirm'),
    toastVeil: $('#toast-veil'),
    canvas: $('#particle-canvas'),
  };

  // === 状态模型 ===
  const state = {
    tapes: [],       // { id, code, label, category, mood, seconds, position, seed }
    loadedId: null,  // 当前入舱磁带
    playing: false,
    transport: 'stop', // stop | play | rew | ff
    counter: 0,
    reelAngleL: 0,
    reelAngleR: 0,
    seq: 1,
  };

  // === 持久化 ===
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tapes: state.tapes, seq: state.seq }));
    } catch (e) { /* 隐私模式下静默降级 */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.tapes)) {
        state.tapes = data.tapes;
        state.seq = data.seq || state.tapes.length + 1;
      }
    } catch (e) { state.tapes = []; }
  }

  // === Toast ===
  function toast(msg) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = msg;
    els.toastVeil.appendChild(node);
    setTimeout(() => {
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 480);
    }, 2400);
  }

  // === 波形生成（磁带种子驱动的伪随机波形） ===
  function seededWave(seed, n) {
    let s = seed;
    const bars = [];
    for (let i = 0; i < n; i++) {
      s = (s * 9301 + 49297) % 233280;
      bars.push(0.18 + (s / 233280) * 0.82);
    }
    return bars;
  }

  const waveBars = [];
  function buildWaveform() {
    els.waveform.innerHTML = '';
    waveBars.length = 0;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 56; i++) {
      const bar = document.createElement('div');
      bar.className = 'wave-bar';
      frag.appendChild(bar);
      waveBars.push(bar);
    }
    els.waveform.appendChild(frag);
  }

  function paintWaveform(tape) {
    if (!tape) {
      waveBars.forEach((b) => { b.style.height = '6px'; b.className = 'wave-bar'; });
      return;
    }
    const shape = seededWave(tape.seed, waveBars.length);
    const progress = tape.position / tape.seconds;
    waveBars.forEach((bar, i) => {
      bar.style.height = `${Math.round(shape[i] * 46)}px`;
      bar.className = 'wave-bar' + (i / waveBars.length <= progress ? ' played' : '');
    });
  }

  // === Deck 走带逻辑 ===
  function currentTape() {
    return state.tapes.find((t) => t.id === state.loadedId) || null;
  }

  function loadTape(id) {
    const tape = state.tapes.find((t) => t.id === id);
    if (!tape) return;
    state.loadedId = id;
    state.playing = false;
    state.transport = 'stop';
    els.body.classList.remove('is-playing');
    els.btnPlay.innerHTML = '<span class="btn-glow"></span>▶';
    els.nowTitle.textContent = tape.label;
    els.nowMeta.textContent = `${tape.code} · ${catLabel(tape.category)} · ${MOODS[tape.mood] || tape.mood}`;
    paintWaveform(tape);
    updateDeckReadout();
    renderArchive();
    toast(`已入舱 · ${tape.code}`);
  }

  function ejectTape() {
    if (!currentTape()) return;
    state.loadedId = null;
    state.playing = false;
    state.transport = 'stop';
    els.body.classList.remove('is-playing');
    els.btnPlay.innerHTML = '<span class="btn-glow"></span>▶';
    els.nowTitle.textContent = 'NO TAPE LOADED';
    els.nowMeta.textContent = '— 请从档案架选取一盘磁带 —';
    paintWaveform(null);
    updateDeckReadout();
    renderArchive();
    toast('磁带已弹出');
  }

  function setTransport(mode) {
    const tape = currentTape();
    if (!tape) { toast('档案舱是空的，先选取一盘磁带'); return; }

    if (mode === 'play') {
      if (tape.position >= tape.seconds - 0.5) tape.position = 0; // 自动回带
      state.playing = !state.playing;
      state.transport = state.playing ? 'play' : 'stop';
      els.body.classList.toggle('is-playing', state.playing);
      els.btnPlay.innerHTML = `<span class="btn-glow"></span>${state.playing ? '❚❚' : '▶'}`;
      toast(state.playing ? `播放中 · ${tape.code}` : '已暂停');
    } else {
      state.transport = state.transport === mode ? 'stop' : mode;
      if (state.transport === 'stop') { state.playing = false; els.body.classList.remove('is-playing'); }
      if (state.transport !== 'stop') toast(state.transport === 'rew' ? '倒带中 ◀◀' : '快进中 ▶▶');
    }
    renderArchive();
  }

  function updateDeckReadout() {
    const tape = currentTape();
    els.counterValue.textContent = pad(Math.round(state.counter), 6);
    els.remainValue.textContent = tape ? fmtTime(Math.max(0, tape.seconds - tape.position)) : '--:--';
  }

  // === 主循环：走带物理 + 波形呼吸 ===
  let lastTs = performance.now();
  let wavePhase = 0;

  function tick(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const tape = currentTape();

    // 走带速度：播放 1x，倒带 -6x，快进 4x
    let speed = 0;
    if (tape) {
      if (state.transport === 'play') speed = 1;
      else if (state.transport === 'rew') speed = -6;
      else if (state.transport === 'ff') speed = 4;
      if (speed !== 0) {
        tape.position = clamp(tape.position + speed * dt, 0, tape.seconds);
        state.counter = (tape.position * 37) % 1000000; // 老式机械计数器
        if (tape.position <= 0 && speed < 0) { setTransportStop(); toast('已倒回带首'); }
        if (tape.position >= tape.seconds && speed > 0) {
          setTransportStop();
          toast('播完啦 · 自动停止');
        }
        updateDeckReadout();
        updateWaveProgress(tape);
      }
    }

    // 卷轴旋转：左盘随供带变慢、右盘随收带变快（模拟带卷直径变化）
    const spin = Math.abs(speed);
    state.reelAngleL += spin * dt * 150;
    state.reelAngleR += spin * dt * 210;
    if (tape) {
      const p = tape.position / tape.seconds;
      els.reelLeft.style.transform = `rotate(${-state.reelAngleL}deg)`;
      els.reelRight.style.transform = `rotate(${-state.reelAngleR}deg)`;
      // 带卷直径：左盘递减，右盘递增
      const insetL = 18 + p * 24;
      const insetR = 42 - p * 24;
      els.coilLeft.style.inset = `${insetL}px`;
      els.coilRight.style.inset = `${insetR}px`;
    }

    // 波形呼吸（播放时轻微律动）
    if (state.playing) {
      wavePhase += dt * 6;
      const tape2 = currentTape();
      if (tape2) {
        const shape = seededWave(tape2.seed, waveBars.length);
        const progress = tape2.position / tape2.seconds;
        waveBars.forEach((bar, i) => {
          if (i / waveBars.length > progress) {
            bar.style.height = `${Math.round(shape[i] * 46)}px`;
            return;
          }
          const breathe = 1 + Math.sin(wavePhase + i * 0.4) * 0.18;
          bar.style.height = `${Math.round(clamp(shape[i] * 46 * breathe, 4, 48))}px`;
        });
      }
    }

    updateParticles(dt);
    requestAnimationFrame(tick);
  }

  function setTransportStop() {
    state.playing = false;
    state.transport = 'stop';
    els.body.classList.remove('is-playing');
    els.btnPlay.innerHTML = '<span class="btn-glow"></span>▶';
    renderArchive();
  }

  function updateWaveProgress(tape) {
    const progress = tape.position / tape.seconds;
    const shape = seededWave(tape.seed, waveBars.length);
    waveBars.forEach((bar, i) => {
      bar.style.height = `${Math.round(shape[i] * 46)}px`;
      const cls = 'wave-bar' + (i / waveBars.length <= progress ? ' played' : '');
      if (bar.className !== cls) bar.className = cls;
    });
  }

  function catLabel(id) {
    const c = CATEGORIES.find((x) => x.id === id);
    return c ? c.label : id;
  }

  // === 档案渲染 ===
  function renderArchive() {
    const list = els.archiveList;
    list.innerHTML = '';
    els.archiveEmpty.classList.toggle('visible', state.tapes.length === 0);

    state.tapes.forEach((tape, idx) => {
      const card = document.createElement('article');
      card.className = 'tape-card' + (tape.id === state.loadedId ? ' loaded' : '') +
        (tape.id === state.loadedId && state.playing ? ' playing' : '');
      card.style.animationDelay = `${Math.min(idx * 55, 500)}ms`;
      card.dataset.id = tape.id;

      const progress = Math.round((tape.position / tape.seconds) * 100);

      card.innerHTML = `
        <div class="tape-card-head">
          <span class="tape-code mono">${tape.code}</span>
          <span class="tape-mood">${MOODS[tape.mood] || tape.mood}</span>
        </div>
        <h3 class="tape-label">${escapeHtml(tape.label)}</h3>
        <div class="tape-mini-reels" aria-hidden="true">
          <span class="mini-reel"></span>
          <div class="mini-tape"><div class="mini-progress" style="width:${progress}%"></div></div>
          <span class="mini-reel"></span>
        </div>
        <div class="tape-meta">
          <span>${catLabel(tape.category)}</span>
          <span class="tape-duration">${fmtTime(tape.seconds)} / ${fmtTime(tape.position)}</span>
        </div>
        <div class="tape-actions">
          <button class="icon-btn act-load" title="入舱播放">▶ 入舱</button>
          <button class="icon-btn act-rewind" title="倒回带首">◀◀ 倒带</button>
          <button class="icon-btn danger act-delete" title="消磁删除">⌫ 消磁</button>
        </div>
      `;
      list.appendChild(card);
    });

    updateStats();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function updateStats() {
    els.statCount.textContent = pad(state.tapes.length, 2);
    const total = state.tapes.reduce((s, t) => s + t.seconds, 0);
    els.statDuration.textContent = fmtTime(total);
    els.statArchived.textContent = pad(state.tapes.filter((t) => t.position > 0).length, 2);
  }

  // === 新磁带弹窗 ===
  let selectedCategory = 'voice';

  function buildCategoryGrid() {
    els.categoryGrid.innerHTML = '';
    CATEGORIES.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-btn' + (c.id === selectedCategory ? ' active' : '');
      btn.dataset.cat = c.id;
      btn.textContent = c.label;
      els.categoryGrid.appendChild(btn);
    });
  }

  function openModal() {
    els.modalVeil.classList.add('open');
    els.modalVeil.setAttribute('aria-hidden', 'false');
    setTimeout(() => els.inputLabel.focus(), EASE_DURATION / 2);
  }

  function closeModal() {
    els.modalVeil.classList.remove('open');
    els.modalVeil.setAttribute('aria-hidden', 'true');
  }

  function confirmTape() {
    const label = els.inputLabel.value.trim() || `未命名录音 · ${pad(state.seq, 3)}`;
    const minutes = parseInt(els.inputMinutes.value, 10);
    const mood = els.inputMood.value;

    const tape = {
      id: `tape-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      code: `C-${pad(state.seq, 3)}`,
      label,
      category: selectedCategory,
      mood,
      seconds: minutes * 60,
      position: 0,
      seed: Math.floor(Math.random() * 233280) + 1,
    };
    state.seq += 1;
    state.tapes.unshift(tape);
    save();
    renderArchive();
    closeModal();
    els.inputLabel.value = '';
    toast(`已归档 · ${tape.code} «${label}»`);
    setTimeout(() => loadTape(tape.id), EASE_DURATION);
  }

  // === 卡片交互（事件委托） ===
  els.archiveList.addEventListener('click', (e) => {
    const card = e.target.closest('.tape-card');
    if (!card) return;
    const id = card.dataset.id;

    if (e.target.closest('.act-delete')) {
      const tape = state.tapes.find((t) => t.id === id);
      state.tapes = state.tapes.filter((t) => t.id !== id);
      if (state.loadedId === id) ejectTapeSilently();
      save();
      renderArchive();
      toast(`已消磁 · ${tape ? tape.code : ''}`);
      return;
    }

    if (e.target.closest('.act-rewind')) {
      const tape = state.tapes.find((t) => t.id === id);
      if (tape) {
        tape.position = 0;
        save();
        if (state.loadedId === id) { paintWaveform(tape); updateDeckReadout(); }
        renderArchive();
        toast(`倒回带首 · ${tape.code}`);
      }
      return;
    }

    // 默认：整卡入舱
    loadTape(id);
  });

  function ejectTapeSilently() {
    state.loadedId = null;
    state.playing = false;
    state.transport = 'stop';
    els.body.classList.remove('is-playing');
    els.btnPlay.innerHTML = '<span class="btn-glow"></span>▶';
    els.nowTitle.textContent = 'NO TAPE LOADED';
    els.nowMeta.textContent = '— 请从档案架选取一盘磁带 —';
    paintWaveform(null);
    updateDeckReadout();
  }

  // === 磁性按钮（光晕跟随） ===
  function bindMagneticGlow() {
    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        btn.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });
  }

  // === 卡片 3D 倾斜（事件委托 + rAF 节流） ===
  els.archiveList.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.tape-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -8;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
    card.style.transform = `translateY(-4px) perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });

  els.archiveList.addEventListener('pointerleave', () => {
    document.querySelectorAll('.tape-card').forEach((c) => { c.style.transform = ''; });
  });

  // === 粒子流场 ===
  const particles = [];
  function initParticles() {
    const n = Math.min(64, Math.floor(window.innerWidth / 22));
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: rand(-6, 6),
        vy: rand(-6, 6),
        r: rand(0.6, 2.1),
        a: rand(0.08, 0.4),
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  const ctx = els.canvas.getContext('2d');
  function resizeCanvas() {
    els.canvas.width = window.innerWidth * devicePixelRatio;
    els.canvas.height = window.innerHeight * devicePixelRatio;
    els.canvas.style.width = `${window.innerWidth}px`;
    els.canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function updateParticles(dt) {
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7df0c8';
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.phase += dt * 0.7;
      p.x += (p.vx + Math.sin(p.phase) * 8) * dt;
      p.y += (p.vy + Math.cos(p.phase * 0.8) * 8) * dt;
      if (p.x < -20) p.x = window.innerWidth + 20;
      if (p.x > window.innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = window.innerHeight + 20;
      if (p.y > window.innerHeight + 20) p.y = -20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(p.phase));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // === 主题系统 ===
  function initTheme() {
    let saved = 'aurora';
    try { saved = localStorage.getItem(STORAGE_KEY + ':theme') || 'aurora'; } catch (e) { /* noop */ }
    setTheme(saved);
    els.themeDock.addEventListener('click', (e) => {
      const dot = e.target.closest('.theme-dot');
      if (dot) setTheme(dot.dataset.theme);
    });
  }

  function setTheme(name) {
    els.body.dataset.theme = name;
    try { localStorage.setItem(STORAGE_KEY + ':theme', name); } catch (e) { /* noop */ }
    document.querySelectorAll('.theme-dot').forEach((d) => {
      d.classList.toggle('active', d.dataset.theme === name);
    });
  }

  // === 随机倒带 ===
  function shuffleTape() {
    if (state.tapes.length === 0) { toast('档案架空空如也'); return; }
    const pool = state.tapes.filter((t) => t.id !== state.loadedId);
    const pick = (pool.length ? pool : state.tapes)[Math.floor(Math.random() * (pool.length || state.tapes.length))];
    loadTape(pick.id);
  }

  // === 事件绑定 ===
  function bindEvents() {
    els.btnPlay.addEventListener('click', () => setTransport('play'));
    els.btnRew.addEventListener('click', () => setTransport('rew'));
    els.btnFf.addEventListener('click', () => setTransport('ff'));
    els.btnEject.addEventListener('click', ejectTape);

    els.btnNew.addEventListener('click', openModal);
    els.btnShuffle.addEventListener('click', shuffleTape);
    els.btnCancel.addEventListener('click', closeModal);
    els.btnConfirm.addEventListener('click', confirmTape);
    els.modalClose.addEventListener('click', closeModal);
    els.modalVeil.addEventListener('click', (e) => { if (e.target === els.modalVeil) closeModal(); });

    els.categoryGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      selectedCategory = btn.dataset.cat;
      els.categoryGrid.querySelectorAll('.cat-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.cat === selectedCategory);
      });
    });

    els.inputMinutes.addEventListener('input', () => {
      els.minutesReadout.textContent = `${els.inputMinutes.value} min`;
    });

    els.inputLabel.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmTape(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && els.modalVeil.classList.contains('open')) closeModal();
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); setTransport('play'); }
    });

    window.addEventListener('resize', () => { resizeCanvas(); });
  }

  // === 引导数据（首次到访） ===
  function seedIfEmpty() {
    if (state.tapes.length > 0) return;
    const presets = [
      { label: '深夜电台 · 第 7 期', category: 'voice', mood: 'noir', minutes: 34 },
      { label: '雨落在铁皮屋顶', category: 'field', mood: 'dream', minutes: 18 },
      { label: '阁楼里的旧钢琴', category: 'music', mood: 'warm', minutes: 26 },
      { label: '与外婆的最后一通电话', category: 'archive', mood: 'warm', minutes: 12 },
    ];
    presets.forEach((p, i) => {
      state.tapes.push({
        id: `tape-seed-${i}`,
        code: `C-${pad(i + 1, 3)}`,
        label: p.label,
        category: p.category,
        mood: p.mood,
        seconds: p.minutes * 60,
        position: 0,
        seed: Math.floor(Math.random() * 233280) + 1,
      });
    });
    state.seq = presets.length + 1;
    save();
  }

  // === 启动 ===
  function boot() {
    load();
    seedIfEmpty();
    buildWaveform();
    buildCategoryGrid();
    renderArchive();
    paintWaveform(null);
    updateDeckReadout();
    initTheme();
    initParticles();
    resizeCanvas();
    bindEvents();
    bindMagneticGlow();
    requestAnimationFrame(tick);
  }

  boot();
})();
