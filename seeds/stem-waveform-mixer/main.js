/* ═══════════════════════════════════════════════════════════════
   Stem Waveform Mixer · 分轨波形混音台
   Web Audio 实时合成六大分轨 + 活体波形 + 电平表 + 混音总线
   maintainer: EDEN
   ═══════════════════════════════════════════════════════════════ */
'use strict';

// === 分轨定义 (Stem Definitions) =========================================

const STEMS = [
  { id: 'kick',  name: 'Kick',  sub: 'SUB · 低频脉冲',  colorVar: '--s1' },
  { id: 'snare', name: 'Snare', sub: 'MID · 军鼓击打',  colorVar: '--s2' },
  { id: 'hat',   name: 'Hats',  sub: 'AIR · 高频切片',  colorVar: '--s3' },
  { id: 'bass',  name: 'Bass',  sub: 'LOW · 贝斯线条',  colorVar: '--s4' },
  { id: 'synth', name: 'Synth', sub: 'LEAD · 琶音主音', colorVar: '--s5' },
  { id: 'pad',   name: 'Pad',   sub: 'WASH · 和声垫音', colorVar: '--s6' }
];

const STEPS = 16;
const BASE_A1 = 33; // MIDI A1

// 16 步音序型（null = 休止）
const PATTERNS = {
  kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  hat:   [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2], // 2 = 重音
  bass:  [0, null, 0, null, 3, null, 0, null, 0, null, 5, null, 3, null, 7, 10],
  synth: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 10, 14, 12, 10, 7]
};

// 和声进行：Am7 → Fmaj7（每小节触发）
const PAD_CHORDS = [
  [45, 48, 52, 55],
  [41, 45, 48, 52]
];

// === 状态 (State) =========================================================

const state = {
  playing: false,
  bpm: 112,
  masterVol: 0.82,
  uiStep: -1,
  lastBeatStep: -1,
  bar: 0,
  pokes: new Map() // canvas -> [{x, y, t}]
};

const stemState = new Map(); // id -> { volume, mute, solo, meter, analyser, gain, bus, color, canvas, ctx2d }

// === 音频引擎 (Audio Engine) ==============================================

const AudioEngine = {
  ctx: null,
  master: null,
  masterAnalyser: null,
  synthDelay: null,
  noiseBuffer: null,

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    // 主链路: master -> compressor -> analyser -> destination
    this.master = this.ctx.createGain();
    this.master.gain.value = state.masterVol;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.24;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.72;

    this.master.connect(comp);
    comp.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // 白噪声缓冲（军鼓 / 踩镲共用）
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // 每轨总线: bus(voices) -> analyser -> gain(音量/静音) -> master
    for (const stem of STEMS) {
      const bus = this.ctx.createGain();
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.8;

      bus.connect(analyser);
      analyser.connect(gain);
      gain.connect(this.master);

      const s = stemState.get(stem.id);
      s.bus = bus;
      s.analyser = analyser;
      s.gain = gain;
    }

    // Synth 轨附一条附点八分延迟反馈回路
    const synthStem = stemState.get('synth');
    if (synthStem) {
      const send = this.ctx.createGain();
      send.gain.value = 0.5;
      const delay = this.ctx.createDelay(2);
      delay.delayTime.value = 0.32;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.34;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.3;
      synthStem.bus.connect(send);
      send.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(synthStem.bus);
      this.synthDelay = delay;
    }

    return this.ctx;
  },

  midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  },

  applyStemGain(stemId) {
    const s = stemState.get(stemId);
    if (!s || !s.gain) return;
    const anySolo = STEMS.some(st => stemState.get(st.id).solo);
    const audible = anySolo ? s.solo : !s.mute;
    const target = audible ? s.volume : 0;
    s.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    s.off = !audible;
  },

  applyMasterVol() {
    if (this.master) {
      this.master.gain.setTargetAtTime(state.masterVol, this.ctx.currentTime, 0.05);
    }
  },

  // ── 声部合成 (Voice Synthesis) ──

  kick(t) {
    const s = stemState.get('kick');
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(g); g.connect(s.bus);
    osc.start(t); osc.stop(t + 0.42);
  },

  snare(t) {
    const s = stemState.get('snare');
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    src.connect(bp); bp.connect(g); g.connect(s.bus);
    src.start(t); src.stop(t + 0.22);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = 192;
    og.gain.setValueAtTime(0.3, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(og); og.connect(s.bus);
    osc.start(t); osc.stop(t + 0.12);
  },

  hat(t, accent) {
    const s = stemState.get('hat');
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.6;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7200;
    const g = this.ctx.createGain();
    const peak = accent === 2 ? 0.3 : 0.16;
    const dur = accent === 2 ? 0.09 : 0.045;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp); hp.connect(g); g.connect(s.bus);
    src.start(t); src.stop(t + dur + 0.02);
  },

  bass(t, offset) {
    const s = stemState.get('bass');
    const stepDur = 60 / state.bpm / 4;
    const osc = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = this.midiToFreq(BASE_A1 + offset);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520, t);
    lp.frequency.exponentialRampToValueAtTime(160, t + stepDur * 0.9);
    lp.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.92);
    osc.connect(lp); lp.connect(g); g.connect(s.bus);
    osc.start(t); osc.stop(t + stepDur);
  },

  synth(t, offset) {
    const s = stemState.get('synth');
    const stepDur = 60 / state.bpm / 4;
    const osc = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = this.midiToFreq(57 + offset); // A3 起
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.17, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(lp); lp.connect(g); g.connect(s.bus);
    osc.start(t); osc.stop(t + 0.24);
  },

  pad(t, chord) {
    const s = stemState.get('pad');
    const barDur = (60 / state.bpm / 4) * STEPS;
    for (const midi of chord) {
      for (const detune of [-7, 7]) {
        const osc = this.ctx.createOscillator();
        const lp = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = this.midiToFreq(midi);
        osc.detune.value = detune;
        lp.type = 'lowpass';
        lp.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045, t + barDur * 0.35);
        g.gain.linearRampToValueAtTime(0.0001, t + barDur * 1.02);
        osc.connect(lp); lp.connect(g); g.connect(s.bus);
        osc.start(t); osc.stop(t + barDur * 1.05);
      }
    }
  }
};

// === 音序器 (Lookahead Sequencer) =========================================

const Sequencer = {
  timer: null,
  nextNoteTime: 0,
  currentStep: 0,
  drawQueue: [],

  start() {
    AudioEngine.ensure();
    if (AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();
    this.nextNoteTime = AudioEngine.ctx.currentTime + 0.06;
    this.currentStep = 0;
    this.timer = setInterval(() => this.scheduler(), 25);
    state.playing = true;
  },

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.drawQueue.length = 0;
    state.playing = false;
    state.uiStep = -1;
  },

  scheduler() {
    const ctx = AudioEngine.ctx;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.drawQueue.push({ step: this.currentStep, time: this.nextNoteTime });
      this.nextNoteTime += 60 / state.bpm / 4;
      this.currentStep = (this.currentStep + 1) % STEPS;
    }
  },

  scheduleStep(step, t) {
    if (PATTERNS.kick[step]) AudioEngine.kick(t);
    if (PATTERNS.snare[step]) AudioEngine.snare(t);
    const hatVel = PATTERNS.hat[step];
    if (hatVel) AudioEngine.hat(t, hatVel);
    const bassNote = PATTERNS.bass[step];
    if (bassNote !== null && bassNote !== undefined) AudioEngine.bass(t, bassNote);
    AudioEngine.synth(t, PATTERNS.synth[step]);
    if (step === 0) {
      AudioEngine.pad(t, PAD_CHORDS[state.bar % PAD_CHORDS.length]);
      state.bar++;
    }
  }
};

// === 渲染器 (Waveform Renderer) ===========================================

const Renderer = {
  masterCanvas: null,
  masterCtx: null,
  timeData: null,
  masterData: null,
  colors: {},

  cacheColors() {
    const cs = getComputedStyle(document.documentElement);
    this.colors = {
      accent: cs.getPropertyValue('--accent').trim(),
      ink: cs.getPropertyValue('--ink').trim(),
      inkDim: cs.getPropertyValue('--ink-dim').trim()
    };
    for (const stem of STEMS) {
      const s = stemState.get(stem.id);
      s.color = getComputedStyle(s.canvasEl).getPropertyValue(stem.colorVar).trim() || this.colors.accent;
    }
  },

  sizeCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  },

  rms(analyser, buf) {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  },

  drawPokes(ctx, pokes, w, h) {
    const now = performance.now();
    for (let i = pokes.length - 1; i >= 0; i--) {
      const age = (now - pokes[i].t) / 900;
      if (age >= 1) { pokes.splice(i, 1); continue; }
      const r = age * Math.max(w, h) * 0.55;
      ctx.globalAlpha = (1 - age) * 0.6;
      ctx.strokeStyle = this.colors.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pokes[i].x, pokes[i].y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  // 待机时的呼吸假波形
  idleWave(x, w, t, seed) {
    return (
      Math.sin((x / w) * Math.PI * 6 + t * 0.0011 + seed) * 0.16 +
      Math.sin((x / w) * Math.PI * 13 - t * 0.0007 + seed * 2) * 0.07
    );
  },

  frame(t) {
    // 1) 主总线波形
    const mw = this.masterCanvas.clientWidth;
    const mh = this.masterCanvas.clientHeight;
    const mc = this.sizeCanvas(this.masterCanvas);
    mc.clearRect(0, 0, mw, mh);
    const mid = mh * 0.46;
    const waveH = mh * 0.4;

    mc.save();
    mc.beginPath();
    if (state.playing && AudioEngine.masterAnalyser) {
      const buf = this.masterData;
      AudioEngine.masterAnalyser.getByteTimeDomainData(buf);
      const n = buf.length;
      for (let x = 0; x <= mw; x++) {
        const v = (buf[Math.floor((x / mw) * (n - 1))] - 128) / 128;
        const y = mid + v * waveH;
        x === 0 ? mc.moveTo(x, y) : mc.lineTo(x, y);
      }
    } else {
      for (let x = 0; x <= mw; x++) {
        const y = mid + this.idleWave(x, mw, t, 0) * waveH;
        x === 0 ? mc.moveTo(x, y) : mc.lineTo(x, y);
      }
    }
    mc.strokeStyle = this.colors.accent;
    mc.lineWidth = 2;
    mc.shadowColor = this.colors.accent;
    mc.shadowBlur = 14;
    mc.stroke();

    // 镜像填充
    const grad = mc.createLinearGradient(0, mid - waveH, 0, mid + waveH);
    grad.addColorStop(0, 'rgba(255,255,255,0.01)');
    grad.addColorStop(0.5, this.hexA(this.colors.accent, 0.16));
    grad.addColorStop(1, 'rgba(255,255,255,0.01)');
    mc.lineTo(mw, mid); mc.lineTo(0, mid); mc.closePath();
    mc.fillStyle = grad;
    mc.shadowBlur = 0;
    mc.fill();
    mc.restore();

    // 2) 步进指示轨
    const railY = mh - 10;
    const pad = 14;
    const gap = (mw - pad * 2) / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const cx = pad + gap * i + gap / 2;
      const active = i === state.uiStep;
      mc.beginPath();
      mc.arc(cx, railY, active ? 4 : 2, 0, Math.PI * 2);
      mc.fillStyle = active ? this.colors.accent : 'rgba(255,255,255,0.16)';
      if (active) { mc.shadowColor = this.colors.accent; mc.shadowBlur = 10; }
      mc.fill();
      mc.shadowBlur = 0;
    }

    // 3) 主总线涟漪
    this.drawPokes(mc, state.pokes.get(this.masterCanvas) || [], mw, mh);

    // 4) 分轨波形 + 电平表
    for (const stem of STEMS) {
      const s = stemState.get(stem.id);
      const w = s.canvasEl.clientWidth;
      const h = s.canvasEl.clientHeight;
      const ctx = this.sizeCanvas(s.canvasEl);
      ctx.clearRect(0, 0, w, h);
      const cmid = h / 2;

      let amp = 0;
      if (state.playing && s.analyser) {
        const buf = this.timeData;
        s.analyser.getByteTimeDomainData(buf);
        const n = buf.length;
        ctx.beginPath();
        for (let x = 0; x <= w; x++) {
          const v = (buf[Math.floor((x / w) * (n - 1))] - 128) / 128;
          amp = Math.max(amp, Math.abs(v));
          const y = cmid + v * (h * 0.44);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
      } else {
        ctx.beginPath();
        for (let x = 0; x <= w; x++) {
          const y = cmid + this.idleWave(x, w, t, stem.id.length + s.seed) * (h * 0.44);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = s.off ? 'rgba(255,255,255,0.14)' : s.color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = s.off ? 0 : 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      this.drawPokes(ctx, state.pokes.get(s.canvasEl) || [], w, h);

      // 电平表平滑衰减
      const level = state.playing ? Math.min(1, amp * 1.6) : 0.04;
      s.meterVal = Math.max(level, (s.meterVal || 0) * 0.9);
      s.meterFillEl.style.height = (s.meterVal * 100).toFixed(1) + '%';
    }

    // 5) 主输出表 + 读数
    let mLevel = 0.02;
    if (state.playing && AudioEngine.masterAnalyser) {
      mLevel = Math.min(1, this.rms(AudioEngine.masterAnalyser, this.masterData) * 2.4);
    }
    this.meterL = Math.max(mLevel, (this.meterL || 0) * 0.88);
    this.meterR = Math.max(mLevel * (0.94 + Math.sin(t * 0.002) * 0.05), (this.meterR || 0) * 0.88);
    this.outL.style.height = (this.meterL * 100).toFixed(1) + '%';
    this.outR.style.height = (this.meterR * 100).toFixed(1) + '%';

    const db = this.meterL > 0.021 ? (20 * Math.log10(this.meterL)).toFixed(1) + ' dBFS' : '— dBFS';
    this.readout.textContent = db + ' · ' + (state.playing ? 'LIVE' : 'STANDBY');

    requestAnimationFrame((ts) => this.frame(ts));
  },

  hexA(hex, a) {
    const h = hex.replace('#', '').trim();
    if (h.length !== 6) return `rgba(255,255,255,${a})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
};

// === UI 构建 (Channel Strip Builder) ======================================

function buildChannels() {
  const grid = document.getElementById('stems-grid');
  STEMS.forEach((stem, i) => {
    const s = {
      volume: 0.8,
      mute: false,
      solo: false,
      off: false,
      meterVal: 0,
      seed: i * 1.7
    };
    stemState.set(stem.id, s);

    const card = document.createElement('article');
    card.className = 'channel glass';
    card.style.setProperty('--ch-color', `var(${stem.colorVar})`);
    card.style.animationDelay = (0.12 + i * 0.06) + 's';
    card.innerHTML = `
      <div class="ch-head">
        <span class="ch-name">${stem.name}</span>
        <span class="ch-sub">${stem.sub}</span>
      </div>
      <div class="ch-wave-wrap">
        <canvas class="ch-canvas" aria-label="${stem.name} 波形"></canvas>
        <div class="ch-meter"><div class="ch-meter-fill"></div></div>
      </div>
      <div class="ch-controls">
        <div class="ms-group">
          <button class="ms-btn" data-act="mute" title="静音">M</button>
          <button class="ms-btn" data-act="solo" title="独奏">S</button>
        </div>
        <input class="ch-slider" type="range" min="0" max="100" value="80" aria-label="${stem.name} 音量">
      </div>
    `;
    grid.appendChild(card);

    s.el = card;
    s.canvasEl = card.querySelector('.ch-canvas');
    s.meterFillEl = card.querySelector('.ch-meter-fill');

    // 音量推子
    card.querySelector('.ch-slider').addEventListener('input', (e) => {
      s.volume = e.target.value / 100;
      if (AudioEngine.ctx) AudioEngine.applyStemGain(stem.id);
    });

    // M / S 按钮
    card.querySelectorAll('.ms-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'mute') {
          s.mute = !s.mute;
          btn.classList.toggle('m-on', s.mute);
        } else {
          s.solo = !s.solo;
          btn.classList.toggle('s-on', s.solo);
        }
        refreshAudibility();
      });
    });

    // 点击波形发射涟漪
    s.canvasEl.addEventListener('pointerdown', (e) => {
      const rect = s.canvasEl.getBoundingClientRect();
      addPoke(s.canvasEl, e.clientX - rect.left, e.clientY - rect.top);
    });
  });
}

function refreshAudibility() {
  const anySolo = STEMS.some(st => stemState.get(st.id).solo);
  for (const stem of STEMS) {
    const s = stemState.get(stem.id);
    if (AudioEngine.ctx) AudioEngine.applyStemGain(stem.id);
    const audible = anySolo ? s.solo : !s.mute;
    s.off = !audible;
    s.el.classList.toggle('is-off', !audible);
    s.el.classList.toggle('soloing', s.solo && anySolo);
  }
}

function addPoke(canvas, x, y) {
  if (!state.pokes.has(canvas)) state.pokes.set(canvas, []);
  state.pokes.get(canvas).push({ x, y, t: performance.now() });
}

// === 走带与主题 (Transport & Theme) =======================================

function bindTransport() {
  const playBtn = document.getElementById('play-btn');
  playBtn.addEventListener('click', () => {
    if (state.playing) {
      Sequencer.stop();
    } else {
      Sequencer.start();
    }
    playBtn.classList.toggle('playing', state.playing);
    playBtn.querySelector('.play-label').textContent = state.playing ? 'STOP' : 'PLAY';
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !/INPUT|BUTTON/.test(document.activeElement.tagName)) {
      e.preventDefault();
      playBtn.click();
    }
  });

  const bpmSlider = document.getElementById('bpm-slider');
  const bpmNum = document.getElementById('bpm-num');
  bpmSlider.addEventListener('input', (e) => {
    state.bpm = +e.target.value;
    bpmNum.textContent = state.bpm;
    if (AudioEngine.synthDelay) {
      AudioEngine.synthDelay.delayTime.setTargetAtTime(
        (60 / state.bpm / 4) * 3, AudioEngine.ctx.currentTime, 0.1
      );
    }
  });

  const masterVol = document.getElementById('master-vol');
  const masterVolNum = document.getElementById('master-vol-num');
  masterVol.addEventListener('input', (e) => {
    state.masterVol = e.target.value / 100;
    masterVolNum.textContent = e.target.value;
    AudioEngine.applyMasterVol();
  });
}

function bindThemes() {
  document.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.documentElement.dataset.theme = btn.dataset.setTheme;
      setTimeout(() => Renderer.cacheColors(), 60);
    });
  });
}

function bindStepPulse() {
  // 由 drawQueue 驱动 UI 步进指示与播放按钮节拍脉冲
  const playBtn = document.getElementById('play-btn');
  function tick() {
    if (state.playing && AudioEngine.ctx) {
      const now = AudioEngine.ctx.currentTime;
      while (Sequencer.drawQueue.length && Sequencer.drawQueue[0].time <= now) {
        const { step } = Sequencer.drawQueue.shift();
        state.uiStep = step;
        if (step % 4 === 0 && step !== state.lastBeatStep) {
          state.lastBeatStep = step;
          playBtn.classList.remove('beat');
          void playBtn.offsetWidth; // 重置动画
          playBtn.classList.add('beat');
        }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// === 初始化 (Init) ========================================================

function init() {
  buildChannels();

  Renderer.masterCanvas = document.getElementById('master-canvas');
  Renderer.masterCtx = Renderer.masterCanvas;
  Renderer.outL = document.getElementById('out-fill-l');
  Renderer.outR = document.getElementById('out-fill-r');
  Renderer.readout = document.getElementById('master-readout');
  Renderer.timeData = new Uint8Array(1024);
  Renderer.masterData = new Uint8Array(2048);

  Renderer.masterCanvas.addEventListener('pointerdown', (e) => {
    const rect = Renderer.masterCanvas.getBoundingClientRect();
    addPoke(Renderer.masterCanvas, e.clientX - rect.left, e.clientY - rect.top);
  });

  bindTransport();
  bindThemes();
  bindStepPulse();
  Renderer.cacheColors();
  requestAnimationFrame((t) => Renderer.frame(t));

  window.addEventListener('resize', () => Renderer.cacheColors());
}

document.addEventListener('DOMContentLoaded', init);
