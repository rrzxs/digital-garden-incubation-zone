/* ==========================================================================
   Week Rhythm Grid · 周律网格
   交互逻辑：网格涂抹、节律曲线、粒子迸射、统计读数、预设与主题
   ========================================================================== */

(function () {
  'use strict';

  // === 常量与状态 ===
  const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const MAX_LEVEL = 6;
  const STORAGE_KEY = 'week-rhythm-grid-state';

  const PRESETS = {
    'early-bird': [6, 5, 5, 4, 3, 2, 2],
    'night-owl':  [2, 2, 3, 3, 4, 6, 5],
    'balanced':   [4, 4, 3, 4, 4, 3, 3],
    'sprint':     [2, 4, 6, 6, 5, 3, 2]
  };

  const state = {
    levels: new Array(7).fill(0),   // 0 = 空
    theme: 'aurora'
  };

  let painting = false;

  // === DOM Elements ===
  const daysEl = document.getElementById('days');
  const curveLine = document.getElementById('curve-line');
  const curveArea = document.getElementById('curve-area');
  const curveNodes = document.getElementById('curve-nodes');
  const particlesEl = document.getElementById('particles');
  const legendScale = document.getElementById('legend-scale');
  const chipFilled = document.getElementById('chip-filled');
  const chipAvg = document.getElementById('chip-avg');
  const statAvg = document.getElementById('stat-avg');
  const statPeak = document.getElementById('stat-peak');
  const statTrough = document.getElementById('stat-trough');
  const statBalance = document.getElementById('stat-balance');
  const balanceBar = document.getElementById('balance-bar');
  const statNote = document.getElementById('stat-note');

  // === 持久化 ===
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.levels) && saved.levels.length === 7) {
        state.levels = saved.levels.map((v) => clampLevel(v));
      }
      if (typeof saved.theme === 'string') state.theme = saved.theme;
    } catch { /* 忽略损坏数据 */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* 存储不可用时静默 */ }
  }

  function clampLevel(v) {
    const n = Number(v) || 0;
    return Math.max(0, Math.min(MAX_LEVEL, Math.round(n)));
  }

  // === 网格构建 ===
  function buildGrid() {
    const todayIdx = (new Date().getDay() + 6) % 7; // 周一为 0
    const frag = document.createDocumentFragment();

    for (let d = 0; d < 7; d++) {
      const col = document.createElement('div');
      col.className = 'day-col' + (d === todayIdx ? ' is-today' : '');
      col.dataset.day = d;

      const head = document.createElement('div');
      head.className = 'day-head';
      head.textContent = DAY_NAMES[d];
      col.appendChild(head);

      const cells = document.createElement('div');
      cells.className = 'day-cells';
      for (let lv = 1; lv <= MAX_LEVEL; lv++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.day = d;
        cell.dataset.level = lv;
        cell.style.setProperty('--cell-alpha', levelAlpha(lv).toFixed(3));

        const num = document.createElement('span');
        num.className = 'cell-num';
        num.textContent = lv;
        cell.appendChild(num);

        cells.appendChild(cell); // column-reverse: 先 append 的在底部
      }
      col.appendChild(cells);
      frag.appendChild(col);
    }
    daysEl.appendChild(frag);
  }

  function buildLegend() {
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      const el = document.createElement('div');
      el.className = 'legend-cell';
      el.title = `Lv.${lv}`;
      el.style.background = `linear-gradient(135deg,
        rgba(var(--c1), ${levelAlpha(lv).toFixed(2)}),
        rgba(var(--c2), ${levelAlpha(lv).toFixed(2)}))`;
      legendScale.appendChild(el);
    }
  }

  function levelAlpha(lv) {
    return 0.16 + (lv / MAX_LEVEL) * 0.58;
  }

  // === 涂抹交互 ===
  function bindPainting() {
    daysEl.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      e.preventDefault();
      painting = true;
      const day = +cell.dataset.day;
      const lv = +cell.dataset.level;
      // 点击当前顶层 → 清空；否则涂到该层级
      const next = state.levels[day] === lv ? 0 : lv;
      setDayLevel(day, next, true);
    });

    daysEl.addEventListener('pointerover', (e) => {
      if (!painting) return;
      const cell = e.target.closest('.cell');
      if (!cell) return;
      setDayLevel(+cell.dataset.day, +cell.dataset.level, true);
    });

    window.addEventListener('pointerup', () => { painting = false; });
    window.addEventListener('pointercancel', () => { painting = false; });
  }

  function setDayLevel(day, level, burst) {
    const prev = state.levels[day];
    state.levels[day] = level;
    saveState();
    renderDay(day, prev, level, burst);
    renderCurve();
    renderStats();
  }

  function renderDay(day, prevLevel, nextLevel, burst) {
    const col = daysEl.children[day];
    const cells = col.querySelectorAll('.cell');
    cells.forEach((cell) => {
      const lv = +cell.dataset.level;
      const filled = lv <= nextLevel;
      cell.classList.toggle('filled', filled);
      cell.classList.toggle('top-cell', filled && lv === nextLevel);
      // 仅新点亮的最顶层格播放弹跳动画
      if (burst && filled && lv === nextLevel && lv > prevLevel) {
        cell.style.animation = 'none';
        void cell.offsetWidth; // 强制回流以重启动画
        cell.style.animation = '';
        spawnSparks(cell);
      }
    });
  }

  // === 粒子迸射 ===
  function spawnSparks(cell) {
    const canvasRect = particlesEl.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    const cx = r.left - canvasRect.left + r.width / 2;
    const cy = r.top - canvasRect.top + r.height / 2;

    for (let i = 0; i < 9; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = `${cx}px`;
      spark.style.top = `${cy}px`;
      particlesEl.appendChild(spark);

      const angle = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 46;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 14; // 略微上飘

      spark.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
      ], {
        duration: 520 + Math.random() * 300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      }).onfinish = () => spark.remove();
    }
  }

  // === 节律曲线 ===
  function renderCurve() {
    const canvasRect = daysEl.getBoundingClientRect();
    const pts = [];

    for (let d = 0; d < 7; d++) {
      const col = daysEl.children[d];
      const cells = col.querySelectorAll('.cell');
      const lv = state.levels[d];
      let x, y;
      if (lv > 0) {
        const topCell = cells[lv - 1];
        const r = topCell.getBoundingClientRect();
        x = r.left - canvasRect.left + r.width / 2;
        y = r.top - canvasRect.top + r.height / 2;
      } else {
        // 空日贴底
        const r = cells[0].getBoundingClientRect();
        x = r.left - canvasRect.left + r.width / 2;
        y = r.top - canvasRect.top + r.height / 2 + 10;
      }
      pts.push({ x, y });
    }

    const line = smoothPath(pts);
    const area = `${line} L ${pts[6].x} ${canvasRect.height} L ${pts[0].x} ${canvasRect.height} Z`;

    curveLine.setAttribute('d', line);
    curveArea.setAttribute('d', area);

    curveNodes.innerHTML = pts.map((p, i) =>
      state.levels[i] > 0
        ? `<circle class="curve-node" cx="${p.x}" cy="${p.y}" r="${state.levels[i] >= 5 ? 5 : 3.5}"/>`
        : ''
    ).join('');
  }

  // Catmull-Rom → 贝塞尔平滑
  function smoothPath(pts) {
    if (!pts.length) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  // === 统计读数 ===
  function renderStats() {
    const filled = state.levels.filter((v) => v > 0);
    const filledCount = filled.length;

    chipFilled.textContent = `${filledCount} / 7 天`;

    if (filledCount === 0) {
      chipAvg.textContent = 'AVG 0.0';
      statAvg.textContent = '0.0';
      statPeak.textContent = '—';
      statTrough.textContent = '—';
      statBalance.textContent = '--';
      balanceBar.style.width = '0%';
      statNote.textContent = '等待你落下第一笔能量。';
      return;
    }

    const avg = filled.reduce((a, b) => a + b, 0) / filledCount;
    const maxLv = Math.max(...state.levels);
    const minLv = Math.min(...filled);
    const peakIdx = state.levels.indexOf(maxLv);
    const troughIdx = state.levels.indexOf(minLv);

    // 方差 → 均衡度（方差越小越均衡）
    const variance = filled.reduce((a, b) => a + (b - avg) ** 2, 0) / filledCount;
    const balance = Math.round(Math.max(0, 100 - (variance / MAX_LEVEL) * 100));

    chipAvg.textContent = `AVG ${avg.toFixed(1)}`;
    statAvg.textContent = avg.toFixed(1);
    statPeak.textContent = `${DAY_NAMES[peakIdx]} · Lv.${maxLv}`;
    statTrough.textContent = `${DAY_NAMES[troughIdx]} · Lv.${minLv}`;
    statBalance.textContent = `${balance}%`;
    balanceBar.style.width = `${balance}%`;

    statNote.textContent = composeNote(avg, balance, filledCount);
  }

  function composeNote(avg, balance, count) {
    if (count < 4) return '再涂满几天，节律曲线会更清晰地显形。';
    if (avg >= 4.5) return '这是高能的一周 —— 记得为峰值之后留出恢复的谷地。';
    if (avg <= 2.5) return '这是休养生息的一周 —— 低能量也是一种节律。';
    if (balance >= 72) return '节律平稳如静水，张弛之间自有一种秩序。';
    return '能量起伏明显，峰谷错落 —— 一周自有它的呼吸。';
  }

  // === 预设 / 随机 / 清空 ===
  function bindActions() {
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyLevels(PRESETS[btn.dataset.preset]);
      });
    });

    document.getElementById('btn-random').addEventListener('click', () => {
      applyLevels(state.levels.map(() => 1 + Math.floor(Math.random() * MAX_LEVEL)));
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
      applyLevels(new Array(7).fill(0));
    });
  }

  function applyLevels(levels) {
    levels.forEach((lv, d) => {
      const prev = state.levels[d];
      state.levels[d] = clampLevel(lv);
      renderDay(d, prev, state.levels[d], true);
    });
    saveState();
    renderCurve();
    renderStats();
  }

  // === 主题切换 ===
  function bindThemes() {
    const dots = document.querySelectorAll('.theme-dot');
    const activate = (name) => {
      state.theme = name;
      document.body.dataset.theme = name;
      dots.forEach((d) => d.classList.toggle('active', d.dataset.theme === name));
      saveState();
    };
    dots.forEach((dot) => {
      dot.addEventListener('click', () => activate(dot.dataset.theme));
    });
    activate(state.theme);
  }

  // === 初始化 ===
  function init() {
    loadState();
    buildGrid();
    buildLegend();
    bindPainting();
    bindActions();
    bindThemes();

    // 初始渲染（等字体与布局就绪后再测量曲线坐标）
    state.levels.forEach((lv, d) => renderDay(d, 0, lv, false));
    renderStats();
    requestAnimationFrame(() => renderCurve());

    // 窗口尺寸变化时重算曲线
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderCurve, 120);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
