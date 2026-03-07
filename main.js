/**
 * 数字花园主页脚本
 * 处理交互逻辑、交叉观察器入场动画与滚动特效
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. 数据配置与 DOM 元素获取
    // -------------------------------------------------------------------------

    // 模拟种子项目数据
    const seeds = [
        {
            title: "磁力光标",
            description: "光标周围的元素会被磁力吸引或排斥，创造有趣的交互体验",
            path: "./seeds/magnetic-cursor/index.html",
            tags: ["Interactive", "Physics", "Creative"],
            icon: "🧲",
            status: "已发布"
        },
        {
            title: "OpenClaw AI 界面",
            description: "基于 GLM API 的多角色 AI 对话客户端原型构建及 Prompt 注入测试。",
            path: "./seeds/openclaw/index.html",
            tags: ["React", "MVP", "LLM"],
            icon: "🤖",
            status: "开发中"
        },
        {
            title: "Aura 灵韵",
            description: "极致审美的沉浸式呼吸冥想空间，兼具流体网格渐变与微晶玻璃拟物态。体验宁静与专注。",
            path: "./seeds/aura/index.html",
            tags: ["Design", "Animation", "Glassmorphism"],
            icon: "🪷",
            status: "已发布"
        },
        {
            title: "CSS 光影微交互画板",
            description: "纯使用 CSS Variables 与少量 JS 制作的赛博朋克风格交互画板。",
            path: "./seeds/cyber-paint/index.html",
            tags: ["CSS3", "Design"],
            icon: "🎨",
            status: "已发布"
        }
    ];

    const grid = document.getElementById('seeds-grid');
    const emptyState = document.getElementById('empty-state');
    const displaySeedCount = document.getElementById('seed-count');
    const displayCommitCount = document.getElementById('commit-count'); // 模拟的一个指标

    // -------------------------------------------------------------------------
    // 2. 项目卡片渲染
    // -------------------------------------------------------------------------

    if (seeds.length > 0) {
        emptyState.style.display = 'none';

        // 设置目标数字供递增计算使用
        displaySeedCount.setAttribute('data-target', seeds.length);
        displayCommitCount.setAttribute('data-target', seeds.length * 12 + 25); // 随便算个伪数据

        seeds.forEach((seed, index) => {
            const card = createSeedCard(seed, index);
            grid.appendChild(card);
        });
    } else {
        displaySeedCount.setAttribute('data-target', 0);
        displayCommitCount.setAttribute('data-target', 0);
    }

    // -------------------------------------------------------------------------
    // 3. UI 交互：移动端菜单与固定导航
    // -------------------------------------------------------------------------
    const header = document.getElementById('header');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // 点击导航链接后收起移动菜单
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    window.addEventListener('scroll', () => {
        // 头部的变小变隐效果
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // -------------------------------------------------------------------------
    // 4. 入场动画处理 (Intersection Observer)
    // -------------------------------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // 解除监听以避免重复动画
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => revealOnScroll.observe(el));

    // -------------------------------------------------------------------------
    // 5. 数字递增动画 (Count Up)
    // -------------------------------------------------------------------------
    const countUpElements = document.querySelectorAll('.count-up');

    const countUpObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetEl = entry.target;
                const finalVal = parseInt(targetEl.getAttribute('data-target') || 0, 10);

                if (finalVal > 0) {
                    animateValue(targetEl, 0, finalVal, 1500);
                }

                observer.unobserve(targetEl);
            }
        });
    }, { threshold: 0.5 });

    countUpElements.forEach(el => countUpObserver.observe(el));

    /**
     * 简易的数字滚动函数
     */
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // 使用 easeOutQuart 缓动函数让末尾减速
            const easeProgress = 1 - Math.pow(1 - progress, 4);

            obj.innerHTML = Math.floor(easeProgress * (end - start) + start);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end; // 确保最后是精确的结束值
            }
        };
        window.requestAnimationFrame(step);
    }
});

/**
 * 创建项目卡片 HTML 并附带 3D 悬浮效果辅助（部分靠 CSS 实现）
 */
function createSeedCard(seed, index) {
    const a = document.createElement('a');
    a.href = seed.path;
    // 加入不同的推迟动画
    a.className = `seed-card reveal fade-bottom delay-${(index % 3 + 1) * 100}`;

    a.innerHTML = `
        <div class="seed-header">
            <div class="seed-icon-wrapper">
                <span class="seed-icon">${seed.icon || '🌱'}</span>
            </div>
            <div class="seed-tags">
                <span class="tag">${seed.status || 'Draft'}</span>
                ${(seed.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        <div class="seed-body">
            <h3 class="seed-title">${seed.title}</h3>
            <p class="seed-description">${seed.description}</p>
        </div>
        <div class="seed-footer">
            <span class="enter-link">探索项目 <span class="arrow">→</span></span>
        </div>
    `;

    return a;
}
