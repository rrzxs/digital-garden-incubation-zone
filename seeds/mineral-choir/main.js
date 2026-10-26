/**
 * ============================================================
 * Mineral Choir · 矿物唱诗班
 * 悬停低吟 · 点击长鸣 · 拖拽扫弦 · 空格合唱绽放
 *
 * 免构建 Vanilla JS —— 领域模块:
 *   Palettes / Scales  —— 数据配置
 *   AudioEngine        —— Web Audio 合成声部 + 生成式混响
 *   Crystal            —— 晶簇实体(弹簧物理 + 声音能量)
 *   ParticleField      —— 共振粒子流场
 *   Stage              —— 画布编排与交互
 * ============================================================ */

'use strict';

// === 数据配置 Palettes & Scales =================================

const PALETTES = {
  amethyst: { crystal: [184, 167, 255], core: [239, 233, 255], accent: [124, 92, 255] },
  emerald:  { crystal: [142, 242, 211], core: [234, 255, 247], accent: [45, 212, 167] },
  citrine:  { crystal: [255, 208, 138], core: [255, 244, 224], accent: [255, 181, 69] },
  moonstone:{ crystal: [207, 224, 255], core: [244, 250, 255], accent: [157, 180, 255] }
};

const SCALES = {
  pentatonic: { name: 'Pentatonic', steps: [0, 3, 5, 7, 10] },
  dorian:     { name: 'Dorian',     steps: [0, 2, 3, 5, 7, 9, 10] },
  lydian:     { name: 'Lydian',     steps: [0, 2, 4, 6, 7, 9, 11] },
  hirajoshi:  { name: 'Hirajoshi',  steps: [0, 2, 3, 7, 8] }
};

const CHORUS_MODES = { solo: 1, duo: 2, choir: 3 };
const ROOT_FREQ = 220; // A3
const CRYSTAL_COUNT = 9;

// === 工具函数 ===================================================

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);

const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

const midiToFreq = (semi) => ROOT_FREQ * Math.pow(2, semi / 12);

// === AudioEngine =================================================

const AudioEngine = (() => {
  let ctx = null;
  let master = null;
  let reverbSend = null;
  let convolver = null;
  let muted = false;
  let reverbAmount = 0.35;

  function ensure() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);

    // 生成式洞穴混响: 指数衰减噪声脉冲响应
    convolver = ctx.createConvolver();
    convolver.buffer = buildImpulse(2.8, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    convolver.connect(wet);
    wet.connect(master);

    reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(convolver);
    return ctx;
  }

  function buildImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const length = rate * seconds;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  /**
   * 晶体声部: 基频正弦 + 三角泛音 + 合唱失谐层
   * attack / release 塑造低吟与长鸣
   */
  function voice(freq, { gain = 0.16, attack = 0.02, release = 2.4, chorus = 1 } = {}) {
    if (muted) return;
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(gain, now + attack);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 6, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + release);
    filter.Q.value = 0.8;

    bus.connect(filter);
    filter.connect(master);
    const send = ctx.createGain();
    send.gain.value = reverbAmount;
    filter.connect(send);
    send.connect(reverbSend);

    const detunes = chorus === 1 ? [0] : chorus === 2 ? [-5, 5] : [-8, 0, 7];
    detunes.forEach((cents, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 1 : 0.32;
      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + attack + release + 0.1);
    });
  }

  return {
    hum(freq, chorus)  { voice(freq, { gain: 0.05, attack: 0.18, release: 0.6, chorus }); },
    strike(freq, chorus) { voice(freq, { gain: 0.17, attack: 0.008, release: 2.8, chorus }); },
    bloomNote(freq, chorus, delay) {
      if (muted) return;
      setTimeout(() => voice(freq, { gain: 0.13, attack: 0.05, release: 3.4, chorus }), delay);
    },
    setReverb(v) { reverbAmount = v; },
    setVolume(v) { if (master) master.gain.value = v; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      return muted;
    },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  };
})();

// === Crystal 晶簇实体 ============================================

class Crystal {
  constructor(x, y, size, seedSemi, seed) {
    this.x = x; this.y = y;
    this.size = size;
    this.seedSemi = seedSemi;
    this.seed = seed;

    // 弹簧物理: 缩放脉冲 + 姿态摆动
    this.scale = 1; this.scaleV = 0;
    this.tilt = 0; this.tiltV = 0;
    this.energy = 0;          // 声音能量 0~1, 驱动发光
    this.hover = 0;           // 悬停插值
    this.humActive = false;

    // 多边形晶簇轮廓
    this.sides = 5 + Math.floor(seed % 3);
    this.radii = [];
    for (let i = 0; i < this.sides; i++) {
      this.radii.push(rand(0.62, 1));
    }
    this.rotation = seed * 2.4;
  }

  get freq() { return midiToFreq(this.seedSemi); }

  strike() {
    this.scaleV += 0.16;
    this.tiltV += rand(-0.05, 0.05);
    this.energy = 1;
  }

  excite(amount) {
    this.energy = Math.max(this.energy, amount);
  }

  update(dt) {
    // 弹簧-阻尼 (欠阻尼, 产生持续颤动)
    const k = 140, damp = 7;
    this.scaleV += (1 - this.scale) * k * dt;
    this.scaleV *= Math.exp(-damp * dt);
    this.scale += this.scaleV * dt;

    this.tiltV += (0 - this.tilt) * k * 0.7 * dt;
    this.tiltV *= Math.exp(-damp * 1.1 * dt);
    this.tilt += this.tiltV * dt;

    this.energy *= Math.exp(-1.1 * dt);
    const hoverTarget = this.humActive ? 1 : 0;
    this.hover = lerp(this.hover, hoverTarget, 1 - Math.exp(-8 * dt));
  }

  contains(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size * 1.15;
  }

  draw(ctx2d, pal) {
    const s = this.size * this.scale * (1 + this.hover * 0.08);
    const glow = clamp(this.energy + this.hover * 0.4, 0, 1);

    ctx2d.save();
    ctx2d.translate(this.x, this.y);
    ctx2d.rotate(this.rotation + this.tilt + this.hover * 0.1);

    // 外发光
    if (glow > 0.02) {
      ctx2d.shadowColor = rgba(pal.crystal, 0.85 * glow);
      ctx2d.shadowBlur = 30 + 50 * glow;
    }

    // 晶体主体
    ctx2d.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const ang = (i / this.sides) * Math.PI * 2;
      const r = s * this.radii[i];
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) ctx2d.moveTo(px, py); else ctx2d.lineTo(px, py);
    }
    ctx2d.closePath();

    const grad = ctx2d.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, rgba(pal.crystal, 0.16 + 0.4 * glow));
    grad.addColorStop(0.55, rgba(pal.accent, 0.1 + 0.34 * glow));
    grad.addColorStop(1, rgba(pal.core, 0.14 + 0.44 * glow));
    ctx2d.fillStyle = grad;
    ctx2d.fill();

    // 微晶描边
    ctx2d.strokeStyle = rgba(pal.core, 0.35 + 0.55 * glow);
    ctx2d.lineWidth = 1.2;
    ctx2d.stroke();

    // 内棱线
    ctx2d.shadowBlur = 0;
    ctx2d.strokeStyle = rgba(pal.core, 0.12 + 0.3 * glow);
    ctx2d.lineWidth = 0.8;
    for (let i = 0; i < this.sides; i++) {
      const ang = (i / this.sides) * Math.PI * 2;
      ctx2d.beginPath();
      ctx2d.moveTo(0, 0);
      ctx2d.lineTo(Math.cos(ang) * s * this.radii[i] * 0.9, Math.sin(ang) * s * this.radii[i] * 0.9);
      ctx2d.stroke();
    }

    // 高光核
    if (glow > 0.05) {
      const core = ctx2d.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
      core.addColorStop(0, rgba(pal.core, 0.5 * glow));
      core.addColorStop(1, rgba(pal.core, 0));
      ctx2d.fillStyle = core;
      ctx2d.beginPath();
      ctx2d.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.restore();
  }
}

// === ParticleField 共振粒子流场 ==================================

class ParticleField {
  constructor(count) {
    this.parts = [];
    for (let i = 0; i < count; i++) {
      this.parts.push({
        x: Math.random(), y: Math.random(),
        vx: 0, vy: 0, life: 0, size: rand(0.6, 2)
      });
    }
  }

  burst(x, y, n, speed) {
    let emitted = 0;
    for (const p of this.parts) {
      if (p.life <= 0) {
        p.x = x; p.y = y;
        const ang = rand(0, Math.PI * 2);
        const v = rand(speed * 0.3, speed);
        p.vx = Math.cos(ang) * v;
        p.vy = Math.sin(ang) * v;
        p.life = rand(0.6, 1.6);
        if (++emitted >= n) break;
      }
    }
  }

  update(dt, w, h, time) {
    for (const p of this.parts) {
      if (p.life > 0) {
        p.life -= dt;
        p.x += (p.vx * dt) / w;
        p.y += (p.vy * dt) / h;
        p.vx *= 0.985; p.vy *= 0.985;
      } else {
        // 漂浮流场
        p.x += Math.sin(time * 0.22 + p.y * 6.2) * 0.00016;
        p.y += Math.cos(time * 0.18 + p.x * 5.4) * 0.00014 - 0.00004;
        if (p.y < -0.02) p.y = 1.02;
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
      }
    }
  }

  draw(ctx2d, pal) {
    for (const p of this.parts) {
      const active = p.life > 0;
      const a = active ? clamp(p.life, 0, 1) * 0.8 : 0.16;
      ctx2d.fillStyle = rgba(active ? pal.core : pal.crystal, a);
      ctx2d.beginPath();
      ctx2d.arc(p.x * ctx2d.canvas.width, p.y * ctx2d.canvas.height, p.size, 0, Math.PI * 2);
      ctx2d.fill();
    }
  }
}

// === Stage 画布编排 ==============================================

const Stage = (() => {
  const canvas = document.getElementById('choir-canvas');
  const ctx = canvas.getContext('2d');
  const particles = new ParticleField(90);
  const crystals = [];
  const pointer = { x: -999, y: -999, down: false, moved: false };
  const strummed = new Set();

  let state = {
    palette: 'amethyst',
    scale: 'pentatonic',
    chorus: 'choir',
    energy: 0,
    activeVoices: 0
  };
  let W = 0, H = 0, DPR = 1;
  let time = 0, last = performance.now();
  let humCooldown = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutCrystals();
  }

  /** 晶簇沿参数弧线有机排布, 音高自下而上 */
  function layoutCrystals() {
    crystals.length = 0;
    const scale = SCALES[state.scale];
    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const t = i / (CRYSTAL_COUNT - 1);
      const arc = Math.sin(t * Math.PI); // 弧高
      const x = W * (0.12 + t * 0.76) + Math.sin(t * 9.4) * W * 0.03;
      const y = H * (0.62 - arc * 0.26) + Math.cos(t * 7.1) * H * 0.045;
      const size = (Math.min(W, H) * 0.052) * (0.8 + arc * 0.55);
      const semi = scale.steps[i % scale.steps.length] + 12 * Math.floor(i / scale.steps.length);
      crystals.push(new Crystal(x, y, size, semi, i * 1.618 + 0.37));
    }
  }

  function scaleFrequencies() {
    return crystals.map((c) => c.freq);
  }

  /** 悬停低吟 */
  function updateHover(dt) {
    humCooldown -= dt;
    let hovered = 0;
    for (const c of crystals) {
      const inside = pointer.down === false && c.contains(pointer.x, pointer.y);
      if (inside && !c.humActive && humCooldown <= 0) {
        AudioEngine.hum(c.freq, CHORUS_MODES[state.chorus]);
        humCooldown = 0.09;
        c.excite(0.35);
      }
      c.humActive = inside;
      if (inside) hovered++;
    }
    state.activeVoices = hovered;
  }

  /** 拖拽扫弦: 光标掠过晶体即触发 */
  function updateStrum() {
    if (!pointer.down) { strummed.clear(); return; }
    for (const c of crystals) {
      if (c.contains(pointer.x, pointer.y) && !strummed.has(c)) {
        strummed.add(c);
        AudioEngine.strike(c.freq, CHORUS_MODES[state.chorus]);
        c.strike();
        particles.burst(c.x, c.y, 14, 160);
      }
    }
  }

  function strikeAt(x, y) {
    for (const c of crystals) {
      if (c.contains(x, y)) {
        AudioEngine.strike(c.freq, CHORUS_MODES[state.chorus]);
        c.strike();
        particles.burst(c.x, c.y, 22, 220);
        return true;
      }
    }
    return false;
  }

  /** 合唱绽放: 上行琶音齐鸣 */
  function bloom() {
    const freqs = scaleFrequencies();
    crystals.forEach((c, i) => {
      const delay = i * 110;
      AudioEngine.bloomNote(freqs[i], CHORUS_MODES[state.chorus], delay);
      setTimeout(() => {
        c.strike();
        particles.burst(c.x, c.y, 10, 140);
      }, delay);
    });
    particles.burst(W / 2, H / 2, 40, 260);
  }

  function setPalette(name) { state.palette = name; }
  function setScale(name) { state.scale = name; layoutCrystals(); }
  function setChorus(name) { state.chorus = name; }

  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    time += dt;

    updateHover(dt);
    updateStrum();
    particles.update(dt, W, H, time);

    ctx.clearRect(0, 0, W, H);
    const pal = PALETTES[state.palette];

    // 晶体间共鸣连线
    ctx.lineWidth = 0.7;
    for (let i = 0; i < crystals.length; i++) {
      for (let j = i + 1; j < crystals.length; j++) {
        const a = crystals[i], b = crystals[j];
        const link = clamp(a.energy + b.energy, 0, 1);
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < Math.min(W, H) * 0.42 && link > 0.08) {
          ctx.strokeStyle = rgba(pal.crystal, link * 0.3);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    particles.draw(ctx, pal);
    let totalEnergy = 0;
    for (const c of crystals) {
      c.update(dt);
      c.draw(ctx, pal);
      totalEnergy += c.energy;
    }
    state.energy = totalEnergy / crystals.length;

    requestAnimationFrame(frame);
  }

  function bindPointer() {
    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    canvas.addEventListener('pointermove', (e) => { toLocal(e); AudioEngine.resume(); });
    canvas.addEventListener('pointerdown', (e) => {
      toLocal(e); pointer.down = true; pointer.moved = false;
      AudioEngine.resume();
      strikeAt(pointer.x, pointer.y);
    });
    window.addEventListener('pointerup', () => { pointer.down = false; });
    canvas.addEventListener('pointerleave', () => { pointer.x = -999; pointer.y = -999; });
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    bindPointer();
    requestAnimationFrame(frame);
  }

  return { init, bloom, setPalette, setScale, setChorus, get energy() { return state.energy; }, get voices() { return state.activeVoices; }, get scaleName() { return SCALES[state.scale].name; } };
})();

// === HUD 遥测 ====================================================

const HUD = (() => {
  const scaleEl = document.getElementById('hud-scale');
  const rootEl = document.getElementById('hud-root');
  const voicesEl = document.getElementById('hud-voices');
  const energyEl = document.getElementById('hud-energy');
  const fillEl = document.getElementById('energy-fill');

  function tick() {
    voicesEl.textContent = `${Stage.voices} / ${CRYSTAL_COUNT}`;
    const pct = Math.round(Stage.energy * 100);
    energyEl.textContent = `${pct}%`;
    fillEl.style.width = `${Math.min(100, Stage.energy * 100 + Stage.voices * 8)}%`;
    requestAnimationFrame(tick);
  }

  function setScale(name) { scaleEl.textContent = name; }
  function setRoot(txt) { rootEl.textContent = txt; }

  return { tick, setScale, setRoot };
})();

// === 控制台 UI 绑定 ==============================================

// eslint-disable-next-line no-unused-vars
const ConsoleUI = (() => {
  function bindSegRow(rowId, attr, cb) {
    const row = document.getElementById(rowId);
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      row.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      cb(btn.dataset[attr], btn);
    });
  }

  function init() {
    // 音阶
    bindSegRow('scale-row', 'scale', (val) => {
      Stage.setScale(val);
      HUD.setScale(SCALES[val].name);
    });
    // 和声
    bindSegRow('chorus-row', 'chorus', (val) => Stage.setChorus(val));
    // 氛围配色
    bindSegRow('palette-row', 'palette', (val) => {
      Stage.setPalette(val);
      document.body.dataset.palette = val;
    });

    // 混响
    const reverbSlider = document.getElementById('reverb-slider');
    const reverbVal = document.getElementById('reverb-val');
    reverbSlider.addEventListener('input', () => {
      const v = reverbSlider.value / 100;
      reverbVal.textContent = `${reverbSlider.value}%`;
      AudioEngine.setReverb(v);
    });

    // 音量
    const volumeSlider = document.getElementById('volume-slider');
    const volumeVal = document.getElementById('volume-val');
    volumeSlider.addEventListener('input', () => {
      volumeVal.textContent = `${volumeSlider.value}%`;
      AudioEngine.setVolume(volumeSlider.value / 100);
    });

    // 合唱绽放
    document.getElementById('bloom-btn').addEventListener('click', () => {
      AudioEngine.resume();
      Stage.bloom();
    });

    // 静音
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.addEventListener('click', () => {
      const muted = AudioEngine.toggleMute();
      muteBtn.classList.toggle('muted', muted);
      muteBtn.textContent = muted ? '解除静音' : '静音 Mute';
    });

    // 控制台折叠
    const consoleEl = document.getElementById('console');
    const collapseBtn = document.getElementById('collapse-btn');
    collapseBtn.addEventListener('click', () => {
      consoleEl.classList.toggle('collapsed');
      collapseBtn.textContent = consoleEl.classList.contains('collapsed') ? '+' : '—';
    });

    // 空格合唱绽放
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        AudioEngine.resume();
        Stage.bloom();
      }
    });
  }

  return { init };
})();

// === 标题乱码揭示 =================================================

(() => {
  const el = document.querySelector('[data-scramble]');
  const target = el.textContent;
  const glyphs = '◇◈▚▞♼Placeholder▒░#%&';
  let frameCount = 0;
  const totalFrames = 48;
  (function scramble() {
    frameCount++;
    const progress = frameCount / totalFrames;
    el.textContent = target.split('').map((ch, i) => {
      if (progress > i / target.length + 0.4) return ch;
      return glyphs[Math.floor(Math.random() * glyphs.length)];
    }).join('');
    if (frameCount < totalFrames) requestAnimationFrame(scramble);
    else el.textContent = target;
  })();
})();

// === 启动 ========================================================

document.addEventListener('DOMContentLoaded', () => {
  Stage.init();
  ConsoleUI.init();
  HUD.setScale(SCALES.pentatonic.name);
  HUD.setRoot('A3 · 220Hz');
  HUD.tick();
});
