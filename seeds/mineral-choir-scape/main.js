/* ═══════════════════════════════════════════════
   Mineral Choir Scape · 矿物唱诗班
   晶簇共振 × 合唱声场 × 非线性微交互
   maintainer: EDEN
   ═══════════════════════════════════════════════ */
'use strict';

// === 配置 ===
const PALETTES = {
  geode:   { crystal: [265, 285, 300, 200, 250], accent: '#c8b3ff' },
  emerald: { crystal: [150, 165, 95, 175, 130],  accent: '#a5ffd6' },
  rose:    { crystal: [340, 355, 20, 315, 335],  accent: '#ffc2d6' },
  arctic:  { crystal: [200, 215, 255, 185, 230], accent: '#bfe6ff' }
};

const SCALES = [
  [0, 2, 4, 7, 9],        // 大五声
  [0, 2, 3, 5, 7, 9, 10], // 多利亚
  [0, 2, 4, 6, 7, 9, 11], // 利底亚
  [0, 2, 3, 7, 8]         // 平调子 (Hirajoshi)
];

const ROOT_HZ = 146.83; // D3
const CRYSTAL_COUNT = 13;

// === 工具 ===
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 轻量值噪声（用于粒子飘移与晶簇微光）
function hash1(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}

function midiToHz(semi) { return ROOT_HZ * Math.pow(2, semi / 12); }

// === DOM ===
const canvas = document.getElementById('stage');
const ctx2d = canvas.getContext('2d');
const teleVoices = document.getElementById('teleVoices');
const teleRes = document.getElementById('teleRes');
const teleMode = document.getElementById('teleMode');
const teleBarFill = document.getElementById('teleBarFill');

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ═══════════════ 音频引擎 ═══════════════
const AudioEngine = (() => {
  let ac = null, master = null, wet = null, dry = null, comp = null;
  let reverbMix = 0.55;
  let muted = false;
  let activeVoices = 0;

  function ensure() {
    if (ac) return true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -22;
      comp.ratio.value = 6;
      comp.connect(ac.destination);

      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(comp);

      // 洞穴混响：生成衰减噪声脉冲的卷积核
      const convolver = ac.createConvolver();
      const len = ac.sampleRate * 3.2;
      const ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
        }
      }
      convolver.buffer = ir;

      wet = ac.createGain(); wet.gain.value = reverbMix;
      dry = ac.createGain(); dry.gain.value = 1 - reverbMix * 0.55;
      wet.connect(convolver); convolver.connect(master);
      dry.connect(master);
      return true;
    } catch (e) { return false; }
  }

  function setReverb(v) {
    reverbMix = v;
    if (wet) {
      wet.gain.setTargetAtTime(v, ac.currentTime, 0.12);
      dry.gain.setTargetAtTime(1 - v * 0.55, ac.currentTime, 0.12);
    }
  }

  // 合唱声部：三重失谐振荡器 + 低通包络 + 慢起音
  function voice(freq, dur, peak, detuneSpread) {
    if (!ensure() || muted) return;
    if (ac.state === 'suspended') ac.resume();
    if (activeVoices > 14) return; // 声部上限
    activeVoices++;
    const t0 = ac.currentTime;

    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.28);
    env.gain.setTargetAtTime(peak * 0.5, t0 + 0.3, 0.6);
    env.gain.setTargetAtTime(0.0001, t0 + dur * 0.75, dur * 0.3);

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 1.5, t0);
    filter.frequency.exponentialRampToValueAtTime(freq * 5.5, t0 + 0.35);
    filter.frequency.setTargetAtTime(freq * 2.4, t0 + 0.4, 0.8);
    filter.Q.value = 1.1;

    const spread = detuneSpread || 9;
    [-spread, 0, spread].forEach((cents, idx) => {
      const osc = ac.createOscillator();
      osc.type = idx === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents + rand(-1.5, 1.5);
      const og = ac.createGain();
      og.gain.value = idx === 1 ? 0.34 : 0.5;
      osc.connect(og); og.connect(filter);
      osc.start(t0);
      osc.stop(t0 + dur + 0.4);
      osc.onended = () => { if (idx === 0) activeVoices--; };
    });

    filter.connect(env);
    env.connect(dry); env.connect(wet);
  }

  function hum(freq) { voice(freq, 1.4, 0.05, 14); }
  function sing(freq) { voice(freq, 4.2, 0.16, 9); }
  function bloom(freq) { voice(freq, 5.5, 0.13, 6); }

  function setMuted(m) {
    muted = m;
    if (master && ac) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.1);
  }

  return {
    hum, sing, bloom, setReverb, setMuted,
    get activeVoices() { return activeVoices; },
    get isMuted() { return muted; }
  };
})();

// ═══════════════ 晶簇场 ═══════════════
class Crystal {
  constructor(index, total) {
    this.index = index;
    this.noteIdx = index;
    this.reseed();
    // 沿底部舞台弧线排布
    const t = total === 1 ? 0.5 : index / (total - 1);
    this.x = W * (0.1 + t * 0.8) + rand(-30, 30);
    this.baseY = H * lerp(0.84, 0.66, Math.abs(t - 0.5) * -2 + 1) + rand(-24, 24);
    this.size = rand(52, 118) * (1 - Math.abs(t - 0.5) * 0.5);
    this.scale = 1; this.vel = 0;     // 弹簧物理
    this.energy = 0;                  // 共鸣能量
    this.humCool = 0;                 // 低吟冷却
    this.phase = rand(0, Math.PI * 2);
  }

  reseed() {
    const palette = PALETTES[document.body.dataset.palette];
    const pool = palette.crystal;
    this.hue = pool[this.index % pool.length] + rand(-8, 8);
  }

  contains(px, py) {
    const dx = px - this.x, dy = py - (this.baseY - this.size * 0.55 * this.scale);
    const rx = this.size * 0.62 * this.scale;
    const ry = this.size * 1.15 * this.scale;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  impulse(strength) {
    this.vel += strength;
    this.energy = Math.min(1, this.energy + strength);
  }

  freq() {
    const scale = SCALES[State.scaleIdx];
    const deg = this.noteIdx % scale.length;
    const oct = Math.floor(this.noteIdx / scale.length);
    return midiToHz(scale[deg] + oct * 12);
  }

  update(dt, time) {
    // 弹簧-阻尼共振
    const k = 90, damp = 7.5;
    const a = -k * (this.scale - 1) - damp * this.vel;
    this.vel += a * dt;
    this.scale += this.vel * dt;
    this.energy = Math.max(0, this.energy - dt * 0.32);
    this.humCool = Math.max(0, this.humCool - dt);
    this.shimmer = 0.5 + 0.5 * Math.sin(time * 0.0011 + this.phase);
  }

  draw(c, hovered) {
    const s = this.size * this.scale;
    const cx = this.x;
    const baseY = this.baseY;
    const tipY = baseY - s * 1.72;
    const e = this.energy;

    c.save();
    c.translate(cx, 0);

    // 地面倒影光晕
    const glow = c.createRadialGradient(0, baseY, 0, 0, baseY, s * 1.9);
    glow.addColorStop(0, `hsla(${this.hue}, 85%, 68%, ${0.1 + e * 0.5})`);
    glow.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
    c.fillStyle = glow;
    c.fillRect(-s * 2, baseY - s * 2, s * 4, s * 4);

    // 主晶簇：三枚 facets
    const facets = [
      { w: 0.56, tip: 1.72, off: 0, alpha: 0.34 },
      { w: 0.34, tip: 1.18, off: -0.42, alpha: 0.24 },
      { w: 0.28, tip: 0.86, off: 0.46, alpha: 0.24 }
    ];
    facets.forEach((f, i) => {
      const fw = s * f.w;
      const fTip = baseY - s * f.tip;
      const ox = f.off * s * 0.55;

      c.beginPath();
      c.moveTo(ox - fw * 0.5, baseY);
      c.lineTo(ox - fw * 0.34, baseY - (baseY - fTip) * 0.45);
      c.lineTo(ox, fTip);
      c.lineTo(ox + fw * 0.38, baseY - (baseY - fTip) * 0.5);
      c.lineTo(ox + fw * 0.52, baseY);
      c.closePath();

      const body = c.createLinearGradient(ox, fTip, ox, baseY);
      const lit = 52 + e * 30 + this.shimmer * 8;
      body.addColorStop(0, `hsla(${this.hue}, 90%, ${lit + 14}%, ${f.alpha + e * 0.4})`);
      body.addColorStop(1, `hsla(${this.hue + 14}, 80%, ${lit - 16}%, ${f.alpha * 0.5 + e * 0.18})`);
      c.fillStyle = body;
      c.fill();

      // 微晶描边 + 共鸣辉光
      c.strokeStyle = `hsla(${this.hue}, 95%, ${72 + e * 20}%, ${0.32 + e * 0.55})`;
      c.lineWidth = 1 + e * 1.4;
      if (e > 0.05) { c.shadowColor = `hsla(${this.hue}, 95%, 70%, ${e})`; c.shadowBlur = 22 * e; }
      c.stroke();
      c.shadowBlur = 0;

      // 内棱线
      c.beginPath();
      c.moveTo(ox, baseY);
      c.lineTo(ox + fw * 0.06, fTip);
      c.strokeStyle = `hsla(${this.hue}, 100%, 84%, ${0.14 + e * 0.3})`;
      c.lineWidth = 0.8;
      c.stroke();
    });

    // 悬停光环
    if (hovered) {
      c.beginPath();
      c.arc(0, baseY - s * 0.85, s * 1.05, 0, Math.PI * 2);
      c.strokeStyle = `hsla(${this.hue}, 100%, 80%, 0.4)`;
      c.setLineDash([3, 7]);
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);
    }

    c.restore();
  }
}

// ═══════════════ 粒子与涟漪 ═══════════════
const motes = [];
const MOTE_N = 60;
for (let i = 0; i < MOTE_N; i++) {
  motes.push({ x: rand(0, 1), y: rand(0, 1), r: rand(0.6, 2.1), seed: rand(0, 100), sp: rand(0.008, 0.03) });
}

const bursts = [];
function spawnBurst(x, y, hue, n) {
  for (let i = 0; i < n; i++) {
    const ang = rand(-Math.PI, 0);
    const sp = rand(30, 150);
    bursts.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      life: 1, decay: rand(0.4, 0.9), r: rand(1, 3), hue: hue + rand(-12, 12)
    });
  }
}

const ripples = [];
function spawnRipple(x, y, hue) {
  ripples.push({ x, y, r: 6, life: 1, hue });
}

// ═══════════════ 全局状态 ═══════════════
const State = {
  scaleIdx: 0,
  palette: 'geode',
  autoChoir: false,
  pointer: { x: -999, y: -999, down: false, downT: 0 },
  hovered: null,
  lastStrum: null,
  chordTime: 0,
  charge: 0
};

const crystals = [];
(function buildField() {
  for (let i = 0; i < CRYSTAL_COUNT; i++) crystals.push(new Crystal(i, CRYSTAL_COUNT));
  crystals.sort((a, b) => a.baseY - b.baseY); // 远景先画
})();

// ═══════════════ 交互 ═══════════════
function crystalAt(x, y) {
  for (let i = crystals.length - 1; i >= 0; i--) {
    if (crystals[i].contains(x, y)) return crystals[i];
  }
  return null;
}

function singCrystal(cr, mode) {
  cr.impulse(mode === 'bloom' ? 2.6 : 1.5);
  spawnBurst(cr.x, cr.baseY - cr.size * 0.8, cr.hue, mode === 'bloom' ? 26 : 10);
  spawnRipple(cr.x, cr.baseY - cr.size * 0.6, cr.hue);
  if (mode === 'hum') AudioEngine.hum(cr.freq());
  else if (mode === 'bloom') AudioEngine.bloom(cr.freq());
  else AudioEngine.sing(cr.freq());
}

canvas.addEventListener('pointermove', (e) => {
  State.pointer.x = e.clientX; State.pointer.y = e.clientY;

  const cr = crystalAt(e.clientX, e.clientY);
  if (cr !== State.hovered) {
    State.hovered = cr;
    canvas.style.cursor = cr ? 'pointer' : 'crosshair';
    if (cr && cr.humCool <= 0) {
      cr.humCool = 0.5;
      singCrystal(cr, 'hum');
    }
  }
  // 拖拽扫弦
  if (State.pointer.down && cr && cr !== State.lastStrum) {
    State.lastStrum = cr;
    singCrystal(cr, 'sing');
  }
});

canvas.addEventListener('pointerdown', (e) => {
  State.pointer.down = true;
  State.pointer.downT = performance.now();
  State.charge = 0;
  const cr = crystalAt(e.clientX, e.clientY);
  if (cr) { State.lastStrum = cr; singCrystal(cr, 'sing'); }
});

window.addEventListener('pointerup', () => {
  const held = performance.now() - State.pointer.downT;
  if (held > 600) {
    // 蓄能合唱：全场合弦绽放
    crystals.forEach((cr, i) => {
      setTimeout(() => singCrystal(cr, 'bloom'), i * 55);
    });
  }
  State.pointer.down = false;
  State.lastStrum = null;
  State.charge = 0;
});

// 自动唱诗：温和生成式和弦调度
let lastChord = 0;
function autoChoirTick(time) {
  if (!State.autoChoir || time - lastChord < 2600) return;
  lastChord = time;
  const scale = SCALES[State.scaleIdx];
  const rootDeg = Math.floor(rand(0, scale.length));
  const chordDegs = [0, 2, 4].map((step) => rootDeg + step);
  chordDegs.forEach((deg, i) => {
    const cr = crystals[(deg * 2 + i) % crystals.length];
    setTimeout(() => singCrystal(cr, 'bloom'), i * 140);
  });
}

// ═══════════════ HUD ═══════════════
document.getElementById('scaleSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  State.scaleIdx = +btn.dataset.scale;
  crystals.forEach((cr) => cr.impulse(0.8));
});

const reverbSlider = document.getElementById('reverbSlider');
reverbSlider.addEventListener('input', () => AudioEngine.setReverb(reverbSlider.value / 100));

const autoBtn = document.getElementById('autoBtn');
autoBtn.addEventListener('click', () => {
  State.autoChoir = !State.autoChoir;
  autoBtn.setAttribute('aria-pressed', String(State.autoChoir));
  autoBtn.classList.add('flash');
  setTimeout(() => autoBtn.classList.remove('flash'), 400);
});

document.getElementById('paletteRow').addEventListener('click', (e) => {
  const dot = e.target.closest('.palette-dot');
  if (!dot) return;
  document.querySelectorAll('.palette-dot').forEach((d) => d.classList.remove('active'));
  dot.classList.add('active');
  State.palette = dot.dataset.palette;
  document.body.dataset.palette = State.palette;
  crystals.forEach((cr) => { cr.reseed(); cr.impulse(0.6); });
});

const muteBtn = document.getElementById('muteBtn');
muteBtn.addEventListener('click', () => {
  AudioEngine.setMuted(!AudioEngine.isMuted);
  muteBtn.textContent = AudioEngine.isMuted ? 'SOUND OFF' : 'SOUND ON';
});

// 标题乱码揭示
(function scrambleTitle() {
  const el = document.getElementById('title');
  const finalText = el.dataset.text;
  const glyphs = '◈◆◇AZEOU◈';
  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    const reveal = Math.floor(frame / 3);
    let out = '';
    for (let i = 0; i < finalText.length; i++) {
      out += i < reveal ? finalText[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
    }
    el.textContent = out;
    if (reveal >= finalText.length) clearInterval(timer);
  }, 42);
})();

// ═══════════════ 主循环 ═══════════════
let lastT = performance.now();
let teleFrame = 0;

function loop(time) {
  const dt = Math.min(0.05, (time - lastT) / 1000);
  lastT = time;
  autoChoirTick(time);

  // 蓄能
  if (State.pointer.down) State.charge = Math.min(1, State.charge + dt * 1.4);

  ctx2d.clearRect(0, 0, W, H);

  // —— 环境尘埃 ——
  ctx2d.save();
  const pal = PALETTES[State.palette];
  motes.forEach((m) => {
    m.x += noise1(m.seed + time * 0.00013 * m.sp * 100) * 0.0006 + 0.00008;
    m.y -= m.sp * 0.0011;
    if (m.y < -0.02) { m.y = 1.02; m.x = rand(0, 1); }
    if (m.x > 1.02) m.x = -0.02;
    ctx2d.beginPath();
    ctx2d.arc(m.x * W, m.y * H, m.r, 0, Math.PI * 2);
    ctx2d.fillStyle = `hsla(${pal.crystal[2]}, 70%, 80%, ${0.08 + m.r * 0.06})`;
    ctx2d.fill();
  });
  ctx2d.restore();

  // —— 涟漪环 ——
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += 220 * dt; r.life -= dt * 1.1;
    if (r.life <= 0) { ripples.splice(i, 1); continue; }
    ctx2d.beginPath();
    ctx2d.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx2d.strokeStyle = `hsla(${r.hue}, 90%, 72%, ${r.life * 0.5})`;
    ctx2d.lineWidth = 1.5;
    ctx2d.stroke();
  }

  // —— 晶簇 ——
  crystals.forEach((cr) => {
    cr.update(dt, time);
    cr.draw(ctx2d, cr === State.hovered);
  });

  // —— 共鸣迸射粒子 ——
  for (let i = bursts.length - 1; i >= 0; i--) {
    const p = bursts[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 34 * dt; p.vx *= 0.985;
    p.life -= p.decay * dt;
    if (p.life <= 0) { bursts.splice(i, 1); continue; }
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx2d.fillStyle = `hsla(${p.hue}, 92%, 76%, ${p.life * 0.85})`;
    ctx2d.fill();
  }

  // —— 蓄能环 ——
  if (State.charge > 0.02) {
    const c = State.pointer;
    ctx2d.beginPath();
    ctx2d.arc(c.x, c.y, 26 + State.charge * 20, -Math.PI / 2, -Math.PI / 2 + State.charge * Math.PI * 2);
    ctx2d.strokeStyle = pal.accent;
    ctx2d.lineWidth = 2;
    ctx2d.shadowColor = pal.accent;
    ctx2d.shadowBlur = 14;
    ctx2d.stroke();
    ctx2d.shadowBlur = 0;
  }

  // —— 遥测（降频刷新）——
  if (++teleFrame % 12 === 0) {
    const totalEnergy = crystals.reduce((s, cr) => s + cr.energy, 0);
    const resPct = Math.round(clamp(totalEnergy / crystals.length, 0, 1) * 100);
    teleVoices.textContent = String(AudioEngine.activeVoices).padStart(2, '0');
    teleRes.textContent = resPct + '%';
    teleBarFill.style.width = resPct + '%';
    teleMode.textContent = State.autoChoir ? 'AUTOCHOIR' : State.pointer.down ? 'CHARGE' : 'TOUCH';
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
