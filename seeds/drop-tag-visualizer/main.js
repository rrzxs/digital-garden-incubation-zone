/**
 * Drop Tag Visualizer · 标签液滴可视化器
 *
 * 核心循环：
 *  - 标签凝为液滴，受重力坠落，撞击液面时产生飞溅粒子 / 涟漪环 / 表面波
 *  - 落水后在液池中漂浮：流场 / 聚类 / 晶格 三种模式
 *  - 拖拽抛掷、光标斥力场、点击冲击波、双击迸裂重生
 *
 * 免构建 · Vanilla JS · Canvas FX + DOM 玻璃液滴
 */
'use strict';

(function () {
    // ============================================================
    // === 配置与状态 ===
    // ============================================================

    const CONFIG = {
        gravity: 1500,          // px/s²
        dropJitterX: 90,        // 滴落点横向抖动
        surfaceRatio: 0.46,     // 液面高度比例（自顶部）
        cursorRadius: 150,      // 光标斥力场半径
        cursorForce: 2600,      // 光标斥力强度
        shockRadius: 320,       // 点击冲击波半径
        shockForce: 900,        // 冲击波强度
        separationRadius: 96,   // 标签间最小间距
        flowForce: 46,          // 流场推动力
        buoyancy: 2.4,          // 浮力回归系数
        dragDamp: 0.72,         // 拖拽跟随系数
        throwDamp: 0.94,        // 抛掷空气阻尼
        wallRestitution: 0.62,  // 边界弹性
        maxTags: 42,
        rainCount: 7
    };

    const MODES = {
        flow: 'FLOW',
        cluster: 'CLUSTER',
        grid: 'GRID'
    };

    const state = {
        mode: 'flow',
        tags: [],
        ripples: [],
        splashes: [],
        waves: [],
        ambient: [],
        pointer: { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, down: false, inside: false },
        dragging: null,
        time: 0,
        splashCount: 0,
        fps: 0,
        frames: 0,
        fpsClock: 0,
        poolTop: 0,
        w: 0,
        h: 0,
        dpr: 1
    };

    // ============================================================
    // === DOM 元素 ===
    // ============================================================

    const stage = document.getElementById('stage');
    const canvas = document.getElementById('fx-canvas');
    const ctx = canvas.getContext('2d');
    const cursorRing = document.getElementById('cursor-ring');
    const tagInput = document.getElementById('tag-input');
    const dropBtn = document.getElementById('drop-btn');
    const rainBtn = document.getElementById('rain-btn');
    const clearBtn = document.getElementById('clear-btn');
    const modeDock = document.getElementById('mode-dock');
    const themeSwitcher = document.getElementById('theme-switcher');
    const hudTags = document.getElementById('hud-tags');
    const hudMode = document.getElementById('hud-mode');
    const hudSplash = document.getElementById('hud-splash');
    const hudFps = document.getElementById('hud-fps');

    // ============================================================
    // === 标签词库（分类词池） ===
    // ============================================================

    const TAG_POOL = [
        { label: 'GLM-4', cat: 'ai' }, { label: 'Neural Ink', cat: 'ai' }, { label: 'Prompt Craft', cat: 'ai' },
        { label: 'Latent Space', cat: 'ai' }, { label: 'Agent Swarm', cat: 'ai' }, { label: 'Fine-tune', cat: 'ai' },
        { label: 'Glassmorphism', cat: 'design' }, { label: 'Mesh Gradient', cat: 'design' }, { label: 'Brutalist', cat: 'design' },
        { label: 'Kerning', cat: 'design' }, { label: 'Negative Space', cat: 'design' }, { label: 'Specimen', cat: 'design' },
        { label: 'Spring Damping', cat: 'motion' }, { label: 'Squash & Stretch', cat: 'motion' }, { label: 'Easing Curve', cat: 'motion' },
        { label: 'Anticipation', cat: 'motion' }, { label: 'Follow Through', cat: 'motion' }, { label: 'Overshoot', cat: 'motion' },
        { label: 'Breathwork', cat: 'wellness' }, { label: 'Deep Focus', cat: 'wellness' }, { label: 'Forest Bath', cat: 'wellness' },
        { label: 'Slow Wave', cat: 'wellness' }, { label: 'Moonlight', cat: 'wellness' }, { label: 'Stillness', cat: 'wellness' },
        { label: 'Scatter Plot', cat: 'data' }, { label: 'Histogram', cat: 'data' }, { label: 'Stream Graph', cat: 'data' },
        { label: 'Choropleth', cat: 'data' }, { label: 'Signal Noise', cat: 'data' }, { label: 'Quantile', cat: 'data' },
        { label: 'Hand Thrown', cat: 'craft' }, { label: 'Kintsugi', cat: 'craft' }, { label: 'Woven Shade', cat: 'craft' },
        { label: 'Letterpress', cat: 'craft' }, { label: 'Engraving', cat: 'craft' }, { label: 'Indigo Dye', cat: 'craft' }
    ];

    const CATEGORY_KEYS = {
        ai: ['ai', 'glm', 'llm', 'gpt', 'neural', 'agent', 'prompt', 'model', 'bot', 'ml'],
        design: ['design', 'ui', 'ux', 'color', 'type', 'font', 'grid', 'glass', 'brand', 'layout'],
        motion: ['motion', 'anim', 'spring', 'ease', 'physics', 'swing', 'wave', 'flow', 'drop', 'bounce'],
        wellness: ['calm', 'breath', 'zen', 'sleep', 'mood', 'focus', 'heal', 'mind', 'quiet', 'slow'],
        data: ['data', 'chart', 'graph', 'stat', 'plot', 'metric', 'signal', 'query', 'log', 'viz'],
        craft: ['craft', 'ink', 'clay', 'weave', 'paper', 'wood', 'dye', 'print', 'hand', 'folk']
    };

    const CATEGORY_LIST = Object.keys(CATEGORY_KEYS);

    // ============================================================
    // === 工具函数 ===
    // ============================================================

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    function hashString(str) {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        }
        return Math.abs(h);
    }

    /** 廉价连续噪声（层叠正弦），驱动流场 */
    function noise2(x, y, t) {
        return (
            Math.sin(x * 0.0022 + t * 0.45) * 0.5 +
            Math.sin(y * 0.0028 - t * 0.32) * 0.3 +
            Math.sin((x + y) * 0.0014 + t * 0.62) * 0.2
        );
    }

    function guessCategory(label) {
        const lower = label.toLowerCase();
        for (const cat of CATEGORY_LIST) {
            if (CATEGORY_KEYS[cat].some((kw) => lower.includes(kw))) return cat;
        }
        return CATEGORY_LIST[hashString(lower) % CATEGORY_LIST.length];
    }

    // ============================================================
    // === 主题调色板（Canvas 用） ===
    // ============================================================

    let palette = {};

    function readPalette() {
        const cs = getComputedStyle(document.documentElement);
        palette = {
            accent: cs.getPropertyValue('--accent').trim(),
            surface: cs.getPropertyValue('--surface-line').trim(),
            surfaceGlow: cs.getPropertyValue('--surface-glow').trim(),
            ink: cs.getPropertyValue('--ink').trim(),
            cats: {}
        };
        for (const cat of CATEGORY_LIST) {
            palette.cats[cat] = cs.getPropertyValue('--cat-' + cat).trim();
        }
    }

    function hexToRgb(color) {
        // CSS 变量均为 hex；提供 fallback 不至于崩溃
        const m = color.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!m) return { r: 255, g: 255, b: 255 };
        let hex = m[1];
        if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }

    function rgba(color, alpha) {
        const { r, g, b } = hexToRgb(color);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // ============================================================
    // === 画布尺寸 ===
    // ============================================================

    function resize() {
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        state.w = window.innerWidth;
        state.h = window.innerHeight;
        canvas.width = state.w * state.dpr;
        canvas.height = state.h * state.dpr;
        canvas.style.width = state.w + 'px';
        canvas.style.height = state.h + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        state.poolTop = Math.round(state.h * CONFIG.surfaceRatio);
        if (state.mode === 'grid') assignGridSlots();
        seedAmbient();
    }

    // ============================================================
    // === Tag 液滴实体 ===
    // ============================================================

    function createTag(label, cat, originX) {
        if (state.tags.length >= CONFIG.maxTags) {
            // 超出上限：最早的非拖拽标签被蒸发
            const victim = state.tags.find((t) => !t.isDragging && t.state !== 'drop');
            if (victim) evaporateTag(victim, true);
        }

        const category = cat || guessCategory(label);
        const el = document.createElement('div');
        el.className = 'tag-pill is-dropping';
        el.dataset.cat = category;
        el.innerHTML = `<div class="tag-inner"><span class="tag-dot"></span><span class="tag-label"></span></div>`;
        el.querySelector('.tag-label').textContent = label;

        const tag = {
            label,
            cat: category,
            el,
            x: clamp(originX + rand(-CONFIG.dropJitterX, CONFIG.dropJitterX), 60, state.w - 60),
            y: 118,
            vx: rand(-26, 26),
            vy: rand(-40, 10),
            state: 'drop',
            targetY: 0,
            floatY: 0,
            slotX: null,
            slotY: null,
            isDragging: false,
            wobble: rand(0, Math.PI * 2),
            sx: 0.7,
            sy: 0.7,
            born: state.time,
            lastPointer: { x: 0, y: 0 },
            rebirthOf: null
        };

        tag.targetY = state.poolTop + rand(8, 30);
        tag.floatY = state.poolTop + rand(52, Math.max(90, state.h - state.poolTop - 90));

        stage.appendChild(el);
        state.tags.push(tag);
        bindTagEvents(tag);
        updateHud();
        return tag;
    }

    function bindTagEvents(tag) {
        tag.el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startDrag(tag, e);
        });

        tag.el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            burstTag(tag);
        });

        // 触屏长按菜单抑制
        tag.el.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    function removeTag(tag) {
        const i = state.tags.indexOf(tag);
        if (i > -1) state.tags.splice(i, 1);
        tag.el.remove();
        updateHud();
    }

    function evaporateTag(tag, silent) {
        if (tag.isEvaporating) return;
        tag.isEvaporating = true;
        tag.el.classList.add('is-evaporating');
        if (!silent) {
            spawnSplash(tag.x, tag.y, tag.cat, 6, 0.6);
            spawnRipple(tag.x, tag.y, tag.cat, 0.6);
        }
        window.setTimeout(() => removeTag(tag), 720);
        updateHud();
    }

    function burstTag(tag) {
        spawnSplash(tag.x, tag.y, tag.cat, 22, 1.4);
        spawnRipple(tag.x, tag.y, tag.cat, 1.2);
        const { label, cat } = tag;
        removeTag(tag);
        window.setTimeout(() => {
            if (state.tags.length < CONFIG.maxTags) {
                createTag(label, cat, state.w * rand(0.3, 0.7));
            }
        }, 640);
    }

    // ============================================================
    // === 拖拽 / 抛掷 ===
    // ============================================================

    function startDrag(tag, e) {
        state.dragging = tag;
        tag.isDragging = true;
        tag.state = 'drag';
        tag.el.classList.add('is-dragging');
        tag.lastPointer.x = e.clientX;
        tag.lastPointer.y = e.clientY;
        tag.vx = 0;
        tag.vy = 0;
        spawnRipple(tag.x, tag.y, tag.cat, 0.45);
    }

    function endDrag() {
        const tag = state.dragging;
        if (!tag) return;
        tag.isDragging = false;
        tag.el.classList.remove('is-dragging', 'is-dropping');
        tag.state = 'float';
        state.dragging = null;
        // 抛掷速度已在 pointermove 中累积于 vx / vy
        if (Math.hypot(tag.vx, tag.vy) > 420) {
            spawnRipple(tag.x, tag.y, tag.cat, 0.5);
        }
    }

    // ============================================================
    // === FX：涟漪 / 飞溅 / 表面波 / 环境粒子 ===
    // ============================================================

    function spawnRipple(x, y, cat, scale) {
        state.ripples.push({
            x, y,
            r: 6,
            maxR: 90 * (scale || 1),
            speed: 150 * (scale || 1),
            life: 1,
            color: palette.cats[cat] || palette.accent
        });
    }

    function spawnSplash(x, y, cat, count, power) {
        state.splashCount += count;
        const color = palette.cats[cat] || palette.accent;
        for (let i = 0; i < count; i++) {
            const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05); // 向上扇形
            const speed = rand(120, 380) * (power || 1);
            state.splashes.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: rand(1.4, 3.4),
                life: 1,
                decay: rand(0.9, 1.7),
                color
            });
        }
        updateHud();
    }

    function spawnSurfaceWave(x, power) {
        state.waves.push({ x, born: state.time, amp: 14 * power, speed: 0.9, decay: 2.6 });
        if (state.waves.length > 24) state.waves.shift();
    }

    function surfaceOffset(x) {
        let dy = 0;
        for (const w of state.waves) {
            const age = state.time - w.born;
            const dist = Math.abs(x - w.x);
            const envelope = Math.exp(-dist * 0.004) * Math.exp(-age * w.decay * 0.4);
            dy += Math.sin(dist * 0.03 - age * w.speed * 6) * w.amp * envelope;
        }
        return dy;
    }

    function surfaceYAt(x) {
        return state.poolTop + surfaceOffset(x);
    }

    function seedAmbient() {
        state.ambient = [];
        const count = Math.round(clamp(state.w / 22, 30, 80));
        for (let i = 0; i < count; i++) {
            state.ambient.push({
                x: rand(0, state.w),
                y: rand(state.poolTop + 20, state.h),
                vx: 0,
                vy: 0,
                r: rand(0.7, 2),
                phase: rand(0, Math.PI * 2)
            });
        }
    }

    // ============================================================
    // === 模式：聚类 / 晶格 ===
    // ============================================================

    function computeCentroids() {
        const sums = {};
        for (const tag of state.tags) {
            if (!sums[tag.cat]) sums[tag.cat] = { x: 0, y: 0, n: 0 };
            sums[tag.cat].x += tag.x;
            sums[tag.cat].y += tag.y;
            sums[tag.cat].n += 1;
        }
        const centers = {};
        const cats = Object.keys(sums);
        cats.forEach((cat, i) => {
            const s = sums[cat];
            // 类中心扇形分布，避免重叠
            const angle = (i / Math.max(1, cats.length)) * Math.PI - Math.PI; // 上半圆
            const cx = state.w * 0.5 + Math.cos(angle) * state.w * 0.26;
            const cy = state.poolTop + (state.h - state.poolTop) * 0.5 + Math.sin(angle) * (state.h - state.poolTop) * 0.26;
            centers[cat] = {
                x: lerp(s.x / s.n, cx, 0.55),
                y: lerp(s.y / s.n, cy, 0.55)
            };
        });
        return centers;
    }

    function assignGridSlots() {
        const sorted = [...state.tags].sort((a, b) =>
            a.cat === b.cat ? a.label.localeCompare(b.label) : a.cat.localeCompare(b.cat)
        );
        const cols = clamp(Math.ceil(Math.sqrt(sorted.length * (state.w / Math.max(1, state.h - state.poolTop)) * 0.8)), 2, 9);
        const rows = Math.ceil(sorted.length / cols);
        const poolH = state.h - state.poolTop;
        sorted.forEach((tag, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            tag.slotX = ((col + 0.5) / cols) * state.w;
            tag.slotY = state.poolTop + ((row + 0.5) / Math.max(1, rows)) * poolH;
        });
    }

    function setMode(mode) {
        state.mode = mode;
        hudMode.textContent = MODES[mode];
        if (mode === 'grid') assignGridSlots();
        document.querySelectorAll('.mode-chip').forEach((c) => {
            c.classList.toggle('active', c.dataset.mode === mode);
        });
    }

    // ============================================================
    // === 物理主循环 ===
    // ============================================================

    function stepTag(tag, dt, centers) {
        if (tag.isEvaporating) return;

        // --- 拖拽：弹簧跟随光标 ---
        if (tag.isDragging) {
            const tx = state.pointer.x;
            const ty = state.pointer.y;
            const nx = lerp(tag.x, tx, CONFIG.dragDamp);
            const ny = lerp(tag.y, ty, CONFIG.dragDamp);
            tag.vx = (nx - tag.x) / Math.max(dt, 0.001);
            tag.vy = (ny - tag.y) / Math.max(dt, 0.001);
            tag.x = nx;
            tag.y = ny;
        } else if (tag.state === 'drop') {
            // --- 坠落：重力 + 挤压拉伸 ---
            tag.vy += CONFIG.gravity * dt;
            tag.x += tag.vx * dt;
            tag.y += tag.vy * dt;
            const sy = clamp(1 + tag.vy * 0.00042, 0.7, 1.5);
            tag.sx = clamp(2 - sy, 0.6, 1.3);
            tag.sy = sy;
            const surf = surfaceYAt(tag.x);
            if (tag.y >= surf) {
                // 触液：飞溅 + 涟漪 + 表面波
                const power = clamp(tag.vy / 900, 0.35, 1.6);
                tag.y = surf + 4;
                tag.state = 'float';
                tag.el.classList.remove('is-dropping');
                tag.sx = 1.32; // 落水瞬间横向摊开
                tag.sy = 0.68;
                tag.vy = 90;
                tag.vx *= 0.4;
                spawnSplash(tag.x, surf, tag.cat, Math.round(6 + power * 10), power);
                spawnRipple(tag.x, surf, tag.cat, power);
                spawnSurfaceWave(tag.x, power);
                state.splashCount += 1;
                updateHud();
            }
        } else {
            // --- 漂浮：模式行为 ---
            let ax = 0;
            let ay = 0;

            if (state.mode === 'flow') {
                const n = noise2(tag.x + tag.wobble * 40, tag.y, state.time);
                const theta = n * Math.PI * 1.4 + tag.wobble;
                ax += Math.cos(theta) * CONFIG.flowForce;
                ay += Math.sin(theta) * CONFIG.flowForce * 0.4;
                // 浮力回归各自深度
                ay += (tag.floatY - tag.y) * CONFIG.buoyancy;
            } else if (state.mode === 'cluster') {
                const c = centers[tag.cat];
                if (c) {
                    const dx = c.x - tag.x;
                    const dy = c.y - tag.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const seek = clamp(dist * 1.8, 0, 320);
                    // 轻微轨道切向速度，让聚落自转
                    ax += (dx / dist) * seek + (-dy / dist) * 42;
                    ay += (dy / dist) * seek + (dx / dist) * 42;
                }
            } else if (state.mode === 'grid') {
                if (tag.slotX == null) assignGridSlots();
                ax += (tag.slotX - tag.x) * 3.4;
                ay += (tag.slotY - tag.y) * 3.4;
                ax += Math.sin(state.time * 1.2 + tag.wobble) * 9;
                ay += Math.cos(state.time * 0.9 + tag.wobble) * 9;
            }

            tag.vx += ax * dt;
            tag.vy += ay * dt;

            // 抛掷后的空气阻尼
            tag.vx *= CONFIG.throwDamp;
            tag.vy *= CONFIG.throwDamp;

            // 若被抛出液面之上：重力拉回，再次入水触发小飞溅
            const surf = surfaceYAt(tag.x);
            if (tag.y < surf - 10) {
                tag.vy += CONFIG.gravity * 0.55 * dt;
            } else if (tag.vy > 260 && tag.y - tag.vy * dt < surf) {
                spawnSplash(tag.x, surf, tag.cat, 8, 0.8);
                spawnRipple(tag.x, surf, tag.cat, 0.7);
                spawnSurfaceWave(tag.x, 0.7);
            }

            tag.x += tag.vx * dt;
            tag.y += tag.vy * dt;

            // 液池边界（左右下）
            const pad = 70;
            if (tag.x < pad) { tag.x = pad; tag.vx = Math.abs(tag.vx) * CONFIG.wallRestitution; }
            if (tag.x > state.w - pad) { tag.x = state.w - pad; tag.vx = -Math.abs(tag.vx) * CONFIG.wallRestitution; }
            const bottom = state.h - 40;
            if (tag.y > bottom) { tag.y = bottom; tag.vy = -Math.abs(tag.vy) * CONFIG.wallRestitution; }
        }

        // --- 标签间分离（所有状态通用） ---
        if (!tag.isDragging && !tag.isEvaporating) {
            for (const other of state.tags) {
                if (other === tag || other.isEvaporating) continue;
                const dx = tag.x - other.x;
                const dy = tag.y - other.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0.01 && dist < CONFIG.separationRadius) {
                    const push = (CONFIG.separationRadius - dist) / CONFIG.separationRadius;
                    tag.x += (dx / dist) * push * 1.8;
                    tag.y += (dy / dist) * push * 1.8;
                }
            }
        }

        // --- 光标斥力场 ---
        if (!tag.isDragging && state.pointer.inside) {
            const dx = tag.x - state.pointer.x;
            const dy = tag.y - state.pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.01 && dist < CONFIG.cursorRadius) {
                const falloff = 1 - dist / CONFIG.cursorRadius;
                const force = CONFIG.cursorForce * falloff * falloff;
                tag.vx += (dx / dist) * force * dt;
                tag.vy += (dy / dist) * force * dt;
            }
        }

        // --- 形变回弹（弹簧归位到 1） ---
        tag.sx = lerp(tag.sx, 1, 1 - Math.pow(0.002, dt));
        tag.sy = lerp(tag.sy, 1, 1 - Math.pow(0.002, dt));

        // --- 渲染 ---
        const rot = clamp(tag.vx * 0.00055, -0.22, 0.22);
        tag.el.style.transform =
            `translate3d(${tag.x.toFixed(1)}px, ${tag.y.toFixed(1)}px, 0) ` +
            `translate(-50%, -50%) ` +
            `rotate(${rot.toFixed(3)}rad) ` +
            `scale(${tag.sx.toFixed(3)}, ${tag.sy.toFixed(3)})`;
    }

    function stepAmbient(dt) {
        for (const p of state.ambient) {
            const n = noise2(p.x, p.y + p.phase * 90, state.time);
            const theta = n * Math.PI * 1.6;
            p.vx = lerp(p.vx, Math.cos(theta) * 14, 0.04);
            p.vy = lerp(p.vy, Math.sin(theta) * 8, 0.04);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < -10) p.x = state.w + 10;
            if (p.x > state.w + 10) p.x = -10;
            if (p.y < state.poolTop + 6) p.y = state.h;
            if (p.y > state.h + 6) p.y = state.poolTop + 12;
        }
    }

    // ============================================================
    // === FX 渲染 ===
    // ============================================================

    function drawFX(dt) {
        ctx.clearRect(0, 0, state.w, state.h);

        // --- 液面波光带 ---
        ctx.beginPath();
        ctx.moveTo(0, state.h);
        ctx.lineTo(0, surfaceYAt(0));
        for (let x = 0; x <= state.w; x += 8) {
            ctx.lineTo(x, surfaceYAt(x));
        }
        ctx.lineTo(state.w, state.h);
        ctx.closePath();
        ctx.fillStyle = palette.surfaceGlow || 'rgba(125,211,252,0.08)';
        ctx.fill();

        ctx.beginPath();
        for (let x = 0; x <= state.w; x += 8) {
            const y = surfaceYAt(x);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = palette.surface || 'rgba(125,211,252,0.5)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 液面刻度文字
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.fillStyle = rgba(palette.accent, 0.5);
        ctx.textAlign = 'right';
        ctx.fillText('LIQUID SURFACE · 液面', state.w - 22, surfaceYAt(state.w - 130) - 10);

        // --- 环境粒子 ---
        for (const p of state.ambient) {
            const tw = 0.35 + 0.3 * Math.sin(state.time * 2 + p.phase);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = rgba(palette.accent, tw * 0.5);
            ctx.fill();
        }

        // --- 同类连接线 ---
        ctx.lineWidth = 1;
        for (let i = 0; i < state.tags.length; i++) {
            const a = state.tags[i];
            if (a.isEvaporating) continue;
            for (let j = i + 1; j < state.tags.length; j++) {
                const b = state.tags[j];
                if (b.isEvaporating || b.cat !== a.cat) continue;
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = rgba(palette.cats[a.cat] || palette.accent, 0.14 * (1 - dist / 150));
                    ctx.stroke();
                }
            }
        }

        // --- 涟漪环 ---
        for (let i = state.ripples.length - 1; i >= 0; i--) {
            const r = state.ripples[i];
            r.r += r.speed * dt;
            r.life -= dt * 1.4;
            if (r.life <= 0 || r.r > r.maxR * 2.4) {
                state.ripples.splice(i, 1);
                continue;
            }
            const alpha = Math.max(0, r.life * 0.5);
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(r.color, alpha);
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(r.color, alpha * 0.5);
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // --- 飞溅粒子 ---
        for (let i = state.splashes.length - 1; i >= 0; i--) {
            const s = state.splashes[i];
            s.vy += 620 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= s.decay * dt;
            if (s.life <= 0) {
                state.splashes.splice(i, 1);
                continue;
            }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * clamp(s.life, 0.2, 1), 0, Math.PI * 2);
            ctx.fillStyle = rgba(s.color, clamp(s.life, 0, 0.9));
            ctx.fill();
        }
    }

    // ============================================================
    // === 主循环 (rAF) ===
    // ============================================================

    let lastFrame = performance.now();

    function loop(now) {
        const dt = clamp((now - lastFrame) / 1000, 0.001, 0.05);
        lastFrame = now;
        state.time += dt;

        // FPS 统计
        state.frames += 1;
        if (now - state.fpsClock > 500) {
            state.fps = Math.round(state.frames * 1000 / (now - state.fpsClock));
            state.frames = 0;
            state.fpsClock = now;
            hudFps.textContent = state.fps;
        }

        // 光标速度
        state.pointer.vx = (state.pointer.x - state.pointer.px) / dt;
        state.pointer.vy = (state.pointer.y - state.pointer.py) / dt;
        state.pointer.px = state.pointer.x;
        state.pointer.py = state.pointer.y;

        const centers = state.mode === 'cluster' ? computeCentroids() : null;
        for (const tag of state.tags) stepTag(tag, dt, centers);
        stepAmbient(dt);
        drawFX(dt);

        requestAnimationFrame(loop);
    }

    // ============================================================
    // === 冲击波（点击空白） ===
    // ============================================================

    function shockwave(x, y) {
        spawnRipple(x, y, null, 2.2);
        spawnRipple(x, y, null, 1.4);
        for (const tag of state.tags) {
            if (tag.isEvaporating) continue;
            const dx = tag.x - x;
            const dy = tag.y - y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.01 && dist < CONFIG.shockRadius) {
                const falloff = 1 - dist / CONFIG.shockRadius;
                const force = CONFIG.shockForce * falloff * falloff;
                tag.vx += (dx / dist) * force * 0.016;
                tag.vy += (dy / dist) * force * 0.016;
                // 冲击瞬间挤压
                tag.sx = 1 + falloff * 0.22;
                tag.sy = 1 - falloff * 0.16;
            }
        }
        // 表面波（若点击在液面附近）
        if (Math.abs(y - state.poolTop) < 200) {
            spawnSurfaceWave(x, 0.9);
        }
    }

    // ============================================================
    // === 事件绑定 ===
    // ============================================================

    window.addEventListener('pointermove', (e) => {
        state.pointer.x = e.clientX;
        state.pointer.y = e.clientY;
        state.pointer.inside = true;
        cursorRing.style.transform =
            `translate3d(${e.clientX}px, ${e.clientY}px, 0)` +
            (state.pointer.down ? ' scale(0.72)' : '');
        cursorRing.classList.toggle('is-visible', true);
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
        state.pointer.inside = false;
        state.pointer.x = -9999;
        state.pointer.y = -9999;
        cursorRing.classList.remove('is-visible');
    });

    document.addEventListener('mouseleave', () => {
        state.pointer.inside = false;
        cursorRing.classList.remove('is-visible');
    });

    window.addEventListener('pointerdown', (e) => {
        state.pointer.down = true;
        cursorRing.classList.add('is-pressed');
        // 点击非交互元素 → 冲击波
        const onUI = e.target.closest('.glass-console, .mode-dock, .hud-panel, .theme-switcher, .back-link, .hint-bar, .tag-pill');
        if (!onUI && state.dragging == null) {
            shockwave(e.clientX, e.clientY);
        }
    });

    window.addEventListener('pointerup', () => {
        state.pointer.down = false;
        cursorRing.classList.remove('is-pressed');
        endDrag();
    });

    // === 控制台 ===

    function submitInput() {
        const label = tagInput.value.trim().slice(0, 18);
        if (!label) {
            tagInput.focus();
            return;
        }
        createTag(label, null, state.w * rand(0.32, 0.68));
        tagInput.value = '';
        tagInput.focus();
    }

    dropBtn.addEventListener('click', submitInput);

    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitInput();
        }
    });

    rainBtn.addEventListener('click', () => {
        const picks = [...TAG_POOL].sort(() => Math.random() - 0.5).slice(0, CONFIG.rainCount);
        picks.forEach((t, i) => {
            window.setTimeout(() => {
                if (state.tags.length < CONFIG.maxTags + 4) {
                    createTag(t.label, t.cat, state.w * rand(0.15, 0.85));
                }
            }, i * 190);
        });
    });

    clearBtn.addEventListener('click', () => {
        [...state.tags].forEach((tag, i) => {
            window.setTimeout(() => evaporateTag(tag, false), i * 55);
        });
    });

    modeDock.addEventListener('click', (e) => {
        const chip = e.target.closest('.mode-chip');
        if (chip) setMode(chip.dataset.mode);
    });

    themeSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-btn');
        if (!btn) return;
        document.documentElement.dataset.theme = btn.dataset.theme;
        document.querySelectorAll('.theme-btn').forEach((b) => {
            b.classList.toggle('active', b === btn);
        });
        readPalette();
    });

    window.addEventListener('resize', resize);
    window.addEventListener('keydown', (e) => {
        // 数字键 1/2/3 切换模式
        if (e.target === tagInput) return;
        if (e.key === '1') setMode('flow');
        if (e.key === '2') setMode('cluster');
        if (e.key === '3') setMode('grid');
    });

    // ============================================================
    // === HUD ===
    // ============================================================

    function updateHud() {
        hudTags.textContent = state.tags.filter((t) => !t.isEvaporating).length;
        hudSplash.textContent = state.splashCount;
    }

    // ============================================================
    // === 启动 ===
    // ============================================================

    readPalette();
    resize();
    setMode('flow');

    // 开场：三滴标签依次坠入，宣告世界已就绪
    const overture = [pick(TAG_POOL), pick(TAG_POOL), pick(TAG_POOL)];
    overture.forEach((t, i) => {
        window.setTimeout(() => createTag(t.label, t.cat, state.w * (0.36 + i * 0.14)), 500 + i * 480);
    });

    requestAnimationFrame(loop);
})();
