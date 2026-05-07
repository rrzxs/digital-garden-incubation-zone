(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var EPS = 0.0001;

    var state = {
        mouseX: 0.5,
        mouseY: 0.5,
        targetMouseX: 0.5,
        targetMouseY: 0.5,
        timeProgress: 0.35,
        starsVisible: true,
        firefliesVisible: true,
        auroraVisible: false,
        rippleEnabled: true,
        currentTheme: 'golden-hour',
        frameCount: 0
    };

    var stars = [];
    var fireflies = [];
    var waterRipples = [];
    var parallaxLayers = [];
    var sunRays = [];

    var starCanvas, starCtx;
    var auroraCanvas, auroraCtx;
    var waterCanvas, waterCtx;
    var cursorGlow, clickRipple;
    var celestialBody, sunRaysContainer;
    var meteorContainer;
    var fireflyContainer;

    function init() {
        cacheDom();
        initStars();
        initSunRays();
        initFireflies();
        initParallax();
        bindEvents();
        requestAnimationFrame(loop);
    }

    function cacheDom() {
        starCanvas = document.getElementById('star-canvas');
        starCtx = starCanvas.getContext('2d');
        auroraCanvas = document.getElementById('aurora-canvas');
        auroraCtx = auroraCanvas.getContext('2d');
        waterCanvas = document.getElementById('water-canvas');
        waterCtx = waterCanvas.getContext('2d');
        cursorGlow = document.getElementById('cursor-glow');
        clickRipple = document.getElementById('click-ripple');
        celestialBody = document.getElementById('celestial-body');
        sunRaysContainer = document.getElementById('sun-rays');
        meteorContainer = document.getElementById('meteor-container');
        fireflyContainer = document.getElementById('firefly-container');
    }

    function initStars() {
        resizeCanvas(starCanvas);
        stars = [];
        for (var i = 0; i < 200; i++) {
            stars.push({
                x: Math.random(),
                y: Math.random() * 0.6,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random(),
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
    }

    function initSunRays() {
        sunRaysContainer.innerHTML = '';
        for (var i = 0; i < 12; i++) {
            var ray = document.createElement('div');
            ray.className = 'sun-ray';
            ray.style.transform = 'rotate(' + (i * 30) + 'deg)';
            ray.style.opacity = (0.08 + Math.random() * 0.1).toString();
            sunRaysContainer.appendChild(ray);
            sunRays.push(ray);
        }
    }

    function initFireflies() {
        fireflyContainer.innerHTML = '';
        fireflies = [];
        for (var i = 0; i < 30; i++) {
            var el = document.createElement('div');
            el.className = 'firefly';
            var baseLeft = 5 + Math.random() * 90;
            var baseTop = 30 + Math.random() * 40;
            var dx = (Math.random() - 0.5) * 60;
            var dy = (Math.random() - 0.5) * 40;
            var duration = 4 + Math.random() * 6;
            var delay = Math.random() * duration;

            el.style.left = baseLeft + '%';
            el.style.top = baseTop + '%';
            el.style.setProperty('--dx', dx + 'px');
            el.style.setProperty('--dy', dy + 'px');
            el.style.setProperty('--duration', duration + 's');
            el.style.animationDelay = '-' + delay + 's';

            fireflyContainer.appendChild(el);
            fireflies.push({
                el: el,
                baseLeft: baseLeft,
                baseTop: baseTop,
                dx: dx,
                dy: dy,
                phase: delay / duration
            });
        }
    }

    function initParallax() {
        var layers = document.querySelectorAll('.layer[data-depth]');
        parallaxLayers = [];
        layers.forEach(function (layer) {
            parallaxLayers.push({
                el: layer,
                depth: parseFloat(layer.getAttribute('data-depth')) || 0.1
            });
        });
    }

    function resizeCanvas(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function bindEvents() {
        window.addEventListener('resize', function () {
            resizeCanvas(starCanvas);
            resizeCanvas(auroraCanvas);
            resizeCanvas(waterCanvas);
        });

        document.addEventListener('mousemove', function (e) {
            state.targetMouseX = e.clientX / window.innerWidth;
            state.targetMouseY = e.clientY / window.innerHeight;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
            cursorGlow.classList.add('active');
        });

        document.addEventListener('mouseleave', function () {
            cursorGlow.classList.remove('active');
        });

        document.addEventListener('click', function (e) {
            if (e.target.closest('.control-dock') || e.target.closest('.scene-nav') || e.target.closest('.back-link')) return;
            spawnMeteor(e.clientX, e.clientY);
            triggerClickRipple(e.clientX, e.clientY);
            if (state.rippleEnabled) {
                spawnWaterRipple(e.clientX / window.innerWidth);
            }
        });

        var themeToggle = document.getElementById('theme-toggle');
        themeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            themeToggle.querySelectorAll('.theme-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.currentTheme = btn.getAttribute('data-theme');
            document.body.setAttribute('data-theme', state.currentTheme);
        });

        document.getElementById('btn-fullscreen').addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen();
            }
        });

        var timeSlider = document.getElementById('time-slider');
        var timeValue = document.getElementById('time-value');
        timeSlider.addEventListener('input', function () {
            state.timeProgress = parseInt(this.value, 10) / 100;
            updateTimeLabel(timeValue, state.timeProgress);
            updateCelestialPosition();
        });

        var starsToggle = document.getElementById('stars-toggle');
        starsToggle.addEventListener('click', function () {
            state.starsVisible = !state.starsVisible;
            this.classList.toggle('active', state.starsVisible);
            starCanvas.style.opacity = state.starsVisible ? '1' : '0';
        });

        var fireflyToggle = document.getElementById('firefly-toggle');
        fireflyToggle.addEventListener('click', function () {
            state.firefliesVisible = !state.firefliesVisible;
            this.classList.toggle('active', state.firefliesVisible);
            fireflyContainer.style.opacity = state.firefliesVisible ? '1' : '0';
        });

        var auroraToggle = document.getElementById('aurora-toggle');
        auroraToggle.addEventListener('click', function () {
            state.auroraVisible = !state.auroraVisible;
            this.classList.toggle('active', state.auroraVisible);
            auroraCanvas.classList.toggle('visible', state.auroraVisible);
        });

        var rippleToggle = document.getElementById('ripple-toggle');
        rippleToggle.addEventListener('click', function () {
            state.rippleEnabled = !state.rippleEnabled;
            this.classList.toggle('active', state.rippleEnabled);
        });
    }

    function updateTimeLabel(el, progress) {
        var labels = ['黎明', '晨曦', '朝阳', '日升', '上午', '正午', '午后', '斜阳', '暮光', '黄昏', '落日', '暮色', '入夜', '夜幕', '深夜'];
        var idx = Math.floor(progress * (labels.length - 1));
        idx = Math.max(0, Math.min(idx, labels.length - 1));
        el.textContent = labels[idx];
    }

    function updateCelestialPosition() {
        var p = state.timeProgress;
        var sunX = 10 + p * 80;
        var sunY = 35 - Math.sin(p * Math.PI) * 30;
        celestialBody.style.left = sunX + '%';
        celestialBody.style.top = sunY + '%';
    }

    function spawnMeteor(x, y) {
        var meteor = document.createElement('div');
        meteor.className = 'meteor';
        var angle = 30 + Math.random() * 30;
    var rad = angle * Math.PI / 180;
        var distance = 300 + Math.random() * 200;
        var tx = Math.cos(rad) * distance;
        var ty = Math.sin(rad) * distance;
        var duration = 0.6 + Math.random() * 0.4;

        meteor.style.left = x + 'px';
        meteor.style.top = y + 'px';
        meteor.style.setProperty('--angle', angle + 'deg');
        meteor.style.setProperty('--tx', tx + 'px');
        meteor.style.setProperty('--ty', ty + 'px');
        meteor.style.animation = 'meteor-fly ' + duration + 's ' + EASE + ' forwards';

        meteorContainer.appendChild(meteor);
        setTimeout(function () {
            meteor.remove();
        }, duration * 1000 + 100);
    }

    function triggerClickRipple(x, y) {
        clickRipple.style.left = x + 'px';
        clickRipple.style.top = y + 'px';
        clickRipple.classList.remove('animate');
        void clickRipple.offsetWidth;
        clickRipple.classList.add('animate');
        setTimeout(function () {
            clickRipple.classList.remove('animate');
        }, 1000);
    }

    function spawnWaterRipple(normalizedX) {
        waterRipples.push({
            x: normalizedX,
            radius: 0,
            maxRadius: 0.3 + Math.random() * 0.2,
            opacity: 0.6,
            speed: 0.003 + Math.random() * 0.002
        });
        if (waterRipples.length > 8) {
            waterRipples.shift();
        }
    }

    function loop() {
        state.frameCount++;
        state.mouseX += (state.targetMouseX - state.mouseX) * 0.06;
        state.mouseY += (state.targetMouseY - state.mouseY) * 0.06;

        updateParallax();
        drawStars();
        drawAurora();
        drawWater();
        updateSunRays();

        requestAnimationFrame(loop);
    }

    function updateParallax() {
        var offsetX = (state.mouseX - 0.5);
        var offsetY = (state.mouseY - 0.5);
        for (var i = 0; i < parallaxLayers.length; i++) {
            var layer = parallaxLayers[i];
            var tx = offsetX * layer.depth * 60;
            var ty = offsetY * layer.depth * 30;
            layer.el.style.transform = 'translate3d(' + tx + 'px, ' + ty + 'px, 0)';
        }
    }

    function drawStars() {
        if (!state.starsVisible) return;
        starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);

        var t = state.frameCount;
        var skyDarkness = getSkyDarkness();

        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var twinkle = Math.sin(t * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5;
            var alpha = s.brightness * twinkle * skyDarkness;
            if (alpha < 0.02) continue;

            var px = s.x * starCanvas.width;
            var py = s.y * starCanvas.height;

            starCtx.beginPath();
            starCtx.arc(px, py, Math.max(EPS, s.size * (0.7 + twinkle * 0.3)), 0, Math.PI * 2);
            starCtx.fillStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(3) + ')';
            starCtx.fill();

            if (s.size > 1.5 && alpha > 0.3) {
                starCtx.beginPath();
                starCtx.arc(px, py, Math.max(EPS, s.size * 3), 0, Math.PI * 2);
                starCtx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.15).toFixed(3) + ')';
                starCtx.fill();
            }
        }
    }

    function getSkyDarkness() {
        var p = state.timeProgress;
        if (p < 0.2) return 1 - p * 3;
        if (p > 0.7) return (p - 0.7) / 0.3;
        return 0;
    }

    function drawAurora() {
        if (!state.auroraVisible) return;
        auroraCtx.clearRect(0, 0, auroraCanvas.width, auroraCanvas.height);

        var t = state.frameCount * 0.01;
        var w = auroraCanvas.width;
        var h = auroraCanvas.height;

        var style = getComputedStyle(document.body);
        var c1 = style.getPropertyValue('--aurora-color-1').trim() || 'rgba(100, 255, 180, 0.15)';
        var c2 = style.getPropertyValue('--aurora-color-2').trim() || 'rgba(80, 200, 255, 0.1)';

        for (var band = 0; band < 3; band++) {
            auroraCtx.beginPath();
            var baseY = h * (0.1 + band * 0.12);
            var amplitude = 30 + band * 15;

            auroraCtx.moveTo(0, baseY);
            for (var x = 0; x <= w; x += 4) {
                var noise1 = Math.sin(x * 0.003 + t + band) * amplitude;
                var noise2 = Math.sin(x * 0.007 + t * 1.3 + band * 2) * amplitude * 0.5;
                var noise3 = Math.sin(x * 0.001 + t * 0.7) * amplitude * 0.3;
                var y = baseY + noise1 + noise2 + noise3;
                auroraCtx.lineTo(x, y);
            }
            auroraCtx.lineTo(w, baseY + 80);
            auroraCtx.lineTo(0, baseY + 80);
            auroraCtx.closePath();

            var grad = auroraCtx.createLinearGradient(0, baseY - amplitude, 0, baseY + 80);
            if (band % 2 === 0) {
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.3, c1);
                grad.addColorStop(0.7, c2);
                grad.addColorStop(1, 'transparent');
            } else {
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.4, c2);
                grad.addColorStop(0.8, c1);
                grad.addColorStop(1, 'transparent');
            }
            auroraCtx.fillStyle = grad;
            auroraCtx.fill();
        }
    }

    function drawWater() {
        if (!waterCanvas.width || !waterCanvas.height) return;
        waterCtx.clearRect(0, 0, waterCanvas.width, waterCanvas.height);

        var t = state.frameCount;
        var w = waterCanvas.width;
        var h = waterCanvas.height;

        var style = getComputedStyle(document.body);
        var accent = style.getPropertyValue('--accent').trim() || '#f5a623';

        for (var layer = 0; layer < 5; layer++) {
            waterCtx.beginPath();
            var baseY = h * (0.15 + layer * 0.18);
            var amp = 3 + layer * 2;

            waterCtx.moveTo(0, baseY);
            for (var x = 0; x <= w; x += 3) {
                var wave = Math.sin(x * 0.01 + t * 0.02 + layer * 1.5) * amp;
                wave += Math.sin(x * 0.025 + t * 0.015 + layer) * amp * 0.5;
                var y = baseY + wave;
                waterCtx.lineTo(x, y);
            }
            waterCtx.lineTo(w, h);
            waterCtx.lineTo(0, h);
            waterCtx.closePath();

            var alpha = (0.03 + layer * 0.01).toFixed(3);
            waterCtx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
            waterCtx.fill();
        }

        var sunReflX = state.timeProgress * w;
        var reflGrad = waterCtx.createRadialGradient(sunReflX, 0, 0, sunReflX, 0, Math.max(EPS, w * 0.15));
        reflGrad.addColorStop(0, hexToRgba(accent, 0.12));
        reflGrad.addColorStop(0.5, hexToRgba(accent, 0.04));
        reflGrad.addColorStop(1, 'transparent');
        waterCtx.fillStyle = reflGrad;
        waterCtx.fillRect(0, 0, w, h * 0.4);

        for (var ri = waterRipples.length - 1; ri >= 0; ri--) {
            var r = waterRipples[ri];
            r.radius += r.speed;
            r.opacity -= 0.004;
            if (r.opacity <= 0 || r.radius >= r.maxRadius) {
                waterRipples.splice(ri, 1);
                continue;
            }
            var rx = r.x * w;
            var rr = r.radius * w;
            waterCtx.beginPath();
            waterCtx.ellipse(rx, h * 0.15, Math.max(EPS, rr), Math.max(EPS, rr * 0.3), 0, 0, Math.PI * 2);
            waterCtx.strokeStyle = 'rgba(255, 255, 255, ' + r.opacity.toFixed(3) + ')';
            waterCtx.lineWidth = 1;
            waterCtx.stroke();
        }
    }

    function updateSunRays() {
        var t = state.frameCount;
        for (var i = 0; i < sunRays.length; i++) {
            var ray = sunRays[i];
            var pulse = Math.sin(t * 0.015 + i * 0.5) * 0.5 + 0.5;
            ray.style.opacity = (0.06 + pulse * 0.12).toFixed(3);
        }
        sunRaysContainer.style.transform = 'rotate(' + (t * 0.02 % 360) + 'deg)';
    }

    function hexToRgba(hex, alpha) {
        if (!hex || hex.charAt(0) !== '#') return 'rgba(245, 166, 35, ' + alpha + ')';
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }

    function resizeCanvas(canvas) {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        var ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            updateCelestialPosition();
            init();
        });
    } else {
        updateCelestialPosition();
        init();
    }
})();
