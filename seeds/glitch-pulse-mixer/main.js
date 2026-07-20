/* ============================================================
 * GLITCH PULSE MIXER — main.js
 * 故障脉冲视觉合成器
 *
 * Core systems:
 *   1. GlitchCanvas   — composition render (CA / scanlines / datamosh)
 *   2. PulseNode      — draggable node, contributes local glitch field
 *   3. Heartbeat      — BPM-driven sine + noise floor, syncs visuals
 *   4. WaveformSpots  — clickable hotspots that rupture the composition
 *   5. AudioEngine    — optional Web Audio beat (oscillator + noise)
 *
 * Easing: cubic-bezier(0.16, 1, 0.3, 1) — mirrored in JS via smoothstep.
 * Maintainer: EDEN
 * ============================================================ */
(function () {
    'use strict';

    /* ============================================================
       === CONSTANTS & HELPERS ===
       ============================================================ */
    const EASE = (t) => t * t * (3 - 2 * t); // smoothstep ~ cubic-bezier(0.16,1,0.3,1) feel
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const TAU = Math.PI * 2;
    const rand = (a, b) => a + Math.random() * (b - a);

    const PALETTES = {
        neon:  { a: '#ff2d75', b: '#00f0ff', c: '#ffe14d', d: '#a855f7', bg: '#07070d' },
        acid:  { a: '#ff00aa', b: '#aaff00', c: '#00ffaa', d: '#ffff66', bg: '#0a0d05' },
        ember: { a: '#ff5e1a', b: '#ffcc00', c: '#ff1a4a', d: '#ffae42', bg: '#0d0603' },
        void:  { a: '#7a4dff', b: '#00d4ff', c: '#f0f0ff', d: '#b388ff', bg: '#04040c' }
    };

    const COMPOSITION_NAMES = ['SIGNAL/DRIFT', 'NOISE/BLOOM', 'PULSE/DECAY', 'STATIC/GHOST', 'RUPTURE/ECHO'];

    /* ============================================================
       === DOM REFERENCES ===
       ============================================================ */
    const DOM = {
        canvas:        document.getElementById('glitch-canvas'),
        canvasWrap:    document.getElementById('canvas-wrap'),
        waveformLayer: document.getElementById('waveform-layer'),
        ruptureFlash:  document.getElementById('rupture-flash'),
        canvasHint:    document.getElementById('canvas-hint'),

        bpmReadout:    document.getElementById('bpm-readout'),
        fpsReadout:    document.getElementById('fps-readout'),
        ruptureCount:  document.getElementById('rupture-count'),
        nodeCount:     document.getElementById('node-count'),
        compositionName: document.getElementById('composition-name'),
        activeNodeTag: document.getElementById('active-node-tag'),

        nodeGrid:      document.getElementById('node-grid'),

        // Inspector sliders
        sliderChroma:  document.getElementById('slider-chroma'),
        sliderScan:    document.getElementById('slider-scan'),
        sliderMosh:    document.getElementById('slider-mosh'),
        sliderRadius:  document.getElementById('slider-radius'),
        valChroma:     document.getElementById('val-chroma'),
        valScan:       document.getElementById('val-scan'),
        valMosh:       document.getElementById('val-mosh'),
        valRadius:     document.getElementById('val-radius'),

        // Console sliders
        sliderFreq:    document.getElementById('slider-freq'),
        sliderAmp:     document.getElementById('slider-amp'),
        sliderNoise:   document.getElementById('slider-noise'),
        valFreq:       document.getElementById('val-freq'),
        valAmp:        document.getElementById('val-amp'),
        valNoise:      document.getElementById('val-noise'),

        paletteRow:    document.getElementById('palette-row'),

        btnReset:      document.getElementById('btn-reset'),
        btnRandomize:  document.getElementById('btn-randomize'),
        btnRupture:    document.getElementById('btn-rupture'),
        btnAudio:      document.getElementById('btn-audio')
    };

    /* ============================================================
       === STATE ===
       ============================================================ */
    const state = {
        nodes: [],
        activeNodeId: 0,
        palette: 'neon',
        bpm: 96,
        amplitude: 60,
        noiseFloor: 25,
        beat: 0,            // 0..1 phase from heartbeat
        beatPulse: 0,       // decaying spike on each beat
        ruptures: 0,
        glitchSurge: 0,     // decaying global glitch intensity after rupture
        time: 0,
        lastFrame: performance.now(),
        fpsAcc: 0,
        fpsFrames: 0,
        fps: 60,
        audioEnabled: false,
        hintHidden: false
    };

    /* ============================================================
       === PULSE NODE MODEL
       ============================================================ */
    const NODE_DEFS = [
        { id: 0, name: 'NODE_A', colorKey: 'a', x: 0.30, y: 0.45 },
        { id: 1, name: 'NODE_B', colorKey: 'b', x: 0.62, y: 0.38 },
        { id: 2, name: 'NODE_C', colorKey: 'c', x: 0.50, y: 0.68 }
    ];

    function createNodes() {
        state.nodes = NODE_DEFS.map(def => ({
            ...def,
            // physics-ish smoothing for drag inertia
            vx: 0, vy: 0,
            tx: def.x, ty: def.y,    // target (normalized)
            x: def.x, y: def.y,      // current (normalized)
            radius: 0.5,             // 0..1 mapped from slider
            chroma: 40,
            scan: 55,
            mosh: 30,
            dragging: false
        }));
    }

    /* ============================================================
       === GLITCH CANVAS RENDERER
       ============================================================ */
    const Renderer = {
        ctx: null,
        w: 0, h: 0, dpr: 1,
        // offscreen buffers
        bufA: null, bufB: null, bufCtxA: null, bufCtxB: null,

        init() {
            this.ctx = DOM.canvas.getContext('2d', { alpha: false });
            this.bufA = document.createElement('canvas');
            this.bufB = document.createElement('canvas');
            this.bufCtxA = this.bufA.getContext('2d');
            this.bufCtxB = this.bufB.getContext('2d');
            this.resize();
        },

        resize() {
            const rect = DOM.canvasWrap.getBoundingClientRect();
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.w = Math.max(2, Math.floor(rect.width));
            this.h = Math.max(2, Math.floor(rect.height));
            for (const c of [DOM.canvas, this.bufA, this.bufB]) {
                c.width = this.w * this.dpr;
                c.height = this.h * this.dpr;
            }
            DOM.canvas.style.width = this.w + 'px';
            DOM.canvas.style.height = this.h + 'px';
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.bufCtxA.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.bufCtxB.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        },

        // draw a field of vertical-ish bars + base gradient into bufA
        drawBaseField(t) {
            const ctx = this.bufCtxA;
            const w = this.w, h = this.h;
            const pal = PALETTES[state.palette];

            // base wash
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, pal.bg);
            g.addColorStop(0.5, '#0e0e1c');
            g.addColorStop(1, pal.bg);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

            // horizon glow band that pulses with beat
            const bandY = h * 0.55;
            const bandH = 80 + state.beatPulse * 120;
            const bandG = ctx.createRadialGradient(w / 2, bandY, 0, w / 2, bandY, Math.max(w, h) * 0.55);
            bandG.addColorStop(0, hexA(pal.b, 0.18 + state.beatPulse * 0.25));
            bandG.addColorStop(0.4, hexA(pal.a, 0.06));
            bandG.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bandG;
            ctx.fillRect(0, 0, w, h);

            // signal bars (audio-reactive look-alike)
            const barCount = 64;
            const bw = w / barCount;
            for (let i = 0; i < barCount; i++) {
                const phase = i / barCount * TAU + t * 0.6;
                const beatGain = 0.5 + 0.5 * Math.sin(phase * 2 + state.beat * TAU * 2);
                const amp = (state.amplitude / 100) * (0.4 + 0.6 * beatGain);
                const noise = (Math.random() - 0.5) * (state.noiseFloor / 100);
                const bh = amp * h * 0.42 * (0.6 + Math.abs(Math.sin(i * 0.7 + t)) * 0.7) + noise * h * 0.2;
                const bx = i * bw;
                const color = i % 3 === 0 ? pal.a : (i % 3 === 1 ? pal.b : pal.c);
                ctx.fillStyle = hexA(color, 0.22 + amp * 0.4);
                ctx.fillRect(bx + bw * 0.18, bandY - bh, bw * 0.64, bh * 2);
            }

            // big ghost word for "signal" theme — gets datamoshed later
            ctx.save();
            ctx.font = `800 ${Math.min(w, h) * 0.18}px Outfit, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = hexA(pal.d, 0.10);
            ctx.fillText('SIGNAL', w / 2, h * 0.34);
            ctx.restore();
        },

        // apply chromatic aberration by sampling bufA into bufB with RGB-shift around node centers
        applyChromaticAberration() {
            const src = this.bufA, dst = this.bufB, ctx = this.bufCtxB;
            const w = this.w, h = this.h;
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, w, h);

            // base copy
            ctx.drawImage(src, 0, 0, w, h);

            // per-node additive channel shifts
            ctx.globalCompositeOperation = 'lighter';
            const pal = PALETTES[state.palette];

            for (const n of state.nodes) {
                const cx = n.x * w;
                const cy = n.y * h;
                const r = (n.radius * 0.5 + 0.1) * Math.min(w, h) * 0.9;
                const intensity = n.chroma / 100;

                // build a local mask via clip
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, TAU);
                ctx.clip();

                const shift = intensity * 14 * (0.6 + state.beatPulse * 0.8);
                // magenta shift left
                ctx.globalAlpha = 0.5 * intensity;
                ctx.drawImage(src, -shift, 0, w, h);
                ctx.drawImage(src, -shift, -shift * 0.3, w, h);
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, TAU);
                ctx.clip();
                // cyan shift right
                ctx.globalAlpha = 0.5 * intensity;
                ctx.drawImage(src, shift, 0, w, h);
                ctx.drawImage(src, shift, shift * 0.3, w, h);
                ctx.restore();

                ctx.globalAlpha = 1;
            }
            ctx.globalCompositeOperation = 'source-over';
        },

        // apply scanlines + datamosh slice displacement
        applyScanlinesAndMosh(t) {
            const src = this.bufB, ctx = this.ctx;
            const w = this.w, h = this.h;
            const pal = PALETTES[state.palette];

            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(src, 0, 0, w, h);

            // --- datamosh: horizontal slice jitter ---
            const moshGlobal = state.nodes.reduce((acc, n) => acc + n.mosh / 100, 0) / state.nodes.length;
            const surge = state.glitchSurge;
            const sliceCount = 18;
            const sliceH = h / sliceCount;
            for (let i = 0; i < sliceCount; i++) {
                // proximity-weighted mosh from nodes
                const cy = (i + 0.5) * sliceH;
                let localMosh = 0;
                for (const n of state.nodes) {
                    const dy = Math.abs(cy - n.y * h);
                    const weight = 1 / (1 + dy / (h * 0.25));
                    localMosh += weight * (n.mosh / 100);
                }
                localMosh = clamp(localMosh * 0.5 + moshGlobal * 0.5 + surge * 0.6, 0, 1);

                if (localMosh < 0.05) continue;
                const jitter = (Math.sin(i * 12.9898 + t * 6) * 43758.5453) % 1;
                const dx = (jitter - 0.5) * w * 0.35 * localMosh * (0.5 + state.beatPulse);
                const skip = Math.random() < 0.04 + surge * 0.3; // occasional slice drop
                if (skip) continue;
                // pull a slice from src and displace
                ctx.drawImage(src, 0, i * sliceH * this.dpr, w * this.dpr, sliceH * this.dpr,
                                 dx, i * sliceH, w, sliceH);
            }

            // --- scanlines overlay ---
            const scanGlobal = state.nodes.reduce((acc, n) => acc + n.scan / 100, 0) / state.nodes.length;
            if (scanGlobal > 0.02) {
                ctx.save();
                ctx.globalAlpha = 0.10 + scanGlobal * 0.35;
                const step = 2 + Math.floor((1 - scanGlobal) * 3);
                ctx.fillStyle = '#000';
                for (let y = 0; y < h; y += step * 2) {
                    ctx.fillRect(0, y, w, step);
                }
                ctx.restore();
            }

            // --- node auras ---
            for (const n of state.nodes) {
                const cx = n.x * w;
                const cy = n.y * h;
                const r = (n.radius * 0.5 + 0.1) * Math.min(w, h) * 0.9;
                const color = pal[n.colorKey];
                const auraR = r * (0.9 + state.beatPulse * 0.4);

                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
                g.addColorStop(0, hexA(color, 0.0));
                g.addColorStop(0.7, hexA(color, 0.05));
                g.addColorStop(1, hexA(color, 0.0));
                ctx.fillStyle = g;
                ctx.fillRect(cx - auraR, cy - auraR, auraR * 2, auraR * 2);

                // ring
                ctx.save();
                ctx.strokeStyle = hexA(color, 0.55);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, 26 + state.beatPulse * 10, 0, TAU);
                ctx.stroke();
                // node dot
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.arc(cx, cy, 6 + state.beatPulse * 3, 0, TAU);
                ctx.fill();
                ctx.restore();

                // label
                ctx.save();
                ctx.font = '10px "Share Tech Mono", monospace';
                ctx.fillStyle = hexA(color, 0.8);
                ctx.textAlign = 'left';
                ctx.fillText(n.name, cx + 12, cy - 12);
                ctx.restore();
            }

            // --- global grain on surge ---
            if (surge > 0.02) {
                ctx.save();
                ctx.globalAlpha = surge * 0.5;
                ctx.globalCompositeOperation = 'overlay';
                const grainCount = Math.floor(surge * 400);
                for (let i = 0; i < grainCount; i++) {
                    const gx = Math.random() * w;
                    const gy = Math.random() * h;
                    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                    ctx.fillRect(gx, gy, 1, 1);
                }
                ctx.restore();
            }
        },

        render(t) {
            this.drawBaseField(t);
            this.applyChromaticAberration();
            this.applyScanlinesAndMosh(t);
        }
    };

    /* ============================================================
       === UTIL: hex with alpha
       ============================================================ */
    function hexA(hex, a) {
        // accept #rrggbb
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${a})`;
    }

    /* ============================================================
       === HEARTBEAT (BPM-driven modulator)
       ============================================================ */
    const Heartbeat = {
        lastBeatTime: 0,
        update(now, dt) {
            const period = 60000 / state.bpm; // ms per beat
            const phase = ((now - this.lastBeatTime) % period) / period;
            const justBeat = phase < (dt / period);
            state.beat = phase;
            // smooth pulse decay
            state.beatPulse *= Math.pow(0.001, dt / 1000); // exponential decay
            if (justBeat) {
                state.beatPulse = Math.min(1, state.beatPulse + 0.9);
                if (state.audioEnabled) AudioEngine.tick();
            }
        }
    };

    /* ============================================================
       === AUDIO ENGINE (Web Audio beat)
       ============================================================ */
    const AudioEngine = {
        ctx: null,
        master: null,
        ensure() {
            if (this.ctx) return;
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AC();
                this.master = this.ctx.createGain();
                this.master.gain.value = 0.12;
                this.master.connect(this.ctx.destination);
            } catch (e) {
                console.warn('Audio init failed', e);
            }
        },
        tick() {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            // kick
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
            gain.gain.setValueAtTime(0.9, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain).connect(this.master);
            osc.start(now);
            osc.stop(now + 0.24);
        },
        resume() {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        }
    };

    /* ============================================================
       === NODE PHYSICS (drag + spring back)
       ============================================================ */
    function updateNodes(dt) {
        for (const n of state.nodes) {
            if (!n.dragging) {
                // gentle drift toward target (which equals current pos unless perturbed)
                n.x += (n.tx - n.x) * Math.min(1, dt / 220);
                n.y += (n.ty - n.y) * Math.min(1, dt / 220);
            }
        }
    }

    /* ============================================================
       === NODE CHIPS UI
       ============================================================ */
    function renderNodeChips() {
        DOM.nodeGrid.innerHTML = '';
        const pal = PALETTES[state.palette];
        for (const n of state.nodes) {
            const chip = document.createElement('button');
            chip.className = 'node-chip' + (n.id === state.activeNodeId ? ' active' : '');
            chip.style.setProperty('--chip-color', pal[n.colorKey]);
            chip.dataset.id = n.id;
            chip.innerHTML = `
                <span class="node-dot"></span>
                <span class="node-name">${n.name}</span>
            `;
            chip.addEventListener('click', () => setActiveNode(n.id));
            DOM.nodeGrid.appendChild(chip);
        }
        DOM.nodeCount.textContent = state.nodes.length;
    }

    function refreshChipColors() {
        const pal = PALETTES[state.palette];
        document.querySelectorAll('.node-chip').forEach((chip, i) => {
            const node = state.nodes[i];
            if (node) chip.style.setProperty('--chip-color', pal[node.colorKey]);
        });
    }

    function setActiveNode(id) {
        state.activeNodeId = id;
        const node = state.nodes[id];
        if (!node) return;
        document.querySelectorAll('.node-chip').forEach(c => {
            c.classList.toggle('active', Number(c.dataset.id) === id);
        });
        DOM.activeNodeTag.textContent = node.name;
        syncInspectorSliders();
    }

    function syncInspectorSliders() {
        const n = state.nodes[state.activeNodeId];
        if (!n) return;
        setSlider(DOM.sliderChroma, DOM.valChroma, n.chroma);
        setSlider(DOM.sliderScan, DOM.valScan, n.scan);
        setSlider(DOM.sliderMosh, DOM.valMosh, n.mosh);
        setSlider(DOM.sliderRadius, DOM.valRadius, Math.round(n.radius * 100));
    }

    function setSlider(input, label, value) {
        input.value = value;
        label.textContent = value;
        updateSliderFill(input);
    }

    function updateSliderFill(input) {
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        const v = Number(input.value);
        const pct = ((v - min) / (max - min)) * 100;
        input.style.setProperty('--fill', pct + '%');
    }

    /* ============================================================
       === WAVEFORM HOTSPOTS
       ============================================================ */
    function buildWaveformSpots() {
        DOM.waveformLayer.innerHTML = '';
        const count = 7;
        for (let i = 0; i < count; i++) {
            const spot = document.createElement('div');
            spot.className = 'wave-hotspot';
            spot.style.left = ((i + 0.5) / count * 100) + '%';
            spot.style.animationDelay = (i * 0.25) + 's';
            spot.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerRupture();
            });
            DOM.waveformLayer.appendChild(spot);
        }
    }

    /* ============================================================
       === RUPTURE
       ============================================================ */
    function triggerRupture() {
        state.ruptures++;
        state.glitchSurge = Math.min(1.4, state.glitchSurge + 1);
        DOM.ruptureCount.textContent = state.ruptures;

        // re-flash
        DOM.ruptureFlash.classList.remove('fire');
        // force reflow to restart animation
        void DOM.ruptureFlash.offsetWidth;
        DOM.ruptureFlash.classList.add('fire');

        // perturb nodes (scatter slightly)
        for (const n of state.nodes) {
            n.tx = clamp(n.x + rand(-0.08, 0.08), 0.08, 0.92);
            n.ty = clamp(n.y + rand(-0.08, 0.08), 0.12, 0.88);
        }

        // cycle composition name occasionally
        if (state.ruptures % 3 === 0) {
            DOM.compositionName.textContent = COMPOSITION_NAMES[state.ruptures % COMPOSITION_NAMES.length];
        }

        if (state.audioEnabled) AudioEngine.tick();
    }

    /* ============================================================
       === CANVAS DRAG INTERACTION
       ============================================================ */
    function bindCanvasDrag() {
        let draggingNode = null;
        const rect = () => DOM.canvasWrap.getBoundingClientRect();

        function posFromEvent(e) {
            const r = rect();
            const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
            const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
            return { x: clamp(cx / r.width, 0, 1), y: clamp(cy / r.height, 0, 1) };
        }

        function pickNode(x, y) {
            // pick nearest within threshold
            let best = null, bestDist = Infinity;
            for (const n of state.nodes) {
                const dx = n.x - x, dy = n.y - y;
                const d = Math.hypot(dx, dy);
                if (d < bestDist) { bestDist = d; best = n; }
            }
            return bestDist < 0.12 ? best : null;
        }

        function start(e) {
            const { x, y } = posFromEvent(e);
            const n = pickNode(x, y);
            if (n) {
                draggingNode = n;
                n.dragging = true;
                setActiveNode(n.id);
                hideHint();
                e.preventDefault();
            }
        }

        function move(e) {
            if (!draggingNode) return;
            const { x, y } = posFromEvent(e);
            draggingNode.tx = draggingNode.x = x;
            draggingNode.ty = draggingNode.y = y;
            e.preventDefault();
        }

        function end() {
            if (draggingNode) draggingNode.dragging = false;
            draggingNode = null;
        }

        DOM.canvasWrap.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        DOM.canvasWrap.addEventListener('touchstart', start, { passive: false });
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', end);

        // click on empty canvas = small rupture ripple at cursor
        DOM.canvasWrap.addEventListener('click', (e) => {
            if (e.target.closest('.wave-hotspot')) return;
            // only count as click if not ending a drag
            const { x, y } = posFromEvent(e);
            const n = pickNode(x, y);
            if (!n) {
                // tiny micro-glitch
                state.glitchSurge = Math.min(1.4, state.glitchSurge + 0.35);
                hideHint();
            }
        });
    }

    function hideHint() {
        if (state.hintHidden) return;
        state.hintHidden = true;
        DOM.canvasHint.classList.add('hidden');
    }

    /* ============================================================
       === CONSOLE BINDINGS
       ============================================================ */
    function bindInspector() {
        const map = [
            [DOM.sliderChroma, DOM.valChroma, 'chroma'],
            [DOM.sliderScan,   DOM.valScan,   'scan'],
            [DOM.sliderMosh,   DOM.valMosh,   'mosh'],
            [DOM.sliderRadius, DOM.valRadius, 'radius']
        ];
        map.forEach(([input, label, key]) => {
            input.addEventListener('input', () => {
                const v = Number(input.value);
                label.textContent = v;
                updateSliderFill(input);
                const n = state.nodes[state.activeNodeId];
                if (!n) return;
                if (key === 'radius') n.radius = v / 100;
                else n[key] = v;
            });
            updateSliderFill(input);
        });
    }

    function bindConsole() {
        const map = [
            [DOM.sliderFreq,  DOM.valFreq,  'bpm'],
            [DOM.sliderAmp,   DOM.valAmp,   'amplitude'],
            [DOM.sliderNoise, DOM.valNoise, 'noiseFloor']
        ];
        map.forEach(([input, label, key]) => {
            input.addEventListener('input', () => {
                const v = Number(input.value);
                label.textContent = v;
                updateSliderFill(input);
                state[key] = v;
                if (key === 'bpm') DOM.bpmReadout.textContent = v;
            });
            updateSliderFill(input);
        });

        DOM.paletteRow.addEventListener('click', (e) => {
            const btn = e.target.closest('.palette-btn');
            if (!btn) return;
            const p = btn.dataset.palette;
            if (!PALETTES[p]) return;
            state.palette = p;
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.toggle('active', b === btn));
            refreshChipColors();
        });

        DOM.btnReset.addEventListener('click', resetState);
        DOM.btnRandomize.addEventListener('click', randomize);
        DOM.btnRupture.addEventListener('click', triggerRupture);
        DOM.btnAudio.addEventListener('click', toggleAudio);
    }

    function toggleAudio() {
        AudioEngine.ensure();
        AudioEngine.resume();
        state.audioEnabled = !state.audioEnabled;
        DOM.btnAudio.dataset.active = String(state.audioEnabled);
        DOM.btnAudio.querySelector('.btn-label').textContent = state.audioEnabled ? 'MUTE BEAT' : 'ENABLE BEAT';
    }

    function resetState() {
        createNodes();
        state.ruptures = 0;
        state.glitchSurge = 0;
        DOM.ruptureCount.textContent = 0;
        DOM.compositionName.textContent = COMPOSITION_NAMES[0];
        setActiveNode(0);
        renderNodeChips();
    }

    function randomize() {
        for (const n of state.nodes) {
            n.tx = n.x = rand(0.12, 0.88);
            n.ty = n.y = rand(0.18, 0.82);
            n.chroma = Math.floor(rand(10, 95));
            n.scan = Math.floor(rand(10, 95));
            n.mosh = Math.floor(rand(5, 85));
            n.radius = rand(0.2, 0.9);
        }
        state.bpm = Math.floor(rand(60, 160));
        state.amplitude = Math.floor(rand(30, 90));
        state.noiseFloor = Math.floor(rand(5, 60));
        setSlider(DOM.sliderFreq, DOM.valFreq, state.bpm);
        setSlider(DOM.sliderAmp, DOM.valAmp, state.amplitude);
        setSlider(DOM.sliderNoise, DOM.valNoise, state.noiseFloor);
        DOM.bpmReadout.textContent = state.bpm;
        setActiveNode(state.activeNodeId);
    }

    /* ============================================================
       === ANIMATION LOOP
       ============================================================ */
    function loop(now) {
        const dt = Math.min(64, now - state.lastFrame);
        state.lastFrame = now;
        state.time += dt / 1000;

        Heartbeat.update(now, dt);
        updateNodes(dt);

        // decay glitch surge
        state.glitchSurge *= Math.pow(0.001, dt / 1200);
        if (state.glitchSurge < 0.001) state.glitchSurge = 0;

        Renderer.render(state.time);

        // fps
        state.fpsAcc += dt;
        state.fpsFrames++;
        if (state.fpsAcc > 500) {
            state.fps = Math.round(1000 / (state.fpsAcc / state.fpsFrames));
            DOM.fpsReadout.textContent = state.fps;
            state.fpsAcc = 0;
            state.fpsFrames = 0;
        }

        requestAnimationFrame(loop);
    }

    /* ============================================================
       === RESIZE
       ============================================================ */
    let resizeRAF = null;
    function onResize() {
        cancelAnimationFrame(resizeRAF);
        resizeRAF = requestAnimationFrame(() => Renderer.resize());
    }

    /* ============================================================
       === INIT
       ============================================================ */
    function init() {
        createNodes();
        Renderer.init();
        renderNodeChips();
        buildWaveformSpots();
        bindCanvasDrag();
        bindInspector();
        bindConsole();
        setActiveNode(0);
        window.addEventListener('resize', onResize);
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
