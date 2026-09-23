/* ============================================================
   HUMANOID/COMPARE · 人形机体对比舱
   Vanilla JS · 免构建 · 高阶微交互
   ============================================================ */
(function () {
  'use strict';

  // === 机体数据库（虚构混合规格，供交互演示） ===
  const UNITS = [
    {
      id: 'atlas-v', vendor: 'Boston Dynamics', name: 'Atlas V',
      tagline: '动态平衡的公园跑酷者，液压时代的绝唱。',
      specs: { height: 150, weight: 89, speed: 2.5, payload: 25, dof: 28, battery: 60, price: 250 },
      extras: { drive: '电液混合伺服', sensors: '深度相机 + IMU', debut: '2024', code: 'ATL-05' }
    },
    {
      id: 'optimus-g', vendor: 'Tesla', name: 'Optimus Gen-3',
      tagline: '为量产而生的流水线舞者，神经网络驱动。',
      specs: { height: 173, weight: 57, speed: 2.2, payload: 20, dof: 28, battery: 240, price: 30 },
      extras: { drive: '旋转执行器', sensors: '多目视觉 + 内部传感器', debut: '2025', code: 'OPT-G3' }
    },
    {
      id: 'figure-03', vendor: 'Figure AI', name: 'Figure 03',
      tagline: '在工厂与家庭之间寻找通用性的一切可能。',
      specs: { height: 168, weight: 60, speed: 1.4, payload: 20, dof: 41, battery: 300, price: 45 },
      extras: { drive: '准直齿轮执行器', sensors: '视觉语言动作模型 VLA', debut: '2025', code: 'FGU-03' }
    },
    {
      id: 'unitree-g1', vendor: 'Unitree', name: 'Unitree G1',
      tagline: '轻量灵活的开放平台，开发者的第一台本体。',
      specs: { height: 132, weight: 35, speed: 2.0, payload: 8, dof: 23, battery: 120, price: 16 },
      extras: { drive: '空心杯关节电机', sensors: '3D LiDAR + 深度相机', debut: '2024', code: 'UTG-01' }
    },
    {
      id: 'porter-x', vendor: 'Sanctuary AI', name: 'Porter X',
      tagline: '以灵巧双手为信仰的触觉工作者。',
      specs: { height: 160, weight: 62, speed: 1.1, payload: 25, dof: 34, battery: 180, price: 80 },
      extras: { drive: '液压+电动混合', sensors: '触觉指尖 + 视觉', debut: '2025', code: 'SPX-01' }
    },
    {
      id: 'amika-s', vendor: 'Engineered Arts', name: 'Amika S',
      tagline: '表情与凝视的艺术家，人机情感界面的极限。',
      specs: { height: 165, weight: 49, speed: 0.9, payload: 5, dof: 35, battery: 90, price: 130 },
      extras: { drive: '微型伺服阵列', sensors: '眼动 + 面部编码', debut: '2024', code: 'AMK-0S' }
    },
    {
      id: 'talon-h', vendor: 'Apptronik', name: 'Talon H',
      tagline: '为物流仓储昼夜不休的重载长跑选手。',
      specs: { height: 170, weight: 73, speed: 1.8, payload: 35, dof: 30, battery: 260, price: 95 },
      extras: { drive: '系列弹性执行器 SEA', sensors: '力控 + 环绕视觉', debut: '2025', code: 'TLN-H1' }
    },
    {
      id: 'sr1-nova', vendor: 'Studio SR', name: 'SR-1 Nova',
      tagline: '概念验证形态：全向轮足混合的移动实验室。',
      specs: { height: 145, weight: 42, speed: 3.6, payload: 12, dof: 26, battery: 200, price: 22 },
      extras: { drive: '轮足混合驱动', sensors: '全景环视阵列', debut: '2026', code: 'SR1-NV' }
    }
  ];

  // === 对比指标定义 ===
  // max: 用于归一化的量程; fmt: 值格式化; unit: 单位
  const METRICS = [
    { key: 'height',  label: '身高',   en: 'HEIGHT',  unit: 'cm', max: 190, digits: 0 },
    { key: 'weight',  label: '重量',   en: 'WEIGHT',  unit: 'kg', max: 100, digits: 0, lowerBetter: true },
    { key: 'speed',   label: '移动速度', en: 'SPEED',  unit: 'm/s', max: 4, digits: 1 },
    { key: 'payload', label: '负载',   en: 'PAYLOAD', unit: 'kg', max: 40, digits: 0 },
    { key: 'dof',     label: '自由度',  en: 'DOF',    unit: 'DOF', max: 45, digits: 0 },
    { key: 'battery', label: '续航',   en: 'BATTERY', unit: 'min', max: 320, digits: 0 },
    { key: 'price',   label: '成本指数', en: 'COST',   unit: 'k$', max: 260, digits: 0, lowerBetter: true }
  ];

  // === 状态 ===
  const state = {
    theme: 'aurora',
    a: UNITS[0].id,
    b: UNITS[2].id,
    radarAnim: 0,       // 雷达展开进度 0→1
    barAnim: {},        // 每条能力条展开进度
    ripples: []         // 点击涟漪
  };

  // === DOM Elements ===
  const $ = (sel) => document.querySelector(sel);
  const body = document.body;
  const chipsA = $('#chips-a');
  const chipsB = $('#chips-b');
  const swapBtn = $('#swap-btn');
  const radarCanvas = $('#radar-canvas');
  const radarCtx = radarCanvas.getContext('2d');
  const pulseGrid = $('#pulse-grid');
  const deltaReadout = $('#delta-readout');
  const specA = $('#spec-a');
  const specB = $('#spec-b');
  const particleCanvas = $('#particle-canvas');

  // === 主题色解析（从 CSS 变量读取实时颜色） ===
  function cssVar(name) {
    return getComputedStyle(body).getPropertyValue(name).trim();
  }
  function themeColors() {
    return { a: cssVar('--c-a'), b: cssVar('--c-b'), ink: cssVar('--ink'), dim: cssVar('--dim') };
  }

  // === 主题切换 ===
  const themeDots = document.querySelectorAll('.theme-dot');
  function setTheme(t) {
    state.theme = t;
    body.dataset.theme = t;
    themeDots.forEach((d) => d.classList.toggle('active', d.dataset.theme === t));
    try { localStorage.setItem('hc-theme', t); } catch (e) { /* ignore */ }
  }
  themeDots.forEach((d) => d.addEventListener('click', () => setTheme(d.dataset.theme)));
  try {
    const saved = localStorage.getItem('hc-theme');
    if (saved) setTheme(saved);
  } catch (e) { /* ignore */ }

  // === 机体选择 chips ===
  function getUnit(id) { return UNITS.find((u) => u.id === id); }

  function buildChips(container, side) {
    container.innerHTML = '';
    UNITS.forEach((u, i) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = u.name;
      chip.style.transitionDelay = (i * 18) + 'ms';
      chip.addEventListener('click', () => {
        // 防止两侧选同一台：若冲突则互换
        if (side === 'a' && state.b === u.id) state.b = state.a;
        if (side === 'b' && state.a === u.id) state.a = state.b;
        state[side] = u.id;
        syncChips();
        restartAnimations();
        renderSpecs();
      });
      container.appendChild(chip);
    });
  }

  function syncChips() {
    [...chipsA.children].forEach((c, i) => {
      c.classList.toggle('selected-a', UNITS[i].id === state.a);
    });
    [...chipsB.children].forEach((c, i) => {
      c.classList.toggle('selected-b', UNITS[i].id === state.b);
    });
  }

  // === 交换按钮（磁力 + 旋转 + 涟漪） ===
  swapBtn.addEventListener('click', () => {
    const t = state.a; state.a = state.b; state.b = t;
    swapBtn.classList.remove('spinning', 'pulse');
    void swapBtn.offsetWidth; // 重启动画
    swapBtn.classList.add('spinning', 'pulse');
    syncChips();
    restartAnimations();
    renderSpecs();
    burstParticles(radarCenter().x, radarCenter().y);
  });
  // 磁力跟随
  swapBtn.addEventListener('mousemove', (e) => {
    const r = swapBtn.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) * 0.28;
    const dy = (e.clientY - r.top - r.height / 2) * 0.28;
    swapBtn.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
  });
  swapBtn.addEventListener('mouseleave', () => { swapBtn.style.transform = ''; });

  // === 动画进度管理 ===
  function restartAnimations() {
    state.radarAnim = 0;
    state.barAnim = {};
    METRICS.forEach((m, i) => { state.barAnim[m.key] = { start: performance.now() + i * 90, done: false }; });
    renderBars(true);
  }

  // ============================================================
  // 雷达共振图
  // ============================================================
  function radarCenter() {
    const r = radarCanvas.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function radarPoint(cx, cy, radius, idx, total, value) {
    const ang = (Math.PI * 2 * idx) / total - Math.PI / 2;
    const d = radius * value;
    return { x: cx + Math.cos(ang) * d, y: cy + Math.sin(ang) * d };
  }

  function norm(metric, raw) {
    const v = Math.min(raw / metric.max, 1);
    return metric.lowerBetter ? 1 - v * 0.9 : v * 0.92 + 0.06;
  }

  function drawRadar(progress) {
    const W = 640, H = 460; // 逻辑尺寸（ctx 已按 dpr 缩放）
    const c = themeColors();
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.36;
    const N = METRICS.length;
    const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

    radarCtx.clearRect(0, 0, W, H);

    // 背景网格环
    for (let ring = 1; ring <= 4; ring++) {
      radarCtx.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = radarPoint(cx, cy, R * (ring / 4), i % N, N, 1);
        i === 0 ? radarCtx.moveTo(p.x, p.y) : radarCtx.lineTo(p.x, p.y);
      }
      radarCtx.strokeStyle = 'rgba(255,255,255,0.07)';
      radarCtx.lineWidth = 1;
      radarCtx.stroke();
    }
    // 轴线与标签
    radarCtx.font = '11px "Share Tech Mono", monospace';
    radarCtx.fillStyle = c.dim;
    METRICS.forEach((m, i) => {
      const p = radarPoint(cx, cy, R, i, N, 1);
      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy);
      radarCtx.lineTo(p.x, p.y);
      radarCtx.strokeStyle = 'rgba(255,255,255,0.05)';
      radarCtx.stroke();
      const lp = radarPoint(cx, cy, R + 30, i, N, 1);
      radarCtx.textAlign = Math.abs(lp.x - cx) < 12 ? 'center' : lp.x > cx ? 'left' : 'right';
      radarCtx.fillText(m.en, lp.x, lp.y + 4);
    });

    // 两个机体多边形
    const drawPoly = (unit, color, shiftAng) => {
      radarCtx.beginPath();
      for (let i = 0; i <= N; i++) {
        const idx = i % N;
        const v = norm(METRICS[idx], unit.specs[METRICS[idx].key]) * ease;
        const wobble = Math.sin(state.time * 0.0012 + idx * 1.7 + shiftAng) * 0.012; // 呼吸微扰
        const p = radarPoint(cx, cy, R, idx, N, v + wobble);
        i === 0 ? radarCtx.moveTo(p.x, p.y) : radarCtx.lineTo(p.x, p.y);
      }
      radarCtx.closePath();
      radarCtx.fillStyle = color + '26';
      radarCtx.fill();
      radarCtx.strokeStyle = color;
      radarCtx.lineWidth = 2;
      radarCtx.shadowColor = color;
      radarCtx.shadowBlur = 14;
      radarCtx.stroke();
      radarCtx.shadowBlur = 0;
      // 顶点
      for (let i = 0; i < N; i++) {
        const v = norm(METRICS[i], unit.specs[METRICS[i].key]) * ease;
        const p = radarPoint(cx, cy, R, i, N, v);
        radarCtx.beginPath();
        radarCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        radarCtx.fillStyle = color;
        radarCtx.fill();
      }
    };
    drawPoly(getUnit(state.a), c.a, 0);
    drawPoly(getUnit(state.b), c.b, 2.1);

    // 中心脉冲点
    const pulse = 3 + Math.sin(state.time * 0.004) * 1.5;
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, pulse, 0, Math.PI * 2);
    radarCtx.fillStyle = 'rgba(255,255,255,0.6)';
    radarCtx.fill();

    // 点击涟漪
    state.ripples = state.ripples.filter((rp) => performance.now() - rp.t < 900);
    state.ripples.forEach((rp) => {
      const k = (performance.now() - rp.t) / 900;
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, k * R * 1.4, 0, Math.PI * 2);
      radarCtx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.35})`;
      radarCtx.lineWidth = 1.5;
      radarCtx.stroke();
    });
  }

  radarCanvas.addEventListener('click', (e) => {
    state.ripples.push({ t: performance.now() });
    const c = radarCenter();
    burstParticles(e.clientX, e.clientY);
    spawnParticlesAt = null;
  });

  // === 图例名称同步 ===
  function renderLegend() {
    $('#radar-legend').innerHTML = `
      <span class="lg"><span class="sw a"></span>${getUnit(state.a).name}</span>
      <span class="lg"><span class="sw b"></span>${getUnit(state.b).name}</span>`;
  }

  // ============================================================
  // 能力脉冲条
  // ============================================================
  function renderBars(rebuild) {
    if (rebuild) {
      pulseGrid.innerHTML = '';
      METRICS.forEach((m) => {
        const row = document.createElement('div');
        row.className = 'metric-row';
        row.dataset.key = m.key;
        row.innerHTML = `
          <div class="metric-head">
            <span class="metric-name">${m.label}<span class="mono">${m.en}</span></span>
            <span class="metric-unit">${m.unit}</span>
          </div>
          <div class="bar-tracks">
            <div class="bar-track"><div class="bar-fill a"></div></div>
            <div class="bar-track"><div class="bar-fill b"></div></div>
          </div>`;
        row.addEventListener('mouseenter', () => showDelta(m));
        pulseGrid.appendChild(row);
      });
    }
    const ua = getUnit(state.a), ub = getUnit(state.b);
    METRICS.forEach((m) => {
      const row = pulseGrid.querySelector(`[data-key="${m.key}"]`);
      if (!row) return;
      const pctA = Math.min(ua.specs[m.key] / m.max, 1) * 100;
      const pctB = Math.min(ub.specs[m.key] / m.max, 1) * 100;
      row.querySelector('.bar-fill.a').style.width = pctA + '%';
      row.querySelector('.bar-fill.b').style.width = pctB + '%';
    });
  }

  function showDelta(m) {
    const ua = getUnit(state.a), ub = getUnit(state.b);
    const va = ua.specs[m.key], vb = ub.specs[m.key];
    const diff = va - vb;
    const winner = diff === 0 ? '持平' : (diff > 0 ? ua.name : ub.name);
    const arrow = diff === 0 ? '≡' : diff > 0 ? '▲' : '▼';
    deltaReadout.classList.add('live');
    deltaReadout.innerHTML =
      `◤ ${m.label} · ${ua.name} <b>${va.toFixed(m.digits)}</b> vs ${ub.name} <b>${vb.toFixed(m.digits)}</b> ${m.unit}` +
      ` &nbsp;—&nbsp; ${arrow} 差值 <b>${Math.abs(diff).toFixed(m.digits)}</b> · 优势方 <b>${winner}</b>`;
  }

  // ============================================================
  // 规格卡片 + 数字递增
  // ============================================================
  function animatedNumber(el, target, digits, unit) {
    const start = performance.now();
    const dur = 900;
    function tick(now) {
      const k = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - k, 4); // easeOutQuart
      el.textContent = (target * e).toFixed(digits);
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    el.dataset.unit = unit;
  }

  function renderSpecs() {
    renderLegend();
    [['a', specA], ['b', specB]].forEach(([side, el]) => {
      const u = getUnit(state[side]);
      const colorSide = side === 'a' ? 'side-a' : 'side-b';
      el.className = `spec-card glass tilt-card ${colorSide}`;
      el.innerHTML = `
        <div class="spec-vendor mono">${u.vendor} · ${u.extras.code}</div>
        <h3 class="spec-name">${u.name}</h3>
        <p class="spec-tagline">${u.tagline}</p>
        <div class="spec-list">
          ${METRICS.map((m) => `
            <div class="spec-row">
              <span class="spec-key">${m.label}</span>
              <span class="spec-val"><span class="num" data-target="${u.specs[m.key]}" data-digits="${m.digits}">0</span><span class="u">${m.unit}</span></span>
            </div>`).join('')}
          <div class="spec-row"><span class="spec-key">驱动方式</span><span class="spec-val">${u.extras.drive}</span></div>
          <div class="spec-row"><span class="spec-key">传感系统</span><span class="spec-val">${u.extras.sensors}</span></div>
          <div class="spec-row"><span class="spec-key">首发年份</span><span class="spec-val">${u.extras.debut}</span></div>
        </div>`;
      el.querySelectorAll('.num').forEach((n) => {
        animatedNumber(n, parseFloat(n.dataset.target), parseInt(n.dataset.digits, 10));
      });
      attachTilt(el);
    });
  }

  // === 3D 倾斜物理 ===
  function attachTilt(card) {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', px * 100 + '%');
      card.style.setProperty('--my', py * 100 + '%');
      card.style.transform = `rotateY(${(px - 0.5) * 8}deg) rotateX(${(0.5 - py) * 8}deg) translateZ(6px)`;
      card.style.transition = 'transform 0.15s linear';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = '';
    });
  }

  // ============================================================
  // 环境粒子流场
  // ============================================================
  const pctx = particleCanvas.getContext('2d');
  let particles = [];
  let spawnParticlesAt = null;

  function resizeCanvases() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    radarCanvas.width = 640 * dpr;
    radarCanvas.height = 460 * dpr;
    radarCanvas.style.width = '640px';
    radarCanvas.style.maxWidth = '100%';
    radarCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initParticles() {
    particles = [];
    const count = Math.min(90, Math.floor(window.innerWidth / 16));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.8 + 0.4,
        life: 1
      });
    }
  }

  function burstParticles(x, y) {
    const rect = particleCanvas.getBoundingClientRect();
    const lx = x - rect.left, ly = y - rect.top;
    for (let i = 0; i < 26; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 3.2 + 0.8;
      particles.push({
        x: lx, y: ly,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: Math.random() * 2.4 + 0.8,
        life: 1,
        decay: 0.016 + Math.random() * 0.02
      });
    }
  }

  function stepParticles() {
    const c = themeColors();
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      // 轻微流场扰动
      p.vx += Math.sin(p.y * 0.004 + state.time * 0.0003) * 0.006;
      p.vy += Math.cos(p.x * 0.004 + state.time * 0.0004) * 0.006;
      p.x += p.vx; p.y += p.vy;
      if (p.decay) {
        p.life -= p.decay;
        p.vx *= 0.97; p.vy *= 0.97;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
      } else {
        // 环绕边界
        if (p.x < -10) p.x = particleCanvas.width + 10;
        if (p.x > particleCanvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = particleCanvas.height + 10;
        if (p.y > particleCanvas.height + 10) p.y = -10;
      }
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      pctx.fillStyle = (i % 2 === 0 ? c.a : c.b) + (p.decay ? Math.floor(p.life * 200).toString(16).padStart(2, '0') : '55');
      pctx.fill();
    }
  }

  // ============================================================
  // 主循环
  // ============================================================
  state.time = 0;
  function loop(now) {
    state.time = now;
    // 雷达展开动画
    if (state.radarAnim < 1) state.radarAnim = Math.min(state.radarAnim + 0.016, 1);
    drawRadar(state.radarAnim);
    stepParticles();
    requestAnimationFrame(loop);
  }

  // ============================================================
  // 入场揭示（IntersectionObserver 错峰）
  // ============================================================
  function setupReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const idx = [...document.querySelectorAll('.reveal-seq')].indexOf(en.target);
          en.target.style.transitionDelay = (idx * 110) + 'ms';
          en.target.classList.add('shown');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal-seq').forEach((el) => io.observe(el));
  }

  // ============================================================
  // 启动
  // ============================================================
  function init() {
    resizeCanvases();
    initParticles();
    buildChips(chipsA, 'a');
    buildChips(chipsB, 'b');
    syncChips();
    renderSpecs();
    renderBars(true);
    restartAnimations();
    setupReveal();
    window.addEventListener('resize', () => { resizeCanvases(); initParticles(); });
    requestAnimationFrame(loop);
  }

  init();
})();
