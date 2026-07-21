/* =========================================================================
   AR Art Placer · 空间策展
   核心交互: 拖拽展品放入透视画廊 · 实时投影 · 悬浮弹簧物理 · 光源联动
   作者: EDEN
   ========================================================================= */

(function () {
    'use strict';

    // === 配置与状态 ============================================

    const PALETTES = {
        aurora: { accent: '#7af0c8', items: ['#7af0c8', '#7adcf0', '#b488f0', '#a0f07a'] },
        ember:  { accent: '#f0a07a', items: ['#f0a07a', '#f0d07a', '#f07a7a', '#f0b07a'] },
        abyss:  { accent: '#7aa8f0', items: ['#7aa8f0', '#7af0e8', '#a07af0', '#88b8f0'] },
        orchid: { accent: '#b488f0', items: ['#b488f0', '#887af0', '#f07ac8', '#d088f0'] }
    };

    // 展藏库 (SVG path 数据) — 八件展品, 形态各异
    const COLLECTION = [
        {
            id: 'obelisk', name: 'OBELISK', cat: 'SCULPTURE',
            viewBox: '0 0 80 80', size: [70, 90], year: '2026', mat: 'POLISHED STEEL',
            path: '<polygon points="40,8 56,30 48,72 32,72 24,30" fill="currentColor" opacity="0.9"/>' +
                  '<polygon points="40,8 56,30 48,72 40,72" fill="rgba(0,0,0,0.25)"/>' +
                  '<line x1="40" y1="8" x2="40" y2="72" stroke="rgba(255,255,255,0.5)" stroke-width="0.6"/>'
        },
        {
            id: 'orb', name: 'ORB', cat: 'INSTALLATION',
            viewBox: '0 0 80 80', size: [76, 76], year: '2025', mat: 'CAST GLASS',
            path: '<circle cx="40" cy="40" r="30" fill="currentColor" opacity="0.85"/>' +
                  '<circle cx="40" cy="40" r="30" fill="url(#orb-shade)" opacity="0.5"/>' +
                  '<ellipse cx="32" cy="30" rx="10" ry="6" fill="rgba(255,255,255,0.35)"/>'
        },
        {
            id: 'spire', name: 'SPIRE', cat: 'SCULPTURE',
            viewBox: '0 0 80 80', size: [44, 100], year: '2024', mat: 'BRONZE',
            path: '<path d="M40 6 L52 40 L48 76 L32 76 L28 40 Z" fill="currentColor"/>' +
                  '<path d="M40 6 L52 40 L40 76 Z" fill="rgba(0,0,0,0.25)"/>' +
                  '<circle cx="40" cy="6" r="3" fill="rgba(255,255,255,0.7)"/>'
        },
        {
            id: 'lattice', name: 'LATTICE', cat: 'STRUCTURE',
            viewBox: '0 0 80 80', size: [82, 82], year: '2026', mat: 'CARBON FIBER',
            path: '<g stroke="currentColor" stroke-width="2.2" fill="none">' +
                  '<rect x="18" y="18" width="44" height="44"/>' +
                  '<line x1="18" y1="18" x2="62" y2="62"/>' +
                  '<line x1="62" y1="18" x2="18" y2="62"/>' +
                  '<circle cx="40" cy="40" r="6" fill="currentColor"/>' +
                  '</g>'
        },
        {
            id: 'bloom', name: 'BLOOM', cat: 'KINETIC',
            viewBox: '0 0 80 80', size: [80, 80], year: '2025', mat: 'CERAMIC',
            path: '<g fill="currentColor">' +
                  '<ellipse cx="40" cy="22" rx="9" ry="18" opacity="0.85"/>' +
                  '<ellipse cx="58" cy="40" rx="18" ry="9" opacity="0.85"/>' +
                  '<ellipse cx="40" cy="58" rx="9" ry="18" opacity="0.85"/>' +
                  '<ellipse cx="22" cy="40" rx="18" ry="9" opacity="0.85"/>' +
                  '<circle cx="40" cy="40" r="8" fill="rgba(255,255,255,0.4)"/>' +
                  '</g>'
        },
        {
            id: 'prism', name: 'PRISM', cat: 'SCULPTURE',
            viewBox: '0 0 80 80', size: [78, 78], year: '2024', mat: 'CRYSTAL',
            path: '<polygon points="40,10 70,62 10,62" fill="currentColor" opacity="0.8"/>' +
                  '<polygon points="40,10 70,62 40,62" fill="rgba(0,0,0,0.22)"/>' +
                  '<polygon points="40,10 40,62 10,62" fill="rgba(255,255,255,0.15)"/>'
        },
        {
            id: 'lamp', name: 'LAMP', cat: 'LIGHTING',
            viewBox: '0 0 80 80', size: [56, 96], year: '2026', mat: 'BRASS + LED',
            path: '<path d="M22 14 L58 14 L52 36 L28 36 Z" fill="currentColor"/>' +
                  '<line x1="40" y1="36" x2="40" y2="70" stroke="currentColor" stroke-width="2.5"/>' +
                  '<ellipse cx="40" cy="74" rx="16" ry="4" fill="currentColor" opacity="0.7"/>' +
                  '<ellipse cx="40" cy="26" rx="10" ry="6" fill="rgba(255,255,255,0.55)"/>'
        },
        {
            id: 'totem', name: 'TOTEM', cat: 'SCULPTURE',
            viewBox: '0 0 80 80', size: [50, 100], year: '2023', mat: 'OAK + STONE',
            path: '<rect x="28" y="14" width="24" height="14" fill="currentColor"/>' +
                  '<circle cx="40" cy="42" r="14" fill="currentColor" opacity="0.85"/>' +
                  '<rect x="28" y="58" width="24" height="14" fill="currentColor"/>' +
                  '<line x1="28" y1="31" x2="52" y2="31" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>' +
                  '<line x1="28" y1="55" x2="52" y2="55" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>'
        }
    ];

    const state = {
        palette: 'aurora',
        snap: true,
        lightAngle: 62,    // 0 - 100
        floatAmp: 55,       // 0 - 100
        placed: [],         // [{ id, artId, x, y, color, w, h, el }]
        selectedId: null,
        draggingId: null,
        dragSource: null,   // 'shelf' | 'gallery'
        pointer: { x: 0, y: 0 },
        nextUid: 1
    };

    // === DOM 引用 ==============================================

    const $ = (sel) => document.querySelector(sel);
    const dom = {
        gallery: $('#gallery'),
        placementLayer: $('#placement-layer'),
        shelfGrid: $('#shelf-grid'),
        shelfCount: $('#shelf-count'),
        lightSource: $('#light-source'),
        cursorCross: $('#cursor-cross'),
        crossLabel: $('#cross-label'),
        dropIndicator: $('#drop-indicator'),
        detailPanel: $('#detail-panel'),
        detailSwatch: $('#detail-swatch'),
        detailCat: $('#detail-cat'),
        detailTitle: $('#detail-title'),
        detailDesc: $('#detail-desc'),
        detailYear: $('#detail-year'),
        detailSize: $('#detail-size'),
        detailMat: $('#detail-mat'),
        statCount: $('#stat-count'),
        statLoad: $('#stat-load'),
        placeCounter: $('#place-counter'),
        hudText: $('#hud-text'),
        hudDot: $('#hud-dot'),
        btnClear: $('#btn-clear'),
        btnShuffle: $('#btn-shuffle'),
        lightAngle: $('#light-angle'),
        floatAmp: $('#float-amp'),
        cursorGlow: $('#cursor-glow'),
        rippleLayer: $('#ripple-layer'),
        particleCanvas: $('#particle-canvas')
    };

    // === 工具函数 ==============================================

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (min, max) => Math.random() * (max - min) + min;

    function getArtSvg(art, color) {
        const gid = 'g-' + Math.random().toString(36).slice(2, 8);
        let inner = art.path;
        if (art.id === 'orb') {
            inner = '<defs><radialGradient id="' + gid + '" cx="35%" cy="30%">' +
                    '<stop offset="0%" stop-color="rgba(255,255,255,0.4)"/>' +
                    '<stop offset="100%" stop-color="rgba(0,0,0,0.5)"/>' +
                    '</radialGradient></defs>' +
                    art.path.replace('url(#orb-shade)', 'url(#' + gid + ')');
        }
        return '<svg class="art-svg" viewBox="' + art.viewBox + '" xmlns="http://www.w3.org/2000/svg" style="color:' + color + '">' + inner + '</svg>';
    }

    function getPlacedSvg(art, color) {
        const gid = 'pg-' + Math.random().toString(36).slice(2, 8);
        let inner = art.path;
        if (art.id === 'orb') {
            inner = '<defs><radialGradient id="' + gid + '" cx="35%" cy="30%">' +
                    '<stop offset="0%" stop-color="rgba(255,255,255,0.4)"/>' +
                    '<stop offset="100%" stop-color="rgba(0,0,0,0.5)"/>' +
                    '</radialGradient></defs>' +
                    art.path.replace('url(#orb-shade)', 'url(#' + gid + ')');
        }
        return '<svg class="placed-svg" viewBox="' + art.viewBox + '" xmlns="http://www.w3.org/2000/svg" style="color:' + color + '">' + inner + '</svg>';
    }

    function pickColor() {
        const pal = PALETTES[state.palette];
        return pal.items[Math.floor(Math.random() * pal.items.length)];
    }

    function findArt(artId) {
        return COLLECTION.find((a) => a.id === artId);
    }

    // === 展藏架渲染 ============================================

    function renderShelf() {
        const html = COLLECTION.map((art) => {
            const color = PALETTES[state.palette].items[COLLECTION.indexOf(art) % 4];
            return (
                '<div class="art-card" data-art-id="' + art.id + '" data-color="' + color + '" draggable="false">' +
                getArtSvg(art, color) +
                '<span class="art-name">' + art.name + '</span>' +
                '</div>'
            );
        }).join('');
        dom.shelfGrid.innerHTML = html;

        dom.shelfGrid.querySelectorAll('.art-card').forEach((card) => {
            card.addEventListener('pointerdown', (e) => onShelfPointerDown(e, card));
        });
    }

    // === 展品放置 ==============================================

    function placeArt(artId, color, xPct, yPct) {
        const art = findArt(artId);
        if (!art) return null;

        const [w, h] = art.size;
        const item = {
            id: 'p' + (state.nextUid++),
            artId: artId,
            x: clamp(xPct, 5, 95),
            y: clamp(yPct, 20, 88),
            color: color || pickColor(),
            w: w,
            h: h
        };

        const el = document.createElement('div');
        el.className = 'placed-item';
        el.dataset.itemId = item.id;
        el.style.setProperty('--art-w', w + 'px');
        el.style.setProperty('--art-h', h + 'px');
        el.style.left = item.x + '%';
        el.style.top = item.y + '%';
        el.style.setProperty('--float-dur', rand(5, 8).toFixed(2) + 's');
        el.style.setProperty('--float-amp', (state.floatAmp / 100 * 14).toFixed(2) + 'px');
        el.style.setProperty('--shadow-offset', computeShadowOffset() + 'px');

        el.innerHTML =
            '<div class="placed-body">' +
            '<div class="placed-glow"></div>' +
            getPlacedSvg(art, item.color) +
            '<div class="placed-shadow"></div>' +
            '</div>';

        // 入场弹性动画
        el.style.transform = 'scale(0.2) translateY(40px)';
        el.style.opacity = '0';
        requestAnimationFrame(() => {
            el.style.transition = 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease';
            el.style.transform = 'scale(1) translateY(0)';
            el.style.opacity = '1';
            setTimeout(() => {
                el.style.transition = '';
            }, 750);
        });

        el.addEventListener('pointerdown', (e) => onPlacedPointerDown(e, item));
        dom.placementLayer.appendChild(el);

        item.el = el;
        state.placed.push(item);
        updateStats();
        return item;
    }

    function removeItem(itemId) {
        const idx = state.placed.findIndex((p) => p.id === itemId);
        if (idx < 0) return;
        const item = state.placed[idx];
        item.el.style.transition = 'all 0.5s cubic-bezier(0.45,0,0.15,1)';
        item.el.style.transform = 'scale(0.2) translateY(30px)';
        item.el.style.opacity = '0';
        setTimeout(() => {
            if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
        }, 500);
        state.placed.splice(idx, 1);
        if (state.selectedId === itemId) {
            state.selectedId = null;
            clearDetail();
        }
        updateStats();
    }

    function clearAll() {
        [...state.placed].forEach((item) => removeItem(item.id));
        setHud('展厅已清空');
    }

    function shuffleLayout() {
        if (state.placed.length === 0) {
            // 随机放置 5 件
            const shuffled = [...COLLECTION].sort(() => Math.random() - 0.5).slice(0, 5);
            shuffled.forEach((art, i) => {
                setTimeout(() => {
                    placeArt(art.id, pickColor(), rand(15, 85), rand(30, 80));
                    spawnRipple(rand(15, 85), rand(30, 80));
                }, i * 140);
            });
            setHud('随机布局 · ' + shuffled.length + ' 件');
        } else {
            state.placed.forEach((item, i) => {
                const nx = rand(15, 85);
                const ny = rand(30, 80);
                item.x = nx;
                item.y = ny;
                item.el.style.left = nx + '%';
                item.el.style.top = ny + '%';
            });
            setHud('重新排布 · ' + state.placed.length + ' 件');
        }
    }

    // === 拖拽逻辑 ==============================================

    let dragData = null;

    function onShelfPointerDown(e, card) {
        e.preventDefault();
        const artId = card.dataset.artId;
        const color = card.dataset.color;
        card.classList.add('dragging');

        dragData = {
            source: 'shelf',
            artId: artId,
            color: color,
            card: card,
            ghost: createGhost(card),
            startX: e.clientX,
            startY: e.clientY
        };

        dom.gallery.dataset.mode = 'drag';
        setHud('拖至画廊空间释放');
        beginDragPointerTracking(e);
    }

    function onPlacedPointerDown(e, item) {
        e.preventDefault();
        e.stopPropagation();
        selectItem(item.id);

        dragData = {
            source: 'gallery',
            item: item,
            ghost: createGhost(item.el.querySelector('.placed-svg')),
            startX: e.clientX,
            startY: e.clientY,
            originX: item.x,
            originY: item.y
        };
        item.el.classList.add('dragging');
        dom.gallery.dataset.mode = 'drag';
        setHud('拖动以重新放置');
        beginDragPointerTracking(e);
    }

    function createGhost(srcEl) {
        const ghost = srcEl.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.left = '-200px';
        ghost.style.top = '-200px';
        ghost.style.width = '70px';
        ghost.style.height = '70px';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '999';
        ghost.style.opacity = '0.85';
        ghost.style.transform = 'scale(1.1) rotate(-3deg)';
        ghost.style.filter = 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))';
        ghost.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
        document.body.appendChild(ghost);
        return ghost;
    }

    function beginDragPointerTracking(e) {
        window.addEventListener('pointermove', onDragPointerMove);
        window.addEventListener('pointerup', onDragPointerUp);
        window.addEventListener('pointercancel', onDragPointerUp);
        updateGhost(e.clientX, e.clientY);
    }

    function onDragPointerMove(e) {
        if (!dragData) return;
        state.pointer.x = e.clientX;
        state.pointer.y = e.clientY;
        updateGhost(e.clientX, e.clientY);

        const rect = dom.gallery.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (inside) {
            const px = ((e.clientX - rect.left) / rect.width) * 100;
            const py = ((e.clientY - rect.top) / rect.height) * 100;
            const sx = snapX(px);
            const sy = snapY(py);
            dom.dropIndicator.style.left = sx + '%';
            dom.dropIndicator.style.top = sy + '%';
            dom.dropIndicator.classList.add('over-target');

            dom.cursorCross.style.transform = 'translate(' + (e.clientX - rect.left) + 'px,' + (e.clientY - rect.top) + 'px)';
            dom.crossLabel.textContent = sx.toFixed(1) + ' · ' + sy.toFixed(1);
        } else {
            dom.dropIndicator.classList.remove('over-target');
        }
    }

    function updateGhost(x, y) {
        if (!dragData || !dragData.ghost) return;
        dragData.ghost.style.left = (x - 35) + 'px';
        dragData.ghost.style.top = (y - 35) + 'px';
    }

    function onDragPointerUp(e) {
        window.removeEventListener('pointermove', onDragPointerMove);
        window.removeEventListener('pointerup', onDragPointerUp);
        window.removeEventListener('pointercancel', onDragPointerUp);

        if (!dragData) return;

        const rect = dom.gallery.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (dragData.source === 'shelf') {
            dragData.card.classList.remove('dragging');
            if (inside) {
                const px = ((e.clientX - rect.left) / rect.width) * 100;
                const py = ((e.clientY - rect.top) / rect.height) * 100;
                const item = placeArt(dragData.artId, dragData.color, snapX(px), snapY(py));
                spawnRipple(snapX(px), snapY(py));
                selectItem(item.id);
                setHud('放置 · ' + findArt(dragData.artId).name);
            } else {
                setHud('已取消放置');
            }
        } else if (dragData.source === 'gallery') {
            const item = dragData.item;
            item.el.classList.remove('dragging');
            if (inside) {
                const px = ((e.clientX - rect.left) / rect.width) * 100;
                const py = ((e.clientY - rect.top) / rect.height) * 100;
                item.x = snapX(px);
                item.y = snapY(py);
                item.el.style.left = item.x + '%';
                item.el.style.top = item.y + '%';
                spawnRipple(item.x, item.y);
                setHud('已重新放置');
            } else {
                // 拖出展厅 → 移除
                removeItem(item.id);
                setHud('已移出展厅');
            }
        }

        if (dragData.ghost && dragData.ghost.parentNode) {
            dragData.ghost.parentNode.removeChild(dragData.ghost);
        }
        dragData = null;
        dom.gallery.dataset.mode = 'place';
        dom.dropIndicator.classList.remove('over-target');
    }

    function snapX(pct) {
        if (!state.snap) return pct;
        const step = 5;
        return Math.round(pct / step) * step;
    }
    function snapY(pct) {
        if (!state.snap) return pct;
        const step = 5;
        return Math.round(pct / step) * step;
    }

    // === 选中与详情 ============================================

    function selectItem(itemId) {
        state.selectedId = itemId;
        state.placed.forEach((p) => {
            if (p.id === itemId) {
                p.el.classList.add('selected');
                showDetail(p);
            } else {
                p.el.classList.remove('selected');
            }
        });
    }

    function clearSelection() {
        state.selectedId = null;
        state.placed.forEach((p) => p.el.classList.remove('selected'));
        clearDetail();
    }

    function showDetail(item) {
        const art = findArt(item.artId);
        dom.detailSwatch.style.background = item.color;
        dom.detailSwatch.style.boxShadow = '0 0 30px ' + item.color + '88';
        dom.detailCat.textContent = '— ' + art.cat + ' —';
        dom.detailTitle.textContent = art.name;
        dom.detailDesc.textContent = describeArt(art);
        dom.detailYear.textContent = art.year;
        dom.detailSize.textContent = art.size[0] + '×' + art.size[1] + ' cm';
        dom.detailMat.textContent = art.mat;
    }

    function clearDetail() {
        dom.detailSwatch.style.background = 'var(--accent)';
        dom.detailSwatch.style.boxShadow = '0 0 30px var(--accent-glow)';
        dom.detailCat.textContent = '— SELECT —';
        dom.detailTitle.textContent = '未选择展品';
        dom.detailDesc.textContent = '点击展厅中的展品查看详情，或从展藏架拖出新作品放入空间。';
        dom.detailYear.textContent = '—';
        dom.detailSize.textContent = '—';
        dom.detailMat.textContent = '—';
    }

    function describeArt(art) {
        const descs = {
            obelisk: '一束锐利向上的几何针碑，抛光钢面映出整个画廊的微缩倒影。',
            orb: '悬浮的铸造玻璃球体，内部光线随视角缓慢游移，像一颗凝固的星辰。',
            spire: '青铜尖塔以中轴对称的轮廓刺破空气，顶部镶有一颗发光的端石。',
            lattice: '碳纤维构筑的开放晶格结构，正反双锥在视觉重心处咬合。',
            bloom: '四瓣陶瓷动能花，凭借隐形磁轴缓慢自旋，永不凋谢。',
            prism: '天然晶体棱镜，将入射光分解为可见光谱投射到地面。',
            lamp: '黄铜立灯搭配柔和 LED，是展厅自身的次级光源。',
            totem: '橡木与石材堆叠的图腾柱，三段式叙事构型，致敬古典纪念碑。'
        };
        return descs[art.id] || art.name + ' · ' + art.mat;
    }

    // === 光源与投影联动 ========================================

    function updateLight() {
        const angle = state.lightAngle; // 0-100
        // 光源水平位置: 5% - 95%
        const leftPct = 5 + (angle / 100) * 90;
        dom.lightSource.style.left = leftPct + '%';

        // 投影偏移方向: 光源在右则影子向左
        state.placed.forEach((item) => {
            const offset = computeShadowOffset(item.x);
            item.el.style.setProperty('--shadow-offset', offset + 'px');
        });
    }

    function computeShadowOffset(itemX) {
        // 光源角度 50 = 居中 (offset 0), 0 = 极左 (影子右偏), 100 = 极右 (影子左偏)
        const lightLeft = 5 + (state.lightAngle / 100) * 90;
        const refX = (itemX !== undefined) ? itemX : 50;
        const diff = refX - lightLeft; // 正: 物体在光源右侧 → 影子向左(负)
        return clamp(-diff * 0.4, -28, 28);
    }

    function updateFloat() {
        state.placed.forEach((item) => {
            item.el.style.setProperty('--float-amp', (state.floatAmp / 100 * 14).toFixed(2) + 'px');
            item.el.style.setProperty('--float-dur', (8 - state.floatAmp / 100 * 4).toFixed(2) + 's');
        });
    }

    // === 统计 / HUD ===========================================

    function updateStats() {
        const n = state.placed.length;
        dom.statCount.textContent = n;
        dom.placeCounter.textContent = n;
        dom.shelfCount.textContent = n + ' · placed';
        // 负载: 简单地按展品数与理想上限 (10) 比例
        const load = clamp(Math.round((n / 10) * 100), 0, 100);
        dom.statLoad.textContent = load + '%';
    }

    function setHud(text) {
        dom.hudText.textContent = text;
        dom.hudDot.style.animation = 'none';
        void dom.hudDot.offsetWidth;
        dom.hudDot.style.animation = '';
    }

    // === 涟漪 ==================================================

    function spawnRipple(xPct, yPct) {
        const rect = dom.gallery.getBoundingClientRect();
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = (rect.left + (xPct / 100) * rect.width) + 'px';
        ripple.style.top = (rect.top + (yPct / 100) * rect.height) + 'px';
        ripple.style.borderColor = PALETTES[state.palette].accent;
        dom.rippleLayer.appendChild(ripple);
        setTimeout(() => {
            if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        }, 1100);
    }

    // === 配色切换 ==============================================

    function applyPalette(name) {
        if (!PALETTES[name]) return;
        state.palette = name;
        document.documentElement.setAttribute('data-palette', name);
        document.body.setAttribute('data-palette', name);
        // 重渲染展藏架 (颜色会更新)
        renderShelf();
        // 更新光源颜色已经由 CSS 变量自动处理
        updateLight();
    }

    // === 粒子流场 (Canvas) =====================================

    const particles = [];
    const ctx = dom.particleCanvas.getContext('2d');
    let canvasW = 0, canvasH = 0;

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasW = window.innerWidth;
        canvasH = window.innerHeight;
        dom.particleCanvas.width = canvasW * dpr;
        dom.particleCanvas.height = canvasH * dpr;
        dom.particleCanvas.style.width = canvasW + 'px';
        dom.particleCanvas.style.height = canvasH + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
        particles.length = 0;
        const count = Math.floor(clamp((canvasW * canvasH) / 28000, 30, 80));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvasW,
                y: Math.random() * canvasH,
                vx: rand(-0.15, 0.15),
                vy: rand(-0.2, -0.05),
                r: rand(0.6, 2.2),
                life: rand(0, 1),
                speed: rand(0.4, 1.2)
            });
        }
    }

    let noiseT = 0;
    function animateParticles() {
        ctx.clearRect(0, 0, canvasW, canvasH);
        noiseT += 0.003;
        const accent = PALETTES[state.palette].accent;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            // 噪声扰动 (简易 perlin-like)
            const nx = Math.sin(p.y * 0.005 + noiseT) * 0.4;
            const ny = Math.cos(p.x * 0.005 + noiseT * 1.3) * 0.2;
            p.vx = lerp(p.vx, nx * p.speed, 0.04);
            p.vy = lerp(p.vy, (ny - 0.08) * p.speed, 0.04);

            // 光标引力
            const dx = state.pointer.x - p.x;
            const dy = state.pointer.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180) {
                const f = (1 - dist / 180) * 0.5;
                p.vx += (dx / (dist + 1)) * f * 0.05;
                p.vy += (dy / (dist + 1)) * f * 0.05;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.life += 0.005;

            // 边界回环
            if (p.x < -20) p.x = canvasW + 20;
            if (p.x > canvasW + 20) p.x = -20;
            if (p.y < -20) { p.y = canvasH + 20; p.x = Math.random() * canvasW; }
            if (p.y > canvasH + 20) p.y = -20;

            const alpha = (0.4 + Math.sin(p.life * Math.PI) * 0.3) * 0.6;
            ctx.beginPath();
            ctx.fillStyle = accent;
            ctx.globalAlpha = alpha;
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(animateParticles);
    }

    // === 光标光晕 ==============================================

    function onWindowPointerMove(e) {
        state.pointer.x = e.clientX;
        state.pointer.y = e.clientY;
        dom.cursorGlow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
        document.body.classList.add('has-cursor');
    }

    // === 入场揭示 ==============================================

    function revealOnScroll() {
        const reveals = document.querySelectorAll('.reveal');
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        reveals.forEach((el) => io.observe(el));
    }

    // === 事件绑定 ==============================================

    function bindEvents() {
        // 配色
        document.querySelectorAll('.palette-dot').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.palette-dot').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                applyPalette(btn.dataset.palette);
            });
        });

        // 网格吸附
        document.querySelectorAll('.seg-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                state.snap = btn.dataset.snap === '1';
                setHud(state.snap ? '网格吸附 · 开启' : '自由放置 · 开启');
            });
        });

        // 光源角度
        dom.lightAngle.addEventListener('input', (e) => {
            state.lightAngle = parseInt(e.target.value, 10);
            updateLight();
        });

        // 悬浮幅度
        dom.floatAmp.addEventListener('input', (e) => {
            state.floatAmp = parseInt(e.target.value, 10);
            updateFloat();
        });

        // 按钮
        dom.btnClear.addEventListener('click', () => {
            clearAll();
            spawnRipple(50, 50);
        });
        dom.btnShuffle.addEventListener('click', shuffleLayout);

        // 画廊空白处点击 → 取消选中
        dom.gallery.addEventListener('pointerdown', (e) => {
            if (e.target === dom.gallery || e.target.closest('.room') || e.target === dom.placementLayer) {
                clearSelection();
            }
        });

        // 光标
        window.addEventListener('pointermove', onWindowPointerMove, { passive: true });
        window.addEventListener('pointerleave', () => document.body.classList.remove('has-cursor'));

        // 缩放
        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });

        // 键盘删除
        window.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
                if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                removeItem(state.selectedId);
                setHud('已删除展品');
            }
            if (e.key === 'Escape') clearSelection();
        });
    }

    // === 初始化 ================================================

    function seedDemoPlacements() {
        // 初始放置 3 件示例展品, 错峰入场
        const seeds = [
            { artId: 'obelisk', x: 26, y: 58, delay: 400 },
            { artId: 'orb', x: 52, y: 70, delay: 580 },
            { artId: 'spire', x: 74, y: 60, delay: 760 }
        ];
        const colors = PALETTES[state.palette].items;
        seeds.forEach((s, i) => {
            setTimeout(() => {
                placeArt(s.artId, colors[i], s.x, s.y);
                spawnRipple(s.x, s.y);
            }, s.delay);
        });
    }

    function init() {
        document.documentElement.setAttribute('data-palette', state.palette);
        document.body.setAttribute('data-palette', state.palette);
        renderShelf();
        resizeCanvas();
        initParticles();
        animateParticles();
        bindEvents();
        revealOnScroll();
        updateStats();
        updateLight();
        updateFloat();
        setHud('从展藏架拖出作品');
        setTimeout(seedDemoPlacements, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
