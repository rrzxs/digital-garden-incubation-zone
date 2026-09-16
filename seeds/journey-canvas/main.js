/**
 * Journey Canvas 旅途画布
 * 手绘路径 → Chaikin 平滑 → 自动里程碑 → 旅行者光球 + 粒子流场
 */
(function () {
    'use strict';

    // === DOM Elements ===
    const stage = document.getElementById('stage');
    const journeyCanvas = document.getElementById('journey-canvas');
    const fieldCanvas = document.getElementById('field-canvas');
    const jctx = journeyCanvas.getContext('2d');
    const fctx = fieldCanvas.getContext('2d');
    const cursorGlow = document.getElementById('cursor-glow');
    const hint = document.getElementById('stage-hint');
    const stationCard = document.getElementById('station-card');
    const stationGlyph = document.getElementById('station-glyph');
    const stationIndexEl = document.getElementById('station-index');
    const stationNameEl = document.getElementById('station-name');
    const stationPoemEl = document.getElementById('station-poem');
    const tmDist = document.getElementById('tm-dist');
    const tmStations = document.getElementById('tm-stations');
    const tmMode = document.getElementById('tm-mode');
    const timelineEl = document.getElementById('timeline');
    const timelineFill = document.getElementById('timeline-fill');
    const timelineHead = document.getElementById('timeline-head');
    const timelineMarks = document.getElementById('timeline-marks');
    const timelineLabel = document.getElementById('timeline-label');
    const btnPlay = document.getElementById('btn-play');
    const btnClear = document.getElementById('btn-clear');
    const btnRedraw = document.getElementById('btn-redraw');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const playLabel = document.getElementById('play-label');
    const speedSlider = document.getElementById('speed-slider');
    const themeToggle = document.getElementById('theme-toggle');
    const toastContainer = document.getElementById('toast-container');

    // === Constants & State ===
    const MIN_POINT_DIST = 6;          // 采样间距 px
    const STATION_GAP = 190;           // 里程碑弧长间隔 px
    const CHAIKIN_ROUNDS = 3;
    const STATION_GLYPHS = ['◈', '✦', '☾', '❋', '◭', '◍', '✧', '⌘', '❀', '⊛'];

    const STATION_POOL = [
        ['晨雾渡口', '雾未散尽，船已离岸，远方的轮廓正在生成。'],
        ['碎星原野', '脚下每一粒光，都是某个人未曾说出口的愿望。'],
        ['回声峡谷', '你喊出的名字，山谷替你保管了很多年。'],
        ['薄暮灯台', '守灯人说：所有航线，最终都会被光接住。'],
        ['季风集市', '旅人在此交换故事，用一枚旧车票换半场雨。'],
        ['镜湖驿站', '湖面倒映的不是你，是你想去成为的那个人。'],
        ['苔径岔路', '两条路都通向远方，选一条，就把另一条留给想象。'],
        ['熔金海湾', '落日沉入海面时，整片水都成了流动的琥珀。'],
        ['无名山口', '地图上没有名字的地方，往往风最自由。'],
        ['萤火山谷', '微小的光聚在一起，就足以照亮一整段夜路。'],
        ['潮汐栈桥', '潮起时启程，潮落时原谅所有搁浅的计划。'],
        ['终焉花园', '旅途结束的地方，恰是另一朵花开始的地方。']
    ];
    const START_STATION = ['启程之点', '笔尖落下的地方，时间开始向前流动。'];
    const END_STATION = ['抵达之境', '线走到尽头，而故事才刚刚展开边界。'];

    const state = {
        theme: 'deep-ocean',
        mode: 'IDLE',                 // IDLE | DRAW | READY | TRAVEL | PAUSE
        rawPoints: [],
        path: [],                     // 平滑后点列
        cumLen: [],                   // 累计弧长
        totalLen: 0,
        stations: [],
        progress: 0,                  // 0 ~ 1
        targetProgress: 0,
        playSpeed: 1,
        draggingTimeline: false,
        lastStationShown: -1,
        mouse: { x: -999, y: -999, inStage: false },
        ripples: [],
        travelerTrail: [],
        time: 0
    };

    const particles = [];

    // === Theme Palettes (canvas 侧) ===
    const THEMES = {
        'deep-ocean': { accent: [76, 201, 240], accent2: [123, 47, 247], accent3: [46, 230, 197] },
        'aurora': { accent: [107, 255, 184], accent2: [41, 216, 199], accent3: [182, 255, 92] },
        'ember': { accent: [255, 158, 79], accent2: [255, 94, 58], accent3: [255, 209, 102] },
        'void': { accent: [184, 184, 255], accent2: [138, 138, 223], accent3: [224, 224, 255] }
    };

    function themeRGB(key, alpha) {
        const c = THEMES[state.theme][key];
        return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
    }

    // === Geometry Helpers ===
    function dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    /** Chaikin 切角平滑 */
    function chaikin(points, rounds) {
        let pts = points;
        for (let r = 0; r < rounds; r++) {
            if (pts.length < 3) break;
            const next = [pts[0]];
            for (let i = 0; i < pts.length - 1; i++) {
                const p = pts[i];
                const q = pts[i + 1];
                next.push({ x: p.x * 0.75 + q.x * 0.25, y: p.y * 0.75 + q.y * 0.25 });
                next.push({ x: p.x * 0.25 + q.x * 0.75, y: p.y * 0.25 + q.y * 0.75 });
            }
            next.push(pts[pts.length - 1]);
            pts = next;
        }
        return pts;
    }

    function computeCumulative(points) {
        const cum = [0];
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            total += dist(points[i - 1], points[i]);
            cum.push(total);
        }
        return { cum, total };
    }

    /** 按弧长取路径上的点与切线角 */
    function pointAtLen(len) {
        const { path, cumLen, totalLen } = state;
        if (!path.length || totalLen === 0) return null;
        const L = Math.max(0, Math.min(totalLen, len));
        let lo = 0, hi = cumLen.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (cumLen[mid] < L) lo = mid + 1;
            else hi = mid;
        }
        const i = Math.max(1, lo);
        const seg = cumLen[i] - cumLen[i - 1] || 1;
        const t = (L - cumLen[i - 1]) / seg;
        const p = path[i - 1];
        const q = path[i];
        return {
            x: p.x + (q.x - p.x) * t,
            y: p.y + (q.y - p.y) * t,
            angle: Math.atan2(q.y - p.y, q.x - p.x)
        };
    }

    // === Path Lifecycle ===
    function finalizePath() {
        if (state.rawPoints.length < 6) {
            state.rawPoints = [];
            setMode('IDLE');
            hint.classList.remove('hidden');
            toast('路径太短了，再画长一点 ✒');
            return;
        }
        state.path = chaikin(state.rawPoints, CHAIKIN_ROUNDS);
        const { cum, total } = computeCumulative(state.path);
        state.cumLen = cum;
        state.totalLen = total;
        buildStations();
        state.progress = 0;
        state.targetProgress = 0;
        state.travelerTrail = [];
        state.lastStationShown = -1;
        renderTimelineMarks();
        timelineEl.classList.add('has-path');
        hint.classList.add('hidden');
        btnPlay.disabled = false;
        setMode('READY');
        showStation(0);
        toast(`航线已生成 · ${state.stations.length} 个站点 · ${total.toFixed(0)}u`);
    }

    function buildStations() {
        const stations = [];
        const total = state.totalLen;
        // 起点站
        stations.push({ at: 0, name: START_STATION[0], poem: START_STATION[1], glyph: '✒' });
        // 中途站：弧长等距 + 抖动，避免机械感
        let d = STATION_GAP;
        let idx = 0;
        while (total - d > STATION_GAP * 0.55) {
            stations.push({
                at: d,
                name: STATION_POOL[idx % STATION_POOL.length][0],
                poem: STATION_POOL[idx % STATION_POOL.length][1],
                glyph: STATION_GLYPHS[idx % STATION_GLYPHS.length]
            });
            d += STATION_GAP * (0.85 + Math.random() * 0.35);
            idx++;
        }
        // 终点站
        stations.push({ at: total, name: END_STATION[0], poem: END_STATION[1], glyph: '◉' });
        state.stations = stations;
        tmStations.textContent = stations.length;
    }

    function clearPath(silent) {
        state.rawPoints = [];
        state.path = [];
        state.cumLen = [];
        state.totalLen = 0;
        state.stations = [];
        state.progress = 0;
        state.targetProgress = 0;
        state.travelerTrail = [];
        state.lastStationShown = -1;
        state.playSpeed = parseFloat(speedSlider.value);
        btnPlay.disabled = true;
        stationCard.classList.remove('visible');
        timelineMarks.innerHTML = '';
        timelineFill.style.width = '0%';
        timelineHead.style.left = '0%';
        timelineLabel.textContent = '0%';
        timelineEl.classList.remove('has-path');
        hint.classList.remove('hidden');
        setMode('IDLE');
        if (!silent) toast('画布已清空，期待新的航线');
    }

    // === Drawing Interaction ===
    function stagePos(e) {
        const rect = stage.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    journeyCanvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        journeyCanvas.setPointerCapture(e.pointerId);
        const p = stagePos(e);
        clearPath(true);
        state.rawPoints = [p];
        state.ripples.push({ x: p.x, y: p.y, r: 0, life: 1 });
        hint.classList.add('hidden');
        setMode('DRAW');
    });

    journeyCanvas.addEventListener('pointermove', (e) => {
        const p = stagePos(e);
        state.mouse.x = p.x;
        state.mouse.y = p.y;
        state.mouse.inStage = true;
        if (state.mode !== 'DRAW') return;
        const last = state.rawPoints[state.rawPoints.length - 1];
        if (!last || dist(last, p) >= MIN_POINT_DIST) {
            state.rawPoints.push(p);
        }
    });

    journeyCanvas.addEventListener('pointerup', () => {
        if (state.mode === 'DRAW') finalizePath();
    });

    journeyCanvas.addEventListener('pointerleave', () => {
        state.mouse.inStage = false;
    });

    stage.addEventListener('pointermove', (e) => {
        const p = stagePos(e);
        state.mouse.x = p.x;
        state.mouse.y = p.y;
        state.mouse.inStage = true;
    });

    stage.addEventListener('click', (e) => {
        if (state.mode === 'READY' || state.mode === 'PAUSE' || state.mode === 'TRAVEL') {
            const p = stagePos(e);
            state.ripples.push({ x: p.x, y: p.y, r: 0, life: 1 });
        }
    });

    // === Traveler ===
    function tickTraveler(dt) {
        if (state.mode !== 'TRAVEL') return;
        state.targetProgress = Math.min(1, state.targetProgress + dt * 0.055 * state.playSpeed);
        if (state.targetProgress >= 1) {
            state.targetProgress = 1;
        }
    }

    /** 弹簧-阻尼逼近，让进度柔和启动/停止 */
    function springProgress(dt) {
        const k = 6.5;
        const damp = 0.82;
        state.progress += (state.targetProgress - state.progress) * Math.min(1, k * dt * damp);
        if (Math.abs(state.targetProgress - state.progress) < 0.0004) {
            state.progress = state.targetProgress;
        }
        if (state.mode === 'TRAVEL' && state.progress >= 1) {
            setMode('READY');
            showStation(state.stations.length - 1);
            toast('旅途抵达终点 ✦');
            return;
        }
    }

    function checkStationArrival() {
        if (!state.path.length) return;
        const curLen = state.progress * state.totalLen;
        for (let i = 0; i < state.stations.length; i++) {
            if (curLen >= state.stations[i].at - 2 && i > state.lastStationShown) {
                showStation(i);
                const pt = pointAtLen(state.stations[i].at);
                if (pt) state.ripples.push({ x: pt.x, y: pt.y, r: 0, life: 1 });
                state.lastStationShown = i;
            }
        }
    }

    // === Station Card (乱码揭示) ===
    const SCRAMBLE_CHARS = '◈✦✧◍☾◭❋⌁≋∘∷⌘❀⊛';

    function scrambleTo(el, text, duration) {
        const start = performance.now();
        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const reveal = Math.floor(t * text.length);
            let out = text.slice(0, reveal);
            for (let i = reveal; i < text.length; i++) {
                out += text[i] === ' ' ? ' ' : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
            }
            el.textContent = out;
            if (t < 1) requestAnimationFrame(frame);
            else el.textContent = text;
        }
        requestAnimationFrame(frame);
    }

    function showStation(i) {
        const s = state.stations[i];
        if (!s) return;
        stationGlyph.textContent = s.glyph;
        stationIndexEl.textContent = `STATION ${String(i).padStart(2, '0')}`;
        scrambleTo(stationNameEl, s.name, 500);
        scrambleTo(stationPoemEl, s.poem, 750);
        stationCard.classList.remove('visible');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            stationCard.classList.add('visible');
        }));
    }

    // === Timeline ===
    function renderTimelineMarks() {
        timelineMarks.innerHTML = '';
        state.stations.forEach((s) => {
            const pct = (s.at / state.totalLen) * 100;
            const mark = document.createElement('div');
            mark.className = 'timeline-mark';
            mark.style.left = `${pct}%`;
            mark.title = s.name;
            mark.addEventListener('click', (e) => {
                e.stopPropagation();
                seekTo(s.at / state.totalLen, true);
            });
            timelineMarks.appendChild(mark);
        });
    }

    function seekTo(p, showArrive) {
        if (!state.path.length) return;
        state.targetProgress = Math.max(0, Math.min(1, p));
        state.progress = Math.min(state.progress, state.targetProgress + 0.02);
        if (state.mode === 'TRAVEL' && state.targetProgress >= 1) setMode('READY');
        // 更新已过站点
        const curLen = state.targetProgress * state.totalLen;
        let passed = -1;
        state.stations.forEach((s, i) => { if (curLen >= s.at - 2) passed = i; });
        state.lastStationShown = passed;
        if (showArrive && passed >= 0) showStation(passed);
    }

    function timelineFromEvent(e) {
        const rect = timelineEl.querySelector('.timeline-track').getBoundingClientRect();
        const x = e.clientX - rect.left;
        seekTo(x / rect.width, false);
    }

    timelineEl.addEventListener('pointerdown', (e) => {
        if (!state.path.length) return;
        state.draggingTimeline = true;
        timelineEl.classList.add('dragging');
        timelineEl.setPointerCapture(e.pointerId);
        timelineFromEvent(e);
    });

    timelineEl.addEventListener('pointermove', (e) => {
        if (state.draggingTimeline) timelineFromEvent(e);
    });

    timelineEl.addEventListener('pointerup', () => {
        state.draggingTimeline = false;
        timelineEl.classList.remove('dragging');
        const curLen = state.targetProgress * state.totalLen;
        let passed = -1;
        state.stations.forEach((s, i) => { if (curLen >= s.at - 2) passed = i; });
        if (passed >= 0 && passed !== state.lastStationShown) showStation(passed);
        state.lastStationShown = passed;
    });

    function updateTimelineUI() {
        const pct = state.progress * 100;
        timelineFill.style.width = `${pct}%`;
        timelineHead.style.left = `${pct}%`;
        timelineLabel.textContent = `${pct.toFixed(0)}%`;
    }

    // === Controls ===
    function setMode(mode) {
        state.mode = mode;
        tmMode.textContent = mode;
        const traveling = mode === 'TRAVEL';
        iconPlay.style.display = traveling ? 'none' : '';
        iconPause.style.display = traveling ? '' : 'none';
        playLabel.textContent = traveling ? '暂停' : (mode === 'PAUSE' ? '继续' : '出发');
    }

    btnPlay.addEventListener('click', () => {
        if (!state.path.length) return;
        if (state.mode === 'TRAVEL') {
            setMode('PAUSE');
        } else {
            if (state.targetProgress >= 1) {
                state.targetProgress = 0;
                state.progress = 0;
                state.lastStationShown = -1;
                state.travelerTrail = [];
            }
            setMode('TRAVEL');
            toast('旅途开始，愿风与你同行');
        }
    });

    btnClear.addEventListener('click', () => clearPath());
    btnRedraw.addEventListener('click', () => {
        clearPath(true);
        toast('重新落笔，画出新的航线');
    });

    speedSlider.addEventListener('input', () => {
        state.playSpeed = parseFloat(speedSlider.value);
    });

    themeToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-btn');
        if (!btn) return;
        themeToggle.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', state.theme);
    });

    document.documentElement.setAttribute('data-theme', 'deep-ocean');
    state.playSpeed = parseFloat(speedSlider.value);

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            if (state.path.length) btnPlay.click();
        } else if (e.key === 'c' || e.key === 'C') {
            clearPath();
        } else if (e.key === 'r' || e.key === 'R') {
            btnRedraw.click();
        }
    });

    // === Toast ===
    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        toastContainer.appendChild(el);
        setTimeout(() => {
            el.classList.add('leaving');
            setTimeout(() => el.remove(), 500);
        }, 2600);
    }

    // === Ambient Particle Field ===
    function initParticles() {
        particles.length = 0;
        const count = Math.min(110, Math.floor(window.innerWidth / 12));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.18,
                vy: (Math.random() - 0.5) * 0.18,
                size: 0.6 + Math.random() * 1.8,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function tickParticles(dt) {
        fctx.clearRect(0, 0, fieldCanvas.width, fieldCanvas.height);
        const t = state.time;
        for (const p of particles) {
            // 流场微风 + 呼吸
            p.vx += Math.sin(t * 0.4 + p.y * 0.004) * 0.0012;
            p.vy += Math.cos(t * 0.3 + p.x * 0.004) * 0.0012;
            p.vx *= 0.995;
            p.vy *= 0.995;
            // 光标柔力场
            const dx = p.x - (state.mouse.inStage ? state.mouse.x + stage.offsetLeft : -9999);
            const dy = p.y - (state.mouse.y + stage.offsetTop);
            const md = Math.hypot(dx, dy);
            if (md < 140 && md > 1) {
                p.vx += (dx / md) * 0.012;
                p.vy += (dy / md) * 0.012;
            }
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            if (p.x < -10) p.x = fieldCanvas.width + 10;
            if (p.x > fieldCanvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = fieldCanvas.height + 10;
            if (p.y > fieldCanvas.height + 10) p.y = -10;
            const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.4 + p.phase));
            fctx.beginPath();
            fctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            fctx.fillStyle = themeRGB('accent', 0.5 * tw);
            fctx.fill();
        }
    }

    // === Journey Canvas Render ===
    function renderJourney(dt) {
        const w = journeyCanvas.width / window.devicePixelRatio;
        const h = journeyCanvas.height / window.devicePixelRatio;
        jctx.clearRect(0, 0, w, h);

        // 绘制中的原始笔触
        if (state.mode === 'DRAW' && state.rawPoints.length > 1) {
            jctx.beginPath();
            jctx.moveTo(state.rawPoints[0].x, state.rawPoints[0].y);
            for (const p of state.rawPoints) jctx.lineTo(p.x, p.y);
            jctx.strokeStyle = themeRGB('accent', 0.55);
            jctx.lineWidth = 2;
            jctx.lineCap = 'round';
            jctx.lineJoin = 'round';
            jctx.setLineDash([1, 9]);
            jctx.stroke();
            jctx.setLineDash([]);
        }

        if (!state.path.length) return;

        // 底层辉光航线
        jctx.save();
        jctx.shadowColor = themeRGB('accent', 0.9);
        jctx.shadowBlur = 22;
        jctx.beginPath();
        jctx.moveTo(state.path[0].x, state.path[0].y);
        for (const p of state.path) jctx.lineTo(p.x, p.y);
        jctx.strokeStyle = themeRGB('accent', 0.16);
        jctx.lineWidth = 8;
        jctx.lineCap = 'round';
        jctx.lineJoin = 'round';
        jctx.stroke();
        jctx.restore();

        // 主航线
        jctx.beginPath();
        jctx.moveTo(state.path[0].x, state.path[0].y);
        for (const p of state.path) jctx.lineTo(p.x, p.y);
        jctx.strokeStyle = themeRGB('accent', 0.85);
        jctx.lineWidth = 2;
        jctx.stroke();

        // 已走过的部分：亮色虚线流动
        const walkedLen = state.progress * state.totalLen;
        if (walkedLen > 1) {
            jctx.save();
            jctx.beginPath();
            jctx.moveTo(state.path[0].x, state.path[0].y);
            let acc = 0;
            for (let i = 1; i < state.path.length; i++) {
                acc = state.cumLen[i];
                if (acc > walkedLen) {
                    const pt = pointAtLen(walkedLen);
                    if (pt) jctx.lineTo(pt.x, pt.y);
                    break;
                }
                jctx.lineTo(state.path[i].x, state.path[i].y);
            }
            jctx.strokeStyle = themeRGB('accent3', 0.95);
            jctx.lineWidth = 2.6;
            jctx.shadowColor = themeRGB('accent3', 0.9);
            jctx.shadowBlur = 14;
            const dashOffset = -(state.time * 40 * state.playSpeed) % 24;
            jctx.setLineDash([10, 14]);
            jctx.lineDashOffset = dashOffset;
            jctx.stroke();
            jctx.restore();
            jctx.setLineDash([]);
        }

        // 里程碑站点
        state.stations.forEach((s, i) => {
            const pt = pointAtLen(s.at);
            if (!pt) return;
            const passed = walkedLen >= s.at - 2;
            const breathe = 0.5 + 0.5 * Math.sin(state.time * 2 + i * 1.3);

            // 外环
            jctx.beginPath();
            jctx.arc(pt.x, pt.y, passed ? 11 : 8 + breathe * 2, 0, Math.PI * 2);
            jctx.strokeStyle = themeRGB(passed ? 'accent3' : 'accent', passed ? 0.85 : 0.35);
            jctx.lineWidth = 1.2;
            jctx.stroke();

            // 核
            jctx.beginPath();
            jctx.arc(pt.x, pt.y, passed ? 4.5 : 3, 0, Math.PI * 2);
            jctx.fillStyle = themeRGB(passed ? 'accent3' : 'accent', passed ? 1 : 0.7);
            if (passed) {
                jctx.shadowColor = themeRGB('accent3', 0.9);
                jctx.shadowBlur = 12;
            }
            jctx.fill();
            jctx.shadowBlur = 0;

            // 站点序号
            jctx.font = '9px "Share Tech Mono", monospace';
            jctx.fillStyle = themeRGB('accent', 0.75);
            jctx.textAlign = 'center';
            jctx.fillText(String(i).padStart(2, '0'), pt.x, pt.y - 16);
        });

        // 旅行者光球
        const tp = pointAtLen(walkedLen);
        if (tp && (state.mode === 'TRAVEL' || state.mode === 'PAUSE' || walkedLen > 0.5)) {
            // 轨迹
            state.travelerTrail.push({ x: tp.x, y: tp.y, life: 1 });
            if (state.travelerTrail.length > 46) state.travelerTrail.shift();
            state.travelerTrail.forEach((n, i) => {
                n.life = i / state.travelerTrail.length;
                jctx.beginPath();
                jctx.arc(n.x, n.y, 3.2 * n.life, 0, Math.PI * 2);
                jctx.fillStyle = themeRGB('accent3', 0.35 * n.life);
                jctx.fill();
            });

            // 光晕
            const grad = jctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, 26);
            grad.addColorStop(0, themeRGB('accent3', 0.7));
            grad.addColorStop(1, themeRGB('accent3', 0));
            jctx.beginPath();
            jctx.arc(tp.x, tp.y, 26, 0, Math.PI * 2);
            jctx.fillStyle = grad;
            jctx.fill();

            // 核心球
            jctx.beginPath();
            jctx.arc(tp.x, tp.y, 5.5, 0, Math.PI * 2);
            jctx.fillStyle = '#ffffff';
            jctx.shadowColor = themeRGB('accent3', 1);
            jctx.shadowBlur = 18;
            jctx.fill();
            jctx.shadowBlur = 0;

            // 速度尾翼
            const spd = state.mode === 'TRAVEL' ? state.playSpeed : 0;
            if (spd > 0.05) {
                jctx.beginPath();
                jctx.moveTo(tp.x - Math.cos(tp.angle) * 10, tp.y - Math.sin(tp.angle) * 10);
                jctx.lineTo(tp.x - Math.cos(tp.angle + 0.5) * 7 * spd, tp.y - Math.sin(tp.angle + 0.5) * 7 * spd);
                jctx.lineTo(tp.x - Math.cos(tp.angle - 0.5) * 7 * spd, tp.y - Math.sin(tp.angle - 0.5) * 7 * spd);
                jctx.closePath();
                jctx.fillStyle = themeRGB('accent3', 0.35);
                jctx.fill();
            }
        }

        // 涟漪
        state.ripples = state.ripples.filter((r) => r.life > 0);
        for (const r of state.ripples) {
            r.r += dt * 140;
            r.life -= dt * 1.4;
            jctx.beginPath();
            jctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            jctx.strokeStyle = themeRGB('accent3', Math.max(0, r.life * 0.5));
            jctx.lineWidth = 1.5;
            jctx.stroke();
        }

        // 光标柔力场（READY/PAUSE 时路径局部响应）
        if (state.mouse.inStage && state.mode !== 'DRAW') {
            jctx.beginPath();
            jctx.arc(state.mouse.x, state.mouse.y, 3, 0, Math.PI * 2);
            jctx.strokeStyle = themeRGB('accent', 0.5);
            jctx.lineWidth = 1;
            jctx.stroke();
        }
    }

    // === Cursor Glow ===
    window.addEventListener('pointermove', (e) => {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
    });

    // === Resize ===
    function resize() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const jr = stage.getBoundingClientRect();
        journeyCanvas.width = jr.width * dpr;
        journeyCanvas.height = jr.height * dpr;
        journeyCanvas.style.width = `${jr.width}px`;
        journeyCanvas.style.height = `${jr.height}px`;
        jctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        fieldCanvas.width = window.innerWidth * dpr;
        fieldCanvas.height = window.innerHeight * dpr;
        fieldCanvas.style.width = `${window.innerWidth}px`;
        fieldCanvas.style.height = `${window.innerHeight}px`;
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        initParticles();
    }

    window.addEventListener('resize', resize);
    resize();

    // === Telemetry ===
    function updateTelemetry() {
        tmDist.textContent = (state.progress * state.totalLen).toFixed(2);
    }

    // === Main Loop ===
    let lastTime = performance.now();
    function loop(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        state.time += dt;

        tickTraveler(dt);
        springProgress(dt);
        checkStationArrival();
        tickParticles(dt);
        renderJourney(dt);
        updateTimelineUI();
        updateTelemetry();

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();
