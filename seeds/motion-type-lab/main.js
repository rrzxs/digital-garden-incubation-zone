(function () {
    'use strict';

    /* === DOM Elements === */
    var stageFrame = document.getElementById('stage-frame');
    var typoStage = document.getElementById('typo-stage');
    var canvasRings = document.getElementById('canvas-rings');
    var stageHint = document.getElementById('stage-hint');
    var canvas = document.getElementById('particle-layer');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var charMeta = document.getElementById('char-meta');

    var inputText = document.getElementById('input-text');
    var textCounter = document.getElementById('text-counter');
    var ctrlSize = document.getElementById('ctrl-size');
    var ctrlWeight = document.getElementById('ctrl-weight');
    var ctrlRadius = document.getElementById('ctrl-radius');
    var ctrlStiffness = document.getElementById('ctrl-stiffness');
    var ctrlAmplitude = document.getElementById('ctrl-amplitude');
    var valSize = document.getElementById('val-size');
    var valWeight = document.getElementById('val-weight');
    var valRadius = document.getElementById('val-radius');
    var valStiffness = document.getElementById('val-stiffness');
    var valAmplitude = document.getElementById('val-amplitude');
    var hudFps = document.getElementById('hud-fps');
    var hudChars = document.getElementById('hud-chars');

    var modeBtns = document.querySelectorAll('#mode-toggle .mode-btn');
    var fieldBtns = document.querySelectorAll('#field-toggle .mode-btn');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var btnBurst = document.getElementById('btn-burst');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');

    /* === State === */
    var state = {
        text: 'MOTION',
        fontSize: 120,
        fontWeight: 300,
        fieldRadius: 220,
        stiffness: 0.12,
        amplitude: 0.6,
        mode: 'breath',
        field: 'repel',
        palette: 'ember',
        mouse: { x: -9999, y: -9999, clientX: 0, clientY: 0, vx: 0, vy: 0, prevX: 0, prevY: 0 },
        mouseInStage: false,
        hasInteracted: false,
        chars: [],
        ghosts: [],
        particles: [],
        bursts: [],
        time: 0,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        animId: null,
        lastTime: 0,
        fpsSamples: [],
        scrambleTimer: 0
    };

    var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>/\\|';
    var PARTICLE_COUNT = 70;
    var TRAIL_LENGTH = 5;
    var GHOST_POOL_SIZE = 6;

    /* === Palettes === */
    var palettes = {
        ember: { rgb: '251, 191, 36', glow: 'rgba(251, 191, 36, 0.1)' },
        nebula: { rgb: '240, 171, 252', glow: 'rgba(240, 171, 252, 0.1)' },
        abyss: { rgb: '34, 211, 238', glow: 'rgba(34, 211, 238, 0.1)' },
        frost: { rgb: '165, 243, 252', glow: 'rgba(165, 243, 252, 0.1)' }
    };

    /* === Init === */
    function init() {
        resizeCanvas();
        buildText(state.text);
        initParticles();
        buildRings();
        bindEvents();
        bindControls();
        updateCounter();
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    /* === Canvas === */
    function resizeCanvas() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function buildRings() {
        canvasRings.innerHTML = '';
        var sizes = [200, 320, 460, 620];
        for (var i = 0; i < sizes.length; i++) {
            var ring = document.createElement('div');
            ring.className = 'morph-ring';
            ring.style.width = sizes[i] + 'px';
            ring.style.height = sizes[i] + 'px';
            ring.style.animationDelay = (i * -1.5) + 's';
            canvasRings.appendChild(ring);
        }
    }

    /* === Text Building === */
    function buildText(text) {
        typoStage.innerHTML = '';
        state.chars = [];
        state.text = text || ' ';
        var chars = state.text.split('');

        for (var i = 0; i < chars.length; i++) {
            var ch = chars[i];
            var span = document.createElement('span');
            span.className = 'char-span' + (ch === ' ' ? ' space' : '');
            span.textContent = ch === ' ' ? '' : ch;
            span.dataset.char = ch;
            span.dataset.index = i;
            span.style.fontSize = state.fontSize + 'px';
            span.style.fontWeight = state.fontWeight;
            span.style.animation = 'char-enter 0.7s ' + (i * 0.04).toFixed(2) + 's var(--ease-out-expo) both';
            typoStage.appendChild(span);

            state.chars.push({
                el: span,
                char: ch,
                index: i,
                homeX: 0,
                homeY: 0,
                x: 0, y: 0,
                vx: 0, vy: 0,
                tx: 0, ty: 0,
                rotation: 0,
                rotationVel: 0,
                scale: 1,
                scaleVel: 0,
                weight: state.fontWeight,
                weightTarget: state.fontWeight,
                blur: 0,
                blurTarget: 0,
                spacing: 0,
                spacingTarget: 0,
                opacity: 1,
                displayChar: ch,
                scrambleLock: 0,
                proximity: 0,
                phase: (i / Math.max(chars.length, 1)) * Math.PI * 2,
                width: 0,
                height: 0
            });
        }
        measureChars();
        hudChars.textContent = state.chars.length;
    }

    function measureChars() {
        var stageRect = typoStage.getBoundingClientRect();
        state.chars.forEach(function (c) {
            var r = c.el.getBoundingClientRect();
            c.homeX = r.left + r.width / 2 - stageRect.left;
            c.homeY = r.top + r.height / 2 - stageRect.top;
            c.width = r.width;
            c.height = r.height;
        });
    }

    function updateCounter() {
        textCounter.textContent = state.text.length + ' / 24';
    }

    /* === Particles === */
    function initParticles() {
        state.particles = [];
        var w = window.innerWidth;
        var h = window.innerHeight;
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(createParticle(Math.random() * w, Math.random() * h));
        }
    }

    function createParticle(x, y) {
        return {
            x: x, y: y,
            originX: x, originY: y,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 2.2 + 0.6,
            alpha: Math.random() * 0.4 + 0.15,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.25 + 0.08,
            trail: []
        };
    }

    /* === Ghost Trail Pool === */
    function spawnGhost(charObj) {
        var ghost = document.createElement('span');
        ghost.className = 'char-ghost';
        ghost.textContent = charObj.displayChar;
        ghost.style.fontSize = state.fontSize + 'px';
        ghost.style.fontWeight = charObj.weight;
        var stageRect = typoStage.getBoundingClientRect();
        var cx = charObj.homeX + charObj.x;
        var cy = charObj.homeY + charObj.y;
        ghost.style.left = (cx - charObj.width / 2) + 'px';
        ghost.style.top = (cy - charObj.height / 2) + 'px';
        ghost.style.animation = 'ghost-fade 0.8s var(--ease-out-expo) forwards';
        typoStage.appendChild(ghost);
        state.ghosts.push(ghost);
        setTimeout(removeGhost, 820, ghost);
    }

    function removeGhost(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
        var idx = state.ghosts.indexOf(el);
        if (idx > -1) state.ghosts.splice(idx, 1);
        if (state.ghosts.length > GHOST_POOL_SIZE * 2) {
            var old = state.ghosts.splice(0, state.ghosts.length - GHOST_POOL_SIZE);
            old.forEach(function (g) { if (g.parentNode) g.parentNode.removeChild(g); });
        }
    }

    /* === Events === */
    function bindEvents() {
        window.addEventListener('mousemove', function (e) {
            state.mouse.prevX = state.mouse.clientX;
            state.mouse.prevY = state.mouse.clientY;
            state.mouse.clientX = e.clientX;
            state.mouse.clientY = e.clientY;
            state.mouse.vx = state.mouse.clientX - state.mouse.prevX;
            state.mouse.vy = state.mouse.clientY - state.mouse.prevY;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
            if (!cursorGlow.classList.contains('visible')) {
                cursorGlow.classList.add('visible');
            }

            var frameRect = stageFrame.getBoundingClientRect();
            if (e.clientX >= frameRect.left && e.clientX <= frameRect.right &&
                e.clientY >= frameRect.top && e.clientY <= frameRect.bottom) {
                var stageRect = typoStage.getBoundingClientRect();
                state.mouse.x = e.clientX - stageRect.left;
                state.mouse.y = e.clientY - stageRect.top;
                state.mouseInStage = true;
                if (!state.hasInteracted) {
                    state.hasInteracted = true;
                    stageHint.classList.add('hidden');
                }
            } else {
                state.mouseInStage = false;
            }
        });

        window.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
            cursorGlow.classList.remove('visible');
        });

        stageFrame.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            state.mouse.clientX = touch.clientX;
            state.mouse.clientY = touch.clientY;
            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';
            cursorGlow.classList.add('visible');
            var stageRect = typoStage.getBoundingClientRect();
            state.mouse.x = touch.clientX - stageRect.left;
            state.mouse.y = touch.clientY - stageRect.top;
            state.mouseInStage = true;
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: false });

        stageFrame.addEventListener('touchend', function () {
            state.mouseInStage = false;
        });

        stageFrame.addEventListener('click', function (e) {
            var stageRect = typoStage.getBoundingClientRect();
            triggerBurst(e.clientX - stageRect.left, e.clientY - stageRect.top);
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            measureChars();
        }, 180));

        window.addEventListener('keydown', function (e) {
            if (document.activeElement === inputText) return;
            if (e.code === 'Space') { e.preventDefault(); triggerBurst(state.mouse.x, state.mouse.y); }
            else if (e.key === 's' || e.key === 'S') { shuffleParams(); }
            else if (e.key === 'r' || e.key === 'R') { resetParams(); }
            else if (e.key >= '1' && e.key <= '5') {
                var idx = parseInt(e.key, 10) - 1;
                var modes = ['breath', 'wave', 'depth', 'orbit', 'scramble'];
                if (modes[idx]) setMode(modes[idx]);
            }
        });
    }

    /* === Controls === */
    function bindControls() {
        inputText.addEventListener('input', function () {
            var val = this.value.slice(0, 24);
            buildText(val || ' ');
            updateCounter();
        });

        ctrlSize.addEventListener('input', function () {
            state.fontSize = parseInt(this.value, 10);
            valSize.textContent = state.fontSize;
            state.chars.forEach(function (c) {
                c.el.style.fontSize = state.fontSize + 'px';
            });
            requestAnimationFrame(measureChars);
        });

        ctrlWeight.addEventListener('input', function () {
            state.fontWeight = parseInt(this.value, 10);
            valWeight.textContent = state.fontWeight;
            state.chars.forEach(function (c) {
                c.weightTarget = state.fontWeight;
            });
        });

        ctrlRadius.addEventListener('input', function () {
            state.fieldRadius = parseInt(this.value, 10);
            valRadius.textContent = state.fieldRadius;
        });

        ctrlStiffness.addEventListener('input', function () {
            state.stiffness = parseInt(this.value, 10) / 100;
            valStiffness.textContent = state.stiffness.toFixed(2);
        });

        ctrlAmplitude.addEventListener('input', function () {
            state.amplitude = parseInt(this.value, 10) / 100;
            valAmplitude.textContent = parseInt(this.value, 10);
        });

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                setMode(btn.dataset.mode);
            });
        });

        fieldBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                fieldBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.field = btn.dataset.field;
            });
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                document.body.className = 'palette-' + state.palette;
            });
        });

        btnBurst.addEventListener('click', function () {
            triggerBurst(state.mouse.x, state.mouse.y);
        });

        btnShuffle.addEventListener('click', shuffleParams);
        btnReset.addEventListener('click', resetParams);
    }

    function setMode(mode) {
        modeBtns.forEach(function (b) {
            b.classList.toggle('active', b.dataset.mode === mode);
        });
        state.mode = mode;
    }

    function shuffleParams() {
        var modes = ['breath', 'wave', 'depth', 'orbit', 'scramble'];
        setMode(modes[Math.floor(Math.random() * modes.length)]);
        var fields = ['repel', 'attract', 'orbit'];
        var newField = fields[Math.floor(Math.random() * fields.length)];
        fieldBtns.forEach(function (b) {
            b.classList.toggle('active', b.dataset.field === newField);
        });
        state.field = newField;

        setSlider(ctrlSize, valSize, randInt(60, 180), 'fontSize', true);
        setSlider(ctrlWeight, valWeight, Math.round(randInt(1, 9)) * 100, 'fontWeight', true);
        setSlider(ctrlRadius, valRadius, randInt(120, 360), 'fieldRadius', false);
        setSlider(ctrlAmplitude, valAmplitude, randInt(40, 90), null, null);
        state.amplitude = parseInt(ctrlAmplitude.value, 10) / 100;
    }

    function setSlider(input, label, value, stateKey, needsMeasure) {
        input.value = value;
        label.textContent = value;
        if (stateKey) {
            state[stateKey] = value;
            if (stateKey === 'fontSize') {
                state.chars.forEach(function (c) { c.el.style.fontSize = value + 'px'; });
            } else if (stateKey === 'fontWeight') {
                state.chars.forEach(function (c) { c.weightTarget = value; });
            }
        }
        if (needsMeasure) requestAnimationFrame(measureChars);
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function resetParams() {
        setSlider(ctrlSize, valSize, 120, 'fontSize', true);
        setSlider(ctrlWeight, valWeight, 300, 'fontWeight', true);
        setSlider(ctrlRadius, valRadius, 220, 'fieldRadius', false);
        setSlider(ctrlStiffness, valStiffness, 12, null, null);
        state.stiffness = 0.12;
        setSlider(ctrlAmplitude, valAmplitude, 60, null, null);
        state.amplitude = 0.6;
        setMode('breath');
        fieldBtns.forEach(function (b) {
            b.classList.toggle('active', b.dataset.field === 'repel');
        });
        state.field = 'repel';
        state.chars.forEach(function (c) {
            c.tx = 0; c.ty = 0; c.vx = 0; c.vy = 0;
            c.rotation = 0; c.rotationVel = 0;
            c.scale = 1; c.scaleVel = 0;
            c.blurTarget = 0; c.spacingTarget = 0;
            c.weightTarget = state.fontWeight;
        });
        state.bursts = [];
        state.hasInteracted = false;
        stageHint.classList.remove('hidden');
    }

    /* === Burst Shockwave === */
    function triggerBurst(x, y) {
        if (x === -9999 || x === undefined) {
            var r = typoStage.getBoundingClientRect();
            x = r.width / 2; y = r.height / 2;
        }
        state.bursts.push({
            x: x, y: y,
            radius: 0,
            maxRadius: state.fieldRadius * 2.4,
            alpha: 1,
            speed: 14
        });
        if (state.ghosts.length < GHOST_POOL_SIZE) {
            state.chars.forEach(function (c) {
                if (Math.random() < 0.35) spawnGhost(c);
            });
        }
    }

    function updateBursts(dt) {
        for (var i = state.bursts.length - 1; i >= 0; i--) {
            var b = state.bursts[i];
            b.radius += b.speed * dt;
            b.alpha = Math.max(0, 1 - b.radius / b.maxRadius);
            if (b.radius >= b.maxRadius) state.bursts.splice(i, 1);
        }
    }

    /* === Animation Loop === */
    function animate(time) {
        var rawDt = (time - state.lastTime) / 16.67;
        var dt = Math.min(rawDt, 3);
        state.lastTime = time;
        state.time += dt * 0.016;

        /* FPS */
        if (rawDt > 0) {
            state.fpsSamples.push(1000 / (time - (state.lastTime - (time - state.lastTime))));
            if (state.fpsSamples.length > 30) state.fpsSamples.shift();
        }
        if (state.fpsSamples.length > 5 && Math.floor(time / 500) !== Math.floor((time - rawDt * 16.67) / 500)) {
            var sum = 0;
            for (var s = 0; s < state.fpsSamples.length; s++) sum += state.fpsSamples[s];
            hudFps.textContent = Math.round(sum / state.fpsSamples.length);
        }

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        updateParticles(dt);
        drawParticles();
        updateBursts(dt);
        drawBursts();
        updateChars(dt);
        applyCharStyles();

        state.animId = requestAnimationFrame(animate);
    }

    /* === Char Physics === */
    function updateChars(dt) {
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var mouseActive = state.mouseInStage && mx > -999;
        var radius = state.fieldRadius;
        var amp = state.amplitude;
        var stiff = state.stiffness;
        var mode = state.mode;
        var field = state.field;
        var t = state.time;

        state.chars.forEach(function (c, i) {
            var influence = 0;

            /* Proximity force field */
            if (mouseActive) {
                var cx = c.homeX + c.x;
                var cy = c.homeY + c.y;
                var dx = mx - cx;
                var dy = my - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius) {
                    influence = 1 - dist / radius;
                    influence = influence * influence;
                    var angle = Math.atan2(dy, dx);
                    var forceMag = influence * amp * 14 * dt;
                    var dirX = 0, dirY = 0;

                    if (field === 'repel') {
                        dirX = -Math.cos(angle); dirY = -Math.sin(angle);
                    } else if (field === 'attract') {
                        dirX = Math.cos(angle); dirY = Math.sin(angle);
                    } else {
                        dirX = -Math.sin(angle); dirY = Math.cos(angle);
                        forceMag *= 0.7;
                    }
                    c.vx += dirX * forceMag;
                    c.vy += dirY * forceMag;
                    c.rotationVel += (dirX * influence * 0.025) * dt;

                    if (mode === 'wave') {
                        c.weightTarget = state.fontWeight + Math.round(influence * 500 * amp);
                        c.spacingTarget = influence * 0.12 * amp;
                    } else if (mode === 'depth') {
                        c.blurTarget = influence * 12 * amp;
                        c.scaleVel += (influence * 0.03 * amp) * dt;
                        c.weightTarget = state.fontWeight + Math.round(influence * 300 * amp);
                    } else if (mode === 'orbit') {
                        c.rotationVel += influence * 0.08 * amp * dt;
                        c.scaleVel += (influence * 0.025 * amp) * dt;
                    } else if (mode === 'scramble') {
                        c.scrambleLock = Math.max(c.scrambleLock, influence);
                    }
                }
            }

            /* Burst shockwave influence */
            for (var b = 0; b < state.bursts.length; b++) {
                var burst = state.bursts[b];
                var bcx = c.homeX + c.x;
                var bcy = c.homeY + c.y;
                var bdx = bcx - burst.x;
                var bdy = bcy - burst.y;
                var bdist = Math.sqrt(bdx * bdx + bdy * bdy);
                var ringDist = Math.abs(bdist - burst.radius);
                if (ringDist < 80) {
                    var bForce = (1 - ringDist / 80) * burst.alpha * 10;
                    var bAngle = Math.atan2(bdy, bdx);
                    c.vx += Math.cos(bAngle) * bForce * dt;
                    c.vy += Math.sin(bAngle) * bForce * dt;
                    c.scaleVel += bForce * 0.012 * dt;
                    if (mode === 'scramble') c.scrambleLock = Math.max(c.scrambleLock, bForce * 0.15);
                }
            }

            /* Mode-specific ambient motion */
            if (mode === 'breath') {
                var breath = Math.sin(t * 1.4 + c.phase) * 0.5 + 0.5;
                c.scaleVel += ((breath * 0.12 * amp) - (c.scale - 1) * 0.5) * 0.01 * dt;
                c.weightTarget = state.fontWeight + Math.round(breath * 200 * amp);
                c.spacingTarget = breath * 0.04 * amp;
            } else if (mode === 'wave') {
                if (!mouseActive) { c.weightTarget = state.fontWeight; c.spacingTarget = 0; }
                var wave = Math.sin(t * 2 + c.index * 0.6) * 0.5 + 0.5;
                c.scaleVel += ((wave * 0.08 * amp) - (c.scale - 1) * 0.5) * 0.008 * dt;
            } else if (mode === 'depth') {
                if (!mouseActive) { c.blurTarget = 0; c.weightTarget = state.fontWeight; }
            } else if (mode === 'orbit') {
                if (!mouseActive) { c.weightTarget = state.fontWeight; }
                var orbit = Math.sin(t * 1.1 + c.index * 0.4) * 0.5 + 0.5;
                c.rotationVel += (orbit * 0.002 * amp - c.rotation * 0.003) * dt;
            }

            /* Spring home force */
            var homeForceX = -c.x * stiff * 2.4;
            var homeForceY = -c.y * stiff * 2.4;
            c.vx += homeForceX * dt;
            c.vy += homeForceY * dt;

            var damp = Math.pow(0.86, dt);
            c.vx *= damp;
            c.vy *= damp;

            c.x += c.vx * dt;
            c.y += c.vy * dt;

            /* Rotation spring */
            c.rotationVel += (-c.rotation * 0.09) * dt;
            c.rotationVel *= Math.pow(0.88, dt);
            c.rotation += c.rotationVel * dt;

            /* Scale spring */
            c.scaleVel += (1 - c.scale) * 0.08 * dt;
            c.scaleVel *= Math.pow(0.9, dt);
            c.scale += c.scaleVel * dt;

            /* Property easing (nonlinear) */
            var ease = 0.15 * dt;
            c.weight += (c.weightTarget - c.weight) * ease;
            c.blur += (c.blurTarget - c.blur) * ease;
            c.spacing += (c.spacingTarget - c.spacing) * ease;
            c.proximity = c.proximity + (influence - c.proximity) * 0.2 * dt;

            /* Scramble reveal logic */
            if (mode === 'scramble') {
                if (c.scrambleLock > 0.15) {
                    c.scrambleTimer = (c.scrambleTimer || 0) + dt;
                    if (c.scrambleTimer > 2.5) {
                        c.scrambleTimer = 0;
                        c.displayChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                        c.el.textContent = c.displayChar;
                    }
                } else if (c.displayChar !== c.char) {
                    c.displayChar = c.char;
                    c.el.textContent = c.char;
                }
                c.scrambleLock *= Math.pow(0.92, dt);
            } else if (c.displayChar !== c.char) {
                c.displayChar = c.char;
                c.el.textContent = c.char;
            }
        });

        /* Char meta tooltip */
        if (mouseActive) {
            var nearest = null;
            var nearestDist = Infinity;
            state.chars.forEach(function (c) {
                var dx = mx - (c.homeX + c.x);
                var dy = my - (c.homeY + c.y);
                var d = dx * dx + dy * dy;
                if (d < nearestDist) { nearestDist = d; nearest = c; }
            });
            if (nearest && nearestDist < state.fieldRadius * state.fieldRadius) {
                charMeta.innerHTML = '<span>CHAR <span class="meta-val">' + nearest.displayChar + '</span></span>' +
                    '<span>PROX <span class="meta-val">' + Math.round(nearest.proximity * 100) + '%</span></span>' +
                    '<span>W <span class="meta-val">' + Math.round(nearest.weight) + '</span></span>';
                charMeta.classList.add('visible');
            } else {
                charMeta.classList.remove('visible');
            }
        } else {
            charMeta.classList.remove('visible');
        }
    }

    function applyCharStyles() {
        state.chars.forEach(function (c) {
            c.el.style.transform =
                'translate(' + c.x.toFixed(2) + 'px,' + c.y.toFixed(2) + 'px) ' +
                'rotate(' + c.rotation.toFixed(3) + 'rad) ' +
                'scale(' + c.scale.toFixed(4) + ')';
            if (Math.abs(c.weight - parseFloat(c.el.style.fontWeight)) > 1) {
                c.el.style.fontWeight = Math.round(c.weight);
            }
            if (c.blur > 0.05) {
                c.el.style.filter = 'blur(' + c.blur.toFixed(2) + 'px)';
            } else if (c.el.style.filter) {
                c.el.style.filter = '';
            }
            if (Math.abs(c.spacing) > 0.001) {
                c.el.style.letterSpacing = c.spacing.toFixed(3) + 'em';
            } else if (c.el.style.letterSpacing) {
                c.el.style.letterSpacing = '';
            }
            var glowBoost = 0.5 + c.proximity * 0.6;
            c.el.style.textShadow = '0 0 ' + (32 + c.proximity * 40).toFixed(0) + 'px rgba(' + palettes[state.palette].rgb + ',' + glowBoost.toFixed(2) + ')';
        });
    }

    /* === Particles === */
    function updateParticles(dt) {
        var mouseActive = state.mouseInStage && state.mouse.x > -999;
        var w = window.innerWidth;
        var h = window.innerHeight;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.018 * dt;

            if (mouseActive) {
                var dx = state.mouse.clientX - p.x;
                var dy = state.mouse.clientY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = state.fieldRadius * 1.1;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.35;
                    var angle = Math.atan2(dy, dx);
                    if (state.field === 'repel') {
                        p.vx -= Math.cos(angle) * force * dt;
                        p.vy -= Math.sin(angle) * force * dt;
                    } else if (state.field === 'attract') {
                        p.vx += Math.cos(angle) * force * dt * 0.8;
                        p.vy += Math.sin(angle) * force * dt * 0.8;
                    } else {
                        p.vx += -Math.sin(angle) * force * dt;
                        p.vy += Math.cos(angle) * force * dt;
                    }
                }
            }

            /* Burst influence */
            for (var b = 0; b < state.bursts.length; b++) {
                var burst = state.bursts[b];
                var bdx = p.x - burst.x;
                var bdy = p.y - burst.y;
                var bdist = Math.sqrt(bdx * bdx + bdy * bdy);
                var ringDist = Math.abs(bdist - burst.radius);
                if (ringDist < 100) {
                    var bForce = (1 - ringDist / 100) * burst.alpha * 4;
                    var bAngle = Math.atan2(bdy, bdx);
                    p.vx += Math.cos(bAngle) * bForce * dt;
                    p.vy += Math.sin(bAngle) * bForce * dt;
                }
            }

            /* Ambient drift + home */
            var homeForceX = (p.originX - p.x) * 0.006;
            var homeForceY = (p.originY - p.y) * 0.006;
            p.vx += homeForceX * dt;
            p.vy += homeForceY * dt;
            p.vx += Math.sin(p.phase) * 0.02 * dt;
            p.vy += Math.cos(p.phase * 0.8) * 0.02 * dt;

            p.vx *= Math.pow(0.96, dt);
            p.vy *= Math.pow(0.96, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            /* wrap */
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            p.trail.unshift({ x: p.x, y: p.y, alpha: p.alpha });
            if (p.trail.length > TRAIL_LENGTH) p.trail.pop();
        });
    }

    function drawParticles() {
        var rgb = palettes[state.palette].rgb;

        state.particles.forEach(function (p) {
            for (var t = p.trail.length - 1; t >= 0; t--) {
                var tp = p.trail[t];
                var trailAlpha = tp.alpha * (1 - t / TRAIL_LENGTH) * 0.45;
                var trailRadius = p.radius * (1 - t / TRAIL_LENGTH * 0.6);
                ctx.beginPath();
                ctx.arc(tp.x, tp.y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + rgb + ',' + trailAlpha.toFixed(3) + ')';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + rgb + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            if (p.radius > 1.4) {
                var r = Math.max(0.5, p.radius * 3);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
                grad.addColorStop(0, 'rgba(' + rgb + ',' + (p.alpha * 0.22).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + rgb + ',0)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });

        if (state.mouseInStage && state.mouse.clientX > 0) {
            drawConnections(rgb);
        }
    }

    function drawConnections(rgb) {
        var mx = state.mouse.clientX;
        var my = state.mouse.clientY;
        var maxDist = state.fieldRadius * 0.5;

        state.particles.forEach(function (p) {
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
                var alpha = (1 - dist / maxDist) * 0.14;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        });
    }

    function drawBursts() {
        var rgb = palettes[state.palette].rgb;
        state.bursts.forEach(function (b) {
            var r = Math.max(0.5, b.radius);
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + rgb + ',' + (b.alpha * 0.6).toFixed(3) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();

            var innerR = Math.max(0.5, r * 0.6);
            var grad = ctx.createRadialGradient(b.x, b.y, innerR, b.x, b.y, r);
            grad.addColorStop(0, 'rgba(' + rgb + ',0)');
            grad.addColorStop(0.8, 'rgba(' + rgb + ',' + (b.alpha * 0.12).toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(' + rgb + ',0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        });
    }

    /* === Utils === */
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var self = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(self, args); }, delay);
        };
    }

    init();
})();
