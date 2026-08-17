(function () {
    'use strict';

    /* =====================================================================
       Surface Geo Painter · 曲面几何画师
       交互逻辑: 3D 曲面雕塑绘画 · 弹簧-阻尼物理 · 波动耦合 · 6 种雕塑画笔
                 · 径向对称 · 轨道视角 · 程序化地形 · 撤销/重做 · PNG 导出
                 · 粒子流场 · 氛围配色
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    /* =====================================================================
       === DOM Elements ===
       ===================================================================== */

    var canvas = document.getElementById('surface-canvas');
    var ctx = canvas.getContext('2d');
    var pCanvas = document.getElementById('particle-canvas');
    var pCtx = pCanvas.getContext('2d');

    var hudDot = document.getElementById('hud-dot');
    var hudText = document.getElementById('hud-text');
    var telMesh = document.getElementById('tel-mesh');
    var telEnergy = document.getElementById('tel-energy');
    var telFps = document.getElementById('tel-fps');
    var telMode = document.getElementById('tel-mode');
    var brushCounter = document.getElementById('brush-counter');
    var cursorGlow = document.getElementById('cursor-glow');
    var rippleLayer = document.getElementById('ripple-layer');
    var toastEl = document.getElementById('toast');
    var brushRing = document.getElementById('brush-ring');

    var brushButtons = document.querySelectorAll('.brush-btn');
    var paletteDots = document.querySelectorAll('.palette-dot');
    var segButtons = document.querySelectorAll('.seg-btn');

    var sliderRadius = document.getElementById('slider-radius');
    var valRadius = document.getElementById('val-radius');
    var sliderStrength = document.getElementById('slider-strength');
    var valStrength = document.getElementById('val-strength');
    var sliderSym = document.getElementById('slider-sym');
    var valSym = document.getElementById('val-sym');
    var toggleAmbient = document.getElementById('toggle-ambient');

    var btnOrbit = document.getElementById('btn-orbit');
    var btnSpin = document.getElementById('btn-spin');
    var btnUndo = document.getElementById('btn-undo');
    var btnRedo = document.getElementById('btn-redo');
    var btnRandom = document.getElementById('btn-random');
    var btnClear = document.getElementById('btn-clear');
    var btnExport = document.getElementById('btn-export');

    /* =====================================================================
       === 氛围配色注册表 ===
       low / mid / high: 曲面高度色带 (HSL)
       accentRgb / bgRgb: 粒子与光晕用
       ===================================================================== */

    var PALETTES = {
        aurora: {
            low: [192, 72, 15], mid: [162, 68, 42], high: [152, 95, 92],
            accentRgb: [122, 240, 200], bgRgb: [4, 18, 26]
        },
        ember: {
            low: [16, 68, 14], mid: [20, 78, 48], high: [36, 100, 88],
            accentRgb: [240, 160, 122], bgRgb: [23, 8, 6]
        },
        abyss: {
            low: [222, 76, 14], mid: [216, 70, 44], high: [210, 95, 90],
            accentRgb: [122, 168, 240], bgRgb: [6, 11, 24]
        },
        orchid: {
            low: [268, 62, 15], mid: [272, 66, 46], high: [288, 95, 91],
            accentRgb: [180, 136, 240], bgRgb: [16, 8, 32]
        }
    };

    var currentPalette = 'aurora';
    var lut = new Uint8Array(96 * 3); // 高度色带查找表

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        var c = (1 - Math.abs(2 * l - 1)) * s;
        var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        var m = l - c / 2;
        var r = 0, g = 0, b = 0;
        if (h < 60)       { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else              { r = c; b = x; }
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    function buildLut() {
        var p = PALETTES[currentPalette];
        var steps = lut.length / 3;
        for (var i = 0; i < steps; i++) {
            var t = i / (steps - 1);
            var h, s, l;
            if (t < 0.5) {
                var k = t / 0.5;
                h = p.low[0] + (p.mid[0] - p.low[0]) * k;
                s = p.low[1] + (p.mid[1] - p.low[1]) * k;
                l = p.low[2] + (p.mid[2] - p.low[2]) * k;
            } else {
                var k2 = (t - 0.5) / 0.5;
                h = p.mid[0] + (p.high[0] - p.mid[0]) * k2;
                s = p.mid[1] + (p.high[1] - p.mid[1]) * k2;
                l = p.mid[2] + (p.high[2] - p.mid[2]) * k2;
            }
            var rgb = hslToRgb(h, s, l);
            lut[i * 3] = rgb[0];
            lut[i * 3 + 1] = rgb[1];
            lut[i * 3 + 2] = rgb[2];
        }
    }

    /* =====================================================================
       === 曲面模型 (高度场) ===
       N×N 顶点网格 · 弹簧-阻尼物理 + 邻域波动耦合
       ===================================================================== */

    var N = 40;                 // 网格分辨率
    var WORLD = 300;            // 世界尺寸
    var MAXH = 64;              // 高度上限
    var FOCAL = 760;            // 焦距
    var DIST = 520;             // 相机距离

    var vertCount = N * N;
    var heights = new Float32Array(vertCount);   // 当前高度
    var vels = new Float32Array(vertCount);      // 速度
    var targets = new Float32Array(vertCount);   // 雕塑目标

    var wxA = new Float32Array(vertCount);       // 世界 x 坐标
    var wzA = new Float32Array(vertCount);       // 世界 z 坐标
    var sxA = new Float32Array(vertCount);       // 投影屏幕 x
    var syA = new Float32Array(vertCount);       // 投影屏幕 y
    var sdA = new Float32Array(vertCount);       // 投影深度

    (function initWorldCoords() {
        for (var j = 0; j < N; j++) {
            for (var i = 0; i < N; i++) {
                var idx = j * N + i;
                wxA[idx] = (i / (N - 1) - 0.5) * WORLD;
                wzA[idx] = (j / (N - 1) - 0.5) * WORLD;
            }
        }
    })();

    var faceCount = (N - 1) * (N - 1);
    var faceOrder = [];
    for (var f = 0; f < faceCount; f++) faceOrder.push(f);
    var faceDepth = new Float32Array(faceCount);
    var visibleFaces = [];

    /* =====================================================================
       === 相机 (轨道视角) ===
       pitch 负值 = 俯视 · yaw 自转 · zoom 用户缩放
       ===================================================================== */

    var yaw = 0.65;
    var pitch = -0.55;
    var zoomFactor = 1;
    var zoomBase = 1;
    var camW = 0;
    var camH = 0;

    var cosYaw = 1, sinYaw = 0, cosPitch = 1, sinPitch = 0;
    var camX = 0, camY = 0, camZ = 0; // 相机世界坐标

    function updateCamera() {
        cosYaw = Math.cos(yaw);
        sinYaw = Math.sin(yaw);
        cosPitch = Math.cos(pitch);
        sinPitch = Math.sin(pitch);
        // 相机世界位置: 视空间 (0,0,-DIST) 经逆旋转
        camY = -DIST * sinPitch;
        var z1 = -DIST * cosPitch;
        camX = z1 * sinYaw;
        camZ = z1 * cosYaw;
    }

    function projectVertex(idx, y) {
        var x = wxA[idx];
        var z = wzA[idx];
        var x1 = x * cosYaw - z * sinYaw;
        var z1 = x * sinYaw + z * cosYaw;
        var y1 = y * cosPitch - z1 * sinPitch;
        var z2 = y * sinPitch + z1 * cosPitch;
        var depth = z2 + DIST;
        var s = (FOCAL * zoomBase * zoomFactor) / depth;
        sxA[idx] = camW / 2 + x1 * s;
        syA[idx] = camH / 2 - y1 * s;
        sdA[idx] = depth;
    }

    /* 屏幕坐标 → 世界平面 (y=0) 交点 */
    function screenToWorld(mx, my) {
        var dx = mx - camW / 2;
        var dy = my - camH / 2;
        var fz = FOCAL * zoomBase * zoomFactor;
        // 视空间方向
        var dvx = dx, dvy = -dy, dvz = fz;
        var len = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
        dvx /= len; dvy /= len; dvz /= len;
        // 逆 pitch
        var ry = dvy * cosPitch + dvz * sinPitch;
        var rz1 = -dvy * sinPitch + dvz * cosPitch;
        // 逆 yaw
        var wx = dvx * cosYaw + rz1 * sinYaw;
        var wz = -dvx * sinYaw + rz1 * cosYaw;
        if (Math.abs(ry) < 1e-5) return null;
        var t = -camY / ry;
        if (t <= 0) return null;
        var hx = camX + wx * t;
        var hz = camZ + wz * t;
        return { x: hx, z: hz };
    }

    /* 双线性采样曲面高度 */
    function surfaceHeightAt(x, z) {
        var fi = ((x / WORLD) + 0.5) * (N - 1);
        var fj = ((z / WORLD) + 0.5) * (N - 1);
        var i = Math.max(0, Math.min(N - 2, Math.floor(fi)));
        var j = Math.max(0, Math.min(N - 2, Math.floor(fj)));
        var ti = fi - i;
        var tj = fj - j;
        var a = heights[j * N + i];
        var b = heights[j * N + i + 1];
        var c = heights[(j + 1) * N + i];
        var d = heights[(j + 1) * N + i + 1];
        return (a * (1 - ti) + b * ti) * (1 - tj) + (c * (1 - ti) + d * ti) * tj;
    }

    /* =====================================================================
       === 值噪声 + FBM (程序化地形) ===
       ===================================================================== */

    function hash2(ix, iz, seed) {
        var h = ix * 374761393 + iz * 668265263 + seed * 1274126177;
        h = (h ^ (h >> 13)) * 1274126177;
        h = h ^ (h >> 16);
        return (h >>> 0) / 4294967295;
    }

    function smoothT(t) {
        return t * t * (3 - 2 * t);
    }

    function valueNoise(x, z, seed) {
        var ix = Math.floor(x);
        var iz = Math.floor(z);
        var fx = smoothT(x - ix);
        var fz = smoothT(z - iz);
        var a = hash2(ix, iz, seed);
        var b = hash2(ix + 1, iz, seed);
        var c = hash2(ix, iz + 1, seed);
        var d = hash2(ix + 1, iz + 1, seed);
        return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
    }

    function fbm(x, z, seed) {
        var sum = 0;
        var amp = 0.55;
        var freq = 1;
        for (var o = 0; o < 4; o++) {
            sum += valueNoise(x * freq, z * freq, seed + o * 97) * amp;
            amp *= 0.5;
            freq *= 2.05;
        }
        return sum;
    }

    /* =====================================================================
       === 雕塑状态 ===
       ===================================================================== */

    var currentBrush = 'raise';
    var brushRadius = 56;
    var brushStrength = 0.55;
    var brushSym = 1;
    var ambientOn = true;
    var renderMode = 'solid';
    var orbitMode = false;   // 常驻轨道模式 (按钮)
    var orbitHeld = false;   // 按住空格
    var spinOn = true;

    var isPainting = false;
    var isOrbiting = false;
    var lastPointerX = 0;
    var lastPointerY = 0;
    var lastPaintWorld = null;

    var undoStack = [];
    var redoStack = [];
    var MAX_HISTORY = 40;

    var BRUSH_NAMES = {
        raise: 'RAISE',
        carve: 'CARVE',
        smooth: 'SMOOTH',
        ripple: 'RIPPLE',
        spike: 'SPIKE',
        flatten: 'FLATTEN'
    };

    /* =====================================================================
       === 物理步进 ===
       弹簧归位 + 邻域波动耦合 + 环境呼吸
       ===================================================================== */

    var K_SPRING = 0.085;
    var K_COUPLE = 0.34;
    var DAMPING = 0.88;
    var prevHeights = new Float32Array(vertCount);

    function physicsStep(tSec) {
        var amb = ambientOn ? 1 : 0;
        prevHeights.set(heights);
        for (var j = 0; j < N; j++) {
            for (var i = 0; i < N; i++) {
                var idx = j * N + i;
                var h = heights[idx];

                // 邻域均值 (基于上一帧快照 · Jacobi 步进保证数值稳定)
                var jl = j > 0 ? idx - N : idx;
                var jr = j < N - 1 ? idx + N : idx;
                var il = i > 0 ? idx - 1 : idx;
                var ir = i < N - 1 ? idx + 1 : idx;
                var avg = (prevHeights[jl] + prevHeights[jr] + prevHeights[il] + prevHeights[ir]) * 0.25;

                var v = vels[idx];
                // 弹簧: 追随目标 (+ 环境呼吸偏移)
                var rest = targets[idx];
                if (amb) {
                    rest += Math.sin(tSec * 0.9 + (wxA[idx] + wzA[idx]) * 0.011
                        + Math.sin(tSec * 0.5 + (wxA[idx] - wzA[idx]) * 0.017)) * 2.4;
                }
                v += (rest - h) * K_SPRING;
                // 波动耦合: 涌现涟漪传播
                v += (avg - h) * K_COUPLE;
                v *= DAMPING;

                heights[idx] = h + v;
                vels[idx] = v;
            }
        }
    }

    /* =====================================================================
       === 画笔应用 ===
       falloff: cos 平滑衰减 · 径向对称旋转复制
       ===================================================================== */

    function applyBrushAt(wx, wz, power, tSec) {
        var r = brushRadius;
        var r2 = r * r;
        var strength = brushStrength;
        var sym = brushMax(brushSym);

        for (var k = 0; k < sym; k++) {
            var ang = (Math.PI * 2 * k) / sym;
            var ca = Math.cos(ang);
            var sa = Math.sin(ang);
            var px = wx * ca - wz * sa;
            var pz = wx * sa + wz * ca;

            var i0 = Math.max(0, Math.floor(((px - r) / WORLD + 0.5) * (N - 1)));
            var i1 = Math.min(N - 1, Math.ceil(((px + r) / WORLD + 0.5) * (N - 1)));
            var j0 = Math.max(0, Math.floor(((pz - r) / WORLD + 0.5) * (N - 1)));
            var j1 = Math.min(N - 1, Math.ceil(((pz + r) / WORLD + 0.5) * (N - 1)));

            for (var j = j0; j <= j1; j++) {
                for (var i = i0; i <= i1; i++) {
                    var dx = wxA0(i) - px;
                    var dz = wzA0(j) - pz;
                    var d2 = dx * dx + dz * dz;
                    if (d2 > r2) continue;
                    var d = Math.sqrt(d2);
                    var f = 0.5 + 0.5 * Math.cos((Math.PI * d) / r);
                    var idx = j * N + i;

                    switch (currentBrush) {
                        case 'raise':
                            targets[idx] += 1.6 * strength * f * power;
                            break;
                        case 'carve':
                            targets[idx] -= 1.6 * strength * f * power;
                            break;
                        case 'smooth': {
                            var jl = j > 0 ? idx - N : idx;
                            var jr = j < N - 1 ? idx + N : idx;
                            var il = i > 0 ? idx - 1 : idx;
                            var ir = i < N - 1 ? idx + 1 : idx;
                            var avg = (targets[jl] + targets[jr] + targets[il] + targets[ir]) * 0.25;
                            targets[idx] += (avg - targets[idx]) * f * strength * 0.55 * power;
                            break;
                        }
                        case 'ripple':
                            vels[idx] += Math.sin(d * 0.14 - tSec * 8) * 3.2 * strength * f * power;
                            break;
                        case 'spike':
                            targets[idx] += f * f * strength * power * (Math.random() * 7 - 1.6);
                            break;
                        case 'flatten':
                            targets[idx] += (0 - targets[idx]) * f * strength * 0.5 * power;
                            break;
                    }

                    if (targets[idx] > MAXH) targets[idx] = MAXH;
                    else if (targets[idx] < -MAXH) targets[idx] = -MAXH;
                }
            }
        }
    }

    function brushMax(v) { return Math.max(1, Math.min(8, v | 0)); }
    function wxA0(i) { return (i / (N - 1) - 0.5) * WORLD; }
    function wzA0(j) { return (j / (N - 1) - 0.5) * WORLD; }

    /* 笔触插值 (沿轨迹分段采样, 保证匀速覆盖) */
    function paintStroke(wx, wz, tSec) {
        if (!lastPaintWorld) {
            applyBrushAt(wx, wz, 1, tSec);
        } else {
            var dx = wx - lastPaintWorld.x;
            var dz = wz - lastPaintWorld.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            var step = brushRadius * 0.45;
            var steps = Math.max(1, Math.min(8, Math.ceil(dist / step)));
            for (var s = 1; s <= steps; s++) {
                var t = s / steps;
                applyBrushAt(
                    lastPaintWorld.x + dx * t,
                    lastPaintWorld.z + dz * t,
                    1 / steps * 2,
                    tSec
                );
            }
        }
        lastPaintWorld = { x: wx, z: wz };
    }

    /* =====================================================================
       === 光照 ===
       面法线 (世界空间对角线叉积) · 单方向光
       ===================================================================== */

    var LX = -0.42, LY = 0.76, LZ = 0.45;

    function faceShade(a, b, c, d) {
        var ax = wxA[c] - wxA[a], ay = heights[c] - heights[a], az = wzA[c] - wzA[a];
        var bx = wxA[d] - wxA[b], by = heights[d] - heights[b], bz = wzA[d] - wzA[b];
        var nx = ay * bz - az * by;
        var ny = az * bx - ax * bz;
        var nz = ax * by - ay * bx;
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        var dot = (nx * LX + ny * LY + nz * LZ) / len;
        if (dot < 0) dot = 0;
        return 0.4 + 0.6 * dot;
    }

    /* =====================================================================
       === 渲染 ===
       画家算法排序 · 背面剔除 · 高度色带 · 深度雾
       ===================================================================== */

    function renderSurface() {
        ctx.clearRect(0, 0, camW, camH);

        // 1. 投影全部顶点
        for (var v = 0; v < vertCount; v++) {
            projectVertex(v, heights[v]);
        }

        // 2. 收集可见面 (屏幕空间叉积剔除背面)
        visibleFaces.length = 0;
        for (var fj = 0; fj < N - 1; fj++) {
            for (var fi = 0; fi < N - 1; fi++) {
                var fidx = fj * (N - 1) + fi;
                var a = fj * N + fi;
                var b = a + 1;
                var c = a + N + 1;
                var d = a + N;
                var cross = (sxA[c] - sxA[a]) * (syA[d] - syA[b])
                    - (syA[c] - syA[a]) * (sxA[d] - sxA[b]);
                if (cross >= 0) continue;
                faceDepth[fidx] = (sdA[a] + sdA[b] + sdA[c] + sdA[d]) * 0.25;
                visibleFaces.push(fidx);
            }
        }

        // 3. 深度排序 (远 → 近)
        visibleFaces.sort(function (x, y) { return faceDepth[y] - faceDepth[x]; });

        var lutSteps = lut.length / 3;

        if (renderMode === 'solid') {
            // 实体: 逐面填充 + 高度色带 × 光照 × 深度雾
            ctx.lineJoin = 'round';
            for (var m = 0; m < visibleFaces.length; m++) {
                var fidx2 = visibleFaces[m];
                var base = fidx2 / (N - 1) | 0;
                var rem = fidx2 - base * (N - 1);
                var a2 = base * N + rem;
                var b2 = a2 + 1;
                var c2 = a2 + N + 1;
                var d2 = a2 + N;

                var hAvg = (heights[a2] + heights[b2] + heights[c2] + heights[d2]) * 0.25;
                var t = (hAvg / MAXH + 1) * 0.5;
                var li = Math.max(0, Math.min(lutSteps - 1, (t * (lutSteps - 1)) | 0)) * 3;
                var shade = faceShade(a2, b2, c2, d2);
                var r = lut[li] * shade;
                var g = lut[li + 1] * shade;
                var bl = lut[li + 2] * shade;
                var fog = 1 - Math.min(0.5, Math.max(0, (faceDepth[fidx2] - (DIST - 200)) / 440)) * 0.62;

                ctx.beginPath();
                ctx.moveTo(sxA[a2], syA[a2]);
                ctx.lineTo(sxA[b2], syA[b2]);
                ctx.lineTo(sxA[c2], syA[c2]);
                ctx.lineTo(sxA[d2], syA[d2]);
                ctx.closePath();
                ctx.fillStyle = 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ',' + fog.toFixed(3) + ')';
                ctx.fill();
            }
            // 微晶网格描边 (单次批量)
            var bg = PALETTES[currentPalette].bgRgb;
            ctx.beginPath();
            for (var m2 = 0; m2 < visibleFaces.length; m2++) {
                var fidx3 = visibleFaces[m2];
                var base3 = fidx3 / (N - 1) | 0;
                var rem3 = fidx3 - base3 * (N - 1);
                var a3 = base3 * N + rem3;
                ctx.moveTo(sxA[a3], syA[a3]);
                ctx.lineTo(sxA[a3 + 1], syA[a3 + 1]);
                ctx.lineTo(sxA[a3 + N + 1], syA[a3 + N + 1]);
                ctx.lineTo(sxA[a3 + N], syA[a3 + N]);
                ctx.closePath();
            }
            ctx.strokeStyle = 'rgba(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ',0.22)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        } else if (renderMode === 'wire') {
            // 线框: 按高度分桶批量描边
            var buckets = 10;
            var paths = [];
            for (var w = 0; w < buckets; w++) paths.push([]);
            for (var m3 = 0; m3 < visibleFaces.length; m3++) {
                var fidx4 = visibleFaces[m3];
                var base4 = fidx4 / (N - 1) | 0;
                var rem4 = fidx4 - base4 * (N - 1);
                var a4 = base4 * N + rem4;
                var hA = (heights[a4] + heights[a4 + N + 1]) * 0.5;
                var t2 = (hA / MAXH + 1) * 0.5;
                var bi = Math.max(0, Math.min(buckets - 1, (t2 * (buckets - 1)) | 0));
                paths[bi].push(a4);
            }
            ctx.lineWidth = 0.9;
            var acc = PALETTES[currentPalette].accentRgb;
            for (var w2 = 0; w2 < buckets; w2++) {
                if (!paths[w2].length) continue;
                var tt = w2 / (buckets - 1);
                var li2 = Math.max(0, Math.min(lutSteps - 1, (tt * (lutSteps - 1)) | 0)) * 3;
                ctx.beginPath();
                for (var q = 0; q < paths[w2].length; q++) {
                    var a5 = paths[w2][q];
                    ctx.moveTo(sxA[a5], syA[a5]);
                    ctx.lineTo(sxA[a5 + 1], syA[a5 + 1]);
                    ctx.lineTo(sxA[a5 + N + 1], syA[a5 + N + 1]);
                    ctx.lineTo(sxA[a5 + N], syA[a5 + N]);
                    ctx.closePath();
                }
                ctx.strokeStyle = 'rgba(' + lut[li2] + ',' + lut[li2 + 1] + ',' + lut[li2 + 2] + ',0.75)';
                ctx.stroke();
            }
            // 顶点微光
            ctx.fillStyle = 'rgba(' + acc[0] + ',' + acc[1] + ',' + acc[2] + ',0.5)';
            for (var vv = 0; vv < vertCount; vv += 3) {
                ctx.fillRect(sxA[vv] - 0.7, syA[vv] - 0.7, 1.4, 1.4);
            }
        } else {
            // 点阵: 高度分桶顶点
            var buckets2 = 10;
            var dots = [];
            for (var w3 = 0; w3 < buckets2; w3++) dots.push([]);
            for (var vv2 = 0; vv2 < vertCount; vv2++) {
                var t3 = (heights[vv2] / MAXH + 1) * 0.5;
                var bi2 = Math.max(0, Math.min(buckets2 - 1, (t3 * (buckets2 - 1)) | 0));
                dots[bi2].push(vv2);
            }
            for (var w4 = 0; w4 < buckets2; w4++) {
                if (!dots[w4].length) continue;
                var tt2 = w4 / (buckets2 - 1);
                var li3 = Math.max(0, Math.min(lutSteps - 1, (tt2 * (lutSteps - 1)) | 0)) * 3;
                var fogBase = 0.55 + tt2 * 0.45;
                ctx.fillStyle = 'rgba(' + lut[li3] + ',' + lut[li3 + 1] + ',' + lut[li3 + 2] + ',' + fogBase.toFixed(2) + ')';
                var size = 1.2 + tt2 * 1.6;
                for (var q2 = 0; q2 < dots[w4].length; q2++) {
                    var vi = dots[w4][q2];
                    ctx.fillRect(sxA[vi] - size / 2, syA[vi] - size / 2, size, size);
                }
            }
        }

        renderShadowDisc();
    }

    /* 地面投影光环 (曲面下的微晶基座) */
    function renderShadowDisc() {
        var zoom = zoomBase * zoomFactor;
        var rr = (WORLD * 0.62) * (FOCAL * zoom) / DIST;
        var gx = camW / 2;
        var gy = camH / 2 + (WORLD * 0.30) * (FOCAL * zoom) / DIST * Math.cos(pitch);
        var grd = ctx.createRadialGradient(gx, gy, rr * 0.2, gx, gy, rr);
        var acc = PALETTES[currentPalette].accentRgb;
        grd.addColorStop(0, 'rgba(' + acc[0] + ',' + acc[1] + ',' + acc[2] + ',0.02)');
        grd.addColorStop(0.8, 'rgba(' + acc[0] + ',' + acc[1] + ',' + acc[2] + ',0.05)');
        grd.addColorStop(1, 'rgba(' + acc[0] + ',' + acc[1] + ',' + acc[2] + ',0)');
        ctx.save();
        ctx.translate(gx, gy);
        ctx.scale(1, Math.max(0.18, Math.abs(Math.sin(-pitch)) * 0.9 + 0.1));
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();
    }

    /* =====================================================================
       === 粒子流场背景 ===
       ===================================================================== */

    var particles = [];
    var PARTICLE_COUNT = 58;

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                sp: 0.35 + Math.random() * 0.5,
                r: 0.8 + Math.random() * 1.6,
                ph: Math.random() * Math.PI * 2
            });
        }
    }

    function renderParticles(tSec) {
        var w = pCanvas.width / (Math.min(window.devicePixelRatio || 1, 2));
        var h = pCanvas.height / (Math.min(window.devicePixelRatio || 1, 2));
        var bg = PALETTES[currentPalette].bgRgb;
        pCtx.fillStyle = 'rgba(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ',0.10)';
        pCtx.fillRect(0, 0, w, h);
        var acc = PALETTES[currentPalette].accentRgb;
        pCtx.fillStyle = 'rgba(' + acc[0] + ',' + acc[1] + ',' + acc[2] + ',0.34)';
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var ang = Math.sin(p.x * 0.0022 + tSec * 0.4 + p.ph) * 2.4
                + Math.cos(p.y * 0.0018 - tSec * 0.3) * 2.4;
            p.x += Math.cos(ang) * p.sp;
            p.y += Math.sin(ang) * p.sp;
            if (p.x < -10) p.x = w + 10;
            else if (p.x > w + 10) p.x = -10;
            if (p.y < -10) p.y = h + 10;
            else if (p.y > h + 10) p.y = -10;
            pCtx.fillRect(p.x, p.y, p.r, p.r);
        }
    }

    /* =====================================================================
       === 画布尺寸 ===
       ===================================================================== */

    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvases() {
        var rect = canvas.getBoundingClientRect();
        camW = rect.width;
        camH = rect.height;
        canvas.width = camW * dpr;
        canvas.height = camH * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        zoomBase = Math.min(camW, camH) / 640;

        pCanvas.width = window.innerWidth * dpr;
        pCanvas.height = window.innerHeight * dpr;
        pCanvas.style.width = window.innerWidth + 'px';
        pCanvas.style.height = window.innerHeight + 'px';
        pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* =====================================================================
       === 撤销 / 重做 ===
       ===================================================================== */

    function snapshot() {
        undoStack.push(targets.slice());
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack.length = 0;
        updateHistoryButtons();
    }

    function undo() {
        if (!undoStack.length) return;
        redoStack.push(targets.slice());
        var snap = undoStack.pop();
        targets.set(snap);
        updateHistoryButtons();
        showToast('已撤销上一次笔触');
        spawnRipple(camW / 2, camH / 2);
    }

    function redo() {
        if (!redoStack.length) return;
        undoStack.push(targets.slice());
        var snap = redoStack.pop();
        targets.set(snap);
        updateHistoryButtons();
        showToast('已重做笔触');
        spawnRipple(camW / 2, camH / 2);
    }

    function updateHistoryButtons() {
        btnUndo.disabled = undoStack.length === 0;
        btnRedo.disabled = redoStack.length === 0;
    }

    /* =====================================================================
       === 程序化地形 / 抚平 ===
       ===================================================================== */

    function generateTerrain(soft) {
        snapshot();
        var seed = (Math.random() * 100000) | 0;
        var amp = soft ? 0.45 : 1;
        for (var j = 0; j < N; j++) {
            for (var i = 0; i < N; i++) {
                var idx = j * N + i;
                var x = wxA[idx];
                var z = wzA[idx];
                var e = fbm(x * 0.012 + 40, z * 0.012 + 40, seed);
                // 边缘高原衰减 (中心隆起)
                var edge = 1 - Math.pow((x * x + z * z) / (WORLD * WORLD * 0.52), 1.2);
                if (edge < 0) edge = 0;
                targets[idx] = (e - 0.42) * 96 * amp * edge;
            }
        }
        spawnRipple(camW / 2, camH / 2);
        showToast(soft ? '初生地形已涌现' : '新地形已涌现 · seed ' + seed);
    }

    function flattenAll() {
        snapshot();
        targets.fill(0);
        vels.fill(0);
        spawnRipple(camW / 2, camH / 2);
        showToast('曲面已抚平');
    }

    /* =====================================================================
       === PNG 导出 ===
       ===================================================================== */

    function exportPng() {
        var out = document.createElement('canvas');
        out.width = canvas.width;
        out.height = canvas.height;
        var octx = out.getContext('2d');
        var bg = PALETTES[currentPalette].bgRgb;
        var grd = octx.createLinearGradient(0, 0, 0, out.height);
        grd.addColorStop(0, 'rgb(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ')');
        var bg2 = PALETTES[currentPalette].accentRgb;
        grd.addColorStop(1, 'rgba(' + bg2[0] + ',' + bg2[1] + ',' + bg2[2] + ',0.12)');
        octx.fillStyle = grd;
        octx.fillRect(0, 0, out.width, out.height);
        octx.drawImage(canvas, 0, 0);
        octx.font = (13 * dpr) + 'px "Share Tech Mono", monospace';
        octx.fillStyle = 'rgba(255,255,255,0.55)';
        octx.fillText('SURFACE GEO PAINTER · ' + currentPalette.toUpperCase() + ' · ' + new Date().toISOString().slice(0, 10), 18 * dpr, out.height - 18 * dpr);

        out.toBlob(function (blob) {
            if (!blob) return;
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'surface-geo-painter-' + currentPalette + '.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
            showToast('已导出 PNG 快照');
        }, 'image/png');
    }

    /* =====================================================================
       === 微交互组件: Toast / 涟漪 / 光晕 / 揭示 ===
       ===================================================================== */

    var toastTimer = null;

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove('show');
        }, 2200);
    }

    function spawnRipple(x, y) {
        var el = document.createElement('span');
        el.className = 'ripple';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        rippleLayer.appendChild(el);
        setTimeout(function () { el.remove(); }, 950);
    }

    var glowX = 0;
    var glowY = 0;
    var targetGlowX = 0;
    var targetGlowY = 0;

    function initCursorGlow() {
        window.addEventListener('pointermove', function (e) {
            targetGlowX = e.clientX;
            targetGlowY = e.clientY;
            document.body.classList.add('cursor-active');
        }, { passive: true });
        document.addEventListener('mouseleave', function () {
            document.body.classList.remove('cursor-active');
        });
    }

    function initReveal() {
        var els = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window)) {
            els.forEach(function (el) { el.classList.add('in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        els.forEach(function (el) { io.observe(el); });
    }

    /* =====================================================================
       === HUD 与遥测 ===
       ===================================================================== */

    function setHud(text, busy) {
        hudText.textContent = text;
        hudDot.classList.toggle('busy', !!busy);
    }

    var frameCount = 0;
    var fpsValue = 60;
    var fpsTime = 0;
    var telemetryTimer = 0;

    function updateTelemetry(dt) {
        telemetryTimer += dt;
        if (telemetryTimer < 0.25) return;
        telemetryTimer = 0;
        var sum = 0;
        for (var i = 0; i < vertCount; i += 7) sum += Math.abs(vels[i]);
        var energy = (sum / (vertCount / 7)) * 60;
        telEnergy.textContent = energy < 10 ? energy.toFixed(2) : energy.toFixed(1);
        telFps.textContent = String(Math.round(fpsValue));
        telMesh.textContent = vertCount + 'v';
        telMode.textContent = isOrbiting ? 'ORBIT' : BRUSH_NAMES[currentBrush];
    }

    /* =====================================================================
       === 笔刷光环预览 ===
       ===================================================================== */

    function updateBrushRing(screenX, screenY) {
        var hit = screenToWorld(screenX, screenY);
        if (!hit || isOrbiting || orbitMode || orbitHeld) {
            brushRing.classList.remove('visible');
            return;
        }
        if (hit.x < -WORLD / 2 || hit.x > WORLD / 2 || hit.z < -WORLD / 2 || hit.z > WORLD / 2) {
            brushRing.classList.remove('visible');
            return;
        }
        var y = surfaceHeightAt(hit.x, hit.z);
        var x1 = hit.x * cosYaw - hit.z * sinYaw;
        var z1 = hit.x * sinYaw + hit.z * cosYaw;
        var y1 = y * cosPitch - z1 * sinPitch;
        var z2 = y * sinPitch + z1 * cosPitch;
        var depth = z2 + DIST;
        var s = (FOCAL * zoomBase * zoomFactor) / depth;
        var sx = camW / 2 + x1 * s;
        var sy = camH / 2 - y1 * s;
        var d = brushRadius * 2 * s;
        brushRing.style.width = d + 'px';
        brushRing.style.height = d + 'px';
        brushRing.style.transform = 'translate3d(' + sx + 'px,' + sy + 'px,0) translate(-50%, -50%)';
        brushRing.classList.add('visible');
    }

    /* =====================================================================
       === 指针交互 (雕塑 / 轨道 / 缩放) ===
       ===================================================================== */

    function canvasPos(e) {
        var rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function initPointer() {
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        canvas.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            var p = canvasPos(e);
            lastPointerX = p.x;
            lastPointerY = p.y;
            var wantOrbit = e.button === 1 || e.button === 2 || orbitHeld || orbitMode;
            if (wantOrbit) {
                isOrbiting = true;
                canvas.classList.add('orbiting');
                setHud('轨道模式 · 拖拽旋转视角', true);
            } else {
                isPainting = true;
                snapshot();
                var hit = screenToWorld(p.x, p.y);
                if (hit) {
                    lastPaintWorld = null;
                    paintStroke(hit.x, hit.z, performance.now() / 1000);
                }
                spawnRipple(e.clientX, e.clientY);
                setHud('雕塑中 · ' + BRUSH_NAMES[currentBrush], true);
            }
        });

        canvas.addEventListener('pointermove', function (e) {
            var p = canvasPos(e);
            var dx = p.x - lastPointerX;
            var dy = p.y - lastPointerY;
            lastPointerX = p.x;
            lastPointerY = p.y;

            if (isOrbiting) {
                yaw += dx * 0.0052;
                pitch = Math.max(-1.42, Math.min(-0.14, pitch - dy * 0.0042));
                brushRing.classList.remove('visible');
            } else if (isPainting) {
                var hit = screenToWorld(p.x, p.y);
                if (hit) paintStroke(hit.x, hit.z, performance.now() / 1000);
            } else {
                updateBrushRing(p.x, p.y);
            }
        });

        function endPointer() {
            if (isOrbiting) {
                canvas.classList.remove('orbiting');
                setHud(spinOn ? '自转中 · 环视你的作品' : '拖拽曲面开始雕塑', false);
            }
            if (isPainting) {
                setHud(spinOn ? '自转中 · 环视你的作品' : '拖拽曲面开始雕塑', false);
            }
            isOrbiting = false;
            isPainting = false;
            lastPaintWorld = null;
        }

        canvas.addEventListener('pointerup', endPointer);
        canvas.addEventListener('pointercancel', endPointer);
        canvas.addEventListener('pointerleave', function () {
            brushRing.classList.remove('visible');
        });

        // 滚轮缩放
        canvas.addEventListener('wheel', function (e) {
            e.preventDefault();
            zoomFactor = Math.max(0.5, Math.min(2, zoomFactor * (e.deltaY < 0 ? 1.07 : 0.93)));
        }, { passive: false });
    }

    /* =====================================================================
       === 键盘交互 ===
       ===================================================================== */

    function initKeyboard() {
        var keyBrushes = ['raise', 'carve', 'smooth', 'ripple', 'spike', 'flatten'];
        window.addEventListener('keydown', function (e) {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            var k = e.key;
            if (k === ' ') {
                e.preventDefault();
                orbitHeld = true;
                brushRing.classList.remove('visible');
                return;
            }
            if (k >= '1' && k <= '6') {
                selectBrush(keyBrushes[parseInt(k, 10) - 1]);
                return;
            }
            if (k === 'z' || k === 'Z') {
                if (e.shiftKey) redo();
                else undo();
            } else if (k === 'y' || k === 'Y') {
                redo();
            } else if (k === 'r' || k === 'R') {
                generateTerrain(false);
            } else if (k === 'f' || k === 'F') {
                flattenAll();
            } else if (k === 'e' || k === 'E') {
                exportPng();
            } else if (k === 'a' || k === 'A') {
                toggleSpin();
            }
        });
        window.addEventListener('keyup', function (e) {
            if (e.key === ' ') orbitHeld = false;
        });
    }

    /* =====================================================================
       === UI 接线 ===
       ===================================================================== */

    function selectBrush(brush) {
        currentBrush = brush;
        brushButtons.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.brush === brush);
        });
        telMode.textContent = BRUSH_NAMES[brush];
        brushCounter.textContent = BRUSH_NAMES[brush];
    }

    function toggleSpin() {
        spinOn = !spinOn;
        btnSpin.classList.toggle('active', spinOn);
        btnSpin.setAttribute('aria-pressed', String(spinOn));
        showToast(spinOn ? '自转已开启' : '自转已暂停');
    }

    function initUi() {
        // 画笔
        brushButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectBrush(btn.dataset.brush);
            });
        });

        // 参数
        sliderRadius.addEventListener('input', function () {
            brushRadius = parseInt(sliderRadius.value, 10);
            valRadius.textContent = String(brushRadius);
        });
        sliderStrength.addEventListener('input', function () {
            brushStrength = parseFloat(sliderStrength.value);
            valStrength.textContent = brushStrength.toFixed(2);
        });
        sliderSym.addEventListener('input', function () {
            brushSym = parseInt(sliderSym.value, 10);
            valSym.textContent = brushSym + '×';
        });
        toggleAmbient.addEventListener('change', function () {
            ambientOn = toggleAmbient.checked;
        });

        // 视图
        segButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                renderMode = btn.dataset.render;
                segButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
            });
        });
        btnOrbit.addEventListener('click', function () {
            orbitMode = !orbitMode;
            btnOrbit.classList.toggle('active', orbitMode);
            btnOrbit.setAttribute('aria-pressed', String(orbitMode));
            if (orbitMode) {
                canvas.classList.add('orbiting');
                setHud('轨道模式 · 拖拽旋转视角', true);
            } else {
                canvas.classList.remove('orbiting');
                setHud('拖拽曲面开始雕塑', false);
            }
        });
        btnSpin.addEventListener('click', toggleSpin);

        // 动作
        btnUndo.addEventListener('click', undo);
        btnRedo.addEventListener('click', redo);
        btnRandom.addEventListener('click', function () { generateTerrain(false); });
        btnClear.addEventListener('click', flattenAll);
        btnExport.addEventListener('click', exportPng);

        // 配色
        paletteDots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                currentPalette = dot.dataset.palette;
                document.body.dataset.palette = currentPalette;
                paletteDots.forEach(function (d) { d.classList.toggle('active', d === dot); });
                buildLut();
                pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
                showToast('氛围切换 · ' + currentPalette.toUpperCase());
            });
        });
    }

    /* =====================================================================
       === 主循环 ===
       ===================================================================== */

    var lastTime = performance.now();
    var physAccum = 0;
    var PHYS_DT = 1 / 60;

    function loop(now) {
        var dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;
        var tSec = now / 1000;

        // FPS 统计
        frameCount++;
        fpsTime += dt;
        if (fpsTime >= 0.5) {
            fpsValue = frameCount / fpsTime;
            frameCount = 0;
            fpsTime = 0;
        }

        // 自转
        if (spinOn && !isOrbiting && !isPainting) {
            yaw += 0.12 * dt;
        }

        // 固定步长物理
        physAccum += dt;
        var steps = 0;
        while (physAccum >= PHYS_DT && steps < 3) {
            physicsStep(tSec);
            physAccum -= PHYS_DT;
            steps++;
        }
        if (physAccum > PHYS_DT * 3) physAccum = 0;

        // 相机 & 渲染
        updateCamera();
        renderSurface();
        renderParticles(tSec);
        updateTelemetry(dt);

        // 光标光晕惯性跟随
        glowX += (targetGlowX - glowX) * 0.12;
        glowY += (targetGlowY - glowY) * 0.12;
        cursorGlow.style.transform = 'translate3d(' + (glowX - 160) + 'px,' + (glowY - 160) + 'px,0)';

        requestAnimationFrame(loop);
    }

    /* =====================================================================
       === 启动 ===
       ===================================================================== */

    function init() {
        buildLut();
        resizeCanvases();
        initParticles();
        initCursorGlow();
        initPointer();
        initKeyboard();
        initUi();
        initReveal();
        updateHistoryButtons();

        // 初生地形 (柔化, 不计入撤销)
        generateTerrain(true);
        undoStack.length = 0;
        updateHistoryButtons();

        window.addEventListener('resize', function () {
            resizeCanvases();
        });

        requestAnimationFrame(loop);
    }

    init();
})();
