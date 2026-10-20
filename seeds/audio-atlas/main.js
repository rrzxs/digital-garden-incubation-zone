/**
 * ============================================================
 * Audio Atlas 声之图集 — 交互逻辑
 * 六大声音地貌 · Web Audio 实时程序化合成 · Canvas 流场可视化
 * 免构建 · Vanilla JS
 * ============================================================
 * maintainer: EDEN
 */

(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('atlas-canvas');
  const ctx = canvas.getContext('2d');
  const nodesLayer = document.getElementById('atlas-nodes');
  const biomesLayer = document.getElementById('biomes');
  const headStatus = document.getElementById('head-status');
  const hudBiome = document.getElementById('hud-biome');
  const hudEnergy = document.getElementById('hud-energy');
  const hudCursor = document.getElementById('hud-cursor');
  const vizGroup = document.getElementById('viz-group');
  const paletteGroup = document.getElementById('palette-group');
  const intensitySlider = document.getElementById('intensity-slider');
  const intensityVal = document.getElementById('intensity-val');
  const pulseBtn = document.getElementById('pulse-btn');
  const stopBtn = document.getElementById('stop-btn');
  const atlasFrame = document.querySelector('.atlas-frame');

  // === Biome Data Model（声音地貌领域模型） ===
  const BIOMES = [
    {
      id: 'amazon', glyph: '🌿', name: 'Amazon Rainfield', cn: '雨林',
      desc: '层叠雨幕之下， synthesized 鸟鸣在阔叶间折射回响，大地低频缓缓呼吸。',
      x: 30, y: 62, coords: '03°S 60°W', tag: 'RAIN / AVIAN'
    },
    {
      id: 'ocean', glyph: '🌊', name: 'Pelagic Drift', cn: '洋流',
      desc: '深蓝涌浪以 0.08Hz 的周期涨落，泡沫噪声在潮汐包络中碎裂重组。',
      x: 48, y: 46, coords: '28°N 42°W', tag: 'SWELL / FOAM'
    },
    {
      id: 'sahara', glyph: '🏜', name: 'Erg Wind Corridor', cn: '荒漠',
      desc: '热风穿越沙丘走廊，带通中心频率随风压游走，阵风以长尾缓动袭来。',
      x: 52, y: 40, coords: '23°N 12°E', tag: 'WIND / GUST'
    },
    {
      id: 'tokyo', glyph: '🌃', name: 'Midnight Metropolis', cn: '都会',
      desc: '子夜电网的 50Hz 嗡鸣之下，霓虹杂讯与远处的电子碎片随机闪烁。',
      x: 84, y: 40, coords: '35°N 139°E', tag: 'HUM / GLITCH'
    },
    {
      id: 'arctic', glyph: '❄', name: 'Aurora Field', cn: '极光',
      desc: '极高纬度的清冽气团，微失谐泛音列在稀薄空气中缓慢干涉发光。',
      x: 62, y: 14, coords: '78°N 15°E', tag: 'SHIMMER / DRONE'
    },
    {
      id: 'alpine', glyph: '🔔', name: 'Alpine Pasture', cn: '牧场',
      desc: '山风掠过草甸，远处牛铃以不规则的泊松节律敲响，回声在山谷中衰减。',
      x: 14, y: 32, coords: '46°N 08°E', tag: 'WIND / BELL'
    }
  ];

  // === State ===
  const state = {
    activeBiome: null,
    viz: 'radial',
    intensity: 0.7,
    cursor: { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0, inside: false },
    energy: 0,
    shockwaves: [],
    time: 0
  };

  // ================================================================
  // AUDIO ENGINE — Web Audio 程序化合成
  // ================================================================
  const AudioEngine = (function () {
    let ctxAudio = null;
    let master = null;
    let analyser = null;
    let freqData = null;
    let timeData = null;
    let noiseBuffer = null;
    let liveNodes = [];
    let liveTimers = [];
    let started = false;

    function ensure() {
      if (ctxAudio) return ctxAudio;
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxAudio = new AC();
      master = ctxAudio.createGain();
      master.gain.value = 0;
      analyser = ctxAudio.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);
      master.connect(analyser);
      analyser.connect(ctxAudio.destination);
      return ctxAudio;
    }

    // 白噪声缓冲（后续用滤波器塑形为不同气质）
    function getNoise() {
      if (noiseBuffer) return noiseBuffer;
      const len = ctxAudio.sampleRate * 2.5;
      noiseBuffer = ctxAudio.createBuffer(1, len, ctxAudio.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02; // 轻微褐化
        data[i] = white * 0.5 + last * 3.2;
      }
      return noiseBuffer;
    }

    function noiseSource(loopFilterFreq) {
      const src = ctxAudio.createBufferSource();
      src.buffer = getNoise();
      src.loop = true;
      return src;
    }

    function keep(node) { liveNodes.push(node); return node; }

    function later(fn, minMs, maxMs) {
      const t = setTimeout(() => {
        if (!state.activeBiome) return;
        fn();
        later(fn, minMs, maxMs);
      }, minMs + Math.random() * (maxMs - minMs));
      liveTimers.push(t);
    }

    // —— 各地貌合成器 ——
    const SYNTHS = {

      // 雨林：雨幕噪声 + 随机鸟鸣扫频 + 大地低频
      amazon(out) {
        const rain = keep(noiseSource());
        const rainFilter = keep(ctxAudio.createBiquadFilter());
        rainFilter.type = 'bandpass'; rainFilter.frequency.value = 2400; rainFilter.Q.value = 0.6;
        const rainGain = keep(ctxAudio.createGain()); rainGain.gain.value = 0.5;
        rain.connect(rainFilter).connect(rainGain).connect(out);
        rain.start();

        const rumble = keep(ctxAudio.createOscillator());
        rumble.type = 'sine'; rumble.frequency.value = 42;
        const rGain = keep(ctxAudio.createGain()); rGain.gain.value = 0.10;
        const rLfo = keep(ctxAudio.createOscillator()); rLfo.frequency.value = 0.07;
        const rLfoGain = keep(ctxAudio.createGain()); rLfoGain.gain.value = 0.07;
        rLfo.connect(rLfoGain).connect(rGain.gain);
        rumble.connect(rGain).connect(out);
        rumble.start(); rLfo.start();

        const chirp = () => {
          const o = keep(ctxAudio.createOscillator());
          const g = keep(ctxAudio.createGain());
          const base = 1600 + Math.random() * 2200;
          const now = ctxAudio.currentTime;
          o.type = 'sine';
          o.frequency.setValueAtTime(base, now);
          o.frequency.exponentialRampToValueAtTime(base * (0.5 + Math.random()), now + 0.14);
          o.frequency.exponentialRampToValueAtTime(base * (0.8 + Math.random() * 0.5), now + 0.26);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.14 * state.intensity, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
          o.connect(g).connect(out);
          o.start(now); o.stop(now + 0.35);
        };
        later(chirp, 700, 3200);
      },

      // 洋流：低通涌浪 + 潮汐 LFO + 泡沫高频
      ocean(out) {
        const swell = keep(noiseSource());
        const lp = keep(ctxAudio.createBiquadFilter());
        lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.8;
        const swellGain = keep(ctxAudio.createGain()); swellGain.gain.value = 0.4;
        const tide = keep(ctxAudio.createOscillator()); tide.frequency.value = 0.08;
        const tideGain = keep(ctxAudio.createGain()); tideGain.gain.value = 0.26;
        tide.connect(tideGain).connect(swellGain.gain);
        const tideF = keep(ctxAudio.createOscillator()); tideF.frequency.value = 0.05;
        const tideFGain = keep(ctxAudio.createGain()); tideFGain.gain.value = 260;
        tideF.connect(tideFGain).connect(lp.frequency);
        swell.connect(lp).connect(swellGain).connect(out);
        swell.start(); tide.start(); tideF.start();

        const foam = keep(noiseSource());
        const hp = keep(ctxAudio.createBiquadFilter());
        hp.type = 'highpass'; hp.frequency.value = 3800;
        const fGain = keep(ctxAudio.createGain()); fGain.gain.value = 0.03;
        const fLfo = keep(ctxAudio.createOscillator()); fLfo.frequency.value = 0.13;
        const fLfoG = keep(ctxAudio.createGain()); fLfoG.gain.value = 0.028;
        fLfo.connect(fLfoG).connect(fGain.gain);
        foam.connect(hp).connect(fGain).connect(out);
        foam.start(); fLfo.start();
      },

      // 荒漠：游走带通风 + 阵风包络
      sahara(out) {
        const wind = keep(noiseSource());
        const bp = keep(ctxAudio.createBiquadFilter());
        bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.4;
        const wGain = keep(ctxAudio.createGain()); wGain.gain.value = 0.3;
        const wander = keep(ctxAudio.createOscillator()); wander.frequency.value = 0.05;
        const wanderG = keep(ctxAudio.createGain()); wanderG.gain.value = 420;
        wander.connect(wanderG).connect(bp.frequency);
        wind.connect(bp).connect(wGain).connect(out);
        wind.start(); wander.start();

        const gust = () => {
          const now = ctxAudio.currentTime;
          wGain.gain.cancelScheduledValues(now);
          wGain.gain.setValueAtTime(wGain.gain.value, now);
          wGain.gain.linearRampToValueAtTime(0.55 * state.intensity + 0.15, now + 2.4);
          wGain.gain.linearRampToValueAtTime(0.3, now + 6.5);
        };
        later(gust, 4000, 9000);
      },

      // 都会：电网嗡鸣 + 霓虹杂讯 + 电子碎片
      tokyo(out) {
        const hum = keep(ctxAudio.createOscillator());
        hum.type = 'sawtooth'; hum.frequency.value = 50;
        const humFilter = keep(ctxAudio.createBiquadFilter());
        humFilter.type = 'lowpass'; humFilter.frequency.value = 160;
        const humGain = keep(ctxAudio.createGain()); humGain.gain.value = 0.16;
        hum.connect(humFilter).connect(humGain).connect(out);
        hum.start();

        const hiss = keep(noiseSource());
        const hissFilter = keep(ctxAudio.createBiquadFilter());
        hissFilter.type = 'highpass'; hissFilter.frequency.value = 5200;
        const hissGain = keep(ctxAudio.createGain()); hissGain.gain.value = 0.035;
        hiss.connect(hissFilter).connect(hissGain).connect(out);
        hiss.start();

        const blip = () => {
          const o = keep(ctxAudio.createOscillator());
          const g = keep(ctxAudio.createGain());
          const now = ctxAudio.currentTime;
          o.type = Math.random() > 0.5 ? 'triangle' : 'square';
          o.frequency.value = 640 + Math.random() * 1800;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.05 * state.intensity, now + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
          o.connect(g).connect(out);
          o.start(now); o.stop(now + 0.25);
        };
        later(blip, 400, 2600);
      },

      // 极光：微失谐泛音列 + 稀薄气团
      arctic(out) {
        const partials = [220, 330, 440.5, 551, 662];
        partials.forEach((f, i) => {
          const o = keep(ctxAudio.createOscillator());
          o.type = 'sine'; o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
          const g = keep(ctxAudio.createGain());
          g.gain.value = (0.085 / (i + 1)) * state.intensity + 0.015;
          const lfo = keep(ctxAudio.createOscillator());
          lfo.frequency.value = 0.03 + i * 0.017;
          const lg = keep(ctxAudio.createGain()); lg.gain.value = 0.03 / (i + 1);
          lfo.connect(lg).connect(g.gain);
          o.connect(g).connect(out);
          o.start(); lfo.start();
        });

        const air = keep(noiseSource());
        const bp = keep(ctxAudio.createBiquadFilter());
        bp.type = 'bandpass'; bp.frequency.value = 6200; bp.Q.value = 0.5;
        const aGain = keep(ctxAudio.createGain()); aGain.gain.value = 0.045;
        air.connect(bp).connect(aGain).connect(out);
        air.start();
      },

      // 牧场：山风 + 泊松节律牛铃（双泛音衰减）
      alpine(out) {
        const wind = keep(noiseSource());
        const bp = keep(ctxAudio.createBiquadFilter());
        bp.type = 'bandpass'; bp.frequency.value = 1000; bp.Q.value = 0.7;
        const wGain = keep(ctxAudio.createGain()); wGain.gain.value = 0.22;
        const wLfo = keep(ctxAudio.createOscillator()); wLfo.frequency.value = 0.11;
        const wLfoG = keep(ctxAudio.createGain()); wLfoG.gain.value = 0.1;
        wLfo.connect(wLfoG).connect(wGain.gain);
        wind.connect(bp).connect(wGain).connect(out);
        wind.start(); wLfo.start();

        const bell = () => {
          const base = 520 + Math.random() * 340;
          const now = ctxAudio.currentTime;
          [1, 2.76].forEach((ratio, k) => {
            const o = keep(ctxAudio.createOscillator());
            const g = keep(ctxAudio.createGain());
            o.type = 'sine'; o.frequency.value = base * ratio;
            const peak = (k === 0 ? 0.12 : 0.05) * state.intensity;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(peak, now + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
            o.connect(g).connect(out);
            o.start(now); o.stop(now + 2.7);
          });
        };
        later(bell, 2500, 8000);
      }
    };

    function stopAll() {
      liveTimers.forEach(clearTimeout);
      liveTimers = [];
      liveNodes.forEach((n) => {
        try {
          if (typeof n.stop === 'function') n.stop(ctxAudio.currentTime + 0.05);
          n.disconnect();
        } catch (e) { /* already stopped */ }
      });
      liveNodes = [];
    }

    return {
      start(biomeId) {
        ensure();
        if (ctxAudio.state === 'suspended') ctxAudio.resume();
        stopAll();
        const now = ctxAudio.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(state.intensity * 0.9, now + 1.4);
        SYNTHS[biomeId](master);
        started = true;
      },
      stop() {
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.9);
        setTimeout(stopAll, 1000);
        started = false;
      },
      setIntensity(v) {
        state.intensity = v;
        if (ctxAudio && started) {
          const now = ctxAudio.currentTime;
          master.gain.linearRampToValueAtTime(v * 0.9, now + 0.3);
        }
      },
      getSpectrum() {
        if (!analyser) return null;
        analyser.getByteFrequencyData(freqData);
        return freqData;
      },
      getWaveform() {
        if (!analyser) return null;
        analyser.getByteTimeDomainData(timeData);
        return timeData;
      },
      isActive() { return started; }
    };
  })();

  // ================================================================
  // FLOW FIELD — 简易值噪声流场（粒子呼吸洋流）
  // ================================================================
  function fieldAngle(x, y, t) {
    return Math.sin(x * 1.7 + t * 0.32) * 1.2
         + Math.cos(y * 2.1 - t * 0.24) * 1.1
         + Math.sin((x + y) * 0.9 + t * 0.15) * 0.8;
  }

  const PALETTES = {
    aurora: ['#7c5cff', '#38e8c6', '#ff6ea9'],
    dusk: ['#ff8a5c', '#ffd166', '#c05cff'],
    abyss: ['#2f6bff', '#19d3d3', '#7c5cff'],
    ember: ['#ff4d3d', '#ffb02e', '#ff2e88']
  };

  function currentPalette() {
    return PALETTES[document.body.dataset.palette] || PALETTES.aurora;
  }

  // === Particle System ===
  const particles = [];
  const PARTICLE_COUNT = 150;
  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random(), y: Math.random(),
        vx: 0, vy: 0,
        size: 0.6 + Math.random() * 1.7,
        hue: Math.floor(Math.random() * 3),
        life: Math.random()
      });
    }
  }
  initParticles();

  // === Canvas Resize ===
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  // === Shockwave System（点击冲击波） ===
  function spawnShockwave(x, y, strength) {
    state.shockwaves.push({ x, y, r: 8, max: (strength || 1) * Math.max(W, H) * 0.5, life: 1 });
  }

  // === Render Loop ===
  function render(ts) {
    state.time = ts * 0.001;
    const t = state.time;
    const pal = currentPalette();
    const cw = state.cursor.x, ch = state.cursor.y;

    ctx.clearRect(0, 0, W, H);

    // —— 点阵经纬网格（光标视差 + 活跃地貌引力） ——
    const gridN = Math.round(W / 52);
    const gridM = Math.round(H / 52);
    const activeBiome = BIOMES.find((b) => b.id === state.activeBiome);
    for (let i = 1; i < gridN; i++) {
      for (let j = 1; j < gridM; j++) {
        let gx = i / gridN, gy = j / gridM;
        const dx = gx - cw, dy = gy - ch;
        const d2 = dx * dx + dy * dy;
        const repel = Math.max(0, 0.055 - d2) / 0.055;
        gx += dx * repel * 0.35;
        gy += dy * repel * 0.35;
        if (activeBiome) {
          const bx = activeBiome.x / 100, by = activeBiome.y / 100;
          const bdx = bx - gx, bdy = by - gy;
          const bd2 = bdx * bdx + bdy * bdy;
          const pull = Math.max(0, 0.045 - bd2) / 0.045;
          gx += bdx * pull * 0.25 * (0.6 + state.energy);
          gy += bdy * pull * 0.25 * (0.6 + state.energy);
        }
        ctx.fillStyle = `rgba(255,255,255,${0.05 + repel * 0.18})`;
        ctx.beginPath();
        ctx.arc(gx * W, gy * H, 1 + repel * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // —— 能量读取 ——
    const spectrum = AudioEngine.getSpectrum();
    const wave = AudioEngine.getWaveform();
    let energy = 0;
    if (spectrum) {
      let sum = 0;
      for (let i = 0; i < spectrum.length; i += 4) sum += spectrum[i];
      energy = sum / (spectrum.length / 4) / 255;
    }
    state.energy += (energy - state.energy) * 0.12;

    // —— 粒子流场 ——
    const speedBoost = 1 + state.energy * 2.2 + (state.viz === 'particles' ? state.energy * 2.5 : 0);
    particles.forEach((p) => {
      const a = fieldAngle(p.x * 4.2, p.y * 4.2, t);
      p.vx += Math.cos(a) * 0.00035 * speedBoost;
      p.vy += Math.sin(a) * 0.00035 * speedBoost;

      // 光标力场
      if (state.cursor.inside) {
        const dx = p.x - cw, dy = p.y - ch;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.14 && d > 0.001) {
          const f = (0.14 - d) / 0.14 * 0.0016;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }

      // 冲击波推挤
      state.shockwaves.forEach((s) => {
        const dx = p.x * W - s.x, dy = p.y * H - s.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(d - s.r) < 42 && d > 1) {
          const f = (1 - Math.abs(d - s.r) / 42) * 0.05 * s.life;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      });

      p.vx *= 0.94; p.vy *= 0.94;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -0.02) p.x = 1.02; if (p.x > 1.02) p.x = -0.02;
      if (p.y < -0.02) p.y = 1.02; if (p.y > 1.02) p.y = -0.02;

      const alpha = 0.24 + state.energy * 0.55;
      ctx.fillStyle = pal[p.hue];
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.size * (1 + state.energy * 0.9), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // —— 音频可视化层 ——
    if (state.activeBiome && activeBiome) {
      if (state.viz === 'radial' && spectrum) {
        const cx = (activeBiome.x / 100) * W;
        const cy = (activeBiome.y / 100) * H;
        const baseR = Math.min(W, H) * 0.11;
        const bars = 96;
        for (let i = 0; i < bars; i++) {
          const v = spectrum[Math.floor(i / bars * spectrum.length * 0.7)] / 255;
          const ang = (i / bars) * Math.PI * 2 - Math.PI / 2;
          const r1 = baseR + 8;
          const r2 = r1 + v * Math.min(W, H) * 0.16;
          ctx.strokeStyle = pal[i % 3];
          ctx.globalAlpha = 0.35 + v * 0.6;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
          ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (state.viz === 'wave' && wave) {
        const cy = (activeBiome.y / 100) * H;
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = pal[1];
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        for (let i = 0; i < wave.length; i += 2) {
          const x = (i / wave.length) * W;
          const y = cy + ((wave[i] - 128) / 128) * H * 0.16 * (0.4 + state.energy * 2);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // particles 模式：能量已注入流场，无需额外层
    }

    // —— 冲击波环 ——
    state.shockwaves = state.shockwaves.filter((s) => s.life > 0.01);
    state.shockwaves.forEach((s) => {
      const ease = 1 - Math.pow(1 - (1 - s.life), 3); // easeOutCubic 展开速率
      s.r += (s.max - s.r) * 0.06 * ease + 1.5;
      s.life *= 0.965;
      ctx.strokeStyle = pal[1];
      ctx.globalAlpha = s.life * 0.7;
      ctx.lineWidth = 1.6 + s.life * 1.8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // —— 遥测 HUD ——
    hudEnergy.textContent = 'ENERGY ' + state.energy.toFixed(2);
    hudCursor.textContent = 'X ' + cw.toFixed(2) + ' · Y ' + ch.toFixed(2);

    requestAnimationFrame(render);
  }

  // ================================================================
  // TEXT SCRAMBLE — 乱码揭示
  // ================================================================
  const GLYPHS = '◍≋◇◈⌁ADRIOX#%&@*';
  function scramble(el, finalText, duration) {
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const reveal = Math.floor(eased * finalText.length);
      let out = finalText.slice(0, reveal);
      for (let i = reveal; i < finalText.length; i++) {
        out += finalText[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ================================================================
  // UI BUILD & INTERACTION
  // ================================================================
  function buildNodes() {
    BIOMES.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'node';
      el.dataset.id = b.id;
      el.style.left = b.x + '%';
      el.style.top = b.y + '%';
      el.title = b.name;
      el.textContent = b.glyph;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        activateBiome(b.id);
        spawnShockwave((b.x / 100) * W, (b.y / 100) * H, 0.8);
      });
      nodesLayer.appendChild(el);
    });
  }

  function buildCards() {
    BIOMES.forEach((b, i) => {
      const card = document.createElement('div');
      card.className = 'biome-card glass';
      card.dataset.id = b.id;
      card.innerHTML = `
        <div class="biome-top">
          <span class="biome-glyph">${b.glyph}</span>
          <span class="biome-eq"><i></i><i></i><i></i><i></i></span>
        </div>
        <h3 class="biome-name">${b.name}</h3>
        <span class="biome-cn">${b.cn}</span>
        <p class="biome-desc">${b.desc}</p>
        <div class="biome-meta mono">
          <span>${b.tag}</span>
          <span class="coords">${b.coords}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        activateBiome(b.id);
        spawnShockwave((b.x / 100) * W, (b.y / 100) * H, 0.8);
      });
      biomesLayer.appendChild(card);
      setTimeout(() => card.classList.add('in'), 120 + i * 90);
    });
  }

  function activateBiome(id) {
    const b = BIOMES.find((x) => x.id === id);
    if (!b) return;

    state.activeBiome = id;
    document.querySelectorAll('.node').forEach((n) => n.classList.toggle('active', n.dataset.id === id));
    document.querySelectorAll('.biome-card').forEach((c) => c.classList.toggle('active', c.dataset.id === id));

    AudioEngine.start(id);
    headStatus.classList.add('live');
    scramble(headStatus, 'SYS.LIVE — ' + b.name.toUpperCase(), 900);
    scramble(hudBiome, 'BIOME ' + b.cn, 700);
    scramble(biomesLayer.querySelector(`[data-id="${id}"] .biome-name`), b.name, 850);
  }

  function deactivateAll() {
    state.activeBiome = null;
    document.querySelectorAll('.node, .biome-card').forEach((n) => n.classList.remove('active'));
    AudioEngine.stop();
    headStatus.classList.remove('live');
    scramble(headStatus, 'SYS.STANDBY — SELECT A BIOME', 700);
    hudBiome.textContent = 'BIOME --';
  }

  // === 事件绑定 ===
  function bindEvents() {
    // 光标追踪（图集框内）
    atlasFrame.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      state.cursor.vx = x - state.cursor.x;
      state.cursor.vy = y - state.cursor.y;
      state.cursor.x = Math.max(0, Math.min(1, x));
      state.cursor.y = Math.max(0, Math.min(1, y));
      state.cursor.inside = true;

      // 3D 视差倾斜
      const tx = (state.cursor.x - 0.5) * 4;
      const ty = (state.cursor.y - 0.5) * -3;
      atlasFrame.style.transform = `rotateX(${ty}deg) rotateY(${tx}deg)`;
    });
    atlasFrame.addEventListener('pointerleave', () => {
      state.cursor.inside = false;
      atlasFrame.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });

    // 点击画布任意处 → 冲击波
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      spawnShockwave(e.clientX - rect.left, e.clientY - rect.top, 1);
    });

    // 可视化模式切换
    vizGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      vizGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.viz = btn.dataset.viz;
      document.body.dataset.viz = state.viz;
    });

    // 氛围配色切换
    paletteGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      paletteGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.body.dataset.palette = btn.dataset.palette;
    });

    // 强度滑杆
    intensitySlider.addEventListener('input', () => {
      const v = intensitySlider.value / 100;
      intensityVal.textContent = v.toFixed(2);
      AudioEngine.setIntensity(v);
    });

    // 脉冲按钮
    pulseBtn.addEventListener('click', () => {
      pulseBtn.classList.remove('fired');
      void pulseBtn.offsetWidth; // restart animation
      pulseBtn.classList.add('fired');
      const b = BIOMES.find((x) => x.id === state.activeBiome) || { x: 50, y: 50 };
      spawnShockwave((b.x / 100) * W, (b.y / 100) * H, 1.4);
      particles.forEach((p) => {
        const dx = p.x - b.x / 100, dy = p.y - b.y / 100;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.01) {
          p.vx += (dx / d) * 0.02;
          p.vy += (dy / d) * 0.02;
        }
      });
    });

    // 停止按钮
    stopBtn.addEventListener('click', deactivateAll);

    // 键盘 1-6 快速切换地貌
    window.addEventListener('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= BIOMES.length) activateBiome(BIOMES[n - 1].id);
      if (e.key === 'Escape') deactivateAll();
    });
  }

  // === Boot ===
  buildNodes();
  buildCards();
  bindEvents();
  resize();
  requestAnimationFrame(render);
})();
