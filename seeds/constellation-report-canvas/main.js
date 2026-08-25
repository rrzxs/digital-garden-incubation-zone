/* ==========================================================================
   Constellation Report Canvas · 星座报告画布
   Vanilla JS — zero build, zero dependency
   ========================================================================== */
'use strict';

// === Zodiac Knowledge Base ================================================

const ZODIAC = [
    {
        key: 'aries', cname: '白羊座', name: 'Aries', glyph: '♈', window: '03.21 — 04.19',
        element: '火 · Fire', ruler: '火星 · Mars', modality: '基本宫 · Cardinal', lucky: 7,
        aura: ['#ff6b4a', '#ffd166', '#ef476f'],
        oracle: '“火焰不需要许可就可以燃烧。你唯一的任务，是不弄丢自己的温度。”',
        traits: [72, 92, 58, 66, 54, 90],
        stars: [[0.15, 0.78], [0.4, 0.46], [0.68, 0.36], [0.9, 0.2]],
        edges: [[0, 1], [1, 2], [2, 3]]
    },
    {
        key: 'taurus', cname: '金牛座', name: 'Taurus', glyph: '♉', window: '04.20 — 05.20',
        element: '土 · Earth', ruler: '金星 · Venus', modality: '固定宫 · Fixed', lucky: 6,
        aura: ['#7fb069', '#f4a259', '#e07a5f'],
        oracle: '“缓慢不是迟疑，而是让每一寸土地都记得你的重量。”',
        traits: [64, 84, 76, 62, 78, 66],
        stars: [[0.1, 0.32], [0.34, 0.5], [0.4, 0.68], [0.6, 0.4], [0.86, 0.24], [0.8, 0.72]],
        edges: [[0, 3], [1, 3], [2, 3], [3, 4], [3, 5]]
    },
    {
        key: 'gemini', cname: '双子座', name: 'Gemini', glyph: '♊', window: '05.21 — 06.21',
        element: '风 · Air', ruler: '水星 · Mercury', modality: '变动宫 · Mutable', lucky: 5,
        aura: ['#67e8f9', '#a78bfa', '#f0abfc'],
        oracle: '“你是自己的对话者。世界因你的两重目光而多出一个维度。”',
        traits: [78, 58, 74, 88, 86, 72],
        stars: [[0.3, 0.14], [0.28, 0.46], [0.3, 0.78], [0.66, 0.18], [0.69, 0.48], [0.66, 0.8], [0.45, 0.34], [0.53, 0.4]],
        edges: [[0, 1], [1, 2], [3, 4], [4, 5], [1, 6], [4, 7], [6, 7]]
    },
    {
        key: 'cancer', cname: '巨蟹座', name: 'Cancer', glyph: '♋', window: '06.22 — 07.22',
        element: '水 · Water', ruler: '月亮 · Moon', modality: '基本宫 · Cardinal', lucky: 2,
        aura: ['#89c2d9', '#b8e0d4', '#ccd6a6'],
        oracle: '“潮汐记得每一次退让。你护住的不是壳，而是壳里的星光。”',
        traits: [88, 62, 92, 70, 58, 60],
        stars: [[0.5, 0.18], [0.5, 0.5], [0.28, 0.8], [0.72, 0.76]],
        edges: [[0, 1], [1, 2], [1, 3]]
    },
    {
        key: 'leo', cname: '狮子座', name: 'Leo', glyph: '♌', window: '07.23 — 08.22',
        element: '火 · Fire', ruler: '太阳 · Sun', modality: '固定宫 · Fixed', lucky: 1,
        aura: ['#ffd166', '#fb923c', '#e9c46a'],
        oracle: '“你不是在索取注目，你只是无法不发光。狮子从不解释太阳。”',
        traits: [70, 90, 72, 82, 56, 94],
        stars: [[0.14, 0.26], [0.3, 0.14], [0.46, 0.22], [0.56, 0.4], [0.5, 0.62], [0.72, 0.72], [0.9, 0.86]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]
    },
    {
        key: 'virgo', cname: '处女座', name: 'Virgo', glyph: '♍', window: '08.23 — 09.22',
        element: '土 · Earth', ruler: '水星 · Mercury', modality: '变动宫 · Mutable', lucky: 5,
        aura: ['#9ad1d4', '#b5e48c', '#ffd6a5'],
        oracle: '“秩序是你献给世界的温柔。完美不在终点，在于校准的指尖。”',
        traits: [74, 72, 78, 68, 94, 64],
        stars: [[0.1, 0.42], [0.3, 0.3], [0.5, 0.44], [0.68, 0.36], [0.88, 0.22], [0.72, 0.64], [0.5, 0.72]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6]]
    },
    {
        key: 'libra', cname: '天秤座', name: 'Libra', glyph: '♎', window: '09.23 — 10.23',
        element: '风 · Air', ruler: '金星 · Venus', modality: '基本宫 · Cardinal', lucky: 6,
        aura: ['#f4a6c0', '#cdb4db', '#ffc8dd'],
        oracle: '“天平的两端从不静止——美，恰恰诞生于永不落幕的权衡。”',
        traits: [76, 58, 86, 76, 82, 62],
        stars: [[0.2, 0.2], [0.8, 0.2], [0.5, 0.58], [0.26, 0.8], [0.74, 0.8]],
        edges: [[0, 1], [0, 2], [1, 2], [3, 4]]
    },
    {
        key: 'scorpio', cname: '天蝎座', name: 'Scorpio', glyph: '♏', window: '10.24 — 11.22',
        element: '水 · Water', ruler: '冥王星 · Pluto', modality: '固定宫 · Fixed', lucky: 9,
        aura: ['#7b2d8b', '#003049', '#c1121f'],
        oracle: '“深渊不是你的恐惧，是你的领土。凝视深处的人，终将拾回光。”',
        traits: [94, 92, 68, 72, 84, 70],
        stars: [[0.1, 0.3], [0.28, 0.2], [0.42, 0.34], [0.45, 0.54], [0.58, 0.66], [0.74, 0.7], [0.88, 0.6], [0.9, 0.38]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]
    },
    {
        key: 'sagittarius', cname: '射手座', name: 'Sagittarius', glyph: '♐', window: '11.23 — 12.21',
        element: '火 · Fire', ruler: '木星 · Jupiter', modality: '变动宫 · Mutable', lucky: 3,
        aura: ['#8ecae6', '#ffb703', '#fb8500'],
        oracle: '“箭已离弦。意义不在靶心，在于那道不肯回头的弧线。”',
        traits: [72, 76, 74, 84, 68, 88],
        stars: [[0.2, 0.52], [0.38, 0.36], [0.6, 0.3], [0.75, 0.46], [0.62, 0.64], [0.4, 0.66], [0.86, 0.14]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6]]
    },
    {
        key: 'capricorn', cname: '摩羯座', name: 'Capricorn', glyph: '♑', window: '12.22 — 01.19',
        element: '土 · Earth', ruler: '土星 · Saturn', modality: '基本宫 · Cardinal', lucky: 8,
        aura: ['#606c38', '#283618', '#dda15e'],
        oracle: '“山顶从不迎接喧哗。你攀登的每一步，都是时间在为你让路。”',
        traits: [66, 96, 62, 64, 90, 74],
        stars: [[0.12, 0.34], [0.35, 0.5], [0.6, 0.56], [0.82, 0.44], [0.88, 0.22]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    {
        key: 'aquarius', cname: '水瓶座', name: 'Aquarius', glyph: '♒', window: '01.20 — 02.18',
        element: '风 · Air', ruler: '天王星 · Uranus', modality: '固定宫 · Fixed', lucky: 4,
        aura: ['#4cc9f0', '#4361ee', '#89d2ff'],
        oracle: '“你的古怪，是未来写给现在的信。别急着拆，让它飞一会儿。”',
        traits: [84, 66, 76, 92, 88, 64],
        stars: [[0.14, 0.28], [0.34, 0.44], [0.3, 0.66], [0.5, 0.7], [0.6, 0.5], [0.55, 0.28], [0.76, 0.24], [0.86, 0.46]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]
    },
    {
        key: 'pisces', cname: '双鱼座', name: 'Pisces', glyph: '♓', window: '02.19 — 03.20',
        element: '水 · Water', ruler: '海王星 · Neptune', modality: '变动宫 · Mutable', lucky: 7,
        aura: ['#a8dadc', '#cdb4db', '#bde0fe'],
        oracle: '“梦境与海共用同一张地图。你的柔软，是深水之下的不可测量。”',
        traits: [96, 54, 90, 86, 58, 58],
        stars: [[0.14, 0.24], [0.3, 0.4], [0.18, 0.56], [0.5, 0.56], [0.82, 0.5], [0.7, 0.66], [0.88, 0.76]],
        edges: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [4, 6]]
    }
];

const TRAIT_AXES = [
    { label: '直觉', en: 'INTUITION' },
    { label: '意志', en: 'WILL' },
    { label: '共情', en: 'EMPATHY' },
    { label: '创造', en: 'CREATIVITY' },
    { label: '理性', en: 'LOGIC' },
    { label: '活力', en: 'VITALITY' }
];

const METRIC_DEFS = [
    { key: 'luminosity', name: '星光强度 · LUMINOSITY' },
    { key: 'resonance', name: '引力共振 · RESONANCE' },
    { key: 'retroguard', name: '逆行缓冲 · RETROGUARD' },
    { key: 'fortune', name: '宇宙幸运 · FORTUNE' }
];

// === Utilities =============================================================

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Mulberry32 seeded PRNG — deterministic reports per observer
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// Detect zodiac index from a date string 'YYYY-MM-DD' (month/day only)
function zodiacFromMonthDay(month, day) {
    // day-of-month on which the NEXT sign begins, indexed Jan..Dec
    const cutoffs = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
    // sign active at the START of month m (0-based zodiac: Aries=0):
    // Jan→Capricorn(9), Feb→Aquarius(10), Mar→Pisces(11), Apr→Aries(0)...
    return day < cutoffs[month - 1]
        ? (month + 8) % 12
        : (month + 9) % 12;
}

function readThemeColors() {
    const css = getComputedStyle(document.documentElement);
    return {
        accent: css.getPropertyValue('--accent').trim(),
        accent2: css.getPropertyValue('--accent-2').trim(),
        ink: css.getPropertyValue('--ink').trim(),
        inkFaint: css.getPropertyValue('--ink-faint').trim(),
        line: css.getPropertyValue('--line-bright').trim(),
        glow: css.getPropertyValue('--glow').trim()
    };
}

// === DOM Elements ==========================================================

const el = {
    root: document.documentElement,
    viewSummon: document.getElementById('view-summon'),
    viewReport: document.getElementById('view-report'),
    inputName: document.getElementById('input-name'),
    inputDate: document.getElementById('input-date'),
    zodiacStrip: document.getElementById('zodiac-strip'),
    btnGenerate: document.getElementById('btn-generate'),
    btnBack: document.getElementById('btn-back'),
    btnReroll: document.getElementById('btn-reroll'),
    themeSwitcher: document.getElementById('theme-switcher'),
    constellationCanvas: document.getElementById('constellation-canvas'),
    radarCanvas: document.getElementById('radar-canvas'),
    radarLegend: document.getElementById('radar-legend'),
    metricList: document.getElementById('metric-list'),
    cursorGlow: document.getElementById('cursor-glow'),
    cursorRing: document.getElementById('cursor-ring')
};

// === State =================================================================

const state = {
    theme: 'nebula',
    sign: null,
    seedText: '',
    rerollSalt: 0,
    pointer: { x: innerWidth / 2, y: innerHeight / 2, cx: 0.5, cy: 0.5, insideConstellation: false }
};

// === Custom Cursor (spring-lerped glow + ring) =============================

const cursor = { gx: 0, gy: 0, rx: 0, ry: 0 };

function cursorLoop() {
    cursor.gx = lerp(cursor.gx, state.pointer.x, 0.08);
    cursor.gy = lerp(cursor.gy, state.pointer.y, 0.08);
    cursor.rx = lerp(cursor.rx, state.pointer.x, 0.28);
    cursor.ry = lerp(cursor.ry, state.pointer.y, 0.28);
    el.cursorGlow.style.left = cursor.gx + 'px';
    el.cursorGlow.style.top = cursor.gy + 'px';
    el.cursorRing.style.left = cursor.rx + 'px';
    el.cursorRing.style.top = cursor.ry + 'px';
    requestAnimationFrame(cursorLoop);
}

function initCursor() {
    if (matchMedia('(hover: none)').matches) return;
    addEventListener('pointermove', (e) => {
        state.pointer.x = e.clientX;
        state.pointer.y = e.clientY;
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
        const interactive = e.target.closest('button, a, input, .zodiac-glyph, .theme-dot');
        el.cursorRing.classList.toggle('is-active', !!interactive);
    });
    cursorLoop();
}

// === Ambient Starfield (parallax particle field) ===========================

const starfield = { canvas: null, ctx: null, stars: [], w: 0, h: 0 };

function initStarfield() {
    starfield.canvas = document.getElementById('starfield-canvas');
    starfield.ctx = starfield.canvas.getContext('2d');
    resizeStarfield();
    addEventListener('resize', resizeStarfield);
    starfield.stars = Array.from({ length: 160 }, () => ({
        x: Math.random(), y: Math.random(),
        z: 0.2 + Math.random() * 0.8,          // depth for parallax
        r: 0.3 + Math.random() * 1.4,
        tw: Math.random() * Math.PI * 2,        // twinkle phase
        sp: 0.4 + Math.random() * 1.2           // twinkle speed
    }));
    requestAnimationFrame(starfieldLoop);
}

function resizeStarfield() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    starfield.w = innerWidth;
    starfield.h = innerHeight;
    starfield.canvas.width = starfield.w * dpr;
    starfield.canvas.height = starfield.h * dpr;
    starfield.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function starfieldLoop(t) {
    const { ctx, w, h } = starfield;
    const c = readThemeColors();
    const px = (state.pointer.x / w - 0.5), py = (state.pointer.y / h - 0.5);
    ctx.clearRect(0, 0, w, h);
    for (const s of starfield.stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.tw);
        const ox = px * 30 * s.z, oy = py * 30 * s.z;
        ctx.globalAlpha = 0.15 + twinkle * 0.55 * s.z;
        ctx.fillStyle = twinkle > 0.86 ? c.accent2 : c.ink;
        ctx.beginPath();
        ctx.arc(s.x * w + ox, s.y * h + oy, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(starfieldLoop);
}

// === Theme Switcher ========================================================

function initTheme() {
    el.themeSwitcher.addEventListener('click', (e) => {
        const dot = e.target.closest('.theme-dot');
        if (!dot) return;
        setTheme(dot.dataset.theme);
    });
    setTheme('nebula');
}

function setTheme(name) {
    state.theme = name;
    el.root.dataset.theme = name;
    el.themeSwitcher.querySelectorAll('.theme-dot').forEach((d) => {
        d.classList.toggle('is-active', d.dataset.theme === name);
    });
}

// === Constellation Renderer (animated line drawing + twinkle) ==============

const constellation = {
    start: 0,
    duration: 2600,
    bgStars: Array.from({ length: 46 }, () => ({
        x: Math.random(), y: Math.random(),
        r: 0.4 + Math.random() * 1.0, ph: Math.random() * Math.PI * 2
    }))
};

function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

function startConstellation() {
    constellation.start = performance.now();
    requestAnimationFrame(constellationLoop);
}

function constellationLoop(t) {
    const cv = el.constellationCanvas;
    if (!cv.isConnected || !state.sign) return;
    const c = readThemeColors();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr; cv.height = h * dpr;
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // faint background dust inside the card
    for (const s of constellation.bgStars) {
        ctx.globalAlpha = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.0012 + s.ph));
        ctx.fillStyle = c.ink;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    const pad = Math.min(w, h) * 0.14;
    const px = state.pointer.insideConstellation ? (state.pointer.cx - 0.5) * 14 : 0;
    const py = state.pointer.insideConstellation ? (state.pointer.cy - 0.5) * 14 : 0;
    const pt = (p) => [pad + p[0] * (w - pad * 2) + px, pad + p[1] * (h - pad * 2) + py];

    const progress = easeOutExpo(clamp((t - constellation.start) / constellation.duration, 0, 1));
    const sign = state.sign;
    const total = sign.edges.length;
    const drawnExact = progress * total;

    // sequential edge drawing
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = c.line;
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 8;
    sign.edges.forEach((e, i) => {
        const local = clamp(drawnExact - i, 0, 1);
        if (local <= 0) return;
        const [x1, y1] = pt(sign.stars[e[0]]);
        const [x2, y2] = pt(sign.stars[e[1]]);
        const ex = lerp(x1, x2, local), ey = lerp(y1, y2, local);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // travelling spark at the drawing tip
        if (local < 1) {
            ctx.save();
            ctx.fillStyle = c.accent2;
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });
    ctx.shadowBlur = 0;

    // stars appear as their first edge reaches them
    const reached = sign.stars.map((_, i) => {
        const firstEdge = sign.edges.findIndex((e) => e[0] === i || e[1] === i);
        return firstEdge === -1 ? 1 : clamp(drawnExact - firstEdge, 0, 1);
    });

    sign.stars.forEach((s, i) => {
        const a = reached[i];
        if (a <= 0) return;
        const [x, y] = pt(s);
        const twinkle = 0.7 + 0.3 * Math.sin(t * 0.003 + i * 1.7);
        const base = (i === 0 ? 4.4 : 3.2) * a * twinkle;

        // halo
        ctx.globalAlpha = 0.35 * a;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, base * 4);
        grad.addColorStop(0, c.accent2);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, base * 4, 0, Math.PI * 2);
        ctx.fill();

        // cross flare
        ctx.globalAlpha = 0.5 * a;
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - base * 2.2, y); ctx.lineTo(x + base * 2.2, y);
        ctx.moveTo(x, y - base * 2.2); ctx.lineTo(x, y + base * 2.2);
        ctx.stroke();

        // core
        ctx.globalAlpha = a;
        ctx.fillStyle = c.ink;
        ctx.beginPath();
        ctx.arc(x, y, base * 0.55, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(constellationLoop);
}

// === Trait Radar Renderer ==================================================

const radar = { start: 0, duration: 1800 };

function startRadar(traitValues) {
    radar.start = performance.now();
    radar.values = traitValues;
    radarLoop();
}

function radarLoop() {
    const cv = el.radarCanvas;
    if (!cv.isConnected || !radar.values) return;
    const c = readThemeColors();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr; cv.height = h * dpr;
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 + 6;
    const R = Math.min(w, h) / 2 - 42;
    const N = TRAIT_AXES.length;
    const t = clamp((performance.now() - radar.start) / radar.duration, 0, 1);
    const p = easeOutExpo(t);

    const axisPt = (i, r) => {
        const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
        return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    };

    // web rings
    ctx.strokeStyle = c.inkFaint;
    ctx.lineWidth = 0.7;
    for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
            const [x, y] = axisPt(i % N, (R * ring) / 4);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    // spokes + labels
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = c.ink;
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < N; i++) {
        const [x, y] = axisPt(i, R);
        ctx.strokeStyle = c.inkFaint;
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(x, y);
        ctx.stroke();
        const [lx, ly] = axisPt(i, R + 22);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TRAIT_AXES[i].en, lx, ly);
    }
    ctx.globalAlpha = 1;

    // value polygon (animated)
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
        const v = (radar.values[i % N] / 100) * p;
        const [x, y] = axisPt(i % N, R * v);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, c.accent2 + '55');
    grad.addColorStop(1, c.accent + '22');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // vertex dots
    for (let i = 0; i < N; i++) {
        const v = (radar.values[i] / 100) * p;
        const [x, y] = axisPt(i, R * v);
        ctx.fillStyle = c.ink;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
    }

    if (t < 1 || document.visibilityState === 'visible') requestAnimationFrame(radarLoop);
}

// === Report Generation =====================================================

function generateReport(signIndex, opts = {}) {
    const sign = ZODIAC[signIndex];
    state.sign = sign;
    const name = el.inputName.value.trim() || '无名观测者';
    const dateStr = el.inputDate.value || '2000-01-01';
    state.rerollSalt = opts.reroll ? state.rerollSalt + 1 : 0;
    state.seedText = name + '|' + dateStr + '|' + sign.key + '|' + state.rerollSalt;
    const rnd = mulberry32(hashString(state.seedText));

    // deterministic jitter
    const jitter = (base, amp) => clamp(Math.round(base + (rnd() - 0.5) * amp), 12, 99);
    const traits = sign.traits.map((v) => jitter(v, 14));
    const metrics = METRIC_DEFS.map((m) => ({
        ...m,
        value: clamp(Math.round(38 + rnd() * 58), 15, 99)
    }));

    // --- fill DOM ---
    document.getElementById('report-seed').textContent =
        String(1000 + (hashString(state.seedText) % 9000));
    document.getElementById('report-glyph').textContent = sign.glyph;
    document.getElementById('report-name').textContent = sign.name;
    document.getElementById('report-cname').textContent = sign.cname;
    document.getElementById('report-window').textContent = sign.window;
    document.getElementById('report-observer').textContent = name;
    document.getElementById('report-element').textContent = sign.element;
    document.getElementById('report-ruler').textContent = sign.ruler;
    document.getElementById('report-modality').textContent = sign.modality;
    document.getElementById('report-lucky').textContent = sign.lucky + ' · ' + (rnd() < 0.5 ? sign.lucky * 3 : sign.lucky + 3);

    const auraBox = document.getElementById('report-aura');
    auraBox.innerHTML = '';
    sign.aura.forEach((color, i) => {
        const sw = document.createElement('span');
        sw.className = 'aura-swatch';
        sw.style.background = color;
        sw.style.color = color;
        sw.style.animationDelay = (300 + i * 120) + 'ms';
        sw.title = color;
        auraBox.appendChild(sw);
    });

    document.getElementById('report-oracle').textContent = sign.oracle;

    // radar legend
    el.radarLegend.innerHTML =
        `<span><span class="dot" style="background:var(--accent)"></span>当前观测</span>` +
        `<span><span class="dot" style="background:var(--ink-faint)"></span>满值 100</span>`;

    // metrics bars
    el.metricList.innerHTML = '';
    metrics.forEach((m, i) => {
        const row = document.createElement('div');
        row.className = 'metric';
        row.innerHTML =
            `<div class="metric-header"><span class="metric-name">${m.name}</span>` +
            `<span class="metric-value" data-target="${m.value}">00</span></div>` +
            `<div class="metric-track"><div class="metric-fill"></div></div>`;
        el.metricList.appendChild(row);
        const fill = row.querySelector('.metric-fill');
        const valEl = row.querySelector('.metric-value');
        setTimeout(() => {
            fill.style.width = m.value + '%';
            countUp(valEl, m.value, 1300);
        }, 350 + i * 140);
    });

    switchView('report');
    startConstellation();
    startRadar(traits);
}

function countUp(node, target, duration) {
    const t0 = performance.now();
    (function tick(t) {
        const p = easeOutExpo(clamp((t - t0) / duration, 0, 1));
        node.textContent = String(Math.round(target * p)).padStart(2, '0');
        if (p < 1) requestAnimationFrame(tick);
    })(t0);
}

// === View Switching (non-linear stage transition) ==========================

function switchView(name) {
    const show = name === 'report' ? el.viewReport : el.viewSummon;
    const hide = name === 'report' ? el.viewSummon : el.viewReport;
    hide.classList.remove('is-entered');
    setTimeout(() => {
        hide.classList.remove('is-active');
        show.classList.add('is-active');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            show.classList.add('is-entered');
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 320);
}

// === Summon Wiring =========================================================

function initSummon() {
    // 12 glyph quick-select
    ZODIAC.forEach((z, i) => {
        const b = document.createElement('button');
        b.className = 'zodiac-glyph';
        b.textContent = z.glyph;
        b.title = `${z.cname} ${z.name}`;
        b.addEventListener('click', () => {
            generateReport(i);
        });
        el.zodiacStrip.appendChild(b);
    });

    el.btnGenerate.addEventListener('click', () => {
        let idx = 1;
        if (el.inputDate.value) {
            const [, m, d] = el.inputDate.value.split('-').map(Number);
            idx = zodiacFromMonthDay(m, d);
        }
        generateReport(idx);
    });

    el.inputName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') el.btnGenerate.click();
    });

    el.btnBack.addEventListener('click', () => switchView('summon'));
    el.btnReroll.addEventListener('click', () => generateReport(ZODIAC.indexOf(state.sign), { reroll: true }));
}

// constellation hover parallax tracking
function initConstellationHover() {
    el.constellationCanvas.addEventListener('pointerenter', () => { state.pointer.insideConstellation = true; });
    el.constellationCanvas.addEventListener('pointerleave', () => { state.pointer.insideConstellation = false; });
    el.constellationCanvas.addEventListener('pointermove', (e) => {
        // store local normalized coords for parallax math inside the card
        const r = el.constellationCanvas.getBoundingClientRect();
        state.pointer.cx = (e.clientX - r.left) / r.width;
        state.pointer.cy = (e.clientY - r.top) / r.height;
    });
}

// === Boot ==================================================================

initTheme();
initCursor();
initStarfield();
initSummon();
initConstellationHover();
