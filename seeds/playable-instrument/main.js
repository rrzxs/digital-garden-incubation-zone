/* ═══════════════════════════════════════════════════════
   Playable Instrument 光奏盘
   Web Audio 手盘合成器 · 环形音垫 · 涟漪粒子场
   Zero-build Vanilla JS · maintainer: EDEN
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // === 配置常量 ===
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const KEY_MAP = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];

  const SCALES = [
    { id: 'penta', label: '五声宫调', intervals: [0, 2, 4, 7, 9, 12, 14, 16], root: 48 },
    { id: 'dorian', label: '多利亚', intervals: [0, 2, 3, 5, 7, 9, 10, 12], root: 50 },
    { id: 'lydian', label: '利底亚', intervals: [0, 2, 4, 6, 7, 9, 11, 12], root: 53 },
    { id: 'ryo', label: '日本律音阶', intervals: [0, 2, 3, 7, 8, 12, 14, 15], root: 45 }
  ];

  const TIMBRES = [
    { id: 'sine', label: 'SINE 纯音', wave: 'sine', partials: [1, 2.01], gains: [0.85, 0.1] },
    { id: 'triangle', label: 'TRI 暖光', wave: 'triangle', partials: [1, 2], gains: [0.7, 0.2] },
    { id: 'saw-glass', label: 'GLASS 晶振', wave: 'sawtooth', partials: [1, 1.5], gains: [0.35, 0.3] },
    { id: 'square-air', label: 'AIR 气鸣', wave: 'square', partials: [1, 3], gains: [0.22, 0.12] }
  ];

  const PALETTES = [
    { id: 'nebula', label: '星云', swatch: '#8b6cf7' },
    { id: 'ember', label: '余烬', swatch: '#ff7a45' },
    { id: 'verdi', label: '苔绿', swatch: '#3fd9a4' },
    { id: 'abyss', label: '深海', swatch: '#4f9cf9' }
  ];

  // === DOM Elements ===
  const padRing = document.getElementById('padRing');
  const coreEl = document.getElementById('resonanceCore');
  const coreNote = document.getElementById('coreNote');
  const coreRings = document.querySelectorAll('.core-ring');
  const fxCanvas = document.getElementById('fxCanvas');
  const noteCountChip = document.getElementById('noteCountChip');
  const lastNoteChip = document.getElementById('lastNoteChip');
  const scaleGroup = document.getElementById('scaleGroup');
  const timbreGroup = document.getElementById('timbreGroup');
  const paletteGroup = document.getElementById('paletteGroup');
  const echoRange = document.getElementById('echoRange');
  const echoReadout = document.getElementById('echoReadout');

  // === 状态 ===
  const state = {
    scaleIndex: 0,
    timbreIndex: 0,
    echoMix: 0.38,
    strikes: 0,
    frequencies: []
  };

  // ═══════════════════════════════════════════
  // === 音频引擎 (Web Audio) ===
  // ═══════════════════════════════════════════
  let audioCtx = null;
  let masterGain = null;
  let delayNode = null;
  let delayFeedback = null;
  let delayWet = null;

  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;

    // 回声链路: dry ─┬→ master
    //                └→ delay → wet → master, delay → feedback → delay
    delayNode = audioCtx.createDelay(2.0);
    delayNode.delayTime.value = 0.34;
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = 0.42;
    delayWet = audioCtx.createGain();
    delayWet.gain.value = state.echoMix;

    const delayFilter = audioCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2600;

    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWet);
    delayWet.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function strikeNote(freq, velocity) {
    ensureAudio();
    const timbre = TIMBRES[state.timbreIndex];
    const now = audioCtx.currentTime;

    const noteGain = audioCtx.createGain();
    const attack = 0.012;
    const peak = 0.32 * velocity;
    const decay = 2.4;

    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(peak, now + attack);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

    noteGain.connect(masterGain);
    noteGain.connect(delayNode);

    timbre.partials.forEach((ratio, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = timbre.wave;
      osc.frequency.value = freq * ratio;
      const oscGain = audioCtx.createGain();
      oscGain.gain.value = timbre.gains[i];
      osc.connect(oscGain);
      oscGain.connect(noteGain);
      osc.start(now);
      osc.stop(now + attack + decay + 0.1);
    });
  }

  // ═══════════════════════════════════════════
  // === 音垫渲染 ===
  // ═══════════════════════════════════════════
  function noteLabel(midi) {
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  function buildFrequencies() {
    const scale = SCALES[state.scaleIndex];
    state.frequencies = scale.intervals.map((iv) => midiToFreq(scale.root + iv));
  }

  function buildPads() {
    padRing.innerHTML = '';
    const n = state.frequencies.length;
    const ringRadius = 33.5; // 百分比

    for (let i = 0; i < n; i++) {
      const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * ringRadius;

      const midi = SCALES[state.scaleIndex].root + SCALES[state.scaleIndex].intervals[i];
      const pad = document.createElement('button');
      pad.className = 'pad';
      pad.type = 'button';
      pad.dataset.index = i;
      pad.style.setProperty('--tx', x + '%');
      pad.style.setProperty('--ty', y + '%');
      pad.style.transform = `translate(calc(-50% + ${x}%), calc(-50% + ${y}%))`;
      pad.innerHTML = `
        <span class="pad-key">${KEY_MAP[i] ? KEY_MAP[i].toUpperCase() : '·'}</span>
        <span class="pad-note">${noteLabel(midi)}</span>
        <span class="pad-freq">${Math.round(state.frequencies[i])} Hz</span>
      `;

      pad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        playPad(i, 1);
      });

      padRing.appendChild(pad);
    }
  }

  function playPad(index, velocity) {
    const freq = state.frequencies[index];
    if (!freq) return;
    strikeNote(freq, velocity);

    // 击中视觉反馈
    const pad = padRing.children[index];
    if (pad) {
      pad.classList.remove('struck');
      void pad.offsetWidth; // 重启动画
      pad.classList.add('struck');
      setTimeout(() => pad.classList.remove('struck'), 420);
    }

    // 共鸣腔脉冲
    const midi = SCALES[state.scaleIndex].root + SCALES[state.scaleIndex].intervals[index];
    coreNote.textContent = noteLabel(midi);
    coreNote.classList.remove('bloom');
    void coreNote.offsetWidth;
    coreNote.classList.add('bloom');
    setTimeout(() => coreNote.classList.remove('bloom'), 450);
    coreRings.forEach((ring) => {
      ring.classList.remove('pulse');
      void ring.offsetWidth;
      ring.classList.add('pulse');
    });

    // 粒子与涟漪
    const rect = fxCanvas.getBoundingClientRect();
    const shellRect = fxCanvas.getBoundingClientRect();
    const padRect = pad ? pad.getBoundingClientRect() : shellRect;
    const px = ((padRect.left + padRect.width / 2 - shellRect.left) / shellRect.width) * fxCanvas.width;
    const py = ((padRect.top + padRect.height / 2 - shellRect.top) / shellRect.height) * fxCanvas.height;
    emitRipple(px, py);
    emitBurst(px, py);

    // HUD
    state.strikes++;
    noteCountChip.textContent = 'STRIKES ' + String(state.strikes).padStart(3, '0');
    lastNoteChip.textContent = 'LAST ' + noteLabel(midi) + ' · ' + Math.round(freq) + 'Hz';
    lastNoteChip.classList.add('tick');
    setTimeout(() => lastNoteChip.classList.remove('tick'), 500);

    document.body.classList.add('is-playing');
    clearTimeout(playPad._bgTimer);
    playPad._bgTimer = setTimeout(() => document.body.classList.remove('is-playing'), 1600);
  }

  // ═══════════════════════════════════════════
  // === 视觉粒子场 (Canvas) ===
  // ═══════════════════════════════════════════
  const ctx = fxCanvas.getContext('2d');
  const ripples = [];
  const sparks = [];

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = fxCanvas.getBoundingClientRect();
    fxCanvas.width = rect.width * dpr;
    fxCanvas.height = rect.height * dpr;
  }

  function emitRipple(x, y) {
    ripples.push({ x, y, r: 10, alpha: 0.8 });
  }

  function emitBurst(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.6;
      sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        size: 1.2 + Math.random() * 2.4
      });
    }
  }

  function currentHue() {
    const palette = PALETTES.find((p) => p.id === document.body.dataset.palette);
    return { nebula: 265, ember: 20, verdi: 160, abyss: 215 }[palette.id] || 265;
  }

  function tick() {
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    const hue = currentHue();

    // 涟漪
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += (fxCanvas.width * 0.008);
      rp.alpha *= 0.94;
      if (rp.alpha < 0.02) { ripples.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 90%, 72%, ${rp.alpha})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // 迸射粒子
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.x += sp.vx; sp.y += sp.vy;
      sp.vx *= 0.96; sp.vy *= 0.96;
      sp.life -= sp.decay;
      if (sp.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 95%, ${65 + sp.life * 20}%, ${sp.life})`;
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════
  // === 控制台 UI ===
  // ═══════════════════════════════════════════
  function buildSegment(group, items, activeIndex, onPick, renderBtn) {
    group.innerHTML = '';
    items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.className = 'seg-btn' + (item.id ? ' ' + item.id + '-btn' : '') + (i === activeIndex ? ' active' : '');
      btn.type = 'button';
      renderBtn(btn, item);
      btn.addEventListener('click', () => {
        group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onPick(i, item);
      });
      group.appendChild(btn);
    });
  }

  function buildConsole() {
    buildSegment(scaleGroup, SCALES, state.scaleIndex, (i) => {
      state.scaleIndex = i;
      buildFrequencies();
      buildPads();
    }, (btn, item) => { btn.innerHTML = item.label; });

    buildSegment(timbreGroup, TIMBRES, state.timbreIndex, (i) => {
      state.timbreIndex = i;
    }, (btn, item) => { btn.innerHTML = item.label; });

    buildSegment(paletteGroup, PALETTES, 0, (i, item) => {
      document.body.dataset.palette = item.id;
    }, (btn, item) => {
      btn.innerHTML = `<span class="swatch" style="background:${item.swatch}"></span>${item.label}`;
    });
  }

  function bindEchoControl() {
    const update = () => {
      const v = Number(echoRange.value);
      state.echoMix = v / 100;
      echoReadout.textContent = v + '%';
      echoRange.style.setProperty('--fill', v + '%');
      if (delayWet) {
        delayWet.gain.setTargetAtTime(state.echoMix * 0.7, audioCtx.currentTime, 0.05);
      }
    };
    echoRange.addEventListener('input', update);
    update();
  }

  // ═══════════════════════════════════════════
  // === 键盘演奏 ===
  // ═══════════════════════════════════════════
  function bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();

      const padIdx = KEY_MAP.indexOf(key);
      if (padIdx >= 0) {
        playPad(padIdx, 1);
        return;
      }
      if (key === ' ') {
        e.preventDefault();
        playPad(Math.floor(Math.random() * state.frequencies.length), 0.9);
      }
      if (key === 'r') {
        ripples.length = 0;
        sparks.length = 0;
        state.strikes = 0;
        noteCountChip.textContent = 'STRIKES 000';
        lastNoteChip.textContent = 'LAST —';
      }
    });
  }

  // ═══════════════════════════════════════════
  // === 共鸣腔交互（点击 = 随机琶音） ===
  // ═══════════════════════════════════════════
  function bindCore() {
    coreEl.addEventListener('pointerdown', () => {
      const seq = [0, 2, 4, Math.min(5, state.frequencies.length - 1), 2, 0];
      seq.forEach((idx, step) => {
        setTimeout(() => playPad(idx, 0.75), step * 130);
      });
    });
  }

  // ═══════════════════════════════════════════
  // === 启动序列 ===
  // ═══════════════════════════════════════════
  function init() {
    buildFrequencies();
    buildPads();
    buildConsole();
    bindEchoControl();
    bindKeyboard();
    bindCore();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    requestAnimationFrame(tick);

    // 首次任意交互解锁音频上下文
    const unlock = () => { ensureAudio(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
  }

  init();
})();
