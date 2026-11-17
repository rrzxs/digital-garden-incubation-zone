/* ============================================================
   Doodle Note Wall — 涂鸦便签墙
   弹簧-阻尼便签物理 · 拖拽抛掷 · 冲击波涟漪 · 乱码揭示
   ============================================================ */
(function () {
  'use strict';

  // === 配置 ===
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const SPRING_K = 0.012;      // 归位弹簧刚度
  const SPRING_D = 0.88;       // 阻尼
  const CURSOR_RADIUS = 150;   // 光标斥力场半径
  const CURSOR_FORCE = 0.9;    // 光标斥力强度
  const SHOCK_FORCE = 16;      // 冲击波冲量
  const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';

  // === DOM Elements ===
  const body = document.body;
  const wall = document.getElementById('wall');
  const noteInput = document.getElementById('note-input');
  const addBtn = document.getElementById('note-add-btn');
  const clearBtn = document.getElementById('note-clear-btn');
  const statCount = document.getElementById('stat-count');
  const hudNotes = document.querySelector('#hud-notes b');
  const hudEnergy = document.querySelector('#hud-energy b');
  const paletteRow = document.getElementById('palette-row');
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  // === 状态 ===
  const notes = [];
  const bursts = [];       // 便签撕毁粒子迸射
  const waves = [];        // 物理冲击波（区别于视觉涟漪）
  let noteSeq = 0;
  let cursor = { x: -9999, y: -9999, inside: false };
  let dragNote = null;

  // === 值噪声（环境漂移） ===
  const noiseSeeds = new Array(512).fill(0).map(() => Math.random() * 2 - 1);
  function vnoise(t) {
    const i = Math.floor(t);
    const f = t - i;
    const a = noiseSeeds[((i % 512) + 512) % 512];
    const b = noiseSeeds[(((i + 1) % 512) + 512) % 512];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  }

  // === 工具 ===
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // === 乱码揭示 ===
  function scrambleReveal(el, text, speed = 24) {
    let frame = 0;
    const queue = [];
    for (let i = 0; i < text.length; i++) {
      queue.push({ ch: text[i], start: i * 1.6 + 4, end: i * 1.6 + 12 });
    }
    cancelAnimationFrame(el._sraf);
    (function tick() {
      let out = '';
      let done = 0;
      for (const q of queue) {
        if (frame >= q.end) { out += q.ch; done++; }
        else if (frame >= q.start) { out += `<span style="opacity:.45">${pick(SCRAMBLE_CHARS)}</span>`; }
        else { out += '&nbsp;'; }
      }
      el.innerHTML = out;
      if (done < queue.length) { frame++; el._sraf = requestAnimationFrame(tick); }
      else el.textContent = text;
    })();
  }

  // === 便签创建 ===
  function homeSpot() {
    const r = wall.getBoundingClientRect();
    return { x: rand(40, Math.max(60, r.width - 230)), y: rand(40, Math.max(60, r.height - 160)) };
  }

  function addNote(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = ++noteSeq;
    const el = document.createElement('article');
    el.className = 'note note-spawn tone-' + (id % 4);
    el.style.setProperty('--tape-rot', rand(-8, 8).toFixed(1) + 'deg');
    const rot = rand(-5, 5);
    const home = homeSpot();
    el.style.setProperty('--spawn-tf', `translate(${home.x}px, ${home.y}px)`);
    el.innerHTML = `
      <p class="note-text"></p>
      <div class="note-meta">
        <span class="meta-id">#${String(id).padStart(3, '0')}</span>
        <span>${new Date().toTimeString().slice(0, 5)}</span>
      </div>`;
    wall.appendChild(el);

    const note = {
      id, el, text: trimmed,
      hx: home.x, hy: home.y,          // 归位点
      x: home.x + rand(-160, 160),     // 从随机偏移飞入
      y: home.y - rand(120, 260),
      vx: 0, vy: 0,
      rot, rotV: rand(-1.5, 1.5),
      tone: id % 4, phase: Math.random() * 100
    };
    notes.push(note);
    scrambleReveal(el.querySelector('.note-text'), trimmed);
    setTimeout(() => el.classList.remove('note-spawn'), 950);
    bindNote(note);
    updateStats();
  }

  // === 便签交互 ===
  function bindNote(note) {
    const el = note.el;

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragNote = note;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      note._offX = e.clientX - note.x;
      note._offY = e.clientY - note.y;
      e.stopPropagation();
    });

    el.addEventListener('dblclick', (e) => ripNote(note, e));

    el.addEventListener('pointermove', (e) => {
      if (dragNote !== note) return;
      const nx = e.clientX - note._offX;
      const ny = e.clientY - note._offY;
      note.vx = nx - note.x;   // 记录速度用于抛掷
      note.vy = ny - note.y;
      note.x = nx; note.y = ny;
    });

    const release = () => {
      if (dragNote !== note) return;
      dragNote = null;
      el.classList.remove('dragging');
      note.rotV = rand(-4, 4) * Math.sign(note.vx || 1);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  function ripNote(note, e) {
    if (e) e.stopPropagation();
    spawnBurst(note.x + 95, note.y + 50, note.tone);
    note.el.classList.add('note-rip');
    setTimeout(() => {
      note.el.remove();
      const i = notes.indexOf(note);
      if (i > -1) notes.splice(i, 1);
      updateStats();
    }, 650);
  }

  // === 撕毁粒子迸射 ===
  function spawnBurst(x, y, tone) {
    const colors = ['#ffb86b', '#ff8fb1', '#b388ff', '#62d6c8'];
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), s = rand(2, 9);
      bursts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
        life: 1, size: rand(2, 5), color: colors[tone % 4]
      });
    }
  }

  // === 冲击波（视觉 + 物理） ===
  wall.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.note')) return;
    const r = wall.getBoundingClientRect();
    const wx = e.clientX - r.left, wy = e.clientY - r.top;
    const ring = document.createElement('div');
    ring.className = 'shockwave';
    ring.style.left = wx + 'px'; ring.style.top = wy + 'px';
    wall.appendChild(ring);
    setTimeout(() => ring.remove(), 950);
    waves.push({ x: wx, y: wy, r: 4 });
  });

  // === 物理主循环 ===
  let t = 0;
  function physics() {
    t += 0.008;
    const wr = wall.getBoundingClientRect();

    // 冲击波传播
    for (let i = waves.length - 1; i >= -1 + 0; i--) {
      const w = waves[i];
      if (!w) break;
      w.r += 22;
      if (w.r > 560) { waves.splice(i, 1); continue; }
      for (const n of notes) {
        const dx = n.x + 95 - w.x, dy = n.y + 55 - w.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (Math.abs(dist - w.r) < 60) {
          const f = SHOCK_FORCE * (1 - w.r / 560);
          n.vx += (dx / dist) * f;
          n.vy += (dy / dist) * f;
          n.rotV += rand(-3, 3);
        }
      }
    }

    let totalKE = 0;
    for (const n of notes) {
      if (n !== dragNote) {
        // 弹簧归位
        n.vx += (n.hx - n.x) * SPRING_K;
        n.vy += (n.hy - n.y) * SPRING_K;
        // 环境漂移（值噪声呼吸）
        n.vx += vnoise(t * 2 + n.phase) * 0.06;
        n.vy += vnoise(t * 2 + n.phase + 50) * 0.06;
        // 光标斥力场
        if (cursor.inside) {
          const dx = n.x + 95 - cursor.x, dy = n.y + 55 - cursor.y;
          const dist = Math.hypot(dx, dy);
          if (dist < CURSOR_RADIUS && dist > 0.01) {
            const f = (1 - dist / CURSOR_RADIUS) * CURSOR_FORCE;
            n.vx += (dx / dist) * f;
            n.vy += (dy / dist) * f;
            n.rotV += (dx / dist) * f * 0.15;
          }
        }
        // 阻尼与积分
        n.vx *= SPRING_D; n.vy *= SPRING_D;
        n.x += n.vx; n.y += n.vy;
        // 边界弹性反弹
        if (n.x < 4) { n.x = 4; n.vx *= -0.6; }
        if (n.y < 4) { n.y = 4; n.vy *= -0.6; }
        if (n.x > wr.width - 194) { n.x = wr.width - 194; n.vx *= -0.6; }
        if (n.y > wr.height - 130) { n.y = wr.height - 130; n.vy *= -0.6; }
        // 姿态弹簧
        n.rotV += (n._baseRot ?? (n._baseRot = n.rot)) * 0; // 保持基准角
        n.rotV *= 0.92;
        n.rot += n.rotV;
        n.rotV += (0 - (n.rot - (n._homeRot ??= n.rot))) * 0.004;
      }
      totalKE += Math.abs(n.vx) + Math.abs(n.vy);
      n.el.style.transform = `translate(${n.x}px, ${n.y}px) rotate(${n.rot}deg)`;
    }
    hudEnergy.textContent = (totalKE / Math.max(notes.length, 1) / 10).toFixed(2);
    requestAnimationFrame(physics);
  }

  // === 撕毁粒子渲染（与流场共用画布） ===
  function renderBursts() {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      p.vy += 0.25; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.life -= 0.022;
      if (p.life <= 0) { bursts.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  // === 环境粒子流场 ===
  let W = 0, H = 0;
  const dust = [];
  function resize() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
  }
  function seedDust() {
    dust.length = 0;
    const count = Math.min(90, Math.floor((W * H) / 16000));
    for (let i = 0; i < count; i++) {
      dust.push({ x: rand(0, W), y: rand(0, H), s: rand(0.6, 2.2), ph: rand(0, 100) });
    }
  }
  function renderDust() {
    ctx.clearRect(0, 0, W, H);
    const style = getComputedStyle(body);
    const cA = style.getPropertyValue('--accent').trim();
    ctx.fillStyle = cA;
    for (const d of dust) {
      const ang = vnoise(d.x * 0.002 + t * 3) * Math.PI * 2;
      d.x += Math.cos(ang) * 0.35;
      d.y += Math.sin(ang) * 0.35 + Math.sin(t * 2 + d.ph) * 0.15;
      if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10; if (d.y > H + 10) d.y = -10;
      ctx.globalAlpha = 0.14 + 0.1 * (1 + Math.sin(t * 4 + d.ph)) / 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    renderBursts();
    requestAnimationFrame(renderDust);
  }

  // === 光标追踪 ===
  wall.addEventListener('pointermove', (e) => {
    const r = wall.getBoundingClientRect();
    cursor.x = e.clientX - r.left;
    cursor.y = e.clientY - r.top;
    cursor.inside = true;
  });
  wall.addEventListener('pointerleave', () => { cursor.inside = false; });

  // === 统计 ===
  function updateStats() {
    statCount.textContent = notes.length;
    hudNotes.textContent = notes.length;
    let empty = wall.querySelector('.wall-empty');
    if (!notes.length && !empty) {
      empty = document.createElement('div');
      empty.className = 'wall-empty';
      empty.innerHTML = '<p>EMPTY WALL — 掷下第一张念头</p>';
      wall.appendChild(empty);
    } else if (notes.length && empty) {
      empty.remove();
    }
  }

  // === 配色切换 ===
  paletteRow.addEventListener('click', (e) => {
    const dot = e.target.closest('.palette-dot');
    if (!dot) return;
    body.dataset.palette = dot.dataset.palette;
    paletteRow.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
  });

  // === 输入 ===
  function submit() { addNote(noteInput.value); noteInput.value = ''; }
  addBtn.addEventListener('click', submit);
  noteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  clearBtn.addEventListener('click', () => {
    // 级联撕毁
    notes.slice().forEach((n, i) => setTimeout(() => ripNote(n), i * 90));
  });

  // === 窗口尺寸 ===
  addEventListener('resize', () => { resize(); seedDust(); });

  // === 启动 ===
  function boot() {
    resize(); seedDust();
    physics(); renderDust();
    paletteRow.querySelector('.palette-dot').classList.add('active');
    scrambleReveal(document.getElementById('brand-title'), 'Doodle Note Wall', 30);
    updateStats();
    const seeds = [
      '每一个念头都值得被掷向墙面',
      '弹簧物理让思绪弹跳生根',
      '点击空壁，激起一圈涟漪',
      '双击便签即可撕毁它'
    ];
    seeds.forEach((s, i) => setTimeout(() => addNote(s), 350 + i * 260));
    noteInput.focus();
  }
  boot();
})();
