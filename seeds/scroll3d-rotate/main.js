(function () {
    'use strict';

    // === Simplex Noise (compact inline) ===
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
        particleCanvas: document.getElementById('particle-field'),
        themeSwitcher: document.getElementById('theme-switcher'),
        speedBar: document.getElementById('speed-bar'),
        rotXVal: document.getElementById('rot-x-val'),
        rotYVal: document.getElementById('rot-y-val'),
        rotZVal: document.getElementById('rot-z-val'),
        scenes: document.querySelectorAll('.scene'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        elements3d: document.querySelectorAll('[data-3d]'),
        flipCards: document.querySelectorAll('.flip-card'),
        flipInners: document.querySelectorAll('.flip-inner'),
        tumbleCards: document.querySelectorAll('.tumble-card'),
        orbitNodes: document.querySelectorAll('.orbit-node'),
        spiralCards: document.querySelectorAll('.spiral-card'),
        cube3d: document.getElementById('cube-3d')
    };

    // === State ===
    var State = {
        currentIndex: 0,
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        smoothX: window.innerWidth / 2,
        smoothY: window.innerHeight / 2,
        scrollSpeed: 0,
        scrollVelocity: 0,
        lastScrollY: 0,
        lastScrollTime: 0,
        scrollProgress: 0,
        noise: SimplexNoise(311),
        time: 0,
        rafId: null,
        particles: [],
        readoutRotX: 0,
        readoutRotY: 0,
        readoutRotZ: 0,
        sceneProgress: [],
        cubeRotX: 0,
        cubeRotY: 0
    };

    // === Config ===
    var Config = {
        particleCount: 70,
        particleMaxSpeed: 0.4,
        lerpFactor: 0.08,
        observerThreshold: 0.35,
        observerRootMargin: '-15% 0px -15% 0px',
        cardTiltMax: 12,
        cardTiltZMax: 4,
        tumbleXMax: 360,
        tumbleZMax: 45,
        orbitRadius: 160,
        orbitRadiusY: 50,
        orbitSpeed: 0.0006,
        spiralRadius: 120,
        spiralHeight: 380,
        spiralTurns: 1.5,
        spiralSpeed: 0.0004,
        cubeSpeed: 0.0003,
        readoutSmooth: 0.12,
        scrollSpeedDecay: 0.92
    };

    // === Init ===
    function init() {
        createSectionDots();
        setupIntersectionObserver();
        setupScrollTracking();
        setupCursorGlow();
        setupThemeSwitcher();
        setupKeyboardNav();
        setupFlipCardClicks();
        initParticleField();
        computeSceneProgress();
        revealFirstScene();
        startLoop();
    }

    // === Scene Progress Map (precompute scroll positions) ===
    function computeSceneProgress() {
        State.sceneProgress = [];
        DOM.scenes.forEach(function (scene) {
            var rect = scene.getBoundingClientRect();
            var top = rect.top + window.scrollY;
            var center = top + rect.height / 2;
            State.sceneProgress.push({
                top: top,
                center: center,
                height: rect.height
            });
        });
    }

    // === Section Navigation ===
    function createSectionDots() {
        for (var i = 0; i < DOM.scenes.length; i++) {
            var dot = document.createElement('div');
            dot.className = 'section-dot' + (i === 0 ? ' active' : '');
            dot.dataset.index = i;
            dot.setAttribute('role', 'button');
            dot.setAttribute('tabindex', '0');
            dot.setAttribute('aria-label', '跳转至第 ' + (i + 1) + ' 幕');
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
        // clear manual flip overrides when leaving the flip gallery scene
        if (State.currentIndex === 1) {
            DOM.flipInners.forEach(function (inner) { inner.dataset.userToggled = '0'; });
        }
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
            var lines = card.querySelectorAll('.reveal-text .line');
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
                    var progress = docHeight > 0 ? (scrollTop / docHeight) : 0;
                    State.scrollProgress = progress;
                    DOM.progressFill.style.height = Math.min(100, progress * 100) + '%';

                    DOM.speedBar.style.height = (State.scrollSpeed * 100) + '%';

                    computeSceneProgress();

                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });

        window.addEventListener('resize', computeSceneProgress);
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
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
                e.preventDefault();
                scrollToScene(Math.min(State.currentIndex + 1, DOM.scenes.length - 1));
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                scrollToScene(Math.max(State.currentIndex - 1, 0));
            }
        });
    }

    // === Flip Card Click Toggle ===
    function setupFlipCardClicks() {
        DOM.flipCards.forEach(function (card) {
            card.addEventListener('click', function () {
                var inner = card.querySelector('.flip-inner');
                if (inner) {
                    var current = parseFloat(inner.dataset.flipState || '0');
                    var next = current === 0 ? 180 : 0;
                    inner.dataset.flipState = next;
                    inner.dataset.userToggled = '1';
                    inner.style.transform = 'rotateY(' + next + 'deg)';
                }
            });
        });
    }

    // === Particle Field ===
    function initParticleField() {
        var canvas = DOM.particleCanvas;
        resizeParticleCanvas();

        for (var i = 0; i < Config.particleCount; i++) {
            State.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * Config.particleMaxSpeed,
                vy: (Math.random() - 0.5) * Config.particleMaxSpeed,
                size: Math.random() * 1.8 + 0.4,
                life: Math.random(),
                depth: Math.random() * 0.6 + 0.4
            });
        }

        window.addEventListener('resize', resizeParticleCanvas);
    }

    function resizeParticleCanvas() {
        DOM.particleCanvas.width = window.innerWidth;
        DOM.particleCanvas.height = window.innerHeight;
    }

    function updateParticleField(time, speed) {
        var canvas = DOM.particleCanvas;
        var ctx = canvas.getContext('2d');
        var w = canvas.width;
        var h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        var style = getComputedStyle(document.documentElement);
        var particleColor = style.getPropertyValue('--particle-color').trim();

        var mouseInfluence = 120;

        State.particles.forEach(function (p) {
            // noise-driven drift
            var n = State.noise(p.x * 0.0015, p.y * 0.0015 + time * 0.00008);
            var angle = n * Math.PI * 2;
            p.vx += Math.cos(angle) * 0.015 * p.depth;
            p.vy += Math.sin(angle) * 0.015 * p.depth;

            // scroll speed boost
            p.vx += (Math.random() - 0.5) * speed * 0.5;
            p.vy += speed * 0.3;

            // mouse attraction (subtle)
            var dx = State.smoothX - p.x;
            var dy = State.smoothY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouseInfluence && dist > 0) {
                var force = (1 - dist / mouseInfluence) * 0.04;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // damping
            p.vx *= 0.96;
            p.vy *= 0.96;

            p.x += p.vx;
            p.y += p.vy;

            // wrap
            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;
            if (p.y < -10) p.y = h + 10;
            if (p.y > h + 10) p.y = -10;

            p.life += 0.003;
            if (p.life > 1) p.life = 0;

            var alpha = Math.sin(p.life * Math.PI) * 0.6 * p.depth;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            var colorBase = particleColor.replace(/[\d.]+\)$/, '');
            ctx.fillStyle = colorBase + alpha.toFixed(3) + ')';
            ctx.fill();
        });
    }

    // === Scene-relative scroll progress (-1 to 1, 0 = centered) ===
    function getSceneLocalProgress(sceneIndex) {
        var sp = State.sceneProgress[sceneIndex];
        if (!sp) return 0;
        var viewCenter = window.scrollY + window.innerHeight / 2;
        var delta = (viewCenter - sp.center) / (sp.height / 2);
        return Math.max(-1.5, Math.min(1.5, delta));
    }

    // === Glass Card 3D Tilt (perspective follow cursor) ===
    function updateCardTilts() {
        DOM.elements3d.forEach(function (el) {
            if (el.classList.contains('flip-card') ||
                el.classList.contains('flip-inner') ||
                el.classList.contains('tumble-card') ||
                el.classList.contains('orbit-node') ||
                el.classList.contains('spiral-card') ||
                el.classList.contains('cube-3d')) {
                return;
            }

            var rect = el.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;

            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var dx = (State.smoothX - cx) / (window.innerWidth / 2);
            var dy = (State.smoothY - cy) / (window.innerHeight / 2);

            var rotY = dx * Config.cardTiltMax;
            var rotX = -dy * Config.cardTiltMax;
            var rotZ = (Math.random() - 0.5) * State.scrollSpeed * Config.cardTiltZMax;

            el.style.transform =
                'perspective(1200px) ' +
                'rotateX(' + rotX.toFixed(2) + 'deg) ' +
                'rotateY(' + rotY.toFixed(2) + 'deg) ' +
                'rotateZ(' + rotZ.toFixed(2) + 'deg)';

            var relX = ((State.smoothX - rect.left) / rect.width) * 100;
            var relY = ((State.smoothY - rect.top) / rect.height) * 100;
            el.style.setProperty('--glow-x', Math.max(0, Math.min(100, relX)) + '%');
            el.style.setProperty('--glow-y', Math.max(0, Math.min(100, relY)) + '%');
        });
    }

    // === Flip Gallery (Y-axis flip driven by scene scroll + speed) ===
    function updateFlipGallery(sceneIndex, speed) {
        if (sceneIndex !== 1) return;
        var localProgress = getSceneLocalProgress(1);
        // localProgress: -1 (below) → 0 (centered) → 1 (above)
        // map to flip angle: as user scrolls past, cards rotate
        var baseAngle = -localProgress * 180;

        DOM.flipInners.forEach(function (inner, i) {
            if (inner.dataset.userToggled === '1') return;
            var stagger = i * 30;
            var angle = baseAngle + stagger + speed * 40;
            // normalize
            angle = ((angle % 360) + 360) % 360;
            if (angle > 180) angle -= 360;
            inner.style.transform = 'rotateY(' + angle.toFixed(2) + 'deg)';
            inner.dataset.flipState = Math.abs(angle) > 90 ? '180' : '0';
        });
    }

    // === Tumble Stack (X + Z axis tumble) ===
    function updateTumbleStack(sceneIndex, speed) {
        if (sceneIndex !== 2) return;
        var localProgress = getSceneLocalProgress(2);

        DOM.tumbleCards.forEach(function (card, i) {
            var stagger = i * 0.15;
            var phase = localProgress + stagger;

            var rotX = phase * Config.tumbleXMax;
            var rotZ = Math.sin(phase * Math.PI) * Config.tumbleZMax;

            // add scroll-speed jitter
            rotX += (Math.random() - 0.5) * speed * 20;
            rotZ += (Math.random() - 0.5) * speed * 15;

            card.style.transform =
                'perspective(1000px) ' +
                'rotateX(' + rotX.toFixed(2) + 'deg) ' +
                'rotateZ(' + rotZ.toFixed(2) + 'deg)';
        });
    }

    // === Orbit Ring (nodes orbit core) ===
    function updateOrbitNodes(sceneIndex, time, speed) {
        if (sceneIndex !== 3) return;
        var localProgress = getSceneLocalProgress(3);
        var speedBoost = 1 + Math.abs(localProgress) * 2 + speed * 3;

        DOM.orbitNodes.forEach(function (node, i) {
            var count = DOM.orbitNodes.length;
            var baseAngle = (i / count) * Math.PI * 2;
            var t = time * Config.orbitSpeed * speedBoost + baseAngle;

            var x = Math.cos(t) * Config.orbitRadius;
            var z = Math.sin(t) * Config.orbitRadius;
            var y = Math.sin(t * 2) * Config.orbitRadiusY;

            // self-rotation
            var selfRotY = t * 180 / Math.PI;
            var selfRotX = Math.sin(t * 3) * 20;

            node.style.transform =
                'translate3d(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px, ' + z.toFixed(2) + 'px) ' +
                'rotateY(' + selfRotY.toFixed(2) + 'deg) ' +
                'rotateX(' + selfRotX.toFixed(2) + 'deg)';
        });
    }

    // === Spiral Cards (DNA double helix) ===
    function updateSpiralCards(sceneIndex, time, speed) {
        if (sceneIndex !== 4) return;
        var localProgress = getSceneLocalProgress(4);
        var count = DOM.spiralCards.length;
        var heightStep = Config.spiralHeight / count;
        var phaseOffset = time * Config.spiralSpeed * (1 + Math.abs(localProgress) * 2 + speed * 2);

        DOM.spiralCards.forEach(function (card, i) {
            var t = (i / count) * Config.spiralTurns * Math.PI * 2 + phaseOffset;
            var yPos = (i / count) * Config.spiralHeight - Config.spiralHeight / 2;
            var x = Math.cos(t) * Config.spiralRadius;
            var z = Math.sin(t) * Config.spiralRadius;

            // face outward along the tangent
            var faceAngle = -t * 180 / Math.PI;

            card.style.transform =
                'translate3d(' + x.toFixed(2) + 'px, ' + yPos.toFixed(2) + 'px, ' + z.toFixed(2) + 'px) ' +
                'rotateY(' + faceAngle.toFixed(2) + 'deg)';
        });
    }

    // === 3D Cube (full 3-axis rotation) ===
    function updateCube(sceneIndex, time, speed) {
        if (sceneIndex !== 5) return;
        var localProgress = getSceneLocalProgress(5);

        // continuous rotation + scroll-driven bias
        var targetX = time * Config.cubeSpeed * 60 + localProgress * 180;
        var targetY = time * Config.cubeSpeed * 80 + localProgress * 360;

        // smooth toward target (springy feel)
        State.cubeRotX += (targetX - State.cubeRotX) * 0.04;
        State.cubeRotY += (targetY - State.cubeRotY) * 0.04;

        var jitterX = (Math.random() - 0.5) * speed * 15;
        var jitterY = (Math.random() - 0.5) * speed * 15;

        if (DOM.cube3d) {
            DOM.cube3d.style.transform =
                'rotateX(' + (State.cubeRotX + jitterX).toFixed(2) + 'deg) ' +
                'rotateY(' + (State.cubeRotY + jitterY).toFixed(2) + 'deg)';
        }
    }

    // === Rotation Readout (HUD) ===
    function updateReadout(sceneIndex, speed) {
        var targetX = 0, targetY = 0, targetZ = 0;

        switch (sceneIndex) {
            case 0: // tilt
                targetX = (State.smoothY / window.innerHeight - 0.5) * Config.cardTiltMax * 2;
                targetY = (State.smoothX / window.innerWidth - 0.5) * Config.cardTiltMax * 2;
                targetZ = speed * Config.cardTiltZMax * 20;
                break;
            case 1: // flip
                targetY = -getSceneLocalProgress(1) * 180;
                break;
            case 2: // tumble
                targetX = getSceneLocalProgress(2) * Config.tumbleXMax;
                targetZ = Math.sin(getSceneLocalProgress(2) * Math.PI) * Config.tumbleZMax;
                break;
            case 3: // orbit
                targetY = (State.time * Config.orbitSpeed * 5) % 360;
                break;
            case 4: // spiral
                targetY = (State.time * Config.spiralSpeed * 5) % 360;
                break;
            case 5: // cube
                targetX = State.cubeRotX % 360;
                targetY = State.cubeRotY % 360;
                break;
        }

        State.readoutRotX += (targetX - State.readoutRotX) * Config.readoutSmooth;
        State.readoutRotY += (targetY - State.readoutRotY) * Config.readoutSmooth;
        State.readoutRotZ += (targetZ - State.readoutRotZ) * Config.readoutSmooth;

        DOM.rotXVal.textContent = formatAngle(State.readoutRotX);
        DOM.rotYVal.textContent = formatAngle(State.readoutRotY);
        DOM.rotZVal.textContent = formatAngle(State.readoutRotZ);
    }

    function formatAngle(deg) {
        var normalized = ((deg % 360) + 360) % 360;
        return String(Math.floor(normalized)).padStart(3, '0') + '°';
    }

    // === Main Loop ===
    function startLoop() {
        function tick(time) {
            State.time = time;

            // smooth cursor
            State.smoothX += (State.mouseX - State.smoothX) * Config.lerpFactor;
            State.smoothY += (State.mouseY - State.smoothY) * Config.lerpFactor;

            DOM.cursorGlow.style.left = State.smoothX + 'px';
            DOM.cursorGlow.style.top = State.smoothY + 'px';

            var speed = State.scrollSpeed;
            var decayedSpeed = speed * Config.scrollSpeedDecay;
            State.scrollSpeed = decayedSpeed;

            var idx = State.currentIndex;

            updateParticleField(time, decayedSpeed);
            updateCardTilts();
            updateFlipGallery(idx, decayedSpeed);
            updateTumbleStack(idx, decayedSpeed);
            updateOrbitNodes(idx, time, decayedSpeed);
            updateSpiralCards(idx, time, decayedSpeed);
            updateCube(idx, time, decayedSpeed);
            updateReadout(idx, decayedSpeed);

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
