(function () {
    'use strict';

    /* ============================================================
     * Merge City — 融城
     * 在 6×6 玻璃网格上放置建筑，相同等级的相邻建筑自动
     * 级联融合升级，从帐篷一路筑成大都市。配合粒子迸射、
     * 弹簧物理与微晶玻璃态容器。
     * ============================================================ */

    /* === Palettes === */
    var PALETTES = {
        aurora: { primaryRgb: '34,211,238', secondaryRgb: '129,140,248', accentRgb: '232,121,249' },
        ember:  { primaryRgb: '251,146,60', secondaryRgb: '244,63,94',   accentRgb: '251,191,36' },
        moss:   { primaryRgb: '52,211,153', secondaryRgb: '163,230,53',  accentRgb: '34,211,238' },
        dusk:   { primaryRgb: '244,114,182',secondaryRgb: '192,132,252', accentRgb: '96,165,250' }
    };

    /* === Building Definitions (tier → data) === */
    /* Each building: id, name, population, score, color (hex), svg path markup */
    var BUILDINGS = [
        { id: 0,  name: '帐篷',   pop: 2,    score: 1,     color: '#94a3b8', svg: tentSvg() },
        { id: 1,  name: '木屋',   pop: 6,    score: 3,     color: '#a3b89a', svg: hutSvg() },
        { id: 2,  name: '砖房',   pop: 16,   score: 8,     color: '#c4a373', svg: brickSvg() },
        { id: 3,  name: '公寓',   pop: 40,   score: 22,    color: '#818cf8', svg: aptSvg() },
        { id: 4,  name: '商店',   pop: 90,   score: 55,    color: '#22d3ee', svg: shopSvg() },
        { id: 5,  name: '办公楼', pop: 200,  score: 130,   color: '#34d399', svg: officeSvg() },
        { id: 6,  name: '酒店',   pop: 450,  score: 300,   color: '#e879f9', svg: hotelSvg() },
        { id: 7,  name: '医院',   pop: 1000, score: 680,   color: '#f472b6', svg: hospitalSvg() },
        { id: 8,  name: '塔楼',   pop: 2200, score: 1500,  color: '#fb923c', svg: towerSvg() },
        { id: 9,  name: '摩天楼', pop: 5000, score: 3200,  color: '#fbbf24', svg: skyscraperSvg() },
        { id: 10, name: '地标',   pop: 11000,score: 6800,  color: '#c084fc', svg: landmarkSvg() },
        { id: 11, name: '大都市', pop: 25000,score: 14000, color: '#f9a8d4', svg: metropolisSvg() }
    ];

    var GRID_COLS = 6;
    var GRID_ROWS = 6;
    var NEXT_TIER_WEIGHTS = [42, 28, 18, 8, 3, 1]; /* weighted spawn tiers 0-5 */

    /* === Global State === */
    var state = {
        grid: [],
        nextTier: 0,
        palette: 'aurora',
        score: 0,
        bestScore: 0,
        population: 0,
        turns: 0,
        highestTier: -1,
        unlocked: [],
        bulldozeMode: false,
        history: [],
        particles: [],
        isAnimating: false,
        gameOver: false,
        time: 0
    };

    /* === DOM References === */
    var gridEl, gridOverlay, fxCanvas, fxCtx, W, H, dpr;
    var elScore, elPop, elTier, elTurns, elBuildings;
    var elNextTile, elNextIcon, elNextName, elCodexList, elCodexCount;
    var resultModal, elResultTitle, elResultSub, elResultStats;

    /* === SVG Builders === */
    function wrapSvg(inner, color, opacity) {
        return '<svg viewBox="0 0 32 32" fill="none" stroke="' + (color || '#fff') + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" style="opacity:' + (opacity || 0.9) + '">' + inner + '</svg>';
    }

    function tentSvg() {
        return wrapSvg('<path d="M16 6L4 25h24L16 6z" fill="' + 'rgba(148,163,184,0.25)' + '"/><path d="M16 6v19" stroke-opacity="0.5"/>', '#94a3b8');
    }
    function hutSvg() {
        return wrapSvg('<path d="M7 16l9-8 9 8v10H7z" fill="rgba(163,184,154,0.25)"/><rect x="13" y="19" width="6" height="7" stroke-opacity="0.6"/>', '#a3b89a');
    }
    function brickSvg() {
        return wrapSvg('<rect x="7" y="11" width="18" height="15" rx="1" fill="rgba(196,163,115,0.25)"/><rect x="10" y="15" width="4" height="4" stroke-opacity="0.5"/><rect x="18" y="15" width="4" height="4" stroke-opacity="0.5"/><path d="M7 22h18" stroke-opacity="0.4"/>', '#c4a373');
    }
    function aptSvg() {
        return wrapSvg('<rect x="8" y="9" width="16" height="17" rx="1" fill="rgba(129,140,248,0.22)"/><rect x="11" y="12" width="3" height="3" stroke-opacity="0.5"/><rect x="18" y="12" width="3" height="3" stroke-opacity="0.5"/><rect x="11" y="17" width="3" height="3" stroke-opacity="0.5"/><rect x="18" y="17" width="3" height="3" stroke-opacity="0.5"/><rect x="14" y="22" width="4" height="4" stroke-opacity="0.6"/>', '#818cf8');
    }
    function shopSvg() {
        return wrapSvg('<path d="M8 12h16l-1.5-4H9.5L8 12z" fill="rgba(34,211,238,0.22)"/><rect x="9" y="12" width="14" height="14" fill="rgba(34,211,238,0.12)"/><rect x="14" y="18" width="4" height="8" stroke-opacity="0.6"/>', '#22d3ee');
    }
    function officeSvg() {
        return wrapSvg('<rect x="9" y="6" width="14" height="20" rx="1" fill="rgba(52,211,153,0.2)"/><line x1="12" y1="10" x2="20" y2="10" stroke-opacity="0.4"/><line x1="12" y1="14" x2="20" y2="14" stroke-opacity="0.4"/><line x1="12" y1="18" x2="20" y2="18" stroke-opacity="0.4"/><rect x="14" y="22" width="4" height="4" stroke-opacity="0.6"/>', '#34d399');
    }
    function hotelSvg() {
        return wrapSvg('<rect x="8" y="8" width="16" height="18" rx="1" fill="rgba(232,121,249,0.2)"/><rect x="11" y="11" width="3" height="3" stroke-opacity="0.5"/><rect x="18" y="11" width="3" height="3" stroke-opacity="0.5"/><rect x="11" y="16" width="3" height="3" stroke-opacity="0.5"/><rect x="18" y="16" width="3" height="3" stroke-opacity="0.5"/><path d="M14 22h4" stroke-opacity="0.5"/><text x="16" y="13" font-size="2.5" fill="none" stroke="none"></text>', '#e879f9');
    }
    function hospitalSvg() {
        return wrapSvg('<rect x="8" y="8" width="16" height="18" rx="1" fill="rgba(244,114,182,0.2)"/><path d="M14 12h4M16 10v4" stroke-width="2"/><rect x="11" y="17" width="3" height="3" stroke-opacity="0.5"/><rect x="18" y="17" width="3" height="3" stroke-opacity="0.5"/><rect x="14" y="21" width="4" height="5" stroke-opacity="0.6"/>', '#f472b6');
    }
    function towerSvg() {
        return wrapSvg('<path d="M13 26V8l3-3 3 3v18z" fill="rgba(251,146,60,0.2)"/><line x1="13" y1="12" x2="19" y2="12" stroke-opacity="0.4"/><line x1="13" y1="16" x2="19" y2="16" stroke-opacity="0.4"/><line x1="13" y1="20" x2="19" y2="20" stroke-opacity="0.4"/><rect x="15" y="23" width="2" height="3" stroke-opacity="0.6"/>', '#fb923c');
    }
    function skyscraperSvg() {
        return wrapSvg('<rect x="10" y="4" width="12" height="24" rx="0.5" fill="rgba(251,191,36,0.18)"/><rect x="12" y="7" width="2" height="2" fill="rgba(251,191,36,0.5)" stroke="none"/><rect x="16" y="7" width="2" height="2" fill="rgba(251,191,36,0.5)" stroke="none"/><rect x="12" y="11" width="2" height="2" fill="rgba(251,191,36,0.4)" stroke="none"/><rect x="16" y="11" width="2" height="2" fill="rgba(251,191,36,0.4)" stroke="none"/><rect x="12" y="15" width="2" height="2" fill="rgba(251,191,36,0.5)" stroke="none"/><rect x="16" y="15" width="2" height="2" fill="rgba(251,191,36,0.5)" stroke="none"/><rect x="14" y="22" width="4" height="6" stroke-opacity="0.6"/>', '#fbbf24');
    }
    function landmarkSvg() {
        return wrapSvg('<path d="M16 4v22" stroke-opacity="0.5"/><path d="M10 26h12" /><path d="M13 10l3-6 3 6" fill="rgba(192,132,252,0.2)"/><path d="M11 18h10l-1-8H12l-1 8z" fill="rgba(192,132,252,0.15)"/><circle cx="16" cy="6" r="1.5" fill="rgba(192,132,252,0.6)" stroke="none"/>', '#c084fc');
    }
    function metropolisSvg() {
        return wrapSvg('<rect x="6" y="14" width="5" height="12" fill="rgba(249,168,212,0.2)"/><rect x="12" y="8" width="6" height="18" fill="rgba(249,168,212,0.25)"/><rect x="20" y="11" width="6" height="15" fill="rgba(249,168,212,0.2)"/><rect x="13" y="11" width="1.5" height="1.5" fill="rgba(249,168,212,0.5)" stroke="none"/><rect x="15.5" y="11" width="1.5" height="1.5" fill="rgba(249,168,212,0.5)" stroke="none"/><rect x="13" y="14" width="1.5" height="1.5" fill="rgba(249,168,212,0.5)" stroke="none"/><rect x="15.5" y="14" width="1.5" height="1.5" fill="rgba(249,168,212,0.5)" stroke="none"/><path d="M4 26h24" stroke-opacity="0.5"/>', '#f9a8d4');
    }

    /* === Utility === */
    function $(id) { return document.getElementById(id); }

    function getPalette() { return PALETTES[state.palette]; }

    function weightedRandom(weights) {
        var total = 0;
        for (var i = 0; i < weights.length; i++) total += weights[i];
        var r = Math.random() * total;
        var acc = 0;
        for (var j = 0; j < weights.length; j++) {
            acc += weights[j];
            if (r < acc) return j;
        }
        return weights.length - 1;
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return r + ',' + g + ',' + b;
    }

    /* ============================================================
     * Grid Model
     * ============================================================ */
    function initGrid() {
        state.grid = [];
        for (var r = 0; r < GRID_ROWS; r++) {
            state.grid[r] = [];
            for (var c = 0; c < GRID_COLS; c++) {
                state.grid[r][c] = null;
            }
        }
    }

    function rollNextTier() {
        state.nextTier = weightedRandom(NEXT_TIER_WEIGHTS);
    }

    function getNeighbors(r, c) {
        var result = [];
        if (r > 0) result.push([r - 1, c]);
        if (r < GRID_ROWS - 1) result.push([r + 1, c]);
        if (c > 0) result.push([r, c - 1]);
        if (c < GRID_COLS - 1) result.push([r, c + 1]);
        return result;
    }

    function saveHistory() {
        var snapshot = {
            grid: state.grid.map(function (row) {
                return row.map(function (cell) { return cell ? { tier: cell.tier } : null; });
            }),
            nextTier: state.nextTier,
            score: state.score,
            population: state.population,
            turns: state.turns,
            highestTier: state.highestTier,
            unlocked: state.unlocked.slice()
        };
        state.history.push(snapshot);
        if (state.history.length > 10) state.history.shift();
    }

    function restoreHistory() {
        if (state.history.length === 0) return false;
        var snap = state.history.pop();
        state.nextTier = snap.nextTier;
        state.score = snap.score;
        state.population = snap.population;
        state.turns = snap.turns;
        state.highestTier = snap.highestTier;
        state.unlocked = snap.unlocked;
        state.gameOver = false;
        initGrid();
        for (var r = 0; r < GRID_ROWS; r++) {
            for (var c = 0; c < GRID_COLS; c++) {
                if (snap.grid[r][c]) {
                    state.grid[r][c] = { tier: snap.grid[r][c].tier };
                }
            }
        }
        renderAll();
        return true;
    }

    /* ============================================================
     * Core Place + Cascade Merge
     * ============================================================ */
    function placeAt(r, c) {
        if (state.isAnimating || state.gameOver) return;
        if (state.grid[r][c]) return;

        saveHistory();
        state.grid[r][c] = { tier: state.nextTier };
        unlock(state.nextTier);
        state.turns++;
        spawnPlacementParticles(r, c, state.nextTier);

        cascadeMerge(r, c, function () {
            rollNextTier();
            renderNext();
            checkGameOver();
        });
    }

    /* Iteratively merge neighbors of the same tier as (r,c) */
    function cascadeMerge(r, c, done) {
        state.isAnimating = true;

        var current = state.grid[r][c];
        if (!current) { state.isAnimating = false; done(); return; }

        var tier = current.tier;
        /* Don't merge if at max tier */
        if (tier >= BUILDINGS.length - 1) {
            state.isAnimating = false;
            updateStats();
            done();
            return;
        }

        /* Find same-tier neighbors */
        var neighbors = getNeighbors(r, c);
        var matches = [];
        for (var i = 0; i < neighbors.length; i++) {
            var nr = neighbors[i][0], nc = neighbors[i][1];
            if (state.grid[nr][nc] && state.grid[nr][nc].tier === tier) {
                matches.push([nr, nc]);
            }
        }

        if (matches.length === 0) {
            state.isAnimating = false;
            updateStats();
            done();
            return;
        }

        /* Merge: consume all matches, upgrade cell */
        var newTier = tier + 1;
        var gain = BUILDINGS[newTier].score;

        /* Animate consumed buildings out */
        for (var m = 0; m < matches.length; m++) {
            var mr = matches[m][0], mc = matches[m][1];
            animateRemove(mr, mc);
            state.grid[mr][mc] = null;
        }

        /* Upgrade the placed cell */
        state.grid[r][c].tier = newTier;
        unlock(newTier);
        spawnMergeParticles(r, c, newTier);
        showScorePop(r, c, '+' + gain);
        state.score += gain;
        bumpStat(elScore);

        /* Re-render the upgraded cell with appear animation */
        renderCell(r, c, true);

        /* After animation, recurse to check for further merges */
        setTimeout(function () {
            cascadeMerge(r, c, done);
        }, 280);
    }

    function animateRemove(r, c) {
        var cell = getCellEl(r, c);
        if (!cell) return;
        var building = cell.querySelector('.building');
        if (building) {
            building.classList.add('merging-out');
        }
    }

    function bulldozeAt(r, c) {
        if (state.isAnimating || state.gameOver) return;
        if (!state.grid[r][c]) return;

        saveHistory();
        var tier = state.grid[r][c].tier;
        state.grid[r][c] = null;
        var cell = getCellEl(r, c);
        var building = cell.querySelector('.building');
        if (building) {
            building.classList.add('removing');
            spawnDustParticles(r, c);
        }
        state.turns++;
        setTimeout(function () { renderCell(r, c); }, 200);
        updateStats();
    }

    /* ============================================================
     * Rendering
     * ============================================================ */
    function buildGridDOM() {
        gridEl.innerHTML = '';
        for (var r = 0; r < GRID_ROWS; r++) {
            for (var c = 0; c < GRID_COLS; c++) {
                var cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                bindCellEvents(cell, r, c);
                gridEl.appendChild(cell);
            }
        }
    }

    function getCellEl(r, c) {
        return gridEl.children[r * GRID_COLS + c];
    }

    function renderCell(r, c, animate) {
        var cell = getCellEl(r, c);
        if (!cell) return;

        /* Remove old building */
        var old = cell.querySelector('.building');
        if (old) old.remove();

        var data = state.grid[r][c];
        if (!data) {
            cell.classList.remove('occupied');
            return;
        }

        cell.classList.add('occupied');
        var b = BUILDINGS[data.tier];
        var building = document.createElement('div');
        building.className = 'building' + (animate ? ' appearing' : '');

        var tint = 'rgba(' + hexToRgb(b.color) + ',0.18)';
        var border = 'rgba(' + hexToRgb(b.color) + ',0.35)';
        building.style.background = 'linear-gradient(160deg, ' + tint + ', rgba(255,255,255,0.02))';
        building.style.borderColor = border;

        var iconWrap = document.createElement('div');
        iconWrap.className = 'building-icon';
        iconWrap.innerHTML = b.svg;
        building.appendChild(iconWrap);

        var tierLabel = document.createElement('span');
        tierLabel.className = 'building-tier';
        tierLabel.textContent = (data.tier + 1);
        building.appendChild(tierLabel);

        cell.appendChild(building);
    }

    function renderAll() {
        for (var r = 0; r < GRID_ROWS; r++) {
            for (var c = 0; c < GRID_COLS; c++) {
                renderCell(r, c);
            }
        }
        renderNext();
        renderCodex();
        updateStats();
    }

    function renderNext() {
        var b = BUILDINGS[state.nextTier];
        elNextIcon.innerHTML = b.svg;
        elNextName.textContent = b.name;
        var tint = 'rgba(' + hexToRgb(b.color) + ',0.2)';
        var border = 'rgba(' + hexToRgb(b.color) + ',0.4)';
        elNextTile.style.background = 'linear-gradient(160deg,' + tint + ', rgba(255,255,255,0.02))';
        elNextTile.style.borderColor = border;
        elNextTile.classList.remove('pop');
        void elNextTile.offsetWidth;
        elNextTile.classList.add('pop');
    }

    function renderCodex() {
        elCodexList.innerHTML = '';
        for (var i = 0; i < BUILDINGS.length; i++) {
            var b = BUILDINGS[i];
            var item = document.createElement('div');
            item.className = 'codex-item' + (state.unlocked[i] ? ' unlocked' : '');
            var icon = document.createElement('div');
            icon.className = 'codex-icon';
            icon.innerHTML = b.svg;
            var name = document.createElement('span');
            name.className = 'codex-name';
            name.textContent = (i + 1) + '. ' + b.name;
            item.appendChild(icon);
            item.appendChild(name);
            elCodexList.appendChild(item);
        }
        var count = state.unlocked.filter(function (u) { return u; }).length;
        elCodexCount.textContent = count + '/' + BUILDINGS.length;
    }

    function unlock(tier) {
        if (!state.unlocked[tier]) {
            state.unlocked[tier] = true;
            if (tier > state.highestTier) state.highestTier = tier;
            renderCodex();
        }
    }

    function updateStats() {
        var pop = 0, buildings = 0, highest = -1;
        for (var r = 0; r < GRID_ROWS; r++) {
            for (var c = 0; c < GRID_COLS; c++) {
                var cell = state.grid[r][c];
                if (cell) {
                    pop += BUILDINGS[cell.tier].pop;
                    buildings++;
                    if (cell.tier > highest) highest = cell.tier;
                }
            }
        }
        state.population = pop;
        if (state.score > state.bestScore) state.bestScore = state.score;

        elPop.textContent = formatNum(pop);
        elScore.textContent = formatNum(state.score);
        elTurns.textContent = state.turns;
        elBuildings.textContent = buildings;
        elTier.textContent = highest >= 0 ? BUILDINGS[highest].name : '—';
    }

    function formatNum(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
        return n.toString();
    }

    function bumpStat(el) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
    }

    /* ============================================================
     * Cell Events
     * ============================================================ */
    function bindCellEvents(cell, r, c) {
        cell.addEventListener('click', function () {
            if (state.bulldozeMode) {
                bulldozeAt(r, c);
            } else {
                placeAt(r, c);
            }
        });

        cell.addEventListener('mouseenter', function () {
            if (state.bulldozeMode) {
                if (state.grid[r][c]) cell.classList.add('hover-bulldoze', 'bulldoze-target');
            } else {
                if (!state.grid[r][c]) cell.classList.add('hover-valid');
            }
        });

        cell.addEventListener('mouseleave', function () {
            cell.classList.remove('hover-valid', 'hover-bulldoze', 'bulldoze-target');
        });
    }

    /* ============================================================
     * Score Pop Text
     * ============================================================ */
    function showScorePop(r, c, text) {
        var cell = getCellEl(r, c);
        if (!cell) return;
        var rect = cell.getBoundingClientRect();
        var pop = document.createElement('div');
        pop.className = 'score-pop';
        pop.textContent = text;
        pop.style.left = (rect.left + rect.width / 2) + 'px';
        pop.style.top = (rect.top + rect.height / 2) + 'px';
        document.body.appendChild(pop);
        setTimeout(function () { pop.remove(); }, 1000);
    }

    /* ============================================================
     * Particle System (Canvas)
     * ============================================================ */
    function spawnPlacementParticles(r, c, tier) {
        var cell = getCellEl(r, c);
        if (!cell) return;
        var rect = cell.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var color = hexToRgb(BUILDINGS[tier].color);
        var count = 12;
        for (var i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            var speed = 1 + Math.random() * 2.5;
            state.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5,
                life: 1, age: 0, maxAge: 40 + Math.random() * 20,
                size: 1.5 + Math.random() * 2,
                color: color
            });
        }
    }

    function spawnMergeParticles(r, c, tier) {
        var cell = getCellEl(r, c);
        if (!cell) return;
        var rect = cell.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var color = hexToRgb(BUILDINGS[tier].color);
        var count = 20 + tier * 2;

        /* Burst ring */
        for (var i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2;
            var speed = 2 + Math.random() * 3.5;
            state.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1, age: 0, maxAge: 50 + Math.random() * 30,
                size: 2 + Math.random() * 3,
                color: color
            });
        }

        /* Shockwave ring effect */
        state.particles.push({
            x: cx, y: cy, vx: 0, vy: 0,
            life: 1, age: 0, maxAge: 30,
            size: 4, ring: true, ringR: 4, ringMax: 60,
            color: color
        });
    }

    function spawnDustParticles(r, c) {
        var cell = getCellEl(r, c);
        if (!cell) return;
        var rect = cell.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        for (var i = 0; i < 16; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 0.5 + Math.random() * 2;
            state.particles.push({
                x: cx + (Math.random() - 0.5) * 20,
                y: cy + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 1, age: 0, maxAge: 35 + Math.random() * 20,
                size: 1 + Math.random() * 2.5,
                color: '180,180,180',
                gravity: 0.05
            });
        }
    }

    function updateParticles() {
        fxCtx.clearRect(0, 0, W, H);
        var toRemove = [];

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            p.age++;

            if (p.ring) {
                /* Expanding ring shockwave */
                var t = p.age / p.maxAge;
                p.ringR = 4 + (p.ringMax - 4) * t;
                var alpha = (1 - t) * 0.5;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, p.ringR, 0, Math.PI * 2);
                fxCtx.strokeStyle = 'rgba(' + p.color + ',' + alpha + ')';
                fxCtx.lineWidth = 2 * (1 - t) + 0.5;
                fxCtx.stroke();
            } else {
                p.vy += p.gravity || 0.03;
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.x += p.vx;
                p.y += p.vy;

                var fade = 1 - p.age / p.maxAge;
                var alpha = fade * 0.8;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
                fxCtx.fillStyle = 'rgba(' + p.color + ',' + alpha + ')';
                fxCtx.fill();

                /* Glow */
                if (fade > 0.5) {
                    fxCtx.beginPath();
                    fxCtx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                    fxCtx.fillStyle = 'rgba(' + p.color + ',' + (alpha * 0.15) + ')';
                    fxCtx.fill();
                }
            }

            if (p.age >= p.maxAge) toRemove.push(i);
        }

        for (var k = toRemove.length - 1; k >= 0; k--) {
            state.particles.splice(toRemove[k], 1);
        }
    }

    /* ============================================================
     * Game Over Check
     * ============================================================ */
    function checkGameOver() {
        var hasEmpty = false;
        for (var r = 0; r < GRID_ROWS; r++) {
            for (var c = 0; c < GRID_COLS; c++) {
                if (!state.grid[r][c]) { hasEmpty = true; break; }
            }
            if (hasEmpty) break;
        }

        if (!hasEmpty) {
            /* Check if any merge is still possible */
            var canMerge = false;
            for (var rr = 0; rr < GRID_ROWS && !canMerge; rr++) {
                for (var cc = 0; cc < GRID_COLS && !canMerge; cc++) {
                    var cell = state.grid[rr][cc];
                    if (!cell) continue;
                    var nbrs = getNeighbors(rr, cc);
                    for (var n = 0; n < nbrs.length; n++) {
                        var nb = state.grid[nbrs[n][0]][nbrs[n][1]];
                        if (nb && nb.tier === cell.tier) { canMerge = true; break; }
                    }
                }
            }

            if (!canMerge) {
                state.gameOver = true;
                showResult();
            }
        }
    }

    function showResult() {
        var highest = -1;
        for (var r = 0; r < GRID_ROWS; r++) {
            for (var c = 0; c < GRID_COLS; c++) {
                if (state.grid[r][c] && state.grid[r][c].tier > highest) {
                    highest = state.grid[r][c].tier;
                }
            }
        }

        elResultTitle.textContent = '城市已满';
        elResultSub.textContent = '没有更多空地可以建造了';
        elResultStats.innerHTML =
            statRow('最终分数', formatNum(state.score)) +
            statRow('城市人口', formatNum(state.population)) +
            statRow('最高建筑', highest >= 0 ? BUILDINGS[highest].name : '—') +
            statRow('总回合数', state.turns);
        resultModal.classList.add('visible');
    }

    function statRow(label, val) {
        return '<div class="result-stat-row"><span class="result-stat-label">' + label +
            '</span><span class="result-stat-val">' + val + '</span></div>';
    }

    /* ============================================================
     * Animation Loop
     * ============================================================ */
    function animate() {
        state.time++;
        updateParticles();
        requestAnimationFrame(animate);
    }

    /* ============================================================
     * Resize
     * ============================================================ */
    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        fxCanvas.width = W * dpr;
        fxCanvas.height = H * dpr;
        fxCanvas.style.width = W + 'px';
        fxCanvas.style.height = H + 'px';
        fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ============================================================
     * Controls
     * ============================================================ */
    function bindControls() {
        $('btn-reset').addEventListener('click', function () {
            resetGame();
        });

        $('btn-undo').addEventListener('click', function () {
            if (restoreHistory()) {
                resultModal.classList.remove('visible');
            }
        });

        var bulldozeBtn = $('btn-bulldoze');
        bulldozeBtn.addEventListener('click', function () {
            state.bulldozeMode = !state.bulldozeMode;
            bulldozeBtn.classList.toggle('toggled', state.bulldozeMode);
            document.body.style.cursor = state.bulldozeMode ? 'crosshair' : '';
        });

        $('btn-fullscreen').addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen();
            }
        });

        $('result-restart').addEventListener('click', function () {
            resultModal.classList.remove('visible');
            resetGame();
        });

        var paletteBtns = document.querySelectorAll('.palette-btn');
        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.palette = this.dataset.palette;
                document.body.className = 'palette-' + state.palette;
            });
        });

        /* Keyboard shortcuts */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (restoreHistory()) resultModal.classList.remove('visible');
            } else if (e.key === 'r' || e.key === 'R') {
                resetGame();
            } else if (e.key === 'b' || e.key === 'B') {
                bulldozeBtn.click();
            }
        });
    }

    function resetGame() {
        state.score = 0;
        state.population = 0;
        state.turns = 0;
        state.highestTier = -1;
        state.unlocked = [];
        state.history = [];
        state.bulldozeMode = false;
        state.gameOver = false;
        state.particles = [];
        $('btn-bulldoze').classList.remove('toggled');
        document.body.style.cursor = '';
        resultModal.classList.remove('visible');
        initGrid();
        rollNextTier();
        renderAll();
    }

    /* ============================================================
     * Init
     * ============================================================ */
    function init() {
        gridEl = $('grid');
        gridOverlay = $('grid-overlay');
        fxCanvas = $('fx-canvas');
        fxCtx = fxCanvas.getContext('2d');
        elScore = $('stat-score');
        elPop = $('stat-population');
        elTier = $('stat-tier');
        elTurns = $('stat-turns');
        elBuildings = $('stat-buildings');
        elNextTile = $('next-tile');
        elNextIcon = $('next-icon');
        elNextName = $('next-name');
        elCodexList = $('codex-list');
        elCodexCount = $('codex-count');
        resultModal = $('result-modal');
        elResultTitle = $('result-title');
        elResultSub = $('result-sub');
        elResultStats = $('result-stats');

        /* Init unlocked array */
        for (var i = 0; i < BUILDINGS.length; i++) state.unlocked.push(false);

        resize();
        buildGridDOM();
        initGrid();
        rollNextTier();
        renderAll();
        bindControls();
        animate();

        window.addEventListener('resize', resize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
