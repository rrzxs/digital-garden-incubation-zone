/* ============================================================
   Morph Ink Cursor · 墨变光标
   弹簧-阻尼驱动的变形墨滴光标 + 墨迹拖尾 / 迸溅 / 环绕模式
   ============================================================ */
(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('ink-canvas');
  const ctx = canvas.getContext('2d');
  const roPos = document.getElementById('ro-pos');
  const roVel = document.getElementById('ro-vel');
  const roDrops = document.getElementById('ro-drops');
  const modeSeg = document.getElementById('mode-seg');
  const themeRow = document.getElementById('theme-row');
  const btnClear = document.getElementById('btn-clear');
  const btnPulse = document.getElementById('btn-pulse');
  const panelToggle = document.getElementById('panel-toggle');
  const panel = document.getElementById('panel');

  // === State ===
  const THEMES = {
    ink:    { blob: '#cfc9f0', trail: ['#b9a4ff', '#5b5f9e'], drop: '#9aa5d2' },
    ember:  { blob: '#ffd4b8', trail: ['#ffb38a', '#a0524a'], drop: '#e8a08a' },
    jade:   { blob: '#c8f5e4', trail: ['#8fe8c8', '#3f8a78'], drop: '#8acfb8' },
    orchid: { blob: '#f4cdf0', trail: ['#f0a8e8', '#7e4a8e'], drop: '#d29ae0' }
  };
  let theme = THEMES.ink;
  let mode = 'trail';
  let viscosity = 0.86;
  let density = 14;
  let spread = 46;

  const mouse = { x: innerWidth / 2, y: innerHeight / 2, px: null, py: null, vx: 0, vy: 0 };
  let trails = [];   // 墨迹拖尾粒子
  let drops = [];    // 迸溅墨滴
  let pulse = null;  // 墨脉冲冲击波

  // === 变形墨滴光标（弹簧-阻尼多边形顶点） ===
  const BLOB_POINTS = 18;
  const blobCursor = {
    x: mouse.x, y: mouse.y,
    pts: Array.from({ length: BLOB_POINTS }, (_, i) => {
      const a = (i / BLOB_POINTS) * Math.PI * 2;
      return { a, r: 18, vr: 0 };
    })
  };

  // === Resize ===
  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  // === Events ===
  addEventListener('mousemove', (e) => {
    if (mouse.px === null) { mouse.px = e.clientX; mouse.py = e.clientY; }
    mouse.vx = e.clientX - mouse.px;
    mouse.vy = e.clientY - mouse.py;
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
  });

  addEventListener('mousedown', (e) => {
    if (e.target.closest('.panel')) return;
    spawnBurst(mouse.x, mouse.y);
  });

  // 面板交互
  modeSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    modeSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
    mode = btn.dataset.mode;
  });

  themeRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.theme-chip');
    if (!chip) return;
    themeRow.querySelectorAll('.theme-chip').forEach(c => c.classList.toggle('active', c === chip));
    document.body.dataset.theme = chip.dataset.theme;
    theme = THEMES[chip.dataset.theme];
  });

  const bindSlider = (id, label, fn) => {
    const el = document.getElementById(id);
    const val = document.getElementById(label);
    el.addEventListener('input', () => { val.textContent = el.value; fn(parseFloat(el.value)); });
  };
  bindSlider('viscosity', 'val-viscosity', v => viscosity = v);
  bindSlider('density', 'val-density', v => density = v);
  bindSlider('spread', 'val-spread', v => spread = v);

  btnClear.addEventListener('click', () => { trails = []; drops = []; pulse = null; });
  btnPulse.addEventListener('click', () => { pulse = { x: mouse.x, y: mouse.y, r: 0, life: 1 }; });
  panelToggle.addEventListener('click', () => panel.classList.toggle('hidden-panel'));

  // === 墨滴迸发 ===
  function spawnBurst(x, y) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 5.5;
      drops.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 1.5 + Math.random() * 4,
        life: 1, decay: 0.008 + Math.random() * 0.014
      });
    }
  }

  // === Trail Spawner ===
  let trailClock = 0;
  function spawnTrails() {
    trailClock++;
    if (trailClock % 3 !== 0) return;
    const speed = Math.hypot(mouse.vx, mouse.vy);
    const n = Math.max(1, Math.round(density / 6));
    for (let i = 0; i < n; i++) {
      const jx = (Math.random() - 0.5) * spread * 0.7;
      const jy = (Math.random() - 0.5) * spread * 0.7;
      trails.push({
        x: mouse.x + jx, y: mouse.y + jy,
        r: 4 + Math.random() * spread * 0.4 + speed * 0.5,
        life: 1, decay: 0.004 + (1 - viscosity) * 0.02,
        hue: Math.random()
      });
    }
  }

  // === Metaball-ish soft rendering ===
  function drawSoft(x, y, r, color, alpha) {
    if (r <= 0.5) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, alpha));
    g.addColorStop(0.6, hexA(color, alpha * 0.45));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // === Blob Cursor Update (spring-damped radius per vertex) ===
  function updateBlob() {
    // 位置：非线性跟随（粘滞）
    blobCursor.x += (mouse.x - blobCursor.x) * 0.32;
    blobCursor.y += (mouse.y - blobCursor.y) * 0.32;

    const speed = Math.hypot(mouse.vx, mouse.vy);
    const dirX = speed > 0.5 ? mouse.vx / speed : 0;
    const dirY = speed > 0.5 ? mouse.vy / speed : 0;

    blobCursor.pts.forEach((p, i) => {
      // 目标半径：基础 + 速度拉伸（沿运动方向延伸，垂直方向收缩）
      const align = p.a === 0 ? 0 : Math.cos(p.a - Math.atan2(dirY, dirX));
      const stretch = speed * 1.6 * Math.max(0, align);
      const squash = speed * 0.5 * Math.max(0, -align);
      const wob = Math.sin(performance.now() * 0.004 + i * 0.7) * 1.6;
      const target = 16 + stretch - squash + wob;
      // 弹簧-阻尼
      p.vr += (target - p.r) * 0.18;
      p.vr *= 0.78;
      p.r += p.vr;
    });
  }

  function drawBlob() {
    ctx.save();
    ctx.translate(blobCursor.x, blobCursor.y);
    ctx.beginPath();
    blobCursor.pts.forEach((p, i) => {
      const x = Math.cos(p.a) * p.r;
      const y = Math.sin(p.a) * p.r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 42);
    grad.addColorStop(0, hexA(theme.blob, 0.95));
    grad.addColorStop(0.7, hexA(theme.trail[0], 0.7));
    grad.addColorStop(1, hexA(theme.trail[1], 0.25));
    ctx.fillStyle = grad;
    ctx.shadowColor = theme.trail[0];
    ctx.shadowBlur = 26;
    ctx.fill();
    ctx.restore();
  }

  // === Main Loop ===
  let prev = performance.now();
  function loop(now) {
    const dt = Math.min((now - prev) / 16.67, 2.5);
    prev = now;

    // 拖尾衰减（半透明覆盖产生余晖）
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.075)';
    ctx.fillRect(0, 0, innerWidth, innerHeight);

    // 更新
    if (mode === 'trail') spawnTrails();
    if (mode === 'orbit') {
      const t = now * 0.0012;
      for (let i = 0; i < density; i++) {
        const a = t + (i / density) * Math.PI * 2;
        const rx = spread * 1.8 + Math.sin(t * 2 + i) * 14;
        const ry = spread * 1.3 + Math.cos(t * 2.3 + i) * 12;
        trails.push({
          x: mouse.x + Math.cos(a) * rx,
          y: mouse.y + Math.sin(a) * ry,
          r: 5 + Math.sin(t * 3 + i) * 3,
          life: 1, decay: 0.02, hue: i / density
        });
      }
    }
    if (mode === 'burst' && Math.hypot(mouse.vx, mouse.vy) > 8 && Math.random() < 0.3) {
      spawnBurst(mouse.x, mouse.y);
    }

    updateBlob();

    // 绘制墨迹
    ctx.globalCompositeOperation = 'lighter';
    trails = trails.filter(t => t.life > 0);
    trails.forEach(t => {
      const c = theme.trail[t.hue > 0.5 ? 1 : 0];
      drawSoft(t.x, t.y, t.r * t.life, c, 0.28 * t.life);
      t.life -= t.decay * dt;
      t.r *= 0.995;
    });

    // 绘制墨滴
    drops = drops.filter(d => d.life > 0);
    drops.forEach(d => {
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vy += 0.06 * dt; d.vx *= 0.985; d.vy *= 0.985;
      drawSoft(d.x, d.y, d.r * 2.2 * d.life, theme.drop, 0.6 * d.life);
      d.life -= d.decay * dt;
    });

    // 绘制墨脉冲
    if (pulse) {
      pulse.r += 9 * dt;
      pulse.life -= 0.02 * dt;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.r, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(theme.blob, Math.max(0, pulse.life) * 0.5);
      ctx.lineWidth = 2.5 * pulse.life;
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, Math.max(0, pulse.r - 30 * (i + 1)), 0, Math.PI * 2);
        ctx.strokeStyle = hexA(theme.trail[0], Math.max(0, pulse.life - 0.2 * i) * 0.3);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      if (pulse.life <= 0) pulse = null;
    }

    // 光标墨滴
    drawBlob();
    ctx.globalCompositeOperation = 'source-over';

    // 遥测
    roPos.textContent = `${mouse.x | 0}, ${mouse.y | 0}`;
    roVel.textContent = Math.hypot(mouse.vx, mouse.vy).toFixed(2);
    roDrops.textContent = drops.length;

    // 速度衰减
    mouse.vx *= 0.9; mouse.vy *= 0.9;

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
