(function () {
    'use strict';

    /* ============================================================
       DOM ELEMENTS
       ============================================================ */
    var particleCanvas = document.getElementById('particle-canvas');
    var pctx = particleCanvas.getContext('2d');
    var waveCanvas = document.getElementById('wave-canvas');
    var wctx = waveCanvas ? waveCanvas.getContext('2d') : null;

    var progressFill = document.getElementById('progress-fill');
    var reelCurrent = document.getElementById('reel-current');
    var reelTotal = document.getElementById('reel-total');
    var fpsReadout = document.getElementById('fps-readout');
    var sceneIndicators = document.getElementById('scene-indicators');
    var grainOverlay = document.getElementById('grain-overlay');
    var cursorLens = document.getElementById('cursor-lens');
    var scrollHud = document.getElementById('scroll-hud');
    var hudBarFill = document.getElementById('hud-bar-fill');
    var hudValue = document.getElementById('hud-value');
    var themeSwitcher = document.getElementById('theme-switcher');
    var replayBtn = document.getElementById('replay-btn');

    var apertureValue = document.getElementById('aperture-value');
    var cameraRig = document.getElementById('camera-rig');
    var gradeDivider = document.getElementById('grade-divider');
    var gradeBefore = document.getElementById('grade-before');
    var gradeAfter = document.getElementById('grade-after');
    var montageGrid = document.getElementById('montage-grid');
    var montageValue = document.getElementById('montage-value');

    var scenes = document.querySelectorAll('.scene');
    var totalScenes = scenes.length;

    /* ============================================================
       STATE
       ============================================================ */
    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var lensX = mouseX;
    var lensY = mouseY;
    var smoothMouseX = mouseX;
    var smoothMouseY = mouseY;
    var scrollVelocity = 0;
    var lastScrollY = 0;
    var currentSceneIndex = 0;
    var hasStarted = false;
    var particles = [];
    var waveMode = 0;
    var lutMode = 0;
    var gradeDragging = false;
    var frameCount = 0;
    var lastFpsTime = performance.now();
    var montageCutBase = 24;
    var revealedScenes = {};

    reelTotal.textContent = padNum(totalScenes);

    /* ============================================================
       UTILITIES
       ============================================================ */
    function padNum(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function getAccentColor() {
        return getComputedStyle(document.body).getPropertyValue('--color-accent').trim() || '#c084fc';
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var num = parseInt(hex, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }

    /* ============================================================
       PARTICLE FIELD
       ============================================================ */
    function resizeParticleCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }

    function initParticles() {
        particles = [];
        var count = Math.min(90, Math.floor((particleCanvas.width * particleCanvas.height) / 14000));
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * particleCanvas.width,
                y: Math.random() * particleCanvas.height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                radius: Math.random() * 1.6 + 0.4,
                alpha: Math.random() * 0.4 + 0.1,
                baseAlpha: Math.random() * 0.4 + 0.1
            });
        }
    }

    function drawParticles() {
        pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        var accent = getAccentColor();
        var rgb = hexToRgb(accent);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var dx = smoothMouseX - p.x;
            var dy = smoothMouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 220) {
                var force = (220 - dist) / 220;
                p.vx += (dx / Math.max(dist, 1)) * force * 0.025;
                p.vy += (dy / Math.max(dist, 1)) * force * 0.025;
                p.alpha = p.baseAlpha + force * 0.35;
            } else {
                p.alpha += (p.baseAlpha - p.alpha) * 0.02;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.985;
            p.vy *= 0.985;

            if (p.x < -10) p.x = particleCanvas.width + 10;
            if (p.x > particleCanvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = particleCanvas.height + 10;
            if (p.y > particleCanvas.height + 10) p.y = -10;

            pctx.beginPath();
            pctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            pctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + p.alpha + ')';
            pctx.fill();
        }

        /* Connection lines */
        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var ddx = particles[a].x - particles[b].x;
                var ddy = particles[a].y - particles[b].y;
                var dd = ddx * ddx + ddy * ddy;
                if (dd < 13000) {
                    var lineAlpha = (1 - dd / 13000) * 0.07;
                    pctx.beginPath();
                    pctx.moveTo(particles[a].x, particles[a].y);
                    pctx.lineTo(particles[b].x, particles[b].y);
                    pctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + lineAlpha + ')';
                    pctx.lineWidth = 0.5;
                    pctx.stroke();
                }
            }
        }
    }

    /* ============================================================
       SCENE INDICATORS
       ============================================================ */
    function buildSceneIndicators() {
        sceneIndicators.innerHTML = '';
        for (var i = 0; i < totalScenes; i++) {
            var dot = document.createElement('div');
            dot.className = 'scene-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('data-scene', i);
            dot.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-scene'), 10);
                scenes[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            sceneIndicators.appendChild(dot);
        }
    }

    /* ============================================================
       PROGRESS & SCENE TRACKING
       ============================================================ */
    function updateProgress() {
        var pageHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = pageHeight > 0 ? (window.scrollY / pageHeight) * 100 : 0;
        progressFill.style.height = clamp(pct, 0, 100) + '%';

        var bestIdx = 0;
        var bestDist = Infinity;
        for (var i = 0; i < scenes.length; i++) {
            var rect = scenes[i].getBoundingClientRect();
            var center = rect.top + rect.height / 2;
            var d = Math.abs(center - window.innerHeight / 2);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }

        if (bestIdx !== currentSceneIndex) {
            currentSceneIndex = bestIdx;
            reelCurrent.textContent = padNum(currentSceneIndex + 1);
            var dots = sceneIndicators.querySelectorAll('.scene-dot');
            for (var j = 0; j < dots.length; j++) {
                dots[j].classList.toggle('active', j === currentSceneIndex);
            }
        }
    }

    /* ============================================================
       REVEAL TEXT (chars & lines)
       ============================================================ */
    function splitRevealChars() {
        var els = document.querySelectorAll('.reveal-chars');
        for (var e = 0; e < els.length; e++) {
            var el = els[e];
            if (el.dataset.initialized) continue;
            var text = el.getAttribute('data-text');
            if (!text) continue;
            el.dataset.initialized = '1';
            el.innerHTML = '';
            for (var c = 0; c < text.length; c++) {
                var span = document.createElement('span');
                span.className = text[c] === ' ' ? 'char space' : 'char';
                span.textContent = text[c] === ' ' ? '\u00A0' : text[c];
                el.appendChild(span);
            }
        }
    }

    function tagRevealLines() {
        var els = document.querySelectorAll('.reveal-lines');
        for (var e = 0; e < els.length; e++) {
            var el = els[e];
            if (el.dataset.initialized) continue;
            el.dataset.initialized = '1';
            var lines = el.querySelectorAll('.heading-line');
            for (var i = 0; i < lines.length; i++) {
                lines[i].setAttribute('data-delay', String(i * 150));
            }
        }
    }

    /* ============================================================
       INTERSECTION OBSERVER — per-scene reveals
       ============================================================ */
    function setupObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var scene = entry.target;
                var idx = parseInt(scene.getAttribute('data-scene'), 10);

                if (entry.isIntersecting && !revealedScenes[idx]) {
                    revealedScenes[idx] = true;
                    revealScene(scene);
                }
            });
        }, {
            threshold: 0.32,
            rootMargin: '0px 0px -8% 0px'
        });

        scenes.forEach(function (s) { observer.observe(s); });
    }

    function revealScene(scene) {
        /* Title lines */
        var titleLines = scene.querySelectorAll('.title-line');
        titleLines.forEach(function (line) {
            var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
            setTimeout(function () { line.classList.add('visible'); }, delay);
        });

        /* Heading lines */
        var headingLines = scene.querySelectorAll('.heading-line');
        headingLines.forEach(function (line, i) {
            var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
            setTimeout(function () { line.classList.add('visible'); }, 250 + delay);
        });

        /* Chars */
        var chars = scene.querySelectorAll('.reveal-chars .char');
        chars.forEach(function (ch, i) {
            setTimeout(function () { ch.classList.add('visible'); }, 450 + i * 22);
        });

        /* Montage frames */
        var frames = scene.querySelectorAll('.montage-frame');
        frames.forEach(function (f, i) {
            setTimeout(function () { f.classList.add('visible'); }, 600 + i * 90);
        });

        /* Credits */
        var credits = scene.querySelectorAll('.credit-line');
        credits.forEach(function (cl, i) {
            setTimeout(function () { cl.classList.add('visible'); }, 900 + i * 220);
        });

        /* Replay button */
        var rbtn = scene.querySelector('.replay-btn');
        if (rbtn) {
            setTimeout(function () { rbtn.classList.add('visible'); }, 2200);
        }
    }

    /* ============================================================
       SCROLL HANDLER — velocity, grain, HUD, reactive elements
       ============================================================ */
    function handleScroll() {
        var sy = window.scrollY;
        scrollVelocity = Math.abs(sy - lastScrollY);
        lastScrollY = sy;

        /* Grain reactivity */
        if (scrollVelocity > 18) {
            grainOverlay.classList.add('active');
        } else {
            grainOverlay.classList.remove('active');
        }

        /* HUD activation */
        if (!hasStarted && sy > 50) {
            hasStarted = true;
            scrollHud.classList.add('active');
            var coverScene = scenes[0];
            if (coverScene) coverScene.classList.add('scrolled');
            var cue = document.getElementById('scroll-cue');
            if (cue) cue.style.opacity = '0';
        }

        /* HUD bar fill */
        var velPct = clamp(scrollVelocity / 80 * 100, 0, 100);
        hudBarFill.style.width = velPct + '%';
        hudValue.textContent = (scrollVelocity / 10).toFixed(1);

        updateProgress();
        updateReactiveElements();
    }

    /* ============================================================
       REACTIVE ELEMENTS — respond to scroll position within viewport
       ============================================================ */
    function updateReactiveElements() {
        /* Aperture: opens/closes based on scene 1 viewport position */
        var apertureScene = scenes[1];
        if (apertureScene && apertureValue) {
            var aRect = apertureScene.getBoundingClientRect();
            var aCenter = aRect.top + aRect.height / 2;
            var aDist = Math.abs(aCenter - window.innerHeight / 2) / window.innerHeight;
            var openness = clamp(1 - aDist, 0, 1);
            var fstop = (5.6 - openness * 4.2).toFixed(1);
            apertureValue.textContent = fstop;
            var blades = apertureScene.querySelectorAll('.aperture-blade');
            var scale = 0.45 + openness * 0.55;
            blades.forEach(function (b) {
                var baseRot = parseFloat(b.className.match(/blade-(\d)/)[1]) * 60;
                b.style.transform = 'rotate(' + baseRot + 'deg) scale(' + scale + ')';
                b.style.opacity = 0.4 + openness * 0.6;
            });
            var core = apertureScene.querySelector('.aperture-core');
            if (core) {
                core.style.width = (20 + openness * 80) + 'px';
                core.style.height = (20 + openness * 80) + 'px';
            }
        }

        /* Camera dolly: moves along track based on scene 2 position */
        var shotScene = scenes[2];
        if (shotScene && cameraRig) {
            var sRect = shotScene.getBoundingClientRect();
            var sCenter = sRect.top + sRect.height / 2;
            var sDist = Math.abs(sCenter - window.innerHeight / 2) / window.innerHeight;
            var progress = clamp(1 - sDist, 0, 1);
            cameraRig.style.left = (8 + progress * 84) + '%';
        }

        /* Montage meter: fluctuates with scroll velocity when in view */
        var montageScene = scenes[4];
        if (montageScene && montageValue) {
            var mRect = montageScene.getBoundingClientRect();
            if (mRect.top < window.innerHeight && mRect.bottom > 0) {
                var cuts = Math.round(montageCutBase + scrollVelocity * 0.8);
                montageValue.textContent = cuts;
            }
        }
    }

    /* ============================================================
       GRADE SLIDER (Act 3)
       ============================================================ */
    function setupGradeSlider() {
        if (!gradeDivider) return;
        var stage = gradeDivider.parentElement;

        function moveDivider(clientX) {
            var rect = stage.getBoundingClientRect();
            var pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
            gradeDivider.style.left = pct + '%';
            gradeAfter.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
            gradeBefore.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
        }

        /* Initial split */
        gradeAfter.style.clipPath = 'inset(0 0 0 50%)';
        gradeBefore.style.clipPath = 'inset(0 50% 0 0)';

        gradeDivider.addEventListener('mousedown', function (e) {
            gradeDragging = true;
            e.preventDefault();
        });

        stage.addEventListener('mousedown', function (e) {
            if (e.target === gradeDivider || e.target.closest('.grade-divider')) {
                gradeDragging = true;
            } else if (e.target.closest('.grade-swatch')) {
                moveDivider(e.clientX);
            }
        });

        document.addEventListener('mousemove', function (e) {
            if (gradeDragging) moveDivider(e.clientX);
        });

        document.addEventListener('mouseup', function () {
            gradeDragging = false;
        });

        /* Touch */
        stage.addEventListener('touchstart', function (e) {
            if (e.touches[0]) moveDivider(e.touches[0].clientX);
        }, { passive: true });

        stage.addEventListener('touchmove', function (e) {
            if (e.touches[0]) moveDivider(e.touches[0].clientX);
        }, { passive: true });
    }

    function setupLutButtons() {
        var btns = document.querySelectorAll('.lut-btn');
        var luts = [
            { before: 'saturate(0.4) brightness(0.8)', after: 'saturate(1.6) contrast(1.2) brightness(1.05)' },
            { before: 'saturate(0.8) brightness(0.9)', after: 'saturate(0.3) contrast(1.4) brightness(1.1)' },
            { before: 'saturate(0.5) brightness(0.85)', after: 'saturate(1.8) hue-rotate(15deg) contrast(1.15)' }
        ];
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                lutMode = parseInt(btn.getAttribute('data-lut'), 10);
                if (luts[lutMode]) {
                    gradeBefore.style.filter = luts[lutMode].before;
                    gradeAfter.style.filter = luts[lutMode].after;
                }
            });
        });
    }

    /* ============================================================
       WAVEFORM (Act 5)
       ============================================================ */
    function resizeWaveCanvas() {
        if (!waveCanvas) return;
        waveCanvas.width = waveCanvas.offsetWidth;
        waveCanvas.height = waveCanvas.offsetHeight;
    }

    function drawWave(time) {
        if (!wctx || !waveCanvas) return;
        var w = waveCanvas.width;
        var h = waveCanvas.height;
        wctx.clearRect(0, 0, w, h);

        var accent = getAccentColor();
        var rgb = hexToRgb(accent);

        var t = time * 0.001;
        var bars = Math.floor(w / 4);
        var barWidth = w / bars;

        for (var i = 0; i < bars; i++) {
            var x = i * barWidth;
            var norm = i / bars;
            var amp = 0;

            if (waveMode === 0) {
                /* Strings: smooth flowing sine layers */
                amp = Math.sin(norm * Math.PI * 4 + t * 1.5) * 0.3 +
                      Math.sin(norm * Math.PI * 8 + t * 2.2) * 0.2 +
                      Math.sin(norm * Math.PI * 2 + t * 0.8) * 0.15 + 0.35;
            } else if (waveMode === 1) {
                /* Brass: sharp stabs */
                amp = Math.pow(Math.max(0, Math.sin(norm * Math.PI * 3 + t * 2)), 4) * 0.7 +
                      Math.pow(Math.max(0, Math.sin(norm * Math.PI * 6 + t * 3 + 1)), 6) * 0.3 + 0.1;
            } else {
                /* Pulse: rhythmic beats */
                amp = (Math.sin(t * 4) > 0.7 ? 0.6 : 0.15) +
                      Math.sin(norm * Math.PI * 12 + t * 6) * 0.2 * Math.max(0, Math.sin(t * 4)) + 0.2;
            }

            amp = clamp(amp, 0.05, 0.95);
            var barH = amp * h * 0.75;
            var y = (h - barH) / 2;

            var grad = wctx.createLinearGradient(0, y, 0, y + barH);
            grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.9)');
            grad.addColorStop(0.5, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.5)');
            grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.9)');

            wctx.fillStyle = grad;
            wctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barH);
        }

        /* Center line */
        wctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.15)';
        wctx.lineWidth = 1;
        wctx.beginPath();
        wctx.moveTo(0, h / 2);
        wctx.lineTo(w, h / 2);
        wctx.stroke();
    }

    function setupWaveButtons() {
        var btns = document.querySelectorAll('.wave-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                waveMode = parseInt(btn.getAttribute('data-wave'), 10);
            });
        });
    }

    /* ============================================================
       MONTAGE FRAME INTERACTION (Act 4)
       ============================================================ */
    function setupMontageFrames() {
        if (!montageGrid) return;
        var frames = montageGrid.querySelectorAll('.montage-frame');
        frames.forEach(function (frame) {
            frame.addEventListener('mouseenter', function () {
                frames.forEach(function (f) {
                    if (f !== frame) f.style.opacity = '0.35';
                });
            });
            frame.addEventListener('mouseleave', function () {
                frames.forEach(function (f) { f.style.opacity = ''; });
            });
        });
    }

    /* ============================================================
       THEME SWITCHER
       ============================================================ */
    function setupThemeSwitcher() {
        var btns = themeSwitcher.querySelectorAll('.theme-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var theme = btn.getAttribute('data-theme');
                document.body.setAttribute('data-theme', theme);
            });
        });
    }

    /* ============================================================
       CURSOR LENS
       ============================================================ */
    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!cursorLens.classList.contains('active')) {
            cursorLens.classList.add('active');
        }
    }

    function handleMouseLeave() {
        cursorLens.classList.remove('active');
    }

    function setupCursorExpand() {
        var interactive = document.querySelectorAll('.scene-dot, .back-link, .theme-btn, .lut-btn, .wave-btn, .montage-frame, .grade-divider, .scroll-cue, .replay-btn, .marker');
        interactive.forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                cursorLens.classList.add('expanded');
            });
            el.addEventListener('mouseleave', function () {
                cursorLens.classList.remove('expanded');
            });
        });
    }

    /* ============================================================
       REPLAY
       ============================================================ */
    function setupReplay() {
        if (!replayBtn) return;
        replayBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            hasStarted = false;
            revealedScenes = {};

            var allChars = document.querySelectorAll('.char.visible');
            allChars.forEach(function (c) { c.classList.remove('visible'); });
            var allLines = document.querySelectorAll('.heading-line.visible, .title-line.visible');
            allLines.forEach(function (l) { l.classList.remove('visible'); });
            var allCredits = document.querySelectorAll('.credit-line.visible');
            allCredits.forEach(function (cl) { cl.classList.remove('visible'); });
            var allFrames = document.querySelectorAll('.montage-frame.visible');
            allFrames.forEach(function (f) { f.classList.remove('visible'); });
            if (replayBtn.classList.contains('visible')) replayBtn.classList.remove('visible');

            var revealed = document.querySelectorAll('.scene-revealed');
            revealed.forEach(function (s) { s.classList.remove('scene-revealed'); });

            var cover = scenes[0];
            if (cover) cover.classList.remove('scrolled');

            setTimeout(function () {
                setupObserver();
            }, 900);
        });
    }

    /* ============================================================
       ANIMATION LOOP
       ============================================================ */
    function loop(time) {
        /* Smooth mouse for particle attraction */
        smoothMouseX = lerp(smoothMouseX, mouseX, 0.08);
        smoothMouseY = lerp(smoothMouseY, mouseY, 0.08);

        /* Cursor lens follow */
        lensX = lerp(lensX, mouseX, 0.2);
        lensY = lerp(lensY, mouseY, 0.2);
        cursorLens.style.left = lensX + 'px';
        cursorLens.style.top = lensY + 'px';

        drawParticles();
        drawWave(time);

        /* FPS readout */
        frameCount++;
        if (time - lastFpsTime >= 1000) {
            var fps = Math.round((frameCount * 1000) / (time - lastFpsTime));
            if (fpsReadout) fpsReadout.textContent = fps + ' FPS';
            frameCount = 0;
            lastFpsTime = time;
        }

        requestAnimationFrame(loop);
    }

    /* ============================================================
       INIT
       ============================================================ */
    function init() {
        resizeParticleCanvas();
        resizeWaveCanvas();
        initParticles();
        buildSceneIndicators();
        splitRevealChars();
        tagRevealLines();
        setupObserver();
        setupGradeSlider();
        setupLutButtons();
        setupWaveButtons();
        setupMontageFrames();
        setupThemeSwitcher();
        setupCursorExpand();
        setupReplay();

        window.addEventListener('resize', function () {
            resizeParticleCanvas();
            resizeWaveCanvas();
            initParticles();
        });

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        /* Cover scene initial reveal */
        var coverTitleLines = document.querySelectorAll('.scene-cover .title-line');
        coverTitleLines.forEach(function (line) {
            var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
            setTimeout(function () { line.classList.add('visible'); }, 400 + delay);
        });

        var coverChars = document.querySelectorAll('.scene-cover .reveal-chars .char');
        coverChars.forEach(function (ch, i) {
            setTimeout(function () { ch.classList.add('visible'); }, 1000 + i * 20);
        });

        revealedScenes[0] = true;

        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
