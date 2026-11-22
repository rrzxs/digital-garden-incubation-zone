/**
 * 日光墙 · Sunlight Wall Sim
 * 沉浸式日光墙模拟：时间驱动的太阳轨迹、墙面光斑、百叶帘影、
 * 焦散微光、悬浮尘埃、窗台绿影与三种交互模式（云影 / 掌影 / 微风）。
 *
 * 免构建 · Vanilla JS + Canvas 2D
 */
'use strict';

/* ==========================================================================
 * 1. 配置与状态
 * ========================================================================== */

// 墙面主题（画布侧颜色，与 CSS data-theme 同步）
const THEMES = {
  sand:    { name: '暖砂', wallA: '#f0e7d9', wallB: '#d8c8b0', frame: '#7c6c54', sill: '#c7b593' },
  plaster: { name: '灰泥', wallA: '#e9eae5', wallB: '#c2c6bc', frame: '#6f7469', sill: '#b3b8ad' },
  terra:   { name: '赤陶', wallA: '#eed9c6', wallB: '#cf9d7b', frame: '#7e5136', sill: '#bb855f' },
  ink:     { name: '墨青', wallA: '#e0e4ea', wallB: '#aab3c2', frame: '#535c6c', sill: '#98a2b2' }
};

// 昼夜色彩关键帧：t 小时 → 天空/光球/光斑颜色 + 夜间度
const SKY_STOPS = [
  { t: 0,    top: '#070b18', bot: '#101a30', orb: '#e8eeff', light: '#93a8d6', n: 1 },
  { t: 5,    top: '#0b1226', bot: '#22304e', orb: '#eae4d0', light: '#8fa0c8', n: 1 },
  { t: 6.3,  top: '#2c4a78', bot: '#f0955a', orb: '#ffcf99', light: '#ffb877', n: 0 },
  { t: 8.5,  top: '#6fa8dc', bot: '#dcecf6', orb: '#fff4d6', light: '#ffedc2', n: 0 },
  { t: 12.5, top: '#4f97e0', bot: '#c9e6f6', orb: '#ffffff', light: '#fff7e8', n: 0 },
  { t: 15.5, top: '#6b9bd0', bot: '#f2dcae', orb: '#fff0c0', light: '#ffe3b0', n: 0 },
  { t: 18.2, top: '#3a3f70', bot: '#ef6a3a', orb: '#ff9e5e', light: '#ff9550', n: 0 },
  { t: 19.6, top: '#131a33', bot: '#33395e', orb: '#d8e0ff', light: '#8b9cc8', n: 1 },
  { t: 24,   top: '#070b18', bot: '#101a30', orb: '#e8eeff', light: '#93a8d6', n: 1 }
];

// 物件类型（点击窗台循环摆放）
const OBJECT_TYPES = ['fern', 'bottle', 'book'];

const state = {
  time: 15,          // 0..24 小时
  intensity: 1,      // 光强倍率
  dust: 1,           // 尘埃密度倍率
  mode: 'cloud',     // cloud | hand | breeze
  theme: 'sand',
  bloom: 0,          // 点击瞬时光量增益（衰减）
  pointer: { x: -1e4, y: -1e4, active: false },
  parallax: { ox: 0, oy: 0, tx: 0, ty: 0 }
};

/* ==========================================================================
 * 2. DOM 元素
 * ========================================================================== */

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const els = {
  time: document.getElementById('in-time'),
  int: document.getElementById('in-int'),
  dust: document.getElementById('in-dust'),
  outTime: document.getElementById('out-time'),
  outInt: document.getElementById('out-int'),
  outDust: document.getElementById('out-dust'),
  hudTime: document.getElementById('hud-time'),
  hudAlt: document.getElementById('hud-alt'),
  hudAzi: document.getElementById('hud-azi'),
  hudLux: document.getElementById('hud-lux'),
  hudMode: document.getElementById('hud-mode'),
  hudTheme: document.getElementById('hud-theme'),
  clear: document.getElementById('btn-clear'),
  title: document.getElementById('title')
};

/* ==========================================================================
 * 3. 工具函数
 * ========================================================================== */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(lerp(ca[2], cb[2], t))})`;
}

function rgbaFromHex(hex, alpha) {
  const c = hexToRgb(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

// 三维值噪声 + fbm（驱动云影 / 焦散微光 / 尘埃流场）
function hash3(ix, iy, iz) {
  let h = (ix * 374761393 + iy * 668265263 + iz * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const c000 = hash3(ix, iy, iz), c100 = hash3(ix + 1, iy, iz);
  const c010 = hash3(ix, iy + 1, iz), c110 = hash3(ix + 1, iy + 1, iz);
  const c001 = hash3(ix, iy, iz + 1), c101 = hash3(ix + 1, iy, iz + 1);
  const c011 = hash3(ix, iy + 1, iz + 1), c111 = hash3(ix + 1, iy + 1, iz + 1);
  const x00 = lerp(c000, c100, u), x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u), x11 = lerp(c011, c111, u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

function fbm3(x, y, z) {
  let sum = 0, amp = 0.62, f = 1;
  for (let i = 0; i < 3; i++) {
    sum += amp * vnoise3(x * f, y * f, z * f);
    amp *= 0.5;
    f *= 2.1;
  }
  return sum;
}

// 时间格式化：15.35 → "15:21"
function formatTime(t) {
  const h = Math.floor(t) % 24;
  const m = Math.floor((t - Math.floor(t)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 昼夜插值：返回某时刻的天空/光色参数
function sampleSky(t) {
  const stops = SKY_STOPS;
  let i = 0;
  while (i < stops.length - 2 && t >= stops[i + 1].t) i++;
  const a = stops[i], b = stops[i + 1];
  const k = clamp((t - a.t) / (b.t - a.t), 0, 1);
  const ke = k * k * (3 - 2 * k);
  return {
    top: mixHex(a.top, b.top, ke),
    bot: mixHex(a.bot, b.bot, ke),
    orb: mixHex(a.orb, b.orb, ke),
    light: mixHex(a.light, b.light, ke),
    night: lerp(a.n, b.n, ke)
  };
}

/* ==========================================================================
 * 4. 场景实体（尘埃 / 星星 / 云朵 / 窗台物件 / 涟漪）
 * ========================================================================== */

const dustPool = [];
for (let i = 0; i < 220; i++) {
  dustPool.push({
    x: Math.random(), y: Math.random(),
    z: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2
  });
}

const stars = [];
for (let i = 0; i < 46; i++) {
  stars.push({ fx: Math.random(), fy: Math.random() * 0.72, phase: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 1.3 });
}

const clouds = [
  { fy: 0.16, v: 0.010, s: 1.15, off: 0.10 },
  { fy: 0.34, v: 0.016, s: 0.85, off: 0.55 },
  { fy: 0.55, v: 0.007, s: 1.35, off: 0.80 },
  { fy: 0.72, v: 0.013, s: 0.7, off: 0.32 }
];

const objects = [];   // 窗台物件：{ x, type, phase }
const ripples = [];   // 点击光波：{ x, y, r, a }

/* ==========================================================================
 * 5. 画布尺寸与墙面纹理
 * ========================================================================== */

let W = 0, H = 0, DPR = 1;
const wallTexture = document.createElement('canvas');
const wallCtx = wallTexture.getContext('2d');

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildWallTexture();
}

function buildWallTexture() {
  const th = THEMES[state.theme];
  wallTexture.width = Math.round(W * DPR);
  wallTexture.height = Math.round(H * DPR);
  wallCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const g = wallCtx.createLinearGradient(0, 0, W * 0.2, H);
  g.addColorStop(0, th.wallA);
  g.addColorStop(1, th.wallB);
  wallCtx.fillStyle = g;
  wallCtx.fillRect(0, 0, W, H);

  // 中央柔光，让墙面有呼吸的明暗
  const rg = wallCtx.createRadialGradient(W * 0.52, H * 0.4, 0, W * 0.52, H * 0.4, Math.max(W, H) * 0.62);
  rg.addColorStop(0, 'rgba(255,252,244,0.5)');
  rg.addColorStop(1, 'rgba(255,252,244,0)');
  wallCtx.fillStyle = rg;
  wallCtx.fillRect(0, 0, W, H);

  // 微颗粒质感
  wallCtx.globalAlpha = 0.05;
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    wallCtx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#3a3226';
    wallCtx.fillRect(x, y, 1.2, 1.2);
  }
  wallCtx.globalAlpha = 1;
}

/* ==========================================================================
 * 6. 几何：窗与光斑
 * ========================================================================== */

function windowLayout() {
  const winW = clamp(W * 0.3, 220, 400);
  const winH = clamp(H * 0.52, 300, 580);
  const x0 = clamp(W * 0.08, 28, 120);
  const y0 = (H - winH) / 2 - H * 0.02;
  return { x0, y0, x1: x0 + winW, y1: y0 + winH, w: winW, h: winH };
}

// 太阳参数：高度角、方位、光斑几何
function sunModel(t) {
  const dayP = (t - 6) / 12;
  const isDay = dayP >= 0 && dayP <= 1;
  const altN = isDay ? Math.sin(Math.PI * dayP) : 0;
  // 夜间用一条平缓的月弧
  const nightP = isDay ? 0 : ((t >= 18 ? t - 18 : t + 6) / 12);
  const altNMoon = 0.32 + 0.3 * Math.sin(Math.PI * clamp(nightP, 0, 1));
  const alt = isDay ? 4 + altN * 64 : 14 + altNMoon * 40;
  const azi = isDay ? -78 + 156 * dayP : -60 + 120 * clamp(nightP, 0, 1);
  return { dayP, isDay, altN, nightP, alt, azi };
}

// 光斑四边形：从窗口沿太阳方向投在墙上
function patchGeometry(win, sun, brightScale) {
  const L = Math.min(win.w * (0.9 + (1 - sun.altN) * 2.3) * (0.65 + 0.55 * state.intensity), W - win.x1 - 18);
  const drop = win.h * (0.08 + (1 - sun.altN) * 0.82);
  const p0 = { x: win.x1, y: win.y0 + win.h * 0.12 };
  const p1 = { x: win.x1, y: win.y1 - win.h * 0.05 };
  const p2 = { x: p1.x + L, y: p1.y + drop };
  const p3 = { x: p0.x + L, y: p0.y + drop };
  const path = new Path2D();
  path.moveTo(p0.x, p0.y);
  path.lineTo(p1.x, p1.y);
  path.lineTo(p2.x, p2.y);
  path.lineTo(p3.x, p3.y);
  path.closePath();
  return { p0, p1, p2, p3, path, L, drop, brightScale };
}

/* ==========================================================================
 * 7. 渲染
 * ========================================================================== */

let lastTs = 0;
let elapsed = 0;

function render(ts) {
  const dt = Math.min((ts - lastTs) / 1000 || 0.016, 0.05);
  lastTs = ts;
  elapsed += dt;

  // 视差缓动（非线性趋近）
  const px = state.pointer.active ? state.pointer.x / W - 0.5 : 0;
  const py = state.pointer.active ? state.pointer.y / H - 0.5 : 0;
  state.parallax.tx = px * 12;
  state.parallax.ty = py * 9;
  state.parallax.ox = lerp(state.parallax.ox, state.parallax.tx, 0.035);
  state.parallax.oy = lerp(state.parallax.oy, state.parallax.ty, 0.035);

  state.bloom = Math.max(0, state.bloom - dt * 0.7);

  const sky = sampleSky(state.time);
  const sun = sunModel(state.time);

  // 云影系数：cloud 模式下深呼吸式明暗
  const cloudSpeed = state.mode === 'cloud' ? 0.10 : 0.035;
  const cloudDepth = state.mode === 'cloud' ? 0.62 : 0.2;
  const cn = fbm3(elapsed * cloudSpeed, 3.7, 1.3);
  const cloudFactor = clamp(1 - cloudDepth * Math.max(0, cn - 0.42) * 2.2, 0.12, 1);

  const baseB = sun.isDay
    ? (0.22 + 0.78 * sun.altN)
    : 0.24; // 月光
  const breathing = 1 + 0.035 * Math.sin(elapsed * 0.55);
  const B = clamp(baseB * state.intensity * cloudFactor * breathing * (1 + state.bloom * 0.8), 0, 1.25);

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(state.parallax.ox, state.parallax.oy);

  const win = windowLayout();
  const patch = patchGeometry(win, sun, 1);

  drawWall();
  drawLightPatch(win, patch, sky, sun, B);
  drawWindow(win, sky, sun);
  drawSill(win, sun, B);
  drawDust(patch, sky, B, dt);
  drawRipples(patch, sky, dt);

  ctx.restore();

  updateHud(sky, sun, B);
  requestAnimationFrame(render);
}

/* --- 墙面 --------------------------------------------------------------- */
function drawWall() {
  ctx.drawImage(wallTexture, 0, 0, W, H);
}

/* --- 光斑：主体 + 环境辉光 + 帘影条带 + 焦散微光 ------------------------ */
function drawLightPatch(win, patch, sky, sun, B) {
  if (B <= 0.01) return;
  const light = sky.light;

  // 1) 环境辉光：更大更淡的一层
  ctx.save();
  ctx.filter = 'blur(46px)';
  const glow = ctx.createLinearGradient(patch.p0.x, 0, patch.p2.x, 0);
  glow.addColorStop(0, rgbaFromHex('#fff3d8', 0.16 * B));
  glow.addColorStop(1, 'rgba(255,243,216,0)');
  ctx.fillStyle = glow;
  ctx.fill(patch.path);
  ctx.restore();

  // 2) 光斑主体（柔边）
  ctx.save();
  ctx.filter = 'blur(16px)';
  const g = ctx.createLinearGradient(patch.p0.x, (patch.p0.y + patch.p1.y) / 2, patch.p2.x, (patch.p3.y + patch.p2.y) / 2);
  g.addColorStop(0, rgbaFromHex('#ffffff', 0.5 * B));
  g.addColorStop(0.55, rgbaFromHex('#ffe9bd', 0.3 * B));
  g.addColorStop(1, 'rgba(255,230,180,0)');
  ctx.fillStyle = g;
  ctx.fill(patch.path);
  ctx.restore();

  // 3) 帘影条带（百叶帘的水平明暗带，随时间缓慢流动）
  ctx.save();
  ctx.clip(patch.path);
  const bandGap = 30;
  const topY = Math.min(patch.p0.y, patch.p3.y) - 4;
  const botY = Math.max(patch.p1.y, patch.p2.y) + 4;
  const shimmerSpeed = state.mode === 'breeze' ? 26 : 9;
  for (let y = topY; y < botY; y += bandGap) {
    const nz = fbm3(y * 0.012, elapsed * 0.12 * (shimmerSpeed / 9), 7.7);
    const a = 0.05 + 0.09 * nz;
    const band = ctx.createLinearGradient(0, y, 0, y + bandGap * 0.62);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, rgbaFromHex('#fff8e6', a * B));
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(patch.p0.x - 4, y, (patch.p2.x - patch.p0.x) + 12, bandGap * 0.62);
  }

  // 4) 焦散微光：三团缓慢游弋的亮斑
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const nx = fbm3(i * 5.1 + 1, elapsed * 0.09, 4.2);
    const ny = fbm3(i * 3.3 + 9, elapsed * 0.08, 8.8);
    const cx = lerp(patch.p0.x, patch.p2.x, 0.18 + 0.55 * nx);
    const cy = lerp(patch.p0.y, patch.p2.y, 0.2 + 0.6 * ny);
    const r = 70 + 60 * ny;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    cg.addColorStop(0, rgbaFromHex('#fff2cf', 0.10 * B * (0.4 + nx)));
    cg.addColorStop(1, 'rgba(255,242,207,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();

  // 5) 掌影模式：光标如一片云压暗光斑
  if (state.mode === 'hand' && state.pointer.active) {
    ctx.save();
    ctx.clip(patch.path);
    const r = 130;
    const sg = ctx.createRadialGradient(state.pointer.x, state.pointer.y, 0, state.pointer.x, state.pointer.y, r);
    sg.addColorStop(0, 'rgba(28,22,30,0.5)');
    sg.addColorStop(0.7, 'rgba(28,22,30,0.28)');
    sg.addColorStop(1, 'rgba(28,22,30,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(state.pointer.x - r, state.pointer.y - r, r * 2, r * 2);
    ctx.restore();
  }
}

/* --- 窗：天空 / 日月 / 星辰 / 云 / 窗棂 ---------------------------------- */
function drawWindow(win, sky, sun) {
  const th = THEMES[state.theme];
  const pad = 13; // 窗框外沿

  // 天空（窗洞内）
  ctx.save();
  const hole = new Path2D();
  hole.rect(win.x0, win.y0, win.w, win.h);
  ctx.clip(hole);

  const g = ctx.createLinearGradient(0, win.y0, 0, win.y1);
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.bot);
  ctx.fillStyle = g;
  ctx.fillRect(win.x0, win.y0, win.w, win.h);

  // 星辰
  if (sky.night > 0.05) {
    for (const s of stars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * 2.4 + s.phase));
      ctx.fillStyle = `rgba(235,240,255,${sky.night * tw * 0.85})`;
      ctx.fillRect(win.x0 + s.fx * win.w, win.y0 + s.fy * win.h, s.s, s.s);
    }
  }

  // 日 / 月
  const isDay = sun.isDay;
  const prog = isDay ? sun.dayP : sun.nightP;
  const ox = win.x0 + win.w * (0.1 + 0.8 * clamp(prog, 0, 1));
  const oy = win.y1 - win.h * (0.1 + 0.68 * (isDay ? sun.altN : 0.55));
  const orbR = isDay ? 21 : 15;
  const orbGlow = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbR * 5.2);
  orbGlow.addColorStop(0, rgbaFromHex('#ffffff', isDay ? 0.85 : 0.55));
  orbGlow.addColorStop(0.25, rgbaFromHex(isDay ? '#ffe9b0' : '#cfd9ff', isDay ? 0.4 : 0.26));
  orbGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = orbGlow;
  ctx.fillRect(ox - orbR * 5.2, oy - orbR * 5.2, orbR * 10.4, orbR * 10.4);
  ctx.beginPath();
  ctx.arc(ox, oy, orbR, 0, Math.PI * 2);
  ctx.fillStyle = sky.orb;
  ctx.fill();
  if (!isDay) {
    // 月面阴影
    ctx.beginPath();
    ctx.arc(ox + 5, oy - 4, orbR * 0.86, 0, Math.PI * 2);
    ctx.fillStyle = rgbaFromHex(sky.top, 0.55);
    ctx.fill();
  }

  // 云朵（云影模式下更厚重）
  const heavy = state.mode === 'cloud';
  for (const c of clouds) {
    const cw = win.w * (0.5 * c.s + 0.2);
    const cx = win.x0 + ((elapsed * c.v * 60 * c.s + c.off * win.w * 3) % (win.w + cw * 2)) - cw;
    const cy = win.y0 + win.h * c.fy;
    const alpha = (heavy ? 0.5 : 0.26) * (1 - sky.night * 0.72);
    for (let i = 0; i < 3; i++) {
      const ew = cw * (1 - i * 0.22);
      const eh = cw * 0.2 * (1 - i * 0.18);
      const ex = cx + i * cw * 0.16;
      const ey = cy - i * eh * 0.55;
      const cg = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew);
      cg.addColorStop(0, `rgba(255,255,255,${alpha})`);
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(ex - ew, ey - ew, ew * 2, ew * 2);
    }
  }

  // 玻璃反光斜带
  ctx.beginPath();
  ctx.moveTo(win.x0 + win.w * 0.08, win.y1);
  ctx.lineTo(win.x0 + win.w * 0.36, win.y0);
  ctx.lineTo(win.x0 + win.w * 0.5, win.y0);
  ctx.lineTo(win.x0 + win.w * 0.22, win.y1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();

  ctx.restore();

  // 窗棂：外框 + 十字中梃
  ctx.fillStyle = th.frame;
  ctx.fillRect(win.x0 - pad, win.y0 - pad, win.w + pad * 2, pad);
  ctx.fillRect(win.x0 - pad, win.y1, win.w + pad * 2, pad);
  ctx.fillRect(win.x0 - pad, win.y0 - pad, pad, win.h + pad * 2);
  ctx.fillRect(win.x1, win.y0 - pad, pad, win.h + pad * 2);
  ctx.fillRect(win.x0 + win.w / 2 - 4, win.y0, 8, win.h);
  ctx.fillRect(win.x0, win.y0 + win.h / 2 - 4, win.w, 8);
  // 框沿高光
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(win.x0 - pad + 0.5, win.y0 - pad + 0.5, win.w + pad * 2 - 1, win.h + pad * 2 - 1);
}

/* --- 窗台 + 物件（含投影） ------------------------------------------------ */
function drawSill(win, sun, B) {
  const th = THEMES[state.theme];
  const sillY = win.y1 + 13;
  const sx = win.x0 - 24;
  const sw = win.w + 62;

  // 台面向光面 / 背光面
  ctx.fillStyle = th.sill;
  ctx.fillRect(sx, sillY, sw, 12);
  ctx.fillStyle = 'rgba(30,24,16,0.25)';
  ctx.fillRect(sx, sillY + 12, sw, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(sx, sillY, sw, 2);

  // 物件投影：沿太阳方向剪切、模糊压暗（近似轮廓投影）
  if (B > 0.04 && objects.length) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(win.x1 - 20, win.y0, W - win.x1 + 20, win.y1 - win.y0 + 80);
    ctx.clip();
    ctx.filter = 'blur(4px)';
    const shear = 0.55 + (1 - sun.altN) * 0.55;
    for (const o of objects) {
      const size = OBJECT_SIZE[o.type];
      ctx.save();
      ctx.translate(o.x + size.h * shear * 0.55, sillY + 4);
      ctx.transform(1, 0.1, shear, 0.45, 0, 0);
      ctx.beginPath();
      ctx.ellipse(0, -size.h * 0.42, size.rx * 1.15, size.h * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(28,22,14,${0.34 * B})`;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 物件本体（逆光剪影 + 微摆）
  for (const o of objects) {
    ctx.save();
    ctx.translate(o.x, sillY);
    ctx.rotate(swayOf(o));
    ctx.translate(-o.x, -sillY);
    drawObjectBody(o, sillY);
    ctx.restore();
  }
}

const OBJECT_SIZE = {
  fern:   { h: 54, rx: 16 },
  bottle: { h: 50, rx: 10 },
  book:   { h: 19, rx: 15 }
};

function swayOf(o) {
  const amp = state.mode === 'breeze' ? 0.09 : 0.028;
  return Math.sin(elapsed * 1.4 + o.phase) * amp;
}

// 物件剪影本体：蕨叶 / 玻璃瓶 / 叠书
function drawObjectBody(o, sillY) {
  const bx = o.x;
  const by = sillY;
  if (o.type === 'fern') {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 26, bx + 8, by - 52);
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const y = by - 8 - t * 42;
      const len = 17 * (1 - t * 0.72);
      ctx.moveTo(bx + 2 + t * 6, y);
      ctx.quadraticCurveTo(bx + len * 0.6, y - len * 0.4, bx + len, y - len * 0.16);
      ctx.moveTo(bx + 2 + t * 6, y);
      ctx.quadraticCurveTo(bx - len * 0.6, y - len * 0.34, bx - len * 0.9, y - len * 0.08);
    }
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#26301f';
    ctx.stroke();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(255,244,214,0.28)';
    ctx.stroke();
    return;
  }
  if (o.type === 'bottle') {
    ctx.beginPath();
    ctx.moveTo(bx - 9, by);
    ctx.lineTo(bx - 9, by - 30);
    ctx.quadraticCurveTo(bx - 9, by - 36, bx - 4, by - 38);
    ctx.lineTo(bx - 4, by - 50);
    ctx.lineTo(bx + 4, by - 50);
    ctx.lineTo(bx + 4, by - 38);
    ctx.quadraticCurveTo(bx + 9, by - 36, bx + 9, by - 30);
    ctx.lineTo(bx + 9, by);
    ctx.closePath();
    ctx.fillStyle = 'rgba(146,84,44,0.82)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,210,0.35)';
    ctx.fillRect(bx - 6, by - 28, 2, 24);
    return;
  }
  // book：两本叠放的书
  ctx.beginPath();
  ctx.rect(bx - 15, by - 9, 30, 9);
  ctx.fillStyle = '#7a4a3a';
  ctx.fill();
  ctx.beginPath();
  ctx.rect(bx - 12, by - 19, 26, 10);
  ctx.fillStyle = '#3f4a58';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,244,214,0.3)';
  ctx.fillRect(bx - 15, by - 9, 30, 1.5);
  ctx.fillRect(bx - 12, by - 19, 26, 1.5);
}

/* --- 尘埃：光斑内被照亮的微粒 --------------------------------------------- */
function drawDust(patch, sky, B, dt) {
  const count = Math.round(dustPool.length * clamp(state.dust, 0, 1));
  ctx.save();
  for (let i = 0; i < count; i++) {
    const d = dustPool[i];
    const wind = state.mode === 'breeze' ? 46 : 9;
    d.x += ((vnoise3(d.y * 3.1, elapsed * 0.1, d.phase) - 0.5) * 0.02 + wind * d.z / Math.max(W, 1) / 1.4) * dt * 60;
    d.y += (vnoise3(d.x * 3.3, elapsed * 0.09, d.phase + 5) - 0.5) * 0.016 * dt * 60;
    if (d.x > 1.02) d.x -= 1.04;
    if (d.x < -0.02) d.x += 1.04;
    if (d.y > 1.02) d.y -= 1.04;
    if (d.y < -0.02) d.y += 1.04;

    const x = d.x * W;
    const y = d.y * H;
    const inPatch = ctx.isPointInPath(patch.path, x * DPR, y * DPR);
    const tw = 0.5 + 0.5 * Math.sin(elapsed * 2.2 + d.phase);
    const alpha = (inPatch ? 0.42 + 0.3 * tw : 0.05) * d.z * (0.35 + 0.65 * B);
    if (alpha < 0.012) continue;
    const r = 0.8 + d.z * 1.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = inPatch ? rgbaFromHex('#fff6dd', alpha) : `rgba(90,80,66,${alpha})`;
    ctx.fill();
  }
  ctx.restore();
}

/* --- 点击涟漪：光斑内的扩散光环 ------------------------------------------- */
function drawRipples(patch, sky, dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rp = ripples[i];
    rp.r += 240 * dt;
    rp.a -= 1.5 * dt;
    if (rp.a <= 0) { ripples.splice(i, 1); continue; }
    ctx.save();
    ctx.clip(patch.path);
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    ctx.strokeStyle = rgbaFromHex('#fff3d4', rp.a * 0.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }
}

/* ==========================================================================
 * 8. HUD 与标题乱码揭示
 * ========================================================================== */

let hudTick = 0;

function updateHud(sky, sun, B) {
  if (++hudTick % 8 !== 0) return;
  els.hudTime.textContent = formatTime(state.time);
  els.hudAlt.textContent = `${sun.alt.toFixed(1)}°`;
  els.hudAzi.textContent = `${sun.azi > 0 ? '+' : ''}${sun.azi.toFixed(1)}°`;
  const lux = Math.round(B * 52000);
  els.hudLux.textContent = sky.night > 0.5 ? `${lux} lx ☾` : `${lux.toLocaleString()} lx`;
  els.hudMode.textContent = { cloud: '云影', hand: '掌影', breeze: '微风' }[state.mode];
  els.hudTheme.textContent = THEMES[state.theme].name;
}

// 标题乱码揭示
function scrambleTitle() {
  const target = '日光墙';
  const chars = '█▓▒░╳◇≋✳☼*+';
  let frame = 0;
  const el = els.title;
  const timer = setInterval(() => {
    frame++;
    const reveal = Math.floor(frame / 3);
    let out = '';
    for (let i = 0; i < target.length; i++) {
      out += i < reveal ? target[i] : chars[Math.floor(Math.random() * chars.length)];
    }
    el.textContent = out;
    if (reveal >= target.length) {
      clearInterval(timer);
      el.textContent = target;
    }
  }, 46);
}

/* ==========================================================================
 * 9. 交互绑定
 * ========================================================================== */

function bindUI() {
  els.time.addEventListener('input', () => {
    state.time = parseFloat(els.time.value);
    els.outTime.textContent = formatTime(state.time);
  });
  els.int.addEventListener('input', () => {
    state.intensity = parseFloat(els.int.value);
    els.outInt.textContent = state.intensity.toFixed(2);
  });
  els.dust.addEventListener('input', () => {
    state.dust = parseFloat(els.dust.value);
    els.outDust.textContent = state.dust.toFixed(2);
  });

  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
    });
  });

  document.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.dot').forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
      state.theme = dot.dataset.theme;
      document.body.dataset.theme = state.theme;
      buildWallTexture();
    });
  });

  els.clear.addEventListener('click', () => {
    objects.length = 0;
  });

  // 键盘：左右方向键调整时间
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      state.time = (state.time + (e.key === 'ArrowRight' ? 0.25 : -0.25) + 24) % 24;
      els.time.value = state.time;
      els.outTime.textContent = formatTime(state.time);
    }
  });

  // 光标
  window.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    state.pointer.active = true;
    const win = windowLayout();
    const nearSill = e.clientX > win.x0 - 26 && e.clientX < win.x1 + 38 &&
                     e.clientY > win.y1 - 30 && e.clientY < win.y1 + 40;
    canvas.style.cursor = nearSill ? 'pointer' : 'default';
  });
  window.addEventListener('pointerleave', () => { state.pointer.active = false; });

  // 点击：窗台摆放/移除物件；墙面激起光波
  canvas.addEventListener('pointerdown', (e) => {
    const win = windowLayout();
    const sillY = win.y1 + 13;

    const hitObj = objects.find((o) => Math.abs(o.x - e.clientX) < 24 && e.clientY > sillY - 60 && e.clientY < sillY + 22);
    if (hitObj) {
      objects.splice(objects.indexOf(hitObj), 1);
      ripples.push({ x: hitObj.x, y: sillY - 20, r: 4, a: 0.6 });
      return;
    }

    const inWindowZone = e.clientX > win.x0 - 20 && e.clientX < win.x1 + 40 && e.clientY > win.y0 - 20 && e.clientY < sillY + 16;
    if (inWindowZone && objects.length < 6) {
      objects.push({
        x: clamp(e.clientX, win.x0 + 18, win.x1 - 18),
        type: OBJECT_TYPES[objects.length % OBJECT_TYPES.length],
        phase: Math.random() * Math.PI * 2
      });
      ripples.push({ x: e.clientX, y: sillY - 24, r: 4, a: 0.7 });
      return;
    }

    // 墙面：光之脉冲
    ripples.push({ x: e.clientX, y: e.clientY, r: 6, a: 1 });
    state.bloom = Math.min(state.bloom + 0.5, 1);
  });
}

/* ==========================================================================
 * 10. 启动
 * ========================================================================== */

window.addEventListener('resize', resize);
resize();
bindUI();
scrambleTitle();
requestAnimationFrame(render);
