/* ============================================================
   Kinetic Letter Studio — 动力学字符工作室
   每个字符都是一个弹簧-阻尼振子，光标力场实时驱动
   ============================================================
   模块：Simplex 风噪声 / 字符实体 / 力场引擎 / 冲击波
        乱码揭示 / 环境粒子 / 控制台绑定
   ============================================================ */

(function () {
    'use strict';

    // === DOM Elements ===
    const arena = document.getElementById('letter-arena');
    const stage = document.getElementById('stage');
    const particleCanvas = document.getElementById('particle-layer');
    const cursorGlow = document.getElementById('cursor-glow');
    const hudMode = document.getElementById('hud-mode');
    const hudCount = document.getElementById('hud-count');
    const hudEnergy = document.getElementById('hud-energy');

    const inputText = document.getElementById('input-text');
    const modeToggle = document.getElementById('mode-toggle');
    const paletteToggle = document.getElementById('palette-toggle');
    const ctrlForce = document.getElementById('ctrl-force');
    const ctrlStiff = document.getElementById('ctrl-stiff');
    const ctrlDamp = document.getElementById('ctrl-damp');
    const ctrlSize = document.getElementById('ctrl-size');
    const valForce = document.getElementById('val-force');
    const valStiff = document.getElementById('val-stiff');
    const valDamp = document.getElementById('val-damp');
    const valSize = document.getElementById('val-size');
    const btnScatter = document.getElementById('btn-scatter');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnReset = document.getElementById('btn-reset');

    // === State ===
    const state = {
        mode: 'magnetic',
        force: 0.6,
        stiffness: 0.07,
        damping: 0.88,
        fontSize: 84,
        mouse: { x: -9999, y: -9999, active: false },
        energy: 0,
        time: 0
    };

    const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#$%&@ABCDEFGHKMNPRSTUVWXYZ';
    const glyphs = [];   // { el, home:{x,y}, pos:{x,y}, vel:{x,y}, rot, rotV, scale, char }

    // ================================================================
    // 值噪声 (用于重力模式的风扰动与粒子流场)
    // ================================================================
    const noiseSeed = Math.random() * 1000;
    function hash(x, y) {
        const s = Math.sin(x * 127.1 + y * 311.7 + noiseSeed) * 43758.5453;
        return s - Math.floor(s);
    }
    function valueNoise(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi);
        const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    // ================================================================
    // 字符实体 — 构建与乱码揭示
    // ================================================================
    function buildGlyphs(text) {
        arena.innerHTML = '';
        glyphs.length = 0;
        const chars = [...text.replace(/ /g, '\u00A0')];
        chars.forEach((char, i) => {
            const el = document.createElement('span');
            el.className = 'glyph';
            el.textContent = char;
            el.style.fontSize = state.fontSize + 'px';
            arena.appendChild(el);
            const g = {
                el,
                char,
                home: { x: 0, y: 0 },
                pos: { x: 0, y: 0 },
                vel: { x: 0, y: 0 },
                rot: 0, rotV: 0,
                scale: 1,
                settleDelay: i * 45
            };
            glyphs.push(g);
            scrambleReveal(el, char, i);
        });
        requestAnimationFrame(() => {
            measureHomes();
            glyphs.forEach((g) => { g.pos.x = g.home.x; g.pos.y = g.home.y; });
        });
        hudCount.textContent = 'GLYPHS: ' + chars.length;
    }

    function measureHomes() {
        const rect = arena.getBoundingClientRect();
        glyphs.forEach((g) => {
            const r = g.el.getBoundingClientRect();
            g.home.x = r.left - rect.left + r.width / 2 - rect.width / 2;
            g.home.y = r.top - rect.top + r.height / 2 - rect.height / 2;
        });
    }

    // 乱码揭示动画：字符从随机乱码逐帧收敛为目标字符
    function scrambleReveal(el, target, index) {
        el.classList.add('scrambling');
        const totalFrames = 12 + index * 2;
        let frame = 0;
        (function tick() {
            if (frame >= totalFrames) {
                el.textContent = target;
                el.classList.remove('scrambling');
                return;
            }
            if (frame % 2 === 0) {
                el.textContent = target === '\u00A0'
                    ? target
                    : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
            }
            frame++;
            requestAnimationFrame(tick);
        })();
    }

    // ================================================================
    // 力场引擎 — 弹簧-阻尼物理
    // ================================================================
    function physicsStep(dt) {
        const arenaRect = arena.getBoundingClientRect();
        const cx = arenaRect.width / 2;
        const cy = arenaRect.height / 2;
        const fx = state.mouse.x, fy = state.mouse.y;
        const F = state.force;
        const k = state.stiffness;
        const damp = state.damping;
        let energySum = 0;

        glyphs.forEach((g) => {
            // 归位弹簧
            let ax = (g.home.x - g.pos.x) * k;
            let ay = (g.home.y - g.pos.y) * k;

            const dx = fx - (g.pos.x + cx);
            const dy = fy - (g.pos.y + cy);
            const dist = Math.hypot(dx, dy) || 1;
            const radius = 320;

            if (state.mouse.active && dist < radius && g.char !== '\u00A0') {
                const falloff = 1 - dist / radius;
                const nx = dx / dist, ny = dy / dist;
                if (state.mode === 'magnetic') {
                    ax += nx * falloff * 26 * F;
                    ay += ny * falloff * 26 * F;
                    g.rotV += falloff * 0.012 * F * (nx > 0 ? 1 : -1);
                } else if (state.mode === 'repel') {
                    ax -= nx * falloff * 42 * F;
                    ay -= ny * falloff * 42 * F;
                    g.rotV -= falloff * 0.02 * F * (nx > 0 ? 1 : -1);
                } else if (state.mode === 'vortex') {
                    // 切向力 + 轻微向心力
                    ax += (-ny * 34 - nx * 6) * falloff * F;
                    ay += (nx * 34 - ny * 6) * falloff * F;
                    g.rotV += falloff * 0.028 * F;
                }
            }

            if (state.mode === 'gravity') {
                // 重力 + 地面反弹 + 值噪声风
                ay += 14 * F;
                const floor = cy + arenaRect.height * 0.36;
                if (g.pos.y > floor) {
                    g.pos.y = floor;
                    g.vel.y *= -0.55;
                    g.rotV *= 0.7;
                }
                const wind = (valueNoise(g.pos.x * 0.004 + state.time * 0.4, state.time * 0.25) - 0.5) * 6 * F;
                ax += wind;
                g.rotV += (valueNoise(state.time * 0.3, g.home.y * 0.01) - 0.5) * 0.01;
            }

            // Verlet 风格积分
            g.vel.x = (g.vel.x + ax * dt) * damp;
            g.vel.y = (g.vel.y + ay * dt) * damp;
            g.pos.x += g.vel.x * dt;
            g.pos.y += g.vel.y * dt;

            g.rotV *= 0.94;
            g.rot += g.rotV * dt;

            const speed = Math.hypot(g.vel.x, g.vel.y);
            const targetScale = 1 + Math.min(speed * 0.012, 0.5);
            g.scale += (targetScale - g.scale) * 0.15;

            energySum += speed;

            g.el.style.transform =
                'translate3d(' + g.pos.x.toFixed(2) + 'px,' + g.pos.y.toFixed(2) + 'px,0)' +
                ' rotate(' + g.rot.toFixed(2) + 'deg)' +
                ' scale(' + g.scale.toFixed(3) + ')';
        });

        // 能量 HUD（指数平滑）
        const avg = glyphs.length ? energySum / glyphs.length : 0;
        state.energy += (Math.min(avg / 14, 1) - state.energy) * 0.08;
        hudEnergy.textContent = 'ENERGY: ' + Math.round(state.energy * 100) + '%';
    }

    // ================================================================
    // 冲击波 — 点击迸散
    // ================================================================
    function shockwave(px, py) {
        const wave = document.createElement('div');
        wave.className = 'shockwave';
        wave.style.left = px + 'px';
        wave.style.top = py + 'px';
        stage.appendChild(wave);
        wave.addEventListener('animationend', () => wave.remove());

        const arenaRect = arena.getBoundingClientRect();
        const cx = arenaRect.width / 2;
        const cy = arenaRect.height / 2;
        glyphs.forEach((g) => {
            const dx = g.pos.x + cx - px;
            const dy = g.pos.y + cy - py;
            const dist = Math.hypot(dx, dy) || 1;
            const power = Math.max(0, 1 - dist / 460) * 34 * state.force;
            g.vel.x += (dx / dist) * power + (Math.random() - 0.5) * 6;
            g.vel.y += (dy / dist) * power + (Math.random() - 0.5) * 6;
            g.rotV += (Math.random() - 0.5) * 0.5;
        });
        spawnBurst(px, py);
    }

    function spawnBurst(px, py) {
        for (let i = 0; i < 26; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 2 + Math.random() * 5;
            particles.push({
                x: px, y: py,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: 1, decay: 0.02 + Math.random() * 0.02,
                size: 1 + Math.random() * 2.5
            });
        }
    }

    // ================================================================
    // 环境粒子流场
    // ================================================================
    const particles = [];
    const pctx = particleCanvas.getContext('2d');
    function resizeCanvas() {
        particleCanvas.width = window.innerWidth * devicePixelRatio;
        particleCanvas.height = window.innerHeight * devicePixelRatio;
        pctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resizeCanvas();

    function accentColor() {
        return getComputedStyle(document.body).getPropertyValue('--c-accent').trim() || '#7dd3fc';
    }

    function particleStep() {
        pctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        // 维持环境粒子数量
        while (particles.length < 70) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: 0, vy: 0,
                life: Infinity, decay: 0, ambient: true,
                size: 0.6 + Math.random() * 1.4
            });
        }
        const color = accentColor();
        pctx.globalCompositeOperation = 'lighter';
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            if (p.ambient) {
                const n = valueNoise(p.x * 0.0016 + state.time * 0.12, p.y * 0.0016);
                const a = n * Math.PI * 4;
                p.vx += Math.cos(a) * 0.02;
                p.vy += Math.sin(a) * 0.02 - 0.006;
                p.vx *= 0.96; p.vy *= 0.96;
            } else {
                p.vx *= 0.95; p.vy *= 0.95;
                p.life -= p.decay;
                if (p.life <= 0) { particles.splice(i, 1); continue; }
            }
            p.x += p.vx; p.y += p.vy;
            if (p.x < -20) p.x = window.innerWidth + 20;
            if (p.x > window.innerWidth + 20) p.x = -20;
            if (p.y < -20) p.y = window.innerHeight + 20;
            if (p.y > window.innerHeight + 20) p.y = -20;

            pctx.globalAlpha = p.ambient ? 0.35 : p.life * 0.9;
            pctx.fillStyle = color;
            pctx.beginPath();
            pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            pctx.fill();
        }
        pctx.globalAlpha = 1;
        pctx.globalCompositeOperation = 'source-over';
    }

    // ================================================================
    // 主循环
    // ================================================================
    let lastT = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastT) / 16.667, 2.5);
        lastT = now;
        state.time += dt * 0.016;
        physicsStep(dt);
        particleStep();
        requestAnimationFrame(loop);
    }

    // ================================================================
    // 事件绑定
    // ================================================================
    stage.addEventListener('pointermove', (e) => {
        const rect = arena.getBoundingClientRect();
        state.mouse.x = e.clientX - rect.left;
        state.mouse.y = e.clientY - rect.top;
        state.mouse.active = true;
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });
    stage.addEventListener('pointerleave', () => { state.mouse.active = false; });
    stage.addEventListener('pointerdown', (e) => {
        const rect = stage.getBoundingClientRect();
        shockwave(e.clientX - rect.left, e.clientY - rect.top);
    });

    // 拖拽字符：按下时向该字符注入速度
    arena.addEventListener('pointermove', (e) => {
        if (e.buttons !== 1) return;
        const arenaRect = arena.getBoundingClientRect();
        const cx = arenaRect.width / 2, cy = arenaRect.height / 2;
        glyphs.forEach((g) => {
            const dx = g.pos.x + cx - (e.clientX - arenaRect.left);
            const dy = g.pos.y + cy - (e.clientY - arenaRect.top);
            if (Math.hypot(dx, dy) < state.fontSize * 0.7) {
                g.vel.x += e.movementX * 0.6;
                g.vel.y += e.movementY * 0.6;
                g.rotV += (e.movementX) * 0.004;
            }
        });
    });

    inputText.addEventListener('input', () => {
        buildGlyphs(inputText.value || 'KINETIC');
    });

    function bindRange(el, valEl, apply) {
        el.addEventListener('input', () => {
            valEl.textContent = el.value;
            apply(+el.value);
        });
    }
    bindRange(ctrlForce, valForce, (v) => { state.force = v / 100; });
    bindRange(ctrlStiff, valStiff, (v) => { state.stiffness = 0.02 + (v / 100) * 0.14; });
    bindRange(ctrlDamp, valDamp, (v) => { state.damping = 0.8 + (v / 100) * 0.17; });
    bindRange(ctrlSize, valSize, (v) => {
        state.fontSize = v;
        glyphs.forEach((g) => { g.el.style.fontSize = v + 'px'; });
        requestAnimationFrame(measureHomes);
    });

    modeToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-btn');
        if (!btn) return;
        modeToggle.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        hudMode.textContent = 'MODE: ' + state.mode.toUpperCase();
        if (state.mode === 'gravity') {
            glyphs.forEach((g) => { g.vel.y -= 4 + Math.random() * 6; });
        } else {
            glyphs.forEach((g) => { g.vel.x += (Math.random() - 0.5) * 4; });
        }
    });

    paletteToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.palette-btn');
        if (!btn) return;
        paletteToggle.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.dataset.palette = btn.dataset.palette;
    });

    btnScatter.addEventListener('click', () => {
        const r = stage.getBoundingClientRect();
        shockwave(r.width / 2, r.height / 2);
    });
    btnShuffle.addEventListener('click', () => {
        // 随机重组：字符乱序后重建
        const chars = [...(inputText.value || 'KINETIC')];
        for (let i = chars.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        inputText.value = chars.join('');
        buildGlyphs(inputText.value);
    });
    btnReset.addEventListener('click', () => {
        glyphs.forEach((g) => {
            g.pos.x = g.home.x; g.pos.y = g.home.y;
            g.vel.x = 0; g.vel.y = 0; g.rot = 0; g.rotV = 0;
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.target === inputText) return;
        if (e.code === 'Space') { e.preventDefault(); btnScatter.click(); }
        if (e.key === 's' || e.key === 'S') btnShuffle.click();
        if (e.key === 'r' || e.key === 'R') btnReset.click();
    });

    window.addEventListener('resize', () => {
        resizeCanvas();
        measureHomes();
    });

    // === Init ===
    buildGlyphs(inputText.value || 'KINETIC');
    requestAnimationFrame(loop);
})();
