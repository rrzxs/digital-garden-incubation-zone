(function () {
    'use strict';

    /* =====================================================================
       Cognitive Load Scoring · 认知负荷计分仪
       交互逻辑: 六维评分引擎 · 实时雷达图 · 粒子流场 · 氛围配色
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

    /* === 六个评估维度模型 ===
       每个维度 0-10,含中英名 / 图标 / 描述 / 权重 / 分级话术 / 优化建议 */
    var DIMENSIONS = [
        {
            key: 'density',
            name: '信息密度',
            en: 'Information Density',
            glyph: '▦',
            desc: '同屏可见的信息单元数量与视觉饱和度',
            weight: 1.0,
            advice: '减少同屏可见元素,采用渐进式披露与折叠分组。重要信息上浮,次要细节下沉至二级。'
        },
        {
            key: 'switching',
            name: '上下文切换',
            en: 'Context Switching',
            glyph: '⇄',
            desc: '完成任务所需跨越的视图、模式或系统数量',
            weight: 1.2,
            advice: '合并相关任务到同一视图,减少弹窗与多标签跳转。保留面包屑与返回锚点以稳定心智模型。'
        },
        {
            key: 'decision',
            name: '决策复杂度',
            en: 'Decision Complexity',
            glyph: '◈',
            desc: '每次抉择所需权衡的选项与变量维度',
            weight: 1.1,
            advice: '提供智能默认与推荐路径,将多选简化为二选一。高阶选项收进"高级设置"。'
        },
        {
            key: 'memory',
            name: '工作记忆',
            en: 'Working Memory',
            glyph: '▤',
            desc: '需要用户在脑中暂存并回忆的信息量',
            weight: 1.15,
            advice: '外化记忆:把待记信息显式呈现于界面。用徽章、摘要、最近列表代替"请记住"。'
        },
        {
            key: 'clutter',
            name: '视觉杂乱',
            en: 'Visual Clutter',
            glyph: '∴',
            desc: '对比度、对齐、留白与装饰噪声的综合紊乱度',
            weight: 0.9,
            advice: '建立清晰的视觉层级与栅格,统一描边与色彩语言。剔除装饰性渐变与无意义动效。'
        },
        {
            key: 'time',
            name: '时间压力',
            en: 'Time Pressure',
            glyph: '⏱',
            desc: '任务时限紧迫感与可逆性程度',
            weight: 1.05,
            advice: '放宽或显式标注非真实时限,提供撤销与草稿自动保存。消除人为制造的倒计时焦虑。'
        }
    ];

    /* === 预设场景 === */
    var PRESETS = {
        reading:   { density: 4, switching: 2, decision: 2, memory: 3, clutter: 3, time: 1 },
        dashboard: { density: 8, switching: 5, decision: 6, memory: 7, clutter: 6, time: 4 },
        checkout:  { density: 5, switching: 4, decision: 5, memory: 5, clutter: 4, time: 8 },
        calm:      { density: 1, switching: 1, decision: 1, memory: 1, clutter: 1, time: 1 },
        chaos:     { density: 10, switching: 9, decision: 8, memory: 9, clutter: 10, time: 7 }
    };

    /* === 氛围配色 === */
    var PALETTES = {
        aurora: { accent: '#7af0c8', blobs: ['#7af0c8', '#7adcf0', '#b488f0'] },
        ember:  { accent: '#f0a07a', blobs: ['#f0a07a', '#f0d07a', '#f07a7a'] },
        abyss:  { accent: '#7aa8f0', blobs: ['#7aa8f0', '#7af0e8', '#a07af0'] },
        orchid: { accent: '#b488f0', blobs: ['#b488f0', '#887af0', '#f07ac8'] }
    };

    /* === 综合等级判定 === */
    function gradeFor(score) {
        if (score < 20) return { grade: 'A', load: 'low',  label: '极轻负荷', title: '心智如静水深流', desc: '当前设计近乎无负担,用户可沉浸专注。保持节奏,无需大幅调整。' };
        if (score < 40) return { grade: 'B', load: 'low',  label: '轻量负荷', title: '顺畅而清晰', desc: '整体负担可控。留意权重最高的维度,即可进一步降噪。' };
        if (score < 60) return { grade: 'C', load: 'mid',  label: '中度负荷', title: '需要适度专注', desc: '已有明显心智消耗。建议优化排名前两位的维度以释放认知带宽。' };
        if (score < 80) return { grade: 'D', load: 'mid',  label: '较高负荷', title: '接近疲劳临界', desc: '用户可能感到吃力。优先削减信息密度与上下文切换。' };
        return                { grade: 'F', load: 'high', label: '严重超载', title: '心智濒临过载', desc: '强烈建议重构。多项维度同时高企会引发放弃与错误率飙升。' };
    }

    /* === 应用状态 === */
    var state = {
        values: { density: 3, switching: 3, decision: 3, memory: 3, clutter: 3, time: 3 },
        palette: 'aurora',
        particles: []
    };

    /* =====================================================================
       DOM 元素引用
       ===================================================================== */

    var rubricList = document.getElementById('rubric-list');
    var presetBtns = document.getElementById('preset-btns');
    var resetBtn = document.getElementById('reset-btn');
    var orbScore = document.getElementById('orb-score');
    var orbLabel = document.getElementById('orb-label');
    var orbProgress = document.getElementById('orb-progress');
    var coreOrb = document.getElementById('core-orb');
    var verdictGrade = document.getElementById('verdict-grade');
    var verdictTitle = document.getElementById('verdict-title');
    var verdictDesc = document.getElementById('verdict-desc');
    var rankingEl = document.getElementById('ranking');
    var insightIcon = document.getElementById('insight-icon');
    var insightTitle = document.getElementById('insight-title');
    var insightText = document.getElementById('insight-text');
    var radarCanvas = document.getElementById('radar-canvas');
    var radarCtx = radarCanvas.getContext('2d');
    var particleCanvas = document.getElementById('particle-canvas');
    var pCtx = particleCanvas.getContext('2d');
    var rippleLayer = document.getElementById('ripple-layer');

    /* =====================================================================
       构建维度滑块
       ===================================================================== */

    DIMENSIONS.forEach(function (dim) {
        var item = document.createElement('div');
        item.className = 'rubric-item';
        item.setAttribute('data-key', dim.key);
        item.innerHTML =
            '<div class="rubric-top">' +
                '<span class="rubric-name"><span class="rubric-glyph">' + dim.glyph + '</span>' + dim.name + '</span>' +
                '<span class="rubric-value" data-value="' + dim.key + '">3</span>' +
            '</div>' +
            '<span class="rubric-desc">' + dim.desc + '</span>' +
            '<input type="range" class="rubric-slider" min="0" max="10" step="1" value="3" data-dim="' + dim.key + '" aria-label="' + dim.name + '评分">' +
            '<div class="rubric-scale"><span>0 无</span><span>5 中</span><span>10 极重</span></div>';
        rubricList.appendChild(item);
    });

    var sliders = document.querySelectorAll('.rubric-slider');
    var valueDisplays = document.querySelectorAll('.rubric-value');
    var rubricItems = document.querySelectorAll('.rubric-item');

    sliders.forEach(function (slider) {
        slider.addEventListener('input', function () {
            var key = slider.getAttribute('data-dim');
            var val = parseInt(slider.value, 10);
            state.values[key] = val;
            bumpValue(key, val);
            updateSliderTrack(slider, val);
            recompute();
        });
        updateSliderTrack(slider, parseInt(slider.value, 10));
    });

    function bumpValue(key, val) {
        valueDisplays.forEach(function (el) {
            if (el.getAttribute('data-value') === key) {
                el.textContent = val;
                el.classList.add('bump');
                setTimeout(function () { el.classList.remove('bump'); }, 280);
            }
        });
    }

    function updateSliderTrack(slider, val) {
        var pct = (val / 10) * 100;
        var theme = PALETTES[state.palette];
        var color = theme.accent;
        slider.style.background =
            'linear-gradient(to right, ' + color + ' 0%, ' + color + ' ' + pct + '%, rgba(255,255,255,0.08) ' + pct + '%, rgba(255,255,255,0.08) 100%)';
    }

    /* =====================================================================
       预设 & 重置
       ===================================================================== */

    presetBtns.querySelectorAll('.preset-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var preset = PRESETS[btn.getAttribute('data-preset')];
            if (!preset) return;
            applyValues(preset);
        });
    });

    resetBtn.addEventListener('click', function () {
        applyValues({ density: 3, switching: 3, decision: 3, memory: 3, clutter: 3, time: 3 });
    });

    function applyValues(values) {
        Object.keys(values).forEach(function (key) {
            state.values[key] = values[key];
            sliders.forEach(function (slider) {
                if (slider.getAttribute('data-dim') === key) {
                    slider.value = values[key];
                    updateSliderTrack(slider, values[key]);
                }
            });
            valueDisplays.forEach(function (el) {
                if (el.getAttribute('data-value') === key) {
                    el.textContent = values[key];
                }
            });
        });
        recompute();
    }

    /* =====================================================================
       评分引擎:加权综合分 + 排名 + 洞察
       ===================================================================== */

    function recompute() {
        var totalWeight = 0;
        var weightedSum = 0;
        var ranked = [];

        DIMENSIONS.forEach(function (dim) {
            var v = state.values[dim.key];
            weightedSum += v * dim.weight;
            totalWeight += dim.weight;
            ranked.push({ key: dim.key, name: dim.name, glyph: dim.glyph, value: v, weight: dim.weight, advice: dim.advice });
        });

        var avg = weightedSum / totalWeight;             // 0-10
        var score = Math.round(avg * 10);                 // 0-100
        var grade = gradeFor(score);

        // 更新核心读数
        orbScore.textContent = score;
        orbLabel.textContent = grade.label;
        coreOrb.setAttribute('data-load', grade.load);

        // 进度环
        var circumference = 653.45; // 2 * PI * 104
        orbProgress.style.strokeDashoffset = String(circumference * (1 - score / 100));

        // 判定卡
        verdictGrade.textContent = grade.grade;
        verdictTitle.textContent = grade.title;
        verdictDesc.textContent = grade.desc;

        // 高亮高负荷维度项 (>=7)
        rubricItems.forEach(function (item) {
            var key = item.getAttribute('data-key');
            item.classList.toggle('is-hot', state.values[key] >= 7);
        });

        // 排名 (按加权得分)
        ranked.sort(function (a, b) {
            return (b.value * b.weight) - (a.value * a.weight);
        });
        renderRanking(ranked);

        // 洞察:取最高维度给出建议
        var top = ranked[0];
        if (top.value === 0) {
            insightIcon.textContent = '◎';
            insightTitle.textContent = '空白画布';
            insightText.textContent = '所有维度归零 —— 这是一个近乎冥想的纯然体验。';
        } else {
            insightIcon.textContent = top.glyph;
            insightTitle.textContent = '首要瓶颈 · ' + top.name;
            insightText.textContent = top.advice;
        }

        // 雷达图重绘
        drawRadar();
    }

    function renderRanking(ranked) {
        var maxWeighted = Math.max.apply(null, ranked.map(function (r) { return r.value * r.weight; })) || 1;
        rankingEl.innerHTML = '';
        ranked.forEach(function (r, idx) {
            var row = document.createElement('div');
            row.className = 'rank-item';
            row.style.animationDelay = (idx * 0.05) + 's';
            var fillPct = (r.value * r.weight) / maxWeighted;
            row.innerHTML =
                '<span class="rank-num">' + (idx + 1) + '</span>' +
                '<span class="rank-name">' + r.name + '</span>' +
                '<span class="rank-bar-wrap"><span class="rank-bar" style="transform: scaleX(' + fillPct.toFixed(3) + ')"></span></span>';
            rankingEl.appendChild(row);
        });
    }

    /* =====================================================================
       雷达图绘制
       ===================================================================== */

    var radarDpr = Math.min(window.devicePixelRatio || 1, 2);
    var RADAR_SIZE = 440;

    function setupRadarCanvas() {
        radarCanvas.width = RADAR_SIZE * radarDpr;
        radarCanvas.height = RADAR_SIZE * radarDpr;
        radarCtx.setTransform(radarDpr, 0, 0, radarDpr, 0, 0);
    }
    setupRadarCanvas();

    function drawRadar() {
        var ctx = radarCtx;
        var size = RADAR_SIZE;
        var cx = size / 2;
        var cy = size / 2;
        var maxR = size * 0.36;
        var n = DIMENSIONS.length;
        var theme = PALETTES[state.palette];
        var accent = theme.accent;
        var accentRgba = hexToRgba(accent, 1);

        ctx.clearRect(0, 0, size, size);

        // 背景网格 (5 层多边形)
        var rings = 5;
        for (var ring = 1; ring <= rings; ring++) {
            var r = (maxR / rings) * ring;
            ctx.beginPath();
            for (var i = 0; i < n; i++) {
                var ang = (Math.PI * 2 * i / n) - Math.PI / 2;
                var px = cx + Math.cos(ang) * r;
                var py = cy + Math.sin(ang) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.04 + ring * 0.012) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 轴线
        for (var a = 0; a < n; a++) {
            var angA = (Math.PI * 2 * a / n) - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angA) * maxR, cy + Math.sin(angA) * maxR);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 数据多边形
        ctx.beginPath();
        for (var d = 0; d < n; d++) {
            var val = state.values[DIMENSIONS[d].key];
            var ratio = val / 10;
            var angD = (Math.PI * 2 * d / n) - Math.PI / 2;
            var px = cx + Math.cos(angD) * maxR * ratio;
            var py = cy + Math.sin(angD) * maxR * ratio;
            if (d === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // 填充渐变
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        grad.addColorStop(0, hexToRgba(accent, 0.32));
        grad.addColorStop(1, hexToRgba(accent, 0.06));
        ctx.fillStyle = grad;
        ctx.fill();

        // 描边发光
        ctx.strokeStyle = accentRgba;
        ctx.lineWidth = 2;
        ctx.shadowColor = accentRgba;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 顶点
        for (var v = 0; v < n; v++) {
            var valV = state.values[DIMENSIONS[v].key];
            var ratioV = valV / 10;
            var angV = (Math.PI * 2 * v / n) - Math.PI / 2;
            var pvx = cx + Math.cos(angV) * maxR * ratioV;
            var pvy = cy + Math.sin(angV) * maxR * ratioV;

            ctx.beginPath();
            ctx.arc(pvx, pvy, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = accentRgba;
            ctx.stroke();
        }

        // 维度标签
        ctx.font = '500 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var l = 0; l < n; l++) {
            var angL = (Math.PI * 2 * l / n) - Math.PI / 2;
            var labelR = maxR + 30;
            var lx = cx + Math.cos(angL) * labelR;
            var ly = cy + Math.sin(angL) * labelR;
            var valL = state.values[DIMENSIONS[l].key];
            var isHot = valL >= 7;
            ctx.fillStyle = isHot ? accentRgba : 'rgba(255,255,255,0.55)';
            ctx.fillText(DIMENSIONS[l].name, lx, ly);
            // 数值
            ctx.font = '400 10px "Share Tech Mono", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText(String(valL), lx, ly + 14);
            ctx.font = '500 12px Inter, sans-serif';
        }
    }

    /* =====================================================================
       粒子流场背景
       ===================================================================== */

    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeParticleCanvas() {
        particleCanvas.width = window.innerWidth * dpr;
        particleCanvas.height = window.innerHeight * dpr;
        particleCanvas.style.width = window.innerWidth + 'px';
        particleCanvas.style.height = window.innerHeight + 'px';
        pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeParticleCanvas();
    window.addEventListener('resize', function () {
        resizeParticleCanvas();
        initParticles();
    });

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.28,
            vy: (Math.random() - 0.5) * 0.28,
            radius: Math.random() * 1.8 + 0.4,
            opacity: Math.random() * 0.3 + 0.05,
            phase: Math.random() * Math.PI * 2
        };
    }

    function initParticles() {
        state.particles = [];
        var count = Math.min(Math.floor(window.innerWidth * window.innerHeight / 14000), 70);
        for (var i = 0; i < count; i++) state.particles.push(createParticle());
    }
    initParticles();

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function updateParticles() {
        var t = Date.now() * 0.001;
        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var force = Math.max(0, 1 - dist / 220);
            p.vx += dx * force * 0.00004;
            p.vy += dy * force * 0.00004;
            p.vx += Math.sin(t + p.phase) * 0.0028;
            p.vy += Math.cos(t + p.phase) * 0.0028;
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx;
            p.y += p.vy;
            p.opacity = (Math.sin(t * 0.5 + p.phase) * 0.14 + 0.14);

            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;
        }
    }

    function drawParticles() {
        pCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var accent = PALETTES[state.palette].accent;
        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            pCtx.beginPath();
            pCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            pCtx.fillStyle = hexToRgba(accent, p.opacity);
            pCtx.fill();
        }
        // 近邻连线
        for (var a = 0; a < state.particles.length; a++) {
            for (var b = a + 1; b < state.particles.length; b++) {
                var pa = state.particles[a];
                var pb = state.particles[b];
                var ddx = pa.x - pb.x;
                var ddy = pa.y - pb.y;
                var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dd < 110) {
                    pCtx.beginPath();
                    pCtx.moveTo(pa.x, pa.y);
                    pCtx.lineTo(pb.x, pb.y);
                    pCtx.strokeStyle = hexToRgba(accent, (1 - dd / 110) * 0.05);
                    pCtx.lineWidth = 0.5;
                    pCtx.stroke();
                }
            }
        }
    }

    function animLoop() {
        updateParticles();
        drawParticles();
        requestAnimationFrame(animLoop);
    }
    requestAnimationFrame(animLoop);

    /* =====================================================================
       涟漪层
       ===================================================================== */

    document.addEventListener('click', function (e) {
        if (e.target.closest('.back-link') || e.target.closest('.palette-dot')) return;
        var ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = (e.clientX - 160) + 'px';
        ripple.style.top = (e.clientY - 160) + 'px';
        rippleLayer.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 900);
    });

    /* =====================================================================
       氛围配色切换
       ===================================================================== */

    var paletteDots = document.querySelectorAll('.palette-dot');
    var blobs = document.querySelectorAll('.blob');

    paletteDots.forEach(function (dot) {
        dot.addEventListener('click', function () {
            var key = dot.getAttribute('data-palette');
            if (!PALETTES[key]) return;
            paletteDots.forEach(function (d) { d.classList.remove('active'); });
            dot.classList.add('active');
            state.palette = key;
            applyPaletteTheme(key);
            // 滑块轨道色与雷达图实时刷新
            sliders.forEach(function (s) { updateSliderTrack(s, parseInt(s.value, 10)); });
            drawRadar();
            recompute();
        });
    });

    function applyPaletteTheme(key) {
        document.documentElement.setAttribute('data-palette', key);
        var theme = PALETTES[key];
        var blobOrder = [theme.blobs[0], theme.blobs[2], theme.blobs[1], theme.blobs[0], theme.blobs[1]];
        blobs.forEach(function (blob, i) {
            var color = blobOrder[i % blobOrder.length];
            blob.style.background = 'radial-gradient(circle, ' + color + ', transparent 70%)';
        });
    }
    applyPaletteTheme(state.palette);

    /* =====================================================================
       工具函数
       ===================================================================== */

    function hexToRgba(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    // 为动态过渡预备的内联 transition (JS 注入以保持 CSS 简洁)
    [orbScore, orbLabel, verdictGrade, insightIcon].forEach(function (el) {
        el.style.transition = 'color 0.6s ' + EASE;
    });
    valueDisplays.forEach(function (el) {
        el.style.transition = 'color 0.4s ' + EASE + ', transform 0.4s ' + SPRING;
    });

    /* =====================================================================
       初始化
       ===================================================================== */

    recompute();

})();
