(function () {
    'use strict';

    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var progressFill = document.getElementById('progress-fill');
    var panelDotsContainer = document.getElementById('panel-dots');
    var hudChapter = document.getElementById('hud-chapter');
    var hudPage = document.getElementById('hud-page');
    var cursorGlow = document.getElementById('cursor-glow');
    var scrollCue = document.getElementById('scroll-cue');
    var replayBtn = document.getElementById('replay-btn');

    var panels = document.querySelectorAll('.panel');
    var totalPanels = panels.length;
    var parallaxEls = document.querySelectorAll('[data-parallax]');

    /* =====================================================
       STATE
       ===================================================== */

    var particles = [];
    var stars = [];
    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var scrollY = 0;
    var currentPanelIndex = 0;
    var hasStarted = false;

    var CHAPTER_NAMES = [
        'PROLOGUE',
        'CHAPTER I — SIGNAL',
        'CHAPTER II — AWAKENING',
        'CHAPTER III — DESCENT',
        'CHAPTER IV — ENCOUNTER',
        'CHAPTER V — CHOICE',
        'CHAPTER VI — MERGING',
        'EPILOGUE'
    ];

    /* =====================================================
       UTILITY
       ===================================================== */

    function padNum(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    /* =====================================================
       PARTICLE CANVAS — Flow Field
       ===================================================== */

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initParticles() {
        particles = [];
        var count = Math.min(90, Math.floor((canvas.width * canvas.height) / 14000));
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                radius: Math.random() * 1.5 + 0.4,
                alpha: Math.random() * 0.35 + 0.08,
                baseAlpha: Math.random() * 0.35 + 0.08,
                hueShift: Math.random()
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            /* Mouse attraction */
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 220) {
                var force = (220 - dist) / 220;
                p.vx += (dx / dist) * force * 0.018;
                p.vy += (dy / dist) * force * 0.018;
                p.alpha = p.baseAlpha + force * 0.35;
            } else {
                p.alpha += (p.baseAlpha - p.alpha) * 0.02;
            }

            /* Gentle noise drift */
            p.vx += (Math.random() - 0.5) * 0.01;
            p.vy += (Math.random() - 0.5) * 0.01;

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.985;
            p.vy *= 0.985;

            /* Wrap edges */
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;

            var r = Math.max(0.1, p.radius);
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

            var baseColor = p.hueShift > 0.5
                ? 'rgba(192, 132, 252,'
                : 'rgba(103, 232, 249,';
            ctx.fillStyle = baseColor + p.alpha + ')';
            ctx.fill();
        }

        /* Connect nearby particles */
        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var ddx = particles[a].x - particles[b].x;
                var ddy = particles[a].y - particles[b].y;
                var dd = ddx * ddx + ddy * ddy;
                if (dd < 11000) {
                    var lineAlpha = (1 - dd / 11000) * 0.06;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.strokeStyle = 'rgba(192, 132, 252, ' + lineAlpha + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    /* =====================================================
       STARS — generated inside art scenes
       ===================================================== */

    function generateStars(containerId, count) {
        var container = document.getElementById(containerId);
        if (!container) return;
        for (var i = 0; i < count; i++) {
            var star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 4 + 's';
            star.style.animationDuration = (3 + Math.random() * 3) + 's';
            container.appendChild(star);
        }
    }

    /* =====================================================
       REVEAL CHARS — split text into spans
       ===================================================== */

    function initRevealChars() {
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

    /* =====================================================
       PANEL DOTS — build navigation indicators
       ===================================================== */

    function buildPanelDots() {
        panelDotsContainer.innerHTML = '';
        for (var i = 0; i < totalPanels; i++) {
            var dot = document.createElement('div');
            dot.className = 'panel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('data-panel', i);
            dot.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-panel'), 10);
                panels[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            panelDotsContainer.appendChild(dot);
        }
    }

    /* =====================================================
       INTERSECTION OBSERVER — reveal panels
       ===================================================== */

    function setupObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var panel = entry.target;
                var idx = parseInt(panel.getAttribute('data-panel'), 10);

                if (entry.isIntersecting) {
                    panel.classList.add('panel-revealed');

                    /* Reveal title lines */
                    var titleLines = panel.querySelectorAll('.title-line');
                    titleLines.forEach(function (line) {
                        var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
                        setTimeout(function () { line.classList.add('visible'); }, delay);
                    });

                    /* Reveal heading lines */
                    var headingLines = panel.querySelectorAll('.heading-line');
                    headingLines.forEach(function (line, i) {
                        setTimeout(function () { line.classList.add('visible'); }, 200 + i * 160);
                    });

                    /* Reveal chars with stagger */
                    var chars = panel.querySelectorAll('.reveal-chars .char');
                    var charOffset = 400;
                    var charStagger = 22;
                    chars.forEach(function (ch, i) {
                        setTimeout(function () { ch.classList.add('visible'); }, charOffset + i * charStagger);
                    });

                    /* Reveal credits */
                    var creditLines = panel.querySelectorAll('.credit-line');
                    creditLines.forEach(function (cl, i) {
                        setTimeout(function () { cl.classList.add('visible'); }, 1200 + i * 180);
                    });

                    /* Reveal replay button */
                    if (replayBtn && panel.contains(replayBtn)) {
                        setTimeout(function () { replayBtn.classList.add('visible'); }, 2400);
                    }
                }
            });
        }, {
            threshold: 0.25,
            rootMargin: '0px 0px -8% 0px'
        });

        panels.forEach(function (p) { observer.observe(p); });
    }

    /* =====================================================
       SCROLL HANDLING — progress, HUD, parallax
       ===================================================== */

    function updateScrollUI() {
        scrollY = window.scrollY;
        var pageHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = pageHeight > 0 ? (scrollY / pageHeight) * 100 : 0;
        progressFill.style.height = clamp(pct, 0, 100) + '%';

        /* Determine current panel */
        var bestIdx = 0;
        var bestDist = Infinity;
        for (var i = 0; i < panels.length; i++) {
            var rect = panels[i].getBoundingClientRect();
            var center = rect.top + rect.height / 2;
            var d = Math.abs(center - window.innerHeight / 2);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }

        if (bestIdx !== currentPanelIndex) {
            currentPanelIndex = bestIdx;
            hudChapter.textContent = CHAPTER_NAMES[currentPanelIndex] || ('PANEL ' + padNum(currentPanelIndex));
            hudPage.textContent = 'PANEL ' + padNum(currentPanelIndex) + ' / ' + padNum(totalPanels - 1);

            var dots = panelDotsContainer.querySelectorAll('.panel-dot');
            for (var j = 0; j < dots.length; j++) {
                dots[j].classList.toggle('active', j === currentPanelIndex);
            }
        }

        /* Hide scroll cue after start */
        if (!hasStarted && scrollY > 50) {
            hasStarted = true;
            if (scrollCue) scrollCue.style.opacity = '0';
        }

        /* Parallax for art/narrative panels */
        var winH = window.innerHeight;
        for (var k = 0; k < parallaxEls.length; k++) {
            var el = parallaxEls[k];
            var elRect = el.getBoundingClientRect();
            if (elRect.bottom > 0 && elRect.top < winH) {
                var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
                var elCenter = elRect.top + elRect.height / 2;
                var offset = (elCenter - winH / 2) * speed * -1;
                el.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
            }
        }
    }

    /* =====================================================
       MOUSE HANDLING — cursor glow + particle attraction
       ===================================================== */

    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorGlow.style.left = mouseX + 'px';
        cursorGlow.style.top = mouseY + 'px';
        if (!cursorGlow.classList.contains('active')) {
            cursorGlow.classList.add('active');
        }
    }

    function handleMouseLeave() {
        cursorGlow.classList.remove('active');
    }

    /* =====================================================
       REPLAY — reset all reveals and scroll to top
       ===================================================== */

    function resetReveals() {
        var revealedPanels = document.querySelectorAll('.panel-revealed');
        revealedPanels.forEach(function (p) { p.classList.remove('panel-revealed'); });

        var visibleChars = document.querySelectorAll('.char.visible');
        visibleChars.forEach(function (c) { c.classList.remove('visible'); });

        var visibleLines = document.querySelectorAll('.heading-line.visible, .title-line.visible');
        visibleLines.forEach(function (l) { l.classList.remove('visible'); });

        var visibleCredits = document.querySelectorAll('.credit-line.visible');
        visibleCredits.forEach(function (cl) { cl.classList.remove('visible'); });

        if (replayBtn && replayBtn.classList.contains('visible')) {
            replayBtn.classList.remove('visible');
        }

        var revealEls = document.querySelectorAll('.reveal-chars');
        revealEls.forEach(function (el) { delete el.dataset.initialized; });
    }

    function handleReplay() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        hasStarted = false;
        if (scrollCue) scrollCue.style.opacity = '';

        setTimeout(function () {
            resetReveals();
            initRevealChars();
            setupObserver();

            /* Re-trigger cover reveal */
            var coverTitleLines = document.querySelectorAll('.panel-cover .title-line');
            coverTitleLines.forEach(function (line) {
                var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
                setTimeout(function () { line.classList.add('visible'); }, 300 + delay);
            });

            var coverChars = document.querySelectorAll('.panel-cover .reveal-chars .char');
            coverChars.forEach(function (ch, i) {
                setTimeout(function () { ch.classList.add('visible'); }, 800 + i * 20);
            });
        }, 800);
    }

    /* =====================================================
       ANIMATION LOOP
       ===================================================== */

    function loop() {
        drawParticles();
        requestAnimationFrame(loop);
    }

    /* =====================================================
       INIT
       ===================================================== */

    function init() {
        resizeCanvas();
        initParticles();
        buildPanelDots();
        initRevealChars();
        generateStars('stars-1', 40);
        generateStars('stars-2', 20);
        setupObserver();

        hudPage.textContent = 'PANEL 00 / ' + padNum(totalPanels - 1);

        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
        });

        window.addEventListener('scroll', updateScrollUI, { passive: true });
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        if (replayBtn) {
            replayBtn.addEventListener('click', handleReplay);
        }

        /* Trigger cover panel reveal on load */
        var coverTitleLines = document.querySelectorAll('.panel-cover .title-line');
        coverTitleLines.forEach(function (line) {
            var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
            setTimeout(function () { line.classList.add('visible'); }, 400 + delay);
        });

        var coverChars = document.querySelectorAll('.panel-cover .reveal-chars .char');
        coverChars.forEach(function (ch, i) {
            setTimeout(function () { ch.classList.add('visible'); }, 900 + i * 22);
        });

        /* Mark cover as revealed immediately */
        var coverPanel = document.querySelector('.panel-cover');
        if (coverPanel) {
            setTimeout(function () { coverPanel.classList.add('panel-revealed'); }, 100);
        }

        loop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
