(function() {
    'use strict';

    const DOM = {
        crosswordGrid: document.getElementById('crossword-grid'),
        acrossClues: document.getElementById('across-clues'),
        downClues: document.getElementById('down-clues'),
        currentClueText: document.getElementById('current-clue-text'),
        clueDirectionIcon: document.getElementById('clue-direction-icon'),
        clueDirectionText: document.getElementById('clue-direction-text'),
        completedCount: document.getElementById('completed-count'),
        totalCount: document.getElementById('total-count'),
        hintBtn: document.getElementById('hint-btn'),
        checkBtn: document.getElementById('check-btn'),
        newBtn: document.getElementById('new-btn'),
        completionOverlay: document.getElementById('completion-overlay'),
        playAgainBtn: document.getElementById('play-again-btn')
    };

    const PUZZLES = [
        {
            grid: [
                ['D', 'E', 'S', 'I', 'G', 'N', '#', '#'],
                ['E', '#', 'O', '#', 'R', '#', 'C', '#'],
                ['P', 'U', 'L', 'S', 'A', 'R', 'O', 'D'],
                ['T', '#', 'I', '#', 'D', '#', 'D', '#'],
                ['H', 'Y', 'P', 'E', 'E', 'N', 'E', '#'],
                ['#', '#', '#', '#', 'N', '#', '#', '#'],
                ['G', 'A', 'M', 'M', 'A', '#', '#', '#'],
                ['#', '#', '#', '#', '#', '#', '#', '#']
            ],
            clues: {
                across: [
                    { number: 1, row: 0, col: 0, length: 6, clue: '创意工程的核心要素', answer: 'DESIGN' },
                    { number: 3, row: 2, col: 0, length: 6, clue: '脉冲，节奏感的象征', answer: 'PULSE' },
                    { number: 5, row: 2, col: 6, length: 2, clue: '代码的简称', answer: 'OD' },
                    { number: 7, row: 4, col: 0, length: 7, clue: '高能量状态', answer: 'HYPE' },
                    { number: 8, row: 6, col: 0, length: 5, clue: '希腊字母，辐射的象征', answer: 'GAMMA' }
                ],
                down: [
                    { number: 1, row: 0, col: 0, length: 5, clue: '心灵深处', answer: 'DEPTH' },
                    { number: 2, row: 0, col: 2, length: 4, clue: '坚实的', answer: 'SOLI' },
                    { number: 4, row: 0, col: 4, length: 6, clue: '庭院，科技园区', answer: 'GARDEN' },
                    { number: 6, row: 1, col: 6, length: 3, clue: '编程语言', answer: 'COD' }
                ]
            }
        },
        {
            grid: [
                ['A', 'U', 'R', 'A', '#', 'F', 'L', 'O'],
                ['R', '#', 'H', '#', '#', 'L', '#', 'N'],
                ['T', 'E', 'Y', 'T', 'H', 'O', '#', 'E'],
                ['#', '#', 'M', '#', '#', 'W', '#', '#'],
                ['C', 'O', 'D', 'E', '#', '#', '#', '#'],
                ['#', '#', '#', 'D', 'I', 'G', 'I', 'T'],
                ['#', '#', '#', 'G', '#', '#', '#', '#'],
                ['#', '#', '#', 'E', '#', '#', '#', '#']
            ],
            clues: {
                across: [
                    { number: 1, row: 0, col: 0, length: 4, clue: '灵韵，冥想应用名', answer: 'AURA' },
                    { number: 2, row: 0, col: 5, length: 3, clue: '流动', answer: 'FLO' },
                    { number: 4, row: 2, col: 0, length: 5, clue: '书写本', answer: 'TEYTH' },
                    { number: 6, row: 4, col: 0, length: 4, clue: '程序员的语言', answer: 'CODE' },
                    { number: 7, row: 5, col: 3, length: 5, clue: '数字', answer: 'DIGIT' }
                ],
                down: [
                    { number: 1, row: 0, col: 0, length: 3, clue: '艺术', answer: 'ART' },
                    { number: 3, row: 0, col: 2, length: 4, clue: '韵律', answer: 'RHYM' },
                    { number: 5, row: 0, col: 5, length: 3, clue: '缓慢移动', answer: 'FLOW' },
                    { number: 8, row: 0, col: 7, length: 3, clue: '一个', answer: 'ONE' },
                    { number: 9, row: 3, col: 3, length: 5, clue: '边界', answer: 'EDGE' }
                ]
            }
        },
        {
            grid: [
                ['S', 'E', 'E', 'D', '#', 'G', 'R', 'O'],
                ['P', '#', '#', 'A', '#', '#', '#', 'N'],
                ['A', 'U', 'R', 'A', '#', 'M', 'O', 'E'],
                ['R', '#', '#', 'W', '#', '#', '#', '#'],
                ['K', 'N', 'O', 'N', '#', 'C', 'O', 'R'],
                ['#', '#', '#', '#', '#', '#', '#', 'E'],
                ['B', 'L', 'O', 'O', 'M', '#', '#', 'A'],
                ['#', '#', '#', '#', '#', '#', '#', 'T']
            ],
            clues: {
                across: [
                    { number: 1, row: 0, col: 0, length: 4, clue: '数字花园的种子', answer: 'SEED' },
                    { number: 3, row: 0, col: 5, length: 3, clue: '生长', answer: 'GRO' },
                    { number: 5, row: 2, col: 0, length: 4, clue: '灵韵', answer: 'AURA' },
                    { number: 6, row: 2, col: 5, length: 2, clue: '月球的', answer: 'MO' },
                    { number: 7, row: 4, col: 0, length: 4, clue: '已知的', answer: 'KNON' },
                    { number: 8, row: 4, col: 5, length: 3, clue: '核心', answer: 'COR' },
                    { number: 9, row: 6, col: 0, length: 5, clue: '开花', answer: 'BLOOM' },
                    { number: 10, row: 6, col: 7, length: 1, clue: '吃(过去式)', answer: 'ATE' }
                ],
                down: [
                    { number: 1, row: 0, col: 0, length: 4, clue: '火花', answer: 'SPAR' },
                    { number: 2, row: 0, col: 3, length: 4, clue: '黎明', answer: 'DAWN' },
                    { number: 4, row: 0, col: 7, length: 6, clue: '创造', answer: 'GREAT' },
                    { number: 11, row: 2, col: 6, length: 1, clue: '字母O', answer: 'O' }
                ]
            }
        }
    ];

    let state = {
        currentPuzzle: null,
        grid: [],
        userAnswers: [],
        activeCell: null,
        activeDirection: 'across',
        activeClue: null,
        completedWords: new Set(),
        wordCells: new Map()
    };

    function init() {
        loadPuzzle(0);
        bindEvents();
    }

    function loadPuzzle(index) {
        const puzzle = PUZZLES[index % PUZZLES.length];
        state.currentPuzzle = puzzle;
        state.grid = puzzle.grid.map(row => [...row]);
        state.userAnswers = puzzle.grid.map(row => row.map(cell => cell === '#' ? '#' : ''));
        state.activeCell = null;
        state.activeClue = null;
        state.completedWords = new Set();
        state.wordCells = new Map();
        
        renderGrid();
        renderClues();
        updateStats();
        hideCompletion();
    }

    function renderGrid() {
        const grid = state.currentPuzzle.grid;
        const rows = grid.length;
        const cols = grid[0].length;
        
        DOM.crosswordGrid.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
        DOM.crosswordGrid.innerHTML = '';
        
        const numberMap = getNumberMap();
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                if (grid[r][c] === '#') {
                    cell.classList.add('empty');
                } else {
                    const cellKey = `${r}-${c}`;
                    const number = numberMap[cellKey];
                    
                    if (number) {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = 'cell-number';
                        numberSpan.textContent = number;
                        cell.appendChild(numberSpan);
                    }
                    
                    if (state.userAnswers[r][c]) {
                        const letterSpan = document.createElement('span');
                        letterSpan.className = 'cell-letter';
                        letterSpan.textContent = state.userAnswers[r][c];
                        cell.appendChild(letterSpan);
                    }
                }
                
                DOM.crosswordGrid.appendChild(cell);
            }
        }
    }

    function getNumberMap() {
        const map = {};
        const allClues = [
            ...state.currentPuzzle.clues.across,
            ...state.currentPuzzle.clues.down
        ];
        
        allClues.forEach(clue => {
            const key = `${clue.row}-${clue.col}`;
            if (!map[key]) {
                map[key] = clue.number;
            }
        });
        
        return map;
    }

    function renderClues() {
        renderClueList('across', state.currentPuzzle.clues.across);
        renderClueList('down', state.currentPuzzle.clues.down);
    }

    function renderClueList(direction, clues) {
        const container = direction === 'across' ? DOM.acrossClues : DOM.downClues;
        container.innerHTML = '';
        
        clues.forEach(clue => {
            const item = document.createElement('div');
            item.className = 'clue-item';
            item.dataset.number = clue.number;
            item.dataset.direction = direction;
            item.dataset.row = clue.row;
            item.dataset.col = clue.col;
            
            const numberSpan = document.createElement('span');
            numberSpan.className = 'clue-number';
            numberSpan.textContent = clue.number;
            
            const textSpan = document.createElement('span');
            textSpan.className = 'clue-text';
            textSpan.textContent = clue.clue;
            
            item.appendChild(numberSpan);
            item.appendChild(textSpan);
            container.appendChild(item);
            
            state.wordCells.set(`${direction}-${clue.number}`, getWordCells(clue, direction));
        });
    }

    function getWordCells(clue, direction) {
        const cells = [];
        const { row, col, length } = clue;
        
        for (let i = 0; i < length; i++) {
            if (direction === 'across') {
                cells.push({ row, col: col + i });
            } else {
                cells.push({ row: row + i, col });
            }
        }
        
        return cells;
    }

    function bindEvents() {
        DOM.crosswordGrid.addEventListener('click', handleCellClick);
        DOM.acrossClues.addEventListener('click', handleClueClick);
        DOM.downClues.addEventListener('click', handleClueClick);
        
        document.querySelectorAll('.clue-tab').forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });
        
        document.addEventListener('keydown', handleKeyDown);
        
        DOM.hintBtn.addEventListener('click', handleHint);
        DOM.checkBtn.addEventListener('click', handleCheck);
        DOM.newBtn.addEventListener('click', handleNewPuzzle);
        DOM.playAgainBtn.addEventListener('click', handleNewPuzzle);
    }

    function handleCellClick(e) {
        const cell = e.target.closest('.cell');
        if (!cell || cell.classList.contains('empty')) return;
        
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        
        if (state.activeCell && state.activeCell.row === row && state.activeCell.col === col) {
            toggleDirection();
        }
        
        state.activeCell = { row, col };
        updateActiveClue();
        highlightCells();
        updateCurrentClueDisplay();
    }

    function handleClueClick(e) {
        const item = e.target.closest('.clue-item');
        if (!item) return;
        
        const direction = item.dataset.direction;
        const row = parseInt(item.dataset.row, 10);
        const col = parseInt(item.dataset.col, 10);
        
        state.activeDirection = direction;
        state.activeCell = { row, col };
        updateActiveClue();
        highlightCells();
        updateCurrentClueDisplay();
        updateClueTabs();
    }

    function handleTabClick(e) {
        const tab = e.target.closest('.clue-tab');
        if (!tab) return;
        
        const direction = tab.dataset.direction;
        state.activeDirection = direction;
        
        updateClueTabs();
        
        DOM.acrossClues.classList.toggle('hidden', direction !== 'across');
        DOM.downClues.classList.toggle('hidden', direction !== 'down');
    }

    function updateClueTabs() {
        document.querySelectorAll('.clue-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.direction === state.activeDirection);
        });
    }

    function toggleDirection() {
        state.activeDirection = state.activeDirection === 'across' ? 'down' : 'across';
        updateClueTabs();
    }

    function updateActiveClue() {
        const { row, col } = state.activeCell;
        const clues = state.currentPuzzle.clues[state.activeDirection];
        
        for (const clue of clues) {
            const cells = state.wordCells.get(`${state.activeDirection}-${clue.number}`);
            const isInWord = cells.some(c => c.row === row && c.col === col);
            
            if (isInWord) {
                state.activeClue = clue;
                return;
            }
        }
    }

    function highlightCells() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('active', 'highlight');
        });
        
        document.querySelectorAll('.clue-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (!state.activeCell) return;
        
        const activeCellEl = getCellElement(state.activeCell.row, state.activeCell.col);
        if (activeCellEl) {
            activeCellEl.classList.add('active');
        }
        
        if (state.activeClue) {
            const cells = state.wordCells.get(`${state.activeDirection}-${state.activeClue.number}`);
            cells.forEach(({ row, col }) => {
                const cellEl = getCellElement(row, col);
                if (cellEl && !(row === state.activeCell.row && col === state.activeCell.col)) {
                    cellEl.classList.add('highlight');
                }
            });
            
            const clueItem = document.querySelector(
                `.clue-item[data-direction="${state.activeDirection}"][data-number="${state.activeClue.number}"]`
            );
            if (clueItem) {
                clueItem.classList.add('active');
                clueItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    function getCellElement(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }

    function updateCurrentClueDisplay() {
        if (state.activeClue) {
            DOM.currentClueText.textContent = `${state.activeClue.number}. ${state.activeClue.clue}`;
            DOM.clueDirectionIcon.textContent = state.activeDirection === 'across' ? '→' : '↓';
            DOM.clueDirectionText.textContent = state.activeDirection.toUpperCase();
        } else {
            DOM.currentClueText.textContent = '选择一个格子开始';
            DOM.clueDirectionIcon.textContent = '→';
            DOM.clueDirectionText.textContent = 'ACROSS';
        }
    }

    function handleKeyDown(e) {
        if (!state.activeCell) return;
        
        const { key } = e;
        
        if (key.match(/^[a-zA-Z]$/)) {
            e.preventDefault();
            inputLetter(key.toUpperCase());
        } else if (key === 'Backspace') {
            e.preventDefault();
            deleteLetter();
        } else if (key === 'ArrowRight') {
            e.preventDefault();
            moveCell(0, 1);
        } else if (key === 'ArrowLeft') {
            e.preventDefault();
            moveCell(0, -1);
        } else if (key === 'ArrowDown') {
            e.preventDefault();
            moveCell(1, 0);
        } else if (key === 'ArrowUp') {
            e.preventDefault();
            moveCell(-1, 0);
        } else if (key === 'Tab') {
            e.preventDefault();
            moveToNextWord(e.shiftKey);
        }
    }

    function inputLetter(letter) {
        const { row, col } = state.activeCell;
        state.userAnswers[row][col] = letter;
        
        const cellEl = getCellElement(row, col);
        if (cellEl) {
            cellEl.classList.remove('correct', 'incorrect', 'hint');
            
            let letterSpan = cellEl.querySelector('.cell-letter');
            if (!letterSpan) {
                letterSpan = document.createElement('span');
                letterSpan.className = 'cell-letter';
                cellEl.appendChild(letterSpan);
            }
            letterSpan.textContent = letter;
            letterSpan.style.animation = 'none';
            letterSpan.offsetHeight;
            letterSpan.style.animation = 'letterReveal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        }
        
        moveToNextCell();
        checkWordCompletion();
    }

    function deleteLetter() {
        const { row, col } = state.activeCell;
        
        if (state.userAnswers[row][col]) {
            state.userAnswers[row][col] = '';
            
            const cellEl = getCellElement(row, col);
            if (cellEl) {
                cellEl.classList.remove('correct', 'incorrect', 'hint');
                const letterSpan = cellEl.querySelector('.cell-letter');
                if (letterSpan) {
                    letterSpan.remove();
                }
            }
        } else {
            moveToPrevCell();
            deleteLetter();
        }
    }

    function moveToNextCell() {
        if (!state.activeClue) return;
        
        const { row, col } = state.activeCell;
        let newRow = row;
        let newCol = col;
        
        if (state.activeDirection === 'across') {
            newCol += 1;
        } else {
            newRow += 1;
        }
        
        if (isValidCell(newRow, newCol)) {
            state.activeCell = { row: newRow, col: newCol };
            highlightCells();
            updateCurrentClueDisplay();
        }
    }

    function moveToPrevCell() {
        if (!state.activeClue) return;
        
        const { row, col } = state.activeCell;
        let newRow = row;
        let newCol = col;
        
        if (state.activeDirection === 'across') {
            newCol -= 1;
        } else {
            newRow -= 1;
        }
        
        if (isValidCell(newRow, newCol)) {
            state.activeCell = { row: newRow, col: newCol };
            highlightCells();
            updateCurrentClueDisplay();
        }
    }

    function moveCell(rowDelta, colDelta) {
        const { row, col } = state.activeCell;
        const newRow = row + rowDelta;
        const newCol = col + colDelta;
        
        if (isValidCell(newRow, newCol)) {
            state.activeCell = { row: newRow, col: newCol };
            updateActiveClue();
            highlightCells();
            updateCurrentClueDisplay();
        }
    }

    function moveToNextWord(reverse = false) {
        const clues = state.currentPuzzle.clues[state.activeDirection];
        const currentIndex = state.activeClue 
            ? clues.findIndex(c => c.number === state.activeClue.number)
            : -1;
        
        let nextIndex;
        if (reverse) {
            nextIndex = currentIndex <= 0 ? clues.length - 1 : currentIndex - 1;
        } else {
            nextIndex = currentIndex >= clues.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextClue = clues[nextIndex];
        state.activeClue = nextClue;
        state.activeCell = { row: nextClue.row, col: nextClue.col };
        highlightCells();
        updateCurrentClueDisplay();
    }

    function isValidCell(row, col) {
        const grid = state.currentPuzzle.grid;
        return (
            row >= 0 && 
            row < grid.length && 
            col >= 0 && 
            col < grid[0].length && 
            grid[row][col] !== '#'
        );
    }

    function checkWordCompletion() {
        const allClues = [
            ...state.currentPuzzle.clues.across.map(c => ({ ...c, direction: 'across' })),
            ...state.currentPuzzle.clues.down.map(c => ({ ...c, direction: 'down' }))
        ];
        
        allClues.forEach(clue => {
            const cells = state.wordCells.get(`${clue.direction}-${clue.number}`);
            const wordKey = `${clue.direction}-${clue.number}`;
            
            let isComplete = true;
            let isCorrect = true;
            
            cells.forEach(({ row, col }) => {
                const userLetter = state.userAnswers[row][col];
                const correctLetter = state.currentPuzzle.grid[row][col];
                
                if (!userLetter) {
                    isComplete = false;
                    isCorrect = false;
                } else if (userLetter !== correctLetter) {
                    isCorrect = false;
                }
            });
            
            const clueItem = document.querySelector(
                `.clue-item[data-direction="${clue.direction}"][data-number="${clue.number}"]`
            );
            
            if (isComplete && isCorrect) {
                state.completedWords.add(wordKey);
                if (clueItem) clueItem.classList.add('completed');
            } else {
                state.completedWords.delete(wordKey);
                if (clueItem) clueItem.classList.remove('completed');
            }
        });
        
        updateStats();
        
        const totalWords = allClues.length;
        if (state.completedWords.size === totalWords) {
            setTimeout(showCompletion, 500);
        }
    }

    function updateStats() {
        const allClues = [
            ...state.currentPuzzle.clues.across,
            ...state.currentPuzzle.clues.down
        ];
        
        DOM.completedCount.textContent = state.completedWords.size;
        DOM.totalCount.textContent = allClues.length;
    }

    function handleHint() {
        if (!state.activeClue) return;
        
        const cells = state.wordCells.get(`${state.activeDirection}-${state.activeClue.number}`);
        const { row, col } = state.activeCell;
        
        for (const cell of cells) {
            if (cell.row >= row && cell.col >= col) {
                const correctLetter = state.currentPuzzle.grid[cell.row][cell.col];
                const userLetter = state.userAnswers[cell.row][cell.col];
                
                if (userLetter !== correctLetter) {
                    state.userAnswers[cell.row][cell.col] = correctLetter;
                    
                    const cellEl = getCellElement(cell.row, cell.col);
                    if (cellEl) {
                        cellEl.classList.add('hint');
                        
                        let letterSpan = cellEl.querySelector('.cell-letter');
                        if (!letterSpan) {
                            letterSpan = document.createElement('span');
                            letterSpan.className = 'cell-letter';
                            cellEl.appendChild(letterSpan);
                        }
                        letterSpan.textContent = correctLetter;
                        letterSpan.style.animation = 'none';
                        letterSpan.offsetHeight;
                        letterSpan.style.animation = 'letterReveal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                    }
                    
                    break;
                }
            }
        }
        
        checkWordCompletion();
    }

    function handleCheck() {
        const grid = state.currentPuzzle.grid;
        let hasError = false;
        
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[0].length; c++) {
                if (grid[r][c] === '#') continue;
                
                const cellEl = getCellElement(r, c);
                const userLetter = state.userAnswers[r][c];
                const correctLetter = grid[r][c];
                
                if (userLetter) {
                    if (userLetter === correctLetter) {
                        cellEl.classList.remove('incorrect', 'hint');
                        cellEl.classList.add('correct');
                    } else {
                        cellEl.classList.remove('correct', 'hint');
                        cellEl.classList.add('incorrect');
                        hasError = true;
                    }
                }
            }
        }
        
        if (!hasError) {
            checkWordCompletion();
        }
    }

    function handleNewPuzzle() {
        const currentIndex = PUZZLES.indexOf(state.currentPuzzle);
        loadPuzzle(currentIndex + 1);
    }

    function showCompletion() {
        DOM.completionOverlay.classList.add('show');
    }

    function hideCompletion() {
        DOM.completionOverlay.classList.remove('show');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
