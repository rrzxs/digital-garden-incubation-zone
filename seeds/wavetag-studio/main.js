/**
 * Wavetag Studio 波痕标签工坊
 * 字符凝为弹簧-阻尼物理实体，在流形波场上起伏、避让与共振
 * Vanilla JS · Canvas · 免构建
 */
(function () {
    'use strict';

    // === DOM Elements ===
    const canvas = document.getElementById('field');
    const ctx = canvas.getContext('2d');
    const heroTitle = document.getElementById('heroTitle');
    const tagInput = document.getElementById('tagInput');
    const emitBtn = document.getElementById('emitBtn');
    const modeSeg = document.getElementById('modeSeg');
    const modeChip = document.getElementById('modeChip');
    const paletteRow = document.getElementById('paletteRow');
    const radiusRange = document.getElementById('radiusRange');
    const radiusVal = document.getElementById('radiusVal');
    const ampRange = document.getElementById('ampRange');
    const ampVal = document.getElementById('ampVal');
    const tChars = document.getElementById('tChars');
    const tEnergy = document.getElementById('tEnergy');
    const tForce = document.getElementById('tForce');
    const tRipples = document.getElementById('tRipples');

    // === Palettes（与 CSS data-palette 对应） ===
    const PALETTES = {
        abyss: { glyph: '#bfe9ff', hot: '#ffffff', wave: 'rgba(56,232,200,', accent: '#38e8c8' },
        ember: { glyph: '#ffd9ad', hot: '#fff8ec', wave: 'rgba(255,180,46,', accent: '#ffb42e' },
        phosphor: { glyph: '#b8ffd9', hot: '#eafff4', wave: 'rgba(92,242,166,', accent: '#5cf2a6' },
        nocturne: { glyph: '#e9c8ff', hot: '#fdf0ff', wave: 'rgba(255,74,208,', accent: '#ff4ad0' }
    };

    // === State ===
    const state = {
        w: 0,
        h: 0,
        dpr: 1,
        time: 0,
        mode: 'repel',
        palette: 'abyss',
        fieldRadius: 170,
        amplitude: 26,
        cursor: { x: -9999, y: -9999, vx: 0, vy: 0, active: false, energy: 0 },
        glyphs: [],
        ripples: [],
        dust: []
    };

    // === Wave Field：多重正弦叠加的流形波场 ===
    function waveY(x, t) {
        const cx = state.w / 2;
        const nx = (x - cx) / Math.max(state.w, 1);
        return (
            Math.sin(nx * 4.2 + t * 0.9) * state.amplitude +
            Math.sin(nx * 9.1 - t * 1.4 + 1.7) * state.amplitude * 0.45 +
            Math.sin(nx * 1.6 + t * 0.45 + 4.1) * state.amplitude * 0.85
        );
    }

    // === Glyph：弹簧-阻尼物理字符 ===
    function spawnGlyphs(text) {
        const chars = [...text.replace(/\s+/g, ' ').trim()].slice(0, 28);
        const prev = state.glyphs;
        state.glyphs = chars.map((ch, i) => {
            const reuse = prev[i];
            const g = {
                ch,
                // 目标锚点由布局函数决定
                hx: 0,
                hy: 0,
                x: reuse ? reuse.x : (Math.random() - 0.5) * 120,
                y: reuse ? reuse.y : (Math.random() - 0.5) * 120,
                vx: reuse ? reuse.vx : 0,
                vy: reuse ? reuse.vy : 0,
                rot: reuse ? reuse.rot : 0,
                vrot: 0,
                size: 0,
                phase: Math.random() * Math.PI * 2,
                born: state.time - (reuse ? 10 : 0),
                hot: 0
            };
            if (!reuse) {
                // 从中心弹射入场
                g.x = state.w / 2 + (Math.random() - 0.5) * 60;
                g.y = state.h / 2 + (Math.random() - 0.5) * 40;
                g.vx = (Math.random() - 0.5) * 14;
                g.vy = (Math.random() - 0.5) * 14;
            }
            return g;
        });
        tChars.textContent = state.glyphs.length;
    }

    function layoutGlyphs() {
        const gs = state.glyphs;
        if (!gs.length) return;
        const base = Math.min(46, Math.max(24, (state.w - 120) / Math.max(gs.length, 1) * 0.92));
        const total = base * gs.length;
        const startX = (state.w - total) / 2 + base / 2;
        gs.forEach((g, i) => {
            g.size = base;
            g.hx = startX + i * base;
        });
    }

    // === Ripple：点击冲击波 ===
    function addRipple(x, y) {
        state.ripples.push({ x, y, r: 6, life: 1 });
        // 冲击波对字符施加径向脉冲
        state.glyphs.forEach((g) => {
            const dx = g.x - x;
            const dy = g.y - y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 340) {
                const power = (1 - d / 340) * 26;
                g.vx += (dx / d) * power;
                g.vy += (dy / d) * power;
                g.vrot += (Math.random() - 0.5) * 0.24;
                g.hot = Math.min(1, g.hot + (1 - d / 340));
            }
        });
        tRipples.textContent = state.ripples.length;
    }

    // === Dust：环境粒子流场 ===
    function initDust() {
        state.dust = Array.from({ length: 46 }, () => ({
            x: Math.random() * state.w,
            y: Math.random() * state.h,
            vx: 0,
            vy: 0,
            r: 0.6 + Math.random() * 1.6,
            a: 0.08 + Math.random() * 0.2
        }));
    }

    // === Physics Step ===
    function step(dt) {
        state.time += dt;
        const c = state.cursor;

        // 光标速度 → 能量（用于遥测与字符灼热）
        const cursorSpeed = Math.hypot(c.vx, c.vy);
        c.energy += (Math.min(cursorSpeed / 40, 1) - c.energy) * 0.08;

        // --- 字符物理 ---
        let energySum = 0;
        state.glyphs.forEach((g) => {
            // 锚点在 layoutGlyphs 中设定，波面偏移在此实时计算
            const homeY = state.h / 2 + waveY(g.hx, state.time);
            const hy = homeY;

            // 弹簧-阻尼回归锚点
            const k = 42;
            const damp = 7.5;
            g.vx += (g.hx - g.x) * k * dt;
            g.vy += (hy - g.y) * k * dt;
            g.vx -= g.vx * damp * dt;
            g.vy -= g.vy * damp * dt;

            // 光标力场
            if (c.active) {
                const dx = g.x - c.x;
                const dy = g.y - c.y;
                const d = Math.hypot(dx, dy);
                if (d < state.fieldRadius && d > 0.01) {
                    const falloff = 1 - d / state.fieldRadius;
                    const f = falloff * falloff * 2400;
                    if (state.mode === 'repel') {
                        g.vx += (dx / d) * f * dt;
                        g.vy += (dy / d) * f * dt;
                    } else if (state.mode === 'attract') {
                        g.vx -= (dx / d) * f * dt * 0.7;
                        g.vy -= (dy / d) * f * dt * 0.7;
                    } else {
                        // vortex：切向漩涡 + 轻微吸入
                        const tx = -dy / d;
                        const ty = dx / d;
                        g.vx += (tx * f - (dx / d) * f * 0.22) * dt;
                        g.vy += (ty * f - (dy / d) * f * 0.22) * dt;
                    }
                    g.hot = Math.min(1, g.hot + falloff * 0.12);
                    g.vrot += Math.sin(state.time * 3 + g.phase) * falloff * 0.02;
                }
            }

            g.x += g.vx * dt;
            g.y += g.vy * dt;
            g.vrot += (0 - g.rot) * 26 * dt - g.vrot * 6 * dt;
            g.rot += g.vrot * dt * 6;
            g.hot *= Math.pow(0.4, dt);
            energySum += Math.hypot(g.vx, g.vy);

            // 边界柔墙
            if (g.x < 20) g.vx += (20 - g.x) * 8 * dt * 10;
            if (g.x > state.w - 20) g.vx -= (g.x - (state.w - 20)) * 8 * dt * 10;
            if (g.y < 20) g.vy += (20 - g.y) * 8 * dt * 10;
            if (g.y > state.h - 20) g.vy -= (g.y - (state.h - 20)) * 8 * dt * 10;
        });

        // --- 涟漪 ---
        state.ripples = state.ripples.filter((r) => {
            r.r += 320 * dt;
            r.life -= dt * 1.1;
            return r.life > 0;
        });

        // --- 尘埃粒子：环绕波场漂移 ---
        state.dust.forEach((p) => {
            p.vx += Math.cos(state.time * 0.6 + p.y * 0.01) * 6 * dt;
            p.vy += Math.sin(state.time * 0.5 + p.x * 0.012) * 4 * dt;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -10) p.x = state.w + 10;
            if (p.x > state.w + 10) p.x = -10;
            if (p.y < -10) p.y = state.h + 10;
            if (p.y > state.h + 10) p.y = -10;
        });

        // --- 遥测（节流更新 DOM） ---
        teleAccum += dt;
        if (teleAccum > 0.2) {
            teleAccum = 0;
            tEnergy.textContent = (energySum / Math.max(state.glyphs.length, 1) / 60).toFixed(2);
            tForce.textContent = (c.active ? c.energy : 0).toFixed(2);
            tRipples.textContent = state.ripples.length;
        }
    }

    let teleAccum = 0;

    // === Render ===
    function render() {
        const pal = PALETTES[state.palette];
        ctx.clearRect(0, 0, state.w, state.h);

        // 波场引导线（三条相位错开的包络）
        for (let line = 0; line < 3; line++) {
            ctx.beginPath();
            const yOff = (line - 1) * 34;
            for (let x = 0; x <= state.w; x += 8) {
                const y = state.h / 2 + waveY(x, state.time + line * 0.7) + yOff;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = pal.wave + (0.1 + c_energyGlow() * 0.12) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 尘埃
        state.dust.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = pal.wave + p.a + ')';
            ctx.fill();
        });

        // 涟漪
        state.ripples.forEach((r) => {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = pal.wave + (r.life * 0.5) + ')';
            ctx.lineWidth = 2 * r.life + 0.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * 0.62, 0, Math.PI * 2);
            ctx.strokeStyle = pal.wave + (r.life * 0.24) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // 光标力场圈
        if (state.cursor.active) {
            const c = state.cursor;
            const breath = 1 + Math.sin(state.time * 3) * 0.04;
            ctx.beginPath();
            ctx.arc(c.x, c.y, state.fieldRadius * breath, 0, Math.PI * 2);
            ctx.strokeStyle = pal.wave + '0.14)';
            ctx.setLineDash([4, 10]);
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 字符
        state.glyphs.forEach((g) => {
            const age = Math.min(1, (state.time - g.born) / 0.6);
            const pop = easeOutExpo(age);
            const size = g.size * pop;
            const bob = Math.sin(state.time * 2 + g.phase) * 2;

            ctx.save();
            ctx.translate(g.x, g.y + bob);
            ctx.rotate(g.rot * 0.4);
            const hot = g.hot;
            ctx.font = `600 ${size}px 'Outfit', 'Inter', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 玻璃底衬
            ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + hot * 0.1) * pop + ')';
            roundRect(ctx, -size * 0.62, -size * 0.62, size * 1.24, size * 1.24, size * 0.28);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.1 + hot * 0.3) * pop + ')';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 字形
            ctx.shadowColor = pal.accent;
            ctx.shadowBlur = 6 + hot * 26;
            ctx.fillStyle = hot > 0.05 ? mixColor(pal.glyph, pal.hot, hot) : pal.glyph;
            ctx.globalAlpha = pop;
            ctx.fillText(g.ch, 0, 0);
            ctx.restore();
        });
    }

    function c_energyGlow() {
        return state.cursor.active ? state.cursor.energy : 0;
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function easeOutExpo(t) {
        return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function mixColor(a, b, t) {
        const pa = hexToRgb(a);
        const pb = hexToRgb(b);
        const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
        const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
        const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
        return `rgb(${r},${g},${bl})`;
    }

    function hexToRgb(h) {
        const n = parseInt(h.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    // === Loop ===
    let lastT = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastT) / 1000, 0.033);
        lastT = now;
        step(dt);
        render();
        requestAnimationFrame(loop);
    }

    // === Resize ===
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        state.w = rect.width;
        state.h = rect.height;
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        layoutGlyphs();
        if (!state.dust.length) initDust();
    }

    // === Scramble Reveal（标题乱码揭示） ===
    function scrambleReveal(el, text) {
        const glyphs = '!<>-_\\/[]{}—=+*^?#________';
        const target = [...text];
        el.innerHTML = '';
        const spans = target.map(() => {
            const s = document.createElement('span');
            s.className = 'scramble-hit';
            el.appendChild(s);
            return s;
        });
        let frame = 0;
        const settle = target.map((_, i) => 8 + i * 2.4 + Math.random() * 8);
        (function tick() {
            let done = true;
            target.forEach((ch, i) => {
                if (frame >= settle[i]) {
                    spans[i].textContent = ch;
                } else {
                    done = false;
                    spans[i].textContent = ch === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
                }
            });
            frame++;
            if (!done) requestAnimationFrame(tick);
        })();
    }

    // === Events ===
    canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        const nx = e.clientX - r.left;
        const ny = e.clientY - r.top;
        state.cursor.vx = nx - state.cursor.x;
        state.cursor.vy = ny - state.cursor.y;
        state.cursor.x = nx;
        state.cursor.y = ny;
        state.cursor.active = true;
    });

    canvas.addEventListener('pointerleave', () => {
        state.cursor.active = false;
        state.cursor.x = -9999;
        state.cursor.y = -9999;
    });

    canvas.addEventListener('pointerdown', (e) => {
        const r = canvas.getBoundingClientRect();
        addRipple(e.clientX - r.left, e.clientY - r.top);
    });

    function emit() {
        const v = tagInput.value.trim() || 'RIDE THE LIQUID SIGNAL';
        spawnGlyphs(v);
    }

    emitBtn.addEventListener('click', emit);
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') emit();
    });

    document.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            tagInput.value = chip.dataset.seed;
            emit();
        });
    });

    modeSeg.querySelectorAll('.seg').forEach((seg) => {
        seg.addEventListener('click', () => {
            modeSeg.querySelectorAll('.seg').forEach((s) => s.classList.remove('active'));
            seg.classList.add('active');
            state.mode = seg.dataset.mode;
            modeChip.textContent = 'MODE // ' + state.mode.toUpperCase();
        });
    });

    paletteRow.querySelectorAll('.swatch').forEach((sw) => {
        sw.addEventListener('click', () => {
            paletteRow.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
            sw.classList.add('active');
            state.palette = sw.dataset.palette;
            document.body.dataset.palette = state.palette;
        });
    });

    function bindRange(range, out, apply) {
        const update = () => {
            const v = Number(range.value);
            apply(v);
            out.textContent = v;
            const pct = ((v - range.min) / (range.max - range.min)) * 100;
            range.style.setProperty('--fill', pct + '%');
        };
        range.addEventListener('input', update);
        update();
    }

    bindRange(radiusRange, radiusVal, (v) => { state.fieldRadius = v; });
    bindRange(ampRange, ampVal, (v) => { state.amplitude = v; });

    // === Boot ===
    window.addEventListener('resize', resize);
    resize();
    spawnGlyphs(tagInput.value || 'RIDE THE LIQUID SIGNAL');
    scrambleReveal(heroTitle, heroTitle.textContent);
    requestAnimationFrame(loop);
})();
