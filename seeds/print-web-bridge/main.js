/**
 * Print Web Bridge · 印物桥
 * 沉浸式屏幕与纸面桥接工作台交互逻辑
 *
 * 结构分区:
 *   1. DOM Elements
 *   2. State · 全局状态
 *   3. Simplex Noise · 流场噪声
 *   4. Particle Field · 粒子流场
 *   5. Cursor Glow · 光标跟随
 *   6. Paper Renderer · 纸面渲染
 *   7. Density Calc · 纸面负载计算
 *   8. CSS Export · 样式表生成
 *   9. Controls · 控件绑定
 *  10. Bridge Sparks · 桥接粒子
 *  11. FPS Meter · 帧率计
 *  12. Init · 入口
 */

// === 1. DOM Elements ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const dom = {
    canvas: $('#particle-canvas'),
    cursorGlow: $('#cursor-glow'),
    body: document.body,
    brandMark: $('#brand-mark'),
    // 控件
    paletteSwitch: $('#palette-switch'),
    marginSlider: $('#margin-slider'),
    marginVal: $('#margin-val'),
    fontsizeSlider: $('#fontsize-slider'),
    fontsizeVal: $('#fontsize-val'),
    lineheightSlider: $('#lineheight-slider'),
    lineheightVal: $('#lineheight-val'),
    contrastSlider: $('#contrast-slider'),
    contrastVal: $('#contrast-val'),
    orientationToggle: $('#orientation-toggle'),
    inkToggle: $('#ink-toggle'),
    switches: $$('.switch'),
    formatChips: $$('.format-chip'),
    typeChips: $$('.type-chip'),
    resetBtn: $('#btn-reset'),
    // 视口
    viewTabs: $('#view-tabs'),
    viewportFrame: $('#viewport-frame'),
    paperStack: $('#paper-stack'),
    screenDoc: $('#screen-doc'),
    docDate: $('#doc-date'),
    // 元信息
    densityFill: $('#density-fill'),
    densityValue: $('#density-value'),
    metaDensity: $('#meta-density'),
    metaPages: $('#meta-pages'),
    // 遥测
    teleView: $('#tele-view'),
    teleSize: $('#tele-size'),
    teleMargin: $('#tele-margin'),
    teleFontsize: $('#tele-fontsize'),
    teleInk: $('#tele-ink'),
    teleFps: $('#tele-fps'),
    // 抽屉
    exportDrawer: $('#export-drawer'),
    drawerOverlay: $('#drawer-overlay'),
    drawerClose: $('#drawer-close'),
    codeBlock: $('#code-block'),
    btnExportCss: $('#btn-export-css'),
    btnCopyCss: $('#btn-copy-css'),
    btnDownloadCss: $('#btn-download-css'),
    btnPrint: $('#btn-print'),
    // 桥接
    connectorParticles: $('#connector-particles'),
    dockPulse: $('#dock-pulse'),
    toast: $('#toast'),
};

const ctx = dom.canvas.getContext('2d');

// === 2. State ===
const SIZE_MAP = {
    A4: { w: 210, h: 297, label: 'A4' },
    A5: { w: 148, h: 210, label: 'A5' },
    Letter: { w: 216, h: 279, label: 'Letter' },
    Legal: { w: 216, h: 356, label: 'Legal' },
};
const FONT_MAP = {
    sans: "'Inter', sans-serif",
    serif: "'Playfair Display', serif",
    mono: "'Share Tech Mono', monospace",
};
const VIEW_LABEL = { split: '桥接', screen: '屏幕', print: '纸面' };

const state = {
    palette: 'inkstone',
    size: 'A4',
    orientation: 'portrait',
    margin: 18,
    font: 'sans',
    fontsize: 11,
    lineheight: 1.6,
    ink: 'rich',
    contrast: 92,
    bleed: false,
    header: true,
    columns: false,
    watermark: false,
    view: 'split',
};

// 鼠标状态（用于粒子流场扰动）
const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, lastX: 0, lastY: 0, active: false };

// === 3. Simplex Noise (精简实现) ===
const Noise = (function createNoise() {
    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // 打乱
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    const grad3 = [
        [1,1],[-1,1],[1,-1],[-1,-1],
        [1,0],[-1,0],[0,1],[0,-1]
    ];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);

    function noise2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = fade(x);
        const v = fade(y);
        const A = perm[X] + Y;
        const B = perm[X + 1] + Y;
        const g = (h, xn, yn) => {
            const grad = grad3[perm[h] % 8];
            return grad[0] * xn + grad[1] * yn;
        };
        return lerp(
            lerp(g(A, x, y), g(B, x - 1, y), u),
            lerp(g(A + 1, x, y - 1), g(B + 1, x - 1, y - 1), u),
            v
        );
    }
    return { noise2D };
})();

// === 4. Particle Field ===
const PARTICLE_COUNT = 80;
let particles = [];
let canvasW = 0, canvasH = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let noiseZ = 0;
let lastFrameTime = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;

function resizeCanvas() {
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    dom.canvas.width = canvasW * dpr;
    dom.canvas.height = canvasH * dpr;
    dom.canvas.style.width = canvasW + 'px';
    dom.canvas.style.height = canvasH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * canvasW,
            y: Math.random() * canvasH,
            vx: 0,
            vy: 0,
            life: Math.random() * 200 + 100,
            maxLife: 300,
            size: Math.random() * 1.5 + 0.5,
        });
    }
}

function getAccentRGB() {
    const styles = getComputedStyle(document.body);
    const c = styles.getPropertyValue('--accent').trim();
    return hexToRgb(c) || { r: 201, g: 169, b: 110 };
}

function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function updateParticles(dt) {
    const accent = getAccentRGB();
    ctx.clearRect(0, 0, canvasW, canvasH);
    noiseZ += 0.0015;

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const angle = Noise.noise2D(p.x * 0.0015, p.y * 0.0015 + noiseZ * 40) * Math.PI * 2;
        const force = 0.15;
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;

        // 鼠标排斥
        if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 22500) {
                const dist = Math.sqrt(dist2) || 1;
                const push = (1 - dist / 150) * 1.2;
                p.vx += (dx / dist) * push;
                p.vy += (dy / dist) * push;
            }
        }

        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        // 重生
        if (p.life <= 0 || p.x < -20 || p.x > canvasW + 20 || p.y < -20 || p.y > canvasH + 20) {
            p.x = Math.random() * canvasW;
            p.y = Math.random() * canvasH;
            p.vx = 0;
            p.vy = 0;
            p.life = Math.random() * 200 + 100;
        }

        const alpha = Math.min(p.life / p.maxLife, 1 - p.life / p.maxLife) * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`;
        ctx.fill();
    }
}

// === 5. Cursor Glow ===
function bindCursor() {
    window.addEventListener('mousemove', (e) => {
        mouse.vx = e.clientX - mouse.lastX;
        mouse.vy = e.clientY - mouse.lastY;
        mouse.lastX = e.clientX;
        mouse.lastY = e.clientY;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
        dom.cursorGlow.style.left = e.clientX + 'px';
        dom.cursorGlow.style.top = e.clientY + 'px';
    });
    window.addEventListener('mouseleave', () => { mouse.active = false; });
}

// === 6. Paper Renderer ===
function renderPaper() {
    const size = SIZE_MAP[state.size];
    const isPortrait = state.orientation === 'portrait';
    const pW = isPortrait ? size.w : size.h;
    const pH = isPortrait ? size.h : size.w;
    // 缩放到视口合适尺寸
    const maxW = 320;
    const scale = Math.min(maxW / pW, 1);
    const cssW = pW * scale;
    const cssH = pH * scale;

    // 纸张内容（与屏幕文档同步的精简版）
    const paperHTML = buildPaperContent();

    dom.paperStack.innerHTML = `
        <div class="paper-sheet ${state.bleed ? 'bleed' : ''} ${state.ink === 'eco' ? 'eco' : ''}"
             style="width: ${cssW}px; min-height: ${cssH}px; --p-margin: ${state.margin * scale * 1.3}px; --p-fontsize: ${state.fontsize}pt; --p-lineheight: ${state.lineheight}; font-family: ${FONT_MAP[state.font]}; filter: contrast(${state.contrast / 100});">
            ${state.bleed ? `
                <span class="bleed-mark bleed-tl">↖</span>
                <span class="bleed-mark bleed-tr">↗</span>
                <span class="bleed-mark bleed-bl">↙</span>
                <span class="bleed-mark bleed-br">↘</span>
            ` : ''}
            <div class="paper-watermark ${state.watermark ? '' : 'hidden'}">
                <span class="watermark-text">EDEN</span>
            </div>
            <div class="paper-inner">
                <div class="paper-head ${state.header ? '' : 'hidden'}">
                    <div class="paper-kicker">桥接笔记 · No.07</div>
                    <div class="paper-title">屏幕之外，仍有纸面</div>
                    <div class="paper-meta">EDEN · 数字花园 / ${formatDate()}</div>
                </div>
                <div class="paper-body" data-columns="${state.columns ? '2' : '1'}">
                    ${paperHTML}
                </div>
            </div>
            <div class="paper-footer ${state.header ? '' : 'hidden'}">
                <span>EDEN · Digital Garden</span>
                <span>第 1 页 / 共 ${estimatePages()} 页</span>
            </div>
        </div>
    `;
}

function buildPaperContent() {
    // 精简为打印友好的纯文本结构
    return `
        <p class="paper-p">屏幕与纸张，本是两种截然不同的物质。前者由像素与背光构成，色彩鲜艳却转瞬即逝；后者由纤维与墨迹凝结，安静沉稳却能流传百年。<span class="paper-strong">这座桥</span>，便是为了让数字的内容，得以拥有纸面的重量。</p>
        <p class="paper-p">当你调节左侧的参数，纸张会同步呼吸——边距撑开呼吸的留白，字号决定字符的密度，墨色映射控制每一滴油墨的去留。屏幕上的鲜艳渐变，在纸面上被翻译成克制的灰阶；流动的动画，凝结为静止的版面。</p>
        <p class="paper-quote">"印刷并非屏幕的退步，而是信息的另一种沉淀方式。"</p>
        <p class="paper-p">桥接的核心，是一份精心调校的 <span class="paper-code">@media print</span> 样式表。它过滤掉一切不适合纸面的元素：动画、阴影、半透明、交互态。只留下结构、层次与可读性——这正是纸面最擅长的领域。</p>
        <p class="paper-p">试着拖动参数，观察右侧纸面的回应。每一次调整，都是一次跨越介质的翻译。最终导出的 CSS，便是这座桥的工程图纸。</p>
    `;
}

function formatDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
}

// === 7. Density Calc · 估算纸面负载与页数 ===
function calcDensity() {
    // 字号越大、行高越低、边距越小、内容越多 → 密度越高
    const fontFactor = (state.fontsize - 9) / 7;          // 0~1
    const lineFactor = (2.2 - state.lineheight) / 1.0;     // 0~1
    const marginFactor = (40 - state.margin) / 40;         // 0~1
    const colFactor = state.columns ? 0.15 : 0;
    let density = (fontFactor * 0.25 + lineFactor * 0.25 + marginFactor * 0.4 + colFactor + 0.15) * 100;
    density = Math.max(20, Math.min(98, Math.round(density)));
    return density;
}

function estimatePages() {
    const density = calcDensity();
    // 密度越高页数越少
    const base = state.size === 'A5' ? 3 : 2;
    const pages = Math.max(1, Math.round(base * (100 / density) * 0.7));
    return pages;
}

function updateMeta() {
    const density = calcDensity();
    const pages = estimatePages();
    dom.densityFill.style.width = density + '%';
    dom.densityValue.textContent = density + '%';
    dom.metaDensity.textContent = `密度 ${density}%`;
    dom.metaPages.textContent = `${pages} 页`;
    // 遥测
    dom.teleView.textContent = VIEW_LABEL[state.view];
    dom.teleSize.textContent = `${SIZE_MAP[state.size].label} ${state.orientation === 'portrait' ? '纵' : '横'}`;
    dom.teleMargin.textContent = `${state.margin}mm`;
    dom.teleFontsize.textContent = `${state.fontsize}pt`;
    dom.teleInk.textContent = state.ink === 'rich' ? '浓墨' : '省墨';
}

// === 8. CSS Export ===
function generateCSS() {
    const size = SIZE_MAP[state.size];
    const isPortrait = state.orientation === 'portrait';
    const pW = isPortrait ? size.w : size.h;
    const pH = isPortrait ? size.h : size.w;
    const fontFamily = FONT_MAP[state.font];
    const density = calcDensity();
    const contrastFilter = state.ink === 'eco' ? `filter: contrast(0.85);` : '';

    return `/* ============================================
   Print Web Bridge · 导出样式表
   生成于 ${new Date().toISOString().slice(0, 10)}
   规格: ${size.label} ${state.orientation} · 密度 ${density}%
   ============================================ */

@page {
  size: ${size.label} ${state.orientation};
  margin: ${state.margin}mm;
}

@media print {
  /* 全局隐藏非打印元素 */
  .no-print,
  .back-link,
  .cursor-glow,
  .particle-canvas,
  .mesh-bg {
    display: none !important;
  }

  body {
    background: #fff !important;
    color: #1a1612;
    font-family: ${fontFamily};
    font-size: ${state.fontsize}pt;
    line-height: ${state.lineheight};
    ${contrastFilter}
  }

  .print-content {
    ${state.columns ? `column-count: 2;\n    column-gap: 24px;` : ''}
    text-align: justify;
    hyphens: auto;
  }

  .print-title {
    font-size: ${state.fontsize * 1.8}pt;
    font-weight: 700;
    line-height: 1.2;
    ${state.header ? '' : 'display: none;'}
  }

  ${state.watermark ? `
  .print-watermark {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 0;
  }
  .print-watermark::after {
    content: 'EDEN';
    font-size: 90pt;
    font-weight: 900;
    opacity: 0.04;
    transform: rotate(-28deg);
  }` : ''}

  ${state.bleed ? `
  /* 出血标记 - 仅用于排版参考 */
  .print-page {
    outline: 1px dashed rgba(255,0,0,0.3);
    outline-offset: -3mm;
  }` : ''}

  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; page-break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
  table, figure { page-break-inside: avoid; }
}`;
}

function openDrawer() {
    dom.codeBlock.textContent = generateCSS();
    dom.exportDrawer.classList.add('active');
    dom.drawerOverlay.classList.add('active');
}
function closeDrawer() {
    dom.exportDrawer.classList.remove('active');
    dom.drawerOverlay.classList.remove('active');
}

async function copyCSS() {
    try {
        await navigator.clipboard.writeText(generateCSS());
        showToast('CSS 已复制到剪贴板');
    } catch {
        showToast('复制失败，请手动选取');
    }
}

function downloadCSS() {
    const blob = new Blob([generateCSS()], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'print-bridge.css';
    a.click();
    URL.revokeObjectURL(url);
    showToast('print-bridge.css 已下载');
}

function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => dom.toast.classList.remove('show'), 2400);
}

// === 9. Controls ===
function bindControls() {
    // 配色切换
    dom.paletteSwitch.addEventListener('click', (e) => {
        const btn = e.target.closest('.palette-btn');
        if (!btn) return;
        $$('.palette-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        state.palette = btn.dataset.palette;
        dom.body.setAttribute('data-palette', state.palette);
        pulseDock();
    });

    // 纸张规格
    dom.formatChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dom.formatChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.size = chip.dataset.size;
            renderPaper();
            updateMeta();
            pulseDock();
        });
    });

    // 朝向
    dom.orientationToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        dom.orientationToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.orientation = btn.dataset.orient;
        renderPaper();
        updateMeta();
        pulseDock();
    });

    // 字体
    dom.typeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dom.typeChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.font = chip.dataset.font;
            renderPaper();
            pulseDock();
        });
    });

    // 滑块
    dom.marginSlider.addEventListener('input', (e) => {
        state.margin = +e.target.value;
        dom.marginVal.textContent = state.margin + 'mm';
        renderPaper();
        updateMeta();
    });
    dom.fontsizeSlider.addEventListener('input', (e) => {
        state.fontsize = +e.target.value;
        dom.fontsizeVal.textContent = state.fontsize + 'pt';
        renderPaper();
        updateMeta();
    });
    dom.lineheightSlider.addEventListener('input', (e) => {
        state.lineheight = +e.target.value;
        dom.lineheightVal.textContent = state.lineheight.toFixed(2);
        renderPaper();
        updateMeta();
    });
    dom.contrastSlider.addEventListener('input', (e) => {
        state.contrast = +e.target.value;
        dom.contrastVal.textContent = state.contrast + '%';
        renderPaper();
    });

    // 墨色
    dom.inkToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        dom.inkToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.ink = btn.dataset.ink;
        renderPaper();
        updateMeta();
        pulseDock();
    });

    // 开关
    dom.switches.forEach(sw => {
        sw.addEventListener('click', () => {
            sw.classList.toggle('active');
            const key = sw.dataset.switch;
            state[key] = sw.classList.contains('active');
            renderPaper();
            pulseDock();
        });
    });

    // 视口模式
    dom.viewTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.view-tab');
        if (!tab) return;
        dom.viewTabs.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.view = tab.dataset.view;
        dom.viewportFrame.classList.remove('mode-screen', 'mode-print');
        if (state.view === 'screen') dom.viewportFrame.classList.add('mode-screen');
        if (state.view === 'print') dom.viewportFrame.classList.add('mode-print');
        updateMeta();
    });

    // 重置
    dom.resetBtn.addEventListener('click', resetState);

    // 导出
    dom.btnExportCss.addEventListener('click', openDrawer);
    dom.drawerClose.addEventListener('click', closeDrawer);
    dom.drawerOverlay.addEventListener('click', closeDrawer);
    dom.btnCopyCss.addEventListener('click', copyCSS);
    dom.btnDownloadCss.addEventListener('click', downloadCSS);

    // 打印
    dom.btnPrint.addEventListener('click', () => {
        showToast('正在唤起系统打印对话框…');
        setTimeout(() => window.print(), 600);
    });

    // 品牌印记交互
    dom.brandMark.addEventListener('click', () => {
        const palettes = ['inkstone', 'paper', 'sunset', 'abyss'];
        const idx = (palettes.indexOf(state.palette) + 1) % palettes.length;
        const btn = dom.paletteSwitch.querySelector(`[data-palette="${palettes[idx]}"]`);
        if (btn) btn.click();
    });

    // 键盘
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
        if (e.key === '1') dom.paletteSwitch.querySelector('[data-palette="inkstone"]').click();
        if (e.key === '2') dom.paletteSwitch.querySelector('[data-palette="paper"]').click();
        if (e.key === '3') dom.paletteSwitch.querySelector('[data-palette="sunset"]').click();
        if (e.key === '4') dom.paletteSwitch.querySelector('[data-palette="abyss"]').click();
        if (e.key === 's' || e.key === 'S') resetState();
    });
}

function pulseDock() {
    dom.dockPulse.style.animation = 'none';
    void dom.dockPulse.offsetWidth;
    dom.dockPulse.style.animation = '';
}

function resetState() {
    Object.assign(state, {
        palette: 'inkstone',
        size: 'A4',
        orientation: 'portrait',
        margin: 18,
        font: 'sans',
        fontsize: 11,
        lineheight: 1.6,
        ink: 'rich',
        contrast: 92,
        bleed: false,
        header: true,
        columns: false,
        watermark: false,
        view: 'split',
    });
    // 同步 UI
    dom.body.setAttribute('data-palette', 'inkstone');
    $$('.palette-btn').forEach(b => b.classList.toggle('active', b.dataset.palette === 'inkstone'));
    dom.formatChips.forEach(c => c.classList.toggle('active', c.dataset.size === 'A4'));
    dom.typeChips.forEach(c => c.classList.toggle('active', c.dataset.font === 'sans'));
    dom.orientationToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.orient === 'portrait'));
    dom.inkToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.ink === 'rich'));
    dom.switches.forEach(sw => {
        const key = sw.dataset.switch;
        sw.classList.toggle('active', !!state[key]);
    });
    dom.viewTabs.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'split'));
    dom.viewportFrame.classList.remove('mode-screen', 'mode-print');
    dom.marginSlider.value = 18; dom.marginVal.textContent = '18mm';
    dom.fontsizeSlider.value = 11; dom.fontsizeVal.textContent = '11pt';
    dom.lineheightSlider.value = 1.6; dom.lineheightVal.textContent = '1.60';
    dom.contrastSlider.value = 92; dom.contrastVal.textContent = '92%';
    renderPaper();
    updateMeta();
    showToast('已恢复默认参数');
}

// === 10. Bridge Sparks · 桥接粒子流 ===
function spawnBridgeSpark() {
    if (state.view !== 'split') return;
    const container = dom.connectorParticles;
    if (!container) return;
    const spark = document.createElement('span');
    spark.className = 'bridge-spark';
    const startX = 10 + Math.random() * 40;
    const startY = 20 + Math.random() * 60;
    spark.style.left = startX + '%';
    spark.style.top = startY + '%';
    container.appendChild(spark);

    const dx = 20 + Math.random() * 30;
    const dy = (Math.random() - 0.5) * 30;
    spark.animate([
        { opacity: 0, transform: 'translate(0,0) scale(0.5)' },
        { opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(1.2)`, offset: 0.5 },
        { opacity: 0, transform: `translate(${dx * 2}px, ${dy * 2}px) scale(0.3)` },
    ], { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });

    setTimeout(() => spark.remove(), 2200);
}

// === 11. FPS Meter + 主循环 ===
function loop(now) {
    const dt = now - lastFrameTime;
    lastFrameTime = now;
    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum >= 500) {
        const fps = Math.round(1000 / (fpsAccum / fpsFrames));
        dom.teleFps.textContent = Math.min(60, fps);
        fpsAccum = 0;
        fpsFrames = 0;
    }
    updateParticles(dt);
    requestAnimationFrame(loop);
}

// === 12. Init ===
function init() {
    resizeCanvas();
    initParticles();
    bindCursor();
    bindControls();
    if (dom.docDate) dom.docDate.textContent = formatDate();
    renderPaper();
    updateMeta();
    requestAnimationFrame(loop);
    // 周期性桥接粒子
    setInterval(spawnBridgeSpark, 350);
    // 窗口缩放
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });
    // 入场提示
    setTimeout(() => showToast('印物桥已就绪 · 拖动参数观察纸面回应'), 800);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
