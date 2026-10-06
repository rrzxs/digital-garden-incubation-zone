/* ============================================================
   MOTION MOOD ARENA — 交互逻辑
   领域模块: Presets / Particles / Field / Input / HUD / Loop
   ============================================================ */
(() => {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const rail = document.getElementById('moodRail');
  const halo = document.getElementById('cursorHalo');
  const roMood = document.getElementById('roMood');
  const roUnits = document.getElementById('roUnits');
  const roFps = document.getElementById('roFps');
  const energySlider = document.getElementById('energySlider');
  const energyVal = document.getElementById('energyVal');
  const countSlider = document.getElementById('countSlider');
  const countVal = document.getElementById('countVal');
  const btnPulse = document.getElementById('btnPulse');
  const btnScatter = document.getElementById('btnScatter');

  // === Mood Presets (情绪预设 = 运动行为参数集) ===
  const PRESETS = [
    {
      key: 'SERENITY', name: '静泊 Serenity', sub: 'orbital drift', glyph: '○', keyNum: 1,
      hue: 190, hue2: 220, speed: 0.35, jitter: 0.05, orbit: 0.9,
      gravity: -0.02, trail: 0.06, size: 1.0, link: 0.5,
      glow: 'rgba(94, 200, 255, 0.5)', glowSoft: 'rgba(94, 200, 255, 0.15)'
    },
    {
      key: 'EUPHORIA', name: '欢腾 Euphoria', sub: 'burst bounce', glyph: '✳', keyNum: 2,
      hue: 320, hue2: 30, speed: 1.6, jitter: 0.5, orbit: 0.2,
      gravity: 0.12, trail: 0.16, size: 1.25, link: 0.15,
      glow: 'rgba(255, 110, 160, 0.55)', glowSoft: 'rgba(255, 110, 160, 0.16)'
    },
    {
      key: 'FOCUS', name: '聚敛 Focus', sub: 'magnetic lattice', glyph: '⊞', keyNum: 3,
      hue: 260, hue2: 280, speed: 0.55, jitter: 0.02, orbit: 0.1,
      gravity: 0.0, trail: 0.1, size: 0.85, link: 1.0,
      glow: 'rgba(150, 120, 255, 0.5)', glowSoft: 'rgba(150, 120, 255, 0.15)'
    },
    {
      key: 'CHAOS', name: '混沌 Chaos', sub: 'turbulence storm', glyph: '꩜', keyNum: 4,
      hue: 100, hue2: 160, speed: 2.2, jitter: 1.4, orbit: -0.5,
      gravity: 0.05, trail: 0.22, size: 1.1, link: 0.25,
      glow: 'rgba(120, 255, 170, 0.5)', glowSoft: 'rgba(120, 255, 170, 0.14)'
    },
    {
      key: 'MELANCHOLY', name: '沉降 Melancholy', sub: 'slow descent', glyph: '☂', keyNum: 5,
      hue: 215, hue2: 245, speed: 0.18, jitter: 0.08, orbit: 0.3,
      gravity: 0.07, trail: 0.04, size: 0.9, link: 0.35,
      glow: 'rgba(110, 140, 230, 0.4)', glowSoft: 'rgba(110, 140, 230, 0.12)'
    },
    {
      key: 'ELECTRIC', name: '电弧 Electric', sub: 'strobe jolt', glyph: '⚡', keyNum: 6,
      hue: 45, hue2: 190, speed: 1.2, jitter: 2.4, orbit: 0.6,
      gravity: 0.0, trail: 0.3, size: 0.95, link: 0.6,
      glow: 'rgba(255, 220, 110, 0.55)', glowSoft: 'rgba(255, 220, 110, 0.16)'
    }
  ];

  // === State ===
  let W = 0, H = 0, DPR = 1;
  let particles = [];
  let targetCount = 96;
  let energy = 0.5;
  let currentPreset = PRESETS[0];
  // moodState: 所有行为参数的插值状态，切换情绪时缓慢逼近目标
  let moodState = { ...stripPreset(PRESETS[0]) };
  const mouse = { x: -9999, y: -9999, down: false, haloX: innerWidth / 2, haloY: innerHeight / 2 };
  let shocks = []; // 冲击波队列
  const TAU = Math.PI * 2;

  function stripPreset(p) {
    const { key, name, sub, glyph, keyNum, glow, glowSoft, ...params } = p;
    return params;
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  // === Particles ===
  class Particle {
    constructor() { this.respawn(true); }

    respawn(randomY) {
      this.x = Math.random() * W;
      this.y = randomY ? Math.random() * H : -10;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.r = 1.2 + Math.random() * 2.4;
      this.seed = Math.random() * TAU;
      this.hueMix = Math.random();
    }

    step(t, dt) {
      const s = moodState;
      const sp = s.speed * (0.5 + energy * 1.2);

      // 基础游走 (伪 Perlin: 多频正弦)
      this.vx += Math.cos(t * 0.7 + this.seed) * 0.02 * sp * s.jitter;
      this.vy += Math.sin(t * 0.9 + this.seed * 1.7) * 0.02 * sp * s.jitter;

      // 环绕力: 绕屏幕中心的切向速度
      if (Math.abs(s.orbit) > 0.01) {
        const dx = this.x - W / 2, dy = this.y - H / 2;
        const d = Math.max(60, Math.hypot(dx, dy));
        this.vx += (-dy / d) * 0.05 * sp * s.orbit;
        this.vy += (dx / d) * 0.05 * sp * s.orbit;
      }

      // 重力
      this.vy += s.gravity * 0.35 * sp;

      // 引力井 (鼠标按住)
      if (mouse.down) {
        const dx = mouse.x - this.x, dy = mouse.y - this.y;
        const d2 = dx * dx + dy * dy;
        const d = Math.sqrt(d2) || 1;
        if (d < 460) {
          const f = (1 - d / 460) * 1.6;
          this.vx += (dx / d) * f;
          this.vy += (dy / d) * f;
        }
      } else if (mouse.x > -999) {
        // 轻微避让，制造“让路”感
        const dx = this.x - mouse.x, dy = this.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 130 && d > 0.1) {
          this.vx += (dx / d) * 0.25;
          this.vy += (dy / d) * 0.25;
        }
      }

      // 冲击波推力
      for (const sh of shocks) {
        const dx = this.x - sh.x, dy = this.y - sh.y;
        const d = Math.hypot(dx, dy) || 1;
        const band = Math.abs(d - sh.r);
        if (band < 60) {
          const f = (1 - band / 60) * sh.power * 5;
          this.vx += (dx / d) * f;
          this.vy += (dy / d) * f;
        }
      }

      // 阻尼 + 限速
      this.vx *= 0.96;
      this.vy *= 0.96;
      const vmax = 4 + sp * 5;
      const v = Math.hypot(this.vx, this.vy);
      if (v > vmax) { this.vx = (this.vx / v) * vmax; this.vy = (this.vy / v) * vmax; }

      this.x += this.vx * dt * 0.9;
      this.y += this.vy * dt * 0.9;

      // 边界环绕
      if (this.x < -20) this.x = W + 20;
      if (this.x > W + 20) this.x = -20;
      if (this.y > H + 20) this.respawn(false);
      if (this.y < -20) this.y = H + 20;
    }
  }

  function syncCount() {
    while (particles.length < targetCount) particles.push(new Particle());
    if (particles.length > targetCount) particles.length = targetCount;
  }

  // === Rendering ===
  function render(t) {
    // 拖尾: 用带透明度的深色覆盖而非 clearRect
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(7, 8, 15, ${1 - moodState.trail * (0.4 + energy * 0.6)})`;
    ctx.fillRect(0, 0, W, H);

    // 粒子连线 (Focus 情绪下形成晶格)
    const linkAlpha = moodState.link * 0.28;
    if (linkAlpha > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.6;
      const maxD = 110;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxD * maxD) {
            const al = (1 - Math.sqrt(d2) / maxD) * linkAlpha;
            ctx.strokeStyle = `hsla(${lerp(moodState.hue, moodState.hue2, a.hueMix)}, 85%, 70%, ${al})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    // 粒子本体
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const hue = lerp(moodState.hue, moodState.hue2, p.hueMix);
      const size = p.r * moodState.size * (1 + energy * 0.4);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
      g.addColorStop(0, `hsla(${hue}, 90%, 78%, 0.95)`);
      g.addColorStop(0.4, `hsla(${hue}, 85%, 62%, 0.35)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 4, 0, TAU);
      ctx.fill();
    }

    // 冲击波环
    ctx.globalCompositeOperation = 'lighter';
    for (const sh of shocks) {
      const al = Math.max(0, 1 - sh.r / sh.max) * 0.5;
      ctx.strokeStyle = `hsla(${moodState.hue2}, 90%, 75%, ${al})`;
      ctx.lineWidth = 2.2 * (1 - sh.r / sh.max) + 0.4;
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, sh.r, 0, TAU);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  // === Mood Transition (情绪参数缓动逼近) ===
  function stepMood() {
    const target = stripPreset(currentPreset);
    const k = 0.035; // 缓慢呼吸式过渡
    for (const key in target) {
      moodState[key] = lerp(moodState[key], target[key], k);
    }
  }

  // === Input ===
  function bindEvents() {
    const pos = (e) => {
      const p = e.touches ? e.touches[0] : e;
      mouse.x = p.clientX; mouse.y = p.clientY;
    };

    addEventListener('pointermove', pos, { passive: true });
    addEventListener('pointerdown', (e) => {
      pos(e);
      mouse.down = true;
      halo.classList.add('is-pressing');
      spawnShock(mouse.x, mouse.y, 1.0);
    });
    addEventListener('pointerup', () => {
      mouse.down = false;
      halo.classList.remove('is-pressing');
    });
    addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= PRESETS.length) { setMood(PRESETS[n - 1]); return; }
      if (e.code === 'Space') { e.preventDefault(); spawnShock(W / 2, H / 2, 1.8); pulseFlash(); }
      if (e.key === 'r' || e.key === 'R') scatter();
    });

    btnPulse.addEventListener('click', () => { spawnShock(W / 2, H / 2, 1.8); pulseFlash(); });
    btnScatter.addEventListener('click', scatter);

    energySlider.addEventListener('input', () => {
      energy = parseFloat(energySlider.value);
      energyVal.textContent = energy.toFixed(2);
    });
    countSlider.addEventListener('input', () => {
      targetCount = parseInt(countSlider.value, 10);
      countVal.textContent = targetCount;
      roUnits.textContent = targetCount;
      syncCount();
    });

    addEventListener('resize', resize);
  }

  function spawnShock(x, y, power) {
    shocks.push({ x, y, r: 0, max: 320 * power, power, grow: 5 + 4 * power });
  }

  function scatter() {
    for (const p of particles) {
      const a = Math.random() * TAU;
      const f = 6 + Math.random() * 9;
      p.vx += Math.cos(a) * f;
      p.vy += Math.sin(a) * f;
    }
    pulseFlash();
  }

  function pulseFlash() {
    document.documentElement.animate(
      [{ filter: 'brightness(1)' }, { filter: 'brightness(1.35)' }, { filter: 'brightness(1)' }],
      { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }

  // === HUD: 情绪卡片 ===
  function buildRail() {
    for (const preset of PRESETS) {
      const card = document.createElement('button');
      card.className = 'mood-card' + (preset === currentPreset ? ' is-active' : '');
      card.style.setProperty('--mood-glow', preset.glow);
      card.style.setProperty('--mood-glow-soft', preset.glowSoft);
      card.innerHTML = `
        <span class="mc-glyph">${preset.glyph}</span>
        <span>
          <span class="mc-name">${preset.name}</span>
          <span class="mc-sub">${preset.sub}</span>
        </span>
        <span class="mc-key">${preset.keyNum}</span>`;
      card.addEventListener('click', () => setMood(preset));
      rail.appendChild(card);
      preset._card = card;
    }
  }

  function setMood(preset) {
    if (preset === currentPreset) return;
    currentPreset._card.classList.remove('is-active');
    currentPreset = preset;
    preset._card.classList.add('is-active');
    roMood.textContent = preset.key;
    // 切换情绪瞬间释放一个中心冲击波，强化“变阵”仪式感
    spawnShock(W / 2, H / 2, 1.2);
  }

  // === Resize / Loop ===
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsTimer = 0;

  function loop(now) {
    const dt = Math.min(2.5, (now - last) / 16.67);
    last = now;
    const t = now / 1000;

    stepMood();
    syncCount();
    for (const p of particles) p.step(t, dt);

    // 冲击波扩散
    for (let i = shocks.length - 1; i >= 0; i--) {
      const sh = shocks[i];
      sh.r += sh.grow * dt * 3;
      if (sh.r > sh.max) shocks.splice(i, 1);
    }

    // 光标环缓动跟随
    mouse.haloX = lerp(mouse.haloX, mouse.x < -999 ? mouse.haloX : mouse.x, 0.22);
    mouse.haloY = lerp(mouse.haloY, mouse.y < -999 ? mouse.haloY : mouse.y, 0.22);
    halo.style.transform = `translate3d(${mouse.haloX}px, ${mouse.haloY}px, 0)`;

    render(t);

    // FPS 读数 (每 0.5s 刷新)
    fpsAcc += 1000 / Math.max(1, now - (now - (dt * 16.67)));
    fpsN++;
    fpsTimer += dt * 16.67;
    if (fpsTimer > 500) {
      roFps.textContent = Math.round(fpsAcc / fpsN);
      fpsAcc = 0; fpsN = 0; fpsTimer = 0;
    }

    requestAnimationFrame(loop);
  }

  // === Boot ===
  resize();
  buildRail();
  bindEvents();
  syncCount();
  requestAnimationFrame(loop);
})();
