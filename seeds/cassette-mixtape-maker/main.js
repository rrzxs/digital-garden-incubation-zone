/* ============================================================
   Cassette Mixtape Maker · 卡带混音带工坊
   Vanilla JS · 免构建 · maintainer: EDEN
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const deck = document.getElementById('deck');
  const cassette = document.getElementById('cassette');
  const reelLeft = document.getElementById('reel-left');
  const reelRight = document.getElementById('reel-right');
  const labelTitle = document.getElementById('label-title');
  const labelMeta = document.getElementById('label-meta');
  const counterSlots = Array.from(document.querySelectorAll('.counter-digit'));
  const vuFill = document.getElementById('vu-fill');
  const progressFill = document.getElementById('tape-progress-fill');
  const progressGhost = document.getElementById('tape-progress-ghost');
  const btnRew = document.getElementById('btn-rew');
  const btnPlay = document.getElementById('btn-play');
  const btnFf = document.getElementById('btn-ff');
  const btnEject = document.getElementById('btn-eject');
  const monitorToggle = document.getElementById('monitor-toggle');
  const trackForm = document.getElementById('track-form');
  const titleInput = document.getElementById('track-title-input');
  const durInput = document.getElementById('track-dur-input');
  const trackRowsEl = document.getElementById('track-rows');
  const tracklistEmpty = document.getElementById('tracklist-empty');
  const tracklistTotal = document.getElementById('tracklist-total');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnClear = document.getElementById('btn-clear');
  const rippleLayer = document.getElementById('ripple-layer');
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  // === Constants ===
  const SIDE_LENGTH = 30 * 60; // C-60 双面 · 单面 30 分钟（秒）
  const COUNTER_RATE = 4.2;    // 机械计数器：每秒走字
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const SCRAMBLE_CHARS = '▚▞▛ABCDEFGHKMNPQRSTVXYZ0123456789';

  // === State ===
  const state = {
    tracks: [
      { id: 1, name: '海边偶遇的猫', dur: 214 },
      { id: 2, name: '末班车的霓虹', dur: 187 },
      { id: 3, name: '屋顶上的流星雨', dur: 245 }
    ],
    nextId: 4,
    mode: 'idle', // idle | playing | paused | rew | ff
    elapsed: 0,   // 当前曲目内已播秒数
    index: 0,     // 当前曲目下标
    reelAngleL: 0,
    reelAngleR: 0,
    monitored: false
  };

  // === Utilities ===
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (s) => {
    s = Math.max(0, Math.round(s));
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return `${String(m).padStart(2, '0')}:${ss}`;
  };
  const hashStr = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const mulberry = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const totalDur = () => state.tracks.reduce((a, t) => a + t.dur, 0);
  const elapsedBefore = () => state.tracks.slice(0, state.index).reduce((a, t) => a + t.dur, 0) + state.elapsed;

  // === Toast ===
  function toast(msg) {
    let layer = document.querySelector('.toast-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'toast-layer';
      document.body.appendChild(layer);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // === Scramble Reveal（乱码揭示） ===
  function scramble(el, finalText, dur = 700) {
    const start = performance.now();
    const from = el.textContent;
    const len = Math.max(from.length, finalText.length);
    function frame(now) {
      const t = clamp((now - start) / dur, 0, 1);
      let out = '';
      for (let i = 0; i < len; i++) {
        const reveal = i / len < t;
        out += reveal
          ? (finalText[i] || '')
          : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }

  // === Audio：磁带嘶声 + 曲目种子音景 ===
  const audio = { ctx: null, hissGain: null, toneOsc: null, toneGain: null, filter: null };
  function ensureAudio() {
    if (audio.ctx) return audio.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio.ctx = new AC();
    // 嘶声：白噪声 → 低通
    const bufLen = audio.ctx.sampleRate * 2;
    const buf = audio.ctx.createBuffer(1, bufLen, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
    const src = audio.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    audio.filter = audio.ctx.createBiquadFilter();
    audio.filter.type = 'lowpass'; audio.filter.frequency.value = 5200;
    audio.hissGain = audio.ctx.createGain();
    audio.hissGain.gain.value = 0;
    src.connect(audio.filter).connect(audio.hissGain).connect(audio.ctx.destination);
    src.start();
    // 音景：双振荡器 Drone
    audio.toneGain = audio.ctx.createGain();
    audio.toneGain.gain.value = 0;
    audio.toneOsc = audio.ctx.createOscillator();
    audio.toneOsc.type = 'triangle';
    audio.toneOsc.connect(audio.toneGain).connect(audio.ctx.destination);
    audio.toneOsc.start();
    return audio.ctx;
  }
  function retuneTone() {
    if (!audio.ctx || !state.tracks.length) return;
    const track = state.tracks[state.index];
    const rnd = mulberry(hashStr(track.name));
    const base = 110 + rnd() * 180; // A2 ~ A3+
    audio.toneOsc.frequency.setTargetAtTime(base, audio.ctx.currentTime, 0.4);
  }
  function updateAudioLevels() {
    if (!audio.ctx) return;
    const on = state.monitored;
    const playing = state.mode === 'playing';
    const ff = state.mode === 'ff';
    const hiss = on ? (playing ? 0.018 : ff ? 0.03 : 0.008) : 0;
    const wobble = playing ? 1 + Math.sin(performance.now() / 900) * 0.004 : 1;
    audio.filter.frequency.setTargetAtTime((ff ? 8000 : 5200) * wobble, audio.ctx.currentTime, 0.15);
    audio.hissGain.gain.setTargetAtTime(hiss, audio.ctx.currentTime, 0.2);
    audio.toneGain.gain.setTargetAtTime(on && playing ? 0.012 : 0, audio.ctx.currentTime, 0.3);
  }

  // === 走带机芯物理 ===
  function deckTick(dt) {
    const speed = state.mode === 'playing' ? 1 : state.mode === 'ff' ? 8 : state.mode === 'rew' ? -8 : 0;
    if (speed === 0) return;

    if (speed > 0) {
      // 正向走带
      state.elapsed += dt * speed;
      const track = state.tracks[state.index];
      if (track && state.elapsed >= track.dur) {
        if (state.index < state.tracks.length - 1) {
          state.index++; state.elapsed = 0; retuneTone();
          renderTracks(); updateLabel();
          toast('▶ NEXT · ' + state.tracks[state.index].name);
        } else {
          state.elapsed = track.dur;
          setMode('idle');
          toast('■ SIDE A PLAYBACK COMPLETE · 请翻面');
        }
      }
    } else {
      // 倒带
      state.elapsed -= dt * -speed;
      if (state.elapsed < 0) {
        if (state.index > 0) {
          state.index--; state.elapsed = state.tracks[state.index].dur;
          retuneTone(); renderTracks(); updateLabel();
        } else {
          state.elapsed = 0; setMode('idle');
          toast('⏮ REWOUND TO START');
        }
      }
    }

    // 卷轴角速度：半径与带量成反比（角速度 ω = v / r）
    const totalTape = Math.max(totalDur(), 1);
    const played = clamp(elapsedBefore() / totalTape, 0.02, 0.98);
    const rLeft = lerp(10, 30, played);   // 供带盘：越播越小
    const rRight = lerp(30, 10, played);  // 收带盘：越播越大
    const angularL = (speed * 160) / rLeft;
    const angularR = (speed * 160) / rRight;
    state.reelAngleL += angularL * dt;
    state.reelAngleR += angularR * dt;
  }

  // === 渲染 ===
  function renderReels() {
    const totalTape = Math.max(totalDur(), 1);
    const played = clamp(elapsedBefore() / totalTape, 0.02, 0.98);
    const sizeL = lerp(44, 64, played);
    const sizeR = lerp(64, 44, played);
    reelLeft.style.width = reelLeft.style.height = sizeL + 'px';
    reelRight.style.width = reelRight.style.height = sizeR + 'px';
    reelLeft.style.transform = `rotate(${state.reelAngleL}deg)`;
    reelRight.style.transform = `rotate(${state.reelAngleR}deg)`;
  }

  function renderCounter() {
    const value = Math.floor(elapsedBefore() * COUNTER_RATE) % 10000;
    const str = String(value).padStart(4, '0');
    counterSlots.forEach((slot, i) => { if (slot.textContent !== str[i]) slot.textContent = str[i]; });
  }

  function renderProgress() {
    const pct = clamp(elapsedBefore() / SIDE_LENGTH, 0, 1) * 100;
    progressFill.style.width = pct + '%';
    progressGhost.style.width = pct + '%';
    progressGhost.classList.toggle('active', state.mode === 'playing');
  }

  function renderVU() {
    let level = 0;
    if (state.mode === 'playing' && state.tracks.length) {
      const t = performance.now() / 1000;
      const track = state.tracks[state.index];
      const rnd = mulberry(hashStr(track.name));
      const seedPhase = rnd() * 10;
      level = 45 + Math.sin(t * 2.1 + seedPhase) * 20 + Math.sin(t * 5.7 + seedPhase * 2) * 14 + rnd() * 8;
    } else if (state.mode === 'ff' || state.mode === 'rew') {
      level = 18 + Math.random() * 12;
    }
    vuFill.style.width = clamp(level, 0, 100) + '%';
  }

  function updateLabel() {
    const n = state.tracks.length;
    labelMeta.textContent = `SIDE A · ${n} TRACK${n === 1 ? '' : 'S'} · C-60 · ${fmt(totalDur())}`;
  }

  function renderTracks() {
    trackRowsEl.innerHTML = '';
    state.tracks.forEach((track, i) => {
      const li = document.createElement('li');
      li.className = 'track-row entering' + (i === state.index && state.mode !== 'idle' ? ' now-playing' : '');
      li.draggable = true;
      li.dataset.id = track.id;
      li.innerHTML = `
        <span class="track-drag" title="拖拽重排">⠿</span>
        <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="track-name">${escapeHtml(track.name)}</span>
        <span class="track-dur">${fmt(track.dur)}</span>
        <button class="track-del" title="抹除这首曲目" aria-label="删除曲目">×</button>
      `;
      trackRowsEl.appendChild(li);
    });
    tracklistEmpty.classList.toggle('show', state.tracks.length === 0);
    tracklistTotal.textContent = `${fmt(totalDur())} / ${fmt(SIDE_LENGTH)}`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // === 模式切换 ===
  function setMode(mode) {
    state.mode = mode;
    deck.dataset.mode = mode === 'paused' ? 'idle' : mode;
    btnPlay.classList.toggle('active', mode === 'playing');
    btnPlay.classList.toggle('playing', mode === 'playing');
    btnPlay.querySelector('.glyph').innerHTML = mode === 'playing' ? '&#10073;&#10073;' : '&#9654;';
    btnRew.classList.toggle('active', mode === 'rew');
    btnFf.classList.toggle('active', mode === 'ff');
    if (mode === 'playing') { ensureAudio(); retuneTone(); }
    renderTracks();
  }

  // === 曲目操作 ===
  function parseDur(str) {
    const m = String(str).trim().match(/^(\d{1,2}):?([0-5]?\d)?$/);
    if (!m) return null;
    const min = parseInt(m[1], 10);
    const sec = m[2] ? parseInt(m[2], 10) : 0;
    const total = min * 60 + sec;
    return total > 0 && total <= 900 ? total : null;
  }

  function addTrack(name, dur) {
    state.tracks.push({ id: state.nextId++, name, dur });
    renderTracks();
    updateLabel();
    scramble(labelTitle, name.length > 24 ? name.slice(0, 24) + '…' : name, 600);
    setTimeout(() => scramble(labelTitle, 'UNTITLED MIXTAPE', 500), 1600);
    const addBtn = trackForm.querySelector('.track-add');
    addBtn.classList.remove('rec-pulse'); void addBtn.offsetWidth; addBtn.classList.add('rec-pulse');
  }

  // === 事件绑定 ===
  trackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = titleInput.value.trim();
    if (!name) { titleInput.focus(); toast('⚠ 请输入曲名'); return; }
    const dur = parseDur(durInput.value.trim() || '3:30');
    if (!dur) { durInput.focus(); toast('⚠ 时长格式：m:ss（≤15:00）'); return; }
    if (totalDur() + dur > SIDE_LENGTH) { toast('⚠ 磁带已满 · SIDE A 只有 30 分钟'); return; }
    addTrack(name, dur);
    titleInput.value = ''; durInput.value = '';
    titleInput.focus();
  });

  trackRowsEl.addEventListener('click', (e) => {
    const li = e.target.closest('.track-row');
    if (!li) return;
    const id = Number(li.dataset.id);
    if (e.target.closest('.track-del')) {
      const idx = state.tracks.findIndex((t) => t.id === id);
      if (idx < 0) return;
      li.classList.add('removing');
      setTimeout(() => {
        state.tracks.splice(idx, 1);
        if (state.index >= state.tracks.length) { state.index = Math.max(0, state.tracks.length - 1); state.elapsed = 0; }
        renderTracks(); updateLabel();
        toast('⌫ TRACK ERASED');
      }, 320);
      return;
    }
    // 点击任意曲目：跳播
    const idx = state.tracks.findIndex((t) => t.id === id);
    state.index = idx; state.elapsed = 0;
    setMode('playing'); retuneTone(); updateLabel();
    toast('▶ NOW PLAYING · ' + state.tracks[idx].name);
  });

  // 拖拽重排
  let dragId = null;
  trackRowsEl.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.track-row');
    if (!li) return;
    dragId = Number(li.dataset.id);
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  trackRowsEl.addEventListener('dragend', (e) => {
    const li = e.target.closest('.track-row');
    if (li) li.classList.remove('dragging');
    dragId = null;
  });
  trackRowsEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const li = e.target.closest('.track-row');
    if (!li || dragId === null) return;
    const overId = Number(li.dataset.id);
    if (overId === dragId) return;
    const from = state.tracks.findIndex((t) => t.id === dragId);
    const to = state.tracks.findIndex((t) => t.id === overId);
    const moved = state.tracks.splice(from, 1)[0];
    state.tracks.splice(to, 0, moved);
    // FLIP：保持视觉连续
    const rects = new Map();
    trackRowsEl.querySelectorAll('.track-row').forEach((r) => rects.set(Number(r.dataset.id), r.getBoundingClientRect()));
    renderTracks();
    trackRowsEl.querySelectorAll('.track-row').forEach((r) => {
      const id = Number(r.dataset.id);
      const prev = rects.get(id);
      if (!prev) return;
      const now = r.getBoundingClientRect();
      const dy = prev.top - now.top;
      if (Math.abs(dy) < 1) return;
      r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: 420, easing: EASE });
    });
  });

  btnShuffle.addEventListener('click', () => {
    if (state.tracks.length < 2) { toast('ⓘ 至少两首才能洗牌'); return; }
    for (let i = state.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.tracks[i], state.tracks[j]] = [state.tracks[j], state.tracks[i]];
    }
    state.index = 0; state.elapsed = 0;
    renderTracks();
    toast('⇄ TRACKLIST SHUFFLED');
  });

  btnClear.addEventListener('click', () => {
    if (!state.tracks.length) { toast('ⓘ 磁带本就是空的'); return; }
    setMode('idle');
    state.tracks = []; state.index = 0; state.elapsed = 0;
    state.reelAngleL = state.reelAngleR = 0;
    renderTracks(); updateLabel();
    scramble(labelTitle, 'BLANK TAPE', 700);
    setTimeout(() => scramble(labelTitle, 'UNTITLED MIXTAPE', 600), 1500);
    toast('⌁ DEMAGNETIZED · 消磁完成');
  });

  btnPlay.addEventListener('click', () => {
    if (!state.tracks.length) { toast('ⓘ 先录几首歌进来吧'); return; }
    if (state.mode === 'playing') setMode('paused');
    else {
      if (state.elapsed >= state.tracks[state.index].dur) { state.index = 0; state.elapsed = 0; }
      setMode('playing');
    }
  });
  btnRew.addEventListener('click', () => {
    if (!state.tracks.length) return;
    setMode(state.mode === 'rew' ? 'idle' : 'rew');
  });
  btnFf.addEventListener('click', () => {
    if (!state.tracks.length) return;
    setMode(state.mode === 'ff' ? 'idle' : 'ff');
  });
  btnEject.addEventListener('click', eject);
  function eject() {
    setMode('idle');
    state.index = 0; state.elapsed = 0;
    cassette.classList.remove('ejecting'); void cassette.offsetWidth;
    cassette.classList.add('ejecting');
    setTimeout(() => cassette.classList.remove('ejecting'), 1200);
    toast('⏏ EJECTED · 回带到起点');
  }

  monitorToggle.addEventListener('change', () => {
    state.monitored = monitorToggle.checked;
    if (state.monitored) ensureAudio();
    toast(state.monitored ? '♪ MONITOR ON · 监听已开启' : '♪ MONITOR OFF');
  });

  // 键盘快捷键
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input')) return;
    if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
    else if (e.key === 'r' || e.key === 'R') btnRew.click();
    else if (e.key === 'f' || e.key === 'F') btnFf.click();
    else if (e.key === 'e' || e.key === 'E') eject();
  });

  // === 主题切换 ===
  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      document.body.dataset.theme = dot.dataset.theme;
      document.querySelectorAll('.theme-dot').forEach((d) => d.classList.toggle('active', d === dot));
    });
  });

  // === 涟漪 ===
  window.addEventListener('pointerdown', (e) => {
    for (let i = 0; i < 3; i++) {
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      const size = 60 + i * 50;
      r.style.width = r.style.height = size + 'px';
      r.style.animationDelay = i * 0.09 + 's';
      rippleLayer.appendChild(r);
      setTimeout(() => r.remove(), 1300);
    }
  });

  // === 粒子流场 ===
  let W = 0, H = 0;
  const particles = [];
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: 0, vy: 0, size: 0.6 + Math.random() * 1.6,
      alpha: 0.12 + Math.random() * 0.3, seed: Math.random() * 100
    });
  }
  function particleFrame(t) {
    ctx.clearRect(0, 0, W, H);
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7dd3fc';
    const boost = state.mode === 'playing' ? 1.8 : 1;
    for (const p of particles) {
      const ang = Math.sin(t / 4000 + p.seed) * Math.PI + Math.cos(t / 6000 + p.seed * 2) * 0.8;
      p.vx = lerp(p.vx, Math.cos(ang) * 0.35 * boost, 0.02);
      p.vy = lerp(p.vy, Math.sin(ang) * 0.28 * boost, 0.02);
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      ctx.globalAlpha = p.alpha * boost;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // === 主循环 ===
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    deckTick(dt);
    renderReels();
    renderCounter();
    renderProgress();
    renderVU();
    updateAudioLevels();
    particleFrame(now);
    requestAnimationFrame(loop);
  }

  // === 启动 ===
  renderTracks();
  updateLabel();
  document.querySelector('.theme-dot[data-theme="aurora"]').classList.add('active');
  scramble(document.getElementById('app-title'), 'CASSETTE MIXTAPE MAKER', 900);
  requestAnimationFrame(loop);
})();
