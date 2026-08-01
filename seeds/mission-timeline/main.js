(function () {
    'use strict';

    // === Simplex Noise (Compact Implementation) ===

    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var grad3 = [
        [1,1],[-1,1],[1,-1],[-1,-1],
        [1,0],[-1,0],[0,1],[0,-1]
    ];

    function SimplexNoise(seed) {
        this.p = new Uint8Array(256);
        this.perm = new Uint8Array(512);
        var s = seed || Math.random() * 65536;
        for (var i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        for (var i = 255; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647;
            var j = s % (i + 1);
            var tmp = this.p[i];
            this.p[i] = this.p[j];
            this.p[j] = tmp;
        }
        for (var i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    SimplexNoise.prototype.noise2D = function (x, y) {
        var s = (x + y) * F2;
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var t = (i + j) * G2;
        var X0 = i - t;
        var Y0 = j - t;
        var x0 = x - X0;
        var y0 = y - Y0;
        var i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }
        var x1 = x0 - i1 + G2;
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1 + 2 * G2;
        var y2 = y0 - 1 + 2 * G2;
        var ii = i & 255;
        var jj = j & 255;
        var n0 = 0, n1 = 0, n2 = 0;
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            var gi0 = this.perm[ii + this.perm[jj]] % 8;
            n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            var gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
            n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            var gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;
            n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
        }
        return 70 * (n0 + n1 + n2);
    };

    // === Mission Data Sets ===

    var MISSION_SETS = {
        launch: {
            title: '产品发布',
            tag: 'MISSION · LAUNCH',
            milestones: [
                { phase: 'PHASE 01', title: '灵感播种', desc: '收集用户洞察与市场空白，确立产品愿景与核心价值主张。', duration: '2 周', status: 'active' },
                { phase: 'PHASE 02', title: '原型锻造', desc: '构建低保真原型与交互流程，进行早期可用性验证。', duration: '3 周', status: 'pending' },
                { phase: 'PHASE 03', title: '设计定型', desc: '完成视觉设计系统、组件库与品牌语言，冻结设计规范。', duration: '4 周', status: 'pending' },
                { phase: 'PHASE 04', title: '工程实现', desc: '前后端开发联调，建立 CI/CD 管线与自动化测试覆盖。', duration: '8 周', status: 'pending' },
                { phase: 'PHASE 05', title: '内测封测', desc: '邀请种子用户进行封闭测试，收集反馈并迭代修复。', duration: '3 周', status: 'pending' },
                { phase: 'PHASE 06', title: '公开发布', desc: '正式向公众开放，启动营销活动与增长飞轮。', duration: '持续', status: 'pending' }
            ]
        },
        expedition: {
            title: '远征探索',
            tag: 'MISSION · EXPEDITION',
            milestones: [
                { phase: 'PHASE 01', title: '航线规划', desc: '确定远征目标星域，计算轨道窗口与燃料预算。', duration: '6 个月', status: 'active' },
                { phase: 'PHASE 02', title: '舰队集结', desc: '组装探索舰队，完成生命维持与推进系统的全面检测。', duration: '4 个月', status: 'pending' },
                { phase: 'PHASE 03', title: '突破发射', desc: '窗口期点火升空，突破大气层进入预定转移轨道。', duration: '72 小时', status: 'pending' },
                { phase: 'PHASE 04', title: '深空巡航', desc: '漫长的星际巡航，乘员轮值休眠与中途轨道修正。', duration: '14 个月', status: 'pending' },
                { phase: 'PHASE 05', title: '抵近勘察', desc: '进入目标星域轨道，部署探测器与勘察无人机。', duration: '2 个月', status: 'pending' },
                { phase: 'PHASE 06', title: '返航归途', desc: '采集样本封存，启动返航程序，跨越漫长归途。', duration: '16 个月', status: 'pending' }
            ]
        },
        research: {
            title: '研究计划',
            tag: 'MISSION · RESEARCH',
            milestones: [
                { phase: 'PHASE 01', title: '文献综述', desc: '系统梳理领域文献，识别知识缺口与研究问题。', duration: '4 周', status: 'active' },
                { phase: 'PHASE 02', title: '假设构建', desc: '基于理论框架提出可检验假设，设计实验变量。', duration: '3 周', status: 'pending' },
                { phase: 'PHASE 03', title: '实验设计', desc: '规划实验方案、样本量与统计检验方法，通过伦理审查。', duration: '5 周', status: 'pending' },
                { phase: 'PHASE 04', title: '数据采集', desc: '执行实验并收集数据，确保可重复性与质量控制。', duration: '12 周', status: 'pending' },
                { phase: 'PHASE 05', title: '分析建模', desc: '统计建模与结果解读，验证或修正初始假设。', duration: '6 周', status: 'pending' },
                { phase: 'PHASE 06', title: '论文发表', desc: '撰写手稿、同行评议与期刊投稿，开放数据共享。', duration: '8 周', status: 'pending' }
            ]
        }
    };

    // === Theme Configs ===

    var THEMES = {
        aurora: {
            accent1: '#c4b5fd', accent2: '#818cf8', accent3: '#a78bfa',
            glow: 'rgba(196,181,253,0.15)',
            particles: ['#c4b5fd', '#818cf8', '#a78bfa', '#6366f1']
        },
        ember: {
            accent1: '#f97316', accent2: '#ef4444', accent3: '#fb923c',
            glow: 'rgba(249,115,22,0.15)',
            particles: ['#f97316', '#ef4444', '#f59e0b', '#dc2626']
        },
        ocean: {
            accent1: '#06b6d4', accent2: '#3b82f6', accent3: '#22d3ee',
            glow: 'rgba(6,182,212,0.15)',
            particles: ['#06b6d4', '#3b82f6', '#0ea5e9', '#2563eb']
        },
        flora: {
            accent1: '#22c55e', accent2: '#84cc16', accent3: '#4ade80',
            glow: 'rgba(34,197,94,0.15)',
            particles: ['#22c55e', '#84cc16', '#10b981', '#65a30d']
        }
    };

    var RING_CIRCUMFERENCE = 2 * Math.PI * 86;

    // === DOM References ===

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var ringFill = document.getElementById('ring-fill');
    var progressCount = document.getElementById('progress-count');
    var summaryTag = document.getElementById('summary-tag');
    var summaryTitle = document.getElementById('summary-title');
    var summaryDesc = document.getElementById('summary-desc');
    var metaProgress = document.getElementById('meta-progress');
    var metaDuration = document.getElementById('meta-duration');
    var metaPhase = document.getElementById('meta-phase');
    var timelineNodes = document.getElementById('timeline-nodes');
    var timelineLabels = document.getElementById('timeline-labels');
    var timelineFill = document.getElementById('timeline-fill');
    var timelineScrubber = document.getElementById('timeline-scrubber');
    var scrubberHead = document.getElementById('scrubber-head');
    var detailGrid = document.getElementById('detail-grid');
    var btnAdd = document.getElementById('btn-add');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');
    var ctrlSpeed = document.getElementById('ctrl-speed');
    var ctrlDensity = document.getElementById('ctrl-density');
    var ctrlBreath = document.getElementById('ctrl-breath');
    var valSpeed = document.getElementById('val-speed');
    var valDensity = document.getElementById('val-density');
    var valBreath = document.getElementById('val-breath');
    var swatches = document.querySelectorAll('.swatch');
    var missionBtns = document.querySelectorAll('#mission-toggle .mode-btn');
    var toastEl = document.getElementById('toast');

    // === State ===

    var noise = new SimplexNoise(Date.now());
    var currentSet = 'launch';
    var milestones = [];
    var completed = [];
    var activeIdx = 0;
    var currentTheme = 'aurora';
    var morphSpeed = 0.5;
    var particleDensity = 0.55;
    var breathStrength = 0.45;
    var isDragging = false;
    var particles = [];
    var mouseX = 0;
    var mouseY = 0;
    var mouseActive = false;
    var time = 0;
    var W = 0;
    var H = 0;
    var rafId = null;
    var toastTimer = null;

    // === Initialization ===

    function init() {
        ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
        ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE;
        resize();
        loadMission('launch');
        bindEvents();
        loop();
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }

    // === Mission Loading ===

    function loadMission(setKey) {
        currentSet = setKey;
        var data = MISSION_SETS[setKey];
        milestones = data.milestones.map(function (m, i) {
            return {
                phase: m.phase,
                title: m.title,
                desc: m.desc,
                duration: m.duration,
                status: i === 0 ? 'active' : 'pending'
            };
        });
        completed = milestones.map(function () { return false; });
        activeIdx = 0;
        buildTimeline();
        renderCards();
        updateSummary(0);
        updateProgress();
    }

    // === Timeline ===

    function buildTimeline() {
        timelineNodes.innerHTML = '';
        timelineLabels.innerHTML = '';
        var total = milestones.length;
        for (var i = 0; i < total; i++) {
            var pct = (i / (total - 1)) * 100;
            var node = document.createElement('div');
            node.className = 'timeline-node';
            node.style.left = pct + '%';
            node.dataset.index = i;
            node.addEventListener('click', function () {
                setActive(parseInt(this.dataset.index));
            });
            timelineNodes.appendChild(node);

            var label = document.createElement('div');
            label.className = 'timeline-label';
            label.style.left = pct + '%';
            label.textContent = milestones[i].title;
            label.dataset.index = i;
            label.addEventListener('click', function () {
                setActive(parseInt(this.dataset.index));
            });
            timelineLabels.appendChild(label);
        }
        updateTimelineVisual();
    }

    function updateTimelineVisual() {
        var nodes = timelineNodes.querySelectorAll('.timeline-node');
        var labels = timelineLabels.querySelectorAll('.timeline-label');
        var pct = (activeIdx / (milestones.length - 1)) * 100;
        timelineFill.style.width = pct + '%';
        scrubberHead.style.left = pct + '%';

        nodes.forEach(function (n, i) {
            n.classList.remove('active', 'passed', 'completed');
            if (completed[i]) {
                n.classList.add('completed');
            } else if (i === activeIdx) {
                n.classList.add('active');
            } else if (i < activeIdx) {
                n.classList.add('passed');
            }
        });

        labels.forEach(function (l, i) {
            l.classList.toggle('active', i === activeIdx);
        });
    }

    // === Card Rendering ===

    function renderCards() {
        detailGrid.innerHTML = '';
        milestones.forEach(function (m, i) {
            var card = document.createElement('div');
            card.className = 'milestone-card';
            if (i === activeIdx) card.classList.add('active');
            if (completed[i]) card.classList.add('completed');
            card.dataset.index = i;
            card.style.animationDelay = (i * 0.08) + 's';

            var statusText = completed[i] ? 'DONE' : (i === activeIdx ? 'ACTIVE' : 'PENDING');
            var statusClass = completed[i] ? 'done' : (i === activeIdx ? 'active' : 'pending');

            card.innerHTML =
                '<div class="card-header">' +
                    '<span class="card-phase">' + m.phase + '</span>' +
                    '<button class="card-check ' + (completed[i] ? 'checked' : '') + '" data-index="' + i + '" aria-label="完成任务">' +
                        '<svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>' +
                    '</button>' +
                '</div>' +
                '<h3 class="card-title">' + m.title + '</h3>' +
                '<p class="card-desc">' + m.desc + '</p>' +
                '<div class="card-footer">' +
                    '<span class="card-duration">' +
                        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                        m.duration +
                    '</span>' +
                    '<span class="card-status ' + statusClass + '">' + statusText + '</span>' +
                '</div>';

            card.addEventListener('click', function (e) {
                if (e.target.closest('.card-check')) return;
                setActive(parseInt(this.dataset.index));
            });

            card.querySelector('.card-check').addEventListener('click', function (e) {
                e.stopPropagation();
                toggleComplete(parseInt(this.dataset.index));
            });

            detailGrid.appendChild(card);
        });
    }

    function updateCardVisual() {
        var cards = detailGrid.querySelectorAll('.milestone-card');
        cards.forEach(function (card, i) {
            card.classList.toggle('active', i === activeIdx);
            card.classList.toggle('completed', completed[i]);
            var check = card.querySelector('.card-check');
            if (check) check.classList.toggle('checked', completed[i]);
            var statusEl = card.querySelector('.card-status');
            if (statusEl) {
                statusEl.className = 'card-status ' + (completed[i] ? 'done' : (i === activeIdx ? 'active' : 'pending'));
                statusEl.textContent = completed[i] ? 'DONE' : (i === activeIdx ? 'ACTIVE' : 'PENDING');
            }
        });
    }

    // === Summary & Progress ===

    function updateSummary(idx) {
        var m = milestones[idx];
        if (!m) return;
        summaryTag.textContent = MISSION_SETS[currentSet].tag;
        summaryTitle.textContent = m.title;
        summaryDesc.textContent = m.desc;
        metaProgress.textContent = Math.round((idx / (milestones.length - 1)) * 100) + '%';
        metaDuration.textContent = m.duration;
        metaPhase.textContent = String(idx + 1).padStart(2, '0');

        var label = document.querySelector('.stage-summary');
        if (label) {
            label.classList.remove('summary-transition-enter');
            void label.offsetWidth;
            label.classList.add('summary-transition-enter');
        }
    }

    function updateProgress() {
        var doneCount = completed.filter(function (c) { return c; }).length;
        var total = milestones.length;
        var pct = doneCount / total;
        progressCount.textContent = doneCount + ' / ' + total;
        ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct);
    }

    // === Interaction ===

    function setActive(idx) {
        if (idx < 0 || idx >= milestones.length) return;
        activeIdx = idx;
        updateSummary(idx);
        updateTimelineVisual();
        updateCardVisual();
    }

    function toggleComplete(idx) {
        if (idx < 0 || idx >= milestones.length) return;
        completed[idx] = !completed[idx];
        if (completed[idx]) {
            showToast('里程碑完成 · ' + milestones[idx].title, 'success');
            if (idx === activeIdx && idx < milestones.length - 1) {
                activeIdx = idx + 1;
            }
        } else {
            showToast('已撤回完成状态');
        }
        updateTimelineVisual();
        updateCardVisual();
        updateProgress();
        updateSummary(activeIdx);
    }

    function handleScrubberDrag(e) {
        var rect = timelineScrubber.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var pct = (clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        var idx = Math.round(pct * (milestones.length - 1));
        setActive(idx);
    }

    // === Particles ===

    function createParticles() {
        var count = Math.floor(W * H * particleDensity * 0.00014);
        count = Math.max(30, Math.min(count, 260));
        particles = [];
        var theme = THEMES[currentTheme];
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: 0,
                vy: 0,
                size: Math.random() * 2.2 + 0.5,
                color: theme.particles[Math.floor(Math.random() * theme.particles.length)],
                alpha: Math.random() * 0.4 + 0.1,
                life: Math.random() * 100
            });
        }
    }

    function updateParticles() {
        var scale = 0.002;
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.life += 0.02;
            var n = noise.noise2D(p.x * scale + time * 0.3, p.y * scale + time * 0.2);
            var angle = n * Math.PI * 2 * breathStrength;
            var speed = 0.6 * morphSpeed + 0.3;
            p.vx += Math.cos(angle) * speed * 0.05;
            p.vy += Math.sin(angle) * speed * 0.05;

            if (mouseActive) {
                var dx = mouseX - p.x;
                var dy = mouseY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    var force = (180 - dist) / 180 * 0.5;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            p.vx *= 0.94;
            p.vy *= 0.94;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -20) p.x = W + 20;
            if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20;
            if (p.y > H + 20) p.y = -20;
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.life));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
        }

        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var dist = dx * dx + dy * dy;
                if (dist < 6000) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = particles[i].color;
                    ctx.globalAlpha = (1 - dist / 6000) * 0.08;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        ctx.globalAlpha = 1;
    }

    // === Theme ===

    function setTheme(theme) {
        currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        var t = THEMES[theme];

        document.documentElement.style.setProperty('--accent-1', t.accent1);
        document.documentElement.style.setProperty('--accent-2', t.accent2);
        document.documentElement.style.setProperty('--accent-3', t.accent3);
        document.documentElement.style.setProperty('--accent-glow', t.glow);

        swatches.forEach(function (s) {
            s.classList.toggle('active', s.dataset.theme === theme);
        });

        particles.forEach(function (p) {
            p.color = t.particles[Math.floor(Math.random() * t.particles.length)];
        });
    }

    // === Toast ===

    function showToast(msg, kind) {
        toastEl.textContent = msg;
        toastEl.className = 'toast show' + (kind ? ' ' + kind : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove('show');
        }, 2600);
    }

    // === Animation Loop ===

    function loop() {
        time += 0.01 * morphSpeed;
        updateParticles();
        drawParticles();
        rafId = requestAnimationFrame(loop);
    }

    // === Event Binding ===

    function bindEvents() {
        window.addEventListener('resize', function () {
            resize();
            createParticles();
        });

        window.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            mouseActive = true;
        });

        window.addEventListener('mouseleave', function () {
            mouseActive = false;
        });

        btnReset.addEventListener('click', function () {
            completed = milestones.map(function () { return false; });
            activeIdx = 0;
            updateTimelineVisual();
            updateCardVisual();
            updateProgress();
            updateSummary(0);
            showToast('已重置全部进度');
        });

        btnShuffle.addEventListener('click', function () {
            var keys = Object.keys(MISSION_SETS).filter(function (k) { return k !== currentSet; });
            var nextKey = keys[Math.floor(Math.random() * keys.length)];
            missionBtns.forEach(function (b) {
                b.classList.toggle('active', b.dataset.set === nextKey);
            });
            loadMission(nextKey);
            showToast('切换至 · ' + MISSION_SETS[nextKey].title);
        });

        btnAdd.addEventListener('click', function () {
            var idx = milestones.length;
            milestones.push({
                phase: 'PHASE ' + String(idx + 1).padStart(2, '0'),
                title: '新里程碑',
                desc: '一个等待定义的新任务节点。点击卡片标题区域可聚焦查看详情。',
                duration: '待定',
                status: 'pending'
            });
            completed.push(false);
            buildTimeline();
            renderCards();
            updateProgress();
            showToast('已添加新里程碑节点');
        });

        swatches.forEach(function (s) {
            s.addEventListener('click', function () {
                setTheme(this.dataset.theme);
            });
        });

        missionBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                missionBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                loadMission(this.dataset.set);
            });
        });

        ctrlSpeed.addEventListener('input', function () {
            morphSpeed = this.value / 100;
            valSpeed.textContent = this.value;
        });

        ctrlDensity.addEventListener('input', function () {
            particleDensity = this.value / 100;
            valDensity.textContent = this.value;
            createParticles();
        });

        ctrlBreath.addEventListener('input', function () {
            breathStrength = this.value / 100;
            valBreath.textContent = this.value;
        });

        timelineScrubber.addEventListener('mousedown', function (e) {
            isDragging = true;
            timelineScrubber.classList.add('dragging');
            handleScrubberDrag(e);
        });

        window.addEventListener('mousemove', function (e) {
            if (isDragging) handleScrubberDrag(e);
        });

        window.addEventListener('mouseup', function () {
            if (isDragging) {
                isDragging = false;
                timelineScrubber.classList.remove('dragging');
            }
        });

        timelineScrubber.addEventListener('touchstart', function (e) {
            isDragging = true;
            timelineScrubber.classList.add('dragging');
            handleScrubberDrag(e);
        }, { passive: true });

        window.addEventListener('touchmove', function (e) {
            if (isDragging) handleScrubberDrag(e);
        }, { passive: true });

        window.addEventListener('touchend', function () {
            if (isDragging) {
                isDragging = false;
                timelineScrubber.classList.remove('dragging');
            }
        });

        window.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(activeIdx < milestones.length - 1 ? activeIdx + 1 : activeIdx);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(activeIdx > 0 ? activeIdx - 1 : activeIdx);
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleComplete(activeIdx);
            }
        });
    }

    // === Boot ===

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
