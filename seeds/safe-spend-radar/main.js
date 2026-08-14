(function () {
    'use strict';

    /* =====================================================================
       Safe Spend Radar · 安全消费雷达
       交互逻辑: 六维消费雷达 · 预算管理 · 智能建议 · 粒子流场 · 氛围配色
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

    /* === 六个消费类别模型 === */
    var CATEGORIES = [
        { key: 'food',          name: '餐饮', en: 'Food',     emoji: '🍽', defaultBudget: 2000 },
        { key: 'transport',     name: '交通', en: 'Transport', emoji: '🚌', defaultBudget: 800 },
        { key: 'shopping',      name: '购物', en: 'Shopping',  emoji: '🛍', defaultBudget: 1500 },
        { key: 'entertainment', name: '娱乐', en: 'Leisure',   emoji: '🎮', defaultBudget: 600 },
        { key: 'housing',       name: '居家', en: 'Housing',   emoji: '🏠', defaultBudget: 3000 },
        { key: 'health',        name: '健康', en: 'Health',    emoji: '💊', defaultBudget: 500 }
    ];

    /* === 快捷预设场景 === */
    var PRESETS = {
        student: {
            label: '🎓 学生',
            budgets: { food: 1200, transport: 300, shopping: 500, entertainment: 400, housing: 1500, health: 200 },
            entries: [
                { name: '食堂午餐', amount: 18, cat: 'food' },
                { name: '地铁通勤', amount: 6, cat: 'transport' },
                { name: '教材', amount: 85, cat: 'shopping' },
                { name: '电影票', amount: 35, cat: 'entertainment' }
            ]
        },
        freelancer: {
            label: '💻 自由职业',
            budgets: { food: 2500, transport: 600, shopping: 1000, entertainment: 800, housing: 4000, health: 600 },
            entries: [
                { name: '咖啡厅办公', amount: 45, cat: 'food' },
                { name: '网约车', amount: 32, cat: 'transport' },
                { name: '机械键盘', amount: 580, cat: 'shopping' },
                { name: '健身房月卡', amount: 280, cat: 'health' }
            ]
        },
        family: {
            label: '👨‍👩‍👧 家庭',
            budgets: { food: 4000, transport: 1200, shopping: 2000, entertainment: 800, housing: 5000, health: 1000 },
            entries: [
                { name: '超市采购', amount: 320, cat: 'food' },
                { name: '加油', amount: 280, cat: 'transport' },
                { name: '儿童玩具', amount: 159, cat: 'shopping' },
                { name: '家庭出游', amount: 480, cat: 'entertainment' },
                { name: '电费', amount: 220, cat: 'housing' }
            ]
        },
        minimal: {
            label: '🍃 极简',
            budgets: { food: 800, transport: 200, shopping: 300, entertainment: 200, housing: 1000, health: 200 },
            entries: [
                { name: '自制简餐', amount: 12, cat: 'food' }
            ]
        }
    };

    /* === DOM Elements === */
    var elEntriesList = document.getElementById('entries-list');
    var elFooterTotal = document.getElementById('footer-total');
    var elRadarSpend = document.getElementById('radar-spend');
    var elRadarGrid = document.getElementById('radar-grid');
    var elRadarBudget = document.getElementById('radar-budget');
    var elRadarAxes = document.getElementById('radar-axes');
    var elRadarLabels = document.getElementById('radar-labels');
    var elRadarDefs = document.getElementById('radar-defs');
    var elRadarStats = document.getElementById('radar-stats');
    var elHealthBadge = document.getElementById('health-badge');
    var elHealthText = elHealthBadge.querySelector('.health-text');
    var elBudgetList = document.getElementById('budget-list');
    var elAdviceContent = document.getElementById('advice-content');
    var elSummarySpent = document.getElementById('summary-spent');
    var elSummaryBudget = document.getElementById('summary-budget');
    var elSummaryRemaining = document.getElementById('summary-remaining');

    /* === State === */
    var state = {
        entries: [],
        budgets: {},
        period: 'month'
    };

    var RADII = [36, 72, 108, 144, 180];
    var AXIS_COUNT = 6;
    var MAX_RADIUS = 180;

    /* === 初始化默认预算 === */
    function initBudgets() {
        CATEGORIES.forEach(function (cat) {
            state.budgets[cat.key] = cat.defaultBudget;
        });
    }

    /* === Simplex 噪声（简化版）用于粒子流场 === */
    var noiseSeed = Math.random() * 1000;
    function noise2D(x, y) {
        var n = Math.sin(x * 2.1 + noiseSeed) * Math.cos(y * 1.7 + noiseSeed * 0.5) +
                Math.sin(x * 0.8 + y * 1.3) * 0.5;
        return n * 0.5;
    }

    /* === 粒子流场 === */
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas ? canvas.getContext('2d') : null;
    var particles = [];
    var PARTICLE_COUNT = 60;
    var mouseX = -9999, mouseY = -9999;

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initParticles() {
        if (!ctx) return;
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: 0, vy: 0,
                life: Math.random() * 200 + 100,
                maxLife: 300,
                size: Math.random() * 1.5 + 0.5
            });
        }
    }

    function getAccentRGB() {
        var accent = getComputedStyle(document.body).getPropertyValue('--accent').trim();
        var hex = accent.replace('#', '');
        if (hex.length === 6) {
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16)
            };
        }
        return { r: 122, g: 240, b: 200 };
    }

    function animateParticles() {
        if (!ctx) { requestAnimationFrame(animateParticles); return; }
        ctx.fillStyle = 'rgba(7, 7, 13, 0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var rgb = getAccentRGB();
        var t = Date.now() * 0.0003;

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var nx = noise2D(p.x * 0.003, p.y * 0.003 + t);
            var ny = noise2D(p.x * 0.003 + 100, p.y * 0.003 + t);

            p.vx += nx * 0.3;
            p.vy += ny * 0.3;
            p.vx *= 0.95;
            p.vy *= 0.95;

            /* 鼠标排斥 */
            var dx = p.x - mouseX;
            var dy = p.y - mouseY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120 && dist > 0) {
                var force = (120 - dist) / 120;
                p.vx += (dx / dist) * force * 2;
                p.vy += (dy / dist) * force * 2;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
                p.x = Math.random() * canvas.width;
                p.y = Math.random() * canvas.height;
                p.vx = 0; p.vy = 0;
                p.life = Math.random() * 200 + 100;
            }

            var alpha = (p.life / p.maxLife) * 0.6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
            ctx.fill();
        }

        requestAnimationFrame(animateParticles);
    }

    /* === 雷达图绘制 === */
    function getCategoryAngle(index) {
        return (index / AXIS_COUNT) * Math.PI * 2 - Math.PI / 2;
    }

    function buildRadarGrid() {
        var svgNS = 'http://www.w3.org/2000/svg';
        elRadarGrid.innerHTML = '';
        elRadarAxes.innerHTML = '';
        elRadarLabels.innerHTML = '';
        elRadarDefs.innerHTML = '';

        /* 同心多边形 */
        for (var r = 0; r < RADII.length; r++) {
            var points = [];
            for (var i = 0; i < AXIS_COUNT; i++) {
                var angle = getCategoryAngle(i);
                points.push((Math.cos(angle) * RADII[r]).toFixed(1) + ',' + (Math.sin(angle) * RADII[r]).toFixed(1));
            }
            var poly = document.createElementNS(svgNS, 'polygon');
            poly.setAttribute('points', points.join(' '));
            elRadarGrid.appendChild(poly);
        }

        /* 轴线 */
        for (var a = 0; a < AXIS_COUNT; a++) {
            var ang = getCategoryAngle(a);
            var line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', '0');
            line.setAttribute('x2', (Math.cos(ang) * MAX_RADIUS).toFixed(1));
            line.setAttribute('y2', (Math.sin(ang) * MAX_RADIUS).toFixed(1));
            elRadarAxes.appendChild(line);
        }

        /* 标签 */
        for (var l = 0; l < AXIS_COUNT; l++) {
            var lang = getCategoryAngle(l);
            var lx = Math.cos(lang) * (MAX_RADIUS + 30);
            var ly = Math.sin(lang) * (MAX_RADIUS + 30);
            var cat = CATEGORIES[l];

            var labelGroup = document.createElementNS(svgNS, 'g');
            labelGroup.setAttribute('transform', 'translate(' + lx.toFixed(1) + ',' + ly.toFixed(1) + ')');

            var textEmoji = document.createElementNS(svgNS, 'text');
            textEmoji.setAttribute('y', '-6');
            textEmoji.setAttribute('font-size', '16');
            textEmoji.setAttribute('text-anchor', 'middle');
            textEmoji.textContent = cat.emoji;
            labelGroup.appendChild(textEmoji);

            var textName = document.createElementNS(svgNS, 'text');
            textName.setAttribute('y', '8');
            textName.setAttribute('class', '');
            textName.setAttribute('fill', 'rgba(255,255,255,0.58)');
            textName.setAttribute('font-size', '10');
            textName.setAttribute('font-family', 'Share Tech Mono, monospace');
            textName.setAttribute('text-anchor', 'middle');
            textName.textContent = cat.name;
            labelGroup.appendChild(textName);

            var textValue = document.createElementNS(svgNS, 'text');
            textValue.setAttribute('y', '22');
            textValue.setAttribute('class', 'label-value');
            textValue.setAttribute('id', 'label-val-' + cat.key);
            textValue.textContent = '¥0';
            labelGroup.appendChild(textValue);

            elRadarLabels.appendChild(labelGroup);
        }

        /* 扫描渐变 */
        var sweepDef = document.createElementNS(svgNS, 'linearGradient');
        sweepDef.setAttribute('id', 'sweep-grad');
        sweepDef.setAttribute('x1', '0'); sweepDef.setAttribute('y1', '0');
        sweepDef.setAttribute('x2', '0'); sweepDef.setAttribute('y2', '1');
        var stop1 = document.createElementNS(svgNS, 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', 'var(--accent)');
        stop1.setAttribute('stop-opacity', '0.8');
        var stop2 = document.createElementNS(svgNS, 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', 'var(--accent)');
        stop2.setAttribute('stop-opacity', '0');
        sweepDef.appendChild(stop1);
        sweepDef.appendChild(stop2);
        elRadarDefs.appendChild(sweepDef);

        /* 预算安全线 */
        elRadarBudget.innerHTML = '';
        var budgetPoints = [];
        for (var b = 0; b < AXIS_COUNT; b++) {
            var bang = getCategoryAngle(b);
            budgetPoints.push((Math.cos(bang) * MAX_RADIUS * 0.8).toFixed(1) + ',' + (Math.sin(bang) * MAX_RADIUS * 0.8).toFixed(1));
        }
        var budgetPoly = document.createElementNS(svgNS, 'polygon');
        budgetPoly.setAttribute('points', budgetPoints.join(' '));
        budgetPoly.setAttribute('class', 'radar-budget-poly');
        budgetPoly.setAttribute('fill', 'rgba(255,255,255,0.02)');
        budgetPoly.setAttribute('stroke', 'rgba(255,255,255,0.12)');
        budgetPoly.setAttribute('stroke-width', '1.5');
        budgetPoly.setAttribute('stroke-dasharray', '4 4');
        elRadarBudget.appendChild(budgetPoly);
    }

    function updateRadarSpend() {
        var svgNS = 'http://www.w3.org/2000/svg';
        var points = [];
        var overCount = 0;

        for (var i = 0; i < AXIS_COUNT; i++) {
            var cat = CATEGORIES[i];
            var spent = getCategorySpent(cat.key);
            var budget = state.budgets[cat.key] || 0;
            var ratio = budget > 0 ? spent / budget : 0;
            var radius = ratio * MAX_RADIUS * 0.8;

            if (radius > MAX_RADIUS * 0.8) {
                radius = MAX_RADIUS * 0.8;
                overCount++;
            }

            var angle = getCategoryAngle(i);
            points.push((Math.cos(angle) * radius).toFixed(1) + ',' + (Math.sin(angle) * radius).toFixed(1));

            /* 更新标签数值 */
            var labelEl = document.getElementById('label-val-' + cat.key);
            if (labelEl) {
                labelEl.textContent = '¥' + formatNumber(spent);
                if (ratio > 1) {
                    labelEl.setAttribute('class', 'label-value label-over');
                } else {
                    labelEl.setAttribute('class', 'label-value');
                }
            }
        }

        elRadarSpend.setAttribute('points', points.join(' '));

        /* 健康状态 */
        updateHealthBadge(overCount);

        /* 更新统计数据 */
        updateRadarStats(overCount);
    }

    function updateHealthBadge(overCount) {
        elHealthBadge.classList.remove('danger', 'warn');
        if (overCount >= 2) {
            elHealthBadge.classList.add('danger');
            elHealthText.textContent = '危险 · ' + overCount + ' 项超支';
        } else if (overCount === 1) {
            elHealthBadge.classList.add('warn');
            elHealthText.textContent = '警告 · 1 项超支';
        } else {
            var totalSpent = getTotalSpent();
            var totalBudget = getTotalBudget();
            var overallRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;
            if (overallRatio > 0.8) {
                elHealthBadge.classList.add('warn');
                elHealthText.textContent = '注意 · 预算紧张';
            } else {
                elHealthText.textContent = '安全 · 预算健康';
            }
        }
    }

    function updateRadarStats(overCount) {
        var totalSpent = getTotalSpent();
        var totalBudget = getTotalBudget();
        var remaining = totalBudget - totalSpent;
        var usageRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

        var safeCats = AXIS_COUNT - overCount;

        elRadarStats.innerHTML =
            statHTML(usageRate + '%', 'USAGE') +
            statHTML(safeCats + '/' + AXIS_COUNT, 'SAFE') +
            statHTML(overCount + '', 'OVER') +
            statHTML('¥' + formatNumber(Math.abs(remaining)), remaining >= 0 ? 'LEFT' : 'DEFICIT');
    }

    function statHTML(value, label) {
        return '<div class="radar-stat">' +
            '<span class="radar-stat-value">' + value + '</span>' +
            '<span class="radar-stat-label">' + label + '</span>' +
            '</div>';
    }

    /* === 预算列表渲染 === */
    function renderBudgetList() {
        elBudgetList.innerHTML = '';
        CATEGORIES.forEach(function (cat) {
            var spent = getCategorySpent(cat.key);
            var budget = state.budgets[cat.key] || 0;
            var ratio = budget > 0 ? spent / budget : 0;
            var pct = Math.min(ratio * 100, 100);
            var barClass = ratio > 1 ? 'over' : (ratio > 0.8 ? 'warn' : '');
            var valClass = ratio > 1 ? 'over' : (ratio > 0.8 ? 'warn' : '');

            var row = document.createElement('div');
            row.className = 'budget-row';
            row.innerHTML =
                '<div class="budget-row-head">' +
                    '<span class="budget-row-label">' +
                        '<span class="budget-row-emoji">' + cat.emoji + '</span>' +
                        '<span>' + cat.name + '</span>' +
                    '</span>' +
                    '<span class="budget-row-value ' + valClass + '">¥' + formatNumber(spent) + ' / ¥' + formatNumber(budget) + '</span>' +
                '</div>' +
                '<input type="range" class="budget-slider" data-cat="' + cat.key + '" ' +
                    'min="0" max="10000" step="100" value="' + budget + '" />' +
                '<div class="budget-bar">' +
                    '<div class="budget-bar-fill ' + barClass + '" style="width:' + pct + '%"></div>' +
                '</div>';

            elBudgetList.appendChild(row);
        });

        /* 绑定滑块 */
        var sliders = elBudgetList.querySelectorAll('.budget-slider');
        sliders.forEach(function (slider) {
            slider.addEventListener('input', function (e) {
                var catKey = e.target.getAttribute('data-cat');
                state.budgets[catKey] = parseInt(e.target.value, 10);
                updateAll();
            });
        });
    }

    /* === 消费列表渲染 === */
    function renderEntries() {
        elEntriesList.innerHTML = '';
        if (state.entries.length === 0) {
            elEntriesList.innerHTML = '<div class="empty-state">暂无消费记录<br>添加第一笔支出开始追踪</div>';
        } else {
            state.entries.forEach(function (entry, index) {
                var cat = getCategoryByKey(entry.cat);
                var item = document.createElement('div');
                item.className = 'entry-item';
                item.style.animationDelay = (index * 0.05) + 's';
                item.innerHTML =
                    '<span class="entry-icon">' + (cat ? cat.emoji : '◈') + '</span>' +
                    '<div class="entry-info">' +
                        '<div class="entry-name">' + escapeHTML(entry.name) + '</div>' +
                        '<div class="entry-cat">' + (cat ? cat.en.toUpperCase() : 'OTHER') + '</div>' +
                    '</div>' +
                    '<span class="entry-amount">¥' + formatNumber(entry.amount) + '</span>' +
                    '<button class="entry-delete" data-index="' + index + '" aria-label="删除">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                            '<line x1="18" y1="6" x2="6" y2="18"/>' +
                            '<line x1="6" y1="6" x2="18" y2="18"/>' +
                        '</svg>' +
                    '</button>';

                elEntriesList.appendChild(item);
            });

            /* 绑定删除 */
            var delBtns = elEntriesList.querySelectorAll('.entry-delete');
            delBtns.forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    var idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                    removeEntry(idx);
                });
            });
        }

        elFooterTotal.textContent = '¥' + formatNumber(getTotalSpent());
    }

    /* === 智能建议 === */
    function renderAdvice() {
        var advice = [];
        var totalSpent = getTotalSpent();
        var totalBudget = getTotalBudget();

        CATEGORIES.forEach(function (cat) {
            var spent = getCategorySpent(cat.key);
            var budget = state.budgets[cat.key] || 0;
            if (budget === 0) return;
            var ratio = spent / budget;

            if (ratio > 1) {
                advice.push({
                    type: 'danger',
                    icon: '⚠',
                    text: cat.emoji + ' ' + cat.name + '已超支 ¥' + formatNumber(spent - budget) + '，建议下' + periodLabel() + '削减或增加预算。'
                });
            } else if (ratio > 0.8) {
                advice.push({
                    type: 'warn',
                    icon: '◐',
                    text: cat.emoji + ' ' + cat.name + '已使用 ' + Math.round(ratio * 100) + '%，接近预算上限，请谨慎消费。'
                });
            }
        });

        if (totalBudget > 0) {
            var overallRatio = totalSpent / totalBudget;
            if (overallRatio < 0.5 && advice.length === 0) {
                advice.push({
                    type: 'ok',
                    icon: '✓',
                    text: '消费状况良好，仅使用预算的 ' + Math.round(overallRatio * 100) + '%。可考虑增加储蓄或投资。'
                });
            } else if (overallRatio < 0.3) {
                advice.push({
                    type: 'ok',
                    icon: '✓',
                    text: '消费极为克制，预算使用率仅 ' + Math.round(overallRatio * 100) + '%，继续保持！'
                });
            }
        }

        /* 找出最高消费类别 */
        var topCat = null;
        var topAmount = 0;
        CATEGORIES.forEach(function (cat) {
            var spent = getCategorySpent(cat.key);
            if (spent > topAmount) {
                topAmount = spent;
                topCat = cat;
            }
        });
        if (topCat && topAmount > 0) {
            var totalPct = totalSpent > 0 ? Math.round((topAmount / totalSpent) * 100) : 0;
            if (totalPct > 40) {
                advice.push({
                    type: 'info',
                    icon: '◎',
                    text: topCat.emoji + ' ' + topCat.name + '占总支出的 ' + totalPct + '%，是本' + periodLabel() + '最大的消费方向。'
                });
            }
        }

        if (advice.length === 0) {
            advice.push({
                type: 'ok',
                icon: '◉',
                text: '各品类消费均在安全范围内，雷达全绿，继续保持理性消费习惯。'
            });
        }

        elAdviceContent.innerHTML = '';
        advice.forEach(function (item, i) {
            var div = document.createElement('div');
            div.className = 'advice-item ' + (item.type === 'danger' ? 'danger' : (item.type === 'warn' ? 'warn' : ''));
            div.style.animationDelay = (i * 0.08) + 's';
            div.innerHTML = '<span class="advice-icon">' + item.icon + '</span><span>' + item.text + '</span>';
            elAdviceContent.appendChild(div);
        });
    }

    /* === 汇总行 === */
    function renderSummary() {
        var totalSpent = getTotalSpent();
        var totalBudget = getTotalBudget();
        var remaining = totalBudget - totalSpent;

        elSummarySpent.textContent = '¥' + formatNumber(totalSpent);
        elSummaryBudget.textContent = '¥' + formatNumber(totalBudget);
        elSummaryRemaining.textContent = '¥' + formatNumber(Math.abs(remaining));
        elSummaryRemaining.classList.toggle('over', remaining < 0);
    }

    /* === 工具函数 === */
    function getCategorySpent(catKey) {
        var total = 0;
        state.entries.forEach(function (e) {
            if (e.cat === catKey) total += e.amount;
        });
        return total;
    }

    function getCategoryByKey(key) {
        for (var i = 0; i < CATEGORIES.length; i++) {
            if (CATEGORIES[i].key === key) return CATEGORIES[i];
        }
        return null;
    }

    function getTotalSpent() {
        return state.entries.reduce(function (sum, e) { return sum + e.amount; }, 0);
    }

    function getTotalBudget() {
        return CATEGORIES.reduce(function (sum, cat) {
            return sum + (state.budgets[cat.key] || 0);
        }, 0);
    }

    function formatNumber(n) {
        if (n >= 10000) {
            return (n / 10000).toFixed(1) + 'w';
        }
        return n.toFixed(n < 100 ? 1 : 0).replace(/\.0$/, '');
    }

    function periodLabel() {
        return state.period === 'week' ? '周' : (state.period === 'year' ? '年' : '月');
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* === 数据操作 === */
    function addEntry(name, amount, cat) {
        if (!name || !amount || amount <= 0) return false;
        state.entries.push({ name: name, amount: parseFloat(amount), cat: cat });
        updateAll();
        return true;
    }

    function removeEntry(index) {
        state.entries.splice(index, 1);
        updateAll();
    }

    function applyPreset(presetKey) {
        var preset = PRESETS[presetKey];
        if (!preset) return;
        state.entries = [];
        CATEGORIES.forEach(function (cat) {
            state.budgets[cat.key] = preset.budgets[cat.key] !== undefined ? preset.budgets[cat.key] : cat.defaultBudget;
        });
        preset.entries.forEach(function (e) {
            state.entries.push({ name: e.name, amount: e.amount, cat: e.cat });
        });
        updateAll();
    }

    function clearAll() {
        state.entries = [];
        updateAll();
    }

    /* === 统一更新 === */
    function updateAll() {
        renderEntries();
        renderBudgetList();
        updateRadarSpend();
        renderAdvice();
        renderSummary();
    }

    /* === 事件绑定 === */
    function bindEvents() {
        /* 添加消费 */
        var btnAdd = document.getElementById('btn-add-entry');
        var entryName = document.getElementById('entry-name');
        var entryAmount = document.getElementById('entry-amount');
        var entryCat = document.getElementById('entry-category');

        function handleAdd() {
            var name = entryName.value.trim();
            var amount = parseFloat(entryAmount.value);
            var cat = entryCat.value;
            if (addEntry(name, amount, cat)) {
                entryName.value = '';
                entryAmount.value = '';
                entryName.focus();
            } else {
                if (entryName) entryName.style.borderColor = 'rgba(240,122,138,0.4)';
                if (entryAmount) entryAmount.style.borderColor = 'rgba(240,122,138,0.4)';
                setTimeout(function () {
                    if (entryName) entryName.style.borderColor = '';
                    if (entryAmount) entryAmount.style.borderColor = '';
                }, 800);
            }
        }

        if (btnAdd) btnAdd.addEventListener('click', handleAdd);
        if (entryAmount) {
            entryAmount.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') handleAdd();
            });
        }
        if (entryName) {
            entryName.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') handleAdd();
            });
        }

        /* 周期切换 */
        var periodBtns = document.querySelectorAll('.period-btn');
        periodBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                periodBtns.forEach(function (b) { b.classList.remove('active'); });
                e.target.classList.add('active');
                state.period = e.target.getAttribute('data-period');
                renderAdvice();
            });
        });

        /* 配色切换 */
        var paletteDots = document.querySelectorAll('.palette-dot');
        paletteDots.forEach(function (dot) {
            dot.addEventListener('click', function (e) {
                paletteDots.forEach(function (d) { d.classList.remove('active'); });
                e.target.classList.add('active');
                var palette = e.target.getAttribute('data-palette');
                document.body.setAttribute('data-palette', palette);
            });
        });

        /* 快捷预设 */
        var quickBtns = document.querySelectorAll('.quick-btn[data-preset]');
        quickBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                applyPreset(e.target.getAttribute('data-preset'));
            });
        });

        /* 清空 */
        var btnClear = document.getElementById('btn-clear');
        if (btnClear) {
            btnClear.addEventListener('click', function () {
                clearAll();
            });
        }

        /* 鼠标位置追踪 */
        window.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        window.addEventListener('mouseleave', function () {
            mouseX = -9999; mouseY = -9999;
        });

        /* 窗口尺寸 */
        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
        });
    }

    /* === 初始化 === */
    function init() {
        initBudgets();
        buildRadarGrid();
        bindEvents();
        resizeCanvas();
        initParticles();
        animateParticles();
        updateAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
