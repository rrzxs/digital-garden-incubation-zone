/* ============================================================
   Data Center Builder · 数据中心构建器
   交互逻辑：拖拽构建 / 容量计算 / 粒子流场 / 主题切换
   Maintainer: EDEN
   ============================================================ */

(function () {
    'use strict';

    // === 元件模型 (Domain Model) ===
    // 每种元件对功耗、散热、供电、容量的贡献
    const COMPONENTS = Object.freeze({
        rack:    { glyph: '▥', power: 2.0,  provide: 0,  cool: 0,   unit: 'U',  unitVal: 10 },
        server:  { glyph: '⊟', power: 0.4,  provide: 0,  cool: 0,   unit: 'U',  unitVal: 2  },
        cooler:  { glyph: '❄', power: 0.3,  provide: 0,  cool: 3.0, unit: '',   unitVal: 0  },
        power:   { glyph: '⚡', power: 0.1,  provide: 8.0, cool: 0,  unit: '',   unitVal: 0  },
        network: { glyph: '⌬', power: 0.2,  provide: 0,  cool: 0,   unit: 'U',  unitVal: 1  },
        storage: { glyph: '▤', power: 0.6,  provide: 0,  cool: 0,   unit: 'U',  unitVal: 4  }
    });

    const GRID_COLS = 12;
    const GRID_ROWS = 8;

    // === DOM Elements ===
    const body = document.body;
    const grid = document.getElementById('builder-grid');
    const paletteGrid = document.getElementById('palette-grid');
    const dropGhost = document.getElementById('drop-ghost');
    const dragGhost = document.getElementById('drag-ghost');
    const cellCountEl = document.getElementById('cell-count');
    const pueValueEl = document.getElementById('pue-value');
    const pueGradeEl = document.getElementById('pue-grade');
    const powerValEl = document.getElementById('power-val');
    const powerFillEl = document.getElementById('power-fill');
    const loadValEl = document.getElementById('load-val');
    const loadFillEl = document.getElementById('load-fill');
    const coolValEl = document.getElementById('cool-val');
    const coolFillEl = document.getElementById('cool-fill');
    const statusZone = document.getElementById('status-zone');
    const footCoord = document.getElementById('foot-coord');
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');

    // === 网格状态 ===
    const cells = []; // [{ el, type }]
    let dragType = null;
    let hoverIndex = -1;

    // ============================================================
    // 1. 网格构建
    // ============================================================
    function buildGrid() {
        grid.innerHTML = '';
        cells.length = 0;
        for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            grid.appendChild(cell);
            cells.push({ el: cell, type: null });

            // 悬停坐标显示
            cell.addEventListener('mouseenter', () => {
                const r = Math.floor(i / GRID_COLS) + 1;
                const c = (i % GRID_COLS) + 1;
                footCoord.textContent = `grid [ R${r} · C${c} ]`;
            });
        }
        grid.addEventListener('mouseleave', () => {
            footCoord.textContent = 'grid [ — ]';
        });
    }

    // ============================================================
    // 2. 元件放置 / 移除
    // ============================================================
    function placeComponent(index, type) {
        if (index < 0 || index >= cells.length) return;
        const cell = cells[index];
        if (cell.type === type) return; // 相同不重复

        // 已有元件先清掉
        if (cell.type) {
            clearCell(index, true);
        }

        cell.type = type;
        const meta = COMPONENTS[type];
        cell.el.classList.add('placed');
        cell.el.dataset.type = type;
        cell.el.innerHTML = `<div class="placed-inner"><span class="placed-glyph">${meta.glyph}</span></div>`;
        recompute();
        pulseGrid();
    }

    function clearCell(index, skipRecompute) {
        const cell = cells[index];
        if (!cell.type) return;

        cell.el.classList.add('removing');
        const el = cell.el;
        setTimeout(() => {
            el.classList.remove('placed', 'removing');
            el.removeAttribute('data-type');
            el.innerHTML = '';
        }, 380);
        cell.type = null;

        if (!skipRecompute) recompute();
    }

    function clearAll() {
        let any = false;
        cells.forEach((c, i) => {
            if (c.type) {
                any = true;
                clearCell(i, true);
            }
        });
        if (any) {
            setTimeout(recompute, 400);
        }
    }

    // 点击单元格：有元件则移除
    grid.addEventListener('click', (e) => {
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;
        const idx = parseInt(cellEl.dataset.index, 10);
        if (cells[idx] && cells[idx].type) {
            clearCell(idx);
        }
    });

    // 双击清空单元（兼容已占用）
    grid.addEventListener('dblclick', (e) => {
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;
        const idx = parseInt(cellEl.dataset.index, 10);
        clearCell(idx);
    });

    // ============================================================
    // 3. 拖拽（HTML5 Drag + 自定义浮层）
    // ============================================================
    paletteGrid.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.palette-item');
        if (!item) return;
        dragType = item.dataset.type;
        item.classList.add('dragging');
        // 设置一个透明拖影，使用自定义浮层
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copy';
            const blank = document.createElement('canvas');
            blank.width = 1;
            blank.height = 1;
            e.dataTransfer.setDragImage(blank, 0, 0);
        }
        showDragGhost(dragType);
    });

    paletteGrid.addEventListener('dragend', (e) => {
        const item = e.target.closest('.palette-item');
        if (item) item.classList.remove('dragging');
        hideDragGhost();
        dragType = null;
        clearHover();
    });

    document.addEventListener('drag', (e) => {
        if (dragType) updateDragGhostPos(e.clientX, e.clientY);
    });

    document.addEventListener('dragover', (e) => {
        if (!dragType) return;
        e.preventDefault();
        updateDragGhostPos(e.clientX, e.clientY);
    });

    grid.addEventListener('dragover', (e) => {
        if (!dragType) return;
        e.preventDefault();
        const cellEl = e.target.closest('.cell');
        if (!cellEl) {
            clearHover();
            return;
        }
        const idx = parseInt(cellEl.dataset.index, 10);
        if (idx !== hoverIndex) {
            clearHover();
            hoverIndex = idx;
            cellEl.classList.add('hover');
            showDropGhost(cellEl);
        }
    });

    grid.addEventListener('dragleave', (e) => {
        const related = e.relatedTarget;
        if (!grid.contains(related)) {
            clearHover();
        }
    });

    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragType) return;
        const cellEl = e.target.closest('.cell');
        if (cellEl) {
            const idx = parseInt(cellEl.dataset.index, 10);
            placeComponent(idx, dragType);
        }
        clearHover();
    });

    function clearHover() {
        cells.forEach((c) => c.el.classList.remove('hover'));
        hideDropGhost();
        hoverIndex = -1;
    }

    function showDropGhost(cellEl) {
        const rect = cellEl.getBoundingClientRect();
        const wrapRect = grid.parentElement.getBoundingClientRect();
        dropGhost.style.width = rect.width + 'px';
        dropGhost.style.height = rect.height + 'px';
        dropGhost.style.left = (rect.left - wrapRect.left) + 'px';
        dropGhost.style.top = (rect.top - wrapRect.top) + 'px';
        dropGhost.style.opacity = '1';
    }

    function hideDropGhost() {
        dropGhost.style.opacity = '0';
    }

    // 自定义拖拽浮层
    function showDragGhost(type) {
        const meta = COMPONENTS[type];
        dragGhost.innerHTML = `<span class="placed-glyph">${meta.glyph}</span>`;
        dragGhost.classList.add('visible');
    }

    function hideDragGhost() {
        dragGhost.classList.remove('visible');
    }

    function updateDragGhostPos(x, y) {
        if (x === 0 && y === 0) return; // drag 结束时坐标归零
        dragGhost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }

    // ============================================================
    // 4. 容量计算 (Telemetry)
    // ============================================================
    function computeStats() {
        let power = 0;        // 总功耗 kW (负载)
        let provided = 0;     // 电源供电能力 kW
        let cooling = 0;      // 散热能力 kW
        const counts = { rack: 0, server: 0, cooler: 0, power: 0, network: 0, storage: 0 };
        let placed = 0;

        cells.forEach((c) => {
            if (!c.type) return;
            placed++;
            counts[c.type]++;
            const m = COMPONENTS[c.type];
            power += m.power;
            provided += m.provide;
            cooling += m.cool;
        });

        // 净负载 = 元件功耗 - 散热能力（散热抵消）
        const netHeat = Math.max(0, power - cooling);

        // PUE = 总功耗(含冷却能耗) / IT 功耗
        // 这里用简化模型: PUE = (IT功耗 + 冷却功耗) / IT功耗
        let pue = 1.0;
        if (power > 0) {
            const coolPower = Math.max(0, power - cooling) * 0.5 + // 不足的散热用更多电
                              Math.min(cooling, power) * 0.3;       // 主被动冷却功耗
            pue = (power + coolPower) / power;
        }

        // 电力盈余
        const powerBalance = provided - power;

        return { power, provided, cooling, netHeat, pue, counts, placed, powerBalance };
    }

    function recompute() {
        const s = computeStats();

        // 已放置数
        cellCountEl.textContent = `已放置 ${s.placed}`;

        // PUE
        pueValueEl.textContent = s.pue.toFixed(2);
        pueGradeEl.classList.remove('warn', 'danger');
        if (s.placed === 0) {
            pueGradeEl.textContent = '待机';
        } else if (s.pue < 1.35) {
            pueGradeEl.textContent = '极佳';
        } else if (s.pue < 1.6) {
            pueGradeEl.textContent = '良好';
            pueGradeEl.classList.add('warn');
        } else {
            pueGradeEl.textContent = '过载';
            pueGradeEl.classList.add('danger');
        }

        // 能量条
        const powerCap = Math.max(s.power, s.provided, 1);
        powerValEl.textContent = `${s.provided.toFixed(1)} / ${(s.provided - s.power).toFixed(1)} kW`;
        powerFillEl.style.width = clampPct(s.power / Math.max(s.provided, 0.001)) + '%';

        loadValEl.textContent = `${s.power.toFixed(1)} kW`;
        loadFillEl.style.width = clampPct(s.power / 30) + '%';

        const coolNeeded = s.power;
        coolValEl.textContent = `${s.cooling.toFixed(1)} / ${coolNeeded.toFixed(1)} kW`;
        coolFillEl.style.width = clampPct(s.cooling / Math.max(coolNeeded, 0.001)) + '%';

        // 元件统计
        Object.keys(s.counts).forEach((type) => {
            const chip = document.querySelector(`.chip-num[data-type="${type}"]`);
            if (chip) {
                chip.textContent = s.counts[type];
                chip.closest('.stat-chip').classList.toggle('has', s.counts[type] > 0);
            }
        });

        // 状态徽章
        renderStatus(s);
    }

    function clampPct(v) {
        return Math.max(0, Math.min(100, v * 100));
    }

    function renderStatus(s) {
        const badges = [];
        if (s.placed === 0) {
            badges.push({ cls: 'status-info', text: '● 等待部署' });
        } else {
            badges.push({ cls: 'status-ok', text: `● ${s.placed} 节点在线` });
        }

        if (s.powerBalance < 0) {
            badges.push({ cls: 'status-danger', text: `⚡ 电力缺口 ${Math.abs(s.powerBalance).toFixed(1)}kW` });
        } else if (s.powerBalance > 0 && s.provided > 0) {
            badges.push({ cls: 'status-ok', text: `⚡ 电力盈余 ${s.powerBalance.toFixed(1)}kW` });
        }

        if (s.netHeat > 0.5) {
            badges.push({ cls: 'status-warn', text: `🔥 散热不足 ${s.netHeat.toFixed(1)}kW` });
        } else if (s.cooling > 0 && s.power > 0) {
            badges.push({ cls: 'status-ok', text: '❄ 散热充足' });
        }

        if (s.counts.rack >= 4) {
            badges.push({ cls: 'status-info', text: '▦ 规模化部署' });
        }

        statusZone.innerHTML = badges
            .map((b) => `<span class="status-badge ${b.cls}">${b.text}</span>`)
            .join('');
    }

    // 网格涟漪脉冲（放置后）
    function pulseGrid() {
        // 给所有 placed 单元一个微弱的连锁高亮
        const placedCells = cells.filter((c) => c.type);
        placedCells.forEach((c, i) => {
            setTimeout(() => {
                c.el.style.transition = 'box-shadow 0.4s var(--ease-out-expo)';
                c.el.style.boxShadow = '0 0 18px var(--accent)';
                setTimeout(() => {
                    c.el.style.boxShadow = '';
                }, 400);
            }, i * 18);
        });
    }

    // ============================================================
    // 5. 预设 / 随机布局
    // ============================================================
    const PRESET = [
        // 一排电源 + 冷却夹击服务器机架的经典冷热通道布局
        { type: 'power', idx: [0, 11] },
        { type: 'cooler', idx: [12, 23, 60, 71] },
        { type: 'rack', idx: [25, 26, 27, 28, 29, 30, 33, 34, 35, 36, 37, 38] },
        { type: 'server', idx: [49, 50, 51, 52, 53, 54] },
        { type: 'storage', idx: [41, 42, 43, 44] },
        { type: 'network', idx: [46, 47] }
    ];

    function loadPreset() {
        clearAll();
        setTimeout(() => {
            PRESET.forEach((group) => {
                group.idx.forEach((i) => placeComponent(i, group.type));
            });
        }, 450);
    }

    function randomLayout() {
        clearAll();
        setTimeout(() => {
            const types = Object.keys(COMPONENTS);
            const count = 16 + Math.floor(Math.random() * 14);
            const used = new Set();
            for (let i = 0; i < count; i++) {
                let idx;
                let tries = 0;
                do {
                    idx = Math.floor(Math.random() * cells.length);
                    tries++;
                } while (used.has(idx) && tries < 20);
                if (used.has(idx)) continue;
                used.add(idx);
                placeComponent(idx, types[Math.floor(Math.random() * types.length)]);
            }
        }, 450);
    }

    document.getElementById('btn-clear').addEventListener('click', clearAll);
    document.getElementById('btn-preset').addEventListener('click', loadPreset);
    document.getElementById('btn-random').addEventListener('click', randomLayout);

    // ============================================================
    // 6. 主题切换
    // ============================================================
    document.querySelectorAll('.theme-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            body.dataset.theme = btn.dataset.theme;
            updateParticleColors();
        });
    });

    // ============================================================
    // 7. 粒子流场 (Canvas)
    // ============================================================
    let particles = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
    }

    function getAccentColor() {
        const styles = getComputedStyle(body);
        const raw = styles.getPropertyValue('--accent').trim();
        return raw || '#5ac8fa';
    }

    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
        const num = parseInt(full, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    let particleColor = { r: 90, g: 200, b: 250 };

    function updateParticleColors() {
        setTimeout(() => {
            particleColor = hexToRgb(getAccentColor());
        }, 100);
    }

    function initParticles() {
        particles = [];
        const count = Math.floor((window.innerWidth * window.innerHeight) / 16000);
        for (let i = 0; i < Math.min(count, 90); i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 1.8 + 0.4,
                life: Math.random()
            });
        }
    }

    // 伪噪声流场角度
    function flowAngle(x, y, t) {
        return (Math.sin(x * 0.0025 + t) + Math.cos(y * 0.0025 - t * 0.7)) * Math.PI;
    }

    let time = 0;

    function animateParticles() {
        time += 0.002;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const { r, g, b } = particleColor;

        particles.forEach((p) => {
            // 流场推动
            const a = flowAngle(p.x, p.y, time);
            p.vx += Math.cos(a) * 0.02;
            p.vy += Math.sin(a) * 0.02;

            // 鼠标排斥
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 14400) {
                const dist = Math.sqrt(dist2) || 1;
                const force = (120 - dist) / 120;
                p.vx += (dx / dist) * force * 0.8;
                p.vy += (dy / dist) * force * 0.8;
            }

            // 阻尼
            p.vx *= 0.95;
            p.vy *= 0.95;

            p.x += p.vx;
            p.y += p.vy;

            // 边界回环
            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;

            p.life += 0.005;
            const alpha = (Math.sin(p.life * Math.PI) * 0.5 + 0.5) * 0.7;

            ctx.beginPath();
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 连接近邻粒子
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 8100) {
                    const alpha = (1 - d2 / 8100) * 0.12;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animateParticles);
    }

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resizeCanvas();
            initParticles();
        }, 200);
    });

    // ============================================================
    // 8. 入场动画 (Intersection Observer)
    // ============================================================
    function setupReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        document.querySelectorAll('.reveal').forEach((el, i) => {
            el.style.transitionDelay = (i * 0.08) + 's';
            observer.observe(el);
        });
    }

    // ============================================================
    // 9. 触摸支持 (移动端点击元件库 -> 点网格放置)
    // ============================================================
    let pendingType = null;

    paletteGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.palette-item');
        if (!item) return;
        pendingType = item.dataset.type;
        // 高亮提示
        document.querySelectorAll('.palette-item').forEach((p) => p.classList.remove('pending'));
        item.classList.add('pending');
        item.style.animate = 'none';
        flashHint(item);
    });

    function flashHint(item) {
        const old = item.style.boxShadow;
        item.style.transition = 'box-shadow 0.3s var(--ease-out-expo)';
        item.style.boxShadow = '0 0 0 2px var(--accent)';
        setTimeout(() => {
            item.style.boxShadow = old;
        }, 600);
    }

    // 移动端：点击网格放置 pendingType
    grid.addEventListener('click', (e) => {
        if (!pendingType) return;
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;
        const idx = parseInt(cellEl.dataset.index, 10);
        if (cells[idx] && !cells[idx].type) {
            placeComponent(idx, pendingType);
        }
        // 单次放置后清除 pending（避免误操作）
        pendingType = null;
        document.querySelectorAll('.palette-item').forEach((p) => p.classList.remove('pending'));
    }, true);

    // ============================================================
    // 启动
    // ============================================================
    function init() {
        buildGrid();
        recompute();
        resizeCanvas();
        initParticles();
        updateParticleColors();
        animateParticles();
        setupReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
