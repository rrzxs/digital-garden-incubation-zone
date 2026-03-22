(function() {
    'use strict';

    const CONFIG = {
        forceStrength: 1.0,
        influenceRadius: 200,
        damping: 0.12,
        trailLength: 20,
        trailFadeSpeed: 0.92
    };

    const state = {
        mouse: { x: 0, y: 0 },
        mouseVelocity: { x: 0, y: 0 },
        lastMouse: { x: 0, y: 0 },
        isMouseInCanvas: false,
        elements: [],
        trails: [],
        cursorDot: null,
        cursorRing: null,
        animationId: null
    };

    function init() {
        createCustomCursor();
        cacheElements();
        initTrails();
        bindEvents();
        bindControls();
        startAnimation();
    }

    function createCustomCursor() {
        const cursorField = document.getElementById('cursor-field');
        
        state.cursorDot = document.createElement('div');
        state.cursorDot.className = 'custom-cursor cursor-dot';
        cursorField.appendChild(state.cursorDot);
        
        state.cursorRing = document.createElement('div');
        state.cursorRing.className = 'custom-cursor cursor-ring';
        cursorField.appendChild(state.cursorRing);
    }

    function cacheElements() {
        const elements = document.querySelectorAll('.magnetic-element');
        
        elements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            state.elements.push({
                el,
                type: el.dataset.type || 'attract',
                strength: parseFloat(el.dataset.strength) || 1,
                homeX: rect.left + rect.width / 2,
                homeY: rect.top + rect.height / 2,
                currentX: rect.left + rect.width / 2,
                currentY: rect.top + rect.height / 2,
                velocityX: 0,
                velocityY: 0,
                angle: 0
            });
        });
    }

    function initTrails() {
        const cursorField = document.getElementById('cursor-field');
        
        for (let i = 0; i < CONFIG.trailLength; i++) {
            const trail = document.createElement('div');
            trail.className = 'magnetic-trail';
            trail.style.opacity = '0';
            cursorField.appendChild(trail);
            state.trails.push({
                el: trail,
                x: 0,
                y: 0,
                opacity: 0
            });
        }
    }

    function bindEvents() {
        const canvas = document.getElementById('magnetic-canvas');
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseenter', () => {
            state.isMouseInCanvas = true;
            state.cursorDot.style.opacity = '1';
            state.cursorRing.style.opacity = '1';
        });
        document.addEventListener('mouseleave', () => {
            state.isMouseInCanvas = false;
            state.cursorDot.style.opacity = '0';
            state.cursorRing.style.opacity = '0';
        });
        
        window.addEventListener('resize', debounce(updateElementPositions, 150));
    }

    function handleMouseMove(e) {
        state.mouseVelocity.x = e.clientX - state.mouse.x;
        state.mouseVelocity.y = e.clientY - state.mouse.y;
        
        state.lastMouse.x = state.mouse.x;
        state.lastMouse.y = state.mouse.y;
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
        
        updateCursorPosition();
    }

    function updateCursorPosition() {
        if (!state.cursorDot || !state.cursorRing) return;
        
        state.cursorDot.style.left = state.mouse.x + 'px';
        state.cursorDot.style.top = state.mouse.y + 'px';
        
        const ringX = state.mouse.x + state.mouseVelocity.x * 2;
        const ringY = state.mouse.y + state.mouseVelocity.y * 2;
        state.cursorRing.style.left = ringX + 'px';
        state.cursorRing.style.top = ringY + 'px';
        
        const speed = Math.sqrt(
            state.mouseVelocity.x ** 2 + state.mouseVelocity.y ** 2
        );
        
        if (speed > 8) {
            state.cursorRing.classList.add('active');
        } else {
            state.cursorRing.classList.remove('active');
        }
    }

    function updateElementPositions() {
        state.elements.forEach((item) => {
            const rect = item.el.getBoundingClientRect();
            item.homeX = rect.left + rect.width / 2;
            item.homeY = rect.top + rect.height / 2;
        });
    }

    function startAnimation() {
        function animate() {
            updateMagneticElements();
            updateTrails();
            state.animationId = requestAnimationFrame(animate);
        }
        animate();
    }

    function updateMagneticElements() {
        state.elements.forEach((item) => {
            const dx = state.mouse.x - item.currentX;
            const dy = state.mouse.y - item.currentY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            let forceX = 0;
            let forceY = 0;
            
            if (distance < CONFIG.influenceRadius && distance > 0) {
                const normalizedDistance = distance / CONFIG.influenceRadius;
                const falloff = 1 - normalizedDistance;
                const strength = falloff * falloff * item.strength * CONFIG.forceStrength;
                
                const dirX = dx / distance;
                const dirY = dy / distance;
                
                switch (item.type) {
                    case 'attract':
                        forceX = dirX * strength * 50;
                        forceY = dirY * strength * 50;
                        break;
                        
                    case 'repel':
                        forceX = -dirX * strength * 60;
                        forceY = -dirY * strength * 60;
                        break;
                        
                    case 'orbit':
                        item.angle += strength * 0.08;
                        const orbitRadius = 30 * strength;
                        forceX = Math.cos(item.angle) * orbitRadius;
                        forceY = Math.sin(item.angle) * orbitRadius;
                        
                        forceX += dirX * strength * 20;
                        forceY += dirY * strength * 20;
                        break;
                }
            }
            
            const homeForceX = (item.homeX - item.currentX) * 0.08;
            const homeForceY = (item.homeY - item.currentY) * 0.08;
            
            item.velocityX += forceX + homeForceX;
            item.velocityY += forceY + homeForceY;
            
            item.velocityX *= (1 - CONFIG.damping);
            item.velocityY *= (1 - CONFIG.damping);
            
            item.currentX += item.velocityX;
            item.currentY += item.velocityY;
            
            const translateX = item.currentX - item.homeX;
            const translateY = item.currentY - item.homeY;
            
            item.el.style.transform = `translate(${translateX}px, ${translateY}px)`;
        });
    }

    function updateTrails() {
        for (let i = state.trails.length - 1; i > 0; i--) {
            state.trails[i].x = state.trails[i - 1].x;
            state.trails[i].y = state.trails[i - 1].y;
            state.trails[i].opacity = state.trails[i - 1].opacity * CONFIG.trailFadeSpeed;
        }
        
        if (state.isMouseInCanvas) {
            state.trails[0].x = state.mouse.x;
            state.trails[0].y = state.mouse.y;
            state.trails[0].opacity = 0.6;
        } else {
            state.trails[0].opacity *= CONFIG.trailFadeSpeed;
        }
        
        state.trails.forEach((trail, index) => {
            const scale = 1 - (index / state.trails.length) * 0.7;
            trail.el.style.left = trail.x + 'px';
            trail.el.style.top = trail.y + 'px';
            trail.el.style.opacity = trail.opacity;
            trail.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
        });
    }

    function bindControls() {
        const forceSlider = document.getElementById('force-strength');
        const forceValue = document.getElementById('force-value');
        const radiusSlider = document.getElementById('influence-radius');
        const radiusValue = document.getElementById('radius-value');
        const dampingSlider = document.getElementById('damping');
        const dampingValue = document.getElementById('damping-value');
        const resetBtn = document.getElementById('reset-btn');
        
        forceSlider.addEventListener('input', (e) => {
            CONFIG.forceStrength = parseFloat(e.target.value);
            forceValue.textContent = CONFIG.forceStrength.toFixed(1) + 'x';
        });
        
        radiusSlider.addEventListener('input', (e) => {
            CONFIG.influenceRadius = parseInt(e.target.value);
            radiusValue.textContent = CONFIG.influenceRadius + 'px';
        });
        
        dampingSlider.addEventListener('input', (e) => {
            CONFIG.damping = parseFloat(e.target.value);
            dampingValue.textContent = CONFIG.damping.toFixed(2);
        });
        
        resetBtn.addEventListener('click', resetPositions);
    }

    function resetPositions() {
        state.elements.forEach((item) => {
            item.currentX = item.homeX;
            item.currentY = item.homeY;
            item.velocityX = 0;
            item.velocityY = 0;
            item.angle = 0;
            item.el.style.transform = 'translate(0, 0)';
        });
    }

    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
