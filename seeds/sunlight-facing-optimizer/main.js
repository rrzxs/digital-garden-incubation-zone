/* ============================================================
   Sunlight Facing Optimizer — 交互逻辑
   太阳几何模型: Cooper 赤纬近似 + 球面天文高度角/方位角
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('sunCanvas');
  const ctx = canvas.getContext('2d');
  const timeScrub = document.getElementById('timeScrub');
  const dateScrub = document.getElementById('dateScrub');
  const winScrub = document.getElementById('winScrub');
  const citySelect = document.getElementById('citySelect');
  const playBtn = document.getElementById('playBtn');
  const optimizeBtn = document.getElementById('optimizeBtn');
  const dial = document.getElementById('dial');
  const dialNeedle = document.getElementById('dialNeedle');
  const dialDeg = document.getElementById('dialDeg');
  const barsEl = document.getElementById('bars');
  const ringFill = document.getElementById('ringFill');
  const toastEl = document.getElementById('toast');

  const hud = {
    time: document.getElementById('hud-time'),
    day: document.getElementById('hud-day'),
    date: document.getElementById('hud-date'),
    alt: document.getElementById('hud-alt'),
    az: document.getElementById('hud-az'),
    orient: document.getElementById('hud-orient'),
    win: document.getElementById('hud-win'),
    hours: document.getElementById('statHours'),
    peak: document.getElementById('statPeak'),
    best: document.getElementById('statBest'),
    scoreVal: document.getElementById('scoreVal'),
    scoreLabel: document.getElementById('scoreLabel'),
    scoreDesc: document.getElementById('scoreDesc'),
  };

  // === State ===
  const state = {
    latitude: 39.9,
    orientation: 180,      // 窗户朝向方位角 (0=N, 90=E, 180=S, 270=W)
    dayOfYear: 172,        // 6月21日
    minutes: 600,          // 10:00
    windowRatio: 0.6,
    playing: false,
    particles: [],
    mouse: { x: -999, y: -999 },
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
  const DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

  // === Solar Geometry (Domain Model) ===
  const deg = (r) => r * 180 / Math.PI;
  const rad = (d) => d * Math.PI / 180;

  function declination(day) {
    return 23.44 * Math.sin(rad(360 / 365) * (day - 81));
  }

  function sunPosition(minutes, day, latitude) {
    const hourAngle = (minutes / 60 - 12) * 15; // 度
    const delta = rad(declination(day));
    const phi = rad(latitude);
    const H = rad(hourAngle);
    const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    // 方位角: 正北为 0, 顺时针
    const cosAz = (Math.sin(delta) - Math.sin(alt) * Math.sin(phi)) / (Math.cos(alt) * Math.cos(phi) || 1e-9);
    let az = deg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (hourAngle > 0) az = 360 - az; // 下午在西侧
    return { altitude: deg(alt), azimuth: az };
  }

  // 竖直窗面太阳入射角余弦; <0 表示背光
  function incidenceCos(pos, orientation) {
    if (pos.altitude <= 0) return 0;
    let diff = rad(pos.azimuth - orientation);
    return Math.max(0, Math.cos(diff)) * Math.cos(rad(pos.altitude));
  }

  // 一天 24h 的直射能量采样
  function dailyProfile(day, latitude, orientation) {
    const hours = [];
    let total = 0, peak = 0;
    for (let h = 0; h < 24; h++) {
      const pos = sunPosition(h * 60 + 30, day, latitude);
      const cosI = incidenceCos(pos, orientation);
      // 大气质量衰减
      const airMass = pos.altitude > 0 ? 1 / Math.sin(rad(Math.max(5, pos.altitude))) : 99;
      const direct = cosI * 1000 * Math.pow(0.7, Math.max(1, airMass));
      hours.push({ hour: h, pos, direct, daylit: pos.altitude > 0 });
      total += direct;
      peak = Math.max(peak, direct);
    }
    return { hours, total, peak };
  }

  // 0-100 采光评分: 直照小时 + 能量加权
  function computeScore(day, latitude, orientation) {
    const { hours, peak } = dailyProfile(day, latitude, orientation);
    const hitHours = hours.filter((h) => h.direct > 25).length;
    const daylight = hours.filter((h) => h.daylit).length;
    const energy = hours.reduce((s, h) => s + h.direct, 0) / 1000; // kWh/㎡ 近似
    const score = Math.round(
      Math.min(100, (hitHours / Math.max(1, daylight)) * 45 + Math.min(energy / 6.5, 1) * 55)
    );
    return { score, hitHours, daylight, energy, peak };
  }

  function bestOrientation(day, latitude) {
    let best = 0, bestVal = -1;
    for (let a = 0; a < 360; a += 5) {
      const { total } = dailyProfile(day, latitude, a);
      if (total > bestVal) { bestVal = total; best = a; }
    }
    return best;
  }

  function dayToDate(day) {
    let d = day;
    for (let m = 0; m < 12; m++) {
      if (d < MONTH_DAYS[m]) return `${MONTHS[m]} ${d + 1}`;
      d -= MONTH_DAYS[m];
    }
    return 'Dec 31';
  }

  function dirName(a) {
    return DIRS[Math.round(((a % 360) + 360) % 360 / 22.5) % 16];
  }

  // === Canvas Sun Path Rendering ===
  let W = 0, Hh = 0, dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; Hh = rect.height;
    canvas.width = W * dpr; canvas.height = Hh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  // 天空投影: 方位角→x, 高度角→y (鱼眼近似)
  function project(azimuth, altitude) {
    const cx = W / 2, cy = Hh * 0.86;
    const rMax = Math.min(W * 0.46, Hh * 0.78);
    const spread = 1 - Math.pow(1 - Math.min(1, altitude / 90), 1.4);
    const r = rMax * (1 - spread * 0.98);
    const x = cx + r * Math.sin(rad(azimuth));
    const y = cy - r * Math.cos(rad(azimuth));
    return { x, y, cy, rMax };
  }

  function drawSunPath() {
    const accent = cssVar('--c-accent') || '#ffb37a';
    const accent2 = cssVar('--c-accent2') || '#ff7a9e';
    ctx.clearRect(0, 0, W, Hh);
    const { cy, rMax } = project(0, 0);

    // 地平线基圈
    ctx.beginPath();
    ctx.arc(W / 2, cy, rMax, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 高度角辅助圈
    [30, 60].forEach((alt) => {
      ctx.beginPath();
      const rr = rMax * (1 - (1 - Math.pow(Math.min(1, alt / 90), 1.4)) * 0.98);
      ctx.setLineDash([2, 6]);
      ctx.arc(W / 2, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 方位基线
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([label, az]) => {
      const p = project(az, 0);
      ctx.beginPath();
      ctx.moveTo(W / 2, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();
      ctx.fillText(label, W / 2 + (p.x - W / 2) * 1.12, cy + (p.y - cy) * 1.1 + 4);
    });

    // 当日太阳轨迹弧
    const arcPts = [];
    for (let m = 0; m < 1440; m += 10) {
      const pos = sunPosition(m, state.dayOfYear, state.latitude);
      if (pos.altitude > -2) arcPts.push(project(pos.azimuth, Math.max(0, pos.altitude)));
    }
    if (arcPts.length > 1) {
      const grad = ctx.createLinearGradient(arcPts[0].x, 0, arcPts[arcPts.length - 1].x, 0);
      grad.addColorStop(0, accent2);
      grad.addColorStop(0.5, accent);
      grad.addColorStop(1, accent2);
      ctx.beginPath();
      arcPts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 窗户朝向扇区 (朝向 ±60° 可见范围)
    const span = 30 + state.windowRatio * 40;
    ctx.beginPath();
    ctx.moveTo(W / 2, cy);
    ctx.arc(W / 2, cy, rMax, rad(state.orientation - span) - Math.PI / 2, rad(state.orientation + span) - Math.PI / 2);
    ctx.closePath();
    const fanGrad = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, rMax);
    fanGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
    fanGrad.addColorStop(1, hexA(accent, 0.14));
    ctx.fillStyle = fanGrad;
    ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 当前太阳
    const pos = sunPosition(state.minutes, state.dayOfYear, state.latitude);
    if (pos.altitude > -2) {
      const p = project(pos.azimuth, Math.max(0, pos.altitude));
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 42);
      glow.addColorStop(0, hexA(accent, 0.85));
      glow.addColorStop(0.35, hexA(accent, 0.25));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, 42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2); ctx.fill();
    }

    // 鼠标光晕粒子
    state.particles.forEach((pt) => {
      ctx.fillStyle = hexA(accent, pt.life * 0.5);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // === UI 更新 ===
  function buildBars() {
    barsEl.innerHTML = '';
    for (let h = 0; h < 24; h++) {
      const col = document.createElement('div');
      col.className = 'bar-col';
      col.innerHTML = `<div class="bar night"></div><span class="bar-label">${String(h).padStart(2, '0')}</span>`;
      barsEl.appendChild(col);
    }
  }

  function updateAll() {
    const pos = sunPosition(state.minutes, state.dayOfYear, state.latitude);
    const { hours } = dailyProfile(state.dayOfYear, state.latitude, state.orientation);
    const result = computeScore(state.dayOfYear, state.latitude, state.orientation);
    const best = bestOrientation(state.dayOfYear, state.latitude);

    // HUD
    const hh = Math.floor(state.minutes / 60), mm = Math.floor(state.minutes % 60);
    hud.time.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    hud.day.textContent = dayToDate(state.dayOfYear);
    hud.date.textContent = `${dayToDate(state.dayOfYear)} · ${state.latitude.toFixed(1)}°`;
    hud.alt.textContent = `${pos.altitude.toFixed(1)}°`;
    hud.az.textContent = `${pos.azimuth.toFixed(0)}°`;
    hud.orient.textContent = `${Math.round(state.orientation)}° ${dirName(state.orientation)}`;
    hud.win.textContent = `${Math.round(state.windowRatio * 100)}%`;
    hud.hours.textContent = result.hitHours;
    hud.peak.textContent = Math.round(result.peak);
    hud.best.textContent = `${best}° ${dirName(best)}`;

    // 评分环
    ringFill.style.strokeDashoffset = 326.7 * (1 - result.score / 100);
    animateNumber(hud.scoreVal, result.score);
    const label =
      result.score >= 82 ? '黄金采光 ☀' :
      result.score >= 62 ? '充沛明亮 ◐' :
      result.score >= 38 ? '柔和偏弱 ◑' :
      result.score >= 18 ? '背光阴面 ◔' : '漫长黑夜 ◍';
    hud.scoreLabel.textContent = label;
    hud.scoreDesc.textContent =
      `此朝向在 ${dayToDate(state.dayOfYear)} 可获约 ${result.energy.toFixed(1)} kWh/㎡ 日照能量，` +
      `其中 ${result.hitHours} 小时存在直射。`;

    // 柱状图
    const cols = barsEl.children;
    hours.forEach((h, i) => {
      const bar = cols[i].querySelector('.bar');
      const hVal = Math.min(100, (h.direct / 1000) * 100);
      bar.style.setProperty('--h', hVal.toFixed(1));
      bar.className = 'bar ' + (h.direct > 25 ? '' : h.daylit ? 'soft' : 'night');
      cols[i].classList.toggle('current', i === hh);
    });

    drawSunPath();
  }

  function animateNumber(el, target) {
    const from = parseInt(el.textContent, 10) || 0;
    if (from === target) { el.textContent = target; return; }
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 700);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic 近似非线性曲线
      el.textContent = Math.round(from + (target - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // === 交互绑定 ===
  timeScrub.addEventListener('input', () => {
    state.minutes = +timeScrub.value;
    updateAll();
  });
  dateScrub.addEventListener('input', () => {
    state.dayOfYear = +dateScrub.value;
    updateAll();
  });
  winScrub.addEventListener('input', () => {
    state.windowRatio = +winScrub.value / 100;
    updateAll();
  });
  citySelect.addEventListener('change', () => {
    state.latitude = parseFloat(citySelect.value);
    updateAll();
    toast(`已切换纬度 ${state.latitude}° — 太阳轨迹已重绘`);
  });

  // 播放一天
  let playRAF = null, lastT = 0;
  playBtn.addEventListener('click', () => {
    state.playing = !state.playing;
    playBtn.classList.toggle('playing', state.playing);
    playBtn.textContent = state.playing ? '❚❚' : '▶';
    if (state.playing) {
      lastT = performance.now();
      const step = (t) => {
        if (!state.playing) return;
        state.minutes = (state.minutes + (t - lastT) * 0.035) % 1440; // ~1天/40s
        lastT = t;
        timeScrub.value = Math.floor(state.minutes);
        updateAll();
        playRAF = requestAnimationFrame(step);
      };
      playRAF = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(playRAF);
    }
  });

  // 最优朝向: 弹簧动画旋转指针
  optimizeBtn.addEventListener('click', () => {
    const best = bestOrientation(state.dayOfYear, state.latitude);
    const from = state.orientation;
    const t0 = performance.now();
    const dur = 1400;
    const anim = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      state.orientation = from + (best - from) * e;
      dialNeedle.style.setProperty('--deg', `${state.orientation}deg`);
      dialDeg.textContent = Math.round(((state.orientation % 360) + 360) % 360);
      updateAll();
      if (p < 1) requestAnimationFrame(anim);
      else {
        state.orientation = ((best % 360) + 360) % 360;
        toast(`✦ 最优朝向 ${best}° ${dirName(best)} — 指针已就位`);
        updateAll();
      }
    };
    requestAnimationFrame(anim);
  });

  // 罗盘拖拽
  let dragging = false;
  function dialAngle(e) {
    const rect = dial.querySelector('.dial-face').getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
    return ((deg(Math.atan2(x, -y)) % 360) + 360) % 360;
  }
  function startDrag(e) { dragging = true; moveDrag(e); }
  function moveDrag(e) {
    if (!dragging) return;
    e.preventDefault();
    state.orientation = dialAngle(e);
    dialNeedle.style.setProperty('--deg', `${state.orientation}deg`);
    dialDeg.textContent = Math.round(state.orientation);
    updateAll();
  }
  function endDrag() { dragging = false; }
  dial.addEventListener('mousedown', startDrag);
  dial.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
  // 键盘微调
  dial.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      state.orientation = (state.orientation + (e.key === 'ArrowRight' ? 5 : -5) + 720) % 360;
      dialNeedle.style.setProperty('--deg', `${state.orientation}deg`);
      dialDeg.textContent = Math.round(state.orientation);
      updateAll();
    }
  });

  // 画布拖拽 = 直接移动太阳(时间)
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;
    if (e.buttons === 1) {
      // 拖拽设置时间: x 映射 5:00-19:00
      const t = 5 * 60 + (state.mouse.x / rect.width) * 14 * 60;
      state.minutes = Math.max(0, Math.min(1439, t));
      timeScrub.value = Math.floor(state.minutes);
      updateAll();
    }
    spawnParticle(state.mouse.x, state.mouse.y);
  });
  canvas.addEventListener('pointerleave', () => { state.mouse.x = state.mouse.y = -999; });

  function spawnParticle(x, y) {
    if (state.particles.length > 40) return;
    state.particles.push({ x, y, r: Math.random() * 2.5 + 1, life: 1, vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.4 });
  }

  // 主题切换
  document.querySelectorAll('.theme-dot').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.body.dataset.theme = btn.dataset.theme;
      document.querySelectorAll('.theme-dot').forEach((b) => b.classList.toggle('active', b === btn));
      drawSunPath();
      toast(`氛围切换 → ${btn.title}`);
    });
  });

  // 粒子循环 & resize
  function loop() {
    state.particles = state.particles.filter((p) => p.life > 0);
    state.particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.012;
    });
    drawSunPath();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resizeCanvas(); drawSunPath(); });

  // === Init ===
  function init() {
    buildBars();
    resizeCanvas();
    dialNeedle.style.setProperty('--deg', '180deg');
    document.querySelector('.theme-dot[data-theme="dawn"]').classList.add('active');
    updateAll();
    requestAnimationFrame(loop);
    setTimeout(() => toast('拖拽罗盘指针或画布中的太阳开始探索 ☀'), 900);
  }

  init();
})();
