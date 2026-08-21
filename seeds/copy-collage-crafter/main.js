/* ============================================================
   Copy Collage Crafter — 文案拼贴工坊
   撕碎句子 → 弹簧物理拼贴 → 导出海报
   Vanilla JS · Zero Build
   ============================================================ */

// === DOM Elements ===
const stage = document.getElementById('stage');
const stageEmpty = document.getElementById('stage-empty');
const copyInput = document.getElementById('copy-input');
const tearBtn = document.getElementById('tear-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const scaleRange = document.getElementById('scale-range');
const scaleOut = document.getElementById('scale-out');
const tiltRange = document.getElementById('tilt-range');
const tiltOut = document.getElementById('tilt-out');
const outlineToggle = document.getElementById('outline-toggle');
const countEl = document.getElementById('fragment-count');
const toastEl = document.getElementById('toast');
const particleCanvas = document.getElementById('particle-field');

const PALETTE_VARS = ['--p1', '--p2', '--p3', '--p4'];
const FONTS = [
  "'Outfit', sans-serif",
  "'Inter', sans-serif",
  "'Share Tech Mono', monospace"
];
const SCRAMBLE_GLYPHS = '✂✦⟐♢▮▯△○/A_B-C#%&';

// === State ===
const fragments = [];   // 碎片对象池
let zTop = 1;
let toastTimer = null;

// === Utils ===
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function getCSSVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// === Theme Manager ===
const themeDots = document.querySelectorAll('.theme-dot');
function setTheme(name) {
  document.body.dataset.theme = name;
  themeDots.forEach((d) => d.classList.toggle('active', d.dataset.setTheme === name));
}
themeDots.forEach((d) =>
  d.addEventListener('click', () => {
    setTheme(d.dataset.setTheme);
    restyleAllFragments();
  })
);
setTheme('aurora');

// === Particle Flow Field (Simplex-lite: 正弦扰动流场) ===
const pctx = particleCanvas.getContext('2d');
let particles = [];
function resizeParticles() {
  particleCanvas.width = innerWidth;
  particleCanvas.height = innerHeight;
  particles = Array.from({ length: 70 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: 0, vy: 0, r: rand(0.6, 2.2), a: rand(0.1, 0.5)
  }));
}
addEventListener('resize', resizeParticles);
resizeParticles();

function drawParticles(t) {
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  const accent = getCSSVar('--accent');
  for (const p of particles) {
    const ang = Math.sin(p.x * 0.002 + t * 0.0002) * Math.PI + Math.cos(p.y * 0.0015 - t * 0.00015) * Math.PI;
    p.vx += Math.cos(ang) * 0.015;
    p.vy += Math.sin(ang) * 0.015;
    p.vx *= 0.96; p.vy *= 0.96;
    p.x += p.vx; p.y += p.vy;
    if (p.x < -10) p.x = innerWidth + 10;
    if (p.x > innerWidth + 10) p.x = -10;
    if (p.y < -10) p.y = innerHeight + 10;
    if (p.y > innerHeight + 10) p.y = -10;
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pctx.fillStyle = accent;
    pctx.globalAlpha = p.a;
    pctx.fill();
  }
  pctx.globalAlpha = 1;
}

// === Fragment: 弹簧物理碎片 ===
function createFragment(text, delayIndex) {
  const palette = PALETTE_VARS.map(getCSSVar);
  const el = document.createElement('div');
  el.className = 'fragment entering';
  stage.appendChild(el);

  const baseScale = +scaleRange.value;
  const frag = {
    text, el,
    tx: rand(60, Math.max(80, stage.clientWidth - 160)),
    ty: rand(50, Math.max(80, stage.clientHeight - 100)),
    x: 0, y: 0, vx: 0, vy: 0,
    baseRot: rand(-1, 1) * (+tiltRange.value) * (Math.PI / 180),
    rot: 0, scale: rand(0.85, 1.5),
    dragging: false,
    style: randomStyle(palette, baseScale)
  };
  frag.x = frag.tx + rand(-120, 120);
  frag.y = frag.ty - 160;
  applyStyle(frag);
  scrambleReveal(frag, delayIndex * 70);
  bindDrag(frag);
  el.addEventListener('dblclick', () => {
    frag.style = randomStyle(PALETTE_VARS.map(getCSSVar), +scaleRange.value);
    frag.baseRot = rand(-1, 1) * (+tiltRange.value) * (Math.PI / 180);
    applyStyle(frag);
    el.classList.remove('entering');
    void el.offsetWidth;
    el.classList.add('entering');
  });
  fragments.push(frag);
  return frag;
}

function randomStyle(palette, baseScale) {
  const ratio = rand(0.8, 1.9);
  return {
    font: pick(FONTS),
    ratio,
    size: baseScale * ratio,
    weight: pick([300, 600, 800, 900]),
    color: pick(palette),
    italic: Math.random() < 0.25
  };
}

function applyStyle(frag) {
  const s = frag.style;
  frag.el.textContent = frag.text;
  frag.el.style.fontFamily = s.font;
  frag.el.style.fontSize = s.size + 'px';
  frag.el.style.fontWeight = s.weight;
  frag.el.style.fontStyle = s.italic ? 'italic' : 'normal';
  frag.el.style.color = s.color;
  frag.el.style.setProperty('--fc', s.color);
  frag.el.classList.toggle('ghost-mode', outlineToggle.checked);
}

function restyleAllFragments() {
  const palette = PALETTE_VARS.map(getCSSVar);
  fragments.forEach((f) => {
    f.style.color = pick(palette);
    applyStyle(f);
  });
}

// === 乱码揭示 (Scramble Reveal) ===
function scrambleReveal(frag, delay) {
  const target = frag.text;
  const el = frag.el;
  let frame = 0;
  const totalFrames = 14;
  setTimeout(() => {
    const iv = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const reveal = Math.floor(target.length * progress);
      let out = target.slice(0, reveal);
      for (let i = reveal; i < target.length; i++) {
        out += target[i] === ' ' ? ' ' : pick(SCRAMBLE_GLYPHS);
      }
      el.textContent = out;
      if (frame >= totalFrames) {
        el.textContent = target;
        clearInterval(iv);
      }
    }, 34);
  }, delay);
}

// === Drag: 惯性 + 速度倾斜 + 弹簧回弹 ===
function bindDrag(frag) {
  let offsetX = 0, offsetY = 0, lastX = 0, lastY = 0;

  frag.el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    frag.dragging = true;
    frag.el.classList.add('dragging');
    frag.el.style.zIndex = ++zTop;
    const rect = frag.el.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    frag.x = frag.tx = e.clientX - stageRect.left - offsetX;
    frag.y = frag.ty = e.clientY - stageRect.top - offsetY;
    lastX = e.clientX; lastY = e.clientY;
    frag.el.setPointerCapture(e.pointerId);
  });

  frag.el.addEventListener('pointermove', (e) => {
    if (!frag.dragging) return;
    const stageRect = stage.getBoundingClientRect();
    frag.tx = clamp(e.clientX - stageRect.left - offsetX, -40, stage.clientWidth + 40);
    frag.ty = clamp(e.clientY - stageRect.top - offsetY, -20, stage.clientHeight + 20);
    frag.vx = e.clientX - lastX;
    frag.vy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  });

  const release = () => {
    if (!frag.dragging) return;
    frag.dragging = false;
    frag.el.classList.remove('dragging');
    // 松手：以残余速度抛出，随后被目标位置弹簧拉回
    frag.tx = clamp(frag.x + frag.vx * 8, 10, Math.max(30, stage.clientWidth - 60));
    frag.ty = clamp(frag.y + frag.vy * 8, 10, Math.max(30, stage.clientHeight - 40));
  };
  frag.el.addEventListener('pointerup', release);
  frag.el.addEventListener('pointercancel', release);
}

// === 撕碎成拼贴 ===
function tearCopy() {
  const words = copyInput.value
    .split(/[\s,，。.!！?？;；]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (!words.length) {
    toast('先投喂一句文案吧 ✂');
    return;
  }
  clearStage(false);
  words.forEach((w, i) => createFragment(w, i));
  stageEmpty.classList.add('hidden');
  countEl.textContent = fragments.length;
  toast(`已撕碎为 ${fragments.length} 片碎片 ✦`);
}

// === 打乱布局 (弹簧 FLIP) ===
function shuffleLayout() {
  if (!fragments.length) {
    toast('舞台还是空的，先撕一句 ✂');
    return;
  }
  fragments.forEach((f) => {
    f.tx = rand(30, Math.max(60, stage.clientWidth - 120));
    f.ty = rand(30, Math.max(60, stage.clientHeight - 80));
    f.vx += rand(-14, 14);
    f.vy += rand(-14, 14);
    f.baseRot = rand(-1, 1) * (+tiltRange.value) * (Math.PI / 180);
  });
  toast('布局已重组 ⟲');
}

// === 清空 ===
function clearStage(showEmpty = true) {
  fragments.forEach((f) => f.el.remove());
  fragments.length = 0;
  countEl.textContent = 0;
  if (showEmpty) {
    stageEmpty.classList.remove('hidden');
    toast('画布已清空');
  }
}

// === 导出 PNG (Canvas 手绘渲染) ===
function exportPNG() {
  if (!fragments.length) {
    toast('没有碎片可导出 ✂');
    return;
  }
  const W = 1200, H = 900;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const scaleX = W / stage.clientWidth;
  const scaleY = H / stage.clientHeight;

  // 背景：流体渐变近似
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, getCSSVar('--bg-deep'));
  bg.addColorStop(1, '#1a1030');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.28;
  for (const [cx, cy, r, c] of [
    [W * 0.2, H * 0.15, 420, getCSSVar('--accent')],
    [W * 0.85, H * 0.3, 380, getCSSVar('--accent-2')],
    [W * 0.5, H * 0.95, 460, getCSSVar('--p3')]
  ]) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, c);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 1;

  // 落款
  ctx.font = "13px 'Share Tech Mono', monospace";
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('· COPY COLLAGE CRAFTER · crafted by EDEN ·', 24, H - 24);

  // 碎片
  for (const f of fragments) {
    const s = f.style;
    ctx.save();
    ctx.translate(f.x * scaleX, f.y * scaleY);
    ctx.rotate(f.rot);
    ctx.scale(f.scale, f.scale);
    ctx.font = `${s.italic ? 'italic ' : ''}${s.weight} ${s.size * 1.2}px ${s.font}`;
    if (outlineToggle.checked) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.2;
      ctx.strokeText(f.text, 0, 0);
    } else {
      ctx.fillStyle = s.color;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 16;
      ctx.fillText(f.text, 0, 0);
    }
    ctx.restore();
  }

  const a = document.createElement('a');
  a.download = 'copy-collage.png';
  a.href = cv.toDataURL('image/png');
  a.click();
  toast('海报已导出 ⤓');
}

// === 主循环：弹簧-阻尼物理 ===
function tick(t) {
  drawParticles(t);
  for (const f of fragments) {
    const k = f.dragging ? 0.34 : 0.055;
    const damp = f.dragging ? 0.68 : 0.86;
    f.vx += (f.tx - f.x) * k;
    f.vy += (f.ty - f.y) * k;
    f.vx *= damp; f.vy *= damp;
    f.x += f.vx; f.y += f.vy;
    // 速度驱动倾斜，弹簧回归 baseRot
    const targetRot = f.baseRot + clamp(f.vx * 0.02, -0.4, 0.4);
    f.rot += (targetRot - f.rot) * 0.16;
    const hoverScale = f.dragging ? 1.08 : 1;
    f.el.style.transform =
      `translate3d(${f.x}px, ${f.y}px, 0) rotate(${f.rot}rad) scale(${f.scale * hoverScale})`;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// === Controls Binding ===
tearBtn.addEventListener('click', tearCopy);
shuffleBtn.addEventListener('click', shuffleLayout);
clearBtn.addEventListener('click', () => clearStage(true));
exportBtn.addEventListener('click', exportPNG);

scaleRange.addEventListener('input', () => {
  scaleOut.textContent = scaleRange.value;
  const base = +scaleRange.value;
  fragments.forEach((f) => {
    f.style.size = base * f.style.ratio;
    applyStyle(f);
  });
});
tiltRange.addEventListener('input', () => {
  tiltOut.textContent = tiltRange.value;
});
outlineToggle.addEventListener('change', restyleAllFragments);

document.querySelectorAll('.sample-btn').forEach((b) =>
  b.addEventListener('click', () => {
    copyInput.value = b.dataset.sample;
    tearCopy();
  })
);

copyInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') tearCopy();
});
