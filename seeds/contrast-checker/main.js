/**
 * ============================================================
 * Contrast Checker · 对比度透视
 * 交互逻辑：WCAG 对比度计算 + 色彩调谐 + 高阶微交互
 * 维护者：EDEN
 * ============================================================
 */

(function () {
    'use strict';

    // ============================================================
    // === 1. 常量与预设数据 ===
    // ============================================================

    const THEMES = ['abyss', 'warm', 'emerald', 'rose'];

    /** 灵感调色板 — 经过精心搭配的高对比度配色对 */
    const PALETTES = [
        { name: 'Dracula',     fg: '#F8F8F2', bg: '#282A36', label: 'Aa' },
        { name: 'Solar Light', fg: '#586E75', bg: '#FDF6E3', label: 'Aa' },
        { name: 'Nord',        fg: '#ECEFF4', bg: '#2E3440', label: 'Aa' },
        { name: 'Tokyo Night', fg: '#C0CAF5', bg: '#1A1B26', label: 'Aa' },
        { name: 'Forest',      fg: '#E6E6E6', bg: '#1B3A2B', label: 'Aa' },
        { name: 'Sunset',      fg: '#2A1B0E', bg: '#FFB86B', label: 'Aa' },
        { name: 'Monokai',     fg: '#F8F8F2', bg: '#272822', label: 'Aa' },
        { name: 'Mint',        fg: '#0A2E28', bg: '#A8F0D0', label: 'Aa' },
        { name: 'Crimson',     fg: '#FFE8EC', bg: '#7A0C2E', label: 'Aa' },
        { name: 'Slate',       fg: '#F0F4F8', bg: '#334155', label: 'Aa' },
        { name: 'Honey',       fg: '#2A1A05', bg: '#FFD580', label: 'Aa' },
        { name: 'Violet',      fg: '#F0E6FF', bg: '#3A1A5C', label: 'Aa' }
    ];

    // ============================================================
    // === 2. DOM 元素引用 ===
    // ============================================================

    const dom = {
        body: document.body,
        previewStage: document.getElementById('preview-stage'),
        previewContent: document.getElementById('preview-content'),
        ratioValue: document.getElementById('ratio-value'),
        ratioMain: document.querySelector('.ratio-main'),
        suggestion: document.getElementById('suggestion'),
        suggestionIcon: document.querySelector('.suggestion-icon'),
        suggestionText: document.querySelector('.suggestion-text'),
        fgSwatch: document.getElementById('fg-swatch'),
        bgSwatch: document.getElementById('bg-swatch'),
        fgPicker: document.getElementById('fg-picker'),
        bgPicker: document.getElementById('bg-picker'),
        fgReadout: document.getElementById('fg-readout'),
        bgReadout: document.getElementById('bg-readout'),
        sizeInput: document.getElementById('size-input'),
        paletteGrid: document.getElementById('palette-grid'),
        historyGrid: document.getElementById('history-grid'),
        toast: document.getElementById('toast'),
        flowCanvas: document.getElementById('flow-canvas'),
        themeToggle: document.getElementById('theme-toggle-btn'),
        btnShuffle: document.getElementById('btn-shuffle'),
        btnSwap: document.getElementById('btn-swap'),
        btnClearHistory: document.getElementById('btn-clear-history'),
        badges: {
            aaNormal: document.getElementById('badge-aa-normal'),
            aaLarge: document.getElementById('badge-aa-large'),
            aaaNormal: document.getElementById('badge-aaa-normal'),
            aaaLarge: document.getElementById('badge-aaa-large')
        }
    };

    // ============================================================
    // === 3. 状态 ===
    // ============================================================

    const state = {
        fg: { r: 248, g: 248, b: 242, a: 1 },
        bg: { r: 40, g: 42, b: 54, a: 1 },
        size: 18,
        themeIndex: 0,
        history: [],
        toastTimer: null,
        historyTimer: null
    };

    // ============================================================
    // === 4. 颜色工具函数 ===
    // ============================================================

    /** 将 #RRGGBB 字符串解析为 {r,g,b} */
    function hexToRgb(hex) {
        const clean = hex.replace('#', '');
        const full = clean.length === 3
            ? clean.split('').map(c => c + c).join('')
            : clean;
        const num = parseInt(full, 16);
        return {
            r: (num >> 16) & 0xff,
            g: (num >> 8) & 0xff,
            b: num & 0xff
        };
    }

    /** 将 {r,g,b} 转为 #RRGGBB */
    function rgbToHex({ r, g, b }) {
        const h = (n) => Math.round(n).toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }

    /** 将 {r,g,b,a} 转为 rgba() 字符串 */
    function rgbaStr({ r, g, b, a }) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(2)})`;
    }

    /**
     * 将 sRGB 通道值 (0-255) 转换为相对亮度
     * WCAG 2.x 标准
     */
    function channelToLinear(c) {
        const cs = c / 255;
        return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
    }

    /** 计算 {r,g,b} 的相对亮度 (0-1) */
    function relativeLuminance({ r, g, b }) {
        return (
            0.2126 * channelToLinear(r) +
            0.7152 * channelToLinear(g) +
            0.0722 * channelToLinear(b)
        );
    }

    /**
     * 将带 alpha 的颜色合成到背景上，返回等价的不透明颜色
     * 用于透明前景/背景的对比度计算
     */
    function compositeOnOpaque(foreground, backdrop) {
        const a = foreground.a;
        return {
            r: foreground.r * a + backdrop.r * (1 - a),
            g: foreground.g * a + backdrop.g * (1 - a),
            b: foreground.b * a + backdrop.b * (1 - a),
            a: 1
        };
    }

    /**
     * 计算 WCAG 对比度比 (1.0 ~ 21.0)
     * @param {object} fg - 前景色 {r,g,b,a}
     * @param {object} bg - 背景色 {r,g,b,a}
     * @returns {number}
     */
    function computeContrast(fg, bg) {
        // 若颜色带透明度，先合成到一个等价不透明色上
        const opaqueFg = fg.a < 1 ? compositeOnOpaque(fg, bg) : fg;
        const opaqueBg = bg.a < 1 ? compositeOnOpaque(bg, { r: 255, g: 255, b: 255, a: 1 }) : bg;

        const l1 = relativeLuminance(opaqueFg);
        const l2 = relativeLuminance(opaqueBg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    // ============================================================
    // === 5. 渲染逻辑 ===
    // ============================================================

    /** 同步滑块值显示 */
    function syncSliderVals(channel) {
        const c = state[channel];
        document.querySelector('[data-val="fg-r"]').textContent = Math.round(state.fg.r);
        document.querySelector('[data-val="fg-g"]').textContent = Math.round(state.fg.g);
        document.querySelector('[data-val="fg-b"]').textContent = Math.round(state.fg.b);
        document.querySelector('[data-val="fg-a"]').textContent = Math.round(state.fg.a * 100);
        document.querySelector('[data-val="bg-r"]').textContent = Math.round(state.bg.r);
        document.querySelector('[data-val="bg-g"]').textContent = Math.round(state.bg.g);
        document.querySelector('[data-val="bg-b"]').textContent = Math.round(state.bg.b);
        document.querySelector('[data-val="bg-a"]').textContent = Math.round(state.bg.a * 100);
    }

    /** 同步滑块位置 */
    function syncSliderPositions() {
        document.querySelector('[data-channel="fg"][data-comp="r"]').value = Math.round(state.fg.r);
        document.querySelector('[data-channel="fg"][data-comp="g"]').value = Math.round(state.fg.g);
        document.querySelector('[data-channel="fg"][data-comp="b"]').value = Math.round(state.fg.b);
        document.querySelector('[data-channel="fg"][data-comp="a"]').value = Math.round(state.fg.a * 100);
        document.querySelector('[data-channel="bg"][data-comp="r"]').value = Math.round(state.bg.r);
        document.querySelector('[data-channel="bg"][data-comp="g"]').value = Math.round(state.bg.g);
        document.querySelector('[data-channel="bg"][data-comp="b"]').value = Math.round(state.bg.b);
        document.querySelector('[data-channel="bg"][data-comp="a"]').value = Math.round(state.bg.a * 100);
    }

    /** 同步颜色选择器 */
    function syncPickers() {
        dom.fgPicker.value = rgbToHex(state.fg);
        dom.bgPicker.value = rgbToHex(state.bg);
    }

    /** 更新色块与读数 */
    function syncSwatchesAndReadouts() {
        const fgHex = rgbToHex(state.fg).toUpperCase();
        const bgHex = rgbToHex(state.bg).toUpperCase();
        dom.fgSwatch.style.background = rgbaStr(state.fg);
        dom.bgSwatch.style.background = rgbaStr(state.bg);
        dom.fgReadout.querySelector('.readout-hex').textContent = fgHex;
        dom.fgReadout.querySelector('.readout-rgb').textContent =
            `rgb(${Math.round(state.fg.r)}, ${Math.round(state.fg.g)}, ${Math.round(state.fg.b)})`;
        dom.bgReadout.querySelector('.readout-hex').textContent = bgHex;
        dom.bgReadout.querySelector('.readout-rgb').textContent =
            `rgb(${Math.round(state.bg.r)}, ${Math.round(state.bg.g)}, ${Math.round(state.bg.b)})`;
    }

    /** 更新预览舞台 */
    function syncPreview() {
        dom.previewStage.style.background = rgbaStr(state.bg);
        dom.previewContent.style.color = rgbaStr(state.fg);
        dom.previewContent.style.fontSize = `${state.size}px`;
    }

    /** 更新对比度数值与徽章（核心） */
    function syncRatioAndBadges() {
        const ratio = computeContrast(state.fg, state.bg);
        const display = ratio >= 10 ? ratio.toFixed(2) : ratio.toFixed(2);

        // 数值更新 + bump 动画
        dom.ratioValue.textContent = display;
        dom.ratioMain.classList.remove('bump');
        // 触发重排以重启动画
        void dom.ratioMain.offsetWidth;
        dom.ratioMain.classList.add('bump');

        // WCAG 判定
        const isLarge = state.size >= 24 || state.size >= 18.66;
        const aaNormal = ratio >= 4.5;
        const aaLarge = ratio >= 3.0;
        const aaaNormal = ratio >= 7.0;
        const aaaLarge = ratio >= 4.5;

        updateBadge(dom.badges.aaNormal, aaNormal);
        updateBadge(dom.badges.aaLarge, aaLarge);
        updateBadge(dom.badges.aaaNormal, aaaNormal);
        updateBadge(dom.badges.aaaLarge, aaaLarge);

        // 建议文案
        updateSuggestion(ratio, { aaNormal, aaLarge, aaaNormal, aaaLarge });
    }

    /** 更新单个 WCAG 徽章状态 */
    function updateBadge(badge, passed) {
        badge.classList.toggle('pass', passed);
        badge.classList.toggle('fail', !passed);
        badge.querySelector('.badge-status').textContent = passed ? '✓' : '✕';
    }

    /** 根据对比度等级给出建议 */
    function updateSuggestion(ratio, levels) {
        let tone, icon, text;

        if (levels.aaaNormal) {
            tone = 'good';
            icon = '✓';
            text = '配色方案满足所有 WCAG 级别，无障碍体验卓越。';
        } else if (levels.aaNormal) {
            tone = 'good';
            icon = '✓';
            text = '满足 AA 标准。常规与超大文字均可读，建议提升至 AAA 以臻完美。';
        } else if (levels.aaLarge) {
            tone = 'warn';
            icon = '!';
            text = '仅满足 AA 大号文字标准。小号文字对比度不足，请加深前景或提亮背景。';
        } else {
            tone = 'bad';
            icon = '✕';
            text = '对比度不足，多数用户阅读困难。建议前景色与背景色的明度差至少 60%。';
        }

        dom.suggestion.classList.remove('good', 'warn', 'bad');
        dom.suggestion.classList.add(tone);
        dom.suggestionIcon.textContent = icon;
        dom.suggestionText.textContent = text;
    }

    /** 主刷新入口 */
    function render() {
        syncSliderVals();
        syncSwatchesAndReadouts();
        syncPreview();
        syncRatioAndBadges();
        scheduleHistorySave();
    }

    // ============================================================
    // === 6. 事件绑定 ===
    // ============================================================

    /** 绑定 RGB / Alpha 滑块 */
    function bindSliders() {
        document.querySelectorAll('.channel-slider').forEach((slider) => {
            slider.addEventListener('input', (e) => {
                const channel = e.target.dataset.channel;
                const comp = e.target.dataset.comp;
                const val = parseFloat(e.target.value);

                if (comp === 'a') {
                    state[channel].a = val / 100;
                } else {
                    state[channel][comp] = val;
                }
                render();
            });
        });
    }

    /** 绑定原生颜色选择器 */
    function bindPickers() {
        dom.fgPicker.addEventListener('input', (e) => {
            state.fg = { ...hexToRgb(e.target.value), a: state.fg.a };
            syncSliderPositions();
            render();
        });
        dom.bgPicker.addEventListener('input', (e) => {
            state.bg = { ...hexToRgb(e.target.value), a: state.bg.a };
            syncSliderPositions();
            render();
        });
    }

    /** 绑定字号输入与预设 */
    function bindSizeControls() {
        dom.sizeInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val)) return;
            val = Math.max(8, Math.min(96, val));
            state.size = val;
            syncSizePresets();
            syncPreview();
            syncRatioAndBadges();
        });

        document.querySelectorAll('.size-preset').forEach((btn) => {
            btn.addEventListener('click', () => {
                const size = parseInt(btn.dataset.size, 10);
                state.size = size;
                dom.sizeInput.value = size;
                syncSizePresets();
                syncPreview();
                syncRatioAndBadges();
            });
        });
    }

    /** 同步字号预设激活态 */
    function syncSizePresets() {
        document.querySelectorAll('.size-preset').forEach((btn) => {
            btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === state.size);
        });
    }

    /** 绑定头部按钮 */
    function bindHeaderActions() {
        dom.themeToggle.addEventListener('click', cycleTheme);

        dom.btnSwap.addEventListener('click', () => {
            const tmp = { ...state.fg };
            state.fg = { ...state.bg };
            state.bg = tmp;
            syncSliderPositions();
            syncPickers();
            render();
            showToast('已交换前景与背景色');
        });

        dom.btnShuffle.addEventListener('click', shuffleRandom);
    }

    /** 循环切换主题 */
    function cycleTheme() {
        state.themeIndex = (state.themeIndex + 1) % THEMES.length;
        dom.body.setAttribute('data-theme', THEMES[state.themeIndex]);
        showToast(`氛围配色：${THEMES[state.themeIndex].toUpperCase()}`);
    }

    /** 随机生成高对比度配色 */
    function shuffleRandom() {
        // 随机一个深色 + 一个浅色，确保对比度
        const dark = {
            r: randInt(0, 80),
            g: randInt(0, 80),
            b: randInt(0, 80),
            a: 1
        };
        const light = {
            r: randInt(180, 255),
            g: randInt(180, 255),
            b: randInt(180, 255),
            a: 1
        };

        // 随机决定谁是前景
        if (Math.random() > 0.5) {
            state.fg = light;
            state.bg = dark;
        } else {
            state.fg = dark;
            state.bg = light;
        }

        // 微调色相让配色更生动
        tintRandom(state.fg);
        tintRandom(state.bg);

        syncSliderPositions();
        syncPickers();
        render();
        showToast('已生成随机配色');
    }

    /** 给颜色添加随机色相偏移（限制范围内） */
    function tintRandom(c) {
        const channel = ['r', 'g', 'b'][randInt(0, 2)];
        const delta = randInt(-30, 60);
        c[channel] = Math.max(0, Math.min(255, c[channel] + delta));
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ============================================================
    // === 7. 调色板渲染 ===
    // ============================================================

    function renderPalette() {
        dom.paletteGrid.innerHTML = '';
        PALETTES.forEach((p) => {
            const ratio = computeContrast(
                { ...hexToRgb(p.fg), a: 1 },
                { ...hexToRgb(p.bg), a: 1 }
            );
            const card = document.createElement('div');
            card.className = 'palette-card';
            card.innerHTML = `
                <div class="palette-preview" style="background:${p.bg};color:${p.fg}">
                    ${p.label}
                </div>
                <div class="palette-meta">
                    <span>${p.name}</span>
                    <span class="palette-ratio">${ratio.toFixed(1)}:1</span>
                </div>
            `;
            card.addEventListener('click', () => {
                state.fg = { ...hexToRgb(p.fg), a: 1 };
                state.bg = { ...hexToRgb(p.bg), a: 1 };
                syncSliderPositions();
                syncPickers();
                render();
                showToast(`已应用配色：${p.name}`);
            });
            dom.paletteGrid.appendChild(card);
        });
    }

    // ============================================================
    // === 8. 历史记录 ===
    // ============================================================

    /** 防抖保存历史 */
    function scheduleHistorySave() {
        clearTimeout(state.historyTimer);
        state.historyTimer = setTimeout(saveToHistory, 800);
    }

    function saveToHistory() {
        const fgHex = rgbToHex(state.fg);
        const bgHex = rgbToHex(state.bg);
        const ratio = computeContrast(state.fg, state.bg);

        // 避免重复
        const last = state.history[0];
        if (last && last.fg === fgHex && last.bg === bgHex) return;

        state.history.unshift({
            fg: fgHex,
            bg: bgHex,
            ratio: ratio,
            time: Date.now()
        });

        if (state.history.length > 12) state.history.length = 12;
        renderHistory();
    }

    function renderHistory() {
        if (state.history.length === 0) {
            dom.historyGrid.innerHTML =
                '<div class="history-empty">尚未记录任何配色 — 调整颜色后会自动留痕。</div>';
            return;
        }

        dom.historyGrid.innerHTML = '';
        state.history.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.style.animationDelay = `${idx * 0.04}s`;
            card.innerHTML = `
                <div class="history-card-preview" style="background:${item.bg};color:${item.fg}">
                    Aa
                </div>
                <div class="history-card-meta">
                    <span>${item.ratio.toFixed(1)}:1</span>
                    <span>${formatTime(item.time)}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                state.fg = { ...hexToRgb(item.fg), a: 1 };
                state.bg = { ...hexToRgb(item.bg), a: 1 };
                syncSliderPositions();
                syncPickers();
                render();
                showToast('已恢复历史配色');
            });
            dom.historyGrid.appendChild(card);
        });
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    function bindHistory() {
        dom.btnClearHistory.addEventListener('click', () => {
            if (state.history.length === 0) return;
            state.history = [];
            renderHistory();
            showToast('历史记录已清空');
        });
    }

    // ============================================================
    // === 9. Toast 提示 ===
    // ============================================================

    function showToast(message) {
        dom.toast.textContent = message;
        dom.toast.classList.add('show');
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => {
            dom.toast.classList.remove('show');
        }, 2200);
    }

    // ============================================================
    // === 10. 粒子流场背景 ===
    // ============================================================

    function initFlowField() {
        const canvas = dom.flowCanvas;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let w, h, dpr;
        let mouseX = -9999, mouseY = -9999;

        const PARTICLE_COUNT = 60;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.width = window.innerWidth * dpr;
            h = canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
        }

        function spawn() {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.3 * dpr,
                    vy: (Math.random() - 0.5) * 0.3 * dpr,
                    r: (Math.random() * 1.5 + 0.5) * dpr,
                    life: Math.random()
                });
            }
        }

        function getAccentRgb() {
            const accent = getComputedStyle(document.body)
                .getPropertyValue('--color-accent').trim();
            // 简易解析 hex 或忽略失败
            try {
                return hexToRgb(accent.startsWith('#') ? accent : '#00d4ff');
            } catch {
                return { r: 0, g: 212, b: 255 };
            }
        }

        function tick() {
            ctx.clearRect(0, 0, w, h);
            const accent = getAccentRgb();

            particles.forEach((p) => {
                // 鼠标轻微吸引
                const dx = mouseX * dpr - p.x;
                const dy = mouseY * dpr - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 * dpr && dist > 1) {
                    const force = (1 - dist / (200 * dpr)) * 0.04;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                // 阻尼
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.x += p.vx;
                p.y += p.vy;

                // 边界环绕
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                p.life += 0.005;
                const alpha = (Math.sin(p.life) * 0.5 + 0.5) * 0.6;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`;
                ctx.fill();
            });

            // 连接邻近粒子
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const maxD = 120 * dpr;
                    if (d < maxD) {
                        const a = (1 - d / maxD) * 0.12;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${a})`;
                        ctx.lineWidth = 0.5 * dpr;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(tick);
        }

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        window.addEventListener('resize', () => {
            resize();
            spawn();
        });

        resize();
        spawn();
        tick();
    }

    // ============================================================
    // === 11. 键盘快捷键 ===
    // ============================================================

    function bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            // 忽略输入框内的按键
            if (e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'color') return;

            if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                dom.btnSwap.click();
            } else if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                dom.btnShuffle.click();
            } else if (e.key === 't') {
                cycleTheme();
            }
        });
    }

    // ============================================================
    // === 12. 初始化 ===
    // ============================================================

    function init() {
        bindSliders();
        bindPickers();
        bindSizeControls();
        bindHeaderActions();
        bindHistory();
        bindKeyboard();
        renderPalette();
        render();
        initFlowField();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
