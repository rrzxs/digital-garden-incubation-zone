/* ================================================================
   GLITCH LAB — main.js
   五种故障模式 · RGB色差 · 粒子流场 · 脉冲冲击波
   ================================================================ */

(function () {
    'use strict';

    // ================================================================
    // === DOM ELEMENTS ===
    // ================================================================
    const body = document.body;
    const stage = document.getElementById('glitch-stage');
    const display = document.getElementById('glitch-display');
    const layerMain = document.getElementById('layer-main');
    const layerR = document.getElementById('layer-r');
    const layerG = document.getElementById('layer-g');
    const layerB = document.getElementById('layer-b');
    const layerScramble = document.getElementById('layer-scramble');
    const burstFlash = document.getElementById('burst-flash');
    const scanBars = document.getElementById('scan-bars');
    const stageHint = document.getElementById('stage-hint');

    const canvas = document.getElementById('field-canvas');
    const ctx = canvas.getContext('2d');

    const cursorShell = document.querySelector('.cursor-shell');

    // Controls
    const textInput = document.getElementById('text-input');
    const btnRandomize = document.getElementById('btn-randomize');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const paletteBtns = document.querySelectorAll('.palette-btn');
    const sliderIntensity = document.getElementById('slider-intensity');
    const sliderOffset = document.getElementById('slider-offset');
    const sliderSpeed = document.getElementById('slider-speed');
    const sliderDensity = document.getElementById('slider-density');
    const sliderPulse = document.getElementById('slider-pulse');
    const valIntensity = document.getElementById('val-intensity');
    const valOffset = document.getElementById('val-offset');
    const valSpeed = document.getElementById('val-speed');
    const valDensity = document.getElementById('val-density');
    const valPulse = document.getElementById('val-pulse');

    const btnBurst = document.getElementById('btn-burst');
    const btnExport = document.getElementById('btn-export');
    const btnRecord = document.getElementById('btn-record');

    // HUD readouts
    const hudMode = document.getElementById('hud-mode');
    const hudIntensity = document.getElementById('hud-intensity');
    const hudFps = document.getElementById('hud-fps');
    const hudDisruptions = document.getElementById('hud-disruptions');
    const teleOffset = document.getElementById('tele-offset');
    const teleGlitch = document.getElementById('tele-glitch');

    // ================================================================
    // === STATE ===
    // ================================================================
    const state = {
        text: 'GLITCH LAB',
        mode: 'chromatic',
        intensity: 0.5,
        offset: 8,
        speed: 0.3,
        density: 0.4,
        autoPulse: 0.2,
        mouseX: 0,
        mouseY: 0,
        stageMouseX: 0,
        stageMouseY: 0,
        inStage: false,
        disruptions: 0,
        burstActive: 0,
        scrambleChars: '!<>-_\\/[]{}—=+*^?#________',
        recordFrames: [],
        isRecording: false,
        ripples: [],
        particles: [],
        scanOffsets: [],
        time: 0,
        fps: 60,
        fpsAccum: 0,
        fpsCount: 0,
        lastFpsTime: 0,
        interacted: false,
    };

    const WORD_BANK = [
        'SIGNAL LOST', 'CORRUPTED', '404 NOT FOUND', 'NIGHTCITY',
        'DATA STREAM', 'OFFLINE', 'SYSTEM FAILURE', 'NULL VOID',
        'FEEDBACK', 'INTERFERENCE', 'PIXEL STORM', 'BROKEN CIRCUIT',
        'GHOST IN SHELL', 'ENTER THE GRID', 'WAKE UP', 'GLITCH LAB'
    ];

    const GLYPHS = ['◆', '◇', '▮', '▯', '◢', '◣', '◤', '◥', '█', '▓', '▒', '░', '⬛', '⬜'];

    // ================================================================
    // === CANVAS SETUP ===
    // ================================================================
    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
    }

    // ================================================================
    // === PARTICLE FIELD ===
    // ================================================================
    const PARTICLE_COUNT = 90;

    function initParticles() {
        state.particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 1.8 + 0.4,
                life: Math.random(),
                seed: Math.random() * 1000,
                char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
                isChar: Math.random() > 0.7,
            });
        }
    }

    function updateParticles(dt) {
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();

        for (let i = 0; i < state.particles.length; i++) {
            const p = state.particles[i];

            // Flow field drift using sine noise
            const noiseAngle = Math.sin((p.x + state.time * 40) * 0.003) * Math.cos((p.y + state.time * 40) * 0.003) * Math.PI * 2;
            p.vx += Math.cos(noiseAngle) * 0.015;
            p.vy += Math.sin(noiseAngle) * 0.015;

            // Cursor attraction within stage
            if (state.inStage) {
                const dx = state.mouseX - p.x;
                const dy = state.mouseY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 10) {
                    const force = (1 - dist / 200) * 0.08 * state.intensity;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            // Ripple push
            for (let r = 0; r < state.ripples.length; r++) {
                const ripple = state.ripples[r];
                const rdx = p.x - ripple.x;
                const rdy = p.y - ripple.y;
                const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
                const ringDist = Math.abs(rdist - ripple.radius);
                if (ringDist < 50 && rdist > 5) {
                    const force = (1 - ringDist / 50) * ripple.strength * 0.5;
                    p.vx += (rdx / rdist) * force;
                    p.vy += (rdy / rdist) * force;
                }
            }

            // Damping
            p.vx *= 0.96;
            p.vy *= 0.96;

            // Cap velocity
            const maxV = 3;
            const vmag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (vmag > maxV) {
                p.vx = (p.vx / vmag) * maxV;
                p.vy = (p.vy / vmag) * maxV;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.life += 0.003;

            // Wrap around screen
            if (p.x < -20) p.x = window.innerWidth + 20;
            if (p.x > window.innerWidth + 20) p.x = -20;
            if (p.y < -20) p.y = window.innerHeight + 20;
            if (p.y > window.innerHeight + 20) p.y = -20;

            // Draw
            const alpha = 0.15 + (Math.sin(p.life * Math.PI * 2 + p.seed) * 0.5 + 0.5) * 0.35;
            ctx.globalAlpha = alpha;

            if (p.isChar) {
                ctx.fillStyle = `rgba(${accentRgb}, ${alpha})`;
                ctx.font = `${10 + p.size * 3}px 'Share Tech Mono', monospace`;
                ctx.fillText(p.char, p.x, p.y);
            } else {
                ctx.fillStyle = `rgba(${accentRgb}, 1)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // ================================================================
    // === RIPPLES (pulse shockwaves) ===
    // ================================================================
    function spawnRipple(x, y, strength) {
        state.ripples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 400,
            strength: strength,
            life: 1,
        });
    }

    function updateRipples(dt) {
        const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();

        for (let i = state.ripples.length - 1; i >= 0; i--) {
            const r = state.ripples[i];
            r.radius += 4 + r.strength * 6;
            r.life = 1 - r.radius / r.maxRadius;

            if (r.life <= 0) {
                state.ripples.splice(i, 1);
                continue;
            }

            // Draw ripple ring
            ctx.strokeStyle = `rgba(${accentRgb}, ${r.life * 0.4})`;
            ctx.lineWidth = 2 * r.life;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner glow ring
            ctx.strokeStyle = `rgba(${accentRgb}, ${r.life * 0.15})`;
            ctx.lineWidth = 8 * r.life;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ================================================================
    // === GLITCH TEXT RENDERING ===
    // ================================================================
    function updateText(newText) {
        state.text = newText.toUpperCase().slice(0, 24) || ' ';
        layerMain.textContent = state.text;
        layerR.textContent = state.text;
        layerG.textContent = state.text;
        layerB.textContent = state.text;
        hideHint();
    }

    function applyChromaticMode(t) {
        const cursorInfluenceX = state.inStage ? (state.stageMouseX * state.offset * state.intensity) : 0;
        const cursorInfluenceY = state.inStage ? (state.stageMouseY * state.offset * state.intensity * 0.3) : 0;

        // Base oscillation influenced by time and intensity
        const oscillation = Math.sin(t * 0.05 * state.speed * 10) * state.offset * state.intensity;
        const jitter = (Math.random() - 0.5) * state.intensity * 6;

        const rx = -state.offset * state.intensity + oscillation + cursorInfluenceX * -1 + jitter;
        const gx = cursorInfluenceX * 0.3 + (Math.random() - 0.5) * 2;
        const bx = state.offset * state.intensity - oscillation + cursorInfluenceX + jitter * -1;

        const ry = cursorInfluenceY + (Math.random() - 0.5) * 3 * state.intensity;
        const by = -cursorInfluenceY + (Math.random() - 0.5) * 3 * state.intensity;

        layerR.style.transform = `translate(${rx}px, ${ry}px)`;
        layerG.style.transform = `translate(${gx}px, ${(Math.random() - 0.5) * 2}px)`;
        layerB.style.transform = `translate(${bx}px, ${by}px)`;
    }

    function applyDatamoshMode(t) {
        // Reset RGB layers
        layerR.style.opacity = state.intensity > 0.6 ? 0.4 : 0.2;
        layerG.style.opacity = 0.2;
        layerB.style.opacity = state.intensity > 0.6 ? 0.4 : 0.2;

        const segments = Math.floor(3 + state.intensity * 8);
        const time2 = t * state.speed * 5;

        // Randomly offset bands
        const bandHeight = 100 / segments;
        let clipPath = '';

        for (let i = 0; i < segments; i++) {
            const yStart = i * bandHeight;
            const yEnd = (i + 1) * bandHeight;
            const shift = Math.sin(time2 + i * 0.7) * state.intensity * 30 * (Math.random() > 0.7 ? 1 : 0);

            if (i === 0) {
                clipPath = `polygon(0 ${yStart}%, 100% ${yStart}%, 100% ${yEnd}%, 0 ${yEnd}%)`;
            }
        }

        // Apply random band shifts
        const shiftR = Math.sin(time2) * state.intensity * 20 + (Math.random() > 0.8 ? (Math.random() - 0.5) * 40 * state.intensity : 0);
        const shiftB = Math.cos(time2 * 1.3) * state.intensity * 20 + (Math.random() > 0.8 ? (Math.random() - 0.5) * 40 * state.intensity : 0);

        layerR.style.transform = `translate(${shiftR}px, ${(Math.random() - 0.5) * 8 * state.intensity}px)`;
        layerB.style.transform = `translate(${shiftB}px, ${(Math.random() - 0.5) * 8 * state.intensity}px)`;
        layerG.style.transform = `translate(0, 0)`;

        // Random data bars overlay
        if (Math.random() < state.intensity * 0.15) {
            layerScramble.textContent = generateRandomString(state.text.length);
            layerScramble.style.opacity = '0.3';
            layerScramble.style.color = 'var(--glitch-cyan)';
            layerScramble.style.transform = `translate(${(Math.random() - 0.5) * 20}px, ${(Math.random() - 0.5) * 10}px)`;
        } else {
            layerScramble.style.opacity = '0';
        }
    }

    function applyScanlineMode(t) {
        scanBars.classList.add('active');
        const scrollSpeed = state.speed * 0.5 + 0.1;

        // Generate scanline bands that shift the RGB channels in horizontal bands
        const bands = Math.floor(4 + state.intensity * 12);
        const offset = (t * scrollSpeed) % (200 / bands);

        const shiftR = Math.sin(t * state.speed * 3) * state.intensity * 15;
        const shiftB = Math.cos(t * state.speed * 3) * state.intensity * 15;

        layerR.style.transform = `translate(${shiftR}px, ${offset}px)`;
        layerB.style.transform = `translate(${shiftB}px, ${-offset}px)`;
        layerG.style.transform = `translate(0, 0)`;

        layerR.style.opacity = 0.5 + state.intensity * 0.3;
        layerB.style.opacity = 0.5 + state.intensity * 0.3;

        // Horizontal tear line
        if (Math.random() < state.intensity * 0.2) {
            const tearY = Math.random() * 100;
            layerMain.style.clipPath = `polygon(0 0, 100% 0, 100% ${tearY}%, 0 ${tearY}%, 0 ${tearY + 5 + state.intensity * 15}%, 100% ${tearY + 5 + state.intensity * 15}%, 100% 100%, 0 100%)`;
        } else {
            layerMain.style.clipPath = 'none';
        }
    }

    function applySortMode(t) {
        // Pixel sort effect — characters get sorted/rearranged
        const chars = state.text.split('');
        const sortedCount = Math.floor(state.intensity * chars.length);

        // Sort a portion of the text by character code
        const displayChars = [...chars];
        for (let i = 0; i < sortedCount; i++) {
            const idx = Math.floor(Math.random() * displayChars.length);
            displayChars[idx] = state.scrambleChars[Math.floor(Math.random() * state.scrambleChars.length)];
        }

        // Animate sorting
        const sortProgress = (Math.sin(t * state.speed * 2) * 0.5 + 0.5);
        const sortIdx = Math.floor(sortProgress * displayChars.length);

        const result = displayChars.map((ch, i) => {
            if (i < sortIdx && ch !== ' ') {
                return String.fromCharCode(ch.charCodeAt(0) + Math.floor(Math.random() * 5 - 2));
            }
            return ch;
        }).join('');

        layerMain.textContent = result;

        // RGB layers stay slightly offset
        const off = state.offset * 0.5 * state.intensity;
        layerR.style.transform = `translate(${-off}px, 0)`;
        layerB.style.transform = `translate(${off}px, 0)`;
        layerR.style.opacity = 0.4;
        layerB.style.opacity = 0.4;
    }

    let scrambleRevealProgress = 0;
    let scrambleDirection = 1;

    function applyScrambleMode(t) {
        const density = state.density;
        const chars = state.text.split('');
        const result = chars.map((ch) => {
            if (ch === ' ') return ' ';
            if (Math.random() < density * 0.3) {
                return state.scrambleChars[Math.floor(Math.random() * state.scrambleChars.length)];
            }
            return ch;
        }).join('');

        layerMain.textContent = result;

        // Subtle RGB offset
        const off = state.offset * 0.3 * state.intensity;
        layerR.style.transform = `translate(${-off + (Math.random() - 0.5) * 4}px, ${(Math.random() - 0.5) * 4}px)`;
        layerB.style.transform = `translate(${off + (Math.random() - 0.5) * 4}px, ${(Math.random() - 0.5) * 4}px)`;
        layerR.style.opacity = 0.6;
        layerB.style.opacity = 0.6;

        // Ghost scramble layer
        if (Math.random() < density * 0.4) {
            layerScramble.textContent = generateRandomString(state.text.length);
            layerScramble.style.opacity = String(0.2 + density * 0.3);
            layerScramble.style.color = 'var(--glitch-magenta)';
            layerScramble.style.transform = `translate(${(Math.random() - 0.5) * 30 * state.intensity}px, ${(Math.random() - 0.5) * 15 * state.intensity}px) skewX(${(Math.random() - 0.5) * 8}deg)`;
        } else {
            layerScramble.style.opacity = '0';
        }
    }

    function generateRandomString(len) {
        let result = '';
        for (let i = 0; i < len; i++) {
            result += state.scrambleChars[Math.floor(Math.random() * state.scrambleChars.length)];
        }
        return result;
    }

    function resetLayerStyles() {
        layerMain.style.clipPath = 'none';
        layerScramble.style.opacity = '0';
        layerR.style.opacity = '0.85';
        layerG.style.opacity = '0.85';
        layerB.style.opacity = '0.85';
        scanBars.classList.remove('active');

        // When leaving scramble/sort, restore original text
        if (state.mode !== 'scramble' && state.mode !== 'sort') {
            layerMain.textContent = state.text;
        }
    }

    // ================================================================
    // === BURST (disruption shockwave) ===
    // ================================================================
    function triggerBurst(x, y) {
        x = x !== undefined ? x : window.innerWidth / 2;
        y = y !== undefined ? y : window.innerHeight / 2;

        state.disruptions++;
        hudDisruptions.textContent = state.disruptions;

        burstFlash.classList.remove('flash');
        void burstFlash.offsetWidth;
        burstFlash.classList.add('flash');

        spawnRipple(x, y, 1.0);

        // Temporarily boost intensity
        state.burstActive = 1;

        // Disrupt text
        const originalText = state.text;
        let disruptionCount = 0;
        const disruptionInterval = setInterval(() => {
            if (disruptionCount > 6) {
                clearInterval(disruptionInterval);
                if (state.mode !== 'scramble' && state.mode !== 'sort') {
                    layerMain.textContent = originalText;
                }
                return;
            }
            layerMain.textContent = generateRandomString(originalText.length);
            disruptionCount++;
        }, 40);

        hideHint();
    }

    // ================================================================
    // === AUTO PULSE ===
    // ================================================================
    let lastAutoPulse = 0;
    function checkAutoPulse(t) {
        if (state.autoPulse <= 0) return;
        const interval = (110 - state.autoPulse * 100) * 8; // ms between pulses
        if (t * 1000 - lastAutoPulse > interval) {
            lastAutoPulse = t * 1000;
            // Random position within stage bounds
            const rect = stage.getBoundingClientRect();
            const rx = rect.left + Math.random() * rect.width;
            const ry = rect.top + Math.random() * rect.height;
            spawnRipple(rx, ry, 0.5);
            state.burstActive = Math.max(state.burstActive, 0.5);
        }
    }

    // ================================================================
    // === MAIN ANIMATION LOOP ===
    // ================================================================
    let lastTime = performance.now();

    function animate(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        state.time += dt;

        // FPS tracking
        state.fpsAccum += 1 / dt;
        state.fpsCount++;
        if (now - state.lastFpsTime > 500) {
            state.fps = Math.round(state.fpsAccum / state.fpsCount);
            state.fpsAccum = 0;
            state.fpsCount = 0;
            state.lastFpsTime = now;
            hudFps.textContent = state.fps;
        }

        // Clear canvas with trail effect
        ctx.fillStyle = 'rgba(6, 8, 7, 0.12)';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Decay burst boost
        if (state.burstActive > 0) {
            state.burstActive -= dt * 2.5;
            if (state.burstActive < 0) state.burstActive = 0;
        }

        const effectiveIntensity = state.intensity + state.burstActive * 0.3;

        // Apply glitch mode
        switch (state.mode) {
            case 'chromatic': applyChromaticMode(state.time * 60); break;
            case 'datamosh': applyDatamoshMode(state.time * 60); break;
            case 'scanline': applyScanlineMode(state.time * 60); break;
            case 'sort': applySortMode(state.time * 60); break;
            case 'scramble': applyScrambleMode(state.time * 60); break;
        }

        // Update particle field
        updateParticles(dt);

        // Update ripples
        updateRipples(dt);

        // Auto pulse
        checkAutoPulse(state.time);

        requestAnimationFrame(animate);
    }

    // ================================================================
    // === CURSOR TRACKING ===
    // ================================================================
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let smoothCursorX = cursorX;
    let smoothCursorY = cursorY;

    function updateCursorVisual() {
        smoothCursorX += (cursorX - smoothCursorX) * 0.2;
        smoothCursorY += (cursorY - smoothCursorY) * 0.2;
        cursorShell.style.transform = `translate(${smoothCursorX}px, ${smoothCursorY}px)`;
        requestAnimationFrame(updateCursorVisual);
    }

    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;

        // Track stage-relative mouse for chromatic influence
        const rect = stage.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        state.stageMouseX = (e.clientX - cx) / (rect.width / 2);
        state.stageMouseY = (e.clientY - cy) / (rect.height / 2);
    });

    // ================================================================
    // === EVENT HANDLERS ===
    // ================================================================

    // Text input
    textInput.addEventListener('input', (e) => {
        updateText(e.target.value || ' ');
    });

    textInput.addEventListener('focus', () => {
        textInput.select();
    });

    // Randomize
    btnRandomize.addEventListener('click', () => {
        const word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
        textInput.value = word;
        updateText(word);
    });

    // Mode switching
    modeBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            modeBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.mode = btn.dataset.mode;
            body.dataset.mode = state.mode;

            resetLayerStyles();

            const modeLabels = {
                chromatic: 'CHROMATIC',
                datamosh: 'DATAMOSH',
                scanline: 'SCANLINE',
                sort: 'PIXEL SORT',
                scramble: 'SCRAMBLE',
            };
            hudMode.textContent = modeLabels[state.mode] || state.mode.toUpperCase();
        });
    });

    // Palette switching
    paletteBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            paletteBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const palette = btn.dataset.palette;
            body.className = 'palette-' + palette + ' data-mode-' + state.mode;
        });
    });

    // Sliders
    function bindSlider(slider, valEl, callback) {
        slider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            valEl.textContent = v;
            callback(v);
        });
    }

    bindSlider(sliderIntensity, valIntensity, (v) => {
        state.intensity = v / 100;
        hudIntensity.textContent = state.intensity.toFixed(2);
        teleGlitch.textContent = state.intensity.toFixed(2);
    });

    bindSlider(sliderOffset, valOffset, (v) => {
        state.offset = v;
        teleOffset.textContent = v.toFixed(1);
    });

    bindSlider(sliderSpeed, valSpeed, (v) => {
        state.speed = v / 100;
    });

    bindSlider(sliderDensity, valDensity, (v) => {
        state.density = v / 100;
    });

    bindSlider(sliderPulse, valPulse, (v) => {
        state.autoPulse = v / 100;
    });

    // Burst button
    btnBurst.addEventListener('click', () => {
        const rect = stage.getBoundingClientRect();
        triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    // Export (download snapshot as SVG text)
    btnExport.addEventListener('click', () => {
        const svgContent = generateExportSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glitch-lab-${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        flashButton(btnExport, '导出');
    });

    function generateExportSVG() {
        const w = 800;
        const h = 420;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        const chR = getComputedStyle(document.documentElement).getPropertyValue('--channel-r').trim();
        const chG = getComputedStyle(document.documentElement).getPropertyValue('--channel-g').trim();
        const chB = getComputedStyle(document.documentElement).getPropertyValue('--channel-b').trim();
        const bgDeep = getComputedStyle(document.documentElement).getPropertyValue('--bg-deep').trim();

        const off = state.offset * state.intensity;
        const text = state.text;

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bgDeep}"/>
  <text x="${w / 2 - off}" y="${h / 2}" font-family="Outfit, sans-serif" font-weight="900" font-size="64" fill="${chR}" text-anchor="middle" opacity="0.7" letter-spacing="3">${escapeXml(text)}</text>
  <text x="${w / 2}" y="${h / 2}" font-family="Outfit, sans-serif" font-weight="900" font-size="64" fill="${chG}" text-anchor="middle" opacity="0.7" letter-spacing="3">${escapeXml(text)}</text>
  <text x="${w / 2 + off}" y="${h / 2}" font-family="Outfit, sans-serif" font-weight="900" font-size="64" fill="${chB}" text-anchor="middle" opacity="0.7" letter-spacing="3">${escapeXml(text)}</text>
  <text x="${w / 2}" y="${h / 2}" font-family="Outfit, sans-serif" font-weight="900" font-size="64" fill="#ffffff" text-anchor="middle" opacity="0.95" letter-spacing="3">${escapeXml(text)}</text>
  <text x="20" y="30" font-family="Share Tech Mono, monospace" font-size="11" fill="${accent}" opacity="0.6">GLITCH LAB / ${state.mode.toUpperCase()} / INTENSITY ${state.intensity.toFixed(2)}</text>
</svg>`;
    }

    function escapeXml(str) {
        return str.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    }

    // Record (captures a few frames of text states)
    btnRecord.addEventListener('click', () => {
        if (state.isRecording) return;
        state.isRecording = true;
        btnRecord.style.color = 'var(--channel-r)';
        flashButton(btnRecord, '录制中');

        const frames = [];
        let frameCount = 0;
        const recordInterval = setInterval(() => {
            frames.push({
                text: layerMain.textContent,
                mode: state.mode,
                time: Date.now(),
            });
            frameCount++;
            if (frameCount >= 30) {
                clearInterval(recordInterval);
                state.isRecording = false;
                btnRecord.style.color = '';
                const data = JSON.stringify(frames, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `glitch-recording-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                flashButton(btnRecord, '完成');
            }
        }, 100);
    });

    function flashButton(btn, text) {
        const original = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = text;
        btn.style.borderColor = 'rgba(var(--accent-rgb), 0.5)';
        setTimeout(() => {
            btn.querySelector('span').textContent = original;
            btn.style.borderColor = '';
        }, 1200);
    }

    // Stage interactions
    stage.addEventListener('mouseenter', () => {
        state.inStage = true;
        cursorShell.classList.add('over-stage');
    });

    stage.addEventListener('mouseleave', () => {
        state.inStage = false;
        cursorShell.classList.remove('over-stage');
    });

    stage.addEventListener('click', (e) => {
        // Get click position relative to stage center
        const rect = stage.getBoundingClientRect();
        triggerBurst(e.clientX, e.clientY);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === textInput) return;

        const keyMap = {
            '1': 'chromatic',
            '2': 'datamosh',
            '3': 'scanline',
            '4': 'sort',
            '5': 'scramble',
        };

        if (keyMap[e.key]) {
            const targetBtn = document.querySelector(`.mode-btn[data-mode="${keyMap[e.key]}"]`);
            if (targetBtn) targetBtn.click();
        }

        if (e.code === 'Space') {
            e.preventDefault();
            const rect = stage.getBoundingClientRect();
            triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
    });

    // Hint auto-hide
    let hintTimer;
    function hideHint() {
        if (!state.interacted) {
            state.interacted = true;
            stageHint.classList.add('hidden');
        }
    }

    // Window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });

    // ================================================================
    // === INIT ===
    // ================================================================
    function init() {
        resizeCanvas();
        initParticles();
        updateText('GLITCH LAB');
        updateCursorVisual();
        requestAnimationFrame(animate);
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
