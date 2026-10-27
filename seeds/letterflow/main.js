/* ============================================================
   Letterflow 字符流 — 交互逻辑
   弹簧-阻尼字符物理 + 流场驱动 + 光标力场 + 冲击波
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('flow');
  const ctx = canvas.getContext('2d');
  const input = document.getElementById('seedInput');
  const castBtn = document.getElementById('castBtn');
  const clearBtn = document.getElementById('clearBtn');
  const titleEl = document.getElementById('title');
  const glyphCountEl = document.getElementById('glyphCount');
  const pulseCountEl = document.getElementById('pulseCount');
  const fpsEl = document.getElementById('fps');

  // === State ===
  const state = {
    flow: 'river',        // river | vortex | drift | rain
    force: 'repel',       // repel | attract | swirl | none
    glyphs: [],
    pulses: [],
    pulsesTotal: 0,
    mouse: { x: -9999, y: -9999, active: false },
    time: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  };

  const THEMES = {
    aurora: ['#6ee7b7', '#818cf8', '#f0abfc'],
    dusk:   ['#fbbf24', '#fb7185', '#a78bfa'],
    abyss:  ['#22d3ee', '#3b82f6', '#8b5cf6'],
    bloom:  ['#fda4af', '#f472b6', '#c084fc']
  };
  let palette = THEMES.aurora;

  // === Canvas Sizing ===
  function resize() {
    canvas.width = innerWidth * state.dpr;
    canvas.height = innerHeight * state.dpr;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  // === Simplex-ish 值噪声流场 ===
  function noiseAngle(x, y, t) {
    const s = 0.0022;
    const a = Math.sin(x * s * 1.7 + t * 0.5) + Math.cos(y * s * 1.3 - t * 0.35);
    const b = Math.sin((x + y) * s + t * 0.28) + Math.cos((x - y) * s * 0.8 - t * 0.4);
    return Math.atan2(a, b);
  }

  // === Glyph 实体 ===
  let gid = 0;
  function spawnGlyph(char, x, y, delay) {
    state.glyphs.push({
      id: gid++,
      char,
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      homeX: x, homeY: y,
      size: 16 + Math.random() * 16,
      rot: (Math.random() - 0.5) * 0.6,
      vr: (Math.random() - 0.5) * 0.04,
      color: palette[(Math.random() * palette.length) | 0],
      born: -delay || 0,           // 负值 = 尚未出生（延迟入场）
      phase: Math.random() * Math.PI * 2
    });
  }

  function castText(text) {
    const str = (text || input.value).trim();
    if (!str) return;
    const cx = innerWidth / 2 + (Math.random() - 0.5) * 120;
    const cy = innerHeight * 0.42 + (Math.random() - 0.5) * 80;
    const chars = [...str].slice(0, 24);
    chars.forEach((ch, i) => {
      const ang = (i / chars.length) * Math.PI * 2;
      const r = 40 + Math.random() * 30;
      spawnGlyph(ch, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, i * 3.5);
    });
    firePulse(cx, cy, 0.6);
    input.value = '';
    if (state.glyphs.length > 220) state.glyphs.splice(0, state.glyphs.length - 220);
  }

  // === 冲击波 ===
  function firePulse(x, y, strength) {
    state.pulses.push({ x, y, r: 4, life: 1, strength: strength || 1 });
    state.pulsesTotal++;
  }

  // === 物理更新 ===
  function updateGlyphs(dt) {
    const m = state.mouse;
    for (const g of state.glyphs) {
      if (g.born < 0) { g.born += dt; continue; }

      // 流场驱动
      let ax = 0, ay = 0;
      const t = state.time;
      if (state.flow === 'river') {
        const a = noiseAngle(g.x, g.y, t);
        ax = Math.cos(a) * 0.045; ay = Math.sin(a) * 0.045 + 0.012;
      } else if (state.flow === 'vortex') {
        const dx = g.x - innerWidth / 2, dy = g.y - innerHeight / 2;
        const d = Math.hypot(dx, dy) + 1;
        ax = (-dy / d) * 0.06 - (dx / d) * 0.012;
        ay = (dx / d) * 0.06 - (dy / d) * 0.012;
      } else if (state.flow === 'drift') {
        const a = noiseAngle(g.x, g.y, t * 0.4) + Math.sin(g.phase + t * 0.7) * 0.8;
        ax = Math.cos(a) * 0.03; ay = Math.sin(a) * 0.03;
      } else { // rain
        ax = Math.sin(g.y * 0.01 + t) * 0.015;
        ay = 0.09 + Math.sin(g.phase) * 0.02;
      }

      // 光标力场
      if (m.active && state.force !== 'none') {
        const dx = g.x - m.x, dy = g.y - m.y;
        const d = Math.hypot(dx, dy);
        const R = 180;
        if (d < R && d > 0.5) {
          const f = (1 - d / R);
          if (state.force === 'repel') { ax += (dx / d) * f * 0.9; ay += (dy / d) * f * 0.9; }
          else if (state.force === 'attract') { ax -= (dx / d) * f * 0.5; ay -= (dy / d) * f * 0.5; }
          else { ax += (-dy / d) * f * 1.1; ay += (dx / d) * f * 1.1; }
          g.rot += f * 0.03;
        }
      }

      // 冲击波
      for (const p of state.pulses) {
        const dx = g.x - p.x, dy = g.y - p.y;
        const d = Math.hypot(dx, dy);
        if (Math.abs(d - p.r) < 46 && d > 1) {
          const f = p.life * p.strength * 1.6 * (1 - Math.abs(d - p.r) / 46);
          ax += (dx / d) * f; ay += (dy / d) * f;
        }
      }

      // 弹簧-阻尼积分
      g.vx += ax * dt; g.vy += ay * dt;
      g.vx *= 0.96; g.vy *= 0.96;
      g.x += g.vx * dt; g.y += g.vy * dt;
      g.rot += g.vr;

      // 呼吸缩放
      g.scale = 1 + Math.sin(t * 1.6 + g.phase) * 0.08;

      // 边界环绕
      const pad = 60;
      if (g.x < -pad) g.x = innerWidth + pad;
      if (g.x > innerWidth + pad) g.x = -pad;
      if (g.y < -pad) g.y = innerHeight + pad;
      if (g.y > innerHeight + pad) g.y = -pad;
    }

    // 清理过老 glyph（寿命机制保持画面新鲜）
    state.glyphs = state.glyphs.filter(g => g.born < 1400);
  }

  // === 渲染 ===
  function render() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 光标力场光环
    if (state.mouse.active && state.force !== 'none') {
      const grad = ctx.createRadialGradient(state.mouse.x, state.mouse.y, 0, state.mouse.x, state.mouse.y, 180);
      grad.addColorStop(0, 'rgba(255,255,255,0.06)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(state.mouse.x, state.mouse.y, 180, 0, Math.PI * 2);
      ctx.fill();
    }

    // 字符
    for (const g of state.glyphs) {
      if (g.born < 0) continue;
      const alpha = Math.min(1, g.born / 30) * 0.92;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      ctx.scale(g.scale, g.scale);
      ctx.font = `600 ${g.size}px 'Outfit', sans-serif`;
      ctx.fillStyle = g.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 14;
      ctx.fillText(g.char, 0, 0);
      ctx.restore();
    }

    // 冲击波环
    ctx.globalAlpha = 1;
    for (const p of state.pulses) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = palette[1];
      ctx.globalAlpha = p.life * 0.55;
      ctx.lineWidth = 2 + p.life * 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // === 主循环 ===
  let last = performance.now();
  let fpsAcc = 60;
  function loop(now) {
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;
    state.time = now / 1000;

    updateGlyphs(dt);
    for (const p of state.pulses) { p.r += 5.5 * dt * p.strength; p.life -= 0.018 * dt; }
    state.pulses = state.pulses.filter(p => p.life > 0);
    render();

    // 遥测（每 ~15 帧）
    fpsAcc = fpsAcc * 0.95 + (1 / Math.max((now - (loop._p || now - 16)) / 1000, 0.001)) * 0.05;
    loop._p = now;
    if ((loop._n = (loop._n || 0) + 1) % 15 === 0) {
      glyphCountEl.textContent = state.glyphs.length;
      pulseCountEl.textContent = state.pulsesTotal;
      fpsEl.textContent = Math.round(Math.min(fpsAcc, 240));
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // === 交互事件 ===
  castBtn.addEventListener('click', () => castText());
  input.addEventListener('keydown', e => { if (e.key === 'Enter') castText(); });
  clearBtn.addEventListener('click', () => {
    state.glyphs.length = 0;
    firePulse(innerWidth / 2, innerHeight / 2, 1.4);
  });

  canvas.addEventListener('pointermove', e => {
    state.mouse.x = e.clientX; state.mouse.y = e.clientY; state.mouse.active = true;
  });
  canvas.addEventListener('pointerleave', () => { state.mouse.active = false; });
  canvas.addEventListener('pointerdown', e => {
    firePulse(e.clientX, e.clientY, 1);
    // 点击处迸发随机字符
    for (let i = 0; i < 6; i++) {
      const ch = String.fromCharCode(65 + ((Math.random() * 26) | 0));
      spawnGlyph(ch, e.clientX + (Math.random() - 0.5) * 40, e.clientY + (Math.random() - 0.5) * 40, i * 2);
    }
  });

  // 键盘快捷播撒：任意字母键 + Alt
  addEventListener('keydown', e => {
    if (e.altKey && /^[a-zA-Z]$/.test(e.key)) castText(e.key.repeat(3));
  });

  // === 分段控件 ===
  function bindSeg(segId, attr, key) {
    const seg = document.getElementById(segId);
    seg.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      seg.querySelectorAll('button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      state[key] = btn.dataset[attr];
    });
  }
  bindSeg('flowSeg', 'flow', 'flow');
  bindSeg('forceSeg', 'force', 'force');

  // === 主题切换 ===
  document.getElementById('swatches').addEventListener('click', e => {
    const btn = e.target.closest('.sw');
    if (!btn) return;
    document.querySelectorAll('.sw').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const theme = btn.dataset.theme;
    document.body.dataset.theme = theme;
    palette = THEMES[theme];
    state.glyphs.forEach(g => g.color = palette[(Math.random() * palette.length) | 0]);
  });

  // === 标题乱码揭示 ===
  function scrambleReveal(el, duration) {
    const target = el.dataset.text;
    const pool = '▚▞█▓▒░#@$%&*+=<>/\\|~^';
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const settled = Math.floor(eased * target.length);
      let out = target.slice(0, settled);
      for (let i = settled; i < target.length; i++) {
        out += target[i] === ' ' ? ' ' : pool[(Math.random() * pool.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  scrambleReveal(titleEl, 1600);

  // === 初始播撒 ===
  setTimeout(() => castText('LETTERFLOW'), 700);
  setTimeout(() => castText('字符流'), 1800);
})();
