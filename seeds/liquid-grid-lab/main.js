/* ============================================================
   Liquid Grid Lab — 液态网格实验室
   弹簧-阻尼物理驱动的液态晶格力场微交互体验场
   ============================================================ */

(function initLiquidGridLab() {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('stage-canvas');
  const ctx = canvas.getContext('2d');
  const modeLabel = document.getElementById('mode-label');
  const modeTabs = document.getElementById('mode-tabs');
  const btnTheme = document.getElementById('btn-theme');
  const btnPulse = document.getElementById('btn-pulse');
  const btnReset = document.getElementById('btn-reset');
  const sliderRadius = document.getElementById('slider-radius');
  const sliderDensity = document.getElementById('slider-density');
  const valRadius = document.getElementById('val-radius');
  const valDensity = document.getElementById('val-density');
  const teleMode = document.getElementById('tele-mode');
  const teleNodes = document.getElementById('tele-nodes');
  const teleEnergy = document.getElementById('tele-energy');
  const teleWaves = document.getElementById('tele-waves');
  const teleFps = document.getElementById('tele-fps');
  const teleEnergyBar = document.getElementById('tele-energy-bar');
  const statusText = document.getElementById('status-text');
  const statusTheme = document.getElementById('status-theme');

  // === Configuration ===
  const THEMES = [
    { id: 'aurora', label: 'AURORA', accent: '#6ee7ff', deep: '#07090f' },
    { id: 'ember', label: 'EMBER', accent: '#ffb46e', deep: '#0f0805' },
    { id: 'jade', label: 'JADE', accent: '#7dffb0', deep: '#050d09' },
    { id: 'orchid', label: 'ORCHID', accent: '#e09bff', deep: '#0a0610' }
  ];

  const MODES = {
    repel: { label: '斥力场 · 移动光标扰动晶格', name: 'REPEL', hint: '斥力场激活 — 晶格被光标推挤' },
    attract: { label: '引力场 · 晶格被光标牵引', name: 'ATTRACT', hint: '引力场激活 — 晶格向光标汇聚' },
    vortex: { label: '漩涡场 · 晶格绕光标旋转', name: 'VORTEX', hint: '漩涡场激活 — 晶格绕光标螺旋' },
    wave: { label: '波场 · 晶格随光标起伏', name: 'WAVE', hint: '波场激活 — 晶格随光标涌动' }
  };

  const PHYSICS = {
    stiffness: 0.045,   // 弹簧刚度
    damping: 0.88,      // 阻尼系数
    forceStrength: 1.5, // 力场强度
    waveSpeed: 320,     // 冲击波传播速度 px/s
    waveWidth: 90       // 冲击波波前宽度 px
  };

  // === State ===
  const state = {
    themeIndex: 0,
    mode: 'repel',
    radius: 160,
    spacing: 46,
    nodes: [],
    cols: 0,
    rows: 0,
    waves: [],
    particles: [],
    pointer: { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, active: false },
    dpr: 1,
    width: 0,
    height: 0,
    fps: 60,
    lastFrame: performance.now(),
    time: 0
  };

  // === Canvas Sizing ===
  function resizeCanvas() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width * state.dpr;
    canvas.height = state.height * state.dpr;
    canvas.style.width = state.width + 'px';
    canvas.style.height = state.height + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    buildGrid();
  }

  // === Grid Construction ===
  function buildGrid() {
    const spacing = state.spacing;
    const margin = spacing * 1.4;
    const w = state.width - margin * 2;
    const h = state.height - margin * 2;
    state.cols = Math.max(4, Math.floor(w / spacing) + 1);
    state.rows = Math.max(4, Math.floor(h / spacing) + 1);
    const offsetX = (state.width - (state.cols - 1) * spacing) / 2;
    const offsetY = (state.height - (state.rows - 1) * spacing) / 2;

    state.nodes = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const rx = offsetX + c * spacing;
        const ry = offsetY + r * spacing;
        state.nodes.push({
          rx, ry,
          x: rx, y: ry,
          vx: 0, vy: 0,
          energy: 0,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
    teleNodes.textContent = state.nodes.length;
  }

  // === Ambient Particles ===
  function spawnParticles() {
    state.particles = [];
    const count = Math.min(70, Math.floor(state.width / 22));
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        size: 0.6 + Math.random() * 1.6,
        speed: 0.08 + Math.random() * 0.25,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.12 + Math.random() * 0.3
      });
    }
  }

  // === Physics Update ===
  function applyPointerForce(node) {
    const p = state.pointer;
    if (!p.active) return;
    const dx = node.x - p.x;
    const dy = node.y - p.y;
    const dist = Math.hypot(dx, dy);
    const radius = state.radius;
    if (dist > radius || dist < 0.001) return;

    const falloff = 1 - dist / radius;
    const strength = PHYSICS.forceStrength * falloff * falloff;

    switch (state.mode) {
      case 'repel': {
        node.vx += (dx / dist) * strength * 2.4;
        node.vy += (dy / dist) * strength * 2.4;
        break;
      }
      case 'attract': {
        node.vx -= (dx / dist) * strength * 1.7;
        node.vy -= (dy / dist) * strength * 1.7;
        break;
      }
      case 'vortex': {
        const tangent = 2.6 * strength;
        node.vx += (-dy / dist) * tangent + (dx / dist) * strength * 0.5;
        node.vy += (dx / dist) * tangent + (dy / dist) * strength * 0.5;
        break;
      }
      case 'wave': {
        const push = strength * 3.4;
        node.vx += (dx / dist) * push * 0.4 + p.vx * 0.02 * falloff;
        node.vy += (dy / dist) * push * 0.4 + p.vy * 0.02 * falloff - push * 0.8;
        break;
      }
    }
  }

  function applyWaveForce(node, dt) {
    for (let i = 0; i < state.waves.length; i++) {
      const wave = state.waves[i];
      const dx = node.x - wave.x;
      const dy = node.y - wave.y;
      const dist = Math.hypot(dx, dy);
      const front = wave.age * PHYSICS.waveSpeed;
      const band = Math.abs(dist - front);
      if (band < PHYSICS.waveWidth && dist > 0.001) {
        const amplitude = (1 - band / PHYSICS.waveWidth) * wave.power * Math.max(0, 1 - wave.age / 1.8);
        node.vx += (dx / dist) * amplitude * 3.2;
        node.vy += (dy / dist) * amplitude * 3.2;
      }
    }
  }

  function updateNodes(dt) {
    let totalEnergy = 0;
    const nodes = state.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      applyPointerForce(node);
      applyWaveForce(node, dt);

      // 弹簧-阻尼回归静止点
      node.vx += (node.rx - node.x) * PHYSICS.stiffness;
      node.vy += (node.ry - node.y) * PHYSICS.stiffness;
      node.vx *= PHYSICS.damping;
      node.vy *= PHYSICS.damping;
      node.x += node.vx;
      node.y += node.vy;

      const displacement = Math.hypot(node.x - node.rx, node.y - node.ry);
      node.energy += (displacement - node.energy) * 0.16;
      totalEnergy += node.energy;
    }
    return totalEnergy / nodes.length;
  }

  function updateWaves(dt) {
    for (let i = state.waves.length - 1; i >= 0; i--) {
      const wave = state.waves[i];
      wave.age += dt;
      wave.radius = wave.age * PHYSICS.waveSpeed;
      if (wave.age > 2.2) state.waves.splice(i, 1);
    }
    teleWaves.textContent = state.waves.length;
  }

  function updateParticles(dt) {
    const particles = state.particles;
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      pt.drift += dt * 0.6;
      pt.y -= pt.speed;
      pt.x += Math.sin(pt.drift) * 0.18;
      if (pt.y < -8) {
        pt.y = state.height + 8;
        pt.x = Math.random() * state.width;
      }
    }
  }

  // === Rendering ===
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function render(theme) {
    ctx.clearRect(0, 0, state.width, state.height);
    const [ar, ag, ab] = hexToRgb(theme.accent);
    const spacing = state.spacing;
    const baseSize = Math.min(spacing * 0.42, 14);

    // 环境粒子
    for (let i = 0; i < state.particles.length; i++) {
      const pt = state.particles[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${pt.alpha})`;
      ctx.fill();
    }

    // 晶格连接线（低能态基线网格）
    ctx.lineWidth = 1;
    const nodes = state.nodes;
    const cols = state.cols;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const col = i % cols;
      if (col < cols - 1) {
        const right = nodes[i + 1];
        const avgE = (node.energy + right.energy) * 0.5;
        if (avgE > 1.2) {
          ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${Math.min(0.35, avgE * 0.045)})`;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
      }
    }

    // 液态晶格单元
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const e = node.energy;
      const intensity = Math.min(1, e / 26);
      const breathe = 1 + Math.sin(state.time * 0.0016 + node.phase) * 0.08;
      const size = (baseSize + intensity * baseSize * 1.1) * breathe;

      const dx = node.x - node.rx;
      const dy = node.y - node.ry;
      const angle = Math.atan2(dy, dx) * 0.35;

      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(angle);

      const round = size * (1 - intensity * 0.55);
      const alpha = 0.08 + intensity * 0.75;

      if (intensity > 0.45) {
        ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, ${Math.min(0.9, intensity)})`;
        ctx.shadowBlur = intensity * 22;
      }

      ctx.beginPath();
      const r = Math.max(1.5, round * 0.5);
      if (ctx.roundRect) {
        ctx.roundRect(-size * 0.5, -size * 0.5, size, size, r);
      } else {
        ctx.rect(-size * 0.5, -size * 0.5, size, size);
      }
      ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${alpha})`;
      ctx.fill();

      if (intensity > 0.12) {
        ctx.strokeStyle = `rgba(${ar}, ${g2(ar)}, ${ab}, ${Math.min(0.9, 0.25 + intensity * 0.6)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 冲击波涟漪环
    for (let i = 0; i < state.waves.length; i++) {
      const wave = state.waves[i];
      const fade = Math.max(0, 1 - wave.age / 2.2);
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${fade * 0.5})`;
      ctx.lineWidth = 2.2 * fade + 0.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${fade * 0.22})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 光标准星
    if (state.pointer.active) {
      const p = state.pointer;
      ctx.beginPath();
      ctx.arc(p.x, p.y, state.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, 0.1)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, 0.75)`;
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function g2(r) { return Math.min(255, r + 20); }

  // === Telemetry ===
  let telemetryAccum = 0;
  function updateTelemetry(avgEnergy, dt) {
    telemetryAccum += dt;
    if (telemetryAccum < 0.25) return;
    telemetryAccum = 0;
    const energyClamped = Math.min(1, avgEnergy / 24);
    teleEnergy.textContent = energyClamped.toFixed(2);
    teleEnergyBar.style.width = (energyClamped * 100).toFixed(1) + '%';
    teleFps.textContent = Math.round(state.fps);
  }

  // === Main Loop ===
  function frame(now) {
    const rawDt = (now - state.lastFrame) / 1000;
    const dt = Math.min(rawDt, 0.05);
    state.fps += ((1 / Math.max(rawDt, 0.001)) - state.fps) * 0.06;
    state.lastFrame = now;
    state.time = now;

    const p = state.pointer;
    p.vx = (p.x - p.px) * 0.7;
    p.vy = (p.y - p.py) * 0.7;
    p.px = p.x;
    p.py = p.y;

    const avgEnergy = updateNodes(dt);
    updateWaves(dt);
    updateParticles(dt);
    render(THEMES[state.themeIndex]);
    updateTelemetry(avgEnergy, dt);

    requestAnimationFrame(frame);
  }

  // === Shockwave ===
  function emitWave(x, y, power) {
    state.waves.push({ x, y, age: 0, radius: 0, power: power || 1 });
  }

  // === Events ===
  canvas.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    state.pointer.active = true;
  });

  canvas.addEventListener('pointerleave', () => {
    state.pointer.active = false;
    state.pointer.x = -9999;
    state.pointer.y = -9999;
  });

  canvas.addEventListener('pointerdown', (e) => {
    emitWave(e.clientX, e.clientY, 1);
    flashStatus('冲击波已发射 — 观察晶格共振');
  });

  // 玻璃面板在 pointer-events:none 的 .app 之上，画布可接收事件
  modeTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.mode-tab');
    if (!tab) return;
    setMode(tab.dataset.mode);
  });

  function setMode(mode) {
    state.mode = mode;
    const conf = MODES[mode];
    modeTabs.querySelectorAll('.mode-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
    modeLabel.textContent = conf.label;
    teleMode.textContent = conf.name;
    flashStatus(conf.hint);
  }

  btnTheme.addEventListener('click', () => {
    state.themeIndex = (state.themeIndex + 1) % THEMES.length;
    const theme = THEMES[state.themeIndex];
    document.body.dataset.theme = theme.id;
    statusTheme.textContent = theme.label;
    document.body.style.setProperty('--bg-deep', theme.deep);
    flashStatus('氛围切换 — ' + theme.label);
  });

  btnPulse.addEventListener('click', () => {
    const p = state.pointer;
    const x = p.active ? p.x : state.width / 2;
    const y = p.active ? p.y : state.height / 2;
    emitWave(x, y, 1.4);
    flashStatus('中心脉冲已发射');
  });

  btnReset.addEventListener('click', () => {
    state.waves = [];
    for (const node of state.nodes) {
      node.x = node.rx;
      node.y = node.ry;
      node.vx = 0;
      node.vy = 0;
      node.energy = 0;
    }
    flashStatus('晶格已重置 — 等待新的扰动');
  });

  sliderRadius.addEventListener('input', () => {
    state.radius = parseInt(sliderRadius.value, 10);
    valRadius.textContent = state.radius;
  });

  sliderDensity.addEventListener('input', () => {
    state.spacing = parseInt(sliderDensity.value, 10);
    valDensity.textContent = state.spacing;
    buildGrid();
  });

  let statusTimer = null;
  function flashStatus(text) {
    statusText.textContent = text.toUpperCase();
    statusText.style.color = 'var(--accent)';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusText.style.color = '';
    }, 900);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    spawnParticles();
  });

  // === Boot ===
  document.body.dataset.theme = THEMES[0].id;
  statusTheme.textContent = THEMES[0].label;
  resizeCanvas();
  spawnParticles();
  setMode('repel');
  setTimeout(() => emitWave(state.width / 2, state.height / 2, 0.8), 600);
  requestAnimationFrame(frame);
})();
