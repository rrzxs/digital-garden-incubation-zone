/* ==========================================================================
   Camera Blocking Board · 走位调度板
   导演视角的机位编排剧场 — 弹簧物理 FOV 锥 + 演员跟踪 + 覆盖热区
   ========================================================================== */
(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const shotsEl = document.getElementById('shots');
  const shotsEmptyEl = document.getElementById('shotsEmpty');
  const metaCoverageEl = document.getElementById('metaCoverage');
  const fovRange = document.getElementById('fovRange');
  const lensRange = document.getElementById('lensRange');
  const fovVal = document.getElementById('fovVal');
  const lensVal = document.getElementById('lensVal');
  const autoTrackBtn = document.getElementById('autoTrack');
  const coverageBtn = document.getElementById('showCoverage');
  const clearBtn = document.getElementById('clearBtn');
  const demoBtn = document.getElementById('demoBtn');

  // === State ===
  const state = {
    tool: 'cam',            // cam | actor | pan
    fov: 58,
    lens: 35,
    autoTrack: true,
    showCoverage: false,
    palette: 'noir',
    takeCount: 0,
    pointer: { x: -999, y: -999, down: false },
    dragTarget: null,       // { kind, ref }
    pulses: [],             // 点击冲击波
    particles: [],          // 环境粒子
    actorsTrail: [],
  };

  const cameras = []; // { x, y, angle, angleV, fov, targetFov, label, id }
  const actors = [];  // { x, y, vx, vy, label, id, phase }

  const CAM_NAMES = ['A-CAM', 'B-CAM', 'C-CAM', 'D-CAM', 'E-CAM', 'F-CAM'];
  const ACTOR_NAMES = ['LEAD', 'SUPPORT', 'EXTRA-1', 'EXTRA-2', 'STUNT'];
  let camSeq = 0, actorSeq = 0, uid = 0;

  const PALETTES = {
    noir:   { accent: [120, 220, 232], accent2: [255, 120, 180], grid: 'rgba(235,240,250,0.05)', ink: [235, 240, 250] },
    cine:   { accent: [255, 196, 100], accent2: [120, 180, 255], grid: 'rgba(245,240,230,0.05)', ink: [245, 240, 230] },
    ember:  { accent: [255, 130, 90],  accent2: [255, 90, 120],  grid: 'rgba(250,238,232,0.05)', ink: [250, 238, 232] },
    arctic: { accent: [140, 235, 220], accent2: [160, 190, 255], grid: 'rgba(235,248,252,0.05)', ink: [235, 248, 252] },
  };

  // === Canvas Sizing ===
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  // === Math Helpers ===
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a, b, t) => a + (b - a) * t;
  function angleLerp(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  // === Entities ===
  function addCamera(x, y) {
    const cam = {
      id: ++uid,
      x, y,
      angle: -Math.PI / 2,
      angleV: 0,
      fov: state.fov,
      targetFov: state.fov,
      label: CAM_NAMES[camSeq % CAM_NAMES.length] + '-' + String(++camSeq).padStart(2, '0'),
    };
    cameras.push(cam);
    state.pulses.push({ x, y, r: 0, life: 1, hue: 'accent' });
    syncShotList();
  }

  function addActor(x, y) {
    actors.push({
      id: ++uid,
      x, y, vx: 0, vy: 0,
      label: ACTOR_NAMES[actorSeq % ACTOR_NAMES.length],
      phase: Math.random() * Math.PI * 2,
      num: ++actorSeq,
    });
    state.pulses.push({ x, y, r: 0, life: 1, hue: 'accent2' });
    syncShotList();
  }

  function nearestActor(cam) {
    let best = null, bd = Infinity;
    for (const a of actors) {
      const d = dist(cam, a);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  function isInCone(cam, point) {
    const d = dist(cam, point);
    if (d < 24 || d > 400) return false;
    let da = Math.atan2(point.y - cam.y, point.x - cam.x) - cam.angle;
    da = Math.abs(((da % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    return da <= (cam.fov * Math.PI / 180) / 2;
  }

  // === Interaction ===
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPos(e);
    canvas.setPointerCapture(e.pointerId);
    state.pointer.down = true;
    state.pointer.x = p.x; state.pointer.y = p.y;

    // 命中检测：优先机位（含机头方向手柄），其次演员
    for (let i = cameras.length - 1; i >= 0; i--) {
      const c = cameras[i];
      if (Math.hypot(p.x - c.x, p.y - c.y) < 22) {
        state.dragTarget = { kind: 'cam', ref: c, grabMode: 'move' };
        return;
      }
      const hx = c.x + Math.cos(c.angle) * 46, hy = c.y + Math.sin(c.angle) * 46;
      if (Math.hypot(p.x - hx, p.y - hy) < 16) {
        state.dragTarget = { kind: 'cam', ref: c, grabMode: 'aim' };
        return;
      }
    }
    for (let i = actors.length - 1; i >= 0; i--) {
      if (Math.hypot(p.x - actors[i].x, p.y - actors[i].y) < 20) {
        state.dragTarget = { kind: 'actor', ref: actors[i] };
        return;
      }
    }

    if (state.tool === 'cam') addCamera(p.x, p.y);
    else if (state.tool === 'actor') addActor(p.x, p.y);
    else state.dragTarget = { kind: 'pan', ref: { x: p.x, y: p.y } };
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = canvasPos(e);
    state.pointer.x = p.x; state.pointer.y = p.y;
    const t = state.dragTarget;
    if (!t || !state.pointer.down) return;
    if (t.kind === 'cam' && t.grabMode === 'move') { t.ref.x = p.x; t.ref.y = p.y; }
    else if (t.kind === 'cam' && t.grabMode === 'aim') {
      t.ref.targetAngle = Math.atan2(p.y - t.ref.y, p.x - t.ref.x);
    } else if (t.kind === 'actor') { t.ref.x = p.x; t.ref.y = p.y; t.ref.vx = 0; t.ref.vy = 0; }
  });

  window.addEventListener('pointerup', () => {
    state.pointer.down = false;
    state.dragTarget = null;
  });

  canvas.addEventListener('dblclick', (e) => {
    const p = canvasPos(e);
    for (let i = cameras.length - 1; i >= 0; i--) {
      if (Math.hypot(p.x - cameras[i].x, p.y - cameras[i].y) < 22) { cameras.splice(i, 1); syncShotList(); return; }
    }
    for (let i = actors.length - 1; i >= 0; i--) {
      if (Math.hypot(p.x - actors[i].x, p.y - actors[i].y) < 20) { actors.splice(i, 1); syncShotList(); return; }
    }
  });

  // 全场脉冲
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      state.takeCount++;
      for (const c of cameras) state.pulses.push({ x: c.x, y: c.y, r: 0, life: 1, hue: 'accent' });
      document.getElementById('metaClock').textContent = `SC 01 · TAKE ${String(state.takeCount).padStart(2, '0')}`;
    }
  });

  // === Controls ===
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.tool = btn.dataset.tool;
      canvas.style.cursor = state.tool === 'pan' ? 'grab' : 'crosshair';
    });
  });

  fovRange.addEventListener('input', () => {
    state.fov = +fovRange.value;
    fovVal.textContent = state.fov + '°';
    for (const c of cameras) c.targetFov = state.fov;
  });
  lensRange.addEventListener('input', () => {
    state.lens = +lensRange.value;
    lensVal.textContent = state.lens + 'mm';
  });

  autoTrackBtn.addEventListener('click', () => {
    state.autoTrack = !state.autoTrack;
    autoTrackBtn.setAttribute('aria-pressed', state.autoTrack);
    if (!state.autoTrack) for (const c of cameras) delete c.targetAngle;
  });
  coverageBtn.addEventListener('click', () => {
    state.showCoverage = !state.showCoverage;
    coverageBtn.setAttribute('aria-pressed', state.showCoverage);
  });

  clearBtn.addEventListener('click', () => { cameras.length = 0; actors.length = 0; camSeq = 0; actorSeq = 0; syncShotList(); });
  demoBtn.addEventListener('click', () => {
    cameras.length = 0; actors.length = 0; camSeq = 0; actorSeq = 0;
    const cx = W / 2, cy = H / 2;
    addActor(cx, cy);
    addCamera(cx - W * 0.28, cy - H * 0.24);
    addCamera(cx + W * 0.3, cy - H * 0.18);
    addCamera(cx + W * 0.05, cy + H * 0.3);
    syncShotList();
  });

  document.querySelectorAll('.pal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pal-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.palette = btn.dataset.palette;
      document.body.dataset.palette = state.palette;
    });
  });

  // === Shot List UI ===
  function syncShotList() {
    shotsEmptyEl.style.display = cameras.length ? 'none' : 'block';
    shotsEl.innerHTML = '';
    for (const c of cameras) {
      const li = document.createElement('li');
      li.className = 'shot-item';
      li.dataset.camId = c.id;
      const locked = actors.some((a) => isInCone(c, a));
      li.classList.toggle('locked', locked);
      li.innerHTML = `
        <span class="shot-id">${c.label.split('-')[0]}</span>
        <span class="shot-name">${c.label}</span>
        <span class="shot-status" data-role="status">${locked ? '● LOCKED' : '○ SEARCHING'}</span>`;
      shotsEl.appendChild(li);
    }
  }

  function updateShotList() {
    for (const li of shotsEl.children) {
      const cam = cameras.find((c) => c.id === +li.dataset.camId);
      if (!cam) continue;
      const locked = actors.some((a) => isInCone(cam, a));
      li.classList.toggle('locked', locked);
      const st = li.querySelector('[data-role="status"]');
      const text = locked ? '● LOCKED' : '○ SEARCHING';
      if (st.textContent !== text) st.textContent = text;
    }
  }

  // === Physics Update ===
  function update(dt, time) {
    // 演员游走（呼吸式漂移）
    for (const a of actors) {
      if (state.dragTarget && state.dragTarget.ref === a && state.pointer.down) continue;
      a.phase += dt * 0.4;
      a.vx += Math.cos(a.phase * 1.7 + a.num) * 8 * dt;
      a.vy += Math.sin(a.phase * 1.3 + a.num * 2) * 8 * dt;
      a.vx *= 0.96; a.vy *= 0.96;
      a.x += a.vx * dt * 10; a.y += a.vy * dt * 10;
      a.x = Math.max(30, Math.min(W - 30, a.x));
      a.y = Math.max(30, Math.min(H - 30, a.y));
    }

    // 机位：弹簧跟焦 / FOV 插值
    for (const c of cameras) {
      let targetAngle = c.targetAngle;
      if (state.autoTrack) {
        const t = nearestActor(c);
        if (t) {
          targetAngle = Math.atan2(t.y - c.y, t.x - c.x);
          const d = dist(c, t);
          // 焦段感知：长焦缓摇，广角快摇
          const speed = lerp(6, 1.5, (state.lens - 14) / 121);
          c.angle = angleLerp(c.angle, targetAngle, 1 - Math.exp(-speed * dt));
          c.fov = lerp(c.fov, c.targetFov, 1 - Math.exp(-4 * dt));
          continue;
        }
      }
      if (targetAngle !== undefined) {
        c.angle = angleLerp(c.angle, targetAngle, 1 - Math.exp(-5 * dt));
      }
      c.fov = lerp(c.fov, c.targetFov, 1 - Math.exp(-4 * dt));
    }

    // 脉冲
    for (let i = state.pulses.length - 1; i >= 0; i--) {
      const p = state.pulses[i];
      p.r += 320 * dt; p.life -= dt * 1.4;
      if (p.life <= 0) state.pulses.splice(i, 1);
    }

    // 覆盖率
    if (cameras.length) {
      let covered = 0, total = 0;
      const step = 28;
      for (let gx = 20; gx < W; gx += step) {
        for (let gy = 20; gy < H; gy += step) {
          total++;
          for (const c of cameras) if (isInCone(c, { x: gx, y: gy })) { covered++; break; }
        }
      }
      metaCoverageEl.textContent = 'COVER ' + Math.round((covered / total) * 100) + '%';
    } else {
      metaCoverageEl.textContent = 'COVER 0%';
    }
  }

  // === Render ===
  function rgba(arr, a) { return `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`; }

  function render(time) {
    const pal = PALETTES[state.palette];
    ctx.clearRect(0, 0, W, H);

    // 舞台网格
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    const gs = 44;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = gs; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // 中心舞台标记
    ctx.font = '10px "Share Tech Mono"';
    ctx.fillStyle = rgba(pal.ink, 0.18);
    ctx.textAlign = 'center';
    ctx.fillText('S T A G E · C E N T E R', W / 2, H / 2 - 4);

    // 覆盖热区
    if (state.showCoverage) {
      const step = 22;
      for (let gx = 12; gx < W; gx += step) {
        for (let gy = 12; gy < H; gy += step) {
          for (const c of cameras) {
            if (isInCone(c, { x: gx, y: gy })) {
              const d = dist(c, { x: gx, y: gy });
              const a = 0.16 * (1 - d / 400);
              ctx.fillStyle = rgba(pal.accent, Math.max(a, 0.02));
              ctx.fillRect(gx - 1, gy - 1, 2, 2);
              break;
            }
          }
        }
      }
    }

    // 脉冲冲击波
    for (const p of state.pulses) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(pal[p.hue], p.life * 0.5);
      ctx.lineWidth = 2 * p.life;
      ctx.stroke();
    }

    // 跟踪连线
    for (const c of cameras) {
      const t = nearestActor(c);
      if (t && isInCone(c, t)) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(t.x, t.y);
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = rgba(pal.accent, 0.35);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 演员标记
    for (const a of actors) {
      const breathe = 1 + Math.sin(time * 0.002 + a.phase) * 0.08;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 11 * breathe, 0, Math.PI * 2);
      ctx.fillStyle = rgba(pal.accent2, 0.85);
      ctx.shadowColor = rgba(pal.accent2, 0.8);
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(a.x, a.y, 17 * breathe, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(pal.accent2, 0.3);
      ctx.stroke();

      ctx.fillStyle = rgba(pal.ink, 0.85);
      ctx.font = '9px "Share Tech Mono"';
      ctx.fillText(a.label, a.x, a.y + 30);
    }

    // 机位 + FOV 锥
    for (const c of cameras) {
      const half = (c.fov * Math.PI / 180) / 2;
      const range = lerp(320, 200, (state.lens - 14) / 121);

      // 锥体
      const grad = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, range);
      grad.addColorStop(0, rgba(pal.accent, 0.22));
      grad.addColorStop(1, rgba(pal.accent, 0));
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.arc(c.x, c.y, range, c.angle - half, c.angle + half);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = rgba(pal.accent, 0.28);
      ctx.lineWidth = 1;
      ctx.stroke();

      // 机身
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = rgba(pal.ink, 0.92);
      ctx.beginPath();
      ctx.roundRect(-12, -9, 24, 18, 5);
      ctx.fill();
      ctx.fillStyle = rgba(pal.accent, 0.95);
      ctx.beginPath();
      ctx.arc(9, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 瞄准手柄
      const hx = c.x + Math.cos(c.angle) * 46, hy = c.y + Math.sin(c.angle) * 46;
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(pal.accent, 0.7);
      ctx.stroke();

      // 标签
      ctx.fillStyle = rgba(pal.ink, 0.8);
      ctx.font = '9px "Share Tech Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x, c.y + 28);
    }

    // 光标准星
    if (state.pointer.x > 0) {
      ctx.strokeStyle = rgba(pal.ink, 0.25);
      ctx.beginPath();
      ctx.arc(state.pointer.x, state.pointer.y, 9, 0, Math.PI * 2);
      ctx.moveTo(state.pointer.x - 14, state.pointer.y);
      ctx.lineTo(state.pointer.x - 4, state.pointer.y);
      ctx.moveTo(state.pointer.x + 4, state.pointer.y);
      ctx.lineTo(state.pointer.x + 14, state.pointer.y);
      ctx.stroke();
    }
  }

  // === Main Loop ===
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt, now);
    render(now);
    updateShotList();
    requestAnimationFrame(loop);
  }

  // === Boot ===
  resize();
  requestAnimationFrame(loop);
  setTimeout(() => demoBtn.click(), 300);
})();
