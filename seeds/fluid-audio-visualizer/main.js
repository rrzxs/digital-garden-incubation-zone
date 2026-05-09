(function () {
    'use strict';

    var PALETTES = {
        aurora: { colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe'], glow: '#667eea' },
        ember: { colors: ['#f97316', '#ef4444', '#fbbf24', '#dc2626'], glow: '#f97316' },
        ocean: { colors: ['#06b6d4', '#3b82f6', '#8b5cf6', '#22d3ee'], glow: '#06b6d4' },
        neon: { colors: ['#22d3ee', '#a3e635', '#facc15', '#34d399'], glow: '#22d3ee' }
    };

    var state = {
        mode: 'bars',
        palette: 'aurora',
        isActive: false,
        isDemo: false,
        analyser: null,
        audioCtx: null,
        dataArray: null,
        freqArray: null,
        bufferLength: 0,
        mouseX: 0.5,
        mouseY: 0.5,
        particles: [],
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        demoOsc: null,
        demoLfo: null,
        demoGain: null
    };

    var canvas = document.getElementById('vizCanvas');
    var ctx = canvas.getContext('2d');
    var vizOverlay = document.getElementById('vizOverlay');
    var vizGlass = canvas.closest('.viz-glass');

    var statBass = document.getElementById('statBass');
    var statMid = document.getElementById('statMid');
    var statHigh = document.getElementById('statHigh');
    var statFps = document.getElementById('statFps');

    function lerp(a, b, t) { return a + (b - a) * t; }

    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return { r: r, g: g, b: b };
    }

    function resizeCanvas() {
        var rect = canvas.parentElement.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvas._w = rect.width;
        canvas._h = rect.height;
    }

    function initParticles() {
        state.particles = [];
        for (var i = 0; i < 200; i++) {
            state.particles.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.002,
                vy: (Math.random() - 0.5) * 0.002,
                size: Math.random() * 2 + 0.5,
                baseSize: Math.random() * 2 + 0.5,
                freq: Math.floor(Math.random() * 128),
                hue: Math.random(),
                life: Math.random()
            });
        }
    }

    function startMicrophone() {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            state.analyser = state.audioCtx.createAnalyser();
            state.analyser.fftSize = 512;
            state.analyser.smoothingTimeConstant = 0.82;
            var source = state.audioCtx.createMediaStreamSource(stream);
            source.connect(state.analyser);
            state.bufferLength = state.analyser.frequencyBinCount;
            state.dataArray = new Uint8Array(state.bufferLength);
            state.freqArray = new Uint8Array(state.bufferLength);
            state.isActive = true;
            vizOverlay.classList.add('hidden');
            vizGlass.classList.add('active');
        }).catch(function (err) {
            console.warn('Microphone access denied:', err);
            startDemoMode();
        });
    }

    function startDemoMode() {
        if (state.isDemo) return;
        if (state.audioCtx) {
            state.audioCtx.close();
        }
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        state.analyser = state.audioCtx.createAnalyser();
        state.analyser.fftSize = 512;
        state.analyser.smoothingTimeConstant = 0.82;

        state.demoOsc = state.audioCtx.createOscillator();
        state.demoLfo = state.audioCtx.createOscillator();
        state.demoGain = state.audioCtx.createGain();
        var lfoGain = state.audioCtx.createGain();

        state.demoOsc.type = 'sawtooth';
        state.demoOsc.frequency.value = 120;
        state.demoLfo.type = 'sine';
        state.demoLfo.frequency.value = 0.3;
        lfoGain.gain.value = 80;

        state.demoLfo.connect(lfoGain);
        lfoGain.connect(state.demoOsc.frequency);
        state.demoOsc.connect(state.demoGain);
        state.demoGain.gain.value = 0.15;
        state.demoGain.connect(state.analyser);
        state.analyser.connect(state.audioCtx.destination);
        state.demoOsc.start();
        state.demoLfo.start();

        state.bufferLength = state.analyser.frequencyBinCount;
        state.dataArray = new Uint8Array(state.bufferLength);
        state.freqArray = new Uint8Array(state.bufferLength);
        state.isActive = true;
        state.isDemo = true;
        vizOverlay.classList.add('hidden');
        vizGlass.classList.add('active');
        document.getElementById('demoBtn').classList.add('active');
    }

    function stopDemoMode() {
        if (!state.isDemo) return;
        try {
            state.demoOsc.stop();
            state.demoLfo.stop();
        } catch (e) { /* ignore */ }
        state.isDemo = false;
        document.getElementById('demoBtn').classList.remove('active');
    }

    function getFreqBands() {
        if (!state.freqArray) return { bass: 0, mid: 0, high: 0 };
        var len = state.freqArray.length;
        var bassEnd = Math.floor(len * 0.1);
        var midEnd = Math.floor(len * 0.5);
        var bassSum = 0, midSum = 0, highSum = 0;
        for (var i = 0; i < bassEnd; i++) bassSum += state.freqArray[i];
        for (var i = bassEnd; i < midEnd; i++) midSum += state.freqArray[i];
        for (var i = midEnd; i < len; i++) highSum += state.freqArray[i];
        return {
            bass: bassEnd > 0 ? bassSum / bassEnd / 255 : 0,
            mid: (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) / 255 : 0,
            high: (len - midEnd) > 0 ? highSum / (len - midEnd) / 255 : 0
        };
    }

    function getColor(index, total) {
        var pal = PALETTES[state.palette].colors;
        var t = index / Math.max(total - 1, 1);
        var ci = t * (pal.length - 1);
        var lo = Math.floor(ci);
        var hi = Math.min(lo + 1, pal.length - 1);
        var f = ci - lo;
        var c1 = hexToRgb(pal[lo]);
        var c2 = hexToRgb(pal[hi]);
        var r = Math.round(lerp(c1.r, c2.r, f));
        var g = Math.round(lerp(c1.g, c2.g, f));
        var b = Math.round(lerp(c1.b, c2.b, f));
        return { r: r, g: g, b: b, str: 'rgb(' + r + ',' + g + ',' + b + ')' };
    }

    function drawBars(w, h, bands) {
        var barCount = 64;
        var gap = 3;
        var barW = (w - gap * (barCount - 1)) / barCount;
        var maxH = h * 0.85;

        for (var i = 0; i < barCount; i++) {
            var val = state.freqArray ? state.freqArray[Math.floor(i * state.bufferLength / barCount)] / 255 : 0;
            val = val * val;
            var barH = Math.max(val * maxH, 2);
            var x = i * (barW + gap);
            var y = h - barH;

            var col = getColor(i, barCount);
            var alpha = 0.5 + val * 0.5;

            ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha + ')';
            ctx.beginPath();
            var radius = Math.min(barW / 2, 4);
            radius = Math.max(0.1, radius);
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + barW - radius, y);
            ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
            ctx.lineTo(x + barW, h);
            ctx.lineTo(x, h);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();

            if (val > 0.6) {
                ctx.shadowColor = col.str;
                ctx.shadowBlur = 12;
                ctx.fillRect(x, y, barW, 2);
                ctx.shadowBlur = 0;
            }
        }

        var reflectionGradient = ctx.createLinearGradient(0, h, 0, h + 30);
        reflectionGradient.addColorStop(0, 'rgba(255,255,255,0.03)');
        reflectionGradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(0, h, w, 30);
    }

    function drawWave(w, h, bands) {
        if (!state.dataArray) return;

        ctx.lineWidth = 2.5;
        var sliceWidth = w / state.bufferLength;
        var layers = [
            { offset: 0, alpha: 0.8, colorIdx: 0 },
            { offset: -5, alpha: 0.4, colorIdx: 2 },
            { offset: 5, alpha: 0.3, colorIdx: 3 }
        ];

        for (var li = layers.length - 1; li >= 0; li--) {
            var layer = layers[li];
            var col = getColor(layer.colorIdx, 4);
            ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + layer.alpha + ')';
            ctx.shadowColor = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.3)';
            ctx.shadowBlur = li === 0 ? 10 : 0;
            ctx.beginPath();
            for (var i = 0; i < state.bufferLength; i++) {
                var v = state.dataArray[i] / 128.0;
                var y = (v * h / 2) + layer.offset;
                if (i === 0) ctx.moveTo(0, y);
                else ctx.lineTo(i * sliceWidth, y);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        var fillCol = getColor(0, 4);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        var fillGrad = ctx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, 'rgba(' + fillCol.r + ',' + fillCol.g + ',' + fillCol.b + ',0.08)');
        fillGrad.addColorStop(1, 'rgba(' + fillCol.r + ',' + fillCol.g + ',' + fillCol.b + ',0)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
    }

    function drawRadial(w, h, bands) {
        var cx = w / 2;
        var cy = h / 2;
        var baseR = Math.min(w, h) * 0.15;
        var maxR = Math.min(w, h) * 0.42;
        var count = 128;

        var glowCol = hexToRgb(PALETTES[state.palette].glow);
        ctx.shadowColor = 'rgba(' + glowCol.r + ',' + glowCol.g + ',' + glowCol.b + ',0.3)';
        ctx.shadowBlur = 20;

        for (var ring = 0; ring < 3; ring++) {
            var ringAlpha = 0.6 - ring * 0.15;
            var ringScale = 1 + ring * 0.3;
            ctx.beginPath();
            for (var i = 0; i <= count; i++) {
                var angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                var fi = Math.floor((i / count) * state.bufferLength);
                var val = state.freqArray ? state.freqArray[fi] / 255 : 0;
                val = val * val;
                var r = baseR + val * (maxR - baseR) * ringScale;
                r = Math.max(0.1, r);
                var x = cx + Math.cos(angle) * r;
                var y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            var col = getColor(ring, 3);
            ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + ringAlpha + ')';
            ctx.lineWidth = 2 - ring * 0.5;
            ctx.stroke();

            if (ring === 0) {
                var fillGrad = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, maxR);
                fillGrad.addColorStop(0, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.06)');
                fillGrad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0)');
                ctx.fillStyle = fillGrad;
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;

        var pulseR = baseR * (1 + bands.bass * 0.3);
        pulseR = Math.max(0.1, pulseR);
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawParticles(w, h, bands) {
        var energy = (bands.bass + bands.mid + bands.high) / 3;

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            var freqVal = state.freqArray ? state.freqArray[p.freq] / 255 : 0;
            var boost = freqVal * 0.01;
            p.vx += (Math.random() - 0.5) * 0.001 + boost;
            p.vy += (Math.random() - 0.5) * 0.001 + boost;

            var dx = p.x - state.mouseX;
            var dy = p.y - state.mouseY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.15 && dist > 0.001) {
                var force = (0.15 - dist) * 0.003;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
            if (p.x > 1) { p.x = 1; p.vx *= -0.5; }
            if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
            if (p.y > 1) { p.y = 1; p.vy *= -0.5; }

            p.size = p.baseSize * (1 + freqVal * 3);
            p.life = 0.3 + freqVal * 0.7;
        }

        for (var i = 0; i < state.particles.length; i++) {
            for (var j = i + 1; j < state.particles.length; j++) {
                var a = state.particles[i];
                var b = state.particles[j];
                var dx = a.x - b.x;
                var dy = a.y - b.y;
                var d = dx * dx + dy * dy;
                if (d < 0.003) {
                    var col = getColor(Math.floor((a.freq + b.freq) / 2), 128);
                    var alpha = (1 - d / 0.003) * 0.15 * Math.max(a.life, b.life);
                    ctx.beginPath();
                    ctx.moveTo(a.x * w, a.y * h);
                    ctx.lineTo(b.x * w, b.y * h);
                    ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            var col = getColor(p.freq, 128);
            var px = p.x * w;
            var py = p.y * h;
            var sz = Math.max(0.5, p.size);
            var alpha = p.life * 0.8;

            ctx.beginPath();
            ctx.arc(px, py, sz, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha + ')';
            ctx.fill();

            if (p.life > 0.7) {
                ctx.beginPath();
                ctx.arc(px, py, sz * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.15) + ')';
                ctx.fill();
            }
        }
    }

    function updateStats(bands) {
        var bassVal = Math.round(bands.bass * 100);
        var midVal = Math.round(bands.mid * 100);
        var highVal = Math.round(bands.high * 100);

        statBass.textContent = bassVal;
        statMid.textContent = midVal;
        statHigh.textContent = highVal;

        statBass.classList.toggle('peak', bassVal > 60);
        statMid.classList.toggle('peak', midVal > 40);
        statHigh.classList.toggle('peak', highVal > 30);

        state.frameCount++;
        var now = performance.now();
        if (now - state.fpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.fpsTime = now;
            statFps.textContent = state.fps;
        }
    }

    function render() {
        requestAnimationFrame(render);

        if (state.analyser) {
            state.analyser.getByteFrequencyData(state.freqArray);
            state.analyser.getByteTimeDomainData(state.dataArray);
        }

        var w = canvas._w || 800;
        var h = canvas._h || 450;
        ctx.clearRect(0, 0, w, h);

        var bands = getFreqBands();

        switch (state.mode) {
            case 'bars': drawBars(w, h, bands); break;
            case 'wave': drawWave(w, h, bands); break;
            case 'radial': drawRadial(w, h, bands); break;
            case 'particles': drawParticles(w, h, bands); break;
        }

        if (state.isActive) {
            updateStats(bands);
        }
    }

    function bindEvents() {
        vizOverlay.addEventListener('click', function () {
            startMicrophone();
        });

        document.querySelectorAll('.mode-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
            });
        });

        document.querySelectorAll('.palette-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.palette-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
            });
        });

        document.getElementById('demoBtn').addEventListener('click', function () {
            if (state.isDemo) {
                stopDemoMode();
                if (!state.isActive || state.isDemo) {
                    state.isActive = false;
                    vizOverlay.classList.remove('hidden');
                    vizGlass.classList.remove('active');
                }
            } else {
                startDemoMode();
            }
        });

        document.getElementById('fullscreenBtn').addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen();
            }
        });

        var vizArea = document.querySelector('.viz-glass');
        vizArea.addEventListener('mousemove', function (e) {
            var rect = vizArea.getBoundingClientRect();
            state.mouseX = (e.clientX - rect.left) / rect.width;
            state.mouseY = (e.clientY - rect.top) / rect.height;
        });

        vizArea.addEventListener('mouseleave', function () {
            state.mouseX = 0.5;
            state.mouseY = 0.5;
        });

        vizArea.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var rect = vizArea.getBoundingClientRect();
            var touch = e.touches[0];
            state.mouseX = (touch.clientX - rect.left) / rect.width;
            state.mouseY = (touch.clientY - rect.top) / rect.height;
        }, { passive: false });

        window.addEventListener('resize', resizeCanvas);
    }

    resizeCanvas();
    initParticles();
    bindEvents();
    state.fpsTime = performance.now();
    render();
})();
