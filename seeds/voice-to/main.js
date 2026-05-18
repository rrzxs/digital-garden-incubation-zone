(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var PALETTES = {
        aurora: {
            colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
            glow: 'rgba(102, 126, 234, 0.4)'
        },
        ember: {
            colors: ['#f97316', '#ef4444', '#fbbf24', '#fb923c'],
            glow: 'rgba(249, 115, 22, 0.4)'
        },
        ocean: {
            colors: ['#06b6d4', '#3b82f6', '#22d3ee', '#818cf8'],
            glow: 'rgba(6, 182, 212, 0.4)'
        },
        neon: {
            colors: ['#22d3ee', '#a3e635', '#34d399', '#67e8f9'],
            glow: 'rgba(34, 211, 238, 0.4)'
        }
    };

    var LANGS = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES'];
    var LANG_LABELS = ['中文', 'English', '日本語', '한국어', 'Français', 'Deutsch', 'Español'];
    var langIndex = 0;

    var state = {
        isRecording: false,
        palette: 'aurora',
        segments: [],
        interimText: '',
        startTime: null,
        timerInterval: null,
        charCount: 0,
        mouse: { x: 0, y: 0 }
    };

    var recognition = null;
    var audioContext = null;
    var analyser = null;
    var micStream = null;
    var dataArray = null;

    var canvas, ctx, canvasW, canvasH;
    var wavePhase = 0;
    var particles = [];
    var ripples = [];
    var animId = null;

    var DOM = {};

    function qs(sel) { return document.querySelector(sel); }

    function init() {
        cacheDom();
        initCanvas();
        initParticles();
        bindEvents();
        startRenderLoop();
        updateStats();
    }

    function cacheDom() {
        DOM.recordBtn = qs('#record-btn');
        DOM.recordLabel = qs('#record-label');
        DOM.vizOverlay = qs('#viz-overlay');
        DOM.idleHint = qs('#idle-hint');
        DOM.transcriptContent = qs('#transcript-content');
        DOM.transcriptScroll = qs('#transcript-scroll');
        DOM.transcriptPlaceholder = qs('#transcript-placeholder');
        DOM.statChars = qs('#stat-chars');
        DOM.statSegments = qs('#stat-segments');
        DOM.statDuration = qs('#stat-duration');
        DOM.btnClear = qs('#btn-clear');
        DOM.btnCopy = qs('#btn-copy');
        DOM.btnLang = qs('#btn-lang');
        DOM.paletteGroup = qs('#palette-group');
        DOM.cursorGlow = qs('#cursor-glow');
        DOM.toast = qs('#toast');
        canvas = qs('#waveCanvas');
        ctx = canvas.getContext('2d');
    }

    function initCanvas() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        var rect = canvas.parentElement.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasW = rect.width * dpr;
        canvasH = rect.height * dpr;
        canvas.width = canvasW;
        canvas.height = canvasH;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
    }

    function initParticles() {
        particles = [];
        for (var i = 0; i < 40; i++) {
            particles.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.001,
                vy: (Math.random() - 0.5) * 0.001,
                r: Math.random() * 2 + 0.5,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.5
            });
        }
    }

    function bindEvents() {
        DOM.recordBtn.addEventListener('click', toggleRecording);

        DOM.btnClear.addEventListener('click', function () {
            clearTranscript();
            showToast('已清除');
        });

        DOM.btnCopy.addEventListener('click', function () {
            var text = buildFullText();
            if (!text) { showToast('没有文字可复制'); return; }
            navigator.clipboard.writeText(text).then(function () {
                showToast('已复制到剪贴板');
            }).catch(function () {
                showToast('复制失败');
            });
        });

        DOM.btnLang.addEventListener('click', function () {
            langIndex = (langIndex + 1) % LANGS.length;
            showToast('语言: ' + LANG_LABELS[langIndex]);
            if (state.isRecording) {
                stopRecognition();
                startRecognition();
            }
        });

        DOM.paletteGroup.addEventListener('click', function (e) {
            var btn = e.target.closest('.palette-btn');
            if (!btn) return;
            var p = btn.getAttribute('data-palette');
            if (!p || p === state.palette) return;
            state.palette = p;
            document.body.setAttribute('data-palette', p);
            DOM.paletteGroup.querySelectorAll('.palette-btn').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
        });

        document.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            if (DOM.cursorGlow) {
                DOM.cursorGlow.style.left = e.clientX + 'px';
                DOM.cursorGlow.style.top = e.clientY + 'px';
                if (!DOM.cursorGlow.classList.contains('visible')) {
                    DOM.cursorGlow.classList.add('visible');
                }
            }
        });

        document.addEventListener('mouseleave', function () {
            if (DOM.cursorGlow) DOM.cursorGlow.classList.remove('visible');
        });
    }

    function toggleRecording() {
        if (state.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function startRecording() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('浏览器不支持语音识别');
            return;
        }

        state.isRecording = true;
        state.startTime = Date.now();

        DOM.recordBtn.classList.add('recording');
        DOM.recordLabel.textContent = '录音中…';
        DOM.recordLabel.classList.add('recording');
        DOM.vizOverlay.classList.add('hidden');

        if (DOM.transcriptPlaceholder) {
            DOM.transcriptPlaceholder.style.display = 'none';
        }

        startAudioCapture();
        startRecognition();
        startTimer();
    }

    function stopRecording() {
        state.isRecording = false;

        DOM.recordBtn.classList.remove('recording');
        DOM.recordLabel.textContent = '点击开始';
        DOM.recordLabel.classList.remove('recording');

        if (state.segments.length === 0 && !state.interimText) {
            DOM.vizOverlay.classList.remove('hidden');
            if (DOM.transcriptPlaceholder) {
                DOM.transcriptPlaceholder.style.display = '';
            }
        }

        stopRecognition();
        stopAudioCapture();
        stopTimer();
    }

    function startRecognition() {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = LANGS[langIndex];

        recognition.onresult = function (event) {
            var interimTranscript = '';
            for (var i = event.resultIndex; i < event.results.length; i++) {
                var transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    addSegment(transcript);
                    spawnRipple();
                } else {
                    interimTranscript += transcript;
                }
            }
            state.interimText = interimTranscript;
            renderInterim();
        };

        recognition.onerror = function (event) {
            if (event.error === 'not-allowed') {
                showToast('请允许麦克风权限');
                stopRecording();
            } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
                showToast('识别错误: ' + event.error);
            }
        };

        recognition.onend = function () {
            if (state.isRecording) {
                try { recognition.start(); } catch (e) { /* already started */ }
            }
        };

        try { recognition.start(); } catch (e) { /* */ }
    }

    function stopRecognition() {
        if (recognition) {
            try { recognition.stop(); } catch (e) { /* */ }
            recognition = null;
        }
    }

    function startAudioCapture() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            micStream = stream;
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            var source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }).catch(function () {
            /* mic denied - waveform still shows idle animation */
        });
    }

    function stopAudioCapture() {
        if (micStream) {
            micStream.getTracks().forEach(function (t) { t.stop(); });
            micStream = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
            analyser = null;
            dataArray = null;
        }
    }

    function getFrequencyData() {
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            return dataArray;
        }
        return null;
    }

    function addSegment(text) {
        var elapsed = state.startTime ? Date.now() - state.startTime : 0;
        var seg = {
            text: text.trim(),
            time: formatTime(elapsed)
        };
        if (seg.text) {
            state.segments.push(seg);
            state.charCount += seg.text.length;
            renderSegment(seg);
            updateStats();
        }
        state.interimText = '';
    }

    function renderSegment(seg) {
        var div = document.createElement('div');
        div.className = 'transcript-segment';
        div.innerHTML =
            '<span class="seg-time">' + seg.time + '</span>' +
            '<span class="seg-text">' + escapeHtml(seg.text) + '</span>';
        DOM.transcriptContent.appendChild(div);
        requestAnimationFrame(function () {
            DOM.transcriptScroll.scrollTop = DOM.transcriptScroll.scrollHeight;
        });
    }

    function renderInterim() {
        var existing = DOM.transcriptContent.querySelector('.seg-interim-wrap');
        if (existing) existing.remove();

        if (!state.interimText) return;

        var div = document.createElement('div');
        div.className = 'transcript-segment seg-interim-wrap';
        div.innerHTML = '<span class="seg-text seg-interim">' + escapeHtml(state.interimText) + '</span>';
        DOM.transcriptContent.appendChild(div);
        DOM.transcriptScroll.scrollTop = DOM.transcriptScroll.scrollHeight;
    }

    function clearTranscript() {
        state.segments = [];
        state.interimText = '';
        state.charCount = 0;
        state.startTime = null;
        DOM.transcriptContent.innerHTML = '';
        if (DOM.transcriptPlaceholder) {
            var p = document.createElement('p');
            p.className = 'transcript-placeholder';
            p.id = 'transcript-placeholder';
            p.textContent = '语音识别到的文字将在这里浮现…';
            DOM.transcriptContent.appendChild(p);
        }
        if (!state.isRecording) {
            DOM.vizOverlay.classList.remove('hidden');
        }
        updateStats();
    }

    function buildFullText() {
        return state.segments.map(function (s) { return s.text; }).join('\n');
    }

    function updateStats() {
        DOM.statChars.textContent = state.charCount + ' 字';
        DOM.statSegments.textContent = state.segments.length + ' 段';
    }

    function startTimer() {
        stopTimer();
        state.timerInterval = setInterval(function () {
            if (!state.startTime) return;
            var elapsed = Date.now() - state.startTime;
            DOM.statDuration.textContent = formatTime(elapsed);
        }, 500);
    }

    function stopTimer() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
    }

    function formatTime(ms) {
        var s = Math.floor(ms / 1000);
        var m = Math.floor(s / 60);
        s = s % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function spawnRipple() {
        ripples.push({
            x: 0.5,
            y: 0.5,
            r: 0,
            maxR: 0.6,
            opacity: 1,
            speed: 0.008
        });
    }

    function startRenderLoop() {
        function loop() {
            render();
            animId = requestAnimationFrame(loop);
        }
        loop();
    }

    function render() {
        var w = canvasW;
        var h = canvasH;
        ctx.clearRect(0, 0, w, h);

        var freq = getFrequencyData();
        var palette = PALETTES[state.palette] || PALETTES.aurora;

        renderParticles(w, h, freq, palette);
        renderWaves(w, h, freq, palette);
        renderRipples(w, h, palette);

        wavePhase += 0.015;
    }

    function renderWaves(w, h, freq, palette) {
        var layerCount = 3;
        var baseY = h * 0.5;
        var amplitude = h * 0.15;

        for (var layer = 0; layer < layerCount; layer++) {
            var color = palette.colors[layer % palette.colors.length];
            var alpha = 0.25 - layer * 0.06;
            var offset = layer * 0.8;
            var freqScale = 1 + layer * 0.5;

            ctx.beginPath();
            ctx.moveTo(0, baseY);

            var points = 120;
            for (var i = 0; i <= points; i++) {
                var t = i / points;
                var x = t * w;

                var freqVal = 0;
                if (freq) {
                    var fi = Math.floor(t * (freq.length - 1));
                    freqVal = (freq[fi] || 0) / 255;
                }

                var wave1 = Math.sin(t * Math.PI * 2 * freqScale + wavePhase + offset) * amplitude;
                var wave2 = Math.sin(t * Math.PI * 4 * freqScale + wavePhase * 1.3 + offset * 2) * amplitude * 0.3;
                var wave3 = Math.cos(t * Math.PI * 6 * freqScale + wavePhase * 0.7 + offset) * amplitude * 0.15;

                var freqAmp = freqVal * amplitude * 0.8;
                var y = baseY + wave1 + wave2 + wave3 + freqAmp * Math.sin(t * Math.PI * 8 + wavePhase * 2);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();

            var grad = ctx.createLinearGradient(0, baseY - amplitude, 0, h);
            grad.addColorStop(0, hexToRgba(color, alpha));
            grad.addColorStop(0.5, hexToRgba(color, alpha * 0.4));
            grad.addColorStop(1, hexToRgba(color, 0));
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            for (var i = 0; i <= points; i++) {
                var t = i / points;
                var x = t * w;
                var freqVal = 0;
                if (freq) {
                    var fi = Math.floor(t * (freq.length - 1));
                    freqVal = (freq[fi] || 0) / 255;
                }
                var wave1 = Math.sin(t * Math.PI * 2 * freqScale + wavePhase + offset) * amplitude;
                var wave2 = Math.sin(t * Math.PI * 4 * freqScale + wavePhase * 1.3 + offset * 2) * amplitude * 0.3;
                var wave3 = Math.cos(t * Math.PI * 6 * freqScale + wavePhase * 0.7 + offset) * amplitude * 0.15;
                var freqAmp = freqVal * amplitude * 0.8;
                var y = baseY + wave1 + wave2 + wave3 + freqAmp * Math.sin(t * Math.PI * 8 + wavePhase * 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = hexToRgba(color, alpha + 0.15);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    function renderParticles(w, h, freq, palette) {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.phase += 0.01 * p.speed;
            p.x += p.vx + Math.sin(p.phase) * 0.0005;
            p.y += p.vy + Math.cos(p.phase * 0.7) * 0.0003;

            if (p.x < -0.05) p.x = 1.05;
            if (p.x > 1.05) p.x = -0.05;
            if (p.y < -0.05) p.y = 1.05;
            if (p.y > 1.05) p.y = -0.05;

            var freqVal = 0;
            if (freq) {
                var fi = Math.floor(p.x * (freq.length - 1));
                freqVal = (freq[fi] || 0) / 255;
            }

            var px = p.x * w;
            var py = p.y * h;
            var pr = p.r + freqVal * 3;
            var alpha = 0.2 + freqVal * 0.5;

            var colorIdx = i % palette.colors.length;
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(palette.colors[colorIdx], alpha);
            ctx.fill();
        }
    }

    function renderRipples(w, h, palette) {
        for (var i = ripples.length - 1; i >= 0; i--) {
            var rip = ripples[i];
            rip.r += rip.speed;
            rip.opacity = 1 - (rip.r / rip.maxR);

            if (rip.opacity <= 0) {
                ripples.splice(i, 1);
                continue;
            }

            var cx = rip.x * w;
            var cy = rip.y * h;
            var radius = rip.r * Math.max(w, h);

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(palette.colors[0], rip.opacity * 0.3);
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(palette.colors[1 % palette.colors.length], rip.opacity * 0.15);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function hexToRgba(hex, alpha) {
        var r = 0, g = 0, b = 0;
        if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    var toastTimer = null;
    function showToast(msg) {
        DOM.toast.textContent = msg;
        DOM.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            DOM.toast.classList.remove('show');
        }, 2200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
