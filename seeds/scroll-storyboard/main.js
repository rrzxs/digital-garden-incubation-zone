(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var TOTAL_FRAMES = 7;

    // === DOM References ===

    var progressFill = document.getElementById('progress-fill');
    var frameDotsContainer = document.getElementById('frame-dots');
    var frameCurrentEl = document.getElementById('frame-current');
    var frameTotalEl = document.getElementById('frame-total');
    var themeSwitcher = document.getElementById('theme-switcher');
    var particleCanvas = document.getElementById('particle-field');
    var frames = document.querySelectorAll('.frame');
    var frameDots = [];

    // === State ===

    var currentFrame = 0;
    var scrollVelocity = 0;
    var lastScrollY = window.scrollY;
    var lastScrollTime = performance.now();
    var mouseX = 0;
    var mouseY = 0;
    var particles = [];
    var animFrame = null;

    // === Initialization ===

    frameTotalEl.textContent = String(TOTAL_FRAMES).padStart(2, '0');

    createFrameDots();
    initParticles();
    bindEvents();
    setupRhythmBars();
    tick();

    // === Frame Navigation Dots ===

    function createFrameDots() {
        for (var i = 0; i < TOTAL_FRAMES; i++) {
            var dot = document.createElement('div');
            dot.className = 'frame-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('data-frame', i);
            dot.addEventListener('click', function () {
                var target = document.querySelector('.frame[data-frame="' + this.getAttribute('data-frame') + '"]');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            frameDotsContainer.appendChild(dot);
            frameDots.push(dot);
        }
    }

    // === Theme Switching ===

    function bindEvents() {
        themeSwitcher.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            var theme = btn.getAttribute('data-theme');
            document.documentElement.setAttribute('data-theme', theme);
            themeSwitcher.querySelectorAll('.theme-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
        });

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
    }

    function onScroll() {
        var now = performance.now();
        var dt = now - lastScrollTime;
        if (dt > 0) {
            scrollVelocity = Math.abs(window.scrollY - lastScrollY) / dt;
        }
        lastScrollY = window.scrollY;
        lastScrollTime = now;

        updateProgress();
        updateActiveFrame();
        applyScrollDistortion();
    }

    function onMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    function onResize() {
        if (particleCanvas) {
            particleCanvas.width = window.innerWidth;
            particleCanvas.height = window.innerHeight;
        }
    }

    // === Progress & Active Frame ===

    function updateProgress() {
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
        progressFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }

    function updateActiveFrame() {
        var viewCenter = window.scrollY + window.innerHeight / 2;
        var closest = 0;
        var closestDist = Infinity;

        frames.forEach(function (frame, i) {
            var rect = frame.getBoundingClientRect();
            var frameCenter = rect.top + window.scrollY + rect.height / 2;
            var dist = Math.abs(viewCenter - frameCenter);

            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        });

        if (closest !== currentFrame) {
            currentFrame = closest;
            frameCurrentEl.textContent = String(currentFrame + 1).padStart(2, '0');
            frameDots.forEach(function (d, i) {
                d.classList.toggle('active', i === currentFrame);
            });
        }
    }

    // === Scroll Velocity Distortion ===

    function applyScrollDistortion() {
        var normalizedVelocity = Math.min(scrollVelocity, 3);
        var skew = normalizedVelocity * 0.3;
        var scaleVal = 1 - normalizedVelocity * 0.005;

        frames.forEach(function (frame) {
            if (!frame.classList.contains('in-view')) return;
            var content = frame.querySelector('.scene-content');
            if (content) {
                content.style.transform = 'translateY(0) skewY(' + (Math.random() > 0.5 ? skew : -skew) + 'deg) scale(' + scaleVal + ')';
            }
        });

        clearTimeout(applyScrollDistortion._timer);
        applyScrollDistortion._timer = setTimeout(function () {
            frames.forEach(function (frame) {
                var content = frame.querySelector('.scene-content');
                if (content && frame.classList.contains('in-view')) {
                    content.style.transform = 'translateY(0) skewY(0deg) scale(1)';
                }
            });
        }, 150);
    }

    // === Rhythm Bars Height ===

    function setupRhythmBars() {
        document.querySelectorAll('.rhythm-bar').forEach(function (bar) {
            var h = bar.getAttribute('data-height');
            if (h) {
                bar.style.height = h + '%';
            }
        });
    }

    // === Intersection Observer for Frame Reveal ===

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                revealLines(entry.target);
            } else {
                entry.target.classList.remove('in-view');
                resetLines(entry.target);
            }
        });
    }, {
        threshold: 0.25,
        rootMargin: '0px 0px -10% 0px'
    });

    frames.forEach(function (frame) {
        observer.observe(frame);
    });

    function revealLines(frame) {
        var lines = frame.querySelectorAll('.line[data-delay]');
        lines.forEach(function (line) {
            var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
            setTimeout(function () {
                line.style.opacity = '1';
                line.style.transform = 'translateY(0)';
            }, delay);
        });
    }

    function resetLines(frame) {
        var lines = frame.querySelectorAll('.line[data-delay]');
        lines.forEach(function (line) {
            line.style.opacity = '';
            line.style.transform = '';
        });
    }

    // === Particle System ===

    function initParticles() {
        if (!particleCanvas) return;
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;

        var count = Math.min(60, Math.floor(window.innerWidth / 25));
        particles = [];

        for (var i = 0; i < count; i++) {
            particles.push(createParticle());
        }
    }

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.4 + 0.1,
            life: Math.random()
        };
    }

    function tick() {
        animFrame = requestAnimationFrame(tick);
        drawParticles();
    }

    function drawParticles() {
        if (!particleCanvas) return;
        var ctx = particleCanvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

        var accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        var rgb = hexToRgb(accentColor);

        particles.forEach(function (p) {
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var maxDist = 200;

            if (dist < maxDist) {
                var force = (1 - dist / maxDist) * 0.02;
                p.vx += dx * force;
                p.vy += dy * force;
            }

            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;

            p.life += 0.003;
            if (p.life > 1) p.life = 0;

            var pulseAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.life * Math.PI * 2));

            if (p.x < -20) p.x = particleCanvas.width + 20;
            if (p.x > particleCanvas.width + 20) p.x = -20;
            if (p.y < -20) p.y = particleCanvas.height + 20;
            if (p.y > particleCanvas.height + 20) p.y = -20;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            if (rgb) {
                ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + pulseAlpha + ')';
            } else {
                ctx.fillStyle = 'rgba(255,255,255,' + pulseAlpha + ')';
            }
            ctx.fill();
        });

        // Draw connections between nearby particles
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx2 = particles[i].x - particles[j].x;
                var dy2 = particles[i].y - particles[j].y;
                var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                if (dist2 < 100) {
                    var lineAlpha = (1 - dist2 / 100) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    if (rgb) {
                        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + lineAlpha + ')';
                    } else {
                        ctx.strokeStyle = 'rgba(255,255,255,' + lineAlpha + ')';
                    }
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    // === Utility ===

    function hexToRgb(hex) {
        if (!hex || hex.charAt(0) !== '#') return null;
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }
})();
