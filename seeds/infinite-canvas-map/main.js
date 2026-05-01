(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var PALETTES = {
        obsidian: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#ec4899',
            glow: 'rgba(99,102,241,0.35)',
            nodeColors: ['#6366f1', '#8b5cf6', '#ec4899', '#a78bfa', '#c084fc', '#818cf8'],
            edgeColor: 'rgba(139,92,246,0.3)',
            gridColor: 'rgba(255,255,255,0.035)',
            gridMajor: 'rgba(255,255,255,0.06)'
        },
        aurora: {
            primary: '#10b981',
            secondary: '#34d399',
            accent: '#6ee7b7',
            glow: 'rgba(16,185,129,0.35)',
            nodeColors: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#a7f3d0'],
            edgeColor: 'rgba(52,211,153,0.3)',
            gridColor: 'rgba(255,255,255,0.035)',
            gridMajor: 'rgba(255,255,255,0.06)'
        },
        ember: {
            primary: '#f59e0b',
            secondary: '#ef4444',
            accent: '#f97316',
            glow: 'rgba(245,158,11,0.35)',
            nodeColors: ['#f59e0b', '#ef4444', '#f97316', '#dc2626', '#fbbf24', '#fb923c'],
            edgeColor: 'rgba(245,158,11,0.3)',
            gridColor: 'rgba(255,255,255,0.035)',
            gridMajor: 'rgba(255,255,255,0.06)'
        },
        frost: {
            primary: '#67e8f9',
            secondary: '#a5b4fc',
            accent: '#e0e7ff',
            glow: 'rgba(103,232,249,0.3)',
            nodeColors: ['#67e8f9', '#a5b4fc', '#e0e7ff', '#93c5fd', '#c4b5fd', '#7dd3fc'],
            edgeColor: 'rgba(103,232,249,0.25)',
            gridColor: 'rgba(255,255,255,0.035)',
            gridMajor: 'rgba(255,255,255,0.06)'
        }
    };

    var NODE_RADIUS = 22;
    var NODE_HIT_RADIUS = 30;
    var GRID_SMALL = 50;
    var GRID_LARGE = 200;

    var state = {
        nodes: [],
        edges: [],
        camera: { x: 0, y: 0, zoom: 1 },
        targetCamera: { x: 0, y: 0, zoom: 1 },
        tool: 'pan',
        palette: 'obsidian',
        isPanning: false,
        panStart: { x: 0, y: 0 },
        camStart: { x: 0, y: 0 },
        hoveredNode: null,
        selectedNode: null,
        connectFrom: null,
        dragNode: null,
        dragOffset: { x: 0, y: 0 },
        editingNode: null,
        mouseWorld: { x: 0, y: 0 },
        mouseScreen: { x: 0, y: 0 },
        time: 0,
        particles: [],
        nextId: 1,
        helpVisible: true
    };

    var canvas, ctx, W, H, dpr;
    var animId;

    function $(id) { return document.getElementById(id); }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function dist(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function screenToWorld(sx, sy) {
        return {
            x: (sx - W / 2) / state.camera.zoom + state.camera.x,
            y: (sy - H / 2) / state.camera.zoom + state.camera.y
        };
    }

    function worldToScreen(wx, wy) {
        return {
            x: (wx - state.camera.x) * state.camera.zoom + W / 2,
            y: (wy - state.camera.y) * state.camera.zoom + H / 2
        };
    }

    function getPalette() {
        return PALETTES[state.palette];
    }

    function findNodeAt(wx, wy) {
        for (var i = state.nodes.length - 1; i >= 0; i--) {
            var n = state.nodes[i];
            if (dist({ x: wx, y: wy }, n) < NODE_HIT_RADIUS / state.camera.zoom + NODE_RADIUS) {
                return n;
            }
        }
        return null;
    }

    function addNode(x, y, name, desc, color) {
        var p = getPalette();
        var node = {
            id: state.nextId++,
            x: x,
            y: y,
            name: name || '节点 ' + (state.nodes.length + 1),
            desc: desc || '',
            color: color || p.nodeColors[state.nodes.length % p.nodeColors.length],
            scale: 0,
            targetScale: 1,
            pulsePhase: Math.random() * Math.PI * 2,
            born: Date.now()
        };
        state.nodes.push(node);
        spawnNodeParticles(node);
        updateNavList();
        return node;
    }

    function removeNode(node) {
        state.edges = state.edges.filter(function (e) {
            return e.from !== node.id && e.to !== node.id;
        });
        state.nodes = state.nodes.filter(function (n) {
            return n.id !== node.id;
        });
        if (state.selectedNode === node) state.selectedNode = null;
        if (state.hoveredNode === node) state.hoveredNode = null;
        if (state.connectFrom === node) state.connectFrom = null;
        updateNavList();
    }

    function addEdge(fromId, toId) {
        if (fromId === toId) return;
        var exists = state.edges.some(function (e) {
            return (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId);
        });
        if (exists) return;
        state.edges.push({
            from: fromId,
            to: toId,
            progress: 0
        });
    }

    function getNodeById(id) {
        for (var i = 0; i < state.nodes.length; i++) {
            if (state.nodes[i].id === id) return state.nodes[i];
        }
        return null;
    }

    function spawnNodeParticles(node) {
        for (var i = 0; i < 12; i++) {
            var angle = (Math.PI * 2 / 12) * i + Math.random() * 0.3;
            var speed = 1.5 + Math.random() * 2;
            state.particles.push({
                x: node.x,
                y: node.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.015 + Math.random() * 0.01,
                size: 2 + Math.random() * 2,
                color: node.color
            });
        }
    }

    function showToast(msg) {
        var container = $('toast-container');
        var el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        container.appendChild(el);
        requestAnimationFrame(function () {
            el.classList.add('show');
        });
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 500);
        }, 2200);
    }

    function updateNavList() {
        var list = $('nav-list');
        list.innerHTML = '';
        state.nodes.forEach(function (n) {
            var item = document.createElement('div');
            item.className = 'nav-item' + (state.selectedNode === n ? ' active' : '');
            item.innerHTML = '<span class="nav-dot" style="background:' + n.color + '"></span><span class="nav-item-text">' + escapeHtml(n.name) + '</span>';
            item.addEventListener('click', function () {
                focusOnNode(n);
            });
            list.appendChild(item);
        });
    }

    function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function focusOnNode(node) {
        state.targetCamera.x = node.x;
        state.targetCamera.y = node.y;
        state.targetCamera.zoom = Math.max(state.targetCamera.zoom, 1);
        state.selectedNode = node;
        updateNavList();
    }

    function openEditor(node) {
        state.editingNode = node;
        $('editor-name').value = node.name;
        $('editor-desc').value = node.desc;
        var editor = $('node-editor');
        editor.hidden = false;
        requestAnimationFrame(function () {
            editor.classList.add('visible');
        });
        buildColorOptions(node);
    }

    function closeEditor() {
        var editor = $('node-editor');
        editor.classList.remove('visible');
        setTimeout(function () {
            editor.hidden = true;
        }, 400);
        state.editingNode = null;
    }

    function buildColorOptions(node) {
        var container = $('color-options');
        container.innerHTML = '';
        var p = getPalette();
        p.nodeColors.forEach(function (c) {
            var btn = document.createElement('button');
            btn.className = 'color-opt' + (node.color === c ? ' active' : '');
            btn.style.background = c;
            btn.addEventListener('click', function () {
                container.querySelectorAll('.color-opt').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                node.color = c;
            });
            container.appendChild(btn);
        });
    }

    function drawGrid() {
        var p = getPalette();
        var zoom = state.camera.zoom;
        var camX = state.camera.x;
        var camY = state.camera.y;

        var smallVisible = GRID_SMALL * zoom > 15;
        var largeVisible = GRID_LARGE * zoom > 30;

        var left = camX - W / 2 / zoom;
        var right = camX + W / 2 / zoom;
        var top = camY - H / 2 / zoom;
        var bottom = camY + H / 2 / zoom;

        if (largeVisible) {
            ctx.strokeStyle = p.gridMajor;
            ctx.lineWidth = 1;
            var startX = Math.floor(left / GRID_LARGE) * GRID_LARGE;
            var startY = Math.floor(top / GRID_LARGE) * GRID_LARGE;
            ctx.beginPath();
            for (var x = startX; x <= right; x += GRID_LARGE) {
                var sp = worldToScreen(x, 0);
                ctx.moveTo(sp.x, 0);
                ctx.lineTo(sp.x, H);
            }
            for (var y = startY; y <= bottom; y += GRID_LARGE) {
                var sp2 = worldToScreen(0, y);
                ctx.moveTo(0, sp2.y);
                ctx.lineTo(W, sp2.y);
            }
            ctx.stroke();
        }

        if (smallVisible) {
            ctx.strokeStyle = p.gridColor;
            ctx.lineWidth = 0.5;
            var sX = Math.floor(left / GRID_SMALL) * GRID_SMALL;
            var sY = Math.floor(top / GRID_SMALL) * GRID_SMALL;
            ctx.beginPath();
            for (var x2 = sX; x2 <= right; x2 += GRID_SMALL) {
                var sp3 = worldToScreen(x2, 0);
                ctx.moveTo(sp3.x, 0);
                ctx.lineTo(sp3.x, H);
            }
            for (var y2 = sY; y2 <= bottom; y2 += GRID_SMALL) {
                var sp4 = worldToScreen(0, y2);
                ctx.moveTo(0, sp4.y);
                ctx.lineTo(W, sp4.y);
            }
            ctx.stroke();
        }

        var origin = worldToScreen(0, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, H);
        ctx.moveTo(0, origin.y);
        ctx.lineTo(W, origin.y);
        ctx.stroke();
    }

    function drawEdges() {
        var p = getPalette();
        state.edges.forEach(function (edge) {
            var fromNode = getNodeById(edge.from);
            var toNode = getNodeById(edge.to);
            if (!fromNode || !toNode) return;

            edge.progress = Math.min(edge.progress + 0.04, 1);

            var from = worldToScreen(fromNode.x, fromNode.y);
            var to = worldToScreen(toNode.x, toNode.y);

            var cp1x = from.x + (to.x - from.x) * 0.3;
            var cp1y = from.y - 30 * state.camera.zoom;
            var cp2x = from.x + (to.x - from.x) * 0.7;
            var cp2y = to.y + 30 * state.camera.zoom;

            var prog = edge.progress;
            var easeProg = 1 - Math.pow(1 - prog, 3);

            ctx.save();
            ctx.globalAlpha = easeProg * 0.7;
            ctx.strokeStyle = p.edgeColor;
            ctx.lineWidth = Math.max(1, 2 * state.camera.zoom);
            ctx.setLineDash([6, 4]);
            ctx.lineDashOffset = -state.time * 0.5;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.restore();
        });
    }

    function drawConnectingLine() {
        if (!state.connectFrom) return;
        var from = worldToScreen(state.connectFrom.x, state.connectFrom.y);
        var to = { x: state.mouseScreen.x, y: state.mouseScreen.y };

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = getPalette().primary;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -state.time * 0.8;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    function drawNodes() {
        var zoom = state.camera.zoom;
        state.nodes.forEach(function (node) {
            node.scale = lerp(node.scale, node.targetScale, 0.12);

            var sp = worldToScreen(node.x, node.y);
            var r = Math.max(1, NODE_RADIUS * zoom * node.scale);
            var pulse = Math.sin(state.time * 0.03 + node.pulsePhase) * 0.08 + 1;
            var drawR = r * pulse;

            var isHovered = state.hoveredNode === node;
            var isSelected = state.selectedNode === node;
            var isConnectFrom = state.connectFrom === node;

            if (isHovered) drawR *= 1.12;
            if (isSelected) drawR *= 1.05;

            ctx.save();

            if (isSelected || isConnectFrom) {
                ctx.shadowColor = node.color;
                ctx.shadowBlur = 30 * zoom;
            }

            var grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, drawR);
            grad.addColorStop(0, node.color);
            grad.addColorStop(0.7, node.color);
            grad.addColorStop(1, hexToRgba(node.color, 0.2));

            ctx.beginPath();
            ctx.arc(sp.x, sp.y, drawR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            if (isSelected) {
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            if (zoom > 0.35) {
                ctx.fillStyle = '#fff';
                ctx.font = Math.max(10, 12 * zoom) + 'px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                var label = node.name.charAt(0).toUpperCase();
                ctx.fillText(label, sp.x, sp.y);
            }

            if (zoom > 0.5) {
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = Math.max(9, 11 * zoom) + 'px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(node.name, sp.x, sp.y + drawR + 6 * zoom);
            }

            if (zoom > 0.6 && node.desc) {
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.font = Math.max(8, 10 * zoom) + 'px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(node.desc.substring(0, 30), sp.x, sp.y + drawR + 20 * zoom);
            }

            ctx.restore();
        });
    }

    function drawParticles() {
        for (var i = state.particles.length - 1; i >= 0; i--) {
            var p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= p.decay;

            if (p.life <= 0) {
                state.particles.splice(i, 1);
                continue;
            }

            var sp = worldToScreen(p.x, p.y);
            ctx.save();
            ctx.globalAlpha = p.life * 0.8;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, Math.max(0.5, p.size * state.camera.zoom * p.life), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawOriginLabel() {
        var sp = worldToScreen(0, 0);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '10px Share Tech Mono, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('(0, 0)', sp.x + 8, sp.y - 6);
        ctx.restore();
    }

    function hexToRgba(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function updateCamera() {
        state.camera.x = lerp(state.camera.x, state.targetCamera.x, 0.1);
        state.camera.y = lerp(state.camera.y, state.targetCamera.y, 0.1);
        state.camera.zoom = lerp(state.camera.zoom, state.targetCamera.zoom, 0.1);
    }

    function updateCoords() {
        var wx = Math.round(state.mouseWorld.x);
        var wy = Math.round(state.mouseWorld.y);
        $('coord-x').textContent = wx;
        $('coord-y').textContent = wy;
        $('zoom-label').textContent = Math.round(state.camera.zoom * 100) + '%';
    }

    function render() {
        ctx.clearRect(0, 0, W, H);

        drawGrid();
        drawEdges();
        drawConnectingLine();
        drawParticles();
        drawNodes();
        drawOriginLabel();

        updateCamera();
        updateCoords();

        state.time++;
        animId = requestAnimationFrame(render);
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function bindEvents() {
        window.addEventListener('resize', resize);

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('dblclick', onDoubleClick);
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        document.addEventListener('keydown', onKeyDown);

        $('nav-collapse-btn').addEventListener('click', function () {
            $('nav-panel').classList.toggle('collapsed');
        });

        $('zoom-in').addEventListener('click', function () {
            state.targetCamera.zoom = Math.min(5, state.targetCamera.zoom * 1.25);
        });

        $('zoom-out').addEventListener('click', function () {
            state.targetCamera.zoom = Math.max(0.15, state.targetCamera.zoom / 1.25);
        });

        var toolBtns = document.querySelectorAll('.tool-btn');
        toolBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tool = btn.getAttribute('data-tool');
                setTool(tool);
            });
        });

        var swatches = document.querySelectorAll('.palette-swatch');
        swatches.forEach(function (sw) {
            sw.addEventListener('click', function () {
                swatches.forEach(function (s) { s.classList.remove('active'); });
                sw.classList.add('active');
                state.palette = sw.getAttribute('data-palette');
                applyPaletteCSS();
            });
        });

        $('editor-close').addEventListener('click', closeEditor);
        $('editor-save').addEventListener('click', function () {
            if (!state.editingNode) return;
            state.editingNode.name = $('editor-name').value || state.editingNode.name;
            state.editingNode.desc = $('editor-desc').value;
            updateNavList();
            showToast('节点已更新');
            closeEditor();
        });

        setTimeout(function () {
            state.helpVisible = false;
            $('help-hint').classList.add('hidden');
        }, 5000);
    }

    function setTool(tool) {
        state.tool = tool;
        state.connectFrom = null;
        var toolBtns = document.querySelectorAll('.tool-btn');
        toolBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
        });
        document.body.className = '';
        if (tool !== 'pan') document.body.classList.add('tool-' + tool);
    }

    function applyPaletteCSS() {
        var p = getPalette();
        var root = document.documentElement.style;
        root.setProperty('--palette-primary', p.primary);
        root.setProperty('--palette-secondary', p.secondary);
        root.setProperty('--palette-accent', p.accent);
        root.setProperty('--palette-glow', p.glow);
    }

    function onMouseDown(e) {
        if (e.button === 2) return;
        var world = screenToWorld(e.clientX, e.clientY);
        state.mouseWorld = world;
        state.mouseScreen = { x: e.clientX, y: e.clientY };

        var hitNode = findNodeAt(world.x, world.y);

        if (state.tool === 'pan') {
            if (hitNode) {
                state.dragNode = hitNode;
                state.dragOffset = { x: hitNode.x - world.x, y: hitNode.y - world.y };
                state.selectedNode = hitNode;
                updateNavList();
            } else {
                state.isPanning = true;
                state.panStart = { x: e.clientX, y: e.clientY };
                state.camStart = { x: state.targetCamera.x, y: state.targetCamera.y };
                document.body.classList.add('panning');
            }
        } else if (state.tool === 'add') {
            var name = '节点 ' + (state.nodes.length + 1);
            var node = addNode(world.x, world.y, name);
            state.selectedNode = node;
            showToast('已添加: ' + name);
        } else if (state.tool === 'connect') {
            if (hitNode) {
                if (!state.connectFrom) {
                    state.connectFrom = hitNode;
                    hitNode.targetScale = 1.15;
                    showToast('选择目标节点...');
                } else {
                    if (hitNode !== state.connectFrom) {
                        addEdge(state.connectFrom.id, hitNode.id);
                        showToast('连接已建立');
                    }
                    state.connectFrom.targetScale = 1;
                    state.connectFrom = null;
                }
            }
        } else if (state.tool === 'delete') {
            if (hitNode) {
                showToast('已删除: ' + hitNode.name);
                removeNode(hitNode);
            }
        }
    }

    function onMouseMove(e) {
        var world = screenToWorld(e.clientX, e.clientY);
        state.mouseWorld = world;
        state.mouseScreen = { x: e.clientX, y: e.clientY };

        if (state.isPanning) {
            var dx = (e.clientX - state.panStart.x) / state.camera.zoom;
            var dy = (e.clientY - state.panStart.y) / state.camera.zoom;
            state.targetCamera.x = state.camStart.x - dx;
            state.targetCamera.y = state.camStart.y - dy;
            state.camera.x = state.targetCamera.x;
            state.camera.y = state.targetCamera.y;
            return;
        }

        if (state.dragNode) {
            state.dragNode.x = world.x + state.dragOffset.x;
            state.dragNode.y = world.y + state.dragOffset.y;
            return;
        }

        var hitNode = findNodeAt(world.x, world.y);
        if (state.hoveredNode && state.hoveredNode !== hitNode) {
            state.hoveredNode.targetScale = 1;
        }
        state.hoveredNode = hitNode;
        if (hitNode) {
            hitNode.targetScale = 1.08;
            canvas.style.cursor = state.tool === 'pan' ? 'grab' : 'pointer';
        } else {
            canvas.style.cursor = '';
        }
    }

    function onMouseUp(e) {
        if (state.isPanning) {
            state.isPanning = false;
            document.body.classList.remove('panning');
        }
        state.dragNode = null;
    }

    function onWheel(e) {
        e.preventDefault();
        var zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        var newZoom = state.targetCamera.zoom * zoomFactor;
        newZoom = Math.max(0.1, Math.min(5, newZoom));

        var worldBefore = screenToWorld(e.clientX, e.clientY);
        state.targetCamera.zoom = newZoom;
        state.camera.zoom = newZoom;

        var worldAfter = screenToWorld(e.clientX, e.clientY);
        state.targetCamera.x += worldBefore.x - worldAfter.x;
        state.targetCamera.y += worldBefore.y - worldAfter.y;
        state.camera.x = state.targetCamera.x;
        state.camera.y = state.targetCamera.y;
    }

    function onDoubleClick(e) {
        var world = screenToWorld(e.clientX, e.clientY);
        var hitNode = findNodeAt(world.x, world.y);
        if (hitNode) {
            state.selectedNode = hitNode;
            openEditor(hitNode);
            updateNavList();
        } else if (state.tool === 'pan') {
            var name = '节点 ' + (state.nodes.length + 1);
            var node = addNode(world.x, world.y, name);
            state.selectedNode = node;
            updateNavList();
            showToast('已添加: ' + name);
        }
    }

    function onKeyDown(e) {
        var key = e.key.toLowerCase();
        if (state.editingNode) return;
        if (key === 'v') setTool('pan');
        else if (key === 'n') setTool('add');
        else if (key === 'c') setTool('connect');
        else if (key === 'x' || key === 'delete' || key === 'backspace') {
            if (state.selectedNode && key !== 'x') {
                showToast('已删除: ' + state.selectedNode.name);
                removeNode(state.selectedNode);
            } else if (key === 'x') {
                setTool('delete');
            }
        }
        else if (key === 'escape') {
            if (state.connectFrom) {
                state.connectFrom.targetScale = 1;
                state.connectFrom = null;
            }
            closeEditor();
        }
    }

    function seedInitialNodes() {
        var names = [
            { name: '起始点', desc: '你的旅程从这里开始', dx: 0, dy: 0 },
            { name: '灵感瀑布', desc: '思维如水流般倾泻', dx: 280, dy: -120 },
            { name: '星辰图书馆', desc: '存放所有知识的殿堂', dx: -200, dy: -250 },
            { name: '回声花园', desc: '每个想法都会产生回响', dx: 350, dy: 200 },
            { name: '时间晶体', desc: '凝固的记忆碎片', dx: -320, dy: 180 },
            { name: '梦境桥', desc: '连接现实与想象的通道', dx: 100, dy: -350 },
            { name: '量子市场', desc: '不确定性的交易场所', dx: -150, dy: 350 }
        ];

        var nodes = [];
        names.forEach(function (item) {
            var n = addNode(item.dx, item.dy, item.name, item.desc);
            nodes.push(n);
        });

        addEdge(nodes[0].id, nodes[1].id);
        addEdge(nodes[0].id, nodes[2].id);
        addEdge(nodes[0].id, nodes[3].id);
        addEdge(nodes[0].id, nodes[4].id);
        addEdge(nodes[1].id, nodes[5].id);
        addEdge(nodes[2].id, nodes[5].id);
        addEdge(nodes[3].id, nodes[6].id);
        addEdge(nodes[4].id, nodes[6].id);
    }

    function init() {
        canvas = $('canvas');
        ctx = canvas.getContext('2d');
        resize();
        bindEvents();
        applyPaletteCSS();
        seedInitialNodes();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
