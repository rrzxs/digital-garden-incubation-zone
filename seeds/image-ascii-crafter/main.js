/**
 * Image ASCII Crafter — 影像字符雕塑台
 * 将图片实时锻造成 ASCII 字符矩阵：上传 / 拖拽 / 粘贴 / 程序化坯料，
 * 多字符集梯度 × 单色/原彩/氛围色彩模式 × 扫描光束 × 三重导出。
 * Zero-build Vanilla JS。
 */
(() => {
    'use strict';

    // === DOM Elements ======================================================

    const $ = (id) => document.getElementById(id);
    const body = document.body;
    const asciiCanvas = $('ascii-canvas');
    const ctx = asciiCanvas.getContext('2d');
    const canvasWrap = $('canvas-wrap');
    const uploadZone = $('upload-zone');
    const fileInput = $('file-input');
    const scanBeam = $('scan-beam');
    const statusText = $('status-text');
    const stageMeta = $('stage-meta');
    const toast = $('toast');
    const customCharsetInput = $('custom-charset');
    const teleGrid = $('tele-grid');
    const teleChars = $('tele-chars');
    const teleRender = $('tele-render');
    const teleBar = $('tele-bar');

    // === State ==============================================================

    const CHARSETS = {
        standard: '@%#*+=-:. ',
        blocks: '█▓▒░ ',
        minimal: ' .:-=+*#%@',
        binary: '10 ',
        dots: '·∙•○◎●'
    };

    const state = {
        sourceImage: null,          // Image 对象
        charsetKey: 'standard',
        customGradient: '@%#*+=-:. ',
        inverted: false,
        mode: 'mono',               // mono | source | accent
        glow: true,
        columns: 110,
        contrast: 1.0,
        brightness: 1.0,
        fontSize: 8,
        accentColor: '#7cf7d4',
        asciiText: '',
        renderTimer: null
    };

    // === Theme ==============================================================

    function initTheme() {
        const switcher = $('theme-switcher');
        switcher.addEventListener('click', (e) => {
            const btn = e.target.closest('.theme-btn');
            if (!btn) return;
            switcher.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            body.dataset.theme = btn.dataset.theme;
            state.accentColor = getComputedStyle(body).getPropertyValue('--accent').trim() || '#7cf7d4';
            scheduleRender();
        });
        state.accentColor = getComputedStyle(body).getPropertyValue('--accent').trim() || '#7cf7d4';
    }

    // === Background Particle Field（环境粒子流场）============================

    function initBackgroundField() {
        const bgCanvas = $('bg-field');
        const bgCtx = bgCanvas.getContext('2d');
        let particles = [];
        let w = 0, h = 0;
        let raf = 0;

        const resize = () => {
            w = bgCanvas.width = bgCanvas.offsetWidth;
            h = bgCanvas.height = bgCanvas.offsetHeight;
            const count = Math.min(70, Math.floor((w * h) / 26000));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                r: Math.random() * 1.4 + 0.4,
                a: Math.random() * 0.35 + 0.08
            }));
        };

        const tick = () => {
            bgCtx.clearRect(0, 0, w, h);
            const accent = state.accentColor;
            for (const p of particles) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
                bgCtx.beginPath();
                bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                bgCtx.fillStyle = accent;
                bgCtx.globalAlpha = p.a;
                bgCtx.fill();
            }
            bgCtx.globalAlpha = 1;
            raf = requestAnimationFrame(tick);
        };

        window.addEventListener('resize', resize);
        resize();
        tick();
    }

    // === Image Loading ======================================================

    function loadImageFromFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('⚠ 仅支持图片文件');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => loadImageFromSrc(e.target.result);
        reader.readAsDataURL(file);
    }

    function loadImageFromSrc(src) {
        const img = new Image();
        img.onload = () => {
            state.sourceImage = img;
            uploadZone.classList.add('hidden-zone');
            asciiCanvas.hidden = false;
            setStatus('CRAFTING');
            renderASCII();
        };
        img.onerror = () => showToast('⚠ 图片解码失败');
        img.src = src;
    }

    // 程序化坯料：噪声 + 几何合成图像，无需外部资源
    function generateSampleImage() {
        const size = 480;
        const off = document.createElement('canvas');
        off.width = off.height = size;
        const octx = off.getContext('2d');

        const kind = Math.floor(Math.random() * 4);
        const img = octx.createImageData(size, size);
        const d = img.data;
        const seed = Math.random() * 1000;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4;
                let v;
                if (kind === 0) {            // 等离子
                    v = Math.sin(x * 0.03 + seed) + Math.sin(y * 0.04) + Math.sin((x + y) * 0.025) + Math.sin(Math.hypot(x - 240, y - 240) * 0.05);
                    v = (v + 4) / 8;
                } else if (kind === 1) {     // 放射环
                    v = (Math.sin(Math.hypot(x - 240, y - 240) * 0.055 + seed) + 1) / 2;
                } else if (kind === 2) {     // 干涉纹
                    v = (Math.sin(Math.hypot(x - 160, y - 160) * 0.045) + Math.sin(Math.hypot(x - 320, y - 320) * 0.045 + seed) + 2) / 4;
                } else {                     // 波纹棋盘
                    v = (Math.sin(x * 0.02 + Math.cos(y * 0.018 + seed) * 3) + 1) / 2;
                    v = v * 0.7 + ((Math.floor(x / 40) + Math.floor(y / 40)) % 2) * 0.15;
                }
                const c = Math.floor(v * 255);
                d[i] = c; d[i + 1] = c; d[i + 2] = c; d[i + 3] = 255;
            }
        }
        octx.putImageData(img, 0, 0);
        loadImageFromSrc(off.toDataURL('image/png'));
    }

    // === ASCII Engine =======================================================

    function getGradient() {
        if (state.charsetKey === 'custom') {
            const raw = customCharsetInput.value.trim();
            if (raw.length >= 2) return raw;
        }
        return CHARSETS[state.charsetKey] || CHARSETS.standard;
    }

    function scheduleRender() {
        asciiCanvas.classList.add('re-render');
        clearTimeout(state.renderTimer);
        state.renderTimer = setTimeout(() => {
            asciiCanvas.classList.remove('re-render');
            renderASCII();
        }, 90);
    }

    function renderASCII() {
        const img = state.sourceImage;
        if (!img) return;

        const t0 = performance.now();

        const gradient = getGradient();
        const gradLen = gradient.length;
        const cols = state.columns;
        // 等宽字符高宽比约 2:1，采样单元按此补偿
        const rows = Math.max(1, Math.round(cols * (img.height / img.width) * 0.5));

        // 采样：将图像缩小到 cols × rows 网格
        const sampler = document.createElement('canvas');
        sampler.width = cols;
        sampler.height = rows;
        const sctx = sampler.getContext('2d');
        sctx.drawImage(img, 0, 0, cols, rows);
        const data = sctx.getImageData(0, 0, cols, rows).data;

        const cell = state.fontSize;
        const stepX = cell;
        const stepY = cell * 2;
        asciiCanvas.width = cols * stepX;
        asciiCanvas.height = rows * stepY;

        ctx.clearRect(0, 0, asciiCanvas.width, asciiCanvas.height);
        ctx.font = `${cell * 1.05}px 'Share Tech Mono', monospace`;
        ctx.textBaseline = 'top';
        if (state.glow) {
            ctx.shadowBlur = Math.max(2, cell * 0.6);
        } else {
            ctx.shadowBlur = 0;
        }

        const applyContrast = (v) => {
            let n = v * state.brightness;
            n = (n - 128) * state.contrast + 128;
            return Math.max(0, Math.min(255, n)) / 255;
        };

        const accent = state.accentColor;
        let textLines = [];

        for (let r = 0; r < rows; r++) {
            let line = '';
            for (let c = 0; c < cols; c++) {
                const idx = (r * cols + c) * 4;
                const lum = applyContrast((data[idx] * 0.2126 + data[idx + 1] * 0.7152 + data[idx + 2] * 0.0722) / 255);
                const norm = state.inverted ? 1 - lum : lum;
                const gi = Math.min(gradLen - 1, Math.floor(norm * gradLen));
                const ch = gradient[gi];
                line += ch;
                if (ch === ' ') continue;

                if (state.mode === 'source') {
                    ctx.fillStyle = `rgb(${data[idx]},${data[idx + 1]},${data[idx + 2]})`;
                    ctx.shadowColor = 'transparent';
                } else if (state.mode === 'accent') {
                    ctx.fillStyle = accent;
                    ctx.shadowColor = accent;
                } else {
                    const gray = Math.floor(90 + norm * 165);
                    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
                    ctx.shadowColor = 'transparent';
                }
                ctx.fillText(ch, c * stepX, r * stepY);
            }
            textLines.push(line.replace(/\s+$/, ''));
        }
        state.asciiText = textLines.join('\n');

        // 遥测
        const elapsed = performance.now() - t0;
        const charCount = state.asciiText.replace(/\s/g, '').length;
        teleGrid.textContent = `${cols} × ${rows}`;
        teleChars.textContent = charCount.toLocaleString();
        teleRender.textContent = `${elapsed.toFixed(1)} ms`;
        teleBar.style.width = Math.min(100, (charCount / 14000) * 100) + '%';
        stageMeta.textContent = `${cols} × ${rows} · ${elapsed.toFixed(0)}ms`;

        // 非线性揭示动效
        asciiCanvas.classList.remove('revealed');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => asciiCanvas.classList.add('revealed'));
        });
        setStatus('READY');
    }

    // 扫描光束仪式：完整重转换（换图/反转/洗牌）时播放
    function renderWithScan() {
        scanBeam.classList.add('scanning');
        setStatus('SCANNING');
        renderASCII();
        setTimeout(() => scanBeam.classList.remove('scanning'), 950);
    }

    // === Export =============================================================

    function copyText() {
        if (!state.asciiText) { showToast('⚠ 还没有字符矩阵'); return; }
        navigator.clipboard.writeText(state.asciiText)
            .then(() => showToast('✓ 已复制到剪贴板'))
            .catch(() => {
                const ta = document.createElement('textarea');
                ta.value = state.asciiText;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showToast('✓ 已复制到剪贴板');
            });
    }

    function downloadTXT() {
        if (!state.asciiText) { showToast('⚠ 还没有字符矩阵'); return; }
        const blob = new Blob([state.asciiText], { type: 'text/plain;charset=utf-8' });
        triggerDownload(URL.createObjectURL(blob), 'ascii-crafter.txt');
        showToast('✓ .TXT 已导出');
    }

    function downloadPNG() {
        if (!state.sourceImage) { showToast('⚠ 还没有字符矩阵'); return; }
        const padded = document.createElement('canvas');
        padded.width = asciiCanvas.width + 32;
        padded.height = asciiCanvas.height + 32;
        const pctx = padded.getContext('2d');
        pctx.fillStyle = '#07080d';
        pctx.fillRect(0, 0, padded.width, padded.height);
        pctx.drawImage(asciiCanvas, 16, 16);
        triggerDownload(padded.toDataURL('image/png'), 'ascii-crafter.png');
        showToast('✓ .PNG 已导出');
    }

    function triggerDownload(href, name) {
        const a = document.createElement('a');
        a.href = href;
        a.download = name;
        a.click();
    }

    // === Micro-interactions =================================================

    let toastTimer = null;
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    }

    function setStatus(text) {
        statusText.textContent = text;
    }

    // 磁性按钮：光标靠近时轻微吸附
    function initMagneticButtons() {
        document.querySelectorAll('.magnetic').forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const dx = e.clientX - (rect.left + rect.width / 2);
                const dy = e.clientY - (rect.top + rect.height / 2);
                btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    // === Control Bindings ===================================================

    function bindControls() {
        // 上传
        uploadZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => loadImageFromFile(fileInput.files[0]));
        ['dragover', 'dragenter'].forEach((ev) => {
            canvasWrap.addEventListener(ev, (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach((ev) => {
            canvasWrap.addEventListener(ev, (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
            });
        });
        canvasWrap.addEventListener('drop', (e) => {
            loadImageFromFile(e.dataTransfer.files[0]);
        });
        window.addEventListener('paste', (e) => {
            const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
            if (item) loadImageFromFile(item.getAsFile());
        });

        // 字符集
        $('charset-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.charset-btn');
            if (!btn) return;
            document.querySelectorAll('.charset-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.charsetKey = btn.dataset.charset;
            const isCustom = state.charsetKey === 'custom';
            customCharsetInput.hidden = !isCustom;
            if (isCustom && customCharsetInput.value.trim().length < 2) {
                customCharsetInput.value = CHARSETS.standard;
            }
            renderWithScan();
        });
        customCharsetInput.addEventListener('input', scheduleRender);

        // 滑杆
        bindSlider('ctl-columns', 'val-columns', (v) => { state.columns = v; return v; });
        bindSlider('ctl-contrast', 'val-contrast', (v) => { state.contrast = v / 100; return v.toFixed(2); });
        bindSlider('ctl-brightness', 'val-brightness', (v) => { state.brightness = v / 100; return v.toFixed(2); });
        bindSlider('ctl-fontsize', 'val-fontsize', (v) => { state.fontSize = v; return v + 'px'; });

        // 色彩模式
        document.querySelectorAll('.mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
                renderWithScan();
            });
        });

        // 辉光开关
        $('chk-glow').addEventListener('change', (e) => {
            state.glow = e.target.checked;
            scheduleRender();
        });

        // 快捷操作
        $('btn-sample').addEventListener('click', generateSampleImage);
        $('btn-invert').addEventListener('click', () => {
            state.inverted = !state.inverted;
            renderWithScan();
        });
        $('btn-shuffle').addEventListener('click', () => {
            const g = getGradient();
            const arr = g.split('');
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            customCharsetInput.hidden = false;
            customCharsetInput.value = arr.join('');
            document.querySelectorAll('.charset-btn').forEach((b) => b.classList.remove('active'));
            const customBtn = document.querySelector('.charset-btn[data-charset="custom"]');
            customBtn.classList.add('active');
            state.charsetKey = 'custom';
            renderWithScan();
        });

        // 导出
        $('btn-copy').addEventListener('click', copyText);
        $('btn-txt').addEventListener('click', downloadTXT);
        $('btn-png').addEventListener('click', downloadPNG);
    }

    function bindSlider(inputId, valId, apply) {
        const input = $(inputId);
        const valEl = $(valId);
        const update = () => {
            const v = parseInt(input.value, 10);
            const display = apply(v);
            valEl.textContent = display;
            const pct = ((v - input.min) / (input.max - input.min)) * 100;
            input.style.setProperty('--fill', pct + '%');
            scheduleRender();
        };
        input.addEventListener('input', update);
        // 初始化填充
        const v = parseInt(input.value, 10);
        input.style.setProperty('--fill', ((v - input.min) / (input.max - input.min)) * 100 + '%');
    }

    // === Boot ===============================================================

    function boot() {
        initTheme();
        initBackgroundField();
        initMagneticButtons();
        bindControls();
        setStatus('STANDBY');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
