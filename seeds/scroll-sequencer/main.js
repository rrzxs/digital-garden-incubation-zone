(function () {
    'use strict';

    // === DOM Elements ===
    var DOM = {
        main: document.getElementById('main-content'),
        progressFill: document.getElementById('progress-fill'),
        sectionDots: document.getElementById('section-dots'),
        cursorGlow: document.getElementById('cursor-glow'),
        transitionFlash: document.getElementById('transition-flash'),
        particleCanvas: document.getElementById('particle-field'),
        waveformCanvas: document.getElementById('waveform-canvas'),
        themeSwitcher: document.getElementById('theme-switcher'),
        stepValue: document.getElementById('step-value'),
        stepBar: document.getElementById('step-bar'),
        tempoValue: document.getElementById('tempo-value'),
        bpmValue: document.getElementById('bpm-value'),
        hitsValue: document.getElementById('hits-value'),
        tempoNum: document.getElementById('tempo-num'),
        tempoPulse: document.getElementById('tempo-pulse'),
        stepNumbers: document.getElementById('step-numbers'),
        trackGrid: document.getElementById('track-grid'),
        playheadLine: document.getElementById('playhead-line'),
        waveformLabels: document.getElementById('waveform-labels'),
        statActive: document.getElementById('stat-active'),
        statDensity: document.getElementById('stat-density'),
        audioBtn: document.getElementById('audio-btn'),
        audioOnBtn: document.getElementById('audio-on-btn'),
        scenes: document.querySelectorAll('.scene'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        tiltElements: document.querySelectorAll('[data-tilt]'),
        revealElements: document.querySelectorAll('[data-reveal]'),
        revealTexts: document.querySelectorAll('[data-reveal-text]'),
        revealLines: document.querySelectorAll('[data-reveal-lines]')
    };

    // === Constants ===
    var STEPS = 16;
    var TRACKS = [
        { name: 'Kick', key: 'kick', color: '--track-kick', freq: 55, type: 'kick' },
        { name: 'Snare', key: 'snare', color: '--track-snare', freq: 200, type: 'snare' },
        { name: 'Hat', key: 'hat', color: '--track-hat', freq: 8000, type: 'hat' },
        { name: 'Bass', key: 'bass', color: '--track-bass', freq: 82, type: 'bass' },
        { name: 'Lead', key: 'lead', color: '--track-lead', freq: 440, type: 'lead' }
    ];

    // Default pattern: a simple house beat spread across 16 steps
    var DEFAULT_PATTERN = [
        [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // Kick - 4 on the floor
        [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1], // Snare - backbeat
        [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // Hat - offbeats
        [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0], // Bass - syncopated
        [0,0,1,0, 0,1,0,0, 0,0,1,0, 0,1,0,1]  // Lead - melodic accents
    ];

    var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

    // === State ===
    var State = {
        currentIndex: 0,
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        smoothX: window.innerWidth / 2,
        smoothY: window.innerHeight / 2,
        scrollSpeed: 0,
        smoothSpeed: 0,
        lastScrollY: window.scrollY,
        totalSections: DOM.scenes.length,
        pattern: DEFAULT_PATTERN.map(function (t) { return t.slice(); }),
        currentStep: 0,
        lastTriggeredStep: -1,
        bpm: 120,
        smoothBpm: 120,
        hitCount: 0,
        audioEnabled: false,
        rafId: null,
        waveformRipples: []
    };

    // === Utility ===
    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function map(v, inMin, inMax, outMin, outMax) {
        return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
    }

    // === Audio Engine (Web Audio synthesis) ===
    var AudioEngine = {
        ctx: null,
        masterGain: null,
        init: function () {
            if (this.ctx) return;
            try {
                var AC = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AC();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.5;
                this.masterGain.connect(this.ctx.destination);
            } catch (e) {
                this.ctx = null;
            }
        },
        resume: function () {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },
        playTrack: function (trackIndex) {
            if (!this.ctx || !State.audioEnabled) return;
            var track = TRACKS[trackIndex];
            var now = this.ctx.currentTime;
            switch (track.type) {
                case 'kick': this.playKick(now); break;
                case 'snare': this.playSnare(now); break;
                case 'hat': this.playHat(now); break;
                case 'bass': this.playBass(now); break;
                case 'lead': this.playLead(now); break;
            }
        },
        playKick: function (now) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
            gain.gain.setValueAtTime(0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.35);
        },
        playSnare: function (now) {
            // Noise burst for snare body
            var bufferSize = this.ctx.sampleRate * 0.15;
            var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
            }
            var noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            var noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 1500;
            var noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            noise.start(now);
            // Tonal component
            var osc = this.ctx.createOscillator();
            var oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 200;
            oscGain.gain.setValueAtTime(0.2, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(oscGain);
            oscGain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.12);
        },
        playHat: function (now) {
            var bufferSize = this.ctx.sampleRate * 0.06;
            var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
            }
            var noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            var filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 7000;
            var gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            noise.start(now);
        },
        playBass: function (now) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            var filter = this.ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(82, now);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);
            filter.Q.value = 4;
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.3);
        },
        playLead: function (now) {
            // Pentatonic melody across steps
            var notes = [440, 523, 587, 659, 784];
            var freq = notes[State.currentStep % notes.length];
            var osc = this.ctx.createOscillator();
            var osc2 = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc2.type = 'sine';
            osc.frequency.value = freq;
            osc2.frequency.value = freq * 2;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc2.start(now);
            osc.stop(now + 0.45);
            osc2.stop(now + 0.45);
        }
    };

    // === Theme Manager ===
    var ThemeManager = {
        current: 'aurora',
        init: function () {
            var self = this;
            DOM.themeBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var theme = btn.getAttribute('data-theme');
                    self.set(theme);
                    DOM.themeBtns.forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    ParticleField.recolor();
                    WaveformRenderer.refreshColors();
                });
            });
        },
        set: function (theme) {
            this.current = theme;
            document.documentElement.setAttribute('data-theme', theme);
        }
    };

    // === Section Dots ===
    var SectionDots = {
        init: function () {
            DOM.scenes.forEach(function (scene, i) {
                var dot = document.createElement('div');
                dot.className = 'section-dot' + (i === 0 ? ' active' : '');
                dot.setAttribute('data-index', i);
                dot.addEventListener('click', function () {
                    scene.scrollIntoView({ behavior: 'smooth' });
                });
                DOM.sectionDots.appendChild(dot);
            });
        },
        setActive: function (index) {
            var dots = DOM.sectionDots.querySelectorAll('.section-dot');
            dots.forEach(function (d, i) {
                d.classList.toggle('active', i === index);
            });
        }
    };

    // === Progress Tracker ===
    var ProgressTracker = {
        update: function () {
            var scrolled = window.scrollY;
            var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            var percent = maxScroll > 0 ? clamp((scrolled / maxScroll) * 100, 0, 100) : 0;
            DOM.progressFill.style.height = percent + '%';
        }
    };

    // === Active Section Observer ===
    var SectionObserver = {
        observer: null,
        init: function () {
            var self = this;
            this.observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        var index = parseInt(entry.target.getAttribute('data-section'), 10);
                        if (index !== State.currentIndex) {
                            self.onSectionChange(index);
                        }
                    }
                });
            }, { threshold: [0.5, 0.6, 0.7] });
            DOM.scenes.forEach(function (scene) { self.observer.observe(scene); });
        },
        onSectionChange: function (index) {
            State.currentIndex = index;
            SectionDots.setActive(index);
            if (DOM.transitionFlash) {
                DOM.transitionFlash.classList.remove('flash');
                void DOM.transitionFlash.offsetWidth;
                DOM.transitionFlash.classList.add('flash');
            }
        }
    };

    // === Reveal Manager ===
    var RevealManager = {
        init: function () {
            DOM.revealTexts.forEach(function (el) {
                var text = el.textContent;
                el.textContent = '';
                var chars = text.split('');
                chars.forEach(function (ch, i) {
                    var span = document.createElement('span');
                    span.className = 'char';
                    span.textContent = ch === ' ' ? '\u00A0' : ch;
                    span.style.transitionDelay = (i * 30) + 'ms';
                    el.appendChild(span);
                });
            });

            DOM.revealLines.forEach(function (el) {
                var lines = el.querySelectorAll('.line');
                lines.forEach(function (line, i) {
                    var inner = document.createElement('span');
                    inner.className = 'line-inner';
                    inner.style.transitionDelay = (i * 120) + 'ms';
                    var text = line.textContent;
                    line.textContent = '';
                    inner.textContent = text;
                    line.appendChild(inner);
                });
            });

            var targets = [];
            DOM.revealElements.forEach(function (el) { targets.push(el); });
            DOM.revealTexts.forEach(function (el) { targets.push(el); });
            DOM.revealLines.forEach(function (el) { targets.push(el); });

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                    }
                });
            }, { threshold: 0.3 });
            targets.forEach(function (el) { observer.observe(el); });
        }
    };

    // === Tilt Manager ===
    var TiltManager = {
        init: function () {
            DOM.tiltElements.forEach(function (el) {
                var intensity = parseFloat(el.getAttribute('data-intensity')) || 1.0;
                el.addEventListener('mousemove', function (e) {
                    var rect = el.getBoundingClientRect();
                    var px = (e.clientX - rect.left) / rect.width;
                    var py = (e.clientY - rect.top) / rect.height;
                    var rx = (0.5 - py) * 12 * intensity;
                    var ry = (px - 0.5) * 12 * intensity;
                    el.style.transform = 'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(10px)';
                    el.style.setProperty('--glow-x', (px * 100) + '%');
                    el.style.setProperty('--glow-y', (py * 100) + '%');
                });
                el.addEventListener('mouseleave', function () {
                    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
                });
            });
        }
    };

    // === Sequencer Grid Builder ===
    var SequencerBuilder = {
        init: function () {
            // Build step numbers
            for (var s = 0; s < STEPS; s++) {
                var num = document.createElement('div');
                num.className = 'step-number';
                if (s % 4 === 0) num.classList.add('beat-marker');
                num.textContent = String(s + 1).padStart(2, '0');
                DOM.stepNumbers.appendChild(num);
            }

            // Build track rows
            TRACKS.forEach(function (track, ti) {
                var row = document.createElement('div');
                row.className = 'sequencer-row';
                row.setAttribute('data-track', ti);

                var name = document.createElement('div');
                name.className = 'track-name mono';
                name.style.setProperty('--track-color', 'var(' + track.color + ')');
                name.textContent = track.name;

                var cells = document.createElement('div');
                cells.className = 'track-cells';

                for (var si = 0; si < STEPS; si++) {
                    var cell = document.createElement('div');
                    cell.className = 'seq-cell';
                    cell.setAttribute('data-track', ti);
                    cell.setAttribute('data-step', si);
                    cell.style.setProperty('--track-color', 'var(' + track.color + ')');
                    if (State.pattern[ti][si]) {
                        cell.classList.add('active');
                    }
                    if (si > 0 && si % 4 === 0) {
                        cell.classList.add('beat-divider');
                    }
                    cell.addEventListener('click', function (t, sIdx, el) {
                        return function () {
                            State.pattern[t][sIdx] = State.pattern[t][sIdx] ? 0 : 1;
                            el.classList.toggle('active');
                            if (State.pattern[t][sIdx] && State.audioEnabled) {
                                AudioEngine.playTrack(t);
                            }
                            SequencerStats.update();
                        };
                    }(ti, si, cell));
                    cells.appendChild(cell);
                }

                row.appendChild(name);
                row.appendChild(cells);
                DOM.trackGrid.appendChild(row);
            });

            // Build waveform labels
            TRACKS.forEach(function (track) {
                var label = document.createElement('div');
                label.className = 'wave-label mono';
                label.style.setProperty('--track-color', 'var(' + track.color + ')');
                label.textContent = track.name;
                DOM.waveformLabels.appendChild(label);
            });

            SequencerStats.update();
        }
    };

    // === Sequencer Stats ===
    var SequencerStats = {
        update: function () {
            var active = 0;
            State.pattern.forEach(function (track) {
                track.forEach(function (cell) { if (cell) active++; });
            });
            var total = TRACKS.length * STEPS;
            var density = Math.round((active / total) * 100);
            if (DOM.statActive) DOM.statActive.textContent = active;
            if (DOM.statDensity) DOM.statDensity.textContent = density + '%';
        }
    };

    // === Playhead Controller (scroll-driven step position) ===
    var PlayheadController = {
        update: function () {
            var scrolled = window.scrollY;
            var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            var progress = maxScroll > 0 ? clamp(scrolled / maxScroll, 0, 1) : 0;
            var step = Math.floor(progress * STEPS);
            step = clamp(step, 0, STEPS - 1);

            // Position playhead line
            if (DOM.playheadLine) {
                var gridRect = DOM.trackGrid.getBoundingClientRect();
                var stageRect = DOM.playheadLine.parentElement.getBoundingClientRect();
                if (gridRect.width > 0) {
                    var firstRow = DOM.trackGrid.querySelector('.track-cells');
                    if (firstRow) {
                        var cells = firstRow.querySelectorAll('.seq-cell');
                        if (cells.length > 0) {
                            var cellRect = cells[step].getBoundingClientRect();
                            var leftOffset = cellRect.left - stageRect.left + cellRect.width / 2;
                            DOM.playheadLine.style.left = leftOffset + 'px';
                        }
                    }
                }
            }

            // Highlight current step numbers
            var numbers = DOM.stepNumbers.querySelectorAll('.step-number');
            numbers.forEach(function (n, i) {
                n.classList.toggle('current', i === step);
            });

            // Highlight current column cells
            var allCells = DOM.trackGrid.querySelectorAll('.seq-cell');
            allCells.forEach(function (cell) {
                var cellStep = parseInt(cell.getAttribute('data-step'), 10);
                cell.classList.toggle('current-step', cellStep === step);
            });

            // Trigger audio if step changed
            if (step !== State.lastTriggeredStep) {
                State.currentStep = step;
                State.lastTriggeredStep = step;
                this.triggerStep(step);
            }
        },
        triggerStep: function (step) {
            // Update HUD
            if (DOM.stepValue) {
                DOM.stepValue.textContent = String(step + 1).padStart(2, '0') + ' / ' + STEPS;
            }
            if (DOM.stepBar) {
                DOM.stepBar.style.width = ((step + 1) / STEPS * 100) + '%';
            }

            // Trigger active tracks at this step
            var triggered = [];
            TRACKS.forEach(function (track, ti) {
                if (State.pattern[ti][step]) {
                    AudioEngine.playTrack(ti);
                    triggered.push(ti);
                    State.hitCount++;
                }
            });

            if (DOM.hitsValue) {
                DOM.hitsValue.textContent = State.hitCount;
            }

            // Add waveform ripples
            triggered.forEach(function (ti) {
                WaveformRenderer.addRipple(ti);
            });

            // Tempo pulse beat
            if (triggered.length > 0 && DOM.tempoPulse) {
                DOM.tempoPulse.classList.add('beat');
                setTimeout(function () {
                    DOM.tempoPulse.classList.remove('beat');
                }, 150);
            }
        }
    };

    // === Waveform Renderer ===
    var WaveformRenderer = {
        ctx: null,
        colors: [],
        ripples: [],
        init: function () {
            var canvas = DOM.waveformCanvas;
            if (!canvas) return;
            this.ctx = canvas.getContext('2d');
            this.resize();
            this.refreshColors();
            var self = this;
            window.addEventListener('resize', function () {
                self.resize();
            });
        },
        resize: function () {
            var canvas = DOM.waveformCanvas;
            if (!canvas || !this.ctx) return;
            var rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        },
        refreshColors: function () {
            var styles = getComputedStyle(document.documentElement);
            this.colors = TRACKS.map(function (track) {
                return styles.getPropertyValue(track.color).trim();
            });
        },
        addRipple: function (trackIndex) {
            var canvas = DOM.waveformCanvas;
            if (!canvas) return;
            var rect = canvas.getBoundingClientRect();
            this.ripples.push({
                track: trackIndex,
                x: Math.random() * rect.width * 0.6 + rect.width * 0.2,
                y: rect.height / 2,
                amplitude: 40 + Math.random() * 30,
                phase: 0,
                life: 1.0,
                startTime: performance.now()
            });
        },
        update: function () {
            if (!this.ctx) return;
            var ctx = this.ctx;
            var canvas = DOM.waveformCanvas;
            var rect = canvas.getBoundingClientRect();
            var w = rect.width;
            var h = rect.height;
            ctx.clearRect(0, 0, w, h);

            var t = performance.now() * 0.001;

            // Draw baseline waveforms for each track
            var trackCount = TRACKS.length;
            for (var ti = 0; ti < trackCount; ti++) {
                var baseY = h * ((ti + 0.5) / trackCount);
                var color = this.colors[ti] || '#818cf8';
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.15;
                ctx.lineWidth = 1;
                for (var x = 0; x <= w; x += 2) {
                    var wave = Math.sin(x * 0.02 + t * 1.5 + ti) * 8 +
                               Math.sin(x * 0.05 + t * 0.8 + ti * 2) * 4;
                    if (x === 0) ctx.moveTo(x, baseY + wave);
                    else ctx.lineTo(x, baseY + wave);
                }
                ctx.stroke();
            }

            // Draw and update ripples
            ctx.globalAlpha = 1;
            for (var i = this.ripples.length - 1; i >= 0; i--) {
                var r = this.ripples[i];
                var elapsed = (performance.now() - r.startTime) * 0.001;
                r.life = Math.max(0, 1 - elapsed / 2.5);
                if (r.life <= 0) {
                    this.ripples.splice(i, 1);
                    continue;
                }
                var rColor = this.colors[r.track] || '#818cf8';
                var baseY2 = h * ((r.track + 0.5) / trackCount);
                ctx.beginPath();
                ctx.strokeStyle = rColor;
                ctx.globalAlpha = r.life * 0.8;
                ctx.lineWidth = 2;
                var spread = elapsed * 200;
                for (var rx = -spread; rx <= spread; rx += 2) {
                    var envelope = Math.exp(-(rx * rx) / (spread * spread * 0.3 + 1));
                    var amp = r.amplitude * r.life * envelope;
                    var waveY = Math.sin(rx * 0.08 - elapsed * 8) * amp;
                    var drawX = r.x + rx;
                    if (drawX < 0 || drawX > w) continue;
                    if (rx === -spread) ctx.moveTo(drawX, baseY2 + waveY);
                    else ctx.lineTo(drawX, baseY2 + waveY);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    };

    // === Scroll Controller ===
    var ScrollController = {
        init: function () {
            var self = this;
            window.addEventListener('scroll', function () {
                self.onScroll();
            }, { passive: true });
        },
        onScroll: function () {
            var currentY = window.scrollY;
            var delta = currentY - State.lastScrollY;
            State.scrollSpeed = Math.abs(delta);
            State.lastScrollY = currentY;

            ProgressTracker.update();
            PlayheadController.update();
        },
        update: function () {
            // Smooth speed decay
            State.smoothSpeed = lerp(State.smoothSpeed, State.scrollSpeed, 0.1);
            State.scrollSpeed *= 0.92;

            // BPM mapping: scroll speed maps to 60-180 BPM
            var targetBpm = clamp(map(State.smoothSpeed, 0, 40, 60, 180), 60, 180);
            State.smoothBpm = lerp(State.smoothBpm, targetBpm, 0.08);
            State.bpm = Math.round(State.smoothBpm);

            // Tempo HUD
            var tempo = clamp(State.smoothSpeed / 40, 0, 1);
            if (DOM.tempoValue) DOM.tempoValue.textContent = tempo.toFixed(2);
            if (DOM.bpmValue) DOM.bpmValue.textContent = State.bpm;
            if (DOM.tempoNum) DOM.tempoNum.textContent = State.bpm;
        }
    };

    // === Cursor Manager ===
    var CursorManager = {
        init: function () {
            document.addEventListener('mousemove', function (e) {
                State.mouseX = e.clientX;
                State.mouseY = e.clientY;
            });
        },
        update: function () {
            State.smoothX = lerp(State.smoothX, State.mouseX, 0.08);
            State.smoothY = lerp(State.smoothY, State.mouseY, 0.08);

            if (DOM.cursorGlow) {
                DOM.cursorGlow.style.left = State.smoothX + 'px';
                DOM.cursorGlow.style.top = State.smoothY + 'px';
            }

            // Parallax for floating layers
            var cx = State.smoothX / window.innerWidth - 0.5;
            var cy = State.smoothY / window.innerHeight - 0.5;
            var layers = document.querySelectorAll('[data-depth]');
            layers.forEach(function (layer) {
                var depth = parseFloat(layer.getAttribute('data-depth')) || 0.2;
                var tx = cx * depth * 60;
                var ty = cy * depth * 60;
                layer.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
            });
        }
    };

    // === Particle Field ===
    var ParticleField = {
        ctx: null,
        particles: [],
        count: 60,
        init: function () {
            var canvas = DOM.particleCanvas;
            if (!canvas) return;
            this.ctx = canvas.getContext('2d');
            this.resize();
            this.create();
            var self = this;
            window.addEventListener('resize', function () {
                self.resize();
                self.create();
            });
        },
        resize: function () {
            var canvas = DOM.particleCanvas;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        },
        create: function () {
            this.particles = [];
            for (var i = 0; i < this.count; i++) {
                this.particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    size: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.5 + 0.1,
                    phase: Math.random() * Math.PI * 2
                });
            }
        },
        recolor: function () { /* particles read CSS var each frame */ },
        update: function () {
            if (!this.ctx) return;
            var ctx = this.ctx;
            var w = window.innerWidth;
            var h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);
            var color = getComputedStyle(document.documentElement).getPropertyValue('--particle-color').trim();
            var t = performance.now() * 0.001;
            var speedBoost = clamp(State.smoothSpeed / 40, 0, 1);

            for (var i = 0; i < this.particles.length; i++) {
                var p = this.particles[i];
                p.vx += Math.sin(t + p.phase) * 0.005;
                p.vy += Math.cos(t * 0.8 + p.phase) * 0.005;
                p.vx = clamp(p.vx, -0.8 - speedBoost, 0.8 + speedBoost);
                p.vy = clamp(p.vy, -0.8 - speedBoost, 0.8 + speedBoost);

                var dx = State.smoothX - p.x;
                var dy = State.smoothY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 0) {
                    var force = (1 - dist / 200) * 0.02;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                var twinkle = Math.sin(t * 2 + p.phase) * 0.3 + 0.7;
                var alpha = p.opacity * twinkle * (1 + speedBoost * 0.5);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (1 + speedBoost * 0.3), 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = clamp(alpha, 0, 1);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            for (var a = 0; a < this.particles.length; a++) {
                for (var b = a + 1; b < this.particles.length; b++) {
                    var pa = this.particles[a];
                    var pb = this.particles[b];
                    var ddx = pa.x - pb.x;
                    var ddy = pa.y - pb.y;
                    var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (dd < 120) {
                        ctx.beginPath();
                        ctx.moveTo(pa.x, pa.y);
                        ctx.lineTo(pb.x, pb.y);
                        ctx.strokeStyle = color;
                        ctx.globalAlpha = (1 - dd / 120) * 0.15;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }
    };

    // === Audio Toggle Manager ===
    var AudioToggle = {
        init: function () {
            var self = this;
            if (DOM.audioBtn) {
                DOM.audioBtn.addEventListener('click', function () {
                    self.enable();
                });
            }
            if (DOM.audioOnBtn) {
                DOM.audioOnBtn.addEventListener('click', function () {
                    self.disable();
                });
            }
        },
        enable: function () {
            AudioEngine.init();
            AudioEngine.resume();
            State.audioEnabled = true;
            if (DOM.audioBtn) DOM.audioBtn.classList.add('hidden');
            if (DOM.audioOnBtn) DOM.audioOnBtn.classList.remove('hidden');
        },
        disable: function () {
            State.audioEnabled = false;
            if (DOM.audioBtn) DOM.audioBtn.classList.remove('hidden');
            if (DOM.audioOnBtn) DOM.audioOnBtn.classList.add('hidden');
        }
    };

    // === Keyboard Navigation ===
    var KeyboardNav = {
        init: function () {
            document.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                    e.preventDefault();
                    var next = clamp(State.currentIndex + 1, 0, State.totalSections - 1);
                    DOM.scenes[next].scrollIntoView({ behavior: 'smooth' });
                } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                    e.preventDefault();
                    var prev = clamp(State.currentIndex - 1, 0, State.totalSections - 1);
                    DOM.scenes[prev].scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    };

    // === Main Animation Loop ===
    function animate() {
        CursorManager.update();
        ScrollController.update();
        ParticleField.update();
        WaveformRenderer.update();
        PlayheadController.update();
        State.rafId = requestAnimationFrame(animate);
    }

    // === Boot ===
    function init() {
        ThemeManager.init();
        SectionDots.init();
        SectionObserver.init();
        RevealManager.init();
        TiltManager.init();
        SequencerBuilder.init();
        WaveformRenderer.init();
        ScrollController.init();
        CursorManager.init();
        ParticleField.init();
        AudioToggle.init();
        KeyboardNav.init();

        ProgressTracker.update();
        PlayheadController.update();

        animate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
