(function () {
    'use strict';

    /* =====================================================================
       Team Hover Reveal · 悬浮揭示
       交互逻辑: 3D 倾斜物理 · 错峰揭示 · 粒子流场 · 氛围配色
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    /* === 团队成员数据 ===
       每个成员包含:姓名 / 中文 / 角色 / 句柄 / 徽章 / 缩写 / 生平 / 技能 / 引语 / 社交 */
    var CREW = [
        {
            name: 'Aria Voss',
            cn: '艾莉亚·沃斯',
            role: 'Creative Director',
            handle: '@aria.voss',
            badge: 'FOUNDER',
            glyph: 'A',
            glow: 'rgba(122, 240, 200, 0.5)',
            bio: '十年视觉叙事者。相信留白比像素更有力量,擅长在噪声中雕刻秩序。',
            skills: [
                { name: '视觉系统', level: 0.95 },
                { name: '品牌叙事', level: 0.88 },
                { name: '动效语言', level: 0.82 }
            ],
            quote: '空白不是缺席,是最高密度的存在。',
            socials: ['Dribbble', 'Behance', 'Mail']
        },
        {
            name: 'Kenji Ito',
            cn: '伊藤健司',
            role: 'Lead Engineer',
            handle: '@kenji.ito',
            badge: 'CORE',
            glyph: 'K',
            glow: 'rgba(122, 220, 240, 0.5)',
            bio: '从汇编到 WebGL 全栈穿越者。痴迷于将数学之美编译成可触摸的界面。',
            skills: [
                { name: 'WebGL/GLSL', level: 0.92 },
                { name: '系统架构', level: 0.88 },
                { name: '物理模拟', level: 0.78 }
            ],
            quote: '代码是写给未来的诗,注释是写给昨天的自己。',
            socials: ['GitHub', 'X', 'Mail']
        },
        {
            name: 'Luna Marchetti',
            cn: '露娜·马尔凯蒂',
            role: 'Motion Designer',
            handle: '@luna.m',
            badge: 'DESIGN',
            glyph: 'L',
            glow: 'rgba(180, 136, 240, 0.5)',
            bio: '前电影动画师,现网页动效炼金术士。让每一个过渡都像一次小小的呼吸。',
            skills: [
                { name: '动效曲线', level: 0.96 },
                { name: '叙事节奏', level: 0.86 },
                { name: '3D 形变', level: 0.8 }
            ],
            quote: '最好的动画是你感觉不到、却已被打动的那个。',
            socials: ['Vimeo', 'Dribbble', 'Mail']
        },
        {
            name: 'Dmitri Volkov',
            cn: '德米特里·沃尔科夫',
            role: 'Systems Architect',
            handle: '@d.volkov',
            badge: 'CORE',
            glyph: 'D',
            glow: 'rgba(122, 168, 240, 0.5)',
            bio: '分布式系统驯兽师。在复杂度沼泽中铺设轨道,让不确定性变成可调参数。',
            skills: [
                { name: '分布式架构', level: 0.94 },
                { name: '性能优化', level: 0.9 },
                { name: '数据建模', level: 0.84 }
            ],
            quote: '架构不是设计出来的,是演化出来的。',
            socials: ['GitHub', 'Blog', 'Mail']
        },
        {
            name: 'Priya Nair',
            cn: '普里娅·奈尔',
            role: 'Research Lead',
            handle: '@priya.n',
            badge: 'PHD',
            glyph: 'P',
            glow: 'rgba(240, 200, 122, 0.5)',
            bio: '人机交互博士。在实验室与产品之间架桥,把用户的眼动转化为设计决策。',
            skills: [
                { name: '用户研究', level: 0.93 },
                { name: '数据洞察', level: 0.87 },
                { name: '可用性测试', level: 0.9 }
            ],
            quote: '用户永远不会说你错,但他们的鼠标会。',
            socials: ['Scholar', 'X', 'Mail']
        },
        {
            name: 'Theo Nakamura',
            cn: '中村泰欧',
            role: 'Sound Architect',
            handle: '@theo.nak',
            badge: 'AUDIO',
            glyph: 'T',
            glow: 'rgba(240, 160, 122, 0.5)',
            bio: '声学工程师 + 交互作曲家。让按钮的点击声也成为品牌的一部分。',
            skills: [
                { name: '空间音频', level: 0.91 },
                { name: '交互音效', level: 0.89 },
                { name: 'DSP 算法', level: 0.83 }
            ],
            quote: '寂静也是一种设计选择,而且往往是最难的。',
            socials: ['Bandcamp', 'GitHub', 'Mail']
        },
        {
            name: 'Zara Okonkwo',
            cn: '扎拉·奥孔克沃',
            role: 'Product Strategist',
            handle: '@zara.o',
            badge: 'STRATEGY',
            glyph: 'Z',
            glow: 'rgba(240, 122, 200, 0.5)',
            bio: '前咨询师,现产品炼金士。把模糊的市场信号蒸馏成可执行的路线图。',
            skills: [
                { name: '产品策略', level: 0.94 },
                { name: '市场分析', level: 0.88 },
                { name: '叙事框架', level: 0.85 }
            ],
            quote: '好产品不解决问题,它重新定义问题。',
            socials: ['LinkedIn', 'X', 'Mail']
        },
        {
            name: 'Felix Brandt',
            cn: '菲利克斯·布兰特',
            role: 'Interaction Engineer',
            handle: '@felix.b',
            badge: 'ENGINEER',
            glyph: 'F',
            glow: 'rgba(136, 240, 200, 0.5)',
            bio: '前端工艺师。在 60fps 的边缘起舞,把浏览器当成一块可以雕琢的水晶。',
            skills: [
                { name: '前端架构', level: 0.9 },
                { name: '微交互', level: 0.93 },
                { name: '渲染性能', level: 0.86 }
            ],
            quote: '每一帧都值得被珍惜,因为它是用户感知的全部。',
            socials: ['GitHub', 'CodePen', 'Mail']
        }
    ];

    /* === 氛围配色 === */
    var PALETTES = {
        aurora: { accent: '#7af0c8', blobs: ['#7af0c8', '#7adcf0', '#b488f0'] },
        ember:  { accent: '#f0a07a', blobs: ['#f0a07a', '#f0d07a', '#f07a7a'] },
        abyss:  { accent: '#7aa8f0', blobs: ['#7aa8f0', '#7af0e8', '#a07af0'] },
        orchid: { accent: '#b488f0', blobs: ['#b488f0', '#887af0', '#f07ac8'] }
    };

    /* === 应用状态 === */
    var state = {
        palette: 'aurora',
        particles: [],
        revealedCount: 0
    };

    /* =====================================================================
       DOM 元素引用
       ===================================================================== */

    var crewGrid = document.getElementById('crew-grid');
    var particleCanvas = document.getElementById('particle-canvas');
    var pCtx = particleCanvas.getContext('2d');
    var rippleLayer = document.getElementById('ripple-layer');
    var cursorGlow = document.getElementById('cursor-glow');
    var hudDot = document.getElementById('hud-dot');
    var hudText = document.getElementById('hud-text');
    var hud = document.getElementById('hud');
    var activeCount = document.getElementById('active-count');
    var totalCount = document.getElementById('total-count');

    /* =====================================================================
       构建成员卡片
       ===================================================================== */

    function buildCards() {
        CREW.forEach(function (member, idx) {
            var card = document.createElement('article');
            card.className = 'crew-card';
            card.setAttribute('data-index', String(idx));
            card.style.animationDelay = (0.6 + idx * 0.08) + 's';
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', member.name + ' · ' + member.role);

            // 技能条 HTML
            var skillsHtml = member.skills.map(function (s) {
                return '<div class="skill-row">' +
                    '<span class="skill-name">' + s.name + '</span>' +
                    '<span class="skill-track"><span class="skill-fill" style="--level:' + s.level.toFixed(2) + '"></span></span>' +
                    '<span class="skill-val">' + Math.round(s.level * 100) + '</span>' +
                '</div>';
            }).join('');

            // 社交链接 HTML (带 SVG 图标)
            var socialsHtml = member.socials.map(function (s) {
                return '<a class="social-chip" data-social="' + s.toLowerCase() + '">' +
                    getSocialIcon(s) + '<span>' + s + '</span>' +
                '</a>';
            }).join('');

            card.innerHTML =
                '<div class="card-surface">' +
                    '<span class="card-index">' + String(idx + 1).padStart(2, '0') + ' / ' + String(CREW.length).padStart(2, '0') + '</span>' +
                    '<div class="reveal-hint">Hover</div>' +
                    // 默认层
                    '<div class="card-default">' +
                        '<div class="card-portrait">' +
                            '<div class="portrait-halo" style="--member-glow:' + member.glow + '"></div>' +
                            '<span class="portrait-glyph">' + member.glyph + '</span>' +
                        '</div>' +
                        '<div class="default-info">' +
                            '<span class="default-role">' + member.role + '</span>' +
                            '<span class="default-name">' + member.name + '</span>' +
                            '<span class="default-name-cn">' + member.cn + '</span>' +
                        '</div>' +
                    '</div>' +
                    // 揭示层
                    '<div class="card-reveal">' +
                        '<div class="reveal-head">' +
                            '<div class="reveal-id">' +
                                '<span class="reveal-name">' + member.name + '</span>' +
                                '<span class="reveal-handle">' + member.handle + '</span>' +
                            '</div>' +
                            '<span class="reveal-badge">' + member.badge + '</span>' +
                        '</div>' +
                        '<p class="reveal-bio">' + member.bio + '</p>' +
                        '<div class="reveal-skills">' +
                            '<span class="skills-label">技能谱 · Skill Spectrum</span>' +
                            skillsHtml +
                        '</div>' +
                        '<div class="reveal-quote">' +
                            '<span class="quote-mark">"</span>' +
                            '<p class="quote-text">' + member.quote + '</p>' +
                        '</div>' +
                        '<div class="reveal-socials">' + socialsHtml + '</div>' +
                    '</div>' +
                    '<div class="card-sheen"></div>' +
                '</div>';

            crewGrid.appendChild(card);
            attachCardInteraction(card, member);
        });
        totalCount.textContent = CREW.length;
    }

    /* 社交平台 SVG 图标 */
    function getSocialIcon(platform) {
        var key = platform.toLowerCase();
        var icons = {
            github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.02c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.42.36.79 1.08.79 2.18v3.23c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>',
            x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
            dribbble: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm9.568 5.302c1.4 1.5 2.263 3.49 2.263 5.68-.06-.01-3.85-.78-7.66-.34-.08-.18-.16-.36-.24-.54-.22-.52-.46-1.04-.71-1.55 4.06-1.66 5.94-4.04 6.35-3.25zM12 2.25c2.6 0 4.96.98 6.76 2.58-.34.49-2.03 2.71-5.95 4.19-1.83-3.37-3.86-6.13-4.18-6.56 1.07-.14 2.21-.21 3.37-.21zM6.21 3.62c.3.41 2.3 3.18 4.15 6.47-5.23 1.39-9.84 1.37-10.34 1.37.72-3.43 2.99-6.29 6.19-7.84zM2.25 12v-.31c.48.01 5.88.07 11.45-1.59.32.62.62 1.25.9 1.88-.15.04-.29.08-.43.13-5.74 1.85-8.79 6.91-9.04 7.33-1.78-1.98-2.88-4.6-2.88-7.44zm9.75 9.75c-2.55 0-4.88-.86-6.76-2.3.18-.38 2.28-4.42 8.56-6.6.02 0 .05-.01.07-.02 1.53 3.97 2.16 7.3 2.31 8.25-1.3.55-2.72.85-4.18.85zm6.31-1.96c-.1-.62-.68-3.79-2.11-7.7 3.6-.57 6.74.37 7.13.5-.49 3.1-2.27 5.77-4.82 7.4z"/></svg>',
            behance: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 7H17V5.5h5V7zM15.85 12.7c.34.49.51 1.08.51 1.78 0 .72-.18 1.36-.55 1.93-.22.35-.5.65-.83.9-.37.29-.81.49-1.31.6-.5.11-1.04.16-1.62.16H7V6.5h5.62c1.41 0 2.41.41 3.06 1.27.37.51.55 1.12.55 1.83 0 .73-.18 1.32-.55 1.76-.21.24-.51.46-.91.66.6.22 1.05.57 1.38 1.05zm-6.21-2.04c.32 0 .58-.06.78-.18.2-.12.3-.33.3-.63 0-.32-.12-.54-.36-.65-.21-.09-.48-.13-.81-.13H9.64v1.59zm1.74 3.81c0-.4-.16-.67-.49-.82-.18-.08-.43-.12-.76-.13H9.64v1.95h1.45c.32 0 .58-.04.78-.13.34-.16.51-.46.51-.87zM23 13.5c0 .36-.02.69-.05 1h-5.93c.04.71.27 1.21.71 1.49.27.17.6.26.98.26.41 0 .74-.1.99-.31.14-.11.26-.27.36-.46h2.06c-.13.59-.46 1.19-.99 1.78-.6.68-1.45 1.02-2.54 1.02-.92 0-1.73-.28-2.43-.85-.7-.57-1.05-1.49-1.05-2.77 0-1.2.32-2.12.95-2.76.63-.64 1.45-.96 2.46-.96.6 0 1.14.11 1.62.32.48.21.88.55 1.2 1 .28.4.46.86.54 1.39.04.27.06.65.06 1.13z"/></svg>',
            mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
            vimeo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797z"/></svg>',
            bandcamp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 18.75l6.255-13.5h17.69L17.7 18.75H0z"/></svg>',
            codepen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L22 8.5v7L12 22 2 15.5v-7L12 2z"/><path d="M12 2v20M2 8.5l10 6 10-6M22 15.5l-10-6-10 6"/></svg>',
            scholar: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>',
            blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
            linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3v9zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>'
        };
        return icons[key] || icons.mail;
    }

    /* =====================================================================
       卡片交互: 3D 倾斜 + 揭示 + 光泽跟随
       ===================================================================== */

    function attachCardInteraction(card, member) {
        var surface = card.querySelector('.card-surface');
        var sheen = card.querySelector('.card-sheen');
        var isPointerInside = false;
        var rafId = null;

        // 鼠标移动:计算 3D 倾斜 + 光泽位置
        function onMove(e) {
            if (!isPointerInside) return;
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var cx = rect.width / 2;
            var cy = rect.height / 2;
            // 归一化到 -0.5 ~ 0.5
            var dx = (x - cx) / cx;
            var dy = (y - cy) / cy;
            // 倾斜角度 (最大 9 度)
            var rotY = dx * 9;
            var rotX = -dy * 9;

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(function () {
                surface.style.transform = 
                    'perspective(1200px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateZ(0)';
                // 光泽跟随
                var mxPct = (x / rect.width * 100).toFixed(1);
                var myPct = (y / rect.height * 100).toFixed(1);
                sheen.style.setProperty('--mx', mxPct + '%');
                sheen.style.setProperty('--my', myPct + '%');
            });
        }

        // 进入:揭示 + 激活 HUD
        function onEnter() {
            isPointerInside = true;
            card.classList.add('is-revealed');
            document.body.classList.add('is-hovering-card');
            // HUD 反馈
            hud.classList.add('is-active');
            hudText.textContent = '揭示中 · ' + member.name;
            // 计数
            state.revealedCount++;
            updateCounter();
        }

        // 离开:复位 + 清除激活
        function onLeave() {
            isPointerInside = false;
            card.classList.remove('is-revealed');
            document.body.classList.remove('is-hovering-card');
            // 复位倾斜
            if (rafId) cancelAnimationFrame(rafId);
            surface.style.transform = '';
            // HUD 复位
            hud.classList.remove('is-active');
            hudText.textContent = '悬停任意卡片以揭示';
            // 计数
            state.revealedCount = Math.max(0, state.revealedCount - 1);
            updateCounter();
        }

        card.addEventListener('mouseenter', onEnter);
        card.addEventListener('mouseleave', onLeave);
        card.addEventListener('mousemove', onMove);

        // 触摸设备支持 (tap 切换揭示)
        var touchToggled = false;
        card.addEventListener('touchstart', function () {
            touchToggled = !touchToggled;
            if (touchToggled) {
                card.classList.add('is-revealed');
                hud.classList.add('is-active');
                hudText.textContent = '揭示中 · ' + member.name;
            } else {
                card.classList.remove('is-revealed');
                hud.classList.remove('is-active');
                hudText.textContent = '悬停任意卡片以揭示';
            }
        }, { passive: true });

        // 键盘聚焦 (Tab) 也能揭示
        card.addEventListener('focus', function () {
            card.classList.add('is-revealed');
            hud.classList.add('is-active');
            hudText.textContent = '聚焦中 · ' + member.name;
        });
        card.addEventListener('blur', function () {
            card.classList.remove('is-revealed');
            hud.classList.remove('is-active');
            hudText.textContent = '悬停任意卡片以揭示';
        });

        // 社交链接点击反馈
        card.querySelectorAll('.social-chip').forEach(function (chip) {
            chip.addEventListener('click', function (e) {
                e.stopPropagation();
                spawnRipple(e.clientX, e.clientY);
            });
        });
    }

    function updateCounter() {
        activeCount.textContent = state.revealedCount;
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
       光标跟随光晕 (平滑插值)
       ===================================================================== */

    var glowX = window.innerWidth / 2;
    var glowY = window.innerHeight / 2;
    var targetGlowX = glowX;
    var targetGlowY = glowY;

    document.addEventListener('mousemove', function (e) {
        targetGlowX = e.clientX;
        targetGlowY = e.clientY;
    });

    function updateCursorGlow() {
        glowX += (targetGlowX - glowX) * 0.12;
        glowY += (targetGlowY - glowY) * 0.12;
        cursorGlow.style.transform = 
            'translate(' + glowX.toFixed(1) + 'px,' + glowY.toFixed(1) + 'px) translate(-50%, -50%) scale(1)';
        requestAnimationFrame(updateCursorGlow);
    }
    requestAnimationFrame(updateCursorGlow);

    /* =====================================================================
       涟漪层
       ===================================================================== */

    function spawnRipple(x, y) {
        var ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = (x - 160) + 'px';
        ripple.style.top = (y - 160) + 'px';
        rippleLayer.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 900);
    }

    document.addEventListener('click', function (e) {
        if (e.target.closest('.back-link') || e.target.closest('.palette-dot')) return;
        spawnRipple(e.clientX, e.clientY);
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

    /* =====================================================================
       初始化
       ===================================================================== */

    buildCards();

})();
