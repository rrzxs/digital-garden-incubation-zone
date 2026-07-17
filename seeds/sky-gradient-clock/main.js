/* ==========================================================================
   Sky Gradient Clock · 天空渐变时钟
   交互逻辑：时间驱动天空渐变 + 阶段切换 + 日轨可视化
   maintainer: EDEN
   ========================================================================== */

(function () {
    'use strict';

    // === DOM Elements ===
    const root = document.body;
    const elHour = document.getElementById('time-hour');
    const elMin = document.getElementById('time-min');
    const elSec = document.getElementById('time-sec');
    const elMeridiem = document.getElementById('meridiem');
    const elGreeting = document.getElementById('greeting');
    const elDate = document.getElementById('date-display');
    const elPhaseName = document.getElementById('phase-name');
    const elRingProgress = document.getElementById('ring-progress');
    const elTicksGroup = document.getElementById('ticks-group');
    const elOrbitPointer = document.getElementById('orbit-pointer');
    const elTimelineFill = document.getElementById('timeline-fill');
    const elTimelineMarker = document.getElementById('timeline-marker');
    const elDayProgressText = document.getElementById('day-progress-text');
    const elSunMoon = document.getElementById('sun-moon');
    const elStarfield = document.getElementById('starfield');
    const elSunrise = document.getElementById('sunrise-time');
    const elSunset = document.getElementById('sunset-time');
    const elDaylight = document.getElementById('daylight-text');
    const elTimezone = document.getElementById('timezone-text');
    const phaseButtons = document.querySelectorAll('.phase-btn');

    // === Constants ===
    const RING_RADIUS = 180;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~1130.97
    const HOURS_ON_RING = 12;

    // 固定的日出日落时间（演示用，可改为根据真实经纬度计算）
    const SUNRISE_HOUR = 6.2;   // 06:12
    const SUNSET_HOUR = 18.8;   // 18:48

    // === State ===
    let manualPhase = null; // null = auto, else 'dawn'|'noon'|'dusk'|'night'

    // === Utility Functions ===
    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // 将时间转换为 [0, 24) 的浮点小时数
    function timeToHours(d) {
        return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    }

    // === Phase Determination · 根据时间确定天空阶段 ===
    function getPhaseFromTime(hours) {
        if (hours >= SUNRISE_HOUR - 0.8 && hours < SUNRISE_HOUR + 1.8) return 'dawn';
        if (hours >= SUNRISE_HOUR + 1.8 && hours < SUNSET_HOUR - 1.8) return 'noon';
        if (hours >= SUNSET_HOUR - 1.8 && hours < SUNSET_HOUR + 1.5) return 'dusk';
        return 'night';
    }

    const PHASE_LABELS = {
        dawn: 'DAWN · 黎明',
        noon: 'NOON · 正午',
        dusk: 'DUSK · 黄昏',
        night: 'NIGHT · 深夜'
    };

    // === Greeting · 问候语 ===
    function getGreeting(hours) {
        if (hours >= 5 && hours < 11) return 'Good morning · 早安';
        if (hours >= 11 && hours < 14) return 'Good noon · 午安';
        if (hours >= 14 && hours < 18) return 'Good afternoon · 午后';
        if (hours >= 18 && hours < 22) return 'Good evening · 晚安';
        return 'Good night · 夜安';
    }

    // === Build Tick Ring · 构建12小时刻度环 ===
    function buildTicks() {
        const cx = 200;
        const cy = 200;
        const innerR = 168;
        const outerR = 178;
        const numInnerR = 156;
        let svg = '';

        for (let i = 0; i < HOURS_ON_RING; i++) {
            // 12小时制，顶部为12点位置。SVG已旋转-90deg，所以从0deg开始顺时针
            const angle = (i / HOURS_ON_RING) * Math.PI * 2;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const x1 = cx + cosA * innerR;
            const y1 = cy + sinA * innerR;
            const x2 = cx + cosA * outerR;
            const y2 = cy + sinA * outerR;
            const isMajor = i % 3 === 0;
            const hourNum = i === 0 ? 12 : i;

            svg += `<line class="tick-line ${isMajor ? 'major' : ''}" data-hour="${hourNum}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;

            // 主刻度数字
            if (isMajor) {
                const nx = cx + cosA * numInnerR;
                const ny = cy + sinA * numInnerR;
                // 数字反向旋转以保持正立（SVG整体旋转了-90deg）
                svg += `<text class="tick-num" x="${nx.toFixed(2)}" y="${ny.toFixed(2)}" text-anchor="middle" dominant-baseline="central" transform="rotate(90 ${nx.toFixed(2)} ${ny.toFixed(2)})">${pad(hourNum)}</text>`;
            }
        }
        elTicksGroup.innerHTML = svg;
    }

    // === Build Starfield · 构建星空 ===
    function buildStarfield() {
        const count = 80;
        let html = '';
        for (let i = 0; i < count; i++) {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = Math.random() * 2 + 1;
            const delay = Math.random() * 3;
            const duration = 2 + Math.random() * 3;
            html += `<div class="star" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${duration}s;"></div>`;
        }
        elStarfield.innerHTML = html;
    }

    // === Highlight Active Tick ===
    function highlightTick(hour12) {
        const ticks = elTicksGroup.querySelectorAll('.tick-line');
        ticks.forEach(t => t.classList.remove('active'));
        const target = elTicksGroup.querySelector(`.tick-line[data-hour="${hour12}"]`);
        if (target) target.classList.add('active');
    }

    // === Update Ring Progress · 12小时进度环 ===
    function updateRingProgress(hour12Float) {
        const progress = (hour12Float / HOURS_ON_RING);
        const offset = RING_CIRCUMFERENCE * (1 - progress);
        elRingProgress.style.strokeDashoffset = offset.toFixed(2);
    }

    // === Update Orbit Pointer · 太阳/月亮轨道指针 ===
    function updateOrbitPointer(hour12Float) {
        const angle = (hour12Float / HOURS_ON_RING) * 360;
        elOrbitPointer.style.transform = `rotate(${angle}deg)`;
    }

    // === Update Sun/Moon Position · 太阳月亮在天空中运动 ===
    function updateCelestialPosition(hours) {
        // 太阳在日出到日落之间在天空中画弧线
        // 夜晚月亮走相反弧线
        let progress; // 0..1 一日完成度
        let isDay;

        if (hours >= SUNRISE_HOUR && hours <= SUNSET_HOUR) {
            isDay = true;
            progress = (hours - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR);
        } else {
            isDay = false;
            // 夜晚部分
            let nightHours;
            if (hours > SUNSET_HOUR) {
                nightHours = hours - SUNSET_HOUR;
            } else {
                nightHours = (24 - SUNSET_HOUR) + hours;
            }
            const totalNight = (24 - SUNSET_HOUR) + SUNRISE_HOUR;
            progress = nightHours / totalNight;
        }

        // 弧线参数：从左下经过顶部到右下
        const w = window.innerWidth;
        const h = window.innerHeight;
        const margin = Math.min(w, h) * 0.1;
        const startX = margin;
        const endX = w - margin;
        const baseY = h * 0.85;
        const peakY = h * 0.12;

        const x = lerp(startX, endX, progress);
        // 抛物线 y = baseY - 4*(peakY-baseY)*p*(1-p) ... 使用 sin
        const arc = Math.sin(progress * Math.PI); // 0..1..0
        const y = baseY - arc * (baseY - peakY);

        // 调整元素中心
        elSunMoon.style.transform = `translate(${x - 40}px, ${y - 40}px)`;
    }

    // === Update Timeline ===
    function updateTimeline(hours) {
        const progress = (hours / 24) * 100;
        elTimelineFill.style.width = progress + '%';
        elTimelineMarker.style.left = progress + '%';
        elDayProgressText.textContent = progress.toFixed(1) + '%';
    }

    // === Apply Phase ===
    function applyPhase(phase) {
        root.setAttribute('data-phase', phase);
        elPhaseName.textContent = PHASE_LABELS[phase] || phase.toUpperCase();

        // 更新渐变停止点颜色
        updateGradientStops(phase);
    }

    // === Update Gradient Stops · 根据阶段更新环渐变颜色 ===
    const PHASE_GRADIENTS = {
        dawn:  ['#ffd6a5', '#ff9a8b', '#a18cd1'],
        noon:  ['#f6d365', '#fda085', '#4facfe'],
        dusk:  ['#ffecd2', '#fcb69f', '#ff6a88'],
        night: ['#a8c0ff', '#3f2b96', '#e0c3fc']
    };

    function updateGradientStops(phase) {
        const colors = PHASE_GRADIENTS[phase] || PHASE_GRADIENTS.dawn;
        document.getElementById('grad-stop-1').style.stopColor = colors[0];
        document.getElementById('grad-stop-2').style.stopColor = colors[1];
        document.getElementById('grad-stop-3').style.stopColor = colors[2];
    }

    // === Format 12-hour ===
    function format12(hours, minutes, seconds) {
        let h12 = hours % 12;
        if (h12 === 0) h12 = 12;
        const meridiem = hours < 12 ? 'AM' : 'PM';
        return {
            h: pad(h12),
            m: pad(minutes),
            s: pad(seconds),
            meridiem,
            hour12Float: h12 + minutes / 60 + seconds / 3600
        };
    }

    // === Format Date ===
    function formatDate(d) {
        const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const w = weekdays[d.getDay()];
        const m = months[d.getMonth()];
        return `${w} · ${pad(d.getDate())} ${m} ${d.getFullYear()}`;
    }

    // === Format Hours (e.g. 6.2 -> "06:12") ===
    function formatHourFloat(h) {
        const hh = Math.floor(h) % 24;
        const mm = Math.round((h - Math.floor(h)) * 60);
        if (mm === 60) return pad((hh + 1) % 24) + ':00';
        return pad(hh) + ':' + pad(mm);
    }

    // === Update Daylight Info ===
    function updateDaylightInfo() {
        elSunrise.textContent = formatHourFloat(SUNRISE_HOUR);
        elSunset.textContent = formatHourFloat(SUNSET_HOUR);
        const daylight = SUNSET_HOUR - SUNRISE_HOUR;
        const dh = Math.floor(daylight);
        const dm = Math.round((daylight - dh) * 60);
        elDaylight.textContent = `${dh}h ${pad(dm)}m`;
    }

    // === Update Timezone ===
    function updateTimezone() {
        const offset = -new Date().getTimezoneOffset() / 60;
        const sign = offset >= 0 ? '+' : '-';
        elTimezone.textContent = `UTC${sign}${Math.abs(offset)}`;
    }

    // === Main Tick · 主刷新循环 ===
    function tick() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const floatHours = timeToHours(now);

        const f = format12(hours, minutes, seconds);

        // 时间显示
        elHour.textContent = f.h;
        elMin.textContent = f.m;
        elSec.textContent = f.s;
        elMeridiem.textContent = f.meridiem;
        elGreeting.textContent = getGreeting(floatHours);
        elDate.textContent = formatDate(now);

        // 进度环 + 轨道指针
        updateRingProgress(f.hour12Float);
        updateOrbitPointer(f.hour12Float);
        highlightTick(parseInt(f.h, 10));

        // 日轨
        updateTimeline(floatHours);
        updateCelestialPosition(floatHours);

        // 自动阶段切换
        if (manualPhase === null) {
            const phase = getPhaseFromTime(floatHours);
            if (root.getAttribute('data-phase') !== phase) {
                applyPhase(phase);
            }
        }
    }

    // === Phase Button Handlers ===
    function setupPhaseButtons() {
        phaseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const phase = btn.dataset.phase;
                phaseButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (phase === 'auto') {
                    manualPhase = null;
                    // 立即根据当前时间应用
                    const floatHours = timeToHours(new Date());
                    applyPhase(getPhaseFromTime(floatHours));
                } else {
                    manualPhase = phase;
                    applyPhase(phase);
                }
            });
        });
    }

    // === Timeline Interaction · 点击/拖拽日轨跳转 ===
    function setupTimelineInteraction() {
        const track = document.getElementById('timeline-track');
        let dragging = false;

        function handlePos(e) {
            const rect = track.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
            // 仅做视觉反馈演示：移动 marker 与 fill
            const pct = ratio * 100;
            elTimelineFill.style.width = pct + '%';
            elTimelineMarker.style.left = pct + '%';
            elDayProgressText.textContent = pct.toFixed(1) + '%';
        }

        // 注意：日轨交互仅做视觉演示，不修改真实系统时间
        track.addEventListener('mousedown', (e) => {
            dragging = true;
            handlePos(e);
        });
        window.addEventListener('mousemove', (e) => {
            if (dragging) handlePos(e);
        });
        window.addEventListener('mouseup', () => { dragging = false; });

        track.addEventListener('touchstart', (e) => {
            dragging = true;
            handlePos(e);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (dragging) handlePos(e);
        }, { passive: true });
        window.addEventListener('touchend', () => { dragging = false; });
    }

    // === Resize Handler · 重新计算太阳/月亮位置 ===
    function setupResize() {
        let raf = null;
        window.addEventListener('resize', () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                updateCelestialPosition(timeToHours(new Date()));
            });
        });
    }

    // === Init ===
    function init() {
        buildTicks();
        buildStarfield();
        setupPhaseButtons();
        setupTimelineInteraction();
        setupResize();
        updateDaylightInfo();
        updateTimezone();

        // 初始阶段
        const floatHours = timeToHours(new Date());
        applyPhase(getPhaseFromTime(floatHours));

        // 立即执行一次再启动循环
        tick();
        setInterval(tick, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
