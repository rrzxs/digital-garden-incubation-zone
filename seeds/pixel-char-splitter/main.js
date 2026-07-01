(function () {
    'use strict';

    /* ============================================================
       Pixel Char Splitter — 像素字符裂解器
       将文字采样为像素场，每个像素成为弹簧-阻尼粒子，
       在5种裂解模式与光标力场下解构与重组。
       ============================================================ */

    var EASE_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

    // === DOM Elements ===
    var pixelField = document.getElementById('pixel-field');
    var sampleCanvas = document.getElementById('sample-canvas');
    var splitCanvas = document.getElementById('split-canvas');
    var ghostText = document.getElementById('ghost-text');
    var cursorGlow = document.getElementById('cursor-glow');
    var particleCanvas = document.getElementById('particle-layer');
    var stage = document.getElementById('stage');

    var inputText = document.getElementById('input-text');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnBurst = document.getElementById('btn-burst');
    var btnReset = document.getElementById('btn-reset');
    var modeToggle = document.getElementById('mode-toggle');
    var fieldToggle = document.getElementById('field-toggle');
    var paletteToggle = document.getElementById('palette-toggle');

    var ctrlDensity = document.getElementById('ctrl-density');
    var ctrlIntensity = document.getElementById('ctrl-intensity');
    var valDensity = document.getElementById('val-density');
    var valIntensity = document.getElementById('val-intensity');

    var telPixels = document.getElementById('tel-pixels');
    var telMode = document.getElementById('tel-mode');
    var telForce = document.getElementById('tel-force');

    // === State ===
    var state = {
        text: 'PIXEL',
        mode: 'scatter',
        field: 'repel',
        palette: 'cyber',
        density: 7,
        intensity: 60,
        pixels: [],
        mouseX: -9999,
        mouseY: -9999,
        mouseInside: false,
        canvasRect: null,
        rafId: null,
        time: 0,
        burstPhase: 0,
        burstActive: false,
        recombineTimer: 0
    };

    var sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    var pCtx = particleCanvas.getContext('2d');

    // === Flow-field ambient particles ===
    var PARTICLE_COUNT = 70;
    var ambient = [];

    function resizeParticleCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }

    function AmbientParticle() { this.reset(true); }
    AmbientParticle.prototype.reset = function (initial) {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = (Math.random() - 0.5) * 0.25;
        this.radius = 0.6 + Math.random() * 1.8;
        this.baseAlpha = 0.06 + Math.random() * 0.18;
        this.life = initial ? Math.random() * 300 : 0;
        this.maxLife = 240 + Math.random() * 360;
    };
    AmbientParticle.prototype.update = function () {
        var rgb = getComputedStyle(document.body).getPropertyValue('--particle-rgb').trim() || '94,240,207';
        // gentle flow-field drift
        this.vx += (Math.random() - 0.5) * 0.02;
        this.vy += (Math.random() - 0.5) * 0.02;
        this.vx = Math.max(-0.5, Math.min(0.5, this.vx));
        this.vy = Math.max(-0.5, Math.min(0.5, this.vy));
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        if (this.life > this.maxLife || this.x < -20 || this.x > window.innerWidth + 20 ||
            this.y < -20 || this.y > window.innerHeight + 20) {
            this.reset(false);
        }
        var fade = Math.sin((this.life / this.maxLife) * Math.PI);
        pCtx.beginPath();
        pCtx.fillStyle = 'rgba(' + rgb + ',' + (this.baseAlpha * fade) + ')';
        pCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        pCtx.fill();
    };

    function initAmbient() {
        ambient = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) ambient.push(new AmbientParticle());
    }

    // === Pixel sampling: rasterize text to a pixel grid ===
    function sampleTextToPixels(text) {
        var density = state.density;
        // Clear previous pixel DOM nodes
        clearPixels();

        if (!text || !text.trim()) {
            ghostText.classList.remove('hidden');
            telPixels.textContent = '0';
            return;
        }
        ghostText.classList.add('hidden');

        // Size the sample canvas to fit text at chosen density
        var fontSize = 240;
        var fontStr = '700 ' + fontSize + 'px "Share Tech Mono", monospace';
        sCtx.font = fontStr;
        var metrics = sCtx.measureText(text);
        var w = Math.ceil(metrics.width) + 40;
        var h = Math.ceil(fontSize * 1.3);

        sampleCanvas.width = w;
        sampleCanvas.height = h;
        sCtx.clearRect(0, 0, w, h);
        sCtx.fillStyle = '#ffffff';
        sCtx.font = fontStr;
        sCtx.textBaseline = 'middle';
        sCtx.fillText(text, 20, h / 2);

        var imgData;
        try {
            imgData = sCtx.getImageData(0, 0, w, h);
        } catch (e) {
            return;
        }
        var data = imgData.data;

        // Read the target render area dimensions
        refreshCanvasRect();
        var fieldW = state.canvasRect.width;
        var fieldH = state.canvasRect.height;

        // Scale so the sampled text fits nicely within the canvas
        var sampleW = w;
        var sampleH = h;
        var scale = Math.min((fieldW * 0.82) / sampleW, (fieldH * 0.72) / sampleH);
        scale = Math.max(0.2, Math.min(scale, 1));

        var pixels = [];
        var step = Math.max(2, Math.round(18 - density)); // higher density => smaller step

        for (var y = 0; y < sampleH; y += step) {
            for (var x = 0; x < sampleW; x += step) {
                var idx = (y * w + x) * 4;
                var alpha = data[idx + 3];
                if (alpha > 128) {
                    // target home position in field coordinates (centered)
                    var homeX = (x - sampleW / 2) * scale + fieldW / 2;
                    var homeY = (y - sampleH / 2) * scale + fieldH / 2;
                    pixels.push(new Pixel(homeX, homeY));
                }
            }
        }
        state.pixels = pixels;

        // cap pixel count for performance
        var MAX = 1400;
        if (state.pixels.length > MAX) {
            state.pixels = state.pixels.slice(0, MAX);
        }

        telPixels.textContent = state.pixels.length;
        // Start in a scattered state for a satisfying reformation
        scatterAll();
    }

    // === Pixel particle (spring-damper toward home) ===
    function Pixel(homeX, homeY) {
        this.homeX = homeX;
        this.homeY = homeY;
        // start scattered
        var ang = Math.random() * Math.PI * 2;
        var dist = 200 + Math.random() * 260;
        this.x = homeX + Math.cos(ang) * dist;
        this.y = homeY + Math.sin(ang) * dist;
        this.vx = 0;
        this.vy = 0;
        this.size = Math.max(3, Math.round(state.density * 0.55) + Math.random() * 1.5);
        this.alpha = 0;
        this.targetAlpha = 0.85 + Math.random() * 0.15;
        this.phase = Math.random() * Math.PI * 2;

        var el = document.createElement('span');
        el.className = 'pixel';
        el.style.width = this.size + 'px';
        el.style.height = this.size + 'px';
        this.el = el;
        pixelField.appendChild(el);
    }

    Pixel.prototype.update = function (dt) {
        var mode = state.mode;
        var intensity = state.intensity / 100;
        var t = state.time;

        var dx = this.homeX - this.x;
        var dy = this.homeY - this.y;
        var ax = dx * 0.045;
        var ay = dy * 0.045;

        // --- Mode-specific forces ---
        if (mode === 'scatter') {
            // mild outward breathing jitter scaled by intensity
            var breath = Math.sin(t * 0.6 + this.phase) * intensity * 0.6;
            ax += Math.cos(this.phase * 3) * breath;
            ay += Math.sin(this.phase * 3) * breath;
        } else if (mode === 'orbit') {
            // pixels orbit around their home in a swirl
            var orbitR = 18 + intensity * 40;
            var orbitSpeed = 0.04 + intensity * 0.05;
            var ox = Math.cos(t * orbitSpeed + this.phase) * orbitR;
            var oy = Math.sin(t * orbitSpeed + this.phase) * orbitR;
            ax = (this.homeX + ox - this.x) * 0.04;
            ay = (this.homeY + oy - this.y) * 0.04;
        } else if (mode === 'wave') {
            // traveling sinusoidal wave displacement
            var wave = Math.sin((this.homeX * 0.03) + t * 1.4) * (40 * intensity);
            ay += (this.homeY + wave - this.y) * 0.02 - this.vy * 0.04;
            ax *= 1.4;
        } else if (mode === 'shatter') {
            // strong outward push that slowly recovers
            var shatterForce = intensity * 1.8;
            var sdx = this.x - this.homeX;
            var sdy = this.y - this.homeY;
            var sdist = Math.sqrt(sdx * sdx + sdy * sdy) + 0.001;
            ax -= (sdx / sdist) * shatterForce * 0.02;
            ay -= (sdy / sdist) * shatterForce * 0.02;
        } else if (mode === 'dissolve') {
            // rise upward and fade, then respawn at home
            ay -= 0.05 * intensity;
            ax += Math.sin(t * 2 + this.phase) * 0.04 * intensity;
            this.alpha -= 0.006 * intensity;
            if (this.alpha <= 0) {
                this.x = this.homeX + (Math.random() - 0.5) * 30;
                this.y = this.homeY + 60 + Math.random() * 60;
                this.vx = 0; this.vy = 0;
                this.alpha = this.targetAlpha;
            }
        }

        // --- Cursor force field ---
        if (state.field !== 'none' && state.mouseInside) {
            var mdx = this.x - state.mouseX;
            var mdy = this.y - state.mouseY;
            var mdist2 = mdx * mdx + mdy * mdy;
            var radius = 140;
            if (mdist2 < radius * radius && mdist2 > 0.5) {
                var mdist = Math.sqrt(mdist2);
                var falloff = 1 - mdist / radius;
                var dir = state.field === 'attract' ? -1 : 1;
                var strength = falloff * falloff * 3.2;
                ax += dir * (mdx / mdist) * strength;
                ay += dir * (mdy / mdist) * strength;
            }
        }

        // --- Burst shockwave push ---
        if (state.burstActive) {
            var bdx = this.x - state.burstX;
            var bdy = this.y - state.burstY;
            var bdist2 = bdx * bdx + bdy * bdy;
            if (bdist2 < 300 * 300 && bdist2 > 0.5) {
                var bdist = Math.sqrt(bdist2);
                var power = (1 - bdist / 300) * state.burstPhase * 8;
                ax += (bdx / bdist) * power;
                ay += (bdy / bdist) * power;
            }
        }

        // spring integration with damping
        this.vx = (this.vx + ax) * 0.86;
        this.vy = (this.vy + ay) * 0.86;
        this.x += this.vx;
        this.y += this.vy;

        // alpha easing toward target (except dissolve which manages its own)
        if (mode !== 'dissolve') {
            this.alpha += (this.targetAlpha - this.alpha) * 0.08;
        }
    };

    Pixel.prototype.render = function () {
        var el = this.el;
        el.style.transform = 'translate3d(' + this.x.toFixed(1) + 'px,' + this.y.toFixed(1) + 'px,0)';
        el.style.opacity = this.alpha.toFixed(3);
    };

    // === Scattering helpers ===
    function scatterAll() {
        for (var i = 0; i < state.pixels.length; i++) {
            var p = state.pixels[i];
            var ang = Math.random() * Math.PI * 2;
            var dist = 180 + Math.random() * 280;
            p.x = p.homeX + Math.cos(ang) * dist;
            p.y = p.homeY + Math.sin(ang) * dist;
            p.vx = (Math.random() - 0.5) * 2;
            p.vy = (Math.random() - 0.5) * 2;
            p.alpha = 0;
        }
    }

    function clearPixels() {
        for (var i = 0; i < state.pixels.length; i++) {
            var p = state.pixels[i];
            if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        }
        state.pixels = [];
    }

    // === Burst / Shockwave ===
    function triggerBurst(x, y) {
        refreshCanvasRect();
        if (x === undefined) {
            x = state.canvasRect.width / 2;
            y = state.canvasRect.height / 2;
        }
        state.burstX = x;
        state.burstY = y;
        state.burstActive = true;
        state.burstPhase = 1;

        // visual shockwave ring
        var ring = document.createElement('span');
        ring.className = 'shockwave';
        ring.style.left = (x - 10) + 'px';
        ring.style.top = (y - 10) + 'px';
        ring.style.width = '20px';
        ring.style.height = '20px';
        pixelField.appendChild(ring);
        setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 950);

        // give pixels an initial outward kick
        for (var i = 0; i < state.pixels.length; i++) {
            var p = state.pixels[i];
            var dx = p.x - x;
            var dy = p.y - y;
            var d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            var force = Math.max(0, 1 - d / 300) * 14;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
        }

        // decay burst phase
        var start = performance.now();
        function decay() {
            var elapsed = (performance.now() - start) / 600;
            state.burstPhase = Math.max(0, 1 - elapsed);
            if (state.burstPhase <= 0) {
                state.burstActive = false;
            } else {
                requestAnimationFrame(decay);
            }
        }
        decay();
    }

    // === Main render loop ===
    var lastT = performance.now();
    function loop(now) {
        var dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        state.time += dt;

        // ambient particles
        pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        for (var i = 0; i < ambient.length; i++) ambient[i].update();

        // update pixels
        var px = state.pixels;
        for (var j = 0; j < px.length; j++) {
            px[j].update(dt);
            px[j].render();
        }

        state.rafId = requestAnimationFrame(loop);
    }

    // === Layout ===
    function refreshCanvasRect() {
        var r = pixelField.getBoundingClientRect();
        // store width/height; positions are relative to pixelField origin
        state.canvasRect = { width: r.width, height: r.height };
    }

    function relayout() {
        resizeParticleCanvas();
        refreshCanvasRect();
        sampleTextToPixels(state.text);
    }

    // === Event bindings ===
    function bindEvents() {
        // Text input (debounced re-sampling)
        var typingTimer = null;
        inputText.addEventListener('input', function () {
            state.text = inputText.value.toUpperCase();
            clearTimeout(typingTimer);
            typingTimer = setTimeout(function () {
                sampleTextToPixels(state.text);
            }, 220);
        });

        // Cursor glow + position (relative to pixel field)
        document.addEventListener('mousemove', function (e) {
            cursorGlow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
            var r = pixelField.getBoundingClientRect();
            var lx = e.clientX - r.left;
            var ly = e.clientY - r.top;
            var inside = lx >= 0 && lx <= r.width && ly >= 0 && ly <= r.height;
            if (inside) {
                state.mouseX = lx;
                state.mouseY = ly;
                state.mouseInside = true;
                cursorGlow.classList.add('active');
            } else {
                state.mouseInside = false;
                cursorGlow.classList.remove('active');
            }
        });
        document.addEventListener('mouseleave', function () {
            state.mouseInside = false;
            cursorGlow.classList.remove('active');
        });

        // Click on canvas => burst at cursor
        splitCanvas.addEventListener('click', function (e) {
            var r = pixelField.getBoundingClientRect();
            triggerBurst(e.clientX - r.left, e.clientY - r.top);
        });

        // Buttons
        btnShuffle.addEventListener('click', function () {
            scatterAll();
            flashTel();
        });
        btnBurst.addEventListener('click', function () {
            triggerBurst();
            flashTel();
        });
        btnReset.addEventListener('click', function () {
            state.mode = 'scatter';
            state.field = 'repel';
            state.intensity = 60;
            state.density = 7;
            ctrlDensity.value = 7;
            ctrlIntensity.value = 60;
            valDensity.textContent = '7';
            valIntensity.textContent = '60';
            inputText.value = 'PIXEL';
            state.text = 'PIXEL';
            syncActiveButton(modeToggle, '[data-mode="scatter"]');
            syncActiveButton(fieldToggle, '[data-field="repel"]');
            sampleTextToPixels(state.text);
            updateTel();
        });

        // Mode toggle
        modeToggle.addEventListener('click', function (e) {
            var b = e.target.closest('.mode-btn');
            if (!b) return;
            state.mode = b.getAttribute('data-mode');
            syncActiveButton(modeToggle, b);
            updateTel();
        });

        // Field toggle
        fieldToggle.addEventListener('click', function (e) {
            var b = e.target.closest('.mode-btn');
            if (!b) return;
            state.field = b.getAttribute('data-field');
            syncActiveButton(fieldToggle, b);
            updateTel();
        });

        // Palette toggle
        paletteToggle.addEventListener('click', function (e) {
            var b = e.target.closest('.palette-btn');
            if (!b) return;
            state.palette = b.getAttribute('data-palette');
            document.body.className = 'palette-' + state.palette;
            syncActiveButton(paletteToggle, b);
        });

        // Sliders
        ctrlDensity.addEventListener('input', function () {
            state.density = parseInt(ctrlDensity.value, 10);
            valDensity.textContent = state.density;
            // re-sample with new density (debounced)
            clearTimeout(typingTimer);
            typingTimer = setTimeout(function () {
                sampleTextToPixels(state.text);
            }, 60);
        });
        ctrlIntensity.addEventListener('input', function () {
            state.intensity = parseInt(ctrlIntensity.value, 10);
            valIntensity.textContent = state.intensity;
            updateTel();
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', function (e) {
            if (document.activeElement === inputText) return;
            if (e.code === 'Space') { e.preventDefault(); triggerBurst(); flashTel(); }
            else if (e.key === 's' || e.key === 'S') { scatterAll(); flashTel(); }
            else if (e.key === 'r' || e.key === 'R') { btnReset.click(); }
        });

        // Resize
        var resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(relayout, 180);
        });
    }

    function syncActiveButton(container, target) {
        var el = typeof target === 'string' ? container.querySelector(target) : target;
        var btns = container.querySelectorAll('.mode-btn, .palette-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        if (el) el.classList.add('active');
    }

    function updateTel() {
        telMode.textContent = state.mode.toUpperCase();
        telForce.textContent = (state.intensity / 100).toFixed(1);
    }

    function flashTel() {
        telPixels.style.color = 'var(--accent-secondary)';
        setTimeout(function () { telPixels.style.color = ''; }, 350);
    }

    // === Boot ===
    function boot() {
        resizeParticleCanvas();
        initAmbient();
        bindEvents();
        refreshCanvasRect();
        updateTel();
        // wait for fonts to settle before first sample
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () {
                sampleTextToPixels(state.text);
            });
        } else {
            setTimeout(function () { sampleTextToPixels(state.text); }, 300);
        }
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
