/* ================================================================
   CURSOR GRIT — main.js
   光标砂砾微交互物理场
   弹簧-阻尼物理 · 粒子堆积 · 挖掘/扫动/漩涡/静电四模式
   ================================================================ */

(function () {
    'use strict';

    /* === CONFIG === */
    const PALETTES = {
        ember: { base: [255, 140, 66], deep: [200, 60, 20], glow: [255, 200, 100] },
        abyss: { base: [64, 200, 255], deep: [0, 80, 160], glow: [150, 230, 255] },
        bloom: { base: [255, 130, 200], deep: [160, 30, 110], glow: [255, 200, 235] },
        frost: { base: [100, 255, 210], deep: [0, 120, 100], glow: [180, 255, 230] }
    };

    const MAX_GRAINS = 5000;

    /* === STATE === */
    const state = {
        canvas: null,
        ctx: null,
        width: 0,
        height: 0,
        dpr: 1,
        grains: [],
        count: 2400,
        radius: 140,
        friction: 0.86,
        elastic: 0.012,
        grainSize: 1.6,
        mode: 'excavate',
        palette: 'ember',
        mouse: { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, speed: 0, active: false, down: false },
        shocks: [],
        fps: 60,
        frameCount: 0,
        lastFpsTime: 0,
        running: true
    };

    /* === GRAIN ENTITY === */
    class Grain {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.ox = x;
            this.oy = y;
            this.vx = 0;
            this.vy = 0;
            this.size = 0.8 + Math.random() * 1.2;
            this.shade = Math.random();
            this.spin = Math.random() * Math.PI * 2;
            this.energy = 0;
        }

        applyForce(mx, my, mvx, mvy, mspeed, mode, radius) {
            const dx = this.x - mx;
            const dy = this.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > radius || dist < 0.001) return;

            const falloff = 1 - dist / radius;
            const force = falloff * falloff;
            const nx = dx / dist;
            const ny = dy / dist;

            switch (mode) {
                case 'excavate': {
                    // Dig outward — push grains away from cursor, excavate a trench
                    const push = force * 6;
                    this.vx += nx * push;
                    this.vy += ny * push;
                    // Add drag from cursor velocity
                    this.vx += mvx * force * 0.3;
                    this.vy += mvy * force * 0.3;
                    this.energy = Math.max(this.energy, force);
                    break;
                }
                case 'sweep': {
                    // Sweep grains in the direction of cursor motion
                    const sweepMag = force * (0.5 + mspeed * 0.05);
                    this.vx += mvx * sweepMag;
                    this.vy += mvy * sweepMag;
                    // slight perpendicular scatter for grit texture
                    this.vx += -ny * force * 0.5;
                    this.vy += nx * force * 0.5;
                    this.energy = Math.max(this.energy, force * 0.8);
                    break;
                }
                case 'vortex': {
                    // Swirl grains around cursor — tangential force + slight inward pull
                    const tangential = force * 4;
                    this.vx += -ny * tangential;
                    this.vy += nx * tangential;
                    // gentle inward gravity so grains orbit rather than fly off
                    this.vx -= nx * force * 0.6;
                    this.vy -= ny * force * 0.6;
                    this.energy = Math.max(this.energy, force * 0.9);
                    break;
                }
                case 'static': {
                    // Electrostatic — grains cling to cursor when close
                    const cling = force * 3;
                    this.vx -= nx * cling;
                    this.vy -= ny * cling;
                    // jitter for crackle texture
                    this.vx += (Math.random() - 0.5) * force * 2;
                    this.vy += (Math.random() - 0.5) * force * 2;
                    this.energy = Math.max(this.energy, force);
                    break;
                }
            }
        }

        applyShock(shock) {
            const dx = this.x - shock.x;
            const dy = this.y - shock.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > shock.radius || dist < 0.001) return;

            const ringDist = Math.abs(dist - shock.currentRadius);
            if (ringDist > shock.bandWidth) return;

            const force = shock.power * (1 - ringDist / shock.bandWidth);
            const nx = dx / dist;
            const ny = dy / dist;
            this.vx += nx * force;
            this.vy += ny * force;
            this.energy = Math.max(this.energy, force * 0.15);
        }

        update(friction, elastic) {
            // Spring back to origin (home bed)
            this.vx += (this.ox - this.x) * elastic;
            this.vy += (this.oy - this.y) * elastic;

            // Friction / damping — grit friction is high
            this.vx *= friction;
            this.vy *= friction;

            // Integrate
            this.x += this.vx;
            this.y += this.vy;

            // Decay energy (visual glow)
            this.energy *= 0.92;

            // Tiny idle jitter for living-grit feel
            if (this.energy < 0.01) {
                this.x += (Math.random() - 0.5) * 0.15;
                this.y += (Math.random() - 0.5) * 0.15;
            }
        }

        draw(ctx, palette, baseSize) {
            const r = Math.max(0.3, this.size * baseSize);
            const e = this.energy;

            // Color blend: deep → base → glow based on energy
            const t = Math.min(1, e * 2);
            const cr = Math.round(palette.deep[0] + (palette.base[0] - palette.deep[0]) * this.shade + (palette.glow[0] - palette.base[0]) * t * 0.6);
            const cg = Math.round(palette.deep[1] + (palette.base[1] - palette.deep[1]) * this.shade + (palette.glow[1] - palette.base[1]) * t * 0.6);
            const cb = Math.round(palette.deep[2] + (palette.base[2] - palette.deep[2]) * this.shade + (palette.glow[2] - palette.base[2]) * t * 0.6);
            const alpha = 0.55 + this.shade * 0.35 + e * 0.3;

            ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + Math.min(1, alpha) + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* === SHOCK WAVE === */
    class Shock {
        constructor(x, y, power, maxRadius) {
            this.x = x;
            this.y = y;
            this.power = power;
            this.currentRadius = 0;
            this.maxRadius = maxRadius;
            this.bandWidth = 50;
            this.dead = false;
        }

        update() {
            this.currentRadius += 8;
            if (this.currentRadius > this.maxRadius + this.bandWidth) {
                this.dead = true;
            }
        }

        draw(ctx, palette) {
            const fade = 1 - this.currentRadius / this.maxRadius;
            if (fade <= 0) return;
            ctx.strokeStyle = 'rgba(' + palette.glow[0] + ',' + palette.glow[1] + ',' + palette.glow[2] + ',' + (fade * 0.4) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.currentRadius), 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /* === INIT === */
    function init() {
        state.canvas = document.getElementById('grit-canvas');
        state.ctx = state.canvas.getContext('2d', { alpha: true });

        state.mouse.x = window.innerWidth / 2;
        state.mouse.y = window.innerHeight / 2;
        state.mouse.px = state.mouse.x;
        state.mouse.py = state.mouse.y;

        resize();
        seedGrains();
        bindEvents();
        bindControls();
        animate(performance.now());
    }

    function resize() {
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        state.width = window.innerWidth;
        state.height = window.innerHeight;
        state.canvas.width = state.width * state.dpr;
        state.canvas.height = state.height * state.dpr;
        state.canvas.style.width = state.width + 'px';
        state.canvas.style.height = state.height + 'px';
        state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function seedGrains() {
        state.grains = [];
        const area = state.width * state.height;
        const density = state.count / (1920 * 1080);
        const target = Math.min(MAX_GRAINS, Math.round(area * density));

        for (let i = 0; i < target; i++) {
            const x = Math.random() * state.width;
            const y = Math.random() * state.height;
            state.grains.push(new Grain(x, y));
        }
        state.count = state.grains.length;
        document.getElementById('val-count').textContent = state.count;
        document.getElementById('tele-grains').textContent = state.count;
    }

    function resetBed() {
        for (let i = 0; i < state.grains.length; i++) {
            const g = state.grains[i];
            g.x = g.ox;
            g.y = g.oy;
            g.vx = 0;
            g.vy = 0;
            g.energy = 0;
        }
    }

    function scatterAll() {
        // Center-screen shockwave
        state.shocks.push(new Shock(state.mouse.x, state.mouse.y, 8, Math.max(state.width, state.height) * 0.7));
    }

    /* === EVENTS === */
    function bindEvents() {
        window.addEventListener('resize', function () {
            resize();
            seedGrains();
        });

        // Mouse
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mouseleave', function () { state.mouse.active = false; });
        document.addEventListener('mouseenter', function () { state.mouse.active = true; });

        // Touch
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchend', onMouseUp);

        // Click anywhere = shockwave
        state.canvas.addEventListener('click', onCanvasClick);
    }

    function onMouseMove(e) {
        state.mouse.px = state.mouse.x;
        state.mouse.py = state.mouse.y;
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
        state.mouse.vx = state.mouse.x - state.mouse.px;
        state.mouse.vy = state.mouse.y - state.mouse.py;
        state.mouse.speed = Math.sqrt(state.mouse.vx * state.mouse.vx + state.mouse.vy * state.mouse.vy);
        state.mouse.active = true;
        updateCursorVisual();
    }

    function onTouchMove(e) {
        if (e.touches.length === 0) return;
        e.preventDefault();
        const t = e.touches[0];
        state.mouse.px = state.mouse.x;
        state.mouse.py = state.mouse.y;
        state.mouse.x = t.clientX;
        state.mouse.y = t.clientY;
        state.mouse.vx = state.mouse.x - state.mouse.px;
        state.mouse.vy = state.mouse.y - state.mouse.py;
        state.mouse.speed = Math.sqrt(state.mouse.vx * state.mouse.vx + state.mouse.vy * state.mouse.vy);
        state.mouse.active = true;
        updateCursorVisual();
    }

    function onTouchStart(e) {
        if (e.touches.length === 0) return;
        const t = e.touches[0];
        state.mouse.x = t.clientX;
        state.mouse.y = t.clientY;
        state.mouse.px = state.mouse.x;
        state.mouse.py = state.mouse.y;
        state.mouse.active = true;
        state.mouse.down = true;
        updateCursorVisual();
    }

    function onMouseDown() {
        state.mouse.down = true;
        document.querySelector('.cursor-ring').style.transform = 'scale(0.7)';
    }

    function onMouseUp() {
        state.mouse.down = false;
        document.querySelector('.cursor-ring').style.transform = '';
    }

    function onCanvasClick(e) {
        state.shocks.push(new Shock(e.clientX, e.clientY, 6, 350));
    }

    function updateCursorVisual() {
        const shell = document.querySelector('.cursor-shell');
        shell.style.setProperty('--cx', state.mouse.x + 'px');
        shell.style.setProperty('--cy', state.mouse.y + 'px');
    }

    /* === CONTROLS === */
    function bindControls() {
        // Mode buttons
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
                document.body.setAttribute('data-mode', state.mode);
                document.getElementById('tele-mode').textContent = state.mode.toUpperCase();
                hideHint();
            });
        });

        // Palette buttons
        const palBtns = document.querySelectorAll('.palette-btn');
        palBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                palBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                document.body.className = 'palette-' + state.palette;
                document.body.setAttribute('data-mode', state.mode);
            });
        });

        // Sliders
        bindSlider('slider-count', 'val-count', function (v) {
            state.count = parseInt(v, 10);
            adjustGrainCount();
            return state.count;
        });

        bindSlider('slider-radius', 'val-radius', function (v) {
            state.radius = parseInt(v, 10);
            return v;
        });

        bindSlider('slider-friction', 'val-friction', function (v) {
            state.friction = parseInt(v, 10) / 100;
            return state.friction.toFixed(2);
        });

        bindSlider('slider-elastic', 'val-elastic', function (v) {
            state.elastic = parseInt(v, 10) / 1000;
            return state.elastic.toFixed(3);
        });

        bindSlider('slider-size', 'val-size', function (v) {
            state.grainSize = parseInt(v, 10) / 10;
            return state.grainSize.toFixed(1);
        });

        // Actions
        document.getElementById('btn-reset').addEventListener('click', function () {
            resetBed();
        });
        document.getElementById('btn-scatter').addEventListener('click', function () {
            scatterAll();
        });

        // Hint auto-hide on first interaction
        setTimeout(function () {
            document.getElementById('hint').classList.add('hidden');
        }, 9000);
    }

    function bindSlider(sliderId, valId, handler) {
        var slider = document.getElementById(sliderId);
        var valEl = document.getElementById(valId);
        slider.addEventListener('input', function () {
            valEl.textContent = handler(slider.value);
            hideHint();
        });
    }

    function hideHint() {
        document.getElementById('hint').classList.add('hidden');
    }

    function adjustGrainCount() {
        var target = state.count;
        var current = state.grains.length;
        if (target > current) {
            var toAdd = Math.min(MAX_GRAINS - current, target - current);
            for (var i = 0; i < toAdd; i++) {
                var x = Math.random() * state.width;
                var y = Math.random() * state.height;
                state.grains.push(new Grain(x, y));
            }
        } else if (target < current) {
            state.grains.length = target;
        }
        state.count = state.grains.length;
        document.getElementById('val-count').textContent = state.count;
        document.getElementById('tele-grains').textContent = state.count;
    }

    /* === ANIMATE LOOP === */
    function animate(time) {
        if (!state.running) return;

        // FPS
        state.frameCount++;
        var elapsed = time - state.lastFpsTime;
        if (elapsed >= 500) {
            state.fps = Math.round((state.frameCount * 1000) / elapsed);
            document.getElementById('tele-fps').textContent = state.fps;
            state.frameCount = 0;
            state.lastFpsTime = time;
        }

        var ctx = state.ctx;
        var palette = PALETTES[state.palette];

        // Fade-clear for subtle motion trails
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.fillRect(0, 0, state.width, state.height);

        // Update shocks
        for (var s = state.shocks.length - 1; s >= 0; s--) {
            state.shocks[s].update();
            state.shocks[s].draw(ctx, palette);
            if (state.shocks[s].dead) {
                state.shocks.splice(s, 1);
            }
        }

        // Mouse velocity decay (so idle doesn't keep sweeping)
        state.mouse.vx *= 0.85;
        state.mouse.vy *= 0.85;
        state.mouse.speed *= 0.85;

        // Update + draw grains
        var avgVel = 0;
        var grains = state.grains;
        var len = grains.length;
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var mvx = state.mouse.vx;
        var mvy = state.mouse.vy;
        var mspeed = state.mouse.speed;
        var mode = state.mode;
        var radius = state.radius;
        var friction = state.friction;
        var elastic = state.elastic;
        var baseSize = state.grainSize;
        var shocks = state.shocks;
        var shockLen = shocks.length;

        for (var i = 0; i < len; i++) {
            var g = grains[i];

            // Cursor force
            g.applyForce(mx, my, mvx, mvy, mspeed, mode, radius);

            // Shock forces
            for (var k = 0; k < shockLen; k++) {
                g.applyShock(shocks[k]);
            }

            g.update(friction, elastic);
            g.draw(ctx, palette, baseSize);

            avgVel += Math.abs(g.vx) + Math.abs(g.vy);
        }

        // Telemetry: average velocity
        document.getElementById('tele-vel').textContent = (avgVel / len).toFixed(2);

        requestAnimationFrame(animate);
    }

    /* === BOOT === */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
