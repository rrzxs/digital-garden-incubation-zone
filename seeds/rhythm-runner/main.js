/**
 * Rhythm Runner 韵律奔跑 — 沉浸式节律微交互
 *
 * 核心循环：
 *   - 光球沿水平轨道自动飞驰
 *   - 节拍节点从右侧生成、向左侧判定环滑动
 *   - 玩家在节点进入判定环时按下 Space / 点击进行判定
 *   - 判定窗口：Perfect (±80ms) / Good (±170ms) / Miss (超时或过早)
 *
 * 模块划分：
 *   1. DOM 引用与全局状态
 *   2. 主题切换
 *   3. Canvas 粒子系统（环境粒子 + 节点 + 冲击波）
 *   4. 节拍调度器
 *   5. 判定逻辑
 *   6. HUD 渲染
 *   7. 输入处理
 *   8. 主循环 (RAF)
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. DOM 元素引用
    // =========================================================================
    const dom = {
        canvas: document.getElementById('runner-canvas'),
        cursorGlow: document.getElementById('cursor-glow'),
        beatFlash: document.getElementById('beat-flash'),
        introOverlay: document.getElementById('intro-overlay'),
        introStartBtn: document.getElementById('intro-start-btn'),
        startBtn: document.getElementById('start-btn'),
        startLabel: document.getElementById('start-label'),
        resetBtn: document.getElementById('reset-btn'),
        speedBtn: document.getElementById('speed-btn'),
        speedValue: document.getElementById('speed-value'),
        themeToggle: document.getElementById('theme-toggle'),
        trackViewport: document.getElementById('track-viewport'),
        hitZone: document.getElementById('hit-zone'),
        runnerOrb: document.getElementById('runner-orb'),
        judgementLayer: document.getElementById('judgement-layer'),
        scoreValue: document.getElementById('score-value'),
        comboValue: document.getElementById('combo-value'),
        comboMeta: document.getElementById('combo-meta'),
        bestComboValue: document.getElementById('best-combo-value'),
        accuracyFill: document.getElementById('accuracy-fill'),
        accuracyValue: document.getElementById('accuracy-value'),
        bpmValue: document.getElementById('bpm-value'),
        energyFill: document.getElementById('energy-fill'),
        energyMeta: document.getElementById('energy-meta'),
        statPerfect: document.getElementById('stat-perfect'),
        statGood: document.getElementById('stat-good'),
        statMiss: document.getElementById('stat-miss'),
        fpsCounter: document.getElementById('fps-counter'),
        stateIndicator: document.getElementById('state-indicator')
    };

    // =========================================================================
    // 2. 全局状态
    // =========================================================================
    const state = {
        running: false,
        paused: false,
        startTime: 0,
        lastSpawnTime: 0,
        elapsed: 0,
        // 节拍
        bpm: 90,
        speedMultiplier: 1.0,
        // 节点与判定
        nodes: [],
        nextNodeId: 0,
        // 判定窗口（毫秒）
        windowPerfect: 80,
        windowGood: 170,
        // 节点从生成到到达判定环所需的飞行时长（毫秒）
        travelDuration: 2400,
        // 计分
        score: 0,
        combo: 0,
        bestCombo: 0,
        energy: 0,
        // 判定统计
        stats: { perfect: 0, good: 0, miss: 0 },
        totalJudged: 0,
        // 光球水平位置（0~1，相对于轨道宽度）
        orbProgress: 0.5,
        // 主题
        theme: 'deep-ocean',
        // 光标
        cursorX: 0,
        cursorY: 0,
        // FPS
        fps: 60,
        frameCount: 0,
        lastFpsTime: 0
    };

    // =========================================================================
    // 3. 主题调色板（用于 Canvas 粒子绘制）
    // =========================================================================
    const themePalettes = {
        'deep-ocean': {
            accent: '#6366f1',
            accent2: '#8b5cf6',
            particle: 'rgba(139, 92, 246, 0.7)',
            particleSoft: 'rgba(99, 102, 241, 0.4)',
            perfect: '#22d3ee',
            good: '#a3e635',
            miss: '#f43f5e'
        },
        'aurora': {
            accent: '#10b981',
            accent2: '#34d399',
            particle: 'rgba(52, 211, 153, 0.7)',
            particleSoft: 'rgba(16, 185, 129, 0.4)',
            perfect: '#5eead4',
            good: '#bef264',
            miss: '#fb7185'
        },
        'ember': {
            accent: '#f59e0b',
            accent2: '#fbbf24',
            particle: 'rgba(251, 191, 36, 0.7)',
            particleSoft: 'rgba(245, 158, 11, 0.4)',
            perfect: '#fde68a',
            good: '#fdba74',
            miss: '#ef4444'
        },
        'void': {
            accent: '#a855f7',
            accent2: '#c084fc',
            particle: 'rgba(192, 132, 252, 0.7)',
            particleSoft: 'rgba(168, 85, 247, 0.4)',
            perfect: '#e9d5ff',
            good: '#d8b4fe',
            miss: '#fb7185'
        }
    };

    function palette() {
        return themePalettes[state.theme] || themePalettes['deep-ocean'];
    }

    // =========================================================================
    // 4. Canvas 初始化与粒子系统
    // =========================================================================
    const canvas = dom.canvas;
    const ctx = canvas.getContext('2d');
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let viewportW = 0;
    let viewportH = 0;

    // 环境粒子（缓慢飘浮）
    const ambientParticles = [];
    const AMBIENT_COUNT = 60;

    // 节点轨迹粒子（爆发）
    const burstParticles = [];

    // 冲击波环
    const shockwaves = [];

    // 光球尾迹
    const orbTrail = [];

    function resizeCanvas() {
        dpr = Math.max(1, window.devicePixelRatio || 1);
        viewportW = window.innerWidth;
        viewportH = window.innerHeight;
        canvas.width = Math.floor(viewportW * dpr);
        canvas.height = Math.floor(viewportH * dpr);
        canvas.style.width = viewportW + 'px';
        canvas.style.height = viewportH + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initAmbientParticles() {
        ambientParticles.length = 0;
        for (let i = 0; i < AMBIENT_COUNT; i++) {
            ambientParticles.push({
                x: Math.random() * viewportW,
                y: Math.random() * viewportH,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                size: Math.random() * 2.2 + 0.4,
                alpha: Math.random() * 0.4 + 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function spawnBurst(x, y, color, count) {
        count = count || 18;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1.5;
            burstParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: Math.random() * 0.02 + 0.015,
                size: Math.random() * 3 + 1,
                color: color
            });
        }
    }

    function spawnShockwave(x, y, color) {
        shockwaves.push({
            x: x,
            y: y,
            radius: 20,
            maxRadius: 140,
            life: 1.0,
            color: color
        });
    }

    function getTrackMetrics() {
        // 返回判定环的屏幕坐标与轨道起止点
        const rect = dom.trackViewport.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startX = rect.right - 30; // 节点生成位置
        const endX = rect.left + 30;
        return {
            rect: rect,
            centerX: centerX,
            centerY: centerY,
            startX: startX,
            endX: endX,
            width: rect.width
        };
    }

    // =========================================================================
    // 5. 节拍调度与节点
    // =========================================================================

    function beatIntervalMs() {
        // 一个四分音符的时长
        return (60000 / state.bpm) / state.speedMultiplier;
    }

    function spawnNode(scheduledHitTime) {
        const metrics = getTrackMetrics();
        state.nodes.push({
            id: state.nextNodeId++,
            spawnTime: performance.now(),
            scheduledHitTime: scheduledHitTime, // 应被命中的时刻
            judged: false,
            // 用于绘制：从 startX 滑到 centerX，再继续滑到 endX
            x: metrics.startX,
            y: metrics.centerY,
            missed: false,
            // 视觉脉冲相位
            phase: Math.random() * Math.PI * 2
        });
    }

    function updateNodePosition(node, now) {
        const metrics = getTrackMetrics();
        // 进度：0 = 生成时刻，1 = 到达判定环时刻
        const elapsedSinceSpawn = now - node.spawnTime;
        const progress = elapsedSinceSpawn / state.travelDuration;
        // 节点应从 startX 移动至 centerX（progress=1）后再继续左移至 endX（progress>1）
        const targetX = metrics.startX + (metrics.centerX - metrics.startX) * progress;
        node.x = targetX;
        node.y = metrics.centerY;
    }

    // =========================================================================
    // 6. 判定逻辑
    // =========================================================================

    function handleTap() {
        if (!state.running || state.paused) return;

        const now = performance.now();
        const metrics = getTrackMetrics();

        // 寻找最接近判定窗口的未判定节点
        let bestNode = null;
        let bestDelta = Infinity;

        for (let i = 0; i < state.nodes.length; i++) {
            const node = state.nodes[i];
            if (node.judged) continue;
            const delta = Math.abs(now - node.scheduledHitTime);
            if (delta < bestDelta) {
                bestDelta = delta;
                bestNode = node;
            }
        }

        if (!bestNode || bestDelta > state.windowGood * 1.8) {
            // 没有任何可判定节点 → 空击惩罚（连击中断但不计 miss）
            triggerOrbLeap();
            return;
        }

        // 触发光球跳跃动画
        triggerOrbLeap();

        let grade;
        if (bestDelta <= state.windowPerfect) {
            grade = 'perfect';
        } else if (bestDelta <= state.windowGood) {
            grade = 'good';
        } else {
            grade = 'miss';
        }

        judgeNode(bestNode, grade, metrics);
    }

    function judgeNode(node, grade, metrics) {
        node.judged = true;
        state.totalJudged++;

        const pal = palette();
        let scoreGain = 0;
        let energyGain = 0;
        let color;

        if (grade === 'perfect') {
            state.stats.perfect++;
            scoreGain = 100;
            energyGain = 12;
            color = pal.perfect;
            state.combo++;
        } else if (grade === 'good') {
            state.stats.good++;
            scoreGain = 50;
            energyGain = 6;
            color = pal.good;
            state.combo++;
        } else {
            state.stats.miss++;
            scoreGain = 0;
            energyGain = -8;
            color = pal.miss;
            state.combo = 0;
        }

        // 连击加成
        const comboMultiplier = 1 + Math.min(state.combo, 50) * 0.04;
        state.score += Math.round(scoreGain * comboMultiplier);

        // 能量
        state.energy = Math.max(0, Math.min(100, state.energy + energyGain));

        // 最佳连击
        if (state.combo > state.bestCombo) {
            state.bestCombo = state.combo;
        }

        // 视觉反馈
        const nodeScreenX = node.x;
        const nodeScreenY = node.y;
        spawnBurst(nodeScreenX, nodeScreenY, color, grade === 'perfect' ? 28 : grade === 'good' ? 18 : 10);
        spawnShockwave(metrics.centerX, metrics.centerY, color);

        flashHitZone(grade);
        showJudgement(grade);
        bumpStat(grade);

        if (grade === 'perfect' || grade === 'good') {
            fireBeatFlash();
        }

        renderHud();
    }

    function checkMissedNodes(now) {
        // 自动判 miss：节点超过判定窗口仍未被击中
        for (let i = 0; i < state.nodes.length; i++) {
            const node = state.nodes[i];
            if (node.judged) continue;
            if (now - node.scheduledHitTime > state.windowGood) {
                const metrics = getTrackMetrics();
                judgeNode(node, 'miss', metrics);
            }
        }
    }

    // =========================================================================
    // 7. HUD 与视觉反馈
    // =========================================================================

    function renderHud() {
        dom.scoreValue.textContent = formatNumber(state.score);
        dom.comboValue.textContent = state.combo;
        const mult = (1 + Math.min(state.combo, 50) * 0.04).toFixed(1);
        dom.comboMeta.textContent = 'x' + mult;
        dom.bestComboValue.textContent = state.bestCombo;
        dom.bpmValue.textContent = Math.round(state.bpm * state.speedMultiplier);

        // 能量
        dom.energyFill.style.width = state.energy + '%';
        dom.energyMeta.textContent = Math.round(state.energy) + ' / 100';

        // 精准度
        const acc = computeAccuracy();
        dom.accuracyFill.style.width = acc + '%';
        dom.accuracyValue.textContent = Math.round(acc) + '%';

        // 判定统计
        dom.statPerfect.textContent = state.stats.perfect;
        dom.statGood.textContent = state.stats.good;
        dom.statMiss.textContent = state.stats.miss;
    }

    function computeAccuracy() {
        if (state.totalJudged === 0) return 100;
        const weighted = state.stats.perfect * 1 + state.stats.good * 0.5;
        return (weighted / state.totalJudged) * 100;
    }

    function formatNumber(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function popValue(el) {
        el.classList.remove('pop');
        // 触发 reflow 以重新启动动画
        void el.offsetWidth;
        el.classList.add('pop');
    }

    function showJudgement(grade) {
        const el = document.createElement('div');
        el.className = 'judge-text ' + grade;
        el.textContent = grade === 'perfect' ? 'PERFECT' : grade === 'good' ? 'GOOD' : 'MISS';
        dom.judgementLayer.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 900);
    }

    function flashHitZone(grade) {
        const cls = 'hit-' + grade;
        dom.hitZone.classList.remove('hit-perfect', 'hit-good', 'hit-miss', 'armed');
        dom.hitZone.classList.add(cls);
        setTimeout(function () {
            dom.hitZone.classList.remove(cls);
        }, 350);
    }

    function bumpStat(grade) {
        const el = grade === 'perfect' ? dom.statPerfect :
                  grade === 'good' ? dom.statGood : dom.statMiss;
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
        setTimeout(function () {
            el.classList.remove('bump');
        }, 400);
    }

    function fireBeatFlash() {
        dom.beatFlash.classList.remove('fire');
        void dom.beatFlash.offsetWidth;
        dom.beatFlash.classList.add('fire');
    }

    function triggerOrbLeap() {
        dom.runnerOrb.classList.remove('leap');
        void dom.runnerOrb.offsetWidth;
        dom.runnerOrb.classList.add('leap');
    }

    function setStateIndicator(text) {
        if (dom.stateIndicator) dom.stateIndicator.textContent = text;
    }

    // =========================================================================
    // 8. 输入处理
    // =========================================================================

    function bindInputs() {
        // 键盘
        window.addEventListener('keydown', function (e) {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!state.running) {
                    startGame();
                } else if (state.paused) {
                    resumeGame();
                } else {
                    handleTap();
                }
            } else if (e.code === 'KeyR') {
                resetGame();
            } else if (e.code === 'KeyP') {
                if (state.running && !state.paused) pauseGame();
                else if (state.running && state.paused) resumeGame();
            }
        });

        // 点击/触摸
        dom.trackViewport.addEventListener('pointerdown', function (e) {
            // 避免按钮等子元素触发；但本视口内无按钮
            handleTap();
        });

        window.addEventListener('pointermove', function (e) {
            state.cursorX = e.clientX;
            state.cursorY = e.clientY;
            dom.cursorGlow.style.left = e.clientX + 'px';
            dom.cursorGlow.style.top = e.clientY + 'px';
        });

        // 控制按钮
        dom.startBtn.addEventListener('click', function () {
            if (!state.running) startGame();
            else if (state.paused) resumeGame();
            else pauseGame();
        });

        dom.resetBtn.addEventListener('click', resetGame);

        dom.speedBtn.addEventListener('click', cycleSpeed);

        dom.introStartBtn.addEventListener('click', function () {
            dom.introOverlay.classList.add('hidden');
            startGame();
        });

        // 主题
        dom.themeToggle.addEventListener('click', function (e) {
            const target = e.target.closest('.theme-btn');
            if (!target) return;
            const theme = target.getAttribute('data-theme');
            setTheme(theme);
        });

        // 窗口
        window.addEventListener('resize', function () {
            resizeCanvas();
            initAmbientParticles();
        });
    }

    function cycleSpeed() {
        const speeds = [0.8, 1.0, 1.25, 1.5];
        const current = speeds.indexOf(state.speedMultiplier);
        const next = (current + 1) % speeds.length;
        state.speedMultiplier = speeds[next];
        dom.speedValue.textContent = state.speedMultiplier.toFixed(2) + 'x';
        renderHud();
    }

    // =========================================================================
    // 9. 游戏状态控制
    // =========================================================================

    function startGame() {
        if (state.running) return;
        state.running = true;
        state.paused = false;
        state.startTime = performance.now();
        state.lastSpawnTime = state.startTime;
        state.lastFpsTime = state.startTime;
        dom.startLabel.textContent = '暂停';
        setStateIndicator('奔跑中');
        dom.introOverlay.classList.add('hidden');
    }

    function pauseGame() {
        if (!state.running || state.paused) return;
        state.paused = true;
        dom.startLabel.textContent = '继续';
        setStateIndicator('已暂停');
    }

    function resumeGame() {
        if (!state.running || !state.paused) return;
        state.paused = false;
        // 调整 startTime 以抵消暂停期间的时间流逝
        const now = performance.now();
        // 简化处理：重置 lastSpawnTime 以避免立即生成大量节点
        state.lastSpawnTime = now;
        dom.startLabel.textContent = '暂停';
        setStateIndicator('奔跑中');
    }

    function resetGame() {
        state.running = false;
        state.paused = false;
        state.nodes = [];
        state.score = 0;
        state.combo = 0;
        state.bestCombo = 0;
        state.energy = 0;
        state.stats = { perfect: 0, good: 0, miss: 0 };
        state.totalJudged = 0;
        state.elapsed = 0;
        burstParticles.length = 0;
        shockwaves.length = 0;
        orbTrail.length = 0;
        dom.startLabel.textContent = '开始';
        setStateIndicator('待机');
        renderHud();
    }

    function setTheme(theme) {
        if (!themePalettes[theme]) return;
        state.theme = theme;
        document.body.setAttribute('data-theme', theme);
        const buttons = dom.themeToggle.querySelectorAll('.theme-btn');
        buttons.forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-theme') === theme);
        });
    }

    // =========================================================================
    // 10. 主循环 (RAF)
    // =========================================================================

    function update(dt, now) {
        if (!state.running || state.paused) return;

        // 节拍生成
        const interval = beatIntervalMs();
        if (now - state.lastSpawnTime >= interval) {
            // 调度：节点从现在起 travelDuration 后到达判定环
            const scheduledHitTime = now + state.travelDuration;
            spawnNode(scheduledHitTime);
            state.lastSpawnTime = now;
        }

        // 更新节点位置
        for (let i = 0; i < state.nodes.length; i++) {
            updateNodePosition(state.nodes[i], now);
        }

        // 自动 miss 判定
        checkMissedNodes(now);

        // 清理已判定且飞出屏幕的节点
        const metrics = getTrackMetrics();
        state.nodes = state.nodes.filter(function (n) {
            if (n.x < metrics.endX - 50) return false;
            // 保留已判定的节点一会儿以播放淡出（这里简化为直接移除）
            if (n.judged && now - n.scheduledHitTime > 300) return false;
            return true;
        });

        // 标记即将进入判定窗口的节点 → 高亮判定环
        let armed = false;
        for (let i = 0; i < state.nodes.length; i++) {
            const n = state.nodes[i];
            if (n.judged) continue;
            const delta = Math.abs(now - n.scheduledHitTime);
            if (delta <= state.windowGood * 1.5) {
                armed = true;
                break;
            }
        }
        dom.hitZone.classList.toggle('armed', armed && !dom.hitZone.classList.contains('hit-perfect') &&
            !dom.hitZone.classList.contains('hit-good') && !dom.hitZone.classList.contains('hit-miss'));

        // 更新光球屏幕位置（跟随最接近判定环的未判定节点）
        updateOrbPosition(now, metrics);

        // 更新粒子
        updateParticles(dt);
    }

    function updateOrbPosition(now, metrics) {
        // 光球固定在判定环位置（视觉上一直在跑，但通过 leap 动画表达跳跃）
        const x = metrics.centerX;
        const y = metrics.centerY;
        dom.runnerOrb.style.left = x + 'px';
        dom.runnerOrb.style.top = y + 'px';

        // 记录尾迹
        orbTrail.push({ x: x, y: y, life: 1.0 });
        if (orbTrail.length > 24) orbTrail.shift();
        for (let i = 0; i < orbTrail.length; i++) {
            orbTrail[i].life -= 0.05;
        }
    }

    function updateParticles(dt) {
        // 环境粒子
        for (let i = 0; i < ambientParticles.length; i++) {
            const p = ambientParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.phase += 0.01;
            if (p.x < -10) p.x = viewportW + 10;
            if (p.x > viewportW + 10) p.x = -10;
            if (p.y < -10) p.y = viewportH + 10;
            if (p.y > viewportH + 10) p.y = -10;
        }

        // 爆发粒子
        for (let i = burstParticles.length - 1; i >= 0; i--) {
            const p = burstParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.vy += 0.08; // 微重力
            p.life -= p.decay;
            if (p.life <= 0) burstParticles.splice(i, 1);
        }

        // 冲击波
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const w = shockwaves[i];
            w.radius += (w.maxRadius - w.radius) * 0.12;
            w.life -= 0.04;
            if (w.life <= 0) shockwaves.splice(i, 1);
        }

        // 尾迹衰减
        for (let i = orbTrail.length - 1; i >= 0; i--) {
            if (orbTrail[i].life <= 0) orbTrail.splice(i, 1);
        }
    }

    function render(now) {
        ctx.clearRect(0, 0, viewportW, viewportH);
        const pal = palette();

        // 1. 环境粒子
        for (let i = 0; i < ambientParticles.length; i++) {
            const p = ambientParticles[i];
            const flicker = Math.sin(p.phase) * 0.3 + 0.7;
            ctx.beginPath();
            ctx.fillStyle = pal.particleSoft;
            ctx.globalAlpha = p.alpha * flicker;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 2. 光球尾迹
        if (orbTrail.length > 1) {
            for (let i = 0; i < orbTrail.length - 1; i++) {
                const t = orbTrail[i];
                const next = orbTrail[i + 1];
                ctx.beginPath();
                ctx.strokeStyle = pal.accent;
                ctx.globalAlpha = Math.max(0, t.life) * 0.5;
                ctx.lineWidth = (i / orbTrail.length) * 6 + 1;
                ctx.lineCap = 'round';
                ctx.moveTo(t.x, t.y);
                ctx.lineTo(next.x, next.y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // 3. 节点（仅绘制在轨道视口内的）
        const metrics = getTrackMetrics();
        for (let i = 0; i < state.nodes.length; i++) {
            const node = state.nodes[i];
            // 仅绘制视口内的节点
            if (node.x < metrics.rect.left - 30 || node.x > metrics.rect.right + 30) continue;

            const pulse = Math.sin(now * 0.006 + node.phase) * 0.3 + 0.7;
            const baseRadius = 14;
            const judged = node.judged;
            const color = judged ? pal.miss : pal.accent;

            // 外发光
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, baseRadius * 3);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.globalAlpha = judged ? 0.2 : 0.5 * pulse;
            ctx.arc(node.x, node.y, baseRadius * 3, 0, Math.PI * 2);
            ctx.fill();

            // 实心节点
            ctx.beginPath();
            ctx.fillStyle = judged ? 'rgba(120,120,140,0.4)' : '#ffffff';
            ctx.globalAlpha = judged ? 0.3 : 0.95;
            ctx.arc(node.x, node.y, baseRadius * pulse, 0, Math.PI * 2);
            ctx.fill();

            // 内核
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.globalAlpha = judged ? 0.4 : 0.9;
            ctx.arc(node.x, node.y, baseRadius * 0.5 * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 4. 爆发粒子
        for (let i = 0; i < burstParticles.length; i++) {
            const p = burstParticles[i];
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 5. 冲击波
        for (let i = 0; i < shockwaves.length; i++) {
            const w = shockwaves[i];
            ctx.beginPath();
            ctx.strokeStyle = w.color;
            ctx.globalAlpha = Math.max(0, w.life) * 0.6;
            ctx.lineWidth = 3 * w.life;
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function loop(now) {
        // FPS 计算
        state.frameCount++;
        if (now - state.lastFpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.lastFpsTime = now;
            dom.fpsCounter.textContent = state.fps + ' FPS';
        }

        const dt = 16; // 简化
        update(dt, now);
        render(now);

        requestAnimationFrame(loop);
    }

    // =========================================================================
    // 11. 初始化
    // =========================================================================

    function init() {
        resizeCanvas();
        initAmbientParticles();
        renderHud();
        bindInputs();
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
