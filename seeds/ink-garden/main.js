/**
 * Ink Garden · 墨韵花园
 * 点击或拖拽播下墨的种子，看它们生长为摇曳的墨韵花草。
 * 四种花型 × 四种氛围配色 × 风场与扩散参数调节。
 *
 * 免构建：Vanilla JS + Canvas 2D
 */
(function inkGarden(global) {
    'use strict';

    // === DOM Elements ===
    const canvas = document.getElementById('garden-canvas');
    const ctx = canvas.getContext('2d');
    const cursorGlow = document.getElementById('cursor-glow');
    const stageHint = document.getElementById('stage-hint');
    const bloomCountEl = document.getElementById('bloom-count');
    const fpsCounterEl = document.getElementById('fps-counter');
    const windSlider = document.getElementById('wind-slider');
    const spreadSlider = document.getElementById('spread-slider');
    const themeToggle = document.getElementById('theme-toggle');
    const bloomModeGroup = document.getElementById('bloom-mode');
    const particleToggle = document.getElementById('particle-toggle');
    const harvestBtn = document.getElementById('btn-harvest');
    const fullscreenBtn = document.getElementById('btn-fullscreen');

    // === Themes (canvas palettes) ===
    const THEMES = {
        'garden-night': {
            branch: 'rgba(210, 225, 250, 0.85)',
            branchSoft: 'rgba(150, 170, 210, 0.4)',
            blossom: ['#8fb4ff', '#c9a6ff', '#7de3ff'],
            mote: 'rgba(180, 200, 255, 0.5)'
        },
        'garden-moon': {
            branch: 'rgba(40, 48, 72, 0.85)',
            branchSoft: 'rgba(80, 90, 120, 0.4)',
            blossom: ['#4d5f9e', '#7a5f9e', '#3f7f9e'],
            mote: 'rgba(60, 70, 110, 0.45)'
        },
        'garden-crimson': {
            branch: 'rgba(244, 226, 220, 0.85)',
            branchSoft: 'rgba(180, 130, 120, 0.4)',
            blossom: ['#ff8f7a', '#ffb48f', '#e85d6d'],
            mote: 'rgba(255, 170, 150, 0.5)'
        },
        'garden-void': {
            branch: 'rgba(215, 235, 245, 0.85)',
            branchSoft: 'rgba(110, 240, 208, 0.35)',
            blossom: ['#6ef0d0', '#8fb4ff', '#b8f4e8'],
            mote: 'rgba(140, 240, 215, 0.45)'
        }
    };

    // === State ===
    const state = {
        theme: 'garden-night',
        mode: 'branch',
        wind: 0.32,
        spread: 0.55,
        particlesOn: true,
        plants: [],
        motes: [],
        pointer: { x: -9999, y: -9999, active: false },
        time: 0,
        harvesting: false
    };

    const EASE = { outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) };
    const rand = (min, max) => min + Math.random() * (max - min);

    // === Resize ===
    let W = 0;
    let H = 0;
    let DPR = 1;

    function resize() {
        DPR = Math.min(global.devicePixelRatio || 1, 2);
        W = global.innerWidth;
        H = global.innerHeight;
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // === Plant Factory ===
    // 每株植物由递归生成的 branch 片段构成；growth 按深度错峰生长。
    function buildPlant(x, y, opts) {
        const scale = opts.scale;
        const plant = {
            x, y,
            mode: state.mode,
            born: state.time,
            phase: rand(0, Math.PI * 2),
            swayFreq: rand(0.5, 0.9),
            segments: [],
            blossoms: [],
            blots: opts.mode === 'blot' ? buildBlots(x, y, scale) : null,
            life: 1,
            fading: false
        };
        if (opts.mode !== 'blot') {
            const depthLimit = opts.mode === 'grass' ? 2 : (opts.big ? 4 : 3);
            growBranch(plant, x, y, -Math.PI / 2, scale * (opts.big ? 120 : 76), 0, depthLimit, opts);
        }
        return plant;
    }

    function growBranch(plant, x, y, angle, length, depth, depthLimit, opts) {
        const spreadAmount = 0.25 + state.spread * 0.65;
        const seg = {
            x, y,
            angle,
            length,
            depth,
            delay: depth * 0.28 + rand(0, 0.1),
            curve: rand(-0.25, 0.25) * (1 + state.spread),
            width: Math.max(0.8, 5.4 * Math.pow(0.62, depth))
        };
        plant.segments.push(seg);

        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        if (depth >= depthLimit) {
            plant.blossoms.push({
                x: endX, y: endY, depth,
                delay: seg.delay + 0.55,
                size: rand(7, 14) * (0.7 + state.spread * 0.8),
                hue: Math.floor(rand(0, 3)),
                petals: Math.floor(rand(5, 9)),
                rot: rand(0, Math.PI * 2)
            });
            return;
        }

        const branches = opts.mode === 'grass' ? 2 : (depth === 0 ? (opts.big ? 3 : 2) : 2);
        for (let i = 0; i < branches; i++) {
            const t = branches === 1 ? 0 : i / (branches - 1) - 0.5;
            const childAngle = angle + t * 2 * spreadAmount + rand(-0.18, 0.18) * (0.5 + state.spread);
            const childLen = length * rand(0.58, 0.74);
            growBranch(plant, endX, endY, childAngle, childLen, depth + 1, depthLimit, opts);
        }
    }

    function buildBlots(x, y, scale) {
        const blots = [];
        const layers = 3 + Math.floor(rand(0, 2));
        for (let i = 0; i < layers; i++) {
            const points = [];
            const pts = 9;
            for (let p = 0; p < pts; p++) {
                points.push(0.6 + Math.random() * 0.55);
            }
            blots.push({
                x: x + rand(-scale * 0.25, scale * 0.25),
                y: y + rand(-scale * 0.25, scale * 0.25),
                radius: scale * rand(14, 34),
                delay: i * 0.35,
                points,
                rot: rand(0, Math.PI * 2),
                hue: Math.floor(rand(0, 3))
            });
        }
        return blots;
    }

    function plantSeed(x, y, big) {
        if (state.plants.length > 90) {
            state.plants.shift();
        }
        const opts = { mode: state.mode, scale: rand(0.8, 1.25), big: !!big };
        state.plants.push(buildPlant(x, y, opts));
        spawnBurst(x, y, big ? 26 : 12);
        stageHint.classList.add('hidden');
        updateCount();
    }

    // === Ink Motes (ambient particles) ===
    function spawnBurst(x, y, n) {
        for (let i = 0; i < n; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(18, 90);
            state.motes.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 26,
                life: 1,
                decay: rand(0.3, 0.8),
                size: rand(1, 2.6),
                drift: rand(0, Math.PI * 2)
            });
        }
    }

    function spawnAmbient() {
        if (!state.particlesOn || state.motes.length > 140) return;
        state.motes.push({
            x: rand(0, W),
            y: H + 8,
            vx: rand(-6, 6),
            vy: rand(-26, -10),
            life: 1,
            decay: rand(0.04, 0.1),
            size: rand(0.8, 2.2),
            drift: rand(0, Math.PI * 2)
        });
    }

    // === Rendering ===
    function swayAngle(plant, depth, x) {
        const windAmp = state.wind * 0.34;
        const localWind = Math.sin(state.time * plant.swayFreq + plant.phase + depth * 0.7) * windAmp;
        const pointerBend = bendFromPointer(x, plant.y);
        return localWind + pointerBend * (0.12 + depth * 0.1);
    }

    function bendFromPointer(x, y) {
        if (!state.pointer.active) return 0;
        const dx = x - state.pointer.x;
        const dy = y - state.pointer.y;
        const dist = Math.hypot(dx, dy);
        const radius = 130;
        if (dist > radius || dist < 1) return 0;
        const force = (1 - dist / radius);
        return Math.sign(dx || 1) * force * force * 1.4;
    }

    function drawPlant(plant) {
        const age = state.time - plant.born;
        const alpha = plant.fading ? plant.life : 1;
        const theme = THEMES[state.theme];

        if (plant.mode === 'blot') {
            drawBlots(plant, age, alpha, theme);
            return;
        }

        ctx.lineCap = 'round';
        const endpoints = [];

        for (const seg of plant.segments) {
            const t = Math.min(Math.max((age - seg.delay) / 0.9, 0), 1);
            if (t <= 0) continue;
            const eased = EASE.outExpo(t);
            const sway = swayAngle(plant, seg.depth, seg.x);
            const ang = seg.angle + sway + seg.curve * eased;
            const ex = seg.x + Math.cos(ang) * seg.length * eased;
            const ey = seg.y + Math.sin(ang) * seg.length * eased;

            ctx.beginPath();
            ctx.moveTo(seg.x, seg.y);
            const midX = (seg.x + ex) / 2 + Math.sin(ang + Math.PI / 2) * seg.curve * 8;
            const midY = (seg.y + ey) / 2 + Math.cos(ang + Math.PI / 2) * seg.curve * 8;
            ctx.quadraticCurveTo(midX, midY, ex, ey);
            ctx.strokeStyle = seg.depth === 0 ? theme.branch : theme.branchSoft;
            ctx.globalAlpha = alpha * (0.55 + 0.45 * eased);
            ctx.lineWidth = seg.width * eased;
            ctx.stroke();

            if (t >= 1) {
                endpoints.push({ x: ex, y: ey, depth: seg.depth, sway });
            } else {
                endpoints.push({ x: ex, y: ey, depth: seg.depth, sway, growing: true });
            }
        }

        for (const bl of plant.blossoms) {
            const t = Math.min(Math.max((age - bl.delay) / 1.2, 0), 1);
            if (t <= 0) continue;
            drawBlossom(bl, EASE.outExpo(t), alpha, theme, plant);
        }
    }

    function drawBlossom(bl, t, alpha, theme, plant) {
        const sway = swayAngle(plant, bl.depth + 1, bl.x);
        const x = bl.x + Math.sin(sway) * 4;
        const y = bl.y + Math.cos(sway) * 2;
        const size = bl.size * t;
        const color = theme.blossom[bl.hue];

        ctx.globalAlpha = alpha * 0.28 * t;
        ctx.beginPath();
        ctx.arc(x, y, size * 2.1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.globalAlpha = alpha * t;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (let p = 0; p < bl.petals; p++) {
            const a = bl.rot + (p / bl.petals) * Math.PI * 2 + sway * 0.6;
            const px = x + Math.cos(a) * size;
            const py = y + Math.sin(a) * size;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + Math.cos(a + 0.5) * size * 0.9,
                y + Math.sin(a + 0.5) * size * 0.9,
                px, py
            );
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawBlots(plant, age, alpha, theme) {
        for (const blot of plant.blots) {
            const t = Math.min(Math.max((age - blot.delay) / 1.6, 0), 1);
            if (t <= 0) continue;
            const eased = EASE.outExpo(t);
            const r = blot.radius * eased;
            const color = theme.blossom[blot.hue];

            ctx.globalAlpha = alpha * 0.16 * (1 - t * 0.5) * eased;
            ctx.beginPath();
            ctx.arc(blot.x, blot.y, r * 1.9, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            ctx.globalAlpha = alpha * 0.5 * eased;
            ctx.beginPath();
            const pts = blot.points.length;
            for (let p = 0; p <= pts; p++) {
                const a = blot.rot + (p % pts) / pts * Math.PI * 2;
                const wobble = 1 + Math.sin(state.time * 0.8 + p * 1.7 + plant.phase) * 0.06;
                const rr = r * blot.points[p % pts] * wobble;
                const px = blot.x + Math.cos(a) * rr;
                const py = blot.y + Math.sin(a) * rr;
                if (p === 0) ctx.moveTo(px, py);
                else ctx.quadraticCurveTo(
                    blot.x + Math.cos(a - Math.PI / pts) * rr * 1.08,
                    blot.y + Math.sin(a - Math.PI / pts) * rr * 1.08,
                    px, py
                );
            }
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.globalAlpha = alpha * 0.08 * eased;
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    function drawMotes(dt) {
        const theme = THEMES[state.theme];
        for (let i = state.motes.length - 1; i >= 0; i--) {
            const m = state.motes[i];
            m.life -= m.decay * dt;
            if (m.life <= 0) {
                state.motes.splice(i, 1);
                continue;
            }
            m.drift += dt * 2;
            m.x += (m.vx + Math.sin(m.drift) * 8) * dt;
            m.y += m.vy * dt;
            m.vy += 6 * dt;
            ctx.globalAlpha = m.life * 0.7;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size * m.life, 0, Math.PI * 2);
            ctx.fillStyle = theme.mote;
            ctx.fill();
        }
    }

    // === Main Loop ===
    let lastFrame = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let ambientTimer = 0;

    function frame(now) {
        const dt = Math.min((now - lastFrame) / 1000, 0.05);
        lastFrame = now;
        state.time += dt;

        fpsAccum += dt;
        fpsFrames++;
        if (fpsAccum >= 0.5) {
            fpsCounterEl.textContent = Math.round(fpsFrames / fpsAccum) + ' FPS';
            fpsAccum = 0;
            fpsFrames = 0;
        }

        ambientTimer += dt;
        if (ambientTimer > 0.18) {
            spawnAmbient();
            ambientTimer = 0;
        }

        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        for (let i = state.plants.length - 1; i >= 0; i--) {
            const plant = state.plants[i];
            if (plant.fading) {
                plant.life -= dt * 1.4;
                if (plant.life <= 0) {
                    state.plants.splice(i, 1);
                    continue;
                }
            }
            drawPlant(plant);
        }

        ctx.globalAlpha = 1;
        drawMotes(dt);

        requestAnimationFrame(frame);
    }

    // === Pointer & Planting ===
    let dragging = false;
    let lastPlantAt = 0;

    function toLocal(e) {
        return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e) {
        if (e.target.closest('.control-panel, .top-nav, .app-footer, .back-link')) return;
        dragging = true;
        const p = toLocal(e);
        plantSeed(p.x, p.y, e.shiftKey);
        lastPlantAt = state.time;
    }

    function onPointerMove(e) {
        const p = toLocal(e);
        state.pointer.x = p.x;
        state.pointer.y = p.y;
        state.pointer.active = true;
        cursorGlow.style.left = p.x + 'px';
        cursorGlow.style.top = p.y + 'px';
        if (dragging && state.time - lastPlantAt > 0.14) {
            plantSeed(p.x, p.y, false);
            lastPlantAt = state.time;
        }
    }

    function onPointerUp() {
        dragging = false;
    }

    // === UI Handlers ===
    function updateCount() {
        bloomCountEl.textContent = state.plants.length + ' 朵';
    }

    function bindSliderFill(slider) {
        const sync = () => {
            const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
            slider.style.setProperty('--fill', pct + '%');
        };
        slider.addEventListener('input', sync);
        sync();
    }

    function bindTheme() {
        themeToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.theme-btn');
            if (!btn) return;
            themeToggle.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.theme = btn.dataset.theme;
            document.documentElement.dataset.theme = state.theme;
        });
    }

    function bindMode() {
        bloomModeGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('.seg-btn');
            if (!btn) return;
            bloomModeGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.mode = btn.dataset.mode;
        });
    }

    function bindParticles() {
        particleToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.seg-btn');
            if (!btn) return;
            particleToggle.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.particlesOn = btn.dataset.particles === 'on';
        });
    }

    function bindHarvest() {
        harvestBtn.addEventListener('click', () => {
            if (state.harvesting || state.plants.length === 0) return;
            state.harvesting = true;
            for (const plant of state.plants) {
                plant.fading = true;
                for (const bl of plant.blossoms || []) {
                    spawnBurst(bl.x, bl.y, 3);
                }
            }
            const finish = setInterval(() => {
                if (state.plants.length === 0) {
                    clearInterval(finish);
                    state.harvesting = false;
                    stageHint.classList.remove('hidden');
                    updateCount();
                }
            }, 120);
            updateCount();
        });
    }

    function bindFullscreen() {
        fullscreenBtn.addEventListener('click', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        });
    }

    // === Init ===
    function init() {
        document.documentElement.dataset.theme = state.theme;
        resize();
        global.addEventListener('resize', resize);
        bindSliderFill(windSlider);
        bindSliderFill(spreadSlider);

        windSlider.addEventListener('input', () => {
            state.wind = windSlider.value / 100;
        });
        spreadSlider.addEventListener('input', () => {
            state.spread = spreadSlider.value / 100;
        });

        bindTheme();
        bindMode();
        bindParticles();
        bindHarvest();
        bindFullscreen();

        canvas.addEventListener('pointerdown', onPointerDown);
        global.addEventListener('pointermove', onPointerMove);
        global.addEventListener('pointerup', onPointerUp);
        global.addEventListener('pointercancel', onPointerUp);
        global.addEventListener('pointerleave', () => {
            state.pointer.active = false;
            dragging = false;
        });

        // 首帧自动播下三粒种子作为引子
        const cx = W / 2;
        const cy = H * 0.72;
        setTimeout(() => plantSeed(cx - 140, cy, false), 400);
        setTimeout(() => plantSeed(cx, cy - 30, true), 800);
        setTimeout(() => plantSeed(cx + 150, cy, false), 1200);

        requestAnimationFrame(frame);
    }

    init();
})(typeof window !== 'undefined' ? window : globalThis);
