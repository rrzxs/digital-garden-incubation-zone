(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

    var MOOD_THEMES = {
        happy:    { accent: '#f0c07a', emoji: '😊', title: '阳光洒满心头', subtitle: '你的快乐正在感染周围的一切' },
        calm:     { accent: '#7af0c8', emoji: '😌', title: '如湖面般平静', subtitle: '此刻的宁静是属于你的礼物' },
        sad:      { accent: '#7aa8f0', emoji: '😢', title: '允许自己难过', subtitle: '每一滴泪都在浇灌未来的花开' },
        anxious:  { accent: '#f0a07a', emoji: '😰', title: '风暴终将过去', subtitle: '深呼吸，这一刻你是安全的' },
        tired:    { accent: '#b488f0', emoji: '😴', title: '该休息一下了', subtitle: '放下一切，让柔软将你包裹' },
        grateful: { accent: '#f07aa8', emoji: '🥰', title: '感恩让心灵丰盈', subtitle: '你注意到的小美好，都是生活的礼物' }
    };

    var AMBIENT_THEMES = {
        dawn:   { accent: '#f0a07a', blobs: ['#f0a07a', '#f0d07a', '#f07a7a'] },
        rain:   { accent: '#7aa8f0', blobs: ['#7aa8f0', '#7af0e8', '#a07af0'] },
        night:  { accent: '#b488f0', blobs: ['#b488f0', '#887af0', '#f07ac8'] },
        forest: { accent: '#7af0a8', blobs: ['#7af0a8', '#a8f07a', '#7af0d0'] }
    };

    var AFFIRMATIONS = [
        '你值得被温柔以待',
        '今天的你已经足够好了',
        '允许自己慢慢来，不必着急',
        '你的存在本身就有意义',
        '每一次呼吸都是一次新的开始',
        '你不必完美，你只需要真实',
        '温柔地对待自己，像对待最好的朋友',
        '此刻的你是安全的',
        '你已经走了很远，为自己鼓掌',
        '世界因你而多了一份美好',
        '休息不是懈怠，是给自己充电',
        '你的感受都是被允许的',
        '每一个清晨都是崭新的机会',
        '你比想象中更加坚强',
        '慢慢来，一切都会刚刚好'
    ];

    var BREATHE_PATTERNS = {
        '478':  { inhale: 4, hold: 7, exhale: 8, label: '吸气', holdLabel: '屏息', exhaleLabel: '呼气' },
        'box':  { inhale: 4, hold: 4, exhale: 4, hold2: 4, label: '吸气', holdLabel: '屏息', exhaleLabel: '呼气', hold2Label: '屏息' },
        'calm': { inhale: 5, hold: 2, exhale: 7, label: '吸气', holdLabel: '屏息', exhaleLabel: '呼气' }
    };

    var state = {
        mood: null,
        ambient: 'dawn',
        breatheActive: false,
        breathePattern: '478',
        breathePhase: null,
        breatheTimer: null,
        breatheElapsed: 0,
        soundEnabled: false,
        particles: [],
        audioCtx: null,
        audioNodes: {}
    };

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // === Particle System ===

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.3 + 0.05,
            phase: Math.random() * Math.PI * 2
        };
    }

    function initParticles() {
        state.particles = [];
        var count = Math.min(Math.floor(window.innerWidth * window.innerHeight / 12000), 80);
        for (var i = 0; i < count; i++) {
            state.particles.push(createParticle());
        }
    }

    initParticles();

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function updateParticles() {
        var t = Date.now() * 0.001;
        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var force = Math.max(0, 1 - dist / 200);
            p.vx += dx * force * 0.00005;
            p.vy += dy * force * 0.00005;
            p.vx += Math.sin(t + p.phase) * 0.003;
            p.vy += Math.cos(t + p.phase) * 0.003;
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx;
            p.y += p.vy;
            p.opacity = (Math.sin(t * 0.5 + p.phase) * 0.15 + 0.15);

            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var theme = AMBIENT_THEMES[state.ambient];
        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(theme.accent, p.opacity);
            ctx.fill();
        }

        for (var a = 0; a < state.particles.length; a++) {
            for (var b = a + 1; b < state.particles.length; b++) {
                var pa = state.particles[a];
                var pb = state.particles[b];
                var ddx = pa.x - pb.x;
                var ddy = pa.y - pb.y;
                var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dd < 100) {
                    ctx.beginPath();
                    ctx.moveTo(pa.x, pa.y);
                    ctx.lineTo(pb.x, pb.y);
                    ctx.strokeStyle = hexToRgba(theme.accent, (1 - dd / 100) * 0.06);
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animLoop() {
        updateParticles();
        drawParticles();
        requestAnimationFrame(animLoop);
    }

    requestAnimationFrame(animLoop);

    // === Click Ripple ===

    document.addEventListener('click', function (e) {
        var ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = (e.clientX - 150) + 'px';
        ripple.style.top = (e.clientY - 150) + 'px';
        document.getElementById('ripple-layer').appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 800);
    });

    // === Mood Selection ===

    var moodBubbles = document.querySelectorAll('.mood-bubble');
    var moodEmoji = document.getElementById('mood-emoji');
    var moodTitle = document.getElementById('mood-title');
    var moodSubtitle = document.getElementById('mood-subtitle');
    var breatheProgress = document.getElementById('breathe-progress');

    moodBubbles.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var mood = btn.getAttribute('data-mood');
            var theme = MOOD_THEMES[mood];
            if (!theme) return;

            moodBubbles.forEach(function (b) { b.classList.remove('selected'); });
            btn.classList.add('selected');

            state.mood = mood;

            moodEmoji.style.transform = 'scale(0)';
            setTimeout(function () {
                moodEmoji.textContent = theme.emoji;
                moodEmoji.style.transform = 'scale(1.2)';
                setTimeout(function () {
                    moodEmoji.style.transform = 'scale(1)';
                }, 300);
            }, 200);

            moodTitle.style.opacity = '0';
            moodTitle.style.transform = 'translateY(-8px)';
            moodSubtitle.style.opacity = '0';
            moodSubtitle.style.transform = 'translateY(-8px)';

            setTimeout(function () {
                moodTitle.textContent = theme.title;
                moodSubtitle.textContent = theme.subtitle;
                moodTitle.style.opacity = '1';
                moodTitle.style.transform = 'translateY(0)';
                moodSubtitle.style.opacity = '1';
                moodSubtitle.style.transform = 'translateY(0)';
            }, 250);

            document.documentElement.style.setProperty('--mood-accent', theme.accent);
            breatheProgress.style.stroke = theme.accent;

            if (state.soundEnabled) {
                playMoodTone(mood);
            }
        });
    });

    moodTitle.style.transition = 'all 0.5s ' + EASE;
    moodSubtitle.style.transition = 'all 0.5s ' + EASE;
    moodEmoji.style.transition = 'transform 0.4s ' + SPRING;

    // === Ambient Themes ===

    var ambientBtns = document.querySelectorAll('.ambient-btn');
    var blobs = document.querySelectorAll('.blob');

    ambientBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var mood = btn.getAttribute('data-mood');
            var theme = AMBIENT_THEMES[mood];
            if (!theme) return;

            ambientBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.ambient = mood;

            document.documentElement.style.setProperty('--mood-accent', theme.accent);
            breatheProgress.style.stroke = theme.accent;

            blobs.forEach(function (blob, i) {
                var colorIdx = i % theme.blobs.length;
                blob.style.background = 'radial-gradient(circle, ' + theme.blobs[colorIdx] + ', transparent 70%)';
            });
        });
    });

    // === Breathing Exercise ===

    var breatheToggle = document.getElementById('breathe-toggle');
    var breathePhaseEl = document.getElementById('breathe-phase');
    var breatheTimerEl = document.getElementById('breathe-timer');
    var patternBtns = document.querySelectorAll('.pattern-btn');
    var breatheInterval = null;

    patternBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            patternBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.breathePattern = btn.getAttribute('data-pattern');
            if (state.breatheActive) {
                stopBreathe();
                startBreathe();
            }
        });
    });

    breatheToggle.addEventListener('click', function () {
        if (state.breatheActive) {
            stopBreathe();
        } else {
            startBreathe();
        }
    });

    function startBreathe() {
        state.breatheActive = true;
        breatheToggle.classList.add('active');
        breatheToggle.querySelector('span').textContent = '暂停';
        var svgPolygon = breatheToggle.querySelector('svg polygon');
        if (svgPolygon) {
            svgPolygon.setAttribute('points', '6,4 10,4 10,20 14,20 14,4 18,4');
        }

        runBreatheCycle();
    }

    function stopBreathe() {
        state.breatheActive = false;
        breatheToggle.classList.remove('active');
        breatheToggle.querySelector('span').textContent = '开始呼吸';
        var svgPolygon = breatheToggle.querySelector('svg polygon');
        if (svgPolygon) {
            svgPolygon.setAttribute('points', '5,3 19,12 5,21');
        }
        clearTimeout(state.breatheTimer);
        breathePhaseEl.textContent = '呼吸';
        breatheTimerEl.textContent = '0:00';
        breatheProgress.style.strokeDashoffset = '565.48';
    }

    function runBreatheCycle() {
        if (!state.breatheActive) return;

        var pattern = BREATHE_PATTERNS[state.breathePattern];
        var phases = [];

        phases.push({ name: pattern.label, duration: pattern.inhale });
        phases.push({ name: pattern.holdLabel, duration: pattern.hold });
        phases.push({ name: pattern.exhaleLabel, duration: pattern.exhale });
        if (pattern.hold2) {
            phases.push({ name: pattern.hold2Label, duration: pattern.hold2 });
        }

        var totalDuration = phases.reduce(function (s, p) { return s + p.duration; }, 0);
        var circumference = 565.48;

        function runPhase(phaseIdx) {
            if (!state.breatheActive) return;
            if (phaseIdx >= phases.length) {
                runBreatheCycle();
                return;
            }

            var phase = phases[phaseIdx];
            breathePhaseEl.textContent = phase.name;

            var elapsed = 0;
            function tick() {
                if (!state.breatheActive) return;
                var sec = Math.ceil(phase.duration - elapsed);
                breatheTimerEl.textContent = sec + 's';

                var globalElapsed = 0;
                for (var k = 0; k < phaseIdx; k++) {
                    globalElapsed += phases[k].duration;
                }
                globalElapsed += elapsed;

                var progress = globalElapsed / totalDuration;
                breatheProgress.style.strokeDashoffset = circumference * (1 - progress);

                if (elapsed >= phase.duration) {
                    runPhase(phaseIdx + 1);
                    return;
                }

                elapsed += 0.1;
                state.breatheTimer = setTimeout(tick, 100);
            }

            tick();
        }

        runPhase(0);
    }

    // === Affirmations ===

    var affirmationText = document.getElementById('affirmation-text');
    var affirmationRefresh = document.getElementById('affirmation-refresh');
    var lastAffIdx = -1;

    affirmationRefresh.addEventListener('click', function () {
        var idx;
        do {
            idx = Math.floor(Math.random() * AFFIRMATIONS.length);
        } while (idx === lastAffIdx && AFFIRMATIONS.length > 1);
        lastAffIdx = idx;

        affirmationText.style.opacity = '0';
        affirmationText.style.transform = 'translateY(6px)';

        setTimeout(function () {
            affirmationText.textContent = AFFIRMATIONS[idx];
            affirmationText.style.opacity = '1';
            affirmationText.style.transform = 'translateY(0)';
        }, 300);
    });

    affirmationText.style.transition = 'all 0.4s ' + EASE;

    // === Sound Engine (Web Audio) ===

    var soundToggle = document.getElementById('sound-toggle');
    var soundStatus = soundToggle.querySelector('.sound-status');
    var sliders = document.querySelectorAll('.channel-slider');

    soundToggle.addEventListener('click', function () {
        state.soundEnabled = !state.soundEnabled;
        soundToggle.classList.toggle('active', state.soundEnabled);
        soundStatus.textContent = state.soundEnabled ? '播放中' : '静音';

        if (state.soundEnabled) {
            initAudio();
            updateAllSounds();
        } else {
            muteAllSounds();
        }
    });

    sliders.forEach(function (slider) {
        slider.addEventListener('input', function () {
            if (state.soundEnabled) {
                updateSoundChannel(slider.getAttribute('data-sound'), parseInt(slider.value));
            }
            updateSliderTrack(slider);
        });

        updateSliderTrack(slider);
    });

    function updateSliderTrack(slider) {
        var val = parseInt(slider.value);
        var pct = val + '%';
        var color = slider.getAttribute('data-color') || 'rgba(255,255,255,0.3)';
        slider.style.background = 'linear-gradient(to right, ' + color + ' 0%, ' + color + ' ' + pct + ', rgba(255,255,255,0.08) ' + pct + ', rgba(255,255,255,0.08) 100%)';
    }

    function initAudio() {
        if (state.audioCtx) return;
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        createNoise('rain', 'brown');
        createNoise('fire', 'pink');
        createNoise('wind', 'white');

        createOscillator('birds', 2200, 'sine');
    }

    function createNoise(channel, type) {
        var audioCtx = state.audioCtx;
        var bufferSize = 2 * audioCtx.sampleRate;
        var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);

        if (type === 'brown') {
            var last = 0;
            for (var i = 0; i < bufferSize; i++) {
                var white = Math.random() * 2 - 1;
                data[i] = (last + (0.02 * white)) / 1.02;
                last = data[i];
                data[i] *= 3.5;
            }
        } else if (type === 'pink') {
            var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (var j = 0; j < bufferSize; j++) {
                var w = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + w * 0.0555179;
                b1 = 0.99332 * b1 + w * 0.0750759;
                b2 = 0.96900 * b2 + w * 0.1538520;
                b3 = 0.86650 * b3 + w * 0.3104856;
                b4 = 0.55000 * b4 + w * 0.5329522;
                b5 = -0.7616 * b5 - w * 0.0168980;
                data[j] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
                data[j] *= 0.11;
                b6 = w * 0.115926;
            }
        } else {
            for (var k = 0; k < bufferSize; k++) {
                data[k] = Math.random() * 2 - 1;
            }
        }

        var source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        var filter = audioCtx.createBiquadFilter();
        if (type === 'brown') {
            filter.type = 'lowpass';
            filter.frequency.value = 800;
        } else if (type === 'pink') {
            filter.type = 'lowpass';
            filter.frequency.value = 500;
        } else {
            filter.type = 'bandpass';
            filter.frequency.value = 600;
            filter.Q.value = 0.5;
        }

        var gain = audioCtx.createGain();
        gain.gain.value = 0;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        source.start();

        state.audioNodes[channel] = { gain: gain, source: source, filter: filter };
    }

    function createOscillator(channel, freq, type) {
        var audioCtx = state.audioCtx;
        var gain = audioCtx.createGain();
        gain.gain.value = 0;

        var lfo = audioCtx.createOscillator();
        lfo.frequency.value = 3 + Math.random() * 4;

        var lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);

        var osc = audioCtx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        lfoGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        lfo.start();
        osc.start();

        state.audioNodes[channel] = { gain: gain, source: osc };
    }

    function updateSoundChannel(channel, value) {
        var node = state.audioNodes[channel];
        if (!node) return;
        var vol = (value / 100) * 0.25;
        node.gain.gain.linearRampToValueAtTime(vol, state.audioCtx.currentTime + 0.1);
    }

    function updateAllSounds() {
        sliders.forEach(function (slider) {
            updateSoundChannel(slider.getAttribute('data-sound'), parseInt(slider.value));
        });
    }

    function muteAllSounds() {
        if (!state.audioCtx) return;
        Object.keys(state.audioNodes).forEach(function (key) {
            var node = state.audioNodes[key];
            node.gain.gain.linearRampToValueAtTime(0, state.audioCtx.currentTime + 0.3);
        });
    }

    function playMoodTone(mood) {
        if (!state.audioCtx) return;
        var freqMap = { happy: 523, calm: 392, sad: 330, anxious: 440, tired: 349, grateful: 466 };
        var freq = freqMap[mood] || 440;
        var osc = state.audioCtx.createOscillator();
        var gain = state.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(state.audioCtx.destination);
        osc.start();
        osc.stop(state.audioCtx.currentTime + 1.5);
    }

    // === Utility ===

    function hexToRgba(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    // === Init ===

    var stored = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
    affirmationText.textContent = stored;
    lastAffIdx = AFFIRMATIONS.indexOf(stored);

})();
