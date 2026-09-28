/* ============================================================
   Statement Morph · 语句流变引擎
   弹簧-阻尼字符物理 × 四种流变场 × 光标力场 × 冲击波涟漪
   ============================================================ */

(() => {
  'use strict';

  // === 配置 ===
  const CYCLE_MS = 6200;
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&$@?!*+~<>/\\{}[]';
  const SPRING = 0.085;      // 弹簧刚度
  const DAMPING = 0.86;      // 阻尼
  const FIELD_RADIUS = 130;  // 光标力场半径
  const FIELD_FORCE = 0.55;  // 光标力场强度

  const DEFAULT_STATEMENTS = [
    'Code is poetry in motion',
    'Every pixel breathes',
    'Motion is meaning',
    'Design the impermanent',
    'Statement becomes storm',
    '让灵感在指尖流变'
  ];

  // === DOM Elements ===
  const stageEl = document.getElementById('stage');
  const statementEl = document.getElementById('statement');
  const labelEl = document.getElementById('stage-label');
  const telemetryEl = document.getElementById('telemetry');
  const ringBar = document.getElementById('cycle-ring');
  const ringCount = document.getElementById('cycle-count');
  const queueEl = document.getElementById('queue');
  const queueCount = document.getElementById('queue-count');
  const composer = document.getElementById('composer');
  const inputEl = document.getElementById('statement-input');
  const modeSeg = document.getElementById('mode-seg');
  const themeSeg = document.getElementById('theme-seg');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPlay = document.getElementById('btn-play');
  const canvas = document.getElementById('particles');

  // === 状态 ===
  const state = {
    statements: [...DEFAULT_STATEMENTS],
    index: 0,
    mode: 'cascade',
    playing: true,
    chars: [],
    morphing: false,
    mouse: { x: -9999, y: -9999, inside: false },
    cycleStart: performance.now()
  };

  // === 工具 ===
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  // === 字符模型 ===
  // 每个字符是一个质点：home 为锚点，spring 回归；morph 时施加冲量
  function buildChars(text) {
    statementEl.innerHTML = '';
    state.chars = [];
    const words = text.split(' ');
    words.forEach((word, wi) => {
      const wEl = document.createElement('span');
      wEl.className = 'word';
      [...word].forEach((c) => wEl.appendChild(makeChar(c)));
      statementEl.appendChild(wEl);
      if (wi < words.length - 1) {
        const sp = document.createElement('span');
        sp.className = 'ch space';
        statementEl.appendChild(sp);
      }
    });
    measureHomes();
  }

  function makeChar(c) {
    const el = document.createElement('span');
    el.className = 'ch';
    el.textContent = c;
    const p = {
      el, char: c,
      hx: 0, hy: 0,
      x: 0, y: 0, vx: 0, vy: 0,
      r: 0, vr: 0,
      scrambleUntil: 0,
      entryDelay: 0
    };
    state.chars.push(p);
    return el;
  }

  function measureHomes() {
    state.chars.forEach((p) => {
      if (!p.el.offsetWidth && !p.el.textContent) return;
      p.hx = p.el.offsetLeft;
      p.hy = p.el.offsetTop;
    });
  }

  // === 流变场：四种 stagger 策略 ===
  // 返回每个字符的入场/离场延迟系数（0~1），驱动非线性节奏
  const MORPH_FIELDS = {
    cascade: (p, i, n) => i / n,
    wave: (p, i, n) => (Math.sin((i / n) * Math.PI * 3 - Math.PI / 2) + 1) / 2,
    vortex: (p, i, n) => {
      const cx = statementEl.offsetWidth / 2;
      const cy = statementEl.offsetHeight / 2;
      const ang = Math.atan2(p.hy - cy, p.hx - cx);
      return (Math.sin(ang * 2) + 1) / 2;
    },
    quantum: () => Math.random()
  };

  // === 核心：语句流变 ===
  function morphTo(text, label) {
    if (state.morphing || !text.trim()) return;
    state.morphing = true;
    labelEl.textContent = `// ${label || 'morphing'}`;

    const outgoing = state.chars;
    const now = performance.now();

    // 离场：字符获得向外冲量并淡出
    const n = Math.max(outgoing.length, 1);
    outgoing.forEach((p) => {
      const t = MORPH_FIELDS[state.mode](p, state.chars.indexOf(p), n);
      setTimeout(() => {
        p.vx += rand(-14, 14);
        p.vy += rand(-22, -6);
        p.vr += rand(-0.4, 0.4);
        p.el.style.opacity = '0';
      }, t * 320);
    });

    // 入场：构建新字符，从随机位置飞入 + 乱码揭示
    setTimeout(() => {
      buildChars(text);
      const m = Math.max(state.chars.length, 1);
      const chars = [...state.chars];
      chars.forEach((p, i) => {
        const t = MORPH_FIELDS[state.mode](p, i, m);
        p.entryDelay = t * 420;
        p.x = p.hx + rand(-160, 160);
        p.y = p.hy + rand(-90, 90);
        p.vx = 0; p.vy = 0;
        if (p.char !== ' ') p.scrambleUntil = now + 500 + t * 600;
        p.el.style.opacity = '0';
        setTimeout(() => {
          p.el.style.opacity = '1';
          state.morphing = false;
        }, p.entryDelay + 60);
      });
      updateRing();
    }, 420);

    state.cycleStart = performance.now();
  }

  // === 物理 ===
  function tick() {
    const chars = state.chars;
    const rect = statementEl.getBoundingClientRect();
    let forceSum = 0;
    const now = performance.now();

    for (let i = 0; i < chars.length; i++) {
      const p = chars[i];
      if (!p.el || !p.el.textContent) continue;

      // 乱码揭示
      if (now < p.scrambleUntil) {
        p.el.textContent = pick(GLYPHS);
        p.el.classList.add('ghost');
      } else if (p.el.classList.contains('ghost')) {
        p.el.textContent = p.char;
        p.el.classList.remove('ghost');
      }

      // 弹簧回归
      p.vx += (p.hx - p.x) * SPRING;
      p.vy += (p.hy - p.y) * SPRING;
      p.vr += (0 - p.r) * SPRING * 0.6;

      // 光标力场（排斥）
      if (state.mouse.inside) {
        const px = rect.left + p.hx + (p.x - p.hx);
        const py = rect.top + p.hy + (p.y - p.hy);
        const dx = px - state.mouse.x;
        const dy = py - state.mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < FIELD_RADIUS && dist > 0.01) {
          const f = (1 - dist / FIELD_RADIUS) * FIELD_FORCE;
          p.vx += (dx / dist) * f * 6;
          p.vy += (dy / dist) * f * 6;
          p.vr += (dx / dist) * f * 0.08;
          forceSum += f;
        }
      }

      // 积分
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.vr *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;

      p.el.style.transform =
        `translate3d(${(p.x - p.hx).toFixed(2)}px, ${(p.y - p.hy).toFixed(2)}px, 0) rotate(${p.r.toFixed(3)}rad)`;
    }

    telemetryEl.textContent =
      `FORCE ${forceSum.toFixed(2)} · CHARS ${chars.length}`;

    requestAnimationFrame(tick);
  }

  // === 自动循环 ===
  function updateRing() {
    ringCount.textContent = String(state.index + 1).padStart(2, '0');
  }

  function loop(now) {
    if (state.playing && !state.morphing) {
      const progress = clamp((now - state.cycleStart) / CYCLE_MS, 0, 1);
      const C = 2 * Math.PI * 16;
      ringBar.style.strokeDashoffset = String(C * (1 - progress));
      if (progress >= 1) {
        next();
      }
    }
    requestAnimationFrame(loop);
  }

  function next() {
    state.index = (state.index + 1) % state.statements.length;
    morphTo(state.statements[state.index], `statement ${state.index + 1} / ${state.statements.length}`);
    renderQueue();
    updateRing();
  }

  function prev() {
    state.index = (state.index - 1 + state.statements.length) % state.statements.length;
    morphTo(state.statements[state.index], `statement ${state.index + 1} / ${state.statements.length}`);
    renderQueue();
    updateRing();
  }

  // === 冲击波 ===
  function shockwave(clientX, clientY) {
    const rect = stageEl.getBoundingClientRect();
    const wave = document.createElement('div');
    wave.className = 'shockwave';
    wave.style.left = `${clientX - rect.left}px`;
    wave.style.top = `${clientY - rect.top}px`;
    stageEl.appendChild(wave);
    setTimeout(() => wave.remove(), 950);

    // 对字符施加径向冲量
    const sRect = statementEl.getBoundingClientRect();
    state.chars.forEach((p) => {
      const px = sRect.left + p.hx;
      const py = sRect.top + p.hy;
      const dx = px - clientX;
      const dy = py - clientY;
      const dist = Math.hypot(dx, dy);
      if (dist < 340 && dist > 0.01) {
        const f = (1 - dist / 340) * 26;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
        p.vr += rand(-0.25, 0.25);
      }
    });
  }

  // === 队列 UI ===
  function renderQueue() {
    queueEl.innerHTML = '';
    state.statements.forEach((s, i) => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (i === state.index ? ' current' : '');
      chip.style.animationDelay = `${i * 0.03}s`;
      chip.innerHTML = `<span class="txt"></span><span class="x">✕</span>`;
      chip.querySelector('.txt').textContent = s;
      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('x')) {
          removeStatement(i);
          return;
        }
        if (i === state.index) return;
        state.index = i;
        morphTo(s, `statement ${i + 1} / ${state.statements.length}`);
        renderQueue();
        updateRing();
      });
      queueEl.appendChild(chip);
    });
    queueCount.textContent = String(state.statements.length);
  }

  function removeStatement(i) {
    if (state.statements.length <= 1) return;
    state.statements.splice(i, 1);
    if (state.index >= state.statements.length) state.index = 0;
    morphTo(state.statements[state.index], 'queue updated');
    renderQueue();
    updateRing();
  }

  function addStatement(text) {
    const t = text.trim().slice(0, 64);
    if (!t) return;
    state.statements.push(t);
    state.index = state.statements.length - 1;
    morphTo(t, 'your statement');
    renderQueue();
    updateRing();
  }

  // === 事件绑定 ===
  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    addStatement(inputEl.value);
    inputEl.value = '';
    inputEl.blur();
  });

  modeSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    modeSeg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    // 切换流变场时立刻重演一次当前语句
    morphTo(state.statements[state.index], `field · ${state.mode}`);
  });

  themeSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    themeSeg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.body.dataset.theme = btn.dataset.theme;
  });

  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  btnPlay.addEventListener('click', () => {
    state.playing = !state.playing;
    btnPlay.textContent = state.playing ? 'Pause ⏸' : 'Play ▶';
    btnPlay.classList.toggle('active', state.playing);
    state.cycleStart = performance.now();
  });

  stageEl.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouse.inside = true;
  });
  stageEl.addEventListener('mouseleave', () => {
    state.mouse.inside = false;
    state.mouse.x = -9999;
    state.mouse.y = -9999;
  });
  stageEl.addEventListener('click', (e) => shockwave(e.clientX, e.clientY));

  window.addEventListener('resize', () => measureHomes());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      btnPlay.click();
    }
  });

  // === 背景粒子流场 ===
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function initParticles() {
    particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      s: rand(0.6, 2.2),
      speed: rand(0.15, 0.6),
      phase: rand(0, Math.PI * 2)
    }));
  }

  function drawParticles(t) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7dd3fc';
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.35;

    particles.forEach((p) => {
      // 伪噪声流场：多重正弦叠加
      const ang = Math.sin(t * 0.00018 + p.phase) * 1.4
                + Math.cos(p.y * 0.004 + t * 0.0001) * 0.8;
      p.x += Math.cos(ang) * p.speed;
      p.y += Math.sin(ang) * p.speed + 0.12;
      if (p.x < -10) p.x = window.innerWidth + 10;
      if (p.x > window.innerWidth + 10) p.x = -10;
      if (p.y > window.innerHeight + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
  });

  // === 启动 ===
  function boot() {
    resizeCanvas();
    initParticles();
    requestAnimationFrame(drawParticles);

    buildChars(state.statements[0]);
    renderQueue();
    updateRing();
    state.cycleStart = performance.now();

    requestAnimationFrame(tick);
    requestAnimationFrame(loop);
  }

  boot();
})();
