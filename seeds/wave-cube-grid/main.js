(function () {
    'use strict';

    // === DOM Elements ===
    var cubeGrid = document.getElementById('cube-grid');
    var trailCanvas = document.getElementById('trail-canvas');
    var ctx = trailCanvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var stageArea = document.getElementById('stage-area');
    var hudMode = document.getElementById('hud-mode');
    var hudCubes = document.getElementById('hud-cubes');
    var hudFps = document.getElementById('hud-fps');
    var hudEnergy = document.getElementById('hud-energy');

    var ctrlRadius = document.getElementById('ctrl-radius');
    var ctrlStrength = document.getElementById('ctrl-strength');
    var ctrlDamping = document.getElementById('ctrl-damping');
    var valRadius = document.getElementById('val-radius');
    var valStrength = document.getElementById('val-strength');
    var valDamping = document.getElementById('val-damping');
    var btnPulse = document.getElementById('btn-pulse');
    var btnReset = document.getElementById('btn-reset');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var modeBtns = document.querySelectorAll('.mode-btn');

    // === State ===
    var state = {
        mouse: { x: -9999, y: -9999, prevX: -9999, prevY: -9999, vx: 0, vy: 0 },
        mouseInStage: false,
        hasInteracted: false,
        fieldRadius: 180,
        strength: 0.55,
        damping: 0.80,
        mode: 'ripple',
        palette: 'aurora',
        cubes: [],
        ripples: [],
        trails: [],
        autoTime: 0,
        autoAngle: 0,
        dpr: window.devicePixelRatio || 1,
        animId: null,
        lastTime: 0,
        fpsBuffer: [],
        fpsTimer: 0,
        energy: 0,
        gridCols: 0,
        gridRows: 0,
        stageRect: { width: 0, height: 0 }
    };

    // === Palettes ===
    var palettes = {
        aurora: {
            accent: 'rgba(52, 211, 153, 0.5)',
            glow: 'rgba(52, 211, 153, 0.18)',
            cubeActive: 'rgba(52, 211, 153, 0.06)',
            cursorGlow: 'rgba(52, 211, 153, 0.06)',
            particle: { r: 52, g: 211, b: 153 },
            particle2: { r: 6, g: 182, b: 212 },
            blobs: ['#0a3d2e', '#0d1e3f', '#1a1248', '#0c2a38'],
            cssAccent: '#34d399',
            cssSecondary: '#06b6d4'
        },
        ember: {
            accent: 'rgba(251, 146, 60, 0.5)',
            glow: 'rgba(251, 146, 60, 0.18)',
            cubeActive: 'rgba(251, 146, 60, 0.06)',
            cursorGlow: 'rgba(251, 146, 60, 0.06)',
            particle: { r: 251, g: 146, b: 60 },
            particle2: { r: 239, g: 68, b: 68 },
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            cssAccent: '#fb923c',
            cssSecondary: '#f97316'
        },
        bloom: {
            accent: 'rgba(236, 72, 153, 0.5)',
            glow: 'rgba(236, 72, 153, 0.18)',
            cubeActive: 'rgba(236, 72, 153, 0.06)',
            cursorGlow: 'rgba(236, 72, 153, 0.06)',
            particle: { r: 236, g: 72, b: 153 },
            particle2: { r: 168, g: 85, b: 247 },
            blobs: ['#2a0a1e', '#1a0a2e', '#2d1040', '#2a1038'],
            cssAccent: '#ec4899',
            cssSecondary: '#a855f7'
        },
        frost: {
            accent: 'rgba(186, 230, 253, 0.5)',
            glow: 'rgba(186, 230, 253, 0.18)',
            cubeActive: 'rgba(186, 230, 253, 0.06)',
            cursorGlow: 'rgba(186, 230, 253, 0.06)',
            particle: { r: 186, g: 230, b: 253 },
            particle2: { r: 165, g: 243, b: 252 },
            blobs: ['#1a2840', '#0d2a3f', '#1a3050', '#0c2838'],
            cssAccent: '#bae6fd',
            cssSecondary: '#a5f3fc'
        }
    };

    var CUBE_GAP = 8;
    var CUBE_PAD = 24;
    var TRAIL_MAX = 150;

    // === Init ===
    function init() {
        buildGrid();
        resizeCanvas();
        bindEvents();
        bindControls();
        applyPalette();
        hudCubes.textContent = state.cubes.length;
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    // === Grid Construction ===
    function buildGrid() {
        var rect = stageArea.getBoundingClientRect();
        state.stageRect.width = rect.width;
        state.stageRect.height = rect.height;

        var w = rect.width - CUBE_PAD * 2;
        var h = rect.height - CUBE_PAD * 2;

        var targetSize = 62;
        var cols = Math.max(4, Math.floor((w + CUBE_GAP) / (targetSize + CUBE_GAP)));
        var rows = Math.max(3, Math.floor((h + CUBE_GAP) / (targetSize + CUBE_GAP)));

        cubeGrid.style.setProperty('--cols', cols);
        cubeGrid.style.setProperty('--rows', rows);
        cubeGrid.innerHTML = '';

        state.gridCols = cols;
        state.gridRows = rows;
        state.cubes = [];

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var cell = document.createElement('div');
                cell.className = 'cube-cell';

                var top = document.createElement('div');
                top.className = 'cube-top';
                cell.appendChild(top);

                cubeGrid.appendChild(cell);

                state.cubes.push({
                    el: cell,
                    topEl: top,
                    col: c,
                    row: r,
                    normCol: cols > 1 ? c / (cols - 1) : 0.5,
                    normRow: rows > 1 ? r / (rows - 1) : 0.5,
                    homeX: 0,
                    homeY: 0,
                    width: 0,
                    height: 0,
                    elevation: 0,
                    elevVel: 0,
                    rotateX: 0,
                    rotateY: 0,
                    rotVelX: 0,
                    rotVelY: 0,
                    scale: 1,
                    scaleVel: 0,
                    hue: 0,
                    brightness: 0,
                    isActive: false
                });
            }
        }

        requestAnimationFrame(function () {
            var sr = stageArea.getBoundingClientRect();
            state.stageRect.width = sr.width;
            state.stageRect.height = sr.height;
            state.cubes.forEach(function (t) {
                var r = t.el.getBoundingClientRect();
                t.homeX = r.left + r.width / 2 - sr.left;
                t.homeY = r.top + r.height / 2 - sr.top;
                t.width = r.width;
                t.height = r.height;
            });
        });
    }

    function resizeCanvas() {
        var rect = stageArea.getBoundingClientRect();
        trailCanvas.width = rect.width * state.dpr;
        trailCanvas.height = rect.height * state.dpr;
        trailCanvas.style.width = rect.width + 'px';
        trailCanvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    // === Event Binding ===
    function bindEvents() {
        stageArea.addEventListener('mousemove', function (e) {
            var rect = stageArea.getBoundingClientRect();
            state.mouse.prevX = state.mouse.x;
            state.mouse.prevY = state.mouse.y;
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouse.vx = state.mouse.x - state.mouse.prevX;
            state.mouse.vy = state.mouse.y - state.mouse.prevY;
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
            emitRipple(e.clientX - rect.left, e.clientY - rect.top);
        });

        stageArea.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            state.mouse.prevX = state.mouse.x;
            state.mouse.prevY = state.mouse.y;
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            state.mouse.vx = state.mouse.x - state.mouse.prevX;
            state.mouse.vy = state.mouse.y - state.mouse.prevY;
            state.mouseInStage = true;

            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: false });

        stageArea.addEventListener('touchstart', function (e) {
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            emitRipple(touch.clientX - rect.left, touch.clientY - rect.top);
        }, { passive: true });

        stageArea.addEventListener('touchend', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        window.addEventListener('resize', debounce(function () {
            buildGrid();
            resizeCanvas();
            hudCubes.textContent = state.cubes.length;
        }, 250));
    }

    function bindControls() {
        ctrlRadius.addEventListener('input', function () {
            state.fieldRadius = parseInt(this.value, 10);
            valRadius.textContent = state.fieldRadius;
        });

        ctrlStrength.addEventListener('input', function () {
            state.strength = parseInt(this.value, 10) / 100;
            valStrength.textContent = state.strength.toFixed(2);
        });

        ctrlDamping.addEventListener('input', function () {
            state.damping = parseInt(this.value, 10) / 100;
            valDamping.textContent = state.damping.toFixed(2);
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
                hudMode.textContent = state.mode.toUpperCase();
            });
        });

        btnPulse.addEventListener('click', function () {
            var cx = state.stageRect.width / 2;
            var cy = state.stageRect.height / 2;
            emitRipple(cx, cy);
        });

        btnReset.addEventListener('click', function () {
            state.cubes.forEach(function (t) {
                t.elevation = 0;
                t.elevVel = 0;
                t.rotateX = 0;
                t.rotateY = 0;
                t.rotVelX = 0;
                t.rotVelY = 0;
                t.scale = 1;
                t.scaleVel = 0;
                t.brightness = 0;
                t.isActive = false;
                t.el.style.transform = '';
                t.el.style.opacity = '';
                t.el.classList.remove('active');
            });
            state.ripples = [];
            state.trails = [];
            state.energy = 0;
            state.hasInteracted = false;
            stageHint.classList.remove('hidden');
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

    // === Palette Application ===
    function applyPalette() {
        var p = palettes[state.palette];
        var root = document.documentElement;

        root.style.setProperty('--color-accent', p.cssAccent);
        root.style.setProperty('--color-accent-secondary', p.cssSecondary);
        root.style.setProperty('--cube-accent', p.accent);
        root.style.setProperty('--cube-glow', p.glow);
        cursorGlow.style.background = 'radial-gradient(circle, ' + p.cursorGlow + ' 0%, transparent 70%)';

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + p.blobs[i % p.blobs.length] + ' 0%, transparent 70%)';
        });
    }

    // === Ripple Emission ===
    function emitRipple(cx, cy) {
        state.ripples.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: Math.max(state.stageRect.width, state.stageRect.height) * 0.9,
            speed: 7,
            strength: 1,
            decay: 0.984
        });

        for (var i = 0; i < 8; i++) {
            var angle = (Math.PI * 2 * i) / 8;
            state.trails.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * (2 + Math.random() * 2),
                vy: Math.sin(angle) * (2 + Math.random() * 2),
                alpha: 0.6,
                radius: 4 + Math.random() * 3,
                life: 1
            });
        }
    }

    // === Animation Loop ===
    function animate(time) {
        var rawDt = time - state.lastTime;
        var dt = Math.min(rawDt / 16.67, 3);
        state.lastTime = time;

        state.fpsBuffer.push(rawDt);
        state.fpsTimer += rawDt;
        if (state.fpsTimer > 300) {
            var avgDt = state.fpsBuffer.reduce(function (a, b) { return a + b; }, 0) / state.fpsBuffer.length;
            var fps = Math.round(1000 / Math.max(1, avgDt));
            hudFps.textContent = fps;
            state.fpsBuffer = [];
            state.fpsTimer = 0;
        }

        ctx.clearRect(0, 0, trailCanvas.width / state.dpr, trailCanvas.height / state.dpr);

        updateRipples(dt);
        updateCubes(dt, time);
        applyCubeTransforms();
        updateTrails(dt);
        drawTrails();

        hudEnergy.style.width = Math.min(100, state.energy * 100).toFixed(0) + '%';

        state.animId = requestAnimationFrame(animate);
    }

    // === Ripple Update ===
    function updateRipples(dt) {
        for (var i = state.ripples.length - 1; i >= 0; i--) {
            var rip = state.ripples[i];
            rip.radius += rip.speed * dt;
            rip.strength *= Math.pow(rip.decay, dt);

            if (rip.strength < 0.01 || rip.radius > rip.maxRadius) {
                state.ripples.splice(i, 1);
            }
        }
    }

    // === Cube Physics Update ===
    function updateCubes(dt, time) {
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var mouseActive = state.mouseInStage && mx > -999;
        var fieldR = state.fieldRadius;
        var strength = state.strength;
        var damping = state.damping;
        var mode = state.mode;
        var now = time * 0.001;

        if (mode === 'auto') {
            state.autoTime += dt * 0.012;
            state.autoAngle += dt * 0.008;
            var autoX = state.stageRect.width * (0.5 + Math.cos(state.autoAngle) * 0.3);
            var autoY = state.stageRect.height * (0.5 + Math.sin(state.autoAngle * 0.7) * 0.25);

            if (Math.floor(state.autoTime * 60) % 180 === 0) {
                emitRipple(autoX, autoY);
            }
        }

        var totalEnergy = 0;

        state.cubes.forEach(function (t) {
            var cx = t.homeX;
            var cy = t.homeY;
            var influenceX = mouseActive ? mx : (mode === 'auto' ? autoX : -9999);
            var influenceY = mouseActive ? my : (mode === 'auto' ? autoY : -9999);

            if (influenceX > -999) {
                var dx = influenceX - cx;
                var dy = influenceY - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < fieldR && dist > 0.1) {
                    var force = (1 - dist / fieldR);
                    force = force * force;
                    var angle = Math.atan2(dy, dx);
                    var cosA = Math.cos(angle);
                    var sinA = Math.sin(angle);

                    if (mode === 'ripple' || mode === 'auto') {
                        t.elevVel += force * strength * 28 * dt;
                        t.rotVelX += (sinA * force * 0.05) * dt;
                        t.rotVelY -= (cosA * force * 0.05) * dt;
                        t.scaleVel += (force * 0.02) * dt;
                    } else if (mode === 'wave') {
                        var phase = dist * 0.04 - now * 3;
                        var waveForce = Math.sin(phase) * force;
                        t.elevVel += waveForce * strength * 30 * dt;
                        t.rotVelX += (waveForce * 0.04) * dt;
                        t.rotVelY += (Math.cos(phase) * force * 0.03) * dt;
                    } else if (mode === 'vortex') {
                        var tangentAngle = angle + Math.PI / 2;
                        t.elevVel += force * strength * 18 * dt;
                        t.rotVelX += (Math.cos(tangentAngle) * force * 0.06) * dt;
                        t.rotVelY += (Math.sin(tangentAngle) * force * 0.06) * dt;
                        t.scaleVel += (force * 0.015) * dt;
                    } else if (mode === 'pulse') {
                        var pulsePhase = Math.sin(now * 4 - dist * 0.03);
                        var pulseForce = Math.max(0, pulsePhase) * force;
                        t.elevVel += pulseForce * strength * 35 * dt;
                        t.rotVelX += (pulseForce * 0.03) * dt;
                        t.scaleVel += (pulseForce * 0.025) * dt;
                    }

                    t.brightness = Math.min(1, t.brightness + force * 0.18 * dt);

                    if (force > 0.12) {
                        if (!t.isActive) {
                            t.isActive = true;
                            t.el.classList.add('active');
                        }
                    }
                } else {
                    if (t.isActive) {
                        t.isActive = false;
                        t.el.classList.remove('active');
                    }
                }
            } else {
                if (t.isActive) {
                    t.isActive = false;
                    t.el.classList.remove('active');
                }
            }

            for (var ri = 0; ri < state.ripples.length; ri++) {
                var rip = state.ripples[ri];
                var rdx = cx - rip.x;
                var rdy = cy - rip.y;
                var rDist = Math.sqrt(rdx * rdx + rdy * rdy);
                var ringDist = Math.abs(rDist - rip.radius);

                if (ringDist < 50) {
                    var ringForce = (1 - ringDist / 50) * rip.strength;
                    t.elevVel += ringForce * 16 * dt;
                    t.scaleVel += ringForce * 0.04 * dt;
                    t.rotVelX += (Math.sin(rDist * 0.1) * ringForce * 0.02) * dt;
                    t.rotVelY += (Math.cos(rDist * 0.1) * ringForce * 0.02) * dt;
                    t.brightness = Math.min(1, t.brightness + ringForce * 0.35 * dt);
                    if (!t.isActive) {
                        t.isActive = true;
                        t.el.classList.add('active');
                    }
                }
            }

            // Spring home
            t.elevVel += (-t.elevation * strength * 4) * dt;
            t.elevVel *= Math.pow(damping, dt);
            t.elevation += t.elevVel * dt;
            t.elevation = Math.max(0, t.elevation);

            t.rotVelX += (-t.rotateX * 0.12) * dt;
            t.rotVelY += (-t.rotateY * 0.12) * dt;
            t.rotVelX *= Math.pow(0.86, dt);
            t.rotVelY *= Math.pow(0.86, dt);
            t.rotateX += t.rotVelX * dt;
            t.rotateY += t.rotVelY * dt;

            t.scaleVel += (1 - t.scale) * 0.1 * dt;
            t.scaleVel *= Math.pow(0.9, dt);
            t.scale += t.scaleVel * dt;

            t.brightness *= Math.pow(0.93, dt);

            totalEnergy += Math.abs(t.elevation) + Math.abs(t.rotateX) + Math.abs(t.rotateY);
        });

        state.energy = state.energy * 0.9 + (totalEnergy / state.cubes.length) * 0.1;
    }

    // === Apply Transforms ===
    function applyCubeTransforms() {
        state.cubes.forEach(function (t) {
            var elev = t.elevation;
            var rx = t.rotateX * (180 / Math.PI);
            var ry = t.rotateY * (180 / Math.PI);
            var s = Math.max(0.1, t.scale);

            var tz = elev * 1.2;

            t.el.style.transform =
                'translateZ(' + tz.toFixed(2) + 'px) ' +
                'rotateX(' + rx.toFixed(2) + 'deg) ' +
                'rotateY(' + ry.toFixed(2) + 'deg) ' +
                'scale(' + s.toFixed(4) + ')';

            var opacity = 0.7 + t.brightness * 0.3;
            t.el.style.opacity = opacity.toFixed(3);
        });
    }

    // === Trail Update ===
    function updateTrails(dt) {
        if (state.mouseInStage && state.mouse.x > -999) {
            var speed = Math.sqrt(state.mouse.vx * state.mouse.vx + state.mouse.vy * state.mouse.vy);
            if (speed > 1) {
                state.trails.push({
                    x: state.mouse.x + (Math.random() - 0.5) * 6,
                    y: state.mouse.y + (Math.random() - 0.5) * 6,
                    vx: 0,
                    vy: 0,
                    alpha: Math.min(0.5, speed * 0.03),
                    radius: 2 + Math.random() * 2,
                    life: 1
                });
            }
        }

        for (var i = state.trails.length - 1; i >= 0; i--) {
            var tr = state.trails[i];
            if (tr.vx || tr.vy) {
                tr.x += tr.vx * dt;
                tr.y += tr.vy * dt;
                tr.vx *= Math.pow(0.92, dt);
                tr.vy *= Math.pow(0.92, dt);
            }
            tr.alpha *= Math.pow(0.94, dt);
            tr.radius *= Math.pow(0.98, dt);

            if (tr.alpha < 0.01) {
                state.trails.splice(i, 1);
            }
        }

        if (state.trails.length > TRAIL_MAX) {
            state.trails.splice(0, state.trails.length - TRAIL_MAX);
        }
    }

    // === Draw Trails ===
    function drawTrails() {
        var pal = palettes[state.palette];
        var p1 = pal.particle;
        var p2 = pal.particle2;

        for (var i = 0; i < state.trails.length; i++) {
            var tr = state.trails[i];
            var useP2 = i % 3 === 0;
            var pc = useP2 ? p2 : p1;
            var r = Math.max(0.1, tr.radius * 3);

            var grad = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, r);
            grad.addColorStop(0, 'rgba(' + pc.r + ',' + pc.g + ',' + pc.b + ',' + tr.alpha.toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(' + pc.r + ',' + pc.g + ',' + pc.b + ',0)');

            ctx.beginPath();
            ctx.arc(tr.x, tr.y, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        if (state.mouseInStage && state.mouse.x > -999) {
            for (var ti = 0; ti < state.cubes.length; ti++) {
                var t = state.cubes[ti];
                if (!t.isActive) continue;

                var tcx = t.homeX;
                var tcy = t.homeY;
                var dx = state.mouse.x - tcx;
                var dy = state.mouse.y - tcy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < state.fieldRadius * 0.65 && dist > 0.1) {
                    var alpha = (1 - dist / (state.fieldRadius * 0.65)) * 0.06;
                    ctx.beginPath();
                    ctx.moveTo(state.mouse.x, state.mouse.y);
                    ctx.lineTo(tcx, tcy);
                    ctx.strokeStyle = 'rgba(' + p1.r + ',' + p1.g + ',' + p1.b + ',' + alpha.toFixed(3) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        for (var ri = 0; ri < state.ripples.length; ri++) {
            var rip = state.ripples[ri];
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, Math.max(0.1, rip.radius), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + p1.r + ',' + p1.g + ',' + p1.b + ',' + (rip.strength * 0.18).toFixed(3) + ')';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (rip.radius > 10) {
                ctx.beginPath();
                ctx.arc(rip.x, rip.y, Math.max(0.1, rip.radius - 8), 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + p2.r + ',' + p2.g + ',' + p2.b + ',' + (rip.strength * 0.1).toFixed(3) + ')';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    // === Utils ===
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
