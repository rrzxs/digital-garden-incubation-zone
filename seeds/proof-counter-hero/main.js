(function () {
    'use strict';

    /* =====================================================================
       Proof Counter Hero · 证明计数英雄
       交互逻辑: 里程仪式翻牌计数 · 里程碑冲击波 · 粒子迸射 · 击键节奏
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    /* === DOM Elements === */
    var odometerEl = document.getElementById('odometer');
    var ringBar = document.getElementById('ring-bar');
    var ringLabel = document.getElementById('ring-label');
    var captionLine = document.getElementById('caption-line');
    var statOps = document.getElementById('stat-ops');
    var statTempo = document.getElementById('stat-tempo');
    var statMilestones = document.getElementById('stat-milestones');
    var statNet = document.getElementById('stat-net');
    var tempoFill = document.getElementById('tempo-fill');
    var logList = document.getElementById('log-list');
    var logEmpty = document.getElementById('log-empty');
    var glyphCore = document.getElementById('glyph-core');
    var toastLayer = document.getElementById('toast-layer');
    var heroStage = document.getElementById('hero-stage');
    var plusLabel = document.getElementById('plus-label');
    var burstBtn = document.getElementById('burst-btn');
    var resetBtn = document.getElementById('reset-btn');
    var canvas = document.getElementById('fx-canvas');
    var ctx = canvas.getContext('2d');

    var RING_LEN = 578.05; // 2πr, r=92

    /* === 状态模型 === */
    var state = {
        value: 0,
        ops: 0,
        milestones: 0,
        step: 5,
        digitCount: 5,
        reels: [],
        lastTap: 0,
        tapTimes: []
    };

    /* === 里程碑祝词语料 === */
    var MILESTONE_QUOTES = {
        10: '十次证明 · 微光已成燎原之势',
        25: '廿五 · 数字开始拥有重量',
        50: '半百 · 一座值得驻足的界碑',
        100: '一百 · 铸成一枚完整的徽章',
        250: '二百五十 · 节奏即是复利',
        500: '五百 · 山巅的空气格外清澈',
        1000: '一千 · 量变完成了它的宣言',
        2500: '两千五 · 传说正在被书写',
        5000: '五千 · 星辰亦为之侧目',
        10000: '一万 · 计数的尽头是新的起点'
    };

    var CAPTIONS = [
        '始于一次微小的证明',
        '每一次计数，都是对信念的浇灌',
        '节奏是数字的呼吸',
        '坚持的形状，正在被慢慢雕琢',
        '里程碑会在恰当的时刻降临',
        '狂热脉冲，留给值得的瞬间'
    ];

    /* === 简易 Simplex-ish 噪声 (用于粒子流场) === */
    function noiseAt(x, y, t) {
        return Math.sin(x * 0.0022 + t * 0.6) * Math.cos(y * 0.0018 - t * 0.4)
             + 0.5 * Math.sin((x + y) * 0.0011 + t * 0.9);
    }

    /* === 配色读取 === */
    function paletteColors() {
        var body = document.body;
        var map = {
            aurora: ['#7af0c8', '#63c8f0', '#a8f0dc'],
            ember: ['#f0a07a', '#f0c86e', '#f6cdb8'],
            abyss: ['#7aa8f0', '#8e7af0', '#b8ccf6'],
            orchid: ['#b488f0', '#f088c8', '#d8c2f8']
        };
        return map[body.dataset.palette] || map.aurora;
    }

    /* =====================================================================
       粒子系统: 环境流场 + 计数迸射粒子
       ===================================================================== */
    var particles = [];
    var bursts = [];
    var mouse = { x: -999, y: -999 };

    function resizeCanvas() {
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function spawnAmbient() {
        var count = Math.min(70, Math.floor(window.innerWidth / 18));
        particles = [];
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: 0, vy: 0,
                size: Math.random() * 1.8 + 0.6,
                hue: Math.floor(Math.random() * 3),
                life: 1
            });
        }
    }

    function spawnBurst(x, y, count, power) {
        var colors = paletteColors();
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = (Math.random() * 3.2 + 1.2) * power;
            bursts.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.6,
                size: Math.random() * 3 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: Math.random() * 0.014 + 0.008
            });
        }
    }

    function tickParticles(time) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var colors = paletteColors();
        var t = time * 0.001;

        /* 环境流场粒子 */
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var n = noiseAt(p.x, p.y, t);
            var nx = noiseAt(p.x + 40, p.y + 40, t + 7);
            p.vx += (n - p.vx * 0.4) * 0.05;
            p.vy += (nx * 0.6 - p.vy * 0.4) * 0.05;

            /* 鼠标微引力 */
            var dx = mouse.x - p.x, dy = mouse.y - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 160 && dist > 1) {
                p.vx += (dx / dist) * 0.02;
                p.vy += (dy / dist) * 0.02;
            }

            p.x += p.vx; p.y += p.vy;
            if (p.x < -20) p.x = window.innerWidth + 20;
            if (p.x > window.innerWidth + 20) p.x = -20;
            if (p.y < -20) p.y = window.innerHeight + 20;
            if (p.y > window.innerHeight + 20) p.y = -20;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = colors[p.hue];
            ctx.globalAlpha = 0.28;
            ctx.fill();
        }

        /* 近邻连线 */
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = colors[0];
        ctx.lineWidth = 0.6;
        for (var a = 0; a < particles.length; a += 2) {
            for (var b = a + 1; b < Math.min(a + 5, particles.length); b++) {
                var pa = particles[a], pb = particles[b];
                var ddx = pa.x - pb.x, ddy = pa.y - pb.y;
                if (ddx * ddx + ddy * ddy < 9000) {
                    ctx.beginPath();
                    ctx.moveTo(pa.x, pa.y);
                    ctx.lineTo(pb.x, pb.y);
                    ctx.stroke();
                }
            }
        }

        /* 迸射粒子 */
        ctx.globalAlpha = 1;
        for (var j = bursts.length - 1; j >= 0; j--) {
            var s = bursts[j];
            s.x += s.vx; s.y += s.vy;
            s.vy += 0.045;
            s.vx *= 0.985;
            s.life -= s.decay;
            if (s.life <= 0) { bursts.splice(j, 1); continue; }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.life * 0.9;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(tickParticles);
    }

    /* =====================================================================
       翻牌计数器 (Odometer)
       ===================================================================== */
    function buildOdometer() {
        odometerEl.innerHTML = '';
        state.reels = [];
        var str = padValue(state.value);
        for (var i = 0; i < str.length; i++) {
            var ch = str[i];
            if (/\d/.test(ch)) {
                var slot = document.createElement('div');
                slot.className = 'digit-slot';
                var reel = document.createElement('div');
                reel.className = 'digit-reel';
                for (var d = 0; d <= 9; d++) {
                    var sp = document.createElement('span');
                    sp.textContent = d;
                    reel.appendChild(sp);
                }
                slot.appendChild(reel);
                odometerEl.appendChild(slot);
                state.reels.push(reel);
            } else {
                var sep = document.createElement('div');
                sep.className = 'digit-sep';
                sep.textContent = ch;
                odometerEl.appendChild(sep);
                state.reels.push(null);
            }
        }
        renderValue(false);
    }

    function padValue(v) {
        var s = String(Math.abs(v));
        while (s.length < state.digitCount) s = '0' + s;
        /* 高位零点弱化: 保留最后4位前的引导零 */
        return (v < 0 ? '-' : '') + s;
    }

    function renderValue(animate) {
        var str = padValue(state.value);
        /* 位数增长时重建 */
        if (str.replace('-', '').length > state.digitCount) {
            state.digitCount = str.replace('-', '').length;
            buildOdometer();
            return;
        }
        var chars = str.split('');
        var slots = odometerEl.children;
        var digitIndex = 0;
        for (var i = 0; i < chars.length; i++) {
            if (!/\d/.test(chars[i])) continue;
            var reel = state.reels[i];
            var digit = parseInt(chars[i], 10);
            if (reel) {
                reel.style.transform = 'translateY(-' + (digit * 1.18) + 'em)';
                if (animate) {
                    var slot = slots[i];
                    if (slot) {
                        slot.classList.remove('jump');
                        void slot.offsetWidth; /* 重启动画 */
                        slot.classList.add('jump');
                        setTimeout(function (sl) {
                            return function () { sl.classList.remove('jump'); };
                        }(slot), 520);
                    }
                }
            }
            digitIndex++;
        }
        /* 引导零弱化 */
        markLeadingZeros(chars);
    }

    function markLeadingZeros(chars) {
        var slots = odometerEl.querySelectorAll('.digit-slot');
        var seenNonZero = false;
        var digitSlots = [];
        for (var i = 0; i < chars.length; i++) {
            if (/\d/.test(chars[i])) digitSlots.push({ ch: chars[i] });
        }
        var keepFrom = Math.max(0, digitSlots.length - 4);
        for (var k = 0; k < digitSlots.length; k++) {
            var el = slots[k];
            if (!el) continue;
            if (k < keepFrom && digitSlots[k].ch === '0') {
                el.classList.add('minor');
            } else {
                el.classList.remove('minor');
            }
        }
    }

    /* === 进度环 === */
    function milestoneTargets(v) {
        var targets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
        for (var i = 0; i < targets.length; i++) {
            if (v < targets[i]) return { next: targets[i], prev: i === 0 ? 0 : targets[i - 1] };
        }
        /* 超越最大里程碑后进入循环百位节奏 */
        var cycle = Math.ceil((v + 1) / 100) * 100;
        return { next: cycle, prev: cycle - 100 };
    }

    function renderRing() {
        var m = milestoneTargets(state.value);
        var progress = (state.value - m.prev) / (m.next - m.prev);
        progress = Math.max(0, Math.min(1, progress));
        ringBar.style.strokeDashoffset = String(RING_LEN * (1 - progress));
        ringLabel.textContent = 'NEXT ' + m.next;
    }

    /* =====================================================================
       计数核心逻辑
       ===================================================================== */
    function applyDelta(delta, origin) {
        var prev = state.value;
        state.value = Math.max(0, state.value + delta);
        if (state.value === prev && delta < 0) return;
        state.ops++;
        renderValue(true);
        renderRing();
        bumpStat(statOps, state.ops);
        statNet.textContent = state.value;

        /* 击键节奏 */
        var now = performance.now();
        state.tapTimes.push(now);
        if (state.tapTimes.length > 8) state.tapTimes.shift();
        updateTempo();

        /* 数字迸射 */
        if (origin) {
            spawnBurst(origin.x, origin.y, Math.min(30, 8 + Math.abs(delta) * 2), 1);
        } else {
            var rect = heroStage.getBoundingClientRect();
            spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, Math.min(26, 6 + Math.abs(delta) * 2), 1);
        }

        /* 里程碑检测 */
        checkMilestones(prev, state.value, origin);
    }

    function checkMilestones(prev, curr, origin) {
        var keys = Object.keys(MILESTONE_QUOTES).map(Number).sort(function (a, b) { return a - b; });
        for (var i = 0; i < keys.length; i++) {
            var target = keys[i];
            if (prev < target && curr >= target) {
                celebrateMilestone(target, origin);
            }
        }
    }

    function celebrateMilestone(target, origin) {
        state.milestones++;
        bumpStat(statMilestones, state.milestones);

        var rect = heroStage.getBoundingClientRect();
        var cx = origin ? origin.x : rect.left + rect.width / 2;
        var cy = origin ? origin.y : rect.top + rect.height / 2;

        /* 三重冲击波 */
        for (var w = 0; w < 3; w++) {
            setTimeout(function () {
                var wave = document.createElement('div');
                wave.className = 'shockwave';
                wave.style.left = cx + 'px';
                wave.style.top = cy + 'px';
                document.body.appendChild(wave);
                setTimeout(function (elm) {
                    return function () { elm.remove(); };
                }(wave), 950);
            }, w * 160);
        }

        /* 粒子礼花 */
        spawnBurst(cx, cy, 90, 2.2);
        setTimeout(function () { spawnBurst(cx, cy, 60, 3); }, 200);

        /* 祝词浮层 */
        showToast('✦ ' + MILESTONE_QUOTES[target]);

        /* 编年史铭刻 */
        appendLog(target, MILESTONE_QUOTES[target]);

        /* 徽章核脉冲 */
        glyphCore.textContent = target >= 1000 ? '✦' : 'Σ';
        glyphCore.classList.add('pulse');
        setTimeout(function () { glyphCore.classList.remove('pulse'); }, 720);

        /* 数字列全体欢腾 */
        var slots = odometerEl.querySelectorAll('.digit-slot');
        for (var s = 0; s < slots.length; s++) {
            (function (slot, delay) {
                setTimeout(function () {
                    slot.style.transition = 'transform 0.4s ' + EASE;
                    slot.style.transform = 'translateY(-10px) scale(1.08)';
                    setTimeout(function () { slot.style.transform = ''; }, 300);
                }, delay);
            })(slots[s], s * 55);
        }
    }

    function appendLog(value, text) {
        if (logEmpty && logEmpty.parentNode) logEmpty.remove();
        var li = document.createElement('li');
        li.className = 'log-item';
        var v = document.createElement('span');
        v.className = 'log-value';
        v.textContent = value;
        var t = document.createElement('span');
        t.className = 'log-text';
        t.textContent = text;
        li.appendChild(v);
        li.appendChild(t);
        logList.insertBefore(li, logList.firstChild);
    }

    function showToast(text) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        toastLayer.appendChild(toast);
        setTimeout(function () { toast.classList.add('out'); }, 2400);
        setTimeout(function () { toast.remove(); }, 3000);
    }

    /* === 遥测 === */
    function bumpStat(el, value) {
        el.textContent = value;
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
    }

    function updateTempo() {
        var now = performance.now();
        state.tapTimes = state.tapTimes.filter(function (t) { return now - t < 4000; });
        if (state.tapTimes.length < 2) {
            statTempo.textContent = '—';
            tempoFill.style.width = '0%';
            return;
        }
        var intervals = [];
        for (var i = 1; i < state.tapTimes.length; i++) {
            intervals.push(state.tapTimes[i] - state.tapTimes[i - 1]);
        }
        var avg = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
        var bpm = Math.round(60000 / Math.max(avg, 80));
        statTempo.textContent = bpm;
        var level = Math.min(1, (bpm - 30) / 240);
        tempoFill.style.width = (level * 100).toFixed(1) + '%';
        if (level > 0.75) swapCaption('满档节奏态 · 数字在你掌心起舞');
    }

    var captionTimer = null;
    function swapCaption(text) {
        if (captionLine.textContent === text) return;
        captionLine.classList.add('swap');
        clearTimeout(captionTimer);
        captionTimer = setTimeout(function () {
            captionLine.textContent = text;
            captionLine.classList.remove('swap');
        }, 460);
    }

    function rotateCaption() {
        var pick = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
        swapCaption(pick);
    }

    /* =====================================================================
       交互绑定
       ===================================================================== */
    function getOrigin(evt) {
        if (evt && evt.clientX && evt.clientY) {
            return { x: evt.clientX, y: evt.clientY };
        }
        var rect = heroStage.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    /* 步进选择 */
    var stepBtns = document.querySelectorAll('.step-btn');
    stepBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            stepBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.step = parseInt(btn.dataset.step, 10);
            plusLabel.textContent = state.step;
        });
    });

    /* 增减按钮 + 长按连发 */
    document.querySelectorAll('.ctrl-btn').forEach(function (btn) {
        var holdTimer = null;
        var holdInterval = null;
        btn.addEventListener('click', function (evt) {
            var delta = parseInt(btn.dataset.delta, 10) * state.step;
            if (btn.classList.contains('ctrl-plus')) {
                applyDelta(Math.max(1, delta), getOrigin(evt));
            } else {
                applyDelta(delta < 0 ? Math.min(-1, delta) : -1, getOrigin(evt));
            }
        });
        btn.addEventListener('pointerdown', function () {
            holdTimer = setTimeout(function () {
                holdInterval = setInterval(function () {
                    applyDelta(btn.dataset.delta > 0 ? state.step : -state.step, null);
                }, 110);
            }, 520);
        });
        function stopHold() {
            clearTimeout(holdTimer);
            clearInterval(holdInterval);
        }
        btn.addEventListener('pointerup', stopHold);
        btn.addEventListener('pointerleave', stopHold);
        btn.addEventListener('pointercancel', stopHold);
    });

    /* 狂热脉冲: 十连击交错爆发 */
    burstBtn.addEventListener('click', function (evt) {
        var origin = getOrigin(evt);
        for (var i = 0; i < 10; i++) {
            setTimeout(function (idx) {
                return function () {
                    applyDelta(state.step, null);
                    if (idx % 3 === 0) spawnBurst(origin.x + (Math.random() - 0.5) * 120, origin.y + (Math.random() - 0.5) * 60, 18, 1.4);
                };
            }(i), i * 90);
        }
        swapCaption('狂热脉冲已释放 · 证明之火正在燃烧');
    });

    /* 归零(带确认感的粒子回卷) */
    resetBtn.addEventListener('click', function (evt) {
        if (state.value === 0) return;
        var origin = getOrigin(evt);
        spawnBurst(origin.x, origin.y, 40, 1.8);
        state.value = 0;
        renderValue(false);
        renderRing();
        statNet.textContent = '0';
        swapCaption('归零不是结束 · 而是下一次证明的序章');
    });

    /* 键盘 */
    window.addEventListener('keydown', function (evt) {
        if (evt.repeat) return;
        var rect = heroStage.getBoundingClientRect();
        var origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        switch (evt.code) {
            case 'Space':
                evt.preventDefault();
                applyDelta(state.step, origin);
                break;
            case 'ArrowRight':
                evt.preventDefault();
                applyDelta(state.step, origin);
                break;
            case 'ArrowLeft':
                evt.preventDefault();
                applyDelta(-state.step, origin);
                break;
            case 'ArrowUp':
                evt.preventDefault();
                burstBtn.click();
                break;
            case 'KeyR':
                resetBtn.click();
                break;
        }
    });

    /* 舞台点击 = 计数 */
    heroStage.addEventListener('pointerdown', function (evt) {
        if (evt.target.closest('.ctrl-btn') || evt.target.closest('.aux-btn')) return;
        applyDelta(1, { x: evt.clientX, y: evt.clientY });
    });

    /* 鼠标追踪 */
    window.addEventListener('pointermove', function (evt) {
        mouse.x = evt.clientX;
        mouse.y = evt.clientY;
    }, { passive: true });

    /* 配色切换 */
    document.querySelectorAll('.palette-dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
            document.querySelectorAll('.palette-dot').forEach(function (d) { d.classList.remove('active'); });
            dot.classList.add('active');
            document.body.dataset.palette = dot.dataset.palette;
            spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 36, 1.6);
        });
    });

    /* 自适应 */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resizeCanvas();
            spawnAmbient();
        }, 200);
    });

    /* =====================================================================
       初始化
       ===================================================================== */
    function init() {
        resizeCanvas();
        spawnAmbient();
        buildOdometer();
        renderRing();
        requestAnimationFrame(tickParticles);
        setInterval(rotateCaption, 9000);
    }

    init();
})();
