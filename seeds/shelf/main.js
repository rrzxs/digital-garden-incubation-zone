/* ============================================================
   Shelf · 灵感书架 · 交互逻辑
   3D 书脊透视 · 拖拽平移 · 悬停抽出 · 详情展开 · 粒子流场
   ============================================================ */

(function () {
    'use strict';

    /* === 数据 · 书脊内容 === */
    const BOOKS = [
        { title: '呼吸的语法', author: 'EDEN', tag: '冥想', color: '#2a7a5a', glow: '#4fd8a8',
          desc: '关于如何在混乱中找到节奏的随笔。每一页都是一个呼气与吸气之间的停顿，教你在数字噪声里重建属于自己的潮汐。',
          stats: [{ l: '页数', v: '128' }, { l: '阅读', v: '42min' }, { l: '难度', v: '入门' }],
          quote: '节奏不是被发明的，它只是被重新听见。' },
        { title: '像素的乡愁', author: 'Mira K.', tag: '设计', color: '#5a3a8a', glow: '#a87af0',
          desc: '一本关于早期互联网美学的视觉考古。从 8-bit 调色板到 ASCII 艺术，作者用乡愁的笔触描摹了一个尚未被高清吞噬的时代。',
          stats: [{ l: '页数', v: '256' }, { l: '阅读', v: '1.5h' }, { l: '难度', v: '中等' }],
          quote: '低分辨率不是缺陷，它是想象力的呼吸空间。' },
        { title: '流体日记', author: 'EDEN', tag: '创意', color: '#1a5a7a', glow: '#4ab8e8',
          desc: '记录了三十天里用 Navier-Stokes 方程书写情绪的实验。每一篇日记都是一张可交互的流体画布，悲伤是低速层流，喜悦是湍流。',
          stats: [{ l: '页数', v: '64' }, { l: '阅读', v: '30min' }, { l: '难度', v: '入门' }],
          quote: '情绪没有形状，但它们有粘度。' },
        { title: '玻璃态宣言', author: 'Lena V.', tag: '美学', color: '#3a6a5a', glow: '#7af0c8',
          desc: '一份关于微晶玻璃拟物的设计哲学檄文。从 backdrop-filter 到光的折射，论述了数字材质如何重新定义界面的真实感。',
          stats: [{ l: '页数', v: '180' }, { l: '阅读', v: '1h' }, { l: '难度', v: '中等' }],
          quote: '透明不是消失，是让光成为结构。' },
        { title: '回声花园', author: 'Jun A.', tag: '音效', color: '#7a3a5a', glow: '#f07ab0',
          desc: '一张可听的诗集。每个字符被敲击时都会产生回声，作者用 Web Audio 编织了一座只有耳朵能进入的花园。',
          stats: [{ l: '页数', v: '96' }, { l: '阅读', v: '45min' }, { l: '难度', v: '入门' }],
          quote: '沉默是最响的回声。' },
        { title: '非线性旅行', author: 'EDEN', tag: '叙事', color: '#8a5a2a', glow: '#f0b878',
          desc: '一本拒绝线性阅读的互动小说。读者通过滚动速度决定情节的密度，cubic-bezier 曲线即是叙事的脉搏。',
          stats: [{ l: '页数', v: '∞' }, { l: '阅读', v: '随你' }, { l: '难度', v: '高阶' }],
          quote: '故事不是一条线，它是一片场。' },
        { title: '重力与轻盈', author: 'Sora N.', tag: '物理', color: '#2a4a8a', glow: '#7aa8f0',
          desc: '探讨交互设计中弹簧-阻尼模型的诗意。何时该有重量，何时该漂浮——这是一本关于触觉哲学的指南。',
          stats: [{ l: '页数', v: '210' }, { l: '阅读', v: '1.2h' }, { l: '难度', v: '中等' }],
          quote: '最好的动效，是你感觉不到它在动。' },
        { title: '暗夜标本', author: 'Kai R.', tag: '视觉', color: '#4a2a4a', glow: '#b07af0',
          desc: '一座数字化的夜行动物图鉴。每只生物由 Simplex 噪声生成，它们在暗色背景中闪烁着生物荧光。',
          stats: [{ l: '页数', v: '144' }, { l: '阅读', v: '50min' }, { l: '难度', v: '中等' }],
          quote: '黑暗不是虚空，是另一种密度。' },
        { title: '涟漪通讯', author: 'EDEN', tag: '交互', color: '#1a6a6a', glow: '#4ae8d8',
          desc: '如果文字不是被阅读，而是被投入水中产生波纹呢？这本书记录了一个用涟漪传递消息的实验性聊天系统。',
          stats: [{ l: '页数', v: '88' }, { l: '阅读', v: '35min' }, { l: '难度', v: '入门' }],
          quote: '每句话都是一颗石子。' },
        { title: '碎形城市', author: 'Ren T.', tag: '生成', color: '#6a4a1a', glow: '#f0c878',
          desc: '用 L-system 与分形几何构建的虚构城市志。每翻一页，城市就生长一次，永远不会重复同一座天际线。',
          stats: [{ l: '页数', v: '320' }, { l: '阅读', v: '2h' }, { l: '难度', v: '高阶' }],
          quote: '城市不是被建造的，是被迭代出来的。' },
        { title: '呼吸的颜色', author: 'Mira K.', tag: '色彩', color: '#5a1a4a', glow: '#e87ad0',
          desc: '一本会随呼吸节奏变换封面的色谱冥想书。色彩的明度与你的吸气同步，让眼睛成为肺的延伸。',
          stats: [{ l: '页数', v: '72' }, { l: '阅读', v: '28min' }, { l: '难度', v: '入门' }],
          quote: '颜色也有潮汐。' },
        { title: '故障诗学', author: 'Lena V.', tag: '美学', color: '#3a3a6a', glow: '#7878f0',
          desc: '从 CRT 雪花到 datamosh，一本礼赞数字错误的诗集。故障不是失败，是系统无意识的喃语。',
          stats: [{ l: '页数', v: '160' }, { l: '阅读', v: '1h' }, { l: '难度', v: '中等' }],
          quote: '完美的图像没有灵魂，灵魂住在像素错位的地方。' },
        { title: '轨道图书馆', author: 'EDEN', tag: '叙事', color: '#1a4a5a', glow: '#4ac8e8',
          desc: '设想一座漂浮在近地轨道的图书馆，每本书都是一个独立舱体。读者在失重中翻阅，文字在舱壁上漂浮。',
          stats: [{ l: '页数', v: '240' }, { l: '阅读', v: '1.5h' }, { l: '难度', v: '中等' }],
          quote: '在零重力里，连句号都不会坠落。' },
        { title: '柔软的算法', author: 'Sora N.', tag: '物理', color: '#4a6a2a', glow: '#a8e878',
          desc: '将弹簧、布料、流体模拟翻译成温柔的语言。这本书证明，物理引擎也可以是安慰剂。',
          stats: [{ l: '页数', v: '192' }, { l: '阅读', v: '1.1h' }, { l: '难度', v: '中等' }],
          quote: '代码也可以学会拥抱。' },
        { title: '黄昏档案', author: 'Kai R.', tag: '视觉', color: '#6a2a3a', glow: '#f07a8a',
          desc: '三百六十五次日落的色谱采集。作者用一年的时间记录了暮光中每一度的色温变化，汇编成册。',
          stats: [{ l: '页数', v: '365' }, { l: '阅读', v: '2.5h' }, { l: '难度', v: '高阶' }],
          quote: '黄昏是白昼写给黑夜的情书。' },
        { title: '静默引擎', author: 'Jun A.', tag: '音效', color: '#2a5a3a', glow: '#4ae88a',
          desc: '关于白噪声、粉噪声与棕噪声的聆听指南。在静默的引擎室里，你会发现沉默其实从未安静。',
          stats: [{ l: '页数', v: '120' }, { l: '阅读', v: '40min' }, { l: '难度', v: '入门' }],
          quote: '静默有它自己的频谱。' }
    ];

    /* === DOM 引用 === */
    const rail = document.getElementById('shelf-rail');
    const tilt = document.getElementById('shelf-tilt');
    const stage = document.querySelector('.shelf-stage');
    const scrollbarFill = document.getElementById('scrollbar-fill');
    const detailPanel = document.getElementById('detail-panel');
    const detailClose = document.getElementById('detail-close');
    const detailSpine = document.getElementById('detail-spine');
    const detailSpineTitle = document.getElementById('detail-spine-title');
    const detailTag = document.getElementById('detail-tag');
    const detailIdx = document.getElementById('detail-idx');
    const detailTitle = document.getElementById('detail-title');
    const detailAuthor = document.getElementById('detail-author');
    const detailDesc = document.getElementById('detail-desc');
    const detailStats = document.getElementById('detail-stats');
    const detailQuote = document.getElementById('detail-quote');
    const hudText = document.getElementById('hud-text');
    const footCount = document.getElementById('foot-count');
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');

    /* === 状态 === */
    const state = {
        offset: 0,           // 当前水平偏移
        targetOffset: 0,     // 目标偏移 (惯性用)
        velocity: 0,         // 拖拽速度
        isDragging: false,
        dragStartX: 0,
        dragStartOffset: 0,
        maxScroll: 0,
        activeIndex: -1,
        palette: 'aurora',
        mouseX: 0.5,
        mouseY: 0.5,
        parallaxX: 0,
        parallaxY: 0,
        spines: []
    };

    /* === 配色粒子色 === */
    const PALETTE_PARTICLES = {
        aurora: ['#7af0c8', '#4fd8e8', '#8affb0'],
        ember:  ['#f0a07a', '#e8743c', '#ffb89a'],
        abyss:  ['#7aa8f0', '#5e7af0', '#9ac4ff'],
        orchid: ['#b488f0', '#c46af0', '#d8aaff']
    };

    /* === 初始化书脊 === */
    function buildSpines() {
        rail.innerHTML = '';
        state.spines = [];
        BOOKS.forEach((book, i) => {
            const el = document.createElement('article');
            el.className = 'spine';
            el.style.setProperty('--spine-glow', book.glow);
            el.style.background = `linear-gradient(165deg, ${book.color}, ${shade(book.color, -20)})`;
            el.setAttribute('data-index', i);
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `${book.title} · ${book.author}`);

            el.innerHTML = `
                <span class="spine-band top"></span>
                <span class="spine-label">${book.title}</span>
                <span class="spine-band mid"></span>
                <span class="spine-author">${book.author}</span>
                <span class="spine-band bot"></span>
                <span class="spine-num">N°${String(i + 1).padStart(2, '0')}</span>
            `;

            el.addEventListener('mouseenter', () => onSpineHover(i, true));
            el.addEventListener('mouseleave', () => onSpineHover(i, false));
            el.addEventListener('click', (e) => {
                if (state.dragMoved) return;
                openDetail(i);
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(i); }
            });

            rail.appendChild(el);
            state.spines.push(el);

            // 错峰入场动画
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(60px)';
                requestAnimationFrame(() => {
                    el.style.transition = 'opacity 0.8s var(--ease-out-expo), transform 0.9s var(--ease-out-expo), box-shadow 0.55s var(--ease-out-expo)';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                    setTimeout(() => { el.style.transition = ''; }, 950);
                });
            }, i * 60);
        });

        footCount.textContent = `${BOOKS.length} 本 · 持续生长`;
    }

    /* 颜色加深辅助 */
    function shade(hex, percent) {
        const num = parseInt(hex.slice(1), 16);
        let r = (num >> 16) + percent;
        let g = ((num >> 8) & 0x00FF) + percent;
        let b = (num & 0x0000FF) + percent;
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    /* === 书脊悬停 === */
    function onSpineHover(index, entering) {
        if (state.activeIndex !== -1) return;
        const el = state.spines[index];
        if (entering) {
            el.classList.add('lifted');
            // 邻近书脊微微让开
            state.spines.forEach((s, i) => {
                if (i !== index) {
                    const dist = Math.abs(i - index);
                    if (dist <= 2) {
                        s.style.transform = `translateY(${dist === 1 ? -6 : -3}px) translateZ(${10 - dist * 3}px)`;
                    }
                }
            });
            hudText.textContent = `N°${String(index + 1).padStart(2, '0')} · ${BOOKS[index].title}`;
        } else {
            el.classList.remove('lifted');
            state.spines.forEach((s) => { if (!s.classList.contains('active')) s.style.transform = ''; });
            hudText.textContent = '悬停或拖拽书脊';
        }
    }

    /* === 详情面板 === */
    function openDetail(index) {
        const book = BOOKS[index];
        state.activeIndex = index;

        // 重置邻近
        state.spines.forEach((s, i) => {
            s.style.transform = '';
            s.classList.remove('lifted');
        });

        state.spines[index].classList.add('active');

        detailPanel.style.setProperty('--spine-color', book.glow);
        detailSpine.style.background = `linear-gradient(180deg, ${book.color}, ${shade(book.color, -15)})`;
        detailSpineTitle.textContent = book.title;
        detailTag.textContent = book.tag;
        detailIdx.textContent = `N°${String(index + 1).padStart(2, '0')} / ${BOOKS.length}`;
        detailTitle.textContent = book.title;
        detailAuthor.textContent = `著者 · ${book.author}`;
        detailDesc.textContent = book.desc;

        detailStats.innerHTML = book.stats.map(s => `
            <div class="stat-chip">
                <span class="stat-chip-label">${s.l}</span>
                <span class="stat-chip-val">${s.v}</span>
            </div>
        `).join('');

        detailQuote.textContent = book.quote;

        detailPanel.classList.add('open');
        detailPanel.setAttribute('aria-hidden', 'false');
        hudText.textContent = `正在阅读 · ${book.title}`;
    }

    function closeDetail() {
        if (state.activeIndex !== -1) {
            state.spines[state.activeIndex].classList.remove('active');
            state.activeIndex = -1;
        }
        detailPanel.classList.remove('open');
        detailPanel.setAttribute('aria-hidden', 'true');
        hudText.textContent = '悬停或拖拽书脊';
    }

    detailClose.addEventListener('click', closeDetail);

    /* === 拖拽平移 === */
    state.dragMoved = false;

    function getMaxScroll() {
        const railWidth = rail.scrollWidth;
        const stageWidth = stage.clientWidth;
        return Math.max(0, railWidth - stageWidth + 80);
    }

    function onPointerDown(e) {
        if (e.target.closest('.detail-panel') || e.target.closest('.detail-close')) return;
        state.isDragging = true;
        state.dragMoved = false;
        state.dragStartX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        state.dragStartOffset = state.offset;
        state.velocity = 0;
        stage.classList.add('dragging');
    }

    function onPointerMove(e) {
        if (!state.isDragging) return;
        const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const delta = x - state.dragStartX;
        if (Math.abs(delta) > 5) state.dragMoved = true;
        state.targetOffset = state.dragStartOffset + delta;
        state.velocity = delta * 0.3;
        clampOffset();
    }

    function onPointerUp() {
        if (!state.isDragging) return;
        state.isDragging = false;
        stage.classList.remove('dragging');
        // 释放后惯性
        state.targetOffset += state.velocity * 8;
        clampOffset();
        setTimeout(() => { state.dragMoved = false; }, 50);
    }

    function clampOffset() {
        state.maxScroll = getMaxScroll();
        if (state.targetOffset > 0) state.targetOffset *= 0.3;
        if (state.targetOffset < -state.maxScroll) {
            state.targetOffset = -state.maxScroll + (state.targetOffset + state.maxScroll) * 0.3;
        }
    }

    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 触摸支持
    stage.addEventListener('touchstart', (e) => { onPointerDown(e); }, { passive: true });
    window.addEventListener('touchmove', (e) => { onPointerMove(e); }, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 滚轮横向滚动
    stage.addEventListener('wheel', (e) => {
        if (state.activeIndex !== -1) return;
        e.preventDefault();
        state.targetOffset -= e.deltaY * 1.2;
        state.targetOffset -= e.deltaX * 1.2;
        clampOffset();
    }, { passive: false });

    // 键盘导航
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.activeIndex !== -1) { closeDetail(); return; }
        if (state.activeIndex !== -1) return;
        if (e.key === 'ArrowLeft') { state.targetOffset += 200; clampOffset(); }
        if (e.key === 'ArrowRight') { state.targetOffset -= 200; clampOffset(); }
    });

    /* === 视差倾斜 === */
    window.addEventListener('mousemove', (e) => {
        state.mouseX = e.clientX / window.innerWidth;
        state.mouseY = e.clientY / window.innerHeight;
    });

    /* === 渲染循环 === */
    function render() {
        // 偏移插值
        state.offset += (state.targetOffset - state.offset) * 0.12;
        rail.style.transform = `translateX(${state.offset}px)`;

        // 视差倾斜
        state.parallaxX += ((state.mouseX - 0.5) * 12 - state.parallaxX) * 0.05;
        state.parallaxY += ((state.mouseY - 0.5) * 6 - state.parallaxY) * 0.05;
        tilt.style.transform = `rotateX(${8 + state.parallaxY}deg) rotateY(${state.parallaxX * 0.5}deg)`;

        // 滚动条
        if (state.maxScroll > 0) {
            const progress = Math.abs(state.offset) / state.maxScroll;
            scrollbarFill.style.transform = `translateX(${progress * 230}%) scaleX(${Math.max(0.15, 1 - progress * 0.7)})`;
        }

        updateParticles();
        requestAnimationFrame(render);
    }

    /* === 粒子流场 === */
    let particles = [];
    function initParticles() {
        resizeCanvas();
        particles = [];
        const count = Math.min(70, Math.floor(window.innerWidth / 22));
        for (let i = 0; i < count; i++) {
            particles.push(createParticle());
        }
    }

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.8 + 0.4,
            life: Math.random(),
            colorIdx: Math.floor(Math.random() * 3)
        };
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function updateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const colors = PALETTE_PARTICLES[state.palette];
        const t = performance.now() * 0.0003;

        particles.forEach((p) => {
            // Simplex-like 噪声流场 (简化)
            const nx = Math.sin(p.x * 0.004 + t) * Math.cos(p.y * 0.004 + t * 0.7);
            const ny = Math.cos(p.x * 0.004 - t * 0.5) * Math.sin(p.y * 0.004 + t);
            p.vx += nx * 0.04;
            p.vy += ny * 0.04;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.x += p.vx;
            p.y += p.vy;
            p.life += 0.003;

            // 边界回环
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;

            const alpha = Math.sin(p.life * Math.PI) * 0.5;
            if (alpha <= 0) return;

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
            ctx.fillStyle = colors[p.colorIdx];
            ctx.globalAlpha = alpha * 0.6;
            ctx.shadowBlur = 8;
            ctx.shadowColor = colors[p.colorIdx];
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });

    /* === 配色切换 === */
    document.querySelectorAll('.palette-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            state.palette = dot.dataset.palette;
            document.documentElement.setAttribute('data-palette', state.palette);
        });
    });

    /* === 启动 === */
    buildSpines();
    initParticles();
    render();

    // 初始提示淡入
    setTimeout(() => { hudText.textContent = '悬停书脊 · 拖拽平移 · 点击展开'; }, 1500);

})();
