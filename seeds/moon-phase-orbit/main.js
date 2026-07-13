/**
 * Moon Phase Orbit — 月相轨道
 * 沉浸式天体律动 · 交互逻辑
 * maintainer: EDEN
 */

(function () {
    'use strict';

    // === Constants ===
    const SYNODIC_MONTH = 29.53058867; // 朔望月 (days)
    const EPOCH_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
    const DAY_MS = 86400000;
    const KM_BASE = 384400;
    const KM_VARIATION = 21000;

    const PHASE_NAMES = [
        { name: '新月', en: 'NEW MOON', lunar: '朔' },
        { name: '蛾眉月', en: 'WAXING CRESCENT', lunar: '蛾眉' },
        { name: '上弦月', en: 'FIRST QUARTER', lunar: '上弦' },
        { name: '盈凸月', en: 'WAXING GIBBOUS', lunar: '盈凸' },
        { name: '满月', en: 'FULL MOON', lunar: '望' },
        { name: '亏凸月', en: 'WANING GIBBOUS', lunar: '亏凸' },
        { name: '下弦月', en: 'LAST QUARTER', lunar: '下弦' },
        { name: '残月', en: 'WANING CRESCENT', lunar: '残月' }
    ];

    // === DOM Elements ===
    const body = document.body;
    const starfieldCanvas = document.getElementById('starfield');
    const orbitCanvas = document.getElementById('orbit-canvas');
    const cursorGlow = document.getElementById('cursor-glow');
    const orbitStage = document.getElementById('orbit-stage');
    const moonOrbit = document.getElementById('moon-orbit');
    const moonBody = document.getElementById('moon-body');
    const moonShadow = document.getElementById('moon-shadow');
    const centralGlow = document.getElementById('central-glow');
    const centralLabel = document.getElementById('central-label');
    const centralPercent = document.getElementById('central-percent');
    const phaseBadge = document.getElementById('phase-badge');
    const illumination = document.getElementById('illumination');
    const phaseName = document.getElementById('phase-name');
    const orbitAngleEl = document.getElementById('orbit-angle');
    const illumPercent = document.getElementById('illum-percent');
    const moonAge = document.getElementById('moon-age');
    const moonDistance = document.getElementById('moon-distance');
    const lunarText = document.getElementById('lunar-text');
    const trackFill = document.getElementById('track-fill');
    const trackHandle = document.getElementById('track-handle');
    const phaseNodes = document.querySelectorAll('.phase-node');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const speedBtns = document.querySelectorAll('.speed-btn');
    const dateInput = document.getElementById('date-input');
    const resetBtn = document.getElementById('reset-btn');
    const autoBtn = document.getElementById('auto-btn');
    const fpsCounter = document.getElementById('fps-counter');
    const cycleCounter = document.getElementById('cycle-counter');

    // === State ===
    const state = {
        phase: 0.5,
        targetPhase: 0.5,
        speed: 1,
        isAuto: true,
        isDragging: false,
        dragStart: 0,
        dragPhaseStart: 0,
        cycleCount: 0,
        lastPhaseFloor: 0,
        mouse: { x: 0, y: 0, prevX: 0, prevY: 0 },
        orbitAngle: 0,
        particles: [],
        stars: [],
        ripples: []
    };

    // === Utility ===
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
    function mod(a, n) { return ((a % n) + n) % n; }

    function getPhaseIndex(phase) {
        return Math.floor(mod(phase + 0.0625, 1) * 8) % 8;
    }

    function getPhaseName(phase) {
        return PHASE_NAMES[getPhaseIndex(phase)];
    }

    function getIllumination(phase) {
        const angle = phase * Math.PI * 2;
        return (1 - Math.cos(angle)) / 2;
    }

    function getMoonAge(phase) {
        return phase * SYNODIC_MONTH;
    }

    function getMoonDistance(phase) {
        const anomaly = phase * Math.PI * 2;
        return Math.round(KM_BASE + KM_VARIATION * Math.cos(anomaly * 2));
    }

    function getLunarDay(phase) {
        return Math.floor(phase * SYNODIC_MONTH) + 1;
    }

    function getLunarDayText(day) {
        if (day === 1) return '初一';
        if (day === 2) return '初二';
        if (day === 3) return '初三';
        if (day === 15) return '十五';
        if (day === 16) return '十六';
        if (day <= 10) return '初' + cnNum(day);
        if (day <= 14) return '十' + (day === 10 ? '' : cnNum(day - 10));
        if (day === 15) return '十五';
        if (day === 16) return '十六';
        if (day === 17) return '十七';
        if (day === 18) return '十八';
        if (day === 19) return '十九';
        if (day === 20) return '二十';
        if (day === 21) return '廿一';
        if (day === 22) return '廿二';
        if (day === 23) return '廿三';
        if (day === 24) return '廿四';
        if (day === 25) return '廿五';
        if (day === 26) return '廿六';
        if (day === 27) return '廿七';
        if (day === 28) return '廿八';
        if (day === 29) return '廿九';
        if (day === 30) return '三十';
        return '初一';
    }

    function cnNum(n) {
        const map = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
        return map[n] || '';
    }

    function dateToPhase(date) {
        const diff = date.getTime() - EPOCH_NEW_MOON;
        const cycles = diff / (SYNODIC_MONTH * DAY_MS);
        return mod(cycles, 1);
    }

    function phaseToDate(phase, baseDate) {
        const base = baseDate || new Date();
        const basePhase = dateToPhase(base);
        let delta = phase - basePhase;
        if (delta < -0.5) delta += 1;
        if (delta > 0.5) delta -= 1;
        return new Date(base.getTime() + delta * SYNODIC_MONTH * DAY_MS);
    }

    // === Moon Shadow Rendering ===
    function updateMoonShadow(phase) {
        // phase: 0 = new moon (fully shadowed), 0.5 = full moon (fully lit)
        // We use clip-path to create the terminator
        const illum = getIllumination(phase);
        const isWaxing = phase < 0.5;
        const angle = phase * Math.PI * 2;
        const cosAngle = Math.cos(angle);

        // Use two semi-ellipses to approximate the terminator
        // The shadow covers the unlit portion
        const rx = Math.abs(cosAngle) * 50;
        const shadowVisible = 1 - illum;

        if (shadowVisible < 0.001) {
            moonShadow.style.clipPath = 'circle(0% at 50% 50%)';
            return;
        }

        if (illum < 0.001) {
            moonShadow.style.clipPath = 'circle(50% at 50% 50%)';
            return;
        }

        if (isWaxing) {
            // Waxing: left side is dark
            if (phase < 0.25) {
                // Crescent: shadow covers most, lit crescent on right
                moonShadow.style.clipPath = `polygon(0% 0%, ${50 - rx}% 0%, ${50 - rx}% 100%, 0% 100%, 0% 0%, 50% 0%, ${50 + rx}% 50%, 50% 100%, 0% 100%)`;
            } else {
                // Gibbous: shadow is crescent on left
                moonShadow.style.clipPath = `polygon(0% 0%, 50% 0%, ${50 + rx}% 50%, 50% 100%, 0% 100%)`;
            }
        } else {
            // Waning: right side is dark
            if (phase > 0.75) {
                // Crescent: shadow covers most, lit crescent on left
                moonShadow.style.clipPath = `polygon(100% 0%, 100% 100%, 50% 100%, ${50 + rx}% 50%, 50% 0%, 100% 0%)`;
            } else {
                // Gibbous: shadow is crescent on right
                moonShadow.style.clipPath = `polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%, ${50 - rx}% 50%)`;
            }
        }
    }

    // === UI Update ===
    function updateUI() {
        const phase = state.phase;
        const illum = getIllumination(phase);
        const age = getMoonAge(phase);
        const dist = getMoonDistance(phase);
        const phaseInfo = getPhaseName(phase);
        const lunarDay = getLunarDay(phase);

        const angle = (phase * 360).toFixed(1);
        const illumPct = (illum * 100).toFixed(1);

        phaseBadge.textContent = phaseInfo.en;
        illumination.textContent = illumPct + '%';
        phaseName.textContent = phaseInfo.name;
        orbitAngleEl.textContent = angle + '°';
        illumPercent.textContent = illumPct + '%';
        moonAge.textContent = age.toFixed(1) + ' 天';
        moonDistance.textContent = dist.toLocaleString() + ' km';
        centralLabel.textContent = phaseInfo.en;
        centralPercent.textContent = illumPct + '%';
        lunarText.textContent = '农历 · ' + getLunarDayText(lunarDay) + ' · ' + phaseInfo.lunar;

        // Timeline track
        const trackPct = phase * 100;
        trackFill.style.width = trackPct + '%';
        trackHandle.style.left = trackPct + '%';

        // Phase nodes active state
        const activeIdx = getPhaseIndex(phase);
        phaseNodes.forEach((node, i) => {
            if (i === activeIdx) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        });

        // Central glow intensity
        centralGlow.style.opacity = 0.3 + illum * 0.7;

        // Moon surface glow
        const moonSurface = moonBody.querySelector('.moon-surface');
        if (moonSurface) {
            moonSurface.style.boxShadow =
                `0 0 ${30 + illum * 60}px var(--glow),` +
                `0 0 ${60 + illum * 120}px var(--glow),` +
                `inset -8px -8px 25px rgba(0, 0, 0, 0.3)`;
        }

        updateMoonShadow(phase);
    }

    // === Orbit Animation ===
    function updateOrbitPosition(dt) {
        state.orbitAngle += dt * 0.0003 * Math.abs(state.speed);
        if (state.speed > 0) {
            state.orbitAngle = state.phase * Math.PI * 2;
        }

        const radius = getOrbitRadius();
        const stageRect = orbitStage.getBoundingClientRect();
        const cx = stageRect.width / 2;
        const cy = stageRect.height / 2;

        const angle = state.phase * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        moonOrbit.style.transform = `rotate(${state.phase * 360}deg)`;

        // Draw orbit trail on canvas
        drawOrbitTrail(cx, cy, radius, angle);
    }

    function getOrbitRadius() {
        const stageRect = orbitStage.getBoundingClientRect();
        const cssRadius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--orbit-radius'));
        return Math.min(cssRadius, Math.min(stageRect.width, stageRect.height) / 2 - 80);
    }

    // === Canvas: Starfield ===
    function initStarfield() {
        const ctx = starfieldCanvas.getContext('2d');
        resizeCanvases();

        state.stars = [];
        const count = Math.floor((window.innerWidth * window.innerHeight) / 4000);
        for (let i = 0; i < count; i++) {
            state.stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                r: Math.random() * 1.2 + 0.3,
                opacity: Math.random() * 0.8 + 0.2,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.005,
                vx: (Math.random() - 0.5) * 0.02,
                vy: (Math.random() - 0.5) * 0.02
            });
        }
    }

    function drawStarfield(time) {
        const ctx = starfieldCanvas.getContext('2d');
        ctx.clearRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);

        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-3').trim();

        state.stars.forEach(star => {
            star.x += star.vx;
            star.y += star.vy;
            if (star.x < 0) star.x = window.innerWidth;
            if (star.x > window.innerWidth) star.x = 0;
            if (star.y < 0) star.y = window.innerHeight;
            if (star.y > window.innerHeight) star.y = 0;

            star.twinkle += star.speed;
            const opacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fill();

            if (star.r > 0.8) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.1})`;
                ctx.fill();
            }
        });
    }

    // === Canvas: Orbit Trail ===
    function drawOrbitTrail(cx, cy, radius, moonAngle) {
        const ctx = orbitCanvas.getContext('2d');
        ctx.clearRect(0, 0, orbitCanvas.width, orbitCanvas.height);

        const stageRect = orbitStage.getBoundingClientRect();
        const offsetX = stageRect.left + stageRect.width / 2;
        const offsetY = stageRect.top + stageRect.height / 2;

        // Draw orbit path
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw trail behind moon
        const trailSteps = 60;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim();

        for (let i = 0; i < trailSteps; i++) {
            const t = i / trailSteps;
            const trailAngle = moonAngle - t * 0.8;
            const tx = offsetX + Math.cos(trailAngle) * radius;
            const ty = offsetY + Math.sin(trailAngle) * radius;
            const alpha = (1 - t) * 0.15;

            ctx.beginPath();
            ctx.arc(tx, ty, (1 - t) * 3 + 0.5, 0, Math.PI * 2);
            ctx.fillStyle = accent2 + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.fill();
        }

        // Draw particles
        state.particles.forEach(p => {
            p.life -= 0.015;
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97;
            p.vy *= 0.97;

            if (p.life > 0) {
                const alpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fill();
            }
        });

        state.particles = state.particles.filter(p => p.life > 0);

        // Draw ripples
        state.ripples.forEach(r => {
            r.radius += 2;
            r.life -= 0.012;
            if (r.life > 0) {
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${r.life * 0.3})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        state.ripples = state.ripples.filter(r => r.life > 0);
    }

    // === Particle Spawn ===
    function spawnParticles(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 0.5;
            state.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: Math.random() * 2 + 1,
                life: Math.random() * 0.5 + 0.5
            });
        }
    }

    function spawnRipple(x, y) {
        state.ripples.push({
            x: x,
            y: y,
            radius: 0,
            life: 1
        });
    }

    // === Canvas Resize ===
    function resizeCanvases() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        starfieldCanvas.width = window.innerWidth * dpr;
        starfieldCanvas.height = window.innerHeight * dpr;
        starfieldCanvas.style.width = window.innerWidth + 'px';
        starfieldCanvas.style.height = window.innerHeight + 'px';
        starfieldCanvas.getContext('2d').scale(dpr, dpr);

        orbitCanvas.width = window.innerWidth * dpr;
        orbitCanvas.height = window.innerHeight * dpr;
        orbitCanvas.style.width = window.innerWidth + 'px';
        orbitCanvas.style.height = window.innerHeight + 'px';
        orbitCanvas.getContext('2d').scale(dpr, dpr);
    }

    // === Main Loop ===
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = 0;
    let currentFPS = 60;

    function loop(time) {
        const dt = time - lastTime;
        lastTime = time;

        // FPS counter
        frameCount++;
        fpsTime += dt;
        if (fpsTime >= 1000) {
            currentFPS = Math.round(frameCount * 1000 / fpsTime);
            fpsCounter.textContent = currentFPS + ' FPS';
            frameCount = 0;
            fpsTime = 0;
        }

        // Auto advance phase
        if (state.isAuto && state.speed > 0 && !state.isDragging) {
            const phaseDelta = (dt / 1000) * state.speed / (SYNODIC_MONTH * 10);
            state.phase = mod(state.phase + phaseDelta, 1);

            // Count cycles
            const phaseFloor = Math.floor(state.phase);
            if (state.phase < 0.1 && state.lastPhaseFloor > 0.9) {
                state.cycleCount++;
                cycleCounter.textContent = 'Cycle ' + state.cycleCount;
            }
            state.lastPhaseFloor = state.phase;
        }

        // Smooth phase transition when dragging stops
        if (!state.isDragging) {
            state.phase = lerp(state.phase, state.targetPhase, state.isAuto ? 1 : 0.15);
        }

        updateOrbitPosition(dt);
        updateUI();
        drawStarfield(time);

        requestAnimationFrame(loop);
    }

    // === Interaction: Mouse ===
    document.addEventListener('mousemove', (e) => {
        state.mouse.prevX = state.mouse.x;
        state.mouse.prevY = state.mouse.y;
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;

        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    // === Interaction: Moon Drag ===
    let dragOnMoon = false;

    moonBody.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.isDragging = true;
        dragOnMoon = true;
        state.dragStart = e.clientX;
        state.dragPhaseStart = state.phase;
        state.isAuto = false;
        updateAutoButton();
        document.body.style.cursor = 'none';

        const rect = moonBody.getBoundingClientRect();
        spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
    });

    document.addEventListener('mousemove', (e) => {
        if (!state.isDragging || !dragOnMoon) return;

        const stageRect = orbitStage.getBoundingClientRect();
        const cx = stageRect.left + stageRect.width / 2;
        const cy = stageRect.top + stageRect.height / 2;

        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        let angle = Math.atan2(dy, dx) + Math.PI / 2;
        if (angle < 0) angle += Math.PI * 2;

        state.phase = angle / (Math.PI * 2);
        state.targetPhase = state.phase;
    });

    document.addEventListener('mouseup', () => {
        if (state.isDragging && dragOnMoon) {
            const rect = moonBody.getBoundingClientRect();
            spawnRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        state.isDragging = false;
        dragOnMoon = false;
    });

    // === Interaction: Timeline Drag ===
    let dragOnTrack = false;
    const timelineTrack = document.querySelector('.timeline-track');

    function handleTrackDrag(e) {
        const rect = timelineTrack.getBoundingClientRect();
        const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        state.phase = pct;
        state.targetPhase = pct;
        state.isAuto = false;
        updateAutoButton();
    }

    timelineTrack.addEventListener('mousedown', (e) => {
        dragOnTrack = true;
        state.isDragging = true;
        handleTrackDrag(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (dragOnTrack) handleTrackDrag(e);
    });

    document.addEventListener('mouseup', () => {
        if (dragOnTrack) {
            dragOnTrack = false;
            state.isDragging = false;
        }
    });

    // Phase node click
    phaseNodes.forEach(node => {
        node.addEventListener('click', () => {
            const phase = parseFloat(node.dataset.phase);
            state.targetPhase = phase;
            state.isAuto = false;
            updateAutoButton();

            // Animate to target
            const startPhase = state.phase;
            let delta = phase - startPhase;
            if (delta < -0.5) delta += 1;
            if (delta > 0.5) delta -= 1;
            const targetPhase = mod(startPhase + delta, 1);

            const duration = 800;
            const startTime = performance.now();

            function animateToTarget(t) {
                const elapsed = t - startTime;
                const progress = clamp(elapsed / duration, 0, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                state.phase = mod(startPhase + delta * eased, 1);

                if (progress < 1) {
                    requestAnimationFrame(animateToTarget);
                } else {
                    state.phase = targetPhase;
                }
            }
            requestAnimationFrame(animateToTarget);
        });
    });

    // === Interaction: Scroll ===
    let scrollAccumulator = 0;
    window.addEventListener('wheel', (e) => {
        e.preventDefault();
        scrollAccumulator += e.deltaY * 0.0005;
        if (Math.abs(scrollAccumulator) > 0.001) {
            state.phase = mod(state.phase + scrollAccumulator, 1);
            state.targetPhase = state.phase;
            state.isAuto = false;
            updateAutoButton();
            scrollAccumulator *= 0.8;
        }
    }, { passive: false });

    // === Interaction: Theme ===
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            body.dataset.theme = btn.dataset.theme;
        });
    });

    // === Interaction: Speed ===
    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            speedBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.speed = parseFloat(btn.dataset.speed);
            if (state.speed > 0) {
                state.isAuto = true;
                updateAutoButton();
            }
        });
    });

    // === Interaction: Date Input ===
    dateInput.addEventListener('change', (e) => {
        const date = new Date(e.target.value);
        if (!isNaN(date.getTime())) {
            state.phase = dateToPhase(date);
            state.targetPhase = state.phase;
            state.isAuto = false;
            updateAutoButton();
        }
    });

    // === Interaction: Reset ===
    resetBtn.addEventListener('click', () => {
        const now = new Date();
        state.phase = dateToPhase(now);
        state.targetPhase = state.phase;
        state.isAuto = true;
        state.speed = 1;
        state.cycleCount = 0;
        cycleCounter.textContent = 'Cycle 0';

        speedBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.speed-btn[data-speed="1"]').classList.add('active');
        updateAutoButton();
        updateDateInput();
    });

    // === Interaction: Auto Toggle ===
    autoBtn.addEventListener('click', () => {
        state.isAuto = !state.isAuto;
        updateAutoButton();
    });

    function updateAutoButton() {
        const icon = document.getElementById('auto-play-icon');
        if (state.isAuto) {
            autoBtn.style.color = 'var(--accent)';
            autoBtn.style.borderColor = 'var(--accent-2)';
            icon.setAttribute('points', '5 3 19 12 5 21 5 3');
        } else {
            autoBtn.style.color = '';
            autoBtn.style.borderColor = '';
            icon.setAttribute('points', '6 4 6 20 10 20 10 4 14 4 14 20 18 20 18 4');
        }
    }

    // === Date Input Init ===
    function updateDateInput() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // === Keyboard ===
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                state.phase = mod(state.phase - 0.02, 1);
                state.targetPhase = state.phase;
                state.isAuto = false;
                updateAutoButton();
                break;
            case 'ArrowRight':
                state.phase = mod(state.phase + 0.02, 1);
                state.targetPhase = state.phase;
                state.isAuto = false;
                updateAutoButton();
                break;
            case ' ':
                e.preventDefault();
                state.isAuto = !state.isAuto;
                updateAutoButton();
                break;
            case 'r':
            case 'R':
                resetBtn.click();
                break;
        }
    });

    // === Window Resize ===
    window.addEventListener('resize', () => {
        resizeCanvases();
        initStarfield();
    });

    // === Init ===
    function init() {
        const now = new Date();
        state.phase = dateToPhase(now);
        state.targetPhase = state.phase;
        updateDateInput();
        resizeCanvases();
        initStarfield();
        updateUI();
        updateAutoButton();
        requestAnimationFrame(loop);
    }

    // Wait for fonts to load
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(init);
    } else {
        init();
    }
})();
