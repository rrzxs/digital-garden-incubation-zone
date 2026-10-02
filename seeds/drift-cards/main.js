/* ============================================================
   Drift Cards · 漂流卡片
   弹簧-阻尼物理 + 噪声流场 + 光标力场 + 涟漪冲击波
   ============================================================ */
(function () {
  'use strict';

  // === 配置与状态 ===
  const CONFIG = {
    cardWidth: 240,
    cardHeight: 150,
    edgeMargin: 24,
    topSafe: 110,
    bottomSafe: 80,
    cursorRadius: 190,
    cursorForce: 0.9,
    rippleRadius: 320,
    rippleForce: 9,
    damping: 0.985,
    maxSpeed: 3.2,
    tiltFactor: 10
  };

  const THEMES = ['abyss', 'aurora', 'dusk', 'ember'];
  const MODE_LABELS = { calm: 'CALM', magnet: 'MAGNET', storm: 'STORM' };

  const state = {
    mode: 'calm',
    themeIndex: 0,
    time: 0,
    pointer: { x: -9999, y: -9999, active: false },
    cards: [],
    ripples: []
  };

  // 漂流瓶词库：正面留言 / 背面回声
  const CARD_SEEDS = [
    { msg: '海风把今天的烦恼吹成了明天的云。', echo: '云落进海里，就成了鱼的伞。', tag: 'NO.001 · 洋流' },
    { msg: '如果慢一点，光也会追上你。', echo: '光说：我一直走在你旁边。', tag: 'NO.002 · 光斑' },
    { msg: '写下来的心愿，会自己学会游泳。', echo: '它正朝着你游来。', tag: 'NO.003 · 潮汐' },
    { msg: '深夜的键盘声，是另一种海浪。', echo: '岸上的灯塔为你留了一格电。', tag: 'NO.004 · 深海' },
    { msg: '所有迷路的人，都在收集新的地图。', echo: '迷路的另一面，是探险。', tag: 'NO.005 · 信风' },
    { msg: '把「来不及」折成纸船，放它走。', echo: '纸船比钟表更懂漂流。', tag: 'NO.006 · 浮标' },
    { msg: '你不必发光，反光也是光。', echo: '月亮一直是这么做的。', tag: 'NO.007 · 月相' },
    { msg: '候鸟不问距离，只问方向。', echo: '你的方向，由你签字。', tag: 'NO.008 · 候鸟' },
    { msg: '今天的浪，是海在练习拥抱。', echo: '被浪打湿的人，都被海记住。', tag: 'NO.009 · 浪涌' },
    { msg: '漂流的意义，是遇见另一只瓶子。', echo: '遇见你，坐标开始有意义。', tag: 'NO.010 · 相遇' }
  ];

  let seedCursor = 0;

  // === DOM Elements ===
  const stage = document.getElementById('stage');
  const hudCount = document.getElementById('hud-count');
  const hudMode = document.getElementById('hud-mode');
  const hudCursor = document.getElementById('hud-cursor');
  const hudField = document.getElementById('hud-field');
  const btnSpawn = document.getElementById('btn-spawn');
  const btnTheme = document.getElementById('btn-theme');
  const modeBtns = Array.from(document.querySelectorAll('.mode-btn'));
  const canvas = document.getElementById('ambient-canvas');
  const ctx = canvas.getContext('2d');

  // === 工具函数 ===
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // 伪噪声流场：多重正弦叠加，平滑连续
  function fieldStrength(x, y, t) {
    const modeBoost = state.mode === 'storm' ? 2.6 : 1;
    const a = Math.sin(x * 0.0016 + t * 0.35) + Math.cos(y * 0.0021 - t * 0.28);
    const b = Math.sin((x + y) * 0.0009 + t * 0.18);
    return (a + b) * 0.5 * modeBoost;
  }

  function fieldVector(x, y, t) {
    const n = fieldStrength(x, y, t);
    const calm = state.mode === 'storm' ? 0.06 : 0.022;
    const magnet = state.mode === 'magnet' ? 1 : 0;
    let fx = Math.cos(n * Math.PI) * calm;
    let fy = Math.sin(n * Math.PI) * calm;

    // 磁吸模式：卡片被光标温柔牵引
    if (magnet && state.pointer.active) {
      const dx = state.pointer.x - x;
      const dy = state.pointer.y - y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 640) {
        const pull = 0.028 * (1 - dist / 640);
        fx += (dx / dist) * pull;
        fy += (dy / dist) * pull;
      }
    }
    return { fx, fy };
  }

  // === 卡片工厂 ===
  function createCard(x, y) {
    const seed = CARD_SEEDS[seedCursor % CARD_SEEDS.length];
    seedCursor += 1;
    const id = 'DRIFT-' + String(Math.floor(rand(1000, 9999)));

    const el = document.createElement('div');
    el.className = 'drift-card entering';
    el.innerHTML =
      '<div class="card-inner">' +
      '  <div class="card-face front">' +
      '    <div class="card-meta"><span>' + id + '</span><span>' + seed.tag + '</span></div>' +
      '    <p class="card-msg">' + seed.msg + '</p>' +
      '    <span class="card-tag">∇ 双击翻转回声</span>' +
      '  </div>' +
      '  <div class="card-face back">' +
      '    <div class="card-meta"><span>ECHO</span><span>信已收到</span></div>' +
      '    <p class="card-msg">' + seed.echo + '</p>' +
      '    <span class="card-tag">≈ 再次双击返回</span>' +
      '  </div>' +
      '</div>';

    stage.appendChild(el);
    setTimeout(() => el.classList.remove('entering'), 1000);

    const card = {
      x: x !== undefined ? x : rand(CONFIG.edgeMargin + CONFIG.cardWidth / 2, window.innerWidth - CONFIG.edgeMargin - CONFIG.cardWidth / 2),
      y: y !== undefined ? y : rand(CONFIG.topSafe, window.innerHeight - CONFIG.bottomSafe),
      vx: rand(-0.6, 0.6),
      vy: rand(-0.4, 0.4),
      rot: rand(-4, 4),
      scale: 1,
      bob: rand(0, Math.PI * 2),
      flipped: false,
      dragging: false,
      el
    };
    state.cards.push(card);
    updateHudCount();
    return card;
  }

  function removeCard(card) {
    const idx = state.cards.indexOf(card);
    if (idx > -1) state.cards.splice(idx, 1);
    card.el.remove();
    updateHudCount();
  }

  function updateHudCount() {
    hudCount.textContent = String(state.cards.length).padStart(2, '0');
  }

  // === 涟漪冲击波 ===
  function spawnRipple(x, y) {
    const ring = document.createElement('div');
    ring.className = 'ripple';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 950);

    for (const card of state.cards) {
      const dx = card.x - x;
      const dy = card.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist < CONFIG.rippleRadius && dist > 1) {
        const power = CONFIG.rippleForce * (1 - dist / CONFIG.rippleRadius);
        card.vx += (dx / dist) * power;
        card.vy += (dy / dist) * power;
        card.flipped = false;
        card.el.classList.remove('flipped');
      }
    }
  }

  // === 物理引擎 ===
  function step() {
    state.time += 0.016;
    const t = state.time;

    for (const card of state.cards) {
      if (!card.dragging) {
        // 流场推进
        const { fx, fy } = fieldVector(card.x, card.y, t);
        card.vx += fx;
        card.vy += fy;

        // 光标力场（磁吸模式下由牵引代替排斥）
        if (state.pointer.active && state.mode !== 'magnet') {
          const dx = card.x - state.pointer.x;
          const dy = card.y - state.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < CONFIG.cursorRadius && dist > 1) {
            const power = CONFIG.cursorForce * (1 - dist / CONFIG.cursorRadius) * 0.14;
            card.vx += (dx / dist) * power;
            card.vy += (dy / dist) * power;
          }
        }

        // 风暴模式：随机湍流
        if (state.mode === 'storm') {
          card.vx += rand(-0.08, 0.08);
          card.vy += rand(-0.08, 0.08);
        }

        // 阻尼与限速
        card.vx *= CONFIG.damping;
        card.vy *= CONFIG.damping;
        const speed = Math.hypot(card.vx, card.vy);
        if (speed > CONFIG.maxSpeed) {
          card.vx = (card.vx / speed) * CONFIG.maxSpeed;
          card.vy = (card.vy / speed) * CONFIG.maxSpeed;
        }

        card.x += card.vx;
        card.y += card.vy;

        // 软边界：橡皮筋回弹
        const minX = CONFIG.edgeMargin + CONFIG.cardWidth / 2;
        const maxX = window.innerWidth - CONFIG.edgeMargin - CONFIG.cardWidth / 2;
        const minY = CONFIG.topSafe;
        const maxY = window.innerHeight - CONFIG.bottomSafe;
        if (card.x < minX) { card.vx += (minX - card.x) * 0.01; }
        if (card.x > maxX) { card.vx -= (card.x - maxX) * 0.01; }
        if (card.y < minY) { card.vy += (minY - card.y) * 0.01; }
        if (card.y > maxY) { card.vy -= (card.y - maxY) * 0.01; }
      }

      // 悬浮呼吸 + 速度倾角（像小船一样侧倾）
      card.bob += 0.02;
      const bobY = Math.sin(card.bob) * 3;
      const rot = clamp(card.vx * CONFIG.tiltFactor, -14, 14) * 0.4 + Math.sin(card.bob * 0.7) * 1.2;

      card.el.style.transform =
        'translate3d(' + (card.x - CONFIG.cardWidth / 2) + 'px,' +
        (card.y - CONFIG.cardHeight / 2 + bobY) + 'px,0)' +
        ' rotate(' + rot + 'deg)' +
        ' scale(' + card.scale + ')';
    }

    // HUD 场强
    const f = fieldStrength(state.pointer.x, state.pointer.y, t);
    hudField.textContent = f.toFixed(2);
  }

  // === 环境粒子（浮游微光） ===
  const motes = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initMotes() {
    motes.length = 0;
    const count = Math.min(70, Math.floor(window.innerWidth / 22));
    for (let i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: rand(0.6, 2.2),
        speed: rand(0.08, 0.35),
        sway: rand(0, Math.PI * 2),
        alpha: rand(0.15, 0.5)
      });
    }
  }

  function drawMotes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#4cc9f0';
    ctx.fillStyle = accent;
    for (const m of motes) {
      m.sway += 0.008;
      m.y -= m.speed;
      if (m.y < -4) {
        m.y = canvas.height + 4;
        m.x = Math.random() * canvas.width;
      }
      ctx.globalAlpha = m.alpha * (0.6 + 0.4 * Math.sin(m.sway * 2));
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(m.sway) * 12, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // === 交互：拖拽 / 翻转 / 涟漪 / 倾斜 ===
  function findCardAt(x, y) {
    for (let i = state.cards.length - 1; i >= 0; i--) {
      const c = state.cards[i];
      if (Math.abs(x - c.x) < CONFIG.cardWidth / 2 && Math.abs(y - c.y) < CONFIG.cardHeight / 2) return c;
    }
    return null;
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.drift-card')) return;
    spawnRipple(e.clientX, e.clientY);
  });

  stage.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    state.pointer.active = true;
    hudCursor.textContent = String(Math.round(e.clientX)).padStart(4, '0') + ' , ' + String(Math.round(e.clientY)).padStart(4, '0');

    // 悬停卡片：光泽跟随 + 微倾斜
    const card = findCardAt(e.clientX, e.clientY);
    for (const c of state.cards) {
      if (c === card && !c.dragging) {
        const rect = c.el.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * 100;
        const py = ((e.clientY - rect.top) / rect.height) * 100;
        c.el.querySelectorAll('.card-face').forEach((face) => {
          face.style.setProperty('--gx', px + '%');
          face.style.setProperty('--gy', py + '%');
        });
      }
    }
  });

  stage.addEventListener('pointerleave', () => {
    state.pointer.active = false;
    state.pointer.x = -9999;
    state.pointer.y = -9999;
    hudCursor.textContent = '---- , ----';
  });

  // 卡片级交互（事件委托）
  stage.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.drift-card');
    if (!el) return;
    const card = state.cards.find((c) => c.el === el);
    if (!card) return;
    card.dragging = true;
    card.dragOffsetX = e.clientX - card.x;
    card.dragOffsetY = e.clientY - card.y;
    card.lastX = e.clientX;
    card.lastY = e.clientY;
    card.el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    for (const card of state.cards) {
      if (!card.dragging) continue;
      card.x = e.clientX - card.dragOffsetX;
      card.y = e.clientY - card.dragOffsetY;
      // 记录瞬时速度用于抛掷
      card.vx = (e.clientX - card.lastX) * 0.5;
      card.vy = (e.clientY - card.lastY) * 0.5;
      card.lastX = e.clientX;
      card.lastY = e.clientY;
    }
  });

  stage.addEventListener('pointerup', (e) => {
    for (const card of state.cards) {
      if (!card.dragging) continue;
      card.dragging = false;
      card.el.classList.remove('dragging');
    }
  });

  // 双击翻转（ dblite 于 pointer 统一触发，避免拖拽误触）
  let lastTapTime = 0;
  let lastTapCard = null;
  stage.addEventListener('pointerup', (e) => {
    const el = e.target.closest('.drift-card');
    if (!el) return;
    const card = state.cards.find((c) => c.el === el);
    if (!card) return;
    const now = performance.now();
    const moved = Math.hypot(card.vx, card.vy);
    if (now - lastTapTime < 320 && lastTapCard === card && moved < 1.5) {
      card.flipped = !card.flipped;
      card.el.classList.toggle('flipped', card.flipped);
      lastTapTime = 0;
      lastTapCard = null;
    } else {
      lastTapTime = now;
      lastTapCard = card;
    }
  });

  // === 主题与模式控制 ===
  btnTheme.addEventListener('click', () => {
    state.themeIndex = (state.themeIndex + 1) % THEMES.length;
    document.body.dataset.theme = THEMES[state.themeIndex];
  });

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      hudMode.textContent = MODE_LABELS[state.mode];
    });
  });

  btnSpawn.addEventListener('click', () => {
    const card = createCard(window.innerWidth / 2 + rand(-120, 120), window.innerHeight / 2 + rand(-80, 80));
    // 入场即赋予轻微离心力，像投入水中的漂流瓶
    card.vx = rand(-2, 2);
    card.vy = rand(-1.5, 1.5);
    if (state.cards.length > 14) removeCard(state.cards[0]);
  });

  // === 主循环 ===
  function loop() {
    step();
    drawMotes();
    requestAnimationFrame(loop);
  }

  // === 启动 ===
  function boot() {
    resizeCanvas();
    initMotes();
    for (let i = 0; i < 7; i++) createCard();
    loop();
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    initMotes();
  });

  boot();
})();
