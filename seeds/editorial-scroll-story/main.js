/* ============================================================
   Editorial Scroll Story · 编年卷轴故事
   交互逻辑：滚动进度、章节揭示、视差、字符分割、主题、HUD
   ============================================================ */
(function() {
    'use strict';

    // === DOM 元素 ===
    const DOM = {
        story: document.getElementById('story'),
        progressFill: document.getElementById('progress-fill'),
        chapterNav: document.getElementById('chapter-nav'),
        cursorHalo: document.getElementById('cursor-halo'),
        hudPanel: document.getElementById('hud-panel'),
        hudChapter: document.getElementById('hud-chapter'),
        hudScroll: document.getElementById('hud-scroll'),
        hudVelocity: document.getElementById('hud-velocity'),
        chapters: Array.from(document.querySelectorAll('.story-chapter')),
        revealEls: Array.from(document.querySelectorAll('[data-reveal]')),
        splitTitles: Array.from(document.querySelectorAll('[data-split-text]')),
        themeBtns: Array.from(document.querySelectorAll('.theme-btn')),
        manifestoLines: Array.from(document.querySelectorAll('.manifesto-line')),
        parallaxDecos: Array.from(document.querySelectorAll('[data-parallax]')),
        parallaxStage: document.querySelector('[data-parallax-stage]'),
        warmthBtn: document.getElementById('warmth-btn'),
        echoCount: document.getElementById('echo-count'),
        restartBtn: document.getElementById('restart-btn'),
        statNums: Array.from(document.querySelectorAll('[data-count]')),
        body: document.body
    };

    // === 状态 ===
    const State = {
        currentChapter: 0,
        scrollY: 0,
        lastScrollY: 0,
        velocity: 0,
        smoothVelocity: 0,
        mouseX: 0,
        mouseY: 0,
        haloX: 0,
        haloY: 0,
        echoCount: 0,
        counted: false
    };

    // === 配置 ===
    const Config = {
        ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
        observerThreshold: 0.25,
        haloLerp: 0.1,
        parallaxStageLayers: { back: 0.02, mid: 0.05, front: 0.1 }
    };

    // === 初始化入口 ===
    function init() {
        splitTitleChars();
        buildChapterNav();
        setupIntersectionObserver();
        setupScrollProgress();
        setupCursorHalo();
        setupParallaxStage();
        setupThemeSwitcher();
        setupWarmthButton();
        setupRestartButton();
        setupKeyboardNavigation();
        revealHeroImmediately();
        animateVelocityLoop();
    }

    // === 字符分割：将标题文字拆分为单字 span ===
    function splitTitleChars() {
        DOM.splitTitles.forEach(title => {
            const text = title.textContent;
            title.textContent = '';
            title.setAttribute('aria-label', text);
            Array.from(text).forEach((char, i) => {
                const span = document.createElement('span');
                span.className = 'char';
                span.textContent = char === ' ' ? '\u00A0' : char;
                span.style.transitionDelay = (i * 35) + 'ms';
                title.appendChild(span);
            });
        });
    }

    // === 构建章节导航点 ===
    function buildChapterNav() {
        DOM.chapters.forEach((chapter, i) => {
            const dot = document.createElement('button');
            dot.className = 'chapter-dot' + (i === 0 ? ' active' : '');
            dot.type = 'button';
            dot.setAttribute('aria-label', '跳转到 ' + (chapter.dataset.chapterName || '章节 ' + (i + 1)));
            dot.dataset.label = chapter.dataset.chapterName || ('CH ' + String(i + 1).padStart(2, '0'));
            dot.addEventListener('click', () => scrollToChapter(i));
            DOM.chapterNav.appendChild(dot);
        });
    }

    // === 滚动揭示观察器 ===
    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const chapter = entry.target;
                    const index = DOM.chapters.indexOf(chapter);
                    activateChapter(chapter, index);
                }
            });
        }, {
            root: null,
            rootMargin: '-15% 0px -15% 0px',
            threshold: Config.observerThreshold
        });

        DOM.chapters.forEach(chapter => observer.observe(chapter));

        // 独立观察揭示元素
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const delay = parseInt(el.dataset.delay) || 0;
                    setTimeout(() => el.classList.add('revealed'), delay);
                    revealObserver.unobserve(el);
                }
            });
        }, { threshold: 0.2 });

        DOM.revealEls.forEach(el => revealObserver.observe(el));

        // 独立观察标题字符揭示
        const titleObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    titleObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        DOM.splitTitles.forEach(el => titleObserver.observe(el));

        // 宣言逐行揭示
        const manifesto = document.getElementById('manifesto');
        if (manifesto) {
            const mObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        DOM.manifestoLines.forEach(line => {
                            const delay = parseInt(line.dataset.delay) || 0;
                            setTimeout(() => line.classList.add('revealed'), delay + 400);
                        });
                        mObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.4 });
            mObserver.observe(manifesto);
        }

        // 终章统计数字递增
        const outro = document.querySelector('.chapter-outro');
        if (outro) {
            const oObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !State.counted) {
                        State.counted = true;
                        animateStatCounters();
                        oObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });
            oObserver.observe(outro);
        }
    }

    // === 激活章节：更新状态与 UI ===
    function activateChapter(chapter, index) {
        if (index === State.currentChapter) return;
        State.currentChapter = index;
        updateChapterDots(index);
        updateHUD(index);
    }

    function updateChapterDots(activeIndex) {
        const dots = DOM.chapterNav.querySelectorAll('.chapter-dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
    }

    function updateHUD(index) {
        if (DOM.hudChapter) {
            DOM.hudChapter.textContent =
                String(index + 1).padStart(2, '0') + ' / ' + String(DOM.chapters.length).padStart(2, '0');
        }
    }

    // === 滚动进度与速度 ===
    function setupScrollProgress() {
        let ticking = false;
        window.addEventListener('scroll', () => {
            State.scrollY = window.pageYOffset || document.documentElement.scrollTop;
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateProgress();
                    updateParallaxDecos();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function updateProgress() {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((State.scrollY / docHeight) * 100, 100);
        if (DOM.progressFill) DOM.progressFill.style.width = progress + '%';
        if (DOM.hudScroll) DOM.hudScroll.textContent = Math.round(progress) + '%';
    }

    // === 滚动驱动的视差装饰 ===
    function updateParallaxDecos() {
        DOM.parallaxDecos.forEach(deco => {
            const intensity = parseFloat(deco.dataset.parallax) || 0.1;
            const rect = deco.getBoundingClientRect();
            const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * intensity;
            deco.style.transform = 'translateY(' + (-offset) + 'px)';
        });
    }

    // === 速度环：更新 HUD 与光晕缩放 ===
    function animateVelocityLoop() {
        const delta = State.scrollY - State.lastScrollY;
        State.velocity = delta;
        State.lastScrollY = State.scrollY;
        State.smoothVelocity += (State.velocity - State.smoothVelocity) * 0.15;

        if (DOM.hudVelocity) {
            DOM.hudVelocity.textContent = Math.abs(State.smoothVelocity).toFixed(1);
        }
        // 速度衰减
        State.smoothVelocity *= 0.88;

        requestAnimationFrame(animateVelocityLoop);
    }

    // === 光标光晕：弹性跟随 ===
    function setupCursorHalo() {
        document.addEventListener('mousemove', (e) => {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
        });

        function animate() {
            State.haloX += (State.mouseX - State.haloX) * Config.haloLerp;
            State.haloY += (State.mouseY - State.haloY) * Config.haloLerp;
            if (DOM.cursorHalo) {
                DOM.cursorHalo.style.transform =
                    'translate(' + State.haloX + 'px, ' + State.haloY + 'px) translate(-50%, -50%)';
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // === 鼠标视差舞台（深度层） ===
    function setupParallaxStage() {
        if (!DOM.parallaxStage) return;
        const layers = {
            back: DOM.parallaxStage.querySelector('.p-layer-back'),
            mid: DOM.parallaxStage.querySelector('.p-layer-mid'),
            front: DOM.parallaxStage.querySelector('.p-layer-front')
        };

        DOM.parallaxStage.addEventListener('mousemove', (e) => {
            const rect = DOM.parallaxStage.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const mx = e.clientX - rect.left - cx;
            const my = e.clientY - rect.top - cy;

            if (layers.back)  layers.back.style.transform  = 'translate(' + (mx * Config.parallaxStageLayers.back)  + 'px,' + (my * Config.parallaxStageLayers.back)  + 'px)';
            if (layers.mid)   layers.mid.style.transform   = 'translate(' + (mx * Config.parallaxStageLayers.mid)   + 'px,' + (my * Config.parallaxStageLayers.mid)   + 'px)';
            if (layers.front) layers.front.style.transform = 'translate(' + (mx * Config.parallaxStageLayers.front) + 'px,' + (my * Config.parallaxStageLayers.front) + 'px)';
        });

        DOM.parallaxStage.addEventListener('mouseleave', () => {
            Object.values(layers).forEach(l => { if (l) l.style.transform = 'translate(0,0)'; });
        });
    }

    // === 主题切换 ===
    function setupThemeSwitcher() {
        DOM.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                DOM.body.setAttribute('data-theme', theme);
                DOM.themeBtns.forEach(b => b.classList.toggle('active', b === btn));
            });
        });
    }

    // === 温度按钮：涟漪 + 计数 ===
    function setupWarmthButton() {
        if (!DOM.warmthBtn) return;
        DOM.warmthBtn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'warmth-ripple animate';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            this.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());

            State.echoCount++;
            if (DOM.echoCount) DOM.echoCount.textContent = State.echoCount;
        });
    }

    // === 重启按钮 ===
    function setupRestartButton() {
        if (!DOM.restartBtn) return;
        DOM.restartBtn.addEventListener('click', () => {
            resetReveals();
            scrollToChapter(0);
        });
    }

    function resetReveals() {
        State.counted = false;
        DOM.revealEls.forEach(el => el.classList.remove('revealed'));
        DOM.splitTitles.forEach(el => el.classList.remove('revealed'));
        DOM.manifestoLines.forEach(el => el.classList.remove('revealed'));
        DOM.statNums.forEach(el => el.textContent = '0');
        // 短暂延迟后重新触发观察
        setTimeout(() => {
            DOM.revealEls.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0) {
                    const delay = parseInt(el.dataset.delay) || 0;
                    setTimeout(() => el.classList.add('revealed'), delay);
                }
            });
        }, 400);
    }

    // === 数字递增动画 ===
    function animateStatCounters() {
        DOM.statNums.forEach(el => {
            const target = parseInt(el.dataset.count) || 0;
            const duration = 1400;
            const startTime = performance.now();

            function step(now) {
                const t = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 4); // ease-out-quart
                el.textContent = Math.round(target * eased);
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    }

    // === 章节滚动 ===
    function scrollToChapter(index) {
        const target = DOM.chapters[index];
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // === 键盘导航 ===
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                e.preventDefault();
                scrollToChapter(Math.min(State.currentChapter + 1, DOM.chapters.length - 1));
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                scrollToChapter(Math.max(State.currentChapter - 1, 0));
            } else if (e.key === 'Home') {
                e.preventDefault();
                scrollToChapter(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                scrollToChapter(DOM.chapters.length - 1);
            }
        });
    }

    // === 序章立即揭示 ===
    function revealHeroImmediately() {
        requestAnimationFrame(() => {
            const hero = DOM.chapters[0];
            if (hero) {
                hero.querySelectorAll('[data-reveal]').forEach(el => {
                    const delay = parseInt(el.dataset.delay) || 0;
                    setTimeout(() => el.classList.add('revealed'), delay + 200);
                });
            }
        });
    }

    // === 启动 ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
