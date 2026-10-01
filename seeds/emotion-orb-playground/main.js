/* ═══════════════════════════════════════════════════════════════
   Emotion Orb Playground · 情绪光球游乐场
   维护者: EDEN
   ------------------------------------------------------------
   模块结构:
   1. EMOTIONS       情绪预设（色板 / 噪声 / 节律）
   2. STATE          全局可变状态
   3. DOM            元素引用与 UI 构建
   4. ORB ENGINE     噪声形变 + 果冻弹簧物理 + 呼吸节律
   5. PARTICLES      环绕粒子 / 冲击波 / 爆裂重组
   6. INTERACTION    拖拽 · 轻点 · 双击爆裂 · 键盘
   7. RENDER LOOP    帧循环（dt 归一化）
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  // === 1. EMOTIONS · 情绪预设 ===
  // noiseAmp: 形变幅度  noiseSpeed: 流变速率  breath: 呼吸周期(秒)
  // spike: 尖锐度(高频权重)  particleRate: 环绕粒子生成密度
  const EMOTIONS = [
    {
      id: 'joy', en: 'JOY', zh: '喜悦', ico: '☀', key: '1', chip: '#ffd166',
      colors: ['#ffe29a', '#ffb347', '#ff8fab'], glow: 'rgba(255,209,102,0.45)',
      noiseAmp: 0.16, noiseSpeed: 1.5, breath: 3.2, spike: 0.35, particleRate: 6
    },
    {
      id: 'calm', en: 'CALM', zh: '平静', ico: '◌', key: '2', chip: '#7ae7c7',
      colors: ['#bffcf0', '#5ad3b3', '#3a9e9c'], glow: 'rgba(122,231,199,0.4)',
      noiseAmp: 0.06, noiseSpeed: 0.45, breath: 7.5, spike: 0.1, particleRate: 2
    },
    {
      id: 'rage', en: 'RAGE', zh: '愤怒', ico: '✕', key: '3', chip: '#ff5c5c',
      colors: ['#ffb08a', '#ff4d4d', '#a31232'], glow: 'rgba(255,92,92,0.5)',
      noiseAmp: 0.3, noiseSpeed: 3.2, breath: 1.4, spike: 0.85, particleRate: 10
    },
    {
      id: 'sorrow', en: 'SORROW', zh: '忧郁', ico: '☂', key: '4', chip: '#7f9bff',
      colors: ['#c7d6ff', '#7f9bff', '#3d4d8f'], glow: 'rgba(127,155,255,0.4)',
      noiseAmp: 0.11, noiseSpeed: 0.3, breath: 9, spike: 0.18, particleRate: 3
    },
    {
      id: 'wonder', en: 'WONDER', zh: '惊叹', ico: '✦', key: '5', chip: '#d38cff',
      colors: ['#f0d0ff', '#c77dff', '#7b2cbf'], glow: 'rgba(211,140,255,0.45)',
      noiseAmp: 0.2, noiseSpeed: 1.0, breath: 4.6, spike: 0.6, particleRate: 8
    },
    {
      id: 'fear', en: 'FEAR', zh: '不安', ico: '⚡', key: '6', chip: '#b8e04a',
      colors: ['#e8ffb0', '#a8d43c', '#5a7a12'], glow: 'rgba(184,224,74,0.42)',
      noiseAmp: 0.24, noiseSpeed: 4.0, breath: 1.9, spike: 0.5, particleRate: 7
    }
  ];

  // === 2. STATE ===
  const canvas = document.getElementById('orb-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  let time = 0;
  let energy = 0.62;            // 用户能量滑杆 [0..1]
  let emotionIndex = 0;         // 当前情绪下标
  let waveCount = 3;            // 噪声波数（随能量浮动）

  // 光球物理状态
  const orb = {
    x: 0, y: 0,                 // 实际位置
    vx: 0, vy: 0,               // 速度
    ax: 0, ay: 0,               // 锚点（拖拽目标）
    baseR: 150,                 // 基础半径
    scale: 1, targetScale: 1,   // 爆裂重组缩放
    burst: 0,                   // 爆裂进度 0..1
    dragging: false,
    poked: 0                    // 戳击余韵
  };

  // 情绪参数插值器（当前值向目标值缓动）
  const params = {
    noiseAmp: 0.16, noiseSpeed: 1.5, breath: 3.2,
    spike: 0.35, particleRate: 6
  };

  const particles = [];   // 环绕粒子
  const shockwaves = [];  // 冲击波环
  const bursts = [];      // 爆裂飞散粒子

  const pointer = { x: -999, y: -999, px: -999, py: -999, down: false, inside: false };
  const cursor = { x: -999, y: -999, tx: -999, ty: -999 };

  // === 3. DOM ===
  const dockEmotions = document.getElementById('dock-emotions');
  const energyInput = document.getElementById('energy');
  const energyValue = document.getElementById('energy-value');
  const pulseBtn = document.getElementById('pulse-btn');
  const roEmotion = document.getElementById('ro-emotion');
  const roEnergy = document.getElementById('ro-energy');
  const roWaves = document.getElementById('ro-waves');
  const roStatus = document.getElementById('ro-status');
  const flash = document.getElementById('emotion-flash');
  const flashEn = document.getElementById('flash-en');
  const flashZh = document.getElementById('flash-zh');
  const brandGlyph = document.getElementById('brand-glyph');
  const cursorRing = document.getElementById('cursor-ring');
  const cursorDot = document.getElementById('cursor-dot');
  const root = document.documentElement;

  function buildDock() {
    EMOTIONS.forEach((e, i) => {
      const btn = document.createElement('button');
      btn.className = 'emotion-chip' + (i === 0 ? ' is-active' : '');
      btn.style.setProperty('--chip', e.chip);
      btn.setAttribute('aria-label', `切换到 ${e.zh} ${e.en}`);
      btn.innerHTML =
        `<span class="chip-ico">${e.ico}</span>` +
        `<span class="chip-name">${e.zh}</span>` +
        `<span class="chip-key mono">[${e.key}]</span>`;
      btn.addEventListener('click', () => setEmotion(i));
      dockEmotions.appendChild(btn);
    });
  }

  // === 4. ORB ENGINE ===

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    orb.baseR = Math.min(W, H) * 0.19;
    if (!orb.dragging) { orb.ax = W * 0.5; orb.ay = H * 0.48; }
  }

  // 多层正弦叠加伪噪声: 返回 θ 处的形变系数 [-1..1]
  function noiseAt(theta, t, amp, spike) {
    const speed = params.noiseSpeed;
    let n = 0;
    n += Math.sin(theta * 3 + t * speed * 1.1) * 0.55;
    n += Math.sin(theta * 5 - t * speed * 1.7 + 2.1) * 0.3;
    n += Math.sin(theta * 2 + t * speed * 0.6 + 4.4) * 0.4;
    // 高频尖锐波（spike 权重）
    n += Math.sin(theta * 9 + t * speed * 3.1 + 1.3) * 0.22 * spike;
    n += Math.sin(theta * 13 - t * speed * 2.3) * 0.13 * spike;
    return n * amp;
  }

  function updatePhysics(dt) {
    // 情绪参数缓动插值（非线性收敛）
    const target = EMOTIONS[emotionIndex];
    const k = 1 - Math.pow(0.001, dt * 1.4);
    params.noiseAmp += (target.noiseAmp - params.noiseAmp) * k;
    params.noiseSpeed += (target.noiseSpeed - params.noiseSpeed) * k;
    params.breath += (target.breath - params.breath) * k;
    params.spike += (target.spike - params.spike) * k;
    params.particleRate += (target.particleRate - params.particleRate) * k;

    if (!orb.dragging) {
      // 锚点缓慢漂移（思绪游荡）
      orb.ax = W * 0.5 + Math.sin(time * 0.21) * W * 0.05;
      orb.ay = H * 0.48 + Math.cos(time * 0.16) * H * 0.05;
    }

    // 果冻弹簧（欠阻尼）
    const stiff = orb.dragging ? 62 : 34;
    const damp = orb.dragging ? 12 : 7.5;
    orb.vx += ((orb.ax - orb.x) * stiff - orb.vx * damp) * dt;
    orb.vy += ((orb.ay - orb.y) * stiff - orb.vy * damp) * dt;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;

    // 戳击余韵衰减
    orb.poked = Math.max(0, orb.poked - dt * 2.2);

    // 爆裂重组缩放
    orb.scale += (orb.targetScale - orb.scale) * (1 - Math.pow(0.0005, dt));

    // 能量驱动的波数微调
    waveCount = Math.round(2 + energy * 3);
  }

  function currentRadius() {
    const e = EMOTIONS[emotionIndex];
    const eAmp = params.noiseAmp * (0.55 + energy * 0.85);
    const breathScale = 1 + Math.sin(time * (Math.PI * 2 / params.breath)) * 0.045 * (0.5 + energy);
    const pokeScale = 1 + orb.poked * 0.14;
    return { e, eAmp, breathScale, pokeScale };
  }

  function drawOrb(t) {
    const { e, eAmp, breathScale, pokeScale } = currentRadius();
    const R = orb.baseR * breathScale * pokeScale * orb.scale;

    // 速度方向拉伸（果冻感）
    const vMag = Math.hypot(orb.vx, orb.vy);
    const stretch = Math.min(vMag * 0.00042, 0.22);
    const ang = Math.atan2(orb.vy, orb.vx);

    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.rotate(ang);
    ctx.scale(1 + stretch, 1 - stretch * 0.7);
    ctx.rotate(-ang);

    // 光晕
    ctx.shadowColor = e.glow;
    ctx.shadowBlur = 60 + energy * 70 + orb.poked * 90;

    // 轮廓采样
    const SEG = 140;
    ctx.beginPath();
    for (let i = 0; i <= SEG; i++) {
      const theta = (i / SEG) * Math.PI * 2;
      const n = noiseAt(theta, t, eAmp, params.spike);

      // 光标吸引局部隆起
      let bulge = 0;
      if (pointer.inside && !orb.dragging) {
        const dx = pointer.x - orb.x, dy = pointer.y - orb.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const pAng = Math.atan2(dy, dx);
          let dTheta = theta - pAng;
          while (dTheta > Math.PI) dTheta -= Math.PI * 2;
          while (dTheta < -Math.PI) dTheta += Math.PI * 2;
          const proximity = Math.max(0, 1 - dist / (R * 3.4));
          bulge = Math.exp(-Math.pow(dTheta * 2.6, 2)) * proximity * 0.14 * (0.4 + energy);
        }
      }

      const r = R * (1 + n + bulge);
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // 主体渐变
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.25);
    g.addColorStop(0, e.colors[0]);
    g.addColorStop(0.55, e.colors[1]);
    g.addColorStop(1, e.colors[2]);
    ctx.fillStyle = g;
    ctx.globalAlpha = orb.scale * 0.92;
    ctx.fill();

    // 内侧高光（微晶质感）
    ctx.shadowBlur = 0;
    const hi = ctx.createRadialGradient(-R * 0.32, -R * 0.38, 0, -R * 0.32, -R * 0.38, R * 0.7);
    hi.addColorStop(0, 'rgba(255,255,255,0.5)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.fill();

    // 描边
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // === 5. PARTICLES ===

  function spawnAmbientParticle() {
    const e = EMOTIONS[emotionIndex];
    const { breathScale } = currentRadius();
    const R = orb.baseR * breathScale;
    const a = Math.random() * Math.PI * 2;
    particles.push({
      x: orb.x + Math.cos(a) * R * (1.15 + Math.random() * 0.5),
      y: orb.y + Math.sin(a) * R * (1.15 + Math.random() * 0.5),
      vx: 0, vy: 0,
      life: 1, decay: 0.24 + Math.random() * 0.3,
      size: 1 + Math.random() * 2.4,
      color: e.colors[Math.floor(Math.random() * 3)],
      orbit: (Math.random() - 0.5) * 1.6,
      phase: a
    });
  }

  function spawnShockwave(x, y, strong) {
    shockwaves.push({ x, y, r: 10, max: strong ? 520 : 300, life: 1 });
  }

  function spawnBurst() {
    const e = EMOTIONS[emotionIndex];
    const { breathScale } = currentRadius();
    const R = orb.baseR * breathScale;
    for (let i = 0; i < 130; i++) {
      const a = (i / 130) * Math.PI * 2 + Math.random() * 0.3;
      const sp = 220 + Math.random() * 620 * (0.5 + energy);
      bursts.push({
        x: orb.x + Math.cos(a) * R * 0.5,
        y: orb.y + Math.sin(a) * R * 0.5,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: 0.55 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 3.5,
        color: e.colors[Math.floor(Math.random() * 3)]
      });
    }
  }

  function updateParticles(dt) {
    // 环绕粒子生成
    if (orb.scale > 0.5 && Math.random() < params.particleRate * (0.35 + energy) * dt) {
      spawnAmbientParticle();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay * dt;
      // 缓慢环绕 + 漂离
      p.phase += p.orbit * dt;
      const drift = 14 * dt;
      p.x += Math.cos(p.phase) * drift + (Math.random() - 0.5) * 18 * dt;
      p.y += Math.sin(p.phase) * drift - 12 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.r += (s.max - s.r) * (1 - Math.pow(0.02, dt));
      s.life -= dt * 1.15;
      if (s.life <= 0) shockwaves.splice(i, 1);
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= b.decay * dt;
      b.vx *= Math.pow(0.32, dt);
      b.vy *= Math.pow(0.32, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) bursts.splice(i, 1);
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      ctx.globalAlpha = p.life * 0.65;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of shockwaves) {
      ctx.globalAlpha = s.life * 0.5;
      ctx.strokeStyle = EMOTIONS[emotionIndex].colors[1];
      ctx.lineWidth = 2.4 * s.life;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = s.life * 0.22;
      ctx.lineWidth = 8 * s.life;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.94, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const b of bursts) {
      ctx.globalAlpha = b.life * 0.9;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * b.life, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // === 6. INTERACTION ===

  function isOnOrb(x, y) {
    const { breathScale } = currentRadius();
    const R = orb.baseR * breathScale * 1.25;
    return Math.hypot(x - orb.x, y - orb.y) < R;
  }

  function setEmotion(i) {
    if (i === emotionIndex && flash.classList.contains('play')) return;
    emotionIndex = i;
    const e = EMOTIONS[i];

    // UI 联动
    [...dockEmotions.children].forEach((c, j) =>
      c.classList.toggle('is-active', j === i));
    roEmotion.textContent = e.en;

    // 主题变量平滑过渡
    root.style.setProperty('--e1', e.chip);
    root.style.setProperty('--e2', e.colors[1]);
    root.style.setProperty('--e3', e.colors[2]);
    root.style.setProperty('--e-glow', e.glow);

    // 巨字闪现
    flashEn.textContent = e.en;
    flashZh.textContent = e.zh;
    flash.classList.remove('play');
    void flash.offsetWidth;
    flash.classList.add('play');

    // 图标旋转印记
    brandGlyph.classList.remove('is-spinning');
    void brandGlyph.offsetWidth;
    brandGlyph.classList.add('is-spinning');
    setTimeout(() => brandGlyph.textContent = e.ico, 250);

    // 切换情绪 = 光球脉冲
    orb.poked = 1;
    spawnShockwave(orb.x, orb.y, false);
    for (let n = 0; n < 3; n++) spawnAmbientParticle();
  }

  function emitPulse() {
    orb.poked = 1.4;
    spawnShockwave(orb.x, orb.y, true);
    for (let n = 0; n < 14; n++) spawnAmbientParticle();
    roStatus.textContent = 'PULSE!';
    roStatus.classList.add('is-unstable');
    setTimeout(() => {
      roStatus.textContent = 'STABLE';
      roStatus.classList.remove('is-unstable');
    }, 900);
  }

  function burstOrb() {
    if (orb.targetScale < 0.5) return;
    orb.targetScale = 0.02;
    spawnBurst();
    spawnShockwave(orb.x, orb.y, true);
    roStatus.textContent = 'BURST';
    roStatus.classList.add('is-unstable');
    // 非线性重组延迟
    setTimeout(() => { orb.targetScale = 1; }, 950);
    setTimeout(() => {
      roStatus.textContent = 'STABLE';
      roStatus.classList.remove('is-unstable');
    }, 1600);
  }

  let clickTimer = null;

  window.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.dock, .hud')) return;
    pointer.down = true;
    cursorRing.classList.add('is-down');
    const x = ev.clientX, y = ev.clientY;

    if (isOnOrb(x, y)) {
      // 双击爆裂 / 单击开始拖拽
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        burstOrb();
        return;
      }
      clickTimer = setTimeout(() => {
        clickTimer = null;
        orb.dragging = true;
        orb.ax = x; orb.ay = y;
      }, 220);
    } else {
      // 空白处轻点 = 引力涟漪，光球轻微被吸引
      spawnShockwave(x, y, false);
      orb.ax = orb.x + (x - orb.x) * 0.12;
      orb.ay = orb.y + (y - orb.y) * 0.12;
    }
  });

  window.addEventListener('pointermove', (ev) => {
    pointer.inside = true;
    pointer.x = ev.clientX;
    pointer.y = ev.clientY;
    const onOrb = isOnOrb(pointer.x, pointer.y) || orb.dragging;
    cursorRing.classList.toggle('is-hover', onOrb);
    if (orb.dragging) { orb.ax = pointer.x; orb.ay = pointer.y; }
  });

  window.addEventListener('pointerup', () => {
    pointer.down = false;
    cursorRing.classList.remove('is-down');
    if (orb.dragging) {
      orb.dragging = false;
      orb.poked = Math.min(1, Math.hypot(orb.vx, orb.vy) * 0.0009);
    }
  });

  window.addEventListener('pointerleave', () => {
    pointer.inside = false;
    pointer.x = -999; pointer.y = -999;
  });

  window.addEventListener('keydown', (ev) => {
    const idx = EMOTIONS.findIndex(e => e.key === ev.key);
    if (idx >= 0) { setEmotion(idx); return; }
    if (ev.code === 'Space') {
      ev.preventDefault();
      emitPulse();
    }
  });

  energyInput.addEventListener('input', () => {
    energy = energyInput.value / 100;
    energyValue.textContent = energyInput.value;
    energyInput.style.setProperty('--fill', energyInput.value + '%');
    roEnergy.textContent = energyInput.value + '%';
  });

  pulseBtn.addEventListener('click', emitPulse);

  // 自定义光标跟随（滞后环 + 即时点）
  function updateCursor() {
    if (pointer.x < -100) {
      cursorRing.style.opacity = '0';
      cursorDot.style.opacity = '0';
      return;
    }
    cursorRing.style.opacity = '1';
    cursorDot.style.opacity = '1';
    cursor.tx += (pointer.x - cursor.tx) * 0.18;
    cursor.ty += (pointer.y - cursor.ty) * 0.18;
    cursorRing.style.transform = `translate(${cursor.tx}px, ${cursor.ty}px)`;
    cursorDot.style.transform = `translate(${pointer.x}px, ${pointer.y}px)`;
  }

  // === 7. RENDER LOOP ===

  let lastT = performance.now();

  function loop(now) {
    let dt = (now - lastT) / 1000;
    lastT = now;
    dt = Math.min(dt, 0.05);   // 防切页大步长
    time += dt;

    updatePhysics(dt);
    updateParticles(dt);
    updateCursor();

    ctx.clearRect(0, 0, W, H);
    drawOrb(time);
    drawParticles();

    // 状态读出节流刷新
    if ((loop._acc = (loop._acc || 0) + dt) > 0.35) {
      loop._acc = 0;
      roWaves.textContent = String(waveCount);
    }

    requestAnimationFrame(loop);
  }

  // === INIT ===
  buildDock();
  resize();
  orb.x = orb.ax; orb.y = orb.ay;
  setEmotion(0);
  energyInput.style.setProperty('--fill', '62%');
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
})();
