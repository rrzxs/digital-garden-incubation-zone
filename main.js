/**
 * 数字花园主页脚本
 * 处理项目载入与交互效果
 */

document.addEventListener('DOMContentLoaded', () => {
    // 模拟种子项目数据
    // 在实际开发中，可以通过构建脚本自动生成这个列表
    const seeds = [
        /* 
        {
            title: "示例项目",
            description: "这是一个项目的简短描述。",
            path: "./example-project",
            tags: ["React", "MVP"],
            icon: "🧪"
        }
        */
    ];

    const grid = document.getElementById('seeds-grid');
    const emptyState = document.getElementById('empty-state');
    const countDisplay = document.getElementById('seed-count');

    if (seeds.length > 0) {
        emptyState.style.display = 'none';
        countDisplay.textContent = seeds.length;
        
        seeds.forEach((seed, index) => {
            const card = createSeedCard(seed, index);
            grid.appendChild(card);
        });
    } else {
        countDisplay.textContent = '0';
    }

    // 监听导航效果
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.backgroundColor = 'rgba(5, 10, 16, 0.8)';
            header.style.padding = '1rem 0';
        } else {
            header.style.backgroundColor = 'transparent';
            header.style.padding = '1.5rem 0';
        }
    });
});

/**
 * 创建项目卡片 HTML
 */
function createSeedCard(seed, index) {
    const div = document.createElement('div');
    div.className = 'seed-card animate-up';
    div.style.animationDelay = `${0.1 * index}s`;
    
    div.innerHTML = `
        <div class="seed-header">
            <span class="seed-icon">${seed.icon || '🌱'}</span>
            <div class="seed-tags">
                ${(seed.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        <div class="seed-body">
            <h3>${seed.title}</h3>
            <p>${seed.description}</p>
        </div>
        <div class="seed-footer">
            <a href="${seed.path}" class="enter-link">进入演示 <span class="arrow">→</span></a>
        </div>
    `;
    
    return div;
}
