(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\\ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    var MODES = ['elastic', 'crystal', 'vortex', 'pulse', 'shatter'];
    var FIELDS = ['repel', 'attract', 'orbit'];

    // === DOM Elements ===

    var cursorGlow = document.getElementById('cursor-glow');
    var particleCanvas = document.getElementById('particle-layer');
    var stage = document.getElementById('stage');
    var typoCanvas = document.getElementById('typo-canvas');
    var typoDisplay = document.getElementById('typo-display');
    var canvasRings = document.getElementById('canvas-rings');
    var charMeta = document.getElementById('char-meta');
    var inputText = document.getElementById('input-text');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnExplode = document.getElementById('btn-explode');
    var btnReset = document.getElementById('btn-reset');
    var modeToggle = document.getElementById('mode-toggle');
    var fieldToggle = document.getElementById('field-toggle');
    var paletteToggle = document.getElementById('palette-toggle');

    var ctrlSize = document.getElementById('ctrl-size');
    var ctrlWeight = document.getElementById('ctrl-weight');
    var ctrlAmplitude = document.getElementById('ctrl-amplitude');
    var ctrlSpeed = document.getElementById('ctrl-speed');

    var valSize = document.getElementById('val-size');
    var valWeight = document.getElementById('val-weight');
    var valAmplitude = document.getElementById('val-amplitude');
    var valSpeed = document.getElementById('val-speed');

    // === State ===

    var state = {
        text: 'Typo Morph',
        mode: 'elastic',
        field: 'repel',
        palette: 'nebula',
        fontSize: 80,
        fontWeight: 300,
        amplitude: 55,
        speed: 45,
        mouseX: -9999,
        mouseY: -9999,
        stageRect: null,
        chars: [],
        particles: [],
        rafId: null,
        startTime: performance.now(),
        explodePhase: 0,
        explodeActive: false
    };

    // === Particle System ===

    var pCtx = particleCanvas.getContext('2d');
    var PARTICLE_COUNT = 80;

    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }

    function Particle() {
        this.reset();
    }

    Particle.prototype.reset = function () {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = 1 + Math.random() * 2;
        this.baseAlpha = 0.1 + Math.random() * 0.25;
        this.alpha = this.baseAlpha;
        this.life = Math.random() * 200 + 100;
        this.maxLife = this.life;
    };

    Particle.prototype.update = function (mx, my) {
        var dx = mx - this.x;
        var dy = my - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 1) {
            var force = (200 - dist) / 200 * 0.08;
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
        }

        this.vx *= 0.98;
        this.vy *= 0.98;
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        this.alpha = this.baseAlpha * (this.life / this.maxLife);

        if (this.life <= 0 || this.x < -50 || this.x > window.innerWidth + 50 ||
            this.y < -50 || this.y > window.innerHeight + 50) {
            this.reset();
        }
    };

    Particle.prototype.draw = function (ctx, rgb) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + rgb + ',' + this.alpha.toFixed(3) + ')';
        ctx.fill();
    };

    function initParticles() {
        state.particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(new Particle());
        }
    }

    function drawParticles() {
        pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        var rgb = getComputedStyle(document.documentElement).getPropertyValue('--particle-color').trim();
        for (var i = 0; i < state.particles.length; i++) {
            state.particles[i].update(state.mouseX, state.mouseY);
            state.particles[i].draw(pCtx, rgb);
        }
    }

    // === Decorative Rings ===

    function createRings() {
        canvasRings.innerHTML = '';
        var sizes = [140, 220, 320];
        for (var i = 0; i < sizes.length; i++) {
            var ring = document.createElement('div');
            ring.className = 'morph-ring';
            ring.style.width = sizes[i] + 'px';
            ring.style.height = sizes[i] + 'px';
            ring.style.animationDelay = (i * 1.5) + 's';
            ring.style.animationDuration = (5 + i * 1.5) + 's';
            canvasRings.appendChild(ring);
        }
    }

    // === Char Class ===

    function CharSpan(index, isSpace, char) {
        this.index = index;
        this.isSpace = isSpace;
        this.char = char;
        this.el = document.createElement('span');
        this.el.className = 'char-span' + (isSpace ? ' space' : '');
        if (isSpace) {
            this.el.innerHTML = '&nbsp;';
        } else {
            this.el.textContent = char;
        }

        this.tx = 0;
        this.ty = 0;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.skewX = 0;
        this.rotateX = 0;
        this.rotateY = 0;
        this.weight = state.fontWeight;
        this.opacity = 1;

        this.forceTx = 0;
        this.forceTy = 0;
        this.forceRot = 0;

        this.originX = 0;
        this.originY = 0;

        this.ghost = null;
    }

    CharSpan.prototype.spawnGhost = function () {
        if (this.isSpace || this.ghost) return;
        var g = document.createElement('span');
        g.className = 'char-ghost';
        g.textContent = this.char;
        g.style.fontSize = state.fontSize + 'px';
        g.style.fontWeight = this.weight;
        g.style.left = '0px';
        g.style.top = '0px';
        g.style.animation = 'ghost-fade 0.6s ' + EASE + ' forwards';
        this.el.appendChild(g);
        this.ghost = g;
        var self = this;
        setTimeout(function () {
            if (g.parentNode) g.parentNode.removeChild(g);
            if (self.ghost === g) self.ghost = null;
        }, 600);
    };

    CharSpan.prototype.applyStyle = function () {
        var s = this.el.style;
        s.fontSize = state.fontSize + 'px';
        s.fontWeight = this.weight;
        s.opacity = this.opacity;

        var totalTx = this.tx + this.forceTx;
        var totalTy = this.ty + this.forceTy;
        var totalRot = this.rotation + this.forceRot;

        s.transform = 'translate3d(' + totalTx.toFixed(2) + 'px,' + totalTy.toFixed(2) + 'px,0)' +
            ' rotate(' + totalRot.toFixed(2) + 'deg)' +
            ' rotateX(' + this.rotateX.toFixed(2) + 'deg)' +
            ' rotateY(' + this.rotateY.toFixed(2) + 'deg)' +
            ' scaleX(' + this.scaleX.toFixed(3) + ')' +
            ' scaleY(' + this.scaleY.toFixed(3) + ')' +
            ' skewX(' + this.skewX.toFixed(2) + 'deg)';
    };

    CharSpan.prototype.dampForce = function () {
        this.forceTx *= 0.88;
        this.forceTy *= 0.88;
        this.forceRot *= 0.88;
    };

    // === Render Characters ===

    function renderChars() {
        typoDisplay.innerHTML = '';
        state.chars = [];

        var text = state.text;
        for (var i = 0; i < text.length; i++) {
            var isSpace = text[i] === ' ';
            var c = new CharSpan(i, isSpace, text[i]);
            c.el.style.animation = 'char-enter 0.55s ' + EASE + ' ' + (i * 35) + 'ms both';
            typoDisplay.appendChild(c.el);
            state.chars.push(c);
        }
    }

    // === Morph Modes ===

    function calcElastic(c, t, amp, spd) {
        var phase = c.index * 0.5 + t * spd * 0.003;
        var spring = Math.sin(phase) * Math.exp(-0.05 * ((t * spd * 0.001) % 3));

        c.ty = spring * amp * 0.8;
        c.tx = Math.cos(phase * 0.6) * amp * 0.2;
        c.rotation = Math.sin(phase + 0.8) * amp * 0.12;
        c.scaleX = 1 + Math.sin(phase * 1.2) * amp * 0.003;
        c.scaleY = 1 - Math.sin(phase * 1.2) * amp * 0.003;
        c.skewX = Math.sin(phase * 0.4) * amp * 0.06;
        c.rotateX = Math.sin(phase * 0.7) * amp * 0.08;
        c.rotateY = Math.cos(phase * 0.5) * amp * 0.08;
        c.weight = state.fontWeight + Math.round(Math.sin(phase) * amp * 0.7);
        c.opacity = 0.7 + 0.3 * ((Math.sin(phase * 0.8) + 1) / 2);
    }

    function calcCrystal(c, t, amp, spd) {
        var idx = c.index;
        var phase = t * spd * 0.002;
        var isEven = idx % 2 === 0;
        var direction = isEven ? 1 : -1;

        var angle = phase + idx * 0.7;
        var snapAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        var lerp = 0.15;
        var currentAngle = angle * (1 - lerp) + snapAngle * lerp;

        c.tx = Math.cos(currentAngle) * amp * 0.35 * direction;
        c.ty = Math.sin(currentAngle) * amp * 0.25 * direction;
        c.rotation = Math.round(Math.sin(phase + idx) * amp * 0.1 / 15) * 15;
        c.scaleX = 0.9 + 0.2 * ((Math.sin(phase * 2 + idx * 0.5) + 1) / 2);
        c.scaleY = 0.9 + 0.2 * ((Math.cos(phase * 2 + idx * 0.5) + 1) / 2);
        c.skewX = Math.round(Math.sin(phase + idx * 1.3) * amp * 0.03);
        c.rotateX = Math.round(Math.sin(phase * 0.5) * amp * 0.1 / 10) * 10;
        c.rotateY = Math.round(Math.cos(phase * 0.5) * amp * 0.1 / 10) * 10;
        c.weight = state.fontWeight + Math.round(((Math.sin(idx * 2.3) + 1) / 2) * amp * 0.6);
        c.opacity = 0.6 + 0.4 * ((Math.cos(phase + idx * 0.9) + 1) / 2);
    }

    function calcVortex(c, t, amp, spd) {
        var centerIdx = state.chars.length / 2;
        var distFromCenter = c.index - centerIdx;
        var phase = t * spd * 0.0025;

        var angle = phase + distFromCenter * 0.4;
        var radius = Math.abs(distFromCenter) * amp * 0.04 + amp * 0.1;

        c.tx = Math.cos(angle) * radius;
        c.ty = Math.sin(angle) * radius * 0.6;
        c.rotation = angle * (180 / Math.PI) * 0.3;
        c.scaleX = 1 + Math.sin(angle * 2) * amp * 0.003;
        c.scaleY = 1 + Math.cos(angle * 2) * amp * 0.003;
        c.skewX = Math.sin(angle) * amp * 0.08;
        c.rotateX = Math.sin(angle + phase) * amp * 0.06;
        c.rotateY = Math.cos(angle + phase) * amp * 0.06;
        c.weight = state.fontWeight + Math.round(Math.sin(angle * 0.5) * amp * 0.5);
        c.opacity = 0.55 + 0.45 * ((Math.cos(angle * 0.3) + 1) / 2);
    }

    function calcPulse(c, t, amp, spd) {
        var phase = t * spd * 0.002;
        var delay = c.index * 0.2;
        var localPhase = phase - delay;

        var pulse = (Math.sin(localPhase * 2) + 1) / 2;
        var pulseDir = Math.sin(localPhase * 2);

        c.tx = pulseDir * amp * 0.15;
        c.ty = pulseDir * amp * -0.25;
        c.rotation = Math.sin(localPhase) * amp * 0.04;
        c.scaleX = 1 + pulse * amp * 0.006;
        c.scaleY = 1 - pulse * amp * 0.004;
        c.skewX = 0;
        c.rotateX = pulse * amp * 0.05;
        c.rotateY = -pulse * amp * 0.05;
        c.weight = state.fontWeight + Math.round(pulse * amp * 1.0);
        c.opacity = 0.5 + pulse * 0.5;
    }

    function calcShatter(c, t, amp, spd) {
        var seed = c.index * 97.31;
        var phase = t * spd * 0.001;

        var baseAngle = (seed % (Math.PI * 2)) + phase * 0.3;
        var drift = amp * 0.5 * Math.sin(seed + phase);

        c.tx = Math.cos(baseAngle) * drift;
        c.ty = Math.sin(baseAngle) * drift * 0.7;
        c.rotation = ((seed * 3.7) % 1 - 0.5) * amp * 0.3;
        c.scaleX = 0.7 + 0.3 * ((Math.sin(seed + phase * 1.3) + 1) / 2);
        c.scaleY = 0.7 + 0.3 * ((Math.cos(seed + phase * 0.9) + 1) / 2);
        c.skewX = ((seed * 1.3) % 1 - 0.5) * amp * 0.15;
        c.rotateX = ((seed * 2.1) % 1 - 0.5) * amp * 0.2;
        c.rotateY = ((seed * 1.7) % 1 - 0.5) * amp * 0.2;
        c.weight = state.fontWeight + Math.round(((Math.sin(seed * 0.5 + phase) + 1) / 2) * amp * 0.8);
        c.opacity = 0.35 + 0.65 * ((Math.cos(seed + phase * 1.5) + 1) / 2);
    }

    var modeFns = {
        elastic: calcElastic,
        crystal: calcCrystal,
        vortex: calcVortex,
        pulse: calcPulse,
        shatter: calcShatter
    };

    // === Cursor Force Field ===

    function applyForceField(c) {
        if (!state.stageRect || c.isSpace) return;

        var rect = c.el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var dx = state.mouseX - cx;
        var dy = state.mouseY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);

        var radius = 180;
        if (dist > radius || dist < 1) return;

        var strength = (1 - dist / radius);
        var force = strength * strength * 25;

        if (state.field === 'repel') {
            c.forceTx += (-dx / dist) * force;
            c.forceTy += (-dy / dist) * force;
            c.forceRot += strength * 8 * (dx > 0 ? 1 : -1);
        } else if (state.field === 'attract') {
            c.forceTx += (dx / dist) * force * 0.5;
            c.forceTy += (dy / dist) * force * 0.5;
            c.forceRot += strength * -5 * (dx > 0 ? 1 : -1);
        } else if (state.field === 'orbit') {
            var perpX = -dy / dist;
            var perpY = dx / dist;
            c.forceTx += perpX * force * 0.8;
            c.forceTy += perpY * force * 0.8;
            c.forceRot += strength * 12;
        }
    }

    // === Explode Effect ===

    function triggerExplode() {
        state.explodeActive = true;
        state.explodePhase = 1;

        var center = state.chars.length / 2;
        for (var i = 0; i < state.chars.length; i++) {
            var c = state.chars[i];
            if (c.isSpace) continue;

            var distFromCenter = i - center;
            var angle = distFromCenter * 0.6 + (Math.random() - 0.5) * 0.5;
            var power = 80 + Math.random() * 120;

            c.forceTx = Math.cos(angle) * power;
            c.forceTy = Math.sin(angle) * power;
            c.forceRot = (Math.random() - 0.5) * 60;
            c.spawnGhost();
        }

        createPulseRing();
    }

    function createPulseRing() {
        var ring = document.createElement('div');
        ring.style.cssText = 'position:absolute;top:50%;left:50%;width:80px;height:80px;' +
            'border:2px solid var(--accent);border-radius:50%;pointer-events:none;' +
            'transform:translate(-50%,-50%) scale(0.5);opacity:0.8;' +
            'animation:pulse-ring 0.8s ' + EASE + ' forwards;z-index:10;';
        typoCanvas.appendChild(ring);
        setTimeout(function () {
            if (ring.parentNode) ring.parentNode.removeChild(ring);
        }, 800);
    }

    // === Scramble Reveal ===

    function scrambleReveal(text) {
        var chars = state.chars;
        var maxIdx = text.length;

        function frame(iteration) {
            for (var i = 0; i < maxIdx; i++) {
                if (chars[i] && !chars[i].isSpace) {
                    if (i < iteration) {
                        chars[i].el.textContent = text[i];
                        chars[i].char = text[i];
                    } else {
                        chars[i].el.textContent = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                    }
                }
            }
            if (iteration < maxIdx) {
                setTimeout(function () { frame(iteration + 1); }, 45);
            }
        }
        frame(0);
    }

    // === Animation Loop ===

    function tick(now) {
        var t = (now - state.startTime) / 1000;
        var amp = state.amplitude;
        var spd = state.speed;
        var fn = modeFns[state.mode] || calcElastic;

        for (var i = 0; i < state.chars.length; i++) {
            var c = state.chars[i];
            if (c.isSpace) continue;

            fn(c, t, amp, spd);
            applyForceField(c);
            c.dampForce();
            c.applyStyle();
        }

        drawParticles();

        if (state.explodeActive) {
            state.explodePhase *= 0.94;
            if (state.explodePhase < 0.01) {
                state.explodeActive = false;
            }
        }

        state.rafId = requestAnimationFrame(tick);
    }

    // === Controls ===

    function readControls() {
        state.fontSize = parseInt(ctrlSize.value, 10);
        state.fontWeight = parseInt(ctrlWeight.value, 10);
        state.amplitude = parseInt(ctrlAmplitude.value, 10);
        state.speed = parseInt(ctrlSpeed.value, 10);

        valSize.textContent = state.fontSize;
        valWeight.textContent = state.fontWeight;
        valAmplitude.textContent = state.amplitude;
        valSpeed.textContent = state.speed;
    }

    function onModeChange(mode) {
        state.mode = mode;
        var btns = modeToggle.querySelectorAll('.mode-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].getAttribute('data-mode') === mode);
        }
    }

    function onFieldChange(field) {
        state.field = field;
        var btns = fieldToggle.querySelectorAll('.mode-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].getAttribute('data-field') === field);
        }
    }

    function onPaletteChange(palette) {
        state.palette = palette;
        document.body.className = '';
        if (palette !== 'nebula') {
            document.body.classList.add('palette-' + palette);
        }
        var btns = paletteToggle.querySelectorAll('.palette-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].getAttribute('data-palette') === palette);
        }
    }

    function onTextChange() {
        var text = inputText.value || 'Typo Morph';
        state.text = text;
        renderChars();
        scrambleReveal(text);
    }

    function onShuffle() {
        var randomMode = MODES[Math.floor(Math.random() * MODES.length)];
        onModeChange(randomMode);

        state.amplitude = 20 + Math.floor(Math.random() * 80);
        state.speed = 15 + Math.floor(Math.random() * 85);
        state.fontSize = 40 + Math.floor(Math.random() * 110);
        state.fontWeight = (Math.floor(Math.random() * 9) + 1) * 100;

        ctrlSize.value = state.fontSize;
        ctrlWeight.value = state.fontWeight;
        ctrlAmplitude.value = state.amplitude;
        ctrlSpeed.value = state.speed;
        readControls();

        var charEls = document.querySelectorAll('.char-span');
        for (var i = 0; i < charEls.length; i++) {
            charEls[i].style.animation = 'none';
            charEls[i].offsetHeight;
            charEls[i].style.animation = 'char-enter 0.5s ' + EASE + ' ' + (i * 25) + 'ms both';
        }

        triggerExplode();
    }

    function onReset() {
        inputText.value = 'Typo Morph';
        ctrlSize.value = 80;
        ctrlWeight.value = 300;
        ctrlAmplitude.value = 55;
        ctrlSpeed.value = 45;

        state.text = 'Typo Morph';
        readControls();
        onModeChange('elastic');
        onFieldChange('repel');
        onPaletteChange('nebula');
        renderChars();
    }

    // === Cursor ===

    function onMouseMove(e) {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;

        cursorGlow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%, -50%)';
        if (!cursorGlow.classList.contains('visible')) {
            cursorGlow.classList.add('visible');
        }

        state.stageRect = stage.getBoundingClientRect();
    }

    function onMouseLeave() {
        cursorGlow.classList.remove('visible');
        state.mouseX = -9999;
        state.mouseY = -9999;
    }

    function onTouchMove(e) {
        if (e.touches.length > 0) {
            state.mouseX = e.touches[0].clientX;
            state.mouseY = e.touches[0].clientY;
            state.stageRect = stage.getBoundingClientRect();
        }
    }

    function onTouchEnd() {
        state.mouseX = -9999;
        state.mouseY = -9999;
    }

    // === Char Hover Meta ===

    function showCharMeta(c) {
        charMeta.innerHTML =
            '<span>CH <span class="meta-val">' + c.char + '</span></span>' +
            '<span>INDEX <span class="meta-val">' + c.index + '</span></span>' +
            '<span>TX <span class="meta-val">' + c.tx.toFixed(1) + '</span></span>' +
            '<span>TY <span class="meta-val">' + c.ty.toFixed(1) + '</span></span>' +
            '<span>ROT <span class="meta-val">' + c.rotation.toFixed(1) + '°</span></span>' +
            '<span>W <span class="meta-val">' + Math.round(c.weight) + '</span></span>' +
            '<span>SKW <span class="meta-val">' + c.skewX.toFixed(1) + '°</span></span>';
        charMeta.classList.add('visible');
    }

    function hideCharMeta() {
        charMeta.classList.remove('visible');
    }

    // === Init ===

    function init() {
        resizeCanvas();
        initParticles();
        createRings();
        readControls();
        renderChars();
        scrambleReveal(state.text);

        state.rafId = requestAnimationFrame(tick);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd);

        window.addEventListener('resize', function () {
            resizeCanvas();
        });

        inputText.addEventListener('input', onTextChange);
        btnShuffle.addEventListener('click', onShuffle);
        btnExplode.addEventListener('click', triggerExplode);
        btnReset.addEventListener('click', onReset);

        ctrlSize.addEventListener('input', readControls);
        ctrlWeight.addEventListener('input', readControls);
        ctrlAmplitude.addEventListener('input', readControls);
        ctrlSpeed.addEventListener('input', readControls);

        modeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (btn && btn.getAttribute('data-mode')) {
                onModeChange(btn.getAttribute('data-mode'));
            }
        });

        fieldToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (btn && btn.getAttribute('data-field')) {
                onFieldChange(btn.getAttribute('data-field'));
            }
        });

        paletteToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.palette-btn');
            if (btn) {
                onPaletteChange(btn.getAttribute('data-palette'));
            }
        });

        typoDisplay.addEventListener('mouseover', function (e) {
            var charSpan = e.target.closest('.char-span');
            if (charSpan) {
                for (var i = 0; i < state.chars.length; i++) {
                    if (state.chars[i].el === charSpan) {
                        showCharMeta(state.chars[i]);
                        break;
                    }
                }
            }
        });

        typoDisplay.addEventListener('mouseout', hideCharMeta);

        document.addEventListener('keydown', function (e) {
            if (document.activeElement === inputText) return;
            if (e.key === 'r' || e.key === 'R') onReset();
            if (e.key === 's' || e.key === 'S') onShuffle();
            if (e.key === ' ') { e.preventDefault(); triggerExplode(); }
            var num = parseInt(e.key, 10);
            if (num >= 1 && num <= 5) onModeChange(MODES[num - 1]);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
