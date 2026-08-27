/* ============================================================
   Floating Disc Player · 浮碟播放器
   生成式音源 + 碟片刮擦物理 + 弹簧归速 + 粒子流场
   ============================================================ */
(() => {
  'use strict';

  // === DOM Elements ===
  const discEl = document.getElementById('disc');
  const discAssembly = document.getElementById('disc-assembly');
  const discTilt = document.getElementById('disc-tilt');
  const discZone = document.getElementById('disc-zone');
  const tonearm = document.getElementById('tonearm');
  const labelTitle = document.getElementById('label-title');
  const labelArtist = document.getElementById('label-artist');
  const readoutRpm = document.getElementById('readout-rpm');
  const readoutState = document.getElementById('readout-state');
  const npTitle = document.getElementById('np-title');
  const npArtist = document.getElementById('np-artist');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  const npBar = document.getElementById('np-bar');
  const npBarFill = document.getElementById('np-bar-fill');
  const npBarKnob = document.getElementById('np-bar-knob');
  const btnPlay = document.getElementById('btn-play');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const volumeInput = document.getElementById('volume');
  const playlistEl = document.getElementById('playlist');
  const themesEl = document.getElementById('themes');
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  // === 音轨定义（生成式，无外部资源） ===
  const TRACKS = [
    { name: 'Aurora Drift', artist: 'EDEN · generative', dur: 48, root: 220, mode: [0, 3, 7, 10, 14], bpm: 72, timbre: 'pad' },
    { name: 'Dust & Vinyl', artist: 'EDEN · generative', dur: 42, root: 174.6, mode: [0, 2, 5, 7, 9], bpm: 84, timbre: 'pluck' },
    { name: 'Abyssal Signal', artist: 'EDEN · generative', dur: 55, root: 146.8, mode: [0, 3, 7, 10, 12], bpm: 60, timbre: 'pad' },
    { name: 'Bloom Sequence', artist: 'EDEN · generative', dur: 38, root: 261.6, mode: [0, 4, 7, 11, 14], bpm: 96, timbre: 'pluck' }
  ];

  // === 播放器状态 ===
  const player = {
    index: 0,
    playing: false,
    pos: 0,          // 秒
    volume: 0.6,
    dragging: false,
    scratchVel: 0,   // 刮擦导致的附加角速度
    audioStarted: false
  };

  // === 碟片物理 ===
  const disc = {
    angle: 0,
    vel: 0,               // 当前角速度 rad/s
    targetVel: 0,         // 目标角速度（播放时 33.3RPM ≈ 3.49 rad/s）
    dragging: false,
    lastPointerAngle: 0,
    lastMoveTime: 0
  };

  const BASE_RPM = (2 * Math.PI * 33.3) / 60; // 33.3 RPM → rad/s

  // === Web Audio 生成引擎 ===
  const audio = {
    ctx: null,
    master: null,
    timer: null,
    step: 0,

    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = player.volume;
      this.master.connect(this.ctx.destination);
    },

    note(freq, when, dur, type, gainVal) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(gainVal, when + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(filter); filter.connect(gain); gain.connect(this.master);
      osc.start(when); osc.stop(when + dur + 0.05);
    },

    schedule() {
      if (!this.ctx || !player.playing || player.dragging) return;
      const track = TRACKS[player.index];
      const beat = 60 / track.bpm;
      if (this.timer) clearTimeout(this.timer);
      const now = this.ctx.currentTime;
      if (now - (this.lastNoteAt || 0) >= beat * 0.48) {
        this.lastNoteAt = now;
        const deg = track.mode[this.step % track.mode.length];
        const octave = (this.step % 8 < 4) ? 1 : 2;
        const freq = track.root * Math.pow(2, deg / 12) * (track.timbre === 'pluck' ? octave : 1);
        if (track.timbre === 'pad') {
          this.note(freq, now, beat * 2.6, 'sine', 0.16);
          this.note(freq * 1.5, now + 0.03, beat * 2.2, 'sine', 0.07);
          this.note(freq / 2, now, beat * 3, 'triangle', 0.09);
        } else {
          this.note(freq, now, beat * 0.9, 'triangle', 0.2);
          if (this.step % 2 === 0) this.note(track.root / 2, now, beat * 0.6, 'sine', 0.16);
          if (this.step % 4 === 3) this.note(freq * 2, now + beat * 0.5, beat * 0.5, 'sine', 0.08);
        }
        this.step++;
      }
      this.timer = setTimeout(() => this.schedule(), beat * 250);
    },

    start() { this.ensure(); if (this.ctx.state === 'suspended') this.ctx.resume(); this.schedule(); },
    stop() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  };

  // === 工具 ===
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function pointerAngle(e) {
    const r = discZone.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx);
  }

  // === UI 同步 ===
  function renderMeta() {
    const t = TRACKS[player.index];
    labelTitle.textContent = t.name;
    labelArtist.textContent = t.artist;
    npTitle.textContent = t.name;
    npArtist.textContent = t.artist;
    timeTotal.textContent = fmt(t.dur);
    [...playlistEl.children].forEach((li, i) => {
      li.classList.toggle('active', i === player.index);
      li.classList.toggle('playing-track', i === player.index && player.playing);
    });
  }

  function renderTransport() {
    btnPlay.classList.toggle('playing', player.playing);
    tonearm.classList.toggle('engaged', player.playing);
    readoutState.textContent = player.dragging ? 'SCRATCH' : (player.playing ? 'SPINNING' : 'IDLE');
    [...playlistEl.children].forEach((li, i) =>
      li.classList.toggle('playing-track', i === player.index && player.playing));
  }

  function renderProgress() {
    const t = TRACKS[player.index];
    const p = clamp(player.pos / t.dur, 0, 1) * 100;
    npBarFill.style.width = p + '%';
    npBarKnob.style.left = p + '%';
    timeCurrent.textContent = fmt(player.pos);
  }

  // === 播放控制 ===
  function setTrack(i, autoplay = true) {
    player.index = (i + TRACKS.length) % TRACKS.length;
    player.pos = 0;
    audio.step = 0;
    if (autoplay && !player.playing) player.playing = true;
    renderMeta(); renderTransport(); renderProgress();
    if (player.playing) audio.start();
  }

  function togglePlay() {
    player.playing = !player.playing;
    if (player.playing) audio.start(); else audio.stop();
    renderTransport();
  }

  // === 刮擦交互（核心微交互） ===
  function onDiscDown(e) {
    player.dragging = true;
    disc.dragging = true;
    discAssembly.classList.add('scratching');
    disc.lastPointerAngle = pointerAngle(e);
    disc.lastMoveTime = performance.now();
    disc.scratchVel = 0;
    audio.stop();
    renderTransport();
    e.preventDefault();
  }

  function onDiscMove(e) {
    if (!disc.dragging) return;
    const a = pointerAngle(e);
    let d = a - disc.lastPointerAngle;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    const now = performance.now();
    const dt = Math.max(1, now - disc.lastMoveTime) / 1000;
    disc.angle += d;
    disc.scratchVel = d / dt;
    // 刮擦驱动进度（正转为快进、倒带回退）
    const t = TRACKS[player.index];
    player.pos = clamp(player.pos + (d / BASE_RPM) * 0.35, 0, t.dur - 0.01);
    disc.lastPointerAngle = a;
    disc.lastMoveTime = now;
    renderProgress();
    spawnBurst(6);
  }

  function onDiscUp() {
    if (!disc.dragging) return;
    disc.dragging = false;
    player.dragging = false;
    discAssembly.classList.remove('scratching');
    // 弹簧归速：残留刮擦速度自然衰减回目标转速
    disc.vel = disc.scratchVel;
    if (player.playing) audio.start();
    renderTransport();
  }

  discAssembly.addEventListener('pointerdown', onDiscDown);
  window.addEventListener('pointermove', onDiscMove);
  window.addEventListener('pointerup', onDiscUp);

  // === 碟片 3D 倾斜跟随 ===
  let tiltX = 0, tiltY = 0;
  window.addEventListener('pointermove', (e) => {
    const r = discZone.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    tiltY = clamp((e.clientX - cx) / (r.width * 1.4), -1, 1) * 9;
    tiltX = clamp((e.clientY - cy) / (r.height * 1.4), -1, 1) * -9;
  });

  // === 主循环（物理 + 进度 + 读数） ===
  let lastT = performance.now();
  function loop(now) {
    const dt = clamp((now - lastT) / 1000, 0, 0.05);
    lastT = now;

    // 目标速度：播放时 33⅓ RPM，停止时 0；拖拽时直接由指针驱动
    disc.targetVel = player.playing ? BASE_RPM : 0;
    if (!disc.dragging) {
      // 弹簧-阻尼归速
      const k = 5.5;
      disc.vel += (disc.targetVel - disc.vel) * k * dt;
      disc.angle += disc.vel * dt;
    }

    discEl.style.transform = `rotate(${disc.angle}rad)`;
    discTilt.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

    // 进度推进（拖拽时暂停）
    if (player.playing && !player.dragging) {
      player.pos += dt;
      const t = TRACKS[player.index];
      if (player.pos >= t.dur) setTrack(player.index + 1);
      renderProgress();
    }

    // RPM 读数（平滑）
    const rpm = (disc.dragging ? disc.scratchVel : disc.vel) * 60 / (2 * Math.PI);
    readoutRpm.textContent = (Math.abs(rpm) < 0.05 ? 0 : rpm).toFixed(1) + ' RPM';

    drawParticles(dt);
    requestAnimationFrame(loop);
  }

  // === 进度条点击寻迹 ===
  npBar.addEventListener('pointerdown', (e) => {
    const seek = (ev) => {
      const r = npBar.getBoundingClientRect();
      const p = clamp((ev.clientX - r.left) / r.width, 0, 1);
      player.pos = p * TRACKS[player.index].dur;
      renderProgress();
    };
    seek(e);
    const mv = (ev) => seek(ev);
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  });

  // === 音量 ===
  function applyVolume() {
    player.volume = volumeInput.value / 100;
    volumeInput.style.setProperty('--vol', volumeInput.value + '%');
    if (audio.master) audio.master.gain.setTargetAtTime(player.volume, audio.ctx.currentTime, 0.05);
  }
  volumeInput.addEventListener('input', applyVolume);
  applyVolume();

  // === 播放列表渲染 ===
  TRACKS.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'track';
    li.innerHTML = `
      <span class="track-idx">${String(i + 1).padStart(2, '0')}</span>
      <div><p class="track-name">${t.name}</p><p class="track-sub">${t.artist} · ${fmt(t.dur)}</p></div>
      <div class="track-eq"><span></span><span></span><span></span></div>`;
    li.addEventListener('click', () => setTrack(i));
    playlistEl.appendChild(li);
  });

  // === 主题切换 ===
  function setTheme(name) {
    document.body.dataset.theme = name;
    [...themesEl.children].forEach((b) => b.classList.toggle('active', b.dataset.theme === name));
  }
  themesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.th-btn');
    if (btn) setTheme(btn.dataset.theme);
  });

  // === 环境粒子流场 ===
  const particles = [];
  let W = 0, H = 0;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: 0, vy: 0, r: Math.random() * 1.8 + 0.6,
      hue: Math.random() * 3
    });
  }

  let mouse = { x: -999, y: -999 };
  window.addEventListener('pointermove', (e) => { mouse = { x: e.clientX, y: e.clientY }; });

  function themeColor(i) {
    const styles = getComputedStyle(document.body);
    return [styles.getPropertyValue('--c-1'), styles.getPropertyValue('--c-2'), styles.getPropertyValue('--c-3')][i % 3].trim();
  }

  function spawnBurst(n) {
    const r = discZone.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      if (particles.length > 130) break;
      particles.push({
        x: r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.8,
        y: r.top + r.height / 2 + (Math.random() - 0.5) * r.height * 0.8,
        vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
        r: Math.random() * 2 + 0.8, hue: Math.floor(Math.random() * 3), life: 1
      });
    }
  }

  function drawParticles(dt) {
    ctx.clearRect(0, 0, W, H);
    const c1 = themeColor(0), c2 = themeColor(1);
    for (const p of particles) {
      // Simplex-like 伪流场：正弦叠加
      const t = performance.now() / 4000;
      p.vx += Math.cos(p.y * 0.006 + t * 2 + p.hue) * 4 * dt;
      p.vy += Math.sin(p.x * 0.006 + t * 1.7) * 4 * dt;
      // 光标力场轻微吸引
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 16000) { p.vx += dx * 0.00004 * dt * 60; p.vy += dy * 0.00004 * dt * 60; }
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx * dt * 10; p.y += p.vy * dt * 10;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      if (p.life !== undefined) {
        p.life -= dt * 0.8;
        if (p.life <= 0) { particles.splice(particles.indexOf(p), 1); continue; }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 0 ? c1 : c2;
      ctx.globalAlpha = p.life !== undefined ? p.life * 0.9 : 0.35;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // === 事件绑定 ===
  btnPlay.addEventListener('click', togglePlay);
  btnPrev.addEventListener('click', () => setTrack(player.index - 1));
  btnNext.addEventListener('click', () => setTrack(player.index + 1));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight') setTrack(player.index + 1);
    if (e.code === 'ArrowLeft') setTrack(player.index - 1);
  });

  // === 启动 ===
  setTheme('aurora');
  setTrack(0, false);
  requestAnimationFrame(loop);
})();
