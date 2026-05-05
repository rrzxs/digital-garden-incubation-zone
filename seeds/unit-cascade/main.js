(function () {
    'use strict';

    var canvas = document.getElementById('cascade-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var stageArea = document.getElementById('stage-area');
    var statUnits = document.getElementById('stat-units');
    var statCascades = document.getElementById('stat-cascades');
    var statEnergy = document.getElementById('stat-energy');

    var ctrlGravity = document.getElementById('ctrl-gravity');
    var ctrlCascade = document.getElementById('ctrl-cascade');
    var ctrlBounce = document.getElementById('ctrl-bounce');
    var valGravity = document.getElementById('val-gravity');
    var valCascade = document.getElementById('val-cascade');
    var valBounce = document.getElementById('val-bounce');
    var btnDrop = document.getElementById('btn-drop');
    var btnTrigger = document.getElementById('btn-trigger');
    var btnReset = document.getElementById('btn-reset');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var modeBtns = document.querySelectorAll('.mode-btn');

    var state = {
        mouse: { x: -9999, y: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        gravity: 0.18,
        cascadeStrength: 0.55,
        bounce: 0.55,
        mode: 'cascade',
        palette: 'obsidian',
        dpr: window.devicePixelRatio || 1,
        animId: null,
        lastTime: 0,
        units: [],
        ripples: [],
        sparkles: [],
        cascadeCount: 0,
        totalEnergy: 0,
        stageW: 0,
        stageH: 0,
        autoDropTimer: 0,
        autoDropInterval: 120
    };

    var palettes = {
        obsidian: {
            unit: [
                { r: 139, g: 92, b: 246 },
                { r: 99, g: 102, b: 241 },
                { r: 168, g: 85, b: 247 },
                { r: 236, g: 72, b: 153 },
                { r: 192, g: 132, b: 252 }
            ],
            sparkle: { r: 167, g: 139, b: 250 },
            ripple: { r: 139, g: 92, b: 246 },
            glow: 'rgba(139, 92, 246, 0.08)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540']
        },
        aurora: {
            unit: [
                { r: 0, g: 212, b: 255 },
                { r: 0, g: 255, b: 136 },
                { r: 168, g: 85, b: 247 },
                { r: 34, g: 211, b: 238 },
                { r: 74, g: 222, b: 128 }
            ],
            sparkle: { r: 0, g: 230, b: 200 },
            ripple: { r: 0, g: 212, b: 255 },
            glow: 'rgba(0, 212, 255, 0.08)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530']
        },
        ember: {
            unit: [
                { r: 249, g: 115, b: 22 },
                { r: 239, g: 68, b: 68 },
                { r: 251, g: 191, b: 36 },
                { r: 244, g: 63, b: 94 },
                { r: 253, g: 164, b: 175 }
            ],
            sparkle: { r: 251, g: 146, b: 60 },
            ripple: { r: 249, g: 115, b: 22 },
            glow: 'rgba(249, 115, 22, 0.08)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008']
        },
        frost: {
            unit: [
                { r: 165, g: 180, b: 252 },
                { r: 103, g: 232, b: 249 },
                { r: 224, g: 231, b: 255 },
                { r: 196, g: 181, b: 253 },
                { r: 147, g: 197, b: 253 }
            ],
            sparkle: { r: 191, g: 219, b: 254 },
            ripple: { r: 165, g: 180, b: 252 },
            glow: 'rgba(165, 180, 252, 0.08)',
            blobs: ['#0d1530', '#101a3a', '#151a40', '#0d1830']
        }
    };

    var UNIT_SIZE = 22;
    var UNIT_GAP = 3;
    var UNIT_STEP = UNIT_SIZE + UNIT_GAP;
    var MAX_UNITS = 300;
    var RIPPLE_SPEED = 3.5;

    function init() {
        resizeCanvas();
        seedInitialUnits();
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    function resizeCanvas() {
        var rect = stageArea.getBoundingClientRect();
        state.stageW = rect.width;
        state.stageH = rect.height;
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function seedInitialUnits() {
        state.units = [];
        var cols = Math.floor(state.stageW / UNIT_STEP);
        var rows = Math.floor(state.stageH / UNIT_STEP);
        var startCols = Math.min(cols, 10);
        var startRows = Math.min(rows, 5);
        var offsetX = (state.stageW - startCols * UNIT_STEP + UNIT_GAP) / 2;
        var offsetY = state.stageH - startRows * UNIT_STEP - 20;

        for (var row = 0; row < startRows; row++) {
            for (var col = 0; col < startCols; col++) {
                var tx = offsetX + col * UNIT_STEP;
                var ty = offsetY + row * UNIT_STEP;
                state.units.push(createUnit(tx, ty - state.stageH - Math.random() * 200, tx, ty));
            }
        }
    }

    function createUnit(x, y, targetX, targetY) {
        var pal = palettes[state.palette].unit;
        var colorIdx = Math.floor(Math.random() * pal.length);
        return {
            x: x,
            y: y,
            targetX: targetX !== undefined ? targetX : x,
            targetY: targetY !== undefined ? targetY : y,
            vx: 0,
            vy: 0,
            rotation: (Math.random() - 0.5) * 0.4,
            rotVel: 0,
            scale: 1,
            scaleVel: 0,
            settled: false,
            cascading: false,
            cascadeDelay: 0,
            colorIdx: colorIdx,
            alpha: 1,
            settledTime: 0,
            glowIntensity: 0
        };
    }

    function createRipple(x, y, strength) {
        return {
            x: x,
            y: y,
            radius: 0,
            maxRadius: 250 + strength * 80,
            alpha: 0.6 + strength * 0.3,
            speed: RIPPLE_SPEED + strength * 2,
            life: 1
        };
    }

    function createSparkle(x, y) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 1.5 + Math.random() * 3;
        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            alpha: 1,
            radius: 1 + Math.random() * 2.5,
            life: 1,
            decay: 0.015 + Math.random() * 0.02
        };
    }

    function bindEvents() {
        stageArea.addEventListener('mousemove', function (e) {
            var rect = stageArea.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouseInStage = true;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        stageArea.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        stageArea.addEventListener('click', function (e) {
            var rect = stageArea.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;
            triggerCascadeAt(cx, cy, 1.0);
        });

        stageArea.addEventListener('touchstart', function (e) {
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            var cx = touch.clientX - rect.left;
            var cy = touch.clientY - rect.top;
            triggerCascadeAt(cx, cy, 1.0);
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: true });

        stageArea.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            state.mouseInStage = true;
        }, { passive: false });

        stageArea.addEventListener('touchend', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            seedInitialUnits();
        }, 250));
    }

    function triggerCascadeAt(cx, cy, strength) {
        state.cascadeCount++;
        state.ripples.push(createRipple(cx, cy, strength));

        var cascadeRadius = 120 + strength * 60;
        var delay = 0;

        for (var i = 0; i < state.units.length; i++) {
            var u = state.units[i];
            if (!u.settled) continue;

            var dx = u.x - cx;
            var dy = u.y - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < cascadeRadius) {
                var force = (1 - dist / cascadeRadius) * state.cascadeStrength * strength;
                var angle = Math.atan2(dy, dx);

                u.settled = false;
                u.cascading = true;
                u.cascadeDelay = delay;
                u.settledTime = 0;
                u.vx += Math.cos(angle) * force * 8;
                u.vy += Math.sin(angle) * force * 6 - force * 4;
                u.rotVel += (Math.random() - 0.5) * force * 0.5;
                u.glowIntensity = Math.min(1, force * 2);

                delay += 2;

                if (Math.random() < 0.3 * strength) {
                    state.sparkles.push(createSparkle(u.x, u.y));
                }
            }
        }

        for (var s = 0; s < Math.floor(12 * strength); s++) {
            state.sparkles.push(createSparkle(
                cx + (Math.random() - 0.5) * 40,
                cy + (Math.random() - 0.5) * 40
            ));
        }
    }

    function bindControls() {
        ctrlGravity.addEventListener('input', function () {
            state.gravity = parseInt(this.value, 10) / 100;
            valGravity.textContent = state.gravity.toFixed(2);
        });

        ctrlCascade.addEventListener('input', function () {
            state.cascadeStrength = parseInt(this.value, 10) / 100;
            valCascade.textContent = state.cascadeStrength.toFixed(2);
        });

        ctrlBounce.addEventListener('input', function () {
            state.bounce = parseInt(this.value, 10) / 100;
            valBounce.textContent = state.bounce.toFixed(2);
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette();
            });
        });

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
            });
        });

        btnDrop.addEventListener('click', function () {
            dropRow();
        });

        btnTrigger.addEventListener('click', function () {
            var cx = state.stageW / 2 + (Math.random() - 0.5) * state.stageW * 0.4;
            var cy = state.stageH / 2 + (Math.random() - 0.5) * state.stageH * 0.3;
            triggerCascadeAt(cx, cy, 1.2);
        });

        btnReset.addEventListener('click', function () {
            state.units = [];
            state.ripples = [];
            state.sparkles = [];
            state.cascadeCount = 0;
            state.totalEnergy = 0;
            state.hasInteracted = false;
            stageHint.classList.remove('hidden');
            seedInitialUnits();
        });

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                btnFullscreen.querySelector('span').textContent = '退出';
            } else {
                document.exitFullscreen();
                btnFullscreen.querySelector('span').textContent = '全屏';
            }
        });
    }

    function dropRow() {
        if (state.units.length >= MAX_UNITS) return;

        var cols = Math.floor(state.stageW / UNIT_STEP);
        var count = Math.min(cols, 10 + Math.floor(Math.random() * 4));
        var offsetX = (state.stageW - count * UNIT_STEP + UNIT_GAP) / 2;

        for (var i = 0; i < count; i++) {
            var tx = offsetX + i * UNIT_STEP;
            var ty = state.stageH - 20 - Math.floor(Math.random() * 3) * UNIT_STEP;
            state.units.push(createUnit(
                tx + (Math.random() - 0.5) * 30,
                -UNIT_SIZE - Math.random() * 80 - i * 15,
                tx,
                ty
            ));
        }
    }

    function applyPalette() {
        var p = palettes[state.palette];
        cursorGlow.style.background = 'radial-gradient(circle, ' + p.glow + ' 0%, transparent 70%)';

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + p.blobs[i % p.blobs.length] + ' 0%, transparent 70%)';
        });
    }

    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;

        ctx.clearRect(0, 0, canvas.width / state.dpr, canvas.height / state.dpr);

        updateUnits(dt);
        updateRipples(dt);
        updateSparkles(dt);

        if (state.mode === 'wave') {
            applyWaveField(dt);
        }

        drawGrid();
        drawRipples();
        drawUnits();
        drawSparkles();

        if (state.mouseInStage && state.mode === 'field') {
            drawFieldLines();
        }

        updateStats();

        state.autoDropTimer += dt;
        if (state.autoDropTimer > state.autoDropInterval) {
            state.autoDropTimer = 0;
            if (state.units.length < MAX_UNITS * 0.6) {
                dropRow();
            }
        }

        state.animId = requestAnimationFrame(animate);
    }

    function updateUnits(dt) {
        var gravity = state.gravity;
        var bounceFactor = state.bounce;
        var stageH = state.stageH;
        var stageW = state.stageW;
        var totalKE = 0;

        for (var i = 0; i < state.units.length; i++) {
            var u = state.units[i];

            if (u.cascadeDelay > 0) {
                u.cascadeDelay -= dt;
                continue;
            }

            if (!u.settled) {
                u.vy += gravity * 16 * dt;

                if (state.mouseInStage && state.mode === 'field') {
                    var mdx = state.mouse.x - u.x;
                    var mdy = state.mouse.y - u.y;
                    var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                    var fieldRadius = 160;

                    if (mDist < fieldRadius && mDist > 1) {
                        var mForce = (1 - mDist / fieldRadius);
                        mForce = mForce * mForce * 0.4;
                        var mAngle = Math.atan2(mdy, mdx);
                        u.vx -= Math.cos(mAngle) * mForce * 3 * dt;
                        u.vy -= Math.sin(mAngle) * mForce * 3 * dt;
                        u.rotVel += Math.sin(mAngle) * mForce * 0.1 * dt;
                    }
                }

                u.x += u.vx * dt;
                u.y += u.vy * dt;

                var floorY = stageH - UNIT_SIZE - 6;
                if (u.y > floorY) {
                    u.y = floorY;
                    u.vy = -Math.abs(u.vy) * bounceFactor;
                    u.vx *= 0.92;
                    u.rotVel *= 0.7;

                    if (Math.abs(u.vy) < 0.5) {
                        u.vy = 0;
                        u.settled = true;
                        u.cascading = false;
                        u.settledTime = 0;
                        u.targetY = u.y;
                        u.targetX = u.x;
                    }
                }

                if (u.x < UNIT_SIZE) {
                    u.x = UNIT_SIZE;
                    u.vx = Math.abs(u.vx) * bounceFactor * 0.7;
                }
                if (u.x > stageW - UNIT_SIZE) {
                    u.x = stageW - UNIT_SIZE;
                    u.vx = -Math.abs(u.vx) * bounceFactor * 0.7;
                }

                u.rotation += u.rotVel * dt;
                u.rotVel *= Math.pow(0.94, dt);

                u.glowIntensity *= Math.pow(0.95, dt);
            } else {
                u.settledTime += dt * 0.016;

                u.vx += (u.targetX - u.x) * 0.05 * dt;
                u.vy += (u.targetY - u.y) * 0.05 * dt;
                u.vx *= Math.pow(0.85, dt);
                u.vy *= Math.pow(0.85, dt);
                u.x += u.vx * dt;
                u.y += u.vy * dt;

                u.rotation += (0 - u.rotation) * 0.08 * dt;
                u.rotVel *= Math.pow(0.9, dt);

                u.scaleVel += (1 - u.scale) * 0.1 * dt;
                u.scaleVel *= Math.pow(0.88, dt);
                u.scale += u.scaleVel * dt;

                u.glowIntensity *= Math.pow(0.97, dt);
            }

            totalKE += u.vx * u.vx + u.vy * u.vy;
        }

        state.totalEnergy = totalKE;

        resolveCollisions();
    }

    function resolveCollisions() {
        var units = state.units;
        var len = units.length;
        var minDist = UNIT_SIZE * 0.92;

        for (var i = 0; i < len; i++) {
            var a = units[i];
            if (a.cascadeDelay > 0) continue;

            for (var j = i + 1; j < len; j++) {
                var b = units[j];
                if (b.cascadeDelay > 0) continue;

                var dx = b.x - a.x;
                var dy = b.y - a.y;
                var distSq = dx * dx + dy * dy;

                if (distSq < minDist * minDist && distSq > 0.01) {
                    var dist = Math.sqrt(distSq);
                    var overlap = (minDist - dist) * 0.5;
                    var nx = dx / dist;
                    var ny = dy / dist;

                    var aSettled = a.settled;
                    var bSettled = b.settled;

                    if (!aSettled || !bSettled) {
                        if (!aSettled) {
                            a.x -= nx * overlap * 0.6;
                            a.y -= ny * overlap * 0.6;
                        }
                        if (!bSettled) {
                            b.x += nx * overlap * 0.6;
                            b.y += ny * overlap * 0.6;
                        }
                    }

                    if (aSettled && !bSettled && Math.abs(b.vy) > 2) {
                        a.settled = false;
                        a.vy = -Math.abs(b.vy) * state.cascadeStrength * 0.3;
                        a.vx += (Math.random() - 0.5) * 2;
                        a.rotVel += (Math.random() - 0.5) * 0.1;
                        a.glowIntensity = 0.6;
                    }
                    if (bSettled && !aSettled && Math.abs(a.vy) > 2) {
                        b.settled = false;
                        b.vy = -Math.abs(a.vy) * state.cascadeStrength * 0.3;
                        b.vx += (Math.random() - 0.5) * 2;
                        b.rotVel += (Math.random() - 0.5) * 0.1;
                        b.glowIntensity = 0.6;
                    }
                }
            }
        }
    }

    function updateRipples(dt) {
        for (var i = state.ripples.length - 1; i >= 0; i--) {
            var r = state.ripples[i];
            r.radius += r.speed * dt;
            r.life -= 0.012 * dt;
            r.alpha = r.life * 0.5;

            if (r.life <= 0 || r.radius > r.maxRadius) {
                state.ripples.splice(i, 1);
            }
        }
    }

    function updateSparkles(dt) {
        for (var i = state.sparkles.length - 1; i >= 0; i--) {
            var s = state.sparkles[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 0.06 * dt;
            s.life -= s.decay * dt;
            s.alpha = Math.max(0, s.life);

            if (s.life <= 0) {
                state.sparkles.splice(i, 1);
            }
        }
    }

    function applyWaveField(dt) {
        var time = performance.now() * 0.001;
        for (var i = 0; i < state.units.length; i++) {
            var u = state.units[i];
            if (!u.settled) continue;

            var waveY = Math.sin(u.x * 0.015 + time * 2) * 4 +
                        Math.sin(u.x * 0.008 - time * 1.5) * 3;
            var waveX = Math.cos(u.y * 0.012 + time * 1.8) * 2;

            u.targetY = u.y + waveY * state.cascadeStrength;
            u.targetX = u.x + waveX * state.cascadeStrength * 0.5;
            u.settled = true;
            u.settledTime += dt * 0.016;
        }
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
        ctx.lineWidth = 0.5;

        var cols = Math.floor(state.stageW / UNIT_STEP);
        var rows = Math.floor(state.stageH / UNIT_STEP);

        for (var c = 0; c <= cols; c++) {
            var x = c * UNIT_STEP;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, state.stageH);
            ctx.stroke();
        }
        for (var r = 0; r <= rows; r++) {
            var y = r * UNIT_STEP;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(state.stageW, y);
            ctx.stroke();
        }
    }

    function drawRipples() {
        var pal = palettes[state.palette].ripple;

        for (var i = 0; i < state.ripples.length; i++) {
            var r = state.ripples[i];

            ctx.beginPath();
            ctx.arc(r.x, r.y, Math.max(0.1, r.radius), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + r.alpha.toFixed(3) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (r.radius > 20) {
                ctx.beginPath();
                ctx.arc(r.x, r.y, Math.max(0.1, r.radius * 0.6), 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (r.alpha * 0.4).toFixed(3) + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            var grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, Math.max(1, r.radius * 0.4));
            grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (r.alpha * 0.08).toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
            ctx.beginPath();
            ctx.arc(r.x, r.y, Math.max(1, r.radius * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    function drawUnits() {
        var pal = palettes[state.palette].unit;
        var halfSize = UNIT_SIZE * 0.5;
        var cornerRadius = 5;

        for (var i = 0; i < state.units.length; i++) {
            var u = state.units[i];
            if (u.cascadeDelay > 0) continue;

            var color = pal[u.colorIdx % pal.length];
            var alpha = u.alpha;

            ctx.save();
            ctx.translate(u.x, u.y);
            ctx.rotate(u.rotation);
            ctx.scale(u.scale, u.scale);

            if (u.glowIntensity > 0.05) {
                ctx.shadowColor = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (u.glowIntensity * 0.5).toFixed(3) + ')';
                ctx.shadowBlur = 16 * u.glowIntensity;
            }

            var grad = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
            var lighten = 30;
            grad.addColorStop(0, 'rgba(' + Math.min(255, color.r + lighten) + ',' + Math.min(255, color.g + lighten) + ',' + Math.min(255, color.b + lighten) + ',' + alpha.toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha.toFixed(3) + ')');

            drawRoundRect(ctx, -halfSize, -halfSize, UNIT_SIZE, UNIT_SIZE, cornerRadius);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255,' + (0.06 + u.glowIntensity * 0.15).toFixed(3) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            var hlGrad = ctx.createLinearGradient(-halfSize, -halfSize, halfSize * 0.5, halfSize * 0.5);
            hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
            hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            drawRoundRect(ctx, -halfSize, -halfSize, UNIT_SIZE, UNIT_SIZE, cornerRadius);
            ctx.fillStyle = hlGrad;
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    function drawSparkles() {
        var pal = palettes[state.palette].sparkle;

        for (var i = 0; i < state.sparkles.length; i++) {
            var s = state.sparkles[i];

            ctx.beginPath();
            ctx.arc(s.x, s.y, Math.max(0.1, s.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + s.alpha.toFixed(3) + ')';
            ctx.fill();

            if (s.radius > 1.5) {
                var grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, Math.max(0.1, s.radius * 3));
                grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (s.alpha * 0.3).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
                ctx.beginPath();
                ctx.arc(s.x, s.y, Math.max(0.1, s.radius * 3), 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }
        }
    }

    function drawFieldLines() {
        var pal = palettes[state.palette].ripple;
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var fieldRadius = 160;

        for (var i = 0; i < state.units.length; i++) {
            var u = state.units[i];
            var dx = u.x - mx;
            var dy = u.y - my;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < fieldRadius && dist > 1) {
                var alpha = (1 - dist / fieldRadius) * 0.12;
                ctx.beginPath();
                ctx.moveTo(u.x, u.y);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }

    function drawRoundRect(context, x, y, w, h, r) {
        r = Math.min(r, w * 0.5, h * 0.5);
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.arcTo(x + w, y, x + w, y + r, r);
        context.lineTo(x + w, y + h - r);
        context.arcTo(x + w, y + h, x + w - r, y + h, r);
        context.lineTo(x + r, y + h);
        context.arcTo(x, y + h, x, y + h - r, r);
        context.lineTo(x, y + r);
        context.arcTo(x, y, x + r, y, r);
        context.closePath();
    }

    function updateStats() {
        statUnits.textContent = state.units.length;
        statCascades.textContent = state.cascadeCount;
        statEnergy.textContent = state.totalEnergy.toFixed(1);
    }

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var self = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(self, args);
            }, delay);
        };
    }

    init();
})();
