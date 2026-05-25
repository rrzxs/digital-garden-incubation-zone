(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var state = {
        currentScene: 0,
        totalScenes: 6,
        sliceMode: 'vertical',
        sliceCount: 8,
        duration: 1000,
        stagger: 60,
        damping: 1.0,
        autoplay: false,
        autoplayInterval: 4000,
        autoplayTimer: null,
        isTransitioning: false,
        mouse: { x: 0, y: 0 },
        particles: []
    };

    var dom = {};
    var bgCanvas, bgCtx;
    var animFrame;

    function init() {
        cacheDom();
        bindEvents();
        initParticles();
        buildSceneDots();
        animateParticles();
    }

    function cacheDom() {
        dom.stage = document.getElementById('slice-stage');
        dom.hudScene = document.getElementById('hud-scene');
        dom.dots = document.getElementById('scene-dots');
        dom.btnPrev = document.getElementById('btn-prev');
        dom.btnNext = document.getElementById('btn-next');
        dom.modeGrid = document.getElementById('mode-grid');
        dom.themeSwitcher = document.getElementById('theme-switcher');
        dom.btnFullscreen = document.getElementById('btn-fullscreen');
        dom.btnAutoplay = document.getElementById('btn-autoplay');
        dom.cursorGlow = document.getElementById('cursor-glow');
        dom.layers = document.querySelectorAll('.scene-layer');

        dom.paramCount = document.getElementById('param-count');
        dom.paramDuration = document.getElementById('param-duration');
        dom.paramStagger = document.getElementById('param-stagger');
        dom.paramDamping = document.getElementById('param-damping');
        dom.paramInterval = document.getElementById('param-interval');

        dom.valCount = document.getElementById('val-count');
        dom.valDuration = document.getElementById('val-duration');
        dom.valStagger = document.getElementById('val-stagger');
        dom.valDamping = document.getElementById('val-damping');
        dom.valInterval = document.getElementById('val-interval');

        bgCanvas = document.getElementById('particle-canvas');
        bgCtx = bgCanvas.getContext('2d');
    }

    function bindEvents() {
        dom.btnPrev.addEventListener('click', function () { goToScene(state.currentScene - 1); });
        dom.btnNext.addEventListener('click', function () { goToScene(state.currentScene + 1); });
        dom.modeGrid.addEventListener('click', handleModeClick);
        dom.themeSwitcher.addEventListener('click', handleThemeClick);
        dom.btnFullscreen.addEventListener('click', toggleFullscreen);
        dom.btnAutoplay.addEventListener('click', toggleAutoplay);

        dom.paramCount.addEventListener('input', function () {
            state.sliceCount = parseInt(this.value);
            dom.valCount.textContent = this.value;
        });
        dom.paramDuration.addEventListener('input', function () {
            state.duration = parseInt(this.value);
            dom.valDuration.textContent = (this.value / 1000).toFixed(1) + 's';
        });
        dom.paramStagger.addEventListener('input', function () {
            state.stagger = parseInt(this.value);
            dom.valStagger.textContent = this.value + 'ms';
        });
        dom.paramDamping.addEventListener('input', function () {
            state.damping = parseFloat(this.value);
            dom.valDamping.textContent = parseFloat(this.value).toFixed(1);
        });
        dom.paramInterval.addEventListener('input', function () {
            state.autoplayInterval = parseInt(this.value);
            dom.valInterval.textContent = (this.value / 1000).toFixed(0) + 's';
            if (state.autoplay) {
                stopAutoplay();
                startAutoplay();
            }
        });

        window.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            if (dom.cursorGlow) {
                dom.cursorGlow.style.left = e.clientX + 'px';
                dom.cursorGlow.style.top = e.clientY + 'px';
                dom.cursorGlow.classList.add('visible');
            }
        });

        window.addEventListener('mouseleave', function () {
            if (dom.cursorGlow) dom.cursorGlow.classList.remove('visible');
        });

        window.addEventListener('resize', function () {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                goToScene(state.currentScene - 1);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                goToScene(state.currentScene + 1);
            } else if (e.key === ' ') {
                e.preventDefault();
                toggleAutoplay();
            }
        });
    }

    function buildSceneDots() {
        dom.dots.innerHTML = '';
        for (var i = 0; i < state.totalScenes; i++) {
            var dot = document.createElement('button');
            dot.className = 'scene-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Scene ' + (i + 1));
            dot.setAttribute('data-index', i);
            dot.addEventListener('click', (function (idx) {
                return function () { goToScene(idx); };
            })(i));
            dom.dots.appendChild(dot);
        }
    }

    function handleModeClick(e) {
        var btn = e.target.closest('.mode-btn');
        if (!btn) return;
        var mode = btn.getAttribute('data-mode');
        if (!mode) return;
        state.sliceMode = mode;
        dom.modeGrid.querySelectorAll('.mode-btn').forEach(function (b) {
            b.classList.remove('active');
        });
        btn.classList.add('active');
    }

    function handleThemeClick(e) {
        var btn = e.target.closest('.theme-btn');
        if (!btn) return;
        var theme = btn.getAttribute('data-theme');
        if (!theme) return;
        document.body.parentElement.setAttribute('data-theme', theme);
        dom.themeSwitcher.querySelectorAll('.theme-btn').forEach(function (b) {
            b.classList.remove('active');
        });
        btn.classList.add('active');
    }

    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    function toggleAutoplay() {
        if (state.autoplay) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    }

    function startAutoplay() {
        state.autoplay = true;
        dom.btnAutoplay.classList.add('playing');
        dom.btnAutoplay.querySelector('span').textContent = '停止轮播';
        state.autoplayTimer = setInterval(function () {
            var next = (state.currentScene + 1) % state.totalScenes;
            goToScene(next);
        }, state.autoplayInterval);
    }

    function stopAutoplay() {
        state.autoplay = false;
        dom.btnAutoplay.classList.remove('playing');
        dom.btnAutoplay.querySelector('span').textContent = '自动轮播';
        if (state.autoplayTimer) {
            clearInterval(state.autoplayTimer);
            state.autoplayTimer = null;
        }
    }

    function goToScene(index) {
        if (state.isTransitioning) return;
        if (index < 0) index = state.totalScenes - 1;
        if (index >= state.totalScenes) index = 0;
        if (index === state.currentScene) return;

        state.isTransitioning = true;
        var from = state.currentScene;
        var to = index;
        var goingForward = to > from || (from === state.totalScenes - 1 && to === 0);

        performSliceTransition(from, to, goingForward, function () {
            state.currentScene = to;
            updateUI();
            state.isTransitioning = false;
        });
    }

    function updateUI() {
        dom.hudScene.textContent = padNum(state.currentScene + 1) + ' / ' + padNum(state.totalScenes);
        dom.btnPrev.disabled = false;
        dom.btnNext.disabled = false;

        var dots = dom.dots.querySelectorAll('.scene-dot');
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === state.currentScene);
        });

        dom.layers.forEach(function (layer) {
            var idx = parseInt(layer.getAttribute('data-layer'));
            layer.classList.toggle('active', idx === state.currentScene);
        });
    }

    function padNum(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function performSliceTransition(from, to, forward, onComplete) {
        var mode = state.sliceMode;
        var count = state.sliceCount;
        var dur = state.duration;
        var stagger = state.stagger;
        var damping = state.damping;

        var stageRect = dom.stage.getBoundingClientRect();
        var stageW = dom.stage.offsetWidth;
        var stageH = dom.stage.offsetHeight;

        var nextLayer = dom.layers[to];
        nextLayer.style.visibility = 'visible';
        nextLayer.style.opacity = '1';
        nextLayer.style.zIndex = '10';

        var oldLayer = dom.layers[from];
        oldLayer.style.zIndex = '5';

        var container = document.createElement('div');
        container.style.cssText = 'position:absolute;inset:0;z-index:10;pointer-events:none;overflow:hidden;';
        dom.stage.appendChild(container);

        var slices = [];
        var adjustedDur = dur * damping;

        if (mode === 'vertical') {
            slices = createVerticalSlices(container, nextLayer, stageW, stageH, count, forward, adjustedDur, stagger);
        } else if (mode === 'horizontal') {
            slices = createHorizontalSlices(container, nextLayer, stageW, stageH, count, forward, adjustedDur, stagger);
        } else if (mode === 'diagonal') {
            slices = createDiagonalSlices(container, nextLayer, stageW, stageH, count, forward, adjustedDur, stagger);
        } else if (mode === 'ripple') {
            slices = createRippleSlices(container, nextLayer, stageW, stageH, count, adjustedDur);
        } else if (mode === 'spiral') {
            slices = createSpiralSlices(container, nextLayer, stageW, stageH, count, adjustedDur, stagger);
        } else if (mode === 'grid') {
            slices = createGridSlices(container, nextLayer, stageW, stageH, count, adjustedDur, stagger);
        }

        var maxDelay = 0;
        slices.forEach(function (s) {
            var total = (s.delay || 0) + adjustedDur;
            if (total > maxDelay) maxDelay = total;
        });

        setTimeout(function () {
            oldLayer.classList.remove('active');
            oldLayer.style.visibility = 'hidden';
            oldLayer.style.opacity = '0';
            oldLayer.style.zIndex = '';

            nextLayer.classList.add('active');
            nextLayer.style.zIndex = '';
            container.remove();

            if (onComplete) onComplete();
        }, maxDelay + 50);
    }

    function createVerticalSlices(container, layer, w, h, count, forward, dur, stagger) {
        var sliceW = w / count;
        var slices = [];

        for (var i = 0; i < count; i++) {
            var clip = document.createElement('div');
            clip.className = 'slice-strip';
            clip.style.cssText =
                'position:absolute;top:0;width:' + sliceW + 'px;height:' + h + 'px;' +
                'left:' + (i * sliceW) + 'px;overflow:hidden;';

            var inner = document.createElement('div');
            inner.style.cssText =
                'position:absolute;top:0;left:' + (-i * sliceW) + 'px;width:' + w + 'px;height:' + h + 'px;';

            var sceneContent = layer.querySelector('.scene-inner');
            if (sceneContent) {
                inner.innerHTML = sceneContent.outerHTML;
                var clonedInner = inner.querySelector('.scene-inner');
                if (clonedInner) {
                    clonedInner.style.width = w + 'px';
                    clonedInner.style.height = h + 'px';
                }
            }

            clip.appendChild(inner);
            container.appendChild(clip);

            var offsetX = forward ? sliceW : -sliceW;
            inner.style.transform = 'translateX(' + offsetX + 'px)';
            inner.style.opacity = '0.3';

            var delay = i * stagger;
            inner.style.transition = 'transform ' + dur + 'ms ' + EASE + ' ' + delay + 'ms, opacity ' + (dur * 0.5) + 'ms ease ' + delay + 'ms';

            requestAnimationFrame(function (el, ox) {
                return function () {
                    requestAnimationFrame(function () {
                        el.style.transform = 'translateX(0px)';
                        el.style.opacity = '1';
                    });
                };
            }(inner, offsetX));

            slices.push({ delay: delay, el: inner });
        }

        return slices;
    }

    function createHorizontalSlices(container, layer, w, h, count, forward, dur, stagger) {
        var sliceH = h / count;
        var slices = [];

        for (var i = 0; i < count; i++) {
            var clip = document.createElement('div');
            clip.className = 'slice-strip';
            clip.style.cssText =
                'position:absolute;left:0;height:' + sliceH + 'px;width:' + w + 'px;' +
                'top:' + (i * sliceH) + 'px;overflow:hidden;';

            var inner = document.createElement('div');
            inner.style.cssText =
                'position:absolute;left:0;top:' + (-i * sliceH) + 'px;width:' + w + 'px;height:' + h + 'px;';

            var sceneContent = layer.querySelector('.scene-inner');
            if (sceneContent) {
                inner.innerHTML = sceneContent.outerHTML;
                var clonedInner = inner.querySelector('.scene-inner');
                if (clonedInner) {
                    clonedInner.style.width = w + 'px';
                    clonedInner.style.height = h + 'px';
                }
            }

            clip.appendChild(inner);
            container.appendChild(clip);

            var offsetY = forward ? sliceH : -sliceH;
            inner.style.transform = 'translateY(' + offsetY + 'px)';
            inner.style.opacity = '0.3';

            var delay = i * stagger;
            inner.style.transition = 'transform ' + dur + 'ms ' + EASE + ' ' + delay + 'ms, opacity ' + (dur * 0.5) + 'ms ease ' + delay + 'ms';

            (function (el) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        el.style.transform = 'translateY(0px)';
                        el.style.opacity = '1';
                    });
                });
            })(inner);

            slices.push({ delay: delay, el: inner });
        }

        return slices;
    }

    function createDiagonalSlices(container, layer, w, h, count, forward, dur, stagger) {
        var thickness = (w + h) / count;
        var slices = [];
        var angle = Math.atan2(h, w);

        for (var i = 0; i < count; i++) {
            var clip = document.createElement('div');
            clip.className = 'slice-strip';
            clip.style.cssText =
                'position:absolute;top:0;left:0;width:110%;height:110%;' +
                'clip-path:polygon(' +
                (i * thickness / w * 100) + '% 0%,' +
                ((i + 1) * thickness / w * 100) + '% 0%,' +
                ((i + 1) * thickness / w * 100 - h / w * 100 * 0.15) + '% 100%,' +
                (i * thickness / w * 100 - h / w * 100 * 0.15) + '% 100%' +
                ');';

            var inner = document.createElement('div');
            inner.style.cssText = 'position:absolute;inset:0;';

            var sceneContent = layer.querySelector('.scene-inner');
            if (sceneContent) {
                inner.innerHTML = sceneContent.outerHTML;
                var clonedInner = inner.querySelector('.scene-inner');
                if (clonedInner) {
                    clonedInner.style.width = w + 'px';
                    clonedInner.style.height = h + 'px';
                }
            }

            clip.appendChild(inner);
            container.appendChild(clip);

            var offsetX = forward ? w * 0.3 : -w * 0.3;
            inner.style.transform = 'translateX(' + offsetX + 'px) scale(0.9)';
            inner.style.opacity = '0';

            var delay = i * stagger;
            inner.style.transition = 'transform ' + dur + 'ms ' + EASE + ' ' + delay + 'ms, opacity ' + (dur * 0.6) + 'ms ease ' + delay + 'ms';

            (function (el) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        el.style.transform = 'translateX(0px) scale(1)';
                        el.style.opacity = '1';
                    });
                });
            })(inner);

            slices.push({ delay: delay, el: inner });
        }

        return slices;
    }

    function createRippleSlices(container, layer, w, h, count, dur) {
        var cx = w / 2;
        var cy = h / 2;
        var maxR = Math.sqrt(cx * cx + cy * cy);
        var slices = [];

        for (var i = 0; i < count; i++) {
            var outerR = maxR * ((i + 1) / count);
            var innerR = maxR * (i / count);
            var pctOuter = ((i + 1) / count * 100).toFixed(2);
            var pctInner = (i / count * 100).toFixed(2);

            var clip = document.createElement('div');
            clip.className = 'slice-strip';
            clip.style.cssText =
                'position:absolute;inset:0;' +
                'clip-path:circle(' + pctOuter + '% at 50% 50%);' +
                'z-index:' + (count - i) + ';';

            var inner = document.createElement('div');
            inner.style.cssText = 'position:absolute;inset:0;';

            var sceneContent = layer.querySelector('.scene-inner');
            if (sceneContent) {
                inner.innerHTML = sceneContent.outerHTML;
                var clonedInner = inner.querySelector('.scene-inner');
                if (clonedInner) {
                    clonedInner.style.width = w + 'px';
                    clonedInner.style.height = h + 'px';
                }
            }

            clip.appendChild(inner);
            container.appendChild(clip);

            inner.style.transform = 'scale(0.6)';
            inner.style.opacity = '0';

            var delay = i * 80;
            inner.style.transition = 'transform ' + dur + 'ms ' + EASE + ' ' + delay + 'ms, opacity ' + (dur * 0.5) + 'ms ease ' + delay + 'ms';

            (function (el) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        el.style.transform = 'scale(1)';
                        el.style.opacity = '1';
                    });
                });
            })(inner);

            slices.push({ delay: delay, el: inner });
        }

        return slices;
    }

    function createSpiralSlices(container, layer, w, h, count, dur, stagger) {
        var slices = [];

        for (var i = 0; i < count; i++) {
            var angle = (i / count) * 360;
            var clip = document.createElement('div');
            clip.className = 'slice-strip';
            clip.style.cssText =
                'position:absolute;inset:0;' +
                'clip-path:polygon(50% 50%,' +
                (50 + 50 * Math.cos((angle - 20) * Math.PI / 180)) + '% ' + (50 + 50 * Math.sin((angle - 20) * Math.PI / 180)) + '%,' +
                (50 + 50 * Math.cos((angle + 20) * Math.PI / 180)) + '% ' + (50 + 50 * Math.sin((angle + 20) * Math.PI / 180)) + '%' +
                ');' +
                'z-index:' + (count - i) + ';';

            var inner = document.createElement('div');
            inner.style.cssText = 'position:absolute;inset:0;transform-origin:50% 50%;';

            var sceneContent = layer.querySelector('.scene-inner');
            if (sceneContent) {
                inner.innerHTML = sceneContent.outerHTML;
                var clonedInner = inner.querySelector('.scene-inner');
                if (clonedInner) {
                    clonedInner.style.width = w + 'px';
                    clonedInner.style.height = h + 'px';
                }
            }

            clip.appendChild(inner);
            container.appendChild(clip);

            inner.style.transform = 'rotate(' + (angle * 2) + 'deg) scale(0)';
            inner.style.opacity = '0';

            var delay = i * stagger;
            inner.style.transition = 'transform ' + dur + 'ms ' + EASE + ' ' + delay + 'ms, opacity ' + (dur * 0.5) + 'ms ease ' + delay + 'ms';

            (function (el) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        el.style.transform = 'rotate(0deg) scale(1)';
                        el.style.opacity = '1';
                    });
                });
            })(inner);

            slices.push({ delay: delay, el: inner });
        }

        return slices;
    }

    function createGridSlices(container, layer, w, h, count, dur, stagger) {
        var cols = Math.ceil(Math.sqrt(count));
        var rows = Math.ceil(count / cols);
        var cellW = w / cols;
        var cellH = h / rows;
        var total = cols * rows;
        var slices = [];

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var idx = r * cols + c;
                var clip = document.createElement('div');
                clip.className = 'slice-strip';
                clip.style.cssText =
                    'position:absolute;' +
                    'left:' + (c * cellW) + 'px;top:' + (r * cellH) + 'px;' +
                    'width:' + cellW + 'px;height:' + cellH + 'px;' +
                    'perspective:800px;overflow:hidden;';

                var inner = document.createElement('div');
                inner.style.cssText =
                    'position:absolute;left:' + (-c * cellW) + 'px;top:' + (-r * cellH) + 'px;' +
                    'width:' + w + 'px;height:' + h + 'px;' +
                    'transform-origin:center center;' +
                    'backface-visibility:hidden;';

                var sceneContent = layer.querySelector('.scene-inner');
                if (sceneContent) {
                    inner.innerHTML = sceneContent.outerHTML;
                    var clonedInner = inner.querySelector('.scene-inner');
                    if (clonedInner) {
                        clonedInner.style.width = w + 'px';
                        clonedInner.style.height = h + 'px';
                    }
                }

                clip.appendChild(inner);
                container.appendChild(clip);

                inner.style.transform = 'perspective(800px) rotateY(90deg) scale(0.8)';
                inner.style.opacity = '0';

                var cx2 = cols / 2;
                var cy2 = rows / 2;
                var dist = Math.sqrt(Math.pow(c - cx2, 2) + Math.pow(r - cy2, 2));
                var maxDist = Math.sqrt(Math.pow(cx2, 2) + Math.pow(cy2, 2));
                var delay = (dist / maxDist) * stagger * Math.max(cols, rows);
                inner.style.transition = 'transform ' + dur + 'ms ' + EASE + ' ' + delay + 'ms, opacity ' + (dur * 0.6) + 'ms ease ' + delay + 'ms';

                (function (el) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            el.style.transform = 'perspective(800px) rotateY(0deg) scale(1)';
                            el.style.opacity = '1';
                        });
                    });
                })(inner);

                slices.push({ delay: delay, el: inner });
            }
        }

        return slices;
    }

    function initParticles() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;

        for (var i = 0; i < 60; i++) {
            state.particles.push({
                x: Math.random() * bgCanvas.width,
                y: Math.random() * bgCanvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.5 + 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function animateParticles() {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

        var themeColor = getComputedStyle(document.documentElement).getPropertyValue('--particle-color').trim();
        var w = bgCanvas.width;
        var h = bgCanvas.height;
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var time = Date.now() * 0.001;

        state.particles.forEach(function (p) {
            p.x += p.vx;
            p.y += p.vy;
            p.phase += 0.01;

            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 0) {
                var force = (200 - dist) / 200 * 0.015;
                p.vx += dx / dist * force;
                p.vy += dy / dist * force;
            }

            p.vx *= 0.99;
            p.vy *= 0.99;

            var pulse = 0.5 + 0.5 * Math.sin(p.phase);
            var alpha = p.alpha * (0.6 + 0.4 * pulse);
            var radius = p.r * (0.8 + 0.4 * pulse);

            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            bgCtx.fillStyle = themeColor;
            bgCtx.globalAlpha = alpha;
            bgCtx.fill();
            bgCtx.globalAlpha = 1;
        });

        for (var i = 0; i < state.particles.length; i++) {
            for (var j = i + 1; j < state.particles.length; j++) {
                var a = state.particles[i];
                var b = state.particles[j];
                var dx2 = a.x - b.x;
                var dy2 = a.y - b.y;
                var d = dx2 * dx2 + dy2 * dy2;
                if (d < 12000) {
                    bgCtx.beginPath();
                    bgCtx.moveTo(a.x, a.y);
                    bgCtx.lineTo(b.x, b.y);
                    bgCtx.strokeStyle = themeColor;
                    bgCtx.globalAlpha = 0.08 * (1 - d / 12000);
                    bgCtx.lineWidth = 0.5;
                    bgCtx.stroke();
                    bgCtx.globalAlpha = 1;
                }
            }
        }

        animFrame = requestAnimationFrame(animateParticles);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
