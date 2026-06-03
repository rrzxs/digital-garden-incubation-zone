(function () {
    'use strict';

    var EASE = {
        outExpo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
        inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
        spring: function (t) {
            var s = 1 - t;
            return 1 - Math.pow(s, 3) * Math.cos(t * Math.PI * 2.5);
        }
    };

    var JOURNEY = [
        { id: 'origin', x: 0.10, y: 0.55, icon: '🌊', label: '起源之海', title: '起源之海', desc: '一切旅途都始于未知。平静的海面之下涌动着无限可能，每一次出发都是对自我的超越。' },
        { id: 'peak', x: 0.25, y: 0.25, icon: '⛰', label: '云端之巅', title: '云端之巅', desc: '攀登从未知中升起的高峰。云海翻涌，视野开阔，每一步都在重新定义极限。' },
        { id: 'forest', x: 0.42, y: 0.68, icon: '🌿', label: '迷雾森林', title: '迷雾森林', desc: '在迷雾中穿行，每棵树都是一位沉默的向导。失去方向，反而是找到自我的开始。' },
        { id: 'ruins', x: 0.56, y: 0.32, icon: '🏛', label: '古文明遗迹', title: '古文明遗迹', desc: '时间在此凝固。风化的石柱诉说着千年故事，每一道裂痕都是文明的年轮。' },
        { id: 'desert', x: 0.72, y: 0.72, icon: '🏜', label: '流沙荒原', title: '流沙荒原', desc: '沙漠的寂静震耳欲聋。烈日灼烧着每一寸肌肤，却在夜晚铺展最璀璨的星空。' },
        { id: 'city', x: 0.88, y: 0.45, icon: '🏙', label: '未来之城', title: '未来之城', desc: '旅途的终点是另一段旅途的起点。光与影交织的天际线，每一个窗户都是一个故事。' }
    ];

    var PARTICLE_COUNT = 120;

    var state = {
        theme: 'deep-ocean',
        playing: false,
        speed: 1,
        currentSegment: 0,
        segmentProgress: 0,
        completed: false,
        globalProgress: 0,
        mouseX: 0,
        mouseY: 0,
        mouseInViewport: false,
        lastTime: 0
    };

    var dom = {};
    var particles = [];
    var trailPoints = [];
    var catmullRomCache = {};
    var animId = null;

    function init() {
        cacheDom();
        setupCanvas();
        createParticles();
        createWaypointMarkers();
        createProgressMarkers();
        bindEvents();
        drawMapPath();
        updateUI();
        animId = requestAnimationFrame(loop);
    }

    function cacheDom() {
        dom.particleCanvas = document.getElementById('particle-canvas');
        dom.mapCanvas = document.getElementById('map-canvas');
        dom.trailCanvas = document.getElementById('trail-canvas');
        dom.cursorGlow = document.getElementById('cursor-glow');
        dom.viewport = document.getElementById('map-viewport');
        dom.waypointsLayer = document.getElementById('waypoints-layer');
        dom.travelerDot = document.getElementById('traveler-dot');
        dom.progressFill = document.getElementById('progress-fill');
        dom.progressMarkers = document.getElementById('progress-markers');
        dom.progressLabel = document.getElementById('progress-label');
        dom.btnPlay = document.getElementById('btn-play');
        dom.btnPrev = document.getElementById('btn-prev');
        dom.btnNext = document.getElementById('btn-next');
        dom.iconPlay = document.getElementById('icon-play');
        dom.iconPause = document.getElementById('icon-pause');
        dom.playLabel = document.getElementById('play-label');
        dom.infoIcon = document.getElementById('info-icon');
        dom.infoTitle = document.getElementById('info-title');
        dom.infoDesc = document.getElementById('info-desc');
        dom.themeToggle = document.getElementById('theme-toggle');
        dom.speedSlider = document.getElementById('speed-slider');
        dom.toastContainer = document.getElementById('toast-container');
    }

    function setupCanvas() {
        var canvases = [dom.particleCanvas, dom.mapCanvas, dom.trailCanvas];
        canvases.forEach(function (c) {
            var dpr = window.devicePixelRatio || 1;
            var rect = c.parentElement.getBoundingClientRect();
            c.width = rect.width * dpr;
            c.height = rect.height * dpr;
            var ctx = c.getContext('2d');
            ctx.scale(dpr, dpr);
            c._logicalWidth = rect.width;
            c._logicalHeight = rect.height;
        });
    }

    function createParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.0003,
                vy: (Math.random() - 0.5) * 0.0003,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.4 + 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function createWaypointMarkers() {
        dom.waypointsLayer.innerHTML = '';
        JOURNEY.forEach(function (wp, i) {
            var marker = document.createElement('div');
            marker.className = 'waypoint-marker';
            marker.dataset.index = i;
            marker.style.left = (wp.x * 100) + '%';
            marker.style.top = (wp.y * 100) + '%';
            marker.innerHTML =
                '<div class="wp-dot">' +
                    wp.icon +
                    '<div class="wp-ring"></div>' +
                '</div>' +
                '<span class="wp-label">' + wp.label + '</span>';
            marker.addEventListener('click', function () { jumpToWaypoint(i); });
            dom.waypointsLayer.appendChild(marker);

            setTimeout(function () {
                marker.classList.add('visible');
            }, 200 + i * 120);
        });
    }

    function createProgressMarkers() {
        dom.progressMarkers.innerHTML = '';
        JOURNEY.forEach(function (wp, i) {
            var marker = document.createElement('div');
            marker.className = 'progress-marker';
            marker.style.left = (wp.x * 100) + '%';
            marker.dataset.index = i;
            dom.progressMarkers.appendChild(marker);
        });
    }

    function bindEvents() {
        dom.themeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            var theme = btn.dataset.theme;
            state.theme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            dom.themeToggle.querySelectorAll('.theme-btn').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
            catmullRomCache = {};
            drawMapPath();
            redrawTrail();
        });

        dom.speedSlider.addEventListener('input', function () {
            state.speed = parseFloat(this.value);
        });

        dom.btnPlay.addEventListener('click', togglePlay);
        dom.btnPrev.addEventListener('click', goPrev);
        dom.btnNext.addEventListener('click', goNext);

        dom.viewport.addEventListener('mouseenter', function () {
            state.mouseInViewport = true;
            dom.cursorGlow.classList.add('visible');
        });

        dom.viewport.addEventListener('mouseleave', function () {
            state.mouseInViewport = false;
            dom.cursorGlow.classList.remove('visible');
        });

        document.addEventListener('mousemove', function (e) {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
            dom.cursorGlow.style.left = e.clientX + 'px';
            dom.cursorGlow.style.top = e.clientY + 'px';
        });

        dom.viewport.addEventListener('click', function (e) {
            var rect = dom.viewport.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;
            createRippleEffect(cx, cy);
        });

        window.addEventListener('resize', function () {
            setupCanvas();
            catmullRomCache = {};
            drawMapPath();
            redrawTrail();
        });

        document.addEventListener('keydown', function (e) {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'ArrowLeft') {
                goPrev();
            } else if (e.code === 'ArrowRight') {
                goNext();
            }
        });
    }

    function togglePlay() {
        if (state.completed) {
            resetJourney();
            return;
        }
        state.playing = !state.playing;
        if (state.playing) {
            dom.iconPlay.style.display = 'none';
            dom.iconPause.style.display = 'block';
            dom.playLabel.textContent = '暂停';
            if (state.currentSegment === 0 && state.segmentProgress === 0) {
                showToast(JOURNEY[0].icon, '旅途开始：' + JOURNEY[0].label);
            }
        } else {
            dom.iconPlay.style.display = 'block';
            dom.iconPause.style.display = 'none';
            dom.playLabel.textContent = '继续';
        }
    }

    function goPrev() {
        if (state.currentSegment > 0) {
            state.currentSegment--;
            state.segmentProgress = 0;
            state.completed = false;
            updateWaypointStates();
            updateInfoCard(state.currentSegment);
            updateProgressBar();
            updateTravelerPosition();
            showToast(JOURNEY[state.currentSegment].icon, '回溯至：' + JOURNEY[state.currentSegment].label);
        }
    }

    function goNext() {
        if (state.currentSegment < JOURNEY.length - 2) {
            state.currentSegment++;
            state.segmentProgress = 0;
            state.completed = false;
            state.playing = true;
            dom.iconPlay.style.display = 'none';
            dom.iconPause.style.display = 'block';
            dom.playLabel.textContent = '暂停';
            updateWaypointStates();
            updateInfoCard(state.currentSegment);
            showToast(JOURNEY[state.currentSegment].icon, '前进至：' + JOURNEY[state.currentSegment].label);
        }
    }

    function jumpToWaypoint(index) {
        if (index === 0) {
            state.currentSegment = 0;
            state.segmentProgress = 0;
            state.completed = false;
            trailPoints = [];
        } else {
            state.currentSegment = index - 1;
            state.segmentProgress = 0;
            state.completed = false;
            rebuildTrailUpTo(index - 1);
        }
        state.playing = true;
        dom.iconPlay.style.display = 'none';
        dom.iconPause.style.display = 'block';
        dom.playLabel.textContent = '暂停';
        updateWaypointStates();
        updateInfoCard(state.currentSegment);
        updateProgressBar();
        updateTravelerPosition();
        showToast(JOURNEY[index].icon, '跳转至：' + JOURNEY[index].label);
    }

    function resetJourney() {
        state.currentSegment = 0;
        state.segmentProgress = 0;
        state.completed = false;
        state.globalProgress = 0;
        state.playing = false;
        trailPoints = [];
        dom.iconPlay.style.display = 'block';
        dom.iconPause.style.display = 'none';
        dom.playLabel.textContent = '出发';
        updateWaypointStates();
        updateInfoCard(0);
        updateProgressBar();
        updateTravelerPosition();
        clearTrail();
        showToast('🔄', '旅途已重置');
    }

    function rebuildTrailUpTo(segmentIndex) {
        trailPoints = [];
        var steps = 60;
        for (var s = 0; s <= segmentIndex; s++) {
            for (var i = 0; i <= steps; i++) {
                var t = i / steps;
                var pt = getCatmullRomPoint(s, t);
                if (pt) trailPoints.push(pt);
            }
        }
    }

    function getWaypointPixel(wp) {
        var rect = dom.viewport.getBoundingClientRect();
        return { x: wp.x * rect.width, y: wp.y * rect.height };
    }

    function catmullRom(p0, p1, p2, p3, t) {
        var t2 = t * t;
        var t3 = t2 * t;
        return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        };
    }

    function getCatmullRomPoint(seg, t) {
        var n = JOURNEY.length;
        var i0 = Math.max(0, seg - 1);
        var i1 = seg;
        var i2 = Math.min(n - 1, seg + 1);
        var i3 = Math.min(n - 1, seg + 2);
        var p0 = getWaypointPixel(JOURNEY[i0]);
        var p1 = getWaypointPixel(JOURNEY[i1]);
        var p2 = getWaypointPixel(JOURNEY[i2]);
        var p3 = getWaypointPixel(JOURNEY[i3]);
        return catmullRom(p0, p1, p2, p3, t);
    }

    function drawMapPath() {
        var ctx = dom.mapCanvas.getContext('2d');
        var w = dom.mapCanvas._logicalWidth;
        var h = dom.mapCanvas._logicalHeight;
        ctx.clearRect(0, 0, w, h);

        var style = getComputedStyle(document.documentElement);
        var pathColor = style.getPropertyValue('--path-color').trim();
        var pathGlow = style.getPropertyValue('--path-glow').trim();

        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = pathGlow;
        ctx.strokeStyle = pathColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = 0;

        var steps = 100;
        ctx.beginPath();
        for (var seg = 0; seg < JOURNEY.length - 1; seg++) {
            for (var i = 0; i <= steps; i++) {
                var t = i / steps;
                var pt = getCatmullRomPoint(seg, t);
                if (seg === 0 && i === 0) {
                    ctx.moveTo(pt.x, pt.y);
                } else {
                    ctx.lineTo(pt.x, pt.y);
                }
            }
        }
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = pathGlow;
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        for (var seg2 = 0; seg2 < JOURNEY.length - 1; seg2++) {
            for (var j = 0; j <= steps; j++) {
                var t2 = j / steps;
                var pt2 = getCatmullRomPoint(seg2, t2);
                if (seg2 === 0 && j === 0) {
                    ctx.moveTo(pt2.x, pt2.y);
                } else {
                    ctx.lineTo(pt2.x, pt2.y);
                }
            }
        }
        ctx.stroke();
        ctx.restore();

        animatePathDash();
    }

    var dashOffset = 0;
    function animatePathDash() {
        var ctx = dom.mapCanvas.getContext('2d');
        dashOffset -= 0.5;
    }

    function updateTravelerPosition() {
        if (state.currentSegment >= JOURNEY.length - 1 && state.segmentProgress >= 1) {
            var lastWp = getWaypointPixel(JOURNEY[JOURNEY.length - 1]);
            dom.travelerDot.style.left = lastWp.x + 'px';
            dom.travelerDot.style.top = lastWp.y + 'px';
            return;
        }

        var easedT = EASE.inOutCubic(state.segmentProgress);
        var pt = getCatmullRomPoint(state.currentSegment, easedT);
        dom.travelerDot.style.left = pt.x + 'px';
        dom.travelerDot.style.top = pt.y + 'px';
    }

    function updateWaypointStates() {
        var markers = dom.waypointsLayer.querySelectorAll('.waypoint-marker');
        markers.forEach(function (m, i) {
            m.classList.remove('active', 'visited');
            if (i < state.currentSegment) {
                m.classList.add('visited');
            } else if (i === state.currentSegment) {
                if (state.segmentProgress < 0.1 || state.currentSegment === 0) {
                    m.classList.add('active');
                }
            }
        });

        if (state.segmentProgress > 0.5 && state.currentSegment < JOURNEY.length - 1) {
            markers[state.currentSegment].classList.remove('active');
            markers[state.currentSegment + 1].classList.add('active');
        }

        var pMarkers = dom.progressMarkers.querySelectorAll('.progress-marker');
        pMarkers.forEach(function (pm, i) {
            pm.classList.toggle('passed', i <= state.currentSegment);
        });
    }

    function updateInfoCard(segIndex) {
        var wp = JOURNEY[segIndex];
        dom.infoIcon.textContent = wp.icon;
        dom.infoTitle.textContent = wp.title;
        dom.infoDesc.textContent = wp.desc;

        dom.infoTitle.style.opacity = '0';
        dom.infoDesc.style.opacity = '0';
        dom.infoIcon.style.opacity = '0';
        dom.infoIcon.style.transform = 'scale(0.5)';

        requestAnimationFrame(function () {
            dom.infoIcon.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            dom.infoIcon.style.opacity = '1';
            dom.infoIcon.style.transform = 'scale(1)';
            dom.infoTitle.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s';
            dom.infoTitle.style.opacity = '1';
            dom.infoDesc.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s';
            dom.infoDesc.style.opacity = '1';
        });
    }

    function updateProgressBar() {
        var totalSegments = JOURNEY.length - 1;
        var progress = (state.currentSegment + state.segmentProgress) / totalSegments;
        state.globalProgress = Math.min(1, progress);
        dom.progressFill.style.width = (state.globalProgress * 100) + '%';
        dom.progressLabel.textContent = Math.round(state.globalProgress * 100) + '%';
    }

    function clearTrail() {
        var ctx = dom.trailCanvas.getContext('2d');
        ctx.clearRect(0, 0, dom.trailCanvas._logicalWidth, dom.trailCanvas._logicalHeight);
    }

    function redrawTrail() {
        clearTrail();
        if (trailPoints.length === 0) return;

        var ctx = dom.trailCanvas.getContext('2d');
        var style = getComputedStyle(document.documentElement);
        var trailColor = style.getPropertyValue('--trail-color').trim();

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (var i = 1; i < trailPoints.length; i++) {
            var alpha = (i / trailPoints.length) * 0.7;
            ctx.beginPath();
            ctx.strokeStyle = trailColor.replace(/[\d.]+\)$/, alpha + ')');
            ctx.lineWidth = 2 + (i / trailPoints.length) * 2;
            ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
            ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
            ctx.stroke();
        }

        ctx.restore();
    }

    function addTrailPoint(pt) {
        if (trailPoints.length > 0) {
            var last = trailPoints[trailPoints.length - 1];
            var dx = pt.x - last.x;
            var dy = pt.y - last.y;
            if (dx * dx + dy * dy < 4) return;
        }
        trailPoints.push({ x: pt.x, y: pt.y });
        if (trailPoints.length > 2000) trailPoints.splice(0, 100);

        var ctx = dom.trailCanvas.getContext('2d');
        var len = trailPoints.length;
        if (len < 2) return;

        var style = getComputedStyle(document.documentElement);
        var trailColor = style.getPropertyValue('--trail-color').trim();
        var alpha = 0.7;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = trailColor.replace(/[\d.]+\)$/, alpha + ')');
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.shadowColor = trailColor;
        ctx.beginPath();
        ctx.moveTo(trailPoints[len - 2].x, trailPoints[len - 2].y);
        ctx.lineTo(trailPoints[len - 1].x, trailPoints[len - 1].y);
        ctx.stroke();
        ctx.restore();
    }

    function createRippleEffect(cx, cy) {
        var canvas = dom.mapCanvas;
        var ctx = canvas.getContext('2d');
        var style = getComputedStyle(document.documentElement);
        var accent = style.getPropertyValue('--accent').trim();
        var radius = 0;
        var maxRadius = 80;
        var opacity = 0.4;

        function animateRipple() {
            radius += 2.5;
            opacity -= 0.012;
            if (opacity <= 0) return;

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = accent;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            requestAnimationFrame(animateRipple);
        }
        animateRipple();
    }

    function showToast(icon, message) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = '<span class="toast-icon">' + icon + '</span>' + message;
        dom.toastContainer.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('out');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 2500);

        while (dom.toastContainer.children.length > 3) {
            dom.toastContainer.removeChild(dom.toastContainer.firstChild);
        }
    }

    function updateUI() {
        var firstWp = getWaypointPixel(JOURNEY[0]);
        dom.travelerDot.style.left = firstWp.x + 'px';
        dom.travelerDot.style.top = firstWp.y + 'px';
        updateInfoCard(0);
        updateWaypointStates();
    }

    function renderParticles(time) {
        var ctx = dom.particleCanvas.getContext('2d');
        var w = dom.particleCanvas._logicalWidth;
        var h = dom.particleCanvas._logicalHeight;
        ctx.clearRect(0, 0, w, h);

        var style = getComputedStyle(document.documentElement);
        var accent = style.getPropertyValue('--accent').trim();

        particles.forEach(function (p) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -0.05) p.x = 1.05;
            if (p.x > 1.05) p.x = -0.05;
            if (p.y < -0.05) p.y = 1.05;
            if (p.y > 1.05) p.y = -0.05;

            if (state.mouseInViewport) {
                var rect = dom.particleCanvas.getBoundingClientRect();
                var mx = (state.mouseX - rect.left) / w;
                var my = (state.mouseY - rect.top) / h;
                var dx = p.x - mx;
                var dy = p.y - my;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 0.15) {
                    var force = (0.15 - dist) * 0.001;
                    p.vx += dx * force;
                    p.vy += dy * force;
                }
            }

            p.vx *= 0.99;
            p.vy *= 0.99;

            var pulse = Math.sin(time * 0.001 + p.phase) * 0.15 + 0.85;
            var px = p.x * w;
            var py = p.y * h;

            ctx.beginPath();
            ctx.arc(px, py, p.size * pulse, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.globalAlpha = p.opacity * pulse;
            ctx.fill();
        });

        ctx.globalAlpha = 1;

        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx2 = particles[i].x - particles[j].x;
                var dy2 = particles[i].y - particles[j].y;
                var d2 = dx2 * dx2 + dy2 * dy2;
                if (d2 < 0.003) {
                    var alpha = (1 - d2 / 0.003) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x * w, particles[i].y * h);
                    ctx.lineTo(particles[j].x * w, particles[j].y * h);
                    ctx.strokeStyle = accent;
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        ctx.globalAlpha = 1;
    }

    function loop(time) {
        var dt = state.lastTime ? (time - state.lastTime) / 1000 : 0.016;
        dt = Math.min(dt, 0.1);
        state.lastTime = time;

        renderParticles(time);

        if (state.playing && !state.completed) {
            var segDuration = 3.0 / state.speed;
            state.segmentProgress += dt / segDuration;

            if (state.segmentProgress >= 1) {
                state.segmentProgress = 1;
                state.currentSegment++;

                if (state.currentSegment >= JOURNEY.length - 1) {
                    state.currentSegment = JOURNEY.length - 2;
                    state.segmentProgress = 1;
                    state.completed = true;
                    state.playing = false;

                    dom.iconPlay.style.display = 'block';
                    dom.iconPause.style.display = 'none';
                    dom.playLabel.textContent = '重新出发';

                    showToast(JOURNEY[JOURNEY.length - 1].icon, '旅途完成！你已抵达' + JOURNEY[JOURNEY.length - 1].label);
                    updateInfoCard(JOURNEY.length - 1);
                } else {
                    showToast(JOURNEY[state.currentSegment + 1].icon, '抵达：' + JOURNEY[state.currentSegment + 1].label);
                    updateInfoCard(state.currentSegment);
                }

                updateWaypointStates();
            }

            var easedT = EASE.inOutCubic(state.segmentProgress);
            var pt = getCatmullRomPoint(Math.min(state.currentSegment, JOURNEY.length - 2), easedT);
            dom.travelerDot.style.left = pt.x + 'px';
            dom.travelerDot.style.top = pt.y + 'px';
            addTrailPoint(pt);
            updateProgressBar();
        }

        animId = requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
