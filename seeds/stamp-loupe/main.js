(function () {
    'use strict';

    // === Simplex Noise (compact inline implementation) ===
    var SimplexNoise = (function () {
        var F2 = 0.5 * (Math.sqrt(3) - 1);
        var G2 = (3 - Math.sqrt(3)) / 6;
        var grad3 = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];

        function buildPerm(seed) {
            var p = [];
            for (var i = 0; i < 256; i++) p[i] = i;
            for (var j = 255; j > 0; j--) {
                seed = (seed * 16807 + 11) % 2147483647;
                var k = seed % (j + 1);
                var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
            }
            var perm = [];
            for (var n = 0; n < 512; n++) perm[n] = p[n & 255];
            return perm;
        }

        function dot2(g, x, y) { return g[0] * x + g[1] * y; }

        return function (seed) {
            var perm = buildPerm(seed || 42);
            return function noise2D(xin, yin) {
                var s = (xin + yin) * F2;
                var i = Math.floor(xin + s);
                var j = Math.floor(yin + s);
                var t = (i + j) * G2;
                var x0 = xin - (i - t);
                var y0 = yin - (j - t);
                var i1, j1;
                if (x0 > y0) { i1 = 1; j1 = 0; }
                else { i1 = 0; j1 = 1; }
                var x1 = x0 - i1 + G2;
                var y1 = y0 - j1 + G2;
                var x2 = x0 - 1 + 2 * G2;
                var y2 = y0 - 1 + 2 * G2;
                var ii = i & 255;
                var jj = j & 255;
                var gi0 = perm[ii + perm[jj]] % 8;
                var gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
                var gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
                var n0, n1, n2;
                var t0 = 0.5 - x0 * x0 - y0 * y0;
                if (t0 < 0) n0 = 0;
                else { t0 *= t0; n0 = t0 * t0 * dot2(grad3[gi0], x0, y0); }
                var t1 = 0.5 - x1 * x1 - y1 * y1;
                if (t1 < 0) n1 = 0;
                else { t1 *= t1; n1 = t1 * t1 * dot2(grad3[gi1], x1, y1); }
                var t2 = 0.5 - x2 * x2 - y2 * y2;
                if (t2 < 0) n2 = 0;
                else { t2 *= t2; n2 = t2 * t2 * dot2(grad3[gi2], x2, y2); }
                return 70 * (n0 + n1 + n2);
            };
        };
    })();

    // === DOM References ===
    var DOM = {
        main: document.getElementById('main-content'),
        cursorGlow: document.getElementById('cursor-glow'),
        transitionFlash: document.getElementById('transition-flash'),
        particleCanvas: document.getElementById('particle-canvas'),
        flipCanvas: document.getElementById('flip-canvas'),
        themeSwitcher: document.getElementById('theme-switcher'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        glassCards: document.querySelectorAll('.glass-card'),

        // HUD
        hudSeries: document.getElementById('hud-series'),
        hudZoom: document.getElementById('hud-zoom'),
        hudCollected: document.getElementById('hud-collected'),

        // Loupe stage
        loupeStage: document.getElementById('loupe-stage'),
        stampArena: document.getElementById('stamp-arena'),
        stampSheet: document.getElementById('stamp-sheet'),
        stampArtwork: document.getElementById('stamp-artwork'),
        denomSymbol: document.getElementById('denom-symbol'),
        denomValue: document.getElementById('denom-value'),
        stampCountry: document.getElementById('stamp-country'),
        stampSerial: document.getElementById('stamp-serial'),

        // Loupe
        loupe: document.getElementById('loupe'),
        loupeContent: document.getElementById('loupe-content'),
        loupeZoomArtwork: document.getElementById('loupe-zoom-artwork'),
        loupeDenomSymbol: document.getElementById('loupe-denom-symbol'),
        loupeDenomValue: document.getElementById('loupe-denom-value'),
        loupeZoomCountry: document.getElementById('loupe-zoom-country'),

        // Controls
        modePicker: document.getElementById('mode-picker'),
        modeChips: document.querySelectorAll('.mode-chip'),
        zoomSlider: document.getElementById('zoom-slider'),
        zoomFill: document.getElementById('zoom-fill'),
        zoomReadout: document.getElementById('zoom-readout'),
        sizePicker: document.getElementById('size-picker'),
        sizeBtns: document.querySelectorAll('.size-btn'),

        // Collection
        collectionGrid: document.getElementById('collection-grid'),

        // Detail
        detailTitleName: document.getElementById('detail-title-name'),
        detailIssued: document.getElementById('detail-issued'),
        detailDenom: document.getElementById('detail-denom'),
        detailPrint: document.getElementById('detail-print'),
        detailPerf: document.getElementById('detail-perf'),
        detailWatermark: document.getElementById('detail-watermark'),
        detailSerial: document.getElementById('detail-serial'),
        detailDesc1: document.getElementById('detail-desc-1'),
        detailDesc2: document.getElementById('detail-desc-2'),
        btnCollect: document.getElementById('btn-collect'),
        btnFlip: document.getElementById('btn-flip'),

        // Final stats
        finalExamined: document.getElementById('final-examined'),
        finalCollected: document.getElementById('final-collected'),
        finalDistance: document.getElementById('final-distance')
    };

    // === Stamp Catalog (6 stamps) ===
    var StampCatalog = [
        {
            id: 'cartographer',
            serial: 'A-001',
            name: '星图纪元',
            nameEn: 'Cartographer',
            issued: '2024',
            denom: '¥10',
            denomSymbol: '¥',
            denomValue: '10',
            country: 'DIGITAL · GARDEN',
            printMethod: 'Offset Litho',
            perf: 'P 13½',
            watermark: 'Garden Cross',
            color1: '#1e1b4b',
            color2: '#818cf8',
            color3: '#34d399',
            desc1: '星图纪元系列以深空导航为题——',
            desc2: '邮票中央的同心圆罗盘在紫外光下会显露出隐藏的航线坐标。',
            svg: '<defs>' +
                '<radialGradient id="sg1" cx="50%" cy="40%">' +
                '<stop offset="0%" stop-color="{c2}" stop-opacity="0.9"/>' +
                '<stop offset="100%" stop-color="{c1}" stop-opacity="0.3"/>' +
                '</radialGradient>' +
                '</defs>' +
                '<rect x="0" y="0" width="100%" height="100%" fill="{c1}" opacity="0.06"/>' +
                '<circle cx="50%" cy="45%" r="38%" fill="none" stroke="{c2}" stroke-width="0.5" opacity="0.5"/>' +
                '<circle cx="50%" cy="45%" r="28%" fill="none" stroke="{c2}" stroke-width="0.4" opacity="0.4"/>' +
                '<circle cx="50%" cy="45%" r="18%" fill="none" stroke="{c3}" stroke-width="0.4" opacity="0.5"/>' +
                '<circle cx="50%" cy="45%" r="8%" fill="url(#sg1)"/>' +
                '<g stroke="{c2}" stroke-width="0.3" opacity="0.6">' +
                '<line x1="50%" y1="7%" x2="50%" y2="83%"/>' +
                '<line x1="12%" y1="45%" x2="88%" y2="45%"/>' +
                '<line x1="22%" y1="17%" x2="78%" y2="73%"/>' +
                '<line x1="78%" y1="17%" x2="22%" y2="73%"/>' +
                '</g>' +
                '<g fill="{c3}" opacity="0.8">' +
                '<circle cx="50%" cy="12%" r="1.5"/>' +
                '<circle cx="82%" cy="30%" r="1.2"/>' +
                '<circle cx="20%" cy="55%" r="1.4"/>' +
                '<circle cx="75%" cy="72%" r="1.1"/>' +
                '<circle cx="30%" cy="75%" r="1.3"/>' +
                '</g>' +
                '<text x="50%" y="92%" text-anchor="middle" fill="{c2}" font-size="3.5" font-family="serif" letter-spacing="0.5">CARTOGRAPHER</text>'
        },
        {
            id: 'abyssal',
            serial: 'B-002',
            name: '深海回声',
            nameEn: 'Abyssal Echo',
            issued: '2024',
            denom: '¥8',
            denomSymbol: '¥',
            denomValue: '8',
            country: 'DEEP · CURRENT',
            printMethod: 'Intaglio',
            perf: 'P 14',
            watermark: 'Wave Pattern',
            color1: '#0c2340',
            color2: '#22d3ee',
            color3: '#3b82f6',
            desc1: '深海回声描绘了马里亚纳海沟的声波纹——',
            desc2: '在偏振光下，邮票表面的压印纹理会产生波浪干涉条纹。',
            svg: '<defs>' +
                '<linearGradient id="sg2" x1="0%" y1="0%" x2="0%" y2="100%">' +
                '<stop offset="0%" stop-color="{c2}" stop-opacity="0.3"/>' +
                '<stop offset="100%" stop-color="{c1}" stop-opacity="0.6"/>' +
                '</linearGradient>' +
                '</defs>' +
                '<rect x="0" y="0" width="100%" height="100%" fill="url(#sg2)"/>' +
                '<g fill="none" stroke="{c2}" stroke-width="0.4" opacity="0.4">' +
                '<path d="M 0 25 Q 15 20 30 25 T 60 25 T 90 25 T 100 25" transform="scale(1.11)"/>' +
                '<path d="M 0 35 Q 15 30 30 35 T 60 35 T 90 35 T 100 35" transform="scale(1.11)"/>' +
                '<path d="M 0 45 Q 15 40 30 45 T 60 45 T 90 45 T 100 45" transform="scale(1.11)"/>' +
                '<path d="M 0 55 Q 15 50 30 55 T 60 55 T 90 55 T 100 55" transform="scale(1.11)"/>' +
                '<path d="M 0 65 Q 15 60 30 65 T 60 65 T 90 65 T 100 65" transform="scale(1.11)"/>' +
                '<path d="M 0 75 Q 15 70 30 75 T 60 75 T 90 75 T 100 75" transform="scale(1.11)"/>' +
                '</g>' +
                '<g fill="{c3}" opacity="0.7">' +
                '<ellipse cx="50%" cy="50%" rx="12%" ry="6%" transform="rotate(-20 50% 50%)"/>' +
                '<circle cx="44%" cy="48%" r="1.5" fill="{c2}"/>' +
                '<circle cx="56%" cy="52%" r="1" fill="{c2}"/>' +
                '</g>' +
                '<g fill="{c2}" opacity="0.5">' +
                '<circle cx="25%" cy="20%" r="0.8"/>' +
                '<circle cx="70%" cy="25%" r="0.6"/>' +
                '<circle cx="15%" cy="75%" r="0.7"/>' +
                '<circle cx="80%" cy="70%" r="0.5"/>' +
                '</g>' +
                '<text x="50%" y="92%" text-anchor="middle" fill="{c2}" font-size="3.5" font-family="serif" letter-spacing="0.5">ABYSSAL ECHO</text>'
        },
        {
            id: 'phosphor',
            serial: 'C-003',
            name: '磷光航线',
            nameEn: 'Phosphor Trail',
            issued: '2024',
            denom: '¥12',
            denomSymbol: '¥',
            denomValue: '12',
            country: 'NIGHT · POST',
            printMethod: 'Photogravure',
            perf: 'P 12½',
            watermark: 'Beacon Star',
            color1: '#451a03',
            color2: '#f59e0b',
            color3: '#ef4444',
            desc1: '磷光航线以夜航灯塔为灵感——',
            desc2: '邮票上的磷光条纹在紫外模式下会发出琥珀色辉光，标记飞行路径。',
            svg: '<defs>' +
                '<linearGradient id="sg3" x1="0%" y1="0%" x2="100%" y2="100%">' +
                '<stop offset="0%" stop-color="{c2}" stop-opacity="0.4"/>' +
                '<stop offset="100%" stop-color="{c1}" stop-opacity="0.2"/>' +
                '</linearGradient>' +
                '</defs>' +
                '<rect x="0" y="0" width="100%" height="100%" fill="url(#sg3)"/>' +
                '<g fill="none" stroke="{c2}" stroke-width="0.5" opacity="0.6">' +
                '<path d="M 10 80 Q 30 20 50 40 T 90 15"/>' +
                '</g>' +
                '<g fill="{c2}" opacity="0.9">' +
                '<circle cx="10" cy="80" r="1.5"/>' +
                '<circle cx="90" cy="15" r="2"/>' +
                '</g>' +
                '<g fill="none" stroke="{c3}" stroke-width="0.3" opacity="0.4">' +
                '<path d="M 15 15 L 25 15 L 25 25"/>' +
                '<path d="M 70 70 L 80 70 L 80 80"/>' +
                '<path d="M 40 60 L 50 60 L 50 70"/>' +
                '</g>' +
                '<g fill="{c3}" opacity="0.6">' +
                '<circle cx="15" cy="15" r="1"/>' +
                '<circle cx="80" cy="80" r="1"/>' +
                '<circle cx="50" cy="70" r="0.8"/>' +
                '</g>' +
                '<g stroke="{c2}" stroke-width="0.2" opacity="0.3">' +
                '<line x1="5" y1="50" x2="15" y2="50"/>' +
                '<line x1="85" y1="50" x2="95" y2="50"/>' +
                '<line x1="50" y1="5" x2="50" y2="15"/>' +
                '<line x1="50" y1="85" x2="50" y2="95"/>' +
                '</g>' +
                '<text x="50%" y="92%" text-anchor="middle" fill="{c2}" font-size="3.5" font-family="serif" letter-spacing="0.5">PHOSPHOR TRAIL</text>'
        },
        {
            id: 'crystalline',
            serial: 'D-004',
            name: '晶体花园',
            nameEn: 'Crystalline Bloom',
            issued: '2024',
            denom: '¥6',
            denomSymbol: '¥',
            denomValue: '6',
            country: 'MINERAL · ATELIER',
            printMethod: 'Engraved',
            perf: 'P 13',
            watermark: 'Hex Lattice',
            color1: '#18181b',
            color2: '#e4e4e7',
            color3: '#a1a1aa',
            desc1: '晶体花园描绘了矿物晶族的六方对称——',
            desc2: '在热感模式下，不同折射率的晶面会呈现温差色阶。',
            svg: '<defs>' +
                '<linearGradient id="sg4" x1="50%" y1="0%" x2="50%" y2="100%">' +
                '<stop offset="0%" stop-color="{c2}" stop-opacity="0.5"/>' +
                '<stop offset="100%" stop-color="{c1}" stop-opacity="0.2"/>' +
                '</linearGradient>' +
                '</defs>' +
                '<rect x="0" y="0" width="100%" height="100%" fill="url(#sg4)"/>' +
                '<g fill="none" stroke="{c2}" stroke-width="0.4" opacity="0.5">' +
                '<polygon points="50,15 70,35 70,65 50,85 30,65 30,35"/>' +
                '<polygon points="50,25 62,37 62,63 50,75 38,63 38,37"/>' +
                '<polygon points="50,35 56,41 56,59 50,65 44,59 44,41"/>' +
                '</g>' +
                '<g fill="{c3}" opacity="0.3">' +
                '<polygon points="50,35 56,41 50,47 44,41"/>' +
                '</g>' +
                '<g fill="none" stroke="{c3}" stroke-width="0.2" opacity="0.4">' +
                '<line x1="50" y1="15" x2="50" y2="85"/>' +
                '<line x1="30" y1="35" x2="70" y2="65"/>' +
                '<line x1="70" y1="35" x2="30" y2="65"/>' +
                '<line x1="30" y1="50" x2="70" y2="50"/>' +
                '</g>' +
                '<g fill="{c2}" opacity="0.8">' +
                '<circle cx="50" cy="50" r="1.5"/>' +
                '</g>' +
                '<text x="50%" y="92%" text-anchor="middle" fill="{c2}" font-size="3.5" font-family="serif" letter-spacing="0.5">CRYSTALLINE</text>'
        },
        {
            id: 'silkroute',
            serial: 'E-005',
            name: '丝路织锦',
            nameEn: 'Silk Route Weave',
            issued: '2024',
            denom: '¥15',
            denomSymbol: '¥',
            denomValue: '15',
            country: 'CARAVAN · MAIL',
            printMethod: 'Silk Screen',
            perf: 'P 11½',
            watermark: 'Diamond Loom',
            color1: '#7c2d12',
            color2: '#fb923c',
            color3: '#fbbf24',
            desc1: '丝路织锦以敦煌纹样为底——',
            desc2: '偏振光下可见经纬交错的双向斜纹，隐藏着驼队行进路线。',
            svg: '<defs>' +
                '<pattern id="sg5" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">' +
                '<rect width="12" height="12" fill="{c1}" opacity="0.08"/>' +
                '<path d="M 0 6 L 6 0 L 12 6 L 6 12 Z" fill="none" stroke="{c2}" stroke-width="0.3" opacity="0.4"/>' +
                '<circle cx="6" cy="6" r="1" fill="{c3}" opacity="0.3"/>' +
                '</pattern>' +
                '</defs>' +
                '<rect x="0" y="0" width="100%" height="100%" fill="url(#sg5)"/>' +
                '<g fill="none" stroke="{c2}" stroke-width="0.5" opacity="0.6">' +
                '<path d="M 10 50 Q 30 30 50 50 T 90 50"/>' +
                '<path d="M 10 55 Q 30 35 50 55 T 90 55" opacity="0.5"/>' +
                '</g>' +
                '<g fill="{c3}" opacity="0.7">' +
                '<circle cx="15" cy="52" r="1.5"/>' +
                '<circle cx="35" cy="42" r="1.2"/>' +
                '<circle cx="55" cy="52" r="1.3"/>' +
                '<circle cx="75" cy="47" r="1.1"/>' +
                '</g>' +
                '<g stroke="{c2}" stroke-width="0.2" opacity="0.3">' +
                '<line x1="15" y1="52" x2="35" y2="42"/>' +
                '<line x1="35" y1="42" x2="55" y2="52"/>' +
                '<line x1="55" y1="52" x2="75" y2="47"/>' +
                '</g>' +
                '<g fill="none" stroke="{c3}" stroke-width="0.4" opacity="0.4">' +
                '<rect x="25" y="70" width="50" height="12" rx="2"/>' +
                '</g>' +
                '<text x="50%" y="92%" text-anchor="middle" fill="{c2}" font-size="3.5" font-family="serif" letter-spacing="0.5">SILK ROUTE</text>'
        },
        {
            id: 'aurora',
            serial: 'F-006',
            name: '极光信标',
            nameEn: 'Aurora Beacon',
            issued: '2024',
            denom: '¥20',
            denomSymbol: '¥',
            denomValue: '20',
            country: 'POLAR · RELAY',
            printMethod: 'Iridescent Litho',
            perf: 'P 14½',
            watermark: 'Curtain Fold',
            color1: '#064e3b',
            color2: '#34d399',
            color3: '#818cf8',
            desc1: '极光信标捕获了磁层与大气粒子碰撞的瞬间——',
            desc2: '邮票上的珠光油墨在不同角度下会流变出从翠绿到靛紫的全光谱。',
            svg: '<defs>' +
                '<linearGradient id="sg6" x1="0%" y1="0%" x2="0%" y2="100%">' +
                '<stop offset="0%" stop-color="{c3}" stop-opacity="0.3"/>' +
                '<stop offset="50%" stop-color="{c2}" stop-opacity="0.5"/>' +
                '<stop offset="100%" stop-color="{c1}" stop-opacity="0.2"/>' +
                '</linearGradient>' +
                '</defs>' +
                '<rect x="0" y="0" width="100%" height="100%" fill="{c1}" opacity="0.1"/>' +
                '<g fill="none" stroke-width="0.5" opacity="0.6">' +
                '<path d="M 10 20 Q 30 50 20 80" stroke="{c2}"/>' +
                '<path d="M 30 15 Q 45 50 35 85" stroke="{c3}" opacity="0.7"/>' +
                '<path d="M 50 10 Q 60 50 50 90" stroke="{c2}"/>' +
                '<path d="M 70 15 Q 80 50 65 85" stroke="{c3}" opacity="0.7"/>' +
                '<path d="M 90 20 Q 95 50 80 80" stroke="{c2}"/>' +
                '</g>' +
                '<g fill="{c2}" opacity="0.4">' +
                '<ellipse cx="50%" cy="35%" rx="35%" ry="8%" transform="rotate(-5 50% 35%)"/>' +
                '</g>' +
                '<g fill="{c3}" opacity="0.3">' +
                '<circle cx="20%" cy="25%" r="0.8"/>' +
                '<circle cx="45%" cy="18%" r="0.6"/>' +
                '<circle cx="70%" cy="22%" r="0.7"/>' +
                '<circle cx="85%" cy="30%" r="0.5"/>' +
                '</g>' +
                '<rect x="0" y="0" width="100%" height="100%" fill="url(#sg6)" opacity="0.3"/>' +
                '<text x="50%" y="92%" text-anchor="middle" fill="{c2}" font-size="3.5" font-family="serif" letter-spacing="0.5">AURORA BEACON</text>'
        }
    ];

    // === State ===
    var State = {
        mouseX: 0,
        mouseY: 0,
        smoothX: 0,
        smoothY: 0,
        loupeX: 0,
        loupeY: 0,
        smoothLoupeX: 0,
        smoothLoupeY: 0,
        time: 0,
        rafId: null,
        noise: SimplexNoise(314),
        particles: [],
        flipParticles: [],
        currentStampIndex: 0,
        currentMode: 'standard',
        zoomLevel: 30,
        loupeSize: 200,
        loupeOffsetX: 0,
        loupeOffsetY: 0,
        isOverArena: false,
        collected: {},
        collectedCount: 0,
        examCount: 0,
        totalDistance: 0,
        lastLoupeX: 0,
        lastLoupeY: 0,
        isFlipped: false
    };

    // === Config ===
    var Config = {
        lerpFactor: 0.12,
        loupeLerp: 0.22,
        observerThreshold: 0.2,
        observerRootMargin: '-8% 0px -8% 0px',
        particleMax: 60,
        particleLife: 160,
        particleSpeed: 0.35
    };

    // === Init ===
    function init() {
        sizeCanvases();
        setupIntersectionObserver();
        setupCursorGlow();
        setupThemeSwitcher();
        setupLoupe();
        setupControls();
        buildCollectionGrid();
        setupDetailActions();
        loadStamp(0);
        seedParticles();
        revealFirstScene();
        startLoop();

        window.addEventListener('resize', debounce(sizeCanvases, 200));
    }

    // === Canvas Sizing ===
    function sizeCanvases() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = window.innerWidth;
        var h = window.innerHeight;

        [DOM.particleCanvas, DOM.flipCanvas].forEach(function (canvas) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            var ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        });
    }

    // === Intersection Observer ===
    function setupIntersectionObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    revealCard(entry.target);
                }
            });
        }, {
            rootMargin: Config.observerRootMargin,
            threshold: Config.observerThreshold
        });

        DOM.glassCards.forEach(function (card) { observer.observe(card); });
    }

    function revealCard(card) {
        if (card.dataset.revealed) return;
        card.dataset.revealed = '1';
        card.classList.add('is-visible');

        var lines = card.querySelectorAll('.ink-line');
        lines.forEach(function (line) {
            var delay = parseInt(line.dataset.delay || 0, 10);
            line.style.transitionDelay = delay + 'ms';
        });
    }

    function revealFirstScene() {
        var firstCard = document.querySelector('.hero-card');
        if (firstCard) {
            setTimeout(function () { revealCard(firstCard); }, 200);
        }
    }

    // === Cursor Glow ===
    function setupCursorGlow() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
        document.addEventListener('mousemove', function (e) {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
            DOM.cursorGlow.classList.add('visible');
        });
        document.addEventListener('mouseleave', function () {
            DOM.cursorGlow.classList.remove('visible');
        });
    }

    // === Theme Switcher ===
    function setupThemeSwitcher() {
        DOM.themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', theme);
                DOM.themeBtns.forEach(function (b) {
                    b.classList.toggle('active', b.dataset.theme === theme);
                });
                triggerTransitionFlash();
            });
        });
    }

    function triggerTransitionFlash() {
        DOM.transitionFlash.classList.add('flash');
        setTimeout(function () { DOM.transitionFlash.classList.remove('flash'); }, 200);
    }

    // === Stamp Loading ===
    function loadStamp(index) {
        if (index < 0 || index >= StampCatalog.length) return;
        var stamp = StampCatalog[index];
        State.currentStampIndex = index;

        // Fill SVG template colors
        var svgHtml = stamp.svg
            .replace(/\{c1\}/g, stamp.color1)
            .replace(/\{c2\}/g, stamp.color2)
            .replace(/\{c3\}/g, stamp.color3);

        DOM.stampArtwork.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">' + svgHtml + '</svg>';
        DOM.loupeZoomArtwork.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">' + svgHtml + '</svg>';

        DOM.denomSymbol.textContent = stamp.denomSymbol;
        DOM.denomValue.textContent = stamp.denomValue;
        DOM.stampCountry.textContent = stamp.country;
        DOM.stampSerial.textContent = 'No. ' + stamp.serial + ' / ' + stamp.issued;

        DOM.loupeDenomSymbol.textContent = stamp.denomSymbol;
        DOM.loupeDenomValue.textContent = stamp.denomValue;
        DOM.loupeZoomCountry.textContent = stamp.country;

        // Update HUD
        if (DOM.hudSeries) DOM.hudSeries.textContent = stamp.serial;

        // Update detail panel
        updateDetailPanel(stamp);

        // Update active thumb
        var thumbs = DOM.collectionGrid.querySelectorAll('.stamp-thumb');
        thumbs.forEach(function (thumb, i) {
            thumb.classList.toggle('active', i === index);
        });

        State.examCount++;
        updateFinalStats();
    }

    function updateDetailPanel(stamp) {
        if (DOM.detailTitleName) DOM.detailTitleName.textContent = stamp.name + ' · ' + stamp.nameEn;
        if (DOM.detailIssued) DOM.detailIssued.textContent = stamp.issued;
        if (DOM.detailDenom) DOM.detailDenom.textContent = stamp.denom;
        if (DOM.detailPrint) DOM.detailPrint.textContent = stamp.printMethod;
        if (DOM.detailPerf) DOM.detailPerf.textContent = stamp.perf;
        if (DOM.detailWatermark) DOM.detailWatermark.textContent = stamp.watermark;
        if (DOM.detailSerial) DOM.detailSerial.textContent = stamp.serial;
        if (DOM.detailDesc1) DOM.detailDesc1.textContent = stamp.desc1;
        if (DOM.detailDesc2) DOM.detailDesc2.textContent = stamp.desc2;

        // Update collect button state
        var isCollected = State.collected[stamp.id];
        if (DOM.btnCollect) {
            DOM.btnCollect.classList.toggle('collected', !!isCollected);
            var span = DOM.btnCollect.querySelector('span');
            if (span) span.textContent = isCollected ? '已收入图鉴' : '收入图鉴';
        }
    }

    // === Loupe (Magnifier) ===
    function setupLoupe() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

        DOM.stampArena.addEventListener('mouseenter', function () {
            State.isOverArena = true;
            DOM.loupe.classList.add('visible');
        });

        DOM.stampArena.addEventListener('mouseleave', function () {
            State.isOverArena = false;
            DOM.loupe.classList.remove('visible');
        });

        DOM.stampArena.addEventListener('mousemove', function (e) {
            var rect = DOM.stampArena.getBoundingClientRect();
            State.loupeX = e.clientX - rect.left;
            State.loupeY = e.clientY - rect.top;

            // Track distance traveled
            var dx = State.loupeX - State.lastLoupeX;
            var dy = State.loupeY - State.lastLoupeY;
            State.totalDistance += Math.sqrt(dx * dx + dy * dy);
            State.lastLoupeX = State.loupeX;
            State.lastLoupeY = State.loupeY;

            // Slight magnetic tilt of stamp sheet
            var sheetRect = DOM.stampSheet.getBoundingClientRect();
            var sheetCx = sheetRect.left + sheetRect.width / 2 - rect.left;
            var sheetCy = sheetRect.top + sheetRect.height / 2 - rect.top;
            var tiltX = (State.loupeX - sheetCx) / sheetRect.width;
            var tiltY = (State.loupeY - sheetCy) / sheetRect.height;

            if (!State.isFlipped) {
                DOM.stampSheet.style.transform =
                    'perspective(1000px) rotateY(' + (tiltX * 6).toFixed(2) + 'deg) rotateX(' + (-tiltY * 6).toFixed(2) + 'deg)';
            }
        });
    }

    function updateLoupePosition() {
        if (!State.isOverArena) return;

        State.smoothLoupeX += (State.loupeX - State.smoothLoupeX) * Config.loupeLerp;
        State.smoothLoupeY += (State.loupeY - State.smoothLoupeY) * Config.loupeLerp;

        DOM.loupe.style.left = State.smoothLoupeX + 'px';
        DOM.loupe.style.top = State.smoothLoupeY + 'px';

        // Calculate loupe content offset (what part of the stamp we're looking at)
        var arenaRect = DOM.stampArena.getBoundingClientRect();
        var sheetRect = DOM.stampSheet.getBoundingClientRect();
        var sheetLeft = sheetRect.left - arenaRect.left;
        var sheetTop = sheetRect.top - arenaRect.top;
        var sheetW = sheetRect.width;
        var sheetH = sheetRect.height;

        // Position relative to stamp sheet
        var relX = (State.smoothLoupeX - sheetLeft) / sheetW;  // 0..1
        var relY = (State.smoothLoupeY - sheetTop) / sheetH;

        // Clamp
        relX = Math.max(0, Math.min(1, relX));
        relY = Math.max(0, Math.min(1, relY));

        // The zoom content is 3x the loupe size, so offset to center the cursor position
        var zoom = State.zoomLevel / 10;  // 1.5 to 6.0
        var loupeSize = State.loupeSize;
        var contentSize = loupeSize * zoom;

        // Offset: we want the point (relX, relY) of the stamp to appear at center of loupe
        var offsetX = -(relX * contentSize - loupeSize / 2);
        var offsetY = -(relY * contentSize - loupeSize / 2);

        DOM.loupeContent.style.transform = 'translate(' + offsetX.toFixed(1) + 'px, ' + offsetY.toFixed(1) + 'px)';
        DOM.loupeContent.style.width = contentSize + 'px';
        DOM.loupeContent.style.height = contentSize + 'px';
    }

    // === Controls ===
    function setupControls() {
        // Mode picker
        DOM.modeChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var mode = chip.dataset.mode;
                State.currentMode = mode;
                DOM.stampArena.setAttribute('data-mode', mode);
                DOM.modeChips.forEach(function (c) { c.classList.toggle('active', c === chip); });
                triggerTransitionFlash();
            });
        });

        // Zoom slider
        if (DOM.zoomSlider) {
            DOM.zoomSlider.addEventListener('input', function () {
                State.zoomLevel = parseInt(this.value, 10);
                var zoom = (State.zoomLevel / 10).toFixed(1);
                if (DOM.zoomReadout) DOM.zoomReadout.textContent = zoom + '×';
                if (DOM.hudZoom) DOM.hudZoom.textContent = '×' + zoom;

                // Update fill bar
                var pct = ((State.zoomLevel - 15) / (60 - 15)) * 100;
                if (DOM.zoomFill) DOM.zoomFill.style.width = pct + '%';
            });
        }

        // Size picker
        DOM.sizeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var size = parseInt(btn.dataset.size, 10);
                State.loupeSize = size;
                DOM.loupe.style.width = size + 'px';
                DOM.loupe.style.height = size + 'px';
                DOM.loupe.style.marginTop = -(size / 2) + 'px';
                DOM.loupe.style.marginLeft = -(size / 2) + 'px';
                DOM.sizeBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
            });
        }
        );
    }

    // === Collection Grid ===
    function buildCollectionGrid() {
        StampCatalog.forEach(function (stamp, index) {
            var thumb = document.createElement('div');
            thumb.className = 'stamp-thumb';
            thumb.setAttribute('role', 'button');
            thumb.setAttribute('tabindex', '0');
            thumb.setAttribute('data-index', index);

            var svgHtml = stamp.svg
                .replace(/\{c1\}/g, stamp.color1)
                .replace(/\{c2\}/g, stamp.color2)
                .replace(/\{c3\}/g, stamp.color3);

            thumb.innerHTML =
                '<div class="stamp-thumb-collected">✓</div>' +
                '<div class="stamp-thumb-inner">' +
                    '<div class="stamp-thumb-art"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">' + svgHtml + '</svg></div>' +
                    '<div class="stamp-thumb-denom">' + stamp.denom + '</div>' +
                    '<div class="stamp-thumb-country">' + stamp.country + '</div>' +
                    '<div class="stamp-thumb-serial">' + stamp.serial + '</div>' +
                '</div>';

            thumb.addEventListener('click', function () {
                loadStamp(index);
                emitBurst(thumb, 8);
                // Scroll to loupe stage
                DOM.stampArena.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });

            thumb.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    loadStamp(index);
                    emitBurst(thumb, 8);
                }
            });

            DOM.collectionGrid.appendChild(thumb);

            // Stagger animate in
            setTimeout(function () {
                thumb.classList.add('entered');
            }, 100 + index * 80);
        });
    }

    // === Detail Actions ===
    function setupDetailActions() {
        if (DOM.btnCollect) {
            DOM.btnCollect.addEventListener('click', function () {
                var stamp = StampCatalog[State.currentStampIndex];
                if (State.collected[stamp.id]) return; // already collected

                State.collected[stamp.id] = true;
                State.collectedCount++;

                this.classList.add('collected');
                var span = this.querySelector('span');
                if (span) span.textContent = '已收入图鉴';

                // Update thumb
                var thumbs = DOM.collectionGrid.querySelectorAll('.stamp-thumb');
                if (thumbs[State.currentStampIndex]) {
                    thumbs[State.currentStampIndex].classList.add('collected');
                }

                // Update HUD
                if (DOM.hudCollected) DOM.hudCollected.textContent = State.collectedCount + ' / 6';

                emitBurst(this, 12);
                updateFinalStats();
                triggerTransitionFlash();
            });
        }

        if (DOM.btnFlip) {
            DOM.btnFlip.addEventListener('click', flipStamp);
        }
    }

    function flipStamp() {
        State.isFlipped = !State.isFlipped;
        DOM.stampSheet.classList.toggle('flipped', State.isFlipped);

        if (State.isFlipped) {
            // Emit flip particles (gum/adhesive texture reveal)
            emitFlipParticles();
        }

        triggerTransitionFlash();
    }

    // === Particles ===
    function seedParticles() {
        for (var i = 0; i < 35; i++) {
            spawnAmbientParticle();
        }
    }

    function spawnAmbientParticle() {
        if (State.particles.length >= Config.particleMax) return;
        State.particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * Config.particleSpeed,
            vy: (Math.random() - 0.5) * Config.particleSpeed,
            life: Math.random() * Config.particleLife,
            maxLife: Config.particleLife,
            size: Math.random() * 1.5 + 0.5,
            ambient: true
        });
    }

    function emitBurst(fromEl, count) {
        var rect = fromEl.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        for (var i = 0; i < count; i++) {
            if (State.particles.length >= Config.particleMax + 30) break;
            var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            var speed = Math.random() * 3 + 1.5;
            State.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 60,
                maxLife: 60,
                size: Math.random() * 2 + 1,
                ambient: false
            });
        }
    }

    function emitFlipParticles() {
        var rect = DOM.stampSheet.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;

        var style = getComputedStyle(document.documentElement);
        var accent = style.getPropertyValue('--color-accent').trim();
        var accentAlt = style.getPropertyValue('--color-accent-alt').trim();

        for (var i = 0; i < 20; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * 4 + 1;
            State.flipParticles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 70,
                maxLife: 70,
                size: Math.random() * 3 + 1,
                color: Math.random() > 0.5 ? accent : accentAlt,
                gravity: 0.05
            });
        }
    }

    function updateParticles() {
        var next = [];
        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.ambient) {
                var nx = p.x * 0.002 + State.time * 0.00015;
                var ny = p.y * 0.002 + State.time * 0.00015;
                var n = State.noise(nx, ny);
                p.vx += n * 0.02;
                p.vy += n * 0.02;
                p.vx *= 0.98;
                p.vy *= 0.98;

                if (p.x < -20) p.x = window.innerWidth + 20;
                if (p.x > window.innerWidth + 20) p.x = -20;
                if (p.y < -20) p.y = window.innerHeight + 20;
                if (p.y > window.innerHeight + 20) p.y = -20;

                if (p.life <= 0) p.life = p.maxLife;
                next.push(p);
            } else {
                p.vx *= 0.94;
                p.vy *= 0.94;
                if (p.life > 0) next.push(p);
            }
        }
        State.particles = next;
    }

    function drawParticles(ctx) {
        var style = getComputedStyle(document.documentElement);
        var accentColor = style.getPropertyValue('--particle-color').trim();

        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];
            var alpha;
            if (p.ambient) {
                alpha = (p.life / p.maxLife) * 0.3;
            } else {
                alpha = (p.life / p.maxLife) * 0.85;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = accentColor.replace(/[\d.]+\)$/, alpha.toFixed(3) + ')');
            ctx.fill();
        }
    }

    function updateFlipParticles() {
        var next = [];
        for (var i = 0; i < State.flipParticles.length; i++) {
            var s = State.flipParticles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += s.gravity;
            s.vx *= 0.97;
            s.life--;
            if (s.life > 0) next.push(s);
        }
        State.flipParticles = next;
    }

    function drawFlipParticles(ctx) {
        for (var i = 0; i < State.flipParticles.length; i++) {
            var s = State.flipParticles[i];
            var alpha = s.life / s.maxLife;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    // === Final Stats ===
    function updateFinalStats() {
        if (DOM.finalExamined) DOM.finalExamined.textContent = State.examCount;
        if (DOM.finalCollected) DOM.finalCollected.textContent = State.collectedCount;
        if (DOM.finalDistance) DOM.finalDistance.textContent = Math.round(State.totalDistance);
    }

    // === Main Loop ===
    function startLoop() {
        function tick(time) {
            State.time = time;

            State.smoothX += (State.mouseX - State.smoothX) * Config.lerpFactor;
            State.smoothY += (State.mouseY - State.smoothY) * Config.lerpFactor;

            DOM.cursorGlow.style.left = State.smoothX + 'px';
            DOM.cursorGlow.style.top = State.smoothY + 'px';

            updateLoupePosition();
            updateParticles();
            updateFlipParticles();

            // Periodically update distance stat (every ~30 frames)
            if (Math.floor(time / 500) !== Math.floor((time - 16) / 500)) {
                updateFinalStats();
            }

            var pctx = DOM.particleCanvas.getContext('2d');
            pctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            drawParticles(pctx);

            var fctx = DOM.flipCanvas.getContext('2d');
            fctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            drawFlipParticles(fctx);

            State.rafId = requestAnimationFrame(tick);
        }
        State.rafId = requestAnimationFrame(tick);
    }

    // === Utility ===
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    // === Boot ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
