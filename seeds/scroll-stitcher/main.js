(function () {
    'use strict';

    // === Simplex Noise (compact inline implementation) ===
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

    // === DOM References ===
    var DOM = {
        main: document.getElementById('main-content'),
        progressFill: document.getElementById('progress-fill'),
        sectionDots: document.getElementById('section-dots'),
        cursorGlow: document.getElementById('cursor-glow'),
        transitionFlash: document.getElementById('transition-flash'),
        threadCanvas: document.getElementById('thread-canvas'),
        themeSwitcher: document.getElementById('theme-switcher'),
        speedBar: document.getElementById('speed-bar'),
        stitchCount: document.getElementById('stitch-count'),
        tensionFill: document.getElementById('tension-fill'),
        weaveGrid: document.getElementById('weave-grid'),
        weaveReadout: document.getElementById('weave-readout'),
        knotRing: document.getElementById('knot-ring'),
        knotReadout: document.getElementById('knot-readout'),
        finalStitchCount: document.getElementById('final-stitch-count'),
        finalDistance: document.getElementById('final-distance'),
        finalThread: document.getElementById('final-thread'),
        scenes: document.querySelectorAll('.scene'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        glassCards: document.querySelectorAll('.glass-card'),
        threadCards: document.querySelectorAll('.thread-card'),
        anchors: document.querySelectorAll('.anchor-point')
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
        totalScrollDistance: 0,
        stitchCount: 0,
        tension: 0,
        noise: SimplexNoise(233),
        time: 0,
        rafId: null,
        threadType: 'silk',
        threadHistory: [],
        anchorPositions: [],
        weftIndex: 0,
        particles: [],
        knotPositions: []
    };

    // === Config ===
    var Config = {
        lerpFactor: 0.08,
        observerThreshold: 0.3,
        observerRootMargin: '-10% 0px -10% 0px',
        threadWobble: 0.6,
        threadMaxWobble: 1.8,
        silkWobble: 0.4,
        wireWobble: 0.08,
        ribbonWobble: 1.2,
        threadWidthSilk: 1.5,
        threadWidthWire: 1.0,
        threadWidthRibbon: 4.0,
        particleMax: 80,
        particleLife: 120,
        particleSpeed: 0.5,
        knotCount: 6,
        knotRadius: 100,
        weftLightThreshold: 0.04
    };

    // === Init ===
    function init() {
        sizeCanvas();
        positionKnots();
        createSectionDots();
        setupIntersectionObserver();
        setupScrollTracking();
        setupCursorGlow();
        setupThemeSwitcher();
        setupThreadCards();
        setupKeyboardNav();
        setupGlassCardTilt();
        captureAnchorPositions();
        seedParticles();
        revealFirstScene();
        startLoop();

        window.addEventListener('resize', debounce(function () {
            sizeCanvas();
            positionKnots();
            captureAnchorPositions();
        }, 200));
    }

    // === Canvas Sizing ===
    function sizeCanvas() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        DOM.threadCanvas.width = window.innerWidth * dpr;
        DOM.threadCanvas.height = window.innerHeight * dpr;
        DOM.threadCanvas.style.width = window.innerWidth + 'px';
        DOM.threadCanvas.style.height = window.innerHeight + 'px';
        var ctx = DOM.threadCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // === Knot Positioning ===
    function positionKnots() {
        var nodes = DOM.knotRing ? DOM.knotRing.querySelectorAll('.knot-node') : [];
        var ringRect = DOM.knotRing ? DOM.knotRing.getBoundingClientRect() : null;
        State.knotPositions = [];

        nodes.forEach(function (node, i) {
            var angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            var x = 50 + Math.cos(angle) * 38;
            var y = 50 + Math.sin(angle) * 38;
            node.style.left = x + '%';
            node.style.top = y + '%';

            State.knotPositions.push({
                node: node,
                angle: angle,
                basePhase: i * 0.6
            });
        });
    }

    // === Anchor Position Capture ===
    function captureAnchorPositions() {
        State.anchorPositions = [];
        DOM.anchors.forEach(function (anchor) {
            State.anchorPositions.push({ el: anchor, x: 0, y: 0 });
        });
        updateAnchorScreenPositions();
    }

    function updateAnchorScreenPositions() {
        State.anchorPositions.forEach(function (ap) {
            var rect = ap.el.getBoundingClientRect();
            ap.x = rect.left + rect.width / 2;
            ap.y = rect.top + rect.height / 2;
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
            dot.setAttribute('aria-label', '跳转到第 ' + (i + 1) + ' 幕');
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
            var lines = card.querySelectorAll('.stitch-line');
            lines.forEach(function (line) {
                var delay = parseInt(line.dataset.delay || 0);
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
                    var rawDelta = window.scrollY - State.lastScrollY;
                    var absDelta = Math.abs(rawDelta);

                    if (dt > 0) {
                        State.scrollVelocity = absDelta / dt * 16;
                        State.scrollSpeed = Math.min(State.scrollVelocity / 8, 1);
                    }

                    State.totalScrollDistance += absDelta;
                    State.stitchCount += Math.floor(absDelta / 40);
                    State.tension = Math.min(State.tension + absDelta * 0.003, 100);

                    State.lastScrollY = window.scrollY;
                    State.lastScrollTime = now;

                    updateProgressUI();
                    updateStitchUI();
                    updateWeft(absDelta);

                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function updateProgressUI() {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        DOM.progressFill.style.height = Math.min(100, progress) + '%';
        DOM.speedBar.style.height = (State.scrollSpeed * 100) + '%';
    }

    function updateStitchUI() {
        if (DOM.stitchCount) DOM.stitchCount.textContent = State.stitchCount.toLocaleString();
        if (DOM.tensionFill) DOM.tensionFill.style.width = State.tension + '%';

        if (DOM.finalStitchCount) DOM.finalStitchCount.textContent = State.stitchCount.toLocaleString();
        if (DOM.finalDistance) DOM.finalDistance.textContent = Math.round(State.totalScrollDistance / 10) + 'u';
        if (DOM.finalThread) DOM.finalThread.textContent = State.threadType.toUpperCase();
    }

    // === Weft (horizontal weave grid interaction) ===
    function updateWeft(scrollDelta) {
        if (!DOM.weaveGrid) return;
        var cells = DOM.weaveGrid.querySelectorAll('.weave-cell');
        if (cells.length === 0) return;

        if (scrollDelta > Config.weftLightThreshold * window.innerHeight) {
            var idx = State.weftIndex % cells.length;
            lightWeaveCell(cells[idx]);
            State.weftIndex++;
        }

        var litCount = DOM.weaveGrid.querySelectorAll('.weave-cell.lit').length;
        if (DOM.weaveReadout) {
            DOM.weaveReadout.textContent = 'WEFT · ' + litCount + ' / ' + cells.length;
        }
    }

    function lightWeaveCell(cell) {
        cell.classList.add('lit');
        cell.style.transform = 'scale(1.12) rotate(' + ((Math.random() - 0.5) * 6).toFixed(2) + 'deg)';
        setTimeout(function () {
            cell.style.transform = '';
        }, 400);

        setTimeout(function () {
            cell.classList.remove('lit');
        }, 1400);
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

    // === Thread Type Cards ===
    function setupThreadCards() {
        DOM.threadCards.forEach(function (card) {
            card.addEventListener('click', function () {
                var type = card.dataset.thread;
                State.threadType = type;
                DOM.threadCards.forEach(function (c) { c.classList.toggle('active', c === card); });
                triggerTransitionFlash();
                if (DOM.finalThread) DOM.finalThread.textContent = type.toUpperCase();

                emitBurst(State.mouseX || window.innerWidth / 2, State.mouseY || window.innerHeight / 2, 12);
            });
        });

        if (DOM.threadCards.length > 0) {
            DOM.threadCards[0].classList.add('active');
        }
    }

    // === Glass Card Tilt ===
    function setupGlassCardTilt() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

        DOM.glassCards.forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var relX = ((e.clientX - rect.left) / rect.width) * 100;
                var relY = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--glow-x', relX + '%');
                card.style.setProperty('--glow-y', relY + '%');

                var rotY = (relX / 100 - 0.5) * 3;
                var rotX = (0.5 - relY / 100) * 3;
                card.style.transform = 'perspective(1000px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
            });

            card.addEventListener('mouseleave', function () {
                card.style.transform = '';
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

    // === Particles ===
    function seedParticles() {
        for (var i = 0; i < 40; i++) {
            spawnAmbientParticle();
        }
    }

    function spawnAmbientParticle() {
        if (State.particles.length >= Config.particleMax) return;
        State.particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * Config.particleSpeed,
            vy: (Math.random() - 0.5) * Config.particleSpeed,
            life: Math.random() * Config.particleLife,
            maxLife: Config.particleLife,
            size: Math.random() * 1.5 + 0.5,
            ambient: true
        });
    }

    function emitBurst(x, y, count) {
        for (var i = 0; i < count; i++) {
            if (State.particles.length >= Config.particleMax + 40) break;
            var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            var speed = Math.random() * 3 + 1.5;
            State.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 60,
                maxLife: 60,
                size: Math.random() * 2 + 1,
                ambient: false
            });
        }
    }

    function updateParticles() {
        var next = [];
        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.ambient) {
                var nx = p.x * 0.002 + State.time * 0.00015;
                var ny = p.y * 0.002 + State.time * 0.00015;
                var n = State.noise(nx, ny);
                p.vx += n * 0.02;
                p.vy += n * 0.02;
                p.vx *= 0.98;
                p.vy *= 0.98;

                if (p.x < -20) p.x = window.innerWidth + 20;
                if (p.x > window.innerWidth + 20) p.x = -20;
                if (p.y < -20) p.y = window.innerHeight + 20;
                if (p.y > window.innerHeight + 20) p.y = -20;

                if (p.life <= 0) p.life = p.maxLife;
                next.push(p);
            } else {
                p.vx *= 0.94;
                p.vy *= 0.94;
                if (p.life > 0) next.push(p);
            }
        }
        State.particles = next;
    }

    function drawParticles(ctx) {
        var style = getComputedStyle(document.documentElement);
        var accentColor = style.getPropertyValue('--particle-color').trim();

        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];
            var alpha;
            if (p.ambient) {
                alpha = (p.life / p.maxLife) * 0.3;
            } else {
                alpha = (p.life / p.maxLife) * 0.8;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = accentColor.replace(/[\d.]+\)$/, alpha.toFixed(3) + ')');
            ctx.fill();
        }
    }

    // === Thread Drawing ===
    function getThreadParams() {
        var params = { width: Config.threadWidthSilk, wobble: Config.silkWobble, alpha: 0.7 };
        switch (State.threadType) {
            case 'wire':
                params.width = Config.threadWidthWire;
                params.wobble = Config.wireWobble;
                params.alpha = 0.55;
                break;
            case 'ribbon':
                params.width = Config.threadWidthRibbon;
                params.wobble = Config.ribbonWobble;
                params.alpha = 0.5;
                break;
            case 'silk':
            default:
                params.width = Config.threadWidthSilk;
                params.wobble = Config.silkWobble;
                params.alpha = 0.7;
                break;
        }
        var speedBoost = 1 + State.scrollSpeed * 1.5;
        params.wobble *= Math.min(speedBoost, Config.threadMaxWobble);
        return params;
    }

    function drawConnectingThread(ctx, time) {
        if (State.anchorPositions.length < 2) return;

        var params = getThreadParams();
        var style = getComputedStyle(document.documentElement);
        var threadColor = style.getPropertyValue('--thread-color').trim();
        var threadBright = style.getPropertyValue('--thread-bright').trim();

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (var i = 0; i < State.anchorPositions.length - 1; i++) {
            var a = State.anchorPositions[i];
            var b = State.anchorPositions[i + 1];
            if (!a || !b) continue;

            var segments = 40;
            ctx.beginPath();

            for (var s = 0; s <= segments; s++) {
                var t = s / segments;
                var baseX = a.x + (b.x - a.x) * t;
                var baseY = a.y + (b.y - a.y) * t;

                var wobble = params.wobble * 30;
                var nx = baseX * 0.004 + time * 0.0002 + i * 0.5;
                var ny = baseY * 0.004 + time * 0.0002 + i * 0.3;
                var noiseVal = State.noise(nx, ny);

                var wavePhase = t * Math.PI * 3 + time * 0.001 + i;
                var wave = Math.sin(wavePhase) * wobble * (1 - Math.abs(t - 0.5) * 2);

                var perpX = -(b.y - a.y);
                var perpY = (b.x - a.x);
                var perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                perpX /= perpLen;
                perpY /= perpLen;

                var px = baseX + perpX * (wave + noiseVal * wobble);
                var py = baseY + perpY * (wave + noiseVal * wobble);

                if (s === 0) {
                    ctx.moveTo(px, py);
                } else {
                    var prevT = (s - 1) / segments;
                    var prevBaseX = a.x + (b.x - a.x) * prevT;
                    var prevBaseY = a.y + (b.y - a.y) * prevT;
                    var prevWavePhase = prevT * Math.PI * 3 + time * 0.001 + i;
                    var prevWave = Math.sin(prevWavePhase) * wobble * (1 - Math.abs(prevT - 0.5) * 2);
                    var prevNx = prevBaseX * 0.004 + time * 0.0002 + i * 0.5;
                    var prevNy = prevBaseY * 0.004 + time * 0.0002 + i * 0.3;
                    var prevNoise = State.noise(prevNx, prevNy);
                    var prevPx = prevBaseX + perpX * (prevWave + prevNoise * wobble);
                    var prevPy = prevBaseY + perpY * (prevWave + prevNoise * wobble);

                    var midX = (prevPx + px) / 2;
                    var midY = (prevPy + py) / 2;
                    ctx.quadraticCurveTo(prevPx, prevPy, midX, midY);
                }
            }

            ctx.strokeStyle = threadColor;
            ctx.lineWidth = params.width;
            ctx.globalAlpha = params.alpha;
            ctx.shadowColor = threadBright;
            ctx.shadowBlur = 8 + State.scrollSpeed * 12;
            ctx.stroke();

            ctx.strokeStyle = threadBright;
            ctx.lineWidth = Math.max(0.5, params.width * 0.4);
            ctx.globalAlpha = Math.min(1, params.alpha + 0.25);
            ctx.shadowBlur = 4;
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function drawScrollThread(ctx, time) {
        if (State.threadHistory.length < 2) return;

        var params = getThreadParams();
        var style = getComputedStyle(document.documentElement);
        var threadBright = style.getPropertyValue('--thread-bright').trim();

        ctx.beginPath();
        ctx.strokeStyle = threadBright;
        ctx.lineWidth = params.width * 0.6;
        ctx.globalAlpha = 0.35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = threadBright;
        ctx.shadowBlur = 6;

        var hist = State.threadHistory;
        ctx.moveTo(hist[0].x, hist[0].y);
        for (var i = 1; i < hist.length; i++) {
            var p = hist[i];
            var prev = hist[i - 1];
            var midX = (prev.x + p.x) / 2;
            var midY = (prev.y + p.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }

        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function recordThreadTrail() {
        if (State.scrollSpeed < 0.02) return;
        var x = State.smoothX || window.innerWidth / 2;
        var y = State.smoothY || window.innerHeight / 2;

        x += (Math.random() - 0.5) * 30 * State.scrollSpeed;
        y += (Math.random() - 0.5) * 30 * State.scrollSpeed;

        State.threadHistory.push({ x: x, y: y, t: State.time });
        if (State.threadHistory.length > 24) State.threadHistory.shift();
    }

    function decayThreadTrail() {
        if (State.threadHistory.length === 0) return;
        if (State.scrollSpeed < 0.01 && State.time % 4 === 0) {
            State.threadHistory.shift();
        }
    }

    // === Knot Ring Animation ===
    function updateKnotRing(time) {
        if (!DOM.knotRing || State.knotPositions.length === 0) return;
        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2;

        var ringRect = DOM.knotRing.getBoundingClientRect();
        var ringCx = ringRect.left + ringRect.width / 2;
        var ringCy = ringRect.top + ringRect.height / 2;

        var visible = ringRect.top < window.innerHeight && ringRect.bottom > 0;
        if (!visible) return;

        var dx = State.smoothX - ringCx;
        var dy = State.smoothY - ringCy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var influence = Math.max(0, 1 - dist / 300);

        State.knotPositions.forEach(function (kp, i) {
            var angle = kp.angle + time * 0.0003;
            var r = 38 + influence * 8 + Math.sin(time * 0.001 + kp.basePhase) * 3;
            var x = 50 + Math.cos(angle) * r;
            var y = 50 + Math.sin(angle) * r;
            kp.node.style.left = x + '%';
            kp.node.style.top = y + '%';

            var scale = 1 + influence * 0.5 + State.scrollSpeed * 0.3;
            kp.node.style.transform = 'translate(-50%, -50%) scale(' + scale.toFixed(3) + ')';
        });
    }

    function drawKnotConnections(ctx, time) {
        if (State.knotPositions.length === 0) return;
        var ringRect = DOM.knotRing.getBoundingClientRect();
        var visible = ringRect.top < window.innerHeight && ringRect.bottom > 0;
        if (!visible) return;

        var style = getComputedStyle(document.documentElement);
        var threadColor = style.getPropertyValue('--thread-color').trim();

        ctx.strokeStyle = threadColor;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.4;
        ctx.shadowColor = threadColor;
        ctx.shadowBlur = 4;

        var positions = [];
        State.knotPositions.forEach(function (kp) {
            var rect = kp.node.getBoundingClientRect();
            positions.push({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        });

        for (var i = 0; i < positions.length; i++) {
            for (var j = i + 1; j < positions.length; j++) {
                var a = positions[i];
                var b = positions[j];
                var dist = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
                if (dist > 200) continue;

                ctx.globalAlpha = 0.4 * (1 - dist / 200);
                ctx.beginPath();

                var midX = (a.x + b.x) / 2;
                var midY = (a.y + b.y) / 2;
                var perpX = -(b.y - a.y);
                var perpY = (b.x - a.x);
                var perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                perpX /= perpLen;
                perpY /= perpLen;

                var curve = Math.sin(time * 0.001 + i + j) * 10;
                midX += perpX * curve;
                midY += perpY * curve;

                ctx.moveTo(a.x, a.y);
                ctx.quadraticCurveTo(midX, midY, b.x, b.y);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    // === Tension Decay ===
    function decayTension() {
        State.tension *= 0.985;
        if (State.tension < 0.5) State.tension = 0;
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

            decayTension();
            updateAnchorScreenPositions();
            updateKnotRing(time);

            updateParticles();
            recordThreadTrail();
            decayThreadTrail();

            var ctx = DOM.threadCanvas.getContext('2d');
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            drawParticles(ctx);
            drawKnotConnections(ctx, time);
            drawConnectingThread(ctx, time);
            drawScrollThread(ctx, time);

            updateStitchUI();

            State.rafId = requestAnimationFrame(tick);
        }
        State.rafId = requestAnimationFrame(tick);
    }

    // === Utility ===
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    // === Boot ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
