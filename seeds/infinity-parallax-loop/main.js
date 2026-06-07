(function () {
    'use strict';

    var EPS = 0.0001;

    var state = {
        mouseX: 0.5,
        mouseY: 0.5,
        targetMouseX: 0.5,
        targetMouseY: 0.5,
        paused: false,
        depth: 1,
        targetDepth: 1,
        time: 0,
        fps: 60,
        frameCount: 0,
        lastFpsTime: performance.now()
    };

    var layers = [];
    var particles = [];
    var orbiters = [];
    var pulses = [];
    var canvasParticles = [];
    var canvasCtx = null;
    var canvasEl = null;

    function init() {
        cacheLayers();
        generateStars(200);
        generateRings(6);
        generateFloaters(12);
        generateOrbiters(8);
        generateDomParticles(60);
        initCanvas();
        bindEvents();
        requestAnimationFrame(tick);
        updateStats();
    }

    function cacheLayers() {
        var els = document.querySelectorAll('.parallax-layer');
        for (var i = 0; i < els.length; i++) {
            layers.push({
                el: els[i],
                depth: parseFloat(els[i].getAttribute('data-depth')) || 0
            });
        }
    }

    function generateStars(count) {
        var container = document.getElementById('layer-stars');
        if (!container) return;
        for (var i = 0; i < count; i++) {
            var star = document.createElement('div');
            star.className = 'star star-twinkle';
            var size = Math.random() * 2.5 + 0.5;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.left = (Math.random() * 100) + '%';
            star.style.top = (Math.random() * 100) + '%';
            star.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
            star.style.setProperty('--delay', (Math.random() * 5) + 's');
            star.style.setProperty('--min-op', (0.1 + Math.random() * 0.2).toFixed(2));
            star.style.setProperty('--max-op', (0.5 + Math.random() * 0.5).toFixed(2));
            container.appendChild(star);
        }
    }

    function generateRings(count) {
        var container = document.getElementById('layer-rings');
        if (!container) return;
        for (var i = 0; i < count; i++) {
            var ring = document.createElement('div');
            ring.className = 'ring';
            var size = 150 + i * 120 + Math.random() * 80;
            ring.style.width = size + 'px';
            ring.style.height = size + 'px';
            ring.style.setProperty('--dur', (6 + i * 3 + Math.random() * 4) + 's');
            ring.style.setProperty('--delay', (i * 0.8) + 's');
            container.appendChild(ring);
        }
    }

    function generateFloaters(count) {
        var container = document.getElementById('layer-floaters');
        if (!container) return;
        for (var i = 0; i < count; i++) {
            var f = document.createElement('div');
            f.className = 'floater';
            var size = 30 + Math.random() * 100;
            f.style.width = size + 'px';
            f.style.height = size + 'px';
            f.style.left = (Math.random() * 100) + '%';
            f.style.top = (Math.random() * 100) + '%';
            f.style.setProperty('--dur', (8 + Math.random() * 10) + 's');
            f.style.setProperty('--delay', (Math.random() * 6) + 's');
            f.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
            f.style.setProperty('--dy', (Math.random() * 60 - 30) + 'px');
            container.appendChild(f);
        }
    }

    function generateOrbiters(count) {
        var container = document.getElementById('layer-orbiters');
        if (!container) return;
        for (var i = 0; i < count; i++) {
            var orbitRadius = 80 + i * 40 + Math.random() * 30;
            var speed = 0.3 + Math.random() * 0.6;
            var size = 4 + Math.random() * 6;
            var phase = Math.random() * Math.PI * 2;

            var trail = document.createElement('div');
            trail.className = 'orbiter-trail';
            trail.style.width = (orbitRadius * 2) + 'px';
            trail.style.height = (orbitRadius * 2) + 'px';
            trail.style.opacity = '0.15';
            container.appendChild(trail);

            var orbiter = document.createElement('div');
            orbiter.className = 'orbiter';
            orbiter.style.width = size + 'px';
            orbiter.style.height = size + 'px';

            var dot = document.createElement('div');
            dot.className = 'orbiter-dot';
            orbiter.appendChild(dot);
            container.appendChild(orbiter);

            orbiters.push({
                el: orbiter,
                radius: orbitRadius,
                speed: speed,
                phase: phase,
                size: size
            });
        }
    }

    function generateDomParticles(count) {
        var container = document.getElementById('layer-particles');
        if (!container) return;
        for (var i = 0; i < count; i++) {
            var p = document.createElement('div');
            p.className = 'particle';
            var size = 2 + Math.random() * 4;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = (Math.random() * 100) + '%';
            p.style.top = (Math.random() * 100) + '%';
            p.style.opacity = (0.2 + Math.random() * 0.5).toFixed(2);
            container.appendChild(p);

            particles.push({
                el: p,
                baseX: Math.random() * 100,
                baseY: Math.random() * 100,
                speedX: (Math.random() - 0.5) * 0.02,
                speedY: (Math.random() - 0.5) * 0.02,
                phase: Math.random() * Math.PI * 2,
                amplitude: 0.5 + Math.random() * 2
            });
        }
    }

    function initCanvas() {
        canvasEl = document.getElementById('particle-canvas');
        if (!canvasEl) return;
        canvasCtx = canvasEl.getContext('2d');
        resizeCanvas();
        for (var i = 0; i < 120; i++) {
            canvasParticles.push({
                x: Math.random() * canvasEl.width,
                y: Math.random() * canvasEl.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: 1 + Math.random() * 2,
                alpha: 0.1 + Math.random() * 0.3,
                life: Math.random() * 1000
            });
        }
    }

    function resizeCanvas() {
        if (!canvasEl) return;
        canvasEl.width = window.innerWidth;
        canvasEl.height = window.innerHeight;
    }

    function bindEvents() {
        var viewport = document.getElementById('parallax-viewport');
        var cursorGlow = document.getElementById('cursor-glow');

        document.addEventListener('mousemove', function (e) {
            state.targetMouseX = e.clientX / window.innerWidth;
            state.targetMouseY = e.clientY / window.innerHeight;

            if (cursorGlow) {
                cursorGlow.style.left = e.clientX + 'px';
                cursorGlow.style.top = e.clientY + 'px';
                if (!cursorGlow.classList.contains('active')) {
                    cursorGlow.classList.add('active');
                }
            }
        });

        document.addEventListener('mouseleave', function () {
            if (cursorGlow) {
                cursorGlow.classList.remove('active');
            }
        });

        if (viewport) {
            viewport.addEventListener('click', function (e) {
                createPulse(e.clientX, e.clientY);
            });
        }

        document.addEventListener('wheel', function (e) {
            state.targetDepth = Math.max(0.2, Math.min(3, state.targetDepth + e.deltaY * 0.001));
            updateStats();
        }, { passive: true });

        window.addEventListener('resize', resizeCanvas);

        var themeBtns = document.querySelectorAll('.theme-btn');
        for (var i = 0; i < themeBtns.length; i++) {
            themeBtns[i].addEventListener('click', function () {
                for (var j = 0; j < themeBtns.length; j++) {
                    themeBtns[j].classList.remove('active');
                }
                this.classList.add('active');
                document.body.setAttribute('data-theme', this.getAttribute('data-theme'));
            });
        }

        var pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function () {
                state.paused = !state.paused;
                var leftRect = document.getElementById('pause-icon-left');
                var playPoly = document.getElementById('play-icon');
                if (state.paused) {
                    if (leftRect) leftRect.style.display = 'none';
                    if (playPoly) playPoly.style.display = 'block';
                    pauseBtn.querySelector('rect:nth-child(2)').style.display = 'none';
                } else {
                    if (leftRect) leftRect.style.display = '';
                    if (playPoly) playPoly.style.display = 'none';
                    pauseBtn.querySelector('rect:nth-child(2)').style.display = '';
                }
            });
        }
    }

    function createPulse(x, y) {
        var viewport = document.getElementById('parallax-viewport');
        if (!viewport) return;

        var wave = document.createElement('div');
        wave.className = 'pulse-wave';
        wave.style.left = x + 'px';
        wave.style.top = y + 'px';
        wave.style.marginLeft = '-300px';
        wave.style.marginTop = '-300px';
        viewport.appendChild(wave);

        pulses.push({
            el: wave,
            x: x,
            y: y,
            born: state.time
        });

        setTimeout(function () {
            if (wave.parentNode) wave.parentNode.removeChild(wave);
        }, 1300);

        displaceParticles(x, y);
    }

    function displaceParticles(px, py) {
        for (var i = 0; i < canvasParticles.length; i++) {
            var p = canvasParticles[i];
            var dx = p.x - px;
            var dy = p.y - py;
            var dist = Math.sqrt(dx * dx + dy * dy) + EPS;
            if (dist < 300) {
                var force = (300 - dist) / 300 * 4;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }
    }

    function tick(timestamp) {
        requestAnimationFrame(tick);

        if (state.paused) return;

        var dt = 1 / 60;
        state.time += dt;

        state.mouseX += (state.targetMouseX - state.mouseX) * 0.06;
        state.mouseY += (state.targetMouseY - state.mouseY) * 0.06;
        state.depth += (state.targetDepth - state.depth) * 0.08;

        var offsetX = (state.mouseX - 0.5) * 2;
        var offsetY = (state.mouseY - 0.5) * 2;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var depth = layer.depth * state.depth;
            var tx = offsetX * depth * 60;
            var ty = offsetY * depth * 60;
            var timeOffsetX = Math.sin(state.time * 0.3 + layer.depth * 2) * depth * 10;
            var timeOffsetY = Math.cos(state.time * 0.25 + layer.depth * 3) * depth * 8;
            layer.el.style.transform = 'translate3d(' + (tx + timeOffsetX).toFixed(1) + 'px,' + (ty + timeOffsetY).toFixed(1) + 'px, 0)';
        }

        for (var j = 0; j < orbiters.length; j++) {
            var orb = orbiters[j];
            var angle = state.time * orb.speed + orb.phase;
            var ox = Math.cos(angle) * orb.radius;
            var oy = Math.sin(angle) * orb.radius;
            orb.el.style.transform = 'translate(calc(-50% + ' + ox.toFixed(1) + 'px), calc(-50% + ' + oy.toFixed(1) + 'px))';
        }

        for (var k = 0; k < particles.length; k++) {
            var pt = particles[k];
            var px = pt.baseX + Math.sin(state.time * 0.4 + pt.phase) * pt.amplitude;
            var py = pt.baseY + Math.cos(state.time * 0.35 + pt.phase * 1.3) * pt.amplitude;
            pt.el.style.left = px + '%';
            pt.el.style.top = py + '%';
        }

        drawCanvas(dt);

        state.frameCount++;
        if (timestamp - state.lastFpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.lastFpsTime = timestamp;
            updateStats();
        }
    }

    function drawCanvas(dt) {
        if (!canvasCtx || !canvasEl) return;
        var w = canvasEl.width;
        var h = canvasEl.height;
        canvasCtx.clearRect(0, 0, w, h);

        var style = getComputedStyle(document.body);
        var accentStr = style.getPropertyValue('--particle-color').trim() || 'rgba(167, 139, 250, 0.7)';

        for (var i = 0; i < canvasParticles.length; i++) {
            var p = canvasParticles[i];
            p.life += dt;

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;

            var driftX = Math.sin(p.life * 0.5 + i) * 0.15;
            var driftY = Math.cos(p.life * 0.4 + i * 0.7) * 0.15;
            p.vx += driftX * dt;
            p.vy += driftY * dt;

            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            canvasCtx.beginPath();
            canvasCtx.arc(p.x, p.y, Math.max(EPS, p.size), 0, Math.PI * 2);
            canvasCtx.fillStyle = accentStr;
            canvasCtx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.life * 0.8));
            canvasCtx.fill();
        }

        canvasCtx.globalAlpha = 1;

        for (var a = 0; a < canvasParticles.length; a++) {
            for (var b = a + 1; b < canvasParticles.length; b++) {
                var pa = canvasParticles[a];
                var pb = canvasParticles[b];
                var ddx = pa.x - pb.x;
                var ddy = pa.y - pb.y;
                var dd = ddx * ddx + ddy * ddy;
                if (dd < 8000) {
                    var lineAlpha = (1 - dd / 8000) * 0.12;
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(pa.x, pa.y);
                    canvasCtx.lineTo(pb.x, pb.y);
                    canvasCtx.strokeStyle = accentStr;
                    canvasCtx.globalAlpha = lineAlpha;
                    canvasCtx.lineWidth = 0.5;
                    canvasCtx.stroke();
                }
            }
        }

        canvasCtx.globalAlpha = 1;
    }

    function updateStats() {
        var depthEl = document.getElementById('stat-depth');
        var particlesEl = document.getElementById('stat-particles');
        var fpsEl = document.getElementById('stat-fps');

        if (depthEl) depthEl.textContent = state.targetDepth.toFixed(1);
        if (particlesEl) particlesEl.textContent = particles.length + canvasParticles.length;
        if (fpsEl) fpsEl.textContent = state.fps;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
