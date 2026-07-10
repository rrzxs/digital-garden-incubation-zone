/* ============================================================
   Catalog · 策展陈列室
   交互逻辑: 卡片3D倾斜 · 磁吸标签 · 筛选动效 · 粒子流场
   Maintainer: EDEN
   ============================================================ */

(function () {
    'use strict';

    /* === 数据模型 === */
    var CATEGORIES = [
        { id: 'all',       label: '全部',   glyph: '◇' },
        { id: 'instrument', label: '器物',   glyph: '♪' },
        { id: 'optics',    label: '光学',   glyph: '◎' },
        { id: 'archive',   label: '档案',   glyph: '▣' },
        { id: 'specimen',  label: '标本',   glyph: '◈' }
    ];

    var ITEMS = [
        {
            id: 1, title: '青铜回音碗', category: 'instrument', glyph: '🎵',
            catLabel: '器物',
            desc: '手工锻造的青铜共鸣碗，轻击边缘可发出持续40秒的纯净泛音。每一只的频率都因合金配比的微差而独一无二。',
            price: 1280, currency: 'CNY',
            specs: { 材质: '青铜', 直径: '18cm', 频率: '432Hz', 重量: '620g' },
            tags: ['手作', '声学', '冥想']
        },
        {
            id: 2, title: '棱镜分光仪', category: 'optics', glyph: '🔍',
            catLabel: '光学',
            desc: '高精度冕牌玻璃棱镜，可将白光分解为清晰可见的七色光谱。底座为黄铜铸造，可360度旋转调节入射角。',
            price: 890, currency: 'CNY',
            specs: { 材质: '冕牌玻璃', 折射率: '1.52', 底座: '黄铜', 尺寸: '15×8cm' },
            tags: ['光学', '桌面', '科普']
        },
        {
            id: 3, title: '星图手稿复刻', category: 'archive', glyph: '📜',
            catLabel: '档案',
            desc: '1679年 Bononeri 星图的1:1高清复刻，棉纤仿古纸印刷，手工盖章编号。展开可见36个星座的铜版蚀刻线条。',
            price: 460, currency: 'CNY',
            specs: { 尺寸: '60×45cm', 纸张: '棉纤120g', 年代: '1679复刻', 工艺: '铜版蚀刻' },
            tags: ['复刻', '天文', '装饰']
        },
        {
            id: 4, title: '琥珀封存标本', category: 'specimen', glyph: '🐝',
            catLabel: '标本',
            desc: '天然波罗的海琥珀，内封一只完整的远古蜜蜂。透光可见翅脉纹理，配有可旋转的亚克力展示台。',
            price: 720, currency: 'CNY',
            specs: { 产地: '波罗的海', 年代: '4000万年', 内含: '蜜蜂', 重量: '14g' },
            tags: ['天然', '古生物', '收藏']
        },
        {
            id: 5, title: '陶瓷滴漏沙漏', category: 'instrument', glyph: '⏳',
            catLabel: '器物',
            desc: '手工拉坯的青瓷双室沙漏，内填来自沙漠的天然细砂。翻转一次刚好计时15分钟，砂粒摩擦声如细雨。',
            price: 540, currency: 'CNY',
            specs: { 材质: '青瓷', 时长: '15分钟', 砂源: '塔克拉玛干', 高度: '22cm' },
            tags: ['手作', '计时', '禅意']
        },
        {
            id: 6, title: '偏振观测镜', category: 'optics', glyph: '🔬',
            catLabel: '光学',
            desc: '可旋转偏振片组的桌面观测装置，用于观察矿物薄片的干涉色。旋转手柄时色彩如万花筒般流转。',
            price: 1150, currency: 'CNY',
            specs: { 偏振片: '2组', 旋转: '0-360°', 放大: '10×', 材质: '不锈钢' },
            tags: ['光学', '矿物', '科普']
        },
        {
            id: 7, title: '植物拓印档案', category: 'archive', glyph: '🌿',
            catLabel: '档案',
            desc: '采集自终南山的28种植物叶片，以传统拓印工艺留在宣纸上。每一页附有手写拉丁学名与采集日期。',
            price: 380, currency: 'CNY',
            specs: { 页数: '28页', 纸张: '生宣', 产地: '终南山', 装帧: '线装' },
            tags: ['拓印', '植物', '手作']
        },
        {
            id: 8, title: '蝴蝶翅膀标本', category: 'specimen', glyph: '🦋',
            catLabel: '标本',
            desc: '光明女神闪蝶的展翅标本，翅膀的纳米结构在不同角度折射出从蓝到紫的结构色。玻璃钟罩防氧化。',
            price: 980, currency: 'CNY',
            specs: { 品种: '光明女神闪蝶', 翅展: '14cm', 罩: '光学玻璃', 产地: '南美' },
            tags: ['结构色', '收藏', '展示']
        },
        {
            id: 9, title: '音叉校准器', category: 'instrument', glyph: '🎵',
            catLabel: '器物',
            desc: '医用级不锈钢音叉，频率精准校准至A=440Hz。共振木盒由胡桃木挖制，可将泛音延长至8秒以上。',
            price: 320, currency: 'CNY',
            specs: { 频率: '440Hz', 材质: '不锈钢', 木盒: '胡桃木', 长度: '20cm' },
            tags: ['声学', '校准', '桌面']
        },
        {
            id: 10, title: '衍射光栅片', category: 'optics', glyph: '🌈',
            catLabel: '光学',
            desc: '每毫米1000线的全息衍射光栅，可将点光源分解为完整可见光谱。配有黑色亚克力边框便于手持观察。',
            price: 180, currency: 'CNY',
            specs: { 密度: '1000线/mm', 尺寸: '5×5cm', 边框: '亚克力', 工艺: '全息' },
            tags: ['光学', '便携', '科普']
        },
        {
            id: 11, title: '手抄乐谱集', category: 'archive', glyph: '🎼',
            catLabel: '档案',
            desc: '巴赫无伴奏大提琴组曲的全手工抄录本，羊皮纸配铁胆墨水。每一页的装饰花边都由抄写员即兴创作。',
            price: 620, currency: 'CNY',
            specs: { 曲目: '巴赫BWV1007', 纸张: '羊皮纸', 墨水: '铁胆墨', 页数: '36页' },
            tags: ['手抄', '音乐', '收藏']
        },
        {
            id: 12, title: '矿石切片标本', category: 'specimen', glyph: '💎',
            catLabel: '标本',
            desc: '玛瑙的30微米超薄切片，粘附于载玻片上。在偏振光下可见同心环带的彩色干涉条纹，每片独一无二。',
            price: 450, currency: 'CNY',
            specs: { 矿种: '玛瑙', 厚度: '30μm', 尺寸: '28×75mm', 数量: '3片' },
            tags: ['矿物', '薄片', '科普']
        }
    ];

    /* === DOM 引用 === */
    var body            = document.body;
    var filterBar       = document.getElementById('filter-bar');
    var filterIndicator = document.getElementById('filter-indicator');
    var cardGrid       = document.getElementById('card-grid');
    var emptyState      = document.getElementById('empty-state');
    var statVisible     = document.getElementById('stat-visible');
    var statTotal       = document.getElementById('stat-total');
    var hudText         = document.getElementById('hud-text');
    var footMode        = document.getElementById('foot-mode');
    var overlay         = document.getElementById('detail-overlay');
    var backdrop        = document.getElementById('overlay-backdrop');
    var detailClose     = document.getElementById('detail-close');
    var canvas          = document.getElementById('particle-canvas');
    var ctx             = canvas.getContext('2d');

    /* === 状态 === */
    var activeCategory = 'all';
    var isOpen = false;

    /* === 工具 === */
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function getAccent() {
        return getComputedStyle(body).getPropertyValue('--accent').trim() || '#7af0c8';
    }

    /* ============================================================
       筛选标签栏
       ============================================================ */
    function renderFilters() {
        CATEGORIES.forEach(function (cat) {
            var count = cat.id === 'all'
                ? ITEMS.length
                : ITEMS.filter(function (it) { return it.category === cat.id; }).length;

            var btn = document.createElement('button');
            btn.className = 'filter-tab' + (cat.id === activeCategory ? ' active' : '');
            btn.setAttribute('data-cat', cat.id);
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', cat.id === activeCategory ? 'true' : 'false');
            btn.innerHTML =
                '<span>' + cat.label + '</span>' +
                '<span class="tab-count">' + count + '</span>';

            btn.addEventListener('click', function () { selectCategory(cat.id, btn); });
            filterBar.appendChild(btn);
        });
        // 初始化指示器
        requestAnimationFrame(function () {
            moveIndicator(filterBar.querySelector('.filter-tab.active'));
        });
    }

    function selectCategory(catId, btn) {
        activeCategory = catId;
        $$('.filter-tab', filterBar).forEach(function (t) {
            var isActive = t.getAttribute('data-cat') === catId;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        moveIndicator(btn);
        applyFilter(catId);

        var catLabel = CATEGORIES.filter(function (c) { return c.id === catId; })[0].label;
        hudText.textContent = catId === 'all' ? '全部器物在展' : '已筛选: ' + catLabel;
        footMode.textContent = catId === 'all' ? '— 全部在展' : '— ' + catLabel + '分类';
    }

    function moveIndicator(target) {
        if (!target) return;
        var rect = target.getBoundingClientRect();
        var barRect = filterBar.getBoundingClientRect();
        filterIndicator.style.width = rect.width + 'px';
        filterIndicator.style.height = rect.height + 'px';
        filterIndicator.style.left = (rect.left - barRect.left) + 'px';
        filterIndicator.style.top = (rect.top - barRect.top) + 'px';
    }

    /* ============================================================
       卡片渲染
       ============================================================ */
    function renderCards() {
        ITEMS.forEach(function (item, idx) {
            var card = document.createElement('article');
            card.className = 'cat-card';
            card.setAttribute('data-id', item.id);
            card.setAttribute('data-cat', item.category);
            card.style.animationDelay = (idx * 60) + 'ms';
            card.innerHTML =
                '<div class="card-shine"></div>' +
                '<div class="card-content">' +
                    '<span class="card-glyph">' + item.glyph + '</span>' +
                    '<span class="card-cat">' + item.catLabel + '</span>' +
                    '<h3 class="card-title">' + item.title + '</h3>' +
                    '<p class="card-desc">' + item.desc + '</p>' +
                    '<div class="card-foot">' +
                        '<span class="card-price"><span class="currency">' +
                            item.currency + '</span>' + item.price.toLocaleString() + '</span>' +
                        '<span class="card-arrow">' +
                            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                '<path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
                        '</span>' +
                    '</div>' +
                '</div>';

            attachCardTilt(card);
            card.addEventListener('click', function () { openDetail(item); });
            cardGrid.appendChild(card);
        });
        statTotal.textContent = ITEMS.length;
    }

    /* ============================================================
       3D 倾斜物理
       ============================================================ */
    function attachCardTilt(card) {
        var maxTilt = 12;
        var rafId = null;

        card.addEventListener('mousemove', function (e) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(function () {
                var rect = card.getBoundingClientRect();
                var x = (e.clientX - rect.left) / rect.width;
                var y = (e.clientY - rect.top) / rect.height;
                var tiltX = (0.5 - y) * maxTilt * 2;
                var tiltY = (x - 0.5) * maxTilt * 2;
                card.style.transform =
                    'perspective(900px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) translateZ(0)';
                var shine = card.querySelector('.card-shine');
                if (shine) {
                    shine.style.setProperty('--shine-x', (x * 100) + '%');
                    shine.style.setProperty('--shine-y', (y * 100) + '%');
                }
            });
        });

        card.addEventListener('mouseleave', function () {
            if (rafId) cancelAnimationFrame(rafId);
            card.style.transform = '';
        });
    }

    /* ============================================================
       筛选动画
       ============================================================ */
    function applyFilter(catId) {
        var visible = 0;
        $$('.cat-card', cardGrid).forEach(function (card, idx) {
            var match = catId === 'all' || card.getAttribute('data-cat') === catId;
            if (match) {
                card.classList.remove('is-filtered-out');
                card.style.animationDelay = (idx * 40) + 'ms';
                card.style.animation = 'none';
                void card.offsetWidth;
                card.style.animation = 'card-in 0.6s var(--ease-out-expo) forwards';
                card.style.animationDelay = (idx * 40) + 'ms';
                visible++;
            } else {
                card.classList.add('is-filtered-out');
            }
        });
        statVisible.textContent = visible;
        emptyState.hidden = visible > 0;
    }

    /* ============================================================
       详情覆盖层
       ============================================================ */
    function openDetail(item) {
        $('#detail-glyph').textContent = item.glyph;
        $('#detail-cat').textContent = item.catLabel;
        $('#detail-idx').textContent = 'No.' + String(item.id).padStart(3, '0');
        $('#detail-title').textContent = item.title;
        $('#detail-desc').textContent = item.desc;

        var specsHtml = Object.keys(item.specs).map(function (key) {
            return '<div class="spec-item">' +
                '<span class="spec-label">' + key + '</span>' +
                '<span class="spec-value">' + item.specs[key] + '</span>' +
            '</div>';
        }).join('');
        $('#detail-specs').innerHTML = specsHtml;

        var tagsHtml = item.tags.map(function (tag) {
            return '<span class="detail-tag">#' + tag + '</span>';
        }).join('');
        $('#detail-tags').innerHTML = tagsHtml;

        isOpen = true;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        backdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeDetail() {
        isOpen = false;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        backdrop.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    detailClose.addEventListener('click', closeDetail);
    backdrop.addEventListener('click', closeDetail);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) closeDetail();
    });

    /* ============================================================
       配色切换
       ============================================================ */
    $$('.palette-dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
            var p = dot.getAttribute('data-palette');
            body.setAttribute('data-palette', p);
            $$('.palette-dot').forEach(function (d) { d.classList.remove('active'); });
            dot.classList.add('active');
            // 延迟同步粒子颜色
            setTimeout(syncParticleColor, 100);
        });
    });

    /* ============================================================
       粒子流场
       ============================================================ */
    var particles = [];
    var PARTICLE_COUNT = 60;
    var mouseX = -9999, mouseY = -9999;
    var particleColor = 'rgba(122,240,200,';

    function syncParticleColor() {
        var accent = getAccent();
        // hex -> rgba
        var r = parseInt(accent.substr(1, 2), 16);
        var g = parseInt(accent.substr(3, 2), 16);
        var b = parseInt(accent.substr(5, 2), 16);
        particleColor = 'rgba(' + r + ',' + g + ',' + b + ',';
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 1.8 + 0.4,
                opacity: Math.random() * 0.4 + 0.1
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(function (p) {
            // 流场漂移
            p.x += p.vx;
            p.y += p.vy;

            // 鼠标力场（微弱吸引）
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && dist > 1) {
                p.vx += (dx / dist) * 0.008;
                p.vy += (dy / dist) * 0.008;
            }
            // 阻尼
            p.vx *= 0.99;
            p.vy *= 0.99;
            // 环绕
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = particleColor + p.opacity + ')';
            ctx.fill();
        });

        // 连接线
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var a = particles[i];
                var b = particles[j];
                var ddx = a.x - b.x;
                var ddy = a.y - b.y;
                var d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d < 110) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = particleColor + (0.08 * (1 - d / 110)) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }

    window.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    window.addEventListener('mouseleave', function () {
        mouseX = -9999;
        mouseY = -9999;
    });

    /* ============================================================
       Intersection Observer - 滚动揭示
       ============================================================ */
    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    /* === 窗口尺寸变化 === */
    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resizeCanvas();
            moveIndicator(filterBar.querySelector('.filter-tab.active'));
        }, 150);
    });

    /* ============================================================
       初始化
       ============================================================ */
    function init() {
        renderFilters();
        renderCards();
        resizeCanvas();
        initParticles();
        syncParticleColor();
        drawParticles();

        // 揭示动画
        $$('.reveal').forEach(function (el) {
            revealObserver.observe(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
