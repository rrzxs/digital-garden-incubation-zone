/* ==========================================================================
   Constellation Report Weaver · 星座报告织机
   以姓名与生日为经纬，将星线织成一份只属于你的星图报告。
   ========================================================================== */

// === 数据: 十二星座 ===
const ZODIAC = [
  { key: 'aries',       glyph: '♈', name: '白羊座',  en: 'ARIES',           from: [3, 21], to: [4, 19],  ruler: '火星', element: '火象' },
  { key: 'taurus',      glyph: '♉', name: '金牛座',  en: 'TAURUS',          from: [4, 20], to: [5, 20],  ruler: '金星', element: '土象' },
  { key: 'gemini',      glyph: '♊', name: '双子座',  en: 'GEMINI',          from: [5, 21], to: [6, 21],  ruler: '水星', element: '风象' },
  { key: 'cancer',      glyph: '♋', name: '巨蟹座',  en: 'CANCER',          from: [6, 22], to: [7, 22],  ruler: '月亮', element: '水象' },
  { key: 'leo',         glyph: '♌', name: '狮子座',  en: 'LEO',             from: [7, 23], to: [8, 22],  ruler: '太阳', element: '火象' },
  { key: 'virgo',       glyph: '♍', name: '处女座',  en: 'VIRGO',           from: [8, 23], to: [9, 22],  ruler: '水星', element: '土象' },
  { key: 'libra',       glyph: '♎', name: '天秤座',  en: 'LIBRA',           from: [9, 23], to: [10, 23], ruler: '金星', element: '风象' },
  { key: 'scorpio',     glyph: '♏', name: '天蝎座',  en: 'SCORPIO',         from: [10, 24], to: [11, 22], ruler: '冥王星', element: '水象' },
  { key: 'sagittarius', glyph: '♐', name: '射手座',  en: 'SAGITTARIUS',     from: [11, 23], to: [12, 21], ruler: '木星', element: '火象' },
  { key: 'capricorn',   glyph: '♑', name: '摩羯座',  en: 'CAPRICORN',       from: [12, 22], to: [1, 19], ruler: '土星', element: '土象' },
  { key: 'aquarius',    glyph: '♒', name: '水瓶座',  en: 'AQUARIUS',       from: [1, 20], to: [2, 18],  ruler: '天王星', element: '风象' },
  { key: 'pisces',      glyph: '♓', name: '双鱼座',  en: 'PISCES',          from: [2, 19], to: [3, 20],  ruler: '海王星', element: '水象' }
];

const TRAIT_LABELS = ['灵感', '意志', '共情', '秩序', '冒险', '专注'];
const METRIC_LABELS = ['星尘密度', '轨道共振', '光子通量', '引力织度'];
const VERDICTS = [
  '星辰排列成一次深呼吸 — 你的能量正在缓慢而坚定地苏醒。',
  '命运的经线已然上机，纬线正以你的节奏穿过每一道缝隙。',
  '星图显示: 你正处于一个温柔的转折点，别怕慢，怕停。',
  '宇宙为你预留了一段留白，等待你自己落笔。',
  '行星的 whispers 汇成一句话: 相信那个反复出现的念头。',
  '你的轨道与他人短暂交汇，却始终保有属于自己的引力。'
];
const POEMS = [
  '你在夜里织星星，\n星星也在夜里，悄悄织你。',
  '所有散落的光，\n都在等一根线，把它们串成名字。',
  '不必急于发光，\n织机转动的地方，就是黎明。',
  '风穿过经纬，\n留下一个只有你懂的图案。',
  '宇宙不讲效率，\n它只是慢慢地，把你织进黎明。',
  '每一根断线，\n都是下一次 brighter 的开始。'
];

// === DOM Elements ===
const els = {
  name: document.getElementById('input-name'),
  date: document.getElementById('input-date'),
  zodiacGrid: document.getElementById('zodiac-grid'),
  btnWeave: document.getElementById('btn-weave'),
  btnReweave: document.getElementById('btn-reweave'),
  consoleMeta: document.getElementById('console-meta'),
  weaveArea: document.querySelector('.weave-area'),
  weaveCanvas: document.getElementById('weave-canvas'),
  weaveHud: document.getElementById('weave-hud'),
  weaveEmpty: document.getElementById('weave-empty'),
  report: document.getElementById('report'),
  reportGlyph: document.getElementById('report-glyph'),
  reportName: document.getElementById('report-name'),
  reportSign: document.getElementById('report-sign'),
  reportDate: document.getElementById('report-date'),
  radar: document.getElementById('radar'),
  metrics: document.getElementById('metrics'),
  verdict: document.getElementById('verdict'),
  verdictPoem: document.getElementById('verdict-poem'),
  archive: document.getElementById('archive'),
  stardust: document.getElementById('stardust'),
  themeDots: document.querySelectorAll('.theme-dot')
};

// === 状态 ===
const state = {
  selectedSign: null,
  variant: 0,
  weaving: false,
  mouse: { x: 0.5, y: 0.5 },
  weaveData: null,
  weaveStart: 0,
  colorCache: null
};

// === 工具: 确定性随机 (Mulberry32) ===
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// === 工具: 主题色读取 ===
function getThemeColors() {
  const styles = getComputedStyle(document.body);
  return {
    accent: styles.getPropertyValue('--accent').trim(),
    c1: styles.getPropertyValue('--c1').trim(),
    c2: styles.getPropertyValue('--c2').trim(),
    star: styles.getPropertyValue('--star').trim(),
    ink: styles.getPropertyValue('--ink').trim()
  };
}

function rgba(channelStr, alpha) {
  return `rgba(${channelStr}, ${alpha})`;
}

// === 星座选择逻辑 ===
function signFromDate(month, day) {
  for (const z of ZODIAC) {
    const [fm, fd] = z.from;
    const [tm, td] = z.to;
    if (fm <= tm) {
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return z;
    } else {
      // 跨年星座 (摩羯)
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return z;
    }
  }
  return ZODIAC[9];
}

function buildZodiacGrid() {
  ZODIAC.forEach((z) => {
    const chip = document.createElement('button');
    chip.className = 'zodiac-chip';
    chip.textContent = z.glyph;
    chip.title = z.name;
    chip.addEventListener('click', () => {
      state.selectedSign = z;
      document.querySelectorAll('.zodiac-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      els.consoleMeta.textContent = `SIGN LOCKED · ${z.en}`;
    });
    els.zodiacGrid.appendChild(chip);
  });
}

// === 织造数据生成 ===
function generateWeaveData(name, dateStr, sign) {
  const seedStr = `${name}|${dateStr}|${sign.key}|v${state.variant}`;
  const rand = mulberry32(hashString(seedStr));
  const starCount = 7 + Math.floor(rand() * 5); // 7 ~ 11 颗主星

  // 在画布中心区域生成主星（保持一定间距）
  const stars = [];
  let guard = 0;
  while (stars.length < starCount && guard < 400) {
    guard++;
    const x = 0.12 + rand() * 0.76;
    const y = 0.14 + rand() * 0.72;
    const ok = stars.every((s) => Math.hypot(s.x - x, s.y - y) > 0.13);
    if (ok) stars.push({ x, y, mag: 0.5 + rand() * 0.5, tw: rand() * Math.PI * 2 });
  }

  // 最近邻连线构成星座图
  const threads = [];
  const connected = new Set([0]);
  while (connected.size < stars.length) {
    let best = null;
    connected.forEach((a) => {
      stars.forEach((_, b) => {
        if (connected.has(b)) return;
        const d = Math.hypot(stars[a].x - stars[b].x, stars[a].y - stars[b].y);
        if (!best || d < best.d) best = { a, b, d };
      });
    });
    threads.push({ a: best.a, b: best.b, delay: threads.length * 0.28 });
    connected.add(best.b);
  }
  // 加 1~2 条交叉线增强「织」感
  const extras = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < extras; i++) {
    threads.push({
      a: Math.floor(rand() * stars.length),
      b: Math.floor(rand() * stars.length),
      delay: threads.length * 0.28,
      ghost: true
    });
  }

  // 背景经纬线（织机隐喻）
  const warps = [];
  const warpCount = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < warpCount; i++) {
    warps.push({ t: rand(), phase: rand() * Math.PI * 2, ghost: true });
  }

  return {
    stars, threads, warps,
    traits: TRAIT_LABELS.map(() => 0.35 + rand() * 0.6),
    metrics: METRIC_LABELS.map(() => 0.4 + rand() * 0.55),
    verdict: VERDICTS[Math.floor(rand() * VERDICTS.length)],
    poem: POEMS[Math.floor(rand() * POEMS.length)],
    luckyNum: 1 + Math.floor(rand() * 9),
    luckyColor: ['星尘紫', '月白', '极光青', '余烬金', '深海蓝', '玫瑰灰'][Math.floor(rand() * 6)],
    luckyDir: ['东北', '西南', '正东', '正北'][Math.floor(rand() * 4)],
    resonance: (40 + rand() * 58).toFixed(1)
  };
}

// === 织造画布渲染 ===
function resizeWeaveCanvas() {
  const rect = els.weaveArea.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  els.weaveCanvas.width = rect.width * dpr;
  els.weaveCanvas.height = rect.height * dpr;
  els.weaveCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  return rect;
}

function drawWeave(timestamp) {
  if (!state.weaveData) return;
  const ctx = els.weaveCanvas.getContext('2d');
  const rect = els.weaveArea.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const data = state.weaveData;
  const colors = getThemeColors();
  const elapsed = (timestamp - state.weaveStart) / 1000;

  // 鼠标视差
  const px = (state.mouse.x - 0.5) * 14;
  const py = (state.mouse.y - 0.5) * 14;

  ctx.clearRect(0, 0, W, H);

  // --- 经线（流动丝线） ---
  data.warps.forEach((w, i) => {
    const x = w.t * W + px * 0.3;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, rgba(colors.c1, 0));
    grad.addColorStop(0.5, rgba(colors.c1, 0.14));
    grad.addColorStop(1, rgba(colors.c2, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= H; y += 8) {
      const wave = Math.sin(y / H * Math.PI * 2 + w.phase + elapsed * 0.4) * 8;
      if (y === 0) ctx.moveTo(x + wave, y);
      else ctx.lineTo(x + wave, y);
    }
    ctx.stroke();
  });

  // --- 星线（逐笔织造） ---
  const threadDur = 0.7;
  data.threads.forEach((t) => {
    const p = Math.min(Math.max((elapsed - t.delay * 0.35) / threadDur, 0), 1);
    if (p <= 0) return;
    const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const A = data.stars[t.a];
    const B = data.stars[t.b];
    if (!A || !B) return;
    const ax = A.x * W + px, ay = A.y * H + py;
    const bx = B.x * W + px, by = B.y * H + py;
    const cx = ax + (bx - ax) * ease;
    const cy = ay + (by - ay) * ease;

    ctx.strokeStyle = t.ghost ? rgba(colors.star, 0.1) : rgba(colors.accent, 0.5);
    ctx.lineWidth = t.ghost ? 0.8 : 1.4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // 织针光点（线头）
    if (p < 1 && !t.ghost) {
      ctx.fillStyle = rgba(colors.star, 0.9);
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(colors.accent, 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // --- 主星（呼吸闪烁） ---
  data.stars.forEach((s) => {
    const x = s.x * W + px, y = s.y * H + py;
    const twinkle = 0.7 + 0.3 * Math.sin(timestamp / 900 + s.tw);
    const r = 2 + s.mag * 3;

    // 光晕
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0, rgba(colors.star, 0.5 * twinkle));
    glow.addColorStop(1, rgba(colors.star, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fill();

    // 星核
    ctx.fillStyle = rgba(colors.star, twinkle);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // HUD 更新
  const done = data.threads.filter((t) => elapsed >= t.delay * 0.35 + threadDur).length;
  els.weaveHud.textContent = `THREAD ${String(done).padStart(2, '0')} / ${String(data.threads.length).padStart(2, '0')}`;

  requestAnimationFrame(drawWeave);
}

// === 星尘背景 ===
function initStardust() {
  const canvas = els.stardust;
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.3 + 0.3,
      tw: Math.random() * Math.PI * 2,
      depth: Math.random() * 0.6 + 0.2
    }));
  }

  window.addEventListener('resize', resize);
  resize();

  (function loop(ts) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const colors = getThemeColors();
    const px = (state.mouse.x - 0.5) * 20;
    const py = (state.mouse.y - 0.5) * 20;

    stars.forEach((s) => {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(ts / 1400 + s.tw));
      ctx.fillStyle = rgba(colors.star, twinkle * s.depth * 0.8);
      ctx.beginPath();
      ctx.arc(s.x + px * s.depth, s.y + py * s.depth, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(loop);
  })(0);
}

// === 报告: 雷达图 ===
function renderRadar(traits) {
  const svg = els.radar;
  svg.innerHTML = '';
  const cx = 150, cy = 130, R = 92;
  const colors = getThemeColors();
  const n = traits.length;

  const pt = (i, r) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  // 网格环
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const pts = traits.map((_, i) => pt(i, R * f).join(',')).join(' ');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', 'rgba(255,255,255,0.08)');
    svg.appendChild(poly);
  });

  // 轴线与标签
  traits.forEach((_, i) => {
    const [x, y] = pt(i, R);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', x); line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.08)');
    svg.appendChild(line);

    const [lx, ly] = pt(i, R + 22);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', lx); text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', `rgba(${colors.ink}, 0.6)`);
    text.setAttribute('font-size', '11');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.textContent = TRAIT_LABELS[i];
    svg.appendChild(text);
  });

  // 数据多边形（带入场动画）
  const pts = traits.map((v, i) => pt(i, R * v).join(',')).join(' ');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', traits.map(() => `${cx},${cy}`).join(' '));
  poly.setAttribute('fill', rgba(colors.c1, 0.22));
  poly.setAttribute('stroke', rgba(colors.accent, 0.9));
  poly.setAttribute('stroke-width', '1.6');
  poly.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(poly);

  // 顶点光点
  const dots = traits.map((v, i) => {
    const [x, y] = pt(i, R * v);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', rgba(colors.star, 1));
    svg.appendChild(dot);
    return { dot, x, y };
  });

  // WAAPI 动画展开
  poly.animate(
    [{ points: traits.map(() => `${cx},${cy}`).join(' ') }, { points: pts }],
    { duration: 1100, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
  );
  dots.forEach(({ dot, x, y }, i) => {
    dot.animate(
      [
        { cx: cx, cy: cy, opacity: 0 },
        { cx: x, cy: y, opacity: 1 }
      ],
      { duration: 900, delay: 120 + i * 90, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
    );
  });
}

// === 报告: 能量指标 ===
function renderMetrics(metrics) {
  els.metrics.innerHTML = '';
  metrics.forEach((v, i) => {
    const item = document.createElement('div');
    item.className = 'metric';
    item.innerHTML = `
      <div class="metric-head">
        <span>${METRIC_LABELS[i]}</span>
        <span class="mono">${(v * 100).toFixed(1)}%</span>
      </div>
      <div class="metric-bar">
        <div class="metric-fill" data-target="${(v * 100).toFixed(1)}"></div>
      </div>`;
    els.metrics.appendChild(item);
    requestAnimationFrame(() => {
      setTimeout(() => {
        item.querySelector('.metric-fill').style.width = `${v * 100}%`;
      }, 300 + i * 140);
    });
  });
}

// === 报告: 乱码揭示 ===
function scrambleReveal(el, text, speed = 26) {
  const glyphs = '✦⋆✧☽☾♈♉♊♋♌♍♎♏♐♑♒♓';
  let frame = 0;
  const total = text.length * 3 + 12;
  (function tick() {
    frame++;
    const revealed = Math.floor((frame / total) * text.length * 1.4);
    el.textContent = text
      .split('')
      .map((ch, i) => {
        if (i < revealed || ch === ' ' || ch === '\n') return ch;
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      })
      .join('');
    if (frame < total) setTimeout(tick, speed);
    else el.textContent = text;
  })();
}

// === 报告: 档案 ===
function renderArchive(data, sign) {
  const items = [
    ['守护星 RULER', sign.ruler],
    ['元素 ELEMENT', sign.element],
    ['幸运数字 LUCKY NO.', `#${data.luckyNum}`],
    ['幸运色 LUCKY COLOR', data.luckyColor],
    ['吉位 DIRECTION', data.luckyDir],
    ['星线共振 RESONANCE', `${data.resonance}%`]
  ];
  els.archive.innerHTML = '';
  items.forEach(([k, v], i) => {
    const item = document.createElement('div');
    item.className = 'archive-item';
    item.style.transitionDelay = `${i * 70}ms`;
    item.innerHTML = `<div class="archive-key">${k}</div><div class="archive-val">${v}</div>`;
    els.archive.appendChild(item);
    requestAnimationFrame(() => setTimeout(() => item.classList.add('revealed'), 60));
  });
}

// === 主流程: 织造 ===
function weave() {
  if (state.weaving) return;

  const name = els.name.value.trim() || '无名旅人';
  const dateStr = els.date.value;

  let sign = state.selectedSign;
  if (!sign && dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    sign = signFromDate(m, d);
    document.querySelectorAll('.zodiac-chip').forEach((c, i) => {
      c.classList.toggle('active', ZODIAC[i] === sign);
    });
  }
  if (!sign) {
    els.consoleMeta.textContent = '请选择星座或填写生日 ✦';
    return;
  }

  state.weaving = true;
  els.btnWeave.disabled = true;
  els.consoleMeta.textContent = 'WEAVING IN PROGRESS…';

  // 生成数据 & 启动织造动画
  state.weaveData = generateWeaveData(name, dateStr, sign);
  state.weaveStart = performance.now();
  resizeWeaveCanvas();
  els.weaveArea.classList.add('weaving');
  els.report.hidden = true;

  // 织造完成 → 揭示报告
  const weaveDuration = state.weaveData.threads.length * 0.28 * 0.35 * 1000 + 1400;
  setTimeout(() => {
    state.weaving = false;
    els.btnWeave.disabled = false;
    els.consoleMeta.textContent = `WEAVE COMPLETE · ${sign.en}`;
    revealReport(name, dateStr, sign);
  }, weaveDuration);
}

function revealReport(name, dateStr, sign) {
  const data = state.weaveData;

  els.report.hidden = false;
  els.reportGlyph.textContent = sign.glyph;
  els.reportName.textContent = name;
  els.reportSign.textContent = `${sign.en} · ${sign.name} · ${sign.element}`;
  els.reportDate.textContent = dateStr ? `BORN ${dateStr.replaceAll('-', '.')}` : 'DATE SEALED';

  renderRadar(data.traits);
  renderMetrics(data.metrics);
  renderArchive(data, sign);
  scrambleReveal(els.verdict, `> ${data.verdict}`);
  scrambleReveal(els.verdictPoem, data.poem, 30);

  // 级联揭示
  document.querySelectorAll('.reveal-item').forEach((el, i) => {
    el.classList.remove('revealed');
    setTimeout(() => el.classList.add('revealed'), 120 + i * 130);
  });

  // 平滑滚动到报告
  setTimeout(() => {
    els.report.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 350);
}

// === 事件绑定 ===
function bindEvents() {
  // 生日输入自动联动星座
  els.date.addEventListener('change', () => {
    if (!els.date.value) return;
    const [, m, d] = els.date.value.split('-').map(Number);
    const sign = signFromDate(m, d);
    state.selectedSign = sign;
    document.querySelectorAll('.zodiac-chip').forEach((c, i) => {
      c.classList.toggle('active', ZODIAC[i] === sign);
    });
    els.consoleMeta.textContent = `SIGN DETECTED · ${sign.en}`;
  });

  els.btnWeave.addEventListener('click', weave);
  els.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') weave(); });

  els.btnReweave.addEventListener('click', () => {
    state.variant++;
    els.consoleMeta.textContent = 'REWEAVING · NEW PATTERN…';
    weave();
  });

  // 鼠标视差
  window.addEventListener('pointermove', (e) => {
    state.mouse.x = e.clientX / window.innerWidth;
    state.mouse.y = e.clientY / window.innerHeight;
  });

  // 主题切换
  els.themeDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const theme = dot.dataset.theme;
      document.body.dataset.theme = theme;
      els.themeDots.forEach((d) => d.classList.toggle('active', d === dot));
    });
  });

  window.addEventListener('resize', () => {
    if (state.weaveData) resizeWeaveCanvas();
  });
}

// === 初始化 ===
function init() {
  buildZodiacGrid();
  bindEvents();
  initStardust();
  document.querySelector('.theme-dot[data-theme="nebula"]').classList.add('active');
  els.date.value = '2000-01-01';
  requestAnimationFrame(drawWeave);
}

init();
