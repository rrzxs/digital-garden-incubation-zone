/* ============================================================
   Scrapbook Canvas 拼贴画布 — 交互逻辑
   弹簧-阻尼物理拖拽 · 甩动惯性 · 边界碰撞 · 粒子迸射
   ============================================================ */
(function () {
    'use strict';

    // === DOM Elements ===
    const board = document.getElementById('board');
    const boardInner = document.getElementById('board-inner');
    const boardEmpty = document.getElementById('board-empty');
    const shelfGrid = document.getElementById('shelf-grid');
    const tapeGrid = document.getElementById('tape-grid');
    const metaCount = document.getElementById('meta-count');
    const metaCoord = document.getElementById('meta-coord');
    const metaVel = document.getElementById('meta-vel');
    const metaTheme = document.getElementById('meta-theme');
    const themeToggle = document.getElementById('theme-toggle');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnExport = document.getElementById('btn-export');
    const scrambleTitle = document.getElementById('scramble-title');
    const cursorGlow = document.getElementById('cursor-glow');
    const toast = document.getElementById('toast');
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');

    // === 贴纸货架内容 ===
    const STICKERS = [
        '🌿', '🕊️', '⏳', '🗝️', '🍂', '🌙', '🎞️', '🧭',
        '🐚', '🕯️', '📮', '🌵', '🪶', '☕', '🧊', '🫧',
        '💫', '🪐', '🍒', '📎'
    ];
    const NOTES = [
        '风把夏天的信吹散了，我捡到了一角。',
        '记得那天的云，像没写完的诗。',
        '所有漂泊，都是为了靠岸。',
        '把心事折成纸船，交给时间。',
        '收集每一个不想忘记的黄昏。',
        '慢一点也没关系，星星也是。'
    ];
    const TAPES = ['TAPE·轻黄', 'TAPE·条纹', 'TAPE·格纹', 'TAPE·空白'];
    const THEMES = ['kraft', 'polaroid', 'midnight', 'botanical'];

    // === 状态 ===
    const scraps = [];
    let zCounter = 10;
    let selected = null;
    let dragTarget = null;
    let themeName = 'kraft';
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    const pointer = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0 };
    let dragGrabDX = 0;
    let dragGrabDY = 0;
    let draggingShelfItem = null;
    let toastTimer = null;

    // === 乱码揭示标题 ===
    function scrambleReveal(el, text) {
        const glyphs = 'ABCDEFGHKMNPRSTUVXYZ◆◇○●△▽✦✧#%&@$';
        let frame = 0;
        const total = 34;
        (function tick() {
            frame++;
            const progress = frame / total;
            el.textContent = text.split('').map((ch, i) => {
                if (ch === ' ') return ' ';
                return (i / text.length < progress)
                    ? ch
                    : glyphs[(Math.random() * glyphs.length) | 0];
            }).join('');
            if (frame < total) requestAnimationFrame(tick);
        })();
    }

    // === Toast ===
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    }

    // === Scrap 工厂 ===
    function createScrap(kind, content, x, y, rot) {
        const el = document.createElement('div');
        el.className = 'scrap bounce' + (kind === 'note' ? ' is-note' : '');
        el.textContent = content;
        boardInner.appendChild(el);
        const rect = el.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        const scrap = {
            el, kind, content,
            w: rect.width, h: rect.height,
            x: x - boardRect.left,
            y: y - boardRect.top,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            rot: rot !== undefined ? rot : (Math.random() - 0.5) * 16,
            rotV: 0,
            targetScale: 1,
            scale: 0.2,
            springScale: 1,
            dragging: false,
            hasTape: false
        };
        el.style.zIndex = ++zCounter;
        el.addEventListener('pointerdown', onScrapPointerDown);
        el.addEventListener('dblclick', () => {
            el.style.zIndex = ++zCounter;
            el.classList.remove('bounce');
            void el.offsetWidth;
            el.classList.add('bounce');
            burst(scrap.x + scrap.w / 2, scrap.y + scrap.h / 2, 14);
        });
        scraps.push(scrap);
        boardEmpty.classList.add('hidden');
        updateCount();
        return scrap;
    }

    function removeScrap(scrap) {
        const i = scraps.indexOf(scrap);
        if (i > -1) scraps.splice(i, 1);
        scrap.el.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s';
        scrap.el.style.opacity = '0';
        scrap.el.style.transform += ' scale(0.3) rotate(30deg)';
        setTimeout(() => scrap.el.remove(), 420);
        if (selected === scrap) selected = null;
        if (!scraps.length) boardEmpty.classList.remove('hidden');
        updateCount();
    }

    function updateCount() {
        metaCount.textContent = 'ITEMS ' + String(scraps.length).padStart(2, '0');
    }

    // === 拖拽（弹簧跟随 + 速度追踪） ===
    function onScrapPointerDown(e) {
        e.preventDefault();
        const scrap = scraps.find(s => s.el === e.currentTarget);
        if (!scrap) return;
        selected = scrap;
        document.querySelectorAll('.scrap.selected').forEach(n => n.classList.remove('selected'));
        scrap.el.classList.add('selected', 'dragging');
        scrap.el.style.zIndex = ++zCounter;
        dragTarget = scrap;
        dragTarget.dragging = true;
        const boardRect = board.getBoundingClientRect();
        dragGrabDX = e.clientX - (scrap.x + boardRect.left);
        dragGrabDY = e.clientY - (scrap.y + boardRect.top);
        pointer.px = pointer.x = e.clientX;
        pointer.py = pointer.y = e.clientY;
        pointer.vx = pointer.vy = 0;
        scrap.targetScale = 1.08;
        scrap.el.setPointerCapture && scrap.el.setPointerCapture(e.pointerId);
    }

    window.addEventListener('pointermove', (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        if (draggingShelfItem) {
            draggingShelfItem.ghost.style.left = e.clientX + 'px';
            draggingShelfItem.ghost.style.top = e.clientY + 'px';
        }
    });

    window.addEventListener('pointerup', () => {
        if (dragTarget) {
            // 甩动：把指针速度注入贴纸
            dragTarget.vx = pointer.vx * 0.9;
            dragTarget.vy = pointer.vy * 0.9;
            dragTarget.rotV = pointer.vx * 0.06;
            dragTarget.dragging = false;
            dragTarget.targetScale = 1;
            dragTarget.el.classList.remove('dragging');
            const sp = Math.hypot(pointer.vx, pointer.vy);
            if (sp > 18) {
                burst(dragTarget.x + dragTarget.w / 2, dragTarget.y + dragTarget.h / 2, Math.min(18, sp | 0));
            }
            dragTarget = null;
        }
        if (draggingShelfItem) {
            const g = draggingShelfItem.ghost;
            const br = board.getBoundingClientRect();
            const inside = e.clientX > br.left && e.clientX < br.right && e.clientY > br.top && e.clientY < br.bottom;
            if (inside) {
                spawnFromShelf(draggingShelfItem.kind, draggingShelfItem.content, e.clientX, e.clientY);
            }
            g.remove();
            draggingShelfItem = null;
        }
    });

    function spawnFromShelf(kind, content, x, y) {
        const scrap = createScrap(kind, content, x, y);
        scrap.vx = (Math.random() - 0.5) * 5;
        scrap.vy = (Math.random() - 0.5) * 5;
        burst(scrap.x + scrap.w / 2, scrap.y + scrap.h / 2, 10);
    }

    // === 构建货架 ===
    function buildShelf() {
        STICKERS.forEach(emoji => {
            const btn = document.createElement('div');
            btn.className = 'shelf-item';
            btn.textContent = emoji;
            bindShelfDrag(btn, 'sticker', emoji);
            shelfGrid.appendChild(btn);
        });
        NOTES.forEach(text => {
            const btn = document.createElement('div');
            btn.className = 'shelf-item';
            btn.style.fontSize = '0.68rem';
            btn.style.fontFamily = "'Outfit', sans-serif";
            btn.style.padding = '6px';
            btn.textContent = text.slice(0, 6) + '…';
            btn.title = text;
            bindShelfDrag(btn, 'note', text);
            shelfGrid.appendChild(btn);
        });
        TAPES.forEach((label, i) => {
            const btn = document.createElement('div');
            btn.className = 'shelf-item is-tape';
            btn.textContent = label;
            bindShelfDrag(btn, 'tape', i);
            tapeGrid.appendChild(btn);
        });
    }

    function bindShelfDrag(el, kind, content) {
        el.addEventListener('click', () => {
            if (kind === 'tape') return;
            const br = board.getBoundingClientRect();
            spawnFromShelf(kind, content,
                br.left + br.width * (0.25 + Math.random() * 0.5),
                br.top + br.height * (0.25 + Math.random() * 0.5));
        });
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const ghost = document.createElement('div');
            ghost.style.cssText =
                'position:fixed;z-index:99;pointer-events:none;transform:translate(-50%,-50%) rotate(-5deg) scale(1.1);' +
                'display:grid;place-items:center;padding:12px 16px;border-radius:6px;font-size:1.6rem;' +
                'background:var(--paper);box-shadow:0 14px 34px rgba(0,0,0,0.35);opacity:0.9;';
            if (kind === 'note') { ghost.style.fontSize = '0.7rem'; ghost.textContent = content.slice(0, 6) + '…'; }
            else ghost.textContent = content;
            ghost.style.left = e.clientX + 'px';
            ghost.style.top = e.clientY + 'px';
            document.body.appendChild(ghost);
            draggingShelfItem = { kind, content, ghost };
        });
    }

    // === 键盘交互 ===
    window.addEventListener('keydown', (e) => {
        if (!selected) return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            removeScrap(selected);
        } else if (e.key.toLowerCase() === 'r') {
            selected.rotV += (Math.random() - 0.5) * 26;
            selected.rot = (Math.random() - 0.5) * 40;
            burst(selected.x + selected.w / 2, selected.y + selected.h / 2, 8);
        } else if (e.key.toLowerCase() === 't') {
            toggleTape(selected);
        }
    });

    function toggleTape(scrap) {
        if (scrap.hasTape) {
            scrap.el.querySelector('.tape-mark')?.remove();
            scrap.hasTape = false;
        } else {
            const tape = document.createElement('div');
            tape.className = 'tape-mark';
            tape.style.setProperty('--tape-rot', ((Math.random() - 0.5) * 14).toFixed(1) + 'deg');
            scrap.el.appendChild(tape);
            scrap.hasTape = true;
        }
    }

    // === 洗牌布局 ===
    btnShuffle.addEventListener('click', () => {
        const br = board.getBoundingClientRect();
        scraps.forEach((s, i) => {
            const cols = Math.ceil(Math.sqrt(scraps.length));
            const gx = (i % cols) / cols;
            const gy = Math.floor(i / cols) / Math.ceil(scraps.length / cols);
            s.tx = (br.width - s.w) * (0.12 + gx * 0.76) + (Math.random() - 0.5) * 40;
            s.ty = (br.height - s.h) * (0.12 + gy * 0.76) + (Math.random() - 0.5) * 40;
            s.lerping = true;
            s.rot = (Math.random() - 0.5) * 24;
        });
        showToast('记忆重新拼贴 ✦');
        for (let i = 0; i < 4; i++) setTimeout(() => {
            burst(Math.random() * br.width, Math.random() * br.height, 6);
        }, i * 120);
    });

    // === PNG 导出 ===
    btnExport.addEventListener('click', () => {
        const br = board.getBoundingClientRect();
        const out = document.createElement('canvas');
        out.width = br.width * 2;
        out.height = br.height * 2;
        const c = out.getContext('2d');
        c.scale(2, 2);
        c.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-base') || '#1c1a17';
        c.fillRect(0, 0, br.width, br.height);
        const paper = getComputedStyle(document.body).getPropertyValue('--paper').trim();
        const paperInk = getComputedStyle(document.body).getPropertyValue('--paper-ink').trim();
        const sorted = [...scraps].sort((a, b) => (+a.el.style.zIndex || 0) - (+b.el.style.zIndex || 0));
        sorted.forEach(s => {
            c.save();
            c.translate(s.x + s.w / 2, s.y + s.h / 2);
            c.rotate(s.rot * Math.PI / 180);
            c.shadowColor = 'rgba(0,0,0,0.3)';
            c.shadowBlur = 14;
            c.shadowOffsetY = 5;
            c.fillStyle = paper;
            c.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
            c.shadowColor = 'transparent';
            c.fillStyle = paperInk;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.font = s.kind === 'note'
                ? "500 13px 'Outfit', sans-serif"
                : '28px serif';
            if (s.kind === 'note') {
                c.textAlign = 'left';
                wrapText(c, s.content, -s.w / 2 + 16, -s.h / 2 + 24, s.w - 32, 19);
            } else {
                c.fillText(s.content, 0, 2);
            }
            if (s.hasTape) {
                c.fillStyle = getComputedStyle(document.body).getPropertyValue('--tape').trim();
                c.fillRect(-32, -s.h / 2 - 10, 64, 20);
            }
            c.restore();
        });
        const a = document.createElement('a');
        a.download = 'scrapbook-canvas.png';
        a.href = out.toDataURL('image/png');
        a.click();
        showToast('已导出 scrapbook-canvas.png ⤓');
    });

    function wrapText(c, text, x, y, maxW, lh) {
        let line = '';
        text.split('').forEach(ch => {
            if (c.measureText(line + ch).width > maxW) {
                c.fillText(line, x, y);
                line = ch;
                y += lh;
            } else line += ch;
        });
        c.fillText(line, x, y);
    }

    // === 主题切换 ===
    themeToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-btn');
        if (!btn) return;
        themeToggle.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        themeName = btn.dataset.theme;
        document.body.dataset.theme = themeName;
        metaTheme.textContent = 'THEME ' + themeName.toUpperCase();
        showToast('氛围 · ' + btn.textContent);
    });

    // === 粒子系统 ===
    const particles = [];
    function burst(x, y, n) {
        const style = getComputedStyle(document.body);
        const colors = [
            style.getPropertyValue('--accent').trim(),
            style.getPropertyValue('--paper').trim(),
            '#ffffff'
        ];
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 1.5 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 1.2,
                life: 1,
                decay: 0.014 + Math.random() * 0.02,
                size: 1.5 + Math.random() * 3,
                color: colors[(Math.random() * colors.length) | 0]
            });
        }
    }

    // 环境漂浮粒子
    const ambient = [];
    function initAmbient() {
        ambient.length = 0;
        for (let i = 0; i < 42; i++) {
            ambient.push({
                x: Math.random(), y: Math.random(),
                r: 0.6 + Math.random() * 1.8,
                phase: Math.random() * Math.PI * 2,
                speed: 0.02 + Math.random() * 0.05
            });
        }
    }

    function resizeCanvas() {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);

    // === 物理循环 ===
    function physics(dt) {
        const br = board.getBoundingClientRect();
        const damping = 0.985;
        scraps.forEach(s => {
            // 缩放弹簧
            const k = 0.16, damp = 0.72;
            s.springScale += (s.targetScale - s.scale) * k * dt;
            s.springScale *= damp;
            s.scale += s.springScale;

            if (s.dragging && dragTarget === s) {
                // 弹簧拖拽：位置被吸向指针
                const targetX = pointer.x - br.left - dragGrabDX;
                const targetY = pointer.y - br.top - dragGrabDY;
                s.vx += (targetX - s.x) * 0.34 * dt;
                s.vy += (targetY - s.y) * 0.34 * dt;
                s.vx *= 0.62;
                s.vy *= 0.62;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.rot += (pointer.vx * 0.35 - s.rot) * 0.14;
            } else if (s.lerping) {
                s.vx += (s.tx - s.x) * 0.02 * dt;
                s.vy += (s.ty - s.y) * 0.02 * dt;
                s.vx *= 0.9; s.vy *= 0.9;
                s.x += s.vx * dt; s.y += s.vy * dt;
                if (Math.abs(s.tx - s.x) < 0.6 && Math.abs(s.ty - s.y) < 0.6) s.lerping = false;
            } else {
                // 惯性滑行 + 边界弹性碰撞
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.vx *= damping;
                s.vy *= damping;
                s.rotV *= 0.96;
                s.rot += s.rotV * dt * 0.016;
                // 轻微回归水平
                s.rot += (Math.round(s.rot / 2) * 2 - s.rot) * 0.004;

                const maxX = br.width - s.w;
                const maxY = br.height - s.h;
                if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx) * 0.62; s.rotV = -s.rotV * 0.5; }
                if (s.x > maxX) { s.x = maxX; s.vx = -Math.abs(s.vx) * 0.62; s.rotV = -s.rotV * 0.5; }
                if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy) * 0.62; }
                if (s.y > maxY) { s.y = maxY; s.vy = -Math.abs(s.vy) * 0.62; burst(s.x + s.w / 2, s.y + s.h, 4); }
            }

            s.el.style.transform =
                'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) ' +
                'rotate(' + s.rot.toFixed(2) + 'deg) ' +
                'scale(' + s.scale.toFixed(3) + ')';
        });
    }

    // === 粒子渲染 ===
    let tAcc = 0;
    function renderParticles(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 环境漂浮
        const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim();
        ambient.forEach(p => {
            const px = (p.x + Math.sin(time * 0.0002 + p.phase) * 0.02) * canvas.width;
            const py = ((p.y - time * 0.00003 * p.speed * 30) % 1 + 1) % 1 * canvas.height;
            ctx.globalAlpha = 0.1 + Math.sin(time * 0.001 + p.phase) * 0.06;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(px, py, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // 迸射粒子
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life -= p.decay;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // === 主循环 ===
    let last = performance.now();
    function loop(now) {
        const dt = Math.min(2.4, (now - last) / 8);
        last = now;

        // 指针速度追踪
        pointer.vx = pointer.x - pointer.px;
        pointer.vy = pointer.y - pointer.py;
        pointer.px += (pointer.x - pointer.px) * 0.55;
        pointer.py += (pointer.y - pointer.py) * 0.55;

        physics(dt);
        renderParticles(now);

        // 光标辉光
        cursorGlow.style.left = pointer.px + 'px';
        cursorGlow.style.top = pointer.py + 'px';

        // 遥测
        const br = board.getBoundingClientRect();
        const lx = Math.round(pointer.px - br.left);
        const ly = Math.round(pointer.py - br.top);
        metaCoord.textContent = 'X ' + String(Math.max(0, lx)).padStart(3, '0') +
            ' · Y ' + String(Math.max(0, ly)).padStart(3, '0');
        metaVel.textContent = 'V ' + Math.hypot(pointer.vx, pointer.vy).toFixed(2);

        requestAnimationFrame(loop);
    }

    // === 初始化 ===
    function seedInitialScraps() {
        const br = board.getBoundingClientRect();
        const starters = [
            ['sticker', '🕊️', 0.28, 0.3],
            ['note', NOTES[0], 0.52, 0.24],
            ['sticker', '🌙', 0.68, 0.55],
            ['sticker', '🌿', 0.36, 0.62]
        ];
        starters.forEach((s, i) => {
            setTimeout(() => {
                const scrap = createScrap(s[0], s[1], br.left + br.width * s[2], br.top + br.height * s[3]);
                if (s[0] === 'note') toggleTape(scrap);
            }, 260 * i + 500);
        });
    }

    resizeCanvas();
    initAmbient();
    buildShelf();
    scrambleReveal(scrambleTitle, 'Scrapbook Canvas');
    requestAnimationFrame(loop);
    window.addEventListener('load', seedInitialScraps);
    seedInitialScraps();
})();
