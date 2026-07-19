/* =====================================================================
 * Demo Activator · 唤醒之触
 * 高阶微交互剧场 · 交互逻辑层
 *
 * 维护者: EDEN
 *
 * 模块清单:
 *   - Core        中央唤醒体 (长按蓄能)
 *   - Pulse       脉冲蓄能按钮 (HOLD-TO-CHARGE)
 *   - Magnet      磁力漂移碎片 (光标磁场)
 *   - Spring      弹簧拖拽节点 (SPRING-DAMPER 物理)
 *   - Reveal      模板揭示遮罩 (光标 STENCIL)
 *   - Flow        流体粒子轨迹 (CANVAS 流场)
 *   - Burst       级联点亮网格 (SEQUENCE BURST)
 *
 * 工具:
 *   - CursorGlow  全局光晕跟随
 *   - FlowField   全局背景粒子流场
 *   - FPSMonitor  性能监测
 * ===================================================================== */

(function () {
    'use strict';

    /* ================================================================
     * Constants & Globals
     * ================================================================ */

    var EASE_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var smoothX = mouseX;
    var smoothY = mouseY;
    var lastMoveTime = performance.now();
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ================================================================
     * DOM References
     * ================================================================ */

    var doc = document;
    var body = doc.body;
    var cursorGlow = doc.getElementById('cursor-glow');
    var themeToggle = doc.getElementById('theme-toggle');
    var chargeReadout = doc.getElementById('readout-value');
    var coreReadout = doc.getElementById('core-readout');
    var signalCounter = doc.getElementById('signal-counter');
    var fpsCounter = doc.getElementById('fps-counter');
    var flashLayer = doc.getElementById('flash-layer');
    var flowCanvas = doc.getElementById('flow-canvas');
    var flowCtx = flowCanvas.getContext('2d');

    // Core
    var coreBody = doc.getElementById('core-body');
    var coreState = doc.getElementById('core-state');

    // Module 01 Pulse
    var pulseButton = doc.getElementById('pulse-button');
    var pulseRing = doc.getElementById('pulse-ring-fg');
    var pulseCore = doc.getElementById('pulse-core');
    var pulseWave = doc.getElementById('pulse-wave');

    // Module 02 Magnet
    var magnetField = doc.getElementById('magnet-field');

    // Module 03 Spring
    var springStage = doc.getElementById('spring-stage');
    var springNode = doc.getElementById('spring-node');
    var springTether = doc.getElementById('spring-tether');
    var tetherLine = springTether.querySelector('.tether-line');
    var tetherShadow = springTether.querySelector('.tether-shadow');

    // Module 04 Reveal
    var revealStage = doc.getElementById('reveal-stage');
    var revealStencil = doc.getElementById('reveal-stencil');

    // Module 05 Flow mini
    var flowMini = doc.getElementById('flow-mini');
    var flowMiniCtx = flowMini.getContext('2d');

    // Module 06 Burst
    var burstTrigger = doc.getElementById('burst-trigger');
    var burstGrid = doc.getElementById('burst-grid');

    /* ================================================================
     * Utility Helpers
     * ================================================================ */

    function clamp(value, min, max) {
        return value < min ? min : (value > max ? max : value);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function pad2(value) {
        return value < 10 ? '0' + value : String(value);
    }

    function pad3(value) {
        if (value < 10) return '00' + value;
        if (value < 100) return '0' + value;
        return String(value);
    }

    function getAccentColor() {
        return getComputedStyle(doc.documentElement).getPropertyValue('--color-accent').trim() || '#6366f1';
    }

    function getEventXY(event) {
        if (event.touches && event.touches.length) {
            return { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
        if (event.changedTouches && event.changedTouches.length) {
            return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
        }
        return { x: event.clientX, y: event.clientY };
    }

    /* ================================================================
     * Global Flow Field (背景流体粒子)
     * ================================================================ */

    var FlowField = (function () {
        var particles = [];
        var PARTICLE_COUNT = 64;
        var dpr = 1;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            flowCanvas.width = window.innerWidth * dpr;
            flowCanvas.height = window.innerHeight * dpr;
            flowCanvas.style.width = window.innerWidth + 'px';
            flowCanvas.style.height = window.innerHeight + 'px';
            flowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function seed() {
            particles = [];
            for (var i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    vx: rand(-0.3, 0.3),
                    vy: rand(-0.3, 0.3),
                    size: rand(0.6, 1.8),
                    life: rand(0, 1)
                });
            }
        }

        function step() {
            flowCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            var accent = getAccentColor();

            // 半透明叠加营造拖尾
            flowCtx.fillStyle = 'rgba(7, 7, 16, 0.12)';
            flowCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];

                // 鼠标引力 (轻微)
                var dx = mouseX - p.x;
                var dy = mouseY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 240 && dist > 0.001) {
                    var force = (1 - dist / 240) * 0.045;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                // 阻尼
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.x += p.vx;
                p.y += p.vy;
                p.life += 0.005;

                // 出界回环
                if (p.x < -20) p.x = window.innerWidth + 20;
                if (p.x > window.innerWidth + 20) p.x = -20;
                if (p.y < -20) p.y = window.innerHeight + 20;
                if (p.y > window.innerHeight + 20) p.y = -20;

                // 渲染
                var alpha = 0.5 + Math.sin(p.life * 3) * 0.4;
                flowCtx.beginPath();
                flowCtx.fillStyle = accent;
                flowCtx.globalAlpha = alpha * 0.45;
                flowCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                flowCtx.fill();
            }

            flowCtx.globalAlpha = 1;
        }

        return {
            init: function () {
                resize();
                seed();
                window.addEventListener('resize', function () {
                    resize();
                    seed();
                });
            },
            step: step
        };
    })();

    /* ================================================================
     * Cursor Glow
     * ================================================================ */

    var CursorGlow = (function () {
        function update() {
            // 缓动跟随
            smoothX = lerp(smoothX, mouseX, 0.16);
            smoothY = lerp(smoothY, mouseY, 0.16);
            cursorGlow.style.transform =
                'translate3d(' + smoothX + 'px, ' + smoothY + 'px, 0) translate(-50%, -50%)';
        }
        return { update: update };
    })();

    /* ================================================================
     * Core Module · 中央唤醒体
     * ================================================================ */

    var Core = (function () {
        var charge = 0;
        var holding = false;
        var lastTime = 0;
        var rafId = null;
        var CHARGE_RATE = 1 / 1600; // 充满约需 1.6s

        function start() {
            if (holding) return;
            holding = true;
            lastTime = performance.now();
            coreBody.classList.add('is-pressed');
            coreBody.classList.remove('is-released');
            coreState.textContent = 'CHARGING';
            signal('CHARGING');
            loop();
        }

        function loop() {
            if (!holding) return;
            var now = performance.now();
            var dt = now - lastTime;
            lastTime = now;
            charge = clamp(charge + dt * CHARGE_RATE, 0, 1);
            render();
            if (charge >= 1) {
                release();
                return;
            }
            rafId = requestAnimationFrame(loop);
        }

        function release() {
            if (!holding) return;
            holding = false;
            if (rafId) cancelAnimationFrame(rafId);
            coreBody.classList.remove('is-pressed');

            if (charge > 0.08) {
                coreBody.classList.add('is-charged', 'is-released');
                coreState.textContent = 'AWAKEN';
                signal('BURST ' + Math.round(charge * 100) + '%');
                triggerFlash();
                // 短暂延迟后复位
                setTimeout(function () {
                    coreBody.classList.remove('is-charged', 'is-released');
                }, 1300);
            } else {
                coreState.textContent = 'DORMANT';
            }

            // 能量衰减
            decay();
        }

        function decay() {
            var start = charge;
            var startTime = performance.now();
            var dur = 600;
            function step(now) {
                var t = clamp((now - startTime) / dur, 0, 1);
                charge = start * (1 - t);
                render();
                if (t < 1) requestAnimationFrame(step);
                else { charge = 0; render(); coreState.textContent = 'DORMANT'; signal('IDLE'); }
            }
            requestAnimationFrame(step);
        }

        function render() {
            var pct = Math.round(charge * 100);
            chargeReadout.textContent = pad3(pct);
            coreReadout.textContent = '能量等级 ' + charge.toFixed(3);
            chargeReadout.classList.toggle('is-surging', charge > 0.05);
            coreReadout.classList.toggle('is-surging', charge > 0.05);
            // 核心轻微缩放反映能量
            var scale = 1 + charge * 0.05;
            if (!holding) {
                coreBody.style.transform = '';
            } else {
                coreBody.style.transform = 'scale(' + (0.96 + charge * 0.06) + ')';
            }
        }

        function signal(text) {
            signalCounter.textContent = 'SIGNAL · ' + text;
            signalCounter.classList.toggle('is-active', text !== 'IDLE');
        }

        function bind() {
            coreBody.addEventListener('mousedown', start);
            coreBody.addEventListener('touchstart', function (e) { e.preventDefault(); start(); }, { passive: false });
            window.addEventListener('mouseup', release);
            window.addEventListener('touchend', release);
            window.addEventListener('mouseleave', release);
        }

        return {
            init: function () {
                bind();
                render();
            }
        };
    })();

    /* ================================================================
     * Module 01 · Pulse Charge
     * ================================================================ */

    var Pulse = (function () {
        var CIRC = 2 * Math.PI * 54; // 半径 54 → 周长
        var holding = false;
        var charge = 0;
        var lastTime = 0;
        var rafId = null;
        var RATE = 1 / 1400;

        function start() {
            if (holding) return;
            holding = true;
            lastTime = performance.now();
            pulseButton.classList.add('is-charging');
            pulseCore.textContent = 'HOLD';
            loop();
        }

        function loop() {
            if (!holding) return;
            var now = performance.now();
            var dt = now - lastTime;
            lastTime = now;
            charge = clamp(charge + dt * RATE, 0, 1);
            render();
            if (charge >= 1) {
                burst();
                return;
            }
            rafId = requestAnimationFrame(loop);
        }

        function render() {
            var offset = CIRC * (1 - charge);
            pulseRing.style.strokeDashoffset = offset;
            pulseCore.textContent = pad2(Math.round(charge * 100));
        }

        function release() {
            if (!holding) return;
            holding = false;
            if (rafId) cancelAnimationFrame(rafId);
            pulseButton.classList.remove('is-charging');
            if (charge > 0.05) burst();
            else reset();
        }

        function burst() {
            // 触发涟漪
            pulseWave.classList.remove('is-burst');
            void pulseWave.offsetWidth; // reflow 重启动画
            pulseWave.classList.add('is-burst');
            pulseCore.textContent = Math.round(charge * 100) >= 100 ? 'MAX' : 'GO';

            // 衰减
            var start = charge;
            var startTime = performance.now();
            var dur = 700;
            function step(now) {
                var t = clamp((now - startTime) / dur, 0, 1);
                charge = start * (1 - t);
                render();
                if (t < 1) requestAnimationFrame(step);
                else reset();
            }
            requestAnimationFrame(step);
        }

        function reset() {
            charge = 0;
            pulseRing.style.strokeDashoffset = CIRC;
            pulseCore.textContent = 'HOLD';
        }

        function bind() {
            pulseButton.addEventListener('mousedown', start);
            pulseButton.addEventListener('touchstart', function (e) { e.preventDefault(); start(); }, { passive: false });
            window.addEventListener('mouseup', release);
            window.addEventListener('touchend', release);
        }

        return {
            init: function () {
                bind();
                pulseRing.style.strokeDasharray = CIRC;
                reset();
            }
        };
    })();

    /* ================================================================
     * Module 02 · Magnetic Drift
     * ================================================================ */

    var Magnet = (function () {
        var shards = [];
        var FIELD_RADIUS = 220;

        function setup() {
            var els = magnetField.querySelectorAll('.magnet-shard');
            for (var i = 0; i < els.length; i++) {
                shards.push({ el: els[i], x: 0, y: 0, tx: 0, ty: 0 });
            }
        }

        function step() {
            var rect = magnetField.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;

            for (var i = 0; i < shards.length; i++) {
                var s = shards[i];
                var depth = parseFloat(s.el.getAttribute('data-depth')) || 0.5;

                // 目标偏移：朝向光标
                var dx = mouseX - cx;
                var dy = mouseY - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var force = 0;
                if (dist < FIELD_RADIUS) {
                    force = (1 - dist / FIELD_RADIUS) * depth * 36;
                }
                if (dist > 0.001) {
                    s.tx = (dx / dist) * force;
                    s.ty = (dy / dist) * force;
                } else {
                    s.tx = 0;
                    s.ty = 0;
                }

                // 弹簧缓动归位
                s.x = lerp(s.x, s.tx, 0.12);
                s.y = lerp(s.y, s.ty, 0.12);

                s.el.style.transform = 'translate(' + s.x.toFixed(2) + 'px, ' + s.y.toFixed(2) + 'px)';
            }
        }

        return {
            init: function () { setup(); },
            step: step
        };
    })();

    /* ================================================================
     * Module 03 · Spring Drag
     * ================================================================ */

    var Spring = (function () {
        var anchorX = 0;
        var anchorY = 0;
        var x = 0;
        var y = 0;
        var vx = 0;
        var vy = 0;
        var dragging = false;
        var dragOffsetX = 0;
        var dragOffsetY = 0;

        // 弹簧物理参数
        var STIFFNESS = 0.12;
        var DAMPING = 0.78;
        var MAX_TETHER = 160;

        function recalcAnchor() {
            var stageRect = springStage.getBoundingClientRect();
            anchorX = stageRect.width / 2;
            anchorY = stageRect.height / 2;
        }

        function setTether(x1, y1, x2, y2) {
            tetherLine.setAttribute('x1', x1);
            tetherLine.setAttribute('y1', y1);
            tetherLine.setAttribute('x2', x2);
            tetherLine.setAttribute('y2', y2);
            tetherShadow.setAttribute('x1', x1);
            tetherShadow.setAttribute('y1', y1);
            tetherShadow.setAttribute('x2', x2);
            tetherShadow.setAttribute('y2', y2);
        }

        function start(event) {
            event.preventDefault();
            dragging = true;
            var stageRect = springStage.getBoundingClientRect();
            var pt = getEventXY(event);
            var nodeX = stageRect.left + anchorX + x;
            var nodeY = stageRect.top + anchorY + y;
            dragOffsetX = pt.x - nodeX;
            dragOffsetY = pt.y - nodeY;
            springNode.classList.add('is-dragging');
            springNode.setAttribute('aria-grabbed', 'true');
        }

        function move(event) {
            if (!dragging) return;
            var stageRect = springStage.getBoundingClientRect();
            var pt = getEventXY(event);
            var localX = pt.x - stageRect.left - dragOffsetX - anchorX;
            var localY = pt.y - stageRect.top - dragOffsetY - anchorY;
            // 限制最远距离
            var d = Math.sqrt(localX * localX + localY * localY);
            if (d > MAX_TETHER) {
                localX = (localX / d) * MAX_TETHER;
                localY = (localY / d) * MAX_TETHER;
            }
            x = localX;
            y = localY;
            vx = 0;
            vy = 0;
        }

        function end() {
            if (!dragging) return;
            dragging = false;
            springNode.classList.remove('is-dragging');
            springNode.setAttribute('aria-grabbed', 'false');
        }

        function step() {
            if (!dragging) {
                // 弹簧回归
                var fx = -STIFFNESS * x;
                var fy = -STIFFNESS * y;
                vx = (vx + fx) * DAMPING;
                vy = (vy + fy) * DAMPING;
                x += vx;
                y += vy;

                // 阈值静止
                if (Math.abs(x) < 0.02 && Math.abs(y) < 0.02 && Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02) {
                    x = 0; y = 0; vx = 0; vy = 0;
                }
            }
            springNode.style.transform = 'translate(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px)';
            setTether(anchorX, anchorY, anchorX + x, anchorY + y);

            // 越界抖动
            var tension = Math.sqrt(x * x + y * y) / MAX_TETHER;
            tetherLine.style.opacity = (0.3 + tension * 0.7).toFixed(2);
        }

        function bind() {
            recalcAnchor();
            springNode.addEventListener('mousedown', start);
            springNode.addEventListener('touchstart', start, { passive: false });
            window.addEventListener('mousemove', move);
            window.addEventListener('touchmove', move, { passive: false });
            window.addEventListener('mouseup', end);
            window.addEventListener('touchend', end);
            window.addEventListener('resize', recalcAnchor);
        }

        return {
            init: function () {
                bind();
                setTether(0, 0, 0, 0);
            },
            recalcAnchor: recalcAnchor
        };
    })();

    /* ================================================================
     * Module 04 · Reveal Stencil
     * ================================================================ */

    var Reveal = (function () {
        function move(event) {
            var stageRect = revealStage.getBoundingClientRect();
            var pt = getEventXY(event);
            var lx = pt.x - stageRect.left;
            var ly = pt.y - stageRect.top;

            // 仅当光标在 stage 内才更新 (允许稍微溢出)
            if (lx < -50 || ly < -50 || lx > stageRect.width + 50 || ly > stageRect.height + 50) {
                return;
            }
            var px = (lx / stageRect.width) * 100;
            var py = (ly / stageRect.height) * 100;
            revealStencil.style.webkitMaskImage =
                'radial-gradient(circle 80px at ' + px + '% ' + py + '%, #000 0%, #000 65%, transparent 100%)';
            revealStencil.style.maskImage =
                'radial-gradient(circle 80px at ' + px + '% ' + py + '%, #000 0%, #000 65%, transparent 100%)';
            revealStage.classList.add('is-active');
        }

        function leave() {
            revealStage.classList.remove('is-active');
        }

        return {
            init: function () {
                revealStage.addEventListener('mousemove', move);
                revealStage.addEventListener('touchmove', function (e) {
                    e.preventDefault();
                    move(e);
                }, { passive: false });
                revealStage.addEventListener('mouseleave', leave);
                revealStage.addEventListener('touchend', leave);
            }
        };
    })();

    /* ================================================================
     * Module 05 · Flow Trail (mini canvas)
     * ================================================================ */

    var FlowMini = (function () {
        var particles = [];
        var dpr = 1;
        var w = 0;
        var h = 0;
        var lastEmitX = -1;
        var lastEmitY = -1;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            var rect = flowMini.getBoundingClientRect();
            w = rect.width;
            h = rect.height;
            flowMini.width = w * dpr;
            flowMini.height = h * dpr;
            flowMiniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function emit(x, y) {
            if (lastEmitX < 0) { lastEmitX = x; lastEmitY = y; }
            var dx = x - lastEmitX;
            var dy = y - lastEmitY;
            var speed = Math.sqrt(dx * dx + dy * dy);
            var count = Math.min(Math.round(speed / 3), 6);
            for (var i = 0; i < count; i++) {
                particles.push({
                    x: x + rand(-2, 2),
                    y: y + rand(-2, 2),
                    vx: rand(-0.8, 0.8) + dx * 0.1,
                    vy: rand(-0.8, 0.8) + dy * 0.1,
                    life: 1,
                    size: rand(1, 2.4)
                });
            }
            lastEmitX = x;
            lastEmitY = y;
        }

        function step() {
            flowMiniCtx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            flowMiniCtx.fillRect(0, 0, w, h);
            var accent = getAccentColor();

            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.012;
                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                flowMiniCtx.beginPath();
                flowMiniCtx.fillStyle = accent;
                flowMiniCtx.globalAlpha = p.life * 0.85;
                flowMiniCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                flowMiniCtx.fill();
            }
            flowMiniCtx.globalAlpha = 1;
        }

        function bind() {
            flowMini.addEventListener('mousemove', function (event) {
                var rect = flowMini.getBoundingClientRect();
                emit(event.clientX - rect.left, event.clientY - rect.top);
            });
            flowMini.addEventListener('touchmove', function (event) {
                event.preventDefault();
                var rect = flowMini.getBoundingClientRect();
                var pt = getEventXY(event);
                emit(pt.x - rect.left, pt.y - rect.top);
            }, { passive: false });
            window.addEventListener('resize', resize);
        }

        return {
            init: function () {
                resize();
                bind();
            },
            resize: resize,
            step: step
        };
    })();

    /* ================================================================
     * Module 06 · Sequence Burst
     * ================================================================ */

    var Burst = (function () {
        var CELLS = 32; // 8 列 × 4 行
        var isRunning = false;
        var lastRun = 0;

        function build() {
            var frag = doc.createDocumentFragment();
            for (var i = 0; i < CELLS; i++) {
                var c = doc.createElement('div');
                c.className = 'burst-cell';
                frag.appendChild(c);
            }
            burstGrid.appendChild(frag);
        }

        function run() {
            if (isRunning) return;
            var now = performance.now();
            if (now - lastRun < 400) return; // 节流
            lastRun = now;
            isRunning = true;

            var cells = burstGrid.querySelectorAll('.burst-cell');
            // 生成乱序点亮序列
            var order = [];
            for (var i = 0; i < cells.length; i++) order.push(i);
            // Fisher-Yates 洗牌
            for (var j = order.length - 1; j > 0; j--) {
                var k = Math.floor(Math.random() * (j + 1));
                var tmp = order[j];
                order[j] = order[k];
                order[k] = tmp;
            }

            var STEP = 22;
            for (var n = 0; n < order.length; n++) {
                (function (idx, delay) {
                    setTimeout(function () {
                        cells[idx].classList.add('is-lit');
                        setTimeout(function () {
                            cells[idx].classList.remove('is-lit');
                            if (idx === order[order.length - 1]) {
                                setTimeout(function () { isRunning = false; }, 200);
                            }
                        }, 280);
                    }, delay);
                })(order[n], n * STEP);
            }
        }

        // 跟踪光标位置做按钮辉光
        function trackButton(event) {
            var rect = burstTrigger.getBoundingClientRect();
            var px = ((event.clientX - rect.left) / rect.width) * 100;
            var py = ((event.clientY - rect.top) / rect.height) * 100;
            px = clamp(px, 0, 100);
            py = clamp(py, 0, 100);
            burstTrigger.style.setProperty('--mx', px + '%');
            burstTrigger.style.setProperty('--my', py + '%');
        }

        return {
            init: function () {
                build();
                burstTrigger.addEventListener('click', run);
                burstTrigger.addEventListener('mousemove', trackButton);
            }
        };
    })();

    /* ================================================================
     * Theme Toggle
     * ================================================================ */

    var Theme = (function () {
        function bind() {
            themeToggle.addEventListener('click', function (event) {
                var target = event.target;
                if (!target.classList.contains('theme-btn')) return;
                var next = target.getAttribute('data-theme');
                if (!next || next === body.getAttribute('data-theme')) return;
                body.setAttribute('data-theme', next);
                var btns = themeToggle.querySelectorAll('.theme-btn');
                for (var i = 0; i < btns.length; i++) {
                    btns[i].classList.toggle('active', btns[i] === target);
                }
            });
        }
        return { init: bind };
    })();

    /* ================================================================
     * Flash Burst (主题切换/核心释放的闪光)
     * ================================================================ */

    function triggerFlash() {
        flashLayer.classList.remove('is-flashing');
        void flashLayer.offsetWidth;
        flashLayer.classList.add('is-flashing');
    }

    /* ================================================================
     * Global Mouse Tracking
     * ================================================================ */

    function bindMouse() {
        window.addEventListener('mousemove', function (event) {
            mouseX = event.clientX;
            mouseY = event.clientY;
            lastMoveTime = performance.now();
        });
        window.addEventListener('touchmove', function (event) {
            if (!event.touches.length) return;
            mouseX = event.touches[0].clientX;
            mouseY = event.touches[0].clientY;
            lastMoveTime = performance.now();
        }, { passive: true });
    }

    /* ================================================================
     * FPS Monitor
     * ================================================================ */

    var FPS = (function () {
        var frames = 0;
        var lastTime = performance.now();
        function tick() {
            frames++;
            var now = performance.now();
            if (now - lastTime >= 1000) {
                var value = Math.round(frames * 1000 / (now - lastTime));
                fpsCounter.textContent = value + ' FPS';
                frames = 0;
                lastTime = now;
            }
        }
        return { tick: tick };
    })();

    /* ================================================================
     * Animation Loop
     * ================================================================ */

    function loop() {
        CursorGlow.update();
        FlowField.step();
        Magnet.step();
        Spring.step();
        FlowMini.step();
        FPS.tick();
        requestAnimationFrame(loop);
    }

    /* ================================================================
     * Bootstrap
     * ================================================================ */

    function init() {
        FlowField.init();
        CursorGlow.update();
        Core.init();
        Pulse.init();
        Magnet.init();
        Spring.init();
        Reveal.init();
        FlowMini.init();
        Burst.init();
        Theme.init();
        bindMouse();

        // 主题切换时刷新色彩依赖的 canvas 状态
        themeToggle.addEventListener('click', function () {
            // 让 Spring reflow 后重新定位 anchor (布局未变但稳妥起见)
            Spring.recalcAnchor();
        });

        requestAnimationFrame(loop);
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
