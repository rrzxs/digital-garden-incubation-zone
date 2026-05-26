(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var progressFill = document.getElementById('progress-fill');
    var reelCurrent = document.getElementById('reel-current');
    var reelTotal = document.getElementById('reel-total');
    var sceneIndicators = document.getElementById('scene-indicators');
    var filmStrip = document.getElementById('film-strip');
    var grainOverlay = document.getElementById('grain-overlay');
    var cursorGlow = document.getElementById('cursor-glow');
    var countdownEl = document.getElementById('film-countdown');
    var countdownFg = document.getElementById('countdown-fg');
    var countdownNum = document.getElementById('countdown-num');
    var replayBtn = document.getElementById('replay-btn');

    var scenes = document.querySelectorAll('.scene');
    var totalScenes = scenes.length;
    var particles = [];
    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var scrollY = 0;
    var lastScrollY = 0;
    var scrollVelocity = 0;
    var currentSceneIndex = 0;
    var hasStarted = false;
    var animFrameId = null;

    reelTotal.textContent = padNum(totalScenes);

    function padNum(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initParticles() {
        particles = [];
        var count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
                baseAlpha: Math.random() * 0.4 + 0.1
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                var force = (200 - dist) / 200;
                p.vx += (dx / dist) * force * 0.02;
                p.vy += (dy / dist) * force * 0.02;
                p.alpha = p.baseAlpha + force * 0.3;
            } else {
                p.alpha += (p.baseAlpha - p.alpha) * 0.02;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.99;
            p.vy *= 0.99;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(192, 132, 252, ' + p.alpha + ')';
            ctx.fill();
        }

        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var ddx = particles[a].x - particles[b].x;
                var ddy = particles[a].y - particles[b].y;
                var dd = ddx * ddx + ddy * ddy;
                if (dd < 12000) {
                    var lineAlpha = (1 - dd / 12000) * 0.08;
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

    function updateProgress() {
        var pageHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = pageHeight > 0 ? (window.scrollY / pageHeight) * 100 : 0;
        progressFill.style.height = Math.min(100, pct) + '%';

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

    function updateFilmStrip() {
        var scrollFraction = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        var stripTravel = document.documentElement.scrollHeight - window.innerHeight;
        var offset = -(scrollFraction * stripTravel * 0.3);
        filmStrip.style.transform = 'translateY(' + offset + 'px)';
    }

    function revealChars() {
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
                span.setAttribute('data-index', c);
                el.appendChild(span);
            }
        }
    }

    function revealLines() {
        var els = document.querySelectorAll('.reveal-lines');
        for (var e = 0; e < els.length; e++) {
            var el = els[e];
            if (el.dataset.initialized) continue;
            el.dataset.initialized = '1';
            var lines = el.querySelectorAll('.heading-line');
            for (var i = 0; i < lines.length; i++) {
                lines[i].setAttribute('data-delay', i * 150);
            }
        }
    }

    function setupObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var scene = entry.target;
                var idx = parseInt(scene.getAttribute('data-scene'), 10);

                if (entry.isIntersecting) {
                    var titleLines = scene.querySelectorAll('.title-line');
                    titleLines.forEach(function (line) {
                        var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
                        setTimeout(function () { line.classList.add('visible'); }, delay);
                    });

                    var headingLines = scene.querySelectorAll('.heading-line');
                    headingLines.forEach(function (line) {
                        var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
                        setTimeout(function () { line.classList.add('visible'); }, delay + 200);
                    });

                    var chars = scene.querySelectorAll('.reveal-chars .char');
                    var stagger = 25;
                    chars.forEach(function (ch, i) {
                        setTimeout(function () { ch.classList.add('visible'); }, 400 + i * stagger);
                    });

                    var frameCells = scene.querySelectorAll('.frame-cell');
                    frameCells.forEach(function (cell, i) {
                        setTimeout(function () { cell.classList.add('visible'); }, 600 + i * 80);
                    });

                    var creditLines = scene.querySelectorAll('.credit-line');
                    creditLines.forEach(function (cl, i) {
                        setTimeout(function () { cl.classList.add('visible'); }, 800 + i * 200);
                    });

                    var rbtn = scene.querySelector('.replay-btn');
                    if (rbtn) {
                        setTimeout(function () { rbtn.classList.add('visible'); }, 2000);
                    }

                    scene.classList.add('scene-revealed');
                }
            });
        }, {
            threshold: 0.35,
            rootMargin: '0px 0px -10% 0px'
        });

        scenes.forEach(function (s) { observer.observe(s); });
    }

    function triggerCountdown() {
        countdownEl.classList.add('active');
        var count = 3;
        countdownNum.textContent = count;
        var circumference = 283;
        var start = null;
        var duration = 1000;

        function animateCountdown(timestamp) {
            if (!start) start = timestamp;
            var progress = Math.min((timestamp - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            countdownFg.style.strokeDashoffset = circumference * (1 - eased);

            if (progress < 1) {
                requestAnimationFrame(animateCountdown);
            } else {
                count--;
                if (count > 0) {
                    countdownNum.textContent = count;
                    start = null;
                    countdownFg.style.strokeDashoffset = circumference;
                    requestAnimationFrame(animateCountdown);
                } else {
                    setTimeout(function () {
                        countdownEl.classList.remove('active');
                        scenes[1].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            }
        }

        requestAnimationFrame(animateCountdown);
    }

    function handleScroll() {
        scrollY = window.scrollY;
        scrollVelocity = Math.abs(scrollY - lastScrollY);
        lastScrollY = scrollY;

        if (scrollVelocity > 20) {
            grainOverlay.classList.add('active');
        } else {
            grainOverlay.classList.remove('active');
        }

        if (!hasStarted && scrollY > 50) {
            hasStarted = true;
            var cue = document.getElementById('scroll-cue');
            if (cue) cue.style.opacity = '0';
        }

        updateProgress();
        updateFilmStrip();
    }

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

    function loop() {
        drawParticles();
        animFrameId = requestAnimationFrame(loop);
    }

    function init() {
        resizeCanvas();
        initParticles();
        buildSceneIndicators();
        revealChars();
        revealLines();
        setupObserver();

        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
        });

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        var scrollCue = document.getElementById('scroll-cue');
        if (scrollCue) {
            scrollCue.addEventListener('click', triggerCountdown);
        }

        if (replayBtn) {
            replayBtn.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                hasStarted = false;
                var allChars = document.querySelectorAll('.char.visible');
                allChars.forEach(function (c) { c.classList.remove('visible'); });
                var allLines = document.querySelectorAll('.heading-line.visible, .title-line.visible');
                allLines.forEach(function (l) { l.classList.remove('visible'); });
                var allCredits = document.querySelectorAll('.credit-line.visible');
                allCredits.forEach(function (cl) { cl.classList.remove('visible'); });
                var allFrames = document.querySelectorAll('.frame-cell.visible');
                allFrames.forEach(function (f) { f.classList.remove('visible'); });
                if (replayBtn.classList.contains('visible')) {
                    replayBtn.classList.remove('visible');
                }
                var revealed = document.querySelectorAll('.scene-revealed');
                revealed.forEach(function (s) { s.classList.remove('scene-revealed'); });

                var revealCharsEls = document.querySelectorAll('.reveal-chars');
                revealCharsEls.forEach(function (el) { delete el.dataset.initialized; });
                var revealLinesEls = document.querySelectorAll('.reveal-lines');
                revealLinesEls.forEach(function (el) { delete el.dataset.initialized; });

                setTimeout(function () {
                    revealChars();
                    revealLines();
                    setupObserver();
                }, 800);
            });
        }

        var coverTitleLines = document.querySelectorAll('.scene-cover .title-line');
        coverTitleLines.forEach(function (line) {
            var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
            setTimeout(function () { line.classList.add('visible'); }, 300 + delay);
        });

        var coverChars = document.querySelectorAll('.scene-cover .reveal-chars .char');
        coverChars.forEach(function (ch, i) {
            setTimeout(function () { ch.classList.add('visible'); }, 800 + i * 20);
        });

        loop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
