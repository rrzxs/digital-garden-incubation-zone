(function () {
    'use strict';

    var CURVE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var CATEGORIES = [
        { id: 'searches', label: 'Google 搜索', icon: '🔍', perSecond: 99000, unit: '次/秒', countries: ['US', 'CN', 'IN', 'JP', 'BR'] },
        { id: 'emails', label: '邮件发送', icon: '📧', perSecond: 3200000, unit: '封/秒', countries: ['US', 'DE', 'GB', 'FR', 'AU'] },
        { id: 'tweets', label: '推文发布', icon: '💬', perSecond: 8600, unit: '条/秒', countries: ['US', 'JP', 'BR', 'GB', 'IN'] },
        { id: 'videos', label: 'YouTube 观看', icon: '▶️', perSecond: 74000, unit: '次/秒', countries: ['US', 'IN', 'BR', 'KR', 'MX'] },
        { id: 'purchases', label: '电商订单', icon: '🛒', perSecond: 4300, unit: '单/秒', countries: ['CN', 'US', 'UK', 'DE', 'JP'] },
        { id: 'stars', label: 'GitHub Stars', icon: '⭐', perSecond: 120, unit: '星/秒', countries: ['US', 'CN', 'DE', 'GB', 'CA'] },
        { id: 'photos', label: 'Instagram 照片', icon: '📸', perSecond: 1400, unit: '张/秒', countries: ['US', 'BR', 'IN', 'ID', 'TR'] },
        { id: 'co2', label: 'CO₂ 排放', icon: '🌫️', perSecond: 1170, unit: '吨/秒', countries: ['CN', 'US', 'IN', 'RU', 'JP'] }
    ];

    var COUNTRY_LABELS = {
        US: '美国', CN: '中国', IN: '印度', JP: '日本', BR: '巴西',
        DE: '德国', GB: '英国', FR: '法国', AU: '澳大利亚',
        KR: '韩国', MX: '墨西哥', UK: '英国', CA: '加拿大',
        ID: '印度尼西亚', TR: '土耳其', RU: '俄罗斯'
    };

    var STATE = {
        speed: 1,
        paused: false,
        startTime: Date.now(),
        mouseX: 0,
        mouseY: 0,
        mouseActive: false,
        counters: {},
        totalEvents: 0
    };

    CATEGORIES.forEach(function (cat) { STATE.counters[cat.id] = 0; });

    var particles = [];
    var tickers = { left: [], right: [] };
    var MAX_TICKERS = 18;

    var DOM = {};
    var tickerTimers = [];

    function init() {
        cacheDom();
        bindEvents();
        initParticles();
        startTickerGeneration();
        startCounters();
        requestAnimationFrame(loop);
    }

    function cacheDom() {
        DOM.cursorGlow = document.getElementById('cursor-glow');
        DOM.canvas = document.getElementById('particle-canvas');
        DOM.ctx = DOM.canvas.getContext('2d');
        DOM.heroValue = document.getElementById('hero-value');
        DOM.heroBarFill = document.getElementById('hero-bar-fill');
        DOM.heroElapsed = document.getElementById('hero-elapsed');
        DOM.heroIcon = document.getElementById('hero-icon');
        DOM.heroLabel = document.getElementById('hero-label');
        DOM.heroDesc = document.getElementById('hero-desc');
        DOM.heroUnit = document.getElementById('hero-unit');
        DOM.tickerLeft = document.getElementById('ticker-left');
        DOM.tickerRight = document.getElementById('ticker-right');
        DOM.themeToggle = document.getElementById('theme-toggle');
        DOM.speedToggle = document.getElementById('speed-toggle');
        DOM.btnPause = document.getElementById('btn-pause');
        DOM.btnFullscreen = document.getElementById('btn-fullscreen');
    }

    function bindEvents() {
        document.addEventListener('mousemove', function (e) {
            STATE.mouseX = e.clientX;
            STATE.mouseY = e.clientY;
            STATE.mouseActive = true;
            DOM.cursorGlow.style.left = e.clientX + 'px';
            DOM.cursorGlow.style.top = e.clientY + 'px';
            if (!DOM.cursorGlow.classList.contains('active')) {
                DOM.cursorGlow.classList.add('active');
            }
        });

        document.addEventListener('mouseleave', function () {
            STATE.mouseActive = false;
            DOM.cursorGlow.classList.remove('active');
        });

        DOM.themeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            DOM.themeToggle.querySelectorAll('.theme-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            document.body.setAttribute('data-theme', btn.dataset.theme);
        });

        DOM.speedToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.speed-btn');
            if (!btn) return;
            DOM.speedToggle.querySelectorAll('.speed-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            STATE.speed = parseFloat(btn.dataset.speed);
        });

        DOM.btnPause.addEventListener('click', function () {
            STATE.paused = !STATE.paused;
            DOM.btnPause.classList.toggle('active', STATE.paused);
            DOM.btnPause.innerHTML = STATE.paused
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        });

        DOM.btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen();
            }
        });

        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        DOM.canvas.width = window.innerWidth;
        DOM.canvas.height = window.innerHeight;
    }

    function initParticles() {
        resizeCanvas();
        for (var i = 0; i < 60; i++) {
            particles.push(createParticle());
        }
    }

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.3 + 0.1,
            baseAlpha: Math.random() * 0.3 + 0.1,
            pulse: Math.random() * Math.PI * 2
        };
    }

    function updateParticles() {
        var w = DOM.canvas.width;
        var h = DOM.canvas.height;
        var style = getComputedStyle(document.body);
        var rgb = style.getPropertyValue('--particle-color').trim();

        DOM.ctx.clearRect(0, 0, w, h);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.pulse += 0.02;
            p.alpha = p.baseAlpha + Math.sin(p.pulse) * 0.1;

            if (STATE.mouseActive) {
                var dx = STATE.mouseX - p.x;
                var dy = STATE.mouseY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 0) {
                    var force = (200 - dist) / 200 * 0.02;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            p.x += p.vx;
            p.y += p.vy;

            p.vx *= 0.99;
            p.vy *= 0.99;

            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            DOM.ctx.beginPath();
            DOM.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            DOM.ctx.fillStyle = 'rgba(' + rgb + ',' + Math.max(0, p.alpha) + ')';
            DOM.ctx.fill();
        }

        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var ddx = particles[i].x - particles[j].x;
                var ddy = particles[i].y - particles[j].y;
                var dd = ddx * ddx + ddy * ddy;
                if (dd < 15000) {
                    var lineAlpha = (1 - dd / 15000) * 0.06;
                    DOM.ctx.beginPath();
                    DOM.ctx.moveTo(particles[i].x, particles[i].y);
                    DOM.ctx.lineTo(particles[j].x, particles[j].y);
                    DOM.ctx.strokeStyle = 'rgba(' + rgb + ',' + lineAlpha + ')';
                    DOM.ctx.lineWidth = 0.5;
                    DOM.ctx.stroke();
                }
            }
        }
    }

    function startCounters() {
        var lastUpdate = Date.now();

        setInterval(function () {
            if (STATE.paused) return;

            var now = Date.now();
            var dt = ((now - lastUpdate) / 1000) * STATE.speed;
            lastUpdate = now;

            var totalThisTick = 0;

            CATEGORIES.forEach(function (cat) {
                var increment = cat.perSecond * dt;
                var rounded = Math.floor(increment);
                STATE.counters[cat.id] += rounded;
                totalThisTick += rounded;

                var el = document.getElementById('stat-' + cat.id);
                if (el) el.textContent = formatNumber(STATE.counters[cat.id]);

                var bar = document.getElementById('bar-' + cat.id);
                if (bar) {
                    var maxPerCategory = cat.perSecond * 60 * STATE.speed;
                    var pct = Math.min(100, ((STATE.counters[cat.id] % Math.ceil(maxPerCategory)) / maxPerCategory) * 100);
                    bar.style.width = pct + '%';
                }
            });

            STATE.totalEvents += totalThisTick;
            DOM.heroValue.textContent = formatNumber(STATE.totalEvents);

            var elapsed = Date.now() - STATE.startTime;
            var mins = Math.floor(elapsed / 60000);
            var secs = Math.floor((elapsed % 60000) / 1000);
            DOM.heroElapsed.textContent = pad(mins) + ':' + pad(secs);

            var maxTotal = 3500000 * (elapsed / 1000) * STATE.speed;
            var heroPct = Math.min(100, (STATE.totalEvents / maxTotal) * 100);
            DOM.heroBarFill.style.width = heroPct + '%';
        }, 200);
    }

    function startTickerGeneration() {
        function scheduleNext() {
            if (STATE.paused) {
                tickerTimers.push(setTimeout(scheduleNext, 500));
                return;
            }
            var delay = Math.max(200, (1200 / STATE.speed) + (Math.random() - 0.5) * 600);
            tickerTimers.push(setTimeout(function () {
                generateTickerEvent();
                scheduleNext();
            }, delay));
        }

        scheduleNext();

        for (var i = 0; i < 6; i++) {
            (function (idx) {
                tickerTimers.push(setTimeout(function () {
                    generateTickerEvent();
                }, idx * 200));
            })(i);
        }
    }

    function generateTickerEvent() {
        if (STATE.paused) return;

        var cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        var country = cat.countries[Math.floor(Math.random() * cat.countries.length)];
        var countryLabel = COUNTRY_LABELS[country] || country;
        var increment = Math.floor(cat.perSecond * (0.5 + Math.random()) * STATE.speed * 0.1);

        var side = Math.random() < 0.5 ? 'left' : 'right';
        var container = side === 'left' ? DOM.tickerLeft : DOM.tickerRight;

        var el = document.createElement('div');
        el.className = 'ticker-event' + (Math.random() < 0.15 ? ' highlight' : '');
        el.innerHTML =
            '<span class="event-icon">' + cat.icon + '</span>' +
            '<span class="event-text"><span class="event-value">' + formatNumber(increment) + '</span> ' + cat.label + '</span>' +
            '<span class="event-country">' + countryLabel + '</span>';

        if (side === 'left') {
            container.insertBefore(el, container.firstChild);
        } else {
            container.insertBefore(el, container.firstChild);
        }

        tickers[side].unshift(el);

        while (tickers[side].length > MAX_TICKERS) {
            var old = tickers[side].pop();
            if (old && old.parentNode) old.parentNode.removeChild(old);
        }
    }

    function formatNumber(n) {
        if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toLocaleString ? n.toLocaleString() : String(n);
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    var lastFrame = 0;
    function loop(ts) {
        requestAnimationFrame(loop);
        if (ts - lastFrame < 33) return;
        lastFrame = ts;
        updateParticles();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
