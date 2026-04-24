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
        rhythmRing: document.getElementById('rhythm-ring'),
        morphWord: document.getElementById('morph-word'),
        chapters: document.querySelectorAll('.chapter'),
        themeBtns: document.querySelectorAll('.theme-btn')
    };

    var State = {
        currentIndex: 0,
        mouseX: 0,
        mouseY: 0,
        smoothX: 0,
        smoothY: 0,
        rafId: null,
        particles: [],
        morphWords: ['DECODE', 'CREATE', 'DESIGN', 'BREATHE', 'EVOLVE', 'DREAM', 'BUILD', 'EMERGE'],
        morphIndex: 0,
        morphInterval: null,
        isTransitioning: false
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

    function init() {
        createChapterDots();
        setupIntersectionObserver();
        setupScrollProgress();
        setupCursorGlow();
        setupThemeSwitcher();
        setupKeyboardNav();
        initParticles();
        startMorphCycle();
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
        updateMorphForChapter(index);
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

    function setupScrollProgress() {
        window.addEventListener('scroll', function () {
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            DOM.progressFill.style.height = Math.min(100, progress) + '%';
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
                updateParticleColors();
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

    function updateParticleColors() {
        // Colors update automatically via canvas drawing with CSS var reads
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

    function startMorphCycle() {
        if (!DOM.morphWord) return;

        State.morphInterval = setInterval(function () {
            var currentText = DOM.morphWord.textContent;
            var nextWord = State.morphWords[State.morphIndex % State.morphWords.length];
            State.morphIndex++;

            morphText(currentText, nextWord);
        }, 3000);
    }

    function morphText(from, to) {
        if (!DOM.morphWord) return;

        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
        var maxLength = Math.max(from.length, to.length);
        var iterations = 0;
        var maxIterations = 12;

        var interval = setInterval(function () {
            var result = '';
            for (var i = 0; i < to.length; i++) {
                if (i < to.length && iterations >= maxIterations) {
                    result += to[i];
                } else if (i < to.length && Math.random() < iterations / maxIterations) {
                    result += to[i];
                } else {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            DOM.morphWord.textContent = result;

            iterations++;
            if (iterations > maxIterations) {
                clearInterval(interval);
                DOM.morphWord.textContent = to;
            }
        }, 40);
    }

    function updateMorphForChapter(index) {
        if (!DOM.morphWord) return;
        if (index === 3) {
            State.morphIndex = 0;
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
