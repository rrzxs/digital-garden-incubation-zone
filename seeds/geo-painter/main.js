(function () {
    'use strict';

    /* =====================================================================
       Geo Painter · 几何画师
       交互逻辑: 参数化几何绘画 · 弹簧物理形变 · 对称镜像 · 6 种画笔
                 · 撤销/重做 · 随机生成 · PNG 导出 · 粒子流场 · 氛围配色
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    /* =====================================================================
       === DOM Elements ===
       ===================================================================== */

    var canvas = document.getElementById('paint-canvas');
    var ctx = canvas.getContext('2d');
    var pCanvas = document.getElementById('particle-canvas');
    var pCtx = pCanvas.getContext('2d');

    var hudDot = document.getElementById('hud-dot');
    var hudText = document.getElementById('hud-text');
    var telShapes = document.getElementById('tel-shapes');
    var telSym = document.getElementById('tel-sym');
    var telMode = document.getElementById('tel-mode');
    var brushCounter = document.getElementById('brush-counter');
    var cursorGlow = document.getElementById('cursor-glow');
    var rippleLayer = document.getElementById('ripple-layer');
    var toastEl = document.getElementById('toast');

    var brushButtons = document.querySelectorAll('.brush-btn');
    var paletteDots = document.querySelectorAll('.palette-dot');

    var sliderSides = document.getElementById('slider-sides');
    var valSides = document.getElementById('val-sides');
    var sliderWeight = document.getElementById('slider-weight');
    var valWeight = document.getElementById('val-weight');
    var sliderSym = document.getElementById('slider-sym');
    var valSym = document.getElementById('val-sym');
    var toggleFill = document.getElementById('toggle-fill');

    var btnUndo = document.getElementById('btn-undo');
    var btnRedo = document.getElementById('btn-redo');
    var btnRandom = document.getElementById('btn-random');
    var btnClear = document.getElementById('btn-clear');
    var btnExport = document.getElementById('btn-export');

    /* =====================================================================
       === 绘图状态 ===
       ===================================================================== */

    /* 当前画笔类型 */
    var currentBrush = 'circle';
    /* 参数 */
    var paramSides = 6;
    var paramWeight = 3;
    var paramSym = 1;
    var paramFill = false;

    /* 已完成的形状列表 (用于持久渲染) */
    var shapes = [];
    /* 撤销/重做栈 */
    var undoStack = [];
    var redoStack = [];
    /* 最大撤销历史 */
    var MAX_HISTORY = 50;

    /* 正在绘制的临时形状 (拖拽预览) */
    var activeShape = null;
    var isDrawing = false;
    var drawStartX = 0;
    var drawStartY = 0;
    var drawCurrentX = 0;
    var drawCurrentY = 0;

    /* 画布尺寸 */
    var cw = 0;
    var ch = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* =====================================================================
       === 画笔名称映射 ===
       ===================================================================== */

    var BRUSH_NAMES = {
        circle: 'CIRCLE',
        polygon: 'POLYGON',
        line: 'LINE',
        curve: 'CURVE',
        star: 'STAR',
        burst: 'BURST'
    };

    /* =====================================================================
       === 颜色获取 (从 CSS 变量读取 accent) ===
       ===================================================================== */

    function getAccentHsl() {
        var v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        var m = v.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
        if (!m) return { h: 160, s: 80, l: 70 };
        var r = parseInt(m[1], 16) / 255;
        var g = parseInt(m[2], 16) / 255;
        var b = parseInt(m[3], 16) / 255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var d = max - min;
        var h = 0;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
            if (h < 0) h += 360;
        }
        var l = (max + min) / 2;
        var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        return { h: h, s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    /* 根据形状索引生成色相偏移 (让多形状构图更丰富) */
    function getShapeColor(idx) {
        var base = getAccentHsl();
        var hueShift = (idx * 18) % 360;
        var h = (base.h + hueShift) % 360;
        /* 限制饱和度和亮度在合理范围 */
        return 'hsl(' + Math.round(h) + ', ' + base.s + '%, ' + base.l + '%)';
    }

    function getShapeColorAlpha(idx, alpha) {
        var base = getAccentHsl();
        var hueShift = (idx * 18) % 360;
        var h = (base.h + hueShift) % 360;
        return 'hsla(' + Math.round(h) + ', ' + base.s + '%, ' + base.l + '%, ' + alpha + ')';
    }

    /* =====================================================================
       === 画布尺寸管理 ===
       ===================================================================== */

    function resizeCanvas() {
        var rect = canvas.getBoundingClientRect();
        cw = rect.width;
        ch = rect.height;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redrawAll();
    }

    function resizeParticleCanvas() {
        pCanvas.width = window.innerWidth * dpr;
        pCanvas.height = window.innerHeight * dpr;
        pCanvas.style.width = window.innerWidth + 'px';
        pCanvas.style.height = window.innerHeight + 'px';
        pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* =====================================================================
       === 形状对象构造 ===
       一个形状包含:
       - type: 画笔类型
       - x1, y1, x2, y2: 起止点
       - sides: 边数 (polygon/star)
       - weight: 线宽
       - fill: 是否填充
       - sym: 对称数
       - colorIdx: 颜色索引
       - morph: 弹簧形变进度 (0→1, 用于入场动画)
       ===================================================================== */

    function createShape(type, x1, y1, x2, y2) {
        return {
            type: type,
            x1: x1, y1: y1, x2: x2, y2: y2,
            sides: paramSides,
            weight: paramWeight,
            fill: paramFill,
            sym: paramSym,
            colorIdx: shapes.length,
            morph: 0,
            morphVel: 0
        };
    }

    /* =====================================================================
       === 绘制单个形状 (含对称镜像) ===
       ===================================================================== */

    function drawShape(shape, morphFactor) {
        var cx = cw / 2;
        var cy = ch / 2;
        /* 以画布中心为对称中心进行旋转复制 */
        var sym = Math.max(1, shape.sym);
        var angleStep = (Math.PI * 2) / sym;

        for (var s = 0; s < sym; s++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleStep * s);
            ctx.translate(-cx, -cy);
            drawSingleShape(shape, morphFactor);
            ctx.restore();
        }
    }

    function drawSingleShape(shape, morphFactor) {
        var x1 = shape.x1;
        var y1 = shape.y1;
        var x2 = shape.x2;
        var y2 = shape.y2;

        /* 弹簧形变: morphFactor 从 0→1, 用 ease-out 曲线缩放形状 */
        var ease = 1 - Math.pow(1 - morphFactor, 3);
        var mx = x1 + (x2 - x1) * ease;
        var my = y1 + (y2 - y1) * ease;

        /* 计算几何参数 */
        var dx = mx - x1;
        var dy = my - y1;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);

        ctx.lineWidth = shape.weight;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        var strokeColor = getShapeColor(shape.colorIdx);
        var fillColor = getShapeColorAlpha(shape.colorIdx, 0.18);

        /* 发光阴影 */
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 12;

        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;

        switch (shape.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(x1, y1, Math.max(1, dist), 0, Math.PI * 2);
                if (shape.fill) ctx.fill();
                ctx.stroke();
                break;

            case 'polygon':
                drawPolygon(x1, y1, Math.max(1, dist), angle, shape.sides);
                if (shape.fill) ctx.fill();
                ctx.stroke();
                break;

            case 'line':
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(mx, my);
                ctx.stroke();
                break;

            case 'curve':
                /* 二次贝塞尔曲线, 控制点偏移 */
                var midX = (x1 + mx) / 2;
                var midY = (y1 + my) / 2;
                var perpX = -(my - y1);
                var perpY = (mx - x1);
                var perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                var curveAmt = dist * 0.35;
                var cpX = midX + (perpX / perpLen) * curveAmt;
                var cpY = midY + (perpY / perpLen) * curveAmt;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(cpX, cpY, mx, my);
                ctx.stroke();
                break;

            case 'star':
                drawStar(x1, y1, Math.max(1, dist), angle, shape.sides);
                if (shape.fill) ctx.fill();
                ctx.stroke();
                break;

            case 'burst':
                /* 放射线 */
                var rays = Math.max(4, shape.sides * 2);
                var innerR = dist * 0.15;
                for (var r = 0; r < rays; r++) {
                    var a = (r / rays) * Math.PI * 2 + angle;
                    ctx.beginPath();
                    ctx.moveTo(x1 + Math.cos(a) * innerR, y1 + Math.sin(a) * innerR);
                    ctx.lineTo(x1 + Math.cos(a) * dist, y1 + Math.sin(a) * dist);
                    ctx.stroke();
                }
                /* 中心圆 */
                ctx.beginPath();
                ctx.arc(x1, y1, innerR, 0, Math.PI * 2);
                if (shape.fill) ctx.fill();
                ctx.stroke();
                break;
        }

        ctx.shadowBlur = 0;
    }

    function drawPolygon(cx, cy, r, rotation, sides) {
        ctx.beginPath();
        for (var i = 0; i <= sides; i++) {
            var a = rotation + (i / sides) * Math.PI * 2;
            var px = cx + Math.cos(a) * r;
            var py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawStar(cx, cy, r, rotation, points) {
        var innerR = r * 0.42;
        var total = points * 2;
        ctx.beginPath();
        for (var i = 0; i <= total; i++) {
            var radius = (i % 2 === 0) ? r : innerR;
            var a = rotation + (i / total) * Math.PI * 2;
            var px = cx + Math.cos(a) * radius;
            var py = cy + Math.sin(a) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    /* =====================================================================
       === 重绘全部 (清空 + 重画所有已存形状 + 活动预览) ===
       ===================================================================== */

    function redrawAll() {
        ctx.clearRect(0, 0, cw, ch);

        /* 绘制网格背景 (微妙的辅助线) */
        drawCanvasGrid();

        /* 绘制所有已完成形状 */
        for (var i = 0; i < shapes.length; i++) {
            drawShape(shapes[i], shapes[i].morph);
        }

        /* 绘制正在拖拽的预览形状 */
        if (activeShape) {
            drawShape(activeShape, activeShape.morph);
        }
    }

    function drawCanvasGrid() {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 1;
        var step = 40;
        for (var x = 0; x <= cw; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ch);
            ctx.stroke();
        }
        for (var y = 0; y <= ch; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cw, y);
            ctx.stroke();
        }
        /* 中心十字线 (对称提示) */
        if (paramSym > 1) {
            ctx.strokeStyle = getShapeColorAlpha(0, 0.08);
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(cw / 2, 0);
            ctx.lineTo(cw / 2, ch);
            ctx.moveTo(0, ch / 2);
            ctx.lineTo(cw, ch / 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    /* =====================================================================
       === 弹簧物理动画循环 (形状入场形变) ===
       ===================================================================== */

    function animateMorph() {
        var needsRedraw = false;

        for (var i = 0; i < shapes.length; i++) {
            var s = shapes[i];
            if (s.morph < 1) {
                /* 弹簧-阻尼模型趋近 1 */
                var force = (1 - s.morph) * 0.12;
                s.morphVel += force;
                s.morphVel *= 0.82;
                s.morph += s.morphVel;
                if (s.morph > 0.999) {
                    s.morph = 1;
                    s.morphVel = 0;
                }
                needsRedraw = true;
            }
        }

        if (activeShape && activeShape.morph < 1) {
            /* 预览形状快速展开 */
            activeShape.morph += (1 - activeShape.morph) * 0.3;
            if (activeShape.morph > 0.999) activeShape.morph = 1;
            needsRedraw = true;
        }

        if (needsRedraw) {
            redrawAll();
        }

        requestAnimationFrame(animateMorph);
    }

    /* =====================================================================
       === 绘画交互 (指针事件) ===
       ===================================================================== */

    function getCanvasPoint(e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function onPointerDown(e) {
        var p = getCanvasPoint(e);
        isDrawing = true;
        drawStartX = p.x;
        drawStartY = p.y;
        drawCurrentX = p.x;
        drawCurrentY = p.y;

        /* 创建活动形状 (初始 morph 较小, 让它展开) */
        activeShape = createShape(currentBrush, p.x, p.y, p.x, p.y);
        activeShape.morph = 0;
        activeShape.morphVel = 0;

        canvas.setPointerCapture(e.pointerId);
        hudDot.classList.add('active');
        hudText.textContent = '绘制中…';
    }

    function onPointerMove(e) {
        if (!isDrawing) return;
        var p = getCanvasPoint(e);
        drawCurrentX = p.x;
        drawCurrentY = p.y;

        /* 更新活动形状终点 */
        if (activeShape) {
            activeShape.x2 = p.x;
            activeShape.y2 = p.y;
            /* 拖拽时保持 morph 快速跟随 */
            activeShape.morph = Math.min(1, activeShape.morph + 0.15);
        }

        redrawAll();
    }

    function onPointerUp(e) {
        if (!isDrawing) return;
        isDrawing = false;

        if (activeShape) {
            /* 判断是否有足够距离 (避免误触) */
            var dx = activeShape.x2 - activeShape.x1;
            var dy = activeShape.y2 - activeShape.y1;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                /* 提交到形状列表 */
                activeShape.morph = 0.3;
                activeShape.morphVel = 0.02;
                pushUndo();
                shapes.push(activeShape);
                updateTelemetry();
                hudText.textContent = BRUSH_NAMES[currentBrush] + ' 已落笔';
            } else {
                hudText.textContent = '在画布上拖拽绘制';
            }
            activeShape = null;
        }

        hudDot.classList.remove('active');
        redrawAll();
    }

    /* =====================================================================
       === 撤销 / 重做 ===
       ===================================================================== */

    function pushUndo() {
        /* 快照当前 shapes 的简化副本 */
        var snapshot = shapes.map(function (s) {
            return {
                type: s.type, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2,
                sides: s.sides, weight: s.weight, fill: s.fill, sym: s.sym,
                colorIdx: s.colorIdx, morph: 1, morphVel: 0
            };
        });
        undoStack.push(snapshot);
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        updateUndoRedoButtons();
    }

    function undo() {
        if (undoStack.length === 0) return;
        /* 保存当前到 redo */
        var current = shapes.map(function (s) {
            return {
                type: s.type, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2,
                sides: s.sides, weight: s.weight, fill: s.fill, sym: s.sym,
                colorIdx: s.colorIdx, morph: 1, morphVel: 0
            };
        });
        redoStack.push(current);

        var prev = undoStack.pop();
        shapes = prev.map(function (s) {
            s.morph = 1; s.morphVel = 0;
            return s;
        });
        updateTelemetry();
        updateUndoRedoButtons();
        redrawAll();
        showToast('已撤销');
        spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
    }

    function redo() {
        if (redoStack.length === 0) return;
        var current = shapes.map(function (s) {
            return {
                type: s.type, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2,
                sides: s.sides, weight: s.weight, fill: s.fill, sym: s.sym,
                colorIdx: s.colorIdx, morph: 1, morphVel: 0
            };
        });
        undoStack.push(current);

        var next = redoStack.pop();
        shapes = next.map(function (s) {
            s.morph = 1; s.morphVel = 0;
            return s;
        });
        updateTelemetry();
        updateUndoRedoButtons();
        redrawAll();
        showToast('已重做');
        spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
    }

    function updateUndoRedoButtons() {
        btnUndo.disabled = undoStack.length === 0;
        btnRedo.disabled = redoStack.length === 0;
    }

    /* =====================================================================
       === 清空 / 随机生成 / 导出 ===
       ===================================================================== */

    function clearCanvas() {
        if (shapes.length === 0) return;
        pushUndo();
        shapes = [];
        updateTelemetry();
        redrawAll();
        showToast('画布已清空');
        spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
    }

    function randomGenerate() {
        var brushes = ['circle', 'polygon', 'line', 'curve', 'star', 'burst'];
        pushUndo();

        var count = 5 + Math.floor(Math.random() * 5);
        var margin = 60;
        for (var i = 0; i < count; i++) {
            var type = brushes[Math.floor(Math.random() * brushes.length)];
            var x1 = margin + Math.random() * (cw - margin * 2);
            var y1 = margin + Math.random() * (ch - margin * 2);
            var size = 40 + Math.random() * 120;
            var angle = Math.random() * Math.PI * 2;
            var x2 = x1 + Math.cos(angle) * size;
            var y2 = y1 + Math.sin(angle) * size;

            var s = {
                type: type,
                x1: x1, y1: y1, x2: x2, y2: y2,
                sides: 3 + Math.floor(Math.random() * 9),
                weight: 1 + Math.random() * 6,
                fill: Math.random() > 0.5,
                sym: Math.random() > 0.6 ? (2 + Math.floor(Math.random() * 3)) : 1,
                colorIdx: shapes.length,
                morph: 0,
                morphVel: 0
            };
            shapes.push(s);
        }
        updateTelemetry();
        redrawAll();
        showToast('已生成 ' + count + ' 个随机形状');
        spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
    }

    function exportPNG() {
        /* 创建一个带背景色的导出画布 */
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = cw * dpr;
        exportCanvas.height = ch * dpr;
        var exCtx = exportCanvas.getContext('2d');
        exCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        /* 背景 */
        exCtx.fillStyle = '#06060c';
        exCtx.fillRect(0, 0, cw, ch);

        /* 将主画布内容绘制到导出画布 */
        exCtx.drawImage(canvas, 0, 0, cw, ch);

        /* 下载 */
        var link = document.createElement('a');
        link.download = 'geo-painter-' + Date.now() + '.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();

        showToast('已导出 PNG');
        spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
    }

    /* =====================================================================
       === 遥测面板更新 ===
       ===================================================================== */

    function updateTelemetry() {
        telShapes.textContent = shapes.length;
        telSym.textContent = paramSym + '×';
        telMode.textContent = BRUSH_NAMES[currentBrush];
        brushCounter.textContent = BRUSH_NAMES[currentBrush];
    }

    /* =====================================================================
       === 画笔 / 参数 / 配色 绑定 ===
       ===================================================================== */

    function bindBrushes() {
        brushButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                brushButtons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentBrush = btn.getAttribute('data-brush');
                updateTelemetry();
                hudText.textContent = BRUSH_NAMES[currentBrush] + ' 画笔已选中';
                spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
            });
        });
    }

    function bindParams() {
        sliderSides.addEventListener('input', function () {
            paramSides = parseInt(sliderSides.value, 10);
            valSides.textContent = paramSides;
        });
        sliderWeight.addEventListener('input', function () {
            paramWeight = parseFloat(sliderWeight.value);
            valWeight.textContent = paramWeight;
        });
        sliderSym.addEventListener('input', function () {
            paramSym = parseInt(sliderSym.value, 10);
            valSym.textContent = paramSym + '×';
            telSym.textContent = paramSym + '×';
            redrawAll();
        });
        toggleFill.addEventListener('change', function () {
            paramFill = toggleFill.checked;
        });
    }

    function bindPalette() {
        paletteDots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                paletteDots.forEach(function (d) { d.classList.remove('active'); });
                dot.classList.add('active');
                var p = dot.getAttribute('data-palette');
                document.documentElement.setAttribute('data-palette', p);
                /* 颜色变化后重绘 (颜色依赖 CSS 变量) */
                setTimeout(redrawAll, 50);
                spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
            });
        });
    }

    function bindActions() {
        btnUndo.addEventListener('click', undo);
        btnRedo.addEventListener('click', redo);
        btnRandom.addEventListener('click', randomGenerate);
        btnClear.addEventListener('click', clearCanvas);
        btnExport.addEventListener('click', exportPNG);
    }

    /* =====================================================================
       === 键盘快捷键 ===
       ===================================================================== */

    function bindKeyboard() {
        window.addEventListener('keydown', function (e) {
            /* 避免在输入框中触发 */
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
                       ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                redo();
            } else if (e.key === 'r' || e.key === 'R') {
                randomGenerate();
            } else if (e.key === 'c' || e.key === 'C') {
                clearCanvas();
            } else if (e.key === 'e' || e.key === 'E') {
                exportPNG();
            } else if (e.key >= '1' && e.key <= '6') {
                var idx = parseInt(e.key, 10) - 1;
                if (brushButtons[idx]) brushButtons[idx].click();
            }
        });
    }

    /* =====================================================================
       === 光标光晕 ===
       ===================================================================== */

    var glowX = window.innerWidth / 2;
    var glowY = window.innerHeight / 2;
    var targetGlowX = glowX;
    var targetGlowY = glowY;

    function bindCursorGlow() {
        window.addEventListener('mousemove', function (e) {
            targetGlowX = e.clientX;
            targetGlowY = e.clientY;
            cursorGlow.classList.add('visible');
        });
        window.addEventListener('mouseleave', function () {
            cursorGlow.classList.remove('visible');
        });
    }

    function animateGlow() {
        glowX += (targetGlowX - glowX) * 0.12;
        glowY += (targetGlowY - glowY) * 0.12;
        cursorGlow.style.transform = 'translate(' + glowX + 'px, ' + glowY + 'px) translate(-50%, -50%)';
        requestAnimationFrame(animateGlow);
    }

    /* =====================================================================
       === 涟漪 ===
       ===================================================================== */

    function spawnRipple(x, y) {
        var r = document.createElement('div');
        r.className = 'ripple';
        r.style.left = x + 'px';
        r.style.top = y + 'px';
        rippleLayer.appendChild(r);
        setTimeout(function () {
            if (r.parentNode) r.parentNode.removeChild(r);
        }, 950);
    }

    /* =====================================================================
       === Toast ===
       ===================================================================== */

    var toastTimer = null;
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove('show');
        }, 2200);
    }

    /* =====================================================================
       === 粒子流场背景 ===
       ===================================================================== */

    var particles = [];
    var PARTICLE_COUNT = 46;

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                r: Math.random() * 1.6 + 0.4,
                a: Math.random() * 0.4 + 0.15
            });
        }
    }

    var mousePx = -9999, mousePy = -9999;
    window.addEventListener('mousemove', function (e) {
        mousePx = e.clientX;
        mousePy = e.clientY;
    });

    function getAccentRgb() {
        var v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        var m = v.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
        if (!m) return '122, 240, 200';
        return parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16);
    }

    function drawParticles() {
        pCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var accent = getAccentRgb();

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            /* 鼠标引力 */
            var dx = mousePx - p.x;
            var dy = mousePy - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && dist > 0.1) {
                var force = (180 - dist) / 180 * 0.04;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
            /* 阻尼 */
            p.vx *= 0.985;
            p.vy *= 0.985;

            /* 边界回绕 */
            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;

            pCtx.beginPath();
            pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            pCtx.fillStyle = 'rgba(' + accent + ', ' + p.a + ')';
            pCtx.fill();
        }

        /* 近邻连线 */
        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var pa = particles[a], pb = particles[b];
                var ddx = pa.x - pb.x, ddy = pa.y - pb.y;
                var d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d < 110) {
                    pCtx.beginPath();
                    pCtx.moveTo(pa.x, pa.y);
                    pCtx.lineTo(pb.x, pb.y);
                    pCtx.strokeStyle = 'rgba(' + accent + ', ' + (0.12 * (1 - d / 110)) + ')';
                    pCtx.lineWidth = 0.6;
                    pCtx.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }

    /* =====================================================================
       === 入场动画 ===
       ===================================================================== */

    function bindReveal() {
        var reveals = document.querySelectorAll('.reveal');
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        reveals.forEach(function (el) { io.observe(el); });
    }

    /* =====================================================================
       === 初始化 ===
       ===================================================================== */

    function init() {
        resizeCanvas();
        resizeParticleCanvas();
        initParticles();

        /* 绘画事件 */
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        /* 阻止触摸滚动 */
        canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

        bindBrushes();
        bindParams();
        bindPalette();
        bindActions();
        bindKeyboard();
        bindCursorGlow();

        /* 初始演示形状 (让画布不空) */
        seedDemoShapes();

        updateTelemetry();
        updateUndoRedoButtons();

        window.addEventListener('resize', function () {
            resizeCanvas();
            resizeParticleCanvas();
            initParticles();
        });

        animateGlow();
        animateMorph();
        drawParticles();
        bindReveal();
    }

    /* 初始演示形状 */
    function seedDemoShapes() {
        var demos = [
            { type: 'circle', x1: cw * 0.3, y1: ch * 0.4, x2: cw * 0.3 + 90, y2: ch * 0.4, sides: 6, weight: 3, fill: false, sym: 1 },
            { type: 'polygon', x1: cw * 0.65, y1: ch * 0.35, x2: cw * 0.65 + 70, y2: ch * 0.35, sides: 6, weight: 2.5, fill: false, sym: 1 },
            { type: 'star', x1: cw * 0.5, y1: ch * 0.65, x2: cw * 0.5 + 80, y2: ch * 0.65, sides: 5, weight: 2, fill: true, sym: 1 },
            { type: 'burst', x1: cw * 0.2, y1: ch * 0.7, x2: cw * 0.2 + 60, y2: ch * 0.7, sides: 8, weight: 1.5, fill: false, sym: 1 }
        ];
        demos.forEach(function (d, i) {
            d.colorIdx = i;
            d.morph = 0;
            d.morphVel = 0;
            shapes.push(d);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
