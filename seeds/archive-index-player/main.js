/* ═══════════════════════════════════════════════════════════
   Archive Index Player · 档案索引播放器
   卷宗即唱片 — 索引检索 × 波形示波 × 非线性动效
   maintainer: EDEN
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // === 配置与数据 ═══════════════════════════════════════════
  const THEMES = [
    { id: 'noir', color: '#7dd6ff' },
    { id: 'amber', color: '#ffc46b' },
    { id: 'jade', color: '#6ff0c4' },
    { id: 'rose', color: '#ff9ecb' }
  ];

  const ARCHIVE = [
    { code: 'AR-0001', title: '磁带底的黄昏', cat: 'FIELD · 田野', year: '1987', dur: 14, freq: 196.0, desc: '一盘在旧货市场发现的磁带，B 面录着某年夏末的蝉鸣与广播电台的告别节目。' },
    { code: 'AR-0002', title: '数据中心的雨季', cat: 'SYSTEM · 系统', year: '2019', dur: 18, freq: 220.0, desc: '冷却塔水汽在机房上空凝成局部降雨。运维日志记载：湿度 82%，风扇转速轻微异常。' },
    { code: 'AR-0003', title: '午夜图书馆索引卡', cat: 'PAPER · 纸本', year: '1962', dur: 15, freq: 246.9, desc: '闭馆后的卡片目录柜自行排列出一句无人认领的诗，管理员决定不将其归档。' },
    { code: 'AR-0004', title: '深海电缆的嗡鸣', cat: 'SIGNAL · 信号', year: '2004', dur: 20, freq: 174.6, desc: '横越大洋的光纤中继器持续发出 50Hz 附近的背景音，像海底深处一头巨兽的呼吸。' },
    { code: 'AR-0005', title: '胶片上的候鸟', cat: 'FILM · 影像', year: '1975', dur: 12, freq: 293.7, desc: '一卷超八毫米胶片记录了三千只候鸟掠过电视塔的十九秒，画面边缘有放映员的指纹。' },
    { code: 'AR-0006', title: '废弃电台的残波', cat: 'SIGNAL · 信号', year: '1993', dur: 16, freq: 207.7, desc: '调频旋钮转到 103.5 时，偶尔能捕获一座早已拆除的发射塔留下的镜面反射信号。' },
    { code: 'AR-0007', title: '温室的白噪音', cat: 'FIELD · 田野', year: '2011', dur: 13, freq: 261.6, desc: '植物学家用四个麦克风录下温室夜间蒸腾作用的声音，频谱图呈现完美粉红噪声。' },
    { code: 'AR-0008', title: '打孔卡上的月相', cat: 'SYSTEM · 系统', year: '1969', dur: 17, freq: 185.0, desc: '阿波罗制导计算机的原始数据卡片，孔洞排布经艺术化处理后与月相周期完全吻合。' },
    { code: 'AR-0009', title: '车站储物柜之夏', cat: 'PAPER · 纸本', year: '1998', dur: 15, freq: 233.1, desc: '第 47 号储物柜三年未开，柜门缝隙里塞满旅人误投的车票，最早的一张来自海边小城。' },
    { code: 'AR-0010', title: '霓虹灯管的衰变', cat: 'FILM · 影像', year: '2016', dur: 19, freq: 155.6, desc: '一家即将歇业的录像带店，其招牌霓虹的闪烁频率逐年减慢，如同一颗恒星的红移。' },
    { code: 'AR-0011', title: '冰川内部的回声', cat: 'FIELD · 田野', year: '2021', dur: 21, freq: 164.8, desc: '地质队将水听器沉入冰裂隙，录到冰川缓慢移动时的挤压声，像大地翻了个身。' },
    { code: 'AR-0012', title: '索引索引本身', cat: 'SYSTEM · 系统', year: '∞', dur: 16, freq: 277.2, desc: '当一份档案尝试检索自己，索引系统在递归的第七层停了下来，留下了这段记录。' }
  ];

  const SCRAMBLE_POOL = '░▒▓█◇◈≬⋈⋊⊛⊨∎#%&@$§¤ÆØ01010';
  const EASE = { out: 'cubic-bezier(0.16, 1, 0.3, 1)' };

  // === DOM Elements ═════════════════════════════════════════
  const $ = (id) => document.getElementById(id);
  const dom = {
    body: document.body,
    indexList: $('index-list'),
    entryCount: $('entry-count'),
    code: $('entry-code'),
    cat: $('entry-cat'),
    year: $('entry-year'),
    state: $('entry-state'),
    title: $('entry-title'),
    desc: $('entry-desc'),
    timeNow: $('time-now'),
    timeTotal: $('time-total'),
    track: $('progress-track'),
    fill: $('progress-fill'),
    buffer: $('progress-buffer'),
    thumb: $('progress-thumb'),
    btnPlay: $('btn-play'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    btnShuffle: $('btn-shuffle'),
    btnAuto: $('btn-auto'),
    btnMute: $('btn-mute'),
    autoBadge: $('auto-badge'),
    muteBadge: $('mute-badge'),
    themeDots: $('theme-dots'),
    clock: $('hud-clock'),
    statusLeft: $('status-left'),
    statusRight: $('status-right'),
    waveCanvas: $('wave-canvas'),
    fieldCanvas: $('field-canvas')
  };

  // === 全局状态 ═════════════════════════════════════════════
  const state = {
    current: 0,
    playing: false,
    t: 0,               // 秒
    auto: true,
    muted: false,
    theme: 'noir',
    scrubbing: false,
    lastFrame: performance.now()
  };

  // === 工具 ═════════════════════════════════════════════════
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const d = Math.floor((sec % 1) * 10);
    return `${pad(m)}:${pad(s)}.${d}`;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // === 乱码揭示 (Scramble Reveal) ═══════════════════════════
  function scrambleInto(el, text, opts = {}) {
    const duration = opts.duration || 900;
    const start = performance.now();
    el.classList.remove('scrambling');
    cancelAnimationFrame(el._scrambleRaf);
    (function tick(now) {
      const p = clamp((now - start) / duration, 0, 1);
      const revealed = Math.floor(p * text.length);
      let out = text.slice(0, revealed);
      for (let i = revealed; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scrambleRaf = requestAnimationFrame(tick);
    })(start);
  }

  // === 涟漪冲击波 ═══════════════════════════════════════════
  function shockwave(x, y) {
    const w = document.createElement('div');
    w.className = 'shockwave';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 950);
  }

  // === Web Audio 索引音色 ═══════════════════════════════════
  const Sfx = {
    ctx: null,
    osc: null,
    gain: null,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },
    startTone(freq) {
      if (state.muted || !this.ensure()) return;
      this.stopTone();
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      this.osc.type = 'sine';
      this.osc.frequency.value = freq;
      this.osc.detune.value = rand(-6, 6);
      this.gain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.8);
      this.osc.connect(filter);
      filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();
    },
    stopTone() {
      if (!this.osc) return;
      const t = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setValueAtTime(this.gain.gain.value, t);
      this.gain.gain.linearRampToValueAtTime(0, t + 0.5);
      this.osc.stop(t + 0.55);
      this.osc = null;
      this.gain = null;
    },
    blip(freq = 660, dur = 0.08, vol = 0.06) {
      if (state.muted || !this.ensure()) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur + 0.02);
    }
  };

  // === 索引列表渲染 ═════════════════════════════════════════
  function buildIndex() {
    dom.indexList.innerHTML = '';
    ARCHIVE.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'index-row';
      row.dataset.index = i;
      row.style.transitionDelay = (i * 18) + 'ms';
      row.innerHTML = `
        <span class="row-code">${entry.code}</span>
        <span class="row-title">${entry.title}</span>
        <span class="row-dur">${fmtTime(entry.dur).slice(0, 5)}</span>`;
      row.addEventListener('click', (e) => {
        shockwave(e.clientX, e.clientY);
        Sfx.blip(520 + i * 20);
        selectEntry(i, true);
      });
      dom.indexList.appendChild(row);
    });
    dom.entryCount.textContent = pad(ARCHIVE.length) + ' ENTRIES';
  }

  function syncIndexRows() {
    dom.indexList.querySelectorAll('.index-row').forEach((row) => {
      const i = +row.dataset.index;
      row.classList.toggle('active', i === state.current);
      row.classList.toggle('playing', i === state.current && state.playing);
      if (i === state.current) {
        const el = row.querySelector('.row-title');
        if (el && el.textContent !== ARCHIVE[i].title) scrambleInto(el, ARCHIVE[i].title, { duration: 500 });
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  // === 播放引擎 ═════════════════════════════════════════════
  function currentEntry() { return ARCHIVE[state.current]; }

  function selectEntry(i, autoplay) {
    state.current = (i + ARCHIVE.length) % ARCHIVE.length;
    state.t = 0;
    renderEntry();
    if (autoplay) play();
    else pause();
    syncIndexRows();
  }

  function renderEntry() {
    const e = currentEntry();
    scrambleInto(dom.title, e.title, { duration: 900 });
    dom.code.textContent = e.code;
    scrambleInto(dom.cat, e.cat, { duration: 600 });
    dom.year.textContent = 'YR ' + e.year;
    dom.desc.textContent = e.desc;
    dom.timeTotal.textContent = fmtTime(e.dur);
    dom.statusLeft.textContent = `LOADED · ${e.code} · ${e.title}`;
    dom.buffer.style.width = '0%';
  }

  function play() {
    if (state.playing) return;
    state.playing = true;
    dom.body.classList.add('is-playing');
    dom.state.textContent = 'PLAYING';
    Sfx.startTone(currentEntry().freq);
    syncIndexRows();
  }

  function pause() {
    if (!state.playing) {
      dom.state.textContent = 'STANDBY';
      return;
    }
    state.playing = false;
    dom.body.classList.remove('is-playing');
    dom.state.textContent = 'PAUSED';
    Sfx.stopTone();
    syncIndexRows();
  }

  function togglePlay() { state.playing ? pause() : play(); }

  function advance(dir) {
    let next;
    if (dir === 'shuffle') {
      do { next = (Math.random() * ARCHIVE.length) | 0; } while (ARCHIVE.length > 1 && next === state.current);
    } else {
      next = (state.current + dir + ARCHIVE.length) % ARCHIVE.length;
    }
    selectEntry(next, state.playing || true);
  }

  function tickPlayback(dt) {
    if (!state.playing || state.scrubbing) return;
    state.t += dt;
    const e = currentEntry();
    if (state.t >= e.dur) {
      state.t = e.dur;
      if (state.auto) {
        advance(1);
        return;
      }
      pause();
      state.t = 0;
      updateProgressUI();
      return;
    }
    updateProgressUI();
  }

  function updateProgressUI() {
    const e = currentEntry();
    const p = clamp(state.t / e.dur, 0, 1);
    dom.fill.style.width = (p * 100) + '%';
    dom.thumb.style.left = (p * 100) + '%';
    dom.buffer.style.width = (clamp(p + 0.06, 0, 1) * 100) + '%';
    dom.timeNow.textContent = fmtTime(state.t);
  }

  // === 进度条拖拽 / 点击跳转 ═════════════════════════════════
  function seekFromEvent(e) {
    const rect = dom.track.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const p = clamp((x - rect.left) / rect.width, 0, 1);
    state.t = p * currentEntry().dur;
    updateProgressUI();
  }
  dom.track.addEventListener('pointerdown', (e) => {
    state.scrubbing = true;
    dom.track.setPointerCapture(e.pointerId);
    seekFromEvent(e);
  });
  dom.track.addEventListener('pointermove', (e) => { if (state.scrubbing) seekFromEvent(e); });
  dom.track.addEventListener('pointerup', () => {
    state.scrubbing = false;
    Sfx.blip(760, 0.06, 0.04);
  });
  dom.track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      state.t = clamp(state.t + (e.key === 'ArrowRight' ? 1 : -1), 0, currentEntry().dur);
      updateProgressUI();
    }
  });

  // === 波形示波器 ═══════════════════════════════════════════
  const Wave = {
    cv: dom.waveCanvas,
    ctx: dom.waveCanvas.getContext('2d'),
    bars: 64,
    levels: new Array(64).fill(0),
    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.cv.width = r.width * dpr;
      this.cv.height = r.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = r.width;
      this.h = r.height;
    },
    tick(dt) {
      const styles = getComputedStyle(document.body);
      const accent = styles.getPropertyValue('--accent').trim();
      const accent2 = styles.getPropertyValue('--accent-2').trim();
      const faint = 'rgba(255,255,255,0.12)';
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      const n = this.bars;
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        const p = i / n;
        let target;
        if (state.playing) {
          const prog = state.t / currentEntry().dur;
          const played = p < prog;
          const envelope = Math.sin(p * Math.PI) * 0.7 + 0.3;
          const jitter = Math.abs(Math.sin(state.t * 7 + i * 1.7) * Math.sin(state.t * 3.1 + i * 0.6));
          target = played ? envelope * (0.25 + jitter * 0.75) : envelope * 0.08;
        } else {
          target = 0.05 + Math.abs(Math.sin(state.t * 1.2 + i * 0.8)) * 0.04;
        }
        this.levels[i] += (target - this.levels[i]) * Math.min(1, dt * 9);
        const bh = Math.max(2, this.levels[i] * h * 0.86);
        const playedBar = p < state.t / currentEntry().dur;
        ctx.fillStyle = playedBar && state.playing ? accent : faint;
        ctx.globalAlpha = playedBar && state.playing ? 0.6 + this.levels[i] * 0.4 : 1;
        const x = i * bw + bw * 0.22;
        const bwi = bw * 0.56;
        roundBar(ctx, x, (h - bh) / 2, bwi, bh, bwi / 2);
      }
      ctx.globalAlpha = 1;
      // 播放头竖线
      const prog = clamp(state.t / currentEntry().dur, 0, 1);
      ctx.fillStyle = accent2;
      ctx.fillRect(prog * w - 1, h * 0.08, 2, h * 0.84);
    }
  };
  function roundBar(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // === 粒子流场背景 ═════════════════════════════════════════
  const Field = {
    cv: dom.fieldCanvas,
    ctx: dom.fieldCanvas.getContext('2d'),
    dots: [],
    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.cv.width = this.w * dpr;
      this.cv.height = this.h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    seed() {
      this.dots = [];
      const count = Math.min(90, Math.floor(this.w * this.h / 22000));
      for (let i = 0; i < count; i++) {
        this.dots.push({
          x: rand(0, this.w), y: rand(0, this.h),
          vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15),
          r: rand(0.6, 1.8), ph: rand(0, Math.PI * 2)
        });
      }
    },
    tick(t) {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim();
      const boost = state.playing ? 2.2 : 1;
      for (const d of this.dots) {
        const nx = Math.sin(t * 0.00022 + d.ph) * 0.24 * boost;
        const ny = Math.cos(t * 0.00019 + d.ph * 1.3) * 0.24 * boost;
        d.x += (d.vx + nx) * boost;
        d.y += (d.vy + ny) * boost;
        if (d.x < -10) d.x = w + 10; if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10; if (d.y > h + 10) d.y = -10;
        const tw = 0.35 + Math.sin(t * 0.001 + d.ph * 3) * 0.3;
        ctx.globalAlpha = tw * (state.playing ? 0.85 : 0.5);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };

  // === 主题切换 ═════════════════════════════════════════════
  function buildThemeDots() {
    THEMES.forEach((t) => {
      const dot = document.createElement('button');
      dot.className = 'theme-dot' + (t.id === state.theme ? ' active' : '');
      dot.style.background = t.color;
      dot.style.setProperty('--dot-color', t.color);
      dot.dataset.theme = t.id;
      dot.title = t.id.toUpperCase();
      dot.addEventListener('click', () => setTheme(t.id));
      dom.themeDots.appendChild(dot);
    });
  }
  function setTheme(id) {
    state.theme = id;
    document.body.dataset.theme = id;
    dom.themeDots.querySelectorAll('.theme-dot').forEach((d) =>
      d.classList.toggle('active', d.dataset.theme === id)
    );
    Sfx.blip(880, 0.05, 0.03);
    dom.statusLeft.textContent = `PALETTE · ${id.toUpperCase()}`;
  }

  // === 控制绑定 ═════════════════════════════════════════════
  dom.btnPlay.addEventListener('click', (e) => { shockwave(e.clientX, e.clientY); togglePlay(); });
  dom.btnPrev.addEventListener('click', () => { Sfx.blip(440); advance(-1); });
  dom.btnNext.addEventListener('click', () => { Sfx.blip(560); advance(1); });
  dom.btnShuffle.addEventListener('click', (e) => {
    shockwave(e.clientX, e.clientY);
    Sfx.blip(340, 0.12, 0.07);
    advance('shuffle');
  });
  dom.btnAuto.addEventListener('click', () => {
    state.auto = !state.auto;
    dom.btnAuto.classList.toggle('on', state.auto);
    dom.autoBadge.textContent = state.auto ? 'AUTO' : 'MANUAL';
    Sfx.blip(state.auto ? 720 : 480);
  });
  dom.btnMute.addEventListener('click', () => {
    state.muted = !state.muted;
    dom.btnMute.classList.toggle('on', !state.muted);
    dom.muteBadge.textContent = state.muted ? 'SFX OFF' : 'SFX ON';
    if (state.muted) Sfx.stopTone();
    else if (state.playing) Sfx.startTone(currentEntry().freq);
  });

  // 键盘
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowUp': case 'KeyW': e.preventDefault(); advance(-1); break;
      case 'ArrowDown': case 'KeyS': e.preventDefault(); advance(1); break;
      case 'ArrowLeft': state.t = clamp(state.t - 2, 0, currentEntry().dur); updateProgressUI(); break;
      case 'ArrowRight': state.t = clamp(state.t + 2, 0, currentEntry().dur); updateProgressUI(); break;
      case 'KeyT': {
        const i = THEMES.findIndex((t) => t.id === state.theme);
        setTheme(THEMES[(i + 1) % THEMES.length].id);
        break;
      }
      case 'KeyR': advance('shuffle'); break;
    }
  });

  // 点击舞台任意处产生涟漪
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.index-row, .t-btn, .progress-track, .theme-dot')) return;
    shockwave(e.clientX, e.clientY);
  });

  // === 主循环 ═══════════════════════════════════════════════
  function loop(now) {
    const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
    state.lastFrame = now;
    tickPlayback(dt);
    Wave.tick(dt);
    Field.tick(now);
    requestAnimationFrame(loop);
  }

  // === HUD 时钟 ═════════════════════════════════════════════
  setInterval(() => {
    const d = new Date();
    dom.clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, 1000);

  // === 初始化 ═══════════════════════════════════════════════
  function init() {
    buildThemeDots();
    buildIndex();
    Wave.resize();
    Field.resize();
    Field.seed();
    selectEntry(0, false);
    updateProgressUI();
    dom.btnAuto.classList.add('on');
    dom.btnMute.classList.add('on');
    window.addEventListener('resize', () => { Wave.resize(); Field.resize(); Field.seed(); });
    requestAnimationFrame((t) => { state.lastFrame = t; requestAnimationFrame(loop); });
    dom.statusRight.textContent = 'MAINTAINED BY EDEN';
  }

  init();
})();
