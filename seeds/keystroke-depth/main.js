(function () {
    'use strict';

    var canvas = document.getElementById('main-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var stageArea = document.getElementById('stage-area');
    var floatingText = document.getElementById('floating-text');
    var centerRing = document.getElementById('center-ring');
    var ringInner = centerRing.querySelector('.ring-inner');
    var ringChar = document.getElementById('ring-char');
    var keyTrail = document.getElementById('key-trail');

    var statKeys = document.getElementById('stat-keys');
    var statDepth = document.getElementById('stat-depth');
    var statWave = document.getElementById('stat-wave');

    var ctrlForce = document.getElementById('ctrl-force');
    var ctrlDecay = document.getElementById('ctrl-decay');
    var ctrlParticles = document.getElementById('ctrl-particles');
    var valForce = document.getElementById('val-force');
    var valDecay = document.getElementById('val-decay');
    var valParticles = document.getElementById('val-particles');
    var btnClear = document.getElementById('btn-clear');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var paletteBtns = document.querySelectorAll('.palette-btn');

    var state = {
        dpr: window.devicePixelRatio || 1,
        width: 0,
        height: 0,
        ripples: [],
        particles: [],
        flowParticles: [],
        keyCount: 0,
        depthCount: 0,
        waveCount: 0,
        force: 0.60,
        decay: 0.70,
        particleBurst: 12,
        palette: 'obsidian',
        lastKeyTime: 0,
        typingRhythm: [],
        mouseX: -9999,
        mouseY: -9999,
        animId: null,
        lastTime: 0,
        hasInteracted: false
    };

    var palettes = {
        obsidian: {
            ripple: { r: 139, g: 92, b: 246 },
            particle: { r: 200, g: 160, b: 255 },
            glow: 'rgba(139, 92, 246, 0.08)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540']
        },
        aurora: {
            ripple: { r: 0, g: 212, b: 255 },
            particle: { r: 100, g: 255, b: 200 },
            glow: 'rgba(0, 212, 255, 0.08)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530']
        },
        ember: {
            ripple: { r: 249, g: 115, b: 22 },
            particle: { r: 255, g: 180, b: 60 },
            glow: 'rgba(249, 115, 22, 0.08)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008']
        },
        frost: {
            ripple: { r: 165, g: 180, b: 252 },
            particle: { r: 200, g: 220, b: 255 },
            glow: 'rgba(165, 180, 252, 0.08)',
            blobs: ['#0d1530', '#101a3a', '#151a40', '#0d1830']
        }
    };

    var FLOW_PARTICLE_COUNT = 50;
    var MAX_TRAIL_KEYS = 12;
    var MAX_RIPPLES = 30;

    function init() {
        resizeCanvas();
        initFlowParticles();
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    function resizeCanvas() {
        var rect = stageArea.getBoundingClientRect();
        state.width = rect.width;
        state.height = rect.height;
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function initFlowParticles() {
        state.flowParticles = [];
        for (var i = 0; i < FLOW_PARTICLE_COUNT; i++) {
            state.flowParticles.push({
                x: Math.random() * state.width,
                y: Math.random() * state.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 1.8 + 0.6,
                alpha: Math.random() * 0.3 + 0.1,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.2 + 0.05
            });
        }
    }

    function bindEvents() {
        window.addEventListener('keydown', function (e) {
            if (e.repeat) return;
            if (e.key === 'F11' || e.key === 'F12') return;
            if (e.metaKey || e.ctrlKey) return;
            e.preventDefault();
            handleKeystroke(e.key, e.code);
        });

        stageArea.addEventListener('mousemove', function (e) {
            var rect = stageArea.getBoundingClientRect();
            state.mouseX = e.clientX - rect.left;
            state.mouseY = e.clientY - rect.top;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        stageArea.addEventListener('mouseleave', function () {
            state.mouseX = -9999;
            state.mouseY = -9999;
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            initFlowParticles();
        }, 200));

        stageArea.addEventListener('touchstart', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            state.mouseX = touch.clientX - rect.left;
            state.mouseY = touch.clientY - rect.top;
            handleKeystroke('Tap', 'Tap');
        }, { passive: false });
    }

    function handleKeystroke(key, code) {
        if (!state.hasInteracted) {
            state.hasInteracted = true;
            stageHint.classList.add('hidden');
        }

        var now = performance.now();
        state.typingRhythm.push(now);
        if (state.typingRhythm.length > 20) state.typingRhythm.shift();

        state.keyCount++;
        state.depthCount++;
        state.waveCount++;

        var cx = state.width / 2;
        var cy = state.height / 2;

        spawnRipple(cx, cy, key);
        spawnBurstParticles(cx, cy, key);

        updateCenterRing(key);
        spawnFloatingChar(key, cx, cy);
        updateKeyTrail(key);

        ringInner.classList.add('active');
        setTimeout(function () {
            ringInner.classList.remove('active');
        }, 200);

        statKeys.textContent = state.keyCount;
        statDepth.textContent = state.depthCount;
        statWave.textContent = state.waveCount;

        state.lastKeyTime = now;
    }

    function spawnRipple(x, y, key) {
        var charCode = 0;
        for (var i = 0; i < key.length; i++) {
            charCode += key.charCodeAt(i);
        }
        var variation = (charCode % 40) / 40;

        var rhythmSpeed = getRhythmMultiplier();
        var maxRadius = (120 + variation * 100) * state.force * 2;
        var speed = (2.5 + rhythmSpeed * 1.5) * state.force;

        state.ripples.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: maxRadius,
            speed: speed,
            alpha: 0.7 + variation * 0.3,
            lineWidth: 1.5 + variation,
            rotation: charCode * 0.3,
            key: key,
            charCode: charCode,
            age: 0
        });

        if (state.ripples.length > MAX_RIPPLES) {
            state.ripples.shift();
        }
    }

    function spawnBurstParticles(x, y, key) {
        var count = state.particleBurst;
        var charCode = 0;
        for (var i = 0; i < key.length; i++) {
            charCode += key.charCodeAt(i);
        }

        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 / count) * i + (charCode * 0.1);
            var speed = (2 + Math.random() * 4) * state.force;
            var life = 60 + Math.random() * 40;

            state.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.5 + Math.random() * 2.5,
                alpha: 0.8,
                life: life,
                maxLife: life,
                trail: [],
                charCode: charCode,
                gravity: 0.02 + Math.random() * 0.03
            });
        }
    }

    function getRhythmMultiplier() {
        if (state.typingRhythm.length < 2) return 1;
        var intervals = [];
        for (var i = 1; i < state.typingRhythm.length; i++) {
            intervals.push(state.typingRhythm[i] - state.typingRhythm[i - 1]);
        }
        var avg = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
        if (avg < 120) return 1.6;
        if (avg < 200) return 1.3;
        if (avg < 350) return 1.0;
        return 0.7;
    }

    function updateCenterRing(key) {
        var display = key.length === 1 ? key.toUpperCase() : key.substring(0, 3);
        if (key === ' ') display = 'SPC';
        if (key === 'Enter') display = '↵';
        if (key === 'Backspace') display = '⌫';
        if (key === 'Tab') display = '⇥';
        if (key === 'Escape') display = 'ESC';
        if (key === 'ArrowUp') display = '↑';
        if (key === 'ArrowDown') display = '↓';
        if (key === 'ArrowLeft') display = '←';
        if (key === 'ArrowRight') display = '→';
        if (key === 'Shift') display = '⇧';
        if (key === 'Tap') display = '◆';

        ringChar.textContent = display;
    }

    function spawnFloatingChar(key, cx, cy) {
        if (key.length !== 1) return;
        var el = document.createElement('span');
        el.className = 'floating-char';
        el.textContent = key.toUpperCase();

        var offsetX = (Math.random() - 0.5) * 200;
        var offsetY = (Math.random() - 0.5) * 100;
        el.style.left = (cx + offsetX) + 'px';
        el.style.top = (cy + offsetY) + 'px';

        var pal = palettes[state.palette].ripple;
        el.style.color = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0.8)';

        floatingText.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1800);
    }

    function updateKeyTrail(key) {
        var display = key.length === 1 ? key.toUpperCase() : key.substring(0, 2);
        if (key === ' ') display = '␣';
        if (key === 'Enter') display = '↵';
        if (key === 'Backspace') display = '⌫';
        if (key === 'Tap') display = '◆';

        var prevLatest = keyTrail.querySelector('.latest');
        if (prevLatest) prevLatest.classList.remove('latest');

        var el = document.createElement('span');
        el.className = 'trail-key latest';
        el.textContent = display;
        keyTrail.appendChild(el);

        while (keyTrail.children.length > MAX_TRAIL_KEYS) {
            keyTrail.removeChild(keyTrail.firstChild);
        }
    }

    function bindControls() {
        ctrlForce.addEventListener('input', function () {
            state.force = parseInt(this.value, 10) / 100;
            valForce.textContent = state.force.toFixed(2);
        });

        ctrlDecay.addEventListener('input', function () {
            state.decay = parseInt(this.value, 10) / 100;
            valDecay.textContent = state.decay.toFixed(2);
        });

        ctrlParticles.addEventListener('input', function () {
            state.particleBurst = parseInt(this.value, 10);
            valParticles.textContent = state.particleBurst;
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette();
            });
        });

        btnClear.addEventListener('click', function () {
            state.ripples = [];
            state.particles = [];
            state.keyCount = 0;
            state.depthCount = 0;
            state.waveCount = 0;
            state.typingRhythm = [];
            floatingText.innerHTML = '';
            keyTrail.innerHTML = '';
            ringChar.textContent = '?';
            statKeys.textContent = '0';
            statDepth.textContent = '0';
            statWave.textContent = '0';
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

        ctx.clearRect(0, 0, state.width, state.height);

        updateFlowParticles(dt);
        drawFlowParticles();
        updateRipples(dt);
        drawRipples();
        updateParticles(dt);
        drawParticles();
        drawCenterGlow();

        state.animId = requestAnimationFrame(animate);
    }

    function updateFlowParticles(dt) {
        state.flowParticles.forEach(function (p) {
            p.phase += p.speed * 0.02 * dt;

            if (state.mouseX > -999) {
                var dx = state.mouseX - p.x;
                var dy = state.mouseY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150 && dist > 1) {
                    var force = (1 - dist / 150) * 0.15;
                    p.vx += (dx / dist) * force * dt;
                    p.vy += (dy / dist) * force * dt;
                }
            }

            var rippleForce = getRippleForceAt(p.x, p.y);
            p.vx += rippleForce.fx * dt;
            p.vy += rippleForce.fy * dt;

            p.vx *= Math.pow(0.95, dt);
            p.vy *= Math.pow(0.95, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
            if (p.x > state.width) { p.x = state.width; p.vx *= -0.5; }
            if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
            if (p.y > state.height) { p.y = state.height; p.vy *= -0.5; }
        });
    }

    function getRippleForceAt(x, y) {
        var fx = 0, fy = 0;
        for (var i = 0; i < state.ripples.length; i++) {
            var r = state.ripples[i];
            var dx = x - r.x;
            var dy = y - r.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var ringDist = Math.abs(dist - r.radius);

            if (ringDist < 30 && dist > 1) {
                var force = (1 - ringDist / 30) * r.alpha * 0.5;
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            }
        }
        return { fx: fx, fy: fy };
    }

    function drawFlowParticles() {
        var pal = palettes[state.palette].particle;
        state.flowParticles.forEach(function (p) {
            var glow = p.alpha * (0.8 + Math.sin(p.phase) * 0.2);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + glow.toFixed(3) + ')';
            ctx.fill();

            if (p.radius > 1.2) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (glow * 0.15).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }

    function updateRipples(dt) {
        for (var i = state.ripples.length - 1; i >= 0; i--) {
            var r = state.ripples[i];
            r.radius += r.speed * dt;
            r.age += dt;
            r.alpha *= Math.pow(state.decay, dt * 0.03);

            if (r.radius >= r.maxRadius || r.alpha < 0.01) {
                state.ripples.splice(i, 1);
            }
        }
    }

    function drawRipples() {
        var pal = palettes[state.palette].ripple;
        var cx = state.width / 2;
        var cy = state.height / 2;

        state.ripples.forEach(function (r) {
            ctx.save();
            ctx.translate(r.x, r.y);

            var segments = 6 + (r.charCode % 4);
            var baseAngle = r.rotation + r.age * 0.01;

            for (var s = 0; s < 3; s++) {
                var ringRadius = r.radius * (1 - s * 0.15);
                var ringAlpha = r.alpha * (1 - s * 0.3);
                if (ringRadius < 1 || ringAlpha < 0.01) continue;

                ctx.beginPath();
                var points = segments * 8;
                for (var i = 0; i <= points; i++) {
                    var angle = (Math.PI * 2 / points) * i;
                    var noiseFactor = 1 + Math.sin(angle * segments + baseAngle + s) * 0.04;
                    var px = Math.cos(angle) * ringRadius * noiseFactor;
                    var py = Math.sin(angle) * ringRadius * noiseFactor;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();

                ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + ringAlpha.toFixed(3) + ')';
                ctx.lineWidth = Math.max(0.3, r.lineWidth * (1 - s * 0.3));
                ctx.stroke();
            }

            if (r.radius < r.maxRadius * 0.3) {
                var innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r.radius);
                innerGlow.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (r.alpha * 0.06).toFixed(3) + ')');
                innerGlow.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
                ctx.fillStyle = innerGlow;
                ctx.beginPath();
                ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });

        if (state.ripples.length > 1) {
            drawRippleConnections(pal);
        }
    }

    function drawRippleConnections(pal) {
        for (var i = 0; i < state.ripples.length; i++) {
            for (var j = i + 1; j < state.ripples.length; j++) {
                var a = state.ripples[i];
                var b = state.ripples[j];
                var dx = a.x - b.x;
                var dy = a.y - b.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = 200;

                if (dist < maxDist && dist > 1) {
                    var alpha = (1 - dist / maxDist) * Math.min(a.alpha, b.alpha) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + alpha.toFixed(3) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function updateParticles(dt) {
        for (var i = state.particles.length - 1; i >= 0; i--) {
            var p = state.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                state.particles.splice(i, 1);
                continue;
            }

            p.vy += p.gravity * dt;

            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 6) p.trail.pop();

            p.alpha = (p.life / p.maxLife) * 0.8;
        }
    }

    function drawParticles() {
        var pal = palettes[state.palette].particle;

        state.particles.forEach(function (p) {
            for (var t = p.trail.length - 1; t >= 0; t--) {
                var pt = p.trail[t];
                var trailAlpha = p.alpha * (1 - t / 6) * 0.4;
                var trailRadius = p.radius * (1 - t / 6 * 0.7);
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + trailAlpha.toFixed(3) + ')';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            if (p.radius > 2) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
                grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (p.alpha * 0.15).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }

    function drawCenterGlow() {
        if (state.lastKeyTime === 0) return;

        var elapsed = (performance.now() - state.lastKeyTime) / 1000;
        if (elapsed > 3) return;

        var intensity = Math.max(0, 1 - elapsed / 3);
        var pal = palettes[state.palette].ripple;
        var cx = state.width / 2;
        var cy = state.height / 2;
        var radius = 60 + (1 - intensity) * 40;

        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (intensity * 0.1).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
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
