(function () {
    'use strict';

    var bgCanvas = document.getElementById('curtain-canvas');
    var bgCtx = bgCanvas.getContext('2d');
    var clothCanvas = document.getElementById('cloth-canvas');
    var clothCtx = clothCanvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var curtainStage = document.getElementById('curtain-stage');
    var curtainOverlay = document.getElementById('curtain-overlay');
    var transitionFlash = document.getElementById('transition-flash');
    var fpsCounter = document.getElementById('fps-counter');
    var particleCountEl = document.getElementById('particle-count');
    var modeIndicator = document.getElementById('mode-indicator');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var btnReset = document.getElementById('btn-reset');
    var themeToggle = document.getElementById('theme-toggle');
    var modeToggle = document.getElementById('mode-toggle');

    var paramStiffness = document.getElementById('param-stiffness');
    var paramDamping = document.getElementById('param-damping');
    var paramForce = document.getElementById('param-force');
    var valStiffness = document.getElementById('val-stiffness');
    var valDamping = document.getElementById('val-damping');
    var valForce = document.getElementById('val-force');

    var COLS = 50;
    var ROWS = 35;

    var state = {
        mouse: { x: -9999, y: -9999, stageX: -9999, stageY: -9999 },
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        palette: 'deep-ocean',
        mode: 'push',
        stiffness: 5,
        damping: 0.98,
        mouseForce: 30,
        dpr: window.devicePixelRatio || 1,
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        stageWidth: 0,
        stageHeight: 0,
        particles: [],
        points: [],
        constraints: [],
        overlayHidden: false,
        interactionCount: 0
    };

    var palettes = {
        'deep-ocean': {
            particles: [
                { r: 99, g: 102, b: 241 },
                { r: 139, g: 92, b: 246 },
                { r: 79, g: 70, b: 229 }
            ],
            glow: 'rgba(99, 102, 241, 0.06)',
            flash: 'rgba(99, 102, 241, 0.12)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540'],
            accent: '#6366f1',
            cloth: [
                { r: 30, g: 25, b: 80 },
                { r: 45, g: 35, b: 110 },
                { r: 60, g: 50, b: 140 }
            ],
            clothHighlight: { r: 99, g: 102, b: 241 }
        },
        'aurora': {
            particles: [
                { r: 0, g: 212, b: 255 },
                { r: 168, g: 85, b: 247 },
                { r: 0, g: 255, b: 136 }
            ],
            glow: 'rgba(0, 212, 255, 0.06)',
            flash: 'rgba(0, 212, 255, 0.12)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530'],
            accent: '#06b6d4',
            cloth: [
                { r: 10, g: 50, b: 60 },
                { r: 15, g: 70, b: 80 },
                { r: 20, g: 90, b: 100 }
            ],
            clothHighlight: { r: 0, g: 212, b: 255 }
        },
        'ember': {
            particles: [
                { r: 249, g: 115, b: 22 },
                { r: 239, g: 68, b: 68 },
                { r: 251, g: 191, b: 36 }
            ],
            glow: 'rgba(249, 115, 22, 0.06)',
            flash: 'rgba(249, 115, 22, 0.12)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            accent: '#f97316',
            cloth: [
                { r: 70, g: 25, b: 10 },
                { r: 100, g: 35, b: 12 },
                { r: 130, g: 45, b: 15 }
            ],
            clothHighlight: { r: 249, g: 115, b: 22 }
        },
        'void': {
            particles: [
                { r: 165, g: 180, b: 252 },
                { r: 196, g: 181, b: 253 },
                { r: 232, g: 121, b: 249 }
            ],
            glow: 'rgba(165, 180, 252, 0.06)',
            flash: 'rgba(165, 180, 252, 0.12)',
            blobs: ['#0d1530', '#101a3a', '#1a1030', '#0d1830'],
            accent: '#a5b4fc',
            cloth: [
                { r: 20, g: 22, b: 50 },
                { r: 30, g: 32, b: 70 },
                { r: 40, g: 42, b: 90 }
            ],
            clothHighlight: { r: 165, g: 180, b: 252 }
        }
    };

    var modeNames = {
        'push': '推开',
        'split': '裂开',
        'dissolve': '溶解'
    };

    var BG_PARTICLE_COUNT = 80;

    function init() {
        resizeCanvases();
        initBgParticles();
        initCloth();
        initSceneParticles();
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        state.fpsTime = state.lastTime;
        animate(state.lastTime);
    }

    function resizeCanvases() {
        bgCanvas.width = window.innerWidth * state.dpr;
        bgCanvas.height = window.innerHeight * state.dpr;
        bgCanvas.style.width = window.innerWidth + 'px';
        bgCanvas.style.height = window.innerHeight + 'px';
        bgCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        var rect = curtainStage.getBoundingClientRect();
        state.stageWidth = rect.width;
        state.stageHeight = rect.height;

        clothCanvas.width = rect.width * state.dpr;
        clothCanvas.height = rect.height * state.dpr;
        clothCanvas.style.width = rect.width + 'px';
        clothCanvas.style.height = rect.height + 'px';
        clothCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function initBgParticles() {
        state.particles = [];
        for (var i = 0; i < BG_PARTICLE_COUNT; i++) {
            state.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                radius: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.35 + 0.1,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.2 + 0.06,
                colorIndex: Math.floor(Math.random() * 3),
                trail: []
            });
        }
    }

    function initCloth() {
        state.points = [];
        state.constraints = [];

        var spacingX = state.stageWidth / (COLS - 1);
        var spacingY = state.stageHeight / (ROWS - 1);

        for (var row = 0; row < ROWS; row++) {
            for (var col = 0; col < COLS; col++) {
                var x = col * spacingX;
                var y = row * spacingY;
                var pinned = false;

                if (state.mode === 'push') {
                    pinned = row === 0;
                } else if (state.mode === 'split') {
                    pinned = row === 0 && (col < COLS * 0.15 || col > COLS * 0.85);
                } else if (state.mode === 'dissolve') {
                    pinned = row === 0;
                }

                state.points.push({
                    x: x,
                    y: y,
                    oldX: x,
                    oldY: y,
                    pinned: pinned,
                    origX: x,
                    origY: y,
                    col: col,
                    row: row,
                    dissolved: false,
                    dissolveTimer: 0,
                    dissolveAlpha: 1
                });
            }
        }

        for (var row = 0; row < ROWS; row++) {
            for (var col = 0; col < COLS; col++) {
                var idx = row * COLS + col;
                if (col < COLS - 1) {
                    state.constraints.push({
                        p1: idx,
                        p2: idx + 1,
                        restLength: spacingX,
                        type: 'h'
                    });
                }
                if (row < ROWS - 1) {
                    state.constraints.push({
                        p1: idx,
                        p2: idx + COLS,
                        restLength: spacingY,
                        type: 'v'
                    });
                }
            }
        }

        particleCountEl.textContent = state.points.length + ' 点';
    }

    function initSceneParticles() {
        var container = document.getElementById('scene-particles');
        container.innerHTML = '';
        for (var i = 0; i < 20; i++) {
            var p = document.createElement('div');
            p.className = 'scene-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = (Math.random() * 8) + 's';
            p.style.animationDuration = (6 + Math.random() * 6) + 's';
            var pal = palettes[state.palette];
            var c = pal.particles[Math.floor(Math.random() * pal.particles.length)];
            p.style.background = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ', 0.6)';
            container.appendChild(p);
        }
    }

    function updateCloth(dt) {
        var gravity = 0.4;
        var damping = state.damping;
        var stiffness = state.stiffness;
        var constraintIterations = Math.round(stiffness * 2);

        for (var i = 0; i < state.points.length; i++) {
            var p = state.points[i];
            if (p.pinned || p.dissolved) continue;

            var vx = (p.x - p.oldX) * damping;
            var vy = (p.y - p.oldY) * damping;

            p.oldX = p.x;
            p.oldY = p.y;

            p.x += vx;
            p.y += vy + gravity * dt * 0.1;

            if (state.mouse.stageX > -999 && !state.isDragging) {
                var dx = state.mouse.stageX - p.x;
                var dy = state.mouse.stageY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = state.mouseForce * 2.5;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * state.mouseForce * 0.02;

                    if (state.mode === 'push') {
                        p.x -= dx / dist * force * dt;
                        p.y -= dy / dist * force * dt;
                    } else if (state.mode === 'split') {
                        var pushDir = dx > 0 ? 1 : -1;
                        p.x += pushDir * force * dt * 1.5;
                        p.y -= force * dt * 0.3;
                    } else if (state.mode === 'dissolve') {
                        p.x += (Math.random() - 0.5) * force * dt * 3;
                        p.y += (Math.random() - 0.5) * force * dt * 3;
                    }
                }
            }

            if (state.isDragging) {
                var dx2 = state.mouse.stageX - p.x;
                var dy2 = state.mouse.stageY - p.y;
                var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                var maxDist2 = state.mouseForce * 3;

                if (dist2 < maxDist2 && dist2 > 1) {
                    var force2 = (1 - dist2 / maxDist2);
                    force2 = force2 * force2 * state.mouseForce * 0.06;
                    p.x += dx2 / dist2 * force2 * dt;
                    p.y += dy2 / dist2 * force2 * dt;
                }
            }

            var returnForce = 0.002 * stiffness * 0.1;
            p.x += (p.origX - p.x) * returnForce * dt;
            p.y += (p.origY - p.y) * returnForce * dt;

            if (state.mode === 'dissolve') {
                var cx = state.stageWidth / 2;
                var cy = state.stageHeight / 2;
                var distFromCenter = Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
                var maxCenterDist = Math.max(state.stageWidth, state.stageHeight) * 0.6;

                if (distFromCenter < maxCenterDist && state.interactionCount > 30) {
                    var dissolveChance = (1 - distFromCenter / maxCenterDist) * 0.001 * state.interactionCount * 0.01;
                    if (Math.random() < dissolveChance) {
                        p.dissolved = true;
                        p.dissolveTimer = 1;
                    }
                }
            }

            if (p.x < 0) p.x = 0;
            if (p.x > state.stageWidth) p.x = state.stageWidth;
            if (p.y < 0) p.y = 0;
            if (p.y > state.stageHeight) p.y = state.stageHeight;
        }

        for (var iter = 0; iter < constraintIterations; iter++) {
            for (var c = 0; c < state.constraints.length; c++) {
                var con = state.constraints[c];
                var p1 = state.points[con.p1];
                var p2 = state.points[con.p2];

                if (p1.dissolved || p2.dissolved) continue;

                var ddx = p2.x - p1.x;
                var ddy = p2.y - p1.y;
                var dist3 = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dist3 < 0.001) dist3 = 0.001;

                var diff = (con.restLength - dist3) / dist3 * 0.5;
                var offsetX = ddx * diff;
                var offsetY = ddy * diff;

                if (!p1.pinned) {
                    p1.x -= offsetX;
                    p1.y -= offsetY;
                }
                if (!p2.pinned) {
                    p2.x += offsetX;
                    p2.y += offsetY;
                }
            }
        }
    }

    function drawCloth() {
        clothCtx.clearRect(0, 0, state.stageWidth, state.stageHeight);
        var pal = palettes[state.palette];

        for (var row = 0; row < ROWS - 1; row++) {
            for (var col = 0; col < COLS - 1; col++) {
                var i0 = row * COLS + col;
                var i1 = row * COLS + col + 1;
                var i2 = (row + 1) * COLS + col;
                var i3 = (row + 1) * COLS + col + 1;

                var p0 = state.points[i0];
                var p1 = state.points[i1];
                var p2 = state.points[i2];
                var p3 = state.points[i3];

                if (p0.dissolved && p1.dissolved && p2.dissolved && p3.dissolved) continue;

                var rowRatio = row / (ROWS - 1);
                var colRatio = col / (COLS - 1);
                var colorIdx = Math.floor(rowRatio * (pal.cloth.length - 1));
                var nextIdx = Math.min(colorIdx + 1, pal.cloth.length - 1);
                var t = rowRatio * (pal.cloth.length - 1) - colorIdx;
                var c0 = pal.cloth[colorIdx];
                var c1 = pal.cloth[nextIdx];
                var cr = Math.round(c0.r + (c1.r - c0.r) * t);
                var cg = Math.round(c0.g + (c1.g - c0.g) * t);
                var cb = Math.round(c0.b + (c1.b - c0.b) * t);

                var avgDissolve = (p0.dissolveAlpha + p1.dissolveAlpha + p2.dissolveAlpha + p3.dissolveAlpha) / 4;
                var alpha = (0.7 + colRatio * 0.3) * avgDissolve;

                var displaceX = p0.x - p0.origX;
                var displaceY = p0.y - p0.origY;
                var displaceMag = Math.sqrt(displaceX * displaceX + displaceY * displaceY);
                var stress = Math.min(displaceMag / 40, 1);

                var hl = pal.clothHighlight;
                var fr = Math.round(cr + (hl.r - cr) * stress * 0.5);
                var fg = Math.round(cg + (hl.g - cg) * stress * 0.5);
                var fb = Math.round(cb + (hl.b - cb) * stress * 0.5);

                clothCtx.beginPath();
                clothCtx.moveTo(p0.x, p0.y);
                clothCtx.lineTo(p1.x, p1.y);
                clothCtx.lineTo(p3.x, p3.y);
                clothCtx.lineTo(p2.x, p2.y);
                clothCtx.closePath();
                clothCtx.fillStyle = 'rgba(' + fr + ',' + fg + ',' + fb + ',' + alpha.toFixed(3) + ')';
                clothCtx.fill();
            }
        }

        clothCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        clothCtx.lineWidth = 0.5;
        for (var c = 0; c < state.constraints.length; c++) {
            var con = state.constraints[c];
            var pa = state.points[con.p1];
            var pb = state.points[con.p2];
            if (pa.dissolved || pb.dissolved) continue;
            if (con.type === 'h' && pa.row % 4 === 0) {
                clothCtx.beginPath();
                clothCtx.moveTo(pa.x, pa.y);
                clothCtx.lineTo(pb.x, pb.y);
                clothCtx.stroke();
            }
        }

        for (var pi = 0; pi < state.points.length; pi++) {
            var pt = state.points[pi];
            if (pt.dissolved) continue;
            if (pt.pinned) {
                clothCtx.beginPath();
                clothCtx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
                clothCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                clothCtx.fill();
            }
        }
    }

    function updateBgParticles(dt) {
        var w = window.innerWidth;
        var h = window.innerHeight;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.vy += Math.sin(p.phase) * 0.008 * dt;

            if (state.mouse.x > -999) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = 200;
                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.12;
                    p.vx += Math.cos(Math.atan2(dy, dx)) * force * dt;
                    p.vy += Math.sin(Math.atan2(dy, dx)) * force * dt;
                }
            }

            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 4) p.trail.pop();
        });
    }

    function drawBgParticles() {
        var pal = palettes[state.palette];

        state.particles.forEach(function (p) {
            var color = pal.particles[p.colorIndex];

            for (var ti = p.trail.length - 1; ti >= 0; ti--) {
                var trailAlpha = p.alpha * (1 - ti / 4) * 0.3;
                var trailRadius = p.radius * (1 - ti / 4 * 0.5);
                bgCtx.beginPath();
                bgCtx.arc(p.trail[ti].x, p.trail[ti].y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                bgCtx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + trailAlpha.toFixed(3) + ')';
                bgCtx.fill();
            }

            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            bgCtx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + p.alpha.toFixed(3) + ')';
            bgCtx.fill();

            if (p.radius > 1.2) {
                bgCtx.beginPath();
                bgCtx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                var grad = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (p.alpha * 0.12).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0)');
                bgCtx.fillStyle = grad;
                bgCtx.fill();
            }
        });
    }

    function drawFlowLines() {
        if (state.mouse.x < -999) return;
        var pal = palettes[state.palette];
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var maxDist = 150;
        var lineCount = 0;

        state.particles.forEach(function (p) {
            if (lineCount > 10) return;
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
                lineCount++;
                var alpha = (1 - dist / maxDist) * 0.06;
                var color = pal.particles[p.colorIndex];
                bgCtx.beginPath();
                bgCtx.moveTo(p.x, p.y);
                var cp1x = p.x + (mx - p.x) * 0.3 + Math.sin(p.phase) * 15;
                var cp1y = p.y + (my - p.y) * 0.3 + Math.cos(p.phase) * 15;
                bgCtx.quadraticCurveTo(cp1x, cp1y, mx, my);
                bgCtx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha.toFixed(3) + ')';
                bgCtx.lineWidth = 0.5;
                bgCtx.stroke();
            }
        });
    }

    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;

        state.frameCount++;
        if (time - state.fpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.fpsTime = time;
            fpsCounter.textContent = state.fps + ' FPS';
        }

        bgCtx.clearRect(0, 0, bgCanvas.width / state.dpr, bgCanvas.height / state.dpr);
        updateBgParticles(dt);
        drawBgParticles();
        drawFlowLines();

        updateCloth(dt);
        drawCloth();

        requestAnimationFrame(animate);
    }

    function triggerFlash() {
        var pal = palettes[state.palette];
        transitionFlash.style.background = 'radial-gradient(circle at 50% 50%, ' + pal.flash + ' 0%, transparent 70%)';
        transitionFlash.classList.remove('active');
        void transitionFlash.offsetWidth;
        transitionFlash.classList.add('active');
        setTimeout(function () {
            transitionFlash.classList.remove('active');
        }, 600);
    }

    function applyPalette() {
        var pal = palettes[state.palette];
        cursorGlow.style.background = 'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 70%)';
        document.documentElement.style.setProperty('--color-accent', pal.accent);

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + pal.blobs[i % pal.blobs.length] + ' 0%, transparent 70%)';
        });

        initSceneParticles();
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

    function bindEvents() {
        document.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            var rect = curtainStage.getBoundingClientRect();
            state.mouse.stageX = e.clientX - rect.left;
            state.mouse.stageY = e.clientY - rect.top;

            if (state.mouse.stageX >= 0 && state.mouse.stageX <= rect.width &&
                state.mouse.stageY >= 0 && state.mouse.stageY <= rect.height) {
                state.interactionCount++;
                if (!state.overlayHidden && state.interactionCount > 10) {
                    curtainOverlay.classList.add('hidden');
                    state.overlayHidden = true;
                }
            }
        });

        clothCanvas.addEventListener('mousedown', function (e) {
            state.isDragging = true;
            var rect = curtainStage.getBoundingClientRect();
            state.dragStart.x = e.clientX - rect.left;
            state.dragStart.y = e.clientY - rect.top;
        });

        document.addEventListener('mouseup', function () {
            state.isDragging = false;
        });

        clothCanvas.addEventListener('mouseleave', function () {
            state.mouse.stageX = -9999;
            state.mouse.stageY = -9999;
        });

        curtainStage.addEventListener('touchstart', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = curtainStage.getBoundingClientRect();
            state.mouse.stageX = touch.clientX - rect.left;
            state.mouse.stageY = touch.clientY - rect.top;
            state.mouse.x = touch.clientX;
            state.mouse.y = touch.clientY;
            state.isDragging = true;
            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';
            state.interactionCount++;
        }, { passive: false });

        curtainStage.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = curtainStage.getBoundingClientRect();
            state.mouse.stageX = touch.clientX - rect.left;
            state.mouse.stageY = touch.clientY - rect.top;
            state.mouse.x = touch.clientX;
            state.mouse.y = touch.clientY;
            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';
            state.interactionCount++;
            if (!state.overlayHidden && state.interactionCount > 5) {
                curtainOverlay.classList.add('hidden');
                state.overlayHidden = true;
            }
        }, { passive: false });

        curtainStage.addEventListener('touchend', function () {
            state.isDragging = false;
            state.mouse.stageX = -9999;
            state.mouse.stageY = -9999;
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvases();
            initCloth();
        }, 200));
    }

    function bindControls() {
        var themeBtns = themeToggle.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                themeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.theme;
                applyPalette();
                triggerFlash();
            });
        });

        var modeBtns = modeToggle.querySelectorAll('.mode-btn');
        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
                modeIndicator.textContent = modeNames[state.mode];
                initCloth();
                triggerFlash();
                state.interactionCount = 0;
                curtainOverlay.classList.remove('hidden');
                state.overlayHidden = false;
            });
        });

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        btnReset.addEventListener('click', function () {
            state.interactionCount = 0;
            initCloth();
            triggerFlash();
            curtainOverlay.classList.remove('hidden');
            state.overlayHidden = false;
        });

        paramStiffness.addEventListener('input', function () {
            state.stiffness = parseFloat(this.value);
            valStiffness.textContent = state.stiffness.toFixed(1);
        });

        paramDamping.addEventListener('input', function () {
            state.damping = parseFloat(this.value);
            valDamping.textContent = state.damping.toFixed(3);
        });

        paramForce.addEventListener('input', function () {
            state.mouseForce = parseFloat(this.value);
            valForce.textContent = state.mouseForce.toFixed(0);
        });
    }

    init();
})();
