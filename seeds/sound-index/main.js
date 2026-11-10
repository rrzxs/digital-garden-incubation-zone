/* ==========================================================================
   Sound Index 声音索引
   每枚索引词条 = 一件 Web Audio 合成乐器。
   悬停预览 / 点击演奏 / 键盘 [1-8] 击打 / Space 全场脉冲
   ========================================================================== */
(() => {
  'use strict';

  // === 配置：索引词条（每条 = 一种合成配方） ===
  const ENTRIES = [
    { key: 'PLUCK',  zh: '弦·拨奏',   accent: 'var(--c1)', synth: { type: 'pluck',  freq: 220,  decay: 0.5 } },
    { key: 'GLASS',  zh: '晶·铃音',   accent: 'var(--c2)', synth: { type: 'glass',  freq: 880,  decay: 1.6 } },
    { key: 'DRONE',  zh: '雾·持续音', accent: 'var(--c3)', synth: { type: 'drone',  freq: 110,  decay: 2.4 } },
    { key: 'PING',   zh: '声呐',      accent: 'var(--c4)', synth: { type: 'ping',   freq: 1320, decay: 0.9 } },
    { key: 'SUB',    zh: '低频脉冲',  accent: 'var(--c1)', synth: { type: 'sub',    freq: 55,   decay: 1.1 } },
    { key: 'CHIME',  zh: '风·编钟',   accent: 'var(--c2)', synth: { type: 'chime',  freq: 660,  decay: 2.0 } },
    { key: 'ZAP',    zh: '电·故障',   accent: 'var(--c3)', synth: { type: 'zap',    freq: 330,  decay: 0.35 } },
    { key: 'BLOOM',  zh: '花·泛音',   accent: 'var(--c4)', synth: { type: 'bloom',  freq: 440,  decay: 2.8 } }
  ];

  // === DOM Elements ===
  const grid = document.getElementById('indexGrid');
  const statCtx = document.getElementById('statCtx');
  const canvas = document.getElementById('waveCanvas');
  const ctx2d = canvas.getContext('2d');

  // === Audio Engine ===
  let actx = null;
  let master = null;
  let analyser = null;
  const freqData = new Uint8Array(256);
  const ripples = []; // { x, y, r, life, color }

  function ensureAudio() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = 0.55;
    analyser = actx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    master.connect(analyser);
    analyser.connect(actx.destination);
    statCtx.textContent = 'LIVE';
  }

  // 通用音符：多分音 + 指数衰减包络
  function voice({ type, freq, decay }, gainMul = 1) {
    ensureAudio();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime;
    const out = actx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5 * gainMul, t + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    out.connect(master);

    const partials = {
      pluck: [1, 2.01, 3.02],
      glass: [1, 2.76, 5.4],
      drone: [1, 1.5, 2.02],
      ping:  [1, 2.0],
      sub:   [1, 1.5],
      chime: [1, 3.1, 4.7],
      zap:   [1, 1.33, 2.67],
      bloom: [1, 2.0, 3.0, 5.0]
    }[type] || [1];

    const waves = { drone: 'sawtooth', zap: 'square', sub: 'sine' };
    partials.forEach((mul, i) => {
      const osc = actx.createOscillator();
      osc.type = waves[type] || 'sine';
      osc.frequency.setValueAtTime(freq * mul, t);
      if (type === 'zap') {
        osc.frequency.exponentialRampToValueAtTime(freq * mul * 0.4, t + decay);
      } else if (type === 'pluck') {
        osc.frequency.exponentialRampToValueAtTime(freq * mul * 0.985, t + decay);
      }
      const g = actx.createGain();
      g.gain.value = 1 / (i + 1.6);
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + decay + 0.1);
    });
  }

  // === 索引条目渲染 ===
  function buildEntry(item, i) {
    const el = document.createElement('article');
    el.className = 'entry';
    el.style.setProperty('--accent', item.accent);
    el.style.setProperty('--i', i + 1);
    el.dataset.index = i;
    el.innerHTML = `
      <div class="entry-num mono">IDX.0${i + 1}</div>
      <h2 class="entry-name">${item.key}</h2>
      <div class="entry-zh">${item.zh}</div>
      <svg class="entry-wave" viewBox="0 0 200 34" preserveAspectRatio="none">
        <path class="wave-path" fill="none" stroke="${item.accent}" stroke-width="1.5"
              stroke-linecap="round" opacity="0.9"></path>
      </svg>
      <div class="entry-meta mono">
        <span class="tag">${item.synth.type.toUpperCase()}</span>
        <span>${item.synth.freq} Hz</span>
      </div>`;
    grid.appendChild(el);

    // 静态波形：每种合成器签名波形
    const path = el.querySelector('.wave-path');
    const seed = i * 1.7;
    let d = 'M0 17';
    for (let x = 0; x <= 200; x += 4) {
      const p = x / 200;
      const env = Math.sin(p * Math.PI);
      let y;
      switch (item.synth.type) {
        case 'zap':     y = 17 + ((x % 16 < 8) ? 12 : -12) * env * (Math.random() > 0.85 ? 0.4 : 1); break;
        case 'drone':   y = 17 + (Math.sin(p * 6 + seed) * 6 + Math.sin(p * 17 + seed) * 4) * env; break;
        case 'sub':     y = 17 + Math.sin(p * 2.2 + seed) * 13 * env; break;
        case 'ping':    y = 17 + Math.sin(p * 30 + seed) * 12 * Math.pow(env, 0.4); break;
        case 'bloom':   y = 17 + (Math.sin(p * 10 + seed) * 5 + Math.sin(p * 23 + seed) * 8) * env; break;
        default:        y = 17 + Math.sin(p * 12 + seed) * 13 * env; // pluck/glass/chime
      }
      d += ` L${x} ${y.toFixed(1)}`;
    }
    path.setAttribute('d', d + ' L200 17');
    return el;
  }

  const entryEls = ENTRIES.map(buildEntry);
  document.getElementById('statCount').textContent = String(ENTRIES.length).padStart(2, '0');

  // === 交互：悬停预览 / 点击演奏 ===
  let hoveredAt = 0;
  entryEls.forEach((el, i) => {
    el.addEventListener('mouseenter', () => {
      const now = performance.now();
      if (now - hoveredAt < 220) return; // 防抖：扫过太快不发声
      hoveredAt = now;
      voice(ENTRIES[i].synth, 0.35);
    });
    el.addEventListener('click', (e) => {
      perform(i, e.clientX, e.clientY);
    });
  });

  function perform(i, x = innerWidth / 2, y = innerHeight / 2) {
    const item = ENTRIES[i];
    voice(item.synth, 1);
    const el = entryEls[i];
    el.classList.remove('playing');
    void el.offsetWidth; // 重启动画
    el.classList.add('playing');
    spawnRipple(x, y, item.accent);
  }

  function spawnRipple(x, y, color) {
    ripples.push({ x, y, r: 10, life: 1, color });
    const dot = document.createElement('div');
    dot.className = 'ripple-dot';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    if (!color.startsWith('var')) dot.style.borderColor = color;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 950);
  }

  // === 键盘：数字击打 / Space 全场脉冲 ===
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= ENTRIES.length) {
      const el = entryEls[n - 1];
      const r = el.getBoundingClientRect();
      perform(n - 1, r.left + r.width / 2, r.top + r.height / 2);
    } else if (e.code === 'Space') {
      e.preventDefault();
      ENTRIES.forEach((item, i) => setTimeout(() => {
        const el = entryEls[i];
        const r = el.getBoundingClientRect();
        perform(i, r.left + r.width / 2, r.top + r.height / 2);
      }, i * 90)); // 级联脉冲
    }
  });

  // === 配色切换 ===
  document.querySelectorAll('.pal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pal-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.body.dataset.palette = btn.dataset.pal.trim();
    });
  });

  // === 卡片 3D 光标倾斜（非线性） ===
  entryEls.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `translateY(-6px) scale(1.02) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  // === 波形画布：频谱呼吸 + 涟漪扩散 ===
  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    ctx2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function accentOf(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || '#7c5cff';
  }

  function draw() {
    ctx2d.clearRect(0, 0, innerWidth, innerHeight);

    // 频谱中心线
    if (analyser) {
      analyser.getByteFrequencyData(freqData);
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const n = 64;
      for (let i = 0; i < n; i++) {
        const v = freqData[i * 2] / 255;
        if (v < 0.02) continue;
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const len = 60 + v * 220;
        const c = i % 4 === 0 ? '--c2' : i % 3 === 0 ? '--c3' : '--c1';
        ctx2d.strokeStyle = accentOf(c);
        ctx2d.globalAlpha = 0.10 + v * 0.16;
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.moveTo(cx + Math.cos(a) * len * 0.55, cy + Math.sin(a) * len * 0.55);
        ctx2d.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;
    }

    // 涟漪
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 9;
      rp.life -= 0.022;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx2d.strokeStyle = rp.color.startsWith('var') ? accentOf(rp.color.replace('var(', '').replace(')', '')) : rp.color;
      ctx2d.globalAlpha = rp.life * 0.5;
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx2d.stroke();
    }
    ctx2d.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // 首次任意交互后解锁 AudioContext
  const unlock = () => { ensureAudio(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);
})();
