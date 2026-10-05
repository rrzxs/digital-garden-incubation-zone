/* ============================================================
   Vinyl Shelf Flow · 黑胶流动货架
   Vanilla JS · 免构建 · 弹簧-阻尼转动物理 + 粒子流场
   maintainer: EDEN
   ============================================================ */

(function () {
  'use strict';

  // === 唱片曲库 ===
  const RECORDS = [
    { title: 'Midnight Parallax', artist: 'Nocturne Waves', genre: 'Ambient', year: 1979, hue: 262, tags: ['Ambient', '33⅓', '1979'] },
    { title: 'Neon AsphAodelt', artist: 'Chrome Vale', genre: 'Synthwave', year: 1984, hue: 318, tags: ['Synth', '45 RPM', '1984'] },
    { title: 'Tidal Static', artist: 'Mercury Bloom', genre: 'Shoegaze', year: 1991, hue: 212, tags: ['Shoegaze', '33⅓', '1991'] },
    { title: 'Amber Circuitry', artist: 'Golden Fuse', genre: 'Electro', year: 1988, hue: 28, tags: ['Electro', '45 RPM', '1988'] },
    { title: 'Velvet Machine', artist: 'Iris Cascade', genre: 'Dream Pop', year: 1983, hue: 340, tags: ['Dream Pop', '33⅓', '1983'] },
    { title: 'Deep Field Drift', artist: 'Signal Garden', genre: 'Post-Rock', year: 1996, hue: 190, tags: ['Post-Rock', '33⅓', '1996'] },
    { title: 'Analog Ghosts', artist: 'Tape Memory', genre: 'Kosmische', year: 1976, hue: 158, tags: ['Krautrock', '33⅓', '1976'] },
    { title: 'Silver Halide', artist: 'Plate Negative', genre: 'Minimal', year: 2002, hue: 220, tags: ['Minimal', '45 RPM', '2002'] }
  ];

  // === DOM Elements ===
  const $ = (sel) => document.querySelector(sel);
  const shelfGrid = $('#shelf-grid');
  const turntable = $('#turntable');
  const vinyl = $('#vinyl');
  const vinylLabel = $('#vinyl-label');
  const labelTitle = $('#label-title');
  const labelArtist = $('#label-artist');
  const nsTitle = $('#ns-title');
  const nsArtist = $('#ns-artist');
  const nsTags = $('#ns-tags');
  const spinTime = $('#spin-time');
  const btnPlay = $('#btn-play');
  const playIcon = $('#play-icon');
  const playText = $('#play-text');
  const btnEject = $('#btn-eject');
  const btnSound = $('#btn-sound');
  const pitchSlider = $('#pitch');
  const pitchValue = $('#pitch-value');
  const flyingRecord = $('#flying-record');
  const frSleeve = flyingRecord.querySelector('.fr-sleeve');
  const canvas = $('#flow-canvas');
  const ctx = canvas.getContext('2d');
  const titleEl = $('#title-text');

  // === State ===
  const state = {
    current: -1,          // 当前唱片索引
    playing: false,
    rpm: 33.3,
    pitch: 0,             // -8 ~ +8 %
    angle: 0,             // 黑胶当前角度（deg）
    angularVel: 0,        // 当前角速度（deg/s）
    dragging: false,
    dragLastAngle: 0,
    dragLastTime: 0,
    elapsed: 0,           // 播放计时（秒）
    soundOn: false
  };

  // ============ 标题乱码揭示 ============
  const GLYPHS = '▚▞▮▯◍◌◎◇ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function scrambleReveal(el, text, duration = 1400) {
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      const solid = Math.floor(eased * text.length);
      let out = text.slice(0, solid);
      for (let i = solid; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = text;
    }
    requestAnimationFrame(frame);
  }

  // ============ 货架渲染 ============
  function renderShelf() {
    RECORDS.forEach((rec, i) => {
      const el = document.createElement('div');
      el.className = 'sleeve';
      el.style.background = `linear-gradient(140deg, hsl(${rec.hue}, 62%, 34%), hsl(${(rec.hue + 40) % 360}, 58%, 18%))`;
      el.innerHTML = `
        <div class="sleeve-art">
          <span class="sleeve-no">VS-${String(i + 1).padStart(2, '0')}</span>
          <span class="sleeve-name">${rec.title}<br/><span style="font-weight:400;opacity:.7;font-size:10px">${rec.artist}</span></span>
        </div>`;
      el.addEventListener('click', () => mountRecord(i, el));
      shelfGrid.appendChild(el);
    });
    $('#crate-count').textContent = `${RECORDS.length} LPs`;
  }

  // ============ 抽盘飞行动画 ============
  function flyToTurntable(fromEl, rec) {
    const from = fromEl.getBoundingClientRect();
    const to = vinyl.getBoundingClientRect();
    flyingRecord.style.setProperty('--fx', `${from.left + from.width / 2 - 60}px`);
    flyingRecord.style.setProperty('--fy', `${from.top + from.height / 2 - 60}px`);
    flyingRecord.style.setProperty('--mx', `${(from.left + to.left) / 2}px`);
    flyingRecord.style.setProperty('--my', `${Math.min(from.top, to.top) - 90}px`);
    flyingRecord.style.setProperty('--tx', `${to.left + to.width / 2 - 60}px`);
    flyingRecord.style.setProperty('--ty', `${to.top + to.height / 2 - 60}px`);
    frSleeve.style.background = `linear-gradient(140deg, hsl(${rec.hue}, 62%, 34%), hsl(${(rec.hue + 40) % 360}, 58%, 18%))`;
    flyingRecord.classList.remove('animate');
    void flyingRecord.offsetWidth; // 强制重排以重启动画
    flyingRecord.classList.add('animate');
  }

  // ============ 上盘 ============
  function mountRecord(i, sleeveEl) {
    const rec = RECORDS[i];
    // 货架状态
    shelfGrid.querySelectorAll('.sleeve').forEach((s) => s.classList.remove('active'));
    sleeveEl.classList.add('active');
    sleeveEl.classList.remove('peek');
    void sleeveEl.offsetWidth;
    sleeveEl.classList.add('peek');

    flyToTurntable(sleeveEl, rec);

    // 延迟与飞行动画同步：落盘瞬间填充信息
    setTimeout(() => {
      state.current = i;
      vinyl.classList.add('has-record');
      labelTitle.textContent = rec.title;
      labelArtist.textContent = `${rec.artist} · ${rec.year}`;
      nsTitle.textContent = rec.title;
      nsArtist.textContent = `${rec.artist} · ${rec.year} · ${rec.genre}`;
      nsTags.innerHTML = rec.tags.map((t) => `<span class="ns-tag">${t}</span>`).join('');
      scrambleReveal(nsTitle, rec.title, 900);
      state.elapsed = 0;
      setPlaying(true);
      spawnBurst();
    }, 780);
  }

  // ============ 播放控制 ============
  function setPlaying(on) {
    if (state.current < 0 && on) return;
    state.playing = on;
    turntable.classList.toggle('playing', on);
    playIcon.textContent = on ? '❚❚' : '▶';
    playText.textContent = on ? 'Pause' : 'Play';
  }

  btnPlay.addEventListener('click', () => setPlaying(!state.playing));
  btnEject.addEventListener('click', () => {
    setPlaying(false);
    state.current = -1;
    state.elapsed = 0;
    vinyl.classList.remove('has-record');
    turntable.classList.remove('playing');
    shelfGrid.querySelectorAll('.sleeve').forEach((s) => s.classList.remove('active'));
    labelTitle.textContent = '—';
    labelArtist.textContent = '选择一张唱片';
    nsTitle.textContent = '静默等待';
    nsArtist.textContent = '—';
    nsTags.innerHTML = '';
    spinTime.textContent = '00:00';
  });

  // === RPM / Pitch ===
  document.querySelectorAll('.rpm-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rpm-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.rpm = parseFloat(btn.dataset.rpm);
      spawnBurst();
    });
  });
  pitchSlider.addEventListener('input', () => {
    state.pitch = parseFloat(pitchSlider.value);
    pitchValue.textContent = `${state.pitch >= 0 ? '+' : ''}${state.pitch.toFixed(1)}%`;
  });

  // ============ 黑胶转动物理（弹簧-阻尼 + 刮擦惯性） ============
  function targetVelocity() {
    if (!state.playing || state.current < 0) return 0;
    return state.rpm * (1 + state.pitch / 100) * 360 / 60; // deg/s
  }

  function stepRotation(dt) {
    if (state.dragging) return;
    const target = targetVelocity();
    const k = state.playing ? 3.2 : 2.4;   // 弹簧刚度
    const damp = 4.2;                       // 阻尼
    // 松开刮擦后：惯性衰减 + 弹簧回归目标转速
    const accel = (target - state.angularVel) * k - state.angularVel * 0.4 * damp * 0;
    state.angularVel += (target - state.angularVel) * Math.min(1, k * dt);
    state.angularVel *= Math.exp(-damp * dt * (target === 0 ? 1 : 0.12));
    state.angle += state.angularVel * dt;
  }

  // === 刮擦交互 ===
  function pointerAngle(e) {
    const r = vinyl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
  }

  vinyl.addEventListener('pointerdown', (e) => {
    if (state.current < 0) return;
    vinyl.setPointerCapture(e.pointerId);
    state.dragging = true;
    vinyl.classList.add('dragging');
    state.dragLastAngle = pointerAngle(e);
    state.dragLastTime = performance.now();
    state.angularVel = 0;
  });
  vinyl.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const a = pointerAngle(e);
    const now = performance.now();
    let d = a - state.dragLastAngle;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    state.angle += d;
    state.dragLastAngle = a;
    const dt = Math.max(1, now - state.dragLastTime) / 1000;
    state.angularVel = d / dt; // 记录瞬时角速度用于惯性
    state.dragLastTime = now;
  });
  function endDrag() {
    if (!state.dragging) return;
    state.dragging = false;
    vinyl.classList.remove('dragging');
    state.angularVel = Math.max(-1200, Math.min(1200, state.angularVel));
  }
  vinyl.addEventListener('pointerup', endDrag);
  vinyl.addEventListener('pointercancel', endDrag);

  // ============ 计时器 ============
  function updateTimer(dt) {
    if (state.playing && state.current >= 0) {
      state.elapsed += dt * (1 + state.pitch / 100);
      const m = Math.floor(state.elapsed / 60);
      const s = Math.floor(state.elapsed % 60);
      spinTime.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  }

  // ============ 粒子流场 ============
  const particles = [];
  const bursts = [];
  const PALETTES = {
    dusk: [276, 318, 212], amber: [28, 8, 44],
    jade: [158, 190, 132], mono: [220, 260, 200]
  };
  function paletteHues() { return PALETTES[document.body.dataset.palette] || PALETTES.dusk; }
  function resizeCanvas() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function initParticles() {
    particles.length = 0;
    const n = Math.min(90, Math.floor(window.innerWidth / 14));
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: 0, vy: 0,
        size: 0.6 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        hueIdx: (Math.random() * 3) | 0
      });
    }
  }
  initParticles();

  function spawnBurst() {
    const r = vinyl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      bursts.push({ x: cx, y: cy, vx: Math.cos(a) * (60 + Math.random() * 140), vy: Math.sin(a) * (60 + Math.random() * 140), life: 1 });
    }
  }

  let flowTime = 0;
  function stepParticles(dt) {
    flowTime += dt * 0.22;
    const hues = paletteHues();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 环境流场粒子（Simplex 风格的正弦叠加流场）
    ctx.globalCompositeOperation = 'lighter';
    const energy = state.playing ? 1.6 : 0.7;
    for (const p of particles) {
      const nx = p.x * 0.0016, ny = p.y * 0.0016;
      const ang = Math.sin(nx + flowTime) * 2 + Math.cos(ny - flowTime * 1.3) * 2
        + Math.sin((nx + ny) * 0.8 + flowTime * 0.7) * 1.4;
      p.vx += Math.cos(ang) * 14 * energy * dt;
      p.vy += Math.sin(ang) * 14 * energy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      p.x += p.vx * dt * 22; p.y += p.vy * dt * 22;
      if (p.x < -20) p.x = window.innerWidth + 20;
      if (p.x > window.innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = window.innerHeight + 20;
      if (p.y > window.innerHeight + 20) p.y = -20;
      p.phase += dt * 2;
      const alpha = 0.14 + Math.sin(p.phase) * 0.08 + (state.playing ? 0.1 : 0);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (state.playing ? 1.5 : 1), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hues[p.hueIdx]}, 80%, 68%, ${Math.max(0, alpha)})`;
      ctx.fill();
    }

    // 冲击波粒子
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= 0.92; b.vy *= 0.92;
      b.life -= dt * 1.4;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.6 + b.life * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hues[0]}, 90%, 74%, ${b.life * 0.7})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ============ 黑胶爆点音效（Web Audio 合成底噪） ============
  let audioCtx = null, crackleGain = null, crackleNodes = [];
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // 白噪声缓冲
    const len = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // 连续嘶声
    const hiss = audioCtx.createBufferSource();
    hiss.buffer = buf; hiss.loop = true;
    const hissFilter = audioCtx.createBiquadFilter();
    hissFilter.type = 'bandpass'; hissFilter.frequency.value = 3200; hissFilter.Q.value = 0.6;
    crackleGain = audioCtx.createGain();
    crackleGain.gain.value = 0;
    hiss.connect(hissFilter).connect(crackleGain).connect(audioCtx.destination);
    hiss.start();
    crackleNodes.push(hiss);
  }
  function setSound(on) {
    initAudio();
    state.soundOn = on;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    crackleGain.gain.linearRampToValueAtTime(on ? 0.035 : 0, audioCtx.currentTime + 0.5);
    btnSound.textContent = on ? '🔊 Crackle' : '🔇 Crackle';
  }
  btnSound.addEventListener('click', () => setSound(!state.soundOn));

  // ============ 调色板 ============
  document.querySelectorAll('.swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      document.body.dataset.palette = sw.dataset.palette;
      spawnBurst();
    });
  });

  // ============ 主循环 ============
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    stepRotation(dt);
    vinyl.style.transform = `rotate(${state.angle}deg)`;
    updateTimer(dt);
    stepParticles(dt);
    requestAnimationFrame(loop);
  }

  // === 启动 ===
  renderShelf();
  scrambleReveal(titleEl, 'Vinyl Shelf Flow', 1600);
  requestAnimationFrame(loop);
})();
