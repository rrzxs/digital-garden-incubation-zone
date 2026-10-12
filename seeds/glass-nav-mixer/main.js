/* ============================================================
   GLASS NAV MIXER · 微晶导航混音台
   弹簧物理推子 × 流体背景混合 × 频道内容交叠
   ============================================================ */
(function () {
  'use strict';

  // === 配置 ==================================================

  const CHANNELS = [
    { name: 'ORIGIN', cssVar: '--ch0', phase: 0.0 },
    { name: 'CRAFT',  cssVar: '--ch1', phase: 1.3 },
    { name: 'SIGNAL', cssVar: '--ch2', phase: 2.7 },
    { name: 'CHAOS',  cssVar: '--ch3', phase: 4.1 },
    { name: 'VOID',   cssVar: '--ch4', phase: 5.6 }
  ];

  const SPRING_K = 0.16;   // 弹簧刚度
  const SPRING_D = 0.72;   // 阻尼

  // === 状态 ==================================================

  const state = {
    levels: CHANNELS.map((_, i) => (i === 0 ? 1 : 0)),
    targets: CHANNELS.map((_, i) => (i === 0 ? 1 : 0)),
    vels: CHANNELS.map(() => 0),
    dominant: 0,
    energyKick: 0,
    pointer: { x: -999, y: -999, gx: -999, gy: -999 },
    audioOn: false,
    audioCtx: null,
    pulse: null // {x, y, t}
  };

  // === DOM 元素 ==============================================

  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  const stripsEl = document.getElementById('strips');
  const stageEl = document.getElementById('stage');
  const hudReadout = document.getElementById('hud-readout');
  const masterValue = document.getElementById('master-value');
  const masterMeters = document.querySelectorAll('#master-meters i');
  const cursorGlow = document.getElementById('cursor-glow');
  const btnPulse = document.getElementById('btn-pulse');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnMute = document.getElementById('btn-mute');

  const strips = [];      // {el, fill, knob, value, meterBars[]}
  const views = document.querySelectorAll('.channel-view');

  // === 工具 ==================================================

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  function readPalette() {
    const cs = getComputedStyle(document.body);
    return CHANNELS.map((ch) => cs.getPropertyValue(ch.cssVar).trim() || '#ffffff');
  }

  let palette = readPalette();
  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  // === 音频（极简合成器，默认关闭） ==========================

  function blip(freq, dur = 0.08, gain = 0.05) {
    if (!state.audioOn) return;
    if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ac = state.audioCtx;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  // === 推子排构建 ============================================

  CHANNELS.forEach((ch, i) => {
    const strip = document.createElement('div');
    strip.className = 'strip';
    strip.style.setProperty('--strip-color', `var(${ch.cssVar})`);
    strip.innerHTML = `
      <span class="strip-num mono">0${i + 1}</span>
      <button class="strip-name">${ch.name}</button>
      <div class="strip-meter">${'<i></i>'.repeat(5)}</div>
      <div class="fader-track">
        <div class="fader-fill"></div>
        <div class="fader-knob"></div>
      </div>
      <span class="strip-value mono">0.00</span>
    `;
    stripsEl.appendChild(strip);

    const track = strip.querySelector('.fader-track');
    strips.push({
      el: strip,
      track,
      fill: strip.querySelector('.fader-fill'),
      knob: strip.querySelector('.fader-knob'),
      value: strip.querySelector('.strip-value'),
      meterBars: [...strip.querySelectorAll('.strip-meter i')]
    });

    // 拖拽推子
    track.addEventListener('pointerdown', (e) => {
      track.setPointerCapture(e.pointerId);
      const setFromY = (ev) => {
        const r = track.getBoundingClientRect();
        state.targets[i] = clamp01(1 - (ev.clientY - r.top) / r.height);
      };
      setFromY(e);
      blip(340 + i * 90, 0.05, 0.03);
      const onMove = (ev) => setFromY(ev);
      const onUp = () => {
        track.removeEventListener('pointermove', onMove);
        track.removeEventListener('pointerup', onUp);
      };
      track.addEventListener('pointermove', onMove);
      track.addEventListener('pointerup', onUp);
    });

    // 点击频道名 = 独奏
    strip.querySelector('.strip-name').addEventListener('click', () => solo(i));
  });

  function solo(i) {
    state.targets.forEach((_, j) => { state.targets[j] = j === i ? 1 : 0; });
    blip(520 + i * 60, 0.12, 0.05);
  }

  // === 背景画布（低分辨率拉伸获得柔焦） ======================

  let W, H;
  function resizeCanvas() {
    W = canvas.width = Math.max(120, Math.floor(innerWidth / 5));
    H = canvas.height = Math.max(80, Math.floor(innerHeight / 5));
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 粒子池
  const particles = [];
  function spawnParticle() {
    particles.push({
      x: Math.random(), y: Math.random(),
      vx: rand(-0.02, 0.02), vy: rand(-0.02, 0.02),
      ch: Math.floor(Math.random() * CHANNELS.length),
      size: rand(0.6, 2.2),
      tw: rand(0, Math.PI * 2)
    });
  }

  function drawBackground(t) {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--deep') || '#06070d';
    ctx.fillRect(0, 0, W, H);

    // 各频道流体色团（按电平加权呼吸）
    ctx.globalCompositeOperation = 'screen';
    CHANNELS.forEach((ch, i) => {
      const lv = state.levels[i];
      const px = (0.5 + 0.32 * Math.sin(t * 0.00022 + ch.phase)) * W;
      const py = (0.5 + 0.28 * Math.cos(t * 0.00017 + ch.phase * 1.7)) * H;
      const r = (0.16 + 0.5 * lv) * Math.min(W, H) * 0.9;
      const alpha = 0.06 + 0.5 * lv;
      const [r0, g0, b0] = hexToRgb(palette[i] || '#ffffff');
      const grad = ctx.createRadialGradient(px, py, 0, px, py, Math.max(r, 1));
      grad.addColorStop(0, `rgba(${r0},${g0},${b0},${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(r, 1), 0, Math.PI * 2);
      ctx.fill();
    });

    // 光标扰动光晕
    if (state.pointer.gx > -100) {
      const [r0, g0, b0] = hexToRgb(palette[state.dominant] || '#ffffff');
      const px = state.pointer.gx / innerWidth * W;
      const py = state.pointer.gy / innerHeight * H;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, W * 0.22);
      grad.addColorStop(0, `rgba(${r0},${g0},${b0},0.1)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // 粒子场：数量与速度随总能量
    const energy = state.levels.reduce((a, b) => a + b, 0) + state.energyKick;
    const targetCount = Math.min(260, Math.floor(20 + energy * 60));
    while (particles.length < targetCount) spawnParticle();
    while (particles.length > targetCount) particles.pop();

    const speedMul = 1 + energy * 1.6 + state.energyKick * 3;
    particles.forEach((p) => {
      // 光标轻微吸引 + 流场漂移
      if (state.pointer.gx > -100) {
        const dx = state.pointer.gx / innerWidth - p.x;
        const dy = state.pointer.gy / innerHeight - p.y;
        const d2 = dx * dx + dy * dy + 0.002;
        p.vx += (dx / d2) * 0.00002;
        p.vy += (dy / d2) * 0.00002;
      }
      // 脉冲冲击波推挤
      if (state.pulse) {
        const dx = p.x - state.pulse.x, dy = p.y - state.pulse.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const wave = Math.abs(d - state.pulse.r);
        if (wave < 0.08) {
          p.vx += (dx / d) * 0.06 * (1 - wave / 0.08);
          p.vy += (dy / d) * 0.06 * (1 - wave / 0.08);
        }
      }
      p.vx += Math.sin(p.y * 9 + t * 0.0004 + p.tw) * 0.0004 * speedMul;
      p.vy += Math.cos(p.x * 8 - t * 0.0003 + p.tw) * 0.0004 * speedMul;
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx * speedMul * 0.016;
      p.y += p.vy * speedMul * 0.016;
      if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05; if (p.y > 1.05) p.y = -0.05;

      const [r0, g0, b0] = hexToRgb(palette[p.ch] || '#ffffff');
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.003 + p.tw));
      const alpha = (0.1 + 0.5 * state.levels[p.ch]) * tw;
      ctx.fillStyle = `rgba(${r0},${g0},${b0},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  }

  // === 主循环 ================================================

  function tick(t) {
    // 弹簧积分
    state.levels.forEach((lv, i) => {
      state.vels[i] += (state.targets[i] - lv) * SPRING_K;
      state.vels[i] *= SPRING_D;
      state.levels[i] = clamp01(lv + state.vels[i]);
    });

    // 能量衰减 / 脉冲扩散
    state.energyKick *= 0.94;
    if (state.pulse) {
      state.pulse.r += 0.012;
      state.pulse.alpha *= 0.965;
      if (state.pulse.alpha < 0.02) state.pulse = null;
    }

    // 主导频道
    let maxI = 0, maxV = 0;
    state.levels.forEach((lv, i) => { if (lv > maxV) { maxV = lv; maxI = i; } });
    if (maxV > 0.06) state.dominant = maxI;

    // ---- UI 同步 ----
    const energy = state.levels.reduce((a, b) => a + b, 0);

    strips.forEach((s, i) => {
      const lv = state.levels[i];
      s.fill.style.height = (lv * 100) + '%';
      s.knob.style.bottom = (lv * 100) + '%';
      s.value.textContent = lv.toFixed(2);
      s.el.classList.toggle('is-dominate', i === state.dominant);
      s.meterBars.forEach((bar, j) => {
        const jit = 0.7 + 0.3 * Math.sin(t * 0.012 + j * 1.7 + i * 3.1);
        bar.style.height = Math.max(15, lv * jit * 100) + '%';
      });
    });

    views.forEach((v) => v.classList.toggle('is-live', +v.dataset.channel === state.dominant));

    masterMeters.forEach((bar, j) => {
      const jit = 0.6 + 0.4 * Math.sin(t * 0.01 + j * 2.3);
      bar.style.height = Math.max(10, clamp01(energy / 3) * jit * 100 + state.energyKick * 30) + '%';
    });

    masterValue.textContent = (energy / CHANNELS.length).toFixed(2);
    hudReadout.textContent = `CH ${CHANNELS[state.dominant].name} · ENERGY ${(energy / CHANNELS.length).toFixed(2)}`;

    // 光标柔光跟随（lerp）
    if (state.pointer.x > -100) {
      state.pointer.gx += (state.pointer.x - state.pointer.gx) * 0.12;
      state.pointer.gy += (state.pointer.y - state.pointer.gy) * 0.12;
      cursorGlow.style.transform = `translate(${state.pointer.gx}px, ${state.pointer.gy}px)`;
    }

    drawBackground(t);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // === 交互：脉冲 / 洗牌 / 声音 / 主题 / 键盘 =================

  function firePulse(x = innerWidth / 2, y = innerHeight / 2) {
    state.energyKick = Math.min(1, state.energyKick + 0.7);
    state.pulse = { x: x / innerWidth, y: y / innerHeight, r: 0, alpha: 1 };
    const w = document.createElement('div');
    w.className = 'shockwave';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 1200);
    blip(180, 0.35, 0.06);
  }

  btnPulse.addEventListener('click', () => firePulse());

  btnShuffle.addEventListener('click', () => {
    CHANNELS.forEach((_, i) => {
      setTimeout(() => {
        state.targets[i] = rand(0, 1);
        blip(300 + rand(0, 400), 0.04, 0.02);
      }, i * 110);
    });
  });

  btnMute.addEventListener('click', () => {
    state.audioOn = !state.audioOn;
    btnMute.textContent = state.audioOn ? 'SND ON' : 'SND OFF';
    btnMute.setAttribute('aria-pressed', String(state.audioOn));
    if (state.audioOn) blip(660, 0.1, 0.05);
  });

  document.getElementById('hud-moods').addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn');
    if (!btn) return;
    document.querySelectorAll('.mood-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.body.dataset.mood = btn.dataset.mood;
    requestAnimationFrame(() => { palette = readPalette(); });
    blip(440, 0.08, 0.04);
  });

  window.addEventListener('keydown', (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= CHANNELS.length) { solo(n - 1); return; }
    if (e.code === 'Space') { e.preventDefault(); firePulse(); }
  });

  window.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    if (state.pointer.gx < -100) { state.pointer.gx = e.clientX; state.pointer.gy = e.clientY; }
  });

  // 点击空白处也触发涟漪脉冲
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.console, .hud')) return;
    firePulse(e.clientX, e.clientY);
  });

})();
