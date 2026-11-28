/* ============================================================
   Voice Botanical Print · 声音植物图谱
   声音特征 → 确定性生成植物标本（腊叶标本版画）
   Web Audio 音高/振幅分析 + Web Speech 转写（可回退）
   ============================================================ */
(() => {
  'use strict';

  // === 配置与状态 ===
  const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const ENERGY_TARGET = 150;        // 归一化能量目标（约 5~7 秒正常说话）
  const MIN_GROWTH = 0.22;

  const state = {
    theme: 'verdigris',
    recording: false,
    growth: 0,                      // 0~1 生长进度
    growthTarget: 0,
    energy: 0,
    elapsed: 0,
    plant: null,                    // 当前植物结构
    wind: 0,                        // 风力脉冲
    windDecay: 0.94,
    mouse: { x: -999, y: -999, vx: 0 },
    spores: [],                     // 录制中孢子粒子
    pollen: [],                     // 环境花粉
    features: null,
    archive: [],
    idCounter: 0,
  };

  // === DOM Elements ===
  const $ = (id) => document.getElementById(id);
  const pressCanvas = $('pressCanvas');
  const pctx = pressCanvas.getContext('2d');
  const waveCanvas = $('waveCanvas');
  const wctx = waveCanvas.getContext('2d');
  const stageEl = $('stage');
  const stageEmpty = $('stageEmpty');
  const specimenLabel = $('specimenLabel');
  const recHud = $('recHud');
  const btnRecord = $('btnRecord');
  const btnRecordText = $('btnRecordText');
  const btnDemo = $('btnDemo');
  const toastEl = $('toast');
  const archiveGrid = $('archiveGrid');
  const archiveEmpty = $('archiveEmpty');
  const archiveCount = $('archiveCount');
  const transcriptBox = $('transcriptBox');
  const transcriptText = $('transcriptText');

  // === 画布尺寸（含 DPR） ===
  let W = 0, H = 0, DPR = 1;
  function resizeCanvases() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = stageEl.getBoundingClientRect();
    W = r.width; H = r.height;
    pressCanvas.width = W * DPR; pressCanvas.height = H * DPR;
    pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const wr = waveCanvas.getBoundingClientRect();
    waveCanvas.width = wr.width * DPR; waveCanvas.height = wr.height * DPR;
    wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resizeCanvases);

  // === 主题画布调色板 ===
  const CANVAS_PALETTES = {
    verdigris: { stem: '#3f7a58', leaf: '#5fa878', leafFill: 'rgba(95,168,120,0.32)', flower: '#d9b26a', pod: '#a8714b', ink: 'rgba(216,232,212,0.5)', accent: '#7fd4a8' },
    cyanotype: { stem: '#3d6ea6', leaf: '#6fa3d4', leafFill: 'rgba(111,163,212,0.30)', flower: '#e3edf7', pod: '#88aac9', ink: 'rgba(213,227,242,0.45)', accent: '#78b8e8' },
    duskrose:  { stem: '#8a4a63', leaf: '#c07d95', leafFill: 'rgba(192,125,149,0.30)', flower: '#e8bd7d', pod: '#9c5a44', ink: 'rgba(239,220,228,0.45)', accent: '#e89bb4' },
    nocturne:  { stem: '#5a5490', leaf: '#8d87c4', leafFill: 'rgba(141,135,196,0.28)', flower: '#cfc9f0', pod: '#76728f', ink: 'rgba(220,220,230,0.42)', accent: '#a8a2e8' },
  };

  // === 确定性随机 ===
  function hashFeatures(f) {
    const s = `${f.avgPitch.toFixed(1)}|${f.pitchVar.toFixed(3)}|${f.avgVol.toFixed(4)}|${f.volVar.toFixed(4)}|${f.duration.toFixed(2)}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  // === 声音特征聚合 ===
  function newFeatureAggregator() {
    return {
      pitches: [], vols: [], duration: 0, frames: 0,
      push(pitch, vol) { this.frames++; if (pitch > 0) this.pitches.push(pitch); this.vols.push(vol); },
      finalize() {
        const ps = this.pitches.length ? this.pitches : [140];
        const vs = this.vols;
        const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
        const std = (arr, m) => Math.sqrt(mean(arr.map((v) => (v - m) * (v - m))));
        const avgPitch = mean(ps), avgVol = mean(vs);
        return {
          avgPitch, pitchVar: std(ps, avgPitch) / avgPitch,
          avgVol, volVar: std(vs, avgVol) / (avgVol + 1e-4),
          duration: this.duration, frames: this.frames,
        };
      },
    };
  }

  // === 植物生成器（由声纹特征驱动形态） ===
  function generatePlant(features, rngSeed) {
    const rng = mulberry32(rngSeed);
    const f = features;
    // 特征 → DNA
    const pitchN = clamp((f.avgPitch - 85) / (340 - 85), 0, 1);     // 音高 → 高挑/蜿蜒
    const tremoN = clamp(f.pitchVar / 0.45, 0, 1);                  // 起伏 → 分枝密度
    const vigorN = clamp(f.avgVol / 0.16, 0, 1);                    // 气量 → 叶片尺寸
    const pulseN = clamp(f.volVar / 0.9, 0, 1);                     // 脉动 → 花果数量
    const matureN = clamp(f.duration / 8, 0.2, 1);                  // 时长 → 成熟度

    const dna = {
      height: lerp(0.42, 0.92, pitchN * 0.6 + matureN * 0.4) * H,
      waviness: lerp(0.35, 1.4, tremoN),
      segLen: 16,
      branchChance: lerp(0.18, 0.55, tremoN),
      leafSize: lerp(10, 26, vigorN),
      flowerChance: lerp(0.04, 0.24, pulseN),
      podChance: lerp(0.03, 0.14, pulseN * 0.6 + tremoN * 0.4),
      stemWidth: lerp(2.2, 5.2, vigorN * 0.7 + 0.3),
      rootX: W * lerp(0.4, 0.6, rng()),
      hueShift: rng() * 0.24 - 0.12,
    };

    const plant = { dna, stems: [], total: 0 };

    // 递归生成枝条
    function growBranch(x, y, angle, len, width, depth, orderStart) {
      const segs = [];
      let cx = x, cy = y, ca = angle, o = orderStart;
      const n = Math.max(3, Math.round(len / dna.segLen));
      for (let i = 0; i < n; i++) {
        const bend = (rng() - 0.5) * 0.5 * dna.waviness + Math.sin(i * 0.9 + depth) * 0.06 * dna.waviness;
        ca += bend;
        ca = clamp(ca, -Math.PI * 0.86, -Math.PI * 0.14);
        const nx = cx + Math.cos(ca) * dna.segLen;
        const ny = cy + Math.sin(ca) * dna.segLen;
        const w = width * (1 - i / (n * 1.35));
        segs.push({ x1: cx, y1: cy, x2: nx, y2: ny, w: Math.max(0.5, w), order: o });
        o += 0.006;
        cx = nx; cy = ny;

        // 叶片：交替两侧
        if (rng() < 0.72 && depth < 3) {
          const side = (segs.length % 2 === 0) ? 1 : -1;
          plant.total++;
          segs[segs.length - 1].leaf = {
            x: nx, y: ny, side,
            size: dna.leafSize * lerp(0.6, 1.15, rng()) * (1 - depth * 0.12),
            angle: ca + side * lerp(0.7, 1.25, rng()),
            curl: rng(), order: o,
          };
          o += 0.008;
        }
        // 花朵
        if (rng() < dna.flowerChance && depth < 3) {
          plant.total++;
          segs[segs.length - 1].flower = {
            x: nx, y: ny, petals: 4 + Math.floor(rng() * 5),
            size: dna.leafSize * lerp(0.4, 0.7, rng()), order: o,
          };
          o += 0.012;
        }
        // 蒴果
        if (rng() < dna.podChance && depth < 2) {
          plant.total++;
          segs[segs.length - 1].pod = { x: nx, y: ny, size: dna.leafSize * lerp(0.5, 0.9, rng()), angle: ca, order: o };
          o += 0.01;
        }
        // 分枝
        if (i > 1 && i < n - 2 && rng() < dna.branchChance && depth < 3) {
          const bAngle = ca + (rng() > 0.5 ? 1 : -1) * lerp(0.35, 0.75, rng());
          const bLen = len * lerp(0.35, 0.62, rng());
          plant.total++;
          segs[segs.length - 1].branch = growBranch(nx, ny, bAngle, bLen, w * 0.62, depth + 1, o);
          o += 0.02;
        }
      }
      return { segs, endOrder: o };
    }

    plant.stems.push(growBranch(dna.rootX, H - 30, -Math.PI / 2 + (rng() - 0.5) * 0.3, dna.height, dna.stemWidth, 0, 0));
    // 少量基生叶（更丰茂）
    const basal = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < basal; i++) {
      plant.stems.push(growBranch(dna.rootX + (rng() - 0.5) * 40, H - 28, -Math.PI / 2 + (rng() - 0.5) * 1.5, dna.height * lerp(0.3, 0.55, rng()), dna.stemWidth * 0.6, 2, 0.05 + rng() * 0.1));
    }
    return plant;
  }

  // === 绘制植物 ===
  function drawPlant(ctx, plant, t, windPhase, windAmp, ox, oy, scale) {
    const pal = CANVAS_PALETTES[state.theme];
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const sway = (order) => Math.sin(windPhase + order * 5.2) * windAmp * order;

    function reveal(el) {
      if (!el || t <= el.order) return 0;
      return easeOutBack(clamp((t - el.order) / 0.06, 0, 1));
    }

    function drawLeaf(leaf) {
      const s = reveal(leaf) * leaf.size;
      if (s <= 0.01) return;
      ctx.save();
      ctx.translate(leaf.x + sway(leaf.order) * 4, leaf.y);
      ctx.rotate(leaf.angle + Math.sin(windPhase + leaf.order * 3) * windAmp * 0.9);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.55, -s * 0.42 * (0.6 + leaf.curl * 0.6), s, 0);
      ctx.quadraticCurveTo(s * 0.55, s * 0.34, 0, 0);
      ctx.fillStyle = pal.leafFill;
      ctx.fill();
      ctx.strokeStyle = pal.leaf;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(s * 0.92, 0);
      ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.restore();
    }
    function drawFlower(fl) {
      const s = reveal(fl) * fl.size;
      if (s <= 0.01) return;
      ctx.save();
      ctx.translate(fl.x + sway(fl.order) * 4, fl.y);
      ctx.rotate(windPhase * 0.4 + fl.order * 7);
      ctx.strokeStyle = pal.flower;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < fl.petals; i++) {
        const a = (i / fl.petals) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.5, s * 0.24, a, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = pal.flower; ctx.fill();
      ctx.restore();
    }
    function drawPod(pod) {
      const s = reveal(pod) * pod.size;
      if (s <= 0.01) return;
      ctx.save();
      ctx.translate(pod.x + sway(pod.order) * 4, pod.y);
      ctx.rotate(pod.angle + Math.PI / 2 + Math.sin(windPhase) * windAmp * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.22, s * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = pal.pod;
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fill(); ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.18, i * s * 0.18);
        ctx.lineTo(s * 0.18, i * s * 0.18);
        ctx.globalAlpha = 0.45; ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    function drawBranch(branch) {
      for (const seg of branch.segs) {
        const rv = reveal(seg);
        if (rv <= 0.01) continue;
        const x2 = lerp(seg.x1, seg.x2, rv), y2 = lerp(seg.y1, seg.y2, rv);
        const sx1 = seg.x1 + sway(seg.order) * 3, sy1 = seg.y1;
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(x2 + sway(seg.order) * 3, y2);
        ctx.strokeStyle = pal.stem;
        ctx.lineWidth = seg.w;
        ctx.stroke();
        if (seg.leaf) drawLeaf(seg.leaf);
        if (seg.flower) drawFlower(seg.flower);
        if (seg.pod) drawPod(seg.pod);
        if (seg.branch) drawBranch(seg.branch);
      }
    }
    // 根颈
    ctx.beginPath();
    ctx.moveTo(plant.dna.rootX - 14, H - 28);
    ctx.lineTo(plant.dna.rootX + 14, H - 28);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1; ctx.stroke();

    for (const stem of plant.stems) drawBranch(stem);
    ctx.restore();
  }

  // === 粒子系统 ===
  function spawnPollen() {
    if (state.pollen.length < 26 && Math.random() < 0.05) {
      state.pollen.push({ x: Math.random() * W, y: H + 10, vy: -0.15 - Math.random() * 0.35, vx: (Math.random() - 0.5) * 0.2, r: 0.6 + Math.random() * 1.6, a: 0.12 + Math.random() * 0.3, ph: Math.random() * 7 });
    }
  }
  function drawParticles(ctx, dt) {
    const pal = CANVAS_PALETTES[state.theme];
    for (let i = state.pollen.length - 1; i >= 0; i--) {
      const p = state.pollen[i];
      p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(p.ph + performance.now() * 0.0004) * 0.15;
      if (p.y < -12) { state.pollen.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = pal.accent;
      ctx.globalAlpha = p.a; ctx.fill(); ctx.globalAlpha = 1;
    }
    for (let i = state.spores.length - 1; i >= 0; i--) {
      const p = state.spores[i];
      p.life -= dt * 0.012;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 0.004 * dt;
      if (p.life <= 0) { state.spores.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = pal.flower;
      ctx.globalAlpha = 0.7 * p.life; ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  // === 主渲染循环 ===
  let lastT = performance.now();
  function renderLoop(now) {
    const dt = Math.min(50, now - lastT); lastT = now;
    const pal = CANVAS_PALETTES[state.theme];

    // 生长插值（非线性趋近）
    state.growth += (state.growthTarget - state.growth) * (1 - Math.pow(0.0015, dt / 1000));
    // 风力衰减
    state.wind *= Math.pow(state.windDecay, dt / 16);

    pctx.clearRect(0, 0, W, H);

    // 标本底纹：隐约水平蚀刻线（版画质感）
    pctx.strokeStyle = pal.ink; pctx.lineWidth = 0.5; pctx.globalAlpha = 0.16;
    for (let y = 40; y < H - 40; y += 44) {
      pctx.beginPath(); pctx.moveTo(24, y); pctx.lineTo(W - 24, y); pctx.stroke();
    }
    pctx.globalAlpha = 1;

    if (state.plant && state.growth > 0.005) {
      const windAmp = 0.02 + state.wind;
      drawPlant(pctx, state.plant, state.growth, now * 0.0012, windAmp, 0, 0, 1);
    }

    spawnPollen();
    drawParticles(pctx, dt);
    requestAnimationFrame(renderLoop);
  }

  // === 波形绘制 ===
  let waveHistory = new Array(160).fill(0);
  function pushWave(v) { waveHistory.push(v); waveHistory.shift(); }
  function drawWave() {
    const w = waveCanvas.width / DPR, h = waveCanvas.height / DPR;
    wctx.clearRect(0, 0, w, h);
    const pal = CANVAS_PALETTES[state.theme];
    wctx.strokeStyle = pal.accent;
    wctx.lineWidth = 1.4;
    wctx.beginPath();
    const step = w / waveHistory.length;
    waveHistory.forEach((v, i) => {
      const x = i * step;
      const y = h / 2 + v * h * 0.46;
      i === 0 ? wctx.moveTo(x, y) : wctx.lineTo(x, y);
    });
    wctx.stroke();
    wctx.globalAlpha = 0.25;
    wctx.stroke();
    wctx.globalAlpha = 1;
    if (!state.recording) requestAnimationFrame(() => {});
  }

  // === 音高检测（自相关） ===
  function detectPitch(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.012) return { pitch: -1, rms };
    let r1 = 0, r2 = SIZE - 1;
    const thr = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thr) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thr) { r2 = SIZE - i; break; }
    const b = buf.slice(r1, r2);
    const n = b.length;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];
    let d = 0; while (d < n - 1 && c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    if (maxpos <= 0) return { pitch: -1, rms };
    let T0 = maxpos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
    if (a) T0 = T0 - bb / (2 * a);
    const pitch = sampleRate / T0;
    return { pitch: pitch > 60 && pitch < 600 ? pitch : -1, rms };
  }

  // === 语音转写（可回退） ===
  function createRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      transcriptText.textContent = text.slice(0, 200);
    };
    rec.onerror = () => {};
    return rec;
  }

  // === 麦克风录音流 ===
  let audioCtx = null, analyser = null, micStream = null, recognizer = null;

  async function startRecording() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      showToast('麦克风不可用 · 可尝试「合成样本」');
      return;
    }
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const src = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);

    state.recording = true;
    state.energy = 0; state.elapsed = 0; state.growth = 0;
    state.features = null;
    state.aggregator = newFeatureAggregator();
    state.plantSeed = (Math.random() * 1e9) | 0;
    state.plant = generatePlant(defaultFeatures(), state.plantSeed);
    state.growthTarget = MIN_GROWTH;
    stageEmpty.classList.add('hidden');
    specimenLabel.hidden = true;
    recHud.hidden = false;
    btnRecord.classList.add('recording');
    btnRecordText.textContent = '停止并压制';
    transcriptBox.hidden = true;
    transcriptText.textContent = '';
    recognizer = createRecognizer();
    if (recognizer) { try { recognizer.start(); } catch (e) {} }

    const buf = new Float32Array(analyser.fftSize);
    const sample = () => {
      if (!state.recording) return;
      analyser.getFloatTimeDomainData(buf);
      const { pitch, rms } = detectPitch(buf, audioCtx.sampleRate);
      state.aggregator.push(pitch, rms);
      state.aggregator.duration = state.elapsed;
      state.energy += rms * 6;
      state.growthTarget = clamp(state.energy / ENERGY_TARGET, MIN_GROWTH, 0.98);
      pushWave(clamp(rms * 4.5, -1, 1));
      drawWave();
      // 孢子从生长顶端迸出
      if (rms > 0.05 && state.spores.length < 60 && Math.random() < 0.4) {
        state.spores.push({
          x: state.plant.dna.rootX + (Math.random() - 0.5) * 60,
          y: H - 30 - state.growthTarget * state.plant.dna.height,
          vx: (Math.random() - 0.5) * 1.2, vy: -0.4 - Math.random() * 0.8,
          r: 1 + Math.random() * 2.4, life: 1,
        });
      }
      updateHud(pitch, rms);
      requestAnimationFrame(sample);
    };
    const tick = setInterval(() => { state.elapsed += 0.1; }, 100);
    state._tick = tick;
    requestAnimationFrame(sample);
  }

  function stopRecording() {
    state.recording = false;
    clearInterval(state._tick);
    if (micStream) micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
    if (recognizer) { try { recognizer.stop(); } catch (e) {} }
    recHud.hidden = true;
    btnRecord.classList.remove('recording');
    btnRecordText.textContent = '采集声音';

    const feats = state.aggregator.finalize();
    finalizeSpecimen(feats, transcriptText.textContent);
  }

  function defaultFeatures() {
    return { avgPitch: 170, pitchVar: 0.18, avgVol: 0.08, volVar: 0.5, duration: 5, frames: 0 };
  }

  // === 标本定稿：命名 + 铭牌 + 归档 ===
  const GENUS_A = ['Campyl', 'Dor', 'Phyl', 'Aster', 'Bry', 'Cal', 'Daph', 'Erio', 'Frit', 'Helio', 'Iri', 'Lith', 'Myr', 'Ophr', 'Rhod', 'Sil', 'Thal', 'Ver', 'Voc', 'Phon'];
  const GENUS_B = ['anthe', 'basis', 'carpa', 'dendra', 'florum', 'gonum', 'laurea', 'morpha', 'nema', 'phylla', 'rhiza', 'sperma', 'toma', 'carpon', 'virens'];

  function latinName(f, seed) {
    const rng = mulberry32(seed);
    const genus = GENUS_A[Math.floor(rng() * GENUS_A.length)] + GENUS_B[Math.floor(rng() * GENUS_B.length)];
    let epithet;
    if (f.avgVol > 0.14) epithet = 'fortis';
    else if (f.avgVol < 0.04) epithet = 'mollis';
    else if (f.avgPitch > 260) epithet = 'acutissima';
    else if (f.avgPitch < 120) epithet = 'gravissima';
    else if (f.pitchVar > 0.3) epithet = 'tremula';
    else if (f.duration > 6) epithet = 'longiqua';
    else epithet = 'serena';
    return { genus, epithet, full: `${genus} ${epithet}` };
  }

  function fieldNoteFor(f, transcript) {
    if (transcript && transcript.trim().length > 1) {
      return `「${transcript.trim().slice(0, 42)}」 — 采集者口述记录`;
    }
    const notes = [
      `生于 ${f.duration.toFixed(1)} 秒持续声息，基频 ${Math.round(f.avgPitch)}Hz。`,
      `标本喜静，唯闻人声而华。振幅均值 ${(f.avgVol * 100).toFixed(1)}%。`,
      `音域起伏 ${(f.pitchVar * 100).toFixed(0)}%，故枝态如此。`,
    ];
    return notes[Math.floor(mulberry32(hashFeatures(f))() * notes.length)];
  }

  function finalizeSpecimen(feats, transcript) {
    state.features = feats;
    const seed = hashFeatures(feats);
    state.plantSeed = seed;
    // 以真实声纹重生定稿形态（与档案缩略图同构）
    state.plant = generatePlant(feats, seed);
    state.growth = Math.min(state.growth, 0.45);
    state.growthTarget = clamp(0.55 + clamp(feats.avgVol / 0.18, 0, 0.45), 0.55, 1); // 定稿放大生长
    const name = latinName(feats, seed);
    const isDemo = feats.frames === 0;

    $('latinName').textContent = name.full;
    $('latinAuthor').textContent = 'sp. nov. vox';
    $('labelTraits').textContent =
      `pitch ${Math.round(feats.avgPitch)}Hz · tremolo ${(feats.pitchVar * 100).toFixed(0)}% · vigor ${(clamp(feats.avgVol / 0.2, 0, 1) * 100).toFixed(0)} · ${feats.duration.toFixed(1)}s`;
    $('fieldNote').textContent = fieldNoteFor(feats, isDemo ? '' : transcript);
    const now = new Date();
    $('labelMeta').textContent =
      `HERB. VOCIS No.${String(seed % 10000).padStart(4, '0')} · leg. ${isDemo ? 'synthèse' : 'vox humana'} · ${now.toLocaleDateString('zh-CN')} · det. EDEN`;
    specimenLabel.hidden = false;
    specimenLabel.style.animation = 'none';
    void specimenLabel.offsetWidth;
    specimenLabel.style.animation = '';

    updateTraitsPanel(feats);
    if (!isDemo && transcript) transcriptBox.hidden = false;

    // 归档
    const thumb = renderThumb(state.plant, feats);
    state.archive.unshift({
      id: ++state.idCounter, name: name.full, thumb, feats, seed,
    });
    if (state.archive.length > 9) state.archive.pop();
    renderArchive();
    showToast(`新标本已压制 · ${name.full}`);
  }

  function updateTraitsPanel(f) {
    const pitchN = clamp((f.avgPitch - 85) / 255, 0, 1);
    const tremoN = clamp(f.pitchVar / 0.45, 0, 1);
    const vigorN = clamp(f.avgVol / 0.2, 0, 1);
    const pulseN = clamp(f.volVar / 1.0, 0, 1);
    $('tPitchV').textContent = `${Math.round(f.avgPitch)} Hz`;
    $('tTremoV').textContent = `${(f.pitchVar * 100).toFixed(0)} %`;
    $('tVigorV').textContent = `${(vigorN * 100).toFixed(0)} %`;
    $('tPulseV').textContent = `${(pulseN * 100).toFixed(0)} %`;
    $('tPitchBar').style.width = `${pitchN * 100}%`;
    $('tTremoBar').style.width = `${tremoN * 100}%`;
    $('tVigorBar').style.width = `${vigorN * 100}%`;
    $('tPulseBar').style.width = `${pulseN * 100}%`;
  }

  function updateHud(pitch, rms) {
    $('hudPitch').textContent = `PITCH ${pitch > 0 ? Math.round(pitch) : '—'} Hz`;
    $('hudVol').textContent = `AMP ${(clamp(rms * 6, 0, 1) * 100).toFixed(0)}`;
    $('hudTime').textContent = `${state.elapsed.toFixed(1)} s`;
  }

  // === 缩略图渲染 ===
  function renderThumb(plant, feats) {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 400;
    const cx = c.getContext('2d');
    cx.fillStyle = '#f0e9d8';
    cx.fillRect(0, 0, 300, 400);
    cx.strokeStyle = 'rgba(60,50,36,0.18)';
    cx.lineWidth = 0.6;
    for (let y = 22; y < 400; y += 26) { cx.beginPath(); cx.moveTo(10, y); cx.lineTo(290, y); cx.stroke(); }
    // 保存全局态，以羊皮纸墨色绘制同构缩略标本
    const savedTheme = state.theme;
    state.theme = 'verdigris';
    const thumbPlant = generatePlant(feats, state.plantSeed);
    const scale = Math.min(260 / W, 350 / H);
    drawPlant(cx, thumbPlant, 1, 0.5, 0.012, (300 - W * scale) / 2, (400 - H * scale) / 2 + 6, scale);
    state.theme = savedTheme;
    return c.toDataURL('image/png');
  }

  // === 归档 UI ===
  function renderArchive() {
    archiveCount.textContent = `${state.archive.length} sheet${state.archive.length === 1 ? '' : 's'}`;
    archiveEmpty.style.display = state.archive.length ? 'none' : '';
    archiveGrid.querySelectorAll('.sheet-card').forEach((el) => el.remove());
    state.archive.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'sheet-card';
      card.style.animationDelay = `${idx * 0.06}s`;
      card.title = '点击重览此标本';
      card.innerHTML = `<img src="${item.thumb}" alt="${item.name}"><span class="sheet-label">${item.name}</span><button class="sheet-del" title="销毁标本">✕</button>`;
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('sheet-del')) {
          state.archive = state.archive.filter((a) => a.id !== item.id);
          renderArchive();
          showToast('标本已销毁');
          return;
        }
        revisitSpecimen(item);
      });
      archiveGrid.appendChild(card);
    });
  }

  function revisitSpecimen(item) {
    state.features = item.feats;
    state.plant = generatePlant(item.feats, item.seed);
    state.growth = 0;
    state.growthTarget = 1;
    stageEmpty.classList.add('hidden');
    specimenLabel.hidden = true;
    setTimeout(() => finalizeRevisit(item), 900);
  }
  function finalizeRevisit(item) {
    $('latinName').textContent = item.name;
    $('latinAuthor').textContent = 'sp. nov. vox';
    $('labelTraits').textContent = `pitch ${Math.round(item.feats.avgPitch)}Hz · tremolo ${(item.feats.pitchVar * 100).toFixed(0)}% · ${item.feats.duration.toFixed(1)}s`;
    $('fieldNote').textContent = fieldNoteFor(item.feats, '');
    $('labelMeta').textContent = `HERB. VOCIS No.${String(item.seed % 10000).padStart(4, '0')} · re-examined · det. EDEN`;
    specimenLabel.hidden = false;
    specimenLabel.style.animation = 'none';
    void specimenLabel.offsetWidth;
    specimenLabel.style.animation = '';
    updateTraitsPanel(item.feats);
  }

  // === 合成样本（无麦克风回退） ===
  function demoSpecimen() {
    const rng = mulberry32((Math.random() * 1e9) | 0);
    const feats = {
      avgPitch: lerp(95, 330, rng()),
      pitchVar: rng() * 0.42,
      avgVol: lerp(0.03, 0.19, rng()),
      volVar: rng() * 0.9,
      duration: lerp(1.5, 9, rng()),
      frames: 0,
    };
    state.features = feats;
    const seed = hashFeatures(feats);
    state.plant = generatePlant(feats, seed);
    state.growth = 0;
    state.growthTarget = 1;
    stageEmpty.classList.add('hidden');
    specimenLabel.hidden = true;
    // 模拟波形律动
    let t = 0;
    const anim = setInterval(() => {
      t += 0.06;
      pushWave(Math.sin(t * 3.1) * Math.exp(-t * 0.35) * (0.4 + Math.random() * 0.5));
      drawWave();
      if (t > 5) { clearInterval(anim); waveHistory.fill(0); drawWave(); }
    }, 40);
    setTimeout(() => finalizeSpecimen(feats, ''), 1000);
  }

  // === Toast ===
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // === 事件 ===
  btnRecord.addEventListener('click', () => {
    if (state.recording) stopRecording();
    else startRecording();
  });
  btnDemo.addEventListener('click', demoSpecimen);

  // 光标风力：越快掠过，风越大
  let lastMouse = { x: 0, y: 0, t: 0 };
  stageEl.addEventListener('pointermove', (e) => {
    const r = stageEl.getBoundingClientRect();
    state.mouse.x = e.clientX - r.left; state.mouse.y = e.clientY - r.top;
    const now = performance.now();
    const dt = Math.max(8, now - lastMouse.t);
    const dist = Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y);
    state.wind = clamp(state.wind + (dist / dt) * 0.06, 0, 0.28);
    lastMouse = { x: e.clientX, y: e.clientY, t: now };
  });
  stageEl.addEventListener('click', (e) => {
    if (e.target.closest('.specimen-label')) return;
    // 点击冲击波：风力脉冲 + 孢子迸发
    state.wind = clamp(state.wind + 0.22, 0, 0.4);
    const r = stageEl.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.6;
      state.spores.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.3, r: 1 + Math.random() * 2, life: 1 });
    }
  });

  // 主题切换
  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      state.theme = dot.dataset.theme;
      document.body.dataset.theme = state.theme;
      document.querySelectorAll('.theme-dot').forEach((d) => d.classList.toggle('active', d === dot));
    });
  });

  // === 初始化 ===
  function init() {
    resizeCanvases();
    document.querySelector('.theme-dot[data-theme="verdigris"]').classList.add('active');
    requestAnimationFrame(renderLoop);
    (function idleWave() { if (!state.recording) { pushWave(0); drawWave(); } setTimeout(idleWave, 160); })();
  }
  init();
})();
