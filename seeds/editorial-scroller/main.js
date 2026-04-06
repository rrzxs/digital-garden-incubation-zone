(function() {
    'use strict';

    const DOM = {
        scroller: document.getElementById('scroller'),
        progressFill: document.getElementById('progress-fill'),
        chapterDots: document.getElementById('chapter-dots'),
        cursorGlow: document.getElementById('cursor-glow'),
        scrollIndicator: document.getElementById('scroll-indicator'),
        sections: document.querySelectorAll('.editorial-section'),
        indicatorDots: document.querySelectorAll('.indicator-dot'),
        revealLines: document.querySelectorAll('.reveal-line'),
        rippleBtn: document.getElementById('ripple-btn'),
        restartBtn: document.getElementById('restart-btn'),
        parallaxLayers: document.querySelectorAll('.parallax-layer')
    };

    const State = {
        currentSection: 0,
        isScrolling: false,
        scrollTimeout: null,
        mouseX: 0,
        mouseY: 0
    };

    const Config = {
        ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
        observerThreshold: 0.4,
        parallaxIntensity: {
            back: 0.02,
            mid: 0.04,
            front: 0.08
        }
    };

    function init() {
        createChapterDots();
        setupIntersectionObserver();
        setupScrollProgress();
        setupCursorGlow();
        setupParallax();
        setupRippleEffect();
        setupRestartButton();
        setupKeyboardNavigation();
        revealFirstSection();
    }

    function createChapterDots() {
        const sectionCount = DOM.sections.length;
        
        for (let i = 0; i < sectionCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'chapter-dot' + (i === 0 ? ' active' : '');
            dot.dataset.index = i;
            dot.addEventListener('click', () => scrollToSection(i));
            DOM.chapterDots.appendChild(dot);
        }
    }

    function setupIntersectionObserver() {
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -20% 0px',
            threshold: Config.observerThreshold
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    const index = parseInt(section.dataset.chapter);
                    
                    activateSection(section, index);
                    updateChapterDots(index);
                    updateScrollIndicator(index);
                    triggerSectionAnimations(section);
                }
            });
        }, observerOptions);

        DOM.sections.forEach(section => observer.observe(section));
    }

    function activateSection(section, index) {
        State.currentSection = index;
        
        DOM.sections.forEach(s => {
            const content = s.querySelector('.section-content');
            if (content) {
                content.classList.remove('visible');
            }
        });

        const content = section.querySelector('.section-content');
        if (content) {
            requestAnimationFrame(() => {
                content.classList.add('visible');
            });
        }
    }

    function updateChapterDots(activeIndex) {
        const dots = DOM.chapterDots.querySelectorAll('.chapter-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    }

    function updateScrollIndicator(activeIndex) {
        DOM.indicatorDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    }

    function triggerSectionAnimations(section) {
        const revealLines = section.querySelectorAll('.reveal-line');
        
        if (revealLines.length > 0) {
            revealLines.forEach((line, index) => {
                const delay = parseInt(line.dataset.delay) || index * 150;
                setTimeout(() => {
                    line.classList.add('visible');
                }, delay + 300);
            });
        }
    }

    function setupScrollProgress() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateProgress();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function updateProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((scrollTop / docHeight) * 100, 100);
        
        DOM.progressFill.style.width = progress + '%';
    }

    function setupCursorGlow() {
        let rafId = null;
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;

        document.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
        });

        function animateCursor() {
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;
            
            DOM.cursorGlow.style.left = currentX + 'px';
            DOM.cursorGlow.style.top = currentY + 'px';
            
            rafId = requestAnimationFrame(animateCursor);
        }

        animateCursor();
    }

    function setupParallax() {
        const parallaxSection = document.querySelector('.parallax-demo');
        
        if (!parallaxSection) return;

        parallaxSection.addEventListener('mousemove', (e) => {
            const rect = parallaxSection.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const mouseX = e.clientX - rect.left - centerX;
            const mouseY = e.clientY - rect.top - centerY;

            DOM.parallaxLayers.forEach(layer => {
                let intensity = Config.parallaxIntensity.mid;
                
                if (layer.classList.contains('layer-back')) {
                    intensity = Config.parallaxIntensity.back;
                } else if (layer.classList.contains('layer-front')) {
                    intensity = Config.parallaxIntensity.front;
                }

                const x = mouseX * intensity;
                const y = mouseY * intensity;
                
                layer.style.transform = `translate(${x}px, ${y}px)`;
            });
        });

        parallaxSection.addEventListener('mouseleave', () => {
            DOM.parallaxLayers.forEach(layer => {
                layer.style.transform = 'translate(0, 0)';
            });
        });
    }

    function setupRippleEffect() {
        if (!DOM.rippleBtn) return;

        DOM.rippleBtn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('div');
            ripple.className = 'ripple-effect';
            
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
            ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
            
            this.appendChild(ripple);
            
            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        });
    }

    function setupRestartButton() {
        if (!DOM.restartBtn) return;

        DOM.restartBtn.addEventListener('click', () => {
            resetAllAnimations();
            scrollToSection(0);
        });
    }

    function resetAllAnimations() {
        DOM.revealLines.forEach(line => {
            line.classList.remove('visible');
        });

        DOM.sections.forEach(section => {
            const content = section.querySelector('.section-content');
            if (content) {
                content.classList.remove('visible');
            }
        });
    }

    function scrollToSection(index) {
        const targetSection = DOM.sections[index];
        
        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    function setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIndex = Math.min(State.currentSection + 1, DOM.sections.length - 1);
                scrollToSection(nextIndex);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIndex = Math.max(State.currentSection - 1, 0);
                scrollToSection(prevIndex);
            } else if (e.key === 'Home') {
                e.preventDefault();
                scrollToSection(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                scrollToSection(DOM.sections.length - 1);
            }
        });
    }

    function revealFirstSection() {
        setTimeout(() => {
            const firstSection = DOM.sections[0];
            if (firstSection) {
                const content = firstSection.querySelector('.section-content');
                if (content) {
                    content.classList.add('visible');
                }
            }
        }, 100);
    }

    function setupTouchSwipe() {
        let touchStartY = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartY - touchEndY;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    const nextIndex = Math.min(State.currentSection + 1, DOM.sections.length - 1);
                    scrollToSection(nextIndex);
                } else {
                    const prevIndex = Math.max(State.currentSection - 1, 0);
                    scrollToSection(prevIndex);
                }
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
