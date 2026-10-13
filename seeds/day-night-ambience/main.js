/**
 * Day-Night Ambience · 昼夜氛围
 * 沉浸式昼夜氛围呼吸体验：
 *  - 24 小时天空色相插值（黎明/正午/黄昏/午夜关键帧）
 *  - 日月沿弧线运行、星空闪烁、云层漂移、萤火虫与风絮粒子
 *  - 生成式环境声场（风 + 白昼鸟鸣 + 深夜虫声交叉渐变）
 *  - 弹簧-阻尼时间刻度拖拽 + 非线性缓动瞬间跳转
 * Maintainer: EDEN
 */

(() => {
    'use strict';

    // =========================================================================
    // === DOM Elements ===
    // =========================================================================

    const $ = (id) => document.getElementById(id);

    const els = {
        stage: $('sky-stage'),
        gradient: $('sky-gradient'),
        glow: $('sky-glow'),
        sun: $('sun-body'),
        moon: $('moon-body'),
        canvas: $('sky-canvas'),
        horizon: $('horizon'),
        mist: $('horizon-mist'),

        cursorGlow: $('cursor-glow'),
        cursorRing: $('cursor-ring'),

        themeSwitcher: $('theme-switcher'),

        hudTime: $('hud-time'),
        hudPhase: $('hud-phase'),
        hudDaylight: $('hud-daylight'),
        hudNext: $('hud-next'),
        hudSound: $('hud-sound'),

        timeTrack: $('time-track'),
        timeFill: $('time-fill'),
        timeThumb: $('time-thumb'),
        timeReadout: $('time-readout'),
        phaseReadout: $('phase-readout'),

        soundBtn: $('sound-btn'),
        autoBtn: $('auto-btn'),

        phaseGrid: $('phase-grid'),
        heroCard: $('hero-card')
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    const hexToRgb = (hex) => {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    const mixRgb = (c1, c2, t) => [
        Math.round(lerp(c1[0], c2[0], t)),
        Math.round(lerp(c1[1], c2[1], t)),
        Math.round(lerp(c1[2], c2[2], t))
    ];

    const rgbCss = (c, alpha = 1) =>
        `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;

    // =========================================================================
    // === Time Model — spring-damped hour state (0 → 24, wraps) ===
    // =========================================================================

    const SUNRISE = 6;
    const SUNSET = 18.5;

    const timeState = {
        value: 12.5,      // displayed hour (damped)
        target: 12.5,     // goal hour
        velocity: 0,
        auto: true,
        autoSpeed: 0.0022 // hours per frame ≈ full day in ~3min at 60fps
    };

    /** Shortest signed delta between two hours on a 24h ring. */
    const hourDelta = (from, to) => {
        let d = (to - from) % 24;
        if (d > 12) d -= 24;
        if (d < -12) d += 24;
        return d;
    };

    const stepTime = () => {
        if (timeState.auto) {
            timeState.target += timeState.autoSpeed;
            if (timeState.target >= 24) timeState.target -= 24;
            timeState.value = timeState.target;
            timeState.velocity = 0;
        } else {
            // Spring-damper: critically soft, expo-like settling
            const d = hourDelta(timeState.value, timeState.target);
            const stiffness = 0.045;
            const damping = 0.82;
            timeState.velocity = timeState.velocity * damping + d * stiffness;
            timeState.value += timeState.velocity;
            if (timeState.value >= 24) timeState.value -= 24;
            if (timeState.value < 0) timeState.value += 24;
        }
    };

    // =========================================================================
    // === Sky Palette — hour keyframes, circularly interpolated ===
    // =========================================================================

    const SKY_KEYS = [
        { h: 0,    top: '#0a1030', mid: '#141b3e', bot: '#20264f', glow: '#2c3670', orb: ['#33409a', '#5a4d9e', '#283566', '#1e5867'] },
        { h: 3,    top: '#0c1236', mid: '#182148', bot: '#262c58', glow: '#3d3a78', orb: ['#3a3fa0', '#5f4fa0', '#2b3a70', '#1e5a68'] },
        { h: 5,    top: '#20305e', mid: '#5a4a74', bot: '#a06070', glow: '#c47a5e', orb: ['#7a5aa0', '#b06a88', '#4a5a94', '#3a7a80'] },
        { h: 6.5,  top: '#4a6a9e', mid: '#c08a86', bot: '#f0b184', glow: '#ffca8e', orb: ['#e8a06a', '#f0b48a', '#7a8ac0', '#5aa0a8'] },
        { h: 9,    top: '#6aa6d8', mid: '#a8cce8', bot: '#e8d8b8', glow: '#ffe6b8', orb: ['#f0c890', '#8ab8e8', '#d8a8a0', '#7ac0b0'] },
        { h: 12.5, top: '#4a90c8', mid: '#8ec0e8', bot: '#d8e4e0', glow: '#fff2cf', orb: ['#a8d0f0', '#f0d8a0', '#8ac0e0', '#90d8c8'] },
        { h: 16,   top: '#5288b8', mid: '#a8b8c8', bot: '#e8ccA8'.toLowerCase(), glow: '#ffd896', orb: ['#e8b878', '#88b0d8', '#d8a898', '#78c0b8'] },
        { h: 18.5, top: '#3a4a80', mid: '#c87068', bot: '#f09050', glow: '#ff9a4e', orb: ['#f08a50', '#e86a70', '#6a6aa8', '#4a8a90'] },
        { h: 20,   top: '#1c2a5c', mid: '#68446e', bot: '#b06058', glow: '#d06a48', orb: ['#8a5aa8', '#c06080', '#4a4a8a', '#3a6a80'] },
        { h: 22,   top: '#0e1638', mid: '#1a2148', bot: '#282e58', glow: '#343c74', orb: ['#38409a', '#584a9a', '#2a3668', '#205464'] },
        { h: 24,   top: '#0a1030', mid: '#141b3e', bot: '#20264f', glow: '#2c3670', orb: ['#33409a', '#5a4d9e', '#283566', '#1e5867'] }
    ].map((k) => ({
        ...k,
        topRgb: hexToRgb(k.top),
        midRgb: hexToRgb(k.mid),
        botRgb: hexToRgb(k.bot),
        glowRgb: hexToRgb(k.glow),
        orbRgb: k.orb.map(hexToRgb)
    }));

    /** Interpolated sky palette for any hour in [0, 24). */
    const skyAt = (hour) => {
        let i = 0;
        for (let k = 0; k < SKY_KEYS.length - 1; k++) {
            if (hour >= SKY_KEYS[k].h && hour <= SKY_KEYS[k + 1].h) { i = k; break; }
        }
        const a = SKY_KEYS[i];
        const b = SKY_KEYS[i + 1];
        const t = clamp((hour - a.h) / Math.max(0.0001, b.h - a.h), 0, 1);
        // Smoothstep for gentler palette transitions
        const s = t * t * (3 - 2 * t);
        return {
            top: mixRgb(a.topRgb, b.topRgb, s),
            mid: mixRgb(a.midRgb, b.midRgb, s),
            bot: mixRgb(a.botRgb, b.botRgb, s),
            glow: mixRgb(a.glowRgb, b.glowRgb, s),
            orbs: [0, 1, 2, 3].map((n) => mixRgb(a.orbRgb[n], b.orbRgb[n], s)),
            s
        };
    };

    /** Daylight factor: 0 at deep night → 1 at noon (smooth). */
    const daylightAt = (hour) => {
        const noon = 12.5;
        const d = Math.abs(hourDelta(hour, noon));
        return clamp(1 - d / 7.4, 0, 1);
    };

    const PHASES = [
        { from: 0,   to: 4.5,  name: 'DEEP NIGHT',  cn: '深夜' },
        { from: 4.5, to: 7,    name: 'DAWN',        cn: '黎明' },
        { from: 7,   to: 11,   name: 'MORNING',     cn: '早晨' },
        { from: 11,  to: 14.5, name: 'NOON',        cn: '正午' },
        { from: 14.5,to: 17.5, name: 'AFTERNOON',   cn: '午后' },
        { from: 17.5,to: 20,   name: 'DUSK',        cn: '黄昏' },
        { from: 20,  to: 24,   name: 'NIGHT',       cn: '夜晚' }
    ];

    const phaseAt = (hour) =>
        PHASES.find((p) => hour >= p.from && hour < p.to) || PHASES[0];

    const fmtHour = (hour) => {
        const h = Math.floor(hour) % 24;
        const m = Math.floor((hour - Math.floor(hour)) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // =========================================================================
    // === Sky Renderer — DOM layer (gradient, celestial arc, horizon) ===
    // =========================================================================

    const rootStyle = document.documentElement.style;
    const bodyEl = document.body;

    /** Position of a celestial body along its arc, returns {x, y, visible}. */
    const arcPos = (hour, rise, set) => {
        let t;
        if (hour >= rise && hour <= set) {
            t = (hour - rise) / (set - rise); // daytime journey
        } else {
            // Nighttime arc for moon (wrap across midnight)
            const nightLen = 24 - (set - rise);
            let nh = hour > set ? hour - set : hour + (24 - set);
            if (hour > set || hour < rise) {
                t = nh / nightLen;
            } else {
                return { x: 0.5, y: 1.35, visible: false };
            }
        }
        // Parabolic arc across the sky
        const x = 0.08 + t * 0.84;
        const y = 0.92 - Math.sin(Math.PI * clamp(t, 0, 1)) * 0.72;
        return { x, y, visible: true };
    };

    let nightModeOn = false;

    const renderSkyDom = (hour, palette) => {
        rootStyle.setProperty('--sky-top', rgbCss(palette.top));
        rootStyle.setProperty('--sky-mid', rgbCss(palette.mid));
        rootStyle.setProperty('--sky-bottom', rgbCss(palette.bot));
        rootStyle.setProperty('--sky-glow', rgbCss(palette.glow, 0.5));
        for (let n = 0; n < 4; n++) {
            rootStyle.setProperty(`--orb${n + 1}`, rgbCss(palette.orbs[n], 0.5));
        }

        const daylight = daylightAt(hour);
        const wantNight = daylight < 0.34;
        if (wantNight !== nightModeOn) {
            nightModeOn = wantNight;
            bodyEl.classList.toggle('night-mode', nightModeOn);
        }

        // Sun & moon arcs (CSS left/top → transform for GPU)
        const sun = arcPos(hour, SUNRISE, SUNSET);
        const moonHour = (hour + 12) % 24;
        const moon = arcPos(moonHour, SUNRISE, SUNSET);
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        els.sun.style.transform = `translate3d(${sun.x * vw}px, ${sun.y * vh * 0.9}px, 0)`;
        els.sun.style.opacity = sun.visible ? String(clamp(0.25 + daylight, 0, 1)) : '0';
        els.moon.style.transform = `translate3d(${moon.x * vw}px, ${moon.y * vh * 0.9}px, 0)`;
        els.moon.style.opacity = moon.visible ? String(clamp(0.15 + (1 - daylight) * 0.95, 0, 1)) : '0';

        // Horizon & mist adapt to the hour
        const horizonRgb = mixRgb(palette.botRgb, [8, 12, 30], 1 - daylight * 0.7);
        els.horizon.style.setProperty('--horizon-color', rgbCss(horizonRgb, lerp(0.6, 0.22, daylight)));
        els.mist.style.setProperty('--mist-color', rgbCss(palette.glowRgb, 0.16 + (1 - daylight) * 0.05));
        els.mist.style.setProperty('--mist-opacity', String(lerp(0.75, 0.3, Math.abs(daylight - 0.5) * 2)));

        els.glow.style.opacity = String(lerp(0.35, 1, daylight));
    };

    // =========================================================================
    // === Canvas Layer — stars, clouds, fireflies, seeds, ripples ===
    // =========================================================================

    const canvas = els.canvas;
    const ctx = canvas.getContext('2d');
    let cw = 0;
        let ch = 0;
    let dpr = 1;

    const resizeCanvas = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cw = window.innerWidth;
        ch = window.innerHeight;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // --- Lightweight value noise for organic wander ---
    const noiseTable = new Float32Array(512);
    for (let i = 0; i < 512; i++) noiseTable[i] = Math.random() * 2 - 1;

    const vnoise = (x) => {
        const xi = Math.floor(x);
        const xf = x - xi;
        const u = xf * xf * (3 - 2 * xf);
        const a = noiseTable[((xi % 512) + 512) % 512];
        const b = noiseTable[(((xi + 1) % 512) + 512) % 512];
        return lerp(a, b, u);
    };

    // --- Entity pools ---
    const stars = [];
    const clouds = [];
    const fireflies = [];
    const seeds = [];
    const ripples = [];

    const spawnStars = () => {
        stars.length = 0;
        const count = Math.round((cw * ch) / 5200);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * cw,
                y: Math.random() * ch * 0.72,
                r: Math.random() * 1.4 + 0.4,
                tw: Math.random() * Math.PI * 2,
                twSpeed: 0.008 + Math.random() * 0.02
            });
        }
    };

    const spawnClouds = () => {
        clouds.length = 0;
        for (let i = 0; i < 7; i++) {
            clouds.push({
                x: Math.random() * cw,
                y: ch * (0.1 + Math.random() * 0.4),
                w: 160 + Math.random() * 320,
                h: 26 + Math.random() * 36,
                speed: 0.1 + Math.random() * 0.28,
                puffs: Array.from({ length: 5 }, (_, p) => ({
                    ox: (p / 4 - 0.5) * 0.9,
                    oy: (Math.random() - 0.5) * 0.4,
                    r: 0.3 + Math.random() * 0.35
                }))
            });
        }
    };

    const spawnFireflies = () => {
        fireflies.length = 0;
        const count = Math.round((cw * ch) / 42000) + 6;
        for (let i = 0; i < count; i++) {
            fireflies.push({
                x: Math.random() * cw,
                y: ch * (0.55 + Math.random() * 0.4),
                seed: Math.random() * 100,
                speed: 0.15 + Math.random() * 0.3,
                pulse: Math.random() * Math.PI * 2
            });
        }
    };

    const drawCloud = (cloud, alpha, rgb) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        for (const puff of cloud.puffs) {
            const g = ctx.createRadialGradient(
                cloud.x + puff.ox * cloud.w, cloud.y + puff.oy * cloud.h, 0,
                cloud.x + puff.ox * cloud.w, cloud.y + puff.oy * cloud.h, puff.r * cloud.h * 2.4
            );
            g.addColorStop(0, rgbCss(rgb, 0.85));
            g.addColorStop(1, rgbCss(rgb, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(
                cloud.x + puff.ox * cloud.w,
                cloud.y + puff.oy * cloud.h,
                puff.r * cloud.h * 2.4, 0, Math.PI * 2
            );
            ctx.fill();
        }
        ctx.restore();
    };

    const renderCanvas = (hour, palette, now) => {
        ctx.clearRect(0, 0, cw, ch);
        const daylight = daylightAt(hour);
        const darkness = 1 - daylight;
        const horizonY = ch * 0.78;

        // --- Stars: visible in darkness ---
        if (darkness > 0.12) {
            const starAlpha = Math.min(1, (darkness - 0.12) / 0.5);
            for (const s of stars) {
                s.tw += s.twSpeed;
                const a = starAlpha * (0.35 + 0.65 * Math.abs(Math.sin(s.tw)));
                ctx.fillStyle = `rgba(235, 242, 255, ${a})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- Clouds: visible in daylight, tinted by palette ---
        if (daylight > 0.08) {
            const cloudAlpha = Math.min(0.8, daylight * 0.85);
            const cloudRgb = mixRgb(palette.midRgb, [255, 252, 244], 0.72);
            for (const c of clouds) {
                c.x += c.speed;
                if (c.x - c.w > cw) c.x = -c.w;
                drawCloud(c, cloudAlpha, cloudRgb);
            }
        }

        // --- Fireflies: dusk & night wanderers ---
        const fireflyAmount = clamp((darkness - 0.25) / 0.5, 0, 1);
        if (fireflyAmount > 0) {
            for (const f of fireflies) {
                f.seed += 0.006;
                f.x += vnoise(f.seed * 1.7) * f.speed;
                f.y += vnoise(f.seed * 1.3 + 40) * f.speed * 0.7;
                f.x = (f.x + cw) % cw;
                f.y = clamp(f.y, horizonY - ch * 0.22, ch - 20);
                f.pulse += 0.045;
                const glowPhase = Math.max(0, Math.sin(f.pulse));
                const a = fireflyAmount * glowPhase * 0.9;
                if (a < 0.02) continue;
                const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 14);
                g.addColorStop(0, `rgba(255, 240, 150, ${a})`);
                g.addColorStop(1, 'rgba(255, 240, 150, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(f.x, f.y, 14, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- Wind seeds (dandelion): daytime drifters ---
        if (daylight > 0.15) {
            const seedAlpha = clamp((daylight - 0.15) / 0.6, 0, 1) * 0.55;
            for (const s of seeds) {
                s.life -= 0.003;
                s.x += s.vx + Math.sin(now * 0.001 + s.phase) * 0.3;
                s.y += s.vy;
                if (s.life <= 0 || s.y < -30 || s.x > cw + 30) {
                    s.life = 0.5 + Math.random() * 0.5;
                    s.x = Math.random() * cw;
                    s.y = ch * (0.55 + Math.random() * 0.45);
                    s.vx = 0.3 + Math.random() * 0.7;
                    s.vy = -(0.15 + Math.random() * 0.35);
                }
                const a = seedAlpha * s.life;
                ctx.strokeStyle = `rgba(255, 250, 235, ${a})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x + 5, s.y - 5);
                ctx.stroke();
            }
        }

        // --- Click ripples ---
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.life += 0.02;
            if (r.life >= 1) { ripples.splice(i, 1); continue; }
            const ease = 1 - Math.pow(1 - r.life, 3); // expo-out growth
            const radius = r.maxR * ease;
            const a = (1 - r.life) * 0.5;
            ctx.strokeStyle = rgbCss(palette.glowRgb, a);
            ctx.lineWidth = 1.6 * (1 - r.life) + 0.4;
            ctx.beginPath();
            ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = rgbCss(palette.glowRgb, a * 0.5);
            ctx.beginPath();
            ctx.arc(r.x, r.y, radius * 0.62, 0, Math.PI * 2);
            ctx.stroke();
        }
    };

    // =========================================================================
    // === HUD & Dock Rendering ===
    // =========================================================================

    let lastHudMinute = -1;

    const renderHud = (hour) => {
        const minute = Math.floor(hour * 60);
        if (minute === lastHudMinute) return;
        lastHudMinute = minute;

        const timeStr = fmtHour(hour);
        const phase = phaseAt(hour);
        const daylight = daylightAt(hour);

        els.hudTime.textContent = timeStr;
        els.hudPhase.textContent = phase.name;
        els.hudDaylight.textContent = `${Math.round(daylight * 100)}%`;
        els.hudDaylight.classList.toggle('bright', daylight > 0.6);
        els.timeReadout.textContent = timeStr;
        els.phaseReadout.textContent = `${phase.name} · ${phase.cn}`;

        // Next solar event countdown
        const toSunset = hourDelta(hour, SUNSET);
        const toSunrise = hourDelta(hour, SUNRISE);
        if (toSunset > 0 && toSunset < 12) {
            els.hudNext.textContent = `SUNSET ${fmtHour(SUNSET)} (${Math.round(toSunset * 60)}m)`;
        } else {
            const t = toSunrise > 0 ? toSunrise : toSunrise + 24;
            els.hudNext.textContent = `SUNRISE ${fmtHour(SUNRISE)} (${Math.round(t * 60)}m)`;
        }
    };

    const renderDock = (hour) => {
        const pct = (hour / 24) * 100;
        els.timeFill.style.width = `${pct}%`;
        els.timeThumb.style.left = `${pct}%`;
    };

    // =========================================================================
    // === Ambience Engine — generative Web Audio soundscapes ===
    // =========================================================================

    const ambience = (() => {
        let ctxA = null;
        let master = null;
        let windGain = null;
        let birdGain = null;
        let cricketGain = null;
        let running = false;
        let chirpTimer = 0;
        let cricketTimer = 0;

        const makeNoiseBuffer = (audio) => {
            const len = audio.sampleRate * 2;
            const buf = audio.createBuffer(1, len, audio.sampleRate);
            const data = buf.getChannelData(0);
            let last = 0;
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                last = (last + 0.02 * white) / 1.02; // brown-ish
                data[i] = last * 3.2;
            }
            return buf;
        };

        const start = () => {
            if (running) return;
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtor) return;
            ctxA = new AudioCtor();
            running = true;

            master = ctxA.createGain();
            master.gain.value = 0;
            master.connect(ctxA.destination);
            master.gain.linearRampToValueAtTime(0.55, ctxA.currentTime + 2.2);

            // Wind bed: looped noise → bandpass with slow LFO on frequency
            const noise = ctxA.createBufferSource();
            noise.buffer = makeNoiseBuffer(ctxA);
            noise.loop = true;
            const windFilter = ctxA.createBiquadFilter();
            windFilter.type = 'bandpass';
            windFilter.frequency.value = 420;
            windFilter.Q.value = 0.6;
            windGain = ctxA.createGain();
            windGain.gain.value = 0.5;
            noise.connect(windFilter).connect(windGain).connect(master);
            noise.start();

            const lfo = ctxA.createOscillator();
            lfo.frequency.value = 0.07;
            const lfoGain = ctxA.createGain();
            lfoGain.gain.value = 220;
            lfo.connect(lfoGain).connect(windFilter.frequency);
            lfo.start();

            // Bird & cricket buses (crossfaded by daylight)
            birdGain = ctxA.createGain();
            birdGain.gain.value = 0;
            birdGain.connect(master);
            cricketGain = ctxA.createGain();
            cricketGain.gain.value = 0;
            cricketGain.connect(master);
        };

        /** One chirp: two quick descending sine sweeps. */
        const chirp = () => {
            if (!running || !ctxA) return;
            const t0 = ctxA.currentTime;
            const base = 2100 + Math.random() * 1400;
            for (let n = 0; n < 2 + Math.floor(Math.random() * 2); n++) {
                const osc = ctxA.createOscillator();
                const g = ctxA.createGain();
                const t = t0 + n * 0.14;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(base, t);
                osc.frequency.exponentialRampToValueAtTime(base * 0.72, t + 0.11);
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.16 + Math.random() * 0.1, t + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
                osc.connect(g).connect(birdGain);
                osc.start(t);
                osc.stop(t + 0.16);
            }
        };

        /** Cricket: rapid pulsing triangle at high frequency. */
        const cricketBurst = () => {
            if (!running || !ctxA) return;
            const t0 = ctxA.currentTime;
            const reps = 5 + Math.floor(Math.random() * 4);
            const freq = 4200 + Math.random() * 600;
            for (let n = 0; n < reps; n++) {
                const osc = ctxA.createOscillator();
                const g = ctxA.createGain();
                const t = t0 + n * 0.055;
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.05, t + 0.008);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
                osc.connect(g).connect(cricketGain);
                osc.start(t);
                osc.stop(t + 0.05);
            }
        };

        /** Called every frame with current daylight factor. */
        const update = (daylight, frame) => {
            if (!running || !ctxA) return;
            birdGain.gain.setTargetAtTime(clamp(daylight * 1.1, 0, 1) * 0.8, ctxA.currentTime, 0.4);
            cricketGain.gain.setTargetAtTime(clamp((1 - daylight) * 1.2 - 0.12, 0, 1) * 0.8, ctxA.currentTime, 0.4);
            windGain.gain.setTargetAtTime(lerp(0.34, 0.18, daylight), ctxA.currentTime, 0.6);

            // Schedule organic chirps (day) / crickets (night)
            chirpTimer -= 1;
            cricketTimer -= 1;
            if (daylight > 0.3 && chirpTimer <= 0) {
                chirp();
                chirpTimer = 90 + Math.random() * 260;
            }
            if (daylight < 0.4 && cricketTimer <= 0) {
                cricketBurst();
                cricketTimer = 70 + Math.random() * 180;
            }
        };

        const setOn = (on) => {
            if (on) {
                start();
                if (ctxA && ctxA.state === 'suspended') ctxA.resume();
            } else if (running && ctxA) {
                master.gain.setTargetAtTime(0, ctxA.currentTime, 0.4);
            }
            return on && running;
        };

        const isRunning = () => running;
        return { setOn, update, isRunning };
    })();

    // =========================================================================
    // === Interactions ===
    // =========================================================================

    // --- Custom cursor with lazy-follow physics ---
    const cursor = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        glowX: window.innerWidth / 2,
        glowY: window.innerHeight / 2
    };

    window.addEventListener('pointermove', (e) => {
        cursor.x = e.clientX;
        cursor.y = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerdown', () => bodyEl.classList.add('cursor-down'));
    window.addEventListener('pointerup', () => bodyEl.classList.remove('cursor-down'));

    const stepCursor = () => {
        // Ring snaps close, glow trails with easing
        cursor.glowX = lerp(cursor.glowX, cursor.x, 0.09);
        cursor.glowY = lerp(cursor.glowY, cursor.y, 0.09);
        els.cursorRing.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0)`;
        els.cursorGlow.style.transform = `translate3d(${cursor.glowX}px, ${cursor.glowY}px, 0)`;
    };

    // --- Time slider drag ---
    const track = els.timeTrack;
    let dragging = false;

    const hourFromEvent = (e) => {
        const rect = track.getBoundingClientRect();
        const t = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        return t * 24;
    };

    const onTrackDown = (e) => {
        dragging = true;
        timeState.auto = false;
        els.autoBtn.classList.remove('active');
        timeState.target = hourFromEvent(e);
        timeState.value = timeState.target; // immediate while dragging
        timeState.velocity = 0;
        e.preventDefault();
    };

    const onTrackMove = (e) => {
        if (!dragging) return;
        timeState.target = hourFromEvent(e);
        timeState.value = timeState.target;
    };

    const onTrackUp = () => { dragging = false; };

    track.addEventListener('pointerdown', onTrackDown);
    window.addEventListener('pointermove', onTrackMove, { passive: true });
    window.addEventListener('pointerup', onTrackUp);

    // --- AUTO toggle ---
    els.autoBtn.addEventListener('click', () => {
        timeState.auto = !timeState.auto;
        els.autoBtn.classList.toggle('active', timeState.auto);
        if (timeState.auto) timeState.target = timeState.value;
    });

    // --- Ambience toggle ---
    let soundOn = false;
    els.soundBtn.addEventListener('click', () => {
        soundOn = ambience.setOn(!soundOn);
        els.soundBtn.classList.toggle('sound-on', soundOn);
        els.soundBtn.classList.toggle('active', soundOn);
        els.hudSound.textContent = soundOn ? 'ON' : 'OFF';
        els.hudSound.classList.toggle('bright', soundOn);
    });

    // --- Phase cards: spring-jump to a moment ---
    els.phaseGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.phase-card');
        if (!card) return;
        timeState.auto = false;
        els.autoBtn.classList.remove('active');
        timeState.target = parseFloat(card.dataset.hour);
        // Burst of wind seeds at the destination moment
        for (let i = 0; i < 26; i++) {
            seeds.push({
                x: Math.random() * cw,
                y: ch * (0.4 + Math.random() * 0.55),
                vx: 0.4 + Math.random() * 1.1,
                vy: -(0.2 + Math.random() * 0.5),
                life: 0.7 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    });

    // --- Click on sky: ripple + a small flock of moment particles ---
    window.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.time-dock, .phase-card, .theme-switcher, .back-link, .hud-panel, .dock-btn')) return;
        ripples.push({ x: e.clientX, y: e.clientY, life: 0, maxR: 120 + Math.random() * 90 });
        ripples.push({ x: e.clientX, y: e.clientY, life: -0.12, maxR: 70 + Math.random() * 60 });
    });

    // --- Theme switcher ---
    els.themeSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-btn');
        if (!btn) return;
        document.documentElement.setAttribute('data-theme', btn.dataset.theme);
        for (const b of els.themeSwitcher.children) {
            b.classList.toggle('active', b === btn);
        }
    });

    // --- Hero card gentle 3D tilt toward cursor ---
    els.heroCard.addEventListener('pointermove', (e) => {
        const rect = els.heroCard.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        els.heroCard.style.transform = `perspective(1100px) rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 3.4).toFixed(2)}deg)`;
    });

    els.heroCard.addEventListener('pointerleave', () => {
        els.heroCard.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
    });

    // =========================================================================
    // === Ink Reveal (staggered line entrance) ===
    // =========================================================================

    const initInkReveal = () => {
        document.querySelectorAll('.ink-line').forEach((el) => {
            el.style.setProperty('--d', el.dataset.delay || '0');
        });
        document.querySelectorAll('.phase-card').forEach((card, i) => {
            card.style.setProperty('--d', String(120 + i * 90));
        });
    };

    // =========================================================================
    // === Main Loop ===
    // =========================================================================

    const loop = (now) => {
        stepTime();
        const hour = ((timeState.value % 24) + 24) % 24;
        const palette = skyAt(hour);
        const daylight = daylightAt(hour);

        renderSkyDom(hour, palette);
        renderCanvas(hour, palette, now);
        renderDock(hour);
        renderHud(hour);
        stepCursor();
        ambience.update(daylight);

        requestAnimationFrame(loop);
    };

    // =========================================================================
    // === Boot ===
    // =========================================================================

    const init = () => {
        resizeCanvas();
        spawnStars();
        spawnClouds();
        spawnFireflies();
        for (let i = 0; i < 24; i++) {
            seeds.push({
                x: Math.random() * cw,
                y: ch * (0.4 + Math.random() * 0.55),
                vx: 0.3 + Math.random() * 0.8,
                vy: -(0.15 + Math.random() * 0.4),
                life: 0.4 + Math.random() * 0.6,
                phase: Math.random() * Math.PI * 2
            });
        }
        initInkReveal();
        requestAnimationFrame(loop);
    };

    window.addEventListener('resize', () => {
        resizeCanvas();
        spawnStars();
        spawnFireflies();
    });

    init();
})();
