/* ============================================================
   Watercolor 水彩秘境 — 主交互逻辑
   Kuwahara 水彩 NPR + 鼠标交互 + Web Audio API 音效
   ============================================================ */

(function() {
    'use strict';

    // ========================================
    // 配置常量
    // ========================================
    const CONFIG = {
        // 水彩参数
        watercolor: {
            strokeWidth: 60,
            minWidth: 20,
            maxWidth: 120,
            bleedRadius: 80,
            pigmentOpacity: 0.4,
            bleedOpacity: 0.15,
            turbulenceScale: 0.003,
            turbulenceOctaves: 4,
            decayRate: 0.0003,
            drySpeed: 0.5
        },
        // 颜色映射
        colors: {
            indigo: { h: 239, s: 84, l: 67 },
            rose: { h: 350, s: 89, l: 58 },
            emerald: { h: 160, s: 84, l: 42 },
            amber: { h: 38, s: 92, l: 51 },
            violet: { h: 258, s: 86, l: 64 }
        },
        // 音频参数
        audio: {
            susurrusBaseFreq: 180,
            susurrusModFreq: 0.5,
            noiseGain: 0.03,
            oscillatorGain: 0.015,
            filterQ: 8,
            filterFreqBase: 400,
            filterFreqRange: 600
        }
    };

    // ========================================
    // 状态
    // ========================================
    const state = {
        canvas: null,
        ctx: null,
        offscreenCanvas: null,
        offscreenCtx: null,
        width: 0,
        height: 0,
        lastX: 0,
        lastY: 0,
        lastTime: 0,
        velocity: 0,
        isDrawing: false,
        hasInteracted: false,
        currentColor: 'indigo',
        soundEnabled: true,
        audioContext: null,
        masterGain: null,
        noiseNode: null,
        oscillators: [],
        particles: [],
        cursor: null,
        cursorTrail: []
    };

    // ========================================
    // Simplex Noise 实现 (简化版)
    // ========================================
    class SimplexNoise {
        constructor(seed = Math.random()) {
            this.p = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                this.p[i] = i;
            }
            for (let i = 255; i > 0; i--) {
                const j = Math.floor((seed = (seed * 16807) % 2147483647) / 2147483647 * (i + 1));
                [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
            }
            this.perm = new Uint8Array(512);
            for (let i = 0; i < 512; i++) {
                this.perm[i] = this.p[i & 255];
            }
        }

        noise2D(x, y) {
            const F2 = 0.5 * (Math.sqrt(3) - 1);
            const G2 = (3 - Math.sqrt(3)) / 6;
            const s = (x + y) * F2;
            const i = Math.floor(x + s);
            const j = Math.floor(y + s);
            const t = (i + j) * G2;
            const X0 = i - t;
            const Y0 = j - t;
            const x0 = x - X0;
            const y0 = y - Y0;
            let i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }
            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2;
            const y2 = y0 - 1 + 2 * G2;
            const ii = i & 255;
            const jj = j & 255;
            const grad = (hash, x, y) => {
                const h = hash & 7;
                const u = h < 4 ? x : y;
                const v = h < 4 ? y : x;
                return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
            };
            let n0 = 0, n1 = 0, n2 = 0;
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                t0 *= t0;
                n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0);
            }
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                t1 *= t1;
                n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
            }
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                t2 *= t2;
                n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
            }
            return 70 * (n0 + n1 + n2);
        }

        fbm(x, y, octaves = 4) {
            let value = 0;
            let amplitude = 1;
            let frequency = 1;
            let maxValue = 0;
            for (let i = 0; i < octaves; i++) {
                value += amplitude * this.noise2D(x * frequency, y * frequency);
                maxValue += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }
            return value / maxValue;
        }
    }

    const noise = new SimplexNoise();

    // ========================================
    // 工具函数
    // ========================================
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function hslToString(h, s, l, a = 1) {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }

    function getCurrentHSL() {
        return CONFIG.colors[state.currentColor];
    }

    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // ========================================
    // Canvas 初始化
    // ========================================
    function initCanvas() {
        state.canvas = document.getElementById('watercolor-canvas');
        state.ctx = state.canvas.getContext('2d', { alpha: true });

        // 创建离屏 canvas 用于水彩效果
        state.offscreenCanvas = document.createElement('canvas');
        state.offscreenCtx = state.offscreenCanvas.getContext('2d', { alpha: true });

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        const container = state.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        state.width = rect.width;
        state.height = rect.height;

        state.canvas.width = state.width * dpr;
        state.canvas.height = state.height * dpr;
        state.canvas.style.width = state.width + 'px';
        state.canvas.style.height = state.height + 'px';

        state.offscreenCanvas.width = state.canvas.width;
        state.offscreenCanvas.height = state.canvas.height;

        state.ctx.scale(dpr, dpr);
        state.offscreenCtx.scale(dpr, dpr);

        // 重绘背景
        redrawBackground();
    }

    function redrawBackground() {
        state.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        state.ctx.fillRect(0, 0, state.width, state.height);

        state.offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        state.offscreenCtx.fillRect(0, 0, state.width, state.height);
    }

    // ========================================
    // 水彩渲染核心
    // ========================================
    function renderWatercolorStroke(x, y, width, color, velocity) {
        const ctx = state.offscreenCtx;
        const dpr = window.devicePixelRatio || 1;
        const cx = x * dpr;
        const cy = y * dpr;
        const radius = width * dpr;
        const hsl = color;

        // 主笔触 - Kuwahara 风格的水彩颗粒
        const strokeCount = Math.floor(radius / 3);
        for (let i = 0; i < strokeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            const pr = radius * (0.2 + Math.random() * 0.6);

            // 噪声驱动的形状不规则性
            const noiseVal = noise.fbm(px * 0.01, py * 0.01, 3);
            const shapeNoise = noise.fbm(px * 0.02, py * 0.02, 2);

            // 颜料晕染边缘
            const bleedFactor = 1 + shapeNoise * 0.5;
            const bleedRadius = pr * bleedFactor;

            // 创建径向渐变模拟水彩颜料分布
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, bleedRadius);
            const baseOpacity = CONFIG.watercolor.pigmentOpacity * (1 - velocity * 0.3);
            gradient.addColorStop(0, hslToString(hsl.h, hsl.s, hsl.l, baseOpacity));
            gradient.addColorStop(0.3, hslToString(hsl.h, hsl.s, hsl.l, baseOpacity * 0.7));
            gradient.addColorStop(0.6, hslToString(hsl.h, hsl.s * 0.9, hsl.l, baseOpacity * 0.4));
            gradient.addColorStop(1, hslToString(hsl.h, hsl.s * 0.7, hsl.l, 0));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(px, py, bleedRadius, bleedRadius * (0.7 + Math.abs(shapeNoise) * 0.4), noiseVal * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // 晕染效果 - 在笔触周围添加柔和的边缘
        const bleedCount = Math.floor(strokeCount * 0.5);
        for (let i = 0; i < bleedCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = radius * (0.6 + Math.random() * 0.8);
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            const pr = radius * (0.3 + Math.random() * 0.5);

            const shapeNoise = noise.fbm(px * 0.015, py * 0.015, 2);
            const bleedGradient = ctx.createRadialGradient(px, py, 0, px, py, pr * 2);
            const bleedOpacity = CONFIG.watercolor.bleedOpacity * Math.random();
            bleedGradient.addColorStop(0, hslToString(hsl.h, hsl.s * 0.8, hsl.l, bleedOpacity));
            bleedGradient.addColorStop(0.5, hslToString(hsl.h, hsl.s * 0.6, hsl.l, bleedOpacity * 0.5));
            bleedGradient.addColorStop(1, hslToString(hsl.h, hsl.s * 0.4, hsl.l, 0));

            ctx.fillStyle = bleedGradient;
            ctx.beginPath();
            ctx.ellipse(px, py, pr * 2, pr * 1.5, shapeNoise * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // 添加一些细微的颜料颗粒
        const particleCount = Math.floor(radius / 5);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;

            ctx.fillStyle = hslToString(hsl.h + (Math.random() - 0.5) * 20, hsl.s, hsl.l + (Math.random() - 0.5) * 10, 0.1 + Math.random() * 0.15);
            ctx.beginPath();
            ctx.arc(px, py, 1 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function interpolateStroke(x0, y0, x1, y1, width, color, velocity) {
        const dist = distance(x0, y0, x1, y1);
        const steps = Math.max(1, Math.floor(dist / (width * 0.15)));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const ix = lerp(x0, x1, t);
            const iy = lerp(y0, y1, t);
            const w = width * (1 - t * 0.3);
            renderWatercolorStroke(ix, iy, w, color, velocity);
        }
    }

    // ========================================
    // 粒子系统 (水彩颗粒)
    // ========================================
    function createParticle(x, y, color, velocity) {
        return {
            x, y,
            vx: (Math.random() - 0.5) * velocity * 0.5,
            vy: (Math.random() - 0.5) * velocity * 0.5,
            size: 2 + Math.random() * 4,
            life: 1,
            decay: 0.002 + Math.random() * 0.002,
            color: color,
            hueShift: (Math.random() - 0.5) * 15
        };
    }

    function updateParticles() {
        const ctx = state.offscreenCtx;
        const dpr = window.devicePixelRatio || 1;

        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= p.decay;

            if (p.life <= 0) {
                state.particles.splice(i, 1);
                continue;
            }

            // 绘制粒子
            const px = p.x * dpr;
            const py = p.y * dpr;
            const alpha = p.life * 0.3;
            ctx.fillStyle = hslToString(p.color.h + p.hueShift, p.color.s, p.color.l, alpha);
            ctx.beginPath();
            ctx.arc(px, py, p.size * dpr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function spawnParticles(x, y, color, velocity, count) {
        for (let i = 0; i < count; i++) {
            state.particles.push(createParticle(x, y, color, velocity));
        }
    }

    // ========================================
    // Web Audio API 音效
    // ========================================
    function initAudio() {
        if (state.audioContext) return;

        try {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            state.masterGain = state.audioContext.createGain();
            state.masterGain.gain.value = 0;
            state.masterGain.connect(state.audioContext.destination);

            // 创建噪声节点 (用于水声)
            createNoiseNode();

            // 创建振荡器 (用于柔和的底音)
            createOscillators();

            state.audioContext.resume();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            state.soundEnabled = false;
        }
    }

    function createNoiseNode() {
        const bufferSize = 2 * state.audioContext.sampleRate;
        const noiseBuffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        state.noiseNode = state.audioContext.createBufferSource();
        state.noiseNode.buffer = noiseBuffer;
        state.noiseNode.loop = true;

        const noiseFilter = state.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = CONFIG.audio.filterFreqBase;
        noiseFilter.Q.value = CONFIG.audio.filterQ;

        const noiseGain = state.audioContext.createGain();
        noiseGain.gain.value = 0;

        state.noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(state.masterGain);

        state.noiseGain = noiseGain;
        state.noiseFilter = noiseFilter;
        state.noiseNode.start();
    }

    function createOscillators() {
        const oscCount = 3;
        const baseFreq = CONFIG.audio.susurrusBaseFreq;

        for (let i = 0; i < oscCount; i++) {
            const osc = state.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = baseFreq * (1 + i * 0.5) + Math.random() * 20;

            const oscGain = state.audioContext.createGain();
            oscGain.gain.value = 0;

            const oscFilter = state.audioContext.createBiquadFilter();
            oscFilter.type = 'lowpass';
            oscFilter.frequency.value = 300 + i * 100;

            osc.connect(oscFilter);
            oscFilter.connect(oscGain);
            oscGain.connect(state.masterGain);

            osc.start();

            state.oscillators.push({ osc, oscGain, oscFilter });
        }
    }

    function updateAudio(velocity, pressure) {
        if (!state.soundEnabled || !state.audioContext) return;

        const targetGain = velocity * CONFIG.audio.noiseGain * pressure;
        const currentTime = state.audioContext.currentTime;

        // 平滑过渡噪声增益
        if (state.noiseGain) {
            state.noiseGain.gain.cancelScheduledValues(currentTime);
            state.noiseGain.gain.setTargetAtTime(targetGain, currentTime, 0.05);
        }

        // 更新噪声滤波器频率
        if (state.noiseFilter) {
            const filterFreq = CONFIG.audio.filterFreqBase + velocity * CONFIG.audio.filterFreqRange;
            state.noiseFilter.frequency.cancelScheduledValues(currentTime);
            state.noiseFilter.frequency.setTargetAtTime(filterFreq, currentTime, 0.1);
        }

        // 更新振荡器
        const oscGainTarget = velocity * CONFIG.audio.oscillatorGain * pressure;
        state.oscillators.forEach((item, i) => {
            item.oscGain.gain.cancelScheduledValues(currentTime);
            item.oscGain.gain.setTargetAtTime(oscGainTarget * (1 - i * 0.2), currentTime, 0.08);

            // 频率根据速度微调
            const freqMod = CONFIG.audio.susurrusModFreq * Math.sin(currentTime * 0.5 + i);
            item.osc.frequency.cancelScheduledValues(currentTime);
            item.osc.frequency.setTargetAtTime(
                (CONFIG.audio.susurrusBaseFreq + i * 30) * (1 + velocity * 0.3) + freqMod,
                currentTime,
                0.1
            );
        });
    }

    function fadeOutAudio() {
        if (!state.soundEnabled || !state.audioContext || !state.masterGain) return;

        const currentTime = state.audioContext.currentTime;
        state.masterGain.gain.cancelScheduledValues(currentTime);
        state.masterGain.gain.setTargetAtTime(0, currentTime, 0.3);
    }

    // ========================================
    // 自定义光标
    // ========================================
    function initCursor() {
        state.cursor = document.createElement('div');
        state.cursor.className = 'custom-cursor';
        document.body.appendChild(state.cursor);

        // 初始化光标位置
        state.cursor.style.left = '-100px';
        state.cursor.style.top = '-100px';
    }

    function updateCursor(x, y, velocity) {
        if (!state.cursor) return;

        state.cursor.style.left = x + 'px';
        state.cursor.style.top = y + 'px';

        // 根据速度调整光标大小
        const scale = 1 + velocity * 0.5;
        const size = 24 * scale;
        state.cursor.style.width = size + 'px';
        state.cursor.style.height = size + 'px';

        // 根据当前颜色设置光标颜色
        const hsl = getCurrentHSL();
        state.cursor.style.background = hslToString(hsl.h, hsl.s, hsl.l, 0.3);
        state.cursor.style.boxShadow = `0 0 ${20 + velocity * 30}px ${hslToString(hsl.h, hsl.s, hsl.l, 0.2)}`;
    }

    function showCursor() {
        if (state.cursor) {
            state.cursor.style.opacity = '1';
        }
    }

    function hideCursor() {
        if (state.cursor) {
            state.cursor.style.opacity = '0';
        }
    }

    // ========================================
    // 事件处理
    // ========================================
    function handleMouseMove(e) {
        const rect = state.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const currentTime = Date.now();
        const dt = currentTime - state.lastTime;

        // 计算速度
        const dx = x - state.lastX;
        const dy = y - state.lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const velocity = dt > 0 ? Math.min(1, dist / dt * 10) : 0;

        // 隐藏提示
        if (!state.hasInteracted) {
            state.hasInteracted = true;
            const overlay = document.getElementById('canvas-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
        }

        // 计算笔触宽度
        const baseWidth = CONFIG.watercolor.strokeWidth;
        const widthFactor = 1 - velocity * 0.5;
        const strokeWidth = clamp(baseWidth * widthFactor, CONFIG.watercolor.minWidth, CONFIG.watercolor.maxWidth);

        // 绘制水彩笔触
        if (state.isDrawing || velocity > 0.1) {
            const color = getCurrentHSL();
            const pressure = e.buttons === 1 ? 1 : 0.5;

            if (state.lastX && state.lastY) {
                interpolateStroke(state.lastX, state.lastY, x, y, strokeWidth, color, velocity);
            } else {
                renderWatercolorStroke(x, y, strokeWidth, color, velocity);
            }

            // 生成粒子
            if (Math.random() < 0.3) {
                spawnParticles(x, y, color, velocity, Math.floor(3 + velocity * 5));
            }
        }

        // 更新状态
        state.lastX = x;
        state.lastY = y;
        state.lastTime = currentTime;
        state.velocity = velocity;

        // 更新音频
        updateAudio(velocity, e.buttons === 1 ? 1 : 0.5);

        // 更新光标
        updateCursor(e.clientX, e.clientY, velocity);

        // 更新光标悬停状态
        const target = e.target;
        if (target.classList.contains('color-swatch') || target.classList.contains('icon-btn')) {
            state.cursor.classList.add('hovering');
        } else {
            state.cursor.classList.remove('hovering');
        }
    }

    function handleMouseDown(e) {
        state.isDrawing = true;
        state.lastX = e.clientX - state.canvas.getBoundingClientRect().left;
        state.lastY = e.clientY - state.canvas.getBoundingClientRect().top;
        state.lastTime = Date.now();

        // 初始化音频 (需要用户交互才能播放)
        if (state.soundEnabled && !state.audioContext) {
            initAudio();
        }
    }

    function handleMouseUp() {
        state.isDrawing = false;
        state.velocity = 0;
        fadeOutAudio();
    }

    function handleMouseLeave() {
        state.isDrawing = false;
        state.velocity = 0;
        hideCursor();
        fadeOutAudio();
    }

    function handleMouseEnter(e) {
        showCursor();
        if (state.audioContext && state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }
    }

    // ========================================
    // 颜色选择
    // ========================================
    function initColorPalette() {
        const swatches = document.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                swatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                state.currentColor = swatch.dataset.color;
            });
        });
    }

    // ========================================
    // 控制按钮
    // ========================================
    function initControls() {
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                state.particles = [];
                redrawBackground();
            });
        }

        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                state.soundEnabled = !state.soundEnabled;
                soundToggle.classList.toggle('active', state.soundEnabled);

                if (state.soundEnabled && state.audioContext && state.audioContext.state === 'suspended') {
                    state.audioContext.resume();
                }
            });
        }
    }

    // ========================================
    // 动画循环
    // ========================================
    function animate() {
        // 清空主画布
        state.ctx.clearRect(0, 0, state.width, state.height);

        // 添加轻微的衰减效果
        state.ctx.fillStyle = 'rgba(0, 0, 0, 0.008)';
        state.ctx.fillRect(0, 0, state.width, state.height);

        // 绘制离屏 canvas 内容
        state.ctx.drawImage(state.offscreenCanvas, 0, 0, state.width * (window.devicePixelRatio || 1), state.height * (window.devicePixelRatio || 1), 0, 0, state.width, state.height);

        // 更新粒子
        updateParticles();

        // 应用水彩滤镜效果 (可选的额外处理)
        applyWatercolorFilter();

        requestAnimationFrame(animate);
    }

    function applyWatercolorFilter() {
        // 可以在这里添加额外的滤镜处理
        // 例如轻微的模糊或者混合模式效果
    }

    // ========================================
    // 初始化
    // ========================================
    function init() {
        initCanvas();
        initCursor();
        initColorPalette();
        initControls();

        // 绑定事件
        state.canvas.addEventListener('mousemove', handleMouseMove);
        state.canvas.addEventListener('mousedown', handleMouseDown);
        state.canvas.addEventListener('mouseup', handleMouseUp);
        state.canvas.addEventListener('mouseleave', handleMouseLeave);
        state.canvas.addEventListener('mouseenter', handleMouseEnter);

        // 触摸支持
        state.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: e.target,
                buttons: 1
            });
        }, { passive: false });

        state.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = state.canvas.getBoundingClientRect();
            handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                buttons: 1
            });
        });

        state.canvas.addEventListener('touchend', handleMouseUp);

        // 初始化音频 (预加载但延迟激活)
        if (state.soundEnabled) {
            initAudio();
        }

        // 启动动画循环
        animate();
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
