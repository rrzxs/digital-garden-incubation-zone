(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var ELEMENT_MAP = {
        pillow: { emoji: '\uD83D\uDECB', label: '靠枕' },
        candle: { emoji: '\uD83D\uDD6F', label: '蜡烛', animClass: 'candle-element' },
        plant: { emoji: '\uD83C\uDF3F', label: '植物', animClass: 'plant-element' },
        book: { emoji: '\uD83D\uDCD6', label: '书本' },
        cup: { emoji: '\uD83C\uDF75', label: '茶杯' },
        music: { emoji: '\u266B', label: '音乐', animClass: 'music-element' },
        cat: { emoji: '\uD83D\uDC31', label: '猫咪', animClass: 'cat-element' },
        window: { emoji: '\uD83DE\uDD5F', label: '窗户' }
    };

    var MOOD_THEMES = {
        warm: { active: '#f5a623', blobs: ['rgba(245,166,35,0.3)', 'rgba(255,107,107,0.2)', 'rgba(255,200,87,0.2)'] },
        cool: { active: '#5ac8fa', blobs: ['rgba(90,200,250,0.3)', 'rgba(100,149,237,0.2)', 'rgba(72,209,204,0.2)'] },
        dreamy: { active: '#bd93f9', blobs: ['rgba(189,147,249,0.3)', 'rgba(255,121,198,0.2)', 'rgba(139,92,246,0.2)'] },
        zen: { active: '#50fa7b', blobs: ['rgba(80,250,123,0.25)', 'rgba(52,211,153,0.2)', 'rgba(16,185,129,0.2)'] }
    };

    var AFFIRMATIONS = [
        '你值得被温柔以待',
        '此刻的你，已经足够好了',
        '呼吸，一切都在正确的轨道上',
        '允许自己慢下来，世界不会因此停转',
        '你的感受是合理的，你的存在是珍贵的',
        '每一个清晨都是新的开始',
        '你不需要完美，你只需要真实',
        '柔软是一种力量，而非软弱',
        '宇宙在温柔地注视着你',
        '你已经走过了那么多不容易的日子',
        '今天的你，正在成为更好的自己',
        '让时间去证明，一切都是最好的安排',
        '你是这世界上独一无二的存在',
        '不必急于求成，花自有花期',
        '此刻的宁静，是送给自己的礼物'
    ];

    var currentMood = 'warm';
    var placedElements = [];
    var audioCtx = null;
    var activeSounds = {};
    var breatheInterval = null;
    var elementIdCounter = 0;

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var particles = [];
    var mouseX = 0, mouseY = 0;

    function init() {
        resizeCanvas();
        createParticles();
        bindPaletteDrag();
        bindWorkspaceDrop();
        bindMoodSelector();
        bindSoundControl();
        bindActionButtons();
        bindOverlays();
        animateParticles();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        var count = Math.floor((canvas.width * canvas.height) / 18000);
        count = Math.min(count, 80);
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.3 + 0.05,
                baseAlpha: Math.random() * 0.3 + 0.05
            });
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var theme = MOOD_THEMES[currentMood];
        var color = hexToRgb(theme.active);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                var force = (150 - dist) / 150 * 0.02;
                p.vx += dx * force * 0.01;
                p.vy += dy * force * 0.01;
                p.alpha = p.baseAlpha + (1 - dist / 150) * 0.2;
            } else {
                p.alpha += (p.baseAlpha - p.alpha) * 0.02;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.99;
            p.vy *= 0.99;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + p.alpha + ')';
            ctx.fill();
        }

        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var ddx = particles[a].x - particles[b].x;
                var ddy = particles[a].y - particles[b].y;
                var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dd < 120) {
                    var lineAlpha = (1 - dd / 120) * 0.06;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + lineAlpha + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animateParticles);
    }

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    function bindPaletteDrag() {
        var items = document.querySelectorAll('.palette-item');
        items.forEach(function (item) {
            item.addEventListener('dragstart', function (e) {
                e.dataTransfer.setData('text/plain', item.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
            });
            item.addEventListener('click', function () {
                addElementToWorkspace(item.dataset.type);
            });
        });
    }

    function bindWorkspaceDrop() {
        var workspace = document.getElementById('workspace');
        var wsInner = document.getElementById('workspace-inner');

        workspace.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            workspace.classList.add('drag-over');
        });

        workspace.addEventListener('dragleave', function () {
            workspace.classList.remove('drag-over');
        });

        workspace.addEventListener('drop', function (e) {
            e.preventDefault();
            workspace.classList.remove('drag-over');
            var type = e.dataTransfer.getData('text/plain');
            if (type && ELEMENT_MAP[type]) {
                var rect = wsInner.getBoundingClientRect();
                var x = e.clientX - rect.left - 30;
                var y = e.clientY - rect.top - 30;
                addElementToWorkspace(type, x, y);
            }
        });
    }

    function addElementToWorkspace(type, posX, posY) {
        var wsInner = document.getElementById('workspace-inner');
        var hint = document.getElementById('workspace-hint');
        var config = ELEMENT_MAP[type];
        if (!config) return;

        hint.classList.add('hidden');

        var rect = wsInner.getBoundingClientRect();
        if (posX === undefined) {
            posX = Math.random() * (rect.width - 80) + 20;
            posY = Math.random() * (rect.height - 80) + 20;
        }
        posX = Math.max(0, Math.min(posX, rect.width - 60));
        posY = Math.max(0, Math.min(posY, rect.height - 60));

        var id = 'el-' + (++elementIdCounter);
        var el = document.createElement('div');
        el.className = 'placed-element' + (config.animClass ? ' ' + config.animClass : '');
        el.id = id;
        el.dataset.type = type;
        el.style.left = posX + 'px';
        el.style.top = posY + 'px';

        var glow = document.createElement('div');
        glow.className = 'ambient-glow';
        el.appendChild(glow);

        var emoji = document.createElement('span');
        emoji.className = 'el-emoji';
        emoji.textContent = config.emoji;
        el.appendChild(emoji);

        var label = document.createElement('span');
        label.className = 'el-label';
        label.textContent = config.label;
        el.appendChild(label);

        makeDraggableInWorkspace(el, wsInner);
        bindDoubleClickRemove(el);

        wsInner.appendChild(el);
        placedElements.push({ id: id, type: type, x: posX, y: posY });

        showToast(config.emoji + ' ' + config.label + ' 已添加');
    }

    function makeDraggableInWorkspace(el, container) {
        var isDragging = false;
        var startX, startY, elStartX, elStartY;

        function onPointerDown(e) {
            if (e.button !== 0) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            elStartX = parseInt(el.style.left, 10) || 0;
            elStartY = parseInt(el.style.top, 10) || 0;
            el.style.zIndex = 30;
            el.style.transition = 'none';
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            var rect = container.getBoundingClientRect();
            var newX = Math.max(0, Math.min(elStartX + dx, rect.width - 60));
            var newY = Math.max(0, Math.min(elStartY + dy, rect.height - 60));
            el.style.left = newX + 'px';
            el.style.top = newY + 'px';
        }

        function onPointerUp() {
            isDragging = false;
            el.style.zIndex = 10;
            el.style.transition = '';
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        }

        el.addEventListener('pointerdown', onPointerDown);
    }

    function bindDoubleClickRemove(el) {
        el.addEventListener('dblclick', function () {
            removeElement(el);
        });
    }

    function removeElement(el) {
        var type = el.dataset.type;
        var config = ELEMENT_MAP[type];
        el.classList.add('removing');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
            placedElements = placedElements.filter(function (pe) { return pe.id !== el.id; });
            if (placedElements.length === 0) {
                document.getElementById('workspace-hint').classList.remove('hidden');
            }
        }, 500);
        if (config) {
            showToast(config.emoji + ' ' + config.label + ' 已移除');
        }
    }

    function bindMoodSelector() {
        var btns = document.querySelectorAll('.mood-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentMood = btn.dataset.mood;
                applyMoodTheme(currentMood);
            });
        });
    }

    function applyMoodTheme(mood) {
        var theme = MOOD_THEMES[mood];
        if (!theme) return;
        document.documentElement.style.setProperty('--mood-active', theme.active);

        var blobs = document.querySelectorAll('.blob');
        theme.blobs.forEach(function (color, i) {
            if (blobs[i]) {
                blobs[i].style.background = 'radial-gradient(circle, ' + color + ', transparent 70%)';
            }
        });

        var badge = document.querySelector('.header-badge');
        if (badge) {
            badge.style.color = theme.active;
        }
    }

    function bindSoundControl() {
        var btns = document.querySelectorAll('.sound-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var sound = btn.dataset.sound;
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    stopSound(sound);
                } else {
                    btn.classList.add('active');
                    playSound(sound);
                }
            });
        });
    }

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playSound(type) {
        var ctx = getAudioCtx();
        stopSound(type);

        var gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(ctx.destination);

        var osc;
        var lfo;
        var lfoGain;

        if (type === 'rain') {
            var bufferSize = 2 * ctx.sampleRate;
            var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            var output = noiseBuffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            var noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            noise.loop = true;
            var filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            noise.connect(filter);
            filter.connect(gain);
            noise.start();
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1);
            activeSounds[type] = { sources: [noise], gain: gain };
        } else if (type === 'fire') {
            var bufferSize2 = 2 * ctx.sampleRate;
            var noiseBuffer2 = ctx.createBuffer(1, bufferSize2, ctx.sampleRate);
            var output2 = noiseBuffer2.getChannelData(0);
            for (var j = 0; j < bufferSize2; j++) {
                output2[j] = Math.random() * 2 - 1;
            }
            var noise2 = ctx.createBufferSource();
            noise2.buffer = noiseBuffer2;
            noise2.loop = true;
            var filter2 = ctx.createBiquadFilter();
            filter2.type = 'bandpass';
            filter2.frequency.value = 600;
            filter2.Q.value = 0.5;
            noise2.connect(filter2);
            filter2.connect(gain);
            noise2.start();
            gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1);
            activeSounds[type] = { sources: [noise2], gain: gain };
        } else if (type === 'wind') {
            var bufferSize3 = 2 * ctx.sampleRate;
            var noiseBuffer3 = ctx.createBuffer(1, bufferSize3, ctx.sampleRate);
            var output3 = noiseBuffer3.getChannelData(0);
            for (var k = 0; k < bufferSize3; k++) {
                output3[k] = Math.random() * 2 - 1;
            }
            var noise3 = ctx.createBufferSource();
            noise3.buffer = noiseBuffer3;
            noise3.loop = true;
            var filter3 = ctx.createBiquadFilter();
            filter3.type = 'lowpass';
            filter3.frequency.value = 200;
            noise3.connect(filter3);
            filter3.connect(gain);
            noise3.start();
            gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1);
            activeSounds[type] = { sources: [noise3], gain: gain };
        } else if (type === 'night') {
            osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 4200;
            lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 6;
            lfoGain = ctx.createGain();
            lfoGain.gain.value = 800;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gain);
            osc.start();
            lfo.start();
            gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1);
            activeSounds[type] = { sources: [osc, lfo], gain: gain };
        }
    }

    function stopSound(type) {
        var sound = activeSounds[type];
        if (!sound) return;
        try {
            sound.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
            setTimeout(function () {
                sound.sources.forEach(function (s) {
                    try { s.stop(); } catch (e) { /* already stopped */ }
                });
                try { sound.gain.disconnect(); } catch (e) { /* ignore */ }
            }, 600);
        } catch (e) { /* ignore */ }
        delete activeSounds[type];
    }

    function bindActionButtons() {
        document.getElementById('btn-breathe').addEventListener('click', openBreathe);
        document.getElementById('btn-affirm').addEventListener('click', openAffirm);
        document.getElementById('btn-clear').addEventListener('click', clearWorkspace);
    }

    function openBreathe() {
        var overlay = document.getElementById('breathe-overlay');
        overlay.classList.add('visible');
        startBreatheCycle();
    }

    function startBreatheCycle() {
        var phaseText = document.getElementById('breathe-phase-text');
        var counter = document.getElementById('breathe-counter');
        var phases = [
            { name: '吸气', duration: 4 },
            { name: '屏息', duration: 4 },
            { name: '呼气', duration: 4 }
        ];
        var phaseIndex = 0;
        var count = phases[0].duration;

        phaseText.textContent = phases[0].name;
        counter.textContent = count;

        if (breatheInterval) clearInterval(breatheInterval);
        breatheInterval = setInterval(function () {
            count--;
            if (count <= 0) {
                phaseIndex = (phaseIndex + 1) % phases.length;
                count = phases[phaseIndex].duration;
                phaseText.textContent = phases[phaseIndex].name;
            }
            counter.textContent = count;
        }, 1000);
    }

    function bindOverlays() {
        document.getElementById('breathe-close').addEventListener('click', function () {
            document.getElementById('breathe-overlay').classList.remove('visible');
            if (breatheInterval) {
                clearInterval(breatheInterval);
                breatheInterval = null;
            }
        });

        document.getElementById('affirm-close').addEventListener('click', function () {
            document.getElementById('affirm-overlay').classList.remove('visible');
        });

        document.getElementById('breathe-overlay').addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('visible');
                if (breatheInterval) {
                    clearInterval(breatheInterval);
                    breatheInterval = null;
                }
            }
        });

        document.getElementById('affirm-overlay').addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('visible');
            }
        });
    }

    function openAffirm() {
        var overlay = document.getElementById('affirm-overlay');
        var quoteEl = document.getElementById('affirm-quote');
        var quote = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

        overlay.classList.add('visible');
        typeText(quoteEl, quote);
    }

    function typeText(el, text) {
        el.textContent = '';
        el.classList.add('typing');
        var index = 0;
        var interval = setInterval(function () {
            if (index < text.length) {
                el.textContent += text[index];
                index++;
            } else {
                clearInterval(interval);
                setTimeout(function () {
                    el.classList.remove('typing');
                }, 1000);
            }
        }, 80);
    }

    function clearWorkspace() {
        var wsInner = document.getElementById('workspace-inner');
        var els = wsInner.querySelectorAll('.placed-element');
        if (els.length === 0) {
            showToast('空间已经是空的');
            return;
        }
        els.forEach(function (el, i) {
            setTimeout(function () {
                el.classList.add('removing');
            }, i * 60);
        });
        setTimeout(function () {
            els.forEach(function (el) {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            placedElements = [];
            document.getElementById('workspace-hint').classList.remove('hidden');
        }, els.length * 60 + 500);
        showToast('空间已清空');
    }

    function showToast(message) {
        var container = document.getElementById('toast-container');
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('removing');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 2200);
    }

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
