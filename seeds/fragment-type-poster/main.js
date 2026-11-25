/* ============================================================
   Fragment Type Poster 碎片字海报 — 交互逻辑
   弹簧-阻尼物理碎片 × 光标力场 × 冲击波 × 乱码揭示
   ============================================================ */

(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const frame = document.getElementById('stage-frame');
  const wordInput = document.getElementById('word-input');
  const forgeBtn = document.getElementById('forge-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const exportBtn = document.getElementById('export-btn');
  const layoutSeg = document.getElementById('layout-seg');
  const forceSeg = document.getElementById('force-seg');
  const moodRow = document.getElementById('mood-row');
  const chaosSlider = document.getElementById('chaos-slider');
  const chaosVal = document.getElementById('chaos-val');
  const caption = document.getElementById('stage-caption');
  const clockEl = document.getElementById('hud-clock');
  const teleFrag = document.getElementById('tele-frag');
  const teleWave = document.getElementById('tele-wave');
  const teleFps = document.getElementById('tele-fps');
  const teleVel = document.getElementById('tele-vel');

  // === State ===
  const GLYPHS = '◫◎◉◈⊞▦≋∿⌁⟐⌗✦*+#%&@$';
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@!?';
  const MOOD_PALETTES = {
    neon:   { a: '#22d3ee', b: '#a78bfa', c: '#f472b6', ink: '#e8f4ff' },
    ember:  { a: '#fb923c', b: '#ef4444', c: '#fbbf24', ink: '#ffedd8' },
    mint:   { a: '#34d399', b: '#2dd4bf', c: '#a3e635', ink: '#e7fff4' },
    violet: { a: '#818cf8', b: '#c084fc', c: '#f0abfc', ink: '#f3e8ff' }
  };

  const state = {
    layout: 'scatter',      // scatter | cascade | orbit | glitch
    force: 'repel',         // repel | attract | vortex | off
    mood: 'neon',
    chaos: 0.5,
    fragments: [],
    waves: [],
    sparks: [],
    posterNo: 0,
    waveCount: 0,
    mouse: { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, inside: false },
    time: 0
  };

  let W = 0, H = 0, DPR = 1;

  // === Utils ===
  const rand = (min, max) => min + Math.random() * (max - min);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const TAU = Math.PI * 2;

  // 简易伪噪声（用于漂移与故障抖动）
  const noise = (x, y, t) =>
    (Math.sin(x * 1.7 + t * 0.9) + Math.sin(y * 2.3 - t * 0.6) + Math.sin((x + y) * 0.9 + t * 1.3)) / 3;

  function palette() { return MOOD_PALETTES[state.mood]; }

  // === Resize ===
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = frame.getBoundingClientRect();
    W = Math.max(320, rect.width);
    H = Math.max(280, rect.height);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    retargetAll();
  }
  window.addEventListener('resize', resize);

  // === Fragment 模型 ===
  function createFragment(ch, i, total) {
    const f = {
      ch,
      ghost: GLYPHS[(Math.random() * GLYPHS.length) | 0],
      x: W / 2 + rand(-40, 40),
      y: H / 2 + rand(-40, 40),
      vx: 0, vy: 0,
      tx: 0, ty: 0,            // 弹簧目标
      rot: rand(-TAU, TAU),
      rotV: 0,
      targetRot: 0,
      scale: 0,
      targetScale: rand(0.9, 1.15),
      size: 0,
      targetSize: 0,
      hue: Math.random(),
      scramble: 1,             // 1 → 0 乱码揭示进度
      scrambleT: rand(0.5, 1.6),
      phase: rand(0, TAU),
      i, total
    };
    assignTarget(f);
    return f;
  }

  // 依据编排模式计算弹簧目标位
  function assignTarget(f) {
    const { layout, chaos } = state;
    const cx = W / 2, cy = H / 2;
    const t = f.total <= 1 ? 0.5 : f.i / (f.total - 1);
    const jx = (noise(f.i * 0.7, 3.1, 0) * 0.5) * 90 * chaos;
    const jy = (noise(f.i * 0.7, 9.4, 0) * 0.5) * 70 * chaos;

    if (layout === 'scatter') {
      // 大字主标散点编排：横向铺开 + 轻微高低错落
      f.targetSize = lerp(64, 128, 1 - Math.abs(t - 0.5) * 1.4);
      f.tx = lerp(W * 0.14, W * 0.86, t) + jx;
      f.ty = cy + Math.sin(t * Math.PI * 2.2) * H * 0.09 + jy - 18;
      f.targetRot = Math.sin(t * Math.PI * 3) * 0.16 * (0.4 + chaos);
    } else if (layout === 'cascade') {
      // 瀑布：字号渐变、自上而下错峰排布
      f.targetSize = lerp(110, 30, t);
      f.tx = lerp(W * 0.18, W * 0.78, t) + jx;
      f.ty = lerp(H * 0.2, H * 0.82, t) + jy;
      f.targetRot = lerp(-0.12, 0.12, t) * (0.5 + chaos);
    } else if (layout === 'orbit') {
      // 环轨：字符环绕海报中心
      const r = Math.min(W, H) * 0.32;
      const ang = t * TAU * 0.92 - Math.PI / 2;
      f.targetSize = lerp(44, 76, 1 - Math.abs(t - 0.5) * 2);
      f.tx = cx + Math.cos(ang) * r + jx * 0.6;
      f.ty = cy + Math.sin(ang) * r * 0.82 + jy * 0.6;
      f.targetRot = ang + Math.PI / 2;
    } else {
      // 故障：错位切片堆叠，行内随机水平撕裂
      const rows = Math.max(2, Math.ceil(f.total / 4));
      const row = Math.floor(f.i / 4);
      const col = f.i % 4;
      f.targetSize = 88;
      f.tx = lerp(W * 0.2, W * 0.8, col / 3) + rand(-26, 26) * chaos * 2;
      f.ty = lerp(H * 0.24, H * 0.8, rows <= 1 ? 0.5 : row / (rows - 1)) + rand(-10, 10);
      f.targetRot = rand(-0.05, 0.05);
    }
    f.targetSize = clamp(f.targetSize, 24, 150);
  }

  function retargetAll() {
    state.fragments.forEach(assignTarget);
  }

  // === 物理步进（弹簧-阻尼） ===
  function stepFragment(f, dt) {
    const t = state.time;
    const chaos = state.chaos;

    // 呼吸漂移
    const driftAmp = 5 + chaos * 22;
    const ox = noise(f.i * 0.5, 1.2, t * 0.5) * driftAmp;
    const oy = noise(f.i * 0.5, 7.7, t * 0.5) * driftAmp;

    // 光标力场
    let fx = 0, fy = 0;
    if (state.force !== 'off' && state.mouse.inside) {
      const dx = f.x - state.mouse.x;
      const dy = f.y - state.mouse.y;
      const d2 = dx * dx + dy * dy;
      const R = 190;
      if (d2 < R * R && d2 > 1) {
        const d = Math.sqrt(d2);
        const falloff = 1 - d / R;
        const strength = 1400 * falloff * falloff;
        if (state.force === 'repel') {
          fx += (dx / d) * strength;
          fy += (dy / d) * strength;
        } else if (state.force === 'attract') {
          fx -= (dx / d) * strength * 0.55;
          fy -= (dy / d) * strength * 0.55;
        } else {
          fx += (-dy / d) * strength * 0.8 - (dx / d) * strength * 0.2;
          fy += (dx / d) * strength * 0.8 - (dy / d) * strength * 0.2;
        }
      }
    }

    // 冲击波
    for (const w of state.waves) {
      const dx = f.x - w.x, dy = f.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const band = Math.abs(d - w.r);
      if (band < 70) {
        const power = (1 - band / 70) * w.power;
        fx += (dx / d) * power * 60;
        fy += (dy / d) * power * 60;
        f.rotV += power * 0.04 * (Math.random() - 0.5);
      }
    }

    // 弹簧-阻尼积分
    const k = 42, damp = 7.2;
    f.vx += ((f.tx + ox - f.x) * k + fx) * dt;
    f.vy += ((f.ty + oy - f.y) * k + fy) * dt;
    f.vx *= Math.exp(-damp * dt);
    f.vy *= Math.exp(-damp * dt);
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    f.rotV += (f.targetRot - f.rot) * 26 * dt;
    f.rotV *= Math.exp(-5.6 * dt);
    f.rot += f.rotV * dt;

    // 故障模式的瞬时撕裂
    if (state.layout === 'glitch' && Math.random() < 0.006 + chaos * 0.014) {
      f.vx += rand(-450, 450);
      f.rotV += rand(-2, 2);
    }

    f.scale += (f.targetScale - f.scale) * Math.min(1, 7 * dt);
    f.size += (f.targetSize - f.size) * Math.min(1, 9 * dt);

    if (f.scramble > 0) f.scramble = Math.max(0, f.scramble - dt / f.scrambleT);
  }

  // === 海报装饰层（导出共用） ===
  function drawDecor() {
    const p = palette();
    const t = state.time;

    // 网格基线
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    const gap = 64;
    for (let x = gap; x < W; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = gap; y < H; y += gap) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // 顶部描边大字幽灵层
    const word = wordInput.value.toUpperCase() || 'FRAGMENT';
    ctx.save();
    ctx.font = `900 ${Math.min(W * 0.24, 210)}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1.2;
    ctx.strokeText(word, W / 2, H * 0.3 + Math.sin(t * 0.4) * 6);
    ctx.restore();

    // 侧边装饰码
    ctx.save();
    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.fillStyle = p.a;
    ctx.globalAlpha = 0.4;
    const code = `FRG/${String(state.posterNo).padStart(3, '0')} · ${state.layout.toUpperCase()} · F/${state.force.toUpperCase()} · C/${state.chaos.toFixed(2)}`;
    ctx.save();
    ctx.translate(20, H * 0.55);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'left';
    ctx.fillText(code, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  // === 渲染 ===
  function render() {
    const p = palette();
    ctx.clearRect(0, 0, W, H);

    drawDecor();

    // 冲击波环
    for (const w of state.waves) {
      ctx.save();
      ctx.strokeStyle = w.hue === 0 ? p.a : w.hue === 1 ? p.b : p.c;
      ctx.globalAlpha = Math.max(0, 1 - w.r / w.maxR) * 0.7;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.globalAlpha *= 0.45;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r * 0.82, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 碎片字符
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of state.fragments) {
      const wob = 1 + Math.sin(state.time * 2 + f.phase) * 0.02;
      const s = f.size * f.scale * wob;
      const showGhost = f.scramble > 0 && Math.floor(state.time * 22 + f.i) % 2 === 0;
      const ch = showGhost ? f.ghost : f.ch;

      const tint = f.hue < 0.33 ? p.a : f.hue < 0.66 ? p.b : p.c;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);

      // 阴影发亮层
      ctx.font = `800 ${s}px Outfit, sans-serif`;
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = tint;
      ctx.fillText(ch, 3, 4);

      // 主体
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette().ink;
      ctx.fillText(ch, 0, 0);

      // 故障色散描边
      if (state.layout === 'glitch' && Math.random() < 0.24) {
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = Math.random() < 0.5 ? p.a : p.c;
        ctx.strokeText(ch, rand(-3, 3), rand(-2, 2));
      }
      ctx.restore();
    }

    // 火花粒子
    for (const s of state.sparks) {
      ctx.save();
      ctx.globalAlpha = clamp(s.life / s.maxLife, 0, 1);
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (s.life / s.maxLife), 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 光标准星光晕
    if (state.mouse.inside && state.force !== 'off') {
      ctx.save();
      const g = ctx.createRadialGradient(state.mouse.x, state.mouse.y, 0, state.mouse.x, state.mouse.y, 130);
      g.addColorStop(0, p.a + '30');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(state.mouse.x - 130, state.mouse.y - 130, 260, 260);
      ctx.strokeStyle = p.a + '66';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(state.mouse.x, state.mouse.y, 190, 0, TAU);
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.restore();
    }
  }

  // === 主循环 ===
  let lastT = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsTimer = 0;

  function loop(now) {
    const dt = Math.min(0.033, (now - lastT) / 1000);
    lastT = now;
    state.time += dt;

    // 光标速度
    state.mouse.vx = state.mouse.x - state.mouse.px;
    state.mouse.vy = state.mouse.y - state.mouse.py;
    state.mouse.px = state.mouse.x;
    state.mouse.py = state.mouse.y;

    for (const f of state.fragments) stepFragment(f, dt);

    // 冲击波演化
    for (const w of state.waves) {
      w.r += w.speed * dt;
      w.power *= Math.exp(-1.6 * dt);
    }
    state.waves = state.waves.filter((w) => w.r < w.maxR && w.power > 0.02);

    // 火花演化
    for (const s of state.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 220 * dt;
      s.vx *= Math.exp(-1.4 * dt);
      s.life -= dt;
    }
    state.sparks = state.sparks.filter((s) => s.life > 0);

    render();

    // FPS 遥测
    fpsAcc += 1 / Math.max(dt, 0.001);
    fpsN++;
    fpsTimer += dt;
    if (fpsTimer > 0.5) {
      teleFps.textContent = String(Math.round(fpsAcc / fpsN));
      teleVel.textContent = Math.hypot(state.mouse.vx, state.mouse.vy).toFixed(2);
      teleFrag.textContent = String(state.fragments.length);
      teleWave.textContent = String(state.waveCount);
      fpsAcc = 0; fpsN = 0; fpsTimer = 0;
    }

    requestAnimationFrame(loop);
  }

  // === 冲击波与火花 ===
  function shockwave(x, y, power = 1) {
    state.waves.push({ x, y, r: 6, speed: 620, power, maxR: Math.max(W, H) * 0.9, hue: (Math.random() * 3) | 0 });
    state.waveCount++;
    const p = palette();
    const tints = [p.a, p.b, p.c];
    for (let i = 0; i < 22; i++) {
      const a = rand(0, TAU);
      const sp = rand(80, 380);
      state.sparks.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        r: rand(1.4, 3.4), life: rand(0.4, 1.1), maxLife: 1.1,
        tint: tints[(Math.random() * 3) | 0]
      });
    }
  }

  // === 锻造 / 洗牌 ===
  function forge() {
    const word = (wordInput.value.trim() || 'FRAGMENT').toUpperCase().slice(0, 18);
    const chars = [...word];
    state.fragments = chars.map((ch, i) => createFragment(ch, i, chars.length));
    state.posterNo++;
    caption.textContent = `${word.replace(/\s+/g, '/')} / POSTER / №${String(state.posterNo).padStart(3, '0')}`;
  }

  function shuffle() {
    // Fisher-Yates 洗牌后重新指派目标 → FLIP 式弹性重组
    for (let i = state.fragments.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [state.fragments[i], state.fragments[j]] = [state.fragments[j], state.fragments[i]];
    }
    state.fragments.forEach((f, i) => { f.i = i; });
    retargetAll();
    state.fragments.forEach((f) => {
      f.scramble = 1;
      f.scrambleT = rand(0.4, 1.2);
    });
  }

  // === 事件绑定 ===
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - r.left;
    state.mouse.y = e.clientY - r.top;
    state.mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => { state.mouse.inside = false; });
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    shockwave(e.clientX - r.left, e.clientY - r.top, 1.4);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== wordInput) {
      e.preventDefault();
      shockwave(W / 2, H / 2, 2.2);
    }
    if (e.key === 'Enter' && document.activeElement === wordInput) forge();
  });

  forgeBtn.addEventListener('click', forge);
  shuffleBtn.addEventListener('click', shuffle);

  layoutSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    layoutSeg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.layout = btn.dataset.layout;
    retargetAll();
  });

  forceSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    forceSeg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.force = btn.dataset.force;
  });

  moodRow.addEventListener('click', (e) => {
    const dot = e.target.closest('.mood-dot');
    if (!dot) return;
    moodRow.querySelectorAll('.mood-dot').forEach((d) => d.classList.remove('active'));
    dot.classList.add('active');
    state.mood = dot.dataset.mood;
    document.body.dataset.mood = state.mood;
  });

  chaosSlider.addEventListener('input', () => {
    state.chaos = parseFloat(chaosSlider.value);
    chaosVal.textContent = state.chaos.toFixed(2);
    retargetAll();
  });

  exportBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `fragment-poster-${String(state.posterNo).padStart(3, '0')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  wordInput.addEventListener('input', () => { clearTimeout(wordInput._t); wordInput._t = setTimeout(forge, 600); });

  // 时钟
  setInterval(() => {
    clockEl.textContent = new Date().toLocaleTimeString('en-GB');
  }, 1000);
  clockEl.textContent = new Date().toLocaleTimeString('en-GB');

  // === Boot ===
  resize();
  forge();
  // 入场错峰：给每个碎片一个随机初速度增强登场感
  state.fragments.forEach((f) => {
    const a = rand(0, TAU);
    const sp = rand(180, 620);
    f.vx = Math.cos(a) * sp;
    f.vy = Math.sin(a) * sp;
  });
  requestAnimationFrame(loop);
})();
