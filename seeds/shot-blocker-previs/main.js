/**
 * Shot Blocker Previs — 封盖预演
 * 拖拽篮球瞄准（PREVIS 虚线轨迹预测）→ 松手出手 →
 * 弹簧-阻尼封盖者预测拦截 → SCORE / BLOCKED / MISS 判定
 */
(() => {
    'use strict';

    // === DOM Elements =====================================================

    const stage = document.getElementById('stage-area');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const cursorGlow = document.getElementById('cursor-glow');
    const hintTip = document.getElementById('hint-tip');

    const verdictBlock = document.getElementById('verdict-block');
    const verdictScore = document.getElementById('verdict-score');
    const verdictMiss = document.getElementById('verdict-miss');
    const verdictBlockSub = document.getElementById('verdict-block-sub');
    const verdictScoreSub = document.getElementById('verdict-score-sub');

    const teleAngle = document.getElementById('tele-angle');
    const telePower = document.getElementById('tele-power');
    const teleApex = document.getElementById('tele-apex');
    const teleBlocker = document.getElementById('tele-blocker');
    const teleFlight = document.getElementById('tele-flight');

    const statAttempts = document.getElementById('stat-attempts');
    const statScores = document.getElementById('stat-scores');
    const statBlocks = document.getElementById('stat-blocks');
    const statRate = document.getElementById('stat-rate');
    const statChips = document.querySelectorAll('.stat-chip');

    const diffBtns = document.querySelectorAll('.diff-btn');
    const paletteBtns = document.querySelectorAll('.palette-btn');
    const resetBtn = document.getElementById('reset-stats');

    // === Constants ========================================================

    const GRAVITY = 1800;              // px/s²
    const BALL_R = 13;
    const RESTITUTION = 0.62;
    const FLOOR_OFFSET = 26;

    // 难度档：反应延迟(s) / 预测误差(px) / 封盖触达半径(px) / 移动速度
    const DIFFICULTIES = {
        rookie: { delay: 0.34, error: 90, reach: 52, stiffness: 90, damping: 12 },
        pro:    { delay: 0.18, error: 46, reach: 62, stiffness: 150, damping: 14 },
        elite:  { delay: 0.08, error: 18, reach: 72, stiffness: 230, damping: 15 }
    };

    const THEME_INK = 'rgba(235,240,255,';
    let accent = '#7c6cff';
    let accentAlt = '#4de3ff';
    let accentWarm = '#ff6c8f';

    // === State ============================================================

    const state = {
        W: 0, H: 0, dpr: 1,
        difficulty: 'pro',
        ball: null,               // {x,y,vx,vy,inFlight,launchTime}
        anchor: { x: 0, y: 0 },  // 出手点
        dragging: false,
        dragPos: { x: 0, y: 0 },
        previsPoints: [],
        blocker: { x: 0, y: 0, vy: 0, targetY: 0, commitAt: 0, committed: false, reactionMs: 0 },
        rim: { x: 0, y: 0, r: 0 },
        particles: [],
        shockwaves: [],
        trail: [],
        stats: { attempts: 0, scores: 0, blocks: 0 },
        flightTime: 0,
        verdictTimer: null,
        hintDismissed: false
    };

    // === Sizing ===========================================================

    function resize() {
        const rect = stage.getBoundingClientRect();
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        state.W = rect.width;
        state.H = rect.height;
        canvas.width = Math.round(rect.width * state.dpr);
        canvas.height = Math.round(rect.height * state.dpr);
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        state.anchor.x = state.W * 0.16;
        state.anchor.y = state.H - FLOOR_OFFSET - BALL_R - 46;
        state.rim.x = state.W - Math.max(120, state.W * 0.14);
        state.rim.y = state.H * 0.34;
        state.rim.r = Math.min(58, state.W * 0.05);

        if (state.blocker.x === 0) {
            state.blocker.x = state.W * 0.55;
            state.blocker.y = state.anchor.y;
        }
        if (!state.ball) placeBallAtAnchor();
    }

    function placeBallAtAnchor() {
        state.ball = { x: state.anchor.x, y: state.anchor.y, vx: 0, vy: 0, inFlight: false };
        state.trail = [];
        state.flightTime = 0;
        state.previsPoints = [];
    }

    // === Input：拖拽瞄准 ===================================================

    function getPointer(e) {
        const rect = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    }

    function onDown(e) {
        const p = getPointer(e);
        const d = Math.hypot(p.x - state.ball.x, p.y - state.ball.y);
        if (d < 70 && !state.ball.inFlight) {
            state.dragging = true;
            state.dragPos = p;
            dismissHint();
            e.preventDefault();
        }
    }

    function onMove(e) {
        const p = getPointer(e);
        if (state.dragging) {
            // 限制拖拽半径，形成弹弓张力
            const dx = p.x - state.anchor.x;
            const dy = p.y - state.anchor.y;
            const dist = Math.hypot(dx, dy);
            const maxR = 150;
            const cl = dist > maxR ? maxR / dist : 1;
            state.dragPos.x = state.anchor.x + dx * cl;
            state.dragPos.y = state.anchor.y + dy * cl;
            updatePrevis();
            updateAimTelemetry();
        }
        cursorGlow.style.left = `${p.x}px`;
        cursorGlow.style.top = `${p.y}px`;
    }

    function onUp() {
        if (!state.dragging) return;
        state.dragging = false;

        const power = launchVector();
        if (power.strength < 0.12) {
            placeBallAtAnchor();
            return;
        }

        state.ball.vx = power.vx;
        state.ball.vy = power.vy;
        state.ball.inFlight = true;
        state.stats.attempts++;
        state.flightTime = 0;

        // 封盖者：延迟后锁定预测拦截点
        const conf = DIFFICULTIES[state.difficulty];
        const predictT = timeToReachX(state.ball, state.blocker.x);
        let predictedY = predictT > 0 ? state.ball.y + state.ball.vy * predictT + 0.5 * GRAVITY * predictT * predictT : state.blocker.y;
        const jitter = (Math.random() * 2 - 1) * conf.error;
        predictedY = Math.max(60, Math.min(state.H - FLOOR_OFFSET - 20, predictedY + jitter));

        state.blocker.commitAt = performance.now() / 1000 + conf.delay;
        state.blocker.committed = false;
        state.blocker.targetY = predictedY;
        state.blocker.reactionMs = 0;

        state.previsPoints = [];
        bumpStat(0);
        updateStatsUI();
    }

    function launchVector() {
        const dx = state.anchor.x - state.dragPos.x;
        const dy = state.anchor.y - state.dragPos.y;
        const dist = Math.hypot(dx, dy);
        const maxR = 150;
        const strength = Math.min(dist / maxR, 1);
        const speed = 520 + strength * 1180;
        const len = dist || 1;
        return { vx: (dx / len) * speed, vy: (dy / len) * speed, strength };
    }

    function timeToReachX(ball, targetX) {
        // x 方向匀速：t = Δx / vx
        if (Math.abs(ball.vx) < 1) return -1;
        const t = (targetX - ball.x) / ball.vx;
        return t > 0 ? t : -1;
    }

    // === PREVIS 轨迹预测 ===================================================

    function updatePrevis() {
        const lv = launchVector();
        const pts = [];
        let x = state.anchor.x, y = state.anchor.y;
        let vx = lv.vx, vy = lv.vy;
        const dt = 1 / 60;
        for (let i = 0; i < 130; i++) {
            vy += GRAVITY * dt;
            x += vx * dt;
            y += vy * dt;
            if (y > state.H - FLOOR_OFFSET - BALL_R || x > state.W - 8) break;
            if (i % 4 === 0) pts.push({ x, y });
        }
        state.previsPoints = pts;
    }

    function predictApex() {
        const lv = launchVector();
        if (lv.vy >= 0) return state.anchor.y;
        return state.anchor.y - (lv.vy * lv.vy) / (2 * GRAVITY);
    }

    function updateAimTelemetry() {
        const lv = launchVector();
        const angle = Math.atan2(-(state.anchor.y - state.dragPos.y), state.anchor.x - state.dragPos.x) * 180 / Math.PI;
        teleAngle.textContent = `${angle.toFixed(0)}°`;
        telePower.textContent = `${Math.round(lv.strength * 100)}%`;
        teleApex.textContent = `${Math.max(0, Math.round(state.anchor.y - predictApex()))}px`;
    }

    // === 判定 ==============================================================

    function showVerdict(el, duration = 1300) {
        clearTimeout(state.verdictTimer);
        [verdictBlock, verdictScore, verdictMiss].forEach(v => v.classList.remove('show'));
        el.classList.add('show');
        state.verdictTimer = setTimeout(() => el.classList.remove('show'), duration);
    }

    function resolveScore() {
        state.stats.scores++;
        verdictScoreSub.textContent = `FLIGHT · ${state.flightTime.toFixed(2)}s · +3`;
        showVerdict(verdictScore);
        burst(state.rim.x, state.rim.y, 42, accentAlt);
        shockwave(state.rim.x, state.rim.y, accentAlt);
        bumpStat(1);
        bumpStat(2);
        updateStatsUI();
        setTimeout(placeBallAtAnchor, 900);
    }

    function resolveBlock(bx, by) {
        state.stats.blocks++;
        state.blocker.reactionMs = Math.round((state.flightTime - DIFFICULTIES[state.difficulty].delay) * 1000);
        verdictBlockSub.textContent = `REACTION · ${Math.max(1, state.blocker.reactionMs)}ms`;
        showVerdict(verdictBlock);
        burst(bx, by, 56, accentWarm);
        shockwave(bx, by, accentWarm);
        state.ball.vy = Math.abs(state.ball.vy) * 0.4 + 260;
        state.ball.vx *= -0.35;
        bumpStat(3);
        updateStatsUI();
    }

    function resolveMiss() {
        showVerdict(verdictMiss, 900);
        updateStatsUI();
        setTimeout(placeBallAtAnchor, 700);
    }

    function updateStatsUI() {
        statAttempts.textContent = state.stats.attempts;
        statScores.textContent = state.stats.scores;
        statBlocks.textContent = state.stats.blocks;
        const rate = state.stats.attempts > 0 ? Math.round(state.stats.blocks / state.stats.attempts * 100) : 0;
        statRate.textContent = `${rate}%`;
        teleBlocker.textContent = state.ball && state.ball.inFlight ? 'TRACKING' : 'IDLE';
    }

    function bumpStat(index) {
        const chip = statChips[index];
        if (!chip) return;
        chip.classList.add('bump');
        setTimeout(() => chip.classList.remove('bump'), 420);
    }

    // === 粒子与冲击波 ======================================================

    function burst(x, y, n, color) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 120 + Math.random() * 420;
            state.particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s - 140,
                life: 1, decay: 1.4 + Math.random() * 1.2,
                r: 1.5 + Math.random() * 3,
                color
            });
        }
    }

    function shockwave(x, y, color) {
        state.shockwaves.push({ x, y, r: 8, maxR: 190, life: 1, color });
    }

    // === 物理主循环 ========================================================

    let lastT = performance.now();

    function frame(now) {
        const dt = Math.min((now - lastT) / 1000, 0.033);
        lastT = now;
        update(dt, now / 1000);
        render(now / 1000);
        requestAnimationFrame(frame);
    }

    function update(dt, nowSec) {
        const ball = state.ball;
        const conf = DIFFICULTIES[state.difficulty];
        const floor = state.H - FLOOR_OFFSET - BALL_R;

        // --- 球体物理 ---
        if (ball.inFlight) {
            state.flightTime += dt;
            ball.vy += GRAVITY * dt;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            state.trail.push({ x: ball.x, y: ball.y, life: 1 });
            if (state.trail.length > 26) state.trail.shift();
            state.trail.forEach(t => (t.life -= dt * 2.4));
            state.trail = state.trail.filter(t => t.life > 0);

            teleFlight.textContent = `${state.flightTime.toFixed(2)}s`;

            // 篮筐判定：下落穿过筐口平面且在半径内
            if (ball.vy > 0 && ball.y >= state.rim.y && ball.y - ball.vy * dt < state.rim.y) {
                if (Math.abs(ball.x - state.rim.x) < state.rim.r - 6) {
                    resolveScore();
                    ball.inFlight = false;
                    ball.vx *= 0.2;
                }
            }

            // 地板
            if (ball.y > floor) {
                ball.y = floor;
                ball.vy *= -RESTITUTION;
                ball.vx *= 0.86;
                if (Math.abs(ball.vy) < 60 && Math.abs(ball.vx) < 60 && !ball.inFlight) {
                    // 静置
                }
            }

            // 出界或静止 → MISS 结算
            if (ball.x < -60 || ball.x > state.W + 60 || ball.y > floor + BALL_R) {
                if (ball.inFlight) {
                    ball.inFlight = false;
                    resolveMiss();
                }
            }
            if (ball.inFlight && Math.abs(ball.vy) < 40 && Math.abs(ball.vx) < 24 && ball.y >= floor - 2) {
                ball.inFlight = false;
                resolveMiss();
            }
        }

        // --- 封盖者（弹簧-阻尼追踪） ---
        const blocker = state.blocker;
        const engaged = ball.inFlight && ball.x < blocker.x + 40;
        let goalY = engaged && nowSec >= blocker.commitAt ? blocker.targetY : state.anchor.y - 40;
        if (engaged && nowSec >= blocker.commitAt) {
            if (!blocker.committed) {
                blocker.committed = true;
                teleBlocker.textContent = 'COMMITTED';
            }
            goalY = blocker.targetY;
        }

        const force = (goalY - blocker.y) * conf.stiffness - blocker.vy * conf.damping;
        blocker.vy += force * dt;
        blocker.y += blocker.vy * dt;
        blocker.y = Math.max(50, Math.min(state.H - FLOOR_OFFSET - 10, blocker.y));

        // 封盖碰撞：球接近且已过反应期
        if (ball.inFlight && nowSec >= blocker.commitAt) {
            const dist = Math.hypot(ball.x - blocker.x, ball.y - blocker.y);
            if (dist < conf.reach + BALL_R) {
                resolveBlock(blocker.x, blocker.y);
                ball.inFlight = false;
                setTimeout(placeBallAtAnchor, 1100);
            }
        }

        // --- 粒子 ---
        state.particles.forEach(p => {
            p.vy += GRAVITY * 0.45 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
        });
        state.particles = state.particles.filter(p => p.life > 0);

        // --- 冲击波 ---
        state.shockwaves.forEach(s => {
            s.r += (s.maxR - s.r) * 5 * dt;
            s.life -= dt * 1.8;
        });
        state.shockwaves = state.shockwaves.filter(s => s.life > 0);
    }

    // === 渲染 ==============================================================

    function render(t) {
        ctx.clearRect(0, 0, state.W, state.H);

        drawCourt(t);
        drawRim();
        drawBlocker(t);
        drawPrevis();
        drawTraiAndBall(t);
        drawSlingshot();
        drawParticles();
        drawShockwaves();
    }

    function drawCourt(t) {
        // 地板
        const floorY = state.H - FLOOR_OFFSET;
        const grad = ctx.createLinearGradient(0, floorY, 0, state.H);
        grad.addColorStop(0, 'rgba(255,255,255,0.06)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, floorY, state.W, FLOOR_OFFSET);

        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, floorY + 0.5);
        ctx.lineTo(state.W, floorY + 0.5);
        ctx.stroke();

        // 禁区弧线（装饰）
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.setLineDash([4, 10]);
        ctx.beginPath();
        ctx.arc(state.anchor.x + 40, floorY, 120, Math.PI, 0);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawRim() {
        const { x, y, r } = state.rim;

        // 筐口
        ctx.strokeStyle = accentAlt;
        ctx.lineWidth = 3;
        ctx.shadowColor = accentAlt;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 筐口两端点
        [x - r, x + r].forEach(px => {
            ctx.fillStyle = accentAlt;
            ctx.beginPath();
            ctx.arc(px, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 篮板
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + r + 4, y - 52);
        ctx.lineTo(x + r + 4, y + 26);
        ctx.stroke();

        // 支柱
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(x + r + 4, y - 20);
        ctx.lineTo(state.W - 10, y - 20);
        ctx.lineTo(state.W - 10, state.H - FLOOR_OFFSET);
        ctx.stroke();

        // 命中区微光
        const pulse = 0.5 + Math.sin(performance.now() / 700) * 0.2;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
        g.addColorStop(0, `rgba(77,227,255,${0.1 * pulse})`);
        g.addColorStop(1, 'rgba(77,227,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawBlocker(t) {
        const b = state.blocker;
        const tracking = state.ball && state.ball.inFlight;

        // 活动轨迹线（纵向滑轨）
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 9]);
        ctx.beginPath();
        ctx.moveTo(b.x, 60);
        ctx.lineTo(b.x, state.H - FLOOR_OFFSET);
        ctx.stroke();
        ctx.setLineDash([]);

        // 手掌核心
        const glow = tracking ? 22 : 10;
        ctx.shadowColor = accentWarm;
        ctx.shadowBlur = glow;
        ctx.fillStyle = accentWarm;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 触达范围环
        const reach = DIFFICULTIES[state.difficulty].reach;
        ctx.strokeStyle = `rgba(255,108,143,${tracking ? 0.32 : 0.14})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -t * 40;
        ctx.beginPath();
        ctx.arc(b.x, b.y, reach, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // 速度拖尾
        const stretch = Math.max(-14, Math.min(14, b.vy * 0.045));
        ctx.fillStyle = 'rgba(255,108,143,0.28)';
        ctx.beginPath();
        ctx.ellipse(b.x, b.y - stretch * 0.5, 7, Math.abs(stretch) + 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPrevis() {
        if (!state.dragging) return;
        const pts = state.previsPoints;
        ctx.fillStyle = 'rgba(235,240,255,0.5)';
        pts.forEach((p, i) => {
            const fade = 1 - i / pts.length;
            ctx.globalAlpha = 0.15 + fade * 0.45;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function drawTraiAndBall(t) {
        // 拖尾
        state.trail.forEach(tp => {
            ctx.fillStyle = accent;
            ctx.globalAlpha = tp.life * 0.35;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, BALL_R * tp.life * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 球体
        const ball = state.ball;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(ball.x - 4, ball.y - 5, 2, ball.x, ball.y, BALL_R);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, accent);
        grad.addColorStop(1, shade(accent, -0.35));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 球面纹线
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.moveTo(ball.x - BALL_R, ball.y);
        ctx.quadraticCurveTo(ball.x, ball.y - 5, ball.x + BALL_R, ball.y);
        ctx.moveTo(ball.x, ball.y - BALL_R);
        ctx.quadraticCurveTo(ball.x - 5, ball.y, ball.x, ball.y + BALL_R);
        ctx.stroke();

        // 出手点标记
        if (!ball.inFlight) {
            const pulse = 0.5 + Math.sin(t * 3) * 0.3;
            ctx.strokeStyle = `rgba(255,255,255,${0.2 * pulse})`;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.arc(state.anchor.x, state.anchor.y, BALL_R + 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function drawSlingshot() {
        if (!state.dragging) return;
        const lv = launchVector();

        // 张力带
        ctx.strokeStyle = `rgba(255,255,255,0.3)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(state.anchor.x, state.anchor.y);
        ctx.lineTo(state.dragPos.x, state.dragPos.y);
        ctx.stroke();

        // 力度环
        const pct = lv.strength;
        ctx.strokeStyle = pct > 0.7 ? accentWarm : accentAlt;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.dragPos.x, state.dragPos.y, BALL_R + 8, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();
    }

    function drawParticles() {
        state.particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function drawShockwaves() {
        state.shockwaves.forEach(s => {
            ctx.globalAlpha = Math.max(0, s.life) * 0.55;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 2 * s.life;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }

    // === 工具 ==============================================================

    function shade(hex, amt) {
        const n = parseInt(hex.slice(1), 16);
        let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        r = Math.round(Math.min(255, Math.max(0, r + r * amt)));
        g = Math.round(Math.min(255, Math.max(0, g + g * amt)));
        b = Math.round(Math.min(255, Math.max(0, b + b * amt)));
        return `rgb(${r},${g},${b})`;
    }

    function dismissHint() {
        if (state.hintDismissed) return;
        state.hintDismissed = true;
        hintTip.classList.add('dismissed');
    }

    // === 事件绑定 ==========================================================

    stage.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', onDown, { passive: false });
    stage.addEventListener('touchmove', (e) => { onMove(e); e.preventDefault(); }, { passive: false });
    window.addEventListener('touchend', onUp);

    diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = btn.dataset.diff;
            state.blocker.committed = false;
        });
    });

    paletteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            paletteBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.documentElement.dataset.theme = btn.dataset.theme;
            applyThemeColors(btn.dataset.theme);
        });
    });

    resetBtn.addEventListener('click', () => {
        state.stats = { attempts: 0, scores: 0, blocks: 0 };
        updateStatsUI();
        placeBallAtAnchor();
    });

    function applyThemeColors(theme) {
        const map = {
            aurora: ['#7c6cff', '#4de3ff', '#ff6c8f'],
            ember: ['#ff8a4c', '#ffd166', '#ff5470'],
            abyss: ['#4d7cff', '#00e5ff', '#7c6cff'],
            vapor: ['#ff71ce', '#01cdfe', '#05ffa1']
        };
        [accent, accentAlt, accentWarm] = map[theme] || map.aurora;
    }

    // === 启动 ==============================================================

    window.addEventListener('resize', resize);
    resize();
    updateStatsUI();
    requestAnimationFrame(frame);
})();
