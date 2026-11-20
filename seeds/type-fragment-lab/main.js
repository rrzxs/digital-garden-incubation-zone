(function () {
    'use strict';

    // === Constants ===

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#$%&@ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var MODES = ['scatter', 'orbit', 'cascade', 'storm', 'still'];
    var FIELDS = ['repel', 'attract', 'vortex'];

    var SPRING_K = 0.045;
    var SPRING_DAMP = 0.88;
    var ROT_K = 0.06;
    var ROT_DAMP = 0.85;

    // === DOM Elements ===

    var cursorGlow = document.getElementById('cursor-glow');
    var particleCanvas = document.getElementById('particle-layer');
    var stage = document.getElementById('stage');
    var fragmentCanvas = document.getElementById('fragment-canvas');
    var fragmentDisplay = document.getElementById('fragment-display');
    var canvasRings = document.getElementById('canvas-rings');
    var fragmentMeta = document.getElementById('fragment-meta');
    var inputText = document.getElementById('input-text');
    var btnBlast = document.getElementById('btn-blast');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');
    var modeToggle = document.getElementById('mode-toggle');
    var fieldToggle = document.getElementById('field-toggle');
    var paletteToggle = document.getElementById('palette-toggle');

    var ctrlSlices = document.getElementById('ctrl-slices');
    var ctrlSize = document.getElementById('ctrl-size');
    var ctrlWeight = document.getElementById('ctrl-weight');
    var ctrlAmplitude = document.getElementById('ctrl-amplitude');

    var valSlices = document.getElementById('val-slices');
    var valSize = document.getElementById('val-size');
    var valWeight = document.getElementById('val-weight');
    var valAmplitude = document.getElementById('val-amplitude');

    // === State ===

    var state = {
        text: 'Fragment',
        mode: 'scatter',
        field: 'repel',
        palette: 'nebula',
        sliceCount: 5,
        fontSize: 96,
        fontWeight: 300,
        amplitude: 55,
        mouseX: -9999,
        mouseY: -9999,
        units: [],
        particles: [],
        startTime: performance.now()
    };

    // === Seeded Random ===

    function seeded(seed) {
        var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    // === Particle System (ambient) ===

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
            ring.className = 'fragment-ring';
            ring.style.width = sizes[i] + 'px';
            ring.style.height = sizes[i] + 'px';
            ring.style.animationDelay = (i * 1.5) + 's';
            ring.style.animationDuration = (5 + i * 1.5) + 's';
            canvasRings.appendChild(ring);
        }
    }

    // === Fragment Class ===

    function Fragment(charIndex, fragIndex, sliceCount, char) {
        this.charIndex = charIndex;
        this.fragIndex = fragIndex;
        this.sliceCount = sliceCount;
        this.char = char;
        this.seed = charIndex * 131 + fragIndex * 37 + 7;

        var bandTop = fragIndex / sliceCount * 100;
        var bandBottom = (fragIndex + 1) / sliceCount * 100;

        this.el = document.createElement('span');
        this.el.className = 'fragment' +
            (fragIndex === 0 || fragIndex === sliceCount - 1 ? ' edge-glow' : '');
        this.el.textContent = char;
        this.el.style.clipPath = 'inset(' + bandTop + '% -8% ' + (100 - bandBottom) + '% -8%)';
        this.el.style.webkitClipPath = 'inset(' + bandTop + '% -8% ' + (100 - bandBottom) + '% -8%)';

        // Physics body
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.rot = 0;
        this.vr = 0;
        this.tx = 0;
        this.ty = 0;
        this.trot = 0;

        // Cache for cursor field
        this.centerX = 0;
        this.centerY = 0;
        this.hasRect = false;
    }

    Fragment.prototype.applyStyle = function () {
        this.el.style.transform =
            'translate3d(' + this.x.toFixed(2) + 'px,' + this.y.toFixed(2) + 'px,0)' +
            ' rotate(' + this.rot.toFixed(2) + 'deg)';
    };

    Fragment.prototype.cacheRect = function () {
        var rect = this.el.getBoundingClientRect();
        this.centerX = rect.left + rect.width / 2;
        this.centerY = rect.top + rect.height / 2;
        this.hasRect = true;
    };

    // === Char Unit Class ===

    function CharUnit(index, char) {
        this.index = index;
        this.char = char;
        this.isSpace = char === ' ';
        this.fragments = [];

        this.el = document.createElement('span');
        this.el.className = 'char-unit' + (this.isSpace ? ' space' : '');
        this.el.dataset.index = index;

        if (!this.isSpace) {
            this.build();
        }
    }

    CharUnit.prototype.build = function () {
        this.el.innerHTML = '';
        this.fragments = [];
        for (var f = 0; f < state.sliceCount; f++) {
            var frag = new Fragment(this.index, f, state.sliceCount, this.char);
            this.el.appendChild(frag.el);
            this.fragments.push(frag);
        }
    };

    // === Mode Target Generators ===

    function targetScatter(frag, t, amp) {
        var s = frag.seed;
        var breathe = Math.sin(t * 0.8 + s * 6.28) * 0.15 + 1;
        var spread = amp * 1.1;

        frag.tx = (seeded(s) - 0.5) * spread * breathe;
        frag.ty = (seeded(s * 1.7) - 0.5) * spread * (2 - breathe);
        frag.trot = (seeded(s * 2.3) - 0.5) * amp * 0.7;
    }

    function targetOrbit(frag, t, amp) {
        var s = frag.seed;
        var sliceCount = frag.sliceCount;
        var angle = t * 0.9 + (frag.fragIndex / sliceCount) * Math.PI * 2 + seeded(s) * 0.6;
        var radius = amp * (0.3 + (frag.fragIndex / Math.max(1, sliceCount - 1)) * 0.65);

        frag.tx = Math.cos(angle) * radius;
        frag.ty = Math.sin(angle) * radius * 0.75;
        frag.trot = Math.sin(angle * 1.4) * amp * 0.5;
    }

    function targetCascade(frag, t, amp) {
        var s = frag.seed;
        var phase = t * 1.2 - frag.charIndex * 0.28 - frag.fragIndex * 0.45;
        var wave = Math.sin(phase);

        frag.tx = wave * amp * 0.45;
        frag.ty = (frag.fragIndex / Math.max(1, frag.sliceCount - 1) - 0.5) * amp * 1.4 +
                  Math.cos(phase * 0.6) * amp * 0.15;
        frag.trot = wave * amp * 0.35 + (seeded(s) - 0.5) * amp * 0.2;
    }

    function targetStorm(frag, t, amp) {
        var s = frag.seed;
        var a = t * 1.6 + s * 6.28;
        var b = t * 2.3 + s * 3.14;
        var turbulence = 0.55 + 0.45 * Math.sin(t * 0.7 + s * 9.4);

        frag.tx = Math.sin(a) * amp * 0.8 * turbulence + (seeded(s * 3.1) - 0.5) * amp * 0.5;
        frag.ty = Math.cos(b) * amp * 0.7 * turbulence + (seeded(s * 4.7) - 0.5) * amp * 0.5;
        frag.trot = Math.sin(a * 1.7 + b * 0.4) * amp * 1.1;
    }

    function targetStill(frag) {
        frag.tx = 0;
        frag.ty = 0;
        frag.trot = 0;
    }

    var modeFns = {
        scatter: targetScatter,
        orbit: targetOrbit,
        cascade: targetCascade,
        storm: targetStorm,
        still: targetStill
    };

    // === Cursor Force Field ===

    function applyField(frag) {
        if (!frag.hasRect) return;

        var dx = state.mouseX - frag.centerX;
        var dy = state.mouseY - frag.centerY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var radius = 160;
        if (dist > radius || dist < 1) return;

        var strength = 1 - dist / radius;
        var force = strength * strength * 2.2;

        if (state.field === 'repel') {
            frag.vx += (-dx / dist) * force;
            frag.vy += (-dy / dist) * force;
            frag.vr += strength * 1.4 * (dx > 0 ? 1 : -1);
        } else if (state.field === 'attract') {
            frag.vx += (dx / dist) * force * 0.7;
            frag.vy += (dy / dist) * force * 0.7;
            frag.vr += strength * -0.9 * (dx > 0 ? 1 : -1);
        } else {
            frag.vx += (-dy / dist) * force;
            frag.vy += (dx / dist) * force;
            frag.vr += strength * 2.0;
        }
    }

    // === Blast & Shockwave ===

    function blastAll() {
        for (var i = 0; i < state.units.length; i++) {
            var unit = state.units[i];
            for (var f = 0; f < unit.fragments.length; f++) {
                blastFragment(unit.fragments[f], 1);
            }
        }
        spawnShockRing(fragmentCanvas.offsetWidth / 2, fragmentCanvas.offsetHeight / 2);
    }

    function blastFragment(frag, power) {
        var s = frag.seed;
        var angle = seeded(s * 5.3) * Math.PI * 2;
        var impulse = (0.9 + seeded(s * 7.7) * 1.6) * power;

        frag.vx += Math.cos(angle) * impulse * 26;
        frag.vy += Math.sin(angle) * impulse * 22 - 6 * power;
        frag.vr += (seeded(s * 9.1) - 0.5) * 130 * power;
    }

    function shockwaveFrom(clientX, clientY) {
        var canvasRect = fragmentCanvas.getBoundingClientRect();
        var localX = clientX - canvasRect.left;
        var localY = clientY - canvasRect.top;

        spawnShockRing(localX, localY);

        for (var i = 0; i < state.units.length; i++) {
            var unit = state.units[i];
            for (var f = 0; f < unit.fragments.length; f++) {
                var frag = unit.fragments[f];
                if (!frag.hasRect) frag.cacheRect();

                var dx = frag.centerX - clientX;
                var dy = frag.centerY - clientY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var radius = 260;
                if (dist > radius || dist < 1) continue;

                var strength = 1 - dist / radius;
                var force = strength * strength * 46;

                frag.vx += (dx / dist) * force;
                frag.vy += (dy / dist) * force;
                frag.vr += (strength - 0.5) * 90;
            }
        }
    }

    function spawnShockRing(x, y) {
        var ring = document.createElement('div');
        ring.className = 'shock-ring';
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
        ring.style.width = '140px';
        ring.style.height = '140px';
        fragmentCanvas.appendChild(ring);
        setTimeout(function () {
            if (ring.parentNode) ring.parentNode.removeChild(ring);
        }, 900);
    }

    // === Render Units ===

    function renderUnits() {
        fragmentDisplay.innerHTML = '';
        state.units = [];

        var text = state.text;
        for (var i = 0; i < text.length; i++) {
            var unit = new CharUnit(i, text[i]);
            unit.el.style.fontSize = state.fontSize + 'px';
            unit.el.style.animation = 'unit-enter 0.55s ' + EASE + ' ' + (i * 35) + 'ms both';
            fragmentDisplay.appendChild(unit.el);
            state.units.push(unit);
        }

        requestAnimationFrame(cacheAllRects);
    }

    function cacheAllRects() {
        for (var i = 0; i < state.units.length; i++) {
            var unit = state.units[i];
            for (var f = 0; f < unit.fragments.length; f++) {
                unit.fragments[f].cacheRect();
            }
        }
    }

    // === Scramble Reveal ===

    function scrambleReveal(text) {
        var frames = Math.min(text.length + 8, 24);

        function frame(iteration) {
            for (var i = 0; i < state.units.length; i++) {
                var unit = state.units[i];
                if (unit.isSpace) continue;
                for (var f = 0; f < unit.fragments.length; f++) {
                    var frag = unit.fragments[f];
                    if (i < iteration) {
                        frag.el.textContent = unit.char;
                    } else {
                        frag.el.textContent = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                    }
                }
            }
            if (iteration < frames) {
                setTimeout(function () { frame(iteration + 1); }, 45);
            }
        }
        frame(0);
    }

    // === Animation Loop ===

    var rectCacheTimer = 0;

    function tick(now) {
        var t = (now - state.startTime) / 1000;
        var amp = state.amplitude;
        var fn = modeFns[state.mode] || targetScatter;
        var cursorActive = state.mouseX > -999;

        for (var i = 0; i < state.units.length; i++) {
            var unit = state.units[i];
            for (var f = 0; f < unit.fragments.length; f++) {
                var frag = unit.fragments[f];

                fn(frag, t, amp);

                // Spring-damper integration
                frag.vx += (frag.tx - frag.x) * SPRING_K;
                frag.vy += (frag.ty - frag.y) * SPRING_K;
                frag.vx *= SPRING_DAMP;
                frag.vy *= SPRING_DAMP;
                frag.x += frag.vx;
                frag.y += frag.vy;

                frag.vr += (frag.trot - frag.rot) * ROT_K;
                frag.vr *= ROT_DAMP;
                frag.rot += frag.vr;

                // Cursor force field
                if (cursorActive && frag.hasRect) {
                    frag.centerX += frag.vx;
                    frag.centerY += frag.vy;
                    applyField(frag);
                }

                frag.applyStyle();
            }
        }

        drawParticles();

        // Re-anchor cached rects periodically (layout may shift with amplitude)
        rectCacheTimer++;
        if (rectCacheTimer > 90) {
            rectCacheTimer = 0;
            cacheAllRects();
        }

        requestAnimationFrame(tick);
    }

    // === Meta HUD ===

    function showUnitMeta(unit) {
        var count = unit.fragments.length;
        var energy = 0;
        for (var f = 0; f < count; f++) {
            energy += Math.abs(unit.fragments[f].vx) + Math.abs(unit.fragments[f].vy);
        }
        energy = energy / Math.max(1, count);

        fragmentMeta.innerHTML =
            '<span>CH <span class="meta-val">' + unit.char + '</span></span>' +
            '<span>FRAG <span class="meta-val">' + count + '</span></span>' +
            '<span>E <span class="meta-val">' + energy.toFixed(2) + '</span></span>' +
            '<span>MODE <span class="meta-val">' + state.mode.toUpperCase() + '</span></span>';
        fragmentMeta.classList.add('visible');
    }

    function hideUnitMeta() {
        fragmentMeta.classList.remove('visible');
    }

    // === Controls ===

    function readControls() {
        state.sliceCount = parseInt(ctrlSlices.value, 10);
        state.fontSize = parseInt(ctrlSize.value, 10);
        state.fontWeight = parseInt(ctrlWeight.value, 10);
        state.amplitude = parseInt(ctrlAmplitude.value, 10);

        valSlices.textContent = state.sliceCount;
        valSize.textContent = state.fontSize;
        valWeight.textContent = state.fontWeight;
        valAmplitude.textContent = state.amplitude;

        for (var i = 0; i < state.units.length; i++) {
            state.units[i].el.style.fontSize = state.fontSize + 'px';
        }
    }

    function onSlicesChange() {
        readControls();
        for (var i = 0; i < state.units.length; i++) {
            state.units[i].build();
        }
        scrambleReveal(state.text);
        requestAnimationFrame(cacheAllRects);
    }

    function onWeightChange() {
        readControls();
        for (var i = 0; i < state.units.length; i++) {
            var unit = state.units[i];
            for (var f = 0; f < unit.fragments.length; f++) {
                unit.fragments[f].el.style.fontWeight = state.fontWeight;
            }
        }
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
        var text = inputText.value || 'Fragment';
        state.text = text;
        renderUnits();
        applyWeightToAll();
        scrambleReveal(text);
    }

    function applyWeightToAll() {
        for (var i = 0; i < state.units.length; i++) {
            var unit = state.units[i];
            for (var f = 0; f < unit.fragments.length; f++) {
                unit.fragments[f].el.style.fontWeight = state.fontWeight;
            }
        }
    }

    function onShuffle() {
        var randomMode = MODES[Math.floor(Math.random() * MODES.length)];
        onModeChange(randomMode);

        state.amplitude = 25 + Math.floor(Math.random() * 75);
        state.sliceCount = 2 + Math.floor(Math.random() * 8);
        state.fontSize = 48 + Math.floor(Math.random() * 110);
        state.fontWeight = (Math.floor(Math.random() * 9) + 1) * 100;

        ctrlSlices.value = state.sliceCount;
        ctrlSize.value = state.fontSize;
        ctrlWeight.value = state.fontWeight;
        ctrlAmplitude.value = state.amplitude;

        onSlicesChange();
        blastAll();
    }

    function onReset() {
        inputText.value = 'Fragment';
        ctrlSlices.value = 5;
        ctrlSize.value = 96;
        ctrlWeight.value = 300;
        ctrlAmplitude.value = 55;

        state.text = 'Fragment';
        onSlicesChange();
        onModeChange('scatter');
        onFieldChange('repel');
        onPaletteChange('nebula');
        scrambleReveal(state.text);
    }

    // === Cursor ===

    function onMouseMove(e) {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;

        cursorGlow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%, -50%)';
        if (!cursorGlow.classList.contains('visible')) {
            cursorGlow.classList.add('visible');
        }
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
        }
    }

    function onTouchEnd() {
        state.mouseX = -9999;
        state.mouseY = -9999;
    }

    // === Init ===

    function init() {
        resizeCanvas();
        initParticles();
        createRings();
        readControls();
        renderUnits();
        applyWeightToAll();
        scrambleReveal(state.text);

        requestAnimationFrame(tick);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd);

        window.addEventListener('resize', function () {
            resizeCanvas();
            cacheAllRects();
        });

        inputText.addEventListener('input', onTextChange);
        btnBlast.addEventListener('click', blastAll);
        btnShuffle.addEventListener('click', onShuffle);
        btnReset.addEventListener('click', onReset);

        ctrlSlices.addEventListener('input', onSlicesChange);
        ctrlSize.addEventListener('input', readControls);
        ctrlWeight.addEventListener('input', onWeightChange);
        ctrlAmplitude.addEventListener('input', readControls);

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

        stage.addEventListener('click', function (e) {
            shockwaveFrom(e.clientX, e.clientY);
        });

        fragmentDisplay.addEventListener('mouseover', function (e) {
            var unitEl = e.target.closest('.char-unit');
            if (unitEl) {
                var idx = parseInt(unitEl.dataset.index, 10);
                if (state.units[idx]) showUnitMeta(state.units[idx]);
            }
        });

        fragmentDisplay.addEventListener('mouseout', hideUnitMeta);

        document.addEventListener('keydown', function (e) {
            if (document.activeElement === inputText) return;
            if (e.key === 'r' || e.key === 'R') onReset();
            if (e.key === 's' || e.key === 'S') onShuffle();
            if (e.key === ' ') { e.preventDefault(); blastAll(); }
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
