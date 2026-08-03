(function () {
    'use strict';

    /* =================================================================
       Motion Timeline Craft - 交互逻辑
       关键帧编排 · 非线性缓动 · 实时预览 · CSS 产出
       ================================================================= */

    /* === Easing 函数库 === */
    var EASINGS = {
        linear: function (t) { return t; },
        easeOutExpo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
        easeInExpo: function (t) { return t === 0 ? 0 : Math.pow(2, 10 * (t - 1)); },
        easeOutBack: function (t) {
            var c1 = 1.70158, c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        easeInBack: function (t) {
            var c1 = 1.70158, c3 = c1 + 1;
            return c3 * t * t * t - c1 * t * t;
        },
        easeOutElastic: function (t) {
            var c4 = (2 * Math.PI) / 3;
            if (t === 0) return 0;
            if (t === 1) return 1;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },
        easeOutBounce: function (t) {
            var n1 = 7.5625, d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
            if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
            t -= 2.625 / d1;
            return n1 * t * t + 0.984375;
        },
        easeInOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
    };

    var EASING_LABELS = {
        linear: 'linear',
        easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        easeInExpo: 'cubic-bezier(0.7, 0, 0.84, 0)',
        easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        easeInBack: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
        easeOutElastic: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        easeOutBounce: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
        easeInOutSine: 'cubic-bezier(0.37, 0, 0.63, 1)'
    };

    /* === 预设编排 === */
    var PRESETS = [
        {
            name: '脉冲呼吸',
            desc: '缩放脉动配合不透明度起伏',
            prop: 'scale',
            duration: 2000,
            easing: 'easeOutExpo',
            keyframes: [
                { time: 0, value: 0 },
                { time: 50, value: 60 },
                { time: 100, value: 0 }
            ]
        },
        {
            name: '弹簧入场',
            desc: '从右侧弹入并回弹归位',
            prop: 'translateX',
            duration: 1600,
            easing: 'easeOutBack',
            keyframes: [
                { time: 0, value: -80 },
                { time: 100, value: 0 }
            ]
        },
        {
            name: '漂浮悬浮',
            desc: '垂直方向缓慢漂浮',
            prop: 'translateY',
            duration: 3200,
            easing: 'easeInOutSine',
            keyframes: [
                { time: 0, value: 0 },
                { time: 50, value: -40 },
                { time: 100, value: 0 }
            ]
        },
        {
            name: '色相轮转',
            desc: '色相 360 度循环旋转',
            prop: 'hueRotate',
            duration: 4000,
            easing: 'linear',
            keyframes: [
                { time: 0, value: 0 },
                { time: 100, value: 100 }
            ]
        },
        {
            name: '弹性震荡',
            desc: '弹性衰减震荡效果',
            prop: 'translateX',
            duration: 2400,
            easing: 'easeOutElastic',
            keyframes: [
                { time: 0, value: 0 },
                { time: 30, value: 80 },
                { time: 100, value: 0 }
            ]
        },
        {
            name: '模糊聚焦',
            desc: '从模糊到清晰的聚焦',
            prop: 'blur',
            duration: 1800,
            easing: 'easeOutExpo',
            keyframes: [
                { time: 0, value: 80 },
                { time: 100, value: 0 }
            ]
        },
        {
            name: '旋转飞舞',
            desc: '完整旋转后回弹',
            prop: 'rotate',
            duration: 2600,
            easing: 'easeOutBack',
            keyframes: [
                { time: 0, value: 0 },
                { time: 100, value: 70 }
            ]
        },
        {
            name: '心跳节律',
            desc: '双段心跳脉冲',
            prop: 'scale',
            duration: 1400,
            easing: 'easeOutBounce',
            keyframes: [
                { time: 0, value: 0 },
                { time: 20, value: 40 },
                { time: 35, value: 10 },
                { time: 50, value: 55 },
                { time: 100, value: 0 }
            ]
        }
    ];

    /* === 属性范围定义（用于值映射） === */
    var PROP_RANGES = {
        translateX: { min: -200, max: 200, unit: 'px' },
        translateY: { min: -200, max: 200, unit: 'px' },
        scale: { min: 0, max: 2, unit: '' },
        rotate: { min: -360, max: 360, unit: 'deg' },
        opacity: { min: 0, max: 1, unit: '' },
        blur: { min: 0, max: 20, unit: 'px' },
        hueRotate: { min: 0, max: 360, unit: 'deg' }
    };

    var PROP_LABELS = {
        translateX: '位移 X',
        translateY: '位移 Y',
        scale: '缩放',
        rotate: '旋转',
        opacity: '不透明度',
        blur: '模糊',
        hueRotate: '色相'
    };

    /* === 状态 === */
    var state = {
        prop: 'translateX',
        duration: 2400,
        easing: 'linear',
        keyframes: [],
        selectedKeyframe: null,
        isPlaying: false,
        playStartTime: 0,
        playhead: 0,
        speed: 1,
        loop: true
    };

    /* === DOM 引用 === */
    var D = {};

    function cacheDom() {
        var ids = [
            'prop-select', 'duration-input', 'kf-time-slider', 'kf-time-label',
            'kf-value-slider', 'kf-value-label', 'kf-add-btn',
            'easing-grid', 'easing-canvas',
            'motion-orb', 'readout-prop', 'readout-value', 'readout-time',
            'timeline-track-wrap', 'timeline-canvas', 'timeline-keyframes',
            'timeline-playhead', 'timeline-ruler', 'timeline-keycount',
            'play-btn', 'clear-btn', 'preset-btn',
            'time-display', 'loop-checkbox',
            'css-output', 'copy-btn',
            'telemetry-fps', 'telemetry-keyframes', 'telemetry-progress', 'telemetry-status',
            'cursor-glow', 'ambient-canvas',
            'theme-toggle',
            'preset-overlay', 'preset-list', 'preset-close',
            'toast', 'preview-stage'
        ];
        for (var i = 0; i < ids.length; i++) {
            D[ids[i].replace(/-(\w)/g, function (_, c) { return c.toUpperCase(); })] = document.getElementById(ids[i]);
        }
    }

    /* === 初始化 === */
    function init() {
        cacheDom();
        loadDefaultKeyframes();
        bindControls();
        bindThemeToggle();
        bindCursorGlow();
        bindTimelineInteraction();
        bindKeyboard();
        buildPresets();
        renderRuler();
        renderAll();
        initAmbientCanvas();
        startLoop();
    }

    function loadDefaultKeyframes() {
        state.keyframes = [
            { time: 0, value: -60 },
            { time: 50, value: 60 },
            { time: 100, value: 0 }
        ];
    }

    /* === 控件绑定 === */
    function bindControls() {
        D.propSelect.addEventListener('change', function () {
            state.prop = this.value;
            renderAll();
        });

        D.durationInput.addEventListener('input', function () {
            var v = parseInt(this.value, 10);
            if (isNaN(v)) v = 2400;
            v = Math.max(600, Math.min(12000, v));
            state.duration = v;
            renderRuler();
            renderTimeDisplay();
            renderCss();
        });

        D.kfTimeSlider.addEventListener('input', function () {
            var v = parseInt(this.value, 10);
            D.kfTimeLabel.textContent = v + '%';
        });

        D.kfValueSlider.addEventListener('input', function () {
            var v = parseInt(this.value, 10);
            D.kfValueLabel.textContent = v;
        });

        D.kfAddBtn.addEventListener('click', addKeyframe);

        D.easingGrid.addEventListener('click', function (e) {
            var btn = e.target.closest('.easing-chip');
            if (!btn) return;
            var easing = btn.getAttribute('data-easing');
            state.easing = easing;
            var chips = D.easingGrid.querySelectorAll('.easing-chip');
            for (var i = 0; i < chips.length; i++) {
                chips[i].classList.toggle('active', chips[i] === btn);
            }
            drawEasingCurve();
            renderTimeline();
            renderCss();
            updateOrb();
        });

        D.playBtn.addEventListener('click', togglePlay);
        D.clearBtn.addEventListener('click', clearKeyframes);
        D.presetBtn.addEventListener('click', openPreset);
        D.presetClose.addEventListener('click', closePreset);
        D.presetOverlay.addEventListener('click', function (e) {
            if (e.target === D.presetOverlay) closePreset();
        });

        D.copyBtn.addEventListener('click', copyCss);

        var speedBtns = document.querySelectorAll('.speed-btn');
        for (var i = 0; i < speedBtns.length; i++) {
            speedBtns[i].addEventListener('click', function () {
                for (var j = 0; j < speedBtns.length; j++) {
                    speedBtns[j].classList.remove('active');
                }
                this.classList.add('active');
                state.speed = parseFloat(this.getAttribute('data-speed'));
            });
        }

        D.loopCheckbox.addEventListener('change', function () {
            state.loop = this.checked;
        });
    }

    function bindThemeToggle() {
        var btns = D.themeToggle.querySelectorAll('.theme-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var theme = btn.getAttribute('data-theme');
                document.body.setAttribute('data-theme', theme);
            });
        });
    }

    function bindCursorGlow() {
        var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
        var cx = tx, cy = ty;
        document.addEventListener('mousemove', function (e) {
            tx = e.clientX;
            ty = e.clientY;
        });
        function followGlow() {
            cx += (tx - cx) * 0.12;
            cy += (ty - cy) * 0.12;
            D.cursorGlow.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
            requestAnimationFrame(followGlow);
        }
        followGlow();
    }

    function bindKeyboard() {
        document.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (state.selectedKeyframe !== null) {
                    removeKeyframe(state.selectedKeyframe);
                }
            } else if (e.key === 'Escape') {
                closePreset();
                state.selectedKeyframe = null;
                renderKeyframes();
            }
        });
    }

    /* === 关键帧操作 === */
    function addKeyframe() {
        var time = parseInt(D.kfTimeSlider.value, 10);
        var value = parseInt(D.kfValueSlider.value, 10);
        time = Math.max(0, Math.min(100, time));

        var existing = -1;
        for (var i = 0; i < state.keyframes.length; i++) {
            if (Math.abs(state.keyframes[i].time - time) < 1) {
                existing = i;
                break;
            }
        }

        if (existing >= 0) {
            state.keyframes[existing].value = value;
            state.selectedKeyframe = existing;
        } else {
            state.keyframes.push({ time: time, value: value });
            state.keyframes.sort(function (a, b) { return a.time - b.time; });
            state.selectedKeyframe = state.keyframes.findIndex(function (k) { return k.time === time; });
        }
        renderAll();
        showToast('已添加关键帧 @ ' + time + '%');
    }

    function removeKeyframe(index) {
        if (state.keyframes.length <= 2) {
            showToast('至少保留 2 个关键帧');
            return;
        }
        state.keyframes.splice(index, 1);
        state.selectedKeyframe = null;
        renderAll();
    }

    function selectKeyframe(index) {
        state.selectedKeyframe = index;
        var kf = state.keyframes[index];
        if (kf) {
            D.kfTimeSlider.value = kf.time;
            D.kfTimeLabel.textContent = kf.time + '%';
            D.kfValueSlider.value = kf.value;
            D.kfValueLabel.textContent = kf.value;
        }
        renderKeyframes();
    }

    function clearKeyframes() {
        state.keyframes = [
            { time: 0, value: 0 },
            { time: 100, value: 0 }
        ];
        state.selectedKeyframe = null;
        renderAll();
        showToast('时间线已重置');
    }

    /* === 时间线交互（拖拽） === */
    function bindTimelineInteraction() {
        var dragging = null;
        var rect = null;

        D.timelineTrackWrap.addEventListener('mousedown', function (e) {
            var marker = e.target.closest('.kf-marker');
            rect = D.timelineTrackWrap.getBoundingClientRect();
            if (marker) {
                var idx = parseInt(marker.getAttribute('data-index'), 10);
                dragging = idx;
                selectKeyframe(idx);
                e.preventDefault();
            } else {
                scrubPlayhead(e);
            }
        });

        D.timelineTrackWrap.addEventListener('click', function (e) {
            if (e.target.closest('.kf-marker')) return;
            rect = D.timelineTrackWrap.getBoundingClientRect();
            scrubPlayhead(e);
        });

        document.addEventListener('mousemove', function (e) {
            if (dragging === null || !rect) return;
            var pct = ((e.clientX - rect.left) / rect.width) * 100;
            pct = Math.max(0, Math.min(100, pct));
            var kf = state.keyframes[dragging];

            if (dragging === 0) {
                pct = 0;
            } else if (dragging === state.keyframes.length - 1) {
                pct = 100;
            } else {
                var prev = state.keyframes[dragging - 1].time + 1;
                var next = state.keyframes[dragging + 1].time - 1;
                pct = Math.max(prev, Math.min(next, pct));
            }

            kf.time = pct;
            state.keyframes.sort(function (a, b) { return a.time - b.time; });
            state.selectedKeyframe = state.keyframes.indexOf(kf);
            renderKeyframes();
            renderTimeline();
            renderCss();
            updateOrb();
        });

        document.addEventListener('mouseup', function () {
            dragging = null;
        });

        D.timelineTrackWrap.addEventListener('touchstart', function (e) {
            var marker = e.target.closest('.kf-marker');
            rect = D.timelineTrackWrap.getBoundingClientRect();
            if (marker) {
                var idx = parseInt(marker.getAttribute('data-index'), 10);
                dragging = idx;
                selectKeyframe(idx);
            }
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            if (dragging === null || !rect) return;
            var touch = e.touches[0];
            var pct = ((touch.clientX - rect.left) / rect.width) * 100;
            pct = Math.max(0, Math.min(100, pct));
            var kf = state.keyframes[dragging];
            if (dragging === 0) pct = 0;
            else if (dragging === state.keyframes.length - 1) pct = 100;
            kf.time = pct;
            state.keyframes.sort(function (a, b) { return a.time - b.time; });
            state.selectedKeyframe = state.keyframes.indexOf(kf);
            renderKeyframes();
            renderTimeline();
            renderCss();
            updateOrb();
        }, { passive: true });

        document.addEventListener('touchend', function () { dragging = null; });
    }

    function scrubPlayhead(e) {
        var rect = D.timelineTrackWrap.getBoundingClientRect();
        var pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        state.playhead = pct / 100;
        updatePlayheadPosition();
        updateOrb();
        renderTimeDisplay();
    }

    /* === 播放控制 === */
    function togglePlay() {
        state.isPlaying = !state.isPlaying;
        if (state.isPlaying) {
            state.playStartTime = performance.now() - (state.playhead * state.duration / state.speed);
            D.playBtn.classList.add('is-playing');
            D.playBtn.querySelector('span').textContent = '暂停';
            D.telemetryStatus.textContent = '播放中';
            D.telemetryStatus.classList.add('is-playing');
        } else {
            D.playBtn.classList.remove('is-playing');
            D.playBtn.querySelector('span').textContent = '播放';
            D.telemetryStatus.textContent = '已暂停';
            D.telemetryStatus.classList.remove('is-playing');
        }
    }

    /* === 预设 === */
    function buildPresets() {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < PRESETS.length; i++) {
            var p = PRESETS[i];
            var card = document.createElement('button');
            card.className = 'preset-card';
            card.innerHTML =
                '<span class="preset-card-name">' + p.name + '</span>' +
                '<span class="preset-card-desc">' + p.desc + '</span>' +
                '<span class="preset-card-meta">' + PROP_LABELS[p.prop] + ' · ' + p.duration + 'ms · ' + p.easing + '</span>';
            (function (preset) {
                card.addEventListener('click', function () {
                    loadPreset(preset);
                    closePreset();
                });
            })(p);
            frag.appendChild(card);
        }
        D.presetList.appendChild(frag);
    }

    function loadPreset(preset) {
        state.prop = preset.prop;
        state.duration = preset.duration;
        state.easing = preset.easing;
        state.keyframes = preset.keyframes.map(function (k) {
            return { time: k.time, value: k.value };
        });
        state.selectedKeyframe = null;
        state.playhead = 0;

        D.propSelect.value = state.prop;
        D.durationInput.value = state.duration;

        var chips = D.easingGrid.querySelectorAll('.easing-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.toggle('active', chips[i].getAttribute('data-easing') === state.easing);
        }

        renderAll();
        showToast('已载入：' + preset.name);
    }

    function openPreset() {
        D.presetOverlay.classList.add('is-open');
        D.presetOverlay.setAttribute('aria-hidden', 'false');
    }

    function closePreset() {
        D.presetOverlay.classList.remove('is-open');
        D.presetOverlay.setAttribute('aria-hidden', 'true');
    }

    /* === 值映射 === */
    function mapValue(prop, rawValue) {
        var range = PROP_RANGES[prop];
        if (!range) return rawValue;
        var mapped = range.min + ((rawValue + 100) / 200) * (range.max - range.min);
        return mapped;
    }

    function formatValue(prop, rawValue) {
        var range = PROP_RANGES[prop];
        var mapped = mapValue(prop, rawValue);
        if (prop === 'opacity') return mapped.toFixed(3);
        if (prop === 'scale') return mapped.toFixed(2);
        if (prop === 'hueRotate' || prop === 'rotate') return Math.round(mapped);
        return Math.round(mapped * 10) / 10;
    }

    function getValueWithUnit(prop, rawValue) {
        var range = PROP_RANGES[prop];
        return formatValue(prop, rawValue) + range.unit;
    }

    /* === 采样动画值 === */
    function sampleAnimation(progress) {
        if (state.keyframes.length === 0) return 0;
        if (state.keyframes.length === 1) return state.keyframes[0].value;

        var time = progress * 100;
        var kfs = state.keyframes;

        if (time <= kfs[0].time) return kfs[0].value;
        if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

        for (var i = 0; i < kfs.length - 1; i++) {
            var a = kfs[i], b = kfs[i + 1];
            if (time >= a.time && time <= b.time) {
                var segProgress = (time - a.time) / (b.time - a.time);
                var easeFn = EASINGS[state.easing] || EASINGS.linear;
                var eased = easeFn(segProgress);
                return a.value + (b.value - a.value) * eased;
            }
        }
        return kfs[kfs.length - 1].value;
    }

    /* === 更新预览球体 === */
    function updateOrb() {
        var progress = state.playhead;
        var rawValue = sampleAnimation(progress);
        var prop = state.prop;

        var transform = '';
        var filter = 'none';
        var opacity = 1;

        var mapped = mapValue(prop, rawValue);

        var baseTransform = 'translate(-50%, -50%)';
        var x = 0, y = 0, scale = 1, rotate = 0;

        switch (prop) {
            case 'translateX':
                x = mapped;
                break;
            case 'translateY':
                y = mapped;
                break;
            case 'scale':
                scale = mapped;
                break;
            case 'rotate':
                rotate = mapped;
                break;
            case 'opacity':
                opacity = mapped;
                break;
            case 'blur':
                filter = 'blur(' + mapped + 'px)';
                break;
            case 'hueRotate':
                filter = 'hue-rotate(' + mapped + 'deg)';
                break;
        }

        transform = baseTransform +
            ' translate(' + x + 'px,' + y + 'px)' +
            ' scale(' + scale + ')' +
            ' rotate(' + rotate + 'deg)';

        D.motionOrb.style.transform = transform;
        D.motionOrb.style.opacity = opacity;
        D.motionOrb.style.filter = filter;

        D.readoutProp.textContent = PROP_LABELS[prop];
        D.readoutValue.textContent = formatValue(prop, rawValue);
        D.readoutTime.textContent = Math.round(progress * state.duration) + 'ms';
        D.telemetryProgress.textContent = Math.round(progress * 100) + '%';
    }

    /* === 渲染 === */
    function renderAll() {
        renderKeyframes();
        renderTimeline();
        renderKeycount();
        drawEasingCurve();
        renderCss();
        updateOrb();
        renderTimeDisplay();
        renderRuler();
    }

    function renderKeyframes() {
        D.timelineKeyframes.innerHTML = '';
        var rect = D.timelineTrackWrap.getBoundingClientRect();
        var width = rect.width || 400;

        for (var i = 0; i < state.keyframes.length; i++) {
            var kf = state.keyframes[i];
            var marker = document.createElement('div');
            marker.className = 'kf-marker';
            if (i === 0 || i === state.keyframes.length - 1) {
                marker.classList.add('kf-endpoint');
            }
            if (i === state.selectedKeyframe) {
                marker.classList.add('selected');
            }
            marker.setAttribute('data-index', i);
            marker.style.left = (kf.time / 100 * width) + 'px';

            (function (idx) {
                marker.addEventListener('click', function (e) {
                    e.stopPropagation();
                    selectKeyframe(idx);
                });
                marker.addEventListener('contextmenu', function (e) {
                    e.preventDefault();
                    removeKeyframe(idx);
                });
            })(i);

            D.timelineKeyframes.appendChild(marker);
        }
        D.telemetryKeyframes.textContent = state.keyframes.length;
    }

    function renderTimeline() {
        var canvas = D.timelineCanvas;
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var rect = D.timelineTrackWrap.getBoundingClientRect();
        var w = rect.width, h = rect.height;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, w, h);

        var accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        var accent2 = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-2').trim();

        var minY = -100, maxY = 100;
        var midY = h / 2;

        if (state.keyframes.length >= 2) {
            ctx.beginPath();
            for (var px = 0; px <= w; px += 2) {
                var progress = px / w;
                var val = sampleAnimation(progress);
                var py = midY - ((val - minY) / (maxY - minY) - 0.5) * (h - 30);
                py = Math.max(15, Math.min(h - 25, py));
                if (px === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }

            var grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, accent);
            grad.addColorStop(1, accent2);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.shadowColor = accent;
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            var fillGrad = ctx.createLinearGradient(0, 0, 0, h);
            fillGrad.addColorStop(0, hexToRgba(accent, 0.18));
            fillGrad.addColorStop(1, hexToRgba(accent, 0));
            ctx.fillStyle = fillGrad;
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();
    }

    function renderKeycount() {
        D.timelineKeycount.textContent = state.keyframes.length + ' 关键帧';
    }

    function renderRuler() {
        D.timelineRuler.innerHTML = '';
        var steps = 10;
        for (var i = 0; i <= steps; i++) {
            var tick = document.createElement('div');
            tick.style.cssText =
                'position:absolute;bottom:0;left:' + (i / steps * 100) + '%;' +
                'width:1px;height:' + (i % 5 === 0 ? '10px' : '6px') + ';' +
                'background:rgba(255,255,255,0.15);';
            D.timelineRuler.appendChild(tick);
        }
    }

    function updatePlayheadPosition() {
        var rect = D.timelineTrackWrap.getBoundingClientRect();
        var x = state.playhead * rect.width;
        D.timelinePlayhead.style.left = x + 'px';
    }

    function renderTimeDisplay() {
        var cur = Math.round(state.playhead * state.duration);
        D.timeDisplay.textContent = pad4(cur) + ' / ' + pad4(state.duration) + ' ms';
    }

    function drawEasingCurve() {
        var canvas = D.easingCanvas;
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var w = canvas.width / dpr || 280;
        var h = canvas.height / dpr || 140;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, w, h);

        var pad = 12;
        var accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pad, h - pad);
        ctx.lineTo(w - pad, pad);
        ctx.stroke();
        ctx.setLineDash([]);

        var easeFn = EASINGS[state.easing] || EASINGS.linear;
        ctx.beginPath();
        for (var px = 0; px <= w - pad * 2; px++) {
            var t = px / (w - pad * 2);
            var y = easeFn(t);
            var drawX = pad + px;
            var drawY = h - pad - y * (h - pad * 2);
            if (px === 0) ctx.moveTo(drawX, drawY);
            else ctx.lineTo(drawX, drawY);
        }
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    /* === CSS 产出 === */
    function renderCss() {
        var prop = state.prop;
        var range = PROP_RANGES[prop];
        var css = '';

        var kfText = state.keyframes.map(function (kf) {
            var val = getValueWithUnit(prop, kf.value);
            return '  ' + kf.time + '% {\n    ' + cssPropName(prop) + ': ' + val + ';\n  }';
        }).join('\n');

        var animName = 'motion-' + prop;
        css += '@keyframes ' + animName + ' {\n' + kfText + '\n}\n\n';
        css += '.element {\n';
        css += '  animation: ' + animName + ' ' + state.duration + 'ms ' +
            EASING_LABELS[state.easing] + ' infinite alternate;\n';
        css += '}';

        D.cssOutput.querySelector('code').textContent = css;
    }

    function cssPropName(prop) {
        var map = {
            translateX: 'transform: translateX',
            translateY: 'transform: translateY',
            scale: 'transform: scale',
            rotate: 'transform: rotate',
            opacity: 'opacity',
            blur: 'filter: blur',
            hueRotate: 'filter: hue-rotate'
        };
        var name = map[prop] || prop;
        if (name.indexOf('transform') === 0 || name.indexOf('filter') === 0) {
            var parts = name.split(':');
            return parts[0] + ': ' + parts[1].trim();
        }
        return name;
    }

    function copyCss() {
        var text = D.cssOutput.querySelector('code').textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast('CSS 已复制到剪贴板');
            }).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('CSS 已复制到剪贴板');
        } catch (e) {
            showToast('复制失败，请手动选取');
        }
        document.body.removeChild(ta);
    }

    /* === Toast === */
    var toastTimer = null;
    function showToast(msg) {
        D.toast.textContent = msg;
        D.toast.classList.add('is-visible');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            D.toast.classList.remove('is-visible');
        }, 2200);
    }

    /* === 环境粒子流场 === */
    var particles = [];
    var PARTICLE_COUNT = 60;

    function initAmbientCanvas() {
        resizeAmbientCanvas();
        window.addEventListener('resize', function () {
            resizeAmbientCanvas();
            renderTimeline();
            renderKeyframes();
            updatePlayheadPosition();
        });
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }
    }

    function resizeAmbientCanvas() {
        var canvas = D.ambientCanvas;
        var dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
            life: Math.random(),
            phase: Math.random() * Math.PI * 2
        };
    }

    function drawAmbient(time) {
        var ctx = D.ambientCanvas.getContext('2d');
        var w = window.innerWidth, h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        var accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        var accent2 = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-2').trim();

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.phase += 0.005;
            p.x += p.vx + Math.sin(p.phase) * 0.15;
            p.y += p.vy + Math.cos(p.phase * 0.7) * 0.15;

            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;
            if (p.y < -10) p.y = h + 10;
            if (p.y > h + 10) p.y = -10;

            var alpha = (Math.sin(p.phase * 1.3) * 0.5 + 0.5) * 0.4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(i % 2 === 0 ? accent : accent2, alpha);
            ctx.fill();
        }
    }

    /* === 主循环 === */
    var lastTime = performance.now();
    var frameCount = 0;
    var fpsAccum = 0;

    function startLoop() {
        function loop(now) {
            var dt = now - lastTime;
            lastTime = now;
            frameCount++;
            fpsAccum += dt;
            if (fpsAccum >= 500) {
                var fps = Math.round(1000 / (fpsAccum / frameCount));
                D.telemetryFps.textContent = fps;
                frameCount = 0;
                fpsAccum = 0;
            }

            drawAmbient(now);

            if (state.isPlaying) {
                var elapsed = (now - state.playStartTime) * state.speed;
                var progress = elapsed / state.duration;
                if (progress >= 1) {
                    if (state.loop) {
                        state.playStartTime = now;
                        progress = 0;
                    } else {
                        progress = 1;
                        togglePlay();
                    }
                }
                state.playhead = progress;
                updatePlayheadPosition();
                updateOrb();
                renderTimeDisplay();
            }

            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        setTimeout(function () {
            renderTimeline();
            renderKeyframes();
            updatePlayheadPosition();
        }, 100);
    }

    /* === 工具函数 === */
    function pad4(n) {
        n = Math.max(0, Math.round(n));
        var s = '' + n;
        while (s.length < 4) s = '0' + s;
        return s;
    }

    function hexToRgba(hex, alpha) {
        hex = hex.trim().replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var r = parseInt(hex.substring(0, 2), 16) || 0;
        var g = parseInt(hex.substring(2, 4), 16) || 0;
        var b = parseInt(hex.substring(4, 6), 16) || 0;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    /* === 启动 === */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
