(function () {
    'use strict';

    // === Simplex Noise (compact) ===
    var SimplexNoise = (function () {
        var F2 = 0.5 * (Math.sqrt(3) - 1);
        var G2 = (3 - Math.sqrt(3)) / 6;
        var grad3 = [
            [1,1],[-1,1],[1,-1],[-1,-1],
            [1,0],[-1,0],[0,1],[0,-1]
        ];

        function buildPerm(seed) {
            var p = [];
            for (var i = 0; i < 256; i++) p[i] = i;
            for (var i = 255; i > 0; i--) {
                seed = (seed * 16807 + 11) % 2147483647;
                var j = seed % (i + 1);
                var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
            }
            var perm = [];
            for (var i = 0; i < 512; i++) perm[i] = p[i & 255];
            return perm;
        }

        function dot2(g, x, y) { return g[0] * x + g[1] * y; }

        return function (seed) {
            var perm = buildPerm(seed || 42);
            return function noise2D(xin, yin) {
                var s = (xin + yin) * F2;
                var i = Math.floor(xin + s);
                var j = Math.floor(yin + s);
                var t = (i + j) * G2;
                var x0 = xin - (i - t);
                var y0 = yin - (j - t);
                var i1, j1;
                if (x0 > y0) { i1 = 1; j1 = 0; }
                else { i1 = 0; j1 = 1; }
                var x1 = x0 - i1 + G2;
                var y1 = y0 - j1 + G2;
                var x2 = x0 - 1 + 2 * G2;
                var y2 = y0 - 1 + 2 * G2;
                var ii = i & 255;
                var jj = j & 255;
                var gi0 = perm[ii + perm[jj]] % 8;
                var gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
                var gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
                var n0, n1, n2;
                var t0 = 0.5 - x0 * x0 - y0 * y0;
                if (t0 < 0) n0 = 0;
                else { t0 *= t0; n0 = t0 * t0 * dot2(grad3[gi0], x0, y0); }
                var t1 = 0.5 - x1 * x1 - y1 * y1;
                if (t1 < 0) n1 = 0;
                else { t1 *= t1; n1 = t1 * t1 * dot2(grad3[gi1], x1, y1); }
                var t2 = 0.5 - x2 * x2 - y2 * y2;
                if (t2 < 0) n2 = 0;
                else { t2 *= t2; n2 = t2 * t2 * dot2(grad3[gi2], x2, y2); }
                return 70 * (n0 + n1 + n2);
            };
        };
    })();

    // === DOM ===
    var DOM = {
        main: document.getElementById('main-content'),
        progressFill: document.getElementById('progress-fill'),
        sectionDots: document.getElementById('section-dots'),
        cursorGlow: document.getElementById('cursor-glow'),
        transitionFlash: document.getElementById('transition-flash'),
        rippleCanvas: document.getElementById('ripple-field'),
        themeSwitcher: document.getElementById('theme-switcher'),
        morphPath: document.getElementById('morph-path'),
        morphLabel: document.getElementById('morph-label'),
        chromaticText: document.getElementById('chromatic-text'),
        elasticGrid: document.getElementById('elastic-grid'),
        speedBar: document.getElementById('speed-bar'),
        scenes: document.querySelectorAll('.scene'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        distortElements: document.querySelectorAll('[data-distort]')
    };

    // === State ===
    var State = {
        currentIndex: 0,
        mouseX: 0,
        mouseY: 0,
        smoothX: 0,
        smoothY: 0,
        scrollSpeed: 0,
        scrollVelocity: 0,
        lastScrollY: 0,
        lastScrollTime: 0,
        noise: SimplexNoise(137),
        time: 0,
        rafId: null,
        ripplePoints: [],
        morphPhase: 0,
        elasticSprings: [],
        chromaticOffset: 0
    };

    // === Config ===
    var Config = {
        rippleResolution: 6,
        rippleDamping: 0.96,
        rippleRefraction: 0.6,
        mouseInfluenceRadius: 200,
        lerpFactor: 0.08,
        observerThreshold: 0.3,
        observerRootMargin: '-10% 0px -10% 0px',
        morphSegments: 64,
        morphBaseRadius: 130,
        morphNoiseAmp: 35,
        morphNoiseFreq: 0.025,
        chromaticMaxOffset: 12,
        elasticStiffness: 0.08,
        elasticDamping: 0.85,
        distortMaxRotation: 2.5,
        distortMaxScale: 0.03
    };

    // === Init ===
    function init() {
        createSectionDots();
        setupIntersectionObserver();
        setupScrollTracking();
        setupCursorGlow();
        setupThemeSwitcher();
        setupKeyboardNav();
        initRippleField();
        initElasticSprings();
        revealFirstScene();
        startLoop();
    }

    // === Section Navigation ===
    function createSectionDots() {
        for (var i = 0; i < DOM.scenes.length; i++) {
            var dot = document.createElement('div');
            dot.className = 'section-dot' + (i === 0 ? ' active' : '');
            dot.dataset.index = i;
            dot.setAttribute('role', 'button');
            dot.setAttribute('tabindex', '0');
            (function (idx) {
                dot.addEventListener('click', function () { scrollToScene(idx); });
                dot.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToScene(idx); }
                });
            })(i);
            DOM.sectionDots.appendChild(dot);
        }
    }

    function scrollToScene(index) {
        if (index < 0 || index >= DOM.scenes.length) return;
        DOM.scenes[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function setupIntersectionObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var idx = parseInt(entry.target.dataset.section);
                if (entry.isIntersecting) activateScene(idx);
            });
        }, {
            rootMargin: Config.observerRootMargin,
            threshold: Config.observerThreshold
        });
        DOM.scenes.forEach(function (s) { observer.observe(s); });
    }

    function activateScene(index) {
        if (State.currentIndex === index) return;
        State.currentIndex = index;
        updateSectionDots(index);
        triggerTransitionFlash();
        revealSceneContent(index);
    }

    function updateSectionDots(activeIdx) {
        var dots = DOM.sectionDots.querySelectorAll('.section-dot');
        dots.forEach(function (d, i) { d.classList.toggle('active', i === activeIdx); });
    }

    function triggerTransitionFlash() {
        DOM.transitionFlash.classList.add('flash');
        setTimeout(function () { DOM.transitionFlash.classList.remove('flash'); }, 200);
    }

    function revealSceneContent(index) {
        var scene = DOM.scenes[index];
        if (!scene) return;
        var cards = scene.querySelectorAll('.glass-card');
        cards.forEach(function (card) {
            card.classList.add('is-visible');
            var lines = card.querySelectorAll('.distort-text .line');
            lines.forEach(function (line) {
                var delay = parseInt(line.parentElement.dataset.delay || line.dataset.delay || 0);
                line.style.transitionDelay = delay + 'ms';
            });
        });
    }

    function revealFirstScene() {
        setTimeout(function () { revealSceneContent(0); }, 300);
    }

    // === Scroll Tracking ===
    function setupScrollTracking() {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var now = performance.now();
                    var dt = now - State.lastScrollTime;
                    if (dt > 0) {
                        var delta = Math.abs(window.scrollY - State.lastScrollY);
                        State.scrollVelocity = delta / dt * 16;
                        State.scrollSpeed = Math.min(State.scrollVelocity / 8, 1);
                    }
                    State.lastScrollY = window.scrollY;
                    State.lastScrollTime = now;

                    var scrollTop = window.scrollY;
                    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                    DOM.progressFill.style.height = Math.min(100, progress) + '%';

                    DOM.speedBar.style.height = (State.scrollSpeed * 100) + '%';

                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // === Cursor Glow ===
    function setupCursorGlow() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
        document.addEventListener('mousemove', function (e) {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
            DOM.cursorGlow.classList.add('visible');
        });
        document.addEventListener('mouseleave', function () {
            DOM.cursorGlow.classList.remove('visible');
        });
    }

    // === Theme Switcher ===
    function setupThemeSwitcher() {
        DOM.themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', theme);
                DOM.themeBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.theme === theme); });
                triggerTransitionFlash();
            });
        });
    }

    // === Keyboard Navigation ===
    function setupKeyboardNav() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                scrollToScene(Math.min(State.currentIndex + 1, DOM.scenes.length - 1));
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                scrollToScene(Math.max(State.currentIndex - 1, 0));
            }
        });
    }

    // === Ripple Field (Canvas) ===
    function initRippleField() {
        var canvas = DOM.rippleCanvas;
        var cols = Math.ceil(window.innerWidth / Config.rippleResolution);
        var rows = Math.ceil(window.innerHeight / Config.rippleResolution);

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        State.rippleCols = cols;
        State.rippleRows = rows;
        State.rippleCurrent = new Float32Array(cols * rows);
        State.ripplePrevious = new Float32Array(cols * rows);

        window.addEventListener('resize', function () {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            cols = Math.ceil(window.innerWidth / Config.rippleResolution);
            rows = Math.ceil(window.innerHeight / Config.rippleResolution);
            State.rippleCols = cols;
            State.rippleRows = rows;
            State.rippleCurrent = new Float32Array(cols * rows);
            State.ripplePrevious = new Float32Array(cols * rows);
        });
    }

    function addRippleAt(x, y, strength) {
        var col = Math.floor(x / Config.rippleResolution);
        var row = Math.floor(y / Config.rippleResolution);
        var cols = State.rippleCols;
        var rows = State.rippleRows;
        var radius = 3;
        for (var dy = -radius; dy <= radius; dy++) {
            for (var dx = -radius; dx <= radius; dx++) {
                var c = col + dx;
                var r = row + dy;
                if (c >= 0 && c < cols && r >= 0 && r < rows) {
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius) {
                        State.rippleCurrent[r * cols + c] += strength * (1 - dist / radius);
                    }
                }
            }
        }
    }

    function propagateRipples() {
        var cols = State.rippleCols;
        var rows = State.rippleRows;
        var curr = State.rippleCurrent;
        var prev = State.ripplePrevious;
        var damping = Config.rippleDamping;
        var temp = new Float32Array(cols * rows);

        for (var y = 1; y < rows - 1; y++) {
            for (var x = 1; x < cols - 1; x++) {
                var i = y * cols + x;
                temp[i] = (
                    curr[i - 1] + curr[i + 1] +
                    curr[i - cols] + curr[i + cols]
                ) / 2 - prev[i];
                temp[i] *= damping;
            }
        }

        State.ripplePrevious = curr;
        State.rippleCurrent = temp;
    }

    function drawRipples() {
        var canvas = DOM.rippleCanvas;
        var ctx = canvas.getContext('2d');
        var cols = State.rippleCols;
        var rows = State.rippleRows;
        var res = Config.rippleResolution;
        var curr = State.rippleCurrent;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var style = getComputedStyle(document.documentElement);
        var accentColor = style.getPropertyValue('--particle-color').trim();

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var val = curr[y * cols + x];
                if (Math.abs(val) < 0.3) continue;

                var alpha = Math.min(Math.abs(val) / 8, 0.35);
                var px = x * res;
                var py = y * res;

                var offsetX = 0;
                if (x > 0 && x < cols - 1) {
                    offsetX = (curr[y * cols + x - 1] - curr[y * cols + x + 1]) * Config.rippleRefraction;
                }

                ctx.beginPath();
                ctx.arc(px + offsetX, py, res * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = accentColor.replace(/[\d.]+\)$/, alpha + ')');
                ctx.fill();
            }
        }
    }

    // === Morph Shape ===
    function updateMorphShape(time, speed) {
        if (!DOM.morphPath) return;

        var segments = Config.morphSegments;
        var baseR = Config.morphBaseRadius;
        var noiseAmp = Config.morphNoiseAmp * (1 + speed * 3);
        var noiseFreq = Config.morphNoiseFreq;
        var cx = 200;
        var cy = 200;

        var pathData = '';
        for (var i = 0; i <= segments; i++) {
            var angle = (i / segments) * Math.PI * 2;
            var nx = Math.cos(angle) * noiseFreq * 10 + time * 0.0003;
            var ny = Math.sin(angle) * noiseFreq * 10 + time * 0.0003;
            var noiseVal = State.noise(nx, ny);
            var r = baseR + noiseVal * noiseAmp;

            var x = cx + Math.cos(angle) * r;
            var y = cy + Math.sin(angle) * r;

            if (i === 0) {
                pathData += 'M ' + x.toFixed(2) + ' ' + y.toFixed(2);
            } else {
                pathData += ' L ' + x.toFixed(2) + ' ' + y.toFixed(2);
            }
        }
        pathData += ' Z';
        DOM.morphPath.setAttribute('d', pathData);

        var blur = Math.min(speed * 4, 3);
        var blurFilter = document.querySelector('#morph-blur feGaussianBlur');
        if (blurFilter) blurFilter.setAttribute('stdDeviation', blur);

        var labels = ['CIRCLE', 'STAR', 'CRYSTAL', 'FLUX', 'ORGANISM', 'VOID', 'AURA'];
        var labelIdx = Math.floor(time / 4000) % labels.length;
        if (DOM.morphLabel) DOM.morphLabel.textContent = labels[labelIdx];
    }

    // === Chromatic Aberration ===
    function updateChromatic(speed) {
        if (!DOM.chromaticText) return;

        var offset = speed * Config.chromaticMaxOffset;
        var chrR = DOM.chromaticText.querySelector('.chr-r');
        var chrG = DOM.chromaticText.querySelector('.chr-g');
        var chrB = DOM.chromaticText.querySelector('.chr-b');

        if (chrR) chrR.style.transform = 'translate(' + (-offset).toFixed(2) + 'px, ' + (offset * 0.3).toFixed(2) + 'px)';
        if (chrG) chrG.style.transform = 'translate(' + (offset * 0.2).toFixed(2) + 'px, ' + (-offset * 0.5).toFixed(2) + 'px)';
        if (chrB) chrB.style.transform = 'translate(' + offset.toFixed(2) + 'px, ' + (offset * 0.4).toFixed(2) + 'px)';
    }

    // === Elastic Springs ===
    function initElasticSprings() {
        var cells = DOM.elasticGrid ? DOM.elasticGrid.querySelectorAll('.elastic-cell') : [];
        cells.forEach(function (cell) {
            State.elasticSprings.push({
                el: cell,
                intensity: parseFloat(cell.dataset.intensity || '1'),
                currentScale: 1,
                targetScale: 1,
                velocity: 0
            });
        });
    }

    function updateElasticSprings(speed) {
        State.elasticSprings.forEach(function (spring) {
            var impulse = speed * spring.intensity * 0.15;
            spring.velocity += (impulse - (spring.currentScale - 1) * Config.elasticStiffness);
            spring.velocity *= Config.elasticDamping;
            spring.currentScale += spring.velocity;
            spring.currentScale = Math.max(0.7, Math.min(1.4, spring.currentScale));

            var tiltX = (Math.random() - 0.5) * speed * 5 * spring.intensity;
            var tiltY = (Math.random() - 0.5) * speed * 5 * spring.intensity;

            spring.el.style.transform =
                'scale(' + spring.currentScale.toFixed(3) + ') ' +
                'rotateX(' + tiltX.toFixed(2) + 'deg) ' +
                'rotateY(' + tiltY.toFixed(2) + 'deg)';
        });
    }

    // === Distort Cards ===
    function updateDistortions(speed) {
        DOM.distortElements.forEach(function (el) {
            var rotY = (State.mouseX / window.innerWidth - 0.5) * Config.distortMaxRotation;
            var rotX = (State.mouseY / window.innerHeight - 0.5) * -Config.distortMaxRotation;
            var sc = 1 + speed * Config.distortMaxScale;
            var tz = speed * 8;

            el.style.transform =
                'perspective(1000px) ' +
                'rotateX(' + rotX.toFixed(3) + 'deg) ' +
                'rotateY(' + rotY.toFixed(3) + 'deg) ' +
                'scale(' + sc.toFixed(4) + ') ' +
                'translateZ(' + tz.toFixed(2) + 'px)';

            var rect = el.getBoundingClientRect();
            var relX = (State.smoothX - rect.left) / rect.width * 100;
            var relY = (State.smoothY - rect.top) / rect.height * 100;
            el.style.setProperty('--glow-x', Math.max(0, Math.min(100, relX)) + '%');
            el.style.setProperty('--glow-y', Math.max(0, Math.min(100, relY)) + '%');
        });
    }

    // === Scroll-driven Ripple Injection ===
    function injectScrollRipple(speed) {
        if (speed < 0.05) return;
        var count = Math.floor(speed * 6) + 1;
        for (var i = 0; i < count; i++) {
            var x = Math.random() * window.innerWidth;
            var y = Math.random() * window.innerHeight;
            addRippleAt(x, y, speed * 3);
        }
    }

    // === Main Loop ===
    function startLoop() {
        function tick(time) {
            State.time = time;

            State.smoothX += (State.mouseX - State.smoothX) * Config.lerpFactor;
            State.smoothY += (State.mouseY - State.smoothY) * Config.lerpFactor;

            DOM.cursorGlow.style.left = State.smoothX + 'px';
            DOM.cursorGlow.style.top = State.smoothY + 'px';

            var speed = State.scrollSpeed;
            var decayedSpeed = speed * 0.92;
            State.scrollSpeed = decayedSpeed;

            injectScrollRipple(decayedSpeed);
            propagateRipples();
            drawRipples();

            updateMorphShape(time, decayedSpeed);
            updateChromatic(decayedSpeed);
            updateElasticSprings(decayedSpeed);
            updateDistortions(decayedSpeed);

            State.rafId = requestAnimationFrame(tick);
        }
        State.rafId = requestAnimationFrame(tick);
    }

    // === Boot ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
