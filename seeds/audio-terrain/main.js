/* ============================================================
   Audio Terrain · 声波地形
   声音化为大地 —— Web Audio 频谱驱动 Simplex 噪声地形实时隆起
   ============================================================ */

(function audioTerrainApp() {
  'use strict';

  // === Config & State ===

  const GRID_W = 46;
  const GRID_H = 34;
  const TERRAIN_SCALE = 0.16;
  const PARTICLE_COUNT = 90;

  const state = {
    theme: 'abyss',
    source: 'synth',        // synth | mic | silent
    preset: 'drift',        // drift | pulse | storm | chorus
    mode: 'explore',        // explore | sculpt
    time: 0,
    mouse: { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false },
    rms: 0,
    peak: 0,
    bands: [0, 0, 0, 0],    // sub / bass / mid / high
    shocks: [],             // click shockwaves { x, y, t }
    sculptStamp: [],        // persistent sculpt bumps { gx, gy, power }
    running: true
  };

  // Theme palettes for canvas (mirrors CSS variables)
  const THEMES = {
    abyss:   { low: [30, 58, 138],   mid: [61, 111, 214],  high: [159, 208, 255], peak: [255, 255, 255] },
    aurora:  { low: [6, 95, 70],     mid: [16, 163, 127],  high: [125, 255, 207], peak: [255, 255, 255] },
    ember:   { low: [124, 45, 18],   mid: [224, 94, 36],   high: [255, 201, 138], peak: [255, 246, 232] },
    verdant: { low: [63, 98, 18],    mid: [132, 204, 22],  high: [217, 249, 157], peak: [255, 255, 255] }
  };

  // === DOM Elements ===

  const terrainCanvas = document.getElementById('terrain-canvas');
  const particleCanvas = document.getElementById('particle-canvas');
  const tctx = terrainCanvas.getContext('2d');
  const pctx = particleCanvas.getContext('2d');
  const cursorGlow = document.getElementById('cursor-glow');
  const hudSource = document.getElementById('hudSource');
  const rmsMeter = document.getElementById('rmsMeter');
  const peakMeter = document.getElementById('peakMeter');
  const rmsValue = document.getElementById('rmsValue');
  const peakValue = document.getElementById('peakValue');
  const modeHint = document.getElementById('modeHint');
  const bandBars = Array.from(document.querySelectorAll('.band-bar'));

  // === Simplex Noise (2D, compact) ===

  const Noise2D = (function createNoise() {
    const grad = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
    const p = new Uint8Array(256);
    let seed = 1337;
    for (let i = 0; i < 256; i++) {
      seed = (seed * 16807) % 2147483647;
      p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    function noise(xin, yin) {
      let n0 = 0, n1 = 0, n2 = 0;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t);
      const y0 = yin - (j - t);
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      const ii = i & 255;
      const jj = j & 255;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) {
        const g = grad[perm[ii + perm[jj]] & 7];
        t0 *= t0;
        n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) {
        const g = grad[perm[ii + i1 + perm[jj + j1]] & 7];
        t1 *= t1;
        n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) {
        const g = grad[perm[ii + 1 + perm[jj + 1]] & 7];
        t2 *= t2;
        n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
      }
      return 70 * (n0 + n1 + n2);
    }
    return { noise };
  })();

  function fbm(x, y) {
    return (
      Noise2D.noise(x, y) * 0.55 +
      Noise2D.noise(x * 2.1, y * 2.1) * 0.28 +
      Noise2D.noise(x * 4.3, y * 4.3) * 0.17
    );
  }

  // === Audio Engine ===

  const AudioEngine = {
    ctx: null,
    analyser: null,
    freqData: null,
    timeData: null,
    micStream: null,
    nodes: [],

    ensureContext() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.72;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeData = new Uint8Array(this.analyser.fftSize);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    stopAll() {
      this.nodes.forEach((node) => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (err) { /* already stopped */ }
      });
      this.nodes = [];
      if (this.micStream) {
        this.micStream.getTracks().forEach((track) => track.stop());
        this.micStream = null;
      }
    },

    buildSynth(preset) {
      this.ensureContext();
      this.stopAll();
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.nodes.push(master);

      const fadeTo = { drift: 0.32, pulse: 0.34, storm: 0.36, chorus: 0.3 }[preset] || 0.3;
      master.gain.linearRampToValueAtTime(fadeTo, now + 2.2);

      const PRESETS = {
        drift: { oscs: [[55, 'sine', 0.5], [82.4, 'sine', 0.32], [110.2, 'triangle', 0.18]], lfoRate: 0.06, lfoDepth: 4, noiseGain: 0.015, noiseFreq: 320 },
        pulse: { oscs: [[49, 'sine', 0.55], [98.3, 'triangle', 0.2]], lfoRate: 0.9, lfoDepth: 10, pulseBeat: true, noiseGain: 0.02, noiseFreq: 220 },
        storm: { oscs: [[41.2, 'sawtooth', 0.22], [61.7, 'sine', 0.4]], lfoRate: 0.22, lfoDepth: 16, noiseGain: 0.085, noiseFreq: 900, rumble: true },
        chorus: { oscs: [[130.8, 'sine', 0.22], [196, 'sine', 0.2], [261.6, 'triangle', 0.16], [329.6, 'sine', 0.12]], lfoRate: 0.14, lfoDepth: 2.5, noiseGain: 0.008, noiseFreq: 1600 }
      };
      const cfg = PRESETS[preset] || PRESETS.drift;

      // Drone oscillators
      cfg.oscs.forEach(([freq, type, gain]) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = gain;
        // Slow detune chorus
        const detuneLfo = ctx.createOscillator();
        detuneLfo.frequency.value = 0.08 + Math.random() * 0.22;
        const detuneDepth = ctx.createGain();
        detuneDepth.gain.value = 3.5;
        detuneLfo.connect(detuneDepth).connect(osc.detune);
        osc.connect(g).connect(master);
        osc.start();
        detuneLfo.start();
        this.nodes.push(osc, detuneLfo, g, detuneDepth);
      });

      // Main LFO breathing the terrain
      const lfo = ctx.createOscillator();
      lfo.frequency.value = cfg.lfoRate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = cfg.lfoDepth;
      lfo.connect(lfoGain);
      this.nodes.push(lfo, lfoGain);
      const primary = this.nodes.find((n) => n.frequency && n.type === 'sine');
      if (primary) lfoGain.connect(primary.frequency);

      // Filtered noise wash
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const chan = noiseBuffer.getChannelData(0);
      for (let i = 0; i < chan.length; i++) chan[i] = Math.random() * 2 - 1;
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = cfg.noiseFreq;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = cfg.noiseGain;
      noiseSrc.connect(noiseFilter).connect(noiseGain).connect(master);
      noiseSrc.start();
      this.nodes.push(noiseSrc, noiseFilter, noiseGain);
    },

    async enableMic() {
      this.ensureContext();
      this.stopAll();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
        this.micStream = stream;
        const micNode = this.ctx.createMediaStreamSource(stream);
        // Muted monitor path: analysis only, no feedback loop
        const silentGain = this.ctx.createGain();
        silentGain.gain.value = 0;
        micNode.connect(this.analyser);
        this.analyser.disconnect();
        this.analyser.connect(silentGain);
        this.nodes.push(micNode, silentGain);
        return true;
      } catch (err) {
        return false;
      }
    },

    goSilent() {
      this.stopAll();
      if (this.analyser && this.analyser.disconnect) this.analyser.disconnect();
    },

    sample() {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(this.freqData);
      this.analyser.getByteTimeDomainData(this.timeData);
      const bins = this.freqData.length;

      // RMS from waveform
      let sum = 0;
      for (let i = 0; i < this.timeData.length; i++) {
        const v = (this.timeData[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.timeData.length);

      // Four log-ish bands
      const edges = [0, Math.floor(bins * 0.06), Math.floor(bins * 0.2), Math.floor(bins * 0.5), bins];
      const bands = [0, 0, 0, 0];
      for (let b = 0; b < 4; b++) {
        let acc = 0;
        const from = edges[b];
        const to = edges[b + 1];
        for (let i = from; i < to; i++) acc += this.freqData[i];
        bands[b] = acc / Math.max(1, to - from) / 255;
      }

      state.rms = state.rms * 0.6 + rms * 0.4;
      state.peak = Math.max(state.peak * 0.94, rms);
      for (let b = 0; b < 4; b++) {
        state.bands[b] = state.bands[b] * 0.7 + bands[b] * 0.3;
      }
    }
  };

  // === Isometric Terrain Renderer ===

  let dpr = 1;
  let viewW = 0;
  let viewH = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    [terrainCanvas, particleCanvas].forEach((canvas) => {
      canvas.width = viewW * dpr;
      canvas.height = viewH * dpr;
      canvas.style.width = viewW + 'px';
      canvas.style.height = viewH + 'px';
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  // Project grid (gx, gy, h) into isometric screen space
  function project(gx, gy, h) {
    const span = Math.min(viewW * 0.86, viewH * 1.7);
    const cellW = span / (GRID_W + GRID_H * 0.5);
    const cx = viewW / 2;
    const cy = viewH * 0.52;
    const isoX = (gx - GRID_W / 2) * cellW + (gy - GRID_H / 2) * cellW * 0.5;
    const isoY = (gy - GRID_H / 2) * cellW * 0.42 - h * cellW * 1.6;
    return { x: cx + isoX, y: cy + isoY };
  }

  function screenToGrid(sx, sy) {
    const span = Math.min(viewW * 0.86, viewH * 1.7);
    const cellW = span / (GRID_W + GRID_H * 0.5);
    const cx = viewW / 2;
    const cy = viewH * 0.52;
    const dx = sx - cx;
    const dy = sy - cy;
    // Invert iso mapping ignoring height (approximate)
    const a = cellW;
    const b = cellW * 0.5;
    const c = 0;
    const d = cellW * 0.42;
    const det = a * d - b * c;
    const ux = (dx * d - dy * b) / det;
    const uy = (dy * a - dx * c) / det;
    return { gx: ux + GRID_W / 2, gy: uy + GRID_H / 2 };
  }

  function bandWeight(gx, gy) {
    // Different frequency bands own different regions of the land
    const nx = gx / GRID_W;
    const ny = gy / GRID_H;
    const centerDist = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2) * 0.8);
    const sub = Math.max(0, 1 - centerDist * 2.4);        // core rises with sub bass
    const bass = Math.max(0, 1 - Math.abs(centerDist - 0.38) * 4);
    const mid = 0.5 + 0.5 * Noise2D.noise(gx * 0.22 + 40, gy * 0.22 - 17);
    const high = Math.max(0, (centerDist - 0.3) * 1.6) * (0.4 + 0.6 * Math.abs(Noise2D.noise(gx * 0.5 - 9, gy * 0.5 + 31)));
    return [sub, bass, mid * 0.55, Math.min(1, high)];
  }

  function terrainHeight(gx, gy, time) {
    const base = fbm(gx * TERRAIN_SCALE + time * 0.18, gy * TERRAIN_SCALE - time * 0.11);
    const weights = bandWeight(gx, gy);
    let audioLift = 0;
    for (let b = 0; b < 4; b++) {
      const bandField = Noise2D.noise(gx * 0.11 + b * 100 + time * 0.35, gy * 0.11 - b * 60);
      audioLift += weights[b] * state.bands[b] * (1.1 + bandField * 0.7) * [2.6, 2.2, 1.7, 1.3][b];
    }
    const rmsLift = state.rms * 1.4;

    // Mouse force field (explore: disturb | sculpt: carve)
    let mouseEffect = 0;
    if (state.mouse.active) {
      const p = project(gx, gy, 0);
      const dist = Math.hypot(p.x - state.mouse.x, p.y - state.mouse.y);
      const radius = state.mode === 'sculpt' ? 200 : 160;
      if (dist < radius) {
        const falloff = Math.pow(1 - dist / radius, 2);
        mouseEffect = state.mode === 'sculpt' ? falloff * 2.4 : falloff * (fbm(gx * 0.4 + time, gy * 0.4) * 0.9);
      }
    }

    // Click shockwaves: expanding rings ripple the land
    let shockEffect = 0;
    for (let i = 0; i < state.shocks.length; i++) {
      const shock = state.shocks[i];
      const p = project(gx, gy, 0);
      const dist = Math.hypot(p.x - shock.x, p.y - shock.y);
      const waveR = shock.t * 560;
      const bandW = 90;
      if (Math.abs(dist - waveR) < bandW) {
        const energy = Math.max(0, 1 - shock.t / 1.4);
        shockEffect += Math.cos((dist - waveR) / bandW * Math.PI) * energy * 1.8;
      }
    }

    // Persistent sculpt stamps slowly decay
    let stampEffect = 0;
    for (let i = 0; i < state.sculptStamp.length; i++) {
      const stamp = state.sculptStamp[i];
      const dgx = gx - stamp.gx;
      const dgy = gy - stamp.gy;
      const d = Math.sqrt(dgx * dgx + dgy * dgy);
      if (d < 7) {
        stampEffect += Math.pow(1 - d / 7, 2) * stamp.power;
      }
    }

    return Math.max(-0.4, base * 0.5 + 0.28 + audioLift + rmsLift + mouseEffect + shockEffect + stampEffect);
  }

  function lerpColor(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }

  function heightColor(h) {
    const palette = THEMES[state.theme];
    if (h < 0.45) return lerpColor(palette.low, palette.mid, Math.max(0, h) / 0.45);
    if (h < 1.1) return lerpColor(palette.mid, palette.high, (h - 0.45) / 0.65);
    return lerpColor(palette.high, palette.peak, Math.min(1, (h - 1.1) / 0.9));
  }

  function drawTerrain(time) {
    tctx.clearRect(0, 0, viewW, viewH);
    const heights = new Float32Array((GRID_W + 1) * (GRID_H + 1));
    for (let gy = 0; gy <= GRID_H; gy++) {
      for (let gx = 0; gx <= GRID_W; gx++) {
        heights[gy * (GRID_W + 1) + gx] = terrainHeight(gx, gy, time);
      }
    }

    // Painter's algorithm: far (high gy) first
    for (let gy = GRID_H - 1; gy >= 0; gy--) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const h00 = heights[gy * (GRID_W + 1) + gx];
        const h10 = heights[gy * (GRID_W + 1) + gx + 1];
        const h01 = heights[(gy + 1) * (GRID_W + 1) + gx];
        const h11 = heights[(gy + 1) * (GRID_W + 1) + gx + 1];
        const p00 = project(gx, gy, h00);
        const p10 = project(gx + 1, gy, h10);
        const p01 = project(gx, gy + 1, h01);
        const p11 = project(gx + 1, gy + 1, h11);
        const hAvg = (h00 + h10 + h01 + h11) / 4;
        const col = heightColor(hAvg);
        const alpha = 0.35 + Math.min(0.5, Math.max(0, hAvg) * 0.42);

        tctx.beginPath();
        tctx.moveTo(p00.x, p00.y);
        tctx.lineTo(p10.x, p10.y);
        tctx.lineTo(p11.x, p11.y);
        tctx.lineTo(p01.x, p01.y);
        tctx.closePath();
        tctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha})`;
        tctx.fill();
        tctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha * 0.35})`;
        tctx.lineWidth = 0.5;
        tctx.stroke();

        // Peak glow: luminous summits on loud audio
        if (hAvg > 1.5) {
          tctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.5, (hAvg - 1.5) * 0.35)})`;
          tctx.fill();
        }
      }
    }
  }

  // === Particle Flow Field ===

  const particles = [];

  function spawnParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        vx: 0,
        vy: 0,
        life: Math.random(),
        size: 0.6 + Math.random() * 1.8
      });
    }
  }

  function drawParticles(dt, time) {
    pctx.clearRect(0, 0, viewW, viewH);
    const palette = THEMES[state.theme];
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      const n = Noise2D.noise(pt.x * 0.0016 + time * 0.1, pt.y * 0.0016 - time * 0.07);
      const speed = 14 + state.rms * 220 + state.bands[3] * 160;
      pt.vx += Math.cos(n * Math.PI * 2) * speed * dt;
      pt.vy += Math.sin(n * Math.PI * 2) * speed * dt - state.bands[0] * 60 * dt;

      // Mouse repulsion
      if (state.mouse.active) {
        const dx = pt.x - state.mouse.x;
        const dy = pt.y - state.mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 140 && d > 0.01) {
          const force = Math.pow(1 - d / 140, 2) * 320;
          pt.vx += (dx / d) * force * dt;
          pt.vy += (dy / d) * force * dt;
        }
      }

      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= dt * 0.14;
      if (pt.life <= 0 || pt.x < -20 || pt.x > viewW + 20 || pt.y < -20 || pt.y > viewH + 20) {
        pt.x = Math.random() * viewW;
        pt.y = viewH + Math.random() * 40;
        pt.vx = 0;
        pt.vy = 0;
        pt.life = 0.6 + Math.random() * 0.6;
      }
      const col = lerpColor(palette.mid, palette.high, Math.min(1, pt.life));
      pctx.beginPath();
      pctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      pctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${Math.min(0.8, pt.life * 0.9)})`;
      pctx.fill();
    }

    // Shockwave rings
    for (let i = state.shocks.length - 1; i >= 0; i--) {
      const shock = state.shocks[i];
      const r = shock.t * 560;
      const energy = Math.max(0, 1 - shock.t / 1.4);
      pctx.beginPath();
      pctx.arc(shock.x, shock.y, r, 0, Math.PI * 2);
      pctx.strokeStyle = `rgba(${palette.high[0]}, ${palette.high[1]}, ${palette.high[2]}, ${energy * 0.55})`;
      pctx.lineWidth = 2.4 * energy + 0.4;
      pctx.stroke();
      pctx.beginPath();
      pctx.arc(shock.x, shock.y, r * 0.82, 0, Math.PI * 2);
      pctx.strokeStyle = `rgba(${palette.peak[0]}, ${palette.peak[1]}, ${palette.peak[2]}, ${energy * 0.28})`;
      pctx.lineWidth = 1;
      pctx.stroke();
    }
  }

  // === HUD ===

  let hudTick = 0;

  function updateHUD() {
    rmsMeter.style.width = Math.min(100, state.rms * 220) + '%';
    rmsValue.textContent = state.rms.toFixed(2);
    peakMeter.classList.add('peek');
    peakMeter.style.width = Math.min(100, state.peak * 220) + '%';
    peakValue.textContent = state.peak.toFixed(2);
    hudTick++;
    if (hudTick % 20 === 0) {
      peakMeter.classList.remove('peek');
    }
  }

  // Expose band fill via direct style (avoid ::after inline limits)
  const bandFillEls = bandBars.map((bar) => {
    const fill = document.createElement('span');
    fill.className = 'band-fill';
    bar.appendChild(fill);
    return fill;
  });

  function updateBandFills() {
    for (let b = 0; b < 4; b++) {
      bandFillEls[b].style.width = Math.min(100, state.bands[b] * 130) + '%';
    }
  }

  // === Interaction ===

  function onPointerMove(e) {
    state.mouse.tx = e.clientX;
    state.mouse.ty = e.clientY;
    state.mouse.active = true;
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';

    // Sculpt mode: moving carves persistent bumps
    if (state.mode === 'sculpt' && e.buttons === 1) {
      const grid = screenToGrid(e.clientX, e.clientY);
      state.sculptStamp.push({ gx: grid.gx, gy: grid.gy, power: 1.6 });
      if (state.sculptStamp.length > 140) state.sculptStamp.shift();
    }
  }

  function onPointerLeave() {
    state.mouse.active = false;
  }

  function onClick(e) {
    if (e.target.closest('.app-shell') || e.target.closest('.back-link') || e.target.closest('.theme-switcher')) return;
    state.shocks.push({ x: e.clientX, y: e.clientY, t: 0 });
    AudioEngine.ensureContext();
  }

  function switchTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
  }

  function switchMode(mode) {
    state.mode = mode;
    modeHint.textContent = mode === 'explore'
      ? '移动光标扰动声场 · 点击释放冲击波'
      : '按住拖拽雕刻山脉 · 点击释放冲击波';
  }

  async function switchSource(source) {
    state.source = source;
    hudSource.textContent = { synth: 'SYNTH', mic: 'MIC', silent: 'STILL' }[source];
    if (source === 'synth') {
      AudioEngine.buildSynth(state.preset);
    } else if (source === 'mic') {
      const ok = await AudioEngine.enableMic();
      if (!ok) {
        hudSource.textContent = 'DENIED';
        state.source = 'synth';
        AudioEngine.buildSynth(state.preset);
        document.querySelectorAll('.source-card').forEach((card) => {
          card.classList.toggle('active', card.dataset.source === 'synth');
        });
      }
    } else {
      AudioEngine.goSilent();
      state.bands = [0, 0, 0, 0];
      state.rms = 0;
      state.peak = 0;
    }
  }

  function switchPreset(preset) {
    state.preset = preset;
    if (state.source === 'synth') AudioEngine.buildSynth(preset);
  }

  function bindEvents() {
    window.addEventListener('resize', resize);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('click', onClick);

    document.getElementById('theme-switcher').addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-btn');
      if (!btn) return;
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      switchTheme(btn.dataset.theme);
    });

    document.getElementById('interactionMode').addEventListener('click', () => {
      const next = state.mode === 'explore' ? 'sculpt' : 'explore';
      document.querySelectorAll('.mode-label').forEach((label) => {
        label.classList.toggle('active', label.dataset.mode === next);
      });
      switchMode(next);
    });

    document.getElementById('sourcePanel').addEventListener('click', (e) => {
      const card = e.target.closest('.source-card');
      if (card) {
        document.querySelectorAll('.source-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        switchSource(card.dataset.source);
        return;
      }
      const presetBtn = e.target.closest('.preset-btn');
      if (presetBtn) {
        document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
        presetBtn.classList.add('active');
        switchPreset(presetBtn.dataset.preset);
      }
    });
  }

  // === Main Loop ===

  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    state.time += dt;

    // Smooth mouse follow
    state.mouse.x += (state.mouse.tx - state.mouse.x) * 0.14;
    state.mouse.y += (state.mouse.ty - state.mouse.y) * 0.14;

    // Advance shockwaves
    for (let i = state.shocks.length - 1; i >= 0; i--) {
      state.shocks[i].t += dt;
      if (state.shocks[i].t > 1.5) state.shocks.splice(i, 1);
    }

    // Decay sculpt stamps slowly
    for (let i = state.sculptStamp.length - 1; i >= 0; i--) {
      state.sculptStamp[i].power -= dt * 0.06;
      if (state.sculptStamp[i].power <= 0) state.sculptStamp.splice(i, 1);
    }

    AudioEngine.sample();
    drawTerrain(state.time);
    drawParticles(dt, state.time);
    updateHUD();
    updateBandFills();

    requestAnimationFrame(loop);
  }

  // === Boot ===

  function init() {
    resize();
    spawnParticles();
    bindEvents();
    switchMode('explore');
    // AudioContext requires a user gesture; arm it on first interaction
    const armAudio = () => {
      switchSource('synth');
      window.removeEventListener('pointerdown', armAudio);
    };
    window.addEventListener('pointerdown', armAudio);
    requestAnimationFrame(loop);
  }

  init();
})();
