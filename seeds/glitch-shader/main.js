/* ================================================================
   GLITCH SHADER — main.js
   WebGL 片元着色器实时故障失真引擎
   6 种故障模式 · 文字纹理 · 光标扰动 · 脉冲冲击波 · 数据崩塌
   ================================================================ */

(function () {
    'use strict';

    /* ============================================================
       SECTION: CONFIG & PALETTES
       ============================================================ */
    const PALETTES = {
        acid:  { r: [255, 40, 110],  g: [198, 255, 0],   b: [0, 200, 255],   accent: [198, 255, 0]  },
        blood: { r: [255, 30, 50],   g: [255, 140, 0],   b: [200, 0, 0],     accent: [255, 61, 61]  },
        ice:   { r: [0, 220, 255],   g: [180, 255, 255], b: [140, 130, 255], accent: [110, 240, 255] },
        void:  { r: [255, 40, 180],  g: [124, 77, 255],  b: [0, 176, 255],   accent: [160, 124, 255] }
    };

    const TEX_W = 2048;
    const TEX_H = 1024;

    /* ============================================================
       SECTION: STATE
       ============================================================ */
    const state = {
        gl: null,
        program: null,
        uniforms: {},
        attribs: {},
        texture: null,
        texCanvas: null,
        texCtx: null,
        canvas: null,
        width: 0,
        height: 0,
        dpr: 1,
        text: 'GLITCH',
        mode: 'chroma',
        palette: 'acid',
        intensity: 0.55,
        chroma: 0.40,
        tear: 0.30,
        speed: 1.0,
        sizeScale: 1.0,
        mouse: { x: 0.5, y: 0.5, sx: 0, sy: 0, vx: 0, vy: 0, speed: 0, down: false },
        shocks: [],
        glitchSeed: Math.floor(Math.random() * 0xffff),
        pulseAmount: 0,
        time: 0,
        lastFrame: 0,
        fps: 60,
        fpsAccum: 0,
        fpsCount: 0,
        running: true,
        needsTextRedraw: true
    };

    /* ============================================================
       SECTION: DOM ELEMENTS
       ============================================================ */
    const dom = {};

    function cacheDom() {
        const ids = [
            'glitch-canvas', 'fallback', 'text-input', 'char-count',
            'slider-intensity', 'val-intensity',
            'slider-chroma', 'val-chroma',
            'slider-tear', 'val-tear',
            'slider-speed', 'val-speed',
            'slider-size', 'val-size',
            'btn-pulse', 'btn-random', 'btn-snapshot',
            'tele-fps', 'tele-gpu', 'tele-seed', 'tele-mode',
            'hint', 'toast'
        ];
        ids.forEach((id) => { dom[id] = document.getElementById(id); });
        dom.body = document.body;
        dom.cursorShell = document.querySelector('.cursor-shell');
        dom.modeBtns = Array.from(document.querySelectorAll('.mode-btn'));
        dom.paletteBtns = Array.from(document.querySelectorAll('.palette-btn'));
        dom.phraseBtns = Array.from(document.querySelectorAll('.phrase-btn'));
    }

    /* ============================================================
       SECTION: WEBGL SHADER SOURCES
       ============================================================ */
    const VERT_SRC = `
        attribute vec2 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 vUv;
        void main() {
            vUv = aTexCoord;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    /* Full-screen fragment shader that samples a text texture and
       applies six GPU-driven glitch modes. Uniforms:
         uTex        - text texture
         uResolution - viewport px
         uTexRes     - texture px
         uTime       - seconds
         uMouse      - 0..1 cursor position
         uMouseVel   - cursor velocity (px/frame) magnitude
         uMode       - int mode id
         uIntensity  - master glitch 0..1
         uChroma     - chromatic aberration 0..1
         uTear       - horizontal tear frequency 0..1
         uPulse      - pulse shock 0..1 (decays)
         uShocks     - vec4[8] (x,y,age,life) shockwaves in uv space
         uSeed       - per-frame random
         uRgb / uGgb / uBb - palette channel tints (vec3 0..1)
       GLSL ES 1.00 (WebGL1 compatible). */
    const FRAG_SRC = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTex;
        uniform vec2  uResolution;
        uniform vec2  uTexRes;
        uniform float uTime;
        uniform vec2  uMouse;
        uniform float uMouseVel;
        uniform int   uMode;
        uniform float uIntensity;
        uniform float uChroma;
        uniform float uTear;
        uniform float uPulse;
        uniform vec4  uShocks[8];
        uniform float uSeed;
        uniform vec3  uRb;
        uniform vec3  uGb;
        uniform vec3  uBb;

        /* hash & noise utilities */
        float hash11(float n){ return fract(sin(n) * 43758.5453123); }
        float hash12(vec2 p){
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float hash13(vec3 p){
            return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
        }
        float vnoise(vec2 p){
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash12(i);
            float b = hash12(i + vec2(1.0, 0.0));
            float c = hash12(i + vec2(0.0, 1.0));
            float d = hash12(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        /* detect if a texel is "content" (non-background) using alpha */
        float sampleAlpha(sampler2D t, vec2 uv){
            return texture2D(t, uv).a;
        }

        /* horizontal block displacement — classic glitch slice */
        float sliceOffset(vec2 uv, float seed, float freq, float amp){
            float line = floor(uv.y * (60.0 + freq * 200.0));
            float n = hash11(line + seed);
            /* only some lines jump */
            float mask = step(0.55, n);
            float dir = sign(hash11(line * 1.7 + seed * 2.0) - 0.5);
            float mag = hash11(line * 3.3 + seed * 5.0);
            return dir * mag * amp * mask;
        }

        /* shockwave displacement at a point */
        vec2 shockDisplace(vec2 uv){
            vec2 d = vec2(0.0);
            for (int i = 0; i < 8; i++){
                vec4 s = uShocks[i];
                float age = s.z;
                float life = s.w;
                if (life <= 0.001) continue;
                float t = age / life;
                if (t >= 1.0) continue;
                float radius = t * 0.7;
                float dist = distance(uv, s.xy);
                float band = smoothstep(0.06, 0.0, abs(dist - radius));
                float falloff = (1.0 - t);
                vec2 dir = normalize(uv - s.xy + vec2(0.0001));
                d += dir * band * falloff * 0.08;
            }
            return d;
        }

        void main(){
            vec2 uv = vUv;
            float t = uTime;

            /* global jitter from pulse + mouse velocity */
            float jitter = uPulse * 0.04 + min(uMouseVel * 0.0008, 0.025) * uIntensity;
            uv.x += (hash12(uv * 800.0 + t) - 0.5) * jitter;

            /* shockwave displacement */
            vec2 sdisp = shockDisplace(uv);
            uv += sdisp;

            float seed = uSeed;

            /* === mode-specific displacement === */
            int mode = uMode;

            /* CHROMA (0): RGB channel split, slices subtle */
            if (mode == 0){
                float off = sliceOffset(uv, seed * 0.3, uTear * 0.5, 0.012 * uIntensity);
                uv.x += off;
            }
            /* DATAMOSH (1): big horizontal block shuffling */
            else if (mode == 1){
                float off = sliceOffset(uv, seed, uTear, 0.18 * uIntensity);
                uv.x += off;
                /* vertical block merge */
                float block = floor(uv.y * (10.0 + uTear * 40.0));
                uv.y = mix(uv.y, hash11(block + seed) , 0.10 * uIntensity);
            }
            /* SCANLINE (2): horizontal tear lines */
            else if (mode == 2){
                float off = sliceOffset(uv, seed, uTear * 1.5, 0.06 * uIntensity);
                uv.x += off;
            }
            /* PIXEL (3): mosaic block sampling */
            else if (mode == 3){
                float psize = mix(256.0, 12.0, uIntensity);
                vec2 pq = floor(uv * psize) / psize;
                /* per-block jitter so blocks drift apart */
                float bn = hash12(pq * 50.0 + seed);
                pq.x += (bn - 0.5) * uTear * 0.1;
                uv = pq;
            }
            /* WAVE (4): sinusoidal ripple displacement */
            else if (mode == 4){
                float fy = uTime * (1.5 + uTear * 4.0);
                uv.x += sin(uv.y * 30.0 + fy) * 0.03 * uIntensity;
                uv.y += cos(uv.x * 20.0 + fy * 0.8) * 0.02 * uIntensity;
                float off = sliceOffset(uv, seed * 0.2, uTear * 0.3, 0.01 * uIntensity);
                uv.x += off;
            }
            /* STORM (5): everything combined + heavy */
            else if (mode == 5){
                float off1 = sliceOffset(uv, seed, uTear, 0.16 * uIntensity);
                float off2 = sliceOffset(uv, seed * 1.7 + 3.0, uTear * 0.8, 0.08 * uIntensity);
                uv.x += off1 + off2;
                uv.x += sin(uv.y * 40.0 + t * 6.0) * 0.015 * uIntensity;
                uv.y += sin(uv.x * 30.0 + t * 4.0) * 0.010 * uIntensity;
            }

            /* === chromatic aberration — RGB sampled at different offsets === */
            float caBase = uChroma * (0.004 + uIntensity * 0.010);
            /* mouse influences aberration direction */
            vec2 mdir = normalize(uMouse - uv + vec2(0.0001));
            float ca = caBase + uPulse * 0.02;

            vec3 col;
            if (mode == 0 || mode == 2 || mode == 4){
                /* pure channel split */
                float rA = sampleAlpha(uTex, uv + mdir * ca);
                float gA = sampleAlpha(uTex, uv);
                float bA = sampleAlpha(uTex, uv - mdir * ca);
                col = vec3(rA, gA, bA);
            } else if (mode == 5){
                /* storm: large split + jitter per channel */
                float rA = sampleAlpha(uTex, uv + mdir * ca * 2.0 + vec2(hash11(seed) * 0.01, 0.0));
                float gA = sampleAlpha(uTex, uv + vec2((hash11(seed + 1.2) - 0.5) * 0.01, 0.0));
                float bA = sampleAlpha(uTex, uv - mdir * ca * 2.0 + vec2(-hash11(seed + 2.4) * 0.01, 0.0));
                col = vec3(rA, gA, bA);
            } else {
                /* datamosh / pixel: mild split */
                float rA = sampleAlpha(uTex, uv + mdir * ca * 0.5);
                float gA = sampleAlpha(uTex, uv);
                float bA = sampleAlpha(uTex, uv - mdir * ca * 0.5);
                col = vec3(rA, gA, bA);
            }

            /* tint each channel by palette */
            float rLum = col.r;
            float gLum = col.g;
            float bLum = col.b;
            vec3 rgb = vec3(
                dot(vec3(rLum), vec3(1.0)) * uRb
              + dot(vec3(gLum), vec3(1.0)) * uGb
              + dot(vec3(bLum), vec3(1.0)) * uBb
            );
            /* The alpha mask = max channel content so empty space stays transparent */
            float mask = max(max(col.r, col.g), col.b);

            /* === additive atmosphere: glow halo around text === */
            float halo = smoothstep(0.5, 0.0, length((uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0))) * 0.0;
            rgb += halo * mask * 0.0;

            /* scanline darkening band even over empty space (subtle CRT vibe) */
            float scanBand = 0.5 + 0.5 * sin(uv.y * uResolution.y * 3.14159);
            float scanFactor = mix(1.0, 0.92 + 0.08 * scanBand, uIntensity * 0.5);

            /* vignette */
            vec2 vp = (uv - 0.5);
            float vig = 1.0 - dot(vp, vp) * 0.6;

            /* random bright slices (datamosh blocks get chroma flash) */
            float lineFlash = step(0.97, hash11(floor(uv.y * 300.0) + seed)) * uIntensity;
            rgb += lineFlash * (uRb + uGb + uBb) * 0.4 * mask;

            /* pulse flash on shockwaves */
            float pulseFlash = 0.0;
            for (int i = 0; i < 8; i++){
                vec4 s = uShocks[i];
                if (s.w <= 0.001) continue;
                float tt = s.z / s.w;
                if (tt >= 1.0) continue;
                float dist = distance(uv, s.xy);
                float radius = tt * 0.7;
                pulseFlash += smoothstep(0.08, 0.0, abs(dist - radius)) * (1.0 - tt);
            }
            rgb += pulseFlash * (uRb + uGb + uBb) * 0.5;

            rgb *= scanFactor * vig;

            gl_FragColor = vec4(rgb, mask);

            /* if mask ~0, force transparent so mesh bg shows through */
            if (mask < 0.01){
                gl_FragColor = vec4(0.0);
            }
        }
    `;

    /* ============================================================
       SECTION: WEBGL BOOTSTRAP
       ============================================================ */
    function createShader(gl, type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(sh);
            gl.deleteShader(sh);
            throw new Error('Shader compile error: ' + log);
        }
        return sh;
    }

    function createProgram(gl, vsSrc, fsSrc) {
        const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(prog);
            gl.deleteProgram(prog);
            throw new Error('Program link error: ' + log);
        }
        return prog;
    }

    function initGL() {
        const canvas = dom['glitch-canvas'];
        let gl = canvas.getContext('webgl', {
            premultipliedAlpha: false,
            alpha: true,
            antialias: false,
            preserveDrawingBuffer: true
        });
        if (!gl) gl = canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
        if (!gl) {
            showFallback();
            return false;
        }
        state.gl = gl;
        state.canvas = canvas;

        const program = createProgram(gl, VERT_SRC, FRAG_SRC);
        state.program = program;
        gl.useProgram(program);

        /* full-screen quad */
        const positions = new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1,  1,  1, -1,   1, 1
        ]);
        const texcoords = new Float32Array([
            0, 1,  1, 1,  0, 0,
            0, 0,  1, 1,  1, 0
        ]);

        const posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(program, 'aPosition');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const tcBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tcBuf);
        gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
        const aTc = gl.getAttribLocation(program, 'aTexCoord');
        gl.enableVertexAttribArray(aTc);
        gl.vertexAttribPointer(aTc, 2, gl.FLOAT, false, 0, 0);

        /* texture */
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        state.texture = tex;

        /* uniform locations */
        const U = state.uniforms;
        U.uTex        = gl.getUniformLocation(program, 'uTex');
        U.uResolution = gl.getUniformLocation(program, 'uResolution');
        U.uTexRes     = gl.getUniformLocation(program, 'uTexRes');
        U.uTime       = gl.getUniformLocation(program, 'uTime');
        U.uMouse      = gl.getUniformLocation(program, 'uMouse');
        U.uMouseVel   = gl.getUniformLocation(program, 'uMouseVel');
        U.uMode       = gl.getUniformLocation(program, 'uMode');
        U.uIntensity  = gl.getUniformLocation(program, 'uIntensity');
        U.uChroma     = gl.getUniformLocation(program, 'uChroma');
        U.uTear       = gl.getUniformLocation(program, 'uTear');
        U.uPulse      = gl.getUniformLocation(program, 'uPulse');
        U.uShocks     = gl.getUniformLocation(program, 'uShocks[0]');
        U.uSeed       = gl.getUniformLocation(program, 'uSeed');
        U.uRb         = gl.getUniformLocation(program, 'uRb');
        U.uGb         = gl.getUniformLocation(program, 'uGb');
        U.uBb         = gl.getUniformLocation(program, 'uBb');

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        /* offscreen canvas for text raster */
        state.texCanvas = document.createElement('canvas');
        state.texCanvas.width = TEX_W;
        state.texCanvas.height = TEX_H;
        state.texCtx = state.texCanvas.getContext('2d');

        resize();
        return true;
    }

    function showFallback() {
        if (dom.fallback) dom.fallback.hidden = false;
        if (dom['glitch-canvas']) dom['glitch-canvas'].style.display = 'none';
        if (dom['tele-gpu']) dom['tele-gpu'].textContent = 'N/A';
        state.running = false;
    }

    /* ============================================================
       SECTION: TEXT TEXTURE RASTER
       ============================================================ */
    function redrawTextTexture() {
        const ctx = state.texCtx;
        const W = TEX_W;
        const H = TEX_H;
        ctx.clearRect(0, 0, W, H);

        const text = state.text.trim().length ? state.text : ' ';
        /* fit font size to texture width */
        let fontSize = Math.floor(H * 0.7 * state.sizeScale);
        ctx.font = `900 ${fontSize}px Outfit, sans-serif`;
        let measured = ctx.measureText(text).width;
        const maxW = W * 0.86;
        if (measured > maxW) {
            fontSize = Math.floor(fontSize * (maxW / measured));
            ctx.font = `900 ${fontSize}px Outfit, sans-serif`;
            measured = ctx.measureText(text).width;
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        /* subtle per-letter vertical wobble for "alive" feel */
        ctx.fillText(text, W / 2, H / 2);

        /* upload to GPU */
        const gl = state.gl;
        gl.bindTexture(gl.TEXTURE_2D, state.texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.texCanvas);

        state.needsTextRedraw = false;
    }

    /* ============================================================
       SECTION: RESIZE
       ============================================================ */
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        state.dpr = dpr;
        const w = window.innerWidth;
        const h = window.innerHeight;
        state.width = w;
        state.height = h;
        if (state.canvas) {
            state.canvas.width = Math.floor(w * dpr);
            state.canvas.height = Math.floor(h * dpr);
            state.canvas.style.width = w + 'px';
            state.canvas.style.height = h + 'px';
        }
    }

    /* ============================================================
       SECTION: RENDER LOOP
       ============================================================ */
    const MODE_ID = { chroma: 0, datamosh: 1, scanline: 2, pixel: 3, wave: 4, storm: 5 };

    function render(now) {
        if (!state.running) { requestAnimationFrame(render); return; }
        const dt = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.05) : 0.016;
        state.lastFrame = now;
        state.time += dt * state.speed;

        /* fps calc */
        state.fpsAccum += dt;
        state.fpsCount += 1;
        if (state.fpsAccum >= 0.5) {
            state.fps = Math.round(state.fpsCount / state.fpsAccum);
            state.fpsAccum = 0;
            state.fpsCount = 0;
            if (dom['tele-fps']) dom['tele-fps'].textContent = state.fps;
        }

        if (state.needsTextRedraw) redrawTextTexture();

        /* mouse velocity smoothing */
        const m = state.mouse;
        m.vx = m.vx * 0.8 + (m.sx - (m.x * state.width)) * 0.2;
        m.vy = m.vy * 0.8 + (m.sy - (m.y * state.height)) * 0.2;
        m.speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        /* store screen pos for next frame delta */
        m.sx = m.x * state.width;
        m.sy = m.y * state.height;

        /* update shocks */
        let activeShocks = 0;
        for (let i = state.shocks.length - 1; i >= 0; i--) {
            const s = state.shocks[i];
            s.age += dt;
            if (s.age >= s.life) {
                state.shocks.splice(i, 1);
            } else {
                activeShocks++;
            }
        }

        /* decay pulse */
        /* fast exponential decay */
        state.pulseAmount *= Math.pow(0.001, dt);

        /* per-frame glitch seed advances with speed param */
        if (Math.random() < 0.3 * state.intensity + 0.1) {
            state.glitchSeed = Math.floor(Math.random() * 0xffff);
        }

        const gl = state.gl;
        gl.viewport(0, 0, state.canvas.width, state.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(state.program);
        const U = state.uniforms;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, state.texture);
        gl.uniform1i(U.uTex, 0);

        gl.uniform2f(U.uResolution, state.canvas.width, state.canvas.height);
        gl.uniform2f(U.uTexRes, TEX_W, TEX_H);
        gl.uniform1f(U.uTime, state.time);
        gl.uniform2f(U.uMouse, m.x, 1.0 - m.y);
        gl.uniform1f(U.uMouseVel, m.speed);
        gl.uniform1i(U.uMode, MODE_ID[state.mode] || 0);
        gl.uniform1f(U.uIntensity, state.intensity);
        gl.uniform1f(U.uChroma, state.chroma);
        gl.uniform1f(U.uTear, state.tear);
        gl.uniform1f(U.uPulse, state.pulseAmount);
        gl.uniform1f(U.uSeed, (state.glitchSeed % 1000) / 1000);

        /* pack shocks into Float32Array (8 * vec4) */
        const shockData = new Float32Array(32);
        for (let i = 0; i < 8; i++) {
            const s = state.shocks[i];
            if (s) {
                shockData[i * 4 + 0] = s.x;
                shockData[i * 4 + 1] = 1.0 - s.y;
                shockData[i * 4 + 2] = s.age;
                shockData[i * 4 + 3] = s.life;
            } else {
                shockData[i * 4 + 0] = 0;
                shockData[i * 4 + 1] = 0;
                shockData[i * 4 + 2] = 0;
                shockData[i * 4 + 3] = 0;
            }
        }
        gl.uniform4fv(U.uShocks, shockData);

        /* palette tint uniforms */
        const p = PALETTES[state.palette];
        const norm = (c) => [c[0] / 255, c[1] / 255, c[2] / 255];
        gl.uniform3fv(U.uRb, new Float32Array(norm(p.r)));
        gl.uniform3fv(U.uGb, new Float32Array(norm(p.g)));
        gl.uniform3fv(U.uBb, new Float32Array(norm(p.b)));

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        /* telemetry seed */
        if (dom['tele-seed']) {
            dom['tele-seed'].textContent = '0x' + state.glitchSeed.toString(16).padStart(4, '0').toUpperCase();
        }

        requestAnimationFrame(render);
    }

    /* ============================================================
       SECTION: SHOCKWAVES & PULSE
       ============================================================ */
    function spawnShock(xN, yN, life) {
        if (state.shocks.length >= 8) state.shocks.shift();
        state.shocks.push({
            x: xN,
            y: yN,
            age: 0,
            life: life || 0.9
        });
    }

    function triggerPulse(xN, yN, strength) {
        spawnShock(xN, yN, 0.9);
        state.pulseAmount = Math.min(1.0, state.pulseAmount + (strength || 0.7));
        /* glitch seed jump for instant "collapse" feel */
        state.glitchSeed = Math.floor(Math.random() * 0xffff);
    }

    /* ============================================================
       SECTION: INTERACTION — CURSOR
       ============================================================ */
    function bindCursor() {
        const update = (cx, cy) => {
            state.mouse.x = cx / window.innerWidth;
            state.mouse.y = cy / window.innerHeight;
            if (dom.cursorShell) {
                dom.cursorShell.style.setProperty('--cx', cx + 'px');
                dom.cursorShell.style.setProperty('--cy', cy + 'px');
            }
        };
        window.addEventListener('pointermove', (e) => update(e.clientX, e.clientY), { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (e.touches[0]) update(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        /* initial center */
        update(window.innerWidth / 2, window.innerHeight / 2);
    }

    function bindCanvas() {
        const canvas = dom['glitch-canvas'];
        const onDown = (e) => {
            state.mouse.down = true;
            dom.body.dataset.press = '1';
            const xN = e.clientX / window.innerWidth;
            const yN = e.clientY / window.innerHeight;
            triggerPulse(xN, yN, 0.8);
        };
        const onUp = () => {
            state.mouse.down = false;
            dom.body.dataset.press = '0';
        };
        canvas.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }

    /* ============================================================
       SECTION: INTERACTION — UI CONTROLS
       ============================================================ */
    function bindModeButtons() {
        dom.modeBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (!mode) return;
                state.mode = mode;
                dom.body.dataset.mode = mode;
                dom.modeBtns.forEach((b) => b.classList.toggle('active', b === btn));
                if (dom['tele-mode']) dom['tele-mode'].textContent = mode.toUpperCase();
                /* small seed shuffle for tactile feedback */
                state.glitchSeed = Math.floor(Math.random() * 0xffff);
                state.pulseAmount = Math.min(1.0, state.pulseAmount + 0.3);
            });
        });
    }

    function bindPaletteButtons() {
        dom.paletteBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const pal = btn.dataset.palette;
                if (!pal) return;
                state.palette = pal;
                dom.body.classList.remove('palette-acid', 'palette-blood', 'palette-ice', 'palette-void');
                dom.body.classList.add('palette-' + pal);
                dom.paletteBtns.forEach((b) => b.classList.toggle('active', b === btn));
            });
        });
    }

    function bindSliders() {
        const map = [
            { slider: 'slider-intensity', val: 'val-intensity', key: 'intensity', fmt: (v) => v.toFixed(2), mul: 0.01 },
            { slider: 'slider-chroma',    val: 'val-chroma',    key: 'chroma',    fmt: (v) => v.toFixed(2), mul: 0.01 },
            { slider: 'slider-tear',      val: 'val-tear',      key: 'tear',      fmt: (v) => v.toFixed(2), mul: 0.01 },
            { slider: 'slider-speed',     val: 'val-speed',     key: 'speed',     fmt: (v) => v.toFixed(2), mul: 0.01 },
            { slider: 'slider-size',      val: 'val-size',      key: 'sizeScale', fmt: (v) => v.toFixed(2), mul: 0.01, redraw: true }
        ];
        map.forEach((cfg) => {
            const el = dom[cfg.slider];
            const vEl = dom[cfg.val];
            if (!el) return;
            const apply = () => {
                const raw = parseFloat(el.value);
                const v = raw * cfg.mul;
                state[cfg.key] = v;
                if (vEl) vEl.textContent = cfg.fmt(v);
                if (cfg.redraw) state.needsTextRedraw = true;
            };
            el.addEventListener('input', apply);
            apply();
        });
    }

    function bindTextInput() {
        const input = dom['text-input'];
        const count = dom['char-count'];
        if (!input) return;
        const apply = () => {
            state.text = input.value;
            state.needsTextRedraw = true;
            if (count) count.textContent = input.value.length;
            /* typing nudges the seed for reactive glitch */
            state.glitchSeed = Math.floor(Math.random() * 0xffff);
            state.pulseAmount = Math.min(1.0, state.pulseAmount + 0.15);
        };
        input.addEventListener('input', apply);
        /* keep canvas focused after typing — clicking canvas blurs input */
        dom['glitch-canvas'].addEventListener('pointerdown', () => {
            if (input === document.activeElement) input.blur();
        });
    }

    function bindPhrases() {
        dom.phraseBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const phrase = btn.dataset.phrase || '';
                const input = dom['text-input'];
                if (!input) return;
                input.value = phrase;
                input.dispatchEvent(new Event('input'));
            });
        });
    }

    function bindActions() {
        const pulseBtn = dom['btn-pulse'];
        if (pulseBtn) {
            pulseBtn.addEventListener('click', () => {
                triggerPulse(state.mouse.x, state.mouse.y, 1.0);
            });
        }
        const randBtn = dom['btn-random'];
        if (randBtn) {
            randBtn.addEventListener('click', () => {
                const modes = Object.keys(MODE_ID);
                const pals = Object.keys(PALETTES);
                const mode = modes[Math.floor(Math.random() * modes.length)];
                const pal = pals[Math.floor(Math.random() * pals.length)];
                /* mode */
                state.mode = mode;
                dom.body.dataset.mode = mode;
                dom.modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
                if (dom['tele-mode']) dom['tele-mode'].textContent = mode.toUpperCase();
                /* palette */
                state.palette = pal;
                dom.body.classList.remove('palette-acid', 'palette-blood', 'palette-ice', 'palette-void');
                dom.body.classList.add('palette-' + pal);
                dom.paletteBtns.forEach((b) => b.classList.toggle('active', b.dataset.palette === pal));
                /* randomize params */
                state.intensity = 0.3 + Math.random() * 0.7;
                state.chroma = Math.random();
                state.tear = Math.random();
                if (dom['slider-intensity']) { dom['slider-intensity'].value = Math.round(state.intensity * 100); dom['slider-intensity'].dispatchEvent(new Event('input')); }
                if (dom['slider-chroma'])    { dom['slider-chroma'].value = Math.round(state.chroma * 100);    dom['slider-chroma'].dispatchEvent(new Event('input')); }
                if (dom['slider-tear'])      { dom['slider-tear'].value = Math.round(state.tear * 100);        dom['slider-tear'].dispatchEvent(new Event('input')); }
                triggerPulse(state.mouse.x, state.mouse.y, 1.0);
            });
        }
        const snapBtn = dom['btn-snapshot'];
        if (snapBtn) {
            snapBtn.addEventListener('click', () => {
                try {
                    const gl = state.gl;
                    /* force a fresh draw so buffer is current */
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                    gl.finish();
                    const w = state.canvas.width;
                    const h = state.canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    /* flip vertically */
                    const flip = new Uint8Array(w * h * 4);
                    for (let y = 0; y < h; y++) {
                        flip.set(pixels.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
                    }
                    const tmp = document.createElement('canvas');
                    tmp.width = w;
                    tmp.height = h;
                    const tctx = tmp.getContext('2d');
                    const imgData = tctx.createImageData(w, h);
                    imgData.data.set(flip);
                    tctx.putImageData(imgData, 0, 0);
                    const link = document.createElement('a');
                    link.download = `glitch-shader-${Date.now()}.png`;
                    link.href = tmp.toDataURL('image/png');
                    link.click();
                    showToast('截图已保存');
                } catch (err) {
                    showToast('截图失败');
                }
            });
        }
    }

    /* ============================================================
       SECTION: TOAST
       ============================================================ */
    let toastTimer = null;
    function showToast(msg) {
        const t = dom.toast;
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
    }

    /* ============================================================
       SECTION: HINT DISMISS
       ============================================================ */
    function bindHint() {
        const hint = dom.hint;
        if (!hint) return;
        const dismiss = () => hint.classList.add('hidden');
        setTimeout(dismiss, 12000);
        document.addEventListener('pointerdown', () => {
            if (!hint.classList.contains('hidden')) dismiss();
        }, { once: true });
    }

    /* ============================================================
       SECTION: KEYBOARD SHORTCUTS
       ============================================================ */
    function bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.target === dom['text-input']) return;
            const key = e.key.toLowerCase();
            const modeKeys = { '1': 'chroma', '2': 'datamosh', '3': 'scanline', '4': 'pixel', '5': 'wave', '6': 'storm' };
            if (modeKeys[key]) {
                const btn = dom.modeBtns.find((b) => b.dataset.mode === modeKeys[key]);
                if (btn) btn.click();
            } else if (key === ' ') {
                e.preventDefault();
                triggerPulse(state.mouse.x, state.mouse.y, 1.0);
            } else if (key === 'r') {
                if (dom['btn-random']) dom['btn-random'].click();
            } else if (key === 's') {
                if (dom['btn-snapshot']) dom['btn-snapshot'].click();
            }
        });
    }

    /* ============================================================
       SECTION: AUTO-PULSE (ambient life when idle)
       ============================================================ */
    function startAmbientPulse() {
        setInterval(() => {
            if (!state.running) return;
            if (state.mouse.speed < 1 && state.pulseAmount < 0.1) {
                /* occasional tiny ambient glitch blip */
                if (Math.random() < 0.35) {
                    state.pulseAmount = Math.min(1.0, state.pulseAmount + 0.12);
                    state.glitchSeed = Math.floor(Math.random() * 0xffff);
                }
            }
        }, 2500);
    }

    /* ============================================================
       SECTION: INIT
       ============================================================ */
    function init() {
        cacheDom();
        bindCursor();

        const ok = initGL();
        if (!ok) return;

        bindCanvas();
        bindModeButtons();
        bindPaletteButtons();
        bindSliders();
        bindTextInput();
        bindPhrases();
        bindActions();
        bindHint();
        bindKeyboard();

        window.addEventListener('resize', resize);

        /* initial text + draw */
        redrawTextTexture();
        requestAnimationFrame(render);
        startAmbientPulse();

        /* open with a welcoming pulse */
        setTimeout(() => triggerPulse(0.5, 0.5, 0.6), 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
