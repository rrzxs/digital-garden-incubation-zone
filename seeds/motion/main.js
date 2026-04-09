(function () {
    'use strict';

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var stageArea = document.getElementById('stage-area');

    var ctrlStiffness = document.getElementById('ctrl-stiffness');
    var ctrlDamping = document.getElementById('ctrl-damping');
    var ctrlMagnetism = document.getElementById('ctrl-magnetism');
    var valStiffness = document.getElementById('val-stiffness');
    var valDamping = document.getElementById('val-damping');
    var valMagnetism = document.getElementById('val-magnetism');
    var btnReset = document.getElementById('btn-reset');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var modeBtns = document.querySelectorAll('.mode-btn');

    var state = {
        mouse: { x: -9999, y: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        stiffness: 0.12,
        damping: 0.75,
        magnetism: 200,
        mode: 'compose',
        particles: [],
        cardStates: [],
        palette: 'obsidian',
        dpr: window.devicePixelRatio || 1,
        animId: null,
        lastTime: 0
    };

    var palettes = {
        obsidian: {
            particle: { r: 139, g: 92, b: 246 },
            glow: 'rgba(139, 92, 246, 0.08)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540']
        },
        aurora: {
            particle: { r: 0, g: 212, b: 255 },
            glow: 'rgba(0, 212, 255, 0.08)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530']
        },
        ember: {
            particle: { r: 249, g: 115, b: 22 },
            glow: 'rgba(249, 115, 22, 0.08)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008']
        },
        frost: {
            particle: { r: 165, g: 180, b: 252 },
            glow: 'rgba(165, 180, 252, 0.08)',
            blobs: ['#0d1530', '#101a3a', '#151a40', '#0d1830']
        }
    };

    var PARTICLE_COUNT = 80;
    var TRAIL_LENGTH = 6;

    function init() {
        resizeCanvas();
        initCardStates();
        initParticles();
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    function resizeCanvas() {
        var rect = stageArea.getBoundingClientRect();
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function initCardStates() {
        var cards = document.querySelectorAll('.motion-card');
        state.cardStates = [];
        cards.forEach(function (card, i) {
            var rect = card.getBoundingClientRect();
            var stageRect = stageArea.getBoundingClientRect();
            state.cardStates.push({
                el: card,
                homeX: rect.left + rect.width / 2 - stageRect.left,
                homeY: rect.top + rect.height / 2 - stageRect.top,
                currentX: 0,
                currentY: 0,
                velocityX: 0,
                velocityY: 0,
                rotation: 0,
                rotationVel: 0,
                scale: 1,
                scaleVel: 0,
                spring: parseFloat(card.dataset.spring) || state.stiffness,
                damp: parseFloat(card.dataset.damping) || state.damping,
                delay: parseInt(card.dataset.delay, 10) || 0,
                width: rect.width,
                height: rect.height
            });
        });
    }

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
            originX: x,
            originY: y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2.5 + 0.8,
            alpha: Math.random() * 0.5 + 0.2,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.3 + 0.1,
            trail: []
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

        stageArea.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            state.mouseInStage = true;

            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: false });

        stageArea.addEventListener('touchend', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            initCardStates();
            initParticles();
        }, 200));
    }

    function bindControls() {
        ctrlStiffness.addEventListener('input', function () {
            state.stiffness = parseInt(this.value, 10) / 100;
            valStiffness.textContent = state.stiffness.toFixed(2);
        });

        ctrlDamping.addEventListener('input', function () {
            state.damping = parseInt(this.value, 10) / 100;
            valDamping.textContent = state.damping.toFixed(2);
        });

        ctrlMagnetism.addEventListener('input', function () {
            state.magnetism = parseInt(this.value, 10);
            valMagnetism.textContent = state.magnetism;
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

        btnReset.addEventListener('click', function () {
            state.cardStates.forEach(function (cs) {
                cs.currentX = 0;
                cs.currentY = 0;
                cs.velocityX = 0;
                cs.velocityY = 0;
                cs.rotation = 0;
                cs.rotationVel = 0;
                cs.scale = 1;
                cs.scaleVel = 0;
                cs.el.style.transform = '';
            });
            state.particles.forEach(function (p) {
                p.x = p.originX;
                p.y = p.originY;
                p.vx = (Math.random() - 0.5) * 0.5;
                p.vy = (Math.random() - 0.5) * 0.5;
                p.trail = [];
            });
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

        updateParticles(dt);
        drawParticles();
        updateCards(dt);
        applyCardTransforms();

        state.animId = requestAnimationFrame(animate);
    }

    function updateCards(dt) {
        var mouseActive = state.mouseInStage && state.mouse.x > -999;
        var mx = state.mouse.x;
        var my = state.mouse.y;

        state.cardStates.forEach(function (cs, i) {
            var stiffness = cs.spring > 0 ? cs.spring : state.stiffness;
            var damping = cs.damp > 0 ? cs.damp : state.damping;

            if (mouseActive) {
                var dx = mx - (cs.homeX + cs.currentX);
                var dy = my - (cs.homeY + cs.currentY);
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < state.magnetism) {
                    var force = (1 - dist / state.magnetism);
                    force = force * force;
                    var angle = Math.atan2(dy, dx);

                    if (state.mode === 'compose') {
                        cs.velocityX += Math.cos(angle) * force * stiffness * 80 * dt;
                        cs.velocityY += Math.sin(angle) * force * stiffness * 80 * dt;
                        cs.rotationVel += (Math.cos(angle + Math.PI / 2) * force * 0.02) * dt;
                    } else {
                        cs.velocityX -= Math.cos(angle) * force * stiffness * 60 * dt;
                        cs.velocityY -= Math.sin(angle) * force * stiffness * 60 * dt;
                        cs.rotationVel += (Math.sin(angle) * force * 0.03) * dt;
                    }

                    cs.scaleVel += (force * 0.02) * dt;
                }
            }

            var homeForceX = -cs.currentX * stiffness * 2;
            var homeForceY = -cs.currentY * stiffness * 2;
            cs.velocityX += homeForceX * dt;
            cs.velocityY += homeForceY * dt;

            cs.velocityX *= Math.pow(damping, dt);
            cs.velocityY *= Math.pow(damping, dt);

            cs.currentX += cs.velocityX * dt;
            cs.currentY += cs.velocityY * dt;

            cs.rotationVel += (-cs.rotation * 0.08) * dt;
            cs.rotationVel *= Math.pow(0.85, dt);
            cs.rotation += cs.rotationVel * dt;

            cs.scaleVel += (1 - cs.scale) * 0.06 * dt;
            cs.scaleVel *= Math.pow(0.9, dt);
            cs.scale += cs.scaleVel * dt;
        });
    }

    function applyCardTransforms() {
        state.cardStates.forEach(function (cs) {
            var tx = cs.currentX;
            var ty = cs.currentY;
            var r = cs.rotation;
            var s = cs.scale;

            cs.el.style.transform =
                'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) ' +
                'rotate(' + r.toFixed(3) + 'rad) ' +
                'scale(' + s.toFixed(4) + ')';
        });
    }

    function updateParticles(dt) {
        var mouseActive = state.mouseInStage && state.mouse.x > -999;
        var pal = palettes[state.palette].particle;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.02 * dt;

            if (mouseActive) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = state.magnetism * 1.2;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.3;
                    var angle = Math.atan2(dy, dx);

                    if (state.mode === 'compose') {
                        p.vx += Math.cos(angle) * force * dt;
                        p.vy += Math.sin(angle) * force * dt;
                    } else {
                        p.vx -= Math.cos(angle) * force * dt * 1.5;
                        p.vy -= Math.sin(angle) * force * dt * 1.5;
                    }
                }
            }

            var homeForceX = (p.originX - p.x) * 0.008;
            var homeForceY = (p.originY - p.y) * 0.008;
            p.vx += homeForceX * dt;
            p.vy += homeForceY * dt;

            p.vx *= Math.pow(0.96, dt);
            p.vy *= Math.pow(0.96, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.trail.unshift({ x: p.x, y: p.y, alpha: p.alpha });
            if (p.trail.length > TRAIL_LENGTH) {
                p.trail.pop();
            }
        });
    }

    function drawParticles() {
        var pal = palettes[state.palette].particle;

        state.particles.forEach(function (p) {
            for (var t = p.trail.length - 1; t >= 0; t--) {
                var trailPt = p.trail[t];
                var trailAlpha = trailPt.alpha * (1 - t / TRAIL_LENGTH) * 0.5;
                var trailRadius = p.radius * (1 - t / TRAIL_LENGTH * 0.6);

                ctx.beginPath();
                ctx.arc(trailPt.x, trailPt.y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + trailAlpha.toFixed(3) + ')';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            if (p.radius > 1.5) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (p.alpha * 0.2).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });

        if (state.mouseInStage && state.mouse.x > -999) {
            drawConnections();
        }
    }

    function drawConnections() {
        var pal = palettes[state.palette].particle;
        var mx = state.mouse.x;
        var my = state.mouse.y;

        state.particles.forEach(function (p) {
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var maxDist = state.magnetism * 0.6;

            if (dist < maxDist) {
                var alpha = (1 - dist / maxDist) * 0.15;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        });
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
