/* ================================================================
   DRAGONFLY HOVER TRAIL — main.js
   蜻蜓悬停轨迹微交互物理场
   弹簧-阻尼飞舞物理 · 4 种飞行模式 · 流体光痕轨迹
   ================================================================ */

(function () {
    'use strict';

    /* === CONFIG === */
    const PALETTES = {
        jade:  { body1: [80, 240, 170],  body2: [40, 200, 140],  wing: [180, 255, 220], trail: [120, 255, 200] },
        ember: { body1: [255, 150, 70],  body2: [220, 90, 40],   wing: [255, 210, 130], trail: [255, 170, 90] },
        bloom: { body1: [230, 120, 220], body2: [160, 60, 180],  wing: [255, 200, 240], trail: [240, 150, 220] },
        frost: { body1: [120, 210, 255], body2: [60, 150, 220],  wing: [200, 240, 255], trail: [150, 220, 255] }
    };

    const MAX_FLIES = 48;
    const MAX_TRAIL_NODES = 60;

    /* === STATE === */
    const state = {
        canvas: null,
        ctx: null,
        width: 0,
        height: 0,
        dpr: 1,
        flies: [],
        count: 18,
        hoverRadius: 160,
        spring: 0.06,
        damping: 0.88,
        trailLen: 24,
        mode: 'chase',
        palette: 'jade',
        mouse: { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, speed: 0, active: false, down: false },
        shocks: [],
        ambient: [],
        fps: 60,
        frameCount: 0,
        lastFpsTime: 0,
        running: true,
        time: 0
    };

    /* === DRAGONFLY ENTITY ===
       Spring-damper physics. Each fly targets an offset around the cursor
       (or formation anchor), accumulates wing-flap phase from velocity,
       and records a tail trail of past positions. */
    class Dragonfly {
        constructor(idx) {
            this.idx = idx;
            this.x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
            this.y = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
            this.angle = Math.random() * Math.PI * 2;
            // body proportions
            this.scale = 0.75 + Math.random() * 0.55;
            this.bodyLen = 22 * this.scale;
            this.wingSpan = 18 * this.scale;
            // wing flap — phase advances with speed
            this.wingPhase = Math.random() * Math.PI * 2;
            this.wingFreq = 0.45 + Math.random() * 0.25;
            this.wingAmp = 0.55 + Math.random() * 0.25;
            // hover noise (each fly bobs slightly to feel alive)
            this.bobPhase = Math.random() * Math.PI * 2;
            this.bobFreq = 0.02 + Math.random() * 0.015;
            this.bobAmp = 4 + Math.random() * 5;
            // trail ring buffer
            this.trail = [];
            // personal offset slot (used in formation / orbit)
            this.offsetAngle = (idx / Math.max(1, state.count)) * Math.PI * 2;
            this.offsetRadius = 0.35 + Math.random() * 0.65;
            this.shade = Math.random();
            // scatter burst velocity (decays to 0)
            this.bx = 0;
            this.by = 0;
        }

        /* compute the target point for this fly based on flight mode */
        computeTarget(mx, my, mspeed, mode, hoverRadius, time) {
            const oa = this.offsetAngle;
            const or = this.offsetRadius;

            switch (mode) {
                case 'chase': {
                    // trailing behind / around cursor with jitter
                    const tailAngle = Math.atan2(-state.mouse.vy, -state.mouse.vx);
                    const back = hoverRadius * (0.4 + or * 0.6);
                    const jitter = Math.sin(time * 0.001 + oa * 3) * 18;
                    const px = Math.cos(tailAngle) * back + Math.cos(oa) * jitter;
                    const py = Math.sin(tailAngle) * back + Math.sin(oa) * jitter;
                    return { x: mx + px, y: my + py };
                }
                case 'orbit': {
                    // circular orbit around cursor — rotating slots
                    const r = hoverRadius * (0.55 + or * 0.45);
                    const a = oa + time * 0.0008 * (0.5 + or);
                    return { x: mx + Math.cos(a) * r, y: my + Math.sin(a) * r };
                }
                case 'formation': {
                    // diamond / V formation fixed relative to cursor velocity direction
                    const dir = Math.atan2(state.mouse.vy, state.mouse.vx);
                    const ms = Math.min(1, mspeed / 20);
                    // formation lines fan out behind cursor
                    const lane = (this.idx % 6) - 2.5;
                    const row = Math.floor(this.idx / 6);
                    const fwd = -hoverRadius * 0.45 * (row + 1) * (0.5 + ms);
                    const side = lane * (24 + or * 12);
                    const cosD = Math.cos(dir);
                    const sinD = Math.sin(dir);
                    // if cursor nearly still, spread radially instead
                    if (ms < 0.06) {
                        const a = oa + time * 0.0004;
                        const r = hoverRadius * (0.5 + or * 0.5);
                        return { x: mx + Math.cos(a) * r, y: my + Math.sin(a) * r };
                    }
                    return {
                        x: mx + cosD * fwd - sinD * side,
                        y: my + sinD * fwd + cosD * side
                    };
                }
                case 'scatter': {
                    // repelled outward from cursor — flies hold a perimeter
                    const a = oa + time * 0.0003;
                    const r = hoverRadius * (1.1 + or * 0.9);
                    return { x: mx + Math.cos(a) * r, y: my + Math.sin(a) * r };
                }
            }
            return { x: mx, y: my };
        }

        update(mx, my, mspeed, mode, hoverRadius, spring, damping, time) {
            const target = this.computeTarget(mx, my, mspeed, mode, hoverRadius, time);

            // spring toward target
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            this.vx += dx * spring;
            this.vy += dy * spring;

            // hover bob — gentle sinusoidal lift keeps them feeling airborne
            this.bobPhase += this.bobFreq;
            this.vx += Math.cos(this.bobPhase) * 0.05;
            this.vy += Math.sin(this.bobPhase * 1.3) * 0.05;

            // scatter burst impulse (decays)
            this.vx += this.bx;
            this.vy += this.by;
            this.bx *= 0.82;
            this.by *= 0.82;

            // air damping
            this.vx *= damping;
            this.vy *= damping;

            // integrate
            this.x += this.vx;
            this.y += this.vy;

            // orientation — smoothly turn to face velocity
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 0.15) {
                const targetAngle = Math.atan2(this.vy, this.vx);
                // shortest-arc lerp
                let diff = targetAngle - this.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.angle += diff * 0.18;
            }

            // wing flap advances faster when flying faster
            this.wingPhase += this.wingFreq + speed * 0.06;

            // push current pos into trail (throttled by distance)
            const trail = this.trail;
            const last = trail.length ? trail[trail.length - 1] : null;
            if (!last || (last.x - this.x) * (last.x - this.x) + (last.y - this.y) * (last.y - this.y) > 9) {
                trail.push({ x: this.x, y: this.y });
                if (trail.length > MAX_TRAIL_NODES) trail.shift();
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
            this.bx += nx * force;
            this.by += ny * force;
        }

        burstFrom(x, y, power) {
            const dx = this.x - x;
            const dy = this.y - y;
            const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const nx = dx / dist;
            const ny = dy / dist;
            const falloff = Math.max(0, 1 - dist / 400);
            this.bx += nx * power * falloff;
            this.by += ny * power * falloff;
        }

        /* draw the luminous tail trail */
        drawTrail(ctx, palette, trailLen) {
            const trail = this.trail;
            const len = trail.length;
            if (len < 2 || trailLen <= 0) return;
            const drawCount = Math.min(len, trailLen);
            const startIdx = len - drawCount;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = startIdx; i < len - 1; i++) {
                const t = (i - startIdx) / drawCount;
                const a = this.trail[i];
                const b = this.trail[i + 1];
                const alpha = t * t * 0.5;
                ctx.strokeStyle = 'rgba(' + palette.trail[0] + ',' + palette.trail[1] + ',' + palette.trail[2] + ',' + alpha + ')';
                ctx.lineWidth = Math.max(0.4, t * 2.4 * this.scale);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        /* draw the dragonfly body — 4 wings (rapid flap) + segmented body */
        draw(ctx, palette) {
            const cosA = Math.cos(this.angle);
            const sinA = Math.sin(this.angle);
            const flap = Math.sin(this.wingPhase) * this.wingAmp;
            const wingAlpha = 0.32 + Math.abs(Math.cos(this.wingPhase)) * 0.28;

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // ---- wings (2 pairs) ----
            // wing beat makes them oscillate around the body axis
            const wingColor = 'rgba(' + palette.wing[0] + ',' + palette.wing[1] + ',' + palette.wing[2] + ',' + wingAlpha + ')';
            const wingGlow = 'rgba(' + palette.wing[0] + ',' + palette.wing[1] + ',' + palette.wing[2] + ',' + (wingAlpha * 0.4) + ')';

            ctx.fillStyle = wingColor;
            ctx.shadowColor = wingGlow;
            ctx.shadowBlur = 8;

            const drawWingPair = (offsetX, spanScale, flapAmt) => {
                const span = this.wingSpan * spanScale;
                const tipY = -span + flapAmt * span;
                // upper wing
                ctx.beginPath();
                ctx.moveTo(offsetX, 0);
                ctx.quadraticCurveTo(offsetX + span * 0.4, tipY, offsetX + span * 0.9, tipY * 0.7);
                ctx.quadraticCurveTo(offsetX + span * 0.5, tipY * 0.3, offsetX, 0);
                ctx.fill();
                // lower wing (mirror)
                ctx.beginPath();
                ctx.moveTo(offsetX, 0);
                ctx.quadraticCurveTo(offsetX + span * 0.4, -tipY, offsetX + span * 0.9, -tipY * 0.7);
                ctx.quadraticCurveTo(offsetX + span * 0.5, -tipY * 0.3, offsetX, 0);
                ctx.fill();
            };

            // forewings (forward, larger)
            drawWingPair(this.bodyLen * 0.25, 1.0, flap);
            // hindwings (rear, slightly smaller, counter-flap)
            drawWingPair(-this.bodyLen * 0.05, 0.85, -flap * 0.9);

            ctx.shadowBlur = 0;

            // ---- body ----
            // color blend: body2 (dark tail) -> body1 (bright head)
            const cr = Math.round(palette.body2[0] + (palette.body1[0] - palette.body2[0]) * (0.5 + this.shade * 0.5));
            const cg = Math.round(palette.body2[1] + (palette.body1[1] - palette.body2[1]) * (0.5 + this.shade * 0.5));
            const cb = Math.round(palette.body2[2] + (palette.body1[2] - palette.body2[2]) * (0.5 + this.shade * 0.5));

            // abdomen (tapered tail)
            ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.92)';
            ctx.beginPath();
            ctx.moveTo(this.bodyLen * 0.4, 0);
            ctx.quadraticCurveTo(-this.bodyLen * 0.9, this.scale * 1.6, -this.bodyLen, 0);
            ctx.quadraticCurveTo(-this.bodyLen * 0.9, -this.scale * 1.6, this.bodyLen * 0.4, 0);
            ctx.fill();

            // thorax + head (bright)
            ctx.fillStyle = 'rgba(' + palette.body1[0] + ',' + palette.body1[1] + ',' + palette.body1[2] + ',1)';
            ctx.shadowColor = 'rgba(' + palette.body1[0] + ',' + palette.body1[1] + ',' + palette.body1[2] + ',0.6)';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(this.bodyLen * 0.5, 0, Math.max(0.5, this.scale * 2.6), 0, Math.PI * 2);
            ctx.fill();

            // eye glint
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.arc(this.bodyLen * 0.58, -this.scale * 0.6, Math.max(0.3, this.scale * 0.7), 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    /* === SHOCK WAVE (ripple ring on click) === */
    class Shock {
        constructor(x, y, power, maxRadius) {
            this.x = x;
            this.y = y;
            this.power = power;
            this.currentRadius = 0;
            this.maxRadius = maxRadius;
            this.bandWidth = 60;
            this.dead = false;
        }

        update() {
            this.currentRadius += 9;
            if (this.currentRadius > this.maxRadius + this.bandWidth) {
                this.dead = true;
            }
        }

        draw(ctx, palette) {
            const fade = 1 - this.currentRadius / this.maxRadius;
            if (fade <= 0) return;
            ctx.strokeStyle = 'rgba(' + palette.trail[0] + ',' + palette.trail[1] + ',' + palette.trail[2] + ',' + (fade * 0.5) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.currentRadius), 0, Math.PI * 2);
            ctx.stroke();

            // inner softer ring
            ctx.strokeStyle = 'rgba(' + palette.wing[0] + ',' + palette.wing[1] + ',' + palette.wing[2] + ',' + (fade * 0.22) + ')';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.currentRadius - 4), 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /* === AMBIENT POLLEN (slow drifting motes for atmosphere) === */
    class Pollen {
        constructor() {
            this.reset(true);
        }
        reset(initial) {
            this.x = Math.random() * state.width;
            this.y = initial ? Math.random() * state.height : state.height + 10;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = -0.15 - Math.random() * 0.35;
            this.size = 0.6 + Math.random() * 1.6;
            this.phase = Math.random() * Math.PI * 2;
            this.freq = 0.008 + Math.random() * 0.012;
            this.alpha = 0.2 + Math.random() * 0.4;
        }
        update() {
            this.phase += this.freq;
            this.x += this.vx + Math.sin(this.phase) * 0.4;
            this.y += this.vy;
            if (this.y < -10 || this.x < -10 || this.x > state.width + 10) {
                this.reset(false);
            }
        }
        draw(ctx, palette) {
            ctx.fillStyle = 'rgba(' + palette.wing[0] + ',' + palette.wing[1] + ',' + palette.wing[2] + ',' + this.alpha + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.2, this.size), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* === INIT === */
    function init() {
        state.canvas = document.getElementById('trail-canvas');
        state.ctx = state.canvas.getContext('2d', { alpha: true });

        state.mouse.x = window.innerWidth / 2;
        state.mouse.y = window.innerHeight / 2;
        state.mouse.px = state.mouse.x;
        state.mouse.py = state.mouse.y;

        resize();
        spawnFlies();
        spawnPollen();
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

    function spawnFlies() {
        state.flies = [];
        for (let i = 0; i < state.count; i++) {
            state.flies.push(new Dragonfly(i));
        }
        document.getElementById('tele-swarm').textContent = state.count;
    }

    function spawnPollen() {
        state.ambient = [];
        const n = Math.round(Math.min(state.width, 1600) / 28);
        for (let i = 0; i < n; i++) {
            state.ambient.push(new Pollen());
        }
    }

    function adjustFlyCount() {
        const target = state.count;
        const current = state.flies.length;
        if (target > current) {
            const toAdd = Math.min(MAX_FLIES - current, target - current);
            for (let i = 0; i < toAdd; i++) {
                state.flies.push(new Dragonfly(current + i));
            }
        } else if (target < current) {
            state.flies.length = target;
        }
        // re-index offset slots so formation/orbit distribute evenly
        state.flies.forEach(function (f, i) {
            f.idx = i;
            f.offsetAngle = (i / Math.max(1, state.flies.length)) * Math.PI * 2;
        });
        state.count = state.flies.length;
        document.getElementById('tele-swarm').textContent = state.count;
    }

    function gatherSwarm() {
        // pull every fly hard toward the cursor
        const mx = state.mouse.x;
        const my = state.mouse.y;
        for (let i = 0; i < state.flies.length; i++) {
            const f = state.flies[i];
            f.vx += (mx - f.x) * 0.04;
            f.vy += (my - f.y) * 0.04;
        }
    }

    function burstSwarm() {
        // shockwave at cursor — scatter flies outward
        state.shocks.push(new Shock(state.mouse.x, state.mouse.y, 7, Math.max(state.width, state.height) * 0.6));
        for (let i = 0; i < state.flies.length; i++) {
            state.flies[i].burstFrom(state.mouse.x, state.mouse.y, 9);
        }
    }

    /* === EVENTS === */
    function bindEvents() {
        window.addEventListener('resize', function () {
            resize();
            spawnPollen();
        });

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mouseleave', function () { state.mouse.active = false; });
        document.addEventListener('mouseenter', function () { state.mouse.active = true; });

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchend', onMouseUp);

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
        state.shocks.push(new Shock(e.clientX, e.clientY, 6, 380));
        for (let i = 0; i < state.flies.length; i++) {
            state.flies[i].burstFrom(e.clientX, e.clientY, 7);
        }
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
            adjustFlyCount();
            return state.count;
        });

        bindSlider('slider-radius', 'val-radius', function (v) {
            state.hoverRadius = parseInt(v, 10);
            return v;
        });

        bindSlider('slider-spring', 'val-spring', function (v) {
            state.spring = parseInt(v, 10) / 1000;
            return state.spring.toFixed(2);
        });

        bindSlider('slider-damp', 'val-damp', function (v) {
            state.damping = parseInt(v, 10) / 100;
            return state.damping.toFixed(2);
        });

        bindSlider('slider-trail', 'val-trail', function (v) {
            state.trailLen = parseInt(v, 10);
            return v;
        });

        // Actions
        document.getElementById('btn-gather').addEventListener('click', gatherSwarm);
        document.getElementById('btn-burst').addEventListener('click', burstSwarm);

        // Hint auto-hide
        setTimeout(function () {
            document.getElementById('hint').classList.add('hidden');
        }, 10000);
    }

    function bindSlider(sliderId, valId, handler) {
        const slider = document.getElementById(sliderId);
        const valEl = document.getElementById(valId);
        slider.addEventListener('input', function () {
            valEl.textContent = handler(slider.value);
            hideHint();
        });
    }

    function hideHint() {
        document.getElementById('hint').classList.add('hidden');
    }

    /* === ANIMATE LOOP === */
    function animate(time) {
        if (!state.running) return;

        // FPS
        state.frameCount++;
        const elapsed = time - state.lastFpsTime;
        if (elapsed >= 500) {
            state.fps = Math.round((state.frameCount * 1000) / elapsed);
            document.getElementById('tele-fps').textContent = state.fps;
            state.frameCount = 0;
            state.lastFpsTime = time;
        }
        state.time = time;

        const ctx = state.ctx;
        const palette = PALETTES[state.palette];

        // fade-clear for ghosted motion (very low alpha = long persistence)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.fillRect(0, 0, state.width, state.height);

        // ambient pollen
        for (let i = 0; i < state.ambient.length; i++) {
            const p = state.ambient[i];
            p.update();
            p.draw(ctx, palette);
        }

        // shockwaves
        for (let s = state.shocks.length - 1; s >= 0; s--) {
            state.shocks[s].update();
            state.shocks[s].draw(ctx, palette);
            if (state.shocks[s].dead) state.shocks.splice(s, 1);
        }

        // mouse velocity decay
        state.mouse.vx *= 0.82;
        state.mouse.vy *= 0.82;
        state.mouse.speed *= 0.82;

        // update + draw flies
        const mx = state.mouse.x;
        const my = state.mouse.y;
        const mspeed = state.mouse.speed;
        const mode = state.mode;
        const hoverRadius = state.hoverRadius;
        const spring = state.spring;
        const damping = state.damping;
        const trailLen = state.trailLen;
        const shocks = state.shocks;
        const shockLen = shocks.length;

        let totalWing = 0;

        // pass 1: trails (under bodies)
        for (let i = 0; i < state.flies.length; i++) {
            const f = state.flies[i];
            f.drawTrail(ctx, palette, trailLen);
        }

        // pass 2: physics + shock + bodies
        for (let i = 0; i < state.flies.length; i++) {
            const f = state.flies[i];
            for (let k = 0; k < shockLen; k++) {
                f.applyShock(shocks[k]);
            }
            f.update(mx, my, mspeed, mode, hoverRadius, spring, damping, time);
            f.draw(ctx, palette);
            totalWing += Math.abs(Math.sin(f.wingPhase));
        }

        // telemetry: average wing intensity
        document.getElementById('tele-wing').textContent =
            (totalWing / Math.max(1, state.flies.length)).toFixed(2);

        requestAnimationFrame(animate);
    }

    /* === BOOT === */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
