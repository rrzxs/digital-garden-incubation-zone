(function () {
    'use strict';

    /* =====================================================================
       Hover Team Grid · 星阵团队网格
       交互逻辑: flex-grow 聚焦膨胀 · 3D 倾斜 · 错峰揭示 · 粒子流场 · 氛围配色
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    /* === 团队成员数据 ===
       每位成员: 索引 / 姓名 / 角色 / 句柄 / 徽章 / 缩写 / 光晕色 / 生平 / 技能 / 引语 / 社交 */
    var CREW = [
        {
            name: 'Aria Voss', role: 'Creative Director', handle: '@aria.voss',
            badge: 'FOUNDER', glyph: 'A', glow: 'rgba(122, 240, 200, 0.5)',
            bio: '十年视觉叙事者。相信留白比像素更有力量，擅长在噪声中雕刻秩序。',
            skills: [
                { name: '视觉系统', level: 0.95 },
                { name: '品牌叙事', level: 0.88 },
                { name: '动效语言', level: 0.82 }
            ],
            quote: '空白不是缺席，是最高密度的存在。',
            socials: ['Dribbble', 'Behance', 'Mail']
        },
        {
            name: 'Kenji Ito', role: 'Lead Engineer', handle: '@kenji.ito',
            badge: 'CORE', glyph: 'K', glow: 'rgba(122, 220, 240, 0.5)',
            bio: '从汇编到 WebGL 全栈穿越者。痴迷于将数学之美编译成可触摸的界面。',
            skills: [
                { name: 'WebGL / GLSL', level: 0.92 },
                { name: '系统架构', level: 0.88 },
                { name: '物理模拟', level: 0.78 }
            ],
            quote: '代码是写给未来的诗，注释是写给昨天的自己。',
            socials: ['GitHub', 'X', 'Mail']
        },
        {
            name: 'Luna Marchetti', role: 'Motion Designer', handle: '@luna.m',
            badge: 'DESIGN', glyph: 'L', glow: 'rgba(180, 136, 240, 0.5)',
            bio: '前电影动画师，现网页动效炼金术士。让每一个过渡都像一次小小的呼吸。',
            skills: [
                { name: '动效曲线', level: 0.96 },
                { name: '叙事节奏', level: 0.86 },
                { name: '3D 形变', level: 0.8 }
            ],
            quote: '最好的动画是你感觉不到、却已被打动的那个。',
            socials: ['Vimeo', 'Dribbble', 'Mail']
        },
        {
            name: 'Dmitri Volkov', role: 'Systems Architect', handle: '@d.volkov',
            badge: 'CORE', glyph: 'D', glow: 'rgba(122, 168, 240, 0.5)',
            bio: '分布式系统驯兽师。在复杂度沼泽中铺设轨道，让不确定性变成可调参数。',
            skills: [
                { name: '分布式架构', level: 0.94 },
                { name: '性能优化', level: 0.9 },
                { name: '数据建模', level: 0.84 }
            ],
            quote: '架构不是设计出来的，是演化出来的。',
            socials: ['GitHub', 'Blog', 'Mail']
        },
        {
            name: 'Priya Nair', role: 'Research Lead', handle: '@priya.n',
            badge: 'PHD', glyph: 'P', glow: 'rgba(240, 200, 122, 0.5)',
            bio: '人机交互博士。在实验室与产品之间架桥，把用户的眼动转化为设计决策。',
            skills: [
                { name: '用户研究', level: 0.93 },
                { name: '数据洞察', level: 0.87 },
                { name: '可用性测试', level: 0.9 }
            ],
            quote: '用户永远不会说你错，但他们的鼠标会。',
            socials: ['Scholar', 'X', 'Mail']
        },
        {
            name: 'Theo Nakamura', role: 'Sound Architect', handle: '@theo.nak',
            badge: 'AUDIO', glyph: 'T', glow: 'rgba(240, 160, 122, 0.5)',
            bio: '声学工程师 + 交互作曲家。让按钮的点击声也成为品牌的一部分。',
            skills: [
                { name: '空间音频', level: 0.91 },
                { name: '交互音效', level: 0.89 },
                { name: 'DSP 算法', level: 0.83 }
            ],
            quote: '寂静也是一种设计选择，而且往往是最难的。',
            socials: ['Bandcamp', 'GitHub', 'Mail']
        },
        {
            name: 'Zara Okonkwo', role: 'Product Strategist', handle: '@zara.o',
            badge: 'STRAT', glyph: 'Z', glow: 'rgba(240, 122, 200, 0.5)',
            bio: '把模糊的商业意图翻译成清晰的产品路径。相信好的策略是一首能哼的歌。',
            skills: [
                { name: '产品策略', level: 0.92 },
                { name: '市场洞察', level: 0.85 },
                { name: '路线图', level: 0.88 }
            ],
            quote: '策略不是答案，是让团队问对问题的脚手架。',
            socials: ['LinkedIn', 'Blog', 'Mail']
        },
        {
            name: 'Felix Brandt', role: 'Interaction Engineer', handle: '@felix.b',
            badge: 'ENG', glyph: 'F', glow: 'rgba(180, 240, 122, 0.5)',
            bio: '把物理世界的不确定性注入界面。一颗弹跳的按钮，胜过千言按钮文档。',
            skills: [
                { name: '微交互', level: 0.94 },
                { name: '物理引擎', level: 0.86 },
                { name: '可访问性', level: 0.82 }
            ],
            quote: '细节不是细节，它们是整个体验。',
            socials: ['GitHub', 'CodePen', 'Mail']
        }
    ];

    /* =====================================================================
       === DOM Elements ===
       ===================================================================== */

    var grid = document.getElementById('team-grid');
    var hudDot = document.getElementById('hud-dot');
    var hudText = document.getElementById('hud-text');
    var focusName = document.getElementById('focus-name');
    var cursorGlow = document.getElementById('cursor-glow');
    var rippleLayer = document.getElementById('ripple-layer');
    var paletteDots = document.querySelectorAll('.palette-dot');
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');

    var focusedUnit = null;
    var glowX = window.innerWidth / 2;
    var glowY = window.innerHeight / 2;
    var targetGlowX = glowX;
    var targetGlowY = glowY;

    /* =====================================================================
       === 单元构建 ===
       ===================================================================== */

    function buildUnit(member, index) {
        var unit = document.createElement('div');
        unit.className = 'unit';
        unit.setAttribute('data-index', index);
        unit.setAttribute('tabindex', '0');
        unit.setAttribute('role', 'button');
        unit.setAttribute('aria-label', member.name + ' — ' + member.role);
        unit.style.setProperty('--member-glow', member.glow);

        var skillsHtml = member.skills.map(function (s) {
            return ''
                + '<div class="skill-row">'
                +   '<span class="skill-label">' + s.name + '</span>'
                +   '<span class="skill-track"><span class="skill-fill" style="--lvl:' + (s.level * 100) + '%"></span></span>'
                +   '<span class="skill-val">' + Math.round(s.level * 100) + '</span>'
                + '</div>';
        }).join('');

        var socialsHtml = member.socials.map(function (s) {
            return '<a href="#" class="social-chip" onclick="return false;">' + s + '</a>';
        }).join('');

        var idx = String(index + 1).padStart(2, '0');

        unit.innerHTML = ''
            + '<div class="unit-portrait">'
            +   '<div class="portrait-aura"></div>'
            +   '<span class="portrait-glyph">' + member.glyph + '</span>'
            +   '<div class="portrait-veil"></div>'
            + '</div>'

            + '<div class="unit-rail">'
            +   '<span class="unit-index">' + idx + '</span>'
            +   '<span class="unit-glyph">' + member.glyph + '</span>'
            +   '<span class="unit-vertname">' + member.name + '</span>'
            + '</div>'

            + '<div class="unit-corner">'
            +   '<span class="unit-corner-dot"></span>'
            +   '<span>' + member.handle + '</span>'
            + '</div>'

            + '<div class="unit-body">'
            +   '<span class="unit-badge">' + member.badge + '</span>'
            +   '<h3 class="unit-name">' + member.name + '</h3>'
            +   '<span class="unit-role">' + member.role + '</span>'
            +   '<p class="unit-bio">' + member.bio + '</p>'
            +   '<div class="unit-skills">' + skillsHtml + '</div>'
            +   '<p class="unit-quote">' + member.quote + '</p>'
            +   '<div class="unit-socials">' + socialsHtml + '</div>'
            + '</div>'

            + '<div class="unit-sheen"></div>';

        return unit;
    }

    /* =====================================================================
       === 聚焦 / 失焦 ===
       ===================================================================== */

    function focusUnit(unit) {
        if (focusedUnit === unit) return;
        if (focusedUnit) focusedUnit.classList.remove('is-focused');
        unit.classList.add('is-focused');
        grid.classList.add('has-focus');
        focusedUnit = unit;

        var idx = parseInt(unit.getAttribute('data-index'), 10);
        var member = CREW[idx];
        hudDot.classList.add('active');
        hudText.textContent = member.name + ' · ' + member.role;
        focusName.textContent = member.name;
    }

    function unfocus() {
        if (!focusedUnit) return;
        focusedUnit.classList.remove('is-focused');
        grid.classList.remove('has-focus');
        focusedUnit = null;
        hudDot.classList.remove('active');
        hudText.textContent = '悬停单元以聚焦';
        focusName.textContent = '—';
    }

    /* =====================================================================
       === 3D 倾斜物理 ===
       ===================================================================== */

    function bindTilt(unit) {
        var maxTilt = 7;

        unit.addEventListener('mousemove', function (e) {
            var rect = unit.getBoundingClientRect();
            var x = (e.clientX - rect.left) / rect.width;
            var y = (e.clientY - rect.top) / rect.height;
            var tiltX = (0.5 - y) * maxTilt * 2;
            var tiltY = (x - 0.5) * maxTilt * 2;
            unit.style.transform = 'perspective(1200px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
            unit.style.setProperty('--mx', (x * 100) + '%');
            unit.style.setProperty('--my', (y * 100) + '%');
        });

        unit.addEventListener('mouseleave', function () {
            unit.style.transform = '';
        });
    }

    /* =====================================================================
       === 光标光晕 ===
       ===================================================================== */

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
       === 氛围配色 ===
       ===================================================================== */

    function bindPalette() {
        paletteDots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                paletteDots.forEach(function (d) { d.classList.remove('active'); });
                dot.classList.add('active');
                var p = dot.getAttribute('data-palette');
                document.documentElement.setAttribute('data-palette', p);
                spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
            });
        });
    }

    /* =====================================================================
       === 粒子流场 ===
       ===================================================================== */

    var particles = [];
    var PARTICLE_COUNT = 46;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

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
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var accent = getAccentRgb();

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            // 鼠标引力
            var dx = mousePx - p.x;
            var dy = mousePy - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && dist > 0.1) {
                var force = (180 - dist) / 180 * 0.04;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
            // 阻尼
            p.vx *= 0.985;
            p.vy *= 0.985;

            // 边界回绕
            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + accent + ', ' + p.a + ')';
            ctx.fill();
        }

        // 近邻连线
        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var pa = particles[a], pb = particles[b];
                var ddx = pa.x - pb.x, ddy = pa.y - pb.y;
                var d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d < 110) {
                    ctx.beginPath();
                    ctx.moveTo(pa.x, pa.y);
                    ctx.lineTo(pb.x, pb.y);
                    ctx.strokeStyle = 'rgba(' + accent + ', ' + (0.12 * (1 - d / 110)) + ')';
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }

    /* =====================================================================
       === 入场动画 ===
       ===================================================================== */

    function staggerEnter() {
        var units = grid.querySelectorAll('.unit');
        units.forEach(function (u, i) {
            setTimeout(function () {
                u.classList.add('entered');
            }, 120 + i * 90);
        });
    }

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
        // 注入单元
        CREW.forEach(function (m, i) {
            grid.appendChild(buildUnit(m, i));
        });

        // 绑定交互
        var units = grid.querySelectorAll('.unit');
        units.forEach(function (u) {
            bindTilt(u);
            u.addEventListener('mouseenter', function () { focusUnit(u); });
            u.addEventListener('focus', function () { focusUnit(u); });
            u.addEventListener('click', function (e) {
                spawnRipple(e.clientX, e.clientY);
            });
            u.addEventListener('blur', function () {
                if (focusedUnit === u) unfocus();
            });
        });

        // 网格整体离开即失焦
        grid.addEventListener('mouseleave', unfocus);

        bindCursorGlow();
        bindPalette();

        // 粒子
        resizeCanvas();
        initParticles();
        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
        });

        animateGlow();
        drawParticles();
        staggerEnter();
        bindReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
