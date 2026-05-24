(function () {
    'use strict';

    var DOM = {
        main: document.getElementById('main-content'),
        progressFill: document.getElementById('progress-fill'),
        chapterDots: document.getElementById('chapter-dots'),
        cursorGlow: document.getElementById('cursor-glow'),
        transitionFlash: document.getElementById('transition-flash'),
        particleCanvas: document.getElementById('particle-field'),
        themeSwitcher: document.getElementById('theme-switcher'),
        spectrumBar: document.getElementById('color-spectrum-bar'),
        colorTooltip: document.getElementById('color-tooltip'),
        gardenCanvas: document.getElementById('garden-canvas'),
        depthFill: document.getElementById('depth-fill'),
        hueValue: document.getElementById('hue-value'),
        chapters: document.querySelectorAll('.chapter'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        swatches: document.querySelectorAll('.swatch'),
        spectrumLines: document.querySelectorAll('.spectrum-line')
    };

    var State = {
        currentIndex: 0,
        mouseX: 0,
        mouseY: 0,
        smoothX: 0,
        smoothY: 0,
        rafId: null,
        particles: [],
        gardenParticles: [],
        isTransitioning: false,
        spectrumBarActive: false,
        gardenAnimId: null
    };

    var Config = {
        particleCount: 80,
        particleMaxSpeed: 0.4,
        particleSize: 2,
        mouseInfluenceRadius: 180,
        mouseForce: 0.02,
        lerpFactor: 0.08,
        observerThreshold: 0.35,
        observerRootMargin: '-15% 0px -15% 0px'
    };

    var CHAPTER_COLORS = [
        { phase: 'origin',    accent: '#818cf8', accentAlt: '#a78bfa', glow: 'rgba(129,140,248,0.12)', particle: 'rgba(129,140,248,0.4)', progress: 0 },
        { phase: 'ember',     accent: '#ef4444', accentAlt: '#f97316', glow: 'rgba(239,68,68,0.12)',    particle: 'rgba(239,68,68,0.4)',   progress: 0.14 },
        { phase: 'aurum',     accent: '#f59e0b', accentAlt: '#eab308', glow: 'rgba(245,158,11,0.12)',   particle: 'rgba(245,158,11,0.4)',  progress: 0.28 },
        { phase: 'verdant',   accent: '#34d399', accentAlt: '#6ee7b7', glow: 'rgba(52,211,153,0.12)',   particle: 'rgba(52,211,153,0.4)',  progress: 0.42 },
        { phase: 'cerulean',  accent: '#3b82f6', accentAlt: '#06b6d4', glow: 'rgba(59,130,246,0.12)',   particle: 'rgba(59,130,246,0.4)',  progress: 0.56 },
        { phase: 'violet',    accent: '#8b5cf6', accentAlt: '#c084fc', glow: 'rgba(139,92,246,0.12)',   particle: 'rgba(139,92,246,0.4)',  progress: 0.70 },
        { phase: 'synthesis', accent: '#e2e8f0', accentAlt: '#f8fafc', glow: 'rgba(226,232,240,0.10)',  particle: 'rgba(200,200,220,0.3)', progress: 0.84 }
    ];

    function init() {
        createChapterDots();
        setupIntersectionObserver();
        setupScrollProgress();
        setupCursorGlow();
        setupThemeSwitcher();
        setupKeyboardNav();
        setupSwatchInteraction();
        setupSpectrumBar();
        initParticles();
        initGardenCanvas();
        revealFirstChapter();
        startLoop();
    }

    function createChapterDots() {
        var count = DOM.chapters.length;
        for (var i = 0; i < count; i++) {
            var dot = document.createElement('div');
            dot.className = 'chapter-dot' + (i === 0 ? ' active' : '');
            dot.dataset.index = i;
            dot.setAttribute('aria-label', 'Chapter ' + (i + 1));
            dot.setAttribute('role', 'button');
            dot.setAttribute('tabindex', '0');
            (function (idx) {
                dot.addEventListener('click', function () {
                    scrollToChapter(idx);
                });
                dot.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        scrollToChapter(idx);
                    }
                });
            })(i);
            DOM.chapterDots.appendChild(dot);
        }
    }

    function scrollToChapter(index) {
        if (index < 0 || index >= DOM.chapters.length) return;
        DOM.chapters[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function setupIntersectionObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var idx = parseInt(entry.target.dataset.chapter);
                if (entry.isIntersecting) {
                    activateChapter(idx);
                }
            });
        }, {
            rootMargin: Config.observerRootMargin,
            threshold: Config.observerThreshold
        });

        DOM.chapters.forEach(function (ch) {
            observer.observe(ch);
        });
    }

    function activateChapter(index) {
        if (State.currentIndex === index) return;

        State.currentIndex = index;
        updateChapterDots(index);
        triggerTransitionFlash();
        revealChapterContent(index);
        transitionChapterColors(index);
        updateChapterSpecificEffects(index);
    }

    function updateChapterDots(activeIndex) {
        var dots = DOM.chapterDots.querySelectorAll('.chapter-dot');
        dots.forEach(function (dot, i) {
            dot.classList.toggle('active', i === activeIndex);
        });
    }

    function triggerTransitionFlash() {
        if (State.isTransitioning) return;
        State.isTransitioning = true;
        DOM.transitionFlash.classList.add('flash');
        setTimeout(function () {
            DOM.transitionFlash.classList.remove('flash');
            State.isTransitioning = false;
        }, 200);
    }

    function revealChapterContent(index) {
        var chapter = DOM.chapters[index];
        if (!chapter) return;
        var content = chapter.querySelector('.scene-content');
        if (!content) return;

        content.classList.add('is-visible');

        var lines = content.querySelectorAll('.reveal-text .line');
        lines.forEach(function (line) {
            var delay = parseInt(line.parentElement.dataset.delay || line.dataset.delay || 0);
            line.style.transitionDelay = delay + 'ms';
        });
    }

    function revealFirstChapter() {
        setTimeout(function () {
            revealChapterContent(0);
        }, 300);
    }

    function transitionChapterColors(index) {
        var colors = CHAPTER_COLORS[index];
        if (!colors) return;

        var root = document.documentElement;
        root.style.setProperty('--color-accent', colors.accent);
        root.style.setProperty('--color-accent-alt', colors.accentAlt);
        root.style.setProperty('--color-glow', colors.glow);
        root.style.setProperty('--particle-color', colors.particle);

        updateSpectrumBarProgress(colors.progress);
    }

    function updateChapterSpecificEffects(index) {
        if (index === 4) {
            animateDepthBar();
        }
        if (index === 5) {
            animateSpectrumReveal();
        }
        if (index === 3) {
            startGardenAnimation();
        } else {
            stopGardenAnimation();
        }
    }

    function animateDepthBar() {
        if (!DOM.depthFill) return;
        DOM.depthFill.style.width = '0%';
        setTimeout(function () {
            DOM.depthFill.style.width = '85%';
        }, 400);
    }

    function animateSpectrumReveal() {
        if (!DOM.spectrumLines || DOM.spectrumLines.length === 0) return;

        DOM.spectrumLines.forEach(function (line, i) {
            line.classList.remove('revealed');
            setTimeout(function () {
                line.classList.add('revealed');
            }, 100 + i * 80);
        });
    }

    function setupScrollProgress() {
        window.addEventListener('scroll', function () {
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            DOM.progressFill.style.height = Math.min(100, progress) + '%';

            var chapterProgress = docHeight > 0 ? scrollTop / docHeight : 0;
            updateSpectrumBarProgress(chapterProgress);
        }, { passive: true });
    }

    function setupCursorGlow() {
        var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) return;

        document.addEventListener('mousemove', function (e) {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
            DOM.cursorGlow.classList.add('visible');
        });

        document.addEventListener('mouseleave', function () {
            DOM.cursorGlow.classList.remove('visible');
        });
    }

    function setupThemeSwitcher() {
        DOM.themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', theme);
                DOM.themeBtns.forEach(function (b) {
                    b.classList.toggle('active', b.dataset.theme === theme);
                });
                triggerTransitionFlash();
            });
        });
    }

    function setupKeyboardNav() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                scrollToChapter(Math.min(State.currentIndex + 1, DOM.chapters.length - 1));
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                scrollToChapter(Math.max(State.currentIndex - 1, 0));
            }
        });
    }

    function setupSwatchInteraction() {
        if (!DOM.swatches || DOM.swatches.length === 0) return;

        DOM.swatches.forEach(function (swatch) {
            swatch.addEventListener('mouseenter', function (e) {
                var name = swatch.dataset.name || '';
                var bg = swatch.style.background || '';
                DOM.colorTooltip.textContent = name;
                DOM.colorTooltip.style.borderColor = bg;
                DOM.colorTooltip.classList.add('visible');
            });

            swatch.addEventListener('mousemove', function (e) {
                DOM.colorTooltip.style.left = (e.clientX + 14) + 'px';
                DOM.colorTooltip.style.top = (e.clientY - 30) + 'px';
            });

            swatch.addEventListener('mouseleave', function () {
                DOM.colorTooltip.classList.remove('visible');
            });

            swatch.addEventListener('click', function () {
                var bg = swatch.style.background || '';
                DOM.transitionFlash.style.background = bg;
                DOM.transitionFlash.classList.add('flash');
                setTimeout(function () {
                    DOM.transitionFlash.classList.remove('flash');
                    DOM.transitionFlash.style.background = '';
                }, 300);
            });
        });
    }

    function setupSpectrumBar() {
        DOM.spectrumBar.classList.add('active');

        var marker = document.createElement('div');
        marker.className = 'progress-marker';
        marker.style.left = '0%';
        DOM.spectrumBar.appendChild(marker);
    }

    function updateSpectrumBarProgress(progress) {
        var marker = DOM.spectrumBar.querySelector('.progress-marker');
        if (marker) {
            marker.style.left = (progress * 100) + '%';
        }
    }

    function initParticles() {
        var canvas = DOM.particleCanvas;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        State.particles = [];
        for (var i = 0; i < Config.particleCount; i++) {
            State.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * Config.particleMaxSpeed,
                vy: (Math.random() - 0.5) * Config.particleMaxSpeed,
                size: Math.random() * Config.particleSize + 0.5,
                opacity: Math.random() * 0.5 + 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }

        window.addEventListener('resize', function () {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    function getParticleColor(alpha) {
        var style = getComputedStyle(document.documentElement);
        var color = style.getPropertyValue('--particle-color').trim();
        if (color.startsWith('rgba')) {
            return color.replace(/[\d.]+\)$/, alpha + ')');
        }
        return 'rgba(129, 140, 248, ' + alpha + ')';
    }

    function drawParticles(time) {
        var canvas = DOM.particleCanvas;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var mx = State.smoothX;
        var my = State.smoothY;

        State.particles.forEach(function (p, i) {
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < Config.mouseInfluenceRadius && dist > 0) {
                var force = (1 - dist / Config.mouseInfluenceRadius) * Config.mouseForce;
                p.vx += dx / dist * force;
                p.vy += dy / dist * force;
            }

            p.vx *= 0.98;
            p.vy *= 0.98;

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            var pulseOpacity = p.opacity * (0.7 + 0.3 * Math.sin(time * 0.001 + p.phase));

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = getParticleColor(pulseOpacity);
            ctx.fill();

            for (var j = i + 1; j < State.particles.length; j++) {
                var other = State.particles[j];
                var pdx = p.x - other.x;
                var pdy = p.y - other.y;
                var pdist = Math.sqrt(pdx * pdx + pdy * pdy);

                if (pdist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(other.x, other.y);
                    var lineAlpha = (1 - pdist / 120) * 0.15;
                    ctx.strokeStyle = getParticleColor(lineAlpha);
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        });
    }

    function initGardenCanvas() {
        if (!DOM.gardenCanvas) return;

        var canvas = DOM.gardenCanvas;
        var rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = Math.min(400, rect.width || 400);
        canvas.height = 200;

        State.gardenParticles = [];
        for (var i = 0; i < 60; i++) {
            State.gardenParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: 0,
                vy: 0,
                size: Math.random() * 4 + 2,
                hue: 120 + Math.random() * 40 - 20,
                life: Math.random(),
                phase: Math.random() * Math.PI * 2
            });
        }

        canvas.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;

            State.gardenParticles.forEach(function (p) {
                var dx = mx - p.x;
                var dy = my - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 60 && dist > 0) {
                    p.vx -= dx / dist * 0.5;
                    p.vy -= dy / dist * 0.5;
                }
            });
        });
    }

    function startGardenAnimation() {
        if (State.gardenAnimId || !DOM.gardenCanvas) return;

        function drawGarden(time) {
            var canvas = DOM.gardenCanvas;
            var ctx = canvas.getContext('2d');

            ctx.fillStyle = 'rgba(4, 12, 8, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            State.gardenParticles.forEach(function (p) {
                p.vx += (Math.random() - 0.5) * 0.1;
                p.vy += (Math.random() - 0.5) * 0.1;
                p.vx *= 0.95;
                p.vy *= 0.95;

                p.x += p.vx + Math.sin(time * 0.001 + p.phase) * 0.3;
                p.y += p.vy + Math.cos(time * 0.0008 + p.phase) * 0.2;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                var brightness = 40 + Math.sin(time * 0.002 + p.phase) * 15;
                var alpha = 0.3 + p.life * 0.4;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(' + p.hue + ', 70%, ' + brightness + '%, ' + alpha + ')';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(' + p.hue + ', 70%, ' + brightness + '%, ' + (alpha * 0.15) + ')';
                ctx.fill();
            });

            State.gardenAnimId = requestAnimationFrame(drawGarden);
        }

        State.gardenAnimId = requestAnimationFrame(drawGarden);
    }

    function stopGardenAnimation() {
        if (State.gardenAnimId) {
            cancelAnimationFrame(State.gardenAnimId);
            State.gardenAnimId = null;
        }
    }

    function startLoop() {
        function tick(time) {
            State.smoothX += (State.mouseX - State.smoothX) * Config.lerpFactor;
            State.smoothY += (State.mouseY - State.smoothY) * Config.lerpFactor;

            DOM.cursorGlow.style.left = State.smoothX + 'px';
            DOM.cursorGlow.style.top = State.smoothY + 'px';

            drawParticles(time);

            State.rafId = requestAnimationFrame(tick);
        }
        State.rafId = requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
