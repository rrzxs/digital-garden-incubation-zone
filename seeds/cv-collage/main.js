/**
 * CV Collage · 履历拼贴
 * 把一份履历拆成可拖拽、可抛掷、可拼贴的微晶玻璃碎片。
 * 弹簧-阻尼物理 + 粒子流场 + 乱码揭示 + 冲击波涟漪。
 */
(() => {
  'use strict';

  // === DOM Elements ===
  const body = document.body;
  const collage = document.getElementById('collage');
  const flowCanvas = document.getElementById('flow-canvas');
  const ctx = flowCanvas.getContext('2d');
  const shockLayer = document.getElementById('shock-layer');
  const metaDrag = document.getElementById('meta-drag');
  const metaClock = document.getElementById('meta-clock');
  const headline = document.querySelector('.headline');

  // === 履历碎片数据 ===
  const FRAGMENTS = [
    {
      id: 'identity', icon: '◉', title: '身份 · Identity', tag: 'WHO',
      w: 250, home: [0.04, 0.05],
      html: `
        <div class="frag-body">
          <strong>Alex Chen</strong> · 创意工程师<br />
          在 <strong>代码 × 设计 × 叙事</strong> 的交叉地带工作。<br />
          相信每一份履历都不该是一张 A4 纸，而是一座可漫步的花园。
        </div>`
    },
    {
      id: 'belief', icon: '✦', title: '信条 · Belief', tag: 'WHY',
      w: 235, home: [0.72, 0.06],
      html: `
        <ul class="frag-list">
          <li>微交互是产品的呼吸</li>
          <li>缓动曲线即性格</li>
          <li>留白是最响亮的设计</li>
        </ul>`
    },
    {
      id: 'experience', icon: '◷', title: '履历 · Experience', tag: 'TIMELINE',
      w: 290, home: [0.06, 0.46],
      html: `
        <div class="tl">
          <div class="tl-item"><span class="tl-year">2023–</span>
            <div><div class="tl-role">Senior Creative Dev</div><div class="tl-org">Nova Interaction Lab</div></div></div>
          <div class="tl-item"><span class="tl-year">2020–23</span>
            <div><div class="tl-role">Frontend Engineer</div><div class="tl-org">Lumen Studio</div></div></div>
          <div class="tl-item"><span class="tl-year">2018–20</span>
            <div><div class="tl-role">Design Technologist</div><div class="tl-org">Freelance</div></div></div>
        </div>`
    },
    {
      id: 'skills', icon: '༓', title: '技能 · Skills', tag: 'STACK',
      w: 255, home: [0.38, 0.14],
      skills: [
        ['Interaction Design', 0.92], ['Canvas / WebGL', 0.85],
        ['Motion Systems', 0.88], ['Design Tokens', 0.74]
      ],
      html: ''
    },
    {
      id: 'projects', icon: '◧', title: '作品 · Selected', tag: 'MAKES',
      w: 265, home: [0.40, 0.56],
      html: `
        <ul class="frag-list">
          <li><strong>Fluid Garden</strong> — 数字花园引擎</li>
          <li><strong>Glass OS</strong> — 玻璃态设计语言</li>
          <li><strong>Typo Field</strong> — 字形力场装置</li>
        </ul>`
    },
    {
      id: 'education', icon: '⌂', title: '教育 · Education', tag: 'ROOT',
      w: 230, home: [0.74, 0.5],
      html: `
        <div class="tl">
          <div class="tl-item"><span class="tl-year">2016</span>
            <div><div class="tl-role">B.A. Digital Media</div><div class="tl-org">美术学院 · 交互方向</div></div></div>
          <div class="tl-item"><span class="tl-year">2014</span>
            <div><div class="tl-role">交换 · Generative Art</div><div class="tl-org">某北欧艺术学院</div></div></div>
        </div>`
    },
    {
      id: 'contact', icon: '✉', title: '联络 · Contact', tag: 'PING',
      w: 240, home: [0.74, 0.86],
      html: `
        <div class="frag-contact">
          <span>邮箱 <b>alex@collage.garden</b></span>
          <span>站点 <b>collage.garden</b></span>
          <span>坐标 <b>上海 · 远程友好</b></span>
        </div>`
    }
  ];

  // === 全局状态 ===
  const state = {
    dragCount: 0,
    fields: { flow: true, tilt: true, trace: true },
    moods: ['aurora', 'ink', 'ember', 'tide'],
    pointer: { x: -999, y: -999 }
  };

  const ease = { outExo: 'cubic-bezier(0.16, 1, 0.3, 1)' };
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ============================================================
  // 碎片构建：生成 DOM 与技能条
  // ============================================================
  function buildFragments() {
    FRAGMENTS.forEach((f, i) => {
      const el = document.createElement('article');
      el.className = 'fragment entrance';
      el.dataset.id = f.id;
      el.style.setProperty('--w', f.w + 'px');
      el.style.setProperty('--d', (0.12 + i * 0.09) + 's');
      el.style.zIndex = 10 + i;

      let inner = `
        <div class="frag-head">
          <span class="frag-icon">${f.icon}</span>
          <span class="frag-title">${f.title}</span>
          <span class="frag-tag mono">${f.tag}</span>
        </div>`;
      if (f.skills) {
        inner += `<div class="frag-body">` + f.skills.map(([name, lv]) => `
          <div class="skill">
            <div class="skill-top"><span>${name}</span><span class="mono">${Math.round(lv * 100)}%</span></div>
            <div class="skill-bar"><div class="skill-fill" style="--lv:${lv}"></div></div>
          </div>`).join('') + `</div>`;
      } else {
        inner += f.html;
      }
      el.innerHTML = inner;

      // 物理状态：位置/速度/旋转
      el._phys = {
        x: 0, y: 0, vx: 0, vy: 0,
        rot: rand(-4, 4), vrot: 0,
        homeRot: 0,
        dragging: false,
        grabDX: 0, grabDY: 0
      };
      collage.appendChild(el);
      f.el = el;
    });
  }

  // 初始布局：home 位置 + 少量随机偏移，呈现「拼贴感」
  function layoutHome(animate) {
    const rect = collage.getBoundingClientRect();
    FRAGMENTS.forEach((f) => {
      const p = f.el._phys;
      const tx = f.home[0] * (rect.width - f.w - 20) + rand(-12, 12);
      const ty = f.home[1] * (rect.height - f.el.offsetHeight - 16) + rand(-10, 10);
      if (animate) {
        p.vx = rand(-6, 6);
        p.vy = rand(-5, 5);
        p.txTarget = tx; p.tyTarget = ty;
        // 弹簧飞向目标
        springTo(p, tx, ty);
      } else {
        p.x = tx; p.y = ty; p.vx = 0; p.vy = 0;
        applyTransform(f.el, p);
      }
    });
  }

  function springTo(p, tx, ty) {
    p.springTarget = { x: tx, y: ty, until: performance.now() + 1400 };
  }

  // ============================================================
  // 物理循环：弹簧-阻尼 + 边界碰撞 + 速度姿态
  // ============================================================
  const SPRING = 0.055;
  const DAMP = 0.90;
  const BOUNCE = 0.55;

  function applyTransform(el, p) {
    const tilt = state.fields.tilt && !p.dragging ? tiltToward(el, p) : 0;
    el.style.transform =
      `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot}deg) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`;
  }

  function tiltToward(el, p) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clamp((state.pointer.x - cx) / 380, -1, 1);
    const dy = clamp((state.pointer.y - cy) / 380, -1, 1);
    return { rx: -dy * 5, ry: dx * 5 };
  }

  function physicsStep() {
    const rect = collage.getBoundingClientRect();

    FRAGMENTS.forEach((f) => {
      const el = f.el;
      const p = el._phys;
      const w = el.offsetWidth;
      const h = el.offsetHeight;

      if (!p.dragging) {
        // 弹簧归位（洗牌/复位时）
        if (p.springTarget && performance.now() < p.springTarget.until) {
          p.vx += (p.springTarget.x - p.x) * SPRING * 1.4;
          p.vy += (p.springTarget.y - p.y) * SPRING * 1.4;
        } else { p.springTarget = null; }

        // 漂浮微引力（向 home 轻微回正，防止漂走）
        p.vx += (p.txHome - p.x) * 0.0006;
        p.vy += (p.tyHome - p.y) * 0.0006;

        p.vx *= DAMP; p.vy *= DAMP;
        p.x += p.vx; p.y += p.vy;

        // 边界弹性碰撞
        if (p.x < -20) { p.x = -20; p.vx = Math.abs(p.vx) * BOUNCE; }
        if (p.y < -10) { p.y = -10; p.vy = Math.abs(p.vy) * BOUNCE; }
        if (p.x > rect.width - w + 20) { p.x = rect.width - w + 20; p.vx = -Math.abs(p.vx) * BOUNCE; }
        if (p.y > rect.height - h + 16) { p.y = rect.height - h + 16; p.vy = -Math.abs(p.vy) * BOUNCE; }

        // 速度姿态：抛掷旋转
        p.vrot = p.vx * 0.06;
        p.rot += p.vrot;
        p.rot += (p.baseRot - p.rot) * 0.04; // 回正
        applyTransform(el, p);
      }
    });
    requestAnimationFrame(physicsStep);
  }

  // ============================================================
  // 拖拽交互：抓取、抛掷、轨迹、置顶
  // ============================================================
  let topZ = 30;

  function bindDrag() {
    let active = null;

    collage.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.fragment');
      if (!el) return;
      const p = el._phys;
      active = { el, p };
      p.dragging = true;
      p.springTarget = null;
      p.grabDX = e.clientX - p.x;
      p.grabDY = e.clientY - p.y;
      el.classList.add('dragging');
      el.style.zIndex = ++topZ;
      collage.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    collage.addEventListener('pointermove', (e) => {
      state.pointer.x = e.clientX;
      state.pointer.y = e.clientY;
      if (!active) return;
      const { el, p } = active;
      const nx = e.clientX - p.grabDX;
      const ny = e.clientY - p.grabDY;
      p.vx = nx - p.x;
      p.vy = ny - p.y;
      p.x = nx; p.y = ny;
      if (state.fields.trace) drawTrace(p.x + el.offsetWidth / 2, p.y + 10, p.vx, p.vy);
      applyTransform(el, p);
    });

    const release = () => {
      if (!active) return;
      active.p.dragging = false;
      active.el.classList.remove('dragging');
      active = null;
      state.dragCount++;
      metaDrag.textContent = 'DRAG ×' + state.dragCount;
    };
    collage.addEventListener('pointerup', release);
    collage.addEventListener('pointercancel', release);

    // 双击置顶 + 点亮技能
    collage.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.fragment');
      if (!el) return;
      el.style.zIndex = ++topZ;
      el.classList.toggle('lit');
      spawnShock(
        el.getBoundingClientRect().left + el.offsetWidth / 2,
        el.getBoundingClientRect().top + el.offsetHeight / 2
      );
    });
  }

  // 拖拽轨迹光痕
  function drawTrace(x, y, vx, vy) {
    const speed = Math.hypot(vx, vy);
    if (speed < 4) return;
    const seg = document.createElement('div');
    seg.className = 'trace-seg';
    const len = clamp(speed * 3.2, 14, 130);
    seg.style.cssText =
      `left:${x - len / 2}px;top:${y}px;width:${len}px;height:2px;` +
      `transform:rotate(${Math.atan2(vy, vx)}rad);`;
    shockLayer.appendChild(seg);
    setTimeout(() => seg.remove(), 720);
  }

  // ============================================================
  // 冲击波：涟漪 + 推开碎片
  // ============================================================
  function spawnShock(px, py) {
    const ring = document.createElement('div');
    ring.className = 'shockwave';
    ring.style.left = px + 'px';
    ring.style.top = py + 'px';
    shockLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 950);

    // 物理推开
    const rect = collage.getBoundingClientRect();
    const cx = px - rect.left;
    const cy = py - rect.top;
    FRAGMENTS.forEach((f) => {
      const el = f.el;
      const p = el._phys;
      const fx = p.x + el.offsetWidth / 2 - cx;
      const fy = p.y + el.offsetHeight / 2 - cy;
      const dist = Math.hypot(fx, fy) || 1;
      const force = clamp(420 / dist, 0, 14);
      p.vx += (fx / dist) * force;
      p.vy += (fy / dist) * force;
    });
    burstParticles(px - rect.left, py - rect.top);
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.fragment') || e.target.closest('.console')) return;
    spawnShock(e.clientX, e.clientY);
  });

  // ============================================================
  // 粒子流场（Canvas）+ 冲击波迸射
  // ============================================================
  const particles = [];

  function resizeCanvas() {
    flowCanvas.width = window.innerWidth;
    flowCanvas.height = window.innerHeight;
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * flowCanvas.width,
        y: Math.random() * flowCanvas.height,
        vx: 0, vy: 0,
        size: rand(0.6, 2.2),
        life: 1,
        burst: false
      });
    }
  }

  function burstParticles(x, y) {
    for (let i = 0; i < 22; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2, 7);
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rand(1, 2.6), life: 1, burst: true
      });
    }
  }

  // 廉价流场：三角函数叠层代替 simplex
  function flowAngle(x, y, t) {
    return (
      Math.sin(x * 0.0016 + t * 0.0004) * 1.6 +
      Math.cos(y * 0.0021 - t * 0.0003) * 1.6 +
      Math.sin((x + y) * 0.0009 + t * 0.0002)
    );
  }

  function accentColor() {
    return getComputedStyle(body).getPropertyValue('--accent').trim() || '#6ee7b7';
  }

  let lastT = performance.now();
  function drawParticles(now) {
    const dt = clamp((now - lastT) / 16.7, 0.5, 2.5);
    lastT = now;
    ctx.clearRect(0, 0, flowCanvas.width, flowCanvas.height);
    const color = accentColor();

    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      if (pt.burst) {
        pt.x += pt.vx * dt; pt.y += pt.vy * dt;
        pt.vx *= 0.95; pt.vy *= 0.95;
        pt.life -= 0.02 * dt;
        if (pt.life <= 0) { particles.splice(i, 1); continue; }
      } else if (state.fields.flow) {
        const a = flowAngle(pt.x, pt.y, now);
        pt.vx += Math.cos(a) * 0.03 * dt;
        pt.vy += Math.sin(a) * 0.03 * dt;

        // 光标轻微扰動
        const dx = pt.x - state.pointer.x;
        const dy = pt.y - state.pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 140 && d > 0.1) {
          pt.vx += (dx / d) * 0.12;
          pt.vy += (dy / d) * 0.12;
        }
        pt.vx = clamp(pt.vx, -1.4, 1.4);
        pt.vy = clamp(pt.vy, -1.4, 1.4);
        pt.x += pt.vx * dt; pt.y += pt.vy * dt;
        if (pt.x < -10) pt.x = flowCanvas.width + 10;
        if (pt.x > flowCanvas.width + 10) pt.x = -10;
        if (pt.y < -10) pt.y = flowCanvas.height + 10;
        if (pt.y > flowCanvas.height + 10) pt.y = -10;
      } else { continue; }

      ctx.globalAlpha = pt.burst ? pt.life * 0.9 : 0.45;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }

  // ============================================================
  // 乱码揭示标题
  // ============================================================
  const GLYPHS = '◧◨ schema ▪▫ memex ▙ ▚ flux ◈#%&@01';

  function scrambleTitle(el, finalText) {
    const chars = finalText.split('');
    el.innerHTML = chars.map((c, i) =>
      `<span class="char" data-final="${c}" data-delay="${i * 70}">${c}</span>`
    ).join('');
    el.querySelectorAll('.char').forEach((span) => {
      const delay = +span.dataset.delay;
      const final = span.dataset.final;
      const start = performance.now() + delay;
      (function tick(now) {
        if (now < start) { requestAnimationFrame(tick); return; }
        const t = (now - start) / 420;
        if (t >= 1) { span.textContent = final; return; }
        if (Math.random() < 0.7) {
          span.textContent = final === ' ' ? ' ' :
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        requestAnimationFrame(tick);
      })(performance.now());
    });
  }

  // ============================================================
  // 控制台：氛围 / 场域开关 / 动作
  // ============================================================
  function bindConsole() {
    document.querySelectorAll('.mood-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        body.dataset.mood = btn.dataset.mood;
      });
    });

    document.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.classList.add('active');
      btn.addEventListener('click', () => {
        const key = btn.dataset.field;
        state.fields[key] = !state.fields[key];
        btn.classList.toggle('active', state.fields[key]);
      });
    });

    document.getElementById('btn-shuffle').addEventListener('click', () => {
      const rect = collage.getBoundingClientRect();
      FRAGMENTS.forEach((f) => {
        const p = f.el._phys;
        p.baseRot = rand(-9, 9);
        springTo(p,
          rand(10, Math.max(20, rect.width - f.w - 30)),
          rand(10, Math.max(20, rect.height - f.el.offsetHeight - 26))
        );
      });
    });

    document.getElementById('btn-scatter').addEventListener('click', () => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      FRAGMENTS.forEach((f, i) => {
        const p = f.el._phys;
        const a = (i / FRAGMENTS.length) * Math.PI * 2;
        p.vx += Math.cos(a) * rand(16, 26);
        p.vy += Math.sin(a) * rand(14, 24);
      });
      spawnShock(cx, cy);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      FRAGMENTS.forEach((f) => { f.el._phys.baseRot = 0; });
      layoutHome(true);
      scrambleTitle(headline, headline.dataset.scramble || '履历拼贴');
    });
  }

  // ============================================================
  // 时钟
  // ============================================================
  function tickClock() {
    const d = new Date();
    metaClock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, '0')).join(':');
  }

  // ============================================================
  // 初始化
  // ============================================================
  function init() {
    buildFragments();
    // 等一帧让尺寸就绪后布局
    requestAnimationFrame(() => {
      FRAGMENTS.forEach((f) => {
        f.el._phys.baseRot = f.el._phys.rot;
      });
      layoutHome(false);
      FRAGMENTS.forEach((f) => {
        f.el._phys.txHome = f.el._phys.x;
        f.el._phys.tyHome = f.el._phys.y;
      });
    });

    setTimeout(() => FRAGMENTS.forEach((f) => f.el.classList.add('lit')), 900);

    bindDrag();
    bindConsole();
    scrambleTitle(headline, '履历拼贴');
    headline.dataset.scramble = '履历拼贴';

    resizeCanvas();
    initParticles();
    window.addEventListener('resize', () => { resizeCanvas(); layoutHome(false); });

    requestAnimationFrame(physicsStep);
    requestAnimationFrame(drawParticles);
    tickClock();
    setInterval(tickClock, 1000);

    document.querySelector('.mood-btn[data-mood="aurora"]').classList.add('active');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
