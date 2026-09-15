/* ==========================================================================
   Name to Architecture · 名字建筑学
   名字 → 确定性哈希 → 程序化生成等距建筑蓝图
   免构建 · Vanilla JS · Canvas 2D
   ========================================================================== */

(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('city-canvas');
  const ctx = canvas.getContext('2d');
  const nameInput = document.getElementById('name-input');
  const forgeBtn = document.getElementById('forge-btn');
  const replayBtn = document.getElementById('replay-btn');
  const quickNames = document.getElementById('quick-names');
  const themeRow = document.getElementById('theme-row');
  const hudName = document.getElementById('hud-name');
  const hudProgress = document.getElementById('hud-progress');
  const blueprintId = document.getElementById('blueprint-id');
  const specSeed = document.getElementById('spec-seed');
  const specStyle = document.getElementById('spec-style');
  const specFloors = document.getElementById('spec-floors');
  const specHeight = document.getElementById('spec-height');

  // === 确定性随机（同一名字 → 同一建筑） ===
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const STYLE_NAMES = ['粗野主义', '新未来主义', '装饰艺术', '极简玻璃', '新陈代谢派', '哥特复兴'];

  // === 蓝图生成 ===
  function generateBlueprint(name) {
    const seed = hashString(name);
    const rnd = mulberry32(seed);
    const style = Math.floor(rnd() * STYLE_NAMES.length);
    const floors = 5 + Math.floor(rnd() * 14);
    const unit = 1; // 等距单元
    const bp = {
      name, seed, style, floors,
      styleName: STYLE_NAMES[style],
      // 主体平面（格数）
      w: 3 + Math.floor(rnd() * 3),
      d: 3 + Math.floor(rnd() * 3),
      // 塔楼层：向上收分
      tiers: [],
      // 配楼
      wings: [],
      // 屋顶
      spire: rnd() > 0.45,
      spireH: 1.5 + rnd() * 3,
      beacon: rnd() > 0.3,
      // 每层窗户基因：[row][col] 是否亮灯
      lights: [],
      antenna: rnd() > 0.6,
      plazaTrees: Math.floor(rnd() * 6),
      rnd
    };
    // 生成收分塔层
    let tierW = bp.w, tierD = bp.d, tierFloorsLeft = bp.floors;
    while (tierFloorsLeft > 0) {
      const take = Math.max(2, Math.ceil(tierFloorsLeft * (0.4 + rnd() * 0.3)));
      bp.tiers.push({ w: tierW, d: tierD, floors: Math.min(take, tierFloorsLeft) });
      tierFloorsLeft -= take;
      if (tierW > 2 && rnd() > 0.35) tierW -= 1;
      if (tierD > 2 && rnd() > 0.35) tierD -= 1;
    }
    // 配楼（低层裙楼）
    const wingCount = Math.floor(rnd() * 3);
    for (let i = 0; i < wingCount; i++) {
      bp.wings.push({
        ox: Math.floor(rnd() * 5) - 2,
        oz: Math.floor(rnd() * 5) - 2,
        w: 1 + Math.floor(rnd() * 2),
        d: 1 + Math.floor(rnd() * 2),
        floors: 1 + Math.floor(rnd() * 3)
      });
    }
    // 亮灯基因
    for (let f = 0; f < bp.floors + 6; f++) {
      const rows = [];
      for (let c = 0; c < 40; c++) rows.push(rnd() > 0.45);
      bp.lights.push(rows);
    }
    return bp;
  }

  // === 相机与场景状态 ===
  const state = {
    bp: null,
    rotY: -0.62,          // 水平旋转
    rotX: 0.52,           // 俯仰
    zoom: 1,
    targetRotY: -0.62,
    targetRotX: 0.52,
    targetZoom: 1,
    buildStart: 0,        // 建造动画起始时间
    theme: 0,
    sparkleParticles: []
  };

  const THEME_COLORS = [
    { top: [148, 168, 224], left: [86, 104, 168], right: [58, 72, 128], glow: '#a8b8ff', ground: 'rgba(148,168,224,0.16)' },
    { top: [232, 168, 120], left: [166, 96, 78], right: [110, 58, 58], glow: '#ffc499', ground: 'rgba(232,168,120,0.16)' },
    { top: [106, 212, 232], left: [58, 108, 158], right: [34, 66, 106], glow: '#6ad4e8', ground: 'rgba(106,212,232,0.14)' },
    { top: [255, 106, 213], left: [132, 58, 199], right: [60, 26, 110], glow: '#ff6ad5', ground: 'rgba(255,106,213,0.16)' }
  ];

  // === 等距投影 ===
  function project(x, y, z, cx, cy, scale) {
    const { rotY, rotX } = state;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
    const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
    return { sx: cx + x1 * scale, sy: cy - y1 * scale, depth: z2 };
  }

  // === 3D 面绘制（简单画家排序在外部处理） ===
  function drawFace(pts, color, strokeAlpha) {
    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].sy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (strokeAlpha > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${strokeAlpha})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  function shade(rgb, k) {
    return `rgb(${rgb.map((v) => Math.min(255, Math.round(v * k))).join(',')})`;
  }

  // === 建造缓动：expo-out，带轻微过冲 ===
  function buildEase(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // 近似 cubic-bezier(0.16,1,0.3,1) + 弹性
    const e = 1 - Math.pow(1 - t, 4);
    return e + Math.sin(t * Math.PI) * 0.06 * (1 - t);
  }

  // === 渲染建筑 ===
  function renderBuilding(bp, now, cx, cy, scale, theme) {
    const elapsed = (now - state.buildStart) / 1000;
    const T = theme;
    const faces = []; // 收集所有面，按深度排序
    const unit = 1;
    const FLOOR_H = 0.55;

    // 地面网格
    ctx.strokeStyle = T.ground;
    ctx.lineWidth = 1;
    const G = 7;
    for (let i = -G; i <= G; i++) {
      const a = project(i * unit, 0, -G * unit, cx, cy, scale);
      const b = project(i * unit, 0, G * unit, cx, cy, scale);
      const c = project(-G * unit, 0, i * unit, cx, cy, scale);
      const d = project(G * unit, 0, i * unit, cx, cy, scale);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.sx, c.sy); ctx.lineTo(d.sx, d.sy); ctx.stroke();
    }

    let currentFloor = 0;
    let baseY = 0;

    const pushBox = (x0, z0, w, d, y0, h, floorIndex, opts) => {
      // 该盒子出现的延迟：按楼层错峰
      const delay = floorIndex * 0.09 + (opts.extraDelay || 0);
      const t = buildEase(Math.min(1, Math.max(0, (elapsed - delay) / 0.9)));
      if (t <= 0.001) return null;
      const lift = (1 - t) * 4.5; // 从高处落下
      const yy = y0 + lift;
      const alpha = Math.min(1, t * 1.6);

      const x1 = x0, x2 = x0 + w, z1 = z0, z2 = z0 + d;
      const yb = yy, yt = yy + h;

      const top = [
        project(x1, yt, z1, cx, cy, scale), project(x2, yt, z1, cx, cy, scale),
        project(x2, yt, z2, cx, cy, scale), project(x1, yt, z2, cx, cy, scale)
      ];
      const left = [
        project(x1, yb, z2, cx, cy, scale), project(x1, yt, z2, cx, cy, scale),
        project(x2, yt, z2, cx, cy, scale), project(x2, yb, z2, cx, cy, scale)
      ];
      const right = [
        project(x2, yb, z1, cx, cy, scale), project(x2, yt, z1, cx, cy, scale),
        project(x2, yt, z2, cx, cy, scale), project(x2, yb, z2, cx, cy, scale)
      ];
      const depth = (top[0].depth + top[2].depth) / 2;
      faces.push({ depth, top, left, right, alpha, floorIndex });
      return { x1, x2, z1, z2, yb, yt, t, alpha };
    };

    // 主塔：逐层生长
    for (const tier of bp.tiers) {
      for (let f = 0; f < tier.floors; f++) {
        const w = tier.w * unit, d = tier.d * unit;
        const ox = -w / 2, oz = -d / 2;
        pushBox(ox, oz, w, d, baseY, FLOOR_H, currentFloor, {});
        currentFloor++;
        baseY += FLOOR_H;
      }
    }

    // 配楼
    for (const wing of bp.wings) {
      pushBox(wing.ox - bp.w / 2, wing.oz - bp.d / 2, wing.w * unit, wing.d * unit, 0, FLOOR_H * wing.floors, 0, { extraDelay: 0.6 });
    }

    // 尖顶
    if (bp.spire) {
      const t = buildEase(Math.min(1, Math.max(0, (elapsed - currentFloor * 0.09 - 0.4) / 1)));
      if (t > 0.001) {
        const sw = bp.tiers[bp.tiers.length - 1].w * unit;
        const sd = bp.tiers[bp.tiers.length - 1].d * unit;
        const apex = project(0, baseY + bp.spireH * t, 0, cx, cy, scale);
        const b1 = project(-sw / 2, baseY, -sd / 2, cx, cy, scale);
        const b2 = project(sw / 2, baseY, -sd / 2, cx, cy, scale);
        const b3 = project(sw / 2, baseY, sd / 2, cx, cy, scale);
        const b4 = project(-sw / 2, baseY, sd / 2, cx, cy, scale);
        faces.push({
          depth: (b1.depth + apex.depth) / 2 - 0.1, alpha: t,
          custom: () => {
            drawFace([apex, b1, b2], shade(T.left, 1.1), 0.1);
            drawFace([apex, b2, b3], shade(T.right, 1.15), 0.1);
            drawFace([apex, b3, b4], shade(T.left, 0.95), 0.1);
            drawFace([apex, b4, b1], shade(T.right, 0.9), 0.1);
          }
        });
        if (bp.beacon) {
          const pulse = 0.5 + 0.5 * Math.sin(now / 400);
          ctx.fillStyle = T.glow;
          ctx.globalAlpha = t * pulse;
          ctx.beginPath();
          ctx.arc(apex.sx, apex.sy, 3.2 + pulse * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = t * pulse * 0.35;
          ctx.beginPath();
          ctx.arc(apex.sx, apex.sy, 8 + pulse * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // 画家算法：远 → 近
    faces.sort((a, b) => b.depth - a.depth);
    for (const face of faces) {
      ctx.globalAlpha = face.alpha;
      if (face.custom) { face.custom(); }
      else {
        drawFace(face.top, shade(T.top, 1.02), 0.12);
        drawFace(face.left, shade(T.left, 0.9), 0.06);
        drawFace(face.right, shade(T.right, 1.12), 0.06);
      }
      ctx.globalAlpha = 1;
    }

    // 窗户：亮灯小矩形贴在侧面
    if (bp && elapsed > 0.5) {
      ctx.fillStyle = T.glow;
      let wy = 0;
      let fi = 0;
      for (const tier of bp.tiers) {
        for (let f = 0; f < tier.floors; f++) {
          const appearT = buildEase(Math.min(1, Math.max(0, (elapsed - fi * 0.09) / 0.9)));
          if (appearT > 0.6) {
            const yC = wy + FLOOR_H * 0.55;
            const cols = Math.min(6, tier.w * 2);
            for (let c = 0; c < cols; c++) {
              if (!bp.lights[fi][c]) continue;
              const flick = 0.55 + 0.45 * Math.sin(now / 900 + fi * 1.7 + c * 2.3);
              ctx.globalAlpha = (appearT - 0.6) * 2.5 * flick * 0.85;
              const lx = -tier.w / 2 + ((c + 0.5) / cols) * tier.w;
              const p = project(lx, yC, tier.d / 2, cx, cy, scale);
              ctx.beginPath();
              ctx.arc(p.sx, p.sy, scale * 0.055, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          fi++; wy += FLOOR_H;
        }
      }
      ctx.globalAlpha = 1;
    }

    return Math.min(1, elapsed / (currentFloor * 0.09 + 1.4));
  }

  // === 建造尘埃粒子 ===
  function spawnSparkles(cx, cy) {
    if (state.sparkleParticles.length > 120) return;
    for (let i = 0; i < 3; i++) {
      state.sparkleParticles.push({
        x: cx + (Math.random() - 0.5) * 300,
        y: cy + (Math.random() - 0.5) * 300,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.25,
        life: 1, size: 1 + Math.random() * 2
      });
    }
  }

  function renderParticles(dt) {
    const T = THEME_COLORS[state.theme];
    ctx.fillStyle = T.glow;
    for (const p of state.sparkleParticles) {
      p.x += p.vx; p.y += p.vy; p.life -= dt * 0.4;
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    state.sparkleParticles = state.sparkleParticles.filter((p) => p.life > 0);
  }

  // === 主循环 ===
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // 相机弹簧跟随（非线性）
    const k = 1 - Math.pow(0.001, dt); // 帧率无关的平滑
    state.rotY += (state.targetRotY - state.rotY) * k;
    state.rotX += (state.targetRotX - state.rotX) * k;
    state.zoom += (state.targetZoom - state.zoom) * k;

    resizeIfNeeded();
    const W = canvas.width / devicePixelRatio, H = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    const T = THEME_COLORS[state.theme];
    if (state.bp) {
      const scale = Math.min(W, H) / 9 * state.zoom;
      const progress = renderBuilding(state.bp, now, W / 2, H * 0.68, scale, T);
      hudProgress.textContent = Math.round(progress * 100) + '%';
      if (progress < 1) spawnSparkles(W / 2, H * 0.55);
    }
    renderParticles(dt);

    requestAnimationFrame(loop);
  }

  // === 自适应尺寸 ===
  function resizeIfNeeded() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // === 名字乱码揭示 ===
  const SCRAMBLE_CHARS = '◧◨◩◪▣▤▥▦▧▨▩⌂⌃⌄⌇';
  function scrambleTo(el, target, duration = 800) {
    const start = performance.now();
    (function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4);
      const reveal = Math.floor(target.length * e);
      let out = target.slice(0, reveal);
      for (let i = reveal; i < target.length; i++) {
        out += target[i] === ' ' ? ' ' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  // === 更新面板数据 ===
  function updateSpecs(bp) {
    const seedHex = bp.seed.toString(16).toUpperCase().padStart(8, '0');
    specSeed.textContent = `0x${seedHex.slice(0, 4)}-${seedHex.slice(4)}`;
    specStyle.textContent = bp.styleName;
    specFloors.textContent = `${bp.floors}F`;
    const meters = Math.round(bp.floors * 3.6 + (bp.spire ? bp.spireH * 10 : 0));
    specHeight.textContent = `${meters}m`;
    blueprintId.textContent = `BLUEPRINT #${seedHex.slice(0, 4)}-${seedHex.slice(4)}`;
  }

  // === 铸造 ===
  function forge(name) {
    const trimmed = name.trim();
    if (!trimmed) {
      // 输入拒绝抖动
      nameInput.style.borderColor = 'rgba(255,100,120,0.8)';
      nameInput.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
        { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      setTimeout(() => { nameInput.style.borderColor = ''; }, 600);
      return;
    }
    state.bp = generateBlueprint(trimmed);
    state.buildStart = performance.now();
    state.sparkleParticles = [];
    updateSpecs(state.bp);
    scrambleTo(hudName, trimmed.toUpperCase());
  }

  // === 事件绑定 ===
  forgeBtn.addEventListener('click', () => forge(nameInput.value));
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') forge(nameInput.value);
  });
  replayBtn.addEventListener('click', () => {
    if (state.bp) { state.buildStart = performance.now(); state.sparkleParticles = []; }
  });
  quickNames.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    nameInput.value = chip.dataset.name;
    forge(chip.dataset.name);
  });
  themeRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    themeRow.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.theme = +btn.dataset.theme;
    document.body.dataset.theme = state.theme;
  });

  // 视口拖拽旋转 / 滚轮缩放 / 双击重置
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    state.targetRotY += (e.clientX - lastX) * 0.008;
    state.targetRotX = Math.max(0.15, Math.min(1.2, state.targetRotX + (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.targetZoom = Math.max(0.5, Math.min(2.4, state.targetZoom * (e.deltaY > 0 ? 0.92 : 1.08)));
  }, { passive: false });
  canvas.addEventListener('dblclick', () => {
    state.targetRotY = -0.62; state.targetRotX = 0.52; state.targetZoom = 1;
  });

  // === 初始化 ===
  document.body.dataset.theme = '0';
  resizeIfNeeded();
  requestAnimationFrame(loop);
  setTimeout(() => forge('EDEN'), 400);
})();
