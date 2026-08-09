/* ============================================================
 * PROCEDURAL AUDIO ORB — main.js
 * 程序化音频球体
 *
 * Core systems:
 *   1. AudioEngine   — Web Audio synth (dual osc + detune + filter + ADSR + reverb)
 *   2. OrbRenderer   — 3D-ish reactive sphere: vertices displaced by
 *                      simplex-noise field + live FFT energy
 *   3. ParticleField — orbiting sparkles whose motion responds to audio
 *   4. Keyboard      — playable piano UI + computer-keyboard mapping
 *   5. Arp / Drone   — generative sequencers
 *
 * Easing mirrors cubic-bezier(0.16, 1, 0.3, 1) via smoothstep.
 * Maintainer: EDEN
 * ============================================================ */
(function () {
    'use strict';

    /* ============================================================
       === CONSTANTS & HELPERS ===
       ============================================================ */
    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothstep = (t) => t * t * (3 - 2 * t); // ~ cubic-bezier(0.16,1,0.3,1)

    // Equal temperament frequency for a MIDI note
    const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const PALETTES = {
        nebula: { a: [179, 136, 255], b: [124, 77, 255], c: [24, 255, 255], d: [255, 64, 129], glow: '#b388ff' },
        ember:  { a: [255, 183, 77],  b: [255, 110, 64], c: [255, 82, 82],  d: [255, 171, 64], glow: '#ff6e40' },
        lagoon: { a: [77, 208, 225],  b: [38, 198, 218], c: [102, 187, 106], d: [128, 203, 196], glow: '#26c6da' },
        bloom:  { a: [244, 143, 177], b: [206, 147, 216], c: [255, 241, 118], d: [255, 138, 101], glow: '#f48fb1' }
    };

    // Computer-keyboard → semitone offset from the current octave root (white row + black row)
    const KEY_MAP = {
        'a': 0,  'w': 1,  's': 2,  'e': 3,  'd': 4,  'f': 5,
        't': 6,  'g': 7,  'y': 8,  'h': 9,  'u': 10, 'j': 11,
        'k': 12, 'o': 13, 'l': 14, 'p': 15, ';': 16
    };

    /* ============================================================
       === DOM REFERENCES ===
       ============================================================ */
    const DOM = {
        canvas:     document.getElementById('orb-canvas'),
        canvasWrap: document.getElementById('canvas-wrap'),
        orbHint:    document.getElementById('orb-hint'),
        spectrum:   document.getElementById('spectrum-strip'),

        statusPill: document.getElementById('status-pill'),
        statusText: document.getElementById('status-text'),
        noteReadout:document.getElementById('note-readout'),

        hudWave:   document.getElementById('hud-wave'),
        hudFps:    document.getElementById('hud-fps'),
        hudVoices: document.getElementById('hud-voices'),
        hudEnergy: document.getElementById('hud-energy'),

        // synth sliders
        sAttack:   document.getElementById('slider-attack'),
        sRelease:  document.getElementById('slider-release'),
        sCutoff:   document.getElementById('slider-cutoff'),
        sDetune:   document.getElementById('slider-detune'),
        sReverb:   document.getElementById('slider-reverb'),
        vAttack:   document.getElementById('val-attack'),
        vRelease:  document.getElementById('val-release'),
        vCutoff:   document.getElementById('val-cutoff'),
        vDetune:   document.getElementById('val-detune'),
        vReverb:   document.getElementById('val-reverb'),

        // orb sliders
        sDistort:  document.getElementById('slider-distort'),
        sSpeed:    document.getElementById('slider-speed'),
        sParts:    document.getElementById('slider-particles'),
        sTrail:    document.getElementById('slider-trail'),
        vDistort:  document.getElementById('val-distort'),
        vSpeed:    document.getElementById('val-speed'),
        vParts:    document.getElementById('val-particles'),
        vTrail:    document.getElementById('val-trail'),

        waveGroup: document.getElementById('wave-group'),
        paletteRow:document.getElementById('palette-row'),

        kbTrack:   document.getElementById('kb-track'),
        octReadout:document.getElementById('oct-readout'),
        btnOctDown:document.getElementById('btn-oct-down'),
        btnOctUp:  document.getElementById('btn-oct-up'),
        btnArp:    document.getElementById('btn-arpeggio'),
        btnDrone:  document.getElementById('btn-drone'),
        btnClear:  document.getElementById('btn-clear')
    };

    /* ============================================================
       === STATE ===
       ============================================================ */
    const state = {
        // audio
        ctx: null,
        master: null,
        analyser: null,
        reverb: null,
        reverbGain: null,
        dryGain: null,
        freqData: null,
        waveData: null,
        activeVoices: new Map(),   // midiNote -> voice
        wave: 'sine',
        octave: 0,                 // offset from base octave (base = MIDI 45 = A2)
        baseMidi: 45,
        attack: 0.04,
        release: 0.90,
        cutoff: 3200,
        detune: 12,
        reverbAmt: 0.45,
        droneNodes: null,
        arpTimer: null,
        arpStep: 0,
        arpPattern: [0, 4, 7, 12, 7, 4],

        // orb visuals
        palette: 'nebula',
        distort: 0.55,
        flowSpeed: 0.35,
        particleCount: 240,
        trail: 0.72,
        time: 0,
        energy: 0,
        bass: 0, mid: 0, high: 0,
        pulse: 0,                  // decaying spike when a note triggers

        // loop
        lastFrame: performance.now(),
        fpsAcc: 0, fpsFrames: 0, fps: 60,
        interacted: false
    };

    /* ============================================================
       === SIMPLEX NOISE (3D) — compact implementation
       ============================================================ */
    const Noise = (function () {
        // Perlin/Simplex-style gradient noise (3D). Deterministic seed.
        const perm = new Uint8Array(512);
        const grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        // shuffle (fixed seed for determinism)
        let seed = 1337;
        for (let i = 255; i > 0; i--) {
            seed = (seed * 16807) % 2147483647;
            const j = seed % (i + 1);
            const t = p[i]; p[i] = p[j]; p[j] = t;
        }
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
        const dot = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z;

        function noise3(x, y, z) {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            const Z = Math.floor(z) & 255;
            x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
            const u = fade(x), v = fade(y), w = fade(z);
            const A  = perm[X] + Y,   AA = perm[A] + Z,   AB = perm[A + 1] + Z;
            const B  = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;

            const g000 = grad3[perm[AA] % 12];
            const g100 = grad3[perm[BA] % 12];
            const g010 = grad3[perm[AB] % 12];
            const g110 = grad3[perm[BB] % 12];
            const g001 = grad3[perm[AA + 1] % 12];
            const g101 = grad3[perm[BA + 1] % 12];
            const g011 = grad3[perm[AB + 1] % 12];
            const g111 = grad3[perm[BB + 1] % 12];

            const x0 = lerp(dot(g000, x, y, z),     dot(g100, x - 1, y, z),     u);
            const x1 = lerp(dot(g010, x, y - 1, z), dot(g110, x - 1, y - 1, z), u);
            const x2 = lerp(dot(g001, x, y, z - 1), dot(g101, x - 1, y, z - 1), u);
            const x3 = lerp(dot(g011, x, y - 1, z - 1), dot(g111, x - 1, y - 1, z - 1), u);
            const y0 = lerp(x0, x1, v);
            const y1 = lerp(x2, x3, v);
            return lerp(y0, y1, w) * 0.5 + 0.5; // remap to 0..1
        }
        return { noise3 };
    })();

    /* ============================================================
       === AUDIO ENGINE ===
       ============================================================ */
    const Audio = {
        ensure() {
            if (state.ctx) return;
            const AC = window.AudioContext || window.webkitAudioContext;
            state.ctx = new AC();

            state.master = state.ctx.createGain();
            state.master.gain.value = 0.7;

            state.analyser = state.ctx.createAnalyser();
            state.analyser.fftSize = 1024;
            state.analyser.smoothingTimeConstant = 0.8;
            state.freqData = new Uint8Array(state.analyser.frequencyBinCount);
            state.waveData = new Uint8Array(state.analyser.frequencyBinCount);

            // Reverb (convolver with synthetic impulse)
            state.reverb = state.ctx.createConvolver();
            state.reverb.buffer = this.makeImpulse(2.8, 2.4);
            state.reverbGain = state.ctx.createGain();
            state.reverbGain.gain.value = state.reverbAmt;
            state.dryGain = state.ctx.createGain();
            state.dryGain.gain.value = 1.0;

            // Routing: voices → dryGain → master
            //                → reverb → reverbGain → master
            // master → analyser → destination
            state.dryGain.connect(state.master);
            state.reverb.connect(state.reverbGain);
            state.reverbGain.connect(state.master);
            state.master.connect(state.analyser);
            state.analyser.connect(state.ctx.destination);
        },

        // Synthetic stereo-ish impulse response for the convolver reverb
        makeImpulse(seconds, decay) {
            const ctx = state.ctx;
            const rate = ctx.sampleRate;
            const len = Math.max(1, Math.floor(rate * seconds));
            const buf = ctx.createBuffer(2, len, rate);
            for (let ch = 0; ch < 2; ch++) {
                const data = buf.getChannelData(ch);
                for (let i = 0; i < len; i++) {
                    const t = i / len;
                    // exponential decay with a touch of early diffusion
                    const env = Math.pow(1 - t, decay);
                    data[i] = (Math.random() * 2 - 1) * env;
                }
            }
            return buf;
        },

        noteOn(midi) {
            this.ensure();
            if (state.ctx.state === 'suspended') state.ctx.resume();
            if (state.activeVoices.has(midi)) return; // already sounding

            const ctx = state.ctx;
            const now = ctx.currentTime;
            const freq = midiToFreq(midi);

            // Two detuned oscillators + one sub-octave for richness
            const oscA = ctx.createOscillator();
            const oscB = ctx.createOscillator();
            const sub  = ctx.createOscillator();
            oscA.type = state.wave;
            oscB.type = state.wave;
            sub.type  = 'sine';
            oscA.frequency.value = freq;
            oscB.frequency.value = freq;
            sub.frequency.value = freq / 2;

            const ct = state.detune;
            oscA.detune.value = -ct;
            oscB.detune.value = +ct;

            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.value = state.cutoff;
            filt.Q.value = 1.1;

            const gain = ctx.createGain();
            const peak = 0.22;
            const a = Math.max(0.005, state.attack);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(peak, now + a);

            oscA.connect(filt);
            oscB.connect(filt);
            const subGain = ctx.createGain();
            subGain.gain.value = 0.4;
            sub.connect(subGain);
            subGain.connect(filt);
            filt.connect(gain);

            // send to both dry and reverb
            gain.connect(state.dryGain);
            gain.connect(state.reverb);

            oscA.start(now);
            oscB.start(now);
            sub.start(now);

            state.activeVoices.set(midi, { oscA, oscB, sub, gain, filt, midi });
            state.pulse = 1; // trigger visual pulse
            this.updateStatus();
            this.updateHudVoices();
        },

        noteOff(midi) {
            const v = state.activeVoices.get(midi);
            if (!v) return;
            const ctx = state.ctx;
            const now = ctx.currentTime;
            const r = Math.max(0.05, state.release);
            try {
                v.gain.gain.cancelScheduledValues(now);
                v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), now);
                v.gain.gain.exponentialRampToValueAtTime(0.0001, now + r);
                v.oscA.stop(now + r + 0.05);
                v.oscB.stop(now + r + 0.05);
                v.sub.stop(now + r + 0.05);
            } catch (e) { /* ignore */ }
            state.activeVoices.delete(midi);
            setTimeout(() => this.updateHudVoices(), 60);
        },

        allOff() {
            for (const m of Array.from(state.activeVoices.keys())) this.noteOff(m);
        },

        updateStatus() {
            const active = state.activeVoices.size > 0 || state.droneNodes || state.arpTimer;
            DOM.statusPill.classList.toggle('active', !!active);
            DOM.statusText.textContent = active ? 'SOUNDING' : 'IDLE';
        },

        updateHudVoices() {
            DOM.hudVoices.textContent = String(state.activeVoices.size);
            this.updateStatus();
        },

        setWave(w) { state.wave = w; },
        setReverb(amt) {
            state.reverbAmt = amt;
            if (state.reverbGain) state.reverbGain.gain.value = amt;
        },

        // Drone: a sustained root + fifth pad
        toggleDrone() {
            this.ensure();
            if (state.droneNodes) {
                const n = state.droneNodes;
                const now = state.ctx.currentTime;
                n.gain.gain.cancelScheduledValues(now);
                n.gain.gain.setTargetAtTime(0.0001, now, 0.4);
                setTimeout(() => { try { n.oscA.stop(); n.oscB.stop(); } catch (e) {} }, 1400);
                state.droneNodes = null;
                DOM.btnDrone.classList.remove('active');
            } else {
                const ctx = state.ctx;
                const root = state.baseMidi + state.octave * 12;
                const f1 = midiToFreq(root);
                const f2 = midiToFreq(root + 7);
                const oscA = ctx.createOscillator();
                const oscB = ctx.createOscillator();
                oscA.type = 'sawtooth'; oscB.type = 'sawtooth';
                oscA.frequency.value = f1; oscB.frequency.value = f2;
                oscA.detune.value = -8; oscB.detune.value = +8;
                const filt = ctx.createBiquadFilter();
                filt.type = 'lowpass'; filt.frequency.value = 700; filt.Q.value = 2;
                const gain = ctx.createGain();
                gain.gain.value = 0.0001;
                gain.gain.setTargetAtTime(0.10, ctx.currentTime, 0.8);
                oscA.connect(filt); oscB.connect(filt); filt.connect(gain);
                gain.connect(state.dryGain);
                gain.connect(state.reverb);
                oscA.start(); oscB.start();
                state.droneNodes = { oscA, oscB, gain };
                DOM.btnDrone.classList.add('active');
            }
            this.updateStatus();
        },

        // Arpeggiator: cycles a major-scale arpeggio on the current root
        toggleArp() {
            this.ensure();
            if (state.arpTimer) {
                clearInterval(state.arpTimer);
                state.arpTimer = null;
                DOM.btnArp.classList.remove('active');
                this.allOff();
            } else {
                const root = state.baseMidi + state.octave * 12;
                let step = 0;
                const tick = () => {
                    const semis = state.arpPattern[step % state.arpPattern.length];
                    const m = root + semis;
                    this.noteOn(m);
                    setTimeout(() => this.noteOff(m), 180);
                    step++;
                };
                tick();
                state.arpTimer = setInterval(tick, 240);
                DOM.btnArp.classList.add('active');
            }
            this.updateStatus();
        }
    };

    /* ============================================================
       === ORB RENDERER (Canvas 2D pseudo-3D sphere)
       Builds an icosphere-like point cloud by sampling fibonacci
       lattice on a unit sphere, displacing each vertex radially with
       simplex noise + audio energy, then projecting to 2D.
       ============================================================ */
    const Orb = {
        ctx: null,
        w: 0, h: 0, dpr: 1,
        verts: [],          // {x,y,z} unit-sphere vertices
        particles: [],      // orbiting sparks
        specBars: [],       // spectrum strip DOM nodes

        init() {
            this.ctx = DOM.canvas.getContext('2d');
            this.buildSphere(720);
            this.buildParticles(state.particleCount);
            this.buildSpectrum(64);
            this.resize();
        },

        buildSphere(n) {
            this.verts = [];
            const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
            for (let i = 0; i < n; i++) {
                const y = 1 - (i / (n - 1)) * 2;      // -1..1
                const r = Math.sqrt(1 - y * y);
                const theta = phi * i;
                this.verts.push({
                    x: Math.cos(theta) * r,
                    y: y,
                    z: Math.sin(theta) * r,
                    // persistent per-vertex phase for shimmer
                    ph: Math.random() * TAU,
                    sp: 0.6 + Math.random() * 0.8
                });
            }
        },

        buildParticles(n) {
            this.particles = [];
            for (let i = 0; i < n; i++) {
                this.particles.push({
                    a: Math.random() * TAU,           // azimuth
                    t: Math.random() * 2 - 1,         // latitude -1..1
                    r: 1.05 + Math.random() * 0.6,    // orbit radius multiplier
                    speed: 0.2 + Math.random() * 0.8,
                    size: 0.6 + Math.random() * 1.8,
                    hue: Math.random(),
                    life: Math.random()
                });
            }
        },

        buildSpectrum(n) {
            DOM.spectrum.innerHTML = '';
            this.specBars = [];
            for (let i = 0; i < n; i++) {
                const b = document.createElement('div');
                b.className = 'spec-bar';
                DOM.spectrum.appendChild(b);
                this.specBars.push(b);
            }
        },

        resize() {
            const rect = DOM.canvasWrap.getBoundingClientRect();
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.w = Math.max(2, Math.floor(rect.width));
            this.h = Math.max(2, Math.floor(rect.height));
            DOM.canvas.width = this.w * this.dpr;
            DOM.canvas.height = this.h * this.dpr;
            DOM.canvas.style.width = this.w + 'px';
            DOM.canvas.style.height = this.h + 'px';
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        },

        // Update analyser-driven bands & energy
        updateAudio() {
            if (!state.analyser) return;
            state.analyser.getByteFrequencyData(state.freqData);
            state.analyser.getByteTimeDomainData(state.waveData);

            const len = state.freqData.length;
            const bassEnd = Math.floor(len * 0.08);
            const midEnd  = Math.floor(len * 0.35);
            let bSum = 0, mSum = 0, hSum = 0;
            for (let i = 0; i < bassEnd; i++) bSum += state.freqData[i];
            for (let i = bassEnd; i < midEnd; i++) mSum += state.freqData[i];
            for (let i = midEnd; i < len; i++) hSum += state.freqData[i];

            const bass = bassEnd ? bSum / bassEnd / 255 : 0;
            const mid  = (midEnd - bassEnd) ? mSum / (midEnd - bassEnd) / 255 : 0;
            const high = (len - midEnd) ? hSum / (len - midEnd) / 255 : 0;

            // smooth bands
            state.bass = lerp(state.bass, bass, 0.25);
            state.mid  = lerp(state.mid,  mid,  0.25);
            state.high = lerp(state.high, high, 0.25);
            state.energy = lerp(state.energy, (bass + mid + high) / 3, 0.2);
        },

        // palette color at t∈[0,1] — interpolate across the 4 stop colors
        col(t, alpha) {
            const stops = [PALETTES[state.palette].a, PALETTES[state.palette].b,
                           PALETTES[state.palette].c, PALETTES[state.palette].d];
            const ci = t * (stops.length - 1);
            const lo = Math.floor(ci);
            const hi = Math.min(lo + 1, stops.length - 1);
            const f = ci - lo;
            const r = Math.round(lerp(stops[lo][0], stops[hi][0], f));
            const g = Math.round(lerp(stops[lo][1], stops[hi][1], f));
            const b = Math.round(lerp(stops[lo][2], stops[hi][2], f));
            return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        },

        render(dt) {
            const ctx = this.ctx;
            const w = this.w, h = this.h;
            const cx = w / 2;
            const cy = h / 2;
            const baseR = Math.min(w, h) * 0.28;

            // motion-trail fade (controlled by trail slider)
            const fadeAlpha = 1 - state.trail * 0.92;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(7,7,13,' + fadeAlpha.toFixed(3) + ')';
            ctx.fillRect(0, 0, w, h);

            // additive blending for the glowing orb
            ctx.globalCompositeOperation = 'lighter';

            // slow rotation of the whole sphere
            const rotY = state.time * 0.18 * state.flowSpeed * 2;
            const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
            // gentle wobble on X axis driven by bass
            const tiltX = Math.sin(state.time * 0.4) * 0.18 + state.bass * 0.4;
            const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);

            const dist = state.distort;
            const en = state.energy;
            const pulse = state.pulse;
            const t = state.time;

            // --- outer halo rings (bass-reactive) ---
            for (let ring = 0; ring < 3; ring++) {
                const rr = baseR * (1.25 + ring * 0.22 + state.bass * 0.35 + pulse * 0.15);
                const safeR = Math.max(1, rr);
                ctx.beginPath();
                ctx.arc(cx, cy, safeR, 0, TAU);
                ctx.strokeStyle = this.col(0.1 + ring * 0.18, 0.06 + state.bass * 0.06);
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // --- vertex cloud: displaced & projected ---
            const pts = [];
            for (let i = 0; i < this.verts.length; i++) {
                const v = this.verts[i];
                // simplex noise displacement along the normal (radial)
                const n = Noise.noise3(
                    v.x * 1.6 + t * 0.3 * v.sp,
                    v.y * 1.6 + t * 0.25,
                    v.z * 1.6 + t * 0.2
                );
                // second octave for finer detail
                const n2 = Noise.noise3(v.x * 4 - t * 0.4, v.y * 4, v.z * 4 + t * 0.3) * 0.4;
                const disp = (n + n2 - 0.5) * dist * (0.7 + en * 1.6) + pulse * 0.18 * Math.sin(v.ph + t * 4);

                let x = v.x * (1 + disp);
                let y = v.y * (1 + disp);
                let z = v.z * (1 + disp);

                // rotate Y
                let x1 = x * cosY + z * sinY;
                let z1 = -x * sinY + z * cosY;
                // rotate X
                let y1 = y * cosX - z1 * sinX;
                let z2 = y * sinX + z1 * cosX;

                // perspective project
                const persp = 2.6 / (2.6 + z2);
                const sx = cx + x1 * baseR * persp;
                const sy = cy + y1 * baseR * persp;
                pts.push({ x: sx, y: sy, z: z2, persp, disp });
            }

            // sort back-to-front so closer points draw on top
            pts.sort((a, b) => a.z - b.z);

            // draw connections between nearby front-facing points (mesh wireframe feel)
            ctx.lineWidth = 0.6;
            const connAlpha = 0.05 + en * 0.10;
            // sample a subset to keep perf reasonable
            const step = 4;
            for (let i = 0; i < pts.length; i += step) {
                const p0 = pts[i];
                for (let j = i + step; j < Math.min(pts.length, i + step * 6); j += step) {
                    const p1 = pts[j];
                    const dx = p0.x - p1.x, dy = p0.y - p1.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 1800) {
                        const a = connAlpha * (1 - d2 / 1800) * ((p0.persp + p1.persp) * 0.5);
                        ctx.strokeStyle = this.col(0.3, a);
                        ctx.beginPath();
                        ctx.moveTo(p0.x, p0.y);
                        ctx.lineTo(p1.x, p1.y);
                        ctx.stroke();
                    }
                }
            }

            // draw points (size & color by depth + displacement + energy)
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                const depth = (p.z + 1) * 0.5; // 0 back .. 1 front
                const sizeBase = (0.6 + depth * 2.4) * (1 + Math.abs(p.disp) * 2.2);
                const sz = Math.max(0.3, sizeBase * (0.7 + en * 1.2));
                const colT = clamp(depth * 0.7 + Math.abs(p.disp) * 0.6, 0, 1);
                const alpha = (0.18 + depth * 0.55) * (0.6 + en * 0.8);

                // core dot
                ctx.fillStyle = this.col(colT, alpha);
                ctx.beginPath();
                ctx.arc(p.x, p.y, sz, 0, TAU);
                ctx.fill();

                // bright halo for high-energy front points
                if (depth > 0.6 && (en > 0.15 || pulse > 0.1)) {
                    ctx.fillStyle = this.col(colT, alpha * 0.25);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, sz * 2.6, 0, TAU);
                    ctx.fill();
                }
            }

            // --- waveform ring overlaid on the orb (mid/treble reactive) ---
            if (state.waveData && state.analyser) {
                ctx.lineWidth = 1.4;
                ctx.strokeStyle = this.col(0.85, 0.35 + state.mid * 0.3);
                ctx.beginPath();
                const waveR = baseR * 1.02;
                const N = 128;
                for (let i = 0; i <= N; i++) {
                    const ang = (i / N) * TAU - Math.PI / 2;
                    const wi = Math.floor((i / N) * state.waveData.length);
                    const v = (state.waveData[wi] - 128) / 128;
                    const rr = waveR + v * baseR * 0.18 * (0.5 + en);
                    const sx = cx + Math.cos(ang) * rr;
                    const sy = cy + Math.sin(ang) * rr;
                    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }

            // --- orbiting particles ---
            const pN = this.particles.length;
            for (let i = 0; i < pN; i++) {
                const pr = this.particles[i];
                pr.a += dt * pr.speed * (0.3 + en * 1.4);
                // drift latitude gently
                pr.t += Math.sin(t * 0.5 + i) * 0.002;

                const r = pr.r * (1 + en * 0.3);
                const x = Math.cos(pr.a) * Math.sqrt(1 - pr.t * pr.t) * r;
                const y = pr.t * r;
                const z = Math.sin(pr.a) * Math.sqrt(1 - pr.t * pr.t) * r;

                // rotate with the sphere so they feel attached
                const x1 = x * cosY + z * sinY;
                const z1 = -x * sinY + z * cosY;
                const y1 = y * cosX - z1 * sinX;
                const z2 = y * sinX + z1 * cosX;

                const persp = 2.6 / (2.6 + z2);
                const sx = cx + x1 * baseR * persp;
                const sy = cy + y1 * baseR * persp;
                const depth = (z2 + 1) * 0.5;
                const sz = Math.max(0.2, pr.size * persp * (0.7 + en * 1.6));
                const a = (0.25 + depth * 0.55) * (0.5 + pr.life * 0.5);
                ctx.fillStyle = this.col(pr.hue, a);
                ctx.beginPath();
                ctx.arc(sx, sy, sz, 0, TAU);
                ctx.fill();
            }

            ctx.globalCompositeOperation = 'source-over';

            // decay pulse
            state.pulse *= Math.pow(0.001, dt);

            // update DOM spectrum strip
            this.updateSpectrumStrip();
        },

        updateSpectrumStrip() {
            if (!state.freqData) return;
            const bars = this.specBars;
            const N = bars.length;
            const bin = state.freqData.length;
            for (let i = 0; i < N; i++) {
                const idx = Math.floor(Math.pow(i / N, 1.4) * bin * 0.7);
                const v = state.freqData[idx] / 255;
                bars[i].style.transform = 'scaleY(' + (0.15 + v * 0.95).toFixed(3) + ')';
                bars[i].style.opacity = (0.4 + v * 0.6).toFixed(2);
            }
        }
    };

    /* ============================================================
       === KEYBOARD UI ===
       ============================================================ */
    const Keyboard = {
        // We render 2 octaves of keys. White keys are flex items; black keys
        // absolutely positioned over the gaps.
        whitePattern: [0, 2, 4, 5, 7, 9, 11],     // semitone offsets for white keys
        blackPattern: [1, 3, 6, 8, 10],           // semitone offsets for black keys
        // positions of black keys within an octave (as fraction of octave width, measured from left of the black key)
        blackPos: { 1: 0.65, 3: 1.75, 6: 3.65, 8: 4.75, 10: 5.85 },
        keyEls: new Map(),  // midi -> element
        octaves: 2,

        build() {
            DOM.kbTrack.innerHTML = '';
            this.keyEls.clear();
            const octs = this.octaves;
            const root = state.baseMidi + state.octave * 12;

            // create white keys first
            for (let o = 0; o < octs; o++) {
                for (let wi = 0; wi < 7; wi++) {
                    const semis = this.whitePattern[wi];
                    const midi = root + o * 12 + semis;
                    const el = document.createElement('button');
                    el.className = 'key key-white';
                    el.dataset.midi = midi;
                    el.setAttribute('aria-label', this.noteLabel(midi));
                    el.innerHTML = '<span>' + this.shortLabel(midi) + '</span>';
                    this.bindKey(el, midi);
                    DOM.kbTrack.appendChild(el);
                    this.keyEls.set(midi, el);
                }
            }

            // black keys absolutely positioned
            const totalWhite = octs * 7;
            for (let o = 0; o < octs; o++) {
                for (let bi = 0; bi < 5; bi++) {
                    const semis = this.blackPattern[bi];
                    const midi = root + o * 12 + semis;
                    const el = document.createElement('button');
                    el.className = 'key key-black';
                    el.dataset.midi = midi;
                    el.setAttribute('aria-label', this.noteLabel(midi));
                    // position: offset based on preceding white key index
                    const whiteIndexBefore = o * 7 + (bi <= 1 ? bi + 1 : bi + 2) - 1;
                    const leftPct = ((whiteIndexBefore + 1) / totalWhite) * 100;
                    // each white = 100/totalWhite %; black key is ~ width of one white centered at boundary
                    const wPct = 100 / totalWhite;
                    el.style.left = 'calc(' + leftPct + '% - ' + (wPct * 0.3) + '%)';
                    el.style.width = (wPct * 0.6) + '%';
                    el.innerHTML = '<span>' + this.shortLabel(midi) + '</span>';
                    this.bindKey(el, midi);
                    DOM.kbTrack.appendChild(el);
                    this.keyEls.set(midi, el);
                }
            }
            this.updateRootLabel();
        },

        bindKey(el, midi) {
            let pressed = false;
            const down = (e) => {
                e.preventDefault();
                if (pressed) return;
                pressed = true;
                el.classList.add('active');
                Audio.noteOn(midi);
                markInteracted();
            };
            const up = () => {
                if (!pressed) return;
                pressed = false;
                el.classList.remove('active');
                Audio.noteOff(midi);
            };
            el.addEventListener('mousedown', down);
            el.addEventListener('mouseup', up);
            el.addEventListener('mouseleave', up);
            el.addEventListener('touchstart', down, { passive: false });
            el.addEventListener('touchend', up);
            el.addEventListener('touchcancel', up);
        },

        rebuildForOctave() {
            // tear down active notes for safety then rebuild
            Audio.allOff();
            this.build();
        },

        noteLabel(midi) {
            const name = NOTE_NAMES[((midi % 12) + 12) % 12];
            const oct = Math.floor(midi / 12) - 1;
            return name + oct;
        },
        shortLabel(midi) {
            const name = NOTE_NAMES[((midi % 12) + 12) % 12];
            return name.replace('#', '♯');
        },

        highlight(midi, on) {
            const el = this.keyEls.get(midi);
            if (el) el.classList.toggle('active', on);
        },

        updateRootLabel() {
            const root = state.baseMidi + state.octave * 12;
            DOM.octReadout.textContent = 'OCT ' + (state.octave >= 0 ? '+' : '') + state.octave;
            DOM.noteReadout.textContent = this.noteLabel(root);
        }
    };

    /* ============================================================
       === COMPUTER KEYBOARD INPUT ===
       ============================================================ */
    const ComputerKeyboard = {
        downKeys: new Set(),
        bind() {
            window.addEventListener('keydown', (e) => {
                if (e.metaKey || e.ctrlKey || e.altKey) return;
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
                const k = e.key.toLowerCase();
                if (k in KEY_MAP) {
                    e.preventDefault();
                    if (this.downKeys.has(k)) return;
                    this.downKeys.add(k);
                    const midi = state.baseMidi + state.octave * 12 + KEY_MAP[k];
                    Audio.noteOn(midi);
                    Keyboard.highlight(midi, true);
                    markInteracted();
                } else if (k === 'z') {
                    changeOctave(-1);
                } else if (k === 'x') {
                    changeOctave(1);
                } else if (k === ' ') {
                    e.preventDefault();
                    Audio.toggleDrone();
                    markInteracted();
                }
            });
            window.addEventListener('keyup', (e) => {
                const k = e.key.toLowerCase();
                if (k in KEY_MAP && this.downKeys.has(k)) {
                    this.downKeys.delete(k);
                    const midi = state.baseMidi + state.octave * 12 + KEY_MAP[k];
                    Audio.noteOff(midi);
                    Keyboard.highlight(midi, false);
                }
            });
        }
    };

    /* ============================================================
       === INTERACTION / UI BINDINGS ===
       ============================================================ */
    function markInteracted() {
        if (state.interacted) return;
        state.interacted = true;
        DOM.orbHint.classList.add('hidden');
        DOM.spectrum.classList.add('active');
        Audio.updateStatus();
    }

    function changeOctave(delta) {
        const next = clamp(state.octave + delta, -2, 3);
        if (next === state.octave) return;
        state.octave = next;
        Keyboard.rebuildForOctave();
    }

    function bindSlider(slider, valEl, fmt, onChange) {
        const apply = () => {
            const v = parseFloat(slider.value);
            onChange(v);
            valEl.textContent = fmt(v);
        };
        slider.addEventListener('input', apply);
        apply();
    }

    function bindUI() {
        // Synth params
        bindSlider(DOM.sAttack, DOM.vAttack,
            (v) => (v / 1000).toFixed(2),
            (v) => { state.attack = v / 1000; });
        bindSlider(DOM.sRelease, DOM.vRelease,
            (v) => (v / 1000).toFixed(2),
            (v) => { state.release = v / 1000; });
        bindSlider(DOM.sCutoff, DOM.vCutoff,
            (v) => Math.round(v).toString(),
            (v) => { state.cutoff = v; });
        bindSlider(DOM.sDetune, DOM.vDetune,
            (v) => Math.round(v).toString(),
            (v) => { state.detune = v; });
        bindSlider(DOM.sReverb, DOM.vReverb,
            (v) => Math.round(v).toString(),
            (v) => { Audio.setReverb(v / 100); });

        // Orb params
        bindSlider(DOM.sDistort, DOM.vDistort,
            (v) => (v / 100).toFixed(2),
            (v) => { state.distort = v / 100; });
        bindSlider(DOM.sSpeed, DOM.vSpeed,
            (v) => (v / 100).toFixed(2),
            (v) => { state.flowSpeed = v / 100; });
        bindSlider(DOM.sParts, DOM.vParts,
            (v) => Math.round(v * 4).toString(),
            (v) => {
                const n = Math.round(v * 4);
                state.particleCount = n;
                Orb.buildParticles(n);
            });
        bindSlider(DOM.sTrail, DOM.vTrail,
            (v) => Math.round(v).toString(),
            (v) => { state.trail = v / 100; });

        // Wave selector
        DOM.waveGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('.wave-btn');
            if (!btn) return;
            DOM.waveGroup.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const w = btn.dataset.wave;
            Audio.setWave(w);
            DOM.hudWave.textContent = w.toUpperCase();
        });

        // Palette selector
        DOM.paletteRow.addEventListener('click', (e) => {
            const btn = e.target.closest('.palette-btn');
            if (!btn) return;
            DOM.paletteRow.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const p = btn.dataset.palette;
            state.palette = p;
            document.body.setAttribute('data-palette', p);
        });

        // Octave controls
        DOM.btnOctDown.addEventListener('click', () => changeOctave(-1));
        DOM.btnOctUp.addEventListener('click', () => changeOctave(1));

        // Generative
        DOM.btnArp.addEventListener('click', () => { Audio.toggleArp(); markInteracted(); });
        DOM.btnDrone.addEventListener('click', () => { Audio.toggleDrone(); markInteracted(); });

        // Clear
        DOM.btnClear.addEventListener('click', () => {
            if (state.arpTimer) Audio.toggleArp();
            if (state.droneNodes) Audio.toggleDrone();
            Audio.allOff();
            // also clear any stuck highlights
            Keyboard.keyEls.forEach(el => el.classList.remove('active'));
        });

        // Mouse force on canvas — nudges orb via a transient pulse + energy boost
        DOM.canvasWrap.addEventListener('pointermove', (e) => {
            const rect = DOM.canvasWrap.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            // gentle steering of rotation speed by cursor x
            state.flowSpeed = clamp(state.flowSpeed + (nx - 0.5) * 0.001, 0, 1);
        });
        DOM.canvasWrap.addEventListener('pointerdown', () => {
            state.pulse = Math.max(state.pulse, 0.6);
        });

        window.addEventListener('resize', () => Orb.resize());
    }

    /* ============================================================
       === MAIN LOOP ===
       ============================================================ */
    function loop(now) {
        const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
        state.lastFrame = now;
        state.time += dt * (0.5 + state.flowSpeed * 1.5);

        Orb.updateAudio();
        Orb.render(dt);

        // FPS
        state.fpsFrames++;
        state.fpsAcc += dt;
        if (state.fpsAcc >= 0.5) {
            state.fps = Math.round(state.fpsFrames / state.fpsAcc);
            DOM.hudFps.textContent = state.fps;
            state.fpsFrames = 0;
            state.fpsAcc = 0;
        }

        // HUD energy
        DOM.hudEnergy.textContent = state.energy.toFixed(2);
        DOM.hudEnergy.classList.toggle('peak', state.energy > 0.35);

        requestAnimationFrame(loop);
    }

    /* ============================================================
       === BOOT ===
       ============================================================ */
    function boot() {
        document.body.setAttribute('data-palette', state.palette);
        Orb.init();
        Keyboard.build();
        ComputerKeyboard.bind();
        bindUI();
        state.lastFrame = performance.now();
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
