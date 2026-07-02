/* ============================================================
   Data Center Tour · 数据中心漫游 · 交互逻辑
   ============================================================ */
(function () {
  'use strict';

  /* === 1. 配置与状态 === */
  const GRID_COLS = 6;
  const GRID_ROWS = 7;
  const CELL = 64;          // 每个网格单元像素
  const RACK_OFFSET = 10;   // 机架在网格单元内的偏移
  const UNIT_PER_RACK = 24; // 每机架 U 数

  const state = {
    view: 'overview',
    floor: 0,
    selectedRack: null,
    racks: [],
    metrics: { cpu: 0, mem: 0, net: 0, pue: 0 },
    logs: [],
    mouse: { x: 0, y: 0, active: false }
  };

  /* === 2. DOM 元素引用 === */
  const el = {
    body: document.body,
    isoFloor: document.getElementById('isoFloor'),
    isoScene: document.getElementById('isoScene'),
    viewportTitle: document.getElementById('viewportTitle'),
    viewportSub: document.getElementById('viewportSub'),
    hudView: document.getElementById('hudView'),
    hudCoord: document.getElementById('hudCoord'),
    hudFps: document.getElementById('hudFps'),
    rdTemp: document.getElementById('rdTemp'),
    rdLoad: document.getElementById('rdLoad'),
    rdPower: document.getElementById('rdPower'),
    rdRackId: document.getElementById('rdRackId'),
    rdRackStatus: document.getElementById('rdRackStatus'),
    unitList: document.getElementById('unitList'),
    metricCpu: document.getElementById('metricCpu'),
    metricCpuVal: document.getElementById('metricCpuVal'),
    metricMem: document.getElementById('metricMem'),
    metricMemVal: document.getElementById('metricMemVal'),
    metricNet: document.getElementById('metricNet'),
    metricNetVal: document.getElementById('metricNetVal'),
    metricPue: document.getElementById('metricPue'),
    metricPueVal: document.getElementById('metricPueVal'),
    logStream: document.getElementById('logStream'),
    stClock: document.getElementById('stClock'),
    stUptime: document.getElementById('stUptime'),
    flowCanvas: document.getElementById('flowCanvas')
  };

  /* === 3. 工具函数 === */
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[randInt(0, arr.length - 1)];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function statusFromLoad(load) {
    if (load > 88) return 'danger';
    if (load > 72) return 'warn';
    return 'ok';
  }

  function heatColor(load) {
    // 根据负载返回热力色（0-100）
    const t = clamp(load / 100, 0, 1);
    if (t < 0.5) {
      // 绿 → 黄
      const g = lerp(180, 220, t * 2);
      return `rgb(60, ${Math.round(g)}, 100)`;
    }
    // 黄 → 红
    const r = lerp(255, 255, (t - 0.5) * 2);
    const g = lerp(220, 70, (t - 0.5) * 2);
    return `rgb(${Math.round(r)}, ${Math.round(g)}, 60)`;
  }

  /* === 4. 机架数据生成 === */
  function generateRacks() {
    const racks = [];
    const total = GRID_COLS * GRID_ROWS;
    for (let i = 0; i < total; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const load = clamp(rand(28, 95), 0, 100);
      const temp = clamp(18 + load * 0.12 + rand(-2, 3), 16, 38);
      const status = statusFromLoad(load);
      // 偶尔生成故障/警告（约 12%）
      const forcedStatus = Math.random() < 0.04 ? 'danger' : (Math.random() < 0.1 ? 'warn' : status);
      racks.push({
        id: i,
        col,
        row,
        code: `A${state.floor + 1}-${String(i + 1).padStart(2, '0')}`,
        load,
        temp,
        status: forcedStatus,
        units: generateUnits()
      });
    }
    return racks;
  }

  function generateUnits() {
    const units = [];
    const count = randInt(16, UNIT_PER_RACK);
    for (let u = 0; u < count; u++) {
      const load = clamp(rand(20, 96), 0, 100);
      units.push({
        name: `U${String(UNIT_PER_RACK - u).padStart(2, '0')} · NODE-${randInt(100, 999)}`,
        load,
        loadTier: load > 85 ? 'crit' : (load > 65 ? 'high' : 'ok')
      });
    }
    return units;
  }

  /* === 5. 渲染等距机架场 === */
  function renderRacks() {
    el.isoFloor.innerHTML = '';
    state.racks.forEach((rack) => {
      const node = document.createElement('div');
      node.className = 'rack';
      node.dataset.id = rack.id;
      node.dataset.status = rack.status;
      node.style.left = `${rack.col * CELL + RACK_OFFSET}px`;
      node.style.top = `${rack.row * CELL + RACK_OFFSET}px`;

      // 负载条高度
      const loadH = clamp(rack.load * 0.4, 6, 38);

      node.innerHTML = `
        <div class="rack__load" style="height:${loadH}px;top:${44 - loadH}px;"></div>
        <div class="rack__body"></div>
        <div class="rack__top"></div>
        <div class="rack__led"></div>
      `;

      // 热力视图预设色
      const hc = heatColor(rack.load);
      node.style.setProperty('--rack-heat', hc);
      node.style.setProperty('--rack-heat-body', hc.replace('rgb', 'rgba').replace(')', ',0.5)'));

      // 入场动画延迟（错峰）
      node.style.opacity = '0';
      node.style.transform = 'translateZ(0) scale(0.5)';
      const delay = (rack.col + rack.row) * 40;
      setTimeout(() => {
        node.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
        node.style.opacity = '1';
        node.style.transform = 'translateZ(0) scale(1)';
      }, delay);

      node.addEventListener('click', () => selectRack(rack.id));
      node.addEventListener('mouseenter', () => {
        el.hudCoord.textContent = `GRID ${rack.col + 1}×${rack.row + 1} · ${rack.code}`;
      });

      el.isoFloor.appendChild(node);
    });
  }

  /* === 6. 选中机架 === */
  function selectRack(id) {
    state.selectedRack = id;
    // 清除旧选中
    document.querySelectorAll('.rack.is-selected').forEach((n) => n.classList.remove('is-selected'));
    const rack = state.racks[id];
    if (!rack) return;

    const node = el.isoFloor.querySelector(`.rack[data-id="${id}"]`);
    if (node) node.classList.add('is-selected');

    // 更新详情面板
    el.rdRackId.textContent = `RACK-${rack.code}`;
    el.rdRackStatus.textContent = rack.status === 'ok' ? 'NOMINAL' : (rack.status === 'warn' ? 'ELEVATED' : 'CRITICAL');
    el.rdRackStatus.className = 'rack-detail__status' + (rack.status === 'warn' ? ' is-warn' : (rack.status === 'danger' ? ' is-danger' : ''));

    renderUnits(rack);
    pushLog(`SELECT ${rack.code} · ${rack.units.length}U · ${rack.temp.toFixed(1)}°C`, rack.status);
  }

  function renderUnits(rack) {
    el.unitList.innerHTML = '';
    rack.units.forEach((unit, idx) => {
      const row = document.createElement('div');
      row.className = 'unit-row';
      row.dataset.load = unit.loadTier;
      row.style.animationDelay = `${idx * 22}ms`;
      row.innerHTML = `
        <span class="unit-row__led"></span>
        <span class="unit-row__name">${unit.name}</span>
        <span class="unit-row__load">${unit.load.toFixed(0)}%</span>
      `;
      el.unitList.appendChild(row);
    });
  }

  /* === 7. 视图切换 === */
  function setView(view) {
    state.view = view;
    el.body.dataset.view = view;
    document.querySelectorAll('.nav-chip').forEach((n) => {
      n.classList.toggle('is-active', n.dataset.view === view);
    });
    const titles = {
      overview: ['ISOMETRIC HALL · A1', `${GRID_COLS * GRID_ROWS} RACKS · ${GRID_COLS * GRID_ROWS * UNIT_PER_RACK} U · LIVE`],
      rack: ['RACK DETAIL VIEW', '聚焦机架单元 · 点击切换'],
      thermal: ['THERMAL MAP · 热力图', '负载驱动温度分布'],
      network: ['NETWORK TOPOLOGY · 网络', '链路活跃度可视化']
    };
    const [t, s] = titles[view] || titles.overview;
    el.viewportTitle.textContent = t;
    el.viewportSub.textContent = s;
    el.hudView.textContent = `VIEW · ${view.toUpperCase()}`;
    pushLog(`VIEW → ${view.toUpperCase()}`, 'ok');
  }

  /* === 8. 楼层切换 === */
  function setFloor(floor) {
    state.floor = floor;
    el.body.dataset.floor = floor;
    state.racks = generateRacks();
    renderRacks();
    state.selectedRack = null;
    // 默认选中第一个
    setTimeout(() => selectRack(0), 300);
    pushLog(`FLOOR → ${floor === 0 ? 'B1' : 'F' + floor}`, 'ok');
  }

  /* === 9. 主题切换 === */
  function setTheme(theme) {
    el.body.dataset.theme = theme;
    document.querySelectorAll('.theme-dot').forEach((n) => {
      n.classList.toggle('is-active', n.dataset.theme === theme);
    });
    pushLog(`THEME → ${theme.toUpperCase()}`, 'ok');
  }

  /* === 10. 实时遥测更新 === */
  function updateTelemetry() {
    // 全局指标基于所有机架平均
    let totalLoad = 0, totalTemp = 0;
    state.racks.forEach((r) => { totalLoad += r.load; totalTemp += r.temp; });
    const avgLoad = totalLoad / state.racks.length;
    const avgTemp = totalTemp / state.racks.length;

    // 缓动逼近目标
    state.metrics.cpu = lerp(state.metrics.cpu || avgLoad, avgLoad + rand(-4, 4), 0.15);
    state.metrics.mem = lerp(state.metrics.mem || 60, clamp(avgLoad * 0.85 + rand(-3, 3), 0, 100), 0.12);
    state.metrics.net = lerp(state.metrics.net || 45, clamp(40 + Math.sin(Date.now() / 4000) * 20 + rand(-5, 5), 0, 100), 0.1);
    state.metrics.pue = lerp(state.metrics.pue || 1.3, clamp(1.18 + avgLoad * 0.004 + rand(-0.02, 0.02), 1.05, 1.8), 0.1);

    // 更新顶部读数
    el.rdTemp.textContent = avgTemp.toFixed(1);
    el.rdLoad.textContent = Math.round(avgLoad);
    el.rdPower.textContent = Math.round(avgLoad * 4.6);

    // 指标条
    el.metricCpu.style.width = `${state.metrics.cpu}%`;
    el.metricCpuVal.textContent = `${state.metrics.cpu.toFixed(1)}%`;
    el.metricMem.style.width = `${state.metrics.mem}%`;
    el.metricMemVal.textContent = `${state.metrics.mem.toFixed(1)}%`;
    el.metricNet.style.width = `${state.metrics.net}%`;
    el.metricNetVal.textContent = `${state.metrics.net.toFixed(0)}%`;
    el.metricPue.style.width = `${(state.metrics.pue / 1.8) * 100}%`;
    el.metricPueVal.textContent = state.metrics.pue.toFixed(3);

    // 机架负载微扰（模拟实时变化）
    if (Math.random() < 0.3) {
      const r = state.racks[randInt(0, state.racks.length - 1)];
      r.load = clamp(r.load + rand(-3, 3), 5, 99);
      r.temp = clamp(18 + r.load * 0.12 + rand(-1, 1), 16, 40);
      const newStatus = statusFromLoad(r.load);
      if (newStatus !== r.status && Math.random() < 0.2) {
        r.status = newStatus;
        const node = el.isoFloor.querySelector(`.rack[data-id="${r.id}"]`);
        if (node) {
          node.dataset.status = r.status;
          const hc = heatColor(r.load);
          node.style.setProperty('--rack-heat', hc);
        }
        if (r.status === 'danger') pushLog(`ALERT ${r.code} LOAD ${r.load.toFixed(0)}%`, 'danger');
      }
      // 更新负载条
      const node = el.isoFloor.querySelector(`.rack[data-id="${r.id}"]`);
      if (node) {
        const loadBar = node.querySelector('.rack__load');
        const loadH = clamp(r.load * 0.4, 6, 38);
        if (loadBar) {
          loadBar.style.height = `${loadH}px`;
          loadBar.style.top = `${44 - loadH}px`;
        }
      }
    }
  }

  /* === 11. 事件日志 === */
  const LOG_TEMPLATES = [
    ['COOLING CYCLE COMPLETE · ZONE {z}', 'ok'],
    ['POWER DRAW STABLE · {kw}kW', 'ok'],
    ['NETWORK HANDSHAKE · NODE {n}', 'ok'],
    ['THERMAL ALERT · RACK {code} {t}°C', 'warn'],
    ['FAILOVER TRIGGERED · {code}', 'warn'],
    ['DISK HEALTH CHECK PASSED', 'ok'],
    ['BACKBONE LATENCY {ms}ms', 'ok'],
    ['LOAD BALANCER REBALANCED', 'ok']
  ];

  function pushLog(msg, level) {
    const now = new Date();
    const t = now.toTimeString().slice(0, 8);
    state.logs.unshift({ t, msg, level: level || 'ok' });
    if (state.logs.length > 40) state.logs.pop();
    renderLogs();
  }

  function renderLogs() {
    el.logStream.innerHTML = '';
    state.logs.slice(0, 14).forEach((log, idx) => {
      const line = document.createElement('div');
      line.className = `log-line is-${log.level}`;
      line.style.animationDelay = `${idx * 25}ms`;
      line.innerHTML = `<span class="log-line__t">${log.t}</span><span class="log-line__m">${log.msg}</span>`;
      el.logStream.appendChild(line);
    });
  }

  function spawnRandomLog() {
    const [tpl, level] = pick(LOG_TEMPLATES);
    const rack = pick(state.racks);
    const msg = tpl
      .replace('{z}', pick(['NORTH', 'SOUTH', 'EAST', 'WEST']))
      .replace('{kw}', randInt(280, 340))
      .replace('{n}', randInt(100, 999))
      .replace('{code}', rack.code)
      .replace('{t}', rack.temp.toFixed(1))
      .replace('{ms}', randInt(2, 18));
    pushLog(msg, level);
  }

  /* === 12. 时钟 === */
  function updateClock() {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    const s = String(now.getUTCSeconds()).padStart(2, '0');
    el.stClock.textContent = `${h}:${m}:${s} UTC`;
  }

  /* === 13. 粒子流场 === */
  let flowCtx, flowParticles = [], flowW, flowH, lastFrame = performance.now(), frameCount = 0, fpsTime = 0;

  function initFlowField() {
    flowCtx = el.flowCanvas.getContext('2d');
    resizeFlow();
    flowParticles = [];
    const count = window.innerWidth < 768 ? 40 : 80;
    for (let i = 0; i < count; i++) {
      flowParticles.push({
        x: Math.random() * flowW,
        y: Math.random() * flowH,
        vx: 0, vy: 0,
        life: Math.random() * 200,
        size: rand(0.5, 1.8)
      });
    }
    window.addEventListener('resize', resizeFlow);
    requestAnimationFrame(animateFlow);
  }

  function resizeFlow() {
    flowW = el.flowCanvas.width = window.innerWidth;
    flowH = el.flowCanvas.height = window.innerHeight;
  }

  // 简易伪噪声流场
  function flowAngle(x, y, t) {
    return Math.sin(x * 0.003 + t * 0.0003) * 2 + Math.cos(y * 0.0035 - t * 0.0002) * 2;
  }

  function animateFlow(now) {
    // FPS 计算
    frameCount++;
    if (now - fpsTime > 500) {
      const fps = Math.round((frameCount * 1000) / (now - fpsTime));
      el.hudFps.textContent = `${fps} FPS`;
      frameCount = 0;
      fpsTime = now;
    }

    flowCtx.fillStyle = 'rgba(5, 9, 18, 0.08)';
    flowCtx.fillRect(0, 0, flowW, flowH);

    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#3dbfff';

    flowParticles.forEach((p) => {
      const angle = flowAngle(p.x, p.y, now);
      p.vx = lerp(p.vx, Math.cos(angle) * 0.8, 0.1);
      p.vy = lerp(p.vy, Math.sin(angle) * 0.8, 0.1);

      // 鼠标排斥
      if (state.mouse.active) {
        const dx = p.x - state.mouse.x;
        const dy = p.y - state.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140 && dist > 0) {
          const force = (140 - dist) / 140;
          p.vx += (dx / dist) * force * 1.5;
          p.vy += (dy / dist) * force * 1.5;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.life <= 0 || p.x < 0 || p.x > flowW || p.y < 0 || p.y > flowH) {
        p.x = Math.random() * flowW;
        p.y = Math.random() * flowH;
        p.life = rand(100, 250);
      }

      flowCtx.fillStyle = accent;
      flowCtx.globalAlpha = clamp(p.life / 200, 0, 0.6);
      flowCtx.beginPath();
      flowCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      flowCtx.fill();
    });
    flowCtx.globalAlpha = 1;

    requestAnimationFrame(animateFlow);
  }

  /* === 14. 等距场景视差（鼠标驱动） === */
  function bindParallax() {
    const scene = document.querySelector('.viewport');
    scene.addEventListener('mousemove', (e) => {
      const rect = scene.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.isoFloor.style.transform = `rotateX(${55 + y * 6}deg) rotateZ(${-42 - x * 8}deg) scale(0.92)`;
    });
    scene.addEventListener('mouseleave', () => {
      el.isoFloor.style.transform = 'rotateX(55deg) rotateZ(-42deg) scale(0.92)';
    });
  }

  /* === 15. 全局鼠标追踪 === */
  function bindMouse() {
    window.addEventListener('mousemove', (e) => {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
      state.mouse.active = true;
    });
    window.addEventListener('mouseleave', () => { state.mouse.active = false; });
  }

  /* === 16. 事件绑定 === */
  function bindEvents() {
    // 视图切换
    document.querySelectorAll('.nav-chip').forEach((chip) => {
      chip.addEventListener('click', () => setView(chip.dataset.view));
    });
    // 主题
    document.querySelectorAll('.theme-dot').forEach((dot) => {
      dot.addEventListener('click', () => setTheme(dot.dataset.theme));
    });
    // 楼层
    document.querySelectorAll('.floor-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.floor-tab').forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        setFloor(parseInt(tab.dataset.floor, 10));
      });
    });
  }

  /* === 17. 初始化 === */
  function init() {
    state.racks = generateRacks();
    renderRacks();
    bindEvents();
    bindParallax();
    bindMouse();
    initFlowField();

    // 默认选中第一个机架（延迟等入场动画）
    setTimeout(() => selectRack(0), 800);

    // 初始日志
    pushLog('SYSTEM BOOT · DATA CENTER TOUR v1.0', 'ok');
    pushLog(`FACILITY ONLINE · ${state.racks.length} RACKS`, 'ok');
    pushLog('COOLING SYSTEM ENGAGED', 'ok');

    // 定时器
    setInterval(updateTelemetry, 1500);
    setInterval(updateClock, 1000);
    setInterval(spawnRandomLog, 4500);

    updateClock();
    updateTelemetry();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
