/**
 * Seasonal Arbor Walk · 四季林间漫步
 * 程序化生成大树 + 季节流变 + 风场交互 + 摇树粒子
 * Vanilla JS · Zero Build
 */
(() => {
    'use strict';

    // === DOM Elements ===
    const canvas = document.getElementById('arbor-canvas');
    const ctx = canvas.getContext('2d');
    const heroLines = document.querySelectorAll('.ink-line');
    const track = document.getElementById('season-track');
    const fill = document.getElementById('season-fill');
    const thumb = document.getElementById('season-thumb');
    const markers = document.querySelectorAll('.season-markers .marker');
    const readout = document.getElementById('season-readout');
    const autoBtn = document.getElementById('auto-btn');
    const hudSeason = document.getElementById('hud-season');
    const hudProgress = document.getElementById('hud-progress');
    const hudLeaves = document.getElementById('hud-leaves');
    const hudWind = document.getElementById('hud-wind');
    const seasonGlyph = document.getElementById('season-glyph');
    const seasonName = document.getElementById('season-name');
    const seasonPoem = document.getElementById('season-poem');
    const cursorGlow = document.getElementById('cursor-glow');
    const cursorRing = document.getElementById('cursor-ring');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // === Season Definitions ===
    const SEASONS = [
        {
            key: 'SPRING', cn: '春 · Spring', glyph: '❀', poem: '嫩芽在风里学会呼吸，粉色落在肩头。',
            leaf: [244, 167, 195], leafAlt: [168, 216, 250], density: 0.55, snow: 0
        },
        {
            key: 'SUMMER', cn: '夏 · Summer', glyph: '🌿', poem: '浓荫是一把绿色的伞，蝉声漫过正午。',
            leaf: [111, 207, 151], leafAlt: [90, 180, 120], density: 1.0, snow: 0
        },
        {
            key: 'AUTUMN', cn: '秋 · Autumn', glyph: '🍁', poem: '每一片叶子都在练习告别，风替它们鼓掌。',
            leaf: [242, 153, 74], leafAlt: [232, 96, 72], density: 0.8, snow: 0
        },
        {
            key: 'WINTER', cn: '冬 · Winter', glyph: '❄', poem: '枝桠写满留白，雪把整棵树读成一首诗。',
            leaf: [220, 236, 255], leafAlt: [200, 220, 245], density: 0.0, snow: 1
        }
    ];

    // === State ===
    const state = {
        season: 0.001,          // 0..1 year loop (target)
        seasonDisplay: 0.001,   // smoothed with spring physics
        seasonVel: 0,
        auto: true,
        shake: 0,               // tree shake impulse (decays)
        windBase: 0,
        wind: 0,                // smoothed wind value
        mouse: { x: 0.5, y: 0.5 },
        pointer: { x: -999, y: -999 },
        time: 0,
        lastSeasonIndex: 0
    };

    // === Deterministic PRNG ===
    function mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // === Lerp / Utils ===
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    function mixRGB(c1, c2, t) {
        return [
            Math.round(lerp(c1[0], c2[0], t)),
            Math.round(lerp(c1[1], c2[1], t)),
            Math.round(lerp(c1[2], c2[2], t))
        ];
    }

    function rgba(c, a) {
        return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    }

    /** Interpolate season palette across the year loop (0..1). */
    function seasonBlend(yearT) {
        const pos = yearT * 4;
        const i = Math.floor(pos) % 4;
        const j = (i + 1) % 4;
        const t = pos - Math.floor(pos);
        // smoothstep blend between adjacent seasons
        const s = t * t * (3 - 2 * t);
        const a = SEASONS[i];
        const b = SEASONS[j];
        return {
            key: t < 0.5 ? a.key : b.key,
            leaf: mixRGB(a.leaf, b.leaf, s),
            leafAlt: mixRGB(a.leafAlt, b.leafAlt, s),
            density: lerp(a.density, b.density, s),
            snow: lerp(a.snow, b.snow, s),
            index: t < 0.5 ? i : j
        };
    }

    // === Tree Generation ===
    const tree = { branches: [], leaves: [] };

    function buildTree() {
        tree.branches = [];
        tree.leaves = [];
        const rand = mulberry32(20261023);

        const baseLen = Math.min(canvas.height, canvas.width) * 0.16;
        const baseW = Math.max(10, baseLen * 0.16);

        const root = {
            x1: 0, y1: 0, x2: 0, y2: -baseLen,
            w1: baseW, w2: baseW * 0.7,
            depth: 0, angle: -Math.PI / 2, sway: rand() * Math.PI * 2
        };
        tree.branches.push(root);

        grow(root.x2, root.y2, -Math.PI / 2, baseLen, baseW * 0.7, 1, rand, 0);

        function grow(x, y, angle, len, width, depth, rnd, _acc) {
            if (depth > 8 || len < 4 || width < 0.4) {
                // leaf cluster at branch tip
                const leafCount = 3 + Math.floor(rnd() * 4);
                for (let k = 0; k < leafCount; k++) {
                    tree.leaves.push({
                        x, y,
                        ox: (rnd() - 0.5) * 26,
                        oy: (rnd() - 0.5) * 26,
                        size: 2.5 + rnd() * 3.5,
                        phase: rnd() * Math.PI * 2,
                        alt: rnd() > 0.5,
                        seedT: rnd() * 1000,
                        visible: rnd() // determines threshold vs density
                    });
                }
                return;
            }

            const branches = depth < 2 ? 2 : (rnd() > 0.7 ? 3 : 2);
            for (let i = 0; i < branches; i++) {
                const spread = lerp(0.42, 0.24, depth / 8);
                const dir = branches === 2 ? (i === 0 ? -1 : 1) : (i - 1);
                const newAngle = angle + dir * spread * (0.7 + rnd() * 0.6);
                const newLen = len * lerp(0.78, 0.68, rnd());
                const newWidth = width * 0.68;
                const sway = rnd() * Math.PI * 2;
                const nx = x + Math.cos(newAngle) * newLen;
                const ny = y + Math.sin(newAngle) * newLen;
                const branch = {
                    x1: x, y1: y, x2: nx, y2: ny,
                    w1: width, w2: newWidth,
                    depth, angle: newAngle, sway
                };
                tree.branches.push(branch);
                grow(nx, ny, newAngle, newLen, newWidth, depth + 1, rnd, 0);
            }
        }
    }

    // === Particles ===
    const fallers = [];   // ambient falling petals / leaves / snow
    const bursts = [];    // shake burst particles
    const fireflies = []; // summer evening sparks

    function spawnFaller(palette) {
        fallers.push({
            x: Math.random() * canvas.width,
            y: -20,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.4 + Math.random() * 0.9,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.04,
            size: 3 + Math.random() * 5,
            color: Math.random() > 0.5 ? palette.leaf : palette.leafAlt,
            snow: palette.snow > 0.5 && Math.random() < palette.snow,
            phase: Math.random() * Math.PI * 2
        });
    }

    function spawnBurst(x, y, palette, count) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 4;
            bursts.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 2,
                size: 2 + Math.random() * 4.5,
                life: 1,
                decay: 0.008 + Math.random() * 0.012,
                color: Math.random() > 0.5 ? palette.leaf : palette.leafAlt
            });
        }
    }

    function initFireflies() {
        fireflies.length = 0;
        for (let i = 0; i < 14; i++) {
            fireflies.push({
                x: Math.random(), y: 0.3 + Math.random() * 0.6,
                phase: Math.random() * Math.PI * 2,
                speed: 0.2 + Math.random() * 0.5
            });
        }
    }
    initFireflies();

    // === Resize ===
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildTree();
    }
    window.addEventListener('resize', resize);
    resize();

    // === Tree Drawing (wind sway + shake impulse) ===
    function drawTree(palette) {
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const originX = cssW * 0.5;
        const originY = cssH * 0.92;
        const scale = Math.min(cssW, cssH) / 900;

        const windSway = state.wind * 14 + Math.sin(state.time * 0.0012) * 3;
        const shakeX = Math.sin(state.time * 0.02) * state.shake * 18;

        // branches sorted by depth so thick trunk renders first
        const sorted = tree.branches;

        for (const b of sorted) {
            const depthFactor = b.depth / 8;
            const sway = Math.sin(state.time * 0.0016 + b.sway) * (1 + depthFactor * 3) * windSway * 0.14
                + shakeX * depthFactor * depthFactor;

            const x1 = originX + b.x1 * scale + sway * (1 - b.depth / 10);
            const y1 = originY + b.y1 * scale;
            const x2 = originX + b.x2 * scale + sway;
            const y2 = originY + b.y2 * scale;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = Math.max(0.5, b.w1 * scale);
            ctx.lineCap = 'round';
            const bark = 18 + depthFactor * 10;
            ctx.strokeStyle = `rgba(${bark + 14}, ${bark + 10}, ${bark + 16}, 0.9)`;
            ctx.stroke();
        }

        // leaves: density gates visibility; winter shows none
        let visibleCount = 0;
        for (const leaf of tree.leaves) {
            if (leaf.visible > palette.density) continue;
            visibleCount++;

            const sway = Math.sin(state.time * 0.0022 + leaf.phase) * (2.5 + state.wind * 6)
                + Math.sin(state.time * 0.02 + leaf.phase) * state.shake * 6;
            const lx = originX + (leaf.x + leaf.ox) * scale + sway;
            const ly = originY + (leaf.y + leaf.oy) * scale;

            const color = leaf.alt ? palette.leafAlt : palette.leaf;
            const size = leaf.size * scale * (0.85 + Math.sin(state.time * 0.003 + leaf.seedT) * 0.15);

            ctx.beginPath();
            ctx.ellipse(lx, ly, size, size * 0.65, leaf.phase + sway * 0.05, 0, Math.PI * 2);
            ctx.fillStyle = rgba(color, 0.85);
            ctx.fill();

            // winter: snow caps on invisible leaf positions are skipped; add glow in spring
            if (palette.snow < 0.3 && leaf.visible < palette.density * 0.4) {
                ctx.beginPath();
                ctx.ellipse(lx, ly, size * 1.6, size, 0, 0, Math.PI * 2);
                ctx.fillStyle = rgba(color, 0.12);
                ctx.fill();
            }
        }
        return visibleCount;
    }

    // === Snow caps on branches (winter) ===
    function drawSnowCaps(palette) {
        if (palette.snow < 0.1) return;
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const originX = cssW * 0.5;
        const originY = cssH * 0.92;
        const scale = Math.min(cssW, cssH) / 900;

        ctx.fillStyle = `rgba(235, 245, 255, ${palette.snow * 0.5})`;
        for (const b of tree.branches) {
            if (b.depth > 5 || b.w1 < 3) continue;
            const depthFactor = b.depth / 8;
            const sway = Math.sin(state.time * 0.0016 + b.sway) * (1 + depthFactor * 3) * (state.wind * 14 + 3) * 0.14;
            const mx = originX + ((b.x1 + b.x2) / 2) * scale + sway;
            const my = originY + ((b.y1 + b.y2) / 2) * scale;
            ctx.beginPath();
            ctx.ellipse(mx, my - b.w1 * scale * 0.5, b.w1 * scale * 0.7, b.w1 * scale * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // === Fireflies (summer dusk ambience) ===
    function drawFireflies(palette) {
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const summerNess = clamp(1 - Math.abs(state.seasonDisplay - 0.375) * 5, 0, 1);
        if (summerNess <= 0.02) return;
        for (const f of fireflies) {
            const fx = (f.x + Math.sin(state.time * 0.0008 * f.speed + f.phase) * 0.06) * cssW;
            const fy = (f.y + Math.cos(state.time * 0.0006 * f.speed + f.phase) * 0.04) * cssH;
            const pulse = 0.4 + 0.6 * Math.abs(Math.sin(state.time * 0.002 * f.speed + f.phase));
            const r = 2.2 * pulse;
            const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 4);
            g.addColorStop(0, `rgba(220, 255, 180, ${0.7 * summerNess * pulse})`);
            g.addColorStop(1, 'rgba(220, 255, 180, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(fx, fy, r * 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // === Ground ===
    function drawGround(palette) {
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const gy = cssH * 0.92;

        const grad = ctx.createLinearGradient(0, gy, 0, cssH);
        const snow = palette.snow;
        grad.addColorStop(0, `rgba(${lerp(30, 200, snow)}, ${lerp(36, 215, snow)}, ${lerp(46, 235, snow)}, 0.35)`);
        grad.addColorStop(1, `rgba(${lerp(16, 160, snow)}, ${lerp(20, 180, snow)}, ${lerp(30, 205, snow)}, 0.6)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, gy + 6);
        ctx.quadraticCurveTo(cssW * 0.5, gy - 10, cssW, gy + 6);
        ctx.lineTo(cssW, cssH);
        ctx.lineTo(0, cssH);
        ctx.closePath();
        ctx.fill();
    }

    // === Particles Update / Draw ===
    function updateFallers(palette, dt) {
        const target = Math.round(40 + palette.density * 50 + palette.snow * 90);
        while (fallers.length < target) spawnFaller(palette);

        for (let i = fallers.length - 1; i >= 0; i--) {
            const p = fallers[i];
            p.x += p.vx + Math.sin(state.time * 0.002 + p.phase) * (p.snow ? 0.8 : 0.5) + state.wind * 2;
            p.y += p.vy * dt;
            p.rot += p.vr * dt;
            if (p.y > window.innerHeight + 30 || fallers.length > target + 20) {
                fallers.splice(i, 1);
                continue;
            }
            if (p.snow) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(240, 248, 255, 0.8)';
                ctx.fill();
            } else {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
                ctx.fillStyle = rgba(p.color, 0.75);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    function updateBursts(dt) {
        for (let i = bursts.length - 1; i >= 0; i--) {
            const p = bursts[i];
            p.vy += 0.08 * dt;
            p.vx *= 0.985;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
            if (p.life <= 0) {
                bursts.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.life * 6);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = rgba(p.color, p.life * 0.9);
            ctx.fill();
            ctx.restore();
        }
    }

    // === Scramble Reveal for readouts ===
    const SCRAMBLE_CHARS = '❀❁✿🍃🍂❄✦*·';
    function scrambleTo(el, targetText, duration = 500) {
        const start = performance.now();
        function frame(now) {
            const t = clamp((now - start) / duration, 0, 1);
            const reveal = Math.floor(t * targetText.length);
            let out = targetText.slice(0, reveal);
            for (let i = reveal; i < targetText.length; i++) {
                out += targetText[i] === ' ' ? ' ' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            }
            el.textContent = out;
            if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    // === Season UI Sync ===
    let poemTimer = null;
    function syncSeasonUI(blend) {
        const yearT = state.seasonDisplay;
        const degrees = Math.round(yearT * 360);
        hudProgress.textContent = String(degrees).padStart(3, '0') + '°';
        hudWind.textContent = (state.wind / 10).toFixed(2);
        hudLeaves.textContent = tree.leaves.length;

        const idx = Math.floor(yearT * 4) % 4;
        markers.forEach((m, i) => m.classList.toggle('lit', i === idx));

        if (idx !== state.lastSeasonIndex) {
            state.lastSeasonIndex = idx;
            const info = SEASONS[idx];
            scrambleTo(readout, info.key, 420);
            scrambleTo(hudSeason, info.key, 420);
            seasonPoem.classList.add('fading');
            clearTimeout(poemTimer);
            poemTimer = setTimeout(() => {
                seasonGlyph.textContent = info.glyph;
                seasonName.textContent = info.cn;
                seasonPoem.textContent = info.poem;
                seasonPoem.classList.remove('fading');
            }, 300);
        }
    }

    // === Interaction: Season Scrub ===
    let dragging = false;

    function setSeasonFromEvent(e) {
        const rect = track.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        state.season = clamp((clientX - rect.left) / rect.width, 0, 0.999);
        state.seasonVel = 0;
    }

    track.addEventListener('pointerdown', (e) => {
        dragging = true;
        setAuto(false);
        state.seasonVel = 0;
        setSeasonFromEvent(e);
        track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
        if (dragging) setSeasonFromEvent(e);
    });

    track.addEventListener('pointerup', () => { dragging = false; });
    track.addEventListener('pointercancel', () => { dragging = false; });

    // === Interaction: Auto Cycle ===
    function setAuto(on) {
        state.auto = on;
        autoBtn.classList.toggle('active', on);
    }

    autoBtn.addEventListener('click', () => setAuto(!state.auto));
    setAuto(true);

    // === Interaction: Click tree → shake ===
    canvas.addEventListener('pointerdown', (e) => {
        state.shake = 1;
        const palette = seasonBlend(state.seasonDisplay);
        // burst from canopy center
        const cssH = window.innerHeight;
        const scale = Math.min(window.innerWidth, cssH) / 900;
        const cx = window.innerWidth * 0.5;
        const cy = cssH * 0.92 - 260 * scale;
        const count = Math.round(18 + palette.density * 34 + palette.snow * 20);
        spawnBurst(cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 60, palette, count);
        cursorRing.classList.add('pressed');
    });

    window.addEventListener('pointerup', () => {
        cursorRing.classList.remove('pressed');
    });

    // === Interaction: Wind (mouse) ===
    window.addEventListener('pointermove', (e) => {
        state.pointer.x = e.clientX;
        state.pointer.y = e.clientY;
        state.mouse.x = e.clientX / window.innerWidth;
        state.mouse.y = e.clientY / window.innerHeight;
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
        cursorRing.style.left = e.clientX + 'px';
        cursorRing.style.top = e.clientY + 'px';
    });

    // === Interaction: Theme Switcher ===
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.documentElement.setAttribute('data-theme', btn.dataset.theme);
        });
    });

    // === Keyboard: arrow keys walk the year ===
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            setAuto(false);
            const dir = e.key === 'ArrowRight' ? 1 : -1;
            state.season = (state.season + dir * 0.02 + 1) % 1;
            state.seasonVel = 0;
        } else if (e.key === ' ') {
            e.preventDefault();
            setAuto(!state.auto);
        }
    });

    // === Ink Reveal Stagger ===
    heroLines.forEach(line => {
        line.style.setProperty('--reveal-delay', (line.dataset.delay || 0) + 'ms');
    });

    // === Main Loop ===
    let lastTime = performance.now();

    function loop(now) {
        const dt = clamp((now - lastTime) / 16.67, 0.25, 3);
        lastTime = now;
        state.time = now;

        // auto season cycle: full year in ~48s
        if (state.auto && !dragging) {
            state.season = (state.season + 0.00035 * dt) % 1;
        }

        // spring physics toward target season
        const stiffness = 0.045;
        const damping = 0.82;
        const delta = state.season - state.seasonDisplay;
        state.seasonVel = (state.seasonVel + delta * stiffness * dt) * damping;
        let next = state.seasonDisplay + state.seasonVel * dt;
        // wrap-around handling
        if (next < -0.1) next += 1;
        if (next > 1.1) next -= 1;
        state.seasonDisplay = next;

        // wind: mouse offset from center + breathing
        state.windBase = (state.mouse.x - 0.5) * 12;
        state.wind = lerp(state.wind, state.windBase + Math.sin(state.time * 0.0006) * 2, 0.04 * dt);

        // shake decay (non-linear)
        state.shake *= Math.pow(0.94, dt);

        const palette = seasonBlend(state.seasonDisplay);

        // === Render ===
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        drawGround(palette);
        const visible = drawTree(palette);
        hudLeaves.textContent = visible;
        drawSnowCaps(palette);
        drawFireflies(palette);
        updateFallers(palette, dt);
        updateBursts(dt);

        // dock UI
        const pct = state.seasonDisplay * 100;
        thumb.style.left = pct + '%';
        fill.style.width = pct + '%';

        syncSeasonUI(palette);

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
})();
