/* =====================================================================
   Glass Xylophone — 微晶玻璃木琴 · 交互逻辑
   - Web Audio 合成引擎（4 种音色：Glass / Crystal / Bell / Marimba）
   - 弹簧-阻尼物理驱动的琴键非线性形变
   - Canvas 涟漪 + 粒子迸射 + Simplex 噪声流场
   - 键盘映射、八度切换、持续模式、自动演奏
   ===================================================================== */
(function () {
  'use strict';

  /* ===================================================================
     1. 常量与配置
     =================================================================== */

  var EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // 音阶定义：C 大调一个八度（C D E F G A B C）
  var SCALE = [
    { name: 'C', semitone: 0, key: 'a' },
    { name: 'D', semitone: 2, key: 's' },
    { name: 'E', semitone: 4, key: 'd' },
    { name: 'F', semitone: 5, key: 'f' },
    { name: 'G', semitone: 7, key: 'g' },
    { name: 'A', semitone: 9, key: 'h' },
    { name: 'B', semitone: 11, key: 'j' },
    { name: 'C', semitone: 12, key: 'k' }
  ];

  // 基准频率（C4 = 261.63 Hz），等比数列计算各音
  var BASE_FREQ_C4 = 261.6256;

  // 琴键色相映射（C → 暖红，B → 紫，跨越可见光谱）
  var HUE_MAP = [350, 18, 42, 95, 165, 200, 265, 350];

  // 氛围配色
  var PALETTES = {
    prism: {
      accent: '#22d3ee',
      accentGlow: 'rgba(34, 211, 238, 0.35)',
      accentSoft: 'rgba(34, 211, 238, 0.12)',
      stageGradient: 'radial-gradient(ellipse at 50% 110%, rgba(34,211,238,0.06) 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)',
      blobs: ['#155e75', '#1e1b4b', '#0e7490', '#312e81'],
      particle: [34, 211, 238]
    },
    dusk: {
      accent: '#f472b6',
      accentGlow: 'rgba(244, 114, 182, 0.35)',
      accentSoft: 'rgba(244, 114, 182, 0.12)',
      stageGradient: 'radial-gradient(ellipse at 50% 110%, rgba(244,114,182,0.06) 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)',
      blobs: ['#6d28d9', '#4c1d95', '#831843', '#5b21b6'],
      particle: [244, 114, 182]
    },
    ember: {
      accent: '#fb923c',
      accentGlow: 'rgba(251, 146, 60, 0.35)',
      accentSoft: 'rgba(251, 146, 60, 0.12)',
      stageGradient: 'radial-gradient(ellipse at 50% 110%, rgba(251,146,60,0.06) 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)',
      blobs: ['#7c2d12', '#431407', '#9a3412', '#713f12'],
      particle: [251, 146, 60]
    },
    moss: {
      accent: '#6ee7b7',
      accentGlow: 'rgba(110, 231, 183, 0.35)',
      accentSoft: 'rgba(110, 231, 183, 0.12)',
      stageGradient: 'radial-gradient(ellipse at 50% 110%, rgba(110,231,183,0.06) 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)',
      blobs: ['#166534', '#052e16', '#064e3b', '#14532d'],
      particle: [110, 231, 183]
    }
  };

  /* ===================================================================
     2. 全局状态
     =================================================================== */

  var state = {
    octave: 4, // 当前八度（基准 C4）
    timbre: 'glass',
    palette: 'prism',
    decay: 1.8, // 延音时长（秒）
    shimmer: 0.55, // 微光（高频泛音强度）
    force: 0.7, // 力度（0~1）
    sustain: false, // 持续模式
    autoPlaying: false,
    autoTimer: null,
    hasInteracted: false,
    voices: 0,
    ripples: [],
    particles: [],
    flowField: [],
    flowCols: 0,
    flowRows: 0,
    cellSize: 28,
    width: 0,
    height: 0,
    mouseX: -9999,
    mouseY: -9999,
    lastTime: 0,
    fps: 60,
    frameCount: 0,
    fpsAccum: 0,
    bars: []
  };

  /* ===================================================================
     3. DOM 元素
     =================================================================== */

  var dom = {};

  function cacheDom() {
    dom.canvas = document.getElementById('effectCanvas');
    dom.ctx = dom.canvas.getContext('2d');
    dom.barRack = document.getElementById('barRack');
    dom.stage = document.getElementById('stage');
    dom.stageHint = document.getElementById('stageHint');
    dom.cursorGlow = document.getElementById('cursor-glow');
    dom.octDisplay = document.getElementById('octDisplay');
    dom.octaveToggle = document.getElementById('octaveToggle');
    dom.sustainBtn = document.getElementById('sustainBtn');
    dom.timbreRow = document.getElementById('timbreRow');
    dom.paletteRow = document.getElementById('paletteRow');
    dom.sliderDecay = document.getElementById('sliderDecay');
    dom.sliderShimmer = document.getElementById('sliderShimmer');
    dom.sliderForce = document.getElementById('sliderForce');
    dom.btnAuto = document.getElementById('btnAuto');
    dom.btnClear = document.getElementById('btnClear');
    dom.statNote = document.getElementById('statNote');
    dom.statFreq = document.getElementById('statFreq');
    dom.statVoices = document.getElementById('statVoices');
    dom.statRipples = document.getElementById('statRipples');
    dom.statFps = document.getElementById('statFps');
    dom.blobEls = document.querySelectorAll('.blob');
  }

  /* ===================================================================
     4. Simplex 噪声（轻量内联实现，用于流场）
     =================================================================== */

  var perm = new Array(512);
  (function seedPermutation() {
    var p = new Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates 用固定 seed 的伪随机
    var s = 1337;
    function rand() {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    }
    for (var j = 255; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var tmp = p[j];
      p[j] = p[k];
      p[k] = tmp;
    }
    for (var n = 0; n < 512; n++) perm[n] = p[n & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(hash, x, y) {
    var h = hash & 7;
    var u = h < 4 ? x : y;
    var v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }

  function noise2D(x, y) {
    var X = Math.floor(x) & 255;
    var Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    var u = fade(x);
    var v = fade(y);
    var A = perm[X] + Y;
    var B = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
      lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  /* ===================================================================
     5. Web Audio 合成引擎
     =================================================================== */

  var audio = {
    ctx: null,
    master: null,
    reverbBus: null,
    dryBus: null,
    convolver: null
  };

  function ensureAudio() {
    if (audio.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC();

    // 主增益
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.55;
    audio.master.connect(audio.ctx.destination);

    // 干湿分离
    audio.dryBus = audio.ctx.createGain();
    audio.dryBus.gain.value = 0.7;
    audio.dryBus.connect(audio.master);

    audio.reverbBus = audio.ctx.createGain();
    audio.reverbBus.gain.value = 0.4;

    // 程序化生成卷积混响脉冲（指数衰减噪声）
    audio.convolver = audio.ctx.createConvolver();
    audio.convolver.buffer = makeImpulseResponse(2.6, 2.2);
    audio.reverbBus.connect(audio.convolver);
    audio.convolver.connect(audio.master);
  }

  function makeImpulseResponse(duration, decay) {
    var ctx = audio.ctx;
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * duration);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function midiToFreq(semitoneFromC4) {
    return BASE_FREQ_C4 * Math.pow(2, semitoneFromC4 / 12);
  }

  /**
   * 触发一个音
   * @param {number} semitone - 相对 C4 的半音数
   * @param {number} velocity - 力度 0~1
   */
  function playNote(semitone, velocity) {
    ensureAudio();
    if (audio.ctx.state === 'suspended') audio.ctx.resume();

    var ctx = audio.ctx;
    var now = ctx.currentTime;
    var freq = midiToFreq(semitone);
    var vel = Math.max(0.05, Math.min(1, velocity));
    var decaySec = state.decay;

    var out = ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(vel * 0.5, now + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, now + decaySec);

    // 干湿混合
    out.connect(audio.dryBus);
    out.connect(audio.reverbBus);

    var timbre = state.timbre;
    var shimmer = state.shimmer;

    if (timbre === 'glass') {
      // Glass：正弦 + 高八度微亮泛音 + 极弱三次泛音
      addOsc(out, freq, 'sine', 0.6, decaySec, 0);
      addOsc(out, freq * 2, 'sine', 0.18 * shimmer, decaySec * 0.7, 0.002);
      addOsc(out, freq * 3, 'triangle', 0.05 * shimmer, decaySec * 0.45, 0.004);
    } else if (timbre === 'crystal') {
      // Crystal：高泛音丰富，明亮脆透
      addOsc(out, freq, 'sine', 0.45, decaySec, 0);
      addOsc(out, freq * 2, 'sine', 0.3 * shimmer, decaySec * 0.8, 0.002);
      addOsc(out, freq * 3.01, 'sine', 0.18 * shimmer, decaySec * 0.6, 0.004);
      addOsc(out, freq * 4.97, 'sine', 0.08 * shimmer, decaySec * 0.4, 0.006);
    } else if (timbre === 'bell') {
      // Bell：非谐波 FM 钟铃（4.2 / 5.4 / 6.7 倍频）
      addOsc(out, freq, 'sine', 0.5, decaySec, 0);
      addOsc(out, freq * 2, 'sine', 0.2, decaySec * 0.85, 0.002);
      addOsc(out, freq * 2.756, 'sine', 0.15 * shimmer, decaySec * 0.7, 0.004);
      addOsc(out, freq * 5.404, 'sine', 0.08 * shimmer, decaySec * 0.5, 0.006);
    } else if (timbre === 'marimba') {
      // Marimba：三角波主体 + 快速衰减 + 轻微高频噪声起击
      addOsc(out, freq, 'triangle', 0.55, decaySec * 0.8, 0);
      addOsc(out, freq * 2, 'triangle', 0.12 * shimmer, decaySec * 0.5, 0.002);
      addOsc(out, freq * 4, 'sine', 0.05 * shimmer, decaySec * 0.3, 0.004);
    }

    // 持续模式：循环淡入淡出
    state.voices++;
    updateStatVoices();

    var stopAt = now + decaySec + 0.05;
    out.stopAt = stopAt;
    out.checkStop = function () {
      if (ctx.currentTime >= stopAt) {
        try { out.disconnect(); } catch (e) {}
        state.voices = Math.max(0, state.voices - 1);
        updateStatVoices();
        return true;
      }
      return false;
    };
    activeVoices.push(out);
  }

  function addOsc(dest, freq, type, gain, decay, startOffset) {
    var ctx = audio.ctx;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    var g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.004 + startOffset);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }

  var activeVoices = [];

  /* ===================================================================
     6. 琴键构建
     =================================================================== */

  function buildBars() {
    dom.barRack.innerHTML = '';
    state.bars = [];

    var rackHeight = dom.stage.clientHeight - 140; // padding 余量
    var minH = Math.max(120, rackHeight * 0.4);
    var maxH = Math.max(minH + 40, rackHeight);

    for (var i = 0; i < SCALE.length; i++) {
      var note = SCALE[i];
      var hue = HUE_MAP[i];

      // 琴键高度：低音更高，高音更短（非线性递减）
      var heightRatio = 1 - (i / (SCALE.length - 1)) * 0.55;
      var h = minH + (maxH - minH) * heightRatio;

      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = h + 'px';
      bar.style.setProperty('--bar-hue', 'hsl(' + hue + ', 85%, 62%)');
      bar.style.setProperty('--bar-hue-glow', 'hsla(' + hue + ', 85%, 60%, 0.5)');
      bar.setAttribute('role', 'button');
      bar.setAttribute('tabindex', '0');
      bar.setAttribute('aria-label', note.name + ' 键');

      var tint = document.createElement('div');
      tint.className = 'bar-tint';
      bar.appendChild(tint);

      var label = document.createElement('div');
      label.className = 'bar-label';
      label.textContent = note.name;
      bar.appendChild(label);

      var keyHint = document.createElement('div');
      keyHint.className = 'bar-key';
      keyHint.textContent = note.key.toUpperCase();
      bar.appendChild(keyHint);

      var barData = {
        el: bar,
        tintEl: tint,
        labelEl: label,
        index: i,
        note: note,
        hue: hue,
        baseHeight: h,
        spring: { pos: 0, vel: 0, target: 0 },
        glow: 0
      };
      state.bars.push(barData);

      // 鼠标 / 触摸事件
      (function (bd) {
        bd.el.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          strikeBar(bd, state.force);
        });
        bd.el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            strikeBar(bd, state.force);
          }
        });
      })(barData);

      dom.barRack.appendChild(bar);
    }
  }

  /* ===================================================================
     7. 击键触发 — 音频 + 物理 + 视觉
     =================================================================== */

  function strikeBar(barData, velocity) {
    var semitone = barData.note.semitone + (state.octave - 4) * 12;
    playNote(semitone, velocity);

    // 弹簧物理：给琴键一个瞬时冲击
    barData.spring.vel -= velocity * 28;

    // 视觉击键态
    barData.el.classList.add('struck');
    barData.glow = 1;
    setTimeout(function () {
      barData.el.classList.remove('struck');
    }, 280);

    // 谐振环
    spawnResonanceRing(barData);

    // 涟漪 + 粒子从琴键顶部迸发
    var rect = barData.el.getBoundingClientRect();
    var stageRect = dom.stage.getBoundingClientRect();
    var cx = rect.left - stageRect.left + rect.width / 2;
    var cy = rect.top - stageRect.top + 12;

    spawnRipple(cx, cy, barData.hue, velocity);
    spawnParticles(cx, cy, barData.hue, Math.floor(10 + velocity * 22));

    // 状态栏更新
    dom.statNote.textContent = barData.note.name + state.octave;
    dom.statFreq.innerHTML = midiToFreq(semitone).toFixed(1) + '<span class="stat-unit">Hz</span>';

    hideHint();
  }

  function spawnResonanceRing(barData) {
    var ring = document.createElement('div');
    ring.className = 'resonance-ring';
    ring.style.setProperty('--bar-hue', 'hsl(' + barData.hue + ', 85%, 62%)');
    barData.el.appendChild(ring);
    setTimeout(function () {
      if (ring.parentNode) ring.parentNode.removeChild(ring);
    }, 1300);
  }

  /* ===================================================================
     8. 涟漪系统
     =================================================================== */

  function spawnRipple(x, y, hue, strength) {
    state.ripples.push({
      x: x,
      y: y,
      radius: 4,
      maxRadius: 160 + strength * 220,
      hue: hue,
      alpha: 0.85,
      life: 1,
      strength: strength
    });
    if (state.ripples.length > 32) state.ripples.shift();
  }

  function updateRipples(dt) {
    for (var i = state.ripples.length - 1; i >= 0; i--) {
      var r = state.ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.06;
      r.life -= dt * 0.7;
      r.alpha = Math.max(0, r.life * 0.85);
      if (r.life <= 0) state.ripples.splice(i, 1);
    }
    updateStatRipples();
  }

  function drawRipples(ctx) {
    for (var i = 0; i < state.ripples.length; i++) {
      var r = state.ripples[i];
      // 主环
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + r.hue + ', 85%, 65%, ' + r.alpha + ')';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 内辉光环
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + r.hue + ', 90%, 75%, ' + r.alpha * 0.4 + ')';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 外淡环
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 1.18, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + r.hue + ', 85%, 65%, ' + r.alpha * 0.18 + ')';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  /* ===================================================================
     9. 粒子系统
     =================================================================== */

  function spawnParticles(x, y, hue, count) {
    for (var i = 0; i < count; i++) {
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      var speed = 1.5 + Math.random() * 4.5;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        size: 1 + Math.random() * 2.4,
        hue: hue + (Math.random() - 0.5) * 18,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        gravity: 0.06 + Math.random() * 0.04
      });
    }
    // 限制粒子总数
    if (state.particles.length > 600) {
      state.particles.splice(0, state.particles.length - 600);
    }
  }

  function updateParticles(dt) {
    var flowT = performance.now() * 0.00012;
    for (var i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];

      // Simplex 噪声流场扰动
      var fx = noise2D(p.x * 0.005, p.y * 0.005 + flowT * 8);
      var fy = noise2D(p.x * 0.005 + 100, p.y * 0.005 + flowT * 8);
      p.vx += fx * 0.12;
      p.vy += fy * 0.12;

      // 鼠标力场（轻微排斥）
      var dx = p.x - state.mouseX;
      var dy = p.y - state.mouseY;
      var distSq = dx * dx + dy * dy;
      if (distSq < 14400) {
        var f = (1 - distSq / 14400) * 0.6;
        var d = Math.sqrt(distSq) || 1;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }

      p.vy += p.gravity;
      p.vx *= 0.985;
      p.vy *= 0.992;

      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > state.height + 40) {
        state.particles.splice(i, 1);
      }
    }
  }

  function drawParticles(ctx) {
    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var alpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + p.hue + ', 90%, 70%, ' + alpha + ')';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'hsla(' + p.hue + ', 90%, 60%, ' + alpha * 0.7 + ')';
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  /* ===================================================================
     10. 背景流场粒子（持续氛围）
     =================================================================== */

  var ambientParticles = [];

  function initAmbientParticles() {
    ambientParticles = [];
    var count = 38;
    for (var i = 0; i < count; i++) {
      ambientParticles.push({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        size: 0.6 + Math.random() * 1.4,
        speed: 0.15 + Math.random() * 0.35,
        alpha: 0.1 + Math.random() * 0.25
      });
    }
  }

  function updateAndDrawAmbient(ctx, dt) {
    var flowT = performance.now() * 0.00006;
    var pal = PALETTES[state.palette];
    var pr = pal.particle[0], pg = pal.particle[1], pb = pal.particle[2];

    for (var i = 0; i < ambientParticles.length; i++) {
      var p = ambientParticles[i];
      var fx = noise2D(p.x * 0.003, p.y * 0.003 + flowT);
      var fy = noise2D(p.x * 0.003 + 50, p.y * 0.003 + flowT);

      p.x += fx * p.speed;
      p.y += fy * p.speed;

      // 包裹
      if (p.x < -10) p.x = state.width + 10;
      if (p.x > state.width + 10) p.x = -10;
      if (p.y < -10) p.y = state.height + 10;
      if (p.y > state.height + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',' + p.alpha + ')';
      ctx.fill();
    }
  }

  /* ===================================================================
     11. 弹簧-阻尼物理更新（琴键形变）
     =================================================================== */

  function updateBarSprings(dt) {
    var stiffness = 90;   // 弹簧刚度
    var damping = 11;     // 阻尼

    for (var i = 0; i < state.bars.length; i++) {
      var b = state.bars[i];
      var s = b.spring;

      // 半隐式欧拉积分
      var force = -stiffness * s.pos - damping * s.vel;
      s.vel += force * dt;
      s.pos += s.vel * dt;

      // 力度衰减
      b.glow *= 0.92;

      // 写回 DOM（压缩形变：translateY + scaleY）
      var compress = s.pos; // 一般为负值（向上压缩）
      var scaleY = 1 + s.pos * 0.004;
      var skewX = s.vel * 0.04;
      b.el.style.transform =
        'translateY(' + Math.max(-6, Math.min(6, -compress * 0.25)) + 'px) ' +
        'scaleY(' + Math.max(0.9, Math.min(1.08, scaleY)) + ') ' +
        'skewX(' + Math.max(-4, Math.min(4, skewX)) + 'deg)';

      // 击键亮度
      b.tintEl.style.opacity = (0.45 + b.glow * 0.5).toFixed(3);
    }
  }

  /* ===================================================================
     12. 主循环
     =================================================================== */

  function loop(now) {
    if (!state.lastTime) state.lastTime = now;
    var dt = Math.min(0.05, (now - state.lastTime) / 1000);
    state.lastTime = now;

    // FPS 计算
    state.frameCount++;
    state.fpsAccum += dt;
    if (state.fpsAccum >= 0.5) {
      state.fps = Math.round(state.frameCount / state.fpsAccum);
      state.frameCount = 0;
      state.fpsAccum = 0;
      dom.statFps.textContent = state.fps;
    }

    // 清理已结束的音
    for (var i = activeVoices.length - 1; i >= 0; i--) {
      if (activeVoices[i].checkStop()) activeVoices.splice(i, 1);
    }

    // 物理更新
    updateBarSprings(dt);
    updateRipples(dt);
    updateParticles(dt);

    // 渲染
    var ctx = dom.ctx;
    ctx.clearRect(0, 0, state.width, state.height);

    updateAndDrawAmbient(ctx, dt);
    drawRipples(ctx);
    drawParticles(ctx);

    requestAnimationFrame(loop);
  }

  /* ===================================================================
     13. 画布尺寸与流场
     =================================================================== */

  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = dom.stage.getBoundingClientRect();
    state.width = rect.width;
    state.height = rect.height;

    dom.canvas.width = state.width * dpr;
    dom.canvas.height = state.height * dpr;
    dom.canvas.style.width = state.width + 'px';
    dom.canvas.style.height = state.height + 'px';
    dom.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 流场网格列行
    state.flowCols = Math.ceil(state.width / state.cellSize) + 1;
    state.flowRows = Math.ceil(state.height / state.cellSize) + 1;

    initAmbientParticles();
    rebuildBarHeights();
  }

  function rebuildBarHeights() {
    if (!state.bars.length) return;
    var rackHeight = dom.stage.clientHeight - 140;
    var minH = Math.max(120, rackHeight * 0.4);
    var maxH = Math.max(minH + 40, rackHeight);

    for (var i = 0; i < state.bars.length; i++) {
      var b = state.bars[i];
      var heightRatio = 1 - (i / (state.bars.length - 1)) * 0.55;
      var h = minH + (maxH - minH) * heightRatio;
      b.baseHeight = h;
      b.el.style.height = h + 'px';
    }
  }

  /* ===================================================================
     14. UI 绑定
     =================================================================== */

  function bindUI() {
    // 八度切换
    dom.octaveToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-oct]');
      if (!btn) return;
      var delta = parseInt(btn.getAttribute('data-oct'), 10);
      setOctave(state.octave + delta);
    });

    // 持续模式
    dom.sustainBtn.addEventListener('click', function () {
      state.sustain = !state.sustain;
      dom.sustainBtn.setAttribute('aria-pressed', String(state.sustain));
      if (state.sustain) {
        // 持续模式下自动重复最后击键（由自动演奏代替）
      }
    });

    // 音色切换
    dom.timbreRow.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-timbre]');
      if (!btn) return;
      dom.timbreRow.querySelectorAll('.timbre-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.timbre = btn.getAttribute('data-timbre');
    });

    // 配色切换
    dom.paletteRow.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-palette]');
      if (!btn) return;
      dom.paletteRow.querySelectorAll('.palette-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      setPalette(btn.getAttribute('data-palette'));
    });

    // 滑块
    dom.sliderDecay.addEventListener('input', function () {
      state.decay = parseInt(dom.sliderDecay.value, 10) / 100;
    });
    dom.sliderShimmer.addEventListener('input', function () {
      state.shimmer = parseInt(dom.sliderShimmer.value, 10) / 100;
    });
    dom.sliderForce.addEventListener('input', function () {
      state.force = parseInt(dom.sliderForce.value, 10) / 100;
    });

    // 自动演奏
    dom.btnAuto.addEventListener('click', function () {
      toggleAuto();
    });

    // 清空
    dom.btnClear.addEventListener('click', function () {
      state.ripples = [];
      state.particles = [];
      // 衰减所有正在响的音
      activeVoices.forEach(function (v) {
        try { v.gain.cancelScheduledValues(audio.ctx.currentTime); } catch (e) {}
      });
    });

    // 键盘
    document.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      var key = e.key.toLowerCase();

      // 八度切换
      if (key === 'z') { setOctave(state.octave - 1); return; }
      if (key === 'x') { setOctave(state.octave + 1); return; }

      // 空格切换持续
      if (key === ' ') {
        e.preventDefault();
        dom.sustainBtn.click();
        return;
      }

      for (var i = 0; i < state.bars.length; i++) {
        if (state.bars[i].note.key === key) {
          strikeBar(state.bars[i], state.force);
          return;
        }
      }
    });

    // 光标光晕
    window.addEventListener('pointermove', function (e) {
      state.mouseX = e.clientX - dom.stage.getBoundingClientRect().left;
      state.mouseY = e.clientY - dom.stage.getBoundingClientRect().top;
      dom.cursorGlow.style.left = e.clientX + 'px';
      dom.cursorGlow.style.top = e.clientY + 'px';
      dom.cursorGlow.classList.add('visible');
    });
    window.addEventListener('pointerleave', function () {
      dom.cursorGlow.classList.remove('visible');
    });

    // 舞台点击（空白处也产生涟漪）
    dom.stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.bar')) return; // 琴键已处理
      var rect = dom.stage.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var hue = PALETTES[state.palette].particle[0];
      // 用当前 accent 色相做涟漪
      var accentHue = getAccentHue();
      spawnRipple(x, y, accentHue, 0.4);
      spawnParticles(x, y, accentHue, 12);
      hideHint();
    });

    // 窗口尺寸
    window.addEventListener('resize', resizeCanvas);
  }

  function getAccentHue() {
    // 从当前 palette accent hex 反推色相（粗略）
    var map = { prism: 188, dusk: 327, ember: 28, moss: 152 };
    return map[state.palette] || 188;
  }

  function setOctave(oct) {
    state.octave = Math.max(1, Math.min(7, oct));
    dom.octDisplay.textContent = 'C' + state.octave;
  }

  function setPalette(name) {
    state.palette = name;
    var p = PALETTES[name];
    if (!p) return;
    document.documentElement.style.setProperty('--accent', p.accent);
    document.documentElement.style.setProperty('--accent-glow', p.accentGlow);
    document.documentElement.style.setProperty('--accent-soft', p.accentSoft);
    dom.stage.style.background = p.stageGradient;

    // 渐变 blob 颜色
    if (dom.blobEls.length === 4) {
      dom.blobEls[0].style.background = 'radial-gradient(circle, ' + p.blobs[0] + ' 0%, transparent 70%)';
      dom.blobEls[1].style.background = 'radial-gradient(circle, ' + p.blobs[1] + ' 0%, transparent 70%)';
      dom.blobEls[2].style.background = 'radial-gradient(circle, ' + p.blobs[2] + ' 0%, transparent 70%)';
      dom.blobEls[3].style.background = 'radial-gradient(circle, ' + p.blobs[3] + ' 0%, transparent 70%)';
    }
  }

  /* ===================================================================
     15. 自动演奏
     =================================================================== */

  var AUTO_MELODIES = [
    [0, 2, 4, 2, 5, 4, 2, 0, 4, 7, 5, 4, 2, 4, 0, -1],
    [0, 4, 7, 4, 5, 2, 0, 5, 7, 5, 4, 2, 0, 2, 4, 7],
    [7, 5, 4, 2, 0, 2, 4, 5, 7, 4, 2, 0, 4, 2, 0, -1],
    [0, 0, 4, 4, 5, 5, 4, 2, 2, 0, 0, 2, 4, 4, 2, 2]
  ];

  function toggleAuto() {
    state.autoPlaying = !state.autoPlaying;
    dom.btnAuto.classList.toggle('active', state.autoPlaying);

    if (state.autoPlaying) {
      runAuto();
    } else if (state.autoTimer) {
      clearTimeout(state.autoTimer);
      state.autoTimer = null;
    }
  }

  function runAuto() {
    if (!state.autoPlaying) return;
    var melody = AUTO_MELODIES[Math.floor(Math.random() * AUTO_MELODIES.length)];
    var step = 0;

    function next() {
      if (!state.autoPlaying) return;
      var idx = melody[step % melody.length];
      if (idx >= 0 && idx < state.bars.length) {
        strikeBar(state.bars[idx], 0.5 + Math.random() * 0.35);
      }
      step++;
      var interval = 280 + Math.random() * 220;
      state.autoTimer = setTimeout(next, interval);
    }
    next();
  }

  /* ===================================================================
     16. 状态栏与提示
     =================================================================== */

  function updateStatVoices() {
    dom.statVoices.textContent = state.voices;
  }
  function updateStatRipples() {
    dom.statRipples.textContent = state.ripples.length;
  }

  function hideHint() {
    if (state.hasInteracted) return;
    state.hasInteracted = true;
    dom.stageHint.classList.add('hidden');
  }

  /* ===================================================================
     17. 初始化
     =================================================================== */

  function init() {
    cacheDom();
    buildBars();
    resizeCanvas();
    setPalette(state.palette);
    bindUI();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
