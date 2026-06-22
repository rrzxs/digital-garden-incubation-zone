/* ==========================================================================
   Robotics Signal Scope · 交互逻辑
   实时波形引擎 + 多通道合成 + 模式切换 + 参数调制 + 涟漪微交互
   ========================================================================== */

(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('scopeCanvas');
  const ctx = canvas.getContext('2d');
  const rippleLayer = document.getElementById('rippleLayer');

  const scopeTitle = document.getElementById('scopeTitle');
  const scopeSub = document.getElementById('scopeSub');
  const hudMode = document.getElementById('hudMode');
  const hudT = document.getElementById('hudT');

  const rdFreq = document.getElementById('rdFreq');
  const rdAmp = document.getElementById('rdAmp');
  const rdPhase = document.getElementById('rdPhase');

  const freqSlider = document.getElementById('freqSlider');
  const ampSlider = document.getElementById('ampSlider');
  const jitterSlider = document.getElementById('jitterSlider');
  const sweepSlider = document.getElementById('sweepSlider');
  const freqVal = document.getElementById('freqVal');
  const ampVal = document.getElementById('ampVal');
  const jitterVal = document.getElementById('jitterVal');
  const sweepVal = document.getElementById('sweepVal');

  const channelsEl = document.getElementById('channels');
  const waveGrid = document.getElementById('waveGrid');

  const mCpu = document.getElementById('mCpu'); const mCpuV = document.getElementById('mCpuV');
  const mMem = document.getElementById('mMem'); const mMemV = document.getElementById('mMemV');
  const mNet = document.getElementById('mNet'); const mNetV = document.getElementById('mNetV');
  const mBatt = document.getElementById('mBatt'); const mBattV = document.getElementById('mBattV');

  const tickerTrack = document.getElementById('tickerTrack');

  // === 状态模型 ===
  const state = {
    mode: 'oscilloscope',
    wave: 'sine',
    freq: 2.0,
    amp: 0.7,
    jitter: 0.12,
    sweep: 0.3,
    t: 0,
    phase: 0,
    channels: [
      { id: 'CH1', label: 'Servo α', color: '#38e8ff', on: true,  offset: 0.0 },
      { id: 'CH2', label: 'Servo β', color: '#a78bfa', on: true,  offset: 1.6 },
      { id: 'CH3', label: 'IMU Gyro', color: '#4ade80', on: true,  offset: 3.1 },
      { id: 'CH4', label: 'LiDAR', color: '#fbbf24', on: false, offset: 4.7 }
    ]
  };

  // === 模式描述 ===
  const MODE_META = {
    oscilloscope: { title: 'OSCILLOSCOPE', sub: '实时多通道波形 · 1.2 GSa/s' },
    spectrum:     { title: 'SPECTRUM',     sub: 'FFT 频谱分析 · 0–8 kHz' },
    radar:        { title: 'RADAR SCAN',   sub: '360° 雷达扫描 · 4 Hz' },
    telemetry:    { title: 'TELEMETRY',    sub: '遥测数据流 · 1 Hz 推送' }
  };

  // === 1. Canvas 尺寸自适应 ===
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);

  // === 2. 波形函数库 ===
  function waveFn(type, phase, jitter) {
    const j = (Math.random() - 0.5) * jitter;
    switch (type) {
      case 'sine':     return Math.sin(phase + j);
      case 'square':   return Math.sign(Math.sin(phase + j)) * 0.92;
      case 'triangle': return (2 / Math.PI) * Math.asin(Math.sin(phase + j));
      case 'sawtooth': return (2 * (((phase + j) / (2 * Math.PI)) % 1)) - 1;
      case 'noise':    return (Math.random() * 2 - 1) * 0.85;
      case 'pulse':    return ((phase % (2 * Math.PI)) < 0.5) ? 0.9 : -0.3;
      default:         return 0;
    }
  }

  // === 3. 各模式渲染 ===

  function renderOscilloscope(w, h) {
    const active = state.channels.filter(c => c.on);
    if (!active.length) return;

    const sweepOffset = state.sweep * Math.sin(state.t * 0.4) * 0.6;
    const baseFreq = state.freq * 0.9;

    active.forEach((ch, idx) => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ch.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ch.color;

      const yMid = h * (0.5 + (idx - (active.length - 1) / 2) * 0.18);
      const amp = state.amp * h * 0.22;

      for (let x = 0; x <= w; x += 1.5) {
        const phase = (x / w) * Math.PI * 2 * baseFreq + state.t + ch.offset + sweepOffset;
        const y = yMid - waveFn(state.wave, phase, state.jitter) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  }

  function renderSpectrum(w, h) {
    const active = state.channels.filter(c => c.on);
    const bars = 64;
    const gap = 2;
    const barW = (w - gap * bars) / bars;

    active.forEach((ch, ci) => {
      for (let i = 0; i < bars; i++) {
        // 频谱包络: 主频峰 + 谐波 + 噪底
        const dist = Math.abs(i - bars * 0.18 * (ci + 1));
        const peak = Math.exp(-dist * dist / (bars * 0.6));
        const harm = Math.exp(-Math.pow(i - bars * 0.4 * (ci + 1), 2) / (bars * 1.5)) * 0.5;
        const noise = (Math.sin(state.t * 3 + i * 0.5 + ci) * 0.5 + 0.5) * 0.15;
        const v = (peak + harm + noise) * state.amp * (1 - i / bars * 0.3);

        const barH = Math.max(2, v * h * 0.7);
        const x = i * (barW + gap);
        const y = h - barH - ci * 4;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, ch.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ch.color;
        ctx.fillRect(x, y, barW, barH);
      }
    });
    ctx.shadowBlur = 0;
  }

  function renderRadar(w, h) {
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.42;

    // 同心圆
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R / 4) * i, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 十字线
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // 扫描扇形
    const angle = state.t * 0.8;
    const sweepGrad = ctx.createConicGradient
      ? ctx.createConicGradient(angle, cx, cy)
      : null;
    if (sweepGrad) {
      sweepGrad.addColorStop(0, 'rgba(56,232,255,0.35)');
      sweepGrad.addColorStop(0.15, 'rgba(56,232,255,0)');
      sweepGrad.addColorStop(1, 'rgba(56,232,255,0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    }

    // 扫描线
    ctx.strokeStyle = '#38e8ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38e8ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 目标点
    const targets = state._radarTargets || (state._radarTargets = generateTargets(R));
    targets.forEach(t => {
      const a = Math.atan2(t.y, t.x);
      const angDiff = Math.abs(((a - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      t.glow = Math.max(t.glow * 0.96, angDiff < 0.2 ? 1 : t.glow);
      const r = 3 + t.glow * 5;
      ctx.fillStyle = `rgba(74,222,128,${0.3 + t.glow * 0.7})`;
      ctx.shadowBlur = 10 * t.glow;
      ctx.shadowColor = '#4ade80';
      ctx.beginPath();
      ctx.arc(cx + t.x, cy + t.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function generateTargets(R) {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * R * 0.85;
      arr.push({ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, glow: 0 });
    }
    return arr;
  }

  function renderTelemetry(w, h) {
    const active = state.channels.filter(c => c.on);
    const colW = w / active.length;

    active.forEach((ch, ci) => {
      const cx = colW * ci + colW / 2;
      // 历史值柱状
      ch._hist = ch._hist || new Array(40).fill(0.5);
      const v = (waveFn(state.wave, state.t * 1.5 + ch.offset, state.jitter) * 0.5 + 0.5) * state.amp;
      ch._hist.shift();
      ch._hist.push(v);

      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = ch.color;
      ctx.beginPath();
      const barH = h * 0.5;
      const stepX = colW * 0.7 / ch._hist.length;
      ch._hist.forEach((val, i) => {
        const x = cx - colW * 0.35 + i * stepX;
        const y = h - val * barH - 20;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 当前值点
      const lastV = ch._hist[ch._hist.length - 1];
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.arc(cx + colW * 0.35, h - lastV * barH - 20, 4, 0, Math.PI * 2);
      ctx.fill();

      // 标签
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px "Share Tech Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(ch.id, cx, h - 8);
      ctx.fillText((lastV * 3.3).toFixed(2) + 'V', cx, 18);
    });
    ctx.textAlign = 'start';
    ctx.shadowBlur = 0;
  }

  // === 4. 主渲染循环 ===
  function render() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;

    // 拖尾清屏（保留残影）
    ctx.fillStyle = 'rgba(5,8,22,0.18)';
    ctx.fillRect(0, 0, w, h);

    switch (state.mode) {
      case 'oscilloscope': renderOscilloscope(w, h); break;
      case 'spectrum':     renderSpectrum(w, h);     break;
      case 'radar':        renderRadar(w, h);        break;
      case 'telemetry':    renderTelemetry(w, h);    break;
    }

    state.t += 0.04 + state.sweep * 0.02;
    state.phase = (state.phase + 0.5) % 360;

    // HUD 更新
    hudT.textContent = 'T = ' + state.t.toFixed(3) + 's';
    rdFreq.textContent = (state.freq * 220).toFixed(1);
    rdAmp.textContent = state.amp.toFixed(2);
    rdPhase.textContent = state.phase.toFixed(1);

    requestAnimationFrame(render);
  }

  // === 5. 通道渲染 ===
  function renderChannels() {
    channelsEl.innerHTML = '';
    state.channels.forEach((ch, idx) => {
      const el = document.createElement('div');
      el.className = 'channel' + (ch.on ? '' : ' is-off');
      el.innerHTML =
        '<div class="channel__swatch" style="background:' + ch.color + ';box-shadow:0 0 8px ' + ch.color + '"></div>' +
        '<span class="channel__label">' + ch.id + ' · ' + ch.label + '</span>' +
        '<span class="channel__val">' + (ch.on ? 'ACTIVE' : 'OFF') + '</span>';
      el.addEventListener('click', () => {
        ch.on = !ch.on;
        renderChannels();
        spawnRipple(window.innerWidth - 180, 140 + idx * 48);
      });
      channelsEl.appendChild(el);
    });
  }

  // === 6. 波形按钮 ===
  waveGrid.querySelectorAll('.wave-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      waveGrid.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.wave = btn.dataset.wave;
    });
  });

  // === 7. 滑块绑定 ===
  function bindSlider(slider, valEl, key, fmt) {
    slider.addEventListener('input', () => {
      state[key] = parseFloat(slider.value);
      valEl.textContent = fmt(state[key]);
    });
  }
  bindSlider(freqSlider, freqVal, 'freq', v => v.toFixed(1) + '×');
  bindSlider(ampSlider, ampVal, 'amp', v => v.toFixed(2));
  bindSlider(jitterSlider, jitterVal, 'jitter', v => v.toFixed(2));
  bindSlider(sweepSlider, sweepVal, 'sweep', v => v.toFixed(2));

  // === 8. 模式切换 ===
  document.querySelectorAll('.nav-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.nav-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.mode = chip.dataset.mode;
      const meta = MODE_META[state.mode];
      scopeTitle.textContent = meta.title;
      scopeSub.textContent = meta.sub;
      hudMode.textContent = 'MODE · ' + meta.title;
    });
  });

  // === 9. 主题切换 ===
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.body.dataset.theme = dot.dataset.theme;
    });
  });

  // === 10. 涟漪微交互 ===
  function spawnRipple(x, y) {
    const r = document.createElement('div');
    r.className = 'ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    rippleLayer.appendChild(r);
    setTimeout(() => r.remove(), 900);
  }
  document.addEventListener('click', (e) => {
    spawnRipple(e.clientX, e.clientY);
  });

  // === 11. 系统指标动画 ===
  function jitterMetrics() {
    const target = () => 20 + Math.random() * 60;
    const set = (bar, val, suffix) => {
      const v = Math.round(target());
      bar.style.width = v + '%';
      val.textContent = v + suffix;
    };
    set(mCpu, mCpuV, '%');
    set(mMem, mMemV, '%');
    set(mNet, mNetV, '%');
    // 电池缓慢下降
    const b = parseInt(mBattV.textContent) - (Math.random() < 0.3 ? 1 : 0);
    const bv = b < 40 ? 87 : b;
    mBatt.style.width = bv + '%';
    mBattV.textContent = bv + '%';
  }
  setInterval(jitterMetrics, 2500);

  // === 12. 底部 Ticker ===
  function buildTicker() {
    const items = [
      '⟨ STATUS ⟩', 'NOMINAL', '⟨ LINK ⟩', '<b>STABLE</b>',
      '⟨ LAT ⟩', '<b>12ms</b>', '⟨ SERVO ⟩', '4/4 OK',
      '⟨ IMU ⟩', '<b>CALIBRATED</b>', '⟨ BATT ⟩', '<b>87%</b>',
      '⟨ TEMP ⟩', '42.1°C', '⟨ TORQUE ⟩', '<b>0.78 Nm</b>',
      '⟨ VIB ⟩', 'LOW', '⟨ ENCODER ⟩', '2048 CPR',
      '⟨ RF ⟩', '<b>-42 dBm</b>', '⟨ PACKET ⟩', '1.2k/s'
    ];
    const html = items.map(t => '<span>' + t + '</span>').join('');
    tickerTrack.innerHTML = html + html; // 双份实现无缝循环
  }

  // === 启动 ===
  resizeCanvas();
  renderChannels();
  buildTicker();
  jitterMetrics();
  requestAnimationFrame(render);
})();
