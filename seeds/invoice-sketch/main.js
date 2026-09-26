/**
 * Invoice Sketch 发票速写
 * 沉浸式账单作曲家 — 流体渐变背景 + 微晶玻璃态容器 + 非线性动效
 * Vanilla JS · 免构建
 */
(function invoiceSketchBoot(globalScope) {
    'use strict';

    // === 常量与预设词库 ===
    const EASE_OUT = { easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
    const STORAGE_KEY = 'invoice-sketch-state-v1';

    const SKETCH_POOL = [
        { desc: '流体网格渐变调校', qty: 2, price: 480 },
        { desc: '微晶玻璃态容器打磨', qty: 1, price: 660 },
        { desc: '非线性缓动曲线作曲', qty: 3, price: 220 },
        { desc: '像素级字符揭示仪式', qty: 1, price: 350 },
        { desc: '深夜灵感陪跑服务', qty: 4, price: 128 },
        { desc: '粒子流场氛围布置', qty: 2, price: 299 },
        { desc: '排版呼吸感调理', qty: 1, price: 520 },
        { desc: '冲击波涟漪调音', qty: 5, price: 88 }
    ];

    // === DOM Elements ===
    const paper = document.getElementById('invoice-paper');
    const lineItemsEl = document.getElementById('line-items');
    const addRowBtn = document.getElementById('add-row-btn');
    const taxSlider = document.getElementById('tax-slider');
    const discountSlider = document.getElementById('discount-slider');
    const taxDisplay = document.getElementById('tax-display');
    const discountDisplay = document.getElementById('discount-display');
    const subtotalEl = document.getElementById('subtotal-el');
    const discountEl = document.getElementById('discount-el');
    const taxEl = document.getElementById('tax-el');
    const grandEl = document.getElementById('grand-el');
    const stampBtn = document.getElementById('stamp-btn');
    const stamp = document.getElementById('stamp');
    const printBtn = document.getElementById('print-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const telemetry = document.getElementById('telemetry');
    const invoiceNo = document.getElementById('invoice-no');
    const invoiceDate = document.getElementById('invoice-date');
    const themeDots = document.querySelectorAll('.theme-dot');
    const canvas = document.getElementById('particle-canvas');

    let rows = [];
    let currency = '¥';
    let rolling = null;

    // === 状态持久化 ===
    function saveState() {
        try {
            globalScope.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                theme: document.body.dataset.theme,
                tax: taxSlider.value,
                discount: discountSlider.value,
                rows: rows.map((r) => ({
                    desc: r.descInput.value,
                    qty: r.qtyInput.value,
                    price: r.priceInput.value
                })),
                fields: Array.from(document.querySelectorAll('.editable[data-field]')).reduce((acc, el) => {
                    acc[el.dataset.field] = el.textContent;
                    return acc;
                }, {})
            }));
        } catch { /* 静默降级 */ }
    }

    function loadState() {
        let raw = null;
        try { raw = globalScope.localStorage.getItem(STORAGE_KEY); } catch { return false; }
        if (!raw) return false;
        try {
            const state = JSON.parse(raw);
            if (!state.rows || !state.rows.length) return false;
            document.body.dataset.theme = state.theme || 'aurora';
            taxSlider.value = state.tax ?? 6;
            discountSlider.value = state.discount ?? 0;
            state.rows.forEach((r) => createRow(r.desc, r.qty, r.price, false));
            if (state.fields) {
                Object.entries(state.fields).forEach(([key, val]) => {
                    const el = document.querySelector(`.editable[data-field="${key}"]`);
                    if (el && val) el.textContent = val;
                });
            }
            return true;
        } catch { return false; }
    }

    // === 行管理 ===
    function createRow(desc, qty, price, animate = true) {
        const row = document.createElement('div');
        row.className = 'line-item';
        if (animate) row.style.animationDelay = '0s';

        const descInput = document.createElement('input');
        descInput.className = 'desc';
        descInput.type = 'text';
        descInput.placeholder = '描述这笔画的是什么…';
        descInput.value = desc || '';

        const qtyInput = document.createElement('input');
        qtyInput.className = 'num';
        qtyInput.type = 'number';
        qtyInput.min = '0';
        qtyInput.step = '1';
        qtyInput.value = qty ?? 1;

        const priceInput = document.createElement('input');
        priceInput.className = 'num';
        priceInput.type = 'number';
        priceInput.min = '0';
        priceInput.step = '0.01';
        priceInput.value = price ?? 0;

        const amountCell = document.createElement('div');
        amountCell.className = 'cell amount';
        amountCell.textContent = '0.00';

        const delBtn = document.createElement('button');
        delBtn.className = 'del-btn';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', '删除此行');

        row.append(descInput, qtyInput, priceInput, amountCell, delBtn);
        lineItemsEl.appendChild(row);

        const record = { row, descInput, qtyInput, priceInput, amountCell };
        rows.push(record);

        [descInput, qtyInput, priceInput].forEach((input) => {
            input.addEventListener('input', () => { recalc(); saveState(); });
            input.addEventListener('focus', () => row.style.borderColor = 'color-mix(in srgb, var(--accent) 55%, transparent)');
            input.addEventListener('blur', () => row.style.borderColor = '');
        });

        delBtn.addEventListener('click', () => {
            row.classList.add('removing');
            setTimeout(() => {
                rows = rows.filter((r) => r !== record);
                row.remove();
                recalc();
                saveState();
            }, 420);
        });

        return record;
    }

    function seedFreshInvoice() {
        const count = 3 + Math.floor(Math.random() * 3);
        const pool = [...SKETCH_POOL].sort(() => Math.random() - 0.5).slice(0, count);
        pool.forEach((item, i) => {
            const jitter = 1 + (Math.random() * 0.2 - 0.1);
            createRow(item.desc, item.qty, Math.round(item.price * jitter), false);
            const last = rows[rows.length - 1];
            last.row.style.animationDelay = `${0.08 * i + 0.3}s`;
        });
        const seq = String(Math.floor(Math.random() * 9000) + 1000);
        invoiceNo.textContent = `INV-2026-${seq}`;
    }

    // === 计算与滚动数字 ===
    function fmt(n) {
        return `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function recalc() {
        let subtotal = 0, totalQty = 0;
        rows.forEach((r) => {
            const amount = (parseFloat(r.qtyInput.value) || 0) * (parseFloat(r.priceInput.value) || 0);
            subtotal += amount;
            totalQty += parseFloat(r.qtyInput.value) || 0;
            r.amountCell.textContent = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        });

        const taxRate = parseFloat(taxSlider.value) / 100;
        const offRate = parseFloat(discountSlider.value) / 100;
        const discount = subtotal * offRate;
        const taxable = subtotal - discount;
        const tax = taxable * taxRate;
        const grand = taxable + tax;

        subtotalEl.textContent = fmt(subtotal);
        discountEl.textContent = `−${fmt(discount)}`;
        taxEl.textContent = fmt(tax);

        rollGrand(grand);
        telemetry.textContent = `ITEMS ${String(rows.length).padStart(2, '0')} · QTY ${String(Math.round(totalQty)).padStart(2, '0')} · EDGE ${grand.toFixed(2)}`;
    }

    function rollGrand(target) {
        if (rolling) cancelAnimationFrame(rolling);
        const startVal = parseFloat(grandEl.dataset.value) || 0;
        const startTs = performance.now();
        const duration = 650;

        const step = (ts) => {
            const p = Math.min((ts - startTs) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            const current = startVal + (target - startVal) * eased;
            grandEl.textContent = fmt(current);
            if (p < 1) {
                rolling = requestAnimationFrame(step);
            } else {
                grandEl.dataset.value = target;
                grandEl.classList.remove('bump');
                void grandEl.offsetWidth;
                grandEl.classList.add('bump');
            }
        };
        rolling = requestAnimationFrame(step);
    }

    // === 主题切换 ===
    themeDots.forEach((dot) => {
        dot.addEventListener('click', () => {
            themeDots.forEach((d) => d.classList.remove('active'));
            dot.classList.add('active');
            document.body.dataset.theme = dot.dataset.theme;
            burstPalette();
            saveState();
        });
    });

    // === 盖章 ===
    let stamped = false;
    stampBtn.addEventListener('click', () => {
        stamped = !stamped;
        if (stamped) {
            stamp.classList.remove('unstamping');
            void stamp.offsetWidth;
            stamp.classList.add('stamped');
            stampBtn.textContent = '撤回 · UNSEAL';
            burstAt(innerWidth * 0.72, paper.getBoundingClientRect().top + 400, '#ef4444', 26);
        } else {
            stamp.classList.remove('stamped');
            void stamp.offsetWidth;
            stamp.classList.add('unstamping');
            stampBtn.textContent = '盖章 · SEAL IT';
        }
    });

    // === 打印 / 换一张 ===
    printBtn.addEventListener('click', () => globalScope.print());

    shuffleBtn.addEventListener('click', () => {
        rows.forEach((r) => r.row.classList.add('removing'));
        setTimeout(() => {
            lineItemsEl.innerHTML = '';
            rows = [];
            seedFreshInvoice();
            recalc();
            saveState();
        }, 420);
    });

    // === 新增行 ===
    addRowBtn.addEventListener('click', () => {
        createRow('', 1, 0);
        const last = rows[rows.length - 1];
        last.descInput.focus();
        recalc();
        saveState();
    });

    // === 滑块联动 ===
    taxSlider.addEventListener('input', () => {
        taxDisplay.textContent = `${parseFloat(taxSlider.value).toFixed(1)}%`;
        recalc();
    });
    discountSlider.addEventListener('input', () => {
        discountDisplay.textContent = `${Math.round(discountSlider.value)}%`;
        recalc();
    });

    document.addEventListener('input', (e) => {
        if (e.target.matches('.editable')) saveState();
    });

    // === 光泽跟随 + 视差 ===
    globalScope.addEventListener('pointermove', (e) => {
        const rect = paper.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        if (x >= -0.2 && x <= 1.2 && y >= -0.2 && y <= 1.2) {
            paper.style.setProperty('--mx', `${x * 100}%`);
            paper.style.setProperty('--my', `${y * 100}%`);
            const tiltX = (y - 0.5) * -1.6;
            const tiltY = (x - 0.5) * 1.6;
            paper.style.transform = `perspective(1400px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        }
    });

    // === 磁力按钮 ===
    document.querySelectorAll('.magnetic-btn').forEach((btn) => {
        btn.addEventListener('pointermove', (e) => {
            const rect = btn.getBoundingClientRect();
            const dx = (e.clientX - rect.left - rect.width / 2) * 0.25;
            const dy = (e.clientY - rect.top - rect.height / 2) * 0.35;
            btn.style.transform = `translate(${dx}px, ${dy}px)`;
        });
        btn.addEventListener('pointerleave', () => {
            btn.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            btn.style.transform = '';
            setTimeout(() => { btn.style.transition = ''; }, 800);
        });
    });

    // === 粒子流场（背景氛围） ===
    const ctx = canvas.getContext('2d');
    let particles = [];
    const pointer = { x: -999, y: -999 };

    function resizeCanvas() {
        canvas.width = globalScope.innerWidth;
        canvas.height = globalScope.innerHeight;
    }

    function initParticles() {
        const count = Math.min(70, Math.floor(globalScope.innerWidth / 18));
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.8 + 0.4,
            phase: Math.random() * Math.PI * 2
        }));
    }

    function themeColor(alpha) {
        const styles = getComputedStyle(document.body);
        const c = styles.getPropertyValue('--accent').trim() || '#22d3ee';
        return `color-mix(in srgb, ${c} ${Math.round(alpha * 100)}%, transparent)`;
    }

    function drawParticles(t) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const drift = Math.sin(t * 0.0004) * 0.15;

        particles.forEach((p) => {
            p.vx += drift * 0.01;
            p.x += p.vx + Math.sin(t * 0.001 + p.phase) * 0.12;
            p.y += p.vy + Math.cos(t * 0.0008 + p.phase) * 0.08;

            // 光标轻微排斥
            const dx = p.x - pointer.x, dy = p.y - pointer.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 12000) {
                const f = (12000 - dist2) / 12000 * 0.6;
                p.x += (dx / Math.sqrt(dist2 + 1)) * f;
                p.y += (dy / Math.sqrt(dist2 + 1)) * f;
            }

            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;

            const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.002 + p.phase));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * tw, 0, Math.PI * 2);
            ctx.fillStyle = themeColor(0.35 * tw);
            ctx.fill();
        });

        requestAnimationFrame(drawParticles);
    }

    globalScope.addEventListener('pointermove', (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
    });

    function burstAt(x, y, color = null, count = 18) {
        const burst = Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.5 + 1;
            return {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: Math.random() * 2.2 + 0.8,
                life: 1,
                fixedColor: color
            };
        });

        (function drawBurst() {
            let alive = false;
            ctx.save();
            burst.forEach((p) => {
                if (p.life <= 0) return;
                alive = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.life -= 0.02;
                ctx.globalAlpha = Math.max(p.life, 0);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.fixedColor || themeColor(0.8);
                ctx.fill();
            });
            ctx.restore();
            if (alive) requestAnimationFrame(drawBurst);
        })();
    }

    function burstPalette() {
        const rect = paper.getBoundingClientRect();
        burstAt(rect.left + rect.width / 2, rect.top + 60, null, 22);
    }

    // === 启动 ===
    function boot() {
        const today = new Date();
        invoiceDate.textContent = today.toISOString().slice(0, 10);

        const restored = loadState();
        if (!restored) seedFreshInvoice();

        const activeTheme = document.body.dataset.theme;
        themeDots.forEach((d) => d.classList.toggle('active', d.dataset.theme === activeTheme));

        taxDisplay.textContent = `${parseFloat(taxSlider.value).toFixed(1)}%`;
        discountDisplay.textContent = `${Math.round(discountSlider.value)}%`;

        resizeCanvas();
        initParticles();
        requestAnimationFrame(drawParticles);

        globalScope.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });

        // 首次汇总入场后再滚动一次，制造开场仪式感
        setTimeout(() => recalc(), 350);
    }

    boot();
})(typeof window !== 'undefined' ? window : globalThis);
