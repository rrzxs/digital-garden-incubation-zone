(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var TOTAL_CARDS = 8;
    var currentSlide = 0;
    var isDragging = false;
    var dragStartX = 0;
    var dragOffsetX = 0;
    var trackOffsetX = 0;
    var mouseX = 0;
    var mouseY = 0;
    var activeDemos = {};
    var rafId = null;
    var lastTime = performance.now();
    var frameCount = 0;
    var fps = 60;
    var currentMode = 'reel';
    var animFrameId = null;

    var track = document.getElementById('reel-track');
    var viewport = document.getElementById('reel-viewport');
    var progressFill = document.getElementById('progress-fill');
    var progressDots = document.getElementById('progress-dots');
    var fpsCounter = document.getElementById('fps-counter');
    var sceneIndicator = document.getElementById('scene-indicator');
    var cursorGlow = document.getElementById('cursor-glow');
    var flash = document.getElementById('transition-flash');
    var cards = [];

    function init() {
        cards = Array.from(track.querySelectorAll('.reel-card'));
        buildProgressDots();
        bindThemeToggle();
        bindModeToggle();
        bindKeyboard();
        bindDrag();
        bindCursorGlow();
        bindRevealDemo();
        showCard(0, false);
        initAllCanvases();
        startLoop();
    }

    function buildProgressDots() {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < TOTAL_CARDS; i++) {
            var btn = document.createElement('button');
            btn.className = 'progress-dot' + (i === 0 ? ' active' : '');
            btn.setAttribute('data-index', i);
            btn.setAttribute('aria-label', '\u7B2C' + (i + 1) + '\u9875');
            btn.addEventListener('click', function () {
                goToSlide(parseInt(this.getAttribute('data-index'), 10));
            });
            frag.appendChild(btn);
        }
        progressDots.appendChild(frag);
    }

    function goToSlide(index) {
        if (index < 0 || index >= TOTAL_CARDS || index === currentSlide) return;
        triggerFlash();
        currentSlide = index;
        updateTrack();
    }

    function updateTrack() {
        if (currentMode === 'grid') return;

        var offset = -currentSlide * 100;
        track.style.transform = 'translateX(' + offset + '%)';
        progressFill.style.width = ((currentSlide + 1) / TOTAL_CARDS * 100) + '%';
        sceneIndicator.textContent = pad(currentSlide + 1) + ' / ' + pad(TOTAL_CARDS);

        var dots = progressDots.querySelectorAll('.progress-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('active', i === currentSlide);
        }

        showCard(currentSlide, true);
    }

    function showCard(index, animate) {
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            if (i === index) {
                c.classList.add('is-visible');
                c.classList.remove('is-leaving');
            } else if (Math.abs(i - index) === 1 && animate) {
                c.classList.remove('is-visible');
                c.classList.add('is-leaving');
            } else {
                c.classList.remove('is-visible', 'is-leaving');
            }
        }
    }

    function triggerFlash() {
        var accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        flash.style.background = 'radial-gradient(circle at center, ' + accent + ', transparent 70%)';
        flash.classList.remove('fire');
        void flash.offsetWidth;
        flash.classList.add('fire');
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function bindThemeToggle() {
        var btns = document.querySelectorAll('#theme-toggle .theme-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var theme = btn.getAttribute('data-theme');
                document.body.setAttribute('data-theme', theme === 'deep-ocean' ? '' : theme);
                if (!theme || theme === 'deep-ocean') {
                    document.body.removeAttribute('data-theme');
                }
                updateThemeAccent(theme);
            });
        });
    }

    function updateThemeAccent(theme) {
        var map = {
            'deep-ocean': '#6366f1',
            'aurora': '#10b981',
            'ember': '#f59e0b',
            'void': '#a855f7'
        };
        document.documentElement.style.setProperty('--color-accent', map[theme] || '#6366f1');
    }

    function bindModeToggle() {
        var btns = document.querySelectorAll('#mode-toggle .mode-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var mode = btn.getAttribute('data-mode');
                currentMode = mode;
                if (mode === 'grid') {
                    track.classList.add('grid-mode');
                    document.body.classList.add('grid-active');
                    cards.forEach(function (c) { c.classList.add('is-visible'); });
                } else {
                    track.classList.remove('grid-mode');
                    document.body.classList.remove('grid-active');
                    updateTrack();
                }
            });
        });
    }

    function bindKeyboard() {
        document.addEventListener('keydown', function (e) {
            if (currentMode !== 'reel') return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                goToSlide(currentSlide + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                goToSlide(currentSlide - 1);
            }
        });
    }

    function bindDrag() {
        viewport.addEventListener('mousedown', onDragStart);
        viewport.addEventListener('touchstart', onDragStart, { passive: false });
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('touchmove', onDragMove, { passive: false });
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchend', onDragEnd);

        viewport.addEventListener('wheel', function (e) {
            if (currentMode !== 'reel') return;
            e.preventDefault();
            var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) < 30) return;
            if (delta > 0) goToSlide(currentSlide + 1);
            else goToSlide(currentSlide - 1);
        }, { passive: false });
    }

    function onDragStart(e) {
        if (currentMode !== 'reel') return;
        if (e.target.closest('.spring-box')) return;
        isDragging = true;
        dragStartX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        trackOffsetX = -currentSlide * viewport.offsetWidth;
        track.classList.add('is-dragging');
    }

    function onDragMove(e) {
        if (!isDragging) return;
        var x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        dragOffsetX = x - dragStartX;
        track.style.transform = 'translateX(' + (trackOffsetX + dragOffsetX) + 'px)';
    }

    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('is-dragging');
        var threshold = viewport.offsetWidth * 0.15;
        if (dragOffsetX < -threshold) goToSlide(currentSlide + 1);
        else if (dragOffsetX > threshold) goToSlide(currentSlide - 1);
        else updateTrack();
        dragOffsetX = 0;
    }

    function bindCursorGlow() {
        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });
    }

    function bindRevealDemo() {
        var mask = document.getElementById('reveal-mask');
        if (!mask) return;
        var content = mask.querySelector('.reveal-content');
        mask.addEventListener('mousemove', function (e) {
            var rect = mask.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
            var y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
            content.style.clipPath = 'circle(35% at ' + x + '% ' + y + '%)';
        });
        mask.addEventListener('mouseleave', function () {
            content.style.clipPath = 'circle(0% at 50% 50%)';
        });
    }

    function initAllCanvases() {
        initReelCanvas();
        initSpringDemo();
        initRippleDemo();
        initMorphDemo();
        initParticlesDemo();
        initGlitchDemo();
        initOrbitsDemo();
    }

    function getCanvasCtx(id) {
        var c = document.getElementById(id);
        if (!c) return null;
        var rect = c.getBoundingClientRect();
        c.width = rect.width * window.devicePixelRatio;
        c.height = rect.height * window.devicePixelRatio;
        var ctx = c.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        return { canvas: c, ctx: ctx, w: rect.width, h: rect.height };
    }

    function initReelCanvas() {
        var c = document.getElementById('reel-canvas');
        if (!c) return;
        c.width = window.innerWidth * window.devicePixelRatio;
        c.height = window.innerHeight * window.devicePixelRatio;
        var ctx = c.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        var particles = [];
        var count = 80;
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
                o: Math.random() * 0.4 + 0.1
            });
        }

        activeDemos.reel = { ctx: ctx, w: window.innerWidth, h: window.innerHeight, particles: particles, canvas: c };
    }

    function updateReelCanvas() {
        var d = activeDemos.reel;
        if (!d) return;
        d.ctx.clearRect(0, 0, d.w, d.h);
        var ps = d.particles;
        for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 1) {
                p.vx += dx / dist * 0.02;
                p.vy += dy / dist * 0.02;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.99;
            p.vy *= 0.99;
            if (p.x < 0) p.x = d.w;
            if (p.x > d.w) p.x = 0;
            if (p.y < 0) p.y = d.h;
            if (p.y > d.h) p.y = 0;
            d.ctx.beginPath();
            d.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            d.ctx.fillStyle = 'rgba(255, 255, 255, ' + p.o + ')';
            d.ctx.fill();
        }

        for (var i = 0; i < ps.length; i++) {
            for (var j = i + 1; j < ps.length; j++) {
                var dx2 = ps[i].x - ps[j].x;
                var dy2 = ps[i].y - ps[j].y;
                var d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                if (d2 < 120) {
                    d.ctx.beginPath();
                    d.ctx.moveTo(ps[i].x, ps[i].y);
                    d.ctx.lineTo(ps[j].x, ps[j].y);
                    d.ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.06 * (1 - d2 / 120)).toFixed(3) + ')';
                    d.ctx.stroke();
                }
            }
        }
    }

    function initSpringDemo() {
        var box = document.getElementById('spring-box');
        if (!box) return;
        var demoArea = box.closest('.card-demo');
        var centerX = 0;
        var centerY = 0;
        var offsetX = 0;
        var offsetY = 0;
        var velX = 0;
        var velY = 0;
        var dragging = false;
        var springK = 0.08;
        var damping = 0.85;

        activeDemos.spring = { box: box, velX: 0, velY: 0, offsetX: 0, offsetY: 0, dragging: false };

        box.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            dragging = true;
            activeDemos.spring.dragging = true;
        });

        box.addEventListener('touchstart', function (e) {
            e.stopPropagation();
            dragging = true;
            activeDemos.spring.dragging = true;
        }, { passive: false });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var rect = demoArea.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            activeDemos.spring.offsetX = e.clientX - cx;
            activeDemos.spring.offsetY = e.clientY - cy;
        });

        document.addEventListener('touchmove', function (e) {
            if (!dragging) return;
            var rect = demoArea.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            activeDemos.spring.offsetX = e.touches[0].clientX - cx;
            activeDemos.spring.offsetY = e.touches[0].clientY - cy;
        }, { passive: false });

        document.addEventListener('mouseup', function () {
            dragging = false;
            activeDemos.spring.dragging = false;
        });

        document.addEventListener('touchend', function () {
            dragging = false;
            activeDemos.spring.dragging = false;
        });
    }

    function updateSpringDemo() {
        var d = activeDemos.spring;
        if (!d) return;
        if (!d.dragging) {
            d.velX += -d.offsetX * 0.08;
            d.velY += -d.offsetY * 0.08;
            d.velX *= 0.85;
            d.velY *= 0.85;
            d.offsetX += d.velX;
            d.offsetY += d.velY;
        }
        d.box.style.transform = 'translate(' + d.offsetX.toFixed(1) + 'px, ' + d.offsetY.toFixed(1) + 'px)';
    }

    function initRippleDemo() {
        var r = getCanvasCtx('ripple-canvas');
        if (!r) return;
        r.ripples = [];
        activeDemos.ripple = r;

        var canvas = r.canvas;
        canvas.addEventListener('click', function (e) {
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            r.ripples.push({ x: x, y: y, radius: 0, maxRadius: 120, opacity: 1 });
        });
    }

    function updateRippleDemo() {
        var d = activeDemos.ripple;
        if (!d) return;
        d.ctx.clearRect(0, 0, d.w, d.h);
        for (var i = d.ripples.length - 1; i >= 0; i--) {
            var rp = d.ripples[i];
            rp.radius += 2;
            rp.opacity = 1 - rp.radius / rp.maxRadius;
            if (rp.opacity <= 0) { d.ripples.splice(i, 1); continue; }
            d.ctx.beginPath();
            d.ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
            d.ctx.strokeStyle = 'rgba(6, 182, 212, ' + rp.opacity.toFixed(2) + ')';
            d.ctx.lineWidth = 2;
            d.ctx.stroke();
            d.ctx.beginPath();
            d.ctx.arc(rp.x, rp.y, rp.radius * 0.6, 0, Math.PI * 2);
            d.ctx.strokeStyle = 'rgba(6, 182, 212, ' + (rp.opacity * 0.5).toFixed(2) + ')';
            d.ctx.lineWidth = 1;
            d.ctx.stroke();
        }
    }

    function initMorphDemo() {
        var r = getCanvasCtx('morph-canvas');
        if (!r) return;
        r.time = 0;
        activeDemos.morph = r;
    }

    function updateMorphDemo() {
        var d = activeDemos.morph;
        if (!d) return;
        d.time += 0.012;
        d.ctx.clearRect(0, 0, d.w, d.h);

        var cx = d.w / 2;
        var cy = d.h / 2;
        var baseR = Math.min(d.w, d.h) * 0.3;

        for (var layer = 0; layer < 3; layer++) {
            d.ctx.beginPath();
            var points = 120;
            for (var i = 0; i <= points; i++) {
                var angle = (i / points) * Math.PI * 2;
                var noise1 = Math.sin(angle * 5 + d.time * (1 + layer * 0.3)) * 0.15;
                var noise2 = Math.sin(angle * 3 - d.time * 0.7) * 0.1;
                var morphT = (Math.sin(d.time * 0.5 + layer) + 1) / 2;
                var starFactor = 1 + morphT * 0.3 * Math.cos(angle * 4 + d.time);
                var radius = baseR * (0.5 + layer * 0.22) * (1 + noise1 + noise2) * starFactor;
                var x = cx + Math.cos(angle) * radius;
                var y = cy + Math.sin(angle) * radius;
                if (i === 0) d.ctx.moveTo(x, y);
                else d.ctx.lineTo(x, y);
            }
            d.ctx.closePath();
            var hue = (d.time * 20 + layer * 40) % 360;
            d.ctx.strokeStyle = 'hsla(' + hue + ', 70%, 65%, ' + (0.5 - layer * 0.12).toFixed(2) + ')';
            d.ctx.lineWidth = 1.5;
            d.ctx.stroke();
        }
    }

    function initParticlesDemo() {
        var r = getCanvasCtx('particles-canvas');
        if (!r) return;
        r.particles = [];
        for (var i = 0; i < 100; i++) {
            r.particles.push({
                x: Math.random() * r.w,
                y: Math.random() * r.h,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                r: Math.random() * 2 + 1,
                hue: Math.random() * 60 + 120
            });
        }
        activeDemos.particles = r;
        var canvas = r.canvas;
        canvas.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            activeDemos.particles.mx = e.clientX - rect.left;
            activeDemos.particles.my = e.clientY - rect.top;
        });
        canvas.addEventListener('mouseleave', function () {
            activeDemos.particles.mx = -999;
            activeDemos.particles.my = -999;
        });
        r.mx = -999;
        r.my = -999;
    }

    function updateParticlesDemo() {
        var d = activeDemos.particles;
        if (!d) return;
        d.ctx.clearRect(0, 0, d.w, d.h);
        var ps = d.particles;
        for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            if (d.mx > 0) {
                var dx = d.mx - p.x;
                var dy = d.my - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100 && dist > 1) {
                    p.vx += dx / dist * 0.3;
                    p.vy += dy / dist * 0.3;
                }
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            if (p.x < 0 || p.x > d.w) p.vx *= -1;
            if (p.y < 0 || p.y > d.h) p.vy *= -1;
            p.x = Math.max(0, Math.min(d.w, p.x));
            p.y = Math.max(0, Math.min(d.h, p.y));

            d.ctx.beginPath();
            d.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            d.ctx.fillStyle = 'hsla(' + p.hue + ', 70%, 65%, 0.8)';
            d.ctx.fill();
        }
    }

    function initGlitchDemo() {
        var el = document.getElementById('glitch-text');
        if (!el) return;
        var chars = 'GLITCH!@#$%^&*()_+={}[]|;:<>?/~`';
        var original = 'GLITCH';
        var scrambleInterval = null;

        activeDemos.glitch = { el: el, original: original, chars: chars };

        el.addEventListener('mouseenter', function () {
            var count = 0;
            scrambleInterval = setInterval(function () {
                var text = '';
                for (var i = 0; i < original.length; i++) {
                    if (Math.random() < 0.4) {
                        text += chars[Math.floor(Math.random() * chars.length)];
                    } else {
                        text += original[i];
                    }
                }
                el.textContent = text;
                el.setAttribute('data-text', text);
                count++;
                if (count > 20) {
                    clearInterval(scrambleInterval);
                    el.textContent = original;
                    el.setAttribute('data-text', original);
                }
            }, 60);
        });

        el.addEventListener('mouseleave', function () {
            clearInterval(scrambleInterval);
            el.textContent = original;
            el.setAttribute('data-text', original);
        });
    }

    function initOrbitsDemo() {
        var r = getCanvasCtx('orbits-canvas');
        if (!r) return;
        r.time = 0;
        r.orbitParticles = [];
        var orbits = [0.15, 0.25, 0.35, 0.42];
        var sizes = [50, 30, 20, 15];
        var idx = 0;
        for (var o = 0; o < orbits.length; o++) {
            for (var i = 0; i < sizes[o]; i++) {
                var angle = (i / sizes[o]) * Math.PI * 2 + o * 0.5;
                r.orbitParticles.push({
                    orbit: orbits[o],
                    angle: angle,
                    speed: (0.3 + Math.random() * 0.4) * (o % 2 === 0 ? 1 : -1),
                    r: Math.random() * 1.5 + 0.5,
                    hue: 300 + o * 25 + Math.random() * 20
                });
                idx++;
            }
        }
        activeDemos.orbits = r;
    }

    function updateOrbitsDemo() {
        var d = activeDemos.orbits;
        if (!d) return;
        d.time += 0.008;
        d.ctx.clearRect(0, 0, d.w, d.h);

        var cx = d.w / 2;
        var cy = d.h / 2;
        var maxR = Math.min(d.w, d.h) * 0.45;

        for (var o = 0; o < 4; o++) {
            var orbitR = maxR * [0.15, 0.25, 0.35, 0.42][o];
            d.ctx.beginPath();
            d.ctx.ellipse(cx, cy, orbitR, orbitR * 0.6, o * 0.3, 0, Math.PI * 2);
            d.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            d.ctx.lineWidth = 1;
            d.ctx.stroke();
        }

        var ps = d.orbitParticles;
        for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            p.angle += p.speed * 0.01;
            var orbitR = maxR * p.orbit;
            var tiltIdx = Math.floor(p.orbit * 10) % 4;
            var tilt = tiltIdx * 0.3;
            var x = cx + Math.cos(p.angle) * orbitR * Math.cos(tilt) - Math.sin(p.angle) * orbitR * 0.6 * Math.sin(tilt);
            var y = cy + Math.cos(p.angle) * orbitR * Math.sin(tilt) + Math.sin(p.angle) * orbitR * 0.6 * Math.cos(tilt);
            d.ctx.beginPath();
            d.ctx.arc(x, y, p.r, 0, Math.PI * 2);
            d.ctx.fillStyle = 'hsla(' + p.hue + ', 70%, 65%, 0.7)';
            d.ctx.fill();
        }
    }

    function startLoop() {
        function frame(now) {
            animFrameId = requestAnimationFrame(frame);

            frameCount++;
            if (now - lastTime >= 1000) {
                fps = frameCount;
                frameCount = 0;
                lastTime = now;
                fpsCounter.textContent = fps + ' FPS';
            }

            updateReelCanvas();
            updateSpringDemo();
            updateRippleDemo();
            updateMorphDemo();
            updateParticlesDemo();
            updateOrbitsDemo();
        }
        animFrameId = requestAnimationFrame(frame);
    }

    function handleResize() {
        if (activeDemos.reel) {
            var rc = activeDemos.reel.canvas;
            rc.width = window.innerWidth * window.devicePixelRatio;
            rc.height = window.innerHeight * window.devicePixelRatio;
            activeDemos.reel.ctx = rc.getContext('2d');
            activeDemos.reel.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            activeDemos.reel.w = window.innerWidth;
            activeDemos.reel.h = window.innerHeight;
        }
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 200);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
