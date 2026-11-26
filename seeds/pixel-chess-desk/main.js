/* ============================================================
   Pixel Chess Desk 像素棋桌 — 交互逻辑
   模块：像素精灵渲染 / 国际象棋引擎 / FLIP 落子动效 / 粒子特效
   ============================================================ */

// === 常量与像素精灵 ===
const FILES = 'abcdefgh';
const PIECE_NAMES = { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' };
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const SPRITES = {
  p: ['........', '........', '..###...', '..###...', '.#####..', '.#####..', '........', '########'],
  r: ['#..##..#', '#..##..#', '########', '.######.', '.######.', '.######.', '.######.', '########'],
  n: ['....##..', '...####.', '..#####.', '.##.###.', '######..', '.#####..', '.######.', '########'],
  b: ['...##...', '..####..', '.##..##.', '.######.', '.######.', '..####..', '.######.', '########'],
  q: ['#..##..#', '#.#..#.#', '########', '.######.', '.######.', '.######.', '.######.', '########'],
  k: ['...##...', '#.####.#', '#.####.#', '########', '.######.', '.######.', '.######.', '########']
};

let spriteCache = {};
function pieceSprite(type, color) {
  const key = type + color;
  if (spriteCache[key]) return spriteCache[key].cloneNode ? makeSpriteCanvas(type, color) : null;
  return makeSpriteCanvas(type, color);
}
function makeSpriteCanvas(type, color) {
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 8;
  const ctx = cv.getContext('2d');
  const grid = SPRITES[type];
  const fill = color === 'w' ? getCSS('--pc-white') : getCSS('--pc-black');
  const edge = color === 'w' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.5)';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (grid[y][x] === '#') {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // 描边像素：棋子边缘一圈，增强可读性
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (grid[y][x] !== '#') continue;
      const neighborEmpty = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx < 0 || nx > 7 || ny < 0 || ny > 7 || grid[ny][nx] !== '#';
      });
      if (neighborEmpty) {
        ctx.fillStyle = edge;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return cv;
}
function getCSS(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }

// === 棋引擎 ===
function initialState() {
  const board = new Array(64).fill(null);
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let i = 0; i < 8; i++) {
    board[i] = { t: back[i], c: 'b' };
    board[8 + i] = { t: 'p', c: 'b' };
    board[48 + i] = { t: 'p', c: 'w' };
    board[56 + i] = { t: back[i], c: 'w' };
  }
  return {
    board, turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    ep: null, halfmove: 0, fullmove: 1
  };
}

const rc = (r, c) => r * 8 + c;
const rowOf = i => i >> 3, colOf = i => i & 7;
const inBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const other = c => (c === 'w' ? 'b' : 'w');

function pseudoMoves(state, idx) {
  const p = state.board[idx];
  if (!p) return [];
  const moves = [];
  const r = rowOf(idx), c = colOf(idx);
  const push = (tr, tc, flag) => moves.push({ from: idx, to: rc(tr, tc), flag });

  if (p.t === 'p') {
    const dir = p.c === 'w' ? -1 : 1;
    const startRow = p.c === 'w' ? 6 : 1;
    if (inBoard(r + dir, c) && !state.board[rc(r + dir, c)]) {
      push(r + dir, c);
      if (r === startRow && !state.board[rc(r + 2 * dir, c)]) push(r + 2 * dir, c, 'double');
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir, tc = c + dc;
      if (!inBoard(tr, tc)) continue;
      const target = state.board[rc(tr, tc)];
      if (target && target.c !== p.c) push(tr, tc);
      else if (rc(tr, tc) === state.ep) push(tr, tc, 'ep');
    }
    return moves;
  }

  const rays = {
    n: [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]],
    b: [[1,1],[1,-1],[-1,1],[-1,-1]],
    r: [[1,0],[-1,0],[0,1],[0,-1]],
    q: [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]
  };
  if (p.t === 'n' || p.t === 'k') {
    for (const [dr, dc] of rays[p.t === 'n' ? 'n' : 'q']) {
      const tr = r + dr, tc = c + dc;
      if (!inBoard(tr, tc)) continue;
      const target = state.board[rc(tr, tc)];
      if (!target || target.c !== p.c) push(tr, tc);
    }
    // 王车易位
    if (p.t === 'k') {
      const home = p.c === 'w' ? 7 : 0;
      if (r === home && c === 4 && !isAttacked(state, idx, other(p.c))) {
        const kSide = p.c === 'w' ? state.castling.wK : state.castling.bK;
        const qSide = p.c === 'w' ? state.castling.wQ : state.castling.bQ;
        if (kSide && !state.board[rc(home,5)] && !state.board[rc(home,6)] &&
            !isAttacked(state, rc(home,5), other(p.c)) && !isAttacked(state, rc(home,6), other(p.c)) &&
            state.board[rc(home,7)] && state.board[rc(home,7)].t === 'r') {
          push(home, 6, 'castleK');
        }
        if (qSide && !state.board[rc(home,1)] && !state.board[rc(home,2)] && !state.board[rc(home,3)] &&
            !isAttacked(state, rc(home,3), other(p.c)) && !isAttacked(state, rc(home,2), other(p.c)) &&
            state.board[rc(home,0)] && state.board[rc(home,0)].t === 'r') {
          push(home, 2, 'castleQ');
        }
      }
    }
    return moves;
  }

  for (const [dr, dc] of rays[p.t]) {
    let tr = r + dr, tc = c + dc;
    while (inBoard(tr, tc)) {
      const target = state.board[rc(tr, tc)];
      if (!target) push(tr, tc);
      else { if (target.c !== p.c) push(tr, tc); break; }
      tr += dr; tc += dc;
    }
  }
  return moves;
}

function isAttacked(state, idx, byColor) {
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (!p || p.c !== byColor || p.t === 'k') continue;
    for (const m of pseudoMoves(state, i)) {
      if (m.to === idx) return true;
    }
  }
  // 王的邻格（防止王互贴）
  const r = rowOf(idx), c = colOf(idx);
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.c === byColor && p.t === 'k') {
      if (Math.abs(rowOf(i) - r) <= 1 && Math.abs(colOf(i) - c) <= 1) return true;
    }
  }
  return false;
}

function kingIndex(state, color) {
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.t === 'k' && p.c === color) return i;
  }
  return -1;
}

function legalMoves(state, idx) {
  const p = state.board[idx];
  if (!p || p.c !== state.turn) return [];
  return pseudoMoves(state, idx).filter(m => {
    const next = applyMove(cloneState(state), m);
    return !isAttacked(next, kingIndex(next, p.c), other(p.c));
  });
}

function allLegalMoves(state) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.c === state.turn) out.push(...legalMoves(state, i));
  }
  return out;
}

function cloneState(s) {
  return {
    board: s.board.map(p => (p ? { t: p.t, c: p.c } : null)),
    turn: s.turn,
    castling: { ...s.castling },
    ep: s.ep, halfmove: s.halfmove, fullmove: s.fullmove
  };
}

function applyMove(state, m) {
  const p = state.board[m.from];
  const captured = state.board[m.to];
  state.board[m.to] = p;
  state.board[m.from] = null;

  if (m.flag === 'ep') {
    const capRow = rowOf(m.from);
    state.board[rc(capRow, colOf(m.to))] = null;
  }
  if (m.flag === 'castleK') {
    const home = rowOf(m.from);
    state.board[rc(home, 5)] = state.board[rc(home, 7)];
    state.board[rc(home, 7)] = null;
  }
  if (m.flag === 'castleQ') {
    const home = rowOf(m.from);
    state.board[rc(home, 3)] = state.board[rc(home, 0)];
    state.board[rc(home, 0)] = null;
  }
  // 升变
  if (p.t === 'p' && (rowOf(m.to) === 0 || rowOf(m.to) === 7)) {
    state.board[m.to] = { t: 'q', c: p.c };
  }
  // 易位权
  if (p.t === 'k') {
    if (p.c === 'w') { state.castling.wK = false; state.castling.wQ = false; }
    else { state.castling.bK = false; state.castling.bQ = false; }
  }
  if (m.from === rc(7,0) || m.to === rc(7,0)) state.castling.wQ = false;
  if (m.from === rc(7,7) || m.to === rc(7,7)) state.castling.wK = false;
  if (m.from === rc(0,0) || m.to === rc(0,0)) state.castling.bQ = false;
  if (m.from === rc(0,7) || m.to === rc(0,7)) state.castling.bK = false;

  state.ep = m.flag === 'double' ? rc((rowOf(m.from) + rowOf(m.to)) / 2, colOf(m.from)) : null;
  state.halfmove = (p.t === 'p' || captured) ? 0 : state.halfmove + 1;
  if (state.turn === 'b') state.fullmove++;
  state.turn = other(state.turn);
  return { state, captured };
}

function squareName(i) { return FILES[colOf(i)] + (8 - rowOf(i)); }
function notate(state, m, result) {
  const p = state.board[m.from];
  let s = '';
  if (m.flag === 'castleK') s = 'O-O';
  else if (m.flag === 'castleQ') s = 'O-O-O';
  else {
    s = (p.t === 'p' ? '' : p.t.toUpperCase()) + squareName(m.from);
    const cap = state.board[m.to] || m.flag === 'ep';
    s += (cap ? 'x' : '-') + squareName(m.to);
    if (m.flag === 'promo' || (p.t === 'p' && (rowOf(m.to) === 0 || rowOf(m.to) === 7))) s += '=Q';
  }
  if (result === 'checkmate') s += '#';
  else if (result === 'check') s += '+';
  return s;
}

function gameStatus(state) {
  const moves = allLegalMoves(state);
  const inCheck = isAttacked(state, kingIndex(state, state.turn), other(state.turn));
  if (moves.length === 0) return inCheck ? 'checkmate' : 'stalemate';
  if (state.halfmove >= 100) return 'draw';
  return inCheck ? 'check' : 'ongoing';
}

// === 简易 AI（贪心 + 随机） ===
function aiMove(state) {
  const moves = allLegalMoves(state);
  if (!moves.length) return null;
  let best = -Infinity, pool = [];
  for (const m of moves) {
    const target = state.board[m.to];
    let score = target ? PIECE_VALUE[target.t] * 10 : 0;
    if (m.flag === 'ep') score += 10;
    const next = applyMove(cloneState(state), m).state;
    const st = gameStatus(next);
    if (st === 'checkmate') score += 1000;
    else if (st === 'check') score += 3;
    // 避免送子：检查对方是否能立即吃回
    for (const om of allLegalMoves(next)) {
      if (om.to === m.to) score -= PIECE_VALUE[state.board[m.from].t] * 8;
    }
    score += Math.random() * 2;
    if (score > best + 0.01) { best = score; pool = [m]; }
    else if (Math.abs(score - best) <= 0.01) pool.push(m);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// === DOM Elements ===
const boardEl = document.getElementById('board');
const moveLogEl = document.getElementById('move-log');
const logEmptyEl = document.getElementById('log-empty');
const turnTextEl = document.getElementById('turn-text');
const turnIndEl = document.getElementById('turn-indicator');
const statusSubEl = document.getElementById('status-sub');
const captionEl = document.getElementById('board-caption');
const fxLayer = document.createElement('div');
fxLayer.className = 'fx-layer';
document.body.appendChild(fxLayer);

// === 应用状态 ===
let state = initialState();
let selected = null;
let hintMap = new Map();
let history = [];   // { state, notation, move }
let capturedList = { w: [], b: [] };
let vsAI = false;
let aiThinking = false;
let lastMove = null;

// === 棋盘构建 ===
function buildBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 64; i++) {
    const sq = document.createElement('div');
    const r = rowOf(i), c = colOf(i);
    sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
    sq.dataset.idx = i;
    sq.addEventListener('click', () => onSquareClick(i));
    boardEl.appendChild(sq);
  }
  const left = document.getElementById('coords-left');
  const bottom = document.getElementById('coords-bottom');
  for (let i = 0; i < 8; i++) {
    const fl = document.createElement('span'); fl.textContent = 8 - i; left.appendChild(fl);
    const fb = document.createElement('span'); fb.textContent = FILES[i]; bottom.appendChild(fb);
  }
}

function squareAt(i) { return boardEl.children[i]; }

function renderPieces(animateFrom) {
  // 清除旧棋子（保留格子）
  for (let i = 0; i < 64; i++) {
    const sq = squareAt(i);
    sq.querySelectorAll('.piece').forEach(n => n.remove());
    sq.classList.remove('selected', 'in-check');
    const old = sq.querySelector('.hint-dot, .hint-ring, .move-ripple');
    if (old) old.remove();
  }
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (!p) continue;
    const piece = document.createElement('div');
    piece.className = 'piece';
    const cv = makeSpriteCanvas(p.t, p.c);
    cv.style.width = '100%'; cv.style.height = '100%';
    piece.appendChild(cv);
    if (animateFrom !== undefined && i === animateFrom.to && animateFrom.piece === p.t + p.c) {
      // FLIP 动画：从原格位移滑入
      const fromRect = squareAt(animateFrom.from).getBoundingClientRect();
      const toRect = squareAt(i).getBoundingClientRect();
      const dx = fromRect.left - toRect.left, dy = fromRect.top - toRect.top;
      piece.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        piece.style.transform = 'translate(0, 0)';
        spawnRipple(i);
      }));
    }
    squareAt(i).appendChild(piece);
  }
  // 上一步高亮
  if (lastMove) {
    squareAt(lastMove.from).classList.add('last-move');
    squareAt(lastMove.to).classList.add('last-move');
  }
  // 将军高亮
  if (gameStatus(state) === 'check' || gameStatus(state) === 'checkmate') {
    const ki = kingIndex(state, state.turn);
    if (ki >= 0) squareAt(ki).classList.add('in-check');
  }
}

function spawnRipple(i) {
  const sq = squareAt(i);
  const rp = document.createElement('div');
  rp.className = 'move-ripple';
  rp.style.borderRadius = '0';
  sq.appendChild(rp);
  setTimeout(() => rp.remove(), 800);
}

function showHints(idx) {
  clearHints();
  selected = idx;
  squareAt(idx).classList.add('selected');
  const piece = squareAt(idx).querySelector('.piece');
  if (piece) piece.classList.add('lift');
  for (const m of hintMap.get(idx) || []) {
    const sq = squareAt(m.to);
    const el = document.createElement('div');
    const isCapture = state.board[m.to] || m.flag === 'ep';
    el.className = isCapture ? 'hint-ring' : 'hint-dot';
    sq.appendChild(el);
  }
}
function clearHints() {
  if (selected !== null) {
    squareAt(selected).classList.remove('selected');
    const piece = squareAt(selected).querySelector('.piece');
    if (piece) piece.classList.remove('lift');
  }
  selected = null;
  document.querySelectorAll('.hint-dot, .hint-ring').forEach(n => n.remove());
}

// === 交互 ===
function onSquareClick(idx) {
  if (aiThinking) return;
  if (vsAI && state.turn === 'b') return;
  const p = state.board[idx];

  if (selected !== null) {
    const moves = hintMap.get(selected) || [];
    const mv = moves.find(m => m.to === idx);
    if (mv) { commitMove(mv); return; }
  }
  clearHints();
  if (p && p.c === state.turn) {
    const lm = legalMoves(state, idx);
    if (lm.length) {
      hintMap.set(idx, lm);
      showHints(idx);
    } else {
      flashStatus('此子暂无合法着法');
    }
  }
}

function commitMove(mv) {
  const mover = state.board[mv.from];
  const preState = cloneState(state);
  const { state: next, captured } = applyMove(state, mv);
  state = next;
  const st = gameStatus(state);
  const notation = notate(preState, mv, st === 'checkmate' ? 'checkmate' : (st === 'check' ? 'check' : null));
  if (captured) {
    capturedList[other(captured.c)].push(captured);
    spawnCaptureBurst(mv.to);
  }
  history.push({ state: preState, notation, move: mv, capturedList: JSON.parse(JSON.stringify(capturedList)) });
  lastMove = mv;
  clearHints();
  renderPieces({ from: mv.from, to: mv.to, piece: mover.t + mover.c });
  renderLog();
  renderStatus(st);
  renderTrays();

  if (st === 'checkmate') return showGameOver(`${state.turn === 'w' ? '黑方' : '白方'}胜 · 将杀`);
  if (st === 'stalemate') return showGameOver('和棋 · 逼和');
  if (st === 'draw') return showGameOver('和棋 · 五十步');

  if (vsAI && state.turn === 'b') {
    aiThinking = true;
    flashStatus('桌面 AI 思考中…');
    setTimeout(() => {
      const ai = aiMove(state);
      aiThinking = false;
      if (ai) commitMove(ai);
    }, 550 + Math.random() * 450);
  }
}

// === 侧栏渲染 ===
function renderStatus(st) {
  const white = state.turn === 'w';
  turnTextEl.textContent = white ? '白方行棋' : '黑方行棋';
  turnIndEl.classList.toggle('black', !white);
  const map = {
    ongoing: 'READY — 对局进行中',
    check: 'CHECK — ' + (white ? '白方被将军！' : '黑方被将军！'),
    checkmate: 'MATE — 将杀',
    stalemate: 'STALEMATE — 逼和',
    draw: 'DRAW — 和棋'
  };
  statusSubEl.textContent = map[st] || map.ongoing;
  statusSubEl.classList.toggle('alert', st === 'check');
}

function flashStatus(msg) {
  statusSubEl.textContent = msg;
  statusSubEl.classList.add('alert');
  setTimeout(() => { renderStatus(gameStatus(state)); }, 1400);
}

function renderLog() {
  moveLogEl.innerHTML = '';
  history.forEach((h, i) => {
    if (i % 2 === 0) {
      const num = document.createElement('span');
      num.className = 'mv-num';
      num.textContent = (i / 2 + 1) + '.';
      moveLogEl.appendChild(num);
    }
    const mv = document.createElement('span');
    mv.className = 'mv';
    mv.textContent = h.notation;
    moveLogEl.appendChild(mv);
  });
  moveLogEl.parentElement.classList.add('has-moves');
  moveLogEl.scrollTop = moveLogEl.scrollHeight;
}

function renderTrays() {
  for (const color of ['w', 'b']) {
    const el = document.getElementById(color === 'w' ? 'captured-by-white' : 'captured-by-black');
    el.innerHTML = '';
    for (const p of capturedList[color]) {
      const cv = makeSpriteCanvas(p.t, p.c);
      cv.style.width = '26px'; cv.style.height = '26px';
      el.appendChild(cv);
    }
  }
}

// === 捕获粒子 ===
function spawnCaptureBurst(idx) {
  const rect = squareAt(idx).getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const accent = getCSS('--accent');
  for (let i = 0; i < 26; i++) {
    const dot = document.createElement('div');
    const size = 3 + Math.random() * 5;
    dot.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${Math.random() > 0.4 ? accent : '#fff'};z-index:55;pointer-events:none;image-rendering:pixelated;box-shadow:0 0 8px ${accent};`;
    fxLayer.appendChild(dot);
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 110;
    dot.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(angle) * dist - size / 2}px, ${Math.sin(angle) * dist + 30}px) scale(0.2)`, opacity: 0 }
    ], { duration: 600 + Math.random() * 400, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' })
      .onfinish = () => dot.remove();
  }
}

// === 终局 ===
function showGameOver(text) {
  let toast = document.querySelector('.gameover-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'gameover-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<h2>${text}</h2><p>GAME OVER — 点击「重开」再来一局</p>`;
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => toast.classList.remove('show'), 3400);
}

// === 控制按钮 ===
document.getElementById('btn-mode').addEventListener('click', e => {
  vsAI = !vsAI;
  e.currentTarget.textContent = vsAI ? '模式：人机对弈' : '模式：双人对弈';
  updateCaption();
  flashStatus(vsAI ? '你执白，AI 执黑' : '双人对弈模式');
});

document.getElementById('btn-undo').addEventListener('click', () => {
  if (aiThinking) return;
  const steps = (vsAI && history.length >= 2 && state.turn === 'w') ? 2 : 1;
  for (let i = 0; i < steps && history.length; i++) {
    const h = history.pop();
    state = h.state;
    capturedList = h.capturedList;
    lastMove = null;
  }
  clearHints();
  renderPieces();
  renderLog();
  renderStatus(gameStatus(state));
  renderTrays();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  state = initialState();
  history = [];
  capturedList = { w: [], b: [] };
  lastMove = null;
  aiThinking = false;
  clearHints();
  renderPieces();
  renderLog();
  moveLogEl.parentElement.classList.remove('has-moves');
  renderStatus('ongoing');
  renderTrays();
  flashStatus('NEW GAME — 新对局开始');
});

document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    document.body.dataset.palette = sw.dataset.palette;
    setTimeout(() => renderPieces(), 380); // 配色过渡后重绘棋子
    updateCaption();
  });
});

function updateCaption() {
  captionEl.textContent = `MODE: ${vsAI ? 'VS-AI' : '2P'} · PALETTE: ${document.body.dataset.palette.toUpperCase()}`;
}

// === 背景尘埃粒子 ===
const ambientCv = document.getElementById('ambient-canvas');
const actx = ambientCv.getContext('2d');
let dust = [];
function resizeAmbient() {
  ambientCv.width = innerWidth; ambientCv.height = innerHeight;
  dust = Array.from({ length: 46 }, () => ({
    x: Math.random() * ambientCv.width,
    y: Math.random() * ambientCv.height,
    vx: (Math.random() - 0.5) * 0.25,
    vy: -0.1 - Math.random() * 0.3,
    s: 1 + Math.random() * 2.4,
    a: 0.08 + Math.random() * 0.22
  }));
}
resizeAmbient();
addEventListener('resize', resizeAmbient);
(function tickDust() {
  actx.clearRect(0, 0, ambientCv.width, ambientCv.height);
  const accent = getCSS('--accent');
  for (const d of dust) {
    d.x += d.vx; d.y += d.vy;
    if (d.y < -6) { d.y = ambientCv.height + 6; d.x = Math.random() * ambientCv.width; }
    if (d.x < -6) d.x = ambientCv.width + 6;
    if (d.x > ambientCv.width + 6) d.x = -6;
    actx.globalAlpha = d.a;
    actx.fillStyle = accent;
    actx.fillRect(d.x, d.y, d.s, d.s);
  }
  actx.globalAlpha = 1;
  requestAnimationFrame(tickDust);
})();

// === 启动 ===
buildBoard();
renderPieces();
renderStatus('ongoing');
updateCaption();
