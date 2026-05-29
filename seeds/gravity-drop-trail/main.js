(function () {
    'use strict';

    var canvas = document.getElementById('trail-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var stageArea = document.getElementById('stage-area');
    var attractorHandles = document.getElementById('attractor-handles');

    var ctrlGravity = document.getElementById('ctrl-gravity');
    var ctrlTrail = document.getElementById('ctrl-trail');
    var ctrlBounce = document.getElementById('ctrl-bounce');
    var valGravity = document.getElementById('val-gravity');
    var valTrail = document.getElementById('val-trail');
    var valBounce = document.getElementById('val-bounce');
    var btnClear = document.getElementById('btn-clear');
    var btnSpawn = document.getElementById('btn-spawn');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var modeBtns = document.querySelectorAll('.mode-btn');
    var statParticles = document.getElementById('stat-particles');
    var statFps = document.getElementById('stat-fps');

    var palettes = {
        cosmic: {
            trail: [
                { r: 139, g: 92, b: 246 },
                { r: 236, g: 72, b: 153 },
                { r: 249, g: 115, b: 22 }
            ],
            glow: 'rgba(139, 92, 246, 0.06)',
            attractor: '#8b5cf6',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540']
        },
        ocean: {
            trail: [
                { r: 14, g: 165, b: 233 },
                { r: 99, g: 102, b: 241 },
                { r: 139, g: 92, b: 246 }
            ],
            glow: 'rgba(14, 165, 233, 0.06)',
            attractor: '#0ea5e9',
            blobs: ['#061a2e', '#0d1847', '#0d1040', '#0a2530']
        },
        ember: {
            trail: [
                { r: 249, g: 115, b: 22 },
                { r: 239, g: 68, b: 68 },
                { r: 251, g: 191, b: 36 }
            ],
            glow: 'rgba(249, 115, 22, 0.06)',
            attractor: '#f97316',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008']
        },
        aurora: {
            trail: [
                { r: 0, g: 212, b: 255 },
                { r: 168, g: 85, b: 247 },
                { r: 0, g: 255, b: 136 }
            ],
            glow: 'rgba(0, 212, 255, 0.06)',
            attractor: '#00d4ff',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530']
        }
    };

    var state = {
        mouse: { x: -9999, y: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        gravity: 0.40,
        trailLen: 24,
        bounce: 0.60,
        mode: 'drop',
        palette: 'cosmic',
        particles: [],
        attractors: [],
        draggingAttractor: null,
        dragOffset: { x: 0, y: 0 },
        dpr: window.devicePixelRatio || 1,
        animId: null,
        lastTime: 0,
        frameCount: 0,
        fpsAccum: 0,
        fpsLast: 0,
        currentFps: 60,
        spawnTimer: 0,
        canvasW: 0,
        canvasH: 0
    };

    var MAX_PARTICLES = 600;
    var SPAWN_BATCH = 8;

    function init() {
        resizeCanvas();
        addDefaultAttractor();
        bindEvents();
        bindControls();
        spawnInitialParticles();
        state.lastTime = performance.now();
        state.fpsLast = state.lastTime;
        animate(state.lastTime);
    }

    function resizeCanvas() {
        var rect = stageArea.getBoundingClientRect();
        state.canvasW = rect.width;
        state.canvasH = rect.height;
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function addDefaultAttractor() {
        var cx = state.canvasW / 2;
        var cy = state.canvasH * 0.65;
        addAttractor(cx, cy);
    }

    function addAttractor(x, y) {
        var id = Date.now() + Math.random();
        var attractor = { id: id, x: x, y: y, mass: 1 };
        state.attractors.push(attractor);
        renderAttractorHandle(attractor);
        return attractor;
    }

    function removeAttractor(id) {
        state.attractors = state.attractors.filter(function (a) { return a.id !== id; });
        var handle = document.querySelector('[data-attractor-id="' + id + '"]');
        if (handle) handle.remove();
    }

    function renderAttractorHandle(attractor) {
        var el = document.createElement('div');
        el.className = 'attractor-handle';
        el.setAttribute('data-attractor-id', attractor.id);
        el.style.left = attractor.x + 'px';
        el.style.top = attractor.y + 'px';
        el.innerHTML =
            '<div class="attractor-handle-inner">' +
                '<span class="attractor-dot"></span>' +
            '</div>' +
            '<div class="ring"></div>' +
            '<div class="ring ring-2"></div>' +
            '<div class="attractor-delete">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</div>';

        el.addEventListener('mousedown', function (e) {
            if (e.target.closest('.attractor-delete')) {
                removeAttractor(attractor.id);
                e.stopPropagation();
                return;
            }
            e.stopPropagation();
            e.preventDefault();
            var rect = stageArea.getBoundingClientRect();
            state.draggingAttractor = attractor;
            state.dragOffset.x = e.clientX - rect.left - attractor.x;
            state.dragOffset.y = e.clientY - rect.top - attractor.y;
        });

        el.addEventListener('touchstart', function (e) {
            if (e.target.closest('.attractor-delete')) {
                removeAttractor(attractor.id);
                e.stopPropagation();
                return;
            }
            e.stopPropagation();
            e.preventDefault();
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            state.draggingAttractor = attractor;
            state.dragOffset.x = touch.clientX - rect.left - attractor.x;
            state.dragOffset.y = touch.clientY - rect.top - attractor.y;
        }, { passive: false });

        attractorHandles.appendChild(el);
    }

    function updateAttractorHandle(attractor) {
        var handle = document.querySelector('[data-attractor-id="' + attractor.id + '"]');
        if (handle) {
            handle.style.left = attractor.x + 'px';
            handle.style.top = attractor.y + 'px';
        }
    }

    function createParticle(x, y, vx, vy) {
        var pal = palettes[state.palette].trail;
        var colorIdx = Math.floor(Math.random() * pal.length);
        var c = pal[colorIdx];
        var size = 2 + Math.random() * 3;
        return {
            x: x,
            y: y,
            vx: vx || 0,
            vy: vy || 0,
            ax: 0,
            ay: 0,
            trail: [],
            life: 1,
            maxLife: 0.6 + Math.random() * 0.4,
            size: size,
            color: c,
            hueShift: Math.random() * 30 - 15
        };
    }

    function spawnInitialParticles() {
        for (var i = 0; i < 40; i++) {
            spawnParticle();
        }
    }

    function spawnParticle() {
        if (state.particles.length >= MAX_PARTICLES) return;

        var x, y, vx, vy;
        var w = state.canvasW;
        var h = state.canvasH;

        switch (state.mode) {
            case 'fountain':
                x = w / 2 + (Math.random() - 0.5) * 60;
                y = h * 0.85;
                vx = (Math.random() - 0.5) * 4;
                vy = -(4 + Math.random() * 6);
                break;
            case 'orbit':
                var cx = w / 2;
                var cy = h / 2;
                var angle = Math.random() * Math.PI * 2;
                var radius = 80 + Math.random() * 120;
                x = cx + Math.cos(angle) * radius;
                y = cy + Math.sin(angle) * radius;
                var speed = 2 + Math.random() * 2;
                vx = Math.cos(angle + Math.PI / 2) * speed;
                vy = Math.sin(angle + Math.PI / 2) * speed;
                break;
            case 'vortex':
                var va = Math.random() * Math.PI * 2;
                var vr = 30 + Math.random() * 80;
                x = w / 2 + Math.cos(va) * vr;
                y = h / 2 + Math.sin(va) * vr;
                var vs = 3 + Math.random() * 3;
                vx = Math.cos(va + Math.PI * 0.4) * vs;
                vy = Math.sin(va + Math.PI * 0.4) * vs;
                break;
            default:
                x = Math.random() * w;
                y = -10 - Math.random() * 40;
                vx = (Math.random() - 0.5) * 1.5;
                vy = 0.5 + Math.random() * 1;
                break;
        }

        state.particles.push(createParticle(x, y, vx, vy));
    }

    function spawnBurst(cx, cy, count) {
        for (var i = 0; i < count; i++) {
            if (state.particles.length >= MAX_PARTICLES) break;
            var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            var speed = 2 + Math.random() * 5;
            state.particles.push(createParticle(
                cx + (Math.random() - 0.5) * 10,
                cy + (Math.random() - 0.5) * 10,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            ));
        }
    }

    function updateParticle(p, dt) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > state.trailLen) {
            p.trail.shift();
        }

        p.ax = 0;
        p.ay = 0;

        p.ay += state.gravity * 9.8;

        for (var i = 0; i < state.attractors.length; i++) {
            var a = state.attractors[i];
            var dx = a.x - p.x;
            var dy = a.y - p.y;
            var distSq = dx * dx + dy * dy;
            var dist = Math.sqrt(Math.max(distSq, 100));
            var force = (a.mass * state.gravity * 200) / (dist * dist);
            force = Math.min(force, 8);
            p.ax += (dx / dist) * force;
            p.ay += (dy / dist) * force;
        }

        if (state.mode === 'vortex') {
            var vcx = state.canvasW / 2;
            var vcy = state.canvasH / 2;
            var vdx = vcx - p.x;
            var vdy = vcy - p.y;
            var vdist = Math.sqrt(vdx * vdx + vdy * vdy + 100);
            var vforce = state.gravity * 1.5;
            p.ax += (-vdy / vdist) * vforce;
            p.ay += (vdx / vdist) * vforce;
            p.ax += (vdx / vdist) * vforce * 0.3;
            p.ay += (vdy / vdist) * vforce * 0.3;
        }

        p.vx += p.ax * dt;
        p.vy += p.ay * dt;

        p.vx *= 0.997;
        p.vy *= 0.997;

        var maxSpeed = 25;
        var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > maxSpeed) {
            p.vx = (p.vx / spd) * maxSpeed;
            p.vy = (p.vy / spd) * maxSpeed;
        }

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        var w = state.canvasW;
        var h = state.canvasH;
        var margin = 80;

        if (p.x < -margin || p.x > w + margin || p.y > h + margin) {
            return false;
        }

        if (p.y > h - 2) {
            p.y = h - 2;
            p.vy = -Math.abs(p.vy) * state.bounce;
            p.vx *= 0.92;
            if (Math.abs(p.vy) < 0.3) return false;
        }

        if (p.x < 2) {
            p.x = 2;
            p.vx = Math.abs(p.vx) * state.bounce;
        }
        if (p.x > w - 2) {
            p.x = w - 2;
            p.vx = -Math.abs(p.vx) * state.bounce;
        }

        return true;
    }

    function drawParticles() {
        ctx.clearRect(0, 0, state.canvasW, state.canvasH);

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            drawTrail(p);
        }

        for (var j = 0; j < state.particles.length; j++) {
            var pt = state.particles[j];
            drawHead(pt);
        }

        drawAttractorFields();
    }

    function drawTrail(p) {
        var trail = p.trail;
        if (trail.length < 2) return;

        var c = p.color;
        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        var intensity = Math.min(speed / 10, 1);

        for (var i = 1; i < trail.length; i++) {
            var t = i / trail.length;
            var alpha = t * 0.7 * (0.3 + intensity * 0.7);
            var width = t * p.size * 1.5;

            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
            ctx.lineWidth = Math.max(width, 0.5);
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        if (trail.length > 4) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (var k = 1; k < trail.length; k++) {
                ctx.lineTo(trail[k].x, trail[k].y);
            }
            ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.06)';
            ctx.lineWidth = p.size * 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    }

    function drawHead(p) {
        var c = p.color;
        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        var glow = Math.min(speed / 6, 1);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.9)';
        ctx.fill();

        if (glow > 0.1) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (glow * 0.15) + ')';
            ctx.fill();
        }
    }

    function drawAttractorFields() {
        for (var i = 0; i < state.attractors.length; i++) {
            var a = state.attractors[i];
            var pal = palettes[state.palette];

            ctx.beginPath();
            ctx.arc(a.x, a.y, 40, 0, Math.PI * 2);
            var grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 40);
            grad.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
            grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(a.x, a.y, 80, 0, Math.PI * 2);
            var grad2 = ctx.createRadialGradient(a.x, a.y, 20, a.x, a.y, 80);
            grad2.addColorStop(0, 'rgba(139, 92, 246, 0)');
            grad2.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = grad2;
            ctx.fill();

            var time = performance.now() * 0.001;
            for (var r = 0; r < 3; r++) {
                var ringRadius = 20 + r * 20 + Math.sin(time * 1.5 + r) * 5;
                ctx.beginPath();
                ctx.arc(a.x, a.y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(139, 92, 246,' + (0.06 - r * 0.015) + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    function animate(timestamp) {
        var dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
        state.lastTime = timestamp;

        state.frameCount++;
        state.fpsAccum += dt;
        if (state.fpsAccum >= 0.5) {
            state.currentFps = Math.round(state.frameCount / state.fpsAccum);
            state.frameCount = 0;
            state.fpsAccum = 0;
            statFps.textContent = state.currentFps;
        }

        state.spawnTimer += dt;
        var spawnInterval = state.mode === 'fountain' ? 0.03 : state.mode === 'orbit' ? 0.05 : 0.06;
        while (state.spawnTimer >= spawnInterval) {
            state.spawnTimer -= spawnInterval;
            spawnParticle();
        }

        state.particles = state.particles.filter(function (p) {
            return updateParticle(p, dt);
        });

        statParticles.textContent = state.particles.length;

        drawParticles();

        state.animId = requestAnimationFrame(animate);
    }

    function applyPalette(name) {
        state.palette = name;
        var pal = palettes[name];

        document.documentElement.style.setProperty('--color-accent', pal.attractor);
        cursorGlow.style.background = 'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 70%)';

        var root = document.documentElement;
        root.style.setProperty('--color-blob-1', pal.blobs[0]);
        root.style.setProperty('--color-blob-2', pal.blobs[1]);
        root.style.setProperty('--color-blob-3', pal.blobs[2]);
        root.style.setProperty('--color-blob-4', pal.blobs[3]);

        state.particles.forEach(function (p) {
            var colors = pal.trail;
            var c = colors[Math.floor(Math.random() * colors.length)];
            p.color = c;
        });
    }

    function bindEvents() {
        window.addEventListener('resize', function () {
            resizeCanvas();
        });

        document.addEventListener('mousemove', function (e) {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            if (state.draggingAttractor) {
                var rect = stageArea.getBoundingClientRect();
                state.draggingAttractor.x = e.clientX - rect.left - state.dragOffset.x;
                state.draggingAttractor.y = e.clientY - rect.top - state.dragOffset.y;
                updateAttractorHandle(state.draggingAttractor);
            }

            var stageRect = stageArea.getBoundingClientRect();
            state.mouseInStage = (
                e.clientX >= stageRect.left && e.clientX <= stageRect.right &&
                e.clientY >= stageRect.top && e.clientY <= stageRect.bottom
            );
            state.mouse.x = e.clientX - stageRect.left;
            state.mouse.y = e.clientY - stageRect.top;
        });

        document.addEventListener('mouseup', function () {
            state.draggingAttractor = null;
        });

        stageArea.addEventListener('click', function (e) {
            if (state.draggingAttractor) return;
            if (e.target.closest('.attractor-handle')) return;

            var rect = stageArea.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            addAttractor(x, y);
            spawnBurst(x, y, 15);

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        stageArea.addEventListener('touchstart', function (e) {
            if (e.target.closest('.attractor-handle')) return;

            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            var x = touch.clientX - rect.left;
            var y = touch.clientY - rect.top;

            addAttractor(x, y);
            spawnBurst(x, y, 12);

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: true });

        stageArea.addEventListener('mousemove', function () {
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });
    }

    function bindControls() {
        ctrlGravity.addEventListener('input', function () {
            state.gravity = parseInt(ctrlGravity.value, 10) / 100;
            valGravity.textContent = state.gravity.toFixed(2);
        });

        ctrlTrail.addEventListener('input', function () {
            state.trailLen = parseInt(ctrlTrail.value, 10);
            valTrail.textContent = state.trailLen;
        });

        ctrlBounce.addEventListener('input', function () {
            state.bounce = parseInt(ctrlBounce.value, 10) / 100;
            valBounce.textContent = state.bounce.toFixed(2);
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                applyPalette(btn.dataset.palette);
            });
        });

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
            });
        });

        btnClear.addEventListener('click', function () {
            state.particles = [];
            state.attractors = [];
            attractorHandles.innerHTML = '';
        });

        btnSpawn.addEventListener('click', function () {
            var cx = state.canvasW / 2;
            var cy = state.canvasH / 2;
            spawnBurst(cx, cy, SPAWN_BATCH * 3);
        });

        btnFullscreen.addEventListener('click', function () {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen().catch(function () {});
            }
        });
    }

    init();
})();
