/**
 * Cyber Paint - 交互逻辑与网格管理
 */

document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const coordXEl = document.getElementById('coord-x');
    const coordYEl = document.getElementById('coord-y');
    const colorBtns = document.querySelectorAll('.color-btn');
    const modeToggle = document.getElementById('mode-toggle');
    const btnClear = document.getElementById('btn-clear');
    
    let isDrawing = false;
    let currentColor = '#0ff'; // 默认青色
    let cells = [];

    // =========================================================================
    // 动态网格细胞生成
    // =========================================================================
    
    function initGrid() {
        gridContainer.innerHTML = '';
        cells = [];
        
        // 计算当前容器能容纳多少个格子
        const containerWidth = gridContainer.clientWidth;
        const containerHeight = gridContainer.clientHeight;
        
        // CSS 中定义的常量
        const cellSize = 40; 
        const gapSize = 1;

        const cols = Math.ceil(containerWidth / (cellSize + gapSize));
        const rows = Math.ceil(containerHeight / (cellSize + gapSize));
        
        const totalCells = cols * rows;

        // 为避免一次性 DOM 插入太多卡顿，使用 DocumentFragment
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            // 将 DOM 绑定对应事件
            cell.addEventListener('mousedown', (e) => startPaint(e, cell));
            cell.addEventListener('mouseenter', (e) => paintCell(e, cell));
            // 防止默认拖拽行为
            cell.addEventListener('dragstart', (e) => e.preventDefault());
            
            fragment.appendChild(cell);
            cells.push(cell);
        }
        
        gridContainer.appendChild(fragment);
    }

    // 初始化时生成，且窗口缩放时重置（简单处理）
    initGrid();
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initGrid, 200);
    });

    // =========================================================================
    // 绘图逻辑
    // =========================================================================

    // 全局鼠标按下判断
    gridContainer.addEventListener('mousedown', () => { isDrawing = true; });
    document.addEventListener('mouseup', () => { isDrawing = false; });
    // 鼠标离开页面范围也停止绘制
    document.addEventListener('mouseleave', () => { isDrawing = false; });

    function startPaint(e, cell) {
        // e.preventDefault(); // 可以防止意外选中文字
        isDrawing = true;
        applyColor(cell);
    }

    function paintCell(e, cell) {
        if (!isDrawing) return;
        applyColor(cell);
    }

    function applyColor(cell) {
        // 判断当前是绘制模式还是擦除模式
        const isPaintMode = modeToggle.checked;

        if (isPaintMode) {
            cell.classList.add('painted');
            // 覆盖局部单独的 CSS 变量以此来实现多色共存
            cell.style.setProperty('--theme-color', currentColor);
        } else {
            cell.classList.remove('painted');
            cell.style.removeProperty('--theme-color'); // 擦除颜色
        }
    }

    // 清除全部网格
    btnClear.addEventListener('click', () => {
        cells.forEach(cell => {
            cell.classList.remove('painted');
            cell.style.removeProperty('--theme-color');
        });
        
        // 添加一个短暂的故障抖动效果
        document.body.style.filter = 'contrast(1.5) hue-rotate(90deg)';
        setTimeout(() => {
            document.body.style.filter = '';
        }, 150);
    });

    // =========================================================================
    // 底部面板状态管理
    // =========================================================================

    // 颜色切换
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 移除其他激活状态
            colorBtns.forEach(b => b.classList.remove('active'));
            
            const target = e.currentTarget;
            target.classList.add('active');
            
            const selectedColor = target.getAttribute('data-color');
            currentColor = selectedColor;
            
            // 切换全局主题色，让跟随的主灯光跟随变化
            document.documentElement.style.setProperty('--theme-color', selectedColor);
            
            // 如果处于擦除模式，自动切回绘制模式
            if(!modeToggle.checked) {
                modeToggle.checked = true;
            }
        });
    });

    // =========================================================================
    // 光照追踪与坐标显示 (Mouse Tracking)
    // =========================================================================

    document.addEventListener('mousemove', (e) => {
        // 传递给 CSS 根节点，供 .grid-container::before 辐射渐变使用
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
        
        // 更新 UI 坐标显示
        coordXEl.textContent = String(e.clientX).padStart(3, '0');
        coordYEl.textContent = String(e.clientY).padStart(3, '0');
    });

});
