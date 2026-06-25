(function () {
    'use strict';

    /* === DOM Elements === */
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var stageArea = document.getElementById('stage-area');
    var cardsGrid = document.getElementById('cards-grid');

    var ctrlStiffness = document.getElementById('ctrl-stiffness');
    var ctrlDamping = document.getElementById('ctrl-damping');
    var valStiffness = document.getElementById('val-stiffness');
    var valDamping = document.getElementById('val-damping');
    var btnFlipAll = document.getElementById('btn-flip-all');
    var btnReset = document.getElementById('btn-reset');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var axisBtns = document.querySelectorAll('.axis-btn');

    /* === State === */
    var state = {
        mouse: { x: -9999, y: -9999, stageX: -9999, stageY: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        stiffness: 0.12,
        damping: 0.78,
        axis: 'y',
        particles: [],
        bursts: [],
        cardStates: [],
        palette: 'obsidian',
        dpr: window.devicePixelRatio || 1,
        animId: null,
        lastTime: 0
    };

    /* === Palettes === */
    var palettes = {
        obsidian: {
            particle: { r: 139, g: 92, b: 246 },
            glow: 'rgba(139, 92, 246, 0.10)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540'],
            accent: '#8b5cf6',
            accentSec: '#6366f1'
        },
        aurora: {
            particle: { r: 0, g: 212, b: 255 },
            glow: 'rgba(0, 212, 255, 0.10)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530'],
            accent: '#00d4ff',
            accentSec: '#a855f7'
        },
        ember: {
            particle: { r: 249, g: 115, b: 22 },
            glow: 'rgba(249, 115, 22, 0.10)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            accent: '#f97316',
            accentSec: '#ef4444'
        },
        frost: {
            particle: { r: 165, g: 180, b: 252 },
            glow: 'rgba(165, 180, 252, 0.10)',
            blobs: ['#0d1530', '#101a3a', '#151a40', '#0d1830'],
            accent: '#a5b4fc',
            accentSec: '#67e8f9'
        }
    };

    var PARTICLE_COUNT = 70;
    var BURST_LIFESPAN = 60;
    var PARTICLE_TRAIL = 5;

    /* === Init === */
    function init() {
        resizeCanvas();
        initCardStates();
        initParticles();
        bindEvents();
        bindControls();
        applyPalette(state.palette);
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    /* === Canvas Resize === */
    function resizeCanvas() {
        var rect = stageArea.getBoundingClientRect();
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    /* === Card States ===
     * Each card runs an independent spring-damper integrator that drives
     * its flip angle toward a target (0 or 180 degrees). The angle is
     * pushed to CSS via custom properties so the GPU handles the transform.
     */
    function initCardStates() {
        var cards = cardsGrid.querySelectorAll('.flip-card');
        state.cardStates = [];
        cards.forEach(function (card) {
            var inner = card.querySelector('.flip-inner');
            state.cardStates.push({
                el: card,
                inner: inner,
                angle: 0,
                angleVel: 0,
                target: 0,
                spring: parseFloat(card.dataset.spring) || state.stiffness,
                damp: parseFloat(card.dataset.damping) || state.damping,
                flipped: false,
                tiltX: 0,
                tiltY: 0,
                tiltXVel: 0,
                tiltYVel: 0
            });
        });
    }

    /* === Particles (ambient flow field) === */
    function initParticles() {
        var rect = stageArea.getBoundingClientRect();
        state.particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(createParticle(
                Math.random() * rect.width,
                Math.random() * rect.height
            ));
        }
    }

    function createParticle(x, y) {
        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 1.6 + 0.4,
            life: Math.random() * 100,
            trail: []
        };
    }

    function createBurst(x, y, color) {
        var count = 18;
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            var speed = Math.random() * 3.5 + 1.5;
            state.bursts.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: BURST_LIFESPAN,
                maxLife: BURST_LIFESPAN,
                size: Math.random() * 2.5 + 1,
                color: color
            });
        }
    }

    /* === Event Binding === */
    function bindEvents() {
        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
        });

        document.addEventListener('mousemove', function (e) {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            var rect = stageArea.getBoundingClientRect();
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            state.mouse.stageX = e.clientX - rect.left;
            state.mouse.stageY = e.clientY - rect.top;
            state.mouseInStage = (
                e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom
            );
        });

        document.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
        });

        /* Flip on click */
        state.cardStates.forEach(function (cs) {
            cs.el.addEventListener('click', function () {
                flipCard(cs);
            });

            /* 3D tilt toward cursor on hover */
            cs.el.addEventListener('mousemove', function (e) {
                var rect = cs.el.getBoundingClientRect();
                var nx = (e.clientX - rect.left) / rect.width - 0.5;
                var ny = (e.clientY - rect.top) / rect.height - 0.5;
                cs.tiltTargetX = -ny * 10;
                cs.tiltTargetY = nx * 10;
            });

            cs.el.addEventListener('mouseleave', function () {
                cs.tiltTargetX = 0;
                cs.tiltTargetY = 0;
            });
        });
    }

    /* === Flip Logic === */
    function flipCard(cs) {
        cs.flipped = !cs.flipped;
        cs.target = cs.flipped ? 180 : 0;

        if (!state.hasInteracted) {
            state.hasInteracted = true;
            stageHint.classList.add('hidden');
        }

        /* Particle burst at card center */
        var rect = cs.el.getBoundingClientRect();
        var stageRect = stageArea.getBoundingClientRect();
        var cx = rect.left + rect.width / 2 - stageRect.left;
        var cy = rect.top + rect.height / 2 - stageRect.top;
        var pal = palettes[state.palette];
        var colorStr = pal.particle.r + ',' + pal.particle.g + ',' + pal.particle.b;
        createBurst(cx, cy, colorStr);
    }

    function flipAll() {
        state.cardStates.forEach(function (cs, i) {
            setTimeout(function () {
                flipCard(cs);
            }, i * 90);
        });
    }

    function resetAll() {
        state.cardStates.forEach(function (cs, i) {
            setTimeout(function () {
                if (cs.flipped) {
                    flipCard(cs);
                }
            }, i * 70);
        });
    }

    /* === Controls === */
    function bindControls() {
        ctrlStiffness.addEventListener('input', function () {
            state.stiffness = parseInt(ctrlStiffness.value, 10) / 100;
            valStiffness.textContent = state.stiffness.toFixed(2);
            propagateSpring();
        });

        ctrlDamping.addEventListener('input', function () {
            state.damping = parseInt(ctrlDamping.value, 10) / 100;
            valDamping.textContent = state.damping.toFixed(2);
            propagateSpring();
        });

        btnFlipAll.addEventListener('click', flipAll);
        btnReset.addEventListener('click', resetAll);

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette(state.palette);
            });
        });

        axisBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                axisBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.axis = btn.dataset.axis;
                applyAxis(state.axis);
            });
        });
    }

    function propagateSpring() {
        state.cardStates.forEach(function (cs) {
            cs.spring = state.stiffness;
            cs.damp = state.damping;
        });
    }

    function applyPalette(name) {
        var pal = palettes[name];
        document.body.className = '';
        document.body.classList.add('palette-' + name);

        var root = document.documentElement.style;
        root.setProperty('--color-accent', pal.accent);
        root.setProperty('--color-accent-secondary', pal.accentSec);
        root.setProperty('--color-blob-1', pal.blobs[0]);
        root.setProperty('--color-blob-2', pal.blobs[1]);
        root.setProperty('--color-blob-3', pal.blobs[2]);
        root.setProperty('--color-blob-4', pal.blobs[3]);

        var blobEls = document.querySelectorAll('.blob');
        blobEls.forEach(function (el, i) {
            el.style.background =
                'radial-gradient(ellipse at center, ' + pal.blobs[i % 4] + ' 0%, transparent 70%)';
        });

        cursorGlow.style.background =
            'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 70%)';
    }

    function applyAxis(axis) {
        document.body.classList.remove('axis-x', 'axis-d');
        if (axis === 'x') document.body.classList.add('axis-x');
        if (axis === 'd') document.body.classList.add('axis-d');
    }

    /* === Animation Loop ===
     * Spring-damper integration per card:
     *   F = -k * (angle - target) - c * angleVel
     *   angleVel += F
     *   angle   += angleVel
     * Drives rotateX/rotateY depending on chosen axis.
     */
    function animate(now) {
        var dt = Math.min((now - state.lastTime) / 16.667, 2);
        state.lastTime = now;

        updateCards(dt);
        updateParticles(dt);
        updateBursts(dt);
        render();

        state.animId = requestAnimationFrame(animate);
    }

    function updateCards(dt) {
        state.cardStates.forEach(function (cs) {
            /* Flip angle spring */
            var force = -cs.spring * (cs.angle - cs.target);
            cs.angleVel = (cs.angleVel + force) * Math.pow(cs.damp, dt);
            cs.angle += cs.angleVel * dt;

            /* Tilt spring (mouse parallax) */
            var tx = cs.tiltTargetX || 0;
            var ty = cs.tiltTargetY || 0;
            cs.tiltXVel = (cs.tiltXVel + (-0.12 * (cs.tiltX - tx))) * Math.pow(0.82, dt);
            cs.tiltYVel = (cs.tiltYVel + (-0.12 * (cs.tiltY - ty))) * Math.pow(0.82, dt);
            cs.tiltX += cs.tiltXVel * dt;
            cs.tiltY += cs.tiltYVel * dt;

            /* Compose transform based on axis */
            var transform;
            if (state.axis === 'x') {
                transform =
                    'rotateX(' + (cs.angle + cs.tiltX) + 'deg) ' +
                    'rotateY(' + (-cs.tiltY) + 'deg)';
            } else if (state.axis === 'd') {
                transform =
                    'rotateZ(' + (cs.tiltY * 0.5) + 'deg) ' +
                    'rotateY(' + (cs.angle * 0.7 + cs.tiltY) + 'deg) ' +
                    'rotateX(' + (cs.angle * 0.7 + cs.tiltX) + 'deg)';
            } else {
                /* default Y axis */
                transform =
                    'rotateY(' + (cs.angle + cs.tiltY) + 'deg) ' +
                    'rotateX(' + (-cs.tiltX) + 'deg)';
            }
            cs.inner.style.transform = transform;
        });
    }

    function updateParticles(dt) {
        var rect = stageArea.getBoundingClientRect();
        var pal = palettes[state.palette];
        var mx = state.mouse.stageX;
        var my = state.mouse.stageY;
        var mouseActive = state.mouseInStage;

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];

            /* gentle flow + mouse attraction */
            var flowAngle = Math.sin(p.x * 0.004 + p.life * 0.01) * Math.PI;
            p.vx += Math.cos(flowAngle) * 0.02 * dt;
            p.vy += Math.sin(flowAngle) * 0.02 * dt;

            if (mouseActive) {
                var dx = mx - p.x;
                var dy = my - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 220 && dist > 1) {
                    var pull = (220 - dist) / 220 * 0.12 * dt;
                    p.vx += (dx / dist) * pull;
                    p.vy += (dy / dist) * pull;
                }
            }

            /* damping */
            p.vx *= Math.pow(0.96, dt);
            p.vy *= Math.pow(0.96, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life += dt;

            /* wrap */
            if (p.x < -10) p.x = rect.width + 10;
            if (p.x > rect.width + 10) p.x = -10;
            if (p.y < -10) p.y = rect.height + 10;
            if (p.y > rect.height + 10) p.y = -10;

            /* trail */
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > PARTICLE_TRAIL) p.trail.shift();
        }
    }

    function updateBursts(dt) {
        for (var i = state.bursts.length - 1; i >= 0; i--) {
            var b = state.bursts[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vx *= Math.pow(0.94, dt);
            b.vy *= Math.pow(0.94, dt);
            b.life -= dt;
            if (b.life <= 0) {
                state.bursts.splice(i, 1);
            }
        }
    }

    /* === Render === */
    function render() {
        var rect = stageArea.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        var pal = palettes[state.palette];
        var pr = pal.particle.r;
        var pg = pal.particle.g;
        var pb = pal.particle.b;

        /* ambient particles + trails */
        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];

            /* trail */
            for (var t = 0; t < p.trail.length; t++) {
                var tp = p.trail[t];
                var alpha = (t / p.trail.length) * 0.18;
                ctx.beginPath();
                ctx.arc(tp.x, tp.y, p.size * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',' + alpha + ')';
                ctx.fill();
            }

            /* head */
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',0.5)';
            ctx.fill();
        }

        /* connection lines between near particles */
        ctx.lineWidth = 0.5;
        for (var a = 0; a < state.particles.length; a++) {
            for (var b2 = a + 1; b2 < state.particles.length; b2++) {
                var pa = state.particles[a];
                var pb2 = state.particles[b2];
                var ddx = pa.x - pb2.x;
                var ddy = pa.y - pb2.y;
                var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dd < 90) {
                    var la = (1 - dd / 90) * 0.12;
                    ctx.strokeStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',' + la + ')';
                    ctx.beginPath();
                    ctx.moveTo(pa.x, pa.y);
                    ctx.lineTo(pb2.x, pb2.y);
                    ctx.stroke();
                }
            }
        }

        /* burst particles */
        for (var k = 0; k < state.bursts.length; k++) {
            var bu = state.bursts[k];
            var lifeRatio = bu.life / bu.maxLife;
            var bAlpha = lifeRatio * 0.9;
            var bSize = bu.size * (0.5 + lifeRatio * 0.8);

            /* glow */
            ctx.beginPath();
            ctx.arc(bu.x, bu.y, bSize * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + bu.color + ',' + (bAlpha * 0.18) + ')';
            ctx.fill();

            /* core */
            ctx.beginPath();
            ctx.arc(bu.x, bu.y, bSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + bu.color + ',' + bAlpha + ')';
            ctx.fill();
        }
    }

    /* === Boot === */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
