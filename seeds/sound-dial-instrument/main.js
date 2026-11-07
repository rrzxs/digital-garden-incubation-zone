/* ==========================================================================
 * Sound Dial Instrument — 声波刻度盘
 * 沉浸式声音刻度盘乐器：主盘选音高，子盘塑音色
 * Vanilla JS · Web Audio · 弹簧-阻尼刻度物理 · 粒子流场
 * ========================================================================== */

(function () {
  'use strict';

  // === 常量与工具 =====================================================

  const TAU = Math.PI * 2;
  const EASE = { outExpo: (t) => 1 - Math.pow(2, -10 * t) };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const THEMES = ['default', 'aurora', 'ember', 'frost'];
  const THEME_LABEL = { default: '星云紫', aurora: '极光绿', ember: '熔岩橙', frost: '霜蓝' };

  // 音阶（半音偏移，相对根音 A）
  const SCALES = {
    pentatonic: { name: '五声音阶', steps: [0, 2, 4, 7, 9] },
    dorian: { name: '多利亚调式', steps: [0, 2, 3, 5, 7, 9, 10] },
    lydian: { name: '利底亚调式', steps: [0, 2, 4, 6, 7, 9, 11] },
    japanese: { name: '和风音阶', steps: [0, 1, 5, 7, 8] }
  };

  const NOTE_NAMES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
  const MAIN_STEPS = 13; // 主盘可覆盖约 2 个八度以上的离散档位

  // === DOM Elements ===================================================

  const bgCanvas = document.getElementById('flow-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const rippleLayer = document.getElementById('ripple-layer');
  const themeBtn = document.getElementById('theme-btn');
  const statusText = document.getElementById('status-text');
  const statusScale = document.getElementById('status-scale');
  const hintLabel = document.getElementById('hint-label');
  const mainEl = document.getElementById('dial-main');
  const mainNoteEl = document.getElementById('main-note');
  const mainFreqEl = document.getElementById('main-freq');

  // === 全局状态 =======================================================

  const state = {
    themeIndex: 0,
    scaleKey: 'pentatonic',
    droneOn: false,
    arpeggioOn: false,
    arpeggioTimer: null,
    noteCount: 0
  };

  // === 音频引擎（Web Audio） ==========================================

  const AudioEngine = {
    ctx: null,
    master: null,
    filter: null,
    delay: null,
    feedback: null,
    drive: null,
    droneOsc: null,
    droneGain: null,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;

      // 驱动（waveshaper 轻饱和）
      this.drive = this.ctx.createWaveShaper();
      this.setDrive(DialDrive.value);

      // 低通滤波
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.Q.value = 4;
      this.setCutoff(DialTone.value);

      // 延迟回声
      this.delay = this.ctx.createDelay(2.0);
      this.delay.delayTime.value = 0.34;
      this.feedback = this.ctx.createGain();
      this.setFeedback(DialEcho.value);

      // 链路: filter -> drive -> delay 分路 -> master
      this.filter.connect(this.drive);
      this.drive.connect(this.master);
      this.drive.connect(this.delay);
      this.delay.connect(this.feedback);
      this.feedback.connect(this.delay);
      this.delay.connect(this.master);
      this.master.connect(this.ctx.destination);
      return this.ctx;
    },

    setCutoff(norm) {
      if (!this.filter) return;
      const f = lerp(180, 6400, norm * norm);
      this.filter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.04);
    },

    setFeedback(norm) {
      if (!this.feedback) return;
      this.feedback.gain.setTargetAtTime(norm * 0.72, this.ctx.currentTime, 0.05);
    },

    setDrive(norm) {
      if (!this.drive) return;
      const k = norm * 24;
      const n = 256;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      this.drive.curve = curve;
    },

    /** 弹拨一个音符 */
    pluck(freq, when = 0) {
      this.ensure();
      const t = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      sub.type = 'sine';
      osc.frequency.value = freq;
      sub.frequency.value = freq / 2;

      const subGain = this.ctx.createGain();
      subGain.gain.value = 0.35;

      const peak = 0.28 * lerp(0.6, 1.1, DialSpace.value);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + lerp(0.7, 2.6, DialSpace.value));

      osc.connect(gain);
      sub.connect(subGain);
      subGain.connect(gain);
      gain.connect(this.filter);

      osc.start(t); sub.start(t);
      osc.stop(t + 3); sub.stop(t + 3);
    },

    /** 持续音（drone） */
    startDrone(freq) {
      this.ensure();
      if (this.droneOsc) {
        this.droneOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.15);
        return;
      }
      this.droneOsc = this.ctx.createOscillator();
      this.droneGain = this.ctx.createGain();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.value = freq;
      this.droneGain.gain.value = 0.0001;
      this.droneGain.gain.setTargetAtTime(0.07, this.ctx.currentTime, 0.8);
      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.filter);
      this.droneOsc.start();
    },

    stopDrone() {
      if (!this.droneOsc) return;
      const osc = this.droneOsc;
      this.droneGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
      setTimeout(() => osc.stop(), 1500);
      this.droneOsc = null;
      this.droneGain = null;
    }
  };

  // === 刻度盘模型（弹簧-阻尼物理） ====================================

  class Dial {
    /**
     * @param {HTMLElement} el 容器
     * @param {object} opts { ticks, arc, onInput, onCommit, format }
     */
    constructor(el, opts) {
      this.el = el;
      this.canvas = el.querySelector('.dial-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.ticks = opts.ticks || 48;
      this.startAngle = opts.startAngle !== undefined ? opts.startAngle : Math.PI * 0.75;
      this.endAngle = opts.endAngle !== undefined ? opts.endAngle : Math.PI * 2.25;
      this.format = opts.format || ((v) => Math.round(v * 100));
      this.onInput = opts.onInput || null;
      this.onCommit = opts.onCommit || null;

      this.value = opts.value !== undefined ? opts.value : 0.5;
      this.target = this.value;
      // 弹簧-阻尼
      this.vel = 0;
      this.stiffness = opts.stiffness || 170;
      this.damping = opts.damping || 16;
      this.glowPulse = 0;

      this.valueEl = el.querySelector('[data-value]');
      this.bindPointer();
    }

    bindPointer() {
      let dragging = false;
      let startPointerAngle = 0;
      let startValue = 0;

      const angleOf = (e) => {
        const r = this.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return Math.atan2(e.clientY - cy, e.clientX - cx);
      };

      const onDown = (e) => {
        dragging = true;
        startPointerAngle = angleOf(e);
        startValue = this.target;
        this.el.setPointerCapture(e.pointerId);
        AudioEngine.ensure();
        e.preventDefault();
      };

      const onMove = (e) => {
        if (!dragging) return;
        let a = angleOf(e) - startPointerAngle;
        if (a > Math.PI) a -= TAU;
        if (a < -Math.PI) a += TAU;
        const sweep = this.endAngle - this.startAngle;
        this.set(clamp(startValue + a / sweep, 0, 1), true);
      };

      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        if (this.onCommit) this.onCommit(this.value);
      };

      this.el.addEventListener('pointerdown', onDown);
      this.el.addEventListener('pointermove', onMove);
      this.el.addEventListener('pointerup', onUp);
      this.el.addEventListener('pointercancel', onUp);
    }

    set(v, fromUser) {
      this.target = clamp(v, 0, 1);
      this.glowPulse = 1;
      if (this.onInput) this.onInput(this.target, fromUser === true);
    }

    setValueImmediate(v) {
      this.target = this.value = clamp(v, 0, 1);
      if (this.onInput) this.onInput(this.target, false);
      this.render();
    }

    update(dt) {
      const force = (this.target - this.value) * this.stiffness;
      this.vel += force * dt;
      this.vel *= Math.exp(-this.damping * dt);
      this.value += this.vel * dt;
      if (Math.abs(this.target - this.value) < 0.0004 && Math.abs(this.vel) < 0.0004) {
        this.value = this.target;
        this.vel = 0;
      }
      this.glowPulse *= Math.exp(-3 * dt);
    }

    /** 刻度盘当前指针角 */
    angle() {
      return lerp(this.startAngle, this.endAngle, this.value);
    }

    render() {
      const c = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.46;
      const styles = getComputedStyle(document.documentElement);
      const accent = styles.getPropertyValue('--accent').trim() || '#8b7bff';
      const dim = 'rgba(255,255,255,0.14)';
      const bright = 'rgba(255,255,255,0.85)';

      c.clearRect(0, 0, w, h);

      // 外弧轨道
      c.beginPath();
      c.arc(cx, cy, R, this.startAngle, this.endAngle);
      c.strokeStyle = 'rgba(255,255,255,0.07)';
      c.lineWidth = 2;
      c.stroke();

      // 激活弧
      c.beginPath();
      c.arc(cx, cy, R, this.startAngle, this.angle());
      const grad = c.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, 'rgba(255,255,255,0.9)');
      c.strokeStyle = grad;
      c.lineWidth = 3;
      c.shadowColor = accent;
      c.shadowBlur = 10 + this.glowPulse * 22;
      c.stroke();
      c.shadowBlur = 0;

      // 刻度
      const ticks = this.ticks;
      for (let i = 0; i <= ticks; i++) {
        const t = i / ticks;
        const a = lerp(this.startAngle, this.endAngle, t);
        const active = t <= this.value + 0.002;
        const isMajor = i % Math.max(1, Math.round(ticks / 8)) === 0;
        const len = isMajor ? R * 0.11 : R * 0.055;
        const r1 = R * 0.9;
        const r2 = r1 - len;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        if (active) {
          const near = 1 - Math.abs(t - this.value) * 6;
          c.strokeStyle = near > 0 ? accent : bright;
          c.globalAlpha = 0.45 + 0.55 * Math.max(0, near);
          c.lineWidth = isMajor ? 2.2 : 1.4;
        } else {
          c.strokeStyle = dim;
          c.globalAlpha = 1;
          c.lineWidth = isMajor ? 1.6 : 1;
        }
        c.stroke();
        c.globalAlpha = 1;
      }

      // 指针
      const a = this.angle();
      const rOut = R * 0.86;
      const rIn = R * 0.6;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
      c.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
      c.strokeStyle = bright;
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      c.shadowColor = accent;
      c.shadowBlur = 12;
      c.stroke();
      c.shadowBlur = 0;

      // 数值
      if (this.valueEl) this.valueEl.textContent = this.format(this.value);
    }
  }

  // === 音高工具 =======================================================

  function noteFreq(stepIndex) {
    const scale = SCALES[state.scaleKey];
    const steps = scale.steps;
    const octave = Math.floor(stepIndex / steps.length);
    const semi = steps[stepIndex % steps.length] + octave * 12;
    return 220 * Math.pow(2, semi / 12); // 根音 A3
  }

  function noteName(stepIndex) {
    const scale = SCALES[state.scaleKey];
    const steps = scale.steps;
    const octave = Math.floor(stepIndex / steps.length);
    const semi = steps[stepIndex % steps.length];
    const idx = ((semi % 12) + 12) % 12;
    return NOTE_NAMES[idx] + (3 + octave);
  }

  // === 构建刻度盘 =====================================================

  const DialMain = new Dial(mainEl, {
    ticks: MAIN_STEPS,
    value: 5 / MAIN_STEPS,
    stiffness: 220,
    damping: 15,
    format: () => '',
    onInput(v, fromUser) {
      const step = Math.round(v * MAIN_STEPS);
      const freq = noteFreq(step);
      mainNoteEl.textContent = noteName(step);
      mainFreqEl.textContent = freq.toFixed(1) + ' Hz';
      if (state.droneOn) AudioEngine.startDrone(freq);
      if (fromUser) {
        // 离散档位：跨档才弹响
        if (step !== DialMain._lastStep) {
          DialMain._lastStep = step;
          AudioEngine.pluck(freq);
          DialMain.glowPulse = 1;
          flashPlaying();
          state.noteCount++;
        }
      }
    },
    onCommit() {
      rippleFrom(mainEl);
      setStatus(`主音 → ${mainNoteEl.textContent} · ${mainFreqEl.textContent}`);
    }
  });
  DialMain._lastStep = 5;

  const DialTone = new Dial(document.getElementById('dial-tone'), {
    ticks: 32, value: 0.64,
    onInput(v) { AudioEngine.setCutoff(v); },
    onCommit() { setStatus('TONE 滤波音色已更新'); }
  });

  const DialEcho = new Dial(document.getElementById('dial-echo'), {
    ticks: 32, value: 0.35,
    onInput(v) { AudioEngine.setFeedback(v); },
    onCommit() { setStatus('ECHO 回声深度已更新'); }
  });

  const DialDrive = new Dial(document.getElementById('dial-drive'), {
    ticks: 32, value: 0.2,
    onInput(v) { AudioEngine.setDrive(v); },
    onCommit() { setStatus('DRIVE 驱动饱和已更新'); }
  });

  const DialSpace = new Dial(document.getElementById('dial-space'), {
    ticks: 32, value: 0.5,
    onInput(v) { /* 空间感：衰减长度 + 回声电平在 pluck 内读取 */ },
    onCommit() { setStatus('SPACE 空间延展已更新'); }
  });

  const allDials = [DialMain, DialTone, DialEcho, DialDrive, DialSpace];

  // === 播放表现 =======================================================

  let playingTimer = null;
  function flashPlaying() {
    mainEl.classList.add('playing');
    clearTimeout(playingTimer);
    playingTimer = setTimeout(() => mainEl.classList.remove('playing'), 480);
  }

  function playCurrentNote() {
    const step = Math.round(DialMain.value * MAIN_STEPS);
    DialMain._lastStep = step;
    AudioEngine.pluck(noteFreq(step));
    flashPlaying();
    rippleFrom(mainEl);
    state.noteCount++;
    setStatus(`♪ ${noteName(step)} · ${noteFreq(step).toFixed(1)} Hz`);
  }

  function randomize() {
    const scale = SCALES[state.scaleKey];
    const step = Math.floor(Math.random() * scale.steps.length * 2);
    DialMain.set(step / MAIN_STEPS, false);
    DialMain._lastStep = step;
    mainNoteEl.textContent = noteName(step);
    mainFreqEl.textContent = noteFreq(step).toFixed(1) + ' Hz';
    AudioEngine.pluck(noteFreq(step));
    flashPlaying();
    DialTone.set(0.3 + Math.random() * 0.6);
    DialEcho.set(Math.random() * 0.7);
    DialDrive.set(Math.random() * 0.5);
    setStatus('⁂ 随机调音 · 探索未知声景');
  }

  // === 琶音器 =========================================================

  function toggleArpeggio(force) {
    const next = force !== undefined ? force : !state.arpeggioOn;
    state.arpeggioOn = next;
    document.getElementById('btn-arpeggio').classList.toggle('active', next);
    clearInterval(state.arpeggioTimer);
    if (next) {
      state.arpeggioTimer = setInterval(() => {
        const scale = SCALES[state.scaleKey];
        const base = Math.round(DialMain.value * MAIN_STEPS);
        const wander = base + Math.floor(Math.random() * scale.steps.length) - Math.floor(scale.steps.length / 2);
        const step = ((wander % MAIN_STEPS) + MAIN_STEPS) % MAIN_STEPS;
        AudioEngine.pluck(noteFreq(step));
        flashPlaying();
      }, 420);
      setStatus('≫ 琶音生成器运行中');
    } else {
      setStatus('琶音生成器已停止');
    }
  }

  function toggleDrone(force) {
    const next = force !== undefined ? force : !state.droneOn;
    state.droneOn = next;
    document.getElementById('btn-drone').classList.toggle('active', next);
    if (next) {
      AudioEngine.startDrone(noteFreq(Math.round(DialMain.value * MAIN_STEPS)));
      setStatus('∿ 持续音层已开启');
    } else {
      AudioEngine.stopDrone();
      setStatus('持续音层已关闭');
    }
  }

  // === UI 交互 ========================================================

  document.getElementById('btn-pluck').addEventListener('click', playCurrentNote);
  document.getElementById('btn-drone').addEventListener('click', () => toggleDrone());
  document.getElementById('btn-arpeggio').addEventListener('click', () => toggleArpeggio());
  document.getElementById('btn-random').addEventListener('click', randomize);

  document.querySelectorAll('.scale-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scale-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.scaleKey = btn.dataset.scale;
      statusScale.textContent = SCALES[state.scaleKey].name;
      const step = Math.round(DialMain.value * MAIN_STEPS);
      DialMain._lastStep = step;
      mainNoteEl.textContent = noteName(step);
      mainFreqEl.textContent = noteFreq(step).toFixed(1) + ' Hz';
      setStatus(`音阶切换 → ${SCALES[state.scaleKey].name}`);
    });
  });

  themeBtn.addEventListener('click', () => {
    state.themeIndex = (state.themeIndex + 1) % THEMES.length;
    const name = THEMES[state.themeIndex];
    document.body.dataset.theme = name === 'default' ? '' : name;
    setStatus(`氛围配色 → ${THEME_LABEL[name]}`);
  });

  // 键盘演奏：数字键 1-9 触发音阶
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) {
      const scale = SCALES[state.scaleKey];
      const step = (n - 1) % Math.min(9, scale.steps.length * 2);
      AudioEngine.pluck(noteFreq(step));
      DialMain.set(step / MAIN_STEPS, false);
      DialMain._lastStep = step;
      mainNoteEl.textContent = noteName(step);
      mainFreqEl.textContent = noteFreq(step).toFixed(1) + ' Hz';
      flashPlaying();
      rippleFrom(mainEl);
    } else if (e.code === 'Space') {
      e.preventDefault();
      playCurrentNote();
    }
  });

  // === 状态与涟漪 =====================================================

  let statusTimer = null;
  function setStatus(text) {
    statusText.textContent = text;
    hintLabel.textContent = text.toUpperCase().slice(0, 40);
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusText.textContent = `Ready · 已奏 ${state.noteCount} 音`;
    }, 3200);
  }

  function rippleFrom(el) {
    const r = el.getBoundingClientRect();
    const rip = document.createElement('span');
    rip.className = 'ripple';
    const size = Math.max(r.width, r.height) * 2.2;
    rip.style.width = rip.style.height = size + 'px';
    rip.style.left = r.left + r.width / 2 + 'px';
    rip.style.top = r.top + r.height / 2 + 'px';
    rippleLayer.appendChild(rip);
    setTimeout(() => rip.remove(), 950);
  }

  // === 背景粒子流场 ===================================================

  const particles = [];
  const PARTICLE_COUNT = 70;

  function resizeBg() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        vx: 0, vy: 0,
        size: 0.6 + Math.random() * 1.8,
        phase: Math.random() * TAU,
        alpha: 0.15 + Math.random() * 0.4
      });
    }
  }

  // 廉价噪声流场：正弦叠加
  function flowAngle(x, y, t) {
    return Math.sin(x * 0.0016 + t * 0.28) * 1.6
         + Math.cos(y * 0.0021 - t * 0.19) * 1.4
         + Math.sin((x + y) * 0.0009 + t * 0.1);
  }

  function renderParticles(t) {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || '#8b7bff';
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    for (const p of particles) {
      const a = flowAngle(p.x, p.y, t);
      p.vx += Math.cos(a) * 5 * 0.016;
      p.vy += Math.sin(a) * 5 * 0.016;
      p.vx *= 0.96; p.vy *= 0.96;
      p.x += p.vx; p.y += p.vy;

      if (p.x < -20) p.x = bgCanvas.width + 20;
      if (p.x > bgCanvas.width + 20) p.x = -20;
      if (p.y < -20) p.y = bgCanvas.height + 20;
      if (p.y > bgCanvas.height + 20) p.y = -20;

      const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + p.phase);
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.size, 0, TAU);
      bgCtx.fillStyle = accent;
      bgCtx.globalAlpha = p.alpha * tw;
      bgCtx.fill();
    }
    bgCtx.globalAlpha = 1;
  }

  // === 标题乱码揭示 ===================================================

  function scrambleTitle(el, finalText) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#◇◎≋';
    let frame = 0;
    const total = 36;
    const tick = () => {
      frame++;
      const reveal = Math.floor((frame / total) * finalText.length);
      let out = '';
      for (let i = 0; i < finalText.length; i++) {
        out += i < reveal || finalText[i] === ' '
          ? finalText[i]
          : chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = out;
      if (frame < total) requestAnimationFrame(tick);
      else el.textContent = finalText;
    };
    tick();
  }

  // === 主循环 =========================================================

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    for (const d of allDials) {
      d.update(dt);
      d.render();
    }
    renderParticles(now / 1000);
    requestAnimationFrame(loop);
  }

  // === 启动 ===========================================================

  window.addEventListener('resize', () => {
    resizeBg();
    initParticles();
  });

  resizeBg();
  initParticles();
  statusScale.textContent = SCALES[state.scaleKey].name;
  DialMain.setValueImmediate(5 / MAIN_STEPS);
  DialTone.setValueImmediate(0.64);
  DialEcho.setValueImmediate(0.35);
  DialDrive.setValueImmediate(0.2);
  DialSpace.setValueImmediate(0.5);
  scrambleTitle(document.getElementById('logo-title'), 'Sound Dial Instrument');
  requestAnimationFrame(loop);
})();
