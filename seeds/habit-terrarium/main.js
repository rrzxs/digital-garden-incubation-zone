(function () {
    'use strict';

    var STORAGE_KEY = 'habit_terrarium_data';
    var DATE_KEY = 'habit_terrarium_date';

    var state = loadState();

    var dom = {
        dateDisplay: document.getElementById('date-display'),
        streakCount: document.getElementById('streak-count'),
        plantLayer: document.getElementById('plant-layer'),
        mistLayer: document.getElementById('mist-layer'),
        condensation: document.getElementById('condensation'),
        habitsList: document.getElementById('habits-list'),
        emptyHabits: document.getElementById('empty-habits'),
        addBtn: document.getElementById('add-habit-btn'),
        modalOverlay: document.getElementById('modal-overlay'),
        nameInput: document.getElementById('habit-name-input'),
        plantSelector: document.getElementById('plant-selector'),
        modalCancel: document.getElementById('modal-cancel'),
        modalConfirm: document.getElementById('modal-confirm'),
        toastContainer: document.getElementById('toast-container'),
        particleCanvas: document.getElementById('particle-canvas')
    };

    var selectedPlantType = 'succulent';
    var particles = [];

    init();

    function init() {
        setDateDisplay();
        resetIfNewDay();
        renderHabits();
        renderPlants();
        updateStreak();
        createMistDrops();
        createCondensationDrops();
        initParticles();
        bindEvents();
    }

    function bindEvents() {
        dom.addBtn.addEventListener('click', openModal);
        dom.modalCancel.addEventListener('click', closeModal);
        dom.modalConfirm.addEventListener('click', addHabit);
        dom.modalOverlay.addEventListener('click', function (e) {
            if (e.target === dom.modalOverlay) closeModal();
        });
        dom.nameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') addHabit();
            if (e.key === 'Escape') closeModal();
        });

        var plantOptions = dom.plantSelector.querySelectorAll('.plant-option');
        plantOptions.forEach(function (opt) {
            opt.addEventListener('click', function () {
                plantOptions.forEach(function (o) { o.classList.remove('active'); });
                opt.classList.add('active');
                selectedPlantType = opt.getAttribute('data-type');
            });
        });

        window.addEventListener('resize', function () {
            resizeCanvas();
        });
    }

    function setDateDisplay() {
        var now = new Date();
        var options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dom.dateDisplay.textContent = now.toLocaleDateString('zh-CN', options);
    }

    function getTodayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function resetIfNewDay() {
        var today = getTodayKey();
        var saved = localStorage.getItem(DATE_KEY);
        if (saved !== today) {
            state.habits.forEach(function (h) {
                h.completedToday = false;
            });
            localStorage.setItem(DATE_KEY, today);
            saveState();
        }
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.habits)) {
                    return parsed;
                }
            }
        } catch (e) { }
        return { habits: [] };
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function openModal() {
        dom.modalOverlay.classList.add('active');
        dom.nameInput.value = '';
        dom.nameInput.focus();
        dom.nameInput.setAttribute('placeholder', '例如: 晨间冥想');
    }

    function closeModal() {
        dom.modalOverlay.classList.remove('active');
    }

    function addHabit() {
        var name = dom.nameInput.value.trim();
        if (!name) {
            dom.nameInput.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            dom.nameInput.setAttribute('placeholder', '请输入习惯名称');
            setTimeout(function () {
                dom.nameInput.style.borderColor = '';
            }, 1500);
            return;
        }

        var habit = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name: name,
            type: selectedPlantType,
            level: 0,
            streak: 0,
            lastCompleted: null,
            completedToday: false,
            createdAt: Date.now()
        };

        state.habits.push(habit);
        saveState();
        closeModal();
        renderHabits();
        renderPlants();
        showToast('种子已种下: ' + name);
    }

    function toggleHabit(habitId) {
        var habit = state.habits.find(function (h) { return h.id === habitId; });
        if (!habit) return;

        habit.completedToday = !habit.completedToday;

        if (habit.completedToday) {
            var today = getTodayKey();
            if (habit.lastCompleted) {
                var last = new Date(habit.lastCompleted);
                var now = new Date(today);
                var diff = Math.round((now - last) / (1000 * 60 * 60 * 24));
                if (diff === 1) {
                    habit.streak += 1;
                } else if (diff > 1) {
                    habit.streak = 1;
                }
            } else {
                habit.streak = 1;
            }
            habit.lastCompleted = today;
            habit.level = Math.min(habit.level + 1, 10);
            spawnSparkles(habitId);
        } else {
            if (habit.level > 0) {
                habit.level = Math.max(0, habit.level - 1);
            }
            habit.streak = Math.max(0, habit.streak - 1);
        }

        saveState();
        renderHabits();
        renderPlants();
        updateStreak();
    }

    function deleteHabit(habitId) {
        state.habits = state.habits.filter(function (h) { return h.id !== habitId; });
        saveState();
        renderHabits();
        renderPlants();
        updateStreak();
        showToast('植物已移除');
    }

    function renderHabits() {
        var habits = state.habits;
        if (habits.length === 0) {
            dom.emptyHabits.style.display = 'block';
            var items = dom.habitsList.querySelectorAll('.habit-item');
            items.forEach(function (el) { el.remove(); });
            return;
        }

        dom.emptyHabits.style.display = 'none';
        dom.habitsList.innerHTML = '';

        habits.forEach(function (habit, index) {
            var el = document.createElement('div');
            el.className = 'habit-item' + (habit.completedToday ? ' completed' : '');
            el.style.animationDelay = (index * 0.06) + 's';

            var metaText = 'Lv.' + habit.level;
            if (habit.streak > 0) {
                metaText += '  ·  ' + habit.streak + '天连续';
            }

            el.innerHTML =
                '<div class="habit-check"></div>' +
                '<div class="habit-info">' +
                    '<div class="habit-name">' + escapeHtml(habit.name) + '</div>' +
                    '<div class="habit-meta">' + metaText + '</div>' +
                '</div>' +
                '<button class="habit-delete" aria-label="删除" data-id="' + habit.id + '">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                        '<line x1="18" y1="6" x2="6" y2="18"/>' +
                        '<line x1="6" y1="6" x2="18" y2="18"/>' +
                    '</svg>' +
                '</button>';

            el.querySelector('.habit-check').addEventListener('click', function (e) {
                e.stopPropagation();
                toggleHabit(habit.id);
            });

            el.querySelector('.habit-delete').addEventListener('click', function (e) {
                e.stopPropagation();
                deleteHabit(habit.id);
            });

            el.addEventListener('click', function () {
                toggleHabit(habit.id);
            });

            dom.habitsList.appendChild(el);
        });
    }

    function renderPlants() {
        dom.plantLayer.innerHTML = '';

        if (state.habits.length === 0) return;

        var count = state.habits.length;
        var spread = Math.min(count, 6);

        state.habits.forEach(function (habit, idx) {
            var wrapper = document.createElement('div');
            wrapper.className = 'plant-item' + (habit.completedToday ? ' completed' : '');
            wrapper.setAttribute('data-habit-id', habit.id);

            var svgContainer = document.createElement('div');
            svgContainer.className = 'plant-svg-container';
            svgContainer.innerHTML = generatePlantSVG(habit.type, habit.level);
            svgContainer.style.animation = 'plantGrow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ' + (idx * 0.08) + 's both';
            svgContainer.style.transformOrigin = 'bottom center';

            var glowEl = document.createElement('div');
            glowEl.className = 'plant-glow';

            var nameEl = document.createElement('div');
            nameEl.className = 'plant-name';
            nameEl.textContent = habit.name;

            wrapper.appendChild(glowEl);
            wrapper.appendChild(svgContainer);
            wrapper.appendChild(nameEl);
            dom.plantLayer.appendChild(wrapper);
        });
    }

    function generatePlantSVG(type, level) {
        var growthScale = 0.3 + (level / 10) * 0.7;
        var h = Math.round(60 + growthScale * 80);
        var w = 60;
        var svgAttrs = 'viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" style="overflow:visible"';

        switch (type) {
            case 'succulent': return generateSucculent(svgAttrs, w, h, level, growthScale);
            case 'fern': return generateFern(svgAttrs, w, h, level, growthScale);
            case 'flower': return generateFlower(svgAttrs, w, h, level, growthScale);
            case 'cactus': return generateCactus(svgAttrs, w, h, level, growthScale);
            default: return generateSucculent(svgAttrs, w, h, level, growthScale);
        }
    }

    function generateSucculent(attrs, w, h, level, scale) {
        var cy = h - 10;
        var r = 6 + level * 1.2;
        var petals = 3 + Math.min(level, 5);
        var paths = '';
        var colors = ['#4ade80', '#22c55e', '#86efac', '#34d399', '#6ee7b7'];

        for (var i = 0; i < petals; i++) {
            var angle = (i / petals) * Math.PI * 2 - Math.PI / 2;
            var px = w / 2 + Math.cos(angle) * r * 0.9;
            var py = cy + Math.sin(angle) * r * 0.5;
            var rx = r * 0.5;
            var ry = r * 0.8;
            var rot = (angle * 180 / Math.PI) + 90;
            var color = colors[i % colors.length];
            paths += '<ellipse cx="' + px + '" cy="' + py + '" rx="' + rx + '" ry="' + ry + '" fill="' + color + '" opacity="0.75" transform="rotate(' + rot + ' ' + px + ' ' + py + ')"/>';
        }

        paths += '<ellipse cx="' + (w / 2) + '" cy="' + cy + '" rx="' + (r * 0.35) + '" ry="' + (r * 0.5) + '" fill="#86efac" opacity="0.9"/>';

        if (level >= 5) {
            var stemH = 15 + level * 2;
            paths = '<line x1="' + (w / 2) + '" y1="' + cy + '" x2="' + (w / 2) + '" y2="' + (cy + stemH) + '" stroke="#22c55e" stroke-width="2" opacity="0.5"/>' + paths;
        }

        return '<svg ' + attrs + '>' + paths + '</svg>';
    }

    function generateFern(attrs, w, h, level, scale) {
        var stems = Math.min(2 + Math.floor(level / 2), 6);
        var maxH = 30 + level * 8;
        var paths = '';
        var colors = ['#4ade80', '#22c55e', '#16a34a', '#15803d'];

        for (var s = 0; s < stems; s++) {
            var baseX = w / 2 + (s - (stems - 1) / 2) * 10;
            var baseY = h;
            var stemH = maxH * (0.7 + Math.random() * 0.3);
            var sway = (s - (stems - 1) / 2) * 8;

            var topX = baseX + sway;
            var topY = baseY - stemH;

            paths += '<path d="M' + baseX + ',' + baseY + ' Q' + (baseX + sway * 0.5) + ',' + (baseY - stemH * 0.5) + ' ' + topX + ',' + topY + '" stroke="' + colors[s % colors.length] + '" fill="none" stroke-width="1.5" opacity="0.8"/>';

            var leaves = 3 + level;
            for (var l = 0; l < leaves; l++) {
                var t = (l + 1) / (leaves + 1);
                var lx = baseX + sway * t * t;
                var ly = baseY - stemH * t;
                var leafLen = (8 + level) * (1 - t * 0.5);
                var side = l % 2 === 0 ? 1 : -1;

                paths += '<path d="M' + lx + ',' + ly + ' Q' + (lx + side * leafLen * 0.7) + ',' + (ly - leafLen * 0.3) + ' ' + (lx + side * leafLen * 0.4) + ',' + (ly - leafLen * 0.6) + '" stroke="' + colors[(s + l) % colors.length] + '" fill="none" stroke-width="1" opacity="0.6"/>';
            }
        }

        return '<svg ' + attrs + '">' + paths + '</svg>';
    }

    function generateFlower(attrs, w, h, level, scale) {
        var stemH = 20 + level * 7;
        var paths = '';
        var baseX = w / 2;
        var baseY = h;

        paths += '<line x1="' + baseX + '" y1="' + baseY + '" x2="' + baseX + '" y2="' + (baseY - stemH) + '" stroke="#22c55e" stroke-width="2" opacity="0.7"/>';

        if (level >= 2) {
            var leafY = baseY - stemH * 0.4;
            paths += '<path d="M' + baseX + ',' + leafY + ' Q' + (baseX - 12) + ',' + (leafY - 6) + ' ' + (baseX - 8) + ',' + (leafY - 10) + '" stroke="#4ade80" fill="none" stroke-width="1.5" opacity="0.6"/>';
            paths += '<path d="M' + baseX + ',' + (leafY + 5) + ' Q' + (baseX + 12) + ',' + (leafY - 2) + ' ' + (baseX + 8) + ',' + (leafY - 8) + '" stroke="#4ade80" fill="none" stroke-width="1.5" opacity="0.6"/>';
        }

        var flowerY = baseY - stemH;
        var petalCount = 4 + Math.min(level, 4);
        var petalR = 4 + level * 0.8;
        var petalColors = ['#f472b6', '#fb923c', '#a78bfa', '#fbbf24', '#60a5fa', '#f9a8d4', '#c084fc', '#fdba74'];

        for (var p = 0; p < petalCount; p++) {
            var angle = (p / petalCount) * Math.PI * 2;
            var px = baseX + Math.cos(angle) * petalR * 0.8;
            var py = flowerY + Math.sin(angle) * petalR * 0.6;
            paths += '<ellipse cx="' + px + '" cy="' + py + '" rx="' + (petalR * 0.45) + '" ry="' + (petalR * 0.55) + '" fill="' + petalColors[p % petalColors.length] + '" opacity="0.75"/>';
        }

        paths += '<circle cx="' + baseX + '" cy="' + flowerY + '" r="' + (petalR * 0.3) + '" fill="#fbbf24" opacity="0.9"/>';

        return '<svg ' + attrs + '">' + paths + '</svg>';
    }

    function generateCactus(attrs, w, h, level, scale) {
        var bodyH = 15 + level * 5;
        var bodyW = 8 + level * 0.5;
        var baseX = w / 2;
        var baseY = h;
        var paths = '';

        paths += '<rect x="' + (baseX - bodyW / 2) + '" y="' + (baseY - bodyH) + '" width="' + bodyW + '" height="' + bodyH + '" rx="' + (bodyW / 2) + '" fill="#4ade80" opacity="0.8"/>';

        if (level >= 1) {
            var armH = bodyH * 0.4;
            var armW = bodyW * 0.7;
            paths += '<path d="M' + (baseX - bodyW / 2) + ',' + (baseY - bodyH * 0.55) + ' Q' + (baseX - bodyW / 2 - armW) + ',' + (baseY - bodyH * 0.55) + ' ' + (baseX - bodyW / 2 - armW) + ',' + (baseY - bodyH * 0.55 - armH) + '" stroke="#22c55e" fill="none" stroke-width="' + (armW * 0.8) + '" stroke-linecap="round" opacity="0.75"/>';
        }

        if (level >= 3) {
            var armH2 = bodyH * 0.35;
            var armW2 = bodyW * 0.6;
            paths += '<path d="M' + (baseX + bodyW / 2) + ',' + (baseY - bodyH * 0.4) + ' Q' + (baseX + bodyW / 2 + armW2) + ',' + (baseY - bodyH * 0.4) + ' ' + (baseX + bodyW / 2 + armW2) + ',' + (baseY - bodyH * 0.4 - armH2) + '" stroke="#22c55e" fill="none" stroke-width="' + (armW2 * 0.8) + '" stroke-linecap="round" opacity="0.75"/>';
        }

        if (level >= 6) {
            paths += '<circle cx="' + (baseX - 2) + '" cy="' + (baseY - bodyH - 2) + '" r="2" fill="#fbbf24" opacity="0.7"/>';
            paths += '<circle cx="' + (baseX + 3) + '" cy="' + (baseY - bodyH + 1) + '" r="1.5" fill="#fb923c" opacity="0.6"/>';
        }

        for (var d = 0; d < Math.min(level, 6); d++) {
            var dy = baseY - bodyH * (0.2 + d * 0.13);
            paths += '<line x1="' + (baseX - 1) + '" y1="' + dy + '" x2="' + (baseX + 1) + '" y2="' + dy + '" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>';
        }

        return '<svg ' + attrs + '">' + paths + '</svg>';
    }

    function spawnSparkles(habitId) {
        var plantEl = dom.plantLayer.querySelector('[data-habit-id="' + habitId + '"]');
        if (!plantEl) return;

        var rect = plantEl.getBoundingClientRect();
        var terrariumRect = dom.plantLayer.getBoundingClientRect();

        for (var i = 0; i < 8; i++) {
            var sparkle = document.createElement('div');
            sparkle.className = 'sparkle';

            var offsetX = (rect.left - terrariumRect.left) + rect.width * Math.random();
            var offsetY = (rect.top - terrariumRect.top) + rect.height * Math.random() * 0.6;

            sparkle.style.left = offsetX + 'px';
            sparkle.style.top = offsetY + 'px';
            sparkle.style.animationDelay = (i * 0.06) + 's';
            sparkle.style.width = (4 + Math.random() * 4) + 'px';
            sparkle.style.height = sparkle.style.width;

            dom.plantLayer.appendChild(sparkle);

            (function (el) {
                setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 1000);
            })(sparkle);
        }
    }

    function updateStreak() {
        var maxStreak = 0;
        state.habits.forEach(function (h) {
            if (h.streak > maxStreak) maxStreak = h.streak;
        });
        dom.streakCount.textContent = maxStreak;

        if (maxStreak > 0) {
            dom.streakCount.parentElement.style.background = 'rgba(74, 222, 128, 0.12)';
            dom.streakCount.parentElement.style.borderColor = 'rgba(74, 222, 128, 0.3)';
        }
    }

    function createMistDrops() {
        var count = 15;
        for (var i = 0; i < count; i++) {
            var drop = document.createElement('div');
            drop.className = 'mist-drop';
            drop.style.left = (Math.random() * 100) + '%';
            drop.style.top = (50 + Math.random() * 50) + '%';
            drop.style.animationDelay = (Math.random() * 8) + 's';
            drop.style.animationDuration = (6 + Math.random() * 6) + 's';
            drop.style.width = (2 + Math.random() * 3) + 'px';
            drop.style.height = drop.style.width;
            dom.mistLayer.appendChild(drop);
        }
    }

    function createCondensationDrops() {
        var count = 8;
        for (var i = 0; i < count; i++) {
            var drop = document.createElement('div');
            drop.className = 'condensation-drop';
            drop.style.left = (5 + Math.random() * 90) + '%';
            drop.style.top = (5 + Math.random() * 30) + '%';
            drop.style.animationDelay = (Math.random() * 12) + 's';
            drop.style.animationDuration = (10 + Math.random() * 8) + 's';
            dom.condensation.appendChild(drop);
        }
    }

    function initParticles() {
        var canvas = dom.particleCanvas;
        var ctx = canvas.getContext('2d');
        resizeCanvas();

        for (var i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: 1 + Math.random() * 2,
                alpha: 0.1 + Math.random() * 0.2,
                pulse: Math.random() * Math.PI * 2
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.02;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                var currentAlpha = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(74, 222, 128, ' + currentAlpha + ')';
                ctx.fill();
            }

            requestAnimationFrame(animate);
        }

        animate();
    }

    function resizeCanvas() {
        var canvas = dom.particleCanvas;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('out');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 2200);
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
})();
